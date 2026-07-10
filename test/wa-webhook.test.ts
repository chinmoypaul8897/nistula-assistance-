/**
 * CH-02 step 2 integration — the webhook route against a real Postgres:
 * handshake, signature gate, inbound persistence with dedupe, tolerant
 * parsing, and the D6 raw_events write contract.
 */
import { readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { buildWaApp, signBody, TEST_VERIFY_TOKEN } from './helpers/wa.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/wa/${name}`, import.meta.url), 'utf8');

let client: ReturnType<typeof postgres>;
let db: Db;
let app: Awaited<ReturnType<typeof buildWaApp>>;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
  app = await buildWaApp(db);
}, 30_000);

afterAll(async () => {
  await app?.close();
  await client?.end();
});

function post(payload: string, header?: string) {
  return app.inject({
    method: 'POST',
    url: '/webhooks/whatsapp',
    payload,
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': header ?? signBody(payload),
    },
  });
}

// Ack-then-ingest means the response races the DB writes. The final act of
// ingest is the updateRawEvent close-out (D6), so "every raw event settled"
// (processed, or errored) is the reliable barrier — waiting on row COUNT
// alone would race the message inserts that happen between the two writes.
// EXACT count, not >=: D6's "one row per POST body" must fail loudly if a
// refactor ever writes per-entry rows (review finding).
async function waitForRawEvents(count: number): Promise<void> {
  let observed = 0;
  for (let i = 0; i < 300; i++) {
    const rows = await db
      .select({ processed: schema.rawEvents.processed, error: schema.rawEvents.error })
      .from(schema.rawEvents);
    observed = rows.length;
    if (rows.length === count && rows.every((r) => r.processed || r.error !== null)) return;
    if (rows.length > count) break; // over-count never self-heals — fail now
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`raw_events never settled at exactly ${count} rows (saw ${observed})`);
}

describe('GET handshake', () => {
  it('echoes hub.challenge for the correct verify token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=challenge-42`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('challenge-42');
  });

  it('403s a wrong token and a missing mode', async () => {
    const wrong = await app.inject({
      method: 'GET',
      url: '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x',
    });
    expect(wrong.statusCode).toBe(403);
    const missing = await app.inject({ method: 'GET', url: '/webhooks/whatsapp' });
    expect(missing.statusCode).toBe(403);
  });
});

describe('POST signature gate (§3.3: 401, logged, counted — never stored)', () => {
  it('401s a bad signature and stores NOTHING', async () => {
    const payload = fixture('inbound-text.json');
    const res = await post(payload, 'sha256=' + '0'.repeat(64));
    expect(res.statusCode).toBe(401);
    const raw = await db.select().from(schema.rawEvents);
    expect(raw).toHaveLength(0);
    const msgs = await db.select().from(schema.messages);
    expect(msgs).toHaveLength(0);
  });

  it('401s a missing header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload: fixture('inbound-text.json'),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('401s (never 500s) a bodyless POST with no content-type — internet probe', async () => {
    const res = await app.inject({ method: 'POST', url: '/webhooks/whatsapp' });
    expect(res.statusCode).toBe(401);
    const raw = await db.select().from(schema.rawEvents);
    expect(raw).toHaveLength(0);
  });
});

describe('inbound message persistence', () => {
  it('stores guest + conversation + message from a signed inbound text', async () => {
    const res = await post(fixture('inbound-text.json'));
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(1);

    const [guest] = await db
      .select()
      .from(schema.guests)
      .where(eq(schema.guests.phone, '+917700900001'));
    expect(guest?.waProfileName).toBe('Test Guest 1');

    const [message] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.FIXTURE-INBOUND-0001'));
    expect(message).toMatchObject({
      direction: 'in',
      sender: 'guest',
      type: 'text',
      body: 'Lorem ipsum dolor sit amet.',
      status: 'received',
    });
    expect(message?.conversationId).not.toBeNull();

    // D2: CH-02 writes NO window columns — CH-03's worker owns them.
    const [conversation] = await db.select().from(schema.conversations);
    expect(conversation?.lastGuestMsgAt).toBeNull();
    expect(conversation?.serviceWindowExpiresAt).toBeNull();

    const [raw] = await db.select().from(schema.rawEvents);
    expect(raw).toMatchObject({ source: 'whatsapp', eventType: 'messages', processed: true });
    expect(raw?.error).toBeNull();
  });

  it('dedupes a duplicate delivery — still exactly one message row (§3.4)', async () => {
    const res = await post(fixture('duplicate-delivery.json'));
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(2);
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.FIXTURE-INBOUND-0001'));
    expect(msgs).toHaveLength(1);
    // Both deliveries are audited, both processed clean.
    const raw = await db.select().from(schema.rawEvents);
    expect(raw.filter((r) => r.processed)).toHaveLength(2);
  });

  it('maps an unrecognised message type to `unsupported`', async () => {
    const res = await post(fixture('unsupported-type.json'));
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(3);
    const [message] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.FIXTURE-INBOUND-0002'));
    expect(message).toMatchObject({ type: 'unsupported', body: null, mediaId: null });
  });
});

describe('tolerant parsing (§5.3 — never 500)', () => {
  it('stores-and-tolerates an unknown change field (processed=true)', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ id: 'e1', changes: [{ field: 'smb_message_echoes', value: { future: true } }] }],
    });
    const res = await post(payload);
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(4);
    const raw = await db
      .select()
      .from(schema.rawEvents)
      .where(eq(schema.rawEvents.eventType, 'smb_message_echoes'));
    expect(raw[0]).toMatchObject({ processed: true, error: null });
  });

  it('stores an unparseable body with the D6 error marker', async () => {
    const payload = 'this is not json {';
    const res = await post(payload);
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(5);
    const raw = await db.select().from(schema.rawEvents);
    const bad = raw.find((r) => r.error === 'unparseable JSON body');
    expect(bad).toMatchObject({ processed: false, eventType: null });
    expect(bad?.payload).toBe(payload);
  });

  it('isolates a poison entry: sibling entries persist, error names the entry, no body text leaks', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        { id: 'poison', changes: 42 },
        {
          id: 'good',
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ profile: { name: 'Test Guest 2' }, wa_id: '917700900002' }],
                messages: [
                  {
                    from: '917700900002',
                    id: 'wamid.FIXTURE-INBOUND-0003',
                    timestamp: '1720620200',
                    type: 'text',
                    text: { body: 'private guest words' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const res = await post(payload);
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(6);

    // The good entry persisted despite the poison sibling.
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.FIXTURE-INBOUND-0003'));
    expect(msgs).toHaveLength(1);

    const raw = await db.select().from(schema.rawEvents);
    const poisoned = raw.find((r) => r.error !== null && r.error.startsWith('entry[0]:'));
    expect(poisoned?.processed).toBe(false);
    // §3.3 PII discipline: exception text only, never payload excerpts.
    expect(poisoned?.error).not.toContain('private guest words');
  });

  it('tolerates an inbound message with an unnormalisable phone (skipped, processed=true)', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'e2',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  { from: 'not-a-phone', id: 'wamid.BAD-PHONE', type: 'text', text: { body: 'x' } },
                ],
              },
            },
          ],
        },
      ],
    });
    const res = await post(payload);
    expect(res.statusCode).toBe(200);
    await waitForRawEvents(7);
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.waMessageId, 'wamid.BAD-PHONE'));
    expect(msgs).toHaveLength(0);
  });
});
