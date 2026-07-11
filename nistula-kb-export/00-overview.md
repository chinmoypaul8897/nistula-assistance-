# Nistula KB Export — 00 · Overview (content map)

**Purpose.** A faithful, structured export of everything the Nistula website tells guests
(villa descriptions, occupancy, amenities, policies, FAQ), for a separate WhatsApp AI
concierge. This file is the **map** — where content lives, what's static vs fetched live,
and how each on-site villa aligns to its RoomID and canonical label. Extraction into the
per-topic files (`villas.md`, `occupancy.md`, `policies.md`, `faq.md`) follows in Phase 2.

**Read-only.** Nothing in the website is modified. All output lives in `nistula-kb-export/`.
Every fact in the Phase-2 files is cited `path:line`. Policy/price/legal text is copied verbatim.

---

## 1 · Where guest-facing content lives

Almost all human-authored guest copy lives in **`src/content/*.ts`** (a clean, single-purpose
content layer). Structural facts (occupancy, amenities, live price/availability) come from
**eZee** (the PMS) at runtime, joined in by `src/lib/villas.ts`. The canonical policy text is a
Markdown doc at the repo root: **`nistula-policies.md`**.

### Content files relevant to a guest concierge

| File | What it holds | Static or fetched | In scope |
|---|---|---|---|
| `src/content/villas.ts` | Per-villa **editorial overlay**: display name, locality, type label, bedrooms, headline, 2–3-paragraph description, 4 highlights, image manifests. Keyed by RoomID. | **Static** (repo). Copy flagged `placeholder: true`. | ✅ villas |
| `src/content/types.ts` | Type defs for all content + `KNOWN_ROOM_IDS` (the 8 live RoomIDs). | Static | ref |
| `src/content/amenities.ts` | Amenity→icon map, the **curated 20-item allowlist**, display-label cleanups. | Static filter over a **fetched** list | ✅ villas |
| `src/content/policies.ts` | Booking-flow check-in/out times + a short 6-row policy accordion. | Static (derives from `nistula-policies.md`) | ✅ policies |
| `src/content/faq.ts` | The on-site FAQ: **7 categories, 30 Q&A**. Derives from `nistula-policies.md`. | Static | ✅ faq |
| `src/content/location.ts` | "Around the area" intro + 3–4 anchors per locality (Assagao / Siolim). **Generic-honest placeholders.** | Static, `placeholder: true` | ✅ villas (location) |
| `src/content/neighbourhood-places.ts` | Curated top-10 real nearby places per locality (cafés, restaurants, bars, beaches, landmarks) w/ blurbs, ratings, maps links. **Photos are placeholder stock.** | Static | ✅ villas (neighbourhood) |
| `src/content/villa-area.ts` | Indicative floor area (sq ft) per villa. **PLACEHOLDER — not verified measurements.** | Static, placeholder | ⚠️ villas (flagged) |
| `src/content/villa-pricing.ts` | Indicative "from ₹/night" per villa for browse cards. **PLACEHOLDER, never used for booking.** | Static, placeholder | ⚠️ villas (flagged) |
| `nistula-policies.md` (repo root) | **SOURCE OF TRUTH** for all guest policies, fees, timings, rules — 7 numbered sections + a quick-reference table. Transcribed from `Nistula_Guest_Policies.pdf`. | Static Markdown | ✅ policies |
| `src/content/site.ts` | Brand tagline, nav, **real contact channels** (phone, owner phone, email, WhatsApp, socials), office address. | Static (real values) | ✅ (contact facts) |

### Fetched-live (eZee PMS) — not statically in the repo

| Data | eZee endpoint | Fetch code | Notes |
|---|---|---|---|
| Villa identity, room type, rate plans (the 8 villas) | CFG-02 `RoomInfo` + CFG-05 `RoomTypeList` | `src/lib/ezee/villas.ts` (`joinVillas`), cached in `src/lib/ezee/villa-cache.ts` (1h) | 3 room **types**, 8 physical **rooms** (= villas) |
| **Occupancy** (base/max adults, base/max children) | CFG-05 `RoomTypeList` | `src/lib/ezee/villas.ts:70-80`; type at `src/lib/booking/types.ts` | Per **room type**, not per villa. See `occupancy.md`. |
| **Amenities** | CFG-04 `HotelAmenity` | `src/app/villas/[id]/page.tsx:46-68` via `bookingEngine.getAmenities()` | **Property-wide** — one 27-item list, identical for every villa; curated to 20 for display |
| Live price + availability | BKG-01 `RoomList` | booking flow (`/api/quote`, `/api/availability`) | Not "knowledge base" copy; the true bookable price. |
| Booked-date calendar | BKG-13 `get_calendar` | `src/lib/ezee/calendar.ts` | — |

