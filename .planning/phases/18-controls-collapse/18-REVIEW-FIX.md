---
phase: 18-controls-collapse
fixed_at: 2026-05-04T00:00:00Z
review_path: .planning/phases/18-controls-collapse/18-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-05-04
**Source review:** .planning/phases/18-controls-collapse/18-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, CR-02, WR-01, WR-02, WR-03)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `handleDeal` can dispatch `NaN` as `cardsPerPlayer`

**Files modified:** `src/components/ControlsBar.tsx`
**Commit:** 6a0ec4d
**Applied fix:** Added `parseInt` result guard — early return when `Number.isNaN(parsed) || parsed < 1`. The parsed value is now stored before the dispatch rather than inlining `parseInt` directly in the action.

---

### CR-02: `handleResetConfirm` state update order — `confirmReset` cleared twice

**Files modified:** `src/components/ControlsBar.tsx`
**Commit:** 6a0ec4d
**Applied fix:** Removed the explicit `setConfirmReset(false)` call from `handleResetConfirm`. Now calls `handleOpenChange(false)` which is the single source of truth for `confirmReset` cleanup. Both the Popover's `onOpenChange` callback and programmatic close now follow the same path.

---

### WR-01: `handleDeal` and `handleUndo` bypass `handleOpenChange` `confirmReset` guard

**Files modified:** `src/components/ControlsBar.tsx`
**Commit:** 6a0ec4d
**Applied fix:** Changed both `handleDeal` and `handleUndo` to call `handleOpenChange(false)` instead of `setOpen(false)` directly. This ensures `confirmReset` is cleared regardless of which action closes the panel.

---

### WR-02: `handleDeal` does not guard against `parsed > maxCards`

**Files modified:** `src/components/ControlsBar.tsx`
**Commit:** 6a0ec4d
**Applied fix:** Added `parsed > maxCards` to the early-return guard in `handleDeal`. Combined with the CR-01 NaN guard, the full check is: `Number.isNaN(parsed) || parsed < 1 || parsed > maxCards`.

---

### WR-03: Clipboard failure silently swallowed — popover never closes on error

**Files modified:** `src/components/ControlsBar.tsx`
**Commit:** 6a0ec4d
**Applied fix:** Replaced `.catch(() => {})` with a handler that calls `setOpen(false)`, closing the panel so the user is not left in a stuck state when clipboard access is denied. A brief comment explains the intent.

---

_Fixed: 2026-05-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
