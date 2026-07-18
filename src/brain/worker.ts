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
  cancelPendingMarketingRows,
  captureInChatOptIn,
  hasRecentPoststay,
  setMarketingOptOut,
} from '../db/consent.js';
import { getGuestStays, linkStaysByPhone, recordReferenceAttempt } from '../db/stays.js';
import {
  claimConversationTurn,
  findStaleConversations,
  getConversationTurnContext,
  getUnprocessedGuestMessages,
  insertMessage,
  resolveMessageCursor,
} from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { istCalendarDay } from '../lib/time.js';
import { alertOps } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { decideDebounce, type DebounceWindows } from './debounce.js';
import { isWindowOpen } from './draftGuards.js';
import { guestTextOf, isAffirmative } from './inbound.js';
import { escalateToOps, recordPolicyOutcome } from './opsEscalation.js';
import { raiseMediaFrontdeskTask } from '../staff/mediaTask.js';
import { MARKETING_KINDS } from '../lifecycle/templates.js';
import { isRefusal, leadQuoteFromToolRuns, scheduleLeadFollowup } from '../lifecycle/leadFollowup.js';
import { decidePolicy, settlePlanFor, type RateWindow } from './policy.js';
import { detectLang, detectRegister } from './prefDetect.js';
import { PHRASEBOOK } from './prompt.js';
import { deriveStage, needsHuman, projectAll } from './stayView.js';
import { createHitRecorder } from './telemetry.js';
import { runClaudeTurn, type TurnDeps, type TurnLogger } from './turn.js';

export type WorkerLogger = TurnLogger;

/** CH-15 step 6: a "yes" only counts as consent within this window of the
 * post-stay thank-you that asked for it. */
