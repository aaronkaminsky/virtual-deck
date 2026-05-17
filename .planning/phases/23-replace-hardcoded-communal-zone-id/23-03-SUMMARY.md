---
phase: 23-replace-hardcoded-communal-zone-id
plan: 03
subsystem: ui
tags: [react, lucide-react, dnd-kit, select-all, spread-zone, pile-zone]

requires:
  - phase: 23-01
    provides: "REORDER_HAND skipSnapshot flag; Wave-0 selectAll test scaffold"

provides:
  - "handleSelectAll callback in BoardDragLayer that atomically sets selectedIds + selectionSource"
  - "onSelectAll prop threaded through BoardView to PileZone and interactive SpreadZones (not opponent)"
  - "Select All ghost icon button (SquareCheck) in PileZone controls row — selects top card only"
  - "Select All ghost icon button in SpreadZone alongside Eye button — selects all face-up cards, interactive only"
  - "3 passing PLAY_CARD_SET tests in tests/selectAll.test.ts covering SELECT-01, SELECT-02, SELECT-03"

affects: [plan-02, HandZone drag behavior, BoardDragLayer selection state]

tech-stack:
  added: []
  patterns:
    - "Select All callback: early-return guard + atomic React state set (selectedIds + selectionSource)"
    - "Prop threading: non-optional onSelectAll on BoardViewProps, optional on PileZoneProps/SpreadZoneProps"
    - "SpreadZone Select All conditional render: interactive !== false && (<Button .../>)"

key-files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - src/components/PileZone.tsx
    - src/components/SpreadZone.tsx
    - tests/selectAll.test.ts

key-decisions:
  - "Opponent SpreadZone receives no onSelectAll prop AND SpreadZone.handleSelectAll early-returns on interactive === false (two-layer defense)"
  - "PileZone Select All = top card only (D-08/D-09) — interior pile cards are masked and unknown client-side"
  - "SpreadZone Select All = all face-up cards (faceUpCards derived from existing filter at line 88)"
  - "makeStateWithPileCards clears pile.cards before pushing test cards so draw pile (52 cards in defaultGameState) does not pollute test counts"

patterns-established:
  - "Select All button: variant=ghost h-7 w-7 p-0, SquareCheck icon w-4 h-4, disabled when empty"

requirements-completed:
  - SELECT-01
  - SELECT-02
  - SELECT-03

duration: 45min
completed: 2026-05-16
---

# Phase 23 Plan 03: Select All Summary

**Added Select All affordances to every PileZone and interactive SpreadZone, wired through BoardDragLayer's selection state, with server-side coverage proving multi-card PLAY_CARD_SET acceptance.**

## What Shipped

- `BoardDragLayer.tsx`: `handleSelectAll(cardIds, zone, zoneId)` atomically replaces selection state; guards empty input.
- `BoardView.tsx`: `onSelectAll` added to `BoardViewProps` (non-optional); threaded to PileZone and both interactive SpreadZones; opponent SpreadZone explicitly excluded.
- `PileZone.tsx`: SquareCheck button in controls row (`flex gap-1 mt-1`); disabled when pile is empty; selects top card id only.
- `SpreadZone.tsx`: SquareCheck button in flex container with Eye button; only rendered when `interactive !== false`; disabled when no face-up cards; selects all `faceUpCards` ids.
- `tests/selectAll.test.ts`: 3 `it.todo` stubs converted to passing `it()` tests — pile top-card move, full spread group move, partial multi-card move without CARD_NOT_IN_SOURCE error.

## Deviations

None — plan executed as specified. `makeStateWithPileCards` in `selectAll.test.ts` sets `pile.cards = [...cards]` (replace rather than push) to avoid the 52-card default draw pile inflating counts.
