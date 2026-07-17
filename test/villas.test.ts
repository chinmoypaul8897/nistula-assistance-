/**
 * Villa resolver (plan.md §5.4, CH-05 step 1). resolveVilla must be fuzzy but
 * fully deterministic — this is the table that proves "b3"→B3, "3bhk"→villa
 * type set, "solim"→Siolim typo tolerance, unit-beats-type precedence.
 */
import { describe, expect, it } from 'vitest';
import { VILLAS, bookingUrl, getVillaById, namesPhysicalHouse, resolveVilla } from '../src/lib/villas.js';

describe('villa map integrity', () => {
  it('has the eight §5.4 units with unique ids', () => {
    expect(VILLAS).toHaveLength(8);
    expect(new Set(VILLAS.map((v) => v.villaId)).size).toBe(8);
    expect(new Set(VILLAS.map((v) => v.label)).size).toBe(8);
    for (const v of VILLAS) expect(v.villaId).toMatch(/^5220300000000000\d{3}$/);
  });

  it('shares one roomTypeId across each type', () => {
    const villaTypeIds = new Set(
      VILLAS.filter((v) => v.typeName === 'Nistula Villa').map((v) => v.roomTypeId),
    );
    expect(villaTypeIds).toEqual(new Set(['5220300000000000003']));
  });
});

describe('resolveVilla — unit matches (unit beats type)', () => {
  const cases: [string, string][] = [
    ['B3', 'Villa B3'],
    ['b3', 'Villa B3'],
    ['Villa B-3', 'Villa B3'],
    ['villa b3', 'Villa B3'], // has "villa" AND a unit → unit wins
    ['b1', 'Villa B1'],
    ['C1', 'Villa C1'],
    ['c3', 'Villa C3'],
    ['Apartment 11', 'Apartment 11'],
    ['apt 11', 'Apartment 11'],
    ['11', 'Apartment 11'],
    ['apartment 6', 'Apartment 06'], // leading-zero folded
    ['06', 'Apartment 06'],
    ['9', 'Apartment 09'],
    ['a9', 'Apartment 09'],
  ];
  it.each(cases)('%s → %s', (input, label) => {
    const r = resolveVilla(input);
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.villa.label).toBe(label);
  });
});

describe('resolveVilla — type sets (ambiguous)', () => {
  it('"3bhk" → the four Nistula Villas', () => {
    const r = resolveVilla('3bhk 20-22 dec');
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.typeName).toBe('Nistula Villa');
      expect(r.villas.map((v) => v.label).sort()).toEqual(['Villa B1', 'Villa B3', 'Villa C1', 'Villa C3']);
    }
  });

  it('"villa" (no unit) → the villa set', () => {
    const r = resolveVilla('a villa please');
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.villas).toHaveLength(4);
  });

  it('"apartment" (no number) → the three apartments', () => {
    const r = resolveVilla('an apartment');
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.typeName).toBe('Nistula Apartment');
      expect(r.villas).toHaveLength(3);
    }
  });
});

describe('resolveVilla — siolim (single-unit type, typo tolerant)', () => {
  it.each(['siolim', 'Siolim', 'solim', 'sioli', '4bhk', '4 BHK in Siolim'])('%s → Siolim 4BHK', (input) => {
    const r = resolveVilla(input);
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.villa.label).toBe('Siolim 4BHK');
  });
});

describe('resolveVilla — bare digit must not override an explicit type word', () => {
  it('a bare 6/9/11 alongside "villa"/"3bhk" resolves to the TYPE, not an apartment', () => {
    for (const input of ['a villa for 6 guests', 'villa 9 dec', '3bhk for 11 nights']) {
      const r = resolveVilla(input);
      expect(r.kind).toBe('ambiguous');
      if (r.kind === 'ambiguous') expect(r.typeName).toBe('Nistula Villa');
    }
  });

  it('a PREFIXED apartment number still wins even beside a type word', () => {
    // "apartment 9" has no conflicting villa word → the apartment unit resolves.
    const r = resolveVilla('apartment 9');
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.villa.label).toBe('Apartment 09');
  });
});

describe('resolveVilla — no match + determinism', () => {
  it.each(['treehouse', 'the pool one', '', 'slim'])('%s → none', (input) => {
    expect(resolveVilla(input).kind).toBe('none');
  });

  it('is deterministic (same input → same output)', () => {
    for (const input of ['b3', '3bhk', 'solim', 'nonsense']) {
      expect(resolveVilla(input)).toEqual(resolveVilla(input));
    }
  });
});

describe('helpers', () => {
  it('getVillaById round-trips', () => {
    expect(getVillaById('5220300000000000011')?.label).toBe('Villa B3');
    expect(getVillaById('nope')).toBeUndefined();
  });

  it('bookingUrl builds the canonical link and trims a trailing slash', () => {
    expect(bookingUrl('https://nistula-website.vercel.app', '5220300000000000011')).toBe(
      'https://nistula-website.vercel.app/villas/5220300000000000011',
    );
    expect(bookingUrl('https://x.dev/', '5220300000000000015')).toBe('https://x.dev/villas/5220300000000000015');
  });
});

describe('namesPhysicalHouse — the house-NAMING screen (GATE 2 + guest template param)', () => {
  it.each([
    'towels for Apartment 09',
    'the AC in Villa B3 is weak',
    'apt 6',
    'B3',
    'a9',
    // 🚨 THE ROUND-3 GAP: a bare digit beside the word "villa" is a unit
    // reference in a task summary, and the round-1 rewrite lost it.
    'villa 11',
    'villa 9',
    'villa 6',
    'the AC in villa 11 is not working',
  ])('names a house: %j', (t) => {
    expect(namesPhysicalHouse(t)).toBe(true);
  });

  it.each([
    'a villa for 6 guests', // headcount — "villa" not bound to the digit
    'a quiet villa', // a type word, no unit
    'extra towels for the apartment', // a TYPE, not a house
    '2 extra towels', // a bare quantity
    'villa 99', // no such unit
    'the front desk', // ordinary prose
  ])('does NOT name a house: %j', (t) => {
    expect(namesPhysicalHouse(t)).toBe(false);
  });

  it('did NOT change resolveVilla — the free-text routing guard is intact', () => {
    // The fix lives in namesPhysicalHouse ONLY. resolveVilla must still call
    // "villa 9 dec" ambiguous, or booking-flow routing regresses.
    for (const t of ['a villa for 6 guests', 'villa 9 dec', '3bhk for 11 nights']) {
      expect(resolveVilla(t).kind).toBe('ambiguous');
    }
  });
});
