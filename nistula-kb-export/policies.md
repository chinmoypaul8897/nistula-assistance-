# Nistula KB Export — Policies (VERBATIM)

All policy, fee, timing, and legal text below is copied **verbatim** from the code / source doc,
each under its own heading, with the source `path:line`. Where the on-site FAQ (`src/content/faq.ts`)
and the source-of-truth doc (`nistula-policies.md`) both cover a rule, both are quoted so the exact
guest-facing wording and the fuller policy wording are each preserved.

**Sources & precedence.** `nistula-policies.md` (repo root) is the **declared single source of
truth** for all Nistula guest policies, fees, timings, and rules; the on-site FAQ (`src/content/faq.ts`),
the booking-flow check-in/out times (`src/content/policies.ts`), and the legal pages
(`src/content/legal/*.ts`) all derive from it. When they disagree, the source doc wins
(`nistula-policies.md:3`). Entity: **Nistula Reality Solutions Private Limited**, Amado Vistas,
Bouta Waddo, Assagao, Bardez, Goa 403507 · nistula.life · +91 88103 58517 · @nistula.official
(`nistula-policies.md:5`). "Nistula" and "Nistula Life" are the same entity (`nistula-policies.md:7`).

---

## Quick reference — fees & timings (verbatim table, `nistula-policies.md:13-27`)

| Item | Value |
| --- | --- |
| Check-in | from **3:00 PM** |
| Check-out | by **12:00 PM** |
| Early check-in | subject to availability, **INR 1,000 / hour** |
| Late check-out | subject to availability, charged additionally; not guaranteed unless confirmed in writing |
| Extra adult | **INR 1,500 / night** |
| Extra child (under 12) | **INR 750 / night** |
| Children per bedroom (complimentary) | up to **2 children under 12**; beyond that **INR 750 / child** |
| Quiet hours | **10:00 PM – 8:00 AM** |
| Security deposit | refundable; amount per booking; refunded after check-out inspection less deductions |
| Booking deposit | based on the room rate × nights booked; required to confirm every booking |
| Accepted ID | Aadhaar, Passport, Driving Licence, Voter ID (**PAN not accepted** as address proof) |

> **Cancellation (direct bookings) at a glance** (`nistula-policies.md:27`): 15+ days before arrival → full advance refund · 7–15 days → 50% of advance deducted · within 7 days → 100% of advance charged · early departure → 100% of booked value, no refund · **22 Dec – 2 Jan stays are non-refundable**.

---

## Check-in / check-out times

**Booking-flow values** (`src/content/policies.ts:12-13`):
- `checkInTime: "3:00 pm"`
- `checkOutTime: "12:00 pm"`

**Policy-accordion wording** (verbatim, `src/content/policies.ts:16-18`):
> Check-in is from 3:00 pm and check-out is by 12:00 pm. Earlier check-in or a later check-out can sometimes be arranged, subject to availability — early check-in may be charged at INR 1,000 per hour.

**On-site FAQ** (verbatim, `src/content/faq.ts:76-83`):
> **Q: What are the check-in and check-out times?**
> A: Check-in is from 3:00 PM and check-out is by 12:00 PM.
>
> **Q: Can I check in early or check out late?**
> A: Both are subject to availability. Early check-in may be charged at INR 1,000 per hour; late check-out may be charged additionally and can't be guaranteed unless we've confirmed it in writing.

**Source-of-truth check-in guidelines** (verbatim, `nistula-policies.md:87-99`):
> - Check-in from **3:00 PM**.
> - Early check-in subject to availability, may be charged **INR 1,000 / hour**.
> - Check-out by **12:00 PM**.
> - Late check-out subject to availability, charged additionally; not guaranteed unless confirmed in writing.
> - All adult guests submit valid government photo ID before/at check-in.
> - Foreign nationals: valid passport and visa details mandatory per Indian regulations.
> - Complete pre-arrival formalities (guest details, ID, balance payment, security deposit) before arrival for a smooth check-in.
> - The primary guest must be present at check-in unless approved otherwise in writing.
> - On arrival, Guest Relations may conduct a walkthrough (keys/access, Wi-Fi, appliances, pool rules, housekeeping schedule, kitchen use, house rules, emergency contacts).
> - Inspect the property at check-in and report any visible damage/missing item/concern immediately.
> - Check-in may be delayed if guest details, payment, deposit, or ID verification are incomplete.
> - Outside visitors may not stay overnight unless approved and registered.
> - Nistula Life may deny check-in for invalid ID, booking mismatch, unpaid dues, misrepresentation, intoxication, aggressive behaviour, or law/policy violation.

