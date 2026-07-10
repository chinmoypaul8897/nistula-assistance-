/**
 * CH-02 step 3 — sendText with the §3.4 send-intent pattern. The load-
 * bearing test: the injected fetch queries the database MID-CALL and must
 * find the 'queued' intent row already committed with no wa id — proving
 * the write precedes the Graph call, so a crash can never hide a send.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import { createWaClient, type WaClientDeps } from '../src/wa/client.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

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

const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';

function makeClient(httpImpl: WaClientDeps['httpImpl']) {
  const log = { error: vi.fn(), warn: vi.fn() };
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: GRAPH,
    phoneNumberId: PHONE_ID,
    accessToken: 'test-token-never-logged',
    httpImpl,
  });
  return { wa, log };
}

function graphOk(waMessageId: string): Response {
  return new Response(JSON.stringify({ messages: [{ id: waMessageId }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('sendText — send-intent ordering (§3.4, decision D1)', () => {
  it("commits the 'queued' row BEFORE the Graph call, then flips it to 'sent'", async () => {
    let observedMidCall: { status: string; waMessageId: string | null } | undefined;
    const { wa } = makeClient(async (url, options) => {
      // The proof: the intent row is already visible to a SEPARATE query
      // while the "network call" is still in flight.
      const rows = await db
        .select({ status: schema.messages.status, waMessageId: schema.messages.waMessageId })
        .from(schema.messages)
        .where(eq(schema.messages.body, 'ordering-proof'));
      observedMidCall = rows[0];
      expect(url).toBe(`${GRAPH}/${PHONE_ID}/messages`);
      expect(options?.headers?.authorization).toBe('Bearer test-token-never-logged');
      expect(JSON.parse(options?.body ?? '')).toEqual({
        messaging_product: 'whatsapp',
        to: '+917700900011',
        type: 'text',
        text: { body: 'ordering-proof' },
      });
      return graphOk('wamid.CLIENT-SENT-0001');
    });

    const result = await wa.sendText('+917700900011', 'ordering-proof', {
      conversationId: null,
      sender: 'system',
    });

    expect(observedMidCall).toEqual({ status: 'queued', waMessageId: null });
    expect(result).toEqual({
      ok: true,
      messageId: expect.any(String) as string,
      waMessageId: 'wamid.CLIENT-SENT-0001',
    });
    const [row] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.CLIENT-SENT-0001'));
    expect(row).toMatchObject({ status: 'sent', direction: 'out', sender: 'system' });
  });

  it('writes the row with the CALLER-stated conversation and sender (decision D5)', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900012', 'Client Test Guest');
    const conversation = await getOrCreateConversation(db, guest.id);
    const { wa } = makeClient(async () => graphOk('wamid.CLIENT-SENT-0002'));

    const result = await wa.sendText('+917700900012', 'attached to conversation', {
      conversationId: conversation.id,
      sender: 'ai',
    });
    expect(result.ok).toBe(true);
    const [row] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.CLIENT-SENT-0002'));
    expect(row).toMatchObject({ conversationId: conversation.id, sender: 'ai' });
  });
});

describe('sendText — failure paths (never throws; row is the audit)', () => {
  it('marks the row failed with a token-free Graph error and alerts ops', async () => {
    const { wa, log } = makeClient(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: 'Recipient not in allowed list',
              type: 'OAuthException',
              code: 131030,
            },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    );
    const result = await wa.sendText('+917700900013', 'will 400', {
      conversationId: null,
      sender: 'system',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Graph 400 131030 Recipient not in allowed list');
      expect(result.error).not.toContain('test-token-never-logged');
      const [row] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, result.messageId ?? ''));
      expect(row).toMatchObject({ status: 'failed', error: result.error });
    }
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'wa_send_failed' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('marks the row failed when fetch itself dies (retries exhausted)', async () => {
    const { wa } = makeClient(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await wa.sendText('+917700900014', 'network death', {
      conversationId: null,
      sender: 'system',
    });
    expect(result).toMatchObject({ ok: false, error: 'fetch failed' });
    if (!result.ok) {
      const [row] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, result.messageId ?? ''));
      expect(row?.status).toBe('failed');
    }
  });

  it('treats a 2xx without a message id as a failure (no invented wa id)', async () => {
    const { wa } = makeClient(
      async () =>
        new Response(JSON.stringify({ messages: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const result = await wa.sendText('+917700900015', 'idless 2xx', {
      conversationId: null,
      sender: 'system',
    });
    expect(result).toMatchObject({ ok: false, error: 'Graph 2xx without a message id' });
  });
});

describe('markRead', () => {
  it('posts the §5.3 mark-read shape and reports ok', async () => {
    let sentBody: unknown;
    const { wa } = makeClient(async (_url, options) => {
      sentBody = JSON.parse(options?.body ?? '');
      return new Response('{"success":true}', { status: 200 });
    });
    expect(await wa.markRead('wamid.INBOUND-TO-READ')).toBe(true);
    expect(sentBody).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.INBOUND-TO-READ',
    });
  });

  it('returns false instead of throwing on network failure', async () => {
    const { wa } = makeClient(async () => {
      throw new Error('offline');
    });
    expect(await wa.markRead('wamid.X')).toBe(false);
  });
});
