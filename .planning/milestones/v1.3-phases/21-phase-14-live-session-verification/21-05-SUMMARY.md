---
plan: 21-05
phase: 21-phase-14-live-session-verification
status: complete
gap_closure: true
completed: 2026-05-14
---

## What Was Built

Added `SortableSentinel` to `SpreadZone` and `HandZone` to fix the "drop to end" gap found during UAT. When dragging cards (single or grouped) past the last card in a spread zone or hand, the drop now appends to the very end.

## Key Changes

- **SpreadZone.tsx / HandZone.tsx**: Added inline `SortableSentinel` component (invisible `flex: 1` droppable) at the end of each `SortableContext`. Sentinel uses `useSortable` so `closestCenter` can detect it.
- **Group reorder insert direction**: Changed `insertAt` calculation to use `event.delta.x > 0` — when dragging right, the block inserts AFTER `over` (matching visual feedback); when dragging left, it inserts before. This aligns algorithm with the `horizontalListSortingStrategy` animation in all cases, not just the last-card edge case.
- **toThisPile / toSameHand guards**: Extended with `|| String(over.id) === sentinelId` so sentinel drops enter the reorder branch.
- **tests/groupReorder.test.ts**: Two new sentinel test cases added (7/7 passing).

## Root Causes Fixed

1. Zero-size sentinel (`width: 0, height: 0`) had an effective `closestCenter` target of ~0.5px — practically unreachable. Fixed by `flex: 1, minWidth: 56px, alignSelf: stretch`.
2. Group reorder used `overIdx` as insert-before unconditionally. When dragging right, `over` shifts left visually, implying the block lands after it — but the algorithm inserted before. Fixed with `delta.x` direction check.

## Verification

- `npm run typecheck` — exit 0
- `npm test -- groupReorder --run` — 7/7 passing
- `npm test -- --run` — 165/165 passing
- Human re-test: single card drag to end ✓, group drag to end (spread zone) ✓, group drag to end (hand) ✓

## Self-Check: PASSED

key-files.created:
  - src/components/SpreadZone.tsx
  - src/components/HandZone.tsx
  - tests/groupReorder.test.ts
