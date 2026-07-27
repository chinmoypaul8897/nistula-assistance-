/**
 * CH-17 steps 1 & 2 — the watchdog ladder. Assert the OUTCOME with an injected
 * probe/ping/clock (dev cannot run the real poller — EZEE_POLLER_ENABLED=0 is
 * binding), driving the exact DoD: a healthy tick pings and does not alert; an
 * unhealthy tick does NOT ping and DOES alert. Plus the quiet-channel monitor's
 * business-hours + both-directions-stale contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_QUIET_STALE_MINUTES,
  resetQuietChannelState,
  runWatchdog,
  type WatchdogDeps,
} from '../src/ops/watchdog.js';
import { configureOpsAlerts, resetOpsAlerts } from '../src/ops/alerts.js';
import type { WaClient } from '../src/wa/client.js';
import { istWallClockToInstant } from '../src/lib/time.js';
import type { HealthReport } from '../src/ops/health.js';

const OPS = '+917700900879';
const HEALTHY: HealthReport = { db: true, boss: true, pollerAgeMs: 1000, senderAgeMs: 1000, degraded: false };
const UNHEALTHY: HealthReport = { ...HEALTHY, pollerAgeMs: 6 * 60 * 1000 };

/**
 * The alertOps dedupe clock, ADVANCED by `tick()` to match the watchdog's own.
 *
 * 🚨 IT USED TO BE FROZEN AT 0, and that made every re-warn assertion blind to
 * the outcome that matters. alertOps suppresses a repeat within 30 min of ITS
 * clock, so with a frozen clock only the FIRST channel_quiet per test could ever
 * reach a handset — `sent` could never grow, so nothing could assert that a
 * re-warn is actually DELIVERED. `quietWarned` and `log.error` both fire before
 * delivery, so they measure due-ness, not receipt: exactly the trap CLAUDE.md
 * names ("Due, yes; sent, no").
 */
