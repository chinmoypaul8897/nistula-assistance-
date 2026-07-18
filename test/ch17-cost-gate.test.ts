/**
 * CH-17 step 4 — the cost KILL-SWITCH and the per-conversation DAILY TURN CAP,
 * driven through the REAL worker path (processConversation), asserting the
 * OUTCOME (the guest message + whether the model was called), never runX
 * directly. The suite lesson: assert what the guest got, not just due-ness.
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import type { ConverseFn } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import { configureCostMeter, noteSpend, resetCostMeter } from '../src/ops/costMeter.js';
import { istCalendarDay } from '../src/lib/time.js';
import { createWaClient, type WaClientDeps } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage, seedOutboundMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;
let outSeq = 0;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests, cost_events CASCADE`);
});

afterEach(() => resetCostMeter());
afterAll(async () => {
  await client?.end();
});

function makeRig() {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const httpImpl: WaClientDeps['httpImpl'] = async () => {
    outSeq += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.CG-${outSeq}` }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    httpImpl,
  });
  let converseCalls = 0;
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse: (async () => {
      converseCalls += 1;
      return textResult('the model should NOT have been called');
    }) as ConverseFn,
    ...noToolDeps(log),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return { deps, log, calls: () => converseCalls };
}

async function aiBodies(conversationId: string): Promise<(string | null)[]> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.direction, 'out'),
        eq(schema.messages.sender, 'ai'),
      ),
    );
  return rows.map((r) => r.body);
}

describe('cost kill-switch (4x daily budget)', () => {
  it('at HARD it skips the model, sends an honest hold line, and pages ops', async () => {
    configureCostMeter({ thresholdInr: 1 });
    noteSpend(istCalendarDay(new Date()), 100); // 100 >= 4x1 ⇒ hard

    const { conversation } = await seedConversation(db, '+917700900801');
    await seedGuestMessage(db, conversation.id, 'rate for B3 in dec?', 20);
    const rig = makeRig();

    await processConversation(rig.deps, conversation.id);

    expect(rig.calls()).toBe(0); // the model was never called — that is the point
    // The guest gets one of the two honest team-referral hold lines (day/night
    // depends on the wall clock; either is correct and promises nothing false).
    const bodies = await aiBodies(conversation.id);
    expect(bodies).toHaveLength(1);
    expect([PHRASEBOOK.outsideKnowledge, PHRASEBOOK.outsideKnowledgeNight]).toContain(bodies[0]);
    // Ops paged with the actionable cost alert AND a human brought in (referral).
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'cost_kill_switch' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'guest_thread_escalation' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('below HARD (soft) the model still runs', async () => {
    configureCostMeter({ thresholdInr: 1 });
    noteSpend(istCalendarDay(new Date()), 2); // 2 >= 2x1 (soft) but < 4x1 (hard)

    const { conversation } = await seedConversation(db, '+917700900802');
    await seedGuestMessage(db, conversation.id, 'hello', 20);
    const rig = makeRig();

    await processConversation(rig.deps, conversation.id);

    expect(rig.calls()).toBe(1); // served
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'cost_soft_alarm' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });
});

describe('per-conversation 60-turns/day cap', () => {
  it('at the 60th AI turn today it cools off — no model call, cool-off line, status cooloff', async () => {
    const { conversation } = await seedConversation(db, '+917700900803');
    // 60 AI replies already sent today ⇒ this inbound is the capped turn.
    for (let i = 0; i < 60; i++) {
      await seedOutboundMessage(db, conversation.id, 'ai', `earlier reply ${i}`, 1);
    }
    await seedGuestMessage(db, conversation.id, 'one more question', 20);
    const rig = makeRig();

    await processConversation(rig.deps, conversation.id);

    expect(rig.calls()).toBe(0); // the cap short-circuits before the model
    const bodies = await aiBodies(conversation.id);
    expect(bodies).toContain(PHRASEBOOK.coolOff);
    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversation.id));
    expect(conv?.status).toBe('cooloff');
  });

  it('at 59 AI turns today it still serves (the boundary)', async () => {
    const { conversation } = await seedConversation(db, '+917700900804');
    for (let i = 0; i < 59; i++) {
      await seedOutboundMessage(db, conversation.id, 'ai', `earlier reply ${i}`, 1);
    }
    await seedGuestMessage(db, conversation.id, 'still here?', 20);
    const rig = makeRig();

    await processConversation(rig.deps, conversation.id);

    expect(rig.calls()).toBe(1); // under the cap ⇒ the model runs
  });
});
