/**
 * The weekly draft-mode quality report (plan §8 CH-16 step 4): a Sunday-18:00-IST
 * cron that summarises the week's drafts — approval rate, edit rate, expiry, and
 * per-type counts — plus the week's guardrail hits, to the ops number(s), and
 * writes the full breakdown to raw_events. This is the §1 "quality-bar" data an
 * operator reads before unlocking a conversation type in AUTO_SEND_TYPES.
 *
 * Fail-quiet like the digest: a week with no drafts and no guardrail hits sends
 * nothing (and writes nothing) — no weekly empty ping. Reuses the `nst_digest`
 * template (a generic single-line ops message), so no new template is needed.
 */
import { formatDayDisplay, istCalendarDay } from '../lib/time.js';
import type { Db } from '../db/client.js';
import { draftStatsSince, type DraftReplyType, type DraftStatus } from '../db/drafts.js';
import { REPLY_TYPES } from '../config.js';
import {
  countGuardrailHitsSince,
  insertRawEvent,
  topGuardrailRulesSince,
  type GuardrailRuleCount,
} from '../db/repos.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { capUtf16 } from './digest.js';

/** Sunday 18:00 IST (plan §8 CH-16 step 4). */
export const QUALITY_REPORT_CRON = '0 18 * * 0';
const REPORT_WINDOW_DAYS = 7;
/** The digest slot is staffReadParam `.max(200)` (UTF-16 units); 190 leaves margin. */
const SUMMARY_MAX_UNITS = 190;

export interface QualityReportDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
  opsNumbers: readonly string[];
  /** Injected — ONE clock per run (the CH-12 lesson). */
  now: () => Date;
}

interface Totals {
  total: number;
  byStatus: Record<DraftStatus, number>;
  byType: Record<DraftReplyType, number>;
}

export interface QualityReportRun {
  total: number;
  guardrailHits: number;
  sent: boolean;
}

export async function runQualityReport(deps: QualityReportDeps): Promise<QualityReportRun> {
  const now = deps.now();
  const since = new Date(now.getTime() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const stats = await draftStatsSince(deps.db, since);
  const guardrailHits = await countGuardrailHitsSince(deps.db, since);
  const topGuardrailRules = await topGuardrailRulesSince(deps.db, since, 3);
  const totals = aggregate(stats);

  const run: QualityReportRun = { total: totals.total, guardrailHits, sent: false };

  // Fail-quiet on a genuinely empty week (nothing drafted, nothing tripped).
  if (totals.total === 0 && guardrailHits === 0) {
    deps.log.info?.({}, 'weekly quality report — nothing this week, not sent');
    return run;
  }

  // The durable §1 quality-bar record — the numbers an operator reviews before
  // unlocking a type. Written regardless of whether the ops send lands.
  await insertRawEvent(deps.db, {
    source: 'system',
    eventType: 'quality_report',
    // Never re-driven as a webhook event (the telemetry convention, CH-02 D6).
    processed: true,
    payload: {
      sinceIso: since.toISOString(),
      windowDays: REPORT_WINDOW_DAYS,
      total: totals.total,
      byStatus: totals.byStatus,
      byType: totals.byType,
      guardrailHits,
      topGuardrailRules,
    },
  });

  const day = formatDayDisplay(istCalendarDay(now));
  const summary = buildReportSummary(totals, guardrailHits, topGuardrailRules);
  run.sent = await sendToOps(deps, day, summary);
  deps.log.info?.({ total: totals.total, guardrailHits, sent: run.sent }, 'weekly quality report ran');
  return run;
}

function zeroByStatus(): Record<DraftStatus, number> {
  return { pending: 0, approved: 0, edited: 0, rejected: 0, expired: 0 };
}

function aggregate(stats: { replyType: DraftReplyType; status: DraftStatus; count: number }[]): Totals {
  const byStatus = zeroByStatus();
  const byType = Object.fromEntries(REPLY_TYPES.map((t) => [t, 0])) as Record<DraftReplyType, number>;
  let total = 0;
  for (const row of stats) {
    byStatus[row.status] += row.count;
    byType[row.replyType] += row.count;
    total += row.count;
  }
  return { total, byStatus, byType };
}

/** A single-line report body (Meta bans newlines in a param). Approval/edit rates
 * are over DECIDED drafts (approved+edited+rejected); expiry is a miss, not a
 * decision, so it is reported as its own count, not folded into the rate. */
function buildReportSummary(
  totals: Totals,
  guardrailHits: number,
  topGuardrailRules: GuardrailRuleCount[],
): string {
  const s = totals.byStatus;
  const decided = s.approved + s.edited + s.rejected;
  const pct = (n: number): string => (decided > 0 ? ` (${Math.round((n / decided) * 100)}%)` : '');
  const topType = topReplyType(totals.byType);
  const parts = [
    `Drafts (${REPORT_WINDOW_DAYS}d): ${totals.total}`,
    `approved ${s.approved}${pct(s.approved)}`,
    `edited ${s.edited}${pct(s.edited)}`,
    `rejected ${s.rejected}`,
    `expired ${s.expired}`,
    `pending ${s.pending}`,
  ];
  if (topType !== null) parts.push(`top ${topType.type} ${topType.count}`);
  parts.push(`guardrail hits ${guardrailHits}`);
  // Step 4's "top guardrail hits": WHICH rule fires most, so an operator can see
  // what would break if a type auto-sent, not just how often.
  if (topGuardrailRules.length > 0) {
    parts.push(`top rules: ${topGuardrailRules.map((r) => `${r.rule} ${r.count}`).join(', ')}`);
  }
  return capUtf16(parts.join(' · '), SUMMARY_MAX_UNITS);
}

function topReplyType(byType: Record<DraftReplyType, number>): { type: DraftReplyType; count: number } | null {
  let best: { type: DraftReplyType; count: number } | null = null;
  for (const type of REPLY_TYPES) {
    const count = byType[type];
    if (count > 0 && (best === null || count > best.count)) best = { type, count };
  }
  return best;
}

async function sendToOps(deps: QualityReportDeps, day: string, summary: string): Promise<boolean> {
  if (deps.opsNumbers.length === 0) {
    deps.log.info?.({ day }, 'weekly quality report — no OPS number configured, not sent');
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
      kind: 'quality_report_undelivered',
      summary: 'The weekly quality report reached no OPS number',
      detail: { day },
    });
  }
  return sent;
}
