/**
 * CH-17 steps 1 & 2 — the watchdog ladder. Assert the OUTCOME with an injected
 * probe/ping/clock (dev cannot run the real poller — EZEE_POLLER_ENABLED=0 is
 * binding), driving the exact DoD: a healthy tick pings and does not alert; an
 * unhealthy tick does NOT ping and DOES alert. Plus the quiet-channel monitor's
 * business-hours + both-directions-stale contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runWatchdog, type WatchdogDeps } from '../src/ops/watchdog.js';
import { configureOpsAlerts, resetOpsAlerts } from '../src/ops/alerts.js';
import type { WaClient } from '../src/wa/client.js';
import { istWallClockToInstant } from '../src/lib/time.js';
import type { HealthReport } from '../src/ops/health.js';

const OPS = '+917700900879';
const HEALTHY: HealthReport = { db: true, boss: true, pollerAgeMs: 1000, senderAgeMs: 1000, degraded: false };
const UNHEALTHY: HealthReport = { ...HEALTHY, pollerAgeMs: 6 * 60 * 1000 };

// Capture ops deliveries by kind (the alertOps module singleton drives them).
function armOps() {
  const sent: { summary: string }[] = [];
  const sendTemplated = vi.fn(async (_to: string, send: { params: Record<string, unknown> }) => {
    sent.push({ summary: String(send.params.summary) });
    return { ok: true as const, messageId: 'm', waMessageId: 'w', usedTemplate: false };
  });
  configureOpsAlerts({
    wa: { sendTemplated } as unknown as Pick<WaClient, 'sendTemplated'>,
    opsNumbers: [OPS],
    now: () => 0, // fresh dedupe window each test (reset in afterEach)
  });
  return sent;
}

const log = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
// A daytime IST instant with no seeded traffic ⇒ quiet-channel condition holds
// unless overridden per test.
const NOON_IST = istWallClockToInstant('2026-07-19T12:00');
const NIGHT_IST = istWallClockToInstant('2026-07-19T03:00');

function mkDeps(over: Partial<WatchdogDeps>): WatchdogDeps {
  return {
    db: {} as never,
    log,
    now: () => NIGHT_IST, // default: outside business hours ⇒ quiet monitor off
    lastInboundAt: async () => new Date(),
    lastOutboundAt: async () => new Date(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => resetOpsAlerts());

describe('runWatchdog dead-man ladder', () => {
  it('healthy + a ping url ⇒ pings, no alert', async () => {
    const ping = vi.fn(async () => {});
    const sent = armOps();
    const res = await runWatchdog(mkDeps({ probe: async () => HEALTHY, ping, healthchecksUrl: 'https://hc.test/uuid' }));

    expect(ping).toHaveBeenCalledWith('https://hc.test/uuid');
    expect(res).toMatchObject({ healthy: true, pinged: true });
    expect(sent).toHaveLength(0);
  });

  it('healthy + NO ping url (dev) ⇒ no ping, no alert', async () => {
    const ping = vi.fn(async () => {});
    const sent = armOps();
    const res = await runWatchdog(mkDeps({ probe: async () => HEALTHY, ping }));
    expect(ping).not.toHaveBeenCalled();
    expect(res.pinged).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('UNHEALTHY ⇒ skips the ping AND alerts ops', async () => {
    const ping = vi.fn(async () => {});
    const sent = armOps();
    const res = await runWatchdog(mkDeps({ probe: async () => UNHEALTHY, ping, healthchecksUrl: 'https://hc.test/uuid' }));

    expect(ping).not.toHaveBeenCalled(); // the dead-man leg: silence trips healthchecks
    expect(res).toMatchObject({ healthy: false, pinged: false });
    expect(sent).toHaveLength(1); // the direct ops leg
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'watchdog_unhealthy', reasons: 'poller_stale' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('a ping failure never throws out of the tick', async () => {
    armOps();
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        ping: async () => {
          throw new Error('hc down');
        },
        healthchecksUrl: 'https://hc.test/uuid',
      }),
    );
    expect(res).toMatchObject({ healthy: true, pinged: false });
  });
});

describe('quiet-channel monitor', () => {
  it('business hours + both directions stale ⇒ warns once', async () => {
    const sent = armOps();
    const stale = new Date(NOON_IST.getTime() - 31 * 60 * 1000);
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        now: () => NOON_IST,
        lastInboundAt: async () => stale,
        lastOutboundAt: async () => stale,
      }),
    );
    expect(res.quietWarned).toBe(true);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'channel_quiet' }),
      expect.anything(),
    );
    expect(sent).toHaveLength(1);
  });

  it('does NOT warn when outbound is recent (Graph link proven alive)', async () => {
    armOps();
    const stale = new Date(NOON_IST.getTime() - 31 * 60 * 1000);
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        now: () => NOON_IST,
        lastInboundAt: async () => stale,
        lastOutboundAt: async () => NOON_IST, // fresh outbound
      }),
    );
    expect(res.quietWarned).toBe(false);
  });

  it('does NOT warn outside business hours even when both are stale', async () => {
    armOps();
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        now: () => NIGHT_IST, // 03:00 IST
        lastInboundAt: async () => null,
        lastOutboundAt: async () => null,
      }),
    );
    expect(res.quietWarned).toBe(false);
  });
});
