/**
 * The 60s eZee bookings poller (plan.md §2.3 / CH-10 steps 4+6). Control
 * flow per reservation: normalize → ONE transaction {diff-aware mirror
 * upsert → booking.* event on the SAME tx (§3.4) → guest-stay link} →
 * collect for the batched ACK. ONLY committed items are ACKed — a failed
 * transaction leaves the reservation queued at eZee (at-least-once), and a
 * redelivery diffs to 'unchanged', re-ACKs, emits nothing.
 *
 * Reservations process BEFORE cancels so a same-poll book+cancel ends
 * cancelled. Failure telemetry: auth-class envelope errors (creds never
 * self-heal) alert immediately, once, until recovery; transient failures
 * alert on the 5th consecutive (plan CH-10 security note). Counter state is
 * in-process — a deploy resets it (documented; the next failure run re-arms).
 */
import type { PgBoss } from 'pg-boss';
import { type BookingMirror, findCancelTarget, insertCancelStub, linkStayByPhone, markBookingCancelled, upsertMirrorRow } from '../db/bookings.js';
import type { Db } from '../db/client.js';
import { insertRawEvent, updateRawEvent } from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import { BOOKING_EVENT_QUEUES } from '../jobs/index.js';
import { sendInTx } from '../jobs/txSend.js';
import type { EzeeAckItem, EzeeClient } from './client.js';
import { eventKindForUpsert, normalizeCancel, normalizeReservation } from './normalize.js';
import { toArray, type EzeeCancelReservation, type EzeeReservation } from './types.js';

export interface PollerLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface EzeePollerDeps {
  db: Db;
  boss: PgBoss;
  client: EzeeClient;
  log: PollerLogger;
}

/** BKG-02/04 error table: unauthorized/inactive classes — non-transient. */
const AUTH_ERROR_CODES = new Set(['201', '202', '301', '302', '303']);
/** Plan CH-10 security note: "poller alerts ops after 5 consecutive failures". */
const FAILURE_ALERT_THRESHOLD = 5;

export interface EzeePoller {
  runPoll(): Promise<void>;
}

