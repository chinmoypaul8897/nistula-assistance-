/**
 * The DONE loop and the SLA nudger — real Postgres, because the guarded
 * UPDATEs ARE the contract and a fake would prove nothing about them.
 *
 * Phone decade 8xx (+9177009008xx) is CH-13a's claim in the test-number
 * ledger (0xx CH-01..08, 2xx/3xx CH-09, 4xx CH-10, 5xx CH-11, 6xx CH-12).
 * Reusing another chunk's number makes the worker silently no-op — a recorded
 * debugging trap.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import {
  findTaskByShortId,
  getLiveTasksForGuest,
  insertTask,
  type Task,
} from '../src/db/tasks.js';
import { handleStaffCommand, parseStaffCommand } from '../src/staff/commands.js';
import { runSlaNudger } from '../src/staff/sla.js';
import type { Roster } from '../src/staff/roster.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900801';
const ANITA = '+917700900802';
const MEERA = '+917700900803';
const STRANGER = '+917700900804';

const ROSTER: Roster = {
  members: [
    { name: 'Anita', phone: ANITA, role: 'housekeeping', villas: ['Villa B3'] },
    { name: 'Meera', phone: MEERA, role: 'frontdesk', villas: [] },
  ],
  opsNumbers: [],
};

let sqlClient: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

const NOW = new Date('2026-07-17T10:00:00Z');

const sent: { to: string; body: string; conversationId: string | null }[] = [];
const carded: string[] = [];
const wa = {
  sendText: vi.fn(async (to: string, body: string, opts: { conversationId: string | null }) => {
    sent.push({ to, body, conversationId: opts.conversationId });
    return { ok: true as const, messageId: 'm', waMessageId: 'wamid.x' };
  }),
  // Returns the UNION so a test may override with a FAILURE — the only way to
  // assert the rule that matters (an undelivered nudge writes no evidence).
  sendTemplated: vi.fn(
    async (
      to: string,
    ): Promise<
      | { ok: true; messageId: string; waMessageId: string; usedTemplate: boolean }
      | { ok: false; messageId: null; error: string; usedTemplate: boolean; retryable: boolean }
    > => {
      carded.push(to);
      return { ok: true, messageId: 'm', waMessageId: 'wamid.y', usedTemplate: false };
    },
  ),
};
const alerts: Record<string, unknown>[] = [];
const log = {
  error: (o: Record<string, unknown>) => alerts.push(o),
  info: () => {},
};

const deps = () => ({ db, log, wa, roster: ROSTER, now: () => NOW });

async function seedTask(over: Partial<Parameters<typeof insertTask>[1]> = {}): Promise<Task> {
  return insertTask(db, {
    conversationId,
    guestId,
    bookingId: null,
    villaLabel: 'Villa B3',
    kind: 'housekeeping',
    summary: '2 extra towels',
    detail: null,
    assignedPhone: ANITA,
    requestKey: null,
    now: NOW,
    ...over,
  });
}

beforeAll(async () => {
  sqlClient = postgres(TEST_URL, { max: 2 });
  db = drizzle(sqlClient, { schema }) as unknown as Db;
});

afterAll(async () => {
  await sqlClient.end();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE tasks, messages, conversations, guests RESTART IDENTITY CASCADE`);
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
  sent.length = 0;
  carded.length = 0;
  alerts.length = 0;
  wa.sendText.mockClear();
  wa.sendTemplated.mockClear();
});

describe('parseStaffCommand — what a human actually types', () => {
  it.each([
    ['DONE A3F2K9', 'A3F2K9'],
    ['done a3f2k9', 'a3f2k9'],
    ['Done #A3F2K9', 'A3F2K9'],
    ['DONE A3F2K9.', 'A3F2K9'],
    ['  DONE   A3F2K9  ', 'A3F2K9'],
  ])('%s parses as a DONE', (text, shortId) => {
    expect(parseStaffCommand(text)).toEqual({ kind: 'done', shortId });
  });

  it.each(['TASKS', 'tasks', 'Tasks?'])('%s parses as a TASKS', (text) => {
    expect(parseStaffCommand(text)).toEqual({ kind: 'tasks' });
  });

  it.each([
    'done',
    'I am done for the day',
    'the towels are DONE A3F2K9 by the way',
    'DONE',
    '',
    null,
  ])('%s is NOT a command — we never guess at what they meant', (text) => {
    expect(parseStaffCommand(text)).toEqual({ kind: 'unknown' });
  });
});

describe('DONE — the close', () => {
  it('closes the task, records who, and tells the guest', async () => {
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });

    const after = await findTaskByShortId(db, task.shortId);
    expect(after?.status).toBe('done');
    expect(after?.closedBy).toBe(ANITA);
    expect(after?.closedAt).not.toBeNull();

    // The guest hears about it, on their conversation, in voice.
    const toGuest = sent.find((s) => s.to === GUEST);
    expect(toGuest?.conversationId).toBe(conversationId);
    expect(toGuest?.body).toContain('2 extra towels');
    expect(toGuest?.body).not.toContain('!');
    // And the staff member gets an acknowledgement.
    expect(sent.find((s) => s.to === ANITA)?.body).toContain(task.shortId);
  });

  it('writes the task_done evidence row that licenses the AI’s next reply', async () => {
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    const rows = await db.execute(
      sql`SELECT raw->>'contextKind' AS kind, sender FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...rows]).toEqual([{ kind: 'task_done', sender: 'system' }]);
  });

  it('is case-insensitive — a lowercase reply is a correct human', async () => {
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `done ${task.shortId.toLowerCase()}` });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('done');
  });

  it('🚨 a REPLAYED DONE closes once and messages the guest ONCE', async () => {
    // The webhook's wa_message_id dedupe is the first guard; this is the second,
    // for a genuine race. Only the caller that changed the row proceeds.
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    const afterFirst = sent.filter((s) => s.to === GUEST).length;
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    expect(sent.filter((s) => s.to === GUEST)).toHaveLength(afterFirst);

    const rows = await db.execute(
      sql`SELECT count(*)::int AS n FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...rows]).toEqual([{ n: 1 }]);
  });

  it('two staff racing the same DONE close it once', async () => {
    const task = await seedTask();
    await Promise.all([
      handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` }),
      handleStaffCommand(deps(), { phone: MEERA, body: `DONE ${task.shortId}` }),
    ]);
    expect(sent.filter((s) => s.to === GUEST)).toHaveLength(1);
  });

  it('“already closed” and “unknown id” stay DIFFERENT facts', async () => {
    // A human who typed a real id and got "unknown" would retype it for ever.
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    sent.length = 0;
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    expect(sent[0]?.body).toMatch(/already closed/i);

    sent.length = 0;
    await handleStaffCommand(deps(), { phone: ANITA, body: 'DONE ZZZZZZ' });
    expect(sent[0]?.body).toMatch(/no task/i);
    expect(sent[0]?.body).toMatch(/TASKS/);
  });

  it('🚨 stays SILENT when a human holds the thread (§6.7 line 1)', async () => {
    // The close line speaks OUT OF TURN — a staff DONE triggers it, not a guest
    // — so it is exactly the send §6.7's "human_active ⇒ AI silent" exists for.
    // CH-12 set the precedent in as many words; my first cut checked nothing.
    // The likeliest collision is the ugly one: a human took the thread over
    // BECAUSE of this task and is mid-reply when the AI cuts in with a receipt.
    const task = await seedTask();
    await db.execute(
      sql`UPDATE conversations SET human_active_until = now() + interval '2 hours' WHERE id = ${conversationId}`,
    );
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });

    // The task still closes and the staff member is still thanked...
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('done');
    expect(sent.find((s) => s.to === ANITA)).toBeDefined();
    // ...but the guest hears nothing from the AI.
    expect(sent.filter((s) => s.to === GUEST)).toHaveLength(0);

    // And the evidence row IS still written, so whenever the AI next speaks it
    // is licensed to say the work is done — the fact happened either way.
    const rows = await db.execute(
      sql`SELECT raw->>'contextKind' AS kind FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...rows]).toEqual([{ kind: 'task_done' }]);
  });

  it('a task with no conversation closes without trying to message anyone', async () => {
    const task = await seedTask({ conversationId: null, guestId: null });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('done');
    expect(sent.filter((s) => s.to === GUEST)).toHaveLength(0);
  });
});

describe('TASKS — the list', () => {
  it('lists only that member’s live tasks', async () => {
    await seedTask({ summary: 'towels', assignedPhone: ANITA });
    await seedTask({ summary: 'a taxi at eight', assignedPhone: MEERA, kind: 'frontdesk' });
    await handleStaffCommand(deps(), { phone: ANITA, body: 'TASKS' });
    expect(sent[0]?.body).toContain('towels');
    expect(sent[0]?.body).not.toContain('taxi');
  });

  it('says so plainly when nothing is open', async () => {
    await handleStaffCommand(deps(), { phone: STRANGER, body: 'TASKS' });
    expect(sent[0]?.body).toMatch(/nothing open/i);
  });
});

describe('unknown staff text', () => {
  it('is stored by the webhook and does nothing here — never AI-processed', async () => {
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: 'ok will do in ten minutes' });
    expect(sent).toHaveLength(0);
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('open');
  });
});

describe('the SLA nudger', () => {
  const slaDeps = (now: Date) => ({ db, log, wa, roster: ROSTER, now: () => now });
  const LATE = new Date('2026-07-17T10:31:00Z'); // 31 min after NOW; housekeeping SLA is 30

  it('🚨 CH-13b · an escalation-kind task nudges at its 10-min SLA (the groundwork)', async () => {
    // CH-13b's escalation-SLA "groundwork" is the escalation:10 constant (shipped
    // CH-13a) + the kind-blind nudger: an escalation task overdue at 10 min is
    // nudged like any other. The 10/20-min re-ping LADDER is CH-14; this proves
    // the first rung is wired.
    const task = await seedTask({ kind: 'escalation', assignedPhone: MEERA });
    const tenMin = new Date(NOW.getTime() + 11 * 60_000); // 11 > the 10-min SLA
    expect(await runSlaNudger(slaDeps(tenMin))).toEqual({ considered: 1, nudged: 1 });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('nudged');
    // And it is NOT yet overdue at 9 minutes — the deadline is real.
    const nine = new Date(NOW.getTime() + 9 * 60_000);
    const fresh = await seedTask({ kind: 'escalation', assignedPhone: MEERA });
    expect((await runSlaNudger(slaDeps(nine))).nudged).toBe(0);
    expect((await findTaskByShortId(db, fresh.shortId))?.status).toBe('open');
  });

  it('nudges an overdue task, re-pings the assignee and ccs the lead', async () => {
    const task = await seedTask();
    const run = await runSlaNudger(slaDeps(LATE));
    expect(run).toEqual({ considered: 1, nudged: 1 });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('nudged');
    expect(carded).toContain(ANITA);
    expect(carded).toContain(MEERA);
  });

  it('🚨 writes the sla_nudge row that makes "I’ve nudged housekeeping" true', async () => {
    // Scenario 3's exact line. Nothing else licenses it.
    await seedTask();
    await runSlaNudger(slaDeps(LATE));
    const rows = await db.execute(
      sql`SELECT raw->>'contextKind' AS kind FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...rows]).toEqual([{ kind: 'sla_nudge' }]);
  });

  it('leaves a task that is not yet overdue alone', async () => {
    await seedTask();
    const run = await runSlaNudger(slaDeps(new Date('2026-07-17T10:29:00Z')));
    expect(run).toEqual({ considered: 0, nudged: 0 });
  });

  it('🚨 nudges ONCE — a second tick cannot double-buzz a busy human', async () => {
    await seedTask();
    await runSlaNudger(slaDeps(LATE));
    wa.sendTemplated.mockClear();
    const second = await runSlaNudger(slaDeps(new Date('2026-07-17T10:40:00Z')));
    expect(second).toEqual({ considered: 0, nudged: 0 });
    expect(wa.sendTemplated).not.toHaveBeenCalled();
  });

  it('never nudges a done task', async () => {
    const task = await seedTask();
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    expect(await runSlaNudger(slaDeps(LATE))).toEqual({ considered: 0, nudged: 0 });
  });

  it('🚨 never nudges a notify_failed task — nobody was pinged, so nothing is a RE-ping', async () => {
    const task = await seedTask();
    await db.execute(sql`UPDATE tasks SET status = 'notify_failed' WHERE id = ${task.id}`);
    expect(await runSlaNudger(slaDeps(LATE))).toEqual({ considered: 0, nudged: 0 });
  });

  it('🚨 an UNDELIVERED nudge leaves the task OPEN so the next tick retries', async () => {
    // THE VERB. My first cut claimed the row (open→nudged) BEFORE sending and
    // never reverted on failure. The flip is TERMINAL — findOverdueTasks selects
    // only `open`, and nothing anywhere reopens — so the rung was permanently
    // consumed by a nudge that never happened, and block [5] then rendered
    // ", already chased once" into the prompt: a chase told to the model as
    // fact. A terminal verb on a mutable, RETRYABLE fact.
    const task = await seedTask();
    const shut = async () => ({
      ok: false as const,
      messageId: null,
      error: 'WINDOW_CLOSED_SIMULATED',
      usedTemplate: false,
      retryable: true,
    });
    wa.sendTemplated.mockImplementationOnce(shut).mockImplementationOnce(shut);
    expect(await runSlaNudger(slaDeps(LATE))).toEqual({ considered: 1, nudged: 0 });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('open');

    // And the next tick, with a reachable human, genuinely nudges it.
    expect(await runSlaNudger(slaDeps(LATE))).toEqual({ considered: 1, nudged: 1 });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('nudged');
  });

  it('🚨 an UNDELIVERED nudge writes NO evidence — "I nudged them" would be a lie', async () => {
    await seedTask();
    const shut = async () => ({
      ok: false as const,
      messageId: null,
      error: 'WINDOW_CLOSED_SIMULATED',
      usedTemplate: false,
      retryable: true,
    });
    wa.sendTemplated.mockImplementationOnce(shut).mockImplementationOnce(shut);
    await runSlaNudger(slaDeps(LATE));
    const rows = await db.execute(
      sql`SELECT count(*)::int AS n FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...rows]).toEqual([{ n: 0 }]);
    expect(alerts.some((a) => a.opsAlert === 'sla_nudge_undelivered')).toBe(true);
  });
});

describe('block [5] never sees a hole as work in hand', () => {
  it('getLiveTasksForGuest excludes notify_failed', async () => {
    const ok = await seedTask({ summary: 'towels' });
    const hole = await seedTask({ summary: 'a kettle' });
    await db.execute(sql`UPDATE tasks SET status = 'notify_failed' WHERE id = ${hole.id}`);
    const live = await getLiveTasksForGuest(db, guestId);
    expect(live.map((t) => t.shortId)).toEqual([ok.shortId]);
  });
});

describe('🚨 CH-13a · the DONE transaction rolls back as one (real Postgres)', () => {
  // Forced with a real trigger inside the real transaction rather than a mocked
  // tx: the thing under test IS Postgres's rollback, so faking it away would
  // leave the same hole the comment above closeTask says was reachable.
  beforeEach(async () => {
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION test_crash_on_evidence() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated process death'; END;
      $$ LANGUAGE plpgsql;`);
    await db.execute(sql`
      CREATE TRIGGER test_crash BEFORE INSERT ON messages FOR EACH ROW
      WHEN (NEW.body LIKE 'task closed:%') EXECUTE FUNCTION test_crash_on_evidence();`);
  });
  afterEach(async () => {
    await db.execute(sql`DROP TRIGGER IF EXISTS test_crash ON messages`);
    await db.execute(sql`DROP FUNCTION IF EXISTS test_crash_on_evidence()`);
  });

  it('a death between the claim and the evidence leaves the task OPEN for the retry', async () => {
    // The state the single transaction exists to make unreachable: task `done`,
    // NO task_done row, guest never told — and the pg-boss retry finds the
    // guarded UPDATE already lost, reports "already closed" and stops. A
    // housekeeper delivered the towels and the system forgot. Zero evidence
    // rows was reachable, not "exactly one".
    const task = await seedTask();
    await expect(
      handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` }),
    ).rejects.toThrow();

    // The claim rolled back WITH the evidence, so the work is still visibly
    // owed and a retry can redo both.
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('open');
    expect((await findTaskByShortId(db, task.shortId))?.closedBy).toBeNull();
    expect(sent.find((s) => s.to === GUEST)).toBeUndefined();
  });

  it('and the retry then closes it properly once the fault clears', async () => {
    const task = await seedTask();
    await expect(
      handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` }),
    ).rejects.toThrow();
    await db.execute(sql`DROP TRIGGER test_crash ON messages`);

    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('done');
    expect(sent.find((s) => s.to === GUEST)?.body).toContain('2 extra towels');
    const rows = [
      ...(await db.execute(
        sql`SELECT raw->>'contextKind' AS kind FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
      )),
    ];
    expect(rows).toEqual([{ kind: 'task_done' }]);
  });
});
