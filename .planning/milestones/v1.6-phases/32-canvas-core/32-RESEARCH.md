# Phase 32: Canvas Core - Research

**Researched:** 2026-05-24
**Domain:** dnd-kit free positioning, PartyKit server state extension, React absolute-position rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canvas Data Model**
- D-01: `canvasCards: CanvasCard[]` as new top-level field on `GameState`. NOT a Pile extension.
- D-02: `CanvasCard` shape: `{ card: Card; x: number; y: number; z: number }`. Key = `card.id`.
- D-03: Server-internal `findCard(state, cardId)` helper returning discriminated union `CardLocation`. Not on the wire.
- D-04: `ClientGameState` gets `canvasCards: ClientCanvasCard[]`. `viewFor()` includes canvas cards; no masking (canvas always face-up to all players).

**Action API**
- D-05: New `PLACE_ON_CANVAS` action: `{ type: 'PLACE_ON_CANVAS'; cardId: string; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; x: number; y: number }`.
- D-06: `MOVE_CARD` unchanged for non-canvas moves. Canvas→pile drops use `MOVE_CARD` with extended `fromZone` union including `'canvas'`.
- D-07: Server handler removes card from source (hand/pile/canvasCards), adds to `canvasCards` at (x, y, z = max existing z + 1). `takeSnapshot` before mutation.

**Drop Collision Detection**
- D-08: Canvas div registered as `useDroppable({ id: 'canvas' })`. Canvas added to `customCollision` as final fallback using `pointerWithin`. `event.over.id === 'canvas'` triggers `PLACE_ON_CANVAS`.
- D-09: `event.over === null` = missed drop. For canvas cards: no action sent, server state unchanged. NOLOSS-01 satisfied by no-op.
- D-10: Hand/pile cards on `null`: existing behavior unchanged.

**Canvas-to-Pile Drop**
- D-11: Canvas card dragged onto draw/discard pile shows same top/bottom/random insert dialog. Uses `MOVE_CARD` with `fromZone: 'canvas'`.

**Carry-Forward from Spikes**
- D-12: `useDraggable` only — no `useDroppable` on canvas cards, no card-to-card collision.
- D-13: Source card `opacity: 0` while dragging. `DragOverlay` at `opacity: 0.5, scale(1.05)` with `dropAnimation={null}`.
- D-14: `onDragCancel` does nothing — state unchanged, transform resets. Revert is automatic.
- D-15: Drop position clamped to canvas bounds: `newX = clamp(x + delta.x, 0, canvasW - CARD_W)`, same for Y. Canvas dimensions from element ref.
- D-16: `PointerSensor` with `activationConstraint: { distance: 8 }`.
- D-17: `MeasuringStrategy.Always` on `DndContext`.

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- Stack shadow (OVERLAP-03) — Phase 33
- Overlap hit-testing / topmost card pointer events (OVERLAP-01, 02) — Phase 33
- Multi-card group drop (MULTI-01–04) — Phase 34
- Mobile edge-pan (MOBILE-01–03) — Phase 35
- Face-flip for canvas cards — deferred
- `CardPlacement` type on the wire — deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANVAS-01 | Player can drag a card to any position on the communal canvas; card anchors at the drop point | `useDraggable` + `event.delta` pattern validated in spike 001; `CanvasZone` + `CanvasDraggableCard` components identified |
| CANVAS-02 | Cancelling a drag returns the card to its pre-drag canvas position | `onDragCancel` no-op pattern confirmed; dnd-kit resets `transform` to null, card reverts to stored (x,y) automatically |
| CANVAS-03 | Each canvas card stores (x, y, z) in server state; z determines render order | `CanvasCard` type on `GameState`, `zIndex: card.z` CSS on `CanvasDraggableCard` |
| CANVAS-04 | Dropping a card onto the canvas makes it topmost (z = max + 1) | Server handler: `z = Math.max(...state.canvasCards.map(c => c.z), 0) + 1` |
| NOLOSS-01 | A card dropped outside canvas and outside any valid zone returns to its canvas position automatically | `event.over === null` branch: no action dispatched, server state unchanged, transform resets |
</phase_requirements>

