# Phase 17: Board Layout Restructure - Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 2 (modified files only — no new files in this phase)
**Analogs found:** 2 / 2

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/components/SpreadZone.tsx` | component | event-driven (dnd-kit sortable + monitor) | `src/components/HandZone.tsx` | exact — same role, same data flow, same dnd-kit pattern |
| `src/components/BoardView.tsx` | component | request-response (renders game state from server) | `src/components/BoardView.tsx` (current version) | self-analog — restructure only, no role change |

---

## Pattern Assignments

### `src/components/SpreadZone.tsx` — `SortableSpreadCard` internal change (SPREAD-04)

**Analog:** `src/components/HandZone.tsx`

**Change scope:** `SortableSpreadCard` function only (lines 17–41). The `SpreadZone` export function is unchanged.

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

Apply to SpreadZone.tsx: remove `import { DraggableCard } from './DraggableCard';` and add `import { CardFace } from './CardFace';` (CardBack is already imported). Add `import { useRef } from 'react';` for `didDragRef`.

**Core pattern — useSortable without nested useDraggable** (HandZone.tsx lines 18–59, adapted):

The current `SortableSpreadCard` (SpreadZone.tsx lines 17–41) already uses `useSortable` correctly. The only bug is line 38: `<DraggableCard card={card} fromZone="pile" fromId={pileId} />` registers a second `useDraggable` on the same `card.id`.

Fixed pattern (mirror of SortableHandCard):
```typescript
function SortableSpreadCard({ card, pileId, index, draggingCardId }: SortableSpreadCardProps) {
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId },
  });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    opacity: draggingCardId === card.id ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('flex-shrink-0', index > 0 ? '-ml-5' : '')}
    >
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}
```

Key differences from current SpreadZone.tsx lines 17–41:
- Add `const didDragRef = useRef(false);` (Phase 20 pre-wiring — declared but not yet used in click handler)
- Replace line 38 `<DraggableCard card={card} fromZone="pile" fromId={pileId} />` with `{card.faceUp ? <CardFace card={card} /> : <CardBack />}`
- The `useSortable` call (lines 18–21) and `style` object (lines 23–28) are already correct — do not change them
- The `data` shape on `useSortable` (line 20) must remain unchanged: `{ card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId }`

**What must NOT change:**
- `useSortable` data object — `BoardDragLayer` reads `active.data.current.fromZone` at line 111 and `SpreadZone.useDndMonitor` reads `activeData.fromZone` at line 65; both expect `fromZone: 'pile'`
- `SpreadZone` export function — no changes to the zone container, `useDroppable`, `useDndMonitor`, `handleToggleFace`, or render tree below line 41
- The `DraggableCard` import can be removed after this edit since it will no longer be referenced anywhere in `SpreadZone.tsx`

---

### `src/components/BoardView.tsx` — Five-band layout restructure (LAYOUT-01, LAYOUT-02)

**Analog:** `src/components/BoardView.tsx` (current structure, self-analog)

**Change scope:** The JSX return (lines 43–121). Imports and prop interface (lines 1–22) are unchanged.

**Current structure** (BoardView.tsx lines 43–121):
```typescript
<div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
  <ConnectionBanner connected={connected} />
  {/* Row 1: header (opponents + controls) — lines 46–88 */}
  <div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">
    <div className="flex items-start gap-4 flex-1 overflow-x-auto">
      {/* opponent columns: OpponentHand + opponentSpread stacked — lines 48–65 */}
    </div>
    <div className="flex items-center gap-3">
      {/* Copy Link button + ControlsBar — lines 67–87 */}
    </div>
  </div>
  {/* Row 2: pile zones (center, flex-1) — lines 90–94 */}
  <div className="flex-1 flex items-center justify-center gap-6 px-4">
    {pilePiles.map(...PileZone...)}
  </div>
  {/* Row 3: communal + personal spreads (bottom bar) — lines 96–103 */}
  <div className="flex items-start gap-4 px-4 py-2 bg-card">
    {communalZone && <SpreadZone ... />}
    {mySpreadZone && <SpreadZone ... />}
  </div>
  {/* Row 4: hand */}
  <HandZone ... />
