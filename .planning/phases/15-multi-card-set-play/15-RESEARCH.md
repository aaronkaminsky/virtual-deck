# Phase 15: Multi-Card Set Play - Research

**Researched:** 2026-04-27
**Domain:** dnd-kit sensor configuration, React selection state, PartyKit server action, click/drag disambiguation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Click (short tap — pointerdown + pointerup without crossing the 8px distance threshold) toggles hand card selection. No separate "Select mode."
- **D-02:** Dual-sensor via `useSensors`: `PointerSensor` with `{ distance: 8 }` and `TouchSensor` with `{ delay: 250, tolerance: 5 }`. Both active simultaneously.
- **D-03:** Dragging a selected card drags the entire selection. On drop → `PLAY_CARD_SET` with all selected card IDs and target zone. Atomic.
- **D-04:** Dragging an unselected card when others are selected → clears selection, moves only the dragged card (normal `MOVE_CARD`).
- **D-05:** After a set is successfully dropped, selection state clears automatically.
- **D-06:** Target zone is determined by where the player drops — no "Play N cards" button.
- **D-07:** `PLAY_CARD_SET` action shape: `{ cardIds: string[], fromId: string, toZone: "pile", toId: string }`. Atomic: server removes all from hand and appends to target pile in one mutation.
- **D-08:** Selected hand cards render with `ring-2 ring-primary ring-offset-1 ring-offset-background` and `style={{ transform: 'translateY(-6px)' }}` (or `-translate-y-1.5`) + `transition-transform duration-150`.
- **D-09:** Clicking a selected card deselects it (same toggle mechanism).
- **D-10:** Pressing Escape clears all selection.
- **D-11:** Clicking/tapping anywhere that is not a hand card clears all selection.

### Claude's Discretion

- Exact pixel value for upward lift (≈6px — adjust to taste during implementation)
- Whether a subtle count badge ("N selected") appears near the hand label
- Visual drag preview when dragging a multi-card set (single ghost card vs. stacked ghost showing 2–3 cards offset 4px each)
- Whether `ring-offset-background` is needed for contrast against card art (UI-SPEC says yes: use it)

### Deferred Ideas (OUT OF SCOPE)

- dnd-kit native multi-drag overlay (PLAY-04) — deferred to v1.3+
- "Play N cards" button UI — removed
- Visual set grouping / separator in spread zone (PLAY-05) — future phase
- Action log "Player X played N cards" (PLAY-06) — future phase

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-03 | Player can select 1–5 cards from their hand and play them as a set into their personal zone or the communal zone in one action | Covered fully: selection state, `PLAY_CARD_SET` action, sensor config, UI indicator, and Playwright e2e test plan all documented below |

</phase_requirements>

---

## Summary

Phase 15 adds multi-card set play on top of Phase 14's spread zone infrastructure. The interaction is select-then-drag: the player clicks hand cards to toggle selection, then drags any selected card to a target zone — the entire selection travels with it and a single `PLAY_CARD_SET` action atomically moves all cards server-side.

The codebase is in excellent shape for this. `HandZone.tsx` already uses `useDndMonitor` + `useSortable` with the exact patterns that need extending. `BoardDragLayer.tsx` owns the `DndContext` and its `onDragEnd` is the integration point for detecting a multi-card drag. The server action `PLAY_CARD_SET` is completely new but follows the well-established pattern of `REORDER_HAND` and `MOVE_CARD`.

One pre-existing landmine must be fixed in this phase (or noted for tracking): the Phase 14 Playwright e2e test `spread zone visibility` references `data-testid="spread-zone-spread-communal"` but the actual communal zone ID is `"play"`, producing testid `spread-zone-play`. The test was likely never run against the real server and will fail. This phase's plan should include fixing this stale test assertion.

**Primary recommendation:** Three focused plans — (1) types + server action, (2) client selection state + sensor wiring, (3) Playwright e2e for multi-card set play. Fix the stale spread zone testid as part of plan 3.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Selection toggle (click handler) | Browser / Client | — | Pure ephemeral UI state; never needs to reach the server |
| Sensor configuration (distance/delay threshold) | Browser / Client | — | dnd-kit config; controls pointer event interpretation locally |
| Drag-start multi-card detection | Browser / Client | — | Determined at `onDragStart` by checking `active.id` against selection set |
| PLAY_CARD_SET dispatch | Browser / Client | API / Backend | Client composes and sends; server authorizes and mutates |
| Atomic hand→pile mutation | API / Backend | — | Must be single transaction; server is authoritative |
| STATE_UPDATE broadcast | API / Backend | — | PartyKit `broadcastState()` pattern, unchanged |
| Selection indicator (ring + lift) | Browser / Client | — | CSS/Tailwind applied to hand card wrappers |
| Drag overlay (multi-card ghost) | Browser / Client | — | `DragOverlay` inside `BoardDragLayer`, driven by `activeCard` state |
| Escape / click-outside clear | Browser / Client | — | `useEffect` on document; `onPointerDown` on board container |

