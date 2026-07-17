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
  vetoedByFailures,
  scanPromises,
  TOOL_CLAIMS,
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
    // Post-build audit additions: realistic staff-awareness claims.
    'Housekeeping knows about the towels.',
    'The team is looking into it right now.',
    'The team are on it.',
    'This has been escalated to our team.',
    'Your booking has been confirmed.', // unbackable until CH-11's get_booking
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

  it('price tools license NOTHING', () => {
    const quoteRun: ToolRun = { name: 'get_quote', input: {}, result: { ok: true, data: { total: 1 } } };
    const scan = scanPromises('The team has been informed.', { ...NO_EVIDENCE, toolRuns: [quoteRun] });
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it('the registry is EXACTLY these two, and get_booking is deliberately absent', () => {
    // get_booking is registered in NO class on purpose (CH-11 D2): C1's regex
    // packs `confirmed` in with `informed`, so registering it would license
    // "the team has been informed" off a mere booking lookup.
    expect([...TOOL_CLAIMS.keys()].sort()).toEqual(['create_staff_task', 'remember_fact']);
    expect([...(TOOL_CLAIMS.get('remember_fact') ?? [])]).toEqual(['C4']);
    expect([...(TOOL_CLAIMS.get('create_staff_task') ?? [])].sort()).toEqual(['C1', 'C2']);
  });

  it('a memory save still never cross-licenses a staff claim, and vice versa', () => {
    const saved: ToolRun = { name: 'remember_fact', input: {}, result: { ok: true, data: {} } };
    expect(
      scanPromises('The team has been informed.', { ...NO_EVIDENCE, toolRuns: [saved] }).violations
        .length,
    ).toBeGreaterThan(0);
    const tasked: ToolRun = { name: 'create_staff_task', input: {}, result: { ok: true, data: {} } };
    expect(
      scanPromises("I'll remember that for next time.", { ...NO_EVIDENCE, toolRuns: [tasked] })
        .violations.length,
    ).toBeGreaterThan(0);
  });
});

describe('🚨 C1/C2 — create_staff_task licenses ONLY a delivered task (CH-13a)', () => {
  const delivered: ToolRun = {
    name: 'create_staff_task',
    input: {},
    result: { ok: true, data: { shortId: 'A3F2K9' } },
  };
  const undelivered: ToolRun = {
    name: 'create_staff_task',
    input: {},
    // What the tool returns when the card reached nobody. The task EXISTS.
    result: { ok: false, error: 'NOT_NOTIFIED', data: { shortId: 'A3F2K9' } },
  };

  it.each([
    'Two fresh towels are on their way up.',
    'The team has been informed.',
    "I've let housekeeping know.",
    'Housekeeping is on their way.',
  ])('a DELIVERED task licenses "%s"', (draft) => {
    expect(scanPromises(draft, { ...NO_EVIDENCE, toolRuns: [delivered] }).violations).toEqual([]);
  });

  it.each([
    'Two fresh towels are on their way up.',
    'The team has been informed.',
    'Housekeeping is on their way.',
  ])('an UNDELIVERED task licenses NOTHING — "%s" is a violation', (draft) => {
    // CH-12's blocker #5, held by construction: covered() counts successful
    // runs only, so the tool's ok:false is the whole mechanism. A row in a
    // table is not a person moving.
    expect(
      scanPromises(draft, { ...NO_EVIDENCE, toolRuns: [undelivered] }).violations.length,
    ).toBeGreaterThan(0);
  });
});

