/**
 * Conversation worker (plan.md CH-03 skeleton + CH-04 voice + CH-05 tools).
 * This file owns the debounce/claim/dispatch machinery; the Claude turn itself
 * (tool loop + guardrails) lives in turn.ts. Binding invariant (CH-03 D2): the
 * whole turn is fallible think-work and stays BEFORE the claim — a pre-claim
 * throw is retry-safe (pg-boss retry / sweeper), leaving no reply and no claim
 * (§6.6). CH-05 adds: the reply row carries its tool-run audit (raw.toolRuns),
 * and a guardrail-deferred price escalates to ops on the winning-claim path.
 */
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getUnprocessedGuestMessages,
  resolveMessageCursor,
} from '../db/repos.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';
import { runClaudeTurn, type TurnDeps, type TurnLogger } from './turn.js';

export type WorkerLogger = TurnLogger;

export interface WorkerDeps extends TurnDeps {
  // wa gains sendText for the CH-05 interim ops escalation (real escalate_to_human
  // lands CH-14; until then a deferred price messages OPS_NUMBERS directly).
  wa: Pick<WaClient, 'createSendIntent' | 'dispatchText' | 'sendText'>;
  windows: DebounceWindows;
  /** OPS_NUMBERS (E.164) — interim price-escalation recipients (§5.3 chokepoint). */
  opsNumbers: string[];
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

  // The Claude turn (CH-04 voice + CH-05 tools/guardrails) — ALL fallible
  // think-work, BEFORE the claim (D2).
  const turn = await runClaudeTurn(deps, ctx.conversation, ctx.dbNow, conversationId);
  // ONE transaction (CH-03 decision D2): claim + send intent commit atomically
  // so every failure state stays observable. Claim FIRST inside the tx: a
  // losing claim writes nothing, so the empty commit is a no-op. The reply row
  // carries the tool-run audit (CH-05 step 4).
  let intentId: string | null = null;
  await deps.db.transaction(async (tx) => {
    const claimed = await claimConversationTurn(tx, {
      conversationId,
      expectedPointer: pointer,
      newPointer: newest.id,
      lastGuestMsgAt: newest.createdAt,
    });
    if (!claimed) return;
    const intent = await deps.wa.createSendIntent(
      tx,
      turn.text,
      { conversationId, sender: 'ai' },
      turn.toolRuns.length > 0 ? { raw: { toolRuns: turn.toolRuns } } : undefined,
    );
    intentId = intent.id;
  });

  if (intentId === null) {
    deps.log.info({ conversationId }, 'turn already claimed by a concurrent run — skipped');
  } else {
    // Crash forensics: a 'turn claimed' line with no matching dispatch
    // outcome marks the (milliseconds-wide) claim→dispatch crash window.
    deps.log.info({ conversationId, upto: newest.id, intentId }, 'turn claimed');
    await deps.wa.dispatchText({
      messageId: intentId,
      toE164: ctx.guestPhone,
      body: turn.text,
      conversationId,
    });
    // Interim price escalation fires ONLY on the winning-claim path so a losing
    // concurrent run never double-escalates.
    if (turn.escalate) await escalateToOps(deps, conversationId);
  }

  // End-of-run re-check (CH-03 step 1): messages that landed mid-run are
  // newer than the claimed pointer — re-enqueue and let debounce group them.
  // Runs on the losing-claim path too (cheaper than waiting for the sweeper).
  await recheck(deps, conversationId);
}

/**
 * Interim escalation (CH-05 step 5) — a price the guardrail could not validate.
 * Messages each OPS number directly (conversationId null / sender system) and
 * raises an ops alert; in dev OPS_NUMBERS is unset, so the alert log is the
 * only channel. Real escalate_to_human lands CH-14.
 */
async function escalateToOps(deps: WorkerDeps, conversationId: string): Promise<void> {
  const summary = 'Price help needed on a guest thread — the AI could not confirm a rate safely.';
  for (const ops of deps.opsNumbers) {
    await deps.wa.sendText(ops, summary, { conversationId: null, sender: 'system' });
  }
  await alertOps(deps.log, {
    kind: 'price_guardrail_escalation',
    summary: 'AI deferred a price and escalated to ops',
    detail: { conversationId },
  });
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
