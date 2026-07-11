# Nistula KB Export — GAPS

Everything that is (a) **missing**, (b) **ambiguous / to verify**, (c) **fetched live** (so not
statically extractable), or (d) **needs a human**. Nothing was silently skipped. Items a concierge
will most feel the absence of are called out with `TODO(Paul):`.

---

## (a) Missing — not on the website at all

1. **Per-villa amenities.** There is **no per-villa amenity data anywhere**. eZee returns one
   property-wide list (CFG-04, 27 items); the site shows the same curated 20 on every villa
   (`src/content/amenities.ts:76-105`). So "Villa C3 has a coffee machine / in-house spa / welcome
   drinks" is a **property-wide claim**, not a verified per-villa fact.
   `TODO(Paul): supply a real per-villa amenity list if villas differ.`
2. **Per-villa practical "quirks"** — the kind of thing a concierge is asked most ("which bedroom
   gets morning sun", "the second-bedroom AC runs cold", "the gate latch sticks", "is there backup
   power / a generator", "how fast is the Wi-Fi", "is there a caretaker on-site", "which floor is
   the master on") — are **entirely absent from the website by design**.
   `TODO(Paul): these must come from operations/hosts; the site will never have them.`
3. **Bed configuration & bathroom counts.** The code has only a bedroom *count* (itself a
   placeholder, see (b)). No bed types (king/twin/bunk), no bathroom count, no floor plan.
   `TODO(Paul): confirm beds + bathrooms per villa.`
4. **Real floor areas (sq ft).** Explicit placeholders, flagged "UPDATE WITH REAL SQUARE FOOTAGE
   BEFORE LAUNCH … NOT verified measurements" (`src/content/villa-area.ts:1-12`).
   `TODO(Paul): confirm real floor area per villa.`
5. **Real nightly prices.** The "from ₹X/night" figures are indicative placeholders, never used for
   booking (`src/content/villa-pricing.ts:1-10`). The true price is a live BKG-01 quote (see (c)).
   `TODO(Paul): the real starting rates.`
6. **Security-deposit amount, pet fee, late-checkout fee.** The policy says a deposit is "refundable;
   amount per booking" (`nistula-policies.md:23`), pets "may be chargeable" (`nistula-policies.md:127`),
   and late check-out is "charged additionally" (`nistula-policies.md:90`) — **no figures** given.
   Only early check-in has a number (INR 1,000/hr).
   `TODO(Paul): deposit amount (or formula), pet fee, late-checkout fee.`
7. **Exact per-villa address / geolocation.** The site carries only a **locality** (Assagao / Siolim);
   no street address or map pin per villa. Directions come from Guest Relations at booking
   (`src/content/faq.ts:178`). `TODO(Paul): a shareable location note per villa (if the concierge should give one).`
8. **Distances / drive times** to airport, beaches, restaurants are **deliberately omitted** from the
   villa "around the area" copy (generic-honest — "a short drive away"; `src/content/location.ts:1-7`).
   The neighbourhood-place distances (e.g. "Anjuna ~4 km") are **approximate research snapshots**, to
   verify (`src/content/neighbourhood-places.ts:1-8`).
9. **Meal / breakfast inclusion.** Ambiguous: the amenity list includes "Breakfast" and "Welcome
   drinks", but the FAQ says the tariff is "accommodation only, unless … specifically listed"
   (`src/content/faq.ts:38`). eZee has both **EP** (room-only) and **CP** (with breakfast) rate plans
   (`ezee-data-shapes.md:159-163`), but the public site quotes only the EP/primary plan.
   `TODO(Paul): is breakfast included, and on which rate?`
10. **Check-in mechanics.** "Contactless check-in" is listed as an amenity, but there is no procedure
    detail (self-check-in? key handover? lockbox?). `TODO(Paul): the actual arrival/check-in process.`
11. **House manual details** — Wi-Fi network/password, appliance instructions, pool rules, emergency
    contacts — are referenced as covered in an on-arrival walkthrough (`nistula-policies.md:95`) but
    not published. Not needed on the website; a concierge may want them.
12. **Accessibility information** — none on the site.

---

## (b) Ambiguous / needs verification

1. **Siolim base occupancy = 2 adults, max = 8** — an odd eZee config for a 4-bedroom, 8-guest villa
   (apartments base 4, Assagao villas base 6). Transcribed faithfully; likely a setup quirk.
   `TODO(Paul): confirm Siolim's intended base occupancy in eZee.`
2. **Bedroom counts are a best guess.** 7 of 8 villas carry `bedroomsPlaceholder: true` (apartments =
   2, Assagao villas = 3); only Siolim's "4BHK" is confirmed (`src/content/villas.ts:123-124` etc.).
   `TODO(Paul): confirm bedroom count per villa.`
3. **Does Siolim have a pool?** The villa page would show "Private pool" (property-wide amenity), but
   Siolim's description/highlights **don't mention a pool** (`src/content/villas.ts:444-454`), unlike
   C3 which explicitly does. `TODO(Paul): confirm whether Siolim has a pool.`
4. **All villa prose is placeholder.** Every villa's headline/description/highlights ship
   `placeholder: { copy: true }` — "plausible-but-generic, no invented specifics"
   (`src/content/villas.ts:5-7`, `types.ts:15-18`). The copy may not reflect each villa's real
   character. `TODO(Paul): replace with real per-villa copy.`
5. **Photos are shared.** B1, B3, C1, and Siolim currently **reuse Villa C3's photos** as a stand-in
   (`src/content/villas.ts:358-360, 383-385, 408-410, 455-457`). The alt text is villa-specific but
   the images are C3's.
6. **Address discrepancy.** `nistula-policies.md:5` gives "Amado Vistas, Bouta Waddo, Assagao,
   Bardez, Goa 403507"; `src/content/site.ts:57` gives office = "No 5, Amado Vistas, Assagao, Goa".
   Two representations of (presumably) the same office. `TODO(Paul): confirm the canonical address.`
7. **Contact channels differ across sources.** `nistula-policies.md:5` lists phone **+91 88103 58517**
   and Instagram **@nistula.official** (no email). `src/content/site.ts:42-65` (the live footer, real
   values) adds: email **contact.us@nistula.life**, owner-enquiry phone **+91 89200 93048**, WhatsApp
   **918810358517**, plus Facebook and LinkedIn. `TODO(Paul): confirm which channels the concierge should hand out.`
8. **Neighbourhood ratings & photos are approximate/placeholder** — real businesses, but ratings/review
   counts are research snapshots that "drift over time", and the card photos are license-clear stock,
   **not the actual venues** (`src/content/neighbourhood-places.ts:1-14`).

---

## (c) Fetched live from eZee — not statically extractable

These are pulled from the PMS at request time; the values in this export are **captured snapshots**
(observed 2026-06-08/09, `ezee-data-shapes.md`), not the live source. A concierge should treat them
as "last known" and can re-verify via the same endpoints.

1. **Occupancy** (base/max adults, base/max children) — CFG-05 `RoomTypeList`.
   Fetch: `src/lib/ezee/villas.ts:26-92`; snapshot: `ezee-data-shapes.md:285-317`. See `occupancy.md`.
2. **Amenity list** — CFG-04 `HotelAmenity` (27 items, property-wide). Fetch:
   `src/app/villas/[id]/page.tsx:46-68`. **Only 3 of the 27 are captured verbatim**
   (`ezee-data-shapes.md:255-259`); the 20 in `villas.md` are the *coded allowlist*, not a live capture.
   `TODO(Paul): capture the full live 27-item amenity list if an exact list matters.`
3. **Live price + availability** — BKG-01 `RoomList` (the real, date-specific, all-inclusive bookable
   price, incl. 18% GST). Backs `/api/quote` + `/api/availability`; never static. `ezee-data-shapes.md:476-598`.
4. **Booked-date calendar** — BKG-13 `get_calendar`. `src/lib/ezee/calendar.ts`; `ezee-data-shapes.md:602-717`.

---

## (d) Explicitly needs a human (beyond the TODOs above)

- **Per-villa character & quirks** (item a.2) — the single biggest gap for a concierge; the website
  has none of it. These live only with the hosts/ops team.
- **Placeholder people/content pending real assets** (guest-facing, flagged pre-launch must-fix in the
  project's own notes): guest testimonials use fictional names with real faces
  (`src/content/testimonials.ts`, `guest-stories.ts`); the villa "Notes from the Designer" card uses a
  stock face + made-up host name (`src/content/designerNote.ts`); the /story team wall is mostly stock
  photos + guessed names; press mentions are placeholders pointing at an internal disclaimer page
  (`src/content/press.ts`). **A concierge should not quote any of these as real** until replaced.
- **Out of scope for a guest concierge (noted, not extracted):** the villa-owner / acquisition content
  (`src/content/owners.ts`, `acquisition.ts`, `OwnersFaq.tsx`) is **B2B** (recruiting villa owners),
  and the brand/story pages (`src/content/story.ts`, `storyPage.ts`, `home.ts`) are marketing prose —
  available if the concierge needs "about Nistula" context, but they carry no guest policy/fact.

---

## Coverage summary

- **8 / 8 villas** fully covered in `villas.md` (name, type, bedrooms, occupancy, description,
  highlights, location, URL) — with placeholders flagged.
- **Policies:** the complete guest-facing policy surface (FAQ + policy accordion + 3 legal pages +
  the `nistula-policies.md` source of truth) transcribed verbatim in `policies.md`.
- **FAQ:** all **30** on-site Q&A transcribed verbatim in `faq.md`.
- **Occupancy:** all 3 room types + all 8 villas in `occupancy.md`, flagged as a live-fetch snapshot.
