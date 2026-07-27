# Questions for the Nistula team

> **28 Jul:** a Part Two (Q86–Q102) went to the team — see [`docs/team-questions-part-two.md`](team-questions-part-two.md). Several owner-section questions were superseded or moved; [`docs/questions-for-paul.md`](questions-for-paul.md) (now P-numbered) is the live register for Paul's.

> **Generated 2026-07-13** by sweeping the entire codebase, plan, knowledge base and build log for every place we had to make a decision about the business *without being told the answer.*

## Please read this first

**Nothing here is broken, and nothing is waiting on you to work.** The assistant is live and honest today. Wherever we did not know the real rule, we deliberately built it to **refuse, defer, or fetch a human** rather than invent an answer — so it never guesses into a guest’s face. It says "let me bring the team in" a lot, and every time it does, that is a question on this list.

**So these answers make the assistant *better*, not *correct*.** You are not unblocking us. You are turning a careful assistant that keeps escalating into one that actually knows your business.

For each question you will find four things:

- **The question** — in plain English. No jargon.
- **Why it matters** — what happens to a *real guest* if we guess.
- **What we built meanwhile** — so you know nothing is on fire while you think.
- **What changes when you answer** — so you know why it is worth your time.

**78 questions. 31 are marked 🔴 — those must be answered before the assistant goes live on the real WhatsApp number.** The rest can follow.

---

## 🚨 Read this one first — it is not a question, it is a defect, and it blocks the website launch

*(Found 2026-07-14. Filed as OQ-19. It is different in kind from everything below: the rest of this document is us asking what your rule is. This one is us telling you that the booking system is set up in a way that will hand guests the wrong house.)*

**A guest cannot actually book a specific house. eZee picks one for them — and it picks the same one nearly every time.**

Here is what we found. In eZee, our 8 houses are not 8 bookable things. They are grouped into **3 "room types"** — so Apartment 06, Apartment 09 and Apartment 11 are, as far as eZee is concerned, *the same product*. When the website sends a booking to eZee, there is **no field in which to say which house the guest chose** — the booking form has nowhere to put it. So the guest's choice is dropped at that boundary, and **eZee assigns a house itself, lowest number first.** We proved it with two real test bookings: both said "Nistula Apartment", and eZee put both of them in **Apartment 06**.

**Then it gets worse.** The website's confirmation page does not show the guest the house they picked. It reads the house back *from eZee* — and prints eZee's pick.

**So a guest can choose Apartment 09, pay for Apartment 09, and be shown a confirmation that says Apartment 06.** Nobody has been hurt yet, because the website is not launched. If it launches like this, they will be.

**Why it matters.** It is the kind of error a guest only discovers on arrival, standing at the wrong door with luggage — and every part of it is in our own voice, on our own confirmation page. It also silently blocks work downstream: the staff task cards (housekeeping, maintenance) were going to be routed on the house eZee recorded, which would send our own team to the wrong villa.

**What we built meanwhile.** The assistant is safe. It will **never name a specific house** to a guest — not the one eZee recorded, and not even one the guest names first. It speaks about "your villa in Assagao" and fetches a person for anything house-specific. We verified this against the live system: the production database says the test guest is in "Apartment 06", and the assistant still refused to say so. That refusal is enforced in code, not merely asked of the AI.

**What needs to happen — and it is not an engineering fix.** No amount of code can fix this: none of eZee's ~92 API endpoints can create a room type. **It has to be done in eZee's back office, by the account manager: make each house its own bookable product — one house = one room type.** Siolim is already set up that way, and Siolim is the one house eZee never gets wrong.

**The cost, honestly:** rates and availability would then be maintained per house rather than per group — roughly 2.5× the recurring rate admin. The OTA channel mappings (Airbnb, Booking.com) would have to be remapped, and **that step has no undo**, so it needs planning rather than a quick afternoon.

**Good news, and worth saying plainly: this does NOT affect Airbnb, Booking.com or any other OTA.** Those channels sell only two products — "villas" and "apartments" — as categories, so an OTA guest never picks a specific house in the first place. eZee or the front desk choosing one for them is simply the normal process, not an error. **No OTA guest is getting the wrong house.** (We briefly suspected otherwise, because Airbnb bookings cluster heavily on Apartment 06 — that turned out to be the maintenance closures, not a bug.)

**This is a website problem, and only a website problem.** Paul has confirmed it in the website code and is fixing it there. Nothing is reaching a real guest today.

---

## The five that worry me most

If you read nothing else, read these. They are the ones where the honest default we shipped is *itself* a problem.

### Night cover and emergencies

When a guest in one of our villas has a real problem at 2 am — no power, no water, locked out, a medical problem, a gas smell, a leak flooding a bedroom — what actually happens today? Is there anybody reachable at night: a caretaker on site, a security guard, a manager on call? Which villas have someone nearby, what number should a guest be told to ring, and what kinds of problem would you want somebody woken up for?

**Why it matters.** This is the one that could genuinely hurt someone. Today the assistant treats a smoke alarm exactly like a broken kettle: after 8 pm it politely tells the guest that the team is off duty and will reply first thing after 10 am. It has no emergency number it is allowed to give out, nobody to page, and no way to go faster. A guest with a real emergency is told, in our own warm voice, to wait until morning — which is the worst thing this system could do to a real person.

### Who gets paged when the assistant fetches a human — and in what order

When the assistant decides a guest needs a person — an unhappy guest, someone asking to speak to a human, a booking it cannot safely describe — whose phone should light up? Please give us the actual WhatsApp numbers. Who covers evenings, nights and days off? If nobody picks up in ten minutes, who is told next, and at what point does someone stop messaging and pick up a phone and call?

**Why it matters.** The assistant already tells guests 'bringing the front desk in now — they have the full picture already', and it is built so it may only say that after it has genuinely paged someone. Today the list of numbers is empty, so the page goes into a log file on a server and nowhere else. Every one of those is a comfortable untruth told to a real guest. It is the single most dishonest thing the system can currently do.

### Day one: does the assistant reply on its own, or does a person approve every message?

On the first day on the real WhatsApp number, do you want the assistant answering guests automatically, or writing drafts that a human approves for the first week or two? If drafts: who approves them, on which phone, how quickly — including at 11 pm? And what would you need to see before you would let it answer certain kinds of question (say, simple price enquiries) on its own?

**Why it matters.** Our flagship promise is the midnight enquiry: a guest asks at 23:42 and gets an exact price in seconds. That is impossible while every reply waits for a human approval, because the approver is asleep — and as designed, a draft nobody approves within thirty minutes means the guest gets NOTHING at all, which is worse than today. Equally, switching everything on automatically on day one is the opposite risk. Nobody has ever made this a business decision, so the launch posture would be decided by accident.

### How do we switch it off in a hurry?

If the assistant says something wrong or embarrassing to a guest at 2 am, how does a non-technical person switch it off — right then, for every conversation? Who is allowed to do that, and what exactly do they do?

**Why it matters.** There is currently no answer. A staff member will be able to pause it on one chat, but there is no way for the front desk to stop it everywhere without a developer redeploying the software. In a real incident — a guest screenshotting a bad reply — minutes matter, and 'wait for Paul to wake up' is not an incident response.

### Allergies and dietary needs — do we write them down, or refuse to?

If a guest tells us they are allergic to shellfish or nuts, or that they are diabetic, or that they eat only jain, halal or kosher food — do you want that kept on their file so the villa team and whoever cooks or shops can see it? Or should we refuse to record it and pass it to a person every single time it is mentioned?

**Why it matters.** Today a guest who writes 'my wife has a severe nut allergy, please make sure the kitchen knows' is told, in writing, that we do not store health details. A human is alerted in that moment, but nothing is remembered — so on the next stay nobody knows. If a hamper or a chef ever serves that guest nuts, our own message trail shows we were told and chose not to record it. There is also an odd seam: 'we're vegetarian' is remembered, 'we eat jain food' is silently forgotten, because the second one reveals religion.

---

## Everything, by who can answer it

| # | Question | Who | Priority |
|---|---|---|---|
| Q1 | Night cover and emergencies | Paul (owner) | 🔴 |
| Q2 | Who gets paged when the assistant fetches a human — and in what order | Paul (owner) | 🔴 |
| Q3 | Day one: does the assistant reply on its own, or does a person approve every message? | Paul (owner) | 🔴 |
| Q4 | How do we switch it off in a hurry? | Paul (owner) | 🔴 |
| Q5 | Allergies and dietary needs — do we write them down, or refuse to? | Paul (owner) | 🔴 |
| Q6 | Is the price on the website genuinely the last rupee a guest pays? | Paul (owner) | 🔴 |
| Q7 | Extra adults and children — how are they really charged, and is it on top of the quoted price? | Paul (owner) | 🔴 |
| Q8 | What does a guest pay to confirm a booking — and how may they pay it? | Paul (owner) | 🔴 |
| Q9 | The refundable security deposit — what is it, when is it taken, when is it returned? | Paul (owner) | 🔴 |
| Q10 | Which dates are 'peak' or 'festive', and what changes on them? | Paul (owner) | 🔴 |
| Q11 | Is there anyone we do not accept? | Paul (owner) | 🔴 |
| Q12 | Celebrations — what may we actually say yes to? | Paul (owner) | 🔴 |
| Q13 | Are we allowed to WhatsApp guests who booked through Airbnb or Booking.com? | Paul (owner) | 🔴 |
| Q14 | What is the real booking mix — and who types a direct booking into eZee? | Paul (owner) | 🔴 |
| Q15 | Do we ever close a booking in the chat itself? | Paul (owner) | 🔴 |
| Q16 | Meta business verification and the WhatsApp provider contract | Paul (owner) | 🔴 |
| Q17 | Whose phone holds the WhatsApp number, and can the team change how they work? | Paul (owner) | 🔴 |
| Q18 | Does anyone ever quote a price below the website? | Paul (owner) | 🟡 |
| Q19 | May we message past guests with offers — and has anyone ever agreed to that? | Paul (owner) | 🟡 |
| Q20 | Please read the exact cancellation sentences the assistant will say | Paul (owner) | 🟡 |
| Q21 | Pets — which homes take them, and what does it cost? | Paul (owner) | 🟡 |
| Q22 | What is the late check-out charge? | Paul (owner) | 🟡 |
| Q23 | Is there a minimum stay, and does it change by season? | Paul (owner) | 🟡 |
| Q24 | May the assistant ever tell a guest what they paid, or what is still owed? | Paul (owner) | 🟡 |
| Q25 | Cancelled bookings — may the assistant talk about them? | Paul (owner) | 🟡 |
| Q26 | Someone says 'I have a booking' and we cannot find it — what should we do? | Paul (owner) | 🟡 |
| Q27 | Messages that are not from guests at all | Paul (owner) | 🟡 |
| Q28 | Where should we send guests to eat and drink? | Paul (owner) | 🟡 |
| Q29 | One correct address, and which contact details the assistant may hand out | Paul (owner) | 🟡 |
| Q30 | Two odd settings in eZee worth a look | Paul (owner) | 🟡 |
| Q31 | How long may we keep a guest's messages and memories — and may we import the old chats? | Paul (owner) | 🟡 |
| Q32 | Who reads the reports the system produces? | Paul (owner) | 🟡 |
| Q33 | What may we spend a day on the AI itself? | Paul (owner) | ⚪ |
| Q34 | When is it decided which actual house a guest gets? | front desk | 🔴 |
| Q35 | Can the guest's real WhatsApp number go onto an OTA booking in eZee? | front desk | 🔴 |
| Q36 | What actually happens when a guest arrives? | front desk | 🔴 |
| Q37 | May we hold and send a location pin for each villa? | front desk | 🔴 |
| Q38 | When a booking changes, what do you do in eZee — and how quickly? | front desk | 🔴 |
| Q39 | Is everything in eZee a real, paying guest? | front desk | 🔴 |
| Q40 | The staff roster: who, what number, which villas | front desk | 🔴 |
| Q41 | What may the assistant say yes to on its own? | front desk | 🔴 |
| Q42 | Do you mark guests as arrived and departed in eZee? | front desk | 🟡 |
| Q43 | Do you ever put one group into several villas on a single booking? | front desk | 🟡 |
| Q44 | What booking reference does a guest actually have in their hand? | front desk | 🟡 |
| Q45 | What is an 'unconfirmed' booking in eZee? | front desk | 🟡 |
| Q46 | The real hours, and what 'shortly' actually means | front desk | 🟡 |
| Q47 | What words do your guests actually use when they complain? | front desk | 🟡 |
| Q48 | Cancellations and date changes — who does them, how fast, what may we promise? | front desk | 🟡 |
| Q49 | When a person takes over a chat, how long should the assistant stay out of the way? | front desk | 🟡 |
| Q50 | Who watches the eZee screen — and would they act on an alert? | front desk | 🟡 |
| Q51 | Photos and voice notes — should each one become a job for the desk? | front desk | 🟡 |
| Q52 | 'Call me' — does anyone ever ring back? | front desk | 🟡 |
| Q53 | Who is allowed to say a job is finished? | front desk | 🟡 |
| Q54 | Every staff phone must message the line once before go-live | front desk | 🟡 |
| Q55 | Would you rather have every alert, or a digest? | front desk | 🟡 |
| Q56 | Five small questions guests ask that we cannot answer | front desk | ⚪ |
| Q57 | Two numbers we simply guessed | front desk | ⚪ |
| Q58 | How does a genuinely confused guest get unlocked? | front desk | ⚪ |
| Q59 | The real notes for each house (and please delete our two invented ones) | villa team | 🔴 |
| Q60 | The house manual — Wi-Fi, the geyser, the pool, a power cut | villa team | 🔴 |
| Q61 | Is the amenity list on the villa pages actually true? | villa team | 🔴 |
| Q62 | The basic facts of each house: bedrooms, beds, bathrooms, how many people | villa team | 🔴 |
| Q63 | Can the housekeeping and maintenance staff actually use this? | villa team | 🔴 |
| Q64 | The pools | villa team | 🟡 |
| Q65 | How far is the airport, the beach, the town? | villa team | 🟡 |
| Q66 | Can anyone who cannot manage stairs stay with us? | villa team | 🟡 |
| Q67 | What is the housekeeping schedule, in plain words? | villa team | 🟡 |
| Q68 | What can we genuinely arrange, and what does it cost? | villa team | 🟡 |
| Q69 | How long do things actually take? | villa team | 🟡 |
| Q70 | Is the villa really ready at 9 am on arrival day? | villa team | 🟡 |
| Q71 | Are these still the eight homes, with these names? | villa team | 🟡 |
| Q72 | How big is each home? | villa team | ⚪ |
| Q73 | The website has an unprotected page that creates real bookings | website | 🔴 |
| Q74 | The 'from ₹X' prices on the villa pages are placeholders | website | 🟡 |
| Q75 | The villa descriptions on the site are filler | website | 🟡 |
| Q76 | Four villas are shown using another villa's photographs | website | 🟡 |
| Q77 | The 'Breakfast' chip on the villa pages contradicts our own terms | website | 🟡 |
| Q78 | Several people on the website are not real | website | 🟡 |

