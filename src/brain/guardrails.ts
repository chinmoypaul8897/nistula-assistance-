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
import { extractRupeeAmounts, type KbFee } from './rupees.js';
import type { RecordHit } from './telemetry.js';
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

/** Every number returned by a successful tool this turn — the only figures a
 * draft may state freely. The kb fee whitelist is handled separately, because it
 * is context-BOUND (see feeExempt) rather than a flat set. */
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
 */
function feeExempt(amount: number, draft: string, fees: KbFee[]): boolean {
  const lower = draft.toLowerCase();
  return fees.some((fee) => fee.amount === amount && fee.cues.some((cue) => lower.includes(cue)));
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
  /** The context-bound kb fee whitelist (CH-06: kbPriceWhitelist()). */
  whitelist?: KbFee[];
  /** Best-effort raw_events persistence (CH-07 step 4) — optional so the pure
   * check suites stay DB-free; turn.ts always supplies it. */
  record?: RecordHit;
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
  const first = await evaluate(turn, whitelist, deps);
  if (first.ok) return { action: 'send', text: first.text, toolRuns: turn.toolRuns };

  deps.log.info({ guardrail: 'price_integrity', unbacked: first.unbacked }, 'regenerating once');
  await deps.record?.({
    kind: 'guardrail',
    rule: 'price_integrity',
    action: 'regenerated',
    draft: first.text,
    details: { unbacked: first.unbacked },
  });
  const regenerated = await deps.regenerate(PRICE_NUDGE);
  const second = await evaluate(regenerated, whitelist, deps);
  if (second.ok) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'price_integrity',
      action: 'sent_after_regen',
      draft: second.text,
    });
    return { action: 'send', text: second.text, toolRuns: regenerated.toolRuns };
  }

  // Two strikes on price integrity — never send an unbacked ₹ figure (§6.5).
  deps.log.info(
    { guardrail: 'price_integrity', unbacked: second.unbacked },
    'price integrity failed twice — deferring + escalating',
  );
  await deps.record?.({
    kind: 'guardrail',
    rule: 'price_integrity',
    action: 'deferred',
    draft: second.text,
    details: { unbacked: second.unbacked },
  });
  return {
    action: 'defer',
    text: PHRASEBOOK.quoteApiDown,
    toolRuns: regenerated.toolRuns,
    escalate: true,
  };
}

/** One pass: negotiation rewrite → price check. Returns the cleaned text + verdict. */
async function evaluate(
  turn: GuardrailTurn,
  whitelist: KbFee[],
  deps: Pick<GuardrailDeps, 'log' | 'record'>,
): Promise<{ ok: true; text: string } | { ok: false; text: string; unbacked: number[] }> {
  const nego = applyNegotiationLock(turn.draft);
  if (nego.changed) {
    deps.log.info({ guardrail: 'negotiation_lock', hits: nego.hits }, 'draft substituted');
    // The recorded draft is the ORIGINAL (what was blocked) — that is what the
    // weekly review needs to see, not the substituted phrasebook line.
    await deps.record?.({
      kind: 'guardrail',
      rule: 'negotiation_lock',
      action: 'substituted',
      draft: turn.draft,
      details: { hits: nego.hits },
    });
  }
  const price = checkPriceIntegrity(nego.text, turn.toolRuns, whitelist);
  return price.ok ? { ok: true, text: nego.text } : { ok: false, text: nego.text, unbacked: price.unbacked };
}
