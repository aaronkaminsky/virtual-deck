# Phase 34: Multi-Card Group Drop - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 6 modified files + 1 test file
**Analogs found:** 6 / 6

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/shared/types.ts` | model/type | transform | itself (`PLACE_ON_CANVAS` union member) | exact |
| `party/index.ts` | server/handler | request-response + CRUD | itself (`PLACE_ON_CANVAS` case) | exact |
| `src/components/BoardDragLayer.tsx` | controller | event-driven | itself (existing canvas branch in `handleDragEnd`) | exact |
| `src/components/BoardView.tsx` | component/router | request-response | itself (existing `selectionSource` prop chain) | exact |
| `src/components/CanvasZone.tsx` | component | event-driven | `src/spikes/Spike004MultiCardDrop.tsx` (canvas div + ghost block) | role-match |
| `src/components/CanvasDraggableCard.tsx` | component | event-driven | `src/spikes/Spike004MultiCardDrop.tsx` (`DraggableCard` inner component) | exact |
| `tests/canvasCards.test.ts` | test | batch | itself (existing `PLACE_ON_CANVAS` describe block) | exact |

---

## Pattern Assignments

### `src/shared/types.ts` (model, transform)

**Analog:** `src/shared/types.ts` — the `ClientAction` union and the existing `PLACE_ON_CANVAS` member

**New union member to add** (after line 88, the `PLACE_ON_CANVAS` entry):
```typescript
// src/shared/types.ts lines 73-88 — existing ClientAction union structure:
export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  // ... other members ...
  | { type: "PLACE_ON_CANVAS"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; x: number; y: number };
  // ADD after this line:
  | { type: "GROUP_PLACE_ON_CANVAS"; fromZone: "hand" | "pile" | "canvas"; fromId: string; cards: { cardId: string; x: number; y: number }[] }
```

**SelectionSource type** — currently inline in `BoardDragLayer.tsx` line 64 and `BoardView.tsx` line 23. Extract to `src/shared/types.ts` (or a client-only file) and extend:
```typescript
// Current form (BoardDragLayer.tsx line 64):
type SelectionSource = { zone: 'hand' | 'pile'; zoneId: string; hasMaskedCards?: boolean } | null;

// New form (to be extracted and extended):
export type SelectionSource =
  | { zone: 'hand' | 'pile'; zoneId: string; hasMaskedCards?: boolean }
  | { zone: 'canvas'; zoneId: 'canvas' }
  | null;
```

**Update consumers:** `BoardDragLayer.tsx` (line 64 — remove local type, import), `BoardView.tsx` (line 23 — remove inline type, import). `HandZone` and `SpreadZone` receive `selectionSource` and compare `.zone === 'hand'` / `.zone === 'pile'` — those comparisons remain valid after the union extension.

---

### `party/index.ts` (server handler, CRUD)

**Analog:** `party/index.ts` — `PLACE_ON_CANVAS` case (lines 574–646)

**Auth guard pattern** (lines 588–595 — copy verbatim, adjust for group shape):
```typescript
// V4: hand source auth guard — mirrors MOVE_CARD pattern
if (fromZone === "hand" && fromId !== senderToken) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "UNAUTHORIZED_MOVE",
    message: "Cannot move another player's cards",
  } satisfies ServerEvent));
  break;
}
```

**Coordinate validation pattern** (lines 578–585 — adapt for array of cards):
```typescript
// V5: coordinate validation — apply per card in the group
if (!Number.isFinite(x) || !Number.isFinite(y)) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "INVALID_COORDINATES",
    message: "x and y must be finite numbers",
  } satisfies ServerEvent));
  break;
}
```

**CARD_NOT_IN_SOURCE error pattern** (lines 604–611):
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "CARD_NOT_IN_SOURCE",
  message: `Card ${cardId} not found in hand`,
} satisfies ServerEvent));
break;
```

