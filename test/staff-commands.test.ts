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
    ['AI OFF 0801', 'ai_off', '0801'],
    ['ai off 0801', 'ai_off', '0801'],
    ['AI ON 0801', 'ai_on', '0801'],
    ['AI ON #0801', 'ai_on', '0801'],
    ['AI OFF 917700900801', 'ai_off', '917700900801'], // more digits (disambiguation)
  ])('%s parses as an AI toggle', (text, kind, digits) => {
    expect(parseStaffCommand(text)).toEqual({ kind, digits });
  });

  it.each(['AI OFF', 'AI ON abc', 'AI sideways 0801', 'AI OFF 12'])(
    '%s is NOT an AI toggle',
    (text) => {
      expect(parseStaffCommand(text)).toEqual({ kind: 'unknown' });
    },
  );

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

    // The guest hears about it, on their conversation, in voice — and NOT the
    // internal summary (see the leak test below).
    const toGuest = sent.find((s) => s.to === GUEST);
    expect(toGuest?.conversationId).toBe(conversationId);
    expect(toGuest?.body).toContain('Housekeeping');
    expect(toGuest?.body).not.toContain('2 extra towels');
    expect(toGuest?.body).not.toContain('!');
    // And the staff member gets an acknowledgement.
    expect(sent.find((s) => s.to === ANITA)?.body).toContain(task.shortId);
  });

  it('🚨 the close line NEVER echoes the internal staff summary to the guest', async () => {
    // Seen live three times in the 25–26 Jul UAT. `task.summary` is the MODEL's
    // line, written FOR STAFF — third-person ops prose — and it went to the
    // guest verbatim behind "That is done — ".
    //
    // This fixture is the WORST real one, and it is why this is not merely a
    // register slip: the task was raised off stale context and its narrative was
    // INVENTED (the guest had asked about a dietary preference; nobody was
    // waiting for towels and nobody had chased twice). The close line served
    // that fabrication back to the guest as established fact.
    const task = await seedTask({
      summary: 'Guest waiting for two extra towels, chased twice, now asking if anyone is here',
    });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });

    const body = sent.find((s) => s.to === GUEST)?.body ?? '';
    expect(body).not.toContain('Guest waiting');
    expect(body).not.toContain('chased twice');
    expect(body).not.toContain('asking if anyone is here');
    // Third-person references to the guest are the tell for staff phrasing.
    expect(body).not.toMatch(/\bGuest\b/);
    // It still SAYS something — silence would be a different regression.
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain('Housekeeping');
  });

  it('🚨 with several requests open, the close line leaks none of them and over-claims none', async () => {
    // A guest may hold up to MAX_OPEN_TASKS_PER_CONVERSATION. Two things must
    // hold at once: no summary leaks (the closed one OR a sibling), and the line
    // must not say "that's all sorted" while two requests are still outstanding.
    const towels = await seedTask();
    await seedTask({ kind: 'maintenance', summary: 'AC in the master bedroom is weak' });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${towels.shortId}` });

    const body = sent.find((s) => s.to === GUEST)?.body ?? '';
    // Discriminating: the OLD line emitted the closed task's summary here.
    expect(body).not.toContain('2 extra towels');
    expect(body).not.toContain('AC');
    expect(body).not.toMatch(/\ball\b/i);
    expect(body).toContain('Housekeeping');
  });

  it('🚨 a NIGHT-raised task reads the same as a day escalation after the digest rewrites its kind', async () => {
    // convertNightQueueTasks flips kind night_queue -> escalation at 10:00, so a
    // task raised at 23:00 is read here under a kind it was never raised with.
    // The two CLOSE_LINE entries must therefore stay identical; editing one
    // alone would silently give night-raised requests the day wording.
    const atNight = await seedTask({ kind: 'night_queue', summary: 'AC weak, guest asked at 23:05' });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${atNight.shortId}` });
    const nightBody = sent.find((s) => s.to === GUEST)?.body ?? '';

    sent.length = 0;
    await db.execute(sql`TRUNCATE tasks CASCADE`);
    const byDay = await seedTask({ kind: 'escalation', summary: 'guest wants a person' });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${byDay.shortId}` });
    const dayBody = sent.find((s) => s.to === GUEST)?.body ?? '';

    expect(nightBody).toBe(dayBody);
    expect(nightBody).not.toContain('AC weak');
    expect(nightBody).not.toContain('23:05');
  });

  it('the close line is written from the task KIND, not from model text', async () => {
    // The kind is a closed enum we set; the summary is model prose. Only the
    // former may reach a guest, so a maintenance close reads as maintenance.
    const task = await seedTask({ kind: 'maintenance', summary: 'Guest reports the AC is weak' });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });

    const body = sent.find((s) => s.to === GUEST)?.body ?? '';
    expect(body).toContain('Maintenance');
    expect(body).not.toContain('Guest reports');
    expect(body).not.toContain('!');
  });

  it('🚨 CH-13b · DONE on a SYSTEM task closes it SILENTLY — no guest line, no task_done row', async () => {
    // The round-2 BLOCKER: a media system-task carries the guest's conversationId,
    // so the null guard let DONE send the guest \"That is done — guest sent media
    // the assistant could not read…\" (internal wording + a false claim). Guarded
    // now by ORIGIN, not conversationId.
    const task = await seedTask({
      origin: 'system',
      summary: 'guest sent media the assistant could not read — please follow up',
    });
    await handleStaffCommand(deps(), { phone: ANITA, body: `DONE ${task.shortId}` });

    // Closed, staff acknowledged — the staff side is untouched.
    expect((await findTaskByShortId(db, task.shortId))?.status).toBe('done');
    expect(sent.find((s) => s.to === ANITA)?.body).toContain(task.shortId);
    // The guest heard NOTHING, and NO task_done evidence row was written (it
    // would license a referent-free \"that's sorted\" to a guest who asked nothing).
    expect(sent.find((s) => s.to === GUEST)).toBeUndefined();
    const systemRows = await db.execute(
      sql`SELECT 1 FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
    );
    expect([...systemRows]).toHaveLength(0);
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

  it('🚨 CH-14a · an escalation nudges at 10 min but stays OPEN for the 2nd rung', async () => {
    // CH-14a turned CH-13b's escalation groundwork into a 2-rung LADDER. The
    // first rung fires at the 10-min deadline (re-ping the front desk) but leaves
    // the task `open` so rung 2 (cc OPS at 20 min) can still fire — unlike a
    // generic kind, which reaches `nudged` on its single rung. The full ladder is
    // proven in staff-sla-ladder.test.ts; this is the wiring check.
    const task = await seedTask({ kind: 'escalation', assignedPhone: MEERA });
    const tenMin = new Date(NOW.getTime() + 11 * 60_000); // 11 > the 10-min SLA
    expect(await runSlaNudger(slaDeps(tenMin))).toEqual({ considered: 1, nudged: 1 });
    const after = await findTaskByShortId(db, task.shortId);
    expect(after?.status).toBe('open'); // intermediate rung — still live for rung 2
    expect(after?.nudgeCount).toBe(1);
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
    // The guest IS told on the retry. Asserted on the close line's own wording,
    // not on the task summary: the summary is staff-facing model prose and no
    // longer reaches the guest at all (see the close-line leak test above).
    expect(sent.find((s) => s.to === GUEST)?.body).toContain('Housekeeping');
    const rows = [
      ...(await db.execute(
        sql`SELECT raw->>'contextKind' AS kind FROM messages WHERE conversation_id = ${conversationId} AND sender = 'system'`,
      )),
    ];
    expect(rows).toEqual([{ kind: 'task_done' }]);
  });
});

