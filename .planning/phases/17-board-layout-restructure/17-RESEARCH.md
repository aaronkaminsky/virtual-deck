# Phase 17: Board Layout Restructure - Research

**Researched:** 2026-05-01
**Domain:** React CSS layout (Flexbox), dnd-kit ID collision fix, component restructuring
**Confidence:** HIGH

## Summary

Phase 17 has two independent sub-problems with no technical ambiguity. The layout restructure (LAYOUT-01, LAYOUT-02) is a CSS-only change confined to `BoardView.tsx`: the new five-band vertical structure requires moving the communal spread zone from the bottom row to a center `flex-1` row flanked by pile zones, and moving opponent spread zones up into the header band alongside `OpponentHand`. No new components, no new libraries, no server changes. All Tailwind tokens needed already exist in the project.

The ID collision fix (SPREAD-04) is equally mechanical: `SortableSpreadCard` currently nests a `DraggableCard` which calls `useDraggable({ id: card.id })` — registering the same ID that `useSortable({ id: card.id })` already registered. Removing `DraggableCard` and rendering `CardFace`/`CardBack` directly inside `SortableSpreadCard` eliminates both dnd-kit registrations colliding. The `HandZone`/`SortableHandCard` pattern is the verified reference implementation for this exact pattern. The drag data shape `{ card, fromZone: 'pile', fromId: pileId }` already on `useSortable` is already read by `BoardDragLayer` — D-08 is confirmed.

The UI-SPEC (17-UI-SPEC.md, status: approved) provides exact Tailwind class strings for every band. Research confirms all class names are standard Tailwind v4 tokens already used elsewhere in the codebase. No external lookups required.

**Primary recommendation:** Implement as two sequential tasks — (1) SPREAD-04 ID collision fix in `SpreadZone.tsx`, (2) layout restructure in `BoardView.tsx` — in that order, so drag correctness is established before the layout changes obscure potential issues.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New vertical order (top → bottom): `[header: copy link + controls]` → `[opponents row: hands + spreads]` → `[center row: piles flanking communal zone]` → `[player spread zone]` → `[player hand zone]`. Five distinct horizontal bands.
- **D-02:** Center row arrangement: draw pile(s) on the left, communal zone centered in the middle taking the majority of the row's width. Communal zone is visually dominant — it is the centerpiece.
- **D-03:** Player bottom: personal spread zone is a separate horizontal band stacked directly above the hand zone. Two distinct rows, not side by side.
- **D-04:** Controls (ControlsBar + Copy Link button) stay in the existing header bar — Phase 17 does not move them. Phase 18 handles controls collapse.
- **D-05:** Each opponent is rendered as a vertical column in the opponents row: hand count/label on top, their personal spread zone below. Mirrors the player's own layout (spread above hand) at the top of the board.
- **D-06:** Opponent spread zones remain fully interactive — any player can drag cards to/from them. No behavior change from current.
- **D-07:** Remove `DraggableCard` from inside `SortableSpreadCard`. Render `CardFace`/`CardBack` directly in `SortableSpreadCard`, mirroring the `HandZone`/`SortableHandCard` pattern exactly. One dnd-kit ID per card.
- **D-08:** The existing `useSortable` data — `{ card, fromZone: 'pile', fromId: pileId, toZone: 'pile', toId: pileId }` — is sufficient to route all drag events. No additional data wiring needed.
- **D-09:** `DraggableCard` had no `onFlip` prop wired in spread zones, so inline rendering loses nothing. The flip toggle is at the pile level (`handleToggleFace` in SpreadZone), not per-card.

