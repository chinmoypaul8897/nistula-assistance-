/**
 * Interim ops escalation + policy telemetry (CH-07, split from worker.ts in
 * CH-08 for the ~300-line rule). Real escalate_to_human lands CH-14; until
 * then escalations message OPS_NUMBERS directly through the wa chokepoint.
 */
import { insertMessage } from '../db/repos.js';
import type { Db } from '../db/client.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import type { Directive, EscalationReason, TurnPlan } from './policy.js';
import { createHitRecorder } from './telemetry.js';
import type { TurnLogger } from './turn.js';

export interface OpsEscalationDeps {
  db: Db;
  log: TurnLogger;
  wa: Pick<WaClient, 'sendText'>;
  /** OPS_NUMBERS (E.164) — interim escalation recipients (§5.3 chokepoint). */
  opsNumbers: string[];
}

const ESCALATION_SUMMARIES: Record<EscalationReason, string> = {
  price: 'Price help needed on a guest thread — the AI could not confirm a rate safely.',
  human_request: 'A guest asked for a human — the AI stepped back and promised the front desk.',
  complaint: 'A guest appears unhappy — the AI acknowledged it and flagged the thread.',
  media: 'A guest sent media the AI cannot view — the AI asked them to type it.',
  leak: 'A reply was blocked by the leak scan — please review the thread.',
  promise: 'A reply was blocked by promise integrity — please review the thread.',
  referral: 'The AI told a guest the team will follow up — please pick up the thread.',
};

/**
 * Interim escalation (real escalate_to_human lands CH-14): messages each OPS
 * number (conversationId null / sender system, per CH-02 D5), writes the
 * claimable evidence row on the guest conversation, and raises an ops alert —
 * in dev OPS_NUMBERS is unset, so the alert log IS the ops channel (D4).
 */
export async function escalateToOps(
  deps: OpsEscalationDeps,
  conversationId: string,
  reason: EscalationReason,
  guestTextTail: string,
): Promise<void> {
  const summary = ESCALATION_SUMMARIES[reason];
  // The card carries the guest's ask (sanitised + capped by policy.ts) — the
  // humanRequest line's "they have the full picture" must be honest. PII to
  // an ops WhatsApp is the CH-14 card pattern; logs still carry ids only.
  const card = guestTextTail === '' ? summary : `${summary}\nGuest: "${guestTextTail}"`;
  for (const ops of deps.opsNumbers) {
    await deps.wa.sendText(ops, card, { conversationId: null, sender: 'system' });
  }
  try {
    // Claimable evidence (§6.5 #2, CH-02 D5 opt-in tagging): transcript-
    // invisible (mapTranscript skips system rows) but guardrail-2 readable.
    await insertMessage(deps.db, {
      conversationId,
      direction: 'out',
      sender: 'system',
      type: 'text',
      body: `ops escalated: ${reason}`,
      status: 'sent',
      raw: { contextKind: 'ops_escalation', reason },
    });
  } catch (error) {
    deps.log.warn({ err: summarizeError(error) }, 'escalation evidence row failed (telemetry only)');
  }
  await alertOps(deps.log, {
    kind: 'guest_thread_escalation',
    summary,
    detail: { conversationId, reason },
  });
}

/** Policy telemetry + the §3.3 cool-off ops alert — winning-claim path only. */
export async function recordPolicyOutcome(
  deps: Pick<OpsEscalationDeps, 'db' | 'log'>,
  conversationId: string,
  guestPhone: string,
  directive: Directive,
  plan: TurnPlan,
  announced: boolean,
): Promise<void> {
  if (plan.telemetry === null) return;
  // cool_off records once per ai_active→cooloff edge, not per stored message.
  if (plan.telemetry === 'cool_off' && !announced) return;
  const record = createHitRecorder(deps.db, deps.log, { conversationId, guestPhone });
  await record({
    kind: 'policy',
    rule: plan.telemetry,
    action: 'routed',
    details: { directive: directive.kind, ...directive.flags },
  });
  if (plan.telemetry === 'cool_off') {
    await alertOps(deps.log, {
      kind: 'rate_limit_cooloff',
      summary: 'guest rate-limited — one polite line sent, store-only until the window clears',
      detail: {
        conversationId,
        containsHumanRequest: directive.flags.containsHumanRequest,
        containsComplaint: directive.flags.containsComplaint,
      },
    });
  }
}