**Core PLACE_ON_CANVAS handler structure** (lines 574–646) — the GROUP handler follows the same sequence:
1. Validate coordinates (per card in group)
2. Validate auth (hand source)
3. Validate empty cards array (new: `cards.length === 0` → `EMPTY_CARD_SET`)
4. Validate no duplicate cardIds (new: `Set(cardIds).size !== cardIds.length` → reject)
5. Compute `maxZ` **before** any splice (line 600: `this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0)`)
6. Pre-validate ALL cardIds exist in source — reject if ANY missing (atomicity invariant)
7. `takeSnapshot(this.gameState)` — AFTER validation, BEFORE mutation (lines 612, 625, 638)
8. Remove all from source atomically
9. Sort by pre-drop z, push to canvasCards with `maxZ + 1 + rank`
10. `break` — broadcast handled by the outer `broadcastState()` call

**z-ordering pattern** (Spike004 lines 174–184 — adapted for server):
```typescript
// Sort moving cards by pre-drop z to preserve internal order
const withPreZ = resolvedCards.sort((a, b) => a.preDragZ - b.preDragZ);
// Push to canvas with consecutive z-values above existing cards
withPreZ.forEach((mc, rank) => {
  mc.card.faceUp = true;
  this.gameState.canvasCards.push({ card: mc.card, x: mc.x, y: mc.y, z: maxZ + 1 + rank });
});
```

**`faceUp = true` on placement** (line 643: `canvasCard!.faceUp = true`) — apply to every card in the group.

**Source removal patterns by zone** — copy the per-zone splice blocks from PLACE_ON_CANVAS (lines 601–641), wrapping each in a loop over `cardIds`. Note: for canvas→canvas, `this.gameState.canvasCards.splice(idx, 1)` with `removed.card`; for hand, `hand.splice(idx, 1)`; for pile, `pile!.cards.splice(idx, 1)`.

---

### `src/components/BoardDragLayer.tsx` (controller, event-driven)

**Analog:** itself — existing `handleDragStart`, `handleDragMove`, `handleDragEnd`, and state declarations

**Existing state declarations to extend** (lines 85–96):
```typescript
// Lines 85-96 — existing state:
const [activeCard, setActiveCard] = useState<Card | null>(null);
const activeDragOriginRef = useRef<{ x: number; y: number } | null>(null);
const [dragCoversSomeCard, setDragCoversSomeCard] = useState(false);
const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
const canvasRef = useRef<HTMLDivElement>(null);

// ADD: parallel dragDelta state for passenger ghost rendering (Pitfall 1 in RESEARCH.md)
const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
// ADD: ref for hand/spread passenger DOM offsets captured at drag start (D-11)
const passengerOffsetsRef = useRef<Record<string, { offsetX: number; offsetY: number }>>({});
```

**`handleToggleSelect` pattern for canvas extension** (lines 98–120 — existing hand/pile version; canvas version follows the same shape):
```typescript
// Existing hand/pile version (lines 98-120):
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
};

// New canvas-specific toggle — add as a separate handler or extend the existing signature:
const handleToggleSelectCanvas = (id: string) => {
  // D-01: selectionSource.zoneId for canvas is literal 'canvas'
  const isDifferentZone = selectionSource !== null && selectionSource.zone !== 'canvas';
  if (isDifferentZone) {
    setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
    setSelectedIds(new Set([id]));
    return;
  }
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  if (selectionSource === null) setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
};
```

**`handleDragStart` extension pattern** (lines 188–213 — add canvas group logic):
```typescript
// Existing cross-zone clear (lines 199-204) — preserved:
if (!selectedIds.has(String(event.active.id))) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
// ADD after origin capture: DOM offset capture for hand/spread sources (D-11, Pattern 4):
if (data.fromZone !== 'canvas' && selectedIds.size > 0) {
  const handleEl = document.querySelector(`[data-card-id="${event.active.id}"]`);
  const handleRect = handleEl?.getBoundingClientRect();
  const offsets: Record<string, { offsetX: number; offsetY: number }> = {};
  for (const cardId of selectedIds) {
    const el = document.querySelector(`[data-card-id="${cardId}"]`);
    const rect = el?.getBoundingClientRect();
    if (handleRect && rect) {
      offsets[cardId] = { offsetX: rect.left - handleRect.left, offsetY: rect.top - handleRect.top };
    }
  }
  passengerOffsetsRef.current = offsets;
}
// ADD: initialize dragDelta state for passenger ghost rendering
setDragDelta({ x: 0, y: 0 });
```

