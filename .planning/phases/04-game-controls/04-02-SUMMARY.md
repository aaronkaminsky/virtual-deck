---
phase: 04-game-controls
plan: 02
subsystem: ui
tags: [react, shadcn, dnd-kit, game-controls, typescript]

requires:
  - phase: 04-game-controls
    plan: 01
    provides: Six server action handlers and extended types (FLIP_CARD, PASS_CARD, DEAL_CARDS, SHUFFLE_PILE, RESET_TABLE, UNDO_MOVE)

provides:
  - ControlsBar component: Deal popover (setup phase), Undo + Reset (playing phase)
  - DraggableCard with onFlip prop and drag guard (click-to-flip without accidental drags)
  - PileZone with Shuffle button and FLIP_CARD on top card click
  - OpponentHand as droppable target for PASS_CARD dispatch
  - BoardView updated with ControlsBar in top strip
  - BoardDragLayer dispatches PASS_CARD on opponent-hand drops

affects: [04-03-drag-integration]

tech-stack:
  added:
    - shadcn alert-dialog (@base-ui/react/alert-dialog)
    - shadcn popover (@base-ui/react/popover)
    - shadcn input (@base-ui/react/input)
  patterns:
    - "Controlled Popover pattern: open/onOpenChange props on PopoverPrimitive.Root for programmatic close after Deal"
    - "Drag guard ref: didDragRef set in useEffect on isDragging, cleared in handleClick to suppress flip on drag-end"
    - "PASS_CARD priority: checked before MOVE_CARD in handleDragEnd; isSuccess excludes isPassCard"
    - "Drop highlight: border-2 border-primary when isOver, border-transparent when not — prevents layout shift"

key-files:
  created:
    - src/components/ControlsBar.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/input.tsx
  modified:
    - src/components/DraggableCard.tsx
    - src/components/PileZone.tsx
    - src/components/OpponentHand.tsx
    - src/components/BoardView.tsx
    - src/components/BoardDragLayer.tsx

key-decisions:
  - "Used 'Keep playing' cancel text per plan spec (not 'Cancel' from UI spec) — plan acceptance criteria were explicit"
  - "isPassCard checked before isSuccess in BoardDragLayer handleDragEnd — prevents opponent-hand drops from also firing MOVE_CARD"
  - "Phase 3 components copied into worktree branch — worktree was on separate branch without Phase 3 src files"

requirements-completed: [CARD-03, CARD-04, CTRL-01, CTRL-02, CTRL-03, CTRL-04]

duration: 10min
completed: 2026-04-04
---

# Phase 4 Plan 02: Game Controls UI Summary

**shadcn components installed and six game controls wired into UI: ControlsBar (Deal/Undo/Reset), PileZone Shuffle, DraggableCard flip-on-click, OpponentHand drop target for card passing**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-04T19:27:08Z
- **Completed:** 2026-04-04T19:37:39Z
- **Tasks:** 2
- **Files modified:** 9 (4 new, 5 modified)

## Accomplishments

- Installed three shadcn components (alert-dialog, popover, input) using `@base-ui/react` primitives
- Created ControlsBar with phase-conditional rendering: Deal popover (setup) with controlled number input, Undo + Reset buttons (playing) where Undo is disabled when `canUndo` is false and Reset uses AlertDialog confirmation
- Modified DraggableCard to accept `onFlip?` prop with drag guard ref preventing click-to-flip from firing after a drag operation
- Modified PileZone to add Shuffle button dispatching SHUFFLE_PILE and pass `onFlip={handleFlipCard}` to top card
- Modified OpponentHand to be a droppable zone (`useDroppable`) with amber border highlight on `isOver`
- Modified BoardView to include ControlsBar in the top strip with `justify-between` layout
- Modified BoardDragLayer to handle PASS_CARD dispatch when a hand card is dropped onto an opponent-hand zone (prioritized over MOVE_CARD check)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn components and create ControlsBar** - `0d1375e` (feat)
2. **Task 2: Modify existing components — flip, shuffle, pass, drag wiring** - `f988d5a` (feat)

