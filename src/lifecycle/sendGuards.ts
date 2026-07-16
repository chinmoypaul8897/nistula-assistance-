/**
 * What stops a due lifecycle message, and whether that stop is FOREVER (CH-12;
 * split out of sender.ts for the ~300-line rule).
 *
 * The single most important distinction in the lifecycle engine, and the one an
 * adversarial review caught the first version getting wrong:
 *
 *   TRANSIENT (Meta busy, a DB wobble, the window still shut, a human holding
 *   the thread) → LEAVE IT PENDING, backed off. `pending` IS the retry state,
 *   and the claim guard already makes a re-run safe.
 *
 *   TERMINAL (the booking is cancelled, the guest is gone, the params are
 *   invalid, the message is too old to be true) → resolve it, with a reason a
 *   human can read.
 *
 * Treating "the database hiccuped" the same as "this guest must not be messaged"
 * destroyed the confirmation for ever, because a resolved row can never be
 * rescheduled — the scheduler's upsert only touches `pending` rows.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { bookingsMirror, guests, scheduledMessages } from '../db/schema.js';
import { isNightIST, nowIST } from '../lib/time.js';
import { bookingState, hasPhone, passesSource, type GateContext } from './gates.js';
import { LIFECYCLE_TEMPLATES, type ScheduledKind } from './templates.js';

/** Kinds that belong BEFORE/DURING the stay — meaningless once it is over. The
 * post-stay kinds (poststay, winback) are supposed to fire after check-out. */
const PRE_STAY_KINDS: readonly ScheduledKind[] = ['confirmation', 'prearrival', 'welcome'];

/**
 * Nothing lands on a guest's phone in the small hours.
 *
 * DELIBERATELY NOT NIGHT_START/NIGHT_END (20:00–10:00): those are STAFF hours —
 * when the front desk is in — and §2.3 puts the welcome at 09:00, a perfectly
 * civil hour to message a guest but squarely inside staff-night. Two different
 * questions, two different windows.
 *
 * Checked HERE and not in planSends because planned instants must stay immutable
 * (a plan-time shift rewrote send_at and destroyed the staleness clock). The
 * §2.3 times are all daytime anyway; this only ever catches a PAST-due row that
 * became due at an uncivil hour — a guest who booked at 2 a.m. for a stay two
 * days out. The confirmation is exempt: they just pressed Book and are waiting.
 */
const GUEST_QUIET_START = '22:00';
const GUEST_QUIET_END = '08:00';

/** §2.3: "fewer than 2 win-backs sent in the trailing 365 days". */
const WINBACK_CAP = 2;
const WINBACK_WINDOW_DAYS = 365;
/** A deferred row waits this long before the sender looks at it again. Without
 * it, an undeliverable row (window shut) is permanently the OLDEST row, so it
 * permanently occupies the batch — 25 of them starve every newer message for
 * ever, while alerting once a minute each. */
export const DEFER_MINUTES = 15;
/** How long after its planned moment a message whose moment IS the event it
 * narrates stays true. See TRUTH — this is NOT a general staleness rule. */
export const STALE_AFTER_HOURS = 36;
/** A thank-you a few days late is still a thank-you; a week late it is an
 * admission that we forgot. */
export const POSTSTAY_GRACE_HOURS = 7 * 24;

interface TruthContext {
  row: ScheduledRow;
  now: Date;
  /** IST calendar day (gates.today), compared against the stay's date strings. */
  today: string;
  /** The stay, when there is a booking row to read it from. */
  checkIn: string | null;
}

/** Hours since the message's planned moment. HONEST ONLY for a body whose
 * planned moment is the event it narrates — see TRUTH. */
const planAgeHours = (c: TruthContext): number =>
  (c.now.getTime() - c.row.sendAt.getTime()) / 3_600_000;

/** Age only ever increases, so a plan-age verdict is safe to make TERMINAL. */
const staleByPlanAge = (c: TruthContext, hours = STALE_AFTER_HOURS): Truth =>
  planAgeHours(c) > hours ? skip('stale') : null;

