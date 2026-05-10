# Phase 20: Spread Zone Multi-Select - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 5 modified files + 1 test file extension
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/SpreadZone.tsx` | component | event-driven (dnd-kit) | `src/components/HandZone.tsx` | exact — same role, same dnd-kit pattern, same multi-select prop shape to add |
| `src/components/BoardDragLayer.tsx` | component/orchestrator | event-driven (dnd-kit) | self — extend existing | self-extension |
| `src/components/BoardView.tsx` | component | request-response (prop threading) | self — extend existing | self-extension |
| `src/shared/types.ts` | types | N/A | self — extend existing union member | self-extension |
| `party/index.ts` | server handler | request-response (PartyKit onMessage) | self — extend existing case | self-extension |
| `tests/playCardSet.test.ts` | test | batch (Vitest describe/it) | `tests/moveCard.test.ts` | role-match |

---

## Pattern Assignments

### `src/components/SpreadZone.tsx` (component, dnd-kit event-driven)

**Analog:** `src/components/HandZone.tsx`

**Imports pattern** (HandZone.tsx lines 1–7):
```typescript
import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientAction } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
```
SpreadZone already has these imports. Add `ClientPile` to the type import (already present). No new imports needed.

**SortableHandCard props interface — copy verbatim for SortableSpreadCard** (HandZone.tsx lines 9–16):
```typescript
interface SortableHandCardProps {
  card: Card;
  playerId: string;
  isDraggingThis: boolean;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}
```
For `SortableSpreadCard`, replace `playerId` with `pileId: string` and `isDraggingThis` with `draggingCardId: string | null`. The `isSelected` and `onToggleSelect` props are added verbatim.

**Core selection + lift transform pattern** (HandZone.tsx lines 19–59):
```typescript
function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect }: SortableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'hand' as const, fromId: playerId, toZone: 'hand' as const, toId: playerId },
  });

  const resolvedTransform = isSelected
    ? 'translateY(-6px)'
    : isDragging
      ? undefined
      : CSS.Transform.toString(transform);

  const style: React.CSSProperties = {
    transform: resolvedTransform,
    transition,
    touchAction: 'none',
    opacity: isDraggingThis ? 0 : 1,
  };

  return (
    <div
      className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
      onClick={() => onToggleSelect(card.id)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isDraggingThis && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}   // AFTER {...attributes} — locked Phase 15 pattern
      >
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </div>
  );
}
```
Critical: `aria-pressed={isSelected}` placed AFTER `{...attributes}` spread to avoid TS2783 dnd-kit override conflict. This is the locked Phase 15 pattern — do not reorder.

For `SortableSpreadCard`, the `useSortable` data field uses `fromZone: 'pile'` and `fromId: pileId` instead of `'hand'`/`playerId`. The outer `div` uses the existing SpreadZone class `cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')` instead of HandZone's `relative w-[42px] h-[59px]` sizing (SpreadZone has its own card dimensions).

**"N selected" badge pattern** (HandZone.tsx lines 114–118):
```typescript
{selectedIds.size >= 2 && (
  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
    {selectedIds.size} selected
  </span>
)}
```
In SpreadZone, the badge belongs in the spread zone header. It must only appear when `selectionSource?.zoneId === pile.id` (i.e., this zone currently owns the selection).

**SpreadZone props — extend with new props** (SpreadZone.tsx lines 44–49):
```typescript
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  // Phase 20 additions:
  interactive?: boolean;         // default true; false for opponent personal zones (D-09)
  selectedIds?: Set<string>;     // only passed to interactive instances
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```

**Non-interactive card render — conditional pattern** (D-09):
```typescript
// When interactive={false}: render plain CardFace/CardBack in a plain div (no useSortable)
// DO NOT call useSortable — it always registers drag listeners even when "disabled"
{interactive !== false ? (
  <SortableSpreadCard
    card={card as Card}
    pileId={pile.id}
    index={i}
    draggingCardId={draggingCardId}
    isSelected={selectedIds?.has(card.id) ?? false}
    onToggleSelect={onToggleSelect ?? (() => {})}
  />
) : (
  <div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
    {card.faceUp ? <CardFace card={card} /> : <CardBack />}
  </div>
)}
```
`useDroppable` on the zone container remains unconditional — opponents can still drop onto non-interactive zones.

---

### `src/components/BoardDragLayer.tsx` (component/orchestrator, event-driven)

**Analog:** Self-extension. Extend existing state and handlers.

**Existing selectedIds state** (BoardDragLayer.tsx line 58):
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**Add selectionSource state alongside selectedIds** (D-01):
```typescript
type SelectionSource = { zone: 'hand' | 'pile'; zoneId: string } | null;
const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
```

