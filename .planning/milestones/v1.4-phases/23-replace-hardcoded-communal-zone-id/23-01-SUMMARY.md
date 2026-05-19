---
phase: 23-replace-hardcoded-communal-zone-id
plan: "01"
subsystem: server
tags: [reorder-hand, undo, skip-snapshot, types, tests, wave-0, sort, select-all]

# Dependency graph
requires: []
provides:
  - "REORDER_HAND action with optional skipSnapshot?: boolean field in ClientAction union"
  - "REORDER_HAND server handler that conditionally skips takeSnapshot() when skipSnapshot: true"
  - "Wave-0 test scaffolds: tests/handSort.test.ts and tests/selectAll.test.ts with 3 it.todo stubs each"
  - "Extended reorderUndo.test.ts coverage: skipSnapshot true (no snapshot) and skipSnapshot true + bad ids (INVALID_REORDER)"
affects: [plan-23-02, plan-23-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "skipSnapshot optional flag pattern: optional boolean on existing action type gates server-side side effects without introducing a new action"
    - "Wave-0 scaffold pattern: create test files with it.todo stubs before implementation so downstream plans have automated verify targets"

key-files:
  created:
    - tests/handSort.test.ts
    - tests/selectAll.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/reorderUndo.test.ts

key-decisions:
  - "skipSnapshot resolves REORDER_HAND undo conflict (RESEARCH.md Open Question 1): sort dispatches REORDER_HAND with skipSnapshot: true; drag-reorder callers pass no flag and continue snapshotting"
  - "Validation guard (length+membership) runs unconditionally before the skipSnapshot branch — bogus ids are rejected with INVALID_REORDER regardless of skipSnapshot value"
  - "Wave-0 scaffolds include fixture helpers copied from playCardSet.test.ts so Plan 23-03 has makeStateWithPlayerAndCards and makeStateWithPileCards immediately available"

patterns-established:
  - "Pattern: Optional action flag to gate server-side behavior without a new action type"
  - "Pattern: Wave-0 scaffold test files with it.todo stubs so downstream implementation plans have automated verify targets from day 1"

requirements-completed: [SORT-01, SELECT-01, SELECT-02, SELECT-03]

# Metrics
duration: 89min
completed: 2026-05-16
---

# Phase 23 Plan 01: Skip-Snapshot Flag + Wave-0 Test Scaffolds Summary

**REORDER_HAND extended with optional skipSnapshot?: boolean; server handler branches on flag; 6 new test cases and 2 scaffold files ship Wave-0 verify targets for sort and select-all**

## Performance

- **Duration:** 89 min
- **Started:** 2026-05-16T15:57:42Z
- **Completed:** 2026-05-16T17:27:32Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extended `ClientAction` REORDER_HAND union member with `skipSnapshot?: boolean` — drag-reorder callers in `HandZone.tsx` continue to send no flag and get the default snapshot behavior
- Wrapped `takeSnapshot(this.gameState)` in `party/index.ts` REORDER_HAND handler with `if (!action.skipSnapshot)` — sort dispatches will set the flag to bypass undo stack (SORT-01 requirement)
- Added 2 new test cases to `tests/reorderUndo.test.ts` covering skip-snapshot happy path and skip-snapshot + bad ids validation path (6 total tests in the file)
- Created `tests/handSort.test.ts` with 3 `it.todo` stubs for Plan 23-02's `sortCards()` function tests
- Created `tests/selectAll.test.ts` with 3 `it.todo` stubs for Plan 23-03's SELECT-01/02/03 server-side behavior, plus `makeStateWithPlayerAndCards` and `makeStateWithPileCards` fixture helpers copied from `playCardSet.test.ts`

## Task Commits

1. **Task 1: Add skipSnapshot to REORDER_HAND types and server handler** - `03cb809` (feat)
2. **Task 2: Extend reorderUndo tests with skipSnapshot coverage** - `471d340` (test)
3. **Task 3: Create Wave-0 test scaffolds for handSort and selectAll** - `e484d9d` (feat)

## Files Created/Modified

- `src/shared/types.ts` — REORDER_HAND union member gains `skipSnapshot?: boolean` field (line 60)
- `party/index.ts` — `takeSnapshot()` call in REORDER_HAND case wrapped with `if (!action.skipSnapshot)` (line 321)
- `tests/reorderUndo.test.ts` — 2 new `it(...)` cases appended inside `describe("REORDER_HAND undo")` block
- `tests/handSort.test.ts` — new Wave-0 scaffold; 3 `it.todo` stubs for By Suit sort, By Rank sort, and sort-click dispatch
- `tests/selectAll.test.ts` — new Wave-0 scaffold; 3 `it.todo` stubs for SELECT-01/02/03; fixture helpers included

## Decisions Made

- Used optional field on existing action type rather than a new action type — avoids adding a handler branch and keeps existing callers unchanged
- Validation runs before the `skipSnapshot` branch in the server handler — this preserves the existing invariant that rejected actions never push to the undo stack
- Wave-0 scaffold files include fixture helper functions (not just stubs) so Plan 23-03 can start assertions without re-creating setup infrastructure

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

The comment on line 1 of each scaffold file initially contained the literal string `it.todo`, causing `grep -c "it.todo"` to return 4 instead of 3. Fixed by rewording the comment to use `stubs` instead of `it.todo calls`. No logic or behavior change.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 23-02 (HandZone sort button): `tests/handSort.test.ts` is the automated verify target; `src/shared/types.ts` already has the `skipSnapshot` field; `HandZone.tsx` only needs to pass `skipSnapshot: true` in the sort dispatch
- Plan 23-03 (Select All): `tests/selectAll.test.ts` is the automated verify target; fixture helpers are pre-loaded; no server changes needed (existing PLAY_CARD_SET handler covers the Select All flow)
- No blockers

---

## Self-Check: PASSED

Files verified present:
- FOUND: src/shared/types.ts
- FOUND: party/index.ts
- FOUND: tests/reorderUndo.test.ts
- FOUND: tests/handSort.test.ts
- FOUND: tests/selectAll.test.ts

Commits verified:
- FOUND: 03cb809 (feat: types + server handler)
- FOUND: 471d340 (test: reorderUndo skipSnapshot cases)
- FOUND: e484d9d (feat: Wave-0 scaffolds)

---
*Phase: 23-replace-hardcoded-communal-zone-id*
*Completed: 2026-05-16*