</div>
```

**Target structure** (five bands per UI-SPEC and D-01 through D-03):

Band 1 — the opponent columns structure (lines 47–65) already exists and is correct. It stays in place; the outer `div` class is unchanged. No structural edit to the opponent column loop.

Band 2 — replace current Row 2 (lines 90–94) with `flex-1 flex items-center px-4 gap-4`. Change `justify-center` to none (pile zones left-align, communal fills right). Wrap communal zone in `<div className="flex-1 min-w-0">`:
```typescript
{/* Band 2: Center Row — piles + communal zone */}
<div className="flex-1 flex items-center px-4 gap-4">
  {pilePiles.map((pile) => (
    <PileZone
      key={pile.id}
      pile={pile}
      sendAction={sendAction}
      draggingCardId={draggingCardId}
      shufflingPileIds={shufflingPileIds}
    />
  ))}
  {communalZone && (
    <div className="flex-1 min-w-0">
      <SpreadZone
        pile={communalZone}
        sendAction={sendAction}
        draggingCardId={draggingCardId}
      />
    </div>
  )}
</div>
```

Band 3 — replace current Row 3 (lines 96–103) with a single-zone band for `mySpreadZone` only. The communal zone moves to Band 2:
```typescript
{/* Band 3: Player Spread Zone */}
{mySpreadZone && (
  <div className="bg-card px-4 py-2">
    <SpreadZone
      pile={mySpreadZone}
      sendAction={sendAction}
      draggingCardId={draggingCardId}
    />
  </div>
)}
```

Band 4 — `HandZone` (lines 105–119) is unchanged.

**Derived data variables** (BoardView.tsx lines 27–30) — unchanged:
```typescript
const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
const communalZone = spreadPiles.find(p => p.id === 'play');
```

**Open question to verify during implementation:** After wrapping communal `SpreadZone` in `<div className="flex-1 min-w-0">`, confirm the inner spread container (SpreadZone's `min-w-[80px] h-[112px]` div, SpreadZone.tsx line 94) fills the parent width. If it stays at 80px, apply an optional `className` prop to `SpreadZone` and pass `"w-full"` for the communal zone case only. Do not change `SpreadZone`'s internal CSS globally — it would break opponent spread zones in Band 1.

---

## Shared Patterns

### dnd-kit useSortable Data Shape
**Source:** `src/components/SpreadZone.tsx` lines 18–21 (current) and `src/components/HandZone.tsx` lines 19–22
**Apply to:** `SortableSpreadCard` in SpreadZone.tsx — do not change this data shape
```typescript
data: { card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId }
```
`BoardDragLayer.tsx` line 111 reads `event.active.data.current` expecting this exact shape. `SpreadZone.useDndMonitor` line 65 checks `activeData.fromZone === 'pile'` and `activeData.fromId === pile.id`. Both consumers are already compatible.

### Tailwind Layout Tokens
**Source:** `src/components/BoardView.tsx` and `src/components/HandZone.tsx`
**Apply to:** `BoardView.tsx` Band 1–4 restructure
| Token | Purpose |
|-------|---------|
| `h-screen w-screen overflow-hidden flex flex-col` | Root board container — unchanged |
| `bg-card` | Header, player spread band, hand zone backgrounds |
| `bg-background` | Root board background |
| `px-4 py-2` | Horizontal padding + vertical padding for `bg-card` bands |
| `flex-1` | Center row takes all remaining vertical space |
| `flex items-center` | Horizontal flex row with vertical centering |
| `flex-shrink-0` | Pile zones do not shrink |
| `flex-1 min-w-0` | Communal zone wrapper fills remaining horizontal space |
| `overflow-x-auto` | Opponent column list scrolls horizontally |

### cn() Utility
**Source:** `src/components/HandZone.tsx` line 7, `src/components/SpreadZone.tsx` line 8
**Apply to:** Any conditional class logic in modified components
```typescript
import { cn } from '@/lib/utils';
```

---

## No Analog Found

None — both modified files have direct analogs in the codebase.

---

## Metadata

**Analog search scope:** `src/components/`
**Files read:** BoardView.tsx (123 lines), SpreadZone.tsx (137 lines), HandZone.tsx (145 lines), 17-UI-SPEC.md (246 lines)
**Files scanned:** 4
**Pattern extraction date:** 2026-05-01
