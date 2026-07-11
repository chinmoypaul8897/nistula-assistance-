# Nistula KB Export — Villas

One block per villa, keyed to the canonical label (join key = eZee RoomID). Descriptions and
highlights are transcribed **verbatim** from the site's editorial overlay. Occupancy is the live
eZee value (captured snapshot — see `occupancy.md`). All villa prose currently ships flagged
`placeholder: true` in the code (plausible-but-generic; no invented specifics) — see GAPS.md.

## What is UNIQUE vs SHARED across villas

- **Unique per villa:** display name, locality, type label, bedroom count, `headline`,
  `description` (2 paragraphs), `highlights` (4). Source: `src/content/villas.ts`.
- **Shared per room *type*:** occupancy (3 apartments share one set; 4 Assagao villas share
  another; Siolim its own). Source: live eZee CFG-05 → `ezee-data-shapes.md:285-317`.
- **Shared property-wide (identical on every villa page):** the amenity list (see
  [§ Amenities](#amenities-shared-property-wide-identical-on-every-villa)) and the pool chip.
- **Shared per locality:** the "around the area" line + neighbourhood places (see
  [§ Location](#location--neighbourhood-shared-per-locality)).

---

## Apartment 11

- **villaId (RoomID):** `5220300000000000001` · eZee code `11` — `src/content/villas.ts:117-119`
- **Type:** Apartment (`typeLabel: "Apartment"`) — `src/content/villas.ts:122`
- **Bedrooms:** 2 (shown as "2 BHK"; `bedroomsPlaceholder: true`) — `src/content/villas.ts:123-124`
- **Sleeps / max guests:** up to **5 adults** (site: "Sleeps up to 5 guests"); base 4 adults, max 2 children — room type "Nistula Apartment", `ezee-data-shapes.md:289-296`
- **Location:** Assagao, Goa — `src/content/villas.ts:120`
- **Pool:** "Common pool" (apartments share a pool; villa pages label apartments' pool "Common") — `src/components/villa/VillaHero.tsx:67,137`
- **Public URL:** `/villas/5220300000000000001`

**Headline** (`src/content/villas.ts:126-127`):
> A light-filled apartment in Assagao, with a pool to start the morning in.

**Description** (verbatim, `src/content/villas.ts:128-131`):
> Apartment 11 is an easy place to slow down. The living space opens onto a balcony and the green beyond, and the pool is a few steps away for the first swim of the day.
>
> Inside, the rooms are simple and well-kept, with a proper kitchen for long breakfasts and bedrooms that stay cool and quiet. It suits a small family or a couple of friends who'd rather stay in than rush out.

**Highlights** (verbatim, `src/content/villas.ts:132-137`):
- Private balcony with garden views
- Shared pool a few steps away
- Full kitchen for long breakfasts
- A quiet lane in Assagao

**Indicative figures (PLACEHOLDER — not for booking):** from ₹7,000/night (`src/content/villa-pricing.ts:14`); ~2,200 sq ft (`src/content/villa-area.ts:16`).

---

## Apartment 06

- **villaId (RoomID):** `5220300000000000008` · eZee code `06` — `src/content/villas.ts:198-200`
- **Type:** Apartment — `src/content/villas.ts:203`
- **Bedrooms:** 2 ("2 BHK"; placeholder) — `src/content/villas.ts:204-205`
- **Sleeps / max guests:** up to **5 adults**; base 4 adults, max 2 children (Nistula Apartment room type)
- **Location:** Assagao, Goa — `src/content/villas.ts:201`
- **Pool:** Common pool (apartment)
- **Public URL:** `/villas/5220300000000000008`

**Headline** (`src/content/villas.ts:206-207`):
> A calm apartment in Assagao, opening to a pool and an arched garden wall.

**Description** (verbatim, `src/content/villas.ts:208-211`):
> Apartment 06 sits beside a pool and an arched garden wall, with shade in the afternoon and birdsong most of the day. It's the kind of place you settle into and stop checking the time.
>
> The living room is soft and lived-in, the kitchen ready for whatever you feel like cooking, and the bedrooms quiet when the day winds down.

**Highlights** (verbatim, `src/content/villas.ts:212-217`):
- Poolside garden setting
- Soft, lived-in living room
- Breakfast bar and full kitchen
- A calm corner of Assagao

**Indicative figures (PLACEHOLDER):** from ₹7,000/night (`villa-pricing.ts:15`); ~2,000 sq ft (`villa-area.ts:17`).

---

## Apartment 09

- **villaId (RoomID):** `5220300000000000010` · eZee code `09` — `src/content/villas.ts:262-264`
- **Type:** Apartment — `src/content/villas.ts:267`
- **Bedrooms:** 2 ("2 BHK"; placeholder) — `src/content/villas.ts:268-269`
- **Sleeps / max guests:** up to **5 adults**; base 4 adults, max 2 children (Nistula Apartment room type)
- **Location:** Assagao, Goa — `src/content/villas.ts:265`
- **Pool:** Common pool (apartment)
- **Public URL:** `/villas/5220300000000000010`
- **Note:** code flags the photos as "real photos (lower-res sources)" — `src/content/villas.ts:262`

**Headline** (`src/content/villas.ts:270-271`):
> A treetop apartment in Assagao, built around a slow kind of quiet.

**Description** (verbatim, `src/content/villas.ts:272-275`):
> Apartment 09 looks out into the treetops, with a hanging chair on the balcony that's hard to leave. Mornings are slow here, and the light is gentle.
>
> The living space is open and uncluttered, the kitchen has what you need, and the bedrooms are calm and green. Good for a couple or a small family.

**Highlights** (verbatim, `src/content/villas.ts:276-281`):
- Balcony hanging chair and treetop views
- Bright, open-plan living
- Restful, green bedrooms
- A quiet part of Assagao

**Indicative figures (PLACEHOLDER):** from ₹7,000/night (`villa-pricing.ts:16`); ~2,400 sq ft (`villa-area.ts:18`).

---

## Villa B1

- **villaId (RoomID):** `5220300000000000002` · eZee code `B1` — `src/content/villas.ts:338-340`
- **Type:** Villa — `src/content/villas.ts:343`
- **Bedrooms:** 3 ("3 BHK"; placeholder) — `src/content/villas.ts:344-345`
- **Sleeps / max guests:** up to **7 adults** (site: "Sleeps up to 7 guests"); base 6 adults, max 4 children — room type "Nistula Villa", `ezee-data-shapes.md:298-305`
- **Location:** Assagao, Goa — `src/content/villas.ts:341`
- **Pool:** Private pool (standalone villa)
- **Public URL:** `/villas/5220300000000000002`
- **Photos:** currently REUSE Villa C3's photos as a placeholder (`sharedImagesFrom`) — `src/content/villas.ts:358-360`

**Headline** (`src/content/villas.ts:346-347`):
> A spacious villa in Assagao, made for unhurried days with the people you like most.

**Description** (verbatim, `src/content/villas.ts:348-351`):
> Villa B1 gives a group room to breathe — generous living space, a garden to sit out in, and bedrooms enough for everyone to have their own corner.
>
> It's a relaxed, private house in the lanes of Assagao, set up for long lunches, slow evenings, and not much of a plan.

**Highlights** (verbatim, `src/content/villas.ts:352-357`):
- Generous living space
- Private garden
- Room for a group
- In the lanes of Assagao

**Indicative figures (PLACEHOLDER):** from ₹17,000/night (`villa-pricing.ts:19`); ~5,200 sq ft (`villa-area.ts:21`).

---

## Villa B3

- **villaId (RoomID):** `5220300000000000011` · eZee code `B3` — `src/content/villas.ts:363-365`
- **Type:** Villa — `src/content/villas.ts:368`
- **Bedrooms:** 3 ("3 BHK"; placeholder) — `src/content/villas.ts:369-370`
- **Sleeps / max guests:** up to **7 adults**; base 6 adults, max 4 children (Nistula Villa room type)
- **Location:** Assagao, Goa — `src/content/villas.ts:366`
- **Pool:** Private pool (standalone villa)
- **Public URL:** `/villas/5220300000000000011`
- **Photos:** REUSE Villa C3's photos as a placeholder — `src/content/villas.ts:383-385`

**Headline** (`src/content/villas.ts:371-372`):
> A private villa in the lanes of Assagao, quiet enough to hear the garden.

**Description** (verbatim, `src/content/villas.ts:373-376`):
> Villa B3 is a quiet, private house tucked into Assagao's lanes. The garden does most of the talking, and the living space is made for gathering.
>
> Bedrooms are restful and well-kept, with room for a family or a group of friends to spread out and stay a while.

**Highlights** (verbatim, `src/content/villas.ts:377-382`):
- Private garden house
- Made for gathering
- Restful bedrooms
- A quiet Assagao lane

**Indicative figures (PLACEHOLDER):** from ₹17,000/night (`villa-pricing.ts:20`); ~5,000 sq ft (`villa-area.ts:22`).

---

## Villa C1

- **villaId (RoomID):** `5220300000000000012` · eZee code `C1` — `src/content/villas.ts:388-390`
- **Type:** Villa — `src/content/villas.ts:393`
- **Bedrooms:** 3 ("3 BHK"; placeholder) — `src/content/villas.ts:394-395`
- **Sleeps / max guests:** up to **7 adults**; base 6 adults, max 4 children (Nistula Villa room type)
- **Location:** Assagao, Goa — `src/content/villas.ts:391`
- **Pool:** Private pool (standalone villa)
- **Public URL:** `/villas/5220300000000000012`
- **Photos:** REUSE Villa C3's photos as a placeholder — `src/content/villas.ts:408-410`

**Headline** (`src/content/villas.ts:396-397`):
> A relaxed villa in Assagao, with room to spread out and settle in.

**Description** (verbatim, `src/content/villas.ts:398-401`):
> Villa C1 is an unhurried house with space to spread out — a comfortable living area, a garden, and bedrooms that stay cool through the afternoon.
>
> It sits in a calm part of Assagao, close enough to wander out for a meal and quiet enough to come straight back.

**Highlights** (verbatim, `src/content/villas.ts:402-407`):
- Easy, spread-out living
- Private garden
- Cool, calm bedrooms
- A calm part of Assagao

**Indicative figures (PLACEHOLDER):** from ₹17,000/night (`villa-pricing.ts:21`); ~5,400 sq ft (`villa-area.ts:23`).

---

## Villa C3

- **villaId (RoomID):** `5220300000000000013` · eZee code `C3` — `src/content/villas.ts:413-416`
- **Type:** Villa — `src/content/villas.ts:417`
- **Bedrooms:** 3 ("3 BHK"; placeholder) — `src/content/villas.ts:418-419`
- **Sleeps / max guests:** up to **7 adults**; base 6 adults, max 4 children (Nistula Villa room type)
- **Location:** Assagao, Goa — `src/content/villas.ts:414`
- **Pool:** Private pool with a water feature (described in the copy) — `src/content/villas.ts:421-423`
- **Public URL:** `/villas/5220300000000000013`
- **Note:** C3 has **real photos** and is the designated test villa; it is also the photo source reused by B1/B3/C1/Siolim.

**Headline** (`src/content/villas.ts:421`):
> A private villa in Assagao, wrapped around its own pool.

**Description** (verbatim, `src/content/villas.ts:422-425`):
> Villa C3 wraps around its own pool, with a water feature, a shaded place to eat outside, and a living space that opens to the garden.
>
> Indoors it's warm and considered — a proper kitchen, restful bedrooms, and bathrooms worth lingering in at the end of the day.

**Highlights** (verbatim, `src/content/villas.ts:426-431`):
- Private pool with a water feature
- Outdoor dining corner
- Warm, considered interiors
- A private garden in Assagao

**Indicative figures (PLACEHOLDER):** from ₹17,000/night (`villa-pricing.ts:22`); ~5,500 sq ft (`villa-area.ts:24`).

---

## Siolim 4BHK

- **villaId (RoomID):** `5220300000000000015` · eZee code `01` — `src/content/villas.ts:436-438`
- **Type:** Four-bedroom villa (`typeLabel: "Four-bedroom villa"`) — `src/content/villas.ts:441`
- **Bedrooms:** 4 ("4 BHK"; **confirmed**, `bedroomsPlaceholder: false` — the "4BHK" in the configured name = 4 bedrooms) — `src/content/villas.ts:442-443`
- **Sleeps / max guests:** up to **8 adults** (site: "Sleeps up to 8 guests"); base **2 adults**, max 6 children — room type "Nistula 4BHK Siolim", `ezee-data-shapes.md:307-315`. ⚠️ The base_adult_occupancy of 2 is an eZee config oddity for an 8-guest 4-bedroom villa (see GAPS.md).
- **Location:** Siolim, Goa — `src/content/villas.ts:439`
- **Pool:** the villa page would show "Private pool" (property-wide amenity), but the copy does **not** mention a pool — treat pool as unconfirmed for Siolim (see GAPS.md)
- **Public URL:** `/villas/5220300000000000015`
- **Photos:** REUSE Villa C3's photos as a placeholder — `src/content/villas.ts:455-457`

**Headline** (`src/content/villas.ts:444`):
> A four-bedroom villa in Siolim, with space for the whole group.

**Description** (verbatim, `src/content/villas.ts:445-448`):
> The Siolim villa is a four-bedroom house with space for the whole group, set in the quieter green of north Goa.
>
> It's built for togetherness — a big living area, a garden, and enough bedrooms that nobody has to draw straws. A good base for a longer, slower trip.

**Highlights** (verbatim, `src/content/villas.ts:449-454`):
- Four bedrooms for the whole group
- Big living area for gathering
- Private garden
- The quieter green of Siolim

**Indicative figures (PLACEHOLDER):** from ₹20,000/night (`villa-pricing.ts:23`); ~6,000 sq ft (`villa-area.ts:25`).

---

## Amenities (SHARED, property-wide — identical on every villa)

eZee returns **one property-wide amenity list** (CFG-04 `HotelAmenity`, 27 items), the **same for
every villa** — there is no per-villa amenity data in the code (`src/content/amenities.ts:76-83`).
The site renders only a **curated 20-item guest-relevant subset** (the allowlist), dropping items
that read oddly on a boutique villa page ("Conference Room", "Banquet hall", "24/7 front desk",
"Gloves", "Iron") and de-duplicating ("Wifi"↔"Free Wifi", "TV"↔"HD TV").

**The 20 amenities shown on every villa page** (allowlist `src/content/amenities.ts:84-105`; a few
display labels cleaned up at `src/content/amenities.ts:118-123`):

- Swimming Pool
- Free Wi-Fi *(display label; live name "Free Wifi")*
- Air conditioning *(display label; live name "Air Conditioner")*
- HD TV
- Refrigerator
- Coffee machine
- Breakfast
- Welcome drinks
- Room service
- Laundry
- Dry cleaning
- Daily housekeeping
- In-house spa
- Garden view
- Amazing views
- Private entrance *(display label; live name "Private-Entrance")*
- Contactless check-in
- Free parking
- Transportation
- Sofa

**Pool distinction on villa pages:** apartments' pool is labelled **"Common pool"**, standalone
villas' pool **"Private pool"** — derived purely from the type label, not from per-villa data
(`src/components/villa/VillaHero.tsx:67,137`). The pool chip itself appears whenever the
property-wide list contains "Swimming Pool" (`src/app/villas/[id]/page.tsx:61`), i.e. on every villa.

> **Faithfulness note:** the full 27-item live list is not captured verbatim anywhere in the repo
> (only 3 samples exist at `ezee-data-shapes.md:255-259`). The 20 above are the names the site is
> coded to show; live casing is whatever CFG-04 returns. See GAPS.md.

---

## Location / neighbourhood (SHARED, per locality)

Villa pages show an "around the area" section by **locality** (Assagao or Siolim), not per villa.

### The "around the area" line (generic-honest PLACEHOLDER — `src/content/location.ts`)

- **Assagao** (`location.ts:14-15`): "Assagao sits in the green belt of north Goa — quiet lanes, old houses, and an unhurried pace, with the coast and the busier corners of Goa both an easy drive away." Anchors (deliberately non-specific): Cafés and restaurants ("a short drive away"), the north Goa beaches ("within easy reach by car"), markets and shops, the airport ("we can help arrange a transfer").
- **Siolim** (`location.ts:37-38`): "Siolim is quieter still — riverside north Goa, green and unhurried, a good base for a longer, slower trip with the coast within reach." Anchors: riverside and countryside, the northern beaches ("a drive away"), cafés and local spots, the airport.

### Neighbourhood places — the "what's around" card fan (`src/content/neighbourhood-places.ts`)

Real, researched nearby businesses (linked to a Google Maps search). Ratings/review counts are
approximate research snapshots; the card **photos are license-clear placeholder stock, not the real
venues** (`neighbourhood-places.ts:1-14`). Curated top-10 per locality:

**Assagao** (`neighbourhood-places.ts:42-153`): Gunpowder (restaurant, ~4.5), Room One Cocktail Bar
(bar, ~4.6), Izumi (restaurant, ~4.6), Mustard Cafe (café, Arpora ~6 km), St. Michael's Church
(Anjuna ~4 km), Bawri (restaurant, ~4.3), Kefi Cafe & Bistro (café, ~4.6), Vietnom (restaurant,
~4.4), Pablos (bar, Badem Junction), Anjuna Beach (~4 km).

**Siolim** (`neighbourhood-places.ts:154-265`): Hosa (restaurant, ~4.5), Boilermaker (bar, ~4.6),
Fireback (Thai, riverside), Thalassa (bar, Vaddy), St. Anthony Church (village centre), Siolim
House (café), Casa Café (Vagator ~5 km), Smita's Lakeview (Chopdem), Morjim Beach (across the
river), Chapora River (riverfront).
