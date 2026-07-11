/**
 * Every pg-boss registration in one place (plan.md §3.2, CH-03 step 1).
 * Queue design per CH-03 decision D1 (verified semantics in progress.md):
 * policy 'stately' + startAfter + the worker-side quiet check — NOT
 * sendDebounced, which on the installed 12.25.1 is a leading-edge slot
 * throttle (first send runs immediately → a burst would echo twice).
 */
import { PgBoss } from 'pg-boss';
import type { ConverseFn } from '../brain/claude.js';
import { DEBOUNCE_WINDOWS, type DebounceWindows } from '../brain/debounce.js';
import {
  processConversation,
  sweepStrandedConversations,
  type WorkerDeps,
  type WorkerLogger,
} from '../brain/worker.js';
import type { Db } from '../db/client.js';
import { summarizeError } from '../lib/logger.js';
import type { WaClient } from '../wa/client.js';

export const CONVERSATION_PROCESS_QUEUE = 'conversation.process';
export const CONVERSATION_SWEEP_QUEUE = 'conversation.sweep';

let bossInstance: PgBoss | null = null;
let bossUrl: string | null = null;

/** The shared boss (unstarted) — first call wins the URL; a DIFFERENT url later throws (mirrors getDb). */
export function getBoss(databaseUrl: string): PgBoss {
  if (bossInstance !== null) {
    if (databaseUrl !== bossUrl) {
      throw new Error('getBoss called with a different DATABASE_URL than the initialised boss');
    }
    return bossInstance;
  }
  bossInstance = new PgBoss({
    connectionString: databaseUrl,
    max: 5,
    // WHY 15s (default 60s): stately fetch skips singleton keys with an
    // ACTIVE job via cached snapshots; at the default a follow-up job can
    // sit ~2min after a long run ends. 15s bounds that tail to ~30s —
    // negligible now, load-bearing once CH-04 makes runs long (D1).
    monitorIntervalSeconds: 15,
    queueCacheIntervalSeconds: 15,
  });
  bossUrl = databaseUrl;
  return bossInstance;
}

/** Graceful stop: drains active handlers (bounded), then closes boss's own pool. */
export async function stopBoss(timeoutMs = 25_000): Promise<void> {
  if (bossInstance === null) return;
  await bossInstance.stop({ graceful: true, timeout: timeoutMs });
  bossInstance = null;
  bossUrl = null;
}

/**
 * Queue creation, shared by boot and tests. NOTE (verified 12.25.1):
 * createQueue on an EXISTING queue is a silent no-op — options are NOT
 * updated. Changing retry/expire values later needs updateQueue (or queue
 * re-creation, which the test helper does). Values below are D1-binding.
 */
export async function ensureQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(CONVERSATION_PROCESS_QUEUE, {
    policy: 'stately', // ≤1 created AND ≤1 active per conversation — DB-enforced
    retryLimit: 3, // retries are harmless under the claim guard (D2)
    retryDelay: 10, // default is 0 = instant; give transient DB errors room
    retryBackoff: true,
    // CH-04 gives converse() a ~55s total deadline (< this 120s), so a single
    // model turn can never outlive expire. TODO(CH-05): the 5-round tool loop
    // can exceed 120s — raise expire via updateQueue (createQueue is a no-op
    // on an existing queue) and size a new internal deadline below it.
    expireInSeconds: 120,
  });
  await boss.createQueue(CONVERSATION_SWEEP_QUEUE, {
    policy: 'standard',
    retryLimit: 0, // the next cron tick IS the retry
    expireInSeconds: 110, // < the 2-min cadence: a hung sweep can't stack
  });
}

/**
 * The one enqueue used by webhook, worker re-check and sweeper — a single
 * binding of the debounce windows, so the enqueue delay and the worker's
 * quiet check can never drift apart.
 */
export function makeEnqueue(boss: PgBoss, windows: DebounceWindows) {
  return async function enqueueConversationProcess(
    conversationId: string,
    startAfter?: Date,
  ): Promise<void> {
    await boss.send(
      CONVERSATION_PROCESS_QUEUE,
      { conversationId },
      {
        // stately + singletonKey: at most one queued job per conversation; a
        // null return (conflict) is fine — the existing job covers this wake.
        singletonKey: conversationId,
        startAfter: startAfter ?? windows.quietMs / 1000,
      },
    );
  };
}

export interface JobsDeps {
  /** A STARTED boss (boot calls boss.start() first). */
  boss: PgBoss;
  db: Db;
  wa: Pick<WaClient, 'createSendIntent' | 'dispatchText'>;
  log: WorkerLogger;
  /** The Claude client (§5.5) — server builds the real one; tests inject a fake. */
  converse: ConverseFn;
  /** Config NIGHT_START/NIGHT_END for the SITUATION block; default 20:00/10:00. */
  nightStart?: string;
  nightEnd?: string;
  /** Tests inject short windows; production uses the spec literals. */
  windows?: DebounceWindows;
  /** Tests lower this to the 0.5s floor; default 2s. */
  pollingIntervalSeconds?: number;
}

export interface Jobs {
  enqueueConversationProcess: (conversationId: string, startAfter?: Date) => Promise<void>;
}

/** Registers queues, workers and the sweeper schedule; returns the bound enqueue for the webhook. */
export async function registerJobs(deps: JobsDeps): Promise<Jobs> {
  // An unhandled 'error' EventEmitter event would crash the process
  // (verified 12.25.1) — maintenance errors must land in logs instead.
  deps.boss.on('error', (error) => {
    deps.log.error({ err: summarizeError(error) }, 'pg-boss error');
  });
  await ensureQueues(deps.boss);
  const windows = deps.windows ?? DEBOUNCE_WINDOWS;
  const enqueue = makeEnqueue(deps.boss, windows);
  const workerDeps: WorkerDeps = {
    db: deps.db,
    wa: deps.wa,
    log: deps.log,
    windows,
    converse: deps.converse,
    nightStart: deps.nightStart ?? '20:00',
    nightEnd: deps.nightEnd ?? '10:00',
    enqueue,
  };

  // batchSize/localConcurrency stay 1 (D1-BINDING): one stately fetch
  // conflict aborts the ENTIRE fetch statement on 12.25.1 — a bigger batch
  // would silently starve unrelated conversations sharing the poll.
  const workOptions = {
    batchSize: 1,
    pollingIntervalSeconds: deps.pollingIntervalSeconds ?? 2,
  };
  await deps.boss.work<{ conversationId: string }>(
    CONVERSATION_PROCESS_QUEUE,
    workOptions,
    async (jobs) => {
      for (const job of jobs) {
        await processConversation(workerDeps, job.data.conversationId);
      }
    },
  );
  await deps.boss.work(CONVERSATION_SWEEP_QUEUE, workOptions, async () => {
    await sweepStrandedConversations(workerDeps);
  });
  await scheduleCron(deps.boss, CONVERSATION_SWEEP_QUEUE, windows.sweepIntervalCron, 'Asia/Kolkata');
  return { enqueueConversationProcess: enqueue };
}

/** Cron registration helper (CH-03 step 1) — every business cron states its tz explicitly. */
export async function scheduleCron(
  boss: PgBoss,
  name: string,
  cron: string,
  tz: string,
): Promise<void> {
  await boss.schedule(name, cron, {}, { tz });
}
