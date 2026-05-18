# Phase 24: Play Area Grid - Research

**Researched:** 2026-05-17
**Domain:** dnd-kit drop targets, React grid layout, PartyKit server state extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 4 columns mobile (<640px / `sm` breakpoint), 7 columns desktop (sm+). 2 rows fixed. No three-tier.
- **D-02:** Columns have no game-semantic meaning — free-form positional use.
- **D-03:** Cells tile the entire grid area; no dead zones. At any point over the grid, exactly one cell drop target is active and highlighted.
- **D-04:** Grid positions stored as `gridPositions: Record<string, { row: number; col: number }>` on the communal pile. Cards remain in flat `Pile.cards[]`. Map is additive.
- **D-05:** New server action `MOVE_GRID_CARD { cardId, pileId, toRow, toCol }` for intra-grid moves. `REORDER_PILE_SPREAD` stays unchanged for personal spread zones.
- **D-06:** External drops (from hand/pile) fire existing `MOVE_CARD`/`PLAY_CARD_SET`; server assigns `gridPositions[cardId] = { row, col }`.
- **D-07:** Each grid cell is a separate `useDroppable` target.
- **D-08:** Occupied cell drop stacks the card — no rejection.
- **D-09:** No "snap to nearest cell" fallback — cells tile the full surface.
- **D-10:** Stacked cell shows top card with count badge (×N), consistent with PileZone.
- **D-11:** Dragging from a stacked cell picks the top card only.
- **D-12:** Multi-card selection across grid cells is out of scope.

### Claude's Discretion
- Exact badge styling — match PileZone pattern.
- How `gridPositions` is initialized for a card newly dropped via `MOVE_CARD` — server assigns targeted cell coordinates.
- Whether `MOVE_GRID_CARD` enters the undo stack — yes (standard behavior).

### Deferred Ideas (OUT OF SCOPE)
- Multi-card selection/group-drag within the grid.
- Expanding a stacked cell to inspect/pick a specific card from the middle.
- Sorting the grid auto-arrangement (e.g. by rank/suit).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRID-01 | Communal spread zone displays as a 2-row fixed grid; cards snap to column positions; multiple cards can stack per cell; player can drag cards between cells | Full coverage: GridZone component, per-cell useDroppable, gridPositions state map, MOVE_GRID_CARD server action |
</phase_requirements>

---

## Summary

Phase 24 replaces the horizontal scroll `SpreadZone` for the communal `'play'` pile with a new `GridZone` component that renders a 2-row × 4-column (mobile) or 2-row × 7-column (desktop) fixed CSS grid. Each cell is an independent `useDroppable` target. Cards are stored in the flat `Pile.cards[]` array unchanged; a new `gridPositions` side-map on the pile tracks which `{ row, col }` position each card occupies.

The server grows two capabilities: (1) when `MOVE_CARD`/`PLAY_CARD_SET` delivers a card to the `'play'` pile, it assigns the card to the targeted cell via `gridPositions`; (2) a new `MOVE_GRID_CARD` action handles intra-grid cell-to-cell moves. Both produce a `STATE_UPDATE` broadcast. `gridPositions` is threaded through `viewFor` into `ClientPile` (additive field, no masking needed for spread zones).

The collision detection in `BoardDragLayer` currently splits droppables into three buckets: hand zones, `pile-*` zones, and card-level sortable items. Grid cells will use `useDroppable` IDs of the form `grid-cell-{row}-{col}-{pileId}` — they will fall into the "else" (card-level) bucket. This collision bucket assignment must be verified during planning: the planner must decide whether grid cell IDs need to be prefixed as `pile-*` to land in the pile bucket (where `pointerWithin` is used), or whether a new bucket is needed. The current `customCollision` function is the most complex integration risk in this phase.

