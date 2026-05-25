# Phase 34: Multi-Card Group Drop - Research

**Researched:** 2026-05-25
**Domain:** dnd-kit multi-card group drag, React selection state, PartyKit server atomic action
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canvas Selection State**
- D-01: Canvas multi-select uses existing `selectedIds`/`selectionSource` in `BoardDragLayer`. `selectionSource` type extended to include `{ zone: 'canvas'; zoneId: 'canvas' }`.
- D-02: `selectionSource.zoneId` for canvas = `'canvas'` (matches canvas droppable ID).
- D-03: When drag starts and `selectionSource` is non-canvas, clear `selectedIds` and switch to canvas source. Drag start is the enforced cross-zone clearing point.

**Click Behavior**
- D-04: Toggle / add-to-group. Clicking unselected card adds it; clicking selected removes it.
- D-05: Clicking empty canvas deselects all — `onClick` on `CanvasZone` container with `stopPropagation` on card clicks.
- D-06: Selection clears on `onDragEnd` (after drop completes), regardless of success.

**Server Action Design**
- D-07: New `GROUP_PLACE_ON_CANVAS` action added to `ClientAction`. Single atomic message.
- D-08: Action shape: `{ type: 'GROUP_PLACE_ON_CANVAS'; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; cards: { cardId: string; x: number; y: number }[] }`.
- D-09: All three source paths ship: canvas→canvas, hand→canvas, spread→canvas. Homogeneous source only.
- D-10: Server: one undo snapshot before processing. Remove all cards atomically. Place on `canvasCards` with z = maxZ+1..maxZ+N (ascending pre-drop z-order). Single broadcast.
- D-11: x/y computation: canvas→canvas uses `card.x + delta.x, card.y + delta.y`. hand/spread→canvas: client reads `getBoundingClientRect()` at `onDragStart`, stores `{cardId, offsetX, offsetY}` in ref, applies on drop.
- D-12: Single undo step — `takeSnapshot` before `GROUP_PLACE_ON_CANVAS`.

**Bounds Validation (MULTI-04)**
- D-13: Client-only pre-validation. Bounds: `[0, canvasW - CARD_W] × [0, canvasH - CARD_H]`. If any card overflows, no action dispatched.
- D-14: All cards in group checked — including the drag handle card.
- D-15: Silent snap-back. No toast, no error highlight. Consistent with `onDragCancel` behavior.

**Passenger Ghost Rendering**
- D-16: DragOverlay renders only drag handle card (`opacity: 0.5, scale(1.05)`). Passenger cards are absolutely-positioned ghost divs with `pointerEvents: none`.
- D-17: Passenger ghosts at `zIndex: 998` inside `CanvasZone`. Source cards set `opacity: 0` while in active drag group.

### Claude's Discretion

None — discussion stayed within phase scope.

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MULTI-01 | Player can select multiple canvas cards using click-to-select (same ring/lift UX as hand and spread zones) | `CanvasDraggableCard.handleClick` → `onToggleSelect` callback; `isSelected` prop drives `boxShadow` ring. Spike 004 validated pattern. |
| MULTI-02 | On group drop, each card lands maintaining its pre-drag offset relative to the drag handle card | canvas→canvas: uniform `delta.x/y` applied to all. hand/spread→canvas: `getBoundingClientRect()` offset capture at drag start, stored in ref, applied on `onDragEnd`. |
| MULTI-03 | On group drop, all dropped cards receive z-indices above existing canvas cards; internal z-order is preserved | Server: `sort movingCards by pre-drop z → assign maxZ + 1 + rank`. Spike 004 `handleDragEnd` implements this exactly. |
| MULTI-04 | A multi-card group drop is only valid if all cards land within canvas bounds; if any overflows, entire drop is cancelled | Client pre-validation in `handleDragEnd` before dispatch. `canvasRef.getBoundingClientRect()` gives canvas bounds; `getCardDimensions()` gives card size. |
</phase_requirements>

---

## Summary