---

## Summary

Phase 32 adds the free-canvas play area: cards with absolute (x, y, z) coordinates stored server-side, draggable to any position within canvas bounds. The spike (001) has validated the entire interaction pattern, so this phase is an integration task — porting proven spike code into the production codebase with the server model attached.

The implementation has two tiers. Server tier: extend `GameState` / `ClientGameState` with `canvasCards`, add `PLACE_ON_CANVAS` action handler, extend `MOVE_CARD` to accept `fromZone: 'canvas'`, extend `RESET_TABLE` to sweep canvas cards into the draw pile, and extend `viewFor()` to broadcast canvas state. Client tier: add `CanvasZone` and `CanvasDraggableCard` components, wire the canvas droppable into `customCollision` as the final fallback, and handle `event.over.id === 'canvas'` + `event.over === null` in `handleDragEnd`.

The no-card-loss guarantee (NOLOSS-01) is satisfied structurally: missed drops dispatch no action, so server state is unchanged and the card stays at its canvas position when the transform resets. No special recovery logic is needed.

**Primary recommendation:** Follow the decisions in CONTEXT.md exactly. All architectural choices are locked and validated. The planner's job is sequencing additive changes in a safe order: types first, server handler second, client components third, collision wiring last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canvas card storage (x, y, z) | API / Backend (PartyKit server) | — | Authoritative game state lives on server; all mutations must round-trip through server to ensure all players see same positions |
| Canvas broadcast (viewFor) | API / Backend (PartyKit server) | — | `viewFor()` is the masking/projection layer; canvas cards are always visible to all players so no masking needed |
| Free drag interaction (useDraggable) | Browser / Client | — | Drag is pure UI; only the final drop position is sent to the server |
| Position clamping | Browser / Client | — | Clamping is a client concern before dispatch; server trusts clamped coordinates |
| Drop routing (customCollision) | Browser / Client | — | Collision detection resolves which droppable won; canvas is the final fallback |
| Insert position dialog (canvas→pile) | Browser / Client | API / Backend | Dialog lives in `BoardDragLayer`; server receives the `MOVE_CARD` action after dialog confirmation |
| z-ordering render | Browser / Client | — | `zIndex: card.z` is a CSS concern; server assigns z values, client renders them |

---

## Standard Stack

### Core (all already installed in this project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.3.1 [VERIFIED: npm registry] | `useDraggable`, `DragOverlay`, `PointerSensor`, `MeasuringStrategy.Always` | Already in use throughout the project; spike 001 confirmed it handles free positioning correctly |
| `@dnd-kit/utilities` | 3.2.2 [VERIFIED: npm registry] | `CSS.Translate.toString(transform)` for non-canvas cards | Already in use in `DraggableCard.tsx` |
| React 18 | 18.3.1 [VERIFIED: npm registry] | Component tree, hooks | Project baseline |
| TypeScript 5 | already installed | Shared types between client + server | Project baseline |

No new packages needed for this phase. All required libraries are installed.

---

## Package Legitimacy Audit

No new packages are installed in this phase. All libraries are from the existing `package.json`.

---

## Architecture Patterns

### System Architecture Diagram

```
Pointer Event (drag start)
        |
        v
PointerSensor [distance:8 activationConstraint]
        |
        v
DndContext [MeasuringStrategy.Always]
        |
   onDragStart
        |
        +-- dragDataRef.current = { card, fromZone: 'canvas', fromId: card.id }
        +-- setActiveCard(card)
        +-- source card: opacity 0
        +-- DragOverlay: opacity 0.5, scale 1.05, dropAnimation=null
        |
   onDragEnd
        |
        +-- customCollision result
        |         |
        |   over.id === 'canvas'  -->  clamp (x + delta.x, y + delta.y) to canvas bounds
        |         |                         |
        |         |                   dispatch PLACE_ON_CANVAS
        |         |                         |
        |         |                   PartyKit server: remove from source, push to canvasCards at z=max+1
        |         |                         |
        |         |                   broadcastState() --> viewFor() includes canvasCards
        |         |
        |   over.id === 'pile-*'  -->  (canvas card) show insert dialog  -->  dispatch MOVE_CARD fromZone='canvas'
        |         |
        |   over === null         -->  no-op (NOLOSS-01): server state unchanged, transform resets
        |
   onDragCancel
        +-- no-op: state unchanged, transform resets automatically
```

