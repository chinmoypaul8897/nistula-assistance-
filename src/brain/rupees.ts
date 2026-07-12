/**
 * Rupee-amount parsing (extracted from guardrails.ts in CH-06). Both the
 * guardrail-1 price check (guardrails.ts) AND the kb price whitelist
 * (knowledge.ts) need to read ₹ figures out of text, so the implementation
 * lives here — a pure, import-free leaf module. WHY a separate file: guardrails.ts
 * imports PHRASEBOOK from prompt.ts, so if knowledge.ts pulled the extractor from
 * guardrails.ts we would get prompt → knowledge → guardrails → prompt (a cycle).
 *
 * KNOWN GAP (deferred to CH-07's full guardrail suite): a comma-less, symbol-
 * less bare integer ("30000") matches neither pattern, so a fabricated price in
 * that exact form fails OPEN. The proper fix is context-aware extraction
 * (numbers adjacent to Rs/per-night/total cues) rather than a bare-integer
 * threshold, which would false-positive on years/pincodes/refs and wrongly
 * defer valid replies. Mitigated meanwhile by the system prompt hard-steering
 * ₹-formatting and this being defence-in-depth. Also deferred: the "34k"
 * shorthand. Review-confirmed; tracked in progress.md for CH-07.
 */

// ₹-prefixed amounts ("₹34,000", "₹ 34000") and bare comma-grouped runs
// ("34,000") — a thousands separator is a money tell even without the symbol.
const RUPEE_AMOUNT = /₹\s?\d[\d,]*(?:\.\d+)?/g;
const GROUPED_AMOUNT = /\b\d{1,3}(?:,\d{3})+\b/g;

/** Normalises a matched money string to an integer rupee value. */
function toInt(match: string): number {
  const digits = match.replace(/[₹,\s]/g, '').split('.')[0] ?? '';
  return Number.parseInt(digits, 10);
}

/** Every ₹-looking amount in the text, as integers (deduped). */
export function extractRupeeAmounts(text: string): number[] {
  const found = new Set<number>();
  for (const re of [RUPEE_AMOUNT, GROUPED_AMOUNT]) {
    for (const m of text.matchAll(re)) {
      const n = toInt(m[0]);
      if (Number.isFinite(n)) found.add(n);
    }
  }
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
  for (const sentence of policies.split(/(?<=[.;:!?])\s+|\n+/)) {
    const lower = sentence.toLowerCase();
    const cues = FEE_TERMS.filter((term) => lower.includes(term));
    if (cues.length === 0) continue;
    for (const amount of extractRupeeAmounts(sentence)) fees.push({ amount, cues: [...cues] });
  }
  return fees;
}
