/**
 * The task card (plan §8 CH-13 step 2, §5.3).
 *
 * 🚨 THE 24h WINDOW BINDS STAFF TOO, and it bites here first. A housekeeper who
 * has not messaged the line in a day is UNREACHABLE by free-form — Meta treats
 * a card to a cold staff number as business-initiated exactly like a guest
 * send. So every card goes through `sendTemplated`, which picks free-form
 * inside an open window and `nst_task_card_v1` when it is shut. The runbook's
 * old mitigation ("every staff number messages the line once") buys 24 hours,
 * not for ever.
 *
 * `conversationId: null` is load-bearing, not cosmetic: it is what routes
 * `windowStateFor` to the `phone_windows` branch. A staff number that is ALSO a
 * guest has two independent windows, and judging a task card by the guest one
 * would be the wrong question entirely.
 *
 * ─── DELIVERY IS THE CONTRACT ─────────────────────────────────────────────
 * The caller must treat `delivered` as the whole answer, because it is what
 * guardrail 2 keys off. This is CH-12's blocker #5 relearnt rather than
 * rediscovered: `escalateToOps` used to discard its SendResult and write the
 * evidence row regardless, so when the send failed the AI still told the guest
 * a human was coming. "Never promise what didn't happen" is not a slogan here
 * — a task nobody received licenses nothing.
 *
 * And UNLIKE `escalateToOps`, there is NO "nobody is configured" carve-out.
 * That carve-out is right for an ops ALERT, where the log genuinely is the ops
 * channel for a two-person team (CH-02 D4). It is wrong for a TASK: an ops
 * alert claims only that a message was recorded, while "two towels are on their
 * way" claims a PERSON IS MOVING. With an empty roster nobody is moving, so an
 * empty roster must license nothing.
 */
import { markNotifyFailed, type Task } from '../db/tasks.js';
import type { Db } from '../db/client.js';
import { sanitiseInline } from '../brain/prompt.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';

export interface NotifierDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
}

/** §6.3's rule: eZee/WhatsApp-derived names are untrusted text and are
 * control-char-stripped and length-capped before they reach a human-read
 * surface. CH-08's own comment asked CH-13's cards to reuse this. */
const NAME_MAX = 40;
/** plan §8 step 2's cap. Well inside Meta's 200-char param limit. */
export const SUMMARY_MAX = 120;

/** What the card says when no door was resolved. Deliberately NOT blank and
 * deliberately NOT a guess: it tells the human the one thing they need to do
 * differently, and it is why the fallback assignee is the front desk. */
export const VILLA_UNRESOLVED_LABEL = 'villa not confirmed — please check eZee';

export interface NotifyResult {
  /** The ONLY input to "may the AI now claim anything about this task?". */
  delivered: boolean;
  usedTemplate: boolean;
}

/**
 * Sends one task card. Never throws: a card is a side effect of a guest's
 * request, and a throw here would turn "we could not reach housekeeping" into
 * "the guest's turn crashed".
 */
export async function notifyTask(
  deps: NotifierDeps,
  task: Task,
  guestFirstName: string | null,
): Promise<NotifyResult> {
  if (task.assignedPhone === null) {
    // No rung of the ladder had anybody (an empty roster and no ops number —
    // which is dev's standing state today, and go-live's job to fix). The task
    // is real and recorded; nobody was told, and nothing may be claimed.
    await recordHole(deps, task, 'no_assignee');
    return { delivered: false, usedTemplate: false };
  }

  const params = {
    shortId: task.shortId,
    villa: task.villaLabel ?? VILLA_UNRESOLVED_LABEL,
    guestName: sanitiseInline(guestFirstName ?? 'a guest', NAME_MAX) || 'a guest',
    summary: sanitiseInline(task.summary, SUMMARY_MAX),
  };

  const result = await deps.wa.sendTemplated(
    task.assignedPhone,
    { key: 'task_card', params },
    { conversationId: null, sender: 'system' },
  );

  if (!result.ok) {
    await recordHole(deps, task, result.error);
    return { delivered: false, usedTemplate: false };
  }
  deps.log.info?.(
    { taskId: task.id, shortId: task.shortId, usedTemplate: result.usedTemplate },
    'staff task card sent',
  );
  return { delivered: true, usedTemplate: result.usedTemplate };
}

/**
 * A card that never landed. The task stays in the DB — it is a real request
 * from a real guest — but its status says nobody has it, which keeps the SLA
 * nudger from "re-pinging" a person who was never pinged and keeps block [5]
 * from telling the model a task is in hand.
 */
async function recordHole(deps: NotifierDeps, task: Task, reason: string): Promise<void> {
  // 🚨 If THIS update fails, the task stays `open` — a card nobody received,
  // looking exactly like work in hand. The nudger would then chase it and,
  // on a landed nudge, write an `sla_nudge` row licensing "I've just nudged
  // housekeeping" about a task no human has ever seen: the honesty hole
  // `notify_failed` exists to prevent, defeated by a swallowed catch
  // (pre-push review). It is still swallowed — the notifier must never throw
  // into a guest's turn — but it is no longer SILENT: ops is paged either way
  // below, and the failure is named so an operator can find it.
  await markNotifyFailed(deps.db, task.id).catch((error: unknown) => {
    deps.log.error(
      { taskId: task.id, shortId: task.shortId, err: String(error) },
      'markNotifyFailed FAILED — task is still open with a card nobody received',
    );
  });
  await alertOps(deps.log, {
    kind: 'task_notify_failed',
    summary: 'A staff task card did not reach anyone — the guest has NOT been promised anything',
    detail: {
      taskId: task.id,
      shortId: task.shortId,
      kind: task.kind,
      villa: task.villaLabel,
      assignedPhone: task.assignedPhone,
      reason,
    },
  });
}
