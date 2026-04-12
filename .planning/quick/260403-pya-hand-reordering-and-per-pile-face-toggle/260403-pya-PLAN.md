---
phase: quick
plan: 260403-pya
type: execute
wave: 1
depends_on: []
files_modified:
  - src/shared/types.ts
  - party/index.ts
  - src/components/HandZone.tsx
  - src/components/PileZone.tsx
  - src/components/BoardDragLayer.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Player can drag cards within their hand to reorder them, and order persists on reconnect"
    - "Each pile shows a toggle button; clicking it flips its faceUp setting for all players"
    - "Cards placed on a pile inherit the pile's current faceUp setting"
  artifacts:
    - path: "src/shared/types.ts"
      provides: "Pile.faceUp field, REORDER_HAND and SET_PILE_FACE actions in ClientAction"
    - path: "party/index.ts"
      provides: "Server handlers for REORDER_HAND and SET_PILE_FACE; defaultGameState pile faceUp defaults"
    - path: "src/components/HandZone.tsx"
      provides: "SortableContext wrapping hand cards with drag-to-reorder via REORDER_HAND"
    - path: "src/components/PileZone.tsx"
      provides: "Toggle button sending SET_PILE_FACE action"
  key_links:
    - from: "src/components/HandZone.tsx"
      to: "party/index.ts REORDER_HAND handler"
      via: "sendAction({ type: 'REORDER_HAND', orderedCardIds })"
    - from: "src/components/PileZone.tsx"
      to: "party/index.ts SET_PILE_FACE handler"
      via: "sendAction({ type: 'SET_PILE_FACE', pileId, faceUp })"
    - from: "party/index.ts MOVE_CARD handler"
      to: "Pile.faceUp"
      via: "card.faceUp = pile's faceUp setting when destination is pile"
---

<objective>
Add hand reordering (drag to rearrange cards in own hand, persisted server-side) and per-pile face-up/down toggle (small button on each pile that flips all cards landing there).

Purpose: Two quality-of-life features that make the board feel like a real card table.
Output: Updated types, server handlers, and UI components. No new files needed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/shared/types.ts
@party/index.ts
@src/components/HandZone.tsx
@src/components/PileZone.tsx
@src/components/DraggableCard.tsx
@src/components/BoardDragLayer.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend types and server for REORDER_HAND and SET_PILE_FACE</name>
  <files>src/shared/types.ts, party/index.ts</files>
  <action>
**src/shared/types.ts — three changes:**

1. Add `faceUp: boolean` to the `Pile` interface (after `cards`).

2. Add two new variants to `ClientAction`:
   - `{ type: "REORDER_HAND"; orderedCardIds: string[] }` — full ordered list of card IDs in the player's hand
   - `{ type: "SET_PILE_FACE"; pileId: string; faceUp: boolean }` — set a pile's face-up default

**party/index.ts — four changes:**

1. `defaultGameState`: add `faceUp` to each pile:
   - draw: `faceUp: false`
   - discard: `faceUp: true`
   - play: `faceUp: true`

2. Fix `MOVE_CARD` faceUp assignment. The current line is:
   `card.faceUp = toZone === "hand" || toId !== "draw";`
   Replace with:
   ```ts
   if (toZone === "hand") {
     card.faceUp = true;
   } else {
     const destPile = this.gameState.piles.find(p => p.id === toId);
     card.faceUp = destPile?.faceUp ?? false;
   }
   ```
   This makes cards inherit the destination pile's setting instead of hardcoding draw=face-down.

3. Handle `REORDER_HAND` in the switch:
   ```ts
   case "REORDER_HAND": {
     const hand = this.gameState.hands[sender.id];
     if (!hand) break;
     const idSet = new Set(hand.map(c => c.id));
     const incoming = new Set(action.orderedCardIds);
     // Reject if the incoming list doesn't match the player's current cards
     if (
       action.orderedCardIds.length !== hand.length ||
       !action.orderedCardIds.every(id => idSet.has(id))
     ) {
       sender.send(JSON.stringify({
         type: "ERROR",
         code: "INVALID_REORDER",
         message: "orderedCardIds must contain exactly the player's current hand cards",
       } satisfies ServerEvent));
       break;
     }
     const cardMap = new Map(hand.map(c => [c.id, c]));
     this.gameState.hands[sender.id] = action.orderedCardIds.map(id => cardMap.get(id)!);
     break;
   }
   ```

