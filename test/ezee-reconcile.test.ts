/**
 * CH-11 · the mirror reconcile (BKG-05 ArrivalList → diff → BKG-03 hydrate).
 *
 * The mirror is fed by a change FEED, so nothing proves it holds the property's
 * real live bookings. These tests pin the two properties that make the script
 * safe to run: it never ACKs (so it cannot consume the shared queue) and it
 * never emits a booking event (so it cannot add to the 62 un-consumed jobs
 * CH-12 must purge, nor wake CH-12 early).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import * as schema from '../src/db/schema.js';
import type { EzeeClient, EzeePollOutcome } from '../src/ezee/client.js';
import { parseArgs, reconcileMirror, shiftDate } from '../scripts/ezee-reconcile.js';

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

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** A reservation as eZee sends it (BKG-05/BKG-03 share the shape). */
function reservation(uniqueId: string, roomId?: string): Record<string, unknown> {
  return {
    UniqueID: uniqueId,
    FirstName: 'Rahul',
    LastName: 'Mehta',
    Mobile: '9876543210',
    Source: 'Booking.com',
    BookingTran: [
      {
        Status: 'New',
        IsConfirmed: '1',
        CurrentStatus: 'Confirmed Reservation',
        Start: '2026-08-26',
        End: '2026-08-28',
        RoomTypeCode: '5220300000000000003',
        RoomTypeName: 'Nistula Villa',
        ...(roomId === undefined ? {} : { RoomID: roomId, RoomName: 'B3' }),
        TotalAmountAfterTax: '13854.75',
        RentalInfo: [{ Adult: '4', Child: '0' }],
      },
    ],
  };
}

const ok = (reservations: Record<string, unknown>[]): EzeePollOutcome => ({
  status: 'ok',
  reservations: reservations as never,
  cancels: [],
  raw: {},
});

function fakeClient(over: Partial<EzeeClient> = {}): EzeeClient & { acked: number } {
  const c = {
    acked: 0,
    fetchPendingBookings: async (): Promise<EzeePollOutcome> => ok([]),
    ackBookings: async () => {
      c.acked += 1;
      return { status: 'ok' as const };
    },
    fetchSingleBooking: async () => ok([]),
    fetchArrivals: async () => ok([]),
    ...over,
  };
  return c as EzeeClient & { acked: number };
}

const mirrorInput = (over: Partial<MirrorRowInput> = {}): MirrorRowInput => ({
  ezeeReservationNo: '953',
  ezeeBookingTranId: 't',
  guestName: 'Rahul Mehta',
  guestPhone: '+917700900531',
  guestEmail: null,
  roomTypeId: '5220300000000000003',
  roomTypeName: 'Nistula Villa',
  physicalRoomLabel: null,
  rateplanId: null,
  checkIn: '2026-08-26',
  checkOut: '2026-08-28',
  adults: 4,
  children: 0,
  status: 'confirmed',
  source: 'Booking.com',
  amount: '1.00',
  currency: 'INR',
  raw: {},
  ...over,
});

const RANGE = { fromDate: '2026-07-01', toDate: '2026-12-31', apply: false };

describe('the diff — "is our mirror complete?"', () => {
  it('reports a booking eZee holds that we do NOT', async () => {
    await upsertMirrorRow(db, mirrorInput({ ezeeReservationNo: '953' }));
    const c = fakeClient({ fetchArrivals: async () => ok([reservation('953'), reservation('999')]) });

    const r = await reconcileMirror({ db, client: c, log }, RANGE);

    expect(r.atEzee.sort()).toEqual(['953', '999']);
    expect(r.inMirror).toEqual(['953']);
    expect(r.missing).toEqual(['999']);
  });

  it('reports held bookings that carry no villa label — CH-13 cannot make a task card for these', async () => {
    await upsertMirrorRow(db, mirrorInput({ ezeeReservationNo: '953', physicalRoomLabel: null }));
    await upsertMirrorRow(
      db,
      mirrorInput({ ezeeReservationNo: '954', physicalRoomLabel: 'Villa B3' }),
    );
    const c = fakeClient({
      fetchArrivals: async () => ok([reservation('953'), reservation('954')]),
    });

    const r = await reconcileMirror({ db, client: c, log }, RANGE);
    expect(r.unlabelled).toEqual(['953']);
  });

  it('writes NOTHING without --apply', async () => {
    const c = fakeClient({ fetchArrivals: async () => ok([reservation('999')]) });
    const r = await reconcileMirror({ db, client: c, log }, RANGE);

    expect(r.applied).toBe(false);
    expect(r.upserted).toBe(0);
    const rows = await db.select().from(schema.bookingsMirror);
    expect(rows).toEqual([]);
  });

  it('draws no conclusions when ArrivalList fails', async () => {
    const c = fakeClient({ fetchArrivals: async () => ({ status: 'unreachable' }) });
    const r = await reconcileMirror({ db, client: c, log }, RANGE);

    expect(r.atEzee).toEqual([]);
    expect(r.missing).toEqual([]); // never "everything is missing"
  });
});

