# Nistula Assistance — Product Picture (the six acceptance scenarios)
*The contract for what "working" means. CH-19's replay harness asserts against these scripts; the build ships when all six pass on the test line. Copied into the repo as `docs/product-picture.md`.*

Legend: **G** = guest's WhatsApp · **A** = the AI (Nistula voice) · **H** = human staff (from the normal app) · **STAFF** = what the team's phones receive · **SYS** = what the system must have done (assertable).

---

## S1 · Midnight enquiry (pre-sales, no human)

- G 23:42 — "Hi, is a 3bhk villa available 20-22 dec? what will be the rate"
- A 23:42 — Good evening + yes: 3BHK duplex villas in Assagao free for 20–22 Dec, exact all-inclusive ₹ figure from the live quote, sleeps info, offer of photos or the booking link.
- G 23:43 — "any discount for direct booking?"
- A 23:43 — Phrasebook discount line (final rate for everyone, all-inclusive) + booking link. No discount words, no apology.

STAFF: nothing. SYS: ack <1s · debounce batched · `get_quote` called (villa type resolved from "3bhk") · every ₹ in replies present in tool JSON (guardrail 1 log clean) · booking link from `get_booking_link` · conversation logged · in draft mode this pauses at a draft card instead.

## S2 · Booking made (lifecycle, zero staff typing)

> **⚠️ AMENDED 2026-07-14 (CH-12), Paul-approved.** Two lines of this scenario asked for things that
> do not exist, and shipping them would have meant inventing facts at a guest.
> 1. The pre-arrival originally promised a **"map pin, host contact"**. **There is no address, pin or
>    coordinate anywhere in the knowledge base, and no sanctioned staff contact number**
>    (OQ-12 / team-question Q37 — both open 🔴). So the pre-arrival now does what `kb/faq.md` already
>    promises guests today: it **asks for the arrival time and says a human will send the pin.** When
>    the villa team supplies a pin, this becomes real and the copy tightens.
> 2. Triggering on **"website or OTA"** is now gated: OTA bookings are **excluded** by
>    `LIFECYCLE_SOURCES` until the business answers **Q13 — "may we WhatsApp Airbnb/Booking.com
>    guests at all?"** This is not hypothetical: production holds 12 real OTA guests with unmasked
>    phone numbers, and nobody has told us we may write to them.
>
> The original text is preserved in git history. Retractions stay visible.

Event: a **direct** booking (website / walk-in) appears in eZee for Rahul M, 3BHK type, 20–22 Dec, phone present.
*(An OTA booking mirrors identically but is **not** messaged — see the amendment above.)*

- A (moment of booking) — confirmation: name, villa **type** + Assagao, dates, reference, check-in from 3 pm, "we're right here for any question."
- A (17 Dec 10:00 IST) — pre-arrival: check-in from 3 pm, **asks for the expected arrival time and promises the accurate location pin in reply**, offers to help before travel.
- A (20 Dec 09:00 IST) — welcome: villa ready from 3 pm, "message us right here for anything."

STAFF: arrivals digest line the evening before (via window-aware send). SYS: poller mirrored the booking ≤60s · guest row auto-created from booking phone · **five** `scheduled_messages` rows (confirmation, pre-arrival, welcome, thank-you, win-back) with correct IST times + dedupe keys · date-change **reschedules** rows (never duplicates), cancellation clears the pending ones · templates used when window closed (dev: `raw.devTemplate=true`) · **the four gates passed: in-epoch, arriving, confirmed, sanctioned source.**

## S3 · Two towels (in-stay service + honest follow-up)

Precondition: Rahul linked to an ACTIVE stay in Villa B3.

- G 15:20 — "hi, can we get 2 extra towels"
- A 15:20 — "Of course — two fresh towels are on their way up. Anything else you need this afternoon?"
  **🚨 The AI's REPLY names no house, and that is a DIFFERENT rule from the card above.**
  `TRUST_EZEE_ROOM_ASSIGNMENT = false` still gates what we SAY to a guest (OQ-15: may we promise a
  specific house at all?), even though the staff card may now route on one. An earlier draft of this
  line read "on their way to Villa B3" — CH-11's `scanUnitAssertions` guardrail would have
  deterministically escalated the very reply this scenario asserts.
- STAFF 15:20 — task card: `NISTULA TASK #<id> · Nistula Villa (Assagao) · Rahul · 2 extra towels · Reply DONE <id>`
  **🚨 OQ-19 amendment, REVISED 2026-07-16 (this supersedes the earlier amendment on this line —
  which said the card must never name a house and was written before the answer landed): the card MAY
  name the house, sourced from a FRESH `BKG-03 tran.RoomID` read at task time — NEVER from
  `bookings_mirror.physical_room_label`, a snapshot frozen at CH-11's 14 Jul reconcile.
  `assignFor(kind, villa)` may key off that fresh read; it falls back to the frontdesk lead only when
  BKG-03 cannot resolve a room (it returns 503 for an unconfirmed hold — "unreadable" NEVER means
  "cancelled"). The PMS re-model is NOT a precondition. CH-19 asserts THIS.**
