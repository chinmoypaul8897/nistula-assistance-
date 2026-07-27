# Nistula Assistance — Product Picture (the six acceptance scenarios)
*The contract for what "working" means. CH-19's replay harness asserts against these scripts; the build shipped when all six passed via the in-process replay harness. Copied into the repo as `docs/product-picture.md`.*

> ## ✅ ACCEPTANCE PASSED — v1.0.0 (2026-07-21)
> All six scenarios replay green via the **in-process deterministic** harness (`pnpm replay` 6/6;
> `test/acceptance/replay.test.ts` kept green in `pnpm check`; full suite 1777; CI green). That harness is
> scripted Claude + fixture website/eZee + captured WhatsApp sends — **NOT a live `pnpm dev`** (Paul-approved).
> Paul signed off the **LIVE voice pass for S1** on the test line vs real Claude (voice invariant #6, which
> a scripted harness cannot prove). The S2/S6 lifecycle-send and S3/S4 staff-loop LIVE legs are deliberately
> DEFERRED to real-number cutover (runbook §CH-19). One beat below is struck as a post-v1 fast-follow — see
> the S2 amendment.

> ## ⚠️ AMENDED 2026-07-27 (CH-20 · inventory change), Paul-approved
> **Nistula's contract for the four three-bedroom Assagao villas — Villa B1, B3, C1 and C3 — ended on
> 2026-07-24. They were removed from eZee and from the website. Nistula now lets FOUR houses in TWO
> room types: Apartment 06, Apartment 09, Apartment 11 (the "Nistula Apartment" type) and the Siolim
> 4BHK.** Removing all four retired an ENTIRE room type, not just rows.
>
> **Every scenario below was written against the old eight-house inventory, and five of the six opened
> on a house that no longer exists.** They are amended in place and struck where a beat changed —
> never silently rewritten, because this file is the contract `test/acceptance/replay.test.ts` asserts
> against. **What each scenario PROVES is unchanged**; only the product it proves it on has moved. The
> apartments still share one room type, so every multi-unit behaviour (type-level quoting, eZee
> assigning the house, "never name a unit to a guest") survives intact on them.
>
> **One beat is ADDED, not merely retargeted — S1's opening.** A guest asking for a three-bedroom is
> not a hypothetical: the four villas were sold for years, and their website ids 404 today. Before
> CH-20 that guest got a 404 the tools could not distinguish from "taken", so **the AI could tell a
> guest the dates were unavailable for a house Nistula no longer operates** — a false statement about
> a real product, in a system whose first rule is never to invent. The retirement line is now an
> asserted beat, and "never blame the dates" is asserted with it.
>
> Original text preserved in git history. Retractions stay visible.

Legend: **G** = guest's WhatsApp · **A** = the AI (Nistula voice) · **H** = human staff (from the normal app) · **STAFF** = what the team's phones receive · **SYS** = what the system must have done (assertable).

---

## S1 · Midnight enquiry (pre-sales, no human)

> **⚠️ AMENDED 2026-07-27 (CH-20), Paul-approved.** The guest's opening line is UNCHANGED — a guest
> really does still ask for a 3BHK — but ~~the AI's reply quoted it~~. It cannot: that product was
> retired 2026-07-24. The retirement beat is now asserted, and the scenario then continues onto the
> apartments so it still proves what it was built to prove (live quote, ₹ trace, discount phrasebook,
> booking link). **The critical negative: the AI must NOT say the dates are taken.** A 404 from a
> retired id is indistinguishable from "unavailable" to anything downstream, and blaming the dates
> would be a false statement about a real house.

- G 23:42 — "Hi, is a 3bhk villa available 20-22 dec? what will be the rate"
- A 23:42 — the approved retirement line: we no longer let the three-bedroom houses in Assagao, here is what we do have (the Assagao apartments, the four-bedroom villa in Siolim), shall I check either for those dates. **No ₹ figure, no house named, no claim about availability.**
- G 23:43 — "the apartments then — same dates"
- A 23:43 — yes: apartments in Assagao free for 20–22 Dec, exact all-inclusive ₹ figure from the live quote, sleeps info, offer of photos or the booking link.
- G 23:44 — "any discount for direct booking?"
- A 23:44 — Phrasebook discount line (final rate for everyone, all-inclusive) + booking link. No discount words, no apology.

