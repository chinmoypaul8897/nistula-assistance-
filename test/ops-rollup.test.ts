/**
 * CH-17 step 4 — the 23:30 daily rollup. Assert the OUTCOME: the ops line's
 * numbers and the durable raw_events breakdown match the seeded day, and an
 * empty day fails quiet (no message, no row).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { insertTask } from '../src/db/tasks.js';
import { istCalendarDay } from '../src/lib/time.js';
import { runDailyRollup } from '../src/ops/rollup.js';
import { createWaClient } from '../src/wa/client.js';
import { seedConversation, seedGuestMessage, seedOutboundMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const OPS = '+917700900879';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE messages, conversations, guests, phone_windows, raw_events, tasks, cost_events CASCADE`,
  );
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
  return { deps: { db, log, wa: waSpy, opsNumbers: [OPS], now: () => new Date() }, carded };
}

const rollupRow = async () =>
  [
    ...(await db.execute(
      sql`SELECT payload FROM raw_events WHERE source = 'system' AND event_type = 'daily_rollup'`,
    )),
  ] as { payload: Record<string, unknown> }[];

describe('runDailyRollup', () => {
  it('sums the day and writes the raw_events breakdown', async () => {
    const { conversation } = await seedConversation(db, '+917700900701');
    await seedGuestMessage(db, conversation.id, 'hi', 1); // 1 in
    await seedGuestMessage(db, conversation.id, 'again', 1); // 2 in
    await seedOutboundMessage(db, conversation.id, 'ai', 'reply', 1); // 1 out
    await db.insert(schema.rawEvents).values({
      source: 'system',
      eventType: 'guardrail',
      processed: true,
      payload: { rule: 'window', action: 'blocked' },
    });
    await insertTask(db, {
      conversationId: conversation.id,
      guestId: conversation.guestId,
      bookingId: null,
      villaLabel: null,
      requestKey: null,
      kind: 'escalation',
      origin: 'guest',
      summary: 'help',
      detail: 'd',
      assignedPhone: OPS,
      now: new Date(),
    });
    await db.insert(schema.costEvents).values([
      { day: istCalendarDay(new Date()), kind: 'anthropic_input', quantity: '1000', inrEstimate: '12.3456' },
    ]);

    const { deps, carded } = mkDeps();
    const run = await runDailyRollup(deps);

    expect(run.msgsIn).toBe(2);
    expect(run.msgsOut).toBe(1);
    expect(run.conversations).toBe(1);
    expect(run.escalations).toBe(1);
    expect(run.guardrailHits).toBe(1);
    expect(run.sent).toBe(true);

    const summary = carded[0]?.summary ?? '';
    expect(summary).toContain('2 in / 1 out');
    expect(summary).toContain('1 convo(s)');
    expect(summary).toContain('1 escalation(s)');
    expect(summary).toContain('1 guardrail hit(s)');
    expect(summary).toMatch(/₹\d+ spend/);

    const rows = await rollupRow();
    expect(rows).toHaveLength(1);
    const payload = rows[0]!.payload as { msgsIn: number; escalations: number };
    expect(payload.msgsIn).toBe(2);
    expect(payload.escalations).toBe(1);
  });

  it('fails quiet on an empty day — no ops message, no row', async () => {
    const { deps, carded } = mkDeps();
    const run = await runDailyRollup(deps);
    expect(run.sent).toBe(false);
    expect(carded).toHaveLength(0);
    expect(await rollupRow()).toHaveLength(0);
  });
});
