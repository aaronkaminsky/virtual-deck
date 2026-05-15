---
phase: 19
plan: 05
subsystem: frontend-layout
tags:
  - responsive-layout
  - gap-closure
  - opponent-zones
  - overflow
dependency_graph:
  requires:
    - 19-03  # root div overflow-x-hidden from Plan 03
  provides:
    - OpponentHand card-back cap at 5 (MAX_VISIBLE_OPPONENT_CARDS)
    - Bounded opponent column wrapper (max-w-[160px] sm:max-w-none)
  affects:
    - src/components/OpponentHand.tsx
    - src/components/BoardView.tsx
tech_stack:
  added: []
  patterns:
    - Mobile-first responsive column cap via Tailwind arbitrary value + sm: breakpoint revert
key_files:
  created: []
  modified:
    - src/components/OpponentHand.tsx
    - src/components/BoardView.tsx
decisions:
  - "Cap at 5 rather than adding a separate +N overflow badge — existing total-count Badge already conveys true count; simpler change"
  - "max-w-[160px] matches 5 x 42px cards with -ml-3 overlap plus margin for dot/name/badge; sm:max-w-none preserves desktop layout"
  - "overflow-x-hidden on the per-opponent column (not SpreadZone) — SpreadZone is shared and must not be narrowed for player's own or communal zones"
metrics:
  duration: "~2 minutes"
  completed: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 19 Plan 05: OpponentHand Cap + Opponent Column Overflow Clamp Summary

**One-liner:** Capped opponent card-back strip at 5 visible CardBacks via MAX_VISIBLE_OPPONENT_CARDS and bounded the per-opponent column wrapper at max-w-[160px] below sm: with overflow-x-hidden to eliminate the two remaining 375px overflow vectors identified in Human UAT Gaps 2 and 3.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Cap visible OpponentHand card backs at 5 | 2f14471 | src/components/OpponentHand.tsx |
| 2 | Constrain opponent column width in BoardView | 315e36d | src/components/BoardView.tsx |

## Changes Made

### Task 1 — OpponentHand.tsx (2 edits)

**Edit 1:** Added `const MAX_VISIBLE_OPPONENT_CARDS = 5;` at module scope after the imports block and before `interface OpponentHandProps`.

**Edit 2:** Changed the render loop from `Array.from({ length: cardCount })` to `Array.from({ length: Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS) })`. The existing `{cardCount > 0 && <Badge>{cardCount}</Badge>}` Badge continues to show the true card count unconditionally.

No other changes: component contract, prop destructuring, CardBack className (`w-[42px] h-[59px]`), connected dot, displayName span, "Drop to pass" hint, and all imports are unchanged.

### Task 2 — BoardView.tsx (1 edit)

**Edit:** Changed the per-opponent column wrapper from:
```tsx
<div key={id} className="flex flex-col gap-1">
```
to:
```tsx
<div key={id} className="flex flex-col gap-1 max-w-[160px] sm:max-w-none overflow-x-hidden">
```

- `max-w-[160px]` (default, <640px): bounds the column at phone widths so no single opponent column can force page-level overflow at 375px
- `sm:max-w-none`: reverts to no constraint at desktop, preserving existing desktop layout exactly
- `overflow-x-hidden`: clips any opponent SpreadZone content that exceeds the column; SpreadZone's existing `overflow-x-auto` provides scroll inside the zone

The player's own `mySpreadZone`, the communal zone, the `HandZone`, the `ControlsBar`, and the root div from Plan 03 (`overflow-x-hidden overflow-y-auto sm:overflow-hidden`) are all unchanged.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS (0 errors) |
| `npm test -- --run` (150 tests) | PASS |
| `npm run test:e2e -- --grep "LAYOUT-04: no horizontal scroll"` | PASS (1 test, 1.1s) |
| `grep -c "^const MAX_VISIBLE_OPPONENT_CARDS = 5;$" OpponentHand.tsx` | 1 |
| `grep -c "Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS)" OpponentHand.tsx` | 1 |
| `grep -c "Array.from({ length: cardCount })" OpponentHand.tsx` | 0 (gone) |
| `grep -c "max-w-\[160px\] sm:max-w-none overflow-x-hidden" BoardView.tsx` | 1 |
| Plan 03 root div class preserved | 1 occurrence (unchanged) |
| SpreadZone.tsx not modified | Confirmed (`git diff` = 0 lines) |

## Deviations from Plan

**1. [Rule 1 - Documentation] Plan acceptance criterion 4 (BoardView) expected grep count = 2**

- **Found during:** Task 2 verification
- **Issue:** Criterion 4 states `grep -c "overflow-x-hidden overflow-y-auto sm:overflow-hidden" src/components/BoardView.tsx` == 2, with comment "one from Plan 03 root + one from this task". The new column class is `max-w-[160px] sm:max-w-none overflow-x-hidden` — this does not contain the full substring `overflow-x-hidden overflow-y-auto sm:overflow-hidden`, so grep returns 1 (only the Plan 03 root div).
- **Assessment:** The implementation is correct. The plan's comment incorrectly assumed both classes would share that 3-class substring. The important facts are verified: (a) the Plan 03 root div is still present (count = 1, not 0) and (b) the new column class contains the correct bounded classes (check 1 passes). No code change needed.
- **Disposition:** Documentation inconsistency in plan; implementation is correct.

## Known Stubs

None.

## Threat Flags

None — plan modifies only static JSX class strings and a render-loop count cap; no data flow, auth, validation, or network surface added.

## Self-Check: PASSED

- `src/components/OpponentHand.tsx` — FOUND
- `src/components/BoardView.tsx` — FOUND
- Commit 2f14471 — FOUND (feat(19-05): cap OpponentHand visible card backs)
- Commit 315e36d — FOUND (feat(19-05): constrain opponent column wrapper width)
