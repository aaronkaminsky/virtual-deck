# Phase 15: Multi-Card Set Play - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/types.ts` | model/types | — | `src/shared/types.ts` (self) | exact |
| `party/index.ts` | server/handler | request-response | `party/index.ts` MOVE_CARD case (self) | exact |
| `src/components/BoardDragLayer.tsx` | component/orchestrator | event-driven | `src/components/BoardDragLayer.tsx` (self) | exact |
| `src/components/HandZone.tsx` | component | event-driven | `src/components/HandZone.tsx` (self) | exact |
| `tests/playCardSet.test.ts` | test | request-response | `tests/moveCard.test.ts` | exact |
| `playwright/game.spec.ts` | test/e2e | event-driven | `playwright/game.spec.ts` (self) | exact |

---

## Pattern Assignments

### `src/shared/types.ts` (model, union extension)

**Analog:** `src/shared/types.ts` — existing `ClientAction` union (lines 58–69)

**Current union tail** (lines 58–69):
```typescript
export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  | { type: "REORDER_HAND"; orderedCardIds: string[] }
  | { type: "REORDER_PILE_SPREAD"; pileId: string; orderedCardIds: string[] }
  | { type: "SET_PILE_FACE"; pileId: string; faceUp: boolean }
  | { type: "FLIP_CARD"; pileId: string; cardId: string }
  | { type: "PASS_CARD"; cardId: string; targetPlayerId: string; fromZone?: "hand" | "pile"; fromId?: string }
  | { type: "DEAL_CARDS"; cardsPerPlayer: number }
  | { type: "SHUFFLE_PILE"; pileId: string }
  | { type: "RESET_TABLE" }
  | { type: "UNDO_MOVE" }
  | { type: "PING" };
```

**Add before `| { type: "PING" }`:**
```typescript
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
```

**Pattern to copy:** Every existing union member is a single `|` line with named fields. No factory functions, no class, no enum. Append new member directly before `PING` to keep PING last.

---

### `party/index.ts` — PLAY_CARD_SET case (server handler, request-response)

**Analog:** `party/index.ts` MOVE_CARD case (lines 208–292) — closest structural match.

**Auth guard pattern** (lines 210–217 of MOVE_CARD):
```typescript
if (fromZone === "hand" && fromId !== senderToken) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "UNAUTHORIZED_MOVE",
    message: "Cannot move another player's cards",
  } satisfies ServerEvent));
  break;
}
```
Copy this pattern verbatim for PLAY_CARD_SET: check `fromId !== senderToken`, send same error shape.

**Source lookup pattern** (lines 229–243 of MOVE_CARD):
```typescript
const source: Card[] | undefined =
  fromZone === "hand"
    ? this.gameState.hands[fromId]
    : this.gameState.piles.find(p => p.id === fromId)?.cards;

if (source === undefined) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: fromZone === "hand" ? "HAND_NOT_FOUND" : "PILE_NOT_FOUND",
    message: ...,
  } satisfies ServerEvent));
  break;
}
```
For PLAY_CARD_SET the source is always `this.gameState.hands[fromId]` (hand-only). Use `HAND_NOT_FOUND` error code.

**Card existence validation pattern** (lines 245–253 of MOVE_CARD, `idx === -1` guard):
```typescript
const idx = source.findIndex(c => c.id === cardId);
if (idx === -1) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "CARD_NOT_IN_SOURCE",
    message: `Card ${cardId} not found in source`,
  } satisfies ServerEvent));
  break;
}
```
For PLAY_CARD_SET: validate ALL card IDs before any mutation. Pattern: build a `Set<string>` from the hand, verify every `cardIds[i]` is in it; reject with `CARD_NOT_IN_SOURCE` if any miss. No partial mutation.

**Destination lookup pattern** (lines 258–270 of MOVE_CARD):
```typescript
const dest: Card[] | undefined =
  toZone === "hand"
    ? (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []))
    : this.gameState.piles.find(p => p.id === toId)?.cards;

if (dest === undefined) {
  // Undo the splice — put card back
  source.splice(idx, 0, card);
  sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", ... } satisfies ServerEvent));
  break;
}
```
For PLAY_CARD_SET: `toZone` is always `"pile"`, so use `this.gameState.piles.find(p => p.id === toId)?.cards`. Check for undefined BEFORE calling `takeSnapshot` (no rollback needed).

**takeSnapshot → mutate → persist → broadcast pattern** (lines 255–291 of MOVE_CARD):
```typescript
takeSnapshot(this.gameState);
const card = source.splice(idx, 1)[0];
// ... mutation ...
// (after switch block):
await this.persist();
this.broadcastState();
```
For PLAY_CARD_SET: call `takeSnapshot(this.gameState)` after all validation passes, before any mutation. Then do the atomic filter+push. `persist()` and `broadcastState()` are called once after the switch — no change needed to the outer block.

