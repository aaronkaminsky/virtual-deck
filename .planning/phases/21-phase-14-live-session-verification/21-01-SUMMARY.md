---
phase: 21-phase-14-live-session-verification
plan: "01"
subsystem: testing
tags: [vitest, tdd, undo, reorder, partykit, spread-zone]

requires:
  - phase: 20-spread-zone-multi-select
    provides: REORDER_HAND and REORDER_PILE_SPREAD server actions without takeSnapshot

provides:
  - RED Vitest scaffold for REORDER_PILE_SPREAD undo (tests/reorderUndo.test.ts)
  - RED Vitest scaffold for REORDER_HAND undo (tests/reorderUndo.test.ts)
  - RED Vitest scaffold for D-06 group-reorder splice algorithm (tests/groupReorder.test.ts)

affects: [21-02, 21-03]

tech-stack:
  added: []
  patterns:
    - "TDD scaffold pattern: write test against missing takeSnapshot calls first, implement in subsequent plan"
    - "Inline stub function pattern: define broken local copy in test file to guarantee RED gate"

key-files:
  created:
    - tests/reorderUndo.test.ts
    - tests/groupReorder.test.ts
  modified: []

key-decisions:
  - "groupReorder stub returns input unchanged — guarantees 4/5 cases are RED until Plan 03 implements D-06"
  - "reorderUndo tests import from ./helpers — no inline helper duplication per plan spec"

patterns-established:
  - "RED scaffold pattern: two describe blocks per server-side action pair (snapshot + undo restore)"

requirements-completed: [SPREAD-02]

duration: 8min
completed: "2026-05-13"
---

# Phase 21 Plan 01: Spread Zone Reorder Verification Summary

**Failing Vitest scaffolds (RED gate) pinning undo behavior for REORDER_PILE_SPREAD and REORDER_HAND, plus D-06 splice algorithm contract for group reorder**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-13T22:28:00Z
- **Completed:** 2026-05-13T22:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `tests/reorderUndo.test.ts` with 4 RED tests: REORDER_PILE_SPREAD snapshot + undo restore, REORDER_HAND snapshot + undo restore — all failing because party/index.ts lacks `takeSnapshot` in both cases
- Created `tests/groupReorder.test.ts` with 5 tests (4 RED, 1 passing no-op sanity check) — stub function returns input unchanged, pinning exact D-06 splice outputs as the contract Plan 03 must satisfy
- TypeScript typecheck passes with zero errors on both new test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED scaffold tests/reorderUndo.test.ts** - `36accd4` (test)
2. **Task 2: Write RED scaffold tests/groupReorder.test.ts** - `567a8f8` (test)

## Files Created/Modified

- `tests/reorderUndo.test.ts` - 4 failing RED tests for REORDER_PILE_SPREAD and REORDER_HAND undo behavior (D-07, D-08, D-09)
- `tests/groupReorder.test.ts` - 5 tests (4 RED) pinning D-06 group-reorder splice algorithm contract

## Decisions Made

- Stub function in `groupReorder.test.ts` returns `[...cards]` unchanged — this makes cases 1–4 fail while case 5 (empty set no-op) passes as a sanity check, exactly as specified
- Imported from `./helpers` rather than redefining helpers inline — avoids duplication and matches established pattern from other test files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RED gate established: Plan 02 must add `takeSnapshot` to `REORDER_PILE_SPREAD` and `REORDER_HAND` in `party/index.ts` to turn `reorderUndo.test.ts` GREEN
- Plan 03 must implement the D-06 splice algorithm in `SpreadZone.tsx` and `HandZone.tsx` and update the stub in `groupReorder.test.ts` to turn cases 1–4 GREEN
- All expected outputs are pinned in test assertions — Plan 02/03 executors do not need to invent expectations

## Self-Check: PASSED

- `tests/reorderUndo.test.ts` exists and committed at 36accd4
- `tests/groupReorder.test.ts` exists and committed at 567a8f8
- `npm run typecheck` exits 0
- `npm test -- reorderUndo --run`: 4 failed (confirmed RED gate)
- `npm test -- groupReorder --run`: 4 failed | 1 passed (confirmed RED gate)

---
*Phase: 21-phase-14-live-session-verification*
*Completed: 2026-05-13*
