/**
 * tasks reads + writes (§4, CH-13a). The AI's hands live behind this file.
 *
 * THE CONCURRENCY RULE, and it is the one thing to get right here: every
 * state flip is a GUARDED UPDATE that returns the row it changed
 * (`WHERE status IN (...) RETURNING`), never a read-then-write. Two reasons,
 * both real on this system:
 *  - A Meta redelivery of `DONE A3F2K9` is absorbed FIRST by the webhook's own
 *    `wa_message_id` dedupe (it stores the staff message through the same
 *    `insertMessage`, so the `isNew` guard returns early). This layer is the
 *    SECOND guard, for what that one cannot see: two staff typing DONE on the
 *    same task at once, or a job retry after a crash. Only the UPDATE's own
 *    returned row tells the winner from the loser, and the winner is the only
 *    one that writes evidence and messages the guest.
 *  - The 5-minutely nudger and a staff DONE can race on the same row.
 * This is the `lifecycle/sender.ts` pattern (CH-12), for the same reason.
 */
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { DbLike } from './client.js';
import { tasks } from './schema.js';

export type Task = typeof tasks.$inferSelect;
export type TaskKind = Task['kind'];
export type TaskOrigin = Task['origin'];
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
 * Crockford base32: unambiguous when a tired housekeeper reads it off a phone
 * and types it back (it already excludes I/L/O/U, so no 6-char id can spell
 * something unfortunate either). 32^6 ≈ 1.07B — §3.3 asks for "short but
 * unguessable enough", and the id alone grants nothing anyway: a DONE is only
 * honoured from a roster number, so a guest who knows one can do nothing with
 * it. (A `.replace(/[ILOU]/g,'')` used to sit here doing nothing, with a
 * comment claiming 28^6 — the alphabet never contained those letters.)
 */
const SHORT_ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
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
  /** The retry key (see schema). Null ⇒ no guest message asked for this. */
  requestKey: string | null;
  /** `guest` (they asked) vs `system` (we raised it for them). Default guest. */
  origin?: TaskOrigin;
  /** Overrides the kind-derived SLA deadline. CH-13b's arrival verify-task
   * anchors this to CHECK-IN, not now+10min — a task for a guest 8 days out
   * must not go "overdue" and buzz the front desk today. Omit ⇒ now + the
   * per-kind SLA (the in-stay contract). */
  slaDeadline?: Date;
  /** Injected, never `new Date()` here — one clock per tick (the CH-12 lesson:
   * a suite that reads the wall clock lies at 02:00). */
  now: Date;
}

/** `${conversationId}:${OLDEST guest message id}:${kind}` — deterministic, so a
 * pg-boss retry of the same turn computes the SAME key and collides instead of
 * being judged by word overlap.
 *
 * Oldest, not newest: the cursor does not advance until the claim, and the
 * tool loop runs before it, so a retry sees the same oldest message however
 * much the batch grew meanwhile. See ToolTaskContext.requestCursorId. */
export function taskRequestKey(
  conversationId: string,
  requestCursorId: string,
  kind: TaskKind,
): string {
  return `${conversationId}:${requestCursorId}:${kind}`;
}

/** The task a previous attempt at THIS request already created, if any. */
export async function findTaskByRequestKey(db: DbLike, requestKey: string): Promise<Task | null> {
  const [row] = await db.select().from(tasks).where(eq(tasks.requestKey, requestKey)).limit(1);
  return row ?? null;
}

/**
 * Re-anchor an OPEN task's SLA deadline (CH-13b round 2). The arrival
 * verify-task's deadline is check-in-derived, and a booking.modified can move
 * check-in — a frozen deadline would nudge against the OLD date (axis-2: a
 * terminal state keyed on a MUTABLE fact). Guarded on `open` so a done or nudged
 * task is never disturbed; returns the row it changed, or null if it was not
 * open. `nudged` is deliberately excluded — once chased, leave it chased.
 */
export async function updateOpenTaskDeadline(
  db: DbLike,
  taskId: string,
  slaDeadline: Date,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ slaDeadline })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, 'open')))
    .returning();
  return row ?? null;
}

