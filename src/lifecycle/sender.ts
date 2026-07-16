/**
 * The minutely lifecycle sender (CH-12, plan §8 step 4 + §2.3).
 *
 * A scheduled row is an INTENTION, recorded possibly months ago. The world has
 * had all that time to change, so the sender re-reads the mirror, the gates and
 * the guest before every single send. The rule of the house: the MIRROR is the
 * truth, the schedule is only a plan (§3.4).
 *
 * ── TRANSIENT vs TERMINAL ────────────────────────────────────────────────────
 * The single most important distinction in this file, and the one an adversarial
 * review caught it getting wrong. `pending` IS the retry state — the claim guard
 * already makes a re-run safe, which is the whole point of the pattern. So:
 *
 *   TRANSIENT (Meta busy, a DB wobble, the window still shut, a human holding
 *   the thread) → LEAVE IT PENDING, backed off. The next tick is a free retry.
 *
 *   TERMINAL (the booking is cancelled, the guest is gone, the params are
 *   invalid, the message is too old to be true any more) → resolve it, with a
 *   reason a human can read.
 *
 * Treating "the database hiccuped" the same as "this guest must not be messaged"
 * destroyed the confirmation for ever, because a resolved row can never be
 * rescheduled (the scheduler's upsert only touches `pending` rows). A transient
 * fault must never be able to silently cancel a guest's welcome.
 *
 * ── ATOMICITY (§3.4's send-intent pattern) ───────────────────────────────────
 * ONE transaction claims the scheduled row (pending → sent, guarded by
 * `WHERE status='pending'`) AND writes the message row as 'queued', and it
 * commits BEFORE the Graph call. Two senders racing: the WHERE makes exactly one
 * of them the winner. A crash after the commit: the message row sits 'queued'
 * and CH-17's stale-queued sweep reconciles it — it is never blindly re-sent.
 */
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { insertCostEvents } from '../db/repos.js';
import { conversations, guests, scheduledMessages } from '../db/schema.js';
import { istCalendarDay, nowIST } from '../lib/time.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import type { GateContext } from './gates.js';
import {
  blockedBy,
  defer,
  resolve,
  retryAfterFailedSend,
  type Outcome,
  type ScheduledRow,
} from './sendGuards.js';

export interface SenderLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface SenderDeps {
  db: Db;
  log: SenderLogger;
  wa: Pick<WaClient, 'planTemplatedSend' | 'dispatchTemplated' | 'createSendIntent'>;
  /** The same gates the scheduler used — sources re-applied at send time (a
   * booking can be re-sourced between schedule and send), and today for the
   * stay-over backstop. */
  gates: Pick<GateContext, 'sources' | 'today'>;
  /** LIFECYCLE_SEND_ENABLED. Off ⇒ rows accrue as 'pending' and NOTHING is sent.
   * Merging this chunk to main must not, by itself, start messaging people. */
  enabled: boolean;
  batchSize?: number;
  /** Test seam: the one clock blockedBy judges staleness and quiet hours by. */
  now?: () => Date;
}

export interface SenderResult {
  attempted: number;
  sent: number;
  /** Resolved as not-to-be-sent: cancelled booking, no consent, too old. */
  skipped: number;
  /** Left pending on purpose — the next tick retries. */
  deferred: number;
  failed: number;
}


/** One tick: send everything due. Never throws — a bad row must not wedge the cron. */
export async function runSender(deps: SenderDeps): Promise<SenderResult> {
  const result: SenderResult = { attempted: 0, sent: 0, skipped: 0, deferred: 0, failed: 0 };
  if (!deps.enabled) {
    deps.log.info({}, '[lifecycle] sender disabled (LIFECYCLE_SEND_ENABLED=0) — nothing sent');
    return result;
  }

  // Due = pending, its planned time has come, and it is not currently backed off.
  // deferred_until is the backoff clock; send_at is the immutable planned time
  // (so an excluded deferred row keeps its true age for the stale guard).
  const now = new Date();
  const due = await deps.db
    .select()
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.status, 'pending'),
        lte(scheduledMessages.sendAt, now),
        or(isNull(scheduledMessages.deferredUntil), lte(scheduledMessages.deferredUntil, now)),
      ),
    )
    .orderBy(scheduledMessages.sendAt)
    .limit(deps.batchSize ?? 10);

  for (const row of due) {
    result.attempted += 1;
    try {
      result[await sendOne(deps, row)] += 1;
    } catch (error) {
      // A DB wobble is NOT a decision that this guest must not be messaged.
      // Leave it pending; the next tick is a free retry.
      result.deferred += 1;
      deps.log.error(
        { scheduledId: row.id, kind: row.kind },
        `[lifecycle] send threw — deferred, not lost: ${String(error)}`,
      );
      await defer(deps.db, row, 'transient_error').catch(() => undefined);
    }
  }

  if (result.attempted > 0) deps.log.info({ ...result }, '[lifecycle] sender tick');
  return result;
}