Phase 34 adds multi-card group drag to the canvas. The spike (Spike 004) has already validated all core mechanics: click-to-select with `onClick`/`didDragRef` disambiguation, passenger ghost rendering as absolute-positioned divs, DragOverlay for handle only, z-order preservation via pre-drag z sort, and selection clear on `onDragEnd`. The production integration is a transplant from the spike into three existing components (`CanvasDraggableCard`, `CanvasZone`, `BoardDragLayer`) plus a new server handler and type addition.

The most complex integration point is `BoardDragLayer.handleDragStart` for hand/spread sources: DOM offset capture via `getBoundingClientRect()` must happen at drag start (when source card elements still exist in their original positions), stored in a ref, and applied at `onDragEnd` when computing absolute canvas coordinates. For canvas→canvas sources this is simpler — the existing `delta.x/y` from dnd-kit is applied uniformly to all group members' stored `x/y` coordinates.

The server handler `GROUP_PLACE_ON_CANVAS` follows the exact same atomicity pattern as `PLACE_ON_CANVAS` — pre-validate all cards, then `takeSnapshot`, then remove all from source, then push all to `canvasCards` with consecutive z values. No new data model changes required; `CanvasCard` shape is unchanged.

**Primary recommendation:** Plan as three waves — (1) server + types, (2) client integration, (3) verification. Wave 1 and Wave 2 are independent across files but Wave 2 depends on Wave 1 types.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Selection state (`selectedIds`, `selectionSource`) | Frontend (BoardDragLayer) | — | Pure UI state; not persisted, not broadcast |
| Click-to-select toggle | Frontend (CanvasDraggableCard) | Frontend (BoardDragLayer) | Card owns the click; BDL owns the state |
| Passenger ghost rendering | Frontend (CanvasZone) | — | Ghosts are UI-only overlays, never sent to server |
| Bounds validation | Frontend (BoardDragLayer) | — | Client-only per D-13; avoids network round-trip on cancel |
| Group drop atomicity + z-ordering | Server (party/index.ts) | — | Server is authoritative for all game state mutations |
| Undo snapshot for group drop | Server (party/index.ts) | — | Server owns undo stack |
| DOM offset capture (hand/spread source) | Frontend (BoardDragLayer) | — | Must read DOM at drag-start when elements are positioned |

---

## Standard Stack

No new packages. All existing dependencies cover this phase.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.x | Drag primitives, `useDraggable`, `DragOverlay`, `onDragStart/Move/End` | Already in use; Spike 004 validated multi-card pattern with these APIs |
| React | 18.x | Component tree, `useState`, `useRef`, `useMemo`, `useEffect` | Project standard |
| TypeScript | 5.x | Type safety for new `GROUP_PLACE_ON_CANVAS` action union member | Project standard |

### No New Dependencies
This phase installs nothing. All mechanics (dnd-kit group drag, absolute positioning, ref-based delta tracking) are achievable with the existing stack. The spike proved this.

**Installation:** None required.

---

## Package Legitimacy Audit

No packages added in this phase. Audit not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
User click on canvas card
        │
        ▼
CanvasDraggableCard.handleClick
  └─ if !didDragRef → onToggleSelect(cardId)
        │
        ▼
BoardDragLayer.handleToggleSelect
  └─ updates selectedIds, selectionSource (zone:'canvas')
        │
        ▼
CanvasZone re-renders: card shows selection ring boxShadow

User starts drag on selected card
        │
        ▼
BoardDragLayer.handleDragStart
  ├─ canvas source: captures activeDragOriginRef per card
  └─ hand/spread source: getBoundingClientRect() per selected card → offsetRef
        │
        ▼
BoardDragLayer.handleDragMove
  └─ updates dragDeltaRef (ref, not state — avoids re-renders)
        │
        ▼
CanvasZone: passengerGhosts rendered at card.x + delta.x, card.y + delta.y
DragOverlay: handle card at opacity:0.5, scale:1.05
        │
        ▼
