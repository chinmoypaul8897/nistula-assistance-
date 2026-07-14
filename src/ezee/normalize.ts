/**
 * Pure eZee reservation → mirror-row normalisation (plan.md §5.2, CH-10
 * step 3). NEVER throws on shape — a weird payload degrades to nulls +
 * status 'unknown' with the anomaly named in `issues`; the poller logs, the
 * row still mirrors with raw intact (§5.2 "never crash").
 *
 * OBSERVED FIELD NAMES — RECONCILED AGAINST THE LIVE PAYLOAD (§5.2 mandate,
 * captured 2026-07-13 from the property's real backlog; also in progress.md):
 *
 *   Reservation : UniqueID · LocationId · BookedBy · Salutation · FirstName ·
 *                 LastName · Gender · Address · City · State · Country ·
 *                 Zipcode · Phone · Mobile · Fax · Email · Source ·
 *                 PaymentMethod · IsChannelBooking
 *   BookingTran : the documented set, PLUS three fields the docs omit —
 *                 FolioNo · ExtraCharge · PaymentDetail (they ride into `raw`)
 *   RentalInfo  : EffectiveDate · Adult · Child · Rent · RentPreTax ·
 *                 Discount · PackageCode/Name · RoomTypeCode/Name
 *   CancelReservation : UniqueID · Status · Canceldatetime · Remark · VoucherNo
 *
 * Two live findings that are LOAD-BEARING here:
 *  1. `CurrentStatus: "Confirmed Reservation"` is what EVERY real booking
 *     carries, and it is NOT in eZee's documented value list (docs name only
 *     Arrived / Checked Out / Cancel / Void). mapStatus therefore MUST fall
 *     through an unrecognised CurrentStatus to the Status verb — treating an
 *     unknown CurrentStatus as 'unknown' would hide every real booking from
 *     CH-11/CH-12. Do not "tighten" that fall-through.
 *  2. BKG-02 poll payloads carry NO `RoomID`/`RoomName` — confirmed on all 22
 *     live reservations — so `physical_room_label` is ALWAYS null from the
 *     poller. BKG-03 FetchSingleBooking DOES return them (e.g. RoomID
 *     5220300000000000008 / RoomName "06"). The parsing below stays tolerant
 *     of both. CH-11 built the enrichment: `pnpm ezee:reconcile --apply` hydrates
 *     the label via BKG-03 through the event-free backfill writer, and the poller
 *     diff now COALESCEs a null-from-poll so a later poll cannot erase it.
 *     TODO(CH-13): the task card needs a CURRENT label, and hydration today is
 *     fill-if-null — nothing ever REFRESHES a label eZee later changes (a guest
 *     moved B3→C1). Make CH-13's enrichment re-fetch and overwrite, not fill.
 */
import type { MirrorRowInput, UpsertMirrorOutcome } from '../db/bookings.js';
import { normalizePhone } from '../lib/phone.js';
import { getVillaById } from '../lib/villas.js';
import { toArray, type EzeeBookingTran, type EzeeCancelReservation, type EzeeReservation } from './types.js';

/** Trimmed non-empty string or null — eZee sends '' for absent. */
function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** eZee's own change-verb vocabulary — echoed VERBATIM in ACK Status. */
const ACK_STATUSES = new Set(['new', 'modify', 'cancel']);

export interface StatusMapping {
  status: MirrorRowInput['status'];
  issue: string | null;
}

/**
 * Status table (design D5). CurrentStatus is the LIVE state and wins when
 * recognised; an unrecognised CurrentStatus falls THROUGH to the Status verb
 * (the doc's own value list ends in "etc"). 'New' confirms ONLY on
 * IsConfirmed==='1' — an unconfirmed hold must map 'unknown' so CH-12 never
 * congratulates a booking eZee has not confirmed (money/trust rule).
 */
