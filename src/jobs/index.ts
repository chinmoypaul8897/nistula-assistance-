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
import type { LoadedKnowledge } from '../brain/knowledge.js';
import { createRateWindow, type RateWindow } from '../brain/policy.js';
import {
  SUMMARISER,
  runNightlySummariser,
  summariseConversation,
  type SummariserDeps,
  type SummariserThresholds,
} from '../brain/summariser.js';
import type { DegradedTracker } from '../brain/tools/degraded.js';
import type { ToolRegistry } from '../brain/tools/registry.js';
import type { WebsiteClient } from '../brain/tools/websiteApi.js';
import {
  processConversation,
  sweepStrandedConversations,
  type WorkerDeps,
  type WorkerLogger,
} from '../brain/worker.js';
import type { Db } from '../db/client.js';
import type { EzeeClient } from '../ezee/client.js';
import { createEzeePoller } from '../ezee/poller.js';
import type { GateContext } from '../lifecycle/gates.js';
import { runReconcile } from '../lifecycle/reconcile.js';
import {
  cancelForBooking,
  LIFECYCLE,
  scheduleForBooking,
  type SchedulerDeps,
} from '../lifecycle/scheduler.js';
import { runSender } from '../lifecycle/sender.js';
import { istCalendarDay, nowIST } from '../lib/time.js';
import { summarizeError } from '../lib/logger.js';
import type { WaClient } from '../wa/client.js';

