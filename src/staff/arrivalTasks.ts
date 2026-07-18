/**
 * CH-13b · the arrival auto-task. A booking landing for a RETURNING guest who
 * carries a `past_issue` fact raises a frontdesk task — "verify before arrival:
 * <the issue>" — so a human checks the room before they walk back in
 * (product-picture S6's follow-through).
 *
 * This is the first task the system raises with NO model turn behind it. Three
 * facts shape it:
 *
 *  1. It runs on the TASK gate (`passesTaskGate`), NEVER the lifecycle gate. The
 *     lifecycle gate is SOURCE-gated — an Airbnb guest never messaged us — but a
 *     staff task reaches no guest, so their room still needs preparing (D9).
 *
 *  2. It runs on CREATE **and MODIFY** — a hold arrives 'unknown' (gate-skipped)
 *     and only its later confirm emits booking.modified, so a created-only guard
 *     would miss exactly the bookings that become real via a modify. It is
 *     therefore IDEMPOTENT on a deterministic `request_key`: the repeat calls
 *     (redelivery, or create-then-modify) collide on the unique index instead of
 *     raising a second card. A null key — the CH-13a forward note — gave no such
 *     protection, so that note is overridden.
 *
 *  3. The card carries the villa TYPE, never a house. A booking pre-arrival has
 *     no room assigned (`RoomID:""`), and this is a frontdesk task anyway, so
 *     `roomTypeName` is both all we honestly have and all that is needed
 *     (OQ-19: eZee's later pick is not the guest's chosen house).
 */
import { getMirrorByReservationNo } from '../db/bookings.js';
import { FACTS_PER_GUEST_CAP, getActiveGuestFacts, getGuestByPhone } from '../db/guestMemory.js';
import {
  findTaskByRequestKey,
  insertTask,
  updateOpenTaskDeadline,
  type Task,
} from '../db/tasks.js';
import type { Db } from '../db/client.js';
import type { AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { sanitiseInline } from '../brain/prompt.js';
import { passesTaskGate } from '../lifecycle/gates.js';
import { assignFor, type Roster } from './roster.js';
import { notifyTask, SUMMARY_MAX } from './notifier.js';

export interface ArrivalTaskDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  roster: Roster;
  wa: Pick<WaClient, 'sendTemplated'>;
  /** Same gate context the lifecycle scheduler uses (epoch neutralises history,
   * today drops a stay already over). NO source, NO phone — see passesTaskGate. */
  epoch: Date | undefined;
  today: string;
  /** DB-clock instant for the SLA deadline. Injected, never `new Date()`. */
  now: Date;
}

export type ArrivalTaskOutcome =
  | { created: true; task: Task }
  | { created: false; reason: string };

/**
 * Raise the frontdesk verify-task for a booking, if one is warranted and does
 * not already exist. Every early return is a RECORDED skip reason — a task that
 * did not happen is never silent.
 */
