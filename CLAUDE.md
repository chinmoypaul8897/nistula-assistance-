# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nistula Assistance** — a WhatsApp AI host (Claude as the brain) for Nistula, a boutique villa company in Goa (8 villas, eZee PMS, ~60% of bookings direct on one WhatsApp number). It will run the full guest conversation: pre-sales with live website-identical prices, in-stay requests routed to staff as tasks, automatic lifecycle messages, per-guest persistent memory, and graceful human takeover via Meta coexistence.

**Current state: CH-00 → CH-12 are DONE, merged, tagged (`vCH-00`…`vCH-12`) and LIVE on Railway (CH-09 merged via PR #27 after a 24-agent pre-push audit fixed a money BLOCKER; its live three-probe demo passed 2026-07-13 with real facts saved in the production DB).** The service takes real WhatsApp messages on the Meta test number, replies in Nistula's voice through Claude, quotes live website-identical prices via tools, answers villa/policy/FAQ questions from the compiled knowledge base (prompt block [3]), brackets every model turn with deterministic code (§6.7 policy routing before, the complete §6.5 guardrail pipeline after — every hit persisted to `raw_events`), carries §6.3 short-term memory (token-budgeted transcript window + the `[EARLIER CONTEXT]` rolling summary + the nightly 04:00 IST summariser), and now has §6.4 long-term memory: `remember_fact` saves durable guest facts behind deterministic sensitive/instruction/entitlement screens (any rate or authority claim refused fail-closed), block [5] GUEST CONTEXT renders the full profile (name + detected register/lang prefs + newest 15 facts; stays/tasks stubbed for CH-11/13), memory promises need a real save (guardrail-2 class C4 + the `fact_saved` evidence row), and `POST /admin/guest-lookup` peeks a guest's memory (bearer + flag; enabled in local dev only — Railway carries no admin vars). **CH-10 (eZee mirror) is DONE and LIVE (2026-07-13, 761 tests):** the 60s poller mirrors eZee bookings into `bookings_mirror`, ACKs only what committed, and emits `booking.*` events for CH-12. Its live run drained the property's whole un-ACKed backlog — 62 items, 0 errors — and the pre-push audit's BLOCKER (multi-room full-cancels arriving as suffixed `-1/-2/-3` entries with no bare entry) turned out to be **sitting in production waiting**. **BINDING: local `.env` NEVER sets `EZEE_POLLER_ENABLED=1`** — only Railway may run the poller, or dev would ACK-consume real bookings prod never sees (runbook §CH-10). Move secrets to Railway with **Node**, never a PowerShell pipe (it prepends a UTF-8 BOM into the stored value). BKG-20 "ReadBooking" is broken — never used; `InsertBooking` needs POST + per-night comma-separated rates (the vendor docs are wrong). Website (Internet Booking Engine) bookings **DO** reach the queue — verified end to end (booking 953: create → mirror → cancel → mirror, dates/amount verbatim). An earlier "they don't" reading was a queue-BATCHING artifact; **a poll against a backlogged eZee queue proves nothing — only test against a drained queue.** **CH-12's backlog precondition is DISCHARGED** — the `booking.*` queue was purged 85→0 at the 2026-07-16 cutover and CH-12's workers now consume it live. **Do NOT re-run the purge: `DELETE FROM pgboss.job WHERE name LIKE 'booking.%'` now destroys real arriving guests' events.** The date gate shipped on both legs (`reconcile.ts` GATE 2 + `gates.ts passesDate`), so the mirror's 123 historical bookings schedule nothing — proven live at 199 pre-epoch rows → **0**. **Next chunk: CH-13 (Staff tasks) — read the 🚨 OQ-19 section below FIRST; it blocks the task card, and plan.md does NOT know that.** `progress.md` is authoritative for exactly what exists and what each chunk learned — read it, not this paragraph, for detail.

## 🚨 OQ-19 — a guest cannot book a specific HOUSE. eZee picks it. (Found 2026-07-14, CH-11)

**BLOCKS THE WEBSITE LAUNCH. Read before touching anything that names a villa.**

eZee is configured as a **hotel**: 8 houses inside only **3 room types**, so Apartment 06/09/11 are
the SAME bookable product. `InsertBooking` therefore has **no field for a house at all** — the
website drops the guest's choice at that boundary, and **eZee auto-assigns lowest-number-first**
(reservations 953 AND 957, both "Nistula Apartment", both landed in **Apartment 06**). The website's
confirmation page then reads the house back FROM eZee — so **a guest can pay for Apartment 09 and be
told on their own receipt that they have Apartment 06.**

**CONSEQUENCE FOR THIS CODEBASE:** `bookings_mirror.physical_room_label` is **eZee's GUESS, not the
guest's house.** `stayView.TRUST_EZEE_ROOM_ASSIGNMENT = false` — **the AI speaks the villa TYPE and
names NO house.** Do not "fix" this by flipping it on because a label exists; the label is the bug.
(I hydrated 143 of them and briefly armed the AI with them — see the OQ-19 addendum in progress.md.)

**CH-13: the staff task card CANNOT be built on that label** — it would send housekeeping to the
wrong door.

**🚨 AND plan.md IS STALE HERE — THIS SECTION OVERRIDES IT.** The session protocol calls plan.md the
single source of truth, so this is the one place it is not. §8 CH-13's Context still opens
*"Villa B3 · Rahul · 2 towels"* and step 2 still prescribes a `<villa>` slot; §5.4 and §8 CH-11 step 4
still said a unit may be named once `physical_room_label` exists. **All of that is INVERTED — the
label IS the bug.** (Each is now marked SUPERSEDED in place, and `docs/product-picture.md` S3 — which
CH-19 asserts against — was amended, because it encoded "Villa B3" as the expected card.)
*(CH-12's date-filter requirement is discharged: the gate shipped on both legs.)*

**The fix is a PMS re-model, not code:** one house = one bookable product (Siolim already is, and is
the one house eZee never gets wrong). None of eZee's ~92 endpoints can create a room type — it
happens in eZee's back office. Full analysis + the eZee account-manager script: `docs/open-questions.md` OQ-19.

## 🚨 CH-12 is DONE and the system now SPEAKS FIRST (2026-07-16, `vCH-12`, 1243 tests)

Everything before CH-12 only ever *replied* to someone who had messaged us. A booking landing in
eZee now causes an **unprompted WhatsApp to a real person who never contacted this number.** That
inverts the risk, and **it is LIVE and ARMED** (`LIFECYCLE_SEND_ENABLED=1` on Railway): a real
confirmation has been sent to and read on a real phone. What holds it back is four fail-closed
gates — **epoch** (proven on production data: 199 pre-epoch mirror rows → **0** scheduled),
**date**, **status**, **source**. `WA_TEMPLATE_MODE` is unset ⇒ `simulate`, so until Meta approves
the templates a website guest who has never messaged us gets **nothing** (defers on a shut window,
skipped at 36h) — correct. **There is no manual step for you here** (plan §8 CH-12: "None now"):
template approval belongs to the REAL number's WABA, which does not exist yet, so it happens at
real-number cutover — an ops event between CH-18 and CH-19. `pnpm templates:pack` generates the
exact bodies to paste THEN.

**The fact that changes how you think about this system:** the comfortable belief that OTA phone
numbers are masked — and that OTA guests are therefore unreachable by accident — is **FALSE**.
makemytrip and go-mmt mask them. **Airbnb and Booking.com do not.** Production holds **12 real OTA
guests arriving soon, with real phone numbers**. `LIFECYCLE_SOURCES` (direct-only, fail-closed) is
the only thing standing between them and a WhatsApp nobody authorised (**OQ-20**, 🔴 unanswered).

## 🚨 THE RECURRING FAILURE CLASS reached ELEVEN — and it has TWO axes

**Nine adversarial review rounds found 17 blocker-class defects. The suite was green every single
time. FIVE were regressions introduced by the previous round's own fix** — so on this codebase *a
fix is the most dangerous thing in the room*, and an unverified one is not a fix.

> **Guard by the CONTRACT — never by the ENUM, the LIST, the CLOCK, or a MUTABLE FIELD.**

1. **The QUESTION.** What does this predicate *actually* answer — the thing its caller needs, or a
   proxy that merely coincides today? *(The sender re-used the SCHEDULING allowlist at SEND time, so
   every stay that actually happened lost its welcome, thank-you and win-back. One plan-age clock
   judged every kind, so every last-minute booking silently lost its pre-arrival — and the same rule
   also SENT "we look forward to welcoming you" to guests who had already arrived. A proxy wrong in
   both directions is the tell that it was a proxy at all.)*
2. **The VERB.** Skipping is **TERMINAL** — a resolved row is never rescheduled. So a rule may only
   SKIP on **a fact that cannot come back**; reading a mutable field it must **DEFER**, which is
   reversible. *(An arrival date mistyped for ONE MINUTE and corrected permanently cost the guest
   their pre-arrival and welcome, because the correcting event no-ops against a resolved row.)*
   **Choose the verb the contract can survive being wrong about.**

**And the test that "covers" it may be the reason it shipped.** The proof that last-minute
pre-arrivals send was deleted and replaced with one asserting `sendAt < NOW` — *due*-ness, not
outcome. Due, yes; sent, no. **Assert the OUTCOME, and drive the REAL event path
(`handleBookingEvent`), never `runSender` directly.** A suite that reads the wall clock is lying
too: the guest-quiet window turned `main` red ten hours a night while looking green at 6 p.m.

## Session protocol (mandatory — from plan.md §0)

[plan.md](plan.md) is the **single source of truth** for the build; [progress.md](progress.md) is the session-memory layer. Every build session:

1. Read plan.md §1–§3 fully (project brief, system overview, global engineering rules).
2. Read progress.md top to bottom — the chunk ledger says what's done; entries record what past sessions learned (observed payload field names, decisions, open questions).
3. Open your assigned chunk in plan.md §8 and build ONLY that chunk. Do not start the next one; do not refactor other chunks' code unless told to.
4. Skim only the reference sections your chunk points to (§4 data model, §5 external contracts, §6 AI design).
5. Finish by appending a progress.md entry using the §9 template, updating the chunk ledger table, then commit and stop.
6. If anything is ambiguous or a decision is missing: **do not improvise.** Write it under "Open questions" in progress.md and stop — Paul takes it back to the planning chat.

## ⚑⚑ Standing decision (Paul, 2026-07-13) — build the tech first, ask the business ONCE

Questions about **how the business actually works** keep surfacing mid-build (a fee nobody
published, a process nobody wrote down, a villa fact only the team knows). Paul has named the root
cause: **the tech side does not have transparency into the business.** It is structural, it will
keep happening, and guessing harder will not fix it.

**The rule:**
1. **Build the tech first.** A missing *business* answer NEVER stops a chunk. Ship a **fail-closed
   default** — the AI refuses, defers, or brings the team in. Never invent, never guess into a
   guest's face.
2. **Log the question in [`docs/open-questions.md`](docs/open-questions.md) immediately**, with the
   four things that make it answerable: *what we need to know · why it matters to a real guest ·
   what we shipped meanwhile · what changes once they answer.*
3. **Ask once, at the end.** When engineering is complete, that register becomes ONE properly-framed
   document for the villa team / front desk / owner — not a trickle of half-questions.
4. Then the content pass: answers land, the KB rebuilds, fail-closed defaults become real rules,
   content-dependent acceptance re-runs before go-live.

**Still stops a session (plan §0, unchanged):** a missing *engineering* decision or *external API
contract*. Those are ours — read the authoritative reference, probe, or ask Paul. Different animal
from "what does the business actually do?".

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
