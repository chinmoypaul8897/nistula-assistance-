/**
 * WHERE IS THE PHYSICAL DOOR? (plan §8 CH-13 step 2, CLAUDE.md §OQ-19.)
 *
 * ─── Why this is not stayView, and why that is not a bypass ────────────────
 * `brain/stayView.ts` is "the ONE door from a mirror row to WORDS", and CH-11
 * learned the hard way that a single door is only single if every caller is
 * forced through it. This module is NOT a second door onto that question — it
 * answers a DIFFERENT one, and the distinction is the whole of OQ-19's
 * 2026-07-16 answer:
 *
 *   stayView asks:  "may we PROMISE this house to a GUEST?"  → still gated on
 *                   OQ-15, so TRUST_EZEE_ROOM_ASSIGNMENT stays false and
 *                   project() returns isUnit:false by construction.
 *   this asks:      "which door must HOUSEKEEPING walk to?"  → answered by
 *                   eZee, which is now the ONLY system that knows (the website
 *                   abolished house-choice, so there is no rival claim to
 *                   contradict).
 *
 * Guard by the CONTRACT: those are two predicates, not one. Routing a person
 * and promising a guest are different acts with different costs when wrong.
 *
 * ─── Why a FRESH read, never the mirror ───────────────────────────────────
 * `bookings_mirror.physical_room_label` is a SNAPSHOT. Only BKG-03 carries a
 * room; the poller never does — which is exactly why `coalesceMirrorInput`
 * protects the label from being erased. So most stored labels are frozen at
 * CH-11's 14 Jul reconcile and may be months stale by arrival. We read it live.
 *
 * ─── What BKG-03 ACTUALLY does (14 live probes, 2026-07-17) ───────────────
 * The vendor doc and this repo's own field note were BOTH wrong, so the shapes
 * below are observed, not documented:
 *  - no such reservation      → {status:'ok', reservations:[]}   (NOT a 503)
 *  - no room assigned yet     → RoomID: ''  (an empty string, not absent)
 *  - CANCELLED / VOIDED       → ok, with the room returned happily
 *  - live confirmed           → ok, RoomID → §5.4 → "Apartment 06"
 * BKG-03 never returned 503 once. (The "503 No Reservation Found" note is
 * documented for BKG-30, a different endpoint.)
 *
 * ─── The two rules that must never be softened ────────────────────────────
 * 1. UNREADABLE NEVER MEANS CANCELLED. Every failure here resolves to "we do
 *    not know the door", never to "there is no booking". Conflating those
 *    caused a real bug on the website side.
 * 2. A SUCCESSFUL READ IS NOT PROOF OF LIFE. eZee returns the room for a dead
 *    booking, and per OQ-24 a VOID emits no event at all — so our mirror can
 *    hold a voided booking as live indefinitely (booking 969 does, right now).
 *    A fresh read is the ONLY place we would ever learn. So a dead booking
 *    refuses to route and pages ops.
 *
 * Nothing here ever throws or fails a task: eZee flaps (identical requests
 * alternate full and empty), and a guest's towels must not depend on that.
 * Every unresolved path returns a reason, and the caller falls back to the
 * villa TYPE + the frontdesk lead.
 */
import type { EzeeClient } from '../ezee/client.js';
import { toArray, type EzeeBookingTran } from '../ezee/types.js';
import { getVillaById } from '../lib/villas.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';

export type DoorUnresolvedReason =
  /** eZee returned OK with no reservations. NOT "cancelled" — see rule 1. */
  | 'not_found'
  /** The reservation exists but carries no room. A house exists only after
   * confirm, so this is the normal state of an unconfirmed hold. */
  | 'no_room_yet'
  /** eZee says Cancel/Void. Do not send a human. Possibly news to us (OQ-24). */
  | 'booking_dead'
  /** More than one room on the reservation: ONE label is structurally wrong. */
  | 'multi_room'
  /** A RoomID that is not in §5.4 — the map has drifted. */
  | 'unmapped_room'
  /** An eZee error or a transport failure. Says nothing about the booking. */
  | 'unreadable';

export type DoorResolution =
  | { resolved: true; label: string; roomId: string }
  | { resolved: false; reason: DoorUnresolvedReason };

export interface VillaRouteDeps {
  ezee: Pick<EzeeClient, 'fetchSingleBooking'>;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
}

/**
 * 6s, not the poller's 15s. This runs inside the model's tool loop against a
 * 150s turn budget, and lib/http still retries 3×, so this is ~20s worst case.
 * A guest waiting on "two towels" must not wait on eZee — and the fallback
 * (frontdesk lead) is a perfectly good outcome, so waiting longer buys little.
 */
