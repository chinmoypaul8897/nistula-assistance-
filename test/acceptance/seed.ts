/**
 * CH-19 acceptance data seeding — scenario preconditions built through the REAL
 * repositories (so seeding is itself coverage), never raw SQL. Dates are IST
 * calendar strings relative to the harness clock, so a scenario reads like the
 * product-picture ("a stay 75 days ago") regardless of when the suite runs.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '../../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../../src/db/bookings.js';
import { insertGuestFactGuarded, type GuestFactKind } from '../../src/db/guestMemory.js';
import { touchPhoneWindow } from '../../src/db/windows.js';
import { guests, scheduledMessages } from '../../src/db/schema.js';
import { LIFECYCLE_TEMPLATES } from '../../src/lifecycle/templates.js';
import type { Roster } from '../../src/staff/roster.js';
import { istCalendarDay, nowIST, shiftDay } from '../../src/lib/time.js';

/** Reserved test numbers: the 7700900-2xx staff/ops block (guests use 1xx). */
export const HOUSEKEEPER_PHONE = '+917700900201';
export const FRONTDESK_PHONE = '+917700900202';
export const OPS_PHONE = '+917700900200';

/** Today (and offsets) as an IST 'YYYY-MM-DD' string on the harness clock. */
export function istDay(offsetDays = 0): string {
  return shiftDay(istCalendarDay(nowIST()), offsetDays);
}

/**
 * The acceptance roster: a housekeeper whose round includes Apartment 09 (the door
 * the S3 fixture read resolves), a front-desk lead (the fail-closed fallback and
 * escalation owner), and one ops number. Villa labels are the §5.4 canonical
 * form assignFor compares against.
 */
export function acceptanceRoster(): Roster {
  return {
    members: [
      { name: 'Asha', phone: HOUSEKEEPER_PHONE, role: 'housekeeping', villas: ['Apartment 09'] },
      { name: 'Meera', phone: FRONTDESK_PHONE, role: 'frontdesk', villas: [] },
    ],
    opsNumbers: [OPS_PHONE],
  };
}

/** OQ-25: a staff number is only reachable by free-form once it has messaged the
 * line. Opening its window is the harness stand-in for that one onboarding ping. */
export async function openStaffWindow(db: Db, phone: string): Promise<void> {
  await touchPhoneWindow(db, phone, nowIST());
}

const DEFAULTS: Omit<MirrorRowInput, 'ezeeReservationNo' | 'guestName' | 'guestPhone'> = {
  ezeeBookingTranId: null,
  guestEmail: null,
  // CH-20 (2026-07-27): was …0003 / "Nistula Villa" — the 3BHK type retired
  // 2026-07-24. The apartments are now the only multi-unit type, so they are
  // where the "eZee assigns the house, we never promise it" contract lives.
  roomTypeId: '5220300000000000001', // §5.4 Nistula Apartment
  roomTypeName: 'Nistula Apartment',
  physicalRoomLabel: null, // the mirror never carries a live room (BKG-02); the door is a fresh read
  rateplanId: null,
  checkIn: null,
  checkOut: null,
  adults: 2,
  children: 0,
  status: 'confirmed',
  source: 'Walk-in',
  amount: '34000',
  currency: 'INR',
  raw: {},
};

export interface BookingSeed {
  reservationNo: string;
  guestName: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  source?: string;
  status?: MirrorRowInput['status'];
}

/** Seed one mirror booking through the real upsert (emits nothing — the harness
 * drives the booking.* event itself). */
export async function seedBooking(db: Db, seed: BookingSeed): Promise<void> {
  await upsertMirrorRow(db, {
    ...DEFAULTS,
    ezeeReservationNo: seed.reservationNo,
    guestName: seed.guestName,
    guestPhone: seed.guestPhone,
    checkIn: seed.checkIn,
    checkOut: seed.checkOut,
    source: seed.source ?? 'Walk-in',
    status: seed.status ?? 'confirmed',
  });
}

/** A direct (Walk-in) booking arriving in `daysAhead` days — S2's happy path. */
export async function seedDirectBooking(
  db: Db,
  reservationNo: string,
  guestName: string,
  guestPhone: string,
  daysAhead: number,
  nights = 2,
): Promise<void> {
  await seedBooking(db, {
    reservationNo,
    guestName,
    guestPhone,
    checkIn: istDay(daysAhead),
    checkOut: istDay(daysAhead + nights),
    source: 'Walk-in',
  });
}

/** An Airbnb booking with a real phone — S2's OQ-20 negative (mirrored, never messaged). */
export async function seedOtaBooking(
  db: Db,
  reservationNo: string,
  guestName: string,
  guestPhone: string,
  daysAhead: number,
): Promise<void> {
  await seedBooking(db, {
    reservationNo,
    guestName,
    guestPhone,
    checkIn: istDay(daysAhead),
    checkOut: istDay(daysAhead + 2),
    source: 'Airbnb',
  });
}

/** Save a durable guest fact through the real guarded path (S6 memory). */
export async function seedFact(
  db: Db,
  guestId: string,
  kind: GuestFactKind,
  content: string,
): Promise<void> {
  await insertGuestFactGuarded(db, { guestId, kind, content, sourceMessageId: null });
}

/** Mark a guest opted in to marketing (S6 win-back precondition). */
export async function seedMarketingOptIn(db: Db, guestId: string): Promise<void> {
  await db.update(guests).set({ marketingOptIn: true }).where(eq(guests.id, guestId));
}

/**
 * Seed one pending win-back scheduled row (S6). CH-12 schedules the win-back at
 * BOOKING time (75 days ahead); here we insert it directly so S6 can prove the
 * SEND + the reply memory without a 75-day clock dance. `sendAt` in the past ⇒
 * due now; in the future ⇒ stays pending (the STOP-cancellation probe).
 */
export async function seedWinback(
  db: Db,
  opts: { guestId: string; bookingId: string | null; reservationNo: string; firstName: string; sendAt: Date },
): Promise<void> {
  await db.insert(scheduledMessages).values({
    guestId: opts.guestId,
    bookingId: opts.bookingId,
    kind: 'winback',
    templateName: LIFECYCLE_TEMPLATES.winback.name,
    params: { firstName: opts.firstName, villaType: 'Nistula Apartment', locality: 'Assagao' },
    sendAt: opts.sendAt,
    dedupeKey: `winback:${opts.reservationNo}`,
  });
}
