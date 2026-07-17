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
 *  - appended to an existing task → ok:true, AND a card goes out carrying the
 *    new text (an un-carded ask is invisible work).
 *  - gated (stage / cap / a house in the summary) → ok:false REFUSED.
 *
 * Like every tool this runs PRE-claim (CH-03 D2), so a `converse()` failure
 * later in the turn makes pg-boss retry the WHOLE loop and re-run this.
 *
 * 🚨 WHAT ABSORBS THAT RETRY IS `request_key`, NOT `similar()` — and this header
 * used to say the opposite. `similar()` compares MODEL-AUTHORED PROSE, and a
 * retry is a fresh sample of a stochastic model that need not reproduce its own
 * wording. Reproduced by the pre-push review against real Postgres: 2 tasks, 2
 * cards, one guest ask. The key is deterministic, so a retry collides with its
 * own previous attempt instead of being judged on prose. `similar()` survives as
 * the UX question it CAN answer — see `answerFromExisting`.
 *
 * (This header also used to claim "2 extra towels" → "two towels for the
 * bathroom" *scores 0*. It scores 1.0 — a reviewer measured it. The conclusion
 * stands and the arithmetic did not, which is its own small lesson: an example
 * invented to make a point is not evidence.)
 */
import { z } from 'zod';
import {
  appendToTask,
  findTaskByRequestKey,
  getLiveTasksForConversation,
  insertTask,
  MAX_OPEN_TASKS_PER_CONVERSATION,
  taskRequestKey,
  type Task,
  type TaskKind,
} from '../../db/tasks.js';
import { summarizeError } from '../../lib/logger.js';
import { namesPhysicalHouse } from '../../lib/villas.js';
import { deriveStage, selectStays, type DescribedStay, type Stage } from '../stayView.js';
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

const RESOLVED_REFUSAL =
  'not raised: this request has already been dealt with. Do not claim anything is on its way.';

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
      // GATE 0 — THE RETRY KEY. Checked before anything expensive, because a
      // pg-boss retry of this turn computes the SAME key and must find the task
      // its own previous attempt already made, rather than making a second one
      // and buzzing the housekeeper twice (pre-push review; reproduced).
      const requestKey =
        tasks.sourceMessageId === null
          ? null
          : taskRequestKey(tasks.conversationId, tasks.sourceMessageId, input.kind as TaskKind);
      if (requestKey !== null) {
        const already = await findTaskByRequestKey(tasks.db, requestKey);
        if (already !== null) return await answerFromExisting(tasks, already, input);
      }

      const live = await getLiveTasksForConversation(tasks.db, tasks.conversationId);

      // The door, resolved server-side. Never a model argument, never the
      // mirror's stale label. An unresolved door is NOT a failure — it means
      // the card names the villa TYPE and the front desk sorts it.
      //
      // 🚨 The card must SAY that the house is unconfirmed, not just quietly
      // print a type (pre-push review). `stay.villa` is never null in the real
      // path — stayView returns the room-type name when it withholds a unit —
      // so `door ?? stay.villa` rendered "Nistula Apartment · Rahul · 2 towels",
      // a visual near-twin of "Apartment 06 · …" that in fact names THREE
      // houses, with nothing telling the reader to go and look. The notifier's
      // deliberately unmistakable "villa not confirmed" line was unreachable.
      const stay = currentStay(tasks.stays, tasks.today);
      const door = await resolveDoorFor(tasks, stay);
      const villaLabel =
        door ?? (stay?.villa === undefined || stay.villa === null ? null : unconfirmed(stay.villa));

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

      return await raise(tasks, input, villaLabel, stay, requestKey);
    } catch (error) {
      ctx.log.error(
        { err: summarizeError(error), conversationId: tasks.conversationId },
        'create_staff_task failed',
      );
      return { ok: false, error: 'UPSTREAM_DOWN' };
    }
  },
};

/** The roster name's first token. */
function firstNameOf(name: string | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first === undefined || first === '' ? 'the front desk' : first;
}

/**
 * What the card says when eZee would not give us the door: the villa TYPE, and
 * plainly that it is not the house. The front desk (who this then routes to)
 * can look it up; a bare type would read like an answer.
 */
function unconfirmed(villaType: string): string {
  return `${villaType} — house not confirmed, check eZee`;
}