**`handleDragMove` extension** (lines 215–226):
```typescript
// ADD to handleDragMove, parallel to existing dragDeltaRef update:
dragDeltaRef.current = { x: event.delta.x, y: event.delta.y };
setDragDelta({ x: event.delta.x, y: event.delta.y }); // drives passenger ghost re-render
```

**`handleDragEnd` canvas branch extension** (lines 228–274 — add GROUP path):
```typescript
// Existing single-card canvas branch (lines 232-274):
if (event.over?.id === 'canvas' && dragDataRef.current) {
  // ... single card PLACE_ON_CANVAS logic ...
}

// ADD GROUP path BEFORE single-card path — check for multi-card group drop:
if (event.over?.id === 'canvas' && dragDataRef.current) {
  const { card, fromZone, fromId } = dragDataRef.current;
  const activeId = String(event.active.id);
  const isGroup = selectedIds.size > 0 && selectedIds.has(activeId);
  // Only dispatch GROUP action if multiple cards are moving to canvas
  const groupCardIds = isGroup ? new Set([...selectedIds]) : new Set([activeId]);
  // ... bounds check ALL group cards (D-13) ...
  // ... if allInBounds, dispatch GROUP_PLACE_ON_CANVAS ...
  // ... else silent snap-back (D-15) ...
}
```

**Bounds check pattern** (existing lines 236–257, extract and extend for group):
```typescript
// Existing pattern for canvasBounds (lines 236-237):
const canvasBounds = canvasRef.current?.getBoundingClientRect();
const { w: CARD_W, h: CARD_H } = getCardDimensions();
const canvasW = canvasBounds?.width ?? 0;
const canvasH = canvasBounds?.height ?? 0;

// Group bounds check — every card must pass:
const allInBounds = computedPositions.every(({ x, y }) =>
  x >= 0 && x <= Math.max(0, canvasW - CARD_W) &&
  y >= 0 && y <= Math.max(0, canvasH - CARD_H)
);
if (!allInBounds) {
  // D-15: silent snap-back — clear state, no dispatch
  setActiveCard(null);
  setDragging(false);
  setSelectedIds(new Set());
  setSelectionSource(null);
  setDragDelta(null);
  dragDataRef.current = null;
  return;
}
```

**Post-drop state clear pattern** (lines 259–264 — matches all successful drop branches):
```typescript
dropSuccessRef.current = true;
setActiveCard(null);
setDragging(false);
setSelectedIds(new Set());
setSelectionSource(null);
setDragDelta(null);  // ADD: clear passenger delta state
dragDataRef.current = null;
```

---

### `src/components/BoardView.tsx` (component/router, request-response)

**Analog:** itself — lines 20–24 (prop interface) and line 93 (CanvasZone render)

**Props interface change** (line 23 — inline type → imported type):
```typescript
// Current (line 23):
selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null;

// New (after SelectionSource extracted to shared/types.ts):
selectionSource: SelectionSource;  // imported from '@/shared/types'
```

**CanvasZone render call extension** (line 93 — add new props):
```typescript
// Current (line 93):
<CanvasZone canvasCards={gameState.canvasCards} canvasRef={canvasRef} />

// New (thread through group drag props):
<CanvasZone
  canvasCards={gameState.canvasCards}
  canvasRef={canvasRef}
  selectedIds={selectedIds}
  activeCardId={activeCard?.id ?? null}  // needs activeCard surfaced from BoardDragLayer or passed as prop
  dragDelta={dragDelta}
  onToggleSelectCanvas={handleToggleSelectCanvas}
  onDeselectAll={handleDeselectAll}
/>
```

Note: `activeCard` is currently state inside `BoardDragLayer` and is not passed to `BoardView`. Either thread `activeCardId` through or compute `groupIds` inside `BoardDragLayer` and pass it directly as `groupIds: Set<string>` to `BoardView` → `CanvasZone`. The latter avoids exposing raw `activeCard` state.

---

### `src/components/CanvasZone.tsx` (component, event-driven)