**Primary recommendation:** Build `GridZone` as a new component (not a variant of `SpreadZone`). Re-use `useDndMonitor` for intra-grid detection, `useDroppable` per cell, `Badge` from shadcn for count display, and `DraggableCard` for the top card. The collision detector in `BoardDragLayer` will need a targeted extension to handle grid cell drop IDs.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Grid cell layout (2×N CSS grid) | Browser / Client | — | Pure CSS layout concern; no server involvement |
| Per-cell drop target registration | Browser / Client | — | `useDroppable` is a client dnd-kit primitive |
| Stack visualization (top card + count badge) | Browser / Client | — | Derived from `gridPositions` in received `ClientGameState` |
| Drag collision routing for grid cells | Browser / Client | — | Handled by `customCollision` in `BoardDragLayer` |
| `gridPositions` assignment on external drop | API / Backend (PartyKit) | — | Server owns authoritative position state |
| `MOVE_GRID_CARD` intra-grid move | API / Backend (PartyKit) | — | Server mutates `gridPositions`, broadcasts `STATE_UPDATE` |
| `gridPositions` cleanup on card exit | API / Backend (PartyKit) | — | When card leaves the grid pile, server removes its entry |
| `gridPositions` cleanup on `RESET_TABLE` | API / Backend (PartyKit) | — | `RESET_TABLE` clears all pile cards — must also clear `gridPositions` |
| Type definitions for `gridPositions` | Shared (`src/shared/types.ts`) | — | `Pile`, `ClientPile`, `ClientAction` all need extension |

---

## Standard Stack

### Core (already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 [VERIFIED: package.json] | `useDroppable` per-cell, `useDndMonitor` for intra-grid detection | Already the project DnD library; `useDroppable` is the exact primitive needed for per-cell targets |
| React | ^18.3.1 [VERIFIED: package.json] | Component model for `GridZone`, `GridCell` | Project standard |
| TypeScript | ^6.0.2 [VERIFIED: package.json] | Shared type additions (`gridPositions`, `MOVE_GRID_CARD`) | Project standard |
| Vitest | ^4.1.2 [VERIFIED: package.json] | Unit tests for server handler | Project test framework |
| shadcn `Badge` | installed [VERIFIED: UI-SPEC.md] | Count badge for stacked cells | Same component used in `PileZone.tsx` line 80 |
| shadcn `Button` | installed [VERIFIED: UI-SPEC.md] | Face toggle control | Same as `SpreadZone` |

No new packages are needed for this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-cell `useDroppable` | Single droppable zone + manual hit-testing | Per-cell is simpler and uses the existing dnd-kit API; manual hit-testing is fragile and bypasses the framework |
| CSS grid layout | Flexbox grid | CSS grid is the canonical tool for 2D grids; flexbox would require manual row management |

---

## Package Legitimacy Audit

No new packages are installed in this phase. All dependencies (`@dnd-kit/core`, `@dnd-kit/sortable`, React, TypeScript, shadcn components) are already present in `package.json` and have been in production use across prior phases.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Player pointer drag
        |
        v
[BoardDragLayer — DndContext]
   customCollision detects active droppable
        |
        +-- pointer over grid cell? --> [GridCell useDroppable: grid-cell-{r}-{c}-play]
        |       isOver=true, border-primary highlight
        |
        +-- drag END (intra-grid)
        |       useDndMonitor in GridZone
        |       --> sendAction: MOVE_GRID_CARD { cardId, pileId:'play', toRow, toCol }
        |       --> PartyKit: gridPositions[cardId] = {row, col}, broadcastState
        |
        +-- drag END (external card → grid)
                BoardDragLayer.handleDragEnd
                pile is spread region, not isIntraSpreadReorder
                --> sendAction: MOVE_CARD { toId:'play' }  (or PLAY_CARD_SET for multi)
                --> PartyKit: MOVE_CARD handler adds card to pile.cards[]
                              assigns gridPositions[cardId] = { row, col } from action metadata
                              broadcastState
                              
[PartyKit server GameState]
   pile.cards[] — flat array (unchanged)
   pile.gridPositions — { [cardId]: { row, col } }
        |
        v
   viewFor() — passes gridPositions through to ClientPile (spread zones, no masking)
        |
        v
[GridZone receives ClientPile with gridPositions]
   derives: cellMap = Map<"{row},{col}", Card[]>  (cards sorted by their index in pile.cards)
   renders: 2×N grid of GridCell components
   each cell: top card (DraggableCard) + Badge ×N if stack > 1
              empty cell: dashed border, bg-secondary, no text
