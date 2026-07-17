/**
 * create_staff_task's gates — against REAL Postgres.
 *
 * 🚨 THIS SUITE USED A HAND-ROLLED FAKE `db`, AND THAT WAS THE ROOT CAUSE OF
 * THREE BLOCKERS. Its `update()` pushed to an array and ran no SQL, so
 * `appendToTask` — which threw `could not determine data type of parameter $1`
 * on EVERY call, against every branch — passed 33 green tests. Both append
 * paths (GATE 3's near-duplicate and GATE 4's at-cap) were dead in production
 * from the moment they were written, and two "fixes" written on top of them
 * were fiction. `request_key` was likewise never exercised: its unique
 * constraint existed and nothing tested it.
 *
 * The fake could not fail, so it could not falsify anything. Every DB call here
 * now goes through the real driver, on the real schema, against the same
 * `nistula_test` the rest of the DB suites use.
 *
 * Phone decade 8xx is CH-13a's claim in the test-number ledger.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStaffTaskTool, similar } from '../src/brain/tools/createStaffTask.js';
import type { ToolContext, ToolTaskContext } from '../src/brain/tools/registry.js';
import type { DescribedStay } from '../src/brain/stayView.js';
import { insertTask, type Task } from '../src/db/tasks.js';
import { upsertMirrorRow } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const TODAY = '2026-07-17';
const NOW = new Date('2026-07-17T09:50:00Z');
const GUEST = '+917700900831';
const ANITA = '+917700900832';

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;
/** A REAL bookings_mirror row. tasks.booking_id has a real FK, so a made-up id
 * throws 23503 — which the fake db happily accepted. */
let bookingId: string;

const stay = (over: Partial<DescribedStay> = {}): DescribedStay => ({
  describable: true,
  bookingId,
  reservationNo: '972',
  villa: 'Nistula Apartment',
  isUnit: false,
  checkIn: '2026-07-15',
  checkOut: '2026-07-20',
  adults: 2,
  children: 0,
  status: 'confirmed',
  live: true,
  ...over,
});

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 3, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE tasks, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
  );
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
  const { row } = await upsertMirrorRow(db, {
    ezeeReservationNo: '972',
    ezeeBookingTranId: 't1',
    guestName: 'Rahul',
    guestPhone: GUEST,
    guestEmail: null,
    roomTypeId: '5220300000000000001',
    roomTypeName: 'Nistula Apartment',
    physicalRoomLabel: null,
    rateplanId: null,
    checkIn: '2026-07-15',
    checkOut: '2026-07-20',
    adults: 2,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: null,
    currency: 'INR',
    raw: {},
  });
  bookingId = row.id;
});

/** Seeds a REAL task row — what a previous turn (or attempt) left behind. */
async function seedTask(over: Partial<Parameters<typeof insertTask>[1]> = {}): Promise<Task> {
  return insertTask(db, {
    conversationId,
    guestId,
    bookingId: null,
    villaLabel: 'Apartment 06',
    kind: 'housekeeping',
    summary: '2 extra towels',
    detail: null,
    assignedPhone: ANITA,
    requestKey: null,
    now: NOW,
    ...over,
  });
}

interface Harness {
  ctx: ToolContext;
  notified: Task[];
  tasks: ToolTaskContext;
}

const harness = (over: Partial<ToolTaskContext> & { delivered?: boolean } = {}): Harness => {
  const notified: Task[] = [];
  const tasks: ToolTaskContext = {
    db,
    conversationId,
    guestId,
    guestFirstName: 'Rahul',
    sourceMessageId: 'm-1',
    stays: [stay()],
    today: TODAY,
    now: NOW,
    ezee: vi.fn(async () => ({ resolved: true as const, label: 'Apartment 06', roomId: 'r' })),
    assign: vi.fn(() => ({ phone: ANITA, member: { name: 'Anita' }, via: 'role_and_villa' })),
    notify: vi.fn(async (t: Task) => {
      notified.push(t);
      return { delivered: over.delivered ?? true };
    }),
    created: { count: 0 },
    ...over,
  };
  const ctx = { log: { error: () => {}, warn: () => {} }, tasks } as unknown as ToolContext;
  return { ctx, notified, tasks };
};

