/**
 * The SLA nudger (plan §8 CH-13 step 4, §2.3's 5-minute cron).
 *
 * Two jobs, and the second is the one that matters:
 *  1. Re-ping the assignee and cc the front desk when a task runs past its
 *     deadline.
 *  2. Write the `sla_nudge` context row that makes the AI's next reply HONEST.
 *     Scenario 3 turns on this: at 15:52 the guest asks "where are those?" and
 *     the only truthful answer is "I've just nudged housekeeping" — which
 *     guardrail 2 licenses off this row and nothing else. Without it the model
 *     must either defer or lie, and it is the lie this whole chunk exists to
 *     make impossible.
 *
 * ─── The verb (the CH-12 lesson, second axis) ─────────────────────────────
 * Nudging is NOT terminal: a nudged task is still open work, and the row that
 * proves we nudged decays on its own after one guest turn. So there is no
 * skip-vs-defer trap here — but the reason there isn't is worth stating, since
 * the next person to add a rung (CH-14's 10-min/20-min escalation ladder) will
 * be one step from one. `markNudged` is guarded on `open`, so a task can be
 * nudged exactly once by this rung; a DONE landing mid-tick simply wins.
 */
import { findOverdueTasks, markNudged, type Task } from '../db/tasks.js';
import type { Db } from '../db/client.js';
import { insertMessage } from '../db/repos.js';
import { sanitiseInline } from '../brain/prompt.js';
import { summarizeError } from '../lib/logger.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { frontdeskLead, type Roster } from './roster.js';

export interface SlaDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
  roster: Roster;
  /** Injected — ONE clock per tick (the CH-12 lesson: a suite that reads the
   * wall clock is lying, and `main` went red ten hours a night for it). */
  now: () => Date;
}

/** §2.3: "Task SLA nudger: every 5 min". */
export const SLA_NUDGER_CRON = '*/5 * * * *';

/** The `sender:'system'` kind guardrail 2 reads for "I've nudged them". */
export const SLA_NUDGE_CONTEXT_KIND = 'sla_nudge';

const NUDGE_SUMMARY_MAX = 120;

export interface NudgeRun {
  considered: number;
  nudged: number;
}

/**
 * One tick. Never throws: this is a cron, and the next tick is the retry.
 */
export async function runSlaNudger(deps: SlaDeps): Promise<NudgeRun> {
  const now = deps.now();
  const overdue = await findOverdueTasks(deps.db, now);
  let nudged = 0;
  for (const task of overdue) {
    try {
      // Claim first. Guarded on `open`, so two ticks (or a DONE landing
      // mid-tick) can never double-buzz a busy human.
      const claimed = await markNudged(deps.db, task.id);
      if (claimed === null) continue;
      await nudgeOne(deps, claimed);
      nudged += 1;
    } catch (error) {
      deps.log.error(
        { taskId: task.id, err: summarizeError(error) },
        'sla nudge failed — next tick will not retry (the task is already nudged)',
      );
    }
  }
  if (nudged > 0) deps.log.info?.({ considered: overdue.length, nudged }, 'sla nudger ran');
  return { considered: overdue.length, nudged };
}

async function nudgeOne(deps: SlaDeps, task: Task): Promise<void> {
  const params = {
    shortId: task.shortId,
    villa: task.villaLabel ?? 'villa not confirmed',
    guestName: 'overdue',
    summary: sanitiseInline(`STILL OPEN after ${task.slaMinutes} min — ${task.summary}`, NUDGE_SUMMARY_MAX),
  };

  // Re-ping the assignee, cc the frontdesk lead (§8 step 4). Both go through
  // the window-aware chokepoint: a housekeeper quiet for a day is unreachable
  // by free-form and needs the template.
  const lead = frontdeskLead(deps.roster);
  const recipients = new Set<string>();
  if (task.assignedPhone !== null) recipients.add(task.assignedPhone);
  if (lead !== null) recipients.add(lead.phone);

  let delivered = false;
  for (const phone of recipients) {
    const result = await deps.wa.sendTemplated(
      phone,
      { key: 'task_card', params },
      { conversationId: null, sender: 'system' },
    );
    if (result.ok) delivered = true;
  }

  if (!delivered) {
    // NO evidence row. The AI must not say "I've nudged housekeeping" when the
    // nudge reached nobody — that is the same sentence as the promise this
    // guardrail exists for, one rung further on. CH-12's blocker #5, again.
    await alertOps(deps.log, {
      kind: 'sla_nudge_undelivered',
      summary: 'An overdue task could not be re-pinged — nobody was reachable',
      detail: { taskId: task.id, shortId: task.shortId, kind: task.kind, villa: task.villaLabel },
    });
    return;
  }

  await writeNudgeEvidence(deps, task);
  await alertOps(deps.log, {
    kind: 'task_sla_breached',
    summary: 'A guest request passed its SLA and the team was re-pinged',
    detail: {
      taskId: task.id,
      shortId: task.shortId,
      kind: task.kind,
      slaMinutes: task.slaMinutes,
      villa: task.villaLabel,
    },
  });
}

/**
 * The row that makes "I've just nudged housekeeping" true.
 *
 * Written ONLY after a nudge actually reached someone — unlike `task_done`,
 * whose fact (a human finished the work) is already true whoever hears about
 * it. Here the fact IS the reaching: "I nudged them" is false if nobody was
 * nudged. Same shape as ops_escalation, and for the same reason.
 */
async function writeNudgeEvidence(deps: SlaDeps, task: Task): Promise<void> {
  if (task.conversationId === null) return;
  try {
    await insertMessage(deps.db, {
      conversationId: task.conversationId,
      direction: 'out',
      sender: 'system',
      type: 'text',
      body: `task nudged: ${task.shortId}`,
      status: 'sent',
      raw: { contextKind: SLA_NUDGE_CONTEXT_KIND, shortId: task.shortId },
    });
  } catch (error) {
    deps.log.error(
      { taskId: task.id, err: summarizeError(error) },
      'sla_nudge evidence row failed (telemetry only)',
    );
  }
}