---

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Installed Version | Purpose | Source |
|---------|-------------------|---------|--------|
| @dnd-kit/core | 6.3.1 | PointerSensor, TouchSensor, useSensors, DndContext, DragOverlay | [VERIFIED: npm view + node_modules] |
| @dnd-kit/sortable | 10.0.0 | useSortable (SortableHandCard extension) | [VERIFIED: npm view + node_modules] |
| React 18 | 18.3.1 | useState, useEffect, useRef for selection state | [VERIFIED: package.json] |
| TypeScript | 6.0.2 | ClientAction union extension with PLAY_CARD_SET | [VERIFIED: package.json] |
| Tailwind CSS v4 | 4.2.2 | ring-2 ring-primary ring-offset-1 -translate-y-1.5 classes | [VERIFIED: package.json] |
| Vitest | 4.1.2 | Unit tests for PLAY_CARD_SET server handler | [VERIFIED: package.json] |
| @playwright/test | 1.59.1 | e2e test for multi-card select and drag | [VERIFIED: package.json] |

**No new npm dependencies required for this phase.**

---

## Architecture Patterns

### System Architecture Diagram

```
Player clicks hand card
       |
       v
SortableHandCard.onClick
       |
       v
HandZone: selectedIds.toggle(card.id)
  - ring + lift applied to selected cards
  - count badge rendered if |selection| >= 2
       |
  Player drags a card
       |
       v
DndContext.onDragStart (BoardDragLayer)
  - record active card
  - check: is active.id in selectedIds?
       |
  +-----------+------------------+
  | YES                          | NO (and selection non-empty)
  v                              v
  isMultiDrag = true             Clear selectedIds
  activeCard = dragged card      isMultiDrag = false
                                 Normal single-card drag path
       |
  Player drops
       |
       v
DndContext.onDragEnd (BoardDragLayer)
  - isMultiDrag + over resolves to a droppable zone?
       |
  +-----------+------------------+
  | YES (pile zone)              | NO (snap back)
  v                              v
  sendAction(PLAY_CARD_SET)      setActiveCard(null), clear
  selectedIds.clear()
       |
       v
PartyKit server: PLAY_CARD_SET handler
  - validate senderToken owns fromId
  - verify all cardIds are in hand
  - takeSnapshot(state)
  - splice all cards from hand atomically
  - push all to target pile
       |
       v
broadcastState() → STATE_UPDATE to all connections
  - viewFor() masks hands per connection
  - spread zone cards are fully visible (faceUp=true)
```

### Recommended Project Structure (no new folders needed)

```
src/
├── components/
│   ├── HandZone.tsx       # Add: onClick handler, selectedIds state, dual-sensor prop-threading, count badge
│   ├── BoardDragLayer.tsx # Add: useSensors call, isMultiDrag detection, PLAY_CARD_SET dispatch path
│   └── CardOverlay.tsx    # Optional: stacked ghost variant for multi-card drag preview
├── shared/
│   └── types.ts           # Add: PLAY_CARD_SET to ClientAction union
party/
└── index.ts               # Add: PLAY_CARD_SET case in onMessage switch
tests/
└── playCardSet.test.ts    # New: unit tests for PLAY_CARD_SET handler
playwright/
└── game.spec.ts           # Extend: multi-card set play e2e + fix stale spread-communal assertion
```

### Pattern 1: Sensor Configuration (new to this project)

**What:** `useSensors` composes multiple sensor descriptors. The `DndContext` `sensors` prop accepts them.

**When to use:** When the default sensor (no constraint) needs to be replaced with explicit activation thresholds.

```typescript
// Source: @dnd-kit/core node_modules dist/sensors/pointer/AbstractPointerSensor.d.ts [VERIFIED]
import { useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
);

// Pass to DndContext:
<DndContext sensors={sensors} ...>
```

**Critical integration point:** `useSensors` must be called inside the component that renders `DndContext`. That component is `BoardDragLayer`. The sensors go on the `DndContext` element, not on individual `useSortable` calls.

**Impact on existing behavior:** Replacing the default (no constraint) sensor with `{ distance: 8 }` means a card drag won't start until the pointer moves 8px. This is the mechanism that makes click-to-select work — pointerdown+pointerup within 8px is treated as a click, not a drag.

### Pattern 2: Click Handler in SortableHandCard

