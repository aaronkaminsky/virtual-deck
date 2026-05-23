---
phase: 29-sort-verification
plan: 01
subsystem: ui
tags: [react, typescript, dnd-kit, vitest, sort, hand-management]

# Dependency graph
requires:
  - phase: 28-visual-polish
    provides: HandZone component with sort feature and buildSortDispatch
provides:
  - Render-time-only hand sort via setSortMode (SORT-02 implemented)
  - sortCards non-mutation invariant test locking D-04
affects: [hand-management, sort, server-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-time-only sort: sort state is local UI only; server order is authoritative and only mutated by drag-reorder (REORDER_HAND)"
    - "Non-mutation invariant test: verify pure functions do not mutate input by capturing originalIds before and asserting after multiple calls"

key-files:
  created: []
  modified:
    - src/components/HandZone.tsx
    - tests/handSort.test.ts

key-decisions:
  - "SORT-02: Sort is render-time visual overlay only — sort clicks no longer dispatch REORDER_HAND to the server"
  - "D-04: Original order is current server/manual order, set by drag-reorder only, never by sort click"
  - "Combined Task 1 and Task 2 into a single commit because the pre-commit hook requires passing tests; HandZone.tsx and handSort.test.ts were committed atomically"

patterns-established:
  - "Render-time sort: displayedCards = sortMode === 'original' ? cards : sortCards(cards, sortMode)"
  - "Non-mutation test shape: capture originalIds before sort calls, assert unchanged after"

requirements-completed: [SORT-02]

# Metrics
duration: 5min
completed: 2026-05-21
---

# Phase 29 Plan 01: Sort Verification Summary

**Hand sort converted to render-time-only visual overlay by deleting buildSortDispatch and stripping sendAction from handleSort, with non-mutation invariant test added to lock the D-04 original-order contract**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-21T10:13:00Z
- **Completed:** 2026-05-21T10:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Deleted `buildSortDispatch` export from HandZone.tsx — sort clicks no longer reach the server
- Simplified `handleSort` to only compute `nextMode` and call `setSortMode(nextMode)` (D-01)
- Updated `tests/handSort.test.ts`: removed `buildSortDispatch` import and dispatch test, added non-mutation invariant test asserting `sortCards` does not mutate the input array (D-04 contract)
- All 226 tests pass; TypeScript check passes

## Task Commits

Both tasks committed atomically in one commit (pre-commit hook forces test-passing state):

1. **Task 1 + Task 2: Remove buildSortDispatch, convert handleSort, update tests** - `e8ec0e4` (feat)

**Plan metadata:** (forthcoming docs commit)

## Files Created/Modified

- `/Users/aaronkaminsky/code/virtual-deck/src/components/HandZone.tsx` — Deleted `buildSortDispatch`, simplified `handleSort` to render-time-only; `sortCards`, `displayedCards` line, and REORDER_HAND drag dispatch unchanged
- `/Users/aaronkaminsky/code/virtual-deck/tests/handSort.test.ts` — Removed `buildSortDispatch` import and dispatch `it` block; added non-mutation invariant test; 3 `it` blocks total

## Decisions Made

- SORT-02 implementation removes `buildSortDispatch` entirely rather than leaving it dead-coded; the export surface of HandZone.tsx is now SortMode, sortCards, HandZone only
- Combined commit: the pre-commit hook (vitest run) blocks commits while any test fails. Since Task 1 breaks the existing `buildSortDispatch` test, and the plan correctly anticipated this ("npm test will fail at this point — Task 2 fixes it"), both changes were staged and committed atomically. The plan's intent (two commits) was not achievable without bypassing hooks; atomic commit is the correct outcome.

## Deviations from Plan

### Adjusted commit structure (not a deviation rule — constraint-driven)

**Combined Task 1 and Task 2 into a single commit**
- **Found during:** Task 1 commit attempt
- **Issue:** Pre-commit hook runs `npm test`; deleting `buildSortDispatch` from HandZone.tsx makes the existing test in `handSort.test.ts` fail. Committing Task 1 alone requires `--no-verify`, which CLAUDE.md prohibits without explicit user request.
- **Fix:** Completed both file changes before committing, then staged both files in a single commit under the Task 1 commit message.
- **Files modified:** src/components/HandZone.tsx, tests/handSort.test.ts (both in commit e8ec0e4)
- **Verification:** npm test passes (226/226), npm run typecheck passes

---

**Total deviations:** 1 (commit structure adjustment, no rule applied — hook constraint)
**Impact on plan:** Both task changes shipped exactly as specified. Only the commit structure differs from the two-commit plan.

## Issues Encountered

None beyond the commit structure constraint described above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SORT-02 complete: sort is purely client-side; server order is canonical and only written by drag-reorder
- Non-mutation invariant locked in by test
- HandZone export surface cleaned up (buildSortDispatch removed)
- Ready for any subsequent sort or hand-management phases

## Self-Check

- `/Users/aaronkaminsky/code/virtual-deck/src/components/HandZone.tsx` — exists, modified
- `/Users/aaronkaminsky/code/virtual-deck/tests/handSort.test.ts` — exists, modified
- Commit e8ec0e4 — verified via git show

## Self-Check: PASSED

---
*Phase: 29-sort-verification*
*Completed: 2026-05-21*
