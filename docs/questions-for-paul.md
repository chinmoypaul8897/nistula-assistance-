# Questions for Paul — Nistula Assistance

_Prepared 24 July 2026. These are the questions the team should NOT answer — they are about the WhatsApp number itself, about permission, and about who owns what. Answer them here and send the file back._

> ## ⚠️ RENUMBERED 28 Jul 2026 — Q86–Q108 are now P1–P23
> A **Part Two** questions document went to the villa team on 28 Jul numbered **Q86–Q102**, continuing
> the 24 Jul team document's Q1–Q85. That collided head-on with this file's own Q86–Q108, so the
> questions here are renumbered **P1–P23** in their original order (86 → P1 … 108 → P23). **The
> original number is kept in parentheses in every heading**, so any older note citing "Q97" still
> resolves — it is now **P12**.
>
> **This file is the live register for Paul's questions.** Each entry now carries a **Status**:
> - **MOVED TO TEAM** — folded into the team's Part Two and answered there, not here
>   ([`team-questions-part-two.md`](team-questions-part-two.md)).
> - **ANSWERED** — answered 28 Jul by the architect from planning history; recorded, closed.
> - **ANSWERED — PAUL 28 Jul** — Paul's own decision, taken 28 Jul and recorded here. Where it
>   changes code or a Railway variable, the entry says **when** that change lands; recording the
>   decision is NOT the same as shipping it.
> - **OPEN — PAUL** — still Paul's decision. An architect recommendation is coming at Step 5.

**How to use this:** write your answer under each question, on the `**Answer:**` line. If you decide one of these really belongs with the team, change `Owner:` to `team` and I will move it into their document.

★ = we cannot go live without it.

---

## Index

| # | was | Question | Status |
|---|---|---|---|
| P1 | 86 | ★ Whose phone holds the Nistula WhatsApp number today? | MOVED TO TEAM — Part Two Q100 |
| P2 | 87 | ★ Is that the same person who uses it day to day? | MOVED TO TEAM — Part Two Q100 |
| P3 | 88 | Besides guest chats, what else is on that number? | MOVED TO TEAM — Part Two Q100 |
| P4 | 89 | ★ Can that person work through WhatsApp in a computer browser rather than the phone app? | MOVED TO TEAM — Part Two Q100 |
| P5 | 90 | ★ Will that number be used at least once a fortnight? | ANSWERED 28 Jul |
| P6 | 91 | ★ On day one, does the assistant reply on its own, or does a person approve every message? | ANSWERED — PAUL 28 Jul |
| P7 | 92 | ★ If a person approves, who is that person? | ANSWERED — PAUL 28 Jul |
| P8 | 93 | ★ Who is the second approver, for when the first is asleep or busy? | ANSWERED — PAUL 28 Jul |
| P9 | 94 | When somebody sees the assistant get something wrong, how should they report it? | MOVED TO TEAM — Part Two Q101 |
| P10 | 95 | Who at Nistula owns getting a wrong answer corrected? | MOVED TO TEAM — Part Two Q101 |
| P11 | 96 | Who should read the Sunday evening summary of the assistant's replies? | MOVED TO TEAM — Part Two Q101 |
| P12 | 97 | Should our automatic messages also go to guests who booked through Airbnb or Booking.com? (= OQ-20) | ANSWERED — PAUL 28 Jul |
| P13 | 98 | May we keep the conversations already on the number, so a returning guest is remembered? | ANSWERED — PAUL 28 Jul |
| P14 | 99 | Is there anything on that line that must never be read — personal chats, suppliers, owners? | ANSWERED — PAUL 28 Jul |
| P15 | 100 | Roughly how far back do the chats on that phone go? | MOVED TO TEAM — Part Two Q100 |
| P16 | 101 | How long should we keep a guest's messages and the notes about them? | ANSWERED — PAUL 28 Jul |
| P17 | 102 | May the assistant remember an allergy a guest mentions? | ANSWERED — PAUL 28 Jul |
| P18 | 103 | May it remember a religious dietary need, such as jain or halal food? | ANSWERED — PAUL 28 Jul |
| P19 | 104 | May it remember that a guest uses a wheelchair or needs step-free access? | ANSWERED — PAUL 28 Jul |
| P20 | 105 | Beyond those, may it keep anything a guest volunteers about how to look after them? | ANSWERED — PAUL 28 Jul |
| P21 | 106 | Who is Ash? | ANSWERED 28 Jul |
| P22 | 107 | May Ash still change how the assistant speaks? | ANSWERED 28 Jul |
| P23 | 108 | Once the team's corrections come back, who owns the assistant's wording? | ANSWERED 28 Jul |

