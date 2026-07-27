/**
 * The watchdog (plan §8 CH-17 steps 1 & 2, §2.3). One 5-min tick that makes
 * silent failure impossible-by-design:
 *
 *  1. DEAD-MAN SWITCH. Probe the internals; ping healthchecks.io ONLY when
 *     healthy. Unhealthy ⇒ skip the ping (healthchecks fires its own external
 *     alert after the grace period) AND attempt a direct ops WhatsApp alert with
 *     the reason. Two independent legs, so one dead channel can't hide an outage.
 *
 *  2. QUIET-CHANNEL MONITOR. In business hours (08:00–23:00 IST — a FIXED window,
 *     not NIGHT_START/END), if NOTHING has ARRIVED THROUGH THE WEBHOOK for
 *     QUIET_STALE_MINUTES, warn ops: the subscription may have silently dropped.
 *
 *     🚨 THE THRESHOLD USED TO BE A HARDCODED 30 MIN, AND IT WAS THE WRONG
 *     QUESTION. 30 minutes of silence on a boutique villa line is NORMAL, not a
 *     dead webhook — the live rehearsal (25–26 Jul 2026) measured ~18–30 false
 *     "channel quiet" alerts PER DAY on the ops handset. The predicate has to
 *     answer "has this line been silent for longer than this business ever goes
 *     silent?", which is a property of the BUSINESS, so it is now an env knob
 *     (default 3h) rather than a constant someone guessed once.
 *
 *     🚨 THE SECOND LEG USED TO BE `lastGuestReplyDeliveredAt` ("a healthy
 *     OUTBOUND proves the Graph link"), AND THAT ANSWERS A DIFFERENT QUESTION
 *     THAN THE ONE THE ALERT ASKS. This alert asks "is the INBOUND webhook
 *     alive"; Graph being up says nothing about it. Worse, the outbound that can
 *     be fresh while inbound is stale is precisely the UNPROMPTED lifecycle send
 *     (`lifecycle/sender.ts` writes `sender:'ai'` + a conversationId, satisfying
 *     every filter) — driven by the eZee poller, which keeps running while the
 *     webhook is stone dead. A genuine AI *reply* cannot mask anything: it only
 *     exists downstream of an inbound, which the first leg already sees. So the
 *     leg only ever fired to HIDE a real outage, and raising 30min→3h widened
 *     that blind spot 6×. Both legs now test the same fact — something ARRIVED:
 *     a guest inbound, or a coexistence echo (a staff-app send mirrored back
 *     THROUGH the webhook). This is the contract `ops/keepalive.ts` already uses,
 *     and `repos.lastEchoAt`'s own docstring already argues it.
 *
 *     🚨 AND "warn once, with backoff" USED TO CLAIM the alertOps 30-min dedupe
 *     provided the backoff — "no extra state here". It never could: that dedupe
 *     only suppresses a REPEAT within 30 minutes, so a persistently quiet channel
 *     re-warned every single 30-min window for the whole business day. Worse, the
 *     moment the threshold exceeds the dedupe window the dedupe stops gating this
 *     alert AT ALL. So the backoff lives HERE, as real state.
 *
 *     TWO PROPERTIES THE BACKOFF NEEDS, AND THE OBVIOUS SPELLING GETS BOTH WRONG:
 *
 *     (a) IDENTITY — "is this the SAME silence?" is keyed on `lastAnyMs`, the
 *         instant of the newest arrival. That is a FACT, so it works at any hour.
 *         Keying it on "was the channel non-stale at some tick" instead made the
 *         reset unreachable outside 08:00–23:00 (the gate returns before the
 *         read): a guest messaging at 23:30 left the counter untouched, so a
 *         webhook that then died at 03:00 inherited yesterday's 12h gap and went
 *         unreported until ~10:50, while the card claimed `warnCount: 6` about a
 *         channel that had demonstrably worked four hours earlier.
 *
 *     (b) STALENESS IS MEASURED IN OPEN-MONITOR TIME, not wall clock. The window
 *         is shut 23:00–08:00, so counting that silence made the 08:00 tick fire
 *         for ANY line whose last message predated 05:00 — a false alert every
 *         single morning that no value of the knob could suppress (below ~9h it
 *         fires; at ≥9h the daytime monitor is dead). Clamping the silence to
 *         start no earlier than today's 08:00 is what takes a healthy line to
 *         ZERO alerts instead of one guaranteed daily.
 *
 *     In-memory, like the alertOps dedupe, and for the same reason: an extra
 *     alert after a restart is fail-SAFE (more delivery, never less).
 *
 * The healthchecks ping and the health probe are INJECTED so the ladder is
 * unit-testable without a live poller — which dev cannot run anyway (local .env
 * is BINDINGLY EZEE_POLLER_ENABLED=0).
 */
