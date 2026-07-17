/**
 * CH-13b · the arrival auto-task, driven against real Postgres (the CH-13a
 * lesson: a database that cannot fail cannot falsify anything). Every test
 * asserts the OUTCOME — is there a task row, what does it say, who holds it —
 * not that some function was called.
 *
 * Phone decade 9xx is CH-13b's claim in the test-number ledger.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { maybeCreateArrivalVerifyTask, type ArrivalTaskDeps } from '../src/staff/arrivalTasks.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import { insertGuestFactGuarded } from '../src/db/guestMemory.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import type { Roster } from '../src/staff/roster.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const TODAY = '2026-07-17';
const NOW = new Date('2026-07-17T09:50:00Z');
const PAST_EPOCH = new Date('2020-01-01T00:00:00Z'); // everything qualifies
const GUEST = '+917700900901';
const MEERA = '+917700900902'; // frontdesk lead

const ROSTER: Roster = {
  members: [{ name: 'Meera', phone: MEERA, role: 'frontdesk', villas: [] }],
  opsNumbers: [],
};
const EMPTY_ROSTER: Roster = { members: [], opsNumbers: [] };

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 4, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE tasks, guest_facts, guest_stays, bookings_mirror, messages, conversations, guests, raw_events CASCADE`,
  );
});

afterAll(async () => {
  await client?.end();
});

const mirrorInput = (over: Partial<MirrorRowInput> = {}): MirrorRowInput => ({
  ezeeReservationNo: '980',
  ezeeBookingTranId: 't-980',
  guestName: 'Rahul',
  guestPhone: GUEST,
  guestEmail: null,
  roomTypeId: '5220300000000000001',
  roomTypeName: 'Nistula Apartment',
  physicalRoomLabel: null,
  rateplanId: null,
  checkIn: '2026-07-25', // future
  checkOut: '2026-07-28',
  adults: 2,
  children: 0,
  status: 'confirmed',
  source: 'Internet Booking Engine',
  amount: null,
  currency: 'INR',
  raw: {},
  ...over,
});

const deps = (over: Partial<ArrivalTaskDeps> = {}): ArrivalTaskDeps => {
  const sendTemplated = vi.fn(async () => ({
    ok: true as const,
    messageId: 'wamid.x',
    usedTemplate: false,
    retryable: false,
  }));
  return {
    db,
    log: { error: vi.fn(), info: vi.fn() },
    roster: ROSTER,
    wa: { sendTemplated } as never,
    epoch: PAST_EPOCH,
    today: TODAY,
    now: NOW,
    ...over,
  };
};

/** A returning guest who carries a past_issue fact, plus their fresh booking. */
async function seedReturningGuest(
  factContents: string[] = ['AC weak in the master bedroom — resolved'],
  mirror: Partial<MirrorRowInput> = {},
): Promise<{ guestId: string }> {
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  for (const content of factContents) {
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'past_issue',
      content,
      sourceMessageId: null,
    });
  }
  await upsertMirrorRow(db, mirrorInput(mirror));
  return { guestId: guest.id };
}

const rows = async () =>
  [...(await db.execute(sql`SELECT kind, summary, detail, villa_label, assigned_phone, status FROM tasks`))] as {
    kind: string;
    summary: string;
    detail: string | null;
    villa_label: string | null;
    assigned_phone: string | null;
    status: string;
  }[];

describe('maybeCreateArrivalVerifyTask — the happy path (real Postgres)', () => {
  it('a returning guest with a past_issue fact gets a frontdesk verify-task', async () => {
    await seedReturningGuest();
    const result = await maybeCreateArrivalVerifyTask(deps(), '980');
    expect(result.created).toBe(true);

    const [task] = await rows();
    expect(task).toMatchObject({
      kind: 'frontdesk',
      assigned_phone: MEERA, // the frontdesk lead, not a villa route
      status: 'open',
    });
    expect(task?.summary).toBe('verify before arrival: AC weak in the master bedroom — resolved');
    // The card names the villa TYPE, never a house (OQ-19).
    expect(task?.villa_label).toBe('Nistula Apartment');
  });

  it('🚨 combines multiple past_issue facts into ONE task, overflow into detail', async () => {
    await seedReturningGuest(['AC weak in B-master', 'shower ran cold on the last night']);
    await maybeCreateArrivalVerifyTask(deps(), '980');
    const all = await rows();
    expect(all).toHaveLength(1); // one card for the front desk, not two buzzes
    expect(all[0]?.summary).toContain('verify before arrival:');
    expect(all[0]?.detail).toContain('AC weak in B-master');
    expect(all[0]?.detail).toContain('shower ran cold');
  });
});

