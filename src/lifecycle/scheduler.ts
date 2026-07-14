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
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { BookingMirror } from '../db/bookings.js';
import { getMirrorByReservationNo } from '../db/bookings.js';
import type { Db, DbLike } from '../db/client.js';
import { getOrCreateConversation, upsertGuestFromBooking } from '../db/repos.js';
import { scheduledMessages } from '../db/schema.js';
import { project, referenceBase, type DescribedStay } from '../brain/stayView.js';
import { formatDayDisplay, formatStayDates, istWallClockToInstant, shiftDay } from '../lib/time.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import { checkGates, type GateContext, type SkipReason } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

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
}

export interface PlannedSend {
  kind: ScheduledKind;
  sendAt: Date;
  dedupeKey: string;
  templateName: string;
  params: Record<string, string>;
}

/** Locality is documented in kb/villas.md: the apartments and villas are in
 * Assagao, the 4BHK is in Siolim. Unknown type ⇒ null, and the caller omits the
 * booking rather than inventing a place. */
function locality(villaType: string): string | null {
  if (/siolim/i.test(villaType)) return 'Siolim';
  if (/nistula\s+(apartment|villa)/i.test(villaType)) return 'Assagao';
  return null;
}

/** The guest's first name, from eZee's own guest name. Length-capped and
 * control-char-stripped like every other externally-sourced name (§6.3). */
function firstNameOf(row: BookingMirror): string | null {
  const raw = (row.guestName ?? '').replace(/[\p{C}]/gu, '').trim();
  const first = raw.split(/\s+/)[0] ?? '';
  return first.length > 0 ? first.slice(0, 40) : null;
}

/**
 * The §2.3 timing matrix, as a pure function of (booking, now) — no DB, no
 * clock, no I/O, so the whole matrix is table-testable.
 *
 * confirmation  now
 * prearrival    check-in −3d, 10:00 IST   (already inside 3 days ⇒ send now)
 * welcome       check-in day, 09:00 IST   (already past ⇒ send now)
 * poststay      check-out +1d, 11:00 IST
 * winback       check-out +75d, 11:00 IST (opt-in is checked at SEND time)
 *
 * WHY a past send_at becomes "now" rather than being dropped: a guest who books
 * two days before arrival must still get a pre-arrival, and one who books on the
 * morning of check-in must still be welcomed. Dropping them would silently
 * punish the most valuable bookings — the last-minute ones.
 */
export function planSends(
  row: BookingMirror,
  stay: DescribedStay,
  now: Date,
): { sends: PlannedSend[]; issue: string | null } {
  const place = locality(stay.villa ?? '');
  const firstName = firstNameOf(row);
  if (firstName === null) return { sends: [], issue: 'no_guest_name' };
  if (place === null) return { sends: [], issue: 'unknown_villa_type' };

  const base = referenceBase(row.ezeeReservationNo);
  const villaType = stay.villa as string;
  const dates = formatStayDates(stay.checkIn, stay.checkOut);
  // A planned instant in the past means "the moment has already come" — send now.
  const atOrNow = (day: string, hhmm: string): Date => {
    const planned = istWallClockToInstant(`${day}T${hhmm}`);
    return planned.getTime() < now.getTime() ? now : planned;
  };

  const plan = (
    kind: ScheduledKind,
    sendAt: Date,
    params: Record<string, string>,
  ): PlannedSend => ({
    kind,
    sendAt,
    dedupeKey: `${kind}:${base}`,
    templateName: LIFECYCLE_TEMPLATES[kind].name,
    params,
  });

  return {
    issue: null,
    sends: [
      plan('confirmation', now, {
        firstName,
        villaType,
        locality: place,
        dates,
        reference: base,
      }),
      plan('prearrival', atOrNow(shiftDay(stay.checkIn, -3), '10:00'), {
        firstName,
        checkInDay: formatDayDisplay(stay.checkIn),
      }),
      plan('welcome', atOrNow(stay.checkIn, '09:00'), { firstName, villaType }),
      plan('poststay', atOrNow(shiftDay(stay.checkOut, 1), '11:00'), { firstName }),
      plan('winback', atOrNow(shiftDay(stay.checkOut, 75), '11:00'), {
        firstName,
        villaType,
        locality: place,
      }),
    ],
  };
}

/** Skips are LOGGED, never silent — a booking that got no lifecycle must always
 * be explainable to a human afterwards. */
function logSkip(deps: SchedulerDeps, row: BookingMirror, reason: SkipReason | string): void {
  deps.log.info(
    { reservationNo: row.ezeeReservationNo, reason, source: row.source, status: row.status },
    '[lifecycle] booking skipped',
  );
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

  const gate = checkGates(row, deps.gates);
  if (!gate.ok) {
    logSkip(deps, row, gate.reason);
    return { scheduled: 0, skipped: gate.reason };
  }

  // stayView is the only door from a booking row to words (CH-11). If it will
  // not describe the booking — multi-room, sibling rows, missing dates — then we
  // have nothing safe to SAY, so we say nothing and let a human handle it.
  const stay = project(row, [row], deps.gates.today);
  if (!stay.describable) {
    logSkip(deps, row, `undescribable:${stay.reason}`);
    void alertOps(deps.log, {
      kind: 'lifecycle_undescribable',
      summary: 'Booking passed the gates but cannot be safely described — no lifecycle',
      detail: { reservationNo: row.ezeeReservationNo, reason: stay.reason },
    });
    return { scheduled: 0, skipped: `undescribable:${stay.reason}` };
  }

  const { sends, issue } = planSends(row, stay, new Date());
  if (issue !== null) {
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
      .onConflictDoUpdate({
        target: scheduledMessages.dedupeKey,
        set: { sendAt: s.sendAt, params: s.params, templateName: s.templateName },
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
  const base = referenceBase(reservationNo);
  const keys = (Object.keys(LIFECYCLE_TEMPLATES) as ScheduledKind[]).map((k) => `${k}:${base}`);

  const cancelled = await deps.db
    .update(scheduledMessages)
    .set({ status: 'cancelled', skipReason: 'booking_cancelled' })
    .where(
      and(
        inArray(scheduledMessages.dedupeKey, keys),
        eq(scheduledMessages.status, 'pending'), // never un-send what already went
      ),
    )
    .returning({ id: scheduledMessages.id });

  if (cancelled.length > 0) {
    deps.log.info(
      { reservationNo, base, cancelled: cancelled.length },
      '[lifecycle] pending sends cancelled',
    );
  }
  return { cancelled: cancelled.length };
}

/** Rows the sender should attempt now. DB clock (`now()`), matching how pg-boss
 * judges its own eligibility — two clocks would drift. */
export async function dueRows(db: DbLike, limit = 25) {
  return db
    .select()
    .from(scheduledMessages)
    .where(and(eq(scheduledMessages.status, 'pending'), sql`${scheduledMessages.sendAt} <= now()`))
    .orderBy(scheduledMessages.sendAt)
    .limit(limit);
}
