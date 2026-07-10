/**
 * Conversation worker v0 (plan.md CH-03 step 3): the debounced ECHO turn —
 * proves webhook → queue → worker → send end to end. CH-04 swaps
 * buildEchoReply for the Claude turn; the claim/dispatch skeleton stays.
 * Forward note (CH-03 D2): the claim must remain AFTER all fallible
 * think-work — pre-claim throws are retry-safe, post-claim is send-only.
 */
import type { Db } from '../db/client.js';
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getUnprocessedGuestMessages,
  resolveMessageCursor,
  type Message,
} from '../db/repos.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';

export interface WorkerLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface WorkerDeps {
  db: Db;
  wa: Pick<WaClient, 'createSendIntent' | 'dispatchText'>;
  log: WorkerLogger;
  windows: DebounceWindows;
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

  const reply = buildEchoReply(msgs);
  // ONE transaction (CH-03 decision D2): claim + send intent commit
  // atomically so every failure state stays observable — no claim → the
  // sweeper retries the whole turn; claim committed → the 'queued' intent
  // row exists for the CH-17 stale-queued sweep. Claim FIRST inside the tx:
  // a losing claim writes nothing, so the empty commit is a no-op.
  let intentId: string | null = null;
  await deps.db.transaction(async (tx) => {
    const claimed = await claimConversationTurn(tx, {
      conversationId,
      expectedPointer: pointer,
      newPointer: newest.id,
      lastGuestMsgAt: newest.createdAt,
    });
    if (!claimed) return;
    const intent = await deps.wa.createSendIntent(tx, reply, { conversationId, sender: 'ai' });
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
      body: reply,
      conversationId,
    });
  }

  // End-of-run re-check (CH-03 step 1): messages that landed mid-run are
  // newer than the claimed pointer — re-enqueue and let debounce group them.
  // Runs on the losing-claim path too (cheaper than waiting for the sweeper).
  await recheck(deps, conversationId);
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

/** v0 reply body — CH-04 replaces this with the Claude turn. */
function buildEchoReply(msgs: Message[]): string {
  // Null bodies (media/unsupported) become type placeholders: the guest sees
  // the pipeline handled every message, and the pointer still advances.
  const parts = msgs.map((message) => message.body ?? `[${message.type}]`);
  return `echo: ${parts.join('\n')}`;
}

/**
 * Recovery net (CH-03 step 1, §6.6): re-enqueues any conversation whose
 * oldest unprocessed guest message predates the sweep window — crashed
 * enqueues, lost jobs, model failures (from CH-04) all funnel through here.
 * Idempotent: a pending job absorbs the send (stately created-dedupe).
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
