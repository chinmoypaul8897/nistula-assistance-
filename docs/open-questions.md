# Open Questions & Pending Inputs — Nistula Assistance

> ## ⚑⚑ THE STANDING DECISION — build the tech first, ask the business ONCE, properly
> **Paul, 2026-07-13. This supersedes and widens the 2026-07-11 decision below, and it is the
> governing rule for this file.**
>
> **The root cause, named:** questions about how the business actually works keep surfacing
> mid-build — a fee nobody published, a process nobody wrote down, a villa fact only the team
> knows. This has happened repeatedly and it will keep happening, **because the tech side does
> not have transparency into the business.** That is a structural gap, not a series of
> accidents, and it will not be fixed by guessing harder.
>
> **So the rule is:**
> 1. **BUILD THE TECH FIRST.** A missing *business* answer never stops a chunk. Ship a
>    **fail-closed default** — the AI refuses, defers, or brings the team in, rather than
>    inventing. Nothing is ever guessed into a guest's face.
> 2. **LOG EVERY QUESTION HERE, as it arises**, with the four things that make it answerable:
>    *what we need to know · why it matters to a real guest · what we shipped meanwhile · what
>    changes once they answer.* A question the team cannot answer without a follow-up is a
>    question we wrote badly.
> 3. **ASK ONCE, AT THE END.** When the engineering is complete, this register is turned into
>    **one properly-framed document** and taken to the villa team / front desk / owner in a
>    single pass. Not a trickle of half-questions over months — one conversation, with the
>    context they need to answer well.
> 4. **THEN the content pass:** answers land here, the KB is rebuilt, the fail-closed defaults
>    are replaced by real rules, and the content-dependent acceptance is re-validated before
>    go-live.
>
> **The one thing that still STOPS a session (plan §0, unchanged):** a missing *engineering*
> decision or a missing *external API contract*. Those are ours to resolve — by reading the
> authoritative reference, by probing, or by asking Paul directly. They are a different animal
> from "what does the business actually do?", which is what this file is for.
>
> **Why this works:** every unknown in this file is already sitting behind a guard in the code.
> The system is honest today. The answers make it *better*, not *correct* — so we are never
> blocked, and the team is never rushed.

> ### ⚑ (2026-07-11, still true — now a special case of the above)
> Content/data inputs (quirks, real villa copy, missing fees, facts to confirm) depend on slow
> external processes and do not block any chunk. Every chunk is built with the content
> available now, wiring the seam so real answers drop in later.

> **How to use:** fill the `**Answer:**` line and flip **Status** to ✅ when resolved; the
> relevant chunk then consumes it. The exhaustive raw-gap list from the website mine lives in
> [`nistula-kb-export/GAPS.md`](../nistula-kb-export/GAPS.md). Pure-*engineering* deferrals (no
> human input needed) stay in `progress.md`, not here — this file is for the BUSINESS.

> ### 📄 THE COMPILED ASK LIVES IN [`docs/team-questions.md`](team-questions.md)
> That file is the artifact rule 3 above describes: **78 questions, 31 of them go-live blockers**,
> swept out of the whole codebase, plan, KB and build log on 2026-07-13 — grouped by who can
> actually answer them (Paul 33 · front desk 25 · villa team 14 · website 6), each with *what we
> need to know · why it matters to a real guest · what we shipped meanwhile · what changes when
> they answer.* **That is the document Paul sends the team.**
>
> This file (`open-questions.md`) remains the **live register** — where new questions get logged
> as they arise mid-build, and where answers land. Regenerate `team-questions.md` from it (plus a
> fresh repo sweep) when the engineering is done.

**Status legend:** ⬜ OPEN · 🕐 IN PROGRESS · ✅ ANSWERED

## Index

