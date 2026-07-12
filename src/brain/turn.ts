/**
 * The Claude turn (plan.md §6.4 tool loop + §6.5 guardrails, CH-05). Extracted
 * from worker.ts so the worker stays focused on the debounce/claim/dispatch
 * skeleton and both files stay under ~300 lines. `runClaudeTurn` is ALL fallible
 * think-work and is called BEFORE the claim (CH-03 D2): any throw here is
 * retry-safe (pg-boss retry / sweeper), leaving no reply and no claim (§6.6).
 *
 * The loop: build system + transcript + tool specs → converse → if the model
 * asked for tools, run them and feed the results back (≤5 rounds) → else take
 * the prose. Every ₹ in the final draft is then re-validated by the guardrails;
 * an unbacked price is regenerated once, then deferred — never sent.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Db } from '../db/client.js';
import type { Conversation } from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { ConverseFn } from './claude.js';
import { buildTurnContext, type TranscriptOverflow } from './contextBuilder.js';
import { recordUsage } from './cost.js';
import { runGuardrails } from './guardrails.js';
import type { LoadedKnowledge } from './knowledge.js';
import type { EscalationReason } from './policy.js';
import { PHRASEBOOK, type SystemBlock } from './prompt.js';
import { createHitRecorder } from './telemetry.js';
import type { DegradedTracker } from './tools/degraded.js';
import type { ToolContext, ToolRegistry, ToolRun } from './tools/registry.js';
import type { WebsiteClient } from './tools/websiteApi.js';

// §6.4 max 5 rounds per loop. A guardrail-1 violation regenerates once, which
// runs a SECOND loop — so a turn can be up to two loops. TURN_TOTAL_DEADLINE_MS
// caps BOTH loops together (threaded via LoopArgs.deadlineAt) so the whole turn
// stays well under the 180s pg-boss expire (earliest detection ≈195s), closing
// the D2 re-insertion hazard by margin, not only by the claim guard. Each loop
// also has its own 100s ceiling; the effective budget is min(the two). Per-call
// deadline is the smaller of a 30s ceiling and the remaining turn budget.
const MAX_TOOL_ROUNDS = 5;
const PER_CALL_CEILING_MS = 30_000;
const LOOP_TOTAL_DEADLINE_MS = 100_000;
const TURN_TOTAL_DEADLINE_MS = 150_000;
const MIN_CALL_FLOOR_MS = 3_000;

export interface TurnLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

/** Everything the Claude turn needs — a subset of WorkerDeps (worker extends this). */
export interface TurnDeps {
  db: Db;
  log: TurnLogger;
  converse: ConverseFn;
  toolRegistry: ToolRegistry;
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: DegradedTracker;
  /** Block [3] + the guardrail-1 fee whitelist, injected at boot (CH-08 —
   * closes the CH-06 loadKnowledge()-singleton residual; tests inject fakes). */
  knowledge: LoadedKnowledge;
  nightStart: string;
  nightEnd: string;
}

export interface TurnResult {
  text: string;
  toolRuns: ToolRun[];
  /** Non-null when the guardrails require an escalation this turn: a deferred
   * price/promise, or a team-referral that must be MADE true (CH-07). */
  escalate: EscalationReason | null;
  /** What the transcript window could not show (CH-08) — the worker applies
   * the hysteresis threshold and enqueues an on-demand summarise. */
  overflow: TranscriptOverflow;
}

type TurnMessage = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] };

/** Per-turn identity/context — grows with CH-07's policy + guardrail inputs. */
export interface TurnArgs {
  conversation: Conversation;
  dbNow: Date;
  conversationId: string;
  /** The guest's E.164 — telemetry scrub key + leak-scan self-exemption. */
  guestPhone: string;
  /** Block [5]-lite (CH-08): guest-typed name; prompt.ts sanitises. */
  guestName?: string | null;
  /** §6.7 complaint flow: rendered into block [6] (worker sets it). */
  mustEscalate?: boolean;
  /** The batch carried media the model cannot view (mixed-batch note). */
  unviewableMedia?: boolean;
  /** Guardrail-2 evidence window (§6.5 #2 "since the guest's previous
   * message") — the claim cursor's created_at::text, µs-exact (CH-08: was a
   * JS Date; the dedicated evidence query compares in SQL now). null/absent
   * means no previous message, so every claimable system row counts. */
  evidenceSinceIso?: string | null;
  /** The newest batch message's time — the 24h-window operand. WHY not the
   * conversation column: it is refreshed inside the claim, so pre-claim it
   * describes the PREVIOUS turn and a returning guest would read as closed
   * (review finding — the old buildSituation had this staleness bug). */
  newestGuestMsgAt: Date;
  /** Guardrail 5 trigger from the policy pass (CH-07 step 3). */
  botQuestion?: boolean;
}