### Recommended Project Structure

```
src/
├── components/
│   ├── CanvasZone.tsx          # NEW: useDroppable({id:'canvas'}), renders CanvasDraggableCard[]
│   ├── CanvasDraggableCard.tsx # NEW: useDraggable, absolute position, fromZone:'canvas' drag data
│   ├── BoardView.tsx           # MODIFIED: import CanvasZone, replace canvas-shell div
│   ├── BoardDragLayer.tsx      # MODIFIED: customCollision canvas fallback, handleDragEnd canvas branch
│   └── ... (existing, unchanged)
├── shared/
│   └── types.ts                # MODIFIED: CanvasCard, ClientCanvasCard, updated GameState/ClientGameState/ClientAction
party/
└── index.ts                    # MODIFIED: PLACE_ON_CANVAS handler, MOVE_CARD fromZone:'canvas', RESET_TABLE canvas sweep, viewFor canvasCards, onStart migration
tests/
└── canvasCards.test.ts         # NEW: PLACE_ON_CANVAS, MOVE_CARD from canvas, viewFor canvas broadcast, RESET_TABLE sweep
```

### Pattern 1: Absolute-Position Canvas Card

**What:** A card with `position: absolute` placed at `{ left: card.x, top: card.y, zIndex: card.z }` inside a `position: relative` canvas container. `useDraggable` provides the drag transform applied on top of the stored position during drag; `transform` is null when not dragging so the card sits at its (x, y).

**When to use:** Every canvas card rendered in `CanvasZone`.

**Example:**
```typescript
// Source: spike 001 validated pattern (CONVENTIONS.md)
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: card.id,
  data: { card, fromZone: 'canvas' as const, fromId: card.id },
});

const style: React.CSSProperties = {
  position: 'absolute',
  left: card.x,
  top: card.y,
  zIndex: card.z,
  opacity: isDragging ? 0 : 1,
  // Do NOT apply CSS.Translate when isDragging — DragOverlay shows the ghost
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
};
```

### Pattern 2: Canvas Droppable as Final Fallback in customCollision

**What:** `customCollision` currently returns `[]` when the pointer is outside all hand and pile zones. The canvas droppable is added as the last check — if the pointer is within the canvas div's rect, return the canvas collision.

**When to use:** In `BoardDragLayer.tsx` `customCollision`.

**Example:**
```typescript
// Source: D-08 decision + existing customCollision pattern in BoardDragLayer.tsx
const canvasContainers = args.droppableContainers.filter(
  (c) => String(c.id) === 'canvas'
);
const canvasCollisions = pointerWithin({ ...args, droppableContainers: canvasContainers });
if (canvasCollisions.length > 0) return canvasCollisions;
return [];  // null drop — no valid zone hit
```

### Pattern 3: PLACE_ON_CANVAS Server Handler

**What:** Removes card from its source (hand, pile, or canvasCards), adds it to `canvasCards` with `z = max(existing z values, 0) + 1`. Takes undo snapshot before any mutation.

**Example:**
```typescript
// Source: D-07 decision, mirrors existing MOVE_CARD pattern in party/index.ts
case 'PLACE_ON_CANVAS': {
  const { cardId, fromZone, fromId, x, y } = action;

  // find and remove card from source
  let card: Card | undefined;
  if (fromZone === 'hand') {
    const hand = this.gameState.hands[fromId];
    const idx = hand?.findIndex(c => c.id === cardId) ?? -1;
    if (idx === -1) { /* send error */ break; }
    takeSnapshot(this.gameState);
    [card] = hand.splice(idx, 1);
  } else if (fromZone === 'pile') {
    const pile = this.gameState.piles.find(p => p.id === fromId);
    const idx = pile?.cards.findIndex(c => c.id === cardId) ?? -1;
    if (idx === -1) { /* send error */ break; }
    takeSnapshot(this.gameState);
    [card] = pile!.cards.splice(idx, 1);
  } else { // fromZone === 'canvas'
    const idx = this.gameState.canvasCards.findIndex(c => c.card.id === cardId);
    if (idx === -1) { /* send error */ break; }
    takeSnapshot(this.gameState);
    const [removed] = this.gameState.canvasCards.splice(idx, 1);
    card = removed.card;
  }

  card!.faceUp = true; // canvas cards always face-up
  const maxZ = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  this.gameState.canvasCards.push({ card: card!, x, y, z: maxZ + 1 });
  break;
}
```

