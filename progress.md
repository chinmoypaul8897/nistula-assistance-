# progress.md — Nistula Assistance · Build Log

> **The session-memory layer.** Every chunk session: read plan.md §1–§3 first, then this file top to bottom, then your assigned chunk in plan.md §8. Every chunk session ENDS by appending an entry here using the plan.md §9 template. If it's not written here, the next session doesn't know it happened.

## Status

- **Current chunk pointer:** CH-01 (database core) — next up. CH-00 merged pending PR (see entry).
- **Env values:** local `.env` (gitignored) holds `NODE_ENV=development` + `PORT=3000` only — no secrets exist in any env yet. Secrets stay in `credentials-local/` (gitignored, root) until they move to local `.env` + Railway variables. `credentials-local/` must NEVER be committed or copied into docs/.
- **How to run:** `pnpm install` → `pnpm dev` → `GET http://localhost:3000/health`. Gate: `pnpm check` (typecheck + lint + tests). CI runs the same on Node 22 + 24.

## Table of contents (chunk ledger)

| Chunk | Name | Status | Entry |
|---|---|---|---|
| Pre-CH | Orientation & repo organisation | ✅ DONE 2026-07-07 | [↓](#pre-ch--orientation--repo-organisation--done-2026-07-07) |
| CH-00 | Repo bootstrap | ✅ DONE 2026-07-07 | [↓](#ch-00--repo-bootstrap--done-2026-07-07) |
| CH-01 | Database core | ⬜ pending | |
| CH-02 | WhatsApp client + webhook | ⬜ pending | |
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
  src/
    config.ts                   ← zod-validated §3.7 registry, fail-fast, secret-free summary
    server.ts                   ← fastify bootstrap, GET /health, graceful shutdown
    lib/                        ← phone.ts · time.ts · http.ts · logger.ts
  test/                         ← unit + integration tests (69) · fixtures/ (empty until CH-02)
  docs/
    product-picture.md          ← the six acceptance scenarios (CH-19 contract)
    ezee/                       ← eZee Connectivity API mirror (00_INDEX.md … 09, FULL, _inventory.json)
  kb/
    source/
      voice-guide.md            ← Nistula voice guide v1.1 (feeds CH-04 system prompt)
```

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
