---
phase: 24-spread-pile-multi-select-and-sort
plan: "01"
subsystem: server
tags: [gridPositions, MOVE_GRID_CARD, types, party, vitest]
dependency_graph:
  requires: []
  provides: [gridPositions-server-state, MOVE_GRID_CARD-action, gridPositions-viewFor]
  affects: [party/index.ts, src/shared/types.ts]
tech_stack:
  added: []
  patterns: [TDD-red-green, server-action-handler, onStart-migration]
key_files:
  created:
    - tests/gridMove.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
decisions:
  - "Bounds: MOVE_GRID_CARD validates toRow in [0,1] and toCol in [0,6] with Number.isInteger before any mutation"
  - "gridPositions cleanup on MOVE_CARD and PLAY_CARD_SET: delete from source pile for all fromZone=pile moves, regardless of destination"
  - "onStart migration assigns sequential row/col only when play pile has cards but no gridPositions at all — does not overwrite partial state"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-17"
  tasks: 2
  files: 3
---

# Phase 24 Plan 01: gridPositions Server Foundation Summary

Added `gridPositions` server-side state so the Play Area grid knows where each card sits. Types extended, server handler implemented, viewFor threaded, and 7 unit tests passing.

## What Was Built

- **`src/shared/types.ts`**: `Pile.gridPositions`, `ClientPile.gridPositions`, optional `toRow`/`toCol` on `MOVE_CARD` and `PLAY_CARD_SET`, new `MOVE_GRID_CARD` action in `ClientAction` union
- **`party/index.ts`**: `MOVE_GRID_CARD` handler with input validation (T-24-01 through T-24-03 mitigated); gridPositions assignment/cleanup in `MOVE_CARD` and `PLAY_CARD_SET`; `RESET_TABLE` clear; `viewFor` threading; Phase 24 `onStart` migration
- **`tests/gridMove.test.ts`**: 7 passing TDD tests covering all GRID-01 server behaviors

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend types.ts with gridPositions and MOVE_GRID_CARD | 053a692 |
| 2 | Implement MOVE_GRID_CARD handler and gridPositions maintenance | 4ccee34 |

## Verification

- `npm test` — 187 tests pass across 24 test files (7 new gridMove tests green)
- `npm run typecheck` — exits 0 with no errors
- Grep checks:
  - `gridPositions` in `src/shared/types.ts`: 2 occurrences (Pile, ClientPile)
  - `MOVE_GRID_CARD` in `party/index.ts`: 1 occurrence
  - `gridPositions: pile.gridPositions` in `party/index.ts`: 1 occurrence
  - `pile.gridPositions = {}` in `party/index.ts`: 1 occurrence (RESET_TABLE)

## Deviations from Plan

None — plan executed exactly as written.

Note: The plan's verification section specified `grep -c 'gridPositions' src/shared/types.ts` should output >= 3 (expecting Pile, ClientPile, and MOVE_GRID_CARD to each contain the word). The actual count is 2 because `MOVE_GRID_CARD`'s type definition uses `toRow`/`toCol` field names, not `gridPositions`. Both `Pile` and `ClientPile` have the field as specified; this is a minor documentation inaccuracy in the verification section, not an implementation gap.

## Known Stubs

None.

## Threat Flags

None. All T-24-01 through T-24-03 threats addressed as planned.

## Self-Check: PASSED
