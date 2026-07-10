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
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import {
  claimConversationTurn,
  getUnprocessedGuestMessages,
  insertMessage,
  resolveMessageCursor,
} from '../src/db/repos.js';
import { createWaClient, type WaClientDeps } from '../src/wa/client.js';
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
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

let outSeq = 0;

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
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    enqueue: async (conversationId, startAfter) => {
      enqueued.push({ conversationId, startAfter });
    },
  };
  return { deps, graphCalls, enqueued, log };
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

describe('processConversation — the debounced echo turn', () => {
  it('a quiet burst becomes ONE combined echo; window columns + pointer advance; re-run is a no-op', async () => {
    const { conversation } = await seedConversation(db, '+917700900031');
    await seedGuestMessage(db, conversation.id, 'hi', 25);
    await seedGuestMessage(db, conversation.id, 'villa free?', 22);
    const newest = await seedGuestMessage(db, conversation.id, '20 dec', 20);
    const { deps, graphCalls, enqueued } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      sender: 'ai',
      status: 'sent',
      body: 'echo: hi\nvilla free?\n20 dec',
    });
    expect(graphCalls).toEqual([{ to: '+917700900031', body: 'echo: hi\nvilla free?\n20 dec' }]);

    const conv = await conversationRow(conversation.id);
    expect(conv?.lastProcessedMessageId).toBe(newest.id);
    expect(conv?.lastGuestMsgAt?.getTime()).toBe(newest.createdAt.getTime());
    // Window derives from the newest guest MESSAGE time, never now() (D2).
    expect(conv?.serviceWindowExpiresAt?.getTime()).toBe(
      newest.createdAt.getTime() + 24 * 60 * 60 * 1000,
    );
    expect(enqueued).toHaveLength(0); // re-check found nothing newer

    // At-least-once safety: a duplicate/retried job finds nothing and no-ops.
    await processConversation(deps, conversation.id);
    expect(await outbound(conversation.id)).toHaveLength(1);
    expect(graphCalls).toHaveLength(1);
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
    expect(out[0]?.body).toBe('echo: first\nstill typing');
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
    const { deps, log } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toContain('early words');
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

  it('null-body media renders as a type placeholder and still advances the pointer', async () => {
    const { conversation } = await seedConversation(db, '+917700900036');
    const message = await seedGuestMessage(db, conversation.id, null, 20, 'unsupported');
    const { deps } = makeRig();

    await processConversation(deps, conversation.id);

    const out = await outbound(conversation.id);
    expect(out[0]?.body).toBe('echo: [unsupported]');
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
