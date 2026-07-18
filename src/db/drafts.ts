/**
 * drafts reads + writes (§4, CH-16 — the trust gate).
 *
 * THE CONCURRENCY RULE (the same one tasks.ts and lifecycle/sender.ts follow):
 * every state flip is a GUARDED UPDATE on `status='pending'` that returns the row
 * it changed. Two ops numbers can approve the same card at once, a Meta redelivery
 * of `OK 3F2K` can replay, and the 30-min expiry sweep can race a late OK — only
 * the returned row tells the winner from the loser, and exactly one winner sends
 * the reply to the guest.
 */
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { DbLike } from './client.js';
import { drafts } from './schema.js';
import { generateShortId } from './tasks.js';

export type Draft = typeof drafts.$inferSelect;
export type DraftReplyType = Draft['replyType'];
export type DraftStatus = Draft['status'];

/** A human decision (not the sweep's `expired`). */
export type DraftDecision = Extract<DraftStatus, 'approved' | 'edited' | 'rejected'>;

export interface NewDraft {
  conversationId: string;
  replyType: DraftReplyType;
  proposedBody: string;
  contextNote: string | null;
}

/**
 * Commits a pending draft with a fresh short id.
 *
 * WHY a single insert, not insertTask's 5-attempt retry loop: this runs INSIDE
 * the worker's claim transaction (atomic with the turn claim, so a crash never
 * loses the guest's reply), and a 23505 inside a Postgres transaction poisons the
 * WHOLE tx — every later statement fails until rollback, so an in-tx retry loop
 * cannot work. The collision IS the handler: the poisoned tx rolls back with the
 * turn cursor unmoved, pg-boss re-runs the job, and the fresh attempt draws a new
 * short id. At 32^6 ids and this traffic that path is astronomically rare.
 */
export async function insertDraft(db: DbLike, input: NewDraft): Promise<Draft> {
  const [row] = await db
    .insert(drafts)
    .values({
      conversationId: input.conversationId,
      shortId: generateShortId(),
      replyType: input.replyType,
      proposedBody: input.proposedBody,
      contextNote: input.contextNote,
    })
    .returning();
  if (row === undefined) throw new Error('insertDraft: no row returned');
  return row;
}

/**
 * Resolves a pending draft by its ops-typed short id, returning the row ONLY to
 * the approver that actually changed it. A replay, a second decision, or a
 * decision racing the expiry sweep all return null — so exactly one send reaches
 * the guest. `finalBody` carries the human's words on EDIT; null for OK/NO.
 *
 * Case-insensitive short id: it is read off a screen and typed back, and the
 * stored id is always upper-case (the alphabet has no lower case), so upper-casing
 * the INPUT keeps the unique-index scan (closeTaskByShortId's EXPLAIN lesson).
 */
export async function claimDraftDecision(
  db: DbLike,
  shortId: string,
  decision: DraftDecision,
  decidedBy: string,
  now: Date,
  finalBody: string | null = null,
): Promise<Draft | null> {
  const [row] = await db
    .update(drafts)
    .set({ status: decision, decidedBy, decidedAt: now, finalBody })
    .where(and(eq(drafts.shortId, shortId.toUpperCase()), eq(drafts.status, 'pending')))
    .returning();
  return row ?? null;
}

/** Does a draft with this short id exist at all, in any state? Distinguishes
 * "already decided/expired" from "no such id" so the ops reply can say which
 * (findTaskByShortId's reasoning — a human who typed a real id and got "unknown"
 * would retype it forever). */
export async function findDraftByShortId(db: DbLike, shortId: string): Promise<Draft | null> {
  const [row] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.shortId, shortId.toUpperCase()))
    .limit(1);
  return row ?? null;
}

/**
 * Expires every pending draft older than `cutoff`, returning the changed rows so
 * the caller can alert ops for each reply that reached nobody. Guarded on
 * `status='pending'`, so an OK landing the same tick wins and no row is
 * double-resolved.
 *
 * Anchored on `created_at`: for a draft the decision window STARTS at birth, so
 * age IS the staleness clock. This is the deliberate INVERSE of the lifecycle
 * lead-followup guard (which anchors on send_at, a future planned moment) — a
 * draft has no future moment. Terminal on an immutable fact (a passed deadline),
 * so SKIP is the legal verb (the §recurring-class VERB rule).
 */
export async function expireStaleDrafts(db: DbLike, cutoff: Date): Promise<Draft[]> {
  return db
    .update(drafts)
    .set({ status: 'expired' })
    .where(and(eq(drafts.status, 'pending'), lt(drafts.createdAt, cutoff)))
    .returning();
}

/** One (reply_type, status) tally for the weekly quality report. */
export interface DraftStatRow {
  replyType: DraftReplyType;
  status: DraftStatus;
  count: number;
}

/** Per-status × reply_type counts for drafts CREATED since `since` — the weekly
 * report's raw numbers (approval/edit/expiry rate, per-type stats). Keyed on
 * created_at: the report measures the week's INTAKE, and a draft's kind and week
 * are fixed at creation. */
export async function draftStatsSince(db: DbLike, since: Date): Promise<DraftStatRow[]> {
  return db
    .select({
      replyType: drafts.replyType,
      status: drafts.status,
      count: sql<number>`count(*)::int`,
    })
    .from(drafts)
    .where(gte(drafts.createdAt, since))
    .groupBy(drafts.replyType, drafts.status);
}
