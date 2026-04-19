---
phase: 11-empty-pile-drop-ux
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/11-empty-pile-drop-ux/11-REVIEW.md
iteration: 2
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-04-19
**Source review:** .planning/phases/11-empty-pile-drop-ux/11-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 3 (WR-01, IN-01, IN-02; fix_scope = all)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Untracked `setTimeout` in drag overlay teardown can corrupt active drag

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 9af6592
**Applied fix:** Added `snapBackTimerRef` (`useRef<ReturnType<typeof setTimeout> | null>(null)`) alongside existing refs. At the top of `handleDragStart`, the ref is checked and any pending timer is cancelled with `clearTimeout` before the new drag initialises. Both bare `setTimeout` calls — in the failed-drop `else` branch of `handleDragEnd` and in `handleDragCancel` — are replaced with tracked assignments (`snapBackTimerRef.current = setTimeout(...)`) that also null the ref on callback completion.

### IN-01: Deprecated Vitest generic syntax for `vi.fn`

**Files modified:** `tests/boardDragLayerDialog.test.ts`
**Commit:** 8dc07ee
**Applied fix:** Updated both `vi.fn<[ClientAction], void>()` calls (lines 43 and 226) to `vi.fn<(action: ClientAction) => void>()`, matching the current Vitest function-signature generic form.

### IN-02: No test for button-click-after-dialog-close race in `sendPendingMove`

**Files modified:** `tests/boardDragLayerDialog.test.ts`
**Commit:** 8dc07ee
**Applied fix:** Added `"button click after dialog close is a no-op (race guard)"` test to the UX-02 describe block. Test simulates `onOpenChange(false)` clearing `pendingMove`, then a stale `sendPendingMove("top")` call arriving — asserts `sendAction` is not called. All 12 tests pass.

---

_Fixed: 2026-04-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
