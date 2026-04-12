# Phase 3: Core Board - Research

**Researched:** 2026-04-02
**Domain:** React drag-and-drop card UI, dnd-kit, CSS card rendering, PartyKit server state mutation
**Confidence:** HIGH (stack verified against live npm registry and official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Cards are CSS-rendered in Phase 3. No image files required.
- **D-02:** Face card style: classic playing card — white/off-white face, rank in top-left and bottom-right corners, large suit symbol centered. Red (#dc2626 or similar) for hearts/diamonds; high-contrast color for spades/clubs.
- **D-03:** Card back: crosshatch/pattern CSS (repeating diagonal lines or diamond grid). No image needed — pure CSS.
- **D-04:** card-art.ts URL hooks (`CARD_BACK_URL`, `CARD_FACE_URL`) preserved and wired to Card component. Empty string = CSS rendering; non-empty = image takes precedence.
- **D-05:** Player's own hand: fixed bottom strip anchored to viewport bottom. Full card height visible, horizontally scrollable on overflow.
- **D-06:** Opponent hands: top strip. One row of face-down card backs per opponent. Count from `opponentHandCounts`. Label: "Player" (no names until PRES-01).
- **D-07:** Pile zones: horizontal row centered between opponent strip and player hand. Each pile shows name and card count badge.
- **D-08:** Board transitions immediately from lobby when `gameState` is available — no "Start Game" button.
- **D-09:** Phase 3 hardcodes three piles: `draw`, `discard`, `play`. Match `Pile` type in `shared/types.ts`.
- **D-10:** Server initializes piles in `defaultGameState`: draw pile = full shuffled 52-card deck; discard and play start empty.
- **D-11:** Pile labels: "Draw", "Discard", "Play Area" (derived from pile `name` field).
- **D-12:** Optimistic updates — card removed from source in local state on drag start. Server confirms; error = snap back.
- **D-13:** Server update freeze during drag — incoming `STATE_UPDATE` messages buffered while drag active. Applied after `onDragEnd` resolves.
- **D-14:** Valid drop targets: pile zones and player's own hand strip. Drop on opponent hand, empty board space, or outside zone cancels drag and returns card to source.
- **D-15:** Use `@dnd-kit/core`. `DragOverlay` for floating card ghost. `useDroppable` for pile zones and hand. `useDraggable` for individual cards.
- **D-16:** Drag ghost: full card clone via `DragOverlay`, scaled ~5-10% (`transform: scale(1.07)`).
- **D-17:** Post-drop: card animates into destination with brief slide-in (CSS transition, ~100–150ms ease-out).
- **D-18:** Flip and shuffle animations are out of scope for Phase 3.
- **D-19:** Add `MOVE_CARD` action to `ClientAction` in `shared/types.ts`:
  ```typescript
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string }
  ```

### Claude's Discretion

- Exact card dimensions and aspect ratio (standard ~63×88mm ratio, scaled to fit layout)
- CSS implementation details for crosshatch card back
- Hand horizontal scroll vs fan layout (implement whichever is cleaner with dnd-kit)
- Whether pile zones show a visual "hover" highlight when a card is dragged over them
- Stack offset rendering for piles with many cards (slight visual depth vs flat icon + count)

### Deferred Ideas (OUT OF SCOPE)

- Flip animation (belongs with CARD-03 in Phase 4)
- Shuffle animation (belongs with CTRL-02 in Phase 4)
- Player-configurable pile zones
- Fan layout for player hand (Phase 5 polish)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TABLE-01 | Shared table supports multiple configurable pile/zone types (draw pile, discard pile, open play area) | D-09/D-10/D-11 decide this; server adds `play` pile to `defaultGameState`; PileZone component renders each pile |
| TABLE-02 | Card count is visible to all players for each pile on the table | `piles[].cards.length` available in `ClientGameState.piles`; render with shadcn Badge |
| TABLE-03 | Opponent hand card counts are visible to all players (face values are not) | `opponentHandCounts` already in `ClientGameState`; render N face-down card backs in opponent strip |
| CARD-01 | Player can drag-and-drop cards between their hand, table zones, and piles | dnd-kit `useDraggable`/`useDroppable`/`DragOverlay` + `MOVE_CARD` action + optimistic local state |
| CARD-02 | Player can draw a card from the top of any pile (shared table pile) | Drag from pile to hand triggers `MOVE_CARD` with fromZone="pile"; existing `DRAW_CARD` action covers keyboard/click draw path |
</phase_requirements>

---

## Summary

Phase 3 adds the interactive game board: CSS-rendered cards, pile zones, player hand, opponent hands (backs only), and drag-and-drop card movement. The codebase is already well-structured for this — `ClientGameState` contains all needed data (`myHand`, `opponentHandCounts`, `piles`), the server's per-connection broadcast pattern is established, and shadcn + Tailwind v4 are in place.

The primary new dependency is `@dnd-kit/core` (v6.3.1 verified in npm registry). It is not yet installed. The drag layer requires careful integration: `DragOverlay` renders a floating ghost outside normal DOM flow, preventing z-index and overflow issues. The server-update-freeze pattern (D-13) must be implemented in `usePartySocket` or a wrapper so incoming `STATE_UPDATE` messages are buffered during active drag and applied on drag end. This is the most architecturally novel piece.

The server needs two changes: add `play` pile to `defaultGameState` (currently only `draw` and `discard` exist), and add a `MOVE_CARD` handler that atomically moves a card between any hand and pile, then broadcasts the updated state per-connection via the established `viewFor` pattern.

**Primary recommendation:** Build in this order — (1) install @dnd-kit/core, (2) server: add `play` pile + `MOVE_CARD` handler + tests, (3) shared types: add `MOVE_CARD` to `ClientAction`, (4) CSS card component, (5) board layout components, (6) drag layer with buffer/optimistic pattern, (7) wire `App.tsx` to show board when `gameState` is non-null.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 (verified) | DndContext, useDraggable, useDroppable, DragOverlay | Pointer-events based, touch-friendly, no HTML5 drag API quirks. Decided in CLAUDE.md. |
| @dnd-kit/utilities | 3.2.2 (verified) | CSS.Translate.toString() helper for transform | Reduces boilerplate in draggable transform style |
| React 18 | 18.3.1 (installed) | Component tree | Already in project |
| TypeScript 6 | 6.0.2 (installed) | Type safety | Already in project |
| Tailwind v4 | 4.2.2 (installed) | Utility CSS | Already in project |
| shadcn Badge | installed | Pile card count badge | Already in src/components/ui/badge.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/sortable | 10.0.0 (verified, NOT needed in Phase 3) | Sortable list presets | Not needed — Phase 3 uses free-form drag between zones, not sortable lists |
| tw-animate-css | 1.4.0 (installed) | CSS animation utilities | Post-drop slide-in transition can use Tailwind transition classes or this library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-beautiful-dnd | Archived/deprecated. Do not use. |
| @dnd-kit/core | HTML5 native drag API | Poor z-index behavior, no touch support. |
| CSS card rendering | SVG cards | SVG is more complex, no benefit at Phase 3 scale |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

**Version verification (run before writing code):**
```bash
npm view @dnd-kit/core version   # 6.3.1
npm view @dnd-kit/utilities version  # 3.2.2
```

## Architecture Patterns

### Recommended Component Structure
```
src/
├── components/
│   ├── BoardView.tsx          # Top-level board; conditionally shown when gameState non-null
│   ├── BoardDragLayer.tsx     # DndContext wrapper + onDragStart/End/Cancel handlers
│   ├── PileZone.tsx           # Single pile: useDroppable, card count badge, pile name
│   ├── HandZone.tsx           # Player's hand: useDroppable container + scrollable card row
│   ├── OpponentHand.tsx       # Opponent hand: N face-down backs + count label
│   ├── DraggableCard.tsx      # Card with useDraggable attached; delegates to CardFace/CardBack
│   ├── CardFace.tsx           # Pure presentational: CSS face card (rank/suit)
│   ├── CardBack.tsx           # Pure presentational: CSS crosshatch back
│   └── CardOverlay.tsx        # Used inside DragOverlay — same as CardFace but no dnd hooks
├── hooks/
│   ├── usePartySocket.ts      # EXISTING — needs buffer/freeze extension
│   ├── usePlayerId.ts         # EXISTING — unchanged
│   └── useDragBuffer.ts       # NEW — manages drag active state + buffered state updates
└── shared/
    └── types.ts               # EXISTING — add MOVE_CARD to ClientAction
```

### Pattern 1: Optimistic Drag with Server-Update Buffer (D-12, D-13)

**What:** On `onDragStart`, set `isDragging = true` and apply optimistic local state (remove card from source). Incoming `STATE_UPDATE` WebSocket messages are held in a ref buffer. On `onDragEnd`, send `MOVE_CARD` action to server, flush buffer (apply most-recent buffered state or wait for server confirmation), and set `isDragging = false`.

**When to use:** Any time a drag is active. This prevents incoming state from teleporting cards during drag.

**Implementation approach:**
```typescript
// In usePartySocket or a useDragBuffer wrapper:
const bufferRef = useRef<ClientGameState | null>(null);
const isDraggingRef = useRef(false);

// In WebSocket message handler:
ws.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  if (event.type === 'STATE_UPDATE') {
    if (isDraggingRef.current) {
      bufferRef.current = event.state; // buffer, don't apply
    } else {
      setGameState(event.state);
    }
  }
});

// On drag end:
function onDragEnd() {
  isDraggingRef.current = false;
  if (bufferRef.current) {
    setGameState(bufferRef.current);
    bufferRef.current = null;
  }
}
```

**Important:** Use `useRef` for `isDraggingRef`, not `useState`, so the WebSocket closure sees the live value without re-subscribing.

### Pattern 2: DragOverlay for Card Ghost (D-15, D-16)

**What:** `DragOverlay` renders outside the normal DOM flow (portal to body), avoiding overflow clipping and z-index issues from the hand strip's `overflow-x: scroll`.

```typescript
// Source: dnd-kit docs — https://dndkit.com
const [activeCard, setActiveCard] = useState<Card | null>(null);

<DndContext onDragStart={({ active }) => setActiveCard(active.data.current?.card ?? null)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveCard(null)}>
  {/* board components */}
  {createPortal(
    <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
      {activeCard ? <CardOverlay card={activeCard} /> : null}
    </DragOverlay>,
    document.body
  )}
</DndContext>
```

**Key detail:** `DragOverlay` must remain mounted at all times for drop animation to work. Conditionally render the *children*, not the DragOverlay itself.

### Pattern 3: Data on Draggable Items for Drop Routing

**What:** Attach `data` to `useDraggable` so `onDragEnd` knows what was dragged (card identity, source zone, source id). Same pattern for `useDroppable`.

```typescript
// DraggableCard.tsx
const { attributes, listeners, setNodeRef, transform } = useDraggable({
  id: card.id,
  data: { card, fromZone: 'hand', fromId: 'my-hand' },
});

// PileZone.tsx
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,
  data: { toZone: 'pile', toId: pile.id },
});
```

```typescript
// onDragEnd in BoardDragLayer.tsx
function handleDragEnd({ active, over }: DragEndEvent) {
  setActiveCard(null);
  isDraggingRef.current = false;

  if (!over) {
    // No valid drop target — revert optimistic state
    if (bufferRef.current) setGameState(bufferRef.current);
    else setGameState(serverStateRef.current); // restore pre-drag state
    bufferRef.current = null;
    return;
  }

  const { card, fromZone, fromId } = active.data.current;
  const { toZone, toId } = over.data.current;

  // Disallow drop on opponent hand
  if (toZone === 'opponent-hand') { /* revert */ return; }

  sendAction({ type: 'MOVE_CARD', cardId: card.id, fromZone, fromId, toZone, toId });

  // Flush buffer (server will confirm shortly)
  if (bufferRef.current) {
    setGameState(bufferRef.current);
    bufferRef.current = null;
  }
}
```

### Pattern 4: CSS Card Rendering

**What:** Pure CSS playing card with no image assets. Two components: `CardFace` and `CardBack`.

**CardFace pattern:**
```tsx
// Dimensions: 63px wide × 88px tall (standard poker card ratio)
// Background: white (#fff or off-white)
// Suit symbol: Unicode — ♠ ♥ ♦ ♣
// Red suits: #dc2626 (Tailwind red-600)
// Black suits: #111827 (near-black for contrast on white)

const SUIT_SYMBOL = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

<div className="relative w-[63px] h-[88px] bg-white rounded-md border border-gray-300 select-none">
  <span className={`absolute top-1 left-1.5 text-xs font-bold leading-none ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>
    {card.rank}
  </span>
  <span className={`absolute inset-0 flex items-center justify-center text-2xl ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>
    {SUIT_SYMBOL[card.suit]}
  </span>
  <span className={`absolute bottom-1 right-1.5 text-xs font-bold leading-none rotate-180 ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>
    {card.rank}
  </span>
</div>
```

**CardBack pattern (crosshatch CSS):**
```tsx
// repeating-linear-gradient creates a diamond grid pattern
<div className="w-[63px] h-[88px] rounded-md border border-gray-600"
     style={{
       background: `
         repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%),
         repeating-linear-gradient(-45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%)
       `,
       backgroundSize: '8px 8px',
       backgroundColor: '#1a3050',
     }}
/>
```

### Pattern 5: App.tsx Board Routing (D-08)

**What:** `RoomView` in `App.tsx` conditionally renders either `LobbyPanel` or `BoardView` based on whether `gameState` is non-null. `LobbyPanel` remains unchanged.

```tsx
// App.tsx — RoomView updated
function RoomView({ roomId }: { roomId: string }) {
  const playerId = getOrCreatePlayerId();
  const { gameState, connected, error, sendAction, setDragging } = usePartySocket(roomId, playerId);

  if (gameState) {
    return <BoardView gameState={gameState} playerId={playerId} sendAction={sendAction} setDragging={setDragging} />;
  }
  return <LobbyPanel roomId={roomId} playerId={playerId} gameState={gameState} connected={connected} error={error} />;
}
```

### Pattern 6: Server MOVE_CARD Handler

**What:** Atomic card move. Validate source contains card, remove from source, add to destination, broadcast.

```typescript
// party/index.ts — add to switch(action.type)
case "MOVE_CARD": {
  const { cardId, fromZone, fromId, toZone, toId } = action;

  // Locate card in source
  let card: Card | undefined;
  if (fromZone === 'hand') {
    const hand = this.gameState.hands[fromId];
    if (!hand) { sendError('HAND_NOT_FOUND'); break; }
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx === -1) { sendError('CARD_NOT_IN_SOURCE'); break; }
    card = hand.splice(idx, 1)[0];
  } else {
    const pile = this.gameState.piles.find(p => p.id === fromId);
    if (!pile) { sendError('PILE_NOT_FOUND'); break; }
    const idx = pile.cards.findIndex(c => c.id === cardId);
    if (idx === -1) { sendError('CARD_NOT_IN_SOURCE'); break; }
    card = pile.cards.splice(idx, 1)[0];
  }

  // Place card in destination
  if (toZone === 'hand') {
    if (!this.gameState.hands[toId]) this.gameState.hands[toId] = [];
    this.gameState.hands[toId].push(card);
  } else {
    const pile = this.gameState.piles.find(p => p.id === toId);
    if (!pile) { sendError('PILE_NOT_FOUND'); break; }
    pile.cards.push(card);
  }
  break;
}
```

**Security note:** Server must validate that `fromId` === `sender.id` when `fromZone === 'hand'`. A player must not be able to move another player's hand cards.

### Anti-Patterns to Avoid

- **Putting drag state in zustand or global state:** Use `useRef` for the `isDragging` flag so the WebSocket message handler always reads the current value without stale closure issues.
- **Using `useDraggable` inside `DragOverlay`:** The overlay content must use the presentational `CardFace`/`CardBack` components directly, not wrapped in `useDraggable`.
- **Applying `overflow: hidden` to a parent of DraggableCard without using DragOverlay portal:** The card ghost will be clipped. Always portal `DragOverlay` to `document.body`.
- **Conditional mounting of `DragOverlay`:** Mount it always, conditionally render children. Unmounting DragOverlay breaks drop animation.
- **Setting `isDragging` state instead of ref in WebSocket handler:** State updates are async; the handler closure will read a stale value mid-drag.
- **Allowing `toId` = opponent player ID in MOVE_CARD:** The server must reject moves where `toZone === 'hand'` and `toId !== sender.id`. Phase 4 will add explicit "pass to player" flows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag ghost positioning | Custom absolute-positioned clone + mouse tracking | `DragOverlay` from @dnd-kit/core | DragOverlay uses viewport-relative positioning, handles scroll, z-index, and drop animation automatically |
| Transform string for dragged element | `"translate(" + x + "px, " + y + "px)"` | `CSS.Translate.toString(transform)` from @dnd-kit/utilities | Handles null transform, avoids off-by-one errors |
| Pointer event detection for drag activation | Custom mousedown/mousemove handlers | `PointerSensor` (default in DndContext) | dnd-kit sensors handle activation distance, touch/pointer unification, and keyboard accessibility |
| Collision detection | Bounding box math | `closestCenter` or `closestCorners` from @dnd-kit/core | Library-provided algorithms cover edge cases at container boundaries |

**Key insight:** The drag layer is the highest-complexity piece in this phase. Dnd-kit covers the hard parts (pointer unification, scroll compensation, z-index, animations). Building custom drag logic would require weeks to reach the same reliability.

## Common Pitfalls

### Pitfall 1: Stale Closure in WebSocket Handler Reads `isDragging` as Always False

**What goes wrong:** `isDragging` state set via `useState` is captured in the WebSocket `addEventListener` closure at mount time. All drag state changes are invisible to the handler — every incoming message is applied immediately, causing visual tearing mid-drag.

**Why it happens:** React's `useEffect` with `[]` deps closes over the initial value of state variables.

**How to avoid:** Use `useRef` for the `isDragging` flag. Refs are mutable objects; the handler always reads `.current` which is live.

**Warning signs:** Cards snap/teleport during drag in multi-player test.

### Pitfall 2: DragOverlay Clipped by Overflow Container

**What goes wrong:** Player hand strip uses `overflow-x: scroll`. Without portaling `DragOverlay` to `document.body`, the floating card ghost is clipped at the hand strip boundary.

**Why it happens:** `overflow` creates a new stacking context that clips absolutely-positioned children.

**How to avoid:** Always wrap `DragOverlay` with `createPortal(_, document.body)`.

**Warning signs:** Drag ghost disappears when dragged upward out of the hand strip.

### Pitfall 3: `active.data.current` Is Empty on Drop

**What goes wrong:** A known dnd-kit issue (#794) where `active.data.current` is empty in `onDragEnd` when the draggable element unmounts during drag (e.g., after optimistic removal from the source list).

**Why it happens:** dnd-kit reads data from the live DOM ref; if the component unmounts (because optimistic state removed it), the ref data is lost.

**How to avoid:** Capture `active.data.current` in `onDragStart` into a ref (`dragDataRef.current = active.data.current`) before any state mutation. Use `dragDataRef.current` in `onDragEnd` instead of `active.data.current`.

**Warning signs:** `active.data.current` logs as `{}` in `onDragEnd`; card disappears on drop without being placed.

### Pitfall 4: Server Does Not Validate Move Ownership

**What goes wrong:** A player sends `MOVE_CARD` with `fromZone: "hand", fromId: "other-player-id"`. Server moves cards from another player's hand. This violates hand privacy invariant.

**Why it happens:** Server trusts client-supplied `fromId` without checking it matches `sender.id`.

**How to avoid:** In the `MOVE_CARD` handler, assert `fromId === sender.id` when `fromZone === "hand"`. Return `UNAUTHORIZED_MOVE` error otherwise.

**Warning signs:** Any test where player B can move player A's cards.

### Pitfall 5: `defaultGameState` Missing `play` Pile

**What goes wrong:** Current `defaultGameState` only initializes `draw` and `discard` piles. Phase 3 decision D-09 requires a third `play` pile. If not added, TABLE-01 fails (only 2 pile zones render) and MOVE_CARD to `play` pile returns PILE_NOT_FOUND.

**Why it happens:** The existing server code predates the Phase 3 decisions.

**How to avoid:** Add `{ id: "play", name: "Play Area", cards: [] }` to the `piles` array in `defaultGameState` as the first task.

**Warning signs:** Only two pile zones appear on the board; dragging to Play Area fails silently.

### Pitfall 6: Board Shown Before `gameState` Arrives

**What goes wrong:** If `App.tsx` renders `BoardView` before the first `STATE_UPDATE` arrives, `gameState` is null and pile/hand components crash trying to map over undefined arrays.

**Why it happens:** WebSocket connection is async; `gameState` starts null in `usePartySocket`.

**How to avoid:** The switch condition `if (gameState)` in `RoomView` already guards this — `LobbyPanel` is shown while `gameState` is null. Do not add a separate loading spinner path; the existing lobby is the loading state.

## Code Examples

### DragEndEvent Type from @dnd-kit/core
```typescript
// Source: @dnd-kit/core type definitions (v6.x)
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

// DragEndEvent shape:
{
  active: {
    id: string | number;
    data: { current: Record<string, unknown> }; // your custom data
    rect: { current: { initial: DOMRect | null; translated: DOMRect | null } };
  };
  over: {
    id: string | number;
    data: { current: Record<string, unknown> };
    rect: DOMRect;
    disabled: boolean;
  } | null;
  delta: { x: number; y: number };
  activatorEvent: Event;
}
```

### CSS Transform for Draggable Elements
```typescript
// Source: dnd-kit docs — https://dndkit.com/introduction/getting-started
import { CSS } from '@dnd-kit/utilities';

const style: React.CSSProperties = {
  transform: CSS.Translate.toString(transform), // null-safe
  transition,
  opacity: isDragging ? 0 : 1, // hide original while DragOverlay is shown
};
```

### DragOverlay with Portal (Correct Pattern)
```typescript
// Source: dnd-kit docs
import { createPortal } from 'react-dom';
import { DragOverlay } from '@dnd-kit/core';

{createPortal(
  <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
    {activeCard
      ? <div style={{ transform: 'scale(1.07)' }}><CardFace card={activeCard} /></div>
      : null
    }
  </DragOverlay>,
  document.body
)}
```

### CSS Card Back Crosshatch
```css
/* repeating-linear-gradient diamond/crosshatch — no image needed */
background:
  repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%),
  repeating-linear-gradient(-45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%);
background-size: 8px 8px;
background-color: #1a3050;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2023 (rbd archived) | rbd is archived/unmaintained; dnd-kit is the community standard |
| HTML5 drag API | Pointer Events API (dnd-kit default) | Ongoing | Touch support, no z-index quirks, better scroll handling |
| Custom drag ghost with `position: fixed` | DragOverlay portal | dnd-kit v3+ | Viewport-relative, no stacking context issues |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived by Atlassian. Do not use. Any tutorial referencing it is outdated.
- `@dnd-kit/sortable` for card zones: Not needed for Phase 3 (free-form drag between zones, not sortable lists within a zone).

## Open Questions

1. **Should `usePartySocket` be extended with drag buffer support, or should a new hook wrap it?**
   - What we know: `usePartySocket` currently only manages WS connection and exposes `gameState`. The buffer logic needs access to the live WebSocket send function and the `gameState` setter.
   - What's unclear: Whether to extend `usePartySocket` signature (`setDragging` callback) or create a `useBoardSocket` wrapper that adds drag-buffer concerns.
   - Recommendation: Extend `usePartySocket` — it already owns the `gameState` setter and WS ref. Adding `isDraggingRef` and `bufferRef` internally is cleaner than splitting the concerns across two hooks.

2. **Should drag from pile remove the top card specifically, or allow dragging any card from a pile?**
   - What we know: D-09 piles store cards as arrays, top = last element. CARD-02 says "draw from top."
   - What's unclear: Whether a pile should visually show one card (top only) or a stack with individual cards draggable.
   - Recommendation: Show pile as a count badge + top card face (or back if face-down). Only the top card is draggable. This simplifies the drag model and matches physical card table behavior.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | (project already running) | — |
| @dnd-kit/core | CARD-01 drag layer | ✗ (not installed) | — | None — must install |
| @dnd-kit/utilities | DraggableCard transform | ✗ (not installed) | — | None — must install |
| React 18 | All UI components | ✓ | 18.3.1 | — |
| Tailwind v4 | Card/layout styling | ✓ | 4.2.2 | — |
| Vitest | Server unit tests | ✓ | 4.1.2 | — |
| PartyKit dev server | Local testing | ✓ | 0.0.115 | — |

**Missing dependencies with no fallback:**
- `@dnd-kit/core` and `@dnd-kit/utilities` must be installed before any drag work begins. Wave 0 install task.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (exists — `tests/**/*.test.ts`, globals: true) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

**Note:** Existing tests cover server-side logic only (deck, shuffle, viewFor, drawCard). Frontend components are not tested with Vitest in the current setup (no jsdom environment configured, no React testing library installed). Phase 3 frontend testing must remain manual/visual or add jsdom setup — see Wave 0 Gaps.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TABLE-01 | Server initializes draw/discard/play piles | unit | `npm test -- --reporter=verbose` (tests/moveCard.test.ts) | ❌ Wave 0 |
| TABLE-01 | `defaultGameState` contains 3 piles with correct IDs | unit | `npm test` (tests/deck.test.ts) | ❌ — needs update |
| TABLE-02 | MOVE_CARD reduces source pile count, increases dest | unit | `npm test` (tests/moveCard.test.ts) | ❌ Wave 0 |
| TABLE-03 | `viewFor` returns correct `opponentHandCounts` after MOVE_CARD | unit | `npm test` (tests/viewFor.test.ts) | ✅ partial (existing test covers base viewFor) |
| CARD-01 | MOVE_CARD hand→pile moves card atomically | unit | `npm test` (tests/moveCard.test.ts) | ❌ Wave 0 |
| CARD-01 | MOVE_CARD pile→hand moves card atomically | unit | `npm test` (tests/moveCard.test.ts) | ❌ Wave 0 |
| CARD-01 | MOVE_CARD rejects unauthorized hand move (fromId ≠ sender.id) | unit | `npm test` (tests/moveCard.test.ts) | ❌ Wave 0 |
| CARD-01 | Drag-and-drop UI interaction | manual | Visual test in `npm run dev` | — |
| CARD-02 | Dragging top card from pile to hand | unit (server) + manual (UI) | `npm test` (tests/moveCard.test.ts) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** `npm test && npm run typecheck` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/moveCard.test.ts` — covers TABLE-01/TABLE-02/CARD-01/CARD-02 server behavior
- [ ] Update `tests/deck.test.ts` — add assertion that `defaultGameState` produces 3 piles (draw, discard, play)

*(No new test framework needed — Vitest is already configured. Frontend component testing is manual for Phase 3.)*

## Project Constraints (from CLAUDE.md)

| Directive | Applies To |
|-----------|-----------|
| GitHub Pages (static frontend) + PartyKit Cloud only | Architecture: no traditional server |
| Free tier only | No paid infrastructure decisions |
| 2–4 players per session | No concurrency optimization needed |
| Card art is a code change, not runtime config | card-art.ts hook pattern must be preserved |
| Use @dnd-kit/core + @dnd-kit/sortable (per CLAUDE.md) | Drag-and-drop implementation |
| react-beautiful-dnd is archived — do not use | Eliminated from consideration |
| Do not use HTML5 drag API | Eliminated from consideration |
| nanoid for IDs, zustand for ephemeral UI state, immer for state updates | Supporting libraries |
| Game state lives on PartyKit server — do not put game state in zustand | Architecture constraint |
| Tailwind v4 + shadcn components | Styling approach |
| @/* path alias for imports | All new component imports |
| Read files before modifying them | Execution rule |
| Never commit or push without explicit user instruction | Workflow rule |

## Sources

### Primary (HIGH confidence)
- npm registry (live, 2026-04-02) — verified @dnd-kit/core@6.3.1, @dnd-kit/utilities@3.2.2, @dnd-kit/sortable@10.0.0
- `/Users/aaronkaminsky/code/virtual-deck/src/shared/types.ts` — authoritative type definitions, current state
- `/Users/aaronkaminsky/code/virtual-deck/party/index.ts` — authoritative server implementation, confirms missing `play` pile
- `/Users/aaronkaminsky/code/virtual-deck/src/hooks/usePartySocket.ts` — confirms WebSocket handler structure for buffer design
- `/Users/aaronkaminsky/code/virtual-deck/src/globals.css` — confirms HSL CSS variables for theming
- dnd-kit docs (https://dndkit.com) — DragOverlay, useDraggable, useDroppable APIs
- dnd-kit/docs GitHub (https://github.com/dnd-kit/docs/blob/master/api-documentation/draggable/drag-overlay.md) — DragOverlay props and portal pattern

### Secondary (MEDIUM confidence)
- dnd-kit GitHub issue #794 — `active.data.current` empty on drop, verified pattern exists in community
- WebSearch results confirming DragOverlay + onDragStart state pattern (multiple sources consistent)

### Tertiary (LOW confidence)
- CSS card rendering pattern (crosshatch gradient) — community convention, not from official docs; implementation details flexible

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against live npm registry
- Architecture: HIGH — based directly on existing codebase structure and locked decisions from CONTEXT.md
- dnd-kit API patterns: HIGH — verified against official docs + GitHub source
- Pitfalls: HIGH (stale closure, overflow clip, data.current issue) — documented in official issue tracker
- CSS card rendering: MEDIUM — functional approach, visual details at Claude's discretion

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (dnd-kit API is stable at v6; PartyKit pre-1.0 still worth re-checking before server changes)
