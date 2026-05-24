# Phase 32: Canvas Core - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 7 (2 new, 5 modified)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/types.ts` | model | CRUD | `src/shared/types.ts` (self) | exact — additive extension |
| `src/components/CanvasZone.tsx` | component | request-response | `src/components/PileZone.tsx` | role-match (droppable zone with card render) |
| `src/components/CanvasDraggableCard.tsx` | component | request-response | `src/components/DraggableCard.tsx` | exact (useDraggable, drag data pattern, isDragging style) |
| `src/components/BoardView.tsx` | component | request-response | `src/components/BoardView.tsx` (self) | exact — additive modification |
| `src/components/BoardDragLayer.tsx` | component | event-driven | `src/components/BoardDragLayer.tsx` (self) | exact — additive modification |
| `party/index.ts` | service | CRUD | `party/index.ts` (self) | exact — additive modification |
| `tests/canvasCards.test.ts` | test | CRUD | `tests/moveCard.test.ts` | exact (makeMockRoom + makeMockConnection + direct gameState) |

---

## Pattern Assignments

### `src/shared/types.ts` (model, additive extension)

**Analog:** `src/shared/types.ts` lines 38–81 (current `GameState`, `ClientGameState`, `ClientAction`)

**Existing GameState shape** (lines 38–45):
```typescript
export interface GameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;
  piles: Pile[];
  undoSnapshots: GameState[];
}
```

**Add these types — insert after the `ClientPile` block (after line 36):**
```typescript
export interface CanvasCard {
  card: Card;
  x: number;
  y: number;
  z: number;
}

// ClientCanvasCard is identical in phase 32 — no masking on canvas
export type ClientCanvasCard = CanvasCard;
```

**Extend GameState** — add `canvasCards: CanvasCard[]` as a new field:
```typescript
export interface GameState {
  // ... existing fields unchanged ...
  canvasCards: CanvasCard[];
}
```

**Extend ClientGameState** — add `canvasCards: ClientCanvasCard[]` after `myPlayZoneId`:
```typescript
export interface ClientGameState {
  // ... existing fields unchanged ...
  canvasCards: ClientCanvasCard[];
}
```

**Extend ClientAction** — two changes on the `MOVE_CARD` line (line 62) and add new action:
```typescript
export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  // ... all existing action variants unchanged ...
  | { type: "PLACE_ON_CANVAS"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; x: number; y: number };
```

---

### `src/components/CanvasDraggableCard.tsx` (component, request-response)

**Analog:** `src/components/DraggableCard.tsx` (lines 1–52)

**Imports pattern** (from `DraggableCard.tsx` lines 1–7):
```typescript
import { useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
```
For `CanvasDraggableCard`, import `ClientCanvasCard` instead of plain `Card`, drop `CSS` (not needed when `isDragging`), and keep `CardFace`/`CardBack`.

**Core useDraggable pattern** (`DraggableCard.tsx` lines 18–21):
```typescript
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: card.id,
  data: { card, fromZone, fromId },
});
```
For canvas: `fromZone: 'canvas' as const`, `fromId: canvasCard.card.id`.

**isDragging opacity + transform style** (`DraggableCard.tsx` lines 41–45) — copy exactly; canvas variant additionally sets `position: absolute`, `left`, `top`, `zIndex`:
```typescript
const style: React.CSSProperties = {
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  opacity: isDragging ? 0 : 1,
  touchAction: 'none',
};
```
Canvas variant extends this:
```typescript
const style: React.CSSProperties = {
  position: 'absolute',
  left: canvasCard.x,
  top: canvasCard.y,
  zIndex: canvasCard.z,
  opacity: isDragging ? 0 : 1,
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
};
```

**Click-vs-drag guard** (`DraggableCard.tsx` lines 23–31) — copy `didDragRef` pattern as-is for canvas card click handling (future-proof for flip):
```typescript
const didDragRef = useRef(false);
const prevIsDragging = useRef(false);
useEffect(() => {
  if (prevIsDragging.current && !isDragging) {
    setTimeout(() => { didDragRef.current = false; }, 300);
  }
  if (isDragging) didDragRef.current = true;
  prevIsDragging.current = isDragging;
}, [isDragging]);
```

**JSX pattern** (`DraggableCard.tsx` lines 48–50):
```typescript
<div ref={setNodeRef} style={style} {...listeners} {...attributes}>
  {card.faceUp ? <CardFace card={card} /> : <CardBack />}
</div>
```
Canvas cards are always face-up (D-07 sets `faceUp = true` on server), but keep the ternary for safety.

---

### `src/components/CanvasZone.tsx` (component, request-response)

**Analog:** `src/components/PileZone.tsx` (lines 1–120) for the `useDroppable` droppable zone pattern