BoardDragLayer.handleDragEnd (drop on canvas)
  ├─ bounds check ALL cards in group → if any fail, no dispatch (snap-back)
  └─ dispatch GROUP_PLACE_ON_CANVAS {fromZone, fromId, cards:[{cardId,x,y}...]}
        │
        ▼
party/index.ts GROUP_PLACE_ON_CANVAS handler
  ├─ validate all cardIds in source (pre-mutation)
  ├─ takeSnapshot
  ├─ remove all cards from source atomically
  ├─ sort by pre-drop z → assign z = maxZ + 1 + rank
  ├─ push all to canvasCards
  └─ broadcastState()
        │
        ▼
All clients receive STATE_UPDATE → canvas re-renders with new positions/z-values
```

### Recommended Project Structure

No new files. Changes are confined to:

```
src/
├── components/
│   ├── CanvasDraggableCard.tsx   # add isSelected, onToggleSelect props; opacity:0 when passenger
│   ├── CanvasZone.tsx            # add onClick deselect-all; add passenger ghost block; pass new props
│   └── BoardDragLayer.tsx        # extend SelectionSource type; add GROUP_PLACE_ON_CANVAS path
├── shared/
│   └── types.ts                  # add GROUP_PLACE_ON_CANVAS to ClientAction union
party/
└── index.ts                      # add GROUP_PLACE_ON_CANVAS case in onMessage
tests/
└── canvasCards.test.ts           # add GROUP_PLACE_ON_CANVAS test suite (new describe block)
```

### Pattern 1: Click-vs-Drag Disambiguation (Spike 004 validated)

**What:** `didDragRef` tracks whether a drag occurred so `onClick` doesn't fire selection toggle after a drag gesture.
**When to use:** Any component that is both draggable and clickable with dnd-kit.

```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx:63-76
const didDragRef = useRef(false);
const prevIsDragging = useRef(false);
useEffect(() => {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (prevIsDragging.current && !isDragging) {
    timerId = setTimeout(() => { didDragRef.current = false; }, 300);
  }
  if (isDragging) didDragRef.current = true;
  prevIsDragging.current = isDragging;
  return () => { if (timerId !== null) clearTimeout(timerId); };
}, [isDragging]);

function handleClick() {
  if (didDragRef.current) return;
  onToggleSelect(cc.card.id);
}
```

Note: `CanvasDraggableCard` already has this `didDragRef` pattern. The click handler just needs to call `onToggleSelect` instead of being a no-op.

### Pattern 2: Passenger Ghost Rendering

**What:** Non-handle selected cards render as absolutely-positioned ghost divs inside `CanvasZone` during drag, tracking `dragDelta`. Source cards set `opacity: 0`.
**When to use:** Multi-card drag where only one card is in `DragOverlay`.

```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx:207-210, 253-268
const passengerGhosts = useMemo(() => {
  if (!activeCard || !dragDelta) return [];
  return cards.filter(c => c.card.id !== activeCardId && groupIds.has(c.card.id));
}, [activeCard, dragDelta, cards, activeCardId, groupIds]);

