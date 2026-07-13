/**
 * The stay VIEW (CH-11) — the ONLY door from a `bookings_mirror` row to words.
 *
 * A faithful copy of eZee is not a sentence you can say to a paying guest, so
 * nothing may read a mirror row straight into the prompt, a tool result or a
 * staff card. Block [5], get_booking, the admin route — and later CH-12/13/16 —
 * all project through here, and this module decides what may be SAID.
 *
 * WHY a narrow allowlist rather than a "skip the bad ones" filter: three times
 * already this repo has shipped an enumerated rule quietly narrower than its
 * own contract (CH-06's flat price whitelist, CH-09's entitlement screen,
 * CH-10's resurrection denylist). The standing rule from that third finding —
 * enumerate what is ALLOWED, never what is forbidden — is why `describable`
 * fails closed on every row it does not positively recognise.
 *
 * What this module NEVER emits, by construction:
 * - the amount. On a multi-room reservation the mirror's typed columns carry
 *   the FIRST tran only (normalize.ts) — the figure is one room's, and for OTA
 *   bookings possibly what the channel pays us rather than what the guest paid.
 *   Summing it ourselves is banned outright (§3.4 money rule). Booking-money
 *   questions go to a human.
 * - the eZee/OTA guest name and email. Indian mobile numbers get recycled and
 *   shared; a stranger's name in the prompt is the §6.5 #7 leak CH-11 exists to
 *   prevent.
 * - the meal plan. The mirror stores an opaque RateplanCode and nothing in this
 *   repo maps it to EP/CP (OQ-16). eZee's own label ("European Plan") is not
 *   safe to pass through either: the model would helpfully translate it into
 *   "breakfast is included", and NO guardrail checks an inclusion claim.
 * - a unit label unless `physical_room_label` is set (§5.4: bookings are held
 *   at TYPE level and eZee assigns the unit, so we say "your Nistula Villa",
 *   never "Villa B3", until the mirror actually holds a unit).
 */
import type { BookingMirror } from '../db/bookings.js';
import { toArray, type EzeeBookingTran } from '../ezee/types.js';

/**
 * Statuses a stay may be DESCRIBED in. `modified` is an event verb stored as a
 * state (schema.ts) and is live; `checked_out` is describable because a past
 * guest is the whole point of the win-back path (§2.4 scenario 6).
 *
 * Deliberately absent, and each for its own reason:
 * - `cancelled`  — 40 of production's 62 rows. Describing one puts a family on
 *                  a plane to a villa that is not theirs.
 * - `no_show`    — not a stay that happened.
 * - `unknown`    — what an UNCONFIRMED HOLD maps to (normalize.ts: New/Modify
 *                  with IsConfirmed != 1). Speaking of it as a booking is the
 *                  exact lie CH-10's confirmation gate was hardened to prevent.
 */
export const DESCRIBABLE_STATUSES = [
  'confirmed',
  'modified',
  'checked_in',
  'checked_out',
] as const;

/** Statuses that count as a LIVE booking — one the guest still has ahead of or
 * around them. `checked_out` is describable but no longer live. */
export const LIVE_STATUSES = ['confirmed', 'modified', 'checked_in'] as const;

export type Stage = 'lead' | 'prearrival' | 'inhouse' | 'postguest';

/** Why a row could not be described — ops/telemetry only, never guest-facing. */
export type UndescribableReason =
  | 'status_not_describable'
  | 'missing_dates'
  | 'multi_room'
  | 'sibling_rows';

export interface DescribedStay {
  describable: true;
  bookingId: string;
  reservationNo: string;
  /** What we may CALL the villa: the unit label only when eZee has assigned one
   * (§5.4), else the room-type name as eZee worded it. Null when neither. */
  villa: string | null;
  /** True only when `villa` is a real assigned unit — block [4]'s unit rule. */
  isUnit: boolean;
  checkIn: string;
  checkOut: string;
  adults: number | null;
  children: number | null;
  status: (typeof DESCRIBABLE_STATUSES)[number];
  live: boolean;
}

export interface UndescribableStay {
  describable: false;
  bookingId: string;
  reservationNo: string;
  reason: UndescribableReason;
  /** Whether this row is recent enough to matter — an ancient cancellation is
   * simply not a stay, but a cancelled booking for next week needs a human. */
  live: boolean;
}

export type StayView = DescribedStay | UndescribableStay;

/** Rooms on this reservation. The typed columns carry the FIRST tran only, so a
 * count > 1 means the row is a partial truth and must never be described. */
export function roomCount(row: Pick<BookingMirror, 'raw'>): number {
  const raw = row.raw;
  if (raw === null || typeof raw !== 'object') return 1;
  const trans = toArray((raw as { BookingTran?: EzeeBookingTran | EzeeBookingTran[] }).BookingTran);
  return trans.length === 0 ? 1 : trans.length;
}

/** The base a suffixed cancel/room id hangs off ("877-2" → "877"). Siblings of
 * one reservation share it — see `project`'s sibling guard. */
