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
      // 🚨 SEND FIRST, FLIP ON DELIVERY — and this order is the VERB lesson,
      // not a style choice.
      //
      // My first cut claimed the row (open→nudged) BEFORE sending, and on a
      // failed send alerted ops and returned WITHOUT reverting. The flip is
      // TERMINAL — `findOverdueTasks` selects only `open`, and nothing anywhere
      // returns a task to `open` — so the row said "nudged" when nobody was
      // nudged, the rung was permanently consumed, and block [5] rendered
      // ", already chased once" into the prompt: a chase that never happened,
      // told to the model as fact. A terminal verb on a MUTABLE, RETRYABLE fact
      // (`retryable: true` is literally set on those send failures) is the
      // 9th/11th instance's exact shape.
      //
      // Sending first is safe here because there is no concurrent nudger to
      // race: STAFF_SLA_QUEUE is stately with a constant singletonKey, so at
      // most one tick runs. The only race is a DONE landing mid-tick, and
      // `markNudged`'s `WHERE status='open'` still wins that cleanly — we just
      // do not write evidence for a task that closed underneath us.
      //
      // The residual, chosen deliberately: a crash between the send and the
      // flip re-nudges next tick. Buzzing a housekeeper twice is an annoyance;
      // never chasing again while telling the model we did is a lie.
      if (!(await nudgeOne(deps, task))) continue;
      const claimed = await markNudged(deps.db, task.id);
      if (claimed === null) continue; // a DONE won the race — nothing to record
      await writeNudgeEvidence(deps, task);
      nudged += 1;
    } catch (error) {
      deps.log.error(
        { taskId: task.id, err: summarizeError(error) },
        'sla nudge failed — the task stays open and the next tick retries',
      );
    }
  }
  if (nudged > 0) deps.log.info?.({ considered: overdue.length, nudged }, 'sla nudger ran');
  return { considered: overdue.length, nudged };
}

/** Re-pings the assignee + ccs the lead. Returns whether a human got it — the
 * caller flips the row only then, so a failed nudge leaves the task open for
 * the next tick. */
async function nudgeOne(deps: SlaDeps, task: Task): Promise<boolean> {
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
    // NO evidence row, NO flip. The AI must not say "I've nudged housekeeping"
    // when the nudge reached nobody — that is the same sentence as the promise
    // this guardrail exists for, one rung further on (CH-12's blocker #5) — and
    // the task stays `open` so the next tick tries again.
    await alertOps(deps.log, {
      kind: 'sla_nudge_undelivered',
      summary: 'An overdue task could not be re-pinged — nobody was reachable',
      detail: { taskId: task.id, shortId: task.shortId, kind: task.kind, villa: task.villaLabel },
    });
    return false;
  }

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
  return true;
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
  // ORIGIN, not just conversationId (CH-13b round 2): a nudged `system` task
  // (the media follow-up carries a real conversationId) must not write an
  // sla_nudge row on the guest's thread — the guest never asked, so "I've
  // nudged housekeeping" about it would be a referent-free claim to them.
  if (task.conversationId === null || task.origin !== 'guest') return;
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