// In JSX, inside CanvasZone:
{passengerGhosts.map(cc => (
  <div
    key={`ghost-${cc.card.id}`}
    style={{
      position: 'absolute',
      left: cc.x + (dragDelta?.x ?? 0),
      top: cc.y + (dragDelta?.y ?? 0),
      zIndex: 998,
      opacity: 0.5,
      pointerEvents: 'none',
    }}
  >
    <CardFace card={cc.card} />
  </div>
))}
```

### Pattern 3: Group Z-Ordering on Server

**What:** Sort moving cards by pre-drop z ascending, assign `z = maxZ + 1 + rank`.
**When to use:** Any multi-card drop that must land above existing cards with internal order preserved.

```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx:174-184 (adapted for server)
// In party/index.ts GROUP_PLACE_ON_CANVAS handler:
const maxZ = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
const movingCards = validatedCards.sort((a, b) => a.preDragZ - b.preDragZ);
movingCards.forEach((mc, rank) => {
  this.gameState.canvasCards.push({ card: mc.card, x: mc.x, y: mc.y, z: maxZ + 1 + rank });
});
```

The server receives `{cardId, x, y}` per card; the pre-drop z must be looked up from the source zone during handler processing.

### Pattern 4: DOM Offset Capture for Hand/Spread Sources

**What:** At `onDragStart`, read `getBoundingClientRect()` for each selected card element and the drag handle element. Store offsets relative to the handle. Apply on `onDragEnd` to compute absolute canvas positions.
**When to use:** Cross-zone group drag where passengers don't have canvas `x/y` coordinates.

```typescript
// Source: 34-CONTEXT.md Specific Ideas (D-11)
// In BoardDragLayer.handleDragStart (when selectionSource.zone !== 'canvas'):
const handleEl = document.querySelector(`[data-card-id="${activeId}"]`);
const handleRect = handleEl?.getBoundingClientRect();
const offsets: Record<string, { offsetX: number; offsetY: number }> = {};
for (const cardId of selectedIds) {
  const el = document.querySelector(`[data-card-id="${cardId}"]`);
  const rect = el?.getBoundingClientRect();
  if (handleRect && rect) {
    offsets[cardId] = {
      offsetX: rect.left - handleRect.left,
      offsetY: rect.top - handleRect.top,
    };
  }
}
passengerOffsetsRef.current = offsets;

