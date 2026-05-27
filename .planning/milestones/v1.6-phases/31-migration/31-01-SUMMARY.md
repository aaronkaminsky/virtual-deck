---
phase: 31-migration
plan: "01"
subsystem: server-types-tests
tags:
  - migration
  - server
  - types
  - tests
dependency_graph:
  requires: []
  provides:
    - "Server defaultGameState with draw+discard only (no play pile)"
    - "ClientAction union without MOVE_GRID_CARD, toRow, toCol"
    - "Pile/ClientPile types without gridPositions"
    - "gridRemoval.test.ts regression guard"
  affects:
    - party/index.ts
    - src/shared/types.ts
    - tests/*.test.ts
tech_stack:
  added: []
  patterns:
    - "Wave 0 RED test created before implementation (TDD gate)"
    - "Atomic multi-file commit: types + server + tests in one GREEN flip"
    - "Client stub pattern: GridZone.tsx stubbed to null to defer layout restructure"
key_files:
  created:
    - tests/gridRemoval.test.ts
  modified:
    - party/index.ts
    - src/shared/types.ts
    - src/components/GridZone.tsx
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - tests/resetTable.test.ts
    - tests/moveCard.test.ts
    - tests/playCardSet.test.ts
    - tests/selectAll.test.ts
    - tests/reorderUndo.test.ts
    - tests/boardDragLayerDialog.test.ts
    - tests/spreadZoneCreation.test.ts
    - tests/deck.test.ts
  deleted:
    - tests/gridMove.test.ts
    - tests/gridZoneFaceToggle.test.ts
decisions:
  - "MIGRATE-01: All grid surface (MOVE_GRID_CARD, gridPositions, play pile) removed atomically from server and shared types"
  - "MIGRATE-03: RESET_TABLE sweep loop preserved; vacuously satisfied at Phase 31 because no canvas pile exists yet"
  - "Client stub: GridZone stubbed to null (not deleted) so BoardView imports resolve until Plan 02 restructures the layout band"
  - "Atomic commit strategy: Tasks 1 and 2 committed together because pre-commit hook runs typecheck, which requires both type and server changes to be present"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-23T23:00:39Z"
  tasks_completed: 2
  files_changed: 16
---

# Phase 31 Plan 01: Remove Communal Grid from Server and Types Summary

JWT-style one-liner: Server-side communal grid eliminated — `defaultGameState` returns only draw+discard piles, `MOVE_GRID_CARD` removed from the action union and server switch, `gridPositions` deleted from `Pile`/`ClientPile` types, all tests realigned, regression guard in `tests/gridRemoval.test.ts`.

## What Was Done

### Server (party/index.ts)

Lines deleted from `party/index.ts`:

- **defaultGameState piles** (line 49): Removed `{ id: "play", name: "Play Area", cards: [], faceUp: true, region: "spread", ownerId: null }` third pile entry. Final state: `[draw, discard]` only.
- **onStart migration guards** (lines 140–180): Removed the Phase 14-GAP04 play-pile migration block (30 lines), spread-communal removal block (9 lines), and Phase 24 gridPositions initialization block (9 lines).
- **viewFor** (line 90): Removed `gridPositions: pile.gridPositions, // Phase 24: Pitfall 4 — must be explicit` line.
- **MOVE_CARD case** (lines 326–348): Removed the grid position assignment block (18 lines) and the gridPositions cleanup block (4 lines).
- **MOVE_GRID_CARD case** (lines 400–426): Deleted entire case block (27 lines).
- **RESET_TABLE handler** (line 589): Removed `if (pile.gridPositions) pile.gridPositions = {};` inline guard.
- **PLAY_CARD_SET case** (lines 736–764): Removed grid position assignment block (19 lines) and gridPositions cleanup block (8 lines).
- **MOVE_ALL_PILE_CARDS case** (line 784): Removed `if (srcPile.gridPositions) srcPile.gridPositions = {};` line.

### Shared Types (src/shared/types.ts)

Fields removed:

- `Pile.gridPositions?: Record<string, { row: number; col: number }>` — deleted.
- `ClientPile.gridPositions?: Record<string, { row: number; col: number }>` — deleted.
- `ClientAction.MOVE_CARD.toRow?: number; toCol?: number` — deleted.
- `ClientAction.PLAY_CARD_SET.toRow?: number; toCol?: number` — deleted.
- `ClientAction` member `{ type: "MOVE_GRID_CARD"; cardId: string; pileId: string; toRow: number; toCol: number }` — deleted.

### Tests Deleted

| File | Reason |
|------|--------|
| `tests/gridMove.test.ts` | All 7 tests exercise MOVE_GRID_CARD handler behavior (deleted action) |
| `tests/gridZoneFaceToggle.test.ts` | All 6 tests exercise GridZone component face-up state (component stubbed) |

### Tests Repaired

| File | Change |
|------|--------|
| `tests/resetTable.test.ts` | Removed the "clears cards from spread zones without removing zone" it-block (asserted 'play' pile persists post-reset) |
| `tests/moveCard.test.ts` | Replaced 3 tests using `toId: "play"` with equivalent tests using `discard`/`draw`; removed SC-3 "draw to play pile" test |
| `tests/playCardSet.test.ts` | Rewrote: all 6 tests with `toId: "play"` redirected to `spread-player-1` or `discard` |
| `tests/selectAll.test.ts` | SELECT-02 and SELECT-03: changed `fromId: "play"` to `fromId: "spread-player-1"`, `toId` to `discard` |
| `tests/reorderUndo.test.ts` | REORDER_PILE_SPREAD tests: replaced 'play' pile seeding with explicit spread-player-1 pile creation |
| `tests/boardDragLayerDialog.test.ts` | GAP-06 tests: replaced `id: "play"` fixtures and `handlePileDrop` args with `spread-player-1` |
| `tests/spreadZoneCreation.test.ts` | Removed 2 it-blocks asserting play pile existence/migration; kept onConnect personal-spread tests |
| `tests/deck.test.ts` | Updated "has 3 piles" test to assert 2 piles; removed "play pile has name" test |

### New Test (tests/gridRemoval.test.ts)

Three regression guards:
- **Test A**: `defaultGameState` returns exactly `["discard", "draw"]` — no 'play' pile (GREEN after this plan).
- **Test B**: Sending `MOVE_GRID_CARD` to `onMessage` does not throw; server falls through the switch silently; state unchanged.
- **Test C**: `// @ts-expect-error gridPositions removed in Phase 31` on a `Pile` object with `gridPositions` — enforces compile-time absence of the field.

### Client Stub Fixes (Minimum for Typecheck)

- **GridZone.tsx**: Body replaced with `export function GridZone(_props: any): null { return null; }`. Import in BoardView still resolves; Plan 02 deletes the file.
- **BoardDragLayer.tsx**: Removed `gridCellContainers` filter and grid collision branch, `gridOverDataMulti` spread in PLAY_CARD_SET dispatch, `gridOverData` spread in MOVE_CARD spread dispatch, and `MOVE_GRID_CARD` block in the `else if (selectedIds.size > 1 && selectionSource?.zoneId === 'play')` branch.
- **BoardView.tsx**: `communalZone` changed from `spreadPiles.find(p => p.id === 'play')` to `undefined` — the `{communalZone && ...}` block becomes dead code; Plan 02 removes it.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 211/211 tests pass
- `tests/gridRemoval.test.ts` Test A (no 'play' pile): GREEN
- `tests/gridRemoval.test.ts` Test B (MOVE_GRID_CARD graceful fallthrough): GREEN
- `tests/gridRemoval.test.ts` Test C (`@ts-expect-error` on gridPositions): GREEN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] deck.test.ts had two additional tests referencing the 'play' pile**
- **Found during:** Task 2 (after initial test run)
- **Issue:** `tests/deck.test.ts` had "has 3 piles with ids draw, discard, and play" and "play pile has name Play Area" tests — not listed in the plan's repair list.
- **Fix:** Merged the two tests into one: "has 2 piles with ids draw and discard (Phase 31: communal grid removed)".
- **Files modified:** `tests/deck.test.ts`
- **Commit:** 19b74f9

**2. [Rule 3 - Blocking] TypeScript error on GridZone stub — null return type rejected existing props**
- **Found during:** Task 2 (first typecheck run)
- **Issue:** `export function GridZone(): null { return null; }` caused TS2322 on the `<GridZone pile={communalZone} ...>` call in BoardView even though it's dead code (communalZone is `undefined`).
- **Fix:** Changed stub to `export function GridZone(_props: any): null { return null; }` to accept any props.
- **Files modified:** `src/components/GridZone.tsx`
- **Commit:** 19b74f9

**3. [Rule 2 - Missing validation] playCardSet.test.ts validation tests used 'play' pile as destination**
- **Found during:** Task 2
- **Issue:** "sends UNAUTHORIZED_MOVE" and "sends CARD_NOT_IN_SOURCE" tests used `toId: "play"` which would now return PILE_NOT_FOUND, not the expected error codes.
- **Fix:** Redirected all validation tests to use `spread-player-1` or `discard` as destination.
- **Files modified:** `tests/playCardSet.test.ts`
- **Commit:** 19b74f9

## Known Stubs

| Stub | File | Reason | Resolved By |
|------|------|--------|-------------|
| `GridZone` stub returns `null` | `src/components/GridZone.tsx` | Component behavior removed in Phase 31; layout restructure deferred | Plan 02 (client layout band) |
| `communalZone = undefined` | `src/components/BoardView.tsx` | Dead code — `{communalZone && ...}` block never renders | Plan 02 deletes the block |

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Net attack surface **decreases** (one fewer action type in the switch statement). T-31-01 and T-31-02 mitigations from the plan's threat model are verified by `tests/gridRemoval.test.ts` Test A and Test B respectively.

## Self-Check: PASSED

- `tests/gridRemoval.test.ts` exists at correct path: FOUND
- `tests/gridMove.test.ts` deleted (git ls-files returns empty): CONFIRMED
- `tests/gridZoneFaceToggle.test.ts` deleted (git ls-files returns empty): CONFIRMED
- Commit 19b74f9 exists in git log: CONFIRMED
- `npm test` 211/211: CONFIRMED
- `npm run typecheck` 0 errors: CONFIRMED
