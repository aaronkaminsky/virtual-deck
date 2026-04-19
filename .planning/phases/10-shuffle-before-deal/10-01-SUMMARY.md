---
phase: 10-shuffle-before-deal
plan: "01"
subsystem: server
tags: [game-logic, shuffle, events, tdd]
dependency_graph:
  requires: []
  provides: [PILE_SHUFFLED event type, broadcastShuffleEvent method, shuffle-before-deal in DEAL_CARDS]
  affects: [party/index.ts, src/shared/types.ts, tests/dealCards.test.ts]
tech_stack:
  added: []
  patterns: [discriminated union extension, broadcast helper method, server-side async delay for sequencing]
key_files:
  created: []
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/dealCards.test.ts
decisions:
  - "PILE_SHUFFLED added as third member of ServerEvent discriminated union"
  - "broadcastShuffleEvent placed adjacent to broadcastState for symmetry"
  - "650ms await delay in DEAL_CARDS handler sequences animation before state update"
  - "takeSnapshot called before shuffle so undo restores pre-shuffle pile order (D-03)"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_modified: 3
requirements:
  - GAME-01
---

# Phase 10 Plan 01: Shuffle Before Deal — Server Logic Summary

**One-liner:** `PILE_SHUFFLED` server event + `broadcastShuffleEvent` method + shuffle-before-deal sequence in `DEAL_CARDS` handler with 650ms animation window.

## What Was Built

### Task 1: PILE_SHUFFLED type + broadcastShuffleEvent method

- Extended `ServerEvent` union in `src/shared/types.ts` with `| { type: "PILE_SHUFFLED"; pileId: string }`
- Added `broadcastShuffleEvent(pileId: string)` private method to `GameRoom` in `party/index.ts`, placed adjacent to `broadcastState()`

### Task 2: Updated DEAL_CARDS handler + tests

Updated the `DEAL_CARDS` case in `party/index.ts` to follow the D-03/D-02/D-05/D-06 sequence:

```
takeSnapshot()                          → D-03: snapshot before shuffle (undo restores original order)
dealDrawPile.cards = shuffle(cards)     → D-02: shuffle before popping
this.broadcastShuffleEvent("draw")      → D-05: all clients receive shuffle signal
await new Promise(setTimeout, 650ms)   → D-06: animation window before state arrives
<card-pop deal loop>
```

Added 3 new test cases to `tests/dealCards.test.ts`:
1. Snapshot captures pre-shuffle pile order
2. Undo after DEAL_CARDS restores pre-shuffle order and all cards
3. PILE_SHUFFLED broadcast reaches all connections on DEAL_CARDS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors in broadcast test mock**
- **Found during:** Task 2 GREEN verification
- **Issue:** `getConnections` override had incompatible generic `TState` return type; `.map()` callback typed as `[string]` instead of `unknown[]`
- **Fix:** Cast `getConnections` override with `as unknown as Party.Room["getConnections"]`; changed map callback arg to `unknown[]`
- **Files modified:** `tests/dealCards.test.ts`
- **Commit:** 9a43a5e

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | 368384d | `test(10-01): add failing tests for shuffle-before-deal behaviors` |
| GREEN (feat) | 99fe5cc | `feat(10-01): update DEAL_CARDS handler with shuffle-before-deal sequence` |
| REFACTOR | — | No refactor needed |

RED confirmed: `broadcasts PILE_SHUFFLED` test failed before implementation. GREEN confirmed: all 9 tests passed after implementation.

## Verification Results

```
npx vitest run tests/dealCards.test.ts
  Test Files  1 passed (1)
  Tests  9 passed (9)

npx tsc --noEmit
  No errors in changed files (pre-existing errors in unrelated files only)
```

## Known Stubs

None — all new behaviors are fully wired server-side. Client animation (Plan 03) will consume the `PILE_SHUFFLED` event.

## Threat Flags

No new threat surface. The `PILE_SHUFFLED` event carries only `pileId` (server-controlled value, not user input). No new user input surface introduced.

## Self-Check: PASSED

- `src/shared/types.ts` contains `PILE_SHUFFLED` union member: FOUND
- `party/index.ts` contains `broadcastShuffleEvent` method: FOUND
- `party/index.ts` DEAL_CARDS has shuffle + broadcast + await in sequence: FOUND
- `tests/dealCards.test.ts` has 9 passing tests: VERIFIED
- Commits exist: 2a99795, 368384d, 99fe5cc, 9a43a5e: VERIFIED
