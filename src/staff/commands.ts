/**
 * Staff commands (plan §8 CH-13 step 3): `DONE <id>` and `TASKS`.
 *
 * Runs in a WORKER, never in the webhook. The webhook stores the message and
 * enqueues; everything fallible happens here, because the webhook path runs
 * AFTER the 200 ack on a delivery Meta never repeats — a throw there would
 * lose the DONE for ever (CH-03 D2, and the reasoning that moved CH-11's
 * linking out of the webhook).
 *
 * ─── Only roster numbers get here ─────────────────────────────────────────
 * §3.3: staff commands are honoured from exact roster numbers only, matched
 * normalised-vs-normalised (both sides normalise at boot). A guest cannot
 * trigger this parser at all: the webhook classifies BEFORE the guest upsert,
 * so a guest's "DONE A3F2K9" is ordinary text that reaches the model and
 * nothing else. The direction+number check is the whole gate.
 *
 * ─── Why the guest close line is DETERMINISTIC ────────────────────────────
 * Paul-approved 2026-07-17. plan step 3 says the DONE "enqueues the
 * conversation so the AI can tell the guest gracefully" — but that enqueue is
 * a NO-OP as the worker stands: `processConversation` returns immediately when
 * there is no unprocessed GUEST message, and the whole turn (debounce, policy,
 * model, claim) is keyed on one. The worker cannot do a turn nobody prompted.
 *
 * So the close line is written here, in voice, naming the task's own summary.
 * It costs no model call, opens no new entry point in worker.ts (which CH-14
 * must touch again for takeover), and — the part that matters — it is TRUE BY
 * CONSTRUCTION: the DONE that triggers it just landed, so there is no gap
 * between the claim and the fact for a guardrail to have to police. Recorded
 * as a §8-step-3 deviation.
 */
