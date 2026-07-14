/**
 * The minutely lifecycle sender (CH-12, plan §8 step 4 + §2.3).
 *
 * A scheduled row is an INTENTION, recorded possibly months ago. The world has
 * had all that time to change, so the sender re-reads the mirror, the gates and
 * the guest before every single send. The rule of the house: the MIRROR is the
 * truth, the schedule is only a plan (§3.4).
 *
 * ── TRANSIENT vs TERMINAL ────────────────────────────────────────────────────
 * The single most important distinction in this file, and the one an adversarial
 * review caught it getting wrong. `pending` IS the retry state — the claim guard
 * already makes a re-run safe, which is the whole point of the pattern. So:
 *
 *   TRANSIENT (Meta busy, a DB wobble, the window still shut, a human holding
 *   the thread) → LEAVE IT PENDING, backed off. The next tick is a free retry.
 *
 *   TERMINAL (the booking is cancelled, the guest is gone, the params are
 *   invalid, the message is too old to be true any more) → resolve it, with a
 *   reason a human can read.
 *
 * Treating "the database hiccuped" the same as "this guest must not be messaged"
 * destroyed the confirmation for ever, because a resolved row can never be
 * rescheduled (the scheduler's upsert only touches `pending` rows). A transient
 * fault must never be able to silently cancel a guest's welcome.
 *
 * ── ATOMICITY (§3.4's send-intent pattern) ───────────────────────────────────
 * ONE transaction claims the scheduled row (pending → sent, guarded by
 * `WHERE status='pending'`) AND writes the message row as 'queued', and it
 * commits BEFORE the Graph call. Two senders racing: the WHERE makes exactly one
 * of them the winner. A crash after the commit: the message row sits 'queued'
 * and CH-17's stale-queued sweep reconciles it — it is never blindly re-sent.
 */
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { BookingMirror } from '../db/bookings.js';
import type { Db } from '../db/client.js';
import { insertCostEvents } from '../db/repos.js';
import { bookingsMirror, conversations, guests, scheduledMessages } from '../db/schema.js';
import { istCalendarDay, nowIST } from '../lib/time.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { hasPhone, passesSource, type GateContext } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

/** §2.3: "fewer than 2 win-backs sent in the trailing 365 days". */
const WINBACK_CAP = 2;
const WINBACK_WINDOW_DAYS = 365;
/** A deferred row waits this long before the sender looks at it again. Without
 * it, an undeliverable row (window shut) is permanently the OLDEST row, so it
 * permanently occupies the batch — 25 of them starve every newer message for
 * ever, while alerting once a minute each. */
const DEFER_MINUTES = 15;
/** Past this age a lifecycle message has stopped being true. "We look forward to
 * welcoming you on Sunday" is worse than silence when Sunday was last week —
 * and a guest who finally opens their window on arrival day must not receive
 * their confirmation, pre-arrival and welcome all at once. */
const STALE_AFTER_HOURS = 36;

export interface SenderLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface SenderDeps {
  db: Db;
  log: SenderLogger;
  wa: Pick<WaClient, 'planTemplatedSend' | 'dispatchTemplated' | 'createSendIntent'>;
  /** The same gates the scheduler used — re-applied at send time, because a
   * booking can stop qualifying between the two (see `stillQualifies`). */
  gates: Pick<GateContext, 'sources'>;
  /** LIFECYCLE_SEND_ENABLED. Off ⇒ rows accrue as 'pending' and NOTHING is sent.
   * Merging this chunk to main must not, by itself, start messaging people. */
  enabled: boolean;
  batchSize?: number;
}

export interface SenderResult {
  attempted: number;
  sent: number;
  /** Resolved as not-to-be-sent: cancelled booking, no consent, too old. */
  skipped: number;
  /** Left pending on purpose — the next tick retries. */
  deferred: number;
  failed: number;
}

type ScheduledRow = typeof scheduledMessages.$inferSelect;
type Outcome = 'sent' | 'skipped' | 'deferred' | 'failed';