export function referenceBase(reservationNo: string): string {
  return reservationNo.replace(/-\d+$/, '');
}

function isDescribableStatus(
  status: BookingMirror['status'],
): status is (typeof DESCRIBABLE_STATUSES)[number] {
  return (DESCRIBABLE_STATUSES as readonly string[]).includes(status);
}

function isLiveStatus(status: BookingMirror['status']): boolean {
  return (LIVE_STATUSES as readonly string[]).includes(status);
}

/**
 * Projects ONE row, given every row linked to the same guest (needed for the
 * sibling check: a multi-room booking may also arrive as several rows whose
 * reference numbers share a base, and each of those looks complete on its own).
 */
export function project(row: BookingMirror, siblings: readonly BookingMirror[]): StayView {
  const live = isLiveStatus(row.status);
  const base = { bookingId: row.id, reservationNo: row.ezeeReservationNo, live };

  if (!isDescribableStatus(row.status)) {
    return { describable: false, ...base, reason: 'status_not_describable' };
  }
  if (row.checkIn === null || row.checkOut === null) {
    return { describable: false, ...base, reason: 'missing_dates' };
  }
  if (roomCount(row) > 1) {
    return { describable: false, ...base, reason: 'multi_room' };
  }
  const myBase = referenceBase(row.ezeeReservationNo);
  const hasSibling = siblings.some(
    (other) => other.id !== row.id && referenceBase(other.ezeeReservationNo) === myBase,
  );
  if (hasSibling) {
    return { describable: false, ...base, reason: 'sibling_rows' };
  }

  return {
    describable: true,
    ...base,
    // §5.4: a named unit ONLY when eZee has actually assigned one.
    villa: row.physicalRoomLabel ?? row.roomTypeName,
    isUnit: row.physicalRoomLabel !== null,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    adults: row.adults,
    children: row.children,
    status: row.status,
  };
}

/** Projects a guest's whole set of linked rows. */
export function projectAll(rows: readonly BookingMirror[]): StayView[] {
  return rows.map((row) => project(row, rows));
}

/**
 * The guest's stage — derived from DATES, never from status.
 *
 * WHY: no production row is ever marked `checked_in`. A front-desk check-in
 * does not come down the connectivity queue (CH-10: 22 confirmed rows, zero
 * checked_in), so keying "in-house" on the status would mean NO guest is ever
 * in-house — the chunk would pass every test and silently fail in production.
 *
 * `today` is the IST calendar day of the DB clock (istCalendarDay(dbNow)) — the
 * same clock block [6] prints, so the stage can never contradict the date the
 * model is reading. Dates are zero-padded YYYY-MM-DD, so a lexicographic
 * compare IS a chronological one: no Date parsing, no timezone risk.
 *
 * Check-out day still counts as in-house: they are in the villa until they go.
 */
export function deriveStage(views: readonly StayView[], today: string): Stage {
  const describable = views.filter((v): v is DescribedStay => v.describable);
  const live = describable.filter((v) => v.live);

  if (live.some((v) => v.checkIn <= today && today <= v.checkOut)) return 'inhouse';
  if (live.some((v) => v.checkIn > today)) return 'prearrival';
  // A departed guest: any describable stay whose check-out is behind us.
  if (describable.some((v) => v.checkOut < today)) return 'postguest';
  return 'lead';
}

/**
 * Does this guest hold a booking a human must look at? Kept SEPARATE from the
 * stage on purpose: CH-16 hard-wires the four stage words to its AUTO_SEND_TYPES
 * (plan.md §8 CH-16), so a cancelled-next-week or multi-room guest must never be
 * folded into `lead` — that would auto-send pre-sales copy to someone with a
 * booking problem.
 *
 * An ancient cancellation is NOT a problem — that guest genuinely is a lead.
 * Only an undescribable row that is still LIVE, or whose dates we cannot even
 * see, needs a person.
 */
export function needsHuman(views: readonly StayView[]): boolean {
  return views.some((v) => !v.describable && v.live);
}

/** Live stays, for the guardrail gate and block [5]. */
export function liveStays(views: readonly StayView[]): DescribedStay[] {
  return views.filter((v): v is DescribedStay => v.describable && v.live);
}

/**
 * The stays worth putting in front of the model, most relevant first (§6.4's
 * own precedence: active ≥ upcoming ≥ recent past). Capped so block [5]'s token
 * budget stays bounded by construction.
 */
export const STAYS_RENDER_LIMIT = 3;

export function selectStays(views: readonly StayView[], today: string): DescribedStay[] {
  const describable = views.filter((v): v is DescribedStay => v.describable);
  const active = describable.filter((v) => v.live && v.checkIn <= today && today <= v.checkOut);
  const upcoming = describable
    .filter((v) => v.live && v.checkIn > today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = describable
    .filter((v) => v.checkOut < today)
    .sort((a, b) => b.checkOut.localeCompare(a.checkOut));
  return [...active, ...upcoming, ...past].slice(0, STAYS_RENDER_LIMIT);
}