**faceUp assignment pattern** (lines 272–279 of MOVE_CARD):
```typescript
if (toZone === "hand") {
  card.faceUp = true;
} else {
  const destPile = this.gameState.piles.find(p => p.id === toId);
  card.faceUp = destPile?.faceUp ?? false;
}
```
For PLAY_CARD_SET: apply `destPile?.faceUp ?? true` to each card in the set (spread zones are `faceUp: true`). Use `forEach` on the cards-to-play array.

**RESET_TABLE bulk-mutation analog** (lines 462–481) — demonstrates iterating `Object.values(this.gameState.hands)` and splicing all cards from multiple sources. PLAY_CARD_SET's atomic `hand.filter(c => !cardIdSet.has(c.id))` + `dest.push(...cardsToPlay)` follows the same bulk-array-operation convention.

---

### `src/components/BoardDragLayer.tsx` (component/orchestrator, event-driven)

**Analog:** `src/components/BoardDragLayer.tsx` (self — adding state and sensor wiring)

**Imports to extend** (lines 1–4):
```typescript
import { useState, useRef } from 'react';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation } from '@dnd-kit/core';
import type { CollisionDetection, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
```
Add to the `@dnd-kit/core` import: `useSensors, useSensor, PointerSensor, TouchSensor`.

**State declarations pattern** (lines 56–61):
```typescript
const [activeCard, setActiveCard] = useState<Card | null>(null);
const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
const dropSuccessRef = useRef(false);
```
Add alongside these: `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());`

**Sensor configuration (new — add inside component body, before JSX):**
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
);
```

**DndContext props pattern** (lines 197–202):
```typescript
<DndContext
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
>
```
Add `sensors={sensors}` prop here.

**handleDragStart pattern** (lines 82–93):
```typescript
function handleDragStart(event: DragStartEvent) {
  if (snapBackTimerRef.current !== null) {
    clearTimeout(snapBackTimerRef.current);
    snapBackTimerRef.current = null;
  }
  const data = event.active.data.current as { card?: Card; fromZone?: string; fromId?: string } | undefined;
  if (!data?.card || !data.fromZone || !data.fromId) return;
  dragDataRef.current = data as { card: Card; fromZone: string; fromId: string };
  setActiveCard(data.card);
  setDragging(true);
}
```
Extend: after `dragDataRef.current = ...`, check if `!selectedIds.has(String(event.active.id))` and if so call `setSelectedIds(new Set())` (D-04 — dragging unselected card clears selection).

**handleDragEnd decision-tree pattern** (lines 95–183):
```typescript
function handleDragEnd(event: DragEndEvent) {
  const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
  const isHandReorder = dragDataRef.current?.fromZone === 'hand' && overData?.toZone === 'hand' && event.over?.id !== 'hand';
  const isHandMissed = ...;
  const isPassCard = !!(overData?.toZone === 'opponent-hand' && dragDataRef.current);
  const isSuccess = !!(event.over && dragDataRef.current && overData?.toZone && !isHandReorder && !isHandMissed && !isPassCard);
  dropSuccessRef.current = isSuccess || isHandReorder || isPassCard;
  setDragging(false);

  if (isPassCard) { ... }
  else if (isSuccess) { ... }
  else if (isHandReorder) { ... }
  else { /* snap-back timer */ }

  dragDataRef.current = null;
}
```
Insert new branch BEFORE `if (isPassCard)`:
```typescript
const activeId = String(event.active.id);
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  overData?.toZone === 'pile';

if (isMultiCardSet) {
  setActiveCard(null);
  setSelectedIds(new Set());
  setDragging(false);
  dragDataRef.current = null;
  sendAction({
    type: 'PLAY_CARD_SET',
    cardIds: [...selectedIds],
    fromId: playerId,
    toZone: 'pile',
    toId: overData!.toId,
  });
  return;
}
```

**Escape key useEffect pattern** (add alongside existing `useRef` hooks):
```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') setSelectedIds(new Set());
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Click-outside clearing pattern** — add `onPointerDown` to the outermost wrapper div (the `<>` fragment currently wraps `DndContext` and `Dialog.Root`; wrap in a `<div>` if needed):
```typescript
<div onPointerDown={() => setSelectedIds(new Set())}>
  <DndContext ...>
    ...
  </DndContext>
  <Dialog.Root ...>
    ...
  </Dialog.Root>
</div>
```

**HandZone integration:** Pass `selectedIds` and `onToggleSelect` down through `BoardView` → `HandZone`. The `BoardView` call is on line 203:
```typescript
<BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} />
```
Add: `selectedIds={selectedIds} onToggleSelect={(id) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}`.

---

### `src/components/HandZone.tsx` (component, event-driven)

