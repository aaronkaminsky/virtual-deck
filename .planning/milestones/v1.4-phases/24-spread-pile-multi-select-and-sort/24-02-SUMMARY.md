---
phase: 24-spread-pile-multi-select-and-sort
plan: "02"
subsystem: frontend
tags: [GridZone, grid-layout, dnd-kit, BoardDragLayer, BoardView, MOVE_GRID_CARD]
dependency_graph:
  requires: [24-01]
  provides: [GridZone-component, grid-cell-droppables, communal-zone-grid-render]
  affects: [src/components/GridZone.tsx, src/components/BoardDragLayer.tsx, src/components/BoardView.tsx]
tech_stack:
  added: []
  patterns: [per-cell-useDroppable, useDraggable-in-subcomponent, useDndMonitor-intra-grid, customCollision-bucket-extension]
key_files:
  created:
    - src/components/GridZone.tsx
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
decisions:
  - "GridCell registers its own useDroppable with id grid-cell-{row}-{col}-{pileId}; toId=pile.id (not cell ID) so isIntraSpreadReorder in BoardDragLayer correctly suppresses MOVE_CARD for intra-grid drags"
  - "useDraggable in GridCell disabled when topCard is null to avoid registering a drag source on empty cells"
  - "PLAY_CARD_SET multi-card external drops also receive toRow/toCol from over data (OQ3 recommendation in plan)"
  - "setDragRef is only called when topCard is non-null; setDropRef is always called on the container div"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-17"
  tasks: 2
  files: 3
---

# Phase 24 Plan 02: GridZone Frontend Component Summary

GridZone component built and wired: communal play pile now renders as a 2-row × 4/7-column interactive grid, with per-cell droppables, intra-grid MOVE_GRID_CARD dispatch, external drop toRow/toCol threading, stack badges, and a face toggle button.

## What Was Built

- **`src/components/GridZone.tsx`**: New component with `buildCellMap` (maps pile.cards+gridPositions to a `Map<"row,col", Card[]>`), `GridCell` sub-component (per-cell `useDroppable` + `useDraggable` on top card, dashed placeholder during drag, ×N count badge), `GridZone` main export with `useDndMonitor` for intra-grid MOVE_GRID_CARD dispatch and Eye/EyeOff face toggle
- **`src/components/BoardDragLayer.tsx`**: customCollision extended with `gridCellContainers` bucket (pointerWithin, checked after zone but before pile); handleDragEnd isSpread branch and PLAY_CARD_SET branch both spread `toRow`/`toCol` from over data when defined
- **`src/components/BoardView.tsx`**: Import `GridZone`; communalZone block swapped from `<SpreadZone>` to `<GridZone pile={communalZone} sendAction={sendAction} draggingCardId={draggingCardId} interactive={true} />`

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create GridZone.tsx component | 9aa46fc |
| 2 | Extend BoardDragLayer collision/handleDragEnd; swap GridZone into BoardView | 97bf012 |

## Verification

- `npm run typecheck` — exits 0 with no errors
- `npm test` — 187 tests pass across 24 test files (all existing tests green)
- Grep checks:
  - `grep -c 'GridZone' src/components/BoardView.tsx` → 2 (import + JSX usage)
  - `grep -c 'grid-cell-' src/components/BoardDragLayer.tsx` → 3 (gridCellContainers filter + gridCollisions comment)
  - `grep -c 'buildCellMap' src/components/GridZone.tsx` → 2 (definition + call site)
  - `grep -c 'MOVE_GRID_CARD' src/components/GridZone.tsx` → 1

## Deviations from Plan

None — plan executed exactly as written.

Note: The plan specified using a separate `setRefs` callback to combine `setDropRef` and `setDragRef`. The final implementation instead calls `setDropRef` directly on the container `ref` attribute and `setDragRef` on the inner draggable div, since the draggable card content is a child div, not the container itself. This is semantically equivalent (droppable = cell container, draggable = card inside cell) and matches the pattern from DraggableCard.tsx.

## Known Stubs

None. GridZone reads card data from `pile.cards` and `pile.gridPositions` provided by the server; no hardcoded empty values flow to the UI.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: handled-T-24-05 | src/components/GridZone.tsx | GridCell useDroppable sets toId=pile.id (not cell ID), ensuring isIntraSpreadReorder in BoardDragLayer correctly suppresses MOVE_CARD for intra-grid drags — T-24-05 mitigation confirmed |
| threat_flag: handled-T-24-06 | src/components/BoardDragLayer.tsx | gridCellContainers filter uses prefix 'grid-cell-' which never starts with 'pile-'; verified by literal string — T-24-06 mitigation confirmed |

## Self-Check: PASSED
