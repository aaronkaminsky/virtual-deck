---
phase: 34-multi-card-group-drop
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - party/index.ts
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/CanvasDraggableCard.tsx
  - src/components/CanvasZone.tsx
  - src/components/DraggableCard.tsx
  - src/components/HandZone.tsx
  - src/components/SpreadZone.tsx
  - src/shared/types.ts
  - tests/canvasCards.test.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-25
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This phase implements `GROUP_PLACE_ON_CANVAS` (multi-card canvas drop), canvas-sourced group drag mechanics, and client-side selection/passenger ghost rendering. The server-side handler is well-structured with proper atomicity (single snapshot, pre-validate-all, then mutate), auth guards, and z-ordering logic. The `CanvasDraggableCard` and `CanvasZone` implementations are correct. One blocker was found: canvas-selection group drags dropped on pile zones send the wrong action type (PLAY_CARD_SET with fromZone='hand') instead of failing gracefully or routing to individual MOVE_CARD dispatches. Three warnings cover a timer cleanup divergence, a silent partial-group dispatch edge case, and an undo stack convention violation.

## Critical Issues

### CR-01: Canvas-group drag onto pile zone sends PLAY_CARD_SET with wrong fromZone

**File:** `src/components/BoardDragLayer.tsx:428-464`

**Issue:** When a user has 2+ canvas cards selected (`selectionSource.zone === 'canvas'`) and drags one of them onto a pile zone (not the canvas droppable), the `isMultiCardSet` predicate at line 428 evaluates to `true`. There is no guard for `fromZone === 'canvas'` in that branch. Control enters the `if (isMultiCardSet)` block and dispatches `PLAY_CARD_SET` with `fromZone: 'hand'` (the fallback at line 456, because `selectionSource.zone === 'canvas'`) and `fromId: playerId`.

The server's `PLAY_CARD_SET` handler resolves the source as `this.gameState.hands[fromId]`, finds none of the canvas card IDs there, and responds with `CARD_NOT_IN_SOURCE`. Meanwhile the client has already cleared `selectedIds`, `selectionSource`, and set `dropSuccessRef.current = true` (line 443). The DragOverlay's `null` drop animation fires, making cards appear to have moved. The server broadcasts the unchanged state, causing the canvas cards to reappear — a silent snap-back with no user-visible error message.

The scenario is reachable without any adversarial input: select 2 canvas cards via click-to-toggle, drag one across a pile zone (pile collision detection fires before canvas per the `customCollision` fallback order), release.

**Fix:** Add a canvas-source guard to `isMultiCardSet`, or add an early-exit for canvas-sourced drags before the isMultiCardSet check:

```typescript
// Option A: add fromZone guard to isMultiCardSet
const isMultiCardSet =
  (selectedIds.size > 1 || hasMaskedCardsInSource) &&
  selectedIds.has(activeId) &&
  !!event.over &&
  (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
  !isIntraSpreadReorder &&
  !isIntraHandReorder &&
  fromZoneAtEnd !== 'canvas';   // <-- add this guard

// Option B: early exit before the isMultiCardSet check if canvas group drop landed on pile
// (canvas cards can only go to canvas, not directly to pile via multi-select)
if (selectionSource?.zone === 'canvas' && overData?.toZone === 'pile') {
  // treat as failed drop — snap back
  setSelectedIds(new Set());
  setSelectionSource(null);
  setDragDelta(null);
  dragDataRef.current = null;
  return;
}
```

## Warnings

### WR-01: DraggableCard useEffect leaks timer on unmount

**File:** `src/components/DraggableCard.tsx:25-31`

**Issue:** The `useEffect` that clears `didDragRef.current` after a drag ends calls `setTimeout` at line 27 without returning a cleanup function. If the component unmounts within the 300ms window (e.g., a card is moved to another zone while the drag animation is still settling), the timer fires on a stale ref reference. Because `didDragRef` is a ref (not state), there is no React warning, but the timer is leaked.

`CanvasDraggableCard` has an identical pattern but correctly returns a cleanup:

```typescript
// CanvasDraggableCard.tsx — correct:
let timerId: ReturnType<typeof setTimeout> | null = null;
if (prevIsDragging.current && !isDragging) {
  timerId = setTimeout(() => { didDragRef.current = false; }, 300);
}
// ...
return () => {
  if (timerId !== null) clearTimeout(timerId);
};
```

**Fix:** Apply the same cleanup pattern to `DraggableCard`:

```typescript
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

### WR-02: Canvas-group drag silently omits stale-selection cards; may dispatch empty array

**File:** `src/components/BoardDragLayer.tsx:327-342`

**Issue:** In the GROUP path for `fromZone === 'canvas'`, the loop at lines 328-331 looks up each `cardId` from `selectedIds` in `gameState.canvasCards` and only pushes to `cards` if found. If a canvas card was moved by another player between when the local user selected it and when they drop, the lookup returns `undefined` and the card is silently omitted:

```typescript
const cc = gameState.canvasCards.find(c => c.card.id === cardId);
if (cc) {
  cards.push({ cardId, x: cc.x + event.delta.x, y: cc.y + event.delta.y });
}
// No else: stale selections silently produce 0 entries in `cards`
```

If all selected cards are stale, `cards` is empty. The allInBounds check (`cards.every(...)`) returns `true` on an empty array, so `GROUP_PLACE_ON_CANVAS` is dispatched with an empty `cards` array. The server's V1 check (`cards.length === 0`) will reject it with `EMPTY_CARD_SET`, but the client has already cleared `selectedIds` and `selectionSource` at lines 363-369, giving no user feedback.

If only some cards are stale, a partial group is dispatched — the user's intended group move is silently truncated.

**Fix:** After building the `cards` array, check for a shorter-than-expected result before dispatching:

```typescript
// After the canvas-source for loop:
if (cards.length === 0) {
  // All selections stale — snap back silently
  setActiveCard(null);
  setDragging(false);
  setSelectedIds(new Set());
  setSelectionSource(null);
  setDragDelta(null);
  passengerOffsetsRef.current = {};
  dragDataRef.current = null;
  return;
}
// Optionally: if (cards.length !== selectedIds.size) handle partial stale set
```

### WR-03: REORDER_PILE_SPREAD always takes an undo snapshot; no skipSnapshot support

**File:** `party/index.ts:389`

**Issue:** The `REORDER_PILE_SPREAD` handler unconditionally calls `takeSnapshot(this.gameState)` before mutating the spread pile order. Every intra-spread drag-reorder adds an entry to the undo stack. A user who reorders several cards in their spread zone builds up many undo steps for actions they would not intuitively expect to undo one at a time.

By contrast, `REORDER_HAND` has `skipSnapshot` support (lines 360-362), and `CLAUDE.md` explicitly requires `skipSnapshot: true` for "any sort, filter, or display-preference action that round-trips through the game action system."

The `REORDER_PILE_SPREAD` action type in `src/shared/types.ts` does not include a `skipSnapshot` field, so neither the client nor server currently have the option to suppress snapshot creation.

**Fix:** Add `skipSnapshot?: boolean` to the `REORDER_PILE_SPREAD` action type and mirror the `REORDER_HAND` pattern:

```typescript
// src/shared/types.ts
| { type: "REORDER_PILE_SPREAD"; pileId: string; orderedCardIds: string[]; skipSnapshot?: boolean }

// party/index.ts
case "REORDER_PILE_SPREAD": {
  // ... validation ...
  if (!action.skipSnapshot) {
    takeSnapshot(this.gameState);
  }
  // ...
}

// SpreadZone.tsx — sendAction call:
sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id), skipSnapshot: true });
```

## Info

### IN-01: GROUP_PLACE_ON_CANVAS V2 coordinate check: send-inside-loop + post-loop re-check is redundant

**File:** `party/index.ts:661-673`

**Issue:** The coordinate validation loop sends the error response inside the `for` loop (line 664-669) and then `break`s — but that `break` exits the `for` loop, not the `switch` case. A second check at line 673 (`cards.some(...)`) is then required to actually exit the case. This pattern is functional but confusing: the error is already sent at line 664, so the re-check at line 673 is purely a control-flow mechanism to exit the switch.

```typescript
// Current: send inside loop + re-check outside
for (const c of cards) {
  if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_COORDINATES", ... }));
    break;  // exits for, not switch
  }
}
if (cards.some(c => !Number.isFinite(c.x) || !Number.isFinite(c.y))) break;  // exits switch

// Simpler: check first, send once, break switch
if (cards.some(c => !Number.isFinite(c.x) || !Number.isFinite(c.y))) {
  sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_COORDINATES", ... }));
  break;
}
```

The current code is correct (single send, correct break) but the two-step structure requires a reader to verify that the error is only sent once.

---

_Reviewed: 2026-05-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
