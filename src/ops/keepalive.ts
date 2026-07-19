/**
 * Coexistence keep-alive (plan §8 CH-18 step 2). Meta drops the Cloud API link
 * if the number's WhatsApp app stays OFFLINE for ~14 days — which on a quiet
 * number (no guest traffic, staff not using the app) can happen silently and
 * take the whole assistant down with it. This is the daily 10:00 IST watch that
 * makes that impossible-by-design, in two modes:
 *
 *  - PRE-CUTOVER (COEXISTENCE_ACTIVE=0, today's default — the number is not yet
 *    the live business line): a WEEKLY nudge to ops to send one message from the
 *    line and keep it warm. Fired on ONE weekday only (the daily cron acts once
 *    a week).
 *  - POST-CUTOVER (COEXISTENCE_ACTIVE=1): a DAILY check that the link has shown
 *    life within COEXISTENCE_KEEPALIVE_MAX_DAYS (13, one day of margin under
 *    Meta's ~14). "Life" = a genuine guest INBOUND or a staff-app ECHO —
 *    NEVER a status webhook or our own outbound (a lifecycle send produces
 *    delivery statuses even against a link about to lapse, so those cannot
 *    vouch for the app being online: the guard-by-CONTRACT trap this job must
 *    not fall into). Stale ⇒ alert ops to send one message before the link goes.
 *
 * The clock and the last-seen getters are INJECTED, exactly like the watchdog,
 * so the ladder is unit-testable without real traffic.
 */
import { lastEchoAt, lastGuestInboundAt } from '../db/repos.js';
import type { Db } from '../db/client.js';
import { istWeekday, nowIST } from '../lib/time.js';
import { alertOps, type AlertLogger } from './alerts.js';

/** Daily 10:00 IST (ops-hours, same civil slot as the morning digest). */
export const KEEPALIVE_CRON = '0 10 * * *';
/** The one weekday the pre-cutover reminder fires on (1 = Monday IST). */
const REMINDER_WEEKDAY = 1;
export const DEFAULT_KEEPALIVE_MAX_DAYS = 13;

export interface KeepAliveLogger extends AlertLogger {
  info?: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface KeepAliveDeps {
  db: Db;
  log: KeepAliveLogger;
  /** COEXISTENCE_ACTIVE — false pre-cutover (weekly reminder), true post-cutover
   * (daily staleness check). An EXPLICIT flag, never derived from
   * WA_TEMPLATE_MODE='send' — same proxy trap the failure class warns about. */
  active: boolean;
  /** COEXISTENCE_KEEPALIVE_MAX_DAYS — alert if the link has shown no life this long. */
  maxDays: number;
  /** ONE clock per tick (injected for tests). */
  now?: () => Date;
  lastEchoAt?: () => Promise<Date | null>;
  lastInboundAt?: () => Promise<Date | null>;
}

export interface KeepAliveResult {
  mode: 'reminder' | 'check';
  alerted: boolean;
}

const mostRecent = (a: Date | null, b: Date | null): Date | null => {
  if (a === null) return b;
  if (b === null) return a;
  return a.getTime() >= b.getTime() ? a : b;
};

export async function runKeepAlive(deps: KeepAliveDeps): Promise<KeepAliveResult> {
  const now = deps.now?.() ?? nowIST();

  if (!deps.active) {
    // Pre-cutover: a weekly warm-the-line nudge. The daily cron fires every day;
    // we only ACT on the reminder weekday so ops gets one nudge, not seven.
    if (istWeekday(now) !== REMINDER_WEEKDAY) return { mode: 'reminder', alerted: false };
    await alertOps(deps.log, {
      kind: 'coexistence_keepalive_reminder',
      summary:
        'keep the WhatsApp line warm — send one message from the business number this week ' +
        '(Meta drops the API link after ~14 days app-offline)',
    });
    return { mode: 'reminder', alerted: true };
  }

  // Post-cutover: is the coexistence link alive? A guest inbound OR a staff-app
  // echo within maxDays proves it; status webhooks and our own sends do not.
  const [echo, inbound] = await Promise.all([
    (deps.lastEchoAt ?? (() => lastEchoAt(deps.db)))(),
    (deps.lastInboundAt ?? (() => lastGuestInboundAt(deps.db)))(),
  ]);
  const lastSeen = mostRecent(echo, inbound);
  const staleMs = deps.maxDays * 24 * 60 * 60 * 1000;
  const alive = lastSeen !== null && now.getTime() - lastSeen.getTime() <= staleMs;

  if (alive) {
    deps.log.info?.(
      { lastSeenIso: lastSeen?.toISOString() },
      '[keepalive] coexistence link alive',
    );
    return { mode: 'check', alerted: false };
  }

  await alertOps(deps.log, {
    kind: 'coexistence_link_at_risk',
    summary:
      `coexistence link at risk — no guest inbound or staff echo in ${deps.maxDays} days; ` +
      'send one message from the business number before Meta drops the API link',
    detail: { lastSeenIso: lastSeen?.toISOString() ?? null, maxDays: deps.maxDays },
  });
  return { mode: 'check', alerted: true };
}