/**
 * The stay a task is ABOUT: the one that makes this guest in-house or arriving.
 *
 * 🚨 THIS WAS A HAND-ROLLED PREDICATE AND IT DISAGREED WITH THE MODULE THAT
 * OWNS THE QUESTION — on a routine day, in the direction that sends a
 * housekeeper to the wrong house.
 *
 * It read `today < s.checkOut`, while `deriveStage` (the gate that had already
 * said yes) uses `today <= v.checkOut`, and stayView.ts:260 states the contract
 * outright: *"Check-out day still counts as in-house: they are in the villa
 * until they go."* So on CHECKOUT MORNING — one of the likeliest times to ask
 * for anything: late checkout, luggage, a last clean — GATE 1 passed and this
 * found nothing, then fell through to `checkIn > today` and returned the
 * guest's NEXT booking. The fresh BKG-03 read was made against the AUGUST
 * reservation, and the card confidently named a house the guest is not in.
 * Reproduced: `deriveStage → inhouse`, `selectStays → 972`, this → `999`.
 *
 * The fix is not a better predicate — it is having no predicate. `selectStays`
 * IS this question, answered by stayView, ordered active → soonest upcoming →
 * past, and it is the same call block [5] renders from. GATE 1 has already
 * excluded `lead`/`postguest`, so [0] is the active stay or the next arrival.
 * One definition; the tool and the prompt cannot drift apart.
 */
function currentStay(stays: ToolTaskContext['stays'], today: string): DescribedStay | null {
  return selectStays(stays, today)[0] ?? null;
}

async function resolveDoorFor(
  tasks: ToolTaskContext,
  stay: DescribedStay | null,
): Promise<string | null> {
  if (tasks.ezee === null || stay === null) return null;
  const outcome = await tasks.ezee(stay.reservationNo);
  return outcome.resolved ? outcome.label : null;
}

/**
 * The retry key already has a task against it. Two VERY different things reach
 * here, and telling them apart is the whole job.
 *
 * 🚨 MY FIRST CUT REPLAYED BOTH SILENTLY, AND THAT WAS A BLOCKER — the pre-merge
 * decision audit caught it, and it was this file's OWN retry fix that caused it.
 * The key is `conversation:message:kind`, so a guest writing *"could we get
 * extra towels, and could someone change the bed linen?"* produces TWO
 * housekeeping calls in one turn (which `MAX_TASKS_PER_TURN = 2` exists to
 * allow, and the tool description invites by listing housekeeping as "towels,
 * linen, cleaning, amenities"). The second collided, replayed `ok:true`, sent no
 * card and appended nothing — so the model said "both are with housekeeping",
 * C1 was licensed by the FIRST call's genuine run, and **the linen was invisible
 * work.** Reproduced: 2 calls, 1 row, 1 card, ok:true twice.
 *
 * The discriminator is `similar()` — demoted from "the retry-safety mechanism"
 * (which it could never be) to the UX question it CAN answer: *did they ask for
 * the same thing twice?*
 *  - similar     ⇒ a genuine retry of one ask ⇒ replay silently.
 *  - NOT similar ⇒ a second, different errand ⇒ append + card, same short id.
 *
 * The honest residual, chosen deliberately: a RETRY in which the model rephrased
 * ("2 extra towels" → "two towels for the bathroom") reads as "different" and
 * costs ONE extra card. That is the same trade `sla.ts` already makes in as many
 * words — *buzzing a housekeeper twice is an annoyance; an un-carded ask is
 * invisible work.* The key still delivers what it was for: never two rows, never
 * two short ids, never two SLA clocks, never two DONEs.
 */
async function answerFromExisting(
  tasks: ToolTaskContext,
  already: Task,
  input: CreateStaffTaskInput,
): Promise<ToolResult> {
  // A task that is not live cannot be appended to (appendToTask is guarded), and
  // its status already answers "did a human get this?" — so it replays whatever
  // the ask was.
  if (already.status === 'notify_failed') {
    tasks.created.count += 1;
    return {
      ok: false,
      error: 'NOT_NOTIFIED',
      message: NOT_NOTIFIED,
      data: { shortId: already.shortId },
    };
  }
  if (already.status === 'done' || already.status === 'cancelled') {
    // Vanishingly rare (a staff member would have to type DONE inside one
    // retried turn), but a resolved task is not evidence that a person is
    // moving NOW, and ok:true would license "on their way". Fail closed.
    tasks.created.count += 1;
    return { ok: false, error: 'REFUSED', message: RESOLVED_REFUSAL };
  }
  if (!similar(already.summary, input.summary)) {
    return await appendAnswer(tasks, already, input, 'same_message');
  }
  tasks.created.count += 1;
  return { ok: true, data: { shortId: already.shortId, replayed: true } };
}