**What:** Attach an `onClick` handler to the `SortableHandCard` wrapper div. Because `useSortable` attaches pointer listeners to the inner `ref` element, the outer wrapper div is the correct place for a click handler without interference from dnd-kit.

**The key insight:** With `activationConstraint: { distance: 8 }`, dnd-kit does NOT suppress `onClick` events that don't cross the threshold. The browser fires the standard click event as normal. No custom tap detection is needed.

```typescript
// [VERIFIED: dnd-kit AbstractPointerSensor behavior from source inspection]
// Wrapper div handles click, inner div (setNodeRef) handles drag
function SortableHandCard({ card, isSelected, onToggleSelect, ... }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ ... });

  return (
    <div
      className={cn('relative w-[63px] h-[88px] flex-shrink-0', index > 0 ? '-ml-5' : '')}
      onClick={() => onToggleSelect(card.id)}
      onPointerDown={(e) => e.stopPropagation()}  // D-11: prevent click-outside from firing
    >
      <div
        ref={setNodeRef}
        style={{ ...style, transform: isSelected ? 'translateY(-6px)' : CSS.Transform.toString(transform) }}
        className={cn(isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md transition-transform duration-150')}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </div>
  );
}
```

**Warning:** `transform` from `useSortable` and the selection `translateY(-6px)` must not overwrite each other. When `isSelected`, use the selection transform. When `!isSelected` and `isDragging`, use `undefined` (existing behavior). When `!isSelected` and `!isDragging`, use `CSS.Transform.toString(transform)`.

### Pattern 3: Selection State Architecture

**What:** `useState<Set<string>>` holds the set of selected card IDs.

**Where it lives:** Inside `HandZone` (preferred per CONTEXT.md and UI-SPEC.md). Lift to `BoardDragLayer` only if the drag handler needs to read it and prop-drilling from HandZone is too awkward.

**Why `BoardDragLayer` needs the selection set:** `onDragEnd` in `BoardDragLayer` must know whether the dragged card is part of a selection. Two viable approaches:

**Option A (preferred): Ref forwarding / callback prop**
`HandZone` maintains `selectedIds` in local state and passes a ref or callback to `BoardDragLayer` via a prop. `BoardDragLayer`'s `onDragStart` checks the selection via a ref.

**Option B: Lift to `BoardDragLayer`**
`selectedIds` lives in `BoardDragLayer`. `HandZone` receives it as a prop along with `onToggleSelect`. `onDragEnd` reads it directly.

Option B is simpler and avoids ref gymnastics. `BoardDragLayer` already manages `activeCard` state, `pendingMove` state, and `dragDataRef` — adding `selectedIds` is consistent with its role as the drag orchestrator.

```typescript
// In BoardDragLayer (Option B pattern)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

function handleDragStart(event: DragStartEvent) {
  const data = event.active.data.current as { card?: Card; fromZone?: string } | undefined;
  if (!data?.card) return;
  // D-04: if dragging unselected card when others are selected, clear selection
  if (!selectedIds.has(String(event.active.id))) {
    setSelectedIds(new Set());
  }
  // ... rest of existing handleDragStart
}

function handleDragEnd(event: DragEndEvent) {
  const isMultiDrag = selectedIds.size > 1 && selectedIds.has(String(event.active.id));
  // ... new PLAY_CARD_SET dispatch path (see Pattern 5)
}
```

### Pattern 4: Click-Outside and Escape Clear (D-10, D-11)

**Click-outside:** `onPointerDown` on the board container clears selection. Hand card wrappers stop propagation to prevent this from firing when clicking a card.

```typescript
// In BoardDragLayer or BoardView — wrapping div
<div onPointerDown={() => setSelectedIds(new Set())}>
  {/* board content */}
  {/* HandZone cards call stopPropagation on their wrapper onPointerDown */}
</div>
```

