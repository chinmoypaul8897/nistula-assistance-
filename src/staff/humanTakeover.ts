/**
 * Human takeover — the shared core behind both entry points (CH-14a step 2,
 * §2.2 step 6). A human replying in the guest's thread silences the AI for a
 * TTL. Prod delivers this as an `smb_message_echoes` webhook (wa/webhook.ts);
 * dev as `POST /admin/simulate-human-reply` (ops/admin.ts). Both funnel here so
 * the effect is identical and there is one place to get it right.
 *
 * What a takeover does, in order:
 *  1. Store the human's message (if the caller has one) as an OUTBOUND
 *     `sender:'human'` row — deduped on `wa_message_id` so a Meta redelivery is
 *     a no-op. When the AI later resumes it sees what the human said.
 *  2. Set `human_active_until = now + 2h` (NOT the status — the TTL branch of
 *     policy.isHumanActive holds regardless, and clobbering status would drop a
 *     live cool-off). decidePolicy then routes HUMAN_ACTIVE → store-only.
 *  3. Cancel any pending debounce job — best-effort. The REAL guarantee is that
 *     even if it fires, HUMAN_ACTIVE makes the worker store-only and reply
 *     nothing; this just avoids a wasted wake.
 *  4. Cancel the conversation's open escalation/night-queue tasks: a human ON
 *     the thread IS the resolution of "get a human on this thread", so the SLA
 *     ladder must stop (scenario 4 — the takeover cancels the pending re-ping).
 */
import { cancelLiveEscalationsForConversation } from '../db/tasks.js';
import type { Db } from '../db/client.js';
import { insertMessage, setHumanActiveUntil } from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import type { AlertLogger } from '../ops/alerts.js';

/** §2.2 step 6: a human reply pauses the AI for two hours. */
export const HUMAN_ACTIVE_TTL_MS = 2 * 60 * 60 * 1000;

export interface HumanTakeoverDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  /** Injected — one clock per action (the CH-12 lesson). */
  now: () => Date;
  /** Cancels a queued (not-yet-run) debounce job for the conversation. Injected
   * so this module does not depend on pg-boss; the wiring lives in jobs/index.ts.
   * Best-effort — the HUMAN_ACTIVE store-only path is the real backstop. */
  cancelPending: (conversationId: string) => Promise<void>;
}

export interface HumanTakeoverInput {
  conversationId: string;
  /** The human's message to store. Absent on pure state-change callers. */
  echo?: {
    /** Meta message id, for dedupe; absent on the dev sim (synthetic). */
    waMessageId?: string;
    body: string | null;
    /** Raw payload kept for audit; a small marker when synthesised. */
    raw?: unknown;
  };
}

export async function applyHumanTakeover(
  deps: HumanTakeoverDeps,
  input: HumanTakeoverInput,
): Promise<void> {
  const now = deps.now();

  if (input.echo !== undefined) {
    // A staff reply to the guest is OUTBOUND from our system, authored by a
    // human. Deduped on wa_message_id (Meta redelivers) when present.
    await insertMessage(deps.db, {
      conversationId: input.conversationId,
      waMessageId: input.echo.waMessageId ?? null,
      direction: 'out',
      sender: 'human',
      type: 'text',
      body: input.echo.body,
      status: 'sent',
      raw: input.echo.raw ?? { contextKind: 'human_echo' },
    });
  }

  await setHumanActiveUntil(deps.db, input.conversationId, new Date(now.getTime() + HUMAN_ACTIVE_TTL_MS));

  try {
    await deps.cancelPending(input.conversationId);
  } catch (error) {
    // Never fatal: HUMAN_ACTIVE store-only already stops any reply.
    deps.log.info?.(
      { conversationId: input.conversationId, err: summarizeError(error) },
      'cancelPending failed on takeover — HUMAN_ACTIVE store-only still holds',
    );
  }

  const cancelled = await cancelLiveEscalationsForConversation(deps.db, input.conversationId);
  deps.log.info?.(
    { conversationId: input.conversationId, escalationsCancelled: cancelled.length },
    'human takeover applied — AI paused, escalations cleared',
  );
}