| ID | Question | Owner | Feeds | Status |
|---|---|---|---|---|
| OQ-01 | Per-villa quirks | Villa team | CH-06 (block [3]) | ⬜ |
| OQ-02 | Bed config + bathroom counts | Villa team | CH-06 | ⬜ |
| OQ-03 | Per-villa amenities (differ from property-wide?) | Villa team | CH-06 | ⬜ |
| OQ-04 | Security-deposit amount/formula | Paul + planning | CH-06 · guardrail-1 whitelist | ⬜ |
| OQ-05 | Pet fee | Paul | CH-06 | ⬜ |
| OQ-06 | Late-checkout fee | Paul | CH-06 | ⬜ |
| OQ-07 | Breakfast included? EP vs CP rate | Paul | CH-06 · get_quote plan default | ✅ EP only; CP unsellable |
| OQ-08 | Bedroom count per villa (apartments = 2BHK?) | Paul | CH-06 · `"2bhk"` resolver alias | ⬜ |
| OQ-09 | Does Siolim have a pool? | Paul | CH-06 | ⬜ |
| OQ-10 | Siolim base occupancy = 2 adults (max 8) — intended? | Paul (eZee setup) | CH-06 · booking sanity | ⬜ |
| OQ-11 | Real per-villa descriptions (site copy is placeholder) | Paul (website) | CH-06 quality | ⬜ |
| OQ-12 | Canonical address + which contact channels to hand out | Paul | CH-06 · escalation copy | ⬜ |
| OQ-13 | Deposit model: §5.1 formula vs website — authoritative? | Planning chat | CH-06 · what the AI says re deposits | ⬜ |
| OQ-14 | Update §5.1 QuoteView + §6.4 MIN_NIGHTS wording to the verified API | Planning chat | plan hygiene | ⬜ |
| OQ-15 | When does eZee assign the villa unit; may we name it pre-arrival? | Paul + front desk | CH-13 task cards · CH-12 copy | 🕐 mechanism settled, policy open |
| OQ-16 | RateplanCode → ep/cp map | Paul (website) | block [5] · breakfast | ✅ DO NOT BUILD IT |
| OQ-17 | Should a guest ASSERTING a booking we cannot see fetch a human? | Paul + planning | CH-14 | ⬜ |
| OQ-18 | Website has an UNGATED route that creates real bookings | Paul (website) | pre-launch safety | ⬜ |
| **OQ-19** | **🚨 A guest cannot book a specific house — eZee picks it. PROVEN.** | **Paul + eZee acct mgr** | **BLOCKS website launch** | 🚨 |

---

## A · Villa-team knowledge (not on the website — only ops/hosts have it)

### OQ-01 — Per-villa quirks
**Question:** The practical per-villa notes a concierge is asked most — which bedroom gets morning sun, "the second-bedroom AC runs cold", generator/backup power, Wi-Fi speed/network, on-site caretaker, pool depth, gate/latch tips, parking reality, etc.
**Why / blocks:** CH-06 block [3] `kb/quirks.md`; the single biggest concierge gap — nothing on the website will ever carry this.
**Owner:** Villa team (via the quirks template). **Minimum for the CH-06 demo:** B3 + one apartment; all 8 eventually.
**Status:** ⬜ OPEN
**Answer:** _(to fill — or point to the filled template)_

### OQ-02 — Bed configuration + bathroom counts
**Question:** Per villa: number of bedrooms (confirmed), bed types (king/twin/bunk), and bathroom count.
**Why / blocks:** CH-06 villa facts; the site has only a placeholder bedroom count and no beds/baths.
**Owner:** Villa team.
**Status:** ⬜ OPEN
**Answer:**

### OQ-03 — Per-villa amenities
**Question:** Do amenities actually differ per villa, or is the property-wide list correct for all? If they differ, the real per-villa list.
**Why / blocks:** The site shows ONE property-wide amenity list on every villa — so "does C3 have X?" is currently a property-wide claim, not verified per villa.
**Owner:** Villa team.
**Status:** ⬜ OPEN
**Answer:**

---

## B · Missing guest-facing figures (no number on the site)

### OQ-04 — Security-deposit amount / formula
**Question:** What is the refundable security-deposit amount (a flat figure, a per-booking formula, or the §5.1 rule)? See also OQ-13.
**Why / blocks:** The AI must never state a deposit it can't back; this figure also joins the **guardrail-1 fee exemption** so the AI may quote it. The site says only "amount per booking".
**⚠️ Landing this answer is NOT a content-only edit** (CH-06 review finding). Three things must change together, or the AI silently misbehaves:
1. `kb/source/website-content/policies.md` — add the figure **with the ₹ symbol**, in a sentence that names it ("a refundable **security deposit** of ₹X…"). The exemption is bound to those words; a figure in an unnamed sentence can never be stated, and a symbol-less one (`INR 10,000`) is not matched at all.
2. `src/brain/prompt.ts` block [4] — remove the hardcoded "Never state a deposit amount: none is published", or the model will keep refusing and escalating every deposit question while the figure sits unused.
3. Re-run **`pnpm kb:build`** (re-checks the budget, regenerates the files, prints the new `kbVersion`), and confirm `guardrails.test.ts`'s forward-guard still blocks that same amount when claimed as a nightly rate.
**Owner:** Paul (+ planning, OQ-13).
**Status:** ⬜ OPEN
**Answer:**

