---
phase: 20-spread-zone-multi-select
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/shared/types.ts
  - party/index.ts
  - tests/playCardSet.test.ts
  - src/components/SpreadZone.tsx
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/HandZone.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-05-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase implements multi-card-set play from hand and spread zones. The server-side `PLAY_CARD_SET` handler is generally solid — it validates before mutating, deduplicates, snapshots correctly, and handles both hand and pile sources. The client-side wiring in `BoardDragLayer` has two correctness bugs of note: one security-relevant authorization bypass and one stale-closure data corruption bug. Additionally, the `viewFor` masking logic in `party/index.ts` is semantically wrong for spread-zone cards (pre-existing, but touched by this phase via the `faceUp` mutations in `PLAY_CARD_SET`). A missing `toZone=hand` authorization guard in `PLAY_CARD_SET` rounds out the critical findings.

---

## Critical Issues

### CR-01: `PLAY_CARD_SET` allows any player to move cards into any other player's hand

**File:** `party/index.ts:559–576`
**Issue:** The `MOVE_CARD` handler (line 220) guards `toZone === "hand"` — if `toId !== senderToken` it rejects with `UNAUTHORIZED_MOVE`. The `PLAY_CARD_SET` handler has no equivalent guard. Any player can send `{ type: "PLAY_CARD_SET", cardIds: [...], fromZone: "pile", fromId: "play", toZone: "hand", toId: "<victim-player-id>" }` and the server will auto-create that hand entry (line 566) and push cards into it. This lets a player stuff cards into another player's hand without consent — a meaningful authorization violation in a game with hidden hands.

**Fix:**
```typescript
// After resolving dest, before takeSnapshot (around line 568):
if (toZone === "hand" && toId !== senderToken) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "UNAUTHORIZED_MOVE",
    message: "Cannot place cards in another player's hand",
  } satisfies ServerEvent));
  break;
}
```

---

### CR-02: Stale closure sends wrong `fromId` in multi-select `PLAY_CARD_SET` when selection is from a pile

**File:** `src/components/BoardDragLayer.tsx:154–171`
**Issue:** When `isMultiCardSet` is true, `fromId` is constructed as:

```typescript
fromId: selectionSource?.zone === 'pile'
  ? dragFromId         // dragDataRef.current?.fromId ?? playerId
  : playerId,
```

`dragFromId` is captured from `dragDataRef.current?.fromId` — the ID of the card *being dragged* at drop time, which is the card the user grabbed last. If the user selected cards from spread zone `spread-player-1` by clicking multiple cards and then dragged one, `dragDataRef.current.fromId` is the source of the *dragged* card. But `selectionSource.zoneId` is the zone where the *first* card was clicked. These should be the same thing for a well-behaved user, but:

1. A user can click cards in one zone, then a different drag target's `dragDataRef` can be stale if `handleDragStart` fired after the selection. This is not possible with the current selection-clear-on-drag logic (line 136–139), but:
2. The actual bug is simpler: the code uses `dragDataRef.current?.fromId` (the dragged card's pile) but ignores `selectionSource.zoneId` completely for the pile case. These should be the same — but `selectionSource.zoneId` is the canonical, user-selected source zone, while `dragFromId` falls back to `playerId` if `dragDataRef.current` is null (line 155: `dragDataRef.current?.fromId ?? playerId`). Since `dragDataRef.current` is set to null on line 161 *before* the `sendAction` call on line 162, this fallback to `playerId` cannot happen in practice, but the ordering is fragile.

The deeper correctness bug: if `selectionSource.zone === 'pile'`, the correct `fromId` is `selectionSource.zoneId`, not `dragDataRef.current?.fromId`. These must be identical for a valid multi-select (the drag must start from the same zone as the selection), but the code uses the drag data ref instead of the canonical selectionSource, creating a silent divergence risk.

**Fix:**
```typescript
fromId: selectionSource?.zone === 'pile'
  ? (selectionSource.zoneId)   // use selectionSource as canonical pile ID
  : playerId,
```

This is unambiguous and doesn't rely on `dragDataRef` ordering.

---

## Warnings

### WR-01: `viewFor` applies "top card visible" masking to spread-zone piles, leaking card identity

**File:** `party/index.ts:71–73`
**Issue:** The masking logic in `viewFor` exposes the top card of every pile unconditionally:

```typescript
const isTop = i === arr.length - 1;
return card.faceUp || isTop ? card : { faceUp: false as const };
```

This was designed for regular piles (draw pile where the top card is visible). For spread-zone piles, every card is already stored with `card.faceUp = true` (set on arrival via `PLAY_CARD_SET` line 592 and `MOVE_CARD` line 278), so it doesn't bite in normal operation. However, if any card in a spread zone ends up with `card.faceUp = false` (e.g., via `FLIP_CARD` or `SET_PILE_FACE`), only the *last* card in the array (the conceptual "top") is visible to opponents — the others are hidden. This is inconsistent with spread-zone semantics, where all cards should be visible to all players. The masking logic should special-case spread zones:

```typescript
cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
  if (pile.region === 'spread') return card; // spread zones: all cards always visible
  const isTop = i === arr.length - 1;
  return card.faceUp || isTop ? card : { faceUp: false as const };
}),
```

---

### WR-02: `isMultiCardSet` allows a multi-card drop onto `opponent-hand` but `PLAY_CARD_SET` is sent — not `PASS_CARD`

**File:** `src/components/BoardDragLayer.tsx:147–171`
**Issue:** The `isMultiCardSet` condition (line 151) includes `overData?.toZone === 'opponent-hand'` as a valid destination. When this matches, the client sends `PLAY_CARD_SET` with `toZone: 'hand'` and `toId: overData!.toId` (the opponent's player ID). This falls through CR-01 (where the server currently has no `toZone=hand` guard in `PLAY_CARD_SET`), so the cards would actually land in the opponent's hand. Whether this is intended "pass multiple cards" behavior or a mistake is unclear — the single-card path uses the distinct `PASS_CARD` action type, which has its own semantics and broadcast. Using `PLAY_CARD_SET` for an opponent-hand drop bypasses the `PASS_CARD` code path entirely and would push cards into the opponent's hand silently (no dedicated event, no UI differentiation). At minimum, multi-card opponent-hand drops should be disabled or routed through `PASS_CARD`.

**Fix:** Exclude `opponent-hand` from `isMultiCardSet` until multi-pass is deliberately designed:
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&  // removed 'opponent-hand'
  !(dragDataRef.current?.fromZone === 'pile' && dragDataRef.current?.fromId === overData?.toId);
```

---

### WR-03: `PLAY_CARD_SET` mutates card `faceUp` before removing from source, which corrupts the undo snapshot

**File:** `party/index.ts:578–602`
**Issue:** The code calls `takeSnapshot` at line 579 (correct), then builds `cardsToPlay` from references into the live `source` array (line 583), then mutates each card's `faceUp` (lines 589–592), then filters `source`/`srcPile.cards` to remove those cards (lines 596–601). The `cardsToPlay` array holds object references to the same card objects in `source`. When `faceUp` is mutated at line 589–592, this mutates the card objects that already exist in both the live state *and* in the deep-cloned snapshot (the snapshot was taken at line 579 before `cardsToPlay` was built, so the snapshot's cards are separate copies). The snapshot copy is safe. However, the mutation happens on the card objects while they are still present in the source array (before the filter at lines 596–601). This means: between lines 589 and 596, the source contains cards with their `faceUp` already changed. If `broadcastState` were called between those lines (it isn't, they're synchronous), the state would be partially wrong. As-is this is not a runtime bug but is a hazardous ordering — a future refactor that adds any `await` or early broadcast between lines 589 and 600 will introduce a bug.

**Fix:** Set `faceUp` after removing from source:
```typescript
// Remove from source first
if (!fromZone || fromZone === "hand") {
  this.gameState.hands[fromId] = source.filter(c => !cardIdSet.has(c.id));
} else {
  const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
  srcPile.cards = srcPile.cards.filter(c => !cardIdSet.has(c.id));
}
// Then set faceUp and push to dest
if (toZone === "hand") {
  cardsToPlay.forEach(card => { card.faceUp = true; });
} else {
  const destPile = this.gameState.piles.find(p => p.id === toId)!;
  cardsToPlay.forEach(card => { card.faceUp = destPile.faceUp === true; });
}
dest.push(...cardsToPlay);
```

---

### WR-04: `HandZone` selection badge shows when `selectedIds` contains hand cards belonging to another zone

**File:** `src/components/HandZone.tsx:114–117`
**Issue:** The badge renders whenever `selectedIds.size >= 2`, unconditionally:

```typescript
{selectedIds.size >= 2 && (
  <span ...>{selectedIds.size} selected</span>
)}
```

`selectedIds` is a global set managed in `BoardDragLayer`. If the user selects 3 cards from the communal spread zone, `selectedIds.size === 3` and the `HandZone` will also display "3 selected" — even though none of those cards are in the hand. `SpreadZone` guards this correctly with `selectionSource?.zoneId === pile.id` (SpreadZone.tsx line 117). `HandZone` has no equivalent guard. The `HandZone` receives `selectedIds` but not `selectionSource`, so it cannot check.

**Fix:** Pass `selectionSource` to `HandZone` and add a zone guard:
```typescript
// HandZone.tsx
{selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId && (
  <span ...>{selectedIds.size} selected</span>
)}
```

---

## Info

### IN-01: `REORDER_PILE_SPREAD` does not call `takeSnapshot` — reorder is not undoable

**File:** `party/index.ts:312–336`
**Issue:** `REORDER_HAND` and `REORDER_PILE_SPREAD` both skip `takeSnapshot`. This is consistent (neither is undoable), but `PLAY_CARD_SET` is undoable. After playing multiple cards, if the user then reorders the spread, an undo of the play will also revert the reorder — which is consistent with the snapshot model. The omission is not a bug, but worth noting that reorder is intentionally excluded from the undo stack. A comment in `REORDER_PILE_SPREAD` matching the one absent in `REORDER_HAND` would help.

---

### IN-02: Test file comment mismatch — `D-06` label applied to wrong test

**File:** `tests/playCardSet.test.ts:176`
**Issue:** The test at line 176 is labeled `(D-06)` in its description: `"plays a set of cards from a pile to a player's hand when toZone is 'hand' (D-06)"`. In `party/index.ts`, `D-06` refers to the animation delay in the `DEAL_CARDS` handler (line 436 comment). The label likely meant a different design-decision ID for the `PLAY_CARD_SET` hand-destination behavior. The mislabel won't cause test failures but could mislead future maintainers tracing requirements.

---

_Reviewed: 2026-05-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
