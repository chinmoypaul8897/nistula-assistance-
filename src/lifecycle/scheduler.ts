/**
 * The lifecycle scheduler (CH-12, plan §8 step 3 + §2.3 timings).
 *
 * Consumes booking.* events — but reads the MIRROR, never the event: the payload
 * is `{reservationNo}` and nothing else, deliberately (CH-10), so there is
 * exactly one source of truth and a stale event cannot carry stale facts.
 *
 * The events are only WAKE-UPS. `bookings_mirror` is the truth (§3.4), which is
 * why the hourly sweep can re-derive everything from it and why a booking that
 * changed between the event and the send is still handled correctly.
 */
import { and, eq, inArray, like, or } from 'drizzle-orm';
import type { BookingMirror } from '../db/bookings.js';
import { getMirrorByReservationNo } from '../db/bookings.js';
import type { Db } from '../db/client.js';
import { getOrCreateConversation, upsertGuestFromBooking } from '../db/repos.js';
import { bookingsMirror, scheduledMessages } from '../db/schema.js';
import { project, referenceBase } from '../brain/stayView.js';
import { nowIST } from '../lib/time.js';
import { firstNameOf, planSends } from './plan.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import {
  bookingState,
  checkGates,
  revocationReason,
  type GateContext,
  type SkipReason,
} from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

export { planSends, type PlannedSend } from './plan.js';

export const LIFECYCLE = {
  /** Due scheduled rows go out every minute (§2.3 "template sender"). */
  senderCron: '* * * * *',
  /** The atomicity net (§3.4): re-derive from the mirror hourly. */
  reconcileCron: '0 * * * *',
} as const;

export interface SchedulerLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface SchedulerDeps {
  db: Db;
  log: SchedulerLogger;
  gates: GateContext;
  /** NIGHT_START/NIGHT_END — nothing lands on a guest's phone at 3 am. */
  quiet?: { nightStart: string; nightEnd: string };
  /** The hourly sweep re-examines every booking forever, so it must not raise a
   * fresh ops alert each time for the same unchanged problem. */
  fromSweep?: boolean;
}

async function siblingRows(db: Db, row: BookingMirror): Promise<BookingMirror[]> {
  const base = referenceBase(row.ezeeReservationNo);
  return db
    .select()
    .from(bookingsMirror)
    .where(
      or(
        eq(bookingsMirror.ezeeReservationNo, base),
        like(bookingsMirror.ezeeReservationNo, `${base}-%`),
      ),
    );
}

/** Dedupe keys for every kind of one booking (keyed on the reference BASE, so
 * eZee's suffixed multi-room entries collapse to one booking). */
function dedupeKeysFor(reservationNo: string): string[] {
  const base = referenceBase(reservationNo);
  return (Object.keys(LIFECYCLE_TEMPLATES) as ScheduledKind[]).map((k) => `${k}:${base}`);
}

/** Does this booking already HAVE a lifecycle? If so it is maintained even when
 * the create-gates would not start it fresh (a lived stay still needs its guest
 * re-bound and its remaining rows kept true). */
async function hasSchedule(db: Db, reservationNo: string): Promise<boolean> {
  const rows = await db
    .select({ id: scheduledMessages.id })
    .from(scheduledMessages)
    .where(inArray(scheduledMessages.dedupeKey, dedupeKeysFor(reservationNo)))
    .limit(1);
  return rows.length > 0;
}

/** Withdraw a booking's un-sent messages. Used when the contract says the
 * booking stopped being messageable, and by cancelForBooking. Never touches
 * what has already gone. */
async function revokePending(
  deps: SchedulerDeps,
  reservationNo: string,
  reason: string,
): Promise<number> {
  const revoked = await deps.db
    .update(scheduledMessages)
    .set({ status: 'cancelled', skipReason: reason.slice(0, 100) })
    .where(
      and(
        inArray(scheduledMessages.dedupeKey, dedupeKeysFor(reservationNo)),
        eq(scheduledMessages.status, 'pending'), // never un-send what already went
      ),
    )
    .returning({ id: scheduledMessages.id });
  return revoked.length;
}

/** Skips are LOGGED, never silent — a booking that got no lifecycle must always
 * be explainable to a human afterwards. */
