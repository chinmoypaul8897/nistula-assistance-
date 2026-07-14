/**
 * CH-11 guest_stays linking + the reference-attempt log — real Postgres.
 * Phone decade 5xx (+9177009005xx) is CH-11's claim in the test-number ledger
 * (0xx CH-01..08, 2xx/3xx CH-09, 4xx CH-10). Reusing another chunk's number
 * makes the worker silently no-op — a recorded 1-hour debugging trap.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import {
  countRecentFailures,
  getGuestStays,
  getMirrorForClaim,
  isStayLinked,
  linkStayByReference,
  linkStaysByPhone,
  recordReferenceAttempt,
} from '../src/db/stays.js';
import * as schema from '../src/db/schema.js';
import { upsertGuestByPhone } from '../src/db/repos.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900501';
const OTHER = '+917700900502';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE reference_attempts, guest_stays, bookings_mirror, guests CASCADE`);
});

afterAll(async () => {
  await client?.end();
});

function makeInput(over: Partial<MirrorRowInput> = {}): MirrorRowInput {
  return {
    ezeeReservationNo: '953',
    ezeeBookingTranId: '5220300000000000900',
    guestName: 'Rahul Mehta',
    guestPhone: GUEST,
    guestEmail: 'rahul@example.com',
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: null,
    rateplanId: '5220300000000000006',
    checkIn: '2026-08-26',
    checkOut: '2026-08-28',
    adults: 4,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: '13854.75',
    currency: 'INR',
    raw: { UniqueID: '953' },
    ...over,
  };
}

async function mirror(over: Partial<MirrorRowInput> = {}): Promise<string> {
  const out = await upsertMirrorRow(db, makeInput(over));
  return out.row.id;
}

describe('linkStaysByPhone — the inbound direction (a guest messages us)', () => {
  it('links every mirrored booking carrying the guest phone', async () => {
    await mirror({ ezeeReservationNo: '953' });
    await mirror({ ezeeReservationNo: '954', checkIn: '2026-09-01', checkOut: '2026-09-03' });
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');

    const { linked } = await linkStaysByPhone(db, guest.id, GUEST);
    expect(linked).toBe(2);

    const stays = await getGuestStays(db, guest.id);
    expect(stays.map((s) => s.ezeeReservationNo).sort()).toEqual(['953', '954']);
  });

  it('is idempotent — a second message links nothing new', async () => {
    await mirror();
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');

    expect((await linkStaysByPhone(db, guest.id, GUEST)).linked).toBe(1);
    expect((await linkStaysByPhone(db, guest.id, GUEST)).linked).toBe(0);
    expect(await getGuestStays(db, guest.id)).toHaveLength(1);
  });

  it('never links another guest booking', async () => {
    await mirror({ guestPhone: OTHER });
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');

    expect((await linkStaysByPhone(db, guest.id, GUEST)).linked).toBe(0);
    expect(await getGuestStays(db, guest.id)).toEqual([]);
  });

  // The fail-closed rule. An OTA-masked booking has guest_phone NULL, and the
  // ONLY ways to auto-link it would be by name or email against WhatsApp-derived
  // identity — and the WhatsApp profile name is attacker-chosen (§6.4 bans it).
  // So it must link to NOBODY, and be reachable only via a verified claim.
  it('never auto-links a masked-phone OTA row to anyone', async () => {
    await mirror({ guestPhone: null, source: 'Airbnb' });
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');

    expect((await linkStaysByPhone(db, guest.id, GUEST)).linked).toBe(0);
    expect(await getGuestStays(db, guest.id)).toEqual([]);
  });

  it('links a booking mirrored BEFORE the guest ever messaged (the common case)', async () => {
    const bookingId = await mirror();
    // Guest row does not exist yet — the poller's own linkStayByPhone found nobody.
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
    await linkStaysByPhone(db, guest.id, GUEST);

    const stays = await getGuestStays(db, guest.id);
    expect(stays[0]?.id).toBe(bookingId);
  });
});

describe('reference linking', () => {
  it('links a verified claim and is idempotent', async () => {
    const bookingId = await mirror({ guestPhone: null });
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');

    expect(await isStayLinked(db, guest.id, bookingId)).toBe(false);
    await linkStayByReference(db, guest.id, bookingId);
    await linkStayByReference(db, guest.id, bookingId);

    expect(await isStayLinked(db, guest.id, bookingId)).toBe(true);
    expect(await getGuestStays(db, guest.id)).toHaveLength(1);
  });

  it('getMirrorForClaim reads exactly one row by reservation number', async () => {
    await mirror({ ezeeReservationNo: '953' });
    expect((await getMirrorForClaim(db, '953'))?.ezeeReservationNo).toBe('953');
    expect(await getMirrorForClaim(db, '952')).toBeNull();
  });
});

describe('reference attempts — the 3-strike counter', () => {
  it('counts only REFUSED attempts, per phone, in the trailing 24h', async () => {
    await recordReferenceAttempt(db, { phone: GUEST, claimedReference: '900', outcome: 'refused' });
    await recordReferenceAttempt(db, { phone: GUEST, claimedReference: '901', outcome: 'refused' });
    // A success must not count against them.
    await recordReferenceAttempt(db, { phone: GUEST, claimedReference: '953', outcome: 'linked' });
    // Another phone's failures are not this phone's problem.
    await recordReferenceAttempt(db, { phone: OTHER, claimedReference: '902', outcome: 'refused' });

    expect(await countRecentFailures(db, GUEST)).toBe(2);
    expect(await countRecentFailures(db, OTHER)).toBe(1);
  });

  it('is zero for a phone that has never claimed', async () => {
    expect(await countRecentFailures(db, GUEST)).toBe(0);
  });

  // Rolling window, not a calendar day: a calendar day hands an attacker three
  // guesses at 23:59 and three more at 00:01.
  it('ignores failures older than 24 hours', async () => {
    await recordReferenceAttempt(db, { phone: GUEST, claimedReference: '900', outcome: 'refused' });
    await db.execute(
      sql`UPDATE reference_attempts SET created_at = now() - interval '25 hours' WHERE phone = ${GUEST}`,
    );
    expect(await countRecentFailures(db, GUEST)).toBe(0);
  });

  it('still counts a failure from 23 hours ago', async () => {
    await recordReferenceAttempt(db, { phone: GUEST, claimedReference: '900', outcome: 'refused' });
    await db.execute(
      sql`UPDATE reference_attempts SET created_at = now() - interval '23 hours' WHERE phone = ${GUEST}`,
    );
    expect(await countRecentFailures(db, GUEST)).toBe(1);
  });
});
