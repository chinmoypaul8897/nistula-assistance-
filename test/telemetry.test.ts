/**
 * Guardrail/policy telemetry (CH-07 step 4). Verifies the raw_events row
 * contract: source 'system', event_type kind, processed TRUE (the
 * processed=false set is CH-18b's re-drive set — CH-02 D6), and the
 * Paul-approved payload shape (full draft + guestPhone as the CH-18 scrub
 * key; draftHash as the log↔row correlation key).
 */
import { desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { createHitRecorder, draftHashOf } from '../src/brain/telemetry.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE raw_events CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

const log = { info: vi.fn(), warn: vi.fn() };
const ctx = { conversationId: 'c0ffee00-0000-4000-8000-000000000001', guestPhone: '+917700900050' };

async function newestRow() {
  const [row] = await db
    .select()
    .from(schema.rawEvents)
    .where(eq(schema.rawEvents.source, 'system'))
    .orderBy(desc(schema.rawEvents.createdAt), desc(schema.rawEvents.id))
    .limit(1);
  return row;
}

describe('createHitRecorder', () => {
  it('persists a guardrail hit with the full draft, hash and scrub key', async () => {
    const record = createHitRecorder(db, log, ctx);
    await record({
      kind: 'guardrail',
      rule: 'price_integrity',
      action: 'deferred',
      draft: 'Still ₹99,000, promise.',
      details: { unbacked: [99000] },
    });
    const row = await newestRow();
    expect(row?.eventType).toBe('guardrail');
    expect(row?.processed).toBe(true); // never joins the CH-18b re-drive set
    expect(row?.payload).toMatchObject({
      rule: 'price_integrity',
      action: 'deferred',
      draft: 'Still ₹99,000, promise.',
      draftHash: draftHashOf('Still ₹99,000, promise.'),
      conversationId: ctx.conversationId,
      guestPhone: ctx.guestPhone,
      details: { unbacked: [99000] },
    });
  });

  it('persists a policy hit with no draft and no draftHash (pre-model, no draft exists)', async () => {
    const record = createHitRecorder(db, log, ctx);
    await record({ kind: 'policy', rule: 'human_request', action: 'routed' });
    const row = await newestRow();
    expect(row?.eventType).toBe('policy');
    const payload = row?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ rule: 'human_request', action: 'routed' });
    expect(payload).not.toHaveProperty('draft');
    expect(payload).not.toHaveProperty('draftHash');
  });

  it('log line carries the hash and ids, never the draft body (§3.3)', async () => {
    log.info.mockClear();
    const record = createHitRecorder(db, log, ctx);
    await record({ kind: 'guardrail', rule: 'negotiation_lock', action: 'substituted', draft: 'secret body' });
    const [logged] = log.info.mock.calls.at(-1) ?? [];
    expect(logged).toMatchObject({ rule: 'negotiation_lock', draftHash: draftHashOf('secret body') });
    expect(JSON.stringify(logged)).not.toContain('secret body');
  });

  it('is best-effort: a failing insert warns and never throws (telemetry only)', async () => {
    log.warn.mockClear();
    const broken = {
      insert: () => {
        throw new Error('db down');
      },
    } as unknown as Db;
    const record = createHitRecorder(broken, log, ctx);
    await expect(
      record({ kind: 'guardrail', rule: 'leak_scan', action: 'blocked', draft: 'x' }),
    ).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });
});