/** The task rows that actually exist, newest first. */
async function rows(): Promise<Task[]> {
  return db.select().from(schema.tasks).orderBy(schema.tasks.openedAt) as unknown as Promise<Task[]>;
}

const run = (ctx: ToolContext, input: Record<string, unknown> = {}) =>
  createStaffTaskTool.handler(
    { kind: 'housekeeping', summary: '2 extra towels', ...input },
    ctx,
  );

describe('create_staff_task — the happy path', () => {
  it('raises, routes off the FRESH door, and returns the short id + assignee', async () => {
    const h = harness();
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true, data: { assignee: 'Anita' } });
    // The short id is what a human types back, so pin its shape: 6 chars of
    // Crockford base32.
    expect((result as { data: { shortId: string } }).data.shortId).toMatch(/^[0-9A-HJ-KM-NP-TV-Z]{6}$/);
    // The door came from eZee, keyed on the stay's reservation number — never
    // from a model argument and never from the mirror's stale label.
    expect(h.tasks.ezee).toHaveBeenCalledWith('972');
    expect(h.tasks.assign).toHaveBeenCalledWith('housekeeping', 'Apartment 06');
    const [row] = await rows();
    expect(row).toMatchObject({ villaLabel: 'Apartment 06', kind: 'housekeeping', status: 'open' });
  });

  it('🚨 has NO villa_label parameter — a model cannot supply a house at all', () => {
    // §6.4's signature is struck through: a model-supplied villa is the model
    // guessing a house. The schema is the enforcement.
    const shape = (createStaffTaskTool.inputSchema as unknown as { shape: Record<string, unknown> }).shape;
    expect(Object.keys(shape).sort()).toEqual(['detail', 'kind', 'summary']);
  });

  it('data stays BARE — no summary, no villa, no phone reaches the model', async () => {
    const h = harness();
    const result = await run(h.ctx, { summary: 'towels please' });
    expect(JSON.stringify(result)).not.toContain('towels');
    expect(JSON.stringify(result)).not.toContain('+9177');
    expect(JSON.stringify(result)).not.toContain('Apartment');
  });

  it('falls back to the villa TYPE when the door will not resolve, and still raises', async () => {
    const h = harness({ ezee: vi.fn(async () => ({ resolved: false as const, reason: 'unreadable' as const })) });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true });
    // A guest's towels must not depend on eZee being up. But the card must SAY
    // the house is unconfirmed rather than quietly printing a type that names
    // three houses — the review found that line was unreachable.
    const [row] = await rows();
    expect(row).toMatchObject({
      villaLabel: 'Nistula Apartment — house not confirmed, check eZee',
    });
    expect(h.tasks.assign).toHaveBeenCalledWith(
      'housekeeping',
      'Nistula Apartment — house not confirmed, check eZee',
    );
  });

  it('raises even with no eZee client at all', async () => {
    const h = harness({ ezee: null });
    expect(await run(h.ctx)).toMatchObject({ ok: true });
  });
});

