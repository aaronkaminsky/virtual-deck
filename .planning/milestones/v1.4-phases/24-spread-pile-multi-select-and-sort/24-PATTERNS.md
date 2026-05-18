# Phase 24: Play Area Grid - Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 5 (3 new, 2 modified — types.ts and party/index.ts are also modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/GridZone.tsx` | component | request-response + event-driven | `src/components/SpreadZone.tsx` | exact |
| `src/components/BoardView.tsx` | component | request-response | `src/components/BoardView.tsx` (self — targeted swap) | self |
| `src/shared/types.ts` | model | — | `src/shared/types.ts` (self — additive fields) | self |
| `party/index.ts` | service | CRUD + event-driven | `party/index.ts` (self — new case in switch) | self |
| `tests/gridMove.test.ts` | test | — | `tests/moveCard.test.ts` | exact |

---

## Pattern Assignments

### `src/components/GridZone.tsx` (component, request-response + event-driven)

**Analog:** `src/components/SpreadZone.tsx`

**Imports pattern** (SpreadZone.tsx lines 1–9):
```typescript
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
```

GridZone additionally imports `Badge` from `@/components/ui/badge` (see PileZone.tsx line 4) and `useDraggable` from `@dnd-kit/core` (see DraggableCard.tsx line 2). Drop `SortableContext`, `useSortable`, `horizontalListSortingStrategy`, `arrayMove` from the SpreadZone import — those are for ordered lists, not a 2D grid.

**Component props pattern** (SpreadZone.tsx lines 69–79 — shape to copy):
```typescript
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  interactive?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```

GridZone drops `onToggleSelect`, `onSelectAll`, `selectionSource` (D-12: no multi-select within grid this phase). Keep `pile`, `sendAction`, `draggingCardId`, `interactive`.

**useDroppable per-cell pattern** — new in GridZone, sourced from SpreadZone.tsx lines 82–85 as the structural template:
```typescript
// SpreadZone registers ONE droppable for the whole zone:
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,
  data: { toZone: 'pile' as const, toId: pile.id },
});
```

GridZone registers ONE droppable per cell inside a sub-component `GridCell`. The cell ID format is `grid-cell-{row}-{col}-{pileId}` and the data payload must carry `toRow` and `toCol`:
```typescript
// GridCell component — each cell registers independently
const cellId = `grid-cell-${row}-${col}-${pileId}`;
const { setNodeRef, isOver } = useDroppable({
  id: cellId,
  data: { toZone: 'pile' as const, toId: pileId, toRow: row, toCol: col },
});
```

Note: `toId` is the pile ID (`'play'`), not the cell ID. This is what makes `isIntraSpreadReorder` in BoardDragLayer correctly suppress `MOVE_CARD` for intra-grid drags (see BoardDragLayer.tsx line 196).

**useDndMonitor intra-grid detection pattern** (SpreadZone.tsx lines 91–142 — copy structure, replace body):
```typescript
// SpreadZone pattern to copy the structure from:
useDndMonitor({
  onDragEnd(event) {
    const over = event.over;
    if (!over) return;
    const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
    const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

    const fromThisPile = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
    const toThisPile = ...;

    if (fromThisPile && toThisPile && activeData) {
      sendAction({ type: 'REORDER_PILE_SPREAD', ... });
    }
  },
});
```

GridZone replaces the condition and action with grid-specific logic:
```typescript
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

**Top-card + draggable pattern in GridCell** (DraggableCard.tsx lines 15–19 — copy useDraggable call):
```typescript
// DraggableCard registers the drag source:
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: card.id,
  data: { card, fromZone, fromId },
});
```

GridCell extends the data payload to include grid coordinates:
```typescript
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: card.id,
  data: { card, fromZone: 'pile' as const, fromId: pileId, fromRow: row, fromCol: col },
});
```

**isDragging placeholder pattern** (SpreadZone.tsx lines 45–47, PileZone.tsx lines 76–78):
```typescript
// SpreadZone — dashed placeholder while card is being dragged:
{draggingCardId === card.id && (
  <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
)}