### OQ-05 — Pet fee
**Question:** The pet cleaning/stay fee (the site says "may be chargeable", no figure).
**Owner:** Paul. **Feeds:** CH-06 · guardrail-1 whitelist.
**Status:** ⬜ OPEN
**Answer:**

### OQ-06 — Late-checkout fee
**Question:** The late-checkout charge (site: "charged additionally", no figure; early check-in is ₹1,000/hr).
**Owner:** Paul. **Feeds:** CH-06 · guardrail-1 whitelist.
**Status:** ⬜ OPEN
**Answer:**

### OQ-07 — Breakfast inclusion (EP vs CP)
**Question:** Is breakfast included? On which rate — EP (room-only) or CP (with breakfast)? eZee has both plans; the public site quotes the primary one. The amenity list mentions "Breakfast" but the FAQ says "accommodation only unless listed".
**Why / blocks:** Affects what the AI says about inclusions and the default `plan` in `get_quote`.
**Owner:** Paul.
**Status:** ✅ ANSWERED 2026-07-13 (website codebase audit — see OQ-16).
**Answer:** **EP only. CP is not sellable.** The website's booking engine never selects a plan — it always sends the primary (EP) rate plan, and there is no channel by which a plan choice could reach eZee. So every booking is accommodation-only. The published answer, live on every villa page and in the Booking Terms, is: *"The tariff is for the accommodation only, unless meals … are specifically listed in your booking confirmation."* Our KB already says exactly this (`kb/faq.md`) — **no change needed**. `get_quote`'s `ep` default is correct.
**⚠️ The site contradicts itself and you should know why:** a "Breakfast" amenity chip and a "Breakfast sorted" marketing pill render on villa pages (both property-wide marketing strings, not per-villa truth). Neither is a source of truth; the concierge answers from the KB. Worth fixing on the website separately.

---

## C · Facts to confirm (site data is placeholder / ambiguous)

