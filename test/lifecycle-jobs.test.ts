/**
 * CH-12 · the jobs wiring — the code that drains production's 83-job `booking.*`
 * backlog the moment it deploys, and which nothing tested.
 *
 * The dispatch is derived from `Object.entries(BOOKING_EVENT_QUEUES)`, so if the
 * `kind` were mis-derived a CANCEL would SCHEDULE — five messages to a guest
 * whose booking no longer exists — and every other test in the suite would stay
 * green. This file is the pin on that.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgBoss } from 'pg-boss';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages } from '../src/db/schema.js';
import {
  BOOKING_CANCELLED_QUEUE,
  BOOKING_CREATED_QUEUE,
  BOOKING_EVENT_QUEUES,
  LIFECYCLE_RECONCILE_QUEUE,
  LIFECYCLE_SEND_QUEUE,
} from '../src/jobs/index.js';
import {
  handleBookingEvent,
  scheduleForBooking,
  type BookingEventKind,
  type SchedulerDeps,
} from '../src/lifecycle/scheduler.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import { createTestBoss, tickQueue, TEST_URL } from './helpers/boss.js';

const GATES: GateContext = {
  epoch: new Date('2026-07-14T00:00:00Z'),
  today: '2026-07-14',
  sources: ['internet booking engine', 'walk-in'],
};

let client: ReturnType<typeof postgres>;
let db: Db;
let boss: PgBoss;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const deps = (): SchedulerDeps => ({ db, log, gates: GATES });

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
  boss = await createTestBoss();
}, 30_000);

afterAll(async () => {
  await boss?.stop({ graceful: false, timeout: 1000 });
  await client?.end();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await boss.deleteAllJobs(BOOKING_CREATED_QUEUE);
  await boss.deleteAllJobs(BOOKING_CANCELLED_QUEUE);
  await db.execute(
    sql`TRUNCATE scheduled_messages, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
  );
  await db.insert(schema.bookingsMirror).values({
    ezeeReservationNo: '953',
    guestName: 'Rahul Mehta',
    guestPhone: '+917700900501',
    roomTypeName: 'Nistula Villa',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    status: 'confirmed',
    source: 'Internet Booking Engine',
    raw: {},
    syncedAt: new Date(),
    createdAt: new Date(),
  });
});

/**
 * Drive a queue through the SAME code registerJobs mounts: the kind is DERIVED
 * from the real BOOKING_EVENT_QUEUES map (not hardcoded), then handed to the real
 * handleBookingEvent. A regression that remaps the cancel queue or breaks the
 * cancel branch fails here — which the old hardcoded reimplementation could not
 * catch (the review's finding).
 */
const kindForQueue = (queue: string) =>
  (Object.entries(BOOKING_EVENT_QUEUES).find(([, q]) => q === queue)?.[0] ??
    'created') as BookingEventKind;

const drive = (queue: string) =>
  tickQueue<{ reservationNo: string }>(boss, queue, async (data) =>
    handleBookingEvent(deps(), kindForQueue(queue), data.reservationNo).then(() => undefined),
  );

describe('booking.* workers (through the real handleBookingEvent + queue map)', () => {
  it('a booking.created job schedules the five lifecycle rows', async () => {
    await boss.send(BOOKING_CREATED_QUEUE, { reservationNo: '953' });
    expect(await drive(BOOKING_CREATED_QUEUE)).toBe(1);
    expect(await db.select().from(scheduledMessages)).toHaveLength(5);
  });

  it('🚨 a booking.cancelled job CANCELS — it must never schedule', async () => {
    await scheduleForBooking(deps(), '953');
    await boss.send(BOOKING_CANCELLED_QUEUE, { reservationNo: '953' });

    await drive(BOOKING_CANCELLED_QUEUE);

    const rows = await db.select().from(scheduledMessages);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.status === 'cancelled')).toBe(true);
    expect(rows.every((r) => r.skipReason === 'booking_cancelled')).toBe(true);
  });

  it('the cancel queue maps to the cancel action, by construction', () => {
    // Pins the map itself: BOOKING_EVENT_QUEUES.cancelled must be the cancel queue.
    expect(kindForQueue(BOOKING_CANCELLED_QUEUE)).toBe('cancelled');
    expect(kindForQueue(BOOKING_CREATED_QUEUE)).toBe('created');
  });

  it('the payload carries only {reservationNo} — everything else is read from the mirror', async () => {
    await boss.send(BOOKING_CREATED_QUEUE, { reservationNo: '953' });
    const [job] = await boss.fetch<{ reservationNo: string }>(BOOKING_CREATED_QUEUE, {
      batchSize: 1,
    });
    expect(job?.data).toEqual({ reservationNo: '953' });
    await boss.complete(BOOKING_CREATED_QUEUE, job?.id as string);
  });
});

describe('the lifecycle queues exist with the right guards', () => {
  it('lifecycle.send and lifecycle.reconcile are stately (no overlapping ticks)', async () => {
    for (const queue of [LIFECYCLE_SEND_QUEUE, LIFECYCLE_RECONCILE_QUEUE]) {
      const q = await boss.getQueue(queue);
      expect(q?.policy).toBe('stately');
      // The next tick IS the retry — a retrying sender would double-send.
      expect(q?.retryLimit).toBe(0);
    }
  });
});
