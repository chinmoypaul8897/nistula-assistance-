/**
 * create_staff_task (plan §6.4 tool 4, CH-13a step 3) — the AI's hands, and
 * THE precondition for saying "the team has been informed".
 *
 * 🚨 THERE IS NO `villa_label` PARAMETER, AND THAT IS THE POINT.
 * §6.4's signature says `create_staff_task(kind, villa_label, summary, detail?)`
 * and it is struck through in the plan as of 2026-07-16. A model-supplied villa
 * is THE MODEL GUESSING A HOUSE, and its likeliest source is the guest's own
 * guess ("I'm in Apartment 09") — which CH-11's `scanUnitAssertions` treats as
 * a violation to so much as say aloud. The door is a FACT WE LOOK UP: derived
 * server-side from a fresh BKG-03 read, exactly as `get_booking` takes ONE
 * argument and verifies a claim against the guest's OWN typed words rather than
 * the model's args.
 *
 * Result semantics, and the one that matters:
 *  - raised + card DELIVERED → ok:true {shortId, assignee} — licenses C1+C2.
 *  - raised + card UNDELIVERED → ok:false NOT_NOTIFIED. The task EXISTS and
 *    ops is paged, but nothing may be claimed: "housekeeping is on their way"
 *    is a statement about a PERSON MOVING, and nobody is. `ok` therefore
 *    answers "did a human get this?", which is the question the promise
 *    depends on — so guardrail 2 needs no framework change, because
 *    `covered()` already gates on `run.result.ok`.
 *  - appended to an existing task → ok:true (the work IS with someone).
 *  - gated (stage / cap / a house in the summary) → ok:false REFUSED.
 *
 * Like every tool this runs PRE-claim (CH-03 D2), so a losing claim can leave a
 * task behind. Accepted on the remember_fact precedent, and the near-duplicate
 * guard is what absorbs the replay — that guard is not a §6.4 nicety, it is the
 * retry-safety mechanism.
 */
import { z } from 'zod';
import {
  appendToTask,
  getLiveTasksForConversation,
  insertTask,
  MAX_OPEN_TASKS_PER_CONVERSATION,
  type Task,
  type TaskKind,
} from '../../db/tasks.js';
import { summarizeError } from '../../lib/logger.js';
import { namesPhysicalHouse } from '../../lib/villas.js';
import { deriveStage, type DescribedStay, type Stage } from '../stayView.js';
import type { ToolDef, ToolResult, ToolTaskContext } from './registry.js';

/** A burst can legitimately carry two asks ("towels, and the AC is weak").
 * Beyond that the guest needs a person, not a fourth card. */
export const MAX_TASKS_PER_TURN = 2;

export const SUMMARY_INPUT_MAX = 120;

/**
 * The stages in which the AI may raise a task at all (§6.4: "available only in
 * instay/arrival stages; leads → escalate_to_human").
 *
 * §6.4's words predate the enum — `instay` IS `inhouse` and `arrival` IS
 * `prearrival` (stayView.ts:61). Named here so nobody has to re-derive it.
 *
 * 🚨 The stage is DATE-derived, never status-derived (stayView.ts:248-260): no
 * production row is ever marked `checked_in`, because a front-desk check-in
 * never comes down the queue. A status-keyed gate would refuse every real
 * in-house guest while passing every test written with seeded data — which is
 * this codebase's signature failure, and it would land on the exact scenario
 * this chunk exists for.
 */
const TASK_STAGES = new Set<Stage>(['inhouse', 'prearrival']);

const inputSchema = z.object({
  kind: z.enum(['housekeeping', 'maintenance', 'frontdesk']),
  summary: z.string().min(1).max(SUMMARY_INPUT_MAX),
  detail: z.string().max(600).optional(),
});
type CreateStaffTaskInput = z.infer<typeof inputSchema>;

const STAGE_REFUSAL =
  'not raised: this guest has no current or upcoming stay, so there is nothing for the villa team to attend to. Do not tell them anything was logged — if they need a person, say you will bring the team in.';

