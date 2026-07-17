/**
 * CH-12 · the four gates — the safety core of the first chunk that speaks first.
 *
 * These tests are deliberately written against the SHAPE OF PRODUCTION as
 * measured on 2026-07-14, not against invented rows: 83 queued booking.* jobs,
 * a mirror of 124 checked_out + 50 cancelled + 24 confirmed, and — the one that
 * matters — 12 real Airbnb/Booking.com guests arriving soon WITH UNMASKED PHONE
 * NUMBERS. Every gate below is the thing standing between those twelve people
 * and a WhatsApp message nobody authorised.
 *
 * Each gate is tested for what it ALLOWS, then for what it refuses. A gate that
 * only ever gets tested on its happy path is not a gate.
 */
import { describe, expect, it } from 'vitest';
import type { BookingMirror } from '../src/db/bookings.js';
import {
  checkGates,
  hasPhone,
  passesDate,
  passesEpoch,
  passesSource,
  passesStatus,
  passesTaskGate,
  type GateContext,
} from '../src/lifecycle/gates.js';

const TODAY = '2026-07-14';
const EPOCH = new Date('2026-07-14T12:00:00Z');
const SOURCES = ['internet booking engine', 'walk-in'];

const CTX: GateContext = { epoch: EPOCH, today: TODAY, sources: SOURCES };

function row(over: Partial<BookingMirror> = {}): BookingMirror {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    ezeeReservationNo: '953',
    ezeeBookingTranId: '5220300000000000900',
    guestName: 'Rahul Mehta',
    guestPhone: '+917700900501',
    guestEmail: 'rahul@example.test',
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: null,
    rateplanId: '5220300000000000006',
    checkIn: '2026-08-26',
    checkOut: '2026-08-28',
    adults: 4,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: '13854.75',
    currency: 'INR',
    raw: {},
    syncedAt: new Date('2026-07-14T13:00:00Z'),
    createdAt: new Date('2026-07-14T13:00:00Z'), // after EPOCH
    updatedAt: new Date('2026-07-14T13:00:00Z'),
    ...over,
  } as BookingMirror;
}

describe('gate 1 — epoch (the one that survives the hourly sweep)', () => {
  it('admits a booking mirrored after the cutover instant', () => {
    expect(passesEpoch(row(), EPOCH)).toBe(true);
  });

  it('refuses the 123 historical rows CH-11 reconciled into the mirror', () => {
    expect(passesEpoch(row({ createdAt: new Date('2026-07-13T05:00:00Z') }), EPOCH)).toBe(false);
  });

  it('refuses rows mirrored EARLIER THE SAME DAY — the epoch is an instant, not a date', () => {
    // 134 of production's rows were created on the cutover day itself. A
    // date-granular epoch would have let every one of them through.
    expect(passesEpoch(row({ createdAt: new Date('2026-07-14T06:00:00Z') }), EPOCH)).toBe(false);
  });

  it('admits a row created exactly ON the epoch (boundary is inclusive)', () => {
    expect(passesEpoch(row({ createdAt: EPOCH }), EPOCH)).toBe(true);
  });

  it('FAILS CLOSED when the epoch is unset — never treats "no epoch" as "all"', () => {
    expect(passesEpoch(row(), undefined)).toBe(false);
    expect(checkGates(row(), { ...CTX, epoch: undefined })).toEqual({
      ok: false,
      reason: 'before_epoch',
    });
  });
});

describe('gate 2 — date', () => {
  it('admits a future arrival', () => {
    expect(passesDate(row({ checkIn: '2026-08-26' }), TODAY)).toBe(true);
  });

  it('admits an arrival TODAY (a same-day booking still gets its welcome)', () => {
    expect(passesDate(row({ checkIn: TODAY }), TODAY)).toBe(true);
  });

  it('refuses a stay that already started', () => {
    expect(passesDate(row({ checkIn: '2026-03-02' }), TODAY)).toBe(false);
  });

  it('refuses a cancel tombstone (null check_in) rather than throwing', () => {
    expect(passesDate(row({ checkIn: null }), TODAY)).toBe(false);
  });
});

describe('gate 3 — status (an allowlist, not a denylist)', () => {
  it.each([
    ['confirmed', true],
    ['modified', true],
    ['cancelled', false],
    ['checked_out', false], // 124 rows in production — the stay is over
    ['checked_in', false],
    ['no_show', false],
    ['unknown', false], // an unconfirmed hold: never congratulate it
  ] as const)('status %s → %s', (status, expected) => {
    expect(passesStatus(row({ status }))).toBe(expected);
  });
});

