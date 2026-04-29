---
phase: 13-playwright-infrastructure
plan: "02"
subsystem: testing
tags: [playwright, e2e, fixtures, webserver, chromium]

dependency_graph:
  requires:
    - phase: 13-01
      provides: "@playwright/test devDependency, data-testid=hand-zone on HandZone"
  provides:
    - "playwright.config.ts at project root with dual webServer (Vite 5173, PartyKit 1999)"
    - "playwright/fixtures.ts with twoPlayerRoom fixture using two separate BrowserContexts"
    - "test and expect exports for Wave 3 test files"
  affects:
    - "13-03-PLAN.md (game.spec.ts imports { test, expect } from ./fixtures)"

tech-stack:
  added: []
  patterns:
    - "Dual webServer array in playwright.config.ts — Vite and PartyKit both auto-started for e2e runs"
    - "BrowserContext isolation — two contexts per test to prevent localStorage playerId collisions"
    - "LobbyPanel interaction via getByPlaceholder + getByRole — no ?name= URL param shortcut"

key-files:
  created:
    - "playwright.config.ts"
    - "playwright/fixtures.ts"
  modified: []

key-decisions:
  - "Use npm run dev:client for Vite webServer entry (not npm run dev which runs PartyKit)"
  - "Use port: 1999 for PartyKit webServer check (not url: health — PartyKit has no documented /health route)"
  - "Two separate BrowserContexts per test (not two Pages in one context) — usePlayerId.ts reads localStorage"
  - "joinGame fills name input and clicks button — does not use ?name= URL param which App.tsx ignores"

patterns-established:
  - "E2E test files import { test, expect } from './fixtures' — single import for all test utilities"
  - "Board-ready gate: await expect(page.getByTestId('hand-zone')).toBeVisible() after Join Game"

requirements-completed:
  - DEV-02

duration: 8min
completed: "2026-04-21"
---

# Phase 13 Plan 02: Playwright Config and Fixtures Summary

**playwright.config.ts with dual Vite+PartyKit webServer auto-start and playwright/fixtures.ts twoPlayerRoom fixture with two isolated BrowserContexts and LobbyPanel interaction**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T14:45:00Z
- **Completed:** 2026-04-21T14:52:29Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- playwright.config.ts created with dual webServer array — Vite on port 5173 via `npm run dev:client`, PartyKit on port 1999 via `npx partykit dev`; both use `reuseExistingServer: !process.env.CI`; Chromium-only projects
- playwright/fixtures.ts created with `twoPlayerRoom` fixture: unique `nanoid(8)` room code, two separate `BrowserContext` instances (prevents localStorage `playerId` collision), `joinGame` helper fills name input and clicks Join Game, board-ready gate on `data-testid="hand-zone"`
- Both `test` (extended with fixture) and `expect` exported — Wave 3 test files need only `import { test, expect } from './fixtures'`

## Task Commits

1. **Task 1: Create playwright.config.ts** - `4eef99d` (chore)
2. **Task 2: Create playwright/fixtures.ts** - `c293b13` (feat)

## Files Created/Modified

- `playwright.config.ts` — Playwright runner config: dual webServer, Chromium-only project, testDir, baseURL
- `playwright/fixtures.ts` — twoPlayerRoom fixture; joinGame helper; extended test and expect exports

## Decisions Made

- Used `port: 1999` (not `url: http://localhost:1999/health`) for PartyKit webServer — PartyKit has no documented /health route; Playwright polls TCP port directly
- Used `npm run dev:client` not `npm run dev` — confirmed in package.json: `dev` runs `partykit dev`, `dev:client` runs `vite`
- Two separate `BrowserContext` instances required — `usePlayerId.ts` stores `playerId` in localStorage; same context = same token = both pages join as same player
- LobbyPanel interaction via `getByPlaceholder('Your name')` + `getByRole('button', { name: 'Join Game' })` — confirmed actual attribute values in LobbyPanel.tsx before writing

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `src/components/BoardDragLayer.tsx` (TS2591: Cannot find name 'process') was present before and after this plan's changes — documented in 13-01-SUMMARY.md. Not introduced by this plan.

## Known Stubs

None.

## Threat Flags

None — both new files are dev tooling only (T-13-03 and T-13-04 accepted per plan threat model).

## Next Phase Readiness

- Wave 3 (13-03) can now write `game.spec.ts` importing `{ test, expect }` from `./fixtures`
- `twoPlayerRoom` fixture handles all setup: room creation, two-player join, board-ready wait
- TypeScript typecheck passes for both new files (only pre-existing BoardDragLayer error unrelated to this plan)

---

*Phase: 13-playwright-infrastructure*
*Completed: 2026-04-21*

## Self-Check: PASSED

Files exist:
- `playwright.config.ts` — FOUND
- `playwright/fixtures.ts` — FOUND
- `.planning/phases/13-playwright-infrastructure/13-02-SUMMARY.md` — FOUND

Commits exist:
- `4eef99d` — FOUND (playwright.config.ts)
- `c293b13` — FOUND (playwright/fixtures.ts)
