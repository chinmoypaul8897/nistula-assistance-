/**
 * Degraded-mode tracker (plan.md §3.4, CH-05 step 7). The website rate API is a
 * PROCESS-global dependency, so its health must survive across turns and across
 * conversations — a per-call value or a conversations column cannot hold it.
 * This is a boot-constructed injected singleton (mirrors createWaClient /
 * createConverse), so tests build a fresh one and there is no hidden module
 * global.
 *
 * Semantics: 3 consecutive upstream failures flip it degraded (one ops alert on
 * the FLIP only, not each failure); the first answered success clears it (one
 * recovery alert). While degraded the brain stops quoting (block [6] renders the
 * flag) and defers instead of guessing.
 */
import { alertOps, type AlertLogger } from '../../ops/alerts.js';

export interface DegradedTracker {
  /** Called by every website outcome: 'down' = 429/502/network; 'up' = any answered status. */
  record(outcome: 'down' | 'up'): void;
  isDegraded(): boolean;
}

export interface DegradedDeps {
  log: AlertLogger;
  /** Consecutive failures before flipping degraded (§3.4 says >3 → use 3). */
  threshold?: number;
}

export function createDegradedTracker(deps: DegradedDeps): DegradedTracker {
  const threshold = deps.threshold ?? 3;
  let consecutive = 0;
  let degraded = false;

  return {
    record(outcome) {
      if (outcome === 'down') {
        consecutive += 1;
        if (consecutive >= threshold && !degraded) {
          degraded = true;
          void alertOps(deps.log, {
            kind: 'website_degraded',
            summary: `website rate API degraded after ${consecutive} consecutive failures — the AI will stop quoting`,
            detail: { consecutive },
          });
        }
        return;
      }
      // Any answered response (incl. UNAVAILABLE / INVALID) proves reachability.
      consecutive = 0;
      if (degraded) {
        degraded = false;
        void alertOps(deps.log, {
          kind: 'website_recovered',
          summary: 'website rate API recovered — quoting resumed',
        });
      }
    },
    isDegraded() {
      return degraded;
    },
  };
}
