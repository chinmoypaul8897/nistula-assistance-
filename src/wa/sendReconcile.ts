/**
 * Stale send-intent reconciliation (CH-18c — the TODO that stood in
 * wa/client.ts + wa/sendFailure.ts since CH-02's §3.4 send-intent pattern).
 *
 * THE GAP: `createSendIntent` commits a `messages` row as 'queued' BEFORE the
 * Graph call, so a crash between the commit and the queued→sent settle (a Railway
 * deploy, an OOM, a DB blip during failSend) leaves an INERT 'queued' row that no
 * status webhook can heal — the healing keys on `wa_message_id`, which that path
 * never got to write. Left alone it sits invisible for ever.
 *
 * THE FIX IS FAIL-CLOSED — mark it terminally 'failed' + alert, NEVER resend. A
 * 'queued' row MAY have reached Meta before the crash (the settle is exactly what
 * did not run), so a naive resend risks a DOUBLE send to a guest. We cannot tell
 * "never sent" from "sent but unconfirmed" here, so we do not guess: ops is told
 * to VERIFY before any manual resend. (A real resend verb needs a genuine
 * sent/send_failed state model — deliberately out of scope, CH-17 open Q#1.)
 */
import { and, eq, lt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { messages } from '../db/schema.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';

/** No legitimate send stays 'queued' this long — the Graph call + settle take
 * seconds. Well past that, a 'queued' row is stranded, not in flight. */
export const STALE_SEND_AFTER_MS = 10 * 60_000;

export interface ReconcileDeps {
  db: Db;
  log: AlertLogger & { warn: (obj: Record<string, unknown>, msg?: string) => void };
  /** Test seam. */
  now?: () => Date;
  /** Test seam — how old a 'queued' row must be to count as stranded. */
  olderThanMs?: number;
}

/**
 * Marks every send-intent row stranded in 'queued' beyond the staleness window as
 * terminally 'failed' (with a verify-before-resend reason) and alerts ops once
 * with the count. Returns how many it reconciled. NEVER resends.
 */
export async function reconcileStaleSends(deps: ReconcileDeps): Promise<number> {
  const now = deps.now?.() ?? new Date();
  const cutoff = new Date(now.getTime() - (deps.olderThanMs ?? STALE_SEND_AFTER_MS));
  const reconciled = await deps.db
    .update(messages)
    .set({
      status: 'failed',
      error: 'reconciled: stranded in queued — delivery UNCONFIRMED, verify before any resend',
    })
    // eq(status,'queued') is the guard: only our own pre-Graph state, never a
    // 'sent'/'delivered'/'read'/'failed' row, is ever touched.
    .where(and(eq(messages.status, 'queued'), lt(messages.createdAt, cutoff)))
    .returning({ id: messages.id, conversationId: messages.conversationId });

  if (reconciled.length > 0) {
    deps.log.warn({ count: reconciled.length }, 'reconciled stranded queued sends → failed');
    await alertOps(deps.log, {
      kind: 'send_reconciled_stale',
      summary: `${reconciled.length} stranded send(s) marked failed after a crash — delivery is UNCONFIRMED; verify before any manual resend`,
      detail: { count: reconciled.length },
    });
  }
  return reconciled.length;
}
