/**
 * CH-07 rupee-extraction hardening. The battery covers the two CH-05 recorded
 * fail-opens (bare integers, "34k"), the lakh-laundering bug the CH-07 review
 * found live (₹1.4 lakh → 1 → matched adults:1 in the backed set), and the
 * false-positive surface that must KEEP flowing (years, dates, times, counts,
 * pin codes) so legitimate quotes are never deferred.
 */
import { describe, expect, it } from 'vitest';
import { extractRupeeAmounts, extractKbFees } from '../src/brain/rupees.js';

describe('multiplier forms (the lakh-laundering fix)', () => {
  it('extracts ₹1.4 lakh as 140000 — never 1', () => {
    expect(extractRupeeAmounts('That comes to ₹1.4 lakh for the week.')).toEqual([140000]);
  });

  it('handles bare lakh/crore words — unambiguous money in this domain', () => {
    expect(extractRupeeAmounts('Around 1.5 lakhs for the fortnight.')).toEqual([150000]);
    expect(extractRupeeAmounts('The villa sold for 2 crore.')).toEqual([20000000]);
  });

  it('handles Rs/INR/rupees prefixes and postfixes', () => {
    expect(extractRupeeAmounts('Rs 30000 total.')).toEqual([30000]);
    expect(extractRupeeAmounts('Rs. 1,40,000 for the stay.')).toEqual([140000]); // Indian grouping
    expect(extractRupeeAmounts('INR 5000 per night.')).toEqual([5000]);
    expect(extractRupeeAmounts('It is 5000 rupees a night.')).toEqual([5000]);
  });
});

describe('k shorthand (CH-05 deferral)', () => {
  it('extracts 34k with a price cue and ₹34k always', () => {
    expect(extractRupeeAmounts('The rate is 34k for those dates.')).toEqual([34000]);
    expect(extractRupeeAmounts('Roughly ₹34k all in.')).toEqual([34000]);
    expect(extractRupeeAmounts('About 34.5k total.')).toEqual([34500]);
  });

  it('never reads a 4K TV as ₹4,000', () => {
    expect(extractRupeeAmounts('The rate includes a lounge with a 4K TV.')).toEqual([]);
  });

  it('ignores k-shorthand with no price cue in the sentence', () => {
    expect(extractRupeeAmounts('We walked 10k steps around Assagao.')).toEqual([]);
  });
});

describe('bare integers (the CH-05 fail-open, closed)', () => {
  it('counts a symbol-less integer when its sentence carries a price cue', () => {
    expect(extractRupeeAmounts('The total comes to 45000 for both villas.')).toEqual([45000]);
    expect(extractRupeeAmounts('That would be 30000 per night.')).toEqual([30000]);
  });

  it('"comes to" is itself a price cue (close-out audit — a fabricated total shipped)', () => {
    // These carry NO other cue: "booking"/"stay" are deliberately not cues (they
    // introduce REFERENCE numbers). So the figure was never extracted, never
    // checked against the backed set, and a made-up total went out unchallenged.
    expect(extractRupeeAmounts('The booking comes to 45000 for the two nights.')).toEqual([45000]);
    expect(extractRupeeAmounts('Your stay works out to 34000.')).toEqual([34000]);
    expect(extractRupeeAmounts('It amounts to 18000 altogether.')).toEqual([18000]);
    // …and the reference number in the same breath is still NOT money (CH-11).
    expect(extractRupeeAmounts('Booking 953 comes to 45000.')).toEqual([45000]);
  });

  it("'nightly' is a rate word, never a unit exclusion (CH-09 audit)", () => {
    // Before the \b anchor, UNIT_AFTER's `nights?` matched the prefix of
    // "nightly" and the figure was skipped as a count.
    expect(extractRupeeAmounts('Your rate is 3500 nightly, as agreed.')).toEqual([3500]);
    // A genuine night COUNT stays excluded.
    expect(extractRupeeAmounts('The rate covers your 3 nights fully.')).toEqual([]);
  });

  it('a colon does not sever the cue from the figure (post-build audit)', () => {
    expect(extractRupeeAmounts('Total: 45000')).toEqual([45000]);
    expect(extractRupeeAmounts('Rate for the week: 90000, all in.')).toEqual([90000]);
  });

  it('INR works as a postfix too', () => {
    expect(extractRupeeAmounts('It comes to 2500 INR extra.')).toEqual([2500]);
  });

  it('ignores the same integer with no price cue (counts, references, pin codes)', () => {
    expect(extractRupeeAmounts('Our pin code in Assagao is 403507.')).toEqual([]);
    expect(extractRupeeAmounts('The reference is 45000.')).toEqual([]); // "reference" is not a cue
  });

  it('never counts bare years, even in a price sentence', () => {
    expect(extractRupeeAmounts('Rates for 2026 are not published yet.')).toEqual([]);
  });

  it('never counts unit-suffixed numbers (counts and measures)', () => {
    expect(extractRupeeAmounts('The tariff covers 250 minutes of housekeeping.')).toEqual([]);
    expect(extractRupeeAmounts('The price covers 1200 sq ft of villa.')).toEqual([]);
  });

  it('applies the ≥200 floor to bare integers only — ₹-marked small fees still extract', () => {
    expect(extractRupeeAmounts('A fee of ₹150 applies.')).toEqual([150]);
  });
});

describe('masking (shapes that look numeric but are never money)', () => {
  it('masks ISO dates, day ranges and clock times before scanning', () => {
    expect(extractRupeeAmounts('The rate for 20–22 Dec is ₹34,000.')).toEqual([34000]);
    expect(extractRupeeAmounts('The price for 2026-12-20 checkout is 15000.')).toEqual([15000]);
    expect(extractRupeeAmounts('Total due at 10:00 is 5000.')).toEqual([5000]);
  });

  it('masks URLs so link digits never read as prices', () => {
    expect(
      extractRupeeAmounts('Book at https://nistula.life/villas/5220300000000000011 — rate is ₹34,000.'),
    ).toEqual([34000]);
  });
});

describe('unchanged CH-05/CH-06 behaviour', () => {
  it('still normalises ₹/comma/space formatting to integers', () => {
    expect(extractRupeeAmounts('That is ₹34,000 all in.')).toEqual([34000]);
    expect(extractRupeeAmounts('no prices here')).toEqual([]);
  });

  it('extractKbFees stays context-bound and gains the new forms', () => {
    // The forward guard: a future deposit figure written any of these ways
    // still binds to its own sentence's fee terms.
    expect(extractKbFees('A refundable security deposit of Rs 10000 is collected.')).toEqual([
      { amount: 10000, cues: expect.arrayContaining(['security deposit']) },
    ]);
    expect(extractKbFees('The villa costs ₹18,000.')).toEqual([]); // no fee term → no cues
  });
});