describe('🚨 create_staff_task — DELIVERY IS THE CONTRACT', () => {
  it('an undelivered card is ok:FALSE — the task exists, the promise does not', async () => {
    // CH-12's blocker #5, held by construction: covered() gates on
    // run.result.ok, so ok:false is what stops guardrail 2 licensing C1/C2.
    // "housekeeping is on their way" claims a PERSON IS MOVING, and none is.
    const h = harness({ delivered: false });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'NOT_NOTIFIED' });
    // The task was still RAISED — it is real work from a real guest.
    expect(await rows()).toHaveLength(1);
    expect(h.notified).toHaveLength(1);
    // The flip to `notify_failed` is the NOTIFIER's job, not the tool's (this
    // harness stubs `notify`), and staff-notifier.test.ts asserts it there.
    // The tool's contract is narrower and is what is asserted here: it reports
    // ok:false, so guardrail 2 licenses nothing.
  });

  it('an undelivered card tells the model to bring the team in, not to claim', async () => {
    const h = harness({ delivered: false });
    const result = await run(h.ctx);
    expect((result as { message: string }).message).toMatch(/do NOT say it has been logged/i);
    expect((result as { message: string }).message).toMatch(/bringing the team in/i);
  });

  it('🚨 an undelivered card DOES burn the per-turn allowance', async () => {
    // This test used to assert the OPPOSITE, and it was asserting the bug.
    // The pre-push review reproduced the consequence: with the latch counting
    // only successes, a deterministic failure (an empty roster, or a staff
    // window shut >24h — both DEFAULT states today) let one turn insert 6 rows
    // and page ops 6 times against a cap of 2. Every retry was certain to fail
    // again, and `notify_failed` is invisible to GATES 3/4, so nothing else
    // could see the orphans. The latch counts ATTEMPTS.
    const h = harness({ delivered: false });
    await run(h.ctx);
    expect(h.tasks.created.count).toBe(1);
  });

  it('🚨 a turn cannot spray orphan tasks when the roster is unreachable', async () => {
    const h = harness({ delivered: false });
    for (let i = 0; i < 6; i += 1) await run(h.ctx, { summary: `towels ${String(i)}` });
    expect((await rows()).length).toBeLessThanOrEqual(2);
    expect(h.notified.length).toBeLessThanOrEqual(2);
  });
});

describe('🚨 create_staff_task — GATE 0, the retry key (real Postgres)', () => {
  const KEY = () => `${conversationId}:m-1:housekeeping`;

  it('a retry finds its own previous task instead of raising a second one', async () => {
    // The tool runs PRE-claim, so a converse() failure later in the turn makes
    // pg-boss retry the WHOLE loop. similar() cannot absorb that — a retry is a
    // fresh sample of a stochastic model. The key is deterministic, so it
    // collides instead. Seeded as a REAL row so the real unique index and the
    // real lookup are what answer.
    const prev = await seedTask({ requestKey: KEY(), summary: '2 extra towels' });
    const h = harness();
    const result = await run(h.ctx, { summary: 'more extra towels' });
    expect(result).toEqual({ ok: true, data: { shortId: prev.shortId, replayed: true } });
    expect(await rows()).toHaveLength(1);
    expect(h.notified).toHaveLength(0);
  });

  it('the replay answers from the EXISTING row status, not from optimism', async () => {
    const prev = await seedTask({ requestKey: KEY() });
    await db.execute(sql`UPDATE tasks SET status = 'notify_failed' WHERE id = ${prev.id}`);
    const h = harness();
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'NOT_NOTIFIED' });
    expect(await rows()).toHaveLength(1);
  });

  it('a resolved task is not evidence anyone is moving NOW', async () => {
    const prev = await seedTask({ requestKey: KEY() });
    await db.execute(sql`UPDATE tasks SET status = 'done' WHERE id = ${prev.id}`);
    const h = harness();
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'REFUSED' });
  });

  it('🚨 a SECOND, DIFFERENT ask of the same kind in one message reaches a human', async () => {
    // THE BLOCKER the decision audit found, and GATE 0's own doing. "Could we
    // get extra towels, and could someone change the bed linen?" makes TWO
    // housekeeping calls in one turn — which MAX_TASKS_PER_TURN=2 exists to
    // allow and the tool description invites ("towels, linen, cleaning,
    // amenities"). They share a key, so the second replayed ok:true, sent no
    // card and appended nothing: the model said "both are with housekeeping"
    // while the linen was INVISIBLE WORK.
    const prev = await seedTask({ requestKey: KEY(), summary: 'extra towels' });
    const h = harness();
    const result = await run(h.ctx, { summary: 'change the bed linen' });
    expect(result).toMatchObject({ ok: true, data: { appended: true, reason: 'same_message' } });
    // A card carries it, against the SAME short id — never a second row, never
    // a second SLA clock, never a second DONE.
    expect(h.notified).toHaveLength(1);
    expect(h.notified[0]?.summary).toContain('(also) change the bed linen');
    expect(await rows()).toHaveLength(1);
    // 🚨 AND THE APPEND REALLY LANDED. The fake db could not see that
    // appendToTask threw on every call; this reads the column back.
    const [row] = await rows();
    expect(row?.detail).toContain('change the bed linen');
    expect(row?.shortId).toBe(prev.shortId);
  });

  it('the key is per KIND — towels and a broken AC in one message are two errands', async () => {
    await seedTask({ requestKey: KEY(), summary: 'extra towels' });
    const h = harness();
    expect(await run(h.ctx, { kind: 'maintenance', summary: 'the AC is weak' })).toMatchObject({
      ok: true,
    });
    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all.find((t) => t.kind === 'maintenance')?.requestKey).toBe(
      `${conversationId}:m-1:maintenance`,
    );
  });

  it('no source message means no key, and the task still raises', async () => {
    // CH-13b's booking.created auto-tasks have no guest message behind them.
    const h = harness({ sourceMessageId: null });
    expect(await run(h.ctx)).toMatchObject({ ok: true });
    expect((await rows())[0]?.requestKey).toBeNull();
  });

  it('🚨 the unique index is real — two rows cannot share a request key', async () => {
    // The constraint existed and nothing tested it.
    await seedTask({ requestKey: KEY() });
    await expect(seedTask({ requestKey: KEY(), summary: 'something else' })).rejects.toThrow();
  });
});

