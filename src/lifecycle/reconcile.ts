/**
 * The hourly reconciliation sweep (CH-12, plan §8 step 4 + §3.4's atomicity net).
 *
 * Booking events are enqueued in the same transaction as the mirror upsert, so
 * an event cannot be lost without the booking being lost too. But pg-boss jobs
 * are retained for 14 days and a queue can be drained by a deploy, a purge or a
 * bug — so the mirror, which is the truth, is re-read hourly and anything with
 * no schedule is scheduled. The events are wake-ups; THIS is the safety net.
 *
 * 🚨 AND THIS IS THE ONE THAT CAN HURT SOMEONE.
 *
 * The sweep derives its work from `bookings_mirror` — which holds 123 HISTORICAL
 * bookings that CH-11's reconcile hydrated straight into it, plus every real
 * upcoming booking that existed before this chunk was written. That is precisely
 * why purging the queued booking.* jobs is NOT sufficient on its own: delete
 * them all, and the next run of this function re-creates the work from the
 * mirror within the hour, and a guest whose stay ended in March gets told we are
 * looking forward to welcoming them.
 *
 * So the sweep runs through the SAME gates as the event handler — it must, or it
 * is a hole straight through them. The gates are applied in the QUERY (cheap and
 * exact) and then again inside scheduleForBooking (correct by construction).
 * Belt and braces, on the one path where a mistake reaches a stranger.
 */
import { and, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { bookingsMirror } from '../db/schema.js';
import { scheduleForBooking, type SchedulerDeps } from './scheduler.js';

export interface ReconcileResult {
  considered: number;
  scheduled: number;
  skipped: number;
}

/** Bookings that pass every gate. Deliberately a mirror of gates.ts, in SQL. */
async function gatedBookings(deps: SchedulerDeps): Promise<string[]> {
  const { epoch, today, sources } = deps.gates;
  // An unset epoch means "we have no cutover", and the only safe reading of that
  // is "schedule nothing" — never "schedule everything" (gates.ts, passesEpoch).
  if (epoch === undefined) return [];
  if (sources.length === 0) return [];

  const rows = await deps.db
    .select({ reservationNo: bookingsMirror.ezeeReservationNo })
    .from(bookingsMirror)
    .where(
      and(
        gte(bookingsMirror.createdAt, epoch), // GATE 1 — epoch
        inArray(bookingsMirror.status, ['confirmed', 'modified']), // GATE 3 — status
        gte(bookingsMirror.checkIn, today), // GATE 2 — date
        // GATE 4 — source. inArray over the normalised expression, NOT `= ANY`:
        // drizzle expands a JS array into separate bind params, which Postgres
        // rejects on the right of ANY (42809).
        inArray(sql`lower(btrim(${bookingsMirror.source}))`, [...sources]),
        isNotNull(bookingsMirror.guestPhone),
      ),
    );
  return rows.map((r) => r.reservationNo);
}

/**
 * Re-derive the schedule from the mirror.
 *
 * WHY it calls scheduleForBooking directly instead of re-emitting booking.*
 * events (plan CH-12 step 4 says "re-emit"): scheduleForBooking IS the handler
 * those events run, and it is idempotent — so the effect is identical. Going
 * through the queue would instead invent new booking.* jobs in the very queue
 * this chunk has a hard precondition to keep clean, and would make the sweep's
 * own log unreadable. Recorded as a deviation in progress.md.
 */
export async function runReconcile(deps: SchedulerDeps): Promise<ReconcileResult> {
  const reservationNos = await gatedBookings(deps);
  const result: ReconcileResult = { considered: reservationNos.length, scheduled: 0, skipped: 0 };

  for (const reservationNo of reservationNos) {
    try {
      const outcome = await scheduleForBooking(deps, reservationNo);
      if (outcome.scheduled > 0) result.scheduled += 1;
      else result.skipped += 1;
    } catch (error) {
      result.skipped += 1;
      deps.log.error(
        { reservationNo },
        `[lifecycle] reconcile failed for one booking: ${String(error)}`,
      );
    }
  }

  deps.log.info({ ...result }, '[lifecycle] reconcile sweep');
  return result;
}
