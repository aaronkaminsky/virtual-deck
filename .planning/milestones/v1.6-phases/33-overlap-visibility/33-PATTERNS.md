# Phase 33: Overlap & Visibility - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 4 new/modified files
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/canvas-utils.ts` | utility | transform | `src/lib/utils.ts` | role-match (same lib/ utility pattern; different domain) |
| `src/components/CanvasDraggableCard.tsx` | component | request-response | `src/spikes/Spike002OverlapHitTesting.tsx` `FreeDraggableCard` (lines 55–82) | exact (same draggable card pattern + shadow prop) |
| `src/components/CanvasZone.tsx` | component | CRUD | `src/spikes/Spike002OverlapHitTesting.tsx` `Spike002OverlapHitTesting` (lines 90–98) | exact (coveringIds useMemo directly transplantable) |
| `src/components/BoardDragLayer.tsx` | component | event-driven | `src/spikes/Spike002OverlapHitTesting.tsx` `Spike002OverlapHitTesting` (lines 100–145) | role-match (production file has more complexity; spike shows ref-based delta + onDragMove hookup) |
| `tests/overlapUtils.test.ts` | test | transform | `tests/deck.test.ts` + `tests/canvasCards.test.ts` | role-match (pure utility unit tests; describe/it/expect pattern) |

---

## Pattern Assignments

### `src/lib/canvas-utils.ts` (utility, transform) — NEW FILE

**Analog:** `src/lib/utils.ts` (same directory, pure TypeScript utility export)

**Imports pattern** (`src/lib/utils.ts` lines 1–2):
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
```
canvas-utils.ts has no imports — it is a self-contained math utility. No import block needed.

**Core pattern** (extracted from `src/spikes/Spike002OverlapHitTesting.tsx` lines 45–53):
```typescript
// These constants match BoardDragLayer.tsx desktop card dims (window.innerWidth >= 640 check)
const CARD_W = 63;
const CARD_H = 88;
export const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

export function coversMajority(top: { x: number; y: number }, bottom: { x: number; y: number }): boolean {
  const overlapW = Math.max(0, Math.min(top.x + CARD_W, bottom.x + CARD_W) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + CARD_H, bottom.y + CARD_H) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > CARD_W * CARD_H * 0.5;
}
```

**Note on spike signature vs. production:** The spike's `coversMajority(top, bottom: CanvasCard)` takes a local `CanvasCard` type for `bottom`. In production, both arguments should be `{ x: number; y: number }` — structural typing, no import of `CanvasCard` required. `canvas-utils.ts` must not import from `@/shared/types` to keep it dependency-free.

---

### `src/components/CanvasDraggableCard.tsx` (component, request-response) — MODIFIED

**Analog:** `src/spikes/Spike002OverlapHitTesting.tsx` `FreeDraggableCard` (lines 55–82)

**Prop interface extension** (extend existing interface at lines 8–11):
```typescript
// Current (lines 8-11 of CanvasDraggableCard.tsx):
interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  isDraggingActive?: boolean; // currently unused — held for Phase 33 layered effects
}

// Add coversAnother prop:
interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  isDraggingActive?: boolean;
  coversAnother?: boolean;  // true when this card covers >50% of a lower card
}
```

**Core style pattern** (spike lines 66–77 → apply to production style object at lines 39–47):
```typescript
// Spike analog (FreeDraggableCard style block, lines 64-77):
style={{
  position: 'absolute',
  left: cc.x,
  top: cc.y,
  zIndex: cc.z,
  opacity: isDragging ? 0 : 1,
  touchAction: 'none',
  cursor: 'grab',
  userSelect: 'none',
  boxShadow: coversAnother ? STACK_SHADOW : undefined,
  borderRadius: coversAnother ? 6 : undefined,
}}

// Production target (CanvasDraggableCard.tsx lines 39-47):
const style: React.CSSProperties = {
  position: 'absolute',
  left: canvasCard.x,
  top: canvasCard.y,
  zIndex: canvasCard.z,
  opacity: isDragging ? 0 : 1,
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
  // ADD these two lines:
  boxShadow: coversAnother ? STACK_SHADOW : undefined,
  borderRadius: coversAnother ? 6 : undefined,
};
```

**Import addition** (line 1 area — add STACK_SHADOW import):
```typescript
import { STACK_SHADOW } from '@/lib/canvas-utils';
```

---

### `src/components/CanvasZone.tsx` (component, CRUD) — MODIFIED

**Analog:** `src/spikes/Spike002OverlapHitTesting.tsx` lines 90–98 (coveringIds useMemo)

