---
phase: 14-gameplay-zone-infrastructure
plan: "04"
subsystem: game-state, drag-and-drop, server
tags: [partykit, react, dnd-kit, spread-zone, game-state, gap-closure]

requires:
  - phase: 14-03
    provides: DEAL_CARDS pre-loop hand initialization fix (GAP-01)

provides:
  - play pile converted to region=spread (communal spread zone, GAP-04)
  - spread-communal pile removed from defaultGameState and migration
  - REORDER_PILE_SPREAD server action handler with card-set validation
  - Spread zone drops bypass insert-position dialog (GAP-02)
  - SpreadZone component with SortableContext drag-to-reorder (GAP-03)

affects: [14-05, future spread zone features]

tech-stack:
  added: []
  patterns:
    - "SortableContext + useSortable per card in SpreadZone (mirrors HandZone sortable pattern)"
    - "useDndMonitor in SpreadZone for intra-pile reorder detection"
    - "targetPile.region === 'spread' guard in BoardDragLayer for dialog bypass"
    - "onStart migration: convert pile region + remove superseded pile with card transfer"

key-files:
  created: []
  modified:
    - party/index.ts
    - src/shared/types.ts
    - src/components/BoardView.tsx
    - src/components/BoardDragLayer.tsx
    - src/components/SpreadZone.tsx
    - tests/spreadZoneCreation.test.ts
    - tests/deck.test.ts
    - tests/moveCard.test.ts
    - tests/resetTable.test.ts

key-decisions:
  - "play pile IS the communal spread zone — no separate spread-communal pile needed (GAP-04)"
  - "onStart migration transfers cards from spread-communal into play pile before removal — no cards lost"
  - "Spread zone drops always insert at top, no dialog — matches user mental model (spread = lay out in order)"
  - "REORDER_PILE_SPREAD validated with card-set check (T-14-04-01) and region=spread guard (T-14-04-02)"

requirements-completed: [PLAY-01, PLAY-02]

duration: ~20min
completed: 2026-04-26
---

# Phase 14-04: Spread Zone Communal Rename + Drop Bypass + Sortable Reorder Summary

**play pile renamed to region=spread as the communal spread zone; spread-communal removed; non-empty spread zone drops bypass the insert dialog and always place at top; SpreadZone cards are drag-sortable with REORDER_PILE_SPREAD**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-04-26
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

### Task 1: Server — convert play pile, remove spread-communal, add REORDER_PILE_SPREAD

- `defaultGameState()`: play pile `region` changed from `"pile"` to `"spread"`; `spread-communal` entry removed (3 piles: draw, discard, play)
- `onStart()` migration: converts play pile to `region="spread"`, removes `spread-communal` (transfers any cards first), seeds play pile if absent from very old state
- `REORDER_PILE_SPREAD` action handler added: validates `pileId` targets a `region="spread"` pile, validates `orderedCardIds` is an exact set match of current cards, then reorders
- `ClientAction` union: `REORDER_PILE_SPREAD` variant added to `src/shared/types.ts`
- Updated 4 test files: 126 tests pass with 0 failures

### Task 2: Client — BoardView communal ref, BoardDragLayer spread bypass, SpreadZone sortable

- `BoardView.tsx`: `communalZone` now derived from `p.id === 'play'` (not `'spread-communal'`)
- `BoardDragLayer.tsx`: added `isSpread = targetPile?.region === 'spread'` check; spread drops bypass dialog and always call `sendAction` with `insertPosition: 'top'`
- `SpreadZone.tsx`: full rewrite — added `SortableContext` + `useSortable` per face-up card; `useDndMonitor` detects intra-pile drops and dispatches `REORDER_PILE_SPREAD`; masked cards remain non-sortable `CardBack` elements

## Task Commits

1. **Task 1: Server changes** — `95e3031` (feat)
2. **Task 2: Client component updates** — `ab055cc` (feat)

## Files Created/Modified

- `party/index.ts` — defaultGameState, onStart migration, REORDER_PILE_SPREAD handler
- `src/shared/types.ts` — REORDER_PILE_SPREAD added to ClientAction union
- `src/components/BoardView.tsx` — communalZone: `p.id === 'play'`
- `src/components/BoardDragLayer.tsx` — spread region bypass before dialog
- `src/components/SpreadZone.tsx` — SortableContext + useSortable + useDndMonitor
- `tests/spreadZoneCreation.test.ts` — renamed/updated tests for GAP-04 assertions
- `tests/deck.test.ts` — pile count updated from 4 to 3
- `tests/moveCard.test.ts` — spread zone test updated from spread-communal to play
- `tests/resetTable.test.ts` — spread zone reset test updated from spread-communal to play

## Decisions Made

- Chose to keep `'play'` as the pile ID for the communal spread zone — avoids renaming the pile and breaking `MOVE_CARD` references; only the `region` field changes
- Migration transfers cards from `spread-communal` into `play` before removal — no data loss for in-flight sessions
- `isSpread` check added in `BoardDragLayer` between the `isEmpty` path and the `setPendingMove` path — minimal invasive change, no restructuring of existing dialog logic required

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Additional test files referenced spread-communal**

- **Found during:** Task 1 — after fixing the files listed in the plan, vitest run revealed 2 more failures
- **Issue:** `tests/moveCard.test.ts` and `tests/resetTable.test.ts` both referenced `spread-communal` in tests that now failed since the pile no longer exists in `defaultGameState`
- **Fix:** Updated both tests to use `play` pile as the communal spread zone, matching GAP-04 semantics
- **Files modified:** `tests/moveCard.test.ts`, `tests/resetTable.test.ts`
- **Commit:** Included in Task 1 commit `95e3031`

## Verification Results

- `npx vitest run`: 126/126 tests pass
- `npx tsc --noEmit`: 1 error (pre-existing `BoardDragLayer.tsx` TS2591 `process.env`, unchanged)
- `grep party/index.ts 'spread-communal'`: appears only in migration removal code, not in `defaultGameState()`
- `grep BoardView.tsx 'spread-communal'`: not found
- `grep BoardView.tsx "p.id === 'play'"`: found in `communalZone` derivation
- `grep BoardDragLayer.tsx "region === 'spread'"`: found
- `grep SpreadZone.tsx "REORDER_PILE_SPREAD"`: found
- `grep SpreadZone.tsx "SortableContext"`: found

## Known Stubs

None.

## Threat Flags

No new network endpoints, auth paths, or schema changes beyond what is documented in the plan's threat model.

## Self-Check: PASSED

- All 10 files found on disk
- Commits 95e3031 and ab055cc confirmed in git log
- 126/126 tests pass
- 1 pre-existing TypeScript error (BoardDragLayer.tsx TS2591)

---
*Phase: 14-gameplay-zone-infrastructure*
*Completed: 2026-04-26*
