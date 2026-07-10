/**
 * The single WhatsApp send chokepoint (plan.md CH-02 step 3, §5.3). BINDING
 * from CH-02 (decision D2): EVERY outbound anywhere — worker replies, ops
 * alerts, lifecycle sends, staff cards, draft dispatch — goes through this
 * client, so the CH-12 window upgrade captures every path at once.
 *
 * WHY window logic is deliberately absent here: window state is only written
 * from CH-03 and enforced from CH-07/CH-12; every pre-CH-12 send is an
 * immediate reply (window trivially open) and Meta's 131047 error is the
 * physical backstop, landing as status 'failed' + error on the row.
 */
// TODO(CH-12): enforce the 24h window here — free-form only in-window,
// closed window → template path, 131047 → failed + ops alert (§5.3).
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { insertMessage, type Message } from '../db/repos.js';
import { messages } from '../db/schema.js';
import { http as defaultHttp } from '../lib/http.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaSendResponse } from './types.js';

/** Outbound rows can never claim guest authorship (§4 sender semantics). */
export type OutboundSender = Exclude<Message['sender'], 'guest'>;

// WHY both fields are required with no defaults (CH-02 decision D5):
// conversation_id NULL *means* "staff/ops send, not a guest thread" (§4) and
// sender is guardrail 2's honesty field (§6.5) — every caller must state
// both; a default would let fake AI turns or fake system evidence drift in.
export interface SendOptions {
  conversationId: string | null;
  sender: OutboundSender;
}

export type SendResult =
  | { ok: true; messageId: string; waMessageId: string }
  | { ok: false; messageId: string | null; error: string };

export interface WaClientLogger extends AlertLogger {
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface WaClientDeps {
  db: Db;
  log: WaClientLogger;
  graphBaseUrl: string;
  phoneNumberId: string;
  accessToken: string;
  /** Tests inject a fake fetch via lib/http's wrapper shape (§3.5). */
  httpImpl?: typeof defaultHttp;
}

/** Builds the send client; boot wires live deps, tests inject fakes. */
export function createWaClient(deps: WaClientDeps) {
  const httpFn = deps.httpImpl ?? defaultHttp;
  const endpoint = `${deps.graphBaseUrl}/${deps.phoneNumberId}/messages`;
  const headers = {
    authorization: `Bearer ${deps.accessToken}`,
    'content-type': 'application/json',
  };

  /**
   * Sends a free-form text (§5.3) with the §3.4 send-intent pattern: the row
   * commits BEFORE the Graph call so a crash can never leave an un-audited
   * send, and a crash-retry that finds it never re-sends. Returns a result,
   * never throws — callers own their failure policy; the row is the audit.
   */
  async function sendText(toE164: string, body: string, opts: SendOptions): Promise<SendResult> {
    // WHY 'queued': it is the §4 enum's spelling of §3.4's 'sending' — no
    // other use assigns messages.status='queued' anywhere in the plan
    // (CH-02 decision D1; CH-12/13/16/17 inherit this, do not reopen it).
    // No explicit transaction: the awaited autocommit IS the pre-call commit.
    const { message } = await insertMessage(deps.db, {
      conversationId: opts.conversationId,
      direction: 'out',
      sender: opts.sender,
      type: 'text',
      body,
      status: 'queued',
    });
    if (message === null) {
      // Unreachable without a wa_message_id conflict; guarded for honesty.
      return { ok: false, messageId: null, error: 'send-intent row insert returned no row' };
    }
    // TODO(CH-17): stale-'queued' reconciliation sweep + alert (§3.4 —
    // a crash between here and the Graph call leaves an inert intent row).
    //
    // waMessageId is hoisted OUTSIDE the try so failure paths after a Graph
    // 2xx still record it — without it on the row, status webhooks match
    // nothing and the D3 rank-lattice heal is impossible (review finding).
    let waMessageId: string | undefined;
    let httpStatus: number | undefined;
    try {
      const response = await httpFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toE164,
          type: 'text',
          text: { body },
        }),
      });
      httpStatus = response.status;
      if (!response.ok) {
        return await failSend(message.id, opts.conversationId, await graphFailure(response));
      }
      const parsed = (await response.json().catch(() => ({}))) as WaSendResponse;
      waMessageId = parsed.messages?.[0]?.id;
      if (waMessageId === undefined) {
        return await failSend(message.id, opts.conversationId, {
          errorText: 'Graph 2xx without a message id',
          httpStatus,
        });
      }
      // eq(status,'queued') IS the rank guard for this transition (D3):
      // 'queued' is the only rank below 'sent' our own row can hold, and no
      // status webhook can match it before wa_message_id exists.
      const updated = await deps.db
        .update(messages)
        .set({ status: 'sent', waMessageId })
        .where(and(eq(messages.id, message.id), eq(messages.status, 'queued')))
        .returning({ id: messages.id });
      if (updated.length === 0) {
        deps.log.warn({ messageId: message.id }, 'queued→sent update applied to no row');
      }
      return { ok: true, messageId: message.id, waMessageId };
    } catch (error) {
      // summarizeError, never raw messages: a thrown DB error embeds bound
      // params (§3.3) — and this row/alert text must stay content-free.
      return await failSend(
        message.id,
        opts.conversationId,
        { errorText: summarizeError(error), httpStatus },
        waMessageId,
      );
    }
  }

  interface SendFailure {
    errorText: string;
    errorCode?: number;
    errorTitle?: string;
    httpStatus?: number;
  }

  async function failSend(
    messageId: string,
    conversationId: string | null,
    failure: SendFailure,
    waMessageId?: string,
  ): Promise<SendResult> {
    try {
      // Writing waMessageId when known keeps a post-2xx failure healable:
      // the later delivered/read webhook matches the row and the D3 lattice
      // (failed < delivered) corrects the false 'failed'.
      await deps.db
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
    // Structured fields per D4 (CH-17 dedupe keys off them); free error text
    // stays on the message row, never in logs.
    await alertOps(deps.log, {
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

  /** Marks an inbound message read (§5.3, optional nicety) — no message row. */
  async function markRead(waMessageId: string): Promise<boolean> {
    try {
      const response = await httpFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: waMessageId,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return { sendText, markRead };
}

/** Token-free failure from a Graph error response: status + Meta's own code/type/message. */
async function graphFailure(response: Response): Promise<{
  errorText: string;
  errorCode?: number;
  errorTitle?: string;
  httpStatus: number;
}> {
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