**Import addition** (after existing imports):
```typescript
import { useMemo } from 'react';
import { coversMajority } from '@/lib/canvas-utils';
```
Note: `React` is already imported as a namespace import (line 1); `useMemo` needs to be added to the named import list or added as `React.useMemo`.

**Core useMemo pattern** (spike lines 90–98 — directly transplantable):
```typescript
// Add inside CanvasZone component body, before the return:
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

**Prop threading** (update the CanvasDraggableCard render at lines 33–39):
```typescript
// Current (lines 33-39):
{canvasCards.map((cc) => (
  <CanvasDraggableCard
    key={cc.card.id}
    canvasCard={cc}
    isDraggingActive={draggingCardId === cc.card.id}
  />
))}

// Modified:
{canvasCards.map((cc) => (
  <CanvasDraggableCard
    key={cc.card.id}
    canvasCard={cc}
    isDraggingActive={draggingCardId === cc.card.id}
    coversAnother={coveringIds.has(cc.card.id)}
  />
))}
```

---

### `src/components/BoardDragLayer.tsx` (component, event-driven) — MODIFIED

**Analog:** `src/spikes/Spike002OverlapHitTesting.tsx` lines 84–145 (drag handlers + DragOverlay shadow)

**Import extension** (line 4 — add `DragMoveEvent` type):
```typescript
// Current line 4:
import type { CollisionDetection, DragStartEvent, DragEndEvent } from '@dnd-kit/core';