4. Handle `SET_PILE_FACE` in the switch:
   ```ts
   case "SET_PILE_FACE": {
     const pile = this.gameState.piles.find(p => p.id === action.pileId);
     if (!pile) {
       sender.send(JSON.stringify({
         type: "ERROR",
         code: "PILE_NOT_FOUND",
         message: `No pile found with id: ${action.pileId}`,
       } satisfies ServerEvent));
       break;
     }
     pile.faceUp = action.faceUp;
     break;
   }
   ```
  </action>
  <verify>
    <automated>cd /Users/aaronkaminsky/code/virtual-deck && npm run typecheck 2>&1 | tail -5</automated>
  </verify>
  <done>TypeScript compiles with no errors. Pile has faceUp. ClientAction includes both new variants. Server handles REORDER_HAND and SET_PILE_FACE.</done>
</task>

<task type="auto">
  <name>Task 2: Hand reordering UI with @dnd-kit/sortable</name>
  <files>src/components/HandZone.tsx, src/components/BoardDragLayer.tsx</files>
  <action>
**Install @dnd-kit/sortable first:**
```bash
npm install @dnd-kit/sortable
```

**src/components/BoardDragLayer.tsx:**

The existing `DndContext` uses `closestCenter` which is correct for sortable. Add `SortableContext` support by threading a `sendAction` prop down — it's already passed. The drag-end handler currently handles `MOVE_CARD` for cross-zone moves. Extend it to detect hand-to-hand same-zone moves (reorder):

In `handleDragEnd`, before the existing `sendAction` call, check if fromZone === "hand" and toZone === "hand" and fromId === toId (reorder within own hand). In that case, do NOT send MOVE_CARD — HandZone will handle REORDER_HAND using arrayMove. This requires HandZone to have access to `sendAction`.

Update `BoardDragLayer` to pass `sendAction` to `BoardView` (it likely already does). Verify `BoardView` passes `sendAction` down to `HandZone`. If not, thread it through.

**src/components/HandZone.tsx — full rewrite:**

```tsx
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientAction } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SortableHandCardProps {
  card: Card;
  playerId: string;
}

function SortableHandCard({ card, playerId }: SortableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'hand' as const, fromId: playerId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}

interface HandZoneProps {
  cards: Card[];
  playerId: string;
  sendAction: (action: ClientAction) => void;
}

export function HandZone({ cards, playerId, sendAction }: HandZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'hand',
    data: { toZone: 'hand' as const, toId: playerId },
  });

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

      // Reorder: dragging a card from own hand to another position in own hand
      // The over target is another sortable card (data.fromZone === 'hand' && data.fromId === playerId)
      // OR the droppable hand zone itself
      const fromHand = activeData?.fromZone === 'hand' && activeData?.fromId === playerId;
      const toSameHand =
        (overData?.fromZone === 'hand' && overData?.fromId === playerId) ||
        over.id === 'hand';

      if (fromHand && toSameHand && activeData) {
        const activeIdx = cards.findIndex(c => c.id === activeData.card.id);
        const overIdx = cards.findIndex(c => c.id === String(over.id));
        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          const reordered = arrayMove(cards, activeIdx, overIdx);
          sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
        }
      }
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
        isOver ? 'border-t-2 border-primary' : ''
      )}
    >
      <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
        {cards.map((card) => (
          <SortableHandCard key={card.id} card={card} playerId={playerId} />
        ))}
      </SortableContext>
    </div>
  );
}
```

**Thread sendAction to HandZone:** Find where `HandZone` is rendered (likely `BoardView.tsx`). Add `sendAction` prop to HandZone's call site. If `BoardView` doesn't receive `sendAction`, trace from `BoardDragLayer` and add it to the props chain.