const HOUSE_REFUSAL =
  'not raised: do not name a villa or apartment in the summary. We look the guest’s house up ourselves and put it on the card — a house in your summary is a guess, and it would contradict the one we resolved. Describe only WHAT is needed, then call the tool again.';

const CAP_REFUSAL =
  'not raised: this guest already has the maximum open requests of other kinds. Do not tell them anything was logged — bring the team in instead.';

const TURN_CAP_REFUSAL =
  'not raised: you have already raised the most requests allowed in one reply. Do not claim anything further was logged.';

const NOT_NOTIFIED =
  'the request is recorded but NOBODY on the team has received it yet, and the front desk has been alerted. Do NOT say it has been logged, passed on, or that anyone is coming. Tell the guest you are bringing the team in.';

export const createStaffTaskTool: ToolDef = {
  name: 'create_staff_task',
  description:
    'Raise ONE task for the villa team about THIS guest\'s current or upcoming stay, and send it to the right staff member. Use it the moment a guest asks for something physical (towels, cleaning, a repair, an arrival need) — the task is what makes it true to say the team has been told. kind: housekeeping (towels, linen, cleaning, amenities) | maintenance (AC, plumbing, electrical, anything broken) | frontdesk (anything else a person must handle). summary: one short line saying WHAT is needed, in the guest\'s terms — never name a villa or apartment, we look their house up ourselves. detail: optional extra context. If this returns an error, do NOT tell the guest anything was arranged.',
  inputSchema,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as CreateStaffTaskInput;
    const tasks = ctx.tasks;
    if (tasks === undefined) {
      return { ok: false, error: 'INVALID', message: 'tasks are not available this turn' };
    }
    if (tasks.created.count >= MAX_TASKS_PER_TURN) {
      return { ok: false, error: 'REFUSED', message: TURN_CAP_REFUSAL };
    }

    // GATE 1 — the stage. Asked of DATES, via the same projection block [5] is
    // rendered from, so the tool and the prompt cannot disagree.
    const stage = deriveStage(tasks.stays, tasks.today);
    if (!TASK_STAGES.has(stage)) {
      return { ok: false, error: 'REFUSED', message: STAGE_REFUSAL };
    }

    // GATE 2 — a house in the summary. The model's likeliest source is the
    // guest's own guess, and it would compete with the door we resolve below.
    // Screened HERE rather than only at the template so the model gets an
    // actionable refusal it can retry, instead of a card that fails to send.
    if (namesPhysicalHouse(input.summary) || namesPhysicalHouse(input.detail ?? '')) {
      return { ok: false, error: 'REFUSED', message: HOUSE_REFUSAL };
    }

    try {
      const live = await getLiveTasksForConversation(tasks.db, tasks.conversationId);

      // The door, resolved server-side. Never a model argument, never the
      // mirror's stale label. An unresolved door is NOT a failure — it means
      // the card names the villa TYPE and the front desk sorts it.
      const stay = currentStay(tasks.stays, tasks.today);
      const door = await resolveDoorFor(tasks, stay);
      const villaLabel = door ?? stay?.villa ?? null;

      // GATE 3 — near-duplicate: same kind + same DERIVED villa + similar
      // summary → append. Keyed off the villa we resolved, never an argument.
      const duplicate = live.find(
        (t) =>
          t.kind === input.kind &&
          t.villaLabel === villaLabel &&
          similar(t.summary, input.summary),
      );
      if (duplicate !== undefined) {
        return await appendAnswer(tasks, duplicate, input, 'duplicate');
      }

      // GATE 4 — the 3-open cap. Over cap, a request of a kind already in
      // flight APPENDS to the newest of that kind; a NEW kind refuses, because
      // three open tasks plus a fourth different problem is a guest who needs a
      // human, not another card.
      if (live.length >= MAX_OPEN_TASKS_PER_CONVERSATION) {
        const sameKind = live.find((t) => t.kind === input.kind);
        if (sameKind === undefined) {
          return { ok: false, error: 'REFUSED', message: CAP_REFUSAL };
        }
        return await appendAnswer(tasks, sameKind, input, 'at_cap');
      }

      return await raise(tasks, input, villaLabel, stay);
    } catch (error) {
      ctx.log.error(
        { err: summarizeError(error), conversationId: tasks.conversationId },
        'create_staff_task failed',
      );
      return { ok: false, error: 'UPSTREAM_DOWN' };
    }
  },
};

