# progress.md — Nistula Assistance · Build Log

> **The session-memory layer.** Every chunk session: read plan.md §1–§3 first, then this file top to bottom, then your assigned chunk in plan.md §8. Every chunk session ENDS by appending an entry here using the plan.md §9 template. If it's not written here, the next session doesn't know it happened.

## Status

- **Current chunk pointer:** CH-03 (Echo pipeline) — next up. CH-00/CH-00b/CH-01/CH-02 merged and tagged (`vCH-00`, `vCH-00b`, `vCH-01`, `vCH-02`).
- **LIVE on Railway (2026-07-10):** service `nistula-assistance-` (trailing hyphen is the real service name) at **`https://nistula-assistance-production.up.railway.app`**, `/health` healthcheck gate via committed `railway.json`. Meta webhook wired end-to-end: callback verified, `messages` field subscribed, and the **WABA-level `subscribed_apps` link created via API** (the dashboard never creates it — see CH-02 entry). Live round trip proven: guest message → DB → `sendText` reply → phone; statuses walked the rank lattice; dedupe replay was a no-op. Auto-deploy from main: Paul enables post-merge (one click). Stray empty Railway project `fantastic-motivation` (created by a mislinked `railway up` during a CLI re-auth) — Paul to delete.
- **Env values (2026-07-10):** local `.env` holds `NODE_ENV=development`, `PORT=3100` (3000 is owned by another local project), `DATABASE_URL` → local docker Postgres, all four WA values. Railway service variables hold the four WA values + `NODE_ENV=production` + `TZ` (set via the CH-02 stdin-script pattern — values never transit chat/shell history; token rotation reuses it). `WA_VERIFY_TOKEN` ROTATED 2026-07-10 after Meta's handshake wrote it into pre-fix request logs (logging fixed same session; Meta still holds the OLD token and only needs the new one at the next webhook-config edit — paste from `.env` then). Test number `+1 555-179-8672`; WABA ID `1377084767847948`. `ANTHROPIC_API_KEY` still unset — hard blocker at CH-04.
- **Standing dev workflow (CH-02 decision D8):** Meta's callback points permanently at the Railway domain — no tunnels, ever. Daily iteration = fixtures + signed local POSTs; end-of-chunk live demo = `railway up` the chunk working tree PRE-merge (doubles as env-completeness check); merge → auto-deploy ships identical content. Binding topology rule (D2): EVERY outbound anywhere goes through `wa/client.ts` `sendText`.
- **How to run:** `docker compose up -d postgres` → `pnpm dev` (migrations apply at boot) → `GET http://localhost:3100/health`. Gate: `pnpm check` (typecheck + lint + tests incl. DB suite). CI runs the same on Node 22 + 24 with a postgres service container.

## Table of contents (chunk ledger)

| Chunk | Name | Status | Entry |
|---|---|---|---|
| Pre-CH | Orientation & repo organisation | ✅ DONE 2026-07-07 | [↓](#pre-ch--orientation--repo-organisation--done-2026-07-07) |
| CH-00 | Repo bootstrap | ✅ DONE 2026-07-07 | [↓](#ch-00--repo-bootstrap--done-2026-07-07) |
| CH-00b | Post-merge audit fixes | ✅ DONE 2026-07-07 | [↓](#ch-00b--post-merge-audit-fixes--done-2026-07-07) |
| CH-01 | Database core | ✅ DONE 2026-07-07 | [↓](#ch-01--database-core--done-2026-07-07) |
| CH-02 | WhatsApp client + webhook | ✅ DONE 2026-07-10 | [↓](#ch-02--whatsapp-client--webhook--done-2026-07-10) |
| CH-03 | Echo pipeline (queue + debounce) | ⬜ pending | |
| CH-04 | Brain v1 — voice | ⬜ pending | |
| CH-05 | Price tools | ⬜ pending | |
| CH-06 | Knowledge base | ⬜ pending | |
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
    server.ts                   ← fastify bootstrap, GET /health, webhook mount, query-free request logs
    lib/                        ← phone.ts · time.ts · http.ts · logger.ts (+ summarizeError)
    wa/                         ← signature.ts · webhook.ts · client.ts · types.ts (CH-02)
    ops/                        ← alerts.ts (log-only alertOps seam until CH-17)
  scripts/                      ← fixture-scrub.ts (PII scrubber for captured payloads)
  test/                         ← unit + integration tests (140) · fixtures/wa/ (scrubbed live captures)
  docs/
    product-picture.md          ← the six acceptance scenarios (CH-19 contract)
    ezee/                       ← eZee Connectivity API mirror (00_INDEX.md … 09, FULL, _inventory.json)
  kb/
    source/
      voice-guide.md            ← Nistula voice guide v1.1 (feeds CH-04 system prompt)
```

## Rented-track status (plan §10 — Paul-side, updated 2026-07-08)

| Item | Status |
|---|---|
| GitHub repo + doc inputs | ✅ done (Pre-CH/CH-00) |
| Railway project + Postgres | ✅ done, CLI-verified 2026-07-08 |
| Meta dev app + test number + System User token | ✅ done 2026-07-10 — app "Nistula Assistance" (WhatsApp use case), business portfolio "Nistula", test number, System User token (Never expiry, TWO permissions: `whatsapp_business_messaging` + `whatsapp_business_management` — `business_management` is not offered on use-case apps and is not needed); token verified live |
| Meta business verification | 🕐 docs-collection email drafted (living-guide artifact) — research-verified 2026-07-10: unverified cap = 250 unique recipients/rolling-24h for business-initiated templates (replies uncapped); next tier now 2,000; free verification suffices — do NOT buy "Meta Verified"; India doc list in artifact (GST cert is the workhorse; partnership deed NOT accepted; sole-prop legal name = proprietor's PAN name) |
| Anthropic API key (CH-04) | ⬜ this week — no-Facebook guide artifact covers it |
| Website content export + quirks template (CH-06) | 🕐 quirks template being sent to villa team; content export now CLAUDE-side (see website note below) |
| Staff roster + DONE briefing (CH-13) | ⬜ collection format in the no-Facebook guide |
| BSP signed, v4 coexistence in writing (before 15 Oct 2026) | ⬜ outreach starting — MSG91 → Dualhook → 360dialog per §10 |
| Website `/api/debug/*` gating | 🕐 queued for Claude (see website note) |
| healthchecks.io (CH-17) · Railway Hobby upgrade · test SIM | ⬜ optional-now items in the no-Facebook guide |

**Session hand-off note (2026-07-10):** Paul's manual work is guided by two artifacts (URLs also in Claude's memory dir): the **living manual-steps guide 🔑** `https://claude.ai/code/artifact/30d5b703-f0dd-4214-a524-ac17282d358e` (done ledger + active business-verification docs email; Paul's standing instruction: every future manual task gets added here, researched-first, finished parts collapsed) and the **no-Facebook task list 🧭** `https://claude.ai/code/artifact/409539e9-2e4d-47df-8529-96acf65961f2` (Anthropic key, quirks message, staff roster, BSP outreach — all UNTOUCHED by Paul as of 2026-07-10; the BSP research found "Dualhook" is NOT a BSP but a $12/mo coexistence layer with direct Meta webhooks — matches plan §5 architecture best; take to planning chat before BSP signing). gh CLI (`$env:LOCALAPPDATA\Programs\gh\bin\gh.exe`) and Railway CLI are installed + authenticated as chinmoypaul8897.

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