/**
 * Inserts an open task with a fresh short id.
 *
 * Retries on the SHORT-ID unique — a collision is ~1-in-a-billion per attempt,
 * but "unlikely" is not "handled", and the failure mode would be a guest told
 * their request was logged when it threw.
 *
 * It does NOT retry a REQUEST-KEY collision, and the difference matters: a
 * short-id clash means "unlucky, try another id"; a request-key clash means
 * "this exact request already exists" — retrying would defeat the very guard.
 *
 * That collision throws, and the caller turns it into UPSTREAM_DOWN. An
 * earlier version of this comment claimed the caller "reads the existing row";
 * it does not — its catch is total (pre-push review). The normal path never
 * gets here: GATE 0 reads the existing row BEFORE the insert. Reaching this
 * throw means a CONCURRENT attempt inserted between that read and this write,
 * and then failing closed is right: ok:false licenses no claim, the model
 * falls back to the C3 referral, and a human is brought in over a task that
 * does exist. Noisy in a race we have never observed; never a lie.
 */
export async function insertTask(db: DbLike, input: NewTask): Promise<Task> {
  const slaMinutes = SLA_MINUTES[input.kind];
  const slaDeadline = input.slaDeadline ?? new Date(input.now.getTime() + slaMinutes * 60_000);
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
          requestKey: input.requestKey,
          origin: input.origin ?? 'guest',
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

/**
 * The GUEST's open/nudged requests on a conversation — the §6.4 3-open cap and
 * the near-duplicate/append gate read this.
 *
 * 🚨 origin='guest' ONLY (CH-13b round 3), the third sibling of round 1's block
 * [5] guard. A `system` task (the media follow-up carries a conversationId) is
 * NOT one of the guest's requests: counting it would refuse a real request on a
 * phantom cap slot, and — worse — the append gate would fold a genuine
 * frontdesk ask INTO the system task, which then closes silently (round 2's
 * origin guard suppresses its close line and evidence). The cap is "how many
 * things has the GUEST asked for", so it counts only what the guest asked for.
 * Its siblings differ by contract and stay unfiltered: getLiveTasksForPhone
 * (a staff member SHOULD see their system tasks) and findOverdueTasks (a system
 * task DOES get nudged near check-in).
 */
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
        eq(tasks.origin, 'guest'),
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
    .where(
      and(
        eq(tasks.guestId, guestId),
        // 🚨 CH-13b: block [5] is the GUEST's open requests. A `system` task
        // (arrival verify, media follow-up) is real staff work the guest never
        // asked for — surfacing it would let the model repeat internal ops
        // wording, or re-raise a past complaint, back to the guest (round-1
        // review). It stays staff-side.
        eq(tasks.origin, 'guest'),
        inArray(tasks.status, [...LIVE_TASK_STATUSES]),
      ),
    )
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
      // 🚨 THE `::text` CAST IS LOAD-BEARING, NOT TIDINESS. Without it this
      // threw `could not determine data type of parameter $1` on EVERY call,
      // against every branch — `concat_ws` is variadic `"any"`, so Postgres
      // cannot infer a bare bound parameter's type and refuses to plan the
      // statement. Both append paths (GATE 3's near-duplicate, GATE 4's
      // at-cap) were therefore DEAD from the moment they were written, and two
      // later "fixes" built on them were fiction.
      //
      // It survived 33 green tests because this suite used a hand-rolled fake
      // `db` whose `update()` pushed to an array and ran no SQL — a database
      // that cannot fail cannot falsify anything. The suite now runs on real
      // Postgres, which found it on the first run.
      //
      // WHY concat_ws in SQL rather than read-modify-write in code: it is
      // atomic. Two appends racing would otherwise lose one.
      detail: sql`concat_ws(chr(10), ${tasks.detail}, ${extra}::text)`,
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
        // The stored id is ALWAYS uppercase (SHORT_ID_ALPHABET has no lower
        // case), so upper-casing the INPUT is enough and upper-casing the
        // COLUMN would only defeat the unique index — verified with EXPLAIN:
        // `upper(short_id) = $1` seq-scans, this index-scans. Same
        // case-insensitive-human property, one index scan (pre-push review).
        eq(tasks.shortId, shortId.toUpperCase()),
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
    .where(eq(tasks.shortId, shortId.toUpperCase()))
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
