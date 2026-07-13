/**
 * CH-10 §3.4 atomicity pin: a booking event sent via sendInTx is visible
 * after the transaction commits and INVISIBLE after a rollback. This test
 * also guards the pg-boss fromDrizzle result-shape shim (txSend.ts WHY
 * comment) across upgrades — if a pg-boss bump changes the adapter contract,
 * this fails loudly before any poller misbehaves.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { BOOKING_CREATED_QUEUE } from '../src/jobs/index.js';
import { sendInTx } from '../src/jobs/txSend.js';
import { createTestBoss, TEST_URL } from './helpers/boss.js';

let client: ReturnType<typeof postgres>;
let db: Db;
let boss: PgBoss;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  boss = await createTestBoss();
}, 30_000);

afterAll(async () => {
  await boss?.stop({ graceful: false, timeout: 1000 });
  await client?.end();
});

describe('sendInTx', () => {
  it('a committed transaction leaves the event fetchable', async () => {
    let jobId = '';
    await db.transaction(async (tx) => {
      jobId = await sendInTx(boss, tx, BOOKING_CREATED_QUEUE, { reservationNo: 'TX-COMMIT-1' });
    });
    expect(jobId).not.toBe('');
    const jobs = await boss.fetch<{ reservationNo: string }>(BOOKING_CREATED_QUEUE, {
      batchSize: 10,
      ignoreStartAfter: true,
    });
    expect(jobs.map((j) => j.data.reservationNo)).toContain('TX-COMMIT-1');
    for (const job of jobs) await boss.complete(BOOKING_CREATED_QUEUE, job.id);
  });

  it('a rolled-back transaction leaves NO event — the §3.4 invariant', async () => {
    await expect(
      db.transaction(async (tx) => {
        await sendInTx(boss, tx, BOOKING_CREATED_QUEUE, { reservationNo: 'TX-ROLLBACK-1' });
        throw new Error('forced rollback after send');
      }),
    ).rejects.toThrow('forced rollback');
    const jobs = await boss.fetch<{ reservationNo: string }>(BOOKING_CREATED_QUEUE, {
      batchSize: 10,
      ignoreStartAfter: true,
    });
    expect(jobs.map((j) => j.data.reservationNo)).not.toContain('TX-ROLLBACK-1');
    for (const job of jobs) await boss.complete(BOOKING_CREATED_QUEUE, job.id);
  });

  it('a missing queue makes the whole transaction fail (poison-loop guard)', async () => {
    await expect(
      db.transaction(async (tx) => {
        await sendInTx(boss, tx, 'queue.that.does.not.exist', { reservationNo: 'X' });
      }),
    ).rejects.toThrow();
  });
});
