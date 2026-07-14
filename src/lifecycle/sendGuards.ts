/**
 * What stops a due lifecycle message, and whether that stop is FOREVER (CH-12;
 * split out of sender.ts for the ~300-line rule).
 *
 * The single most important distinction in the lifecycle engine, and the one an
 * adversarial review caught the first version getting wrong:
 *
 *   TRANSIENT (Meta busy, a DB wobble, the window still shut, a human holding
 *   the thread) → LEAVE IT PENDING, backed off. `pending` IS the retry state,
 *   and the claim guard already makes a re-run safe.
 *
 *   TERMINAL (the booking is cancelled, the guest is gone, the params are
 *   invalid, the message is too old to be true) → resolve it, with a reason a
 *   human can read.
 *
 * Treating "the database hiccuped" the same as "this guest must not be messaged"
 * destroyed the confirmation for ever, because a resolved row can never be
 * rescheduled — the scheduler's upsert only touches `pending` rows.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import type { BookingMirror } from '../db/bookings.js';
import type { Db } from '../db/client.js';
import { bookingsMirror, guests, scheduledMessages } from '../db/schema.js';
import { hasPhone, passesSource, type GateContext } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

/** §2.3: "fewer than 2 win-backs sent in the trailing 365 days". */
const WINBACK_CAP = 2;
const WINBACK_WINDOW_DAYS = 365;
/** A deferred row waits this long before the sender looks at it again. Without
 * it, an undeliverable row (window shut) is permanently the OLDEST row, so it
 * permanently occupies the batch — 25 of them starve every newer message for
 * ever, while alerting once a minute each. */
export const DEFER_MINUTES = 15;
/** Past this age a lifecycle message has stopped being true. "We look forward to
 * welcoming you on Sunday" is worse than silence when Sunday was last week — and
 * a guest who finally opens their window on arrival day must not receive their
 * confirmation, pre-arrival and welcome all at once. */
export const STALE_AFTER_HOURS = 36;

export type ScheduledRow = typeof scheduledMessages.$inferSelect;
export type Outcome = 'sent' | 'skipped' | 'deferred' | 'failed';

export interface BlockContext {
  db: Db;
  gates: Pick<GateContext, 'sources'>;
}

/** Terminal: resolve the row, it will never be sent. */
export async function resolve(
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
export async function defer(db: Db, row: ScheduledRow, reason: string): Promise<void> {
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

/** Everything that can stop a due row, in the order that reads best in a log. */
export async function blockedBy(
  deps: BlockContext,
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