### Claude's Discretion
None specified — discussion stayed within phase scope.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-01 | Player can view the communal spread zone physically centered on the board, between opponent zones (top) and their own hand (bottom) | Center row (`flex-1`) with communal zone as `flex-1 min-w-0` child gives it visual dominance and true vertical centering between header and player bands |
| LAYOUT-02 | Board vertical proportions give all zones usable space without scrolling on a standard 1080p desktop viewport | Five-band analysis (see Vertical Proportions section) confirms ~1072px total at 1080p; `flex-1` center row absorbs all slack |
| SPREAD-04 | Spread zone drag interactions are stable with no event misfires when selection state is active (dnd-kit ID collision resolved) | Confirmed: removing `DraggableCard` from `SortableSpreadCard` eliminates dual `useDraggable`/`useSortable` registration on the same `card.id`; `useSortable` data already satisfies `BoardDragLayer` routing |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Board visual layout | Browser / Client (`BoardView.tsx`) | — | Pure CSS/JSX restructure, no server state changes |
| Communal zone centering | Browser / Client (`BoardView.tsx`) | — | Flexbox layout decision; server already provides correct pile data |
| Opponent spread zone display | Browser / Client (`BoardView.tsx`) | — | OpponentHand + SpreadZone already exist; only placement changes |
| dnd-kit ID collision fix | Browser / Client (`SpreadZone.tsx`) | — | Registration happens at component mount time; fix is remove `useDraggable` from nested component |
| Drag routing correctness | Browser / Client (`BoardDragLayer.tsx`) | — | Already reads `active.data.current.fromZone`; no changes needed |
| Vertical proportions | Browser / Client (Tailwind classes) | — | `flex-1` on center row, fixed heights on hand/spread bands |

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Component rendering | Project standard |
| Tailwind CSS | 4.2.2 | Layout utility classes | Project standard |
| @dnd-kit/core | 6.3.1 | Drag context, `useSortable` | Project standard; fixing misuse, not replacing |
| @dnd-kit/sortable | 10.0.0 | `useSortable` hook for spread cards | Project standard |

[VERIFIED: package.json] — all versions confirmed from lock file.

**Installation:** No new packages. This phase touches no `package.json`.

---

## Architecture Patterns

### System Architecture Diagram

```
BoardDragLayer (DndContext owner)
       │
       └── BoardView (layout root: h-screen flex flex-col)
              │
              ├── Band 1: Header row (bg-card, flex items-center justify-between)
              │      ├── Opponents area (flex-1 overflow-x-auto)
              │      │      └── [for each opponent] flex flex-col gap-1
              │      │             ├── OpponentHand (card count + label)
              │      │             └── SpreadZone (opponent's spread-{id})  ← MOVED HERE
              │      └── Right: Copy Link + ControlsBar (unchanged)
              │
              ├── Band 2: Center row (flex-1 flex items-center px-4 gap-4)
              │      ├── PileZone(s) (flex-shrink-0)                        ← pile-region piles
              │      └── Communal SpreadZone wrapper (flex-1 min-w-0)       ← MOVED HERE
              │             └── SpreadZone pile="play"
              │
              ├── Band 3: Player spread row (bg-card px-4 py-2)             ← NEW BAND
              │      └── SpreadZone pile=mySpreadZone
              │
              └── Band 4: Player hand (unchanged)
                     └── HandZone
```

Data flow for drag:
```
pointer event → DndContext (BoardDragLayer)
     → onDragStart: reads active.data.current = useSortable data {card, fromZone, fromId}
     → onDragEnd: routes by fromZone ('pile') and overData.toZone
           → spread zone: isSpread=true path → MOVE_CARD or REORDER_PILE_SPREAD
           → pile: position dialog
           → hand: MOVE_CARD directly
```

### Component Responsibilities

| Component | Change in Phase 17 | Owns |
|-----------|-------------------|------|
| `BoardView.tsx` | LAYOUT-01, LAYOUT-02 — restructure 5 bands | Visual layout only |
| `SpreadZone.tsx` (`SortableSpreadCard`) | SPREAD-04 — remove `DraggableCard`, render `CardFace`/`CardBack` directly | Card render + useSortable |
| `DraggableCard.tsx` | No change — still used by `PileZone` | — |
| `BoardDragLayer.tsx` | No change — already handles `fromZone: 'pile'` from sortable data | — |
| `HandZone.tsx` | No change — reference model only | — |

