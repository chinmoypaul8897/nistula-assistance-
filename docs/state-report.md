# State report for architect re-sync

**Produced 2026-07-27 by a read-only audit of the repo at `main` = `19016a4`.** No code was changed.
Reference document: `plan.md` (read in full). Session-memory reference: `progress.md` (3 525 lines,
append-only, authoritative). Every claim below carries a file path or a command output. Where a fact
was not established this session it says **UNKNOWN**. No secret values appear anywhere — env
variable NAMES only.

---

## 1. Runtime truth

1. **Gate green locally (run 2026-07-27, split per `pnpm check`'s three steps, exit codes read directly, not grepped):** `npx tsc --noEmit` → **exit 0, zero output**; `npx eslint .` → **exit 0, zero output**; `npx vitest run` → **106/106 test files, 1791/1791 tests passed, 0 failed**, 316 s (`package.json:16`).
2. **`pnpm dev` boots clean** — `npx tsx src/server.ts` reached "Server listening at http://127.0.0.1:3100" in ~1.1 s, migrations applied at boot, `GET /health` → `{"ok":true,...,"db":true,"boss":true,"degraded":false}`. Boot log warns (correctly) `eZee poller DISABLED (EZEE_POLLER_ENABLED=0)` and `LIFECYCLE_EPOCH is UNSET`; config summary is presence-only (`set`/`unset`), no values.
3. **Deployed instance is live**: host `nistula-assistance-production.up.railway.app`, `GET /health` → **200**, body `{"ok":true,"version":"0.1.0","uptime":588,"db":true,"boss":true,"degraded":false,"pollerAgeMs":17135,"senderAgeMs":17133}` — i.e. the eZee poller and lifecycle sender are both ticking in production. Two probes 157 s apart showed uptime 431 → 588 s, so the box restarted ~10 min before the first probe (consistent with the FIX-2 merge auto-deploying; **the deployed commit is not exposed by `/health` — UNKNOWN**).
4. **Versions**: Node `v24.14.1`, pnpm `11.10.0`. `package.json:8` requires `node >=22.13.0`; `packageManager` pins `pnpm@11.10.0`. CI matrix runs Node 22 + 24 (`.github/workflows/ci.yml:11-13`).
5. **🚨 CI on `main` has been RED since 2026-07-22** (runs `29889227897`, `30243293336`). In both, the `pnpm check` step **succeeded**; the failure is the next step, `pnpm audit --audit-level high`: HIGH advisory on **`fast-uri` (vulnerable `>=3.0.0 <=3.1.3`, patched `>=3.1.4`)**, transitive via `fastify > @fastify/ajv-compiler > ajv > fast-uri` (9 paths). Consequence: the **Fixture PII guard step has been `skipped` on every run since 22 Jul** because the audit step aborts the job first.

---

## 2. Repo inventory

**Size:** `src/` = 108 `.ts` files / **23 232 LOC** · `test/` = 106 test files + 6 helpers/acceptance modules / 26 408 LOC · `scripts/` = 9 files / 1 164 LOC.

### src/ (2 levels)

```
src/
  config.ts            zod-validated §3.7 env registry, fail-fast, secret-free boot summary (476 L)
  server.ts            fastify bootstrap, /health, boss boot+drain, route mounting (354 L)
  brain/
    claude.ts          Anthropic client; SDK retry disabled, ours used; usage → cost_events
    contextBuilder.ts  §6.3 context assembly (extracted from turn.ts)
    cost.ts            token→INR pricing consts (hardcoded sonnet list price, INR_PER_USD=90)
    debounce.ts        pure debounce decision: quiet 15 s / maxWait 45 s / sweep 60 s
    draftGuards.ts     guardrails 4–6 pure checks (window gate, identity line, length/format)
    draftRouting.ts    CH-16 draft-vs-direct routing decision
    factScreens.ts     remember_fact save-time sensitive/instruction/entitlement screens
    guardrails.ts      the §6.5 pipeline orchestrator (431 L)
    inbound.ts         inbound-message text helpers
    knowledge.ts       block [3] loader (compiled kb/*.md) + token budget
    leakGuards.ts      guardrail 7 — leak scan, runs last on the FINAL text
    opsEscalation.ts   interim ops escalation + policy telemetry
    policy.ts          §6.7 deterministic pre-model policies incl. rate limit (378 L)
    prefDetect.ts      register/language heuristics
    priceGuards.ts     guardrail 1 (price integrity) + guardrail 3 (negotiation lock)
    profileBlock.ts    block [5] GUEST CONTEXT renderer
    promises.ts        guardrail 2 — promise integrity claim classes (403 L)
    prompt.ts          §6.2 blocks [1][2][4][6] + phrasebook + cache_control (344 L)
    referenceClaim.ts  CH-11 reference-claim verification (code-side, guest's own words)
    rupees.ts          ₹ amount extraction/normalisation
    stayGuards.ts      stay-affirmation + unit-assertion scans (OQ-19 enforcement)
    stayView.ts        the ONE door from a bookings_mirror row to guest-facing words
    summariser.ts      CH-08 rolling-summary compactor
    telemetry.ts       guardrail/policy hits → raw_events
    tokens.ts          shared chars/3.6 token estimator
    turn.ts            the Claude turn: tool loop + guardrail invocation (544 L)
    worker.ts          conversation worker (621 L)
    tools/             registry.ts · schemas.ts · index.ts (7 tools) · websiteApi.ts (quote client)
                       · degraded.ts · getQuote · getAvailability · getBookingLink · getBooking
                       · rememberFact · createStaffTask (458 L) · escalateToHuman
  db/
    schema.ts (636 L) · client.ts · migrate.ts · repos.ts (816 L) · bookings.ts · stays.ts
    summaries.ts · guestMemory.ts · tasks.ts (512 L) · drafts.ts · consent.ts · windows.ts
    erasure.ts (DELETE_GUEST one-tx anonymise-in-place, 324 L)
  ezee/
    client.ts (BKG-02 poll / BKG-04 ACK / BKG-03 single) · normalize.ts · poller.ts (392 L) · types.ts
  jobs/
    index.ts (1 039 L — every pg-boss queue, worker and cron) · txSend.ts (tx-riding boss.send shim)
  lib/
    http.ts (single fetch wrapper, injectable) · logger.ts (pino + redaction) · phone.ts (E.164)
    time.ts (IST) · villas.ts (§5.4 map + resolver) · text.ts · s3.ts (hand-rolled SigV4)
  lifecycle/
    gates.ts (epoch/date/status/source) · plan.ts · scheduler.ts · sender.ts · sendGuards.ts
    templates.ts · reconcile.ts (hourly sweep) · leadFollowup.ts
  ops/
    admin.ts (bearer+flag admin routes) · alerts.ts · watchdog.ts · health.ts · heartbeat.ts
    costMeter.ts · rollup.ts · keepalive.ts · backup.ts · backupExec.ts
  staff/
    index.ts · roster.ts · notifier.ts · commands.ts (433 L) · sla.ts · digest.ts · villaRoute.ts
    arrivalTasks.ts · mediaTask.ts · humanTakeover.ts · draftNotify.ts · draftCommands.ts
    draftExpiry.ts · qualityReport.ts
  wa/
    webhook.ts (487 L) · client.ts (the single send chokepoint) · templateSend.ts · signature.ts
    types.ts · messageShape.ts · sendFailure.ts · sendReconcile.ts · history.ts (CH-18b import)
```

**21 files exceed the plan's ~300-line soft cap**, led by `src/jobs/index.ts` (1 039), `src/db/repos.ts` (816), `src/db/schema.ts` (636), `src/brain/worker.ts` (621), `src/brain/turn.ts` (544).

### kb/

| File | Purpose |
|---|---|
| `kb/villas.md` (41 L) | GENERATED by `pnpm kb:build` — per-villa block [3] content |
| `kb/policies.md` (45 L) | GENERATED — policies + the ₹-fee whitelist source for guardrail 1 |
| `kb/faq.md` (38 L) | GENERATED — condensed FAQ |
| `kb/quirks.md` (40 L) | HAND-maintained; **EMPTY ON PURPOSE (Paul, 2026-07-13)** — boot logs `quirksPresent: false` |
| `kb/source/voice-guide.md` | Nistula voice v1.1 (locked) — feeds block [2] |
| `kb/source/roomtypes.json` | eZee CFG-05 RoomTypeList occupancy snapshot |
| `kb/source/website-content/{villas.json,policies.md,faq.md}` | curated kb-build inputs |

Compiled block [3] at boot: `kbVersion b763d4da`, **2 461 tokens** (budget 6 k).

### scripts/

`kb-build.ts` (`pnpm kb:build`) · `replay-scenarios.ts` (`pnpm replay`, CH-19 acceptance) ·
`fixture-scrub.ts` (PII scrubber) · `ezee-backfill.ts` · `ezee-capture.ts` · `ezee-reconcile.ts`
(BKG-05 ArrivalList gap measure/hydrate) · `template-pack.ts` (`pnpm templates:pack` — Meta approval
bodies) · `backup.ts` · `railway-sync-secrets.mjs` (Node-not-PowerShell secret mover).

### test/

106 `*.test.ts` files, one per src module family (`test/wa-*`, `test/brain-*`, `test/lifecycle-*`,
`test/staff-*`, `test/ops-*`, `test/db*`, `test/tools-*`, plus review-fix suites
`lifecycle-review{,2,3}-fixes.test.ts`, `ch11-defect-fixes.test.ts`, `ch17-*`). Listed per-file here
would consume ~110 lines of the budget; the mapping is 1:1 by name. Structural pieces:

- `test/golden-path.test.ts` — the forever-green e2e (CH-03 → upgraded CH-04).
- `test/acceptance/` — `harness.ts`, `seed.ts`, `query.ts`, `support.ts`, `scenario.ts`, `scenarios/s1..s6.ts`, `replay.test.ts` (runs the same six assertions inside `pnpm check`).
- `test/fixtures/` — `wa/` (5 scrubbed captures incl. `history-basic.json`), `ezee/` (7), `website/` (4), `secrets-shaped.json`.
- `test/helpers/` — `boss.ts`, `brain.ts`, `seed.ts`, `wa.ts`, `admin.ts`; `test/setup/db-global-setup.ts`.

### Dependencies vs plan §3.1

| Package | Version | §3.1 sanction |
|---|---|---|
| `fastify` | ^5.10.0 | ✅ Fastify 5 |
| `drizzle-orm` | ^0.45.2 / `drizzle-kit` ^0.31.10 | ✅ |
| `postgres` | ^3.4.9 | ✅ (driver for drizzle) |
| `pg-boss` | ^12.25.1 | ✅ |
| `@anthropic-ai/sdk` | ^0.110.0 | ✅ |
| `pino` ^10.3.1 / `pino-pretty` ^13.1.3 | | ✅ |
| `zod` ^4.4.3, `dotenv` ^17.4.2 | | ✅ (CH-00 install list) |
| `typescript` ^5.9.3, `tsx` ^4.23.0, `vitest` ^4.1.10, `@types/node` ^26.1.0 | | ✅ |
| `eslint` ^10.6.0, `prettier` ^3.9.4, `@eslint/js`, `eslint-config-prettier`, `typescript-eslint` | | ✅ in spirit (§3.1 "eslint + prettier"); the three extras are flat-config plumbing |

**No unsanctioned runtime dependency exists.** Two things §3.1/§8 named that were deliberately NOT
installed: `p-queue` (CH-05 step 3 — replaced by a hand-rolled serial spacer,
`src/brain/tools/websiteApi.ts:16-17,122-131`) and any AWS SDK (CH-18a-2 — replaced by hand-rolled
SigV4, `src/lib/s3.ts`). Both are recorded deviations, both reduce dependency surface.

---

## 3. Chunk scoreboard

Judged strictly against each chunk's **"Done when"** in `plan.md` §8. Where a chunk's DoD names a
*live* demo that was never run, it is **PARTIAL** even though every test is green — the repo itself
says so in each case, so this is not a re-litigation.

| Chunk | Status | Evidence | What's missing (if not DONE) |
|---|---|---|---|
| CH-00 Repo bootstrap | **DONE** | `progress.md:158`; `src/config.ts`, `src/server.ts`, `src/lib/{phone,time,http,logger}.ts`, `.github/workflows/ci.yml`, tag `vCH-00`/`vCH-00b` | — |
| CH-01 Database core | **DONE** | `src/db/{schema,client,migrate,repos}.ts`, `drizzle/0000_conversation-core.sql`, `docker-compose.yml`; tag `vCH-01`; DB suites green | — |
| CH-02 WA client + webhook | **DONE** | `src/wa/{signature,webhook,client,types}.ts`; live round trip recorded `progress.md:9`; 5 scrubbed fixtures; tag `vCH-02` | — |
| CH-03 Echo pipeline | **DONE** | `src/jobs/index.ts`, `src/brain/debounce.ts` (15 s/45 s/60 s), `test/golden-path.test.ts`, `test/debounce.test.ts`; tag `vCH-03` | — |
| CH-04 Brain v1 (voice) | **DONE** | `src/brain/{prompt,claude,cost}.ts`, `cost_events` via migration `0002`; live 10-message pass recorded `progress.md:316`; tag `vCH-04` | — |
| CH-05 Price tools | **DONE** | `src/brain/tools/{websiteApi,getQuote,getAvailability,getBookingLink}.ts`, `src/brain/priceGuards.ts`, `src/lib/villas.ts`; live parity demo `progress.md:354`; tag `vCH-05` | — (but see §4.11 villa-map drift, which degrades it *now*) |
| CH-06 Knowledge base | **PARTIAL** | Machinery DONE: `scripts/kb-build.ts`, `src/brain/knowledge.ts`, block [3] loads at boot (`kbVersion b763d4da`, 2 461 tok); `test/kb-build.test.ts` | DoD names a **quirk-aware B3 answer**. `kb/quirks.md` is **empty on purpose**; boot logs `quirksPresent: false`. Content-blocked on OQ-01 (villa team), Paul-sanctioned deferral (`progress.md:31`) |
| CH-07 Policy + full guardrails | **DONE** | `src/brain/{policy,promises,leakGuards,draftGuards,telemetry}.ts`; `test/red-team.test.ts` (15 adversarial cases); tag `vCH-07` | — |
| CH-08 Short-term memory | **DONE** | `src/brain/{contextBuilder,summariser,tokens}.ts`, `src/db/summaries.ts`, nightly cron in `jobs/index.ts:635`; tag `vCH-08` | — |
| CH-09 Long-term memory | **DONE** | `src/brain/{profileBlock,factScreens,prefDetect}.ts`, `src/db/guestMemory.ts`, `POST /admin/guest-lookup` (`src/ops/admin.ts`), migration `0004`; live demo `progress.md:677`; tag `vCH-09` | — |
| CH-10 eZee mirror | **PARTIAL** | Poller/ACK/normalise all built + live: 62 real items mirrored, 0 errors (`progress.md:794-808`); migration `0005`; tag `vCH-10` | DoD says `created→mirror→**modify**→cancel`. The **modify leg was never exercised live and cannot be via API — eZee has no amend endpoint** (`progress.md:830`). Zero `modified` rows have ever existed in production. Create/cancel proven end-to-end (booking 953) |
| CH-11 Booking awareness | **PARTIAL** | `src/brain/{stayView,referenceClaim,stayGuards}.ts`, `src/db/stays.ts`, `get_booking` tool, migration `0006`; live demo passed; tag `vCH-11` | The **stranger-refusal probe was never run over the real WhatsApp path** — needs a 2nd allowlisted number (`progress.md:1195` region). Covered in CI (`test/tools-get-booking.test.ts`, `test/reference-claim.test.ts`) |
| CH-12 Lifecycle engine | **DONE** | `src/lifecycle/*`, migrations `0007`/`0008`; live: a real confirmation **sent and read** on a real phone; re-date moved the pre-arrival; cancel→revoke proven; gates proven on production data (199 pre-epoch rows → 0 scheduled); tag `vCH-12` | — |
| CH-13a Staff tasks (loop) | **PARTIAL** | `src/staff/{roster,notifier,commands,sla,villaRoute}.ts`, `create_staff_task` tool, migrations `0009`/`0010`; local demo against LIVE eZee proved fresh-BKG-03 routing; tag `vCH-13a` | DoD requires the **towel scenario end-to-end with a second allowlisted handset** playing staff. Explicitly **not run, not claimed** (`progress.md:52`) |
| CH-13b Staff tasks (fan-out) | **PARTIAL** | `src/staff/{arrivalTasks,mediaTask}.ts`, `tasks.origin` migration `0011`; tag `vCH-13b` | Same live-DoD gap (roster + 2nd number) |
| CH-14a Takeover + escalation SLA | **PARTIAL** | `escalate_to_human` tool, `src/staff/humanTakeover.ts`, `tasks.nudge_count` migration `0012`, `POST /admin/simulate-human-reply`; tag `vCH-14a` | DoD = "scenario 4 passes on the test line". Live leg deferred (roster + 2nd number). The prod `smb_message_echoes` path has **never seen a real Meta payload** — fixtures are provisional per §5.3 |
| CH-14b Night + digest | **PARTIAL** | `src/staff/digest.ts` (10:00 IST wake of `night_queue`), block [4] night wording; tag `vCH-14b` | DoD = "scenario 5 passes on the test line". Deferred. **And the live 25–26 Jul UAT found the night contract is incomplete** — see FIX-3 in §8 |
| CH-15 Lead follow-up + consent | **PARTIAL** | `src/lifecycle/leadFollowup.ts`, `src/db/consent.ts`, `guests.opt_out_marketing` migration `0013`; caps enforced at schedule AND send; tag `vCH-15` | DoD's **test-line demo of follow-up + STOP deferred** — a marketing template in `simulate` is free-form and blocked outside the 24h window (`progress.md:56`) |
| CH-16 Draft mode | **PARTIAL** | `drafts` table migration `0014`, `src/brain/draftRouting.ts`, `src/staff/{draftNotify,draftCommands,draftExpiry,qualityReport}.ts`; tag `vCH-16` | DoD's **live draft-card → OK → guest demo not run** (needs a 2nd approver number). Live number deliberately kept DIRECT via `AUTO_SEND_TYPES` on Railway |
| CH-17 Watchdog & costs | **PARTIAL** | `src/ops/{watchdog,health,heartbeat,costMeter,rollup,alerts}.ts`, deepened `/health` (verified live in §1); tag `vCH-17` | DoD = "killing the poller in dev triggers the ladder … daily digest lands" — **not recorded as run**. And **`HEALTHCHECKS_URL` is absent from Railway**, so the dead-man's-switch half of step 1 is inert in production |
| CH-18a-1 Security + erasure | **DONE** | `src/db/erasure.ts`, `POST /admin/delete-guest` with dry-run, admin 404-when-disabled test, secrets-shaped redaction fixture, `pnpm audit` clean *at the time*; tag `vCH-18a-1` | — |
| CH-18a-2 Backups + keep-alive + runbook | **PARTIAL** | `src/ops/{backup,backupExec,keepalive}.ts`, `src/lib/s3.ts`, `runbook.md` (1 627 L) + 12-step go-live checklist; tag `vCH-18a-2` | plan §8 CH-18 DoD says **"restore drill done once"** — not done. All of it is off-by-default (`BACKUP_ENABLED`/`COEXISTENCE_ACTIVE` absent from Railway), so **no backup has ever been taken of production** |
| CH-18b History import | **DONE** *(against its own DoD)* | `src/wa/history.ts`, `wa.history` queue, 5 contract guards, `test/wa-history.test.ts`; tag `vCH-18b` | Fixtures remain **provisional** (§5.3) until real cutover captures — stated by the plan itself, not a chunk failure |
| CH-18c (deferred slice, not in plan) | **DONE** | `messages.guest_id` migration `0015` + `aboutGuestId` threading, `src/wa/sendReconcile.ts` (fail-closed stale-`queued` sweep); tag `vCH-18c` | Poststay anchor **deliberately deferred** (verb unresolved + OQ-22 unobserved) |
| CH-19 Acceptance | **DONE** | `scripts/replay-scenarios.ts` + `test/acceptance/*`; `pnpm replay` 6/6; `replay.test.ts` inside the gate; Paul's live voice sign-off recorded `progress.md:3343`; tag `v1.0.0` pushed | — (see §4.14: the tag points at `46ed7f4`, not `ba30398` as CLAUDE.md states) |
| **CH-20 Retire 4 Assagao villas** *(not in plan)* | **IN FLIGHT, PAUSED, UNMERGED** | Branch `chunk/CH-20-retire-assagao-villas`, WIP commit `1a97b6d`, 14 files, +523/−154; full spec in `docs/CH-20-villa-retirement-handoff.md` (on that branch) | Typechecks clean, **test suite never run**; ~57 test files still reference the departed villas; `docs/product-picture.md` + acceptance harness not yet amended; roster/template samples not updated. Blocked when written by a Windows fork-spawn failure (now resolvable — the suite ran fine this session) |

---

## 4. Deviations from plan.md

Schema diffed column-by-column: `src/db/schema.ts` + `drizzle/0000…0015` against plan §4.

1. **`reference_attempts` — a whole table §4 does not list.** `src/db/schema.ts:336-351` (migration `0006`). WHY: §6.4's "3 failed reference attempts/day" is a security counter guarding *another guest's booking*; the in-memory window CH-07 uses would reset on every deploy, handing an attacker fresh guesses at short, near-sequential reservation numbers (schema comment, lines 320-335). RISK if left: none — it is strictly safer than the plan. Recorded as Paul-approved.
2. **Column ADDS beyond §4** (all via committed migrations, each with an in-schema WHY): `guests.opt_out_marketing` (`0013`); `messages.guest_id` + `messages_guest_idx` (`0015`, the CH-18a-1 erasure residual); `tasks.request_key` (`0010`), `tasks.origin` (`0011`), `tasks.nudge_count` (`0012`); `scheduled_messages.deferred_until` (`0008`) and `scheduled_messages.skip_reason`. RISK: none functionally; the risk is **documentary** — §4 no longer describes the live schema, so anyone planning off §4 will under-model tasks and scheduled_messages.
3. **Enum vocabulary ADDS**: `raw_event_source` += `'system'` (guardrail/policy telemetry); `cost_event_kind` += `'anthropic_cache_write'`; `task_status` += `'notify_failed'` (a card that never reached a human is neither open nor done — it is the state guardrail 2 keys off); `task_origin` and `draft_reply_type`/`draft_status` are new enums for new columns. RISK: low; each is append-at-end so drizzle-kit never rewrites the type.
4. **`bookings_mirror` nullability is far wider than §4's letter** — only `ezee_reservation_no`, `status`, `raw`, `synced_at` are NOT NULL (`schema.ts:211-259`). WHY: eZee omits/empties fields freely and cancel tombstones carry only a reservation number; a strict schema would make the poller crash on real production payloads. RISK: reads must defend against nulls everywhere — they do, but a new consumer that assumes `check_in` exists will break on tombstone rows.
5. **`raw_events` stores a SCRUBBED, non-empty-only payload**, not "every webhook payload as received" (§4). WHY: §3.3 PII discipline beats §4's audit wording; card/identity fields are stripped at the eZee client boundary (`src/ezee/types.ts` header). RISK: an audit replay is not byte-faithful to the wire.
6. **Indexes: all five §4 indexes exist**; five more were added (`guest_facts_guest_created_idx`, `reference_attempts_phone_created_idx`, `tasks_guest_status_idx`, `drafts_status_created_at_idx`, `messages_guest_idx`). RISK: none.
7. **Queue/debounce mechanics differ from §2.2 step 4's "pg-boss's debounce primitive".** Implemented as: a pure decision function (`src/brain/debounce.ts:35-53`) that either processes now or re-enqueues itself with `startAfter = newest + quiet + 1 s`, plus a 2-minute sweeper cron (`sweepAfterMs 60_000`, `'*/2 * * * *'`) and a worker-completion re-check. Constants are the plan's (quiet 15 s, max 45 s). WHY: recorded as CH-03 decision D4 — the plain-singleton trap the plan itself warned about. RISK: none observed; the invariant `quiet ≤ maxWait < sweepAfter` is pinned by a unit test.
8. **Guardrails: seven implemented, but not all seven live in `brain/guardrails.ts`.** Present as pipeline rules: `price_integrity` (1), `promise_integrity` (2), `negotiation_lock` (3), `identity` (5), `length_format` (6), `leak_scan` (7) — plus **two the plan never specified**: `stay_integrity` and `unit_integrity` (`guardrails.ts:408,417`, CH-11's OQ-19 enforcement). **Guardrail 4 (24 h window) is NOT a pipeline rule** — it is enforced at the single send chokepoint `src/wa/client.ts:226-245` (free-form refused on a closed window, alert kind `window_closed_blocked`) with the pure check in `src/brain/draftGuards.ts`. WHAT differs: location, not existence. RISK: a reader auditing "the seven guardrails" in one file will not find #4 there.
9. **Tools: seven, but not §6.4's seven.** Implemented (`src/brain/tools/index.ts:16-24`): `get_quote`, `get_availability`, `get_booking_link`, `remember_fact`, `get_booking`, `create_staff_task`, `escalate_to_human`. §6.4 lists exactly these seven — **but two signatures diverge**: `create_staff_task` has **no `villa_label` parameter** (the door is derived server-side from a fresh `BKG-03 tran.RoomID` read, `src/staff/villaRoute.ts`), and `get_booking` takes **one** argument, verified against the guest's own typed words. Both changes are marked SUPERSEDED-in-place inside plan.md itself. RISK: none — these are the safer contracts.
10. **Prompt block structure matches §6.2 with one deliberate difference:** the cached static head is `[1]+[2]+[3]+[4]` with `cache_control: {type:'ephemeral'}` on the **last** static block (`src/brain/prompt.ts:334`), and **block [6] SITUATION is rendered AFTER [5] and the summary**, not in §6.2's listed order. Block [5] moved out of `prompt.ts` into `src/brain/profileBlock.ts`. RISK: none; the ordering is what makes the prefix cacheable.
11. **§5.4 villa map is stale in production reality — twice over.** (a) `src/lib/villas.ts:48-55` still ships all 8 units; on the live line the **villa/3BHK ids return `villa_map_drift` 404s** while apartment ids quote correctly (`progress.md:3367`). (b) Four of those villas — **B1, B3, C1, C3 — were retired by Nistula on 2026-07-24 and removed from eZee** (`docs/CH-20-villa-retirement-handoff.md` §1). WHY unfixed: CH-20 is paused mid-task. **RISK: HIGH and guest-facing — the AI can currently be asked to quote a house Nistula no longer operates, and a 404 is indistinguishable from "taken", so it can tell a guest villas are unavailable when the truth is they no longer exist.**
12. **§3.5's replay target changed:** `pnpm replay` runs **in-process**, not against a running `pnpm dev`. Paul-approved (Q1) and marked SUPERSEDED in plan §3.5/§8 CH-19. RISK: none; the alternative would have called live Claude + the live website (which hits the live PMS).
13. **`p-queue` and any AWS SDK were not installed** (see §2). Reason recorded in code comments. RISK: the hand-rolled SigV4 in `src/lib/s3.ts` is proven against the AWS test vector but has never signed a request to a real bucket.
14. **Tag/record drift:** `v1.0.0` resolves to **`46ed7f4`**, but `CLAUDE.md` states "annotated tag, on `ba30398` = HEAD of `main`". RISK: low, but the orientation file a new session reads first is wrong about the release point.
15. **Six new §3.7 env vars the original registry lacked** — `EZEE_POLLER_ENABLED`, `LIFECYCLE_SEND_ENABLED`, `LIFECYCLE_EPOCH`, `LIFECYCLE_SOURCES`, `WA_TEMPLATE_MODE`, `QUIET_STALE_MINUTES` — plus the CH-18a-2 backup/coexistence block. All were folded back into plan §3.7 (lines 202-236). RISK: none; noted for completeness.

---

## 5. Decisions taken during build that plan.md never covered

1. **`bookings_mirror` is a CHANGE FEED, not the property's booking book.** It holds only what eZee's queue contained since the poller started; a real in-house guest whose booking predates it is staged a *lead*. Mitigation shipped: `scripts/ezee-reconcile.ts` (BKG-05 ArrivalList, print-only unless `--apply`) — one run hydrated 123 rows. **Architect review: YES** — this is a durable truth about the data source that §5.2 does not state.
2. **`stayView.TRUST_EZEE_ROOM_ASSIGNMENT = false`** (`src/brain/stayView.ts`): the AI names **no house, ever**, to a guest. **YES** — it inverts §5.4's "unless `physical_room_label` is already assigned" clause and is still gated on OQ-15.
3. **The staff villa is derived from a FRESH BKG-03 read at task time**, never from `bookings_mirror.physical_room_label` (a snapshot), never from a model argument (`src/staff/villaRoute.ts`). **NO** — plan §6.4 was amended in place to say exactly this.
4. **BKG-03's real error contract:** "no such reservation" is an **empty OK** (`{status:'ok',reservations:[]}`), not a 503; `RoomID:""` means no room yet; a **cancelled/voided booking returns its room happily**, so a successful read is not proof of life. 14 live probes. **NO** — already written into plan §8 CH-13 and CLAUDE.md.
5. **`LIFECYCLE_SOURCES` defaults direct-only, fail-closed** — OTA guests are mirrored but never messaged (`src/lifecycle/gates.ts`). **YES** — it is the only thing standing between 12+ real Airbnb/Booking.com guests with unmasked numbers and an unauthorised WhatsApp (OQ-20, unanswered).
6. **`LIFECYCLE_EPOCH` as an INSTANT, not a date**, and unset ⇒ nothing schedules at all. **NO** — folded into §3.7.
7. **Cool-off rate limiting is in-memory, not a table** (`src/brain/policy.ts:19-23`, CH-03 decision D4; restart loss accepted). But the **reference-attempt counter deliberately is NOT** (see §4.1) — the two were split on "what is this counter guarding?". **NO**.
8. **Guardrail 1's ₹ whitelist is CONTEXT-BOUND, not a flat number list**: a fee may be stated only in a sentence naming that fee, from `kb/policies.md`. A pre-push review caught a fabricated nightly rate sailing through a flat list. **NO** — now in CLAUDE.md's hard rules.
9. **Guardrail 2 claim classes C1–C5 with licence/veto semantics** (`src/brain/promises.ts`): a *nudge* licenses C1 ("I've nudged housekeeping") but **not** C2 ("on the way") — which means the product-picture S3 example line is over the guard. **YES** — the contract doc and the code disagree by design and the architect should ratify which wins.
10. **`messages.status = 'queued'` is the §4 enum's spelling of §3.4's `'sending'`** (`src/wa/client.ts:124-139`); a stranded `queued` row is marked terminally `failed` and alerted, **never resent** (`src/wa/sendReconcile.ts:11-16`, 10-min staleness). **NO**.
11. **`pg-boss@12.25.1`'s `fromDrizzle` adapter is broken with the postgres-js driver** — a shim wraps results as `{rows}` (`src/jobs/txSend.ts`), pinned by `test/tx-send.test.ts`. **YES** — it is an upgrade landmine.
12. **eZee full cancels of multi-room bookings arrive as N suffixed entries (`877-1/-2/-3`) with no bare entry**; same-base grouping per cycle flips them, and a cancel arriving before its create tombstones the BASE key too. **NO** — but the architect should know the mirror's cancel semantics are non-obvious.
13. **The AI never states a deposit amount** (block [4], `src/brain/prompt.ts`): none is published, so it defers — even though §5.1 carries a formula. **YES** — §5.1's formula and the shipped behaviour disagree (OQ-13).
14. **Draft mode covers MODEL turns only** — deterministic phrasebook/policy sends (cool-off, human-request ack, media fallback) go direct. Paul-confirmed. **NO**.
15. **`FIX-2`: the DONE close line is composed entirely from `task.kind`**, a closed enum, because `task.summary` is model prose written for staff and leaked to guests three times live. **YES** — the *sibling* is only mitigated: `src/brain/profileBlock.ts` still renders that same staff-authored summary into block [5] on every turn, held back only by a prompt instruction (`progress.md:3479-3490`).
16. **Backups run on Railway only** (single-runner, poller precedent) and encryption is `age` with a public recipient — no private key on the box. **NO**.

---

## 6. External integrations — actual state

### WhatsApp (Meta Cloud API)

- **Webhook URL**: `https://nistula-assistance-production.up.railway.app/webhooks/whatsapp` — permanently pointed at Railway; **no tunnels** (CH-02 decision D8). GET handshake + POST handler in `src/wa/webhook.ts`.
- **Signature verify: IMPLEMENTED and enforced before parsing** — `src/wa/webhook.ts:105-122` returns **401** on a missing or bad `X-Hub-Signature-256`, counted in a process-lifetime counter; timing-safe compare in `src/wa/signature.ts`.
- **Fields subscribed**: `messages` only, plus the WABA-level `subscribed_apps` link (created via API — the dashboard never creates it, `progress.md:9`). **`smb_message_echoes`, `history`, `smb_app_state_sync` are NOT subscribed** — they are go-live checklist items (plan §8 CH-18 step 4). Consequence: the coexistence and history-import code paths have never received a real Meta payload.
- **Test number working**: yes. Last recorded successful in/out — **the live voice pass 2026-07-21** (three guest turns against real Claude, all correct) and the **25–26 Jul live UAT** with real handsets and a real eZee booking, which confirmed 11 portions of the system and surfaced 7 issues (`docs/fix-pass-mechanical.md:12-15`).
- **Send-intent pattern: IMPLEMENTED.** `createSendIntent` commits the `messages` row as `queued` before the Graph call, `dispatch` settles it to `sent` under `WHERE status='queued'` (`src/wa/client.ts:108-202`); a stranded row is failed, never resent (`src/wa/sendReconcile.ts`, 5-min cron `jobs/index.ts:917`).
- **Window tracking: IMPLEMENTED for both populations.** Guest windows on `conversations.service_window_expires_at`; staff/ops windows in the `phone_windows` table written on every inbound (`src/db/windows.ts`, `schema.ts:567-572`). `src/wa/client.ts` is the single window-aware chokepoint for every outbound.

### eZee

- **Poller running: YES, in production** — `/health` reports `pollerAgeMs: 17135`. `EZEE_POLLER_ENABLED` is set on Railway; **absent from local `.env`** (the binding split-brain rule holds).
- **Interval**: the cron registered is `'* * * * *'` (`src/jobs/index.ts:671`) — every minute, i.e. §2.3's 60 s.
- **ACK: implemented, after-commit only** — `ackBookings` is called with only the reservation numbers whose DB transaction committed (`src/ezee/poller.ts:319-360`); proven live when the queue drained to empty and stayed empty.
- **OBSERVED LIVE payload field names** (`pnpm ezee:capture`, 2026-07-13 — the §5.2 mandate, mirrored into `src/ezee/types.ts`):
  - *Reservation*: `UniqueID, LocationId, BookedBy, Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zipcode, Phone, Mobile, Fax, Email, Source, PaymentMethod, IsChannelBooking`.
  - *BookingTran*: `SubBookingId, TransactionId, Createdatetime, Modifydatetime, Status, IsConfirmed, CurrentStatus, VoucherNo, PackageCode, PackageName, RateplanCode, RateplanName, RoomTypeCode, RoomTypeName, RoomID, RoomName, Start, End, ArrivalTime, DepartureTime, CurrencyCode, TotalAmountAfterTax, Salutation, FirstName, LastName, Phone, Mobile, Email, Source, Comment, RentalInfo` — **plus three undocumented: `FolioNo`, `ExtraCharge`, `PaymentDetail`** (ride into `raw`).
  - *RentalInfo*: `EffectiveDate, Adult, Child, RoomID, RoomName, RoomTypeCode, RoomTypeName`. *Envelope*: `Reservations.Reservation`, `Reservations.CancelReservation`, `Errors.ErrorCode/ErrorMessage`. Documented wire typos are real keys: `TaxDeatil`, `IdentiyType`, `"Registration No"`.
  - **`CurrentStatus: "Confirmed Reservation"` is NOT in eZee's documented value list** — the fall-through to the `Status` verb is load-bearing; a strict reading would have marked every real booking `unknown`.
  - **BKG-02 polls carry NO `RoomID`/`RoomName`** — `physical_room_label` is always null from the poller. BKG-03 does return them.
  - **The Bookings queue is BATCHED** (a window, refilled only after ACK) and **eZee flaps** (identical requests alternate full/empty). A poll against a backlogged queue proves nothing.
- **Phone normalisation edge cases seen**: names arrive with leading/trailing spaces (`"Hae "`, `" Giles "`); OTA numbers may be absent → `guest_phone` null; **makemytrip/go-mmt mask numbers, Airbnb and Booking.com do NOT** — production held 12 real OTA guests with unmasked mobiles. Separately, the inline phone-scrub regex was eating ISO dates (`2027-01-05`) — exemption added and pinned.
- **Backfill done**: yes, once — `pnpm ezee:reconcile --apply` recovered **123** historical bookings on 2026-07-14. Shape of the gap: future arrivals 18/18 present, recent arrivals 15/18 missing.

### Website `/api/quote` client

- **Implemented**: `src/brain/tools/websiteApi.ts`. `WEBSITE_BASE_URL` on Railway and locally = `https://nistula-website.vercel.app` (from the boot summary — the preview, **not** `nistula.life`).
- **Cache/limits as specced**: concurrency 1 via a hand-rolled serial spacer, **350 ms** spacing, **60 s** cache keyed on the full query, **successful quotes only** (never 409s) — `websiteApi.ts:105-131`.
- **Price parity verified against the live site**: yes, twice. CH-05's DoD cross-checked a test-line quote against the site (`progress.md:354`). Most recently 2026-07-21 the live line returned **₹59,000 for 20–22 Dec apartments**, which Paul confirmed accurate. **BUT the villa/3BHK ids returned `villa_map_drift` 404s in the same pass** — apartment parity is verified, villa parity is broken.

### Anthropic

- **Model in use**: `MODEL_ID=claude-sonnet-4-5` — the zod default (`src/config.ts:62`); **`MODEL_ID` is NOT set on Railway**, so production runs the default. `MODEL_ID_LIGHT` unset ⇒ the summariser falls back to `MODEL_ID`.
- **Prompt caching enabled — evidence in code**: `cache_control: { type: 'ephemeral' }` on the last static head block, `src/brain/prompt.ts:334`; cache reads are read back from usage, `src/brain/claude.ts:197` (`cache_read_input_tokens`). **Cache-read tokens actually observed in production: UNKNOWN this session** (would require a prod DB read of `cost_events`).
- **Cost logging working**: `src/brain/cost.ts` writes four `cost_events` kinds (input/output/cache_read/cache_write) with INR estimates from hardcoded sonnet list prices × `INR_PER_USD = 90`. `max_tokens`/`temperature` set in `src/brain/claude.ts:121-122`.
- **Spend so far: UNKNOWN** — it lives in the production `cost_events` table, not read this session.

### Railway / hosting

- Project `nistula-assistance` (`b2967725-…`), environment `production`, service linked; healthcheck configured as code (`railway.json` → `healthcheckPath:/health`, timeout 120).
- **Env vars present on Railway, BY NAME ONLY** (listed with values discarded): `ANTHROPIC_API_KEY`, `AUTO_SEND_TYPES`, `DATABASE_URL`, `EZEE_AUTH_CODE`, `EZEE_HOTEL_CODE`, `EZEE_POLLER_ENABLED`, `LIFECYCLE_EPOCH`, `LIFECYCLE_SEND_ENABLED`, `LIFECYCLE_SOURCES`, `NODE_ENV`, `OPS_NUMBERS`, `TZ`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN`, `WEBSITE_BASE_URL` (+ Railway's own `RAILWAY_*`).
- **Absent from Railway, and each absence is load-bearing**: `STAFF_ROSTER_JSON` (⇒ **no roster in production — every task card falls back to the frontdesk lead, then to `OPS_NUMBERS[0]`**), `HEALTHCHECKS_URL` (⇒ no dead-man's switch), `MODEL_ID`, `WA_TEMPLATE_MODE` (⇒ `simulate`), `QUIET_STALE_MINUTES` (⇒ 180), `DRAFT_MODE` (⇒ default `true`, neutralised by `AUTO_SEND_TYPES`), `ADMIN_*` (⇒ admin routes unreachable in prod), all `BACKUP_*` (⇒ **no backups**), `COEXISTENCE_*`, `COST_ALERT_INR_PER_DAY`, `NIGHT_START`/`NIGHT_END`.
- Local `.env` carries a different set — notably **`STAFF_ROSTER_JSON` (2 members) but NO `OPS_NUMBERS`**; production is the mirror image.

---

## 7. Quality & security checklist — as built

| Item | Verdict | Evidence |
|---|---|---|
| Webhook signature verify | **PASS** | `src/wa/webhook.ts:105-122` (401 + counter before any parse); `src/wa/signature.ts` timing-safe; `test/wa-signature.test.ts` |
| `wa_message_id` dedupe | **PASS** | `messages.wa_message_id` unique (`schema.ts:168`); insert is ON CONFLICT DO NOTHING returning newness (`src/db/repos.ts`); `test/wa-webhook.test.ts` duplicate fixture |
| Ack-fast-work-async | **PASS** | `await reply.code(200).send()` precedes `ingest(...)` (`src/wa/webhook.ts:126-128`); all thinking is in pg-boss workers |
| Idempotent sends (send-intent) | **PASS** | `src/wa/client.ts:108-202`; `src/jobs/txSend.ts`; `test/tx-send.test.ts`, `test/send-reconcile.test.ts` |
| 24 h window — guest **and** staff | **PASS** | one chokepoint reading both sources (`src/wa/client.ts:33,226-245`; `src/db/windows.ts`; `phone_windows`); `test/wa-window.test.ts`. Closed-window free-form is refused + alerted, not silently sent |
| Rate limit + cool-off | **PASS** *(with a caveat)* | 20 msgs / 5 min per phone (`src/brain/policy.ts:19-23,42-57`), `COOL_OFF` directive + 60-turn/day cap. **In-memory — resets on deploy** (accepted decision D4) |
| Admin routes gated | **PASS** | not mounted unless `ADMIN_ROUTES_ENABLED=1` (⇒ Fastify 404); `Bearer` compared timing-safe, 401 otherwise (`src/ops/admin.ts:58-72`); `test/admin-route.test.ts`. Neither admin var exists on Railway ⇒ unreachable in prod |
| Secrets only in env + logger redaction | **PASS** | `.env*` gitignored, `.env.example` names-only (95 lines); `src/lib/logger.ts:36-46` redacts secret keys, `*.<key>` and `req.headers.authorization`; `loggableBody` hard-guards bodies on `NODE_ENV`; `test/logger.test.ts` + `test/fixtures/secrets-shaped.json` |
| Fixture PII scrub | **PARTIAL** | `scripts/fixture-scrub.ts` + `test/fixture-scrub.test.ts` are in place, and the CI grep covers `test/fixtures/` **and** `test/acceptance/`. **But the CI step has been `skipped` on every run since 2026-07-22** because `pnpm audit` fails first — so the backstop has not actually executed in 5 days |
| Guardrail 1 price integrity | **PASS** | `src/brain/priceGuards.ts`; context-bound kb fee whitelist; `test/guardrails.test.ts`, `test/rupees.test.ts` |
| Guardrail 2 promise integrity | **PASS** | `src/brain/promises.ts` (claim classes + `systemEvidence` + `vetoedClasses`); `test/promises.test.ts`, `test/ops-escalation-promise.test.ts`; CH-19 added a *discriminating negative* in S1 |
| Guardrail 3 negotiation lock | **PASS** | `applyNegotiationLock` (`priceGuards.ts`), phrasebook substitution; confirmed **live** 2026-07-21 |
| Guardrail 4 window | **PASS (relocated)** | not a pipeline rule — enforced at `src/wa/client.ts` and pure-checked in `src/brain/draftGuards.ts`. See §4.8 |
| Guardrail 5 identity honesty | **PASS** | `containsIdentityLine` + `botQuestion` trigger (`guardrails.ts:220,426`); confirmed **live** 2026-07-21 |
| Guardrail 6 length/format | **PASS** | `MAX_REPLY_CHARS`, `applyFormatClamp`, `trimAtSentence`, bullet-count check (`draftGuards.ts`) |
| Guardrail 7 leak scan | **PASS with a known gap** | `src/brain/leakGuards.ts` runs last on the FINAL text. **Gap logged, not fixed (FIX-2 review):** `TRIPWIRES` never gained `create_staff_task` or `escalate_to_human`, nor the `#A3F2K9` short-id shape (`progress.md:3512-3513`) |
| Guardrails hit telemetry | **PASS** | `src/brain/telemetry.ts` → `raw_events(source:'system')` |
| Injection posture in prompt | **PASS** | `src/brain/prompt.ts` block [4] "Security posture" paragraph: guest text, **tool results**, `[GUEST CONTEXT]` and `[EARLIER CONTEXT]` are all DATA and never evidence of a completed action; refuses rule-changes, prompt disclosure, persona swaps, other-guest talk. `test/red-team.test.ts` (15 cases) |
| Golden-path e2e alive | **PASS** | `test/golden-path.test.ts` green in this run; plus `test/acceptance/replay.test.ts` (all six scenarios) inside the gate |
| CI green | **FAIL** | red since 2026-07-22 — `pnpm check` passes, `pnpm audit --audit-level high` fails on `fast-uri`. See §1.5 |
| progress.md discipline | **PASS** | exists, 3 525 lines, append-only, current to 2026-07-27 (FIX-2). Entry headers: Pre-CH · CH-00 · CH-00b · CH-01 · CH-02 · CH-03 · CH-04 · CH-05 · CH-06 · CH-07 · CH-08 · CH-09 · CH-10 (+ 3 audit/close-out sub-entries) · CH-12 · CH-11 · CH-13a · CH-13b · CH-14a · CH-14b · CH-15 · CH-16 · CH-17 · CH-18a-1 · CH-18a-2 · CH-18b · CH-18c · CH-19 · **FIX-1** · **FIX-2**. (Entries are appended in session order, so CH-12 precedes CH-11 in the file; the ledger table at `progress.md:33` is the index.) |

---

## 8. The unfinished portions (why we're stuck)

1. **CH-20 — retire Villa B1/B3/C1/C3.** *Chunk: CH-20 (post-v1, not in plan).* **[just not done yet]** — the code is written and typechecks; ~57 test files still reference the departed villas, `docs/product-picture.md` + the acceptance harness need a dated amendment, and roster/template samples still teach `"villas":["B1","B3"]`. The original blocker (a Windows fork-spawn failure) is **gone** — the full suite ran clean this session. Everything needed is in `docs/CH-20-villa-retirement-handoff.md` on the branch, including a DO-NOT-TOUCH list.
2. **Villa-map drift / `WEBSITE_BASE_URL`.** *Chunk: CH-05.* **[needs a decision]** — the villa ids 404 live. CH-20 says the honest cause is retirement, not renumbering, so the fix is deletion, not id-hunting. The open decision is whether to bundle it with CH-20 and whether prod should point at `nistula.life` or stay on the Vercel preview.
3. **`fast-uri` HIGH advisory breaking CI.** *Chunk: CH-18a-1's audit gate.* **[just not done yet]** — patched at `>=3.1.4`; it is transitive under `fastify`. A `pnpm.overrides`/`resolutions` pin or a fastify bump closes it. Until then `main` is red and the PII guard never runs.
4. **FIX-3 — night handling for `create_staff_task`.** *Chunk: CH-14b.* **[needs info from Nistula team]** — deliberately HELD. `escalate_to_human` defers at night; `create_staff_task` has zero night awareness, so a 23:00 maintenance request fires an immediate card and an over-promising reply. Building the deferral is easy; **which kinds may defer, whether an override exists, and what a 2 a.m. water-leak guest is told is the villa team's call.**
5. **Phantom tasks / fabricated complaint narratives, and over-escalation of preferences.** *Chunk: CH-13a/CH-07.* **[technically hard + needs a decision]** — surfaced by the 25–26 Jul UAT (`docs/fix-pass-mechanical.md:16-18`). One instance is documented: a task raised off stale context whose summary was *invented* ("chased twice") when the guest had asked about a dietary preference. Linked to the **block [5] sibling leak** — `src/brain/profileBlock.ts` renders staff-authored summaries into every turn and is held back only by a prompt instruction, which this codebase has proven the model ignores. The deterministic cure changes what the model can say about a request older than the transcript window, so it was filed rather than guessed at.
6. **Evening arrivals digest.** *Chunk: post-v1 fast-follow.* **[just not done yet]** — `docs/product-picture.md` S2 promised a staff "arrivals tomorrow" line; no evening cron exists. Paul chose to strike the contract line rather than build under v1.0.0; the build spec is in `progress.md:3327-3336` (a ~17:00 IST mirror of `runMorningDigest`).
7. **Live DoD legs for CH-11/13a/13b/14a/14b/15/16.** **[needs an external account/asset]** — every one needs the same two things: **a second allowlisted WhatsApp recipient on the Meta test app**, and a **populated `STAFF_ROSTER_JSON` on Railway**. Meta test numbers can only message allowlisted recipients (4 slots free), and a staff number quiet for 24 h is unreachable by free-form, so each roster number must message the line once first.
8. **S2/S6 lifecycle sends and the template pack.** **[needs an external account/asset]** — `WA_TEMPLATE_MODE` is unset ⇒ `simulate`, so a closed-window lifecycle message **defers** and a website guest who never messaged us gets nothing. Template approval belongs to the real number's WABA, which does not exist yet. `pnpm templates:pack` generates the exact bodies to submit at cutover.
9. **CH-17's dead-man's switch.** **[needs an external account/asset]** — `HEALTHCHECKS_URL` is absent from Railway, so the healthchecks.io half of the watchdog is inert; `channel_quiet` is currently the only thing that would report a dead webhook (proven by the FIX-1 review — `ops/health.ts` stays green when Meta drops the subscription, and `ops/rollup.ts` fail-quiets on zero counters).
10. **No production backups.** *Chunk: CH-18a-2.* **[needs an external account/asset]** — `BACKUP_ENABLED` and every `BACKUP_S3_*` / `BACKUP_AGE_RECIPIENT` are absent from Railway. The runner is built and unit-tested; the restore drill plan §8 CH-18 requires has never been performed. **`BACKUP_RETENTION_DAYS` is load-bearing for DELETE_GUEST erasure completeness**, so this is a compliance gap, not just an availability one.
11. **Coexistence webhook fixtures are provisional.** *Chunk: CH-14a/CH-18b.* **[needs an external account/asset]** — `smb_message_echoes`, `history`, `smb_app_state_sync` are not subscribed and have never been captured. Handlers parse tolerantly, and §5.3 says re-verify at cutover — but the human-takeover pause, the single most trust-critical behaviour in the system, rests on a payload shape we have only read about.
12. **OQ-24: a VOIDED eZee booking may emit no event.** *Chunk: CH-10.* **[needs info from Nistula team]** — one void produced nothing in 2 h of observation. If the front desk voids rather than cancels, the mirror holds dead stays as live for ever (reservation 969 did exactly this) and we message guests about stays that no longer exist. `villaRoute` refuses to route a dead booking and pages ops; nothing else catches it.
13. **eZee "modify" wire shape is unproven.** *Chunk: CH-10.* **[needs info from Nistula team]** — eZee has no amend API; only a human using the front-desk "Amend Stay" screen can produce one. The `Modify` verb is handled in code and fixture-tested; zero `modified` rows have ever existed in production. Closure is cheap: ask the front desk to amend one booking and watch the mirror.

---

## 9. Open questions — the structured pipeline

Tagged by who can answer. "(already sent)" = present in the 84-question `.docx` / 23-question
`docs/questions-for-paul.md` that were prepared for the team and are awaiting return.

### [ARCHITECT] — design and priority

1. **Do we amend plan.md §4 to the shipped schema, or keep §4 as the intent and progress.md as the truth?** Nine columns, four enum values and one whole table now exist that §4 does not list (§4.1–4.3). Anyone planning off §4 will under-model `tasks` and `scheduled_messages`.
2. **Guardrail 2 vs the product picture: which wins?** `sla_nudge` licenses C1 ("I've nudged housekeeping") but deliberately not C2 ("on the way"); `docs/product-picture.md` S3's example line is over the guard. Either the contract doc or the claim table should move.
3. **Should `create_staff_task` inherit `escalate_to_human`'s night contract?** (FIX-3.) The engineering is a one-file change reusing the existing `night_queue` + digest mechanism; only the *policy* is open, and that half is [OPS-TEAM] below.
4. **Is the block-[5] task-summary rendering acceptable as a prompt-level mitigation, or must it become deterministic?** Removing model prose from block [5] costs the model its memory of a request older than the transcript window. This is the last open half of the FIX-2 leak.
5. **CH-20 sequencing: merge it before or after the design fixes?** It touches `src/lib/villas.ts`, the prompt, three tools and ~57 test files; every later fix rebases onto it.
6. **`v1.0.0` points at `46ed7f4`, CLAUDE.md says `ba30398`.** Re-tag, or correct the doc? (Whichever — the orientation file a new session reads first is currently wrong.)
7. **Does the acceptance contract get re-run after the content pass?** Six scenarios pass against placeholder villa copy and an empty quirks file; plan §0's final content pass says content-dependent acceptance re-runs before go-live, but no chunk owns that re-run.
8. **OQ-13/OQ-14 (planning-chat items, unanswered):** is §5.1's deposit formula authoritative, given the shipped behaviour is "never state a deposit amount"? And should §5.1's `QuoteView` / §6.4's `MIN_NIGHTS` wording be updated to the verified live API?

### [OPS-TEAM] — front desk / villa team

9. **OQ-01 (already sent) — per-villa quirks.** `kb/quirks.md` is empty on purpose; CH-06's DoD ("AC weak at night — what to do, quirk-aware") is unreachable until it is filled. One `## <Villa label>` heading per house, then plain bullets.
10. **OQ-25 (already sent) — will the villa team actually message the WhatsApp line, and how often?** A staff number quiet for 24 h cannot receive a free-form task card. Every card to it fails and the guest is (correctly) promised nothing. The entire hands-of-the-AI mechanism rests on this.
11. **FIX-3 policy — at 2 a.m., does a water leak wait until 10 a.m.?** Which task kinds may defer overnight, is there an override path, and what should the guest be told? Today the AI promises someone is coming, which is not true.
12. **OQ-22 / OQ-24 (already sent) — what does the front desk actually DO in eZee when a booking changes, and do they CANCEL or VOID?** A void appears to emit no connectivity event, so our mirror can hold a dead stay as live and message the guest about it.
13. **OQ-15 (already sent) — may we name a specific house to a guest before arrival?** The mechanism is settled (eZee's assignment is the door); the policy is not. Today the AI names no house, ever.
14. **OQ-02/03/08/09/10 (already sent) — bed configuration, bathroom counts, per-villa amenities, whether the apartments are 2BHK, whether Siolim has a pool, and whether Siolim's base occupancy of 2 adults is intended.** All feed block [3]; each unanswered one is a question the AI must defer on.
15. **FIX-2 residual — should the DONE close line be concrete again?** It is now generic per task kind ("That is done"), which sits against voice-guide §6 ("name the villa, stop"). The only guest-safe concrete source is the guest's own words (`tasks.request_key` carries the triggering message id). One-line edit once decided.

### [PAUL] — accounts, access, business calls

16. **A second WhatsApp number allowlisted on the Meta test app** (already sent, item 7 of §8). Unblocks the live DoD legs of six chunks at once. 4 slots are free.
17. **A populated `STAFF_ROSTER_JSON` on Railway** — production has none, so every task card falls back to the frontdesk lead and then to `OPS_NUMBERS[0]`. Combined with #16 this is the single highest-leverage unblock.
18. **OQ-20 / Q97 (already sent) — may we WhatsApp Airbnb and Booking.com guests?** `LIFECYCLE_SOURCES` is direct-only and fail-closed; production holds real OTA guests with unmasked numbers who currently get nothing.
19. **OQ-28 (already sent) — may a fresh pre-sales enquirer get ONE lead follow-up without prior opt-in?** Shipped fail-closed, so the feature currently reaches only opted-in returning guests.
20. **OQ-19 business half (already sent) — are Apartment 06/09/11 genuinely interchangeable?** Now sharper, not softer: after the villa retirement the apartments are the **only** multi-unit type left.
21. **OQ-18 (already sent) — the website's `/api/debug/booking/create` is still ungated and unauthenticated and writes to the live PMS.** Not our repo; their pre-launch chunk. Production shows the fingerprint (reservations 973–976 created within 0.13 s).
22. **Q91–93 (already sent) — draft mode on day one, and who approves?** `DRAFT_MODE` defaults true; today it is neutralised on Railway by `AUTO_SEND_TYPES`. If a human must approve, a second approver number is required or a guest gets silence after 30 minutes.
23. **Backup destination + `age` recipient key** — no production backup has ever been taken, and `BACKUP_RETENTION_DAYS` is load-bearing for DELETE_GUEST erasure completeness.
24. **A healthchecks.io URL** — without it the dead-man's switch does not exist and a dead webhook is reported by exactly one mechanism.
25. **Q98–101 (already sent) — may we import the existing chats on the real number, is anything on that line off-limits, and how long do we keep guest messages?**
26. **Q102–105 (already sent) — may the assistant remember an allergy, a religious dietary need, a mobility need?** Today `factScreens` refuses all three, which is fail-closed but arguably wrong for safety-relevant facts.
27. **Confirm the two CH-20 wording changes** — the reworded `PHRASEBOOK.datesUnavailable` (a now-false availability claim was removed) and the identity line's "boutique villa company in Goa" (kept; Siolim is a villa).

---

## 10. Builder's honest risk list — the five things I trust least

1. **The coexistence / human-takeover path has never met a real Meta payload.** `smb_message_echoes` is not subscribed; every fixture is built from documentation. This is the mechanism that makes the AI go silent when a human takes over — the single behaviour whose failure is most visible to a guest and most damaging to trust. It is also the one place where "handlers parse tolerantly" is a euphemism for "we do not know the shape". The CH-18b history import rides the same unverified family.
2. **The villa map is actively wrong in production right now.** `main` ships eight units; four of them were retired and removed from eZee three days ago, and their ids already 404 on the website. A guest asking about a 3BHK today gets either a 404 mistranslated as "taken" or a quote attempt against inventory Nistula does not operate. CH-20 fixes it and is 90 % written — but it is unmerged, unverified, and every hour it sits there the gap between the repo and reality widens.
3. **Model prose still reaches guests through block [5].** FIX-2 stopped the *code* from sending `task.summary` to a guest, but `src/brain/profileBlock.ts` still renders that same staff-authored, unscreened, occasionally-fabricated text into the prompt on every single turn, and the only thing stopping the model repeating it is an instruction in block [4]. This codebase's own S5 failure is the proof that prompt instructions do not hold. I would not describe this leak as closed.
4. **In-memory state that a Railway deploy silently resets.** The rate-limit window (`policy.ts`), the degraded-mode counter (`tools/degraded.ts`), the cost-meter running total, the watchdog re-warn ladder and the heartbeats are all process-local. We redeploy on every merge to `main`. The reference-attempt counter was moved to Postgres for exactly this reason and the others were not — that split was reasoned about once, per counter, and I am not confident it was reasoned about correctly in all five cases.
5. **The green suite has a documented history of hiding blocker-class defects, and this report is written on top of it.** Nine adversarial rounds found 17 blockers behind a green suite; five of those were regressions introduced by the previous round's own fix. 1791 tests passing tells us the assertions we wrote still hold — it does not tell us the assertions discriminate. CH-19 found two of its own scenario gates proving nothing at all, and FIX-1 found that the one test whose job was "the knob is honoured" would have passed with the knob ignored. Treat every "PASS" in §7 as "passes its tests", not "is correct".

*Runner-up, worth naming:* production has **no roster, no backups, no dead-man's switch and an empty `OPS_NUMBERS` risk** — an ops posture where the system's own honesty guarantee ("the team has been informed") depends on a delivery path that currently has nowhere to deliver to.

---

## 11. Suggested next three moves

1. **Unblock CI and finish CH-20 in that order** — pin `fast-uri >=3.1.4` (or bump fastify) so `main` goes green and the PII guard runs again, then resume the villa retirement from §4a of its handoff doc; the suite that blocked it runs clean now, and every later fix wants to rebase onto it.
2. **Get the second allowlisted handset + a populated `STAFF_ROSTER_JSON` onto Railway** — one ops action closes the live Definition-of-done for CH-11, CH-13a, CH-13b, CH-14a, CH-14b and CH-16 simultaneously, and it is the only thing that can move six PARTIALs to DONE without writing code.
3. **Take FIX-3 (night handling) and the block-[5] summary leak to the villa team as one scenario document** — both are blocked on the same kind of answer ("what should actually happen, and what may the guest be told"), both are currently over-promising to real guests, and Paul's standing rule says these go to the team as one framed ask rather than a trickle of guesses.