STAFF: nothing. SYS: ack <1s · debounce batched · `get_quote` on "3bhk" returned **`INVENTORY_RETIRED`** and **no quote was issued for it** · `get_quote` called for the apartment TYPE · every ₹ in replies present in tool JSON (guardrail 1 log clean) · booking link from `get_booking_link` · conversation logged · in draft mode this pauses at a draft card instead.
**Asserted negatives:** no reply names Villa B1/B3/C1/C3 or the "Nistula Villa" type · no reply attributes the retirement to dates being taken/booked/unavailable.

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

Event: a **direct** booking (website / walk-in) appears in eZee for Rahul M, ~~3BHK type~~ **Nistula Apartment type (CH-20, 2026-07-27 — the 3BHK type was retired 2026-07-24)**, 20–22 Dec, phone present.
*(An OTA booking mirrors identically but is **not** messaged — see the amendment above.)*

- A (moment of booking) — confirmation: name, villa **type** + Assagao, dates, reference, check-in from 3 pm, "we're right here for any question."
- A (17 Dec 10:00 IST) — pre-arrival: check-in from 3 pm, **asks for the expected arrival time and promises the accurate location pin in reply**, offers to help before travel.
- A (20 Dec 09:00 IST) — welcome: villa ready from 3 pm, "message us right here for anything."

STAFF: ~~arrivals digest line the evening before (via window-aware send)~~.
> **⚠️ AMENDED 2026-07-21 (CH-19), Paul-approved (option b).** The **evening
> "arriving tomorrow" digest was never built** in any chunk — the lifecycle ships
> a morning (10:00) staff digest and a 23:30 ops rollup, but no evening arrivals
> line. It is **deferred to a post-v1.0.0 fast-follow** (a small ~17:00-IST cron
> mirroring `staff/digest.ts`): a staff-convenience beat, not a guest-facing gap,
> and the pre-arrival guest message + morning digest already cover the core. So
> v1.0.0 ships against this honest contract; CH-19 does NOT assert this beat.
> Filed as a post-v1 fast-follow in `progress.md` (CH-19 entry). Original text
> preserved in git history.

SYS: poller mirrored the booking ≤60s · guest row auto-created from booking phone · **five** `scheduled_messages` rows (confirmation, pre-arrival, welcome, thank-you, win-back) with correct IST times + dedupe keys · date-change **reschedules** rows (never duplicates), cancellation clears the pending ones · templates used when window closed (dev: `raw.devTemplate=true`) · **the four gates passed: in-epoch, arriving, confirmed, sanctioned source.**

## S3 · Two towels (in-stay service + honest follow-up)

Precondition: Rahul linked to an ACTIVE stay in ~~Villa B3~~ **Apartment 09 (CH-20, 2026-07-27)**.

> **⚠️ AMENDED 2026-07-27 (CH-20), Paul-approved.** The stay, the staff card's house and the roster
> round all move from Villa B3 to an apartment. **Nothing this scenario proves changes**: the
> apartments share one room type and eZee assigns the unit, so the card still names a house resolved
> from a FRESH `BKG-03 tran.RoomID` read at task time, and the AI's reply still names no house at all.
> Retargeting it onto the apartments is in fact a STRICTER test of the same rule — the apartments are
> now the ONLY multi-unit type left, so they are the only place the "eZee picks the door, we never
> promise it" contract can still be exercised.

