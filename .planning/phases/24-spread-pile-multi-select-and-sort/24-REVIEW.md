---
phase: 24-spread-pile-multi-select-and-sort
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - tests/gridMove.test.ts
  - src/shared/types.ts
  - party/index.ts
  - src/components/GridZone.tsx
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-17
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase adds a 2-row × 7-column grid play area (`GridZone`), multi-card selection (`PLAY_CARD_SET`), and a new server message type (`MOVE_GRID_CARD`). The overall design is sound and the server state machine is well-structured. Two blockers were found: the `MOVE_CARD` and `PLAY_CARD_SET` server handlers assign `toRow`/`toCol` to `gridPositions` without any bounds validation (the same validation that `MOVE_GRID_CARD` correctly performs), and a multi-card drag from within the grid pile itself silently only moves the dragged card rather than the full selection. Three warnings cover dead code, a logic-reachability inconsistency, and a mobile layout issue.

---

## Critical Issues

### CR-01: `MOVE_CARD` and `PLAY_CARD_SET` write unbounded `toRow`/`toCol` to `gridPositions`

**File:** `party/index.ts:329-334` and `party/index.ts:729-735`

**Issue:** `MOVE_GRID_CARD` validates that `toRow ∈ [0, 1]` and `toCol ∈ [0, 6]` before writing to `gridPositions` (lines 396-401). Neither `MOVE_CARD` nor `PLAY_CARD_SET` performs any such check. A client can send `MOVE_CARD` with `toRow: 9999` and `toCol: -1` and the server will persist those values into `gridPositions` without error. When `viewFor` forwards the state to all clients, `buildCellMap` in `GridZone` will silently create a cell entry at key `"9999,-1"` — a key that no `GridCell` droppable renders, so the card becomes invisible and unreachable until a `RESET_TABLE`.

**Fix:**
```typescript
// Add immediately after the `destPile?.id === 'play'` guard in both MOVE_CARD (line 331)
// and PLAY_CARD_SET (line 729):
const MAX_ROWS = 2;
const MAX_COLS = 7;
if (
  action.toRow !== undefined && action.toCol !== undefined &&
  (
    !Number.isInteger(action.toRow) || action.toRow < 0 || action.toRow >= MAX_ROWS ||
    !Number.isInteger(action.toCol) || action.toCol < 0 || action.toCol >= MAX_COLS
  )
) {
  sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_POSITION",
    message: "toRow/toCol out of range" } satisfies ServerEvent));
  break;
}
```

---

### CR-02: Multi-select drag from within the grid pile only moves the dragged card; the rest of the selection is silently dropped

**File:** `src/components/BoardDragLayer.tsx:203-232`

**Issue:** When a player selects multiple cards that are already on the `play` grid and drags one of them to another grid cell, `isIntraSpreadReorder` evaluates to `true` (because `fromZone === 'pile'` and `fromId === 'play' === overData.toId`). This forces `isMultiCardSet` to `false` (line 210: `!isIntraSpreadReorder`). `BoardDragLayer.handleDragEnd` then falls through to the spread branch and sends nothing, deferring to `GridZone.useDndMonitor`. The monitor fires `MOVE_GRID_CARD` for only the single dragged card (line 122-128 in `GridZone.tsx`). The remaining selected cards stay at their original grid positions — the multi-select is ignored without any error or feedback to the user.

**Fix:** `MOVE_GRID_CARD` is a per-card operation by design; the fix is to either (a) extend the server to accept an array of `(cardId, toRow, toCol)` tuples in a new `MOVE_GRID_CARD_SET` action, or (b) prevent multi-card selection from being possible when the source zone is the `play` grid. The minimum safe fix that prevents silent data loss is to clear the selection in `handleDragEnd` when `isIntraSpreadReorder` is true AND `selectedIds.size > 1`, and optionally dispatch individual `MOVE_GRID_CARD` actions for each selected card using the same destination cell:

```typescript
// In handleDragEnd, inside the `isIntraSpreadReorder` suppression path
// (after the `if (!isIntraSpreadReorder)` check at line 284):
// Add an else branch:
} else if (selectedIds.size > 1 && selectionSource?.zoneId === 'play') {
  // Multi-select intra-grid drag: move every selected card to the same target cell.
  // Each MOVE_GRID_CARD is validated server-side independently.
  const toRow = (event.over?.data.current as { toRow?: number })?.toRow;
  const toCol = (event.over?.data.current as { toCol?: number })?.toCol;
  if (toRow !== undefined && toCol !== undefined) {
    for (const cId of selectedIds) {
      sendAction({ type: 'MOVE_GRID_CARD', cardId: cId, pileId: 'play', toRow, toCol });
    }
  }
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```

---

## Warnings