A **captured snapshot** of the live occupancy + amenity shapes (observed 2026-06-08/09) exists at
`ezee-data-shapes.md` — that is where the actual occupancy numbers in `occupancy.md` come from,
clearly flagged as a captured snapshot rather than a live read.

### Brand / marketing content (guest-facing but outside the 4 core topics)

Noted for the concierge's context, not extracted into the 4 topic files:
`src/content/story.ts` + `storyPage.ts` (the "Our story" / about pages), `testimonials.ts` +
`guest-stories.ts` (guest quotes — **placeholder names/faces, pre-launch must-fix**),
`press.ts` (**placeholder press mentions**), `home.ts` + `landing.ts` (home-page marketing),
`hostNote.ts` / `designerNote.ts` (**placeholder host/designer with stock faces**),
`src/content/legal/{privacy,terms,cancellation}.ts` (legal pages — the cancellation page
mirrors `nistula-policies.md`), and `owners.ts` / `acquisition.ts` (**B2B, villa owners — not guest-facing**).

---

## 2 · Static vs fetched — one-line summary

- **Static (in the repo):** every villa's prose (name, headline, description, highlights,
  bedrooms, type, locality), the FAQ, the policy accordion, location/neighbourhood copy, the
  indicative area + price (placeholders), and contact details.
- **Fetched live from eZee at request time:** occupancy numbers, the amenity list, and the
  real price/availability. The occupancy + amenity **shapes and values** are also captured
  statically in `ezee-data-shapes.md` (snapshot), which is what this export cites for them.

---

## 3 · Villa alignment table (all 8 align — none flagged)

On-site display name = `content.name` in `src/content/villas.ts`. eZee `RoomName` (the short
`label`) is the PMS room code. Every villa maps cleanly to the task's canonical label — **no
mismatches**.

| villaId (eZee RoomID) | eZee RoomName (`label`) | Site display name | Canonical label (task) | Type label (site) | Room **type** (occupancy source) | Locality |
|---|---|---|---|---|---|---|
| 5220300000000000001 | `11` | Apartment 11 | **Apartment 11** | Apartment | Nistula Apartment (`…001`) | Assagao |
| 5220300000000000008 | `06` | Apartment 06 | **Apartment 06** | Apartment | Nistula Apartment (`…001`) | Assagao |
| 5220300000000000010 | `09` | Apartment 09 | **Apartment 09** | Apartment | Nistula Apartment (`…001`) | Assagao |
| 5220300000000000002 | `B1` | Villa B1 | **Villa B1** | Villa | Nistula Villa (`…003`) | Assagao |
| 5220300000000000011 | `B3` | Villa B3 | **Villa B3** | Villa | Nistula Villa (`…003`) | Assagao |
| 5220300000000000012 | `C1` | Villa C1 | **Villa C1** | Villa | Nistula Villa (`…003`) | Assagao |
| 5220300000000000013 | `C3` | Villa C3 | **Villa C3** | Villa | Nistula Villa (`…003`) | Assagao |
| 5220300000000000015 | `01` | Siolim 4BHK | **Siolim 4BHK** | Four-bedroom villa | Nistula 4BHK Siolim (`…009`) | Siolim |

Sources: identity/name/locality/type/bedrooms — `src/content/villas.ts:117-459`; RoomName labels —
`src/content/villas.ts` section comments + CFG-02 sample `ezee-data-shapes.md:143-181`; room-type
IDs + occupancy — CFG-05 sample `ezee-data-shapes.md:285-317`; the 8 RoomIDs — `src/content/types.ts:209-218`.

**Public villa URL:** `/villas/{villaId}` — e.g. Villa C3 = `/villas/5220300000000000013`.
There is **no pretty slug**; the route param is the raw RoomID (`src/app/villas/[id]/page.tsx`).

---

## 4 · Caveats already spotted (detailed in GAPS.md)

1. **Occupancy is per room TYPE, not per villa** — the three apartments share one occupancy,
   the four Assagao villas share another, Siolim is its own. Values are a captured eZee snapshot.
2. **Amenities are property-wide** — the site fetches one amenity list and shows the same curated
   set on every villa. There is no per-villa amenity data anywhere in the code.
3. **Bedrooms are an overlay best-guess** (`bedroomsPlaceholder: true` on 7 of 8 villas; only
   Siolim's "4BHK" is confirmed). Floor area (sq ft) and "from" prices are explicit placeholders.
4. **All villa prose ships `placeholder: true`** — plausible-but-generic, no invented specifics.
   B1/B3/C1/Siolim currently **reuse Villa C3's photos** as a stand-in.
5. **Location/neighbourhood copy** is generic-honest placeholder; the neighbourhood *places* are
   real businesses but their ratings/photos are approximate/placeholder.

---

*Next: Phase 2 — extract `villas.md`, `occupancy.md`, `policies.md`, `faq.md`; then Phase 3 — `GAPS.md`.*