**Analog:** `src/spikes/Spike004MultiCardDrop.tsx` — canvas container div (lines 229–269) + `passengerGhosts` useMemo (lines 207–210)

**Props interface to add:**
```typescript
// Current (lines 8-11):
interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

// New:
interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectedIds: Set<string>;
  groupIds: Set<string>;            // handle + selected; computed in BoardDragLayer
  dragDelta: { x: number; y: number } | null;
  onToggleSelectCanvas: (id: string) => void;
  onDeselectAll: () => void;
}
```

**passengerGhosts useMemo pattern** (Spike004 lines 207–210):
```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx lines 207-210
const passengerGhosts = useMemo(() => {
  if (!dragDelta) return [];
  // Passengers = selected cards that are NOT the drag handle
  // (handle is in DragOverlay; passengers are ghost divs)
  return canvasCards.filter(cc => cc.card.id !== activeCardId && groupIds.has(cc.card.id));
}, [dragDelta, canvasCards, activeCardId, groupIds]);
```

**Passenger ghost JSX pattern** (Spike004 lines 253–268):
```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx lines 253-268
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

**Canvas background deselect-all pattern** (D-05 — `onClick` on the container div with stopPropagation on cards):
```typescript
// On the CanvasZone container div:
<div
  ref={setRefs}
  onClick={onDeselectAll}          // D-05: clicking empty canvas deselects all
  aria-label="Play area"
  data-testid="canvas-zone"
  className={cn('relative flex-1 min-w-0 self-stretch overflow-hidden bg-background', isOver && 'ring-1 ring-primary/30')}
>
  {/* CanvasDraggableCard must call e.stopPropagation() in its onClick handler — D-05 */}
  {/* passenger ghost divs have pointerEvents:'none', so clicks fall through to container */}
```

**`coveringIds` useMemo** (existing lines 24–32 — unchanged, still needed for stack shadow):
```typescript
// Lines 24-32 — keep as-is:
const coveringIds = useMemo(() => {
  const ids = new Set<string>();
  for (const card of canvasCards) {
    if (canvasCards.some(other => other.z < card.z && coversMajority(card, other))) {
      ids.add(card.card.id);
    }
  }
  return ids;
}, [canvasCards]);
```

**CanvasDraggableCard render call extension** (line 44–49 — add selection props):
```typescript
// Current (lines 44-49):
<CanvasDraggableCard
  key={cc.card.id}
  canvasCard={cc}
  coversAnother={coveringIds.has(cc.card.id)}
/>

// New:
<CanvasDraggableCard
  key={cc.card.id}
  canvasCard={cc}
  coversAnother={coveringIds.has(cc.card.id)}
  isSelected={selectedIds.has(cc.card.id)}
  isPassenger={groupIds.has(cc.card.id) && cc.card.id !== activeCardId}
  onToggleSelect={onToggleSelectCanvas}
/>
```

---

### `src/components/CanvasDraggableCard.tsx` (component, event-driven)

**Analog:** `src/spikes/Spike004MultiCardDrop.tsx` — `DraggableCard` inner component (lines 55–102)

**Props interface to add** (current lines 9–11):
```typescript
// Current:
interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  coversAnother?: boolean;
}

// New:
interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  coversAnother?: boolean;
  isSelected?: boolean;
  isPassenger?: boolean;    // D-17: passenger source cards → opacity:0
  onToggleSelect?: (id: string) => void;
}
```

**`handleClick` — wire selection toggle** (current lines 35–41, no-op body):
```typescript
// Current (lines 35-41):
function handleClick() {
  if (didDragRef.current) {
    didDragRef.current = false;
    return;
  }
  // Phase 32: no flip; click reserved for Phase 33+
}

// New:
function handleClick(e: React.MouseEvent) {
  e.stopPropagation();           // D-05: prevent canvas background deselect-all from firing
  if (didDragRef.current) {
    didDragRef.current = false;
    return;
  }
  onToggleSelect?.(canvasCard.card.id);
}
```

**Selection ring + opacity style pattern** (Spike004 lines 88–100):
```typescript
// Source: src/spikes/Spike004MultiCardDrop.tsx lines 78-101
// Current style (lines 44-54):
const style: React.CSSProperties = {
  position: 'absolute',
  left: canvasCard.x,
  top: canvasCard.y,
  zIndex: canvasCard.z,
  opacity: isDragging ? 0 : 1,
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
  boxShadow: coversAnother ? STACK_SHADOW : undefined,
  borderRadius: coversAnother ? 6 : undefined,
};

