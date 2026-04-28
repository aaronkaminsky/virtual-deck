---
phase: 15-multi-card-set-play
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - party/index.ts
  - playwright/game.spec.ts
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/HandZone.tsx
  - src/components/SpreadZone.tsx
  - src/shared/types.ts
  - tests/boardDragLayerDialog.test.ts
  - tests/dealCards.test.ts
  - tests/deck.test.ts
  - tests/moveCard.test.ts
  - tests/playCardSet.test.ts
  - tests/resetTable.test.ts
  - tests/spreadZoneCreation.test.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-04-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase adds multi-card set play (PLAY_CARD_SET server action, client selection UI, drag-to-spread dispatch). The server action and UI wiring are structurally sound but contain several correctness defects. The two most serious are: (1) `PLAY_CARD_SET` does not validate against duplicate card IDs in the payload, allowing a crafted client to duplicate cards; and (2) the `ClientAction` union in `types.ts` has `PLAY_CARD_SET` listed twice, which is dead/redundant type definition that will cause confusion. Four warnings cover edge-case interaction bugs and a selection-clearing race condition.

---

## Critical Issues

### CR-01: PLAY_CARD_SET — duplicate cardId in payload causes card duplication

**File:** `party/index.ts:515-555`

**Issue:** The server validates that every id in `cardIds` exists in the sender's hand (`handIdSet.has(id)`) but does not check whether `cardIds` contains duplicates. Because `cardsToPlay` is built by mapping over the raw `cardIds` array (line 546), a client sending `["A-s", "A-s"]` would produce a `cardsToPlay` array with the same card object twice. The subsequent filter (line 554) uses a `Set` built from `cardIds`, so `cardIdSet` has only one copy of `"A-s"`, and the filter correctly removes only one entry from the hand — but `destPile.cards.push(...cardsToPlay)` pushes two copies of the same card object. The deck now has 53 "cards". The same card object is shared across both slots in the pile, so mutating one (e.g. via `FLIP_CARD`) instantly mutates the other; this is also a state corruption vector.

**Fix:**
```typescript
// After the allPresent check, add:
const cardIdSet = new Set(cardIds);
if (cardIdSet.size !== cardIds.length) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "DUPLICATE_CARD_IDS",
    message: "cardIds must not contain duplicates",
  } satisfies ServerEvent));
  break;
}
```
Then use the already-built `cardIdSet` below (remove the second `const cardIdSet = new Set(cardIds)` on line 544 to avoid shadowing).

---

### CR-02: Duplicate `PLAY_CARD_SET` variant in `ClientAction` union

**File:** `src/shared/types.ts:67` and `src/shared/types.ts:70`

**Issue:** `PLAY_CARD_SET` appears twice in the `ClientAction` discriminated union (lines 67 and 70 are identical). TypeScript does not error on this, but it produces a union member with no discriminating power that is purely redundant. More critically, this is a source-of-truth defect: any future developer reading the type may attempt to differentiate the two variants, and tooling that iterates union members (e.g., exhaustiveness checks, code generators) will see a spurious duplicate. Since `onMessage` switches on `action.type`, the server handler fires only once regardless, but the duplicate makes the contract misleading.

**Fix:**
```typescript
// Remove the second occurrence (line 70):
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
// Keep only the one at line 67.
```

---

## Warnings

### WR-01: Selection not cleared when a single selected card is dragged to a pile (single-card drag path)

**File:** `src/components/BoardDragLayer.tsx:114-119`

**Issue:** `handleDragStart` clears `selectedIds` when the dragged card is NOT in the selection (line 115-117). However, when exactly one card is selected and that one card is dragged, `selectedIds.size === 1` and `selectedIds.has(activeId)` is true, so selection is preserved. After drag ends, `isMultiCardSet` is false because `selectedIds.size > 1` is not met (line 126), so the single-card drag takes the normal `isSuccess` path, which does NOT clear `selectedIds`. The card is moved via `MOVE_CARD`, but the UI still shows that card as "selected" even though it is now in a pile, not in the hand. On the next render the card is gone from `gameState.myHand`, so the visual ring disappears, but `selectedIds` still contains a stale id — clicking another card merges it with the stale selection, causing the count badge to show an incorrect value (e.g. "2 selected" when only 1 new card was clicked).

**Fix:** In the non-multi-card success path, clear selection:
```typescript
} else if (isSuccess) {
  setSelectedIds(new Set()); // clear stale selection after any successful single-card move
  setActiveCard(null);
  // ... rest of existing code
```

---

### WR-02: Selection cleared on any pointer-down in BoardDragLayer wrapper, including on hand cards — conflicts with click-to-select

**File:** `src/components/BoardDragLayer.tsx:246` and `src/components/HandZone.tsx:41`

