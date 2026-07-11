# Nistula KB Export — FAQ

Every FAQ item from the on-site villa-detail FAQ ("You got questions? We got answers."), transcribed
**verbatim**. Source: `src/content/faq.ts` — **7 categories, 30 Q&A**, rendered by
`src/components/villa/VillaGoodToKnow.tsx`. Derives from the `nistula-policies.md` source of truth.
The same FAQ appears on every villa page. (The 6-row policy accordion in `src/content/policies.ts` is
FAQ-like but is a strict subset of the below and of `policies.md` — not repeated here. The separate
**owners FAQ** in `src/components/blocks/owners/OwnersFaq.tsx` is B2B, not guest-facing — see GAPS.md.)

---

## Booking & payment (`src/content/faq.ts:24-45`)

**Q:** How do I confirm a booking?
**A:** A reservation is confirmed only once we've received the advance deposit and sent you a written booking confirmation. The deposit is based on the room rate for the number of nights booked.

**Q:** Is a security deposit required?
**A:** A refundable security deposit may be collected before or at check-in. It covers any damage, missing items, breakage, excessive cleaning, or unpaid charges, and is released after the check-out inspection — less any deductions — as per our banking timelines.

**Q:** What does the room tariff include?
**A:** The tariff is for the accommodation only, unless meals, transport, an airport transfer, a chef or butler, experiences, or other add-ons are specifically listed in your booking confirmation. Taxes, platform and payment-gateway fees, and statutory levies apply where relevant.

**Q:** Can I transfer my booking to someone else?
**A:** Bookings can't be transferred, resold, sublet, or assigned to another person without our prior written approval.

---

## Cancellation (`src/content/faq.ts:46-71`)

**Q:** What is the cancellation policy?
**A:** For direct bookings: cancel 15 or more days before arrival for a full refund of the advance deposit; 7 to 15 days before, 50% of the advance is deducted; within 7 days, the full advance is charged. An early departure is charged at 100% of the booked value.

**Q:** Are there non-refundable dates?
**A:** Stays from 22 December to 2 January are non-refundable — any change or cancellation incurs the full stay charge. Peak season, long weekends, and festival dates may carry stricter terms.

**Q:** How are refunds processed?
**A:** Any refund goes back only to the original payment method or account. Payment-gateway, bank, and OTA/platform charges, and applicable taxes, may be non-refundable.

**Q:** Can I change my dates?
**A:** Date changes are subject to availability, any tariff difference, and our approval, so they can't be guaranteed — but we'll always try to help.

**Q:** I booked through another platform — whose policy applies?
**A:** For bookings made through an OTA or third-party platform, that platform's cancellation and refund policy applies, and we may not be able to override it.

---

## Check-in & check-out (`src/content/faq.ts:72-93`)

**Q:** What are the check-in and check-out times?
**A:** Check-in is from 3:00 PM and check-out is by 12:00 PM.

**Q:** Can I check in early or check out late?
**A:** Both are subject to availability. Early check-in may be charged at INR 1,000 per hour; late check-out may be charged additionally and can't be guaranteed unless we've confirmed it in writing.

**Q:** What do I need to bring for check-in?
**A:** A valid government photo ID for every adult guest — Aadhaar, Passport, Driving Licence, or Voter ID (a PAN card isn't accepted as address proof). Foreign nationals will need a valid passport and visa.

**Q:** Does the lead guest need to be present?
**A:** Yes — the primary guest should be present at check-in, unless we've approved otherwise in writing beforehand.

---

## Guests & children (`src/content/faq.ts:94-119`)

**Q:** How many guests can stay?
**A:** The total number of guests must not exceed the occupancy on your booking confirmation. Any extra guest, child, or visitor should be disclosed and approved in advance.

**Q:** Are children welcome?
**A:** Very much so. Up to two children under 12 can share a bedroom; beyond that, an extra charge of INR 750 per child applies. Children should be supervised at all times, especially around the pool.

**Q:** What are the extra-guest charges?
**A:** An extra adult is INR 1,500 per night and an extra child (under 12) is INR 750 per night, within the property's maximum occupancy.

**Q:** Can friends visit during our stay?
**A:** Visitors are welcome with prior approval, may be asked to share an ID, and should leave by the permitted visitor time. Overnight stays by unregistered guests aren't allowed.

**Q:** Are pets allowed?
**A:** Pets are welcome only at properties where a pet stay has been specifically approved in writing. Any pet-related cleaning or damage may be chargeable.

---

## House rules (`src/content/faq.ts:120-145`)

**Q:** Are parties or events allowed?
**A:** The villas are for quiet, restful stays, so loud music, parties, DJ setups, events, and commercial shoots aren't permitted without our prior written approval.

**Q:** What are the quiet hours?
**A:** Please keep noise low between 10:00 PM and 8:00 AM, out of respect for neighbours and the community.

**Q:** Is smoking allowed?
**A:** Not inside bedrooms, bathrooms, living rooms, or any enclosed indoor area. Smoking may be allowed only in designated outdoor areas, subject to the property's rules.

**Q:** Can I bring my own cook or vendors?
**A:** Outside cooks, decorators, photographers, masseurs, or event staff aren't permitted inside the property without prior approval — but we're glad to arrange trusted partners for you.

**Q:** What happens if something is damaged?
**A:** Please treat the home with care and tell Guest Relations about any breakage or maintenance issue right away. Damage, missing items, or excessive cleaning may be charged, usually against the security deposit.

---

## Amenities & services (`src/content/faq.ts:146-167`)

**Q:** Is housekeeping included?
**A:** Yes — housekeeping is provided on the property's schedule. Linen and towel changes, deep cleaning, and any additional housekeeping follow our operating policy and availability.

**Q:** How do I report a maintenance issue?
**A:** Just let the Guest Relations team know as soon as you notice it, and we'll attend to it as quickly as we can.

**Q:** Will Wi-Fi, power, and the pool always be available?
**A:** Amenities like Wi-Fi, power, water, the pool, and appliances are subject to operational availability. We make every reasonable effort to resolve issues, though some things — power cuts, outages, weather — are beyond our control.

**Q:** Can you arrange transport, a chef, or experiences?
**A:** We're happy to help coordinate airport transfers, taxis, self-drive or chauffeur cars, a private chef, and other experiences through trusted partners. Charges and availability vary and are confirmed in advance.

---

## Parking & arrival (`src/content/faq.ts:168-185`)

**Q:** Is parking available?
**A:** Parking depends on the property and the community's rules; please use only the designated areas. We aren't responsible for damage, theft, towing, or challans relating to guest vehicles.

**Q:** How do I find the property on arrival?
**A:** Share your expected arrival time with Guest Relations and we'll send an accurate location pin and arrival guidance. Entry into gated communities may need a quick society or security verification.

**Q:** Can my driver stay over?
**A:** Drivers, chauffeurs, and external staff may not stay inside the villa unless this has been specifically approved in advance.