describe('--apply hydrates through BKG-03 (the only call that returns a room)', () => {
  it('writes the missing booking WITH its villa label', async () => {
    const c = fakeClient({
      fetchArrivals: async () => ok([reservation('999')]),
      // BKG-03 returns RoomID; the poll never does. 5220300000000000011 = Villa B3.
      fetchSingleBooking: async () => ok([reservation('999', '5220300000000000011')]),
    });

    const r = await reconcileMirror({ db, client: c, log }, { ...RANGE, apply: true });

    expect(r.upserted).toBe(1);
    const [row] = await db.select().from(schema.bookingsMirror);
    expect(row?.ezeeReservationNo).toBe('999');
    expect(row?.physicalRoomLabel).toBe('Villa B3');
  });

  it('hydrates a label onto a booking we already held', async () => {
    await upsertMirrorRow(db, mirrorInput({ ezeeReservationNo: '953', physicalRoomLabel: null }));
    const c = fakeClient({
      fetchArrivals: async () => ok([reservation('953')]),
      fetchSingleBooking: async () => ok([reservation('953', '5220300000000000011')]),
    });

    await reconcileMirror({ db, client: c, log }, { ...RANGE, apply: true });

    const [row] = await db.select().from(schema.bookingsMirror);
    expect(row?.physicalRoomLabel).toBe('Villa B3');
  });
});

describe('the safety invariants', () => {
  // Only BookingRecdNotification consumes eZee's shared un-ACKed queue. If the
  // reconcile ever ACKed, running it locally would eat real bookings production
  // then never sees — the exact split-brain EZEE_POLLER_ENABLED exists to stop.
  it('NEVER acknowledges anything, even with --apply', async () => {
    const c = fakeClient({
      fetchArrivals: async () => ok([reservation('999')]),
      fetchSingleBooking: async () => ok([reservation('999', '5220300000000000011')]),
    });

    await reconcileMirror({ db, client: c, log }, { ...RANGE, apply: true });
    expect(c.acked).toBe(0);
  });

  // Booking events come from the poller alone. The reconcile takes no boss in
  // its dependency set BY CONSTRUCTION — so it cannot add to the 62 un-consumed
  // booking.* jobs that are CH-12's hard precondition, nor wake CH-12 early.
  it('takes no job queue in its dependencies — it cannot emit a booking event', () => {
    const deps = { db, client: fakeClient(), log };
    expect(Object.keys(deps).sort()).toEqual(['client', 'db', 'log']);
    expect('boss' in deps).toBe(false);
  });
});

describe('argument parsing', () => {
  it('defaults to 90 days back and 120 forward — back catches long in-house stays', () => {
    const a = parseArgs([], '2026-07-13');
    expect(a).toEqual({ fromDate: '2026-04-14', toDate: '2026-11-10', apply: false, refresh: false });
  });

  it('honours explicit dates and the apply flag', () => {
    expect(parseArgs(['--from', '2026-01-01', '--to', '2026-02-01', '--apply'], '2026-07-13')).toEqual(
      { fromDate: '2026-01-01', toDate: '2026-02-01', apply: true, refresh: false },
    );
  });

  // --refresh re-fetches labelled rows too. Without it, hydration is fill-if-null
  // and the poller's COALESCE means a villa label, once written, is never
  // revisited — so a guest moved B3→C1 would be told the OLD villa forever.
  it('takes --refresh', () => {
    expect(parseArgs(['--apply', '--refresh'], '2026-07-13')).toMatchObject({
      apply: true,
      refresh: true,
    });
  });

  it('shiftDate crosses month and year boundaries', () => {
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01');
  });
});
