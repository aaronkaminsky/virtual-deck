---
phase: quick-260522-t4p
plan: 01
subsystem: ui
tags: [react, controls, drag-and-drop, spread-zone]

requires: []
provides:
  - Reset button enabled state tracks any mutation via canUndo instead of phase
  - Opponent empty spread zones collapse to dashed strip same as player's empty spread zone
affects: [ControlsBar, SpreadZone]

tech-stack:
  added: []
  patterns:
    - "canUndo as reset gate: use gameState.canUndo (server-authoritative snapshot count) instead of phase === 'playing' for enabling the Reset button"
    - "Empty zone collapse: drop interactive guard on isEmpty className branch so all empty spread zones collapse identically"

key-files:
  created: []
  modified:
    - src/components/ControlsBar.tsx
    - src/components/SpreadZone.tsx

key-decisions:
  - "Gate resetDisabled on !gameState.canUndo — RESET_TABLE clears undoSnapshots so the button auto-disables after reset without needing a phase check"
  - "Remove isEmpty && interactive !== false guard — isOver on non-interactive opponent zones is always false so reveal branch is harmless"

patterns-established: []

requirements-completed: [999.51, 999.54]

duration: 5min
completed: 2026-05-22
---

# Quick Task 260522-t4p: Reset Button + Opponent Spread Collapse

**Reset button now enables on any mutation (canUndo-based), and opponent empty spread zones collapse to the same faint dashed strip as the player's empty spread zone**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-22T00:00:00Z
- **Completed:** 2026-05-22T00:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Reset button is now enabled after any deal, move, flip, or shuffle — and correctly disabled after reset or in fresh lobby state
- Opponent empty spread zones no longer remain full-size; they collapse to the same h-4 dashed strip as the player's own empty spread zone

## Task Commits

1. **Task 1: Fix reset button gating (999.51)** - `36d2a85` (fix)
2. **Task 2: Collapse opponent spread zone when empty (999.54)** - `b51718c` (fix)

## Files Created/Modified
- `src/components/ControlsBar.tsx` - `resetDisabled` now computed from `!gameState.canUndo` instead of `gameState.phase !== 'playing'`
- `src/components/SpreadZone.tsx` - Removed `&& interactive !== false` guard from empty-collapse className branch

## Decisions Made
- `canUndo` is server-authoritative (computed from `undoSnapshots.length` in `viewFor`). Using it as the reset gate means the button tracks actual mutation history rather than a phase label that can go stale after reset.
- The `isOver` reveal branch inside the now-expanded empty path is safe for non-interactive zones: opponents cannot drag to their own spread, so `isOver` will never be true for those zones.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Both correctness bugs resolved. No blockers.

---
*Phase: quick-260522-t4p*
*Completed: 2026-05-22*