// New (extend opacity and boxShadow):
const style: React.CSSProperties = {
  position: 'absolute',
  left: canvasCard.x,
  top: canvasCard.y,
  zIndex: canvasCard.z,
  opacity: (isDragging || isPassenger) ? 0 : 1,    // D-17: passengers also hidden
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
  boxShadow: isSelected
    ? `0 0 0 2px #60a5fa, 0 0 0 4px rgba(96,165,250,0.3)${coversAnother ? `, ${STACK_SHADOW}` : ''}`
    : coversAnother ? STACK_SHADOW : undefined,
  borderRadius: (isSelected || coversAnother) ? 6 : undefined,
};
```

**`data-card-id` attribute** — add to the root div for DOM offset capture (Pitfall 3 in RESEARCH.md):
```typescript
// On the root div (current line 56-65):
<div
  ref={setNodeRef}
  style={style}
  onClick={handleClick}
  data-card-id={canvasCard.card.id}    // ADD: required for getBoundingClientRect() in BoardDragLayer
  {...listeners}
  {...attributes}
  aria-roledescription="Draggable card"
  aria-label={`${canvasCard.card.rank} of ${canvasCard.card.suit}`}
  aria-pressed={undefined}
>
```

**`didDragRef` pattern** (current lines 21–33 — unchanged, already correct):
```typescript
// Lines 21-33 — keep exactly as-is (includes clearTimeout cleanup):
const didDragRef = useRef(false);
const prevIsDragging = useRef(false);
useEffect(() => {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (prevIsDragging.current && !isDragging) {
    timerId = setTimeout(() => { didDragRef.current = false; }, 300);
  }
  if (isDragging) didDragRef.current = true;
  prevIsDragging.current = isDragging;
  return () => {
    if (timerId !== null) clearTimeout(timerId);
  };
}, [isDragging]);
```

---

### `tests/canvasCards.test.ts` (test, batch)

**Analog:** itself — the `PLACE_ON_CANVAS handler` describe block (lines 53–end)

**Test harness pattern** (lines 1–41 — copy exactly):
```typescript
// Lines 7-41: makeCard, makeMockRoom, makeMockConnection, getErrors helpers
// All remain unchanged — new describe block reuses all four helpers.
function makeCard(id: string): Card { ... }
function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room { ... }
function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } { ... }
function getErrors(sender: { send: ReturnType<typeof vi.fn> }): Array<...> { ... }
```

**beforeEach setup pattern** (lines 55–63 — copy and adjust player count as needed):
```typescript
// Lines 55-63:
describe("GROUP_PLACE_ON_CANVAS handler", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });
  // ... test cases ...
});
```

**Single-card happy path test pattern** (lines 65–80 — adapt for group):
```typescript
// Lines 65-80 — existing PLACE_ON_CANVAS happy path:
it("places hand card on canvas with z=1 when canvas empty", async () => {
  room.gameState.hands["player-1"] = [makeCard("A-s")];
  await room.onMessage(
    JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 100, y: 50 }),
    sender,
  );
  expect(room.gameState.canvasCards).toHaveLength(1);
  expect(room.gameState.canvasCards[0].z).toBe(1);
  expect(room.gameState.canvasCards[0].card.faceUp).toBe(true);
});

