---
phase: 27-drop-target-empty-spread-behavior
plan: 01
status: complete
---

# Plan 27-01 Execution Summary

## What was done

**CTRL-06 — OpponentHand hover-only drop-target (Task 1)**

Replaced the three-branch border ternary in `OpponentHand.tsx` with a two-branch `isOver`-only ternary:
- Before: `isOver ? 'border-2 border-primary' : dragIsActive ? 'border-2 border-dashed border-primary/60' : 'border-2 border-transparent'` plus `dragIsActive && 'min-h-[44px] min-w-[80px]'`
- After: `isOver ? 'border-2 border-primary' : 'border-2 border-transparent'`

`dragIsActive` and `useDndContext` retained — still needed for the "Drop to pass" text hint at line 65 (D-03 preserved unchanged).

**LAYOUT-06 — SpreadZone faint dashed strip (Task 2)**

Replaced the invisible empty-resting state in `SpreadZone.tsx`:
- Before: `'h-px opacity-0'`
- After: `'h-4 border border-dashed border-muted-foreground/30 rounded-md'`

isOver expanded drop-target, controls guard (`interactive !== false && !isEmpty`), and opponent/non-empty path all unchanged.

## Verification

- `npm run typecheck` — exits 0
- `npm test` — 29 files, 219 tests, all pass (includes 12 new assertions across 2 new test files)

## Files changed

- `src/components/OpponentHand.tsx` — className-only (lines 31-39 simplified)
- `src/components/SpreadZone.tsx` — className-only (line 169 string replaced)
- `tests/opponentHandDropTarget.test.ts` — new source-contract test (6 assertions)
- `tests/spreadZoneEmptyStrip.test.ts` — new source-contract test (6 assertions)