### Recommended Project Structure

No structural changes. All modifications are within existing files:
```
src/components/
├── BoardView.tsx    ← layout restructure (CSS/JSX only)
├── SpreadZone.tsx   ← SortableSpreadCard internal change only
└── [all others]    ← unchanged
```

### Pattern 1: useSortable Without Nested useDraggable (SPREAD-04)

**What:** A sortable card that is also draggable out of its zone. Use `useSortable` alone — it satisfies both the intra-zone sort and the inter-zone drag-out use case.

**When to use:** Any card inside a `SortableContext` that must also be draggable to other zones.

**Current broken pattern in `SortableSpreadCard`:**
```typescript
// Source: src/components/SpreadZone.tsx (lines 17-40) — VERIFIED by Read
// BUG: useSortable + DraggableCard both register id: card.id
const sortable = useSortable({ id: card.id, data: { ... } });
return (
  <div ref={sortable.setNodeRef} {...sortable.listeners}>
    <DraggableCard card={card} fromZone="pile" fromId={pileId} />
    {/*  ^ DraggableCard calls useDraggable({ id: card.id }) — COLLISION */}
  </div>
);
```

**Fixed pattern (mirror of `SortableHandCard` in `HandZone.tsx`):**
```typescript
// Source: src/components/HandZone.tsx (lines 18-59) — VERIFIED by Read
// useSortable alone; no nested useDraggable
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
  // didDragRef pattern: pre-work for Phase 20 click handler
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

**Why it works:** `useSortable` from `@dnd-kit/sortable` provides all drag capabilities. It uses `useDraggable` internally, but registers once. The `data` shape `{ card, fromZone: 'pile', fromId: pileId }` is what `BoardDragLayer.handleDragStart` reads from `event.active.data.current` (line 111). [VERIFIED: BoardDragLayer.tsx lines 111–113, SpreadZone.tsx lines 18–20]

### Pattern 2: Five-Band Flexbox Layout

**What:** Full-viewport flex column where the center row takes all available vertical space via `flex-1`.

**Current structure (two rows + hand):**
```typescript
// Source: src/components/BoardView.tsx (lines 44-121) — VERIFIED by Read
<div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
  {/* Row 1: header (opponents + controls) */}
  <div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">...</div>
  {/* Row 2: piles (center, flex-1) */}
  <div className="flex-1 flex items-center justify-center gap-6 px-4">...</div>
  {/* Row 3: communal + personal spreads (bottom bar) */}
  <div className="flex items-start gap-4 px-4 py-2 bg-card">...</div>
  {/* Row 4: hand */}
  <HandZone ... />
</div>
```

**Target structure (five bands per UI-SPEC):**
```typescript
// Source: 17-UI-SPEC.md — VERIFIED by Read
<div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
  {/* Band 1: Header — opponents + controls */}
  <div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">
    <div className="flex items-start gap-4 flex-1 overflow-x-auto">
      {/* Opponent columns: OpponentHand + SpreadZone stacked vertically */}
    </div>
    <div className="flex items-center gap-3">
      {/* Copy Link + ControlsBar */}
    </div>
  </div>
  {/* Band 2: Center row — piles + communal zone */}
  <div className="flex-1 flex items-center px-4 gap-4">
    {/* Pile zones: flex-shrink-0 */}
    {/* Communal zone: flex-1 min-w-0 wrapper */}
  </div>
  {/* Band 3: Player spread zone */}
  <div className="bg-card px-4 py-2">
    {/* mySpreadZone */}
  </div>
  {/* Band 4: Player hand — unchanged */}
  <HandZone ... />
