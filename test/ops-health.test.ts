/**
 * CH-17 steps 1 & 5 — the internal-health predicate. The rigorous unit surface
 * is isHealthy(report): it decides whether the dead-man ping fires. Assert every
 * branch, especially the two that were easy to get wrong:
 *   - a null poller/sender age is N/A (disabled / not-yet-run), NOT stale — else
 *     every deploy false-alarms;
 *   - `degraded` (external website) is NEVER a health gate.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  configureHealth,
  isHealthy,
  probeHealth,
  resetHealth,
  STALE_MS,
  unhealthyReasons,
  type HealthReport,
} from '../src/ops/health.js';
import { noteHeartbeat, resetHeartbeats } from '../src/ops/heartbeat.js';

const base: HealthReport = {
  db: true,
  boss: true,
  pollerAgeMs: null,
  senderAgeMs: null,
  degraded: false,
};

afterEach(() => {
  resetHealth();
  resetHeartbeats();
});

describe('isHealthy', () => {
  it('is healthy when db+boss are up and no beaten worker is stale', () => {
    expect(isHealthy(base)).toBe(true);
    expect(isHealthy({ ...base, pollerAgeMs: STALE_MS - 1, senderAgeMs: 1000 })).toBe(true);
  });

  it('null poller/sender age is N/A, never a fault (a fresh/disabled process)', () => {
    expect(isHealthy({ ...base, pollerAgeMs: null, senderAgeMs: null })).toBe(true);
    expect(unhealthyReasons({ ...base, pollerAgeMs: null })).toEqual([]);
  });

  it('is unhealthy when db or boss is down', () => {
    expect(isHealthy({ ...base, db: false })).toBe(false);
    expect(isHealthy({ ...base, boss: false })).toBe(false);
    expect(unhealthyReasons({ ...base, db: false, boss: false })).toEqual([
      'db_unreachable',
      'boss_unresponsive',
    ]);
  });

  it('is unhealthy when a beaten poller/sender is stale beyond 5 min', () => {
    expect(isHealthy({ ...base, pollerAgeMs: STALE_MS + 1 })).toBe(false);
    expect(isHealthy({ ...base, senderAgeMs: STALE_MS + 1 })).toBe(false);
    expect(unhealthyReasons({ ...base, pollerAgeMs: STALE_MS + 1, senderAgeMs: STALE_MS + 1 })).toEqual([
      'poller_stale',
      'sender_stale',
    ]);
  });

  it('a degraded external website does NOT make us unhealthy (ping still fires)', () => {
    expect(isHealthy({ ...base, degraded: true })).toBe(true);
    expect(unhealthyReasons({ ...base, degraded: true })).toEqual([]);
  });
});

describe('probeHealth', () => {
  it('returns an all-clear report without touching a DB when unconfigured', async () => {
    const report = await probeHealth();
    expect(report).toEqual(base);
  });

  it('reports poller age from the heartbeat when the poller is enabled', async () => {
    const now = 10_000_000;
    noteHeartbeat('poller', now - 120_000); // 2 min ago
    configureHealth({
      db: { execute: async () => [] } as never,
      boss: { isInstalled: async () => true },
      degraded: { isDegraded: () => false },
      pollerEnabled: true,
      senderEnabled: false,
    });
    const report = await probeHealth(now);
    expect(report.pollerAgeMs).toBe(120_000);
    expect(report.senderAgeMs).toBeNull(); // sender disabled ⇒ N/A
    expect(report.boss).toBe(true);
    expect(report.db).toBe(true);
  });

  it('reports db:false when the round-trip throws', async () => {
    configureHealth({
      db: {
        execute: async () => {
          throw new Error('connection refused');
        },
      } as never,
      boss: { isInstalled: async () => true },
      degraded: { isDegraded: () => false },
      pollerEnabled: false,
      senderEnabled: false,
    });
    const report = await probeHealth();
    expect(report.db).toBe(false);
  });
});
