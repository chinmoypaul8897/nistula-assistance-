/**
 * The daily ops/cost rollup (plan §8 CH-17 step 4, §2.3 "Nightly: cost rollup").
 * A 23:30-IST cron that sums the day — messages in/out, active conversations,
 * escalations raised, guardrail hits, and Anthropic+template spend — into one
 * ops line, and writes the full breakdown to raw_events (the durable record an
 * operator reviews; §6.1's "revisit routing only if cost data demands it").
 *
 * Fail-quiet like the digest/quality report: a genuinely empty day (dev, or a
 * dead line) sends nothing and writes nothing — no daily empty ping. Reuses the
 * nst_digest template, so no new template.
 */
import { atISTHour, formatDayDisplay, istCalendarDay } from '../lib/time.js';
import type { Db } from '../db/client.js';
import {
  countActiveConversationsSince,
  countGuardrailHitsSince,
  countMessagesSince,
  insertRawEvent,
  sumCostForDay,
  type DailyCost,
} from '../db/repos.js';
import { countTasksRaisedSince } from '../db/tasks.js';
import { capUtf16 } from '../lib/text.js';
import { alertOps, type AlertLogger } from './alerts.js';
import type { WaClient } from '../wa/client.js';

/** 23:30 IST (plan §8 CH-17 step 4). */
export const ROLLUP_CRON = '30 23 * * *';
const SUMMARY_MAX_UNITS = 190;

export interface RollupDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
  opsNumbers: readonly string[];
  /** Injected — ONE clock per run (the CH-12 lesson). */
  now: () => Date;
}

export interface RollupRun {
  msgsIn: number;
  msgsOut: number;
  conversations: number;
  escalations: number;
  guardrailHits: number;
  cost: DailyCost;
  sent: boolean;
}

export async function runDailyRollup(deps: RollupDeps): Promise<RollupRun> {
  const now = deps.now();
  const dayStart = atISTHour(now, '00:00'); // start of THIS IST day
  const day = istCalendarDay(now);

  const [msgsIn, msgsOut, conversations, escalations, guardrailHits, cost] = await Promise.all([
    countMessagesSince(deps.db, 'in', dayStart),
    countMessagesSince(deps.db, 'out', dayStart),
    countActiveConversationsSince(deps.db, dayStart),
    countTasksRaisedSince(deps.db, ['escalation', 'night_queue'], dayStart),
    countGuardrailHitsSince(deps.db, dayStart),
    sumCostForDay(deps.db, day),
  ]);

  const run: RollupRun = {
    msgsIn,
    msgsOut,
    conversations,
    escalations,
    guardrailHits,
    cost,
    sent: false,
  };

  // Fail-quiet on a genuinely empty day — no daily empty ping.
  if (
    msgsIn === 0 &&
    msgsOut === 0 &&
    conversations === 0 &&
    escalations === 0 &&
    guardrailHits === 0 &&
    cost.totalInr === 0
  ) {
    deps.log.info?.({ day }, 'daily rollup — nothing today, not sent');
    return run;
  }

  await insertRawEvent(deps.db, {
    source: 'system',
    eventType: 'daily_rollup',
    // Never re-driven as a webhook event (the telemetry convention, CH-02 D6).
    processed: true,
    payload: { day, msgsIn, msgsOut, conversations, escalations, guardrailHits, cost },
  });

  const summary = buildSummary(run);
  run.sent = await sendToOps(deps, formatDayDisplay(day), summary);
  deps.log.info?.({ day, ...runNumbers(run), sent: run.sent }, 'daily rollup ran');
  return run;
}

function runNumbers(run: RollupRun): Record<string, number> {
  return {
    msgsIn: run.msgsIn,
    msgsOut: run.msgsOut,
    conversations: run.conversations,
    escalations: run.escalations,
    guardrailHits: run.guardrailHits,
    costInr: Math.round(run.cost.totalInr),
  };
}

/** A single-line rollup body (Meta bans newlines in a param). */
function buildSummary(run: RollupRun): string {
  const parts = [
    `₹${Math.round(run.cost.totalInr)} spend`,
    `${run.msgsIn} in / ${run.msgsOut} out`,
    `${run.conversations} convo(s)`,
    `${run.escalations} escalation(s)`,
    `${run.guardrailHits} guardrail hit(s)`,
  ];
  return capUtf16(parts.join(' · '), SUMMARY_MAX_UNITS);
}

async function sendToOps(deps: RollupDeps, day: string, summary: string): Promise<boolean> {
  if (deps.opsNumbers.length === 0) {
    deps.log.info?.({ day }, 'daily rollup — no OPS number configured, not sent');
    return false;
  }
  let sent = false;
  for (const ops of deps.opsNumbers) {
    const result = await deps.wa.sendTemplated(
      ops,
      { key: 'digest', params: { day, summary } },
      { conversationId: null, sender: 'system' },
    );
    if (result.ok) sent = true;
  }
  if (!sent) {
    await alertOps(deps.log, {
      kind: 'rollup_undelivered',
      summary: 'The daily rollup reached no OPS number',
      detail: { day },
    });
  }
  return sent;
}
