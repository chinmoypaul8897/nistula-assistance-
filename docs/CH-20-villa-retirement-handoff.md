# CH-20 — Retire the four Assagao 3-bedroom villas · HANDOFF

**Status: PAUSED mid-task, work-in-progress committed on branch
`chunk/CH-20-retire-assagao-villas`. NOT merged. NOT verified (`pnpm check` never
completed — see Blocker). Resume with the prompt at the bottom of this file.**

Paused 2026-07-25 to send the team-questions document first; resuming in a fresh session.

---

## 1. What this task is

Nistula's contract for **four houses ended** and they were **removed from eZee**. The
build (v1.0.0) still treats Nistula as **8 houses in 3 room types**; it must become
**4 houses in 2 room types**.

| | |
|---|---|
| **STAYS (4)** | Apartment 06 · Apartment 09 · Apartment 11 · Siolim 4BHK |
| **GONE FOR GOOD (4)** | Villa B1 · Villa B3 · Villa C1 · Villa C3 (all four Assagao 3-BHK villas = the "Nistula Villa" room type) |

Removing all four retires an **entire room type**, not just rows.

### Business facts locked in (owner-confirmed 2026-07-24/25) — do not re-ask
1. **No current or future guest** holds a B1/B3/C1/C3 booking (contract ended). So the
   live blast radius is essentially nil; the marketing guard below is precautionary.
2. **Removed from eZee itself** (and the OTA channel mappings). No new villa booking can
   arrive, so the poller will never see the type again.
3. **Group of six in Assagao now has no product** — ACCEPTED as a gap, do not build around it.
4. **Approved guest-facing line** (voice guide is locked; this is Paul-approved):
   > "We no longer let the three-bedroom houses in Assagao. What we do have is our Assagao apartments, and the four-bedroom villa in Siolim. Shall I check either for those dates?"

---

## 2. The design (already implemented — understand before editing)

The villa map answered **two different questions at once**; the fix splits them:

- **"What may we SELL?"** → the four villas are gone from `VILLAS`. Not sellable, priced,
  or offered.
- **"Does this text NAME a house?"** → still **yes** for "Villa B3" etc. A guest may still
  ask for one (deserves an honest answer, not a crash or a fake "sold out"), and the
  house-naming **safety screen** must still recognise the name.

Implementation: a new resolver kind **`retired`**. `resolveVilla("B3")` /
`resolveVilla("3bhk")` → `{ kind: 'retired' }` (never `match`, never a crash). Bare
`"villa"` → `none` (Siolim IS a villa, so the word alone is not a retirement). The three
price tools return a new tool error `INVENTORY_RETIRED` carrying an instruction to give
the approved line.

**Two traps the naive fix hits (both avoided):**
- Deleting the rows and letting `"3bhk"` resolve to an **empty `ambiguous`** →
  `quoteType` records a false `degraded('down')` → after 3 enquiries it stops quoting for
  **every** guest. Avoided: `3bhk` → `retired`, never empty-ambiguous.
- Deleting the `b1/b3/c1/c3` aliases → `byLabel` **throws** with no try/catch above it →
  guest silence. Avoided: aliases point at `retired`, `byLabel` never called for them.

---

## 3. What is DONE (committed on the branch)

All committed in the WIP commit on `chunk/CH-20-retire-assagao-villas`. Source **typechecks
clean** (`npx tsc --noEmit` → 0 errors in `src/`). Behaviour is **NOT yet verified by the
test suite** (blocked — §5).