describe('create_staff_task — GATE 1, the stage (asked of DATES)', () => {
  it('refuses a lead — nothing exists for the team to attend to', async () => {
    const h = harness({ stays: [] });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(await rows()).toHaveLength(0);
  });

  it('refuses a past guest', async () => {
    const h = harness({ stays: [stay({ checkIn: '2026-06-01', checkOut: '2026-06-05' })] });
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'REFUSED' });
  });

  it('allows in-house and pre-arrival', async () => {
    const inhouse = harness({ stays: [stay({ checkIn: '2026-07-15', checkOut: '2026-07-20' })] });
    expect(await run(inhouse.ctx)).toMatchObject({ ok: true });
    const arriving = harness({ stays: [stay({ checkIn: '2026-07-25', checkOut: '2026-07-28' })] });
    expect(await run(arriving.ctx)).toMatchObject({ ok: true });
  });

  it('🚨 allows an in-house guest whose status is `confirmed` — the DATE decides', async () => {
    // No production row is ever `checked_in` (a front-desk check-in never comes
    // down the queue), so a status-keyed gate would refuse EVERY real in-house
    // guest while passing every seeded test — on the exact scenario this chunk
    // exists for.
    const h = harness({ stays: [stay({ status: 'confirmed', checkIn: '2026-07-15', checkOut: '2026-07-20' })] });
    expect(await run(h.ctx)).toMatchObject({ ok: true });
  });
});

describe('create_staff_task — GATE 2, a house in the summary', () => {
  it.each([
    ['towels for Apartment 09', 'summary'],
    ['the AC in Villa B3 is weak', 'summary'],
  ])('refuses %s — an unverified house may not compete with the resolved door', async (summary) => {
    const h = harness();
    const result = await run(h.ctx, { summary });
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect((result as { message: string }).message).toMatch(/do not name a villa or apartment/i);
    expect(await rows()).toHaveLength(0);
  });

  it('refuses a house hidden in the detail too', async () => {
    const h = harness();
    expect(await run(h.ctx, { detail: 'guest says they are in Apartment 11' })).toMatchObject({
      ok: false,
      error: 'REFUSED',
    });
  });

  it('allows a villa TYPE and ordinary prose', async () => {
    const h = harness();
    expect(await run(h.ctx, { summary: 'extra towels for the apartment' })).toMatchObject({ ok: true });
  });
});