async function sendOne(deps: SenderDeps, row: ScheduledRow): Promise<Outcome> {
  const blocked = await blockedBy(deps, row);
  if (blocked !== null) {
    if (blocked.outcome === 'deferred') {
      await defer(deps.db, row, blocked.reason);
      deps.log.info({ scheduledId: row.id, reason: blocked.reason }, '[lifecycle] send deferred');
      return 'deferred';
    }
    await resolve(deps.db, row, 'skipped', blocked.reason);
    deps.log.info({ scheduledId: row.id, reason: blocked.reason }, '[lifecycle] send skipped');
    return 'skipped';
  }

  const [guest] = await deps.db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) {
    await resolve(deps.db, row, 'skipped', 'guest_missing');
    return 'skipped';
  }

  // The send lands IN the guest's conversation, so the thread reads as one story
  // and their reply flows through the normal pipeline (plan CH-12 step 5). A
  // NULL conversation_id would mean "staff/ops send" per §4 — the message would
  // vanish from the guest's own thread — so a missing conversation is a defer,
  // never a silent send into the void.
  const [conversation] = await deps.db
    .select()
    .from(conversations)
    .where(eq(conversations.guestId, guest.id))
    .limit(1);
  if (conversation === undefined) {
    await defer(deps.db, row, 'conversation_missing');
    return 'deferred';
  }

  // A human has taken this thread over (CH-14's echo pause). The architecture's
  // rule is "human replies pause the AI" — and CH-12 is the one chunk that
  // speaks first, so it is the one that most needs to honour it. Wait.
  const humanActive =
    conversation.humanActiveUntil !== null && conversation.humanActiveUntil.getTime() > Date.now();
  if (humanActive || conversation.status === 'human_active') {
    await defer(deps.db, row, 'human_active');
    deps.log.info({ scheduledId: row.id }, '[lifecycle] deferred — a human holds the thread');
    return 'deferred';
  }

  const planned = await deps.wa.planTemplatedSend(
    guest.phone,
    { key: row.kind, params: row.params as Record<string, string> },
    { conversationId: conversation.id, sender: 'ai' },
  );
  if (!planned.ok) {
    // The window is shut and we have no approved template yet (dev). Not a
    // failure and not a decision — just not yet. Back off and try again; the
    // moment the guest writes to us, the window opens and it goes.
    if (planned.error === 'WINDOW_CLOSED_SIMULATED') {
      await defer(deps.db, row, 'window_closed');
      return 'deferred';
    }
    // Params Meta would reject: a real, terminal defect in our own data.
    await resolve(deps.db, row, 'failed', planned.error);
    await alertOps(deps.log, {
      kind: 'lifecycle_send_failed',
      summary: 'A lifecycle message could not be prepared',
      detail: { scheduledId: row.id, kind: row.kind, reason: planned.error.slice(0, 60) },
    });
    return 'failed';
  }

  // ── the claim + intent, in ONE transaction, committed BEFORE Graph ────────
  // The message row is written through the client's own createSendIntent (CH-02
  // decision D2: EVERY outbound goes through wa/client.ts) rather than a second
  // hand-rolled INSERT that would drift from it.
  const messageId = await deps.db.transaction(async (tx) => {
    const claimed = await tx
      .update(scheduledMessages)
      .set({ status: 'sent' })
      .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')))
      .returning({ id: scheduledMessages.id });
    if (claimed.length === 0) return null; // another sender won the race

    const message = await deps.wa.createSendIntent(
      tx,
      planned.body,
      { conversationId: conversation.id, sender: 'ai' },
      planned.intentExtra,
    );
    await tx
      .update(scheduledMessages)
      .set({ sentMessageId: message.id })
      .where(eq(scheduledMessages.id, row.id));
    return message.id;
  });

  if (messageId === null) {
    deps.log.info({ scheduledId: row.id }, '[lifecycle] row already claimed — not re-sent');
    return 'skipped';
  }

  const sendResult = await deps.wa.dispatchTemplated(
    { messageId, toE164: guest.phone, body: planned.body, conversationId: conversation.id },
    planned,
  );

  if (!sendResult.ok) {
    // TRANSIENT vs TERMINAL, on the POST-Graph path (the BLOCKER the review
    // found). A 429 rate-limit, a 5xx, or a network error means Meta did NOT
    // deliver — so re-arm the claimed row for another attempt rather than burn
    // the message for ever. Only a permanent failure (a rejected template param,
    // a 2xx with no id) resolves terminally. The message row already carries the
    // failure as the audit of the attempt.
    if (sendResult.retryable) {
      await retryAfterFailedSend(deps.db, row, `retry:${sendResult.error.slice(0, 80)}`);
      await alertOps(deps.log, {
        kind: 'lifecycle_send_deferred',
        summary: 'A lifecycle message hit a transient send failure — will retry',
        detail: { scheduledId: row.id, kind: row.kind, messageId },
      });
      return 'deferred';
    }
    await deps.db
      .update(scheduledMessages)
      .set({ status: 'failed', skipReason: sendResult.error.slice(0, 100) })
      .where(eq(scheduledMessages.id, row.id));
    await alertOps(deps.log, {
      kind: 'lifecycle_send_failed',
      summary: 'A lifecycle message failed to send permanently',
      detail: { scheduledId: row.id, kind: row.kind, messageId },
    });
    return 'failed';
  }

  // §5.3/§4: a real template send is billable — meter it. A free-form send inside
  // an open window is not, and must not be counted as one.
  if (planned.asTemplate) {
    await insertCostEvents(deps.db, [
      { day: istCalendarDay(nowIST()), kind: 'wa_template', quantity: '1', inrEstimate: '0' },
    ]);
  }

  deps.log.info(
    { scheduledId: row.id, kind: row.kind, usedTemplate: planned.asTemplate },
    '[lifecycle] sent',
  );
  return 'sent';
}
