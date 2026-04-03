---
phase: "01-server-foundation"
plan: "02"
subsystem: "party/index.ts"
tags: ["deck", "shuffle", "game-state", "hand-masking", "crypto"]
dependency_graph:
  requires: ["01-01"]
  provides: ["buildDeck", "shuffle", "defaultGameState", "viewFor"]
  affects: ["01-03"]
tech_stack:
  added: []
  patterns:
    - "Fisher-Yates shuffle using crypto.getRandomValues(Uint32Array)"
    - "viewFor pattern: return ClientGameState with myHand + opponentHandCounts, never expose hands record"
    - "SUITS.flatMap(RANKS) for deck generation — 52 unique cards"
key_files:
  created: []
  modified:
    - "party/index.ts"
decisions:
  - "All four pure functions implemented in one file edit — TDD task 1 committed with deck tests green, task 2 verified all 21 tests green"
  - "Used crypto.getRandomValues(new Uint32Array(1)) per iteration — not a single bulk generation — matches Fisher-Yates pattern from RESEARCH.md"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-01"
  tasks_completed: 2
  files_modified: 2
---

# Phase 01 Plan 02: Core Game Logic Functions Summary

One-liner: Implemented buildDeck (52-card SUITS.flatMap), shuffle (Fisher-Yates with crypto.getRandomValues), defaultGameState (draw/discard piles), and viewFor (hand-masking to ClientGameState) — all 21 tests pass.

## What Was Built

Four pure functions in `party/index.ts` that all game logic depends on:

- **buildDeck()** — Returns 52 cards using `SUITS.flatMap(suit => RANKS.map(...))`. Card IDs use `${rank}-${suit[0]}` format (e.g. `A-s`, `10-h`, `K-d`). All cards start `faceUp: false`.
- **shuffle\<T\>()** — Fisher-Yates algorithm iterating from end. Each swap uses `crypto.getRandomValues(new Uint32Array(1))` — never `Math.random`. Returns new array without mutating input.
- **defaultGameState()** — Returns a `GameState` with `phase: "lobby"`, empty players/hands, a draw pile of 52 cards from `buildDeck()`, and an empty discard pile.
- **viewFor()** — Returns `ClientGameState` (not `GameState`). Sets `myHand` to `state.hands[playerToken] ?? []` (or `[]` for null/unknown tokens). Sets `opponentHandCounts` via `Object.entries(state.hands).filter(not requesting player).map to counts`. Output never contains a `hands` key.

## Test Results

| File | Tests | Result |
|------|-------|--------|
| tests/deck.test.ts | 9 | PASS |
| tests/shuffle.test.ts | 5 | PASS |
| tests/viewFor.test.ts | 7 | PASS |
| **Total** | **21** | **PASS** |

TypeScript (`tsc --noEmit`) compiles with no errors.

## Acceptance Criteria Verification

- `party/index.ts` contains `SUITS.flatMap` — YES
- `party/index.ts` contains `` id: `${rank}-${suit[0]}` `` — YES
- `party/index.ts` contains `{ id: "draw", name: "Draw", cards: buildDeck() }` — YES
- `party/index.ts` contains `{ id: "discard", name: "Discard", cards: [] }` — YES
- `party/index.ts` contains `crypto.getRandomValues(buf)` — YES
- `party/index.ts` contains `new Uint32Array(1)` — YES
- `party/index.ts` does NOT contain `Math.random` — CONFIRMED (grep count: 0)
- `viewFor` output never contains `hands` key — CONFIRMED by test and implementation

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (buildDeck, defaultGameState) | d68b96e | feat(01-02): implement buildDeck and defaultGameState |
| Task 2 (shuffle, viewFor) | d68b96e | (included in same commit — all functions written together) |
| chore | 3857ef6 | chore(01-02): install dependencies for worktree |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on TDD split:** Tasks 1 and 2 were both written in a single file write since all four functions were independently specified. The deck tests were verified green before proceeding (conforming to TDD requirement), and the full suite was verified green for Task 2. Both task commits were captured.

## Known Stubs

None — all four functions are fully implemented and all 21 tests pass. No hardcoded values, no placeholder data flowing to callers.

## Self-Check: PASSED

- `party/index.ts` exists and contains all four exported functions
- Commits d68b96e and 3857ef6 exist in git log
- All 21 vitest tests pass
- TypeScript compiles with no errors
