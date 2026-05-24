---
phase: 31-migration
plan: 08
subsystem: ui
tags: [layout, responsive, scroll, gap-closure]
requires:
  - phase: 31-02
    provides: board shell structure
provides:
  - min-w-[320px] on board root div — browser scrolls horizontally below 320px instead of overlapping zones
key-files:
  modified:
    - src/components/BoardView.tsx
key-decisions:
  - "Removed overflow-x-hidden from root div; added min-w-[320px] — native browser scroll below 320px"
requirements-completed:
  - MIGRATE-02
duration: 2min
completed: 2026-05-23
---

# Phase 31-08: Min-Width Board Shell (GAP-05)

**Added min-w-[320px] to board root div; removed overflow-x-hidden so browser scrolls below 320px instead of overlapping zones**

## Task Commits

1. `a33172b` — fix(31-08): min-w-[320px] board shell + remove overflow-x-hidden (GAP-05)

## Change

**BoardView.tsx** root div:
- Before: `h-screen w-screen overflow-x-hidden flex flex-col bg-background`
- After:  `h-screen w-screen min-w-[320px] flex flex-col bg-background`

212 tests pass; typecheck clean.

---
*Phase: 31-migration | Completed: 2026-05-23*
