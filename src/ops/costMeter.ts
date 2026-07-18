/**
 * The intra-day cost meter (plan §8 CH-17 step 4). A running INR total per IST
 * day, kept in memory but SEEDED from cost_events at boot so a mid-day redeploy
 * does not forget the day's spend. Two thresholds off COST_ALERT_INR_PER_DAY:
 *   - 2× → SOFT: alert immediately (once), keep serving;
 *   - 4× → HARD: STOP calling Anthropic (guest hold line + ops page).
 *
 * The HARD stop AUTO-RESUMES at IST midnight (Paul's call, CH-17): the day key
 * rolls over to a fresh 0, so the latch clears without any prod admin surface —
 * which Railway does not carry. It CANNOT be un-tripped by a restart, because a
 * restart re-seeds today's total from cost_events (already ≥4×) and re-trips.
 * That asymmetry is the safety: a runaway can never be silently un-stopped, only
 * fixed (address the cause, or raise the budget) or waited out to midnight.
 *
 * `cost_events` stays the source of truth; this map is a fast accumulator over
 * it. recordUsage (token spend) and recordTemplateCost (wa_template) both feed
 * noteSpend right after their insert.
 */
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { costEvents } from '../db/schema.js';

const SOFT_MULTIPLIER = 2;
const HARD_MULTIPLIER = 4;

export type CostLevel = 'ok' | 'soft' | 'hard';

// Module singletons. thresholdInr 0 (unconfigured — tests, pre-boot) DISABLES
// gating entirely, so costStatus is always 'ok' and no existing turn test trips.
let thresholdInr = 0;
const totalsByDay = new Map<string, number>();

/** Sets COST_ALERT_INR_PER_DAY — called once from server main(). */
export function configureCostMeter(cfg: { thresholdInr: number }): void {
  thresholdInr = cfg.thresholdInr;
}

/** Test seam: clears the threshold and all day totals. */
export function resetCostMeter(): void {
  thresholdInr = 0;
  totalsByDay.clear();
}

/** Adds INR spend to `day`'s running total (called after a cost_events insert). */
export function noteSpend(day: string, inr: number): void {
  if (!Number.isFinite(inr) || inr <= 0) return;
  totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + inr);
}

/** Seeds `day`'s total from committed cost_events so a redeploy keeps the tally. */
export async function seedCostMeter(db: Db, day: string): Promise<void> {
  const [row] = await db
    .select({ total: sql<string | null>`coalesce(sum(${costEvents.inrEstimate}), 0)::text` })
    .from(costEvents)
    .where(eq(costEvents.day, day));
  totalsByDay.set(day, row?.total != null ? Number(row.total) : 0);
}

/** The current INR total + threshold level for `day`. */
export function costStatus(day: string): { total: number; level: CostLevel; thresholdInr: number } {
  const total = totalsByDay.get(day) ?? 0;
  if (thresholdInr <= 0) return { total, level: 'ok', thresholdInr };
  if (total >= thresholdInr * HARD_MULTIPLIER) return { total, level: 'hard', thresholdInr };
  if (total >= thresholdInr * SOFT_MULTIPLIER) return { total, level: 'soft', thresholdInr };
  return { total, level: 'ok', thresholdInr };
}