describe('🚨 task_done / sla_nudge — the out-of-turn evidence channel (CH-13a)', () => {
  it('sla_nudge licenses scenario 3\'s exact line', () => {
    // "I've just nudged housekeeping" is the ONLY honest answer to "where are
    // those?" 32 minutes in, and this row is the only thing that licenses it.
    const evidence = { ...NO_EVIDENCE, systemEvidence: classesFromContextKinds(['sla_nudge']) };
    expect(scanPromises("I've just nudged housekeeping.", evidence).violations).toEqual([]);
  });

  it('🚨 task_done licenses NO C5 claim — a context row has no referent', () => {
    // This test used to assert `task_done` licensed "That is sorted." It did —
    // via C5 — and that RE-OPENED the exact bug the C1/C5 split was for: after
    // ANY done task, "the airport transfer has been booked for Friday", "I've
    // arranged a late checkout" and "your refund has been logged" all shipped.
    // A towels DONE licensed a claim about an airport transfer, because
    // `covered()` is class-scoped and cannot see WHICH outcome a draft names.
    const evidence = { ...NO_EVIDENCE, systemEvidence: classesFromContextKinds(['task_done']) };
    for (const draft of [
      'Of course — the airport transfer has been booked for Friday.',
      "I've arranged a late checkout for you.",
      'Your refund has been logged.',
      'The issue has been escalated.',
    ]) {
      expect(scanPromises(draft, evidence).violations.length).toBeGreaterThan(0);
    }
    // The recorded, accepted residual: a TRUE anaphoric claim is refused too.
    // It fails toward an escalation, not a lie, and the deterministic close line
    // has already told the guest the work is done.
    expect(scanPromises('That is sorted.', evidence).violations.length).toBeGreaterThan(0);
  });

  it('but task_done still licenses what it genuinely proves — C1', () => {
    const evidence = { ...NO_EVIDENCE, systemEvidence: classesFromContextKinds(['task_done']) };
    for (const draft of ['The team has been informed.', 'Housekeeping knows.', "I've passed it on."]) {
      expect(scanPromises(draft, evidence).violations).toEqual([]);
    }
  });

  it('🚨 the C1/C5 split lost NO coverage main had', () => {
    // A phrase falling BETWEEN the two classes would ship unbacked — worse than
    // the bug the split fixed. Every phrase main's original 7 C1 regexes caught
    // must still be caught by C1 or C5.
    const MAIN_C1 = [
      'The team has been informed.', 'It has been notified.', 'You have been told.',
      'The staff have been alerted.', 'It has been arranged.', 'The room has been booked.',
      'It has been sent.', 'Someone has been dispatched.', 'The issue has been escalated.',
      'It has been raised.', 'Your refund has been logged.', 'The problem has been resolved.',
      'Your booking has been confirmed.', "I've informed the team.",
      'We have notified housekeeping.', "I've just told the front desk.", "I've nudged maintenance.",
      "I've arranged it.", "We've organised that.", "I've booked it.", "I've sent it.",
      "I've raised it.", "I've logged it.", "I've escalated it.", "I've passed it on.",
      'Consider it done.', 'Consider it sorted.', "That's sorted.", 'This is done.',
      'It has been taken care of.', 'Housekeeping knows.', 'The team is aware.',
      'The team are looking into it.', 'Housekeeping is on it.',
    ];
    for (const draft of MAIN_C1) {
      const scan = scanPromises(draft, NO_EVIDENCE);
      expect(scan.violations.length > 0 || scan.referral).toBe(true);
    }
  });

  it('🚨 but NEITHER licenses C2 — a nudge puts nobody in motion', () => {
    for (const kind of ['sla_nudge', 'task_done']) {
      const evidence = { ...NO_EVIDENCE, systemEvidence: classesFromContextKinds([kind]) };
      expect(
        scanPromises('Housekeeping is on their way.', evidence).violations.length,
      ).toBeGreaterThan(0);
    }
  });

  it('and neither licenses a memory promise', () => {
    const evidence = { ...NO_EVIDENCE, systemEvidence: classesFromContextKinds(['task_done']) };
    expect(scanPromises("I'll remember that.", evidence).violations.length).toBeGreaterThan(0);
  });
});

const stale = classesFromContextKinds(['task_done']);
const failed = (error: string): ToolRun => ({
  name: 'create_staff_task',
  input: {},
  result: { ok: false, error: error as never },
});

describe('🚨 the veto — a failure THIS TURN outranks a stale row (CH-13a)', () => {

  it.each([
    ['NOT_NOTIFIED', 'the card reached nobody'],
    // 🚨 The decision audit's finding: my first cut vetoed ONLY on
    // NOT_NOTIFIED — a PROXY for the contract "we tried and did not
    // demonstrably succeed". The handler's own catch returns UPSTREAM_DOWN (a
    // DB failure in insertTask; Railway deploys and OOMs are cited as live
    // causes), so a stale task_done licensed "the team has been informed" past
    // a turn whose task never even inserted. F4's shape, third door.
    ['UPSTREAM_DOWN', 'the insert itself failed'],
  ])('%s vetoes C1 — %s', (error) => {
    const evidence = { ...NO_EVIDENCE, toolRuns: [failed(error)], systemEvidence: stale };
    expect(scanPromises('The team has been informed.', evidence).violations.length).toBeGreaterThan(0);
  });

  it.each([
    ['REFUSED', 'a gate refused before we touched the world'],
    ['INVALID', 'the model fumbled the call'],
  ])('%s does NOT veto — %s, so nothing is disproved', (error) => {
    // Absence of a run is not evidence of absence. A turn that never tried may
    // still lean on a genuine row from the turn before.
    const evidence = { ...NO_EVIDENCE, toolRuns: [failed(error)], systemEvidence: stale };
    expect(scanPromises('The team has been informed.', evidence).violations).toEqual([]);
  });

  it('🚨 the veto SURVIVES a regenerate — a second pass is never weaker than the first', () => {
    // `toolRuns` is per-LOOP: turn.ts's regenerate returns a FRESH array. So
    // pass 1 fails to reach a human, vetoes C1 and blocks the claim; pass 2 —
    // in which the model, correctly told not to claim, does NOT call the tool
    // again — arrived with an EMPTY toolRuns, no veto, and the stale task_done
    // row still in the per-turn systemEvidence. The second pass shipped exactly
    // what the first one caught. turn.ts now carries the veto across loops.
    const pass2 = { ...NO_EVIDENCE, toolRuns: [], systemEvidence: stale };
    // Without the carried veto — the bug:
    expect(scanPromises('The team has been informed.', pass2).violations).toEqual([]);
    // With it, as turn.ts now passes:
    expect(
      scanPromises('The team has been informed.', {
        ...pass2,
        vetoed: vetoedByFailures([failed('NOT_NOTIFIED')]),
      }).violations.length,
    ).toBeGreaterThan(0);
  });

  it('an UNKNOWN future error code defaults to VETO, not to a licence', () => {
    // The list enumerates what is ALLOWED, never what is forbidden — the lesson
    // this repo has paid for five times. A code added later fails safe.
    const evidence = { ...NO_EVIDENCE, toolRuns: [failed('SOME_FUTURE_CODE')], systemEvidence: stale };
    expect(scanPromises('The team has been informed.', evidence).violations.length).toBeGreaterThan(0);
  });
});

