---
phase: quick
plan: pn2
subsystem: server
tags: [error-handling, draw-card, partykit]
dependency_graph:
  requires: []
  provides: [DRAW_CARD error returns]
  affects: [party/index.ts, tests/drawCard.test.ts]
tech_stack:
  added: []
  patterns: [satisfies ServerEvent for type-safe error sends]
key_files:
  created: [tests/drawCard.test.ts]
  modified: [party/index.ts]
decisions:
  - PILE_EMPTY error message uses "Pile {pileId} has no cards" (matches implementation spec)
  - "!action.pileId" guard handles both undefined and empty string for missing pileId at runtime
metrics:
  duration: 5
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_changed: 2
---

# Quick pn2: Fix DRAW_CARD Silent Failure — Return Error Summary

**One-liner:** Added explicit ERROR ServerEvent returns to the DRAW_CARD handler for three failure cases (missing pileId, nonexistent pile, empty pile), with TDD coverage in a new test file.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DRAW_CARD error tests (RED) | 2331538 | tests/drawCard.test.ts (created) |
| 2 | Add error returns to DRAW_CARD handler (GREEN) | 8453905 | party/index.ts (modified) |

## What Changed

**party/index.ts:** The `DRAW_CARD` case now checks three failure conditions before reaching the happy path:
1. Missing `pileId` → `ERROR { code: "MISSING_PILE_ID" }`
2. Pile not found → `ERROR { code: "PILE_NOT_FOUND" }`
3. Pile is empty → `ERROR { code: "PILE_EMPTY" }`

Each error uses `satisfies ServerEvent` for type safety, matching the existing `INVALID_MESSAGE` pattern in the file.

**tests/drawCard.test.ts:** New test file with 4 tests covering all three error paths plus the happy path (card moves from pile to player hand, no error sent).

## Verification

All 28 tests pass across 4 test files (`viewFor`, `deck`, `shuffle`, `drawCard`).

```
Test Files  4 passed (4)
Tests  28 passed (28)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `tests/drawCard.test.ts` exists: FOUND
- `party/index.ts` contains `MISSING_PILE_ID`: FOUND
- Commit 2331538 exists: FOUND
- Commit 8453905 exists: FOUND