---

## Paul (owner) — 33 questions (17 🔴)

> Decisions only the owner can make — money, policy, launch posture, and who has authority.

### Q1. Night cover and emergencies

**🔴 BLOCKER for go-live**

**The question.** When a guest in one of our villas has a real problem at 2 am — no power, no water, locked out, a medical problem, a gas smell, a leak flooding a bedroom — what actually happens today? Is there anybody reachable at night: a caretaker on site, a security guard, a manager on call? Which villas have someone nearby, what number should a guest be told to ring, and what kinds of problem would you want somebody woken up for?

**Why it matters.** This is the one that could genuinely hurt someone. Today the assistant treats a smoke alarm exactly like a broken kettle: after 8 pm it politely tells the guest that the team is off duty and will reply first thing after 10 am. It has no emergency number it is allowed to give out, nobody to page, and no way to go faster. A guest with a real emergency is told, in our own warm voice, to wait until morning — which is the worst thing this system could do to a real person.

**What we built meanwhile.** A hard night window of 20:00–10:00 IST is baked into the defaults. Outside it the assistant says the front desk is off duty and promises a reply after 10 am. There is no emergency category anywhere in the system — no word list, no separate route, no out-of-hours contact, and no on-site-person concept at all.

**What changes when you answer.** We build a deterministic emergency path that fires before the AI even thinks: recognised emergency wording, the real number given to the guest immediately, a plain 'we are ringing someone now', and the on-call person paged on every channel we have. It cannot be talked out of firing. None of it can be started until someone tells us who that person is and what qualifies.

<sub>Answer: _______________________________________________</sub>

---

### Q2. Who gets paged when the assistant fetches a human — and in what order

**🔴 BLOCKER for go-live**

**The question.** When the assistant decides a guest needs a person — an unhappy guest, someone asking to speak to a human, a booking it cannot safely describe — whose phone should light up? Please give us the actual WhatsApp numbers. Who covers evenings, nights and days off? If nobody picks up in ten minutes, who is told next, and at what point does someone stop messaging and pick up a phone and call?

**Why it matters.** The assistant already tells guests 'bringing the front desk in now — they have the full picture already', and it is built so it may only say that after it has genuinely paged someone. Today the list of numbers is empty, so the page goes into a log file on a server and nowhere else. Every one of those is a comfortable untruth told to a real guest. It is the single most dishonest thing the system can currently do.

**What we built meanwhile.** Fail-closed: with no numbers configured, the escalation loop has nobody to send to and simply writes a log line. The escalation ladder we designed (front desk now, re-ping at 10 minutes, ops at 20 minutes, all over WhatsApp) was invented by us and points at nobody.

**What changes when you answer.** We add the numbers and every escalation lands as a WhatsApp card on a real phone within seconds — a one-line change with an enormous consequence. The ladder and the timings get rewritten to match the real chain of command, and we learn where WhatsApp's reach ends and a phone call must begin.

<sub>Answer: _______________________________________________</sub>

---

### Q3. Day one: does the assistant reply on its own, or does a person approve every message?

**🔴 BLOCKER for go-live**

**The question.** On the first day on the real WhatsApp number, do you want the assistant answering guests automatically, or writing drafts that a human approves for the first week or two? If drafts: who approves them, on which phone, how quickly — including at 11 pm? And what would you need to see before you would let it answer certain kinds of question (say, simple price enquiries) on its own?

**Why it matters.** Our flagship promise is the midnight enquiry: a guest asks at 23:42 and gets an exact price in seconds. That is impossible while every reply waits for a human approval, because the approver is asleep — and as designed, a draft nobody approves within thirty minutes means the guest gets NOTHING at all, which is worse than today. Equally, switching everything on automatically on day one is the opposite risk. Nobody has ever made this a business decision, so the launch posture would be decided by accident.

**What we built meanwhile.** Draft mode is ON by default and the automatic-send list is empty, so nothing is ever sent to a guest without a human. (Separately, conversations are not paused by default, so once auto-send is switched on the assistant would answer everything.) No approver has been named and no quality bar defined.

**What changes when you answer.** We name the approvers, agree what the assistant may answer unattended (probably pre-sales price answers first), and set a review period after which more is unlocked. Without this, go-live makes the front desk slower, not faster. The thirty-minute draft expiry in particular should not survive contact with a real midnight enquiry unchanged.

<sub>Answer: _______________________________________________</sub>

---

### Q4. How do we switch it off in a hurry?

**🔴 BLOCKER for go-live**

**The question.** If the assistant says something wrong or embarrassing to a guest at 2 am, how does a non-technical person switch it off — right then, for every conversation? Who is allowed to do that, and what exactly do they do?

**Why it matters.** There is currently no answer. A staff member will be able to pause it on one chat, but there is no way for the front desk to stop it everywhere without a developer redeploying the software. In a real incident — a guest screenshotting a bad reply — minutes matter, and 'wait for Paul to wake up' is not an incident response.

**What we built meanwhile.** Nothing. Draft mode and the per-conversation pause are the only brakes, and draft mode is a developer setting, not a switch anyone can flip from a phone.

**What changes when you answer.** We build a global stop that a named person can trigger from WhatsApp — one word from an approved number pauses every conversation — and we write down who may pull it and what happens next.

<sub>Answer: _______________________________________________</sub>

---

### Q5. Allergies and dietary needs — do we write them down, or refuse to?

**🔴 BLOCKER for go-live**

**The question.** If a guest tells us they are allergic to shellfish or nuts, or that they are diabetic, or that they eat only jain, halal or kosher food — do you want that kept on their file so the villa team and whoever cooks or shops can see it? Or should we refuse to record it and pass it to a person every single time it is mentioned?

**Why it matters.** Today a guest who writes 'my wife has a severe nut allergy, please make sure the kitchen knows' is told, in writing, that we do not store health details. A human is alerted in that moment, but nothing is remembered — so on the next stay nobody knows. If a hamper or a chef ever serves that guest nuts, our own message trail shows we were told and chose not to record it. There is also an odd seam: 'we're vegetarian' is remembered, 'we eat jain food' is silently forgotten, because the second one reveals religion.

**What we built meanwhile.** A hard, code-level refusal on anything health-related and on religious-dietary terms. Nothing is written to the guest's file, the conversation is escalated to a human, and the assistant is forbidden from claiming it was noted. Verified live in production: an 'I am diabetic' test stored zero rows and replied that we won't store health details but would bring the team in. Plain preferences (vegetarian, no onion) do get saved.

**What changes when you answer.** If you want allergies and dietary needs recorded, we add a narrow, explicit exception and route it to a staff task so the kitchen actually sees it. If you do not, we keep the refusal but rewrite the wording so the guest is clearly told to tell the team directly — because right now they may walk away thinking we noted it. Doing nothing is not safe. This must be decided before we wire any food-related staff tasks.

<sub>Answer: _______________________________________________</sub>

---

### Q6. Is the price on the website genuinely the last rupee a guest pays?

**🔴 BLOCKER for go-live**

**The question.** Between a guest seeing a price on the villa page and finishing payment, is anything added — a payment-gateway or convenience fee, a refundable deposit, a cleaning fee, a statutory levy, anything at all?

**Why it matters.** The assistant is scripted to say, word for word, that our rate is 'genuinely all-inclusive: taxes, housekeeping, the lot' — and it says it in the exact message where it refuses to discount, i.e. where it is claiming total honesty. If the checkout page then adds even ₹200, the assistant has told a factual lie about money at the worst possible moment, at scale, from day one. Our own policy page separately says gateway charges and statutory levies 'may apply', so the two contradict each other today.

**What we built meanwhile.** Both ship: the all-inclusive line is hardcoded as the approved answer to any discount ask, and the 'fees may apply' caveat sits in the policy knowledge alongside it. Every rupee the assistant states comes verbatim from the live website quote, so it is truthful about the number — but the claim about what it includes has never been checked against the checkout.

**What changes when you answer.** If anything is added at checkout, that line must be reworded before go-live ('all taxes included; a refundable deposit is taken separately'). If nothing is added, we keep the line and delete the caveat, and the brand's central promise stops carrying a contradiction.

<sub>Answer: _______________________________________________</sub>

---

### Q7. Extra adults and children — how are they really charged, and is it on top of the quoted price?

**🔴 BLOCKER for go-live**

**The question.** Two things in one. (a) When our live price is quoted for, say, six adults in a villa, does that price already include the extra-adult charges, or does the guest pay ₹1,500 per extra adult per night on top of it at the villa? (b) When is a child free and when is it ₹750? Our policy says both 'up to two children under 12 may share a bedroom at no charge' AND 'extra child under 12 is ₹750 per night'. What about a baby under two — free? Is a cot provided?

**Why it matters.** 'We're two adults and three kids — what will it cost?' is the most ordinary question a villa company gets, and it is about money. The assistant is allowed to state ₹1,500 and ₹750 from the published policy, and separately quotes the live all-inclusive price — and nobody has ever reconciled the two. If the live price already covers the headcount, the assistant has just invented a second charge in the guest's head. If it does not, a guest told 'the price you see is final' gets a surprise bill at check-in. Either way we look dishonest on the one thing the brand promises hardest.

**What we built meanwhile.** Both facts ship independently and the contradiction ships with them. The assistant cannot do the sum (it is forbidden from computing money), so it will either defer or state one of the two child rules and risk getting it wrong.

**What changes when you answer.** We rewrite the extra-guest paragraph as one unambiguous sentence, add the infant/cot rule, and either stop the assistant quoting extra-guest fees when a quote already covers the headcount or teach it to say plainly 'that is on top of the quoted rate'. A one-sentence answer that closes a real money hole and fixes the most common family enquiry in the business.

<sub>Answer: _______________________________________________</sub>

---

### Q8. What does a guest pay to confirm a booking — and how may they pay it?

**🔴 BLOCKER for go-live** · already on file as OQ-13

**The question.** To confirm a direct booking, how much does a guest pay up front: the full stay, a percentage, one night? Our policy says 'a booking deposit, based on the room rate for the nights booked', which a guest will read as 'the whole thing'. And what payment methods do we accept — is it card-only through Razorpay, or can they pay by UPI, bank transfer, or cash on arrival?

**Why it matters.** 'How much do I pay now?' and 'can I just UPI you?' are the last two questions before someone books, and the assistant can answer neither — so it hands the sale to a human at the final step. It also cannot explain the cancellation policy properly, because every cancellation rule is expressed as a percentage OF THE ADVANCE: if the advance is the whole stay, then 'within 7 days the full advance is charged' means the guest loses everything, and we should say so plainly rather than let them find out.

**What we built meanwhile.** The website's vague wording ships as-is. The assistant states no figure and no percentage, mentions only that payments are handled by Razorpay, and defers on the amount and on any other payment method.

**What changes when you answer.** One sentence in the policy knowledge ('we take X% to confirm, the balance at Y; we accept A, B and C') turns a stalling answer into a closing answer at the exact moment a lead decides, and lets the assistant state the cancellation consequences honestly.

<sub>Answer: _______________________________________________</sub>

---

### Q9. The refundable security deposit — what is it, when is it taken, when is it returned?

**🔴 BLOCKER for go-live** · already on file as OQ-04

**The question.** What is the refundable security deposit: a flat rupee figure, a formula based on the nightly rate, or genuinely decided per booking? Is it taken before arrival or at check-in? And how long after check-out does a guest actually get it back? (Our own project plan carries a formula — roughly the nightly rate rounded up, capped at ₹10,000, returned within 48 hours — that appears nowhere on the live website, which says only 'amount confirmed per booking'.)

**Why it matters.** This is one of the three most common pre-booking questions there is, and the assistant is hard-forbidden from answering it — every single deposit question fetches a human. That is a machine handing the most routine money question straight back to the front desk, and it makes us look like we are hiding something. Worse, two of our own documents contradict each other, so if we had guessed we would be quoting a deposit the guest is never actually charged. 'Where is my deposit?' is also the most-chased post-stay message any villa company gets, and we cannot answer that either.

**What we built meanwhile.** Fail-closed refusal. The policy knowledge says no fixed figure is published; the assistant's rules carry a literal hard line — 'Never state a deposit amount: none is published, so bring the team in for the exact figure' — and it escalates every time. The plan's formula is implemented nowhere.

**What changes when you answer.** Please note this is NOT a one-line edit — three things must change together or the assistant keeps refusing while the figure sits unused: the figure goes into the policy file written with the ₹ symbol in a sentence that names it as a security deposit (our money guard is bound to those exact words), the hardcoded refusal comes out of the assistant's rules, and the knowledge is rebuilt. Then it answers deposits instantly. If the honest answer is 'it really is per booking', we keep exactly what we shipped and close this permanently — that costs nothing and is a perfectly good answer.

<sub>Answer: _______________________________________________</sub>

---

### Q10. Which dates are 'peak' or 'festive', and what changes on them?

