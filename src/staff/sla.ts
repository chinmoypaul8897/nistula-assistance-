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
 * ─── The verb, and CH-14a's second rung ───────────────────────────────────
 * Generic tasks get ONE nudge. `escalation` tasks get a LADDER: re-ping the
 * front desk at the deadline (10 min), then cc OPS ten minutes later (scenario
 * 4). The rung a task is on is `tasks.nudge_count`, and each rung's advance is a
 * guarded UPDATE keyed on the exact prior count (`markRungFired`) — so a rung
 * fires at most once and a DONE or a human-takeover cancel landing mid-ladder
 * (either flips status off `open`) wins the race cleanly. The count is a
 * MONOTONIC CONTRACT, not a mutable proxy: a fired rung is a fact that cannot
 * un-fire (the recurring-class VERB axis, the trap this comment used to warn
 * the next rung-adder was one step from).
 */
import { findOverdueTasks, markRungFired, type Task, type TaskKind } from '../db/tasks.js';
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
  /** OPS_NUMBERS (E.164) — the escalation ladder's rung-2 cc recipients. Absent
   * ⇒ no extra cc (dev's standing state); the rung still fires to assignee+lead. */
  opsNumbers?: readonly string[];
  /** Injected — ONE clock per tick (the CH-12 lesson: a suite that reads the
   * wall clock is lying, and `main` went red ten hours a night for it). */
  now: () => Date;
}

/** §2.3: "Task SLA nudger: every 5 min". */
export const SLA_NUDGER_CRON = '*/5 * * * *';

/** The `sender:'system'` kind guardrail 2 reads for "I've nudged them". */
export const SLA_NUDGE_CONTEXT_KIND = 'sla_nudge';

const NUDGE_SUMMARY_MAX = 120;
const ESCALATION_DETAIL_MAX = 190;

/**
 * One rung: WHEN it fires (relative to the task's slaDeadline) and whether it
 * cc's OPS. `afterMs` from slaDeadline, not from now, so the 10/20-minute
 * scenario-4 clock is anchored to the same instant `findOverdueTasks` selects on.
 */
interface Rung {
  afterMs: number;
  ccOps: boolean;
}

/**
 * The ladder per kind. Generic kinds keep the CH-13a one-shot (rung 0 at the
 * deadline, then `nudged` and done). `escalation` adds a second rung 10 minutes
 * later that cc's OPS. `night_queue` has NO rungs — nobody is on duty; CH-14b's
 * morning digest converts it instead, so the nudger deliberately never touches it.
 */
const RUNGS: Record<TaskKind, Rung[]> = {
  housekeeping: [{ afterMs: 0, ccOps: false }],
  maintenance: [{ afterMs: 0, ccOps: false }],
  frontdesk: [{ afterMs: 0, ccOps: false }],
  escalation: [
    { afterMs: 0, ccOps: false }, // rung 0 @ deadline (+10m): re-ping the front desk
    { afterMs: 10 * 60_000, ccOps: true }, // rung 1 @ +20m: cc OPS
  ],
  night_queue: [],
};

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
      const rungs = RUNGS[task.kind];
      const k = task.nudgeCount;
      // Ladder exhausted (or a no-rung kind like night_queue): nothing to do.
      if (k >= rungs.length) continue;
      const rung = rungs[k] as Rung;
      // This rung's turn has not come yet (an escalation past its 10-min deadline
      // but not yet 20 min old): leave it `open` for a later tick. NOT terminal —
      // DEFER, because the fact "20 minutes have passed" is still coming.
      if (now.getTime() < task.slaDeadline.getTime() + rung.afterMs) continue;

      // 🚨 SEND FIRST, ADVANCE ON DELIVERY — the VERB lesson, not a style choice.
      // A first cut that advanced before sending, and on a failed send returned
      // without reverting, consumed the rung permanently while nobody was nudged
      // — a terminal advance on a mutable, retryable fact. Sending first is safe:
      // STAFF_SLA_QUEUE is a stately singleton, so no concurrent tick races, and
      // the only real race (a DONE / takeover-cancel mid-tick) is caught by
      // `markRungFired`'s `WHERE status='open' AND nudge_count=k`. The residual,
      // chosen: a crash between send and advance re-pings the same rung next tick
      // — buzzing twice beats telling the model we chased when we did not.
      if (!(await nudgeOne(deps, task, rung))) continue;
      // FINAL rung ⇒ `nudged` (chased, leave it chased); an intermediate rung ⇒
      // `open`, so findOverdueTasks re-selects it for the next rung.
      const newStatus = k + 1 >= rungs.length ? 'nudged' : 'open';
      const claimed = await markRungFired(deps.db, task.id, k, newStatus);
      if (claimed === null) continue; // a DONE / takeover-cancel won — record nothing
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

/** Re-pings the assignee + ccs the lead (+ OPS on a rung-2 escalation). Returns
 * whether a human got it — the caller advances the rung only then, so a failed
 * nudge leaves the task open on the same rung for the next tick. */
async function nudgeOne(deps: SlaDeps, task: Task, rung: Rung): Promise<boolean> {
  const lead = frontdeskLead(deps.roster);
  const recipients = new Set<string>();
  if (task.assignedPhone !== null) recipients.add(task.assignedPhone);
  if (lead !== null) recipients.add(lead.phone);
  // Rung 2 of an escalation cc's OPS — the scenario-4 "cc the owner at 20 min".
  if (rung.ccOps) for (const ops of deps.opsNumbers ?? []) recipients.add(ops);

  const stillOpen = sanitiseInline(
    `STILL OPEN after ${task.slaMinutes} min — ${task.summary}`,
    NUDGE_SUMMARY_MAX,
  );
  // 🚨 An escalation re-ping uses the ESCALATION card, not a task card: its
  // summary may carry the guest's own words including a house ("the AC in
  // Apartment 09 is weak"), which the task card's guest-facing `summary` slot
  // would reject — and "Reply DONE" is the wrong instruction for a handover.
  // The escalation card's slots are staff-read (house legal).
  const key: 'escalation_card' | 'task_card' =
    task.kind === 'escalation' ? 'escalation_card' : 'task_card';
  const params: Record<string, string> =
    key === 'escalation_card'
      ? {
          shortId: task.shortId,
          guestName: 'a guest',
          reason: stillOpen,
          detail: sanitiseInline(task.detail ?? '(no context)', ESCALATION_DETAIL_MAX),
        }
      : {
          shortId: task.shortId,
          villa: task.villaLabel ?? 'villa not confirmed',
          guestName: 'overdue',
          summary: stillOpen,
        };

  let delivered = false;
  for (const phone of recipients) {
    const result = await deps.wa.sendTemplated(phone, { key, params }, {
      conversationId: null,
      sender: 'system',
    });
    if (result.ok) delivered = true;
  }

  if (!delivered) {
    // NO evidence row, NO advance. The AI must not say "I've nudged the team"
    // when the nudge reached nobody — the task stays `open` on this rung and the
    // next tick tries again.
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
      ccOps: rung.ccOps,
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
