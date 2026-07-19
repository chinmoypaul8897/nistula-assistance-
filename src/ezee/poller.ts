/**
 * The 60s eZee bookings poller (plan.md §2.3 / CH-10 steps 4+6). Control
 * flow per reservation: normalize → ONE transaction {diff-aware mirror
 * upsert → booking.* event on the SAME tx (§3.4) → guest-stay link} →
 * collect for the batched ACK. ONLY committed items are ACKed — a failed
 * transaction leaves the reservation queued at eZee (at-least-once), and a
 * redelivery diffs to 'unchanged', re-ACKs, emits nothing.
 *
 * Reservations process BEFORE cancels so a same-poll book+cancel ends
 * cancelled. Cancels process as SAME-BASE GROUPS: BKG-02 delivers a full
 * cancel of an N-room reservation as N suffixed entries ('12345228-1',
 * '-2') with no bare entry — judged one-by-one, a full cancel would be
 * ACKed away with nothing flipped (pre-push audit BLOCKER).
 *
 * Failure telemetry: auth-class envelope errors (creds never self-heal)
 * alert immediately, once, until recovery; transient failures — fetch, ACK,
 * per-item tx failures, or a thrown cycle — count ONE per cycle and alert on
 * the 5th consecutive (plan CH-10 security note). The ladder resets only on
 * a fully-clean cycle, AFTER the ACK (an early reset made persistent ACK
 * failures unalertable — audit DEFECT). Counter state is in-process — a
 * deploy resets it (documented; the next failing cycle re-arms).
 */
import type { PgBoss } from 'pg-boss';
import {
  findCancelTarget,
  insertCancelStub,
  linkStayByPhone,
  markBookingCancelled,
  upsertMirrorRow,
  type BookingMirror,
} from '../db/bookings.js';
import type { Db } from '../db/client.js';
import { insertRawEvent, updateRawEvent } from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps } from '../ops/alerts.js';
import { noteHeartbeat } from '../ops/heartbeat.js';
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

