---
phase: 18-controls-collapse
plan: "01"
subsystem: testing
tags: [vitest, controls, popover, layout]

requires:
  - phase: 17-board-layout
    provides: ClientGameState shape with phase/canUndo fields used by test type assertions

provides:
  - Logic-extraction test file locking LAYOUT-03 behavioral contract for ControlsBar collapse
  - makeControlsLogic factory matching exact onOpenChange + handleAction handler shape for plan 02

affects: [18-02]

tech-stack:
  added: []
  patterns:
    - "Logic-extraction test pattern: factory mirrors exact component handler shape, no jsdom/RTL"

key-files:
  created:
    - tests/controlsCollapse.test.ts
  modified: []

key-decisions:
  - "Factory parameters _initialPhase and _canUndo are intentionally unused in factory body — kept for signature alignment with plan 02 rewrite (self-documenting)"
  - "isDealDisabled enabled for both setup and lobby phases (Deal is available pre-deal only)"
  - "isResetDisabled returns true for setup and lobby; only playing enables Reset"

patterns-established:
  - "makeControlsLogic factory: setOpen(false) clears confirmReset — mirrors onOpenChange in plan 02 ControlsBar"
  - "handleAction: calls sendAction then setOpen(false) — single-responsibility auto-close contract"

requirements-completed:
  - LAYOUT-03

duration: 2min
completed: "2026-05-04"
---

# Phase 18 Plan 01: Controls Collapse Tests Summary

**15-test logic-extraction suite locking the LAYOUT-03 Popover collapse contract (auto-close, confirmReset stale-state guard, enabled/disabled derivation) before the ControlsBar rewrite lands in plan 02**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-04T12:41:48Z
- **Completed:** 2026-05-04T12:43:42Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `tests/controlsCollapse.test.ts` with 15 tests in 4 describe blocks, all passing GREEN immediately (factory under test lives entirely in the test file)
- Locked LAYOUT-03 behavioral contract: panel default-closed, auto-close after any action, confirmReset cleared on panel close (Pitfall 1 guard), and enabled/disabled derivation for all three phase values
- Factory mirrors the exact `onOpenChange` + `handleAction` handler shape that plan 02's ControlsBar rewrite will use — any drift in the rewrite surfaces as a type or test failure

## Task Commits

1. **Task 1: Create logic-extraction test file** — `97625c1` (test)

**Plan metadata:** (committed with SUMMARY below)

## Files Created/Modified

- `tests/controlsCollapse.test.ts` — Logic-extraction test file; `makeControlsLogic` factory + `isDealDisabled`/`isUndoDisabled`/`isResetDisabled` pure helpers; 4 describe blocks, 15 `it` cases

## Decisions Made

- Factory parameters `_initialPhase` and `_canUndo` are prefixed with `_` and retained in the signature even though the factory body doesn't use them for conditional logic — keeps the factory signature aligned with the plan 02 component state for readability
- `isDealDisabled` returns `true` only for `playing` phase — Deal is enabled in both `setup` and `lobby` (matching CONTEXT.md D-06 and PATTERNS.md enabled/disabled logic)
- `isResetDisabled` returns `true` for `setup` and `lobby`, `false` only for `playing` — matches CONTEXT.md D-06

## Deviations from Plan

None — plan executed exactly as written. Test file structure, factory shape, describe block names, and case count all match the plan spec verbatim.

## Issues Encountered

None.

## How Plan 02 Should Mirror the Factory

Plan 02's ControlsBar rewrite must implement these exact behaviors to stay contract-compliant:

1. **`onOpenChange` handler:** When `nextOpen === false`, call `setConfirmReset(false)` before or after updating `open` state. The order matters only for rendering but both must update atomically.

2. **`handleAction` (or equivalent per-button handler):** Call `sendAction({ type, ...extra })` then call `setOpen(false)`. The auto-close must happen unconditionally after every action dispatch.

3. **Deal disabled:** `gameState.phase !== 'setup' && gameState.phase !== 'lobby'` — enabled in setup and lobby, disabled in playing.

4. **Undo disabled:** `!gameState.canUndo` — direct flag wire.

5. **Reset disabled:** `gameState.phase !== 'playing'` — enabled only in playing.

If any of these expressions diverge from what the factory tests, the tests won't catch the drift (since tests exercise extracted plain functions, not the real component). The plan 02 typecheck + smoke test will catch integration issues.

## Known Stubs

None — this plan creates only a test file with no production data dependencies.

## Threat Flags

None — test file only, no new trust boundaries introduced.

## Self-Check: PASSED

- `tests/controlsCollapse.test.ts` exists and has 173 lines
- Commit `97625c1` present in git log
- `npm test -- tests/controlsCollapse.test.ts` exits 0, 15 tests pass
- `npm test` (full suite) exits 0, 150 tests pass
- `npm run typecheck` exits 0