import { http } from '../lib/http.js';
import { atISTHour, nowIST } from '../lib/time.js';
import { lastEchoAt, lastGuestInboundAt } from '../db/repos.js';
import type { Db } from '../db/client.js';
import { alertOps, type AlertLogger } from './alerts.js';
import { isHealthy, probeHealth, unhealthyReasons, type HealthReport } from './health.js';

/** Every 5 minutes (plan step 1). */
export const WATCHDOG_CRON = '*/5 * * * *';
/** The quiet-channel window is business hours, a FIXED range — not the night env. */
const MONITOR_START = '08:00';
const MONITOR_END = '23:00';

/**
 * QUIET_STALE_MINUTES default (§3.7). Three hours: long enough that an ordinary
 * lull on a low-traffic villa line never trips it, short enough that a webhook
 * that died at 09:00 is still reported the same business morning.
 */
export const DEFAULT_QUIET_STALE_MINUTES = 180;

/**
 * Re-warn gaps for one uninterrupted silence, as multiples of the threshold.
 * Indexed by `warnCount - 1` and CLAMPED, so the last value repeats for ever:
 * warning 1 is followed by a 2× gap, warning 2 by 4×, and every later one by 4×.
 * At the 180-min default that is: warn, +6h, then every 12h.
 */
const REWARN_MULTIPLIERS = [2, 4] as const;

/**
 * An ABSOLUTE ceiling on the re-warn gap, not just a relative one.
 *
 * 🚨 THE MULTIPLIERS ALONE ARE A CEILING ON A TUNABLE, WHICH IS NOT A CEILING.
 * The runbook actively invites raising QUIET_STALE_MINUTES, and `config.ts`
 * accepts any positive integer — so 480 (8h) gives a 32h gap and 720 gives 48h,
 * either of which produces a business day with ZERO alerts about a dead webhook.
 *
 * That matters more than it looks, because NOTHING ELSE REPORTS THIS FAILURE.
 * Both backstops one would reach for are false here, checked rather than assumed:
 * healthchecks.io fires only when the INTERNAL probe fails (`ops/health.ts` reads
 * db/boss/poller/sender), and a dropped Meta subscription leaves all four healthy
 * — so we keep pinging and the dead-man dashboard stays green. The 23:30 rollup
 * (`ops/rollup.ts`) carries no channel field at all AND fail-quiets when its six
 * counters are zero, which is exactly what a dead webhook produces. This alert is
 * the only thing that reports it, so it may never go quiet for a whole day.
 */
const MAX_REWARN_GAP_MS = 12 * 60 * 60 * 1000;

