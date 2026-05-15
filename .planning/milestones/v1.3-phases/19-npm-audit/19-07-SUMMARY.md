---
plan: 19-07
phase: 19-npm-audit
status: complete
task1: complete
task2: gaps-found
completed: 2026-05-09T07:15:00Z
commit: 789522d
key-files:
  modified:
    - src/components/BoardView.tsx
---

# Plan 19-07 Summary: BoardView Layout Restructure

## What Was Built

Restructured `src/components/BoardView.tsx` to close Gap 5 (header anchoring on phone) and Gap 7 (desktop vertical overflow) via a single-file flex-layout change.

**Five className edits + two structural insertions:**

1. **Root div** — dropped `overflow-y-auto sm:overflow-hidden`; kept only `overflow-x-hidden`. Root is now a static `h-screen flex flex-col` container that never scrolls itself.
2. **Header div** — removed `sticky top-0 z-20`. Header is anchored by being the first flex-shrink-0 child above the scroll container — no CSS positioning needed.
3. **New inner scroll container** — inserted `<div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col">` wrapping the center row, mySpreadZone, and HandZone. Phone scrolls inside this div; desktop is `overflow-hidden` with proportional sizing.
4. **Center pile/communal row** — added `min-h-0` to `flex-1 flex items-center px-4 gap-4`. Without `min-h-0`, a flex-1 item refuses to shrink below content height — this was the root cause of Gap 7.
5. **mySpreadZone wrapper** — added `flex-shrink-0` to `bg-card px-4 py-2`. Prevents the personal spread zone from collapsing under desktop's overflow-hidden constraint.

All Plan 06 invariants preserved: `opponentCount` derivation, adaptive opponent column ternary, opponents-row parent classes.

## Automated Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm test -- --run` (150 tests) | PASS |
| Root div has `overflow-x-hidden` only (no `overflow-y-auto`) | PASS (grep=1) |
| `sticky top-0` removed | PASS (grep=0) |
| Inner scroll container present | PASS (grep=1) |
| Center row has `min-h-0` | PASS (grep=1) |
| mySpreadZone wrapper has `flex-shrink-0` | PASS (grep=1) |
| `opponentCount` derivation preserved | PASS (grep=1) |
| Adaptive opponent column ternary preserved | PASS (grep=1) |
| No other source file modified | PASS |

## Human UAT (Task 2)

Gap 5 and Gap 7 structurally resolved — user confirmed desktop no-scroll. Three new gaps found during UAT:

- **Gap 8**: Hamburger button vertically centered in tall header instead of top-aligned → Plan 19-08
- **Gap 9**: Opponent card count badge clipped on mobile (absolute-positioned badge overflows column boundary) → Plan 19-09
- **Gap 10**: Opponent column pushed off-screen when play area expands (overflow-x-auto on opponents row allows involuntary scroll) → Plan 19-10

## Self-Check: PASSED

Task 1 complete. Task 2 found new gaps — gap plans created, no blocking issues with Task 1 implementation.
