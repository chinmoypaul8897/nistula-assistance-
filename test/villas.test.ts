/**
 * Villa resolver (plan.md §5.4, CH-05 step 1). resolveVilla must be fuzzy but
 * fully deterministic — this table proves the current inventory contract after
 * the three-bedroom Assagao villas were retired (2026-07-24): apartments and
 * Siolim still match; the four departed villas and "3bhk" resolve `retired`
 * (named, never sellable); a bare "villa" is `none` (Siolim is a villa, so the
 * word alone is not enough); unit-beats-type precedence holds.
 */
import { describe, expect, it } from 'vitest';
import {
  RETIRED_VILLA_LABELS,
  VILLAS,
  bookingUrl,
  getVillaById,
  isRetiredVillaType,
  namesPhysicalHouse,
  resolveVilla,
} from '../src/lib/villas.js';

describe('villa map integrity', () => {
  it('has the four §5.4 units we still let, with unique ids', () => {
    expect(VILLAS).toHaveLength(4);
    expect(new Set(VILLAS.map((v) => v.villaId)).size).toBe(4);
    expect(new Set(VILLAS.map((v) => v.label)).size).toBe(4);
    for (const v of VILLAS) expect(v.villaId).toMatch(/^5220300000000000\d{3}$/);
  });

  it('shares one roomTypeId across the three apartments; Siolim stands alone', () => {
    const aptTypeIds = new Set(
      VILLAS.filter((v) => v.typeName === 'Nistula Apartment').map((v) => v.roomTypeId),
    );
    expect(aptTypeIds).toEqual(new Set(['5220300000000000001']));
    expect(VILLAS.filter((v) => v.typeName === 'Nistula Apartment')).toHaveLength(3);
    expect(VILLAS.filter((v) => v.typeName === 'Nistula 4BHK Siolim')).toHaveLength(1);
  });

  it('no departed villa survives in the sellable map', () => {
    const labels = new Set(VILLAS.map((v) => v.label));
    for (const gone of RETIRED_VILLA_LABELS) expect(labels.has(gone)).toBe(false);
  });
});