- G 15:20 — "hi, can we get 2 extra towels"
- A 15:20 — "Of course — two fresh towels are on their way up. Anything else you need this afternoon?"
  **🚨 The AI's REPLY names no house, and that is a DIFFERENT rule from the card above.**
  `TRUST_EZEE_ROOM_ASSIGNMENT = false` still gates what we SAY to a guest (OQ-15: may we promise a
  specific house at all?), even though the staff card may now route on one. An earlier draft of this
  line read "on their way to Villa B3".
  > **⚠️ CORRECTION 2026-07-17 (CH-13a).** That sentence used to end *"— CH-11's
  > `scanUnitAssertions` guardrail would have deterministically escalated the very reply this
  > scenario asserts."* **It would NOT.** Traced against the real guard: *"Two towels on their way to
  > Villa B3"* carries **no binding cue** — no `you…in/at`, no `your`, no echo of the guest's own
  > words — so it walks straight through. The rule that the reply names no house is real and is what
  > we ship; the claim that a GUARD enforces it was false, and a false belief about which guard
  > covers you is worse than a known gap. Today the protection is that block [2] no longer TEACHES
  > the sentence (`REGISTER_EXEMPLARS[0]` was that exact line and is now "Two towels are on their way
  > up."). Widening the guard's cues is CH-11 surface with real false-positive risk on the pre-sales
  > quote path — filed, not hot-fixed under merge pressure.
- STAFF 15:20 — task card: `NISTULA TASK #<id> · ~~Nistula Villa~~ **Apartment 09** (Assagao) · Rahul · 2 extra towels · Reply DONE <id>` *(CH-20, 2026-07-27)*
  **🚨 OQ-19 amendment, REVISED 2026-07-16 (this supersedes the earlier amendment on this line —
  which said the card must never name a house and was written before the answer landed): the card MAY
  name the house, sourced from a FRESH `BKG-03 tran.RoomID` read at task time — NEVER from
  `bookings_mirror.physical_room_label`, a snapshot frozen at CH-11's 14 Jul reconcile.
  `assignFor(kind, villa)` may key off that fresh read; it falls back to the frontdesk lead only when
  BKG-03 cannot resolve a room. The PMS re-model is NOT a precondition. CH-19 asserts THIS.**
  > **⚠️ CORRECTED 2026-07-17 (CH-13a).** This line used to read *"(it returns 503 for an unconfirmed
  > hold …)"*. **BKG-03 never returned 503 in 14 live probes** — "no such reservation" is an EMPTY OK
  > (`{status:'ok', reservations:[]}`), no room yet is `RoomID:""`, and a CANCELLED or VOIDED booking
  > returns its room happily (so a successful read is NOT proof of life). The 503 string is
  > documented for **BKG-30**, a different endpoint. The unconfirmed-hold case specifically is
  > **untested, not disproven** — none was reachable to probe. `staff/villaRoute.ts` treats all of
  > them identically, so **the rule survives unchanged: "unreadable" NEVER means "cancelled".**
- G 15:52 — "where are those?"
- A 15:52 — HONEST wording: references the open task and the nudge — "I've just nudged housekeeping — your towels are marked on the way. Sorry for the wait, Rahul." (Never "I checked with housekeeping" — it checked the task record.)
- STAFF 15:52 — SLA nudge (task open 32 min > 30-min SLA): re-ping + cc lead.
- H (staff) 15:58 — replies `DONE <id>`.
- A ≤16:00 — graceful close to the guest.

SYS: `create_staff_task` succeeded BEFORE the 15:20 promise (guardrail 2) · follow-up resolved "those" from context · SLA nudger wrote the `sender:'system'` row that makes "I've nudged" claimable · DONE closed the task + informed the guest.

## S4 · Special request (human takeover + escalation SLA)

Different guest (~~Villa B1~~ **Apartment 06 (CH-20, 2026-07-27)**, arriving Friday).
*(The guest's line still says "at the villa" — that is a guest's own word for where they are staying, and Nistula remains a villa company. Nothing here depends on a three-bedroom house.)*

- G 12:15 — "we are planning a proposal at the villa, can you decorate the pool area? budget not an issue"
- A 12:15 — warm congratulations + "our villa team will design this personally; someone will message you right here very shortly." (No invented capabilities, no price talk.)
- STAFF 12:16 — escalation card: guest, villa, ask, full-chat summary; escalation task sla 10m.
- (If no staff reply by 12:26 — SYS: re-ping frontdesk; 12:36 — cc OPS.)
- H 12:19 — Meera replies from the normal app: introduces herself by name, takes over.
- A — silent from the echo onward (`human_active_until` set); resumes only after TTL/hand-back.

SYS: `escalate_to_human(reason: outside_kb)` ran · echo webhook paused the AI + cancelled pending debounce · staff echo to OTHER staff numbers would NOT create conversations · AI ON/OFF commands work.

## S5 · Night issue (honest hold, morning digest)

Rahul, in-house ~~B3~~ **Apartment 09 (CH-20, 2026-07-27)**, 23:05 (staff off 20:00–10:00).

- G 23:05 — "the AC in the master bedroom feels weak, can someone look at it"
- A 23:05 — sorry once, plainly + honest timing: logged for the villa team, "they'll be at your door soon after 10 when the team comes in" + (only if kb/quirks.md has it) the practical tip: "the second bedroom's AC runs strong — please use it comfortably tonight." No promise of a night visit. Never silence.
- STAFF 10:00 — morning digest: overnight queue (1): ~~B3~~ **Apartment 09** · AC weak · 23:05 · guest informed of 10 am visit; night_queue task converts to live task, SLA starts. *(CH-20, 2026-07-27)*