// GROUP equivalent:
it("places group of 2 hand cards on canvas, both above existing z, preserving internal z-order", async () => {
  room.gameState.canvasCards = [{ card: makeCard("existing"), x: 0, y: 0, z: 5 }];
  room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h")];
  await room.onMessage(
    JSON.stringify({
      type: "GROUP_PLACE_ON_CANVAS",
      fromZone: "hand",
      fromId: "player-1",
      cards: [{ cardId: "A-s", x: 100, y: 50 }, { cardId: "K-h", x: 160, y: 50 }],
    }),
    sender,
  );
  const aEntry = room.gameState.canvasCards.find(cc => cc.card.id === "A-s");
  const kEntry = room.gameState.canvasCards.find(cc => cc.card.id === "K-h");
  expect(aEntry?.z).toBeGreaterThan(5);
  expect(kEntry?.z).toBeGreaterThan(5);
  // internal z-order preserved
});
```

**Error test patterns** (lines 126–154 — adapt INVALID_COORDINATES and UNAUTHORIZED_MOVE):
```typescript
// INVALID_COORDINATES — adapt for per-card validation:
it("rejects group with NaN coordinate in any card, no mutation", async () => { ... });

// UNAUTHORIZED_MOVE — copy auth guard pattern:
it("rejects hand source with mismatched senderToken", async () => { ... });
```

---

## Shared Patterns

### `didDragRef` click-vs-drag disambiguation
**Source:** `src/components/CanvasDraggableCard.tsx` lines 21–33 (production) / `src/spikes/Spike004MultiCardDrop.tsx` lines 63–71
**Apply to:** `CanvasDraggableCard.tsx` — already present and correct; no change needed
```typescript
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
```

### Auth guard (hand source)
**Source:** `party/index.ts` lines 588–595 (PLACE_ON_CANVAS handler)
**Apply to:** `GROUP_PLACE_ON_CANVAS` server handler
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

### Pre-validate-all before takeSnapshot (atomicity invariant)
**Source:** `party/index.ts` — PLAY_CARD_SET handler (lines 658–698) and PLACE_ON_CANVAS (lines 598–641)
**Apply to:** `GROUP_PLACE_ON_CANVAS` handler — validate ALL card IDs exist in source before calling `takeSnapshot`. Never take a snapshot mid-validation.

### `takeSnapshot` placement (after validation, before mutation)
**Source:** `party/index.ts` lines 612, 625, 638 (each branch in PLACE_ON_CANVAS)
**Apply to:** `GROUP_PLACE_ON_CANVAS` — call `takeSnapshot(this.gameState)` once, after all validation passes, before the first splice.

### State clear pattern on successful drop
**Source:** `src/components/BoardDragLayer.tsx` lines 259–264 (canvas branch of handleDragEnd)
**Apply to:** All successful GROUP_PLACE_ON_CANVAS dispatch paths in `handleDragEnd`
```typescript
dropSuccessRef.current = true;
setActiveCard(null);
setDragging(false);
setSelectedIds(new Set());
setSelectionSource(null);
dragDataRef.current = null;
// + new: setDragDelta(null);
```

### Error response format
**Source:** `party/index.ts` lines 578–595 (PLACE_ON_CANVAS validation)
**Apply to:** All new server error paths in GROUP_PLACE_ON_CANVAS
```typescript
sender.send(JSON.stringify({
  type: "ERROR",
  code: "...",
  message: "...",
} satisfies ServerEvent));
break;
```

### `bufferRef` / `isDraggingRef` pattern (inherited, no change)
**Source:** Described in CLAUDE.md conventions; `usePartySocket` in app entry point
**Apply to:** GROUP_PLACE_ON_CANVAS drag uses the same `setDragging(true/false)` gate that already drives the WebSocket buffer — no new work required.

### `MeasuringStrategy.Always` on DndContext
**Source:** `src/components/BoardDragLayer.tsx` line 443
**Apply to:** Already present — no change needed for Phase 34.

### `PointerSensor { distance: 8 }` activation constraint
**Source:** `src/components/BoardDragLayer.tsx` lines 134–137
**Apply to:** Already present — required for click-vs-drag on canvas cards (Spike 004 confirmed).

---

## No Analog Found

No files require patterns without codebase analog. All patterns are sourced from either the production codebase or the validated Spike 004 implementation.

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`, `src/spikes/`
**Files read:** 8 (BoardDragLayer.tsx, CanvasZone.tsx, CanvasDraggableCard.tsx, Spike004MultiCardDrop.tsx, types.ts, party/index.ts lines 540–700, canvasCards.test.ts, BoardView.tsx partial)
**Pattern extraction date:** 2026-05-25
