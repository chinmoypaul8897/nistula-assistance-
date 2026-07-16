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
 * Meta failures that are PERMANENT — a re-send cannot possibly help, because the
 * message itself (or the recipient, or the template) is the problem.
 *
 * 🚨 THIS IS A DENYLIST, AND THAT INVERSION IS THE POINT. Two earlier versions
 * enumerated what is TRANSIENT and burned a real guest's confirmation twice over
 * — first by reading only the HTTP status (Meta puts messaging-tier caps in a
 * 400), then by listing five rate-limit codes and missing code 4 ("API Too Many
 * Calls", the app-level Graph throttle that fires exactly during a batch drain).
 * Enumerating "what is transient" fails open in the worst direction: any code we
 * have simply never met silently destroys a message.
 *
 * Inverted, the failure modes swap places and the bad one disappears:
 *   - an unknown PERMANENT code now retries pointlessly for 36h and then goes
 *     `stale` — log noise and an ops alert, nothing lost;
 *   - an unknown TRANSIENT code now recovers, instead of losing a guest's
 *     confirmation for ever.
 * Retrying is safe on any rejection carrying a Meta error body: a rejection means
 * Meta did NOT deliver it. The one genuinely ambiguous case — a 2xx with no
 * message id, which may already have been accepted — is excluded below, because
 * there a duplicate is the worse outcome. STALE_AFTER_HOURS bounds every loop.
 */
const PERMANENT_META_CODES = new Set([
  100, // invalid parameter
  131009, // parameter value is not valid
  131026, // message undeliverable (the recipient cannot receive it)
  131030, // recipient not in the allowed list (the dev test number's allowlist)
  131047, // re-engagement required — the 24h window; a template is the answer, not a retry
  131051, // unsupported message type
  132000, // template param count mismatch
  132001, // template does not exist
  132005, // template hydrated text too long
  132007, // template format character policy violation
  132012, // template param format mismatch
  132015, // template is paused
  132016, // template is disabled
]);

/**
 * Did Meta plausibly NOT receive it, so a re-send is safe and worthwhile?
 * DEFAULT: yes — retry. Only a KNOWN-permanent rejection, or a 2xx we cannot
 * interpret (it may already be delivered), settles terminally.
 */
export function isRetryable(httpStatus: number | undefined, errorCode?: number): boolean {
  // A 2xx without a usable message id may ALREADY have reached the guest —
  // re-sending would duplicate. The single place we prefer a possible loss to a
  // possible duplicate, and it is deliberate.
  if (httpStatus !== undefined && httpStatus >= 200 && httpStatus < 300) return false;
  if (errorCode !== undefined && PERMANENT_META_CODES.has(errorCode)) return false;
  return true;
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