---

## ID required at check-in

**On-site FAQ** (verbatim, `src/content/faq.ts:84-91`):
> **Q: What do I need to bring for check-in?**
> A: A valid government photo ID for every adult guest — Aadhaar, Passport, Driving Licence, or Voter ID (a PAN card isn't accepted as address proof). Foreign nationals will need a valid passport and visa.
>
> **Q: Does the lead guest need to be present?**
> A: Yes — the primary guest should be present at check-in, unless we've approved otherwise in writing beforehand.

**Source of truth** (verbatim, `nistula-policies.md:35`):
> Government-approved photo ID is mandatory for all adult guests at check-in. Accepted: Aadhaar, Passport, Driving Licence, Voter ID. **PAN is not accepted as address proof.**

---

## Security deposit (exact wording)

**On-site FAQ** (verbatim, `src/content/faq.ts:33-34`):
> **Q: Is a security deposit required?**
> A: A refundable security deposit may be collected before or at check-in. It covers any damage, missing items, breakage, excessive cleaning, or unpaid charges, and is released after the check-out inspection — less any deductions — as per our banking timelines.

**Source of truth** (verbatim, `nistula-policies.md:50`):
> A refundable **security deposit** may be required before/at check-in — used to cover damage, missing items, breakage, excessive cleaning, rule violations, unpaid bills, or other recoverable charges. Released/refunded after the check-out inspection (less deductions) per Nistula Life's process and banking timelines.

**Quick-reference line** (verbatim, `nistula-policies.md:23`):
> Security deposit | refundable; amount per booking; refunded after check-out inspection less deductions

**Legal (Booking terms) wording** (verbatim, `src/content/legal/terms.ts:24`):
> A refundable security deposit may be required before or at check-in; it's released after the check-out inspection, less any deductions, per our process and banking timelines.

---

## Booking deposit & payment terms (exact wording / formula)

**Booking deposit formula — source of truth** (verbatim, `nistula-policies.md:81-83`, "Billing and Booking Policy"):
> - A deposit is required to confirm every booking.
> - The deposit is calculated on the room rate for the number of nights booked.
> - This deposit requirement applies to all bookings.

**Quick-reference line** (verbatim, `nistula-policies.md:24`):
> Booking deposit | based on the room rate × nights booked; required to confirm every booking

**On-site FAQ — how a booking is confirmed** (verbatim, `src/content/faq.ts:29-30`):
> **Q: How do I confirm a booking?**
> A: A reservation is confirmed only once we've received the advance deposit and sent you a written booking confirmation. The deposit is based on the room rate for the number of nights booked.

**On-site FAQ — what the tariff includes** (verbatim, `src/content/faq.ts:37-38`):
> **Q: What does the room tariff include?**
> A: The tariff is for the accommodation only, unless meals, transport, an airport transfer, a chef or butler, experiences, or other add-ons are specifically listed in your booking confirmation. Taxes, platform and payment-gateway fees, and statutory levies apply where relevant.

**Legal (Booking terms) — booking & payment** (verbatim, `src/content/legal/terms.ts:19-28`):
> A reservation is confirmed only after the required advance payment and a written confirmation from Nistula or the booking platform.
> - A deposit is required to confirm every booking, calculated on the room rate for the number of nights booked.
> - Any balance is due before check-in, or per the schedule in your confirmation.
> - A refundable security deposit may be required before or at check-in; it's released after the check-out inspection, less any deductions, per our process and banking timelines.
> - Taxes, platform fees, service charges, payment-gateway charges, and statutory levies may apply.
> - The room tariff covers accommodation only, unless meals, transport, transfers, experiences, or other add-ons are specifically included in your confirmation; extra services during the stay are billed separately.
> - Rates, offers, and inclusions may change before confirmation; once confirmed, the written confirmation governs.
> - Bookings can't be transferred, resold, sublet, or assigned without prior written approval.

**Source of truth — billing points** (verbatim, `nistula-policies.md:48-54`):
> - A reservation is confirmed only after the required advance payment **and** written booking confirmation from Nistula Life or the booking platform.
> - Balance payment, if any, must be completed before check-in or per the schedule in the booking confirmation.
> - [security deposit — see above]
> - Room tariff is for accommodation only unless meals, transport, airport transfer, experiences, chef/butler service, F&B, or other add-ons are specifically included in the confirmation.
> - Taxes, platform fees, service charges, payment-gateway charges, and statutory levies may apply.

**Payments (privacy page)** (verbatim, `src/content/legal/privacy.ts:44`):
> Payments are handled by our payment provider, Razorpay. We never see or store your full card details — they go directly to the provider.

---

## Cancellation policy (full terms, VERBATIM)

**Source of truth — the deduction table** (verbatim, `nistula-policies.md:73-77`):
> - **15+ days** before arrival → no deduction except the items above (if applicable by channel/OTA); **full refund** of the advance guarantee deposit.
> - **7–15 days** before arrival → **50%** of the advance deposit deducted, balance refunded.
> - **Within 7 days** of arrival → **100%** of the advance deposit charged as penalty.
> - **Early departure** vs the contracted stay → **100% of the booked value** applied, no refund.
> - **Stays from 22 December to 2 January are NON-REFUNDABLE** — any modification/cancellation incurs full-stay charges.

**On-site FAQ — cancellation** (verbatim, `src/content/faq.ts:51-68`):
> **Q: What is the cancellation policy?**
> A: For direct bookings: cancel 15 or more days before arrival for a full refund of the advance deposit; 7 to 15 days before, 50% of the advance is deducted; within 7 days, the full advance is charged. An early departure is charged at 100% of the booked value.
>
> **Q: Are there non-refundable dates?**
> A: Stays from 22 December to 2 January are non-refundable — any change or cancellation incurs the full stay charge. Peak season, long weekends, and festival dates may carry stricter terms.
>
> **Q: How are refunds processed?**
> A: Any refund goes back only to the original payment method or account. Payment-gateway, bank, and OTA/platform charges, and applicable taxes, may be non-refundable.
>
> **Q: Can I change my dates?**
> A: Date changes are subject to availability, any tariff difference, and our approval, so they can't be guaranteed — but we'll always try to help.
>
> **Q: I booked through another platform — whose policy applies?**
> A: For bookings made through an OTA or third-party platform, that platform's cancellation and refund policy applies, and we may not be able to override it.

**Legal (Cancellation & refunds) page** (verbatim, `src/content/legal/cancellation.ts:18-59`):
> *At a glance (direct bookings):*
> - 15 or more days before arrival — full refund of the advance deposit.
> - 7 to 15 days before arrival — 50% of the advance deposit is deducted; the balance is refunded.
> - Within 7 days of arrival — 100% of the advance deposit is charged.
> - Early departure from the booked stay — 100% of the booked value applies, with no refund.
> - Stays from 22 December to 2 January are non-refundable — any change or cancellation incurs full-stay charges.
>
> *How refunds work:*
> - Refunds, where applicable, are processed only to the original payment method or account.
> - Payment-gateway, bank, OTA/platform charges, and applicable taxes may be non-refundable.
> - Non-refundable, promotional, festive, long-stay, last-minute, or special-package rates may not be eligible for a refund.
> - There's no refund for late arrival, unused nights or services, change of plans, weather, travel disruption, or a no-show — unless approved by Nistula in writing.
>
> *Changing your dates:*
> - Date changes are subject to availability, any tariff difference, seasonality, and approval — they aren't guaranteed.
> - Peak season, long weekends, festivals, and high-demand dates may carry stricter terms.
>
> *Circumstances beyond control:* If something genuinely beyond anyone's control intervenes — a natural disaster, government restriction, or similar — your booking may be rescheduled or handled per the policy applicable at the time.
>
> *Bookings made through other platforms:* For bookings made via an OTA or third party (Booking.com, Airbnb, and the like), that platform's cancellation and refund policy applies, and Nistula may not be able to override it.
>
> *How to cancel or change:* To cancel or change a booking, contact Guest Relations with your reservation reference using the details in your confirmation, and we'll take it from there.

**Source of truth — additional cancellation clauses** (verbatim, `nistula-policies.md:64-72`):
> - For direct bookings, cancellation charges apply per the terms in the booking confirmation.
> - Refunds (if applicable) are processed only to the original payment method/account.
> - Payment-gateway, bank, OTA/platform charges, and applicable taxes may be non-refundable.
> - Non-refundable, promotional, festive, long-stay, last-minute, or special-package rates may not be eligible for a cancellation refund.
> - No refund for early check-out, late arrival, unused nights/meals/services, change of plan, weather, flight/train cancellation, personal emergencies, illness, or no-show — unless approved by Nistula Life in writing.
> - Date changes are subject to availability, tariff difference, seasonality, and approval; not guaranteed.
> - Peak season, long weekends, festival dates, Christmas/New Year, and high-demand dates may carry stricter terms.
> - Force majeure (natural disaster, government restriction, law-and-order, pandemic restriction, or events beyond control) → booking may be rescheduled or handled per the policy applicable at the time.
> - For OTA/third-party bookings, that platform's cancellation/refund policy applies; Nistula Life may not be able to override it.

---

## Children

**On-site FAQ** (verbatim, `src/content/faq.ts:103-104`):
> **Q: Are children welcome?**
> A: Very much so. Up to two children under 12 can share a bedroom; beyond that, an extra charge of INR 750 per child applies. Children should be supervised at all times, especially around the pool.

**Policy accordion** (verbatim, `src/content/policies.ts:22-23`):
> Children are welcome. Up to two children under 12 can share a bedroom; beyond that an extra charge of INR 750 per child applies.

**Source of truth** (verbatim, `nistula-policies.md:118-119`):
> - **Up to 2 children under age 12 per bedroom**; beyond that, **INR 750 per child**.
> - Children must be supervised at all times (pools, balconies, stairs, kitchens, bathrooms, glassware, electrical points, outdoor areas).

---

## Extra-guest charges

**On-site FAQ** (verbatim, `src/content/faq.ts:99-107`):
> **Q: How many guests can stay?**
> A: The total number of guests must not exceed the occupancy on your booking confirmation. Any extra guest, child, or visitor should be disclosed and approved in advance.
>
> **Q: What are the extra-guest charges?**
> A: An extra adult is INR 1,500 per night and an extra child (under 12) is INR 750 per night, within the property's maximum occupancy.

**Source of truth** (verbatim, `nistula-policies.md:128`):
> **Extra adult: INR 1,500 / night. Extra child (under 12): INR 750 / night.**

---

## Pets

**On-site FAQ** (verbatim, `src/content/faq.ts:115-116`):
> **Q: Are pets allowed?**
> A: Pets are welcome only at properties where a pet stay has been specifically approved in writing. Any pet-related cleaning or damage may be chargeable.

**Policy accordion** (verbatim, `src/content/policies.ts:27-28`):
> Pets are welcome only at properties where a pet stay has been approved in writing in advance.

**Source of truth** (verbatim, `nistula-policies.md:127`):
> **Pets** allowed only at properties where pet stay is specifically approved in writing; pet-related cleaning/damage/disturbance/community issues may be chargeable.

---

## Parties & events

**On-site FAQ** (verbatim, `src/content/faq.ts:125-126`):
> **Q: Are parties or events allowed?**
> A: The villas are for quiet, restful stays, so loud music, parties, DJ setups, events, and commercial shoots aren't permitted without our prior written approval.

**Policy accordion** (verbatim, `src/content/policies.ts:32-33`):
> The villas are for quiet stays, so parties and events aren't permitted without our prior written approval.

**Source of truth** (verbatim, `nistula-policies.md:37`):
> Loud music, parties, DJ setups, events, commercial shoots, or gatherings are not allowed without prior written approval from Nistula Life.

---

## Smoking

**On-site FAQ** (verbatim, `src/content/faq.ts:133-134`):
> **Q: Is smoking allowed?**
> A: Not inside bedrooms, bathrooms, living rooms, or any enclosed indoor area. Smoking may be allowed only in designated outdoor areas, subject to the property's rules.

**Policy accordion** (verbatim, `src/content/policies.ts:37-38`):
> Smoking isn't permitted indoors. It may be allowed in designated outdoor areas, subject to the property's rules.

**Source of truth** (verbatim, `nistula-policies.md:39`):
> Smoking is not allowed inside bedrooms, bathrooms, living rooms, or enclosed indoor areas. It may be permitted only in designated outdoor areas, subject to property-specific rules.

---

## Quiet hours

**On-site FAQ** (verbatim, `src/content/faq.ts:129-130`):
> **Q: What are the quiet hours?**
> A: Please keep noise low between 10:00 PM and 8:00 AM, out of respect for neighbours and the community.

**Policy accordion** (verbatim, `src/content/policies.ts:42-43`):
> We ask guests to keep noise low between 10:00 pm and 8:00 am, out of respect for the neighbours.

**Source of truth** (verbatim, `nistula-policies.md:38`):
> Quiet hours: **10:00 PM to 8:00 AM**, in consideration of other guests, neighbours, and community residents.

---

## Visitors

**On-site FAQ** (verbatim, `src/content/faq.ts:111-112`):
> **Q: Can friends visit during our stay?**
> A: Visitors are welcome with prior approval, may be asked to share an ID, and should leave by the permitted visitor time. Overnight stays by unregistered guests aren't allowed.

**Source of truth** (verbatim, `nistula-policies.md:122-123`):
> - Visitors only with prior approval; may need to share ID; must leave by the permitted visitor time.
> - Overnight stay by unregistered guests is not permitted.

---

## Other house rules

**On-site FAQ — cook / vendors** (verbatim, `src/content/faq.ts:137-138`):
> **Q: Can I bring my own cook or vendors?**
> A: Outside cooks, decorators, photographers, masseurs, or event staff aren't permitted inside the property without prior approval — but we're glad to arrange trusted partners for you.

**On-site FAQ — damage** (verbatim, `src/content/faq.ts:141-142`):
> **Q: What happens if something is damaged?**
> A: Please treat the home with care and tell Guest Relations about any breakage or maintenance issue right away. Damage, missing items, or excessive cleaning may be charged, usually against the security deposit.

**On-site FAQ — transferring a booking** (verbatim, `src/content/faq.ts:41-42`):
> **Q: Can I transfer my booking to someone else?**
> A: Bookings can't be transferred, resold, sublet, or assigned to another person without our prior written approval.

**Source of truth — additional house rules** (verbatim, `nistula-policies.md:40-47`):
> - Illegal substances, unlawful activities, or behaviour causing nuisance/damage/threat/disturbance may result in immediate cancellation of stay without refund.
> - Guests must take care of furniture, linen, towels, glassware, appliances, décor, kitchenware, electronics, and pool/property equipment. Damage, breakage, missing items, excessive cleaning, or misuse may be charged to the guest.
> - Nistula Life is not responsible for loss of personal belongings, valuables, jewellery, cash, documents, or electronics left unattended.
> - Housekeeping is provided per the property schedule. Linen/towel change, deep cleaning, and additional housekeeping are subject to Nistula Life's operating policy and availability.
> - Any maintenance issue must be reported to Guest Relations immediately.
> - Outside vendors, cooks, decorators, photographers, service providers, masseurs, drivers, or event personnel are not permitted inside the property without prior approval.
> - Use water, electricity, AC, geysers, pool lights, and appliances responsibly; switch off when not in use.
> - Nistula Life may refuse service, restrict access, recover charges, or terminate the stay for rule violations, safety concerns, misuse, or misconduct.

---

## Parking & arrival

**On-site FAQ** (verbatim, `src/content/faq.ts:173-183`):
> **Q: Is parking available?**
> A: Parking depends on the property and the community's rules; please use only the designated areas. We aren't responsible for damage, theft, towing, or challans relating to guest vehicles.
>
> **Q: How do I find the property on arrival?**
> A: Share your expected arrival time with Guest Relations and we'll send an accurate location pin and arrival guidance. Entry into gated communities may need a quick society or security verification.
>
> **Q: Can my driver stay over?**
> A: Drivers, chauffeurs, and external staff may not stay inside the villa unless this has been specifically approved in advance.

**Source of truth** (verbatim, `nistula-policies.md:103-112`):
> - Share expected arrival time with Guest Relations in advance.
> - Parking depends on the property/category/community rules; park only in designated areas.
> - Nistula Life is not responsible for damage, theft, challan, towing, or loss relating to guest vehicles parked inside or outside.
> - Drivers, chauffeurs, and external staff may not stay inside the unit unless specifically approved.
> - Coordinate with Guest Relations for an accurate location pin and arrival guidance.
> - Vehicle details may be requested before/at arrival for security and community management.
> - Entry into gated communities/complexes may be subject to society/security verification.
> - Don't block internal roads, neighbouring gates, common areas, emergency access, or other residents' parking.
> - Transport/airport pick-up/taxi/self-drive/scooter/chauffeur arranged by Nistula Life is via third-party partners; charges and availability vary.
> - Nistula Life may assist with coordination, but safety, luggage, timing, waiting charges, and service terms remain with the provider.

---

## Amenities & services (availability caveats)

**On-site FAQ** (verbatim, `src/content/faq.ts:151-165`):
> **Q: Is housekeeping included?**
> A: Yes — housekeeping is provided on the property's schedule. Linen and towel changes, deep cleaning, and any additional housekeeping follow our operating policy and availability.
>
> **Q: How do I report a maintenance issue?**
> A: Just let the Guest Relations team know as soon as you notice it, and we'll attend to it as quickly as we can.
>
> **Q: Will Wi-Fi, power, and the pool always be available?**
> A: Amenities like Wi-Fi, power, water, the pool, and appliances are subject to operational availability. We make every reasonable effort to resolve issues, though some things — power cuts, outages, weather — are beyond our control.
>
> **Q: Can you arrange transport, a chef, or experiences?**
> A: We're happy to help coordinate airport transfers, taxis, self-drive or chauffeur cars, a private chef, and other experiences through trusted partners. Charges and availability vary and are confirmed in advance.

---

## Reservation terms & liability (source of truth, verbatim `nistula-policies.md:130-145`)

> - Confirming a reservation = agreeing to the booking terms, cancellation policy, payment terms, property rules, house rules, and community guidelines.
> - The booking is valid only for the guest name, dates, property/unit, occupancy, rate, and inclusions in the confirmation.
> - Amendments (dates, guest count, property type, duration, package, inclusions, services) are subject to availability, tariff difference, and written approval.
> - Nistula Life may collect IDs, payment proof, security deposit, vehicle details, and guest info for operational/legal/safety purposes.
> - Guests must comply with all applicable laws, local regulations, community rules, and safety instructions.
> - Unlawful/commercial activity, paid events, shoots, parties, gambling, nuisance, or undisclosed activity is strictly prohibited.
> - Nistula Life may enter the property with reasonable notice for housekeeping, maintenance, emergency, inspection, safety, or service; **without notice** in an emergency/safety risk/suspected damage/leak/electrical/fire/security/rule-violation situation.
> - Guests are liable for damage, loss, breakage, missing inventory, excessive cleaning, unpaid bills, penalty, neighbour complaint, society fine, or legal cost arising from their stay/conduct.
> - Amenities (Wi-Fi, electricity, water, pool, appliances, TV, AC, geyser, elevator, parking, third-party services) are subject to operational availability; reasonable efforts to resolve, but no guarantee where beyond control.
> - Nistula Life is not liable for inconvenience/delay/loss/disruption from power cuts, internet outages, weather, government action, third-party failure, society restrictions, road closures, strikes, natural events, or other circumstances beyond control.
> - Report grievances to Guest Relations during the stay so Nistula Life can resolve them.
> - Any refund/waiver/compensation/goodwill adjustment is at Nistula Life's discretion and must be confirmed in writing.
> - In disputes, the records of booking confirmation, payment, guest communication, PMS entries, inspection reports, and written communication are relied upon.
> - Nistula Life may update policies from time to time; the policy applicable to a booking is the one communicated/displayed at reservation, unless law/platform rules require otherwise.

---

## Guest data & privacy (verbatim, `src/content/legal/privacy.ts`)

> - **What we collect** (`privacy.ts:19-27`): "When you make a booking or send us an enquiry, we collect the details you give us — your name, contact details, the dates and villa you're interested in, and any requests you add." Plus: government photo ID at check-in (Aadhaar/Passport/Driving Licence/Voter ID) for every adult; for foreign nationals, passport and visa details; payment and booking details; vehicle details where needed.
> - **How we use it** (`privacy.ts:31-32`): "We use these details to answer your enquiry, manage your booking, and stay in touch about your stay — and to meet legal, safety, and community-access requirements. We don't sell your information, and we don't use it for unrelated marketing."
> - **ID & verification** (`privacy.ts:37-38`): "Valid government photo ID is mandatory for all adult guests at or before check-in; PAN is not accepted as address proof. We may decline check-in where ID is invalid or the details don't match the booking."
> - **Payments** (`privacy.ts:44`): "Payments are handled by our payment provider, Razorpay. We never see or store your full card details — they go directly to the provider."
> - **Analytics** (`privacy.ts:50`): "We use Plausible, a privacy-friendly analytics tool that sets no cookies and doesn't track you across other sites. It tells us which pages are useful, not who you are."
> - **Your choices** (`privacy.ts:68`): "You can ask us what we hold about you, ask us to correct it, or ask us to remove it. Use the details in your booking confirmation or on the site, and we'll help."

> **Note:** the privacy page is flagged `placeholder: true` / "have it reviewed by counsel before launch" (`src/content/legal/privacy.ts:4,9`).

---

## Changelog note

`nistula-policies.md` records (`nistula-policies.md:151`): **2026-06-22** — Created from
`Nistula_Guest_Policies.pdf`; established as the source of truth. Legal pages `terms` and
`cancellation` last updated **2026-06-28** (`terms.ts:14`, `cancellation.ts:14`).
