/**
 * CH-03 worker behaviour against real rows, driven directly (no boss, no
 * sleeps): time is simulated by backdating created_at, so the REAL 15s/45s
 * windows apply while tests run in milliseconds. The fake Graph sits at the
 * httpImpl seam exactly like wa-client.test.ts.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import type { ConverseFn, ConverseInput } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { kbPriceWhitelist } from '../src/brain/knowledge.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import {
  claimConversationTurn,
  getUnprocessedGuestMessages,
  insertMessage,
  resolveMessageCursor,
} from '../src/db/repos.js';
import { createWaClient, type WaClientDeps } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';

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

// CH-04: the worker calls Claude — a fixed mock captures its input and returns
// a fixed reply. Cache-cold usage (head written, small dynamic input, short
// reply) → 3 non-zero cost buckets.
const MOCK_REPLY = 'Good evening — how may I help with your stay?';
const MOCK_USAGE = { inputTokens: 50, outputTokens: 40, cacheReadTokens: 0, cacheWriteTokens: 1200 };

/** Inserts a non-guest message (ai/human/system) aged into the past. */
async function seedOutboundMessage(
  conversationId: string,
  sender: 'ai' | 'human' | 'system',
  body: string,
  ageSeconds: number,
): Promise<void> {
  await insertMessage(db, {
    conversationId,
    direction: 'out',
    sender,
    type: 'text',
    body,
    status: 'sent',
    createdAt: new Date(Date.now() - ageSeconds * 1000),
  });
}

