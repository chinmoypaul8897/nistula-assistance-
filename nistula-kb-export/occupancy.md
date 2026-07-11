# Nistula KB Export — Occupancy

## Source: occupancy is FETCHED LIVE from eZee (not static in the repo)

Occupancy is **not** hard-coded per villa. It comes from eZee **CFG-05 `RoomTypeList`**, fetched
at request time and cached for 1 hour:

- **Fetch code:** `src/lib/ezee/villas.ts:26-92` — `joinVillas()` reads CFG-05 (`cfg05RoomTypeList()`)
  and maps `base_adult_occupancy` / `base_child_occupancy` / `max_adult_occupancy` /
  `max_child_occupancy` into `Villa.roomType.occupancy` (`src/lib/ezee/villas.ts:70-80`).
- **Cache:** `src/lib/ezee/villa-cache.ts:23-30` (`getCachedVillas`, 1h TTL, per process).
- **Type shape:** `src/lib/booking/types.ts` — `roomType.occupancy = { baseAdult, baseChild, maxAdult, maxChild }`.
- **Endpoint doc / wire shape:** `ezee-data-shapes.md:270-323` (CFG-05).

Occupancy is defined **per room TYPE**, and eZee models Nistula as **3 room types → 8 physical rooms
(villas)**. So the three apartments share one occupancy record, the four Assagao villas share
another, and Siolim is its own. The values below are a **captured snapshot** of the live CFG-05
response (observed 2026-06-08/09, recorded in `ezee-data-shapes.md:285-317`) — the running site
re-fetches them live, so a concierge should treat these as "last known" and can re-verify via the
same endpoint.

### The three room types (raw CFG-05 values — `ezee-data-shapes.md:285-317`)

| Room type | roomtypeunkid | base adults | base children | **max adults** | **max children** |
|---|---|---|---|---|---|
| Nistula Apartment | `5220300000000000001` | 4 | 2 | **5** | **2** |
| Nistula Villa | `5220300000000000003` | 6 | 3 | **7** | **4** |
| Nistula 4BHK Siolim | `5220300000000000009` | 2 | 2 | **8** | **6** |

## Per-villa occupancy (room type expanded to all 8 villas)

| Our label | Type | RoomID | Bedrooms | Base adults | Max adults | Max children | Room type (occupancy source) |
|---|---|---|---|---|---|---|---|
| Apartment 11 | Apartment | `5220300000000000001` | 2 * | 4 | **5** | 2 | Nistula Apartment |
| Apartment 06 | Apartment | `5220300000000000008` | 2 * | 4 | **5** | 2 | Nistula Apartment |
| Apartment 09 | Apartment | `5220300000000000010` | 2 * | 4 | **5** | 2 | Nistula Apartment |
| Villa B1 | Villa | `5220300000000000002` | 3 * | 6 | **7** | 4 | Nistula Villa |
| Villa B3 | Villa | `5220300000000000011` | 3 * | 6 | **7** | 4 | Nistula Villa |
| Villa C1 | Villa | `5220300000000000012` | 3 * | 6 | **7** | 4 | Nistula Villa |
| Villa C3 | Villa | `5220300000000000013` | 3 * | 6 | **7** | 4 | Nistula Villa |
| Siolim 4BHK | Four-bedroom villa | `5220300000000000015` | 4 | 2 ⚠️ | **8** | 6 | Nistula 4BHK Siolim |

`*` Bedroom counts are from the editorial overlay (`src/content/villas.ts`) and are flagged
`bedroomsPlaceholder: true` — an unconfirmed best guess — for all except Siolim (whose "4BHK"
name confirms 4). Bedrooms are **not** part of the eZee occupancy data.

`⚠️` Siolim's `base_adult_occupancy` is **2** while its `max_adult_occupancy` is 8 — an unusual
config for a 4-bedroom, 8-guest villa (the apartments/villas have base 4/6). Transcribed
faithfully from the live snapshot; likely an eZee setup quirk to verify (see GAPS.md).

## How occupancy is shown to guests

- The **displayed guest number is `maxAdult`** only — children are **not** added to it. The site
  renders "Sleeps up to N guests" / "Up to N guests" using `roomType.occupancy.maxAdult`:
  - `src/components/villa/VillaHero.tsx:63,135-136` — "Sleeps up to {maxAdult} guests"
  - `src/components/villa/SpecRow.tsx:16,25-26` — "Up to {maxAdult} guests"
  - `src/components/blocks/HomeVillaCard.tsx:64,150` — "{maxAdult} guests"
- So guests see: **Apartments → "up to 5 guests"**, **Assagao villas → "up to 7 guests"**,
  **Siolim → "up to 8 guests"**.
- The **booking widget's guest picker** uses both `maxAdult` and `maxChild` as the caps
  (`src/app/villas/[id]/page.tsx:168-171`, passed to `BookingProvider`), so a guest can select up
  to maxAdult adults and up to maxChild children when booking.
