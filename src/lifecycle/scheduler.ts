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
import { project, referenceBase, type DescribedStay } from '../brain/stayView.js';
import {
  atISTHour,
  formatDayDisplay,
  formatStayDates,
  isNightIST,
  istWallClockToInstant,
  nowIST,
  shiftDay,
} from '../lib/time.js';
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
  /** NIGHT_START/NIGHT_END — nothing lands on a guest's phone at 3 am. */
  quiet?: { nightStart: string; nightEnd: string };
  /** The hourly sweep re-examines every booking forever, so it must not raise a
   * fresh ops alert each time for the same unchanged problem. */
  fromSweep?: boolean;
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

/**
 * The bodies read "your {villaType} in {locality}". eZee's type string for the
 * Siolim house is literally "Nistula 4BHK Siolim", which rendered as "your
 * Nistula 4BHK Siolim in Siolim". A test asserted the locality was right and
 * nobody read the resulting sentence. Strip the trailing place from the type.
 */
function typeWithoutPlace(villaType: string, place: string): string {
  const trimmed = villaType.replace(new RegExp(`\\s*${place}\\s*$`, 'i'), '').trim();
  return trimmed.length > 0 ? trimmed : villaType;
}

/** Names that are not names. eZee/IBE rows carry placeholders, and "Walk, your
 * booking is confirmed" is worse than saying nothing. */
const NON_NAMES = new Set(['walk', 'guest', 'walkin', 'unknown', 'na', 'test']);

/**
 * The guest's first name from eZee's own guest name — the ONE attacker- and
 * OTA-controlled string that reaches a guest's screen on this path, where no
 * model and no guardrail stands behind it.
 *
 * Control chars stripped and length-capped per §6.3. ALL-CAPS is title-cased:
 * OTA and IBE rows routinely shout, and a voice guide that forbids even an
 * exclamation mark cannot open with "RAJESH,". A placeholder name (eZee's "Walk
 * in guest") yields null, and the booking is skipped rather than addressed to
 * nobody.
 */
function firstNameOf(row: BookingMirror): string | null {
  const raw = (row.guestName ?? '').replace(/[\p{C}]/gu, '').trim();
  const first = (raw.split(/\s+/)[0] ?? '').slice(0, 40);
  if (first.length === 0) return null;
  if (NON_NAMES.has(first.toLowerCase().replace(/[^a-z]/g, ''))) return null;
  const shouting = first === first.toUpperCase() && /[A-Z]/.test(first);
  return shouting ? first.charAt(0) + first.slice(1).toLowerCase() : first;
}

/**
 * Nothing may land on a guest's phone in the small hours. The §2.3 send times
 * (09:00–11:00 IST) were chosen with that in mind, but `atOrNow` collapses an
 * already-past plan to "now" — so a booking made at 23:30 for a stay two days
 * out would have fired its pre-arrival at 23:30.
 *
 * A CONFIRMATION is exempt: the guest just pressed Book and is waiting for it.
 * Everything else waits for the morning.
 */