export function createEzeePoller(deps: EzeePollerDeps): EzeePoller {
  const { db, boss, client, log } = deps;
  let consecutiveFailures = 0;
  let transientAlerted = false;
  let authAlerted = false;

  function noteSuccess(): void {
    if (transientAlerted || authAlerted) {
      log.info({ consecutiveFailures }, '[ezee] poll recovered');
    }
    consecutiveFailures = 0;
    transientAlerted = false;
    authAlerted = false;
  }

  function noteTransientFailure(context: string, detail: Record<string, unknown>): void {
    consecutiveFailures += 1;
    log.warn({ context, consecutiveFailures, ...detail }, '[ezee] poll failure');
    if (consecutiveFailures >= FAILURE_ALERT_THRESHOLD && !transientAlerted) {
      transientAlerted = true; // alert on the transition, not every cycle
      void alertOps(log, {
        kind: 'ezee_poll_failing',
        summary: `eZee poll failing (${String(consecutiveFailures)} consecutive)`,
        detail: { context, ...detail },
      });
    }
  }

  function noteAuthFailure(context: string, errorCode: string): void {
    if (authAlerted) return; // creds never self-heal — one alert until recovery
    authAlerted = true;
    void alertOps(log, {
      kind: 'ezee_auth_failed',
      summary: 'eZee rejected our credentials — rotate/verify EZEE_* (runbook)',
      detail: { context, errorCode },
    });
  }

  /** Mirrors one reservation; returns the ACK item on commit, null on failure. */
  async function processReservation(reservation: EzeeReservation): Promise<EzeeAckItem | null> {
    const norm = normalizeReservation(reservation);
    if (norm.reservationNo === null || norm.row === null) {
      // Unkeyable — cannot upsert OR ack; eZee will redeliver forever, so be loud.
      void alertOps(log, {
        kind: 'ezee_unackable_reservation',
        summary: 'eZee reservation without a UniqueID — cannot mirror or ACK',
        detail: { issues: norm.issues },
      });
      return null;
    }
    const reservationNo = norm.reservationNo;
    const row = norm.row;
    for (const issue of norm.issues) {
      // Anomalies a human should see (ids only, §3.3): multi-room payloads
      // and statuses the mapping refused to guess at.
      if (issue.startsWith('multi_tran')) {
        void alertOps(log, {
          kind: 'ezee_multi_tran_reservation',
          summary: 'multi-room eZee reservation — typed columns carry the first tran only',
          detail: { reservationNo, issue },
        });
      } else if (issue.startsWith('unknown_status') || issue.startsWith('unconfirmed_hold')) {
        void alertOps(log, {
          kind: 'ezee_unknown_status',
          summary: 'eZee status outside the mapping — mirrored as unknown',
          detail: { reservationNo, issue },
        });
      }
    }
    try {
      await db.transaction(async (tx) => {
        const outcome = await upsertMirrorRow(tx, row);
        const kind = eventKindForUpsert(outcome, norm.ackStatus);
        if (kind !== null) {
          await sendInTx(boss, tx, BOOKING_EVENT_QUEUES[kind], { reservationNo });
        }
        if (row.guestPhone !== null) {
          await linkStayByPhone(tx, outcome.row.id, row.guestPhone);
        }
      });
    } catch (error) {
      log.error(
        { reservationNo, err: summarizeError(error) },
        '[ezee] reservation mirror tx failed — left un-ACKed for redelivery',
      );
      return null;
    }
    return { bookingId: reservationNo, pmsBookingId: reservationNo, status: norm.ackStatus };
  }

  /** Applies one cancel entry; returns the ACK item on commit, null on failure. */
  async function processCancel(entry: EzeeCancelReservation): Promise<EzeeAckItem | null> {
    const norm = normalizeCancel(entry);
    if (norm.uniqueId === null) {
      void alertOps(log, {
        kind: 'ezee_unackable_reservation',
        summary: 'eZee cancel entry without a UniqueID — cannot apply or ACK',
        detail: { issues: norm.issues },
      });
      return null;
    }
    const uniqueId = norm.uniqueId;
    try {
      await db.transaction(async (tx) => {
        const target = await findCancelTarget(tx, uniqueId);
        if (target === null) {
          // Booked+cancelled between polls, or pre-mirror history: keep the
          // evidence as a keyable tombstone (verbatim id — never invented).
          await insertCancelStub(tx, uniqueId, entry);
          await sendInTx(boss, tx, BOOKING_EVENT_QUEUES.cancelled, { reservationNo: uniqueId });
          return;
        }
        if (target.match === 'base' && countTrans(target.row) > 1) {
          // A suffixed cancel is a PER-ROOM cancel (BKG-02: one entry per
          // cancelled room, distinct VoucherNos). The reservation still
          // lives for the other room(s) — never blanket-cancel; a human
          // resolves it (FetchSingleBooking re-sync is a CH-11 candidate).
          void alertOps(log, {
            kind: 'ezee_partial_cancel_suspect',
            summary: 'per-room cancel against a multi-room reservation — status NOT flipped',
            detail: { uniqueId, reservationNo: target.row.ezeeReservationNo },
          });
          return;
        }
        const result = await markBookingCancelled(tx, target.row.ezeeReservationNo);
        if (result.outcome === 'cancelled') {
          await sendInTx(boss, tx, BOOKING_EVENT_QUEUES.cancelled, {
            reservationNo: target.row.ezeeReservationNo,
          });
        }
      });
    } catch (error) {
      log.error(
        { uniqueId, err: summarizeError(error) },
        '[ezee] cancel tx failed — left un-ACKed for redelivery',
      );
      return null;
    }
    // ACK echoes the EXACT delivered id — suffix intact (BKG-04 keys their
    // queue by what they sent, not by our base match).
    return { bookingId: uniqueId, pmsBookingId: uniqueId, status: norm.ackStatus };
  }

  async function runPoll(): Promise<void> {
    const outcome = await client.fetchPendingBookings();
    if (outcome.status === 'unreachable') {
      noteTransientFailure('fetch', {});
      return;
    }
    if (outcome.status === 'ezee_error') {
      if (AUTH_ERROR_CODES.has(outcome.errorCode)) {
        noteAuthFailure('fetch', outcome.errorCode);
      } else {
        noteTransientFailure('fetch', { errorCode: outcome.errorCode });
      }
      return;
    }
    noteSuccess();
    if (outcome.reservations.length === 0 && outcome.cancels.length === 0) return;

    // Audit BEFORE processing (§2.2 convention); payload is already
    // PII-scrubbed at the client boundary. Empty polls are deliberately NOT
    // stored — 1,440 empty rows/day is noise, not audit (recorded deviation).
    const rawEvent = await insertRawEvent(db, {
      source: 'ezee',
      eventType: 'bookings_poll',
      payload: outcome.raw,
    });

    const acks: EzeeAckItem[] = [];
    const failed: string[] = [];
    for (const reservation of outcome.reservations) {
      const ack = await processReservation(reservation);
      if (ack !== null) acks.push(ack);
      else failed.push(str(reservation.UniqueID) ?? 'unkeyed');
    }
    for (const entry of outcome.cancels) {
      const ack = await processCancel(entry);
      if (ack !== null) acks.push(ack);
      else failed.push(str(entry.UniqueID) ?? 'unkeyed');
    }

    if (acks.length > 0) {
      const ackResult = await client.ackBookings(acks);
      if (ackResult.status === 'ok') {
        log.info(
          { acked: acks.length, reservations: outcome.reservations.length, cancels: outcome.cancels.length },
          '[ezee] poll processed',
        );
      } else if (ackResult.status === 'ezee_error' && AUTH_ERROR_CODES.has(ackResult.errorCode)) {
        noteAuthFailure('ack', ackResult.errorCode);
      } else {
        // Committed rows redeliver next poll, diff to 'unchanged', re-ACK —
        // no duplicate events; counts toward the same failure ladder.
        noteTransientFailure('ack', {
          errorCode: ackResult.status === 'ezee_error' ? ackResult.errorCode : 'unreachable',
        });
      }
    }

    await updateRawEvent(db, rawEvent.id, {
      processed: true,
      error: failed.length === 0 ? null : `${String(failed.length)} item(s) not ACKed: ${failed.join(', ')}`,
    });
  }

  return { runPoll };
}

function countTrans(row: BookingMirror): number {
  const raw = row.raw as { BookingTran?: unknown } | null;
  return toArray(raw?.BookingTran as never).length;
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