**Analog:** `src/components/HandZone.tsx` (self — extending SortableHandCard and HandZone)

**SortableHandCard current props interface** (lines 9–14):
```typescript
interface SortableHandCardProps {
  card: Card;
  playerId: string;
  isDraggingThis: boolean;
  index: number;
}
```
Add: `isSelected: boolean; onToggleSelect: (id: string) => void;`

**SortableHandCard render pattern** (lines 16–39):
```typescript
function SortableHandCard({ card, playerId, isDraggingThis, index }: SortableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ ... });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    opacity: isDraggingThis ? 0 : 1,
  };

  return (
    <div className={cn('relative w-[63px] h-[88px] flex-shrink-0', index > 0 ? '-ml-5' : '')}>
      {isDraggingThis && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </div>
  );
}
```

Extend to:
- Outer `<div>`: add `onClick={() => onToggleSelect(card.id)}` and `onPointerDown={(e) => e.stopPropagation()}` (D-11 stop-propagation to prevent click-outside clearing)
- `style` object: when `isSelected`, use `transform: 'translateY(-6px)'` instead of the sortable transform (Pitfall 1 — do not concatenate; replace)
- Inner `<div>`: add `aria-pressed={isSelected}` and className `cn(..., isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md transition-transform duration-150')`

**HandZone props interface** (lines 41–48):
```typescript
interface HandZoneProps {
  cards: Card[];
  playerId: string;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
}
```
Add: `selectedIds: Set<string>; onToggleSelect: (id: string) => void;`

**HandZone card render pattern** (line 102):
```typescript
{cards.map((card, index) => (
  <SortableHandCard key={card.id} card={card} playerId={playerId} isDraggingThis={draggingCardId === card.id} index={index} />
))}
```
Add: `isSelected={selectedIds.has(card.id)} onToggleSelect={onToggleSelect}`

**useDndMonitor — no change needed:** The existing `onDragEnd` in `HandZone.useDndMonitor` handles only intra-hand reorder. `PLAY_CARD_SET` dispatch lives in `BoardDragLayer.handleDragEnd` only (Pitfall 2 — avoid double-dispatch).

---

### `tests/playCardSet.test.ts` (unit test, new file)

**Analog:** `tests/moveCard.test.ts` — exact structural match.

**File header / imports pattern** (lines 1–4 of moveCard.test.ts):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";
```
Use `makeMockRoom`, `makeMockConnection`, `makeCard` from `tests/helpers.ts` (same as `spreadZoneCreation.test.ts`):
```typescript
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
```

**Test state factory pattern** (lines 35–40 of moveCard.test.ts):
```typescript
function makeStateWithPlayerAndCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "" });
  state.hands[playerId] = cards;
  return state;
}
```
Re-use this pattern for PLAY_CARD_SET tests — create state with hand containing specific cards.

**beforeEach / room setup pattern** (lines 46–51 of moveCard.test.ts):
```typescript
beforeEach(() => {
  mockRoom = makeMockRoom();
  room = new GameRoom(mockRoom);
  sender = makeMockConnection("player-1");
});
```
Copy verbatim. All PLAY_CARD_SET tests use the same setup.

**Success test pattern** (lines 53–71 of moveCard.test.ts):
```typescript
it("moves card from player hand to named pile", async () => {
  const card = makeCard("A-s");
  room.gameState = makeStateWithPlayerAndCards("player-1", [card]);

  const msg = JSON.stringify({
    type: "MOVE_CARD",
    cardId: "A-s", fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard",
  });
  await room.onMessage(msg, sender);

  expect(room.gameState.hands["player-1"]).toHaveLength(0);
  const discardPile = room.gameState.piles.find(p => p.id === "discard")!;
  expect(discardPile.cards).toHaveLength(1);
  expect(discardPile.cards[0].id).toBe("A-s");
});
```
Adapt for PLAY_CARD_SET: send `{ type: "PLAY_CARD_SET", cardIds: ["A-s","K-h"], fromId: "player-1", toZone: "pile", toId: "play" }`, assert hand is empty and play pile has 2 cards.

**Error test pattern** (lines 116–133 of moveCard.test.ts):
```typescript
it("sends CARD_NOT_IN_SOURCE when cardId not found in source", async () => {
  // ...
  const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
  const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
  expect(errors).toHaveLength(1);
  expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_IN_SOURCE");
});
```
Copy this exact error-extraction idiom for all error cases in PLAY_CARD_SET tests.

**Tests to write** (per RESEARCH.md validation map):
1. Happy path: removes all `cardIds` from hand atomically, appends to target pile
2. Partial miss: one `cardId` not in hand → no mutation, sends `CARD_NOT_IN_SOURCE`
3. Auth: `fromId !== sender.id` → sends `UNAUTHORIZED_MOVE`
4. faceUp: cards appended to pile adopt `pile.faceUp` value
5. Snapshot: `takeSnapshot` is called before mutation (assert `canUndo` via `viewFor`)

---

### `playwright/game.spec.ts` (e2e test, extend + fix)

**Analog:** `playwright/game.spec.ts` (self — extending existing suite)

**Fixture import pattern** (lines 1–2):
```typescript
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';
```
No change needed. New test goes inside the same `test.describe('virtual-deck e2e', ...)` block.

**dealCards helper pattern** (lines 4–9):
```typescript
async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /deal/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).last().click();
}
```
Re-use unchanged for multi-card e2e test setup.

**Drag interaction pattern** (lines 61–70 of pass card test):
```typescript
const src = await firstCard.boundingBox();
const tgt = await opponentHand.boundingBox();
if (src && tgt) {
  await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await p1.mouse.down();
  await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
  await p1.mouse.up();
}
```
Copy for multi-card drag. For click-to-select: use `p1.mouse.click(x, y)` (simpler — no down/up needed since click is below 8px threshold). For drag: same pattern with target being `spread-zone-play`.

**Card locator pattern** (lines 52–55):
```typescript
const handZone = p1.getByTestId('hand-zone');
const firstCard = handZone.locator('[role="button"]').first();
await expect(firstCard).toBeVisible();
```
For multi-card: select two cards by index: `handZone.locator('[role="button"]').nth(0)` and `.nth(1)`.

**Stale assertion fix** (lines 123–124 — MUST fix):
```typescript
// CURRENT (broken):
await expect(p1.getByTestId('spread-zone-spread-communal')).toBeVisible();
await expect(p2.getByTestId('spread-zone-spread-communal')).toBeVisible();