export async function maybeCreateArrivalVerifyTask(
  deps: ArrivalTaskDeps,
  reservationNo: string,
): Promise<ArrivalTaskOutcome> {
  const row = await getMirrorByReservationNo(deps.db, reservationNo);
  if (row === null) return skip(deps, reservationNo, 'no_mirror_row');

  const gate = passesTaskGate(row, { epoch: deps.epoch, today: deps.today });
  if (!gate.ok) return skip(deps, reservationNo, gate.reason);

  // The guest is found by the booking's phone — a RETURNING guest whose facts
  // persist from an earlier stay. A masked OTA number simply will not match, and
  // that is a fine fail-closed outcome: no known guest, no task.
  if (row.guestPhone === null) return skip(deps, reservationNo, 'no_phone_to_match_guest');
  const guest = await getGuestByPhone(deps.db, row.guestPhone);
  if (guest === null) return skip(deps, reservationNo, 'guest_not_known');

  // Fetch ALL of the guest's facts, not the block-[5] top 15 — a frequent
  // returner's real past_issue can sit below the 15 newest preferences, and
  // missing it silently is exactly the guest this feature is FOR (round-1
  // review). FACTS_PER_GUEST_CAP is the hard ceiling, so this is bounded.
  const pastIssues = (
    await getActiveGuestFacts(deps.db, guest.id, FACTS_PER_GUEST_CAP)
  ).filter((f) => f.kind === 'past_issue');
  if (pastIssues.length === 0) return skip(deps, reservationNo, 'no_past_issue');

  const requestKey = `autotask:${row.ezeeReservationNo}:arrival_verify`;
  const existing = await findTaskByRequestKey(deps.db, requestKey);
  if (existing !== null) {
    // Already raised — but a booking.modified may have MOVED check-in since,
    // and the deadline is check-in-derived. Re-anchor an OPEN task so the nudge
    // fires against the CURRENT arrival, not the stale one (round 2: a terminal
    // skip keyed on a mutable fact). No new card — the front desk already has
    // it; only the reminder clock moves.
    const freshDeadline = arrivalTaskDeadline(row.checkIn, deps.now);
    if (existing.status === 'open' && existing.slaDeadline.getTime() !== freshDeadline.getTime()) {
      await updateOpenTaskDeadline(deps.db, existing.id, freshDeadline);
      return skip(deps, reservationNo, 'deadline_reanchored');
    }
    return skip(deps, reservationNo, 'already_created');
  }

  const fullText = `verify before arrival: ${pastIssues.map((f) => f.content).join('; ')}`;
  const summary = sanitiseInline(fullText, SUMMARY_MAX);
  // Detail preserves the FULL text whenever the card summary cannot carry it —
  // whether because there are several facts OR one long one (round-1 review: a
  // single fact >120 chars was silently truncated with no overflow).
  const detail =
    pastIssues.length > 1 || fullText.length > SUMMARY_MAX
      ? pastIssues.map((f) => `• ${f.content}`).join('\n')
      : null;
  const assignment = assignFor(deps.roster, 'frontdesk', null);

  let task: Task;
  try {
    task = await insertTask(deps.db, {
      conversationId: null,
      guestId: guest.id,
      bookingId: row.id,
      // Villa TYPE, never a house (OQ-19). Null-safe: an unresolved type renders
      // the "villa not confirmed" label, which for a frontdesk task is fine.
      villaLabel: row.roomTypeName,
      kind: 'frontdesk',
      // A guest never asked for this — it must NOT surface in their block [5].
      origin: 'system',
      // The SLA is anchored to CHECK-IN, not now+10min: a "verify before
      // arrival" task for a guest 8 days out must not go overdue and buzz the
      // front desk today. It becomes due ~a day before they arrive — which is
      // also when a human should actually check (round-1 review: the false
      // 10-min overdue buzz). checkIn is non-null here (passesTaskGate's date
      // gate rejects a null check-in).
      slaDeadline: arrivalTaskDeadline(row.checkIn, deps.now),
      summary,
      detail,
      assignedPhone: assignment?.phone ?? null,
      requestKey,
      now: deps.now,
    });
  } catch (error) {
    // A concurrent booking.created won the unique index between our check and
    // this insert — that is the guard doing its job, not a failure. Treat the
    // winner's task as ours and raise no second card.
    if ((await findTaskByRequestKey(deps.db, requestKey)) !== null) {
      return skip(deps, reservationNo, 'already_created_race');
    }
    throw error;
  }

  const firstName = firstNameOf(guest.firstName);
  await notifyTask({ db: deps.db, log: deps.log, wa: deps.wa }, task, firstName, 'raise');
  deps.log.info?.(
    { reservationNo, taskId: task.id, shortId: task.shortId, facts: pastIssues.length },
    '[arrival-task] frontdesk verify-task raised',
  );
  return { created: true, task };
}

function skip(deps: ArrivalTaskDeps, reservationNo: string, reason: string): ArrivalTaskOutcome {
  deps.log.info?.({ reservationNo, reason }, '[arrival-task] no task');
  return { created: false, reason };
}

/**
 * When a "verify before arrival" task becomes DUE: ~1 day before check-in, so
 * the front desk is reminded near the arrival, never 10 minutes after the
 * booking lands. A stay arriving today (a last-minute re-booking) yields a
 * deadline in the past ⇒ due on the next nudger tick, which is correct — verify
 * now. checkIn is 'YYYY-MM-DD' (IST); this is the ONE place we turn it into an
 * instant, and only for a deadline, never for a date comparison.
 */
export function arrivalTaskDeadline(checkIn: string | null, now: Date): Date {
  // Non-null in the real path (passesTaskGate's date gate rejects a null
  // check-in); the guard keeps this total for a defensive caller.
  if (checkIn === null) return now;
  const checkInInstant = new Date(`${checkIn}T00:00:00+05:30`);
  if (Number.isNaN(checkInInstant.getTime())) return now; // unparseable ⇒ due now
  return new Date(checkInInstant.getTime() - 24 * 60 * 60 * 1000);
}

function firstNameOf(name: string | null): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first === undefined || first === '' ? null : first;
}
