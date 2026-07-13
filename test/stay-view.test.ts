/**
 * CH-11 · the stay VIEW — the only door from a mirror row to words.
 *
 * The allowlist is the point: every status/date/room-count combination the
 * projection does not positively recognise must fail CLOSED. These tests are
 * the pin on that, and on the three things the module may never emit (money,
 * the eZee guest name/email, the meal plan).
 */
import { describe, expect, it } from 'vitest';
import type { BookingMirror } from '../src/db/bookings.js';
import {
  DESCRIBABLE_STATUSES,
  deriveStage,
  liveStays,
  needsHuman,
  project,
  projectAll,
  referenceBase,
  roomCount,
  selectStays,
  STAYS_RENDER_LIMIT,
  type StayView,
} from '../src/brain/stayView.js';

const TODAY = '2026-07-13';

function row(over: Partial<BookingMirror> = {}): BookingMirror {
  return {
    id: over.id ?? 'b0000000-0000-4000-8000-000000000001',
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
    syncedAt: new Date('2026-07-13T05:00:00Z'),
    createdAt: new Date('2026-07-13T05:00:00Z'),
    updatedAt: new Date('2026-07-13T05:00:00Z'),
    ...over,
  } as BookingMirror;
}

const solo = (r: BookingMirror): StayView => project(r, [r], TODAY);

describe('describable — the allowlist', () => {
  it.each(DESCRIBABLE_STATUSES)('describes a %s booking with both dates', (status) => {
    const view = solo(row({ status }));
    expect(view.describable).toBe(true);
  });

  // The three the enum carries that must NEVER become a sentence.
  it.each(['cancelled', 'no_show', 'unknown'] as const)('refuses to describe %s', (status) => {
    const view = solo(row({ status }));
    expect(view.describable).toBe(false);
    expect(view).toMatchObject({ reason: 'status_not_describable' });
  });

  it('refuses a row with no dates (a cancel tombstone)', () => {
    const view = solo(row({ checkIn: null, checkOut: null }));
    expect(view).toMatchObject({ describable: false, reason: 'missing_dates' });
  });

  it('refuses a half-dated row', () => {
    expect(solo(row({ checkOut: null }))).toMatchObject({
      describable: false,
      reason: 'missing_dates',
    });
  });
});

describe('multi-room — the mirror only holds the FIRST room', () => {
  it('refuses a reservation carrying more than one BookingTran', () => {
    const view = solo(row({ raw: { BookingTran: [{ Start: 'a' }, { Start: 'b' }, { Start: 'c' }] } }));
    expect(view).toMatchObject({ describable: false, reason: 'multi_room' });
  });

  it('counts a single object BookingTran as one room (eZee omits the array)', () => {
    expect(roomCount(row({ raw: { BookingTran: { Start: 'a' } } }))).toBe(1);
    expect(solo(row({ raw: { BookingTran: { Start: 'a' } } })).describable).toBe(true);
  });

  it('treats a raw with no BookingTran as one room', () => {
    expect(roomCount(row({ raw: {} }))).toBe(1);
  });

  // The shape the panel flagged: three rooms may arrive as three SEPARATE rows
  // sharing a reference base, each of which looks complete on its own.
  it('refuses sibling rows sharing a reference base', () => {
    const a = row({ id: 'b0000000-0000-4000-8000-00000000000a', ezeeReservationNo: '877-1' });
    const b = row({ id: 'b0000000-0000-4000-8000-00000000000b', ezeeReservationNo: '877-2' });
    const views = projectAll([a, b], TODAY);
    expect(views.every((v) => !v.describable)).toBe(true);
    expect(views[0]).toMatchObject({ reason: 'sibling_rows' });
  });

  it('referenceBase strips only a trailing -N suffix', () => {
    expect(referenceBase('877-2')).toBe('877');
    expect(referenceBase('953')).toBe('953');
    expect(referenceBase('B4525')).toBe('B4525');
  });
});

describe('what a described stay may never carry', () => {
  const view = solo(row());

  it('carries no money, no eZee guest name, no email and no meal plan', () => {
    const keys = Object.keys(view);
    expect(keys).not.toContain('amount');
    expect(keys).not.toContain('currency');
    expect(keys).not.toContain('guestName');
    expect(keys).not.toContain('guestEmail');
    expect(keys).not.toContain('rateplanId');
    expect(keys).not.toContain('plan');
    // Belt and braces: nothing money- or identity-shaped anywhere in the value.
    const serialised = JSON.stringify(view);
    expect(serialised).not.toContain('13854');
    expect(serialised).not.toContain('Rahul');
    expect(serialised).not.toContain('example.test');
    expect(serialised).not.toMatch(/\bEP\b|\bCP\b|breakfast/i);
  });
});

describe('villa naming — §5.4 never promises a unit we were not given', () => {
  it('speaks the TYPE when eZee has assigned no unit (every live row today)', () => {
    const view = solo(row({ physicalRoomLabel: null }));
    expect(view).toMatchObject({ villa: 'Nistula Villa', isUnit: false });
  });

  it('speaks the UNIT once the mirror actually holds one', () => {
    const view = solo(row({ physicalRoomLabel: 'Villa B3' }));
    expect(view).toMatchObject({ villa: 'Villa B3', isUnit: true });
  });
});

