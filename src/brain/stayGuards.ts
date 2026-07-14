import { VILLAS } from '../lib/villas.js';
import { PRICE_CUE, splitSentences } from './rupees.js';

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
 * Subject-anchored. Everything here requires a BOOKING SUBJECT — the thing
 * asserted must be the guest's booking/stay/villa, not a request. "Your late
 * checkout is confirmed" is request-fulfilment (it needs CH-13's staff task)
 * and stays C1's business — this guard must never bless it, and a lead's warm
 * pre-sales close ("we would love to welcome you in December") has no booking
 * subject and must never trip it.
 *
 * The design (pre-push audit BLOCKER — the recurring "enumerated rule narrower
 * than its contract" class, caught a 4th time): a guest with NO live booking
 * has no true booking facts to state, so a false positive here costs nothing.
 * The gate therefore fires on RECOGNITION of a booking subject paired with ANY
 * of: an affirmation/possession verb, a date/period, a party count, or an
 * "I can see/found it" awareness claim — the whole register a model slips into
 * once it (wrongly) believes the guest has a stay. Broad on purpose, and pinned
 * against the exact fact-framing sentences block [4] teaches (which are correct
 * ONLY when the guest genuinely holds a live stay — see scanStayAffirmations).
 */
const BOOKING_SUBJECT = String.raw`(?:booking|reservation|stay|check[-\s]?in|villa|room|dates?)`;
// An affirmation/possession/readiness the subject can carry. Deliberately NOT
// tense-scoped: present-state framing is exactly what guardrail 2 missed.
const AFFIRM = String.raw`(?:is|are|has\s+been|have\s+been|'s|was|were)\s+(?:confirmed|secured|reserved|booked|all\s+set|locked\s+in|in\s+place|sorted|good\s+to\s+go|ready|held|yours|set|on|arranged)`;
const DATE_TOKEN = String.raw`(?:\d{1,2}(?:st|nd|rd|th)?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)`;
// A stricter date for BARE (subjectless) patterns: an ordinal day or a month
// name, never a plain number — so a clock time ("3 pm") is not read as a date.
const STRICT_DATE = String.raw`(?:(?:the\s+)?\d{1,2}(?:st|nd|rd|th)|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)`;

const STAY_AFFIRMATIONS: readonly RegExp[] = [
  // "your booking is/has been/was confirmed | ready | held | yours | on the 20th"
  new RegExp(String.raw`\b(?:your|the)\s+${BOOKING_SUBJECT}\b[^.!?]{0,40}?\b${AFFIRM}\b`, 'i'),
  // "your stay runs 20-22 Dec" / "your booking is for the 20th" — a booking
  // subject tied to a DATE or a period is an assertion the booking exists.
  new RegExp(
    String.raw`\b(?:your|the)\s+${BOOKING_SUBJECT}\b[^.!?]{0,30}?\b(?:runs?|starts?|begins?|is\s+for|are\s+for|from|on)\b[^.!?]{0,15}?${DATE_TOKEN}`,
    'i',
  ),
  // "your stay, 20-22 Dec, four adults" — subject + a party count.
  new RegExp(
    String.raw`\b(?:your|the)\s+${BOOKING_SUBJECT}\b[^.!?]{0,40}?\b\d+\s+(?:adults?|guests?|people)\b`,
    'i',
  ),
  // "I can see / I have / I found your booking" — an awareness claim asserts one
  // exists at all. "I have your booking in front of me", "your reservation shows".
  new RegExp(
    String.raw`\b(?:i|we)\s+(?:can\s+see|see|have|found|have\s+got|'ve\s+got)\b[^.!?]{0,20}?\byour\s+${BOOKING_SUBJECT}\b`,
    'i',
  ),
  new RegExp(String.raw`\byour\s+${BOOKING_SUBJECT}\s+shows\b`, 'i'),
  // "you're all set / you are booked in / you're checking in on the 20th"
  new RegExp(
    String.raw`\byou(?:'re|\s+are)\s+(?:all\s+set|confirmed|booked\s+in|checked\s+in|checking\s+in|with\s+us|staying\s+with\s+us|booked\s+(?:from|for|in))\b`,
    'i',
  ),
  // "we have you down / booked / in for the 20th"
  new RegExp(String.raw`\bwe\s+have\s+you\s+(?:down|booked|in|staying)\b`, 'i'),
  // "your booking/stay with us" — asserts one exists.
  new RegExp(String.raw`\byour\s+${BOOKING_SUBJECT}\s+with\s+us\b`, 'i'),
  // "everything is confirmed/set at our end" — this product's booking-state idiom.
  new RegExp(String.raw`\beverything\s+(?:is|'s)\s+(?:confirmed|set|sorted|in\s+place)\b`, 'i'),
  // "the villa is yours from the 20th" / "the room is held for you".
  new RegExp(String.raw`\bthe\s+(?:villa|room|house)\s+is\s+(?:yours|held|ready|booked)\b`, 'i'),
  // "see you on the 20th" — an arrival assertion ONLY when it names a date, so a
  // lead's "hope to see you soon" does not trip (audit: bare greeting over-fired).
  new RegExp(String.raw`\bsee\s+you\s+(?:on|this|next)?\s*(?:the\s+)?${DATE_TOKEN}`, 'i'),
  // Bare "check-in on the 20th" / "check-out is the 22nd" — the subject leads the
  // sentence with no "your". Uses STRICT_DATE so "check-in is from 3 pm" (a policy
  // answer about the TIME) is not read as a booking assertion (audit false pos).
  new RegExp(
    String.raw`\bcheck[-\s]?(?:in|out)\b[^.!?]{0,12}?\b(?:on|is|are|from|for)\b[^.!?]{0,10}?${STRICT_DATE}`,
    'i',
  ),
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

/**
 * UNIT ASSERTIONS (§5.4 as CODE, not just a block-[4] instruction).
 *
 * WHY this needs a deterministic guard, verified in the website codebase
 * (2026-07-13, read-only audit):
 *   - The booking engine sends eZee a ROOM TYPE and **never a physical RoomID**
 *     (bkg-31-create-booking: `Roomtype_Id`, no RoomID field exists). eZee picks
 *     the actual house.
 *   - But the website SHOWS the guest a named individual villa — "Villa C3" —
 *     from its own editorial overlay, and stamps individual villas "Booked".
 *     Its own auditor's words: *"the site promises a specific unit, but the
 *     booking reserves only a TYPE… the villa name is a DISPLAY fact, not a
 *     RESERVED fact."*
 *
 * So a guest WILL tell us "my Villa C3 booking" — in good faith, because we told
 * them that — while eZee may have put them in C1. If the model echoes it back,
 * we lend our authority to an error the guest cannot check, and CH-13 sends
 * housekeeping to the wrong house. Block [4] alone cannot hold that line: the
 * guest's own words are the strongest possible prompt to echo.
 *
 * The rule: the AI may name a unit ONLY when the MIRROR assigned one (and only
 * THAT one). Naming any other — including one the guest themselves named — is a
 * violation. Scoped to ASSIGNMENT framing, so pre-sales prose is untouched:
 * "C3 wraps around its own pool" is a description and stays legal (it is a voice
 * -guide exemplar); "your stay is in C3" is a claim about who sleeps where.
 */
const UNIT_TOKEN = String.raw`(?:villa\s+)?(?:B1|B3|C1|C3)\b|apartments?\s+(?:0?6|0?9|11)\b|siolim(?:\s+4bhk)?\b`;
const UNIT_MENTION = new RegExp(String.raw`(?:${UNIT_TOKEN})`, 'i');

/**
 * THE SHAPE OF THIS RULE — rewritten after the close-out audit, which is the
 * SIXTH time this repo has shipped "an enumerated rule narrower than the
 * contract it stands for". The first version listed four ASSERTION SHAPES
 * ("you're in C3", "we've put you in C3", …). Six of twelve natural ways to
 * name a guest's house walked straight through it:
 *     "Your house is Apartment 09."            (copula, not a listed shape)
 *     "You have been allocated Apartment 06."  (passive)
 *     "The house allocated to you is Apt 11."  (relative clause)
 *     "I can see Apartment 06 against your booking."
 *     "Head to Apartment 11 on arrival."
 *     "That would be Apartment 06."            (echoing the guest back)
 *
 * So the rule is now written from the CONTRACT, not from a list of sentences.
 * Post-OQ-19 the contract is unusually clean, because `stayView` no longer
 * emits a house label at all (TRUST_EZEE_ROOM_ASSIGNMENT = false): **the model
 * has no source for "Apartment 06" except the guest's own message.** So:
 *
 *   naming a house  = LEGAL   — it is how we sell ("C3 wraps around its own pool")
 *   BINDING a house to this guest = a violation, always, while OQ-19 is open.
 *
 * A violation is therefore a unit token co-occurring, IN ONE SENTENCE, with a
 * cue that binds it to the guest — possession, occupancy, allocation, a claim
 * to see it on our record, or an arrival directive. Pre-sales prose carries no
 * such cue and stays untouched ("you'll love Villa C3" has second person but no
 * BINDING — bare `you`/`you'll` is deliberately NOT a cue).
 */
const UNIT_BINDING_STRONG = new RegExp(
  [
    // occupancy — second person + a preposition of place
    String.raw`\byou(?:'re|\s+are|'ll\s+be|\s+will\s+be|\s+are\s+going\s+to\s+be)?\s*(?:staying\s+)?(?:in|at|into)\b`,
    // allocation — active, passive, or as a relative clause. Note "booked/checked
    // INTO" and not a bare "booked": "C1 is booked those nights" is an
    // AVAILABILITY answer (pre-sales, legal), not an assignment. Same reason
    // bare `reserved`/`held` are absent — "we have reserved C3 FOR YOU" is
    // already caught by possession, without costing us "C3 is reserved those
    // nights".
    String.raw`\b(?:assigned|allocated|given|put|placed)\b`,
    String.raw`\b(?:booked|checked|moved)\s+(?:you\s+)?in(?:to)?\b`,
    // a claim to see it on OUR record
    String.raw`\b(?:can\s+see|i\s+see|we\s+see|shows?|showing|against\s+your)\b`,
    // arrival directive
    String.raw`\b(?:head|go|proceed)\s+(?:to|over|straight)\b|\bon\s+arrival\b|\bwhen\s+you\s+arrive\b`,
  ].join('|'),
  'i',
);

/**
 * POSSESSION is the weak cue, and it needs the CH-06 treatment.
 *
 * "Your two nights at Villa B3 come to ₹34,000" is the product's core pre-sales
 * sentence — the guest picked B3 on the website and we are pricing B3. It is not
 * an assignment, and a guard that blocks it blocks the revenue path. But
 * "Your stay at Villa B1 starts on the 20th" is the same possessive shape and IS
 * an assignment. The discriminator is what the predicate asserts: a PRICE (a
 * quote for a hypothetical stay) or the EXISTENCE of a booking.
 *
 * So possession alone is a violation UNLESS its sentence is a quote — and, per
 * the CH-06 fee lesson that this repo has already been bitten by, the exemption
 * is CONTEXT-BOUND to that sentence and can never rescue a STRONG cue. "You're
 * in Apartment 06 and the total is ₹34,000" carries a price cue and is still a
 * violation, because occupancy was asserted outright. Never flatten this back
 * into "a price cue anywhere makes a unit mention legal".
 */
const UNIT_POSSESSION = /\byour\b|\byours\b|\bfor\s+you\b|\bto\s+you\b/i;

/**
 * The ECHO shape. The guest is the ONLY possible source of a house name (see
 * above), so the likeliest way we hand them a wrong house is by agreeing with
 * one they name themselves: *"am I in Apartment 06?" → "That would be
 * Apartment 06."* No binding cue appears in that sentence at all.
 *
 * This is the one pattern that can misfire on pre-sales ("which villa has four
 * bedrooms?" → "That would be Villa C3" → regenerate). We accept that cost
 * knowingly: the regenerate produces a legal phrasing, whereas the false
 * negative sends a guest to a house that is not theirs.
 */
const UNIT_ECHO = new RegExp(
  String.raw`\b(?:that|it|this)\s+(?:would\s+be|will\s+be|is|'s)\s+(?:${UNIT_TOKEN})` +
    String.raw`|\b(?:yes|correct|indeed|right)\b[^.!?]{0,24}?(?:${UNIT_TOKEN})`,
  'i',
);

/** The canonical label a matched span refers to — so we can tell "the unit we
 * were actually given" from "some other house". */
function unitLabelOf(span: string): string | null {
  const s = span.toLowerCase();
  for (const villa of VILLAS) {
    const label = villa.label.toLowerCase();
    // "Villa B3" → also matches a bare "b3"; "Apartment 09" needs the word.
    const short = label.replace(/^villa\s+/, '');
    if (s.includes(label)) return villa.label;
    if (/^villa /.test(label) && new RegExp(String.raw`\b${short}\b`).test(s)) return villa.label;
    if (label.startsWith('siolim') && s.includes('siolim')) return villa.label;
  }
  return null;
}

/**
 * Units the draft claims the guest is in. `assigned` = the labels the MIRROR
 * actually gave us (stayView's `isUnit` stays). Naming any unit not in that set
 * — including the right villa when we were told none — is a violation.
 *
 * `assigned` undefined ⇒ the check is SKIPPED (pre-CH-11 callers and pure suites
 * keep their exact behaviour; the worker always supplies it).
 */
export function scanUnitAssertions(
  draft: string,
  assigned: readonly string[] | undefined,
): StayAffirmationScan {
  if (assigned === undefined) return { violations: [] };
  // Deduped by the UNIT, not the sentence: one wrong house is ONE violation in
  // the weekly review, however many ways the draft managed to say it.
  const byUnit = new Map<string, string>();
  for (const sentence of splitSentences(draft)) {
    const mention = UNIT_MENTION.exec(sentence);
    if (mention === null) continue; // no house named — nothing to bind
    const bound =
      UNIT_BINDING_STRONG.test(sentence) ||
      UNIT_ECHO.test(sentence) ||
      // Possession binds a house to the guest UNLESS the sentence is a quote.
      (UNIT_POSSESSION.test(sentence) && !PRICE_CUE.test(sentence));
    if (!bound) continue; // pure description, or a price quote: both legal
    const label = unitLabelOf(mention[0]) ?? unitLabelOf(sentence);
    if (label !== null && assigned.includes(label)) continue; // it IS their villa
    byUnit.set(label ?? sentence.trim(), sentence.trim());
  }
  return { violations: [...byUnit.values()] };
}

export const UNIT_NUDGE =
  'You named a specific villa unit. Our booking system has not told us which house this guest is in — bookings are held at villa TYPE and the unit is assigned later, so naming one (even one the guest named themselves) may be wrong. Speak of the villa type instead ("your villa in Assagao"), and never confirm a specific house.';

/** The regenerate hint. Kept SEPARATE from PROMISE_NUDGE: this is not a false
 * promise, it is a false FACT, and the correction is different. */
export const STAY_NUDGE =
  'You stated or implied that this guest has a booking with us. No booking is linked to this number. Do not state or imply that they have a booking, a stay, dates or an arrival. Say plainly that you cannot see a booking on this number, and ask for the name on the booking and the check-in date so the team can find it.';
