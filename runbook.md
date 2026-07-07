# runbook.md — Nistula Assistance · Operations

> Stub (CH-00). Each chunk adds its operational walkthroughs; CH-18a completes
> this into the 2-am-proof version.

## Run locally

1. `pnpm install`
2. Create `.env` (variable names in `.env.example`; values never enter the
   repo) — minimum from CH-01: `NODE_ENV=development`, `PORT=3000`,
   `DATABASE_URL` (see database paths below).
3. Start the database (path A below), then `pnpm dev` — migrations apply on
   boot, then `GET http://localhost:3000/health` returns `{ok, version, uptime}`.
4. `pnpm check` runs typecheck + lint + tests — the same gate CI enforces.
   The DB tests need a reachable Postgres (path A) and use a separate
   `nistula_test` database they create themselves (`TEST_DATABASE_URL`
   overrides the default `postgresql://nistula:nistula@localhost:5432/nistula_test`).

## Database — two paths (plan CH-01 step 4)

**A · Local Docker (default for dev):**
`docker compose up -d postgres` → `DATABASE_URL=postgresql://nistula:nistula@localhost:5432/nistula`.
Requires Docker Desktop running. Data persists in the `pgdata` volume;
`docker compose down -v` wipes it.

**B · Railway (deferred manual step, needed before CH-02):**
Create the Railway project + Postgres plugin, copy the connection string into
Railway service variables AND local `.env` as `DATABASE_URL`. Production
connection strings must use TLS (§3.3 — `sslmode=require`).

## Migrations

- Generated from `src/db/schema.ts` via `pnpm drizzle-kit generate` into
  `drizzle/` (committed). Never edit applied migration files.
- Applied automatically at boot (`src/db/migrate.ts`), idempotently. To apply
  manually without booting: `pnpm drizzle-kit migrate`.

## Sections to come

- Meta app / test number / webhook setup walkthrough — CH-02
- Red-team probe script (10 messages + expected behaviours) — CH-04
- Template approval pack for the real number — CH-12
- Staff command sheet: `DONE <id>` · `TASKS` · `AI ON/OFF <last4>` — CH-13/14
- Draft-mode unlock ritual — CH-16
- Incidents: webhook silent · eZee down · degraded mode · cost spike — CH-17/18
- Env rotation (WA token!) · backups & restore drill · go-live checklist — CH-18a