async function raise(
  tasks: ToolTaskContext,
  input: CreateStaffTaskInput,
  villaLabel: string | null,
  stay: DescribedStay | null,
  requestKey: string | null,
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
    requestKey,
    now: tasks.now,
  });

  // 🚨 THE LATCH COUNTS ATTEMPTS, NOT SUCCESSES — pre-push review.
  // It used to increment only after a delivered card, so a FAILING raise bound
  // nothing: reproduced at 6 rows and 6 ops pages against a cap of 2. And the
  // failure is DETERMINISTIC within a turn (an empty roster, or a staff window
  // shut >24h — both of which are the DEFAULT state today), so every retry in
  // the 5-round loop was certain to fail again. Worse, `notify_failed` is
  // excluded from LIVE_TASK_STATUSES, so GATES 3 and 4 read empty on each
  // retry and could not see the orphans either. The latch was the only bound on
  // tool wall-clock time, and each raise costs an eZee read plus a Graph ladder.
  tasks.created.count += 1;
  const notified = await tasks.notify(task, tasks.guestFirstName);
  if (!notified.delivered) {
    // The task is real; the promise is not. ok:false is what stops guardrail 2
    // licensing C1/C2 — see the header.
    return { ok: false, error: 'NOT_NOTIFIED', message: NOT_NOTIFIED, data: { shortId: task.shortId } };
  }
  // `data` stays BARE (the remember_fact rule): no summary echo, no villa, no
  // phone. A ₹ figure or a house reaching the model through a tool result is
  // exactly what guardrail 1 and OQ-15 exist to prevent.
  return {
    ok: true,
    // §6.4/step 2 say assignee FIRST name, and StaffMember.name is free text —
    // "Anita Sharma" would otherwise reach the model whole.
    data: { shortId: task.shortId, assignee: firstNameOf(assignment?.member?.name) },
  };
}

/**
 * An append sends a CARD, and that is a correction from the pre-push review.
 *
 * My first cut sent none, reasoning that a housekeeper holding "#A3F2 · 2
 * towels" needs no second buzz to hear the guest asked again. That reasoning
 * holds ONLY for a genuine repeat — and neither path that reaches here
 * guarantees one:
 *  - `similar()` merges different asks ("extra towels for the bathroom" vs
 *    "extra pillows for the bedroom" share enough words to pass 0.6);
 *  - the at-cap path appends ANY same-kind request with no similarity test at
 *    all, by §6.4's own letter.
 * The appended text goes to `detail`, and NO staff surface renders `detail` —
 * the card is {shortId, villa, guestName, summary} and `TASKS` prints summary.
 * So it returned ok:true, licensed "the pillows are on their way", and nobody
 * ever learned about the pillows. An un-carded ask is invisible work, which is
 * worse than a second buzz.
 *
 * So the card goes out carrying the NEW text against the SAME short id, and
 * `ok` stays the question it always is: did a human get this?
 */
async function appendAnswer(
  tasks: ToolTaskContext,
  target: Task,
  input: CreateStaffTaskInput,
  reason: 'duplicate' | 'at_cap' | 'same_message',
): Promise<ToolResult> {
  const extra = [input.summary, input.detail].filter((s) => s !== undefined && s !== '').join(' — ');
  const updated = await appendToTask(tasks.db, target.id, `(again) ${extra}`);
  if (updated === null) {
    // It closed underneath us between the read and the write. Not an error —
    // the honest answer is that this is new work, so let the model try again.
    return { ok: false, error: 'REFUSED', message: 'not raised: please try once more.' };
  }
  tasks.created.count += 1;
  const notified = await tasks.notify(
    { ...updated, summary: `(also) ${input.summary}` },
    tasks.guestFirstName,
  );
  if (!notified.delivered) {
    return {
      ok: false,
      error: 'NOT_NOTIFIED',
      message: NOT_NOTIFIED,
      data: { shortId: target.shortId },
    };
  }
  return { ok: true, data: { shortId: target.shortId, appended: true, reason } };
}

/**
 * Filler that carries no meaning about WHAT was asked for. Without this, the
 * overlap is computed over words two unrelated requests always share:
 * "extra towels for the bathroom" vs "extra pillows for the bedroom" scored
 * 3/5 and MERGED (pre-push review). It only dropped words of ≤2 chars, so
 * "the/for/and/extra/more/please/need" all counted as agreement.
 */
const FILLER = new Set([
  'the', 'for', 'and', 'our', 'you', 'your', 'can', 'get', 'got', 'please', 'need', 'needs',
  'needed', 'want', 'wants', 'would', 'like', 'some', 'more', 'extra', 'another', 'also',
  'guest', 'requests', 'request', 'asking', 'asks', 'room', 'villa', 'apartment', 'this',
  'that', 'with', 'have', 'has', 'are', 'not', 'from', 'his', 'her', 'them', 'they',
]);

/**
 * "Similar summary" (§6.4) — naive by design and by the plan's own blessing,
 * and NOT load-bearing for retry safety (the request key is: see GATE 0).
 *
 * That distinction is the pre-push review's correction. This function was
 * named as "the retry-safety mechanism", which it could never be: it compares
 * MODEL-AUTHORED PROSE, and a retry is a fresh sample of a stochastic model
 * that does not reproduce its own wording ("2 extra towels" → "two towels for
 * the bathroom" scores 0). Word overlap answers "did they ask for the same
 * thing twice in one breath?" — a UX question, where a wrong answer costs an
 * append instead of a row. It cannot answer "is this the same request?", which
 * is what a retry asks; `request_key` does.
 */
export function similar(a: string, b: string): boolean {
  const wordsOf = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !FILLER.has(w)),
    );
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size) >= 0.6;
}