| File | Change |
|---|---|
| `src/lib/villas.ts` | Added `retired` kind; `RETIRED_UNIT_TOKENS` (b1/b3/c1/c3) + `mentionsThreeBed()` → retired; deleted the 4 `VILLAS` rows + `VILLA`/`VILLA_OCC` consts + `'Nistula Villa'` from `VillaTypeName`; `namesPhysicalHouse` treats `retired` as "names a house"; exported `RETIRED_VILLA_LABELS` and `isRetiredVillaType(str)`. |
| `src/brain/tools/registry.ts` | Added `'INVENTORY_RETIRED'` to `ToolErrorCode`. |
| `src/brain/tools/getQuote.ts` / `getAvailability.ts` / `getBookingLink.ts` | `retired` → `INVENTORY_RETIRED` result; reworded the `none`/`UNKNOWN_VILLA` message to name the two remaining products (was "ask the guest which villa", which loops). |
| `src/config.ts` | Roster validation: a `retired` villa in `STAFF_ROSTER_JSON` still **refuses boot** (correct — cannot route to a house we do not operate), now with an honest message. |
| `src/brain/prompt.ts` | Added `PHRASEBOOK.inventoryRetired` (approved line); reworded `PHRASEBOOK.datesUnavailable` (dropped the false "another villa is free the same nights" claim → a question that triggers a real check); `REGISTER_EXEMPLARS[1]` "C3's a good pick" → an apartments-type line (was recommending a departed house); identity block "eight private villas" → count-free; rules 168/173 examples de-villa'd; added a standing retired-inventory rule. |
| `src/lifecycle/sendGuards.ts` | `marketingBlock` now skips `winback` + `lead_followup` when `params.villaType` is the retired type (`isRetiredVillaType`) → reason `inventory_retired`. SKIP is correct (retirement cannot come back). Added safe `paramVillaType()` narrower (jsonb is `unknown`). |
| `kb/source/website-content/villas.json` | Deleted the 4 departed villa keys (…002/…011/…012/…013). |
| `scripts/kb-build.ts` | Replaced the hardcoded "Nistula has eight private homes…" intro with `inventorySentence()`, **derived from `VILLAS`** so it can never drift again. |
| `kb/quirks.md` | Deleted the 4 commented `<!-- ## Villa Bx -->` stubs (kept the 2026-07-13 incident narrative — historical record). |
| `kb/villas.md` | **Generated** — rebuilt via `pnpm kb:build` (new `kbVersion 6454325a`). Intro now "three private apartments in Assagao and a four-bedroom villa in Siolim"; the four `### Villa Bx` blocks are gone. |
| `test/villas.test.ts` | Full rewrite to the new contract + a **total-function "never throws"** test + an "ambiguous never carries an empty list" test + `isRetiredVillaType` tests. |

---

## 4. What is LEFT (in order)

### 4a. Re-express the rest of the test suite ← WAS IN PROGRESS
~57 other test files reference departed villas (grep below). The **only** typecheck error
is already fixed (`villas.test.ts`); the rest are **behavioural** and only vitest reveals
them — so **run the suite first to get the real failure list**, then fix only what fails.
Do **not** blind find-replace.

```
git grep -nE 'Villa B1|Villa B3|Villa C1|Villa C3|Nistula Villa|5220300000000000(002|003|011|012|013)|VILLA_OCC|3 ?bhk|3bhk' test/
```

Classify each hit:
- **Mechanical scaffolding** (a villa used incidentally as a stay label) → retarget onto an
  apartment (`Apartment 09`, id `…010`) or Siolim.
- **Meaningful** (the test exists *because* of villa-ness) → rewrite to the new contract,
  keeping what it proves. The apartments still share one room type, so most multi-unit
  logic survives on them.
- **Obsolete** → remove, but justify each deletion as *"this subject cannot exist"*, never
  *"this string changed"*.

**🚨 Refuse the tempting deletions (this repo's signature failure class — a "fix" that guts
the assertion; 9 review rounds hid 17 defects behind a green suite):**
- `test/stay-guards.test.ts` — "your stay is in Villa C3" MUST stay a violation (now via the
  `unitLabelOf`→null→sentence fallback; `UNIT_TOKEN` keeps the literal `B1|B3|C1|C3`).
  **Verified in code already** — do not weaken it.