// FIX TO:
await expect(p1.getByTestId('spread-zone-play')).toBeVisible();
await expect(p2.getByTestId('spread-zone-play')).toBeVisible();
```
Also fix the comment on line 128: `[data-testid^="spread-zone-spread-"]` correctly matches personal zones (e.g., `spread-zone-spread-{playerId}`) but NOT the communal zone (`spread-zone-play`). The comment that claims this prefix matches the communal zone must be corrected. The assertion on count (`>= 2`) remains correct — it counts personal zones only.

---

## Shared Patterns

### Error Response Shape
**Source:** `party/index.ts` — every `sender.send` call
**Apply to:** All new error paths in the PLAY_CARD_SET handler
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "UNAUTHORIZED_MOVE",   // or HAND_NOT_FOUND, CARD_NOT_IN_SOURCE, PILE_NOT_FOUND
  message: "...",
} satisfies ServerEvent));
break;
```
The `satisfies ServerEvent` assertion is used on every error send — copy it to ensure type safety.

### takeSnapshot → mutate → persist → broadcastState
**Source:** `party/index.ts` lines 255, 496–497
**Apply to:** PLAY_CARD_SET handler (after all validation passes)
```typescript
takeSnapshot(this.gameState);
// ... mutations ...
// (these two lines are already in the outer handler — no duplication needed):
await this.persist();
this.broadcastState();
```
`persist()` and `broadcastState()` run unconditionally after the switch. Only call `takeSnapshot` inside the case, not persist/broadcast.

### CSS.Transform + isDragging transform pattern
**Source:** `src/components/HandZone.tsx` lines 22–27
```typescript
const style: React.CSSProperties = {
  transform: isDragging ? undefined : CSS.Transform.toString(transform),
  transition,
  touchAction: 'none',
  opacity: isDraggingThis ? 0 : 1,
};
```
For the selection lift extension: evaluate `isSelected` BEFORE `isDragging`. When `isSelected`, use `transform: 'translateY(-6px)'`; when `!isSelected && isDragging`, use `undefined`; otherwise use `CSS.Transform.toString(transform)`. This is a three-way conditional, not a two-way concatenation.

### Vitest error extraction idiom
**Source:** `tests/moveCard.test.ts` lines 129–132
**Apply to:** All error-case tests in `tests/playCardSet.test.ts`
```typescript
const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
expect(errors).toHaveLength(1);
expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("...");
```

### Playwright drag interaction
**Source:** `playwright/game.spec.ts` lines 61–70
**Apply to:** Multi-card drag portion of the new e2e test
```typescript
const src = await sourceCard.boundingBox();
const tgt = await targetZone.boundingBox();
if (src && tgt) {
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
  await page.mouse.up();
}
```

---

## No Analog Found

All 6 files have clear analogs. No files are without a pattern reference.

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`, `playwright/`
**Files scanned:** 10 (HandZone.tsx, BoardDragLayer.tsx, types.ts, party/index.ts, CardOverlay.tsx, moveCard.test.ts, spreadZoneCreation.test.ts, helpers.ts, game.spec.ts, fixtures.ts)
**Pattern extraction date:** 2026-04-27
