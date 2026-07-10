# runbook.md — Nistula Assistance · Operations

> Stub (CH-00). Each chunk adds its operational walkthroughs; CH-18a completes
> this into the 2-am-proof version.

## Run locally

1. `pnpm install`
2. Create `.env` (variable names in `.env.example`; values never enter the
   repo) — minimum from CH-02: `NODE_ENV=development`, `PORT` (this machine
   uses 3100 — 3000 belongs to another project), `DATABASE_URL` (see database
   paths below), and the four `WA_*` values (boot-required since CH-02).
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

## WhatsApp webhook + deploy (CH-02)

### The standing dev workflow (decided in CH-02 — no tunnels)

The Meta webhook callback points **permanently at the Railway service
domain**. Daily iteration is local via fixtures and signed simulated POSTs
(`test/wa-webhook.test.ts` shows the shape); the live test line is for each
chunk's end-of-chunk demo:

1. Build on the chunk branch until `pnpm check` is green.
2. Any NEW §3.7 variable → set on Railway first (see variables below).
3. `railway up` from the working tree (deploys local files, no git push —
   auto-deploy state is irrelevant to it). The Railway healthcheck gates on
   `/health`: a deploy that never serves 200 does not replace the running one.
4. Demo on the test number, then merge; auto-deploy redeploys main (identical
   content). Tag `vCH-NN`.

Escape hatch when a session truly needs local webhook delivery (e.g. CH-18b
history captures): the WABA-level `subscribed_apps` override
(`POST /{WABA_ID}/subscribed_apps` with `override_callback_uri` +
`verify_token`, System User token auth) points webhooks at a temporary
tunnel without touching the dashboard config; clear it by posting an empty
`override_callback_uri`. Unproven on this WABA — treat the first use as an
experiment.

### Meta dashboard webhook configuration (one-time, Paul)

Prerequisites: the service is live on Railway and `GET /health` returns 200
(Meta verifies the callback DURING save).

1. developers.facebook.com → the "Nistula Assistance" app → WhatsApp →
   **Configuration**.
2. Webhook → Edit: Callback URL = `https://<railway-domain>/webhooks/whatsapp`,
   Verify token = the `WA_VERIFY_TOKEN` value (password manager). Click
   **Verify and save** — the service must answer the GET handshake.
3. Webhook fields → **Subscribe** to `messages`. (Coexistence fields
   `smb_message_echoes` / `history` / `smb_app_state_sync` are subscribed at
   cutover, CH-18.)
4. Prove it: send a WhatsApp message from the allowlisted phone to the test
   number → the message appears in the `messages` table.

The next reconfiguration is BSP cutover (CH-18) — nothing else should ever
touch this screen.

### Railway variables (CH-02 pattern — secrets never transit chat/history)

Values move from local `.env` to Railway via a throwaway script OUTSIDE the
repo that pipes each value to
`railway variable set <KEY> --stdin --service <service> --environment production --skip-deploys`
and verifies via `railway variable list --json` compared in-process — the
script prints variable NAMES and OK/VERIFIED only. Never run a bare
`railway variable set KEY=value` or `railway variable list` outside this
pattern: the CLI echoes raw values. Rotation (new WA token etc.) = update
local `.env`, rerun the same script. CH-18a commits a parameterised copy as
`scripts/railway-sync-secrets.mjs` and makes it the rotation procedure.

### WA token notes

- `WA_ACCESS_TOKEN` is a **System User token with Never expiry** — dashboard
  test tokens die in 24h; if sends start failing with 401/OAuthException,
  rotate: Business settings → System users → generate token
  (`whatsapp_business_messaging` + `whatsapp_business_management`) → update
  local `.env` + Railway (script above) → redeploy.
- A `131047` error on a send means the 24h service window is closed — from
  CH-12 the sender switches to templates automatically; before that it is an
  expected failure recorded on the message row.

## Queue + worker (CH-03)

One pg-boss instance rides the same Postgres (schema `pgboss`, created at
boot). Two queues:

- `conversation.process` — the debounced conversation worker. One job per
  conversation at a time (policy `stately`, singletonKey = conversation id);
  a job wakes ~15s after the last guest message and holds a burst at most
  45s, then replies once. Retries: 3, backoff from 10s.
- `conversation.sweep` — the recovery net, cron `*/2 * * * *` (Asia/Kolkata):
  re-enqueues any conversation whose oldest unprocessed guest message is
  older than 60s (crashed enqueues, lost jobs, later model failures).

The timing values are code constants in `src/brain/debounce.ts` — they are
the plan.md spec, not env config; changing them is a planning-chat decision.

**Inspecting jobs** (local: `docker exec -it nistula-assistance-postgres-1
psql -U nistula -d nistula` · Railway: `railway connect postgres`):

```sql
SELECT name, state, singleton_key, start_after, retry_count
FROM pgboss.job ORDER BY created_on DESC LIMIT 20;
```

States: `created` (waiting) → `active` (worker running) → `completed`
(`failed` after retries; `retry` between attempts). A conversation that
never answers: check its `conversations.last_processed_message_id` against
its newest `messages` row — unprocessed + no `created` job means the sweeper
will pick it up within ~3 minutes.

**Shutdown:** SIGTERM drains active jobs for up to 25s before the process
exits (Railway redeploys wait for this); jobs still active at the deadline
are failed as "pg-boss shut down while active" and retried by the next
deploy's worker.

**Known trap (pg-boss 12.25.1):** `createQueue()` on an existing queue is a
silent no-op — changing retry/expiry options in `src/jobs/index.ts` requires
a matching `updateQueue()` migration step (or deleting the queue once in a
maintenance window). The test helper re-creates queues every run for this
reason.

## Sections to come

- Red-team probe script (10 messages + expected behaviours) — CH-04
- Template approval pack for the real number — CH-12
- Staff command sheet: `DONE <id>` · `TASKS` · `AI ON/OFF <last4>` — CH-13/14
- Draft-mode unlock ritual — CH-16
- Incidents: webhook silent · eZee down · degraded mode · cost spike — CH-17/18
- Env rotation (WA token!) · backups & restore drill · go-live checklist — CH-18a
