/**
 * §3.3: "If a roster member is also a guest, roster wins (their number never
 * gets an AI conversation) and it's logged."
 *
 * This is the security gate plan §8 CH-13 names: "guests can never trigger
 * staff-command parsing (direction+number checks)". Both directions are
 * asserted here, against the real webhook and a real Postgres — the check is
 * two lines of code, and two lines of code is exactly how a guest ends up able
 * to close another guest's task.
 *
 * Phone decade 8xx is CH-13a's claim in the test-number ledger.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { buildWaApp, signBody } from './helpers/wa.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '917700900811';
const STAFF = '917700900812';

let client: ReturnType<typeof postgres>;
let db: Db;
let app: Awaited<ReturnType<typeof buildWaApp>>;
const enqueued: string[] = [];
const commands: { phone: string; waMessageId: string }[] = [];

const inbound = (from: string, body: string, id: string) =>
  JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'e1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '1', display_phone_number: '1' },
              contacts: [{ wa_id: from, profile: { name: 'Somebody' } }],
              messages: [
                { id, from, type: 'text', text: { body }, timestamp: '1784200000' },
              ],
            },
          },
        ],
      },
    ],
  });

/**
 * Ack-then-ingest means `inject` resolves on the 200, NOT when the writes
 * land — the CH-03 lesson, verbatim: a barrier must settle on the raw-event
 * CLOSE-OUT write (D6's last act of ingest), never on a row count, which would
 * race the message inserts happening between the two writes.
 */
async function settle(target: number, into: ReturnType<typeof postRaw>): Promise<void> {
  await into;
  for (let i = 0; i < 300; i += 1) {
    const rows = await db.execute(
      sql`SELECT processed, error FROM raw_events`,
    );
    const all = [...rows] as { processed: boolean; error: string | null }[];
    if (all.length === target && all.every((r) => r.processed || r.error !== null)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`raw_events never settled at ${target}`);
}

const postRaw = (payload: string) =>
  app.inject({
    method: 'POST',
    url: '/webhooks/whatsapp',
    payload,
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': signBody(payload),
    },
  });

let posted = 0;
const post = async (payload: string) => {
  posted += 1;
  await settle(posted, postRaw(payload));
};

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
  app = await buildWaApp(db, undefined, {
    enqueue: async (conversationId) => {
      enqueued.push(conversationId);
    },
    staff: {
      isStaffPhone: (phone) => phone === `+${STAFF}`,
      enqueueCommand: async (input) => {
        commands.push(input);
      },
    },
  });
});

afterAll(async () => {
  await app.close();
  await client.end();
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE messages, conversations, raw_events, guests, phone_windows CASCADE`,
  );
  enqueued.length = 0;
  commands.length = 0;
  posted = 0;
});

describe('roster wins over guest (§3.3)', () => {
  it('a staff message never creates a guest or a conversation, and never wakes the brain', async () => {
    await post(inbound(STAFF, 'DONE A3F2K9', 'wamid.staff1'));
    const guests = await db.execute(sql`SELECT count(*)::int AS n FROM guests`);
    const convos = await db.execute(sql`SELECT count(*)::int AS n FROM conversations`);
    expect([...guests][0]).toEqual({ n: 0 });
    expect([...convos][0]).toEqual({ n: 0 });
    expect(enqueued).toHaveLength(0);
    expect(commands).toEqual([{ phone: `+${STAFF}`, waMessageId: 'wamid.staff1' }]);
  });

  it('the staff message IS stored — plan step 3’s "stored, never AI-processed"', async () => {
    await post(inbound(STAFF, 'ok will do', 'wamid.staff2'));
    const rows = await db.execute(
      sql`SELECT conversation_id, sender, direction, body FROM messages WHERE wa_message_id = 'wamid.staff2'`,
    );
    expect([...rows]).toEqual([
      { conversation_id: null, sender: 'human', direction: 'in', body: 'ok will do' },
    ]);
  });

  it('🚨 a staff inbound STILL opens their own 24h window — their next card depends on it', async () => {
    // The classification sits AFTER touchPhoneWindow for exactly this reason:
    // a housekeeper quiet for a day is unreachable by free-form, and their
    // writing to us is what makes the next task card sendable.
    await post(inbound(STAFF, 'TASKS', 'wamid.staff3'));
    const rows = await db.execute(
      sql`SELECT phone FROM phone_windows WHERE phone = ${'+' + STAFF}`,
    );
    expect([...rows]).toHaveLength(1);
  });

  it('a REDELIVERED staff command is deduped by wa_message_id — enqueued once', async () => {
    await post(inbound(STAFF, 'DONE A3F2K9', 'wamid.staff4'));
    await post(inbound(STAFF, 'DONE A3F2K9', 'wamid.staff4'));
    expect(commands).toHaveLength(1);
  });
});

describe('🚨 a GUEST can never trigger staff-command parsing', () => {
  it('a guest typing DONE is ordinary text: a conversation, an AI wake, no command', async () => {
    await post(inbound(GUEST, 'DONE A3F2K9', 'wamid.guest1'));
    expect(commands).toHaveLength(0);
    expect(enqueued).toHaveLength(1);
    const rows = await db.execute(
      sql`SELECT sender, body FROM messages WHERE wa_message_id = 'wamid.guest1'`,
    );
    expect([...rows]).toEqual([{ sender: 'guest', body: 'DONE A3F2K9' }]);
  });

  it('a guest typing TASKS is likewise just text', async () => {
    await post(inbound(GUEST, 'TASKS', 'wamid.guest2'));
    expect(commands).toHaveLength(0);
    expect(enqueued).toHaveLength(1);
  });

  it('the guest path is untouched when no staff is configured at all', async () => {
    const plain = await buildWaApp(db, undefined, {
      enqueue: async (conversationId) => {
        enqueued.push(conversationId);
      },
    });
    const payload = inbound(GUEST, 'hello', 'wamid.guest3');
    await plain.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
    });
    posted += 1;
    await settle(posted, Promise.resolve(undefined as never));
    expect(enqueued).toHaveLength(1);
    await plain.close();
  });
});
