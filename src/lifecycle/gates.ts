/**
 * The four fail-closed gates every booking must pass before a single lifecycle
 * message is scheduled (CH-12, Paul-approved).
 *
 * WHY this file exists at all. CH-12 is the first chunk where the system SPEAKS
 * FIRST. Every prior chunk only ever replied to a guest who had messaged us, so
 * a bug meant a bad answer; here a bug means an unprompted WhatsApp to a
 * stranger about a stay that may be months dead. The gates are pure predicates,
 * separated from the scheduler, so they can be proven exhaustively in a table
 * test with no database and no clock.
 *
 * These are DEFAULTS STANDING IN FOR BUSINESS ANSWERS WE DO NOT HAVE (the
 * standing rule: build the tech, fail closed, ask the business once). Each gate
 * names the question it is standing in for. When an answer lands, the gate
 * relaxes — it does not get deleted.
 *
 * Measured against production on 2026-07-14, which is why every one of them
 * earns its keep:
 *   - 83 un-consumed booking.* jobs were queued (and the count GROWS daily).
 *   - The mirror held 124 checked_out + 50 cancelled + 24 confirmed rows.
 *   - 22 bookings were live-status and arriving today or later — and 12 of them
 *     were Airbnb/Booking.com guests WITH REAL, UNMASKED PHONE NUMBERS.
 * That last number is the whole argument. The comfortable belief was that OTA
 * numbers are masked and therefore harmless; makemytrip and go-mmt do mask
 * them, but Airbnb and Booking.com do not. Without the SOURCE gate the first
 * thing this system would ever do in the world is message twelve real people
 * whose consent nobody has given us (docs/team-questions.md Q13).
 */
import type { BookingMirror } from '../db/bookings.js';

/** Why a booking was refused lifecycle. Recorded, never guessed at later. */
export type SkipReason =
  | 'before_epoch'
  | 'stay_in_past'
  | 'status_not_live'
  | 'source_not_allowed'
  | 'no_phone';

export interface GateContext {
  /** Bookings first MIRRORED before this instant get no lifecycle. Undefined ⇒
   * nothing qualifies (fail-closed: an unset epoch must never mean "all"). */
  epoch: Date | undefined;
  /** Today in IST, 'YYYY-MM-DD' — compared against check_in as a STRING, because
   * eZee dates are strings end to end and must never be new Date()-ed. */
  today: string;
  /** Lower-cased source allowlist. */
  sources: readonly string[];
}

export type GateResult = { ok: true } | { ok: false; reason: SkipReason };

/**
 * GATE 1 — EPOCH. The booking must have entered OUR mirror at or after the
 * cutover instant.
 *
 * This is the gate that neutralises history. CH-11's reconcile hydrated 123
 * historical bookings straight into the mirror, and the mirror — not the event
 * stream — is what the hourly sweep re-derives from (§3.4). So a purge of the
 * queued jobs alone would be undone within the hour. The epoch is the only
 * defence that survives the sweep, because it is a property of the ROW, not of
 * the event that woke us.
 *
 * WHY an instant and not a date: every mirror row in production was created on
 * 13–14 Jul, 134 of them on the cutover day itself. A date-granular epoch would
 * have let all 134 through.
 */
export function passesEpoch(row: BookingMirror, epoch: Date | undefined): boolean {
  if (epoch === undefined) return false;
  return row.createdAt.getTime() >= epoch.getTime();
}

/**
 * GATE 2 — DATE. The stay must not already be over.
 *
 * Belt to the epoch's braces, and mandated in its own right by the CH-10/CH-11
 * hand-off. A guest whose stay ended in March must never be told we look
 * forward to welcoming them. Null check_in (a cancel tombstone) fails closed.
 */
export function passesDate(row: BookingMirror, today: string): boolean {
  if (row.checkIn === null) return false;
  return row.checkIn >= today;
}

/**
 * GATE 3 — STATUS. eZee must actually have confirmed the booking.
 *
 * `unknown` is how normalize.ts maps an unconfirmed hold (IsConfirmed !== '1'),
 * so this is what stops us congratulating someone on a booking that does not
 * exist yet. `checked_out` — 124 rows in production, all hydrated by CH-11's
 * reconcile — is excluded here too: the stay is over, there is no lifecycle
 * left to run.
 *
 * WHY the predicate is written from the SENTENCE and not from the enum: the
 * recurring failure class in this codebase, now six deep, is a rule written by
 * listing the values that were forbidden rather than the values that are
 * allowed. This is an ALLOWLIST. A new eZee status appearing tomorrow gets no
 * lifecycle until a human decides it should.
 */
const LIFECYCLE_STATUSES: readonly BookingMirror['status'][] = ['confirmed', 'modified'];

export function passesStatus(row: BookingMirror): boolean {
  return LIFECYCLE_STATUSES.includes(row.status);
}

/**
 * GATE 4 — SOURCE. We may only message guests from channels the business has
 * sanctioned.
 *
 * Standing in for docs/team-questions.md Q13 — "are we allowed to WhatsApp
 * guests who booked through Airbnb or Booking.com?" — which is a 🔴 BLOCKER and
 * unanswered. The default allowlist is direct-only. Until someone at Nistula
 * says yes, an OTA guest gets nothing from us, and that is a DECISION rather
 * than the accident of a masked phone number.
 *
 * Compared case-insensitively: eZee's source strings are free text and have
 * already been seen as 'Internet Booking Engine', 'Walk-in', 'Airbnb',
 * 'Booking.com', 'makemytrip', 'go-mmt'. A null source fails closed.
 */
export function passesSource(row: BookingMirror, sources: readonly string[]): boolean {
  if (row.source === null) return false;
  return sources.includes(row.source.trim().toLowerCase());
}

/** A booking with no phone cannot be messaged at all — no rows, and the morning
 * digest (CH-14b) surfaces it so a human can pick it up. Not a failure: OTA
 * channels legitimately mask numbers, and 7 of production's 22 future arrivals
 * have none. */
export function hasPhone(row: BookingMirror): boolean {
  return row.guestPhone !== null && row.guestPhone.trim() !== '';
}

/**
 * All four gates plus the phone check, in the order that makes an ops log read
 * most usefully (cheapest and most decisive first). Returns the FIRST failure —
 * a booking rejected for several reasons is reported by the most fundamental.
 */
export function checkGates(row: BookingMirror, ctx: GateContext): GateResult {
  if (!passesEpoch(row, ctx.epoch)) return { ok: false, reason: 'before_epoch' };
  if (!passesStatus(row)) return { ok: false, reason: 'status_not_live' };
  if (!passesDate(row, ctx.today)) return { ok: false, reason: 'stay_in_past' };
  if (!passesSource(row, ctx.sources)) return { ok: false, reason: 'source_not_allowed' };
  if (!hasPhone(row)) return { ok: false, reason: 'no_phone' };
  return { ok: true };
}
