/**
 * Context builder (plan.md §6.3, CH-08). Extracted from turn.ts so the turn
 * file keeps only the tool loop + guardrail orchestration: this module owns
 * everything the model SEES before the first call — the token-budgeted
 * transcript window, the block [5] guest profile (name/prefs/facts, CH-09),
 * the rolling-summary block, the guardrail-2 evidence read, and [6]
 * SITUATION (via the prompt.ts/profileBlock.ts builders).
 *
 * Coverage invariant (shared with the summariser): summary ∪ window covers the
 * whole thread. `overflow` reports what THIS turn could not see so the worker
 * can enqueue an on-demand summarise (asynchronous — a guest turn never waits
 * on a second model call).
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Db } from '../db/client.js';
import {
  getRecentMessages,
  resolveMessageCursor,
  type Conversation,
  type Message,
} from '../db/repos.js';
import { getActiveGuestFacts } from '../db/guestMemory.js';
import { countUncoveredMessages, getSystemContextKinds } from '../db/summaries.js';
import { isNightIST } from '../lib/time.js';
import { isWindowOpen } from './draftGuards.js';
import { captionOf, locationTextOf } from './inbound.js';
import type { LoadedKnowledge } from './knowledge.js';
import { buildGuestBlock } from './profileBlock.js';
import { classesFromContextKinds, type ClaimClass } from './promises.js';
import {
  buildSituation,
  buildSummaryBlock,
  buildSystemPrompt,
  type SystemBlock,
} from './prompt.js';
import { estimateTokens } from './tokens.js';
import type { DegradedTracker } from './tools/degraded.js';

// §6.2/§6.3 transcript envelope — these literals ARE the spec ("rolling
// summary + last ~30 messages, token-budgeted"; walk back until ~6k transcript
// tokens or 30 msgs). D4 precedent: changing them is a plan.md edit. The
// summary block is charged AGAINST the budget (net), so the envelope as a
// whole stays ≤ ~6k. Block [5] (CH-09) is NOT budgeted here: its worst case
// is bounded by construction (15 facts × 200 code points + prefs + framing
// ≈ ~1k tokens), so the request maths still clears §6.3's ~12k — cached head
// ~4.2k + envelope ≤6k + [5] ≤~1k + [6] ≈ ~11.5k (audit-recorded, re-check
// if PROFILE_FACTS_LIMIT or FACT_RENDER_MAX ever grow).
export const TRANSCRIPT_MAX_MESSAGES = 30;
export const TRANSCRIPT_TOKEN_BUDGET = 6000;
/** Fetch slack over the window: system rows never render but share the fetch,
 * and one extra eligible row is the cheap "older messages exist" sentinel. */
export const TRANSCRIPT_FETCH_LIMIT = 40;
/** Floor so a (capped) summary can never starve the live transcript. */
const MIN_MESSAGE_BUDGET = 1000;

export type TurnMessage = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] };

/** The slice of TurnDeps the context build needs (turn.ts passes its deps
 * straight through — structural subset, no import cycle). */
export interface ContextBuilderDeps {
  db: Db;
  log: { warn: (obj: Record<string, unknown>, msg?: string) => void };
  /** Block [3] KNOWLEDGE + the guardrail fee whitelist — THREADED, never read
   * via the module-level loadKnowledge() singleton (the CH-06 residual this
   * chunk closes: tests inject a fake; boot injects the real load). */
  knowledge: LoadedKnowledge;
  degraded: DegradedTracker;
  nightStart: string;
  nightEnd: string;
}

/** The slice of TurnArgs the context build consumes. */
export interface ContextBuilderArgs {
  conversation: Conversation;
  dbNow: Date;
  conversationId: string;
  /** Block [5] name input (guest-typed; profileBlock.ts sanitises). */
  guestName: string | null;
  /** Block [5] tone inputs (CH-09) — default 'unknown' keeps old callers valid. */
  registerPref?: 'warm_first_name' | 'formal_sir_maam' | 'unknown';
  langPref?: 'en' | 'hinglish' | 'unknown';
  /** Guardrail-2 evidence window start (§6.5 #2) as the claim cursor's
   * created_at::text — µs-exact, never a JS Date (CH-03 trap). Null means no
   * previous message, so every claimable system row counts. */
  evidenceSinceIso: string | null;
  /** The 24h-window operand (the newest batch message — the conversation
   * column is stale pre-claim, CH-07 finding). */
  newestGuestMsgAt: Date;
  mustEscalate: boolean;
  unviewableMedia: boolean;
}

/** What this turn's window could NOT show the model — the on-demand
 * summarise signal (worker applies the hysteresis threshold). */
export interface TranscriptOverflow {
  /** The token budget (not the 30-message cap) trimmed the window — §6.3's
   * literal "transcript exceeds budget" overflow. */
  trimmedByTokens: boolean;
  /** Non-system messages invisible this turn: older than the window AND not
   * covered by the rolling summary. */
  uncoveredCount: number;
}

export interface TurnContext {
  system: SystemBlock[];
  baseMessages: TurnMessage[];
  systemEvidence: Set<ClaimClass>;
  isNight: boolean;
  overflow: TranscriptOverflow;
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
  const fetched = await getRecentMessages(deps.db, conversationId, TRANSCRIPT_FETCH_LIMIT);

