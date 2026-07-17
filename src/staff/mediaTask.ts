/**
 * CH-13b · the media-fallback frontdesk task. When a guest sends a captionless
 * photo, voice note or file the AI cannot read (§6.7), the policy path already
 * sends them the "mind typing it?" line — but the follow-up used to be a
 * fire-and-forget ops PING. This makes it a tracked frontdesk TASK, so a human
 * actually picks it up and can close it with DONE.
 *
 * It reuses the CH-13a task infrastructure through the SAME `assign`/`notify`
 * the tool uses (injected on the worker's `deps.tasks`), so there is one code
 * path from a task to a staff card, not two. Fail-closed by construction: an
 * empty roster makes `assign` return null, the card lands nowhere, and
 * `notifyTask` records the hole + pages ops — the exact signal the old ops ping
 * gave, now with a task row behind it.
 */
import { insertTask, type Task, type TaskKind } from '../db/tasks.js';
import type { Db } from '../db/client.js';
import type { ToolTaskContext } from '../brain/tools/registry.js';

export interface MediaTaskDeps {
  db: Db;
  /** The roster ladder — the SAME function the tool calls. */
  assign: ToolTaskContext['assign'];
  /** The window-aware card sender — the SAME wrapper the tool calls. */
  notify: ToolTaskContext['notify'];
  /** DB-clock instant for the SLA deadline. Never `new Date()` here. */
  now: Date;
}

export interface MediaTaskContext {
  conversationId: string;
  guestId: string;
  guestFirstName: string | null;
  /** The newest guest message of the batch — the retry key, so a redelivered
   * turn collides on the unique index instead of raising a second card. */
  sourceMessageId: string;
}

const MEDIA_TASK_SUMMARY =
  'guest sent media the assistant could not read — please check the chat and follow up';

/**
 * Raise the frontdesk task for a captionless-media turn. Returns the delivery
 * verdict so the caller can log it; never throws a card failure into the guest
 * turn (notifyTask owns that guarantee).
 */
export async function raiseMediaFrontdeskTask(
  deps: MediaTaskDeps,
  ctx: MediaTaskContext,
): Promise<{ task: Task; delivered: boolean }> {
  const kind: TaskKind = 'frontdesk';
  const assignment = deps.assign(kind, null);
  const task = await insertTask(deps.db, {
    conversationId: ctx.conversationId,
    guestId: ctx.guestId,
    bookingId: null,
    // No house: a media sender may be a lead with no booking, and this is a
    // frontdesk task regardless. Null renders the "villa not confirmed" label.
    villaLabel: null,
    kind,
    summary: MEDIA_TASK_SUMMARY,
    detail: null,
    assignedPhone: assignment?.phone ?? null,
    // Deterministic: one task per media turn, idempotent across a pg-boss
    // redelivery of the same batch.
    requestKey: `media:${ctx.conversationId}:${ctx.sourceMessageId}`,
    now: deps.now,
  });
  const { delivered } = await deps.notify(task, ctx.guestFirstName, 'raise');
  return { task, delivered };
}