- `test/lifecycle-templates.test.ts` (~:50-58) — the four departed labels rejected as
  guest-facing template params MUST stay green **unchanged** (`namesPhysicalHouse` still
  flags `retired`). If it goes red, the fix is wrong, not the test.
- Keep **at least one eZee fixture on RoomTypeCode `…0003`** asserting the poller still
  **ingests** an unknown/retired type (we refuse where we ACT, never where we RECORD).
- `test/config.test.ts` — the "Villa B3" roster entry still refuses boot; only the error
  message changed.

### 4b. Amend the acceptance contract + harness together
`docs/product-picture.md` scenarios S1/S2/S3/S4/S5/S6 use villas (B3/B1, "Nistula Villa"
win-back, "is b3 free?"). Add a dated **"⚠️ AMENDED 2026-07-25 (inventory change),
Paul-approved"** box in the file's existing convention — **strike in place, never silently
rewrite** (it is the contract `test/acceptance/replay.test.ts` asserts against). Move the
harness in lockstep: `test/acceptance/seed.ts`, `support.ts`, `scenarios/s1|s3|s6.ts`.
Note in the progress entry that **`pnpm replay` proves ZERO coverage of this change**
(`support.ts` echoes back any villaId + constant amounts) — its PASS is not evidence.

### 4c. Cutover-time landmines
- `.env.example:~57`, `runbook.md:~1461-1466`, `plan.md:~221` — the `STAFF_ROSTER_JSON`
  sample teaches `"villas":["B1","B3"]`. Change to an apartment; add one runbook line: a
  roster naming a retired villa refuses boot, by design.
- `scripts/template-pack.ts` (~:40, :46) — `EXAMPLES` villaType/villa = "Nistula Villa";
  change so the Meta approval pack stops advertising a retired type.
- `git grep -n '"B1","B3"'` → expect zero after.

### 4d. Correct live guidance — do NOT rewrite history
- `CLAUDE.md` — re-point the "villa-map drift" clean-up from "verify the villa IDs" to
  "those four ids 404 because the houses were **retired** 2026-07-24 — removed, do not hunt
  replacement ids"; fix the "8 villas" brief line; add a dated **⚠️ AMENDED** box at the
  head of the OQ-19 section revising only its arithmetic (8 houses/3 types → 4/2). The
  OQ-19 *business question* ("are Apt 06/09/11 interchangeable?") now gets **sharper** — the
  apartments are the only multi-unit type left.
- `docs/open-questions.md` — the dated OQ-19 narrative is **append-only history**; supersede
  with a new dated note, never edit sentences in place.
- **`progress.md` is APPEND-ONLY.** Only its Status-header block (the live pointer) may be
  rewritten. Add ONE new dated CH-20 entry (use the §9 template). ~81 villa mentions in the
  ledger are history — leave them.
- The team docx (`docs/Nistula Assistance - Questions for the team.docx`) is **already
  converted to four houses** — do NOT regenerate it.

### 4e. Verify + review + commit
1. `docker compose up -d postgres` (7 DB test files need it).
2. `pnpm check` → **exit code 0** (read the exit code, never grep for "pass"). Single
   process only.
3. `pnpm replay` → 6/6, in a **separate** process (shares `nistula_test`; concurrent runs
   TRUNCATE each other).
4. Multi-agent adversarial pre-merge review (this repo's standing gate — see
   `.claude` memory "CH-06 adversarial review"). Verify findings before acting.
5. Squash/clean the WIP commit into logical commits, or amend; merge to `main` only when
   green; tag `vCH-20`. Conventional Commits, scope `brain`/`ezee`/`lifecycle`, footer
   `Refs: CH-20`, co-author trailer.

---

## 5. 🚨 The Blocker (why we stopped here)

The test runner would not start in this session: **Git Bash hit a Cygwin fork failure**
(`dofork: child died unexpectedly, exit code 0xC0000142`) and **PowerShell `pnpm exec`
returned `EUNKNOWN uv_spawn`** — a Windows process-spawn instability, aggravated by Docker
Desktop launching at the same time. It is environmental, **not** a code problem.

