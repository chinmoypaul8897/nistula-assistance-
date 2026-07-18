/**
 * The morning digest (plan §8 CH-14 step 3, §2.3 "Morning digest: 10:00 —
 * overnight queue + open tasks → ops number"). A 10:00-IST cron that:
 *  1. WAKES every overnight `night_queue` task into a live `escalation` — the
 *     day front desk is now on duty, so the SLA clock starts and each gets its
 *     FIRST card (at night nobody was paged; product-picture S5).
 *  2. Sends OPS a one-line overnight summary (converted items, open escalations,
 *     open tasks, overnight guardrail-hit count).
 *
 * Fail-quiet: nothing overnight ⇒ no digest (avoid a daily empty ping). No OPS
 * number configured (dev's standing state) ⇒ logged, not sent.
 */
import { atISTHour, formatDayDisplay, formatISTClock, istCalendarDay } from '../lib/time.js';
import type { Db } from '../db/client.js';
import {
  convertNightQueueTasks,
  getLiveTasksByKinds,
  SLA_MINUTES,
  type Task,
} from '../db/tasks.js';
import { countGuardrailHitsSince } from '../db/repos.js';
import { sanitiseInline } from '../brain/prompt.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { frontdeskLead, type Roster } from './roster.js';
import { notifyEscalation } from './notifier.js';

/** §2.3: the morning digest fires at 10:00 IST (NIGHT_END). */
export const DIGEST_CRON = '0 10 * * *';

/** Meta caps a template param at 200 chars; keep the one-line summary inside it. */
const SUMMARY_MAX = 190;
const ITEM_LABEL_MAX = 60;

/** The card reason for a night escalation that just woke at 10:00. */
const WOKE_REASON = 'Raised overnight — the front desk is now in';

export interface DigestDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
  roster: Roster;
  /** OPS_NUMBERS — the digest recipients (§2.3 "→ ops number"). */
  opsNumbers: readonly string[];
  /** IST NIGHT_START (§3.7) — the overnight-guardrail-count window opens here. */
  nightStart: string;
  /** Injected — ONE clock per run (the CH-12 lesson). */
  now: () => Date;
}

export interface DigestRun {
  converted: number;
  openEscalations: number;
  openTasks: number;
  guardrailHits: number;
  sent: boolean;
}

/** One 10:00 tick. Never throws: a cron's next run is its retry. */
export async function runMorningDigest(deps: DigestDeps): Promise<DigestRun> {
  const now = deps.now();
  const lead = frontdeskLead(deps.roster);

  // Pre-existing DAY escalations, read BEFORE the conversion so the two are
  // distinguishable in the summary.
  const preExisting = await getLiveTasksByKinds(deps.db, ['escalation']);

  // WAKE the overnight queue: night_queue → escalation, assigned to the day front
  // desk, SLA clock started fresh (rung 0 fires ~10 min later via the CH-14a ladder).
  const converted = await convertNightQueueTasks(deps.db, {
    assignedPhone: lead?.phone ?? null,
    slaDeadline: new Date(now.getTime() + SLA_MINUTES.escalation * 60_000),
  });

  // Each woken escalation sends its FIRST card now (nobody was paged overnight).
  // A failed card leaves the task open — the ladder retries rung 0 (CH-14a).
  for (const task of converted) {
    await notifyEscalation({ db: deps.db, log: deps.log, wa: deps.wa }, task, null, WOKE_REASON);
  }

  const openTasks = await getLiveTasksByKinds(deps.db, ['housekeeping', 'maintenance', 'frontdesk']);
  const guardrailHits = await countGuardrailHitsSince(deps.db, mostRecentNightStart(now, deps.nightStart));

  const run: DigestRun = {
    converted: converted.length,
    openEscalations: preExisting.length + converted.length,
    openTasks: openTasks.length,
    guardrailHits,
    sent: false,
  };

  // Fail-quiet on a genuinely quiet night — no daily empty ping.
  if (converted.length === 0 && preExisting.length === 0 && openTasks.length === 0 && guardrailHits === 0) {
    deps.log.info?.({}, 'morning digest — nothing overnight, no digest sent');
    return run;
  }

  const day = formatDayDisplay(istCalendarDay(now));
  const summary = buildSummary(run, converted[0]);
  run.sent = await sendToOps(deps, day, summary);
  deps.log.info?.(
    { converted: run.converted, openEscalations: run.openEscalations, openTasks: run.openTasks, guardrailHits, sent: run.sent },
    'morning digest ran',
  );
  return run;
}

/** The single-line digest body (Meta bans newlines in a param). */
function buildSummary(run: DigestRun, firstConverted: Task | undefined): string {
  const parts: string[] = [];
  if (run.converted > 0 && firstConverted !== undefined) {
    const at = formatISTClock(firstConverted.openedAt);
    const label = sanitiseInline(firstConverted.summary, ITEM_LABEL_MAX);
    const more = run.converted > 1 ? ` +${run.converted - 1} more` : '';
    parts.push(`${run.converted} raised overnight now live (${label} · ${at})${more}`);
  }
  parts.push(`${run.openEscalations} escalation(s) + ${run.openTasks} task(s) open`);
  if (run.guardrailHits > 0) parts.push(`${run.guardrailHits} guardrail hit(s) overnight`);
  parts.push('Reply TASKS to see your work');
  return sanitiseInline(parts.join('; '), SUMMARY_MAX);
}

async function sendToOps(deps: DigestDeps, day: string, summary: string): Promise<boolean> {
  if (deps.opsNumbers.length === 0) {
    // Dev's standing state — nobody to send to. The conversion + cards still ran.
    deps.log.info?.({ day }, 'morning digest — no OPS number configured, not sent');
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
      kind: 'digest_undelivered',
      summary: 'The morning digest reached no OPS number',
      detail: { day },
    });
  }
  return sent;
}

/** The most recent NIGHT_START (e.g. 20:00 IST) at or before `now` — the start
 * of the overnight window the guardrail count covers. At the 10:00 digest that
 * is YESTERDAY's 20:00. IST is a fixed offset, so −24h always steps one IST day. */
function mostRecentNightStart(now: Date, nightStart: string): Date {
  const today = atISTHour(now, nightStart);
  if (today.getTime() <= now.getTime()) return today;
  return atISTHour(new Date(now.getTime() - 24 * 60 * 60 * 1000), nightStart);
}