### OQ-08 — Bedroom count per villa (are the apartments 2BHK?)
**Question:** Confirm the real bedroom count per villa. The site flags 7/8 as `bedroomsPlaceholder` (apartments guessed 2BHK, Assagao villas 3BHK; only Siolim's 4BHK is confirmed).
**Why / blocks:** Unlocks the `"2bhk"` → apartment **resolver alias** (today a bare "2bhk" defers), and the KB's stated bedroom facts.
**Owner:** Paul.
**Status:** ⬜ OPEN
**Answer:**

### OQ-09 — Does Siolim 4BHK have a pool?
**Question:** The villa page would show "pool" (property-wide amenity), but Siolim's own description/highlights don't mention one, unlike C3.
**Owner:** Paul.
**Status:** ⬜ OPEN
**Answer:**

### OQ-10 — Siolim base occupancy = 2 adults (max 8)
**Question:** eZee reports Siolim's base adult occupancy as **2** (max 8) — unusual for a 4-bedroom 8-guest villa (apartments base 4, Assagao villas base 6). Is this the intended eZee setup, or a config quirk to fix?
**Owner:** Paul (eZee setup). **Feeds:** booking sanity, pricing base.
**Status:** ⬜ OPEN
**Answer:**

### OQ-11 — Real per-villa descriptions
**Question:** The website's villa headlines/descriptions/highlights currently ship `placeholder:true` (plausible-but-generic). When the real copy is written, the KB should use it.
**Why / blocks:** "Tell me about C3" answers stay generic until this lands. **Action:** re-run the extraction prompt (stored in `progress.md`) and refresh `nistula-kb-export/` once the site copy is final.
**Owner:** Paul (website).
**Status:** ⬜ OPEN
**Answer:**

### OQ-12 — Canonical address + contact channels
**Question:** (a) Confirm the canonical office address (`nistula-policies.md` and `site.ts` give two representations). (b) Which contact channels should the concierge ever hand out — phone +91 88103 58517, WhatsApp, email contact.us@nistula.life, owner-enquiry +91 89200 93048, socials?
**Why / blocks:** escalation/hand-off copy; must not leak the wrong channel.
**Owner:** Paul.
**Status:** ⬜ OPEN
**Answer:**

### OQ-15 — When does eZee assign the physical unit, and may we name it before arrival?
**Question:** A booking is held at villa TYPE ("Nistula Villa") and eZee assigns the actual house (B3, C1…) at some later point. CH-11 renders the type and refuses to name a unit until `physical_room_label` is set (§5.4). Two things we do not know: (a) at what moment does the front desk actually assign the unit — at booking, the night before, at check-in? (b) once assigned, may the AI tell the guest which villa they are in BEFORE they arrive, or is it liable to change?
**Why / blocks:** Product-picture scenarios 3 and 5 require the AI to say "Villa B3" to an in-house guest, and CH-13's staff task card is unactionable without a unit ("send someone to a Nistula Villa" names four different houses). CH-11 built the plumbing (`pnpm ezee:reconcile --apply` hydrates the label from BKG-03, which is the only call that returns it); what is missing is the POLICY.
**Owner:** Paul + front desk. **Feeds:** CH-13 task cards · CH-12 pre-arrival copy · block [4]'s unit rule.
**Status:** 🕐 HALF-ANSWERED (2026-07-13, from the website codebase audit) — the MECHANISM is settled; the POLICY is not.
**Answer (part 1 — what the website proved):** The website's booking engine sends eZee a **ROOM TYPE and never a physical RoomID** (`bkg-31-create-booking.ts`: `Roomtype_Id`, no RoomID field exists). eZee picks the house. **But the website SHOWS the guest a named individual villa** ("Villa C3") from its own editorial overlay, and stamps individual villas "Booked". Its own auditor's words: *"the site promises a specific unit, but the booking reserves only a TYPE… the villa name is a DISPLAY fact, not a RESERVED fact."* Nothing reconciles or alerts when eZee assigns a different sibling.
**Consequence, now enforced in CODE (CH-11 `scanUnitAssertions`):** a guest will say *"my Villa C3 booking"* in perfect good faith and may be in C1. The AI may name a unit ONLY when the mirror assigned one, and only THAT one — naming any other, **including one the guest named themselves**, is a guardrail violation that regenerates, then defers and pages a human (`booking_unit_unknown`). §5.4 is no longer prompt-only.
**Still open (the POLICY, for Paul + front desk):** (a) at what moment does the front desk actually assign the house — at booking, the night before, at check-in? (b) once assigned, is it stable enough for the AI to tell a guest before they arrive, or does it still move? No API can answer these.

### OQ-16 — The rate-plan vocabulary (which RateplanCode means breakfast?)
**Question:** `bookings_mirror.rateplan_id` holds an opaque eZee RateplanCode. Nothing in this repo maps it to EP (room only) or CP (with breakfast), and §5.1's quote API takes `plan=ep|cp` — so the WEBSITE codebase must already know the mapping. What is it?
**Why / blocks:** plan §8 CH-11 step 3 asks block [5] to state the stay's "plan". CH-11 deliberately SHIPPED WITHOUT IT and forbade the AI from stating what a booking includes, because eZee's own human-readable label ("European Plan") is a trap: the model would helpfully translate it into "breakfast is included", and NO guardrail checks an inclusion claim (guardrail 1 checks rupees; guardrail 2 checks actions). Overlaps OQ-07.
**Owner:** Paul (from the nistula-website codebase). **Feeds:** block [5] stays · "is breakfast included?" · `get_quote`'s default plan.
**Status:** ✅ ANSWERED 2026-07-13 — and the answer is **DO NOT BUILD THE MAPPING.**
**Answer:** The website audit says: **do not map `rateplan_id` → ep/cp. The mapping does not reliably exist.**
- The websites own EP/CP resolution is **POSITIONAL, NOT SEMANTIC**: `plan === "cp" ? villa.extraRatePlans[0].id : villa.ratePlan.id`. Nothing checks that `extraRatePlans[0]` IS the CP plan. eZee's MASTER flag is absent on this property.
- **CP is not sellable.** The create path never selects a plan at all — it always sends the primary (EP) rate plan; `BookingRequest` has no `ratePlanId` field. There is no channel by which a plan choice could reach eZee. A CP price is reachable only by hand-crafting a read-only `/api/quote?plan=cp`, and that price can never become a booking.
- The 19-digit rate-plan ids are **not in the website's runtime code at all** — only in a point-in-time doc snapshot. And rate plans are per ROOM TYPE, not per villa.
- An OTA booking (Airbnb/Booking.com — most of this property's volume) could carry any rate plan we have never seen.
**So CH-11's decision to ship no meal plan was right, and it is now permanent.** The truthful answer to "is breakfast included?" needs no rate plan and is already live in our KB, matching the website's published copy word for word: *"The room rate is accommodation only unless breakfast is specifically listed in the booking — the team can confirm meal options."* (`kb/faq.md`)
**⚠️ Do not be misled by the website's own UI:** a "Breakfast" amenity chip and a "Breakfast sorted" marketing pill both render on villa pages, contradicting its own FAQ. Neither is a source of truth. The concierge answers from the KB.

<!-- ============================================================================
WEBSITE-REPO QUESTION PROMPT (OQ-15 + OQ-16) — reusable. Paste into a Claude Code
session opened ON the `chinmoypaul8897/nistula-website` repo. READ-ONLY: the website
calls the LIVE eZee API, so nothing may be written and no booking-creating endpoint
may be touched. Stored here (CH-11, 2026-07-13) per the CH-06 precedent so the ask is
never re-derived from memory.
==============================================================================

READ-ONLY TASK. Do not modify, create, or delete any file in this repo. Do not run any
command that writes anything or calls a booking-creating endpoint. Answer by reading code
only, and cite every answer with a `path:line` reference. If something is genuinely not in
the code, say "NOT IN CODE" — never guess, never fill from general knowledge.

CONTEXT: a separate project (a WhatsApp AI concierge for Nistula) mirrors eZee bookings and
needs to know what it may truthfully tell a guest about their booking. It must never invent
a fact. I need five things this website already knows.

1. RATE PLAN -> MEAL PLAN. Your /api/quote takes a `plan` parameter (`ep` = room only,
   `cp` = with breakfast). eZee identifies a rate plan by an opaque numeric `RateplanCode`
   (a.k.a. RatePlanID / rate_plan_id — 19 digits, e.g. 5220300000000000006).
   - Where does `plan=ep|cp` get turned into an eZee rate-plan id? Show the mapping.
   - Give me the COMPLETE table: RateplanCode -> ep|cp -> human name, for every rate plan
     this site can quote or book, for all 8 villas.
   - Is `cp` (breakfast) actually sold on this site today, or is `ep` the only real plan?

2. WHAT THE BOOKING ENGINE ACTUALLY BOOKS. Find the code that creates a booking in eZee
   (InsertBooking / the IBE path).
   - Which RateplanCode does it send?
   - Does it send a specific physical RoomID (an individual house like B3/C1), or does it
     book at ROOM TYPE level and let eZee assign the unit? Quote the request payload it builds.
   - Does the site ever show the guest which specific villa/unit they will get, before or
     after booking? If yes, where does that come from?

3. THE ID MAP. Give me the mapping the site uses between: its own villa id/slug -> eZee
   RoomID (physical unit) -> eZee RoomTypeID (the type). All 8 villas.

4. BREAKFAST / INCLUSIONS COPY. Does the site anywhere state whether breakfast or meals are
   included in a rate? Quote the exact wording and its source file. (I need to know whether
   "is breakfast included?" has a published answer, or none.)

5. ANY OTHER eZee IDS the site relies on that a booking record would carry — package codes,
   promo/discount codes, source/channel strings. Just list them with where they're used.

OUTPUT: a single markdown answer with the five sections, every fact cited `path:line`, and an
explicit "NOT IN CODE" for anything absent. Do not write it to a file — just print it.

============================================================================ -->

### OQ-17 — Should a guest ASSERTING a booking we cannot see deterministically fetch a human?
**Question:** CH-11's stay guard stops the AI from *inventing* a booking, and if the model insists twice it defers and raises `booking_overclaim` ("they may genuinely have a booking we never captured — check eZee"). But that only fires when the model MISBEHAVES. On the **well-behaved** path — the model obeys block [4] and honestly says *"I can't see a booking on this number; what's the name and the check-in date?"* — **nothing deterministic escalates**, and there is no tool that can act on a name + date (`get_booking` takes a reference only, by design). A human is reached only if the model happens to use a referral phrase that guardrail 2 then makes true. Should a guest with zero linked stays who ASSERTS a booking ("I have a booking", "my reservation", "I'm checking in today") trigger a deterministic escalation, the way a complaint does?
**Why / blocks:** This is the D1 population — a real guest with a real booking our change-feed mirror never captured. It is the exact case CH-11 exists to be safe about, and today the SAFE model path and the ESCALATING path are the same path by luck of phrasing, not by construction — which inverts this repo's own rule that safety is code, not model behaviour. Not built now because a new guest-text heuristic has real false-positive surface (a lead asking "do I need a booking?") and needs its own lexicon + red-team cases: a decision, not an improvisation.
**Owner:** Paul + planning chat. **Feeds:** CH-14 (takeover + escalation SLA — its natural home).
**Status:** ⬜ OPEN
**Answer:**

### OQ-18 — 🚨 The website has an UNGATED booking-create route, and its kill-switch is not global
**Question:** Not a question for the concierge — a **finding**, surfaced by the read-only website audit (2026-07-13) and recorded here so it is not lost. It needs Paul's decision, on the website side.
1. **`POST /api/debug/booking/create` calls `bookingEngine.createBooking` directly — a real BKG-31 write to the LIVE eZee.** It accepts an arbitrary `villaId`, and `isTest: false` opts out of the mandatory "TEST " name prefix. There is no `src/middleware.ts`, and its `runDebug()` helper has **no auth and no `NODE_ENV` gate** — so it ships in a production deploy. A booking can exist in eZee that the guest-facing flow never produced, and that no payment backs.
2. **The booking kill-switch is not global.** `NISTULA_BOOKINGS_DISABLED === "1"` is checked in exactly ONE place (the Razorpay start route). The debug write routes bypass it entirely — so "bookings are paused" is not a truthful statement while that flag is on.
**Why this matters to US:** every booking eZee holds flows into `bookings_mirror` and becomes something the AI may speak about. A booking created by an unauthenticated caller is a booking the concierge would treat as real. It also holds live inventory (CH-10 verified: eZee holds inventory immediately on `InsertBooking`, before any confirm).
**Why / blocks:** nothing in this repo — CH-11 ships regardless. This is plan §10's already-tracked *"Website: gate `/api/debug/*`"* task, now with a concrete and urgent reason.
**Owner:** Paul (website repo — a separate, approval-gated change; Claude has read-only access there).
**Status:** ⬜ OPEN — **recommend gating before go-live, and before the real WhatsApp number is live.**
**Answer:**

---

## D · Planning-chat decisions (design, not just data)

### OQ-13 — Deposit model: §5.1 formula vs website
**Question:** Plan §5.1 defines a security deposit `= min(₹10,000, ceil(avgNight/1000)×1000)`. The live website carries **no such figure** — its security deposit is "refundable; amount per booking" and its booking deposit is "room rate × nights". Which is authoritative, and what (if anything) should the AI say about deposits?
**Why / blocks:** money-accuracy; whether the AI can ever state a deposit; the guardrail-1 whitelist (OQ-04).
**Owner:** Planning chat.
**Status:** ⬜ OPEN
**Answer:**

### OQ-14 — Update the plan to the verified live API
**Question:** From the CH-05 review: plan §5.1's `QuoteView` sketch (`avgPerNight`, `plan`, `currency`) and §6.4's treatment of MIN_NIGHTS as an error don't match the verified live API (`averagePerNight`; no `plan`/`currency`; `available`; MIN_NIGHTS is a valid quote). Fold the corrections back into the plan.
**Owner:** Planning chat. **Feeds:** plan hygiene (code already built to the real shape).
**Status:** ⬜ OPEN
**Answer:**

---

*Engineering-side deferrals that need NO human input (raw_events guardrail-persistence
source, the bare-integer guardrail context-aware fix, the `backedAmounts` price-field
allowlist, the `parseMessage` block-type exhaustiveness guard, and CH-05 test-coverage
gaps) are tracked in `progress.md` under the CH-05 review addendum — they are mine to do
in CH-07, not questions for you.*

---

## E · 🚨 THE ONE THAT MATTERS MOST (found 2026-07-14, CH-11)

### OQ-19 — A guest cannot actually book a specific house. eZee picks it.
**Status:** 🚨 **CONFIRMED BY PAUL 2026-07-14 — he read the website code himself, agrees it is real,
and is fixing it on the website side.** Proven end to end here first. **BLOCKS THE WEBSITE LAUNCH.**
Not a concierge bug — a bug in how eZee is configured, which the concierge merely made visible.

**SCOPE — read this before you act on anything below.** This is a **WEBSITE-ONLY** problem, and
**nothing is reaching a real guest today.**
- **The OTAs are NOT affected.** Airbnb, Booking.com et al. sell only **two products — "villas" and
  "apartments"**, as CATEGORIES. An OTA guest **never chooses a house**, so eZee (or the front desk)
  assigning one is the normal, correct process.
- **Two false alarms were raised and closed the same day.** (a) *"Airbnb bookings cluster 79% on
  Apartment 06, so OTA guests may be getting the wrong apartment TODAY"* — **wrong**; the clustering
  is **apartments blocked for maintenance** (when 09/11 are closed, everything lands on 06).
  (b) *"the front desk reassigns around maintenance, so a stored label goes stale"* — **wrong**;
  Nistula **closes the dates BEFORE** maintenance, so a booked guest is never moved. (A general
  label-refresh is still worth doing one day — Paul parked it for v2.)
- **Both scares came from inferring how the business works out of a data pattern.** The numbers were
  real; the stories built on them were not. This is precisely what the standing rule exists to
  prevent — **ask the business, do not infer it from the mirror.**

**What is true, each step verified:**
1. **eZee is configured as a HOTEL, not a villa company.** Eight houses, but only **three room types**
   ("Nistula Apartment", "Nistula Villa", "Nistula 4BHK Siolim"). So Apartment 06, 09 and 11 are
   **the same bookable product** to eZee — an interchangeable pool, the way a hotel treats Room 204
   and Room 206.
2. **eZee's booking API therefore has no field for a house.** `InsertBooking`'s `Room_Details.Room_1`
   accepts a rate plan, a rate type and a **room TYPE** — and nothing that identifies a physical
   house (docs/ezee/04_bookings.md, BKG-31).
3. **The website drops the guest's choice at that boundary.** Its own read-only audit: the chosen
   house (`villa.id`, which IS the eZee RoomID) *"appears NOWHERE in buildBookingData"*. Nothing
   calls `AssignRoom` afterwards.
4. **eZee then picks a house by itself.** PROVEN LIVE, twice: CH-10's test booking for the
   "Nistula Apartment" type was assigned **Apartment 06**; and reservation **957** (created
   2026-07-14, type-level, 15–17 Mar 2027) was likewise auto-assigned **Apartment 06**
   (BKG-03 returns `RoomID 5220300000000000008` / `RoomName "06"`).
5. **The confirmation page then reads the house back FROM eZee and names it.** So the guest is shown
   **the house eZee picked, not the one they bought.**
6. **The guest's actual choice survives only in the website's own database** — a row no one in eZee
   ever sees.

**What this does to a real guest:** they browse, fall for **Apartment 09**, pay for Apartment 09 —
and their own confirmation screen tells them they have **Apartment 06**. Nobody is lying to them on
purpose. Nobody even knows.

**Nobody has been harmed yet: the website is not live.** Existing bookings (walk-in, OTA) look
correctly spread across all seven active houses, so the front desk is evidently assigning them by
hand inside eZee. **This breaks the moment the site launches.**

**This ONE root cause explains a whole family of problems we have been treating separately:**
- the booking poll carries no room, so the concierge's mirror had **zero** villa labels
- the AI cannot tell an in-house guest which house they are in (§5.4's rule, now enforced in code)
- CH-13's staff task cards cannot say which door to send housekeeping to
- OQ-10 (Siolim's odd "base occupancy 2" for an 8-guest villa) smells like the same hotel-shaped setup
- and now: a confirmation page that names the wrong house

**Owner:** Paul + the eZee account manager (this is a PMS configuration decision, not a code fix)
**and** the website repo. **Feeds:** the website launch · CH-13 task cards · CH-12 pre-arrival copy ·
OQ-15 (now largely answered by this).
**Answer:**

---

## F · CH-12 (lifecycle engine) — 2026-07-14

*All four are BUSINESS questions, so per the standing rule none of them blocked the chunk. Each is
already sitting behind a fail-closed default in the code; the answers make the system **better**,
not **correct**.*

### OQ-20 — May we WhatsApp guests who booked through Airbnb or Booking.com?
**Status:** 🔴 **BLOCKER for the lifecycle engine's real value.** (Same question as team-question Q13,
promoted here because CH-12 made it concrete.)

**What we need to know:** are we permitted — by the platforms' terms and by our own policy — to send
automatic confirmation / pre-arrival / welcome messages to a guest who booked via an OTA?

**Why it matters to a real guest:** we measured production on 14 Jul. Of the 22 bookings arriving
today or later, **12 are Airbnb (8) or Booking.com (4) guests whose real, unmasked phone numbers we
hold.** The comfortable assumption that "OTA numbers are masked so it cannot happen" is **false** —
makemytrip and go-mmt mask them; Airbnb and Booking.com do not. Without a decision, the first thing
this system does in the world is message twelve people nobody authorised us to message.

**What we shipped meanwhile:** `LIFECYCLE_SOURCES`, defaulting to **direct only**
(`Internet Booking Engine,Walk-in`). Every OTA booking is mirrored, but **no OTA guest is messaged**.
The refusal is a decision in code, not an accident of missing data.

**What changes once they answer:** one environment variable. If yes, add the channels to
`LIFECYCLE_SOURCES` and roughly triple the lifecycle's reach.

### OQ-21 — Is everything in eZee a real, paying guest?
**Status:** 🔴 (team-question Q39.)

**What we need to know:** do maintenance blocks, owner stays, or held/test bookings ever appear in
eZee with a phone number attached?

**Why it matters:** the lifecycle sends to whatever phone the booking carries. A maintenance block
with the caretaker's number gets a warm "we look forward to welcoming you".

**What we shipped meanwhile:** `LIFECYCLE_EPOCH` — only bookings mirrored AFTER the cutover instant
get lifecycle at all, so nothing historical can fire; plus the status allowlist (`confirmed` /
`modified` only — an unconfirmed hold is never congratulated).

**What changes once they answer:** if such rows exist, we need a way to recognise them (a rate plan,
a source string, a name convention) and add a fifth gate.

### OQ-22 — What do you do in eZee when a booking changes, and how fast?
**Status:** 🔴 (team-question Q38.) **We have never once seen a `Modify` come down the feed** — the
mirror holds **zero** `modified` rows.

**Why it matters:** if a guest moves their stay from the 20th to the 27th by phone and that never
reaches eZee's connectivity queue, we will send the welcome on the 20th and state the wrong dates.

**What we shipped meanwhile:** the sender re-reads the mirror immediately before every send, so any
change that IS mirrored is always honoured; and a message older than 36 hours is dropped as stale
rather than delivered late and wrong. An un-mirrored change we cannot see.

**What changes once they answer:** if amendments are made in a way that never reaches connectivity,
that is a process fix at the front desk, not a code fix — and it must be fixed before go-live.

### OQ-23 — The pre-arrival now asks every guest for their arrival time. Who sends the pin?
**Status:** 🟡 (extends OQ-12 / team-question Q37.)

**What we need to know:** the canonical location pin per villa — and who is responsible for replying
when a guest sends their arrival time.

**Why it matters:** `kb/faq.md` already promises "share your arrival time and we'll send an accurate
location pin". CH-12 now makes that promise **proactively, to every arriving guest, three days
out** — at scale, on a schedule. **There is no pin anywhere in the knowledge base**, and no staff
task is created when the guest answers (that is CH-13). Today a human must notice the reply.

**What we shipped meanwhile:** the pre-arrival asks for the arrival time and says a person will send
the pin — which is exactly what the FAQ already promises, so nothing is invented. But a promise made
reactively to one guest is not the same as one made automatically to every guest.

**What changes once they answer:** the pin goes into the KB, and CH-13 turns the guest's reply into a
frontdesk task so nobody has to notice it by hand.
