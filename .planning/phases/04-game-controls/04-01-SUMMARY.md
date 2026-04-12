---
phase: 04-game-controls
plan: 01
subsystem: api
tags: [partykit, typescript, vitest, tdd, game-state]

requires:
  - phase: 03-core-board
    provides: existing GameState/ClientGameState types and party/index.ts server handlers

provides:
  - Six new PartyKit action handlers: FLIP_CARD, PASS_CARD, DEAL_CARDS, SHUFFLE_PILE, RESET_TABLE, UNDO_MOVE
  - Per-player undo snapshot system (takeSnapshot helper + undoSnapshots field)
  - canUndo boolean in ClientGameState via viewFor
  - Extended phase union: "lobby" | "setup" | "playing"

affects: [04-02-ui-controls, 04-03-drag-integration]

tech-stack:
  added: []
  patterns:
    - "takeSnapshot: deep clone GameState via JSON.parse(JSON.stringify()), strip nested undoSnapshots"
    - "TDD pattern: write all test files (RED), then implement all handlers (GREEN)"
    - "Error response pattern: sender.send ERROR with typed code string before break"

key-files:
  created:
    - tests/flipCard.test.ts
    - tests/passCard.test.ts
    - tests/dealCards.test.ts
    - tests/shufflePile.test.ts
    - tests/resetTable.test.ts
    - tests/undoMove.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/deck.test.ts
    - tests/viewFor.test.ts

key-decisions:
  - "Added faceUp?: boolean to Pile interface — RESET_TABLE spec required setting pile faceUp, but type was missing the field"
  - "RESET_TABLE does not call takeSnapshot — reset is irreversible per design, undo-of-reset not supported"
  - "UNDO_MOVE replaces this.gameState = snap directly — snap.undoSnapshots stripped to {} by takeSnapshot so canUndo is immediately false after restore"
  - "DEAL_CARDS deals only to connected players — disconnected players are skipped in round-robin"

requirements-completed: [CARD-03, CARD-04, CTRL-01, CTRL-02, CTRL-03, CTRL-04]

duration: 5min
completed: 2026-04-04
---

# Phase 4 Plan 01: Game Controls Server Handlers Summary

**Six PartyKit server action handlers (FLIP_CARD, PASS_CARD, DEAL_CARDS, SHUFFLE_PILE, RESET_TABLE, UNDO_MOVE) with per-player undo snapshots and TDD coverage (61 tests passing)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T19:06:04Z
- **Completed:** 2026-04-04T19:11:00Z
- **Tasks:** 1
- **Files modified:** 10

## Accomplishments

- Extended GameState type with `undoSnapshots` field and "setup" phase, ClientGameState with `canUndo`, Pile with optional `faceUp`
- Implemented all 6 handlers in party/index.ts switch statement with proper validation and takeSnapshot calls
- Added `takeSnapshot` exported helper that deep-clones state and strips nested snapshots to prevent unbounded memory growth
- Updated `viewFor` to expose `canUndo` per-player; added `takeSnapshot` to existing DRAW_CARD handler
- Wrote 6 new test files and updated 2 existing test files — 61 tests total, all passing, tsc clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types and implement server handlers with TDD** - `1750a30` (feat)

## Files Created/Modified

- `src/shared/types.ts` - Added undoSnapshots to GameState, canUndo to ClientGameState, "setup" phase, faceUp? to Pile, 6 new ClientAction union members
- `party/index.ts` - Added takeSnapshot helper, canUndo in viewFor, undoSnapshots:{} in defaultGameState, 6 new case handlers, takeSnapshot in DRAW_CARD
- `tests/flipCard.test.ts` - 5 tests for FLIP_CARD handler
- `tests/passCard.test.ts` - 5 tests for PASS_CARD handler
- `tests/dealCards.test.ts` - 5 tests for DEAL_CARDS handler
- `tests/shufflePile.test.ts` - 3 tests for SHUFFLE_PILE handler
- `tests/resetTable.test.ts` - 6 tests for RESET_TABLE handler
- `tests/undoMove.test.ts` - 5 tests for UNDO_MOVE + takeSnapshot
- `tests/deck.test.ts` - Added undoSnapshots assertion to defaultGameState test
- `tests/viewFor.test.ts` - Added makeTestState undoSnapshots field, 3 new canUndo tests

## Decisions Made

- Added `faceUp?: boolean` to Pile interface — the RESET_TABLE spec required setting `drawPile.faceUp = false` but the Pile type was missing this field. Added it as optional to maintain backward compat with existing piles.
- RESET_TABLE does not call takeSnapshot before executing — per spec, reset is irreversible ("can't be undone"). Clearing all snapshots as part of reset is intentional.
- UNDO_MOVE restores state via direct assignment `this.gameState = snap` — because `takeSnapshot` strips undoSnapshots to `{}` in the clone, canUndo is immediately false post-restore without extra cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added faceUp? to Pile interface**
- **Found during:** Task 1 (implementing RESET_TABLE handler)
- **Issue:** TypeScript type error — `Property 'faceUp' does not exist on type 'Pile'` — plan spec required setting drawPile.faceUp but Pile type lacked the field
- **Fix:** Added `faceUp?: boolean` to Pile interface in src/shared/types.ts; updated resetTable.test.ts to remove `as any` cast
- **Files modified:** src/shared/types.ts, tests/resetTable.test.ts
- **Verification:** `npx tsc --noEmit` exits 0, all 61 tests pass
- **Committed in:** 1750a30 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing type field)
**Impact on plan:** Required for TypeScript correctness. Pile.faceUp is a legitimate field needed for pile display state; adding it as optional is non-breaking.

## Issues Encountered

None — plan executed cleanly after the Pile.faceUp type correction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 server action handlers ready for Plan 02 (UI controls) to dispatch against
- `canUndo` in ClientGameState ready for UI undo button state binding
- Phase "setup" state ready for deal flow UI
- No blockers

---
*Phase: 04-game-controls*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: .planning/phases/04-game-controls/04-01-SUMMARY.md
- FOUND: src/shared/types.ts
- FOUND: party/index.ts
- FOUND: tests/flipCard.test.ts, tests/passCard.test.ts, tests/dealCards.test.ts, tests/shufflePile.test.ts, tests/resetTable.test.ts, tests/undoMove.test.ts
- FOUND: commit 1750a30
