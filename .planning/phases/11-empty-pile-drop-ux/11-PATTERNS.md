# Phase 11: Empty Pile Drop UX - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 1
**Analogs found:** 1 / 1

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/BoardDragLayer.tsx` | component | event-driven | `src/components/BoardDragLayer.tsx` (existing branch at lines 117–127) | exact — the hand-drop path is the direct pattern to copy |

## Pattern Assignments

### `src/components/BoardDragLayer.tsx` (component, event-driven)

**Change point:** `handleDragEnd`, lines 114–116. The existing `if (toZone === 'pile')` block unconditionally calls `setPendingMove`. Add an inner conditional: if the target pile is empty, skip `setPendingMove` and call `sendAction` directly.

**Analog — hand-drop direct sendAction pattern** (lines 117–127):
```typescript
} else {
  // Hand drop: send immediately, no position dialog needed
  sendAction({
    type: 'MOVE_CARD',
    cardId: card.id,
    fromZone: fromZone as 'hand' | 'pile',
    fromId,
    toZone,
    toId,
  });
}
```

**Target pile lookup pattern** — `gameState.piles` is in scope as a prop. Use existence + length check per D-02 and Claude's Discretion note:
```typescript
const targetPile = gameState.piles.find(p => p.id === toId);
const isEmpty = !targetPile || targetPile.cards.length === 0;
```

**New branch to insert inside the existing `if (toZone === 'pile')` block** (replaces lines 114–116):
```typescript
if (toZone === 'pile') {
  const targetPile = gameState.piles.find(p => p.id === toId);
  const isEmpty = !targetPile || targetPile.cards.length === 0;
  if (isEmpty) {
    // Empty pile: bypass dialog, send immediately at top (D-02, D-03)
    sendAction({
      type: 'MOVE_CARD',
      cardId: card.id,
      fromZone: fromZone as 'hand' | 'pile',
      fromId,
      toZone,
      toId,
      insertPosition: 'top',
    });
  } else {
    // Non-empty pile: intercept and show position dialog (D-01, D-04)
    setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId });
  }
}
```

**Key type facts from `src/shared/types.ts`:**
- `ClientPile.cards` is `(Card | MaskedCard)[]` (line 29) — `length === 0` is safe for any pile state
- `ClientGameState.piles` is `ClientPile[]` (line 49) — available via the `gameState` prop already in scope
- `ClientAction` `MOVE_CARD` has `insertPosition?: 'top' | 'bottom' | 'random'` (line 54) — already optional, passing `'top'` is valid

---

## Shared Patterns

### Direct sendAction call (no dialog)
**Source:** `src/components/BoardDragLayer.tsx` lines 119–127
**Apply to:** The new empty-pile branch only
```typescript
sendAction({
  type: 'MOVE_CARD',
  cardId: card.id,
  fromZone: fromZone as 'hand' | 'pile',
  fromId,
  toZone,
  toId,
  insertPosition: 'top',  // only addition vs. hand-drop call
});
```

### Pile lookup from gameState prop
**Source:** `gameState` prop on `BoardDragLayer` (line 55); `piles` destructured in-scope during `handleDragEnd`
**Apply to:** The new empty-pile check
```typescript
const targetPile = gameState.piles.find(p => p.id === toId);
const isEmpty = !targetPile || targetPile.cards.length === 0;
```

---

## No Analog Found

None. The single modified file has an exact internal analog (the hand-drop branch) that maps directly to the required empty-pile-drop pattern.

---

## Metadata

**Analog search scope:** `src/components/BoardDragLayer.tsx`, `src/shared/types.ts`
**Files scanned:** 2
**Pattern extraction date:** 2026-04-18
