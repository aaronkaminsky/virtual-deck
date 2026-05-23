# Phase 29: Sort Verification - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 2 (1 modified component, 1 modified test)
**Analogs found:** 2 / 2 (files are self-referential — the files being changed are also the primary analogs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/HandZone.tsx` | component | event-driven | `src/components/HandZone.tsx` (current state) | exact — self-modification |
| `tests/handSort.test.ts` | test | transform | `tests/reorderUndo.test.ts` | role-match |

## Pattern Assignments

### `src/components/HandZone.tsx` (component, event-driven)

**Nature of change:** Delete `buildSortDispatch` (lines 39–46). Update `handleSort` (lines 156–164) to remove the `buildSortDispatch` call and the conditional `sendAction` call, keeping only `setSortMode(nextMode)`.

**Current `buildSortDispatch` to delete** (lines 39–46):
```typescript
export function buildSortDispatch(cards: Card[], nextMode: SortMode): ClientAction | null {
  if (nextMode === 'original') return null;
  return {
    type: 'REORDER_HAND',
    orderedCardIds: sortCards(cards, nextMode).map(c => c.id),
    skipSnapshot: true,
  };
}
```

**Current `handleSort` to update** (lines 156–164):
```typescript
function handleSort() {
  const nextMode = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
  setSortMode(nextMode);
  // Always derive dispatch from canonical server order (cards), not the visual order.
  const dispatch = buildSortDispatch(cards, nextMode);
  if (dispatch !== null) {
    sendAction(dispatch);
  }
}
```

**Target state for `handleSort` after D-01** — remove the `buildSortDispatch` call and `sendAction` call entirely:
```typescript
function handleSort() {
  const nextMode = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
  setSortMode(nextMode);
  // Sort is render-time only — no server dispatch. displayedCards is recomputed on next render.
}
```

**Render-time sort line to preserve unchanged** (line 154):
```typescript
const displayedCards = sortMode === 'original' ? cards : sortCards(cards, sortMode);
```

**Drag-reorder pattern to preserve unchanged** (lines 218–221) — this is the only remaining `sendAction` call in the component:
```typescript
if (sortMode !== 'original') {
  setSortMode('original');
}
sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
```

**Export to remove:** `buildSortDispatch` is currently exported (`export function buildSortDispatch`). The export disappears with the deletion. `sortCards` export stays.

---

### `tests/handSort.test.ts` (test, transform)

**Nature of change:** Remove the third `it` block (lines 48–68, the `buildSortDispatch` test). Add a new `it` block verifying `sortCards` does not mutate its input.

**Test block to delete** (lines 48–68):
```typescript
it("Sort click dispatches REORDER_HAND with skipSnapshot: true and sorted ids", () => {
  const cards: Card[] = [
    mkCard("A-h", "hearts", "A"),
    mkCard("2-s", "spades", "2"),
    mkCard("K-c", "clubs", "K"),
  ];

  const dispatch = buildSortDispatch(cards, "bySuit");

  expect(dispatch).not.toBeNull();
  expect(dispatch!.type).toBe("REORDER_HAND");
  expect((dispatch as { skipSnapshot: boolean }).skipSnapshot).toBe(true);
  expect((dispatch as { orderedCardIds: string[] }).orderedCardIds).toEqual(
    sortCards(cards, "bySuit").map(c => c.id)
  );

  // Cycling back to 'original' must return null (no dispatch)
  const nullDispatch = buildSortDispatch(cards, "original");
  expect(nullDispatch).toBeNull();
});
```

**Import line to update** (line 6) — remove `buildSortDispatch` from import:
```typescript
// Before:
import { sortCards, buildSortDispatch } from "../src/components/HandZone";

// After:
import { sortCards } from "../src/components/HandZone";
```

**New test to add** — non-mutation invariant confirming render-time sort preserves original order. Pattern follows existing `it` blocks in the same describe block:
```typescript
it("does not mutate the input array (original order is preserved as server/manual order)", () => {
  const input: Card[] = [
    mkCard("A-h", "hearts", "A"),
    mkCard("2-s", "spades", "2"),
    mkCard("K-c", "clubs", "K"),
  ];
  const originalIds = input.map(c => c.id);

  sortCards(input, "bySuit");
  sortCards(input, "byRank");

  expect(input.map(c => c.id)).toEqual(originalIds);
});
```

**Existing `it` blocks to keep unchanged** (lines 13–46): both `sortCards` correctness tests remain.

**Reference: `reorderUndo.test.ts` test structure** (lines 1–4) — shows import pattern for vitest + helpers:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { viewFor } from "../party/index";
import type * as Party from "partykit/server";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
```
Note: `handSort.test.ts` does not use `vi`, `beforeEach`, or server helpers — it stays lighter. The only vitest imports needed are `describe`, `it`, `expect`.

---

## Shared Patterns

### Pure function export convention
**Source:** `src/components/HandZone.tsx` lines 22–37
**Apply to:** `sortCards` — keep its `export` keyword; it is imported directly by `tests/handSort.test.ts`
```typescript
// --- Pure sort helpers (exported for tests) ---

export function sortCards(cards: Card[], mode: 'bySuit' | 'byRank'): Card[] {
  return [...cards].sort(/* ... */);
}
```
The `[...cards]` spread on line 25 is exactly what the new non-mutation test verifies. No change needed here — it already avoids mutation.

### Test factory pattern
**Source:** `tests/handSort.test.ts` lines 9–11
**Apply to:** New non-mutation test — reuse the existing `mkCard` helper defined at the top of the same file:
```typescript
function mkCard(id: string, suit: Suit, rank: Rank): Card {
  return { id, suit, rank, faceUp: false };
}
```

---

## No Analog Found

None — both files have direct in-codebase analogs or are self-referential modifications.

---

## Metadata

**Analog search scope:** `src/components/HandZone.tsx`, `tests/handSort.test.ts`, `tests/reorderUndo.test.ts`
**Files scanned:** 3
**Pattern extraction date:** 2026-05-21
