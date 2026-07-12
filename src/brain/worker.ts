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
import { updateGuestPrefs } from '../db/guestMemory.js';
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getUnprocessedGuestMessages,
  resolveMessageCursor,
} from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';
import { isWindowOpen } from './draftGuards.js';
import { guestTextOf } from './inbound.js';
import { escalateToOps, recordPolicyOutcome } from './opsEscalation.js';
import { decidePolicy, settlePlanFor, type RateWindow } from './policy.js';
import { detectLang, detectRegister } from './prefDetect.js';
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
  /** CH-08 on-demand compaction: fired (fire-and-forget) when the transcript
   * window overflowed — token-trimmed, or an uncovered gap ≥ gapMin (the
   * hysteresis that keeps a long thread from buying a model call per turn).
   * Optional: skip-model policy paths and older tests never detect overflow
   * (the nightly pass covers those threads). */
  summarise?: { enqueue: (conversationId: string) => Promise<void>; gapMin: number };
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
        guestName: ctx.guestName,
        registerPref: ctx.registerPref,
        langPref: ctx.langPref,
        mustEscalate: plan.mustEscalate,
        unviewableMedia: directive.flags.hasMedia,
        botQuestion: directive.flags.botQuestion,
        // §6.5 #2 "since the guest's previous message" = the cursor row's
        // created_at::text — µs-exact into the SQL evidence query (CH-08).
        // A DANGLING pointer fails CLOSED (audit): null would license C3 from
        // ALL history; an over-fresh cursor yields empty evidence → unlicensed
        // referrals escalate — at worst a duplicate ops ping, the honest side.
        evidenceSinceIso: dangling
          ? ctx.dbNow.toISOString()
          : cursor === null
            ? null
            : cursor.createdAtIso,
        newestGuestMsgAt: newest.createdAt,
        // remember_fact provenance (CH-09): a fact saved this turn points at
        // the newest batch message.
        newestGuestMsgId: newest.id,
      })
    : null;
  const body = turn !== null ? turn.text : plan.send !== null ? PHRASEBOOK[plan.send] : null;
  // Guardrail 4 (§5.3/§6.5 #4): EVERY guest-bound free-form send — model
  // drafts, phrasebook lines, substitutions — is gated on the 24h window.
  // Practically closed only on sweeper recovery after a >24h outage.
  const windowOpen = isWindowOpen(newest.createdAt, ctx.dbNow);

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
    if (body !== null && announced && windowOpen) {
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
    if (body !== null && announced && !windowOpen) {
      // §5.3: an out-of-window free-form attempt is a bug-class event — never
      // silently sent, never thrown (unfixable condition; a throw would only
      // burn pg-boss retries). The cursor has advanced: the window physically
      // cannot reopen without a new guest message, which starts a fresh turn.
      // Recorded deviation: the guest gets silence until CH-12's template path.
      const record = createHitRecorder(deps.db, deps.log, { conversationId, guestPhone: ctx.guestPhone });
      await record({ kind: 'guardrail', rule: 'window', action: 'blocked', draft: body });
      await alertOps(deps.log, {
        kind: 'window_closed_blocked',
        summary: 'reply blocked: the 24h service window is closed (free-form illegal)',
        detail: { conversationId },
      });
    }
    await recordPolicyOutcome(deps, conversationId, ctx.guestPhone, directive, plan, announced);
    // CH-08 on-demand compaction, winning-claim path only (a losing racer's
    // context is the same — one signal is enough; stately dedupes anyway).
    // Fire-and-forget: memory upkeep must never fail a guest turn. BOTH arms
    // carry a floor (post-build audit): an unfloored trim arm re-compacted a
    // token-bound thread's notes for 1-2 fresh rows on EVERY guest turn —
    // per-turn model spend plus lossy rewrite churn. gapMin/4 lets a
    // persistent trim compact in small batches instead; uncovered rows wait
    // a few turns, covered ones (count 0) never enqueue at all.
    const summarise = deps.summarise;
    if (summarise !== undefined && turn !== null) {
      const trimFloor = Math.max(1, Math.floor(summarise.gapMin / 4));
      const fire =
        (turn.overflow.trimmedByTokens && turn.overflow.uncoveredCount >= trimFloor) ||
        turn.overflow.uncoveredCount >= summarise.gapMin;
      if (fire) {
        try {
          await summarise.enqueue(conversationId);
        } catch (error) {
          deps.log.warn({ conversationId, err: summarizeError(error) }, 'summarise enqueue failed');
        }
      }
    }
    // CH-09 step 4: register/language heuristics on the batch text — write
    // only on a positive signal (latest wins), so a neutral batch never
    // flips a stored pref. Winning-claim path like the summarise hook, and
    // NOT gated on the model running: phrasebook/store-only turns carry
    // guest text too. Fire-and-forget — tone upkeep never fails a turn.
    try {
      const texts = msgs.map(guestTextOf).filter((t): t is string => t !== null);
      const register = detectRegister(texts);
      const lang = detectLang(texts);
      const patch: Parameters<typeof updateGuestPrefs>[2] = {};
      if (register !== null && register !== ctx.registerPref) patch.registerPref = register;
      if (lang !== null && lang !== ctx.langPref) patch.langPref = lang;
      if (patch.registerPref !== undefined || patch.langPref !== undefined) {
        await updateGuestPrefs(deps.db, ctx.conversation.guestId, patch);
        // Ids + enum values only — never the batch text (§3.3).
        deps.log.info(
          { conversationId, guestId: ctx.conversation.guestId, ...patch },
          'guest prefs updated',
        );
      }
    } catch (error) {
      deps.log.warn({ conversationId, err: summarizeError(error) }, 'pref detection failed');
    }
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