/** The stay a task is ABOUT: the one that makes this guest in-house or
 * arriving. Undefined only if the stage gate passed on a stay we then could not
 * find, which cannot happen — but a task with no stay is still raisable (it
 * routes to the front desk), so this never throws. */
function currentStay(stays: ToolTaskContext['stays'], today: string): DescribedStay | null {
  const described = stays.filter((s): s is DescribedStay => s.describable);
  return (
    described.find((s) => s.checkIn <= today && today < s.checkOut) ??
    described.find((s) => s.checkIn > today) ??
    null
  );
}

async function resolveDoorFor(
  tasks: ToolTaskContext,
  stay: DescribedStay | null,
): Promise<string | null> {
  if (tasks.ezee === null || stay === null) return null;
  const outcome = await tasks.ezee(stay.reservationNo);
  return outcome.resolved ? outcome.label : null;
}

async function raise(
  tasks: ToolTaskContext,
  input: CreateStaffTaskInput,
  villaLabel: string | null,
  stay: DescribedStay | null,
): Promise<ToolResult> {
  const assignment = tasks.assign(input.kind as TaskKind, villaLabel);
  const task = await insertTask(tasks.db, {
    conversationId: tasks.conversationId,
    guestId: tasks.guestId,
    bookingId: stay?.bookingId ?? null,
    villaLabel,
    kind: input.kind as TaskKind,
    summary: input.summary,
    detail: input.detail ?? null,
    assignedPhone: assignment?.phone ?? null,
    now: tasks.now,
  });

  const notified = await tasks.notify(task, tasks.guestFirstName);
  if (!notified.delivered) {
    // The task is real; the promise is not. ok:false is what stops guardrail 2
    // licensing C1/C2 — see the header.
    return { ok: false, error: 'NOT_NOTIFIED', message: NOT_NOTIFIED, data: { shortId: task.shortId } };
  }
  tasks.created.count += 1;
  tasks.created.shortIds.push(task.shortId);
  // `data` stays BARE (the remember_fact rule): no summary echo, no villa, no
  // phone. A ₹ figure or a house reaching the model through a tool result is
  // exactly what guardrail 1 and OQ-15 exist to prevent.
  return {
    ok: true,
    data: { shortId: task.shortId, assignee: assignment?.member?.name ?? 'the front desk' },
  };
}

/**
 * An append is ok:true: the work IS with someone — that is what the original
 * card did — so the guest may honestly be told the team has it. No second card
 * is sent, deliberately: a housekeeper who already has "#A3F2 · 2 towels" does
 * not need a second buzz to be told the guest asked again, and the SLA nudger
 * is the mechanism that chases them.
 */
async function appendAnswer(
  tasks: ToolTaskContext,
  target: Task,
  input: CreateStaffTaskInput,
  reason: 'duplicate' | 'at_cap',
): Promise<ToolResult> {
  const extra = [input.summary, input.detail].filter((s) => s !== undefined && s !== '').join(' — ');
  const updated = await appendToTask(tasks.db, target.id, `(again) ${extra}`);
  if (updated === null) {
    // It closed underneath us between the read and the write. Not an error —
    // the honest answer is that this is new work, so let the model try again.
    return { ok: false, error: 'REFUSED', message: 'not raised: please try once more.' };
  }
  tasks.created.count += 1;
  return { ok: true, data: { shortId: target.shortId, appended: true, reason } };
}

/**
 * "Similar summary" (§6.4), naive by design and by the plan's own blessing.
 * Word-overlap on the shared vocabulary, mirroring guestMemory's fact dedupe so
 * this codebase has one notion of "near enough" rather than two.
 */
export function similar(a: string, b: string): boolean {
  const wordsOf = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size) >= 0.6;
}