// PileZone equivalent:
{isDraggingTopCard && (
  <div className="absolute inset-0 rounded-lg border-2 border-dashed border-muted-foreground" />
)}
```

GridCell uses `isDragging` (from `useDraggable`) OR `draggingCardId === topCard?.id` to show the dashed cell outline when the top card is in flight.

**Count badge pattern** (PileZone.tsx line 80 — copy exactly):
```typescript
<Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
```

GridCell uses the same Badge for stacked cells:
```typescript
{cellCards.length > 1 && (
  <Badge className="absolute -bottom-2 -right-2">{cellCards.length}</Badge>
)}
```

**isOver border highlight pattern** (SpreadZone.tsx lines 169–172, PileZone.tsx lines 55–58):
```typescript
// Both zones use the same conditional border class:
isOver ? 'border-primary' : 'border-border'
```

Each GridCell applies this same pattern to its cell div using its own `isOver` from `useDroppable`.

**Empty cell / dashed border pattern** (SpreadZone.tsx line 169, PileZone.tsx line 55):
```typescript
isEmpty ? 'border-dashed' : '',
```

Empty grid cells show `border-dashed bg-secondary` with no content (per D-09, no label needed — cells tile the full surface).

**Face toggle button** (SpreadZone.tsx lines 213–221 — copy for GridZone toolbar):
```typescript
<Button
  variant="ghost"
  className="h-7 w-7 p-0"
  onClick={handleToggleFace}
  title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
  aria-label={pile.faceUp !== false ? 'Cards land face-up' : 'Cards land face-down'}
>
  {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</Button>
```

**Card sizing classes** (SpreadZone.tsx line 169):
```typescript
'min-w-[56px] h-[79px] sm:min-w-[80px] sm:h-[112px]'
```

GridCell uses the same card dimensions. The grid container uses `grid-cols-4 sm:grid-cols-7` (D-01).

---

### `src/components/BoardView.tsx` (component — targeted swap at lines 77–91)

**Analog:** `src/components/BoardView.tsx` (self-modification)

**Integration point** (BoardView.tsx lines 77–91 — replace `<SpreadZone>` with `<GridZone>` for communal pile only):
```typescript
// BEFORE — lines 77–91:
{communalZone && (
  <div className="flex-1 min-w-0">
    <SpreadZone
      pile={communalZone}
      sendAction={sendAction}
      draggingCardId={draggingCardId}
      className="w-full"
      interactive={true}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      selectionSource={selectionSource}
    />
  </div>
)}

// AFTER — swap SpreadZone → GridZone, drop multi-select props (D-12 out of scope):
{communalZone && (
  <div className="flex-1 min-w-0">
    <GridZone
      pile={communalZone}
      sendAction={sendAction}
      draggingCardId={draggingCardId}
      interactive={true}
    />
  </div>
)}
```

Add `import { GridZone } from './GridZone';` to the import block (BoardView.tsx lines 1–7). The `SpreadZone` import stays for opponent spread and personal spread zones.

---

### `src/shared/types.ts` (model — additive field additions)

**Analog:** `src/shared/types.ts` (self-modification)

**Pile interface** (types.ts lines 18–25 — add `gridPositions` after `ownerId`):
```typescript
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
  region?: "pile" | "spread";
  ownerId?: string | null;
  gridPositions?: Record<string, { row: number; col: number }>; // Phase 24: play grid
}
```

**ClientPile interface** (types.ts lines 29–36 — add `gridPositions` after `ownerId`):
```typescript
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

**ClientAction union** (types.ts lines 61–74 — extend MOVE_CARD and add MOVE_GRID_CARD):
```typescript
// Extend existing MOVE_CARD to carry optional grid coordinates:
| { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random'; toRow?: number; toCol?: number }

// Add new action after PLAY_CARD_SET line:
| { type: "MOVE_GRID_CARD"; cardId: string; pileId: string; toRow: number; toCol: number }
```

---

### `party/index.ts` (service — new switch case + three handler amendments)

**Analog:** `party/index.ts` (self-modification at several points)

**takeSnapshot pattern** (party/index.ts line 55–62 — copy call site verbatim):
```typescript
takeSnapshot(this.gameState);
```