</div>
```

### Anti-Patterns to Avoid

- **Nested useDraggable + useSortable on same ID:** Already the bug being fixed. Never register two dnd-kit hooks with the same `id` on different DOM elements in the same tree. [VERIFIED: confirmed as root cause of SPREAD-04]
- **Putting communal zone width as fixed px:** The communal zone must be `flex-1 min-w-0` so it fills the center row and reads as visually dominant. A fixed width would leave dead space or clip at certain viewport widths.
- **Side-by-side personal spread + hand:** D-03 explicitly locks these as separate horizontal bands. Do not revisit.
- **Adding `onToggleSelect` to `SortableSpreadCard`:** Phase 17 must not wire selection into spread cards — that is Phase 20 work. The `didDragRef` pattern is added as pre-wiring for the click handler only, but the click handler body stays empty (or a no-op) in Phase 17.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-out from sortable zone | Custom useDraggable wrapper | `useSortable` alone with correct data | useSortable internally uses useDraggable; adding a second useDraggable double-registers |
| Responsive horizontal scroll for opponent list | JS scroll management | `overflow-x-auto` on the flex container | Already in the codebase; works without JS |
| Viewport height calculation | JS `window.innerHeight` listener | `h-screen` + `flex-1` on center row | CSS handles it natively; no resize listener needed |

---

## Runtime State Inventory

> Greenfield layout + dnd-kit fix — no renaming, migration, or refactor of stored state. No external data changes.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — layout is client-only; no server state changes | None |
| Live service config | None — no PartyKit server changes | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

---

## Common Pitfalls

### Pitfall 1: dnd-kit Warning "Duplicate IDs in DndContext"
**What goes wrong:** After adding `didDragRef` but before removing `DraggableCard`, a stale half-edit causes React to render both `useSortable` and `useDraggable` on the same card. dnd-kit logs a warning and drag behavior becomes unpredictable.
**Why it happens:** The fix is atomic — both the removal of `DraggableCard` and the direct render of `CardFace`/`CardBack` must happen in the same edit.
**How to avoid:** Edit `SortableSpreadCard` completely before testing. Do not test with `DraggableCard` still present.
**Warning signs:** Browser console warning about duplicate IDs; ghost card that doesn't follow pointer.

### Pitfall 2: Communal Zone SpreadZone Width Not Growing
**What goes wrong:** `SpreadZone` renders with a fixed `min-w-[80px]` (from the spread container inside it). Without a `flex-1 min-w-0` wrapper in `BoardView`, the communal zone stays narrow.
**Why it happens:** `SpreadZone` renders its outer container as `flex flex-col gap-1` with no width constraint. The spread container itself is `min-w-[80px] h-[112px]`. These are correct for fixed-width use in the header band but need an explicit width from the parent when used in a flex-1 context.
**How to avoid:** Wrap the communal `SpreadZone` in `<div className="flex-1 min-w-0">` inside Band 2. The inner spread container should become `w-full h-[112px]` to inherit the parent's full width.
**Warning signs:** Communal zone stays narrow (80px wide) while center row has large empty space.

### Pitfall 3: Opponent Spread Zones Causing Vertical Overflow in Header Band
**What goes wrong:** Adding opponent spread zones (112px tall) below `OpponentHand` in the header band makes Band 1 taller than expected, reducing the center row height.
**Why it happens:** The header band is `auto` height (content-driven). At 1080p, Band 1 height ~= 72px (header only) but grows to ~200px with opponent columns visible. This still fits within the total budget (~1072px).
**How to avoid:** Verify total height at 1080p after implementation: Band 1 (~200px with spreads visible) + Band 2 (flex-1, ~590px) + Band 3 (~152px) + Band 4 (128px) ≈ 1070px. This fits.
**Warning signs:** Scrollbar appears on the board. Center row collapses below card height.

### Pitfall 4: intra-spread Reorder Broken After ID Collision Fix
**What goes wrong:** `SpreadZone.useDndMonitor.onDragEnd` reads `activeData.fromZone === 'pile'` to detect intra-spread reorder. If the data shape from `useSortable` diverges from the shape `DraggableCard` used to provide, the reorder check fails silently.
**Why it happens:** D-08 asserts the existing `useSortable` data is sufficient. This is verified: `useSortable` data already contains `fromZone: 'pile'` and `fromId: pileId` at lines 20–21 of `SpreadZone.tsx`.
**How to avoid:** Do not change the `data` object on `useSortable`. The existing shape is already correct.
**Warning signs:** Drag-reorder within a spread zone has no effect; cards snap back to original position.

### Pitfall 5: SpreadZone `w-full` on Inner Container Breaks Fixed-Width Header Use
**What goes wrong:** If `SpreadZone`'s internal spread container is changed to `w-full` globally, the opponent spread zones in Band 1 (which want fixed/natural width, not full-row width) stretch incorrectly.
**Why it happens:** The communal zone needs `w-full` to fill its `flex-1` parent, but opponent and player spread zones should keep their natural width.
**How to avoid:** Do NOT change `SpreadZone`'s internal CSS. Instead, the width behavior is controlled by the parent wrapper in `BoardView`:
  - Communal zone: `<div className="flex-1 min-w-0">` parent makes the zone fill available space; then pass a prop or use CSS so the spread container itself stretches.
  - Actually: the cleanest approach is for the communal zone case to pass `className="w-full"` or similar via a new optional prop, OR accept that the inner container stays `min-w-[80px]` and the `flex-1` wrapper simply won't make it wider unless SpreadZone exposes a width prop.
  - **Recommended resolution:** Add an optional `className` prop to `SpreadZone` that is applied to the inner spread container div. Pass `"w-full"` for communal zone use only. This is the minimal non-breaking change.

---

## Code Examples

### SPREAD-04: SortableSpreadCard After Fix (verified reference from HandZone.tsx)

```typescript
// Source: src/components/HandZone.tsx lines 18-59 — VERIFIED
// Pattern to mirror: useSortable + direct CardFace/CardBack render, didDragRef pre-wiring

