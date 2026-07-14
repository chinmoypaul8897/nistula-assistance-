/**
 * CH-11 · stay-affirmation integrity (the D2 decision).
 *
 * The catastrophic case this exists for: 40 of production's 62 mirror rows are
 * cancellations. A guest whose booking was cancelled must NEVER be told "you're
 * all set for 20–22 Dec" — they would drive to Assagao to a villa that is not
 * theirs. Guardrail 2 catches ACTION framing and has never caught STATE framing;
 * these tests pin the gap closed, and pin that closing it did not weaken C1.
 */
import { describe, expect, it } from 'vitest';
import { scanStayAffirmations, scanUnitAssertions } from '../src/brain/stayGuards.js';
import { scanPromises } from '../src/brain/promises.js';
import type { ToolRun } from '../src/brain/tools/registry.js';

const noEvidence = {
  toolRuns: [] as ToolRun[],
  systemEvidence: new Set<never>(),
  escalationPlanned: false,
};

// The sentences a model actually writes when it has booking data in front of it.
const AFFIRMATIONS = [
  'Your booking is confirmed.',
  'Yes, your booking is confirmed for 20-22 Dec.',
  'Your reservation is confirmed.',
  'Your booking has been confirmed.',
  'Your stay is all set.',
  'Your villa is booked and ready.',
  "You're all set for 20-22 Dec.",
  'You are booked in for the 20th.',
  'We have you down for the 20th.',
  'We have you booked for those nights.',
  'Your booking with us runs 20-22 Dec.',
  'Everything is confirmed at our end.',
  'See you on the 20th.',
  'Your check-in is confirmed for Friday.',
];

describe('a guest with NO live booking cannot be told they have one', () => {
  it.each(AFFIRMATIONS)('blocks %j', (draft) => {
    expect(scanStayAffirmations(draft, false).violations.length).toBeGreaterThan(0);
  });

  // The whole point: guardrail 2 lets nearly all of these through today, which
  // is why an assertion gate was needed rather than another claim class.
  it('catches state framing that guardrail 2 does not', () => {
    const present = 'Your booking is confirmed for 20-22 Dec.';
    expect(scanPromises(present, noEvidence).violations).toEqual([]);
    expect(scanStayAffirmations(present, false).violations.length).toBeGreaterThan(0);
  });
});

// The pre-push audit BLOCKER: the first lexicon was a denylist far narrower than
// its "broad" contract. Every one of these is the register a model slips into
// once it (wrongly) believes the guest has a stay — and every one shipped before
// the widening. This set IS the regression guard (the "drives to Assagao" family).
describe('the widened lexicon catches the register block [4] teaches', () => {
  it.each([
    'Your stay runs 20-22 Dec, four adults.',
    'I can see your reservation here.',
    'I have your booking in front of me.',
    'I have found your booking.',
    'Your villa is ready for the 20th.',
    'Your dates are held.',
    'The villa is yours from the 20th.',
    'The room is held for you.',
    'You are checking in on the 20th of December.',
    'Your stay starts on the 20th.',
    'Your check-in is on the 20th.',
    'Your reservation shows the 20th to the 22nd.',
    'We have you staying with us from the 20th.',
    'Yes — check-in on the 20th, check-out on the 22nd. Two adults.',
    'See you on the 20th.',
  ])('blocks %j for a guest with no live stay', (draft) => {
    expect(scanStayAffirmations(draft, false).violations.length).toBeGreaterThan(0);
  });

  // The over-fire guard the audit ALSO flagged: a lead's warm pre-sales close has
  // no booking subject and must never trip (it would defer a legitimate reply).
  it.each([
    'We would love to welcome you in December.',
    'Hope to see you soon.',
    'C3 is a lovely pick — it wraps around its own pool. Here is the link.',
    'The villa sleeps up to seven, with a private pool.',
    'Our rate for those dates is all-inclusive.',
  ])('allows the pre-sales line %j', (draft) => {
    expect(scanStayAffirmations(draft, false).violations).toEqual([]);
  });
});