import { closeTaskByShortId, findTaskByShortId, getLiveTasksForPhone, type Task } from '../db/tasks.js';
import type { Db, DbLike } from '../db/client.js';
import { getConversationTurnContext, insertMessage } from '../db/repos.js';
import { sanitiseInline } from '../brain/prompt.js';
import type { AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { memberFor, type Roster } from './roster.js';

export interface StaffCommandDeps {
  db: Db;
  /** Injected — the chunk's one remaining un-injected clock was here (pre-push
   * review). `closed_at` must be pinnable by a test, and tasks.ts's own rule is
   * one clock per tick: this instant is compared against a DB-clock
   * `sla_deadline`. */
  now: () => Date;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendText'>;
  roster: Roster;
}

export type StaffCommand =
  | { kind: 'done'; shortId: string }
  | { kind: 'tasks' }
  | { kind: 'unknown' };

/**
 * `DONE <id>` / `TASKS`, parsed from what a human actually types.
 *
 * Tolerant on purpose, because the alternative is a housekeeper retyping a
 * command that "should" work: case-insensitive (they are typing on a phone
 * keyboard), a `#` before the id is fine (the card prints one), and trailing
 * punctuation is fine. NOT tolerant about what the command IS — an unmatched
 * message is `unknown` and is stored and ignored, never guessed at.
 */
export function parseStaffCommand(body: string | null): StaffCommand {
  const text = (body ?? '').trim();
  const done = /^done\s+#?([a-z0-9]{4,10})\b[\s.!]*$/i.exec(text);
  if (done !== null) return { kind: 'done', shortId: done[1] as string };
  if (/^tasks\b[\s.!?]*$/i.test(text)) return { kind: 'tasks' };
  return { kind: 'unknown' };
}

/** The `sender:'system'` context rows guardrail 2 reads (§6.5 #2's second
 * evidence channel). `task_done` licenses C1 for exactly the next guest turn —
 * the honest decay the fact_saved row already uses. */
export const TASK_DONE_CONTEXT_KIND = 'task_done';

/** The guest's own words come back to them in the close line; capped so a long
 * request cannot make the reply breach the voice guide's length rule. */
const CLOSE_LINE_SUMMARY_MAX = 80;

export async function handleStaffCommand(
  deps: StaffCommandDeps,
  input: { phone: string; body: string | null },
): Promise<void> {
  const command = parseStaffCommand(input.body);
  const member = memberFor(deps.roster, input.phone);
  const who = member?.name ?? 'ops';

  if (command.kind === 'unknown') {
    // Stored by the webhook, never AI-processed (plan step 3). Not an error: a
    // staff member chatting on the line is normal, and guessing at what they
    // meant is how a task gets closed by accident.
    deps.log.info?.({ who }, 'staff message is not a command — stored, not processed');
    return;
  }

  if (command.kind === 'tasks') {
    const open = await getLiveTasksForPhone(deps.db, input.phone);
    await deps.wa.sendText(input.phone, renderTaskList(open), {
      conversationId: null,
      sender: 'system',
    });
    return;
  }

  // 🚨 ONE TRANSACTION: the guarded claim AND the evidence row.
  //
  // The guarded UPDATE is the concurrency story — only the caller that actually
  // changed the row proceeds, so a Meta redelivery (which the webhook's
  // wa_message_id dedupe already absorbs) or a race with the SLA nudger cannot
  // close twice or message the guest twice.
  //
  // But the CH-12 sender's other half was missing here, and the pre-push review
  // reproduced the cost: with the claim committed alone, a process death between
  // it and the evidence row (a Railway deploy, an OOM — the job expires and
  // retries) left the task `done`, NO `task_done` row, the guest never told, and
  // the retry reporting "already closed" and stopping. A housekeeper delivered
  // the towels and the system forgot. `closeTaskByShortId`'s own doc claimed
  // "exactly one close writes evidence"; the true invariant was AT MOST one, and
  // zero was reachable. Committing them together makes the retry either redo
  // both or find the work genuinely done.
  //
  // The guest SEND stays outside: it is not rollback-able, and holding a tx open
  // across a Graph call is how you get lock storms.
  const closed = await deps.db.transaction(async (tx) => {
    const row = await closeTaskByShortId(tx, command.shortId, input.phone, deps.now());
    if (row === null) return null;
    await writeTaskDoneEvidence(tx, row);
    return row;
  });
  if (closed === null) {
    await replyToUnclosable(deps, input.phone, command.shortId);
    return;
  }
  deps.log.info?.(
    { taskId: closed.id, shortId: closed.shortId, who },
    'staff task closed by DONE',
  );
  await deps.wa.sendText(input.phone, `Thank you — #${closed.shortId} is closed.`, {
    conversationId: null,
    sender: 'system',
  });
  await tellGuest(deps, closed);
}

/**
 * "Unknown id" and "already done" are DIFFERENT facts and must not collapse.
 * A human who typed a real id and got "unknown" would retype it for ever —
 * and a second DONE on a closed task is a normal thing for two staff to do.
 */
async function replyToUnclosable(
  deps: StaffCommandDeps,
  phone: string,
  shortId: string,
): Promise<void> {
  const existing = await findTaskByShortId(deps.db, shortId);
  const line =
    existing === null
      ? `Sorry — no task #${shortId.toUpperCase()}. Reply TASKS to see what is open for you.`
      : `#${existing.shortId} was already closed. Nothing more to do.`;
  await deps.wa.sendText(phone, line, { conversationId: null, sender: 'system' });
}

function renderTaskList(open: Task[]): string {
  if (open.length === 0) return 'Nothing open for you right now.';
  const lines = open.map(
    (t) => `#${t.shortId} · ${t.villaLabel ?? 'villa not confirmed'} · ${t.summary}`,
  );
  return ['Open for you:', ...lines, 'Reply DONE <id> when finished.'].join('\n');
}

/**
 * The guest's close line + the guardrail-2 evidence row.
 *
 * Best-effort throughout: the task IS closed, and failing to reach the guest
 * must not un-close it or fail the staff member's DONE.
 */
/**
 * The row that licenses the AI's next honest "that's sorted" (guardrail 2, C1
 * and C5). Rides the SAME transaction as the claim.
 *
 * 🚨 THE RESEMBLANCE TO escalateToOps IS A TRAP — its rule is the OPPOSITE, and
 * copying it here would be wrong. That row may only be written once a card is
 * DELIVERED, because the fact it records ("a human is coming") only becomes
 * true if the card lands. This row records a fact that has ALREADY happened,
 * whoever hears about it: a human finished the work and typed DONE. Its truth
 * does not depend on our send succeeding, so gating it on delivery would make
 * the AI's next reply DIShonest — it would deny work that was genuinely done.
 * Different facts, different rules.
 */
async function writeTaskDoneEvidence(db: DbLike, task: Task): Promise<void> {
  // 🚨 Guard by ORIGIN, not conversationId (CH-13b round 2). A `system` task
  // (the media follow-up, the arrival verify) is NOT the guest's request, so
  // closing it licenses NO guest-facing claim — a task_done row here would let
  // the AI tell the guest "that's sorted" about something they never asked for.
  // The conversationId guard alone missed the media task, which carries one.
  if (task.conversationId === null || task.origin !== 'guest') return;
  await insertMessage(db, {
    conversationId: task.conversationId,
    direction: 'out',
    sender: 'system',
    type: 'text',
    body: `task closed: ${task.shortId}`,
    status: 'sent',
    raw: { contextKind: TASK_DONE_CONTEXT_KIND, shortId: task.shortId },
  });
}

async function tellGuest(deps: StaffCommandDeps, task: Task): Promise<void> {
  // 🚨 ORIGIN, not just conversationId (CH-13b round 2). A `system` task's
  // summary is INTERNAL ops wording ("guest sent media the assistant could not
  // read — please follow up"), and the guest never asked for it — sending "That
  // is done — <that>" would leak the wording AND falsely claim we did something
  // for them. The media task carries a real conversationId, so the null guard
  // alone let it through.
  if (task.conversationId === null || task.origin !== 'guest') return;
  const ctx = await getConversationTurnContext(deps.db, task.conversationId).catch(() => null);
  if (ctx === null) return;

  // 🚨 §6.7 line 1 is absolute: human_active ⇒ the AI is SILENT. The close line
  // speaks OUT OF TURN — a staff DONE triggers it, not a guest — and goes as
  // `sender:'ai'`, so it is exactly the kind of send that rule exists for. CH-12
  // set the precedent in as many words (`sender.ts`: "CH-12 is the one chunk
  // that speaks first, so it is the one that most needs to honour it"), and my
  // first cut checked nothing. The likeliest collision is the ugly one: a human
  // took the thread over BECAUSE of this task, is mid-reply, and the AI cuts in
  // with a receipt.
  //
  // SKIP, not defer: there is no scheduled row to defer, and the human is right
  // there — they will tell the guest themselves. The `task_done` evidence row is
  // already committed (in the claim's transaction, independent of this send), so
  // whenever the AI next speaks it is still licensed to say the work is done.
  const humanActive =
    (ctx.conversation.humanActiveUntil !== null &&
      ctx.conversation.humanActiveUntil.getTime() > deps.now().getTime()) ||
    ctx.conversation.status === 'human_active';
  if (humanActive) {
    deps.log.info?.(
      { taskId: task.id, shortId: task.shortId },
      'close line skipped — a human holds the thread',
    );
    return;
  }
  // Voice guide: British English, no exclamation marks, 1–3 sentences. The
  // summary is the guest's own words coming back to them, which is what makes
  // this readable as a reply rather than a receipt.
  const line = `That is done — ${sanitiseInline(task.summary, CLOSE_LINE_SUMMARY_MAX)}. Anything else we can help with?`;
  // A shut window means the guest has been silent >24h; sendText refuses
  // locally rather than earning a 131047. That is correct: there is no
  // template for "your towels arrived", and inventing one for a day-old
  // request would be worse than silence. The evidence row above still makes
  // the AI's next reply honest whenever they do write.
  await deps.wa.sendText(ctx.guestPhone, line, {
    conversationId: task.conversationId,
    sender: 'ai',
  });
}
