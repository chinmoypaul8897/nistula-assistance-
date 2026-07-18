/**
 * The internal-health probe (CH-17 steps 1 & 5): the ONE place that answers "is
 * this service actually working?" — consumed by both the deepened /health route
 * and the watchdog's dead-man decision.
 *
 * Two predicates, deliberately separated (guard by the QUESTION):
 *  - isHealthy(report) → "should the healthchecks.io ping fire?" Owns OUR
 *    internals (db, boss, poller, sender). It IGNORES `degraded` on purpose:
 *    degraded = the external website is down, which the AI already handles
 *    gracefully; it is not a reason to skip the dead-man ping or bounce the box.
 *  - /health stays HTTP 200 while the process serves — the report fields are
 *    informational, so a degraded website can never trigger a Railway restart
 *    loop on an otherwise-fine service.
 */
import { sql } from 'drizzle-orm';
import type { PgBoss } from 'pg-boss';
import type { Db } from '../db/client.js';
import type { DegradedTracker } from '../brain/tools/degraded.js';
import { heartbeatAgeMs } from './heartbeat.js';

/** A DB round-trip slower than this counts as unhealthy (plan step 1: "<1s"). */
const DB_SLOW_MS = 1000;
/** Poller last success / sender last run older than this is stale (plan: "<5 min"). */
export const STALE_MS = 5 * 60 * 1000;

export interface HealthReport {
  db: boolean;
  boss: boolean;
  /** ms since the poller last SUCCEEDED; null when the poller is disabled
   * (dev — EZEE_POLLER_ENABLED=0) or has not run yet. Null = N/A, not a fault. */
  pollerAgeMs: number | null;
  /** ms since the sender cron last RAN; null when disabled or not-yet-run. */
  senderAgeMs: number | null;
  /** The website degraded flag — reported, but NOT a health gate (see header). */
  degraded: boolean;
}

interface HealthDeps {
  db: Db;
  boss: Pick<PgBoss, 'isInstalled'>;
  degraded: Pick<DegradedTracker, 'isDegraded'>;
  /** EZEE_POLLER_ENABLED — when false the poller heartbeat is N/A. */
  pollerEnabled: boolean;
  /** LIFECYCLE_SEND_ENABLED — when false the sender heartbeat is N/A. */
  senderEnabled: boolean;
}

// Module singleton (the getBoss/getDb precedent): populated once from main().
let deps: HealthDeps | null = null;

/** Wires the probe to the live db/boss/degraded — called once from server main(). */
export function configureHealth(d: HealthDeps): void {
  deps = d;
}

/** Test seam. */
export function resetHealth(): void {
  deps = null;
}

async function checkDb(db: Db): Promise<boolean> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Date.now() - start < DB_SLOW_MS;
  } catch {
    return false;
  }
}

async function checkBoss(boss: Pick<PgBoss, 'isInstalled'>): Promise<boolean> {
  try {
    // isInstalled() is a lightweight pgboss-schema DB round-trip — if boss's
    // pool is dead it throws or times out.
    return await boss.isInstalled();
  } catch {
    return false;
  }
}

/**
 * The five-field report. Unconfigured (pre-boot, or a unit test that only wants
 * isHealthy) returns an all-clear report WITHOUT touching a DB — so /health
 * degrades to the basic payload rather than lying about internals it can't see.
 * `now` is injectable for deterministic heartbeat-age tests.
 */
export async function probeHealth(now: number = Date.now()): Promise<HealthReport> {
  const d = deps;
  if (d === null) {
    return { db: true, boss: true, pollerAgeMs: null, senderAgeMs: null, degraded: false };
  }
  const [db, boss] = await Promise.all([checkDb(d.db), checkBoss(d.boss)]);
  return {
    db,
    boss,
    pollerAgeMs: d.pollerEnabled ? heartbeatAgeMs('poller', now) : null,
    senderAgeMs: d.senderEnabled ? heartbeatAgeMs('sender', now) : null,
    degraded: d.degraded.isDegraded(),
  };
}

/** Should the dead-man ping fire? See the header for why `degraded` is excluded. */
export function isHealthy(report: HealthReport): boolean {
  if (!report.db || !report.boss) return false;
  // A null age is N/A (disabled / not-yet-run) — never a fault, or a deploy
  // would false-alarm before the first tick.
  if (report.pollerAgeMs !== null && report.pollerAgeMs > STALE_MS) return false;
  if (report.senderAgeMs !== null && report.senderAgeMs > STALE_MS) return false;
  return true;
}

/** The reasons isHealthy is false — for the ops alert detail (ids only, §3.3). */
export function unhealthyReasons(report: HealthReport): string[] {
  const reasons: string[] = [];
  if (!report.db) reasons.push('db_unreachable');
  if (!report.boss) reasons.push('boss_unresponsive');
  if (report.pollerAgeMs !== null && report.pollerAgeMs > STALE_MS) reasons.push('poller_stale');
  if (report.senderAgeMs !== null && report.senderAgeMs > STALE_MS) reasons.push('sender_stale');
  return reasons;
}
