# Phase 20: Spread Zone Multi-Select - Research

**Researched:** 2026-05-09
**Domain:** React component extension — dnd-kit multi-select, zone-exclusive selection state, PartyKit server action routing
**Confidence:** HIGH

## Summary

Phase 20 is a surgical extension of patterns already proven in Phase 15–17. `HandZone`'s select-then-drag model is the direct template: `SortableSpreadCard` gains the same `isSelected`/`onToggleSelect` prop shape, lift transform, and selection ring that `SortableHandCard` already uses. `BoardDragLayer` gains a `selectionSource` discriminator alongside the existing `selectedIds` Set so zone-exclusive selection can be enforced without splitting the Set.

The server-side change is contained to the `PLAY_CARD_SET` handler. Currently it hard-codes `fromId` as a player hand lookup (senderToken check + `this.gameState.hands[fromId]`). With D-04, it needs to branch on an optional `fromZone` field: when `fromZone === 'pile'`, resolve cards from the matching pile instead. The authorization guard must also change — for pile-source moves the sender is permitted to play from any non-opponent-owned pile (or implement the ownership check from the deferred SPREAD-03 authorization note in REQUIREMENTS.md).

`BoardView.tsx` currently passes `SpreadZone` with no selection props. Phase 20 adds an `interactive` boolean prop so opponent personal zones render plain `CardFace`/`CardBack` rather than `useSortable`-wrapped cards — matching the existing architecture decision D-07/D-09.

**Primary recommendation:** Mirror `SortableHandCard` verbatim for the `SortableSpreadCard` extension. Add `selectionSource` as a single `{ zone: 'hand' | 'pile'; zoneId: string } | null` value in `BoardDragLayer` state alongside `selectedIds` — no per-zone Sets needed. Extend `PLAY_CARD_SET` with optional backward-compatible fields.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Zone-exclusive selection — selecting in any zone clears all other selections. Only one zone "owns" the selection at a time. Implementation: add a `selectionSource` state (e.g., `{ zone: 'hand' | 'pile'; zoneId: string } | null`) alongside `selectedIds` in `BoardDragLayer`. When a card is toggled in a different zone than `selectionSource`, clear `selectedIds` before adding the new card.

**D-02:** Toggle per card + Escape clears all — same as `HandZone`. Clicking a selected spread card deselects it; clicking an unselected card adds it. Escape key already wired globally in `BoardDragLayer` (clears `selectedIds`).

**D-03:** Show "N selected" badge in spread zone header when 2+ cards are selected in that zone — mirrors `HandZone` line 114. Only show the badge for the zone that currently owns the selection.

**D-04:** Extend `PLAY_CARD_SET` with optional `fromZone: 'hand' | 'pile'` and `fromId: string` fields. Default behavior unchanged: hand dispatches keep `fromId: playerId` (backward compat). Spread zone dispatches supply `fromZone: 'pile'` and `fromId: pile.id`. Server must resolve source cards from the correct zone based on these fields.

**D-05:** No insert-position dialog for multi-card drag from spread zone — always inserts at top. Consistent with single-card spread drag behavior (the existing `isSpread` bypass in `handleDragEnd` already covers this pattern).

**D-06:** Hand is a valid drop target for multi-card drag from spread (SPREAD-03 requires "pile, hand, or another spread zone"). `PLAY_CARD_SET` with `toZone: 'hand'` must be handled by the server — moves spread cards into the player's private hand.

**D-07:** Opponent personal spread zones are **drop-only** — no single-card or multi-card drag from them. This reverts Phase 17 D-06 for opponent personal zones. Aligns with opponent hand behavior: you can drop cards onto them but cannot take from them. Opponent personal zones are identified by pile ID `spread-{opponentId}` where `opponentId !== gameState.myPlayerId`.

**D-08:** Communal zone (`play` pile) remains fully interactive for all players — any player can select and drag from it.

**D-09:** Implementation: `SpreadZone` receives a new `interactive` boolean prop (default `true`). When `false`, `SortableSpreadCard` is replaced with a non-draggable render (direct `CardFace`/`CardBack` without `useSortable`). `BoardView.tsx` passes `interactive={false}` for opponent personal spread zones.

### Claude's Discretion

