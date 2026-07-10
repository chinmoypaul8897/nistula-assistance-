/**
 * The debounce decision (plan.md §2.2 step 4 / CH-03 step 1): reply only
 * after `quietMs` of guest silence, but never hold a burst longer than
 * `maxWaitMs` from its oldest unprocessed message. Pure — the worker feeds
 * it DB-clock timestamps; tests feed literals.
 *
 * WHY not pg-boss sendDebounced (the spec's named primitive): verified on
 * the installed 12.25.1 it is a leading-edge wall-clock-slot throttle — the
 * first send in a slot runs IMMEDIATELY (a burst would echo twice) and
 * completed jobs keep their slot, silently swallowing the worker's mandated
 * end-of-run re-enqueue. Full semantics recorded in progress.md (CH-03 D1).
 */

export interface DebounceWindows {
  quietMs: number;
  maxWaitMs: number;
  /** Sweeper wakes conversations whose oldest unprocessed message is older than this. */
  sweepAfterMs: number;
  sweepIntervalCron: string;
}

// These literals ARE the spec (plan.md §2.2 + CH-03 step 1) — changing them
// is a plan.md edit, not a config tweak; env promotion only on CH-17 data
// (CH-03 decision D4). Invariant quiet <= maxWait < sweepAfter is pinned by
// a unit test: a sweeper firing inside maxWait would double-process bursts.
export const DEBOUNCE_WINDOWS: DebounceWindows = {
  quietMs: 15_000,
  maxWaitMs: 45_000,
  sweepAfterMs: 60_000,
  sweepIntervalCron: '*/2 * * * *',
};

export type DebounceDecision = { action: 'process' } | { action: 'requeue'; startAfter: Date };

/** Decides whether a worker wake-up processes now or re-queues itself for the quiet boundary. */
export function decideDebounce(input: {
  newestAt: Date;
  oldestAt: Date;
  now: Date;
  quietMs: number;
  maxWaitMs: number;
}): DebounceDecision {
  const newestAgeMs = input.now.getTime() - input.newestAt.getTime();
  const oldestAgeMs = input.now.getTime() - input.oldestAt.getTime();
  if (newestAgeMs >= input.quietMs || oldestAgeMs >= input.maxWaitMs) {
    return { action: 'process' };
  }
  // +1s past the boundary kills flap: the job must wake with quiet
  // DECISIVELY elapsed on the DB clock, not exactly at it.
  return {
    action: 'requeue',
    startAfter: new Date(input.newestAt.getTime() + input.quietMs + 1000),
  };
}