export function mapStatus(
  tranStatus: string | undefined,
  isConfirmed: string | undefined,
  currentStatus: string | undefined,
): StatusMapping {
  const current = (currentStatus ?? '').toLowerCase().replace(/[\s_]+/g, '');
  if (current === 'arrived' || current === 'checkedin') return { status: 'checked_in', issue: null };
  if (current === 'checkedout') return { status: 'checked_out', issue: null };
  if (current === 'noshow') return { status: 'no_show', issue: null };
  if (current === 'cancel' || current === 'cancelled' || current === 'void') {
    return { status: 'cancelled', issue: null };
  }
  const verb = (tranStatus ?? '').toLowerCase().trim();
  // The confirmation gate covers BOTH change verbs that can carry a tran
  // (BKG-02 defines IsConfirmed on every BookingTran): an unconfirmed hold
  // that gets EDITED is still a hold — mapping it 'modified' would count it
  // live for CH-11/12 (pre-push audit DEFECT, the CH-09 narrower-than-
  // contract pattern).
  if (verb === 'new' || verb === 'modify') {
    if (isConfirmed === '1') {
      return { status: verb === 'new' ? 'confirmed' : 'modified', issue: null };
    }
    return { status: 'unknown', issue: `unconfirmed_hold:IsConfirmed=${isConfirmed ?? 'absent'}` };
  }
  if (verb === 'cancel') return { status: 'cancelled', issue: null };
  return {
    status: 'unknown',
    issue: `unknown_status:${tranStatus ?? 'absent'}/${currentStatus ?? 'absent'}`,
  };
}

export interface NormalizedReservation {
  /** null when the payload carries no UniqueID — unkeyable, poller skips + alerts. */
  reservationNo: string | null;
  row: MirrorRowInput | null;
  /** eZee's own Status verb verbatim for the ACK echo, when recognised. */
  ackStatus: string | undefined;
  issues: string[];
}

/** ONE Reservation object (already PII-scrubbed by the client) → one mirror row. */
export function normalizeReservation(reservation: EzeeReservation): NormalizedReservation {
  const issues: string[] = [];
  const reservationNo = str(reservation.UniqueID);
  if (reservationNo === null) {
    return { reservationNo: null, row: null, ackStatus: undefined, issues: ['missing_unique_id'] };
  }

  const trans = toArray(reservation.BookingTran);
  const tran: EzeeBookingTran = trans[0] ?? {};
  if (trans.length === 0) issues.push('missing_booking_tran');
  // Multi-room reservation: typed columns take the FIRST tran verbatim
  // (amount NEVER summed — §3.4 money is never computed); raw keeps all
  // trans; the poller raises ezee_multi_tran_reservation off this issue.
  if (trans.length > 1) issues.push(`multi_tran:${trans.length}`);

  // §5.2 names the TRANSACTION guest — tran fields first, then the
  // reservation-level booker, per field.
  const firstName = str(tran.FirstName) ?? str(reservation.FirstName);
  const lastName = str(tran.LastName) ?? str(reservation.LastName);
  const guestName =
    firstName === null && lastName === null
      ? null
      : [firstName, lastName].filter((part) => part !== null).join(' ').replace(/\s+/g, ' ');

  let guestPhone: string | null = null;
  for (const candidate of [tran.Mobile, tran.Phone, reservation.Mobile, reservation.Phone]) {
    const raw = str(candidate);
    if (raw === null) continue;
    const normal = normalizePhone(raw);
    if (normal !== null) {
      guestPhone = normal;
      break;
    }
  }
  if (guestPhone === null) issues.push('no_usable_phone'); // masked OTA numbers land here

  const rentalInfos = toArray(tran.RentalInfo);
  if (rentalInfos.length === 0) issues.push('missing_rentalinfo');
  let adults: number | null = null;
  let children: number | null = null;
  for (const info of rentalInfos) {
    const a = Number.parseInt(str(info.Adult) ?? '', 10);
    const c = Number.parseInt(str(info.Child) ?? '', 10);
    // max over effective dates: "how many must the villa prepare for" —
    // never under-counts when eZee varies pax per night.
    if (!Number.isNaN(a)) adults = adults === null ? a : Math.max(adults, a);
    if (!Number.isNaN(c)) children = children === null ? c : Math.max(children, c);
  }

  const checkIn = str(tran.Start);
  const checkOut = str(tran.End);
  const checkInOk = checkIn !== null && DATE_RE.test(checkIn);
  const checkOutOk = checkOut !== null && DATE_RE.test(checkOut);
  if (!checkInOk || !checkOutOk) issues.push('missing_dates');

  // Physical unit: RoomID = the §5.4 eZee RoomID → canonical villa label;
  // an unmapped id falls back to eZee's own RoomName verbatim.
  const roomId = str(tran.RoomID) ?? str(rentalInfos[0]?.RoomID);
  const roomName = str(tran.RoomName) ?? str(rentalInfos[0]?.RoomName);
  const physicalRoomLabel = (roomId === null ? null : (getVillaById(roomId)?.label ?? null)) ?? roomName;

  const mapping = mapStatus(str(tran.Status) ?? undefined, str(tran.IsConfirmed) ?? undefined, str(tran.CurrentStatus) ?? undefined);
  if (mapping.issue !== null) issues.push(mapping.issue);

  const verbatimStatus = str(tran.Status);
  const ackStatus =
    verbatimStatus !== null && ACK_STATUSES.has(verbatimStatus.toLowerCase())
      ? verbatimStatus
      : undefined;

  return {
    reservationNo,
    ackStatus,
    issues,
    row: {
      ezeeReservationNo: reservationNo,
      ezeeBookingTranId: str(tran.TransactionId),
      guestName,
      guestPhone,
      guestEmail: str(tran.Email) ?? str(reservation.Email),
      roomTypeId: str(tran.RoomTypeCode),
      roomTypeName: str(tran.RoomTypeName),
      physicalRoomLabel,
      rateplanId: str(tran.RateplanCode),
      checkIn: checkInOk ? checkIn : null,
      checkOut: checkOutOk ? checkOut : null,
      adults,
      children,
      status: mapping.status,
      source: str(tran.Source) ?? str(reservation.Source),
      amount: str(tran.TotalAmountAfterTax), // verbatim — never computed
      currency: str(tran.CurrencyCode),
      raw: reservation,
    },
  };
}

