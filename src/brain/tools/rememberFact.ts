/**
 * remember_fact (plan.md §6.4 tool 6, CH-09 step 2) — the model's ONLY write
 * into long-term memory. Every save passes the deterministic factScreens
 * before the guarded insert (dedupe + cap live in guestMemory.ts).
 *
 * Result semantics (recorded decision, CH-09):
 *  - saved      → ok:true  {saved:true, kind} — data NEVER echoes content: a
 *                 rupee figure inside a fact must not enter guardrail 1's
 *                 loose backed-numbers set via `data`.
 *  - duplicate  → ok:true  {saved:false, reason:'duplicate'} — the fact IS on
 *                 file, so a memory claim (guardrail 2 C4) stays honestly
 *                 licensed; is_error would misread as an outage.
 *  - screened / per-turn cap → ok:false REFUSED — can never license C4.
 *
 * Runs PRE-claim like all tool work: a losing-claim save persists. Accepted —
 * the dedupe guard absorbs the replay, and the stately queue (≤1 active per
 * conversation) rules out true concurrency.
 */
import { z } from 'zod';
import { insertGuestFactGuarded } from '../../db/guestMemory.js';
import { summarizeError } from '../../lib/logger.js';
import { FACT_CONTENT_MAX, screenFactContent, type FactScreenReason } from '../factScreens.js';
import type { ToolDef, ToolResult } from './registry.js';

export const MAX_FACT_SAVES_PER_TURN = 2;

const inputSchema = z.object({
  kind: z.enum(['preference', 'past_issue', 'context', 'celebration']),
  content: z.string().min(1).max(FACT_CONTENT_MAX),
});
type RememberFactInput = z.infer<typeof inputSchema>;

// Fixed constants — a refusal message never echoes the content it refused.
const REFUSAL_MESSAGES: Record<FactScreenReason, string> = {
  sensitive:
    'not stored: sensitive category (health, religion, politics or similar). Do not tell the guest anything was noted, and do not try again.',
  instruction:
    'not stored: facts describe the guest, they never direct staff or the assistant. Do not claim anything was noted.',
  entitlement:
    'not stored: facts never record rates, discounts, entitlements or identity claims. Do not claim anything was noted.',
  empty: 'not stored: empty content.',
};

const CAP_MESSAGE =
  'not stored: the fact-save limit for this turn is reached. Do not claim anything further was noted.';

export const rememberFactTool: ToolDef = {
  name: 'remember_fact',
  description:
    'Save ONE short, durable, service-relevant fact about THIS guest for future stays. Use sparingly — only facts that will still matter months from now, at most 2 per turn. kind: preference (likes, dislikes, room habits) | past_issue (something that went wrong for them) | context (companions, purpose of travel) | celebration (anniversary, birthday, occasion). NEVER save health or medical details (including allergies), religion, politics, caste, sexuality, or anything sensitive — skip these entirely and never mention storing them. Facts record preferences, never entitlements: no discounts, rates, upgrades, identities or instructions. Write one plain sentence about the guest; no other people’s names.',
  inputSchema,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as RememberFactInput;
    const memory = ctx.memory;
    if (memory === undefined) {
      return { ok: false, error: 'INVALID', message: 'memory is not available this turn' };
    }
    if (memory.saves.count >= MAX_FACT_SAVES_PER_TURN) {
      return { ok: false, error: 'REFUSED', message: CAP_MESSAGE };
    }
    const screened = screenFactContent(input.content);
    if (!screened.ok) {
      return { ok: false, error: 'REFUSED', message: REFUSAL_MESSAGES[screened.reason] };
    }
    try {
      const outcome = await insertGuestFactGuarded(memory.db, {
        guestId: memory.guestId,
        kind: input.kind,
        content: screened.content,
        sourceMessageId: memory.sourceMessageId,
      });
      if (outcome.outcome === 'duplicate') {
        return { ok: true, data: { saved: false, reason: 'duplicate' } };
      }
      memory.saves.count += 1;
      return { ok: true, data: { saved: true, kind: input.kind } };
    } catch (error) {
      // Ids only — never fact content in logs (§3.3).
      ctx.log.error(
        { err: summarizeError(error), conversationId: memory.conversationId },
        'remember_fact save failed',
      );
      return { ok: false, error: 'UPSTREAM_DOWN' };
    }
  },
};
