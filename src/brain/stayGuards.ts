/**
 * Stay-affirmation integrity (CH-11 — the D2 decision).
 *
 * THE HOLE THIS CLOSES, verified against the real lexicon before it was built:
 * guardrail 2 catches ACTION framing (the perfect passive, "I've X'd") and has
 * never caught STATE framing. Every one of these passes `scanPromises` today
 * with zero evidence:
 *     "Your booking is confirmed."      "You're all set for 20–22 Dec."
 *     "We have you down for the 20th."  "Your reservation is confirmed."
 * State framing is exactly the register the model speaks in the moment CH-11
 * hands it booking data — and 40 of production's 62 mirror rows are
 * CANCELLATIONS. A guest told "you're all set" for a booking that no longer
 * exists drives to Assagao to a villa that is not theirs. That is the worst
 * thing this product can do, and until now nothing stopped it.
 *
 * WHY NOT a fifth claim class licensed by get_booking (the obvious design):
 * 1. `covered()` licenses by CLASS, and C1's regex packs `confirmed` in with
 *    `informed`/`arranged`/`booked`. Registering get_booking → C1 would license
 *    "the team has been informed" on any turn that merely LOOKED UP a booking —
 *    a pure lie, since CH-13 does not exist. (promises.ts's own header warns
 *    about exactly this shape for remember_fact.)
 * 2. A licence would demand a tool call for data the model already has in
 *    block [5] — a wasted round trip, and a defer whenever it skipped the call.
 * 3. Splitting "your BOOKING is confirmed" from "your LATE CHECKOUT is
 *    confirmed" needs a hand-written list of exceptions — the enumerated-rule
 *    failure class this repo has already shipped three times.
 *
 * WHAT SHIPS INSTEAD: an assertion gate, not an evidence licence. The question
 * is not "did a tool run?" but "is it TRUE?" — and the truth is a code-normalised
 * server enum (bookings_mirror.status through stayView's allowlist), read in the
 * same pass that fills block [5]. A guest cannot poison it: to make it say yes
 * they would have to make a real booking, at which point the statement is true.
 *
 * The asymmetry that makes this cheap and safe:
 * - No live stay → a BROAD lexicon, and a false positive costs nothing (a guest
 *   with no booking has no booking facts to state anyway). Fail-closed on the
 *   catastrophic case.
 * - A live stay  → state framing is consistent with server truth → allow. ACTION
 *   framing ("I've told the team") still needs a real tool, via C1, untouched.
 *
 * The line it draws: *"we DID something for you"* needs a tool.
 * *"your stay IS X"* needs the stay to be true.
 */

/**
 * Subject-anchored: the thing being affirmed must be the BOOKING, not an
 * arbitrary request. "Your late checkout is confirmed" is a request-fulfilment
 * claim and stays C1's business (it needs CH-13's staff task) — this guard must
 * not silently bless it just because the guest happens to have a stay.
 */
const BOOKING_SUBJECT = String.raw`(?:booking|reservation|stay|check[-\s]?in|villa|room)`;

const STAY_AFFIRMATIONS: readonly RegExp[] = [
  // "your booking is/has been confirmed | secured | all set | locked in | in place"
  new RegExp(
    String.raw`\b(?:your|the)\s+${BOOKING_SUBJECT}\b[^.!?]{0,40}?\b(?:is|are|has\s+been|have\s+been|'s)\s+(?:confirmed|secured|reserved|booked|all\s+set|locked\s+in|in\s+place|sorted|good\s+to\s+go)\b`,
    'i',
  ),
  // "you're all set / you are booked in / you're confirmed for …"
  new RegExp(
    String.raw`\byou(?:'re|\s+are)\s+(?:all\s+set|confirmed|booked\s+in|checked\s+in)\b`,
    'i',
  ),
  // "we have you down / booked / in for the 20th"
  new RegExp(String.raw`\bwe\s+have\s+you\s+(?:down|booked|in)\b`, 'i'),
  // "your booking with us" / "your stay with us" — asserts one exists at all.
  new RegExp(String.raw`\byour\s+${BOOKING_SUBJECT}\s+with\s+us\b`, 'i'),
  // "everything is confirmed at our end" — subjectless but unmistakably a
  // booking-state affirmation in this product's context.
  new RegExp(String.raw`\beverything\s+(?:is|'s)\s+(?:confirmed|set|sorted)\b`, 'i'),
  // "see you on the 20th" / "we'll see you then" — an arrival assertion.
  new RegExp(String.raw`\b(?:see|welcome)\s+you\s+(?:on|this|next|in|then)\b`, 'i'),
];

export interface StayAffirmationScan {
  /** The affirmations found in a draft written for a guest with NO live stay. */
  violations: string[];
}

/**
 * Scans a draft for language asserting the guest has a booking.
 *
 * `hasLiveStay` comes from the worker's projected stays (stayView.liveStays) —
 * the same read that fills block [5], never a tool result and never block [5]'s
 * TEXT (guest-derived DATA may not license anything).
 */
export function scanStayAffirmations(draft: string, hasLiveStay: boolean): StayAffirmationScan {
  if (hasLiveStay) return { violations: [] };
  const violations: string[] = [];
  for (const re of STAY_AFFIRMATIONS) {
    const match = re.exec(draft);
    if (match !== null) violations.push(match[0].trim());
  }
  return { violations };
}

/** The regenerate hint. Kept SEPARATE from PROMISE_NUDGE: this is not a false
 * promise, it is a false FACT, and the correction is different. */
export const STAY_NUDGE =
  'You stated or implied that this guest has a booking with us. No booking is linked to this number. Do not state or imply that they have a booking, a stay, dates or an arrival. Say plainly that you cannot see a booking on this number, and ask for the name on the booking and the check-in date so the team can find it.';
