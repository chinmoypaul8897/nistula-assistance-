/**
 * guest_stays reads + the CH-11 linking paths (bookings.ts owns the poller's
 * write path and is at its ~300-line limit; the guestMemory/summaries
 * precedent applies).
 *
 * Linking runs in BOTH directions and both are idempotent under the
 * (guest_id, booking_id) unique:
 * - poller side (CH-10 `linkStayByPhone`): a mirrored booking finds an
 *   existing guest.
 * - inbound side (here, `linkStaysByPhone`): a guest who messages us finds
 *   their already-mirrored bookings. This is the half that matters, because
 *   most guests are mirrored BEFORE they ever message.
 */
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db, DbLike } from './client.js';
import { bookingsMirror, guestStays, referenceAttempts } from './schema.js';
import type { BookingMirror } from './bookings.js';

export type ReferenceAttempt = typeof referenceAttempts.$inferSelect;

/** §6.4: three failed reference attempts and the claimant is locked out. */
export const REFERENCE_ATTEMPT_LIMIT = 3;

/**
 * Every mirror row linked to this guest, newest check-in first. The caller
 * projects them through brain/stayView.ts — NOTHING may read these rows
 * straight into a prompt or a tool result.
 */
export async function getGuestStays(db: DbLike, guestId: string): Promise<BookingMirror[]> {
  const rows = await db
    .select({ booking: bookingsMirror })
    .from(guestStays)
    .innerJoin(bookingsMirror, eq(guestStays.bookingId, bookingsMirror.id))
    .where(eq(guestStays.guestId, guestId))
    .orderBy(desc(bookingsMirror.checkIn));
  return rows.map((r) => r.booking);
}

/**
 * Links a guest to every mirrored booking carrying their phone (CH-11 step 1,
 * the inbound direction). Returns how many NEW links were made.
 *
 * A mirror row with `guest_phone IS NULL` is never reachable from here — an
 * equality match cannot find a null, and that is deliberate, not incidental:
 * OTA-masked numbers must NEVER auto-link, because the only ways to match them
 * would be by name or email against WhatsApp-derived identity, and the
 * WhatsApp profile name is attacker-chosen (§6.4 forbids it outright). Such a
 * booking is reachable ONLY through the verified reference-claim flow.
 */
export async function linkStaysByPhone(
  db: DbLike,
  guestId: string,
  phone: string,
): Promise<{ linked: number }> {
  const matches = await db
    .select({ id: bookingsMirror.id })
    .from(bookingsMirror)
    .where(eq(bookingsMirror.guestPhone, phone));
  if (matches.length === 0) return { linked: 0 };

  const inserted = await db
    .insert(guestStays)
    .values(matches.map((m) => ({ guestId, bookingId: m.id, matchedBy: 'phone' as const })))
    .onConflictDoNothing({ target: [guestStays.guestId, guestStays.bookingId] })
    .returning({ id: guestStays.id });
  return { linked: inserted.length };
}

/** Exactly ONE row, by reservation number — the reference-claim read.
 * Deliberately never a search BY name or date: a search is itself a leak. */
export async function getMirrorForClaim(
  db: DbLike,
  reservationNo: string,
): Promise<BookingMirror | null> {
  const [row] = await db
    .select()
    .from(bookingsMirror)
    .where(eq(bookingsMirror.ezeeReservationNo, reservationNo));
  return row ?? null;
}

/** Links a VERIFIED reference claim. Idempotent — a guest re-stating a
 * reference they already own is a no-op, never a second row. */
export async function linkStayByReference(
  db: DbLike,
  guestId: string,
  bookingId: string,
): Promise<void> {
  await db
    .insert(guestStays)
    .values({ guestId, bookingId, matchedBy: 'reference_in_chat' })
    .onConflictDoNothing({ target: [guestStays.guestId, guestStays.bookingId] });
}

/** True when this guest already owns this booking — an honest guest re-stating
 * their own reference must never burn a strike. */
export async function isStayLinked(
  db: DbLike,
  guestId: string,
  bookingId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: guestStays.id })
    .from(guestStays)
    .where(and(eq(guestStays.guestId, guestId), eq(guestStays.bookingId, bookingId)));
  return row !== undefined;
}

/**
 * Failed claims by this phone in the trailing 24 HOURS — rolling, not a
 * calendar day. A calendar day would hand an attacker three guesses at 23:59
 * and three more at 00:01.
 *
 * Counted on the DB clock (§3.4): no JS Date rides a raw sql fragment.
 */
export async function countRecentFailures(db: DbLike, phone: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(referenceAttempts)
    .where(
      and(
        eq(referenceAttempts.phone, phone),
        eq(referenceAttempts.outcome, 'refused'),
        gte(referenceAttempts.createdAt, sql`now() - interval '24 hours'`),
      ),
    );
  return row?.n ?? 0;
}

export async function recordReferenceAttempt(
  db: DbLike,
  attempt: { phone: string; claimedReference: string; outcome: 'linked' | 'refused' },
): Promise<void> {
  await db.insert(referenceAttempts).values(attempt);
}

/** CH-18 DELETE_GUEST hook — a guest's claim trail is their data too. */
export async function deleteReferenceAttempts(db: Db, phone: string): Promise<void> {
  await db.delete(referenceAttempts).where(eq(referenceAttempts.phone, phone));
}

/** Admin/ops read: the mirror rows behind a set of ids (projected by callers). */
export async function getMirrorByIds(db: DbLike, ids: string[]): Promise<BookingMirror[]> {
  if (ids.length === 0) return [];
  return db.select().from(bookingsMirror).where(inArray(bookingsMirror.id, ids));
}
