---
phase: 33-overlap-visibility
plan: 02
status: complete
requirements-completed: [OVERLAP-03]
requires: 33-01 (imports coversMajority + STACK_SHADOW from src/lib/canvas-utils.ts created in Plan 01)
provides:
  - handleDragMove handler with ref-throttled boolean-flip setState
  - activeDragOrigin state — captured in handleDragStart for canvas drags, null otherwise
  - dragCoversSomeCard boolean state — flips only when covering status changes
  - dragDeltaRef — updated on every pointermove without triggering re-render
  - Conditional DragOverlay shadow (boxShadow + borderRadius) driven by dragCoversSomeCard
  - Reset logic in both handleDragEnd (top-of-function) and handleDragCancel
affects:
  - 33-03 (human verify of drag-time shadow)
  - future Phase 34 (multi-card group drop may extend activeDragOrigin or the handleDragMove guard)
key-files:
  modified:
    - src/components/BoardDragLayer.tsx
patterns-established:
  - ref-throttled boolean-flip setState in onDragMove (production application of CLAUDE.md isDraggingRef=useRef(false) convention)
  - top-of-function reset for multi-branch handler cleanup (handleDragEnd has many branches; resetting at top guarantees every path clears drag session state)
---

## Summary

Wired drag-time stack shadow into `BoardDragLayer`. While dragging a canvas card, the DragOverlay ghost renders `boxShadow: STACK_SHADOW` and `borderRadius: 6` exactly when its current position covers >50% of any other canvas card. Shadow disappears the moment the threshold is no longer met.

## What Was Built

### Task 1: Imports + State/Ref Scaffolding
- Added `DragMoveEvent` to the `@dnd-kit/core` type import
- Added `import { coversMajority, STACK_SHADOW } from '@/lib/canvas-utils'`
- Added three new declarations: `activeDragOrigin` state, `dragCoversSomeCard` state, `dragDeltaRef` ref

### Task 2: handleDragMove + Resets + DragOverlay Shadow
- Extended `handleDragStart` to capture `activeDragOrigin` from `gameState.canvasCards` for canvas drags (null for non-canvas drags), and reset `dragDeltaRef.current = {x:0,y:0}`
- Added `handleDragMove(event: DragMoveEvent)` with: non-canvas guard, null-origin guard, ref update (no setState), `draggedPos` computation, `some()` covering check excluding `activeCard?.id`, boolean-flip-only `setDragCoversSomeCard`
- Added `setDragCoversSomeCard(false)` + `setActiveDragOrigin(null)` at top of `handleDragEnd` (before any branch — guarantees reset on all code paths)
- Added same resets to `handleDragCancel`
- Added `onDragMove={handleDragMove}` to `DndContext`
- Extended DragOverlay div style with `boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined` and `borderRadius: dragCoversSomeCard ? 6 : undefined` (D-13 opacity + scale preserved)

## Verification

- `npm run typecheck` — exits 0
- `npm test` — 32 test files, 243 tests, all pass
- Acceptance criteria: all 11 grep checks pass (handleDragMove:1, onDragMove:1, delta ref:1, boolean-flip guard:1, non-canvas guard:1, setActiveDragOrigin:5, setDragCoversSomeCard(false):2, boxShadow:1, borderRadius:1, D-13 preserved:1, origin capture:1)

## Self-Check: PASSED

All must_haves confirmed:
- Drag-time shadow appears when dragged position covers >50% of any non-dragged canvas card ✓
- `dragDeltaRef.current` updates on every `onDragMove` without setState ✓
- `setDragCoversSomeCard` only called on boolean flip ✓
- Non-canvas drags early-return immediately ✓
- Both `handleDragEnd` and `handleDragCancel` reset state ✓
- D-13 DragOverlay opacity:0.5 + scale(1.05) preserved ✓

## Commits

- `22f95de`: feat(33-02): add drag-time shadow state/ref scaffolding and imports (TDD RED)
- `2a3118f`: feat(33-02): wire handleDragMove, reset logic, and DragOverlay drag-time shadow