### Pattern 4: handleDragEnd Canvas Branch

**What:** Intercept `event.over?.id === 'canvas'` before the existing `isSuccess` path. Compute clamped (x, y) from `event.delta` + card's current position. Dispatch `PLACE_ON_CANVAS`.

**Example:**
```typescript
// Source: D-08, D-15; canvasRef is a RefObject<HTMLDivElement> passed from CanvasZone
if (event.over?.id === 'canvas' && dragDataRef.current) {
  const { card, fromZone, fromId } = dragDataRef.current;
  const canvasBounds = canvasRef.current?.getBoundingClientRect();
  const canvasW = canvasBounds?.width ?? 0;
  const canvasH = canvasBounds?.height ?? 0;
  const CARD_W = window.innerWidth >= 640 ? 63 : 42;
  const CARD_H = window.innerWidth >= 640 ? 88 : 59;

  // For canvas→canvas: start from stored position; for hand/pile→canvas: start from 0,0 or pointer
  const baseX = fromZone === 'canvas'
    ? (gameState.canvasCards.find(c => c.card.id === card.id)?.x ?? 0)
    : (event.activatorEvent as PointerEvent).clientX - (canvasBounds?.left ?? 0) - CARD_W / 2;
  const baseY = fromZone === 'canvas'
    ? (gameState.canvasCards.find(c => c.card.id === card.id)?.y ?? 0)
    : (event.activatorEvent as PointerEvent).clientY - (canvasBounds?.top ?? 0) - CARD_H / 2;

  const newX = Math.max(0, Math.min(baseX + event.delta.x, canvasW - CARD_W));
  const newY = Math.max(0, Math.min(baseY + event.delta.y, canvasH - CARD_H));

  setActiveCard(null);
  setDragging(false);
  sendAction({ type: 'PLACE_ON_CANVAS', cardId: card.id, fromZone: fromZone as 'hand' | 'pile' | 'canvas', fromId, x: newX, y: newY });
  dragDataRef.current = null;
  return;
}
```

> **Note on drop position for hand/pile→canvas:** When a card comes from hand or pile it has no stored (x, y). The position should be derived from the pointer's final location relative to the canvas div — use `(event.activatorEvent as PointerEvent)` is the _start_ position; the drop position is `pointer_start + event.delta`. The canvas droppable rect gives the offset. This is the correct approach from the spike.

### Pattern 5: RESET_TABLE Canvas Sweep

**What:** `RESET_TABLE` must also sweep `canvasCards` into the draw pile. Add one loop after the existing `piles` sweep.

**Example:**
```typescript
// In RESET_TABLE handler, after existing pile sweep
for (const canvasCard of this.gameState.canvasCards) {
  canvasCard.card.faceUp = false;
  resetDrawPile.cards.push(canvasCard.card);
}
this.gameState.canvasCards = [];
```

### Pattern 6: viewFor Canvas Broadcast

**What:** Add `canvasCards` to the `ClientGameState` returned by `viewFor()`. No masking needed — canvas is always visible.

**Example:**
```typescript
// In viewFor(), alongside the piles mapping:
canvasCards: state.canvasCards.map(cc => ({ card: cc.card, x: cc.x, y: cc.y, z: cc.z })),
```

### Anti-Patterns to Avoid

