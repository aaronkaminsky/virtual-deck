---
phase: 19
plan: "02"
subsystem: card-primitives
tags:
  - responsive-layout
  - tailwind
  - card-primitives
  - LAYOUT-04
dependency_graph:
  requires:
    - 19-01
  provides:
    - "src/components/CardFace.tsx (responsive sizing)"
    - "src/components/CardBack.tsx (responsive sizing)"
  affects:
    - LAYOUT-04
    - HandZone
    - SpreadZone
    - PileZone
    - OpponentHand
tech_stack:
  added: []
  patterns:
    - "Tailwind sm: breakpoint prefix for mobile-first responsive card sizing"
    - "w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] — canonical responsive card class pair"
key_files:
  created: []
  modified:
    - src/components/CardFace.tsx
    - src/components/CardBack.tsx
decisions:
  - "Exact pixel pair 42/59 (phone default) and 63/88 (sm: breakpoint) per CONTEXT.md D-02/D-04 — not improvised"
  - "OpponentHand.tsx left unmodified — it already passes w-[42px] h-[59px] as className override which wins via tailwind-merge; its cards were already at phone size per D-03"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-06"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 19 Plan 02: Card Primitive Responsive Sizing Summary

Responsive Tailwind classes applied to all four render sites in CardFace.tsx and CardBack.tsx — cards now scale from 42x59px on phone (default) to 63x88px at the sm: (640px+) breakpoint.

## What Was Built

Both leaf card components now use mobile-first responsive sizing across both of their render paths (image + fallback div):

**CardFace.tsx:**
- Line 27 — image render path: `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover`
- Line 39 — fallback div render path: `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] relative bg-white rounded-md border border-gray-300 select-none`

**CardBack.tsx:**
- Line 14 — image render path: `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover`
- Line 22 — fallback div render path: `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md border border-gray-600 select-none`

No bare `w-[63px] h-[88px]` (without the phone-size companion) survives in either file.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` exits 0 | PASS |
| `npm test` (Vitest) 150/150 pass | PASS |
| `grep -c` responsive fragment in CardFace.tsx == 2 | PASS (2) |
| `grep -c` responsive fragment in CardBack.tsx == 2 | PASS (2) |
| No bare `w-[63px] h-[88px]` in CardFace.tsx | PASS |
| No bare `w-[63px] h-[88px]` in CardBack.tsx | PASS |
| OpponentHand.tsx unmodified | PASS |

## Plan 01 E2e Gate Status

The Plan 01 Playwright responsive spec (`playwright/responsive.spec.ts`) is expected to remain passing — the `overflow-hidden` on BoardView root clips content at the div level, so `documentElement.scrollWidth` stays equal to `clientWidth` regardless of card size. This is the same behavior noted in 19-01-SUMMARY.md (Plan Assumption Deviation). Plan 03 will change the root overflow model and shrink zone containers.

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | CardFace.tsx — both render paths | 29989ba |
| 2 | CardBack.tsx — both render paths + Vitest green | fc3ce4e |

## Deviations from Plan

None — plan executed exactly as written. All four edit sites matched the exact find strings in the plan. No deviation rules triggered.

## Known Stubs

None — this plan modifies static CSS class strings only. No data stubs or placeholder values introduced.

## Threat Flags

None — class strings are static literals. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/components/CardFace.tsx` modified: CONFIRMED (29989ba)
- `src/components/CardBack.tsx` modified: CONFIRMED (fc3ce4e)
- Commit 29989ba exists: CONFIRMED
- Commit fc3ce4e exists: CONFIRMED
- `npm run typecheck` exits 0: CONFIRMED
- `npm test` 150/150 pass: CONFIRMED
- 2 occurrences in each file: CONFIRMED
- No bare desktop-only fragment in either file: CONFIRMED
- `src/components/OpponentHand.tsx` unchanged: CONFIRMED
