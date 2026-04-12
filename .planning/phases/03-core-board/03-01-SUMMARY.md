---
phase: 03-core-board
plan: 01
subsystem: api
tags: [partykit, typescript, websocket, game-state, card-movement]

# Dependency graph
requires:
  - phase: 01-server-foundation
    provides: defaultGameState, viewFor, buildDeck, DRAW_CARD handler patterns
  - phase: 02-lobby-room-join
    provides: connected player infrastructure, stable player token via connection.id

provides:
  - MOVE_CARD ClientAction variant in src/shared/types.ts
  - MOVE_CARD handler in party/index.ts (hand->pile, pile->hand, pile->pile)
  - play pile in defaultGameState (id: play, name: Play Area)
  - Authorization enforcement for cross-player hand moves
  - CARD_NOT_IN_SOURCE and PILE_NOT_FOUND error codes
  - 9 unit tests in tests/moveCard.test.ts

affects: [03-02-board-layout, 03-03-drag-drop, all future plans that rely on card movement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MOVE_CARD action: atomically splices card from source and pushes to destination"
    - "Authorization check: fromZone/toZone=hand must match sender.id"
    - "Error-first pattern: send error and break before mutating state"

key-files:
  created:
    - tests/moveCard.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/deck.test.ts

key-decisions:
  - "MOVE_CARD supports hand->pile, pile->hand, and pile->pile to enable full board drag-and-drop"
  - "Both fromZone=hand and toZone=hand require sender.id match — prevents placing cards in another player's hand"
  - "Destination splice undo on invalid dest pile — card is returned to source if dest not found"
  - "play pile added as third defaultGameState pile alongside draw and discard"

patterns-established:
  - "Source validation before mutation: find source, find card index, then splice"
  - "Destination validation after splice with undo on failure"

requirements-completed: [TABLE-01, TABLE-02, CARD-01, CARD-02]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 03 Plan 01: MOVE_CARD Server Action Summary

**MOVE_CARD handler with atomic hand/pile card movement, cross-player authorization enforcement, and 3-pile defaultGameState (draw/discard/play)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T17:38:02Z
- **Completed:** 2026-04-03T17:39:36Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Added MOVE_CARD to ClientAction union type with fromZone/toZone/fromId/toId fields
- Implemented MOVE_CARD case in onMessage with atomic card transfer across hand and pile zones
- Added play pile (id: "play", name: "Play Area") as third pile in defaultGameState
- Enforced UNAUTHORIZED_MOVE for both source and destination hand access by non-owner
- 9 test cases in moveCard.test.ts covering all move scenarios and error paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MOVE_CARD type, play pile, server handler, and tests** - `78d7156` (feat)

## Files Created/Modified
- `src/shared/types.ts` - Added MOVE_CARD variant to ClientAction union
- `party/index.ts` - Added play pile to defaultGameState, added MOVE_CARD case in onMessage switch
- `tests/moveCard.test.ts` - New: 9 tests covering hand->pile, pile->hand, pile->pile, error codes, auth
- `tests/deck.test.ts` - Added assertions for 3-pile defaultGameState including play pile

## Decisions Made
- Both `fromZone=hand` and `toZone=hand` require sender.id match to block placing cards in another player's hand — this is the conservative security default and matches PROJECT.md's "private hands" requirement
- When destination pile is not found, the card is spliced back to its original index position to avoid accidental loss
- Play pile is a blank zone to support free-form area (per PROJECT.md "play area" requirement)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all logic is fully implemented and tested.

## Next Phase Readiness
- Server contract for MOVE_CARD is established and tested
- Plans 02/03 (board layout, drag-and-drop) can now rely on this handler
- defaultGameState has all 3 expected piles that the UI will render

---
*Phase: 03-core-board*
*Completed: 2026-04-03*
