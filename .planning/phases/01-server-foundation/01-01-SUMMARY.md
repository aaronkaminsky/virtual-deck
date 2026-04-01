---
phase: 01-server-foundation
plan: 01
subsystem: server
tags: [scaffolding, types, testing, partykit, vitest, typescript]
dependency_graph:
  requires: []
  provides: [src/shared/types.ts, party/index.ts, vitest config, project manifest]
  affects: [01-02, 01-03]
tech_stack:
  added: [partykit@0.0.115, partysocket@1.1.16, nanoid@5.1.7, typescript@6.0.2, vitest@4.1.2]
  patterns: [Party.Server class pattern, viewFor hand masking stub, Fisher-Yates stub, shared types]
key_files:
  created:
    - package.json
    - tsconfig.json
    - partykit.json
    - vitest.config.ts
    - .gitignore
    - src/shared/types.ts
    - party/index.ts
    - tests/deck.test.ts
    - tests/shuffle.test.ts
    - tests/viewFor.test.ts
  modified: []
decisions:
  - "Card ID format: rank-suit[0] (e.g. A-s, 10-h, K-d) — unambiguous for all 52 cards including 10s"
  - "Stub return type annotations added to buildDeck():Card[] and viewFor():ClientGameState to satisfy tsc strict mode while keeping stubs functionally incorrect (red phase)"
  - "ClientAction in types.ts uses SHUFFLE_DECK/DRAW_CARD/PING (plan spec) rather than JOIN/SHUFFLE_DECK/PING (research doc) — plan takes precedence for Phase 1 stub scope"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-04-01"
  tasks_completed: 2
  files_created: 10
---

# Phase 01 Plan 01: Project Scaffolding and Failing Test Stubs Summary

Project scaffolded with TypeScript 6, vitest 4, PartyKit 0.0.115, and three failing test files covering all Phase 1 pure-function requirements (buildDeck, shuffle, viewFor).

## What Was Built

- **package.json** — project manifest with partykit, partysocket, nanoid, vitest, typescript; module type set to ESM
- **tsconfig.json** — strict TypeScript with bundler module resolution, @shared path alias, rootDir set to `.` for shared types across party/ and src/
- **partykit.json** — PartyKit project config pointing to party/index.ts with 2023-10-01 compatibility date
- **vitest.config.ts** — test runner config with `tests/**/*.test.ts` include glob and @shared alias matching tsconfig
- **src/shared/types.ts** — canonical type definitions: Suit, Rank, Card, Player, Pile, GameState, ClientGameState, ClientAction, ServerEvent
- **party/index.ts** — Party.Server skeleton with stub implementations that return incorrect values (empty arrays, no masking) — intentionally wrong for red phase
- **tests/deck.test.ts** — 9 failing assertions covering buildDeck() (52 cards, no duplicates, suit distribution, ID format, faceUp:false) and defaultGameState() (draw pile, discard pile, empty hands)
- **tests/shuffle.test.ts** — 5 assertions covering shuffle() (length, elements, non-mutation, statistical randomness, no Math.random)
- **tests/viewFor.test.ts** — 7 failing assertions covering hand masking (myHand isolation, opponentHandCounts, no hands key leak, null/unknown token)

## Verification Results

- `tsc --noEmit`: exit 0 — TypeScript compiles with no errors
- `vitest run`: 3 test files discovered, 9 tests failing, 12 passing — red phase confirmed
- `partykit.json` contains `"main": "party/index.ts"` — confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added return type annotations to stub functions**
- **Found during:** Task 2 verification
- **Issue:** `buildDeck()` returned `never[]` (TypeScript inferred empty array literal type) and `viewFor()` returned `opponentHandCounts: {}` (empty object literal type), causing `tsc --noEmit` to fail with 8 errors in test files
- **Fix:** Added explicit return types `Card[]` to `buildDeck()` and `ClientGameState` to `viewFor()`, and imported `Card` and `ClientGameState` in party/index.ts
- **Files modified:** `party/index.ts`
- **Commit:** 48f9218 (included in Task 2 commit)

## Known Stubs

The following stubs are intentional — this is the red phase. Plan 02 implements them:

| File | Stub | Reason |
|------|------|--------|
| party/index.ts | `buildDeck()` returns `[]` | Intentional — red phase, Plan 02 implements |
| party/index.ts | `shuffle()` returns `arr` unchanged | Intentional — red phase, Plan 02 implements |
| party/index.ts | `defaultGameState()` returns empty piles `[]` | Intentional — red phase, Plan 02 implements |
| party/index.ts | `viewFor()` returns `myHand: []`, `opponentHandCounts: {}` | Intentional — red phase, Plan 02 implements |

These stubs are designed to fail the tests in tests/deck.test.ts, tests/shuffle.test.ts, and tests/viewFor.test.ts. The plan's goal is achieved: test files exist, TypeScript compiles, vitest discovers all tests, and the project is ready for Plan 02 implementation.

## Self-Check: PASSED

All 10 created files confirmed present on disk. Both task commits (73a3053, 48f9218) confirmed in git log.
