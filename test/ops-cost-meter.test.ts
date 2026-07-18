/**
 * CH-17 step 4 — the intra-day cost meter. Assert the thresholds and, crucially,
 * the IST-midnight auto-resume: a HARD day and a fresh day key are independent
 * totals, so the kill-switch clears when the day rolls over (Paul's call).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { configureCostMeter, costStatus, noteSpend, resetCostMeter } from '../src/ops/costMeter.js';

const DAY = '2026-07-19';
const NEXT = '2026-07-20';

afterEach(() => resetCostMeter());

describe('cost meter thresholds', () => {
  it('unconfigured ⇒ always ok (tests / pre-boot never gate)', () => {
    noteSpend(DAY, 999_999);
    expect(costStatus(DAY).level).toBe('ok');
  });

  it('crosses ok → soft (2x) → hard (4x) at the budget multiples', () => {
    configureCostMeter({ thresholdInr: 1000 });
    expect(costStatus(DAY)).toMatchObject({ total: 0, level: 'ok' });

    noteSpend(DAY, 1999);
    expect(costStatus(DAY).level).toBe('ok');
    noteSpend(DAY, 1); // 2000 = 2x
    expect(costStatus(DAY).level).toBe('soft');
    noteSpend(DAY, 1999); // 3999
    expect(costStatus(DAY).level).toBe('soft');
    noteSpend(DAY, 1); // 4000 = 4x
    expect(costStatus(DAY).level).toBe('hard');
  });

  it('AUTO-RESUMES at IST midnight — a fresh day key is a fresh 0 total', () => {
    configureCostMeter({ thresholdInr: 1000 });
    noteSpend(DAY, 5000); // hard today
    expect(costStatus(DAY).level).toBe('hard');
    // The next IST day is a different key ⇒ untouched, so the AI serves again.
    expect(costStatus(NEXT)).toMatchObject({ total: 0, level: 'ok' });
  });

  it('ignores non-positive / non-finite spend', () => {
    configureCostMeter({ thresholdInr: 1000 });
    noteSpend(DAY, 0);
    noteSpend(DAY, -50);
    noteSpend(DAY, Number.NaN);
    expect(costStatus(DAY).total).toBe(0);
  });
});
