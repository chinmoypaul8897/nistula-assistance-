/**
 * Rupee-amount parsing (extracted from guardrails.ts in CH-06; hardened in
 * CH-07). Both the guardrail-1 price check (guardrails.ts) AND the kb price
 * whitelist (knowledge.ts) read ₹ figures out of text, so the implementation
 * lives here — a pure, import-free leaf module. WHY a separate file:
 * guardrails.ts imports PHRASEBOOK from prompt.ts, so if knowledge.ts pulled
 * the extractor from guardrails.ts we would get prompt → knowledge →
 * guardrails → prompt (a cycle).
 *
 * CH-07 closed two fail-opens CH-05 recorded and one live bug a review found:
 * - "₹1.4 lakh" used to extract as 1 (toInt split on '.' BEFORE any
 *   multiplier), and 1 is almost always in the loose backed set (adults: 1) —
 *   a fabricated lakh price would have PASSED guardrail 1. Multipliers now
 *   apply before integerisation; lakh/crore and Rs/INR/rupees forms extract.
 * - A comma-less, symbol-less bare integer ("30000") matched nothing. It now
 *   counts when its own SENTENCE carries a price cue (rate/total/per night/…),
 *   with a ≥200 floor and unit/year/month exclusions so counts, years and
 *   dates keep flowing. Sentence scope, not a char window — a window is
 *   defeated by padding, and the worst cost of a residual false positive is
 *   one corrective regenerate, never a lost guest.
 * - The "34k"/"₹34k" shorthand (×1000), cue- or currency-gated, never before
 *   a TV/screen word ("4K TV").
 */

// --- masking: strip shapes that LOOK numeric but are never money ------------
const URL_RE = /https?:\/\/\S+/gi;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const DAY_RANGE_RE = /\b\d{1,2}\s?[–-]\s?\d{1,2}\b/g; // "20–22 Dec"
const CLOCK_RE = /\b\d{1,2}:\d{2}\b/g; // "10:00"