/**
 * HAS THIS MESSAGE STOPPED BEING TRUE? — the send-time guard's real contract.
 *
 * 🚨 THAT IS NOT THE SAME QUESTION AS "is the plan old?". The two coincide only
 * for a body whose planned moment IS the event it narrates, and they diverge BY
 * CONSTRUCTION for one whose moment is anchored BEFORE it. The pre-arrival is
 * planned check-in −3d: a booking made inside that window is born with a send_at
 * days in the past, so a plan-age rule skipped it on the first tick — while "we
 * look forward to welcoming you on Friday" was still entirely true. That
 * silently destroyed the pre-arrival for every last-minute booking (the valuable
 * ones), which plan.md §8 — "no prearrival if booking already <3d out (send now
 * instead)" — and runbook.md expressly forbid.
 *
 * This is the TENTH time this codebase has written a rule from the SHAPE of the
 * data rather than the CONTRACT it stands for. So each rule below is stated as
 * the claim its own body makes. IF YOU EDIT A BODY IN templates.ts, EDIT ITS
 * RULE HERE — the sentence and its expiry are one decision, not two.
 *
 * 🚨 AND A RULE'S VERB MATTERS AS MUCH AS ITS QUESTION. Skipping is TERMINAL — a
 * resolved row is never rescheduled — so a rule may only SKIP on a fact that
 * cannot come back: a day that has passed on an IMMUTABLE field. A rule reading a
 * mutable, human-edited field must DEFER, which is reversible.
 *
 * The eleventh instance was exactly this, in these very rules: prearrival/welcome
 * SKIPPED on `check_in`, which the front desk edits and which any poll can
 * redeliver (it is a MIRROR_DIFF_FIELD, so a change emits booking.modified and
 * the re-plan drags send_at into the past). A date mistyped for ONE MINUTE
 * resolved both rows terminally, and the correction was a total no-op because the
 * upsert only touches `pending`. That is the ninth instance's shape, and it
 * contradicted the paragraph directly above — which I had just written.
 */
type Truth = { verdict: 'skip' | 'defer'; reason: string } | null;

const skip = (reason: string): Truth => ({ verdict: 'skip', reason });
/** Reversible: the claim is false FOR NOW, on a fact that can change back. */
const notYetTrue = (reason: string): Truth => ({ verdict: 'defer', reason });

const TRUTH: Record<ScheduledKind, (c: TruthContext) => Truth> = {
  /** "your booking with Nistula is confirmed" — a receipt for a booking just
   * made, and its planned moment IS that mirror-insert, so plan-age is the
   * honest measure here. Age only ever increases: safe to skip. */
  confirmation: (c) => staleByPlanAge(c),

  /** "we are looking forward to welcoming you on {checkInDay}" — true right up
   * until they arrive, however late we are in saying it, and false the moment
   * they have. Its plan-age says nothing about either.
   *
   * DEFERS, never skips: `check_in` is mutable, so "they have arrived" is a fact
   * that can be taken back. The TERMINAL bound is `stay_over` (check_out < today,
   * checked ABOVE this) — the stay being wholly past is the fact that cannot
   * come back, and it resolves these rows for real. */
  prearrival: (c) => {
    if (c.checkIn === null) return staleByPlanAge(c); // no stay to ask about
    return c.checkIn < c.today ? notYetTrue('guest_already_arrived') : null;
  },

  /** "your {villaType} is ready for you today, from 3 pm" — it says TODAY, so it
   * is true on the arrival day and on no other. Defers for the same reason. */
  welcome: (c) => {
    if (c.checkIn === null) return staleByPlanAge(c);
    return c.checkIn < c.today ? notYetTrue('arrival_day_passed') : null;
  },

  /** "thank you for staying with us." Planned check-out +1d, so its moment is
   * after the stay it thanks them for and plan-age is honest — just gentler. */
  poststay: (c) => staleByPlanAge(c, POSTSTAY_GRACE_HOURS),

  /** "the season is turning in Goa" — planned 75 days out and deliberately
   * unhurried. There is no moment at which it stops being true; consent and the
   * 2-per-365d cap govern it, and a plan-age rule here could only ever destroy a
   * perfectly valid win-back. */
  winback: () => null,

  /** CH-15's; not scheduled by this chunk yet. Its claim is about an enquiry we
   * answered, so its moment is that event. */
  lead_followup: (c) => staleByPlanAge(c),
};

export type ScheduledRow = typeof scheduledMessages.$inferSelect;
export type Outcome = 'sent' | 'skipped' | 'deferred' | 'failed';

export interface BlockContext {
  db: Db;
  /** sources re-applied at send time; today for the stay-over backstop. */
  gates: Pick<GateContext, 'sources' | 'today'>;
  /** ONE clock for both the staleness age and the quiet-hours check — two
   * clocks would disagree. Test seam; defaults to real time. */
  now?: () => Date;
}

const backoff = (): Date => new Date(Date.now() + DEFER_MINUTES * 60_000);

/** Terminal: resolve the row, it will never be sent. */
export async function resolve(
  db: Db,
  row: ScheduledRow,
  status: 'skipped' | 'failed',
  reason: string,
): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status, skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/** Transient: keep it pending, look again after the backoff. THE retry mechanism.
 * Parks the row on deferred_until — NEVER send_at, which is the planned time the
 * stale guard reads. */
export async function defer(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ deferredUntil: backoff(), skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'pending')));
}

/**
 * A transient GRAPH failure (a Meta 429, a 5xx, a network error) — the message
 * provably did NOT go, so re-arm the already-claimed row for another attempt.
 *
 * This is the BLOCKER fix: before it, any non-ok Graph response resolved the row
 * to 'failed' terminally, so a rate-limit during a batch permanently lost a real
 * guest's confirmation. The row was claimed 'sent' before the Graph call (the
 * send-intent pattern), so re-arming means sent → pending; the failed message
 * row stays as the audit of the attempt, and the next tick writes a fresh intent.
 */
