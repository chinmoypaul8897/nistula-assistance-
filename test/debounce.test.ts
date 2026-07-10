/**
 * Tier A (CH-03): the pure debounce decision at the REAL spec values —
 * the plan's literal test cases ("3 messages in 5s → one run", "20s apart
 * → two runs", 45s max wait) live here, timestamp-driven, no DB, no boss.
 */
import { describe, expect, it } from 'vitest';
import { DEBOUNCE_WINDOWS, decideDebounce } from '../src/brain/debounce.js';

const BASE = Date.UTC(2026, 6, 10, 12, 0, 0);
const at = (seconds: number) => new Date(BASE + seconds * 1000);

const windows = { quietMs: DEBOUNCE_WINDOWS.quietMs, maxWaitMs: DEBOUNCE_WINDOWS.maxWaitMs };

describe('decideDebounce — spec cases at 15s quiet / 45s max wait', () => {
  it('a 3-in-5s burst waits for quiet, then processes ONCE (one run)', () => {
    // Messages land at t=0/2/5. A wake at t=15 is NOT quiet (newest 10s old).
    const early = decideDebounce({ newestAt: at(5), oldestAt: at(0), now: at(15), ...windows });
    expect(early).toEqual({ action: 'requeue', startAfter: at(5 + 15 + 1) });
    // The re-queued wake at t=21 IS quiet — the whole burst processes.
    const settled = decideDebounce({ newestAt: at(5), oldestAt: at(0), now: at(21), ...windows });
    expect(settled).toEqual({ action: 'process' });
  });

  it('messages 20s apart process as TWO runs', () => {
    // First message alone at its t+15 wake: quiet — run one.
    expect(decideDebounce({ newestAt: at(0), oldestAt: at(0), now: at(15), ...windows })).toEqual({
      action: 'process',
    });
    // Second message (t=20) at its own t+15 wake: quiet — run two.
    expect(decideDebounce({ newestAt: at(20), oldestAt: at(20), now: at(35), ...windows })).toEqual(
      { action: 'process' },
    );
  });

  it('a rolling burst is cut off at the 45s max wait even while not quiet', () => {
    const decision = decideDebounce({ newestAt: at(43), oldestAt: at(0), now: at(45), ...windows });
    expect(decision).toEqual({ action: 'process' });
  });

  it('a fresh single message re-queues to its quiet boundary +1s', () => {
    const decision = decideDebounce({ newestAt: at(0), oldestAt: at(0), now: at(1), ...windows });
    expect(decision).toEqual({ action: 'requeue', startAfter: at(16) });
  });

  it('boundaries are inclusive: exactly quiet / exactly max wait both process', () => {
    expect(decideDebounce({ newestAt: at(0), oldestAt: at(0), now: at(15), ...windows })).toEqual({
      action: 'process',
    });
    expect(decideDebounce({ newestAt: at(44), oldestAt: at(0), now: at(45), ...windows })).toEqual({
      action: 'process',
    });
    // 1ms short of quiet (and well inside max wait) still holds.
    const shy = decideDebounce({
      newestAt: at(0),
      oldestAt: at(0),
      now: new Date(BASE + windows.quietMs - 1),
      ...windows,
    });
    expect(shy.action).toBe('requeue');
  });
});

describe('DEBOUNCE_WINDOWS invariants (the values ARE the spec)', () => {
  it('quiet ≤ maxWait < sweepAfter — a sweeper inside maxWait would double-process bursts', () => {
    expect(DEBOUNCE_WINDOWS.quietMs).toBeLessThanOrEqual(DEBOUNCE_WINDOWS.maxWaitMs);
    expect(DEBOUNCE_WINDOWS.maxWaitMs).toBeLessThan(DEBOUNCE_WINDOWS.sweepAfterMs);
  });

  it('pins the plan.md CH-03 literals', () => {
    expect(DEBOUNCE_WINDOWS).toEqual({
      quietMs: 15_000,
      maxWaitMs: 45_000,
      sweepAfterMs: 60_000,
      sweepIntervalCron: '*/2 * * * *',
    });
  });
});