**Escape key:**
```typescript
// In the component that owns selectedIds
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') setSelectedIds(new Set());
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Conflict check:** No existing keyboard shortcuts are registered in this application (`Escape` is used by the pile insert dialog via Radix/base-ui Dialog, but that dialog `open` state is local — `Escape` clearing selection while the dialog is open is harmless since the dialog handles its own Escape independently). [VERIFIED: BoardDragLayer.tsx, no global keydown handlers registered]

### Pattern 5: PLAY_CARD_SET Dispatch in onDragEnd

The existing `handleDragEnd` in `BoardDragLayer` has a well-defined decision tree. The multi-card path slots in as an early-exit branch:

```typescript
function handleDragEnd(event: DragEndEvent) {
  const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
  const activeId = String(event.active.id);
  const isMultiDrag = selectedIds.size > 1 && selectedIds.has(activeId);

  // NEW: multi-card set play path
  if (isMultiDrag && event.over && overData?.toZone === 'pile') {
    setActiveCard(null);
    setSelectedIds(new Set());
    setDragging(false);
    dragDataRef.current = null;
    sendAction({
      type: 'PLAY_CARD_SET',
      cardIds: [...selectedIds],
      fromId: playerId,  // always from sender's own hand
      toZone: 'pile',
      toId: overData.toId,
    });
    return;
  }

  // existing single-card logic continues...
}
```

**Spread zone detection:** The existing code already knows a target is a spread zone (`targetPile?.region === 'spread'`) and skips the insert-position dialog for spread zones. `PLAY_CARD_SET` targets are always spread zones per the phase design, so no dialog is needed.

**PLAY_CARD_SET to pile (non-spread):** Per D-06, any droppable zone is valid. If the user drags a set onto a regular (non-spread) pile, the current design skips the insert-position dialog for multi-card sets — atomically appending all cards to the top is the only viable semantic. The dialog mechanic doesn't generalize cleanly to N cards.

### Pattern 6: PLAY_CARD_SET Server Handler

Model: same structure as `MOVE_CARD` but operates on an array of card IDs atomically.

```typescript
case "PLAY_CARD_SET": {
  const { cardIds, fromId, toZone, toId } = action;

  // Authorization: sender can only play from their own hand
  if (fromId !== senderToken) {
    sender.send(JSON.stringify({ type: "ERROR", code: "UNAUTHORIZED_MOVE", message: "Cannot play another player's cards" } satisfies ServerEvent));
    break;
  }

  const hand = this.gameState.hands[fromId];
  if (!hand) {
    sender.send(JSON.stringify({ type: "ERROR", code: "HAND_NOT_FOUND", message: `No hand found for player: ${fromId}` } satisfies ServerEvent));
    break;
  }

  // Validate all cardIds exist in hand before mutating anything
  const cardIdSet = new Set(cardIds);
  const cardsToPlay = cardIds.map(id => hand.find(c => c.id === id)).filter(Boolean) as Card[];
  if (cardsToPlay.length !== cardIds.length) {
    sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_SOURCE", message: "One or more card IDs not found in hand" } satisfies ServerEvent));
    break;
  }

  const dest = toZone === "hand"
    ? (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []))
    : this.gameState.piles.find(p => p.id === toId)?.cards;

  if (dest === undefined) {
    sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", message: `No pile found with id: ${toId}` } satisfies ServerEvent));
    break;
  }

  takeSnapshot(this.gameState);

  // Atomic: remove all cards from hand in one pass
  this.gameState.hands[fromId] = hand.filter(c => !cardIdSet.has(c.id));

  // Set faceUp state based on destination pile
  const destPile = this.gameState.piles.find(p => p.id === toId);
  cardsToPlay.forEach(card => {
    card.faceUp = destPile?.faceUp ?? true;
  });

  // Append to destination
  dest.push(...cardsToPlay);
  break;
}
```

**Atomicity guarantee:** The hand filter and dest push both happen before `persist()` and `broadcastState()`. There is no await between them. If an error is found before `takeSnapshot`, nothing is mutated. [ASSUMED: Cloudflare Workers single-threaded execution means no interleaving between these synchronous operations]

### Anti-Patterns to Avoid

- **Hand-rolling click detection:** Don't track pointerdown/pointerup timings manually. With `activationConstraint: { distance: 8 }`, dnd-kit does not fire drag events for taps under 8px movement — the browser click event fires normally.
- **Putting selection state in zustand:** Selection is ephemeral UI state that clears on drag, escape, and click-outside. Zustand adds no value here; `useState` is correct.
- **Calling `arrayMove` in `onDragEnd` for multi-card sets:** `arrayMove` reorders within the same array. Multi-card plays target a different pile. Only single-card hand reorders use `arrayMove`.
- **Showing the insert-position dialog for PLAY_CARD_SET:** Multi-card drops to spread zones bypass the dialog (all spread zones do). If the target is a regular pile, still skip the dialog and insert at top — the dialog UX doesn't extend to N-card moves.
- **Racing between HandZone's `useDndMonitor` and BoardDragLayer's `onDragEnd`:** The existing codebase handles intra-hand reorder entirely in `HandZone.useDndMonitor` and spread reorder in `SpreadZone.useDndMonitor`. The `PLAY_CARD_SET` dispatch belongs in `BoardDragLayer.handleDragEnd` (not in a second `useDndMonitor`) — same location as `MOVE_CARD` and `PASS_CARD`. This prevents the GAP-06 race that was already fixed for spread reorders.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tap vs drag detection | Custom pointerdown/up timer logic | `PointerSensor activationConstraint: { distance: 8 }` | dnd-kit handles threshold; browser fires native click event for taps | [VERIFIED: dnd-kit source] |
| Touch drag detection | Manual touchstart/touchmove tracking | `TouchSensor activationConstraint: { delay: 250, tolerance: 5 }` | dnd-kit TouchSensor abstracts this correctly | [VERIFIED: dnd-kit dist] |
| Immutable set operations | Manual array filter + spread | `new Set()`, `Set.has()`, `Set.delete()` | Built-in, no library needed |
| Atomic server mutation | Multiple sequential MOVE_CARD actions | `PLAY_CARD_SET` single handler with array filter + push | Sequential actions are not atomic; server could broadcast partial state between them |

---

## Current Codebase State (Exact Findings)

### HandZone.tsx

[VERIFIED: full file read]

- Uses `useDroppable`, `useDndMonitor`, `useDndContext` from `@dnd-kit/core`
- Uses `SortableContext`, `useSortable`, `horizontalListSortingStrategy`, `arrayMove` from `@dnd-kit/sortable`
- `SortableHandCard` renders: outer wrapper div (positioning + overlap margin), inner div with `setNodeRef`, `listeners`, `attributes` (the draggable element)
- `useDndMonitor` in `HandZone` handles only `onDragEnd` for intra-hand reorder → sends `REORDER_HAND`
- **No `useSensors` call anywhere in the project** — this phase introduces the first one
- **No `onClick` on any hand card** — this phase adds the first
- Props: `cards`, `playerId`, `displayName`, `connected`, `sendAction`, `draggingCardId`
- New props needed: `selectedIds: Set<string>`, `onToggleSelect: (id: string) => void`

### BoardDragLayer.tsx

[VERIFIED: full file read]

- Owns `DndContext` with `collisionDetection`, `onDragStart`, `onDragEnd`, `onDragCancel`
- `handleDragStart`: reads `event.active.data.current`, sets `activeCard`, calls `setDragging(true)`
- `handleDragEnd`: full decision tree — handReorder, passCard, spreadZone, pileDialog, handDrop paths
- `DragOverlay`: renders `CardOverlay` with single `activeCard` — multi-card ghost is a new rendering variant here
- State: `activeCard`, `pendingMove`, refs: `dragDataRef`, `dropSuccessRef`, `snapBackTimerRef`
- **The `sensors` prop on `DndContext` is currently absent** — adding `useSensors` here wires dual-sensor

### SpreadZone.tsx

[VERIFIED: full file read]

- `useDroppable` with `id: 'pile-${pile.id}'` and `data: { toZone: 'pile', toId: pile.id }`
- `useDndMonitor` handles intra-spread reorder only — no changes needed for PLAY_CARD_SET
- **No changes needed to SpreadZone to receive played sets** — it is already a valid drop target

### BoardView.tsx

[VERIFIED: full file read]

- Renders `HandZone` at the bottom with `cards={gameState.myHand}` and `sendAction`
- `communalZone` found by `piles.find(p => p.id === 'play')` — testid will be `spread-zone-play`
- **No `onPointerDown` on the board container** — needs to be added for D-11 click-outside clearing

### types.ts

[VERIFIED: full file read]

- `ClientAction` union currently has 10 members; `PLAY_CARD_SET` is not in it
- `ClientPile` and `ClientGameState` require no changes for this phase
- Add to `ClientAction`:
  ```typescript
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
  ```

### party/index.ts

[VERIFIED: full file read]

- `switch (action.type)` with 10 cases; `PLAY_CARD_SET` case is missing
- `takeSnapshot` → mutate → `persist()` → `broadcastState()` pattern is consistent across all action handlers
- `RESET_TABLE` demonstrates bulk array mutation (similar pattern)
- The `broadcastState()` / `viewFor()` pipeline requires no changes — spread zone cards are already fully visible

---

## Pre-Existing Landmine: Stale Playwright Assertion

[VERIFIED: game.spec.ts lines 123–124, SpreadZone.tsx line 92, party/index.ts line 38]

The Phase 14 Playwright test `spread zone visibility` contains:
```typescript
await expect(p1.getByTestId('spread-zone-spread-communal')).toBeVisible();
await expect(p2.getByTestId('spread-zone-spread-communal')).toBeVisible();
```

The actual communal zone has `id: "play"` (from `defaultGameState`). The `data-testid` rendered by `SpreadZone` is `spread-zone-${pile.id}` = **`spread-zone-play`**, not `spread-zone-spread-communal`.

Additionally, these lines in the same test use `[data-testid^="spread-zone-spread-"]` — this prefix selector will match personal zones (`spread-zone-spread-{playerId}`) but NOT the communal zone (`spread-zone-play`). The communal zone comment in the test is therefore also wrong.

**Impact:** This test will fail at runtime against a real server. Phase 15 plan should include fixing these two assertions as part of the e2e plan. The fix is straightforward: change `spread-zone-spread-communal` to `spread-zone-play` and update the comment.

---

## Common Pitfalls

### Pitfall 1: Transform Overwrite Between Selection Lift and Sortable Transform

**What goes wrong:** `useSortable` returns a `transform` CSS object for sortable positioning. Applying `translateY(-6px)` for selection via `CSS.Transform.toString(transform)` concatenation may not produce the expected visual result, or the sortable repositioning may override the selection lift.

**Why it happens:** `CSS.Transform.toString` from `@dnd-kit/utilities` produces a single CSS `transform` string. If you prepend `translateY(-6px)` to it, the browser applies transforms left-to-right. However, during sorting animations (when dnd-kit is moving the ghost back), the `transform` from `useSortable` changes rapidly and the selection lift must be preserved separately.

**How to avoid:** When `isSelected`, use `style={{ transform: 'translateY(-6px)' }}` as the only transform (ignoring the sortable transform — selected cards shouldn't participate in sortable repositioning anyway). When `!isSelected && isDragging`, use `undefined`. When `!isSelected && !isDragging`, use `CSS.Transform.toString(transform)`. This matches the existing `isDragging ? undefined : CSS.Transform.toString(transform)` pattern.

**Warning signs:** Selected cards jumping or snapping during another card's drag.

### Pitfall 2: useDndMonitor Race in HandZone vs BoardDragLayer

**What goes wrong:** If `PLAY_CARD_SET` is dispatched from `HandZone.useDndMonitor` AND there's logic in `BoardDragLayer.handleDragEnd`, both fire on the same drag end event, potentially sending two actions.

**Why it happens:** `useDndMonitor` fires on every drag end across the entire `DndContext` subtree. It does not know whether the parent has already handled the event.

**How to avoid:** `PLAY_CARD_SET` dispatch lives ONLY in `BoardDragLayer.handleDragEnd`, NOT in `HandZone.useDndMonitor`. The `HandZone.useDndMonitor` is kept for intra-hand reorder only (same as today). This is the same solution that fixed GAP-06 for spread reorders.

**Warning signs:** Double PLAY_CARD_SET messages sent to server; cards moved twice; undo snapshot out of sync.

### Pitfall 3: Selection Persisting After Single-Card Drag (D-04)

**What goes wrong:** Player selects 2 cards, then drags a third (unselected) card. Both the third card AND the selected 2 move.

**Why it happens:** `handleDragStart` doesn't clear the selection set before the drag resolves.

**How to avoid:** In `handleDragStart`, check `selectedIds.has(activeId)`. If false AND `selectedIds.size > 0`, call `setSelectedIds(new Set())` immediately. By the time `handleDragEnd` fires, `selectedIds` is empty and the normal `MOVE_CARD` path is taken.

**Warning signs:** Multi-card set play triggered unexpectedly during what should be a single-card drag.

### Pitfall 4: PLAY_CARD_SET to Opponent's Hand Zone

**What goes wrong:** An opponent-hand drop zone (`toZone: 'opponent-hand'`) receives a multi-card set drag, leading to dispatching `PLAY_CARD_SET` with `toZone: 'opponent-hand'` which the server doesn't handle.

**Why it happens:** The collision detection `customCollision` in `BoardDragLayer` can return an opponent-hand zone as the drop target. The `isPassCard` branch in `handleDragEnd` checks `overData?.toZone === 'opponent-hand'`.

**How to avoid:** In the multi-card path, only dispatch `PLAY_CARD_SET` when `overData?.toZone === 'pile'`. If `overData?.toZone === 'opponent-hand'`, fall through to the single-card pass behavior (which means: clear selection, move only the dragged card via `PASS_CARD`, or do nothing). Passing a multi-card set to an opponent's hand is not a defined behavior in this phase.

**Warning signs:** Server receives `PLAY_CARD_SET` with `toZone: 'opponent-hand'`; falls through all cases in switch; state not updated.

### Pitfall 5: activationConstraint Breaks Existing Single-Card Drag Feel

**What goes wrong:** After adding `PointerSensor` with `distance: 8`, drag initiation feels noticeably laggy or fails entirely on slow pointer events.

**Why it happens:** 8px is a small but measurable threshold. The drag activation is deferred until the pointer moves 8px from the initial position. On mouse, this is instantaneous in practice. On touchscreens (which use `TouchSensor` with a 250ms delay), the behavior is already intentionally different.

**How to avoid:** 8px is the value from D-02. Keep it. This matches the distance threshold used by native browser drag-and-drop and is imperceptible during normal drag gestures.

**Warning signs:** Testers report "drag doesn't start" — usually means the pointer didn't move 8px before releasing, i.e., the click-to-select is working correctly.

---

## Code Examples

### Verified: useSensor / useSensors API

```typescript
// Source: @dnd-kit/core 6.3.1 — node_modules/@dnd-kit/core/dist/core.esm.js [VERIFIED]
import { useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';

// Called inside the component body, before JSX return:
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  }),
);

