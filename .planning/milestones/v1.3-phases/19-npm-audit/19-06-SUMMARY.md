---
phase: 19
plan: "06"
subsystem: frontend-layout
tags:
  - responsive-layout
  - gap-closure
  - opponent-zones
  - sticky-header
  - overflow
dependency_graph:
  requires:
    - 19-04
    - 19-05
  provides:
    - sticky-header-375px
    - adaptive-opponent-column-width
  affects:
    - BoardView.tsx
tech_stack:
  added: []
  patterns:
    - "sticky top-0 inside overflow-y-auto scroll container"
    - "flex-1 max-w-none vs max-w-[200px] ternary on opponentCount"
key_files:
  created: []
  modified:
    - src/components/BoardView.tsx
decisions:
  - "max-w-[200px] chosen over max-w-[180px]: 162px strip + 24px badge + 4px gap + 8px padding = 198px worst case; 200px provides 2px margin"
  - "flex-1 max-w-none for single opponent over w-full: flex-1 fills remaining row space idiomatically inside flex-row parent without overflow risk"
  - "z-20 for sticky header: above normal-flow board content (implicit z-0) but below shadcn Popover z-50 so open ControlsBar panel still overlays correctly"
metrics:
  duration: "< 5 min"
  completed: "2026-05-08"
  tasks_completed: 1
  files_modified: 1
---

# Phase 19 Plan 06: Sticky Header + Adaptive Opponent Column Width Summary

Three targeted edits to `src/components/BoardView.tsx` closing UAT Gaps 4, 5, and 6 at 375px. No other file touched.

## What Was Built

Sticky opponent/controls header and adaptive per-opponent column width in `BoardView.tsx`.

**Edit 1 — `opponentCount` local variable (Gap 6 prerequisite)**

Added `const opponentCount = Object.keys(gameState.opponentHandCounts).length;` after the four existing derived constants. Used inside the map's wrapper `className` expression to drive the single-opponent vs. multi-opponent branch.

**Edit 2 — Sticky header bar (Gap 5 fix)**

Changed the header div wrapping the opponents strip and ControlsBar from:
```
flex items-center justify-between px-4 py-2 gap-4 bg-card
```
to:
```
sticky top-0 z-20 flex items-center justify-between px-4 py-2 gap-4 bg-card
```
The root div already has `overflow-y-auto` on phones (set by Plan 03), making it the scroll container. `sticky top-0` inside that container pins the header to the top of the phone viewport when the board is scrolled vertically. On desktop the root has `sm:overflow-hidden` so there is no scroll container — sticky is a no-op. `z-20` keeps the header above board content (no explicit z-index) and below shadcn Popover's `z-50`.

**Edit 3 — Adaptive per-opponent column wrapper (Gaps 4 + 6 fix)**

Changed the per-opponent column wrapper `className` from a static string with `max-w-[160px]` to a template-literal ternary:
```tsx
className={`flex flex-col gap-1 ${opponentCount === 1 ? 'flex-1 max-w-none' : 'max-w-[200px]'} sm:max-w-none overflow-x-hidden`}
```
- `opponentCount === 1` → `flex-1 max-w-none`: column fills available row width (Gap 6)
- `opponentCount !== 1` → `max-w-[200px]`: wide enough for 5 × 42px CardBacks with -ml-3 overlap (162px) + Badge (~24px) + gap-1 (~4px) + padding (~8px) = ~198px worst case; 200px provides 2px margin (Gap 4)
- `sm:max-w-none overflow-x-hidden` preserved on both branches (desktop behavior unchanged; column clips long spread zones as before)

## Acceptance Criteria Verification

All grep gates passed (output `1` where expected `1`, output `0` where expected `0`):

| Gate | Result |
|------|--------|
| `opponentCount` declaration present exactly once | 1 |
| `opponentCount === 1` usage present exactly once | 1 |
| `sticky top-0 z-20` present exactly once | 1 |
| Sticky class on `bg-card` header div | 1 |
| Old non-sticky header line gone | 0 |
| Adaptive wrapper ternary present exactly once | 1 |
| Old `max-w-[160px]` wrapper gone | 0 |
| Wrapper retains `sm:max-w-none overflow-x-hidden` | 1 |
| Root div unchanged (Plan 03 invariant) | 1 |
| Opponents-row parent unchanged | 1 |
| No other `src/components/` files modified | 0 |

## Automated Test Results

- `npm run typecheck` — exit 0
- `npm test -- --run` — 150/150 tests passed (18 test files)
- `npm run test:e2e -- --grep "LAYOUT-04: no horizontal scroll"` — 1/1 passed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/BoardView.tsx` exists and contains all three edits
- [x] Task commit `602e4c3` exists in git log
- [x] No unintended file deletions in commit
- [x] No other files in `src/components/` modified