**Existing handleToggleSelect** (BoardDragLayer.tsx lines 64–71):
```typescript
const handleToggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```
Replace with zone-aware signature (D-01, D-03):
```typescript
const handleToggleSelect = (id: string, zone: 'hand' | 'pile', zoneId: string) => {
  const isDifferentZone = selectionSource !== null &&
    (selectionSource.zone !== zone || selectionSource.zoneId !== zoneId);

  if (isDifferentZone) {
    setSelectionSource({ zone, zoneId });
    setSelectedIds(new Set([id]));
    return;
  }

  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  if (selectionSource === null) setSelectionSource({ zone, zoneId });
  // Note: if deselecting the last card, selectionSource remains set until next toggle or Escape.
  // This is acceptable — selectionSource with an empty Set has no visible effect.
};
```

**Existing Escape key handler** (BoardDragLayer.tsx lines 78–84):
```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') setSelectedIds(new Set());
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```
Extend to also clear `selectionSource` (D-02/Pattern 4):
```typescript
if (e.key === 'Escape') {
  setSelectedIds(new Set());
  setSelectionSource(null);   // NEW
}
```

**Existing isMultiCardSet check** (BoardDragLayer.tsx lines 125–129):
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  overData?.toZone === 'pile';
```
Extend for D-06 (`toZone: 'hand'`) and add intra-zone guard for Pitfall 3:
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
  // Guard: intra-spread multi-select drag should not dispatch PLAY_CARD_SET to same pile
  !(dragDataRef.current?.fromZone === 'pile' && dragDataRef.current?.fromId === overData?.toId);
```

**Existing PLAY_CARD_SET dispatch** (BoardDragLayer.tsx lines 136–144):
```typescript
sendAction({
  type: 'PLAY_CARD_SET',
  cardIds: [...selectedIds],
  fromId: playerId,
  toZone: 'pile',
  toId: overData!.toId,
});
```
Extend for pile-source dispatch (D-04, D-05):
```typescript
sendAction({
  type: 'PLAY_CARD_SET',
  cardIds: [...selectedIds],
  fromZone: (selectionSource?.zone ?? 'hand') as 'hand' | 'pile',   // NEW — D-04
  fromId: selectionSource?.zone === 'pile'
    ? dragDataRef.current!.fromId   // pile.id set in useSortable data
    : playerId,                      // hand source — existing behavior
  toZone: overData!.toZone as 'pile' | 'hand',   // widened for D-06
  toId: overData!.toId,
});
```
After dispatching, also clear `selectionSource`:
```typescript
setActiveCard(null);
setSelectedIds(new Set());
setSelectionSource(null);   // NEW
setDragging(false);
```

**BoardView call site** (BoardDragLayer.tsx line 255):
```typescript
<BoardView ... selectedIds={selectedIds} onToggleSelect={handleToggleSelect} />
```
Pass `selectionSource` through to `BoardView` so SpreadZone can determine badge ownership:
```typescript
<BoardView ... selectedIds={selectedIds} onToggleSelect={handleToggleSelect} selectionSource={selectionSource} />
```

---

### `src/components/BoardView.tsx` (component, prop threading)

**Analog:** Self-extension.

**Existing BoardViewProps interface** (BoardView.tsx lines 10–19):
```typescript
interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}
```
Add `selectionSource` prop to match BoardDragLayer's new state:
```typescript
selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null;
onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;  // widened signature
```

**Existing opponent SpreadZone render** (BoardView.tsx lines 46–48):
```typescript
{opponentSpread && (
  <SpreadZone pile={opponentSpread} sendAction={sendAction} draggingCardId={draggingCardId} />
)}
```
Add `interactive={false}` for opponent personal zones (D-07/D-09):
```typescript
{opponentSpread && (
  <SpreadZone
    pile={opponentSpread}
    sendAction={sendAction}
    draggingCardId={draggingCardId}
    interactive={false}
  />
)}
```

**Opponent zone identification pattern** (BoardView.tsx line 36):
```typescript
const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
```
This already identifies opponent personal zones. No change needed — `interactive={false}` is wired by the render location.

**Existing my spread zone render** (BoardView.tsx lines 75–83):
```typescript
{mySpreadZone && (
  <div className="flex-shrink-0 bg-card px-4 py-2">
    <SpreadZone
      pile={mySpreadZone}
      sendAction={sendAction}
      draggingCardId={draggingCardId}
    />
  </div>
)}
```
Pass selection props for interactive zones (my spread + communal):
```typescript
<SpreadZone
  pile={mySpreadZone}
  sendAction={sendAction}
  draggingCardId={draggingCardId}
  interactive={true}
  selectedIds={selectedIds}
  onToggleSelect={onToggleSelect}
  selectionSource={selectionSource}
/>
```

