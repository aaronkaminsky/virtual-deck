---
phase: 31-migration
reviewed: 2026-05-23T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - party/index.ts
  - playwright/game.spec.ts
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/HandZone.tsx
  - src/components/PileZone.tsx
  - src/components/SpreadZone.tsx
  - src/shared/types.ts
  - tests/boardDragLayerDialog.test.ts
  - tests/deck.test.ts
  - tests/gridRemoval.test.ts
  - tests/moveCard.test.ts
  - tests/playCardSet.test.ts
  - tests/reorderUndo.test.ts
  - tests/resetTable.test.ts
  - tests/selectAll.test.ts
  - tests/spreadZoneCreation.test.ts
  - tests/spreadZoneEmptyStrip.test.ts
  - tests/helpers.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: has_findings
---

# Phase 31: Code Review Report

**Reviewed:** 2026-05-23
**Depth:** standard
**Files Reviewed:** 19
**Status:** has_findings

Note: `GridZone.tsx` and `tests/gridMove.test.ts` / `tests/gridZoneFaceToggle.test.ts` were listed in the review scope but do not exist on disk (correctly removed in Phase 31). They are excluded from the file count.

## Summary

Phase 31 cleanly removes the communal grid: `GridZone.tsx` is gone, the `"play"` pile is absent from `defaultGameState`, grid action types are stripped from `ClientAction`, and `BoardView` now exposes a `data-testid="canvas-shell"` placeholder div. The server and client compile with zero TypeScript errors. No regressions in the core drag-drop, hand, pile, or spread zone paths were found.

Four warnings surfaced: a type-signature mismatch on the `onSelectAll` prop that causes `hasMaskedCards` to be silently dropped by TypeScript at the `BoardView` interface boundary; a spurious undo snapshot that can be created by a failed `MOVE_CARD` (destination not found); a missing test covering spread-zone card collection in `RESET_TABLE`; and a duplicate `makeMockRoom` definition in `gridRemoval.test.ts` that diverges from `helpers.ts`.

Three info items were also found: a dead-code branch inside `SpreadZone`, the untested `canvas-shell` element, and a pre-existing design note about spread zone card visibility.

## Warnings

### WR-01: `BoardViewProps.onSelectAll` drops `hasMaskedCards` — type mismatch at interface boundary

**File:** `src/components/BoardView.tsx:20`
**Issue:** `BoardViewProps.onSelectAll` is declared as `(cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void` — three parameters only. `PileZone.onSelectAll` is declared with a fourth optional parameter `hasMaskedCards?: boolean` and passes it on every call (`onSelectAll(allIds, 'pile', pile.id, hasMaskedCards)`). The narrower type at `BoardViewProps` means the `hasMaskedCards` argument gets silently dropped from the type at the `BoardView` boundary and is invisible to any future consumer of that prop signature. The runtime value still flows through because TypeScript's structural subtyping permits assigning a function with fewer declared parameters, but the interface is misleading and will cause a bug the moment another component passes `onSelectAll` through `BoardViewProps` and relies on the type to know the fourth arg exists.

**Fix:** Add the optional parameter to `BoardViewProps`:
```typescript
// src/components/BoardView.tsx:20
onSelectAll: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
```

---

### WR-02: Spurious undo snapshot left in history after failed `MOVE_CARD` (destination not found)

