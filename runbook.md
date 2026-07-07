# runbook.md — Nistula Assistance · Operations

> Stub (CH-00). Each chunk adds its operational walkthroughs; CH-18a completes
> this into the 2-am-proof version.

## Run locally

1. `pnpm install`
2. Create `.env` (variable names in `.env.example`; values never enter the
   repo) — minimum for CH-00: `NODE_ENV=development` and `PORT=3000`.
3. `pnpm dev` → `GET http://localhost:3000/health` returns `{ok, version, uptime}`.
4. `pnpm check` runs typecheck + lint + tests — the same gate CI enforces.

## Sections to come

- Meta app / test number / webhook setup walkthrough — CH-02
- Red-team probe script (10 messages + expected behaviours) — CH-04
- Template approval pack for the real number — CH-12
- Staff command sheet: `DONE <id>` · `TASKS` · `AI ON/OFF <last4>` — CH-13/14
- Draft-mode unlock ritual — CH-16
- Incidents: webhook silent · eZee down · degraded mode · cost spike — CH-17/18
- Env rotation (WA token!) · backups & restore drill · go-live checklist — CH-18a