- G 15:52 — "where are those?"
- A 15:52 — HONEST wording: references the open task and the nudge — "I've just nudged housekeeping — your towels are marked on the way. Sorry for the wait, Rahul." (Never "I checked with housekeeping" — it checked the task record.)
- STAFF 15:52 — SLA nudge (task open 32 min > 30-min SLA): re-ping + cc lead.
- H (staff) 15:58 — replies `DONE <id>`.
- A ≤16:00 — graceful close to the guest.

SYS: `create_staff_task` succeeded BEFORE the 15:20 promise (guardrail 2) · follow-up resolved "those" from context · SLA nudger wrote the `sender:'system'` row that makes "I've nudged" claimable · DONE closed the task + informed the guest.

## S4 · Special request (human takeover + escalation SLA)

Different guest (Villa B1, arriving Friday).

- G 12:15 — "we are planning a proposal at the villa, can you decorate the pool area? budget not an issue"
- A 12:15 — warm congratulations + "our villa team will design this personally; someone will message you right here very shortly." (No invented capabilities, no price talk.)
- STAFF 12:16 — escalation card: guest, villa, ask, full-chat summary; escalation task sla 10m.
- (If no staff reply by 12:26 — SYS: re-ping frontdesk; 12:36 — cc OPS.)
- H 12:19 — Meera replies from the normal app: introduces herself by name, takes over.
- A — silent from the echo onward (`human_active_until` set); resumes only after TTL/hand-back.

SYS: `escalate_to_human(reason: outside_kb)` ran · echo webhook paused the AI + cancelled pending debounce · staff echo to OTHER staff numbers would NOT create conversations · AI ON/OFF commands work.

## S5 · Night issue (honest hold, morning digest)

Rahul, in-house B3, 23:05 (staff off 20:00–10:00).

- G 23:05 — "the AC in the master bedroom feels weak, can someone look at it"
- A 23:05 — sorry once, plainly + honest timing: logged for the villa team, "they'll be at your door soon after 10 when the team comes in" + (only if kb/quirks.md has it) the practical tip: "the second bedroom's AC runs strong — please use it comfortably tonight." No promise of a night visit. Never silence.
- STAFF 10:00 — morning digest: overnight queue (1): B3 · AC weak · 23:05 · guest informed of 10 am visit; night_queue task converts to live task, SLA starts.

SYS: maintenance intent + staff-off → night_queue path (no 23:05 staff ping) · quirk line only from kb/quirks.md, never invented · digest lists it · task open with running clock.

## S6 · Three months later (win-back + memory)

Precondition: Rahul's stay ended ~75 days ago; `marketing_opt_in=true` (captured via post-stay YES); one `past_issue` fact ("AC weak in B3 master — resolved") and one `preference` fact ("early check-in matters").

> **⚠️ AMENDED 2026-07-14 (CH-12), Paul-approved.** The win-back originally **"names the villa"**.
> It may not, and neither may anything else we send: **a guest cannot book a specific house — eZee
> picks one for them** (🚨 OQ-19, proven end to end). `bookings_mirror.physical_room_label` is
> eZee's *guess*, not the house the guest bought, so "your stay in Villa B3" could simply be false.
> The win-back therefore names the villa **TYPE and its locality** ("your Nistula Villa in Assagao"),
> which is always true. `stayView.TRUST_EZEE_ROOM_ASSIGNMENT = false` enforces it in code, not by
> prompt. **Naming a house to a GUEST is gated on OQ-15** (may we promise a specific house?) **and on
> staleness — NOT on the PMS re-model, which OQ-19's 2026-07-16 answer removed as a precondition.**

- A 11:00 (win-back template) — seasonal, personal, names the villa **TYPE + locality** (never a house — see above), zero pressure, "(Reply STOP anytime to stop these.)"
- G 11:24 — "good timing. is b3 free 12-14 oct?"
- A 11:24 — live ₹ figure from `get_quote` + memory in action: "and I remember early check-in matters to you — I've already flagged it to the team" (only if a task/fact action actually ran) + booking link offer.

SYS: win-back gated on opt-in + <2 in trailing 365d · reply opened a free-form window · profile block carried both facts · a frontdesk task exists to verify the past AC issue before the new arrival (auto-created on the new `booking.created` if he books) · STOP at any point flips opt-in off and cancels pending marketing.

---

## Cross-scenario invariants (assert everywhere)
1. Every ₹ figure traces to tool JSON or whitelisted kb/policies.md figures.
2. Every "the team has been / is…" claim traces to a tool call or a `sender:'system'` event since the guest's last message.
3. No discount/deal language, ever; phrasebook lines verbatim where triggered.
4. No reply outside the 24h window as free-form; no marketing without opt-in.
5. One combined reply per guest burst (debounce); no duplicate sends on retries.
6. Voice: British English, no exclamation marks, sir/ma'am per register, emoji only mirroring the guest.
