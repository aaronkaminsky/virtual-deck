# Phase 23: Hand Sort + Select All - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 6 modified files (no new files)
**Analogs found:** 6 / 6 (all in-place edits; analogs ARE the files being modified)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/HandZone.tsx` | component | request-response (action dispatch) | `src/components/HandZone.tsx` itself — Eye/EyeOff button + REORDER_HAND dispatch | exact |
| `src/components/SpreadZone.tsx` | component | event-driven (selection callback) | `src/components/SpreadZone.tsx` itself — Eye button + onToggleSelect prop | exact |
| `src/components/PileZone.tsx` | component | event-driven (selection callback) | `src/components/PileZone.tsx` itself — controls row buttons | exact |
| `src/components/BoardView.tsx` | component | request-response (prop threading) | `src/components/BoardView.tsx` itself — onToggleSelect threading pattern | exact |
| `src/components/BoardDragLayer.tsx` | component / state container | event-driven (selection state) | `src/components/BoardDragLayer.tsx` itself — handleToggleSelect | exact |
| `src/shared/types.ts` | type definition | N/A | `src/shared/types.ts` itself — ClientAction union, REORDER_HAND shape | exact |

---

## Pattern Assignments

### `src/components/HandZone.tsx` (component, request-response)

**Changes:** Add `SortMode` local state, `handleSort()` dispatch function, sort icon button after Eye/EyeOff.

**Imports pattern** (lines 1–9 — current file):
```typescript
import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff } from 'lucide-react';
import type { Card, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
```
Add sort icon to the lucide-react import (e.g. `ArrowUpDown` or `ListOrdered`). No other import changes.

**Existing Eye/EyeOff button pattern to copy for sort button** (lines 160–169):
```typescript
<Button
  variant="ghost"
  className="h-7 w-7 p-0"
  onClick={onToggleReveal}
  title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
  aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
  aria-pressed={isRevealed}
>
  {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</Button>
```
Sort button goes immediately after this in the same `flex items-center gap-2` header div (lines 152–170). Use the same `h-7 w-7 p-0` size.

**Active icon color pattern** — copy the `cn()` conditional class pattern already used at lines 173–178:
```typescript
// Existing ring pattern (reference only — do NOT copy the ring):
className={cn(
  'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card',
  isOver ? 'border-t-2 border-primary' : '',
  isRevealed ? 'ring-1 ring-primary/50 ring-inset' : ''
)}
// Sort icon active state (D-05) — use text-primary, not ring:
<ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
```

**REORDER_HAND dispatch pattern** (line 145 — existing drag-reorder):
```typescript
sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
```
Sort dispatch uses identical shape: `sendAction({ type: 'REORDER_HAND', orderedCardIds: sorted.map(c => c.id) })`.

**SortMode state to add** (new, based on RESEARCH.md Pattern 1):
```typescript
type SortMode = 'original' | 'bySuit' | 'byRank';
const SORT_CYCLE: SortMode[] = ['original', 'bySuit', 'byRank'];
const SUIT_ORDER: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
const RANK_ORDER: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// Inside HandZone component:
const [sortMode, setSortMode] = useState<SortMode>('original');

function sortCards(cards: Card[], mode: 'bySuit' | 'byRank'): Card[] {
  return [...cards].sort((a, b) => {
    if (mode === 'bySuit') {
      const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    } else {
      const rankDiff = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      if (rankDiff !== 0) return rankDiff;
      return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    }
  });
}

function handleSort() {
  const nextMode = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
  setSortMode(nextMode);
  if (nextMode === 'original') return; // no dispatch — server order is authoritative
  const sorted = sortCards(cards, nextMode);
  sendAction({ type: 'REORDER_HAND', orderedCardIds: sorted.map(c => c.id) });
}
```

**Note on undo conflict (Pitfall 1):** The `REORDER_HAND` handler at `party/index.ts` line 334 unconditionally calls `takeSnapshot`. CONTEXT.md says sort must NOT enter the undo stack. The planner must decide: add `skipSnapshot?: boolean` to `REORDER_HAND` in `types.ts` and branch in `party/index.ts`, OR accept that sort is undoable. See `src/shared/types.ts` pattern section below.

**Note on stale sortMode after server update (Pitfall 2):** Add a `useEffect` watching `cards` to re-dispatch when `sortMode !== 'original'`, or apply sort visually in render without dispatch. Planner must choose.

---

### `src/components/SpreadZone.tsx` (component, event-driven)

**Changes:** Add `onSelectAll` prop to interface; add Select All button alongside the existing Eye button (below zone body).

**Existing props interface** (lines 69–78):
```typescript
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  interactive?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```
Add `onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;` to this interface. Mark optional for backward compat with opponent zones (`interactive={false}`).

**Eye button placement (critical — NOT in the header)** (lines 207–215):
```typescript
<Button
  variant="ghost"
  className="h-7 w-7 p-0"
  onClick={handleToggleFace}
  title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
  aria-label={pile.faceUp !== false ? 'Cards land face-up' : 'Cards land face-down'}
>
  {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</Button>
```
This button is rendered AFTER the zone body `<div>`, not in the header row (lines 151–157). Select All goes alongside it. Wrap both in a `<div className="flex gap-1">` to match PileZone's controls row pattern.

**Select All handler to add** (mirrors PileZone pattern 4 from RESEARCH.md):
```typescript
function handleSelectAll() {
  if (!onSelectAll) return;
  if (faceUpCards.length === 0) return; // guard for empty zone (Pitfall 3)
  onSelectAll(faceUpCards.map(c => c.id), 'pile', pile.id);
}
```
`faceUpCards` is already defined at line 87: `const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);`

**Opponent guard:** Do NOT pass `onSelectAll` to `SpreadZone` when `interactive={false}` — enforced by making it optional and checking in `BoardView` (see below).

---

### `src/components/PileZone.tsx` (component, event-driven)

**Changes:** Add `onSelectAll` prop; add Select All button to existing controls row.

**Existing props interface** (lines 10–15):
```typescript
interface PileZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds?: Set<string>;
}
```
Add `onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;` to this interface.

**Existing controls row to extend** (lines 76–95):
```typescript
<div className="flex gap-1 mt-1">
  <Button
    variant="ghost"
    className="h-7 w-7 p-0"
    onClick={handleToggleFace}
    title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
    aria-label={pile.faceUp !== false ? 'Face up' : 'Face down'}
  >
    {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
  </Button>
  <Button
    variant="ghost"
    className="h-7 w-7 p-0"
    onClick={handleShuffle}
    title="Shuffle pile"
    aria-label="Shuffle pile"
  >
    <Shuffle className="w-4 h-4" />
  </Button>
</div>
```
Add a third `<Button>` in this `flex gap-1 mt-1` div with the same `variant="ghost" className="h-7 w-7 p-0"` pattern.

**Select All handler to add** (top card only — Pitfall 4):
```typescript
function handleSelectAll() {
  if (!onSelectAll || !topCard || !('id' in topCard)) return;
  onSelectAll([(topCard as Card).id], 'pile', pile.id);
}
```
`topCard` is already defined at line 24: `const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1];`

**Disabled state:** Add `disabled={isEmpty || !topCard || !('id' in topCard)}` to the Select All button.

**Imports change:** Add the Select All icon to the lucide-react import at line 2: `import { Eye, EyeOff, Shuffle, CheckSquare } from 'lucide-react';` (or `SquareCheck` — planner's discretion per D-09).

---

### `src/components/BoardView.tsx` (component, request-response / prop threading)

**Changes:** Add `onSelectAll` to `BoardViewProps`; pass it to `PileZone` and interactive `SpreadZone` instances only.

**Existing props interface** (lines 10–21):
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
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```
Add `onSelectAll: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;` (non-optional — always provided by BoardDragLayer).

**Existing PileZone render** (line 74 — no selection props today):
```typescript
<PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} />
```
Add `onSelectAll={onSelectAll}` to each `PileZone`.

**Existing communalZone SpreadZone render** (lines 78–89 — already has selectedIds, onToggleSelect):
```typescript
<SpreadZone
  pile={communalZone}
  sendAction={sendAction}
  draggingCardId={draggingCardId}
  className="w-full"
  interactive={true}
  selectedIds={selectedIds}
  onToggleSelect={onToggleSelect}
  selectionSource={selectionSource}
/>
```
Add `onSelectAll={onSelectAll}` here.

**mySpreadZone SpreadZone render** (lines 94–103 — already interactive with selectedIds):
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
Add `onSelectAll={onSelectAll}` here too.

**Opponent SpreadZone render** (lines 55–61 — `interactive={false}`):
```typescript
<SpreadZone
  pile={opponentSpread}
  sendAction={sendAction}
  draggingCardId={draggingCardId}
  interactive={false}
/>
```
Do NOT add `onSelectAll` here — opponent zones must not receive the callback.

---

### `src/components/BoardDragLayer.tsx` (state container, event-driven)

**Changes:** Add `handleSelectAll` callback; thread it to `BoardView` as `onSelectAll`.

**Existing selection state** (lines 80–81):
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
```
No change to state shape. `handleSelectAll` reuses these exact setters.

**Existing handleToggleSelect pattern to mirror** (lines 87–109):
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
};
```
**handleSelectAll to add** (new, placed adjacent to handleToggleSelect):
```typescript
const handleSelectAll = (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => {
  if (cardIds.length === 0) return; // guard (Pitfall 3)
  setSelectedIds(new Set(cardIds));
  setSelectionSource({ zone, zoneId });
};
```

**Existing BoardView render** (line 332 — current prop spread):
```typescript
<BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} selectionSource={selectionSource} />
```
Add `onSelectAll={handleSelectAll}` to the `BoardView` JSX.

---

### `src/shared/types.ts` (type definition, N/A)

**Changes:** Potentially add `skipSnapshot?: boolean` to `REORDER_HAND` action type (if planner decides sort must not enter undo stack — Open Question from RESEARCH.md).

**Existing REORDER_HAND shape** (line 63):
```typescript
| { type: "REORDER_HAND"; orderedCardIds: string[] }
```
If adding skipSnapshot flag, extend to:
```typescript
| { type: "REORDER_HAND"; orderedCardIds: string[]; skipSnapshot?: boolean }
```

**Corresponding server change** (`party/index.ts` lines 334 — wrap takeSnapshot in conditional):
```typescript
// Current (line 334):
takeSnapshot(this.gameState);

// Modified:
if (!action.skipSnapshot) takeSnapshot(this.gameState);
```
**Decision required:** If undo-on-sort is acceptable, skip this change entirely. If not, both files need the change together.

---

## Shared Patterns

### Ghost Icon Button
**Source:** `src/components/HandZone.tsx` lines 160–169, `src/components/PileZone.tsx` lines 77–94
**Apply to:** Sort button in HandZone, Select All buttons in PileZone and SpreadZone
```typescript
<Button
  variant="ghost"
  className="h-7 w-7 p-0"
  onClick={handler}
  title="Descriptive tooltip"
  aria-label="Screen reader label"
>
  <IconName className="w-4 h-4" />
</Button>
```

### Conditional Icon Color via cn()
**Source:** `src/components/HandZone.tsx` lines 173–178 (cn() pattern), RESEARCH.md §Code Examples
**Apply to:** Sort button icon only (D-05)
```typescript
<ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
```

### Prop Threading Pattern
**Source:** `src/components/BoardDragLayer.tsx` line 332, `src/components/BoardView.tsx` lines 10–21
**Apply to:** `onSelectAll` callback threading from BoardDragLayer → BoardView → PileZone / SpreadZone
Rule: optional props (`?`) on leaf components receiving optional behavior; non-optional on BoardView (always provided by BoardDragLayer).

### Selection Atomic Update
**Source:** `src/components/BoardDragLayer.tsx` `handleToggleSelect` lines 87–109
**Apply to:** `handleSelectAll` in BoardDragLayer
Both `setSelectedIds` and `setSelectionSource` must update together. Never update one without the other.

### Guard for Empty Zone
**Source:** RESEARCH.md Pitfall 3
**Apply to:** `handleSelectAll` in BoardDragLayer, `handleSelectAll` in SpreadZone, `handleSelectAll` in PileZone
```typescript
if (cardIds.length === 0) return;
// or: disabled={isEmpty} on the button
```

### Top-Card-Only Pile Select
**Source:** `src/components/PileZone.tsx` lines 23–25 (topCard derivation), RESEARCH.md Pattern 4
**Apply to:** PileZone Select All handler
```typescript
const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1];
// Select All = top card only:
if (!topCard || !('id' in topCard)) return;
onSelectAll([(topCard as Card).id], 'pile', pile.id);
```

---

## No Analog Found

None — all patterns have exact analogs in the files being modified. No external pattern research is needed beyond what is documented above.

---

## Metadata

**Analog search scope:** `src/components/`, `src/shared/`, `party/`, `tests/`
**Files read:** HandZone.tsx, SpreadZone.tsx, PileZone.tsx, BoardView.tsx, BoardDragLayer.tsx, types.ts, party/index.ts (lines 319–338), reorderUndo.test.ts
**Pattern extraction date:** 2026-05-16
