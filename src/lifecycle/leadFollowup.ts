/**
 * Lead follow-up: ONE gentle nudge to a guest who was quoted a price and did not
 * book (plan.md §8 CH-15 step 1). Unlike every other scheduled_messages kind this
 * is CONVERSATION-driven, not booking-driven — it has no booking row, so it never
 * goes through scheduler.ts/planSends. The row carries booking_id = NULL, and the
 * sender's booking block (sendGuards.blockedBy) skips itself for a null booking,
 * falling through to the marketing gate + the plan-age staleness rule.
 *
 * 🚨 It is MARKETING (nst_lead_followup_v1, category 'marketing'), so a guest who
 * never opted in never receives it — a fresh enquirer has no opt-in path, so this
 * reaches only previously-opted-in returning guests who re-enquire. That is the
 * intended, Meta/DPDP-safe default (Paul-confirmed; §8 step 6: "no consent, no
 * marketing, ever"); the row is still scheduled and gated at SEND time, exactly
 * as win-back is. See docs/open-questions.md for the business question.
 *
 * Staleness: TRUTH.lead_followup = staleByPlanAge, anchored on send_at (NOT
 * created_at). send_at is T+3d, so at T+3d the plan-age is 0 — the nudge is NOT
 * born stale. It only skips if it sits >36h past its due moment (window shut).
 * This is the R7 trap the sender was already built to avoid; do not "fix" it.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { guests, scheduledMessages } from '../db/schema.js';
import { countRecentLeadFollowups } from '../db/consent.js';
import { resolveVilla } from '../lib/villas.js';
import { formatStayDates, istCalendarDay, istWallClockToInstant, shiftDay } from '../lib/time.js';
import type { ToolRun } from '../brain/tools/registry.js';
import { firstNameFromName } from './plan.js';
import { LIFECYCLE_TEMPLATES } from './templates.js';
import { LEAD_FOLLOWUP_CAP, LEAD_FOLLOWUP_WINDOW_DAYS } from './sendGuards.js';

/** §2.3-style timing for the nudge: 3 days after the enquiry, 11:00 IST. */
const DELAY_DAYS = 3;
const SEND_HOUR = '11:00';

/**
 * A polite "no" must not get a follow-up (plan step 1). This is a DISINTEREST
 * lexicon — deliberately DISTINCT from policy.ts's COMPLAINT lexicon (anger): a
 * guest who booked elsewhere is not complaining, and paging ops for it would be
 * wrong. Narrow, clear signals only; failing toward NOT nudging is the safe side
 * (a missed nudge beats nudging someone who said no). No bare "no"/"nahi" — the
 * CH-09 homograph lesson (a keyword that means ten other things is not a signal).
 */
const REFUSAL_RES: readonly RegExp[] = [
  /\bnot\s+interested\b/i,
  /\bno,?\s*thank(?:s| you)\b/i,
  /\bbooked\s+(?:elsewhere|already|somewhere)\b/i,
  /\balready\s+booked\b/i,
  /\bchanged\s+(?:my|our)\s+mind\b/i,
  /\bfound\s+(?:another|somewhere|something\s+else)\b/i,
  /\bgoing\s+with\s+(?:another|someone|somewhere)\b/i,
  /\b(?:we|i)\s*(?:'ll|ll|will)\s+pass\b/i,
  /\bmaybe\s+(?:next\s+time|later|some\s+other\s+time)\b/i,
  /\bnahi\s+chahiye\b/i, // "don't want it" (Hinglish)
  /\brehne\s+do\b/i, // "leave it" (Hinglish)
];

/** True if the guest's message signals they will not book (suppresses the nudge). */
export function isRefusal(text: string): boolean {
  return REFUSAL_RES.some((re) => re.test(text));
}

export interface LeadQuote {
  villaLabel: string;
  checkIn: string;
  checkOut: string;
}

function isQuoteInput(x: unknown): x is { villa_label: string; check_in: string; check_out: string } {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.villa_label === 'string' &&
    typeof o.check_in === 'string' &&
    typeof o.check_out === 'string'
  );
}

/**
 * The quote the guest just got THIS turn — the most recent SUCCESSFUL get_quote,
 * whose input carries the villa + dates they were quoted. null if the turn quoted
 * nothing, or every quote came back unavailable/failed (result.ok=false): an
 * UNAVAILABLE-only chat is a weaker lead about dates that are already taken.
 */
