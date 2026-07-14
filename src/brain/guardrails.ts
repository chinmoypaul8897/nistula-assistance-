/**
 * Guardrail pipeline (plan.md §6.5). Runs AFTER the model produces a draft,
 * BEFORE any send — the last line of defence that a nudged or mistaken model
 * cannot smuggle a fake price, a false promise or a negotiation offer past.
 * CH-05 shipped guardrails 1 (price) and 3 (negotiation); CH-07 completes
 * 2 (promises), 5 (identity), 6 (length/format) here — 4 (window) gates every
 * send in the worker, 7 (leak scan) runs last via leakGuards.
 *
 * Pipeline shape (CH-07 review decisions): negotiation substitution first,
 * then price + promise + identity + length evaluated TOGETHER with ONE shared
 * regenerate carrying a combined nudge. Still failing ⇒ price/promise defer
 * (defer WINS over an identity substitution — safety over answering), identity
 * substitutes the approved line, length trims at a sentence boundary. The
 * deterministic format clamp runs on the FINAL text, and any mutation re-runs
 * the pure checks (a clamp could otherwise orphan a fee figure from its cue).
 * Check implementations live in leaf modules (priceGuards, promises,
 * draftGuards, rupees) so this file stays the orchestrator under ~300 lines.
 */
import {
  applyFormatClamp,
  bulletLineCount,
  containsIdentityLine,
  MAX_REPLY_CHARS,
  trimAtSentence,
} from './draftGuards.js';
import { scanForLeaks } from './leakGuards.js';
import type { EscalationReason } from './policy.js';
import { applyNegotiationLock, checkPriceIntegrity } from './priceGuards.js';
import { scanPromises, type ClaimClass } from './promises.js';
import { PHRASEBOOK } from './prompt.js';
import { extractRupeeAmounts, type KbFee } from './rupees.js';
import { scanStayAffirmations, STAY_NUDGE } from './stayGuards.js';
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
  /** CH-11: does this guest actually hold a LIVE booking? From the worker's
   * projected stays — a code-normalised server enum, NOT a tool result and NOT
   * block [5]'s text (guest-derived DATA may never license anything). Defaults
   * TRUE so every pre-CH-11 caller and test keeps its exact behaviour; the
   * worker always supplies the real value. */
  hasLiveStay?: boolean;
  /** CH-11: the guest holds a booking we may NOT describe (a live cancellation,
   * a multi-room reservation). Distinguishes the two ways `hasLiveStay` can be
   * false, which need DIFFERENT ops cards: "they hold nothing on this number"
   * versus "they hold a booking a person must handle". Telling ops the first
   * when the second is true is a card that LIES (pre-merge review). */
  hasUndescribableBooking?: boolean;
  /** Guardrail 5 trigger: the inbound batch asked "are you a bot?". */
  botQuestion?: boolean;
  /** Guardrail 7: the guest's own E.164 — the ONLY phone a draft may contain. */
  guestPhone?: string;
  /** Night flag — the leak-scan substitution uses §6.2b's after-hours variant. */
  isNight?: boolean;
}

export type GuardrailOutcome =
  | { action: 'send'; text: string; toolRuns: ToolRun[]; escalate: EscalationReason | null }
  | { action: 'defer'; text: string; toolRuns: ToolRun[]; escalate: EscalationReason };

/**
 * WHICH ops card a twice-affirmed booking earns. `hasLiveStay === false` has TWO
 * causes and they need different sentences to a human:
 * - the guest holds NOTHING on this number → `booking_overclaim`, whose card
 *   says "our system shows none — they may have a booking we never captured".
 * - the guest holds a booking we may not DESCRIBE (a cancellation for next week,
 *   a multi-room reservation) → `booking_undescribable`. The overclaim card
 *   would be a LIE here: the system shows a booking, it is just not sayable.
 * A card that misstates the situation is worse than no card — the human acts on it.
 */
function stayEscalation(deps: GuardrailDeps): EscalationReason {
  return deps.hasUndescribableBooking === true ? 'booking_undescribable' : 'booking_overclaim';
}

const PRICE_NUDGE =
  'A price you stated was not returned by any tool this turn. State only ₹ figures that appear in a get_quote result from this turn; if you have no live quote, do not state any price — offer to bring the team in instead.';
const PROMISE_NUDGE =
  'You claimed an action that has not actually happened (informing the team, arranging something, sending someone). Do not claim completed actions or dispatches — say you will pass it on to the team instead. Never say you have noted or will remember something unless a remember_fact save succeeded this turn.';
