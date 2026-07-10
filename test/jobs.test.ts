/**
 * CH-03 queue mechanics against a real pg-boss (12.25.1), zero sleeps.
 * The two CANARY tests pin the stately-policy behaviours the whole design
 * leans on — if a pg-boss upgrade changes them, these fail by name instead
 * of the golden path flaking mysteriously.
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { sweepStrandedConversations } from '../src/brain/worker.js';
import { claimConversationTurn } from '../src/db/repos.js';
import { CONVERSATION_PROCESS_QUEUE, CONVERSATION_SWEEP_QUEUE, makeEnqueue } from '../src/jobs/index.js';
import { createTestBoss, TEST_URL } from './helpers/boss.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

let client: ReturnType<typeof postgres>;
let db: Db;
let boss: PgBoss;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
  boss = await createTestBoss();
}, 30_000);

afterAll(async () => {
  await boss?.stop({ graceful: false });
  await client?.end();
});

beforeEach(async () => {
  await boss.deleteAllJobs(CONVERSATION_PROCESS_QUEUE);
  await boss.deleteAllJobs(CONVERSATION_SWEEP_QUEUE);
});

const testLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

// Epoch-ms projections: raw values via db.execute arrive as strings, so the
// SQL hands back numbers-as-epoch and assertions Number() them.
async function processJobs(state?: 'created' | 'active') {
  return db.execute<{
    id: string;
    state: string;
    singleton_key: string | null;
    start_after_ms: number | string;
    created_on_ms: number | string;
  }>(sql`
    SELECT id::text AS id, state::text AS state, singleton_key,
           (extract(epoch FROM start_after) * 1000)::float8 AS start_after_ms,
           (extract(epoch FROM created_on) * 1000)::float8 AS created_on_ms
    FROM pgboss.job
    WHERE name = ${CONVERSATION_PROCESS_QUEUE}
    ${state === undefined ? sql`` : sql`AND state::text = ${state}`}
  `);
}

describe('stately canaries (verified 12.25.1 behaviour the design depends on)', () => {
  it('CANARY: a second send for a key with a CREATED job returns null (duplicate-safe)', async () => {
    const key = randomUUID();
    const first = await boss.send(
      CONVERSATION_PROCESS_QUEUE,
      { conversationId: key },
      { singletonKey: key, startAfter: 15 },
    );
    const second = await boss.send(
      CONVERSATION_PROCESS_QUEUE,
      { conversationId: key },
      { singletonKey: key, startAfter: 15 },
    );
    expect(first).toBeTypeOf('string');
    expect(second).toBeNull();
    expect(await processJobs('created')).toHaveLength(1);
  });

  it('CANARY: a send while the same key is ACTIVE succeeds — mid-run arrivals are never orphaned', async () => {
    const key = randomUUID();
    const first = await boss.send(
      CONVERSATION_PROCESS_QUEUE,
      { conversationId: key },
      { singletonKey: key },
    );
    const [job] = await boss.fetch(CONVERSATION_PROCESS_QUEUE, {
      batchSize: 1,
      ignoreStartAfter: true,
    });
    expect(job?.id).toBe(first);
    // The plain-singleton trap the plan warns about would return null here.
    const whileActive = await boss.send(
      CONVERSATION_PROCESS_QUEUE,
      { conversationId: key },
      { singletonKey: key, startAfter: 15 },
    );
    expect(whileActive).toBeTypeOf('string');
    await boss.complete(CONVERSATION_PROCESS_QUEUE, job?.id ?? '');
  });
});

describe('makeEnqueue (the single windows binding)', () => {
  it('writes singletonKey = conversationId and defaults startAfter to the quiet window', async () => {
    const key = randomUUID();
    await makeEnqueue(boss, DEBOUNCE_WINDOWS)(key);
    const [row] = await processJobs('created');
    expect(row?.singleton_key).toBe(key);
    const deltaMs = Number(row?.start_after_ms) - Number(row?.created_on_ms);
    expect(deltaMs).toBeGreaterThan(13_000);
    expect(deltaMs).toBeLessThan(17_000);
  });

  it('honours an explicit startAfter Date (the worker re-queue path)', async () => {
    const key = randomUUID();
    const when = new Date(Date.now() + 5_000);
    await makeEnqueue(boss, DEBOUNCE_WINDOWS)(key, when);
    const [row] = await processJobs('created');
    // pg-boss stores the ISO string we sent — ms fidelity.
    expect(Math.round(Number(row?.start_after_ms))).toBe(when.getTime());
  });
});

describe('sweeper (the recovery net)', () => {
  it('re-enqueues stranded conversations; skips fresh and fully-processed ones', async () => {
    const stranded = await seedConversation(db, '+917700900021');
    await seedGuestMessage(db, stranded.conversation.id, 'stranded', 90);
    const fresh = await seedConversation(db, '+917700900022');
    await seedGuestMessage(db, fresh.conversation.id, 'fresh', 10);
    const processed = await seedConversation(db, '+917700900023');
    const processedMsg = await seedGuestMessage(db, processed.conversation.id, 'done', 90);
    await claimConversationTurn(db, {
      conversationId: processed.conversation.id,
      expectedPointer: null,
      newPointer: processedMsg.id,
      lastGuestMsgAt: processedMsg.createdAt,
    });

    const enqueued: { conversationId: string; startAfter?: Date }[] = [];
    await sweepStrandedConversations({
      db,
      log: testLog(),
      windows: DEBOUNCE_WINDOWS,
      enqueue: async (conversationId, startAfter) => {
        enqueued.push({ conversationId, startAfter });
      },
    });
    expect(enqueued).toEqual([
      { conversationId: stranded.conversation.id, startAfter: new Date(0) },
    ]);
  });

  it('tolerates an already-queued conversation (send conflict is a no-op)', async () => {
    const stranded = await seedConversation(db, '+917700900024');
    await seedGuestMessage(db, stranded.conversation.id, 'stranded again', 120);
    const enqueue = makeEnqueue(boss, DEBOUNCE_WINDOWS);
    await enqueue(stranded.conversation.id); // pre-existing created job
    await sweepStrandedConversations({ db, log: testLog(), windows: DEBOUNCE_WINDOWS, enqueue });
    const rows = await processJobs('created');
    expect(rows.filter((r) => r.singleton_key === stranded.conversation.id)).toHaveLength(1);
  });
});