**HandZone call site — update onToggleSelect call** (HandZone.tsx line 40):
```typescript
onClick={() => onToggleSelect(card.id)
```
Must become:
```typescript
onClick={() => onToggleSelect(card.id, 'hand', playerId)
```
This call site is in `SortableHandCard` inside `HandZone.tsx`. The signature change in `BoardDragLayer.handleToggleSelect` forces this update.

---

### `src/shared/types.ts` (types, N/A)

**Analog:** Self-extension.

**Existing PLAY_CARD_SET union member** (types.ts line 67):
```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
```
Phase 20 extension — add optional `fromZone`, widen `toZone` (D-04, D-06):
```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile"; fromId: string; toZone: "pile" | "hand"; toId: string }
```
`fromZone` is optional — all existing callers (tests/playCardSet.test.ts) send no `fromZone` and must continue to work.

---

### `party/index.ts` (server handler, request-response)

**Analog:** Self-extension of existing PLAY_CARD_SET case.

**Existing handler structure** (party/index.ts lines 492–576):
```typescript
case "PLAY_CARD_SET": {
  const { cardIds, fromId, toZone, toId } = action;
  // V1: empty check
  // V4: fromId !== senderToken -> UNAUTHORIZED_MOVE
  // resolve hand = this.gameState.hands[fromId]
  // V5: allPresent check
  // V6: duplicate check
  // resolve destPile (toZone === 'pile' only)
  // takeSnapshot
  // build cardsToPlay, set faceUp, splice from hand, push to destPile
}
```

**Key extension points:**

Destructure `fromZone` (D-04):
```typescript
const { cardIds, fromZone, fromId, toZone, toId } = action;
```

Gate authorization on source type (Pitfall 5 fix):
```typescript
// V4 Access Control: hand source requires fromId === senderToken; pile source deferred (REQUIREMENTS.md)
if (!fromZone || fromZone === 'hand') {
  if (fromId !== senderToken) {
    sender.send(JSON.stringify({
      type: "ERROR",
      code: "UNAUTHORIZED_MOVE",
      message: "Cannot play another player's cards",
    } satisfies ServerEvent));
    break;
  }
}
// TODO: pile-source ownership guard deferred per REQUIREMENTS.md SPREAD-03 authorization note
```

Resolve source from correct location (D-04):
```typescript
const source: Card[] | undefined =
  (!fromZone || fromZone === 'hand')
    ? this.gameState.hands[fromId]
    : this.gameState.piles.find(p => p.id === fromId)?.cards;

if (source === undefined) {
  const code = (!fromZone || fromZone === 'hand') ? 'HAND_NOT_FOUND' : 'PILE_NOT_FOUND';
  sender.send(JSON.stringify({ type: "ERROR", code, message: `Source not found: ${fromId}` } satisfies ServerEvent));
  break;
}
```

Resolve destination including `toZone: 'hand'` (D-06, Pitfall 6):
```typescript
const dest: Card[] | undefined =
  toZone === 'pile'
    ? this.gameState.piles.find(p => p.id === toId)?.cards
    : this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []);

if (dest === undefined) {
  sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", message: `Destination not found: ${toId}` } satisfies ServerEvent));
  break;
}
```

Set faceUp on destination (Pitfall 6 fix):
```typescript
// faceUp: pile destination uses pile.faceUp; hand destination always faceUp:true (matches MOVE_CARD line 275)
const destPile = toZone === 'pile' ? this.gameState.piles.find(p => p.id === toId) : undefined;
cardsToPlay.forEach(card => {
  card.faceUp = toZone === 'hand' ? true : destPile!.faceUp === true;
});
```

Atomic splice from source (not just hand):
```typescript
// Remove from source (hand or pile)
if (!fromZone || fromZone === 'hand') {
  this.gameState.hands[fromId] = source.filter(c => !cardIdSet.has(c.id));
} else {
  const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
  srcPile.cards = srcPile.cards.filter(c => !cardIdSet.has(c.id));
}
dest.push(...cardsToPlay);
```

---

### `tests/playCardSet.test.ts` (test, Vitest)

**Analog:** Extend existing file. Pattern from existing tests in this file.

**Existing test structure pattern** (playCardSet.test.ts lines 24–43):
```typescript
it("plays a set of cards from hand to a pile atomically", async () => {
  const cardA = makeCard("A-s");
  const cardK = makeCard("K-h");
  const cardQ = makeCard("Q-d");
  room.gameState = makeStateWithPlayerAndCards("player-1", [cardA, cardK, cardQ]);

  const msg = JSON.stringify({
    type: "PLAY_CARD_SET",
    cardIds: ["A-s", "K-h"],
    fromId: "player-1",
    toZone: "pile",
    toId: "play",
  });
  await room.onMessage(msg, sender);

  expect(room.gameState.hands["player-1"]).toHaveLength(1);
  // ...
});
```