```

### Recommended Project Structure

```
src/components/
├── GridZone.tsx         # New — replaces SpreadZone for communal 'play' pile
├── SpreadZone.tsx       # Unchanged — personal spread zones
├── BoardView.tsx        # Modified — swap SpreadZone→GridZone for communalZone
party/
└── index.ts             # Modified — MOVE_GRID_CARD handler, gridPositions on Pile
src/shared/
└── types.ts             # Modified — Pile.gridPositions, ClientPile.gridPositions, MOVE_GRID_CARD action
tests/
└── gridMove.test.ts     # New — MOVE_GRID_CARD server handler tests
```

### Pattern 1: Per-Cell useDroppable with Deterministic IDs

**What:** Each grid cell registers as a droppable using a composite ID that encodes row, column, and pile ID.

**When to use:** Any time you need 2D spatial drop targets that tile a surface.

```typescript
// Source: @dnd-kit/core useDroppable API [VERIFIED: package.json, existing codebase usage]
function GridCell({ row, col, pileId, cards, draggingCardId }: GridCellProps) {
  const cellId = `grid-cell-${row}-${col}-${pileId}`;
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { toZone: 'pile' as const, toId: pileId, toRow: row, toCol: col },
  });
  // ...
}
```

The `data` payload passes `toRow` / `toCol` through `event.over?.data.current` in `handleDragEnd` and the `useDndMonitor` `onDragEnd` callback.

### Pattern 2: useDndMonitor for Intra-Grid Detection

**What:** `GridZone` listens to the global drag context using `useDndMonitor` — the same pattern `SpreadZone` uses for intra-spread reorder detection.

```typescript
// Source: existing SpreadZone.tsx useDndMonitor pattern [VERIFIED: codebase]
useDndMonitor({
  onDragEnd(event) {
    const over = event.over;
    if (!over) return;
    const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
    const overData = over.data.current as { toZone?: string; toId?: string; toRow?: number; toCol?: number } | undefined;

    const fromGrid = activeData?.fromZone === 'pile' && activeData?.fromId === pileId;
    const toGrid = overData?.toId === pileId && overData?.toRow !== undefined;

    if (fromGrid && toGrid && activeData) {
      sendAction({
        type: 'MOVE_GRID_CARD',
        cardId: activeData.card.id,
        pileId,
        toRow: overData.toRow!,
        toCol: overData.toCol!,
      });
    }
  },
});
```

### Pattern 3: Deriving cellMap from gridPositions

**What:** The client derives a `Map<"{row},{col}", Card[]>` from the flat `pile.cards[]` and `pile.gridPositions`. Cards without a `gridPositions` entry fall back to cell `{0, 0}` (or a fallback position) — this handles the migration case where existing cards in the pile have no position yet.

```typescript
// [ASSUMED] — pattern derived from D-04 and code context; no official doc
function buildCellMap(
  cards: (Card | MaskedCard)[],
  gridPositions: Record<string, { row: number; col: number }> | undefined
): Map<string, Card[]> {
  const map = new Map<string, Card[]>();
  for (const card of cards) {
    if (!('id' in card)) continue; // masked cards can't appear in spread zone (viewFor returns full card for spread)
    const pos = gridPositions?.[card.id] ?? { row: 0, col: 0 }; // fallback: migration case
    const key = `${pos.row},${pos.col}`;
    const existing = map.get(key) ?? [];
    existing.push(card);
    map.set(key, existing);
  }
  return map;
}
```

Stack order: cards appear in the array in their `pile.cards[]` index order — the last card in each cell's array is the "top" (consistent with pile conventions throughout the codebase).

### Pattern 4: Collision Detection Extension in BoardDragLayer

**What:** The `customCollision` function currently buckets droppables into three categories. Grid cell IDs (`grid-cell-{r}-{c}-play`) do not start with `pile-` so they land in `cardContainers`. This means `closestCenter` would be used for them — but `closestCenter` can pick a cell from the wrong pile if there are other card-level items nearby.

**Recommended approach:** Extend the collision function to add a fourth bucket for grid cells:

```typescript
// [ASSUMED] — collision architecture analysis from codebase; specific bucket strategy is discretionary
const gridCellContainers = args.droppableContainers.filter(
  (c) => String(c.id).startsWith('grid-cell-')
);
// ... use pointerWithin for grid cells, same as pile zones
const gridCollisions = pointerWithin({ ...args, droppableContainers: gridCellContainers });
if (gridCollisions.length > 0) return gridCollisions;
```

`pointerWithin` is the correct strategy for grid cells (same as pile zones) because cells tile the surface — the pointer is always inside exactly one cell, so `pointerWithin` picks the right one without the distance-comparison ambiguity of `closestCenter`.

**Critical:** If grid cell IDs accidentally fall into the `pileContainers` bucket, the `isIntraPileDrag` branch would fire for intra-grid drags, triggering `closestCenter` on card-level items — which would select SpreadZone sortable cards as collision targets. The `grid-cell-*` prefix avoids this; the planner must ensure the prefix does NOT start with `pile-`.

### Pattern 5: Drag Source Cell Identification

**What:** When a drag begins from a grid cell, `GridCell` must record in the drag data that the card's `fromZone` is `'pile'` and `fromId` is the pile ID — exactly the same as `DraggableCard` does for `PileZone`. The cell also needs to know the card originated from a specific `{ row, col }` so the placeholder is shown correctly while dragging.

```typescript
// [ASSUMED] — inferred from DraggableCard.tsx and SortableSpreadCard patterns [VERIFIED: codebase]
// Inside GridCell, when the top card is draggable:
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: card.id,
  data: { card, fromZone: 'pile' as const, fromId: pileId, fromRow: row, fromCol: col },
});
```

`isDragging` drives the dashed placeholder in the source cell.

### Anti-Patterns to Avoid

- **Registering the entire grid as a single droppable:** The whole point of D-07 is per-cell targeting. A single zone droppable with manual hit-testing replicates framework work and breaks D-03.
- **Using `useSortable` instead of `useDroppable` for cells:** `useSortable` is for ordered lists with a `SortableContext`. Grid cells are spatial, not ordered list items. Using `useSortable` would require a 2D sortable strategy that doesn't exist in dnd-kit.
- **Storing `gridPositions` only on the client:** Position must live on the server (D-04) so all players see the same spatial layout.
- **Using `REORDER_PILE_SPREAD` for grid moves:** D-05 explicitly prohibits this. The sort pipeline (ordered card IDs) has no coordinate concept.
- **Forgetting to clean up `gridPositions` when a card leaves the pile:** When `MOVE_CARD` or `PLAY_CARD_SET` moves a card OUT of the `'play'` pile, the server must delete `gridPositions[cardId]`. If not, stale entries accumulate; if that card ID is ever re-added to the pile, it will snap to the old position unexpectedly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drop target registration | Custom pointer event listeners | `useDroppable` | dnd-kit handles coordinate math, accessibility, pointer/touch normalization |
| Collision detection routing | Manual bounding-box math | Extend `customCollision` in BoardDragLayer | All drag state is already managed here; splitting it creates race conditions |
| Count badge | Custom `<span>` styled badge | `<Badge>` from shadcn | Already used in PileZone; consistent styling with zero effort |
| Cell state derivation | Imperative imperative loop with refs | `buildCellMap` derived from render | Derived state is simpler and always consistent with `ClientPile` |

**Key insight:** The dnd-kit framework owns the collision detection pipeline. Any position-targeting logic must go through `useDroppable` + `customCollision` — not around it.

---

## Common Pitfalls

### Pitfall 1: `isIntraSpreadReorder` Race Condition

**What goes wrong:** `BoardDragLayer.handleDragEnd` has a guard: when `fromId === overData?.toId` on a `'pile'` zone drop, it skips `MOVE_CARD` so `SpreadZone.useDndMonitor` can fire its `REORDER_PILE_SPREAD`. For the grid, intra-grid drops must fire `MOVE_GRID_CARD` from `GridZone.useDndMonitor`, NOT `MOVE_CARD` from BoardDragLayer.

**Why it happens:** The existing `isIntraSpreadReorder` flag computes `fromIdAtEnd === overData?.toId`. For grid cell drops, `overData.toId` is `'play'` (the pile ID, passed in cell droppable data). A card dragged from within the grid will have `fromId = 'play'`, making `isIntraSpreadReorder` true — which already suppresses `MOVE_CARD`. This is the correct behavior as long as the grid's `useDndMonitor` then fires `MOVE_GRID_CARD`.

**How to avoid:** Verify that `overData.toId` in grid cell droppable data is set to the pile ID (`'play'`), not the cell ID. Then the existing `isIntraSpreadReorder` guard in BoardDragLayer already handles suppression — no new guard needed.

**Warning signs:** If `MOVE_CARD` and `MOVE_GRID_CARD` both fire for an intra-grid drop, the card will be moved twice (removed and re-added to the pile). This manifests as the card disappearing from the grid after the drag.

### Pitfall 2: `gridPositions` Not Cleaned Up on Card Exit

**What goes wrong:** When a card moves out of the `'play'` pile to a hand or another pile, the server doesn't remove `pile.gridPositions[cardId]`. The entry becomes stale. If the card later returns to the grid, the server assigns it the old coordinates — which might overlap with another card unexpectedly.

**Why it happens:** The `MOVE_CARD` handler only operates on `pile.cards[]`. The `gridPositions` map is a side channel that requires manual cleanup.

**How to avoid:** In the `MOVE_CARD` and `PLAY_CARD_SET` handlers on the server, after removing a card from a pile, check if that pile has `gridPositions` and delete the entry: `delete pile.gridPositions?.[cardId]`.

**Warning signs:** After moving a card from the grid to hand and back, it appears in a stale cell position instead of the dropped cell.

### Pitfall 3: RESET_TABLE Does Not Clear gridPositions

**What goes wrong:** `RESET_TABLE` iterates `pile.cards[]` and moves all cards to the draw pile. It does not clear `gridPositions`. After reset, the `'play'` pile is empty but `gridPositions` still has entries for all the cards that were just moved out. A future `viewFor` would send those orphaned entries to clients.

**Why it happens:** `RESET_TABLE` was written before `gridPositions` existed.

**How to avoid:** In the `RESET_TABLE` handler, after splicing cards from `pile`, also clear `pile.gridPositions = {}` if it exists on the play pile.

**Warning signs:** After `RESET_TABLE`, the grid shows empty cells but `gridPositions` in the broadcast state contains stale card IDs. These do not cause visible bugs until those specific card IDs re-enter the grid, at which point they snap to old positions.

### Pitfall 4: gridPositions Not Threaded Through viewFor / ClientPile

**What goes wrong:** `viewFor` constructs `ClientPile` objects from `Pile` objects. If `gridPositions` is not explicitly included in the `ClientPile` mapping in `viewFor`, it will be absent from the client state even though it exists on the server.

**Why it happens:** TypeScript structural typing — if `ClientPile` doesn't declare `gridPositions`, the spread or pick in `viewFor` drops it silently.

**How to avoid:** Add `gridPositions?: Record<string, { row: number; col: number }>` to `ClientPile` in `types.ts`, and add `gridPositions: pile.gridPositions` to the `viewFor` pile-mapping block.

**Warning signs:** `GridZone` receives a pile where `pile.gridPositions` is always `undefined`, so all cards default to cell `{0, 0}` and stack there.

### Pitfall 5: Collision Bucket Mismatch for Grid Cells

**What goes wrong:** Grid cell IDs (`grid-cell-*`) land in the `cardContainers` bucket in `customCollision`, which uses `closestCenter`. If multiple spread zone card-level sortable items are nearby, `closestCenter` may select a card from another spread zone as the collision winner instead of the grid cell under the pointer.

**Why it happens:** `closestCenter` picks by distance from drag center, not by pointer position. When sortable cards from other zones are geometrically close to a grid cell, they can "win" the collision check.

**How to avoid:** Add a grid-cell bucket that uses `pointerWithin` (same as pile zones), checked before the fallback pile/card buckets. The `grid-cell-*` prefix must not start with `pile-`.

**Warning signs:** Card drops "miss" the grid even when the pointer is clearly over a cell, especially when other spread zones are on screen.

### Pitfall 6: Top-Card Identification in Stacked Cells

**What goes wrong:** The "top card" of a stacked cell is the card shown and made draggable. Convention in this codebase is that the top of a pile is the LAST element of `pile.cards[]` (line 25, `PileZone.tsx`: `const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1]`). For grid cells, the top card among those in a cell should follow the same convention — the card that is last in `pile.cards[]` order among the cell's occupants.

**Why it happens:** `buildCellMap` appends cards in `pile.cards[]` iteration order. The last card added to the array is the last in the cell's sub-array, matching the pile convention.

**How to avoid:** In `buildCellMap`, preserve `pile.cards[]` iteration order. `topCard = cellCards[cellCards.length - 1]`. This is consistent with how `MOVE_CARD`/`PLAY_CARD_SET` push to the end of the array.

---

## Code Examples

### Server: Adding gridPositions to Pile type

```typescript
// src/shared/types.ts — additive change
// [VERIFIED: types.ts codebase read]
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
  region?: "pile" | "spread";
  ownerId?: string | null;
  gridPositions?: Record<string, { row: number; col: number }>; // Phase 24: play grid
}

