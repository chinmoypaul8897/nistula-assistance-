/**
 * Interim ops escalation + policy telemetry (CH-07, split from worker.ts in
 * CH-08 for the ~300-line rule). Real escalate_to_human lands CH-14; until
 * then escalations message OPS_NUMBERS directly through the wa chokepoint.
 */
import { getConversationGuestId, insertMessage } from '../db/repos.js';
import type { Db } from '../db/client.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import type { Directive, EscalationReason, TurnPlan } from './policy.js';
import type { Stage } from './stayView.js';
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
  booking_reference:
    'Someone quoted a booking reference the AI could not verify as theirs — the AI revealed nothing. Could be an honest typo; could be someone probing another guest’s booking. Please check before replying.',
  booking_undescribable:
    'This guest holds a booking the AI is not allowed to describe (a live cancellation, or a multi-room reservation whose details we only partly hold). Please pick up the thread.',
  booking_overclaim:
    'The AI kept trying to tell this guest they have a booking, but our system shows none on this number. They may genuinely have a booking we never captured — please check eZee and reply.',
  booking_unit_unknown:
    'The AI kept naming a specific villa for this guest, but eZee has not told us which house they are in (bookings are held at villa TYPE). The guest may have named it themselves — the website shows them a villa name — and may be wrong. Please confirm the real unit in eZee before replying.',
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
  stay?: StayNote,
): Promise<void> {
  const summary = ESCALATION_SUMMARIES[reason];
  // The card carries the guest's ask (sanitised + capped by policy.ts) — the
  // humanRequest line's "they have the full picture" must be honest. PII to
  // an ops WhatsApp is the CH-14 card pattern; logs still carry ids only.
  //
  // CH-11: and WHERE the guest is. This is the whole of "stay context may only
  // ever ADD urgency, never remove it" (the deliberate §6.7 deviation): we did
  // not narrow the complaint trigger, we told the human that the person
  // complaining is standing in one of our villas right now.
  const lines = [summary];
  const note = stayNote(stay);
  if (note !== null) lines.push(note);
  if (guestTextTail !== '') lines.push(`Guest: "${guestTextTail}"`);
  const card = lines.join('\n');
  // 🚨 THE RESULT IS NOT OPTIONAL. This used to be a bare `await sendText(...)`
  // with the SendResult discarded, and the evidence row below written regardless
  // — which meant that when the send failed, guardrail 2 still licensed the AI
  // to tell the guest "I'm bringing the team in" while no human had been reached.
  // CH-12 made that failure certain rather than occasional (an ops number whose
  // own 24h window is shut is now refused at the chokepoint), and the hard rule
  // is unambiguous: NEVER PROMISE WHAT DIDN'T HAPPEN.
  //
  // The carve-out, and it is NOT the bug: when NO ops number is configured at
  // all, the alert log IS the ops channel (CH-02 decision D4 — that is how dev
  // runs today). "Nobody is configured" and "everybody was unreachable" are
  // different facts, and only the second one makes the promise a lie.
  // CH-18c: the card quotes the guest's own words (guestTextTail) — link it to the
  // guest so DELETE_GUEST erases it by FK, not by string-matching a paraphrase.
  const aboutGuestId = (await getConversationGuestId(deps.db, conversationId)) ?? undefined;
  let delivered = deps.opsNumbers.length === 0;
  for (const ops of deps.opsNumbers) {
    const result = await deps.wa.sendText(ops, card, {
      conversationId: null,
      sender: 'system',
      aboutGuestId,
    });
    if (result.ok) delivered = true;
  }

  if (!delivered) {
    // No evidence row: guardrail 2 will now REFUSE any "the team has been
    // informed" claim, and the model must fall back to an honest line. The guest
    // is not lied to; ops is told loudly that a card never landed.
    await alertOps(deps.log, {
      kind: 'ops_escalation_undelivered',
      summary: 'ESCALATION NOT DELIVERED — no ops number could be reached',
      detail: { conversationId, reason, opsNumbers: deps.opsNumbers.length },
    });
    return;
  }

  try {
    // Claimable evidence (§6.5 #2, CH-02 D5 opt-in tagging): transcript-
    // invisible (mapTranscript skips system rows) but guardrail-2 readable.
    // Written ONLY after a card actually reached a human.
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

/** What the worker knows about this guest's bookings, for the card (CH-11). */
export interface StayNote {
  stage: Stage;
  needsHuman: boolean;
}

/**
 * The urgency line. An in-house guest complaining about a broken AC is a
 * different call than a lead who is annoyed — and the human reading the card is
 * the one who has to decide which. `lead` says nothing (the absence of a booking
 * is not urgent, and saying so would just be noise on every pre-sales card).
 */
function stayNote(stay: StayNote | undefined): string | null {
  if (stay === undefined) return null;
  const parts: string[] = [];
  if (stay.stage === 'inhouse') parts.push('IN-HOUSE right now — they are in one of our villas');
  else if (stay.stage === 'prearrival') parts.push('Arriving soon — has an upcoming stay');
  else if (stay.stage === 'postguest') parts.push('A past guest — no current booking');
  if (stay.needsHuman) {
    parts.push('holds a booking the AI may not describe (cancelled, or multi-room)');
  }
  return parts.length === 0 ? null : `Stay: ${parts.join('; ')}.`;
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