describe('maybeCreateArrivalVerifyTask — the fail-closed skips', () => {
  it('a guest with NO past_issue fact gets nothing', async () => {
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'likes a firm pillow',
      sourceMessageId: null,
    });
    await upsertMirrorRow(db, mirrorInput());
    expect(await maybeCreateArrivalVerifyTask(deps(), '980')).toEqual({
      created: false,
      reason: 'no_past_issue',
    });
    expect(await rows()).toHaveLength(0);
  });

  it('an UNKNOWN guest (no prior interaction, so no facts) gets nothing', async () => {
    await upsertMirrorRow(db, mirrorInput()); // booking exists, guest never messaged
    expect(await maybeCreateArrivalVerifyTask(deps(), '980')).toEqual({
      created: false,
      reason: 'guest_not_known',
    });
  });

  it('a booking mirrored BEFORE the epoch gets nothing', async () => {
    await seedReturningGuest();
    // Epoch after the row's createdAt ⇒ before_epoch.
    const future = new Date(NOW.getTime() + 86_400_000);
    expect(await maybeCreateArrivalVerifyTask(deps({ epoch: future }), '980')).toEqual({
      created: false,
      reason: 'before_epoch',
    });
    expect(await rows()).toHaveLength(0);
  });

  it('a stay already in the past gets nothing', async () => {
    await seedReturningGuest([], { checkIn: '2026-03-01', checkOut: '2026-03-04' });
    // (re-seed the fact — the [] above skipped it)
    const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
    await insertGuestFactGuarded(db, { guestId: guest.id, kind: 'past_issue', content: 'x', sourceMessageId: null });
    expect(await maybeCreateArrivalVerifyTask(deps(), '980')).toEqual({
      created: false,
      reason: 'stay_in_past',
    });
  });

  it('a cancelled booking gets nothing', async () => {
    await seedReturningGuest(['AC weak'], { status: 'cancelled' });
    expect(await maybeCreateArrivalVerifyTask(deps(), '980')).toEqual({
      created: false,
      reason: 'status_not_live',
    });
  });

  it('no mirror row at all → nothing', async () => {
    expect(await maybeCreateArrivalVerifyTask(deps(), 'nope')).toEqual({
      created: false,
      reason: 'no_mirror_row',
    });
  });
});

describe('🚨 CH-13b · the D9 point — source-blind, unlike the message gate', () => {
  it('an AIRBNB booking STILL raises the task (their room needs preparing)', async () => {
    await seedReturningGuest(['AC weak'], { source: 'Airbnb' });
    const result = await maybeCreateArrivalVerifyTask(deps(), '980');
    expect(result.created).toBe(true);
    expect((await rows())[0]?.kind).toBe('frontdesk');
  });
});

describe('🚨 CH-13b · idempotency and fail-closed delivery', () => {
  it('a second call raises NO second card — the deterministic request key collides', async () => {
    await seedReturningGuest();
    expect((await maybeCreateArrivalVerifyTask(deps(), '980')).created).toBe(true);
    expect(await maybeCreateArrivalVerifyTask(deps(), '980')).toEqual({
      created: false,
      reason: 'already_created',
    });
    expect(await rows()).toHaveLength(1);
  });

  it('an EMPTY roster still creates the task but it is notify_failed — fail-closed', async () => {
    await seedReturningGuest();
    const result = await maybeCreateArrivalVerifyTask(deps({ roster: EMPTY_ROSTER }), '980');
    expect(result.created).toBe(true);
    const [task] = await rows();
    // The task EXISTS (the room still needs prep), but nobody was reached, so it
    // is notify_failed and licenses no claim — exactly the CH-13a contract.
    expect(task?.assigned_phone).toBeNull();
    expect(task?.status).toBe('notify_failed');
  });
});
