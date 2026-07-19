/**
 * The single WhatsApp send chokepoint (plan.md CH-02 step 3, §5.3). BINDING
 * from CH-02 (decision D2): EVERY outbound anywhere — worker replies, ops
 * alerts, lifecycle sends, staff cards, draft dispatch — goes through this
 * client, which is what let CH-12's window upgrade capture every path at once.
 *
 * THE 24H WINDOW (CH-12 — the TODO that stood here since CH-02 is now closed).
 * Meta allows a free-form send only within 24h of the counterparty's last
 * inbound. Outside it, only an approved TEMPLATE may go. The rule binds staff
 * and ops numbers exactly as it binds guests (§5.3), so both window sources are
 * read here — conversations for guests, phone_windows for everyone else.
 *
 *   sendText      free-form. Closed window ⇒ REFUSED before the Graph call.
 *   sendTemplated free-form when the window is open (warmer, and free); the
 *                 TEMPLATE path when it is shut. This is the only way to reach
 *                 someone who has not written to us — i.e. the whole of CH-12.
 *
 * WHY refusing a closed-window sendText is not a regression: Meta rejects it
 * anyway with 131047, so the message never arrived in that case either. We now
 * fail locally, before burning the call, and say why on the row.
 *
 * WHY the guest's AI reply still goes silent on a closed window: there is no
 * template for an arbitrary conversational reply and there never can be — a
 * template is pre-approved fixed text. That deviation (recorded in CH-07) is
 * therefore permanent and inherent to Meta's rule, NOT something CH-12 fixed.
 * What CH-12 fixes is that LIFECYCLE messages, which do have templates, can now
 * reach a guest whose window is shut. That is the honest scope of the change.
 */
import { and, eq } from 'drizzle-orm';
import type { Db, DbLike } from '../db/client.js';
import { insertMessage, type Message } from '../db/repos.js';
import { messages } from '../db/schema.js';
import { windowStateFor } from '../db/windows.js';
import { http as defaultHttp } from '../lib/http.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import { failSend as settleFailed, graphFailure, type SendResult } from './sendFailure.js';
import { createTemplateSender, type TemplateMode } from './templateSend.js';
import type { WaSendResponse } from './types.js';

export type { SendResult } from './sendFailure.js';

export type {
  PlannedTemplatedSend,
  PlannedTemplatedSendOk,
  TemplateMode,
  TemplatedSend,
} from './templateSend.js';

/** Outbound rows can never claim guest authorship (§4 sender semantics). */
export type OutboundSender = Exclude<Message['sender'], 'guest'>;

// WHY both fields are required with no defaults (CH-02 decision D5):
// conversation_id NULL *means* "staff/ops send, not a guest thread" (§4) and
// sender is guardrail 2's honesty field (§6.5) — every caller must state
// both; a default would let fake AI turns or fake system evidence drift in.
export interface SendOptions {
  conversationId: string | null;
  sender: OutboundSender;
  // CH-18c: for a conversation_id=NULL card that is ABOUT a guest (task /
  // escalation / draft cards, the AI ON/OFF reply, DONE acks), the guest it
  // concerns — persisted as messages.guest_id so DELETE_GUEST erases it by a
  // durable link, not best-effort identity string-matching. Additive + optional:
  // a guest-thread send (conversationId set) is already covered by the
  // conversation scrub and leaves this unset.
  aboutGuestId?: string;
}

/** Dispatch of a committed intent row — messages has no phone column, so the caller restates the target. */
export interface DispatchArgs {
  messageId: string;
  toE164: string;
  body: string;
  conversationId: string | null;
}