### WR-01: Dead `setRefs` function in `GridCell`

**File:** `src/components/GridZone.tsx:57-60`

**Issue:** `setRefs` is defined to merge the drop and drag refs onto one element, but is never called. The component instead attaches `setDropRef` to the outer `div` (line 74) and `setDragRef` to the inner card `div` (line 86) separately. The dead function implies the original design used a single-element ref merge that was abandoned, leaving the intent of the code ambiguous.

**Fix:** Delete lines 57-60. No behavior change needed; the two-ref split on separate elements is intentional and correct.

---

### WR-02: Unreachable null-guard branches in `viewFor`

**File:** `party/index.ts:65-73`

**Issue:** `viewFor` throws at line 66 if `playerToken === null`. Lines 72-73 then use `playerToken ??` and `playerToken ?` guards as though `playerToken` could still be null past the throw. This is logically unreachable, but it misleads readers and the TypeScript compiler may not narrow correctly if `viewFor` is later refactored to remove the throw.

```typescript
myPlayerId: playerToken ?? "",   // line 72: playerToken is always non-null here
myHand: playerToken ? (state.hands[playerToken] ?? []) : [],   // line 73: same
```

**Fix:** Remove the null-branch expressions since they are unreachable after the early throw. Or change the signature to `playerToken: string` (non-nullable) so the compiler enforces non-null at call sites.

```typescript
// Change function signature:
export function viewFor(state: GameState, playerToken: string): ClientGameState {
  // Remove the null guard entirely
  return {
    myPlayerId: playerToken,
    myHand: state.hands[playerToken] ?? [],
    // ...
  };
}
```

---

### WR-03: Mobile grid renders 14 cells in a 4-column CSS grid, pushing columns 4-6 to unexpected visual rows

**File:** `src/components/GridZone.tsx:142`

**Issue:** The CSS class is `grid grid-cols-4 sm:grid-cols-7`, but `COLS = 7` and `ROWS = 2` so all 14 cells are always rendered. Below the `sm` breakpoint, CSS wraps the 14 cells into 4 columns, producing 4 visual rows (3 full + 1 partial) instead of 2. Cards in columns 4, 5, 6 appear on the 3rd or 4th visual row and their positions are discontiguous from columns 0-3. This makes the grid's spatial mapping unintuitive on mobile, and the hit target for grid cells in columns 4-6 lands in a different visual row than the user expects.

**Fix:** Limit the displayed grid to 4 columns at mobile and constrain server-side `MAX_COLS` to 4 at mobile widths, or render only the first 4 columns at mobile:

```tsx
// Option A: Render only the subset of columns visible at the current breakpoint.
// Use a responsive COLS constant and filter cells:
const visibleCols = window.innerWidth < 640 ? 4 : COLS; // or via CSS custom property
// Option B: Reduce the grid to a 1-row×4-col layout on mobile by limiting rendering:
Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: COLS }, (_, col) => {
    if (col >= 4 && /* isMobile */) return null;
    return <GridCell ... />;
  })
)
```

---

## Info

### IN-01: `PLAY_CARD_SET` assigns all cards in a multi-select to the same grid cell

**File:** `party/index.ts:729-735`

**Issue:** When a multi-card set is dropped onto a grid cell, every card receives the same `{ row, col }` position (line 734). This is technically consistent with the current `buildCellMap` behavior (which stacks multiple cards per cell and shows a `×N` badge), but the behavior may surprise users who expect cards to distribute across empty cells automatically. No data loss occurs — the badge handles the stacked display — but the intent should be explicit in the code.

**Fix:** No code change required if stacking is the intended behavior. Add a comment at line 733 to make the intent explicit:
```typescript
// All cards in a multi-drop land on the same cell (stacked). The ×N badge indicates stacking.
for (const cId of cardIds) {
  destPile.gridPositions[cId] = { row: action.toRow, col: action.toCol };
}
```

---

### IN-02: Test 6 only checks `gridPositions === {}` after `RESET_TABLE`; does not verify orphaned cards at non-default positions

**File:** `tests/gridMove.test.ts:138-147`

**Issue:** The test seeds one card at `{ row: 0, col: 1 }` before reset, then asserts `gridPositions` equals `{}`. This is correct but minimal — it does not verify the case where cards from non-play piles also have their `gridPositions` cleared, or that the draw pile correctly received all cards. A more comprehensive test would seed multiple piles with `gridPositions` and assert all are cleared. This is low risk given the implementation (line 578-582) is simple, but the test gap means a future regression in the multi-pile path would go undetected.

**Fix:** Extend Test 6 to also push a card with `gridPositions` into a personal spread zone and verify that `gridPositions` is also `{}` after reset.

---

_Reviewed: 2026-05-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
