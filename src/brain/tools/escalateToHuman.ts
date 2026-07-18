/**
 * escalate_to_human (plan §6.4 tool 5, CH-14a step 1) — the model's way to put a
 * real person on the thread, and the mechanism behind block [4]'s "let me bring
 * the team in". Where `create_staff_task` schedules physical work, this hands the
 * CONVERSATION to a human: a request outside our knowledge, a special ask, a
 * complaint the AI cannot resolve, or an explicit "can I talk to someone".
 *
 * It creates a TRACKED task (not a fire-and-forget ping) so the SLA ladder can
 * re-ping if nobody picks it up (staff/sla.ts) — the scenario-4 fix. Day/night
 * routing lives here:
 *  - DAY   → an `escalation` task (sla 10m) + a card to the front desk NOW.
 *            Delivered ⇒ ok:true queued_for:'now'; undelivered ⇒ ok:false
 *            NOT_NOTIFIED and the task stays `open` for the ladder to retry.
 *  - NIGHT → a `night_queue` task with a 10:00-IST deadline, no card (nobody is
 *            on duty), ok:true queued_for:'morning'. CH-14b's morning digest
 *            drains it.
 *
 * Result → guardrail 2: a SUCCESSFUL run licenses C3 (TOOL_CLAIMS), so the model
 * saying "bringing the team in" is TRUE and the worker fires no second referral
 * ping. A FAILED run vetoes C3 (VETO_ON_FAILURE), so a stale ops_escalation row
 * can never rescue a claim about an escalation THIS turn that reached nobody —
 * the worker's escalateToOps fallback then fires and the guest is told a human is
 * coming only when one is.
 *
 * Like every tool this runs PRE-claim (CH-03 D2). A `converse()` failure retries
 * the whole loop, and GATE 0's `request_key` makes the retry collide with its own
 * prior attempt instead of raising a second escalation.
 */
import { z } from 'zod';
import {
  findTaskByRequestKey,
  insertTask,
  taskRequestKey,
  type Task,
} from '../../db/tasks.js';
import { summarizeError } from '../../lib/logger.js';
import { atISTHour, isNightIST } from '../../lib/time.js';
import type { ToolDef, ToolEscalationContext, ToolResult } from './registry.js';

/** One escalation per turn: a second is either the same ask (GATE 0 replays it)
 * or the guest needs the person we already summoned, not a second card. */
export const MAX_ESCALATIONS_PER_TURN = 1;

const SUMMARY_INPUT_MAX = 200;

export type EscalationReasonInput =
  | 'outside_kb'
  | 'special_request'
  | 'complaint'
  | 'human_request'
  | 'other';

/** Model-facing reason → the human label on the escalation card. Deliberately
 * NOT the policy `EscalationReason` union (that drives the deterministic ops
 * pings; this is the model's own vocabulary — recorded in progress.md). */
const REASON_LABEL: Record<EscalationReasonInput, string> = {
  outside_kb: 'A question outside what the assistant can answer',
  special_request: 'A special request that needs a person',
  complaint: 'The guest seems unhappy and wants a human',
  human_request: 'The guest asked to speak to a person',
  other: 'The assistant is bringing a human in',
};

const inputSchema = z.object({
  reason: z.enum(['outside_kb', 'special_request', 'complaint', 'human_request', 'other']),
  /** The guest's ask in their own terms — optional; the reason label stands in
   * when the model gives none. Shown to staff only, so a house name is legal. */
  summary: z.string().min(1).max(SUMMARY_INPUT_MAX).optional(),
});
type EscalateInput = z.infer<typeof inputSchema>;

const TURN_CAP_REFUSAL =
  'not raised: you have already brought the team in this reply. Do not escalate again — the front desk has it.';

const RESOLVED_REFUSAL =
  'not raised: this has already been resolved. Do not claim a person is picking it up.';

const NOT_NOTIFIED =
  'the front desk has NOT received this yet, and has been alerted separately. Do NOT tell the guest a person is coming — say you are bringing the team in and someone will reply here.';