---

## The WhatsApp number today

### P1 (was 86). ★ Whose phone holds the Nistula WhatsApp number today?

> **Today:** The assistant runs on a separate test number; the real number is untouched.

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q100**. Answered there, not here.

---

### P2 (was 87). ★ Is that the same person who uses it day to day?

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q100**. Answered there, not here.

---

### P3 (was 88). Besides guest chats, what else is on that number?

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q100**. Answered there, not here.

---

### P4 (was 89). ★ Can that person work through WhatsApp in a computer browser rather than the phone app?

> **Today:** The number keeps working normally — staff still reply by hand whenever they want.

1. Yes, that works — they will use the browser
2. No, they need the phone app
3. Move the number to a different person first

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q100**. Answered there, not here.

---

### P5 (was 90). ★ Will that number be used at least once a fortnight?

> **Why:** WhatsApp cuts the assistant off after thirteen quiet days.

`Owner:` paul  _(could reasonably be the team)_

**Status:** ✅ ANSWERED 28 Jul 2026 (architect, from planning history). Was "MOVED TO TEAM — Part Two Q100"; answered here instead, so the team's Q100 answer is corroboration rather than the source.

**Answer:** Yes, comfortably. This is Nistula's **main booking channel**, carrying roughly **10–20 enquiries a day**. The thirteen-quiet-day cutoff is not a practical risk on this line.

**What it settles:** the coexistence keep-alive (CH-18a-2) is a belt-and-braces guard against an unlikely event, not a load-bearing dependency. `COEXISTENCE_ACTIVE` stays off pre-cutover as planned; nothing here changes a variable.

---

## Who approves on day one

### P6 (was 91). ★ On day one, does the assistant reply on its own, or does a person approve every message?

> **Today:** On the test number it replies on its own — that was our choice.

1. A person approves every message at first
2. It replies on its own from day one
3. A person approves for the first ___ weeks
4. A person approves in-stay guests; price enquiries go straight out

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **1**, in its strongest form.

**Answer:** **Day one on the real number runs DRAFTS FOR EVERYTHING.** Not a subset, not presales-excepted — every outbound message waits for a person. In configuration terms that is `AUTO_SEND_TYPES` **empty** and `DRAFT_MODE` **true**.

