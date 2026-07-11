# Open Questions & Pending Inputs — Nistula Assistance

> ## ⚑ TIMING — dealt with in a FINAL CONTENT PASS, after the last engineering chunk
> **Standing decision (Paul, 2026-07-11):** none of the questions below block any build
> chunk. They are content/data inputs (quirks, real copy, missing fees, facts to confirm)
> that depend on the villa team and the website content being finalised — slow external
> processes. **Every chunk is built with the content available now** (real policies / FAQ /
> occupancy + placeholder villa copy + stubbed quirks), wiring the seam so real answers drop
> in later. The answers here are loaded, the website export re-run, and content-dependent
> acceptance validated in one final pass **before go-live** — NOT as a prerequisite to any
> chunk. (A genuine missing *engineering* decision still stops a session per plan §0; that is
> a different thing from these content inputs.)

> A living register of questions that need a **human answer** — Paul, the villa team,
> or a **planning-chat decision**. Engineering proceeds around these; this file is where
> the answers land so nothing is lost, to be resolved in the final content pass above.
>
> **How to use:** fill the `**Answer:**` line and flip **Status** to ✅ when resolved;
> the relevant chunk then consumes it. The exhaustive raw-gap list from the website
> mine lives in [`nistula-kb-export/GAPS.md`](../nistula-kb-export/GAPS.md) — this file
> holds only the **actionable** decisions/inputs. Pure-engineering deferrals (no human
> input needed) stay in `progress.md`, not here.

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
| OQ-07 | Breakfast included? EP vs CP rate | Paul | CH-06 · get_quote plan default | ⬜ |
| OQ-08 | Bedroom count per villa (apartments = 2BHK?) | Paul | CH-06 · `"2bhk"` resolver alias | ⬜ |
| OQ-09 | Does Siolim have a pool? | Paul | CH-06 | ⬜ |
| OQ-10 | Siolim base occupancy = 2 adults (max 8) — intended? | Paul (eZee setup) | CH-06 · booking sanity | ⬜ |
| OQ-11 | Real per-villa descriptions (site copy is placeholder) | Paul (website) | CH-06 quality | ⬜ |
| OQ-12 | Canonical address + which contact channels to hand out | Paul | CH-06 · escalation copy | ⬜ |
| OQ-13 | Deposit model: §5.1 formula vs website — authoritative? | Planning chat | CH-06 · what the AI says re deposits | ⬜ |
| OQ-14 | Update §5.1 QuoteView + §6.4 MIN_NIGHTS wording to the verified API | Planning chat | plan hygiene | ⬜ |

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
**Why / blocks:** The AI must never state a deposit it can't back; this figure also joins the **guardrail-1 whitelist** so the AI may quote it. The site says only "amount per booking".
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
**Status:** ⬜ OPEN
**Answer:**

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
