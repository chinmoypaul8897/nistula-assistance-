/**
 * CH-18b coexistence history import (wa/history.ts + the jobs worker + the webhook
 * enqueue seam). Real Postgres — the guards are about what actually lands in the
 * messages/guests/phone_windows tables, so a fake db could not falsify them.
 *
 * The five contract guards under test:
 *  1. NO brain wake — a history POST never enqueues a conversation.
 *  2. The message's OWN timestamp is preserved; a timestamp-less one is skipped.
 *  3. NO phone window is opened — importing old history must not re-open a window.
 *  4. Roster SKIP — a staff/ops thread grows no guest.
 *  5. Dedupe on wa_message_id — a re-run imports nothing new.
 *
 * Phones use the reserved +91 7700 90xxxx test band (wa_id = the bare digits).
 */
import { readFileSync } from 'node:fs';
import { asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { insertRawEvent } from '../src/db/repos.js';
import { runHistoryImport } from '../src/jobs/index.js';
import { importHistory, type HistoryImportDeps } from '../src/wa/history.js';
import type { WaInboundMessage, WaValue } from '../src/wa/types.js';
import { buildWaApp, signBody } from './helpers/wa.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const CONTACT_WAID = '917700900470';
const CONTACT_PHONE = '+917700900470';
const BIZ_WAID = '917700900001';
const TABLES = 'messages, conversations, raw_events, guests, phone_windows';

let client: ReturnType<typeof postgres>;
let db: Db;
const summariseCalls: string[] = [];
const noopLog = { info: () => {}, warn: () => {}, error: () => {} };

function deps(over?: Partial<HistoryImportDeps>): HistoryImportDeps {
  return {
    db,
    log: noopLog,
    enqueueSummarise: async (id: string) => {
      summariseCalls.push(id);
    },
    ...over,
  };
}

function guestMsg(id: string, ts: string, body: string): WaInboundMessage {
  return { from: CONTACT_WAID, id, timestamp: ts, type: 'text', text: { body } };
}
function bizMsg(id: string, ts: string, body: string): WaInboundMessage {
  return { from: BIZ_WAID, id, timestamp: ts, type: 'text', text: { body } };
}
function value(messages: WaInboundMessage[], threadId: string = CONTACT_WAID): WaValue {
  return {
    contacts: [{ wa_id: CONTACT_WAID, profile: { name: 'ZaraHistory' } }],
    history: [{ metadata: { progress: 100 }, threads: [{ id: threadId, messages }] }],
  };
}

async function messagesInOrder() {
  return db.select().from(schema.messages).orderBy(asc(schema.messages.createdAt));
}

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql.raw(`TRUNCATE ${TABLES} CASCADE`));
  summariseCalls.length = 0;
});

describe('importHistory — linking, direction, timestamps', () => {
  it('imports a thread from the documented fixture with the right direction and history times', async () => {
    const body = JSON.parse(
      readFileSync(new URL('./fixtures/wa/history-basic.json', import.meta.url), 'utf8'),
    ) as { entry: { changes: { value: WaValue }[] }[] };
    const report = await importHistory(deps(), body.entry[0]!.changes[0]!.value);

    expect(report).toMatchObject({ threads: 1, importedMessages: 2, duplicateMessages: 0 });
    const rows = await messagesInOrder();
    expect(rows).toHaveLength(2);
    // Guest message: from === contact ⇒ in/guest/received.
    expect(rows[0]).toMatchObject({ direction: 'in', sender: 'guest', status: 'received' });
    // Business message: from !== contact ⇒ out/human/sent.
    expect(rows[1]).toMatchObject({ direction: 'out', sender: 'human', status: 'sent' });
    // Guard 2: the message's OWN unix-seconds timestamp, not receipt time.
    expect(rows[0]!.createdAt.getTime()).toBe(1_710_000_000_000);
    expect(rows[1]!.createdAt.getTime()).toBe(1_710_000_600_000);

    const [guest] = await db.select().from(schema.guests).where(eq(schema.guests.phone, CONTACT_PHONE));
    expect(guest?.waProfileName).toBe('Test Guest 47');
    // Backfill enqueued exactly once for the one touched conversation.
    expect(summariseCalls).toEqual([rows[0]!.conversationId]);
  });

  it('GUARD 3: opens NO phone window (importing old history must not re-open one)', async () => {
    await importHistory(deps(), value([guestMsg('wamid.W1', '1710000000', 'hello')]));
    const windows = await db.select().from(schema.phoneWindows);
    expect(windows).toHaveLength(0);
  });

  it('GUARD 2: a message with no usable timestamp is SKIPPED, never stamped now()', async () => {
    const noTs: WaInboundMessage = { from: CONTACT_WAID, id: 'wamid.NoTs', type: 'text', text: { body: 'x' } };
    const report = await importHistory(deps(), value([noTs, guestMsg('wamid.Ok', '1710000000', 'ok')]));
    expect(report).toMatchObject({ importedMessages: 1, skippedMessages: 1 });
    const rows = await messagesInOrder();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.waMessageId).toBe('wamid.Ok');
  });
});

