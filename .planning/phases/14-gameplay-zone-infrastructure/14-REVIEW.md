---
phase: 14-gameplay-zone-infrastructure
reviewed: 2026-04-26T18:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - party/index.ts
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/HandZone.tsx
  - src/components/SpreadZone.tsx
  - src/shared/types.ts
  - tests/boardDragLayerDialog.test.ts
  - tests/dealCards.test.ts
  - tests/deck.test.ts
  - tests/moveCard.test.ts
  - tests/resetTable.test.ts
  - tests/spreadZoneCreation.test.ts
  - playwright/game.spec.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 14 Gap Closure: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 11
**Scope:** Gap closure plans 14-03 (DEAL_CARDS late-joiner initialization), 14-04 (play pile to spread region, REORDER_PILE_SPREAD handler, client component updates), 14-05 (HandZone -ml-5 cascade overlap)
**Status:** issues_found

## Summary

The late-joiner fix in DEAL_CARDS (14-03) is correctly implemented — the hand initialization loop runs before the deal loop, and the snapshot is taken before the shuffle as intended. The spread zone infrastructure (14-04) is well-structured: the onStart migration correctly converts `play` to `region: "spread"`, removes `spread-communal`, and the idempotent personal zone creation in `onConnect` is correct. The cascade overlap in HandZone (14-05) applies the `-ml-5` class correctly on index > 0 only.

One critical issue was found: the new `REORDER_PILE_SPREAD` handler does not verify that the requesting player owns the spread zone being reordered, allowing any player to reorder another player's personal zone. Two warnings cover a variable shadow in MOVE_CARD (carried forward from before) and a fragile naming pattern in SpreadZone's reorder guard. Two info items address optional typing on fields that are always required at runtime and duplicated test helper definitions across test files.

## Critical Issues

### CR-01: REORDER_PILE_SPREAD allows any player to reorder another player's personal spread zone

**File:** `party/index.ts:312-336`
**Issue:** The `REORDER_PILE_SPREAD` handler validates that the target pile exists and has `region === "spread"`, but does not verify that the requesting player owns the pile. Personal spread zones (`spread-${playerToken}`) have `ownerId` set to the owning player's token. The communal `play` pile has `ownerId: null`. A player can currently send `REORDER_PILE_SPREAD` with another player's `spread-${otherId}` as `pileId` and reorder their zone without any authorization error.

**Fix:**
```typescript
case "REORDER_PILE_SPREAD": {
  const spreadPile = this.gameState.piles.find(p => p.id === action.pileId && p.region === "spread");
  if (!spreadPile) {
    sender.send(JSON.stringify({
      type: "ERROR",
      code: "PILE_NOT_FOUND",
      message: `No spread pile found with id: ${action.pileId}`,
    } satisfies ServerEvent));
    break;
  }
  // Only the zone owner may reorder it; communal zone (ownerId null) is open to all
  if (spreadPile.ownerId !== null && spreadPile.ownerId !== senderToken) {
    sender.send(JSON.stringify({
      type: "ERROR",
      code: "UNAUTHORIZED_MOVE",
      message: "Cannot reorder another player's spread zone",
    } satisfies ServerEvent));
    break;
  }
  // ... remainder of handler unchanged
```

## Warnings

### WR-01: Variable shadowing — `idx` redeclared inside MOVE_CARD random insertion block

**File:** `party/index.ts:245` and `party/index.ts:286`
**Issue:** `idx` is declared at line 245 (`const idx = source.findIndex(...)`) to hold the card's source index. Inside the `pos === 'random'` branch at line 286, a second `const idx` is declared for the random insertion position. TypeScript's block scoping prevents a runtime conflict, but a future reader maintaining the random-insertion branch may incorrectly assume `idx` refers to the source index.

**Fix:** Rename the inner variable:
```typescript
} else if (pos === 'random') {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const insertIdx = dest.length === 0 ? 0 : buf[0] % (dest.length + 1);
  dest.splice(insertIdx, 0, card);
}
```

### WR-02: SpreadZone `toThisPile` guard reads `fromZone`/`fromId` from `overData` but is named as a destination check

**File:** `src/components/SpreadZone.tsx:63-68`
**Issue:** The `toThisPile` variable checks `overData?.fromZone === 'pile' && overData?.fromId === pile.id`. `over.data.current` for a `SortableSpreadCard` contains that card's own *source* data (`{ fromZone: 'pile', fromId: pileId }`). The check works because a card in this pile has `fromId === pile.id` — "is the hover target a card from my pile" is the actual predicate, not "is the destination this pile." The variable name `toThisPile` implies destination semantics, creating a reading hazard. Additionally, when the drop lands on the zone droppable itself, `overData.fromZone` is `undefined`, requiring the fallback `String(over.id) === 'pile-${pile.id}'` to handle that case — two separate paths for the same concept. The same pattern exists in `HandZone.tsx:70-73` for `toSameHand`.

**Fix:** Rename to reflect actual semantics:
```typescript
const targetIsInThisPile =
  (overData?.fromZone === 'pile' && overData?.fromId === pile.id) ||
  String(over.id) === `pile-${pile.id}`;

if (fromThisPile && targetIsInThisPile && activeData) {
```

## Info

### IN-01: `Pile.region` and `Pile.ownerId` are optional in types.ts but are always required at runtime after migration

**File:** `src/shared/types.ts:22-23`
**Issue:** `region?: "pile" | "spread"` and `ownerId?: string | null` are declared optional. The `onStart` migration guarantees all persisted piles have these fields, and `defaultGameState` always sets them. Every consumer must add defensive coercions (e.g., `p.region ?? 'pile'` in `BoardView.tsx:25`). Declaring them required would eliminate these coercions and make the invariant explicit.

**Fix:** If the migration guarantee is accepted as complete:
```typescript
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
  region: "pile" | "spread";
  ownerId: string | null;
}
```
The same change applies to `ClientPile`. The `(pile as any)` casts in `onStart` migration become the single acknowledged migration callout, which is appropriate.

### IN-02: `makeMockRoom`, `makeMockConnection`, and `makeCard` duplicated across three test files instead of imported from helpers

**File:** `tests/dealCards.test.ts:10-33`, `tests/moveCard.test.ts:10-33`, `tests/resetTable.test.ts:10-28`
**Issue:** `tests/helpers.ts` exports canonical versions of all three helpers. `spreadZoneCreation.test.ts` imports from `helpers.ts`. The other three test files define their own local copies. The local `makeMockRoom` takes `(overrides?)` while `helpers.ts` takes `(connections?, overrides?)` — a signature mismatch that prevents a drop-in replacement. The local `makeMockConnection` also omits `setState`, which `spreadZoneCreation.test.ts` needed and added to its own local helper.

**Fix:** Consolidate the canonical signature in `helpers.ts` and update the three test files to import from it. Low urgency but prevents future divergence.

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
