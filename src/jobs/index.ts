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
import { sql } from 'drizzle-orm';
import type { ReplyType } from '../config.js';
import type { Db } from '../db/client.js';
import { getMirrorByReservationNo } from '../db/bookings.js';
import { insertDraft } from '../db/drafts.js';
import { findConversationForTakeover, getMessageBody } from '../db/repos.js';
import type { EzeeClient } from '../ezee/client.js';
import { createEzeePoller } from '../ezee/poller.js';
import { bookingState, type GateContext } from '../lifecycle/gates.js';
import { runReconcile } from '../lifecycle/reconcile.js';
import {
  handleBookingEvent,
  LIFECYCLE,
  type BookingEventKind,
  type SchedulerDeps,
} from '../lifecycle/scheduler.js';
import { runSender } from '../lifecycle/sender.js';
import { istCalendarDay, nowIST } from '../lib/time.js';
import { summarizeError } from '../lib/logger.js';
import { buildEscalationDeps, buildStaffTaskDeps } from '../staff/index.js';
import {
  cancelArrivalVerifyTask,
  maybeCreateArrivalVerifyTask,
  type ArrivalTaskDeps,
} from '../staff/arrivalTasks.js';
import { handleStaffCommand } from '../staff/commands.js';
import { notifyDraft } from '../staff/draftNotify.js';
import { runDraftExpiry, DRAFT_EXPIRY_CRON } from '../staff/draftExpiry.js';
import { runQualityReport, QUALITY_REPORT_CRON } from '../staff/qualityReport.js';
import { applyHumanTakeover } from '../staff/humanTakeover.js';
import type { Roster } from '../staff/roster.js';
import { runSlaNudger, SLA_NUDGER_CRON } from '../staff/sla.js';
import { runMorningDigest, DIGEST_CRON } from '../staff/digest.js';
import { runWatchdog, WATCHDOG_CRON } from '../ops/watchdog.js';
import { runDailyRollup, ROLLUP_CRON } from '../ops/rollup.js';
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
export const STAFF_COMMAND_QUEUE = 'staff.command';
export const STAFF_SLA_QUEUE = 'staff.sla';
export const STAFF_DIGEST_QUEUE = 'staff.digest';
// CH-16 draft mode: the 5-min expiry sweep and the Sunday-18:00 quality report.
export const DRAFT_EXPIRY_QUEUE = 'draft.expiry';
export const DRAFT_QUALITY_REPORT_QUEUE = 'draft.quality_report';
// CH-17: the 5-min watchdog (health ping + quiet-channel monitor) and the
// 23:30 daily cost/ops rollup.
export const OPS_WATCHDOG_QUEUE = 'ops.watchdog';
export const OPS_ROLLUP_QUEUE = 'ops.rollup';
export const BOOKING_EVENT_QUEUES: Record<'created' | 'modified' | 'cancelled', string> = {
  created: BOOKING_CREATED_QUEUE,
  modified: BOOKING_MODIFIED_QUEUE,
  cancelled: BOOKING_CANCELLED_QUEUE,
};

/**
 * One booking.* job's whole effect, in ONE place so it is testable end to end
 * (D9: one queue = one consumer). The lifecycle scheduling and CH-13b's arrival
 * verify-task are INDEPENDENT: the task is RAISED for a live booking (create OR
 * modify — a hold that later confirms arrives as a MODIFY, and would otherwise
 * miss its task while its lifecycle scheduled) when staff is wired, and REVOKED
 * when the booking goes TERMINAL.
 *
 * 🚨 Revocation is guarded by the terminal CONTRACT (bookingState), NOT the
 * event enum (round 5). Round 4 keyed it on kind==='cancelled' — but a no_show
 * is equally terminal and reaches us as a booking.MODIFIED (a status diff), so
 * an enum guard left a no-show's verify-task lingering. bookingState==='terminal'
 * is exactly {cancelled, no_show} — the two states where the guest is not
 * coming — while checked_in/checked_out stay 'ok' (a stay that HAPPENED; its
 * task is closed by a human DONE, not auto-revoked).
 */
