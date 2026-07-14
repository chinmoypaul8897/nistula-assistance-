/**
 * CH-11 · block [5]'s stays section + block [6]'s stage line.
 *
 * The load-bearing assertions: block [5] speaks the villa TYPE unless eZee gave
 * us a unit (§5.4), it never carries money/name/email/meal-plan, and a booking
 * we may not describe is announced WITHOUT detail rather than silently dropped
 * (a guest who thinks they arrive Friday must not be treated as a fresh lead).
 */
import { describe, expect, it } from 'vitest';
import { buildGuestBlock } from '../src/brain/profileBlock.js';
import { buildSituation } from '../src/brain/prompt.js';
import type { DescribedStay } from '../src/brain/stayView.js';

const BARE = { name: null, registerPref: 'unknown', langPref: 'unknown', facts: [] } as const;

function stay(over: Partial<DescribedStay> = {}): DescribedStay {
  return {
    describable: true,
    bookingId: 'b1',
    reservationNo: '953',
    villa: 'Nistula Villa',
    isUnit: false,
    checkIn: '2026-08-26',
    checkOut: '2026-08-28',
    adults: 4,
    children: 0,
    status: 'confirmed',
    live: true,
    ...over,
  };
}

describe('block [5] stays', () => {
  it('renders a stay with the villa TYPE and an explicit do-not-name-a-unit note', () => {
    const block = buildGuestBlock({ ...BARE, stays: [stay()] }) ?? '';
    expect(block).toContain('Nistula Villa (villa type — the specific unit is not assigned yet, do not name one)');
    expect(block).toContain('2026-08-26 to 2026-08-28');
    expect(block).toContain('4 adults');
  });

  it('names the UNIT once eZee has assigned one — and drops the caution', () => {
    const block = buildGuestBlock({ ...BARE, stays: [stay({ villa: 'Villa B3', isUnit: true })] }) ?? '';
    expect(block).toContain('- Villa B3, 2026-08-26 to 2026-08-28');
    expect(block).not.toContain('do not name one');
  });

  it('marks a past stay so the model does not greet a departed guest as arriving', () => {
    const block =
      buildGuestBlock({ ...BARE, stays: [stay({ status: 'checked_out', live: false })] }) ?? '';
    expect(block).toContain('(a past stay)');
  });

  it('renders children only when there are any', () => {
    expect(buildGuestBlock({ ...BARE, stays: [stay({ children: 2 })] }) ?? '').toContain(
      '4 adults + 2 children',
    );
    expect(buildGuestBlock({ ...BARE, stays: [stay({ children: 0 })] }) ?? '').not.toContain(
      'children',
    );
  });

  it('tells the model plainly when no booking is linked', () => {
    const block = buildGuestBlock({ ...BARE, name: 'Rahul', stays: [] }) ?? '';
    expect(block).toContain('Stays: no booking is linked to this number.');
  });

  // The row exists and the model must not describe it — but silence would make
  // the AI treat a guest with a booking problem as a fresh sales lead.
  it('announces an undescribable booking WITHOUT any detail', () => {
    const block = buildGuestBlock({ ...BARE, stays: [], bookingNeedsHuman: true }) ?? '';
    expect(block).toContain('may NOT describe');
    expect(block).toContain('The team is being brought in.');
    // …and it must not also claim there is no booking. Those are different facts.
    expect(block).not.toContain('no booking is linked');
  });

  // A guest whose ONLY signal is a booking must still get a block — the CH-09
  // early-return would otherwise drop the single most important thing about them.
  it('renders a block for a guest with a stay but no name, facts or prefs', () => {
    expect(buildGuestBlock({ ...BARE, stays: [stay()] })).not.toBeNull();
    expect(buildGuestBlock({ ...BARE, bookingNeedsHuman: true })).not.toBeNull();
    // A true stranger still gets nothing (uncached tokens on every first contact).
    expect(buildGuestBlock({ ...BARE })).toBeNull();
  });

  it('carries no money, no eZee name, no email and no meal plan', () => {
    const block = buildGuestBlock({ ...BARE, name: 'Rahul', stays: [stay()] }) ?? '';
    expect(block).not.toMatch(/₹|\d{4,}\.\d{2}|INR/);
    expect(block).not.toMatch(/\bEP\b|\bCP\b|breakfast|European Plan/i);
    expect(block).not.toContain('@');
  });
});

describe('block [6] stage line', () => {
  const base = { now: new Date('2026-07-13T09:00:00Z'), isNight: false, serviceWindowOpen: true, degraded: false };

  it('tells the model an in-house guest is IN the villa right now', () => {
    const s = buildSituation({ ...base, stage: 'inhouse' });
    expect(s).toContain('IN one of our villas right now');
  });

  it('tells the model what we can SEE, not that the guest has no booking', () => {
    expect(buildSituation({ ...base, stage: 'lead' })).toContain('cannot see a booking on this number');
  });

  it('omits the line entirely when no stage was derived (pre-CH-11 callers)', () => {
    const s = buildSituation(base);
    expect(s).not.toMatch(/cannot see a booking|IN one of our villas/);
  });
});