export function leadQuoteFromToolRuns(toolRuns: readonly ToolRun[]): LeadQuote | null {
  for (let i = toolRuns.length - 1; i >= 0; i -= 1) {
    const run = toolRuns[i];
    if (run === undefined || run.name !== 'get_quote' || !run.result.ok) continue;
    if (!isQuoteInput(run.input)) continue;
    return { villaLabel: run.input.villa_label, checkIn: run.input.check_in, checkOut: run.input.check_out };
  }
  return null;
}

/** The Monday-of-week (IST) bucket for the dedupe key — one nudge per guest per
 * quote-week (plan step 1). Deterministic: the date string is parsed at UTC
 * midnight, the same convention shiftDay uses, so no timezone drift. */
function weekBucket(istDay: string): string {
  const dow = new Date(`${istDay}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  return shiftDay(istDay, -((dow + 6) % 7)); // back up to Monday
}

export type LeadOutcome =
  | 'scheduled'
  | 'skipped_no_type'
  | 'skipped_no_name'
  | 'skipped_cap'
  | 'skipped_invalid_params';

export interface LeadScheduleDeps {
  db: Db;
  /** The turn's clock (worker ctx.dbNow). send_at and the 30d cap window derive
   * from it, never Date.now() — determinism under a test clock. */
  now: Date;
}

/**
 * Schedule (idempotently) ONE lead follow-up for a guest who was quoted `quote`.
 * The caller has already decided this is a lead (stage 'lead') and the turn was
 * not a refusal; this owns type resolution, the name, the 30d cap and the upsert.
 */
export async function scheduleLeadFollowup(
  deps: LeadScheduleDeps,
  args: { guestId: string; quote: LeadQuote },
): Promise<LeadOutcome> {
  const { db, now } = deps;

  const resolution = resolveVilla(args.quote.villaLabel);
  const villaType =
    resolution.kind === 'match'
      ? resolution.villa.typeName
      : resolution.kind === 'ambiguous'
        ? resolution.typeName
        : null;
  if (villaType === null) return 'skipped_no_type';

  const [guest] = await db
    .select({ firstName: guests.firstName, waProfileName: guests.waProfileName })
    .from(guests)
    .where(eq(guests.id, args.guestId));
  const firstName = firstNameFromName(guest?.firstName ?? guest?.waProfileName ?? null);
  if (firstName === null) return 'skipped_no_name';

  // Schedule-time half of the 1-per-30d cap; the send-time cap (sendGuards) is
  // the backstop when a race slips two through.
  const since = new Date(now.getTime() - LEAD_FOLLOWUP_WINDOW_DAYS * 24 * 3600_000);
  if ((await countRecentLeadFollowups(db, args.guestId, since)) >= LEAD_FOLLOWUP_CAP) {
    return 'skipped_cap';
  }

  const params = {
    firstName,
    villaType,
    dates: formatStayDates(args.quote.checkIn, args.quote.checkOut),
  };
  // Never schedule a row that would fail its own template schema at send time
  // (e.g. a guest name that reads as a house — OQ-15). Fail fast, not at send.
  if (!LIFECYCLE_TEMPLATES.lead_followup.schema.safeParse(params).success) {
    return 'skipped_invalid_params';
  }

  const today = istCalendarDay(now);
  const sendAt = istWallClockToInstant(`${shiftDay(today, DELAY_DAYS)}T${SEND_HOUR}`);
  const dedupeKey = `lead_followup:${args.guestId}:${weekBucket(today)}`;

  await db
    .insert(scheduledMessages)
    .values({
      guestId: args.guestId,
      bookingId: null,
      kind: 'lead_followup',
      templateName: LIFECYCLE_TEMPLATES.lead_followup.name,
      params,
      sendAt,
      dedupeKey,
    })
    .onConflictDoUpdate({
      target: scheduledMessages.dedupeKey,
      // The CH-12 idempotency contract: a re-detection in the same quote-week
      // updates a still-PENDING row (fresher dates/name); it never resurrects a
      // sent/cancelled/skipped one.
      set: { sendAt, params, templateName: LIFECYCLE_TEMPLATES.lead_followup.name },
      where: eq(scheduledMessages.status, 'pending'),
    });

  return 'scheduled';
}
