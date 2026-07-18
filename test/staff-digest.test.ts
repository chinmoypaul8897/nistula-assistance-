/**
 * The morning digest (CH-14b step 3) — real Postgres: the night_queue → live
 * escalation conversion is a guarded UPDATE, and the overnight counts are real
 * queries. Product-picture S5: at 10:00 the overnight queue wakes, each gets its
 * first card, and OPS gets a one-line summary.
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
import { insertTask, findTaskByShortId, type Task, type TaskKind } from '../src/db/tasks.js';
import { runMorningDigest } from '../src/staff/digest.js';
import type { Roster } from '../src/staff/roster.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900931';
const LEAD = '+917700900933';
const OWNER = '+917700900935';

const ROSTER: Roster = {
  members: [{ name: 'Meera', phone: LEAD, role: 'frontdesk', villas: [] }],
  opsNumbers: [OWNER],
};

// 04:30 UTC = 10:00 IST — the digest instant. Overnight window opens yesterday 20:00 IST.
const NOW = new Date('2026-07-17T04:30:00Z');

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

const carded: { to: string; key: string; params: Record<string, string> }[] = [];
const wa = {
  sendTemplated: vi.fn(
    async (to: string, msg: { key: string; params: Record<string, string> }) => {
      carded.push({ to, key: msg.key, params: msg.params });
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
  await db.execute(sql`TRUNCATE drafts, tasks, raw_events, messages, conversations, guests CASCADE`);
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
  carded.length = 0;
  wa.sendTemplated.mockClear();
});

const deps = (over: Partial<Parameters<typeof runMorningDigest>[0]> = {}) => ({
  db,
  log,
  wa,
  roster: ROSTER,
  opsNumbers: ROSTER.opsNumbers,
  nightStart: '20:00',
  now: () => NOW,
  ...over,
});

async function seed(kind: TaskKind, over: Partial<Parameters<typeof insertTask>[1]> = {}): Promise<Task> {
  return insertTask(db, {
    conversationId,
    guestId,
    bookingId: null,
    villaLabel: null,
    kind,
    summary: 'the AC in Apartment 09 is weak',
    detail: 'Guest: the AC in Apartment 09 is weak · Us: first thing after 10',
    assignedPhone: kind === 'night_queue' ? null : LEAD,
    requestKey: null,
    origin: 'guest',
    now: new Date('2026-07-16T17:35:00Z'), // 23:05 IST last night
    ...over,
  });
}

/** A guardrail hit at a given instant (event_type='guardrail', the digest count). */
async function seedGuardrailHit(at: Date): Promise<void> {
  await db.insert(schema.rawEvents).values({
    source: 'system',
    eventType: 'guardrail',
    payload: { rule: 'promise_integrity', action: 'regenerated' },
    processed: true,
    createdAt: at,
  });
}

describe('night_queue wakes into a live escalation at 10:00 (S5)', () => {
  it('converts to escalation, assigns the front desk, starts the SLA, sends the first card', async () => {
    const night = await seed('night_queue', { slaDeadline: NOW });
    const run = await runMorningDigest(deps());

    expect(run.converted).toBe(1);
    const woke = await findTaskByShortId(db, night.shortId);
    expect(woke).toMatchObject({ kind: 'escalation', status: 'open', assignedPhone: LEAD, nudgeCount: 0 });
    // The SLA clock started fresh: deadline is ~10 min out (escalation SLA).
    expect(woke?.slaDeadline.getTime()).toBeGreaterThan(NOW.getTime());
    // The now-on-duty front desk gets its FIRST card (an escalation card).
    expect(carded.find((c) => c.key === 'escalation_card')?.to).toBe(LEAD);
  });

  it('is idempotent — a second run converts nothing', async () => {
    await seed('night_queue', { slaDeadline: NOW });
    await runMorningDigest(deps());
    carded.length = 0;
    const second = await runMorningDigest(deps());
    expect(second.converted).toBe(0);
    // The already-converted escalation is still open, but not re-woken.
    expect(carded.find((c) => c.key === 'escalation_card')).toBeUndefined();
  });

  it('🚨 a lead-less-but-ops roster falls back to OPS (same ladder as the day path)', async () => {
    // Review DEFECT: the digest used frontdeskLead alone, dropping assignFor's OPS
    // fallback — so a valid [housekeeping]+OPS roster left the woken escalation
    // assigned to nobody, stuck on the SLA ladder forever.
    const noLead: Roster = {
      members: [{ name: 'Anita', phone: '+917700900937', role: 'housekeeping', villas: [] }],
      opsNumbers: [OWNER],
    };
    const night = await seed('night_queue', { slaDeadline: NOW });
    await runMorningDigest(deps({ roster: noLead, opsNumbers: [OWNER] }));
    expect((await findTaskByShortId(db, night.shortId))?.assignedPhone).toBe(OWNER);
    expect(carded.find((c) => c.key === 'escalation_card')?.to).toBe(OWNER);
  });

  it('resets nudge_count on conversion so the ladder starts at rung 0', async () => {
    const night = await seed('night_queue', { slaDeadline: NOW });
    await db.update(schema.tasks).set({ nudgeCount: 5 }).where(sql`id = ${night.id}`);
    await runMorningDigest(deps());
    expect((await findTaskByShortId(db, night.shortId))?.nudgeCount).toBe(0);
  });
});