**Imports pattern** (`PileZone.tsx` lines 1–8):
```typescript
import { useDroppable } from '@dnd-kit/core';
import type { ClientCanvasCard, ClientAction } from '@/shared/types';
import { CanvasDraggableCard } from './CanvasDraggableCard';
```

**useDroppable pattern** (`PileZone.tsx` lines 20–23):
```typescript
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,
  data: { toZone: 'pile' as const, toId: pile.id },
});
```
Canvas variant — no `data` needed (canvas drop is handled in `BoardDragLayer` by checking `event.over?.id === 'canvas'`, not by `overData.toZone`):
```typescript
const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
```

**Dual-ref pattern** — `CanvasZone` must expose both the dnd-kit droppable ref and a `canvasRef` for bounds measurement. Pattern from RESEARCH.md:
```typescript
ref={(node) => {
  setNodeRef(node);
  // @ts-expect-error: canvasRef is a mutable RefObject
  canvasRef.current = node;
}}
```

**isOver ring style** (`PileZone.tsx` lines 91–94) — copy the `isOver` conditional class pattern:
```typescript
className={`relative flex-1 min-w-0 self-stretch bg-background ${isOver ? 'ring-1 ring-primary/30' : ''}`}
```

---

### `src/components/BoardView.tsx` (component, additive modification)

**Analog:** `src/components/BoardView.tsx` (self, lines 84–91)

**canvas-shell div to replace** (line 90):
```typescript
<div className="flex-1 min-w-0 overflow-hidden bg-background self-stretch" data-testid="canvas-shell" />
```

**Replace with `CanvasZone`** — follow the exact same prop-threading pattern used for `PileZone` and `SpreadZone`:
```typescript
import { CanvasZone } from './CanvasZone';
// In render (replacing line 90):
<CanvasZone
  canvasCards={gameState.canvasCards}
  draggingCardId={draggingCardId}
  canvasRef={canvasRef}
/>
```
`canvasRef` is a `React.RefObject<HTMLDivElement>` created in `BoardDragLayer` and threaded down through `BoardView` props — follow the same pattern as `draggingCardId` prop threading (lines 11–17 of `BoardView.tsx`).

---

### `src/components/BoardDragLayer.tsx` (component, event-driven — additive modification)

**Analog:** `src/components/BoardDragLayer.tsx` (self)

**customCollision canvas fallback** — insert BEFORE the final `return []` (line 54):
```typescript
// Current final line of customCollision:
return [];
```
Replace with (RESEARCH.md Pattern 2):
```typescript
const canvasContainers = args.droppableContainers.filter(
  (c) => String(c.id) === 'canvas'
);
const canvasCollisions = pointerWithin({ ...args, droppableContainers: canvasContainers });
if (canvasCollisions.length > 0) return canvasCollisions;
return [];
```

**PendingMove type extension** (line 69–75) — extend `fromZone`:
```typescript
type PendingMove = {
  card: Card;
  fromZone: 'hand' | 'pile' | 'canvas';  // extend union
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};
```

**handleDragEnd canvas branch** — insert BEFORE the `isHandReorder`/`isHandMissed` checks (before line 241), following the `isPassCard` branch pattern (lines 248–255):
```typescript
// Canvas drop: compute clamped position and dispatch PLACE_ON_CANVAS
if (event.over?.id === 'canvas' && dragDataRef.current) {
  const { card, fromZone, fromId } = dragDataRef.current;
  const canvasBounds = canvasRef.current?.getBoundingClientRect();
  const canvasW = canvasBounds?.width ?? 0;
  const canvasH = canvasBounds?.height ?? 0;
  const CARD_W = window.innerWidth >= 640 ? 63 : 42;
  const CARD_H = window.innerWidth >= 640 ? 88 : 59;

  const baseX = fromZone === 'canvas'
    ? (gameState.canvasCards.find(c => c.card.id === card.id)?.x ?? 0)
    : (event.activatorEvent as PointerEvent).clientX + event.delta.x - (canvasBounds?.left ?? 0) - CARD_W / 2;
  const baseY = fromZone === 'canvas'
    ? (gameState.canvasCards.find(c => c.card.id === card.id)?.y ?? 0)
    : (event.activatorEvent as PointerEvent).clientY + event.delta.y - (canvasBounds?.top ?? 0) - CARD_H / 2;

  const newX = fromZone === 'canvas'
    ? Math.max(0, Math.min(baseX + event.delta.x, canvasW - CARD_W))
    : Math.max(0, Math.min(baseX, canvasW - CARD_W));
  const newY = fromZone === 'canvas'
    ? Math.max(0, Math.min(baseY + event.delta.y, canvasH - CARD_H))
    : Math.max(0, Math.min(baseY, canvasH - CARD_H));

  setActiveCard(null);
  setDragging(false);
  sendAction({ type: 'PLACE_ON_CANVAS', cardId: card.id, fromZone: fromZone as 'hand' | 'pile' | 'canvas', fromId, x: newX, y: newY });
  dragDataRef.current = null;
  return;
}
```

