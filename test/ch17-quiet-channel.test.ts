/**
 * CH-17 (pre-merge review fix) — a traffic timestamp must be computed from
 * GUEST-FACING traffic, not "any out row exists". Every ops alert / digest / SLA
 * nudge writes a direction='out', sender='system', conversation_id=null row
 * (committed 'queued' before the Graph call, so even a FAILED send leaves one) —
 * which used to mask a dropped inbound webhook from the very monitor built to
 * catch it. Assert the two helpers ignore system/failed/null-conversation rows.
 *
 * 🚨 SUPERSEDED IN PART (quiet-channel noise fix): the monitor NO LONGER reads
 * `lastGuestReplyDeliveredAt` at all. Narrowing "any out row" to "a delivered
 * GUEST reply" was the right direction but stopped one step short — an
 * UNPROMPTED lifecycle send is a delivered guest reply by every one of these
 * filters, and it is driven by the eZee poller, so it stays fresh while the
 * webhook is dead. The monitor now pairs `lastGuestInboundAt` with `lastEchoAt`:
 * both test the one fact it actually needs, that something ARRIVED through the
 * webhook. These assertions still pin the helper's own contract, which is
 * correct and worth keeping; they no longer describe the monitor's inputs.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { insertMessage, lastGuestInboundAt, lastGuestReplyDeliveredAt } from '../src/db/repos.js';
import { seedConversation } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE messages, conversations, guests CASCADE`);
  const { conversation } = await seedConversation(db, '+917700900731');
  conversationId = conversation.id;
});

afterAll(async () => {
  await client?.end();
});

const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

async function put(
  convId: string | null,
  direction: 'in' | 'out',
  sender: 'guest' | 'ai' | 'human' | 'system',
  status: 'received' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed',
  createdAt: Date,
): Promise<void> {
  await insertMessage(db, {
    conversationId: convId,
    direction,
    sender,
    type: 'text',
    body: 'x',
    status,
    createdAt,
  });
}

describe('lastGuestReplyDeliveredAt', () => {
  it('ignores a fresh SYSTEM ops-card row and returns the older delivered guest reply', async () => {
    await put(conversationId, 'out', 'ai', 'delivered', at(45)); // old, genuinely delivered
    await put(null, 'out', 'system', 'sent', at(1)); // fresh ops-card — the masking row
    await put(conversationId, 'out', 'ai', 'failed', at(1)); // fresh but FAILED — not proof

    const last = await lastGuestReplyDeliveredAt(db);
    expect(last).not.toBeNull();
    // ~45 min ago (the delivered reply), NOT ~1 min ago (system/failed rows).
    expect(Date.now() - (last as Date).getTime()).toBeGreaterThan(30 * 60_000);
  });

  it('is null when the only out rows are system/failed/queued (channel NOT proven alive)', async () => {
    await put(null, 'out', 'system', 'sent', at(1));
    await put(conversationId, 'out', 'ai', 'queued', at(1));
    await put(conversationId, 'out', 'ai', 'failed', at(1));
    expect(await lastGuestReplyDeliveredAt(db)).toBeNull();
  });
});

describe('lastGuestInboundAt', () => {
  it('returns the newest genuine guest inbound', async () => {
    await put(conversationId, 'in', 'guest', 'received', at(10));
    const last = await lastGuestInboundAt(db);
    expect(last).not.toBeNull();
    expect(Date.now() - (last as Date).getTime()).toBeLessThan(30 * 60_000);
  });

  it('is null when there is no guest inbound at all', async () => {
    await put(null, 'out', 'system', 'sent', at(1));
    expect(await lastGuestInboundAt(db)).toBeNull();
  });
});