export interface WaClientLogger extends AlertLogger {
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface WaClientDeps {
  db: Db;
  log: WaClientLogger;
  graphBaseUrl: string;
  phoneNumberId: string;
  accessToken: string;
  /** Defaults to 'simulate' — the safe end. A missing config may never silently
   * start firing un-approved templates at Meta. */
  templateMode?: TemplateMode;
  /** Tests inject a fake fetch via lib/http's wrapper shape (§3.5). */
  httpImpl?: typeof defaultHttp;
  /** Test seam only: the clock the window is judged against. */
  now?: () => Date;
}

/** Builds the send client; boot wires live deps, tests inject fakes. */
export function createWaClient(deps: WaClientDeps) {
  const httpFn = deps.httpImpl ?? defaultHttp;
  const templateMode: TemplateMode = deps.templateMode ?? 'simulate';
  const now = deps.now ?? (() => new Date());
  const endpoint = `${deps.graphBaseUrl}/${deps.phoneNumberId}/messages`;
  const headers = {
    authorization: `Bearer ${deps.accessToken}`,
    'content-type': 'application/json',
  };

  /**
   * Inserts the §3.4 send-intent row (status 'queued') WITHOUT calling
   * Graph. Composable into a caller's transaction — CH-03's worker commits
   * intent + turn-claim atomically (decision CH-03/D2); standalone callers
   * pass deps.db and the awaited autocommit IS the pre-call commit.
   * Throws on failure so an enclosing transaction rolls back.
   */
  async function createSendIntent(
    dbLike: DbLike,
    body: string,
    opts: SendOptions,
    // CH-05: an AI reply carries its tool-run audit (raw.toolRuns) for the
    // guardrail record + weekly review. Optional + additive — no other caller
    // changes; the single chokepoint stays intact (D2).
    // CH-12: type/templateName widen the same seam for the template path.
    extra?: { raw?: unknown; type?: Message['type']; templateName?: string },
  ): Promise<Message> {
    // WHY 'queued': it is the §4 enum's spelling of §3.4's 'sending' — no
    // other use assigns messages.status='queued' anywhere in the plan
    // (CH-02 decision D1; CH-12/13/16/17 inherit this, do not reopen it).
    const { message } = await insertMessage(dbLike, {
      conversationId: opts.conversationId,
      // CH-18c: the durable erasure link for a conversation_id=NULL card (§4).
      guestId: opts.aboutGuestId ?? null,
      direction: 'out',
      sender: opts.sender,
      type: extra?.type ?? 'text',
      // The RENDERED text is always stored, even for a real template send, so
      // the transcript (and therefore the model, and therefore a human reading
      // the thread) sees what the guest actually received — not a template id.
      body,
      templateName: extra?.templateName,
      status: 'queued',
      raw: extra?.raw,
    });
    if (message === null) {
      // Unreachable without a wa_message_id conflict; guarded for honesty.
      throw new Error('send-intent row insert returned no row');
    }
    return message;
  }

  /**
   * Performs the Graph call for an already-COMMITTED intent row and settles
   * it 'sent' or 'failed' (+ ops alert). Never throws — the row is the audit
   * and callers own their failure policy.
   */
  async function dispatchText(args: DispatchArgs): Promise<SendResult> {
    return dispatchToGraph(args, {
      messaging_product: 'whatsapp',
      to: args.toE164,
      type: 'text',
      text: { body: args.body },
    });
  }

  /** The Graph call + settle, shared by the text and template paths so the
   * send-intent guarantees (§3.4) cannot diverge between them. */
  async function dispatchToGraph(args: DispatchArgs, payload: unknown): Promise<SendResult> {
    // §3.4: a crash between the intent commit and this Graph settle leaves an inert
    // 'queued' row. CH-18c's 5-min reconcile sweep (wa/sendReconcile.ts) is the
    // recovery net — it marks such a row terminally 'failed' + alerts, and by design
    // NEVER resends (a 'queued' row may have reached Meta before the crash, so a
    // resend risks a double send; a real resend verb needs a sent/send_failed state
    // model, CH-17 open Q#1, deliberately out of scope).
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
        body: JSON.stringify(payload),
      });
      httpStatus = response.status;
      if (!response.ok) {
        return await settleFailed(deps.db, deps.log, args.messageId, args.conversationId, await graphFailure(response));
      }
      const parsed = (await response.json().catch(() => ({}))) as WaSendResponse;
      waMessageId = parsed.messages?.[0]?.id;
      if (waMessageId === undefined) {
        return await settleFailed(deps.db, deps.log, args.messageId, args.conversationId, {
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
        .where(and(eq(messages.id, args.messageId), eq(messages.status, 'queued')))
        .returning({ id: messages.id });
      if (updated.length === 0) {
        deps.log.warn({ messageId: args.messageId }, 'queued→sent update applied to no row');
      }
      return { ok: true, messageId: args.messageId, waMessageId };
    } catch (error) {
      // summarizeError, never raw messages: a thrown DB error embeds bound
      // params (§3.3) — and this row/alert text must stay content-free.
      return await settleFailed(
        deps.db,
        deps.log,
        args.messageId,
        args.conversationId,
        { errorText: summarizeError(error), httpStatus },
        waMessageId,
      );
    }
  }

  /**
   * Sends a free-form text (§5.3): createSendIntent then dispatchText — the
   * §3.4 send-intent pattern. Returns a result, never throws.
   *
   * CH-12: refuses outside the 24h window. §5.3 calls an out-of-window
   * free-form attempt a BUG, and it is right — Meta would reject it with
   * 131047, so the only thing sending anyway buys is a wasted call and a
   * mystery. Callers who need to reach a closed window use sendTemplated.
   */
  async function sendText(toE164: string, body: string, opts: SendOptions): Promise<SendResult> {
    const window = await windowStateFor(
      deps.db,
      { conversationId: opts.conversationId, phone: toE164 },
      now(),
    );
    if (!window.open) {
      deps.log.warn(
        { conversationId: opts.conversationId, windowSource: window.source },
        'free-form send refused — 24h window closed',
      );
      await alertOps(deps.log, {
        kind: 'window_closed_blocked',
        summary: 'Free-form send refused — the 24h window is closed',
        detail: { conversationId: opts.conversationId, windowSource: window.source },
      });
      return { ok: false, messageId: null, error: 'WINDOW_CLOSED', retryable: false };
    }

    let message: Message;
    try {
      message = await createSendIntent(deps.db, body, opts);
    } catch (error) {
      // A transient DB error here used to escape as a throw, contradicting
      // this function's never-throws contract (found in the CH-03 pre-build
      // review). No row exists to mark 'failed' — alert and return.
      await alertOps(deps.log, {
        kind: 'wa_send_failed',
        summary: 'WhatsApp send-intent insert failed',
        detail: { conversationId: opts.conversationId },
      });
      return { ok: false, messageId: null, error: summarizeError(error), retryable: true };
    }
    return dispatchText({
      messageId: message.id,
      toE164,
      body,
      conversationId: opts.conversationId,
    });
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

  // The TEMPLATE half of the chokepoint (§5.3), split into its own file for the
  // ~300-line rule. It is handed THIS client's internals rather than
  // re-implementing them, so there is still exactly one door out (D2).
  const templates = createTemplateSender({
    db: deps.db,
    log: deps.log,
    now,
    templateMode,
    createSendIntent,
    dispatchToGraph,
  });

  return {
    sendText,
    markRead,
    createSendIntent,
    dispatchText,
    sendTemplated: templates.sendTemplated,
    planTemplatedSend: templates.planTemplatedSend,
    dispatchTemplated: templates.dispatchTemplated,
  };
}

export type WaClient = ReturnType<typeof createWaClient>;