**Canvas→pile dialog path** — in the `setPendingMove` call (line 303), extend the cast:
```typescript
// Before:
setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId });
// After:
setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile' | 'canvas', fromId, toZone, toId });
```

**sendPendingMove dispatch** (line 165–174) — extend the `fromZone` cast on the `MOVE_CARD` send:
```typescript
sendAction({
  type: 'MOVE_CARD',
  cardId: pendingMove.card.id,
  fromZone: pendingMove.fromZone,  // now 'hand' | 'pile' | 'canvas' — no cast needed if PendingMove type is updated
  fromId: pendingMove.fromId,
  toZone: pendingMove.toZone,
  toId: pendingMove.toId,
  insertPosition,
});
```

**DragOverlay dropAnimation** (line 356) — canvas drops use `dropAnimation={null}` (no snap-back animation). The existing `dropSuccessRef.current` controls this already; canvas drops must set `dropSuccessRef.current = true` before the early return:
```typescript
dropSuccessRef.current = true;  // add before setActiveCard(null) in the canvas branch
```

---

### `party/index.ts` (service, CRUD — additive modification)

**Analog:** `party/index.ts` (self)

**defaultGameState extension** (lines 40–52) — add `canvasCards: []`:
```typescript
export function defaultGameState(roomId: string): GameState {
  return {
    // ... existing fields unchanged ...
    canvasCards: [],
  };
}
```

**onStart migration guard** (lines 115–144) — copy the existing migration pattern exactly:
```typescript
// After existing migrations (after line 143):
if (!Array.isArray((this.gameState as any).canvasCards)) {
  (this.gameState as unknown as GameState).canvasCards = [];
}
```

**viewFor canvas broadcast** (lines 63–98) — add `canvasCards` alongside `piles` mapping (after line 94):
```typescript
canvasCards: state.canvasCards.map(cc => ({ card: cc.card, x: cc.x, y: cc.y, z: cc.z })),
```

**MOVE_CARD handler — add canvas source** (lines 208–289) — after the `fromZone === "hand"` auth guard (line 211), add a canvas source resolver. Follow the same pattern as the hand/pile source resolution (lines 229–243):
```typescript
// In the MOVE_CARD source resolution block, add canvas branch:
const source: Card[] | undefined =
  fromZone === "hand"
    ? this.gameState.hands[fromId]
    : fromZone === "canvas"
    ? undefined  // canvas uses separate lookup below
    : this.gameState.piles.find(p => p.id === fromId)?.cards;
```
For canvas source, splice from `canvasCards` before the `dest` resolution — mirror the pile splice pattern (line 256):
```typescript
// Canvas-from handling (inside MOVE_CARD, after source lookup):
if (fromZone === "canvas") {
  const canvasIdx = this.gameState.canvasCards.findIndex(c => c.card.id === cardId);
  if (canvasIdx === -1) {
    sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: `Card ${cardId} not found on canvas` } satisfies ServerEvent));
    break;
  }
  takeSnapshot(this.gameState);
  const [removed] = this.gameState.canvasCards.splice(canvasIdx, 1);
  // proceed with removed.card as `card` for dest insertion
}
```

**PLACE_ON_CANVAS handler** — add new `case` in the `switch (action.type)` block after `RESET_TABLE`. Follow the pre-validate-then-snapshot pattern from `MOVE_CARD` (lines 211–255):
```typescript
case "PLACE_ON_CANVAS": {
  const { cardId, fromZone, fromId, x, y } = action;

  // V5: coordinate validation
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_COORDINATES", message: "x and y must be finite numbers" } satisfies ServerEvent));
    break;
  }

  // V4: hand source auth guard — mirrors MOVE_CARD pattern (line 211)
  if (fromZone === "hand" && fromId !== senderToken) {
    sender.send(JSON.stringify({ type: "ERROR", code: "UNAUTHORIZED_MOVE", message: "Cannot move another player's cards" } satisfies ServerEvent));
    break;
  }

  // Find and remove card from source (pre-validate before takeSnapshot)
  let card: Card | undefined;
  if (fromZone === "hand") {
    const hand = this.gameState.hands[fromId];
    const idx = hand?.findIndex(c => c.id === cardId) ?? -1;
    if (idx === -1) { sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: `Card ${cardId} not found in hand` } satisfies ServerEvent)); break; }
    takeSnapshot(this.gameState);
    [card] = hand.splice(idx, 1);
  } else if (fromZone === "pile") {
    const pile = this.gameState.piles.find(p => p.id === fromId);
    const idx = pile?.cards.findIndex(c => c.id === cardId) ?? -1;
    if (idx === -1) { sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: `Card ${cardId} not found in pile` } satisfies ServerEvent)); break; }
    takeSnapshot(this.gameState);
    [card] = pile!.cards.splice(idx, 1);
  } else {
    const idx = this.gameState.canvasCards.findIndex(c => c.card.id === cardId);
    if (idx === -1) { sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: `Card ${cardId} not found on canvas` } satisfies ServerEvent)); break; }
    takeSnapshot(this.gameState);
    const [removed] = this.gameState.canvasCards.splice(idx, 1);
    card = removed.card;
  }

  card!.faceUp = true;
  const maxZ = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  this.gameState.canvasCards.push({ card: card!, x, y, z: maxZ + 1 });
  break;
}
```

