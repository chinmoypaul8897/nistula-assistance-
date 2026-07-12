/**
 * Shared pg-boss test rig (CH-03). One boss per test file, no background
 * loops (supervise/schedule off), spies on for deterministic awaits. Queue
 * RESET (delete + create), not just createQueue: on 12.25.1 createQueue is
 * a silent no-op for an existing queue — stale options from a previous run
 * would win forever, since queue rows outlive the app-table TRUNCATEs.
 */
import { PgBoss } from 'pg-boss';
import {
  ensureQueues,
  CONVERSATION_PROCESS_QUEUE,
  CONVERSATION_SUMMARISE_QUEUE,
  CONVERSATION_SWEEP_QUEUE,
  SUMMARISER_NIGHTLY_QUEUE,
} from '../../src/jobs/index.js';

export const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

/** Starts a background-free boss on the test DB with fresh queues and no jobs. */
export async function createTestBoss(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: TEST_URL,
    max: 3,
    supervise: false,
    schedule: false,
    __test__enableSpies: true,
  });
  // Teardown noise (a poll racing stop) must not crash the vitest process.
  boss.on('error', () => {});
  await boss.start();
  // EVERY production queue joins the reset — a stale queue row (they outlive
  // the app-table TRUNCATEs) with a leftover singleton job would silently
  // swallow sends across test files (CH-08 review finding).
  for (const queue of [
    CONVERSATION_PROCESS_QUEUE,
    CONVERSATION_SWEEP_QUEUE,
    CONVERSATION_SUMMARISE_QUEUE,
    SUMMARISER_NIGHTLY_QUEUE,
  ]) {
    await boss.deleteQueue(queue).catch(() => {}); // absent on first run
  }
  await ensureQueues(boss);
  return boss;
}

/**
 * One manual worker tick, zero sleeps: fetch (ignoring startAfter) and run
 * the PRODUCTION handler on each job, settling complete/fail like work()
 * would. Returns the jobs it drove.
 */
export async function tickQueue<T extends object>(
  boss: PgBoss,
  name: string,
  handler: (data: T) => Promise<void>,
): Promise<number> {
  const jobs = await boss.fetch<T>(name, { batchSize: 10, ignoreStartAfter: true });
  for (const job of jobs) {
    try {
      await handler(job.data);
      await boss.complete(name, job.id);
    } catch (error) {
      await boss.fail(name, job.id, error as object);
    }
  }
  return jobs.length;
}

/** Polls until fn returns a truthy value (waitForRawEvents style) — fails with the last state. */
export async function waitUntil<T>(
  fn: () => Promise<T | undefined | null | false>,
  what: string,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    last = await fn();
    if (last !== undefined && last !== null && last !== false) return last as T;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`waitUntil timed out: ${what} (last: ${JSON.stringify(last)})`);
}