**File:** `party/index.ts:255-270`
**Issue:** `takeSnapshot` is called on line 255, then `source.splice` mutates state on line 256. If the destination pile is not found (lines 262-271), the code correctly puts the card back into `source` — but the snapshot taken before the splice remains in `undoSnapshots`. The net result: a failed move (one that leaves game state unchanged) consumes one undo slot. The user can press Undo after a failed move and see no visual change, but their undo history is corrupted (one real undo step is sacrificed). This bug predates Phase 31 but the spread-zone play pattern introduced in Phase 31 increases the likelihood of hitting it (e.g. if a spread zone is deleted or GC'd while a drag is in flight).

**Fix:** Move `takeSnapshot` to after the destination lookup, or reverse the snapshot on failure:
```typescript
// party/index.ts — MOVE_CARD handler
const idx = source.findIndex(c => c.id === cardId);
if (idx === -1) { /* ... error ... */ break; }

// Resolve destination BEFORE snapshotting
const dest: Card[] | undefined = ...;
if (dest === undefined) {
  sender.send(/* PILE_NOT_FOUND error */);
  break;
}

// Safe to snapshot — both source and dest are confirmed valid
takeSnapshot(this.gameState);
const card = source.splice(idx, 1)[0];
// ... rest of mutation
```

---

### WR-03: `RESET_TABLE` unit tests do not cover spread zone card collection

**File:** `tests/resetTable.test.ts`
**Issue:** `resetTable.test.ts` tests that hands, the discard pile, and the draw pile are correctly collected, but no test scenario seeds cards into a personal spread zone (`spread-{playerId}`) before calling `RESET_TABLE`. The server does collect spread zone cards (line 499-502 of `party/index.ts` iterates all non-draw piles), but this behavior is unverified. Given that spread zones are Phase 31's primary play surface, this is a meaningful coverage gap — a regression that caused spread cards to be excluded from reset would pass all current tests.

**Fix:** Add a test case:
```typescript
it("collects cards from personal spread zones into draw pile on reset", async () => {
  // seed player-1's spread zone with 2 cards
  room.gameState.piles.push({ id: "spread-player-1", name: "P1 Spread", cards: [makeCard("7-h"), makeCard("8-c")], faceUp: true, region: "spread", ownerId: "player-1" });

  await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

  const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
  expect(spreadPile.cards).toHaveLength(0);
  const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
  // total = 2 (player-1 hand) + 1 (player-2 hand) + 3 (draw) + 1 (discard) + 2 (spread)
  expect(drawPile.cards).toHaveLength(9);
});
```

---

### WR-04: `gridRemoval.test.ts` defines a local `makeMockRoom` instead of importing from `helpers.ts`

**File:** `tests/gridRemoval.test.ts:6-18`
**Issue:** `gridRemoval.test.ts` defines its own `makeMockRoom` function (lines 6-18) that is functionally identical to the one in `tests/helpers.ts`. The two implementations are currently in sync, but any future change to `makeMockRoom` in `helpers.ts` (e.g. adding a default storage mock, changing the `getConnections` return type) will silently leave `gridRemoval.test.ts` out of date. This is the same copy-paste divergence pattern that `moveCard.test.ts` and `resetTable.test.ts` also exhibit, but those tests predate `helpers.ts`; `gridRemoval.test.ts` was written alongside helpers and still duplicates.

**Fix:**
```typescript
// tests/gridRemoval.test.ts — remove local definitions and add:
import { makeMockRoom, makeMockConnection } from "./helpers";
```

## Info

### IN-01: Dead `isEmpty ? 'border-dashed' : ''` branch inside non-empty SpreadZone path

**File:** `src/components/SpreadZone.tsx:173`
**Issue:** The outer ternary already checks `isEmpty` (line 165). The non-empty branch (lines 171-174) contains `isEmpty ? 'border-dashed' : ''` — `isEmpty` is structurally always `false` at that point, so this evaluates to `''` every time. It is dead code that adds no classes and could mislead a future reader into thinking empty non-isOver piles can reach this path.

**Fix:** Remove the dead branch:
```typescript
// Before (line 171-174):
cn(
  'min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary',
  isEmpty ? 'border-dashed' : '',   // dead — always ''
  isOver ? 'border-primary' : 'border-border'
)

// After:
cn(
  'min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary',
  isOver ? 'border-primary' : 'border-border'
)
```

---

### IN-02: `data-testid="canvas-shell"` element is untested and un-referenced by any test

**File:** `src/components/BoardView.tsx:90`
**Issue:** The empty `<div data-testid="canvas-shell" />` introduced in Phase 31 as a placeholder for the future free-canvas play area is not referenced by any Playwright test or unit test. `testid` attributes imply testability; a dangling `testid` with no test creates the expectation that something should be asserted there. Either add a basic structural test (e.g. confirming it is present and below the pile column) or remove the `testid` until the canvas is implemented.

**Fix (option A):** Remove the `data-testid` until the canvas is real:
```tsx
<div className="flex-1 min-w-0 overflow-hidden bg-background self-stretch" />
```
**Fix (option B):** Add a Playwright structural assertion for Phase 31 canvas presence.

---

### IN-03: All spread zone cards always fully revealed to all players via `viewFor`

**File:** `party/index.ts:90`
**Issue:** The `viewFor` masking function returns every card in a spread zone at full fidelity (`return card`) regardless of `card.faceUp`. This means if a player places a face-down card in their personal spread zone, all opponents can see the card's rank and suit. This is a design decision documented by the comment `// spread zones: all cards always visible`, but it is architecturally at odds with the premise that players can hold private information. With spread zones now the primary play surface (Phase 31), this "always visible" policy applies to the main play area. If the intention is that spread zones are always public, this should be documented prominently; if any privacy use case is anticipated, the masking must be applied.

**Fix (if privacy is desired):** Apply the same isTop/faceUp masking to spread zone cards:
```typescript
// party/index.ts:89-92
cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
  const isTop = i === arr.length - 1;
  return card.faceUp || isTop ? card : { faceUp: false as const };
}),
```

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