/** Terminal: resolve the row, it will never be sent. */
async function resolve(
  db: Db,
  row: ScheduledRow,
  status: 'skipped' | 'failed',
  reason: string,
): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status, skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/** Transient: keep it pending, look again later. THIS is the retry mechanism. */
async function defer(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({
      sendAt: new Date(Date.now() + DEFER_MINUTES * 60_000),
      skipReason: reason.slice(0, 100), // why it is waiting; the row stays pending
    })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/**
 * The send-time contract: **is this still a real booking?** — NOT "would we
 * schedule it today?".
 *
 * Getting this wrong is the codebase's own recurring failure class, and it bit
 * here: the first version re-used the SCHEDULING allowlist (confirmed|modified),
 * so the moment a real stay advanced to `checked_in` or `checked_out` — which is
 * exactly what happens to every stay that actually occurs — the welcome, the
 * thank-you and the win-back were all killed, permanently. The file even
 * explained at length why re-applying the DATE gate would do that, and then did
 * the same thing with the status.
 *
 * A booking that has been *lived* is still a booking. A booking that was
 * cancelled is not.
 */
function bookingState(booking: BookingMirror): 'ok' | 'terminal' | 'transient' {
  switch (booking.status) {
    case 'confirmed':
    case 'modified':
    case 'checked_in':
    case 'checked_out':
      return 'ok';
    case 'cancelled':
    case 'no_show':
      return 'terminal';
    // An unconfirmed hold, or a status eZee has not shown us before. It may well
    // resolve on the next poll, so it must NOT burn the message.
    case 'unknown':
    default:
      return 'transient';
  }
}

/** Marketing may only go to a guest who asked for it (§4, CH-15's consent). */
async function marketingBlock(db: Db, row: ScheduledRow, kind: ScheduledKind): Promise<string | null> {
  if (LIFECYCLE_TEMPLATES[kind].category !== 'marketing') return null;

  const [guest] = await db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) return 'guest_missing';
  // WHY consent is checked HERE and not when the row was scheduled: it is
  // captured by CH-15's post-stay thank-you, ~74 days AFTER the booking was
  // scheduled. Gating at schedule time would mean marketing_opt_in is always
  // false at that moment, and the win-back could never fire for anyone, ever.
  if (!guest.marketingOptIn) return 'no_marketing_opt_in';

  if (kind === 'winback') {
    const since = new Date(Date.now() - WINBACK_WINDOW_DAYS * 24 * 3600_000);
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.guestId, row.guestId),
          eq(scheduledMessages.kind, 'winback'),
          eq(scheduledMessages.status, 'sent'),
          gte(scheduledMessages.updatedAt, since),
        ),
      );
    if (count >= WINBACK_CAP) return 'winback_cap_reached';
  }
  return null;
}

/** One tick: send everything due. Never throws — a bad row must not wedge the cron. */
export async function runSender(deps: SenderDeps): Promise<SenderResult> {
  const result: SenderResult = { attempted: 0, sent: 0, skipped: 0, deferred: 0, failed: 0 };
  if (!deps.enabled) {
    deps.log.info({}, '[lifecycle] sender disabled (LIFECYCLE_SEND_ENABLED=0) — nothing sent');
    return result;
  }

  const due = await deps.db
    .select()
    .from(scheduledMessages)
    .where(and(eq(scheduledMessages.status, 'pending'), lt(scheduledMessages.sendAt, new Date())))
    .orderBy(scheduledMessages.sendAt)
    .limit(deps.batchSize ?? 10);

  for (const row of due) {
    result.attempted += 1;
    try {
      result[await sendOne(deps, row)] += 1;
    } catch (error) {
      // A DB wobble is NOT a decision that this guest must not be messaged.
      // Leave it pending; the next tick is a free retry.
      result.deferred += 1;
      deps.log.error(
        { scheduledId: row.id, kind: row.kind },
        `[lifecycle] send threw — deferred, not lost: ${String(error)}`,
      );
      await defer(deps.db, row, 'transient_error').catch(() => undefined);
    }
  }

  if (result.attempted > 0) deps.log.info({ ...result }, '[lifecycle] sender tick');
  return result;
}

/** Everything that can stop a due row, in the order that reads best in a log. */
async function blockedBy(
  deps: SenderDeps,
  row: ScheduledRow,
): Promise<{ outcome: Exclude<Outcome, 'sent'>; reason: string } | null> {
  // Too old to be true. A pre-arrival delivered a week late is a lie.
  const ageHours = (Date.now() - row.sendAt.getTime()) / 3_600_000;
  if (ageHours > STALE_AFTER_HOURS) {
    return { outcome: 'skipped', reason: 'stale' };
  }

  if (row.bookingId !== null) {
    const [booking] = await deps.db
      .select()
      .from(bookingsMirror)
      .where(eq(bookingsMirror.id, row.bookingId));
    if (booking === undefined) return { outcome: 'skipped', reason: 'booking_missing' };

    const state = bookingState(booking);
    if (state === 'terminal') {
      return { outcome: 'skipped', reason: `booking_${booking.status}` };
    }
    if (state === 'transient') {
      return { outcome: 'deferred', reason: `booking_${booking.status}` };
    }
    // The SOURCE and PHONE gates are re-applied — eZee changes both fields, and
    // a booking re-sourced to an OTA after it was scheduled must not send (Q13).
    // The DATE gate is deliberately NOT re-applied: check_in is in the past by
    // the time a thank-you is due, which is the entire point of a thank-you.
    if (!passesSource(booking, deps.gates.sources)) {
      return { outcome: 'skipped', reason: 'source_not_allowed' };
    }
    if (!hasPhone(booking)) return { outcome: 'skipped', reason: 'no_phone' };
  }

  const marketing = await marketingBlock(deps.db, row, row.kind);
  if (marketing !== null) return { outcome: 'skipped', reason: marketing };

  return null;
}