/**
 * Builds the prompt + transcript and runs the tool loop, then the guardrail
 * pipeline. Returns the final reply text + the tool-run audit + whether the
 * turn must escalate (price could not be validated).
 */
export async function runClaudeTurn(deps: TurnDeps, args: TurnArgs): Promise<TurnResult> {
  const { dbNow, conversationId } = args;
  // Everything the model SEES is contextBuilder's job (CH-08 extraction):
  // windowed transcript, summary/guest blocks, guardrail-2 evidence, [6].
  const { system, baseMessages, systemEvidence, isNight, overflow } = await buildTurnContext(
    deps,
    {
      conversation: args.conversation,
      dbNow,
      conversationId,
      guestName: args.guestName ?? null,
      evidenceSinceIso: args.evidenceSinceIso ?? null,
      newestGuestMsgAt: args.newestGuestMsgAt,
      mustEscalate: args.mustEscalate ?? false,
      unviewableMedia: args.unviewableMedia ?? false,
    },
  );
  const tools = deps.toolRegistry.specs();
  const toolCtx: ToolContext = {
    website: deps.website,
    websiteBaseUrl: deps.websiteBaseUrl,
    degraded: deps.degraded,
    log: deps.log,
  };

  // ONE wall-clock budget for the whole turn (first loop + any regenerate loop)
  // so the two-loop path can never outlive the pg-boss expire (D2).
  const deadlineAt = Date.now() + TURN_TOTAL_DEADLINE_MS;
  const first = await runToolLoop(deps, {
    system,
    tools,
    messages: baseMessages,
    toolCtx,
    dbNow,
    conversationId,
    deadlineAt,
  });

  const outcome = await runGuardrails(
    { draft: first.draft, toolRuns: first.toolRuns },
    {
      // Regenerate once with a corrective system block appended (§6.5) — a fresh
      // loop over the SAME transcript so the model can call tools again, but on
      // the SAME turn deadline (near-exhausted → it force-proses immediately).
      regenerate: async (nudge) => {
        const nudged: SystemBlock[] = [...system, { type: 'text', text: `[CORRECTION]\n${nudge}` }];
        const again = await runToolLoop(deps, {
          system: nudged,
          tools,
          messages: baseMessages,
          toolCtx,
          dbNow,
          conversationId,
          deadlineAt,
        });
        return { draft: again.draft, toolRuns: again.toolRuns };
      },
      log: deps.log,
      // §6.5 guardrail-1 exemption: the ₹ fees published in kb/policies.md, each
      // bound to its own fee context — so "an extra adult is ₹1,500" may be sent
      // without a tool call, while "Villa B3 is ₹1,500 per night" still cannot.
      whitelist: deps.knowledge.whitelist,
      // CH-07 step 4: every hit persists to raw_events for the weekly review.
      record: createHitRecorder(deps.db, deps.log, {
        conversationId,
        guestPhone: args.guestPhone,
      }),
      // Guardrail 2 (CH-07): evidence + the §6.7 must-escalate assertion.
      systemEvidence,
      mustEscalate: args.mustEscalate ?? false,
      // Guardrail 5 (CH-07): the policy pass's inbound bot-question flag.
      botQuestion: args.botQuestion ?? false,
      // Guardrail 7 (CH-07): self-exemption + the after-hours substitution.
      guestPhone: args.guestPhone,
      isNight,
    },
  );

  return {
    text: outcome.text,
    toolRuns: outcome.toolRuns,
    escalate: outcome.escalate,
    overflow,
  };
}

