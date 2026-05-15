---
phase: 19-npm-audit
reviewed: 2026-05-09T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/BoardView.tsx
  - src/components/OpponentHand.tsx
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 19 Wave 7: Code Review Report

**Reviewed:** 2026-05-09T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2 (wave 7 gap closure changes only: plans 19-08, 19-09, 19-10)
**Status:** issues_found

## Summary

Two files reviewed covering plans 19-08 (ControlsBar `self-start`), 19-09 (opponent card count Badge moved inline), and 19-10 (opponents row `overflow-hidden` + column `flex-1 min-w-0`).

Plan 19-08 (`self-start` on ControlsBar wrapper) is correct and safe. Plan 19-09 (Badge moved inline, variant changed to `secondary`) is correct and safe. Plan 19-10 introduces a BLOCKER: replacing `overflow-x-auto` with `overflow-hidden` on the opponents row, combined with removing the `max-w-[200px]` cap in favor of `flex-1 min-w-0`, causes card stacks to be silently clipped when 3 or 4 players are in a game. Two additional warnings cover a mismatched flex-alignment between the ControlsBar wrapper and the opponents row, and the asymmetric single-vs-multi-opponent column class.

---

## Critical Issues

### CR-01: `overflow-hidden` on opponents row clips card stacks at 3-4 players

**File:** `src/components/BoardView.tsx:33,38`

**Issue:** The opponents row was changed from `overflow-x-auto` to `overflow-hidden` (line 33). Simultaneously, multi-opponent columns changed from `max-w-[200px]` to `flex-1 min-w-0` (line 38). Together these mean: each opponent column grows to an equal share of the available row width and can shrink below its content width with no scrollbar — the overflow is hidden.

The card stack in `OpponentHand` renders up to 5 cards at `w-[42px]` (`sm:w-[63px]`) with `-ml-3` (12px) overlap on each subsequent card. The stack's intrinsic width is:

- Mobile: `42 + 4*(42-12) = 162px`
- Desktop (sm): `63 + 4*(63-12) = 267px`

With 3 opponents in a 375px-wide mobile viewport and a ~44px ControlsBar, available row width is ~331px, split three ways = ~110px per column. The 162px card stack overflows by 52px and is **silently clipped** — not scrollable, not wrapped, just cut off. On desktop with 3 opponents the clip is even larger (267px stack into ~200-240px column).

This affects the primary use case of the app: 3-4 player games. The opponent card stack is the only visual indicator of how many cards opponents hold; clipping it defeats the purpose of showing it at all.

```tsx
// Line 33 — current (broken at 3-4 players):
<div className="flex items-start gap-4 flex-1 overflow-hidden">

// Line 38 — current multi-opponent class (broken):
'flex flex-col gap-1 flex-1 min-w-0 sm:max-w-none overflow-x-hidden'
```

**Fix:** Either (a) restore a minimum column width that matches the card stack, or (b) keep `overflow-x-auto` on the row so stacks remain reachable via scroll:

Option A — minimum column width (prevents clipping, does not scroll):
```tsx
// Line 33: keep overflow-hidden (prevents row from adding horizontal scroll to the page)
<div className="flex items-start gap-4 flex-1 overflow-hidden">

// Line 38: add min-w-[162px] (matches mobile stack width; sm: variant for desktop)
`flex flex-col gap-1 ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-[162px] sm:min-w-[267px]'} sm:max-w-none overflow-x-hidden`
```

Option B — restore scrollability (allows stacks to always be reachable):
```tsx
// Line 33:
<div className="flex items-start gap-4 flex-1 overflow-x-auto">

// Line 38: keep flex-1 min-w-0 but allow the row to scroll rather than clip
`flex flex-col gap-1 ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`
```

Note: if option B is chosen, the original motivation for removing `overflow-x-auto` (scroll bar appearing on the header) should be addressed with `scrollbar-none` or equivalent utility on the row div.

---

## Warnings

### WR-01: `self-start` on ControlsBar wrapper misaligns with `items-start` already set on the row

**File:** `src/components/BoardView.tsx:32,53`

**Issue:** The outer header flex container at line 32 already uses `items-start`:

```tsx
<div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">
```

Wait — the header row actually uses `items-center` (line 32), not `items-start`. The opponents inner wrapper uses `items-start` (line 33). The ControlsBar wrapper at line 53 adds `self-start` to override the `items-center` default from the header row. This is correct intent.

However, `self-start` on the ControlsBar wrapper and `items-start` on the opponents inner container (`flex items-start gap-4 flex-1 overflow-hidden`) means both sub-containers are top-aligned, but through different mechanisms. The ControlsBar wrapper uses `self-start` to escape `items-center` on the parent; the opponents wrapper is inside a `flex items-start` container so it inherits top-alignment. This inconsistency is not a bug today, but if the parent header div ever changes from `items-center` back to `items-start`, `self-start` becomes redundant and the alignment of the ControlsBar relative to a variable-height opponents area may shift in unexpected ways.

The actual concern: the ControlsBar hamburger button is 32px (`icon-sm`). If a single-opponent layout makes the opponents column tall (name row + card stack + spread zone), the hamburger will sit at the top of a tall column — this is the intended behavior. But in a zero-opponents game (no entries in `opponentHandCounts`), the opponents container renders empty and the ControlsBar wrapper becomes the only child of the header. `self-start` against `items-center` on an effectively single-child flex row has no effect — the ControlsBar centers vertically, which is fine. No correctness bug, but the layered alignment mechanism makes future changes fragile.

**Fix:** Add a comment explaining why `self-start` is needed, and align the header parent to `items-start` consistently so `self-start` is not load-bearing:

```tsx
{/* items-start so ControlsBar pins to top when opponent stacks are tall */}
<div className="flex items-start justify-between px-4 py-2 gap-4 bg-card">
  {/* ... opponents row ... */}
  <div className="flex items-center gap-3">  {/* self-start no longer needed */}
    <ControlsBar ... />
  </div>
</div>
```

---

### WR-02: Single-opponent column class uses `max-w-none` while multi-opponent uses `min-w-0` — asymmetric and undocumented

**File:** `src/components/BoardView.tsx:38`

**Issue:**

```tsx
className={`flex flex-col gap-1 ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}
```

The single-opponent branch uses `flex-1 max-w-none`. `max-w-none` removes any max-width cap and is redundant since `flex-1` without a cap already has no max-width — `max-w-none` is the Tailwind default. The multi-opponent branch uses `flex-1 min-w-0`, which is meaningfully different: it allows the column to shrink below its content width (the source of CR-01 above).

The ternary communicates that there is a layout distinction between 1-opponent and 2+-opponent layouts, but both branches contain `flex-1` and the difference (`max-w-none` vs `min-w-0`) is not explained. A reader cannot tell from this code whether `max-w-none` in the single-opponent branch is intentional (to prevent some inherited max-width from applying) or vestigial (left from an earlier `max-w-[200px]` removal). The `sm:max-w-none` at the end applies in both branches and makes `max-w-none` in the single-opponent branch doubly redundant at the `sm:` breakpoint.

**Fix:** After CR-01 is resolved, clean up the ternary to make the distinction explicit:

```tsx
// Single opponent: fill all available width
// Multiple opponents: equal shares, each with a minimum to avoid clipping card stacks
className={`flex flex-col gap-1 ${opponentCount === 1 ? 'flex-1' : 'flex-1 min-w-[162px] sm:min-w-[267px]'} overflow-x-hidden`}
```

The `sm:max-w-none` is unnecessary in either branch and can be dropped.

---

_Reviewed: 2026-05-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