- **Putting canvas position in component state:** Card positions must come from server via `ClientGameState.canvasCards`. Local state causes divergence between players.
- **Applying CSS.Translate while isDragging:** When `isDragging` is true the source card must be `opacity: 0` and the transform should be `undefined` — DragOverlay renders the ghost. Applying transform to both creates a double-offset visual glitch.
- **Using event.delta for hand/pile→canvas placement:** `event.delta` is relative to drag start position (inside hand/pile). For cross-zone drops, derive position from pointer location relative to canvas div (activatorEvent + delta gives final pointer position). [ASSUMED — verify pointer offset math against spike 001 code during implementation]
- **Using dragDelta state for performance tracking:** Spike convention: ref for delta, setState only for coarse booleans. This is out of scope for Phase 32 (stack shadow is Phase 33) but the pattern must not be violated when adding `onDragMove` later.
- **Forgetting to add `fromZone: 'canvas'` to `MOVE_CARD` union in types.ts:** The TypeScript union for `MOVE_CARD.fromZone` is currently `'hand' | 'pile'`. Extending it to `'hand' | 'pile' | 'canvas'` must happen in types.ts — not only at the call site.
- **Sending `PLACE_ON_CANVAS` on drag cancel:** `onDragCancel` must dispatch nothing. The transform resets to null automatically and the card returns to its stored position.
- **Missing onStart migration guard:** `defaultGameState()` will not have `canvasCards: []` for rooms persisted before this phase. `onStart()` must add a migration guard (same pattern as existing `undoSnapshots`, `handRevealed` migrations).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag ghost at correct position + opacity | Custom pointer-move listener + absolute div | `DragOverlay` from `@dnd-kit/core` | Already handles portal, pointer capture, cross-browser normalization |
| Touch + mouse drag activation | Separate touch/mouse handlers | `PointerSensor` with `activationConstraint: { distance: 8 }` | dnd-kit normalizes pointer/touch events; custom handling breaks accessibility keyboard drag |
| Drag cancel revert | Store pre-drag position, restore on cancel | No-op `onDragCancel` — dnd-kit resets transform to null | When transform is null, the card renders at its stored (x, y) — revert is structural, not behavioral |
| Canvas size measurement | Polling `getBoundingClientRect` in a useEffect | Element ref captured in `CanvasZone`, read on drag end | Single sync read is sufficient; polling creates unnecessary renders |

---

## Common Pitfalls

### Pitfall 1: Stale Canvas Rect on Drop (MeasuringStrategy)

**What goes wrong:** Canvas div dimensions from a stale measurement are used for clamping, causing cards to be clamped to wrong coordinates (sometimes outside the visible area).

**Why it happens:** dnd-kit caches droppable rects by default. If the canvas resizes (window resize, sidebar layout change) after mount but before drop, the cached rect is wrong.

**How to avoid:** `MeasuringStrategy.Always` is already set on `DndContext` (D-17, CLAUDE.md convention). Also read `canvasRef.current.getBoundingClientRect()` at the moment of `handleDragEnd` — this is a live read, not the dnd-kit cached rect.

**Warning signs:** Cards consistently land shifted from pointer position after window resize.

### Pitfall 2: Wrong Drop Position for Cross-Zone Drops (hand/pile → canvas)

**What goes wrong:** Card anchors at (0, 0) or at an incorrect offset when dragged from hand/pile to canvas.

**Why it happens:** `event.delta` measures displacement from drag start, not from canvas origin. For cards starting in hand/pile, the drag start is inside those zones — `event.delta` gives motion relative to that start, not relative to the canvas.

**How to avoid:** For cross-zone drops onto canvas, compute the final pointer position using `(event.activatorEvent as PointerEvent).clientX + event.delta.x - canvasBounds.left`. This gives the pointer's final position relative to the canvas. Offset by half the card dimensions if centering the card on the cursor is desired.

**Warning signs:** Cards dropped from hand always land at (0, 0) or at a fixed offset regardless of where the user drops them.

### Pitfall 3: customCollision Canvas Check Position

**What goes wrong:** The canvas droppable is checked before hand or pile droppables, causing the canvas to "steal" drops intended for the hand or piles.

**Why it happens:** If the canvas droppable is registered inside the canvas container, and the canvas div is full-width behind the piles sidebar, the canvas rect may overlap with pile positions.

