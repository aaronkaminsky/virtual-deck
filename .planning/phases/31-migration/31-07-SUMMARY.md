---
phase: 31-migration
plan: 07
subsystem: ui
tags: [layout, padding, gap-closure, intrinsic-sizing]
requires:
  - phase: 31-04
    provides: py-2 already added to SpreadZone slots
provides:
  - Intrinsic sizing on SpreadZone populated slot — no fixed heights; py-2 shows 8px above/below card
  - Intrinsic sizing + py-2 on PileZone slot — bg-secondary now has visible breathing room
key-files:
  modified:
    - src/components/SpreadZone.tsx
    - src/components/PileZone.tsx
    - tests/spreadZoneEmptyStrip.test.ts
key-decisions:
  - "Removed h-[64px] sm:h-[88px] from SpreadZone populated slot — intrinsic sizing lets py-2 show"
  - "Removed h-[64px] sm:h-[88px] from PileZone slot; added py-2 — slot now card height + 16px"
  - "Updated spreadZoneEmptyStrip test to pin new intrinsic contract (not.toContain fixed heights)"
requirements-completed:
  - MIGRATE-02
duration: 5min
completed: 2026-05-23
---

# Phase 31-07: Intrinsic Sizing for Card Slots (GAP-04)

**Removed fixed heights from SpreadZone and PileZone slots so py-2 produces visible 8px breathing room above and below cards**

## Task Commits

1. `a8dee21` — fix(31-07): intrinsic sizing on SpreadZone populated slot (SpreadZone.tsx + test)
2. `e27b09b` — fix(31-07): intrinsic sizing + py-2 on PileZone slot (PileZone.tsx)

## Changes

**SpreadZone.tsx** populated slot:
- Before: `min-w-[56px] h-[64px] sm:min-w-[80px] sm:h-[88px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary`
- After:  `min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary`

**PileZone.tsx** slot:
- Before: `w-[56px] h-[64px] sm:w-[80px] sm:h-[88px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary`
- After:  `w-[56px] sm:w-[80px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2`

**Test update:** `spreadZoneEmptyStrip.test.ts` — replaced the `toContain("h-[64px] sm:min-w-[80px] sm:h-[88px]")` pin with assertions that these strings are NOT present and that the new intrinsic-sizing string IS present. 212 tests pass (1 new).

## Deviations

One test (`spreadZoneEmptyStrip.test.ts`) pinned the old fixed heights and failed. Updated to reflect the intentional contract change — now pins the absence of fixed heights and the presence of the new class string.

---
*Phase: 31-migration | Completed: 2026-05-23*
