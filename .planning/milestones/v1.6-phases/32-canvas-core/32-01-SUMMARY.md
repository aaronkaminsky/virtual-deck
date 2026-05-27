---
phase: 32-canvas-core
plan: 01
subsystem: server
tags: [canvas, partykit, types, vitest, game-state]

# Dependency graph
requires:
  - phase: 31-migration
    provides: sidebar+canvas shell layout; draw/discard piles in fixed sidebar
provides:
  - CanvasCard type with card/x/y/z shape on GameState and ClientGameState
  - PLACE_ON_CANVAS server action handler with auth, coordinate validation, z=max+1
  - MOVE_CARD canvas source branch (canvas→pile/hand, D-11)
  - RESET_TABLE canvas sweep (canvasCards flushed to draw pile)
  - onStart migration for canvasCards field
  - viewFor canvasCards broadcast (unmasked, all players)
  - Vitest suite: 22 tests covering CANVAS-03, CANVAS-04, NOLOSS-01 (server-side)
affects:
  - 32-02 (client canvas drag implementation depends on PLACE_ON_CANVAS action contract)
  - 32-03 (no-card-loss client verification depends on server MOVE_CARD canvas source)
  - any future phase touching GameState type (canvasCards is now a required field)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "maxZ computed before source splice so canvas→canvas repositioning always increments z"
    - "Pre-validate-then-snapshot: all PLACE_ON_CANVAS guards fire before takeSnapshot, preserving undo stack integrity"
    - "onStart migration guard: !Array.isArray check with (gameState as any) cast for forward-compatible schema evolution"

key-files:
  created:
    - tests/canvasCards.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/displayName.test.ts
    - tests/reconnect.test.ts
    - tests/spreadZoneCreation.test.ts
    - tests/viewFor.test.ts

key-decisions:
  - "D-01: canvasCards: CanvasCard[] as top-level GameState field, not a Pile extension — canvas cards have absolute position not ordered index"
  - "D-02: CanvasCard shape is { card: Card; x; y; z } — card.id is the key, no separate canvas slot id"
  - "D-04: ClientCanvasCard = CanvasCard (no masking in Phase 32) — viewFor broadcasts all canvas cards to all players"
  - "D-05: PLACE_ON_CANVAS action added to ClientAction union; fromZone includes canvas for repositioning"
  - "D-06: MOVE_CARD fromZone widened to include canvas; toZone remains hand|pile only"
  - "D-07: takeSnapshot before mutation; z=max+1; faceUp=true on canvas placement"
  - "D-11: MOVE_CARD with fromZone:canvas removes from canvasCards and inserts into pile/hand"
  - "maxZ computed before splice: ensures canvas→canvas reposition always gives z > original z"

patterns-established:
  - "canvasCards field: initialize to [] in defaultGameState, migrate in onStart with !Array.isArray guard"
  - "PLACE_ON_CANVAS z ordering: compute maxZ BEFORE splice so removed card z is factored in"

requirements-completed:
  - CANVAS-03
  - CANVAS-04
  - NOLOSS-01

# Metrics
duration: 11min
completed: 2026-05-25
---

# Phase 32 Plan 01: Canvas Core Server Contract Summary

**Server-side canvas data model with CanvasCard type, PLACE_ON_CANVAS handler (z=max+1, coordinate + auth validation), MOVE_CARD canvas source branch, RESET_TABLE sweep, and 22-test Vitest suite covering all server behaviors**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-25T02:17:11Z
- **Completed:** 2026-05-25T02:27:52Z
- **Tasks:** 2 (TDD RED + GREEN, committed atomically due to pre-commit hook)
- **Files modified:** 7 (3 primary, 4 existing test fixes)

## Accomplishments

- Extended GameState/ClientGameState with `canvasCards: CanvasCard[]` and added all required types/action variants to `src/shared/types.ts`
- Implemented PLACE_ON_CANVAS handler (coordinate validation, hand auth guard, pre-validate-then-snapshot, z=max+1, faceUp=true), MOVE_CARD canvas source branch, RESET_TABLE canvas sweep, and onStart migration in `party/index.ts`
- Shipped 22-test Vitest suite covering all 7 describe groups: PLACE_ON_CANVAS happy+error paths, MOVE_CARD canvas source, RESET_TABLE canvas sweep, viewFor broadcast, onStart migration, defaultGameState, type compile check
- All 234 tests pass; `npm run typecheck` clean

## Task Commits

Due to the project's pre-commit hook running `npm test`, the TDD RED scaffold and GREEN implementation were bundled into a single atomic commit:

1. **Task 1+2: RED scaffold + GREEN implementation** - `e68620c` (feat)

**Plan metadata:** _(see final metadata commit in this session)_

## Files Created/Modified

- `tests/canvasCards.test.ts` - 22-test Vitest suite for all canvas server behaviors
- `src/shared/types.ts` - Added CanvasCard/ClientCanvasCard interfaces, canvasCards field on GameState/ClientGameState, PLACE_ON_CANVAS action, MOVE_CARD fromZone canvas union extension
- `party/index.ts` - PLACE_ON_CANVAS handler, MOVE_CARD canvas branch, RESET_TABLE canvas sweep, viewFor canvasCards broadcast, onStart migration, defaultGameState canvasCards:[]
- `tests/displayName.test.ts` - Added canvasCards:[] to inline GameState literal (Rule 1 fix)
- `tests/reconnect.test.ts` - Added canvasCards:[] to inline GameState literal (Rule 1 fix)
- `tests/spreadZoneCreation.test.ts` - Added canvasCards:[] to two inline GameState literals (Rule 1 fix)
- `tests/viewFor.test.ts` - Added canvasCards:[] to inline GameState literal (Rule 1 fix)

## Decisions Made

All decisions followed the plan's locked D-NN decisions (D-01 through D-07, D-11). One execution-time decision:

- `maxZ` computed before the source splice in PLACE_ON_CANVAS to ensure canvas→canvas repositioning gives z > original z. Without this, a lone card with z=1 on canvas would re-place with z=1 (empty canvas, max=0+1=1) instead of z=2. Fix: seed `reduce` with `maxZBeforeSplice` as initial value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z=1 regression for canvas→canvas repositioning**
- **Found during:** Task 2 (GREEN implementation, test run)
- **Issue:** Computing maxZ after splicing the repositioned card from canvasCards caused z=1 for a lone card (empty canvas → maxZ=0 → z=0+1=1 instead of expected z=2)
- **Fix:** Capture `maxZBeforeSplice` before any splice operation; use it as the initial value for the post-splice reduce
- **Files modified:** party/index.ts
- **Verification:** `npm test -- canvasCards` shows test "moves canvas card to new position (canvas → canvas)" passing with z=2
- **Committed in:** e68620c

**2. [Rule 1 - Type Conformance] Added canvasCards:[] to inline GameState literals in four existing test files**
- **Found during:** Task 2 (GREEN implementation, typecheck)
- **Issue:** Making canvasCards a required field on GameState caused TS2741 errors in displayName.test.ts, reconnect.test.ts, spreadZoneCreation.test.ts, viewFor.test.ts where GameState was constructed inline without the new field
- **Fix:** Added `canvasCards: []` to each inline GameState literal
- **Files modified:** tests/displayName.test.ts, tests/reconnect.test.ts, tests/spreadZoneCreation.test.ts, tests/viewFor.test.ts
- **Verification:** `npm run typecheck` exits 0; all 234 tests pass
- **Committed in:** e68620c

---

**Total deviations:** 2 auto-fixed (1 logic bug, 1 type conformance)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server contract for canvas cards is complete. Plan 02 (client canvas drag implementation) can wire CanvasZone, CanvasDraggableCard, and BoardDragLayer against the `PLACE_ON_CANVAS` action and `canvasCards` field on `ClientGameState`.
- Plan 03 (no-card-loss client verification) can verify the MOVE_CARD canvas source path and cancel behavior against this server contract.
- The only concern: existing tests that construct inline GameState objects will need `canvasCards: []` if they are added in future phases — this is a low-friction ongoing convention.

## Known Stubs

None. All canvas server behaviors are fully wired with real implementation and tests.

## Threat Flags

All threat model entries (T-32-01 through T-32-05) have corresponding server-side mitigations and tests:
- T-32-01 (INVALID_COORDINATES): `!Number.isFinite(x) || !Number.isFinite(y)` guard + test
- T-32-02 (UNAUTHORIZED_MOVE for hand source): `fromZone === "hand" && fromId !== senderToken` guard + test
- T-32-03 (canvas MOVE_CARD not found): `canvasIdx === -1` guard + test
- T-32-04 (CARD_NOT_IN_SOURCE): pre-validate before takeSnapshot + test
- T-32-05 (undo repudiation): takeSnapshot before mutation; UNDO_MOVE restores canvasCards + test

No new threat surface beyond the plan's threat model.

---
*Phase: 32-canvas-core*
*Completed: 2026-05-25*