describe('C4 — memory promises need a real remember_fact save (CH-09)', () => {
  const savedRun: ToolRun = {
    name: 'remember_fact',
    input: {},
    result: { ok: true, data: { saved: true, kind: 'preference' } },
  };
  const duplicateRun: ToolRun = {
    name: 'remember_fact',
    input: {},
    result: { ok: true, data: { saved: false, reason: 'duplicate' } },
  };
  const refusedRun: ToolRun = {
    name: 'remember_fact',
    input: {},
    result: { ok: false, error: 'REFUSED', message: 'not stored' },
  };

  it.each([
    "I'll remember that for your next visit.",
    "We'll remember the early check-in worked well for you.",
    "I've made a note of that.",
    'I have just made a note for the team.',
    "I've noted your preference.",
    "I'll keep that in mind for December.",
    'Saved that to your profile.',
    'Noted for your next stay.',
    // Pre-push audit battery: all nine shipped unbacked before the widening.
    'I shall note that down.',
    "I'll note that down for your next stay.",
    "We've put that on file.",
    "It's in your file now.",
    "I won't forget the anniversary.",
    "That's gone into your notes.",
    'Your preference is saved with us.',
    'We have that on record now.',
    "I'll be sure to remember.",
  ])('flags %j with no successful save', (draft) => {
    expect(scanPromises(draft, NO_EVIDENCE).violations.length).toBeGreaterThan(0);
  });

  it.each([
    'Noted — let me check with the team.', // bare "Noted —" is ordinary speech
    'I remember you loved the pool last time.', // recall is backed by block [5]
    'We remember your stay fondly.',
  ])('does NOT flag %j', (draft) => {
    expect(scanPromises(draft, NO_EVIDENCE).violations).toEqual([]);
  });

  it('a successful save licenses the memory claim', () => {
    const scan = scanPromises("Lovely — I'll remember that for next time.", {
      ...NO_EVIDENCE,
      toolRuns: [savedRun],
    });
    expect(scan.violations).toEqual([]);
  });

  it('a duplicate skip still licenses (the fact IS on file)', () => {
    const scan = scanPromises("I've noted that already.", {
      ...NO_EVIDENCE,
      toolRuns: [duplicateRun],
    });
    expect(scan.violations).toEqual([]);
  });

  it('a REFUSED save licenses nothing', () => {
    const scan = scanPromises("I've made a note of that.", {
      ...NO_EVIDENCE,
      toolRuns: [refusedRun],
    });
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it('a memory save never cross-licenses C1 (no bleed)', () => {
    const scan = scanPromises('The team has been informed.', {
      ...NO_EVIDENCE,
      toolRuns: [savedRun],
    });
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it('an escalation never licenses a memory claim (C3-only rule holds)', () => {
    const scan = scanPromises("I'll remember that.", {
      ...NO_EVIDENCE,
      escalationPlanned: true,
    });
    expect(scan.violations.length).toBeGreaterThan(0);
  });

  it('a fact_saved evidence row licenses the NEXT turn’s truthful confirmation (audit)', () => {
    expect(classesFromContextKinds(['fact_saved'])).toEqual(new Set(['C4']));
    const scan = scanPromises("Yes — I've noted your love of early check-ins.", {
      ...NO_EVIDENCE,
      systemEvidence: classesFromContextKinds(['fact_saved']),
    });
    expect(scan.violations).toEqual([]);
    // ...and it licenses ONLY C4 — never a completed-action claim.
    const c1 = scanPromises('The team has been informed.', {
      ...NO_EVIDENCE,
      systemEvidence: classesFromContextKinds(['fact_saved']),
    });
    expect(c1.violations.length).toBeGreaterThan(0);
  });
});