// In handleDragEnd:
// handleDropX = baseHandleX (from pointer + delta relative to canvas)
// passengerX = handleDropX + offsets[cardId].offsetX
```

Implementation note: `data-card-id` attribute must be added to `CanvasDraggableCard`, `DraggableCard` (hand), and spread zone card elements so `BoardDragLayer` can query them without needing refs threaded through the component tree.

### Anti-Patterns to Avoid

- **`useState` for dragDelta tracking:** Use `dragDeltaRef` (ref, not state) inside `handleDragMove` to avoid per-pointermove re-renders. `BoardDragLayer` already uses this pattern (`dragDeltaRef.current`). Passenger ghosts need the delta too — `CanvasZone` must receive the delta as a prop or via a shared ref.
- **Dispatching GROUP_PLACE_ON_CANVAS on bounds failure:** Never dispatch if any card overflows. Client validates all N cards before dispatch. No partial placement.
- **Using `onPointerDown` for selection toggle:** Must use `onClick`. Spike 004 confirmed `onPointerDown` overwrites dnd-kit's `{...listeners}` spread and breaks drag entirely.
- **Clearing `selectedIds` in `handleDragStart` when active card is already selected:** The existing `BoardDragLayer` correctly preserves selection when the drag handle is in `selectedIds`. Do not regress this.
- **Applying `CSS.Translate.toString(transform)` to passenger source cards:** Passenger source cards must have `opacity: 0` and no transform applied — the ghost div handles their visual representation during drag. If `transform` is applied, the source card becomes visible in its drag-offset position, creating a duplicate with the ghost.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click vs drag disambiguation | Custom pointer event tracking | `didDragRef` pattern (already in `CanvasDraggableCard`) + `PointerSensor { distance: 8 }` | Spike 004 validated; custom pointer tracking overwrites dnd-kit's listeners |
| Drag delta tracking | `useState` for delta | `useRef` for delta, update in `onDragMove` | State causes per-pointermove re-renders; ref is live in closure |
| Group z-assignment | Complex z-gap calculations | `maxZ + 1 + rank` pattern (Spike 004) | Simple, correct, preserves order |
| Passenger visual during drag | Custom DragOverlay with multiple cards | Absolutely-positioned ghost divs inside `CanvasZone` + single-card DragOverlay | Multi-card DragOverlay requires `useDraggable` on each passenger; ghosts are simpler and Spike 004 validated them |
| Bounds check geometry | Custom overlap math | `canvasRef.current.getBoundingClientRect()` + `getCardDimensions()` | Canvas dimensions are already computed this way in the existing `PLACE_ON_CANVAS` branch |

**Key insight:** Spike 004 is the authoritative implementation reference. Every pattern here was validated in that spike. The production build is a surgical transplant of those patterns, not a reimplementation.

---

## Common Pitfalls

### Pitfall 1: `dragDelta` State vs Ref for Passenger Ghosts

**What goes wrong:** Passenger ghost positions require `dragDelta` to update on every `onDragMove`. If `dragDelta` is stored as `useState` (causing re-renders), all canvas cards re-render on each pointer move — visually acceptable but performance-degrading. If `dragDelta` is stored as a `useRef`, passenger ghosts won't re-render at all.

**Why it happens:** `BoardDragLayer` already stores `dragDeltaRef` as a ref (correct for the shadow check). Passenger ghost rendering in `CanvasZone` needs the delta but `CanvasZone` doesn't re-render on ref updates.

**How to avoid:** `CanvasZone` needs a mechanism to re-render on delta changes. Options:
  - Pass `dragDelta` as `useState` from `BoardDragLayer` specifically for ghost rendering (small performance cost, trivially correct)
  - Or use the existing pattern: `BoardDragLayer` already has `dragCoversSomeCard` as `useState` and `dragDeltaRef` as `useRef`. Add a parallel `dragDelta` state alongside the ref — ref is used in the WS closure, state is used for render.

The safest approach matching the existing codebase pattern: maintain both `dragDeltaRef.current` (for the closure) and a `dragDelta` state (for ghost rendering). `handleDragMove` updates both. This is the same dual pattern already used for `dragCoversSomeCard`.

**Warning signs:** Passenger ghosts don't move during drag (frozen at origin offset).

### Pitfall 2: `selectionSource` Type Mismatch in BoardView Prop Chain

**What goes wrong:** `BoardView.tsx` declares `selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null` in its props interface (line 23). `HandZone` and `SpreadZone` receive this prop and use it for badge display. If `selectionSource` gains `zone: 'canvas'`, these downstream consumers will TypeScript-error when they try to compare `selectionSource.zone === 'hand'` (which is still valid) but the type union change requires updating all consumers.

**Why it happens:** The type is defined inline in `BoardView.tsx` (not from `src/shared/types.ts`), so it must be updated in two places: `BoardDragLayer.tsx` and `BoardView.tsx`.

**How to avoid:** Extract `SelectionSource` as a named type in `src/shared/types.ts` (or a client-types file). Update `BoardDragLayer.tsx`, `BoardView.tsx`, `HandZone`, and `SpreadZone` to import it. Then the single type change propagates cleanly.

**Warning signs:** TypeScript errors in `HandZone` or `SpreadZone` after `selectionSource` type is extended.

### Pitfall 3: `data-card-id` Attribute Required for DOM Offset Capture

**What goes wrong:** `BoardDragLayer.handleDragStart` needs to read `getBoundingClientRect()` for each selected card element when the source is `hand` or `spread`. Without a stable DOM query selector, there's no way to find the element from `cardId` alone.

**Why it happens:** dnd-kit's `useDraggable` exposes `setNodeRef` but that ref lives inside each card component — `BoardDragLayer` doesn't have access to those refs without prop drilling or context.

**How to avoid:** Add `data-card-id={card.id}` to the root div of `DraggableCard` (hand zone), spread zone card components, and `CanvasDraggableCard`. Then `document.querySelector(`[data-card-id="${id}"]`)` finds the element in `handleDragStart`. This is a minimal DOM attribute addition — no new refs or context needed.

**Warning signs:** `getBoundingClientRect()` returns `undefined` for passengers; all passengers land at handle position (zero offset).

### Pitfall 4: Passenger `opacity: 0` Scope

**What goes wrong:** Source cards in the active drag group must set `opacity: 0` — not just the drag handle. If only the drag handle sets `opacity: 0` (the existing `isDragging` pattern in `CanvasDraggableCard`), passenger source cards remain visible under their ghost divs, creating doubled visuals.

**Why it happens:** `isDragging` is card-local in dnd-kit — only the card with the active `useDraggable` ID gets `isDragging: true`. Passenger source cards don't know they're passengers.

**How to avoid:** Pass an `isPassenger` prop (or `isInDragGroup`) to `CanvasDraggableCard`. Set `opacity: 0` when `isDragging || isPassenger`. `isPassenger` is computed from `groupIds` in `CanvasZone` (or `BoardDragLayer`) and passed down.

**Warning signs:** Passenger source cards visible as normal opaque cards under their translucent ghost divs.

### Pitfall 5: Bounds Check Uses Wrong Canvas Width

**What goes wrong:** `canvasRef.current.getBoundingClientRect().width` reads the canvas element's rendered width at check time. If `getCardDimensions()` returns mobile dimensions (42×59) but the canvas is desktop-sized (or vice versa), bounds check uses mismatched card dimensions.

**Why it happens:** `getCardDimensions()` branches on `window.innerWidth < 640`. If this returns the wrong size, a card that visually fits is reported as out-of-bounds or vice versa.

**How to avoid:** Call `getCardDimensions()` at the same point as `getBoundingClientRect()` (inside `handleDragEnd`). This is the same pattern already used in the existing `PLACE_ON_CANVAS` branch of `handleDragEnd` — reuse that exact code.

**Warning signs:** Group drops to canvas edges always cancel (false bounds rejection) or cards land partially outside the visible canvas.

---

## Code Examples

### GROUP_PLACE_ON_CANVAS server handler skeleton

```typescript
// Source: party/index.ts — extend the switch statement
case "GROUP_PLACE_ON_CANVAS": {
  const { fromZone, fromId, cards } = action;

  // V4: hand source auth guard
  if (fromZone === "hand" && fromId !== senderToken) {
    sender.send(JSON.stringify({ type: "ERROR", code: "UNAUTHORIZED_MOVE", message: "Cannot move another player's cards" } satisfies ServerEvent));
    break;
  }

  // V5: coordinate validation
  for (const c of cards) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) {
      sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_COORDINATES", message: "x and y must be finite numbers" } satisfies ServerEvent));
      break; // Note: break from for-loop, add outer flag or use labeled break
    }
  }

  // Resolve source array
  // Pre-validate ALL cards exist before takeSnapshot
  const cardIds = cards.map(c => c.cardId);
  // ... lookup each cardId in source ...
  // If any missing: ERROR, no mutation

  // Compute maxZ before any splice
  const maxZ = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  
  // Snapshot AFTER validation, BEFORE mutation
  takeSnapshot(this.gameState);

  // Remove all from source atomically
  // ... splice each card from source ...

  // Sort by pre-drop z to preserve internal order
  const withPreZ = resolvedCards.sort((a, b) => a.preDragZ - b.preDragZ);

  // Push to canvas with consecutive z-values
  withPreZ.forEach((mc, rank) => {
    mc.card.faceUp = true;
    this.gameState.canvasCards.push({ card: mc.card, x: mc.x, y: mc.y, z: maxZ + 1 + rank });
  });
  break;
}
```

### selectionSource type extension

```typescript
// Source: src/shared/types.ts (or client-only types file)
export type SelectionSource =
  | { zone: 'hand' | 'pile'; zoneId: string; hasMaskedCards?: boolean }
  | { zone: 'canvas'; zoneId: 'canvas' }
  | null;
