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
import {
  ALL_TEMPLATES,
  templateComponents,
  type TemplateDef,
  type TemplateKey,
} from '../lifecycle/templates.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaSendResponse } from './types.js';

/**
 * Whether real Meta templates are sent, or simulated as free-form (plan CH-12
 * step 4). Template approval belongs to the real number's WABA, which does not
 * exist yet — so dev sends the IDENTICAL body as free-form and marks the row
 * raw.devTemplate = true. No visible prefix: the guest sees what production
 * would send. Nothing branches on NODE_ENV, only on this value (§5.3).
 */
export type TemplateMode = 'simulate' | 'send';

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

/** A window-aware send of catalogued, pre-approved text. */
export interface TemplatedSend {
  key: TemplateKey;
  params: Record<string, string>;
}

/** A decided-but-not-yet-written templated send (see planTemplatedSend). */
export interface PlannedTemplatedSendOk {
  ok: true;
  /** The rendered text — stored on the row whichever vehicle carries it. */
  body: string;
  /** True ⇒ a real Meta template goes on the wire (window shut, mode 'send'). */
  asTemplate: boolean;
  templateName: string;
  params: Record<string, string>;
  def: TemplateDef;
  intentExtra: { type: Message['type']; templateName: string; raw: unknown };
}
export type PlannedTemplatedSend = PlannedTemplatedSendOk | { ok: false; error: string };

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
    // TODO(CH-17): stale-'queued' reconciliation sweep + alert (§3.4 —
    // a crash between the intent commit and here leaves an inert intent row).
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
        return await failSend(args.messageId, args.conversationId, await graphFailure(response));
      }
      const parsed = (await response.json().catch(() => ({}))) as WaSendResponse;
      waMessageId = parsed.messages?.[0]?.id;
      if (waMessageId === undefined) {
        return await failSend(args.messageId, args.conversationId, {
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
      return await failSend(
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
      return { ok: false, messageId: null, error: 'WINDOW_CLOSED' };
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
      return { ok: false, messageId: null, error: summarizeError(error) };
    }
    return dispatchText({
      messageId: message.id,
      toE164,
      body,
      conversationId: opts.conversationId,
    });
  }

  /**
   * Sends catalogued text, window-aware — the ONLY way to reach someone who has
   * not written to us, and therefore the whole basis of CH-12.
   *
   * Window OPEN  → free-form. Warmer, free, and it threads naturally.
   * Window SHUT  → the template path: a real Meta template in 'send' mode, or
   *                the identical body as free-form in 'simulate' mode, marked
   *                raw.devTemplate = true (plan CH-12 step 4).
   *
   * Returns the window state alongside the result so the caller can meter a
   * `wa_template` cost event only when a template was actually the vehicle.
   */
  async function sendTemplated(
    toE164: string,
    send: TemplatedSend,
    opts: SendOptions,
  ): Promise<SendResult & { usedTemplate: boolean }> {
    const planned = await planTemplatedSend(toE164, send, opts);
    if (!planned.ok) {
      return { ok: false, messageId: null, error: planned.error, usedTemplate: false };
    }
    let message: Message;
    try {
      message = await createSendIntent(deps.db, planned.body, opts, planned.intentExtra);
    } catch (error) {
      await alertOps(deps.log, {
        kind: 'wa_send_failed',
        summary: 'WhatsApp send-intent insert failed (template)',
        detail: { conversationId: opts.conversationId, template: planned.templateName },
      });
      return { ok: false, messageId: null, error: summarizeError(error), usedTemplate: false };
    }
    const result = await dispatchTemplated(
      { messageId: message.id, toE164, body: planned.body, conversationId: opts.conversationId },
      planned,
    );
    return { ...result, usedTemplate: planned.asTemplate };
  }

  /**
   * Decides HOW a catalogued message would go out, without writing or sending
   * anything — the window read, the param validation and the template-vs-
   * free-form choice, all up front.
   *
   * WHY it is separate: the lifecycle sender must claim its scheduled_messages
   * row and create the message intent in ONE transaction (so a crash can neither
   * double-send nor silently lose the message), and it therefore needs the body
   * decided BEFORE that transaction opens. This is the same intent/dispatch split
   * CH-03's worker uses; sendTemplated above is the convenience wrapper over it
   * for callers that need no transaction of their own (CH-13's staff cards).
   */
  async function planTemplatedSend(
    toE164: string,
    send: TemplatedSend,
    opts: SendOptions,
  ): Promise<PlannedTemplatedSend> {
    const def = ALL_TEMPLATES[send.key];
    let body: string;
    try {
      body = def.render(def.schema.parse(send.params));
    } catch (error) {
      await alertOps(deps.log, {
        kind: 'wa_template_invalid',
        summary: 'Template params rejected before sending',
        detail: { template: def.name, conversationId: opts.conversationId },
      });
      return { ok: false, error: summarizeError(error) };
    }

    const window = await windowStateFor(
      deps.db,
      { conversationId: opts.conversationId, phone: toE164 },
      now(),
    );
    const asTemplate = !window.open && templateMode === 'send';

    // A simulated template is PHYSICALLY a free-form text, so it cannot enter a
    // closed window either. That is not a gap in the simulation — it is the same
    // constraint production has, minus the approved template. The dev test number
    // cannot prove the closed-window path; only the real WABA can.
    if (!window.open && templateMode === 'simulate') {
      deps.log.warn(
        { template: def.name, windowSource: window.source },
        'template simulated into a CLOSED window — a real send needs WA_TEMPLATE_MODE=send',
      );
      await alertOps(deps.log, {
        kind: 'wa_template_unsendable',
        summary: 'Closed window and templates are simulated — message not sent',
        detail: { template: def.name, conversationId: opts.conversationId },
      });
      return { ok: false, error: 'WINDOW_CLOSED_SIMULATED' };
    }

    return {
      ok: true,
      body,
      asTemplate,
      templateName: def.name,
      params: send.params,
      def,
      intentExtra: {
        type: asTemplate ? 'template' : 'text',
        templateName: def.name,
        raw: { devTemplate: !asTemplate, template: def.name },
      },
    };
  }

  /** Graph call for an already-COMMITTED templated intent row. Never throws. */
  async function dispatchTemplated(
    args: DispatchArgs,
    planned: PlannedTemplatedSendOk,
  ): Promise<SendResult> {
    return planned.asTemplate
      ? dispatchToGraph(args, {
          messaging_product: 'whatsapp',
          to: args.toE164,
          type: 'template',
          template: {
            name: planned.def.name,
            language: { code: planned.def.language },
            components: templateComponents(planned.def, planned.params),
          },
        })
      : dispatchToGraph(args, {
          messaging_product: 'whatsapp',
          to: args.toE164,
          type: 'text',
          text: { body: args.body },
        });
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

  return {
    sendText,
    sendTemplated,
    planTemplatedSend,
    dispatchTemplated,
    markRead,
    createSendIntent,
    dispatchText,
  };
}

export type WaClient = ReturnType<typeof createWaClient>;

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
