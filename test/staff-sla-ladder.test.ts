/**
 * The escalation SLA LADDER (CH-14a step 4) — against REAL Postgres, because the
 * rung is a guarded UPDATE on nudge_count and a fake would prove nothing.
 *
 * The scenario-4 clock: an escalation re-pings the front desk at its 10-min
 * deadline (rung 0), then cc's OPS ten minutes later (rung 1), then stops. A DONE
 * or a takeover-cancel mid-ladder wins. Generic kinds keep their one-shot; a
 * night_queue task is never nudged.
 *
 * Phone decade 9xx is CH-14's claim in the test-number ledger.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import {
  closeTaskByShortId,
  cancelLiveEscalationsForConversation,
  findTaskByShortId,
  insertTask,
  type Task,
  type TaskKind,
} from '../src/db/tasks.js';
import { runSlaNudger } from '../src/staff/sla.js';
import type { Roster } from '../src/staff/roster.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900911';
const LEAD = '+917700900913';
const OWNER = '+917700900915';

const ROSTER: Roster = {
  members: [{ name: 'Meera', phone: LEAD, role: 'frontdesk', villas: [] }],
  opsNumbers: [OWNER],
};

const T0 = new Date('2026-07-17T06:00:00Z');
const at = (mins: number): Date => new Date(T0.getTime() + mins * 60_000);

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

const carded: { to: string; key: string }[] = [];
const wa = {
  sendTemplated: vi.fn(
    async (to: string, msg: { key: string }) => {
      carded.push({ to, key: msg.key });
      return { ok: true as const, messageId: 'm', waMessageId: 'wamid.y', usedTemplate: false };
    },
  ),
};
const log = { error: () => {}, info: () => {} };

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 2, onnotice: () => {} });
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
  carded.length = 0;
  wa.sendTemplated.mockClear();
});

const deps = (now: Date) => ({ db, log, wa, roster: ROSTER, opsNumbers: ROSTER.opsNumbers, now: () => now });

async function seed(kind: TaskKind, over: Partial<Parameters<typeof insertTask>[1]> = {}): Promise<Task> {
  return insertTask(db, {
    conversationId,
    guestId,
    bookingId: null,
    villaLabel: null,
    kind,
    summary: 'the AC in Apartment 09 is weak',
    detail: 'Guest: the AC in Apartment 09 is weak · Us: one moment',
    assignedPhone: LEAD,
    requestKey: null,
    origin: 'guest',
    now: T0,
    ...over,
  });
}

async function reload(id: string): Promise<Task | null> {
  const [row] = await db.select().from(schema.tasks).where(sql`id = ${id}`);
  return (row as Task | undefined) ?? null;
}

async function nudgeRows(): Promise<number> {
  const rows = await db.select().from(schema.messages);
  return rows.filter((r) => (r.raw as { contextKind?: string } | null)?.contextKind === 'sla_nudge').length;
}

describe('escalation ladder — two rungs then stop (scenario 4)', () => {
  it('does not nudge before the deadline', async () => {
    const task = await seed('escalation'); // slaDeadline = T0 + 10m
    await runSlaNudger(deps(at(5)));
    expect(carded).toHaveLength(0);
    expect((await reload(task.id))?.nudgeCount).toBe(0);
  });

  it('rung 0 at +10m re-pings the front desk (no OPS), stays OPEN, writes evidence', async () => {
    const task = await seed('escalation');
    await runSlaNudger(deps(at(10)));
    // Escalation re-pings use the escalation card (house-legal), to the lead.
    expect(carded).toEqual([{ to: LEAD, key: 'escalation_card' }]);
    const row = await reload(task.id);
    expect(row?.nudgeCount).toBe(1);
    expect(row?.status).toBe('open'); // intermediate rung → still open
    expect(await nudgeRows()).toBe(1);
  });

  it('rung 1 waits for +20m, then cc\'s OPS and closes the ladder as nudged', async () => {
    const task = await seed('escalation');
    await runSlaNudger(deps(at(10))); // rung 0
    carded.length = 0;
    await runSlaNudger(deps(at(15))); // rung 1 not due yet
    expect(carded).toHaveLength(0);
    await runSlaNudger(deps(at(20))); // rung 1
    expect(new Set(carded.map((c) => c.to))).toEqual(new Set([LEAD, OWNER]));
    const row = await reload(task.id);
    expect(row?.nudgeCount).toBe(2);
    expect(row?.status).toBe('nudged'); // final rung → nudged
    // No rung 3.
    carded.length = 0;
    await runSlaNudger(deps(at(30)));
    expect(carded).toHaveLength(0);
  });

  it('a DONE mid-ladder wins — no second rung fires', async () => {
    const task = await seed('escalation');
    await runSlaNudger(deps(at(10))); // rung 0
    await closeTaskByShortId(db, task.shortId, LEAD, at(12));
    carded.length = 0;
    await runSlaNudger(deps(at(20)));
    expect(carded).toHaveLength(0);
    expect((await reload(task.id))?.status).toBe('done');
  });

  it('a takeover-cancel mid-ladder wins — no second rung fires', async () => {
    const task = await seed('escalation');
    await runSlaNudger(deps(at(10))); // rung 0
    await cancelLiveEscalationsForConversation(db, conversationId);
    carded.length = 0;
    await runSlaNudger(deps(at(20)));
    expect(carded).toHaveLength(0);
    expect((await reload(task.id))?.status).toBe('cancelled');
  });
});

describe('other kinds are unchanged by the ladder', () => {
  it('a generic housekeeping task keeps its ONE-SHOT nudge', async () => {
    const task = await seed('housekeeping'); // slaDeadline = T0 + 30m
    await runSlaNudger(deps(at(30))); // rung 0 → nudged (one rung)
    const row = await reload(task.id);
    expect(row?.nudgeCount).toBe(1);
    expect(row?.status).toBe('nudged');
    // A housekeeping re-ping uses the task card, not the escalation card.
    expect(carded).toEqual([{ to: LEAD, key: 'task_card' }]);
    carded.length = 0;
    await runSlaNudger(deps(at(90)));
    expect(carded).toHaveLength(0); // nudged tasks are never re-selected
  });

  it('a night_queue task is NEVER nudged (CH-14b owns it)', async () => {
    // A morning deadline in the past would make it overdue — the ladder must
    // still skip it (RUNGS.night_queue is empty).
    const task = await seed('night_queue', { slaDeadline: at(-60) });
    await runSlaNudger(deps(at(0)));
    expect(carded).toHaveLength(0);
    const row = await findTaskByShortId(db, task.shortId);
    expect(row?.nudgeCount).toBe(0);
    expect(row?.status).toBe('open');
  });
});
