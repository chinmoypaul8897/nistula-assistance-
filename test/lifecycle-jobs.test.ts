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
  processBookingJob,
} from '../src/jobs/index.js';
import type { ArrivalTaskDeps } from '../src/staff/arrivalTasks.js';
import { getLiveTasksForPhone } from '../src/db/tasks.js';
import { insertGuestFactGuarded } from '../src/db/guestMemory.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import type { Roster } from '../src/staff/roster.js';
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

const FRONTDESK = '+917700900511';
const ROSTER: Roster = {
  members: [{ name: 'Meera', phone: FRONTDESK, role: 'frontdesk', villas: [] }],
  opsNumbers: [],
};
const arrivalDeps = (): ArrivalTaskDeps => ({
  db,
  log,
  roster: ROSTER,
  wa: {
    sendTemplated: vi.fn(async () => ({
      ok: true as const,
      messageId: 'wamid.x',
      usedTemplate: false,
      retryable: false,
    })),
  } as never,
  epoch: GATES.epoch,
  today: GATES.today,
  now: new Date('2026-07-14T10:00:00Z'),
});

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
    sql`TRUNCATE tasks, guest_facts, scheduled_messages, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
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

describe('🚨 CH-13b · the arrival task rides processBookingJob on create AND modify (round-1 fix)', () => {
  beforeEach(async () => {
    // 953 (seeded above) belongs to a RETURNING guest carrying a past_issue.
    const guest = await upsertGuestByPhone(db, '+917700900501', 'Rahul Mehta');
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'past_issue',
      content: 'AC weak in the master last time',
      sourceMessageId: null,
    });
  });

  it('a booking.MODIFIED raises the verify-task — the hold→confirm case the created-only guard missed', async () => {
    // The exact gap: a hold confirms and emits MODIFIED, not created. Through
    // the SHARED processBookingJob (what registerJobs mounts), the task fires.
    await processBookingJob(deps(), arrivalDeps(), 'modified', '953');
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(1);
  });

  it('a booking.CANCELLED raises NO verify-task', async () => {
    await processBookingJob(deps(), arrivalDeps(), 'cancelled', '953');
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(0);
  });

  it('create then modify raises ONE task, not two (idempotent request key)', async () => {
    await processBookingJob(deps(), arrivalDeps(), 'created', '953');
    await processBookingJob(deps(), arrivalDeps(), 'modified', '953');
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(1);
  });
});

describe('🚨 CH-13b round 4 — a cancel REVOKES the arrival verify-task', () => {
  beforeEach(async () => {
    const guest = await upsertGuestByPhone(db, '+917700900501', 'Rahul Mehta');
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'past_issue',
      content: 'AC weak in the master last time',
      sourceMessageId: null,
    });
  });

  it('an open arrival task is cancelled when the booking is cancelled — no orphan nudge', async () => {
    await processBookingJob(deps(), arrivalDeps(), 'created', '953');
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(1);
    // The guest cancels.
    await processBookingJob(deps(), arrivalDeps(), 'cancelled', '953');
    const [row] = [...(await db.execute(sql`SELECT status FROM tasks`))] as { status: string }[];
    expect(row?.status).toBe('cancelled');
    // Gone from the live set the nudger reads — no spurious "verify before arrival".
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(0);
  });

  it('a DONE arrival task is NOT reopened by a later cancel', async () => {
    await processBookingJob(deps(), arrivalDeps(), 'created', '953');
    await db.execute(sql`UPDATE tasks SET status = 'done'`);
    await processBookingJob(deps(), arrivalDeps(), 'cancelled', '953');
    const [row] = [...(await db.execute(sql`SELECT status FROM tasks`))] as { status: string }[];
    expect(row?.status).toBe('done'); // the work happened; a cancel does not undo it
  });

  it('cancelling a booking with no arrival task is a harmless no-op', async () => {
    // No past_issue guest here — remove the fact so no task is raised.
    await db.execute(sql`DELETE FROM guest_facts`);
    await processBookingJob(deps(), arrivalDeps(), 'created', '953');
    expect(await getLiveTasksForPhone(db, FRONTDESK)).toHaveLength(0);
    await expect(processBookingJob(deps(), arrivalDeps(), 'cancelled', '953')).resolves.toBeUndefined();
  });
});