interface CancelGroupItem {
  entry: EzeeCancelReservation;
  uniqueId: string;
  ackStatus: string | undefined;
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
        if (outcome.outcome !== 'created' && outcome.resurrectionBlocked) {
          // The cancel was ACKed away — nothing at eZee will correct this
          // row again. Status stays cancelled; a human owns the conflict.
          void alertOps(log, {
            kind: 'ezee_cancel_conflict',
            summary: 'live payload for a cancelled mirror row — status kept cancelled',
            detail: { reservationNo },
          });
        } else {
          const kind = eventKindForUpsert(outcome, norm.ackStatus);
          if (kind !== null) {
            await sendInTx(boss, tx, BOOKING_EVENT_QUEUES[kind], { reservationNo });
          }
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

  /**
   * Applies one SAME-BASE group of cancel entries in one tx; returns the ACK
   * items on commit, null on failure. Group semantics (audit BLOCKER fix):
   * a full cancel of an N-room reservation arrives as N suffixed entries —
   * flip when the group covers every tran; fewer entries than trans is the
   * TRUE partial case (reservation lives for the other rooms): no flip, ops
   * alert, still ACK (a human owns it; a partial spread across polls stays
   * on this alert path and never silently cancels — recorded residual).
   */
  async function processCancelGroup(items: CancelGroupItem[]): Promise<EzeeAckItem[] | null> {
    const first = items[0];
    if (first === undefined) return [];
    try {
      await db.transaction(async (tx) => {
        const target = await findCancelTarget(tx, first.uniqueId);
        if (target === null) {
          // Booked+cancelled between polls, or pre-mirror history: keep the
          // evidence as keyable tombstones (verbatim ids — never invented).
          for (const item of items) {
            await insertCancelStub(tx, item.uniqueId, item.entry);
            await sendInTx(boss, tx, BOOKING_EVENT_QUEUES.cancelled, {
              reservationNo: item.uniqueId,
            });
          }
          // Guard the BASE key too (close-out audit — the original BLOCKER's
          // class by another route). Suffixed cancels tombstone under
          // '877-1..3', but the reservation itself keys on '877' and may still
          // arrive on a LATER poll — eZee really does deliver a cancel without
          // its create (observed live on booking 952). Without a cancelled row
          // under the base id, that create would land 'confirmed' and the
          // cancellation — already ACKed away, never redelivered — would be
          // lost forever. The base tombstone makes the resurrection guard fire.
          const base = first.uniqueId.replace(/-\d+$/, '');
          if (base !== first.uniqueId) {
            await insertCancelStub(tx, base, first.entry);
            await sendInTx(boss, tx, BOOKING_EVENT_QUEUES.cancelled, { reservationNo: base });
          }
          return;
        }
        const distinctIds = new Set(items.map((i) => i.uniqueId));
        if (target.match === 'base' && distinctIds.size < countTrans(target.row)) {
          void alertOps(log, {
            kind: 'ezee_partial_cancel_suspect',
            summary: 'per-room cancel covers only part of a multi-room reservation — status NOT flipped',
            detail: {
              reservationNo: target.row.ezeeReservationNo,
              cancelledRooms: distinctIds.size,
              rooms: countTrans(target.row),
            },
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
        { uniqueId: first.uniqueId, err: summarizeError(error) },
        '[ezee] cancel tx failed — left un-ACKed for redelivery',
      );
      return null;
    }
    // ACK echoes the EXACT delivered ids — suffixes intact (BKG-04 keys
    // their queue by what they sent, not by our base match).
    return items.map((item) => ({
      bookingId: item.uniqueId,
      pmsBookingId: item.uniqueId,
      status: item.ackStatus,
    }));
  }

  /** Same-base grouping: '11241008-1' and '11241008-2' resolve together. */
  function groupCancels(cancels: EzeeCancelReservation[]): {
    groups: CancelGroupItem[][];
    unkeyable: number;
  } {
    const byBase = new Map<string, Map<string, CancelGroupItem>>();
    let unkeyable = 0;
    for (const entry of cancels) {
      const norm = normalizeCancel(entry);
      if (norm.uniqueId === null) {
        unkeyable += 1;
        void alertOps(log, {
          kind: 'ezee_unackable_reservation',
          summary: 'eZee cancel entry without a UniqueID — cannot apply or ACK',
          detail: { issues: norm.issues },
        });
        continue;
      }
      const base = norm.uniqueId.replace(/-\d+$/, '');
      const group = byBase.get(base) ?? new Map<string, CancelGroupItem>();
      // Keyed by uniqueId: a duplicated entry must not inflate the room count.
      group.set(norm.uniqueId, { entry, uniqueId: norm.uniqueId, ackStatus: norm.ackStatus });
      byBase.set(base, group);
    }
    return { groups: [...byBase.values()].map((g) => [...g.values()]), unkeyable };
  }

  async function runPoll(): Promise<void> {
    // CH-17 (pre-merge review fix): beat the watchdog heartbeat on cron RUN, NOT
    // on eZee SUCCESS. The heartbeat answers "is our poll cron alive" — a wedged
    // or unscheduled cron stops beating and IS caught. It must NOT flip on an
    // eZee OUTAGE (a third party down): beating only on success inverted internal
    // health into a false dead-man ping + a false ops page on every routine eZee
    // blip. eZee reachability has its OWN ladder (ezee_poll_failing, 5 in a row).
    noteHeartbeat('poller');
    try {
      await runPollCycle();
    } catch (error) {
      // retryLimit 0 — nothing above retries within the cycle. Feed the
      // ladder so a deterministic throw (DB down mid-cycle) still alerts
      // instead of failing silently every 60s (audit DEFECT).
      noteTransientFailure('poll', { err: summarizeError(error) });
    }
  }

  async function runPollCycle(): Promise<void> {
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
    if (outcome.reservations.length === 0 && outcome.cancels.length === 0) {
      noteSuccess(); // a clean empty cycle resets the ladder
      return;
    }

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
    const { groups } = groupCancels(outcome.cancels);
    for (const group of groups) {
      const groupAcks = await processCancelGroup(group);
      if (groupAcks !== null) acks.push(...groupAcks);
      else failed.push(...group.map((i) => i.uniqueId));
    }

    // The ladder settles ONCE per cycle, after the ACK: auth failures flag
    // (never counted); otherwise an ACK failure outranks tx failures for the
    // context label; a fully-clean cycle resets everything.
    let cycleFailure: { context: string; detail: Record<string, unknown> } | null =
      failed.length > 0 ? { context: 'tx', detail: { failedCount: failed.length } } : null;
    let authFailedThisCycle = false;
    if (acks.length > 0) {
      const ackResult = await client.ackBookings(acks);
      if (ackResult.status === 'ok') {
        log.info(
          {
            acked: acks.length,
            reservations: outcome.reservations.length,
            cancels: outcome.cancels.length,
          },
          '[ezee] poll processed',
        );
      } else if (ackResult.status === 'ezee_error' && AUTH_ERROR_CODES.has(ackResult.errorCode)) {
        noteAuthFailure('ack', ackResult.errorCode);
        authFailedThisCycle = true;
      } else {
        // Committed rows redeliver next poll, diff to 'unchanged', re-ACK —
        // no duplicate events; counts toward the same failure ladder.
        cycleFailure = {
          context: 'ack',
          detail: {
            errorCode: ackResult.status === 'ezee_error' ? ackResult.errorCode : 'unreachable',
          },
        };
      }
    }

    await updateRawEvent(db, rawEvent.id, {
      processed: true,
      error:
        failed.length === 0
          ? null
          : `${String(failed.length)} item(s) not ACKed: ${failed.join(', ')}`,
    });

    if (cycleFailure !== null) {
      noteTransientFailure(cycleFailure.context, cycleFailure.detail);
    } else if (!authFailedThisCycle) {
      noteSuccess();
    }
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