**To resume:** open a fresh terminal (or reboot if it persists), confirm Docker Desktop is
running, then run `pnpm check` **once**. If `npx`/`pnpm exec` still fails to spawn, try
`node ./node_modules/vitest/vitest.mjs run <file>` directly, or run from a native Windows
terminal outside the agent harness.

---

## 6. 🚨 DO NOT TOUCH (safety — carried from the mapping review)

- **Production data** — nothing. No UPDATE/DELETE on `bookings_mirror` (real history the
  hourly sweep re-derives), no bulk revoke of `scheduled_messages` (irreversible), no
  `guest_stays`. Every effect of this change is reachable in code.
- **`src/brain/stayView.ts` `project()`** — do NOT teach it the villa map. It stays
  villa-agnostic; making it map-aware flips every historical villa booking undescribable →
  forced draft → dead silently with `OPS_NUMBERS` empty. Pin with a test instead.
- **`src/lifecycle/plan.ts` `locality()`** `/nistula\s+(apartment|villa)/i` — keep the villa
  alternative for ever (describing an existing booking ≠ selling the product).
- **`src/brain/stayGuards.ts` `UNIT_TOKEN`** `B1|B3|C1|C3` literal — keep it; it is the only
  thing that makes "your stay is in Villa C3" a violation now.
- **`src/lib/villas.ts` `byLabel` throw** — keep the invariant; the fix was repointing the
  aliases, not softening the assertion.
- **`src/ezee/normalize.ts` + the poller** — no room-type allowlist. Refuse where we ACT,
  never where we RECORD (an ACKed item is never redelivered).
- **`src/staff/villaRoute.ts`** — no change; do NOT re-add the four ids to silence
  `task_unmapped_room_id` alerts (that re-creates the product).
- **`kb/source/roomtypes.json`** — a dated external snapshot; do not delete its "Nistula
  Villa" entry to make a test pass (it is unused by `kb-build` now; a refresh belongs at
  cutover).
- `test/acceptance/scenarios/s4.ts` & `s5.ts` — every `C1/C3/C5` in them is a **guardrail
  class label, not a villa**. A regex rename corrupts them. (Not in the grep pattern above.)

---

## 7. Open for Paul (business, non-blocking — ask at the questions round)
- `PHRASEBOOK.datesUnavailable` was reworded (removed a now-false availability claim). The
  new wording is voice-legal; confirm you are happy with it.
- Identity line still says "boutique villa company in Goa" — kept (brand; Siolim is a
  villa). Confirm at leisure.

---

## RESUME PROMPT — paste this into a fresh session

> Resume the villa-retirement task (CH-20). First run `git checkout
> chunk/CH-20-retire-assagao-villas` and read `docs/CH-20-villa-retirement-handoff.md` in
> full — it is the source of truth for what is done, what is left, the business facts, and
> the DO-NOT-TOUCH safety list. The code changes are committed as WIP and typecheck clean
> but the test suite has NOT been run (an environment fork-spawn issue blocked it — see §5).
>
> Continue from §4a: bring up Postgres (`docker compose up -d postgres`), run `pnpm check`
> ONCE to get the real behavioural failure list, then fix the ~57 remaining test files
> against the new resolver contract — mechanical retargets onto the apartments, real
> rewrites where villa-ness is the subject, and **refuse the assertion-gutting deletions**
> called out in §4a (this repo's signature failure class). Then do §4b (amend
> `docs/product-picture.md` + harness), §4c (cutover roster/template samples), §4d (correct
> CLAUDE.md/docs live guidance without rewriting append-only history), and §4e (green
> `pnpm check` by exit code + `pnpm replay` in a separate process + a multi-agent
> adversarial pre-merge review, then merge to main and tag `vCH-20`). Do not re-ask the
> four business questions in §1 — they are answered. Work only on this branch.
