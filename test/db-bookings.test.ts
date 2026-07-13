/**
 * CH-10 bookings_mirror + guest_stays repository battery — real Postgres
 * (docker-compose locally, service container in CI). Phone decade 4xx
 * (+9177009004xx) is CH-10's claim in the test-number ledger.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import {
  diffMirrorFields,
  findCancelTarget,
  getMirrorByReservationNo,
  insertCancelStub,
  linkStayByPhone,
  markBookingCancelled,
  upsertMirrorRow,
  type MirrorRowInput,
} from '../src/db/bookings.js';
import { runMigrations } from '../src/db/migrate.js';
import * as schema from '../src/db/schema.js';
import { upsertGuestByPhone } from '../src/db/repos.js';

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

function makeInput(overrides: Partial<MirrorRowInput> = {}): MirrorRowInput {
  return {
    ezeeReservationNo: 'RES-DEFAULT',
    ezeeBookingTranId: '112400000000001902',
    guestName: 'Test Guest One',
    guestPhone: '+917700900401',
    guestEmail: 'guest1@example.com',
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: 'Villa B3',
    rateplanId: '5220300000000000003',
    checkIn: '2027-01-05',
    checkOut: '2027-01-07',
    adults: 4,
    children: 2,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: '976.00',
    currency: 'INR',
    raw: { UniqueID: 'RES-DEFAULT', note: 'fixture' },
    ...overrides,
  };
}

describe('migration 0005', () => {
  it('re-applies cleanly on an already-migrated database', async () => {
    await expect(runMigrations(TEST_URL)).resolves.toBeUndefined();
  });
});

describe('upsertMirrorRow', () => {
  it('creates a fresh row; date and amount round-trip verbatim as strings', async () => {
    const outcome = await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1001' }));
    expect(outcome.outcome).toBe('created');
    const row = await getMirrorByReservationNo(db, 'RES-1001');
    expect(row?.checkIn).toBe('2027-01-05');
    expect(row?.amount).toBe('976.00'); // unconstrained numeric keeps scale
    expect(row?.status).toBe('confirmed');
  });

  it('identical redelivery lands unchanged — synced_at advances, raw replaced', async () => {
    const first = await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1002' }));
    expect(first.outcome).toBe('created');
    const again = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1002', raw: { UniqueID: 'RES-1002', redelivered: true } }),
    );
    expect(again.outcome).toBe('unchanged');
    expect(again.row.syncedAt.getTime()).toBeGreaterThanOrEqual(first.row.syncedAt.getTime());
    expect(again.row.raw).toEqual({ UniqueID: 'RES-1002', redelivered: true });
  });

  it('a changed check-out is modified with the before image and the changed list', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1003' }));
    const outcome = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1003', checkOut: '2027-01-08' }),
    );
    expect(outcome.outcome).toBe('modified');
    if (outcome.outcome !== 'modified') return;
    expect(outcome.changed).toEqual(['checkOut']);
    expect(outcome.before.checkOut).toBe('2027-01-07');
    expect(outcome.row.checkOut).toBe('2027-01-08');
  });

  it('a scale-only amount difference is NOT a modification (numeric compare)', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1004', amount: '976.00' }));
    const outcome = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1004', amount: '976.0000' }),
    );
    expect(outcome.outcome).toBe('unchanged');
  });

  it('a vanished field overwrites to null and counts as modified', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1005' }));
    const outcome = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1005', guestEmail: null }),
    );
    expect(outcome.outcome).toBe('modified');
    const row = await getMirrorByReservationNo(db, 'RES-1005');
    expect(row?.guestEmail).toBeNull();
  });

  it('a status flip to cancelled is the cancelled outcome; again is unchanged', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1006' }));
    const flipped = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1006', status: 'cancelled' }),
    );
    expect(flipped.outcome).toBe('cancelled');
    const again = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1006', status: 'cancelled' }),
    );
    expect(again.outcome).toBe('unchanged');
  });

  it('a cancelled row is never resurrected by confirmed/modified (audit DEFECT)', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1008', status: 'cancelled' }));
    // A stale New redelivery after the cancel was ACKed away: status must
    // stay cancelled (nothing at eZee would ever correct an un-cancel).
    const blocked = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1008', status: 'confirmed' }),
    );
    expect(blocked.outcome).toBe('unchanged'); // only status differed — and it was held
    if (blocked.outcome === 'unchanged') expect(blocked.resurrectionBlocked).toBe(true);
    expect((await getMirrorByReservationNo(db, 'RES-1008'))?.status).toBe('cancelled');
    // Non-status fields still update under the guard, flagged as blocked.
    const partial = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1008', status: 'modified', guestEmail: 'new@example.com' }),
    );
    expect(partial.outcome).toBe('modified');
    if (partial.outcome === 'modified') expect(partial.resurrectionBlocked).toBe(true);
    expect((await getMirrorByReservationNo(db, 'RES-1008'))?.status).toBe('cancelled');
    // A recognised live CurrentStatus (checked_in) IS proof of life — passes.
    const revived = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-1008', status: 'checked_in', guestEmail: 'new@example.com' }),
    );
    expect(revived.outcome).toBe('modified');
    if (revived.outcome === 'modified') expect(revived.resurrectionBlocked).toBe(false);
    expect((await getMirrorByReservationNo(db, 'RES-1008'))?.status).toBe('checked_in');
  });

  it('the resurrection guard is an ALLOWLIST — unknown/no_show cannot revive either', async () => {
    // Close-out audit: a denylist of {confirmed, modified} let `unknown`
    // through, and `unknown` is exactly what an unconfirmed-hold redelivery
    // maps to — the commonest stale payload there is.
    for (const status of ['unknown', 'no_show', 'confirmed', 'modified'] as const) {
      const res = `RES-REVIVE-${status}`;
      await upsertMirrorRow(db, makeInput({ ezeeReservationNo: res, status: 'cancelled' }));
      const attempt = await upsertMirrorRow(db, makeInput({ ezeeReservationNo: res, status }));
      if (attempt.outcome !== 'created') expect(attempt.resurrectionBlocked).toBe(true);
      expect((await getMirrorByReservationNo(db, res))?.status).toBe('cancelled');
    }
    // Only proof-of-life revives.
    for (const status of ['checked_in', 'checked_out'] as const) {
      const res = `RES-REVIVE-${status}`;
      await upsertMirrorRow(db, makeInput({ ezeeReservationNo: res, status: 'cancelled' }));
      await upsertMirrorRow(db, makeInput({ ezeeReservationNo: res, status }));
      expect((await getMirrorByReservationNo(db, res))?.status).toBe(status);
    }
  });
});

describe('diffMirrorFields', () => {
  it('ignores raw and syncedAt by construction', async () => {
    const created = await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-1007' }));
    expect(created.outcome).toBe('created');
    const changed = diffMirrorFields(
      created.row,
      makeInput({ ezeeReservationNo: 'RES-1007', raw: { different: true } }),
    );
    expect(changed).toEqual([]);
  });
});

describe('markBookingCancelled / cancel targets', () => {
  it('flips a live row once, is unchanged the second time, missing when unknown', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-2001' }));
    const first = await markBookingCancelled(db, 'RES-2001');
    expect(first.outcome).toBe('cancelled');
    const second = await markBookingCancelled(db, 'RES-2001');
    expect(second.outcome).toBe('unchanged');
    const missing = await markBookingCancelled(db, 'RES-NEVER-SEEN');
    expect(missing.outcome).toBe('missing');
  });

  it('findCancelTarget matches exact, then the suffix-stripped base, else null', async () => {
    await upsertMirrorRow(db, makeInput({ ezeeReservationNo: 'RES-2002' }));
    const exact = await findCancelTarget(db, 'RES-2002');
    expect(exact?.match).toBe('exact');
    const base = await findCancelTarget(db, 'RES-2002-1');
    expect(base?.match).toBe('base');
    expect(base?.row.ezeeReservationNo).toBe('RES-2002');
    expect(await findCancelTarget(db, 'RES-2003-1')).toBeNull();
  });

  it('insertCancelStub writes a keyable cancelled tombstone', async () => {
    const stub = await insertCancelStub(db, 'RES-2004', { UniqueID: 'RES-2004', Status: 'Cancel' });
    expect(stub.status).toBe('cancelled');
    expect(stub.checkIn).toBeNull();
    const found = await findCancelTarget(db, 'RES-2004');
    expect(found?.match).toBe('exact');
  });
});

describe('linkStayByPhone', () => {
  it('links an existing guest once; the second call is a no-op', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900402');
    const created = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-3001', guestPhone: '+917700900402' }),
    );
    expect(created.outcome).toBe('created');
    const first = await linkStayByPhone(db, created.row.id, '+917700900402');
    expect(first).toEqual({ linked: true, guestId: guest.id });
    const second = await linkStayByPhone(db, created.row.id, '+917700900402');
    expect(second).toEqual({ linked: false, guestId: guest.id });
    const stays = await db.select().from(schema.guestStays);
    expect(stays.filter((s) => s.bookingId === created.row.id)).toHaveLength(1);
    expect(stays[0]?.matchedBy).toBe('phone');
  });

  it('never creates a guest — an unknown phone links nothing', async () => {
    const created = await upsertMirrorRow(
      db,
      makeInput({ ezeeReservationNo: 'RES-3002', guestPhone: '+917700900403' }),
    );
    expect(created.outcome).toBe('created');
    const before = await db.select().from(schema.guests);
    const result = await linkStayByPhone(db, created.row.id, '+917700900403');
    expect(result).toEqual({ linked: false, guestId: null });
    const after = await db.select().from(schema.guests);
    expect(after).toHaveLength(before.length);
  });
});
