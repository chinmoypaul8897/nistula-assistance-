/**
 * Context builder (plan.md §6.3, CH-08). Extracted from turn.ts so the turn
 * file keeps only the tool loop + guardrail orchestration: this module owns
 * everything the model SEES before the first call — the recent-messages fetch,
 * the transcript mapping, the guardrail-2 evidence extraction, and the system
 * blocks ([6] SITUATION via prompt.ts). CH-08 grows it with the token-budgeted
 * window and the summary/guest blocks; the extraction itself is
 * behaviour-preserving.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Db } from '../db/client.js';
import { getRecentMessages, type Conversation, type Message } from '../db/repos.js';
import { isNightIST } from '../lib/time.js';
import { isWindowOpen } from './draftGuards.js';
import { captionOf, locationTextOf } from './inbound.js';
import { loadKnowledge } from './knowledge.js';
import { classesFromContextKinds, type ClaimClass } from './promises.js';
import { buildSituation, buildSystemPrompt, type SystemBlock } from './prompt.js';
import type { DegradedTracker } from './tools/degraded.js';

export type TurnMessage = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] };

/** The slice of TurnDeps the context build needs (turn.ts passes its deps
 * straight through — structural subset, no import cycle). */
export interface ContextBuilderDeps {
  db: Db;
  degraded: DegradedTracker;
  nightStart: string;
  nightEnd: string;
}

/** The slice of TurnArgs the context build consumes. */
export interface ContextBuilderArgs {
  conversation: Conversation;
  dbNow: Date;
  conversationId: string;
  /** Guardrail-2 evidence window start (§6.5 #2) — null means no previous
   * message, so every claimable system row counts. */
  evidenceSince: Date | null;
  /** The 24h-window operand (the newest batch message — the conversation
   * column is stale pre-claim, CH-07 finding). */
  newestGuestMsgAt: Date;
  mustEscalate: boolean;
  unviewableMedia: boolean;
}

export interface TurnContext {
  system: SystemBlock[];
  baseMessages: TurnMessage[];
  systemEvidence: Set<ClaimClass>;
  isNight: boolean;
}

/**
 * Builds everything the first converse call needs. All reads are pre-claim
 * (CH-03 D2): a throw here is retry-safe.
 */
export async function buildTurnContext(
  deps: ContextBuilderDeps,
  args: ContextBuilderArgs,
): Promise<TurnContext> {
  const { dbNow, conversationId } = args;
  const recent = await getRecentMessages(deps.db, conversationId);
  const baseMessages = mapTranscript(recent);
  // Guardrail-2 evidence (§6.5 #2's second channel): claimable system rows
  // since the guest's previous message, from the SAME fetch as the transcript
  // (mapTranscript skips system rows, so they are already in hand).
  const since = args.evidenceSince;
  const systemEvidence = classesFromContextKinds(
    recent
      .filter(
        (m) =>
          m.sender === 'system' &&
          (since === null || m.createdAt.getTime() >= since.getTime()),
      )
      .map((m) => (m.raw as { contextKind?: string } | null)?.contextKind)
      .filter((kind): kind is string => typeof kind === 'string'),
  );
  const isNight = isNightIST(dbNow, deps.nightStart, deps.nightEnd);
  const situation = buildSituation({
    now: dbNow,
    isNight,
    serviceWindowOpen: isWindowOpen(args.newestGuestMsgAt, dbNow),
    degraded: deps.degraded.isDegraded(),
    mustEscalate: args.mustEscalate,
    unviewableMedia: args.unviewableMedia,
  });
  // Block [3] KNOWLEDGE (CH-06) — compiled kb, memoised; rides the cached head.
  const system = buildSystemPrompt(situation, loadKnowledge().knowledge);
  return { system, baseMessages, systemEvidence, isNight };
}

/**
 * Maps stored messages to the Claude message array (CH-04, media-aware since
 * CH-07). guest→user, ai→assistant, human→assistant with "(Front desk)";
 * system rows skipped; a guest media message renders its CAPTION ("[image]
 * <caption>" — the caption is guest-typed text, §6.7 review finding) or a
 * location its place/coordinates; captionless media stays a [type]
 * placeholder; leading non-user turns dropped (Anthropic opens on user).
 */
export function mapTranscript(msgs: Message[]): TurnMessage[] {
  const mapped: TurnMessage[] = [];
  for (const message of msgs) {
    if (message.sender === 'system') continue;
    if (message.sender === 'guest') {
      mapped.push({ role: 'user', content: renderGuestContent(message) });
    } else if (message.sender === 'human') {
      mapped.push({ role: 'assistant', content: `(Front desk) ${message.body ?? `[${message.type}]`}` });
    } else {
      mapped.push({ role: 'assistant', content: message.body ?? `[${message.type}]` });
    }
  }
  while (mapped.length > 0 && mapped[0]?.role !== 'user') mapped.shift();
  return mapped;
}

function renderGuestContent(message: Message): string {
  if (message.body !== null) return message.body;
  const location = locationTextOf(message);
  if (location !== null) return `[location] ${location}`;
  const caption = captionOf(message);
  if (caption !== null) return `[${message.type}] ${caption}`;
  return `[${message.type}]`;
}
