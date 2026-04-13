---
phase: 09-player-identity-presence
plan: "01"
subsystem: server
tags: [displayName, player-identity, types, migration, tests]
dependency_graph:
  requires: []
  provides: [Player.displayName field, server ?name= param handling, onStart migration]
  affects: [src/shared/types.ts, party/index.ts, all tests using Player objects]
tech_stack:
  added: []
  patterns: [required string field on Player, onStart state migration pattern, TDD unit tests]
key_files:
  created:
    - tests/displayName.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/dealCards.test.ts
    - tests/moveCard.test.ts
    - tests/passCard.test.ts
    - tests/reconnect.test.ts
    - tests/resetTable.test.ts
    - tests/shufflePile.test.ts
    - tests/undoMove.test.ts
    - tests/viewFor.test.ts
decisions:
  - displayName is a required string (not optional) — consistent with D-09; empty string is the default, not null/undefined
  - 20-char truncation applied at server entry point (onConnect) per T-09-02 threat mitigation
  - Reconnect preserves existing non-empty displayName when incoming name param is empty
metrics:
  duration_minutes: 15
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_changed: 11
---

# Phase 09 Plan 01: displayName Data Model and Server Plumbing Summary

Player display names added to the type system and server logic: `Player.displayName: string` propagates through `viewFor` to all clients, the server reads `?name=` on connect with 20-char truncation, reconnecting players preserve their name when no new name is provided, and `onStart` migrates legacy state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add displayName to Player type and update server onConnect/onStart | 50b6acf | src/shared/types.ts, party/index.ts, 8 test fixtures |
| 2 | Create displayName unit tests | 0e3ee6a | tests/displayName.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in 8 existing test files**
- **Found during:** Task 1
- **Issue:** Adding `displayName: string` as a required field to the `Player` interface caused TypeScript errors in all test files that created inline player objects without the field.
- **Fix:** Added `displayName: ""` to every inline player object literal across 8 test files (dealCards, moveCard, passCard, reconnect, resetTable, shufflePile, undoMove, viewFor).
- **Files modified:** tests/dealCards.test.ts, tests/moveCard.test.ts, tests/passCard.test.ts, tests/reconnect.test.ts, tests/resetTable.test.ts, tests/shufflePile.test.ts, tests/undoMove.test.ts, tests/viewFor.test.ts
- **Commit:** 50b6acf

## Verification

- `npx tsc --noEmit` exits 0 (zero type errors)
- `npm test -- tests/displayName.test.ts` passes 7/7 tests
- `npm test` passes 96/96 tests (89 existing + 7 new)

## Known Stubs

None — displayName field is fully wired server-side. UI display is handled in subsequent plans (09-02+).

## Threat Flags

None — the T-09-02 truncation mitigation (`slice(0, 20)`) is implemented in `onConnect`.

## Self-Check: PASSED

- tests/displayName.test.ts: FOUND
- party/index.ts contains `searchParams.get("name")`: FOUND
- party/index.ts contains `.slice(0, 20)`: FOUND
- src/shared/types.ts contains `displayName: string`: FOUND
- Commit 50b6acf: FOUND
- Commit 0e3ee6a: FOUND