describe('resolveVilla — unit matches (unit beats type)', () => {
  const cases: [string, string][] = [
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

describe('resolveVilla — retired three-bedroom Assagao villas (named, not sellable)', () => {
  it.each(['B3', 'b3', 'Villa B-3', 'villa b3', 'b1', 'C1', 'c3', 'the AC in Villa C3'])(
    '%s → retired',
    (input) => {
      expect(resolveVilla(input).kind).toBe('retired');
    },
  );

  it.each(['3bhk', '3 bhk', '3-bedroom villa', '3bhk 20-22 dec', 'a 3 bedroom please', '3br'])(
    'the three-bedroom TYPE %j → retired',
    (input) => {
      expect(resolveVilla(input).kind).toBe('retired');
    },
  );
});

describe('resolveVilla — type sets and the bare word "villa"', () => {
  it('"apartment" (no number) → the three apartments', () => {
    const r = resolveVilla('an apartment');
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.typeName).toBe('Nistula Apartment');
      expect(r.villas).toHaveLength(3);
    }
  });

  it('bare "villa" is NOT retired — Siolim is a villa, so it falls through to none', () => {
    // The tool then asks whether they mean the apartments or the Siolim villa —
    // it must never answer "we no longer let those" to the company's own noun.
    expect(resolveVilla('a villa please').kind).toBe('none');
    expect(resolveVilla('do you have a villa').kind).toBe('none');
  });

  it('an ambiguous resolution NEVER carries an empty villa list', () => {
    // The old empty-`ambiguous` (villasOfType(VILLA) after removal) made
    // quoteType record a false degraded('down') and return UPSTREAM_DOWN
    // vacuously. Structurally impossible now: only the apartment type is
    // ambiguous, and it has three units.
    for (const input of ['apartment', 'an apartment', 'apt', 'studio']) {
      const r = resolveVilla(input);
      if (r.kind === 'ambiguous') expect(r.villas.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveVilla — siolim (single-unit type, typo tolerant, still a villa)', () => {
  it.each(['siolim', 'Siolim', 'solim', 'sioli', '4bhk', '4 BHK in Siolim'])('%s → Siolim 4BHK', (input) => {
    const r = resolveVilla(input);
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.villa.label).toBe('Siolim 4BHK');
  });
});

describe('resolveVilla — bare digit must not override an explicit type word', () => {
  it('a bare 6/9/11 beside "villa"/"3bhk" never mis-resolves to an apartment', () => {
    // "a villa for 6 guests" (headcount) and "villa 9 dec" (a date) → none, NOT
    // Apartment 06/09; "3bhk for 11 nights" → retired, NOT Apartment 11.
    expect(resolveVilla('a villa for 6 guests').kind).toBe('none');
    expect(resolveVilla('villa 9 dec').kind).toBe('none');
    expect(resolveVilla('3bhk for 11 nights').kind).toBe('retired');
  });

  it('a PREFIXED apartment number still wins', () => {
    const r = resolveVilla('apartment 9');
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.villa.label).toBe('Apartment 09');
  });
});

describe('resolveVilla — no match + determinism + total function', () => {
  it.each(['treehouse', 'the pool one', '', 'slim'])('%s → none', (input) => {
    expect(resolveVilla(input).kind).toBe('none');
  });

  it('is deterministic (same input → same output)', () => {
    for (const input of ['b3', '3bhk', 'solim', 'nonsense', 'apartment']) {
      expect(resolveVilla(input)).toEqual(resolveVilla(input));
    }
  });

  it('NEVER throws — a total function over every alias, label, retired name and junk', () => {
    // This is the test that would have caught the byLabel orphan: an alias
    // pointing at a deleted VILLAS row threw. Iterate everything a caller could
    // hand it and assert only that it returns.
    const inputs = [
      '',
      ' ',
      'junk',
      'B1',
      'B3',
      'C1',
      'C3',
      'b-3',
      '3bhk',
      '4bhk',
      'villa',
      'apartment',
      ...RETIRED_VILLA_LABELS,
      ...RETIRED_VILLA_LABELS.map((l) => l.toLowerCase()),
      ...VILLAS.map((v) => v.label),
      ...VILLAS.map((v) => v.villaId),
    ];
    for (const input of inputs) {
      expect(() => resolveVilla(input)).not.toThrow();
    }
  });
});

describe('isRetiredVillaType — the stored-string guard (lifecycle marketing)', () => {
  it('recognises the retired villa TYPE and nothing else', () => {
    expect(isRetiredVillaType('Nistula Villa')).toBe(true);
    expect(isRetiredVillaType('nistula villa')).toBe(true);
    expect(isRetiredVillaType('Nistula Apartment')).toBe(false);
    expect(isRetiredVillaType('Nistula 4BHK Siolim')).toBe(false);
    expect(isRetiredVillaType(null)).toBe(false);
    expect(isRetiredVillaType(undefined)).toBe(false);
  });
});

describe('helpers', () => {
  it('getVillaById round-trips a live unit and misses a departed one', () => {
    expect(getVillaById('5220300000000000010')?.label).toBe('Apartment 09');
    expect(getVillaById('5220300000000000011')).toBeUndefined(); // was Villa B3
    expect(getVillaById('nope')).toBeUndefined();
  });

  it('bookingUrl builds the canonical link and trims a trailing slash', () => {
    expect(bookingUrl('https://nistula-website.vercel.app', '5220300000000000010')).toBe(
      'https://nistula-website.vercel.app/villas/5220300000000000010',
    );
    expect(bookingUrl('https://x.dev/', '5220300000000000015')).toBe('https://x.dev/villas/5220300000000000015');
  });
});

describe('namesPhysicalHouse — the house-NAMING screen (GATE 2 + guest template param)', () => {
  it.each([
    'towels for Apartment 09',
    // A RETIRED house still NAMES a house — the screen must keep firing so a
    // departed name can never reach a guest template or a staff card unchecked.
    'the AC in Villa B3 is weak',
    'B3',
    'C3',
    'apt 6',
    'a9',
    // A bare digit beside the word "villa" is a unit reference in a task summary.
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
    // A bare unit-code whose digit HAPPENS to be 6/9/11 is NOT a house — there
    // is no Villa B9/C11 — and the fallback must not invent Apartment 09.
    'B9',
    'C11',
    'seat B9',
    'the safe code is B6',
    'meet at gate C11',
  ])('does NOT name a house: %j', (t) => {
    expect(namesPhysicalHouse(t)).toBe(false);
  });
});
