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
 *     not NIGHT_START/END), if NO message went in OR out for 30 min, warn ops
 *     once: the webhook subscription may have silently dropped. Both directions
 *     must be stale — a healthy outbound proves the Graph link works, so quiet
 *     inbound alone is just a lull. "Warn once, with backoff" is the alertOps
 *     30-min dedupe on kind='channel_quiet'; no extra state here.
 *
 * The healthchecks ping and the health probe are INJECTED so the ladder is
 * unit-testable without a live poller — which dev cannot run anyway (local .env
 * is BINDINGLY EZEE_POLLER_ENABLED=0).
 */
import { http } from '../lib/http.js';
import { atISTHour, nowIST } from '../lib/time.js';
import { lastGuestInboundAt, lastGuestReplyDeliveredAt } from '../db/repos.js';
import type { Db } from '../db/client.js';
import { alertOps, type AlertLogger } from './alerts.js';
import { isHealthy, probeHealth, unhealthyReasons, type HealthReport } from './health.js';

/** Every 5 minutes (plan step 1). */
export const WATCHDOG_CRON = '*/5 * * * *';
/** The quiet-channel window is business hours, a FIXED range — not the night env. */
const MONITOR_START = '08:00';
const MONITOR_END = '23:00';
const QUIET_STALE_MS = 30 * 60 * 1000;

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
  lastInboundAt?: () => Promise<Date | null>;
  lastOutboundAt?: () => Promise<Date | null>;
}

export interface WatchdogResult {
  healthy: boolean;
  pinged: boolean;
  quietWarned: boolean;
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
  const startMs = atISTHour(now, MONITOR_START).getTime();
  const endMs = atISTHour(now, MONITOR_END).getTime();
  const nowMs = now.getTime();
  // 08:00 < 23:00, so no midnight wrap — a plain range check.
  if (nowMs < startMs || nowMs >= endMs) return false;

  // Guest-facing only: a delivered guest reply proves the Graph link, a guest
  // inbound proves the webhook — system ops cards prove neither (pre-merge fix).
  const [lastIn, lastOut] = await Promise.all([
    (deps.lastInboundAt ?? (() => lastGuestInboundAt(deps.db)))(),
    (deps.lastOutboundAt ?? (() => lastGuestReplyDeliveredAt(deps.db)))(),
  ]);
  if (!isStale(lastIn, nowMs) || !isStale(lastOut, nowMs)) return false;

  await alertOps(deps.log, {
    kind: 'channel_quiet',
    summary: 'channel quiet — no messages in or out for 30 min; verify the webhook subscription',
    detail: {
      lastInboundIso: lastIn?.toISOString() ?? null,
      lastOutboundIso: lastOut?.toISOString() ?? null,
    },
  });
  return true;
}

/** Null (never) counts as stale — see the header on business-hours framing. */
function isStale(at: Date | null, nowMs: number): boolean {
  return at === null || nowMs - at.getTime() > QUIET_STALE_MS;
}
