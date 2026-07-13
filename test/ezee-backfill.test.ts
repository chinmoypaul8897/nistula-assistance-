/**
 * CH-10 backfill core — fake client + real Postgres, NO pg-boss anywhere in
 * the dependency set: the compile-time proof that backfill cannot emit
 * booking events (lifecycle must never fire on history).
 */
import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getMirrorByReservationNo } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import type { EzeeClient, EzeePollOutcome } from '../src/ezee/client.js';
import { parseBookingsEnvelope } from '../src/ezee/types.js';
import { backfillBookings } from '../scripts/ezee-backfill.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE guest_stays, bookings_mirror, guests CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

const silentLog = { info: () => {}, warn: () => {}, error: () => {} };

function fakeClient(byId: Record<string, EzeePollOutcome>): EzeeClient {
  return {
    fetchPendingBookings: () => Promise.reject(new Error('backfill must never poll')),
    ackBookings: () => Promise.reject(new Error('backfill must never ACK')),
    fetchSingleBooking: ({ bookingId }) =>
      Promise.resolve(byId[bookingId] ?? { status: 'ok', reservations: [], cancels: [], raw: {} }),
  };
}

describe('backfillBookings', () => {
  it('mirrors + links by id, never polls, never ACKs, never emits events', async () => {
    await upsertGuestByPhone(db, '+917700900408');
    const raw = JSON.parse(
      readFileSync(new URL('./fixtures/ezee/fetch-single-booking.json', import.meta.url), 'utf8'),
    );
    const { reservations } = parseBookingsEnvelope(raw);
    const result = await backfillBookings(
      { db, client: fakeClient({ '11241600': { status: 'ok', reservations, cancels: [], raw } }), log: silentLog },
      ['11241600', 'MISSING-1'],
    );
    expect(result.upserted).toBe(1);
    expect(result.failed).toEqual(['MISSING-1']);
    const row = await getMirrorByReservationNo(db, '11241600');
    expect(row?.status).toBe('checked_in'); // CurrentStatus Arrived
    expect(row?.physicalRoomLabel).toBe('Villa B3'); // RoomID → §5.4 label
    const stays = await db.select().from(schema.guestStays);
    expect(stays.some((s) => s.bookingId === row?.id)).toBe(true);
  });
});