describe('the digest to OPS', () => {
  it('sends a one-line summary naming the overnight item + counts', async () => {
    // A newline in the guest's words must be STRIPPED (Meta bans it in a param).
    await seed('night_queue', { slaDeadline: NOW, summary: 'AC weak\nplease hurry' });
    await seed('housekeeping'); // an open day task
    await seedGuardrailHit(new Date(NOW.getTime() - 2 * 3600 * 1000)); // 2h ago (in window)

    const run = await runMorningDigest(deps());
    expect(run).toMatchObject({ converted: 1, openEscalations: 1, openTasks: 1, guardrailHits: 1, sent: true });
    const digest = carded.find((c) => c.key === 'digest');
    expect(digest?.to).toBe(OWNER);
    expect(digest?.params.summary).toContain('raised overnight now live');
    expect(digest?.params.summary).toContain('23:05'); // the item's time
    expect(digest?.params.summary).toContain('1 escalation(s)'); // the counts
    expect(digest?.params.summary).toContain('1 task(s)');
    expect(digest?.params.summary).toContain('1 guardrail'); // the overnight hit
    // The newline in the guest's words was stripped — the summary is one line.
    expect(digest?.params.summary).not.toContain('\n');
    expect(digest?.params.summary).toContain('AC weak');
  });

  it('🚨 an emoji-heavy summary stays inside the template’s 200 UTF-16-unit limit', async () => {
    // Review DEFECT: the code cap counted CODE POINTS while staffReadParam counts
    // UTF-16 UNITS, so an astral-char-heavy summary could exceed 200 and the real
    // schema would reject it — silently killing the digest.
    await seed('night_queue', { slaDeadline: NOW, summary: `AC ${'🔥'.repeat(80)}` });
    await runMorningDigest(deps());
    const summary = carded.find((c) => c.key === 'digest')?.params.summary ?? '';
    expect(summary.length).toBeLessThanOrEqual(200); // .length IS UTF-16 units
  });

  it('counts guardrail hits only inside the overnight window', async () => {
    await seed('night_queue', { slaDeadline: NOW });
    await seedGuardrailHit(new Date(NOW.getTime() - 2 * 3600 * 1000)); // in window
    await seedGuardrailHit(new Date(NOW.getTime() - 20 * 3600 * 1000)); // before last 20:00
    const run = await runMorningDigest(deps());
    expect(run.guardrailHits).toBe(1);
  });

  it('fail-quiet on a genuinely quiet night — no digest sent', async () => {
    const run = await runMorningDigest(deps());
    expect(run).toMatchObject({ converted: 0, sent: false });
    expect(carded).toHaveLength(0);
  });

  it('🚨 CH-16: lists overnight expired drafts and does NOT fail-quiet when only drafts lapsed', async () => {
    // A draft that lapsed overnight and nothing else — the digest must still fire
    // and name it (plan step 2). updated_at sits inside the overnight window.
    await db.insert(schema.drafts).values({
      conversationId,
      shortId: 'EXPD01',
      replyType: 'presales',
      proposedBody: 'x',
      status: 'expired',
      createdAt: new Date('2026-07-16T17:30:00Z'),
      updatedAt: new Date('2026-07-16T18:00:00Z'),
    });
    const run = await runMorningDigest(deps());
    expect(run.expiredDrafts).toBe(1);
    expect(run.sent).toBe(true); // NOT suppressed by fail-quiet
    const digest = carded.find((c) => c.key === 'digest');
    expect(digest?.params.summary).toContain('1 draft(s) expired unapproved');
  });

  it('no OPS number configured — converts + cards but sends no digest (dev)', async () => {
    await seed('night_queue', { slaDeadline: NOW });
    const run = await runMorningDigest(deps({ opsNumbers: [], roster: { ...ROSTER, opsNumbers: [] } }));
    expect(run.converted).toBe(1);
    expect(run.sent).toBe(false);
    expect(carded.find((c) => c.key === 'digest')).toBeUndefined();
    // The escalation card still went out to the front desk.
    expect(carded.find((c) => c.key === 'escalation_card')?.to).toBe(LEAD);
  });
});
