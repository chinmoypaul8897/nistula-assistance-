/**
 * Conversation worker v1 (plan.md CH-04 step 3): the debounced CLAUDE turn —
 * builds the system prompt + transcript, calls converse(), and sends the
 * reply in Nistula's voice (no tools yet — factual questions are deferred).
 * The claim/dispatch skeleton is unchanged from CH-03. Binding invariant
 * (CH-03 D2): the model call is fallible think-work and stays BEFORE the claim
 * — a pre-claim throw is retry-safe (pg-boss retry / sweeper), leaving no
 * reply and no claim (§6.6).
 */
import type { Db } from '../db/client.js';
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getRecentMessages,
  getUnprocessedGuestMessages,
  insertCostEvents,
  resolveMessageCursor,
  type Conversation,
  type Message,
  type NewCostEvent,
} from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { istCalendarDay, isNightIST } from '../lib/time.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import type { ConverseFn } from './claude.js';
import { costEventsFor, type ConverseUsage } from './cost.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';
import { buildSituation, buildSystemPrompt } from './prompt.js';

export interface WorkerLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface WorkerDeps {
  db: Db;
  wa: Pick<WaClient, 'createSendIntent' | 'dispatchText'>;
  log: WorkerLogger;
  windows: DebounceWindows;
  /** The Claude client (§5.5) — injected so tests mock the model, no live call. */
  converse: ConverseFn;
  /** Night-window bounds for the SITUATION block (config NIGHT_START/NIGHT_END). */
  nightStart: string;
  nightEnd: string;
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

  // The Claude turn (CH-04) — ALL fallible think-work, BEFORE the claim (D2).
  const reply = await runClaudeTurn(deps, ctx.conversation, ctx.dbNow, conversationId);
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

type TurnMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Builds the system prompt + transcript and calls Claude (CH-04). A converse
 * throw is alerted then rethrown — pre-claim, so pg-boss/sweeper recover with
 * no reply and no claim (§6.6). Cost is logged best-effort after a success:
 * telemetry never blocks a reply, and the API call cost is real regardless of
 * whether this run later wins the claim.
 */
async function runClaudeTurn(
  deps: WorkerDeps,
  conversation: Conversation,
  dbNow: Date,
  conversationId: string,
): Promise<string> {
  const transcript = mapTranscript(await getRecentMessages(deps.db, conversationId));
  const situation = buildSituation({
    now: dbNow,
    isNight: isNightIST(dbNow, deps.nightStart, deps.nightEnd),
    serviceWindowOpen: isServiceWindowOpen(conversation.serviceWindowExpiresAt, dbNow),
  });

  let result;
  try {
    result = await deps.converse({ system: buildSystemPrompt(situation), messages: transcript });
  } catch (error) {
    await alertOps(deps.log, {
      kind: 'model_failed',
      summary: 'Anthropic call failed after retries — no reply sent',
      detail: { conversationId, err: summarizeError(error) },
    });
    throw error; // pre-claim (D2/§6.6): pg-boss retry then the sweeper recover
  }
  await logCost(deps, dbNow, result.usage);
  // Token counts only (no bodies, no secrets — §3.3). cacheRead > 0 from the
  // second message in a window is the proof the static head is caching (§5.5).
  deps.log.info(
    {
      conversationId,
      tokens: {
        in: result.usage.inputTokens,
        out: result.usage.outputTokens,
        cacheRead: result.usage.cacheReadTokens,
        cacheWrite: result.usage.cacheWriteTokens,
      },
    },
    'claude turn',
  );
  return result.text;
}

/**
 * Maps stored messages to the Claude message array (CH-04). guest→user,
 * ai→assistant, human→assistant with a "(Front desk)" prefix so the model
 * knows a person spoke; sender:'system' rows (internal context) are skipped.
 * Null bodies (media/unsupported) render as [type] placeholders. Leading
 * non-user turns are dropped — Anthropic requires the array to open on user.
 */
function mapTranscript(msgs: Message[]): TurnMessage[] {
  const mapped: TurnMessage[] = [];
  for (const message of msgs) {
    if (message.sender === 'system') continue;
    const content = message.body ?? `[${message.type}]`;
    if (message.sender === 'guest') {
      mapped.push({ role: 'user', content });
    } else if (message.sender === 'human') {
      mapped.push({ role: 'assistant', content: `(Front desk) ${content}` });
    } else {
      mapped.push({ role: 'assistant', content });
    }
  }
  while (mapped.length > 0 && mapped[0]?.role !== 'user') mapped.shift();
  return mapped;
}

function isServiceWindowOpen(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && now.getTime() < expiresAt.getTime();
}

/** One cost_events row per non-zero token bucket, stamped with the IST day. */
async function logCost(deps: WorkerDeps, now: Date, usage: ConverseUsage): Promise<void> {
  try {
    const day = istCalendarDay(now);
    const rows: NewCostEvent[] = costEventsFor(usage).map((row) => ({ day, ...row }));
    await insertCostEvents(deps.db, rows);
  } catch (error) {
    deps.log.warn({ err: summarizeError(error) }, 'cost_events insert failed (telemetry only)');
  }
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