describe('importHistory — idempotency and ordering', () => {
  it('GUARD 5: a re-run imports nothing new and enqueues no further backfill', async () => {
    const v = value([guestMsg('wamid.D1', '1710000000', 'a'), bizMsg('wamid.D2', '1710000600', 'b')]);
    await importHistory(deps(), v);
    summariseCalls.length = 0;
    const report = await importHistory(deps(), v);
    expect(report).toMatchObject({ importedMessages: 0, duplicateMessages: 2 });
    expect(await messagesInOrder()).toHaveLength(2);
    // Nothing new ⇒ no re-summarise (an all-duplicate redelivery buys no model call).
    expect(summariseCalls).toEqual([]);
  });

  it('imports OUT-OF-ORDER chunks and stores them in true time order', async () => {
    // Chunk A (arrives first) carries the LATER message; chunk B the earlier one.
    await importHistory(deps(), value([guestMsg('wamid.March', '1710000000', 'March?')]));
    await importHistory(deps(), value([guestMsg('wamid.Feb', '1707000000', 'Feb?')]));
    const rows = await messagesInOrder();
    expect(rows.map((r) => r.waMessageId)).toEqual(['wamid.Feb', 'wamid.March']);
    // Both chunks added a message ⇒ both enqueued a backfill.
    expect(summariseCalls).toHaveLength(2);
  });
});

describe('importHistory — threads that must create nothing', () => {
  it('GUARD 4: a roster/ops thread is skipped — no guest, no messages', async () => {
    const report = await importHistory(
      deps({ isStaffPhone: (phone) => phone === CONTACT_PHONE }),
      value([guestMsg('wamid.R1', '1710000000', 'staff hi')]),
    );
    expect(report).toMatchObject({ threads: 1, skippedThreads: 1, importedMessages: 0 });
    expect(await db.select().from(schema.guests)).toHaveLength(0);
    expect(await db.select().from(schema.messages)).toHaveLength(0);
  });

  it('a declined-consent (empty-messages) thread creates no guest', async () => {
    const report = await importHistory(deps(), value([]));
    expect(report).toMatchObject({ threads: 1, skippedThreads: 1, importedMessages: 0 });
    expect(await db.select().from(schema.guests)).toHaveLength(0);
    expect(summariseCalls).toEqual([]);
  });

  it('a thread whose every message is unparseable creates no guest', async () => {
    const junk: WaInboundMessage[] = [{ text: { body: 'no id, no from, no ts' } }, { id: 'x' }];
    const report = await importHistory(deps(), value(junk));
    expect(report).toMatchObject({ skippedThreads: 1, skippedMessages: 2, importedMessages: 0 });
    expect(await db.select().from(schema.guests)).toHaveLength(0);
  });

  it('a thread id that will not normalise is skipped', async () => {
    const report = await importHistory(deps(), value([guestMsg('wamid.N1', '1710000000', 'hi')], 'not-a-phone'));
    expect(report).toMatchObject({ skippedThreads: 1, importedMessages: 0 });
  });
});

describe('runHistoryImport — the worker re-reads the raw event', () => {
  it('imports only history/smb_app_state_sync changes from the stored body', async () => {
    // A body carrying BOTH a live-messages change and a history change: the worker
    // must import the history and ignore the messages change (that is the hot path's).
    const raw = await insertRawEvent(db, {
      source: 'whatsapp',
      eventType: 'messages,history',
      payload: {
        entry: [
          {
            changes: [
              { field: 'messages', value: { messages: [{ from: '919999999999', id: 'live1', type: 'text' }] } },
              { field: 'history', value: value([guestMsg('wamid.HW1', '1710000000', 'hi')]) },
            ],
          },
        ],
      },
      processed: true,
      error: null,
    });
    await runHistoryImport(
      { db, log: noopLog, enqueueSummarise: async (id) => { summariseCalls.push(id); } },
      raw.id,
    );
    const rows = await db.select().from(schema.messages);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.waMessageId).toBe('wamid.HW1');
    expect(summariseCalls).toHaveLength(1);
  });

  it('a missing raw event is a logged drop, not a throw', async () => {
    await expect(
      runHistoryImport(
        { db, log: noopLog, enqueueSummarise: async () => {} },
        '00000000-0000-0000-0000-000000000000',
      ),
    ).resolves.toBeUndefined();
  });
});

describe('webhook enqueue seam', () => {
  it('GUARD 1: a signed history POST enqueues import, stores raw, and does NOT wake the brain', async () => {
    const enqueueCalls: string[] = [];
    const historyEnqueues: string[] = [];
    const app = await buildWaApp(db, undefined, {
      enqueue: async (id) => { enqueueCalls.push(id); },
      history: { enqueue: async (id) => { historyEnqueues.push(id); } },
    });
    const payload = readFileSync(new URL('./fixtures/wa/history-basic.json', import.meta.url), 'utf8');
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
    });
    expect(res.statusCode).toBe(200);
    // Wait for the post-ack ingest to enqueue the import (it stores the raw event
    // first, so once we see the enqueue the row is committed).
    for (let i = 0; i < 300 && historyEnqueues.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    const [row] = await db.select().from(schema.rawEvents);
    expect(row?.eventType).toBe('history');
    // Enqueued for import, keyed on the exact stored raw event id...
    expect(historyEnqueues).toEqual([row!.id]);
    // ...and the brain was NOT woken (guard 1) — no guest, no conversation enqueue.
    expect(enqueueCalls).toEqual([]);
    await app.close();
  });
});