export interface WatchdogLogger extends AlertLogger {
  info?: (obj: Record<string, unknown>, msg?: string) => void;
  warn?: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface WatchdogDeps {
  db: Db;
  log: WatchdogLogger;
  /** HEALTHCHECKS_URL — unset (dev) ⇒ the ping leg is skipped silently. */
  healthchecksUrl?: string;
  /** Injected — ONE clock per tick (the CH-12 lesson). */
  now?: () => Date;
  /** Injectable for tests; defaults to the live internal probe. */
  probe?: () => Promise<HealthReport>;
  /** Injectable for tests; defaults to a best-effort GET of the ping URL. */
  ping?: (url: string) => Promise<void>;
  /** Newest GUEST inbound — proof the webhook delivered something. */
  lastInboundAt?: () => Promise<Date | null>;
  /** Newest coexistence ECHO — a staff-app send mirrored back THROUGH the
   * webhook, so it proves the same fact. NOT our own outbound: see the header. */
  lastEchoAt?: () => Promise<Date | null>;
  /** QUIET_STALE_MINUTES (§3.7) — how long the webhook must deliver NOTHING
   * before the channel is worth warning about. Omitted ⇒ the 3h default. */
  quietStaleMinutes?: number;
}

export interface WatchdogResult {
  healthy: boolean;
  pinged: boolean;
  quietWarned: boolean;
}

/**
 * Backoff state for ONE uninterrupted silence. Module-level like the alertOps
 * dedupe map, but with its OWN reset seam — `resetOpsAlerts()` does NOT clear
 * this, so a test touching this monitor must call both or it inherits a warnCount
 * and passes because nothing warned.
 *
 * `quietWarnCount` is how many warnings this silence has produced; 0 means
 * nothing has warned about the current silence (either we never have, or
 * something arrived since), so the next stale tick warns immediately.
 *
 * `warnedSilenceKey` is the IDENTITY of that silence: the `lastAnyMs` we saw
 * when we warned. If a later tick sees a NEWER arrival, the webhook delivered
 * something in between and this is a different silence — see header note (a).
 */
let quietWarnCount = 0;
let lastQuietWarnMs: number | null = null;
let warnedSilenceKey: number | null = null;

/** Test seam: forgets the current silence (mirrors resetOpsAlerts). */
export function resetQuietChannelState(): void {
  quietWarnCount = 0;
  lastQuietWarnMs = null;
  warnedSilenceKey = null;
}

const defaultPing = async (url: string): Promise<void> => {
  await http(url); // GET; a missed ping is fine — healthchecks.io has grace.
};

export async function runWatchdog(deps: WatchdogDeps): Promise<WatchdogResult> {
  const now = deps.now?.() ?? nowIST();
  const report = await (deps.probe ?? probeHealth)();
  const healthy = isHealthy(report);
  let pinged = false;

  if (healthy) {
    if (deps.healthchecksUrl !== undefined && deps.healthchecksUrl !== '') {
      try {
        await (deps.ping ?? defaultPing)(deps.healthchecksUrl);
        pinged = true;
      } catch {
        // Ping failed — treat as a missed heartbeat; healthchecks alerts on its
        // own timeout. Never throw out of the cron tick.
      }
    }
    deps.log.info?.({ report }, '[watchdog] healthy');
  } else {
    // No ping → the external dead-man alert fires. PLUS a direct ops WhatsApp
    // attempt (deduped to once/30 min by alertOps).
    await alertOps(deps.log, {
      kind: 'watchdog_unhealthy',
      summary: 'watchdog: internal health check failed',
      detail: { reasons: unhealthyReasons(report).join(',') },
    });
  }

  const quietWarned = await checkQuietChannel(deps, now);
  return { healthy, pinged, quietWarned };
}

async function checkQuietChannel(deps: WatchdogDeps, now: Date): Promise<boolean> {
  const windowStartMs = atISTHour(now, MONITOR_START).getTime();
  const windowEndMs = atISTHour(now, MONITOR_END).getTime();
  const nowMs = now.getTime();
  // 08:00 < 23:00, so no midnight wrap — a plain range check.
  //
  // 🚨 NO RESET HERE, and none is needed: the backoff is keyed on `lastAnyMs`,
  // so overnight traffic is recognised by the next IN-window tick without this
  // one having to observe it. Resetting on the gate itself would be the clock
  // deciding, and a clock rolling over is not evidence the webhook recovered.
  if (nowMs < windowStartMs || nowMs >= windowEndMs) return false;

  const staleMs = quietStaleMs(deps);
  // BOTH legs test ONE fact: did something ARRIVE through the webhook? A guest
  // inbound, or a coexistence echo. Our own sends are deliberately absent — see
  // the header; an unprompted lifecycle send proves nothing and used to mask.
  const [lastIn, lastEcho] = await Promise.all([
    (deps.lastInboundAt ?? (() => lastGuestInboundAt(deps.db)))(),
    (deps.lastEchoAt ?? (() => lastEchoAt(deps.db)))(),
  ]);
  const lastAnyMs = Math.max(lastIn?.getTime() ?? 0, lastEcho?.getTime() ?? 0);

  // IDENTITY (header note a): something arrived after the warning we last sent,
  // so whatever is happening now is a DIFFERENT silence. Keyed on a fact, so it
  // works even though the arrival happened while the monitor was shut.
  if (warnedSilenceKey !== null && lastAnyMs > warnedSilenceKey) resetQuietChannelState();

  // OPEN-MONITOR TIME (header note b): silence cannot start before the window
  // opened. Without this clamp the 08:00 tick inherits the whole night and
  // fires on any line quiet since 05:00 — a guaranteed daily false alert.
  const quietSinceMs = Math.max(lastAnyMs, windowStartMs);
  if (nowMs - quietSinceMs <= staleMs) return false;

  if (!dueToWarn(nowMs, staleMs)) return false;

  quietWarnCount += 1;
  lastQuietWarnMs = nowMs;
  warnedSilenceKey = lastAnyMs;
  // Report how long it HAS been quiet, not the threshold that tripped: on a
  // re-warn those differ by hours, and "quiet for 3h" on a channel dead since
  // yesterday morning is the less useful of the two facts at 3am.
  const quietFor =
    lastAnyMs === 0 ? 'as far back as we have records' : formatDuration(nowMs - lastAnyMs);
  await alertOps(deps.log, {
    kind: 'channel_quiet',
    summary: `channel quiet — nothing has reached us for ${quietFor}; verify the webhook subscription`,
    detail: {
      lastInboundIso: lastIn?.toISOString() ?? null,
      lastEchoIso: lastEcho?.toISOString() ?? null,
      thresholdMinutes: Math.round(staleMs / 60000),
      // So ops can tell a first warning from the fifth about one dead webhook.
      warnCount: quietWarnCount,
    },
  });
  return true;
}

/**
 * The configured threshold in ms. `config.ts` boot-refuses 0/negative/non-numeric,
 * so the only way to get here with a bad value is a hand-built deps object (tests,
 * a future caller). Falling back keeps `runWatchdog` usable without a threshold;
 * the LOUD refusal deliberately stays at boot, where the operator can see it.
 */
function quietStaleMs(deps: WatchdogDeps): number {
  const minutes = deps.quietStaleMinutes;
  const safe =
    minutes === undefined || !Number.isFinite(minutes) || minutes <= 0
      ? DEFAULT_QUIET_STALE_MINUTES
      : minutes;
  return safe * 60 * 1000;
}

/**
 * Has enough time passed since the last warning about THIS silence?
 * The first warning is always due; each later one needs a longer gap, widening
 * to a HARD 12h ceiling that no threshold can push past (MAX_REWARN_GAP_MS).
 */
function dueToWarn(nowMs: number, staleMs: number): boolean {
  if (quietWarnCount === 0 || lastQuietWarnMs === null) return true;
  const index = Math.min(quietWarnCount - 1, REWARN_MULTIPLIERS.length - 1);
  const gapMs = Math.min(staleMs * (REWARN_MULTIPLIERS[index] as number), MAX_REWARN_GAP_MS);
  return nowMs - lastQuietWarnMs >= gapMs;
}

/** "45 min" / "3h" / "20.5h" — a duration a human reads at a glance. */
function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

// `isStale` was removed with the open-monitor-time clamp: staleness is now one
// comparison against `quietSinceMs` (which already folds in "never arrived" as
// lastAnyMs === 0), so a per-leg helper had nothing left to answer.
