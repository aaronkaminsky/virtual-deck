---
phase: 28-bug-fixes
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, dnd-kit, vitest, selection, ring]

# Dependency graph
requires:
  - phase: 27-visual-polish
    provides: hover-outline and spread zone ring patterns DraggableCard consumes
provides:
  - DraggableCard accepts isSelected prop and renders ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm
  - PileZone accepts selectedIds Set and derives isSelected for top card
  - BoardView threads selectedIds into PileZone completing the selection prop chain
  - Vitest logic test for isSelected derivation (4 cases)
affects: [29-sort-phase, 30-layout-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cn() used for conditional ring class application on DraggableCard (same pattern as SortableSpreadCard in SpreadZone)"
    - "selectedIds Set threaded as prop from BoardDragLayer through BoardView into zone components"

key-files:
  created:
    - tests/pileSelectRing.test.ts
  modified:
    - src/components/DraggableCard.tsx
    - src/components/PileZone.tsx
    - src/components/BoardView.tsx

key-decisions:
  - "Ring applied to DraggableCard's root div (same approach as SortableSpreadCard inner div in SpreadZone) — card-level ring, not pile-border ring"
  - "rounded-sm used on DraggableCard ring (plan spec) vs rounded-md in SpreadZone — pile top card has slightly tighter corner radius than spread cards"

patterns-established:
  - "isSelected derivation pattern: selectedIds?.has(cardId) ?? false — all three branches (true, false, undefined) tested in pure Vitest logic test"

requirements-completed: [BUG-01]

# Metrics
duration: 5min
completed: 2026-05-21
---

# Phase 28 Plan 01: Bug Fix — Pile Select Ring Summary

**Thread selectedIds through BoardView into PileZone and DraggableCard, adding ring-1 ring-primary/30 ring feedback to selected pile top cards (BUG-01 fix)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-21T02:31:00Z
- **Completed:** 2026-05-21T02:35:59Z
- **Tasks:** 4
- **Files modified:** 4 (3 source, 1 new test)

## Accomplishments
- DraggableCard now renders a `ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm` ring when `isSelected` is true — matches SpreadZone's card ring style
- PileZone accepts `selectedIds?: Set<string>` and derives `isSelected` for the top card via `selectedIds?.has((topCard as Card).id) ?? false`
- BoardView's `pilePiles.map` now passes `selectedIds={selectedIds}`, completing the full prop chain from BoardDragLayer
- 4 pure-logic Vitest test cases verify all branches of the isSelected derivation

## Task Commits

1. **Task 1: Add isSelected prop to DraggableCard** - `50826ce` (feat)
2. **Task 2: Add selectedIds prop to PileZone and wire to DraggableCard** - `7c8c813` (feat)
3. **Task 3: Pass selectedIds to PileZone in BoardView** - `0a1636d` (feat)
4. **Task 4: Vitest logic test for pile isSelected derivation** - `d0f2f09` (test)

## Files Created/Modified
- `src/components/DraggableCard.tsx` - Added `isSelected?: boolean` prop; import `cn`; apply ring class via `cn()` on root div
- `src/components/PileZone.tsx` - Added `selectedIds?: Set<string>` to interface; pass `isSelected` to DraggableCard
- `src/components/BoardView.tsx` - Added `selectedIds={selectedIds}` to PileZone render in `pilePiles.map`
- `tests/pileSelectRing.test.ts` - 4 pure-logic test cases for isSelected derivation (true, false wrong id, false empty set, false undefined)

## Decisions Made
- Ring applied to DraggableCard's root div — card-level feedback, not pile-border feedback (matches D-01)
- `rounded-sm` on DraggableCard vs `rounded-md` in SpreadZone: plan specification; pile top card visible area slightly tighter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BUG-01 fully resolved — pile "Select All" now shows ring on top card matching SpreadZone/HandZone selection visual
- Phase 29 (sort) can proceed; selectedIds prop chain is stable

---
*Phase: 28-bug-fixes*
*Completed: 2026-05-21*
