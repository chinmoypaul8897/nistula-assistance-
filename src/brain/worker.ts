/**
 * Conversation worker (CH-03 skeleton + CH-04 voice + CH-05 tools + CH-07
 * policy). This file owns the debounce/policy/claim/dispatch machinery; the
 * Claude turn (tool loop + guardrails) lives in turn.ts and the §6.7 policy
 * decisions in policy.ts. Binding invariant (CH-03 D2): all fallible
 * think-work stays BEFORE the claim — a pre-claim throw is retry-safe
 * (pg-boss retry / sweeper), leaving no reply and no claim (§6.6).
 *
 * CH-07: a deterministic policy pre-pass routes special cases before the
 * model; the claim optionally carries a guarded status transition (cool-off
 * enter/restore); escalations fire BEFORE the guest dispatch so "bringing the
 * team in" is true at guest-receipt time, and each writes a claimable
 * sender:'system' evidence row (§6.5 #2's second channel — the convention
 * CH-13's task events reuse).
 */
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getUnprocessedGuestMessages,
  insertMessage,
  resolveMessageCursor,
} from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';
import {
  decidePolicy,
  settlePlanFor,
  type EscalationReason,
  type RateWindow,
} from './policy.js';
import { PHRASEBOOK } from './prompt.js';
import { createHitRecorder } from './telemetry.js';
import { runClaudeTurn, type TurnDeps, type TurnLogger } from './turn.js';

export type WorkerLogger = TurnLogger;

export interface WorkerDeps extends TurnDeps {
  // wa gains sendText for the interim ops escalation (real escalate_to_human
  // lands CH-14; until then escalations message OPS_NUMBERS directly).
  wa: Pick<WaClient, 'createSendIntent' | 'dispatchText' | 'sendText'>;
  windows: DebounceWindows;
  /** OPS_NUMBERS (E.164) — interim escalation recipients (§5.3 chokepoint). */
  opsNumbers: string[];
  /** The §3.3 rate window — injected singleton (policy.ts createRateWindow). */
  rateWindow: RateWindow;
  /** Bound by jobs/index.ts — enqueuer and worker share ONE windows source (no drift). */
  enqueue: (conversationId: string, startAfter?: Date) => Promise<void>;
}

/**
 * One debounced processing pass for a conversation. Throws only BEFORE the
 * claim (pg-boss retry is then safe); after the claim every failure settles
 * on the intent row (§6.6: no reply is sent, ops alerted — no worker retry).
 */
