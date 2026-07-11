# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nistula Assistance** — a WhatsApp AI host (Claude as the brain) for Nistula, a boutique villa company in Goa (8 villas, eZee PMS, ~60% of bookings direct on one WhatsApp number). It will run the full guest conversation: pre-sales with live website-identical prices, in-stay requests routed to staff as tasks, automatic lifecycle messages, per-guest persistent memory, and graceful human takeover via Meta coexistence.

**Current state: planning stage — no code exists yet.** No `package.json`, no git repo. The build begins at chunk CH-00 (repo bootstrap). Everything currently in the repo is spec and reference material.

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
- **Money:** ₹ figures are never computed by us or the model — they pass through verbatim from tool results. The AI never negotiates; the website rate is final.
- **Never promise what didn't happen:** "the team has been informed" only after `create_staff_task` succeeded (guardrail 2).
- Never weaken a security rule to make a test pass · never log secrets or guest message bodies at info level · keep files under ~300 lines · boring, readable code over clever code.
- No test calls a live external API — fixtures only, scrubbed via `scripts/fixture-scrub.ts` (CI greps for stray `+91`).

## Git discipline (plan.md §3.6)

- Remote: `https://github.com/chinmoypaul8897/nistula-assistance-.git` — must stay **Private**.
- One branch per chunk: `chunk/CH-NN-short-name`; merge to `main` only when the chunk's Definition of done passes; tag `vCH-NN`. `main` is always green (`pnpm check`).
- Conventional Commits 1.0.0, small commits, body explains WHY, footer `Refs: CH-NN`. Scopes: `wa`, `brain`, `ezee`, `lifecycle`, `staff`, `db`, `ops`.
- Code comments explain WHY, never WHAT. Deferred work is `// TODO(CH-NN):`, never a bare TODO.

## Commands (exist only after CH-00 lands)

Stack: TypeScript 5 strict / Node 22+ ESM / Fastify 5 / Postgres 16 + Drizzle / pg-boss (no Redis) / vitest / pnpm.

- `pnpm dev` — tsx watch · `pnpm test` — vitest · `pnpm check` — typecheck + lint + tests (the CI gate)
- Local Postgres via `docker-compose.yml` (postgres:16); dev webhooks via `cloudflared tunnel`; hosting on Railway.
- Machine note: pnpm is not installed yet — start CH-00 with `corepack enable`. Machine runs Node 24 (plan pins 22 LTS — open question; recommendation is engines `>=22`).

## Architecture (what gets built — plan.md §2)

One Node/TS service + one Postgres database. Hot path: WhatsApp webhook → verify signature, ack <1s → raw event store → dedupe on `wa_message_id` → debounced queue (15s quiet / 45s max) → conversation worker: context builder → Claude tool loop (max 5 rounds) → guardrail pipeline → send via Graph API (or draft queue in draft mode). A 60s eZee poller mirrors bookings into `bookings_mirror` and feeds the lifecycle scheduler (confirmation → pre-arrival → welcome → thank-you → win-back). Staff use the same WhatsApp number (coexistence): human replies pause the AI (`human_active_until`); staff task cards and `DONE <id>` commands flow through the same line. Every outbound goes through one window-aware chokepoint (`wa/client.ts`) enforcing the 24h rule; every send uses the send-intent pattern (row committed as `sending` before the Graph call — no duplicate sends).

Build order is the chunk index in plan.md §7 (CH-00 → CH-19). Acceptance = the six scenarios in [docs/product-picture.md](docs/product-picture.md).

## Reference material in this repo

- [docs/ezee/](docs/ezee/) — verbatim eZee Connectivity API mirror. Load `00_INDEX.md` plus only the category file your chunk needs (e.g. `04_bookings.md` for CH-10). **Never read `ezee_connectivity_api_FULL.md` wholesale** (~1 MB). Known: BKG-20 "ReadBooking" is broken on this property — never use it.
- [kb/source/voice-guide.md](kb/source/voice-guide.md) — Nistula voice v1.1 (locked): British English, no exclamation marks, 1–3 sentences, no discount language ever; feeds the CH-04 system prompt.
- [docs/product-picture.md](docs/product-picture.md) — the six acceptance scenarios CH-19 asserts against.
- `credentials-local/` — secrets staging area (gitignored). Do not read it into context; values move to local `.env` and Railway variables only.