**Error response pattern** (party/index.ts lines 240–246, 263–271 — copy structure):
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "PILE_NOT_FOUND",
  message: `No spread pile found with id: ${pileId}`,
} satisfies ServerEvent));
break;
```

**REORDER_PILE_SPREAD as template for MOVE_GRID_CARD** (party/index.ts lines 341–365 — copy guard structure):
```typescript
case "REORDER_PILE_SPREAD": {
  const spreadPile = this.gameState.piles.find(p => p.id === action.pileId && p.region === "spread");
  if (!spreadPile) {
    sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", ... } satisfies ServerEvent));
    break;
  }
  // validation...
  takeSnapshot(this.gameState);
  // mutation...
  break;
}
```

MOVE_GRID_CARD follows the same structure. New case to add after the `REORDER_PILE_SPREAD` case:
```typescript
case "MOVE_GRID_CARD": {
  const { cardId, pileId, toRow, toCol } = action;
  // Bounds validation (V5 Input Validation — RESEARCH.md Security Domain):
  const MAX_ROWS = 2;
  const MAX_COLS = 7;
  if (!Number.isInteger(toRow) || toRow < 0 || toRow >= MAX_ROWS) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_POSITION", message: `toRow out of range` } satisfies ServerEvent));
    break;
  }
  if (!Number.isInteger(toCol) || toCol < 0 || toCol >= MAX_COLS) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_POSITION", message: `toCol out of range` } satisfies ServerEvent));
    break;
  }
  const pile = this.gameState.piles.find(p => p.id === pileId && p.region === "spread");
  if (!pile) {
    sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", message: `No spread pile found with id: ${pileId}` } satisfies ServerEvent));
    break;
  }
  const cardExists = pile.cards.some(c => c.id === cardId);
  if (!cardExists) {
    sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: `Card ${cardId} not found in pile ${pileId}` } satisfies ServerEvent));
    break;
  }
  takeSnapshot(this.gameState);
  if (!pile.gridPositions) pile.gridPositions = {};
  pile.gridPositions[cardId] = { row: toRow, col: toCol };
  break;
}
```

**MOVE_CARD amendments** (party/index.ts lines 283–317 — after `takeSnapshot`, before `break`):

After `dest.push(card)` (line 316), add gridPositions assignment for external→grid drops:
```typescript
// Assign grid position when card enters the play grid (D-06)
if (toZone === 'pile') {
  const destPile = this.gameState.piles.find(p => p.id === toId);
  if (destPile?.id === 'play' && action.toRow !== undefined && action.toCol !== undefined) {
    if (!destPile.gridPositions) destPile.gridPositions = {};
    destPile.gridPositions[cardId] = { row: action.toRow, col: action.toCol };
  }
}
// Clean up gridPositions when card leaves the play grid (Pitfall 2)
if (fromZone === 'pile') {
  const srcPile = this.gameState.piles.find(p => p.id === fromId);
  if (srcPile?.gridPositions) delete srcPile.gridPositions[cardId];
}
```

**PLAY_CARD_SET amendment** (party/index.ts line 553+ — same cleanup pattern as MOVE_CARD):

After cards are spliced from source and pushed to dest, apply identical gridPositions assignment/cleanup as in MOVE_CARD above. All cards in a multi-card drop land in the same target cell (passed via `toRow`/`toCol` on the action — extend `PLAY_CARD_SET` ClientAction type similarly).

**RESET_TABLE amendment** (party/index.ts lines 527–529 — inside the `for (const pile of this.gameState.piles)` loop):
```typescript
// BEFORE (lines 527–530):
for (const pile of this.gameState.piles) {
  if (pile.id !== "draw") {
    resetDrawPile.cards.push(...pile.cards.splice(0));
  }
}

