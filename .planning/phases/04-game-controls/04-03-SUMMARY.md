---
plan: 04-03
phase: 04-game-controls
status: complete
completed: 2026-04-05
key-files:
  created: []
  modified:
    - party/index.ts
    - src/shared/types.ts
    - src/components/ControlsBar.tsx
    - src/components/HandZone.tsx
    - src/components/BoardView.tsx
    - src/hooks/usePartySocket.ts
    - tests/undoMove.test.ts
    - tests/viewFor.test.ts
    - tests/moveCard.test.ts
    - tests/dealCards.test.ts
---

## Summary

Human verification of Phase 4 game controls completed. All 6 ROADMAP success criteria confirmed working across multiple browser tabs.

## What Was Built

Human UAT session for the complete game control loop: flip card, shuffle pile, deal cards, pass card to opponent, undo, and reset table.

## Bugs Found and Fixed During UAT

1. **Multi-tab broadcast broken** — Both tabs shared localStorage playerId; PartySocket displaced Tab 1's connection when Tab 2 connected with the same ID. Fix: removed `id: playerId` from PartySocket constructor so each tab gets a unique ephemeral connection.id.

2. **Deal button required 2 clicks** — `PopoverTrigger` wrapped a Base UI `<Button>` primitive, causing first click to be consumed internally. Fix: render PopoverTrigger as native `<button>` with `buttonVariants()` class.

3. **Deal only went to one player** — Both tabs sent the same localStorage playerId as query param; server saw one player entry. Fix: server uses `connection.id` as playerToken; `viewFor()` sends `myPlayerId` back to client so drag auth uses the correct identity.

4. **Hand drag rejected after deal** — Drag system sent localStorage playerId as `fromId`; server compared against `connection.id` (senderToken) and returned UNAUTHORIZED_MOVE. Fix: `viewFor()` includes `myPlayerId: playerToken`; client uses server-assigned identity for all drag operations.

5. **Drop highlight inconsistent with large hand** — `useDroppable`'s `isOver` only triggered on bare background; with 10+ cards, almost no background was visible. Fix: highlight activates via `useDndContext()` when cursor is over the zone or any card within it.

6. **MOVE_CARD didn't snapshot** — Undo stayed disabled after use because MOVE_CARD never called `takeSnapshot()`. Fix: `takeSnapshot()` added to MOVE_CARD before state mutation.

7. **Per-player undo had cross-player state corruption** — Undoing your own move from 2 moves ago also undid moves in between. Redesigned to global shared undo stack (20 entries, any player can undo, always reverts most recent move).

## Verification Result

All 6 Phase 4 requirements confirmed by human across 2 browser tabs:
- CARD-03: Flip card ✓
- CTRL-02: Shuffle pile ✓  
- CTRL-01: Deal N cards to all players ✓
- CARD-04: Pass card to opponent ✓
- CTRL-04: Undo (global stack, 20 moves) ✓
- CTRL-03: Reset table ✓

## Self-Check: PASSED

79 tests passing, TypeScript clean.
