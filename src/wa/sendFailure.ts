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
  | { ok: false; messageId: string | null; error: string; retryable: boolean };

/**
 * WhatsApp Cloud API rate/throughput limits that arrive as HTTP 400 with the
 * reason in error.code — genuinely TRANSIENT (they clear when the cap resets),
 * so classifying by httpStatus alone (as the first version did) permanently
 * burned a real guest's message on a go-live messaging-cap 400. Guard by the
 * full contract — status AND code — not an incomplete signal.
 */
const TRANSIENT_META_CODES = new Set([
  130429, // Rate limit hit
  131048, // Spam rate limit hit
  131056, // (business/recipient pair) rate limit hit
  80007, // Rate limit issues
  133016, // temporary throttle / account paused, resumes automatically
]);

/**
 * Did Meta plausibly NOT receive it, so a re-send is safe and worthwhile?
 * A 429 rate-limit and any 5xx are transient rejections — Meta did not deliver.
 * A network error before any response (httpStatus undefined) is the same. Meta
 * also signals messaging-tier and throughput caps as HTTP 400 + a rate-limit
 * code — also transient. Anything else 4xx (bad param, closed window) is
 * permanent; a 2xx-without-id may have been accepted, so re-sending risks a
 * duplicate — both are treated as terminal.
 */
export function isRetryable(httpStatus: number | undefined, errorCode?: number): boolean {
  if (httpStatus === undefined || httpStatus === 429 || httpStatus >= 500) return true;
  if (errorCode !== undefined && TRANSIENT_META_CODES.has(errorCode)) return true;
  return false;
}

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
  return {
    ok: false,
    messageId,
    error: failure.errorText,
    retryable: isRetryable(failure.httpStatus, failure.errorCode),
  };
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
