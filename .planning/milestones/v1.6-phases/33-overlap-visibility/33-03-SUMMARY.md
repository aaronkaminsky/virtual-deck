---
phase: 33-overlap-visibility
plan: 03
status: complete
requirements-completed: [OVERLAP-01, OVERLAP-02, OVERLAP-03]
requires: 33-01, 33-02
provides: human-verified shadow and hit-testing behavior in live app
key-files: []
---

## Summary

Human visual verification complete. All 7 behaviors confirmed in the running dev stack.

## Verification Results

| Step | Behavior | Result |
|------|----------|--------|
| 6 | Click overlap region → higher-z card activates (OVERLAP-01) | PASS |
| 7 | Click exposed lower-card edge → lower card activates (OVERLAP-01) | PASS |
| 8 | Drag ghost is ~50% transparent (OVERLAP-02) | PASS |
| 9 | At-rest shadow on covering card only, not covered card (OVERLAP-03 static) | PASS |
| 10 | Shadow disappears when overlap drops below 50% threshold (OVERLAP-03 threshold) | PASS |
| 11 | Drag-time shadow on ghost while covering >50%, disappears when not (OVERLAP-03 drag-time) | PASS |
| 12 | Phase 32 regressions: canvas↔hand, canvas↔pile, Escape cancel, hand→canvas all intact | PASS |

## Known Cosmetic Issue (follow-up)

The drag-time stack shadow renders at full opacity while the drag ghost itself is at 50% opacity. This makes the shadow appear brighter/more prominent than the card content it's attached to. The current implementation puts the shadow on an outer wrapper div (outside the `opacity: 0.5` div) to ensure it's visible at all — but the mismatch is noticeable.

**Follow-up:** Investigate using `rgba()` shadow colors that look natural at full opacity alongside a semi-transparent ghost, or apply a fractional opacity to the shadow wrapper independently.

## Fixes Applied During Verification

Two bugs were found and fixed during this plan's checkpoint:

1. **Stale closure** (`activeDragOrigin` was `useState` → converted to `useRef`): `handleDragMove` fired before React flushed the `setActiveDragOrigin` update, so `activeDragOrigin` was always `null` and the handler returned early.

2. **CSS opacity compositing** (shadow was inside the `opacity: 0.5` wrapper): `box-shadow` on an element with `opacity < 1` is composited at that opacity level. White + light-gray shadow at 50% opacity on a light canvas background was invisible. Fixed by wrapping the shadow div outside the opacity div.