export const CONVERSATION_PROCESS_QUEUE = 'conversation.process';
export const CONVERSATION_SWEEP_QUEUE = 'conversation.sweep';
export const CONVERSATION_SUMMARISE_QUEUE = 'conversation.summarise';
export const SUMMARISER_NIGHTLY_QUEUE = 'summariser.nightly';
export const EZEE_POLL_QUEUE = 'ezee.poll';
// One queue per §5.2 event kind (plan CH-10 step 4's letter). No workers
// until CH-12 — see the retention note in ensureQueues.
export const BOOKING_CREATED_QUEUE = 'booking.created';
export const BOOKING_MODIFIED_QUEUE = 'booking.modified';
export const BOOKING_CANCELLED_QUEUE = 'booking.cancelled';
export const LIFECYCLE_SEND_QUEUE = 'lifecycle.send';
export const LIFECYCLE_RECONCILE_QUEUE = 'lifecycle.reconcile';
export const BOOKING_EVENT_QUEUES: Record<'created' | 'modified' | 'cancelled', string> = {
  created: BOOKING_CREATED_QUEUE,
  modified: BOOKING_MODIFIED_QUEUE,
  cancelled: BOOKING_CANCELLED_QUEUE,
};

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
    // CH-05: a turn is up to TWO tool loops (first + one guardrail regenerate),
    // bounded TOGETHER by turn.ts TURN_TOTAL_DEADLINE_MS (150s) + dispatch, kept
    // under the 180s expire so pg-boss does not re-insert a still-running job
    // (earliest expire detection ≈ expire + monitorInterval ≈ 195s). The claim
    // guard (D2) is the correctness backstop; this margin avoids the wasteful
    // duplicate tool loop, not a wrong send. See updateQueue below.
    expireInSeconds: 180,
  });
  // createQueue is a SILENT no-op on an ALREADY-created queue (verified 12.25.1)
  // — production queues were created at 120s in CH-03, so the raise only lands
  // via updateQueue. Idempotent; merges the given field only.
  await boss.updateQueue(CONVERSATION_PROCESS_QUEUE, { expireInSeconds: 180 });
  await boss.createQueue(CONVERSATION_SWEEP_QUEUE, {
    policy: 'standard',
    retryLimit: 0, // the next cron tick IS the retry
    expireInSeconds: 110, // < the 2-min cadence: a hung sweep can't stack
  });
  await boss.createQueue(CONVERSATION_SUMMARISE_QUEUE, {
    // WHY stately, not standard+singletonKey (CH-08 review finding 1): on
    // 12.25.1 a standard queue does NOT dedupe on singletonKey — every
    // overflow turn would stack a duplicate job and each loser would burn a
    // model call. Stately = ≤1 created AND ≤1 active per conversation;
    // completed jobs never block a later re-enqueue (unlike throttle slots).
    policy: 'stately',
    retryLimit: 1, // covers DB hiccups only — the handler swallows model failures
    retryDelay: 10,
    expireInSeconds: 120, // > the converse 55s deadline + DB reads, with margin
  });
  await boss.createQueue(SUMMARISER_NIGHTLY_QUEUE, {
    policy: 'standard',
    retryLimit: 0, // tomorrow's cron IS the retry
    expireInSeconds: 110, // the selector only queries + enqueues
  });
  await boss.createQueue(EZEE_POLL_QUEUE, {
    // stately + the constant singletonKey on the schedule send = the CH-10
    // overlap protection (≤1 created AND ≤1 active poll, DB-enforced).
    policy: 'stately',
    retryLimit: 0, // the next 60s cron tick IS the retry
    // Worst case ≈ two eZee calls (3 tries × 15s + backoff each ≈ 47s) plus
    // per-reservation txs + the ACK — 180s gives headroom; an expired hung
    // run is discarded (retryLimit 0) and ACK-after-commit makes the
    // redelivery safe. Changing this later needs updateQueue (CH-03 lesson).
    expireInSeconds: 180,
  });
  // The booking.* event queues MUST exist before the poller's first in-tx
  // send: boss.send throws on a missing queue, which would roll back the
  // mirror upsert and poison every poll cycle (never-ACKed redelivery loop).
  // retentionSeconds is the pg-boss default, stated so the CH-12 wait is a
  // visible bound: events queued before CH-12's workers exist survive 14
  // days; beyond that CH-12's reconciliation sweep re-derives from
  // bookings_mirror (§3.4) — the queues are wake-ups, not the truth.
  for (const queue of Object.values(BOOKING_EVENT_QUEUES)) {
    await boss.createQueue(queue, {
      policy: 'standard',
      retentionSeconds: 14 * 24 * 3600,
    });
  }
  // CH-12. Both follow the ezee.poll shape: stately + a constant singletonKey on
  // the schedule = at most one created AND one active run, DB-enforced. A sender
  // tick that overran into the next minute and doubled up would double-send.
  await boss.createQueue(LIFECYCLE_SEND_QUEUE, {
    policy: 'stately',
    retryLimit: 0, // the next minute's cron tick IS the retry
    // A batch of 10 sends against a degraded Graph is 10 x (3 tries x 10s + jitter)
    // ≈ 340s worst case. The old 110s expired a tick that was still working, so
    // pg-boss called it failed while it succeeded. stately + singletonKey is what
    // prevents overlap; the expire only needs to exceed honest work.
    expireInSeconds: 420,
  });
  await boss.createQueue(LIFECYCLE_RECONCILE_QUEUE, {
    policy: 'stately',
    retryLimit: 0, // the next hour's tick IS the retry
    expireInSeconds: 600,
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

/** The summarise enqueue (CH-08) — nightly selector and worker overflow share
 * it; stately + singletonKey dedupes per conversation exactly like process. */
export function makeEnqueueSummarise(boss: PgBoss) {
  return async function enqueueConversationSummarise(conversationId: string): Promise<void> {
    await boss.send(CONVERSATION_SUMMARISE_QUEUE, { conversationId }, { singletonKey: conversationId });
  };
}

export interface JobsDeps {
  /** A STARTED boss (boot calls boss.start() first). */
  boss: PgBoss;
  db: Db;
  wa: Pick<
    WaClient,
    'createSendIntent' | 'dispatchText' | 'sendText' | 'planTemplatedSend' | 'dispatchTemplated'
  >;
  log: WorkerLogger;
  /** The Claude client (§5.5) — server builds the real one; tests inject a fake. */
  converse: ConverseFn;
  /** CH-05 price tools — the registry, website client, degraded tracker, base URL. */
  toolRegistry: ToolRegistry;
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: DegradedTracker;
  /** Block [3] + fee whitelist (CH-08): boot passes loadKnowledge(); tests
   * inject a fake — REQUIRED so no worker path can fall back to disk reads. */
  knowledge: LoadedKnowledge;
  /** The summariser's model client (MODEL_ID_LIGHT — §6.1); defaults to the
   * main converse when unset, per plan.md CH-08 step 2. */
  converseLight?: ConverseFn;
  /** CH-08 thresholds — tests inject small values; production = the spec. */
  summariser?: SummariserThresholds;
  /** OPS_NUMBERS (E.164) for the interim price escalation; default none. */
  opsNumbers?: string[];
  /** Config NIGHT_START/NIGHT_END for the SITUATION block; default 20:00/10:00. */
  nightStart?: string;
  nightEnd?: string;
  /** Tests inject short windows; production uses the spec literals. */
  windows?: DebounceWindows;
  /** Tests lower this to the 0.5s floor; default 2s. */
  pollingIntervalSeconds?: number;
  /** §3.3 rate window (CH-07) — one per process; tests may inject their own. */
  rateWindow?: RateWindow;
  /** CH-10 eZee mirror. pollerEnabled comes from EZEE_POLLER_ENABLED —
   * default OFF: two pollers ACKing one eZee queue steal each other's
   * bookings (dev would consume prod's), so only Railway ever sets 1. */
  ezee?: { client: EzeeClient; pollerEnabled: boolean };
  /** CH-12 lifecycle. `gates` carries the four fail-closed gates (epoch/date/
   * status/source); `sendEnabled` is LIFECYCLE_SEND_ENABLED — off means rows
   * are still SCHEDULED but nothing is ever sent. Absent ⇒ the whole lifecycle
   * engine stays unmounted (tests that do not care). */
  lifecycle?: { gates: Omit<GateContext, 'today'>; sendEnabled: boolean };
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
  const enqueueSummarise = makeEnqueueSummarise(deps.boss);
  const thresholds = deps.summariser ?? SUMMARISER;
  const workerDeps: WorkerDeps = {
    db: deps.db,
    wa: deps.wa,
    log: deps.log,
    windows,
    converse: deps.converse,
    toolRegistry: deps.toolRegistry,
    website: deps.website,
    websiteBaseUrl: deps.websiteBaseUrl,
    degraded: deps.degraded,
    knowledge: deps.knowledge,
    opsNumbers: deps.opsNumbers ?? [],
    rateWindow: deps.rateWindow ?? createRateWindow(),
    nightStart: deps.nightStart ?? '20:00',
    nightEnd: deps.nightEnd ?? '10:00',
    enqueue,
    // On-demand hysteresis (CH-08): the worker reports overflow; the gate —
    // token-trim OR gap ≥ the nightly threshold — shares ONE constant source.
    summarise: { enqueue: enqueueSummarise, gapMin: thresholds.minUnsummarised },
  };
  const summariserDeps: SummariserDeps = {
    db: deps.db,
    log: deps.log,
    converse: deps.converseLight ?? deps.converse,
    thresholds,
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
  await deps.boss.work<{ conversationId: string }>(
    CONVERSATION_SUMMARISE_QUEUE,
    workOptions,
    async (jobs) => {
      for (const job of jobs) {
        const outcome = await summariseConversation(summariserDeps, job.data.conversationId);
        // Continuation after a CAPPED run (audit): 'applied'/'advanced' may
        // have compacted only part of the range (count/token caps) — one
        // follow-up job continues from the advanced cursor; a fully-compacted
        // thread pays a single model-free noop. Stately allows the send while
        // this job completes; failures are the sweeper class (next nightly).
        if (outcome === 'applied' || outcome === 'advanced') {
          try {
            await enqueueSummarise(job.data.conversationId);
          } catch (error) {
            deps.log.warn({ err: summarizeError(error) }, 'summarise continuation enqueue failed');
          }
        }
      }
    },
  );
  await deps.boss.work(SUMMARISER_NIGHTLY_QUEUE, workOptions, async () => {
    await runNightlySummariser({ ...summariserDeps, enqueueSummarise });
  });
  await scheduleCron(deps.boss, CONVERSATION_SWEEP_QUEUE, windows.sweepIntervalCron, 'Asia/Kolkata');
  // The 04:00 IST nightly compaction (plan.md CH-08 step 2 / §2.3).
  await scheduleCron(deps.boss, SUMMARISER_NIGHTLY_QUEUE, thresholds.cron, 'Asia/Kolkata');
  if (deps.ezee !== undefined) {
    if (deps.ezee.pollerEnabled) {
      const poller = createEzeePoller({
        db: deps.db,
        boss: deps.boss,
        client: deps.ezee.client,
        log: deps.log,
      });
      await deps.boss.work(EZEE_POLL_QUEUE, workOptions, async () => {
        await poller.runPoll();
      });
      // '* * * * *' = the §2.3 60s cadence (cron's floor); the constant
      // singletonKey pairs with the stately queue for overlap protection.
      await scheduleCron(deps.boss, EZEE_POLL_QUEUE, '* * * * *', 'Asia/Kolkata', {
        singletonKey: 'poll',
      });
      deps.log.info({}, 'eZee poller ENABLED (60s cron)');
    } else {
      // A cron registered by an earlier enabled boot in this SAME database
      // must stop firing into a workerless queue.
      await deps.boss.unschedule(EZEE_POLL_QUEUE).catch(() => {});
      deps.log.warn(
        {},
        'eZee poller DISABLED (EZEE_POLLER_ENABLED=0) — bookings_mirror will go stale',
      );
    }
  }
  if (deps.lifecycle !== undefined) {
    const { gates, sendEnabled } = deps.lifecycle;
    // `today` is re-derived on EVERY run, never captured at boot: a process that
    // stays up for a week would otherwise keep scheduling against the day it
    // booted, and the date gate would rot open.
    const quiet = { nightStart: deps.nightStart ?? '20:00', nightEnd: deps.nightEnd ?? '10:00' };
    const schedulerDeps = (fromSweep = false): SchedulerDeps => ({
      db: deps.db,
      log: deps.log,
      gates: { ...gates, today: istCalendarDay(nowIST()) },
      quiet,
      fromSweep,
    });

    for (const [kind, queue] of Object.entries(BOOKING_EVENT_QUEUES)) {
      await deps.boss.work<{ reservationNo: string }>(queue, workOptions, async (jobs) => {
        for (const job of jobs) {
          if (kind === 'cancelled') {
            await cancelForBooking(schedulerDeps(), job.data.reservationNo);
          } else {
            await scheduleForBooking(schedulerDeps(), job.data.reservationNo);
          }
        }
      });
    }

    await deps.boss.work(LIFECYCLE_SEND_QUEUE, workOptions, async () => {
      await runSender({
        db: deps.db,
        log: deps.log,
        wa: deps.wa,
        gates: { sources: gates.sources },
        enabled: sendEnabled,
      });
    });
    await deps.boss.work(LIFECYCLE_RECONCILE_QUEUE, workOptions, async () => {
      await runReconcile(schedulerDeps(true));
    });

    await scheduleCron(deps.boss, LIFECYCLE_SEND_QUEUE, LIFECYCLE.senderCron, 'Asia/Kolkata', {
      singletonKey: 'send',
    });
    await scheduleCron(
      deps.boss,
      LIFECYCLE_RECONCILE_QUEUE,
      LIFECYCLE.reconcileCron,
      'Asia/Kolkata',
      { singletonKey: 'reconcile' },
    );
    // Boot must not claim it is armed when it is inert. LIFECYCLE_EPOCH unset
    // means NOTHING is ever scheduled, so "ENABLED" would be a lie in the one
    // log line an operator reads to check.
    if (gates.epoch === undefined) {
      deps.log.warn(
        { sendEnabled },
        'lifecycle mounted but LIFECYCLE_EPOCH is UNSET — nothing will ever be scheduled',
      );
    } else {
      deps.log.info(
        { sendEnabled, epoch: gates.epoch.toISOString(), sources: gates.sources },
        sendEnabled
          ? 'lifecycle ENABLED — scheduled messages WILL be sent'
          : 'lifecycle mounted, sending DISABLED (LIFECYCLE_SEND_ENABLED=0) — rows accrue, nothing sends',
      );
    }
  } else {
    // Same reason as the poller's: a cron left by an earlier boot must not fire
    // into a queue that now has no worker.
    await deps.boss.unschedule(LIFECYCLE_SEND_QUEUE).catch(() => {});
    await deps.boss.unschedule(LIFECYCLE_RECONCILE_QUEUE).catch(() => {});
  }
  return { enqueueConversationProcess: enqueue };
}

/** Cron registration helper (CH-03 step 1) — every business cron states its
 * tz explicitly. `extra` carries send options for the scheduled job (CH-10:
 * the poll's constant singletonKey); schedule() upserts per queue, so
 * re-registration across restarts never duplicates. */
export async function scheduleCron(
  boss: PgBoss,
  name: string,
  cron: string,
  tz: string,
  extra?: { singletonKey?: string },
): Promise<void> {
  await boss.schedule(name, cron, {}, { tz, ...extra });
}
