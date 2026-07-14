/**
 * How a failed WhatsApp send is recorded (CH-02 decisions D3/D4; split out of
 * wa/client.ts in CH-12 for the ~300-line rule).
 *
 * The message row IS the audit — callers own their failure policy, so nothing
 * here throws. Two rules earn their keep and neither is obvious:
 *
 *  - The wa id is written even on a FAILURE, whenever Meta gave us one. Without
 *    it a later delivered/read webhook matches no row, and the D3 rank lattice
 *    (failed < delivered) can never heal a send that actually landed.
 *  - The alert carries structured fields only. The free error text stays on the
 *    row: a Graph or drizzle error message can embed a guest's phone or body
 *    (§3.3), and logs must never.
 */
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { messages } from '../db/schema.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaSendResponse } from './types.js';

export interface SendFailure {
  errorText: string;
  errorCode?: number;
  errorTitle?: string;
  httpStatus?: number;
}

export type SendResult =
  | { ok: true; messageId: string; waMessageId: string }
  | { ok: false; messageId: string | null; error: string };

/** Settles a committed intent row as 'failed' and alerts ops. Never throws. */
export async function failSend(
  db: Db,
  log: AlertLogger,
  messageId: string,
  conversationId: string | null,
  failure: SendFailure,
  waMessageId?: string,
): Promise<SendResult> {
  try {
    await db
      .update(messages)
      .set({
        status: 'failed',
        error: failure.errorText,
        ...(waMessageId === undefined ? {} : { waMessageId }),
      })
      .where(and(eq(messages.id, messageId), eq(messages.status, 'queued')));
  } catch {
    // DB gone mid-failure: the row stays 'queued' — inert by design; the
    // TODO(CH-17) stale-queued sweep is the recovery net. Alert regardless.
  }
  await alertOps(log, {
    kind: 'wa_send_failed',
    summary: 'WhatsApp send failed',
    detail: {
      messageId,
      conversationId,
      waMessageId,
      errorCode: failure.errorCode,
      errorTitle: failure.errorTitle,
      httpStatus: failure.httpStatus,
    },
  });
  return { ok: false, messageId, error: failure.errorText };
}

/** Token-free failure from a Graph error response: status + Meta's own code/type/message. */
export async function graphFailure(response: Response): Promise<SendFailure & { httpStatus: number }> {
  let detail = '';
  let errorCode: number | undefined;
  let errorTitle: string | undefined;
  try {
    const parsed = (await response.json()) as WaSendResponse;
    if (parsed.error !== undefined) {
      errorCode = parsed.error.code;
      errorTitle = parsed.error.type;
      detail = ` ${parsed.error.code ?? ''} ${parsed.error.message ?? ''}`.trimEnd();
    }
  } catch {
    // Non-JSON error body — the status code alone still tells the story.
  }
  return {
    errorText: `Graph ${response.status}${detail}`.slice(0, 300),
    errorCode,
    errorTitle,
    httpStatus: response.status,
  };
}