// AFTER — also clear gridPositions:
for (const pile of this.gameState.piles) {
  if (pile.id !== "draw") {
    resetDrawPile.cards.push(...pile.cards.splice(0));
    if (pile.gridPositions) pile.gridPositions = {};  // Pitfall 3: RESET_TABLE must clear gridPositions
  }
}
```

**viewFor amendment** (party/index.ts lines 86–97 — add `gridPositions` to the pile mapping):
```typescript
// BEFORE (lines 86–97):
piles: state.piles.map(pile => ({
  id: pile.id,
  name: pile.name,
  faceUp: pile.faceUp,
  region: pile.region,
  ownerId: pile.ownerId,
  cards: pile.cards.map(...),
})) satisfies ClientPile[],

// AFTER — add gridPositions field:
piles: state.piles.map(pile => ({
  id: pile.id,
  name: pile.name,
  faceUp: pile.faceUp,
  region: pile.region,
  ownerId: pile.ownerId,
  gridPositions: pile.gridPositions,  // Phase 24: Pitfall 4 — must be explicit
  cards: pile.cards.map(...),
})) satisfies ClientPile[],
```

**onStart migration** (party/index.ts lines 118–168 — append after the Phase 22 migration block):
```typescript
// Migrate state: Phase 24 — initialize gridPositions for orphaned cards in 'play' pile
const playPileForMigration = this.gameState.piles.find(p => p.id === 'play');
if (playPileForMigration && playPileForMigration.cards.length > 0 && !playPileForMigration.gridPositions) {
  playPileForMigration.gridPositions = {};
  playPileForMigration.cards.forEach((card, i) => {
    const row = Math.floor(i / 7) % 2;
    const col = i % 7;
    playPileForMigration.gridPositions![card.id] = { row, col };
  });
}
```

---

### `tests/gridMove.test.ts` (test — server unit tests)

**Analog:** `tests/moveCard.test.ts`

**Test file structure** (moveCard.test.ts lines 1–51 — copy boilerplate exactly):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}

function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}
```

Alternatively, import the shared helpers from `tests/helpers.ts` (which exports `makeMockRoom`, `makeMockConnection`, `makeCard`) — check whether any recent test file uses helpers.ts imports. `moveCard.test.ts` defines them inline; `viewFor.test.ts` also defines them inline. Either pattern is acceptable.

**beforeEach setup pattern** (moveCard.test.ts lines 45–51, resetTable.test.ts lines 40–51):
```typescript
describe("MOVE_GRID_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
  });
  // ...
});
```

**State mutation test pattern** (moveCard.test.ts lines 53–70 — copy assertion style):
```typescript
it("moves card from player hand to named pile", async () => {
  // setup
  room.gameState = ...;
  // act
  await room.onMessage(JSON.stringify({ type: "MOVE_CARD", ... }), sender);
  // assert
  expect(room.gameState.hands["player-1"]).toHaveLength(0);
  expect(discardPile.cards).toHaveLength(1);
});
```

For gridMove tests, the assertions check `pile.gridPositions[cardId]` rather than array membership:
```typescript
it("MOVE_GRID_CARD updates gridPositions on the target pile", async () => {
  const playPile = room.gameState.piles.find(p => p.id === "play")!;
  playPile.region = "spread";
  playPile.cards.push(makeCard("A-s"));
  playPile.gridPositions = { "A-s": { row: 0, col: 0 } };

  await room.onMessage(JSON.stringify({
    type: "MOVE_GRID_CARD",
    cardId: "A-s",
    pileId: "play",
    toRow: 1,
    toCol: 3,
  }), sender);

  expect(playPile.gridPositions["A-s"]).toEqual({ row: 1, col: 3 });
});
```

**viewFor test pattern** (viewFor.test.ts lines 1–29 — copy state construction):
```typescript
import { describe, it, expect } from "vitest";
import { viewFor } from "../party/index";
import type { GameState, Card } from "../src/shared/types";
// ...
it("viewFor includes gridPositions in ClientPile output", () => {
  const state = makeTestState(); // with play pile having gridPositions
  const view = viewFor(state, "player-1");
  const playPile = view.piles.find(p => p.id === "play")!;
  expect(playPile.gridPositions).toBeDefined();
  expect(playPile.gridPositions!["A-s"]).toEqual({ row: 1, col: 3 });
});
```

---

## Shared Patterns

