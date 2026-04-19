---
status: complete
phase: quick
plan: 260403-pya
subsystem: board-ui, server
tags: [drag-and-drop, hand, pile, reorder, face-up]
dependency_graph:
  requires: [03-03-SUMMARY.md]
  provides: [hand-reorder, pile-face-toggle]
  affects: [src/components/HandZone.tsx, src/components/PileZone.tsx, party/index.ts]
tech_stack:
  added: ["@dnd-kit/sortable@10.x"]
  patterns: ["useSortable + SortableContext for within-zone reorder", "useDndMonitor for cross-component drag events", "server-authoritative reorder validation (exact card set match)"]
key_files:
  created: []
  modified:
    - src/shared/types.ts
    - party/index.ts
    - src/components/HandZone.tsx
    - src/components/PileZone.tsx
    - src/components/BoardView.tsx
    - tests/viewFor.test.ts
decisions:
  - "useDndMonitor in HandZone intercepts within-hand reorders without conflicting with BoardDragLayer's MOVE_CARD handler — over.data.current.toZone is undefined for sortable items, so MOVE_CARD guard passes cleanly"
  - "pile.faceUp !== false guard in toggle label handles legacy persisted state that lacks faceUp field (treats undefined as face-up)"
  - "REORDER_HAND server handler validates exact card set match before accepting reorder — prevents clients from injecting or removing cards via reorder"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-04"
  tasks_completed: 3
  files_changed: 6
---

# Quick Task 260403-pya: Hand Reordering and Per-Pile Face Toggle Summary

**One-liner:** Drag-to-reorder hand cards via @dnd-kit/sortable + REORDER_HAND action; per-pile Face up/Face down toggle button via SET_PILE_FACE action with server-side faceUp inheritance on MOVE_CARD.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend types and server for REORDER_HAND and SET_PILE_FACE | fcc5f1a | types.ts, party/index.ts, tests/viewFor.test.ts |
| 2 | Hand reordering UI with @dnd-kit/sortable | 08dfb28 | HandZone.tsx, BoardView.tsx, package.json |
| 3 | Per-pile face toggle button in PileZone | 5dbfe69 | PileZone.tsx |

## What Was Built

**Types (src/shared/types.ts):**
- Added `faceUp: boolean` to `Pile` interface
- Added `REORDER_HAND` and `SET_PILE_FACE` variants to `ClientAction`

**Server (party/index.ts):**
- `defaultGameState` piles now include `faceUp` (draw: false, discard/play: true)
- `MOVE_CARD` handler now sets `card.faceUp` from the destination pile's setting instead of hardcoded logic
- New `REORDER_HAND` handler: validates orderedCardIds is an exact permutation of player's current hand, then reorders server state
- New `SET_PILE_FACE` handler: looks up pile by id, sets faceUp, broadcasts state

**HandZone (src/components/HandZone.tsx):**
- Full rewrite replacing `DraggableCard` with `SortableHandCard` using `useSortable`
- Cards wrapped in `SortableContext` with `horizontalListSortingStrategy`
- `useDndMonitor` intercepts drag-end: if active and over target are both in the same player's hand, computes `arrayMove` and sends `REORDER_HAND`
- Accepts `sendAction` prop

**PileZone (src/components/PileZone.tsx):**
- Added `sendAction` prop
- Renders Face up / Face down toggle button below each pile card slot
- Clicking sends `SET_PILE_FACE` with toggled value

**BoardView (src/components/BoardView.tsx):**
- Passes `sendAction` down to both `HandZone` and `PileZone` (previously ignored with `_sendAction`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical update] Updated test fixture for required faceUp field**
- **Found during:** Task 1 typecheck
- **Issue:** `tests/viewFor.test.ts` had inline `Pile` object literals without the new required `faceUp` field, causing TypeScript errors
- **Fix:** Added `faceUp: false` and `faceUp: true` to the two pile fixtures in `makeTestState()`
- **Files modified:** tests/viewFor.test.ts
- **Commit:** fcc5f1a

**2. [Rule 3 - Blocking] Needed to merge gsd/v1.0-milestone into worktree branch**
- **Found during:** Initial setup
- **Issue:** Worktree branch `worktree-agent-a4f6781a` was at Phase 2 and lacked Phase 3 component files
- **Fix:** Fast-forward merged `gsd/v1.0-milestone` into the worktree branch before beginning task work
- **Files modified:** All Phase 3 files (via merge)

## Known Stubs

None. All data flows through the server and is rendered from live state.

## Verification Results

- `npm run typecheck`: 0 errors
- `npm run build`: clean bundle (248.90 kB, 1777 modules)
- `npm test`: 39/39 tests passed (6 test files)

## Self-Check: PASSED

Files confirmed present:
- src/shared/types.ts — FOUND
- party/index.ts — FOUND
- src/components/HandZone.tsx — FOUND
- src/components/PileZone.tsx — FOUND
- src/components/BoardView.tsx — FOUND

Commits confirmed:
- fcc5f1a — feat(260403-pya): extend types and server
- 08dfb28 — feat(260403-pya): hand reordering UI
- 5dbfe69 — feat(260403-pya): per-pile face toggle button
