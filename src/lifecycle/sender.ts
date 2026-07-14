/**
 * The minutely lifecycle sender (CH-12, plan §8 step 4 + §2.3).
 *
 * A scheduled row is an INTENTION, recorded possibly months ago. The world has
 * had all that time to change, so the sender re-reads the mirror and the guest
 * before every single send. The rule of the house: the MIRROR is the truth, the
 * schedule is only a plan (§3.4). A booking cancelled by a route that never
 * emitted an event is still caught here — which is the point.
 *
 * ATOMICITY (§3.4's send-intent pattern, the shape CH-03's worker proved):
 *   ONE transaction claims the scheduled row (pending → sent, guarded by
 *   `WHERE status='pending'`) AND writes the message row as 'queued'. It commits
 *   BEFORE the Graph call. So:
 *     - two senders racing: the WHERE makes exactly one of them the winner;
 *     - a crash after the commit: the message row sits 'queued' and CH-17's
 *       stale-queued sweep reconciles it — it is never blindly re-sent.
 *   The alternative (claim, then send) would lose a message on a crash; the
 *   other alternative (send, then claim) would double-send one. Neither is
 *   acceptable when the recipient is a real guest.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { insertCostEvents } from '../db/repos.js';
import { bookingsMirror, conversations, guests, messages, scheduledMessages } from '../db/schema.js';
import { istCalendarDay, nowIST } from '../lib/time.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { passesStatus } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

/** §2.3: "fewer than 2 win-backs sent in the trailing 365 days". */
const WINBACK_CAP = 2;
const WINBACK_WINDOW_DAYS = 365;

export interface SenderLogger extends AlertLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface SenderDeps {
  db: Db;
  log: SenderLogger;
  wa: Pick<WaClient, 'planTemplatedSend' | 'dispatchTemplated'>;
  /** LIFECYCLE_SEND_ENABLED. Off ⇒ rows accumulate as 'pending' and NOTHING is
   * sent. Merging this chunk to main must not, by itself, start messaging
   * people — the flag is the human's hand on the switch. */
  enabled: boolean;
  batchSize?: number;
}

export interface SenderResult {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}

type ScheduledRow = typeof scheduledMessages.$inferSelect;

/** Marketing may only go to a guest who asked for it (§4, CH-15's consent). */
async function marketingAllowed(
  db: Db,
  row: ScheduledRow,
  kind: ScheduledKind,
): Promise<string | null> {
  if (LIFECYCLE_TEMPLATES[kind].category !== 'marketing') return null;

  const [guest] = await db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) return 'guest_missing';
  // WHY this is checked HERE and not when the row was scheduled: consent is
  // captured by CH-15's post-stay thank-you, which goes out ~74 days AFTER the
  // booking was scheduled. Gating at schedule time would mean marketing_opt_in
  // is always false at that moment, and the win-back could never fire for
  // anyone, ever. The row is planned optimistically; the consent is checked at
  // the last possible instant, which is also the only honest one.
  if (!guest.marketingOptIn) return 'no_marketing_opt_in';

  if (kind === 'winback') {
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.guestId, row.guestId),
          eq(scheduledMessages.kind, 'winback'),
          eq(scheduledMessages.status, 'sent'),
          gte(scheduledMessages.updatedAt, sql`now() - interval '${sql.raw(String(WINBACK_WINDOW_DAYS))} days'`),
        ),
      );
    if (count >= WINBACK_CAP) return 'winback_cap_reached';
  }
  return null;
}

/** The booking must still be a booking. */
async function bookingBlocks(db: Db, row: ScheduledRow): Promise<string | null> {
  if (row.bookingId === null) return null; // CH-15's lead follow-up has no booking
  const [booking] = await db
    .select()
    .from(bookingsMirror)
    .where(eq(bookingsMirror.id, row.bookingId));
  if (booking === undefined) return 'booking_missing';
  // NOTE what is deliberately NOT re-checked here: the DATE gate. check_in is in
  // the past by the time a thank-you or win-back is due — that is the entire
  // point of them. The date gate is a SCHEDULING gate; re-applying it at send
  // time would silently kill every post-stay message. Status is the thing that
  // can still change under us, and status is what we re-check.
  if (!passesStatus(booking)) return `booking_${booking.status}`;
  return null;
}