// Pass to DndContext:
<DndContext sensors={sensors} collisionDetection={...} ...>
```

### Verified: PLAY_CARD_SET ClientAction type addition

```typescript
// Source: src/shared/types.ts — current union pattern [VERIFIED]
export type ClientAction =
  | { type: "MOVE_CARD"; ... }
  | { type: "REORDER_HAND"; orderedCardIds: string[] }
  // ... existing members ...
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
  | { type: "PING" };
```

### Verified: Existing onDragEnd decision tree entry point

```typescript
// Source: src/components/BoardDragLayer.tsx handleDragEnd [VERIFIED]
// Current: isHandReorder, isHandMissed, isPassCard, isSuccess branches
// New branch inserts BEFORE isPassCard check:

const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(String(event.active.id)) &&
  !!event.over &&
  event.over.data.current?.toZone === 'pile';

if (isMultiCardSet) {
  // ... dispatch PLAY_CARD_SET, clear state, return early
}
// existing logic continues unmodified
```

### Verified: Selection indicator Tailwind classes (from UI-SPEC)

```typescript
// Source: 15-UI-SPEC.md [VERIFIED — file read in this session]
// ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md transition-transform duration-150
// style={{ transform: 'translateY(-6px)' }}
// aria-pressed={isSelected}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 drag API | dnd-kit PointerSensor | v1.0 (Phase 3) | Touch support, z-index control |
| No explicit sensor config | useSensors with activationConstraint | This phase | Enables click-to-select by gating drag intent |
| No multi-card actions | PLAY_CARD_SET atomic server action | This phase | Single-step set play; server remains authoritative |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudflare Workers single-threaded execution makes synchronous mutations within one `onMessage` call atomic (no interleaving with another connection's message) | Pattern 6 (PLAY_CARD_SET handler) | If not true, a race could produce partial hand removal; in practice Cloudflare Workers are single-threaded per isolate — LOW risk |
| A2 | `dnd-kit` does not suppress the native browser `click` event when `activationConstraint: { distance: 8 }` and the pointer didn't travel 8px | Pattern 2 (click handler) | If wrong, click-to-select would never fire — but source code inspection of `AbstractPointerSensor` shows it only intercepts pointer events, not click events [VERIFIED: source inspected, confidence HIGH] |

---

## Open Questions

1. **Multi-card drag ghost: single vs stacked**
   - What we know: UI-SPEC says "stacked ghost showing 2–3 cards offset by 4px each" is preferred; "fall back to single-card ghost if implementation cost is high"
   - What's unclear: `DragOverlay` renders a single child. Stacked ghost requires rendering multiple `CardFace`/`CardBack` elements with absolute positioning inside the overlay.
   - Recommendation: Attempt the stacked ghost. `CardOverlay` is trivially modified to accept `cards: Card[]` and render 2–3 cards with `position: absolute` and `translateX/Y` offsets. If it causes overlay sizing issues, fall back to single-card ghost.

2. **PLAY_CARD_SET to non-spread pile (e.g., Draw or Discard)**
   - What we know: D-06 says "any droppable zone is a valid target." Draw and Discard are droppable.
   - What's unclear: Should multi-card set play to a regular (stacked) pile bypass the insert-position dialog? The dialog doesn't generalize to N cards.
   - Recommendation: Bypass the dialog; insert all cards at the top. This is consistent with the spread zone behavior and avoids UX complexity for an edge case.

3. **Stale Playwright test: who fixes it?**
   - What we know: `spread-zone-spread-communal` testid doesn't exist; actual testid is `spread-zone-play`.
   - What's unclear: Is this fix part of Phase 14 retroactive cleanup or Phase 15 e2e work?
   - Recommendation: Fix it in Phase 15's e2e plan (plan 3). It's a one-line change, and it must be fixed before Phase 15's new e2e test can run in the same suite without that test contaminating CI.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tools confirmed installed from package.json verification)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (unit) + Playwright 1.59.1 (e2e) |
| Unit config file | none standalone — runs via `vitest` which auto-detects |
| Unit quick run | `npm test` |
| Unit full suite | `npm test` |
| E2e quick run | `npx playwright test --project=chromium` |
| E2e full suite | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-03 | PLAY_CARD_SET server: removes all cardIds from hand atomically | unit | `npm test -- tests/playCardSet.test.ts` | ❌ Wave 0 |
| PLAY-03 | PLAY_CARD_SET server: rejects when any cardId not in hand (no partial move) | unit | `npm test -- tests/playCardSet.test.ts` | ❌ Wave 0 |
| PLAY-03 | PLAY_CARD_SET server: rejects UNAUTHORIZED_MOVE when fromId != senderToken | unit | `npm test -- tests/playCardSet.test.ts` | ❌ Wave 0 |
| PLAY-03 | PLAY_CARD_SET server: appends cards to target pile faceUp matching pile.faceUp | unit | `npm test -- tests/playCardSet.test.ts` | ❌ Wave 0 |
| PLAY-03 | PLAY_CARD_SET server: takes snapshot before mutation | unit | `npm test -- tests/playCardSet.test.ts` | ❌ Wave 0 |
| PLAY-03 | Selection toggle: clicking hand card adds/removes from selection | e2e | `npx playwright test --grep "selection toggle"` | ❌ Wave 0 |
| PLAY-03 | Multi-card drag: selected cards move to spread zone together | e2e | `npx playwright test --grep "multi-card set play"` | ❌ Wave 0 |
| PLAY-03 | Both players see moved cards in real time after PLAY_CARD_SET | e2e | `npx playwright test --grep "multi-card set play"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/playCardSet.test.ts` — covers all PLAY-03 server unit tests
- [ ] `playwright/game.spec.ts` — fix stale `spread-zone-spread-communal` assertions (lines 123–124), add multi-card set play e2e scenario

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `fromId !== senderToken` guard in PLAY_CARD_SET (same as MOVE_CARD) |
| V5 Input Validation | yes | Validate `cardIds` array: each ID must exist in sender's hand before any mutation |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Player submits cardIds from another player's hand | Spoofing/Tampering | `fromId !== senderToken` authorization check; reject with UNAUTHORIZED_MOVE |
| Player submits invalid/nonexistent cardIds | Tampering | Pre-validate all IDs against hand before `takeSnapshot`; reject with CARD_NOT_IN_SOURCE |
| Player submits empty cardIds array | Tampering | Guard: `cardIds.length === 0` → reject with INVALID_ACTION (or handle as no-op) |
| Player submits >5 cardIds (exceeds stated max) | Tampering | Per PLAY-03 spec, the 1–5 limit is a UI constraint only. Server need not enforce the upper bound — the worst outcome is playing more than 5 cards, which has no security implication in a sandbox game. [ASSUMED] |

---

## Sources

### Primary (HIGH confidence)

- `src/components/HandZone.tsx` — full file read; useSortable, useDndMonitor, useDroppable patterns confirmed
- `src/components/BoardDragLayer.tsx` — full file read; DndContext, onDragEnd, DragOverlay, sensor-less setup confirmed
- `src/components/SpreadZone.tsx` — full file read; useDroppable shape confirmed (no changes needed)
- `src/components/BoardView.tsx` — full file read; HandZone integration point and communal zone lookup confirmed
- `src/shared/types.ts` — full file read; ClientAction union, all existing fields confirmed
- `party/index.ts` — full file read; all action handlers, takeSnapshot, broadcastState patterns confirmed
- `tests/moveCard.test.ts`, `tests/spreadZoneCreation.test.ts` — full file read; test patterns confirmed
- `playwright/game.spec.ts`, `playwright/fixtures.ts` — full file read; stale assertion and twoPlayerRoom fixture confirmed
- `node_modules/@dnd-kit/core/dist/sensors/pointer/AbstractPointerSensor.d.ts` — `PointerActivationConstraint` type (DistanceConstraint, DelayConstraint) confirmed [VERIFIED]
- `node_modules/@dnd-kit/core/dist/components/DndContext/DndContext.d.ts` — `sensors?: SensorDescriptor<any>[]` prop confirmed [VERIFIED]
- `node_modules/@dnd-kit/core/dist/core.esm.js` — `useSensors`, `PointerSensor`, `TouchSensor` exports confirmed [VERIFIED]
- `package.json` — all dependency versions confirmed [VERIFIED]

### Secondary (MEDIUM confidence)

- CONTEXT.md, UI-SPEC.md — design decisions and visual spec; these are project-internal documents, treated as ground truth

### Tertiary (LOW confidence — not needed for this phase)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules and package.json
- Architecture: HIGH — all component patterns verified via direct file reads
- Pitfalls: HIGH (click/drag disambiguation, transform overwrite) — verified via source inspection; MEDIUM (multi-sensor interaction) — based on pattern matching with dnd-kit docs
- Server action pattern: HIGH — mirrors existing MOVE_CARD structure directly

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable libraries; PartyKit API has historically changed but no active migration signals)