// CH-11: a BOOKING REFERENCE is an id, not an amount. eZee's ids on this
// property are 3-digit (953, 877) — squarely inside the bare-integer band — so
// "Your booking 953 is confirmed and the balance is payable at check-in"
// extracted 953 as an unbacked ₹ figure, deferred the reply with the RATE line
// and raised a bogus 'price' escalation. Booking awareness is the chunk that
// first puts these numbers into drafts, so it is the chunk that masks them.
//
// Masked GLOBALLY rather than checked within a sentence, because the sentence
// splitter breaks on the period in "ref no." and would leave the number stranded
// in a sentence of its own, next to the cue (the CH-07 colon lesson, one
// abbreviation over). Only the reference phrase is removed — any real figure
// elsewhere in the sentence still extracts.
// The introducer set covers the synonyms this system and eZee actually use
// (eZee's payload calls the id a VoucherNo). Broadened past {booking,reservation,
// reference,ref,res} on the pre-push audit's note — narrower than the concept.
const REFERENCE_NUMBER_RE =
  /\b(?:booking|reservation|reference|ref|res|confirmation|conf|voucher|pnr)\b\.?\s*(?:nos?\.?|number|#)?\s*#?\s*\d{3,7}\b/gi;

function maskNonMoney(text: string): string {
  return text
    .replace(URL_RE, ' ')
    .replace(ISO_DATE_RE, ' ')
    .replace(DAY_RANGE_RE, ' ')
    .replace(CLOCK_RE, ' ')
    .replace(REFERENCE_NUMBER_RE, ' ');
}

// --- always-money forms: a currency marker IS the cue -----------------------
// Prefix: ₹34,000 · ₹ 34000 · Rs 30000 · Rs. 1,40,000 · INR 5000 · rupees 5000
// with an optional multiplier word/letter (₹1.4 lakh · ₹34k · rs 2 crore).
const CURRENCY_PREFIXED =
  /(?:₹|\b(?:rs\.?|inr|rupees?))\s*(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k)?\b/gi;
// Postfix: 5000 rupees · 1.4 lakh rupees · 30000 rs · 2000 INR
const CURRENCY_POSTFIXED =
  /(?<!\d)(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|k)?\s*(?:rupees?|rs|inr)\b/gi;
// Bare lakh/crore: unambiguous money in this domain even with no currency mark.
const BARE_LAKH_CRORE = /(?<!\d)(\d{1,4}(?:\.\d{1,2})?)\s*(lakhs?|lacs?|crores?)\b/gi;
// Comma-grouped runs — a thousands separator is a money tell. Groups of 2 OR 3
// digits so Indian grouping ("1,40,000") matches WHOLE: without the {2,3} and
// the guards, the western-only pattern matched "40,000" out of its middle. The
// lookbehind refuses a start inside a grouped run; the lookahead refuses an
// end that leaves ",<digits>" dangling (but allows a prose comma after).
const GROUPED_AMOUNT = /(?<![\d,])\d{1,3}(?:,\d{2,3})+(?!,?\d)/g;

function multiplierOf(word: string | undefined): number {
  if (word === undefined) return 1;
  const w = word.toLowerCase();
  if (w.startsWith('lakh') || w.startsWith('lac')) return 100_000;
  if (w.startsWith('crore') || w === 'cr') return 10_000_000;
  if (w === 'k') return 1_000;
  return 1;
}

/** Normalises a matched number (+ optional multiplier word) to integer rupees.
 * Multiplier BEFORE integerisation — "₹1.4 lakh" must be 140000, never 1. */
function toAmount(numText: string, multiplierWord?: string): number {
  const value = Number.parseFloat(numText.replace(/[₹,\s]/g, ''));
  const multiplier = multiplierOf(multiplierWord);
  return multiplier === 1 ? Math.trunc(value) : Math.round(value * multiplier);
}

// --- cue-bound forms: bare integers and "34k" need a price cue nearby -------
// Deliberately NOT bare "booking" (references) and NOT bare "night" (times).
const PRICE_CUE =
  /₹|\b(?:rs|inr|rupees?|rates?|prices?|tariff|total|costs?|fees?|charge[sd]?|deposit|payable|pay|nightly|amount)\b|\b(?:per|a)\s+night\b|\/night\b/i;

// The lookbehind excludes ',' and '.' so the tail of a grouped or decimal form
// ("₹1,500" → "500", "16666.67" → "675") can never re-enter as a bare integer.
const BARE_INT = /(?<![\d,.])\d{3,7}(?!\d)/g;
const K_SHORTHAND = /(?<!\d)(\d{1,3}(?:\.\d{1,2})?)\s?k\b/gi;
const SCREEN_AFTER_K = /^\s?(?:tvs?|televisions?|screens?|displays?|uhd|video|resolution)\b/i;
// Units that make a 3-7 digit run a count/measure, never a price. nights?
// carries \b (CH-09 audit): without it the prefix of "nightly" matched, so
// "3500 nightly" was skipped as a count — a rate word must never unit-exclude.
const UNIT_AFTER =
  /^\s?(?:nights?\b|guests?|adults?|children|kids?|bhk|bedrooms?|kms?|m\b|min(?:ute)?s?|hours?|hrs?|%|percent|sq\s?ft|sqft|[ap]m\b)/i;
const MONTH_NEAR =
  /(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i;
// CH-11: a RESERVATION NUMBER is not a price. eZee's ids on this property are
// 3-digit (953, 877) — squarely inside BARE_INT's 3-7 digit band and above the
// floor — so a perfectly ordinary reply like "Your booking 953 is confirmed and
// the balance is payable at check-in" extracted 953 as an unbacked ₹ amount,
// deferred with the RATE line and raised a bogus 'price' escalation. Booking
// awareness is the chunk that first puts these numbers into drafts.
// PRICE_CUE already refuses bare "booking" as a CUE; this refuses the NUMBER
// that a reference word introduces, even when another cue shares the sentence.
const REFERENCE_BEFORE =
  /\b(?:booking|reservation|reference|ref|res\.?\s?no\.?|confirmation|conf|voucher|pnr|no\.?|#)\s*$/i;
const BARE_INT_FLOOR = 200; // no villa-adjacent fee or rate sits below this
const YEAR_MIN = 1900;
const YEAR_MAX = 2099;

// Sentence-ish splitter — shared with extractKbFees and priceGuards.feeExempt.
// WHY no ':' — a colon does NOT end the thought: "Total: 45000" must keep the
// cue and the figure in ONE sentence, or the bare-integer guard fails open
// (post-build audit finding); same for a future "Security deposit: ₹10,000"
// in policies.md, which would silently produce NO whitelist entry.
const SENTENCE_SPLIT = /(?<=[.;!?])\s+|\n+/;

/** Splits text into sentence-ish units — the scope for cue binding. */
export function splitSentences(text: string): string[] {
  return text.split(SENTENCE_SPLIT);
}

function collectAlwaysMoney(text: string, into: Set<number>): void {
  for (const re of [CURRENCY_PREFIXED, CURRENCY_POSTFIXED, BARE_LAKH_CRORE]) {
    for (const m of text.matchAll(re)) {
      const n = toAmount(m[1] ?? '', m[2]);
      if (Number.isFinite(n)) into.add(n);
    }
  }
  for (const m of text.matchAll(GROUPED_AMOUNT)) {
    const n = toAmount(m[0]);
    if (Number.isFinite(n)) into.add(n);
  }
}

function collectCueBound(text: string, into: Set<number>): void {
  for (const sentence of text.split(SENTENCE_SPLIT)) {
    if (!PRICE_CUE.test(sentence)) continue;
    for (const m of sentence.matchAll(BARE_INT)) {
      const after = sentence.slice((m.index ?? 0) + m[0].length);
      const before = sentence.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
      if (UNIT_AFTER.test(after)) continue;
      if (MONTH_NEAR.test(before) || MONTH_NEAR.test(after.slice(0, 12))) continue;
      // A number a reference word introduces is an id, not an amount (CH-11).
      if (REFERENCE_BEFORE.test(before)) continue;
      const n = Number.parseInt(m[0], 10);
      if (n >= YEAR_MIN && n <= YEAR_MAX) continue; // bare years are never prices
      if (n >= BARE_INT_FLOOR) into.add(n);
    }
    for (const m of sentence.matchAll(K_SHORTHAND)) {
      const after = sentence.slice((m.index ?? 0) + m[0].length);
      if (SCREEN_AFTER_K.test(after)) continue;
      const n = toAmount(m[1] ?? '', 'k');
      if (Number.isFinite(n)) into.add(n);
    }
  }
}

/** Every money-looking amount in the text, as integer rupees (deduped). */
export function extractRupeeAmounts(text: string): number[] {
  const masked = maskNonMoney(text);
  const found = new Set<number>();
  collectAlwaysMoney(masked, found);
  collectCueBound(masked, found);
  return [...found];
}

/**
 * Fee ITEM vocabulary. Deliberately excludes units ("per night", "per hour"): a
 * fabricated stay price says "per night" too, so a unit can NEVER be the thing
 * that licenses an exemption — only the fee's own subject can.
 */
const FEE_TERMS = [
  'early check-in',
  'early checkin',
  'late check-out',
  'late checkout',
  'extra adult',
  'additional adult',
  'extra guest',
  'additional guest',
  'extra child',
  'additional child',
  'per child',
  'security deposit',
  'booking deposit',
  'deposit',
  'pet',
] as const;

/** A ₹ figure published in kb/policies.md, tagged with the fee terms of the
 * sentence it appears in. `cues` is what makes the exemption context-bound. */
export interface KbFee {
  amount: number;
  cues: string[];
}

/**
 * The kb fee whitelist (§6.5 guardrail 1's EXEMPTION). Splits kb/policies.md into
 * sentences and tags each ₹ figure with the fee terms of ITS OWN sentence, so the
 * guardrail can allow "an extra adult is ₹1,500" while still blocking "Villa B3 is
 * ₹1,500 per night" — §6.5's second clause: "stay prices and per-night figures
 * must still come from tool JSON."
 *
 * WHY sentence-scoped and not a flat number[]: a bare list of integers is
 * context-free, so ANY draft could state a whitelisted figure as a nightly rate.
 * That is only harmless while the published fees happen not to look like Goa room
 * rates — an accident, not a design. The moment a deposit figure lands (OQ-04),
 * a flat list would make a plausible fake rate sendable with no get_quote.
 *
 * A figure whose sentence names no fee term gets NO cues, and is therefore never
 * exempt — fail-closed.
 */
export function extractKbFees(policies: string): KbFee[] {
  const fees: KbFee[] = [];
  // Sentence-ish: split on terminators and newlines. Semicolons matter — the
  // extra-adult and extra-child fees share one sentence separated by ';'.
  for (const sentence of policies.split(SENTENCE_SPLIT)) {
    const lower = sentence.toLowerCase();
    const cues = FEE_TERMS.filter((term) => lower.includes(term));
    if (cues.length === 0) continue;
    for (const amount of extractRupeeAmounts(sentence)) fees.push({ amount, cues: [...cues] });
  }
  return fees;
}