async function skip(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status: 'skipped', skipReason: reason })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/** One tick: send everything due. Never throws — a bad row must not wedge the cron. */
export async function runSender(deps: SenderDeps): Promise<SenderResult> {
  const result: SenderResult = { attempted: 0, sent: 0, skipped: 0, failed: 0 };
  if (!deps.enabled) {
    deps.log.info({}, '[lifecycle] sender disabled (LIFECYCLE_SEND_ENABLED=0) — nothing sent');
    return result;
  }

  const due = await deps.db
    .select()
    .from(scheduledMessages)
    .where(and(eq(scheduledMessages.status, 'pending'), sql`${scheduledMessages.sendAt} <= now()`))
    .orderBy(scheduledMessages.sendAt)
    .limit(deps.batchSize ?? 25);

  for (const row of due) {
    result.attempted += 1;
    try {
      const outcome = await sendOne(deps, row);
      result[outcome] += 1;
    } catch (error) {
      // A single poisoned row may never stop the queue moving.
      result.failed += 1;
      deps.log.error(
        { scheduledId: row.id, kind: row.kind },
        `[lifecycle] send threw: ${String(error)}`,
      );
      await skip(deps.db, row, 'error').catch(() => undefined);
    }
  }

  if (result.attempted > 0) deps.log.info({ ...result }, '[lifecycle] sender tick');
  return result;
}

async function sendOne(deps: SenderDeps, row: ScheduledRow): Promise<'sent' | 'skipped' | 'failed'> {
  const kind = row.kind;

  const blocked = (await bookingBlocks(deps.db, row)) ?? (await marketingAllowed(deps.db, row, kind));
  if (blocked !== null) {
    await skip(deps.db, row, blocked);
    deps.log.info({ scheduledId: row.id, kind, reason: blocked }, '[lifecycle] send skipped');
    return 'skipped';
  }

  const [guest] = await deps.db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) {
    await skip(deps.db, row, 'guest_missing');
    return 'skipped';
  }
  // The guest has a conversation (the scheduler creates one), and the send must
  // land IN it — so the thread reads as one story and the guest's reply flows
  // through the normal pipeline (plan CH-12 step 5).
  const [conversation] = await deps.db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.guestId, guest.id));

  const planned = await deps.wa.planTemplatedSend(
    guest.phone,
    { key: kind, params: row.params as Record<string, string> },
    { conversationId: conversation?.id ?? null, sender: 'ai' },
  );
  if (!planned.ok) {
    // A closed window with simulated templates is the expected dev outcome — it
    // is left PENDING, not failed: the moment the guest writes to us the window
    // opens and the next tick delivers it. Marking it failed would throw away a
    // message that is still perfectly deliverable.
    if (planned.error === 'WINDOW_CLOSED_SIMULATED') {
      deps.log.warn({ scheduledId: row.id, kind }, '[lifecycle] deferred — window shut, no templates');
      return 'skipped';
    }
    await skip(deps.db, row, planned.error.slice(0, 100));
    return 'failed';
  }

  // ── the claim + intent, in ONE transaction, committed BEFORE Graph ────────
  let messageId: string | null = null;
  await deps.db.transaction(async (tx) => {
    const claimed = await tx
      .update(scheduledMessages)
      .set({ status: 'sent' })
      .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')))
      .returning({ id: scheduledMessages.id });
    if (claimed.length === 0) return; // another sender won the race; messageId stays null

    const [message] = await tx
      .insert(messages)
      .values({
        conversationId: conversation?.id ?? null,
        direction: 'out',
        sender: 'ai',
        type: planned.intentExtra.type,
        body: planned.body,
        templateName: planned.templateName,
        status: 'queued',
        raw: planned.intentExtra.raw,
      })
      .returning({ id: messages.id });
    if (message === undefined) throw new Error('lifecycle send-intent returned no row');
    messageId = message.id;

    await tx
      .update(scheduledMessages)
      .set({ sentMessageId: message.id })
      .where(eq(scheduledMessages.id, row.id));
  });

  if (messageId === null) {
    deps.log.info({ scheduledId: row.id }, '[lifecycle] row already claimed — not re-sent');
    return 'skipped';
  }

  const sendResult = await deps.wa.dispatchTemplated(
    {
      messageId,
      toE164: guest.phone,
      body: planned.body,
      conversationId: conversation?.id ?? null,
    },
    planned,
  );

  if (!sendResult.ok) {
    await deps.db
      .update(scheduledMessages)
      .set({ status: 'failed', skipReason: sendResult.error.slice(0, 100) })
      .where(eq(scheduledMessages.id, row.id));
    await alertOps(deps.log, {
      kind: 'lifecycle_send_failed',
      summary: 'A lifecycle message failed to send',
      detail: { scheduledId: row.id, kind, messageId },
    });
    return 'failed';
  }

  // §5.3/§4: a real template send is billable — meter it. A free-form send
  // inside an open window is not, and must not be counted as one.
  if (planned.asTemplate) {
    await insertCostEvents(deps.db, [
      {
        day: istCalendarDay(nowIST()),
        kind: 'wa_template',
        quantity: '1',
        inrEstimate: '0',
      },
    ]);
  }

  deps.log.info(
    { scheduledId: row.id, kind, usedTemplate: planned.asTemplate },
    '[lifecycle] sent',
  );
  return 'sent';
}
