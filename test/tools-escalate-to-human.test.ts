/**
 * escalate_to_human (CH-14a) — against REAL Postgres, because the request-key
 * idempotency and the task rows ARE the contract.
 *
 * Phone decade 9xx (+9177009009xx) is CH-14's claim in the test-number ledger
 * (0xx CH-01..08, 2xx/3xx CH-09, 4xx CH-10, 5xx CH-11, 6xx CH-12, 8xx CH-13).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { escalateToHumanTool } from '../src/brain/tools/escalateToHuman.js';
import type { ToolContext, ToolEscalationContext } from '../src/brain/tools/registry.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import type { Task } from '../src/db/tasks.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900901';
const FRONTDESK = '+917700900902';
// 15:20 IST = day; 23:10 IST = night (window 20:00→10:00).
const DAY = new Date('2026-07-17T09:50:00Z');
const NIGHT = new Date('2026-07-17T17:40:00Z');

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 3, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE tasks, messages, conversations, guests CASCADE`);
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
});

interface Harness {
  ctx: ToolContext;
  esc: ToolEscalationContext;
  notified: Task[];
}

const harness = (over: Partial<ToolEscalationContext> & { delivered?: boolean } = {}): Harness => {
  const notified: Task[] = [];
  const esc: ToolEscalationContext = {
    db,
    conversationId,
    guestId,
    guestFirstName: 'Rahul',
    requestCursorId: 'm-1',
    nightStart: '20:00',
    nightEnd: '10:00',
    now: DAY,
    assign: vi.fn(() => ({ phone: FRONTDESK, member: { name: 'Meera' }, via: 'role' })),
    notify: vi.fn(async (t: Task) => {
      notified.push(t);
      return { delivered: over.delivered ?? true };
    }),
    recentContext: vi.fn(async () => 'Guest: the AC in Apartment 09 is broken · Us: one moment'),
    raised: { count: 0 },
    ...over,
  };
  const ctx = { log: { error: () => {}, warn: () => {} }, escalation: esc } as unknown as ToolContext;
  return { ctx, esc, notified };
};

async function rows(): Promise<Task[]> {
  return db.select().from(schema.tasks).orderBy(schema.tasks.openedAt) as unknown as Promise<Task[]>;
}

const run = (ctx: ToolContext, input: Record<string, unknown> = {}) =>
  escalateToHumanTool.handler({ reason: 'outside_kb', ...input }, ctx);

describe('escalate_to_human — DAY', () => {
  it('raises an escalation task, sends the card, and returns queued_for:now', async () => {
    const h = harness();
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true, data: { queued_for: 'now' } });
    expect(h.esc.assign).toHaveBeenCalledWith('escalation', null);
    expect(h.notified).toHaveLength(1);
    const [row] = await rows();
    expect(row).toMatchObject({
      kind: 'escalation',
      origin: 'guest',
      status: 'open',
      slaMinutes: 10,
      assignedPhone: FRONTDESK,
    });
    // The guest's own words (a house included) reach the card via the detail.
    expect(row?.detail).toContain('Apartment 09');
  });

  it('an UNDELIVERED card → ok:false NOT_NOTIFIED, and the task stays OPEN for the ladder', async () => {
    const h = harness({ delivered: false });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'NOT_NOTIFIED' });
    // 🚨 Deliberately NOT notify_failed (unlike create_staff_task): the ladder
    // must be able to retry rung 1.
    const [row] = await rows();
    expect(row?.status).toBe('open');
  });

  it('data stays BARE — no guest words reach the model', async () => {
    const h = harness();
    const result = await run(h.ctx, { summary: 'the AC in Apartment 09 is broken' });
    expect(JSON.stringify(result)).not.toContain('Apartment');
    expect(JSON.stringify(result)).not.toContain('AC');
  });
});

describe('escalate_to_human — NIGHT', () => {
  it('queues a night_queue task with a morning deadline and sends NO card', async () => {
    const h = harness({ now: NIGHT });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true, data: { queued_for: 'morning' } });
    expect(h.notified).toHaveLength(0);
    const [row] = await rows();
    expect(row?.kind).toBe('night_queue');
    // The deadline is a future 10:00 IST instant — so findOverdueTasks does not
    // select it overnight.
    expect(row?.slaDeadline.getTime()).toBeGreaterThan(NIGHT.getTime());
  });
});

describe('escalate_to_human — idempotency + caps', () => {
  it('a retried turn (same requestCursorId) makes ONE task, not two', async () => {
    const h = harness();
    await run(h.ctx);
    const second = await run(h.ctx); // GATE 0 replays
    expect(second).toMatchObject({ ok: true, data: { replayed: true } });
    expect(await rows()).toHaveLength(1);
  });

  it('refuses a SECOND distinct escalation in one turn (cap 1)', async () => {
    const h = harness({ raised: { count: 1 }, requestCursorId: 'm-2' });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(await rows()).toHaveLength(0);
  });

  it('refuses when the context is unwired (no guest identity)', async () => {
    const ctx = { log: { error: () => {}, warn: () => {} } } as unknown as ToolContext;
    const result = await run(ctx);
    expect(result).toMatchObject({ ok: false, error: 'INVALID' });
  });
});