describe('create_staff_task — GATES 3 and 4, duplicates and the cap (real Postgres)', () => {
  it('🚨 a near-duplicate APPENDS, and the append REALLY LANDS', async () => {
    const prev = await seedTask({ summary: '2 extra towels please', villaLabel: 'Apartment 06' });
    const h = harness();
    const result = await run(h.ctx, { summary: 'more extra towels please' });
    expect(result).toMatchObject({ ok: true, data: { appended: true, reason: 'duplicate' } });
    expect(await rows()).toHaveLength(1);
    // A card DOES go out — inverted from my first cut, which asserted "no second
    // buzz". That holds only for a GENUINE repeat; this path is also reached by
    // similar()'s false merges and by the at-cap rule, where the ask is
    // DIFFERENT. An un-carded ask is invisible work.
    expect(h.notified).toHaveLength(1);
    expect(h.notified[0]?.summary).toContain('(also)');
    // 🚨 The column, read back. appendToTask threw on EVERY call in
    // production while 33 green tests watched a fake that ran no SQL.
    const [row] = await rows();
    expect(row?.detail).toContain('more extra towels please');
    expect(row?.id).toBe(prev.id);
  });

  it('appends onto EXISTING detail without losing it', async () => {
    await seedTask({ summary: 'towels', detail: 'guest asked at reception too' });
    const h = harness();
    await run(h.ctx, { summary: 'more towels' });
    const [row] = await rows();
    expect(row?.detail).toContain('guest asked at reception too');
    expect(row?.detail).toContain('more towels');
  });

  it('the duplicate check keys on the DERIVED villa, not an argument', async () => {
    // Same words, different house means a genuinely different task.
    await seedTask({ summary: '2 extra towels', villaLabel: 'Villa B3' });
    const h = harness();
    expect(await run(h.ctx, { summary: '2 extra towels' })).toMatchObject({ ok: true });
    expect(await rows()).toHaveLength(2);
  });

  it('a different KIND with similar words is not a duplicate', async () => {
    await seedTask({ kind: 'maintenance', summary: 'the towel rail is broken' });
    const h = harness();
    expect(await run(h.ctx, { kind: 'housekeeping', summary: 'towel rail towels' })).toMatchObject({
      ok: true,
    });
    expect(await rows()).toHaveLength(2);
  });

  it('at the 3-open cap, a same-kind ask appends', async () => {
    await seedTask({ kind: 'housekeeping', summary: 'towels', villaLabel: 'Apartment 06' });
    await seedTask({ kind: 'maintenance', summary: 'ac' });
    await seedTask({ kind: 'frontdesk', summary: 'taxi' });
    const h = harness();
    expect(await run(h.ctx, { kind: 'housekeeping', summary: 'a bathrobe as well' })).toMatchObject({
      ok: true,
      data: { appended: true, reason: 'at_cap' },
    });
    expect(await rows()).toHaveLength(3);
    expect((await rows()).find((t) => t.summary === 'towels')?.detail).toContain('bathrobe');
  });

  it('at the cap, a NEW kind refuses and points at a human', async () => {
    await seedTask({ kind: 'housekeeping', summary: 'towels' });
    await seedTask({ kind: 'housekeeping', summary: 'linen' });
    await seedTask({ kind: 'housekeeping', summary: 'soap' });
    const h = harness();
    const result = await run(h.ctx, { kind: 'maintenance', summary: 'the AC is broken' });
    // Three open tasks plus a fourth different problem is a guest who needs a
    // person, not another card.
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect((result as { message: string }).message).toMatch(/bring the team in/i);
  });
});

describe('create_staff_task — the per-turn latch', () => {
  it('caps raises across the turn, so a guardrail regenerate cannot double-buzz', async () => {
    // The tool loop RE-RUNS on a regenerate, sharing this context object — the
    // CH-09 lesson, applied to a side effect a human can hear.
    const h = harness({ created: { count: 2 } });
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(await rows()).toHaveLength(0);
  });

  it('refuses when the turn carries no task context at all', async () => {
    const result = await createStaffTaskTool.handler(
      { kind: 'housekeeping', summary: 'towels' },
      { log: { error: () => {} } } as unknown as ToolContext,
    );
    expect(result).toMatchObject({ ok: false, error: 'INVALID' });
  });
});

describe('similar — "near enough" (§6.4)', () => {
  it.each([
    ['2 extra towels', 'more extra towels', true],
    ['2 extra towels please', 'extra towels', true],
    ['the AC is weak', 'need extra pillows', false],
    ['towels', 'the shower is leaking badly', false],
  ])('%s vs %s → %s', (a, b, expected) => {
    expect(similar(a, b)).toBe(expected);
  });
});