**🔴 BLOCKER for go-live**

**The question.** Our cancellation policy says peak season, long weekends, festival dates and special rates 'may carry stricter terms' — but never says which dates those are. We know 22 December to 2 January is non-refundable. Is that the whole list, or are there others (Diwali, New Year, Christmas, long weekends)? And what exactly changes: fully non-refundable, or a different refund ladder?

**Why it matters.** A guest books for Diwali and asks 'can I cancel if plans change?'. The assistant will confidently recite the standard policy — full refund fifteen days out — because that is all it knows. If those dates were actually non-refundable, we have just given a guest a written promise of a refund we will then refuse. That is a real dispute, in writing, on WhatsApp, that we would lose.

**What we built meanwhile.** The general cancellation ladder, the literal 22 Dec–2 Jan carve-out, and the vague 'may carry stricter terms' sentence all ship. With no date list, the assistant applies the general rule to every other date it is asked about.

**What changes when you answer.** Give us the date ranges and their terms and the assistant answers those dates correctly — or, if you prefer, we teach it to hand every peak-date cancellation question straight to a human rather than guessing the friendly answer.

<sub>Answer: _______________________________________________</sub>

---

### Q11. Is there anyone we do not accept?

**🔴 BLOCKER for go-live**

**The question.** Do we take all-male groups, unmarried couples, or guests with local Goan ID? Many Goa villas quietly do not. If Nistula has any such rule — written or unwritten — the assistant needs to know it.

**Why it matters.** A group of six friends asks 'is that fine?' and the assistant, knowing no rule, says yes and helps them book. If the villa team then turns them away at the door, we have taken their money and humiliated them on the basis of a policy the assistant was never told. This rule exists in this market and nobody has told us whether it exists here.

**What we built meanwhile.** Nothing. There is no guest-eligibility rule of any kind in the assistant's knowledge. It treats every enquiry as welcome.

**What changes when you answer.** If a rule exists it goes into the policy knowledge and the assistant applies it kindly and early, before anyone pays. If no rule exists, we record that explicitly so it never becomes a surprise later.

<sub>Answer: _______________________________________________</sub>

---

### Q12. Celebrations — what may we actually say yes to?

**🔴 BLOCKER for go-live**

**The question.** Our policy bans parties, events, loud music and DJ setups without written approval. But what IS approvable: a birthday dinner for fifteen? A cake and a speaker until 11 pm? A proposal set-up? Who approves it, how much notice do they need, and is there a fee or a larger deposit?

**Why it matters.** Half of Goa villa demand is a celebration. Our own approved script has the assistant promise a guest 'a long, loud dinner with your people, though — that we'll happily arrange', and our acceptance script has it tell someone planning a proposal that 'our villa team will design this personally'. We wrote both of those. Our own policy does not authorise either. So the assistant can say yes to a group who then get shut down by a neighbour or the villa team — or promise décor for the most important evening of someone's life that we may not actually provide.

**What we built meanwhile.** The ban ships in the policy knowledge and the celebration promise ships in the locked voice guide as an approved line. They contradict each other, and the assistant may use either.

**What changes when you answer.** We define what is approvable and on what terms. The assistant can then either sell a celebration properly — a genuine revenue line — or decline it honestly and early, instead of the current worst option: promising vaguely and disappointing later.

<sub>Answer: _______________________________________________</sub>

---

### Q13. Are we allowed to WhatsApp guests who booked through Airbnb or Booking.com?

**🔴 BLOCKER for go-live**

**The question.** Under Airbnb's and Booking.com's rules — and in the guest's own eyes — may we message a guest who booked through those platforms on WhatsApp, with confirmations, pre-arrival notes and welcome messages? Do you already do this by hand today?

**Why it matters.** Every booking that reaches our system, from any channel, would trigger automatic confirmation, pre-arrival and welcome messages. An Airbnb guest who never gave us their number and never agreed to be contacted off-platform would suddenly start receiving WhatsApp messages from us. That risks the OTA account itself, quite apart from what the guest thinks. Right now the only thing stopping it is an accident of data — the platform masking the phone number — not a decision.

**What we built meanwhile.** No channel distinction at all. The lifecycle messages are not built yet, but as designed they would treat an OTA booking exactly like a direct one.

**What changes when you answer.** If OTA guests are off limits (or limited to in-stay help only), we filter the automatic messages by booking source before anything sends. A small change with a very large downside if we get it wrong.

<sub>Answer: _______________________________________________</sub>

---

### Q14. What is the real booking mix — and who types a direct booking into eZee?

**🔴 BLOCKER for go-live**

**The question.** When someone books directly with you, on WhatsApp or the phone, who enters it into eZee, how soon, and under what source? In everything eZee has sent us so far (62 bookings) we saw only Airbnb, Booking.com, MakeMyTrip, go-mmt and Walk-in — no direct or website bookings at all. Roughly what share of your bookings really is direct, and does the guest's WhatsApp number get recorded on the booking?

**Why it matters.** This project is premised on 'about 60% of bookings are direct on one WhatsApp number'. The actual booking data does not look like that. If a direct booking is never entered into eZee — or entered days later, or as 'Walk-in' with no phone number — the assistant simply will not know that guest has a booking, and will treat your best and most loyal customers as fresh enquiries. It also changes what this assistant is FOR: selling to new leads, or looking after OTA guests already in the house.

**What we built meanwhile.** Nothing. eZee is taken as the complete record; anything not in eZee does not exist to the assistant. (Website bookings DO reach us — we proved it end to end — so the gap, if there is one, is in how phone and WhatsApp bookings get entered.)

**What changes when you answer.** If direct bookings are entered late or not at all, we need one small process change — enter it at the time, with the guest's WhatsApp number. That single habit is what makes the assistant recognise a direct guest. If the mix is genuinely OTA-heavy, we would reprioritise the in-stay experience over the pre-sales pitch.

<sub>Answer: _______________________________________________</sub>

---

### Q15. Do we ever close a booking in the chat itself?

**🔴 BLOCKER for go-live**

**The question.** When the front desk closes a direct booking on WhatsApp today, what do they actually do? Do they ever hold dates overnight for a guest, take a bank transfer or UPI payment, or send a payment link by hand? And what should the assistant do when a guest says 'hold it for me till tomorrow' or 'I'll transfer the money to your account tonight'?

**Why it matters.** We may have got the core of the sales journey exactly backwards. The assistant is built to say 'the website is the booking desk — we never take payment in chat' and send a link. If holding dates and taking transfers is how the desk actually converts most of its business, then the assistant is refusing to do the thing that brings in the revenue, and guests who are used to being looked after in chat get bounced to a website.

**What we built meanwhile.** A hard rule in the assistant's knowledge: booking happens on the website, we never take payment in chat, share the link. It cannot hold, block, or accept money in any form, and a request to do so is unhandled — at best it becomes a vague deferral.

**What changes when you answer.** If holds and transfers are real, we add an immediate escalation for exactly those asks so a human closes the sale within minutes instead of the assistant stonewalling. If the website-only rule is genuinely right, we confirm the design and close this — but it must be confirmed, not assumed.

<sub>Answer: _______________________________________________</sub>

---

### Q16. Meta business verification and the WhatsApp provider contract

**🔴 BLOCKER for go-live**

**The question.** Has Nistula's Meta business verification been completed, and who is signing which WhatsApp provider contract — before the mid-October deadline? Both need company documents and a commercial decision, not code.

**Why it matters.** Without business verification, the WhatsApp number is capped at 250 conversations a day, which our own year-end forecast will strain — it caps growth at exactly the moment it succeeds. Without a signed provider agreement that includes 'coexistence' (humans and the AI sharing one number) in writing, the assistant cannot run on the real number at all. These are the two hardest external dependencies in the project and neither is something we can write.

**What we built meanwhile.** Everything runs on Meta's free test number against Paul's own phone. Nothing about the real number has been arranged.

**What changes when you answer.** These are the gate. Until they are done, the system cannot serve a single real guest, no matter how finished the software is.

<sub>Answer: _______________________________________________</sub>

---

### Q17. Whose phone holds the WhatsApp number, and can the team change how they work?

**🔴 BLOCKER for go-live**

**The question.** Which physical phone holds the Nistula WhatsApp Business number today, and who carries it? To let the assistant and the humans share one number, that phone must stay online (Meta cuts the link if it is offline for about two weeks), and the front desk must switch from the WhatsApp desktop app to WhatsApp Web on the computer. Whose phone will it be, who keeps it charged, and is the team willing to change that habit?

**Why it matters.** Two silent failures. If that phone goes flat during a quiet fortnight, Meta cuts the link and the assistant stops receiving messages entirely — guests message into a void. And if the front desk keeps using the old desktop app out of habit, their replies never reach us, so the assistant will not know a human has already answered and will reply on top of them, in front of the guest. Connecting the number is also a one-way door taken on somebody's actual working handset.

**What we built meanwhile.** Nothing — this is the cutover procedure, still to be run. We have written the requirement down and planned an alarm for the phone going offline, but nobody has agreed to hold the phone or to change how they work.

**What changes when you answer.** The cutover gets scheduled with the person who actually holds the phone, the habit change is announced, and we build the keep-alive alarm to page that person. Without it, go-live is a coin toss.

<sub>Answer: _______________________________________________</sub>

---

### Q18. Does anyone ever quote a price below the website?

**🟡 Important**

**The question.** Does Nistula have any rate today that is not the website rate — a travel-agent commission, a corporate rate, a long-stay or monthly deal, a repeat-guest price, a last-minute drop, a standing arrangement with a friend of the family? Our cancellation policy mentions 'long-stay rates', which implies they exist. If someone with such an arrangement messages the WhatsApp line, what should the assistant say?

**Why it matters.** The assistant is built never to negotiate, and it refuses every discount ask with a proud line: 'nobody gets a quieter price, so nobody has to wonder'. If a travel agent who has had 10% for two years hears that, we have insulted a partner and contradicted our own commercial reality — and they will believe the human, not us. A guest asking for a month is a very valuable enquiry, and the assistant will quote the standard nightly rate, produce a huge number, and lose the booking without ever mentioning that an arrangement might exist.

**What we built meanwhile.** A hard negotiation lock. Any discount ask gets a fixed transparency line, and the assistant is structurally incapable of stating a price that did not come from the live website quote. There is no concept of a special rate anywhere in the system.

**What changes when you answer.** If such arrangements exist we do NOT teach the assistant to give discounts — that stays locked. We add a recognition rule so those asks route straight to a human who can price them, instead of getting the refusal line. If they genuinely do not exist, we mark this closed and lock it in permanently.

<sub>Answer: _______________________________________________</sub>

---

### Q19. May we message past guests with offers — and has anyone ever agreed to that?

**🟡 Important**

**The question.** Do we have permission to write to past guests with a 'come back and stay again' message? Where is that consent recorded today — does someone tick a box when they book, or has nobody ever asked? Our plan is to write roughly two and a half months after a stay, at most twice a year, only to guests who said yes. Is that the right timing, and is there a season you especially want to fill?

**Why it matters.** An unwanted marketing message on WhatsApp is the fastest way to get a business number blocked by Meta — and it is the same number every guest reaches us on. Under Indian data rules, consent we invented is not consent. We defaulted every guest to 'no marketing' because nobody told us otherwise, which means the win-back feature currently has nobody to send to at all.

**What we built meanwhile.** Every guest is created with marketing consent switched OFF. Nothing sends today. The timing (75 days), the cap (two a year) and the consent mechanism are all our invention, and STOP is always honoured.

**What changes when you answer.** If consent is captured somewhere already, we switch the win-back on for those guests only. If it is not captured anywhere, we design the consent ask into the thank-you message rather than assuming it — and the timing and the copy get set by the person who owns the brand and the calendar, not by an engineer's default.

<sub>Answer: _______________________________________________</sub>

---

### Q20. Please read the exact cancellation sentences the assistant will say

**🟡 Important**

**The question.** The assistant states our cancellation terms in its own words rather than reading out the table on the website. Would you (or whoever owns policy) read the exact sentences it will say to a guest, and confirm they are right?

**Why it matters.** A cancellation answer is effectively a promise about money, and a guest will hold you to the exact sentence. Ours was written by paraphrasing the website's table — and our own review caught the first draft being LESS strict than the public FAQ: it had quietly dropped the no-refund-on-no-show and late-arrival terms. Those are back, but nobody from the business has ever read the final text.

**What we built meanwhile.** A paraphrased cancellation ladder in the assistant's knowledge, corrected once during review. It is what the assistant will quote to any guest who asks.

**What changes when you answer.** A ten-minute read-through, and either an approval or corrected sentences. Cheap, and it removes a whole class of money promises we cannot otherwise verify.

<sub>Answer: _______________________________________________</sub>

---

### Q21. Pets — which homes take them, and what does it cost?

**🟡 Important** · already on file as OQ-05

**The question.** Which of the eight homes actually accept pets, and what is the charge? The policy says pets are welcome only where approved in writing in advance and that pet cleaning 'may be chargeable' — but there is no figure and no list of homes. Is it a flat cleaning fee, a per-night fee, or genuinely case by case?

**Why it matters.** Goa guests travel with dogs constantly, and 'can I bring my dog?' is a yes/no question we cannot answer either half of. The assistant can only say pets need prior written approval, which reads as a polite brush-off, and the moment the guest asks what it costs it has to fetch a human. A guest turning up with a dog at a villa that does not take them is a scene.

**What we built meanwhile.** The website's non-answer ships: approval rule stated, no fee, no list of pet-friendly homes. The assistant defers on cost.

**What changes when you answer.** The list of homes and the fee go into the policy knowledge (the fee written with the ₹ symbol, in a sentence that names it) and the whole pet conversation completes without a human. Note this is TWO answers — the question on file only asked for the fee, not the list of homes.

<sub>Answer: _______________________________________________</sub>

---

### Q22. What is the late check-out charge?

**🟡 Important** · already on file as OQ-06

