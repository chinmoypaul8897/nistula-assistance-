/**
 * Guardrail pipeline (plan.md §6.5). Runs AFTER the model produces a draft,
 * BEFORE any send — the last line of defence that a nudged or mistaken model
 * cannot smuggle a fake price, a false promise or a negotiation offer past.
 * CH-05 shipped guardrails 1 (price integrity) and 3 (negotiation lock);
 * CH-07 adds 2 and 4–7 plus raw_events telemetry.
 *
 * The check functions are PURE and live in leaf modules (priceGuards.ts,
 * rupees.ts — CH-07 split, rupees.ts precedent) so this file stays the
 * orchestrator under the ~300-line cap. This module re-exports the public
 * check API so the CH-05 import path is unchanged.
 */
import { PHRASEBOOK } from './prompt.js';
import { applyNegotiationLock, checkPriceIntegrity } from './priceGuards.js';
import { extractRupeeAmounts, type KbFee } from './rupees.js';
import type { RecordHit } from './telemetry.js';
import type { ToolRun } from './tools/registry.js';

// Public check API — the implementation moved to leaf modules in CH-07; the
// re-exports keep the import path CH-05 tests and callers already use.
export { applyNegotiationLock, backedAmounts, checkPriceIntegrity } from './priceGuards.js';
export type { NegotiationLockResult, PriceIntegrityResult } from './priceGuards.js';
export { extractRupeeAmounts };

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