Note: DraggableCard.tsx is no longer used for hand cards (replaced by SortableHandCard). It remains used by PileZone — do NOT remove it.

Note on drag-end conflict: `BoardDragLayer.handleDragEnd` sends `MOVE_CARD` for cross-zone drops. It reads `event.over?.data.current?.toZone`. The `SortableContext` sortable items have `data.fromZone`, not `toZone`, so the existing MOVE_CARD logic won't fire for within-hand reorders (over.data.current.toZone will be undefined). The `useDndMonitor` in HandZone handles the reorder separately. This keeps the two flows clean.
  </action>
  <verify>
    <automated>cd /Users/aaronkaminsky/code/virtual-deck && npm run typecheck 2>&1 | tail -5</automated>
  </verify>
  <done>TypeScript compiles. HandZone accepts sendAction prop. SortableContext wraps hand cards. Drag-to-reorder in hand sends REORDER_HAND. DraggableCard still used by PileZone.</done>
</task>

<task type="auto">
  <name>Task 3: Per-pile face toggle button in PileZone</name>
  <files>src/components/PileZone.tsx</files>
  <action>
Update `PileZone` to accept `sendAction` and display a small toggle button.

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { Pile, ClientAction } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { DraggableCard } from './DraggableCard';
import { cn } from '@/lib/utils';

interface PileZoneProps {
  pile: Pile;
  sendAction: (action: ClientAction) => void;
}

export function PileZone({ pile, sendAction }: PileZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  const isEmpty = pile.cards.length === 0;
  const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1];

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{pile.name}</span>
      <div
        ref={setNodeRef}
        className={cn(
          'w-[80px] h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
        {topCard && <DraggableCard card={topCard} fromZone="pile" fromId={pile.id} />}
        <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
      </div>
      <button
        onClick={handleToggleFace}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        title={pile.faceUp ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
      >
        {pile.faceUp ? 'Face up' : 'Face down'}
      </button>
    </div>
  );
}
```

Also update all call sites of `PileZone` (likely in `BoardView.tsx`) to pass `sendAction`.

Note: `Pile.faceUp` is now required on the type — TypeScript will catch any existing call sites that render piles from old state. At runtime, if the server still has old state without `faceUp`, the server's `onStart` will load it from storage. Add a fallback in `SET_PILE_FACE` is not needed since `defaultGameState` always writes `faceUp`. However, if the PartyKit room has old persisted state without `faceUp`, the button shows `undefined` as text. Guard this in the button label:
```tsx
{pile.faceUp !== false ? 'Face up' : 'Face down'}
```
This treats undefined/true as face-up (draw pile cards actually do show face-down by their individual `card.faceUp` anyway).
  </action>
  <verify>
    <automated>cd /Users/aaronkaminsky/code/virtual-deck && npm run typecheck 2>&1 | tail -5</automated>
  </verify>
  <done>TypeScript compiles. PileZone renders a toggle button. Clicking it sends SET_PILE_FACE. All PileZone call sites pass sendAction.</done>
</task>

</tasks>

<verification>
After all three tasks:
1. `npm run typecheck` passes with 0 errors
2. `npm run build` produces a clean bundle (no missing @dnd-kit/sortable)
3. Dev server: drag cards left/right within hand — order updates and persists across refresh
4. Dev server: click "Face up"/"Face down" button under a pile — button text flips for all connected clients
5. Dev server: drag a card to a pile whose setting is "face down" — card arrives face-down
</verification>

<success_criteria>
- `@dnd-kit/sortable` installed and in package.json
- `Pile.faceUp` present in types; REORDER_HAND and SET_PILE_FACE in ClientAction
- Server handles both new actions with validation
- Hand cards reorderable by drag; REORDER_HAND sent on drop
- Each pile has Face up/Face down toggle; SET_PILE_FACE sent on click
- Cards placed on piles inherit pile's faceUp setting
- `npm run typecheck` passes
</success_criteria>

<output>
After completion, create `.planning/quick/260403-pya-hand-reordering-and-per-pile-face-toggle/260403-pya-SUMMARY.md`
</output>
