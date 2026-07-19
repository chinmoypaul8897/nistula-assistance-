/**
 * CH-18a-2 coexistence keep-alive (src/ops/keepalive.ts). Pure unit test:
 * the clock and the last-seen getters are injected, so no Postgres is needed.
 * 2024-01-01 is a Monday (the reminder weekday); 2024-01-02 a Tuesday.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import { runKeepAlive } from '../src/ops/keepalive.js';
import { resetOpsAlerts } from '../src/ops/alerts.js';

function makeLog() {
  const lines: Record<string, unknown>[] = [];
  return {
    lines,
    error(obj: Record<string, unknown>) {
      lines.push(obj);
    },
    info(obj: Record<string, unknown>) {
      lines.push(obj);
    },
  };
}
const alertKinds = (log: ReturnType<typeof makeLog>): unknown[] =>
  log.lines.map((l) => l.opsAlert).filter((k) => k !== undefined);

const db = {} as unknown as Db; // never touched — getters are injected
beforeEach(() => resetOpsAlerts());

describe('coexistence keep-alive — pre-cutover (active=false) weekly reminder', () => {
  const monday = () => new Date('2024-01-01T12:00:00Z');
  const tuesday = () => new Date('2024-01-02T12:00:00Z');

  it('nudges ops on the reminder weekday', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ db, log, active: false, maxDays: 13, now: monday });
    expect(r).toEqual({ mode: 'reminder', alerted: true });
    expect(alertKinds(log)).toContain('coexistence_keepalive_reminder');
  });

  it('is silent on every other day', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ db, log, active: false, maxDays: 13, now: tuesday });
    expect(r).toEqual({ mode: 'reminder', alerted: false });
    expect(alertKinds(log)).toHaveLength(0);
  });
});

describe('coexistence keep-alive — post-cutover (active=true) daily staleness check', () => {
  const now = () => new Date('2024-06-10T12:00:00Z');
  const daysAgo = (n: number) => new Date(now().getTime() - n * 86_400_000);
  const base = { db, active: true as const, maxDays: 13, now };

  it('is silent when a guest inbound is within maxDays', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ ...base, log, lastEchoAt: async () => null, lastInboundAt: async () => daysAgo(2) });
    expect(r).toEqual({ mode: 'check', alerted: false });
    expect(alertKinds(log)).toHaveLength(0);
  });

  it('is silent when only a staff echo is fresh (inbound long stale)', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ ...base, log, lastEchoAt: async () => daysAgo(3), lastInboundAt: async () => daysAgo(40) });
    expect(r.alerted).toBe(false);
  });

  it('alerts when nothing has been seen within maxDays', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ ...base, log, lastEchoAt: async () => daysAgo(20), lastInboundAt: async () => daysAgo(40) });
    expect(r).toEqual({ mode: 'check', alerted: true });
    expect(alertKinds(log)).toContain('coexistence_link_at_risk');
  });

  it('alerts when the link has never shown any life', async () => {
    const log = makeLog();
    const r = await runKeepAlive({ ...base, log, lastEchoAt: async () => null, lastInboundAt: async () => null });
    expect(r.alerted).toBe(true);
    expect(alertKinds(log)).toContain('coexistence_link_at_risk');
  });
});
