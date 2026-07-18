/**
 * The draft-expiry sweep (plan §8 CH-16 step 2): a 5-minutely cron that expires
 * every pending draft older than 30 minutes and pages ops for each. In the trust
 * phase a lapsed draft means the guest deliberately gets nothing — but never
 * silently: the expiry is alerted here and rolled up in the morning digest.
 */
import { expireStaleDrafts } from '../db/drafts.js';
import type { Db } from '../db/client.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';

/** Every 5 minutes (the §2.3 nudger cadence). */
export const DRAFT_EXPIRY_CRON = '*/5 * * * *';
/** plan §8 CH-16 step 2: drafts auto-expire 30 minutes after creation. */
export const DRAFT_EXPIRY_MINUTES = 30;

export interface DraftExpiryDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  /** Injected — ONE clock per run (the CH-12 lesson). */
  now: () => Date;
}

export async function runDraftExpiry(deps: DraftExpiryDeps): Promise<{ expired: number }> {
  const cutoff = new Date(deps.now().getTime() - DRAFT_EXPIRY_MINUTES * 60_000);
  const expired = await expireStaleDrafts(deps.db, cutoff);
  for (const draft of expired) {
    await alertOps(deps.log, {
      kind: 'draft_expired',
      summary: 'A draft went unapproved for 30 minutes and expired — the guest got nothing',
      detail: { shortId: draft.shortId, replyType: draft.replyType },
    });
  }
  if (expired.length > 0) {
    deps.log.info?.({ expired: expired.length }, 'draft expiry sweep');
  }
  return { expired: expired.length };
}