function logSkip(
  deps: SchedulerDeps,
  row: BookingMirror,
  reason: SkipReason | string,
  revoked = 0,
): void {
  deps.log.info(
    { reservationNo: row.ezeeReservationNo, reason, source: row.source, status: row.status, revoked },
    '[lifecycle] booking skipped',
  );
  if (revoked > 0) {
    // A booking that HAD a schedule and lost it is a different animal from one
    // that never qualified — a human should know we withdrew messages.
    void alertOps(deps.log, {
      kind: 'lifecycle_revoked',
      summary: 'A booking stopped qualifying — pending lifecycle messages withdrawn',
      detail: { reservationNo: row.ezeeReservationNo, reason, revoked },
    });
  }
  if (reason === 'no_phone') {
    // Not a failure — OTA channels legitimately mask numbers. But a real booking
    // we cannot reach is a human's problem, so it surfaces.
    // TODO(CH-14b): carry these into the morning digest.
    void alertOps(deps.log, {
      kind: 'lifecycle_no_phone',
      summary: 'Booking has no reachable phone — no lifecycle messages scheduled',
      detail: { reservationNo: row.ezeeReservationNo, source: row.source },
    });
  }
}

/**
 * Schedule (or re-schedule) a booking's lifecycle. Idempotent: the ONE entry
 * point used by the booking.created/modified workers AND by the hourly sweep.
 */
export async function scheduleForBooking(
  deps: SchedulerDeps,
  reservationNo: string,
): Promise<{ scheduled: number; skipped: SkipReason | string | null }> {
  const row = await getMirrorByReservationNo(deps.db, reservationNo);
  if (row === null) {
    deps.log.warn({ reservationNo }, '[lifecycle] no mirror row — nothing to schedule');
    return { scheduled: 0, skipped: 'no_mirror_row' };
  }

  // ── 1. WITHDRAW? — the CONTRACT, decided before and independently of the
  // create-gates. Only a booking that stopped being messageable at all loses
  // what it was granted: cancelled, no-show, re-sourced to an unsanctioned
  // channel, or stripped of its phone. Advancing (checked_in/checked_out),
  // ageing past its check-in, or flapping to `unknown` NEVER revokes — that is
  // the ordinary life of a real stay, and the remaining lifecycle must survive.
  const revoke = revocationReason(row, deps.gates);
  if (revoke !== null) {
    const revoked = await revokePending(deps, row.ezeeReservationNo, revoke);
    logSkip(deps, row, revoke, revoked);
    return { scheduled: 0, skipped: revoke };
  }

  // ── 2. The gates decide whether to START a lifecycle — NOT whether to keep
  // maintaining one that already exists.
  //
  // 🚨 The subtlety that cost a whole review round: a gate failure used to
  // RETURN here, which froze an existing schedule. Once eZee marks a real
  // arrival `checked_in`, every later booking.modified failed the status gate
  // and returned BEFORE the guest re-binding below — so a phone corrected by
  // the front desk left the thank-you and win-back pointed at the old (wrong)
  // number for 75+ days, with the hourly sweep unable to heal it (it filters
  // confirmed|modified). The same freeze stranded a changed check-out date and
  // skipped the undescribable check.
  //
  // So: refuse only when there is nothing to maintain. A booking that already
  // HAS rows is still maintained — re-bound, re-planned, re-checked — even
  // though we would not start it fresh today.
  const gate = checkGates(row, deps.gates);
  if (!gate.ok) {
    const existing = await hasSchedule(deps.db, row.ezeeReservationNo);
    if (!existing) {
      logSkip(deps, row, gate.reason);
      return { scheduled: 0, skipped: gate.reason };
    }
    deps.log.info(
      { reservationNo: row.ezeeReservationNo, gate: gate.reason },
      '[lifecycle] not schedulable fresh, but an existing schedule is maintained',
    );
  }

  // stayView is the only door from a booking row to words (CH-11). If it will
  // not describe the booking — multi-room, sibling rows, missing dates — then we
  // have nothing safe to SAY, so we say nothing and let a human handle it.
  //
  // The siblings are the REAL siblings: eZee delivers a multi-room booking as
  // several rows sharing a reference base, each of which looks complete alone.
  // Passing [row] made stayView's sibling check structurally dead (it compares
  // ids), so two live rows could collide on one dedupe_key.
  const siblings = await siblingRows(deps.db, row);
  const stay = project(row, siblings, deps.gates.today);
  if (!stay.describable) {
    // A booking that WAS describable and now is not — the classic case is a
    // multi-room booking whose first sibling (877-1) was scheduled, and whose
    // confirmation went out, before the second sibling (877-2) arrived and made
    // it multi_room — must have its pending rows WITHDRAWN, not merely skipped:
    // the stored params now describe a single room for a multi-room stay.
    //
    // BUT NOT ON A TRANSIENT STATE. An `unknown` (an unconfirmed hold flapping
    // between polls) is also undescribable, and will very likely resolve on the
    // next poll — revoking it would destroy a real guest's lifecycle for a
    // momentary eZee wobble. Guard by the contract here too.
    const transient = bookingState(row) === 'transient';
    const revoked = transient
      ? 0
      : await revokePending(deps, row.ezeeReservationNo, `undescribable:${stay.reason}`);
    logSkip(deps, row, `undescribable:${stay.reason}`, revoked);
    // WHY the alert only from the event path: the hourly sweep re-examines the
    // same rows forever, so alerting here would page ops every hour for one bad
    // booking.
    if (!deps.fromSweep) {
      void alertOps(deps.log, {
        kind: 'lifecycle_undescribable',
        summary: 'Booking passed the gates but cannot be safely described — no lifecycle',
        detail: { reservationNo: row.ezeeReservationNo, reason: stay.reason, revoked },
      });
    }
    return { scheduled: 0, skipped: `undescribable:${stay.reason}` };
  }

  const { sends, issue } = planSends(row, stay, nowIST(), deps.quiet);
  if (issue !== null) {
    // Deliberately does NOT revoke — and that is the contract, not an oversight.
    // A planSends issue means "I cannot compute a FRESH plan" (eZee renamed the
    // room type to something unmappable). The rows already scheduled carry
    // params that are still perfectly valid, so destroying them because a future
    // plan cannot be computed would lose a good message for a PMS rename. The
    // "make every branch look alike" symmetry argument is exactly the enum-shaped
    // thinking that caused the eighth bug; revoke by the contract only.
    logSkip(deps, row, issue);
    return { scheduled: 0, skipped: issue };
  }

  // The scheduler CREATES the guest from mirror data — this is the explicit
  // supersession of CH-10's no-auto-creation rule (plan CH-12 step 3). A guest
  // who booked on the website has never messaged us, so nothing else would.
  const phone = row.guestPhone as string;
  const guest = await upsertGuestFromBooking(deps.db, {
    phone,
    firstName: firstNameOf(row),
    lastName: null,
  });
  // Give them a conversation now, so their reply to the confirmation threads into
  // the normal pipeline instead of arriving as an orphan (plan step 5).
  await getOrCreateConversation(deps.db, guest.id);

  for (const s of sends) {
    await deps.db
      .insert(scheduledMessages)
      .values({
        guestId: guest.id,
        bookingId: row.id,
        kind: s.kind,
        templateName: s.templateName,
        params: s.params,
        sendAt: s.sendAt,
        dedupeKey: s.dedupeKey,
      })
      // A modify RESCHEDULES a still-pending row; it never duplicates it, and it
      // never resurrects one already sent, skipped or cancelled. That WHERE is
      // the whole idempotency contract (plan CH-12 tests: "dates change →
      // prearrival RESCHEDULED not duplicated").
      //
      // 🚨 guestId AND bookingId ARE IN THE SET, and they must be. The sender
      // resolves the recipient from the scheduled row's guest_id, not from the
      // mirror. Omitting them meant a corrected phone number (the front desk
      // fixing a typo in eZee — guest_phone is in MIRROR_DIFF_FIELDS, so it
      // really happens) left the rows pinned to the FIRST guest row: the
      // booking's name, villa, dates and reference would go to a number that is
      // no longer on the booking, and the real guest would get nothing, silently,
      // for ever, because the dedupe key was already taken.
      .onConflictDoUpdate({
        target: scheduledMessages.dedupeKey,
        set: {
          guestId: guest.id,
          bookingId: row.id,
          sendAt: s.sendAt,
          params: s.params,
          templateName: s.templateName,
        },
        where: eq(scheduledMessages.status, 'pending'),
      });
  }

  deps.log.info(
    { reservationNo: row.ezeeReservationNo, guestId: guest.id, scheduled: sends.length },
    '[lifecycle] scheduled',
  );
  return { scheduled: sends.length, skipped: null };
}