export const escalateToHumanTool: ToolDef = {
  name: 'escalate_to_human',
  description:
    "Bring a real person from the villa team onto this conversation. Use it when the guest needs a human: a question outside what you know, a special request only a person can arrange, a complaint you cannot resolve, or an explicit request to talk to someone. reason: outside_kb | special_request | complaint | human_request | other. summary: optional one line of what they need, in the guest's own words. It alerts the front desk during the day, or queues for first thing (after 10am) at night; the result tells you which so you can phrase it honestly. If this returns an error, do NOT tell the guest a person is coming.",
  inputSchema,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as EscalateInput;
    const esc = ctx.escalation;
    if (esc === undefined) {
      return { ok: false, error: 'INVALID', message: 'escalation is not available this turn' };
    }
    try {
      // GATE 0 — the retry key. A pg-boss retry of this turn (or a second call in
      // the regenerate loop) computes the SAME key and replays its own prior
      // attempt rather than raising a second escalation.
      const requestKey =
        esc.requestCursorId === null
          ? null
          : taskRequestKey(esc.conversationId, esc.requestCursorId, 'escalation');
      if (requestKey !== null) {
        const already = await findTaskByRequestKey(esc.db, requestKey);
        if (already !== null) return await replayFromExisting(esc, already, input);
      }

      if (esc.raised.count >= MAX_ESCALATIONS_PER_TURN) {
        return { ok: false, error: 'REFUSED', message: TURN_CAP_REFUSAL };
      }

      const summary = input.summary?.trim() || REASON_LABEL[input.reason];
      const detail = await esc.recentContext();
      const night = isNightIST(esc.now, esc.nightStart, esc.nightEnd);

      if (night) {
        // NIGHT — nobody is on duty. Queue for the morning; no card goes out.
        // The 10:00 deadline keeps findOverdueTasks from selecting it overnight,
        // and RUNGS.night_queue is empty so the ladder never nudges it — CH-14b's
        // digest is what converts it.
        const task = await insertTask(esc.db, {
          conversationId: esc.conversationId,
          guestId: esc.guestId,
          bookingId: null,
          villaLabel: null,
          kind: 'night_queue',
          origin: 'guest',
          summary,
          detail,
          assignedPhone: null,
          requestKey,
          slaDeadline: nextMorningTen(esc.now),
          now: esc.now,
        });
        esc.raised.count += 1;
        return { ok: true, data: { shortId: task.shortId, queued_for: 'morning' } };
      }

      // DAY — route to the front desk (the escalation ladder assigns to the
      // frontdesk lead) and send the card now.
      const assignment = esc.assign('escalation', null);
      const task = await insertTask(esc.db, {
        conversationId: esc.conversationId,
        guestId: esc.guestId,
        bookingId: null,
        villaLabel: null,
        kind: 'escalation',
        origin: 'guest',
        summary,
        detail,
        assignedPhone: assignment?.phone ?? null,
        requestKey,
        now: esc.now,
      });
      esc.raised.count += 1;
      const notified = await esc.notify(task, esc.guestFirstName, REASON_LABEL[input.reason]);
      if (!notified.delivered) {
        // The task is real and the front desk was paged separately; the promise
        // is not yet true, so ok:false stops guardrail 2 licensing C3 and the
        // worker's escalateToOps fallback fires. The task stays `open` (the
        // notifier does not flip it) so the ladder retries rung 1.
        return {
          ok: false,
          error: 'NOT_NOTIFIED',
          message: NOT_NOTIFIED,
          data: { shortId: task.shortId },
        };
      }
      // Bare data (the remember_fact/create_staff_task rule): only the id and the
      // day/night enum — never the guest's words or a ₹ figure.
      return { ok: true, data: { shortId: task.shortId, queued_for: 'now' } };
    } catch (error) {
      ctx.log.error(
        { err: summarizeError(error), conversationId: esc.conversationId },
        'escalate_to_human failed',
      );
      return { ok: false, error: 'UPSTREAM_DOWN' };
    }
  },
};

/**
 * The retry key already has an escalation against it. A night task simply
 * replays (nobody to re-notify). A day task RE-CONFIRMS delivery — a first
 * attempt whose card failed left the task `open` (not delivered), and replaying
 * ok:true blind would claim a person is coming when none is. We re-send (a rare
 * retry buzzing the desk twice beats a lie), and the delivery verdict is the
 * answer. A resolved task fails closed.
 */
async function replayFromExisting(
  esc: ToolEscalationContext,
  task: Task,
  input: EscalateInput,
): Promise<ToolResult> {
  if (task.status === 'done' || task.status === 'cancelled') {
    return { ok: false, error: 'REFUSED', message: RESOLVED_REFUSAL };
  }
  if (task.kind === 'night_queue') {
    return { ok: true, data: { shortId: task.shortId, queued_for: 'morning', replayed: true } };
  }
  const notified = await esc.notify(task, esc.guestFirstName, REASON_LABEL[input.reason]);
  if (!notified.delivered) {
    return { ok: false, error: 'NOT_NOTIFIED', message: NOT_NOTIFIED, data: { shortId: task.shortId } };
  }
  return { ok: true, data: { shortId: task.shortId, queued_for: 'now', replayed: true } };
}

/** The next 10:00 IST at or after `now` — a night escalation's morning deadline.
 * At 02:00 that is today's 10:00; at 23:05 it is tomorrow's (IST is a fixed
 * offset, so +24h always advances exactly one IST calendar day). */
function nextMorningTen(now: Date): Date {
  const todayTen = atISTHour(now, '10:00');
  if (todayTen.getTime() > now.getTime()) return todayTen;
  return atISTHour(new Date(now.getTime() + 24 * 60 * 60 * 1000), '10:00');
}