export async function processConversation(
  deps: WorkerDeps,
  conversationId: string,
): Promise<void> {
  const ctx = await getConversationTurnContext(deps.db, conversationId);
  if (ctx === null) {
    deps.log.warn({ conversationId }, 'job for unknown conversation — dropped');
    return;
  }
  const pointer = ctx.conversation.lastProcessedMessageId;
  const { cursor, dangling } = await resolveMessageCursor(deps.db, pointer);
  if (dangling) {
    // Never wedge a guest on a bad pointer — process-all repairs it below.
    await alertOps(deps.log, {
      kind: 'conversation_cursor_dangling',
      summary: 'processed-pointer row missing — treating all messages as unprocessed',
      detail: { conversationId, pointer },
    });
  }
  const msgs = await getUnprocessedGuestMessages(deps.db, conversationId, cursor);
  const newest = msgs.at(-1);
  const oldest = msgs.at(0);
  if (newest === undefined || oldest === undefined) {
    return; // duplicate/sweeper wake with nothing pending — normal no-op
  }

  const decision = decideDebounce({
    newestAt: newest.createdAt,
    oldestAt: oldest.createdAt,
    now: ctx.dbNow,
    quietMs: deps.windows.quietMs,
    maxWaitMs: deps.windows.maxWaitMs,
  });
  if (decision.action === 'requeue') {
    await deps.enqueue(conversationId, decision.startAfter);
    return;
  }

  // §6.7 pre-model pass (CH-07): feed the id-keyed rate window (retries and
  // sweeper wakes re-feed the same ids — a no-op), then decide + settle.
  deps.rateWindow.feed(
    ctx.guestPhone,
    msgs.map((m) => ({ id: m.id, createdAt: m.createdAt })),
    ctx.dbNow,
  );
  const directive = decidePolicy({
    messages: msgs,
    conversation: ctx.conversation,
    now: ctx.dbNow,
    overLimit: deps.rateWindow.isOverLimit(ctx.guestPhone, ctx.dbNow),
  });
  const plan = settlePlanFor(directive, ctx.conversation.status);

  // The Claude turn — ALL fallible think-work, BEFORE the claim (D2). Policy
  // paths that skip the model resolve to a fixed phrasebook line instead.
  const turn = plan.modelRuns
    ? await runClaudeTurn(deps, {
        conversation: ctx.conversation,
        dbNow: ctx.dbNow,
        conversationId,
        guestPhone: ctx.guestPhone,
        mustEscalate: plan.mustEscalate,
        unviewableMedia: directive.flags.hasMedia,
        // §6.5 #2 "since the guest's previous message" = the cursor row's time.
        evidenceSince: cursor === null ? null : new Date(cursor.createdAtIso),
      })
    : null;
  const body = turn !== null ? turn.text : plan.send !== null ? PHRASEBOOK[plan.send] : null;

  // ONE transaction (CH-03 decision D2): claim (+ guarded status CASE) + send
  // intent commit atomically so every failure state stays observable. Claim
  // FIRST inside the tx: a losing claim writes nothing. `claimed` is tracked
  // separately from `intentId` — store-only paths claim without an intent.
  let claimed = false;
  let announced = false;
  let intentId: string | null = null;
  await deps.db.transaction(async (tx) => {
    const res = await claimConversationTurn(tx, {
      conversationId,
      expectedPointer: pointer,
      newPointer: newest.id,
      lastGuestMsgAt: newest.createdAt,
      statusTransition: plan.statusTransition ?? undefined,
    });
    if (!res.claimed) return;
    claimed = true;
    // The once-only cool-off line: announce only when the claim REPORTS the
    // requested edge (a CH-14 human takeover racing in suppresses it safely).
    announced = !plan.announceOnTransition || res.status === plan.statusTransition?.to;
    if (body !== null && announced) {
      const intent = await deps.wa.createSendIntent(
        tx,
        body,
        { conversationId, sender: 'ai' },
        turn !== null && turn.toolRuns.length > 0 ? { raw: { toolRuns: turn.toolRuns } } : undefined,
      );
      intentId = intent.id;
    }
  });

  if (!claimed) {
    deps.log.info({ conversationId }, 'turn already claimed by a concurrent run — skipped');
  } else {
    // Crash forensics: a 'turn claimed' line with no matching dispatch
    // outcome marks the (milliseconds-wide) claim→dispatch crash window.
    deps.log.info(
      { conversationId, upto: newest.id, intentId, directive: directive.kind },
      'turn claimed',
    );
    // Escalation BEFORE the guest dispatch: a reply saying "bringing the team
    // in" must be true at guest-receipt time. Winning-claim path only, so a
    // losing concurrent run never double-escalates (CH-05 precedent). The
    // policy plan's reason wins over the guardrails' (a complaint that also
    // deferred a price still pings ops exactly once).
    const reason = plan.escalate ?? turn?.escalate ?? null;
    if (reason !== null) await escalateToOps(deps, conversationId, reason, directive.guestTextTail);
    if (intentId !== null && body !== null) {
      await deps.wa.dispatchText({ messageId: intentId, toE164: ctx.guestPhone, body, conversationId });
    }
    await recordPolicyOutcome(deps, conversationId, ctx.guestPhone, directive, plan, announced);
  }

  // End-of-run re-check (CH-03 step 1): messages that landed mid-run are
  // newer than the claimed pointer — re-enqueue and let debounce group them.
  // Runs on the losing-claim path too (cheaper than waiting for the sweeper).
  await recheck(deps, conversationId);
}

const ESCALATION_SUMMARIES: Record<EscalationReason, string> = {
  price: 'Price help needed on a guest thread — the AI could not confirm a rate safely.',
  human_request: 'A guest asked for a human — the AI stepped back and promised the front desk.',
  complaint: 'A guest appears unhappy — the AI acknowledged it and flagged the thread.',
  media: 'A guest sent media the AI cannot view — the AI asked them to type it.',
  leak: 'A reply was blocked by the leak scan — please review the thread.',
  promise: 'A reply was blocked by promise integrity — please review the thread.',
  referral: 'The AI told a guest the team will follow up — please pick up the thread.',
};

