/**
 * LOG-ONLY until CH-17 — the single ops-alerting seam (plan.md §2.2 step 7,
 * CH-17 step 3). CH-17 upgrades THIS function's body with WhatsApp delivery
 * to OPS_NUMBERS, a 30-min dedupe window keyed on `kind`, and the distinct
 * 401/OAuthException token alert — call sites never change. Every failure
 * path from CH-02 onward (failed statuses, send failures, later the poller/
 * sender/guardrails per CH-05/10/12/13) must route through here.
 *
 * WHY no WhatsApp alerting yet (CH-02 decision D4): it would be circular
 * (a dead token fails the alert send with the same 401), staff/ops windows
 * are untracked until CH-13, and OPS_NUMBERS is unset in dev — the loudest
 * channel dev actually has is the error log Paul watches live.
 */

/** Structural logger — pino and fastify request loggers both satisfy this. */
export interface AlertLogger {
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface OpsAlert {
  /** Stable alert key (e.g. 'wa_send_failed') — CH-17's dedupe keys off it. */
  kind: string;
  summary: string;
  /** Ids and error codes only — never message bodies or secrets (§3.3). */
  detail?: Record<string, unknown>;
}

// TODO(CH-17): deliver via OPS_NUMBERS WhatsApp with dedupe + distinct 401
// alert; keep this signature so no caller changes.
/** Raises an ops alert (log-only until CH-17); never throws — alerts must never break the hot path. */
export async function alertOps(log: AlertLogger, alert: OpsAlert): Promise<void> {
  try {
    log.error({ opsAlert: alert.kind, ...alert.detail }, `[OPS-ALERT] ${alert.summary}`);
  } catch {
    // A broken logger must not take the pipeline down with it.
  }
}
