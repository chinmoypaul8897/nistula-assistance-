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
import { scanStayAffirmations } from '../src/brain/stayGuards.js';
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

describe('a guest who DOES hold a live booking may state its facts', () => {
  it.each(AFFIRMATIONS)('allows %j', (draft) => {
    expect(scanStayAffirmations(draft, true).violations).toEqual([]);
  });

  it('allows the fact-framed answer block [4] actually asks for', () => {
    const draft = 'Your stay runs 20-22 Dec, four adults, in one of our Assagao villas.';
    expect(scanStayAffirmations(draft, true).violations).toEqual([]);
    expect(scanStayAffirmations(draft, false).violations).toEqual([]);
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
