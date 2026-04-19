---
phase: 11-empty-pile-drop-ux
plan: 01
subsystem: ui
tags: [react, dnd-kit, drag-and-drop, dialog, ux]

# Dependency graph
requires:
  - phase: 999.11-pile-drop-dialog-ux
    provides: "Insert-position dialog (setPendingMove/sendPendingMove pattern) in BoardDragLayer"
provides:
  - "Empty-pile fast path in handleDragEnd: bypasses insert-position dialog when target pile is empty"
  - "UX-01 behavioral tests (4 cases) in boardDragLayerDialog.test.ts"
affects: [pile drop behavior, insert-position dialog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isEmpty guard pattern: !targetPile || targetPile.cards.length === 0 before setPendingMove"
    - "Logic-extraction test pattern extended to UX-01 (pure helper mirrors component branch)"

key-files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - tests/boardDragLayerDialog.test.ts

key-decisions:
  - "Empty-pile check uses existence + length: missing pile treated as empty (safe fallback, no crash)"
  - "insertPosition 'top' hardcoded for empty pile — only one semantically valid position"
  - "Pre-existing tsc errors (process, vi.fn generic) are out-of-scope pre-existing debt; no new errors introduced"

patterns-established:
  - "Logic-extraction test pattern (makePileDropLogic) mirrors BoardDragLayer branch for isolation testing without DOM"

requirements-completed: [UX-01]

# Metrics
duration: 15min
completed: 2026-04-19
---

# Phase 11 Plan 01: Empty Pile Drop UX Summary

**isEmpty guard in handleDragEnd bypasses insert-position dialog for empty piles, sending MOVE_CARD with insertPosition 'top' immediately**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-19T01:05:39Z
- **Completed:** 2026-04-19T01:18:07Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added isEmpty check (`!targetPile || targetPile.cards.length === 0`) in `handleDragEnd` pile branch
- Empty pile drops now bypass `setPendingMove` and call `sendAction` directly with `insertPosition: 'top'`
- Non-empty pile behavior unchanged: still calls `setPendingMove` to open the insert-position dialog
- Added 4 UX-01 behavioral tests covering empty pile, non-empty pile, missing pile (safety), and pile-to-pile cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add empty-pile bypass branch and tests** - `03b40b4` (feat)

## Files Created/Modified

- `src/components/BoardDragLayer.tsx` - Added isEmpty check in handleDragEnd; updated JSX comment from "any pile drop" to "non-empty pile drop"
- `tests/boardDragLayerDialog.test.ts` - Added `makePileDropLogic` helper and UX-01-A through UX-01-D test cases

## Decisions Made

- Used `!targetPile || targetPile.cards.length === 0` rather than just `targetPile.cards.length === 0` — a missing pile is treated as empty to avoid crashes on stale state
- Hardcoded `insertPosition: 'top'` for empty pile — the only semantically meaningful position when a pile has no cards; no user choice needed
- Pre-existing TypeScript errors (`process` in BoardDragLayer, `vi.fn` generic overload in test file) left untouched — out of scope per deviation rules; no new errors introduced

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest run from the main repo directory (`cd /Users/aaronkaminsky/code/virtual-deck && npx vitest run`) picked up the main repo's unmodified test file, showing 7 tests instead of 11. Running vitest from the worktree directory confirmed all 11 tests pass. This is expected worktree behavior — tests must be run from the worktree root.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UX-01 satisfied: empty pile drops are dialog-free
- `npx tsc --noEmit` exits with same 3 pre-existing errors, none introduced by this plan
- All 11 tests pass in worktree
- No blockers for subsequent plans

## Self-Check: PASSED

- FOUND: src/components/BoardDragLayer.tsx
- FOUND: tests/boardDragLayerDialog.test.ts
- FOUND: 11-01-SUMMARY.md
- FOUND: commit 03b40b4
- FOUND: isEmpty check in BoardDragLayer
- FOUND: UX-01 describe block in test file
- FOUND: insertPosition 'top' in handleDragEnd

---
*Phase: 11-empty-pile-drop-ux*
*Completed: 2026-04-19*