function outOfQuietHours(instant: Date, nightStart: string, nightEnd: string): Date {
  if (!isNightIST(instant, nightStart, nightEnd)) return instant;
  const morning = atISTHour(instant, nightEnd);
  return morning.getTime() > instant.getTime()
    ? morning
    : atISTHour(new Date(instant.getTime() + 24 * 3600_000), nightEnd);
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
  quiet: { nightStart: string; nightEnd: string } = { nightStart: '20:00', nightEnd: '10:00' },
): { sends: PlannedSend[]; issue: string | null } {
  // stayView would only ever set isUnit when TRUST_EZEE_ROOM_ASSIGNMENT flips to
  // true. If that day comes, `villa` becomes a HOUSE ("Villa B3") — and a
  // lifecycle body must still never name one until eZee is re-modelled. Refuse
  // rather than inherit the flip silently.
  if (stay.isUnit) return { sends: [], issue: 'unit_label_refused' };

  const villaType = stay.villa;
  if (villaType === null) return { sends: [], issue: 'unknown_villa_type' };
  const place = locality(villaType);
  const firstName = firstNameOf(row);
  if (firstName === null) return { sends: [], issue: 'no_guest_name' };
  if (place === null) return { sends: [], issue: 'unknown_villa_type' };

  const base = referenceBase(row.ezeeReservationNo);
  const typeName = typeWithoutPlace(villaType, place);
  const dates = formatStayDates(stay.checkIn, stay.checkOut);
  // A planned instant in the past means "the moment has already come" — send now,
  // but never in the middle of the night.
  const atOrNow = (day: string, hhmm: string): Date => {
    const planned = istWallClockToInstant(`${day}T${hhmm}`);
    if (planned.getTime() >= now.getTime()) return planned;
    return outOfQuietHours(now, quiet.nightStart, quiet.nightEnd);
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
        villaType: typeName,
        locality: place,
        dates,
        reference: base,
      }),
      plan('prearrival', atOrNow(shiftDay(stay.checkIn, -3), '10:00'), {
        firstName,
        checkInDay: formatDayDisplay(stay.checkIn),
      }),
      plan('welcome', atOrNow(stay.checkIn, '09:00'), { firstName, villaType: typeName }),
      plan('poststay', atOrNow(shiftDay(stay.checkOut, 1), '11:00'), { firstName }),
      plan('winback', atOrNow(shiftDay(stay.checkOut, 75), '11:00'), {
        firstName,
        villaType: typeName,
        locality: place,
      }),
    ],
  };
}

/** Every row of a multi-room booking, which eZee delivers as `877-1`, `877-2`…
 * sharing one reference base. stayView needs them to spot the collision. */
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

/** Withdraw a booking's un-sent messages. Used when a gate that once passed now
 * fails, and by cancelForBooking. Never touches what has already gone. */
async function revokePending(
  deps: SchedulerDeps,
  reservationNo: string,
  reason: string,
): Promise<number> {
  const base = referenceBase(reservationNo);
  const keys = (Object.keys(LIFECYCLE_TEMPLATES) as ScheduledKind[]).map((k) => `${k}:${base}`);
  const revoked = await deps.db
    .update(scheduledMessages)
    .set({ status: 'cancelled', skipReason: reason.slice(0, 100) })
    .where(
      and(
        inArray(scheduledMessages.dedupeKey, keys),
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

  const gate = checkGates(row, deps.gates);
  if (!gate.ok) {
    // A GATE THAT STARTS FAILING MUST REVOKE WHAT IT ALREADY ALLOWED.
    // The gates are re-evaluated on every booking.modified, and eZee really does
    // change these fields (`source` and `guest_phone` are both in
    // MIRROR_DIFF_FIELDS). A booking mirrored as 'Internet Booking Engine' and
    // later re-sourced to 'Airbnb' would otherwise keep the five rows it was
    // granted while it still qualified — and send them. Skipping the new schedule
    // was never enough; the old schedule has to die.
    const revoked = await revokePending(deps, row.ezeeReservationNo, `gate:${gate.reason}`);
    logSkip(deps, row, gate.reason, revoked);
    return { scheduled: 0, skipped: gate.reason };
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
    logSkip(deps, row, `undescribable:${stay.reason}`);
    // WHY only from the event path: the hourly sweep re-examines the same rows
    // forever, so alerting here would page ops every hour for one bad booking.
    if (!deps.fromSweep) {
      void alertOps(deps.log, {
        kind: 'lifecycle_undescribable',
        summary: 'Booking passed the gates but cannot be safely described — no lifecycle',
        detail: { reservationNo: row.ezeeReservationNo, reason: stay.reason },
      });
    }
    return { scheduled: 0, skipped: `undescribable:${stay.reason}` };
  }

  const { sends, issue } = planSends(row, stay, nowIST(), deps.quiet);
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