/**
 * A cancelled booking loses every send it has not made yet.
 *
 * Keyed on the reference BASE, so a multi-room cancel arriving as 877-1/-2/-3
 * (eZee's real, undocumented shape) clears the same rows the bare 877 would.
 */
export async function cancelForBooking(
  deps: SchedulerDeps,
  reservationNo: string,
): Promise<{ cancelled: number }> {
  const cancelled = await revokePending(deps, reservationNo, 'booking_cancelled');
  if (cancelled > 0) {
    deps.log.info({ reservationNo, cancelled }, '[lifecycle] pending sends cancelled');
  }
  return { cancelled };
}

export type BookingEventKind = 'created' | 'modified' | 'cancelled';

/**
 * The single mapping from a booking.* event to its action — the ONE place a
 * cancel is distinguished from a create/modify. registerJobs' worker loop and
 * the wiring test both go through here, so a mis-wired cancel (the review's
 * "a cancel that schedules" hazard) cannot pass green while diverging in prod.
 */
export function handleBookingEvent(
  deps: SchedulerDeps,
  kind: BookingEventKind,
  reservationNo: string,
): Promise<unknown> {
  return kind === 'cancelled'
    ? cancelForBooking(deps, reservationNo)
    : scheduleForBooking(deps, reservationNo);
}
