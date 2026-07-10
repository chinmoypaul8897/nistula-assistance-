/**
 * THE golden-path e2e (plan.md §3.5 + CH-03 step 4) — must stay green in
 * every later chunk. Three rapid signed webhook POSTs travel the FULL real
 * wiring: fastify webhook → isNew-gated enqueue → stately dedupe →
 * startAfter deferral → real work() polling → debounced worker →
 * send-intent dispatch → exactly ONE combined reply.
 *
 * CH-04 rewrites ONLY the reply-body assertion (echo → mocked Claude).
 *
 * WHY the POSTs settle BEFORE work() registers: the webhook acks pre-
 * ingest, so with a live worker a CI stall between POSTs lets the first
 * job fire early — at which point a second echo is CORRECT behaviour and
 * "exactly one" would flake on a correct system. Live interleaving is
 * covered deterministically in brain-worker.test.ts; live timing by the
 * CH-03 phone demo.
 */
import { readFileSync } from 'node:fs';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { CONVERSATION_PROCESS_QUEUE, makeEnqueue, registerJobs } from '../src/jobs/index.js';
import { createWaClient } from '../src/wa/client.js';
import { createTestBoss, waitUntil, TEST_URL } from './helpers/boss.js';
import { buildWaApp, signBody } from './helpers/wa.js';

const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';

// Short injected windows — same shape, same code paths, CI-friendly time.
const WINDOWS = { quietMs: 1_000, maxWaitMs: 3_000, sweepAfterMs: 4_000, sweepIntervalCron: '*/2 * * * *' };

let client: ReturnType<typeof postgres>;
let db: Db;
let boss: PgBoss;
let app: Awaited<ReturnType<typeof buildWaApp>>;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
  boss = await createTestBoss();
}, 30_000);

afterAll(async () => {
  await app?.close();
  await boss?.stop({ graceful: false });
  await client?.end();
});

const fixtureRaw = readFileSync(
  new URL('./fixtures/wa/inbound-text.json', import.meta.url),
  'utf8',
);

/** A same-guest burst variant: new wamid + body, everything else verbatim. */
function burstVariant(wamid: string, body: string): string {
  const parsed = JSON.parse(fixtureRaw) as {
    entry: { changes: { value: { messages: { id: string; text: { body: string } }[] } }[] }[];
  };
  const message = parsed.entry[0]?.changes[0]?.value.messages[0];
  if (message === undefined) throw new Error('fixture shape changed');
  message.id = wamid;
  message.text.body = body;
  return JSON.stringify(parsed);
}

describe('golden path — burst in, exactly one reply out', () => {
  it(
    'three rapid inbound POSTs → one combined echo, window columns set, queue quiescent',
    { timeout: 20_000 },
    async () => {
      const graphCalls: { to: string; body: string }[] = [];
      const wa = createWaClient({
        db,
        log: { error: vi.fn(), warn: vi.fn() },
        graphBaseUrl: GRAPH,
        phoneNumberId: PHONE_ID,
        accessToken: 'test-token',
        httpImpl: async (_url, options) => {
          const parsed = JSON.parse(options?.body ?? '{}') as { to: string; text: { body: string } };
          graphCalls.push({ to: parsed.to, body: parsed.text.body });
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.GOLDEN-OUT-0001' }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        },
      });

      app = await buildWaApp(db, undefined, { enqueue: makeEnqueue(boss, WINDOWS) });

      const burst = [
        fixtureRaw, // 'Lorem ipsum dolor sit amet.'
        burstVariant('wamid.GOLDEN-0002', 'villa free?'),
        burstVariant('wamid.GOLDEN-0003', '20 dec'),
      ];
      for (const payload of burst) {
        const res = await app.inject({
          method: 'POST',
          url: '/webhooks/whatsapp',
          payload,
          headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
        });
        expect(res.statusCode).toBe(200);
      }

      // Barrier: all three ingests settled (D6 close-out) before the worker
      // goes live — see the header comment for why this is load-bearing.
      await waitUntil(async () => {
        const rows = await db
          .select({ processed: schema.rawEvents.processed, error: schema.rawEvents.error })
          .from(schema.rawEvents);
        return rows.length === 3 && rows.every((r) => r.processed && r.error === null);
      }, 'three raw events settled clean');

      const [conversation] = await db.select().from(schema.conversations);
      expect(conversation).toBeDefined();

      // NOW the real worker goes live: real work() at the 0.5s polling floor.
      const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      await registerJobs({ boss, db, wa, log, windows: WINDOWS, pollingIntervalSeconds: 0.5 });

      const outbound = () =>
        db
          .select()
          .from(schema.messages)
          .where(and(eq(schema.messages.direction, 'out')));

      await waitUntil(async () => (await outbound()).length === 1, 'one outbound row');
      // Deterministic negative: any residual re-queue no-op must complete
      // too — only then can "exactly one" never grow.
      await waitUntil(async () => {
        const rows = await db.execute<{ pending: number | string }>(sql`
          SELECT count(*)::int AS pending FROM pgboss.job
          WHERE name = ${CONVERSATION_PROCESS_QUEUE}
            AND state::text IN ('created', 'retry', 'active')
        `);
        // Raw execute values can arrive as strings — Number() both ways.
        return Number(rows[0]?.pending) === 0;
      }, 'conversation.process queue quiescent');

      const out = await outbound();
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
        sender: 'ai',
        status: 'sent',
        waMessageId: 'wamid.GOLDEN-OUT-0001',
        conversationId: conversation?.id,
      });
      // CH-04 rewrites these two body assertions (echo → Claude reply).
      expect(out[0]?.body?.startsWith('echo:')).toBe(true);
      for (const guestLine of ['Lorem ipsum dolor sit amet.', 'villa free?', '20 dec']) {
        expect(out[0]?.body).toContain(guestLine);
      }

      expect(graphCalls).toHaveLength(1);
      expect(graphCalls[0]?.to).toBe('+917700900001');

      // Window columns + pointer: written by the worker (closes CH-02's D2
      // deferral), derived from the newest guest MESSAGE time.
      const [newest] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.waMessageId, 'wamid.GOLDEN-0003'));
      const [conv] = await db.select().from(schema.conversations);
      expect(conv?.lastProcessedMessageId).toBe(newest?.id);
      expect(conv?.lastGuestMsgAt?.getTime()).toBe(newest?.createdAt.getTime());
      expect(conv?.serviceWindowExpiresAt?.getTime()).toBe(
        (newest?.createdAt.getTime() ?? 0) + 24 * 60 * 60 * 1000,
      );

      // The burst itself is intact and deduped-clean.
      const inbound = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.direction, 'in'));
      expect(inbound).toHaveLength(3);
    },
  );
});