**RESET_TABLE canvas sweep** (lines 487–513) — add after the existing pile sweep (after line 502), before the `resetDrawPile.faceUp = false` line:
```typescript
// After the pile loop (line 501-503), before faceUp reset:
for (const canvasCard of this.gameState.canvasCards) {
  canvasCard.card.faceUp = false;
  resetDrawPile.cards.push(canvasCard.card);
}
this.gameState.canvasCards = [];
```

---

### `tests/canvasCards.test.ts` (test, CRUD)

**Analog:** `tests/moveCard.test.ts` (lines 1–292) — exact match

**Test file scaffold** — copy the full header from `moveCard.test.ts` lines 1–41:
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

**Error assertion pattern** (`moveCard.test.ts` lines 129–133) — copy for all CARD_NOT_IN_SOURCE / INVALID_COORDINATES tests:
```typescript
const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
expect(errors).toHaveLength(1);
expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_IN_SOURCE");
```

**Direct state manipulation pattern** (`moveCard.test.ts` lines 55–56) — set `room.gameState` directly before calling `room.onMessage`:
```typescript
room.gameState = defaultGameState("test-room");
room.gameState.canvasCards = [{ card: makeCard("A-s"), x: 100, y: 50, z: 1 }];
```

**viewFor assertion pattern** (`moveCard.test.ts` lines 272–290) — use `viewFor(room.gameState, playerId)` to assert broadcast shape:
```typescript
const view = viewFor(room.gameState, "player-1");
expect(view.canvasCards).toHaveLength(1);
expect(view.canvasCards[0].card.id).toBe("A-s");
```

---

## Shared Patterns

### Error Send Pattern
**Source:** `party/index.ts` lines 234–239 (used in every handler)
**Apply to:** `PLACE_ON_CANVAS` handler, `MOVE_CARD` canvas branch
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "CARD_NOT_IN_SOURCE",
  message: `Card ${cardId} not found in source`,
} satisfies ServerEvent));
break;
```

### takeSnapshot Placement
**Source:** `party/index.ts` line 255
**Apply to:** `PLACE_ON_CANVAS` and `MOVE_CARD` canvas branch
Rule: `takeSnapshot` goes AFTER all pre-validation (card found, auth passed), BEFORE first mutation. This is the invariant across all handlers.
```typescript
takeSnapshot(this.gameState);
const [card] = source.splice(idx, 1);
```

### dragDataRef Pattern
**Source:** `src/components/BoardDragLayer.tsx` lines 82, 183–186
**Apply to:** `handleDragEnd` canvas branch
`dragDataRef.current` carries `{ card, fromZone, fromId }` set in `handleDragStart`. Canvas branch reads this exactly like the `isPassCard` branch (line 250–255). Always null-check before destructuring; always set to `null` before early-returning.

### isOver Ring Style
**Source:** `src/components/PileZone.tsx` lines 91–94
**Apply to:** `CanvasZone.tsx` container div
```typescript
isOver ? 'ring-1 ring-primary/30' : ''
```

### MeasuringStrategy.Always
**Source:** `src/components/BoardDragLayer.tsx` line 352
**Apply to:** Already set on the shared `DndContext` — no per-file action needed. Verify it is not removed during the `BoardDragLayer` modification.

---

## No Analog Found

None. All 7 files have close analogs in the existing codebase.

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`
**Files scanned:** 9 (types.ts, BoardDragLayer.tsx, BoardView.tsx, DraggableCard.tsx, PileZone.tsx, CardOverlay.tsx, party/index.ts, tests/moveCard.test.ts, spike 001 README)
**Pattern extraction date:** 2026-05-24