// Add DragMoveEvent:
import type { CollisionDetection, DragStartEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
```

**New imports** (after existing imports):
```typescript
import { coversMajority, STACK_SHADOW } from '@/lib/canvas-utils';
```

**New state/ref declarations** (add after existing refs at lines 84–92):
```typescript
// Add alongside existing activeCard state:
const [activeDragOrigin, setActiveDragOrigin] = useState<{ x: number; y: number } | null>(null);
const [dragCoversSomeCard, setDragCoversSomeCard] = useState(false);
const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
```

**handleDragStart extension** (extend existing handleDragStart at lines 184–201):
```typescript
// Add at end of handleDragStart, after setActiveCard(data.card) and setDragging(true):
if (data.fromZone === 'canvas') {
  const existing = gameState.canvasCards.find(cc => cc.card.id === data.card.id);
  setActiveDragOrigin(existing ? { x: existing.x, y: existing.y } : null);
} else {
  setActiveDragOrigin(null);
}
dragDeltaRef.current = { x: 0, y: 0 };
```

**New handleDragMove function** (add after handleDragStart):
```typescript
// Pattern source: CONTEXT.md D-06; spike lines 120-121 adapted to ref-based pattern
function handleDragMove(event: DragMoveEvent) {
  // Guard: only compute overlap for canvas drags (Pitfall 3)
  if (dragDataRef.current?.fromZone !== 'canvas') return;
  if (!activeDragOrigin) return;

  dragDeltaRef.current = { x: event.delta.x, y: event.delta.y };
  const draggedPos = {
    x: activeDragOrigin.x + event.delta.x,
    y: activeDragOrigin.y + event.delta.y,
  };
  const nowCovers = gameState.canvasCards.some(
    other => other.card.id !== activeCard?.id && coversMajority(draggedPos, other)
  );
  // setState only on boolean flip — not every pointermove (Pitfall anti-pattern)
  if (nowCovers !== dragCoversSomeCard) setDragCoversSomeCard(nowCovers);
}
```

**handleDragEnd reset** (add at start of handleDragEnd cleanup branches — see Pitfall 2):
```typescript
// Add to handleDragEnd and handleDragCancel cleanup (reset after any drag end):
setDragCoversSomeCard(false);
setActiveDragOrigin(null);
```

**DndContext hookup** (line 411 area — add onDragMove prop):
```typescript
// Current (lines 408-414):
<DndContext
  sensors={sensors}
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
>

// Add onDragMove:
<DndContext
  sensors={sensors}
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
>
```

**DragOverlay shadow** (lines 418–424 — add conditional boxShadow/borderRadius):
```typescript
// Current (lines 418-424):
<DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
  {/* D-13: DragOverlay 0.5 opacity + scale 1.05 */}
  {activeCard ? (
    <div style={{ opacity: 0.5, transform: 'scale(1.05)' }}>
      <CardOverlay card={activeCard} />
    </div>
  ) : null}
</DragOverlay>

// Modified (add boxShadow + borderRadius from spike lines 195-204):
<DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
  {activeCard ? (
    <div style={{
      opacity: 0.5,
      transform: 'scale(1.05)',
      boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined,
      borderRadius: dragCoversSomeCard ? 6 : undefined,
    }}>
      <CardOverlay card={activeCard} />
    </div>
  ) : null}
</DragOverlay>
```

---

### `tests/overlapUtils.test.ts` (test, transform) — NEW FILE

**Analog:** `tests/deck.test.ts` (pure utility unit tests; no mocks, no PartyKit) and `tests/canvasCards.test.ts` (describe/it/expect/beforeEach pattern)

**Imports pattern** (`tests/deck.test.ts` lines 1–3):
```typescript
import { describe, it, expect } from "vitest";
import { buildDeck, defaultGameState } from "../party/index";
```

**Test file imports** (for overlapUtils.test.ts):
```typescript
import { describe, it, expect } from "vitest";
import { coversMajority, STACK_SHADOW } from "../src/lib/canvas-utils";
```

**Core test structure pattern** (`tests/deck.test.ts` lines 5–43 — describe block with single-assertion `it` cases):
```typescript
describe("coversMajority", () => {
  it("returns false when cards do not overlap at all", () => { ... });
  it("returns false when overlap area equals exactly 50%", () => { ... });
  it("returns true when overlap area exceeds 50%", () => { ... });
  it("returns true for full overlap (same position)", () => { ... });
});

describe("STACK_SHADOW", () => {
  it("matches the spec value", () => {
    expect(STACK_SHADOW).toBe('2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db');
  });
});

describe("coveringIds useMemo logic (inline)", () => {
  it("identifies covering card in a 2-card overlap scenario", () => { ... });
  it("does not flag cards that only partially overlap (<50%)", () => { ... });
  it("flags only the top card (higher z) in a pair, not the bottom", () => { ... });
});
```

---

## Shared Patterns

### useMemo dependency array
**Source:** `src/spikes/Spike002OverlapHitTesting.tsx` line 98
**Apply to:** `CanvasZone.tsx` `coveringIds` useMemo
```typescript
}, [canvasCards]);
// Note from RESEARCH.md Pitfall 4: canvasCards always changes reference on server update.
// This is correct and expected — do NOT add deep equality checks.
```

### Ref-based drag tracking (no per-event re-render)
**Source:** CLAUDE.md convention `isDraggingRef = useRef(false)` pattern + spike
**Apply to:** `BoardDragLayer.tsx` `handleDragMove`
```typescript
// dragDeltaRef absorbs every pointermove — no setState here:
dragDeltaRef.current = { x: event.delta.x, y: event.delta.y };
// Only setState on boolean flip:
if (nowCovers !== dragCoversSomeCard) setDragCoversSomeCard(nowCovers);
```

### dragDataRef zone guard
**Source:** `src/components/BoardDragLayer.tsx` line 88 (`dragDataRef` already exists)
**Apply to:** `handleDragMove` — non-canvas drag guard
```typescript
if (dragDataRef.current?.fromZone !== 'canvas') return;
```
`dragDataRef` is set synchronously in `handleDragStart` before any `onDragMove` fires — safe by dnd-kit event ordering.

### Drag state reset on dragEnd + dragCancel
**Source:** `src/components/BoardDragLayer.tsx` lines 396–404 (`handleDragCancel` pattern)
**Apply to:** Both `handleDragEnd` and `handleDragCancel` in `BoardDragLayer.tsx`
```typescript
// Pattern: reset all drag-session state in both end and cancel handlers
setDragCoversSomeCard(false);
setActiveDragOrigin(null);
```

---

## No Analog Found

All files have analogs. None require fallback to RESEARCH.md patterns alone.

---

## Critical Pitfalls (from RESEARCH.md — planner must reference)

| Pitfall | Affected File | Guard |
|---------|--------------|-------|
| `activeCard` is `Card`, not `CanvasCard` — no `{x,y}` | `BoardDragLayer.tsx` | Store `activeDragOrigin: {x,y}\|null` in dragStart; use in dragMove |
| Shadow not reset on dragEnd/dragCancel | `BoardDragLayer.tsx` | `setDragCoversSomeCard(false)` in both handlers |
| `onDragMove` fires for ALL drags, not just canvas | `BoardDragLayer.tsx` | `if (dragDataRef.current?.fromZone !== 'canvas') return;` guard |
| `useMemo` recomputes on every `canvasCards` update | `CanvasZone.tsx` | Acceptable — O(n²) with n≤52; do NOT add deep equality |

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/spikes/`, `tests/`
**Files scanned:** 7 (Spike002, CanvasDraggableCard, CanvasZone, BoardDragLayer, lib/utils, deck.test.ts, canvasCards.test.ts)
**Pattern extraction date:** 2026-05-24