**Issue:** The outer `<div className="contents">` in `BoardDragLayer` has `onPointerDown={() => setSelectedIds(new Set())}`. `SortableHandCard` calls `e.stopPropagation()` in its own `onPointerDown` to prevent this clear. However, `stopPropagation` on `pointerdown` only blocks synthetic React event bubbling — dnd-kit attaches native pointer listeners via `PointerSensor`, which listens at the window level and is NOT blocked by `stopPropagation`. Concretely: when a user clicks a hand card intending to toggle selection, the `BoardDragLayer` `onPointerDown` fires first (before the child's handler) for the capture phase, or via the document-level listener if dnd-kit fires before React's synthetic bubbling resolves. Depending on event order the selection may be cleared immediately before or after the click toggle, netting zero visual change. The behaviour is browser/timing dependent, making this intermittent and hard to reproduce in automated tests.

The actual guardbeing relied on is React's bubble order, which is correct for a plain click (child bubble fires → `stopPropagation` → parent sees nothing). This works in most cases but is fragile because it assumes no capture-phase listener above. If any parent subscribes with `{ capture: true }`, the clear fires before the child can prevent it.

**Fix:** Rather than relying on `stopPropagation`, make the outer clear conditional:

```typescript
// In BoardDragLayer, change:
<div className="contents" onPointerDown={() => setSelectedIds(new Set())}>
// To: only clear when clicking outside the hand zone entirely.
// One robust approach: track whether the pointer landed on a hand-card element
// and skip the clear in that case. Or: remove the wrapper clear and instead
// clear on drag-start of an unselected card (already done at line 115) and
// on successful set-play (already done). Evaluate whether the wrapper clear
// is actually needed for the Escape-key path (which is handled separately via keydown).
```

---

### WR-03: `PLAY_CARD_SET` does not validate that `cardIds` is non-empty

**File:** `party/index.ts:515-555`

**Issue:** A client can send `{ type: "PLAY_CARD_SET", cardIds: [], fromId: "...", toZone: "pile", toId: "play" }`. All validation passes (empty array satisfies `every`, `Set` size check passes if added), `takeSnapshot` is called unnecessarily, and an empty `push` is applied to the destination pile. The side effects are minor (a wasted snapshot, a persist, and a broadcast) but represent unnecessary server-side work triggered by a trivially invalid payload. The snapshot being wasted is more meaningful: it consumes one of the 20 undo slots.

**Fix:**
```typescript
if (cardIds.length === 0) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "EMPTY_CARD_SET",
    message: "cardIds must contain at least one card",
  } satisfies ServerEvent));
  break;
}
```

---

### WR-04: `PLAY_CARD_SET` mutates card objects before atomically rebuilding the hand, leaving `faceUp` permanently changed on snapshot rollback

**File:** `party/index.ts:549-554`

**Issue:** The server sets `card.faceUp = destPile.faceUp ?? true` on each card in `cardsToPlay` (line 549-551) BEFORE the hand is rebuilt (line 554). The cards in `cardsToPlay` are the same object references that exist in `hand` (retrieved from `handById`). The snapshot taken on line 541 captures these references via deep `JSON.parse(JSON.stringify(...))`, so the snapshot itself stores the correct pre-mutation `faceUp` values — this part is fine. However, if the destination pile's `faceUp` is `false` and the player's hand conventionally holds `faceUp: true` cards, this code mutates the card objects, then removes them from the hand into the dest pile. On UNDO, the snapshot restores the entire state from JSON, so the cards reappear in the hand with their original `faceUp: true` value. This is correct behavior.

The actual defect is narrower: if `destPile.faceUp` is `undefined` (a legal value per the `Pile` interface's `faceUp?: boolean`), the fallback is `?? true`, meaning cards played to an undefined-faceUp pile always land face-up. But `viewFor` masks cards in piles based on individual `card.faceUp`, not `pile.faceUp`. A pile with `faceUp: undefined` that has the masking logic rely on `card.faceUp = true` will expose all card identities to opponents via the `ClientPile` cards array (since `viewFor` returns full `Card` objects for `card.faceUp === true` cards, line 73). This creates an unintended hand privacy leak if a custom pile with `faceUp: undefined` is the target.

**Fix:** Treat `undefined` as `false` rather than `true`:
```typescript
card.faceUp = destPile.faceUp === true;
```

---

## Info

### IN-01: `makeMockConnection` duplicated across test files

**Files:** `tests/dealCards.test.ts:24-33`, `tests/moveCard.test.ts:24-33`, `tests/resetTable.test.ts:24-33`

**Issue:** The `makeMockConnection` and `makeMockRoom` helpers are defined locally in three different test files with identical bodies, alongside the canonical implementation in `tests/helpers.ts`. `tests/playCardSet.test.ts` and `tests/spreadZoneCreation.test.ts` correctly import from `helpers.ts`. The three older files do not — they have their own copies. If the helper signature changes (e.g. to add `setState` as `spreadZoneCreation.test.ts` requires), the copies in the three older files will silently diverge.

**Fix:** Remove the local definitions from `dealCards.test.ts`, `moveCard.test.ts`, and `resetTable.test.ts` and import from `./helpers` instead.

---

### IN-02: `console.error` gated on `process.env.NODE_ENV === 'development'` in production-deployed component

**File:** `src/components/BoardDragLayer.tsx:88-90`

**Issue:** The guard `if (process.env.NODE_ENV === 'development') { console.error(...) }` means the defensive error in `sendPendingMove` is silently swallowed in production. This is a diagnostics trade-off, not a bug, but it means the "this is a bug" condition — `sendPendingMove` called with no `pendingMove` — goes completely unobserved in production deployments, making root-cause investigation harder if it ever happens.

**Fix:** Either remove the environment guard (keeping the `console.error` in production) or convert it to a no-op comment. Given this component runs client-side only, `console.error` in production is acceptable for a defensive guard.

---

_Reviewed: 2026-04-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