export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
  region?: "pile" | "spread";
  ownerId?: string | null;
  gridPositions?: Record<string, { row: number; col: number }>; // Phase 24
}
```

### Server: MOVE_GRID_CARD handler skeleton

```typescript
// party/index.ts — new case in switch statement
// [ASSUMED] — pattern derived from MOVE_CARD handler structure [VERIFIED: codebase]
case "MOVE_GRID_CARD": {
  const { cardId, pileId, toRow, toCol } = action;
  const pile = this.gameState.piles.find(p => p.id === pileId && p.region === "spread");
  if (!pile) {
    sender.send(JSON.stringify({
      type: "ERROR", code: "PILE_NOT_FOUND",
      message: `No spread pile found with id: ${pileId}`,
    } satisfies ServerEvent));
    break;
  }
  const cardExists = pile.cards.some(c => c.id === cardId);
  if (!cardExists) {
    sender.send(JSON.stringify({
      type: "ERROR", code: "CARD_NOT_IN_SOURCE",
      message: `Card ${cardId} not found in pile ${pileId}`,
    } satisfies ServerEvent));
    break;
  }
  takeSnapshot(this.gameState); // enters undo stack per Claude's discretion
  if (!pile.gridPositions) pile.gridPositions = {};
  pile.gridPositions[cardId] = { row: toRow, col: toCol };
  break;
}
```

### Server: Assign gridPositions in MOVE_CARD when destination is the play grid

```typescript
// Inside MOVE_CARD case, after dest.push(card), before break:
// [ASSUMED] — derived from D-06; exact hook point is discretionary
const destPile = this.gameState.piles.find(p => p.id === toId);
if (destPile?.id === 'play' && action.toRow !== undefined && action.toCol !== undefined) {
  if (!destPile.gridPositions) destPile.gridPositions = {};
  destPile.gridPositions[cardId] = { row: action.toRow, col: action.toCol };
}
// And cleanup when leaving:
if (fromZone === 'pile') {
  const srcPile = this.gameState.piles.find(p => p.id === fromId);
  if (srcPile?.gridPositions) delete srcPile.gridPositions[cardId];
}
```

Note: This requires adding optional `toRow?` and `toCol?` fields to the `MOVE_CARD` action type in `ClientAction`.

### ClientAction type extension

```typescript
// src/shared/types.ts
// [ASSUMED] — required by D-06 design
export type ClientAction =
  // ... existing actions ...
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random'; toRow?: number; toCol?: number }
  | { type: "MOVE_GRID_CARD"; cardId: string; pileId: string; toRow: number; toCol: number }
  // ... rest ...
