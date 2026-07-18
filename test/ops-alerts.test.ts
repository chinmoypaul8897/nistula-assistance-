/**
 * CH-17 step 3 — the ops-alert channel. Assert the OUTCOME: WhatsApp delivery
 * happens once per kind inside a 30-min window, the token alert is NEVER
 * delivered (circularity guard), and an unconfigured seam stays log-only.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { alertOps, configureOpsAlerts, resetOpsAlerts } from '../src/ops/alerts.js';
import type { WaClient } from '../src/wa/client.js';

const OPS_A = '+917700900871';
const OPS_B = '+917700900872';

function fakeWa() {
  const sent: { to: string; summary: string; day: string }[] = [];
  const sendTemplated = vi.fn(
    async (
      to: string,
      send: { key: string; params: Record<string, unknown> },
    ) => {
      sent.push({ to, summary: String(send.params.summary), day: String(send.params.day) });
      return { ok: true as const, messageId: 'm', waMessageId: 'w', usedTemplate: false };
    },
  );
  return { wa: { sendTemplated } as unknown as Pick<WaClient, 'sendTemplated'>, sent, sendTemplated };
}

const mkLog = () => ({ error: vi.fn() });

afterEach(() => resetOpsAlerts());

describe('alertOps delivery', () => {
  it('logs AND delivers to every ops number when configured', async () => {
    const { wa, sent } = fakeWa();
    let now = 1_000_000;
    configureOpsAlerts({ wa, opsNumbers: [OPS_A, OPS_B], now: () => now });
    const log = mkLog();

    await alertOps(log, { kind: 'ezee_poll_failing', summary: 'eZee polling failing' });

    expect(log.error).toHaveBeenCalledTimes(1); // audit line always fires
    expect(sent).toHaveLength(2); // one per ops number
    expect(sent.map((s) => s.to).sort()).toEqual([OPS_A, OPS_B].sort());
    expect(sent[0]!.summary).toContain('ALERT eZee polling failing');
  });

  it('dedupes the same kind inside the 30-min window, re-fires after it', async () => {
    const { wa, sent } = fakeWa();
    let now = 0;
    configureOpsAlerts({ wa, opsNumbers: [OPS_A], now: () => now });
    const log = mkLog();

    await alertOps(log, { kind: 'watchdog_unhealthy', summary: 'poller stale' });
    now = 29 * 60 * 1000; // still inside the window
    await alertOps(log, { kind: 'watchdog_unhealthy', summary: 'poller stale' });
    expect(sent).toHaveLength(1); // deduped
    expect(log.error).toHaveBeenCalledTimes(2); // both still logged

    now = 31 * 60 * 1000; // window elapsed
    await alertOps(log, { kind: 'watchdog_unhealthy', summary: 'poller stale' });
    expect(sent).toHaveLength(2); // re-fired

    // A different kind is tracked independently.
    await alertOps(log, { kind: 'channel_quiet', summary: 'quiet' });
    expect(sent).toHaveLength(3);
  });

  it('NEVER delivers wa_token_expired over WhatsApp — a dead token fails its own send', async () => {
    const { wa, sent } = fakeWa();
    configureOpsAlerts({ wa, opsNumbers: [OPS_A], now: () => 0 });
    const log = mkLog();

    await alertOps(log, { kind: 'wa_token_expired', summary: 'WA token expired — rotate per runbook' });

    expect(log.error).toHaveBeenCalledTimes(1); // logged (healthchecks + Railway logs carry it)
    expect(sent).toHaveLength(0); // but never sent
  });

  it('stays log-only when unconfigured (dev / tests) and never throws', async () => {
    const log = mkLog();
    await expect(
      alertOps(log, { kind: 'wa_send_failed', summary: 'boom' }),
    ).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it('is inert with an empty ops list', async () => {
    const { wa, sent } = fakeWa();
    configureOpsAlerts({ wa, opsNumbers: [], now: () => 0 });
    const log = mkLog();
    await alertOps(log, { kind: 'x', summary: 'y' });
    expect(sent).toHaveLength(0);
  });
});
