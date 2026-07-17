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
 *  2. It is IDEMPOTENT on a deterministic `request_key`. `booking.created` is
 *     redeliverable (pg-boss at-least-once) and a later `booking.modified` on
 *     the same reservation re-enters the handler, so a null key — the CH-13a
 *     forward note — would raise a second card each time. Keyed on the
 *     reservation, a repeat collides on the unique index instead.
 *
 *  3. The card carries the villa TYPE, never a house. A booking pre-arrival has
 *     no room assigned (`RoomID:""`), and this is a frontdesk task anyway, so
 *     `roomTypeName` is both all we honestly have and all that is needed
 *     (OQ-19: eZee's later pick is not the guest's chosen house).
 */
import { getMirrorByReservationNo } from '../db/bookings.js';
import { getActiveGuestFacts, getGuestByPhone } from '../db/guestMemory.js';
import { findTaskByRequestKey, insertTask, type Task } from '../db/tasks.js';
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

  const pastIssues = (await getActiveGuestFacts(deps.db, guest.id)).filter(
    (f) => f.kind === 'past_issue',
  );
  if (pastIssues.length === 0) return skip(deps, reservationNo, 'no_past_issue');

  const requestKey = `autotask:${row.ezeeReservationNo}:arrival_verify`;
  if ((await findTaskByRequestKey(deps.db, requestKey)) !== null) {
    return skip(deps, reservationNo, 'already_created');
  }

  const summary = sanitiseInline(
    `verify before arrival: ${pastIssues.map((f) => f.content).join('; ')}`,
    SUMMARY_MAX,
  );
  // Overflow past the 120-char card summary is preserved in detail, so nothing a
  // guest flagged is lost to truncation.
  const detail =
    pastIssues.length > 1 ? pastIssues.map((f) => `• ${f.content}`).join('\n') : null;
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

function firstNameOf(name: string | null): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first === undefined || first === '' ? null : first;
}
