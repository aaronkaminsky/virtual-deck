---
phase: 11-empty-pile-drop-ux
fixed_at: 2026-04-18T00:00:00Z
review_path: .planning/phases/11-empty-pile-drop-ux/11-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** .planning/phases/11-empty-pile-drop-ux/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (WR-01; IN-01 and IN-02 excluded by fix_scope = critical_warning)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: Untracked `setTimeout` in drag overlay teardown can corrupt active drag

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 9af6592
**Applied fix:** Added `snapBackTimerRef` (`useRef<ReturnType<typeof setTimeout> | null>(null)`) alongside existing refs. At the top of `handleDragStart`, the ref is checked and any pending timer is cancelled with `clearTimeout` before the new drag initialises. Both bare `setTimeout` calls — in the failed-drop `else` branch of `handleDragEnd` and in `handleDragCancel` — are replaced with tracked assignments (`snapBackTimerRef.current = setTimeout(...)`) that also null the ref on callback completion.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