New test scenarios to add (same structure, new messages):
- `fromZone: 'pile'` moves cards from pile to another pile
- `fromZone: 'pile'` with `toZone: 'hand'` moves spread cards to player hand
- Pile-source `PLAY_CARD_SET` rejected when pile not found (wrong `fromId`)
- Pile-source `PLAY_CARD_SET` with `toZone: 'hand'` sets `card.faceUp = true`

Helper setup needed for pile-source tests: use `defaultGameState` plus add cards to a spread pile directly:
```typescript
function makeStateWithPileCards(pileId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: "player-1", connected: true, displayName: "" });
  state.hands["player-1"] = [];
  const pile = state.piles.find(p => p.id === pileId);
  if (pile) pile.cards.push(...cards);
  return state;
}
```

---

## Shared Patterns

### Selection visual treatment (ring + lift)
**Source:** `src/components/HandZone.tsx` lines 24–28 and 49–54
**Apply to:** `SortableSpreadCard` in `SpreadZone.tsx`
```typescript
const resolvedTransform = isSelected
  ? 'translateY(-6px)'
  : isDragging
    ? undefined
    : CSS.Transform.toString(transform);
// ...
className={cn(
  isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
)}
```

### aria-pressed placement rule
**Source:** `src/components/HandZone.tsx` line 54
**Apply to:** All selectable card components
```typescript
{...listeners}
{...attributes}
aria-pressed={isSelected}   // AFTER {...attributes} — avoids TS2783 dnd-kit override
```

### Click-vs-drag disambiguation
**Source:** `src/components/HandZone.tsx` lines 40–41
**Apply to:** `SortableSpreadCard`
```typescript
onClick={() => onToggleSelect(card.id)}
onPointerDown={(e) => e.stopPropagation()}
```
`PointerSensor` with `distance: 8` in `BoardDragLayer` (line 74) handles the 8px threshold. `onPointerDown.stopPropagation` prevents event bubbling to parent droppables. No `didDragRef` needed.

### "N selected" badge
**Source:** `src/components/HandZone.tsx` lines 114–118
**Apply to:** `SpreadZone` header (conditional on zone owning the selection)
```typescript
{selectedIds.size >= 2 && selectionSource?.zoneId === pile.id && (
  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
    {selectedIds.size} selected
  </span>
)}
```

### Escape key clear pattern
**Source:** `src/components/BoardDragLayer.tsx` lines 79–83
**Apply to:** BoardDragLayer (extend existing handler)
```typescript
if (e.key === 'Escape') {
  setSelectedIds(new Set());
  setSelectionSource(null);   // add this
}
```

### Server PLAY_CARD_SET error response pattern
**Source:** `party/index.ts` lines 497–503 (EMPTY_CARD_SET error)
**Apply to:** New error paths in the extended handler
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "PILE_NOT_FOUND",
  message: `Source pile not found: ${fromId}`,
} satisfies ServerEvent));
break;
```

---

## No Analog Found

No files require invention from scratch. All patterns are direct extensions of existing code.

---

## Critical Anti-Patterns (do not do these)

| Anti-Pattern | Why | What to Do Instead |
|--------------|-----|--------------------|
| Call `useSortable` in non-interactive zone with a disabled flag | dnd-kit always registers on mount; no disabled mode | Conditional render — `interactive={false}` renders plain div, never calls `useSortable` |
| Split `selectedIds` into per-zone Sets | Duplicates logic, risks desync | Keep single shared `Set<string>`, use `selectionSource` as discriminator |
| Place `aria-pressed` before `{...attributes}` | TS2783 — dnd-kit overrides it | Always place `aria-pressed` after `{...attributes}` spread |
| Dispatch `PLAY_CARD_SET` with `fromId: playerId` for pile-source moves | Server does `hands[fromId]` lookup, returns HAND_NOT_FOUND | Use `dragDataRef.current.fromId` (which contains `pile.id`) for pile-source moves |
| Apply `fromId !== senderToken` guard to pile-source moves | `fromId` is a pile ID, not a player token | Gate the guard behind `!fromZone || fromZone === 'hand'` |
| Set `faceUp` from `destPile.faceUp` when `toZone === 'hand'` | `destPile` is undefined for hand dest | Use `card.faceUp = true` for hand destinations (matches MOVE_CARD line 275) |

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`
**Files read:** HandZone.tsx, SpreadZone.tsx, BoardDragLayer.tsx, BoardView.tsx, types.ts, party/index.ts (lines 490–577), tests/playCardSet.test.ts
**Pattern extraction date:** 2026-05-09