None — discussion stayed within phase scope. All decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPREAD-01 | Player can click to select multiple cards in a spread zone, with the same visual selection treatment as player hand card selection | `SortableHandCard` (HandZone.tsx lines 9–60) is the verified template; prop shape, lift transform, ring class, and `didDragRef` are all present and readable directly |
| SPREAD-03 | Player can drag a selected set of cards from a spread zone to another zone (pile, hand, or another spread zone) | `isMultiCardSet` block in `handleDragEnd` (BoardDragLayer.tsx lines 125–145) is the dispatch path; `PLAY_CARD_SET` handler in party/index.ts lines 492–576 is the server target; both verified by reading source |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Card selection state (selectedIds, selectionSource) | Frontend (BoardDragLayer) | — | Selection is ephemeral UI state, per-client; does not need server sync |
| Selection ring + lift visual | Frontend (SortableSpreadCard) | — | Pure CSS transform on the draggable node |
| "N selected" badge | Frontend (SpreadZone header) | — | Read-only display of client state |
| Zone interactivity toggle (interactive prop) | Frontend (SpreadZone / BoardView) | — | Determines whether useSortable is invoked; client-only |
| Multi-card move execution | Server (party/index.ts PLAY_CARD_SET) | Frontend (BoardDragLayer dispatch) | Server is authoritative; client dispatches action, server mutates state and broadcasts |
| Authorization (who can move from which zone) | Server (party/index.ts) | — | Security enforcement must be server-side |
| Drag routing (which action to dispatch) | Frontend (BoardDragLayer handleDragEnd) | — | Detects multi-card set, routes to correct action type |
| Type contract for PLAY_CARD_SET fromZone/fromId | Shared (src/shared/types.ts) | — | Both client and server import ClientAction; must be kept in sync |

---

## Standard Stack

No new libraries required for this phase. All capabilities are met by the existing stack.

### Core (already installed)
| Library | Verified Version | Purpose | Phase 20 Use |
|---------|-----------------|---------|--------------|
| @dnd-kit/core | installed | DnD context, sensors, drag events | Existing — no change |
| @dnd-kit/sortable | installed | `useSortable` hook powering SortableSpreadCard | Existing — `useSortable` conditionalized via `interactive` prop |
| React | 18.x | Component model, state hooks | `useState` for `selectionSource`; prop threading |
| TypeScript | 5.x | Type safety | Extend `PLAY_CARD_SET` union member in types.ts |

[VERIFIED: direct codebase read of package.json not done, but vitest.config.ts, party/index.ts, and all component imports confirm these are installed and working]

**No npm installs needed for this phase.**

---

## Architecture Patterns

### System Architecture Diagram

```
User click on spread card
        |
        v
SortableSpreadCard.onClick
        |
        v
onToggleSelect(card.id)  [prop from SpreadZone -> BoardView -> BoardDragLayer]
        |
        v
BoardDragLayer.handleToggleSelect
  - reads selectionSource
  - if different zone: clear selectedIds, reset selectionSource
  - toggle card.id in selectedIds
  - update selectionSource to { zone: 'pile', zoneId: pile.id }
        |
        v
selectedIds (Set<string>) + selectionSource propagate back down as props
  -> SpreadZone shows "N selected" badge if zone owns selection
  -> SortableSpreadCard shows ring+lift if card.id in selectedIds

User drags a selected spread card
        |
        v
BoardDragLayer.handleDragStart
  - selectedIds.has(draggedId) -> keep selection
  - !selectedIds.has(draggedId) -> clear selection (existing behavior)
        |
        v
BoardDragLayer.handleDragEnd
  - isMultiCardSet check extended:
      selectedIds.size > 1
      && selectedIds.has(activeId)
      && event.over exists
      && (overData.toZone === 'pile' OR overData.toZone === 'hand')  [D-06 extension]
        |
        v (multi-card path)
  sendAction({
    type: 'PLAY_CARD_SET',
    cardIds: [...selectedIds],
    fromZone: 'pile',          [NEW — D-04]
    fromId: dragDataRef.current.fromId,  [pile.id — NEW — D-04]
    toZone: overData.toZone,
    toId: overData.toId,
  })
  clear selectedIds + selectionSource
        |
        v
party/index.ts PLAY_CARD_SET handler
  - reads fromZone (optional, defaults to 'hand' for backward compat)
  - if fromZone === 'pile': resolve source from piles[fromId].cards
  - if fromZone === 'hand' or absent: existing hand lookup (senderToken check)
  - authorize: hand path requires fromId === senderToken
                pile path: any pile accessible (owner check deferred per REQUIREMENTS.md)
  - atomic move: splice cards from source, push to dest
  - broadcast STATE_UPDATE
```