describe('gate 4 — source (the fail-closed answer to Q13)', () => {
  it.each([
    ['Internet Booking Engine', true],
    ['Walk-in', true],
    ['walk-in', true], // case-insensitive: eZee's source strings are free text
    ['  Walk-in  ', true], // and whitespace-sloppy
  ] as const)('allows sanctioned source %s', (source, expected) => {
    expect(passesSource(row({ source }), SOURCES)).toBe(expected);
  });

  it.each(['Airbnb', 'Booking.com', 'makemytrip', 'go-mmt'])(
    'REFUSES OTA source %s until the business answers Q13',
    (source) => {
      expect(passesSource(row({ source }), SOURCES)).toBe(false);
    },
  );

  it('refuses a null source rather than defaulting it open', () => {
    expect(passesSource(row({ source: null }), SOURCES)).toBe(false);
  });

  it('THE ONE THAT MATTERS: an Airbnb guest with a real phone, arriving soon, is refused', () => {
    // This is not hypothetical. Production held 8 such Airbnb bookings and 4
    // Booking.com ones, all with unmasked numbers, all arriving today or later.
    // The masked-number "protection" people assumed exists does not.
    const airbnbGuest = row({
      source: 'Airbnb',
      guestPhone: '+917700900777',
      checkIn: '2026-07-20',
      status: 'confirmed',
      createdAt: new Date('2026-07-14T13:00:00Z'),
    });
    expect(hasPhone(airbnbGuest)).toBe(true); // reachable...
    expect(checkGates(airbnbGuest, CTX)).toEqual({
      ok: false,
      reason: 'source_not_allowed', // ...and refused anyway, by decision.
    });
  });
});

describe('phone presence', () => {
  it('accepts an E.164 number', () => {
    expect(hasPhone(row())).toBe(true);
  });

  it.each([null, '', '   '])('treats %s as unreachable', (guestPhone) => {
    expect(hasPhone(row({ guestPhone }))).toBe(false);
  });

  it('refuses a masked-OTA booking with no phone — no rows, digest surfaces it', () => {
    const mmt = row({ source: 'Walk-in', guestPhone: null });
    expect(checkGates(mmt, CTX)).toEqual({ ok: false, reason: 'no_phone' });
  });
});

describe('checkGates — all four together', () => {
  it('admits a clean direct booking', () => {
    expect(checkGates(row(), CTX)).toEqual({ ok: true });
  });

  it('reports the most fundamental reason when several gates fail', () => {
    // Historical AND cancelled AND OTA: epoch is the one that explains it.
    const doomed = row({
      createdAt: new Date('2026-07-13T05:00:00Z'),
      status: 'cancelled',
      source: 'Airbnb',
      checkIn: '2026-01-01',
    });
    expect(checkGates(doomed, CTX)).toEqual({ ok: false, reason: 'before_epoch' });
  });

  it('THE PRODUCTION SHAPE: nothing that existed before CH-12 can ever be scheduled', () => {
    // Every mirror row in production was created on 13–14 Jul. With the epoch
    // set at cutover, the whole pre-existing mirror — historical, future,
    // confirmed, OTA, all of it — is inert. This single assertion is the reason
    // the 83-job backlog and the 123 hydrated rows cannot hurt anybody.
    const preExisting = [
      row({ status: 'checked_out', checkIn: '2026-03-01' }),
      row({ status: 'cancelled', checkIn: null }),
      row({ status: 'confirmed', source: 'Airbnb', checkIn: '2026-07-20' }),
      row({ status: 'confirmed', source: 'Booking.com', checkIn: '2026-08-02' }),
      row({ status: 'confirmed', source: 'Internet Booking Engine', checkIn: '2026-09-09' }),
    ].map((r) => ({ ...r, createdAt: new Date('2026-07-13T05:00:00Z') }) as BookingMirror);

    for (const r of preExisting) {
      expect(checkGates(r, CTX).ok).toBe(false);
    }
  });
});

describe('🚨 CH-13b — the TASK gate is a DIFFERENT question from the lifecycle gate (D9)', () => {
  const TASK_CTX = { epoch: EPOCH, today: TODAY };

  it('agrees with checkGates on epoch/date/status', () => {
    expect(passesTaskGate(row(), TASK_CTX).ok).toBe(true);
    expect(passesTaskGate(row({ createdAt: new Date('2026-07-13T05:00:00Z') }), TASK_CTX)).toEqual({
      ok: false,
      reason: 'before_epoch',
    });
    expect(passesTaskGate(row({ checkIn: '2026-03-01' }), TASK_CTX)).toEqual({
      ok: false,
      reason: 'stay_in_past',
    });
    expect(passesTaskGate(row({ status: 'cancelled', checkIn: null }), TASK_CTX)).toEqual({
      ok: false,
      reason: 'status_not_live', // status is checked before date — a cancel is not live
    });
    expect(passesTaskGate(row({ status: 'unknown' }), TASK_CTX)).toEqual({
      ok: false,
      reason: 'status_not_live',
    });
  });

  it('🚨 ADMITS an Airbnb booking that checkGates REFUSES on source — the whole point', () => {
    // OQ-20 forbids MESSAGING this guest; it does not stop us PREPARING their
    // room. A task reaches no guest, so the source gate must not apply to it.
    const airbnb = row({ source: 'Airbnb', checkIn: '2026-08-20' });
    expect(checkGates(airbnb, CTX)).toEqual({ ok: false, reason: 'source_not_allowed' });
    expect(passesTaskGate(airbnb, TASK_CTX).ok).toBe(true);
  });

  it('does not care about a missing phone — a task needs no number', () => {
    // hasPhone gates a MESSAGE; a task is internal. A booking with no phone (an
    // OTA row awaiting enrichment) still describes a room to prepare.
    const noPhone = row({ guestPhone: null });
    expect(checkGates(noPhone, CTX)).toEqual({ ok: false, reason: 'no_phone' });
    expect(passesTaskGate(noPhone, TASK_CTX).ok).toBe(true);
  });
});
