/**
 * Degraded-mode tracker (plan.md §3.4, CH-05 step 7). Pure. Flips after 3
 * consecutive failures with ONE flip alert (not one per failure), clears on the
 * first success with a recovery alert.
 */
import { describe, expect, it, vi } from 'vitest';
import { createDegradedTracker } from '../src/brain/tools/degraded.js';

function make() {
  const log = { error: vi.fn() };
  return { log, tracker: createDegradedTracker({ log }) };
}

function alertKinds(log: { error: ReturnType<typeof vi.fn> }): string[] {
  return log.error.mock.calls.map((call) => (call[0] as { opsAlert?: string }).opsAlert ?? '');
}

describe('createDegradedTracker', () => {
  it('flips degraded after 3 consecutive failures, alerting once on the flip', () => {
    const { log, tracker } = make();
    tracker.record('down');
    tracker.record('down');
    expect(tracker.isDegraded()).toBe(false);
    tracker.record('down');
    expect(tracker.isDegraded()).toBe(true);
    tracker.record('down'); // still degraded, but no second alert
    expect(alertKinds(log).filter((k) => k === 'website_degraded')).toHaveLength(1);
  });

  it('a success before 3 resets the streak (never degrades)', () => {
    const { tracker } = make();
    tracker.record('down');
    tracker.record('down');
    tracker.record('up');
    tracker.record('down');
    expect(tracker.isDegraded()).toBe(false);
  });

  it('clears on the first success and alerts recovery once', () => {
    const { log, tracker } = make();
    tracker.record('down');
    tracker.record('down');
    tracker.record('down');
    tracker.record('up');
    expect(tracker.isDegraded()).toBe(false);
    expect(alertKinds(log)).toEqual(['website_degraded', 'website_recovered']);
  });
});
