---
phase: 34-multi-card-group-drop
plan: 01
subsystem: api
tags: [partykit, typescript, vitest, websocket, game-state, canvas, tdd]

# Dependency graph
requires:
  - phase: 32-canvas-core
    provides: CanvasCard type, PLACE_ON_CANVAS handler, canvasCards[] field in GameState
provides:
  - GROUP_PLACE_ON_CANVAS ClientAction union member in src/shared/types.ts
  - SelectionSource exported type in src/shared/types.ts
  - GROUP_PLACE_ON_CANVAS server handler in party/index.ts with auth + validation + atomic z-assignment
  - Wave-0 test suite (11 tests) covering all server behavior bullets
affects:
  - 34-02 (client integration imports SelectionSource from shared/types.ts)
  - 34-03 (verifier runs against implemented handler)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-validate-all before takeSnapshot for batch actions (atomicity invariant)
    - Sort by pre-drag z ascending before assigning maxZ+1+rank (z-ordering invariant)
    - Pre-compute maxZ before any splice (canvas→canvas z monotonicity)
    - Collect splice indices descending to avoid index-shift bugs in canvas source removal

key-files:
  created:
    - .planning/phases/34-multi-card-group-drop/34-01-SUMMARY.md
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/canvasCards.test.ts

key-decisions:
  - "GROUP_PLACE_ON_CANVAS validation order: empty → invalid coords → duplicate IDs → hand auth → missing card; all before takeSnapshot"
  - "canvas source: preDragZ read from existing canvasCards entry; hand/pile source: preDragZ=0 (no canvas z yet)"
  - "SelectionSource exported from shared/types.ts with canvas variant { zone: 'canvas'; zoneId: 'canvas' } for Plan 02 client import"
  - "TDD RED/GREEN committed together due to pre-commit hook requiring passing tests"

patterns-established:
  - "GROUP_PLACE_ON_CANVAS follows PLAY_CARD_SET atomicity pattern: pre-validate-all before takeSnapshot"
  - "Canvas splice uses descending index order to avoid shifting after each removal"
  - "z-order: sort by preDragZ ascending, then push at maxZ+1+rank"

requirements-completed: [MULTI-02, MULTI-03, MULTI-04]

# Metrics
duration: 10min
completed: 2026-05-25
---

# Phase 34 Plan 01: Server Action + Types Summary

**Atomic GROUP_PLACE_ON_CANVAS server handler with z-order preservation, auth guards, and 11 Wave-0 tests flipped GREEN**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-25T22:09:00Z
- **Completed:** 2026-05-25T22:12:23Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended `ClientAction` union with `GROUP_PLACE_ON_CANVAS` (fromZone, fromId, cards[]) and exported `SelectionSource` three-variant type
- Implemented `GROUP_PLACE_ON_CANVAS` case in `party/index.ts` with complete validation chain, single takeSnapshot, atomic multi-source removal, and ascending z-order assignment
- Wrote and flipped GREEN 11 Wave-0 tests covering all threat mitigations (T-34-01 through T-34-04) and MULTI-02/03/04 requirements

## Task Commits

1. **Task 1: Extend ClientAction union and export SelectionSource type** - `a5b3185` (feat)
2. **Task 2+3: Wave-0 RED tests + GROUP_PLACE_ON_CANVAS implementation (GREEN)** - `d22a26a` (feat)

## Files Created/Modified

- `src/shared/types.ts` - Added GROUP_PLACE_ON_CANVAS union member and SelectionSource export
- `party/index.ts` - Added GROUP_PLACE_ON_CANVAS case handler with full validation + atomic z-assignment
- `tests/canvasCards.test.ts` - Added describe("GROUP_PLACE_ON_CANVAS handler") with 11 tests

## Decisions Made

- TDD RED/GREEN committed together (single commit `d22a26a`) because the pre-commit hook requires all tests to pass; separate RED-only commit was blocked by the hook.
- `preDragZ = 0` for hand/pile source cards — no existing canvas z; deterministic sort by source-array order when all pre-drag z are equal, then ascending z assignment still works correctly.
- maxZ computed BEFORE any canvas splice so canvas→canvas repositioning always gets z above the card's former position.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit hook blocks RED-only commit**
- **Found during:** Task 2 (Wave-0 RED tests)
- **Issue:** Project pre-commit hook runs `npm test`, which requires all tests to pass. Committing the RED test file before the handler was implemented would be blocked by the hook.
- **Fix:** Implemented Task 3 (the handler) before committing, then committed both Task 2 test file and Task 3 handler together in a single commit. The TDD contract (tests written before implementation, handler makes them GREEN) is preserved in the commit message.
- **Files modified:** `party/index.ts`, `tests/canvasCards.test.ts`
- **Verification:** `npm test` exits 0; 254/254 tests pass.
- **Committed in:** d22a26a

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** No scope change. Tests and implementation still follow the Wave-0 TDD contract; only the commit granularity changed due to hook constraints.

## Issues Encountered

None beyond the pre-commit hook blocking a RED-only commit (handled above).

## Known Stubs

None — no UI components modified; server handler fully implemented.

## Threat Flags

None — all T-34-01 through T-34-04 threats are mitigated and verified by passing tests.

## Self-Check

- [x] `src/shared/types.ts` contains `GROUP_PLACE_ON_CANVAS` (1 match) and `export type SelectionSource` (1 match)
- [x] `party/index.ts` contains `case "GROUP_PLACE_ON_CANVAS"` (1 match)
- [x] `tests/canvasCards.test.ts` has `describe("GROUP_PLACE_ON_CANVAS handler"` (1 match)
- [x] Commits a5b3185 and d22a26a exist on branch
- [x] 254/254 tests pass; typecheck clean

## Next Phase Readiness

- Plan 02 (client integration) can now import `SelectionSource` from `src/shared/types.ts`
- `GROUP_PLACE_ON_CANVAS` is fully server-ready; client only needs to dispatch the action with correct coordinates
- No blockers; server behavior locked by 11 tests

---
*Phase: 34-multi-card-group-drop*
*Completed: 2026-05-25*
