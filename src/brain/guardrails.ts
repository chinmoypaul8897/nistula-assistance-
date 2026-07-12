/**
 * Guardrail pipeline v1 (plan.md §6.5, CH-05 step 5). Runs AFTER the model
 * produces a draft, BEFORE any send — the last line of defence that a nudged or
 * mistaken model cannot smuggle a fake price or a negotiation offer past. CH-05
 * ships guardrails 1 (price integrity) and 3 (negotiation lock); 2 and 4–7 land
 * in CH-07.
 *
 * The extract/check functions are PURE and unit-tested hard (§6.5). The pipeline
 * `runGuardrails` orchestrates: negotiation-lock rewrite → price check →
 * regenerate ONCE on a price violation → still failing ⇒ defer + escalate,
 * never send the hallucinated figure.
 */
import { PHRASEBOOK } from './prompt.js';
import { extractRupeeAmounts } from './rupees.js';
import type { ToolRun } from './tools/registry.js';

// The ₹-amount extractor moved to rupees.ts in CH-06 so knowledge.ts can share
// it without an import cycle (§ rupees.ts header). Re-exported here to keep the
// public import path (`extractRupeeAmounts` from guardrails.js) that CH-05 tests
// and callers already use.
export { extractRupeeAmounts };

/** Every numeric value anywhere inside a successful tool result's data. A
 * fractional tool figure (e.g. averagePerNight = total/nights) is stored as
 * BOTH its floor and its round so a draft that floors OR rounds it still
 * matches — toInt on the draft side always yields an integer, so the backed
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

/** The set of figures the draft is ALLOWED to state: every number returned by a
 * successful tool this turn, plus the kb whitelist (empty until CH-06). */
export function backedAmounts(toolRuns: ToolRun[], whitelist: number[] = []): Set<number> {
  const allowed = new Set<number>(whitelist);
  for (const run of toolRuns) {
    if (run.result.ok) collectNumbers(run.result.data, allowed);
  }
  return allowed;
}

export interface PriceIntegrityResult {
  ok: boolean;
  /** Amounts in the draft with no backing tool figure — the violation set. */
  unbacked: number[];
}

/**
 * Guardrail 1: every ₹ amount in the draft must appear (as an integer, ignoring
 * ₹/comma/space formatting) in this turn's tool results or the whitelist. A
 * draft with no ₹ passes trivially.
 */
export function checkPriceIntegrity(
  draft: string,
  toolRuns: ToolRun[],
  whitelist: number[] = [],
): PriceIntegrityResult {
  const allowed = backedAmounts(toolRuns, whitelist);
  const unbacked = extractRupeeAmounts(draft).filter((n) => !allowed.has(n));
  return { ok: unbacked.length === 0, unbacked };
}

// Negotiation / bargaining language (§6.5 guardrail 3). Word-boundary, case-
// insensitive. WHY NOT a bare /\boffer\b/: the voice guide bans "offer" ONLY in
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

export interface GuardrailTurn {
  draft: string;
  toolRuns: ToolRun[];
}

export interface GuardrailDeps {
  /** Re-run the model ONCE with a corrective nudge (worker supplies this). */
  regenerate: (nudge: string) => Promise<GuardrailTurn>;
  log: { info: (obj: Record<string, unknown>, msg?: string) => void };
  /** kb price whitelist (empty in CH-05; CH-06 passes the compiled figures). */
  whitelist?: number[];
}

export type GuardrailOutcome =
  | { action: 'send'; text: string; toolRuns: ToolRun[] }
  | { action: 'defer'; text: string; toolRuns: ToolRun[]; escalate: true };

const PRICE_NUDGE =
  'A price you stated was not returned by any tool this turn. State only ₹ figures that appear in a get_quote result from this turn; if you have no live quote, do not state any price — offer to bring the team in instead.';

/**
 * The pipeline (§6.5): negotiation-lock rewrite, then price integrity; on a
 * price violation regenerate once and re-check; if it still fails, do NOT send
 * the figure — defer with the approved line and flag escalation.
 */
export async function runGuardrails(
  turn: GuardrailTurn,
  deps: GuardrailDeps,
): Promise<GuardrailOutcome> {
  const whitelist = deps.whitelist ?? [];
  const first = evaluate(turn, whitelist, deps.log);
  if (first.ok) return { action: 'send', text: first.text, toolRuns: turn.toolRuns };

  deps.log.info({ guardrail: 'price_integrity', unbacked: first.unbacked }, 'regenerating once');
  const regenerated = await deps.regenerate(PRICE_NUDGE);
  const second = evaluate(regenerated, whitelist, deps.log);
  if (second.ok) return { action: 'send', text: second.text, toolRuns: regenerated.toolRuns };

  // Two strikes on price integrity — never send an unbacked ₹ figure (§6.5).
  deps.log.info(
    { guardrail: 'price_integrity', unbacked: second.unbacked },
    'price integrity failed twice — deferring + escalating',
  );
  return {
    action: 'defer',
    text: PHRASEBOOK.quoteApiDown,
    toolRuns: regenerated.toolRuns,
    escalate: true,
  };
}

/** One pass: negotiation rewrite → price check. Returns the cleaned text + verdict. */
function evaluate(
  turn: GuardrailTurn,
  whitelist: number[],
  log: GuardrailDeps['log'],
): { ok: true; text: string } | { ok: false; text: string; unbacked: number[] } {
  const nego = applyNegotiationLock(turn.draft);
  if (nego.changed) log.info({ guardrail: 'negotiation_lock', hits: nego.hits }, 'draft substituted');
  const price = checkPriceIntegrity(nego.text, turn.toolRuns, whitelist);
  return price.ok ? { ok: true, text: nego.text } : { ok: false, text: nego.text, unbacked: price.unbacked };
}
