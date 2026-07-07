/**
 * CH-01 integration tests — run against a real Postgres (docker-compose
 * locally, service container in CI). Never against the dev database: a
 * dedicated *_test database is created on the same server.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import {
  getOrCreateConversation,
  insertMessage,
  insertRawEvent,
  upsertGuestByPhone,
} from '../src/db/repos.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  // Create the test database on the same server if missing (42P04 = exists).
  const adminUrl = new URL(TEST_URL);
  const testDbName = adminUrl.pathname.slice(1);
  adminUrl.pathname = '/postgres';
  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`CREATE DATABASE "${testDbName}"`);
  } catch (error) {
    if ((error as { code?: string }).code !== '42P04') throw error;
  } finally {
    await admin.end();
  }

  // Done-when criterion: migrations apply cleanly TWICE (idempotent).
  await runMigrations(TEST_URL);
  await runMigrations(TEST_URL);

  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
}, 60_000);

afterAll(async () => {
  await client?.end();
});

describe('upsertGuestByPhone', () => {
  it('is idempotent — same phone twice yields one row, same id', async () => {
    const first = await upsertGuestByPhone(db, '+918810358517', 'Rahul');
    const second = await upsertGuestByPhone(db, '+918810358517', 'Rahul M');
    expect(second.id).toBe(first.id);
    expect(second.waProfileName).toBe('Rahul M');
    const all = await db.select().from(schema.guests);
    expect(all).toHaveLength(1);
  });

  it('does not blank the profile name when none is provided', async () => {
    const touched = await upsertGuestByPhone(db, '+918810358517');
    expect(touched.waProfileName).toBe('Rahul M');
  });
});

describe('getOrCreateConversation', () => {
  it('creates once and returns the same rolling conversation after', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900001');
    const a = await getOrCreateConversation(db, guest.id);
    const b = await getOrCreateConversation(db, guest.id);
    expect(a.id).toBe(b.id);
    expect(a.status).toBe('ai_active');
  });
});

describe('insertMessage', () => {
  it('dedupes on wa_message_id — duplicate delivery is a no-op (§3.4)', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900002');
    const convo = await getOrCreateConversation(db, guest.id);
    const base = {
      conversationId: convo.id,
      waMessageId: 'wamid.TEST-DUP-1',
      direction: 'in',
      sender: 'guest',
      type: 'text',
      body: 'hello',
      status: 'received',
    } as const;
    const first = await insertMessage(db, base);
    const dup = await insertMessage(db, base);
    expect(first.isNew).toBe(true);
    expect(dup.isNew).toBe(false);
    expect(dup.message).toBeNull();
  });

  it('allows many internal messages without wa ids (nullable unique)', async () => {
    const one = await insertMessage(db, {
      direction: 'out',
      sender: 'system',
      type: 'text',
      body: 'ops alert one',
      status: 'queued',
    });
    const two = await insertMessage(db, {
      direction: 'out',
      sender: 'system',
      type: 'text',
      body: 'ops alert two',
      status: 'queued',
    });
    expect(one.isNew).toBe(true);
    expect(two.isNew).toBe(true);
    expect(one.message?.conversationId).toBeNull(); // staff/ops sends carry no conversation
  });
});

// Drizzle wraps Postgres errors ("Failed query: …") and keeps the real
// message ("invalid input value for enum …") on error.cause — flatten both.
async function rejectionText(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return ''; // resolved — the caller's toMatch will fail loudly
  } catch (error) {
    const cause = (error as Error).cause;
    const causeText = cause instanceof Error ? cause.message : String(cause ?? '');
    return `${(error as Error).message} :: ${causeText}`;
  }
}

describe('schema integrity', () => {
  it('round-trips a raw event payload (done-when: manual insert round-trips)', async () => {
    const inserted = await insertRawEvent(db, {
      source: 'whatsapp',
      eventType: 'messages',
      payload: { entry: [{ id: 'test' }] },
    });
    const [read] = await db
      .select()
      .from(schema.rawEvents)
      .where(sql`${schema.rawEvents.id} = ${inserted.id}`);
    expect(read?.payload).toEqual({ entry: [{ id: 'test' }] });
    expect(read?.processed).toBe(false);
  });

  it('rejects values outside the pg enums', async () => {
    const text = await rejectionText(
      db.execute(
        sql`INSERT INTO raw_events (source, payload) VALUES ('carrier-pigeon', '{}'::jsonb)`,
      ),
    );
    expect(text).toMatch(/enum|invalid input/i);
  });

  it('rejects a second conversation for the same guest (unique guest_id)', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900003');
    await getOrCreateConversation(db, guest.id);
    const text = await rejectionText(
      db.execute(sql`INSERT INTO conversations (guest_id) VALUES (${guest.id})`),
    );
    expect(text).toMatch(/duplicate|unique/i);
  });
});
