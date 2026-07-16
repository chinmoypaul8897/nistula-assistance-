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
import type { Db } from '../db/client.js';
import { bookingsMirror, guests, scheduledMessages } from '../db/schema.js';
import { bookingState, hasPhone, passesSource, type GateContext } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

/** Kinds that belong BEFORE/DURING the stay — meaningless once it is over. The
 * post-stay kinds (poststay, winback) are supposed to fire after check-out. */
const PRE_STAY_KINDS: readonly ScheduledKind[] = ['confirmation', 'prearrival', 'welcome'];

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
  /** sources re-applied at send time; today for the stay-over backstop. */
  gates: Pick<GateContext, 'sources' | 'today'>;
}

const backoff = (): Date => new Date(Date.now() + DEFER_MINUTES * 60_000);

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

/** Transient: keep it pending, look again after the backoff. THE retry mechanism.
 * Parks the row on deferred_until — NEVER send_at, which is the planned time the
 * stale guard reads. */
export async function defer(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ deferredUntil: backoff(), skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/**
 * A transient GRAPH failure (a Meta 429, a 5xx, a network error) — the message
 * provably did NOT go, so re-arm the already-claimed row for another attempt.
 *
 * This is the BLOCKER fix: before it, any non-ok Graph response resolved the row
 * to 'failed' terminally, so a rate-limit during a batch permanently lost a real
 * guest's confirmation. The row was claimed 'sent' before the Graph call (the
 * send-intent pattern), so re-arming means sent → pending; the failed message
 * row stays as the audit of the attempt, and the next tick writes a fresh intent.
 */
export async function retryAfterFailedSend(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status: 'pending', sentMessageId: null, deferredUntil: backoff(), skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'sent')));
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
    if (!passesSource(booking, deps.gates.sources)) {
      return { outcome: 'skipped', reason: 'source_not_allowed' };
    }
    if (!hasPhone(booking)) return { outcome: 'skipped', reason: 'no_phone' };
    // The DATE gate is NOT re-applied wholesale — check_in is in the past by the
    // time a thank-you is due, which is the point of a thank-you. But a PRE-stay
    // message is a lie once the stay is entirely over: if the dates were amended
    // into the past (and the sweep never revokes a now-failing booking), the
    // welcome/pre-arrival must not fire. Post-stay kinds are exempt by design.
    if (
      PRE_STAY_KINDS.includes(row.kind) &&
      booking.checkOut !== null &&
      booking.checkOut < deps.gates.today
    ) {
      return { outcome: 'skipped', reason: 'stay_over' };
    }
  }

  const marketing = await marketingBlock(deps.db, row, row.kind);
  if (marketing !== null) return { outcome: 'skipped', reason: marketing };

  return null;
}
