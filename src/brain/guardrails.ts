/**
 * Guardrail pipeline (plan.md §6.5). Runs AFTER the model produces a draft,
 * BEFORE any send — the last line of defence that a nudged or mistaken model
 * cannot smuggle a fake price, a false promise or a negotiation offer past.
 * CH-05 shipped guardrails 1 (price integrity) and 3 (negotiation lock);
 * CH-07 adds 2 (promise integrity) and raw_events telemetry, with 4–7 landing
 * in the same chunk.
 *
 * The check functions are PURE and live in leaf modules (priceGuards.ts,
 * promises.ts, rupees.ts) so this file stays the orchestrator under the
 * ~300-line cap. Pipeline shape (CH-07 review decision): negotiation
 * substitution first, then price + promise evaluated TOGETHER with ONE shared
 * regenerate carrying a combined corrective nudge — still failing ⇒ defer
 * with the approved line + escalate, never send. A team-referral (C3) is
 * never a violation: the fix is to escalate so the referral is true.
 */
import type { EscalationReason } from './policy.js';
import { applyNegotiationLock, checkPriceIntegrity } from './priceGuards.js';
import { scanPromises, type ClaimClass } from './promises.js';
import { PHRASEBOOK } from './prompt.js';
import { extractRupeeAmounts, type KbFee } from './rupees.js';
import type { RecordHit } from './telemetry.js';
import type { ToolRun } from './tools/registry.js';

// Public check API — implementations live in leaf modules; the re-exports keep
// the import path CH-05 tests and callers already use.
export { applyNegotiationLock, backedAmounts, checkPriceIntegrity } from './priceGuards.js';
export type { NegotiationLockResult, PriceIntegrityResult } from './priceGuards.js';
export { scanPromises } from './promises.js';
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
  /** Guardrail-2 evidence: classes licensed by claimable system rows since the
   * guest's previous message (turn.ts computes; default none). */
  systemEvidence?: ReadonlySet<ClaimClass>;
  /** §6.7 complaint flow: the worker WILL escalate this turn — licenses C3 and
   * is asserted at pipeline end (a must_escalate turn never leaves without
   * `escalate` set). */
  mustEscalate?: boolean;
}

export type GuardrailOutcome =
  | { action: 'send'; text: string; toolRuns: ToolRun[]; escalate: EscalationReason | null }
  | { action: 'defer'; text: string; toolRuns: ToolRun[]; escalate: EscalationReason };

const PRICE_NUDGE =
  'A price you stated was not returned by any tool this turn. State only ₹ figures that appear in a get_quote result from this turn; if you have no live quote, do not state any price — offer to bring the team in instead.';
const PROMISE_NUDGE =
  'You claimed an action that has not actually happened (informing the team, arranging something, sending someone). Do not claim completed actions or dispatches — say you will pass it on to the team instead.';

/** The pipeline (§6.5): 3 → pooled {1, 2} → one shared regenerate → defer. */
export async function runGuardrails(
  turn: GuardrailTurn,
  deps: GuardrailDeps,
): Promise<GuardrailOutcome> {
  const first = await evaluate(turn, deps);
  if (first.ok) return finishSend(first, deps);

  const nudge = [
    first.priceViolations.length > 0 ? PRICE_NUDGE : null,
    first.promiseViolations.length > 0 ? PROMISE_NUDGE : null,
  ]
    .filter((n): n is string => n !== null)
    .join('\n');
  deps.log.info(
    { guardrail: 'pooled', prices: first.priceViolations, promises: first.promiseViolations },
    'regenerating once',
  );
  await recordViolations(deps, first, 'regenerated');
  const regenerated = await deps.regenerate(nudge);
  const second = await evaluate(regenerated, deps);
  if (second.ok) {
    await deps.record?.({
      kind: 'guardrail',
      rule: second.referral || first.promiseViolations.length > 0 ? 'promise_integrity' : 'price_integrity',
      action: 'sent_after_regen',
      draft: second.text,
    });
    return finishSend(second, deps);
  }

  // Two strikes — never send an unbacked figure or a false claim (§6.5).
  deps.log.info(
    { guardrail: 'pooled', prices: second.priceViolations, promises: second.promiseViolations },
    'guardrails failed twice — deferring + escalating',
  );
  await recordViolations(deps, second, 'deferred');
  const priceFailed = second.priceViolations.length > 0;
  return {
    action: 'defer',
    // A price failure defers with the rate line; a promise-only failure with
    // the team-referral line (both escalate, so both lines are true).
    text: priceFailed ? PHRASEBOOK.quoteApiDown : PHRASEBOOK.outsideKnowledge,
    toolRuns: regenerated.toolRuns,
    escalate: priceFailed ? 'price' : 'promise',
  };
}

interface Evaluation {
  ok: boolean;
  text: string;
  toolRuns: ToolRun[];
  priceViolations: number[];
  promiseViolations: string[];
  referral: boolean;
}

/** One pass: negotiation rewrite → price check + promise scan (pooled). */
async function evaluate(turn: GuardrailTurn, deps: GuardrailDeps): Promise<Evaluation> {
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
  const price = checkPriceIntegrity(nego.text, turn.toolRuns, deps.whitelist ?? []);
  const promises = scanPromises(nego.text, {
    toolRuns: turn.toolRuns,
    systemEvidence: deps.systemEvidence ?? new Set(),
    escalationPlanned: deps.mustEscalate === true,
  });
  return {
    ok: price.ok && promises.violations.length === 0,
    text: nego.text,
    toolRuns: turn.toolRuns,
    priceViolations: price.unbacked,
    promiseViolations: promises.violations,
    referral: promises.referral,
  };
}

/** Resolves the outgoing escalation: a C3 referral must be MADE true, and a
 * must_escalate turn never leaves without an escalation (§6.7 assertion —
 * near-tautological now, load-bearing when CH-14 makes escalation a tool the
 * model might fail to call). */
function finishSend(
  evaluation: Evaluation,
  deps: GuardrailDeps,
): Extract<GuardrailOutcome, { action: 'send' }> {
  const escalate = evaluation.referral || deps.mustEscalate === true ? 'referral' : null;
  return { action: 'send', text: evaluation.text, toolRuns: evaluation.toolRuns, escalate };
}

async function recordViolations(
  deps: GuardrailDeps,
  evaluation: Evaluation,
  action: 'regenerated' | 'deferred',
): Promise<void> {
  if (evaluation.priceViolations.length > 0) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'price_integrity',
      action,
      draft: evaluation.text,
      details: { unbacked: evaluation.priceViolations },
    });
  }
  if (evaluation.promiseViolations.length > 0) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'promise_integrity',
      action,
      draft: evaluation.text,
      details: { violations: evaluation.promiseViolations },
    });
  }
}