**How to avoid:** Add the canvas check as the LAST fallback in `customCollision` — after both hand and pile checks return empty (D-08). The existing `return []` at the end of `customCollision` becomes the canvas check.

**Warning signs:** Pile drops stop working, or cards dropped on the draw pile end up on the canvas instead.

### Pitfall 4: z-index Exhaustion

**What goes wrong:** After many moves, `z` grows without bound. This is cosmetic but could reach browser limits at extreme values.

**Why it happens:** z = max + 1 is unbounded.

**How to avoid:** For Phase 32, unbounded z is acceptable — the numbers will not reach problematic levels in normal play. Phase 33 overlap work can normalize z values if needed. Document as a known limitation, not a bug to fix now.

**Warning signs:** Not a warning sign for Phase 32. Flag for Phase 33 review.

### Pitfall 5: UNDO_MOVE After PLACE_ON_CANVAS

**What goes wrong:** Undo restores the full `GameState` snapshot, but `canvasCards` is not included in the snapshot because `defaultGameState` was called before this phase and the field didn't exist.

**Why it happens:** The `onStart` migration guard adds `canvasCards: []` to persisted state, but the JSON deep-copy in `takeSnapshot` must also copy `canvasCards`. Since `canvasCards` is a new top-level field, the deep copy `JSON.parse(JSON.stringify(state))` will include it automatically — no special handling needed.

**How to avoid:** No action needed for the copy. Verify that `canvasCards` is present in the restored snapshot after an undo with a unit test.

**Warning signs:** After undo, canvas cards reappear but positions are wrong, or canvas cards are missing after undo.

### Pitfall 6: BoardDragLayer PendingMove Type Does Not Include canvas fromZone

**What goes wrong:** TypeScript error at `setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId })` when a canvas card is dropped on a pile — the cast `'hand' | 'pile'` excludes `'canvas'`.

**Why it happens:** The existing `PendingMove` type in `BoardDragLayer.tsx` has `fromZone: 'hand' | 'pile'`. Canvas→pile drops go through the same dialog path.

**How to avoid:** Extend `PendingMove.fromZone` to `'hand' | 'pile' | 'canvas'`, and the `sendPendingMove` function's `MOVE_CARD` dispatch to pass `fromZone as 'hand' | 'pile' | 'canvas'`.

**Warning signs:** TypeScript error on `setPendingMove` call or `sendPendingMove` dispatch.

---

## Code Examples

### Type Additions (src/shared/types.ts)

```typescript
// Source: D-01, D-02, D-04 decisions (CONTEXT.md)
export interface CanvasCard {
  card: Card;
  x: number;
  y: number;
  z: number;
}

// ClientCanvasCard is identical to CanvasCard in this phase (no masking on canvas)
export type ClientCanvasCard = CanvasCard;

// GameState addition
export interface GameState {
  // ... existing fields ...
  canvasCards: CanvasCard[];
}

// ClientGameState addition
export interface ClientGameState {
  // ... existing fields ...
  canvasCards: ClientCanvasCard[];
}

// ClientAction addition
export type ClientAction =
  | { type: 'MOVE_CARD'; cardId: string; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; toZone: 'hand' | 'pile'; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  // ... other existing actions ...
  | { type: 'PLACE_ON_CANVAS'; cardId: string; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; x: number; y: number };
```

### CanvasZone Component Skeleton

```typescript
// Source: D-08, D-12, UI-SPEC.md
import { useDroppable } from '@dnd-kit/core';
import { useRef } from 'react';
import type { ClientCanvasCard } from '@/shared/types';
import { CanvasDraggableCard } from './CanvasDraggableCard';

interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  draggingCardId: string | null;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function CanvasZone({ canvasCards, draggingCardId, canvasRef }: CanvasZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // @ts-expect-error: canvasRef is a mutable RefObject
        canvasRef.current = node;
      }}
      aria-label="Play area"
      className={`relative flex-1 min-w-0 self-stretch bg-background ${isOver ? 'ring-1 ring-primary/30' : ''}`}
      data-testid="canvas-zone"
    >
      {canvasCards.map((cc) => (
        <CanvasDraggableCard
          key={cc.card.id}
          canvasCard={cc}
          isDraggingActive={draggingCardId === cc.card.id}
        />
      ))}
    </div>
  );
}
```