/**
 * Interim escalation (real escalate_to_human lands CH-14): messages each OPS
 * number (conversationId null / sender system, per CH-02 D5), writes the
 * claimable evidence row on the guest conversation, and raises an ops alert —
 * in dev OPS_NUMBERS is unset, so the alert log IS the ops channel (D4).
 */
async function escalateToOps(
  deps: WorkerDeps,
  conversationId: string,
  reason: EscalationReason,
  guestTextTail: string,
): Promise<void> {
  const summary = ESCALATION_SUMMARIES[reason];
  // The card carries the guest's ask (sanitised + capped by policy.ts) — the
  // humanRequest line's "they have the full picture" must be honest. PII to
  // an ops WhatsApp is the CH-14 card pattern; logs still carry ids only.
  const card = guestTextTail === '' ? summary : `${summary}\nGuest: "${guestTextTail}"`;
  for (const ops of deps.opsNumbers) {
    await deps.wa.sendText(ops, card, { conversationId: null, sender: 'system' });
  }
  try {
    // Claimable evidence (§6.5 #2, CH-02 D5 opt-in tagging): transcript-
    // invisible (mapTranscript skips system rows) but guardrail-2 readable.
    await insertMessage(deps.db, {
      conversationId,
      direction: 'out',
      sender: 'system',
      type: 'text',
      body: `ops escalated: ${reason}`,
      status: 'sent',
      raw: { contextKind: 'ops_escalation', reason },
    });
  } catch (error) {
    deps.log.warn({ err: summarizeError(error) }, 'escalation evidence row failed (telemetry only)');
  }
  await alertOps(deps.log, {
    kind: 'guest_thread_escalation',
    summary,
    detail: { conversationId, reason },
  });
}

/** Policy telemetry + the §3.3 cool-off ops alert — winning-claim path only. */
async function recordPolicyOutcome(
  deps: WorkerDeps,
  conversationId: string,
  guestPhone: string,
  directive: ReturnType<typeof decidePolicy>,
  plan: ReturnType<typeof settlePlanFor>,
  announced: boolean,
): Promise<void> {
  if (plan.telemetry === null) return;
  // cool_off records once per ai_active→cooloff edge, not per stored message.
  if (plan.telemetry === 'cool_off' && !announced) return;
  const record = createHitRecorder(deps.db, deps.log, { conversationId, guestPhone });
  await record({
    kind: 'policy',
    rule: plan.telemetry,
    action: 'routed',
    details: { directive: directive.kind, ...directive.flags },
  });
  if (plan.telemetry === 'cool_off') {
    await alertOps(deps.log, {
      kind: 'rate_limit_cooloff',
      summary: 'guest rate-limited — one polite line sent, store-only until the window clears',
      detail: {
        conversationId,
        containsHumanRequest: directive.flags.containsHumanRequest,
        containsComplaint: directive.flags.containsComplaint,
      },
    });
  }
}

async function recheck(deps: WorkerDeps, conversationId: string): Promise<void> {
  const ctx = await getConversationTurnContext(deps.db, conversationId);
  if (ctx === null) return;
  const { cursor } = await resolveMessageCursor(
    deps.db,
    ctx.conversation.lastProcessedMessageId,
  );
  const pending = await getUnprocessedGuestMessages(deps.db, conversationId, cursor);
  if (pending.length > 0) await deps.enqueue(conversationId);
}

/**
 * Recovery net (CH-03 step 1, §6.6): re-enqueues any conversation whose
 * oldest unprocessed guest message predates the sweep window — crashed
 * enqueues, lost jobs, model failures all funnel through here. Idempotent:
 * a pending job absorbs the send (stately created-dedupe).
 */
export async function sweepStrandedConversations(
  deps: Pick<WorkerDeps, 'db' | 'log' | 'enqueue' | 'windows'>,
): Promise<void> {
  const stale = await findStaleConversations(deps.db, deps.windows.sweepAfterMs / 1000);
  for (const conversationId of stale) {
    // Epoch = "eligible immediately" on any clock; past the sweep window the
    // worker's maxWait check always says process, so no quiet delay applies.
    await deps.enqueue(conversationId, new Date(0));
    deps.log.info({ conversationId }, 'sweeper re-enqueued a stranded conversation');
  }
}
