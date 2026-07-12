/**
 * Guardrail 2 — promise integrity (§6.5 #2, CH-07). Class-based: completed
 * actions (C1) and dispatch claims (C2) need hard evidence; team referrals
 * (C3) are never regenerated — the caller escalates so the referral is true.
 * The register exemplar "Two towels on their way to Villa B3" (block [2])
 * actively PRIMES the exact claim this guardrail exists to catch.
 */
import { describe, expect, it } from 'vitest';
import {
  classesFromContextKinds,
  scanPromises,
  type ClaimClass,
  type PromiseEvidence,
} from '../src/brain/promises.js';
import type { ToolRun } from '../src/brain/tools/registry.js';

const NO_EVIDENCE: PromiseEvidence = {
  toolRuns: [],
  systemEvidence: new Set<ClaimClass>(),
  escalationPlanned: false,
};

describe('C1 — completed-action claims need hard evidence', () => {
  it.each([
    'The team has been informed.',
    "I've informed housekeeping about the towels.",
    'We have already notified the front desk.',
    "I've arranged a late checkout for you.",
    "I've passed it on.",
    'Consider it done.',
    "That's sorted.",
    'The team is aware.',
  ])('flags %j with no evidence', (draft) => {
    const scan = scanPromises(draft, NO_EVIDENCE);
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it.each([
    'The villa is fully booked for those dates.',
    'I am afraid those dates are booked out.',
    'Daily housekeeping is taken care of as part of your stay.', // subject-anchored
    'Breakfast is arranged on request by the villa team.', // not that/this/it
    "I'll pass it on to the team right away.", // future = referral, not a claim
  ])('does NOT flag %j', (draft) => {
    expect(scanPromises(draft, NO_EVIDENCE).violations).toEqual([]);
  });
});

describe('C2 — dispatch-in-motion claims need hard evidence (never escalationPlanned)', () => {
  it('flags the block [2] register exemplar with no real task behind it', () => {
    const scan = scanPromises('Two towels on their way to Villa B3.', NO_EVIDENCE);
    expect(scan.violations).toContain('on their way');
  });

  it('an ops escalation never licenses a dispatch claim (the C2/C3 split)', () => {
    const scan = scanPromises('Housekeeping is on their way now.', {
      ...NO_EVIDENCE,
      escalationPlanned: true, // an ops ping does not put housekeeping in motion
    });
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it('flags "sending someone" in any tense — the AI cannot send anyone yet', () => {
    expect(scanPromises("I'm sending someone up.", NO_EVIDENCE).violations.length).toBeGreaterThan(0);
    expect(scanPromises("I'll send someone right away.", NO_EVIDENCE).violations.length).toBeGreaterThan(0);
  });
});

describe('C3 — team referrals escalate, never regenerate', () => {
  it('marks a referral (not a violation) when no escalation is planned', () => {
    const scan = scanPromises('Let me bring the team in — someone will reply here shortly.', NO_EVIDENCE);
    expect(scan.violations).toEqual([]);
    expect(scan.referral).toBe(true);
  });

  it('a planned escalation licenses the referral', () => {
    const scan = scanPromises('Of course — bringing the front desk in now.', {
      ...NO_EVIDENCE,
      escalationPlanned: true,
    });
    expect(scan.referral).toBe(false);
    expect(scan.violations).toEqual([]);
  });
});

describe('evidence channels', () => {
  it('a claimable system row licenses its classes (ops_escalation → C3 only)', () => {
    expect(classesFromContextKinds(['ops_escalation'])).toEqual(new Set(['C3']));
    expect(classesFromContextKinds(['unknown_kind'])).toEqual(new Set());
    const scan = scanPromises('I have flagged this — bringing the team in.', {
      ...NO_EVIDENCE,
      systemEvidence: classesFromContextKinds(['ops_escalation']),
    });
    expect(scan.referral).toBe(false);
  });

  it('systemEvidence can license C1 (the CH-13 task_done/sla_nudge seam)', () => {
    const scan = scanPromises("I've nudged housekeeping about the towels.", {
      ...NO_EVIDENCE,
      systemEvidence: new Set<ClaimClass>(['C1']),
    });
    expect(scan.violations).toEqual([]);
  });

  it('a successful registered tool licenses its classes (the CH-13 TOOL_CLAIMS seam)', () => {
    const taskRun: ToolRun = { name: 'create_staff_task', input: {}, result: { ok: true, data: {} } };
    const failedRun: ToolRun = {
      name: 'create_staff_task',
      input: {},
      result: { ok: false, error: 'UPSTREAM_DOWN' },
    };
    const claims = new Map<string, ReadonlySet<ClaimClass>>([
      ['create_staff_task', new Set<ClaimClass>(['C1', 'C2'])],
    ]);
    const withTask = scanPromises('Two towels on their way to Villa B3.', {
      ...NO_EVIDENCE,
      toolRuns: [taskRun],
      toolClaims: claims,
    });
    expect(withTask.violations).toEqual([]);
    // A FAILED tool run licenses nothing — "never promise what didn't happen".
    const withFailure = scanPromises('Two towels on their way to Villa B3.', {
      ...NO_EVIDENCE,
      toolRuns: [failedRun],
      toolClaims: claims,
    });
    expect(withFailure.violations.length).toBeGreaterThan(0);
  });

  it('price tools license NOTHING today (TOOL_CLAIMS ships empty)', () => {
    const quoteRun: ToolRun = { name: 'get_quote', input: {}, result: { ok: true, data: { total: 1 } } };
    const scan = scanPromises('The team has been informed.', { ...NO_EVIDENCE, toolRuns: [quoteRun] });
    expect(scan.violations.length).toBeGreaterThan(0);
  });
});
