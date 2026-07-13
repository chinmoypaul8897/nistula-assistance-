/**
 * bookings_mirror + guest_stays repositories (plan.md §4, CH-10 steps 1/4/6).
 * Own file per the guestMemory/summaries precedent (~300-line rule). Every
 * helper accepts DbLike: the poller composes upsert + event send + stay link
 * into ONE transaction per reservation (§3.4 atomic event emission).
 */
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { DbLike } from './client.js';
import { bookingsMirror, guestStays, guests } from './schema.js';

export type BookingMirror = typeof bookingsMirror.$inferSelect;
export type GuestStay = typeof guestStays.$inferSelect;
export type BookingStatus = BookingMirror['status'];

/**
 * A normalised mirror row — every field PRESENT (null, never undefined), so
 * the update path overwrites stale values instead of drizzle silently
 * skipping undefined keys (a vanished email must null out, or the diff and
 * the stored row disagree forever).
 */
export interface MirrorRowInput {
  ezeeReservationNo: string;
  ezeeBookingTranId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  physicalRoomLabel: string | null;
  rateplanId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  adults: number | null;
  children: number | null;
  status: BookingStatus;
  source: string | null;
  amount: string | null;
  currency: string | null;
  raw: unknown;
}

/**
 * Fields whose change makes a re-poll a 'modified' event. DELIBERATE
 * exclusions: raw (eZee's Modifydatetime churns on every touch — including
 * it would turn every redelivery into 'modified'), syncedAt (bumps every
 * poll by design), ezeeBookingTranId (a multi-tran first-pick could flap on
 * tran reordering).
 */
export const MIRROR_DIFF_FIELDS = [
  'status',
  'checkIn',
  'checkOut',
  'roomTypeId',
  'roomTypeName',
  'physicalRoomLabel',
  'rateplanId',
  'adults',
  'children',
  'amount',
  'currency',
  'guestName',
  'guestPhone',
  'guestEmail',
  'source',
] as const;
export type MirrorDiffField = (typeof MIRROR_DIFF_FIELDS)[number];

export type UpsertMirrorOutcome =
  | { outcome: 'created'; row: BookingMirror }
  | { outcome: 'modified'; row: BookingMirror; before: BookingMirror; changed: MirrorDiffField[] }
  | { outcome: 'cancelled'; row: BookingMirror; before: BookingMirror; changed: MirrorDiffField[] }
  | { outcome: 'unchanged'; row: BookingMirror };

function fieldChanged(field: MirrorDiffField, prev: BookingMirror, next: MirrorRowInput): boolean {
  const a = (prev as Record<MirrorDiffField, unknown>)[field] ?? null;
  const b = (next as Record<MirrorDiffField, unknown>)[field] ?? null;
  if (field === 'amount') {
    // Numeric compare: eZee may re-send '976.00' as '976.0000' — a scale
    // difference must never fake a modification (money stays verbatim in
    // the column; only the COMPARISON is numeric).
    if (a === null || b === null) return a !== b;
    return Number(a) !== Number(b);
  }
  return a !== b;
}

/** Changed diff-fields between the stored row and a fresh normalisation. */
export function diffMirrorFields(prev: BookingMirror, next: MirrorRowInput): MirrorDiffField[] {
  return MIRROR_DIFF_FIELDS.filter((field) => fieldChanged(field, prev, next));
}

/**
 * SELECT-FOR-UPDATE then insert-or-update, diffing over MIRROR_DIFF_FIELDS.
 * synced_at bumps and raw is replaced on EVERY pass — neither counts toward
 * the diff, so an unchanged redelivery lands 'unchanged' (the dedupe that
 * makes ACK-failure recovery safe). The stately poller is the single writer;
 * FOR UPDATE is cheap insurance, and a true insert race hits the unique
 * constraint → tx fails → eZee redelivers (at-least-once).
 */
export async function upsertMirrorRow(
  db: DbLike,
  input: MirrorRowInput,
): Promise<UpsertMirrorOutcome> {
  const [prev] = await db
    .select()
    .from(bookingsMirror)
    .where(eq(bookingsMirror.ezeeReservationNo, input.ezeeReservationNo))
    .for('update');
  if (prev === undefined) {
    const [row] = await db
      .insert(bookingsMirror)
      .values({ ...input, syncedAt: sql`now()` })
      .returning();
    if (row === undefined) throw new Error('mirror insert returned no row');
    return { outcome: 'created', row };
  }
  const changed = diffMirrorFields(prev, input);
  const [row] = await db
    .update(bookingsMirror)
    .set({ ...input, syncedAt: sql`now()` })
    .where(eq(bookingsMirror.id, prev.id))
    .returning();
  if (row === undefined) throw new Error('mirror update returned no row');
  if (changed.length === 0) return { outcome: 'unchanged', row };
  if (row.status === 'cancelled' && prev.status !== 'cancelled') {
    return { outcome: 'cancelled', row, before: prev, changed };
  }
  return { outcome: 'modified', row, before: prev, changed };
}