export interface NormalizedCancel {
  /** Verbatim UniqueID as delivered (suffix intact) — the ACK echoes THIS. */
  uniqueId: string | null;
  ackStatus: string | undefined;
  issues: string[];
}

/** CancelReservation-branch entry — carries no row data, only the target id. */
export function normalizeCancel(entry: EzeeCancelReservation): NormalizedCancel {
  const uniqueId = str(entry.UniqueID);
  const verbatimStatus = str(entry.Status);
  return {
    uniqueId,
    ackStatus:
      verbatimStatus !== null && ACK_STATUSES.has(verbatimStatus.toLowerCase())
        ? verbatimStatus
        : undefined,
    issues: uniqueId === null ? ['missing_unique_id'] : [],
  };
}

export type BookingEventKind = 'created' | 'modified' | 'cancelled';

/**
 * Which booking.* event an upsert outcome earns (design D6). The prior-unseen
 * edges matter: a never-mirrored reservation arriving as a Modify must emit
 * 'modified', NOT 'created' — CH-12 would otherwise fire the full
 * confirmation cascade for a booking that predates the mirror; and a
 * prior-unseen row already cancelled emits 'cancelled'. 'unchanged' emits
 * nothing (the redelivery dedupe that makes ACK-failure recovery safe).
 */
export function eventKindForUpsert(
  outcome: UpsertMirrorOutcome,
  ackStatus: string | undefined,
): BookingEventKind | null {
  switch (outcome.outcome) {
    case 'created':
      if (outcome.row.status === 'cancelled') return 'cancelled';
      if (ackStatus?.toLowerCase() === 'modify') return 'modified';
      return 'created';
    case 'modified':
      return 'modified';
    case 'cancelled':
      return 'cancelled';
    case 'unchanged':
      return null;
  }
}