  // Block [5] (CH-09): live facts, newest 15 — pre-claim like every read here.
  const facts = await getActiveGuestFacts(deps.db, args.conversation.guestId);
  const summaryBlock = buildSummaryBlock(args.conversation.summary);
  const plan = planWindow(fetched, transcriptBudgetFor(args.conversation.summary));
  const baseMessages = mapTranscript(plan.window);

  // Guardrail-2 evidence (§6.5 #2's second channel) — its OWN indexed query,
  // not a filter over the transcript fetch: a ≥fetch-size burst between turns
  // must never push a claimable row out of sight (CH-08 review finding 5).
  const systemEvidence = classesFromContextKinds(
    await getSystemContextKinds(deps.db, conversationId, args.evidenceSinceIso),
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
  const system = buildSystemPrompt(situation, deps.knowledge.knowledge, {
    guestBlock: buildGuestBlock({
      name: args.guestName,
      registerPref: args.registerPref ?? 'unknown',
      langPref: args.langPref ?? 'unknown',
      facts,
    }),
    summaryBlock,
  });

  const uncoveredCount = await detectUncovered(deps, args, fetched, plan);
  return {
    system,
    baseMessages,
    systemEvidence,
    isNight,
    overflow: { trimmedByTokens: plan.trimmedByTokens, uncoveredCount },
  };
}

/**
 * The message-token budget NET of the rendered summary block — the summary
 * spends from the same §6.2 envelope ("rolling summary + last ~30 messages"),
 * so the two together stay ≤ ~6k. ONE computation, shared by the live turn
 * and the summariser's boundary walk (the coverage invariant depends on both
 * sides drawing the window identically).
 */
export function transcriptBudgetFor(summary: string | null): number {
  const block = buildSummaryBlock(summary);
  return Math.max(
    MIN_MESSAGE_BUDGET,
    TRANSCRIPT_TOKEN_BUDGET - (block === null ? 0 : estimateTokens(block)),
  );
}

interface WindowPlan {
  /** Transcript-eligible rows inside the window, oldest-first. */
  window: Message[];
  trimmedByTokens: boolean;
  /** Eligible fetched rows were left out (by count or tokens). */
  excludedEligible: boolean;
}

/**
 * The §6.3 window walk, shared verbatim with the summariser's boundary
 * computation (coverage invariant): newest-first over transcript-eligible
 * rows until 30 messages or the token budget, measured on the RENDERED
 * strings. The newest message is always included — one giant message must
 * degrade to a 1-message window, never an empty transcript.
 */
export function planWindow(fetched: Message[], tokenBudget: number): WindowPlan {
  const eligible = fetched.filter((m) => m.sender !== 'system');
  const window: Message[] = [];
  let spent = 0;
  let trimmedByTokens = false;
  for (let i = eligible.length - 1; i >= 0; i--) {
    const message = eligible[i];
    if (message === undefined) continue;
    if (window.length >= TRANSCRIPT_MAX_MESSAGES) break;
    const cost = estimateTokens(renderTranscriptText(message));
    if (window.length > 0 && spent + cost > tokenBudget) {
      trimmedByTokens = true;
      break;
    }
    window.unshift(message);
    spent += cost;
  }
  return { window, trimmedByTokens, excludedEligible: window.length < eligible.length };
}

/**
 * The §6.3 overflow check. Cheap path first: when the window shows every
 * fetched eligible row AND the fetch was not full, nothing older exists —
 * no query. Otherwise one indexed count of window-invisible, summary-
 * uncovered messages. A dangling summary pointer (CH-18 DELETE_GUEST later)
 * degrades to "nothing covered" — fail toward summarising, never toward a
 * silent zero (the resolveMessageCursor convention).
 */
async function detectUncovered(
  deps: ContextBuilderDeps,
  args: ContextBuilderArgs,
  fetched: Message[],
  plan: WindowPlan,
): Promise<number> {
  const windowStart = plan.window[0];
  const mightExclude = plan.excludedEligible || fetched.length >= TRANSCRIPT_FETCH_LIMIT;
  if (windowStart === undefined || !mightExclude) return 0;

  const pointer = args.conversation.summaryUptoMessageId;
  const { cursor, dangling } = await resolveMessageCursor(deps.db, pointer);
  if (dangling) {
    deps.log.warn(
      { conversationId: args.conversationId, pointer },
      'summary cursor dangling — treating the summary as covering nothing',
    );
  }
  return countUncoveredMessages(deps.db, {
    conversationId: args.conversationId,
    windowStartId: windowStart.id,
    summaryCursor: cursor,
  });
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
    mapped.push(
      message.sender === 'guest'
        ? { role: 'user', content: renderGuestContent(message) }
        : { role: 'assistant', content: renderTranscriptText(message) },
    );
  }
  while (mapped.length > 0 && mapped[0]?.role !== 'user') mapped.shift();
  return mapped;
}

/** One rendering for transcript AND token estimation — the budget must
 * measure exactly the strings the model receives. */
export function renderTranscriptText(message: Message): string {
  if (message.sender === 'guest') return renderGuestContent(message);
  if (message.sender === 'human') return `(Front desk) ${message.body ?? `[${message.type}]`}`;
  return message.body ?? `[${message.type}]`;
}

function renderGuestContent(message: Message): string {
  if (message.body !== null) return message.body;
  const location = locationTextOf(message);
  if (location !== null) return `[location] ${location}`;
  const caption = captionOf(message);
  if (caption !== null) return `[${message.type}] ${caption}`;
  return `[${message.type}]`;
}