export async function retryAfterFailedSend(db: Db, row: ScheduledRow, reason: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status: 'pending', sentMessageId: null, deferredUntil: backoff(), skipReason: reason.slice(0, 100) })
    .where(and(eq(scheduledMessages.id, row.id), eq(scheduledMessages.status, 'sent')));
}

/** Marketing may only go to a guest who asked for it (§4, CH-15's consent). */
async function marketingBlock(db: Db, row: ScheduledRow, kind: ScheduledKind): Promise<string | null> {
  if (LIFECYCLE_TEMPLATES[kind].category !== 'marketing') return null;

  const [guest] = await db.select().from(guests).where(eq(guests.id, row.guestId));
  if (guest === undefined) return 'guest_missing';
  // WHY consent is checked HERE and not when the row was scheduled: it is
  // captured by CH-15's post-stay thank-you, ~74 days AFTER the booking was
  // scheduled. Gating at schedule time would mean marketing_opt_in is always
  // false at that moment, and the win-back could never fire for anyone, ever.
  if (!guest.marketingOptIn) return 'no_marketing_opt_in';

  if (kind === 'winback') {
    const since = new Date(Date.now() - WINBACK_WINDOW_DAYS * 24 * 3600_000);
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.guestId, row.guestId),
          eq(scheduledMessages.kind, 'winback'),
          eq(scheduledMessages.status, 'sent'),
          gte(scheduledMessages.updatedAt, since),
        ),
      );
    if (count >= WINBACK_CAP) return 'winback_cap_reached';
  }
  return null;
}

/** Everything that can stop a due row, in the order that reads best in a log. */
export async function blockedBy(
  deps: BlockContext,
  row: ScheduledRow,
): Promise<{ outcome: Exclude<Outcome, 'sent'>; reason: string } | null> {
  const now = deps.now?.() ?? nowIST();
  let checkIn: string | null = null;

  // The MIRROR first: it is the truth, the schedule only an intention (§3.4) —
  // and every question below is asked OF the booking, so it has to be read
  // before any of them can be answered honestly.
  if (row.bookingId !== null) {
    const [booking] = await deps.db
      .select()
      .from(bookingsMirror)
      .where(eq(bookingsMirror.id, row.bookingId));
    if (booking === undefined) return { outcome: 'skipped', reason: 'booking_missing' };
    checkIn = booking.checkIn;

    const state = bookingState(booking);
    if (state === 'terminal') {
      return { outcome: 'skipped', reason: `booking_${booking.status}` };
    }
    if (state === 'transient') {
      return { outcome: 'deferred', reason: `booking_${booking.status}` };
    }
    // The SOURCE and PHONE gates are re-applied — eZee changes both fields, and
    // a booking re-sourced to an OTA after it was scheduled must not send (Q13).
    // THIS is where those two are enforced, and DEFER is the right verb: both are
    // mutable, human-edited fields. Refusing to send is reversible — if the front
    // desk restores a phone it cleared mid-correction, the message still goes.
    // Resolving them terminally (or revoking upstream) destroyed a real guest's
    // lifecycle for a typo. The stale guard bounds the wait either way.
    if (!passesSource(booking, deps.gates.sources)) {
      return { outcome: 'deferred', reason: 'source_not_allowed' };
    }
    if (!hasPhone(booking)) return { outcome: 'deferred', reason: 'no_phone' };
    // The DATE gate is NOT re-applied wholesale — check_in is in the past by the
    // time a thank-you is due, which is the point of a thank-you. But a PRE-stay
    // message is a lie once the stay is entirely over: if the dates were amended
    // into the past (and the sweep never revokes a now-failing booking), the
    // welcome/pre-arrival must not fire. Post-stay kinds are exempt by design.
    if (
      PRE_STAY_KINDS.includes(row.kind) &&
      booking.checkOut !== null &&
      booking.checkOut < deps.gates.today
    ) {
      return { outcome: 'skipped', reason: 'stay_over' };
    }
  }

  // Has this particular sentence stopped being true? Asked per kind, of the claim
  // the body actually makes — never of the plan's age. The rule chooses its own
  // verb: only a fact that cannot come back may resolve a row for ever. See TRUTH.
  const untrue = TRUTH[row.kind]({ row, now, today: deps.gates.today, checkIn });
  if (untrue !== null) {
    return {
      outcome: untrue.verdict === 'defer' ? 'deferred' : 'skipped',
      reason: untrue.reason,
    };
  }

  // A past-due row can become due at any hour. Wait for a civil one. LAST of the
  // skip/defer checks, so a row that is already untrue is resolved now rather
  // than deferred to a morning at which it will only be resolved anyway.
  if (row.kind !== 'confirmation' && isNightIST(now, GUEST_QUIET_START, GUEST_QUIET_END)) {
    return { outcome: 'deferred', reason: 'quiet_hours' };
  }

  const marketing = await marketingBlock(deps.db, row, row.kind);
  if (marketing !== null) return { outcome: 'skipped', reason: marketing };

  return null;
}