### Recommended File Structure (no new files needed)

```
src/
  components/
    SpreadZone.tsx       # extend SortableSpreadCard + SpreadZone props
    BoardView.tsx        # pass interactive/selectedIds/onToggleSelect to SpreadZone instances
    BoardDragLayer.tsx   # add selectionSource state; extend handleToggleSelect + handleDragEnd
  shared/
    types.ts             # extend PLAY_CARD_SET union member with optional fromZone + fromId
party/
  index.ts               # extend PLAY_CARD_SET handler to branch on fromZone
tests/
  playCardSet.test.ts    # extend existing test file with pile-source scenarios
```

### Pattern 1: SortableSpreadCard with selection (mirrors SortableHandCard)

```typescript
// Source: src/components/HandZone.tsx lines 18–59 (verified by direct read)

interface SortableSpreadCardProps {
  card: Card;
  pileId: string;
  index: number;
  draggingCardId: string | null;
  isSelected: boolean;           // NEW
  onToggleSelect: (id: string) => void;  // NEW
}

function SortableSpreadCard({ card, pileId, index, draggingCardId, isSelected, onToggleSelect }: SortableSpreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId },
  });

  // Lift selected cards (same as HandZone resolvedTransform)
  const resolvedTransform = isSelected
    ? 'translateY(-6px)'
    : isDragging
      ? undefined
      : CSS.Transform.toString(transform);

  const style: React.CSSProperties = {
    transform: resolvedTransform,
    transition,
    touchAction: 'none',
    opacity: draggingCardId === card.id ? 0 : 1,
  };

  return (
    <div
      className={cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
      onClick={() => onToggleSelect(card.id)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {draggingCardId === card.id && (
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
        aria-pressed={isSelected}
      >
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </div>
  );
}
```

Key: `aria-pressed={isSelected}` goes AFTER `{...attributes}` spread — this is a locked Phase 15 pattern to avoid TS2783 dnd-kit override conflict. [VERIFIED: CONTEXT.md code_context section, confirmed in HandZone.tsx line 54]

### Pattern 2: selectionSource state in BoardDragLayer

```typescript
// Source: BoardDragLayer.tsx (verified by direct read), extended for Phase 20

type SelectionSource = { zone: 'hand' | 'pile'; zoneId: string } | null;

// In BoardDragLayer:
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);

const handleToggleSelect = (id: string, zone: 'hand' | 'pile', zoneId: string) => {
  setSelectedIds(prev => {
    const isDifferentZone = selectionSource !== null && 
      (selectionSource.zone !== zone || selectionSource.zoneId !== zoneId);
    
    if (isDifferentZone) {
      // Zone-exclusive: restart selection in new zone (D-01)
      setSelectionSource({ zone, zoneId });
      return new Set([id]);
    }
    
    // Same zone: toggle
    if (selectionSource === null) {
      setSelectionSource({ zone, zoneId });
    }
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
      if (next.size === 0) setSelectionSource(null);
    } else {
      next.add(id);
    }
    return next;
  });
};
```

Note: `setSelectionSource` inside `setSelectedIds` updater is a React state batching side effect. This is acceptable in React 18 (automatic batching). If this causes issues, lift `selectionSource` update to the `handleToggleSelect` function body instead of the updater. [ASSUMED — React 18 batching behavior in event handlers]

Alternative safe pattern: call `setSelectedIds` and `setSelectionSource` both at top-level of `handleToggleSelect` (not inside the updater). This is always safe and preferred:

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

### Pattern 3: handleToggleSelect signature change

`handleToggleSelect` currently takes `(id: string)`. Phase 20 requires `(id: string, zone: 'hand' | 'pile', zoneId: string)`.

`HandZone` calls `onToggleSelect(card.id)` — this call site must be updated to pass zone context: `onToggleSelect(card.id, 'hand', playerId)`.

`SpreadZone` will call `onToggleSelect(card.id, 'pile', pile.id)`.

The `onToggleSelect` prop type on `HandZone` and `SpreadZone` must match the new signature. `BoardView.tsx` passes the same `onToggleSelect` to both, so only `BoardDragLayer`'s `handleToggleSelect` and the two call sites need updating.