import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
// NOTE: DraggableCard import removed from SpreadZone.tsx entirely after this change
// NOTE: didDragRef is declared for Phase 20 pre-wiring; not used in Phase 17
```

### LAYOUT-01/02: Band 2 Center Row with Communal Zone

```typescript
// Source: 17-UI-SPEC.md Band 2 spec — VERIFIED
// flex-1 center row; pile zones fixed-width; communal zone fills remaining space

{/* Band 2: Center Row */}
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

### LAYOUT-01/02: Band 3 Player Spread Zone

```typescript
// Source: 17-UI-SPEC.md Band 3 spec — VERIFIED

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

### LAYOUT-01/02: Band 1 Opponent Columns (with spread zones)

```typescript
// Source: 17-UI-SPEC.md Band 1 spec + CONTEXT.md D-05 — VERIFIED
// Opponent column: OpponentHand stacked above opponent SpreadZone

<div className="flex items-start gap-4 flex-1 overflow-x-auto">
  {Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
    const player = gameState.players.find(p => p.id === id);
    const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
    return (
      <div key={id} className="flex flex-col gap-1">
        <OpponentHand
          playerId={id}
          cardCount={count}
          displayName={player?.displayName ?? ''}
          connected={player?.connected ?? false}
          sendAction={sendAction}
        />
        {opponentSpread && (
          <SpreadZone
            pile={opponentSpread}
            sendAction={sendAction}
            draggingCardId={draggingCardId}
          />
        )}
      </div>
    );
  })}