function makeRig(httpImpl?: WaClientDeps['httpImpl']) {
  const graphCalls: { to: string; body: string }[] = [];
  const defaultHttp: WaClientDeps['httpImpl'] = async (_url, options) => {
    const parsed = JSON.parse(options?.body ?? '{}') as { to: string; text: { body: string } };
    graphCalls.push({ to: parsed.to, body: parsed.text.body });
    outSeq += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.WORKER-OUT-${outSeq}` }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: GRAPH,
    phoneNumberId: PHONE_ID,
    accessToken: 'test-token',
    httpImpl: httpImpl ?? defaultHttp,
  });
  const enqueued: { conversationId: string; startAfter?: Date }[] = [];
  const converseCalls: ConverseInput[] = [];
  const converse: ConverseFn = async (input) => {
    converseCalls.push(input);
    return textResult(MOCK_REPLY, MOCK_USAGE);
  };
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse,
    ...noToolDeps(log),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async (conversationId, startAfter) => {
      enqueued.push({ conversationId, startAfter });
    },
  };
  return { deps, graphCalls, enqueued, log, converseCalls };
}

async function outbound(conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.direction, 'out'),
      ),
    );
}

async function conversationRow(id: string) {
  const [row] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));
  return row;
}

describe('processConversation — the debounced Claude turn', () => {
  it('a quiet burst becomes ONE Claude reply; the guest turns form the transcript; window columns + pointer advance; re-run is a no-op', async () => {
    const { conversation } = await seedConversation(db, '+917700900031');
    await seedGuestMessage(db, conversation.id, 'hi', 25);
    await seedGuestMessage(db, conversation.id, 'villa free?', 22);
    const newest = await seedGuestMessage(db, conversation.id, '20 dec', 20);
    const { deps, graphCalls, enqueued, converseCalls } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ sender: 'ai', status: 'sent', body: MOCK_REPLY });
    expect(graphCalls).toEqual([{ to: '+917700900031', body: MOCK_REPLY }]);
    // The whole burst reaches Claude as ordered user turns (one converse call).
    expect(converseCalls).toHaveLength(1);
    expect(converseCalls[0]?.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'user', content: 'villa free?' },
      { role: 'user', content: '20 dec' },
    ]);

    const conv = await conversationRow(conversation.id);
    expect(conv?.lastProcessedMessageId).toBe(newest.id);
    expect(conv?.lastGuestMsgAt?.getTime()).toBe(newest.createdAt.getTime());
    // Window derives from the newest guest MESSAGE time, never now() (D2).
    expect(conv?.serviceWindowExpiresAt?.getTime()).toBe(
      newest.createdAt.getTime() + 24 * 60 * 60 * 1000,
    );
    expect(enqueued).toHaveLength(0); // re-check found nothing newer

    // CH-06 SEAM: block [3] KNOWLEDGE must actually reach the model through the
    // real worker path. Asserted HERE (not just in the pure prompt test) because
    // turn.ts is the only place that injects it — without this, setting the
    // injection to '' passes the whole suite (found by review).
    const system = converseCalls[0]?.system ?? [];
    expect(system).toHaveLength(5);
    expect(system[2]?.text).toMatch(/^\[KNOWLEDGE\]\n/);
    expect(system[2]?.text).toContain('Check-in is from 3 pm'); // a real compiled kb fact
    // ...and the cached prefix is still ONE breakpoint, on the last static block.
    expect(system.filter((b) => b.cache_control !== undefined)).toHaveLength(1);
    expect(system[3]?.cache_control).toEqual({ type: 'ephemeral' });

    // At-least-once safety: a duplicate/retried job finds nothing, no-ops, and
    // never calls the model again.
    await processConversation(deps, conversation.id);
    expect(await outbound(conversation.id)).toHaveLength(1);
    expect(graphCalls).toHaveLength(1);
    expect(converseCalls).toHaveLength(1);
    expect(enqueued).toHaveLength(0);
  });

  it('a fresh message re-queues to its quiet boundary +1s without processing', async () => {
    const { conversation } = await seedConversation(db, '+917700900032');
    const message = await seedGuestMessage(db, conversation.id, 'hello', 1);
    const { deps, enqueued } = makeRig();

    await processConversation(deps, conversation.id);

    expect(await outbound(conversation.id)).toHaveLength(0);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]?.conversationId).toBe(conversation.id);
    expect(enqueued[0]?.startAfter?.getTime()).toBe(
      message.createdAt.getTime() + DEBOUNCE_WINDOWS.quietMs + 1000,
    );
  });

  it('the 45s max wait overrides an unquiet rolling burst', async () => {
    const { conversation } = await seedConversation(db, '+917700900033');
    await seedGuestMessage(db, conversation.id, 'first', 46);
    await seedGuestMessage(db, conversation.id, 'still typing', 2);
    const { deps } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(MOCK_REPLY);
  });

  it('drops a job for an unknown conversation without throwing', async () => {
    const { deps, log } = makeRig();
    await processConversation(deps, randomUUID());
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: expect.any(String) as string }),
      'job for unknown conversation — dropped',
    );
  });

  it('a DANGLING pointer degrades to process-all and repairs itself (never wedges)', async () => {
    const { conversation } = await seedConversation(db, '+917700900034');
    const message = await seedGuestMessage(db, conversation.id, 'early words', 30);
    await db
      .update(schema.conversations)
      .set({ lastProcessedMessageId: randomUUID() })
      .where(eq(schema.conversations.id, conversation.id));
    const { deps, log, converseCalls } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(MOCK_REPLY);
    // Process-all recovery still fed the early message to Claude.
    expect(converseCalls[0]?.messages).toEqual([{ role: 'user', content: 'early words' }]);
    expect((await conversationRow(conversation.id))?.lastProcessedMessageId).toBe(message.id);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'conversation_cursor_dangling' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('a message arriving MID-dispatch is caught by the end-of-run re-check', async () => {
    const { conversation } = await seedConversation(db, '+917700900035');
    await seedGuestMessage(db, conversation.id, 'before', 20);
    const rig = makeRig(async () => {
      // The guest replies while the "Graph call" is in flight.
      await seedGuestMessage(db, conversation.id, 'while sending', 0);
      outSeq += 1;
      return new Response(JSON.stringify({ messages: [{ id: `wamid.WORKER-OUT-${outSeq}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await processConversation(rig.deps, conversation.id);

    expect(await outbound(conversation.id)).toHaveLength(1); // this turn echoed 'before' only
    expect(rig.enqueued.map((e) => e.conversationId)).toEqual([conversation.id]);
  });

  it('null-body media becomes a [type] placeholder IN THE TRANSCRIPT and still advances the pointer', async () => {
    const { conversation } = await seedConversation(db, '+917700900036');
    const message = await seedGuestMessage(db, conversation.id, null, 20, 'unsupported');
    const { deps, converseCalls } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    // The reply is the model's; the placeholder now lives in what Claude saw.
    expect(out[0]?.body).toBe(MOCK_REPLY);
    expect(converseCalls[0]?.messages).toEqual([{ role: 'user', content: '[unsupported]' }]);
    expect((await conversationRow(conversation.id))?.lastProcessedMessageId).toBe(message.id);
  });

  it('a dispatch failure leaves an honest failed row, an ops alert, and a CLAIMED turn (no echo-spam retry)', async () => {
    const { conversation } = await seedConversation(db, '+917700900037');
    const message = await seedGuestMessage(db, conversation.id, 'doomed', 20);
    const rig = makeRig(
      async () =>
        new Response(JSON.stringify({ error: { code: 131047, message: 'window closed' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await processConversation(rig.deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.status).toBe('failed');
    expect(out[0]?.error).toContain('Graph 400');
    // §6.6: no reply is sent, ops alerted — the turn is consumed, not retried.
    expect((await conversationRow(conversation.id))?.lastProcessedMessageId).toBe(message.id);
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'wa_send_failed' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
    await processConversation(rig.deps, conversation.id);
    expect(await outbound(conversation.id)).toHaveLength(1);
  });

  it('maps the transcript: guest→user, ai/human→assistant (human prefixed), system skipped', async () => {
    const { conversation } = await seedConversation(db, '+917700900041');
    await seedGuestMessage(db, conversation.id, 'first question', 40);
    await seedOutboundMessage(conversation.id, 'ai', 'my earlier reply', 35);
    await seedOutboundMessage(conversation.id, 'human', 'front desk here', 30);
    await seedOutboundMessage(conversation.id, 'system', 'internal context row', 28);
    await seedGuestMessage(db, conversation.id, 'still there?', 20);
    const { deps, converseCalls } = makeRig();

    await processConversation(deps, conversation.id);

    expect(converseCalls[0]?.messages).toEqual([
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'my earlier reply' },
      { role: 'assistant', content: '(Front desk) front desk here' },
      { role: 'user', content: 'still there?' },
    ]);
  });

  it('trims leading non-user turns so the transcript opens on a user message', async () => {
    const { conversation } = await seedConversation(db, '+917700900042');
    // The recent window opens on assistant turns (an earlier reply + a staff note).
    await seedOutboundMessage(conversation.id, 'ai', 'welcome back', 40);
    await seedOutboundMessage(conversation.id, 'system', 'note', 38);
    await seedGuestMessage(db, conversation.id, 'hello again', 20);
    const { deps, converseCalls } = makeRig();

    await processConversation(deps, conversation.id);

    // ai (leading) trimmed, system skipped → opens on the guest user turn.
    expect(converseCalls[0]?.messages).toEqual([{ role: 'user', content: 'hello again' }]);
  });

  it('logs one cost_events row per non-zero token bucket, stamped with the IST day', async () => {
    await db.execute(sql`TRUNCATE cost_events`);
    const { conversation } = await seedConversation(db, '+917700900043');
    await seedGuestMessage(db, conversation.id, 'rate please', 20);
    const { deps } = makeRig();

    await processConversation(deps, conversation.id);

    const rows = await db.select().from(schema.costEvents);
    // MOCK_USAGE = input 50, output 40, cacheWrite 1200, cacheRead 0 → 3 rows.
    expect(rows).toHaveLength(3);
    const byKind = Object.fromEntries(rows.map((row) => [row.kind, row.quantity]));
    expect(byKind).toEqual({
      anthropic_input: '50',
      anthropic_output: '40',
      anthropic_cache_write: '1200',
    });
    for (const row of rows) {
      expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number(row.inrEstimate)).toBeGreaterThan(0);
    }
  });

  it('a model failure sends nothing, claims nothing, alerts ops, and rethrows for retry (§6.6)', async () => {
    const { conversation } = await seedConversation(db, '+917700900044');
    const message = await seedGuestMessage(db, conversation.id, 'anything', 20);
    const rig = makeRig();
    rig.deps.converse = () => {
      throw Object.assign(new Error('overloaded'), { status: 529 });
    };

    await expect(processConversation(rig.deps, conversation.id)).rejects.toThrow('overloaded');

    // Pre-claim throw: no reply, pointer untouched, ops alerted.
    expect(await outbound(conversation.id)).toHaveLength(0);
    expect((await conversationRow(conversation.id))?.lastProcessedMessageId).toBeNull();
    expect(rig.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'model_failed' }),
      expect.stringContaining('[OPS-ALERT]'),
    );

    // Once the model recovers, the retried job (guest still unprocessed) sends.
    rig.deps.converse = async (input) => {
      rig.converseCalls.push(input);
      return textResult(MOCK_REPLY, MOCK_USAGE);
    };
    await processConversation(rig.deps, conversation.id);
    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(MOCK_REPLY);
    expect((await conversationRow(conversation.id))?.lastProcessedMessageId).toBe(message.id);
  });

  it('CH-06 SEAM: a published kb fee is SENT with no tool call; the same figure as a stay price is BLOCKED', async () => {
    // The headline CH-06 behaviour change, end to end through the worker: the kb
    // fee exemption must be plumbed from loadKnowledge -> turn.ts -> runGuardrails.
    // Without turn.ts passing kbPriceWhitelist(), the first case would be deferred
    // (PHRASEBOOK.quoteApiDown) and escalated; without the exemption being CONTEXT-
    // BOUND, the second case would be sent — a fabricated nightly rate (§6.5).
    // The figure is derived from the kb, so an OQ-04/05/06 content pass can't break this.
    const fee = kbPriceWhitelist().find((f) => f.cues.includes('extra adult'));
    expect(fee).toBeDefined();
    const amount = fee!.amount.toLocaleString('en-IN');

    const allowed = await seedConversation(db, '+917700900046');
    await seedGuestMessage(db, allowed.conversation.id, 'what do you charge for an extra adult?', 20);
    const rigA = makeRig();
    // unusedWebsite() throws if called — proving the reply needs NO live quote.
    rigA.deps.converse = async () => textResult(`An extra adult is ₹${amount} per night.`, MOCK_USAGE);
    await processConversation(rigA.deps, allowed.conversation.id);

    const sent = await outbound(allowed.conversation.id);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ status: 'sent' });
    expect(sent[0]?.body).toContain(amount);
    expect(sent[0]?.body).not.toBe(PHRASEBOOK.quoteApiDown); // not deferred
    expect(rigA.log.error).not.toHaveBeenCalled();

    const blocked = await seedConversation(db, '+917700900047');
    await seedGuestMessage(db, blocked.conversation.id, 'what is B3 per night?', 20);
    const rigB = makeRig();
    // Same amount, but claimed as a room rate with no tool result behind it.
    rigB.deps.converse = async () => textResult(`Villa B3 is ₹${amount} per night.`, MOCK_USAGE);
    await processConversation(rigB.deps, blocked.conversation.id);

    const deferred = await outbound(blocked.conversation.id);
    expect(deferred).toHaveLength(1);
    expect(deferred[0]?.body).toBe(PHRASEBOOK.quoteApiDown); // regenerated, still bad → deferred
    expect(deferred[0]?.body).not.toContain(amount); // the fabricated rate never reaches the guest
  });

  it('runs the tool loop: get_quote result feeds a second round; the reply row carries raw.toolRuns', async () => {
    const { conversation } = await seedConversation(db, '+917700900045');
    await seedGuestMessage(db, conversation.id, 'B3 20-22 dec for 4, rate?', 20);
    const rig = makeRig();
    // A stub website so the real get_quote handler returns a fixed quote.
    rig.deps.website = {
      getQuote: async () => ({
        status: 'ok',
        quote: {
          villaId: '5220300000000000011',
          checkIn: '2026-12-20',
          checkOut: '2026-12-22',
          nights: 2,
          adults: 4,
          children: 0,
          total: 34000,
          averagePerNight: 17000,
          perNight: [
            { date: '2026-12-20', amount: 17000 },
            { date: '2026-12-21', amount: 17000 },
          ],
          minNights: { average: 2, meetsRequirement: true },
          available: true,
        },
      }),
      getAvailability: async () => ({ status: 'ok', days: [] }),
    };
    let round = 0;
    rig.deps.converse = async (input) => {
      round += 1;
      rig.converseCalls.push(input);
      if (round === 1) {
        const use = {
          id: 'tu_1',
          name: 'get_quote',
          input: { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
        };
        return {
          text: '',
          toolUses: [use],
          stopReason: 'tool_use',
          assistantContent: [{ type: 'tool_use', id: use.id, name: use.name, input: use.input }],
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      }
      return textResult('Your two nights at Villa B3 come to ₹34,000, all in. Here is the link.');
    };

    await processConversation(rig.deps, conversation.id);

    expect(round).toBe(2);
    // The second call carries the tool_result user turn back to the model.
    const secondTurns = rig.converseCalls[1]?.messages ?? [];
    const lastTurn = secondTurns.at(-1);
    expect(lastTurn?.role).toBe('user');
    expect(Array.isArray(lastTurn?.content)).toBe(true);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toContain('34,000');
    expect(out[0]?.status).toBe('sent');
    const runs = (out[0]?.raw as { toolRuns?: { name: string; result: { ok: boolean } }[] } | null)?.toolRuns;
    expect(runs).toHaveLength(1);
    expect(runs?.[0]).toMatchObject({ name: 'get_quote', result: { ok: true } });
  });
});