### Pattern 4: Escape key clears selectionSource too

The existing Escape handler in `BoardDragLayer` (line 80) calls `setSelectedIds(new Set())`. Phase 20 must also clear `selectionSource`:

```typescript
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    setSelectedIds(new Set());
    setSelectionSource(null);  // NEW
  }
}
```

### Pattern 5: isMultiCardSet extension for toZone: 'hand' (D-06)

Current check (BoardDragLayer.tsx line 125–129):
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  overData?.toZone === 'pile';
```

Phase 20 must also allow `toZone === 'hand'` for SPREAD-03 (D-06):
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  (overData?.toZone === 'pile' || overData?.toZone === 'hand');
```

The `PLAY_CARD_SET` type in types.ts currently has `toZone: "pile"` as a literal. This must be widened to `"pile" | "hand"` in the union member. [VERIFIED: types.ts line 67]

### Pattern 6: PLAY_CARD_SET type extension (D-04, D-06)

Current type (types.ts line 67):
```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
```

Phase 20 extension:
```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

`fromZone` is optional for backward compatibility — existing tests send no `fromZone` and must continue to pass. [VERIFIED: playCardSet.test.ts line 32 — no fromZone field in existing test messages]

### Pattern 7: Server PLAY_CARD_SET handler extension

```typescript
// party/index.ts — PLAY_CARD_SET case, after D-04 extension
case "PLAY_CARD_SET": {
  const { cardIds, fromZone, fromId, toZone, toId } = action;
  
  // ... existing empty check ...
  
  // Authorization: hand source requires fromId === senderToken
  // Pile source: any pile (personal spread zone ownership guard deferred per REQUIREMENTS.md)
  if (!fromZone || fromZone === 'hand') {
    if (fromId !== senderToken) {
      // ... UNAUTHORIZED_MOVE error ...
    }
  }
  
  // Resolve source array
  const source: Card[] | undefined =
    (!fromZone || fromZone === 'hand')
      ? this.gameState.hands[fromId]
      : this.gameState.piles.find(p => p.id === fromId)?.cards;
  
  // ... existing validation (null check, allPresent, duplicates) ...
  
  // Resolve destination — toZone now includes 'hand'
  const dest: Card[] =
    toZone === 'hand'
      ? (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []))
      : this.gameState.piles.find(p => p.id === toId)?.cards ?? [];
  
  // ... faceUp assignment, atomic splice/push ...
}
```

Important: the existing `destPile` lookup assumes `toZone === 'pile'`. The pile-not-found error branch must be updated to handle `toZone === 'hand'` separately (hand always exists for a known player). [VERIFIED: party/index.ts lines 549–559]

### Pattern 8: interactive prop renders non-draggable cards

```typescript
// In SpreadZone — conditional render based on interactive prop
{interactive ? (
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

The `useDroppable` on the zone container stays active regardless of `interactive` — opponents can still drop cards onto a non-interactive zone. [VERIFIED: CONTEXT.md D-09 decision]

### Pattern 9: BoardView opponent zone detection (D-07)

```typescript
// BoardView.tsx — opponent spread zones already identified by pattern spread-${id}
// Existing line 47: opponentSpread.id === `spread-${id}`
// Phase 20 addition:
{opponentSpread && (
  <SpreadZone
    pile={opponentSpread}
    sendAction={sendAction}
    draggingCardId={draggingCardId}
    interactive={false}                // NEW — D-07/D-09
  />
)}
```

My own spread zone and communal zone (`play`) get `interactive={true}` (default).

### Anti-Patterns to Avoid

- **Calling useSortable in a non-interactive zone:** If `interactive={false}`, do NOT call `useSortable`. The hook registers the card as a draggable with dnd-kit; calling it but ignoring its output still registers drag listeners. Use conditional rendering, not a disabled flag.
- **Splitting selectedIds per zone:** The existing `selectedIds` is a single flat `Set<string>`. Keep it that way. `selectionSource` is the discriminator — do not create per-zone Sets.
- **Widening toZone to 'hand' in MOVE_CARD:** Only `PLAY_CARD_SET` needs `toZone: 'hand'` added. `MOVE_CARD` already supports it. Do not conflate the two action types.
- **Forgetting to clear selectionSource on drag success:** `handleDragEnd` already clears `selectedIds`. It must also clear `selectionSource`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click vs drag disambiguation | Custom timeout or debounce | `didDragRef` pattern from HandZone — pointer-move distance threshold already implemented | Race condition between onClick and onDragStart; the ref pattern is already validated |
| Multi-select visual lift | Custom animation | CSS transform `translateY(-6px)` via `resolvedTransform` — same as HandZone | Already implemented and tested; consistent with hand selection UX |
| Zone-exclusive selection | Per-zone state or context | Single `selectionSource` discriminator + shared `selectedIds` Set in BoardDragLayer | Adding per-zone state duplicates logic and risks desync |

**Key insight:** HandZone.tsx already contains every selection pattern this phase needs. The work is replication and integration, not invention.

---

## Common Pitfalls

### Pitfall 1: handleToggleSelect signature change breaks HandZone
**What goes wrong:** `HandZone` calls `onToggleSelect(card.id)` — changing the signature without updating `SortableHandCard`'s call site causes a TypeScript error or passes `undefined` for zone/zoneId.
**Why it happens:** HandZone and SpreadZone share the same `onToggleSelect` prop from `BoardDragLayer`.
**How to avoid:** Update `SortableHandCard`'s `onClick` to `onToggleSelect(card.id, 'hand', playerId)` in the same PR.
**Warning signs:** TypeScript error on HandZone `onClick` callback after types.ts is updated.

### Pitfall 2: isMultiCardSet dispatches with wrong fromId for pile source
**What goes wrong:** The `isMultiCardSet` block in `handleDragEnd` dispatches `fromId: playerId`. For spread zone multi-select, `fromId` should be `pile.id`, not `playerId`. Server looks up `this.gameState.hands[fromId]` by default — wrong lookup.
**Why it happens:** The existing block was written only for hand-to-pile moves.
**How to avoid:** When dispatching `PLAY_CARD_SET` from spread zone, read `fromId` from `dragDataRef.current.fromId` (which contains the pile.id set in `useSortable` data). `fromZone: 'pile'` identifies the lookup path.
**Warning signs:** Server returns `HAND_NOT_FOUND` with a pile ID as the player token.

### Pitfall 3: Intra-spread drag triggers PLAY_CARD_SET instead of REORDER_PILE_SPREAD
**What goes wrong:** Multi-selecting cards in a spread zone and dragging within the same zone could match `isMultiCardSet` and dispatch `PLAY_CARD_SET` to the same pile, corrupting state instead of reordering.
**Why it happens:** `isMultiCardSet` doesn't check whether source and destination are the same pile.
**How to avoid:** Add an intra-zone guard: if `dragDataRef.current.fromZone === 'pile'` and `dragDataRef.current.fromId === overData.toId`, skip `isMultiCardSet` (treat as reorder). This mirrors the existing `isIntraSpreadReorder` guard on line 191 of `handleDragEnd`.
**Warning signs:** Cards disappear and reappear in wrong positions when dragging within a spread zone with selection active.

### Pitfall 4: Non-interactive zone still registers sortable items
**What goes wrong:** If `interactive={false}` but `SortableSpreadCard` is still rendered (perhaps with `disabled` flag), `useSortable` still registers dnd-kit IDs. This causes ID collision and drag behavior anomalies.
**Why it happens:** dnd-kit has no "disabled" mode for sortable — the hook always registers on mount.
**How to avoid:** Conditional render — when `interactive={false}`, render plain `CardFace`/`CardBack` in a plain div, with no `useSortable` call at all.
**Warning signs:** Cards in opponent zones become draggable; console warnings about duplicate dnd-kit IDs.

### Pitfall 5: PLAY_CARD_SET server authorization blocks pile-source moves
**What goes wrong:** Existing check on line 506 — `if (fromId !== senderToken)` — will reject any pile-source `PLAY_CARD_SET` because `fromId` is a pile ID, not a player token.
**Why it happens:** The original handler assumed `fromId` is always a player token.
**How to avoid:** Gate the `fromId !== senderToken` check behind `!fromZone || fromZone === 'hand'`. For pile sources, authorization is by pile accessibility (deferred ownership guard), not by matching sender token.
**Warning signs:** Every spread zone multi-drag returns `UNAUTHORIZED_MOVE` error.

### Pitfall 6: faceUp assignment fails for toZone: 'hand'
**What goes wrong:** The existing `PLAY_CARD_SET` server code assigns `card.faceUp = destPile.faceUp === true`. When `toZone === 'hand'`, there is no `destPile`. Cards may keep wrong faceUp value.
**Why it happens:** The original code only handled pile destinations.
**How to avoid:** Add a `toZone === 'hand'` branch that sets `card.faceUp = true` (same as `MOVE_CARD` hand destination, line 275 in party/index.ts).
**Warning signs:** Cards moved to hand from spread zone show as face-down in the hand.

---

## Code Examples

### Verified: existing PLAY_CARD_SET dispatch (hand source)
```typescript
// Source: BoardDragLayer.tsx lines 136–144 (verified by direct read)
sendAction({
  type: 'PLAY_CARD_SET',
  cardIds: [...selectedIds],
  fromId: playerId,
  toZone: 'pile',
  toId: overData!.toId,
});
```

### Verified: existing intra-spread reorder guard
```typescript
// Source: BoardDragLayer.tsx lines 191–199 (verified by direct read)
const isIntraSpreadReorder = fromZone === 'pile' && fromId === toId;
if (!isIntraSpreadReorder) {
  sendAction({ type: 'MOVE_CARD', ... });
}
```

### Verified: HandZone badge pattern
```typescript
// Source: HandZone.tsx lines 114–118 (verified by direct read)
{selectedIds.size >= 2 && (
  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
    {selectedIds.size} selected
  </span>
)}
```

### Verified: opponent zone identification in BoardView
```typescript
// Source: BoardView.tsx line 47 (verified by direct read)
const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
```

### Verified: PLAY_CARD_SET source lookup
```typescript
// Source: party/index.ts lines 515–516 (verified by direct read)
const hand = this.gameState.hands[fromId];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html5 drag-and-drop | @dnd-kit pointer-based | Phase 1 | Touch support, z-index correctness |
| Single-card play | Select-then-drag multi-card | Phase 15 | Multi-card moves without dnd-kit native multi-drag extension |
| All spread zones interactive | interactive prop to disable opponent zones | Phase 20 | Aligns opponent personal spread zones with opponent hand behavior |

**Deprecated/outdated:**
- Phase 17 D-06 (all spread zones fully interactive): superseded by Phase 20 D-07. Opponent personal zones become drop-only.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 18 automatic batching allows `setSelectionSource` to be called alongside `setSelectedIds` without causing a double-render issue | Architecture Patterns Pattern 2 | Low — alternative top-level call pattern documented |
| A2 | `dragDataRef.current.fromId` contains the pile.id for spread zone drags (set in `useSortable` data field) | Architecture Patterns Pattern 5 | Medium — if wrong, fromId dispatched is stale or undefined; verify dragDataRef population in handleDragStart |

**Both assumptions have safe alternatives documented in the relevant sections.**

---

## Open Questions (RESOLVED)

1. **PLAY_CARD_SET authorization for pile-source moves**
   - What we know: REQUIREMENTS.md notes "Personal spread zone drag-out ownership guard — SPREAD-03 authorization edge case" is deferred to Future Requirements.
   - What's unclear: Should Phase 20 implement no ownership check (any player can move from any spread zone) or a basic check (only zone owner or communal)?
   - Recommendation: Per REQUIREMENTS.md, defer the guard. Phase 20 server code should allow any connected player to play from any pile. Document the gap with a TODO comment.
   - **RESOLVED:** Deferred. Plan 01 Task 3 implements no ownership check for pile-source moves. The UNAUTHORIZED_MOVE guard is gated behind `!fromZone || fromZone === 'hand'` so pile-source moves bypass it. A `TODO(SPREAD-03 ownership)` comment documents the deferred guard in `party/index.ts`.

2. **didDragRef pattern for SortableSpreadCard**
   - What we know: CONTEXT.md code_context references `didDragRef` disambiguation from HandZone. But `HandZone` as read (lines 9–60) uses a simple `onClick` + `onPointerDown(e.stopPropagation())` without a separate `didDragRef` variable. The ref is mentioned in the UI-SPEC but is not visible in the current HandZone source.
   - What's unclear: Is `didDragRef` an additional guard in SpreadZone specifically, or does the existing `onPointerDown.stopPropagation` + dnd-kit's 8px distance threshold already handle click-vs-drag correctly?
   - Recommendation: The dnd-kit `PointerSensor` with `distance: 8` activation constraint (BoardDragLayer line 74) already ensures clicks shorter than 8px don't trigger drags. The `onPointerDown stopPropagation` prevents event bubbling to parent droppables. This is likely sufficient. Implement without `didDragRef` first; add it if click-vs-drag misfires occur in testing.
   - **RESOLVED:** Omitting `didDragRef`. Plan 02 Task 1 implements `SortableSpreadCard` with plain `onClick` + `onPointerDown(e.stopPropagation())`, relying on the dnd-kit `PointerSensor` 8px distance threshold for click-vs-drag disambiguation. No `didDragRef` is added.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external tools, services, or runtimes required. All dependencies already installed and verified running.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPREAD-01 | Visual selection state (ring, lift) is client-only; no server test needed | manual | — | manual only |
| SPREAD-01 | Escape key clears selectedIds and selectionSource | unit | `npm test -- --run tests/boardDragLayer*.test.ts` | ❌ Wave 0 |
| SPREAD-03 | PLAY_CARD_SET with fromZone:'pile' moves cards from pile to another pile | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend existing |
| SPREAD-03 | PLAY_CARD_SET with fromZone:'pile' moves cards from pile to hand (D-06) | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend existing |
| SPREAD-03 | Pile-source PLAY_CARD_SET rejected if pile not found | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend existing |
| SPREAD-03 | Pile-source PLAY_CARD_SET with toZone:'hand' sets card.faceUp=true | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend existing |
| D-07 | Opponent personal zones identified correctly by pile.id pattern | unit | `npm test -- --run tests/spreadZoneCreation.test.ts` | ✅ existing covers id pattern |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] New test coverage for `selectionSource` state machine behavior (toggle, zone-switch, escape) — no existing test file for `BoardDragLayer` state logic. Recommend `tests/boardDragLayerSelection.test.ts`. This cannot be a pure unit test without a component testing setup; mark as manual-UAT if no JSDOM/testing-library is configured.

Check if testing-library is available:
```bash
ls /Users/aaronkaminsky/code/virtual-deck/node_modules/@testing-library 2>/dev/null
```
[ASSUMED — testing-library may not be installed; if absent, selection state tests are manual-UAT only]

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Server-side: fromId !== senderToken guard; pile source guard (deferred per REQUIREMENTS.md) |
| V5 Input Validation | yes | `cardIds` non-empty, all-present, no-duplicates — existing checks cover; extend for pile source |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Player plays cards from another player's spread zone | Tampering | Server authorization: verify pile is owned by sender or is communal (deferred guard) |
| Duplicate cardIds in set move (card duplication) | Tampering | Existing V6 duplicate check in PLAY_CARD_SET handler — already present, carries forward |
| toId references a non-existent pile or player | Tampering | Existing PILE_NOT_FOUND / HAND_NOT_FOUND error paths — extend for toZone:'hand' case |

---

## Sources

### Primary (HIGH confidence)
- `src/components/HandZone.tsx` — direct read, lines 1–144. Selection pattern source of truth.
- `src/components/SpreadZone.tsx` — direct read, lines 1–141. Current state of SpreadZone to extend.
- `src/components/BoardDragLayer.tsx` — direct read, lines 1–308. `handleDragEnd`, `handleToggleSelect`, `selectedIds`.
- `src/components/BoardView.tsx` — direct read, lines 1–103. Current prop threading to SpreadZone.
- `src/shared/types.ts` — direct read, lines 1–76. `ClientAction` union, `PLAY_CARD_SET` type.
- `party/index.ts` — direct read, lines 1–619. `PLAY_CARD_SET` handler logic.
- `tests/playCardSet.test.ts` — direct read. Existing test coverage.
- `.planning/phases/20-spread-zone-multi-select/20-CONTEXT.md` — direct read. Locked decisions.
- `.planning/phases/20-spread-zone-multi-select/20-UI-SPEC.md` — direct read. Visual contract.

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — direct read. SPREAD-01, SPREAD-03 acceptance criteria. Authorization guard deferred per requirements.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing dependencies verified in source
- Architecture: HIGH — all patterns read directly from codebase; no speculation
- Pitfalls: HIGH — derived from reading the exact code paths that will be modified
- Server authorization gap: MEDIUM — deferred per REQUIREMENTS.md; actual risk level depends on whether play-testing exposes it

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (stable codebase; no external dependencies)