```

### groupIds computation in CanvasZone

```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx:118-123
const groupIds = useMemo(() => {
  if (!activeCardId) return new Set<string>();
  const ids = new Set(selectedIds);
  ids.add(activeCardId);
  return ids;
}, [activeCardId, selectedIds]);
```

`CanvasZone` needs `activeCardId` and `selectedIds` passed as props from `BoardDragLayer` (via `BoardView`) to compute `groupIds` and render passenger ghosts. Alternatively, `BoardDragLayer` computes `groupIds` and passes it directly.

### Bounds check for group drop

```typescript
// In BoardDragLayer.handleDragEnd, before dispatching GROUP_PLACE_ON_CANVAS:
const canvasBounds = canvasRef.current?.getBoundingClientRect();
const { w: CARD_W, h: CARD_H } = getCardDimensions();
const canvasW = canvasBounds?.width ?? 0;
const canvasH = canvasBounds?.height ?? 0;

const allInBounds = computedPositions.every(({ x, y }) =>
  x >= 0 && x <= Math.max(0, canvasW - CARD_W) &&
  y >= 0 && y <= Math.max(0, canvasH - CARD_H)
);

if (!allInBounds) {
  // D-13: silent snap-back — do not dispatch
  setActiveCard(null);
  setDragging(false);
  setSelectedIds(new Set());
  setSelectionSource(null);
  dragDataRef.current = null;
  return;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Passenger cards in DragOverlay | Passenger ghost divs inside canvas + single-card DragOverlay | Spike 004 (2026-05) | Avoids multi-card DragOverlay complexity; simpler with absolute positioning |
| `onPointerDown` for selection | `onClick` for selection | Spike 004 (2026-05) | `onPointerDown` breaks dnd-kit listeners; `onClick` is safe |
| `useState` for dragDelta | `useRef` for dragDelta in WS closure, `useState` for render | Phases 32-33 established | Ref prevents stale closure bugs; state drives re-render |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `data-card-id` attribute can be added to hand/spread card elements without breaking existing behavior | Pitfall 3 / Pattern 4 | Low — purely additive DOM attribute; no existing code reads it |
| A2 | `SelectionSource` type is defined inline in `BoardDragLayer.tsx` and `BoardView.tsx` (not in `src/shared/types.ts`) | Pitfall 2 | Low — if already extracted, extraction step is a no-op |

---

## Open Questions

1. **`dragDelta` delivery to `CanvasZone` for passenger ghosts**
   - What we know: `BoardDragLayer` owns the delta ref; `CanvasZone` needs it for rendering.
   - What's unclear: Should `dragDelta` be passed as state prop through `BoardView` → `CanvasZone`, or should `CanvasZone` be elevated into `BoardDragLayer`'s render tree to avoid prop threading?
   - Recommendation: Pass `dragDelta: { x: number; y: number } | null` and `activeCardId: string | null` as props on `CanvasZone`. `BoardDragLayer` maintains a `dragDelta` useState (parallel to existing `dragDeltaRef`) updated in `handleDragMove`. Small perf cost, trivially correct.

2. **Selection count badge location**
   - What we know: UI-SPEC specifies a badge showing `{N} selected` when canvas selection >= 2. The badge should appear "to the right of the canvas zone label."
   - What's unclear: `CanvasZone` has no label currently. The badge could render inside `CanvasZone`, inside `BoardView` next to the canvas, or nowhere (since there's no label to be "to the right of").
   - Recommendation: Render the badge as an overlay in the top-left corner of `CanvasZone` (e.g., `position: absolute; top: 8px; left: 8px; zIndex: 10`). Simpler than adding a label/header to `CanvasZone`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — phase is pure code changes within the existing stack).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vite.config.ts` (inferred) |
| Quick run command | `npm test -- --run tests/canvasCards.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MULTI-01 | Selection ring visual | manual (visual) | — | N/A |
| MULTI-01 | Click toggles selection state | unit | `npm test -- --run tests/canvasCards.test.ts` | ❌ Wave 0 |
| MULTI-02 | Group drop preserves relative positions | unit (server handler) | `npm test -- --run tests/canvasCards.test.ts` | ❌ Wave 0 |
| MULTI-03 | All dropped cards z > existing; internal z-order preserved | unit (server handler) | `npm test -- --run tests/canvasCards.test.ts` | ❌ Wave 0 |
| MULTI-04 | Bounds violation cancels entire drop | unit (server handler) | `npm test -- --run tests/canvasCards.test.ts` | ❌ Wave 0 |
| MULTI-04 | Single undo step restores all N cards | unit (server handler) | `npm test -- --run tests/canvasCards.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run tests/canvasCards.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/canvasCards.test.ts` — add `GROUP_PLACE_ON_CANVAS` describe block covering: happy path (canvas→canvas, hand→canvas, spread→canvas), z-ordering (sorted by pre-drag z, all above maxZ), undo restores all N cards, auth guard (hand fromId mismatch), invalid coordinates, missing card IDs (partial presence rejected atomically)
- [ ] No new test file needed — gaps are new `describe` blocks inside the existing `canvasCards.test.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `fromZone === 'hand' && fromId !== senderToken` → UNAUTHORIZED_MOVE (mirrors PLACE_ON_CANVAS pattern) |
| V5 Input Validation | yes | `Number.isFinite(x) && Number.isFinite(y)` for each card; non-empty `cards` array; no duplicate `cardId`s; all cardIds present in source before takeSnapshot |
| V2 Authentication | no | Existing connection token auth unchanged |
| V6 Cryptography | no | No new crypto requirements |

### Known Threat Patterns for GROUP_PLACE_ON_CANVAS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Moving another player's hand cards | Spoofing / Tampering | `fromId !== senderToken` guard on hand source |
| Duplicate cardIds in group | Tampering | `Set(cardIds).size !== cardIds.length` check → reject |
| Partial group presence (some cardIds missing) | Tampering | Pre-validate ALL cardIds before takeSnapshot; reject if any missing |
| NaN / Infinity coordinates | Tampering | `Number.isFinite(x) && Number.isFinite(y)` per card |
| Empty cards array | Denial of service | `cards.length === 0` → reject (analogous to PLAY_CARD_SET empty check) |

Pre-validate-all before takeSnapshot is the critical atomicity invariant — matches the PLAY_CARD_SET pattern already established in the codebase.

---

## Sources

### Primary (HIGH confidence)

- `src/spikes/Spike004MultiCardDrop.tsx` — validated multi-card group drop implementation; all patterns extracted directly
- `.planning/spikes/004-multi-card-group-drop/README.md` — spike verdict VALIDATED; two bugs found and fixed (onClick vs onPointerDown, distance:8 constraint)
- `src/components/BoardDragLayer.tsx` — production source; `SelectionSource` type, `handleDragEnd` canvas branch, `dragDeltaRef` pattern
- `src/components/CanvasZone.tsx` — production source; `coveringIds` useMemo, dual-ref pattern
- `src/components/CanvasDraggableCard.tsx` — production source; `didDragRef` pattern, `isDragging` opacity pattern
- `src/shared/types.ts` — production types; `ClientAction` union, `CanvasCard` shape
- `party/index.ts` — production server; `PLACE_ON_CANVAS` handler as atomicity reference pattern
- `tests/canvasCards.test.ts` — existing test patterns; `makeMockRoom`, `makeMockConnection`, `getErrors` helpers
- `.planning/phases/34-multi-card-group-drop/34-CONTEXT.md` — all locked decisions D-01 through D-17
- `.planning/phases/34-multi-card-group-drop/34-UI-SPEC.md` — visual contract; exact boxShadow values, badge spec, passenger ghost spec

### Secondary (MEDIUM confidence)

- `src/lib/canvas-utils.ts` — `CARD_W`, `CARD_H`, `getCardDimensions()`, `coversMajority()` — reused for bounds check
- `src/components/BoardView.tsx` — prop flow; shows `selectionSource` type declared inline, confirms `CanvasZone` receives `canvasRef` prop only today

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all in use
- Architecture: HIGH — Spike 004 validated; patterns transplanted directly
- Pitfalls: HIGH — identified from direct code inspection of production files and spike diff

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable stack; dnd-kit API won't change meaningfully in 30 days)
