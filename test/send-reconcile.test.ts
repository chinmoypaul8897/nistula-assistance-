/**
 * CH-18c stale send-intent reconciliation (src/wa/sendReconcile.ts). Real Postgres.
 *
 * The contract: a 'queued' row stranded by a crash (older than the window) is
 * marked terminally 'failed' with a verify-before-resend reason; a recent 'queued'
 * (possibly in flight) and any already-settled row ('sent'/'delivered'/'failed')
 * are LEFT ALONE; and it NEVER resends. Drives the real UPDATE, not a proxy.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { reconcileStaleSends, STALE_SEND_AFTER_MS } from '../src/wa/sendReconcile.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

const NOW = new Date('2026-07-19T12:00:00Z');
const STALE_AT = new Date(NOW.getTime() - STALE_SEND_AFTER_MS - 60_000); // 11 min old
const RECENT_AT = new Date(NOW.getTime() - 60_000); // 1 min old — may be in flight

function capture() {
  const lines: Record<string, unknown>[] = [];
  return {
    lines,
    log: {
      error: (obj: Record<string, unknown>, msg?: string) => lines.push({ level: 'error', msg, ...obj }),
      warn: (obj: Record<string, unknown>, msg?: string) => lines.push({ level: 'warn', msg, ...obj }),
    },
  };
}

type MsgStatus = (typeof schema.messages.$inferInsert)['status'];
async function insert(waMessageId: string, status: MsgStatus, createdAt: Date) {
  await db.insert(schema.messages).values({
    conversationId: null,
    direction: 'out',
    sender: 'ai',
    type: 'text',
    status,
    body: 'x',
    waMessageId,
    createdAt,
  });
}

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql.raw('TRUNCATE messages CASCADE'));
});

describe('reconcileStaleSends', () => {
  it('marks a STALE queued row failed (verify-before-resend) and leaves everything else', async () => {
    await insert('wamid.STALE', 'queued', STALE_AT);
    await insert('wamid.RECENT', 'queued', RECENT_AT); // too new — may be in flight
    await insert('wamid.SENT', 'sent', STALE_AT); // already settled
    await insert('wamid.DELIVERED', 'delivered', STALE_AT);

    const cap = capture();
    const count = await reconcileStaleSends({ db, log: cap.log, now: () => NOW });
    expect(count).toBe(1);

    const rows = Object.fromEntries(
      (await db.select().from(schema.messages).orderBy(asc(schema.messages.waMessageId))).map((r) => [
        r.waMessageId,
        r,
      ]),
    );
    expect(rows['wamid.STALE']!.status).toBe('failed');
    expect(rows['wamid.STALE']!.error).toMatch(/reconciled.*verify before/i);
    // NEVER touched: a recent queued (in flight) or any settled row.
    expect(rows['wamid.RECENT']!.status).toBe('queued');
    expect(rows['wamid.SENT']!.status).toBe('sent');
    expect(rows['wamid.DELIVERED']!.status).toBe('delivered');
    // Ops was alerted once.
    expect(cap.lines.some((l) => l.opsAlert === 'send_reconciled_stale')).toBe(true);
  });

  it('is a no-op (no alert) when nothing is stranded', async () => {
    await insert('wamid.RECENT', 'queued', RECENT_AT);
    const cap = capture();
    const count = await reconcileStaleSends({ db, log: cap.log, now: () => NOW });
    expect(count).toBe(0);
    expect(cap.lines.some((l) => l.opsAlert === 'send_reconciled_stale')).toBe(false);
    const [row] = await db.select().from(schema.messages).where(eq(schema.messages.waMessageId, 'wamid.RECENT'));
    expect(row?.status).toBe('queued');
  });

  it('NEVER resends — it only settles the row to failed', async () => {
    // A stranded row that in truth DID reach Meta (we cannot tell) must not be
    // re-dispatched; reconciliation only writes the DB, never calls the wa client.
    await insert('wamid.MAYBE_SENT', 'queued', STALE_AT);
    const cap = capture();
    await reconcileStaleSends({ db, log: cap.log, now: () => NOW });
    const [row] = await db.select().from(schema.messages).where(eq(schema.messages.waMessageId, 'wamid.MAYBE_SENT'));
    // Still exactly one row, terminally failed — no second send-intent was created.
    const all = await db.select().from(schema.messages);
    expect(all).toHaveLength(1);
    expect(row?.status).toBe('failed');
  });
});
