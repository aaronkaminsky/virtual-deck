---
phase: 14-gameplay-zone-infrastructure
plan: "03"
subsystem: testing
tags: [partykit, vitest, game-state, deal-cards]

requires:
  - phase: 14-01
    provides: Server foundation with DEAL_CARDS handler in party/index.ts

provides:
  - DEAL_CARDS pre-loop hand initialization for all connected players (GAP-01 fix)
  - Regression test: late-joining player receives cards after reset and re-deal
  - Regression test: DEAL_CARDS initializes missing hand entry for connected player

affects: [14-04, future deal-related features]

tech-stack:
  added: []
  patterns: [pre-loop initialization guard pattern for connected players]

key-files:
  created: [tests/dealCards.test.ts (2 new test cases added)]
  modified: [party/index.ts, tests/dealCards.test.ts]

key-decisions:
  - "Moved per-iteration hand guard to a pre-loop initialization pass — more explicit, testable, and preserves snapshot-before-deal invariant (D-03)"
  - "Removed the per-iteration guard inside the deal loop after replacing with pre-loop pass"

patterns-established:
  - "Pre-loop init pattern: always ensure all connected players have hand entries initialized before entering the deal loop"

requirements-completed: [PLAY-01, PLAY-02]

duration: 10min
completed: 2026-04-26
---

# Phase 14-03: Fix DEAL_CARDS Late-Joiner Hand Initialization Summary

**Pre-loop hand initialization in DEAL_CARDS ensures connected players who join after the initial deal always receive cards on re-deal (GAP-01)**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-26
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Moved per-iteration `if (!this.gameState.hands[player.id])` guard to a pre-loop initialization pass before the deal loop runs
- Added `// Ensure every connected player has an initialized hand entry (GAP-01: late joiners)` comment for traceability
- Added regression test: "late-joining player receives cards after reset and re-deal"
- Added regression test: "DEAL_CARDS initializes missing hand entry for connected player before dealing"
- All 126 tests pass with 0 failures

## Task Commits

1. **Task 1: Fix DEAL_CARDS hand init and add late-joiner regression tests** - `253f3f7` (feat)

## Files Created/Modified
- `party/index.ts` — Pre-loop hand initialization block added before deal loop; per-iteration guard removed
- `tests/dealCards.test.ts` — Two new regression test cases added to existing `describe("DEAL_CARDS handler")` block

## Decisions Made
- Replaced the per-iteration guard with a single pre-loop pass — cleaner, more testable, and makes the invariant explicit
- Preserved snapshot-before-deal ordering (D-03): pre-loop init runs after `takeSnapshot`, before the deal loop

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GAP-01 closed: late-joining players now receive cards on subsequent deals after reset
- 14-04 can proceed: party/index.ts is stable, spread zone refactor can build on the corrected deal handler

---
*Phase: 14-gameplay-zone-infrastructure*
*Completed: 2026-04-26*