const IDENTITY_NUDGE = `The guest asked whether they are talking to a bot. Include this approved line verbatim in your reply, keeping the rest of your answer: "${PHRASEBOOK.isBot}"`;
const LENGTH_NUDGE =
  'Your reply is too long or list-heavy for WhatsApp. Rewrite it in 1–3 short sentences, no headers and no bullet lists.';

/** The pipeline (§6.5): 3 → pooled {1, 2, 5, length} → one shared regenerate
 * → defer/substitute/trim → deterministic format clamp + re-check. */
export async function runGuardrails(
  turn: GuardrailTurn,
  deps: GuardrailDeps,
): Promise<GuardrailOutcome> {
  const first = await evaluate(turn, deps);
  if (first.ok) return finalize(first, deps);

  const nudge = [
    first.priceViolations.length > 0 ? PRICE_NUDGE : null,
    first.promiseViolations.length > 0 ? PROMISE_NUDGE : null,
    first.stayViolations.length > 0 ? STAY_NUDGE : null,
    first.identityViolation ? IDENTITY_NUDGE : null,
    first.tooLong ? LENGTH_NUDGE : null,
  ]
    .filter((n): n is string => n !== null)
    .join('\n');
  deps.log.info(
    {
      guardrail: 'pooled',
      prices: first.priceViolations,
      promises: first.promiseViolations,
      stays: first.stayViolations,
      identity: first.identityViolation,
      tooLong: first.tooLong,
    },
    'regenerating once',
  );
  await recordViolations(deps, first, 'regenerated');
  const second = await evaluate(await deps.regenerate(nudge), deps);
  if (second.ok) {
    await deps.record?.({
      kind: 'guardrail',
      // Labelled by what actually failed FIRST (audit fix: an identity- or
      // length-only regenerate must not count as a phantom price regen).
      rule:
        first.priceViolations.length > 0
          ? 'price_integrity'
          : first.promiseViolations.length > 0
            ? 'promise_integrity'
            : first.identityViolation
              ? 'identity'
              : 'length_format',
      action: 'sent_after_regen',
      draft: second.text,
    });
    return finalize(second, deps);
  }

  // Two strikes. Money/promise/stay failures defer (§6.5 — and defer WINS over
  // an identity substitution: the escalation carries the question to a human).
  if (
    second.priceViolations.length > 0 ||
    second.promiseViolations.length > 0 ||
    second.stayViolations.length > 0
  ) {
    deps.log.info(
      {
        guardrail: 'pooled',
        prices: second.priceViolations,
        promises: second.promiseViolations,
        stays: second.stayViolations,
      },
      'guardrails failed twice — deferring + escalating',
    );
    await recordViolations(deps, second, 'deferred');
    const priceFailed = second.priceViolations.length > 0;
    const stayFailed = second.stayViolations.length > 0;
    return {
      action: 'defer',
      // A price failure defers with the rate line; a stay-affirmation or
      // promise failure with the team-referral line (all escalate, so every
      // line is true). A twice-asserted booking for a guest who holds none is
      // exactly the case a person must see — and NOT `booking_undescribable`
      // (that reason's card says "holds a booking", which is false here); this
      // guest may in fact have a booking our mirror cannot see (the D1 gap).
      text: priceFailed ? PHRASEBOOK.quoteApiDown : PHRASEBOOK.outsideKnowledge,
      toolRuns: second.toolRuns,
      escalate: priceFailed ? 'price' : stayFailed ? stayEscalation(deps) : 'promise',
    };
  }
  // Identity still missing → substitute the approved line whole (§6.5 #5).
  if (second.identityViolation) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'identity',
      action: 'substituted',
      draft: second.text,
    });
    return finalize({ ...second, text: PHRASEBOOK.isBot }, deps);
  }
  // Only length left → the last-resort sentence-boundary trim. preMutated
  // forces the finalize re-checks: a trim is a mutation like any clamp, and
  // it can cut the identity line off the tail (post-build audit finding).
  await deps.record?.({
    kind: 'guardrail',
    rule: 'length_format',
    action: 'clamped',
    draft: second.text,
    details: { reason: 'over_length_after_regenerate' },
  });
  return finalize({ ...second, text: trimAtSentence(second.text) }, deps, true);
}

interface Evaluation {
  ok: boolean;
  text: string;
  toolRuns: ToolRun[];
  priceViolations: number[];
  promiseViolations: string[];
  /** CH-11: booking-state assertions made for a guest with no live stay. */
  stayViolations: string[];
  referral: boolean;
  identityViolation: boolean;
  tooLong: boolean;
}