export type CancelOutcome =
  | { outcome: 'cancelled'; row: BookingMirror; before: BookingMirror }
  | { outcome: 'unchanged'; row: BookingMirror }
  | { outcome: 'missing' };

/**
 * CancelReservation-branch flip: status only. The cancel entry carries no
 * row data, so raw keeps the last full reservation payload (ground truth);
 * the entry itself is preserved in raw_events. cancelled→cancelled is
 * 'unchanged' — never a second event.
 */
export async function markBookingCancelled(
  db: DbLike,
  reservationNo: string,
): Promise<CancelOutcome> {
  const [prev] = await db
    .select()
    .from(bookingsMirror)
    .where(eq(bookingsMirror.ezeeReservationNo, reservationNo))
    .for('update');
  if (prev === undefined) return { outcome: 'missing' };
  if (prev.status === 'cancelled') return { outcome: 'unchanged', row: prev };
  const [row] = await db
    .update(bookingsMirror)
    .set({ status: 'cancelled', syncedAt: sql`now()` })
    .where(eq(bookingsMirror.id, prev.id))
    .returning();
  if (row === undefined) throw new Error('mirror cancel update returned no row');
  return { outcome: 'cancelled', row, before: prev };
}

/**
 * Tombstone for a cancel whose reservation was never mirrored (booked and
 * cancelled between polls, or pre-CH-10 history): keyable evidence for
 * CH-11, safely ignorable by CH-12's cancellation cleanup.
 */
export async function insertCancelStub(
  db: DbLike,
  reservationNo: string,
  cancelRaw: unknown,
): Promise<BookingMirror> {
  const [row] = await db
    .insert(bookingsMirror)
    .values({
      ezeeReservationNo: reservationNo,
      status: 'cancelled',
      raw: cancelRaw,
      syncedAt: sql`now()`,
    })
    .returning();
  if (row === undefined) throw new Error('cancel stub insert returned no row');
  return row;
}

export type CancelTarget = { row: BookingMirror; match: 'exact' | 'base' };

/**
 * Resolves a CancelReservation UniqueID to its mirror row: exact first, then
 * — cancel ids arrive SUFFIXED per cancelled room ('11241008-1') — the
 * stripped base. Locks the row (FOR UPDATE) for the caller's tx.
 */
export async function findCancelTarget(db: DbLike, uniqueId: string): Promise<CancelTarget | null> {
  const lockByNo = async (no: string) => {
    const [row] = await db
      .select()
      .from(bookingsMirror)
      .where(eq(bookingsMirror.ezeeReservationNo, no))
      .for('update');
    return row;
  };
  const exact = await lockByNo(uniqueId);
  if (exact !== undefined) return { row: exact, match: 'exact' };
  const base = uniqueId.replace(/-\d+$/, '');
  if (base !== uniqueId) {
    const byBase = await lockByNo(base);
    if (byBase !== undefined) return { row: byBase, match: 'base' };
  }
  return null;
}

/**
 * Guest linking v1 (CH-10 step 6): link an EXISTING guest by E.164 phone —
 * never creates a guest (CH-12's scheduler explicitly supersedes that).
 * Idempotent under redelivery via the (guest_id, booking_id) unique.
 */
export async function linkStayByPhone(
  db: DbLike,
  bookingId: string,
  guestPhone: string,
): Promise<{ linked: boolean; guestId: string | null }> {
  const [guest] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.phone, guestPhone));
  if (guest === undefined) return { linked: false, guestId: null };
  const [inserted] = await db
    .insert(guestStays)
    .values({ guestId: guest.id, bookingId, matchedBy: 'phone' })
    .onConflictDoNothing({ target: [guestStays.guestId, guestStays.bookingId] })
    .returning();
  return { linked: inserted !== undefined, guestId: guest.id };
}

/** Plain read (no lock) — poller pre-checks and tests. */
export async function getMirrorByReservationNo(
  db: DbLike,
  reservationNo: string,
): Promise<BookingMirror | null> {
  const [row] = await db
    .select()
    .from(bookingsMirror)
    .where(eq(bookingsMirror.ezeeReservationNo, reservationNo));
  return row ?? null;
}