describe('AI ON/OFF — a human takes over / hands back (CH-14a)', () => {
  async function convRow() {
    const [row] = await db.select().from(schema.conversations).where(sql`id = ${conversationId}`);
    return row as { status: string; humanActiveUntil: Date | null };
  }

  it('AI OFF <last4> holds the thread indefinitely and cancels open escalations', async () => {
    await insertTask(db, {
      conversationId,
      guestId,
      bookingId: null,
      villaLabel: null,
      kind: 'escalation',
      summary: 'needs a person',
      detail: null,
      assignedPhone: MEERA,
      requestKey: null,
      origin: 'guest',
      now: NOW,
    });
    await handleStaffCommand(deps(), { phone: MEERA, body: 'AI OFF 0801' });
    const c = await convRow();
    expect(c.status).toBe('human_active');
    expect(c.humanActiveUntil).toBeNull(); // indefinite hold, not the 2h echo TTL
    const [task] = await db.select().from(schema.tasks);
    expect(task?.status).toBe('cancelled');
    expect(sent.find((s) => s.to === MEERA)?.body).toContain('AI paused');
  });

  it('AI ON <last4> force-releases, clearing an unexpired echo TTL', async () => {
    await db
      .update(schema.conversations)
      .set({ humanActiveUntil: new Date(NOW.getTime() + 3_600_000) })
      .where(sql`id = ${conversationId}`);
    await handleStaffCommand(deps(), { phone: MEERA, body: 'AI ON 0801' });
    const c = await convRow();
    expect(c.status).toBe('ai_active');
    expect(c.humanActiveUntil).toBeNull();
    expect(sent.find((s) => s.to === MEERA)?.body).toContain('back on');
  });

  it('an AMBIGUOUS last-4 refuses with a candidate list and changes NOTHING', async () => {
    // A second guest whose phone ALSO ends in 0801.
    const other = await upsertGuestByPhone(db, '+918800900801', 'Priya');
    await getOrCreateConversation(db, other.id);
    await handleStaffCommand(deps(), { phone: MEERA, body: 'AI OFF 0801' });
    const reply = sent.find((s) => s.to === MEERA)?.body ?? '';
    expect(reply).toContain('More than one guest');
    expect(reply).toContain('more digits');
    // No thread was paused.
    expect((await convRow()).status).toBe('ai_active');
  });

  it('an unknown suffix says so and pauses nothing', async () => {
    await handleStaffCommand(deps(), { phone: MEERA, body: 'AI OFF 9999' });
    expect(sent.find((s) => s.to === MEERA)?.body).toContain('No guest ending in 9999');
    expect((await convRow()).status).toBe('ai_active');
  });
});
