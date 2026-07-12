/**
 * Pure money/language checks — guardrail 1 (price integrity) and guardrail 3
 * (negotiation lock), moved out of guardrails.ts in CH-07 so the pipeline file
 * stays under the ~300-line cap as guardrails 2 and 4–7 land (precedent:
 * rupees.ts, CH-06). guardrails.ts re-exports everything here, so the public
 * import path CH-05's tests and callers use is unchanged.
 */
import { PHRASEBOOK } from './prompt.js';
import { extractRupeeAmounts, splitSentences, type KbFee } from './rupees.js';
import type { ToolRun } from './tools/registry.js';

/** Every numeric value anywhere inside a successful tool result's data. A
 * fractional tool figure (e.g. averagePerNight = total/nights) is stored as
 * BOTH its floor and its round so a draft that floors OR rounds it still
 * matches — toAmount on the draft side always yields an integer, so the backed
 * side must offer integer forms too (review finding: decimal asymmetry would
 * escalate a valid quote as an outage). */
function collectNumbers(value: unknown, into: Set<number>): void {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      into.add(Math.trunc(value));
      into.add(Math.round(value));
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectNumbers(item, into);
  }
}

/** Every number returned by a successful tool this turn — the only figures a
 * draft may state freely. The kb fee whitelist is handled separately, because it
 * is context-BOUND (see feeExempt) rather than a flat set.
 *
 * WHY the collection stays LOOSE (all numbers, not a price-field allowlist):
 * the QuoteView shape has already drifted once (§5.1 vs the live API, CH-05) —
 * a field-name allowlist silently loses backing on the next rename and then
 * false-blocks every quote, turning a website deploy into a defer+escalate
 * storm. The draft-side extractor's ≥200 bare-integer floor and multiplier
 * handling (rupees.ts, CH-07) remove the small-integer exposure at the gate
 * that matters. */
export function backedAmounts(toolRuns: ToolRun[]): Set<number> {
  const allowed = new Set<number>();
  for (const run of toolRuns) {
    if (run.result.ok) collectNumbers(run.result.data, allowed);
  }
  return allowed;
}

/**
 * The kb EXEMPTION (§6.5 guardrail 1), context-bound: a published fee figure may
 * be stated without a tool result ONLY in its own fee context — the draft must
 * name the thing the fee is for ("an extra adult is ₹1,500"). It can therefore
 * never launder a fabricated stay price ("Villa B3 is ₹1,500 per night"), which
 * is §6.5's second clause: stay and per-night figures still come from tool JSON.
 *
 * SENTENCE-scoped on the draft side too (post-build audit finding): EVERY
 * sentence stating the amount must name the fee, or a two-sentence draft
 * ("The deposit is ₹10,000. The villa is ₹10,000 per night.") would launder a
 * fee figure into a rate through a draft-wide cue match. An amount no single
 * sentence yields (cross-sentence forms) is never exempt — fail-closed. Known
 * residual, same as the kb side's contract: a SINGLE sentence that names the
 * fee and co-claims a rate stays exemptible.
 */
function feeExempt(amount: number, draft: string, fees: KbFee[]): boolean {
  const matching = fees.filter((fee) => fee.amount === amount);
  if (matching.length === 0) return false;
  const sentences = splitSentences(draft).filter((s) => extractRupeeAmounts(s).includes(amount));
  if (sentences.length === 0) return false;
  return sentences.every((sentence) => {
    const lower = sentence.toLowerCase();
    return matching.some((fee) => fee.cues.some((cue) => lower.includes(cue)));
  });
}

export interface PriceIntegrityResult {
  ok: boolean;
  /** Amounts in the draft with no backing tool figure — the violation set. */
  unbacked: number[];
}

/**
 * Guardrail 1: every ₹ amount in the draft must appear (as an integer, ignoring
 * ₹/comma/space formatting) in this turn's tool results — or be a published kb
 * fee stated in its own fee context. A draft with no ₹ passes trivially.
 */
export function checkPriceIntegrity(
  draft: string,
  toolRuns: ToolRun[],
  whitelist: KbFee[] = [],
): PriceIntegrityResult {
  const allowed = backedAmounts(toolRuns);
  const unbacked = extractRupeeAmounts(draft).filter(
    (n) => !allowed.has(n) && !feeExempt(n, draft, whitelist),
  );
  return { ok: unbacked.length === 0, unbacked };
}

// Negotiation / bargaining language (§6.5 guardrail 3). Word-boundary, case-
// insensitive. WHY NOT a bare /\boffer/: the voice guide bans "offer" ONLY in
// the negotiation sense — "the villa offers a private pool" / "we offer
// breakfast" is permitted hospitality copy the block [4] rules even prime the
// model to write ("offer the nearest alternative"). A bare match would nuke
// those clean replies into the discount line (review finding). Bargain-y noun
// offers ("special/limited/festive offer") stay caught below; a verb bargain
// ("offer a discount / a lower price") is caught by discount/deal/price terms.
const NEGOTIATION = [
  /\bdiscount(s|ed|ing)?\b/i,
  /\bdeal(s)?\b/i,
  /\b(special|limited|exclusive|festive|seasonal)\s+offers?\b/i,
  /\bbargain(s|ed|ing)?\b/i,
  /\bnegotiat(e|ed|ing|ion)?\b/i,
  /\bconcession(s)?\b/i,
  /\b(lower|better|special|best)\s+price\b/i,
  /\b\d+\s?%\s?off\b/i,
  /\boff\s+the\s+price\b/i,
];

export interface NegotiationLockResult {
  changed: boolean;
  text: string;
  hits: string[];
}

/**
 * Guardrail 3: if the draft contains negotiation language, replace the WHOLE
 * draft with the discount phrasebook line (a terminal substitution — no
 * regenerate). The substituted text carries no ₹, so it also clears guardrail 1.
 */
export function applyNegotiationLock(draft: string): NegotiationLockResult {
  const hits = NEGOTIATION.flatMap((re) => {
    const m = re.exec(draft);
    return m ? [m[0]] : [];
  });
  if (hits.length === 0) return { changed: false, text: draft, hits: [] };
  return { changed: true, text: PHRASEBOOK.discountAsk, hits };
}
