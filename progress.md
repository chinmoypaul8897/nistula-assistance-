# progress.md — Nistula Assistance · Build Log

> **The session-memory layer.** Every chunk session: read plan.md §1–§3 first, then this file top to bottom, then your assigned chunk in plan.md §8. Every chunk session ENDS by appending an entry here using the plan.md §9 template. If it's not written here, the next session doesn't know it happened.

## Status

- **Current chunk pointer:** CH-07 (Policy + full guardrails) — next up. **CH-06 (Knowledge base) DONE** on `chunk/CH-06-knowledge-base` — `pnpm check` green at **289 tests**; `pnpm kb:build` compiles `kb/villas.md`/`policies.md`/`faq.md` from curated `kb/source/*` (+ the RoomTypeList occupancy snapshot), block **[3] KNOWLEDGE now ships inside the cached prompt head** (~**2573 tokens**, budget 6000, version `cb4f0950`), and the guardrail-1 fee exemption is wired — **context-BOUND**: each published fee carries the fee terms of its own sentence, so "an extra adult is ₹1,500" may be sent with no tool call while "Villa B3 is ₹1,500 per night" is still BLOCKED (§6.5's second clause). The AI now answers villa/policy/FAQ questions from the KB; stay prices still come only from `get_quote`. Quirks ship as a template + **labelled placeholder** B3/Apartment-11 notes (real villa-team content = OQ-01, final content pass). **A 7-lens adversarial review ran pre-push and found a real money-guardrail hole (a flat `number[]` whitelist let a fabricated nightly rate through) plus two invented KB claims — all fixed before merge; see the review addendum in the CH-06 entry.** **Paul's live phone demo PASSED (2026-07-12) — Definition of done fully met.** **CH-05 (Price tools) DONE** on `chunk/CH-05-price-tools` — `pnpm check` green at **260 tests**; the brain now has `get_quote`/`get_availability`/`get_booking_link` behind a ≤5-round tool loop, price-integrity + negotiation guardrails, and degraded-mode; the live `/api/quote` shape was cross-checked against the vercel preview (EXACT match, incl. the live `available:false`-on-200 case) and `WEBSITE_BASE_URL` is now boot-required (dev value in local `.env`). Remaining acceptance: Paul's live phone demo (price question → exact preview quote) as the post-merge confirmation. **CH-04 (Brain v1 — voice) DONE — merged to `main` (merge commit `901c04e`, PR #9, CI green Node 22 + 24), tagged `vCH-04`, and deployed live to the test service (`/health` ok).** `pnpm check` green at 188 tests; a live Anthropic integration smoke passed (voice on-target, price deferred with no invented ₹, static prompt head caches — 1655 tokens written on msg 1, read back on msg 2). The service now REPLIES in Nistula's voice instead of echoing; no tools yet, so every factual/price/availability question is deferred (correct until CH-05). **`ANTHROPIC_API_KEY` is required at boot from CH-04** (set in local `.env` + Railway, live-validated). **Remaining acceptance: Paul's live 10-message phone demo on the test line as the post-merge confirmation** (runbook has the red-team probe). CH-00/CH-00b/CH-01/CH-02/CH-03 also merged and tagged (`vCH-00`…`vCH-03`).
- **LIVE on Railway (2026-07-10):** service `nistula-assistance-` (trailing hyphen is the real service name) at **`https://nistula-assistance-production.up.railway.app`**, `/health` healthcheck gate via committed `railway.json`. Meta webhook wired end-to-end: callback verified, `messages` field subscribed, and the **WABA-level `subscribed_apps` link created via API** (the dashboard never creates it — see CH-02 entry). Live round trip proven: guest message → DB → `sendText` reply → phone; statuses walked the rank lattice; dedupe replay was a no-op. **Auto-deploy from main: ON and PROVEN (2026-07-11, Paul-authorized, done via CLI):** the repo had simply been DISCONNECTED from the service (research vs Railway docs: `railway up` never pauses triggers; old deployments' branch metadata is "from the last build, not proof of active connection"). Reconnected with `railway service source connect --repo chinmoypaul8897/nistula-assistance- --branch main --service nistula-assistance-` — connecting immediately auto-built and shipped main head (`eec8b0f`) to SUCCESS, which IS the live verification; every merge to main now ships itself behind the `/health` gate, no more post-merge `railway up`. Railway CLI service link persisted in-repo 2026-07-11 (`railway service` — without it, service-less CLI calls hang on an interactive picker). Stray project `fantastic-motivation`: DELETED via `railway delete` 2026-07-11 (Paul-authorized); Railway grants a 48h grace window (`deletedAt: 2026-07-13`) so it lingers in project lists until then — nothing left to do.
- **Env values (2026-07-11):** local `.env` holds `NODE_ENV=development`, `PORT=3100` (3000 is owned by another local project), `DATABASE_URL` → local docker Postgres, all four WA values + `ANTHROPIC_API_KEY`. Railway service variables hold the four WA values + `NODE_ENV=production` + `TZ` + `ANTHROPIC_API_KEY` (set via the CH-02 stdin-script pattern — values never transit chat/shell history; token rotation reuses it; the key travelled clipboard → in-process script → both stores, validated 200 against `GET https://api.anthropic.com/v1/models`, Railway value VERIFIED, clipboard cleared, script deleted). `WA_VERIFY_TOKEN` ROTATED 2026-07-10 after Meta's handshake wrote it into pre-fix request logs (logging fixed same session; Meta still holds the OLD token and only needs the new one at the next webhook-config edit — paste from `.env` then). Test number `+1 555-179-8672`; WABA ID `1377084767847948`.
- **Standing dev workflow (CH-02 decision D8):** Meta's callback points permanently at the Railway domain — no tunnels, ever. Daily iteration = fixtures + signed local POSTs; end-of-chunk live demo = `railway up` the chunk working tree PRE-merge (doubles as env-completeness check); merge → auto-deploy ships identical content. Binding topology rule (D2): EVERY outbound anywhere goes through `wa/client.ts` `sendText`.
- **How to run:** `docker compose up -d postgres` → `pnpm dev` (migrations apply at boot) → `GET http://localhost:3100/health`. Gate: `pnpm check` (typecheck + lint + tests incl. DB suite). CI runs the same on Node 22 + 24 with a postgres service container.
- **Open-questions register:** all human-answerable inputs (villa-team quirks, missing fees, the deposit-model decision, facts to confirm) live in [`docs/open-questions.md`](docs/open-questions.md) as **OQ-01…OQ-14** — Paul fills answers there; the KB export they feed is `nistula-kb-export/`.
- **⚑ STANDING DECISION (Paul, 2026-07-11) — content inputs are NOT chunk blockers.** The OQ register (`docs/open-questions.md`) is deferred to a **FINAL CONTENT PASS after the last engineering chunk**. Those items (quirks, real villa copy, missing fees, facts to confirm) depend on slow external processes — the villa team and website-content finalisation — so **every chunk session builds its engineering with the content available NOW** (real policies/FAQ/occupancy + placeholder villa copy + stubbed/empty quirks), wires the seam so real content drops in later, and records what's stubbed. **Do NOT stop or defer a chunk because an OQ is unanswered.** This overrides §0's "stop on a missing decision" **only for these content/data inputs** — a genuine missing ENGINEERING decision or external API contract still stops per §0. In the final pass the OQ answers are loaded, the website export re-run, and the content-dependent acceptance (CH-06's quirk-aware demo, CH-19's six scenarios) validated — before go-live. Concretely: CH-06 ships the `kb-build` pipeline + block [3] wiring + the guardrail-1 whitelist seam against current content; it is DONE when the machinery + real policy/FAQ answers work, not when every villa's prose/quirks are final.

## Table of contents (chunk ledger)

| Chunk | Name | Status | Entry |
|---|---|---|---|
| Pre-CH | Orientation & repo organisation | ✅ DONE 2026-07-07 | [↓](#pre-ch--orientation--repo-organisation--done-2026-07-07) |
| CH-00 | Repo bootstrap | ✅ DONE 2026-07-07 | [↓](#ch-00--repo-bootstrap--done-2026-07-07) |
| CH-00b | Post-merge audit fixes | ✅ DONE 2026-07-07 | [↓](#ch-00b--post-merge-audit-fixes--done-2026-07-07) |
| CH-01 | Database core | ✅ DONE 2026-07-07 | [↓](#ch-01--database-core--done-2026-07-07) |
| CH-02 | WhatsApp client + webhook | ✅ DONE 2026-07-10 | [↓](#ch-02--whatsapp-client--webhook--done-2026-07-10) |
| CH-03 | Echo pipeline (queue + debounce) | ✅ DONE 2026-07-10 | [↓](#ch-03--echo-pipeline-queue--debounce--golden-path--done-2026-07-10) |
| CH-04 | Brain v1 — voice | ✅ DONE 2026-07-11 | [↓](#ch-04--brain-v1--the-voice--done-2026-07-11) |
| CH-05 | Price tools | ✅ DONE 2026-07-11 | [↓](#ch-05--price-truth--quote--availability-tools--done-2026-07-11) |
| CH-06 | Knowledge base | ✅ DONE 2026-07-12 | [↓](#ch-06--knowledge-base--done-2026-07-12) |
| CH-07 | Policy + full guardrails | ⬜ pending | |
| CH-08 | Short-term memory | ⬜ pending | |
| CH-09 | Long-term memory | ⬜ pending | |
| CH-10 | eZee mirror | ⬜ pending | |
| CH-11 | Booking awareness | ⬜ pending | |
| CH-12 | Lifecycle engine | ⬜ pending | |
| CH-13 | Staff tasks | ⬜ pending | |
| CH-14a | Takeover + escalation SLA | ⬜ pending | |
| CH-14b | Night queue + digest | ⬜ pending | |
| CH-15 | Lead follow-up + consent | ⬜ pending | |
| CH-16 | Draft mode | ⬜ pending | |
| CH-17 | Watchdog & costs | ⬜ pending | |
| CH-18a | Hardening + runbook + checklist | ⬜ pending | |
| CH-18b | History import | ⬜ pending | |
| CH-19 | Acceptance — six scenarios | ⬜ pending | |

Update this table (status + entry link) at the end of every session.

## Repo map (current reality)

```
nistula-assistance/             ← repo root (folder renamed pre-git-init; Pre-CH open question 2 closed)
  plan.md                       ← THE build spec (single source of truth)
  progress.md                   ← this file
  CLAUDE.md                     ← session orientation for Claude Code
  runbook.md                    ← operations doc (stub, grows per chunk)
  .gitignore                    ← first commit on main; guards secrets (+ !.env.example negation)
  .env.example                  ← §3.7 names only, never values
  .env                          ← local dev values (gitignored)
  credentials-local/            ← CREDENTIALS.md (eZee etc.) — gitignored, never commit/copy
  package.json · pnpm-lock.yaml · pnpm-workspace.yaml · tsconfig.json · tsconfig.build.json
  eslint.config.js · .prettierrc · .prettierignore · vitest.config.ts
  .github/workflows/ci.yml      ← pnpm check + audit + fixture PII grep, Node 22/24 matrix
  railway.json                  ← healthcheck gate config-as-code (deploy safety)
  .railwayignore                ← secrets structurally excluded from railway up uploads
  src/
    config.ts                   ← zod-validated §3.7 registry, fail-fast, secret-free summary
    server.ts                   ← fastify bootstrap, GET /health, boss boot + drain, webhook mount
    lib/                        ← phone.ts · time.ts · http.ts · logger.ts (+ summarizeError)
    wa/                         ← signature.ts · webhook.ts · client.ts (intent+dispatch split) · types.ts
    brain/                      ← debounce.ts (windows + pure decision) · worker.ts (echo turn v0, CH-03)
    jobs/                       ← index.ts (boss singleton, queues, registerJobs, scheduleCron)
    ops/                        ← alerts.ts (log-only alertOps seam until CH-17)
  scripts/                      ← fixture-scrub.ts (PII scrubber) · kb-build.ts (`pnpm kb:build`, CH-06)
  test/                         ← unit + integration tests (167) · fixtures/wa/ (scrubbed live captures)
                                  golden-path.test.ts = the forever-green e2e (CH-04 edits one assertion)
  docs/
    product-picture.md          ← the six acceptance scenarios (CH-19 contract)
    ezee/                       ← eZee Connectivity API mirror (00_INDEX.md … 09, FULL, _inventory.json)
  kb/                           ← the knowledge base = system-prompt block [3] (CH-06)
    villas.md · policies.md · faq.md  ← GENERATED by `pnpm kb:build` — never hand-edit
    quirks.md                   ← HAND-maintained (kb-build never writes it); placeholder B3 + Apt-11 notes
    source/
      voice-guide.md            ← Nistula voice guide v1.1 (feeds CH-04 block [2])
      roomtypes.json            ← eZee CFG-05 RoomTypeList occupancy snapshot + refresh instructions
      website-content/          ← curated villas.json · policies.md · faq.md (distilled from nistula-kb-export/)
  nistula-kb-export/            ← RAW website export (re-runnable upstream; prompt at the end of this file)
```

## Rented-track status (plan §10 — Paul-side, updated 2026-07-08)

| Item | Status |
|---|---|
| GitHub repo + doc inputs | ✅ done (Pre-CH/CH-00) |
| Railway project + Postgres | ✅ done, CLI-verified 2026-07-08 |
| Meta dev app + test number + System User token | ✅ done 2026-07-10 — app "Nistula Assistance" (WhatsApp use case), business portfolio "Nistula", test number, System User token (Never expiry, TWO permissions: `whatsapp_business_messaging` + `whatsapp_business_management` — `business_management` is not offered on use-case apps and is not needed); token verified live |
| Meta business verification | 🕐 docs-collection email drafted (living-guide artifact) — research-verified 2026-07-10: unverified cap = 250 unique recipients/rolling-24h for business-initiated templates (replies uncapped); next tier now 2,000; free verification suffices — do NOT buy "Meta Verified"; India doc list in artifact (GST cert is the workhorse; partnership deed NOT accepted; sole-prop legal name = proprietor's PAN name) |
| Anthropic API key (CH-04) | ✅ done 2026-07-11 — key in local `.env` + Railway service variables, live-validated against `/v1/models` |
| Website content export + quirks template (CH-06) | ✅ export DONE + consumed — CH-06 curated `kb/source/*` from `nistula-kb-export/`; 🕐 **quirks still with the villa team (OQ-01)** — CH-06 shipped a labelled placeholder for B3 + Apartment 11 so the machinery demos; real notes land in the final content pass |
| Staff roster + DONE briefing (CH-13) | ⬜ collection format in the no-Facebook guide |
| BSP signed, v4 coexistence in writing (before 15 Oct 2026) | ⬜ outreach starting — MSG91 → Dualhook → 360dialog per §10 |
| Website `/api/debug/*` gating | 🕐 queued for Claude (see website note) |
| healthchecks.io (CH-17) · Railway Hobby upgrade · test SIM | ⬜ optional-now items — tracked in the living guide's "coming on the go" list |

**Session hand-off note (updated 2026-07-11):** Paul's manual work is guided by ONE artifact (URL also in Claude's memory dir): the **living manual-steps guide 🔑** `https://claude.ai/code/artifact/30d5b703-f0dd-4214-a524-ac17282d358e` (done ledger + active parts; Paul's standing instruction: every future manual task gets added here, researched-first, finished parts collapsed). The old **no-Facebook task list 🧭** `https://claude.ai/code/artifact/409539e9-2e4d-47df-8529-96acf65961f2` is RETIRED (tombstone page — safe to delete from the gallery); of its items, the Anthropic key is DONE (see Status header), while quirks message, staff roster and BSP outreach remain open in the living guide (the BSP research found "Dualhook" is NOT a BSP but a $12/mo coexistence layer with direct Meta webhooks — matches plan §5 architecture best; take to planning chat before BSP signing). gh CLI (`$env:LOCALAPPDATA\Programs\gh\bin\gh.exe`) and Railway CLI are installed + authenticated as chinmoypaul8897.

**Website (new facts, 2026-07-08):** the site was recently rebuilt and is NOT yet on nistula.life — preview at `https://nistula-website.vercel.app` (candidate dev `WEBSITE_BASE_URL` per §3.7; confirm at CH-05). Codebase: private repo `chinmoypaul8897/nistula-website`; Paul granted Claude **read-only** access — NO changes/pushes there without explicit approval per change. ⚠️ The preview calls the LIVE eZee API: never touch booking-creating endpoints; only polite GETs to `/api/quote`/`/api/availability`. The §10 debug-gating task = Claude analyses read-only and proposes a fix for Paul's approval.

---

## Entries

### Pre-CH · Orientation & repo organisation — DONE 2026-07-07

**Built:**
- Organised the raw planning inputs into the plan.md §3.2 layout: `product-picture.md` → `docs/product-picture.md`, voice guide → `kb/source/voice-guide.md` (the exact path CH-04 requires), `ezee api/` → `docs/ezee/`.
- Pulled the credentials folder OUT of the eZee docs and to root as `credentials-local/` (renamed from "Private Secure Folder Credentials (Never Coomit on Git )") so the docs tree is clean and the ignore rule is exact.
- Created `.gitignore` before any git activity (plan §3.6: gitignore first, always) covering `.env*`, `credentials-local/`, `CREDENTIALS.md`, `node_modules/`, `dist/`, `*.dump`.
- Created this progress.md with the chunk ledger and status header.

**Decisions made while building:**
- This folder (`c:\Users\chinm\nistula assistance code`) is treated as the repo root itself — CH-00 will `git init` here and add the GitHub remote, rather than creating a nested `nistula-assistance/` folder. Reason: everything is already laid out here in repo shape; nesting would duplicate.
- Credentials folder renamed to `credentials-local/` for a clean, exactly-matchable gitignore entry. Contents untouched.

**Observed reality:**
- Machine: Node **v24.14.1** (plan pins Node 22 LTS — see Open questions), git 2.43, Docker 29.4 present. **pnpm NOT installed** — CH-00 must start with `corepack enable` (or `npm i -g pnpm`).
- eZee docs mirror is large (~2 MB total; `ezee_connectivity_api_FULL.md` alone ~1 MB). Chunk sessions should read only the file their chunk names (`04_bookings.md` for CH-10), never the FULL file wholesale.
- Root path contains spaces (`nistula assistance code`) — always quote paths in shell commands.

**Deviations from plan.md:** none (no code yet). File placement follows §3.2 exactly.

**Open questions:**
1. Node version: machine has v24 (current LTS), plan says 22 LTS. Recommendation: build on 24 and pin `"engines": {"node": ">=22"}` — nothing in the stack is version-sensitive between 22 and 24. Paul to confirm at CH-00.
2. Folder name has spaces and differs from the repo name `nistula-assistance`. Works fine, but if Paul prefers renaming the folder to `nistula-assistance`, do it BEFORE CH-00 (before git init / Railway wiring).

**How to verify:** `ls` the root — should show exactly `plan.md`, `progress.md`, `.gitignore`, `credentials-local/`, `docs/`, `kb/`. `kb/source/voice-guide.md` and `docs/ezee/00_INDEX.md` exist.

---

### CH-00 · Repo bootstrap — DONE 2026-07-07

**Built:**
- Git repo initialised on this folder (`main` + branch `chunk/CH-00-repo-bootstrap`, remote `origin` → `chinmoypaul8897/nistula-assistance-`); first commit on main is `.gitignore` alone per §3.6; docs corpus + all code ride the chunk branch (18 commits total, Conventional Commits with `Refs: CH-00`).
- Toolchain: pnpm 11.10.0, TypeScript 5.9 strict (`noUncheckedIndexedAccess`), ESLint 10 flat config + typescript-eslint + prettier, vitest 4; scripts `dev/build/start/test/check` per CH-00 step 5; `pnpm-workspace.yaml` carries `allowBuilds: esbuild`.
- `src/config.ts`: zod schema for every §3.7 variable with registry defaults; only `NODE_ENV`/`PORT` required in this phase; blank env values treated as unset; NIGHT_*/FAKE_NOW_IST range-checked at boot; FAKE_NOW_IST boot-refused in production; §3.3 roster integrity (OPS_NUMBERS/STAFF_ROSTER_JSON phones normalised at load, boot fails on bad entries); secret-free `configSummary()` printed at boot.
- `src/lib/`: `phone.ts` (§5.2 E.164, zero-led country codes rejected) · `time.ts` (`nowIST`, `atISTHour`, `isNightIST`, FAKE_NOW_IST honoured) · `http.ts` (single fetch chokepoint, 10s timeout, 3-try jittered backoff on 5xx/network, injectable, discarded 5xx bodies cancelled) · `logger.ts` (pino v10, redaction of all secret keys in BOTH env and camelCase Config spellings, `loggableBody` prod guard).
- `src/server.ts`: fastify 5, schema-validated `GET /health` → `{ok, version, uptime}`, dotenv loaded only on direct execution, guarded graceful shutdown (dedupe flag, error path, 10s force-exit, `TODO(CH-03)` pg-boss hook).
- Tests: 69 across 6 files (`pnpm check` green); CI workflow: `pnpm check` + `pnpm audit --audit-level high` + fixture `+91` grep guard on push, Node 22/24 matrix; `.env.example` (names only) + `runbook.md` stub.

**Decisions made while building:**
- Node: build on machine Node 24, `engines >=22.13.0` (floor set by eslint 10 / pg-boss 12), CI matrix tests both — closes Pre-CH open question 1 (Paul confirmed).
- pnpm installed via `npm i -g pnpm` — `corepack enable` hit EPERM (Node lives under Program Files; needs elevation).
- TypeScript stays on ^5 per plan §3.1 even though 6.0.3 exists — a major bump is a planning-chat decision.
- Approved dep additions: `typescript-eslint`, `eslint-config-prettier`, `@eslint/js` (ESLint 10 is flat-config only and cannot lint TS alone).
- CH-00 commits are scope-less (`chore:`/`feat:`/`ci:`/`docs:`) — the §3.6 scope list names modules that don't exist yet; scoped commits start CH-01 (`feat(db): …`).
- `.gitignore` gained `!.env.example` — the Pre-CH `.env.*` pattern swallowed it; this is the single sanctioned exception. Also added `*.stackdump`.
- No empty module placeholder dirs (`src/wa/` etc.) — git can't track them; each chunk creates its own (§3.2 deviation, recorded).
- `CLAUDE.md` committed although not in the §3.2 layout — session-orientation value outweighs layout purity.
- FAKE_NOW_IST format fixed as IST wall clock `YYYY-MM-DDTHH:mm[:ss]` (also accepts a space separator).
- Git identity stays `chinmoypaul8897@gmail.com` (matches the GitHub account owner; Paul confirmed).

**Observed reality:**
- pnpm 11 ignores the `pnpm` field in package.json — build-script approval lives in `pnpm-workspace.yaml` (`allowBuilds`).
- dotenv v17 prints an injection banner unless `quiet: true`; pino v10 exports `LoggerOptions` top-level; zod is v4 (root import is the v4 API).
- `pnpm audit`: 1 moderate advisory in the tree — below the `--audit-level high` CI gate; recheck at CH-01.
- Pre-push 3-agent adversarial review (spec / code / secrets) found and fixed: blank-env-defeats-defaults trap, out-of-range NIGHT_* passing boot, camelCase Config keys unredacted, module-level dotenv side effect in tests, `+0…`/`0091…` phone forms, unconsumed 5xx retry bodies pinning sockets, CI not testing the engines floor. Secrets audit verdict: CLEAN across all commits.
- Two commit subjects run 52/53 chars (>50, §3.6): `chore: scaffold toolchain (…)` and `fix: satisfy strict tsc on pino types and abort test` — left intact (unshared history not worth rewriting), noted here.

**Deviations from plan.md:** dep additions, `!.env.example` negation, CI Node matrix, no placeholder dirs, CLAUDE.md committed, scope-less CH-00 commits — all listed above with reasons; everything else per spec.

**Open questions:** none — both Pre-CH questions closed (Node 24/engines; folder renamed to `nistula-assistance` before git init).

**How to verify:** `pnpm check` (69 tests green) · `pnpm dev` then `GET http://localhost:3000/health` → `{ok:true, version, uptime}` and a secret-free config summary in the boot log · `git log --oneline` shows the CH-00 series with `.gitignore` as the root commit.

---

### CH-00b · Post-merge audit fixes — DONE 2026-07-07

**Built:** a final three-auditor pass over merged main (definition-of-done, repo/remote consistency, behavioural code sweep) returned GREEN/GREEN/YELLOW. The YELLOW's findings, all fixed on `chunk/CH-00b-audit-fixes`:
- Logger built at buildServer() call time instead of module import — the singleton froze LOG_LEVEL/NODE_ENV before main() loaded `.env`, so the boot summary printed a level it wasn't using (dev/`start` only; prod and tests were unaffected). Proven fixed: `.env LOG_LEVEL=silent` now boots silent while `/health` serves.
- FAKE_NOW_IST date part now validated against the real calendar (Date.UTC silently rolled `2026-02-31` → Mar 3 past the regex).
- OPS_NUMBERS duplicates (same person, different spellings) collapse to one entry; two roster members sharing a phone now refuse boot by name (staff-command matching must stay unambiguous).

**Decisions made while building:** `pnpm build` + `pnpm start` exercised for the first time (both work; `dist/` correct); orphaned node child from a stopped `pnpm start` held port 3000 — killed by PID; production FAKE_NOW_IST boot-refusal verified end-to-end against `dist/`.

**Observed reality:** GitHub emits Node-20 deprecation annotations on `actions/*@v4` — runs still green; bump action majors in a later chunk. `pnpm audit`: unchanged (1 moderate, below the high gate).

**Deviations from plan.md:** none — CH-00b is a §9-style mini-chunk (fix-only, no new scope).

**Open questions:** none.

**How to verify:** `pnpm check` (74 tests) · put `LOG_LEVEL=silent` in `.env`, `pnpm dev` → no output, `/health` still 200 (remove the line after) · `loadConfig({NODE_ENV:'test',PORT:'3000',FAKE_NOW_IST:'2026-02-31T10:00'})` throws.

---

### CH-01 · Database core — DONE 2026-07-07

**Built:**
- `src/db/schema.ts`: the four §4 tables (`guests`, `conversations`, `messages`, `raw_events`) column-for-column — pg enums verbatim, uuid pks, timestamptz stamps with `$onUpdate` auto-touch on `updated_at`, unique `guests.phone`, nullable-unique `messages.wa_message_id`, unique `conversations.guest_id`, `messages(conversation_id, created_at)` index. `last_processed_message_id` deliberately absent (CH-03's migration).
- First migration `drizzle/0000_conversation-core.sql` committed; `src/db/migrate.ts` applies migrations idempotently at boot BEFORE listen, module-relative (works from any cwd — proven from `$env:TEMP`); `DATABASE_URL` is now required at boot (§3.7 phase model).
- `src/db/client.ts`: single postgres.js pool via `getDb(url)` — a different URL on a later call throws. `src/db/repos.ts`: `upsertGuestByPhone` (profile name updates only when provided), `getOrCreateConversation` (race-safe via onConflictDoNothing + re-select), `insertMessage` (duplicate `wa_message_id` → `isNew:false` no-op), `insertRawEvent`.
- `docker-compose.yml` (postgres:16, healthcheck, `pgdata` volume) + CI postgres service container on both matrix legs; DB test suite (8 tests) against a self-provisioned `nistula_test` database via vitest globalSetup (degrades gracefully when Postgres is down — unit tests still run); runbook documents both database paths and the migration workflow.

**Decisions made while building:**
- **Railway manual step DEFERRED by Paul (explicit approval) to before CH-02** — CH-01 runs fully on the local Docker path; CH-02's webhook deploy needs Railway, so the step is now a CH-02 precondition.
- Local dev `PORT=3100`: Docker Desktop startup auto-restarts another project's containers (`drdroid-llm-control-plane`, a kind cluster) which binds 3000 — left untouched.
- Repositories live in `src/db/repos.ts` (§3.2 lists only schema/client/migrate — small addition, keeps db module cohesive).
- Column defaults where §4 is silent: `register_pref`/`lang_pref` default `'unknown'`, `conversations.status` default `'ai_active'`, `degraded_notified`/`marketing_opt_in`/`processed` default false.
- pg-boss installed now per CH-01 step 1 (first used CH-03) so its Node floor is locked into the lockfile.
- Test phone data standardised on the reserved-style `+91 7700 900xxx` range; the real business number remains only in the plan-prescribed `phone.ts` normalisation cases.

**Observed reality:**
- Drizzle wraps Postgres errors ("Failed query: …") — the real message (enum/unique violation) lives on `error.cause`; tests must flatten the cause chain.
- `migrationsFolder` is cwd-relative by default — found by the pre-push review as a would-be Railway boot crash; fixed module-relative.
- vitest runs test FILES in parallel → DB provisioning must live in globalSetup (concurrent `CREATE DATABASE` races: codes 42P04/23505).
- Docker daemon startup resurrects other projects' containers; port collisions on shared dev machines are real — check `docker ps` before assuming a port.
- Pre-push 3-agent review (spec §4 column-by-column / behavioural probes / hygiene): spec column-check fully compliant, hygiene zero findings; all code findings fixed (cwd migrations, `$onUpdate`, url-locked pool, globalSetup, test numbers).

**Deviations from plan.md:** `src/db/repos.ts` addition (above) · commit `edcb848` subject is 51 chars (one over §3.6's 50; left — unshared history churn not worth it, recorded) · two commits were initially scope-less and reworded to `ci(db)`/`docs(db)` before push.

**Open questions:** none.

**How to verify:** `docker compose up -d postgres` · `pnpm check` (83 tests incl. DB suite) · `pnpm dev` → boot log shows migrations, then `GET http://localhost:3100/health` → 200 · `docker exec nistula-assistance-postgres-1 psql -U nistula -d nistula -c '\dt'` → the four tables.

---

### CH-02 · WhatsApp client + webhook — DONE 2026-07-10

**Built:**
- `src/wa/signature.ts` (timing-safe HMAC verify + `timingSafeStringEqual` shared with the handshake) · `src/wa/types.ts` (minimal §5.3 shapes, all-optional for tolerant parsing) · `src/wa/webhook.ts` (GET handshake; POST: verify → 401-drops-unverified-unstored → ack 200 → one raw_events row per body → per-entry tolerant parse into guest/conversation/message rows with wa_message_id dedupe; statuses via the rank lattice; NO window-column writes — CH-03's worker owns those).
- `src/wa/client.ts` — the single outbound chokepoint: `sendText(to, body, {conversationId: string|null, sender: 'ai'|'human'|'system'})` with the §3.4 send-intent pattern (row committed `'queued'` BEFORE the Graph call → `'sent'`+wamid or `'failed'`+token-free error; wamid hoisted so post-2xx failures stay healable), `markRead`, `// TODO(CH-12)` window marker, `// TODO(CH-17)` stale-queued sweep.
- `src/db/repos.ts` additions: `applyStatusUpdate` (ONE rank-guarded UPDATE — received<queued<sent<failed<delivered<read, direction='out' only; delivered/read outrank failed per Meta's multi-device case and clear `error`; returns applied/stale/missing/unknown_status + conversationId) and `updateRawEvent` (D6 close-out). `src/ops/alerts.ts`: log-only `alertOps({kind,summary,detail})` seam — CH-17 upgrades the body, call sites never change; CH-05/10/12/13 MUST route through it.
- `scripts/fixture-scrub.ts` (phones→reserved plusless numbers, bodies→lorem, names→placeholders, **wamids→synthetic ids**) + 4 fixtures in `test/fixtures/wa/` — inbound-text/duplicate-delivery/status-update are scrubbed REAL captures from the live round trip; unsupported-type is still authored (replace when a real sticker capture arrives). CI PII guard extended with the plusless `91\d{10}` pattern (only 9177009x allowed).
- Ops: committed `railway.json` (healthcheck /health) + `.railwayignore`; service LIVE at `https://nistula-assistance-production.up.railway.app`; Railway variables set via throwaway stdin-script (in-process round-trip verify; values never in transcript); runbook gained the webhook/deploy/rotation walkthrough. 74→140 tests; CI green.

**Decisions made while building** (all 8 researched by dedicated plan agents pre-build, Paul-approved; full texts in the session plan file):
- **D1 send-intent now:** `'queued'` IS §4's spelling of §3.4's `'sending'` (no schema change; no other use assigns it). Supersedes CH-02 step 3's insert-after wording; CH-12/13/16/17 inherit.
- **D2 no window logic in CH-02** (CH-03 owns the columns, CH-07 guardrail 4 checks, CH-12/13 complete the chokepoint; Meta 131047 is the physical backstop meanwhile) + binding rule: every outbound goes through `sendText`.
- **D3 status lattice** (verified against Meta docs: statuses arrive out-of-order/duplicated, `delivered` skippable, delivered+failed both possible) — one atomic rank-guarded UPDATE; `error IS NOT NULL ⇔ status='failed'`; `queued` older than N min = crashed send-intent (CH-17 sweep target); no consumer may require `read`.
- **D4 log-only `alertOps` seam** — WhatsApp alerting now would be circular (dead token fails the alert send too) and OPS_NUMBERS is unset; structured kinds `wa_send_failed`/`wa_status_failed` from day one; alert detail carries structured fields (`conversationId, waMessageId, errorCode, errorTitle, httpStatus`), free error text stays on the message row only.
- **D5 sendText signature** — both opts REQUIRED, no defaults (conversation_id NULL *means* staff/ops send; sender is guardrail 2's honesty field); demo plumbing send = `sender:'system'` ON the guest conversation (evidence expires at next guest message). Forward note for CH-07/13: tag claimable context rows (e.g. `raw.contextKind`) so guardrail-2 evidence is opt-in.
- **D6 raw_events contract** — one row per verified POST body, `processed` = intake-only (true iff no entry threw; `error` = per-entry exception summaries, never payload text); `event_type` = webhook field value(s); unverified POSTs NEVER stored (401+warn+counter). The processed=false set is CH-18b's re-drive set.
- **D7 Railway secrets** — stdin-script pattern (CLI output discarded; in-process verify); service variables, NOT sealed (irreversible + breaks scripted rotation — revisit CH-18a); standing rule: never a bare `railway variable list/set` outside the pattern; CH-18a commits the parameterised script as the runbook rotation step.
- **D8 deploy flow** — Railway domain is the permanent callback target; `railway up` pre-merge is the live-demo path; auto-deploy ON after this merge; scriptable WABA `subscribed_apps` override is the escape hatch for rare local-delivery needs.
- Smaller: vitest `fileParallelism:false` (multiple DB test files share one test DB via TRUNCATE); `buildServer(logStream?)` for log-assertion tests; test files' wamid constants follow the scrubbed captures.

**Observed reality:**
- **Real payload field names (live captures, v23):** inbound value = `messaging_product · metadata{phone_number_id, display_phone_number} · contacts[]{wa_id, profile{name}, user_id} · messages[]{id, from, text{body}, type, timestamp, from_user_id}`; statuses = `id · status · timestamp · recipient_id · recipient_user_id · pricing{type:"free_customer_service", billable, category:"service", pricing_model:"PMP"}`. The `*_user_id` fields (`IN.<cc><number>` form — phone-bearing!) and `pricing` are NOT in Meta's basic docs — tolerant parsing + the scrubber's inline-phone pass handled both unprompted. No `conversation{}` object observed on delivered statuses.
- **Wamids base64-embed the counterpart phone number** (adversarial review caught it pre-push; confirmed on the live capture). Any tooling that preserves message ids is a PII leak the `+91` grep can't see — the scrubber rewrites them to `wamid.SCRUBBED-*`.
- **The dashboard does NOT create the WABA→app `subscribed_apps` link for this setup.** Callback verified + `messages` field subscribed and still zero deliveries: the WABA routed only to Meta's internal "WA DevX Webhook Events 1P App". Fixed with `POST /{WABA_ID}/subscribed_apps` (System User token). Messages sent before the link exist are NOT redelivered. Diagnosis path that works: app-level state via `GET /{app_id}/subscriptions` with the `app_id|app_secret` token (app id from `debug_token`); system-user `debug_token` carries no WABA target_ids and the phone node has no WABA field — the WABA ID must come from the dashboard.
- **Meta's handshake puts the verify token in the URL query — Fastify's default request log printed it** (found in production logs minutes after go-live). Fixed: `disableRequestLogging` + query-free onResponse hook; token rotated same session. Also: drizzle's `DrizzleQueryError.message` embeds ALL bound params (guest phone/body) — anything persisting or logging exception text must go through `lib/logger.ts summarizeError` (strips to name + first line of the driver cause).
- Railway: CLI re-login RESETS the project link — an unlinked `railway up` tries to provision a NEW project (the "Free plan resource provision limit exceeded" error was that, not a real plan wall). `railway domain status` needs `--service`. Statuses (sent/delivered) arrived within seconds of the reply and walked the lattice correctly in production.
- gh CLI credentials needed `gh auth setup-git` mid-session (git push 403 despite valid gh login); git author identity also vanished — set repo-locally now.

**Deviations from plan.md:** send-intent ordering supersedes CH-02 step 3's letter (D1, approved) · `src/ops/alerts.ts` created ahead of CH-17 (named seam, log-only) · `sendText` returns a result object rather than the raw Message row (callers own failure policy) · unsupported-type fixture still authored, not captured · CH-02's "walkthrough in runbook" also lives as the living manual-steps artifact per Paul's standing instruction.

**Open questions:** none.

**How to verify:** `pnpm check` (140 tests) · message the test line `+1 555-179-8672` from Paul's phone → row in Railway Postgres (`railway connect postgres` → `SELECT direction, sender, status FROM messages ORDER BY created_at`) · `curl https://nistula-assistance-production.up.railway.app/health` → `{ok:true}` · unsigned `curl -X POST .../webhooks/whatsapp` → 401.

---

### CH-03 · Echo pipeline (queue + debounce + golden path) — DONE 2026-07-10

**Built:**
- `src/jobs/index.ts`: pg-boss singleton (`getBoss`/`stopBoss`, url-locked like `getDb`), queues `conversation.process` (policy **stately**, retryLimit 3, retryDelay 10 + backoff, expire 120s) and `conversation.sweep` (standard, retryLimit 0, expire 110s), `registerJobs()` (workers + `boss.on('error')` + sweeper schedule), `scheduleCron(name, cron, tz)`, `makeEnqueue()` — the ONE binding of the debounce windows shared by webhook, worker re-check and sweeper.
- `src/brain/debounce.ts`: `DEBOUNCE_WINDOWS` (15s quiet / 45s max / 60s sweep threshold / `*/2` cron — module constants, NOT env; the literals ARE the spec) + pure `decideDebounce()`. `src/brain/worker.ts`: `processConversation` (cursor-resolved unprocessed messages → quiet/max-wait decision → **claim-LAST in one tx with the send intent** → dispatch → mandated end-of-run re-check) + `sweepStrandedConversations`.
- Migration `0001_conversation-cursor`: `conversations.last_processed_message_id` (plain nullable uuid, NO fk — §4 marks fks explicitly; all three message-pointer columns are deliberately unconstrained cursors). Repos: `resolveMessageCursor` (in-code dangling fallback → process-all + `conversation_cursor_dangling` alert), `getUnprocessedGuestMessages` ((created_at,id) tuple order), `claimConversationTurn` (optimistic CAS; window columns derive from newest guest MESSAGE time), `getConversationTurnContext` (conversation + guest phone + DB `now()` in one read), `findStaleConversations`. `DbLike` (pool-or-tx) type on `db/client.ts`.
- `wa/client.ts` split: `createSendIntent(dbLike,…)` (tx-composable) + `dispatchText()` (Graph call + settle); public `sendText` unchanged = the composition (D2 chokepoint intact). Fixed a latent CH-02 bug: the intent insert sat OUTSIDE the try and could throw despite the never-throws contract.
- Webhook: injected `enqueue(conversationId)` fired only past the `isNew` guard; enqueue failure = warn-and-continue (raw event stays clean — sweeper is the net). `server.ts`: boot = migrations → `boss.start()` → wa client → `registerJobs` → webhook → listen; shutdown = `app.close()` → `stopBoss()` (25s drain) → `closeDb()`, force-exit timer 10s→30s.
- Tests 140→167 in three tiers: pure decision math at real 15s/45s (`debounce.test.ts`, runs with PG down) · zero-sleep boss/worker suites via `fetch({ignoreStartAfter})` + backdated `created_at` (`jobs.test.ts` incl. two STATELY CANARIES, `brain-worker.test.ts` incl. dangling-pointer and microseconds regressions) · **`golden-path.test.ts`** — the forever-green e2e (3 signed POSTs → barrier → real `work()` at 0.5s → exactly ONE echo + queue quiescence). Helpers: `test/helpers/boss.ts` (queue-RESET + spies), `seed.ts`; `buildWaApp` gained an optional `enqueue`.

**Decisions made while building** (D1–D6 pre-reviewed by six independent design-review agents, Paul-approved via the session plan):
- **D1 debounce ≠ `sendDebounced`.** Verified on installed 12.25.1: it is a leading-edge wall-clock-slot throttle — first send in a slot runs IMMEDIATELY (a burst would echo twice) and slot uniqueness (index `job_i4`) spans completed jobs (~7d), silently swallowing the spec's end-of-run re-enqueue. The equivalent built: policy `stately` (index `job_i3`: max one created AND one active per singletonKey — one of each may coexist, so mid-run arrivals always enqueue; two actives impossible even multi-replica) + `startAfter` + worker-side quiet check (quiet ⇔ age ≥ QUIET; re-enqueue at newest+QUIET+1s, DB clock only). BINDING: `batchSize`/`localConcurrency` stay 1 (one stately fetch conflict aborts the ENTIRE fetch statement); boss constructor carries `monitorIntervalSeconds/queueCacheIntervalSeconds: 15` (default 60s leaves a follow-up job invisible ~2min after a long run — matters from CH-04).
- **D2 claim-LAST, atomic with the send intent** (supersedes CH-03 step 3's echo-then-store prose): all fallible think-work precedes the claim; ONE tx = optimistic pointer/window CAS + `'queued'` intent row → commit → Graph dispatch. Every failure state observable: pre-claim throw → pg-boss retry/sweeper (at-least-once processing); post-commit crash → stale `'queued'` row (CH-17 sweep); dispatch failure → `'failed'` + ops alert, NO worker retry (§6.6). **Forward gates: CH-04 keeps the claim AFTER the model call and must raise `expireInSeconds` above the worst-case tool-loop (+ internal handler deadline — expiration re-inserts the job while the old handler still runs); CH-16's draft row joins this same claim tx; CH-17 must actually spec the stale-'queued' sweep (today only a TODO).**
- **D3 cursor column**: plain uuid, no FK (spec-conformant, not a deviation); cursor resolution in CODE, never a scalar subquery — a dangling pointer degrades to process-all + alert instead of silently wedging the guest AND blinding the sweeper.
- **D4 timing values = module constants** with DI seams (§3.7 untouched); env promotion only if CH-17 data demands (planning-chat decision). Invariant quiet ≤ maxWait < sweepAfter is unit-tested.
- **D5 commit scope `jobs`** adopted — §3.6 defines "scope = the module" and §3.2 lists `src/jobs/`; the enumerated list (which also omits `drafts`/`lib`) is read as illustrative. CH-12/17 will reuse it.
- **D6 golden path = posting-first** (burst settles before `work()` registers): with a live worker, a CI stall between POSTs makes a second echo CORRECT behaviour — the assertion would flake on a correct system. Live interleaving is covered zero-sleep in Tier B; live timing by the phone demo. Echo body: bodies joined with `\n`; null-body media renders `[<type>]` and still advances the pointer.

**Observed reality:**
- **The golden path caught a REAL production bug the seeded tests could not:** `timestamptz` carries microseconds, JS `Date` only milliseconds — a cursor round-tripped through `Date` truncates, the newest message matches its own "newer than" query, and the re-check loops forever re-echoing the last message (observed live: 11 loop iterations before timeout). Fix: the cursor travels as Postgres TEXT (`created_at::text` → `::timestamptz`). Seeded rows (explicit JS-Date `createdAt`, µs=000) can never reproduce this — regression test uses a `defaultNow()` row.
- Drizzle raw-`sql` selections bypass driver type mapping: `sql\`now()\`` arrives as a STRING (fixed with `.mapWith`), and a JS `Date` passed as a raw-sql param crashes postgres.js serialization (`ERR_INVALID_ARG_TYPE`) — bind ISO/text strings in raw fragments.
- **pg-boss 12.25.1 verified from installed source:** `createQueue()` on an existing queue is a SILENT NO-OP (`ON CONFLICT DO NOTHING` — options NOT updated; `updateQueue()` is the only way; queue rows outlive test-table TRUNCATEs, so the test helper deletes + recreates queues). `stop({graceful:true})` fully awaits the drain. An unhandled `'error'` EventEmitter event kills the process. `__test__enableSpies`/`getSpy` ride the real `work()` pipeline. Retry state sits BESIDE created/active in the stately index (one per state), and a failed job's retry re-insert can be silently dropped when a sibling occupies the slot — payload is only `{conversationId}`, so the re-check/sweeper cover it.
- A dispatch that gets a duplicate wamid back (test fake) hits the unique index at queued→sent, falls to `failSend`, whose OWN update also conflicts → row stays `'queued'` inert — exactly the CH-17 sweep target; real Meta wamids are unique so this is test-only, but it validated the never-throws envelope.
- Stale dev server from a previous session held port 3100 (`EADDRINUSE` while `/health` answered from the OLD build — uptime gave it away). Check `netstat`/uptime before trusting a local demo.

**Deviations from plan.md:** D1 (spec's own VERIFY clause), D2 (supersedes step-3 prose order; §3.4 doctrine wins — CH-02 D1 precedent), D5 (scope list extension), D6 (test sequencing) — all recorded above with reasons. `DEBOUNCE_WINDOWS` lives in `src/brain/debounce.ts` rather than `src/jobs/index.ts` (keeps Tier A tests import-light; jobs re-imports it). Commit order ran brain-before-jobs so every commit compiles.

**Open questions:** none.

**How to verify:** `pnpm check` (167 tests incl. `golden-path.test.ts`) · burst 3 messages from Paul's phone to `+1 555-179-8672` within ~5s → exactly ONE combined `echo:` reply ~16s after the last message · `railway connect postgres` → `SELECT direction, status, body FROM messages ORDER BY created_at DESC LIMIT 5` shows one `out/sent` echo row · `SELECT name, state FROM pgboss.job ORDER BY created_on DESC LIMIT 5` shows completed jobs · local: `docker compose up -d postgres` → `pnpm dev` → 3 signed POSTs (fixture phone) → one combined echo row with status `failed`/`131030` (fixture phone isn't an allowed recipient — the honest audit row).

**Post-merge addendum (2026-07-11):** the live phone demo PASSED (Paul: 3-message burst → exactly one combined echo) — Definition of done fully met; merged via PR #6, tagged `vCH-03`, CI green on main at 167 tests. Two CI-race test fixes landed AFTER this entry was first committed, each carrying a lesson for future test authors: `6fbaa60` (a test barrier must settle on the raw-event CLOSE-OUT write, not on the message row — the message insert precedes both the enqueue attempt and the D6 close-out) and `3c691c2` (ack-then-ingest persists burst POSTs CONCURRENTLY, so POST order is NOT row order — always compute "newest" by the (created_at, id) tuple, exactly as the worker defines it). Post-merge, outside any chunk session: `ANTHROPIC_API_KEY` was set in `.env` + Railway (see Status header) — CH-04 unblocked.

---

### CH-04 · Brain v1 — the voice — DONE 2026-07-11

*(Merged to `main` (merge `901c04e`, PR #9, CI green) + tagged `vCH-04` + deployed live to the test service; `pnpm check` green (188) + a live Anthropic integration smoke passed. Remaining acceptance: Paul's 10-message phone demo as the post-merge confirmation — add the result here when done.)*

**Built:**
- `src/brain/prompt.ts` — system-prompt blocks [1] identity, [2] a ~700-token distillation of voice-guide v1.1, [4] rules-of-engagement (the no-tools price-deferral rule + injection posture), and the dynamic [6] SITUATION (`buildSituation` — IST stamp + staff on/off + window state). `buildSystemPrompt` places the `cache_control` breakpoint on block [4] (the last static block); the frozen head [1]+[2]+[4] measured **1655 tokens live** (> Sonnet 4.5's 1024 floor).
- `src/brain/claude.ts` — `createConverse` (one `@anthropic-ai/sdk` client, `maxRetries:0`, fail-fast if the key is missing). `converse()` = `messages.create` (model, max_tokens 1024, temperature 0.7, cached system head) wrapped in OUR retry (3 tries, full-jitter backoff on 5xx/429/connection) under a ~55s total deadline; returns text + a 4-bucket usage object.
- `src/brain/cost.ts` — `INR_PER_USD=90` + hardcoded claude-sonnet-4-5 per-MTok prices; `costEventsFor(usage)` → one row per non-zero bucket.
- `src/db`: `cost_events` table + `cost_event_kind` enum (migration `0002_cost-events`); repos `getRecentMessages`, `insertCostEvents`. `src/lib/time.ts` gained `istCalendarDay` + `formatISTDisplay`.
- `src/brain/worker.ts` — the echo is gone: builds the transcript (last 30 msgs — guest→user, ai/human→assistant with `(Front desk)` on human, `system` skipped, leading non-user trimmed, null-body→`[type]`) + situation → `converse` → best-effort `cost_events` log + an info `claude turn` line (token counts; `cacheRead` is the caching proof) → reply. A converse throw → `alertOps('model_failed')` then rethrow, pre-claim (§6.6). `converse`/`nightStart`/`nightEnd` thread through `JobsDeps` + server boot; ANTHROPIC_API_KEY is now required at boot.
- Tests 167→188: new brain-cost/brain-prompt/brain-claude suites (pure, run with PG down), extended brain-worker (transcript mapping, cost rows, model-failure path), and the golden path upgraded to a mocked converse.

**Decisions made while building:**
- **cost_events gains `anthropic_cache_write`** (Paul-approved this session, AskUserQuestion): §4 listed four kinds; the extra value lets CH-17 separate the 1.25× cache-write premium from base input. Recorded §4 deviation.
- **Cache the static head through block [4]**, not §5.5's literal "blocks 1–3": block [3] KNOWLEDGE is CH-06, and [1]+[2] alone (~850 tok) is below the 1024 floor. The live smoke confirmed the head caches (write 1655 on msg 1, read 1655 on msg 2).
- **expireInSeconds STAYS 120** — the D2 "raise" is deferred to CH-05's tool loop (a single CH-04 call is ~40s worst case). CH-04 delivers the other half of the gate: converse's ~55s total deadline < 120s. `TODO(CH-05)` left in `jobs/index.ts`.
- **Retry mirrors lib/http.ts doctrine inside claude.ts** rather than routing SDK calls through http.ts (http.ts wraps a raw `Response`; the SDK owns its own abort/timeout). SDK retry disabled.
- **Model default stays `claude-sonnet-4-5`** — it accepts `temperature 0.7`; an Opus-4.7+/Sonnet-5 `MODEL_ID` would 400 on temperature (flagged in a code comment; changing the default is a planning-chat call).
- Transcript mapping rules (my calls): `system` rows excluded, `human` prefixed `(Front desk)`, leading non-user trimmed (Anthropic requires opening on `user`), null-body → `[type]` (media handling is CH-07/§6.7). Cost logging is best-effort. **No guardrail pipeline in CH-04** — behaviour is prompt-only; leak/price/promise guardrails land CH-05/07.

**Observed reality:**
- **Live integration smoke** (real key, temp script deleted after): static head = **1655 tokens**; msg 1 wrote the cache (`cache_creation_input_tokens: 1655`), msg 2 read it (`cache_read_input_tokens: 1655`) — caching works and the breakpoint is right. Voice on-target: "are you a bot?" → the exact identity line; "how much…?" → deferred, no invented ₹.
- **@anthropic-ai/sdk 0.110.0:** `APIConnectionError`/`APIConnectionTimeoutError` are `instanceof APIError`; connection errors carry no `.status`; 429/5xx carry a numeric `.status`; instance `.name` is `'Error'` (not the class name), so retry classification uses `instanceof` + duck-typed `.status`. `messages.create(params, {timeout})` throws `APIConnectionTimeoutError` on timeout (retryable) — a user `AbortSignal` would throw a NON-retryable user-abort, hence the per-attempt `timeout` option with the total deadline enforced in the loop.
- pg `numeric`/`date` columns map to **strings** in drizzle — cost `quantity`/`inr_estimate` and `day` travel as strings.
- Fastify's `disableRequestLogging` prints a v6-deprecation warning (pre-existing since CH-00/02) — harmless, untouched.

**Deviations from plan.md:** `anthropic_cache_write` kind (Paul-approved) · cache breakpoint on block [4] (§5.5's "blocks 1–3" predates the not-yet-existing block [3]) · expireInSeconds raise deferred to CH-05 (D2 gate half-delivered — internal deadline now, raise later) · `src/lib/time.ts` gained two IST formatters · an info `claude turn` log line added (token counts / cache proof). All recorded above with reasons.

**Open questions:** none.

**How to verify:** `pnpm check` (188 tests incl. the mocked-Claude golden path) · local: `docker compose up -d postgres` → `pnpm dev` → 3 signed fixture POSTs → one outbound row with a Nistula-voice reply (status `failed`/`131030` — the fixture phone isn't an allowed recipient) + `cost_events` rows · **live demo:** `railway up` pre-merge → 10-message conversation on `+1 555-179-8672` running the runbook red-team probe (price deferred, "bot?" owned, injection ignored, Hindi mirrored) · cache/cost: `SELECT kind, quantity, inr_estimate FROM cost_events ORDER BY created_at DESC` shows input/output/cache rows, and an `anthropic_cache_read` row on message 2 (plus the `claude turn` log's `cacheRead > 0`) proves caching.

**Post-merge addendum (2026-07-11):** the live phone demo **PASSED** — Paul messaged the test line and got Nistula-voice replies; Definition of done fully met. **Prompt caching confirmed LIVE in production** from the `claude turn` logs: first turn `cacheWrite:1655`, follow-up turn `cacheRead:1655`. No `model_failed`/`wa_send_failed` in prod.

**Cutover incident (resolved) — "API access blocked":** right after the CH-04 deploy the test line went silent — no `POST /webhooks/whatsapp` reached the service at all. Our receiver was healthy and reachable (GET handshake with a bad token → 403), so it was upstream. Diagnosed via the Graph API: **every** call, including `GET /me`, returned `{"error":{"message":"API access blocked.","type":"OAuthException","code":200}}`. Key tell: code **200 = app/account-level access block** (NOT code 190 "invalid token", NOT a per-resource permission gap since even `/me` fails) — and a blocked app stops Meta **webhook delivery** too, which is why nothing arrived. **Not a code/CH-04 issue.** Paul cleared it in the Meta dashboard (app/account restriction) and delivery + replies resumed immediately. **Runbook rule:** *webhook silent + all Graph calls incl. `/me` return code-200 "API access blocked" ⇒ a Meta app/account restriction — fix in the Meta dashboard, not in code.* (Also: production replies are NOT instant — the 15s debounce means ~16s to reply; and rapid redeploys can drop in-flight Meta deliveries.)

---

### CH-05 · Price truth — quote & availability tools — DONE 2026-07-11

*(`pnpm check` green at **260 tests** (188→260, +72). Live `/api/quote` shape cross-checked against the vercel preview — EXACT match. Dev server boots clean with the now-required `WEBSITE_BASE_URL`. Remaining acceptance: Paul's live phone demo — a price question returning the exact preview quote — as the post-merge confirmation; add the result here when done.)*

**Built:**
- `src/lib/villas.ts` — the §5.4 map (8 units, `villaId`=eZee RoomID) + `resolveVilla()` (deterministic fuzzy: unit>type precedence, `b3`→B3, `3bhk`→villa type-set, `apt 11`/`a9`/`11`→apartment, `solim`/`sioli`→Siolim via edit-distance≤2 confined to the "siolim" token) + `getVillaById`/`bookingUrl`.
- `src/brain/tools/` — `registry.ts` (tool-def contract; zod input schema → Anthropic `input_schema` via zod v4 `z.toJSONSchema` + `toInputSchema` strips `$schema` and drops defaulted fields from `required`; handlers NEVER throw — unknown tool/bad input become `{ok:false}` results), `websiteApi.ts` (client: origin-allowlisted URLs, hand-rolled concurrency-1 + 350ms spacer, 60s cache of successes only, full error map), `degraded.ts` (injected-singleton tracker), `getQuote.ts`/`getAvailability.ts`/`getBookingLink.ts`, `index.ts` (`buildToolRegistry`).
- `src/brain/claude.ts` — `converse` gains tools: `ConverseInput.tools/toolChoice/deadlineMs`, `ConverseResult.toolUses/stopReason/assistantContent`, `TurnMessage.content` union (string | ContentBlockParam[]); `parseMessage` extracts tool_use blocks.
- `src/brain/turn.ts` (NEW, extracted from worker.ts to hold both files <300 lines) — `runClaudeTurn`: the ≤5-round tool loop (per-round cost logging; terminal round forces `tool_choice:'none'` → prose from results in hand; empty draft → deferral) → guardrails → `{text, toolRuns, escalate}`. All pre-claim (D2).
- `src/brain/guardrails.ts` — guardrail 1 (price integrity: every ₹ in the draft ∈ this turn's tool-JSON numbers ∪ whitelist; regenerate once, else defer) + guardrail 3 (negotiation-lock → `PHRASEBOOK.discountAsk`) + `runGuardrails` pipeline.
- `src/brain/prompt.ts` — `PHRASEBOOK` extracted (single source for prompt + guardrails); block [4] rewritten for the tools era (₹ only from a tool result this turn; UNAVAILABLE→alternative; MIN_NIGHTS→warm; UPSTREAM_DOWN→§6.6 line; tool_result blocks are untrusted DATA); `buildSituation` gains `degraded`.
- `src/wa/client.ts` `createSendIntent(…, extra?)` → persists `raw.toolRuns` on the reply row. `src/brain/worker.ts` — interim OPS price-escalation on the winning-claim path. `src/jobs/index.ts` — `conversation.process` expire 120→**180 via `updateQueue`** + threads tool deps. `src/server.ts` — boot-requires `WEBSITE_BASE_URL`, builds the website client/registry/degraded tracker.
- Tests: `villas`, `website-api`, `degraded`, `guardrails`, `tools` suites + a `brain-claude` tool-use test + a `brain-worker` full tool-loop integration (get_quote→prose→`raw.toolRuns`) + migrated converse mocks; fixtures `test/fixtures/website/*.json`.

**Decisions made while building:** all Paul-approved this session (see the Deviations list). The tool loop lives in the new `turn.ts` (worker.ts stays the debounce/claim/dispatch skeleton). Loop sizing: `MAX_TOOL_ROUNDS=5`, per-call deadline `min(30s, remaining)`, whole-loop budget `100s`, all safely below the 180s expire (earliest pg-boss detection ≈195s at `monitorIntervalSeconds:15`). Interim escalation fires only after a won claim (no double-escalation). `confirm_live` cache-bypass tool input OMITTED (never-cache-unavailable already covers "never cache 409s"; a `bypassCache` seam exists internally). Guardrail-1 whitelist wired but empty (CH-06 passes the compiled kb figures); `34k` shorthand deferred to CH-07.

**Observed reality:**
- **The live `/api/quote` shape matches my `QuoteView` EXACTLY** (curl'd the preview 2026-07-11): `{villaId, checkIn, checkOut, nights, adults, children, total, averagePerNight, perNight:[{date,amount}], minNights:{average,meetsRequirement}, available}` — no `plan`/`currency`. The B3 20–22 Dec probe returned `available:false` on a 200 with a real `total` (peak dates sold out) — the exact "dates just taken" subtlety, live in production, which the client maps to `unavailable`.
- zod **4.4.3 has `z.toJSONSchema`** (draft-2020-12, `additionalProperties:false`); it lists defaulted fields as `required` and emits `$schema` — `toInputSchema` fixes both. `.refine()` is runtime-only (dropped from the JSON schema), `.regex()`→`pattern`.
- Adding `tools` grows the cached prompt prefix → expect ONE `cacheWrite` bump on the first post-deploy turn, then steady `cacheRead`. (To confirm in prod from the `claude turn` logs.)
- @anthropic-ai/sdk 0.110.0: `MessageParam.content` accepts `string | ContentBlockParam[]`; `stop_reason` includes `'tool_use'`; `tool_choice:{type:'none'}` forces prose. pg-boss 12.25.1 `updateQueue` is the only mutator for an existing queue's `expireInSeconds` (createQueue is a silent no-op — verified in CH-03).
- Dev-server boot smoke: boots clean with `WEBSITE_BASE_URL` set, migrations apply, listens on 3100 (a Git-Bash backgrounding quirk gave curl HTTP 000, but the boot log shows "Server listening" — the wiring is fine).

**Deviations from plan.md:**
- **§5.1 QuoteView shape superseded** by the verified codebase/live shape (`averagePerNight` not `avgPerNight`; no `plan`/`currency`; adds `available`/`villaId`/occupancy echoes). Built to the real shape (Paul-approved). Planning chat to fold back into §5.1.
- **MIN_NIGHTS is a success note, not an error enum** (§6.4 lists it as an error): the API returns a valid quote when `meetsRequirement:false` → tool returns `ok:true, note:'MIN_NIGHTS'`. **200+available:false** and **409** both → `UNAVAILABLE`.
- **No p-queue** (CH-05 step 3 names it) — hand-rolled concurrency-1 + 350ms spacer (§3.3 minimal deps).
- **Phrasebook extracted** from `SYSTEM_VOICE` into `PHRASEBOOK` (light refactor of the CH-04 prompt.ts, Paul-approved).
- **`expireInSeconds` 120→180 via `updateQueue`** (delivers the CH-04-deferred D2 raise).
- **Tool loop extracted to `src/brain/turn.ts`** (§3.2 lists the loop under worker.ts; extracted only to keep both files <300 lines — worker.ts still orchestrates).
- Framework signature growth: `converse` (+tools/toolUses/stopReason/deadlineMs), `createSendIntent` (+optional raw), `buildSituation` (+degraded), `WorkerDeps`/`JobsDeps` (+toolRegistry/website/websiteBaseUrl/degraded/opsNumbers).
- **`WEBSITE_BASE_URL` required at boot from CH-05** (was optional); dev value `https://nistula-website.vercel.app` added to local `.env`.
- Guardrail hits are logged (structured, `guardrail:` field) but NOT persisted to `raw_events` — the §6.5 `raw_events(kind:'guardrail')` needs a source-enum value that doesn't exist (`source` is `whatsapp|ezee`); deferred to the CH-07 full guardrail suite.

**Open questions:** none. (For the planning chat, not blocking: §5.1 and §6.4's MIN_NIGHTS wording should be updated to match the verified API; and CH-07 should decide the `raw_events` guardrail-persistence source value + wire the CH-06 kb price whitelist into `checkPriceIntegrity`.)

**How to verify:** `pnpm check` (266 tests: villas resolution table, website error map incl. 200/available:false≡409, 60s cache hit/skip, 350ms spacer, guardrail-1 poison block `unbacked:[99000]`, guardrail-3 substitution, degraded flip-once, the get_quote→prose tool-loop integration with `raw.toolRuns`) · live shape: `curl "$WEBSITE_BASE_URL/api/quote?villaId=5220300000000000011&checkIn=2026-12-20&checkOut=2026-12-22&adults=4&children=0&plan=ep"` → a `QuoteView` · local: `docker compose up -d postgres` → `pnpm dev` boots with `WEBSITE_BASE_URL` set · **live demo (Paul, pre-merge `railway up`):** "3bhk 20–22 dec for 4, rate?" on `+1 555-179-8672` → the exact preview quote (open the site to cross-check); an unavailable range → graceful alternative; a discount ask → the transparency line, no invented ₹.

**Post-merge Railway (2026-07-11):** `WEBSITE_BASE_URL=https://nistula-website.vercel.app` set on the production service; the fresh deploy's config-summary log confirms it booted with the var (CH-05 now LIVE, not just merged). The auto-deploy on merge would have failed the `/health` gate without it (no outage — the gate kept CH-04 serving).

**Senior review + hardening (2026-07-11, `fix/CH-05-review-hardening`):** ran a 9-part adversarial multi-agent review (per-part reviewer → verify). Verdict: the load-bearing decisions all HELD (D2 pre-claim + claim-guard dedupe, `tool_choice` omission keeps the cache prefix, single shared degraded tracker, `updateQueue` expire raise, boot-require, PHRASEBOOK zero-drift, verbatim price passthrough). Fixes applied (all with tests, `pnpm check` 260→266):
- **Guardrail 3 (CONFIRMED bug):** the bare `/\boffer/` pattern nuked descriptive "the villa offers a private pool" into the discount line. Replaced with `/(special|limited|exclusive|festive|seasonal)\s+offers?/` (bargain-noun sense only); the verb-bargain "offer a discount/lower price" stays caught by the discount/price terms.
- **Guardrail 1 (decimal asymmetry):** `toInt` floored the draft but `collectNumbers` kept raw floats, so a fractional `averagePerNight` (total/nights) would false-block a valid quote and escalate it as an outage. Now the backed set stores both `Math.trunc` and `Math.round` of each figure.
- **Villa resolver:** a bare `6/9/11` token (a date/headcount/night-count) pre-empted a coexisting "villa"/"3bhk" type word → misresolved to an apartment. Now a BARE digit is skipped when a villa/type word is present; a PREFIXED unit ("apt 9","a9") still wins. Also tightened the Siolim typo guard to length≥5 so the real word "slim" no longer routes to Siolim.
- **Tool loop (CONFIRMED concern):** the guardrail regenerate ran a SECOND fresh 100s loop, so a regenerating turn could reach ~200s > the 180s expire (D2 re-insertion — harmless under the claim guard, but wasteful double model+website spend, and the code comments falsely claimed "well under expire"). Now ONE `TURN_TOTAL_DEADLINE_MS=150s` is threaded across both loops via `LoopArgs.deadlineAt`; comments corrected.

**Deferred to CH-07 (documented, not silent) — for the planning chat / full guardrail suite:**
- **Guardrail-1 bare-integer fail-open:** a comma-less, symbol-less price ("30000") matches no pattern → slips. The proper fix is context-aware extraction (numbers adjacent to Rs/per-night/total cues); a bare-integer threshold would false-positive on years/pincodes/refs and wrongly defer valid replies. Mitigated meanwhile by the ₹-formatting prompt + defence-in-depth. (Strengthened the code comment beyond the old "34k"-only note.)
- `backedAmounts` collects EVERY tool number (loose) vs a price-field allowlist — defensible but worth tightening in CH-07.
- `claude.ts parseMessage` silently drops non-text/tool_use blocks — latent 400 ONLY if a later chunk enables extended thinking / server tools; add a compile-time exhaustiveness guard then.
- Test-coverage gaps to add later: the 5-round cap/forced-prose path, the regenerate→defer→escalate path end-to-end through the worker, and the degraded flag altering prompt output through a full turn.

**Behaviour refinement — type queries quote directly (2026-07-11, `feat/CH-05-type-quote`, Paul-requested from the live demo):** the demo exposed a bad flow — "3bhk 20–22 dec rate?" made the AI list all four villas and ASK "shall I quote?", then (peak dates) reply "no availability" — contradicting acceptance scenario 1 ("exact price in seconds"). Root cause: `get_quote` returned `AMBIGUOUS_VILLA` and block [4] said "ask which one". Fixed: verified all four 3BHK villas share one rate plan (identical price) and booking is type-level (§5.4 — eZee assigns the unit), so "which villa?" is the wrong question. Now a TYPE label makes `get_quote` quote **every unit** and return the single shared price + `available`/`availableCount`/`unitCount`; `websiteApi` preserves the quote on a 200 `available:false` so the rate shows even for taken dates; `get_booking_link` returns a representative unit link for a type; block [4] tells the model to quote directly and never ask/name a unit. Live check for the demo query now returns `{total:136880, available:false, availableCount:0, unitCount:4}` in one call. `pnpm check` 266→270. (`get_availability` for a type still returns `AMBIGUOUS_VILLA` — the model uses `get_quote` for a type's availability; aggregating it too is a small future nicety.)

**CH-06 preparation — website KB export received (2026-07-11):** `nistula-kb-export/` (6 files) was produced by a Claude Code session run ON the `chinmoypaul8897/nistula-website` repo, using the extraction prompt stored in the HTML comment at the very end of this file — **re-runnable**: the site is pre-launch and much of it is placeholder, so Paul will re-run/update the folder as content firms up. **Assessment: high quality — verbatim, cited (`path:line`), faithful, and honest about gaps.**
- **REAL & usable now:** `policies.md` (the complete verbatim policy surface — check-in 3pm / check-out 12pm, ID rules, security + booking deposits, full cancellation table incl. 22 Dec–2 Jan non-refundable, children/extra-guest/pets/parties/smoking/quiet-hours/house-rules — sourced from the site's own `nistula-policies.md` source-of-truth), `faq.md` (all 30 on-site Q&A verbatim), `occupancy.md` (eZee RoomTypeList snapshot — **matches §5.4 exactly**: Apartment max 5+2c · Villa 7+4c · Siolim 8+6c). These map straight into CH-06's `kb/policies.md` / `kb/faq.md` and the RoomTypeList occupancy refresh.
- **PLACEHOLDER (flagged, not real yet):** every villa description/headline/highlights ships `placeholder:true`; bedroom counts are a guess for 7/8 (only Siolim's 4BHK is confirmed); floor areas + "from" prices are placeholders; per-villa amenities don't exist (the site shows ONE property-wide amenity list on every villa); B1/B3/C1/Siolim reuse C3's photos.
- **Still needs the villa team (CH-06 manual step):** the **quirks** (the biggest concierge gap — in no codebase); real per-villa copy; and missing figures — **security-deposit amount, pet fee, late-checkout fee, and whether breakfast is included (EP vs CP)** are all "amount per booking" / "may be chargeable" with no number.
- **Discrepancies for the planning chat:** (1) **§5.1's deposit formula** `min(₹10,000, ceil(avgNight/1000)×1000)` is NOT on the website — the site's security deposit is "refundable; amount per booking" (no figure) and the booking deposit is "room rate × nights"; reconcile which is authoritative before the AI states any deposit. (2) The concrete ₹ figures the KB WILL carry — **₹1,000/hr early check-in, ₹1,500/night extra adult, ₹750/night extra child** — are the guardrail-1 whitelist values CH-06 must wire into `checkPriceIntegrity`. (3) The "2bhk"→apartment resolver alias stays DEFERRED: the apartment bedroom count is a placeholder, so confirm the real BHK before aliasing.
- **All human-answerable questions are now the living register [`docs/open-questions.md`](docs/open-questions.md) (OQ-01…OQ-14)** — quirks, missing figures, facts to confirm, and the planning-chat deposit/plan decisions. Paul fills answers there over time; CH-06 reads them. Engineering can proceed around them.

<!-- ============================================================================
CH-06 WEBSITE-KB EXTRACTION PROMPT (reusable — paste into a Claude Code session
opened ON the nistula-website repo; re-run + update nistula-kb-export/ as the
site's placeholder content is finalised). Stored here per Paul's request 2026-07-11.
==============================================================================

# Task: Extract the guest-facing knowledge base from this website into Markdown

You are in the nistula-website codebase (a Next.js site for Nistula, a boutique
villa company in Goa). A SEPARATE project — a WhatsApp AI concierge — needs a
faithful, structured export of everything this site tells guests: villa
descriptions, occupancy, amenities, policies, FAQ. Mine this codebase (read-only)
and write that content, faithfully and with sources, into Markdown files.

## Absolute rules
1. READ-ONLY. Do not modify, delete, or refactor any website code. Write ONLY into
   a new folder `nistula-kb-export/` at the repo root.
2. FAITHFUL, NEVER INVENTED. Transcribe what the code actually renders. For anything
   policy/price/legal (deposit, cancellation, check-in/out, house rules), copy it
   VERBATIM. If a fact isn't in the code, write TODO(Paul): … — never guess or fill
   from general knowledge.
3. CITE every fact with its source path:line so it can be verified.
4. Use the CANONICAL LABELS below (join on villaId/RoomID), not just the site's
   display names.

## Villa identity map (villaId = eZee RoomID -> our label)
| villaId | Our label | Type |
| 5220300000000000001 | Apartment 11 | Nistula Apartment |
| 5220300000000000008 | Apartment 06 | Nistula Apartment |
| 5220300000000000010 | Apartment 09 | Nistula Apartment |
| 5220300000000000002 | Villa B1 | Nistula Villa |
| 5220300000000000011 | Villa B3 | Nistula Villa |
| 5220300000000000012 | Villa C1 | Nistula Villa |
| 5220300000000000013 | Villa C3 | Nistula Villa |
| 5220300000000000015 | Siolim 4BHK | Nistula 4BHK Siolim |

## Method — three phases, IN ORDER

### Phase 1 — Overview (map first, don't extract yet)
Explore the repo and write nistula-kb-export/00-overview.md:
- Where does guest-facing CONTENT live? (content/ or data/ dirs, MDX/JSON, hardcoded
  copy in components, i18n files, or CMS/API fetches.) List key files/dirs.
- Is each kind of content STATIC (in the repo) or FETCHED at runtime? (note the source, e.g. eZee).
- A table aligning each villa's on-site display name -> its villaId/RoomID -> our
  label (from the map above). Flag any villa you can't align.
Show me this overview before mining, so the map is clear.

### Phase 2 — Extract, one file per topic (be COMPREHENSIVE; length gets trimmed later)
- villas.md — one "## <Our label>" block per villa: type, bedrooms, sleeps/max guests,
  layout notes; a faithful 1–3 paragraph description; highlights (bullets); amenities;
  location/neighbourhood line; the public villa URL/slug. Note shared vs unique copy.
- occupancy.md — table: Our label · type · RoomID · bedrooms · base guests · max guests ·
  max children. If occupancy is a live eZee fetch (RoomTypeList), say so + point to the fetch code + shape.
- policies.md — VERBATIM, each under its own heading: check-in/out times · children · pets ·
  parties/events · smoking · quiet hours · SECURITY DEPOSIT rule (exact wording/formula) ·
  CANCELLATION policy (full table/terms, verbatim) · payment terms · other house rules.
  Missing -> TODO(Paul):.
- faq.md — every FAQ item as Q/A, faithful. Include anything FAQ-like even if not on a formal FAQ page.

### Phase 3 — Gaps report
nistula-kb-export/GAPS.md: bullet list of everything (a) missing, (b) ambiguous, (c) fetched
live so not statically extractable, or (d) that needs a human (e.g. per-villa "quirks" like
"the second-bedroom AC runs cold" — those are NOT on the website; note they're absent).
Be explicit — nothing silently skipped.

## When done
Tell me: which files you wrote, how many villas you fully covered, and the top 3 gaps.
Do not touch anything outside nistula-kb-export/.
============================================================================ -->

---

### CH-06 · Knowledge base — DONE 2026-07-12

*(`pnpm check` green at **289 tests** (270→289, +19 — 8 as first built, then +11 from the pre-push review). `pnpm kb:build` compiles clean and is deterministic — a second run leaves the tree untouched. Dev boot verified: `knowledge base loaded {kbVersion:cb4f0950, kbTokens:2573, quirksPresent:true}`, then `/health` 200. **Paul's live phone demo PASSED (2026-07-12) — Definition of done fully met.** The pre-push adversarial review and its fixes are recorded in the addendum at the end of this entry.)*

**Built:**
- **`kb/source/`** — the curated, committed inputs: `website-content/villas.json` (per-villa website facts keyed by villaId; **no ₹** — stay rates come only from `get_quote`), `website-content/policies.md` + `website-content/faq.md` (the REAL policy/FAQ surface, distilled from the export), and `roomtypes.json` (the eZee **CFG-05 RoomTypeList** occupancy snapshot + refresh instructions).
- **`kb/quirks.md`** — hand-maintained (kb-build never writes it): the team-facing template + **one clearly-labelled PLACEHOLDER quirk** for Villa B3 and Apartment 11 (Paul-approved), so the quirk-aware demo runs now. Human-facing PLACEHOLDER markers and review dates live in HTML comments, which are stripped before the block reaches the model.
- **`scripts/kb-build.ts`** (`pnpm kb:build`) — pure `buildKb()` + thin `main()`. Emits `kb/villas.md` (a real join: `src/lib/villas.ts` identity × villas.json copy × roomtypes.json occupancy → "sleeps up to N") and `kb/policies.md`/`kb/faq.md` (passthrough + a `GENERATED` header so humans edit the source). **Throws — fails the build — if compiled block [3] exceeds the 6k-token budget.**
- **`src/brain/knowledge.ts`** — the shared build/runtime seam: `concatKnowledge` (assembles block [3]; strips HTML comments; includes the quirks section **only when the file carries notes beyond its template**), `estimateKbTokens` (chars/3.6), `KB_TOKEN_BUDGET`, `kbVersion` (sha256/8), memoised `loadKnowledge()` (re-asserts the budget at boot) and `kbPriceWhitelist()`.
- **`src/brain/rupees.ts`** — the ₹ extractor hoisted out of guardrails.ts (see Deviations); guardrails.ts re-exports it, so no test churn.
- **Wiring:** `prompt.ts` `buildSystemPrompt(situation, knowledge)` inserts **block [3] between VOICE and RULES** — the breakpoint STAYS on block [4] (still the last static block), so the head `[1]+[2]+[3]+[4]` caches as one prefix. Block [4] gains the CH-06 rule (KNOWLEDGE is the source of truth; listed quirks are shareable truths; never invent amenities/comfort claims/figures; **never state a deposit amount**). `turn.ts` injects the knowledge and passes `kbPriceWhitelist()` into `runGuardrails` — closing the seam CH-05 left wired-but-empty. `server.ts` logs the kb version/tokens at boot.
- Tests: `test/kb-build.test.ts` (+8) — golden (buildKb reproduces the committed `kb/*.md` byte-for-byte), budget (real sources under; oversized THROWS), quirks (template-only omitted / real note included), whitelist (`{750, 1000, 1500}`); `test/brain-prompt.test.ts` updated to the 5-block layout.

**Decisions made while building** (the first two Paul-approved via AskUserQuestion before building):
- **Source layout (Q1):** curate lean `kb/source/*` distilled from `nistula-kb-export/`, and keep the export as the raw **re-runnable upstream**. Rejected: pointing kb-build at the export directly — it is verbose, citation-laden and placeholder-flagged, would need a Markdown parser plus in-script editorial condensation to fit 6k, and would be brittle to export-format changes on every re-run.
- **Demo quirks (Q2):** ship the template **plus a labelled placeholder** B3/Apt-11 quirk so the quirk-aware demo runs now, rather than template-only. Real villa-team notes (OQ-01) drop in during the final content pass.
- **Whitelist DERIVED from compiled `kb/policies.md`, not hardcoded** — §6.5 says "₹ figures present verbatim in kb/policies.md are whitelisted", so it is implemented literally via `extractRupeeAmounts`, and self-updates when OQ-04/05/06 land. **Consequence (important):** fee figures in policies.md MUST be written with the ₹ symbol — `INR 750` would slip the known bare-integer gap and silently fall out of the whitelist. A test pins the extracted set to `{750, 1000, 1500}` so any future prose edit that breaks the coupling fails CI.
- **Knowledge INJECTED into `buildSystemPrompt`, not imported by prompt.ts** — keeps prompt.ts pure/synchronous (no fs at module scope, deterministic in tests) and avoids the import cycle (below).
- **Conservative content defaults on unanswered OQs** (per the ⚑ standing decision — recorded, not improvised): **deposits** — the KB mirrors the website ("refundable; amount confirmed per booking"), carries **no figure**, and does NOT use §5.1's `min(₹10,000, …)` formula (not on the site; authority unresolved, OQ-13); block [4] hard-forbids stating a deposit amount. **Breakfast** (OQ-07) — "accommodation only unless specifically listed", matching the site FAQ; `get_quote` default stays `ep`. **Siolim pool** (OQ-09) — unconfirmed, so `villas.json` sets `pool: null` and **no pool is claimed for Siolim anywhere in villas.md** — including the shared-amenities paragraph, which is why that paragraph names no pool at all and pools are stated ONLY per villa (the first cut got this wrong; see the review addendum).
- **`src/lib/villas.ts` occupancy NOT churned** — it stays the resolver's informational copy (the website `/api/quote` remains the occupancy authority); guest-facing "sleeps up to N" renders from `roomtypes.json` `maxAdults`. Siolim's `base_adult_occupancy: 2` oddity (OQ-10) never reaches guest-facing copy.
- Villa **indicative "from ₹X/night" prices were deliberately DROPPED** from the KB: they are website placeholders, and a stay price sitting in block [3] is exactly the kind of figure §6.5 says must come from a tool.

**Observed reality:**
- **Compiled block [3] = ~2596 tokens** (budget 6000) — comfortable headroom for the real villa copy + all-8-villa quirks landing in the content pass. Version hash `60020d31`. The cached head grows ~1655 → ~4.2k tokens; expect ONE larger `cacheWrite` on the first post-deploy turn, then steady `cacheRead` (the same pattern CH-05 saw when tool specs entered the prefix — confirm in the `claude turn` logs).
- **A real import cycle was waiting:** `guardrails.ts` imports `PHRASEBOOK` from `prompt.ts`, so having `knowledge.ts` pull `extractRupeeAmounts` from `guardrails.ts` while `prompt.ts` consumed knowledge would close `prompt → knowledge → guardrails → prompt`. Solved by hoisting the extractor to the import-free leaf `rupees.ts` **and** by injecting knowledge into `buildSystemPrompt` rather than importing it there. Worth remembering: **prompt.ts is a LEAF that guardrails depends on** — anything prompt.ts imports must not reach back into guardrails.
- **The 6k budget is measured on what actually ships:** kb-build and the runtime loader call the SAME `concatKnowledge`, and comments are stripped before measuring — so the gate measures the exact string the model receives (generated headers and PLACEHOLDER markers cost nothing).
- `.prettierignore` already excludes `kb/`, `docs/` and `*.md`, so the generated KB is safe from `pnpm format` reflow with no change needed (the planned `.prettierignore` edit turned out to be unnecessary).
- The website export's occupancy snapshot **matches §5.4 exactly** (Apartment max 5+2c · Villa 7+4c · Siolim 8+6c) — the RoomTypeList refresh confirmed the plan constant rather than correcting it.
- Local env note: the DB suites need `docker compose up -d postgres`; with Postgres down, 7 test files fail on `ECONNREFUSED :5432` (not a code failure — Docker Desktop itself had to be started first).

**Deviations from plan.md:**
- **CH-06 step 1's source shape superseded.** The plan expects `kb/source/website-content/` to be a "villas.ts-shaped JSON export" produced by Paul; the export actually arrived as `nistula-kb-export/` (6 hand-authored Markdown files). Built to reality: a curated `villas.json` + `policies.md`/`faq.md` fragments distilled from it (Paul-approved, Q1). The export remains the re-runnable upstream.
- **kb-build emits a `GENERATED` header** into the three compiled files (not in the plan) so humans edit the source, never the output; the header is an HTML comment and is stripped before the model sees it.
- **`src/brain/knowledge.ts` and `src/brain/rupees.ts` added** — §3.2 lists neither; knowledge.ts is the build/runtime seam block [3] needs, rupees.ts exists to break the cycle above. `guardrails.ts` was touched (import + re-export) although it is CH-05 code — justified: the whitelist seam is explicitly CH-06's to wire, and the change is minimal and behaviour-preserving.
- **The plan's "booking link" field is NOT in `kb/villas.md`** — the link is env-dependent (dev preview vs prod), so baking it into the cached head would be wrong; the model already has `get_booking_link` for it.
- Block [3] ships as a distinct system block rather than a literal concatenation into one text blob — same cached prefix, cleaner to inspect and test.

**Open questions:** none blocking. Content inputs stay in [`docs/open-questions.md`](docs/open-questions.md) for the final content pass — CH-06 consumes them the moment they land: **OQ-01** (real quirks → replace the placeholders), **OQ-04/05/06** (deposit / pet / late-checkout figures → add to policies.md **with the ₹ symbol** and they flow into the guardrail whitelist automatically), **OQ-07** (breakfast EP/CP), **OQ-08/09/11** (bedroom counts, Siolim pool, real villa copy → refresh `kb/source/website-content/` by re-running the export). Ritual after ANY kb edit, including a quirks edit: **`pnpm kb:build`** — it re-checks the budget, regenerates the files and prints the new version hash.

**How to verify:** `pnpm kb:build` → prints `block[3] ~2573 tokens (budget 6000) · version cb4f0950`, and a second run leaves `git status` clean (deterministic) · `pnpm check` (289 tests: golden kb output, budget-throw, quirks-only-when-non-empty, the context-bound fee exemption, the two worker seam tests, 5-block prompt with the breakpoint still on [4]) · local: `docker compose up -d postgres` → `pnpm dev` → boot log shows `knowledge base loaded {kbVersion, kbTokens, quirksPresent}` and `/health` 200 · **live demo (Paul, pre-merge `railway up`):** on `+1 555-179-8672` ask "does B3 have a pool?" (yes — private pool), "check-in time?" (3 pm), "can we bring our dog?" (only where approved in writing in advance), "AC is weak at night, what do I do?" (quirk-aware for B3) — and confirm no invented ₹ and no deposit figure.

---

#### CH-06 pre-push adversarial review (2026-07-12) — 3 RED dimensions, all fixed before merge

A 7-lens senior review (spec · correctness · guardrail-security · content-faithfulness · decision-audit · tests · ops) with every finding attacked by 3 skeptics: **54 raised → 44 refuted → 10 survived.** Verdict YELLOW → fixed → merged. The machinery was confirmed sound (budget gate, cache placement, comment stripping, cycle break, deterministic build, no secrets, `kb/` genuinely ships on both deploy paths). Four things were genuinely wrong, and they are worth remembering:

1. **THE MONEY HOLE (critical, now fixed).** The whitelist was a flat `number[]`, merged into one Set with the tool figures. That implemented §6.5's first clause and made the second one ("stay prices and per-night figures must still come from tool JSON") **structurally unenforceable**: `checkPriceIntegrity('Villa B3 is ₹1,500 per night', [], [750,1000,1500])` returned **ok** — a fabricated nightly rate would have been SENT. It was only survivable because {750,1000,1500} don't look like Goa room rates — an accident, not a design — and **progress.md itself told the next maintainer that dropping a ₹10,000 deposit into policies.md was a safe content-only edit**, which would have made a fully plausible fake rate sendable with all tests green. **Fix:** the exemption is now **context-bound** — `extractKbFees` (rupees.ts) tags each ₹ figure with the fee terms of its own sentence, and a fee may be stated only when the draft names what it is for. Fee units ("per night") are deliberately NOT cues, since a fabricated rate says "per night" too. Fail-closed: a figure whose sentence names no fee gets no cues and can never be stated. Pinned by a forward-guard test that proves a future ₹10,000 deposit still cannot become a nightly rate, and by an end-to-end worker test. **OQ-04 now carries the three-part warning** that landing the deposit figure touches policies.md, prompt.ts block [4] AND requires a rebuild.
2. **Two invented guest-facing claims in the compiler prose** — the exact fabrication class this chunk exists to prevent. `kb-build.ts` hardcoded "the airport about an hour out" (no source states any drive time; the website deliberately omits them) and "**Shared on every home:** swimming pool…", which asserted a pool for Siolim — **silently defeating this chunk's own `pool: null` decision**, 33 lines above the pool-less Siolim entry. Both removed; the shared list is now "Listed on every villa page (property-wide)" and names no pool, so pools are stated only per villa. A negative test (`not.toMatch(/pool/i)` over the Siolim block AND the shared paragraph) now guards it — `toContain` never could.
3. **Internal engineering prose was leaking into the cached system head.** The maintainer preambles in `kb/source/website-content/{policies,faq}.md` were plain markdown, not HTML comments, so repo paths and the sentence "…so the guardrail-1 price whitelist can read them" shipped verbatim to the model. Now wrapped in `<!-- -->` (D8's channel was right, just half-applied), with a leak-guard test asserting block [3] contains none of `<!--`/`GENERATED`/`PLACEHOLDER`/`MAINTAINER`/`nistula-kb-export`/`guardrail`/`kb-build`.
4. **CRLF made the version hash checkout-dependent.** `core.autocrlf=true` + no `.gitattributes` meant `kb/*.md` materialised as CRLF, so `kbVersion` differed per checkout and **all three golden assertions would go red on a fresh clone** (CI hid it — it runs on ubuntu). Added `.gitattributes` (`*.md`/`*.json` → `eol=lf`), folded CRLF inside `stripComments` so the block [3] bytes are platform-independent by construction, and made the test reader newline-agnostic. Also collapsed the blank runs left by stripped comments and dropped quirks.md's duplicate H1 (the section heading is code-owned).

Also landed: the cancellation carve-outs the distillation had dropped (peak/festive/special-rate stricter terms, no refund for late arrival or no-show — the shipped ladder had been *less* hedged than Nistula's own public FAQ), and a **build-time guard that fails `kb:build` if any ₹ figure appears outside policies.md** — guardrail 1 can only exempt fees published there, so a fee in the villa-team-editable `quirks.md` would have been guaranteed-rejected at send time (guest gets the rate-unavailable deferral + a spurious ops escalation). Fail the build, not the guest turn.

**Deviations (added — the first cut under-recorded these):** §5.1's deposit formula is deliberately NOT in policies.md (OQ-13 unresolved) · the per-villa *highlights* CH-06 step 1 lists are not shipped (the site's are placeholder; the one-line description carries the villa) · the cancellation table is **paraphrased** into guest-facing prose, not transcribed verbatim as step 1's wording implies.

**Known, recorded, NOT fixed here (for CH-07 / the content pass):**
- **Knowledge reaches turn.ts via a module-level memoised singleton, not `TurnDeps`** — so it can't be varied per test and every worker/golden-path test now reads `kb/*.md` off disk. This is the root cause of why the seam was untestable at all. Thread `knowledge` through `TurnDeps` in **CH-08**, where the `buildSystemPrompt` call site moves anyway.
- **`prompt.ts` block [4] hardcodes "Never state a deposit amount"** — it will contradict the KB the moment OQ-04 lands (see the warning now in OQ-04). The clean fix is to derive that clause from the loaded knowledge.
- The kb budget error messages point at `kb/source/*`, but the file most likely to blow the budget (`kb/quirks.md`, when all 8 villas get real notes) is deliberately outside it — interpolate per-section token counts at the content pass.
- **Before go-live:** `kb/quirks.md` must not still contain `PLACEHOLDER` (add to the CH-18 go-live checklist). Deliberately NOT enforced as a boot assertion now — `NODE_ENV=production` is the *test* line today, so that gate would crash the live service.
- `src/lib/villas.ts` occupancy and `kb/source/roomtypes.json` are two unreconciled copies; a cheap equality test would close it (CH-07).
