/**
 * CH-10 normalisation fixture battery (plan.md CH-10 tests: new/modified/
 * cancelled, masked phone, missing fields) — pure, runs without Postgres.
 * Fixtures are authored from docs/ezee/04_bookings.md examples, scrubbed.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BookingMirror, UpsertMirrorOutcome } from '../src/db/bookings.js';
import {
  eventKindForUpsert,
  mapStatus,
  normalizeCancel,
  normalizeReservation,
} from '../src/ezee/normalize.js';
import { parseBookingsEnvelope, type EzeeReservation } from '../src/ezee/types.js';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/ezee/${name}`, import.meta.url), 'utf8'));
}

function firstReservation(name: string): EzeeReservation {
  const { reservations } = parseBookingsEnvelope(loadFixture(name));
  const first = reservations[0];
  if (first === undefined) throw new Error(`fixture ${name} has no reservations`);
  return first;
}

describe('normalizeReservation — new booking', () => {
  const reservation = firstReservation('bookings-new.json');
  const result = normalizeReservation(reservation);

  it('maps the typed columns from the transaction, verbatim where money/dates', () => {
    expect(result.reservationNo).toBe('11241254');
    expect(result.row?.status).toBe('confirmed');
    expect(result.row?.checkIn).toBe('2027-01-05');
    expect(result.row?.checkOut).toBe('2027-01-07');
    expect(result.row?.amount).toBe('976.00'); // TotalAmountAfterTax verbatim
    expect(result.row?.currency).toBe('INR');
    expect(result.row?.roomTypeId).toBe('5220300000000000003');
    expect(result.row?.roomTypeName).toBe('Nistula Villa');
    expect(result.row?.rateplanId).toBe('123400000000000006');
    expect(result.row?.source).toBe('Internet Booking Engine');
    expect(result.row?.ezeeBookingTranId).toBe('123400000000001902');
    expect(result.ackStatus).toBe('New');
  });

  it('trims and collapses the guest name (doc payloads carry padding)', () => {
    expect(result.row?.guestName).toBe('Test GuestOne');
  });

  it('prefers the transaction phone over the masked reservation-level one', () => {
    expect(result.row?.guestPhone).toBe('+917700900405');
  });

  it('takes pax as the max over RentalInfo entries', () => {
    expect(result.row?.adults).toBe(4);
    expect(result.row?.children).toBe(2);
  });

  it('keeps the whole (scrubbed) reservation as raw', () => {
    expect(result.row?.raw).toBe(reservation);
  });
});

describe('normalizeReservation — status handling', () => {
  it('CurrentStatus wins when recognised', () => {
    const reservation = firstReservation('bookings-new.json');
    const tran = (reservation.BookingTran as Record<string, unknown>[])[0] ?? {};
    const arrived = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, CurrentStatus: 'Arrived' }],
    });
    expect(arrived.row?.status).toBe('checked_in');
  });

  it('an unrecognised CurrentStatus falls through to the Status verb', () => {
    const reservation = firstReservation('bookings-new.json');
    const tran = (reservation.BookingTran as Record<string, unknown>[])[0] ?? {};
    const odd = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, CurrentStatus: 'Reserved' }],
    });
    expect(odd.row?.status).toBe('confirmed');
  });

  it('New with IsConfirmed 0 is an unconfirmed hold — unknown, never confirmed', () => {
    const reservation = firstReservation('bookings-new.json');
    const tran = (reservation.BookingTran as Record<string, unknown>[])[0] ?? {};
    const hold = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, IsConfirmed: '0' }],
    });
    expect(hold.row?.status).toBe('unknown');
    expect(hold.issues.some((i) => i.startsWith('unconfirmed_hold'))).toBe(true);
  });

  it('a Modify payload maps modified with the verbatim ack echo', () => {
    const result = normalizeReservation(firstReservation('bookings-modified.json'));
    expect(result.row?.status).toBe('modified');
    expect(result.ackStatus).toBe('Modify');
    expect(result.row?.checkOut).toBe('2027-01-08');
  });

  it('a junk status maps unknown with the anomaly named, never throws', () => {
    const reservation = firstReservation('bookings-new.json');
    const tran = (reservation.BookingTran as Record<string, unknown>[])[0] ?? {};
    const junk = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, Status: 'Hold' }],
    });
    expect(junk.row?.status).toBe('unknown');
    expect(junk.issues).toContain('unknown_status:Hold/absent');
    expect(junk.ackStatus).toBeUndefined();
  });
});

describe('mapStatus table', () => {
  it.each([
    ['New', '1', undefined, 'confirmed'],
    ['New', '0', undefined, 'unknown'],
    ['New', undefined, undefined, 'unknown'],
    ['Modify', '1', undefined, 'modified'],
    // An EDITED unconfirmed hold is still a hold — never a live status
    // (pre-push audit DEFECT: the gate must cover both change verbs).
    ['Modify', '0', undefined, 'unknown'],
    ['Modify', undefined, undefined, 'unknown'],
    ['Cancel', '1', undefined, 'cancelled'],
    ['Cancel', '0', undefined, 'cancelled'],
    ['New', '1', 'Arrived', 'checked_in'],
    ['New', '1', 'CheckedIn', 'checked_in'],
    ['Modify', '1', 'Checked Out', 'checked_out'],
    ['New', '1', 'No Show', 'no_show'],
    ['New', '1', 'Void', 'cancelled'],
    ['Modify', '1', 'Cancel', 'cancelled'],
    [undefined, undefined, undefined, 'unknown'],
  ] as const)('Status=%s IsConfirmed=%s CurrentStatus=%s → %s', (s, c, cur, expected) => {
    expect(mapStatus(s, c, cur).status).toBe(expected);
  });
});

describe('normalizeReservation — degraded payloads', () => {
  it('missing fields become nulls plus named issues; the row stays keyable', () => {
    const result = normalizeReservation(firstReservation('bookings-missing-fields.json'));
    expect(result.reservationNo).toBe('11241500');
    expect(result.row?.checkIn).toBeNull();
    expect(result.row?.checkOut).toBeNull();
    expect(result.row?.adults).toBeNull();
    expect(result.row?.guestEmail).toBeNull();
    expect(result.row?.amount).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining(['missing_rentalinfo', 'missing_dates', 'no_usable_phone']),
    );
    // Tran fields empty → falls back to the reservation-level booker name.
    expect(result.row?.guestName).toBe('Test GuestFour');
  });

  it('a masked-everywhere phone lands null (OTA case, §5.2)', () => {
    const result = normalizeReservation(firstReservation('bookings-missing-fields.json'));
    expect(result.row?.guestPhone).toBeNull();
  });

  it('a missing UniqueID is unkeyable — null row, one issue', () => {
    const result = normalizeReservation({ BookingTran: [{ Status: 'New' }] });
    expect(result.reservationNo).toBeNull();
    expect(result.row).toBeNull();
    expect(result.issues).toEqual(['missing_unique_id']);
  });

  it('multi-tran takes the FIRST tran and names the anomaly', () => {
    const result = normalizeReservation(firstReservation('bookings-multi-tran.json'));
    expect(result.issues).toContain('multi_tran:2');
    expect(result.row?.roomTypeName).toBe('Nistula Villa'); // first tran
    expect(result.row?.amount).toBe('90000.00'); // first tran only — never summed
  });

  it('an intl phone with spaces normalises; single-object envelopes tolerate', () => {
    const { reservations, cancels } = parseBookingsEnvelope(loadFixture('bookings-mixed.json'));
    expect(reservations).toHaveLength(1);
    expect(cancels).toHaveLength(1);
    const result = normalizeReservation(reservations[0] as EzeeReservation);
    expect(result.row?.guestPhone).toBe('+12345678901');
    expect(result.row?.adults).toBe(2); // RentalInfo as a bare object
  });
});

describe('physical room label', () => {
  it('maps a known RoomID to the canonical villa label', () => {
    const result = normalizeReservation(firstReservation('fetch-single-booking.json'));
    expect(result.row?.physicalRoomLabel).toBe('Villa B3');
    expect(result.row?.status).toBe('checked_in'); // CurrentStatus Arrived
  });

  it('falls back to the verbatim RoomName for an unmapped RoomID, else null', () => {
    const reservation = firstReservation('fetch-single-booking.json');
    const tran = (reservation.BookingTran as Record<string, unknown>[])[0] ?? {};
    const unmapped = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, RoomID: '999', RoomName: '101', RentalInfo: [] }],
    });
    expect(unmapped.row?.physicalRoomLabel).toBe('101');
    const neither = normalizeReservation({
      ...reservation,
      BookingTran: [{ ...tran, RoomID: '', RoomName: '', RentalInfo: [] }],
    });
    expect(neither.row?.physicalRoomLabel).toBeNull();
  });
});

describe('normalizeCancel', () => {
  it('keeps the delivered UniqueID verbatim — suffix intact for the ACK', () => {
    const { cancels } = parseBookingsEnvelope(loadFixture('bookings-cancel-only.json'));
    expect(cancels).toHaveLength(3);
    const first = normalizeCancel(cancels[0] ?? {});
    expect(first.uniqueId).toBe('11241008-1');
    expect(first.ackStatus).toBe('Cancel');
    expect(first.issues).toEqual([]);
  });

  it('a missing UniqueID is an issue, not a throw', () => {
    const result = normalizeCancel({ Status: 'Cancel' });
    expect(result.uniqueId).toBeNull();
    expect(result.issues).toEqual(['missing_unique_id']);
  });
});

describe('eventKindForUpsert', () => {
  const row = (status: BookingMirror['status']) => ({ status }) as BookingMirror;
  const created = (status: BookingMirror['status']): UpsertMirrorOutcome => ({
    outcome: 'created',
    row: row(status),
  });

  it('created is created — unless already cancelled, or a pre-mirror Modify', () => {
    expect(eventKindForUpsert(created('confirmed'), 'New')).toBe('created');
    expect(eventKindForUpsert(created('cancelled'), 'Cancel')).toBe('cancelled');
    // A never-mirrored booking arriving as Modify must NOT fire CH-12's full
    // confirmation cascade as if newly booked.
    expect(eventKindForUpsert(created('modified'), 'Modify')).toBe('modified');
  });

  it('modified/cancelled map through; unchanged emits nothing', () => {
    const before = row('confirmed');
    expect(
      eventKindForUpsert(
        {
          outcome: 'modified',
          row: row('modified'),
          before,
          changed: ['checkOut'],
          resurrectionBlocked: false,
        },
        'Modify',
      ),
    ).toBe('modified');
    expect(
      eventKindForUpsert(
        {
          outcome: 'cancelled',
          row: row('cancelled'),
          before,
          changed: ['status'],
          resurrectionBlocked: false,
        },
        undefined,
      ),
    ).toBe('cancelled');
    expect(
      eventKindForUpsert(
        { outcome: 'unchanged', row: row('confirmed'), resurrectionBlocked: false },
        'New',
      ),
    ).toBeNull();
  });
});