export const DOOR_READ_TIMEOUT_MS = 6_000;

/** eZee's words for a booking that is over. A DENYLIST on purpose, matching
 * normalize.ts's own fall-through discipline: `CurrentStatus:"Confirmed
 * Reservation"` is what every real booking carries and is NOT in eZee's
 * documented value list, so an unrecognised status must never be read as
 * death — it would refuse to route every real guest. Only a word that MEANS
 * dead counts as dead. */
const DEAD_CURRENT_STATUSES = new Set(['cancel', 'void']);

/** Trimmed non-empty string or null — eZee sends '' for absent (observed on
 * RoomID for a room-less booking). */
function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The physical door for a reservation, read live from eZee.
 *
 * `reservationNo` is passed to BKG-03 verbatim as stored. Suffixed ids
 * ('877-1') are cancel tombstones (CH-10) and are `sibling_rows`-undescribable
 * to stayView, so the tool's stage gate never lets one reach here; if one ever
 * did, it resolves `not_found` and falls back — which is correct, not a gap.
 * No base-stripping retry ladder is invented for a case we have never seen.
 */
export async function resolveDoor(
  deps: VillaRouteDeps,
  reservationNo: string,
): Promise<DoorResolution> {
  const outcome = await deps.ezee.fetchSingleBooking(
    { bookingId: reservationNo },
    { timeoutMs: DOOR_READ_TIMEOUT_MS },
  );

  if (outcome.status !== 'ok') {
    // An error or a transport failure tells us NOTHING about the booking.
    // Rule 1: this is not a cancellation, and no caller may read it as one.
    return { resolved: false, reason: 'unreadable' };
  }

  // `=== undefined` is not enough: eZee's envelope is hand-shaped and a null
  // entry is reachable, which would throw on the property read below. This
  // module promises it never throws, and a promise a test can break is the
  // only kind worth making.
  const reservation = outcome.reservations[0] as unknown;
  if (reservation === undefined || reservation === null || typeof reservation !== 'object') {
    return { resolved: false, reason: 'not_found' };
  }

  const trans = toArray<EzeeBookingTran>(
    (reservation as { BookingTran?: EzeeBookingTran | EzeeBookingTran[] }).BookingTran,
  ).filter((t): t is EzeeBookingTran => t !== null && typeof t === 'object');
  if (trans.length > 1) return { resolved: false, reason: 'multi_room' };
  const tran = trans[0];
  if (tran === undefined) return { resolved: false, reason: 'not_found' };

  // Rule 2. Checked BEFORE the room, because eZee hands us the room of a dead
  // booking without complaint and we must not act on it.
  const current = str(tran.CurrentStatus)?.toLowerCase();
  if (current !== undefined && current !== null && DEAD_CURRENT_STATUSES.has(current)) {
    await alertOps(deps.log, {
      kind: 'task_booking_dead_at_ezee',
      summary:
        'A staff task was raised against a booking eZee reports as cancelled or void — nobody was sent',
      // WHY this is worth ops' attention rather than a silent skip: per OQ-24 a
      // VOID emits no event, so our mirror can believe this booking is alive
      // indefinitely. This read may be the only place anyone ever finds out.
      detail: { reservationNo, currentStatus: str(tran.CurrentStatus) },
    });
    return { resolved: false, reason: 'booking_dead' };
  }

  const roomId = str(tran.RoomID) ?? str(toArray(tran.RentalInfo)[0]?.RoomID);
  if (roomId === null) return { resolved: false, reason: 'no_room_yet' };

  const villa = getVillaById(roomId);
  if (villa === undefined) {
    // Deliberately NOT normalize.ts's `?? RoomName` fallback. That file is
    // building an ops-readable mirror label, where eZee's own "06" is better
    // than nothing. Here the label is used to ROUTE A HUMAN and is matched
    // against the roster's canonical villas — an uncanonical string would match
    // no round and misroute silently. An unknown RoomID means §5.4 has drifted
    // from the property, which is an ops event, not a task-time improvisation.
    await alertOps(deps.log, {
      kind: 'task_unmapped_room_id',
      summary: 'eZee assigned a RoomID that is not in the §5.4 villa map — routing to the front desk',
      detail: { reservationNo, roomId },
    });
    return { resolved: false, reason: 'unmapped_room' };
  }

  return { resolved: true, label: villa.label, roomId };
}
