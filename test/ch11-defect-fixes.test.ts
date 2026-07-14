/**
 * CH-11 · two defects the pre-build review found in the plan, fixed here.
 *
 * Both are the same shape: CH-11 is the chunk that first makes the condition
 * reachable, so CH-11 closes it.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { extractRupeeAmounts } from '../src/brain/rupees.js';
import { checkPriceIntegrity } from '../src/brain/priceGuards.js';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import * as schema from '../src/db/schema.js';

describe('a reservation number is not a price (rupees.ts)', () => {
  // eZee ids on this property are 3-digit (953, 877) — inside the bare-integer
  // band and above the floor. Before the fix, this ordinary reply extracted 953
  // as an unbacked ₹ amount, deferred with the RATE line, and raised a bogus
  // 'price' escalation at the guest.
  it('does not extract the reference from a sentence that also carries a price cue', () => {
    expect(
      extractRupeeAmounts('Your booking 953 is confirmed and the balance is payable at check-in.'),
    ).toEqual([]);
    expect(extractRupeeAmounts('Booking 45123: the total was paid in full.')).toEqual([]);
    expect(extractRupeeAmounts('Reservation 877 — nothing further to pay.')).toEqual([]);
    expect(extractRupeeAmounts('Your ref no. 953, total settled.')).toEqual([]);
  });

  it('and the guardrail therefore lets that reply through', () => {
    const draft = 'Your booking 953 is confirmed and the balance is payable at check-in.';
    expect(checkPriceIntegrity(draft, [], []).ok).toBe(true);
  });

  // The money rule must not have been weakened to buy this.
  it('still extracts a real bare-integer rate in the same shape of sentence', () => {
    expect(extractRupeeAmounts('The villa is 34000 per night.')).toContain(34000);
    expect(extractRupeeAmounts('Total payable is 45000.')).toContain(45000);
    expect(extractRupeeAmounts('The rate is 3500 nightly.')).toContain(3500);
    // A fabricated rate riding a booking sentence is still caught — the number
    // is not introduced BY the reference word.
    expect(
      extractRupeeAmounts('For booking 953, the rate is 12000 per night.'),
    ).toContain(12000);
  });

  it('still blocks a fabricated price in a booking reply', () => {
    const draft = 'Your booking 953 is confirmed. The total is 99000.';
    const res = checkPriceIntegrity(draft, [], []);
    expect(res.ok).toBe(false);
    expect(res.unbacked).toContain(99000);
  });
});

describe('a poll must not wipe an enriched villa label (bookings.ts)', () => {
  const TEST_URL =
    process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
  let client: ReturnType<typeof postgres>;
  let db: Db;

  beforeAll(async () => {
    client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
    db = drizzle(client, { schema });
  }, 30_000);

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE guest_stays, bookings_mirror, guests CASCADE`);
  });

  afterAll(async () => {
    await client?.end();
  });

  const input = (over: Partial<MirrorRowInput> = {}): MirrorRowInput => ({
    ezeeReservationNo: '953',
    ezeeBookingTranId: 't1',
    guestName: 'Rahul Mehta',
    guestPhone: '+917700900521',
    guestEmail: null,
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: null,
    rateplanId: null,
    checkIn: '2026-08-26',
    checkOut: '2026-08-28',
    adults: 2,
    children: 0,
    status: 'confirmed',
    source: 'Airbnb',
    amount: '1000.00',
    currency: 'INR',
    raw: {},
    ...over,
  });

  // BKG-02 polls carry no RoomID at all; BKG-03 does. The poller runs every 60s,
  // so an un-coalesced write would erase every label the reconcile script wrote
  // — AND emit a phantom booking.modified into the queue CH-12 must purge.
  it('keeps a hydrated label when the next poll carries none, and reports no change', async () => {
    await upsertMirrorRow(db, input()); // poll: no label
    await upsertMirrorRow(db, input({ physicalRoomLabel: 'Villa B3' })); // BKG-03 enrichment

    const out = await upsertMirrorRow(db, input()); // the next poll: still no label

    expect(out.row.physicalRoomLabel).toBe('Villa B3');
    expect(out.outcome).toBe('unchanged');
  });

  it('still records a REAL room reassignment as a modification', async () => {
    await upsertMirrorRow(db, input({ physicalRoomLabel: 'Villa B3' }));
    const out = await upsertMirrorRow(db, input({ physicalRoomLabel: 'Villa C1' }));

    expect(out.outcome).toBe('modified');
    expect(out.row.physicalRoomLabel).toBe('Villa C1');
    if (out.outcome === 'modified') expect(out.changed).toContain('physicalRoomLabel');
  });

  it('still stores a label on first sight', async () => {
    const out = await upsertMirrorRow(db, input({ physicalRoomLabel: 'Villa B3' }));
    expect(out.row.physicalRoomLabel).toBe('Villa B3');
  });
});
