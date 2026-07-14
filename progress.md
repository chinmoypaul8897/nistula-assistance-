# progress.md — Nistula Assistance · Build Log

> **The session-memory layer.** Every chunk session: read plan.md §1–§3 first, then this file top to bottom, then your assigned chunk in plan.md §8. Every chunk session ENDS by appending an entry here using the plan.md §9 template. If it's not written here, the next session doesn't know it happened.

## Status

- **Current chunk pointer:** CH-12 (Lifecycle engine) — 🟡 **BUILT 2026-07-14, NOT DONE.** `pnpm check` green at **1205 tests**. **Nothing is deployed and no message has been sent.** Outstanding: (1) purge the production `booking.*` backlog — **83 at last measure, it grows daily, RE-MEASURE**; (2) set `LIFECYCLE_EPOCH` on Railway (Node, never a PowerShell pipe); (3) the live demo; then merge + tag `vCH-12`. **🚨 THE FINDING THAT MATTERS: the belief that OTA phone numbers are masked, and OTA guests therefore unreachable by accident, is FALSE.** makemytrip and go-mmt mask them; **Airbnb and Booking.com do NOT.** Production holds **12 real OTA guests arriving soon with real, unmasked numbers** — so `LIFECYCLE_SOURCES` (direct-only) is the only thing between them and an unauthorised WhatsApp (OQ-20 🔴). **The '123 historical bookings' scare is mostly self-neutralising** for a reason nobody had written down: CH-11's reconcile hydrated them via `FetchSingleBooking`, which returns `checked_out`, and the status gate already excludes those — only **2** rows are live-status AND historical. **A 5-lens adversarial review found 8 blocker-class defects in code whose suite was green**, the worst being the recurring failure class for the SEVENTH time: the sender re-used the SCHEDULING status allowlist at SEND time, so every stay that actually happened (`checked_in`/`checked_out`) lost its welcome, thank-you and win-back — permanently. All fixed and pinned. Read the CH-12 entry before touching anything. **CH-11 (Booking awareness) DONE 2026-07-14 — merged to `main`, tagged `vCH-11`, live demo PASSED.** **CH-11 (Booking awareness) DONE 2026-07-14 — merged to `main`, tagged `vCH-11`, live demo PASSED.** `pnpm check` green at **998 tests** (763→934 build, →957 pre-push audit, →963 pre-merge review, →977 website audit, →982 OQ-19 fix, →998 close-out audit). The brain now sees a guest's bookings: they link on the first inbound turn, project through `stayView.ts` (the ONE door from a booking row to words), and reach the model as block [5] stays + a block [6] stage. `get_booking` takes ONE argument and verifies a reference claim against the guest's OWN typed words. **🚨 THE HEADLINE FINDING: `bookings_mirror` is a CHANGE FEED, not the property's booking book** — it holds only what eZee's queue happened to contain on 13 Jul, so a real in-house guest whose booking predates the poller is staged a LEAD and gets sold the villa they are standing in. `pnpm ezee:reconcile` (BKG-05 ArrivalList, print-only unless `--apply`) measures the gap and hydrates it. Run in production it found **21 of 144** bookings held — but the SHAPE was the point: **future arrivals 18/18 present (0 missing), recent arrivals 15/18 MISSING.** The poller is not losing bookings; the mirror captures them by when they were CREATED, not when the guest ARRIVES. `--apply` recovered 123. **🚨 THE SECOND FINDING — OQ-19, and it blocks the website launch: a guest cannot book a specific HOUSE. eZee holds 8 houses inside 3 room TYPES, so `InsertBooking` has no field for a house at all; eZee auto-assigns lowest-number-first (bookings 953 AND 957 both landed in Apartment 06), and the website's confirmation page then reads eZee's pick back and prints it. A guest can pay for Apartment 09 and be told on their own receipt they have Apartment 06.** So `physical_room_label` is **eZee's GUESS, not the guest's house**: `stayView.TRUST_EZEE_ROOM_ASSIGNMENT = false`, the AI speaks the villa TYPE and names no house, and **CH-13's task cards are BLOCKED on the OQ-19 re-model, not on hydration**. (I hydrated the 143 labels and briefly armed the AI with them before OQ-19 was understood — see the retraction and the OQ-19 addendum in the entry.) **Live demo PASSED** (runbook §CH-11): three probes on the test line, plus a real eZee booking created → mirrored → cancelled → mirrored, and the OQ-19 fix proven live (the production DB held "Apartment 06"; the AI still refused to name it). **⚠️ ONE LEG WAS NOT RUN LIVE, and is NOT claimed as passed: the stranger-refusal probe** (a DIFFERENT phone claiming someone else's booking reference → the byte-identical refusal + a strike). Meta test numbers can only message allowlisted recipients, so it needs a second allowlisted number Paul does not currently have. It is covered in CI (all six failure paths return the same constant) and asserted in the DB, but **it has never been exercised over the real WhatsApp path** — the one place a leak would actually land. Carry it into the next live-demo window. **CH-10 (eZee mirror) DONE 2026-07-13 — merged via PR #30, tagged `vCH-10`, CI green on main, LIVE on Railway; a close-out audit then fixed 2 more DEFECTs (PR #32).** `pnpm check` green at **763 tests** (667→752 build, →761 pre-push audit, →763 close-out audit). The poller drained the property's entire un-ACKed backlog in three polls — **62 real items mirrored and ACKed, 0 errors, 0 ops alerts** (22 confirmed stays across Airbnb/Booking.com/makemytrip/go-mmt/Walk-in + 40 cancel tombstones). **Website (Internet Booking Engine) bookings DO reach the queue** — verified end to end on booking `953` (create → mirror → cancel → mirror, dates/amount verbatim); an earlier "they don't" reading was a queue-BATCHING artifact and is retracted. **The pre-push audit's BLOCKER was real and waiting in production:** two genuine multi-room full-cancellations (`877-1/-2/-3`, `894-1/-2/-3`) arrive as suffixed entries with no bare entry. **Env (Railway):** `EZEE_HOTEL_CODE`/`EZEE_AUTH_CODE` + `EZEE_POLLER_ENABLED=1` are SET (byte-exact — a PowerShell BOM corruption was caught by the length check; move secrets with **Node**, never a PS pipe). **The split-brain rule is BINDING: local `.env` NEVER sets `EZEE_POLLER_ENABLED=1`** — a dev poller would ACK-consume real bookings the production mirror never sees (runbook §CH-10).
- **🚨 CH-12 HARD PRECONDITION (do this FIRST, before mounting any `booking.*` worker):** production's `pgboss.job` holds **~70 un-consumed `booking.*` jobs and the number GROWS EVERY DAY the poller runs — do NOT trust a figure written here; MEASURE it when CH-12 starts.** (62 at CH-10's close-out → 67 → 70 on 2026-07-14.) — **25 `booking.created` + 42 `booking.cancelled`**, measured 2026-07-14. (Was 62 at CH-10's close-out; the poller kept running and mirrored more. **The CH-11 `--apply` reconcile added 123 mirror rows and left the count at exactly 67** — the "hydration emits no events" invariant, verified in production, not just in tests.) The moment CH-12 registers workers on those queues they ALL fire — which would schedule confirmation/pre-arrival messages for bookings that are months old or already cancelled. **CH-12 must purge or date-filter the pre-existing jobs before its workers go live** (`DELETE FROM pgboss.job WHERE name LIKE 'booking.%' AND state='created'`, or gate the handler on `check_in >= today`). **🚨 AND PURGING THE JOBS IS NOT SUFFICIENT — CH-11's reconcile added 123 HISTORICAL bookings to `bookings_mirror` (arrivals going back months).** The mirror — not the event stream — is CH-12's source of truth (§3.4); the events are only wake-ups. So CH-12's **hourly sweep reads those 123 rows straight out of the mirror and re-creates the work you just deleted**: a purge alone would be undone within the hour, and guests whose stay ended in March would get a pre-arrival message. **The date gate on BOTH the handler and the sweep (`check_in >= today`) is therefore mandatory, not an optimisation** — it is the only defence that survives the sweep. **CH-09 (Long-term memory) DONE 2026-07-13 — merged via PR #27 (`eecbe35`), tagged `vCH-09`, CI green on main, live demo PASSED on the test line** (deployed branch saved two real facts — early-check-in preference + a 21 Aug anniversary; recall worked; the diabetic probe stored NOTHING, `sensitive_rows: 0` verified in the production DB; `guest prefs updated langPref="en"` in prod logs is the CH-09 detection fingerprint; close-out addendum in the entry). `pnpm check` green at **667 tests** (492→630 build, →667 after the pre-push audit fixes — a 24-agent workflow whose 6 serious findings, incl. a money BLOCKER in the entitlement screen, were ALL confirmed and ALL fixed; see the audit addendum). The brain now has §6.4 long-term memory: `remember_fact` saves durable guest facts into `guest_facts` (migration 0004) behind DETERMINISTIC save-time screens (sensitive / instruction-shaped / entitlement — code-side per the CH-07 red-team principle, Paul-approved; any ₹ figure inside a fact is refused outright), naive dedupe and a 50-cap eviction (expired → context → preference → celebration → past_issue, oldest first); block [5] GUEST CONTEXT is the FULL profile (name + register/lang prefs + newest 15 facts grouped by salience, DATA + non-evidence framed, framing in the leak-scan corpus, `remember_fact` a tripwire); cheap post-turn heuristics are the FIRST writers of `guests.register_pref`/`lang_pref`; memory PROMISES ("I've made a note") need a real successful save — the new guardrail-2 class **C4**, the first `TOOL_CLAIMS` registration, licensing C4 ONLY; and the repo's first admin surface `POST /admin/guest-lookup` (phone in the BODY, timing-safe bearer, counted `admin_auth_failed` alerts) mounts only when `ADMIN_ROUTES_ENABLED=1`, with a boot guard refusing the flag without a ≥16-char token. **Local real-model demo PASSED end to end** (fact saved with message provenance + a warm in-voice reply — after two demo-found fixes, see the entry; recall probe answered from memory; the diabetic probe REFUSED with zero rows and an honest no-store reply; admin 401/200; a live register_pref flip). **CH-08 (Short-term memory) BUILT 2026-07-12** on `chunk/CH-08-short-term-memory` — `pnpm check` green at **492 tests** (453→492) after the Paul-requested 27-agent post-build audit (5 lenses + skeptics + critic — all confirmed findings fixed pre-merge; see the audit addendum). The brain now has §6.3 short-term memory: a token-budgeted transcript window (≤30 msgs / ~6k tokens NET of the summary block), block [5]-lite GUEST CONTEXT + the `[EARLIER CONTEXT]` rolling summary (both untrusted-DATA framed, non-evidence for guardrail 2), a nightly 04:00 IST summariser (idle >6h, >20 unsummarised → `MODEL_ID_LIGHT ?? MODEL_ID`, append-compacted under an advance-once CAS) plus the on-demand overflow path with hysteresis, and the CH-06/07 forward pointer closed (`knowledge` threaded through `TurnDeps` — the loadKnowledge() singleton is gone from the turn path). Guardrail-2 evidence got its own indexed query (fixes the CH-07 burst-horizon gap, Paul-approved). **Local 40-message demo PASSED with the real model** (summary carried "tenth wedding anniversary"; the probe recalled it from OUTSIDE the live window). **Merged via PR #24 (`a7d6327`), tagged `vCH-08`, auto-deploy verified (/health uptime reset), and the light live probe PASSED on the test line (Paul, 2026-07-12) — Definition of done fully met.** **CH-07 (Policy engine + full guardrails) DONE** on `chunk/CH-07-policy-guardrails` — `pnpm check` green at **441 tests** (289→441). §6.7 is now deterministic CODE (`brain/policy.ts`: human-request skip-model, complaint must-escalate, the §3.3 cool-off with an id-keyed rate window, caption-aware media fallback, human-active silence), and the §6.5 pipeline is COMPLETE: guardrails 2 (class-based promise integrity — completed-action/dispatch claims need real evidence; a team-referral ESCALATES to make itself true), 4 (24h window derived from the newest batch message — the conversation column is stale pre-claim), 5 (strict full-line identity), 6 (length/format clamps) and 7 (leak scan over the instruction blocks — NOT the KB — plus phone/id patterns) joined 1+3, with every hit persisted to `raw_events` (`source='system'`, Paul-approved §4 deviation; full draft + guestPhone in the payload, `processed=true`). Three latent bugs found and fixed on the way: a LIVE money hole (`₹1.4 lakh` extracted as `1` and matched loose backed integers — a fabricated lakh price would have been sent), the stale-window operand that would block every returning guest once sends were gated, and captioned media being told "mind typing it?". The interim ops escalation now writes claimable `contextKind:'ops_escalation'` evidence rows (the CH-13 convention) and fires BEFORE guest dispatch. Local signed-POST demo verified end to end (human request → exact phrasebook line + evidence row + policy telemetry). A four-agent **post-build audit** (Paul-requested) then attacked every decision against the committed code — 7 fixes landed (see the audit addendum in the CH-07 entry), `pnpm check` green at **453 tests**. **Live three-probe demo PASSED against the deployed CH-07 build (2026-07-12) — Definition of done fully met** (deploy + demo details in the entry's post-deploy addendum). **CH-06 (Knowledge base) DONE** on `chunk/CH-06-knowledge-base` — `pnpm check` green at **289 tests**; `pnpm kb:build` compiles `kb/villas.md`/`policies.md`/`faq.md` from curated `kb/source/*` (+ the RoomTypeList occupancy snapshot), block **[3] KNOWLEDGE now ships inside the cached prompt head** (~**2573 tokens**, budget 6000, version `cb4f0950`), and the guardrail-1 fee exemption is wired — **context-BOUND**: each published fee carries the fee terms of its own sentence, so "an extra adult is ₹1,500" may be sent with no tool call while "Villa B3 is ₹1,500 per night" is still BLOCKED (§6.5's second clause). The AI now answers villa/policy/FAQ questions from the KB; stay prices still come only from `get_quote`. Quirks ship as a template + **labelled placeholder** B3/Apartment-11 notes (real villa-team content = OQ-01, final content pass). **A 7-lens adversarial review ran pre-push and found a real money-guardrail hole (a flat `number[]` whitelist let a fabricated nightly rate through) plus two invented KB claims — all fixed before merge; see the review addendum in the CH-06 entry.** **Paul's live phone demo PASSED (2026-07-12) — Definition of done fully met.** **CH-05 (Price tools) DONE** on `chunk/CH-05-price-tools` — `pnpm check` green at **260 tests**; the brain now has `get_quote`/`get_availability`/`get_booking_link` behind a ≤5-round tool loop, price-integrity + negotiation guardrails, and degraded-mode; the live `/api/quote` shape was cross-checked against the vercel preview (EXACT match, incl. the live `available:false`-on-200 case) and `WEBSITE_BASE_URL` is now boot-required (dev value in local `.env`). Remaining acceptance: Paul's live phone demo (price question → exact preview quote) as the post-merge confirmation. **CH-04 (Brain v1 — voice) DONE — merged to `main` (merge commit `901c04e`, PR #9, CI green Node 22 + 24), tagged `vCH-04`, and deployed live to the test service (`/health` ok).** `pnpm check` green at 188 tests; a live Anthropic integration smoke passed (voice on-target, price deferred with no invented ₹, static prompt head caches — 1655 tokens written on msg 1, read back on msg 2). The service now REPLIES in Nistula's voice instead of echoing; no tools yet, so every factual/price/availability question is deferred (correct until CH-05). **`ANTHROPIC_API_KEY` is required at boot from CH-04** (set in local `.env` + Railway, live-validated). **Remaining acceptance: Paul's live 10-message phone demo on the test line as the post-merge confirmation** (runbook has the red-team probe). CH-00/CH-00b/CH-01/CH-02/CH-03 also merged and tagged (`vCH-00`…`vCH-03`).
- **LIVE on Railway (2026-07-10):** service `nistula-assistance-` (trailing hyphen is the real service name) at **`https://nistula-assistance-production.up.railway.app`**, `/health` healthcheck gate via committed `railway.json`. Meta webhook wired end-to-end: callback verified, `messages` field subscribed, and the **WABA-level `subscribed_apps` link created via API** (the dashboard never creates it — see CH-02 entry). Live round trip proven: guest message → DB → `sendText` reply → phone; statuses walked the rank lattice; dedupe replay was a no-op. **Auto-deploy from main: ON and PROVEN (2026-07-11, Paul-authorized, done via CLI):** the repo had simply been DISCONNECTED from the service (research vs Railway docs: `railway up` never pauses triggers; old deployments' branch metadata is "from the last build, not proof of active connection"). Reconnected with `railway service source connect --repo chinmoypaul8897/nistula-assistance- --branch main --service nistula-assistance-` — connecting immediately auto-built and shipped main head (`eec8b0f`) to SUCCESS, which IS the live verification; every merge to main now ships itself behind the `/health` gate, no more post-merge `railway up`. Railway CLI service link persisted in-repo 2026-07-11 (`railway service` — without it, service-less CLI calls hang on an interactive picker). Stray project `fantastic-motivation`: DELETED via `railway delete` 2026-07-11 (Paul-authorized); Railway grants a 48h grace window (`deletedAt: 2026-07-13`) so it lingers in project lists until then — nothing left to do.
- **Env values (2026-07-11):** local `.env` holds `NODE_ENV=development`, `PORT=3100` (3000 is owned by another local project), `DATABASE_URL` → local docker Postgres, all four WA values + `ANTHROPIC_API_KEY`. Railway service variables hold the four WA values + `NODE_ENV=production` + `TZ` + `ANTHROPIC_API_KEY` (set via the CH-02 stdin-script pattern — values never transit chat/shell history; token rotation reuses it; the key travelled clipboard → in-process script → both stores, validated 200 against `GET https://api.anthropic.com/v1/models`, Railway value VERIFIED, clipboard cleared, script deleted). `WA_VERIFY_TOKEN` ROTATED 2026-07-10 after Meta's handshake wrote it into pre-fix request logs (logging fixed same session; Meta still holds the OLD token and only needs the new one at the next webhook-config edit — paste from `.env` then). Test number `+1 555-179-8672`; WABA ID `1377084767847948`. **CH-09 addition (local `.env` ONLY):** `ADMIN_ROUTES_ENABLED=1` + a generated `ADMIN_BEARER_TOKEN` for dev poking — Railway does NOT carry them; production admin stays disabled unless actively debugging (runbook §CH-09).
- **Standing dev workflow (CH-02 decision D8):** Meta's callback points permanently at the Railway domain — no tunnels, ever. Daily iteration = fixtures + signed local POSTs; end-of-chunk live demo = `railway up` the chunk working tree PRE-merge (doubles as env-completeness check); merge → auto-deploy ships identical content. Binding topology rule (D2): EVERY outbound anywhere goes through `wa/client.ts` `sendText`.
- **How to run:** `docker compose up -d postgres` → `pnpm dev` (migrations apply at boot) → `GET http://localhost:3100/health`. Gate: `pnpm check` (typecheck + lint + tests incl. DB suite). CI runs the same on Node 22 + 24 with a postgres service container.
- **Open-questions register:** all human-answerable inputs (villa-team quirks, missing fees, the deposit-model decision, facts to confirm) live in [`docs/open-questions.md`](docs/open-questions.md) as **OQ-01…OQ-14** — Paul fills answers there; the KB export they feed is `nistula-kb-export/`.
- **⚑⚑ STANDING DECISION (Paul, 2026-07-13) — BUILD THE TECH FIRST; ASK THE BUSINESS ONCE, AT THE END.**
  Paul named the root cause of a pattern that has bitten repeatedly: **the tech side does not have
  transparency into the business**, so questions about how Nistula actually operates (a fee nobody
  published, a process nobody wrote down, a villa fact only the team knows) keep surfacing mid-build.
  It is structural, it will keep happening, and guessing harder will not fix it. **The rule:** (1) a
  missing BUSINESS answer NEVER stops a chunk — ship a **fail-closed default** (the AI refuses, defers,
  or brings the team in; it never invents); (2) log the question in [`docs/open-questions.md`](docs/open-questions.md)
  IMMEDIATELY, with the four things that make it answerable — *what we need to know · why it matters to
  a real guest · what we shipped meanwhile · what changes once they answer*; (3) when the engineering is
  done, that register becomes **ONE properly-framed document** for the villa team / front desk / owner —
  not a trickle of half-questions over months; (4) then the content pass: answers land, the KB rebuilds,
  the fail-closed defaults become real rules, and content-dependent acceptance re-runs before go-live.
  **Unchanged (plan §0):** a missing ENGINEERING decision or EXTERNAL API CONTRACT still stops the
  session — those are ours to resolve (read the authoritative reference, probe, or ask Paul). That is a
  different animal from "what does the business actually do?". **Why this is safe:** every unknown in
  the register is already sitting behind a guard in the code. The system is HONEST today; the answers
  make it BETTER, not CORRECT — so we are never blocked, and the team is never rushed.
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
| CH-07 | Policy + full guardrails | ✅ DONE 2026-07-12 | [↓](#ch-07--policy-engine--full-guardrails--done-2026-07-12) |
| CH-08 | Short-term memory | ✅ DONE 2026-07-12 (PR #24, vCH-08; audit + live probe passed) | [↓](#ch-08--short-term-memory-transcript--rolling-summary--built-2026-07-12) |
| CH-09 | Long-term memory | ✅ DONE 2026-07-13 (PR #27, vCH-09; audit + live demo passed) | [↓](#ch-09--long-term-memory-guest-facts--profile-block--built-2026-07-12) |
| CH-10 | eZee mirror | ✅ DONE 2026-07-13 (audit + live run: 62 real items mirrored) | [↓](#ch-10--ezee-mirror-poller--normalisation--built-2026-07-13) |
| CH-11 | Booking awareness | ✅ DONE 2026-07-14 — merged, tagged `vCH-11` (998 tests; live demo PASSED; §5.4 **INVERTED** — the AI names NO house at all, see 🚨 OQ-19) | [↓](#ch-11--booking-awareness-the-guest--booking-bridge--built-2026-07-13) |
| CH-12 | Lifecycle engine | 🟡 BUILT 2026-07-14 (1205 tests; a 5-lens review found and fixed 8 blockers) — **live demo + backlog purge OUTSTANDING** | [↓](#ch-12--lifecycle-engine-scheduler--templates--window-aware-sender--built-2026-07-14) |
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

**Open questions:** none blocking. Content inputs stay in [`docs/open-questions.md`](docs/open-questions.md) for the final content pass — CH-06 consumes them the moment they land: **OQ-01** (real quirks → replace the placeholders), **OQ-04/05/06** (deposit / pet / late-checkout figures — see the ⚠️ below), **OQ-07** (breakfast EP/CP), **OQ-08/09/11** (bedroom counts, Siolim pool, real villa copy → refresh `kb/source/website-content/` by re-running the export). Ritual after ANY kb edit, including a quirks edit: **`pnpm kb:build`** — it re-checks the budget, regenerates the files and prints the new version hash.

> **⚠️ Landing a fee figure (OQ-04/05/06) is NOT a content-only edit.** An earlier draft of this entry said the figures "flow into the guardrail whitelist automatically" — that was wrong and dangerous, and the pre-push review caught it. Three things must move together (full detail on OQ-04): (1) write it in `kb/source/website-content/policies.md` **with the ₹ symbol**, in a sentence that **names the fee** ("a refundable **security deposit** of ₹X…") — the exemption is bound to those words, a symbol-less `INR 10,000` is not matched at all, and a figure in an unnamed sentence can never be stated; (2) for the deposit, also remove `prompt.ts` block [4]'s hardcoded "Never state a deposit amount", or the model keeps refusing while the figure sits unused; (3) re-run `pnpm kb:build` and confirm the guardrail forward-guard still BLOCKS that same amount when claimed as a nightly rate.

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
- `src/lib/villas.ts` occupancy and `kb/source/roomtypes.json` are two unreconciled copies; a cheap equality test would close it (CH-07). *(Closed in CH-07: `test/villas-occupancy.test.ts`.)*

---

### CH-07 · Policy engine + full guardrails — DONE 2026-07-12

*(`pnpm check` green at **441 tests** (289→441, +152) on `chunk/CH-07-policy-guardrails`, 14 commits. The chunk plan was adversarially reviewed by 3 agents BEFORE building (money/guardrails · policy/worker · schema/telemetry) — the review found four real defects in the v1 plan, all fixed below; Paul pre-approved the two product decisions the same day (the §4 `'system'` enum + full-draft telemetry payload; the cool-off line wording). Local signed-POST demo verified end to end. **Remaining acceptance: Paul's three-probe live demo on the test line (script in runbook §CH-07) — add the result here when done.**)*

**Built:**
- **`src/brain/policy.ts` + `src/brain/inbound.ts`** — §6.7 as deterministic code. `decidePolicy` routes, in order: `COOL_OFF` (§3.3's 20 msgs/5 min; an **id-keyed** in-memory rate window so pg-boss retries/re-checks/sweeper wakes can never double-count a guest into a false cool-off; module constants per the CH-03 D4 precedent) → `HUMAN_ACTIVE` (§6.7 line 1, dormant until CH-14 writes the columns; the TTL wins over the status when present) → `HUMAN_REQUEST` (the §6.7 token list tightened WITHIN its letter — bare `baat` is not shipped, "koi baat nahi" is a happy guest; bot-questions are stripped first so "human or bot?" stays an identity question) → `COMPLAINT_SUSPECT` (sentiment alone; stay-context stubbed `unknown` + `TODO(CH-11)`) → `MEDIA_FALLBACK` (**caption-aware**: a captioned photo routes like text; media-only means no body, no caption, no location) → `NORMAL`. `settlePlanFor` maps directives to the worker's settlement plan (phrasebook KEYS — policy.ts stays a leaf; guarded status transitions; announce-on-edge). inbound.ts carries the shared caption/location/sanitise helpers the transcript mapper also uses.
- **The §6.5 pipeline, complete** (guardrails.ts orchestrates; pure checks in leaf modules priceGuards/promises/draftGuards/leakGuards/rupees): negotiation substitution first, then price + promise + identity + length pooled into **ONE shared regenerate** with a combined nudge; two strikes → price defers with the rate line, promise-only with the team line (both escalate, so both lines are true); identity substitutes the full approved line (defer WINS over the substitution); length falls back to a sentence-boundary trim; the deterministic format clamp (headers stripped, `!`→`.`, INR flagged) runs on the FINAL text and **re-runs the pure checks on any mutation**; the leak scan runs LAST — block, no regenerate, substitute the team line (night variant after hours), escalate.
- **Guardrail 2 is class-based, not tense-based** (review decision — the claim's OBJECT matters): C1 completed actions and C2 dispatch-in-motion need hard evidence (a successful tool run registered in `TOOL_CLAIMS` — ships EMPTY; or a claimable `sender:'system'` row since the guest's previous message, `raw.contextKind` per CH-02 D5); C3 team-referrals ("let me bring them in") are what block [4] TELLS the model to say, so an unlicensed referral **escalates to make itself true** — never regenerated away from escalating. The empty-draft `outsideKnowledge` substitution now escalates through the same scan (closing a shipped unbacked promise). A must-escalate turn is asserted to never leave without an escalation (load-bearing when CH-14 makes escalation a model-called tool).
- **Telemetry (CH-07 step 4):** migration `0003` appends `'system'` to `raw_event_source` (Paul-approved §4 deviation; DDL-only with the 55P04 WHY comment); `brain/telemetry.ts` writes every guardrail/policy hit to `raw_events` — `event_type 'guardrail'|'policy'`, **`processed: true`** (the `processed=false` set is CH-18b's re-drive set, CH-02 D6), payload `{rule, action, draftHash, draft, conversationId, guestPhone, details}` (full draft for §6.5's weekly review; guestPhone is the CH-18 scrub key; logs carry only the hash, §3.3). Injected via `GuardrailDeps.record`, best-effort like logCost. Policy hits record non-NORMAL directives only; cool_off once per transition edge.
- **`rupees.ts` hardening (`fix` commit — the CH-05 deferrals):** multipliers now apply BEFORE integerisation (`₹1.4 lakh` was extracting as **1**); Rs/INR/rupees prefix+postfix and lakh/lac/crore forms extract; bare integers count when their own SENTENCE carries a price cue (≥200 floor; unit/year/month exclusions; URL/ISO-date/day-range/clock masking); "34k"/"₹34k" (never before a screen word); Indian digit grouping matches whole (`1,40,000`), and grouped/decimal tails can never re-enter as bare integers. The context-bound fee exemption untouched.
- **Worker restructure:** `claimConversationTurn` gains an optional guarded `status = CASE …` transition riding the SAME atomic UPDATE (never clobbers a CH-14 `human_active`) and returns `{claimed, status}`; `claimed` is tracked apart from `intentId` so store-only paths claim without an intent; the once-only cool-off line gates on the reported status edge; policy lines send as `sender:'ai'` (system rows are transcript-invisible — the model must see what it said); `escalateToOps` generalised with a typed reason, fires **BEFORE guest dispatch**, carries the sanitised guest-text tail on the ops card ("they have the full picture" must be honest) and writes the claimable `contextKind:'ops_escalation'` evidence row; **guardrail 4 gates EVERY guest-bound send** on `isWindowOpen(newestBatchMsg, now)`.
- **Prompt:** `PHRASEBOOK` gains `coolOff` (Paul-approved wording), `mediaFallback`, `outsideKnowledgeNight`; `REGISTER_EXEMPLARS` + `LEAK_SCAN_SOURCES` exported single-source for the leak scan; block [6] gains the must-escalate and unviewable-media lines; block [4] gains one complaint-posture sentence. The cached head text of [1][2][3] is unchanged; [4]'s one-sentence change costs one cache re-write on first deploy.
- **Tests 289→441:** policy directive table (Hinglish negatives, caption routing, retry-refeed idempotency, cool-off once-only, human-active no-clobber) · promises battery (incl. the primed register exemplar and the CH-13 seams) · draft-guards (the 23h59-vs-24h01 edge) · leak-guards (positives + the load-bearing negatives: booking links, own-number spellings, KB answers) · **the 21-case red-team pack** (worst-case-draft principle: the mocked model COMPLIES with every attack and refuses to correct — the deterministic layer alone must stop it) · the CH-05 deferred coverage (5-round cap, regenerate→defer→escalate e2e, degraded through a full turn) · the villas↔roomtypes occupancy pin · telemetry row contract. runbook.md gains the weekly guardrail review (query + what to look for + the PII/scrub contract) and the three-probe live demo script.

**Decisions made while building** (the two product calls Paul-approved 2026-07-12 via AskUserQuestion; the rest are review-settled engineering, recorded):
- **`'system'` as the raw_event_source value** (not 'brain'/'guardrail') — `source` answers "which system produced this payload"; `event_type` discriminates; CH-16's quality report reuses it with zero further migrations.
- **Full draft text + guestPhone in the telemetry payload** — §6.5's "logged with the draft" wins over CH-07 step 4's `draftHash`-only recap (a hash makes the weekly review blind); §3.3-compliant (bodies in Postgres only); guestPhone makes CH-18's phone-keyed scrub find these rows after the guest/conversation rows are gone.
- **Guardrail 2 by claim class** (C1/C2/C3) rather than tense: "housekeeping is on their way" must fail even on an escalation turn (an ops ping does not put housekeeping in motion), while perfect-tense referrals are honest once the worker escalates before dispatch.
- **Guardrail 5 ships §6.5's strict letter** (full normalised line) over CH-07 step 3's "contains 'Nistula Assistance'" — the substring passes the injected lie "Nistula Assistance — a real human team". In-plan conflict recorded for the planning chat. Consequence: bot-questions converge on the exact approved line.
- **The leak scan shingles blocks [1][2][4] only — never [3]** (kb content is guest-shareable by design; shingling it blocks every correct policy answer) minus the approved verbatim corpus (phrasebook + register exemplars); the phone scan URL-masks first (booking links carry 19-digit villa ids) and exempts ONLY the guest's own number; deliberately no bare-"Claude" tripwire (guest-name collision).
- **`backedAmounts` stays a loose all-numbers collection** — a price-field allowlist silently loses backing on the next QuoteView shape drift (§5.1 already drifted once) and then false-blocks every quote; the ≥200 draft-side floor removes the small-integer exposure at the gate that matters.
- **Escalations fire before guest dispatch** and the plan's reason wins over the guardrails' (a complaint that also defers a price pings ops exactly once).
- Conservative interim behaviours: closed window ⇒ silence + alert (never a throw — unfixable condition); cool-off under human-active ⇒ store-only with no line and no status write; media fallback's "frontdesk task" is an ops notify + `TODO(CH-13)`.

**Observed reality:**
- **The ₹-laundering bug was LIVE:** `extractRupeeAmounts('₹1.4 lakh')` returned `1` (toInt split on '.' before any multiplier) and `1` is nearly always in the loose backed set (`adults: 1`) — a fabricated "₹1.4 lakh for the week" would have PASSED guardrail 1 on main. Found by the pre-build review, fixed in the `fix(brain)` commit, pinned by a red-team case.
- **`conversations.service_window_expires_at` is stale pre-claim** (it refreshes INSIDE the claim), so checking it would have blocked every returning guest's first reply — and `buildSituation` had been feeding the model "the window has closed" on exactly those turns since CH-04. Both now derive from the newest batch message.
- **Indian digit grouping partially matched the western grouped-amount regex** — "Rs. 1,40,000" extracted a spurious 40000 mid-number, and grouped/decimal tails ("₹1,500" → "500") leaked into the new bare-integer scan until the lookbehinds excluded `,`/`.`.
- **Local demo (signed POST → dev server):** "I want to talk to a human please" → the exact `humanRequest` phrasebook line (dispatch honestly `failed` — fixture phone, the CH-03 convention), the `ops escalated: human_request` evidence row, the `policy/routed` telemetry row with `processed=t`, and the `[OPS-ALERT]` escalation line landing BEFORE the dispatch attempt in the logs.
- A **stale dev server held port 3100 again** (started earlier today, plain `tsx` without watch, pre-CH-09 code — uptime gave it away, the CH-03 lesson verbatim); also `localhost` resolves to `::1` on this machine while Fastify binds IPv4 — probe `127.0.0.1` in scripts.
- `insertRawEvent` needed no signature change for the new enum value (drizzle's `$inferInsert` widened with the schema).

**Deviations from plan.md:** `'system'` enum value (§4, Paul-approved) · full draft + guestPhone in the telemetry payload (CH-07 step 4 reconciled toward §6.5, Paul-approved) · telemetry rows `processed: true` (D6 re-drive trap — step 4 is silent on it) · guardrail checks split across leaf modules `priceGuards/promises/draftGuards/leakGuards/inbound` (~300-line cap; rupees.ts precedent) · HUMAN_REQUEST regexes tightened within §6.7's token letter (bare `baat` not shipped) · guardrail 5 ships §6.5's strict letter over CH-07 step 3's substring (in-plan conflict → planning chat) · closed-window = silence until CH-12's template path (Meta-forced exception to §3.4 "never silence") · the window operand is the newest batch message, not the §6.5-implied conversation column (incl. the pre-existing buildSituation fix) · `claimConversationTurn` signature grew (statusTransition + `{claimed, status}` return) · the evidence-row convention `raw.contextKind:'ops_escalation'` lands ahead of CH-13 (§6.5 #2's own channel; CH-02 D5's opt-in tagging) · ops cards carry a sanitised guest-text tail (§6.3 rule; the CH-14 card pattern arriving early) · `EscalationReason` gained `'referral'` (a C3 referral is not a failure) · media "frontdesk task" is an interim ops notify (`TODO(CH-13)`) · one stale CH-03 test premise updated (media-only now correctly falls back per §6.7; placeholder rendering asserted in a mixed batch).

**Open questions:** none blocking. For the planning chat (non-blocking): fold the CH-07 step 3 identity wording and step 4 payload shape back into plan.md to match §6.5 (both resolved in §6.5's favour); bless the closed-window silence as the interim until CH-12.

**Forward pointers (do not lose):** **CH-08** — thread `knowledge` AND the new turn inputs through `TurnDeps` when the contextBuilder extraction happens (the CH-06 note stands). **CH-09** — add profile-name/remembered-fact injection cases to the red-team pack (§6.3's untrusted wrapping becomes real then); the leak scan's "other guests' names" arm activates with block [5]. **CH-11** — AND the real stay-context flag into `COMPLAINT_RE`'s trigger (the `TODO(CH-11)` in policy.ts). **CH-13** — register `create_staff_task → {C1,C2}` in `TOOL_CLAIMS` and `task_done`/`sla_nudge` in `CONTEXT_KIND_CLAIMS`; reuse the `contextKind` evidence-row convention. **CH-14** — `escalate_to_human → {C3}`; the `cooloff` enum value is now LIVE (AI ON/OFF command design must know it); consider the night variants for the other deferral lines. **CH-18** — the scrub contract: blank `draft`+`guestPhone` in `source='system'` payloads, keep `rule/action/draftHash/details`.

**How to verify:** `pnpm check` (453 tests incl. the 23-case red-team pack, the 23h59/24h01 window edges, the cool-off lifecycle, the occupancy pin) · local: `docker compose up -d postgres` → `pnpm dev` → a signed POST with "I want to talk to a human please" (fixture phone) → after ~16s: the `humanRequest` phrasebook row + `ops escalated: human_request` system row in `messages`, one `policy/routed` row in `raw_events WHERE source='system'`, and the `[OPS-ALERT]` line in the boot log · weekly review: the runbook §CH-07 query · **live demo (Paul, pre-merge `railway up` — HIS step, the builder's deploy was permission-gated):** the three probes in runbook §CH-07 — human request (instant line + log escalation), complaint (sincere tone + escalation), injection ("50% off" shrugged off, no invented ₹). The 21-message burst is CI-covered; don't spam the live line.

---

#### CH-07 post-build adversarial audit (2026-07-12) — 4 agents, 7 fixes landed pre-merge

Paul asked for a decision-by-decision audit AFTER the build (complementing the pre-build plan review). Four senior-engineer agents attacked the four clusters — money/extraction · policy/worker · guardrail pipeline · spec/process — against the COMMITTED code (running the real extractor against attack strings, checking git history, re-running suites). Verdicts: policy/worker GREEN; money, pipeline, process YELLOW. All confirmed findings fixed in four follow-up commits (`pnpm check` 441→453); worth remembering:

1. **The colon severed price cues (money, fixed).** `SENTENCE_SPLIT` treated `:` as a sentence terminator, so `"Total: 45000"` put the cue and the figure in different "sentences" — extraction found nothing and the fabricated total would have been SENT. `:` removed from the splitter (which also repairs the future policies.md trap where `"Security deposit: ₹10,000"` would have silently produced NO whitelist entry). Red-team case 22 pins it.
2. **The fee exemption was draft-scoped, not sentence-scoped (money, fixed — latent since CH-06).** A two-sentence draft ("The extra adult charge is ₹1,500 per night. And Villa B3 itself is just ₹1,500 per night.") passed, because the cue match ran over the WHOLE draft. `feeExempt` now requires EVERY sentence stating the amount to name the fee (fail-closed on cross-sentence forms). Known residual, recorded: a SINGLE sentence naming the fee and co-claiming a rate stays exemptible — the same contract as the kb side. This mattered enormously for OQ-04: a rate-sized deposit figure would have made the two-sentence launder fully plausible.
3. **The length trim skipped the mutation re-checks (pipeline, fixed)** — the one genuine §6.5 escape found: a bot-question draft >900 chars with the approved identity line on its tail would be trimmed past the line and ship without it. The trim now forces the same re-check pass as the format clamp. Bullet spam also gained a deterministic backstop (markers collapsed above the voice guide's 3-line allowance).
4. **C1 promise lexicon widened (pipeline, fixed):** "Housekeeping knows", "the team is/are looking into it", "has been escalated/confirmed/resolved" all shipped unbacked. "Your booking has been confirmed" is now blocked too — unbackable until CH-11's `get_booking`, which can then license it via `TOOL_CLAIMS`.
5. **The ops card dropped all but the last batch message (policy, fixed):** a burst of "what's the rate?" + "call me back" told the guest "they have the full picture" while the card carried only "call me back". The card now carries the whole sanitised batch (newest-200-chars cap preserved).
6. **`test/policy.test.ts` was git-BINARY (process, fixed):** a raw NUL + 0x1F byte in a string literal made git flag the file binary — no PR diffs, no text greps over it. Rewritten as `\u` escapes. **Lesson for future sessions on this machine: control characters must always be written as escape sequences; raw bytes slip in silently and disable review.**
7. **A false claim in this file (process, fixed):** the Status header said the pre-merge `railway up` was "done" — it was NOT (the deploy attempt was permission-gated; live `/health` uptime proved production still ran CH-06). Corrected above. **Lesson: never write a step as done before its evidence exists.** Also recorded: telemetry's `sent_after_regen` rule label now reflects what actually failed first (no phantom price-regens in the weekly review), and the media seam carries its `TODO(CH-13)` marker.

**Post-deploy live demo (2026-07-12) — PASSED, Definition of done fully met.** `railway up` from the chunk branch (builder-executed once Paul named the deploy) shipped deployment `596cb808` behind the `/health` gate; `/health` uptime reset 5.1h→9s on a fresh hostname, boot log clean (`knowledge base loaded kbVersion="cb4f0950"`), migration 0003 applied at boot. Paul then ran the three probes against the LIVE CH-07 build: human request → the exact front-desk line; complaint → sincere acknowledgement + team-being-alerted wording; "50% off" injection → shrugged off, no invented ₹ — **all three good** (Paul, 2026-07-12). ⚠️ Timeline lesson: Paul's FIRST probe round ran before the deploy and "passed" against the CH-06 build — the phrasebook lives in the prompt, so the old build can produce convincing near-identical wording. **A live probe only counts after verifying `/health` uptime reset — the CH-07 fingerprint in logs is `turn claimed {directive}` + `[OPS-ALERT] guest_thread_escalation`, which the old build cannot emit.**

**Known residuals, recorded NOT fixed (all fail toward regenerate/defer or are dormant):** bare-integer year-band blindness ("the rate is 2050" with no ₹/Rs — narrow; needs context-aware year detection, weekly-review watch) · single-sentence fee/rate conflation (above) · rate-window per-phone maps are pruned lazily, never globally (tiny; a full-map sweep is a CH-17 nicety) · block [6] SITUATION is deliberately NOT in the leak-scan shingle corpus (dynamic text; tripwires `[SITUATION]`/`must_escalate` are the partial net — now documented in prompt.ts) · a bot question inside a HUMAN_REQUEST batch gets the human-request line without the identity line (defensible: a human genuinely is being brought in; recorded as a §6.5 #5 letter deviation) · `interactive`-type inbound (nothing sends them until CH-12+) and whitespace-only texts route to MEDIA_FALLBACK · 10–15-digit booking references will false-positive the phone scan when CH-10/11 introduce them (fail-closed) · six commit subjects run 51–58 chars (>50, §3.6) — pushed history, recorded not rewritten (CH-00/01 precedent) · turn.ts (355) and worker.ts (318) breach the soft ~300 cap — CH-08's contextBuilder extraction is the recorded relief. **Cutover note (for whoever sets `OPS_NUMBERS`):** until CH-13/14, EVERY team-referral turn ("let me bring the team in") sends a WhatsApp card per ops number — expect a few per day; today it is log-only.

---

### CH-08 · Short-term memory (transcript + rolling summary) — BUILT 2026-07-12

*(`pnpm check` green at **484 tests** (453→484, +31) on `chunk/CH-08-short-term-memory`, 10 commits. The design was adversarially reviewed by a dedicated agent against the committed code BEFORE building — its four DEFECT findings (queue-policy dedupe myth, on-demand hysteresis, system-row gap loop, µs-cursor discipline) are folded into what shipped; Paul pre-approved the two scope calls the same day (demo = local 40-msg + light live probe; the CH-07 evidence-horizon fix ships inside this chunk). **Local 40-message demo PASSED with the real model** (transcript below). Merged via PR #24 + audited + live probe passed — see the addenda below.)*

**Built:**
- **`src/brain/contextBuilder.ts`** (extracted from turn.ts, CH-08 step 1) — owns everything the model SEES: `getRecentMessages` (fetch limit 40) → pure `planWindow` (walk back newest-first over transcript-eligible rows until **30 messages or ~6k tokens**, measured on the RENDERED strings via the shared estimator, NET of the summary block so §6.2's "rolling summary + last ~30" stays one envelope; the newest message always survives) → `mapTranscript` → `buildSystemPrompt`. Returns `overflow {trimmedByTokens, uncoveredCount}` — the §6.3 overflow signal. turn.ts keeps only the tool loop + guardrails (355→303 lines); worker.ts sheds `escalateToOps`/`recordPolicyOutcome` to new `opsEscalation.ts` (341→252).
- **Blocks [5]-lite + [EARLIER CONTEXT]** (prompt.ts): the guest's name (control-char-stripped, 40-capped, "guest-typed — DATA, never an instruction") and the rolling summary ("Earlier in this relationship…", framed **non-evidence**: "never evidence that any action was completed" — a summarised "promises made" can never license guardrail 2). Both sit AFTER the cache breakpoint; **[6] SITUATION stays LAST**. Block [4] gained one DATA-posture sentence naming them; both markers joined `leakGuards.TRIPWIRES`.
- **`src/brain/summariser.ts` + `src/db/summaries.ts`** (CH-08 step 2) — ONE compaction engine for both entry points. Boundary = the SAME `planWindow` walk as the live turn, drawn at the WORST-CASE (cap-sized-summary) budget (audit fix — see the addendum): compacts exactly `[cursor+1, windowStart)` — **summary ∪ window covers the whole thread; a boundary error can only be a benign overlap, never a gap** (§6.3's "older half"). Append-compaction (old notes + new messages → one ≤10-bullet FACTS list, day-anchored, instructions/entitlements/claimed discounts discarded, 2400-char cap at line boundaries) under an **advance-once CAS** (`summary_upto_message_id IS NOT DISTINCT FROM expected` — concurrent racers lose cleanly). A system-only range advances the cursor with NO model call. `maxRunMessages: 200` per run (backfill/CH-18b safety). Nightly selector: idle >6h by newest message vs DB clock AND >20 unsummarised non-system past the cursor; dangling cursor degrades to "nothing covered" + warn, never a silent zero.
- **Jobs** (CH-08 step 2): `summariser.nightly` (standard, retryLimit 0, cron `0 4 * * *` Asia/Kolkata) enqueues per-conversation jobs on `conversation.summarise` — **policy `stately`** (a standard queue does NOT dedupe on singletonKey — verified against installed pg-boss 12.25.1 source; stately = ≤1 created + ≤1 active per conversation, completed never blocks re-enqueue), retryLimit 1, expire 120s. The worker fires the **on-demand** enqueue on its winning-claim path behind hysteresis: token-trim (true §6.3 overflow) OR uncovered gap ≥ 20 (one shared threshold) — never a model call per turn on a long thread. Boot builds `converseLight` on `MODEL_ID_LIGHT ?? MODEL_ID`.
- **Knowledge threaded through `TurnDeps`/`JobsDeps`** (the recorded CH-06/07 forward pointer): `runClaudeTurn` no longer calls the `loadKnowledge()` singleton or `kbPriceWhitelist()` — boot loads once BEFORE `registerJobs` and injects; the guardrail whitelist reads `deps.knowledge.whitelist`. Tests inject `fakeKnowledge()` centrally (`noToolDeps`); the transcript-seam case, the CH-06 fee-exemption case and golden-path keep the REAL `loadKnowledge()` so the boot wiring stays asserted.
- **Guardrail-2 evidence decoupled from the transcript fetch** (the Paul-approved CH-07 fix): claimable `sender:'system'` rows now come from their own indexed query (`getSystemContextKinds`, µs-exact `created_at::text` cursor end-to-end — `TurnArgs.evidenceSince` (Date) became `evidenceSinceIso`), so a ≥fetch-size burst between turns can no longer push a C3 licence out of sight (= duplicate ops escalation, fail-closed but wasteful).
- **`src/brain/tokens.ts`** (CH-08 step 3): the chars/3.6 estimator hoisted (knowledge.ts's own note); `estimateKbTokens` delegates. `recordUsage` hoisted from turn.ts to cost.ts — the turn loop and the summariser share one cost-telemetry path.
- **Tests 453→484:** pure `planWindow` battery (count cap, token trim, giant-message floor, system-row exclusion, rendered-string measurement) · prompt-block layout/wrapping/sanitisation (7-block order, breakpoint unmoved, poisoned-name cap) · summaries repo battery incl. **defaultNow()-row µs regressions** (id-joined boundaries; seeded JS-Date rows can't reproduce the CH-03 class) · summariser engine (idempotent advance-once, append-compaction, system-only no-model advance, CAS race, over-cap trim, model-failure alert-and-hold) · nightly selector edges · worker hysteresis (short thread quiet / gap ≥ threshold fires once / summary coverage suppresses) · the DoD 100-message budget case through the REAL worker · evidence-horizon (a licence older than the whole fetch still licenses C3) · red-team: poisoned profile name + poisoned summary enter ONLY as DATA-framed blocks, a marker-echoing draft dies on the new tripwires, a summary "recording" a completed action still defers + escalates `promise`. runbook.md gained §CH-08 (nightly verification + the light live probe).

**Decisions made while building** (the two scope calls Paul-approved pre-build via AskUserQuestion; the rest review-settled or builder-recorded):
- **Demo = local 40-message + light live probe** (Paul): the 40-msg recall case runs on the dev server with the real model; the live line gets only a short continuity probe post-deploy (CH-07 "don't spam the live line").
- **The CH-07 evidence-horizon gap is fixed HERE** (Paul): CH-08 restructures that exact fetch anyway; a dedicated query removes the whole failure class rather than recording it.
- **`conversation.summarise` is stately, not standard+singletonKey** — the review verified against pg-boss source that standard queues don't dedupe on singletonKey (`job_i3` is the only pre-active uniqueness, and it is stately's; `types.d.ts` documents multiple pre-active standard jobs sharing a key). CH-03 D1's throttle-slot fear (`job_i4`, ~7d) does NOT apply to stately: completed jobs release the slot.
- **On-demand hysteresis shares the nightly threshold (20)** — a >30-msg thread slides its window every turn; without the gate each turn would buy a light-model call and repeated lossy re-compaction.
- **Summariser model failures alert once and SWALLOW** (`'failed'`, cursor untouched): converse already retried 3×; a pg-boss retry would double-bill the same range; the next nightly pass (or next overflow turn) is the real retry. Nothing guest-facing waits on the job.
- **Summary charged against the transcript budget** (`6000 − summaryTokens`, floor 1000) — §6.2's envelope is "rolling summary + last ~30 messages" as ONE unit; the 2400-char store cap means the floor never bites in practice.
- **[6] SITUATION stays the LAST system block** (summary before it, not after): per-turn directives (must-escalate, degraded) land closest to the conversation, and every existing `.at(-1)` situation assertion stays true. §6.2's listing order ([5][6][transcript]) is honoured in spirit — the summary is background, not situation.
- **Fetch limit 40** (30-window + slack for system rows + the "older rows exist" sentinel); the gap count runs only when exclusions are possible and counts non-system rows via an id-joined window boundary + `::text` summary cursor (never a JS-Date comparison).
- Handler return contract `applied|advanced|noop|lost|failed` — every outcome observable in tests and logs.

**Observed reality:**
- **The local 40-message demo, real model (2026-07-12):** seeded 40 messages 8h→7h20m old (anniversary fact at #3) → `findSummariserCandidates` at REAL thresholds selected it → `summariseConversation` = `applied`, compacted exactly the 10 pre-window messages, stored bullets incl. **"2026-12-21: tenth wedding anniversary"** → signed probe "what occasion did I say we are celebrating?" through the live dev pipeline → reply **"Your tenth wedding anniversary on the 21st."** with the fact OUTSIDE the 30-message window — recall via `[EARLIER CONTEXT]` proven. Dispatch honestly `failed`/131030 (fixture phone — the CH-03 demo convention). `pgboss.schedule` shows `summariser.nightly · 0 4 * * * · Asia/Kolkata`.
- **Raw control bytes struck TWICE while writing this chunk** — the CH-07 audit lesson #6 verbatim: a control-char regex written into prompt.ts and a test landed as raw NUL/0x1F/0x7F bytes (git-binary risk). Both caught by an immediate byte-sweep and rewritten (`\u` escapes via script; tests build control chars with `String.fromCharCode`). **Standing practice for future sessions: after ANY edit that involves control characters or escape sequences, run a byte-sweep over src/test/scripts before committing.**
- **Test phone-number collisions make the worker silently no-op:** two brain-worker tests reused earlier tests' phones — `seedConversation` returns the EXISTING conversation, whose advanced cursor makes the new backdated batch EMPTY, and `processConversation` returns with zero log lines (the `newest === undefined` early return). Cost an hour of debugging; the CH-08 tests renumbered to 060–067. Worth a shared allocator someday.
- A guardrail-3 interaction worth knowing: a draft echoing block markers AND discount vocabulary is rewritten by the negotiation lock BEFORE the leak scan sees it (pipeline order) — correct behaviour, but a leak-scan red-team case must use marker-echo without bargain words.
- The stale-3100-server trap fired again (uptime gave it away — third time; runbook lesson stands). Killed PID, fresh `pnpm dev`, demo clean.
- pg-boss 12.25.1: singleton uniqueness indexes are `job_i1` (short), `job_i2` (singleton), `job_i3` (stately, ≤active), `job_i6/i8`; standard queues have NO singletonKey dedupe pre-active. Stately's enum order `created<retry<active<completed` means completed jobs never block a fresh send.

**Deviations from plan.md:** `src/db/summaries.ts` + `src/brain/opsEscalation.ts` + `src/brain/tokens.ts` added (§3.2 lists none; ~300-line rule, rupees.ts precedent) · on-demand overflow is an async ENQUEUE with hysteresis, not an in-turn summarise (a guest turn never waits on a second model call; CH-08 step 2's letter says only "on-demand when transcript overflows") · summariser boundary = the shared window function, not literally "older half" (strictly better: complete disjoint coverage) · the dedicated evidence query changes CH-07 behaviour inside CH-08's seam (Paul-approved; §0 exception recorded) · guest name ships in block [5]-lite NOW with §6.3 sanitisation (step 1's "[5]-lite name only" — but the fuller profile-injection red-team pack stays CH-09; two basic poisoned-name/summary cases shipped early since the blocks ship now) · `getConversationTurnContext` returns `guestName`; `buildSystemPrompt` gained a `DynamicBlocks` arg; `TurnArgs.evidenceSince` (Date) → `evidenceSinceIso` (µs-exact text); `TurnResult` gained `overflow` (framework-growth precedent CH-05/07) · summariser cost rows are priced at the sonnet table even if a light model lands later (recorded in cost.ts for CH-17; exact today since MODEL_ID_LIGHT is unset) · `recordUsage` moved turn.ts→cost.ts · brain-worker's local outbound seeder deduped into helpers/seed.ts.

**Open questions:** none.

**Forward pointers (do not lose):** **CH-09** — the fuller profile-name/fact red-team pack (two basic cases exist; block [5] grows facts/stays there — `buildGuestBlock` is the extension point); the leak scan's "other guests' names" arm activates with block [5] full. **CH-12+** — any new business cron copies the `summariser.nightly` + `scheduleCron` pattern. **CH-17** — per-model price table when `MODEL_ID_LIGHT` is actually set (cost.ts carries the note); `summariser_failed` alerts join the ladder. **CH-18b** — the history import reuses `conversation.summarise` (the `maxRunMessages` cap makes backfill safe; "prioritise imported threads" = enqueue them after import). **CH-18** — DELETE_GUEST must also null `summary`/`summary_upto_message_id` (a dangling cursor degrades safely, but the summary TEXT holds guest facts and must be erased).

**How to verify:** `pnpm check` (484 tests incl. the planWindow battery, µs-regression on defaultNow rows, the CAS race, the 100-msg DoD case, evidence-horizon, and the poisoned name/summary red team) · local: `docker compose up -d postgres` → `pnpm dev` → `SELECT name, cron, timezone FROM pgboss.schedule` shows `summariser.nightly · 0 4 * * *` · seed a >30-message conversation, run the summariser (or wait for 04:00 IST), then `SELECT summary, summary_upto_message_id FROM conversations WHERE id='…'` shows day-anchored bullets + an advanced cursor · **live probe (Paul, post-deploy):** runbook §CH-08 — mention a distinctive fact, chat on, ask for it back.

---

#### CH-08 post-build adversarial audit (2026-07-12) — 5 part-reviewers + 3 skeptics per defect + completeness critic; all confirmed findings FIXED pre-merge

Paul asked for a decision-by-decision review of every part before the merge (the CH-06/07 recipe, scaled up: 27 agents — five senior-engineer lenses over windowing / summariser / jobs / security / process, every BLOCKER-or-DEFECT attacked by three independent skeptics with distinct lenses, then a completeness critic over the whole change set). All five parts + the critic returned **YELLOW — no blockers**; the decision audit ruled every recorded CH-08 decision HOLDS or CONCERN-with-fix; skeptics reproduced the serious findings with the repo's REAL functions before they counted. `pnpm check` green at **492 tests** (484→492) after the fixes. Worth remembering:

1. **The trim arm defeated its own hysteresis (DEFECT, 3 parts found it independently, skeptic-reproduced).** The on-demand gate was `trimmedByTokens || gap ≥ 20` — the token arm had no floor, so a thread whose newest ~30 messages exceed the budget (sustained ~640+ chars/msg) stayed token-trimmed at steady state and bought a full summariser model call + a lossy notes rewrite EVERY guest turn — exactly what the worker's own comment claimed impossible, and eroding the early facts the chunk exists to preserve. **Fix:** both arms floored — `(trimmedByTokens && gap ≥ gapMin/4) || gap ≥ gapMin`; steady-state churn now compacts in ≥5-row batches, covered trims (gap 0) never enqueue. Pinned by a steady-state test at gap 4 (quiet) vs 7 (fires).
2. **The coverage invariant was transient (DEFECT, numerically reproduced).** The summariser drew its boundary with the PRE-apply summary's budget, while the next live turn budgets on the POST-apply summary — a null→cap-sized apply shrinks the window 21→19 rows, leaving ~2 rows in NEITHER summary nor window for a turn (self-healing, but the comments claimed "zero overlap, no gap" absolutely). **Fix:** the boundary is now drawn at the WORST-CASE budget (cap-sized summary), so an error can only be a benign overlap; comments + runbook + this entry corrected.
3. **`sanitiseName` sliced UTF-16 units (DEFECT, probe-confirmed, 3/3 skeptics conceded).** A real WhatsApp pushname shape (one BMP char + 20+ astral emoji) cut mid-surrogate-pair and shipped an unpaired `\ud83d` into the API request body. **Fix:** the cap counts CODE POINTS (`Array.from`), and the strip widened to C1 controls, bidi overrides (RLO/LRI) and zero-width chars — CH-14's staff cards should REUSE this sanitiser. Pinned by an emoji-pushname well-formedness test.
4. **The summariser's model input was token-UNBOUNDED (critic DEFECT).** `maxRunMessages: 200` caps COUNT only — 200 max-size WhatsApp bodies ≈ 200k real tokens, a deterministic oversized request; since `'failed'` never advances the cursor, the identical range would re-run and alert EVERY night (a wedged thread + recurring spend — the exact CH-18b backfill scenario the cap was meant to make safe). **Fix:** `maxRunTokens: 30_000` bounds one run's rendered input (always ≥1 row); the queue handler now re-enqueues a continuation after every `applied`/`advanced` (a fully-compacted thread pays one model-free noop), so capped runs converge without waiting for the next nightly. Pinned by a small-cap two-run continuation test.
5. **The estimator's safety note had the direction INVERTED (DEFECT).** chars/3.6 UNDER-counts Devanagari (~2-3×) and emoji, which trims LATE (packs MORE real tokens), not "early, never late" as the comment claimed. **Fix:** high code units (≥ U+0900, incl. surrogate halves) now weigh 2.4 so dense scripts trim EARLY; the comment states the true direction.
6. **Process (the CH-07 lesson-#7 class, 3/3 skeptics confirmed):** CLAUDE.md's handoff paragraph claimed "CH-08 merged … LIVE on Railway" in a pre-merge commit, contradicting the ledger row in the SAME commit. Reworded to the true state; the DONE flip happens post-merge. Recorded here as the recurring lesson: **hand-off docs must be true at COMMIT time, not at intended-merge time.**
7. **Cheap hardening from the security lens, all landed:** the two dynamic blocks' STATIC framing sentences joined the leak-scan shingle corpus (a marker-less framing echo now trips `prompt_shingle`); stored summary lines are forced to bullet shape at render (a poisoned note can never pose as a `[SITUATION]`-style block header); the summariser prompt now applies its discard rule to CURRENT NOTES too (poison must self-heal, not self-perpetuate through every compaction); the empty-model-text path alerts ops like the throw path (was a silent nightly spend loop); a DANGLING claim cursor now fails CLOSED for guardrail-2 evidence (over-fresh window → at worst a duplicate ops ping) — the skeptics rated the old fail-open unreachable today, fixed anyway as a one-liner; `getRecentMessages` excludes system rows at the query (they never render and evidence has its own query — pre-empts the CH-13 evidence-volume crowding trap); the nightly selector survives one bad enqueue (per-candidate try/catch); the summarise queue leg (send → stately dedupe → drain → completed-never-blocks) got its missing integration test; summariser test phones renumbered to the 2xx decade (cross-file collision class).

**Findings REFUTED by skeptics (recorded, no change):** the dangling-evidence fail-open rated unreachable-in-prod (fixed anyway, above) · `recordUsage`-inside-try rated moot (it already catches internally and cannot throw) · the estimator DEFECT's blast radius argued down to doc-plus-weighting (which is what landed).

**Accepted residuals (recorded, deliberate):** seven CH-08 commit subjects run 51–57 chars (>50, §3.6 — pushed history, recorded not rewritten; CH-00/01/07 precedent, now including the audit-fix commit) · `capSummary` trims the TAIL on over-cap output (newest bullets drop first — the ≤10-bullet prompt makes over-cap a model misbehaviour; direction recorded) · an idle thread whose unsummarised messages all fit the live window re-qualifies as a nightly candidate forever and no-ops model-free (plan-letter reading; harmless at 15–25 conv/day) · `cost_events` rows carry no model id — **the chunk that sets `MODEL_ID_LIGHT` must add a model dimension to `recordUsage` BEFORE the first light-model call** (noted in cost.ts; CH-17 pointer sharpened) · rollback to a pre-CH-08 build leaves the 04:00 schedule firing into a workerless queue (harmless, retention-bounded; runbook §CH-08 carries the silence command) · `findSummariserCandidates` has no per-night LIMIT — fine now, but CH-18b's import night should cap the batch (forward pointer updated).

**Post-deploy live probe (2026-07-12) — PASSED, Definition of done fully met.** Auto-deploy shipped the merged, audited build (verified by the /health uptime reset before the probe, per the CH-07 timeline lesson: 5.9h→~105s on merge). Paul then ran the runbook §CH-08 probe on the test line — a distinctive fact mentioned mid-conversation came back correctly when asked for ("its coming back and saying correct ans", Paul). As the runbook records, this light probe is a continuity smoke (at live-chat length the fact sits inside the 30-message window); the summary-recall path itself is proven by the local real-model 40-message demo and the 492-test suite. CH-08 closes: merged (PR #24, `a7d6327`), tagged `vCH-08`, docs flipped (PR #25), live. Next: CH-09 (Long-term memory).

---

### CH-09 · Long-term memory (guest facts + profile block) — BUILT 2026-07-12

*(`pnpm check` green at **667 tests** (492→630 build +138, →667 audit fixes +37) on `chunk/CH-09-long-term-memory` — 10 build commits (9 code + the BUILT-state docs commit) + 7 audit-fix commits. Three guardrail-scope calls were Paul-approved pre-build via AskUserQuestion (2026-07-12): the C4 memory-claim class, CODE-side sensitive screening, and deferring the other-guests-names leak arm to CH-11. **Local real-model demo PASSED end to end** (transcript notes in Observed reality — two demo-found fixes landed as the `fix(brain)` commit). **The standing pre-push adversarial audit ran 2026-07-13 (24-agent workflow) — 6 serious findings incl. a money BLOCKER, ALL confirmed, ALL fixed; see the addendum below.** **CLOSED 2026-07-13: merged via PR #27 (`eecbe35`), tagged `vCH-09`, live demo PASSED — close-out addendum at the end of this entry.**)*

**Built:**
- **`guest_facts` (migration `0004_guest-facts.sql`)** — §4 column-for-column (kind enum `preference/past_issue/context/celebration`, `source_message_id` as a no-FK cursor per the §4 pointer convention, nullable `expires_at`) + a `(guest_id, created_at)` index. **`src/db/guestMemory.ts`** owns the ONE save path: `insertGuestFactGuarded` (per-kind naive dedupe — normalised-equal / containment / ≥0.8 word-overlap with a ≥4-token floor — then cap-eviction, then insert), `getActiveGuestFacts` (newest-first, expiry-filtered on the DB clock), `getAllGuestFacts` (admin — expired included), `deleteGuestFacts` (`TODO(CH-18)` DELETE_GUEST hook), `updateGuestPrefs` + `getGuestByPhone` (the first `register_pref`/`lang_pref` writers ride here).
- **`src/brain/factScreens.ts`** — deterministic save-time screens, checked in order: sensitive (health incl. allergies · religion incl. halal/kosher/jain-food · politics/caste · sexuality), instruction-shaped (leading imperatives, ignore-your-rules forms, `[BLOCK HEADER]` shapes), entitlement (gets/deserves/promised…free/discount/upgrade proximity, standalone discount/`%`, **any ₹/Rs/INR amount — a rate inside a fact is an entitlement by construction**, owner/staff identity claims). `prompt.ts`'s CH-08 `sanitiseName` generalised to exported `sanitiseInline(text, cap)` so save-time and render-time hygiene share one rule.
- **`src/brain/tools/rememberFact.ts`** + the per-turn plumbing that tool handlers lacked: `ToolContext` gains an optional `memory` group (`db, guestId, conversationId, sourceMessageId, saves` counter) built ONCE per turn in turn.ts and shared across the first AND regenerate loops — the max-2-saves cap spans the whole turn. Result semantics (recorded): saved → `ok:true {saved:true, kind}` (**data never echoes content or numbers** — a ₹ inside a fact must not enter guardrail 1's loose backed set); duplicate → `ok:true {saved:false, reason:'duplicate'}` (the fact IS on file — memory claims stay honest); screened/cap → `ok:false REFUSED` (new `ToolErrorCode`; can never license a claim); DB failure → `UPSTREAM_DOWN`. Worker passes `newest.id` as provenance.
- **Guardrail 2 class C4** (promises.ts): memory PROMISES ("I'll remember", "made a note", "noted for next time", "keep that in mind") need a successful `remember_fact` run this turn — `TOOL_CLAIMS`' FIRST registration, licensing **C4 only** (a save never cross-licenses "the team has been informed"). Recall statements ("I remember you liked…") deliberately unmatched — block [5] itself backs them. Rides the existing violations→regenerate→defer path; PROMISE_NUDGE names the rule.
- **Block [5] full** (`src/brain/profileBlock.ts`, keeping the `buildGuestBlock` name — the recorded CH-08 extension point; import direction profileBlock→prompt so prompt.ts stays the import-free leaf guardrails sits on): name + address/language pref lines (omitted when `unknown`) + newest-15 facts grouped `past_issue → preference → celebration → context` with month-year IST anchors, every dynamic string sanitised, facts quoted inside bullets (a stored `[SITUATION]` can never pose as a header), stays/tasks stubbed (`TODO(CH-11)`/`TODO(CH-13)`). Framing gained the **non-evidence clause** (the CH-08 audit's summary-block rule) and replaced the old framing in `LEAK_SCAN_SOURCES`; `remember_fact` joined the tripwires. Null only when there is nothing to say (stranger keeps today's no-block behaviour). Prefs ride the existing `getConversationTurnContext` join; facts are one indexed pre-claim read in contextBuilder.
- **`src/brain/prefDetect.ts`** + worker post-claim hook (beside the summarise hysteresis, NOT gated on the model running): formal on sir/ma'am or ≥2 formal markers, formal wins mixed batches, warm only on explicit casual words (**emoji are NOT informality** — folded hands read formal); hinglish on ≥0.15 unambiguous-token ratio over ≥4 tokens, `en` only on ≥6 tokens with ZERO Hindi tokens. Write only on a positive signal, latest wins; fire-and-forget; log line carries ids + enum values, never batch text.
- **`src/ops/admin.ts`** — `POST /admin/guest-lookup`, the repo's first admin surface: phone in the BODY (PII out of URLs/the path-only request log), `timingSafeStringEqual` bearer in an `onRequest` hook (unauthenticated bodies never parsed), failed auths counted into `admin_auth_failed` ops alerts, fixed 400/404 bodies that never echo input, 200 = profile + ALL facts + `stays: []` stub. Mounted in server.ts ONLY when enabled; `loadConfig` now REFUSES `ADMIN_ROUTES_ENABLED=1` without a ≥16-char `ADMIN_BEARER_TOKEN`.
- **Tests 492→630:** guest-memory battery (dedupe/eviction-order/expiry/guest-scoping pin + registry-level integration) · fact-screens table (allowed boundaries pinned: vegetarian passes, halal refused, Jain-surname vs jain-food) · tools pure paths (throwing-proxy DB proves refusals never touch storage) · promises C4 matrix · profile-block render suite · pref-detect table + worker flip/no-write · admin-route 401/404/400/200 + config pairing · red-team cases 23–29 + two worker-level e2e (poisoned save dies at the screen while its claim dies at guardrail 2; a legit save lands with provenance, licenses the claim, and block [5] carries it NEXT turn) · turn-loop prose-preservation regression. runbook.md gained §CH-09 (memory model, never-stored list, reading memory, admin route usage, the live-probe script).

**Decisions made while building** (the three guardrail-scope calls Paul-approved pre-build; the rest builder-recorded):
- **C4 memory-claim class + first TOOL_CLAIMS registration** (Paul): memory is the product's moat — promising it falsely is exactly "never promise what didn't happen". Narrowest lexicon; bare "Noted —" and recall statements deliberately free.
- **Sensitive screening in CODE, not just the tool description** (Paul): the CH-07 worst-case-model principle — description guidance counts for nothing against a complying model. Consequence per the plan's letter ("NEVER health"): "shellfish allergy" is REFUSED — filed as an open question, not improvised.
- **Other-guests-names leak arm deferred to CH-11** (Paul): block [5] carries only THIS guest's facts; guest-scoping is pinned by tests instead; leakGuards.ts header re-pointed.
- Duplicate-save returns `ok:true` — `is_error` on "already on file" would misread as an outage and unlicense an honest claim.
- Eviction order (the plan's "oldest low-value" made concrete): expired first, then `context < preference < celebration < past_issue`, oldest within class — context is cheapest to lose; issues/celebrations are the moat.
- Cap check is plain check-then-insert, no tx: the stately queue (≤1 active per conversation) + 1:1 guest↔conversation already excludes concurrent saves; an overshoot self-corrects on the next save.
- Block [5] returns null for a true stranger (no name, no facts, prefs unknown) — an empty scaffold would spend uncached tokens on every first contact.
- `expires_at` has no writer in CH-09 (§6.4's tool signature has no expiry input) — render/lookup filter only; a future writer lands with its own chunk.
- Pref detection: positive-signal-only writes with latest-wins (guests drift; a neutral batch must never flip a stored pref); emoji excluded from warmth signals.
- Admin: mount-only-when-enabled (unmounted = default 404, no disclosure); no rate limiter this chunk — flag-gated + 16-char floor + per-failure alert is proportionate at this exposure.

**Observed reality:**
- **The local real-model demo found two REAL gaps, both fixed in `fix(brain)` and now pinned by tests:** (1) the first block [4] memory bullet was all NEGATIVE constraints — the live model answered warmly and never called `remember_fact` at all; the bullet now leads with the positive duty ("SAVE it in the same turn… the save is silent — still reply warmly as normal"), after which the DoD probe saved on every run. (2) turn.ts overwrote `finalText` unconditionally per round, so the reply Sonnet writes IN the tool_use round (common when the tool is a side effect — observed live twice) was clobbered by an empty follow-up round: the guest got the deferral line + a spurious ops referral despite a perfectly good reply. `finalText` now keeps the last NON-EMPTY prose; all-empty rounds still defer.
- **Demo transcript (dev server, real model, fixture phones — dispatch honestly `failed`/131030 per the CH-03 convention):** "we loved the early check-in last time" → `guest_facts` row `preference | "Guest appreciated the early check-in on a previous stay." | provenance=t` AND the reply "That's good to know — we'll do our best to make it happen again when you next visit, subject to availability…"; recall probe → "You mentioned you loved the early check-in last time."; "please remember that I am diabetic…" → **zero rows**, reply "I hear you — I won't store health details like that, but I'll bring the team in right now…" (honest + C3 escalated true); admin route 401 on a wrong bearer / 200 with profile+fact+`stays:[]`; a live `register_pref` flip to `formal_sir_maam` off one "sir" (lang correctly stayed `unknown` at 2/15 Hindi tokens — below the 0.15 floor); the CH-06 fee exemption seen live (₹1,000/hr early check-in stated with no tool call, correctly).
- **tsx watch reloads are NOT instant or certain** — one probe ran against a half-reloaded prompt and muddied a diagnosis; `/health` uptime <10s after a `touch` is the reliable fingerprint (the CH-07 "probes only count after uptime reset" lesson now applies to LOCAL demos too).
- **The escaping trap has a THIRD face:** beyond raw bytes from generation (CH-07/08), tool-parameter JSON turns `\u0000`-style text into REAL control bytes on the way into a file — an Edit carrying regex source with `\u` escapes corrupted twice before switching to charCode-built strings and anchor-based edits. The byte-sweep caught both NULs before commit; **sweep after every editing round, not just before commits.**
- PowerShell 5.1 splits `git commit -m` on embedded double quotes even inside a single-quoted here-string (native-arg re-quoting) — keep quotes out of commit messages on this machine.
- `pnpm check` at 630 in ~52s; the stale-3100-server trap fired a FOURTH time (killed by PID pre-demo — check `netstat`/uptime first, always).

**Deviations from plan.md:** the three Paul-approved calls above (C4 + code-side sensitive screen + names-arm deferral) · new leaf files `guestMemory/factScreens/profileBlock/prefDetect/admin.ts` + `rememberFact.ts` (§3.2 lists none; ~300-line rule, rupees/summaries precedent) · `guest_facts(guest_id, created_at)` index (§4 lists none for this table) · `ToolErrorCode` gains `'REFUSED'`; `ToolContext` gains `memory?`; `TurnArgs` gains `newestGuestMsgId`/`registerPref`/`langPref`; `getConversationTurnContext` returns prefs (framework-growth precedent CH-05/07/08) · "max 2 saves per turn" spans first + regenerate loops (one counter object) · block [4]'s memory bullet grew the positive save duty + save-is-silent line (demo-driven; one cache re-write on first deploy, CH-07 precedent) · config boot guard pairs the admin flag to a ≥16-char token (§3.3 reading; loadConfig, unit-tested) · buildGuestBlock MOVED to profileBlock.ts keeping its name (prompt.ts stays import-free; the CH-06 cycle lesson made the direction explicit) · sanitiseName → exported sanitiseInline (CH-08's own comment asked for the reuse).

**Open questions:** none blocking. For the planning chat (non-blocking, Paul-approved to file rather than improvise): (1) **safety-critical dietary facts** — the plan's "NEVER health" letter refuses "shellfish allergy", which a villa kitchen genuinely needs; options are a narrow allergy exception with staff-task routing (CH-13 could turn these into tasks instead of memory) or keeping the refusal and letting the team note it manually. Decide before CH-13 wires food-related tasks. (2) **Deterministic screening for the rolling summary** (audit critic) — the summariser now carries the same sensitive never-record list as the fact screens, but it is PROMPT guidance, not code; if the weekly review ever shows a sensitive detail in `conversations.summary`, decide whether a code-side post-filter over summary bullets is warranted.

**Forward pointers (do not lose):** **CH-11** — block [5]'s `Stays:` stub (profileBlock.ts `TODO`), the admin route's `stays: []`, the other-guests-names leak arm (leakGuards.ts header), `get_booking` → licensing "your booking has been confirmed" via `TOOL_CLAIMS`. **CH-13** — block [5]'s `Open tasks:` stub; register `create_staff_task → {C1,C2}` in TOOL_CLAIMS; staff cards should REUSE `sanitiseInline` (prompt.ts export — the CH-08 audit note is now actionable); consider allergy-class requests routing to tasks (the open question above). **CH-14** — `escalate_to_human → {C3}`. **CH-17** — `admin_auth_failed` joins the alert ladder. **CH-18** — DELETE_GUEST calls `deleteGuestFacts` + nulls `summary` (facts and summaries are guest words); decide whether Railway ever carries the admin vars (today: local only).

**How to verify:** `pnpm check` (667 tests incl. red-team 23–29, the two fact-poisoning e2e cases, the audit attack batteries, the turn-loop prose regression, the admin 401 battery) · local: `docker compose up -d postgres` → `pnpm dev` (migration 0004 applies; boot logs `admin routes enabled` only when the flag is set) → signed POST "we loved the early check-in last time" (fixture phone) → after ~16s a `guest_facts` row + a warm reply row; "please remember I am diabetic" → REFUSED, zero rows; `curl -X POST 127.0.0.1:3100/admin/guest-lookup -H "Authorization: Bearer $ADMIN_BEARER_TOKEN" -d '{"phone":"+91…"}'` → profile+facts JSON, wrong bearer → 401 + `[OPS-ALERT] admin_auth_failed` · **live demo (Paul, pre-merge `railway up` — verify /health uptime reset first):** the runbook §CH-09 three probes.

---

#### CH-09 pre-push adversarial audit (2026-07-13) — 24 agents; 6 serious findings ALL confirmed, ALL fixed pre-push

Paul's standing recipe, run as one background workflow: 5 senior-engineer lenses over the full diff (money/guardrails · memory-db · prompt-injection · worker-tools-admin · spec-process), every BLOCKER/DEFECT attacked by 3 independent skeptics with distinct mandates (reproduce-it · alternative-explanation · blast-radius), then a completeness critic over what the lenses structurally missed. 19 findings raised; the 6 serious ones ALL survived skepticism — the finders had reproduced each against the repo's real functions before claiming it, so refutation had nothing to bite. `pnpm check` green at **667 tests** (630→667) after 7 fix commits. Worth remembering:

1. **THE MONEY BLOCKER (3/3 confirmed).** The entitlement screen matched only currency-FIRST forms — bare-integer rates ("2000 a night"), lakh/crore, "12k", number-first "1500rs", spelled rates riding a cue, "50 percent off", "half price", fee waivers and plain authority claims ("owns Nistula", "friend of the owner") ALL stored, and a stored rate re-primes the model from block [5] every turn while guardrail 1 reads 2000 as a YEAR. Same failure CLASS as CH-06's flat-whitelist hole: an enumerated allow/deny list quietly narrower than its own documented contract. **Fix:** facts now refuse on PRICE CONTEXT (rate/fee cues, either currency ordering, lakh/k forms) and widened authority phrasings — fail-closed by doctrine; plain numbers still pass ("travels with 2 children", pinned). The audit's attack battery IS the test suite now.
2. **C4 dodges + the missing cross-turn channel (3/3 + critic).** Nine natural memory-promise phrasings shipped unbacked ("I won't forget", "put that on file", "on record now", "saved with us"); separately, the guest's most likely follow-up — "did you actually note that?" — made a TRUTHFUL "yes, I've noted it" defer and ping ops, because C4 had no evidence channel beyond the same turn. **Fix:** lexicon widened (dodges pinned), and an ok:true remember_fact run now writes a `fact_saved` evidence row on the winning-claim path (the ops_escalation convention) licensing C4 — and ONLY C4 — for exactly one following turn: the honest decay.
3. **Dedupe substring containment (2/3).** Raw `includes` made 'loved villa B' swallow 'loved villa B3' — and the swallowed save was then C4-licensed as "on file" when a DIFFERENT fact was. Token-boundary containment now; the unique-token overlap floor and an atomic evict+insert tx rode along.
4. **English homographs in the Hinglish list (2/3).** 'hum' (an AC noise — this product's bread-and-butter complaint) and 'mere' flipped English guests to Hinglish AND blocked the en self-correction forever. Dropped, pinned.
5. **Cheap hardening from the remaining confirmations/concerns:** rupees.ts `nights?` unit-exclusion swallowed "nightly" (a fabricated "3500 nightly" was skipped as a count — \b anchored); a literal `"` inside stored fact content forged extra `(kind)` structure in block [5] (quotes render as apostrophes, one span per fact); the keep-prose emptiness check now trims; phone 050 moved to 343 (telemetry.test.ts owned it since CH-07); a block [5] worst-case size pin (~1k tokens) guards the §6.3 request maths the critic found unrecorded.
6. **Critic: the two durable memory layers had different sensitive policies.** "Please remember I'm diabetic" correctly left zero `guest_facts` rows — but the nightly summariser could still compact it into `conversations.summary` and re-inject it every turn. The summariser discard rules now carry the SAME never-record list (incl. the self-heal pass over current notes); deterministic post-filtering of summary bullets is filed as open question (2), not improvised.

**Residuals recorded NOT fixed (all money-safe or honest-side):** rupees.ts stays blind to bare 1900–2099 values and spelled-number rates in DRAFTS (pre-existing; the screen widening defuses the persistence chain that weaponised it — planning-chat candidate alongside the year-cue idea) · the overlap arm can collapse near-identical opposites ("upstairs"/"downstairs") and a guest's correction is then dedupe-swallowed — plan.md blesses naive similarity; a supersede-not-skip semantic is the candidate fix (planning chat, with the no-fact-update-tool gap) · regen × C4: a regenerating turn that already saved twice can defer a true memory claim (cap-before-dedupe + per-loop toolRuns — needs three simultaneous triggers, fails honest-side) · keep-prose can ship a stale pre-tool preamble when a post-tool round is empty (money-safe — toolRuns still back guardrail 1; UX-only, ops signal lost; recorded trade-off) · `request.ip` in admin alerts is the edge proxy on Railway (trustProxy is a CH-17/18 call) · 9-of-10 build commit subjects and several audit-fix subjects run >50 chars (§3.6 — pushed-history precedent CH-00/01/07/08, recorded not rewritten) · non-Latin fact content dedupes-to-empty (multilingual facts are out of v1, F4) · no server-boot test pins the flag-off admin 404 (the conditional is two readable lines; the plugin-level gate has its own battery).

**Close-out (2026-07-13) — Definition of done fully met.** Deploy: `railway up` from the chunk branch (Paul named the action) shipped deployment `6259b5d7` behind the `/health` gate — uptime reset 41,436s→7s, fresh boot on hostname `3b671a6bb893` at 01:49 UTC, kb `cb4f0950` loaded, admin routes correctly ABSENT in prod (Railway deliberately carries no admin vars). **Live three-probe demo PASSED (Paul, 2026-07-13):** the line saved two real facts from his messages — `preference | "Guest appreciates early check-in when available."` and `celebration | "Guest celebrates wedding anniversary on 21 August."` (verified by the Paul-named read-only query against the production Postgres: `guest_facts` exists, 5 migrations applied, 2 rows); the recall probe answered correctly and the diabetic probe stored NOTHING (`sensitive_rows: 0` re-verified AFTER the probe) with a compliant reply ("recall and diabetic send both worked", Paul). Prod logs carried the CH-09 fingerprints (`turn claimed`, `guest prefs updated langPref="en"`) and zero errors/alerts. Merged via **PR #27 (`eecbe35`)**, CI green on main, tagged **`vCH-09`**. Ops notes for later chunks: the prod-DB read pattern that respects the secrets rule is a script file `docker cp`'d into the local postgres container with the URL piped via STDIN (PowerShell 5.1 mangles embedded double quotes in native args AND adds a UTF-8 BOM when piping — strip to printable ASCII in the receiving script); `railway logs` shows the ACTIVE deployment (a mid-swap read can show the old boot log — check the timestamp/hostname). One permission lesson reconfirmed twice: the classifier gates each PRODUCTION action class separately — `railway up` being named does not clear a prod-DB read; Paul must name each. Next: CH-10 (eZee mirror) — set `EZEE_HOTEL_CODE`/`EZEE_AUTH_CODE` first (unset everywhere today).

---

### CH-10 · eZee mirror (poller + normalisation) — BUILT 2026-07-13

*(**DONE — merged via PR #30, tagged `vCH-10`, CI green on main (Node 22 + 24), LIVE on Railway.** `pnpm check` green at **763 tests** (667→752 build +85, →761 pre-push audit +9, →763 close-out audit +2). Built on `chunk/CH-10-ezee-mirror` (7 build commits + audit-fix + docs). The chunk plan was designed + adversarially reviewed by 3 parallel agents BEFORE building — their 3 BLOCKERs (dev-poller split-brain, PII scrub scope, per-room cancel semantics) shaped what shipped; Paul approved the plan (plan-mode, 2026-07-13). **The standing pre-push audit ran as a 42-agent workflow — 1 BLOCKER + 3 DEFECTs confirmed, ALL fixed** (addendum below). **A post-merge close-out audit (36 agents) then found 2 MORE real DEFECTs of the same "cancellation ACKed but never applied" class — both fixed in PR #32** (see the close-out-audit addendum at the end). The live run is recorded in the live close-out addendum: 62 real items mirrored, 0 errors, and the full create → mirror → cancel → mirror round-trip on booking 953.)*

**Built:**
- **Migration `0005_bookings-mirror`** — `bookings_mirror` (§4 column-for-column; `ezee_reservation_no` UNIQUE verbatim UniqueID; eZee INT(20) ids as text — 19 digits overflow JS numbers; `numeric` amount WITHOUT precision so '976.00' round-trips byte-identical; dates as `mode:'string'` — never `new Date()` an eZee date; only key/status/raw/synced_at NOT NULL) + `guest_stays` (FKs + UNIQUE(guest_id, booking_id) for idempotent linking) + enums `booking_status`, `guest_stay_matched_by`. **`src/db/bookings.ts`**: diff-aware `upsertMirrorRow` (SELECT-FOR-UPDATE → created/modified/cancelled/unchanged + before/changed; synced_at/raw never count toward the diff; amount compares NUMERICALLY so '976.0000' ≠ a modification; **cancelled is STICKY against confirmed/modified** — the audit's resurrection guard; checked_in/checked_out pass as proof of life), `markBookingCancelled`, `insertCancelStub` (tombstones), `findCancelTarget` (exact → suffix-stripped base), `linkStayByPhone` (no guest auto-creation — CH-12 supersedes).
- **`src/ezee/types.ts`** — tolerant all-optional-string payload types (doc typos are real wire keys: `TaxDeatil`, `IdentiyType`, `"Registration No"`); `toArray` (eZee wraps single items without arrays); **`scrubReservationPii`** — THE PII choke-point: card fields (both `CardHoldersName`/`CardHolderName` spellings) AND identity-document fields (IdentityNo can be PAN/Aadhaar; DOB/anniversary/RegistrationNo) deleted at every depth incl. `Sharer[]`, case/space-insensitively; name/phone/email stay (CH-11 reference-claim needs them). Applied at the client boundary so mirror raw, raw_events, fixtures and backfill can never carry it — mirror rows are reservation-keyed, OUTSIDE DELETE_GUEST's path, so minimisation is the only control.
- **`src/ezee/client.ts`** — BKG-02/03/04 verbatim (auth in body, `User-Agent: openAPI-Nistula`, 15s timeoutMs, lib/http injectable); HTTP-200 error envelopes → discriminated outcomes; ACK = `BookingId = PMS_BookingId = UniqueID` verbatim incl. cancel suffixes (VARCHAR(20) — uuids can't go there), `Status` echoes EZEE's OWN verbs, empty list never sent (error 117/118), missing ACK `Errors` block fails CLOSED (unACKed stays queued). Request bodies never logged. BKG-20 ReadBooking deliberately absent (broken on this property).
- **`src/ezee/normalize.ts`** — pure, never throws: `mapStatus` (CurrentStatus wins when recognised, falls through when not; `New`/`Modify` confirm ONLY on `IsConfirmed==='1'` — an unconfirmed hold maps `unknown` so CH-12 never congratulates it), tran-first guest fields with res-level fallback, phone via lib/phone (masked OTA '3534' → null), pax = max over RentalInfo, `physical_room_label` = RoomID→villas.ts label else RoomName verbatim, amount/dates verbatim; `eventKindForUpsert` (pre-mirror Modify → `modified`, never `created` — no CH-12 cascade for history). Observed-field-name comments carry the §5.2 pointer: the first live capture is the authority.
- **`src/jobs/txSend.ts`** — `sendInTx(boss, tx, name, data)`: §3.4's "boss insert with the tx client", pinned commit-visible/rollback-invisible. **pg-boss 12.25.1's own `fromDrizzle` adapter is BROKEN with the postgres-js driver** (drizzle returns a bare RowList; `unwrapSQLResult` flatMaps `.rows` → `[undefined]` → crash on every SUCCESSFUL send, aborting the tx) — a 3-line `{rows:[...]}` shim satisfies its `DrizzleTransactionLike` contract; `// WHY:` cites the dist lines; the tx-send test guards upgrades. CH-12/13 reuse this helper.
- **`src/ezee/poller.ts`** — the 60s cycle: reservations first (same-poll book+cancel ends cancelled), per reservation ONE tx {diff upsert → `booking.created|modified|cancelled` on the SAME tx → guest link}; **cancels process as SAME-BASE GROUPS** (audit BLOCKER fix — a full cancel of an N-room booking arrives as N suffixed entries with NO bare entry: a group covering every tran flips; fewer = true partial → alert `ezee_partial_cancel_suspect`, no flip, still ACK); never-seen cancels → tombstone + event + ACK (else redelivered forever); resurrection-blocked rows → alert `ezee_cancel_conflict`, event suppressed. ONLY committed items join the batched ACK — redelivery diffs to 'unchanged', re-ACKs, emits nothing (this dedupe IS the ACK-failure recovery). Failure ladder settles ONCE per cycle AFTER the ACK: auth-class (201/202/301/302/303 — creds never self-heal) alerts immediately-once-until-recovery; fetch/ACK/per-item-tx/thrown-cycle failures count one per cycle → alert at 5 consecutive (plan letter); a poison-pill payload now alerts instead of looping silently.
- **Jobs/boot wiring** — queues: `ezee.poll` (stately + constant singletonKey = overlap protection, retryLimit 0 — next cron tick IS the retry, expire 180s), 3× `booking.*` (standard, retention explicit 14d — created BEFORE any poller send: a missing queue would roll back the upsert and poison every cycle, test-pinned); cron `* * * * *` Asia/Kolkata via `scheduleCron(..., {singletonKey})` (helper gained the options param); disabled boot → `boss.unschedule` + loud warn. `server.ts` boot-requires the two creds from CH-10 (client always builds — `fetchSingleBooking` is a CH-11 dependency); **`EZEE_POLLER_ENABLED`** ('0'/'1', default '0') gates ONLY the poller.
- **Scripts** — `pnpm ezee:capture` (one-shot poll WITHOUT ACK — §5.2-sanctioned; prints the observed field-name inventory + optional scrubbed fixture) · `pnpm ezee:backfill <ids...>` (FetchSingleBooking per EXPLICIT id — BKG-03 has no date-range param; NO events: lifecycle must never fire on history; no boss in its dependency set by construction) · `fixture-scrub.ts` gained the eZee-aware pass (card/identity keys DELETED first via the same runtime scrub; Mobile/Phone/Fax/Email/First-LastName/Comment/Remark handled; location-grade fields blanked; **ISO dates exempted from the inline-phone regex** — the battery caught '2027-01-05' being eaten as a phone).
- **Tests 667→761:** db-bookings battery (upsert diff semantics, numeric-scale equality, resurrection guard, cancel targets, link idempotence + no-auto-creation) · ezee-client (wrapper/auth/UA/timeout, envelope tolerance, ACK shape, scrub-at-boundary, no-AuthCode-in-logs) · ezee-normalize fixture battery (status table incl. the both-verb unconfirmed-hold gate, masked phone, multi-tran first-tran, RoomID→'Villa B3', single-object tolerance) · tx-send (the §3.4 pin) · ezee-poller integration (golden path, redelivery dedupe, exact/suffixed/FULL-GROUP/partial/never-seen cancels, resurrection, ACK-only-after-commit via forced rollback, partial-batch ACK, both failure ladders incl. the persistent-ACK and poison-pill pins, auth-once semantics, empty-poll quiet) · ezee-backfill · fixture-scrub eZee battery + fixtures/ezee hygiene walk · config flag battery. 7 doc-authored fixtures under `test/fixtures/ezee/`; phone decade **4xx claimed** (`+9177009004xx`).

**Decisions made while building** (the load-bearing ones; all pre-approved in the plan Paul accepted, or audit-driven):
- **`EZEE_POLLER_ENABLED` default OFF; Railway alone sets 1** — eZee's un-ACKed queue is shared per AuthCode: a dev poller would ACK-consume real bookings the prod mirror never sees (unrecoverable outside backfill). Local iterates on fixtures only; the one sanctioned local live touch is the capture script (poll-no-ACK). New §3.7 registry var — planning chat folds it into plan.md.
- **Mirror grain = one row per reservation UniqueID** (§4's letter; CH-12 dedupe_key + CH-11 "your booking" units); multi-tran → first-tran columns verbatim (amount NEVER summed — §3.4 money rule) + `multi_tran:N` ops alert + planning-chat note.
- **Cancel semantics** (audit-hardened): same-base groups; full-group flip; true-partial alert-no-flip-still-ACK; tombstones for never-seen; ACK always echoes the delivered suffixed id; a partial spread across polls stays on the alert path (recorded residual — CH-11 FetchSingleBooking re-sync is the candidate fix).
- **Resurrection guard**: cancels are ACKed away, so cancelled→confirmed/modified is unprovable-legitimate — status stays cancelled + `ezee_cancel_conflict` alert + suppressed event; checked_in/checked_out pass (proof of life).
- **In-tx event emission** per §3.4's letter via the fromDrizzle shim (commit-then-enqueue was rejected — the tx-send test now pins the stronger contract); `booking.*` payload stays minimal `{reservationNo}` — CH-12 reads the mirror, not the event.
- **raw_events**: non-empty polls only (1,440 empty rows/day is noise, recorded §4 deviation), payload SCRUBBED, `event_type:'bookings_poll'`, processed=true + a not-ACKed summary after the cycle.
- Backfill emits no events; capture never ACKs; `Status:'New'/'Modify' + IsConfirmed≠'1'` → 'unknown' + ops note.

**Observed reality:**
- **pg-boss 12.25.1 ships a `fromDrizzle` adapter that cannot work with drizzle's postgres-js driver** (verified in dist source: `unwrapSQLResult` expects `{rows}`, drizzle returns a bare RowList Array) — found at plan time from the installed package, worked around with the shim, pinned by test. A pg-boss upgrade audit must re-check `dist/adapters/drizzle.js` + `dist/tools.js`.
- **The inline-phone scrub regex eats ISO dates** — `'2027-01-05'` is digit+8[\d-]+digit and matched as a phone; latent in the WA scrubber since CH-02 (WA payloads carry no bare dates), surfaced by the first eZee fixture. Exemption added + pinned.
- BKG-02's own examples show cancel UniqueIDs suffixed per ROOM with distinct VoucherNos — the full-cancel-as-N-entries reading came from the docs and survived 3 independent audit lenses; the live capture must confirm it (§5.2).
- Git Bash `grep -P` refuses non-UTF-8 locales on this machine — the byte-sweep now runs as a Node one-liner (works everywhere).
- Docker Desktop was down again at session start (the CH-06 lesson) — started + health-waited before the DB suites.
- The dev-boot smoke verified end-to-end: migration 0005 at boot, the `eZee poller DISABLED` warn line, config summary presence-only for creds, `booking.*`+`ezee.poll` queues created, NO `ezee.poll` schedule row when disabled (the unschedule path), `/health` 200.

**Deviations from plan.md** (all in the Paul-approved plan or audit-driven; none silent):
`EZEE_POLLER_ENABLED` new §3.7 var (split-brain BLOCKER fix) · `guest_stays` UNIQUE(guest_id,booking_id) (§4 addition) · nullability wider than §4's letter (only key/status/raw/synced_at NOT NULL — tolerance + tombstones) · raw_events non-empty-only + SCRUBBED payload (vs §4 "every payload… as received"; §3.3 wins) · identity-field scrub beyond CC (PAN/Aadhaar-class; mirror is outside DELETE_GUEST) · backfill = explicit id list, not a date range (BKG-03 has no date param) · 'unchanged' upsert outcome + resurrection guard (not in §4's vocabulary) · unconfirmed holds → 'unknown' (no tentative value in §4's enum) · in-tx emission via fromDrizzle+shim · multi-tran first-tran policy + partial-cancel no-flip · `scheduleCron` signature growth · plan §8 CH-10's "Production credentials are already live (env)" was STALE (progress.md was right: local only) · §3.4's degraded flag for eZee deferred to CH-11 (nothing guest-facing consumes it until `get_booking`; the failure ladder + auth alerts cover ops visibility) — planning-chat item.

**Open questions:** none blocking. Planning-chat items (non-blocking): fold `EZEE_POLLER_ENABLED` into §3.7; multi-room reservations (richer typed columns?) before CH-11 surfaces `get_booking`; the partial-cancel-across-polls residual (CH-11 re-sync candidate); whether `booking.modified` should carry the changed-field list (CH-12 currently reads the mirror).

**Forward pointers (do not lose):** **CH-11** — `get_booking` treats `confirmed|modified|checked_in` as LIVE (schema comment); the `stays:[]` admin stub + block [5] stub wire to `guest_stays`; FetchSingleBooking re-sync for `ezee_partial_cancel_suspect`/`ezee_cancel_conflict` rows; consider the eZee degraded tracker here. **CH-12** — register workers for the three `booking.*` queues (14-day retention stated in ensureQueues); scheduler creates guests from mirror rows (supersedes CH-10's no-auto-creation); **the reconciliation sweep MUST exclude/date-filter pre-CH-12 history — backfilled rows carry no events but the sweep re-derives from the mirror (audit critic)**; reuse `sendInTx` for its own tx-coupled sends. **CH-17** — dedupe/circuit-break the per-cycle repeat alerts (`ezee_unackable_reservation`, `ezee_multi_tran_reservation` re-fire every redelivery); `ezee_*` kinds join the WhatsApp ladder. **CH-18** — DELETE_GUEST erases `guest_stays` rows (schema TODO); the `processed=false` re-drive set now includes eZee rows.

**How to verify:** `pnpm check` (761 tests) · local: `docker compose up -d postgres` → `pnpm dev` → boot log shows migration 0005, `eZee poller DISABLED (EZEE_POLLER_ENABLED=0)`, `/health` 200; `SELECT name, policy FROM pgboss.queue WHERE name LIKE 'booking%' OR name LIKE 'ezee%'` → 4 rows, and NO `ezee.poll` row in `pgboss.schedule` · **live (the gate, Paul):** Railway vars + flag → `railway up` → eZee UI test booking (tomorrow, low-risk) → `[ezee] poll processed` in logs + mirror row <60s (prod-DB read via the CH-09 stdin pattern) → modify → `modified` → cancel → `cancelled` → the booking stops redelivering (the ACK-after-commit proof) → `pnpm ezee:capture` locally for the field-name record.

---

#### CH-10 pre-push adversarial audit (2026-07-13) — 42-agent workflow; 1 BLOCKER + 3 DEFECTs confirmed, ALL fixed pre-push

Paul's standing recipe: 5 senior-engineer lenses over the full diff (money-data · db-tx-boss · security-pii · poller-flow · spec-process), every BLOCKER/DEFECT attacked by 3 skeptics (reproduce-it · alternative-explanation · blast-radius), then a completeness critic. 36 findings raised; the serious ones converged on FOUR root causes (three found independently by multiple lenses — the strongest confirmation signal); one PII finding was REFUTED (2/3 skeptics: name/phone/email retention is the documented CH-11 contract, not a leak). All four fixed in one commit (+9 pinning tests, 752→761):

1. **BLOCKER — full cancels of multi-room bookings were being lost.** BKG-02 delivers a FULL cancel of an N-room reservation as N suffixed entries (`12345228-1`, `-2`) with NO bare entry; the per-entry partial guard refused each flip and still ACKed — eZee dequeued the cancellation forever while the mirror kept the booking live (CH-12 would send pre-arrival for a cancelled stay). Fix: same-base grouping per cycle; full-coverage groups flip, true partials stay on the alert path.
2. **DEFECT — the failure ladder reset BEFORE the ACK** (`noteSuccess` after fetch): persistent ACK failures could never reach the 5-consecutive alert while eZee's queue and raw_events grew unbounded, and an auth-class ACK failure re-alerted every 60s. Fix: the ladder settles once per cycle after the ACK; per-item tx failures and thrown cycles count too (poison-pill payloads now alert).
3. **DEFECT — cancel resurrection.** A stale New redelivered after its cancel was ACKed away un-cancelled the row via last-write, with nothing left at eZee to ever correct it. Fix: cancelled is sticky against confirmed/modified (`resurrectionBlocked` + `ezee_cancel_conflict` alert + suppressed event); checked_in/checked_out pass as proof of life.
4. **DEFECT — `Modify + IsConfirmed=0` mapped to live 'modified'** — the unconfirmed-hold gate covered only `New` (the CH-09 narrower-than-contract pattern, caught again). Fix: the gate covers both change verbs.

**Critic/skeptic residuals recorded NOT fixed (deliberate):** first-tran pick is order-dependent for multi-tran redeliveries (could flap `booking.modified`; rare at this property, dedupe absorbs it — planning chat with the grain question) · per-cycle repeat alerts have no dedupe until CH-17 · `processed=false` rows from a crash between insert and close-out have no reconciler (they ARE the CH-18b re-drive set by convention) · registerJobs' eZee wiring is dev-boot-smoke-verified, not suite-tested (thin glue; the queue/schedule rows were inspected in the DB) · the capture script is untested (thin IO over tested parts) · fixture-scrub's eZee key handling is exact-case while the runtime scrub is case-insensitive (capture output is human-reviewed + CI-grepped before commit) · pg-boss job expiry does not abort a hung in-flight handler (a >180s poll could overlap; stately caps it at two and the upsert is idempotent) · Comment/Remark free text persists in raw (key-based scrubbing can't see inside prose; low volume, weekly-review watch).

---

#### CH-10 live close-out (2026-07-13) — deployed, poller LIVE, 62 real items mirrored

**Deploy:** `railway up` from the chunk branch shipped to production behind the `/health` gate; uptime reset (7.5h -> 21s) on hostname `d52b096e8883`, boot log `eZee poller ENABLED (60s cron)`, config summary `EZEE_HOTEL_CODE=set · EZEE_AUTH_CODE=set · EZEE_POLLER_ENABLED=true`. Zero errors, zero ops alerts across the whole run.

**The live run (the DoD):** three polls drained the property's entire un-ACKed backlog — nobody had ever collected it:
```
10:26:26  [ezee] poll processed  acked=30  reservations=5   cancels=25
10:29:52  [ezee] poll processed  acked=28  reservations=13  cancels=15
10:32:48  [ezee] poll processed  acked=4   reservations=4   cancels=0
```
eZee's queue then read empty and STAYED empty (sampled 6x over 6 min) — the ACK-after-commit proof.

**Production DB verification (read-only, Paul-named):** `bookings_mirror` = **62 rows** (= 62 acked, exact): **22 confirmed** (real stays, dates+money verbatim: Airbnb / Booking.com / makemytrip / go-mmt / **Walk-in**) and **40 cancelled** tombstones (cancel entries whose reservations predate the mirror -> `check_in NULL`, by design). **0 rows with status `unknown`**; `raw_events(source='ezee')` = 3, **0 with errors**; sanity checks clean (0 rows with a price but no dates; 0 non-positive amounts). Events queued for CH-12: **22 `booking.created` + 40 `booking.cancelled`**, state `created`, no workers yet (correct). `guest_stays` = 0 — no guest has messaged from those numbers yet (linking is correct, not broken).

**THE AUDIT BLOCKER, CONFIRMED IN PRODUCTION.** The live queue carried TWO real multi-room full-cancellations delivered as suffixed entries with NO bare entry — `877-1/-2/-3` and `894-1/-2/-3` (sequential VoucherNos prove one reservation). All six landed `cancelled`. The pre-push code would have ACKed them away and left those bookings live in the mirror forever. **The BLOCKER was not theoretical — it was sitting in the property's queue waiting.**

**Observed reality (the §5.2 mandate — the live payload is the authority):**
- **Field names confirmed** against the doc-derived types (`pnpm ezee:capture`). Reservation: `UniqueID, LocationId, BookedBy, Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zipcode, Phone, Mobile, Fax, Email, Source, PaymentMethod, IsChannelBooking`. BookingTran adds `FolioNo`, `ExtraCharge`, `PaymentDetail` (not in the docs; ride into `raw` harmlessly). RentalInfo/CancelReservation exactly as typed.
- **`CurrentStatus: "Confirmed Reservation"` is NOT in eZee's documented value list** (docs list only Arrived/Checked Out/Cancel/Void). Our fall-through (unrecognised CurrentStatus -> the Status verb) is what maps these correctly — a strict reading would have marked **every real booking `unknown`** and excluded it from CH-12. The audit's D6 fix is load-bearing in production.
- **BKG-02 polls carry NO `RoomID`/`RoomName`** — so `physical_room_label` is always null from the poller (confirmed: all 22 rows). `FetchSingleBooking` (BKG-03) DOES return them (`RoomID` + `RoomName`, e.g. `5220300000000000008` / `06`). CH-11's enrichment path.
- **The Bookings queue is BATCHED**, not all-at-once: it serves a window, and a fresh batch appears only after the previous one is ACKed. A single poll is never proof the queue is empty.
- **eZee FLAPS: identical requests alternate between full and empty responses.** Observed repeatedly, before and after deploy. Our poller treats an empty reply as a no-op (never as "nothing exists"), which is why this cost nothing — but it means empty polls are silent and the drain looks uneven in logs.
- **`InsertBooking` (BKG-31): the vendor docs are WRONG.** It rejects GET with `ParametersMissing` regardless of payload — it needs **POST + `application/x-www-form-urlencoded`**; and `baserate`/`extradultrate`/`extrachildrate` must be **one value per night, comma-separated, tax-EXCLUSIVE** (a scalar on a 2-night stay returns `InvalidData`). Errors come back **array-wrapped** (`[{"Error Details":{...}}]`), not in the documented `Errors` envelope. Source: the nistula-website codebase, which books live. `rack_rate` is a LIST price (25,000 vs a real 6,500 rate) — never book on it.
- Inventory is held IMMEDIATELY on `InsertBooking`, before any confirm; `ProcessBooking`(ConfirmBooking) only flips status. A booking must be confirmed before it enters the connectivity queue.
- **eZee books at TYPE level:** the test booking for the "Nistula Apartment" type was assigned **Apartment 06** by eZee, not the requested unit — exactly as §5.4 says (never promise a unit).

**Ops traps hit (worth remembering):**
- **PowerShell silently prepends a UTF-8 BOM (`EF BB BF`) to piped stdin** — .NET's `Process.StandardInput` writes its encoding preamble even when writing raw bytes to `BaseStream`. The eZee AuthCode was stored on Railway **3 bytes longer than the real value**, which would have failed eZee auth in production with a misleading error. The length/BOM check caught it; the fix is to pipe from **Node** (`spawn` + `Buffer.from(v,'ascii')`), never PowerShell. **Any future secret-to-Railway move must verify length + BOM, not just "it ran".**
- **`railway up` created a STRAY DUPLICATE PROJECT** when its API call timed out mid-command: the CLI fell back to its "create project from this directory" path despite a valid link (CH-02's trap, again). Deleted by explicit ID (`9c19c032-...`) — **never by name**, since both projects were called `nistula-assistance` and a name-based delete could have destroyed the real one. Always assert the project ID before `railway up`, and grep its output for "Created project".
- The Railway CLI link is fragile: it was lost once before the deploy and again after the delete (`Project is deleted`). Re-link non-interactively with `railway link --project <id> --environment production --service <name>`.
- The app's `DATABASE_URL` is `postgres.railway.internal` (in-network only). A laptop-side read needs the Postgres service's **`DATABASE_PUBLIC_URL`**.

**RESOLVED — website (IBE) bookings DO reach the connectivity queue.** An earlier reading of this session claimed the opposite: test booking `952` (`Source: "Internet Booking Engine"`, `IsChannelBooking: 0`) was created via `InsertBooking` and its CREATE never appeared in the queue (only its cancel did, as a tombstone). **That conclusion was WRONG — it was a BATCHING artifact.** At the time, the queue was clogged with the property's 58-item never-collected backlog, and eZee serves the queue as a WINDOW: the new booking sat behind the backlog and was never reached by the manual polls.

**The clean re-test, run against a fully drained queue (2026-07-13, after the poller emptied it):** booking `953` (same IBE/`InsertBooking` path the new website uses) → **appeared in the queue within a minute** (`UniqueID=953 Status=New IsConfirmed=1 CurrentStatus="Confirmed Reservation" 2026-08-26..2026-08-28 Amt=13854.75`) → the LIVE poller mirrored it (`[ezee] poll processed acked=1 reservations=1`) → cancelled via `CancelBooking` → the cancel flowed back and the mirror row flipped to `cancelled`, with `booking.created` then `booking.cancelled` emitted in order. Room released; eZee left clean.

> **⚠️ The DoD's MODIFY leg was NOT exercised live — and it is not exercisable the way it is written.** plan.md CH-10's "Done when" says *created→mirror→**modify**→cancel*, but **eZee has NO amend/modify endpoint at all** (verified against the docs AND the nistula-website codebase, which cancels-and-recreates instead). A modify can only be produced by a human using eZee's front-desk "Amend Stay" screen; the API path we used cannot make one. **What IS covered:** the `Modify` verb is handled in code (`mapStatus` → `modified`, `eventKindForUpsert` → `booking.modified`) and pinned by tests (`bookings-modified.json` fixture, the poller's "a Modify payload emits booking.modified and moves the dates" case, and the diff battery). **What is NOT proven:** that a live eZee amend produces the wire shape we assume. Zero `modified` rows exist in production. **Cheap closure for CH-11:** ask Paul to amend one booking in the eZee UI and confirm the mirror flips — until then this is an honest gap, not a passed test.

**The standing lesson:** a poll against a BACKLOGGED eZee queue tells you nothing about whether a specific new booking is queued — the window hides it. Only test queue membership against a drained queue. (This is also why the first four minutes of watching `952` proved nothing.) No architectural gap exists; CH-12 can rely on the poller for direct bookings as well as OTA and walk-in.

---

#### CH-10 post-merge close-out audit (2026-07-13) — 36 agents; 2 MORE real DEFECTs found and fixed (PR #32)

Paul asked for a full checkup before closing the session: "is it all BUILT properly" and "is it all RECORDED properly". Five lenses (spec-build · record-truth · record-forward · security-hygiene · data-correctness) + 3 skeptics per serious finding + a completeness critic. **All five lenses confirmed the BUILD is sound** (every plan.md §8 CH-10 step implemented and tested; the suite green at 761 in isolation — note the local ~30 "failures" seen during the audit were TWO concurrent vitest processes corrupting the shared `nistula_test` DB, not a regression; CI on main was green throughout). **The record, however, was NOT fully trustworthy, and two more code holes were found — both of the ORIGINAL BLOCKER's class ("a cancellation is ACKed but never applied").** Fixed, pinned, +2 tests (761→763):

1. **The resurrection guard was a DENYLIST — `unknown` could un-cancel a booking.** `upsertMirrorRow` blocked only `confirmed`/`modified` from reviving a cancelled row. But `unknown` is exactly what an unconfirmed-hold redelivery maps to (`mapStatus`: New/Modify + `IsConfirmed != 1`), and `no_show` slipped through too. Since cancels are ACKed away and never redelivered, one stale payload would have silently un-cancelled a booking with nothing left to correct it. **Fix:** an ALLOWLIST — only positive proof of life (`checked_in`/`checked_out`) may revive a cancelled row. *(The same failure class as CH-06's flat whitelist and CH-09's entitlement screen: **an enumerated rule quietly narrower than its own contract**. Third time. When guarding something, enumerate what is ALLOWED, never what is forbidden.)*
2. **A cancel arriving BEFORE its reservation left the BASE key unguarded.** Suffixed cancels (`877-1/-2/-3`) tombstone under those exact ids, but the reservation itself keys on `877` — and eZee genuinely delivers a cancel without its create (observed live on booking `952`). If the create then arrived on a later poll it would land `confirmed`, and the cancellation — already ACKed away — would be lost forever. **Fix:** the no-target path now also tombstones the BASE id, so a late create hits the resurrection guard (+ `ezee_cancel_conflict` alert, event suppressed).

**Record defects fixed in the same pass:** the retracted IBE claim still stood as a live ⚠️ OPEN QUESTION in the Status header — *the first thing the session protocol makes you read* — contradicting its own close-out (4 of 5 lenses caught this independently); the entry still listed merge/tag/CI as "remaining acceptance" though `vCH-10` was merged and green; plan.md §8 CH-10 step 3's mandate to write the observed field names **as comments in normalize.ts** had never been done (only the progress.md half); and the DoD's MODIFY leg was asserted as met when it was never exercised — and cannot be, since **eZee has no amend endpoint** (see the ⚠️ box in the live close-out).

**Recorded, NOT fixed (deliberate):** `bookings_mirror.raw` keeps real guests' `Address`/`City`/`State`/`Zipcode`/`Gender` (only card + identity-document fields are stripped) and `bookings_mirror` is **absent from CH-18's DELETE_GUEST list** — an erasure gap CH-18 must close · a malformed `amount` from eZee would fail the numeric column and become an un-ACKable poison pill (no validation today; would alert and retry forever) · true-partial cancels, and full cancels split across two polls, are ACKed but never flipped (alert-only; dormant until CH-12) · `turn.ts`/`worker.ts` and now `poller.ts` breach the ~300-line soft cap · commit `c6598d3` (a one-line CLAUDE.md fix) was pushed **directly to main without a PR** — a §3.6 deviation, recorded rather than hidden · the `vCH-10` tag predates the IBE correction, so `git show vCH-10:progress.md` still yields the retracted claim (main is correct; the tag is a snapshot).

**Trap for future sessions:** **never run two `vitest` processes at once** — the DB suites share one `nistula_test` database and TRUNCATE each other's tables, producing ~30 phantom failures across unrelated files. If the suite fails locally but CI is green, suspect this first.

---

### CH-12 · Lifecycle engine (scheduler + templates + window-aware sender) — BUILT 2026-07-14

> **STATUS: BUILT, NOT DONE.** `pnpm check` green at **1205 tests** (1175 at build → 1205 after the
> review). **Outstanding: the production backlog purge and the live demo.** Nothing has been
> deployed and no message has been sent to anybody.

**Built:**
- **`src/lifecycle/gates.ts`** — the four fail-closed gates every booking must pass before a single
  row is scheduled: **epoch** (`created_at >= LIFECYCLE_EPOCH`), **date** (`check_in >= today` IST),
  **status** (`confirmed|modified`, an allowlist), **source** (`LIFECYCLE_SOURCES`, direct-only by
  default), plus a phone check. Pure predicates — no DB, no clock, exhaustively table-tested.
- **`src/lifecycle/templates.ts`** — 6 guest + 4 staff templates. **The Meta approval body is
  GENERATED from the same `render()` the sender uses** (`pnpm templates:pack`), so the approved
  template and the message actually sent cannot drift apart.
- **`src/lifecycle/scheduler.ts`** — `planSends()` (the §2.3 timing matrix, pure) + the `booking.*`
  handlers. Idempotent upsert on `dedupe_key`; a modify RESCHEDULES a pending row, never duplicates.
- **`src/lifecycle/sender.ts`** — minutely, window-aware, transactional claim.
- **`src/lifecycle/reconcile.ts`** — the hourly sweep, gated in SQL as well as in code.
- **`src/wa/client.ts`** (+ `templateSend.ts`, `sendFailure.ts`, split for the ~300-line rule) —
  **the `TODO(CH-12)` that had stood since CH-02 is closed.** The 24h window is enforced at the
  chokepoint for every free-form send — guests *and* staff/ops, whose window lives in the new
  `phone_windows` table, written on every inbound from **Meta's own timestamp** (not our receipt
  time, or a redelivered old webhook would re-open a window Meta had already closed).
- Migration `0007` (`scheduled_messages`, `phone_windows`), 4 new env vars, 3 workers, 2 crons.

**🚨 The production measurement that shaped the chunk (2026-07-14).** The record said
“measure the backlog, never trust a number written here”. It was right, and twice over:
- The `booking.*` backlog was **83** (50 cancelled + 33 created), not ~70.
- **The “123 historical bookings” scare is real but largely self-neutralising, for a reason
  nobody had written down:** CH-11's reconcile hydrated them via `FetchSingleBooking`, which returns
  `checked_out`. The mirror holds **124 `checked_out` + 50 `cancelled` + 24 `confirmed`** and **zero
  `modified`**. Rows that are live-status AND historical: **2**, not 123. The status gate does most
  of that work; the date gate remains the belt.
- **AND THE ONE THAT MATTERS — 12 real OTA guests with UNMASKED phone numbers.** Of the 22
  live-status bookings arriving today or later: **Airbnb 8 (8 with phones)**, **Booking.com 4 (4 with
  phones)**, makemytrip 6 (0 — masked), Walk-in 3 (1), go-mmt 1 (0 — masked). **The comfortable
  belief that OTA numbers are masked and therefore harmless is FALSE.** Without the source gate, the
  first thing this system does in the world is WhatsApp twelve people nobody authorised us to message.
- Every mirror row was created on 13–14 Jul, **134 of them on the cutover day itself** — which
  is why `LIFECYCLE_EPOCH` must be an **instant**, not a date.

**Decisions made while building (Paul-approved before the build):**
- **The four gates**, instead of the plan's single date filter.
- **`LIFECYCLE_SEND_ENABLED=0` by default.** Merging this chunk must not, by itself, start messaging
  people: rows accrue as `pending` and a human flips the switch.
- **Win-back consent is checked at SEND time, not schedule time.** It is captured by CH-15's post-stay
  thank-you ~74 days AFTER the booking is scheduled, so a schedule-time gate would mean the win-back
  could never fire for anyone, ever.
- **The hourly sweep calls the scheduler directly** rather than re-emitting `booking.*` events. Same
  effect (the handler is idempotent), and it avoids inventing phantom jobs in the very queue this
  chunk has a hard precondition to keep clean.
- **`scheduled_messages.skip_reason`** — one column beyond §4: a skipped row that cannot say why
  is unauditable.
- **`docs/product-picture.md` S2 and S6 amended, visibly.** S6's win-back “names the villa” —
  it may not (OQ-19); it names the TYPE. S2's pre-arrival promised a “map pin, host contact” —
  neither exists (OQ-12); it now asks for the arrival time and promises a human sends the pin, which
  is exactly what `kb/faq.md` already promises. plan.md §2.4 corrected to match.

**🚨 A 5-LENS ADVERSARIAL REVIEW FOUND 8 BLOCKER-CLASS DEFECTS. THE SUITE WAS GREEN THROUGH
EVERY ONE.** All fixed, each pinned by a test:
1. **The recurring failure class, seventh instance.** The sender re-used the **scheduling** allowlist
   (`confirmed|modified`) at **send** time. So the moment a stay advanced to `checked_in` /
   `checked_out` — *which is what happens to every stay that actually occurs* — the welcome,
   thank-you and win-back were killed, **permanently** (a resolved row can never be rescheduled). I
   had written a careful comment explaining why re-applying the DATE gate would destroy post-stay
   messages, and then destroyed them with the STATUS gate. **A rule written from an ENUM instead of
   the CONTRACT it stands in for.** The send-time question is *“is this still a booking?”*, not
   *“would we schedule it today?”*.
2. **Wrong recipient.** `guest_id` was not in the dedupe upsert's `SET`, so a phone correction in eZee
   (`guest_phone` is in `MIRROR_DIFF_FIELDS`) left the rows pinned to the FIRST guest row: the
   booking's name, villa, dates and reference would go to a number no longer on the booking, and the
   real guest would get **nothing, silently, for ever**.
3. **Gates never revoked.** A booking re-sourced to `Airbnb` after scheduling kept its five rows and
   sent them. Skipping the new schedule was never enough — the old one had to die.
4. **Transient faults were terminal.** A Meta 429 or a DB wobble burned the message for ever.
   **`pending` IS the retry state**: transient → defer (backed off), terminal → resolve.
5. **“The team has been informed” when it hadn't.** `escalateToOps` discarded the `SendResult`
   and wrote the guardrail-2 evidence row regardless. CH-12's window enforcement made that failure
   *certain* (`phone_windows` is empty on deploy), so every escalation would have been refused while
   every guest was told a human was coming. Evidence now requires a delivery. **Carve-out kept: with
   NO ops number configured the alert log IS the ops channel (D4)** — “nobody is configured”
   and “everybody unreachable” are different facts, and only the second makes the promise a lie.
6. **The welcome offered “a late breakfast”.** The tariff is accommodation-only, the meal plan
   is an opaque code (OQ-16), and no breakfast fee is published — guardrail 1 would have blocked
   the AI from even pricing it if the guest said yes.
7. **`human_active_until` was ignored** — the one chunk that speaks first was the one chunk
   ignoring the human-takeover pause.
8. **Simulate mode wedged the sender.** Undeliverable rows are permanently the OLDEST, so 25 of them
   starved every newer message while alerting once a minute each.

Also fixed: params now refuse ₹ figures, house names and URLs **in the SLOT, not just the
sentence** (the body-level tests scan the `{{1}}` skeleton and could never have caught a poisoned
param); nothing lands at 3 am; “Nistula 4BHK Siolim in Siolim” reads properly; SHOUTING OTA
names are title-cased and eZee's “Walk in guest” placeholder is refused.

**Observed reality:**
- **The dev test number CANNOT prove the closed-window path.** In `simulate` mode a “template”
  is physically a free-form text, so Meta blocks it exactly like any other. Those rows are left
  **pending** (not failed) and go out the moment the guest writes. Only the real WABA, with approved
  templates and `WA_TEMPLATE_MODE=send`, exercises it. **Do not claim that path is proven.**
- The guest's **AI reply still goes silent on a closed window**, and always will: there is no template
  for an arbitrary conversational reply, and there never can be. CH-12 did not fix that and could
  not. What it fixed is that *lifecycle* messages, which do have templates, can reach a shut window.
- **CH-07's ops escalation now fails if an ops number has been quiet for 24h** — the same outcome
  Meta's 131047 already produced, but local and labelled. The runbook's old mitigation (“every
  staff number messages the line once”) **buys 24 hours, not for ever.** TODO(CH-13/14): move
  staff sends onto `sendTemplated` + `nst_escalation_card`, which reaches a shut window.

**Deviations from plan.md:** the four gates (vs one date filter) · send-time win-back consent ·
the sweep calls the scheduler rather than re-emitting events · the `skip_reason` column ·
`gates.ts`, `reconcile.ts`, `db/windows.ts`, `wa/templateSend.ts`, `wa/sendFailure.ts` beyond the
§3.2 layout · product-picture S2/S6 amended. All approved or recorded above.

**Open questions:** **OQ-20** (may we WhatsApp OTA guests at all — 🔴, with 12 real people
behind it) · **OQ-21** (is every eZee booking a real guest, or are some maintenance blocks?) ·
**OQ-22** (do amendments ever reach the feed? we have never seen one) · **OQ-23** (who sends the
location pin the pre-arrival now promises every arriving guest?). All four sit behind fail-closed
defaults.

**How to verify:** `pnpm check` (1205 tests) · `pnpm templates:pack` prints the Meta approval pack
· `SELECT kind, status, skip_reason, send_at FROM scheduled_messages ORDER BY send_at;` shows what
is queued, what was refused, and why.

**⛔ STILL OUTSTANDING — THIS CHUNK IS NOT DONE:**
1. **Purge the production `booking.*` backlog** (**83** at last measurement; it grows daily, so
   re-measure): `DELETE FROM pgboss.job WHERE name LIKE 'booking.%' AND state='created';` The gates
   make those jobs no-ops, so this is belt-and-braces — but it keeps the logs readable.
2. **Set `LIFECYCLE_EPOCH` on Railway** (IST wall clock, at cutover) — with **Node, never a
   PowerShell pipe** (it prepends a UTF-8 BOM).
3. **Live demo** on the test line: a real eZee booking → mirrored → confirmation on Paul's phone;
   move the dates → the pre-arrival reschedules; cancel → the pending rows are cancelled.
4. Then merge, tag `vCH-12`, and update this entry to DONE.

---

### CH-11 · Booking awareness (the guest ↔ booking bridge) — BUILT 2026-07-13

*(`pnpm check` green at **957 tests** (763→934 build, →957 pre-push audit) on `chunk/CH-11-booking-awareness`, 9 commits. The chunk plan was adversarially reviewed BEFORE building by a **105-agent workflow** (5 senior lenses → 3 skeptics per serious finding → completeness critic): 33 BLOCKER/DEFECT findings raised, **16 survived skepticism**, and the critic found the one thing nobody had questioned — CH-11's own premise. A **28-agent decision panel** (pragmatist / safety engineer / systems architect + a judge per question) then settled the four load-bearing decisions, **all Paul-approved 2026-07-13**. Remaining acceptance: Paul's live demo (runbook §CH-11).)*

**Built:**
- **`src/brain/stayView.ts`** — THE only door from a `bookings_mirror` row to words. Block [5], `get_booking`, the admin route and (later) CH-12/13/16 all project through it. A row is **describable** only if ALL hold: status ∈ `confirmed|modified|checked_in|checked_out` · both dates present · exactly one room (counted from `raw.BookingTran`) · no sibling rows sharing a reference base. It NEVER emits the amount, the eZee guest name/email, the meal plan, or a unit label unless `physical_room_label` is set (§5.4). `deriveStage` (`lead|prearrival|inhouse|postguest`) reads **DATES, not status**; `needsHuman` is a SEPARATE flag (CH-16 hard-wires the four stage words to `AUTO_SEND_TYPES`, so a broken booking must never fold into `lead`).
- **`src/db/stays.ts` + migration `0006_reference-attempts`** — `getGuestStays`, `linkStaysByPhone` (the INBOUND direction CH-10 lacked; most guests are mirrored before they ever message), `getMirrorForClaim`, `linkStayByReference`, and the 3-strike log. A row with `guest_phone IS NULL` links to NOBODY — reachable only through a verified claim.
- **`src/brain/referenceClaim.ts` + `src/brain/tools/getBooking.ts`** — §6.4's tool with **ONE argument** (`reference?`) and **one frozen refusal**. See Decisions.
- **`src/brain/stayGuards.ts`** — the stay-affirmation gate (Decision 2), wired into the §6.5 pooled regenerate → defer path with its own `stay_integrity` telemetry rule and `STAY_NUDGE`.
- **`scripts/ezee-reconcile.ts` (`pnpm ezee:reconcile`)** + `client.fetchArrivals` (BKG-05 `ArrivalList`, verbatim per 04_bookings.md:1854) — the answer to "is our mirror complete?".
- **Wiring:** the worker does ONE pre-claim link+read+project, fed to BOTH the policy pass and the turn; block [4] gains five booking rules; block [6] gains the stage line; `PHRASEBOOK.bookingLookupFailed` lands §6.6's missing line; `EscalationReason` gains `booking_reference` (its own channel) + `booking_undescribable`; admin's `stays: []` stub becomes the real PROJECTED join.
- **Tests 763→957:** stay-view (40) · db-stays (11) · reference-claim (26) · tools-get-booking (16) · stay-guards (57) · ezee-reconcile (11) · ch11-defect-fixes (7) · brain-worker-stays (9, the real worker end to end) · red-team 30–37.

**Decisions made while building** (the four Paul-approved via AskUserQuestion after the decision panel; the rest builder-recorded):
- **D1 · The mirror is a CHANGE FEED, not the booking book (Paul).** It holds only what eZee's queue contained on 13 Jul. Nothing establishes those are the property's live bookings. → `pnpm ezee:reconcile` (BKG-05 diff, print-only unless `--apply`, hydrating via BKG-03 — the only call that returns a room). It never ACKs, so it cannot consume the shared queue and is safe to run locally; it takes no boss in its dependency set BY CONSTRUCTION, so it cannot touch CH-12's 62 un-consumed jobs. Both pinned by tests.
- **D2 · An ASSERTION gate, not an evidence licence (Paul; I resolved a split panel).** Registering `get_booking → C1` would cross-license **"the team has been informed"** — `covered()` licenses by CLASS and C1's regex packs `confirmed` in with `informed`/`arranged`. With CH-13 unbuilt that is a pure lie, on the commonest in-stay path. And a 5th class would have needed object-anchored span masking to separate "your BOOKING is confirmed" from "your LATE CHECKOUT is confirmed" — a denylist, the exact failure class this repo has shipped three times. So `get_booking` is registered in **NO claim class**, C1 is UNTOUCHED, and a separate deterministic check asks *is it TRUE?* rather than *did a tool run?* — reading the mirror's own status enum in the same pass that fills block [5], so the gate and the prompt can never disagree.
- **D3 · The tool takes ONE argument (Paul).** §6.4 says the GUEST must state the name and check-in date and that the WhatsApp profile name is NEVER used — but tool arguments are authored by the MODEL, and block [5] prints the (attacker-chosen) pushname into the same prompt. A four-argument tool would let the model fill `name` from the line we just showed it, and no code could tell the difference. So the check runs the other way: we take the name/date **we** hold and look for them in the words the **guest** typed. Pinned by a test that sets the attacker's pushname to the real booking name and still gets a refusal.
- **D4 · Drop the meal plan; fail closed on cancelled and multi-room (Paul).** eZee's own label ("European Plan") is a trap — the model would translate it into "breakfast is included", and NO guardrail checks an inclusion claim (guardrail 1 checks rupees; guardrail 2 checks actions). OQ-16 filed. Cancelled/multi-room rows are announced to the model WITHOUT detail and escalated: silence would make the AI treat a guest with a booking problem as a fresh sales lead.
- **The complaint heuristic is deliberately NOT narrowed** (recorded deviation from §8 step 1 + the `TODO(CH-11)` in policy.ts, which is rewritten so a future session cannot follow it off the cliff). §6.7 says "negative + stay context"; read literally that makes an existing safety guard NARROWER, because linking is phone-only and an OTA-masked guest (Airbnb/Booking.com — the bulk of this property's sources) can never link. An angry in-house guest we cannot see would STOP being escalated. **Stay context may only ever ADD urgency, never remove it.**
- **Linking runs in the WORKER, not the webhook** (deviation from step 1's "on any inbound MESSAGE"): the webhook stores AFTER the 200 ack, on a path Meta never redelivers, so a throw there is unrecoverable AND would sit upstream of the message insert the stale-conversation sweeper keys off. The worker's pre-claim region is retry-safe, and the turn is the true unit anyway.
- Refusals escalate on their OWN channel: the worker's escalation slot is single-valued (`plan.escalate ?? turn.escalate`), so a complaint in the same turn would silently swallow a security alert.
- The 3-strike counter lives in **Postgres**, rolling 24h — not the in-memory window CH-07's cool-off uses. That one guards politeness; this one guards another guest's booking, we redeploy on every merge to main, and a restart would hand an attacker three fresh guesses at numbers that are short and near-sequential.

**Observed reality:**
- **`physical_room_label` is null on ALL 62 production rows and always will be from the poller** (BKG-02 carries no RoomID — CH-10 confirmed on all 22 reservations). So the mirror **cannot tell B3 from C1 today.** §5.4 makes type-phrasing correct and honest, so CH-11 ships it — but product-picture S3/S5 and CH-13's task card need the unit ("send someone to a Nistula Villa" names four different houses). `--apply` hydrates it via BKG-03. The POLICY question (when does eZee assign a unit; may we name it pre-arrival?) is **OQ-15**.
- **Guardrail 2 never caught STATE framing.** Verified against the real lexicon: "Your booking is confirmed", "You're all set for 20–22 Dec", "We have you down for the 20th" ALL passed with zero evidence. Only the perfect passive was caught. State framing is exactly the register the model speaks in once it has booking data — and 40 of 62 mirror rows are cancellations. This was a live hole before CH-11 existed; CH-11 opened the door to it and closes it.
- **A reservation number extracted as a ₹ amount.** eZee's ids here are 3-digit (953, 877) — inside the bare-integer band, above the floor. "Your booking 953 is confirmed and the balance is payable at check-in" deferred with the RATE line and raised a bogus 'price' escalation. Masked globally (a within-sentence lookbehind fails: the splitter breaks on the period in "ref no." — the CH-07 colon lesson, one abbreviation over).
- **The enrichment was self-erasing.** `physicalRoomLabel` is a diff field and polls carry none, so the next 60s poll would wipe every hydrated label AND emit a phantom `booking.modified` into the queue CH-12 must purge. A null from a poll now means "no room information", never "unassigned".
- **The worker e2e caught a bug in my own code:** `needsHuman` keyed on the status-derived `live` flag, so a booking **cancelled for next week** needed no human — because a cancellation is not "live". Exactly backwards. It now keys on DATES (a week back to six months forward); an ancient cancellation is not a problem, and a dateless tombstone never fires.
- The escaping trap struck again (the 4th chunk running): a raw combining-diacritic char class landed in `referenceClaim.ts`. Caught by a byte-sweep before commit and rewritten as `\u` escapes. **The sweep is not optional.**
- BKG-03 stars `BookingId` as REQUIRED (04_bookings.md:1456), so a GuestMobileNo-only lookup is not a documented shape — the CH-10 TODO asking to "probe whether BookingId can be omitted" is hereby answered: we never send one. BKG-05 `ArrivalList` (date range) and BKG-19 `BookingList` (`ArrivalFrom`/`ArrivalTo`) both exist and are reads.

**Deviations from plan.md:** the four Paul-approved decisions above · **§8 CH-11's mandated test "masked-phone OTA guest links on first message" is deliberately INVERTED** — a mirror row with `guest_phone IS NULL` links to NOBODY, and the test asserts exactly that. WHY: the only keys that could match such a row to a first-time WhatsApp message are the eZee name (matched against the **attacker-chosen WhatsApp profile name**, which §6.4 bans outright) or an email WhatsApp never gives us. Auto-linking it would BE the mechanism §6.4 forbids. The satisfiable case — a mirror row carrying the guest's REAL phone but no `guests` row at poll time — does link on first inbound, and is tested. Masked rows are reachable only through the verified reference claim. (Pre-merge review named this; it was in the prose and not in this field, where a planning chat would look.) · linking in the worker, not the webhook · the complaint heuristic NOT narrowed (§8 step 1) · block [5] carries no "plan" and no "countdown" (§8 step 3 — OQ-16; the countdown is derivable by the model from the dates it already has) · `get_booking` returns no ₹ (the plan never asked it to; recorded because guardrail 1 would have BACKED any figure it returned) · new leaf files `stayView/stayGuards/referenceClaim.ts` + `db/stays.ts` (§3.2 lists none; the rupees/summaries precedent) · `reference_attempts` table (§4 lists none) · `EscalationReason` +2 values · `GuardrailRule` +`stay_integrity` · `ToolContext` gains `booking` + an optional `warn` on its logger · `TurnResult` gains `securityEscalate` · `PolicyInput` gains `stayContext` · `client.fetchArrivals` (BKG-05, new).

**Open questions:** none blocking. **OQ-15** (unit assignment: when does eZee assign one, and may the AI name it pre-arrival?) and **OQ-16** (the RateplanCode → ep/cp map, which the website codebase must already hold) are filed rather than improvised — both are POLICY/CONTRACT questions, not content inputs.

**Carried forward from CH-10 (recorded, NOT built in CH-11):** the FetchSingleBooking re-sync for `ezee_partial_cancel_suspect`/`ezee_cancel_conflict` rows — CH-11's reconcile hydrates MISSING and UNLABELLED bookings, it does not re-verify a suspect cancel. Those stay a hand job (runbook §CH-10 corrected accordingly; a re-sync is a CH-17 candidate). The eZee degraded tracker also stays deferred, and the deferral still holds for the same reason: `get_booking` reads the MIRROR, not eZee live, so nothing guest-facing depends on eZee being up.

**Forward pointers (do not lose):** **CH-12** — the 🚨 `booking.*` job precondition still stands, but **MEASURE the count, do not trust a number written here** (62 → 67 → ~70; it grows every day the poller runs). **The reconcile also put 123 HISTORICAL bookings into the mirror**, so purging the jobs is NOT sufficient on its own: CH-12's hourly sweep reads the MIRROR, and would happily schedule a pre-arrival message for a stay that ended in March. **Date-gate the sweep AND the handler (`check_in >= today`) — treat that as mandatory, not an optimisation.** The scheduler creates guests from mirror rows (superseding CH-10's no-auto-creation) and MUST consume through `stayView` — never a raw row. **CH-13** — register `create_staff_task → {C1,C2}` in TOOL_CLAIMS; block [5]'s `Open tasks:` stub is the last one left. **🚨 The task card CANNOT be built on `physical_room_label` — it is eZee's arbitrary auto-assignment, NOT the house the guest booked (OQ-19).** A card routed on it sends housekeeping to the wrong door. CH-13's villa routing is **BLOCKED on the OQ-19 PMS re-model**, not on hydration — an earlier version of this very line told you to run `--apply` so the card "can name a villa", and that instruction was wrong. **CH-14** — `escalate_to_human → {C3}`; `booking_reference` and `booking_unit_unknown` are already EscalationReasons. **CH-16** — the stage→reply_type map (lead→presales, prearrival→arrival, inhouse→instay, postguest→poststay); `needsHuman` is the separate flag that keeps a broken booking out of auto-send. **CH-18** — DELETE_GUEST must erase `guest_stays` AND `reference_attempts` (both guest-keyed; `deleteReferenceAttempts` exists).

**How to verify:** `pnpm check` (998 tests: the status×dates×rooms matrix, the byte-identical-refusal invariant across all six failure paths, the pushname attack, the cross-licensing regression, both stage boundary days, and the never-ACK/no-event reconcile invariants) · local: `docker compose up -d postgres` → `pnpm dev` (migration 0006 applies) → seed a mirror row on a fixture phone → signed POST "when is my check-in?" → correct date, villa TYPE, no invented ₹ · **live (Paul, pre-merge `railway up`, /health uptime reset FIRST):** the runbook §CH-11 probe — starting with `pnpm ezee:reconcile`, whose MISSING count is this chunk's headline finding.

---

#### CH-11 pre-push adversarial audit (2026-07-13) — the recurring failure class, caught a FOURTH time

Paul's standing recipe, run against the COMMITTED code (not the plan): senior lenses over the full
diff, every BLOCKER/DEFECT attacked by independent skeptics, then a completeness critic. **2 BLOCKERs
+ 4 DEFECTs confirmed, ALL fixed** (`pnpm check` 934 → **957**). Worth remembering:

1. **BLOCKER — `live` was keyed on STATUS, so a PAST stay read as upcoming.** The build already knew
   that no production row is ever `checked_in` (a front-desk check-in never comes down the queue) and
   derived the STAGE from dates because of it. But the per-row `live` flag — which gates the
   stay-affirmation guard, block [5]'s "(a past stay)" note, and `get_booking`'s status label — was
   still `LIVE_STATUSES.includes(status)`. A guest whose stay ended in March is still `confirmed`
   (no check-out event ever arrives either), so they counted as LIVE: the guard that stops the AI
   inventing a booking was **DISARMED for every past guest**, which is precisely the win-back
   population CH-15 exists to message. **The same failure class as CH-06's flat whitelist, CH-09's
   entitlement screen and CH-10's resurrection denylist — an enumerated rule quietly narrower than
   its own contract. Fourth time. The lesson did not transfer because the FIRST derivation (the
   stage) got it right and the SECOND (the flag) was written from the status enum.** Fix: `live` =
   a live status AND not already ended.
2. **BLOCKER — block [5] promised a human who was never called.** For an undescribable booking the
   block tells the model "the team is being brought in", and `get_booking`'s refusal says a colleague
   is looking into it. But **nothing escalated** unless the model happened to use a C3 referral
   phrase that guardrail 2 then made true. A guest with a cancelled booking for next week could be
   told a person was on it while no person ever heard. Fix: the worker escalates deterministically on
   `needsHuman`, on its own reason, whatever the model writes.
3. **DEFECT — the stay-affirmation lexicon was a denylist narrower than its "broad" contract.**
   Fifteen phrasings **block [4] itself teaches** ("Your stay runs 20–22 Dec", "I can see your
   reservation", "Your villa is ready", "check-in on the 20th") sailed straight through for a guest
   with no booking — the module's own docblock claimed a broad lexicon. Widened and pinned by the
   exact register that exploited it, while keeping a lead's pre-sales prose and the "check-in is from
   3 pm" policy answer un-tripped (the over-fire is as real a bug as the under-fire).
4. **DEFECT — the 3-strike counter could double-charge an honest guest.** The strike was written
   PRE-CLAIM inside the tool, so a `converse()` failure and a pg-boss retry would run the tool loop
   twice and bank two strikes for one typo. Fix: the tool SIGNALS; the worker records once,
   post-claim (CH-03 D2 — the same rule the whole worker is built on, missed inside a tool).
5. **DEFECT — an owner was punished for asking about their own cancelled booking**, and a date RANGE
   ("26–28 August" — how people actually state a stay) never verified, because only single dates
   parsed. Also an ISO date was double-counted as a phantom second date, pushing honest two-date
   messages over the dictionary-attack cap.
6. **Escalation reasons split** so no ops card lies: `booking_reference` (an identity probe),
   `booking_undescribable` (a real booking a human must handle), `booking_overclaim` (the AI insisted
   on a booking the guest does not hold — which may mean **our mirror is missing it**, the D1 gap).

**The meta-lesson, recorded because it is now a pattern:** every one of the four recurrences was a
rule written from an ENUM rather than from the CONTRACT the enum was standing in for. `status` is not
`live`. A whitelist of figures is not "fees published in policies.md". A list of forbidden statuses is
not "proof of life". When the next chunk guards something, write the predicate from the SENTENCE that
states the rule, and let the enum be an implementation detail underneath it.

---

#### CH-11 pre-merge review (2026-07-13) — 3 senior reviewers; 3 more real bugs, one live in production data

After the pre-push audit, three independent senior engineers were put on the remaining open
questions (the villa-unit path, completeness vs plan §8's DoD, and the mirror gap). Two returned
"merge: NOT BLOCKED". The completeness reviewer returned **NOT MERGE-READY** and was right.
`pnpm check` 957 → **963**. What it found:

1. **A reservation is a FAMILY of rows, not one exact id — and the exact-match read punished the
   OWNER.** `get_booking` resolved a claimed reference with an equality match on
   `ezee_reservation_no`. But eZee delivered bookings **877 and 894 to this property as
   `877-1/-2/-3` with NO bare entry** (the CH-10 audit BLOCKER — those rows are in the mirror right
   now). A guest typing their own number, "877", therefore matched nothing, failed verification,
   **took a strike toward the identity lockout, and was paged to ops as a suspected probe.** The
   fix (`getClaimFamily`) resolves the bare id and every `-N` sibling, and links all of them.
2. **The same read made the tool a SECOND DOOR past the stay view.** It projected each row as its
   own only sibling (`project(row, [row], today)`), so the sibling guard was **structurally
   unreachable**: block [5] refused to describe a multi-room booking while `get_booking` described
   it cheerfully from the first room's columns. The module whose entire premise is *"the ONE door
   from a mirror row to words"* had a second door, opened by its own caller. This is the
   enumerated-rule failure class in a new disguise — the rule was right, the CALLER bypassed it.
   **Lesson: a "single door" is only single if every caller is forced through it; a guard that
   takes its own context as a parameter can be handed a context that disarms it.**
3. **An ops card that lied in exactly the case that matters.** A guest holding a cancellation for
   next week has no LIVE stay, so a booking affirmation deferred with `booking_overclaim` — whose
   card reads *"our system shows none on this number"*. False: the system shows a cancellation. And
   setting that reason **suppressed** the truthful `booking_undescribable` escalation entirely.
   `hasLiveStay` conflated "holds nothing" with "holds something we may not describe"; they now
   page separately (`stayEscalation`).
4. **`stayContext` was DEAD.** `policy.ts` declared it, never read it, and the comment claimed it
   "rides the directive". The Paul-approved deviation it stood for — *stay context may only ever ADD
   urgency, never remove it* — therefore bought **nothing**. It is real now: the ops card tells the
   human that the guest complaining about a broken AC **is standing in one of our villas right now**.
5. **Block [6] asserted something we cannot know.** *"This guest has no booking with us yet"* is a
   CLAIM; our mirror is a change feed, so a real guest we never captured lands there too — and
   telling the model they have no booking is precisely what makes it pitch a villa to someone
   standing in one. It now says what we can SEE, and points the model at the recovery.
6. Smaller: `get_booking` joined the leak tripwires (matched **longest-first with the hit masked**,
   or it would double-fire inside `get_booking_link`); the §6.6 booking-lookup line was dead and is
   now in the phrasebook block; `--refresh` exists because hydration was fill-if-null **while the
   poller COALESCEs a null-from-poll** — so a villa label, once written, was never revisited by
   anything, and a guest moved B3→C1 would be told the old villa forever.

**The two "NOT BLOCKED" reviews still changed the record, and their corrections matter more than
their verdict:**
- **The reconcile fixes the MIRROR, not the RECOGNITION.** Linking is phone-keyed, and this
  property's confirmed bookings are largely Airbnb / Booking.com / MakeMyTrip — whose numbers eZee
  masks, giving `guest_phone = NULL`, which links to **nobody by design** (§6.4 forbids the only
  other key, the attacker-chosen WhatsApp name). So `--apply` can bring the mirror to 100% and **the
  Airbnb guest standing in Villa B3 is still staged a lead** until they quote their reference. The
  D1 narrative previously implied the reconcile solved that. It does not. Runbook corrected.
- **Do not schedule the reconcile.** A scheduled writer racing the 60s poller would write a genuinely
  NEW booking's row first; the poller's next poll would then diff to `unchanged`, and
  **`booking.created` would never be emitted** — CH-12's confirmation for that guest silently never
  fires. Eventless-by-construction is right for a one-shot over history and a latent
  lifecycle-suppression bug on a cron. It stays a hand-run script.
- **The `DATABASE_URL` footgun**, now loud in the runbook: the script reads the LOCAL `.env`, so an
  unguarded run diffs eZee against an **empty local mirror**, reports "MISSING: everything", and
  `--apply` hydrates the **wrong database**.
- **OQ-17 filed** (→ CH-14): on the *well-behaved* path — the model honestly says "I can't see a
  booking; what's the name and check-in date?" — **nothing deterministic escalates**, and no tool can
  act on a name + date. The safe path and the escalating path are the same path *by luck of
  phrasing*. That inverts this repo's own rule that safety is code, not model behaviour.

---

#### CH-11 · the website audit (2026-07-13) — §5.4 becomes CODE, and OQ-16 is closed by NOT building it

Paul ran the stored read-only extraction prompt against `chinmoypaul8897/nistula-website`. It
answered two open questions and produced one finding that changed the code.

**1. OQ-16 (RateplanCode → ep/cp): CLOSED — "do not build the mapping." It does not reliably exist.**
- The website's own EP/CP resolution is **POSITIONAL, not semantic**: `plan === 'cp' ? villa.extraRatePlans[0].id : villa.ratePlan.id`. Nothing checks that `extraRatePlans[0]` IS the CP plan — eZee's MASTER flag is absent on this property.
- **CP is not sellable.** The create path never selects a plan at all: it always sends the primary (EP) rate plan, and `BookingRequest` has no `ratePlanId` field. There is no channel by which a plan choice could reach eZee. A CP price is obtainable only from a hand-crafted read-only `/api/quote?plan=cp`, and that price can never become a booking.
- The 19-digit rate-plan ids are **not in the website's runtime code at all** — only in a point-in-time doc snapshot. Rate plans are per ROOM TYPE, not per villa.
- An OTA booking (Airbnb / Booking.com — most of this property's volume) can carry a rate plan we have never seen.
**So CH-11's D4 decision to ship no meal plan was right, and is now permanent.** OQ-07 (breakfast) is answered by the same audit: EP only. Our KB already carries the website's published copy verbatim — *"accommodation only unless breakfast is specifically listed in the booking"* — so **no KB change was needed.** (The site itself contradicts that with a "Breakfast" amenity chip and a "Breakfast sorted" marketing pill; neither is truth, and the concierge answers from the KB.)

**2. OQ-15 (the villa unit): the MECHANISM is settled, and it forced new CODE.**
The website's booking engine sends eZee a **ROOM TYPE and never a physical RoomID** (`Roomtype_Id`; no
RoomID field exists in the payload). eZee picks the house. **But the website SHOWS the guest a named
individual villa** — "Villa C3" — from its own editorial overlay, and stamps individual villas
"Booked". The website auditor's own words: *"the site promises a specific unit, but the booking
reserves only a TYPE… the villa name is a DISPLAY fact, not a RESERVED fact."* Nothing there
reconciles or alerts when eZee assigns a different sibling.

**Therefore a guest will tell us "my Villa C3 booking" — in perfect good faith, because WE told them
that — while eZee may have put them in C1.** If the model echoes it, we lend our authority to an
error the guest cannot check, and CH-13 dispatches housekeeping to the wrong house. §5.4's unit rule
was **prompt-only** (a block [4] instruction), and the guest's own words are the strongest possible
prompt to echo — so the instruction was standing exactly where it was weakest.

**`scanUnitAssertions` (stayGuards.ts) makes §5.4 deterministic.** The AI may name a unit ONLY when
the mirror assigned one, and only THAT one; naming any other — **including one the guest named
themselves** — regenerates, then defers and pages a human (`booking_unit_unknown`, whose card tells
them the guest may have named it themselves and may be wrong). Scoped to ASSIGNMENT framing, so
pre-sales description is untouched: *"C3 wraps around its own pool"* is legal (it is a voice-guide
exemplar); *"your stay is in C3"* is a claim about who sleeps where. 14 new tests, both directions.

**The POLICY half of OQ-15 stays open and no API can close it:** when does the front desk actually
assign the house, and is an assignment stable enough to tell a guest before they arrive? Paul + front
desk.

**3. 🚨 A website finding that is not ours to fix, recorded as OQ-18.** `POST /api/debug/booking/create`
calls the real BKG-31 create against LIVE eZee, with an arbitrary `villaId`, `isTest:false` (skipping
the "TEST " name prefix), **no auth and no NODE_ENV gate** — it ships in production. And the booking
kill-switch (`NISTULA_BOOKINGS_DISABLED`) is checked in exactly ONE place, which those debug routes
bypass. This matters to US because every eZee booking flows into `bookings_mirror` and becomes
something the AI speaks about — and eZee holds inventory immediately on `InsertBooking`, before any
confirm. Recommend gating before the real number goes live.

---

#### CH-11 live reconcile (2026-07-14) — 🚨 the mirror held 21 of 144 bookings. The poller is fine; the HISTORY was missing.

Deployed the CH-11 branch (`railway up`; uptime 65,204s → 8.8s; boot clean, `kbVersion=b763d4da`,
`kbTokens=2461`, **`quirksPresent=false`** — the two invented placeholder quirks are gone from the
live line). Then ran the reconcile against production.

**The headline number, and the reason this chunk exists:**

| Window | at eZee | in mirror | **MISSING** |
|---|---|---|---|
| 15 Apr → 11 Nov (the full window) | 144 | 21 | **123** |
| **FUTURE arrivals** (15 Jul → 11 Nov) | 18 | 18 | **0** ✅ |
| **RECENT arrivals** (25 Jun → 14 Jul) | 18 | 3 | **15** 🔴 |

**85% of the property's bookings were invisible to the AI.** But the SHAPE of the gap is the
finding, and it took the second and third probes to see it:

- **The poller is NOT losing bookings.** Every future arrival was already mirrored — 18 of 18.
  **CH-12 is safe to mount on this feed.**
- **The mirror captures bookings by when they were CREATED, not when the guest ARRIVES.** Future
  arrivals were booked recently, so their create events were in the backlog the poller drained on
  13 Jul. Guests arriving NOW were booked months ago — before the queue ever captured anything.
- **Hence: 15 of the last 18 arrivals were missing — people standing in the villas, invisible.** A
  guest in-house today who messaged the line would have been staged a LEAD and sold the house they
  were standing in. The D1 hypothesis was not theoretical; it was live.

**`--apply` result: 144 upserted, 0 failed.** Verified in the production DB:

| | before | after |
|---|---|---|
| `bookings_mirror` rows | 65 | **188** (+123 = exactly the missing count) |
| rows **with a villa label** | 0 | 143 — **but see the OQ-19 retraction below: these are eZee's GUESS, not the guest's house** |
| rows with a usable phone | 17 | **129** |
| `booking.*` jobs (the CH-12 precondition) | 67 | **67 — UNCHANGED** ✅ |
| `raw_events(ezee)` errors | 0 | 0 |

**⚠️ RETRACTED — see the OQ-19 addendum below.** This section originally read *"the villa labels
landed… CH-13's task cards are now buildable"* and celebrated the 143 hydrated labels as a win.
**That was wrong and it was dangerous.** Within the hour, OQ-19 established that a
`physical_room_label` is **eZee's own arbitrary pick, not the house the guest booked** — eZee holds
8 houses inside 3 room TYPES, so a booking cannot name a house at all, and eZee auto-assigns
lowest-number-first. **A task card built on these labels would send housekeeping to the wrong door.**
The labels remain in the mirror (ops still wants to know which door eZee has a booking against), but
the AI's licence to SPEAK one is withdrawn (`TRUST_EZEE_ROOM_ASSIGNMENT = false`). `guest_stays` is
still 0 — correct: linking happens on the guest's first inbound message.

**The no-events invariant HELD IN PRODUCTION**, not merely in tests: 123 rows written, `booking.*`
job count unchanged at 67. `--apply` cannot wake CH-12 early.

**Observed reality — an UNDOCUMENTED eZee limit (§5.2's mandate: the live payload is the authority):**
- **BKG-05 ArrivalList caps the window at ONE MONTH.** A 210-day range returns
  `{"ErrorCode":"112","ErrorMessage":"Error: Date range is too long. Please provide dates for 1
  month."}` — **error 112 is not in BKG-05's documented error list, and no cap is mentioned anywhere
  in its docs.** Same class as InsertBooking's POST + per-night rates: *the vendor docs are wrong.*
  The reconcile now pages in 28-day slices, and **fails CLOSED if any slice fails** (a failed slice
  hides its bookings, and a hidden booking does not show up as MISSING — a partial run would report
  a FALSE ALL-CLEAR, the one direction that must never happen).
- **The BKG-05 doc contradicts itself, and we had it right.** Its parameter TABLE lists
  `from_date`/`to_date` as top-level (probed live: returns *"From Date is missing"*); its request
  EXAMPLE nests them under `Date{}` (works). **Table wrong, example right.**
- **BKG-03 corrects status, not just rooms.** Re-fetching gave `checked_out` for guests the queue
  still had as `confirmed` (a front-desk check-out never comes down the queue). Harmless here —
  `stayView` derives `live` and the stage from DATES precisely because of this — but CH-13 must
  never key anything on `status === 'checked_in'`.

**Recorded, NOT fixed (for CH-12):** the mirror now holds **123 historical bookings**. CH-12's hourly
reconciliation sweep re-derives from the mirror, so **it MUST date-filter** or it would schedule
confirmations and pre-arrivals for stays that ended months ago. This makes CH-12's existing
precondition sharper, not new.

---

#### CH-11 · 🚨 OQ-19 (2026-07-14) — a guest cannot book a specific HOUSE. eZee picks it. And I armed the AI with the guess.

**This is the biggest finding of the chunk, it BLOCKS the website launch, and it is not a bug in our
code — it is a bug in how eZee is configured, which CH-11 was simply the first thing to notice.**

**The chain, every link now proven:**
1. **eZee is configured as a HOTEL, not a villa company.** Eight houses, but only **three room types**
   (Nistula Apartment / Nistula Villa / Nistula 4BHK Siolim). Apartment 06, 09 and 11 are **the same
   bookable product** — an interchangeable pool.
2. **So a booking cannot carry a house.** `InsertBooking`'s `Room_Details.Room_1` accepts a rate plan,
   a rate type and a room **TYPE** — and **no field of any kind** for a physical house (BKG-31).
3. **The website drops the guest's choice at that boundary** — its own read-only audit: the chosen
   house (`villa.id`, which IS the eZee RoomID) *"appears NOWHERE in buildBookingData"*. Nothing calls
   `AssignRoom` afterwards.
4. **eZee auto-assigns, lowest-number-first.** PROVEN TWICE: reservations **953** and **957**, both
   booked as "Nistula Apartment", were **both parked in Apartment 06**.
5. **The website's confirmation page then reads the house back FROM eZee and prints it** — so the guest
   is shown the house eZee picked, **not the one they bought**.
6. The guest's real choice survives **only** in the website's own Postgres — a row nobody in eZee sees.

**A guest can pay for Apartment 09 and be told, on their own confirmation screen, that they have
Apartment 06.** Nobody is lying on purpose. Nobody even knows.

**⚠️ AND I MADE IT WORSE, LIVE, FOR ABOUT AN HOUR. Own this one.**
I ran `pnpm ezee:reconcile --apply`, hydrated **143 villa labels**, and wrote *"CH-13's task cards are
now buildable"* in this very file. But CH-11's own unit guardrail treats a villa label as **the AI's
permission to name that house** (§5.4: *"name a unit only when `physical_room_label` is assigned"*).
That rule was written believing the label meant **"the house this booking IS for."** It does not. It
means **"the house eZee happened to PICK."** So I handed the AI **143 fabrications and told it they
were facts**, and it was licensed to tell an in-house guest, with total confidence, that they were in
a house they never booked.

**Fixed: `TRUST_EZEE_ROOM_ASSIGNMENT = false` (stayView.ts).** The AI speaks the villa **TYPE** —
exactly what it did before the labels landed, and what §5.4 always *meant*. **Deployed and PROVEN
LIVE:** the production DB was deliberately loaded with eZee's guess for the demo booking
(`physical_room_label = 'Apartment 06'`), and the AI **still refused to name it** — Paul probed
*"which apartment am I in?"* and it spoke the type. **Saying less is free. Saying the wrong house is
not.** The labels STAY in the mirror (ops still wants to know which door eZee has a booking against);
only the licence to SPEAK one is withdrawn. **Flip the constant back the day a house is genuinely the
thing that was booked** — the tests around it spell out exactly what starts working again.

**THE RECURRING FAILURE CLASS, A FIFTH TIME — and this one is the purest example yet.** CH-06's flat
price whitelist, CH-09's entitlement screen, CH-10's resurrection denylist, CH-11's `live`-keyed-on-
status, and now this: **a rule written from a FIELD rather than from the CONTRACT the field stands in
for.** §5.4 said "name a unit when `physical_room_label` is assigned" and I implemented exactly that
— faithfully, and wrongly, because the *field* was never the *fact*. **The lesson has now cost five
findings: write the predicate from the SENTENCE that states the rule, and treat the column as an
implementation detail that may be lying to you.**

**Recommendation (an 8-agent panel: 4 options → 3 skeptics → judge):** get the **eZee account manager
on a call** and re-model the property so **each house is its own bookable product — one house, one
product**. It is not exotic: **Siolim already works this way** (one room type, one house) and is *the
one house eZee can never get wrong*. The fix is "make the other seven look like Siolim." **It is not
an engineering project** — none of eZee's ~92 external endpoints can create or alter a room type; it
happens in eZee's back office. Rejected: `AssignRoom` (eZee assigns at creation, there is no
un-assign anywhere in the API, and it would do nothing for OTA bookings) and selling types (it
contradicts the entire product).

**Honest cost:** rates/availability/stop-sells go from 3 products to 8 — roughly **2.5× the recurring
admin** for a two-person team. The migration's danger is concentrated in the **OTA channel remap**
(Airbnb / Booking.com / MakeMyTrip / Agoda / Expedia), which has **no dry-run and no undo**. And
per-listing availability will collapse from a pool to 1, so OTA listings will read "sold out" far
more often — **week one will look like a revenue drop and is not one.**

**⚠️ THE "OPEN THREAD" — RAISED, THEN CLOSED BY PAUL THE SAME DAY. IT WAS A FALSE ALARM.**
This section originally read: *"Airbnb is 79% clustered on Apartment 06… if the channel manager maps
all three listings onto one room type, Airbnb guests are being sent to the wrong apartment TODAY."*
The data was real — `Airbnb 06:27 09:1 11:6` · `Booking.com 06:2 09:7 11:3` · `makemytrip 06:1 09:9
11:5` · `Walk-in 06:3 09:9 11:11` — but **the inference was wrong, and it was wrong because I was
reasoning about the business from the database instead of asking.**

**What is actually true (Paul, 2026-07-14):** the OTAs sell only **two products — "villas" and
"apartments"** — as CATEGORIES. **An OTA guest never chooses a house**, so eZee (or the front desk)
assigning one is not an error, it is the normal process. And the 06 clustering is explained by
**apartments being blocked for maintenance** — when 09/11 are closed, everything piles onto 06.
**No OTA guest is getting the wrong apartment. There is no live harm.** OQ-19 is a **pre-launch
WEBSITE problem only.**

**A second false alarm from the same session, also closed:** I then worried that the front desk
reassigns guests around maintenance, so a hydrated label could go stale. **It cannot** — Nistula
**closes the dates BEFORE** maintenance, so a booked guest is never moved out of a house. (A general
label-refresh is still worth doing eventually; Paul parked it for v2.)

**THE LESSON, and it is the one Paul already named as a standing rule:** both scares came from
inferring how the business works out of a data pattern. The distribution was real; the story I built
on it was not. **A number in the mirror cannot tell you what the business meant by it —
[[build-tech-first-ask-business-once]] exists for exactly this.** Ask, don't infer.

**What survived, and it is confirmed:** Paul read the website code himself and **confirmed OQ-19 is
real** — the site sells a specific house, `InsertBooking` has nowhere to carry it, and the
confirmation page reads eZee's pick back to the guest. **He is fixing it on the website side.** The
AI names no house regardless, which is safe in either world.

**Also found in a booking's raw payload (worth confirming, NOT actioned):** the property's own
reservation note carries a meal price list — *"Breakfast costs Rs. 500 per person per night. Lunch
Rs. 750. Dinner Rs. 750."* Consistent with the KB (tariff = accommodation only), but it means the
honest answer to "is breakfast available, and how much?" **exists** and the AI cannot say it. A note
in an OTA comment field is not a published policy, so **nothing was actioned** — filed for the team.

**Forward pointers (do not lose):** **CH-13** — the task card CANNOT be built on `physical_room_label`
while OQ-19 is open; it is eZee's guess and would send housekeeping to the wrong door. **CH-12** — the
reconcile added **123 HISTORICAL bookings** to the mirror; the hourly sweep re-derives from the mirror
and **MUST date-filter**, or it will schedule confirmations for stays that ended months ago. **The
`booking.*` backlog is ~70 and GROWS DAILY — measure it, never trust a number written here.**

---

#### CH-11 · close-out audit (2026-07-14) — 4 real defects, 2 false alarms, and the failure class showing up for a SIXTH time

Ran the standing pre-merge adversarial audit (5 lenses → skeptics → judge). I over-scaled it to 68
agents on an already twice-audited chunk — 3 hung, Paul waited ~30 minutes for nothing, and that is
on me: the recipe is meant to be right-sized to the risk. The findings below were worth having; the
agent count was not. **`pnpm check` green at 998 tests** (982 → 998).

**What was real, and fixed:**

1. **🚨 BLOCKER — `scanUnitAssertions` missed 6 of 12 natural ways to name a guest's house.** This is
   the guard that OQ-19's entire safety story rests on, and it was written from **four assertion
   SHAPES** rather than from the contract. `"Your house is Apartment 09."` (copula), `"You have been
   allocated Apartment 06."` (passive), `"The house allocated to you is Apartment 11."` (relative
   clause), `"I can see Apartment 06 against your booking."`, `"Head to Apartment 11 on arrival."`
   and `"That would be Apartment 06."` all walked straight through. **This is the SIXTH instance of
   this repo's signature failure class: a rule written from an ENUM or a LIST rather than from the
   CONTRACT it stands in for.** Rewritten from the contract — post-OQ-19 `stayView` emits no house
   label at all, so the model's ONLY source for "Apartment 06" is the guest's own message, and the
   rule collapses to: *naming a house is legal (it is how we sell); BINDING one to this guest never
   is.* A violation is now a unit token co-occurring in one sentence with a cue that binds it —
   possession, occupancy, allocation, a claim to see it on our record, an arrival directive, or an
   ECHO of the guest's own guess. 16/16 of the attack corpus blocked, 0/6 false positives on
   pre-sales prose.
2. **The rewrite's own false positive, caught by the existing suite — and the CH-06 lesson, relearnt.**
   The first version blocked `"Your two nights at Villa B3 come to ₹34,000"` — the product's core
   pre-sales QUOTE, and the revenue path. Possession alone cannot tell a quote from an assignment.
   Fixed with the pattern this repo already had to learn once for KB fees: the exemption is
   **CONTEXT-BOUND** — possession is a violation *unless its own sentence is a quote* (`PRICE_CUE`,
   now exported from `rupees.ts` so "is this sentence about money" has ONE definition). And a price
   cue can **never** rescue a STRONG cue: `"You are in Apartment 06 and the total comes to ₹34,000"`
   is still a violation. Both directions are pinned by tests. **Never flatten this into "a ₹ figure
   anywhere makes a unit mention legal"** — that is exactly the bug CH-06 shipped and had to fix.
3. **DEFECT — `unit_integrity` was never persisted.** The OQ-19 guard fired, nudged and regenerated
   while leaving **no row in `raw_events`** — so the one signal that the AI had tried to hand a guest
   the wrong house was invisible in the weekly review. Breaks CH-07's "every guardrail hit is
   persisted" rule, on the chunk's own newest guard. Added the rule + the `recordViolations` branch,
   and taught the `sent_after_regen` ladder about stay/unit (a unit regenerate was being filed as
   `length_format`).
4. **DEFECT — `ezee-reconcile` printed a FALSE ALL-CLEAR, three lines under a comment saying it must
   never do that.** On a failed ArrivalList slice it returned `missing: []` — **byte-identical to a
   clean run** — logged the error, printed `MISSING: 0` and exited 0. An operator would have been
   told the mirror was complete on the strength of a call that never happened. The fail-closed
   branch was real; only its *reporting* was not. Added `aborted`, and `main()` now prints
   `RANGE INCOMPLETE — NO CONCLUSIONS` and exits 1. **The existing test passed throughout, because
   it asserted only `missing: []` — the ambiguous half.** Both halves are now asserted.
5. **A money cue gap (older than CH-11, closed here).** `"The booking comes to 45000 for the two
   nights"` extracted NOTHING — the `comes to / works out to / amounts to` family was not in
   `PRICE_CUE`, so a fabricated total shipped unchecked past guardrail 1. It fails on `main` too, so
   it is **not** a CH-11 regression — but CH-11 is the chunk that first lets a guest ask what their
   booking COSTS, so it closes here. Adding a cue only ever makes us extract MORE and defer MORE: it
   fails closed by construction.

**What the audit got WRONG — recorded because a false alarm is a finding too:**

- **"CH-11's reference mask reopened the money guardrail."** It did not. I diffed the CH-11
  extractor against `main` over a money corpus: every behaviour change is CH-11 correctly dropping a
  **reference number** (953, 45123) while still catching the real amount in the same sentence
  (45000, 18000). The mask is tight. The real gap was the cue family above, which is a different
  bug and predates the chunk.
- **"`pnpm check` fails 3 runs in 4 on a Postgres deadlock; the 982-green claim never happened."**
  Refuted by running it. The one failing run had **993 tests, not 982** — it had swept up my
  half-saved edits mid-flight. Contaminated, not flaky.

**The lesson, and it is the same one for the sixth time.** Every serious finding in this chunk — the
pre-push audit's `live`-keyed-on-status, the pre-merge review's sibling-guard bypass, and now the
unit guard — is the same shape: *someone (usually me) wrote the rule by enumerating the cases they
could think of, instead of by stating the contract and letting the code derive the cases.* The tell
is a list of literals in a guard. When you next see one, that is the bug, and the fix is always to
ask what the list is STANDING IN FOR.