### onStart Migration Guard

```typescript
// Source: existing migration pattern in party/index.ts onStart()
// Add after existing migrations:
if (!Array.isArray((this.gameState as any).canvasCards)) {
  (this.gameState as unknown as GameState).canvasCards = [];
}
```

---

## Runtime State Inventory

> This is an additive phase (new field on existing GameState). Not a rename/refactor. However, the server persists GameState via `room.storage.put("gameState", ...)` — the stored state will not have `canvasCards` for rooms created before this phase.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | PartyKit room storage: persisted `GameState` objects lack `canvasCards` field | Migration guard in `onStart()` — add `canvasCards: []` if field missing |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

**Migration risk is LOW:** Adding a missing array field in `onStart` is a one-liner and follows the established pattern used in Phases 3, 9, 14, 22.

---

## Environment Availability

All dependencies are already installed. No new installs required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@dnd-kit/core` | Free drag, droppable canvas | Yes | 6.3.1 | — |
| `@dnd-kit/utilities` | `CSS.Translate.toString` | Yes | 3.2.2 | — |
| React 18 | Component tree | Yes | 18.3.1 | — |
| TypeScript 5 | Type safety | Yes | (via vite) | — |
| PartyKit | Server runtime | Yes | 0.0.115 | — |
| Vitest | Unit tests | Yes | 4.1.2 | — |
| Playwright | E2E tests | Yes | 1.59.1 | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test && npm run typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANVAS-01 | `PLACE_ON_CANVAS` from hand places card in canvasCards at given (x, y, z=1) | unit | `npm test -- canvasCards` | No — Wave 0 |
| CANVAS-01 | `PLACE_ON_CANVAS` from canvas updates position | unit | `npm test -- canvasCards` | No — Wave 0 |
| CANVAS-02 | No action dispatched on drag cancel (client behavior) | manual-only | — | N/A (no DOM in unit tests) |
| CANVAS-03 | `viewFor()` includes `canvasCards` in broadcast | unit | `npm test -- canvasCards` | No — Wave 0 |
| CANVAS-04 | Server sets z = max existing z + 1 | unit | `npm test -- canvasCards` | No — Wave 0 |
| CANVAS-04 | First card on empty canvas gets z = 1 | unit | `npm test -- canvasCards` | No — Wave 0 |
| NOLOSS-01 | `event.over === null` dispatches nothing (client) | manual-only | — | N/A |
| NOLOSS-01 | `PLACE_ON_CANVAS` with invalid cardId returns error without mutation | unit | `npm test -- canvasCards` | No — Wave 0 |
| Canvas→pile | `MOVE_CARD` with `fromZone: 'canvas'` removes from canvasCards, adds to pile | unit | `npm test -- canvasCards` | No — Wave 0 |
| RESET_TABLE | RESET_TABLE sweeps canvasCards into draw pile | unit | `npm test -- canvasCards` | No — Wave 0 |
| onStart migration | State without `canvasCards` field gets `[]` after migration | unit | `npm test -- canvasCards` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** Full suite green + `npm run typecheck` before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/canvasCards.test.ts` — covers CANVAS-01 through CANVAS-04, NOLOSS-01 (server-side), MOVE_CARD from canvas, RESET_TABLE canvas sweep, onStart migration. Follow the existing `moveCard.test.ts` pattern: `makeMockRoom` + `makeMockConnection` + direct `room.gameState` manipulation.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes | `senderToken` guard — `PLACE_ON_CANVAS` must verify the card exists and is owned by a valid source; canvas cards are globally accessible (any player can move any canvas card — same as pile convention) |
| V5 Input Validation | Yes | Validate `x` and `y` are finite numbers; `cardId` must be found in the declared `fromZone`; `fromZone` must be in the allowed union |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `PLACE_ON_CANVAS` with cardId not in declared fromZone | Spoofing / Tampering | Pre-validate card exists in source; send `CARD_NOT_IN_SOURCE` error and break without mutation |
| `PLACE_ON_CANVAS` with NaN or Infinity coordinates | Tampering | Validate `Number.isFinite(x) && Number.isFinite(y)` before use; reject with `INVALID_COORDINATES` |
| `MOVE_CARD` fromZone: 'canvas' for a card not on canvas | Tampering | Check `this.gameState.canvasCards.findIndex(c => c.card.id === cardId) !== -1`; send `CARD_NOT_IN_SOURCE` |
| Moving another player's hand cards via PLACE_ON_CANVAS | Elevation of privilege | Canvas cards: no owner restriction (public table surface); hand→canvas: must validate `fromId === senderToken` when `fromZone === 'hand'` |