**The question.** Early check-in has a published number — ₹1,000 per hour. Late check-out only says 'charged additionally'. Is it the same per-hour rate, a half-day charge, a full night?

**Why it matters.** Guests ask this on their last morning, usually in a hurry and often before anyone is at the desk. The assistant quotes the early check-in fee happily and then goes silent on its mirror image, which reads as evasive on a question with a completely predictable answer.

**What we built meanwhile.** The assistant states that late check-out is subject to availability, charged additionally, and not guaranteed unless confirmed in writing — but never a figure.

**What changes when you answer.** The figure goes into the policy file with the ₹ symbol in a sentence naming the fee, and the assistant quotes it exactly as it already quotes early check-in. The last-morning question then answers itself.

<sub>Answer: _______________________________________________</sub>

---

### Q23. Is there a minimum stay, and does it change by season?

**🟡 Important**

**The question.** Do we have a minimum-stay rule — two nights, three over New Year, four over Christmas? Which seasons, and how many nights?

**Why it matters.** A guest asks 'what's the minimum stay over Christmas?' with no dates in hand, and the assistant cannot answer at all — it only discovers a minimum after it looks up specific dates. So a guest asking for one night at New Year gets a confusing partial answer instead of a clear 'we take a minimum of four nights over that period, here's what's open'.

**What we built meanwhile.** No minimum-stay policy exists in the assistant's knowledge. The live rate service returns a minimum-nights flag for specific dates, and the assistant is told to explain it warmly — with a number it only gets after a lookup.

**What changes when you answer.** The rules and their seasons go into the policy knowledge, and the assistant sets the expectation in the very first message rather than after a failed quote.

<sub>Answer: _______________________________________________</sub>

---

### Q24. May the assistant ever tell a guest what they paid, or what is still owed?

**🟡 Important**

**The question.** If a guest with a confirmed booking asks 'how much did I pay?' or 'how much is left to pay?', who should answer and from what? Is the amount recorded in eZee exactly what a direct guest paid — and for an Airbnb or Booking.com booking, is that figure what the guest paid, or what the platform pays us?

**Why it matters.** These are ordinary, reasonable questions and every single one is deflected to a human today. The reason is honest: the figure we hold is only the first room's on a multi-room booking, and for an OTA booking it may be our payout rather than the guest's payment. So if we ever read it out for an Airbnb guest, we could state a number lower than what they actually paid — a money statement from us that is simply wrong, delivered with total confidence.

**What we built meanwhile.** The assistant never states any booking amount, ever — not the total, not the balance. The figure is not even shown to the model. Every booking-money question becomes a human handoff.

**What changes when you answer.** Either confirm the eZee amount is exactly what a direct guest paid (then we state it for direct bookings and defer for OTA ones), or keep the refusal permanently and give us the right sentence to say instead ('the team will confirm your balance').

<sub>Answer: _______________________________________________</sub>

---

### Q25. Cancelled bookings — may the assistant talk about them?

**🟡 Important**

**The question.** Forty of the sixty-two bookings we have received from eZee are CANCELLATIONS. When someone whose booking was cancelled messages us, what should happen? May the assistant say 'I can see that booking was cancelled — shall I have the team help you rebook?', or must a person always take that conversation? And are those forty real guest cancellations, or bookkeeping noise?

**Why it matters.** A cancelled booking is the most dangerous thing we can get wrong — tell someone 'you're all set for the 20th' and a family drives to Assagao to a villa that is not theirs. So today the assistant refuses to describe a cancelled booking at all and hands the whole thread to a human. But that means a guest asking something harmless ('what time is check-in?') gets a mysterious deflection instead of an answer, and forty threads are dead ends.

**What we built meanwhile.** Fail-closed: only confirmed, modified, checked-in and checked-out bookings may be spoken about. Cancelled, no-show and unconfirmed are deliberately excluded — the guest gets a detail-free 'a colleague is looking into it' and the thread escalates.

**What changes when you answer.** If you are comfortable, the assistant states plainly that the booking was cancelled and offers to rebook — turning forty dead ends into recovery conversations. If not, we keep the handoff but write the deflection wording deliberately instead of leaving it generic.

<sub>Answer: _______________________________________________</sub>

---

### Q26. Someone says 'I have a booking' and we cannot find it — what should we do?

**🟡 Important** · already on file as OQ-17

**The question.** Two halves of one decision. (a) If a message arrives from a number we do not recognise saying 'I have a booking' or 'I'm checking in today', and we can see no booking on that number, should that always fetch a human straight away, the way a complaint does? (b) Before the assistant will discuss a booking with someone, how much proof should it want — is quoting the booking reference enough, or do you want a second check like the surname or the check-in date?

**Why it matters.** (a) is the guest we most need to get right: a real person with a real booking our records never captured. Today the assistant honestly says 'I can't see a booking on this number — what's the name and check-in date?' and then nothing happens; whether a human is pulled in depends on how the assistant happens to phrase itself, which is luck, not design. A genuine guest can be left in a polite loop while nobody at Nistula ever learns they messaged. (b) cuts both ways: our booking numbers are short and near-sequential, so a stranger could guess one — too loose and they learn when a house is empty and who is in it; too strict and a real guest who has lost their email cannot get help at 11 pm.