## Files Created/Modified

- `src/components/ControlsBar.tsx` (new) — Phase-aware controls bar with Deal popover and Undo/Reset buttons
- `src/components/ui/alert-dialog.tsx` (new) — shadcn AlertDialog via @base-ui/react
- `src/components/ui/popover.tsx` (new) — shadcn Popover via @base-ui/react
- `src/components/ui/input.tsx` (new) — shadcn Input via @base-ui/react
- `src/components/DraggableCard.tsx` — Added onFlip? prop and didDragRef drag guard
- `src/components/PileZone.tsx` — Added Shuffle button and FLIP_CARD wiring
- `src/components/OpponentHand.tsx` — Added useDroppable for PASS_CARD, sendAction prop, isOver highlight
- `src/components/BoardView.tsx` — Added ControlsBar, justify-between layout, sendAction to OpponentHand
- `src/components/BoardDragLayer.tsx` — Added PASS_CARD dispatch for opponent-hand drops

## Decisions Made

- "Keep playing" cancel text used per plan acceptance criteria (plan line 231 was explicit); the UI spec copywriting contract says "Cancel" — used plan's spec since it was the binding acceptance criterion for this plan
- `isPassCard` is checked before `isSuccess` in `handleDragEnd` — ensures opponent-hand drops don't also trigger MOVE_CARD; `isSuccess` explicitly excludes `isPassCard`
- Phase 3 components (BoardView, PileZone, DraggableCard, etc.) copied into the worktree branch — the worktree was on branch `worktree-agent-a414b62f` which only contained Phase 1-2 src files; Phase 3 components existed only on `gsd/v1.0-milestone`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written after accounting for worktree file availability.

### Contextual Adjustments

**1. [Rule 3 - Blocking] Copied Phase 3 components into worktree**
- **Found during:** Task 2
- **Issue:** Worktree branch `worktree-agent-a414b62f` did not contain Phase 3 components (BoardView, PileZone, DraggableCard, OpponentHand, BoardDragLayer, HandZone, CardFace, CardBack, CardOverlay)
- **Fix:** Copied all 9 files from main repo (`gsd/v1.0-milestone`) into worktree; then applied modifications as planned
- **Files modified:** All 9 Phase 3 component files
- **Verification:** `npx tsc --noEmit` exits 0, `npm test` 72 tests pass

## Issues Encountered

None beyond the worktree file availability issue (auto-resolved).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All UI controls implemented and connected to server action types
- ControlsBar ready for runtime testing against PartyKit server
- PASS_CARD, FLIP_CARD, SHUFFLE_PILE, DEAL_CARDS, RESET_TABLE, UNDO_MOVE all have UI triggers
- No blockers for Plan 03

---
*Phase: 04-game-controls*
*Completed: 2026-04-04*

## Known Stubs

None — all controls dispatch real server actions. No placeholder data or TODO stubs.

## Self-Check: PASSED

- FOUND: .planning/phases/04-game-controls/04-02-SUMMARY.md
- FOUND: src/components/ControlsBar.tsx
- FOUND: src/components/ui/alert-dialog.tsx, popover.tsx, input.tsx
- FOUND: src/components/DraggableCard.tsx (onFlip + drag guard)
- FOUND: src/components/PileZone.tsx (Shuffle button + FLIP_CARD)
- FOUND: src/components/OpponentHand.tsx (useDroppable)
- FOUND: src/components/BoardView.tsx (ControlsBar in top strip)
- FOUND: src/components/BoardDragLayer.tsx (PASS_CARD dispatch)
- FOUND: commit 0d1375e (Task 1)
- FOUND: commit f988d5a (Task 2)
- FOUND: commit bbba2ea (metadata)