describe('deriveStage — from DATES, never from status', () => {
  const stage = (over: Partial<BookingMirror>): string =>
    deriveStage(projectAll([row(over)], TODAY), TODAY);

  it('is lead with no stays at all', () => {
    expect(deriveStage([], TODAY)).toBe('lead');
  });

  it('is inhouse between check-in and check-out', () => {
    expect(stage({ checkIn: '2026-07-11', checkOut: '2026-07-15' })).toBe('inhouse');
  });

  // The production-shaped case: eZee never sends checked_in down the queue, so a
  // status-keyed rule would make NOBODY in-house. Status stays 'confirmed'.
  it('is inhouse on a still-confirmed booking whose dates bracket today', () => {
    expect(stage({ status: 'confirmed', checkIn: TODAY, checkOut: '2026-07-16' })).toBe('inhouse');
  });

  it('counts the arrival day as inhouse', () => {
    expect(stage({ checkIn: TODAY, checkOut: '2026-07-16' })).toBe('inhouse');
  });

  it('counts the departure day as inhouse (they leave that day, not before)', () => {
    expect(stage({ checkIn: '2026-07-10', checkOut: TODAY })).toBe('inhouse');
  });

  it('is prearrival for a future check-in', () => {
    expect(stage({ checkIn: '2026-07-14', checkOut: '2026-07-16' })).toBe('prearrival');
  });

  it('is postguest the day after check-out', () => {
    expect(stage({ checkIn: '2026-07-08', checkOut: '2026-07-12' })).toBe('postguest');
  });

  it('is postguest for a checked_out booking', () => {
    expect(stage({ status: 'checked_out', checkIn: '2026-06-01', checkOut: '2026-06-05' })).toBe(
      'postguest',
    );
  });

  // Dead statuses must not create a stage — a guest who cancelled is a LEAD,
  // never a returning guest we greet with "hope you enjoyed your stay".
  it.each(['cancelled', 'no_show', 'unknown'] as const)('is lead when the only row is %s', (status) => {
    expect(stage({ status, checkIn: '2026-06-01', checkOut: '2026-06-05' })).toBe('lead');
  });

  it('is lead when the only row has no dates', () => {
    expect(stage({ checkIn: null, checkOut: null })).toBe('lead');
  });

  it('prefers inhouse over a coexisting future booking', () => {
    const now = row({ id: 'aaa', checkIn: '2026-07-11', checkOut: '2026-07-15' });
    const next = row({ id: 'bbb', ezeeReservationNo: '999', checkIn: '2026-09-01', checkOut: '2026-09-04' });
    expect(deriveStage(projectAll([now, next], TODAY), TODAY)).toBe('inhouse');
  });
});

describe('needsHuman — separate from the stage, so CH-16 cannot auto-send at a broken booking', () => {
  it('is true for a near-term booking we cannot describe (a multi-room stay)', () => {
    const r = row({ raw: { BookingTran: [{}, {}] }, checkIn: '2026-08-26' });
    expect(needsHuman(projectAll([r], TODAY), TODAY)).toBe(true);
    // …and the stage still reads lead, which is exactly why the flag is separate:
    // CH-16 hard-wires the four stage words to its auto-send rules.
    expect(deriveStage(projectAll([r], TODAY), TODAY)).toBe('lead');
  });

  // Keyed on DATES, not on `live`. A cancellation is not "live" by status — but
  // one for NEXT WEEK is precisely what a person must handle. Keying on `live`
  // would have missed it entirely (the worker e2e caught this).
  it('is true for a booking cancelled for next week', () => {
    const r = row({ status: 'cancelled', checkIn: '2026-07-20', checkOut: '2026-07-22' });
    expect(needsHuman(projectAll([r], TODAY), TODAY)).toBe(true);
  });

  it('is false for an ancient cancellation — that guest genuinely IS a lead', () => {
    const old = row({ status: 'cancelled', checkIn: '2025-01-05', checkOut: '2025-01-07' });
    expect(needsHuman(projectAll([old], TODAY), TODAY)).toBe(false);
  });

  it('is false for a dateless cancel tombstone (ancient by construction)', () => {
    const stub = row({ status: 'cancelled', checkIn: null, checkOut: null });
    expect(needsHuman(projectAll([stub], TODAY), TODAY)).toBe(false);
  });

  it('is false when every stay is describable', () => {
    expect(needsHuman(projectAll([row()], TODAY), TODAY)).toBe(false);
  });
});

describe('selectStays — active ≥ upcoming ≥ recent past, capped', () => {
  it('orders active first, then soonest upcoming, then newest past', () => {
    const active = row({ id: 'a', ezeeReservationNo: '1', checkIn: '2026-07-11', checkOut: '2026-07-15' });
    const soon = row({ id: 'b', ezeeReservationNo: '2', checkIn: '2026-08-01', checkOut: '2026-08-03' });
    const later = row({ id: 'c', ezeeReservationNo: '3', checkIn: '2026-09-01', checkOut: '2026-09-03' });
    const past = row({ id: 'd', ezeeReservationNo: '4', status: 'checked_out', checkIn: '2026-05-01', checkOut: '2026-05-03' });
    const picked = selectStays(projectAll([later, past, soon, active], TODAY), TODAY);
    expect(picked.map((s) => s.reservationNo)).toEqual(['1', '2', '3']);
    expect(picked).toHaveLength(STAYS_RENDER_LIMIT);
  });

  it('never selects an undescribable stay', () => {
    const cancelled = row({ id: 'x', status: 'cancelled' });
    expect(selectStays(projectAll([cancelled], TODAY), TODAY)).toEqual([]);
  });
});

describe('liveStays', () => {
  it('excludes a departed guest', () => {
    const past = row({ status: 'checked_out', checkIn: '2026-05-01', checkOut: '2026-05-03' });
    expect(liveStays(projectAll([past], TODAY))).toEqual([]);
  });

  it('includes a confirmed future stay', () => {
    expect(liveStays(projectAll([row()], TODAY))).toHaveLength(1);
  });
});