SYS: maintenance intent + staff-off → night_queue path (no 23:05 staff ping) · quirk line only from kb/quirks.md, never invented · digest lists it · task open with running clock.

## S6 · Three months later (win-back + memory)

Precondition: Rahul's stay ended ~75 days ago; `marketing_opt_in=true` (captured via post-stay YES); one `past_issue` fact (~~"AC weak in B3 master — resolved"~~ **"AC weak in the apartment master — resolved"**) and one `preference` fact ("early check-in matters"). *(CH-20, 2026-07-27)*

> **⚠️ AMENDED 2026-07-27 (CH-20), Paul-approved.** Rahul's stay becomes an **apartment** stay, and
> the win-back names the **Nistula Apartment** type + locality. Two things this amendment must not be
> read as softening:
> 1. **A win-back for a RETIRED type is not retargeted — it is SKIPPED.** `lifecycle/sendGuards.ts`
>    blocks `winback` and `lead_followup` when the scheduled row's stored `villaType` is the retired
>    product (reason `inventory_retired`). SKIP, not defer, is the correct verb here by the standing
>    rule — **a retirement cannot come back**, so the row can never become sendable. Any residual row
>    typed to a departed villa dies quietly rather than inviting a guest to re-book a house Nistula no
>    longer lets.
> 2. **The guest's reply now asks for the three-bedroom, on purpose.** A returning guest asking for
>    more space is the likeliest way a real person meets the retired product, and it makes S6 assert
>    the retirement line on the *memory* path as well as the pre-sales one.

> **⚠️ AMENDED 2026-07-14 (CH-12), Paul-approved.** The win-back originally **"names the villa"**.
> It may not, and neither may anything else we send: **a guest cannot book a specific house — eZee
> picks one for them** (🚨 OQ-19, proven end to end). `bookings_mirror.physical_room_label` is
> eZee's *guess*, not the house the guest bought, so "your stay in Villa B3" could simply be false.
> The win-back therefore names the villa **TYPE and its locality** ("your Nistula Villa in Assagao"),
> which is always true. `stayView.TRUST_EZEE_ROOM_ASSIGNMENT = false` enforces it in code, not by
> prompt. **Naming a house to a GUEST is gated on OQ-15** (may we promise a specific house?) **and on
> staleness — NOT on the PMS re-model, which OQ-19's 2026-07-16 answer removed as a precondition.**

- A 11:00 (win-back template) — seasonal, personal, names the villa **TYPE + locality** (~~"your Nistula Villa in Assagao"~~ **"your Nistula Apartment in Assagao"** — never a house, see above), zero pressure, "(Reply STOP anytime to stop these.)"
- G 11:24 — "good timing. is the 3bhk free 12-14 oct?" *(CH-20: ~~"is b3 free 12-14 oct?"~~ — same ask, now aimed at the retired TYPE)*
- A 11:24 — the approved retirement line first (no ₹ figure, no fake "taken"), then what we do have.
- G 11:25 — "ok the apartment then"
- A 11:25 — live ₹ figure from `get_quote` + memory in action: "and I remember early check-in matters to you — I've already flagged it to the team" (only if a task/fact action actually ran) + booking link offer.

SYS: win-back gated on opt-in + <2 in trailing 365d · **a win-back whose stored `villaType` is the retired product is SKIPPED with reason `inventory_retired`, never sent** · reply opened a free-form window · profile block carried both facts · a frontdesk task exists to verify the past AC issue before the new arrival (auto-created on the new `booking.created` if he books) · STOP at any point flips opt-in off and cancels pending marketing.

---

## Cross-scenario invariants (assert everywhere)
1. Every ₹ figure traces to tool JSON or whitelisted kb/policies.md figures.
2. Every "the team has been / is…" claim traces to a tool call or a `sender:'system'` event since the guest's last message.
3. No discount/deal language, ever; phrasebook lines verbatim where triggered.
4. No reply outside the 24h window as free-form; no marketing without opt-in.
5. One combined reply per guest burst (debounce); no duplicate sends on retries.
6. Voice: British English, no exclamation marks, sir/ma'am per register, emoji only mirroring the guest.