**Note on hand→canvas authorization:** Existing `MOVE_CARD` handler checks `fromId !== senderToken` for `fromZone === 'hand'`. The `PLACE_ON_CANVAS` handler must apply the same guard.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drop position for hand/pile→canvas uses `activatorEvent.clientX + delta.x - canvasBounds.left` formula | Code Examples (Pattern 4) | Card lands at wrong position on cross-zone drop; confirm against spike 001 source code before implementing |
| A2 | `(event.activatorEvent as PointerEvent)` cast is valid for PointerSensor — activator event is always a PointerEvent | Code Examples (Pattern 4) | Runtime cast error; fallback to `event.active.rect.current?.translated` if needed |

---

## Open Questions

1. **Drop position formula for hand/pile→canvas**
   - What we know: `event.delta` gives displacement from drag start; the drag start is inside the source zone (hand/pile), not inside the canvas
   - What's unclear: the exact pointer-to-canvas coordinate calculation — spike 001 validated this works but the formula needs to be confirmed against the spike source before writing production code
   - Recommendation: Implementer reads `src/spikes/SpikeNNN*.tsx` (spike 001 component) before writing `handleDragEnd` canvas branch; use the formula exactly as validated

2. **CardOverlay opacity/scale mismatch**
   - What we know: `CardOverlay.tsx` currently applies `scale(1.07)` inside the component; D-13 specifies `scale(1.05)` for the DragOverlay
   - What's unclear: Whether to modify `CardOverlay` (which also affects non-canvas drags) or apply scale override at the DragOverlay call site
   - Recommendation: Apply the scale override at the `DragOverlay` usage in `BoardDragLayer.tsx` via the `style` prop — do not change the shared `CardOverlay` component

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 drag-and-drop API | `@dnd-kit/core` PointerSensor | Pre-existing in this project | Touch support, no z-index quirks |
| react-beautiful-dnd | `@dnd-kit/core` | Pre-existing in this project | rbd is archived/deprecated |
| Custom drag handlers for free positioning | `useDraggable` + `event.delta` | Validated in spike 001 (2026) | Zero custom pointer tracking needed |

---

## Sources

### Primary (HIGH confidence)

- Spike 001 findings — `.planning/spikes/001-free-drag-positioning/README.md` — validated approach, confirmed results
- Spike CONVENTIONS.md — `.planning/spikes/CONVENTIONS.md` — established patterns for all canvas interactions
- CONTEXT.md decisions D-01 through D-17 — locked implementation decisions from discuss-phase
- Existing `party/index.ts` — server handler patterns, `takeSnapshot`, `viewFor`, migration guards
- Existing `src/components/DraggableCard.tsx` — drag data pattern, `didDragRef`, `isDragging` guard
- Existing `src/components/BoardDragLayer.tsx` — `customCollision` structure, `handleDragEnd` flow, `PendingMove` dialog
- `src/shared/types.ts` — current type shapes; confirmed `canvasCards` does not yet exist

### Secondary (MEDIUM confidence)

- `@dnd-kit/core` 6.3.1 installed package — `useDraggable`, `useDroppable`, `DragOverlay` APIs confirmed via existing codebase usage

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — decisions locked in CONTEXT.md, spike 001 fully validated
- Pitfalls: HIGH — sourced from existing codebase patterns and prior phase postmortems (CLAUDE.md conventions)
- Type changes: HIGH — sourced directly from current types.ts

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (stable libraries; spike findings do not expire)