const CONSENT_YES_WINDOW_DAYS = 7;

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
  // CH-11 booking awareness. Link first, then read: a guest is usually mirrored
  // BEFORE they ever message us, so their bookings are found on their first
  // inbound turn. Idempotent (the guest_stays unique), so every turn re-links
  // for free and a new booking is picked up on the guest's next message.
  //
  // WHY here and not in the webhook (§8 CH-11 step 1 says "on any inbound
  // MESSAGE" — recorded deviation): the webhook's storage runs AFTER the 200 ack
  // on a path Meta never redelivers, so a throw there is unrecoverable and would
  // sit upstream of the message insert that the stale-conversation sweeper keys
  // off. Here it is pre-claim (CH-03 D2) — a throw is retried by pg-boss, and the
  // turn is the true unit anyway (a 3-message burst needs one link pass).
  await linkStaysByPhone(deps.db, ctx.conversation.guestId, ctx.guestPhone);

  // ONE read, projected ONCE, fed to BOTH consumers: decidePolicy runs BEFORE
  // the context builder, so the stage cannot travel the other way — and two
  // reads could disagree inside one turn.
  const today = istCalendarDay(ctx.dbNow);
  const stays = projectAll(await getGuestStays(deps.db, ctx.conversation.guestId), today);
  const stayContext = {
    stage: deriveStage(stays, today),
    needsHuman: needsHuman(stays, today),
  };

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
        stays,
        // §6.4: a reference claim is corroborated against the GUEST'S OWN words,
        // never a model-supplied argument (block [5] shows the model the
        // attacker-chosen WhatsApp profile name).
        guestText: msgs
          .map((m) => guestTextOf(m))
          .filter((t): t is string => t !== null)
          .join('\n'),
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
        // create_staff_task's retry key (CH-13a) — the OLDEST, and the two are
        // NOT interchangeable. Provenance asks "which message did this come
        // from?"; a retry key asks "which REQUEST is this?" — and only the
        // second must survive the batch changing under a retry. It can: the
        // tool loop runs BEFORE the claim, so a throw there leaves the cursor
        // unmoved and pg-boss re-runs this function; if the guest typed again
        // meanwhile, decideDebounce requeues and the eventual batch has a NEW
        // newest. `oldest` is pinned by the unmoved cursor, so it is the same
        // in both attempts. Keyed on `newest`, attempt 2 computed a different
        // key, sailed through GATE 0 and raised a SECOND card.
        oldestGuestMsgId: oldest.id,
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
    // CH-15 step 3: a marketing STOP opts the guest out and cancels every pending
    // marketing row — ATOMIC with the confirmation line below, so a rollback
    // undoes both and never leaves "you're unsubscribed" sent without the
    // opt-out. FLAG-driven, so it fires even under COOL_OFF/HUMAN_ACTIVE where the
    // MARKETING_STOP directive never wins (compliance is not gated on a human).
    // The marketing FAMILY is enumerated from the template catalog (MARKETING_KINDS),
    // never a hard-coded list — a leak has siblings (CH-13b).
    if (directive.flags.containsStop) {
      await setMarketingOptOut(tx, ctx.conversation.guestId);
      await cancelPendingMarketingRows(tx, ctx.conversation.guestId, MARKETING_KINDS);
    }
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
    if (reason === 'media' && deps.tasks !== undefined) {
      // CH-13b: a captionless-media turn becomes a TRACKED frontdesk task, not a
      // fire-and-forget ops ping (§6.7). ONLY 'media' is re-routed — every other
      // reason (complaint, human_request, leak, booking_undescribable) genuinely
      // pages ops. Fail-closed: an empty roster ⇒ the card lands nowhere ⇒
      // notify_failed + ops alert, the same signal the ping gave. Unwired
      // contexts (deps.tasks undefined) keep the ops-ping fallback below.
      await raiseMediaFrontdeskTask(
        { db: deps.db, assign: deps.tasks.assign, notify: deps.tasks.notify, now: ctx.dbNow },
        {
          conversationId,
          guestId: ctx.conversation.guestId,
          guestFirstName: ctx.guestName ?? null,
          sourceMessageId: newest.id,
        },
      );
    } else if (reason !== null) {
      await escalateToOps(deps, conversationId, reason, directive.guestTextTail, stayContext);
    }
    // CH-11: a booking claim rides its OWN channel. The slot above is
    // single-valued, so a complaint in the same turn would silently swallow it —
    // and a booking a human must see is precisely the event to surface. Fired
    // even when `reason` already escalated.
    if (turn?.securityEscalate != null) {
      await escalateToOps(deps, conversationId, turn.securityEscalate, directive.guestTextTail, stayContext);
    }
    // CH-11: block [5] tells the model "the team is being brought in" for a
    // guest holding an undescribable booking (a live cancellation, a multi-room
    // stay). Nothing else escalates on that path, so the worker MUST — or the
    // model's line is an unbacked promise (pre-push audit BLOCKER). Only when the
    // model actually ran (block [5] is shown to no one otherwise) and no other
    // escalation already covered the turn — one ops ping, deterministic,
    // independent of whether the model used a referral phrase.
    // Suppressed only when THIS booking is already what someone was paged about
    // — never merely because some other reason (a price defer, a complaint) also
    // escalated, which would drop the booking card entirely. The guardrails now
    // pick `booking_undescribable` themselves when they know (stayEscalation), so
    // the two paths agree rather than race.
    const bookingAlreadyPaged =
      reason === 'booking_undescribable' || turn?.securityEscalate === 'booking_undescribable';
    if (turn !== null && stayContext.needsHuman && !bookingAlreadyPaged) {
      await escalateToOps(deps, conversationId, 'booking_undescribable', directive.guestTextTail, stayContext);
    }
    // CH-11: record the reference-claim STRIKE and link audit rows POST-CLAIM
    // (CH-03 D2: the tool leaves no DB side effect a pre-claim retry could
    // double-apply — a double strike would falsely lock out an honest guest).
    // Winning-claim path only.
    if (turn?.strikeReference != null) {
      await recordReferenceAttempt(deps.db, {
        phone: turn.guestPhone,
        claimedReference: turn.strikeReference,
        outcome: 'refused',
      });
    }
    if (turn?.linkedReference != null) {
      await recordReferenceAttempt(deps.db, {
        phone: turn.guestPhone,
        claimedReference: turn.linkedReference,
        outcome: 'linked',
      });
    }
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
    // CH-09 (audit): an ok:true remember_fact run (saved OR duplicate — the
    // fact is on file either way) writes a claimable evidence row so the
    // NEXT turn's truthful "yes, I've noted it" stays licensed (guardrail-2
    // C4 via CONTEXT_KIND_CLAIMS) instead of deferring + pinging ops. Same
    // convention as the escalation row; winning-claim path, best-effort.
    const factOnFile =
      turn !== null &&
      turn.toolRuns.some((run) => run.name === 'remember_fact' && run.result.ok);
    if (factOnFile) {
      try {
        await insertMessage(deps.db, {
          conversationId,
          direction: 'out',
          sender: 'system',
          type: 'text',
          body: 'fact saved',
          status: 'sent',
          raw: { contextKind: 'fact_saved' },
        });
      } catch (error) {
        deps.log.warn(
          { conversationId, err: summarizeError(error) },
          'fact-saved evidence row failed (telemetry only)',
        );
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

    const guestBatchText = msgs
      .map(guestTextOf)
      .filter((t): t is string => t !== null)
      .join('\n');

    // CH-15 step 6: capture in-chat marketing consent. A clear affirmative within
    // 7 days of a post-stay thank-you (the ONLY place we ask "may we write to
    // you?") is a YES. Deterministic and GUARDED (captureInChatOptIn never
    // overrides an opt-out or an existing opt-in). Runs regardless of the model —
    // a store-only/takeover turn still carries the guest's "yes". Best-effort: a
    // missed capture just means no marketing, the safe side.
    try {
      if (isAffirmative(guestBatchText)) {
        const since = new Date(
          ctx.dbNow.getTime() - CONSENT_YES_WINDOW_DAYS * 24 * 3600_000,
        );
        if (await hasRecentPoststay(deps.db, ctx.conversation.guestId, since)) {
          const captured = await captureInChatOptIn(
            deps.db,
            ctx.conversation.guestId,
            ctx.dbNow,
          );
          if (captured) {
            deps.log.info(
              { conversationId, guestId: ctx.conversation.guestId },
              'marketing opt-in captured',
            );
          }
        }
      }
    } catch (error) {
      deps.log.warn({ conversationId, err: summarizeError(error) }, 'consent capture failed');
    }

    // CH-15 step 1: a quote given THIS turn to a guest with no upcoming/active
    // booking (and whose message is not a refusal) earns ONE lead follow-up in 3
    // days. Marketing, so it only SENDS to an opted-in guest (gated at send time)
    // — a fresh enquirer with no opt-in path gets nothing, by design (§8 step 6).
    // Excludes prearrival/inhouse (they already hold a booking — a lead nudge
    // would be wrong) and needsHuman (a broken booking is not a sales lead).
    // Requires the model ran (toolRuns exist only then). Best-effort.
    if (
      turn !== null &&
      stayContext.stage !== 'prearrival' &&
      stayContext.stage !== 'inhouse' &&
      !stayContext.needsHuman &&
      !isRefusal(guestBatchText)
    ) {
      const quote = leadQuoteFromToolRuns(turn.toolRuns);
      if (quote !== null) {
        try {
          const outcome = await scheduleLeadFollowup(
            { db: deps.db, now: ctx.dbNow },
            { guestId: ctx.conversation.guestId, quote },
          );
          deps.log.info(
            { conversationId, guestId: ctx.conversation.guestId, outcome },
            'lead follow-up',
          );
        } catch (error) {
          deps.log.warn(
            { conversationId, err: summarizeError(error) },
            'lead follow-up scheduling failed',
          );
        }
      }
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