</div>
```

Note: The opponent column structure above is already in the current `BoardView.tsx` (lines 47–65) — it already renders `OpponentHand` + `opponentSpread` as a `flex flex-col gap-1` column. [VERIFIED: BoardView.tsx lines 47–65] The Band 1 restructure is moving this column group from inside the old header to the new Band 1, with the controls on the right side. The column structure itself is unchanged.

---

## Drop Routing Verification (D-08 Confirmation)

**Claim (D-08):** `useSortable` data `{ card, fromZone: 'pile', fromId: pileId }` is sufficient for all drag routing in `BoardDragLayer`.

**Verification:**
1. `handleDragStart` (line 111): reads `event.active.data.current` as `{ card, fromZone, fromId }` — matches `useSortable` data shape. [VERIFIED: BoardDragLayer.tsx line 111]
2. `isIntraSpreadReorder` check (line 191): `fromZone === 'pile' && fromId === toId` — matches `useSortable` data. [VERIFIED: BoardDragLayer.tsx line 191]
3. `isSpread` check (line 187): checks `targetPile.region === 'spread'` via `gameState.piles` lookup — independent of drag data. [VERIFIED: BoardDragLayer.tsx lines 172–187]
4. `SpreadZone.useDndMonitor.onDragEnd` (lines 62–78): reads `activeData.fromZone === 'pile' && activeData.fromId === pile.id` — matches `useSortable` data. [VERIFIED: SpreadZone.tsx lines 62–78]

**Result:** D-08 confirmed. No data wiring changes needed. The `DraggableCard` removal does not break any downstream consumer.

**One nuance:** `DraggableCard` currently carries `onFlip` when used in `PileZone`. In `SortableSpreadCard`, `DraggableCard` was called with no `onFlip` prop (D-09 confirmed: SpreadZone.tsx line 38 — `<DraggableCard card={card} fromZone="pile" fromId={pileId} />` — no `onFlip`). Removing it loses nothing. [VERIFIED: SpreadZone.tsx line 38]

---

## Vertical Proportions Analysis (LAYOUT-02)

At 1080p desktop, browser chrome typically leaves ~960–980px of usable viewport height.

| Band | Height | Sizing Mechanism |
|------|--------|-----------------|
| ConnectionBanner | 0px (hidden when connected) | conditional render |
| Band 1: Header | ~200px when opponent spreads visible (~72px controls + 128px for opponent column with spread) | content-driven auto |
| Band 2: Center Row | ~490–510px | `flex-1` — absorbs all remaining |
| Band 3: Player Spread | ~152px (112px spread + 24px label + 16px toggle button) | content-driven auto |
| Band 4: Player Hand | 128px | fixed `h-[128px]` |

Total with spreads: ~200 + ~510 + ~152 + 128 = ~990px. Fits 1080p with browser chrome.

If opponent spread zones are empty (only hand count shown), Band 1 collapses to ~72px, giving the center row more space. LAYOUT-02 is satisfied in all states.

[ASSUMED: The ~200px Band 1 estimate accounts for opponent hand label + 112px spread zone + padding. Actual height depends on browser/OS chrome size. On 768px viewports (laptops), scrolling may appear — but Phase 17's scope is 1080p only per LAYOUT-02.]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nested `useDraggable` inside `useSortable` card | `useSortable` alone, renders CardFace/CardBack directly | Phase 17 (this phase) | Eliminates ID collision; `SortableHandCard` already uses this pattern since Phase 3 |
| Communal zone in bottom bar with personal spread | Communal zone in dedicated center row | Phase 17 (this phase) | Communal zone becomes visually dominant |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Band 1 height with opponent spreads ~200px at 1080p | Vertical Proportions Analysis | If taller than estimated, center row shrinks; mitigated by `flex-1` which always gives center row all remaining space |
| A2 | `SpreadZone` inner container `min-w-[80px]` needs a `flex-1 min-w-0` wrapper (not a prop change) to fill center row | Common Pitfalls / Code Examples | If communal zone still renders narrow, SpreadZone may need an optional `className` or `fillWidth` prop |

---

## Open Questions

1. **Communal SpreadZone width in flex-1 context**
   - What we know: `SpreadZone`'s inner spread container is `min-w-[80px] h-[112px]` (fixed). The outer `SpreadZone` wrapper is `flex flex-col gap-1` with no width set.
   - What's unclear: Will wrapping communal `SpreadZone` in `<div className="flex-1 min-w-0">` cause the inner container to stretch to fill, or will it stay at `min-w-[80px]`? In Tailwind v4 Flexbox, a child with no explicit width inside a `flex-1` parent will not automatically stretch — it only grows if it is itself a flex item with `flex-1` or has `width: 100%`.
   - Recommendation: The plan should instruct the implementer to verify this empirically and, if the zone doesn't fill, either (a) add a `w-full` to the inner spread container via an optional `className` prop on `SpreadZone`, or (b) apply `w-full` directly to the `SpreadZone` outer div. Option (a) is the cleaner minimal change. The planner should include a verification step: confirm communal zone is visually wide at the expected `flex-1` proportion.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 17 is a CSS/JSX-only change with no new external dependencies. All tools (Node, npm, Vitest, Playwright) already verified operational from previous phases.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` (all tests in `tests/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Communal zone renders in center row | visual/e2e | `npm run test:e2e` | ❌ Wave 0 (new spec needed) |
| LAYOUT-02 | All zones visible without scrolling at 1080p | visual/e2e | manual verification at 1080p viewport | manual-only — CSS layout, not testable via unit |
| SPREAD-04 | No duplicate dnd-kit IDs registered for spread cards | unit (server-side logic) | `npm test` — no new unit test needed for the removal itself | existing `spreadZoneCreation.test.ts` covers spread zone state; drag behavior is e2e |

**Note on SPREAD-04 testing:** The ID collision is a React component-level issue. The correct test is an e2e test confirming drag works without ghost events. Unit tests in `tests/` cover PartyKit server logic only — they cannot test dnd-kit registration. The existing e2e spec (`playwright/game.spec.ts`) is the right place to add a drag interaction test for spread zones.

### Sampling Rate

- **Per task commit:** `npm test` (unit suite, all server-logic tests)
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `playwright/game.spec.ts` — add spread zone drag test covering SPREAD-04 (drag a card from spread zone to hand zone, verify no misfires). Existing file exists; new test case needed.

---

## Security Domain

Phase 17 introduces no new input surfaces, authentication changes, or data transmission. All changes are CSS layout and component restructure with no user input handling. ASVS categories do not apply.

---

## Project Constraints (from CLAUDE.md)

| Directive | Category | Impact on Phase 17 |
|-----------|----------|-------------------|
| No over-engineering; only make directly requested changes | Code | Do not add new components, new props beyond what's needed for width fix |
| Read files before modifying them | Workflow | Planner must include read step for each file before edit task |
| No comments/docstrings on code you didn't change | Code | Do not annotate unchanged parts of BoardView or SpreadZone |
| Use `npm run dev` (PartyKit) + `npm run dev:client` (Vite) | Dev commands | Verify layout visually with both running |
| Hosting: GitHub Pages + PartyKit Cloud (no server/DB) | Constraints | No server changes; all layout is client-only — already satisfied |
| `@dnd-kit/sortable 10.x` API (major version diverge) | Stack | useSortable API unchanged from v9; confirm no breaking changes affect `horizontalListSortingStrategy` |

---

## Sources

### Primary (HIGH confidence)
- `src/components/BoardView.tsx` — current layout structure, verified by Read
- `src/components/SpreadZone.tsx` — current SortableSpreadCard + DraggableCard nesting, verified by Read
- `src/components/HandZone.tsx` — reference pattern for fix, verified by Read
- `src/components/DraggableCard.tsx` — verified no onFlip prop used in spread zone context
- `src/components/BoardDragLayer.tsx` — verified drag routing reads active.data.current; confirmed handles fromZone: 'pile'
- `.planning/phases/17-board-layout-restructure/17-UI-SPEC.md` — exact Tailwind class strings for all 5 bands
- `.planning/phases/17-board-layout-restructure/17-CONTEXT.md` — locked decisions D-01 through D-09
- `package.json` — verified all library versions

### Secondary (MEDIUM confidence)
- `17-UI-SPEC.md` band height estimates — derived from existing component dimensions, cross-referenced with CSS properties in actual components

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all versions from package.json
- Architecture: HIGH — all files read and traced; data flow verified end-to-end
- Pitfalls: HIGH — based on direct codebase inspection, not training knowledge
- Vertical proportions estimate: MEDIUM — pixel estimates are approximate; flex-1 ensures correctness regardless

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable CSS/dnd-kit, no fast-moving dependencies in scope)
