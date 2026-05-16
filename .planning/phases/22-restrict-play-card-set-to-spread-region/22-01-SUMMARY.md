---
phase: "22"
plan: "01"
subsystem: server
tags: [hand-reveal, server-side, types, masking, tdd]
dependency_graph:
  requires: []
  provides:
    - Player.handRevealed field
    - ClientGameState.myHandRevealed field
    - ClientGameState.opponentRevealedHands field
    - SET_HAND_REVEALED action handler
    - viewFor() per-connection hand masking extended for reveal
  affects:
    - party/index.ts (viewFor, onMessage, onStart, RESET_TABLE)
    - src/shared/types.ts (Player, ClientGameState, ClientAction)
    - All test files that construct Player literals
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle for server action handler
    - Mutually exclusive opponentHandCounts / opponentRevealedHands in viewFor()
    - onStart() migration guard for pre-phase-22 persisted Player records
    - Strict boolean equality for input validation (action.revealed === true)
key_files:
  created:
    - tests/handReveal.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/resetTable.test.ts
    - tests/broadcastMasking.test.ts
    - tests/moveCard.test.ts
    - tests/passCard.test.ts
    - tests/playCardSet.test.ts
    - tests/reconnect.test.ts
    - tests/reorderUndo.test.ts
    - tests/shufflePile.test.ts
    - tests/spreadZoneCreation.test.ts
    - tests/undoMove.test.ts
    - tests/viewFor.test.ts
    - tests/dealCards.test.ts
decisions:
  - "handRevealed stored on Player (co-located with the player it describes, simplifies RESET_TABLE and viewFor)"
  - "opponentHandCounts and opponentRevealedHands are mutually exclusive — revealed players appear only in opponentRevealedHands"
  - "Strict boolean equality (=== true) for revealed field — string 'true', 1, or other truthy non-booleans resolve to false (V5)"
  - "SET_HAND_REVEALED is not undoable — no takeSnapshot() call (consistent with RESET_TABLE)"
  - "Server derives player identity from senderToken (connection state), never from message body (V4)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-15"
  tasks_completed: 2
  files_changed: 14
---

# Phase 22 Plan 01: Hand Reveal — Server Side Summary

**One-liner:** Server-side hand reveal with SET_HAND_REVEALED action handler, per-connection viewFor() masking via opponentRevealedHands, onStart() migration guard, RESET_TABLE clearing, and 6-test TDD suite covering HAND-01 through HAND-04 plus access control and input validation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend types and create failing test suite (RED) | 1a7cc8c | src/shared/types.ts, tests/handReveal.test.ts |
| 2 | Implement server logic — handler, viewFor, migration, reset (GREEN) | c88af0b | party/index.ts, tests/resetTable.test.ts + 11 other test files |

## What Was Built

### Types Extended (src/shared/types.ts)

- `Player.handRevealed: boolean` — server-side reveal state co-located with the player it describes
- `ClientGameState.myHandRevealed: boolean` — required field; true when local player's hand is revealed
- `ClientGameState.opponentRevealedHands: Record<string, Card[]>` — required field; full Card[] for revealed opponents (mutually exclusive with opponentHandCounts)
- `ClientAction | { type: "SET_HAND_REVEALED"; revealed: boolean }` — new action variant

### Server Logic (party/index.ts)

1. **SET_HAND_REVEALED handler** — uses `senderToken` from connection state for identity (V4 access control); strict `=== true` boolean check for `revealed` field (V5 input validation); no `takeSnapshot()` (reveal not undoable)

2. **viewFor() extension** — `opponentHandCounts` now filters to hidden players only; `opponentRevealedHands` contains full `Card[]` for revealed players; `myHandRevealed` reflects the requesting player's state. Two opponent collections are mutually exclusive.

3. **onStart() migration guard** — adds `handRevealed: false` to any Player record missing the field (forward-compatible with pre-phase-22 persisted state)

4. **RESET_TABLE extension** — clears `handRevealed = false` for all players (D-07)

5. **onConnect** — new players created with `handRevealed: false`

### Test Coverage

- `tests/handReveal.test.ts` — 6 tests covering HAND-01, HAND-02, HAND-03, HAND-04, V4 access control, V5 input validation — all GREEN
- `tests/resetTable.test.ts` — extended with "clears handRevealed for all players on RESET_TABLE" test case

## Verification Results

```
npm test: 172 passed (172) — all tests GREEN
npm run typecheck: exit 0 — no type errors

grep -c "SET_HAND_REVEALED" party/index.ts => 1
grep -c "handRevealed" party/index.ts => 9
grep "handRevealed" src/shared/types.ts => handRevealed: boolean (on Player)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed all test files to include handRevealed on Player object literals**
- **Found during:** Task 2 (typecheck run after implementing party/index.ts)
- **Issue:** Adding `handRevealed: boolean` as a required field on `Player` caused TypeScript errors in 13 test files that constructed Player objects without the new field
- **Fix:** Added `handRevealed: false` (or `handRevealed: true` where appropriate) to all Player object literals in test files
- **Files modified:** tests/broadcastMasking.test.ts, tests/dealCards.test.ts, tests/moveCard.test.ts, tests/passCard.test.ts, tests/playCardSet.test.ts, tests/reconnect.test.ts, tests/reorderUndo.test.ts, tests/shufflePile.test.ts, tests/spreadZoneCreation.test.ts, tests/undoMove.test.ts, tests/viewFor.test.ts
- **Commits:** c88af0b

## Known Stubs

None — no hardcoded empty values or placeholder text that would prevent the plan's goal. The `opponentRevealedHands` field is populated by real `viewFor()` logic, not a stub. The UI plan (22-02) will consume these fields.

## Threat Flags

No new security surface beyond the threat model in the plan. The SET_HAND_REVEALED handler implements all required mitigations:
- T-22-01: identity derived from senderToken, not message body
- T-22-02: strict `=== true` check; string "true" resolves to false
- T-22-03: opponentRevealedHands only populated for handRevealed===true players; mutually exclusive with opponentHandCounts

## TDD Gate Compliance

- RED gate: commit 1a7cc8c (`test(22-01)`) — 6 failing tests
- GREEN gate: commit c88af0b (`feat(22-01)`) — all 6 tests passing

## Self-Check

Files exist:
- [x] tests/handReveal.test.ts — FOUND
- [x] src/shared/types.ts (modified) — FOUND
- [x] party/index.ts (modified) — FOUND
- [x] tests/resetTable.test.ts (modified) — FOUND

Commits exist:
- [x] 1a7cc8c — FOUND (test RED)
- [x] c88af0b — FOUND (feat GREEN)

## Self-Check: PASSED