**Why (Paul's rationale):** the desk catches the wrong messages before a guest sees them, and — the part that matters more — **their edits become the correction signal**. What the desk changes is exactly what the assistant got wrong, in the desk's own words. Those edits are folded back into the prompt and phrasebook at a **weekly review**. Automatic self-learning from the edits stays **future work (F7)**; the loop is human-run for now.

**The plan after day one:** flip **presales** to auto after **one clean week**. The other types follow on the same evidence, one at a time.

**🚨 WHEN THIS LANDS — AT CUTOVER, NOT NOW. Nothing was changed in this session.** Today's test-number production auto-sends everything, which is correct for a test line and must not be "corrected" early: putting a draft queue in front of a line nobody is watching would simply stop every test send.

**⚠️ And there is only ONE lever, not two — worth knowing before cutover.** `DRAFT_MODE` **defaults to `true` in code** ([`src/config.ts:106`](../src/config.ts#L106)) and is unset on Railway, so production is **already** `DRAFT_MODE=true`; the boot summary says so. What makes it auto-send anyway is `AUTO_SEND_TYPES=presales,arrival,instay,poststay`, which **unlocks each type to bypass draft mode**. So at cutover the operative change is **emptying `AUTO_SEND_TYPES`** — setting `DRAFT_MODE=true` alongside it is belt-and-braces and changes nothing on its own. Someone who sets only `DRAFT_MODE=true` and stops will believe they have switched on approvals and will have switched on nothing.

**Open sub-point, for the 2b live test:** what happens to a draft raised **outside desk hours**. Today a draft expires after 30 minutes (`TD-51` in [`defaults-sweep.md`](defaults-sweep.md)), which at 02:00 means the guest gets **silence** and nobody learns. With drafts-for-everything as the day-one posture, that 30-minute expiry stops being a corner case and becomes the **night behaviour of the whole system**. To be resolved by the 2b test, not assumed.

---

### P7 (was 92). ★ If a person approves, who is that person?

> **Today:** Nobody is named; the approver types OK, EDIT or NO.

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026.

**Answer:** The approver is **the front desk team** — the desk as a role, not one named individual. This is deliberate: the desk is already reading the line, and it is the desk's edits that carry the correction signal described in **P6**.

**What still has to be nailed down at cutover:** "the desk" has to resolve to **actual handsets in `STAFF_ROSTER_JSON`**. Today that variable holds one entry (Paul, frontdesk). The real roster comes from the team document's Q1/Q4 — see `TD-34` in [`defaults-sweep.md`](defaults-sweep.md), which records that "the front-desk LEAD" silently means the **first** frontdesk member in roster order.

---

### P8 (was 93). ★ Who is the second approver, for when the first is asleep or busy?

> **Today:** If nobody answers in 30 minutes the guest gets nothing.

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026.

**Answer:** **Paul is the backup approver**, behind the front desk team.

**The residual this does not close:** the "Today" line above is still true — if neither the desk nor Paul answers within 30 minutes, the guest gets **nothing at all**, and no one is told. A backup approver shortens the odds; it does not change the failure mode. That is the same open sub-point recorded under **P6** (drafts raised outside desk hours) and it is for the 2b live test to settle.

---

## When the assistant gets something wrong

### P9 (was 94). When somebody sees the assistant get something wrong, how should they report it?

> **Today:** There is no way to tell us today.

1. To one named person, who tells Paul
2. A small staff WhatsApp group
3. Straight to Paul

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q101**. Answered there, not here.

---

### P10 (was 95). Who at Nistula owns getting a wrong answer corrected?

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q101**. Answered there, not here.

---

### P11 (was 96). Who should read the Sunday evening summary of the assistant's replies?

> **Today:** Nobody has been named to read it.

> **Why:** It is the evidence for letting the assistant reply on its own.

`Owner:` paul  _(could reasonably be the team)_

**Status:** MOVED TO TEAM — Part Two **Q101**. Answered there, not here.

---

## Who we may write to

### P12 (was 97). Should our automatic messages also go to guests who booked through Airbnb or Booking.com?

> **Today:** About 80 such bookings sit with us with real numbers and get nothing.

> **Why:** Airbnb and Booking.com pass on the guest's real mobile number; MakeMyTrip and Goibibo do not.

1. Keep it as it is — direct guests only
2. Include Airbnb and Booking.com guests too
3. Not yet — check the platforms' own rules first

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **2, deferred to cutover** — which is option 3 first, then option 2. Closes **OQ-20** in [`open-questions.md`](open-questions.md) as a decision; the flip itself is a cutover step.

**Answer:** **OTA messaging goes ON — at cutover, not before.** At cutover, `LIFECYCLE_SOURCES` gains the Airbnb and Booking.com source labels alongside the direct ones it carries today.

**Pre-flip checklist — both items before the labels go in:**
1. **Platform-terms check.** Airbnb's and Booking.com's own rules on contacting a guest off-platform. This is the item that can veto the decision.
2. **The team's answer to Part Two Q97.**

> ⚠️ **One thing for the architect to confirm on item 2.** Part Two's **Q97 is the cancellations
> question** ("of the 62 bookings eZee has sent us, 40 are cancellations…"), which is not obviously
> the OTA gate. Part Two carries **no OTA-messaging question at all**; its nearest OTA item is
> **Q91** (whether an eZee amount on an Airbnb booking is what the guest paid or what the platform
> pays us). "Q97" is recorded here exactly as the architect gave it rather than silently swapped,
> because the old **Paul-register Q97 is this very question, now P12** — the same collision that
> forced the P-renumbering. Confirm which is meant before the flip.

**Why this is not a small flip.** The comfortable belief that OTA numbers are masked is **false**: makemytrip and go-mmt mask them, **Airbnb and Booking.com do not**. Production holds real OTA guests with real, unmasked mobile numbers. `LIFECYCLE_SOURCES` being direct-only and fail-closed is the only thing that has stood between them and an unprompted WhatsApp — so adding two labels to one variable is what makes the system **speak first to people who never contacted this number**.

**Exact strings, not invented ones.** The labels are eZee's own `source` values as they arrive in the mirror — observed in production as `Airbnb` and `Booking.com`. Read them off eZee at cutover and match verbatim; a near-miss label fails closed and silently sends nothing, which looks identical to the decision never having been taken. Recorded as `TD-40` in [`defaults-sweep.md`](defaults-sweep.md).

---

## The chats already on that number

### P13 (was 98). May we keep the conversations already on the number, so a returning guest is remembered?

> **Today:** Nothing is imported yet; it is a one-off step at switch-over.

1. Yes, import everything — it is all business
2. No — start clean from day one
3. Import, but move these chats off first

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Effectively option **3**: import, minus the excluded threads.

**Answer:** **Import the guest chats — at cutover.** Threads that Paul or the team name as off-limits are **excluded** (see **P14**). The import is a one-off step at switch-over, run once against the real number's history, and it is what lets a returning guest be remembered rather than greeted as a stranger.

**The guarantee that makes this safe, and it is already in code:** **the import never triggers a send.** Imported history is stored and summarised only; it does not wake the assistant, does not schedule a lifecycle message, and does not cause anybody to be messaged. CH-18b built the coexistence history import on exactly that contract. Nothing about this decision relaxes it — an import that could send would be a different feature with a different risk.

---

### P14 (was 99). Is there anything on that line that must never be read — personal chats, suppliers, owners?

> **Today:** Every chat on that number would be stored and summarised.

> **Why:** Old messages never wake the assistant up or cause it to message anybody.

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026.

**Answer:** **Yes — and those threads are excluded from the import.** Any thread Paul or the team names as off-limits (personal chats, suppliers, owners) is left out; it is not read, not stored, not summarised.

**What this needs at cutover:** the exclusion list has to be **named before the import runs**, because the import is the moment the choice is made. An exclusion decided afterwards is an erasure, not an exclusion — recoverable via `DELETE_GUEST` (see **P16**), but a wholly avoidable one.

---

### P15 (was 100). Roughly how far back do the chats on that phone go?

`Owner:` paul

**Status:** MOVED TO TEAM — Part Two **Q100**. Answered there, not here.

---

### P16 (was 101). How long should we keep a guest's messages and the notes about them?

> **Today:** Nothing expires by itself; off-site copies go after 30 days.

> **Why:** We can erase one guest completely on request; this is about everybody else.

1. Keep it indefinitely
2. Delete ___ years after their last stay

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **1**, with a review date.

**Answer:** **Keep it indefinitely**, with **`DELETE_GUEST` on request** as the release valve — one guest asking is erased completely, everybody else is retained. **Revisit 12 months post-launch.**

**What it settles operationally:** nothing expires by itself, which is what the system already does — so this decision confirms today's behaviour rather than changing it. No scheduled-deletion job is to be built now. The 30-day prune on off-site backups is a **separate** clock and is unaffected.

**The review is the substance of this answer, not a footnote.** "Indefinitely" is defensible at launch scale and gets harder to defend as the corpus grows; the 12-month revisit is when a real retention period gets set against real volume.

---

## What the assistant may remember about a guest

### P17 (was 102). May the assistant remember an allergy a guest mentions?

> **Today:** Anything containing "allergic to" is refused today.

> **Why:** If a guest tells us about a serious allergy and we forget it, they will assume we know next time.

1. Yes — keep it
2. No — pass it to a person each time
3. Do not keep it, but always tell the team beforehand

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **1**. Part of one decision covering **P17–P20**; the send-side rider (`TD-30`) is answered too.

**Answer:** **Yes — keep it, as stated.** An allergy a guest mentions is stored as the guest said it ("allergic to shellfish"). No paraphrase, no softening: an allergy that survives into memory in a vaguer form than the guest gave it is worse than not keeping it.

---

### 🧭 The P17–P20 decision in full (Paul, 28 Jul 2026)

**Remember all three — neutrally.**

| What the guest mentions | What is stored | Form |
|---|---|---|
| An **allergy** (P17) | Yes | **As-is**, in the guest's own terms |
| A **mobility need** (P19) | Yes | **As-is**, in the guest's own terms |
| A **religious dietary** need (P18) | Yes | **Re-expressed as a neutral food preference** — e.g. *"prefers jain vegetarian meals"* — **never as religion** |

**The distinction that carries the whole decision.** What the kitchen needs is the **food**; the guest's **religion** is not ours to record. Storing *"prefers jain vegetarian meals"* gives the kitchen everything it can act on and records nothing about who the guest is. Two facts that look near-identical on a screen are a **different thing to hold** — and only one of them is any of our business.

**Staff task cards are UNCHANGED.** No new screen on the send side. `TD-30` in [`defaults-sweep.md`](defaults-sweep.md) recorded the asymmetry as an open rider — a mobility need broadcast to staff WhatsApp while being refused into durable memory. This decision resolves it **by fixing the memory half**, which was the half that was wrong: the card was always right to carry what the guest asked for.

**🚨 IMPLEMENTATION IS DEFERRED — nothing changed in this session.** [`src/brain/factScreens.ts`](../src/brain/factScreens.ts) stays **exactly as it is** until the architect's **Step-4 batch** ships the change. Today its `SENSITIVE_RES` list still refuses `allerg*`, `wheelchair`, `disab*` and the religious-dietary terms, so the live behaviour is still the old fail-closed refusal. **This register records a decision, not a shipped change** — do not read these four entries as a description of what the code does today.

**What Step-4 has to get right, and it is not a one-line edit:** the sensitive screen is currently one flat list of regexes with a single verdict. This decision needs **three outcomes** where there is now one — pass as-is (allergy, mobility), pass **re-expressed** (religious dietary), still refuse (everything else on the NEVER list: religion as identity, politics, caste, sexuality, and the health terms nobody asked to keep). The re-expression arm is the new shape: it is the first screen that would **transform** a fact rather than admit or refuse it, and a transform that silently drops the guest's meaning is the failure mode to test for.

---

### P18 (was 103). May it remember a religious dietary need, such as jain or halal food?

> **Today:** Jain, halal and kosher are refused as religion; vegetarian and no onion are kept.

1. Yes — keep it
2. No — pass it to a person each time
3. Do not keep it, but always tell the team beforehand

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **1, with a required re-expression**. See [the P17–P20 decision in full](#-the-p17p20-decision-in-full-paul-28-jul-2026).

**Answer:** **Yes — but stored as a neutral food preference, never as religion.** *"prefers jain vegetarian meals"*, not *"is jain"*. Same for halal and kosher: the **meal** is recorded, the **faith** is not.

This is the one arm of the P17–P20 decision that is not simply "keep it". The kitchen gets everything it can act on; nothing about the guest's religion enters our records.

---

### P19 (was 104). May it remember that a guest uses a wheelchair or needs step-free access?

> **Today:** It keeps nothing of the sort today.

1. Yes — keep it
2. No — pass it to a person each time
3. Do not keep it, but always tell the team beforehand

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. Option **1**. See [the P17–P20 decision in full](#-the-p17p20-decision-in-full-paul-28-jul-2026).

**Answer:** **Yes — keep it, as stated.** A wheelchair or a step-free access need is stored in the guest's own terms.

This is the entry where the old behaviour was hardest to defend: the need was **refused into memory** while the same words went out on a staff card anyway (`TD-30`). So the guest had to say it again every time, and we had already told the team.

---

### P20 (was 105). Beyond those, may it keep anything a guest volunteers about how to look after them?

> **Today:** It already keeps plain preferences, such as a liking for an early check-in.

`Owner:` paul

**Status:** ✅ ANSWERED — PAUL, 28 Jul 2026. See [the P17–P20 decision in full](#-the-p17p20-decision-in-full-paul-28-jul-2026).

**Answer:** **Yes — keep what a guest volunteers about how to look after them, recorded neutrally.** The test is the one that runs through all four entries: store **what we would act on**, in plain terms, and not the thing about the guest that explains it.

**Where the line still is.** This widens what may be remembered about *care*; it does not open the NEVER list. Religion as identity, politics, caste and sexuality stay refused, as do the health terms nobody asked us to keep — and no fact may ever carry a rate, a discount or an authority claim, which is a separate screen and untouched by any of this.

---

## Who owns the wording

### P21 (was 106). Who is Ash?

> **Today:** Our voice guide names you and "Ash" as the only two who can change its wording.

`Owner:` paul

**Status:** ✅ ANSWERED 28 Jul 2026 (architect, from planning history).

**Answer:** Ash is Nistula's founder — Paul's partner in the business.

---

### P22 (was 107). May Ash still change how the assistant speaks?

`Owner:` paul

**Status:** ✅ ANSWERED 28 Jul 2026 (architect, from planning history).

**Answer:** No — voice authority is Paul alone; voice guide v1.1 was locked by Paul with Ash explicitly not involved.

---

### P23 (was 108). Once the team's corrections come back, who owns the assistant's wording?

> **Today:** It sits with us by default rather than by decision.

`Owner:` paul

**Status:** ✅ ANSWERED 28 Jul 2026 (architect, from planning history).

**Answer:** Paul owns the assistant's wording, by decision not default.

---
