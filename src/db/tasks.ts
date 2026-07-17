/**
 * tasks reads + writes (§4, CH-13a). The AI's hands live behind this file.
 *
 * THE CONCURRENCY RULE, and it is the one thing to get right here: every
 * state flip is a GUARDED UPDATE that returns the row it changed
 * (`WHERE status IN (...) RETURNING`), never a read-then-write. Two reasons,
 * both real on this system:
 *  - Staff commands are intercepted in the webhook BEFORE `insertMessage`, so
 *    they get NO `wa_message_id` dedupe for free (CH-02's dedupe protects the
 *    guest path only). A Meta redelivery of `DONE A3F2K9` therefore arrives
 *    twice, and only the UPDATE's own row count can tell the winner from the
 *    replay. The winner is the only one that may message the guest.
 *  - The 5-minutely nudger and a staff DONE can race on the same row.
 * This is the `lifecycle/sender.ts` pattern (CH-12), for the same reason.
 */
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { DbLike } from './client.js';
import { tasks } from './schema.js';

export type Task = typeof tasks.$inferSelect;
export type TaskKind = Task['kind'];
export type TaskStatus = Task['status'];

/**
 * §4's per-kind SLA. `escalation` at 10m is CH-14's number, defined here so its
 * chunk needs no migration and no second source of truth (the CH-12
 * `lead_followup` precedent). `night_queue` has NO deadline that means anything
 * — nobody is on duty — so it takes the frontdesk clock and CH-14b's morning
 * digest is what actually converts it. Recorded rather than left to a reader.
 */
export const SLA_MINUTES: Readonly<Record<TaskKind, number>> = {
  housekeeping: 30,
  frontdesk: 10,
  maintenance: 120,
  escalation: 10,
  night_queue: 10,
};

/** §6.4: at most this many OPEN tasks per conversation; further asks append. */
export const MAX_OPEN_TASKS_PER_CONVERSATION = 3;

/**
 * A task a human might still act on. `notify_failed` is deliberately ABSENT:
 * nobody received that card, so it is not work in flight — it is a hole, and
 * the ops alert is what chases it. Including it here would let the nudger
 * "re-ping" a person who was never pinged, and would let block [5] tell the
 * model a task is in hand when it is not.
 */
export const LIVE_TASK_STATUSES = ['open', 'nudged'] as const satisfies readonly TaskStatus[];

/**
 * Crockford-style base32 minus I/L/O/U: unambiguous when a tired housekeeper
 * reads it off a phone and types it back, and minus U so no 6-char id can spell
 * something unfortunate. 28^6 ≈ 480M — §3.3 asks for "short but unguessable
 * enough", and the id alone grants nothing anyway (a DONE is only honoured from
 * a roster number).
 */
const SHORT_ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'.replace(/[ILOU]/g, '');
const SHORT_ID_LENGTH = 6;

/** WHY randomInt and not Math.random: this id is typed back by a human as an
 * authorisation-shaped token, and Math.random is predictable from prior output. */
export function generateShortId(): string {
  let out = '';
  for (let i = 0; i < SHORT_ID_LENGTH; i += 1) {
    out += SHORT_ID_ALPHABET[randomInt(SHORT_ID_ALPHABET.length)];
  }
  return out;
}

export interface NewTask {
  conversationId: string | null;
  guestId: string | null;
  bookingId: string | null;
  /** The door as eZee reported it at task time, or the villa TYPE, or null. */
  villaLabel: string | null;
  kind: TaskKind;
  summary: string;
  detail: string | null;
  assignedPhone: string | null;
  /** Injected, never `new Date()` here — one clock per tick (the CH-12 lesson:
   * a suite that reads the wall clock lies at 02:00). */
  now: Date;
}

/**
 * Inserts an open task with a fresh short id. Retries on the short-id unique —
 * a collision is ~1-in-480M per attempt, but "unlikely" is not "handled", and
 * the failure mode would be a guest told their request was logged when it threw.
 */
export async function insertTask(db: DbLike, input: NewTask): Promise<Task> {
  const slaMinutes = SLA_MINUTES[input.kind];
  const slaDeadline = new Date(input.now.getTime() + slaMinutes * 60_000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [row] = await db
        .insert(tasks)
        .values({
          conversationId: input.conversationId,
          guestId: input.guestId,
          bookingId: input.bookingId,
          villaLabel: input.villaLabel,
          kind: input.kind,
          shortId: generateShortId(),
          summary: input.summary,
          detail: input.detail,
          assignedPhone: input.assignedPhone,
          slaMinutes,
          slaDeadline,
          openedAt: input.now,
        })
        .returning();
      if (row === undefined) throw new Error('insertTask: no row returned');
      return row;
    } catch (error) {
      if (attempt === 4 || !isShortIdCollision(error)) throw error;
    }
  }
  throw new Error('insertTask: unreachable');
}

