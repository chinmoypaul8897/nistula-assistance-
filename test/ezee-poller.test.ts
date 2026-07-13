/**
 * CH-10 poller integration battery — real Postgres + real pg-boss, fake eZee
 * client (§3.5: no live calls). Drives runPoll() directly; the registerJobs
 * cron/worker mount is thin glue verified by the dev-boot smoke (queue +
 * schedule rows inspected in the DB), not by this suite.
 * Mandated cases (plan CH-10 tests): ACK-only-after-commit, event diffing,
 * plus the cancel-semantics, resurrection-guard and failure-ladder batteries.
 */
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getMirrorByReservationNo } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import type { EzeeAckItem, EzeeAckOutcome, EzeeClient, EzeePollOutcome } from '../src/ezee/client.js';
import { createEzeePoller, type EzeePoller } from '../src/ezee/poller.js';
import { parseBookingsEnvelope, type EzeeCancelReservation, type EzeeReservation } from '../src/ezee/types.js';
import { ensureQueues, BOOKING_EVENT_QUEUES } from '../src/jobs/index.js';
import { createTestBoss, TEST_URL } from './helpers/boss.js';

let client: ReturnType<typeof postgres>;
let db: Db;
let boss: PgBoss;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE guest_stays, bookings_mirror, raw_events, guests CASCADE`);
  boss = await createTestBoss();
}, 30_000);

afterAll(async () => {
  await boss?.stop({ graceful: false, timeout: 1000 });
  await client?.end();
});

// --- rig ---------------------------------------------------------------

function loadEnvelope(name: string): EzeePollOutcome {
  const raw = JSON.parse(readFileSync(new URL(`./fixtures/ezee/${name}`, import.meta.url), 'utf8'));
  const { reservations, cancels } = parseBookingsEnvelope(raw);
  return { status: 'ok', reservations, cancels, raw };
}

function ok(reservations: EzeeReservation[], cancels: EzeeCancelReservation[] = []): EzeePollOutcome {
  return { status: 'ok', reservations, cancels, raw: { Reservations: {} } };
}

function makeMultiRes(uniqueId: string): EzeeReservation {
  const base = makeRes(uniqueId);
  const tran = (base.BookingTran as Record<string, unknown>[])[0] ?? {};
  return {
    ...base,
    BookingTran: [
      tran,
      {
        ...tran,
        TransactionId: `T2-${uniqueId}`,
        RoomTypeCode: '5220300000000000001',
        RoomTypeName: 'Nistula Apartment',
      },
    ],
  };
}

function makeRes(uniqueId: string, tranOverrides: Record<string, unknown> = {}): EzeeReservation {
  return {
    UniqueID: uniqueId,
    FirstName: 'Test',
    LastName: 'Guest',
    Mobile: '',
    Email: `${uniqueId.toLowerCase()}@example.com`,
    Source: 'Internet Booking Engine',
    BookingTran: [
      {
        TransactionId: `T-${uniqueId}`,
        Status: 'New',
        IsConfirmed: '1',
        RoomTypeCode: '5220300000000000003',
        RoomTypeName: 'Nistula Villa',
        Start: '2027-05-01',
        End: '2027-05-03',
        CurrencyCode: 'INR',
        TotalAmountAfterTax: '50000.00',
        RentalInfo: [{ Adult: '4', Child: '0' }],
        ...tranOverrides,
      },
    ],
  };
}

function fakeEzeeClient(script: EzeePollOutcome[]) {
  const ackCalls: EzeeAckItem[][] = [];
  let ackResult: EzeeAckOutcome = { status: 'ok' };
  let call = 0;
  const fake: EzeeClient = {
    fetchPendingBookings: () => {
      const outcome = script[Math.min(call, script.length - 1)];
      call += 1;
      if (outcome === undefined) throw new Error('fake client script empty');
      return Promise.resolve(outcome);
    },
    ackBookings: (items) => {
      ackCalls.push(items);
      return Promise.resolve(ackResult);
    },
    fetchSingleBooking: () =>
      Promise.resolve({ status: 'ok', reservations: [], cancels: [], raw: {} } as EzeePollOutcome),
  };
  return { fake, ackCalls, setAckResult: (r: EzeeAckOutcome) => (ackResult = r) };
}

function captureLog() {
  const lines: { level: string; obj: Record<string, unknown>; msg?: string }[] = [];
  const push =
    (level: string) =>
    (obj: Record<string, unknown>, msg?: string): void => {
      lines.push({ level, obj, msg });
    };
  return {
    log: { info: push('info'), warn: push('warn'), error: push('error') },
    lines,
    alerts: (kind: string) => lines.filter((l) => l.obj.opsAlert === kind),
  };
}

function makePoller(script: EzeePollOutcome[]) {
  const { fake, ackCalls, setAckResult } = fakeEzeeClient(script);
  const capture = captureLog();
  const poller: EzeePoller = createEzeePoller({ db, boss, client: fake, log: capture.log });
  return { poller, ackCalls, setAckResult, ...capture };
}

/** Drains one booking.* queue; returns the reservationNos it carried. */
async function drainEvents(kind: 'created' | 'modified' | 'cancelled'): Promise<string[]> {
  const queue = BOOKING_EVENT_QUEUES[kind];
  const jobs = await boss.fetch<{ reservationNo: string }>(queue, {
    batchSize: 20,
    ignoreStartAfter: true,
  });
  for (const job of jobs) await boss.complete(queue, job.id);
  return jobs.map((j) => j.data.reservationNo);
}

// --- battery ------------------------------------------------------------

describe('golden path', () => {
  it('new booking → mirror row + created event + guest link + exact ACK + audit row', async () => {
    await upsertGuestByPhone(db, '+917700900405');
    const { poller, ackCalls } = makePoller([loadEnvelope('bookings-new.json')]);
    await poller.runPoll();

    const row = await getMirrorByReservationNo(db, '11241254');
    expect(row?.status).toBe('confirmed');
    expect(row?.amount).toBe('976.00');
    expect(await drainEvents('created')).toContain('11241254');
    expect(ackCalls).toEqual([
      [{ bookingId: '11241254', pmsBookingId: '11241254', status: 'New' }],
    ]);

    const stays = await db.select().from(schema.guestStays);
    expect(stays.some((s) => s.bookingId === row?.id && s.matchedBy === 'phone')).toBe(true);

    const audits = await db
      .select()
      .from(schema.rawEvents)
      .where(eq(schema.rawEvents.source, 'ezee'));
    expect(audits).toHaveLength(1);
    expect(audits[0]?.eventType).toBe('bookings_poll');
    expect(audits[0]?.processed).toBe(true);
    expect(audits[0]?.error).toBeNull();
  });

  it('an identical redelivery is unchanged: no second event, still re-ACKed', async () => {
    const { poller, ackCalls } = makePoller([loadEnvelope('bookings-new.json')]);
    await poller.runPoll();
    expect(await drainEvents('created')).not.toContain('11241254');
    expect(await drainEvents('modified')).not.toContain('11241254');
    expect(ackCalls).toHaveLength(1); // committed rows re-ACK on redelivery
  });

  it('a Modify payload emits booking.modified and moves the dates', async () => {
    const { poller } = makePoller([loadEnvelope('bookings-modified.json')]);
    await poller.runPoll();
    expect(await drainEvents('modified')).toContain('11241254');
    const row = await getMirrorByReservationNo(db, '11241254');
    expect(row?.checkOut).toBe('2027-01-08');
    expect(row?.status).toBe('modified');
  });
});

describe('cancel semantics', () => {
  it('an exact-id cancel flips the row once and ACKs with the Cancel echo', async () => {
    const { poller, ackCalls } = makePoller([
      ok([], [{ UniqueID: '11241254', Status: 'Cancel' }]),
    ]);
    await poller.runPoll();
    expect((await getMirrorByReservationNo(db, '11241254'))?.status).toBe('cancelled');
    expect(await drainEvents('cancelled')).toContain('11241254');
    expect(ackCalls[0]).toEqual([
      { bookingId: '11241254', pmsBookingId: '11241254', status: 'Cancel' },
    ]);
    // Again: unchanged, no re-emit, still ACKed.
    await poller.runPoll();
    expect(await drainEvents('cancelled')).not.toContain('11241254');
    expect(ackCalls).toHaveLength(2);
  });

  it('a suffixed cancel base-matches a single-tran row and cancels it', async () => {
    const { poller, ackCalls } = makePoller([
      ok([makeRes('77500')]),
      ok([], [{ UniqueID: '77500-1', Status: 'Cancel' }]),
    ]);
    await poller.runPoll();
    await drainEvents('created');
    await poller.runPoll();
    expect((await getMirrorByReservationNo(db, '77500'))?.status).toBe('cancelled');
    expect(await drainEvents('cancelled')).toContain('77500');
    // The ACK echoes the DELIVERED id — suffix intact.
    expect(ackCalls[1]).toEqual([{ bookingId: '77500-1', pmsBookingId: '77500-1', status: 'Cancel' }]);
  });

  it('a suffixed cancel against a MULTI-tran row never blanket-cancels', async () => {
    const { poller, ackCalls, alerts } = makePoller([
      loadEnvelope('bookings-multi-tran.json'), // UniqueID 11241400, 2 trans
      ok([], [{ UniqueID: '11241400-1', Status: 'Cancel' }]),
    ]);
    await poller.runPoll();
    await drainEvents('created');
    await poller.runPoll();
    // The reservation still lives for the other room — status untouched.
    expect((await getMirrorByReservationNo(db, '11241400'))?.status).toBe('confirmed');
    expect(await drainEvents('cancelled')).not.toContain('11241400');
    expect(alerts('ezee_partial_cancel_suspect')).toHaveLength(1);
    // Still ACKed — eZee must not redeliver what a human now owns.
    expect(ackCalls[1]).toEqual([
      { bookingId: '11241400-1', pmsBookingId: '11241400-1', status: 'Cancel' },
    ]);
  });

  it('a FULL cancel — N suffixed entries covering all N rooms — flips the row', async () => {
    // BKG-02's own full-cancel shape: no bare entry, one suffixed entry per
    // room. Judged one-by-one this was ACKed away with nothing flipped —
    // the pre-push audit BLOCKER; the same-base group logic is the fix.
    const { poller, ackCalls, alerts } = makePoller([
      ok([makeMultiRes('X9500')]),
      ok(
        [],
        [
          { UniqueID: 'X9500-1', Status: 'Cancel' },
          { UniqueID: 'X9500-2', Status: 'Cancel' },
        ],
      ),
    ]);
    await poller.runPoll();
    await drainEvents('created');
    await poller.runPoll();
    expect((await getMirrorByReservationNo(db, 'X9500'))?.status).toBe('cancelled');
    expect(await drainEvents('cancelled')).toEqual(['X9500']); // ONE event for the base
    expect(alerts('ezee_partial_cancel_suspect')).toHaveLength(0);
    expect(ackCalls[1]).toEqual([
      { bookingId: 'X9500-1', pmsBookingId: 'X9500-1', status: 'Cancel' },
      { bookingId: 'X9500-2', pmsBookingId: 'X9500-2', status: 'Cancel' },
    ]);
  });

  it('a stale New after an ACKed cancel cannot resurrect the booking', async () => {
    // The cancel was ACKed away — eZee will never resend it; last-write
    // would un-cancel the booking forever (pre-push audit DEFECT).
    const { poller, ackCalls, alerts } = makePoller([
      ok([], [{ UniqueID: 'X9700', Status: 'Cancel' }]), // never-seen → tombstone
      ok([makeRes('X9700')]), // the stale New lands afterwards
    ]);
    await poller.runPoll();
    await drainEvents('cancelled');
    await poller.runPoll();
    expect((await getMirrorByReservationNo(db, 'X9700'))?.status).toBe('cancelled');
    expect(alerts('ezee_cancel_conflict')).toHaveLength(1);
    expect(await drainEvents('modified')).not.toContain('X9700'); // event suppressed
    expect(await drainEvents('created')).not.toContain('X9700');
    // Still ACKed: the payload is preserved in raw; a human owns the conflict.
    expect(ackCalls[1]).toEqual([{ bookingId: 'X9700', pmsBookingId: 'X9700', status: 'New' }]);
  });

  it('a suffixed cancel arriving BEFORE its reservation cannot be lost (base guarded)', async () => {
    // Close-out audit: eZee really does deliver a cancel without its create
    // (observed live on 952). Tombstoning only the suffixed ids left the BASE
    // key unguarded, so a later create landed 'confirmed' and the
    // cancellation — already ACKed away — was lost. The original BLOCKER's
    // class by another route.
    const { poller, alerts } = makePoller([
      ok([], [{ UniqueID: 'X9900-1', Status: 'Cancel' }, { UniqueID: 'X9900-2', Status: 'Cancel' }]),
      ok([makeRes('X9900')]), // the reservation itself arrives on a LATER poll
    ]);
    await poller.runPoll();
    // Base tombstone exists alongside the per-room ones.
    expect((await getMirrorByReservationNo(db, 'X9900'))?.status).toBe('cancelled');
    expect((await getMirrorByReservationNo(db, 'X9900-1'))?.status).toBe('cancelled');
    await drainEvents('cancelled');

    await poller.runPoll();
    // The late create must NOT resurrect it.
    expect((await getMirrorByReservationNo(db, 'X9900'))?.status).toBe('cancelled');
    expect(alerts('ezee_cancel_conflict')).toHaveLength(1);
    expect(await drainEvents('created')).not.toContain('X9900');
  });

  it('a never-mirrored cancel gets a tombstone stub + event + ACK', async () => {
    const { poller, ackCalls } = makePoller([
      ok([], [{ UniqueID: '88800-1', Status: 'Cancel' }]),
    ]);
    await poller.runPoll();
    const stub = await getMirrorByReservationNo(db, '88800-1');
    expect(stub?.status).toBe('cancelled');
    expect(stub?.checkIn).toBeNull();
    expect(await drainEvents('cancelled')).toContain('88800-1');
    expect(ackCalls).toHaveLength(1);
  });

  it('a same-poll book+cancel ends cancelled (reservations before cancels)', async () => {
    const { poller } = makePoller([
      ok([makeRes('X9100')], [{ UniqueID: 'X9100', Status: 'Cancel' }]),
    ]);
    await poller.runPoll();
    expect((await getMirrorByReservationNo(db, 'X9100'))?.status).toBe('cancelled');
    expect(await drainEvents('created')).toContain('X9100');
    expect(await drainEvents('cancelled')).toContain('X9100');
  });
});

describe('ACK-only-after-commit (mandated)', () => {
  it('a failed tx leaves no row, no event, and the id un-ACKed', async () => {
    // Deleting the created-event queue makes sendInTx throw INSIDE the tx —
    // the §3.4 rollback path (tx-send test proves the mechanism; this proves
    // the poller wiring: rollback ⇒ no mirror row ⇒ no ACK).
    await boss.deleteQueue(BOOKING_EVENT_QUEUES.created);
    try {
      const { poller, ackCalls } = makePoller([ok([makeRes('X9200')])]);
      await poller.runPoll();
      expect(await getMirrorByReservationNo(db, 'X9200')).toBeNull();
      expect(ackCalls).toHaveLength(0); // nothing committed ⇒ never call eZee
      const audits = await db
        .select()
        .from(schema.rawEvents)
        .where(eq(schema.rawEvents.source, 'ezee'));
      expect(audits.at(-1)?.error).toContain('X9200');
    } finally {
      await ensureQueues(boss);
    }
    // Redelivery after recovery lands and ACKs.
    const retry = makePoller([ok([makeRes('X9200')])]);
    await retry.poller.runPoll();
    expect((await getMirrorByReservationNo(db, 'X9200'))?.status).toBe('confirmed');
    expect(retry.ackCalls).toHaveLength(1);
  });

  it('a partial batch ACKs ONLY the committed reservations', async () => {
    // Seed X9310 so its redelivery is 'unchanged' (no event send needed).
    const seed = makePoller([ok([makeRes('X9310')])]);
    await seed.poller.runPoll();
    await drainEvents('created');

    await boss.deleteQueue(BOOKING_EVENT_QUEUES.created);
    try {
      const { poller, ackCalls } = makePoller([ok([makeRes('X9320'), makeRes('X9310')])]);
      await poller.runPoll();
      // X9320 needed a created event → tx rolled back; X9310 was unchanged → committed.
      expect(await getMirrorByReservationNo(db, 'X9320')).toBeNull();
      expect(ackCalls).toEqual([
        [{ bookingId: 'X9310', pmsBookingId: 'X9310', status: 'New' }],
      ]);
    } finally {
      await ensureQueues(boss);
    }
  });
});

describe('failure ladder', () => {
  it('transient failures alert once at 5 consecutive, then re-arm after recovery', async () => {
    const { poller, alerts, lines } = makePoller([
      { status: 'unreachable' },
      { status: 'unreachable' },
      { status: 'unreachable' },
      { status: 'unreachable' },
      { status: 'unreachable' },
      { status: 'unreachable' },
      ok([]),
      { status: 'unreachable' },
    ]);
    for (let i = 0; i < 5; i++) await poller.runPoll();
    expect(alerts('ezee_poll_failing')).toHaveLength(1);
    await poller.runPoll(); // 6th failure — suppressed
    expect(alerts('ezee_poll_failing')).toHaveLength(1);
    await poller.runPoll(); // success — recovery logged, ladder re-armed
    expect(lines.some((l) => l.msg === '[ezee] poll recovered')).toBe(true);
    await poller.runPoll(); // failure count restarts at 1
    expect(alerts('ezee_poll_failing')).toHaveLength(1);
  });

  it('an auth-class envelope error alerts immediately, once', async () => {
    const { poller, alerts } = makePoller([
      { status: 'ezee_error', errorCode: '301', errorMessage: 'Unauthorized Request.' },
      { status: 'ezee_error', errorCode: '301', errorMessage: 'Unauthorized Request.' },
    ]);
    await poller.runPoll();
    expect(alerts('ezee_auth_failed')).toHaveLength(1);
    await poller.runPoll();
    expect(alerts('ezee_auth_failed')).toHaveLength(1); // suppressed until recovery
  });

  it('an ACK failure counts toward the ladder; rows stay committed', async () => {
    const rig = makePoller([ok([makeRes('X9400')])]);
    rig.setAckResult({ status: 'unreachable' });
    await rig.poller.runPoll();
    expect((await getMirrorByReservationNo(db, 'X9400'))?.status).toBe('confirmed');
    expect(rig.lines.some((l) => l.obj.context === 'ack')).toBe(true);
    await drainEvents('created');
  });

  it('PERSISTENT ACK failures reach the 5-consecutive alert (audit DEFECT pin)', async () => {
    // The ladder must settle AFTER the ACK: an early reset made this class
    // unalertable forever while eZee's un-ACKed queue grew unbounded.
    const rig = makePoller([ok([makeRes('X9600')])]); // same envelope every cycle
    rig.setAckResult({ status: 'ezee_error', errorCode: '500', errorMessage: null });
    for (let i = 0; i < 5; i++) await rig.poller.runPoll();
    expect(rig.alerts('ezee_poll_failing')).toHaveLength(1);
    await rig.poller.runPoll(); // 6th — suppressed
    expect(rig.alerts('ezee_poll_failing')).toHaveLength(1);
    rig.setAckResult({ status: 'ok' });
    await rig.poller.runPoll(); // clean cycle — recovery + re-arm
    expect(rig.lines.some((l) => l.msg === '[ezee] poll recovered')).toBe(true);
    await drainEvents('created');
  });

  it('an auth-class ACK failure alerts once, not every cycle', async () => {
    const rig = makePoller([ok([makeRes('X9650')])]);
    rig.setAckResult({ status: 'ezee_error', errorCode: '301', errorMessage: null });
    await rig.poller.runPoll();
    await rig.poller.runPoll();
    expect(rig.alerts('ezee_auth_failed')).toHaveLength(1);
    await drainEvents('created');
  });

  it('deterministic per-item tx failures feed the ladder (poison-pill pin)', async () => {
    await boss.deleteQueue(BOOKING_EVENT_QUEUES.created);
    try {
      const rig = makePoller([ok([makeRes('X9800')])]); // created-event send fails every cycle
      for (let i = 0; i < 5; i++) await rig.poller.runPoll();
      expect(rig.alerts('ezee_poll_failing')).toHaveLength(1);
      expect(rig.lines.some((l) => l.obj.context === 'tx')).toBe(true);
    } finally {
      await ensureQueues(boss);
    }
  });
});

describe('quiet and degraded payloads', () => {
  it('an empty poll writes no audit row and never calls ACK', async () => {
    const before = (
      await db.select().from(schema.rawEvents).where(eq(schema.rawEvents.source, 'ezee'))
    ).length;
    const { poller, ackCalls } = makePoller([ok([])]);
    await poller.runPoll();
    const after = (
      await db.select().from(schema.rawEvents).where(eq(schema.rawEvents.source, 'ezee'))
    ).length;
    expect(after).toBe(before);
    expect(ackCalls).toHaveLength(0);
  });

  it('a masked-phone reservation mirrors with a null phone and no link', async () => {
    const staysBefore = (await db.select().from(schema.guestStays)).length;
    const { poller } = makePoller([loadEnvelope('bookings-missing-fields.json')]);
    await poller.runPoll();
    const row = await getMirrorByReservationNo(db, '11241500');
    expect(row?.status).toBe('confirmed');
    expect(row?.guestPhone).toBeNull();
    expect((await db.select().from(schema.guestStays)).length).toBe(staysBefore);
    await drainEvents('created');
  });

  it('a multi-tran reservation raises the ops note and mirrors the first tran', async () => {
    await db.execute(sql`DELETE FROM bookings_mirror WHERE ezee_reservation_no = '11241400'`);
    const { poller, alerts } = makePoller([loadEnvelope('bookings-multi-tran.json')]);
    await poller.runPoll();
    expect(alerts('ezee_multi_tran_reservation')).toHaveLength(1);
    const row = await getMirrorByReservationNo(db, '11241400');
    expect(row?.amount).toBe('90000.00'); // first tran — never summed
    await drainEvents('created');
  });
});