async function sendOne(deps: SenderDeps, row: ScheduledRow): Promise<Outcome> {
  const blocked = await blockedBy(deps, row);
  if (blocked !== null) {
    if (blocked.outcome === 'deferred') {
      await defer(deps.db, row, blocked.reason);
      deps.log.info({ scheduledId: row.id, reason: blocked.reason }, '[lifecycle] send deferred');
      return 'deferred';
    }
    await resolve(deps.db, row, 'skipped', blocked.reason);
    deps.log.info({ scheduledId: row.id, reason: blocked.reason }, '[lifecycle] send skipped');
    return 'skipped';
  }

  const [guest] = await deps.db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) {
    await resolve(deps.db, row, 'skipped', 'guest_missing');
    return 'skipped';
  }

  // The send lands IN the guest's conversation, so the thread reads as one story
  // and their reply flows through the normal pipeline (plan CH-12 step 5). A
  // NULL conversation_id would mean "staff/ops send" per §4 — the message would
  // vanish from the guest's own thread — so a missing conversation is a defer,
  // never a silent send into the void.
  const [conversation] = await deps.db
    .select()
    .from(conversations)
    .where(eq(conversations.guestId, guest.id))
    .limit(1);
  if (conversation === undefined) {
    await defer(deps.db, row, 'conversation_missing');
    return 'deferred';
  }

  // A human has taken this thread over (CH-14's echo pause). The architecture's
  // rule is "human replies pause the AI" — and CH-12 is the one chunk that
  // speaks first, so it is the one that most needs to honour it. Wait.
  const humanActive =
    conversation.humanActiveUntil !== null && conversation.humanActiveUntil.getTime() > Date.now();
  if (humanActive || conversation.status === 'human_active') {
    await defer(deps.db, row, 'human_active');
    deps.log.info({ scheduledId: row.id }, '[lifecycle] deferred — a human holds the thread');
    return 'deferred';
  }

  const planned = await deps.wa.planTemplatedSend(
    guest.phone,
    { key: row.kind, params: row.params as Record<string, string> },
    { conversationId: conversation.id, sender: 'ai' },
  );
  if (!planned.ok) {
    // The window is shut and we have no approved template yet (dev). Not a
    // failure and not a decision — just not yet. Back off and try again; the
    // moment the guest writes to us, the window opens and it goes.
    if (planned.error === 'WINDOW_CLOSED_SIMULATED') {
      await defer(deps.db, row, 'window_closed');
      return 'deferred';
    }
    // Params Meta would reject: a real, terminal defect in our own data.
    await resolve(deps.db, row, 'failed', planned.error);
    await alertOps(deps.log, {
      kind: 'lifecycle_send_failed',
      summary: 'A lifecycle message could not be prepared',
      detail: { scheduledId: row.id, kind: row.kind, reason: planned.error.slice(0, 60) },
    });
    return 'failed';
  }

  // ── the claim + intent, in ONE transaction, committed BEFORE Graph ────────
  // The message row is written through the client's own createSendIntent (CH-02
  // decision D2: EVERY outbound goes through wa/client.ts) rather than a second
  // hand-rolled INSERT that would drift from it.
  const messageId = await deps.db.transaction(async (tx) => {
    const claimed = await tx
      .update(scheduledMessages)
      .set({ status: 'sent' })
      .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')))
      .returning({ id: scheduledMessages.id });
    if (claimed.length === 0) return null; // another sender won the race

    const message = await deps.wa.createSendIntent(
      tx,
      planned.body,
      { conversationId: conversation.id, sender: 'ai' },
      planned.intentExtra,
    );
    await tx
      .update(scheduledMessages)
      .set({ sentMessageId: message.id })
      .where(eq(scheduledMessages.id, row.id));
    return message.id;
  });

  if (messageId === null) {
    deps.log.info({ scheduledId: row.id }, '[lifecycle] row already claimed — not re-sent');
    return 'skipped';
  }

  const sendResult = await deps.wa.dispatchTemplated(
    { messageId, toE164: guest.phone, body: planned.body, conversationId: conversation.id },
    planned,
  );

  if (!sendResult.ok) {
    // The row is already claimed 'sent' and the message row carries the failure —
    // that is the send-intent contract, and it is what stops a retry from
    // double-sending. CH-17's stale-queued sweep owns the reconciliation.
    await deps.db
      .update(scheduledMessages)
      .set({ status: 'failed', skipReason: sendResult.error.slice(0, 100) })
      .where(eq(scheduledMessages.id, row.id));
    await alertOps(deps.log, {
      kind: 'lifecycle_send_failed',
      summary: 'A lifecycle message failed to send',
      detail: { scheduledId: row.id, kind: row.kind, messageId },
    });
    return 'failed';
  }

  // §5.3/§4: a real template send is billable — meter it. A free-form send inside
  // an open window is not, and must not be counted as one.
  if (planned.asTemplate) {
    await insertCostEvents(deps.db, [
      { day: istCalendarDay(nowIST()), kind: 'wa_template', quantity: '1', inrEstimate: '0' },
    ]);
  }

  deps.log.info(
    { scheduledId: row.id, kind: row.kind, usedTemplate: planned.asTemplate },
    '[lifecycle] sent',
  );
  return 'sent';
}