function isShortIdCollision(error: unknown): boolean {
  // Drizzle wraps the driver error; the real one is on `.cause` (the CH-01
  // lesson — "Failed query: ..." hides a 23505 unique violation).
  const chain: unknown[] = [];
  for (let e: unknown = error, i = 0; e !== undefined && e !== null && i < 5; i += 1) {
    chain.push(e);
    e = (e as { cause?: unknown }).cause;
  }
  return chain.some(
    (e) =>
      (e as { code?: string }).code === '23505' &&
      String((e as { constraint_name?: string }).constraint_name ?? '').includes('short_id'),
  );
}

/** Open/nudged tasks on a conversation — the §6.4 3-open cap reads this. */
export async function getLiveTasksForConversation(
  db: DbLike,
  conversationId: string,
): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.conversationId, conversationId),
        inArray(tasks.status, [...LIVE_TASK_STATUSES]),
      ),
    )
    .orderBy(desc(tasks.openedAt));
}

/** Open/nudged tasks for a guest — block [5]'s source. */
export async function getLiveTasksForGuest(db: DbLike, guestId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.guestId, guestId), inArray(tasks.status, [...LIVE_TASK_STATUSES])))
    .orderBy(desc(tasks.openedAt));
}

/** Open/nudged tasks assigned to one staff number — the `TASKS` command. */
export async function getLiveTasksForPhone(db: DbLike, phone: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.assignedPhone, phone), inArray(tasks.status, [...LIVE_TASK_STATUSES])))
    .orderBy(desc(tasks.openedAt));
}

/** Appends to an existing task's detail (§6.4: a near-duplicate or an over-cap
 * ask APPENDS, it does not create). Guarded so a closed task can never reopen
 * by the back door. */
export async function appendToTask(db: DbLike, taskId: string, extra: string): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({
      detail: sql`concat_ws(chr(10), ${tasks.detail}, ${extra})`,
    })
    .where(and(eq(tasks.id, taskId), inArray(tasks.status, [...LIVE_TASK_STATUSES])))
    .returning();
  return row ?? null;
}

/**
 * Closes a task by its human-typed short id. Returns the row ONLY to the caller
 * that actually changed it — a replayed `DONE` returns null, so exactly one
 * close writes evidence and exactly one messages the guest.
 *
 * The short id is matched case-insensitively: it is read off a phone screen and
 * typed back, and a lowercase reply is a correct human, not a wrong one.
 */
export async function closeTaskByShortId(
  db: DbLike,
  shortId: string,
  closedBy: string,
  now: Date,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ status: 'done', closedAt: now, closedBy })
    .where(
      and(
        eq(sql`upper(${tasks.shortId})`, shortId.toUpperCase()),
        inArray(tasks.status, [...LIVE_TASK_STATUSES]),
      ),
    )
    .returning();
  return row ?? null;
}

/** Does a task with this short id exist at all, in any state? Distinguishes
 * "already done" from "no such id" so the staff reply can say which — a human
 * who typed a real id and got "unknown" would retype it forever. */
export async function findTaskByShortId(db: DbLike, shortId: string): Promise<Task | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(eq(sql`upper(${tasks.shortId})`, shortId.toUpperCase()))
    .limit(1);
  return row ?? null;
}

/** Overdue OPEN tasks (§2.3's 5-min nudger). `nudged` is excluded: the ladder
 * nudges once here, and CH-14's escalation SLA owns the second rung. */
export async function findOverdueTasks(db: DbLike, now: Date, limit = 20): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, 'open'), lte(tasks.slaDeadline, now)))
    .orderBy(tasks.slaDeadline)
    .limit(limit);
}

/** Claims a task for nudging. Guarded on `open` so two nudger ticks (or a
 * DONE landing mid-tick) can never double-ping a busy human. */
export async function markNudged(db: DbLike, taskId: string): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ status: 'nudged' })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, 'open')))
    .returning();
  return row ?? null;
}

/** The card never reached a human. Not an error state — a recorded hole, which
 * guardrail 2 reads as "no promise may be made about this task". */
export async function markNotifyFailed(db: DbLike, taskId: string): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'notify_failed' })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, 'open')));
}
