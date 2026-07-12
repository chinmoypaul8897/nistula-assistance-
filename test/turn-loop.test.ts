/**
 * CH-05's deferred coverage, closed in CH-07 (progress.md CH-05 "Deferred to
 * CH-07" list): the 5-round tool-loop cap with the exhaustion alert, the
 * regenerate→defer→escalate path END TO END through the worker, and the
 * degraded flag altering the prompt through a full turn.
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import type { ConverseFn, ConverseInput } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import { createWaClient, type WaClientDeps } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests, cost_events CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

let outSeq = 0;

function makeRig() {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const httpImpl: WaClientDeps['httpImpl'] = async () => {
    outSeq += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.LOOP-OUT-${outSeq}` }] }), {
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
  const converseCalls: ConverseInput[] = [];
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse: async () => textResult('unused'),
    ...noToolDeps(log),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return { deps, log, converseCalls };
}

async function aiOutbound(conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.direction, 'out'),
        eq(schema.messages.sender, 'ai'),
      ),
    );
}

describe('the tool loop cap (CH-05 deferred)', () => {
  it('a model that never stops asking for tools hits the 5-round cap, alerts, and defers gracefully', async () => {
    const { conversation } = await seedConversation(db, '+917700900081');
    await seedGuestMessage(db, conversation.id, 'link for B3?', 20);
    const rig = makeRig();
    let rounds = 0;
    // Worst case: tool_use EVERY round, even when tool_choice forces prose,
    // and an empty text — the model simply refuses to answer.
    rig.deps.converse = (async (input: ConverseInput) => {
      rounds += 1;
      rig.converseCalls.push(input);
      const use = { id: `tu_${rounds}`, name: 'get_booking_link', input: { villa_label: 'B3' } };
      return {
        text: '',
        toolUses: [use],
        stopReason: 'tool_use',
        assistantContent: [{ type: 'tool_use', id: use.id, name: use.name, input: use.input }],
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    }) as ConverseFn;

    await processConversation(rig.deps, conversation.id);

    expect(rounds).toBe(5); // the §6.4 cap
    expect(rig.converseCalls.at(-1)?.toolChoice).toEqual({ type: 'none' }); // terminal round forces prose
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'tool_loop_exhausted' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
    // Empty final draft → the deferral line, which escalates (C3 referral).
    const out = await aiOutbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(PHRASEBOOK.outsideKnowledge);
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'guest_thread_escalation' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });
});

describe('regenerate → defer → escalate, end to end (CH-05 deferred)', () => {
  it('an unbacked price survives the regenerate, defers, escalates, and records the whole chain', async () => {
    const { conversation } = await seedConversation(db, '+917700900082');
    await seedGuestMessage(db, conversation.id, 'what does B3 cost in dec?', 20);
    const rig = makeRig();
    let calls = 0;
    rig.deps.converse = async () => {
      calls += 1;
      return textResult('A very fair ₹42,000 for the two nights.'); // never backed
    };

    await processConversation(rig.deps, conversation.id);

    expect(calls).toBe(2); // first loop + exactly one regenerate loop
    const out = await aiOutbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(PHRASEBOOK.quoteApiDown);
    expect(out[0]?.body).not.toContain('42,000');
    // The full audit chain: telemetry rows + the claimable evidence row + alert.
    const hits = await db.select().from(schema.rawEvents).where(eq(schema.rawEvents.source, 'system'));
    const mine = hits.filter(
      (h) => (h.payload as { conversationId?: string }).conversationId === conversation.id,
    );
    const actions = mine.map((h) => (h.payload as { rule: string; action: string }).action);
    expect(actions).toEqual(expect.arrayContaining(['regenerated', 'deferred']));
    const evidence = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conversation.id),
          eq(schema.messages.sender, 'system'),
        ),
      );
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.raw).toMatchObject({ contextKind: 'ops_escalation', reason: 'price' });
  });
});

describe('degraded mode through a full turn (CH-05 deferred)', () => {
  it('a degraded rate API changes what the model is TOLD before it ever drafts', async () => {
    const { conversation } = await seedConversation(db, '+917700900083');
    await seedGuestMessage(db, conversation.id, 'how much is the villa?', 20);
    const rig = makeRig();
    for (let i = 0; i < 3; i++) rig.deps.degraded.record('down'); // §3.4 flip
    rig.deps.converse = async (input) => {
      rig.converseCalls.push(input);
      return textResult('Let me have the team confirm the exact rate for those dates — one moment while I bring them in.');
    };

    await processConversation(rig.deps, conversation.id);

    const situation = (rig.converseCalls[0]?.system ?? []).at(-1)?.text ?? '';
    expect(situation).toContain('rate service is having trouble');
    expect(situation).toContain('Do not state any price this turn');
    expect((await aiOutbound(conversation.id))[0]?.body).toContain('confirm the exact rate');
  });
});