interface LoopArgs {
  system: SystemBlock[];
  tools: ReturnType<ToolRegistry['specs']>;
  messages: TurnMessage[];
  toolCtx: ToolContext;
  dbNow: Date;
  conversationId: string;
  /** Shared per-TURN wall-clock deadline (epoch ms) — caps first + regen loops. */
  deadlineAt: number;
}

/**
 * One bounded tool loop (≤5 rounds). A converse throw is alerted then rethrown
 * (pre-claim — the sweeper recovers, §6.6). The terminal round forces
 * tool_choice:'none' so the model answers in prose from the results it has,
 * rather than looping forever or returning an empty tool_use turn.
 */
async function runToolLoop(
  deps: TurnDeps,
  args: LoopArgs,
): Promise<{ draft: string; toolRuns: ToolRun[] }> {
  const messages = [...args.messages];
  const toolRuns: ToolRun[] = [];
  // The smaller of this loop's own 100s ceiling and the remaining TURN budget,
  // so the first + regenerate loops together stay under TURN_TOTAL_DEADLINE_MS.
  const loopDeadline = Math.min(Date.now() + LOOP_TOTAL_DEADLINE_MS, args.deadlineAt);
  let finalText = '';

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
    const remaining = loopDeadline - Date.now();
    const forceProse = round === MAX_TOOL_ROUNDS || remaining <= MIN_CALL_FLOOR_MS;

    let result;
    try {
      result = await deps.converse({
        system: args.system,
        messages,
        tools: args.tools,
        toolChoice: forceProse ? { type: 'none' } : undefined,
        deadlineMs: Math.min(PER_CALL_CEILING_MS, Math.max(remaining, MIN_CALL_FLOOR_MS)),
      });
    } catch (error) {
      await alertOps(deps.log, {
        kind: 'model_failed',
        summary: 'Anthropic call failed after retries — no reply sent',
        detail: { conversationId: args.conversationId, err: summarizeError(error) },
      });
      throw error; // pre-claim (D2/§6.6): pg-boss retry then the sweeper recover
    }

    await recordUsage(deps, args.dbNow, result.usage);
    // Token counts only (§3.3). cacheRead > 0 from round ≥2 proves the static
    // head caches even with the tool specs now in the prefix (§5.5).
    deps.log.info(
      {
        conversationId: args.conversationId,
        round,
        tools: result.toolUses.length,
        tokens: {
          in: result.usage.inputTokens,
          out: result.usage.outputTokens,
          cacheRead: result.usage.cacheReadTokens,
          cacheWrite: result.usage.cacheWriteTokens,
        },
      },
      'claude turn',
    );

    finalText = result.text;
    if (forceProse || result.toolUses.length === 0) {
      if (forceProse && result.toolUses.length > 0) {
        // Cap hit with the model still wanting tools — worth an ops signal.
        await alertOps(deps.log, {
          kind: 'tool_loop_exhausted',
          summary: 'tool loop hit its round/time cap — answered from results in hand',
          detail: { conversationId: args.conversationId, rounds: round },
        });
      }
      return { draft: nonEmptyOrDeferral(finalText), toolRuns };
    }

    // Append the model's assistant turn verbatim, then answer EVERY tool_use in
    // one user turn (parallel tool_use stays a single round). Every tool_use_id
    // MUST be answered or the next request 400s.
    messages.push({ role: 'assistant', content: result.assistantContent });
    const toolResults: Anthropic.ContentBlockParam[] = [];
    for (const use of result.toolUses) {
      const res = await deps.toolRegistry.run(use.name, use.input, args.toolCtx);
      toolRuns.push({ name: use.name, input: use.input, result: res });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: use.id,
        is_error: !res.ok,
        // Structured DATA, never raw upstream text (injection posture, §3.3).
        content: JSON.stringify(res),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }
  // The final round always forces prose and returns above; this satisfies the
  // type checker and is a safe fallback.
  return { draft: nonEmptyOrDeferral(finalText), toolRuns };
}

/** An empty final draft (max_tokens cutoff, refusal) must never be dispatched. */
function nonEmptyOrDeferral(text: string): string {
  return text.trim() === '' ? PHRASEBOOK.outsideKnowledge : text;
}

