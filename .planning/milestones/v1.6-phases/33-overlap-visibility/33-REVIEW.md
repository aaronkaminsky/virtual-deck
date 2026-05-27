---
phase: 33-overlap-visibility
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/components/BoardDragLayer.tsx
  - src/components/CanvasDraggableCard.tsx
  - src/components/CanvasZone.tsx
  - src/lib/canvas-utils.ts
  - tests/overlapUtils.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-05-25
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 33 introduces `coversMajority` in `canvas-utils.ts`, wires it into `CanvasZone` for static stack-shadow rendering, and propagates drag-time shadow state through `BoardDragLayer`. The core overlap algorithm is correct and its tests are thorough. The main defects are: a hard-coded mobile card size in `BoardDragLayer` that diverges from the canonical constants in `canvas-utils.ts` (making clamping wrong on mobile), an `isDraggingActive` prop that is declared and silently discarded (dead interface surface), and a leaked `setTimeout` in `CanvasDraggableCard` that has no cleanup.

---

## Warnings

### WR-01: Mobile card dimensions in BoardDragLayer diverge from `canvas-utils.ts` constants

**File:** `src/components/BoardDragLayer.tsx:237-238`

**Issue:** `handleDragEnd` computes `CARD_W` / `CARD_H` locally using a `window.innerWidth >= 640` breakpoint that produces different values (42×59) than the canonical `CARD_W = 63` / `CARD_H = 88` exported from `canvas-utils.ts`. These local values are used for bounds-clamping (`Math.min(..., canvasW - CARD_W)`) and pointer-centering (`- CARD_W / 2`). Meanwhile `coversMajority` — called in both `handleDragMove` and `CanvasZone` — always uses 63×88. At mobile widths this produces a split: drag-time overlap detection uses 63×88 while drop placement and clamping use 42×59. Clamped drop positions will be off by up to 21px horizontally and 29px vertically on mobile, and a card placed near the right or bottom edge can land partially out of bounds from the clamping perspective.

**Fix:** Export a `getCardDimensions()` helper from `canvas-utils.ts` that centralises the responsive breakpoint, and use it in `coversMajority`, `CanvasZone`, and `BoardDragLayer`:

```ts
// canvas-utils.ts
export function getCardDimensions(): { w: number; h: number } {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return { w: 42, h: 59 };
  }
  return { w: CARD_W, h: CARD_H };
}
```

Then in `handleDragEnd`:
```ts
const { w: cardW, h: cardH } = getCardDimensions();
// replace all CARD_W / CARD_H locals with cardW / cardH
```

And update `coversMajority` to use the same helper so drag-time and rest-time shadow logic share one source of truth.

---

### WR-02: `isDraggingActive` prop declared but silently discarded — dead interface surface

**File:** `src/components/CanvasDraggableCard.tsx:11-15`

**Issue:** `isDraggingActive` is declared in the props interface with a comment saying it is "currently unused — held for Phase 33 layered effects", but Phase 33 is the current phase. It is never destructured from props (line 15 destructures only `canvasCard` and `coversAnother`) and never used. `CanvasZone` passes `isDraggingActive={draggingCardId === cc.card.id}` (line 49), computing it on every render for no effect. This means the per-card "actively dragging" visual differentiation that the phase plan presumably required is silently absent. If the intention was a Phase 34 placeholder, the prop should not be wired at the call site yet.

**Fix — Option A (feature was meant to land this phase):** Destructure and use the prop:
```ts
export function CanvasDraggableCard({ canvasCard, isDraggingActive, coversAnother }: CanvasDraggableCardProps) {
  // use isDraggingActive for layered visual effect
}
```

**Fix — Option B (intentional deferral):** Remove the prop from the interface and the call site in `CanvasZone` until the phase that needs it:
```ts
// CanvasDraggableCard.tsx — remove isDraggingActive from interface
// CanvasZone.tsx line 49 — remove isDraggingActive={draggingCardId === cc.card.id}
```

---

### WR-03: Unguarded `setTimeout` in `CanvasDraggableCard` has no cleanup

**File:** `src/components/CanvasDraggableCard.tsx:26`

**Issue:** The `useEffect` sets a 300ms `setTimeout` to clear `didDragRef.current` but never stores the timer ID and never cancels it in a cleanup function. If the component unmounts between drag-end and the 300ms timeout firing, the callback writes to the ref of a dead component instance. While refs do not trigger re-renders (no React setState violation), the pattern is incorrect: the effect's cleanup should call `clearTimeout`. Additionally, if the user drags a card and the component is immediately removed by a server state update (e.g. card dealt to hand), the timer fires against a stale closure.

**Fix:**
```ts
useEffect(() => {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (prevIsDragging.current && !isDragging) {
    timerId = setTimeout(() => { didDragRef.current = false; }, 300);
  }
  if (isDragging) didDragRef.current = true;
  prevIsDragging.current = isDragging;
  return () => {
    if (timerId !== null) clearTimeout(timerId);
  };
}, [isDragging]);
```

---

### WR-04: `coversMajority` always uses desktop card dimensions — broken on mobile

**File:** `src/lib/canvas-utils.ts:5-9`

**Issue:** `coversMajority` hard-codes `CARD_W = 63` and `CARD_H = 88` unconditionally. On mobile (`window.innerWidth < 640`) the rendered card size is 42×59 (per `BoardDragLayer` lines 237-238). A card that visually appears to cover more than 50% of another card at the 42×59 rendered size will not trigger the shadow (because the algorithm calculates overlap against the 63×88 footprint, not the actual 42×59 footprint). Conversely, the function may flag cards as "covering" when their visible overlap is less than 50%. This is the root cause of WR-01's split; the fix there addresses both together.

**Fix:** See WR-01 — centralise responsive dimensions and pass them into `coversMajority`, or make the function accept optional `cardW`/`cardH` overrides.

---

## Info

### IN-01: Unused import `getFirstCollision` in BoardDragLayer

**File:** `src/components/BoardDragLayer.tsx:3`

**Issue:** `getFirstCollision` is imported from `@dnd-kit/core` but never referenced anywhere in the file.

**Fix:** Remove it from the import:
```ts
import { DndContext, DragOverlay, closestCenter, pointerWithin, defaultDropAnimation,
         useSensors, useSensor, PointerSensor, TouchSensor, MeasuringStrategy } from '@dnd-kit/core';
```

---

### IN-02: `coversMajority` called O(n²) in `CanvasZone` useMemo and in `handleDragMove`

**File:** `src/components/CanvasZone.tsx:25-33`, `src/components/BoardDragLayer.tsx:222-225`

**Issue:** For n canvas cards, `coversMajority` is called O(n²) times in the `useMemo` (each of n cards compared against all others) and up to O(n) times per pointer-move event in `handleDragMove`. With 2-4 players and a 52-card deck this is bounded and not a performance concern at current scale. Flagged as info because the nested loop structure could become surprising if canvas card counts grow in a future phase, and the pattern is worth noting during review.

**Fix:** No action required at current scale. If canvas card counts increase significantly, pre-build a spatial index.

---

_Reviewed: 2026-05-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
