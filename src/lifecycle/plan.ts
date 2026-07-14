/**
 * What a lifecycle message SAYS, and WHEN — the pure half of the scheduler
 * (CH-12; split out of scheduler.ts for the ~300-line rule).
 *
 * Everything here is a pure function of (booking, now): no DB, no clock, no I/O.
 * That is deliberate — the §2.3 timing matrix and every word that reaches a
 * guest's screen can then be proven exhaustively in a table test, with no
 * fixtures and no fake timers.
 *
 * These bodies bypass the model AND the §6.5 guardrail pipeline (the guardrails
 * vet what Claude drafts, not what code hard-codes), so the constraints they
 * would have enforced have to live here: the villa TYPE and never a house
 * (OQ-19), no ₹ figure, no fact the KB does not carry.
 */
import type { BookingMirror } from '../db/bookings.js';
import { referenceBase, type DescribedStay } from '../brain/stayView.js';
import {
  atISTHour,
  formatDayDisplay,
  formatStayDates,
  isNightIST,
  istWallClockToInstant,
  shiftDay,
} from '../lib/time.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

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
export function firstNameOf(row: BookingMirror): string | null {
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
