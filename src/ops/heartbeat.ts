/**
 * In-memory process heartbeats (CH-17). The poller, the sender, the watchdog and
 * /health all run in the SAME Railway process, so a module singleton is the
 * right scope: it detects a WORKER that stopped beating while the process lives
 * (a wedged cron) — exactly the silent failure the watchdog must catch. A
 * whole-process death is a DIFFERENT failure, caught by healthchecks.io's
 * dead-man timeout, not by this.
 *
 * State resets on deploy, which is correct: a fresh process has no history to be
 * stale against, and ops/health treats "never beaten yet" as N/A (not a fault),
 * so a deploy never false-alarms before the first tick.
 */
const beats = new Map<string, number>();

/** Records that `name` just did useful work. `at` is injectable for tests. */
export function noteHeartbeat(name: string, at: number = Date.now()): void {
  beats.set(name, at);
}

/** ms since `name` last beat, or null if it has never beaten. */
export function heartbeatAgeMs(name: string, now: number = Date.now()): number | null {
  const last = beats.get(name);
  return last === undefined ? null : now - last;
}

/** Test seam: forget all beats. */
export function resetHeartbeats(): void {
  beats.clear();
}