### useDroppable Registration
**Source:** `src/components/SpreadZone.tsx` lines 82–85 and `src/components/PileZone.tsx` lines 19–22
**Apply to:** GridZone.tsx — each GridCell sub-component
```typescript
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,                           // SpreadZone/PileZone: zone-level
  data: { toZone: 'pile' as const, toId: pile.id },
});
// GridCell: replace id and add toRow/toCol in data (see Pattern Assignments above)
```

### isOver Border Highlight
**Source:** `src/components/SpreadZone.tsx` line 172, `src/components/PileZone.tsx` line 57
**Apply to:** GridZone.tsx GridCell div
```typescript
isOver ? 'border-primary' : 'border-border'
```

### Count Badge
**Source:** `src/components/PileZone.tsx` line 80
**Apply to:** GridZone.tsx GridCell (stacked cells only)
```typescript
<Badge className="absolute -bottom-2 -right-2">{count}</Badge>
```

### Top-of-Stack Convention
**Source:** `src/components/PileZone.tsx` line 25 (comment: "top of stack = last element")
**Apply to:** `GridZone.tsx` `buildCellMap` — the last card in `pile.cards[]` order among a cell's occupants is the draggable top card
```typescript
const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1]; // PileZone.tsx line 25
// GridCell: topCard = cellCards[cellCards.length - 1]
```

### Error Response
**Source:** `party/index.ts` lines 240–246
**Apply to:** `MOVE_GRID_CARD` handler, all guard branches
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "PILE_NOT_FOUND",
  message: `No spread pile found with id: ${pileId}`,
} satisfies ServerEvent));
break;
```

### takeSnapshot
**Source:** `party/index.ts` line 283 (inside MOVE_CARD)
**Apply to:** `MOVE_GRID_CARD` handler — call before any mutation
```typescript
takeSnapshot(this.gameState);
```

### broadcastState
**Source:** `party/index.ts` line 683 (called at end of `onMessage` after the switch)
**Apply to:** No change needed — `broadcastState()` is called unconditionally at the end of the existing `onMessage` switch. MOVE_GRID_CARD inherits this automatically.

### customCollision Extension
**Source:** `src/components/BoardDragLayer.tsx` lines 11–55
**Apply to:** `BoardDragLayer.tsx` — add a grid-cell bucket before the pile bucket
```typescript
// EXISTING buckets (lines 12–20):
const zoneContainers = args.droppableContainers.filter(c => String(c.id) === 'hand' || String(c.id).startsWith('opponent-hand-'));
const pileContainers = args.droppableContainers.filter(c => String(c.id).startsWith('pile-'));
const cardContainers = args.droppableContainers.filter(c => !... && !... && !...);

// NEW bucket to add (grid-cell-* must NOT start with 'pile-' — Pitfall 5):
const gridCellContainers = args.droppableContainers.filter(c => String(c.id).startsWith('grid-cell-'));
// Rebuild cardContainers to exclude grid cells
const cardContainers = args.droppableContainers.filter(c => !zone && !pile && !gridCell);

// In the resolution block, after pileCollisions check and before return []:
const gridCollisions = pointerWithin({ ...args, droppableContainers: gridCellContainers });
if (gridCollisions.length > 0) return gridCollisions;
```

`pointerWithin` is the correct strategy for grid cells — cells tile the surface so the pointer is always inside exactly one cell.

### handleDragEnd — isSpread Branch Extension
**Source:** `src/components/BoardDragLayer.tsx` lines 270–286
**Apply to:** `BoardDragLayer.tsx` — pass `toRow`/`toCol` through to `MOVE_CARD` when target is the play grid
```typescript
// Inside the isSpread && !isIntraSpreadReorder branch (lines 275–284):
if (!isIntraSpreadReorder) {
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

## No Analog Found

All files in this phase have close analogs. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`
**Files scanned:** 10 (SpreadZone.tsx, PileZone.tsx, BoardDragLayer.tsx, DraggableCard.tsx, BoardView.tsx, types.ts, party/index.ts, moveCard.test.ts, resetTable.test.ts, viewFor.test.ts)
**Pattern extraction date:** 2026-05-17