```

### GridZone: useDndMonitor intra-grid detection

```typescript
// src/components/GridZone.tsx
// [VERIFIED: codebase — mirrors SpreadZone.tsx useDndMonitor pattern]
useDndMonitor({
  onDragEnd(event) {
    const over = event.over;
    if (!over) return;
    const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
    const overData = over.data.current as { toId?: string; toRow?: number; toCol?: number } | undefined;
    const fromGrid = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
    const toGrid = overData?.toId === pile.id && overData?.toRow !== undefined;
    if (fromGrid && toGrid && activeData) {
      sendAction({
        type: 'MOVE_GRID_CARD',
        cardId: activeData.card.id,
        pileId: pile.id,
        toRow: overData.toRow!,
        toCol: overData.toCol!,
      });
    }
  },
});
```

### BoardDragLayer: handleDragEnd coordinate extraction for external→grid drops

```typescript
// src/components/BoardDragLayer.tsx — inside handleDragEnd, isSpread branch
// [ASSUMED] — derived from collision and D-06 analysis
if (isSpread && !isIntraSpreadReorder) {
  const overData = event.over?.data.current as { toZone?: string; toId?: string; toRow?: number; toCol?: number } | undefined;
  sendAction({
    type: 'MOVE_CARD',
    cardId: card.id,
    fromZone: fromZone as 'hand' | 'pile',
    fromId,
    toZone,
    toId,
    insertPosition: 'top',
    ...(overData?.toRow !== undefined ? { toRow: overData.toRow, toCol: overData.toCol } : {}),
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single droppable per spread zone | Per-cell droppable grid | Phase 24 | Enables spatial cell targeting for the communal play area |
| `REORDER_PILE_SPREAD` for all pile reordering | `REORDER_PILE_SPREAD` (personal) + `MOVE_GRID_CARD` (communal grid) | Phase 24 | Keeps personal spread zone sort pipeline isolated from coordinate logic |
| `SpreadZone` renders communal pile | `GridZone` renders communal pile; `SpreadZone` only for personal zones | Phase 24 | Separation of concerns — grid-specific state (cellMap, gridPositions) stays out of SpreadZone |

---

## Open Questions

1. **How does `MOVE_CARD` receive `toRow`/`toCol` from the client for external→grid drops?**
   - What we know: D-06 says existing `MOVE_CARD`/`PLAY_CARD_SET` fires; server assigns position.
   - What's unclear: The only way the server knows the target cell is if the client passes it. `MOVE_CARD` currently has no coordinate fields.
   - Recommendation: Add optional `toRow?: number; toCol?: number` to the `MOVE_CARD` action type. Client passes them when `toId === 'play'` and the drop was on a grid cell. Server reads them to populate `gridPositions`. This is additive and backward-compatible.

2. **What happens to cards in `'play'` that have no `gridPositions` entry (cards placed before Phase 24 deploys)?**
   - What we know: Migration guard in `onStart` handles prior state schema changes (see Phase 9, Phase 14 migrations). `gridPositions` is optional.
   - What's unclear: Does the grid need a migration that assigns positions to existing orphaned cards?
   - Recommendation: The `buildCellMap` fallback (row 0, col 0) handles this gracefully on the client — all orphaned cards stack at `{0,0}`. The server migration in `onStart` can initialize `gridPositions` for any `'play'` pile that has cards but no `gridPositions` by assigning them to `{row:0, col:0}` through `{row:1, col:6}` sequentially. This is a simple defensive migration.

3. **Does `PLAY_CARD_SET` (multi-card external drop) need coordinate support?**
   - What we know: D-12 says multi-card selection within the grid is out of scope. But `PLAY_CARD_SET` from external sources (hand → grid) could be a multi-card drop if `selectedIds` has > 1 card.
   - What's unclear: How do multiple external cards land in a grid — all in the same cell, or sequentially?
   - Recommendation: All cards in a multi-card external drop land in the same target cell (the one that was hovered on drop). The `PLAY_CARD_SET` handler needs the same `toRow`/`toCol` extension as `MOVE_CARD`. The planner should confirm this behavior.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code-only changes with no new external CLI tools, services, or runtimes.

The existing dev stack (`npm run dev` for PartyKit, `npm run dev:client` for Vite, `npm test` for Vitest) is sufficient.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

Tests are server-only (Vitest). Frontend components are not unit-tested (no JSDOM or React Testing Library setup found). E2E is Playwright (`npm run test:e2e`) but requires live servers.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| GRID-01 | `MOVE_GRID_CARD` updates `gridPositions` on server | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | `MOVE_GRID_CARD` rejected for non-existent card | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | `MOVE_CARD` to 'play' pile assigns `gridPositions` when toRow/toCol present | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | `MOVE_CARD` out of 'play' pile deletes `gridPositions[cardId]` | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | `RESET_TABLE` clears `gridPositions` on play pile | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | `viewFor` includes `gridPositions` in `ClientPile` output | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | No — Wave 0 |
| GRID-01 | Cell drag highlight + intra-grid drop visual | manual smoke | `npm run test:e2e` | Playwright — manual |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` all green + `npm run typecheck` before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/gridMove.test.ts` — covers all GRID-01 server behavior (6 test cases above)

*(No new test infrastructure needed — existing Vitest config, `makeMockRoom`, `makeMockConnection`, `makeCard` helpers all usable.)*

---

## Security Domain

This phase adds server state (`gridPositions`) and a new server action (`MOVE_GRID_CARD`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `MOVE_GRID_CARD` must validate that `cardId` exists in the target pile before mutating |
| V5 Input Validation | yes | `toRow` and `toCol` must be integers in valid range (0–1 for row, 0–6 for col) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Out-of-bounds cell coordinates | Tampering | Validate `toRow in [0,1]`, `toCol in [0, colMax]` server-side before writing `gridPositions` |
| Moving a card not in the pile | Tampering | Check `pile.cards.some(c => c.id === cardId)` before `takeSnapshot` and mutation |
| `gridPositions` key injection | Tampering | `cardId` values are controlled by the server deck (`${rank}-${suit[0]}`); no user-controlled string is used as a key without prior validation |

Input validation for `toRow` and `toCol`:
```typescript
// [ASSUMED] — security pattern; bounds from D-01
const MAX_ROWS = 2;
const MAX_COLS = 7; // desktop max; 4 for mobile but server doesn't need to distinguish
if (!Number.isInteger(action.toRow) || action.toRow < 0 || action.toRow >= MAX_ROWS) break; // send ERROR
if (!Number.isInteger(action.toCol) || action.toCol < 0 || action.toCol >= MAX_COLS) break; // send ERROR
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `overData.toId` set to pile ID (not cell ID) in GridCell droppable data causes `isIntraSpreadReorder` in BoardDragLayer to correctly suppress MOVE_CARD for intra-grid drags | Architecture Patterns — Pitfall 1 | If wrong, MOVE_CARD fires alongside MOVE_GRID_CARD; card appears to vanish after intra-grid drag |
| A2 | Adding `toRow?`/`toCol?` to `MOVE_CARD` ClientAction is the correct protocol for external→grid drops | Open Questions #1, Code Examples | If wrong, server has no way to know target cell on external drops; all cards land at fallback {0,0} |
| A3 | `PLAY_CARD_SET` multi-card external drop lands all cards in the same target cell | Open Questions #3 | If wrong, multi-card drops either need sequential cell assignment logic or are silently ignored |
| A4 | Stack top-card ordering follows `pile.cards[]` array order (last element = top) | Code Examples — buildCellMap | If wrong, wrong card is shown/draggable in stacked cells |
| A5 | Grid cell droppable IDs prefixed `grid-cell-` (not `pile-`) correctly routes through `pointerWithin` in extended customCollision | Architecture Patterns — Pitfall 5 | If wrong, collision routing picks wrong droppable; drops miss cells |
| A6 | `onStart` migration should assign `{row:0,col:0}` to orphaned cards in 'play' pile | Open Questions #2 | If wrong, orphaned cards all stack at {0,0} which is visible but not breaking; users can drag them apart |

---

## Sources

### Primary (HIGH confidence)
- `src/components/SpreadZone.tsx` — `useDndMonitor` pattern, `useDroppable` usage, intra-pile reorder detection [VERIFIED: codebase]
- `src/components/BoardDragLayer.tsx` — `customCollision`, `handleDragEnd`, `isIntraSpreadReorder` logic [VERIFIED: codebase]
- `src/components/PileZone.tsx` — `Badge` usage, count display, placeholder pattern [VERIFIED: codebase]
- `src/components/DraggableCard.tsx` — `useDraggable` data payload pattern [VERIFIED: codebase]
- `src/shared/types.ts` — all existing type definitions [VERIFIED: codebase]
- `party/index.ts` — full server handler logic, `RESET_TABLE`, `MOVE_CARD`, `PLAY_CARD_SET` [VERIFIED: codebase]
- `package.json` — all installed dependency versions [VERIFIED: codebase]
- `24-CONTEXT.md` — all locked decisions D-01 through D-12 [VERIFIED: codebase]
- `24-UI-SPEC.md` — visual contract, component structure, grid dimensions [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- dnd-kit `useDroppable` API behavior inferred from existing `SpreadZone.tsx` and `PileZone.tsx` usage (not fetched from Context7 — existing code is authoritative evidence)

### Tertiary (LOW confidence — marked [ASSUMED])
- Coordinate field extension of `MOVE_CARD` action (A2) — design decision, not from docs
- Multi-card external drop cell assignment (A3) — behavior not specified in CONTEXT.md

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs
- Architecture: HIGH — all patterns are extensions of verified existing code
- Server state design: HIGH — locked by CONTEXT.md decisions D-04 through D-06
- Collision routing: MEDIUM — analysis is correct but A1/A5 are assumptions about ID prefix behavior
- Pitfalls: HIGH — derived from reading the actual code paths that will be affected

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (stable project; no external dependency changes expected)