**What we built meanwhile.** The assistant refuses to invent or agree to a booking it cannot see, and asks for the name and check-in date. For proof, the guest must type a matching reference in their own words; we never accept the WhatsApp display name (a stranger can set it to anyone's name); three wrong attempts in 24 hours locks that number out and pages a human; we never reveal the amount, the name on the booking, or the exact house. That bar is our invention, not the business's.

**What changes when you answer.** If the answer to (a) is yes, we build a firm rule that any booking claim from an unknown number rings the front desk within minutes. If no, we build a gentler holding reply — either way it stops being an accident. For (b) we move the bar up or down deliberately and have a decision on record instead of an engineer's guess about a privacy question.

<sub>Answer: _______________________________________________</sub>

---

### Q27. Messages that are not from guests at all

**🟡 Important**

**The question.** What should the assistant do when a villa owner writes offering their property to Nistula, or a supplier, a journalist, or someone applying for a job? The website sends villa-owner enquiries to a separate number.

**Why it matters.** The assistant is built for guests. A villa owner offering us a property is a high-value lead, and today the assistant would treat them as a confused guest and try to quote them a stay — or defer with a guest-flavoured apology. Either is embarrassing to someone we want to do business with. With most enquiries arriving on this one number, it will happen.

**What we built meanwhile.** Nothing. There is no routing for non-guest enquiries; the assistant answers as a guest concierge to everyone.

**What changes when you answer.** A short rule: recognise an owner or business enquiry, say something gracious, and hand it to the right person or number instead of quoting a villa. Small to build once someone tells us where those enquiries should go.

<sub>Answer: _______________________________________________</sub>

---

### Q28. Where should we send guests to eat and drink?

**🟡 Important**

**The question.** Should the assistant recommend restaurants, cafés, beach shacks and things to do around the villas — and if so, whose list? Ten or fifteen places the team actually sends guests to, with an honest one-line note each, would be enough.

**Why it matters.** 'Where should we eat tonight?' is what a guest asks a concierge. Ours currently says nothing useful — it falls back to 'cafés and restaurants are a short drive away', which is the answer of a machine that has never been to Goa. We deliberately did not let it repeat the website's neighbourhood list, because that list's own notes admit the ratings are stale research snapshots and the photos are stock images of the wrong venues.

**What we built meanwhile.** Nothing. The assistant has no local recommendations and no approved list, and gives the vague 'around the area' line.

**What changes when you answer.** A short approved list turns the assistant into a genuine concierge overnight. It is one of the cheapest, most visible-value answers on this whole document.

<sub>Answer: _______________________________________________</sub>

---

### Q29. One correct address, and which contact details the assistant may hand out

**🟡 Important** · already on file as OQ-12

**The question.** (a) What is the one correct office address? Our policy document says 'Amado Vistas, Bouta Waddo, Assagao, Bardez, Goa 403507' and the website footer says 'No 5, Amado Vistas, Assagao, Goa'. (b) Which contact channels may the assistant ever give a guest — the main phone, WhatsApp, contact.us@nistula.life, the owner-enquiry number, Instagram? (c) And what do we call ourselves to a guest: 'Guest Relations', 'the villa team', or 'the front desk'? Our material uses all three for the same people.

**Why it matters.** The owner-enquiry number is for people who want to put their villa into Nistula's portfolio, not for guests. If the assistant ever hands that to an upset guest at 11 pm, it has sent a paying customer to the wrong person entirely. An escalating guest given a wrong address or a dead email will simply give up. And every escalation the assistant makes says some version of 'let me bring the team in' — naming the wrong team is a small embarrassment that happens over and over.

**What we built meanwhile.** The assistant hands out no phone number, no email and no address at all — it only promises that a person will come. Safe, but a guest who wants to phone us cannot get a number out of the concierge.

**What changes when you answer.** One approved address, one approved set of channels and one name for the team go into the knowledge, and the assistant can direct people properly instead of only promising a call-back.

<sub>Answer: _______________________________________________</sub>

---

### Q30. Two odd settings in eZee worth a look

**🟡 Important** · already on file as OQ-10

**The question.** (a) In eZee, the Siolim 4BHK is set up with a base occupancy of 2 adults and a maximum of 8, while the apartments are base 4 and the Assagao villas base 6. For a four-bedroom house that sleeps eight, base 2 looks wrong. Is that deliberate? (b) eZee also lists a 'rack rate' of about ₹25,000 for the villas while the real selling rate is around ₹6,500. Is that list price deliberate, or leftover configuration?

**Why it matters.** Base occupancy is what the extra-adult charge counts from. If Siolim's base really is 2, then a family of eight booking Siolim may be paying six extra-adult supplements — on the website as well as through us. That is a live pricing question about the biggest, most valuable house in the portfolio, not a chatbot issue. The rack rate we never read, but any tool or channel that ever fell back to it would quote a guest roughly four times the real price.

**What we built meanwhile.** We transcribe what eZee reports and never compute a price ourselves — whatever eZee says is what the guest is quoted, right or wrong. The rack rate is ignored entirely; every price comes from the live website quote.

**What changes when you answer.** If the base occupancy is a setup error, fixing it in eZee corrects the price on every channel, not just ours. If it is deliberate, we record why and stop treating it as a bug. The rack rate changes nothing for the assistant either way — it is simply worth someone tidying.

<sub>Answer: _______________________________________________</sub>

---

### Q31. How long may we keep a guest's messages and memories — and may we import the old chats?

**🟡 Important**

**The question.** (a) How long may we keep a guest's WhatsApp conversation and the things we remember about them ('prefers early check-in', 'celebrated an anniversary')? Is there a point at which it should be deleted, and if a guest asks us to forget them, who handles that? (b) When we connect the real number, WhatsApp offers to import the existing chat history from the phone. Do we want past guest conversations pulled into the system, and who gives that consent?

**Why it matters.** We are building a memory that spans years on purpose, so a returning guest is recognised. That is lovely, and it is also personal data under Indian law. Nothing currently expires and there is no defined process for a deletion request. And importing the history would give the assistant real memory of past guests from day one — but it also pulls every old conversation on that phone, including anything private, into our database, irreversibly.

**What we built meanwhile.** Facts and messages are kept indefinitely. A deletion capability exists in the design but has no retention period and no named owner. History import is planned as a later piece of work and the consent step sits unowned in the cutover checklist.

**What changes when you answer.** We set an expiry on stale facts and name the person who handles a deletion request. And we either import (with a retention story) or decline and let the assistant start with a blank memory. Both are fine; guessing is not.

<sub>Answer: _______________________________________________</sub>

---

### Q32. Who reads the reports the system produces?

**🟡 Important**

**The question.** The system will produce a digest every morning of what happened overnight, and a weekly review of the things it stopped itself from saying. Who is going to read them? And what happens if for three weeks nobody does?

**Why it matters.** These reports are the only way we learn that the assistant is quietly getting something wrong — a rule that keeps firing on innocent guests, an overnight problem nobody picked up. They are written for a human reader who does not currently exist. A report nobody opens is worse than no report, because we will believe we are watching.

**What we built meanwhile.** The data is captured faithfully and the exact query is written down; the morning digest and weekly report are planned to go to the ops number. Nobody is named, and nothing happens if they are ignored.

**What changes when you answer.** We either name the reader and shape the report for them, or we accept nobody will read it and instead make the system shout only when something is genuinely wrong — a completely different and much smaller design.

<sub>Answer: _______________________________________________</sub>

---

### Q33. What may we spend a day on the AI itself?

**⚪ Nice to have**

**The question.** We currently warn if the assistant's own running cost passes about ₹1,000 in a day, and at four times that it stops replying to guests altogether until a person restarts it. Is that the right ceiling, and is that the trade-off you want? Who may say 'spend more, keep it talking'?

**Why it matters.** Low stakes for a guest, real stakes for you. A runaway cost is usually a bug, but the cure we designed is an assistant that goes silent on real guests — if that happens on a Saturday in season with nobody authorised to lift the cap, we have chosen to lose bookings to save a few hundred rupees. Nobody has confirmed that is the right call, or set the number.

**What we built meanwhile.** An alert threshold of ₹1,000 a day, chosen by us with no input, with a hard stop planned at four times it.

**What changes when you answer.** The number becomes yours and we name who can lift it from their phone. If you would rather it never goes silent, we turn the hard stop into a loud alarm instead. If ₹1,000 is fine, say so and we close this.

<sub>Answer: _______________________________________________</sub>

---

## front desk — 25 questions (8 🔴)

> How the front desk actually works day to day. Nobody has written this down, so we guessed — and the guesses are now load-bearing.

### Q34. When is it decided which actual house a guest gets?

**🔴 BLOCKER for go-live** · already on file as OQ-15

**The question.** At what exact moment does someone decide which physical house a guest is in — B3 rather than C1? At the time of booking, the night before, or when they walk in? And once decided, is it firm enough that we can tell the guest 'you're in Villa C3' before they travel, or does it still move?

**Why it matters.** Two live problems. First, the website SHOWS a guest a named villa when they book — but the reservation only reserves a TYPE, and eZee picks the actual house later. So a guest will message us in perfect good faith saying 'my Villa C3 booking' when they are actually in C1. The assistant is now built to refuse to confirm any house we have not been told about, even one the guest names themselves, and to fetch a human — so it reads as evasive to someone simply asking where they are staying, and every one of those is a human interruption. Second, when a guest reports a broken AC, the staff task would say 'go to a Nistula Villa' — which is four different houses. Housekeeping cannot act on that.

**What we built meanwhile.** A hard code guard: the assistant may name a house ONLY when eZee has actually assigned one, and only that one. In practice no production booking carries a house, so it always speaks in types ('your villa in Assagao'). Our own villa knowledge says 'the exact unit is assigned on arrival' — which is our guess, not something anyone confirmed.

**What changes when you answer.** If the house is assigned early and stays put, we pull it into our records and the assistant can tell guests their villa before they travel — and the staff task cards become actionable, which unblocks the whole in-stay half of the product. If it genuinely moves until check-in, we keep the current refusal permanently and tell the website to stop naming a specific villa at checkout. Nothing else can answer this — no system holds it.

<sub>Answer: _______________________________________________</sub>

---

### Q35. Can the guest's real WhatsApp number go onto an OTA booking in eZee?

**🔴 BLOCKER for go-live** · already on file as OQ-17

**The question.** For guests who book through Airbnb, Booking.com or MakeMyTrip, eZee only gives us a masked, fake phone number. Could the front desk save the guest's real WhatsApp number onto the booking in eZee — at booking, or at check-in? If that is not possible, how do those guests reach you on WhatsApp today?

**Why it matters.** We recognise a guest by matching their WhatsApp number to a booking. Most of this property's confirmed bookings come from the travel sites, and their numbers are masked — so those bookings match nobody. The guest standing inside Villa B3 messaging 'the AC isn't cooling' looks to the assistant like a brand-new sales lead, and it may try to sell them the villa they are already in. It cannot see their dates, cannot treat them as in-house, cannot route their request. No amount of fixing our own software solves this; only a real phone number does.

**What we built meanwhile.** Fail-closed and by design: a booking with no usable phone links to nobody. We deliberately never match on the WhatsApp display name, because a stranger can set that name to anything. Such a guest is treated as a lead — the assistant is forbidden from denying they have a booking, and asks for the name and check-in date — and can only be recognised if they quote a booking reference.

**What changes when you answer.** If the desk records the real mobile in eZee, recognition simply works and every OTA guest is known from their first message — the entire in-stay half of the product comes alive for the majority of guests. If it cannot be done, we need a different route entirely (a welcome card carrying a reference, or the villa asking the guest to message us first), and we accept that the assistant will meet most in-house guests as strangers.

<sub>Answer: _______________________________________________</sub>

---

### Q36. What actually happens when a guest arrives?

**🔴 BLOCKER for go-live**

**The question.** How does a guest get into the house? Is there a caretaker who meets them, a lockbox, a keypad, a key handed over at a gate? Who meets them, and where? And how does that square with our policy that a valid photo ID is collected for every adult and the primary guest must be present at check-in — and with 'contactless check-in', which we list as an amenity on every villa page? What happens on a very late arrival?

**Why it matters.** Arrival is the highest-stakes moment of the whole stay and the one the assistant is least able to help with. A guest landing at 11 pm asks 'how do I get in?' and the assistant — which has just told them check-in is contactless — has nothing to say and must wake someone up. 'Contactless' and 'we need everyone's ID and the lead guest present' cannot both be fully true, and we are currently telling guests both. A guest who plans a 1 am arrival because they read 'contactless check-in' will find nobody there.

**What we built meanwhile.** Both statements ship, contradicting each other. There is no arrival procedure in the assistant's knowledge at all, so it defers on any question about how arrival actually works.

**What changes when you answer.** The real arrival process goes into the knowledge and the assistant walks a late-arriving guest through it without waking anyone — turning the most anxious moment of the stay from an escalation into a warm two-line answer. The contradiction with the ID policy gets resolved in the wording.

<sub>Answer: _______________________________________________</sub>

---

### Q37. May we hold and send a location pin for each villa?

**🔴 BLOCKER for go-live** · already on file as OQ-12

**The question.** May we hold, per villa, an exact address or a map pin that the assistant can send a guest? And may it send it before they arrive, or only once payment has cleared? Today all we have is 'Assagao' or 'Siolim'.

**Why it matters.** We have written a promise into the assistant's mouth that it cannot keep: our own FAQ has it tell guests 'share your arrival time and we'll send an accurate location pin' — and then it has no pin to send, so a human must do it every single time. 'Where exactly is it? Send me the location' is asked by every arriving guest and by many before booking. A guest driving around Assagao lanes at night looking for an unmarked gate is the worst version of this.

**What we built meanwhile.** The assistant repeats the website's promise and then escalates to a human to actually keep it. There is no address or coordinate for any villa anywhere in its knowledge.

**What changes when you answer.** The pin or address per villa goes into the knowledge and the assistant sends it the moment a confirmed guest asks — including at midnight. This removes the highest-frequency pre-arrival escalation in the entire journey. If the answer is 'no, a human must always send it' (a security choice), we reword the FAQ so the assistant stops implying it can.

<sub>Answer: _______________________________________________</sub>

---

### Q38. When a booking changes, what do you do in eZee — and how quickly?

**🔴 BLOCKER for go-live**

**The question.** When a guest changes a booking — new dates, an extra night, an extra guest — do you edit the existing booking in eZee ('Amend Stay'), or cancel it and create a new one? And when you agree a change with a guest on WhatsApp, is eZee updated straight away, or later, or sometimes not at all?

*(Please DO ask this — it is still open. We have never seen an amendment arrive on eZee's live feed: every record it has pushed us is a new booking or a cancellation. But eZee's own files show four of your past bookings WERE amended, so it is happening somewhere we cannot see. The most useful thing you could do: amend one booking in eZee and tell us when, so we can watch whether it reaches us at all.)*

**Why it matters.** eZee gives us no way to ask 'what changed' — we only learn about a change if it comes down the booking feed, and we have never once seen an amendment. If a guest moves their stay from the 20th to the 27th and that never reaches us, the assistant will send a welcome message on the 20th, tell the guest the wrong dates, and hand staff the wrong dates — with complete confidence. And if the desk agrees a change on Tuesday and only updates eZee on Friday, then for three days the assistant gives that guest the wrong check-in date and schedules their pre-arrival message for the wrong day.

**What we built meanwhile.** The code handles an amendment if one ever arrives (dates and details update), but it has never been exercised against reality. eZee has no amend function we can call, so no test we can run from our side can produce one — only a human at the front desk can. We trust eZee completely: whatever you have entered is what the assistant believes and says.

**What changes when you answer.** If you cancel-and-rebook, we are already correct and this closes. If you amend in place, one live amendment tells us whether the feed carries it — and if it does not, we must add a safety net (re-reading each booking before we message anyone) or the assistant will state stale dates to guests and staff. If eZee is not always updated promptly, we make the assistant far more cautious about stating dates for a booking that is actively being discussed.

<sub>Answer: _______________________________________________</sub>

---

### Q39. Is everything in eZee a real, paying guest?

**🔴 BLOCKER for go-live**

**The question.** Does eZee contain bookings that are not real guests — owner or family stays, blocks while a villa is being repaired, agent holds, walk-ins entered after the fact, or old test bookings? How would someone tell them apart at a glance?

**Why it matters.** Anything sitting in eZee looks to us like a guest with a stay. The automatic messages (confirmation, pre-arrival, welcome) would go to the phone number attached to a maintenance block or the owner's own stay. There are already sixty-two historic bookings queued in our system waiting to be processed — so if any of them are not real guests, the very first thing this system does in the world is message the wrong people about the wrong stays.

**What we built meanwhile.** Nothing. Every mirrored booking is treated as a genuine guest stay; there is no exclusion rule of any kind. (We already know we must purge or date-filter that backlog before switching the messages on — but that does not tell us which bookings are real.)

**What changes when you answer.** A recognition rule — a source label, a name convention, a rate plan — becomes a hard filter before any message is scheduled. A small change that prevents an embarrassing first day.

<sub>Answer: _______________________________________________</sub>

---

### Q40. The staff roster: who, what number, which villas

**🔴 BLOCKER for go-live**

**The question.** Who is on the team the assistant will send work to? For each person: name, the WhatsApp number they actually use, what they do (housekeeping, maintenance, front desk), and which villas they look after. Also: is staff assigned to particular villas, or is it one pool who go wherever they are needed that day?

**Why it matters.** Without this the assistant has no hands. Every in-stay request — towels, a plumber, a broken AC — has nowhere to go, so nothing is assigned to anybody. A guest is told 'housekeeping is on the way' and no housekeeper ever hears about it. We also built the routing so a job goes to whoever covers that villa; if it is really one pool dispatched by a supervisor, every job should go to the dispatcher instead, or it lands on whoever we guessed covers B3 today while that person is in Siolim.

**What we built meanwhile.** The roster is empty. The task system falls back to the front-desk lead and then to the ops number, both of which are also unset — so in practice nothing would be assigned to anyone. The shape we invented (name, phone, role, villas covered) came from the plan, not from how the team actually splits work.

**What changes when you answer.** Task cards start reaching the right person's phone for the right villa, and the assistant can truthfully say 'housekeeping has been asked' — a sentence it is currently forbidden from saying. This is the precondition for the whole in-stay half of the product. It also tells us whether 'role' and 'villas covered' are even the right way to slice the team.

<sub>Answer: _______________________________________________</sub>

---

### Q41. What may the assistant say yes to on its own?

**🔴 BLOCKER for go-live**

**The question.** Which requests may the assistant simply confirm on the spot, and which must a human approve first? Think about: two fresh towels, drinking water, bed linen, an extra mattress, an early check-in at ₹1,000 an hour, a late check-out, an extra guest, a cab, a cake, a dog. And on early check-in specifically: if check-in is 3 pm and a guest lands at 8 am, is that ₹7,000, or is there a cap or a half-day rate? Who approves it, and how much notice do they need?

**Why it matters.** This is the single most common shape of pre-arrival and in-stay request, and the assistant currently cannot close any of them. It can quote the early check-in fee but cannot grant an early check-in — so a guest asking 'can we check in at 1 pm, we'll pay the ₹1,000?' gets a fee quote and then a handoff: two messages to say what a human would answer in one word. And the guest will immediately do the multiplication and ask 'so 10 am is ₹5,000?' — which the assistant is forbidden from computing, so it must go quiet having already half-quoted a price. Conversely, the machinery we are about to build would let it promise an extra mattress at 11 pm, or imply a late check-out is fine when it costs money and depends on the next booking. A promise the villa cannot keep is worse than a slow reply.

**What we built meanwhile.** The assistant has no authority to approve or arrange anything and no way yet to raise a staff task. It states the published fees, defers everything else, and is explicitly forbidden from claiming anything has been arranged.

**What changes when you answer.** We split requests into an always-yes list (confirm and dispatch) and an ask-first list (raise it, tell the guest we are checking, never promise or quote). That is the difference between a concierge and a receptionist that keeps saying 'let me check', and it directly shapes the staff-task build.

<sub>Answer: _______________________________________________</sub>

---

### Q42. Do you mark guests as arrived and departed in eZee?

**🟡 Important**

**The question.** Does the front desk mark a guest as checked in when they arrive, and checked out when they leave? We have never received a single check-in or check-out from your system — every booking simply stays 'confirmed'.

**Why it matters.** Because of that, we assume anyone whose booking dates cover today is inside the villa, and the assistant chooses how to talk to them entirely from that assumption. A guest who never showed up, or who left two days early, is still treated as in-house — so it could message 'hope you're settling in' to someone sitting at home in Delhi, or offer in-stay help to a guest who cancelled at the door. It also means the assistant can never truthfully say 'I can see you've checked in'.

**What we built meanwhile.** The guest's stage (arriving / in the villa / past guest) is derived purely from the booking DATES against today's date, deliberately ignoring the eZee status, because no arrival record has ever reached us. Check-out day counts as still in-house.

**What changes when you answer.** If you do mark arrivals, we can fetch them and be exact — which matters enormously for how urgently the assistant treats a complaint. If you never will, we keep the date rule, never claim to know someone has arrived, and we agree together what should happen for no-shows and early departures.

<sub>Answer: _______________________________________________</sub>

---

### Q43. Do you ever put one group into several villas on a single booking?

**🟡 Important**

**The question.** Do you ever book one family or group into more than one villa (or more than one room) on a single reservation — a wedding party, a big family? How often? And how should the assistant talk to that guest: as one stay across several houses, or as separate bookings?

**Why it matters.** eZee sends those to us as several linked entries, and two are already sitting in our data. We deliberately refuse to describe them at all: the assistant is told a booking exists but is given no dates, no villa, no details, and a human is paged. So the guest who booked the biggest, highest-value stay currently gets the worst service. We also cannot tell them the price of the whole booking, because eZee only gives us the amount of the first room.

**What we built meanwhile.** Any booking with more than one room is marked 'not describable' — the assistant stays silent on every detail and escalates to a person (fail-closed, so it can never invent a wrong answer).

**What changes when you answer.** If group bookings are a real part of the business, we build the multi-villa view properly — all houses, all dates, one stay — so the assistant can serve your best customers instead of paging a human every time one messages. If they are rare and always hand-held by the desk anyway, we keep the handoff and stop worrying.

<sub>Answer: _______________________________________________</sub>

---

### Q44. What booking reference does a guest actually have in their hand?

**🟡 Important**

**The question.** When a guest wants to prove which booking is theirs, what number are they actually looking at? Our eZee booking numbers are short (877, 953). Does an Airbnb or Booking.com guest ever see that number, or do they only have the travel site's own confirmation code? Do we ever send a guest a reference of our own?

**Why it matters.** The only way an unrecognised guest can unlock their booking is to type their reference. Our assistant only recognises eZee reservation numbers — so a perfectly honest Airbnb guest who types their Airbnb code gets a flat refusal, has a strike counted against them, and after three tries is locked out for 24 hours while a human is paged as if they might be probing someone else's booking. We would be treating a real guest like a fraudster because they quoted the only reference they were ever given. And these are exactly the guests whose phone numbers we do not have.

**What we built meanwhile.** The reference check accepts eZee reservation numbers only (and their per-room siblings). Anything unrecognised gets an identical refusal, deliberately — a different error would tell an attacker which numbers are real. Three failures in 24 hours locks the phone out.

**What changes when you answer.** If guests hold OTA codes, we either store the OTA reference alongside the eZee one, or we stop counting an unrecognised reference as a strike. Better still, getting the real phone onto the booking (see the OTA phone-number question) means OTA guests never need a reference at all.

<sub>Answer: _______________________________________________</sub>

---

### Q45. What is an 'unconfirmed' booking in eZee?

**🟡 Important**

**The question.** In eZee, what does an unconfirmed booking on this property actually mean — a phone enquiry the desk pencilled in, a website booking whose payment has not cleared, something else? And at that point, does the guest believe they have a booking?

**Why it matters.** We deliberately treat an unconfirmed booking as if it does not exist — so a guest who thinks they have booked will be told 'we cannot see a booking on this number'. If unconfirmed just means 'payment pending for the next ten minutes', that is fine. If it means 'the desk is holding it while the guest transfers money', we are calling a real customer a stranger.

**What we built meanwhile.** Any booking not explicitly flagged confirmed is treated as unknown and is NOT describable — the assistant behaves exactly as if the guest has no booking. We chose this so we never congratulate someone on a booking eZee has not confirmed.

**What changes when you answer.** If unconfirmed holds are a real, meaningful state, we give them their own honest wording ('I can see a hold on those dates — the team will confirm it') instead of pretending they do not exist.

<sub>Answer: _______________________________________________</sub>

---

### Q46. The real hours, and what 'shortly' actually means

**🟡 Important**

**The question.** Are the front desk's hours really 10:00 to 20:00, every day of the week, all year — including Sundays, peak season and public holidays? Does anyone cover a lunch break or when the one person on shift steps out? And when the assistant says 'someone will reply right here shortly', what does 'shortly' honestly mean at Nistula — five minutes, thirty, an hour?

**Why it matters.** Those two times are baked into what the assistant tells guests. If the desk actually opens at 9 in season, we needlessly make a guest wait an hour. If it closes at 18:00 on Sundays, the assistant promises someone 'can step in within minutes' when there is nobody there — and the guest waits, believing a human is coming. And 'shortly' is a word we put in the assistant's mouth without anyone telling us what it means: if the desk typically takes two hours, we are setting the guest up to feel ignored, in our own warm, confident voice, which makes the let-down sharper.

**What we built meanwhile.** A hardcoded night window of 20:00–10:00, seven days a week, with no weekend or seasonal variation. The assistant tells itself 'the front desk is ON DUTY (staff hours 10:00–20:00 IST) and can step in within minutes', and the phrasebook says 'shortly' — words chosen for tone, never checked against what the desk can do.

**What changes when you answer.** The hours become real (and if they vary by day or season we build a small rota instead of one window), and we rewrite the two promises to a number the team can actually keep. If the honest answer is 'within the hour', saying so is far better than 'shortly' and missing.

<sub>Answer: _______________________________________________</sub>

---

### Q47. What words do your guests actually use when they complain?

**🟡 Important**

**The question.** When a guest is unhappy, what do they actually write — in English, in Hinglish, in whatever mix they use? And should EVERY complaint fetch a human, or only from a guest currently staying with us?

**Why it matters.** We wrote the complaint word list ourselves, from imagination: dirty, broken, refund, kharab, cockroach, no water, and so on. Every hit pages a human. If we missed the words your guests really use, real complaints slide past unnoticed. If we over-included, we page you every time someone says 'refund' in a pre-booking question about the cancellation policy.

**What we built meanwhile.** A single word-list heuristic escalates any message containing a negative word, regardless of whether the person has a booking. We deliberately did NOT narrow it to in-house guests — an OTA guest's booking may be invisible to us, and narrowing it would make the highest-stakes conversation we handle worse. The guest's situation is added to the alert card for the human instead.

**What changes when you answer.** We tune the list to real language, including the Hinglish and Konkani forms we would never guess. That cuts false alarms and catches real ones, and it directly determines how often the front desk gets pinged.

<sub>Answer: _______________________________________________</sub>

---

### Q48. Cancellations and date changes — who does them, how fast, what may we promise?

**🟡 Important**

**The question.** When a guest asks over WhatsApp to cancel or move the dates of an existing booking, who actually does it, how quickly, and what is the assistant allowed to tell them in the meantime?

**Why it matters.** Cancellations and date changes are money and emotion. The assistant can read a booking but cannot change one — if it said 'I've cancelled that for you' it would be lying. So it falls back to a generic 'I'll bring the team in', and at night that means after 10 am, which could cross a refund deadline: a guest inside the 15-day refund band watches their window close while waiting for a human.

**What we built meanwhile.** No cancel or change capability at all, and no rule that treats these as time-critical. The assistant defers like any other question.

**What changes when you answer.** A defined process (who does it, in what time, what the guest is told) becomes a scripted escalation with an honest, specific promise, and cancellation asks get treated as urgent rather than ordinary.

<sub>Answer: _______________________________________________</sub>

---

### Q49. When a person takes over a chat, how long should the assistant stay out of the way?

**🟡 Important**

**The question.** When a staff member replies to a guest by hand, how long should the assistant stay quiet before it starts answering that guest again? We chose two hours. And on day one, who answers first — if the desk sees an incoming message before the assistant has replied, should they answer as they do today, or wait?

**Why it matters.** Two hours is a guess. If a front-desk person is still handling a delicate complaint at hour three, the assistant wakes up mid-thread and starts replying over them — to a guest who thinks they are talking to a person. Conversely, if the human answered one quick question and left, the guest waits two hours for an assistant that has muted itself. And in the first weeks, when every reply is being approved by a human anyway, both are watching the same chat: if the desk types over a waiting draft, the guest gets two replies, possibly contradicting each other, in front of them.

**What we built meanwhile.** A flat two-hour silence after any human reply, then the assistant resumes by itself. Staff can override with a command, but must remember to. There is no rule at all about who has the first move.

**What changes when you answer.** The pause length matches how the desk really works — and if you would rather the assistant stayed off until explicitly told to come back, we make that the default. We also write the first-move rule into the staff briefing ('let it draft; approve or edit — do not type over it'), which the first week badly needs.

<sub>Answer: _______________________________________________</sub>

---

### Q50. Who watches the eZee screen — and would they act on an alert?

**🟡 Important**

**The question.** Who uses the eZee front-desk software day to day? If our system flagged a booking as suspect — half-cancelled, contradictory, missing a house — would that person notice, and would they fix it? And who would be willing to run one command each week that answers 'how many bookings are we missing?' and read one number?

**Why it matters.** Several of our safety alarms end with 'a human checks eZee and fixes it by hand'. We wrote those without knowing whether such a human exists or would act. If nobody owns the eZee screen, those alarms are decoration and the errors sit there — attached to a guest the assistant is talking to. Separately, our booking data comes from a live feed: if that feed silently jams, we stop learning about new bookings, and the assistant will greet a guest arriving tomorrow as a stranger and try to sell them a villa.

**What we built meanwhile.** The alarms fire (into a log file today) and the assistant refuses to describe any booking it is unsure about, telling the guest nothing and asking for a person. The completeness check exists as a command someone must choose to run — no schedule, no owner.

**What changes when you answer.** We name the person, send the alert to their phone in words they can act on, and agree how long a suspect booking may sit before someone looks. Or we accept nobody will run the check and build it into an automatic daily health check instead — but we should decide, rather than leave it as a command in a document.

<sub>Answer: _______________________________________________</sub>

---

### Q51. Photos and voice notes — should each one become a job for the desk?

**🟡 Important**

**The question.** Guests here send a lot of voice notes and photos. The assistant cannot listen to or look at them, so today every one turns into a job for the front desk to go and read the chat. Is that workload acceptable, or would you rather it simply asked the guest to type it?

**Why it matters.** A guest sending three photos of a leaking tap creates three front-desk jobs. On a busy day this could bury the team in noise and make them distrust the whole system — and the guest still has to repeat themselves in text anyway.

**What we built meanwhile.** A polite line asking the guest to type it, PLUS a front-desk task raised every time. Understanding voice and images is deliberately out of scope for the first version.

**What changes when you answer.** We drop the automatic task (asking the guest to type is often enough), or keep it but batch them — either way the team's inbox stops being the dumping ground for every photo.

<sub>Answer: _______________________________________________</sub>

---

### Q52. 'Call me' — does anyone ever ring back?

**🟡 Important**

**The question.** When a guest asks to be phoned — 'call me', 'can someone ring me' — does anybody ever call them back? If yes, who, and how soon? If no, what should the assistant say instead?

**Why it matters.** A call request is a strong signal, usually from someone about to book or someone upset. The assistant currently just says it is bringing the front desk in, on the same WhatsApp thread. If nobody ever calls, we have quietly ignored a direct request — and at night, that request waits until 10 am.

**What we built meanwhile.** A phrasebook line ('bringing the front desk in now') plus an escalation. The assistant never gives out a phone number and never promises a call.

**What changes when you answer.** If calls do happen, the assistant promises one honestly and with a timeframe. If they do not, we word the line so the guest is not left waiting for a ring that will not come.

<sub>Answer: _______________________________________________</sub>

---

### Q53. Who is allowed to say a job is finished?

**🟡 Important**

**The question.** When a job is given to the housekeeper, may the front desk close it on her behalf? Can any staff member close any job, or only the person it was given to (or their supervisor)?

**Why it matters.** The moment a job is closed, the assistant tells the guest it is done. If anyone can close anything, a well-meaning front-desk person can close a towels job the moment they read the card — and the guest is told towels are on the way when nobody has moved, while the person who was actually meant to deliver them stops being reminded. If only the assignee can close it, jobs sit open when they are actually finished and the assistant keeps apologising for something already sorted.

**What we built meanwhile.** Not built yet, so no rule exists. As designed, any number on the roster could close any job for any villa; we record who closed it but do not restrict who may.

**What changes when you answer.** We encode the real authority rule before we build the 'done' command, so the assistant's 'it's been done' is backed by the right person's word. If the team prefers the open model because they cover for each other, we keep it and stop worrying.

<sub>Answer: _______________________________________________</sub>

---

### Q54. Every staff phone must message the line once before go-live

**🟡 Important**

**The question.** WhatsApp's rules mean we cannot send a staff member a task card unless their number has messaged our business line at least once first. Who will make sure every staff and ops phone does that, and how do we confirm it worked?

**Why it matters.** If a housekeeper never messages the line, her task cards either fail or arrive as stiff templated text — and the guest waits while the assistant believes the card was delivered. It is a silent failure on day one.

**What we built meanwhile.** It is one line on the go-live checklist with no owner and no verification step.

**What changes when you answer.** It becomes a named person's job with a tick-list, and we add a check that refuses to go live until every roster number has an open window — turning a silent failure into a blocked deploy.

<sub>Answer: _______________________________________________</sub>

---

### Q55. Would you rather have every alert, or a digest?

**🟡 Important**

**The question.** Once the alerts are switched on, the ops phone will buzz every time the assistant says 'let me bring the team in' — expect a handful a day at today's volume, and more once staff tasks land. Who is willing to carry that, and is a WhatsApp card the right way? Would they rather have one digest twice a day than a ping each time?

**Why it matters.** If we point the alerts at a person who then mutes the thread because it is noisy, we are back to nobody reading them — but this time we will believe someone is. Alert fatigue is how systems like this quietly stop working, and the failure is invisible from our side.

**What we built meanwhile.** One card per escalation per ops number, with no batching, no quiet hours and no deduplication. We deliberately warned about the volume in the runbook before anyone switches it on.

**What changes when you answer.** We tune it to what the person will actually tolerate: an instant card for anything a guest is waiting on, and a rolled-up digest for the rest. If the answer is 'send everything', we change nothing and this becomes low priority.

<sub>Answer: _______________________________________________</sub>

---

### Q56. Five small questions guests ask that we cannot answer

**⚪ Nice to have**

**The question.** (a) Until what time may a guest's visitors stay? Our policy says visitors must leave by 'the permitted visitor time' without ever saying what it is. (b) Can a booking be put in someone else's name or handed to a friend? (Your website FAQ says not without prior written approval — is that still right?) (c) When a guest leaves something behind, what happens — do we courier it, hold it, who pays? (d) Where do we want a happy guest to leave a review? (e) When a corporate traveller asks for a GST invoice, what do we say and who issues it?

**Why it matters.** None of these is dramatic, but each one is a message the assistant cannot answer and a person has to. The visitor rule is currently enforced without being stateable — a guest asks 'till what time can my friends stay?' and the assistant either escalates or sounds like it is making the rule up. And we lose the review entirely, because nobody has told the assistant where to point people.

**What we built meanwhile.** Nothing on any of them. The visitor-time phrase was dropped as unanswerable; the name-transfer rule was lost when the website FAQ was condensed; post-stay is entirely absent from the assistant's knowledge.

**What changes when you answer.** Five short lines in the FAQ, and the assistant handles all of them forever without troubling anyone. The review one is straightforwardly worth money.

<sub>Answer: _______________________________________________</sub>

---

### Q57. Two numbers we simply guessed

**⚪ Nice to have**

**The question.** (a) If a guest sends more than twenty messages in five minutes, we send one polite 'give me a few minutes to catch up' and then go quiet until they slow down. Is twenty in five minutes really a flood, or is that just an excited family arriving tonight? (b) When a guest has a booking we cannot safely describe, we only pull in a human if that booking falls within the last week or the next six months. How far ahead do people actually book with you — a year out for Christmas?

**Why it matters.** (a) A large family group co-ordinating an arrival can easily fire off twenty short messages — and the moment we go quiet is the moment they most need us. (b) A guest with a cancelled booking eight months out would fall outside our window and get a sales pitch instead of help.

**What we built meanwhile.** A fixed twenty-messages-in-five-minutes limit, and a fixed relevance window of 7 days back and 180 days forward. Both invented by us, based on nothing.

**What changes when you answer.** Two numbers move to match reality. Low stakes either way — worth thirty seconds of the front desk's opinion, not a meeting.

<sub>Answer: _______________________________________________</sub>

---

### Q58. How does a genuinely confused guest get unlocked?

**⚪ Nice to have**

**The question.** If a guest gets their booking reference wrong three times, we lock them out of trying again for a day. If that guest is genuinely ours and genuinely confused, how do they get help, and who is allowed to let them try again?

**Why it matters.** Booking references here are short and near-sequential, so we lock out a phone after three wrong guesses to stop anyone fishing for another guest's booking. But a real guest reading a reference off a crumpled printout can easily miss three times. Today, unlocking them needs a developer. From the guest's side, they are simply stuck talking to a wall.

**What we built meanwhile.** A three-strikes-in-24-hours lockout held in the database so it survives restarts, plus an alert on every failed attempt. Unlocking is a hand-run command in the runbook.

**What changes when you answer.** We give the front desk a way to say 'this is a real guest, let them through' from their phone, and we make sure a locked-out guest is still handed to a human rather than left with nothing.

<sub>Answer: _______________________________________________</sub>

---

## villa team — 14 questions (5 🔴)

> Facts only the people who look after the houses know. These exist in nobody’s database.

### Q59. The real notes for each house (and please delete our two invented ones)

**🔴 BLOCKER for go-live** · already on file as OQ-01

**The question.** For each of the eight homes, what are the practical things a guest actually asks about once they are inside — which bedroom gets the morning sun, which AC is weak, whether there is a generator or inverter when the power cuts and whether it runs the ACs, how good the Wi-Fi really is, whether a caretaker lives on site, how deep the pool is, how the gate or door latch works, and where people actually park? Plain sentences, per house. And urgently: are these two things TRUE? — that Villa B3's second-bedroom air conditioning 'can feel a little weak on very warm nights', and that Apartment 11's balcony gets the morning sun and its bedrooms stay cool all afternoon.

**Why it matters.** This is the single biggest thing a concierge is asked, and nothing on the website will ever carry it. Right now the assistant has exactly TWO notes in its knowledge — the two above — and we invented both, as demo filler. They are not hedged: the assistant states them to guests as plain fact, in Nistula's voice, with total confidence. We may be telling a guest that B3's AC is weak when it is fine, or that Apartment 11's bedrooms stay cool when the balcony faces west. Invented facts in a guest's face is exactly what this whole system was built to prevent, and here we did it ourselves. Every other villa has nothing at all, so guests in the other six houses get a concierge who knows nothing about where they are staying.

**What we built meanwhile.** Two hand-written placeholder notes (Villa B3, Apartment 11), marked as placeholders only in a comment the model never sees — so it receives them as unqualified truths and is explicitly licensed to share them. The other six homes have no notes and the assistant defers.

**What changes when you answer.** The two invented notes are deleted and replaced with the team's real ones, and the other six houses get theirs. The assistant stops deferring on the most common in-stay questions and answers them instantly at 2 am when nobody is at the desk. THIS IS A HARD GO-LIVE GATE: if the team cannot supply real notes before we go live on the real number, we must DELETE both placeholders rather than ship them.

<sub>Answer: _______________________________________________</sub>

---

### Q60. The house manual — Wi-Fi, the geyser, the pool, a power cut

**🔴 BLOCKER for go-live** · already on file as OQ-01

**The question.** Is there a house manual we can have? Wi-Fi network name and password per home, how the AC and geyser and induction hob work, pool rules and pool timings, what to do in a power cut, where the fuse box is, and who to call in an emergency. And a decision for you: when a guest in the villa asks for the Wi-Fi password, may the assistant just tell them — even though we cannot be certain the number belongs to the guest?

**Why it matters.** This is the bread and butter of an in-stay concierge, and every one of these is asked at an hour when the desk is closed. 'What's the Wi-Fi password?' is the single most-asked in-stay question in hospitality, and today it escalates to a human 100% of the time — at midnight, that means 'I'll pass it to the team, they're in after 10 am'. A guest sitting inside our villa waiting until morning for something an assistant should say in one second makes the whole product look broken at exactly the moment they are inside the house.

**What we built meanwhile.** Nothing. There is no house-manual content at all. Every one of these becomes a deferral to a human, and at night, a deferral until 10 am.

**What changes when you answer.** The house manual becomes the assistant's in-stay knowledge and the night-time deferral load largely disappears. This is the highest-volume escalation in the whole system, removed.

<sub>Answer: _______________________________________________</sub>

---

### Q61. Is the amenity list on the villa pages actually true?

**🔴 BLOCKER for go-live** · already on file as OQ-03

**The question.** Our villa pages list the same amenities for all eight homes, and the assistant repeats them to guests as fact: free Wi-Fi, air conditioning, HD TV, a full kitchen with fridge and coffee machine, welcome drinks, room service, laundry and dry cleaning, daily housekeeping, an in-house spa, garden views, a private entrance, contactless check-in and free parking. Is that list actually true — of every home? Do we genuinely have an in-house spa and room service? And is parking really free and guaranteed everywhere, or does it depend on the property and the community's rules (as our own policy says)? How many cars can each home take?

**Why it matters.** These are big promises, made in writing on WhatsApp before the guest pays. A guest books expecting room service and a spa, arrives at a private villa where neither exists — that is a complaint, a refund conversation and a review we will not recover from. 'Does C3 have a coffee machine?' is currently answered 'yes' on the strength of a marketing list nobody checked. And a guest who asks 'can we bring two cars?' is told yes, then arrives in a narrow Assagao lane where the society objects and a car gets towed.

**What we built meanwhile.** The one property-wide list ships for all eight homes, carefully worded ('listed on every villa page') but the assistant will still answer 'yes' to any item on it. Only the pool and breakfast were deliberately withheld. The parking caveat exists in the policy knowledge, but the assistant will most likely lead with 'free parking'.

**What changes when you answer.** Anything that is marketing rather than a real service comes OUT of the assistant's knowledge immediately, and anything real can be stated with confidence. A real parking capacity per home ('two cars in the compound') replaces the blanket claim. This is a fifteen-minute tick-list for someone who runs the properties, and it removes a whole category of promises we cannot keep.

<sub>Answer: _______________________________________________</sub>

---

### Q62. The basic facts of each house: bedrooms, beds, bathrooms, how many people

**🔴 BLOCKER for go-live** · already on file as OQ-08

**The question.** For each of the eight homes: how many bedrooms exactly, what beds are in each one (king, queen, twin, bunk, sofa-bed), how many bathrooms, and how many people can genuinely sleep there — adults and children? Can twins be pushed together? Can we add a mattress or a baby cot? Please confirm the bedroom counts specifically: the website itself flags seven of the eight as unverified guesses — it assumed the three apartments are 2-bedroom and the four Assagao villas are 3-bedroom, and only Siolim's four bedrooms is certain.

**Why it matters.** The assistant states those guessed counts to guests as plain fact in the first sentence of any villa answer — 'a 3-bedroom villa in Assagao, sleeps up to 7'. A family of seven books on it. If an apartment is actually a 1-bedroom, we have told a family it sleeps them and they discover otherwise on arrival. Beds and bathrooms are asked before every group booking and the assistant has to defer every single time, which loses the enquiry at exactly the moment the guest is deciding. And capacity is ambiguous even in our own data: we tell guests an apartment 'sleeps up to 5' while the booking system separately allows two children on top — so is it a 5-person home or a 7-person home? Both answers are defensible from our own records, and one of them means beds on the floor and an argument at check-in.

**What we built meanwhile.** The website's guessed bedroom counts are stated as fact. There is no bed or bathroom information anywhere — the assistant defers. It states only the adult maximum, never the total with children. And a guest who types '2bhk' gets asked to name the villa, because we do not trust the count enough to map it.

**What changes when you answer.** Confirmed counts, beds, bathrooms and a plain total capacity ('sleeps 6 comfortably; up to 8 with children') go into the knowledge, a whole class of pointless escalations disappears from the busiest part of the guest journey, and we switch on the '2bhk' shortcut so a guest who types it gets a price immediately instead of another question.

<sub>Answer: _______________________________________________</sub>

---

### Q63. Can the housekeeping and maintenance staff actually use this?

**🔴 BLOCKER for go-live**

**The question.** Do the housekeeping and maintenance staff use WhatsApp on their own phones? Are they willing to receive work there? Would they reliably read a short card in English and type back a code like 'DONE 4K9XZ2' when a job is finished? If not, how does a job actually get marked complete today?

**Why it matters.** The entire task system assumes a staff member reads an English card on their personal WhatsApp and replies with a code. If the cleaner in Assagao speaks Konkani, does not use a smartphone, or shares a phone, then the assistant will confidently tell a guest 'the team has been informed' while a card sits unread on a phone in a drawer. The guest waits; nobody comes; the assistant keeps nudging a phone nobody reads.

**What we built meanwhile.** The design assumes it works: an English card to each staff member's own number, closed only by a typed code from that exact number. No other language, no other channel, no acknowledgement that a card was even seen.

**What changes when you answer.** If it does not fit how the staff work, we change the design before we build it — a card to a supervisor who relays it by voice, buttons instead of typed codes, or a simplified/vernacular card. Much cheaper to learn over tea now than on go-live day.

<sub>Answer: _______________________________________________</sub>

---

### Q64. The pools

**🟡 Important** · already on file as OQ-09

**The question.** (a) Does the Siolim 4BHK have a pool? Its own description never mentions one — unlike Villa C3 — but the shared amenity list on every villa page says 'private pool'. (b) The three apartments have a 'shared pool'. Shared with whom — only with each other, or with other residents of the complex who have nothing to do with us?

**Why it matters.** (a) A family books Siolim for a pool holiday on the strength of the assistant saying there is one, and arrives to no pool. That is a refund conversation and a review we will not recover from. Meanwhile a guest can be looking at a pool icon on our own website while the assistant refuses to confirm it. (b) A couple books an apartment picturing a quiet morning swim. If the pool is shared with an entire residential building, that is a materially different holiday and a guaranteed complaint.

**What we built meanwhile.** Siolim's entry deliberately mentions no pool at all (the other seven do), so the assistant will not volunteer one — but the property-wide amenity list still says 'private pool', so a direct question could still get the wrong answer. The apartments say 'shared pool' with no explanation of who shares it.

**What changes when you answer.** One word for Siolim, either way: it gains its pool line or the website loses its pool chip. One honest clause for the apartments, which sets the expectation correctly at the point of sale, where it costs us nothing.

<sub>Answer: _______________________________________________</sub>

---

### Q65. How far is the airport, the beach, the town?

**🟡 Important**

**The question.** For Assagao and for Siolim: how far is the airport, the main beaches (Anjuna, Vagator, Ashwem, Baga), Panjim, and the nearest café strip — in kilometres and in realistic drive time? Also the nearest ATM and chemist, if that is easy.

**Why it matters.** 'How far is the airport?' is one of the most frequently asked pre-booking questions in Goa and it decides bookings. The assistant currently says 'the airport is a drive away' — a non-answer that reads as evasive or ignorant. It is forbidden from inventing a number (we caught and deleted an invented 'about an hour out' during review), so it either hedges or fetches a human for a question any host answers in two seconds. A guest comparing us with a listing that says '20 minutes' will simply book the other one.

**What we built meanwhile.** Deliberately vague, honest, useless copy: 'cafés and restaurants a short drive away; the northern beaches within easy reach by car; the airport a drive away.' The neighbourhood distances the website does carry are flagged by the website itself as unverified research snapshots and are NOT in the assistant's knowledge.

**What changes when you answer.** Real distances and drive times go into the knowledge and the assistant answers instantly and correctly. A trivially cheap answer with a disproportionately large effect on how competent we sound — and a direct conversion lever on pre-booking enquiries. It is also the natural place to describe airport pickups, if we arrange them.

<sub>Answer: _______________________________________________</sub>

---

### Q66. Can anyone who cannot manage stairs stay with us?

**🟡 Important**

**The question.** Are any of the homes suitable for a wheelchair user, an elderly parent, or someone on crutches? Is there a ground-floor bedroom, a step-free entrance, a bathroom with a wide door or a grab rail? There is nothing about accessibility anywhere on the website.

**Why it matters.** A family booking for a grandparent will ask, and the honest answer today is silence. If the assistant ever guessed optimistically, we would sell a first-floor bedroom in a house with no lift to someone who cannot climb stairs, and they would discover it on arrival — a ruined holiday, not an inconvenience. If it just defers, we lose an enquiry that a competitor answers in one line.

**What we built meanwhile.** Nothing at all. The assistant has no accessibility knowledge and defers to the team.

**What changes when you answer.** Even a one-line honest answer per home ('B1 has a ground-floor bedroom and a step-free entrance; Siolim does not') lets the assistant answer a high-stakes question truthfully instead of stalling.

<sub>Answer: _______________________________________________</sub>

---

### Q67. What is the housekeeping schedule, in plain words?

**🟡 Important**

**The question.** Does housekeeping come every day? At what time? Do they go into the bedrooms? Can a guest ask them to skip a day? Our policy says only that 'housekeeping runs on the property's schedule'.

**Why it matters.** Guests plan their morning around it, and a couple who did not expect staff walking in at 9 am will be genuinely upset. The assistant currently says 'housekeeping is included, on the property's schedule' — which tells the guest nothing and reads as evasive.

**What we built meanwhile.** The website's 'on the property's schedule' formula, repeated in two places. No actual schedule exists in the assistant's knowledge.

**What changes when you answer.** One line — 'housekeeping comes daily between 10 and 12; tell us if you would rather they skip a day' — turns an evasive answer into a hospitable one.

<sub>Answer: _______________________________________________</sub>

---

### Q68. What can we genuinely arrange, and what does it cost?

**🟡 Important**

**The question.** We advertise, on every villa page and in the assistant's answers, that we can arrange airport transfers, a private chef, experiences, taxis, self-drive and chauffeur cars, and an in-house spa. Are those partners real and reliably bookable? What do they cost — even a rough range? And do we do celebration set-ups: birthday or proposal décor, a cake, flowers?

**Why it matters.** 'How much is a car from the airport?' is asked in almost every pre-arrival conversation, and the assistant can only say 'charges are confirmed in advance', which is a non-answer — so it escalates a question it could close instantly. We are offering a menu with no prices on it. Worse, we may be advertising services we cannot actually deliver: our own acceptance script has the assistant tell a guest planning a proposal that 'our villa team will design this personally'. If the team does not do décor, we have promised a service that does not exist, to someone planning the most important evening of their life.

**What we built meanwhile.** The website's promise ('we can help arrange airport transfers, a chef and experiences through trusted partners') is repeated with no figures and no process, and every question about cost is deferred to a human by the money rule. On a celebration, the assistant congratulates warmly, promises the villa team will handle it, and escalates — it invents no price, but the promise itself is unverified.

**What changes when you answer.** Real prices (or honest ranges and a real process) let the assistant answer, and let us build these into pre-arrival messages — a genuine revenue line, and add-on revenue we currently leave on the table. If the partners are not real, we stop advertising them and correct the promise before it is ever said to a real guest.

<sub>Answer: _______________________________________________</sub>

---

### Q69. How long do things actually take?

**🟡 Important**

**The question.** How long does each kind of request realistically take at Nistula? We have assumed: extra towels within 30 minutes, a front-desk matter within 10 minutes, a maintenance job like a weak AC within 2 hours. Are those the right promises to make?

**Why it matters.** These timers do two things to real people. They set when staff get chased, and they set when the assistant apologises to the guest for the delay. If 30 minutes is unrealistic for a towel run across Assagao, staff get nagged all day and the assistant apologises for lateness that is not late. If it is too generous, the guest sits without towels for two hours while the assistant cheerfully says everything is on track. These are the numbers that decide whether staff experience this system as help or as harassment.

**What we built meanwhile.** The three figures above, invented by us and written into the plan as defaults.

**What changes when you answer.** Three numbers change. Cheap to apply, but only the team knows what is achievable — and 'I've nudged housekeeping' then happens when a guest would genuinely start to wonder, and not before.

<sub>Answer: _______________________________________________</sub>

---

### Q70. Is the villa really ready at 9 am on arrival day?

**🟡 Important**

**The question.** On the morning a guest checks in, is the villa genuinely ready at 9 am? Our welcome message is scheduled to go out at 09:00 saying the villa is ready — though check-in is from 3 pm.

**Why it matters.** If housekeeping is still turning the villa over at 9 am, we have just invited an eager guest to arrive early — and they will. They turn up at 10:30 to a villa mid-clean, and the ₹1,000-an-hour early check-in fee has never been mentioned. A bad morning for the guest and for the team, entirely predictable.

**What we built meanwhile.** A welcome message scheduled for 09:00 on arrival day whose script says the villa is ready. Nobody asked whether that is true at 9 am. (Not built yet — this is easy to change now.)

**What changes when you answer.** Either the send time moves to after the villa is genuinely turned over, or the wording changes to 'we're looking forward to seeing you from 3 pm'. A one-line fix that prevents a recurring problem.

<sub>Answer: _______________________________________________</sub>

---

### Q71. Are these still the eight homes, with these names?

**🟡 Important**

**The question.** Are these still exactly the eight homes we let, and are these the names guests and staff use for them: Apartment 06, Apartment 09, Apartment 11, Villa B1, Villa B3, Villa C1, Villa C3, and the Siolim 4BHK? Has anything been added, sold, taken off the market, or renamed?

**Why it matters.** This list is hardwired into everything. If a villa has come off the market, the assistant will happily quote it and send a booking link. If a new one exists, the assistant has never heard of it. And if staff call B3 something else in conversation, the task cards will confuse them.

**What we built meanwhile.** The eight-villa map taken from the website codebase, treated as verified and frozen in code.

**What changes when you answer.** The map is corrected if anything has changed. If nothing has, we get a dated confirmation — cheap insurance on the one list that every price and every task depends on.

<sub>Answer: _______________________________________________</sub>

---

### Q72. How big is each home?

**⚪ Nice to have**

**The question.** What is the real floor area, in square feet, of each home? The website prints figures that its own code explicitly marks 'UPDATE WITH REAL SQUARE FOOTAGE BEFORE LAUNCH — NOT verified measurements'.

**Why it matters.** Rarely asked, but a group comparing a 3-bed with a 4-bed will ask 'how big is C3?'. The assistant has no answer and cannot use the website's, because they are admitted guesses. Low frequency, real consequence — and it is a fact our own website currently prints while flagging it as untrue.

**What we built meanwhile.** Floor areas were never loaded into the assistant's knowledge, so it cannot state one — it defers.

**What changes when you answer.** The real areas go into the villa facts and the assistant can answer a size comparison. Genuinely low priority — nothing breaks without it.

<sub>Answer: _______________________________________________</sub>

---

## website — 6 questions (1 🔴)

> Things on the website that contradict us, or that are placeholder content.

### Q73. The website has an unprotected page that creates real bookings

**🔴 BLOCKER for go-live** · already on file as OQ-18

**The question.** On the website there is a hidden 'debug' web address that can create a REAL booking in eZee — no password, no login, and it works on the live site. It can also skip the 'TEST' label that normally marks fake bookings, and the 'bookings are paused' switch does not stop it. Should this be gated off before the concierge goes live?

**Why it matters.** Anyone who finds that address can create a booking that holds real inventory, that no guest ever made and no payment backs. Our concierge mirrors every booking eZee holds and treats it as real — so it would happily message a phantom guest about a phantom stay, and would show those dates as taken to a real guest who wanted them. This is not a concierge problem; it is a hole in the website that the concierge makes visible and consequential.

**What we built meanwhile.** Nothing on our side — we cannot tell a fake booking from a real one, by design. The concierge ships regardless.

**What changes when you answer.** Someone puts a password or an environment check on the debug route, and makes the 'bookings paused' switch actually global. Strongly recommended before the real WhatsApp number is live.

<sub>Answer: _______________________________________________</sub>

---

### Q74. The 'from ₹X' prices on the villa pages are placeholders

**🟡 Important**

**The question.** The starting prices shown on each villa page ('from ₹X per night') are placeholder figures — the website's own code says so, and says they are never used for a real booking. What are the real starting rates, and when do the placeholders come off the site?

**Why it matters.** A guest reads 'from ₹18,000' on the villa page, messages us, and the assistant quotes the real live price from the booking system — which could be very different. The guest then says 'but your website says ₹18,000'. The assistant is forbidden from negotiating or stating any price that did not come from the live system, so it will hold the line on a number the guest feels was a bait-and-switch. That is an argument we will lose, and it starts on our own website — and it directly contradicts the brand's central promise that the price you see is the price you pay.

**What we built meanwhile.** The assistant never uses the website's 'from' prices — every figure it states comes from the live booking system, verbatim. So it is truthful, but it will silently contradict the villa page the guest is looking at, and it has no line to handle 'but your site said X'.

**What changes when you answer.** Either real starting rates go on the website so the two agree, or the placeholders come off. Separately, the assistant could be given an honest line for the 'but your site said X' conversation — today it has none.

<sub>Answer: _______________________________________________</sub>

---

### Q75. The villa descriptions on the site are filler

**🟡 Important** · already on file as OQ-11

**The question.** The descriptions of each home on the website were written as plausible-sounding placeholder copy — the site's own code says so — and nobody has confirmed any of them against the real house. When will the real copy exist, written by someone who has actually stood in each one, and can we have it?

**Why it matters.** When a guest asks 'tell me about C3', the assistant recites text a machine invented to sound nice. It contains no invented hard facts, but it also contains nothing true and specific — so our concierge sounds like a brochure instead of someone who knows the house. Every villa reads the same.

**What we built meanwhile.** The placeholder copy is used as-is, deliberately kept free of specific claims. The 'placeholder' flag lives in the source data but never reaches the assistant.

**What changes when you answer.** We re-run the website content export and the assistant's villa descriptions become real. This is the difference between a concierge that sells and one that recites.

<sub>Answer: _______________________________________________</sub>

---

### Q76. Four villas are shown using another villa's photographs

**🟡 Important**

**The question.** Villas B1, B3, C1 and the Siolim house are displayed on the website using Villa C3's photographs as a stand-in. When will each home have its own pictures? And separately: should the concierge ever send a guest a photo at all?

**Why it matters.** A guest books B1 having fallen for C3's pool with its water feature, and arrives at a different house. That complaint lands in the WhatsApp line, and the assistant will be reassuring someone whose expectation we ourselves created — and it will have no idea what they mean by 'the water feature in the photos', because our knowledge correctly says B3 has a plain pool. The mismatch lands as a lie at the worst possible moment: check-in.

**What we built meanwhile.** The assistant never sends photos and makes no visual claims, and it describes each villa's own pool honestly — so it does not repeat the error, but it also cannot explain or defuse it. The wrong photos remain live on the website.

**What changes when you answer.** Real photos per home fix the expectation gap at source. If Nistula also wants the concierge to send photos on request, that becomes a small separate build.

<sub>Answer: _______________________________________________</sub>

---

### Q77. The 'Breakfast' chip on the villa pages contradicts our own terms

**🟡 Important** · already on file as OQ-07

**The question.** The website shows a 'Breakfast' amenity and a 'Breakfast sorted' banner on the villa pages, but the booking terms and the FAQ say the rate is accommodation only — and the booking engine cannot even sell a breakfast rate. Can the chip and the banner come off?

**Why it matters.** A guest reads 'Breakfast sorted' on our own site, books, then asks us what time breakfast is and is told there isn't any. The assistant is right and the website is wrong, but the guest experiences it as us going back on our word — and no guardrail of ours can protect against the website's own copy.

**What we built meanwhile.** We fixed our side: the assistant answers 'the tariff is for accommodation only unless meals are specifically listed in your booking confirmation', verbatim from the published terms, and it will never say breakfast is included. (Our audit also proved breakfast cannot be booked at all — the booking engine always sends the room-only rate plan.) The website's contradiction remains live.

**What changes when you answer.** The chip and the banner come off the villa pages. Nothing changes on our side — but the guest stops being told two different things. If breakfast IS offered on request, tell us the price and the assistant can answer properly instead of declining.

<sub>Answer: _______________________________________________</sub>

---

### Q78. Several people on the website are not real

**🟡 Important**

**The question.** The guest testimonials use invented names over stock faces; the 'Notes from the Designer' card on every villa page shows a stock photo with a made-up host name; the team wall is mostly stock photos with guessed names; and the press mentions are placeholders. When are they replaced — and until then, what should the concierge say if a guest mentions one?

**Why it matters.** A guest reads a glowing review from 'Priya S.' and asks us about it. Or asks to meet the designer, by the made-up name they saw on the villa page they booked. The assistant must never confirm any of these as real people — and it currently has no idea they exist. Beyond us: a guest who works out that our reviews are invented will not book.

**What we built meanwhile.** None of this content was ever loaded into the assistant's knowledge, so it cannot quote a fake testimonial — but it also cannot recognise one, and would simply say it will check with the team.

**What changes when you answer.** Real people and real reviews give the assistant genuine social proof it can use in a pre-booking conversation. Until then this stays a website pre-launch must-fix, and we deliberately leave the assistant blind to it.

<sub>Answer: _______________________________________________</sub>

---

## Deliberately NOT asked

These came up in the sweep and were dropped on purpose — recorded so nobody re-raises them.

- **Is breakfast included, and on which rate plan (room-only or with breakfast)?**
  - ALREADY ANSWERED and closed (OQ-07, docs/open-questions.md:124-130, resolved 2026-07-13 by the website codebase audit): the booking engine never selects a plan and always sends the room-only rate, so breakfast is not sellable at all. The assistant already answers this correctly, word for word from the published terms. The only thing still open is the WEBSITE's contradictory 'Breakfast' chip and banner — kept as a website item, not re-asked of the business.
- **Which eZee rate-plan code means 'with breakfast'? (the rate-plan → meal-plan mapping)**
  - ALREADY ANSWERED and closed (OQ-16, docs/open-questions.md:178-189): the answer is 'do not build the mapping — it does not reliably exist'. Not a business question, and the decision is permanent.
- **The project plan's description of the pricing service (field names, and treating a 'minimum nights' response as an error) does not match the real live service — fold the corrections back into the plan.**
  - PURE ENGINEERING DEFERRAL, not a business question (OQ-14). The code was built against the real service, so nothing a guest sees is affected; it is plan hygiene, ours to fix, and out of scope for a document sent to the villa team. Left on file in docs/open-questions.md for the planning chat.
- **Every new conversation defaults to the AI answering automatically — is that the launch posture you want?**
  - FACTUALLY WRONG as stated, so not asked in that form. Verified in src/config.ts:68-69: DRAFT_MODE defaults to true and the auto-send list is empty, so nothing is ever sent to a guest without a human today. The database default of 'AI active' only means the AI is not paused by a human — it does not mean messages send. The genuine business question (what the day-one posture should be, who approves drafts, what unlocks auto-send) is kept and merged into 'Day one: does the assistant reply on its own, or does a person approve every message?'.

---

<sub>Compiled from the codebase, plan.md, progress.md, the knowledge base and the build log.
Every question traces to a real fail-closed default in the code. Nothing here was invented to pad the list.</sub>