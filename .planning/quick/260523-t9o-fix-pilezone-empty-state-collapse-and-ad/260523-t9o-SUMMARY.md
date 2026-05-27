---
phase: quick-260523-t9o
plan: "01"
subsystem: ui-layout
tags: [pilezone, boardview, min-height, layout, css]
dependency_graph:
  requires: []
  provides: [PileZone empty-state floor, BoardView min-height]
  affects: [src/components/PileZone.tsx, src/components/BoardView.tsx]
tech_stack:
  added: []
  patterns: [min-h vs h — preserves intrinsic sizing while enforcing empty-state floor]
key_files:
  created: []
  modified:
    - src/components/PileZone.tsx
    - src/components/BoardView.tsx
decisions:
  - "Used min-h-[64px] sm:min-h-[88px] (not h-*) on PileZone slot — enforces empty-state floor while allowing intrinsic growth when populated; preserves GAP-04 fix from plan 31-07"
  - "Corrected min-h to match actual populated height after human visual check: card heights (59px mobile / 88px sm) + py-2 padding (16px) = 75px / 104px; previous values (64px/88px) were too short and caused layout shift on card add"
  - "Added min-h-[480px] to BoardView root alongside existing min-w-[320px] — symmetric treatment of viewport collapse"
metrics:
  duration: ~5 minutes
  completed: 2026-05-23
---

# Quick Task 260523-t9o: Fix PileZone Empty-State Collapse and Add Board Min-Height — Summary

**One-liner:** Added `min-h` (not `h`) to PileZone droppable slot and `min-h-[480px]` to BoardView root, fixing empty-state visual collapse without re-introducing the GAP-04 fixed-height regression.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add min-h to PileZone slot and min-h to BoardView root | 72f24bf | src/components/PileZone.tsx, src/components/BoardView.tsx |
| 2 | Correct PileZone min-h to match card+padding height | 00582fb | src/components/PileZone.tsx |

## Changes

**PileZone.tsx** — droppable slot className (two-step):
- Before task 1: `'w-[56px] sm:w-[80px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2'`
- After task 1: `'w-[56px] sm:w-[80px] min-h-[64px] sm:min-h-[88px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2'`
- After task 2 (human-verified correction): `'w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2'`

**BoardView.tsx** — board root className:
- Before: `"h-screen w-screen min-w-[320px] flex flex-col bg-background"`
- After: `"h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col bg-background"`

## Verification

- `npm run typecheck` — PASS (0 errors)
- `npm test` — PASS (212 tests, 30 files)
- grep gate: `min-h-[75px] sm:min-h-[104px]` present in PileZone.tsx — PASS (corrected from initial 64px/88px after human visual check)
- grep gate: `min-w-[320px]` + `min-h-[480px]` co-present in BoardView.tsx — PASS
- No `h-[64px]` or `h-[88px]` re-introduced in PileZone.tsx — confirmed

## Human Verification Result

Human visual check passed for: populated PileZone, board min-height, min-width.
Identified layout shift: empty slot was shorter than populated slot due to incorrect min-h values.
Correction applied in task 2 (commit 00582fb). Task complete.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check

- [x] src/components/PileZone.tsx modified with min-h-[75px] sm:min-h-[104px] (corrected post human-verify)
- [x] src/components/BoardView.tsx modified with min-h-[480px]
- [x] Commits 72f24bf and 00582fb exist in git log
- [x] All grep gates pass
- [x] typecheck clean, tests green

## Self-Check: PASSED
