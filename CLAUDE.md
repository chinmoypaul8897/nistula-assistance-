# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nistula Assistance** — a WhatsApp AI host (Claude as the brain) for Nistula, a boutique villa company in Goa (8 villas, eZee PMS, ~60% of bookings direct on one WhatsApp number). It will run the full guest conversation: pre-sales with live website-identical prices, in-stay requests routed to staff as tasks, automatic lifecycle messages, per-guest persistent memory, and graceful human takeover via Meta coexistence.

**Current state: CH-00 → CH-07 are DONE, merged, tagged (`vCH-00`…`vCH-07`) and LIVE on Railway.** The service takes real WhatsApp messages on the Meta test number, replies in Nistula's voice through Claude, quotes live website-identical prices via tools, answers villa/policy/FAQ questions from the compiled knowledge base (prompt block [3]), and now brackets every model turn with deterministic code: §6.7 policy routing BEFORE it (human requests skip the model, complaints inject must-escalate, the §3.3 cool-off, caption-aware media fallbacks) and the complete §6.5 guardrail pipeline AFTER it (price, promise, identity, length/format, 24h-window, leak scan — every hit persisted to `raw_events` for the weekly review, runbook §CH-07). **Next chunk: CH-08 (Short-term memory) — its first task is the recorded forward pointer: thread `knowledge` + the TurnArgs inputs through `TurnDeps` when extracting the contextBuilder.** `progress.md` is authoritative for exactly what exists and what each chunk learned — read it, not this paragraph, for detail.

## Session protocol (mandatory — from plan.md §0)

[plan.md](plan.md) is the **single source of truth** for the build; [progress.md](progress.md) is the session-memory layer. Every build session:

1. Read plan.md §1–§3 fully (project brief, system overview, global engineering rules).
2. Read progress.md top to bottom — the chunk ledger says what's done; entries record what past sessions learned (observed payload field names, decisions, open questions).
3. Open your assigned chunk in plan.md §8 and build ONLY that chunk. Do not start the next one; do not refactor other chunks' code unless told to.
4. Skim only the reference sections your chunk points to (§4 data model, §5 external contracts, §6 AI design).
5. Finish by appending a progress.md entry using the §9 template, updating the chunk ledger table, then commit and stop.
6. If anything is ambiguous or a decision is missing: **do not improvise.** Write it under "Open questions" in progress.md and stop — Paul takes it back to the planning chat.

## Hard rules (non-negotiable)

- **Secrets:** `credentials-local/` and `.env*` are gitignored and must NEVER be committed, copied into `docs/`, or quoted in code, tests, fixtures, or commit messages. If a secret ever lands in a commit, it is leaked: rotate it and purge history. `.env.example` carries names only.
- **Never invent API fields** — all external contracts are verbatim in plan.md §5 (website quote API, eZee, Meta Cloud API, Anthropic).
- **Money:** ₹ figures are never computed by us or the model — every stay/per-night price passes through verbatim from a tool result. The AI never negotiates; the website rate is final. **The ONE exemption (§6.5, CH-06):** fees published in `kb/policies.md` (early check-in, extra guest) may be stated without a tool call — but the exemption is **context-BOUND**, so `"an extra adult is ₹1,500"` passes while `"Villa B3 is ₹1,500 per night"` is blocked. **Never flatten that back into a plain list of allowed numbers** — a pre-push review caught exactly that bug, where a fabricated nightly rate sailed through. Fees live only in `policies.md`, written **with the ₹ symbol**, in a sentence that names the fee.
- **Never promise what didn't happen:** "the team has been informed" only after `create_staff_task` succeeded (guardrail 2).
- Never weaken a security rule to make a test pass · never log secrets or guest message bodies at info level · keep files under ~300 lines · boring, readable code over clever code.
- No test calls a live external API — fixtures only, scrubbed via `scripts/fixture-scrub.ts` (CI greps for stray `+91`).

## Git discipline (plan.md §3.6)

- Remote: `https://github.com/chinmoypaul8897/nistula-assistance-.git` — must stay **Private**.
- One branch per chunk: `chunk/CH-NN-short-name`; merge to `main` only when the chunk's Definition of done passes; tag `vCH-NN`. `main` is always green (`pnpm check`).
- Conventional Commits 1.0.0, small commits, body explains WHY, footer `Refs: CH-NN`. Scopes: `wa`, `brain`, `ezee`, `lifecycle`, `staff`, `db`, `ops`.
- Code comments explain WHY, never WHAT. Deferred work is `// TODO(CH-NN):`, never a bare TODO.

## Commands

Stack: TypeScript 5 strict / Node 22+ ESM / Fastify 5 / Postgres 16 + Drizzle / pg-boss (no Redis) / vitest / pnpm.

- `pnpm dev` — tsx watch · `pnpm test` — vitest · `pnpm check` — typecheck + lint + tests (the CI gate)
- `pnpm kb:build` — compiles `kb/*.md` (prompt block [3]). **Run after ANY edit under `kb/`, including `kb/quirks.md`:** it re-checks the ≤6k token budget, regenerates the files and prints the new `kbVersion`. The committed output is byte-compared in CI, so a KB edit without a rebuild fails the build.
- Local Postgres via `docker-compose.yml` (postgres:16) — the DB test suites need it (`docker compose up -d postgres`); without it 7 test files fail on `ECONNREFUSED :5432`. Meta's webhook points permanently at the Railway domain — **no tunnels** (CH-02 decision D8); iterate with fixtures + signed local POSTs.
- Deploy: merging to `main` auto-deploys behind the `/health` gate. Pre-merge live demo = `railway up` from the chunk branch.

## Architecture (what gets built — plan.md §2)

One Node/TS service + one Postgres database. Hot path: WhatsApp webhook → verify signature, ack <1s → raw event store → dedupe on `wa_message_id` → debounced queue (15s quiet / 45s max) → conversation worker: context builder → Claude tool loop (max 5 rounds) → guardrail pipeline → send via Graph API (or draft queue in draft mode). A 60s eZee poller mirrors bookings into `bookings_mirror` and feeds the lifecycle scheduler (confirmation → pre-arrival → welcome → thank-you → win-back). Staff use the same WhatsApp number (coexistence): human replies pause the AI (`human_active_until`); staff task cards and `DONE <id>` commands flow through the same line. Every outbound goes through one window-aware chokepoint (`wa/client.ts`) enforcing the 24h rule; every send uses the send-intent pattern (row committed as `sending` before the Graph call — no duplicate sends).

Build order is the chunk index in plan.md §7 (CH-00 → CH-19). Acceptance = the six scenarios in [docs/product-picture.md](docs/product-picture.md).

## Reference material in this repo

- [docs/ezee/](docs/ezee/) — verbatim eZee Connectivity API mirror. Load `00_INDEX.md` plus only the category file your chunk needs (e.g. `04_bookings.md` for CH-10). **Never read `ezee_connectivity_api_FULL.md` wholesale** (~1 MB). Known: BKG-20 "ReadBooking" is broken on this property — never use it.
- [kb/source/voice-guide.md](kb/source/voice-guide.md) — Nistula voice v1.1 (locked): British English, no exclamation marks, 1–3 sentences, no discount language ever; feeds the CH-04 system prompt.
- [docs/product-picture.md](docs/product-picture.md) — the six acceptance scenarios CH-19 asserts against.
- `credentials-local/` — secrets staging area (gitignored). Do not read it into context; values move to local `.env` and Railway variables only.