describe('claim + cursor repositories (the D2 primitives)', () => {
  it('claimConversationTurn is optimistic: stale expectations claim nothing', async () => {
    const { conversation } = await seedConversation(db, '+917700900038');
    const first = await seedGuestMessage(db, conversation.id, 'one', 10);
    const second = await seedGuestMessage(db, conversation.id, 'two', 5);

    const win = await claimConversationTurn(db, {
      conversationId: conversation.id,
      expectedPointer: null,
      newPointer: first.id,
      lastGuestMsgAt: first.createdAt,
    });
    expect(win).toBe(true);
    // A run that read pointer=null before the claim above lands must lose.
    const stale = await claimConversationTurn(db, {
      conversationId: conversation.id,
      expectedPointer: null,
      newPointer: second.id,
      lastGuestMsgAt: second.createdAt,
    });
    expect(stale).toBe(false);
    const fresh = await claimConversationTurn(db, {
      conversationId: conversation.id,
      expectedPointer: first.id,
      newPointer: second.id,
      lastGuestMsgAt: second.createdAt,
    });
    expect(fresh).toBe(true);
  });

  it('resolveMessageCursor: null pointer, live pointer, dangling pointer', async () => {
    const { conversation } = await seedConversation(db, '+917700900039');
    const message = await seedGuestMessage(db, conversation.id, 'cursor target', 5);

    expect(await resolveMessageCursor(db, null)).toEqual({ cursor: null, dangling: false });
    expect(await resolveMessageCursor(db, message.id)).toEqual({
      cursor: { createdAtIso: expect.any(String) as string, id: message.id },
      dangling: false,
    });
    expect(await resolveMessageCursor(db, randomUUID())).toEqual({
      cursor: null,
      dangling: true,
    });
  });

  it('REGRESSION: the cursor survives microsecond timestamps (defaultNow rows)', async () => {
    // Real webhook inserts use the DB's defaultNow() — microsecond precision.
    // A cursor round-tripped through a JS Date (ms) truncates, the newest
    // message matches its own "newer than" query, and the re-check loops
    // forever re-echoing the last message (caught live by the golden path).
    const { conversation } = await seedConversation(db, '+917700900040');
    const { message } = await insertMessage(db, {
      conversationId: conversation.id,
      waMessageId: 'wamid.MICROSECONDS-0001',
      direction: 'in',
      sender: 'guest',
      type: 'text',
      body: 'db-clock timestamps',
      status: 'received',
      // no createdAt — the DB default supplies microseconds
    });
    expect(message).not.toBeNull();
    await claimConversationTurn(db, {
      conversationId: conversation.id,
      expectedPointer: null,
      newPointer: message?.id ?? '',
      lastGuestMsgAt: message?.createdAt ?? new Date(),
    });
    const { cursor } = await resolveMessageCursor(db, message?.id ?? null);
    expect(await getUnprocessedGuestMessages(db, conversation.id, cursor)).toHaveLength(0);
  });
});