/** One pass: negotiation rewrite → price + promise + identity + length. */
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
  // CH-11: an assertion gate, not an evidence licence — see stayGuards.ts.
  // Defaults to "has a live stay" so every pre-CH-11 caller keeps its behaviour.
  const stays = scanStayAffirmations(nego.text, deps.hasLiveStay ?? true);
  const identityViolation = deps.botQuestion === true && !containsIdentityLine(nego.text);
  const tooLong = nego.text.length > MAX_REPLY_CHARS || bulletLineCount(nego.text) > 3;
  return {
    ok:
      price.ok &&
      promises.violations.length === 0 &&
      stays.violations.length === 0 &&
      !identityViolation &&
      !tooLong,
    text: nego.text,
    toolRuns: turn.toolRuns,
    priceViolations: price.unbacked,
    promiseViolations: promises.violations,
    stayViolations: stays.violations,
    referral: promises.referral,
    identityViolation,
    tooLong,
  };
}

/**
 * Final gate: guardrail-6 deterministic fixes on the OUTGOING text, re-running
 * the pure checks if anything mutated; then the escalation resolution — a C3
 * referral must be MADE true, and a must_escalate turn never leaves without an
 * escalation (§6.7 assertion — near-tautological now, load-bearing when CH-14
 * makes escalation a tool the model might fail to call).
 */
async function finalize(
  evaluation: Evaluation,
  deps: GuardrailDeps,
  preMutated = false,
): Promise<GuardrailOutcome> {
  let text = evaluation.text;
  const clamp = applyFormatClamp(text);
  if (clamp.notes.length > 0) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'length_format',
      action: 'clamped',
      draft: text,
      details: { notes: clamp.notes },
    });
  }
  if (clamp.changed || preMutated) {
    text = clamp.text;
    // Re-run the pure checks on the mutated text — a clamp must never be able
    // to smuggle a violation past the pool (review decision). Stay integrity is
    // re-run too, for symmetry (pre-push audit NIT): today applyFormatClamp only
    // removes characters and the lexicon spans newlines, so it is belt-and-
    // braces, but it stays armed if a future clamp gains a line-joining rewrite.
    const price = checkPriceIntegrity(text, evaluation.toolRuns, deps.whitelist ?? []);
    const promises = scanPromises(text, {
      toolRuns: evaluation.toolRuns,
      systemEvidence: deps.systemEvidence ?? new Set(),
      escalationPlanned: deps.mustEscalate === true,
    });
    const stays = scanStayAffirmations(text, deps.hasLiveStay ?? true);
    if (!price.ok || promises.violations.length > 0 || stays.violations.length > 0) {
      const reason: EscalationReason = !price.ok
        ? 'price'
        : promises.violations.length > 0
          ? 'promise'
          : stayEscalation(deps);
      return {
        action: 'defer',
        text: reason === 'price' ? PHRASEBOOK.quoteApiDown : PHRASEBOOK.outsideKnowledge,
        toolRuns: evaluation.toolRuns,
        escalate: reason,
      };
    }
    if (deps.botQuestion === true && !containsIdentityLine(text)) text = PHRASEBOOK.isBot;
  }
  // Guardrail 7 — LAST, on the final outgoing text (§6.5 #7): block + alert,
  // no regenerate. The substituted team line escalates, so its promise is true.
  const leak = scanForLeaks(text, deps.guestPhone ?? '');
  if (!leak.ok) {
    deps.log.info({ guardrail: 'leak_scan', hits: leak.hits }, 'draft blocked — leak detected');
    await deps.record?.({
      kind: 'guardrail',
      rule: 'leak_scan',
      action: 'blocked',
      draft: text,
      details: { hits: leak.hits },
    });
    return {
      action: 'defer',
      text: deps.isNight === true ? PHRASEBOOK.outsideKnowledgeNight : PHRASEBOOK.outsideKnowledge,
      toolRuns: evaluation.toolRuns,
      escalate: 'leak',
    };
  }
  const escalate = evaluation.referral || deps.mustEscalate === true ? 'referral' : null;
  return { action: 'send', text, toolRuns: evaluation.toolRuns, escalate };
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
  if (evaluation.stayViolations.length > 0) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'stay_integrity',
      action,
      draft: evaluation.text,
      details: { violations: evaluation.stayViolations },
    });
  }
  if (evaluation.identityViolation) {
    await deps.record?.({
      kind: 'guardrail',
      rule: 'identity',
      action,
      draft: evaluation.text,
    });
  }
}
