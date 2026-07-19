/**
 * The TEMPLATE half of the send chokepoint (CH-12, §5.3).
 *
 * Split out of wa/client.ts to keep both files under the ~300-line rule (§0).
 * This is not a second chokepoint: it is handed the client's own internals
 * (createSendIntent, dispatchToGraph) and is only ever constructed from inside
 * createWaClient. CH-02 decision D2 still holds — there is one door out.
 *
 * Free-form can only enter an OPEN 24h window. A template can enter a shut one,
 * which makes this the only way to reach someone who has never written to us —
 * and therefore the entire basis of the lifecycle engine.
 */
import type { Db, DbLike } from '../db/client.js';
import type { Message } from '../db/repos.js';
import { windowStateFor } from '../db/windows.js';
import { ALL_TEMPLATES, templateComponents, type TemplateDef, type TemplateKey } from '../lifecycle/templates.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { SendResult } from './sendFailure.js';

/**
 * Whether real Meta templates are sent, or simulated as free-form (plan CH-12
 * step 4). Template approval belongs to the real number's WABA, which does not
 * exist yet — so dev sends the IDENTICAL body as free-form and marks the row
 * raw.devTemplate = true. No visible prefix: the guest sees what production
 * would send. Nothing branches on NODE_ENV, only on this value (§5.3).
 */
export type TemplateMode = 'simulate' | 'send';

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

export interface TemplateSenderLogger extends AlertLogger {
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

/** The client internals this layer borrows — never re-implemented here. */
export interface TemplateSenderContext {
  db: Db;
  log: TemplateSenderLogger;
  now: () => Date;
  templateMode: TemplateMode;
  createSendIntent: (
    dbLike: DbLike,
    body: string,
    opts: { conversationId: string | null; sender: 'ai' | 'human' | 'system' },
    extra?: { raw?: unknown; type?: Message['type']; templateName?: string },
  ) => Promise<Message>;
  dispatchToGraph: (
    args: { messageId: string; toE164: string; body: string; conversationId: string | null },
    payload: unknown,
  ) => Promise<SendResult>;
}

export function createTemplateSender(ctx: TemplateSenderContext) {
  /**
   * Decides HOW a catalogued message would go out, without writing or sending
   * anything — the window read, the param validation and the template-vs-
   * free-form choice, all up front.
   *
   * WHY it is separate from the send: the lifecycle sender must claim its
   * scheduled_messages row and create the message intent in ONE transaction (so
   * a crash can neither double-send nor silently lose the message), and it
   * therefore needs the body decided BEFORE that transaction opens. Same
   * intent/dispatch split CH-03's worker uses.
   */
  async function planTemplatedSend(
    toE164: string,
    send: TemplatedSend,
    opts: { conversationId: string | null; sender: 'ai' | 'human' | 'system' },
  ): Promise<PlannedTemplatedSend> {
    const def = ALL_TEMPLATES[send.key];
    let body: string;
    try {
      body = def.render(def.schema.parse(send.params));
    } catch (error) {
      await alertOps(ctx.log, {
        kind: 'wa_template_invalid',
        summary: 'Template params rejected before sending',
        detail: { template: def.name, conversationId: opts.conversationId },
      });
      return { ok: false, error: summarizeError(error) };
    }

    const window = await windowStateFor(
      ctx.db,
      { conversationId: opts.conversationId, phone: toE164 },
      ctx.now(),
    );
    const asTemplate = !window.open && ctx.templateMode === 'send';

    // A simulated template is PHYSICALLY a free-form text, so it cannot enter a
    // closed window either. That is not a gap in the simulation — it is the same
    // constraint production has, minus the approved template. The dev test number
    // cannot prove the closed-window path; only the real WABA can.
    if (!window.open && ctx.templateMode === 'simulate') {
      // WARN, not an ops alert. This is the EXPECTED state on the dev test number
      // for every lifecycle guest (they have never messaged us), and the sender
      // re-attempts the row on a backoff — an alert here paged ops once per row
      // per tick, for ever. The condition is normal; only its persistence in
      // PRODUCTION is a problem, and WA_TEMPLATE_MODE=send is what prevents that.
      ctx.log.warn(
        { template: def.name, windowSource: window.source },
        'template simulated into a CLOSED window — a real send needs WA_TEMPLATE_MODE=send',
      );
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
    args: { messageId: string; toE164: string; body: string; conversationId: string | null },
    planned: PlannedTemplatedSendOk,
  ) {
    return planned.asTemplate
      ? ctx.dispatchToGraph(args, {
          messaging_product: 'whatsapp',
          to: args.toE164,
          type: 'template',
          template: {
            name: planned.def.name,
            language: { code: planned.def.language },
            components: templateComponents(planned.def, planned.params),
          },
        })
      : ctx.dispatchToGraph(args, {
          messaging_product: 'whatsapp',
          to: args.toE164,
          type: 'text',
          text: { body: args.body },
        });
  }

  /**
   * The convenience wrapper: plan → intent → dispatch, for callers that need no
   * transaction of their own (CH-13's staff cards). Returns whether a template
   * was actually the vehicle, so the caller can meter a `wa_template` cost event
   * only when Meta will bill for one.
   */
  async function sendTemplated(
    toE164: string,
    send: TemplatedSend,
    // CH-18c: aboutGuestId threads through to createSendIntent (messages.guest_id)
    // for a conversation_id=NULL card about a guest; planTemplatedSend ignores it.
    opts: {
      conversationId: string | null;
      sender: 'ai' | 'human' | 'system';
      aboutGuestId?: string;
    },
  ) {
    const planned = await planTemplatedSend(toE164, send, opts);
    if (!planned.ok) {
      // A shut window (simulate mode) will reopen; a param rejection will not.
      const retryable = planned.error === 'WINDOW_CLOSED_SIMULATED';
      return { ok: false as const, messageId: null, error: planned.error, usedTemplate: false, retryable };
    }
    let message: Message;
    try {
      message = await ctx.createSendIntent(ctx.db, planned.body, opts, planned.intentExtra);
    } catch (error) {
      await alertOps(ctx.log, {
        kind: 'wa_send_failed',
        summary: 'WhatsApp send-intent insert failed (template)',
        detail: { conversationId: opts.conversationId, template: planned.templateName },
      });
      return {
        ok: false as const,
        messageId: null,
        error: summarizeError(error),
        usedTemplate: false,
        retryable: true, // a DB insert failure is transient
      };
    }
    const result = await dispatchTemplated(
      { messageId: message.id, toE164, body: planned.body, conversationId: opts.conversationId },
      planned,
    );
    return { ...result, usedTemplate: planned.asTemplate };
  }

  return { planTemplatedSend, dispatchTemplated, sendTemplated };
}
