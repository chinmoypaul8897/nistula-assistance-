/**
 * The single ops-alerting seam (plan §2.2 step 7, CH-17 step 3). Every failure
 * path from CH-02 onward routes through alertOps(); CH-17 upgraded its BODY to
 * WhatsApp-deliver to OPS_NUMBERS with a 30-min dedupe keyed on `kind`, WITHOUT
 * changing the (log, alert) signature — the ~40 call sites are untouched.
 *
 * Delivery is best-effort telemetry: alertOps NEVER throws (an alert must not
 * break the hot path) and a send failure is swallowed. The log line ALWAYS fires
 * first — it is the audit and dev's only channel (OPS_NUMBERS is unset in dev).
 *
 * WHY in-memory dedupe (not a table): a duplicate ops WhatsApp after a deploy is
 * harmless (fail-safe — more delivery, never less); a missed alert is not. The
 * 30-min window resetting on restart is therefore correct, not a defect.
 *
 * WHY `wa_token_expired` stays log-only (the original CH-02 D4 reason there was
 * no WhatsApp alerting at all): a dead WA token fails the alert SEND with the
 * same 401 that triggered it. That one kind never attempts a send — it relies on
 * the error log + healthchecks. It is structurally undeliverable by WhatsApp.
 */
import { formatDayDisplay, istCalendarDay } from '../lib/time.js';
import { sanitiseTemplateParam } from '../lib/text.js';
import type { WaClient } from '../wa/client.js';

/** Structural logger — pino and fastify request loggers both satisfy this. */
export interface AlertLogger {
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface OpsAlert {
  /** Stable alert key (e.g. 'wa_send_failed') — the dedupe keys off it. */
  kind: string;
  summary: string;
  /** Ids and error codes only — never message bodies or secrets (§3.3). */
  detail?: Record<string, unknown>;
}

/** Alert kinds that must NOT be delivered over WhatsApp — see the header WHY. */
const LOG_ONLY_KINDS = new Set<string>(['wa_token_expired']);
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

interface OpsAlertConfig {
  wa: Pick<WaClient, 'sendTemplated'>;
  opsNumbers: readonly string[];
  now: () => number;
}

// Module singletons (the getBoss/getDb precedent): one delivery config + one
// dedupe map per process. Unconfigured ⇒ log-only, so tests and pre-boot code
// keep the CH-02 behaviour with no wiring.
let config: OpsAlertConfig | null = null;
const lastSentByKind = new Map<string, number>();

/**
 * Installs WhatsApp delivery for alertOps — called ONCE from server main() after
 * the wa client and OPS_NUMBERS exist. `now` is injectable so the dedupe window
 * is deterministic in tests (a duration, not a wall-clock time).
 */
export function configureOpsAlerts(cfg: {
  wa: Pick<WaClient, 'sendTemplated'>;
  opsNumbers: readonly string[];
  now?: () => number;
}): void {
  config = { wa: cfg.wa, opsNumbers: cfg.opsNumbers, now: cfg.now ?? Date.now };
}

/** Test seam: clears the delivery config and dedupe state. */
export function resetOpsAlerts(): void {
  config = null;
  lastSentByKind.clear();
}

/** Raises an ops alert: always logs; WhatsApp-delivers when configured, deduped. Never throws. */
export async function alertOps(log: AlertLogger, alert: OpsAlert): Promise<void> {
  try {
    log.error({ opsAlert: alert.kind, ...alert.detail }, `[OPS-ALERT] ${alert.summary}`);
  } catch {
    // A broken logger must not take the pipeline down with it.
  }
  await deliverToOps(log, alert);
}

async function deliverToOps(log: AlertLogger, alert: OpsAlert): Promise<void> {
  const cfg = config;
  if (cfg === null || cfg.opsNumbers.length === 0) return; // dev / tests: log-only
  if (LOG_ONLY_KINDS.has(alert.kind)) return; // circularity guard (dead token)

  const now = cfg.now();
  const last = lastSentByKind.get(alert.kind);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return; // within the window
  // Claim the window BEFORE the await so a slow send can't let a second call
  // through — and so a failed send still holds the window (a broken channel must
  // not spam; the watchdog/healthchecks catch a persistent outage).
  lastSentByKind.set(alert.kind, now);

  const day = formatDayDisplay(istCalendarDay(new Date(now)));
  const summary = sanitiseTemplateParam(`ALERT ${alert.summary}`);
  for (const ops of cfg.opsNumbers) {
    try {
      await cfg.wa.sendTemplated(
        ops,
        { key: 'digest', params: { day, summary } },
        { conversationId: null, sender: 'system' },
      );
    } catch {
      // Best-effort: the error log already carries the alert; a delivery throw
      // must never escape (alertOps is called from the hot path).
    }
  }
}
