/**
 * Marketing-consent writes + the scheduled-message reads CH-15 needs (§8 CH-15).
 *
 * Deliberately boring db-only helpers: the DECISION of when a guest opts in/out,
 * and what counts as a lead, lives in brain/ and lifecycle/ — this file only
 * persists the outcome. Consent is explicit opt-IN (§4): default false, a STOP
 * sets a durable opt-OUT, the post-stay YES sets opt-in. Marketing is blocked at
 * send time on either flag (sendGuards.marketingBlock), so these writes are the
 * ONLY thing between a guest and a win-back / lead nudge — they must be exact.
 *
 * Time: callers pass the turn's clock (worker ctx.dbNow) so opt-in-at and the
 * window boundaries are deterministic under a test clock — never Date.now() in a
 * guard (the wall-clock flake class this repo keeps being bitten by).
 */
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db, DbLike } from './client.js';
import { guests, scheduledMessages } from './schema.js';

type ScheduledKind = (typeof scheduledMessages.$inferSelect)['kind'];

/**
 * Post-stay YES → durable opt-in (source 'in_chat', §4), GUARDED: it flips ONLY a
 * guest who has neither opted in nor opted out. An explicit STOP (opt_out) is
 * therefore never silently overridden by a later stray "yes", and an already-in
 * guest is a no-op. Returns whether it actually flipped (for the log line).
 */
export async function captureInChatOptIn(db: DbLike, guestId: string, at: Date): Promise<boolean> {
  const rows = await db
    .update(guests)
    .set({ marketingOptIn: true, marketingOptInSource: 'in_chat', marketingOptInAt: at })
    .where(
      and(
        eq(guests.id, guestId),
        eq(guests.marketingOptIn, false),
        eq(guests.optOutMarketing, false),
      ),
    )
    .returning({ id: guests.id });
  return rows.length > 0;
}

/** STOP → durable opt-OUT. Clears opt-in AND sets opt_out_marketing (§3.3), so a
 * later stray opt-in path cannot silently re-enable marketing. Never auto-cleared;
 * the guest's own words are the only thing that set it. Composes into the worker's
 * claim tx (DbLike) so the opt-out and its confirmation commit atomically. */
export async function setMarketingOptOut(db: DbLike, guestId: string): Promise<void> {
  await db
    .update(guests)
    .set({ marketingOptIn: false, optOutMarketing: true })
    .where(eq(guests.id, guestId));
}

/**
 * STOP cancels every PENDING marketing row. The caller passes the marketing
 * KINDS derived from the template catalog (LIFECYCLE_TEMPLATES) so a future
 * marketing kind is cancelled for free — the CH-13b "a leak has siblings" rule:
 * guard the family by the contract (category === 'marketing'), never a hard-coded
 * ['winback']. Returns the count cancelled (for the log line, never the bodies).
 */
export async function cancelPendingMarketingRows(
  db: DbLike,
  guestId: string,
  marketingKinds: readonly ScheduledKind[],
): Promise<number> {
  if (marketingKinds.length === 0) return 0;
  const rows = await db
    .update(scheduledMessages)
    .set({ status: 'cancelled', skipReason: 'opted_out' })
    .where(
      and(
        eq(scheduledMessages.guestId, guestId),
        eq(scheduledMessages.status, 'pending'),
        inArray(scheduledMessages.kind, [...marketingKinds]),
      ),
    )
    .returning({ id: scheduledMessages.id });
  return rows.length;
}

/** Conversion cleanup (§8 step 4): a booking now links this guest, so their
 * pending lead follow-ups are moot. Only 'pending' rows move — a sent/skipped
 * one is history. */
export async function cancelPendingLeadFollowups(db: Db, guestId: string): Promise<number> {
  const rows = await db
    .update(scheduledMessages)
    .set({ status: 'cancelled', skipReason: 'converted' })
    .where(
      and(
        eq(scheduledMessages.guestId, guestId),
        eq(scheduledMessages.kind, 'lead_followup'),
        eq(scheduledMessages.status, 'pending'),
      ),
    )
    .returning({ id: scheduledMessages.id });
  return rows.length;
}

/** True iff the CONSENT-ASKING post-stay thank-you was SENT to this guest at/after
 * `since` — the gate that turns an ordinary "yes" into marketing consent (plan
 * step 6: YES within 7 days of the thank-you).
 *
 * 🚨 Keyed on the exact template NAME, not the `poststay` kind (pre-merge review):
 * only nst_poststay_v2 carries "Reply YES", but pre-CH-15 rows are v1 (no invite),
 * so a kind-based match would treat a "yes" after a v1 thank-you as consent to a
 * question never asked. The contract is "was the guest ASKED for consent?", not
 * "is this kind poststay?". updated_at is the sent-time proxy (the send-intent
 * claim flips status→sent in the same statement). */
export async function hasRecentPoststay(
  db: Db,
  guestId: string,
  since: Date,
  consentTemplate: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: scheduledMessages.id })
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.guestId, guestId),
        eq(scheduledMessages.templateName, consentTemplate),
        eq(scheduledMessages.status, 'sent'),
        gte(scheduledMessages.updatedAt, since),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** How many lead follow-ups this guest already has PENDING or SENT since `since`
 * — the schedule-time half of the 1-per-30d cap (belt-and-braces with the
 * send-time cap in sendGuards). Counts by created_at: "did we already raise one
 * for them recently?". */
export async function countRecentLeadFollowups(
  db: Db,
  guestId: string,
  since: Date,
): Promise<number> {
  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.guestId, guestId),
        eq(scheduledMessages.kind, 'lead_followup'),
        inArray(scheduledMessages.status, ['pending', 'sent']),
        gte(scheduledMessages.createdAt, since),
      ),
    );
  return count;
}
