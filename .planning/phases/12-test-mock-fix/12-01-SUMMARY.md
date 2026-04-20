---
phase: 12-test-mock-fix
plan: "01"
subsystem: test-infrastructure
tags: [vitest, mocking, broadcast, viewFor, masking]
dependency_graph:
  requires: []
  provides: [shared-test-helpers, broadcast-masking-tests]
  affects: [tests/helpers.ts, tests/broadcastMasking.test.ts]
tech_stack:
  added: []
  patterns: [thunk-iterator-mock, per-connection-send-inspection]
key_files:
  created:
    - tests/helpers.ts
    - tests/broadcastMasking.test.ts
  modified: []
decisions:
  - makeMockRoom takes connections[] as first arg (not in overrides) so callers own the live array and mutations are visible to getConnections() at call time
  - Use thunk pattern for getConnections: () => connections[Symbol.iterator]() — not a stored iterator — so multiple spreads each get a fresh iterator
  - broadcastMasking tests use inline setup (no beforeEach) because each test needs an independent connection array
  - MOVE_CARD used to trigger broadcastState (PING does not call broadcastState per case "PING": break)
  - Phase 12 is additive only — no migration of the 11 existing files that define their own local makeMockRoom
metrics:
  duration: "~2 minutes"
  completed: "2026-04-20T13:19:00Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 12 Plan 01: Test Mock Fix Summary

**One-liner:** Shared test helper module and two broadcast masking tests that verify the viewFor masking contract through the real broadcastState execution path.

## What Was Built

### tests/helpers.ts
Exported shared mock helper module extracted from the pattern duplicated across 11 of 14 test files. Provides:
- `makeMockRoom(connections?, overrides?)` — creates a mock `Party.Room` whose `getConnections()` returns a fresh iterator from the caller-owned `connections` array on every call (thunk pattern)
- `makeMockConnection(id)` — creates a mock `Party.Connection` with a `vi.fn()` send spy and `state: { playerToken: id }` matching what `getPlayerToken()` expects
- `makeCard(id, faceUp?)` — convenience card factory using the `passCard.test.ts` variant with optional `faceUp` param

### tests/broadcastMasking.test.ts
Two tests in `describe("broadcastState masking via viewFor")`:
1. **Local player test** — asserts `localConn` receives a `STATE_UPDATE` with `state.myPlayerId === "player-1"` after a `MOVE_CARD` event triggers `broadcastState`
2. **Remote player test** — asserts `remoteConn` receives a `STATE_UPDATE` with `state.myPlayerId === "player-2"`, `state.myHand.length === 0`, and `state.opponentHandCounts["player-1"]` defined (masked count, not card objects)

Both tests use `makeMockRoom(connections)` with populated connections so `broadcastState` actually sends to both connections.

## Verification

- `npm test` from worktree: 15 test files, 114 tests, 0 failures
- Verbose output confirms both broadcastMasking tests pass
- `git diff` from base commit shows only 2 new files (no existing test file modified)

## Requirements Covered

| Req ID | Behavior | Result |
|--------|----------|--------|
| DEV-04a | getConnections() returns populated data in mock | Covered by makeMockRoom thunk design |
| DEV-04b | viewFor returns masked data for remote player via broadcastState | Covered by test 2 |
| DEV-04c | viewFor returns full data for local player via broadcastState | Covered by test 1 |
| DEV-04d | All existing tests continue to pass | 112 existing tests green |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1: tests/helpers.ts | e2e2dbd | feat(12-01): add shared test helper module |
| 2: tests/broadcastMasking.test.ts | c78be7f | feat(12-01): add broadcastMasking tests |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no stub data, placeholder text, or unwired data sources.

## Threat Flags

None — no production code modified, no new network endpoints, no auth/data handling changes.

## Self-Check: PASSED
