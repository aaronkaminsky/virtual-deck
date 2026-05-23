---
phase: 30-layout-restructure-dock-spread-zones
plan: 02
subsystem: e2e-tests
tags: [playwright, dnd-kit, e2e, layout, spread-zone]

requires:
  - phase: 30-01
    provides: "Opponent spreads docked in board area; MeasuringStrategy.Always on DndContext"

provides:
  - "Post-restructure drag e2e test: hand → personal spread zone in board area"
  - "Structural DOM assertion: spread zone y > header band bottom"
  - "useDndMonitor subscription-loss regression guard (D-08)"

affects: [layout-05, e2e-coverage]

tech-stack:
  added: []
  patterns:
    - "max-y spread zone selection: evaluate querySelectorAll + reduce to find the lowest spread zone on screen"
    - "not.toHaveCount(0) for ≥1 assertions in Playwright"

key-files:
  created: []
  modified:
    - playwright/game.spec.ts

key-decisions:
  - "Used not.toHaveCount(0) instead of toHaveCountGreaterThanOrEqualTo (Rule 1: correct Playwright API)"
  - "Cherry-picked Plan 30-01 commits into worktree before writing the test (dependency on post-restructure layout)"
  - "Personal spread zone identified by max-y among [data-testid^='spread-zone-spread-'] elements, matching PATTERNS.md scaffold"

duration: 7min
completed: 2026-05-21
---

# Phase 30 Plan 02: Playwright E2E Spread Dock Drag Test Summary

**Playwright e2e test for hand-to-personal-spread drag in post-restructure layout, with structural DOM assertion and useDndMonitor subscription-loss regression guard**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-21T21:32:00Z
- **Completed:** 2026-05-21T21:39:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added new `test('spread zone dock: drag from hand to docked spread lands and stays in board area', ...)` block to `playwright/game.spec.ts`
- Test drags card 0 from P1's hand to P1's personal spread zone (now docked in board area, not header)
- Identifies personal spread zone by finding the `[data-testid^="spread-zone-spread-"]` element with the greatest y coordinate (lowest on screen = board area zone below opponent spread)
- Asserts hand count goes 5→4 and spread zone gains ≥1 `[role="button"]` card
- Structural assertion: `spreadBox.y > headerBox.y + headerBox.height` (proves DOM topology, not just CSS)
- Console scrub: `expect(duplicateIdWarnings).toHaveLength(0)` guards against `useDndMonitor` subscription loss (D-08 from CONTEXT.md)

## Task Commits

1. **Task 1: Add post-restructure spread-dock drag e2e test** - `be76011` (test)

## Files Created/Modified

- `playwright/game.spec.ts` - Added 1 new test block (56 lines) after the `spread zone drag` test and before `communal zone position` test

## Decisions Made

- Used `not.toHaveCount(0)` for the "spread has ≥1 card" assertion (established pattern from existing tests at lines 129-130; `toHaveCountGreaterThanOrEqualTo` is not a real Playwright matcher)
- Cherry-picked Plan 30-01 commits (`db4b375`, `e04116e`) into worktree before writing test — required because the test exercises the post-restructure layout and the worktree was based at `56b574a` (pre-30-01)
- Personal spread zone identified by max-y reduction over `document.querySelectorAll('[data-testid^="spread-zone-spread-"]')` — follows PATTERNS.md lines 227-235 scaffold exactly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced non-existent Playwright matcher**
- **Found during:** Task 1 implementation
- **Issue:** `toHaveCountGreaterThanOrEqualTo` is not a real Playwright assertion method
- **Fix:** Used `not.toHaveCount(0)` — the established pattern in this test file (lines 129-130)
- **Files modified:** playwright/game.spec.ts
- **Commit:** be76011

**2. [Rule 3 - Blocking] Cherry-picked Plan 30-01 commits into worktree**
- **Found during:** Task 1 setup (reading BoardView.tsx showed pre-restructure layout)
- **Issue:** Worktree was spawned at base `56b574a` (Phase 29 tip); Plan 30-01's DOM changes were on the feature branch but not in the worktree
- **Fix:** `git cherry-pick db4b375 e04116e` to bring the post-restructure `BoardView.tsx` and `BoardDragLayer.tsx` into the worktree; test references the correct layout
- **Files modified:** src/components/BoardView.tsx, src/components/BoardDragLayer.tsx (cherry-pick)
- **Commit:** 1820ee1, 68c6082 (cherry-picks, not new work)

## Non-Autonomous Note

This plan is marked `autonomous: false`. The e2e test requires both dev servers running:
- PartyKit (port 1999): `npm run dev`
- Vite (port 5173): `npm run dev:client`

Servers were not running during execution. The test is committed and typechecks clean; user must start the dev servers and run:
```
npx playwright test --grep "spread zone dock: drag from hand to docked spread"
npm run test:e2e
```
before this task is fully verified.

## Threat Surface Scan

No new security-relevant surface introduced. The new test reads only DOM data already visible on P1's page; no cross-player data inspection, no new network endpoints, no auth paths.

T-30-07 (useDndMonitor duplicate-ID guard): mitigated by console-warning scrub in the new test.
T-30-08 (stale droppable rect): partially mitigated — behavioral assertion `handZone count == 4` would catch MOVE_CARD failures.
T-30-09 (structural regression via CSS-only fix): mitigated by structural Y-coordinate assertion.

## Self-Check: PASSED

- `playwright/game.spec.ts` exists: FOUND
- Task 1 commit `be76011` exists: FOUND
- `rg -c "spread zone dock: drag from hand to docked spread lands and stays in board area"` returns 1: VERIFIED
- `rg -c "toBeGreaterThan(headerBox.y + headerBox.height)"` returns 1: VERIFIED
- `rg -c "duplicate id|multiple elements with the same id"` returns 3: VERIFIED
- `npm run typecheck` exits 0: VERIFIED
- `npm test -- --run` exits 0 (226 tests): VERIFIED

---
*Phase: 30-layout-restructure-dock-spread-zones*
*Completed: 2026-05-21*
