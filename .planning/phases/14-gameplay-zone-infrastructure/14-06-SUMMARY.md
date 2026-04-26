---
phase: 14-gameplay-zone-infrastructure
plan: "06"
subsystem: ui
tags: [react, dnd-kit, drag-and-drop, game-logic, bug-fix]

# Dependency graph
requires:
  - phase: 14-gameplay-zone-infrastructure
    provides: SpreadZone.tsx with useDndMonitor REORDER_PILE_SPREAD handler
provides:
  - isIntraSpreadReorder guard in BoardDragLayer.handleDragEnd that skips MOVE_CARD for same-pile spread drops
  - 4 unit tests covering intra-spread, cross-spread, hand-to-spread, and empty-spread drop paths
affects:
  - any future drag-and-drop work touching BoardDragLayer or SpreadZone

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-handler race condition fix: add an early-return guard in the higher-priority handler to yield control to the specific lower-priority handler"

key-files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - tests/boardDragLayerDialog.test.ts

key-decisions:
  - "Fix via guard in BoardDragLayer (not SpreadZone) — BoardDragLayer is the racing handler; SpreadZone already worked correctly"
  - "isIntraSpreadReorder = fromZone===pile && fromId===toId — two conditions sufficient; region===spread already guaranteed by the outer isSpread branch"

patterns-established:
  - "isIntraSpreadReorder pattern: guard early-return inside isSpread branch of handleDragEnd to avoid MOVE_CARD racing REORDER_PILE_SPREAD"

requirements-completed: [PLAY-01, PLAY-02]

# Metrics
duration: 8min
completed: 2026-04-26
---

# Phase 14 Plan 06: GAP-06 Intra-Spread Reorder Fix Summary

**Three-line isIntraSpreadReorder guard in BoardDragLayer.handleDragEnd stops MOVE_CARD from racing SpreadZone's REORDER_PILE_SPREAD on same-pile spread drops**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-26T23:31:00Z
- **Completed:** 2026-04-26T23:39:49Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Closed GAP-06: intra-spread card reorders now insert at the dropped index instead of always snapping to top
- Added 4 unit tests (GAP-06-A through GAP-06-D) covering all drop path variants for the spread zone fix
- 130 total tests pass (126 prior + 4 new); TypeScript error count unchanged at 1 pre-existing error

## Task Commits

1. **Task 1 [RED]: Add GAP-06 unit tests** - `4922380` (test)
2. **Task 1 [GREEN]: Apply isIntraSpreadReorder guard to BoardDragLayer** - `d62d1a8` (fix)

## Files Created/Modified

- `src/components/BoardDragLayer.tsx` - Added `isIntraSpreadReorder` guard inside `isSpread` branch of `handleDragEnd`; skips `sendAction` when `fromZone==='pile' && fromId===toId`, allowing SpreadZone's `REORDER_PILE_SPREAD` to fire uncontested
- `tests/boardDragLayerDialog.test.ts` - Added `makeSpreadDropLogic` helper and 4 GAP-06 describe block tests

## Decisions Made

- Fix goes in BoardDragLayer, not SpreadZone — BoardDragLayer is the handler that races; SpreadZone already handles intra-spread reorders correctly once it is not pre-empted
- Two-condition guard (`fromZone === 'pile' && fromId === toId`) is sufficient; `region === 'spread'` is already guaranteed by the enclosing `isSpread` branch, so no third condition needed
- SpreadZone.tsx left completely unmodified — the fix is a pure subtraction from BoardDragLayer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The TDD RED step used a self-contained helper that already embedded the fix logic (by design in the plan), so the 4 tests passed immediately upon addition. The GREEN step then applied the identical logic to the production file. Full suite passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-06 is closed; intra-spread card reordering works correctly end-to-end
- No remaining open GAPs from Phase 14 UAT (GAP-06 was the only open bug)
- Phase 14 is complete pending SUMMARY and state updates from the orchestrator

---
*Phase: 14-gameplay-zone-infrastructure*
*Completed: 2026-04-26*