let opsClock = 0;

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
    now: () => opsClock,
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
    lastEchoAt: async () => new Date(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  opsClock = 0;
  // Also reset BEFORE, not only after: an `it.only`, a `--bail` or a worker
  // crash leaves module state behind, and the leak's signature is a test that
  // passes because nothing warned.
  resetQuietChannelState();
});
afterEach(() => {
  resetOpsAlerts();
  // The backoff is module state (like the alertOps dedupe) — a leaked warnCount
  // would silence the next test and it would pass for the wrong reason.
  resetQuietChannelState();
});

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
  const MIN = 60 * 1000;
  const ist = (wall: string) => istWallClockToInstant(wall).getTime();

  /**
   * One tick, with the last ARRIVAL given as an ABSOLUTE instant.
   *
   * 🚨 IT USED TO TAKE "quiet for N minutes" RELATIVE TO THE TICK, and that
   * quietly broke the tests that matter: the backoff now keys on the identity of
   * the silence (`lastAnyMs`), so two ticks meant to describe ONE silence have to
   * report the SAME arrival instant. With relative offsets an off-by-one in the
   * caller's arithmetic silently invents a NEW silence and resets the ladder —
   * the test still passes, for the wrong reason.
   *
   * Also advances the alertOps dedupe clock with the watchdog's, so `sent` can
   * measure DELIVERY rather than due-ness.
   */
  const tick = async (
    atMs: number,
    lastArrivalMs: number | null,
    over: Partial<WatchdogDeps> = {},
  ): Promise<boolean> => {
    opsClock = atMs;
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        now: () => new Date(atMs),
        lastInboundAt: async () => (lastArrivalMs === null ? null : new Date(lastArrivalMs)),
        lastEchoAt: async () => null,
        ...over,
      }),
    );
    return res.quietWarned;
  };

  const NOON = NOON_IST.getTime();
  /** The arrival that leaves NOON one minute past the DEFAULT threshold — derived
   * from the constant, not a literal, so retuning the default cannot leave this
   * fixture quietly describing a different scenario. It still lands after 08:00,
   * so the open-monitor clamp is not what makes these ticks stale. */
  const QUIET_SINCE = NOON - (DEFAULT_QUIET_STALE_MINUTES + 1) * MIN;

  it('business hours + nothing arrived beyond the threshold ⇒ warns AND delivers', async () => {
    const sent = armOps();
    expect(await tick(NOON, QUIET_SINCE)).toBe(true);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'channel_quiet', warnCount: 1 }),
      expect.anything(),
    );
    expect(sent).toHaveLength(1);
  });

  it('🚨 THE BUG: a 30-minute lull is NOT a dead webhook and must NOT alert', async () => {
    // The live rehearsal (25–26 Jul 2026) took ~18–30 of these a DAY on the ops
    // handset because the threshold was a hardcoded 30 min. A boutique villa
    // line is legitimately quiet for half an hour; the alert that fired on it
    // was answering the wrong question.
    armOps();
    expect(await tick(NOON, NOON - 31 * MIN)).toBe(false);
    expect(log.error).not.toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'channel_quiet' }),
      expect.anything(),
    );
  });

  it('the threshold is TUNABLE in BOTH directions', async () => {
    // 🚨 EVERY value here is stale under the tuned threshold and under NEITHER
    // the old hardcoded 30 nor the new 180 default. A 31-minute silence would
    // NOT do: it is stale under the old constant too, so the one test whose job
    // is "the knob is honoured" would pass with the knob ignored.
    armOps();
    // Tighter threshold reports a silence the default would not.
    expect(await tick(NOON, NOON - 25 * MIN, { quietStaleMinutes: 20 })).toBe(true);
    resetQuietChannelState();
    expect(await tick(NOON, NOON - 25 * MIN)).toBe(false);
    // ...and a LOOSER one SUPPRESSES a silence the default would report. That is
    // the direction this fix actually shipped for, and it had no test at all.
    expect(await tick(NOON, NOON - 200 * MIN, { quietStaleMinutes: 300 })).toBe(false);
    expect(await tick(NOON, NOON - 200 * MIN)).toBe(true);
  });

  it('🚨 BACKOFF: a persistently quiet channel does not re-warn every tick', async () => {
    // Warning once is right; warning every 30 minutes for the rest of the
    // business day is the noise. alertOps' own 30-min dedupe could never deliver
    // this — it stops suppressing the moment the gap exceeds its own window.
    const sent = armOps();
    expect(await tick(NOON, QUIET_SINCE)).toBe(true); // first warning
    // Every 5-min tick for the next ~6 hours stays SILENT (2× the threshold).
    for (let m = 5; m <= 355; m += 5) {
      expect(await tick(NOON + m * MIN, QUIET_SINCE)).toBe(false);
    }
    // The fence itself, not 60 minutes short of it: 2 × 180 = 360.
    expect(await tick(NOON + 359 * MIN, QUIET_SINCE)).toBe(false);
    expect(await tick(NOON + 360 * MIN, QUIET_SINCE)).toBe(true);
    // And it REACHED the handset — the point is cards per day, not log lines.
    expect(sent).toHaveLength(2);
  });

  it('🚨 the re-warn ladder widens, then HOLDS at the last multiplier', async () => {
    // The 2nd and 3rd rungs are unreachable at the 180 default (12h out = always
    // overnight), so nothing exercised the clamp that makes the last multiplier
    // repeat for ever. A tuned threshold reaches all of them inside one day.
    armOps();
    const q = { quietStaleMinutes: 20 }; // gaps: 40, 80, 80...
    const since = NOON - 21 * MIN;
    expect(await tick(NOON, since, q)).toBe(true);
    expect(await tick(NOON + 40 * MIN, since, q)).toBe(true);
    expect(await tick(NOON + 120 * MIN, since, q)).toBe(true);
    expect(await tick(NOON + 199 * MIN, since, q)).toBe(false);
    expect(await tick(NOON + 200 * MIN, since, q)).toBe(true);
  });

  it('🚨 no threshold can buy a SILENT business day — the cap is ABSOLUTE', async () => {
    // Relative multipliers are a ceiling on a TUNABLE, which is not a ceiling.
    // At QUIET_STALE_MINUTES=800 the uncapped 2× gap is 26.7h, which lands past
    // the next day's 23:00 close — so day 2 passes with NO alert about a dead
    // webhook. Nothing else reports this failure: healthchecks.io only sees
    // INTERNAL health, and the 23:30 rollup carries no channel field and
    // fail-quiets on the all-zero day a dead webhook produces.
    armOps();
    const q = { quietStaleMinutes: 800 };
    const since = ist('2026-07-19T08:00');
    // 800 min of open-monitor silence from 08:00 ⇒ first stale one minute past
    // 21:20 (the comparison is strict — 800 is not yet BEYOND 800).
    expect(await tick(ist('2026-07-19T21:21'), since, q)).toBe(true);
    // Day 2, same silence: the gap is capped at 12h, and 24h have passed, so
    // this warns. Uncapped it would be 26.7h — day 2 would be SILENT.
    expect(await tick(ist('2026-07-20T21:21'), since, q)).toBe(true);
  });

  it('🚨 an ARRIVAL resets the backoff — the next silence warns at once', async () => {
    armOps();
    expect(await tick(NOON, QUIET_SINCE)).toBe(true);
    expect(await tick(NOON + 10 * MIN, QUIET_SINCE)).toBe(false); // still backing off
    // A guest writes in: something came THROUGH the webhook.
    expect(await tick(NOON + 20 * MIN, NOON + 20 * MIN)).toBe(false);
    // It goes quiet again — a NEW silence, warned about immediately rather than
    // inheriting the previous silence's 6h gap.
    expect(await tick(NOON + 205 * MIN, NOON + 20 * MIN)).toBe(true);
  });

  it('🚨 an OVERNIGHT arrival is recognised — the new silence is not warning #2', async () => {
    // The reset used to be unreachable outside 08:00–23:00, because the
    // business-hours gate returns BEFORE the traffic read. So a guest messaging
    // at 23:30 left the ladder untouched, and a webhook that died afterwards
    // inherited yesterday's 12h gap — a REAL outage suppressed for hours, while
    // the card claimed a high warnCount about a channel that had just worked.
    // Keying identity on the arrival instant fixes it with no out-of-hours read.
    armOps();
    expect(await tick(NOON, QUIET_SINCE)).toBe(true);
    const overnight = ist('2026-07-19T23:30');
    expect(await tick(ist('2026-07-20T12:00'), overnight)).toBe(true);
    // warnCount 1, NOT 2 — the overnight arrival ended the first silence.
    expect(log.error).toHaveBeenLastCalledWith(
      expect.objectContaining({ opsAlert: 'channel_quiet', warnCount: 1 }),
      expect.anything(),
    );
  });

  it('🚨 a clock rollover ALONE does not reset — same silence stays warning #2', async () => {
    // The counterpart of the test above, and the reason the reset must key on a
    // FACT: crossing midnight with NO arrival is not evidence of recovery.
    armOps();
    expect(await tick(NOON, QUIET_SINCE)).toBe(true);
    // 23:30 — past MONITOR_END, so no warn (and nothing arrived).
    expect(await tick(ist('2026-07-19T23:30'), QUIET_SINCE)).toBe(false);
    expect(await tick(ist('2026-07-20T12:00'), QUIET_SINCE)).toBe(true);
    expect(log.error).toHaveBeenLastCalledWith(
      expect.objectContaining({ opsAlert: 'channel_quiet', warnCount: 2 }),
      expect.anything(),
    );
  });

  it('🚨 a coexistence ECHO counts as arrival; our OWN send does not', async () => {
    // The old second leg was `lastGuestReplyDeliveredAt`, which an unprompted
    // lifecycle send satisfies — and those are driven by the eZee poller, which
    // runs happily while the webhook is dead. One such send blinded the monitor
    // (for 30 min before this fix; for 3h after it — a 6× wider hole). An echo
    // is different in kind: it arrives THROUGH the webhook, so it proves it.
    armOps();
    expect(
      await tick(NOON, QUIET_SINCE, { lastEchoAt: async () => new Date(NOON - MIN) }),
    ).toBe(false);
    // Same instant, same silence, no echo — now it warns. So it was the echo
    // that suppressed it and not something incidental to the fixture.
    expect(await tick(NOON, QUIET_SINCE)).toBe(true);
  });

  it('🚨 the OVERNIGHT gap does not count — no guaranteed 08:00 false alarm', async () => {
    // The window is shut 23:00–08:00, so measuring silence on the WALL clock made
    // the 08:00 tick fire for ANY line whose last message predated 05:00 — one
    // false alert every single morning that NO value of the knob could suppress
    // (below ~9h it fires; at ≥9h the daytime monitor is dead).
    armOps();
    const eight = ist('2026-07-20T08:00');
    const lastEvening = ist('2026-07-19T19:30'); // 12.5h of wall clock
    expect(await tick(eight, lastEvening)).toBe(false);
    expect(await tick(eight + 179 * MIN, lastEvening)).toBe(false);
    // Three hours of OPEN-monitor silence, and only then does it warn.
    expect(await tick(eight + 181 * MIN, lastEvening)).toBe(true);
  });

  it('does NOT warn outside business hours even when nothing has arrived', async () => {
    armOps();
    const res = await runWatchdog(
      mkDeps({
        probe: async () => HEALTHY,
        now: () => NIGHT_IST, // 03:00 IST
        lastInboundAt: async () => null,
        lastEchoAt: async () => null,
      }),
    );
    expect(res.quietWarned).toBe(false);
  });
});
