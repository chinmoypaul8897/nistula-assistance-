/**
 * CH-16 · the weekly quality report — the §1 quality-bar data. Assert the OUTCOME:
 * the ops summary numbers and the durable raw_events row match the seeded drafts.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import type { DraftReplyType, DraftStatus } from '../src/db/drafts.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { runQualityReport } from '../src/staff/qualityReport.js';
import { createWaClient } from '../src/wa/client.js';
import { seedConversation } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900871';
const OPS = '+917700900879';

let client: ReturnType<typeof postgres>;
let db: Db;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE drafts, messages, conversations, guests, phone_windows, raw_events CASCADE`,
  );
  const { conversation } = await seedConversation(db, GUEST);
  conversationId = conversation.id;
  await touchPhoneWindow(db, OPS, new Date());
});

afterAll(async () => {
  await client?.end();
});

function mkDeps() {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const carded: { summary: string }[] = [];
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '1',
    accessToken: 't',
    httpImpl: async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.R1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  const waSpy = {
    ...wa,
    sendTemplated: async (
      to: Parameters<typeof wa.sendTemplated>[0],
      send: Parameters<typeof wa.sendTemplated>[1],
      opts: Parameters<typeof wa.sendTemplated>[2],
    ) => {
      carded.push({ summary: String(send.params.summary) });
      return wa.sendTemplated(to, send, opts);
    },
  };
  return {
    deps: { db, log, wa: waSpy, opsNumbers: [OPS], now: () => new Date() },
    carded,
  };
}

let seq = 0;
const seedDraft = (replyType: DraftReplyType, status: DraftStatus) => {
  seq += 1;
  return db.insert(schema.drafts).values({
    conversationId,
    shortId: `Q${String(seq).padStart(5, '0')}`,
    replyType,
    proposedBody: 'body',
    status,
  });
};

const seedGuardrailHit = (rule: string) =>
  db.insert(schema.rawEvents).values({
    source: 'system',
    eventType: 'guardrail',
    processed: true,
    payload: { rule, action: 'blocked' },
  });

const reportRow = async () =>
  [
    ...(await db.execute(
      sql`SELECT payload FROM raw_events WHERE source = 'system' AND event_type = 'quality_report'`,
    )),
  ] as { payload: Record<string, unknown> }[];

describe('runQualityReport', () => {
  it('summarises the week and writes the raw_events breakdown', async () => {
    await seedDraft('presales', 'approved');
    await seedDraft('presales', 'approved');
    await seedDraft('presales', 'edited');
    await seedDraft('instay', 'rejected');
    await seedDraft('instay', 'expired');
    // Guardrail hits across two rules — the "top guardrail hits" signal.
    await seedGuardrailHit('money');
    await seedGuardrailHit('money');
    await seedGuardrailHit('money');
    await seedGuardrailHit('window');

    const { deps, carded } = mkDeps();
    const run = await runQualityReport(deps);

    expect(run.total).toBe(5);
    expect(run.sent).toBe(true);

    // Rates are over DECIDED drafts (approved+edited+rejected = 4): 2/4 = 50%.
    const summary = carded[0]?.summary ?? '';
    expect(summary).toContain('Drafts (7d): 5');
    expect(summary).toContain('approved 2 (50%)');
    expect(summary).toContain('edited 1 (25%)');
    expect(summary).toContain('expired 1');
    expect(summary).toContain('top presales 3');
    // Step 4's "top guardrail hits" — WHICH rule fires most, not just how many.
    expect(summary).toContain('guardrail hits 4');
    expect(summary).toContain('top rules: money 3');

    const rows = await reportRow();
    expect(rows).toHaveLength(1);
    const payload = rows[0]!.payload as {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      topGuardrailRules: { rule: string; count: number }[];
    };
    expect(payload.total).toBe(5);
    expect(payload.byStatus.approved).toBe(2);
    expect(payload.byStatus.expired).toBe(1);
    expect(payload.byType.presales).toBe(3);
    expect(payload.byType.instay).toBe(2);
    expect(payload.topGuardrailRules[0]).toEqual({ rule: 'money', count: 3 });
  });

  it('fails quiet on an empty week — no ops message, no report row', async () => {
    const { deps, carded } = mkDeps();
    const run = await runQualityReport(deps);

    expect(run.sent).toBe(false);
    expect(carded).toHaveLength(0);
    expect(await reportRow()).toHaveLength(0);
  });
});