// §5.4 as CODE. Verified in the website codebase (read-only audit, 2026-07-13):
// its booking engine sends eZee a ROOM TYPE and never a physical RoomID — yet the
// site SHOWS the guest a named villa ("Villa C3") and marks individual houses
// "Booked". Its own auditor: "the villa name is a DISPLAY fact, not a RESERVED
// fact." So a guest will tell us "my Villa C3 booking" in good faith and may be
// in C1. If the AI echoes it, we lend our authority to an error the guest cannot
// check — and CH-13 sends housekeeping to the wrong house.
describe('unit assertions — the AI may name a house only when eZee gave us one', () => {
  it.each([
    'Your Villa C3 is ready for you.',
    'You are in Villa B3 for those dates.',
    "You're booked into C1.",
    'We have put you in Apartment 09.',
    'Your stay at Villa B1 starts on the 20th.',
    'Villa C3 is yours from the 20th.',
  ])('blocks %j when the mirror assigned no unit', (draft) => {
    expect(scanUnitAssertions(draft, []).violations.length).toBeGreaterThan(0);
  });

  it('blocks a unit the GUEST named when we were given a different one', () => {
    // The guest says "my Villa C3 booking"; eZee actually put them in C1.
    expect(scanUnitAssertions('Your Villa C3 is ready.', ['Villa C1']).violations.length).toBe(1);
  });

  it('allows the unit eZee actually assigned', () => {
    expect(scanUnitAssertions('Your Villa B3 is ready for you.', ['Villa B3']).violations).toEqual(
      [],
    );
  });

  // The over-fire guard. Pre-sales names villas constantly — the voice guide's
  // own exemplar does. Describing a villa is not claiming the guest sleeps in it.
  it.each([
    "C3's a good pick — it wraps around its own pool. Here's the link.",
    'Villa B3 has a private pool and sleeps up to seven.',
    'The Siolim house is our only 4BHK.',
    'Apartment 09 is the quietest of the three.',
    'B1 and C1 are both free those nights.',
  ])('allows the pre-sales description %j', (draft) => {
    expect(scanUnitAssertions(draft, []).violations).toEqual([]);
  });

  it('is SKIPPED entirely when the caller supplies nothing (pre-CH-11 behaviour)', () => {
    expect(scanUnitAssertions('Your Villa C3 is ready.', undefined).violations).toEqual([]);
  });
});

describe('a guest who DOES hold a live booking may state its facts', () => {
  it.each(AFFIRMATIONS)('allows %j', (draft) => {
    expect(scanStayAffirmations(draft, true).violations).toEqual([]);
  });

  it('allows the fact-framed answer block [4] asks for ONLY when the stay is live', () => {
    const draft = 'Your stay runs 20-22 Dec, four adults, in one of our Assagao villas.';
    // With a live stay it is the correct answer.
    expect(scanStayAffirmations(draft, true).violations).toEqual([]);
    // With NO live stay it is a fabricated booking — the exact catastrophic case
    // (a guest told their stay runs those dates when they hold none). MUST fire.
    expect(scanStayAffirmations(draft, false).violations.length).toBeGreaterThan(0);
  });
});

describe('the gate is subject-anchored — it must not bless request fulfilment', () => {
  // "Your late checkout is confirmed" needs CH-13's staff task, not a booking.
  // Having a live stay must not make it sayable. C1 (perfect passive) owns it.
  it('does not treat a late-checkout confirmation as a booking affirmation', () => {
    expect(scanStayAffirmations('Your late checkout has been confirmed.', true).violations).toEqual(
      [],
    );
    // …and guardrail 2 still blocks it, unbacked. That is the division of labour.
    expect(scanPromises('Your late checkout has been confirmed.', noEvidence).violations.length)
      .toBeGreaterThan(0);
  });

  it('leaves ordinary hosting prose alone', () => {
    const innocuous = [
      'The villa has a private pool and a cook on request.',
      'Check-in is from 3 pm and check-out at noon.',
      'Those dates are fully booked, I am afraid.',
      'I can confirm the rate once the team is in.',
    ];
    for (const draft of innocuous) {
      expect(scanStayAffirmations(draft, false).violations).toEqual([]);
    }
  });
});

describe('the gate did not weaken guardrail 2', () => {
  // The reason get_booking is registered in NO claim class: C1 packs 'confirmed'
  // in with 'informed'/'arranged'. A booking lookup must never license these.
  it.each([
    'The team has been informed.',
    'Housekeeping knows about the towels.',
    'A taxi has been booked for your arrival.',
    'I have arranged that for you.',
    'Consider it done.',
  ])('still blocks the unbacked action claim %j, even for an in-house guest', (draft) => {
    expect(scanPromises(draft, noEvidence).violations.length).toBeGreaterThan(0);
    // The stay gate is silent here — it is not its job, and it must not pretend.
    expect(scanStayAffirmations(draft, true).violations).toEqual([]);
  });
});
