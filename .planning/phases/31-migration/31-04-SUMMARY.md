---
phase: 31-migration
plan: "04"
subsystem: layout
tags:
  - migration
  - layout
  - sidebar
  - padding
  - gap-closure
dependency_graph:
  requires:
    - 31-02
  provides:
    - GAP-02-closed
    - GAP-03-closed
  affects:
    - src/components/BoardView.tsx
    - src/components/SpreadZone.tsx
tech_stack:
  added: []
  patterns:
    - Tailwind self-stretch on flex child to override parent items-start alignment
    - Tailwind justify-center on flex-col for vertical centering within stretched container
    - py-2 matching px-2 for symmetric slot padding in SpreadZone
key_files:
  created: []
  modified:
    - src/components/BoardView.tsx
    - src/components/SpreadZone.tsx
decisions:
  - PileZone does not share SpreadZone's visual asymmetry: PileZone's bg-secondary IS the card-shaped slot with flex-col items-center justify-center centering (no loose background strip). No modification needed or deferred.
metrics:
  duration: "~8 minutes"
  completed: "2026-05-23"
requirements:
  - MIGRATE-02
---

# Phase 31 Plan 04: GAP-02 and GAP-03 Gap Closure Summary

## One-liner

Two pure Tailwind className fixes: sidebar gains `self-stretch + justify-center` for full-band-height vertical centering (GAP-03); SpreadZone populated and over-state slots gain `py-2` to match existing `px-2` for symmetric slot padding (GAP-02).

## What Was Built

### Task 1: GAP-03 — Sidebar full-height with vertically centered piles (BoardView.tsx)

**Pre-change className:**
```
flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border
```

**Post-change className:**
```
flex-shrink-0 self-stretch flex flex-col justify-center gap-2 py-2 px-2 border-r border-border
```

Two utility additions:
- `self-stretch`: overrides the parent `items-start` (D-11, preserved on the outer band) to make the sidebar fill the full middle-band cross-axis height.
- `justify-center`: vertically centers the two PileZone children (draw pile + discard pile) within the now-full-height sidebar column. Equal empty space appears above the draw pile and below the discard pile.

D-11 constraint (`flex-1 min-h-0 flex items-start` on the outer middle band) is preserved exactly as written.

**Commit:** 8e75a01

---

### Task 2: GAP-02 — Symmetric vertical padding on SpreadZone populated slot (SpreadZone.tsx)

**Populated (non-empty) branch:**

Pre-change:
```
'min-w-[56px] h-[64px] sm:min-w-[80px] sm:h-[88px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary'
```

Post-change:
```
'min-w-[56px] h-[64px] sm:min-w-[80px] sm:h-[88px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary'
```

**Empty + isOver branch:**

Pre-change:
```
'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2'
```

Post-change:
```
'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'
```

**Empty + not-isOver branch (unchanged):**
```
'h-4 border border-dashed border-muted-foreground/30 rounded-md'
```
This 4px strip has no lighter background to balance — intentionally left as-is.

The fixed heights `h-[64px] sm:h-[88px]` are retained. `py-2` inside a fixed-height slot reduces the available content area by 16px; cards retain their intrinsic visible size (overflow-y is unset) and the lighter `bg-secondary` now extends 8px above and below the card edge, giving the slot four-corner padding rather than left/right-only.

**Commit:** 73945be

---

## PileZone Asymmetry Assessment

PileZone does **not** share SpreadZone's visual asymmetry. PileZone's slot uses:
```
w-[56px] h-[64px] sm:w-[80px] sm:h-[88px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary
```

The `bg-secondary` IS the card-shaped slot itself — there is no "lighter background strip behind the slot" scenario. The `flex-col items-center justify-center` already centers content both axes within the fixed-size container. No modification is needed; this is not added to Plan 06's verification checklist.

---

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "self-stretch flex flex-col justify-center gap-2 py-2 px-2 border-r border-border" BoardView.tsx` | 1 |
| `grep -c "flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border" BoardView.tsx` (old) | 0 |
| `grep -c "flex-1 min-h-0 flex items-start" BoardView.tsx` (D-11 preserved) | 1 |
| `grep -c "items-center px-2 py-2 overflow-x-auto bg-secondary" SpreadZone.tsx` | 1 |
| `grep -c "border-dashed border-primary rounded-lg flex items-center px-2 py-2" SpreadZone.tsx` | 1 |
| `grep -c "h-4 border border-dashed border-muted-foreground/30 rounded-md" SpreadZone.tsx` (unchanged) | 1 |
| `npm run typecheck` | exit 0 |
| `npm test` (30 test files, 211 tests) | exit 0 |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

- [x] `src/components/BoardView.tsx` modified with `self-stretch` + `justify-center` on sidebar div
- [x] `src/components/SpreadZone.tsx` modified with `py-2` on populated and empty+isOver slots
- [x] Commit 8e75a01 exists (Task 1)
- [x] Commit 73945be exists (Task 2)
- [x] `npm test` exits 0 (211 tests pass)
- [x] `npm run typecheck` exits 0
- [x] PileZone asymmetry assessed — no matching issue found, no follow-up needed