export async function processBookingJob(
  scheduler: SchedulerDeps,
  arrival: ArrivalTaskDeps | null,
  kind: BookingEventKind,
  reservationNo: string,
): Promise<void> {
  await handleBookingEvent(scheduler, kind, reservationNo);
  // Revoke on EITHER signal of "the guest is not coming": a cancel EVENT (always
  // terminal, robust to a racy mirror read), OR a mirror row that is terminal —
  // which catches a no_show, terminal but delivered as a booking.MODIFIED. The
  // enum alone (round 4) missed no_show; the contract alone would miss a cancel
  // whose tombstone we cannot re-read. Together they are complete.
  const row = await getMirrorByReservationNo(scheduler.db, reservationNo);
  const terminal = kind === 'cancelled' || (row !== null && bookingState(row) === 'terminal');
  if (terminal) {
    // scheduler.db, not arrival — cleanup must run even if the roster was
    // unwired since the task was raised.
    await cancelArrivalVerifyTask(scheduler.db, reservationNo);
  } else if (arrival !== null) {
    await maybeCreateArrivalVerifyTask(arrival, reservationNo);
  }
}

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
  // CH-13a. A staff command is a real person waiting for their DONE to land,
  // so unlike the crons it RETRIES: policy 'standard' (they are independent —
  // two staff typing DONE at once must both run), and the guarded UPDATE in
  // db/tasks.ts is what makes a retry safe rather than a double close.
  await boss.createQueue(STAFF_COMMAND_QUEUE, {
    policy: 'standard',
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    // One BKG-03-free path: a close is a few queries and two sends.
    expireInSeconds: 120,
  });
  // The nudger follows the lifecycle.send shape: stately + a constant
  // singletonKey on the schedule, so a tick that overran into the next
  // 5 minutes cannot double-buzz a housekeeper.
  await boss.createQueue(STAFF_SLA_QUEUE, {
    policy: 'stately',
    retryLimit: 0, // the next 5-minute tick IS the retry
    // 20 overdue tasks × up to 2 window-aware sends × the lib/http 3-try ladder.
    expireInSeconds: 420,
  });
  // CH-14b: the 10:00 morning digest — stately + a constant singletonKey so a
  // run that overran cannot double-convert or double-send.
  //
  // 🚨 retryLimit > 0, NOT 0 (review DEFECT): the digest is the SOLE converter of
  // night_queue tasks (the SLA ladder never chases them — RUNGS.night_queue is
  // empty), so a transient DB blip at 10:00 with no retry would orphan every
  // overnight escalation for ~24h. A few backed-off retries shrink that window to
  // minutes; the conversion is idempotent AND runs first, so a retry re-runs it
  // safely (or finds the work already done and the ladder carrying it).
  await boss.createQueue(STAFF_DIGEST_QUEUE, {
    policy: 'stately',
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    // The whole overnight queue: convert + one card each + the OPS sends.
    expireInSeconds: 420,
  });
  // CH-16 draft mode. Expiry: retryLimit 0 — the next 5-min tick IS the retry
  // (the SLA-queue precedent). Report: a few backed-off retries so a transient
  // blip at 18:00 Sunday does not lose the week's quality-bar data.
  await boss.createQueue(DRAFT_EXPIRY_QUEUE, {
    policy: 'stately',
    retryLimit: 0,
    expireInSeconds: 120,
  });
  await boss.createQueue(DRAFT_QUALITY_REPORT_QUEUE, {
    policy: 'stately',
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 120,
  });
  // CH-17. Watchdog: no retry — the next 5-min tick IS the retry; expire < the
  // cadence so a hung tick cannot stack. Rollup: a few backed-off retries so a
  // transient blip at 23:30 does not lose the day's cost/ops line.
  await boss.createQueue(OPS_WATCHDOG_QUEUE, {
    policy: 'standard',
    retryLimit: 0,
    expireInSeconds: 240,
  });
  await boss.createQueue(OPS_ROLLUP_QUEUE, {
    policy: 'stately',
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 120,
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
    | 'createSendIntent'
    | 'dispatchText'
    | 'sendText'
    | 'planTemplatedSend'
    | 'dispatchTemplated'
    // CH-13a: the task card and the SLA nudge. A staff number quiet for a day
    // is unreachable by free-form, so both need the template fallback.
    | 'sendTemplated'
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
  /** CH-17: HEALTHCHECKS_URL — the watchdog pings it when healthy. Unset ⇒ the
   * ping leg is skipped (dev); the quiet-channel + alert legs still run. */
  healthchecksUrl?: string;
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
  /** CH-13a staff tasks. Absent ⇒ the assistant has no hands: no
   * create_staff_task context, no staff-command worker, no SLA cron. The
   * roster may legitimately be EMPTY (it is, in dev and today in production) —
   * that is a different thing from unmounted, and it fails closed on its own:
   * assignFor returns null, the card reaches nobody, and nothing is promised. */
  staff?: { roster: Roster };
  /** CH-16 draft mode. draftMode = DRAFT_MODE, autoSendTypes = AUTO_SEND_TYPES
   * (both from config). Default direct (draftMode false) so a jobs test that
   * omits them keeps pre-CH-16 behaviour; production always passes config's. */
  draftMode?: boolean;
  autoSendTypes?: readonly ReplyType[];
}

export interface Jobs {
  enqueueConversationProcess: (conversationId: string, startAfter?: Date) => Promise<void>;
  /** CH-13a: the webhook's staff-command wake (§8 step 3). */
  enqueueStaffCommand: (input: { phone: string; waMessageId: string }) => Promise<void>;
  /** CH-14a: the coexistence takeover, bound to boss + db — server.ts hands this
   * to BOTH the webhook (`smb_message_echoes`) and the dev admin sim route so the
   * two paths share one implementation. */
  coexistence: {
    findConversation: (phone: string) => Promise<{ conversationId: string } | null>;
    apply: (input: {
      conversationId: string;
      echo: { waMessageId?: string; body: string | null; raw?: unknown };
    }) => Promise<void>;
  };
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
  // CH-13a. Built here rather than inside the poller branch on purpose: the
  // door read is BKG-03, a READ that never ACKs and so cannot consume the
  // shared eZee queue. Gating it on EZEE_POLLER_ENABLED would have made the
  // villa route dead in local dev, where that flag is BINDINGLY 0 — the
  // routing would silently fall back to the front desk on every task and look
  // like a design decision rather than a wiring bug.
  const staffWiring =
    deps.staff === undefined
      ? undefined
      : { db: deps.db, log: deps.log, wa: deps.wa, roster: deps.staff.roster, ezee: deps.ezee?.client };
  const staffTasks = staffWiring === undefined ? undefined : buildStaffTaskDeps(staffWiring);
  // CH-14a: escalate_to_human's collaborators. Same wiring source as tasks —
  // unwired ⇒ the tool refuses and the model falls back to a referral phrase.
  const escalationDeps = staffWiring === undefined ? undefined : buildEscalationDeps(staffWiring);
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
    // CH-13a: undefined ⇒ create_staff_task has no context and refuses, so the
    // assistant simply has no hands (its state before this chunk).
    tasks: staffTasks,
    // CH-14a: undefined ⇒ escalate_to_human refuses, model falls back to referral.
    escalation: escalationDeps,
    opsNumbers: deps.opsNumbers ?? [],
    rateWindow: deps.rateWindow ?? createRateWindow(),
    nightStart: deps.nightStart ?? '20:00',
    nightEnd: deps.nightEnd ?? '10:00',
    enqueue,
    // On-demand hysteresis (CH-08): the worker reports overflow; the gate —
    // token-trim OR gap ≥ the nightly threshold — shares ONE constant source.
    summarise: { enqueue: enqueueSummarise, gapMin: thresholds.minUnsummarised },
    // CH-16 draft mode. The `drafts` slice is ALWAYS wired (it is core, not an
    // optional feature); whether a reply is drafted is decided by draftMode +
    // autoSendTypes + needsHuman inside the worker. `create` runs in the claim
    // tx; `notify` cards ops via the same window-aware chokepoint the task
    // cards use.
    draftMode: deps.draftMode ?? false,
    autoSendTypes: deps.autoSendTypes ?? [],
    drafts: {
      create: (tx, input) => insertDraft(tx, input),
      notify: (opsNumbers, card) => notifyDraft({ log: deps.log, wa: deps.wa }, opsNumbers, card),
    },
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
  // CH-16 draft-mode maintenance — ALWAYS on (draft mode is core, not staff-gated;
  // the worker creates drafts regardless of the roster). Expiry sweeps lapsed
  // drafts every 5 min; the quality report runs Sunday 18:00 IST. Both are
  // fail-quiet and safe with no OPS number (dev's state).
  await deps.boss.work(DRAFT_EXPIRY_QUEUE, workOptions, async () => {
    await runDraftExpiry({ db: deps.db, log: deps.log, now: () => new Date() });
  });
  await scheduleCron(deps.boss, DRAFT_EXPIRY_QUEUE, DRAFT_EXPIRY_CRON, 'Asia/Kolkata', {
    singletonKey: 'draft_expiry',
  });
  await deps.boss.work(DRAFT_QUALITY_REPORT_QUEUE, workOptions, async () => {
    await runQualityReport({
      db: deps.db,
      log: deps.log,
      wa: deps.wa,
      opsNumbers: deps.opsNumbers ?? [],
      now: () => new Date(),
    });
  });
  await scheduleCron(deps.boss, DRAFT_QUALITY_REPORT_QUEUE, QUALITY_REPORT_CRON, 'Asia/Kolkata', {
    singletonKey: 'draft_quality_report',
  });
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
    const schedulerDeps = (fromSweep = false): SchedulerDeps => ({
      db: deps.db,
      log: deps.log,
      gates: { ...gates, today: istCalendarDay(nowIST()) },
      fromSweep,
    });

    // CH-13b's arrival auto-task rides the SAME booking consumer (D9: one queue,
    // one consumer — a second boss.work on this queue would split the jobs). It
    // is INDEPENDENT of the lifecycle result on purpose: a source-gated Airbnb
    // booking gets no message but its room still needs preparing, so the task
    // gate (epoch/date/status, no source) is asked separately.
    const arrivalTaskDeps = (): ArrivalTaskDeps | null => {
      if (deps.staff === undefined) return null;
      const now = nowIST();
      return {
        db: deps.db,
        log: deps.log,
        roster: deps.staff.roster,
        wa: deps.wa,
        epoch: gates.epoch,
        today: istCalendarDay(now),
        now,
      };
    };

    for (const [kind, queue] of Object.entries(BOOKING_EVENT_QUEUES) as [BookingEventKind, string][]) {
      await deps.boss.work<{ reservationNo: string }>(queue, workOptions, async (jobs) => {
        for (const job of jobs) {
          await processBookingJob(schedulerDeps(), arrivalTaskDeps(), kind, job.data.reservationNo);
        }
      });
    }

    await deps.boss.work(LIFECYCLE_SEND_QUEUE, workOptions, async () => {
      // today is re-derived per tick (never captured) so the stay-over backstop
      // cannot rot open on a long-lived process.
      await runSender({
        db: deps.db,
        log: deps.log,
        wa: deps.wa,
        gates: { sources: gates.sources, today: istCalendarDay(nowIST()) },
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

  // ── CH-13a staff tasks ──────────────────────────────────────────────────
  const enqueueStaffCommand = async (input: { phone: string; waMessageId: string }) => {
    await deps.boss.send(STAFF_COMMAND_QUEUE, input);
  };
  if (deps.staff !== undefined) {
    const roster = deps.staff.roster;
    await deps.boss.work<{ phone: string; waMessageId: string }>(
      STAFF_COMMAND_QUEUE,
      workOptions,
      async (jobs) => {
        for (const job of jobs) {
          // The body is read from the row the webhook stored, not carried on
          // the job: the message is already durable, and a payload copy would
          // be a second source of truth for the same text (and would put a
          // guest-adjacent body into pgboss.job, which §3.3 has no reason to
          // allow).
          const body = await getMessageBody(deps.db, job.data.waMessageId);
          await handleStaffCommand(
            { db: deps.db, log: deps.log, wa: deps.wa, roster, now: () => new Date() },
            { phone: job.data.phone, body },
          );
        }
      },
    );
    await deps.boss.work(STAFF_SLA_QUEUE, workOptions, async () => {
      await runSlaNudger({
        db: deps.db,
        log: deps.log,
        wa: deps.wa,
        roster,
        // CH-14a rung 2: the escalation ladder cc's OPS at 20 minutes.
        opsNumbers: roster.opsNumbers,
        // ONE clock per tick, injected — never read inside the loop.
        now: () => new Date(),
      });
    });
    await scheduleCron(deps.boss, STAFF_SLA_QUEUE, SLA_NUDGER_CRON, 'Asia/Kolkata', {
      singletonKey: 'sla',
    });
    // CH-14b: the 10:00 morning digest. `now` re-derived per run (never captured)
    // so a long-lived process's overnight window cannot rot.
    await deps.boss.work(STAFF_DIGEST_QUEUE, workOptions, async () => {
      await runMorningDigest({
        db: deps.db,
        log: deps.log,
        wa: deps.wa,
        roster,
        opsNumbers: roster.opsNumbers,
        nightStart: deps.nightStart ?? '20:00',
        now: () => new Date(),
      });
    });
    await scheduleCron(deps.boss, STAFF_DIGEST_QUEUE, DIGEST_CRON, 'Asia/Kolkata', {
      singletonKey: 'digest',
    });
    deps.log.info(
      { roster: roster.members.length, ops: roster.opsNumbers.length },
      'staff tasks ENABLED (SLA nudger every 5 min; morning digest 10:00)',
    );
  } else {
    // A cron left by an earlier boot must not fire into a workerless queue.
    await deps.boss.unschedule(STAFF_SLA_QUEUE).catch(() => {});
    await deps.boss.unschedule(STAFF_DIGEST_QUEUE).catch(() => {});
  }

  // ── CH-17 watchdog ──────────────────────────────────────────────────────
  // Unconditional: the health ping + quiet-channel monitor are valuable on every
  // boot, independent of staff/lifecycle wiring. probeHealth/ping use their live
  // defaults; alertOps delivery is the module singleton configured in main().
  await deps.boss.work(OPS_WATCHDOG_QUEUE, workOptions, async () => {
    await runWatchdog({
      db: deps.db,
      log: deps.log,
      healthchecksUrl: deps.healthchecksUrl,
      now: () => new Date(),
    });
  });
  await scheduleCron(deps.boss, OPS_WATCHDOG_QUEUE, WATCHDOG_CRON, 'Asia/Kolkata', {
    singletonKey: 'watchdog',
  });

  // ── CH-17 daily rollup ──────────────────────────────────────────────────
  // Unconditional (only needs OPS_NUMBERS, not the roster). Empty ops list ⇒
  // fail-quiet, like the digest. `now` re-derived per run so a long-lived
  // process's day boundary cannot rot.
  await deps.boss.work(OPS_ROLLUP_QUEUE, workOptions, async () => {
    await runDailyRollup({
      db: deps.db,
      log: deps.log,
      wa: deps.wa,
      opsNumbers: deps.opsNumbers ?? [],
      now: () => new Date(),
    });
  });
  await scheduleCron(deps.boss, OPS_ROLLUP_QUEUE, ROLLUP_CRON, 'Asia/Kolkata', {
    singletonKey: 'ops_rollup',
  });

  // ── CH-14a human takeover (coexistence) ─────────────────────────────────
  // Cancel the queued (not-yet-run) debounce job for a paused conversation, so a
  // takeover does not wake the worker for a store-only no-op. BEST-EFFORT: the
  // HUMAN_ACTIVE store-only path is the real guarantee (a fired job replies
  // nothing), so any failure is swallowed by applyHumanTakeover. Scoped to THIS
  // conversation's singleton_key + state='created' — never a broad delete (the
  // §CH-12 lesson: `DELETE FROM pgboss.job WHERE name LIKE 'booking.%'` destroys
  // real events; this touches only the one conversation's own pending wake).
  const cancelPending = async (conversationId: string): Promise<void> => {
    const rows = await deps.db.execute<{ id: string }>(sql`
      SELECT id FROM pgboss.job
      WHERE name = ${CONVERSATION_PROCESS_QUEUE}
        AND singleton_key = ${conversationId}
        AND state = 'created'
    `);
    const ids = [...rows].map((r) => r.id);
    if (ids.length > 0) await deps.boss.cancel(CONVERSATION_PROCESS_QUEUE, ids);
  };
  const takeoverDeps = {
    db: deps.db,
    log: deps.log,
    now: () => new Date(),
    cancelPending,
  };
  const coexistence: Jobs['coexistence'] = {
    findConversation: (phone) => findConversationForTakeover(deps.db, phone),
    apply: (input) => applyHumanTakeover(takeoverDeps, input),
  };

  return { enqueueConversationProcess: enqueue, enqueueStaffCommand, coexistence };
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
