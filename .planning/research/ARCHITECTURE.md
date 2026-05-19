# Architecture Research

**Domain:** Layout/UX polish and interaction bug fixes — v1.5 Board Polish II milestone
**Researched:** 2026-05-19
**Confidence:** HIGH (based on direct codebase inspection)

---

## Current Architecture (as-built, v1.4 baseline)

```
App.tsx
└── RoomView
    ├── LobbyPanel           (pre-join screen)
    └── BoardDragLayer       (DndContext owner, all drag/select logic, pile-insert dialog)
        └── BoardView        (pure layout, flex-col with 5 bands)
            ├── ConnectionBanner
            ├── Header strip  (bg-card, flex row)
            │   ├── div × N  (one per opponent — flex-col with OpponentHand + SpreadZone stacked)
            │   └── ControlsBar  (hamburger → Popover → game controls)
            ├── Middle band   (flex-1, min-h-0, flex row)
            │   ├── PileZone × N   (draw/discard/custom piles)
            │   └── GridZone       (communal 7×2 play area — shrink-0)
            ├── Personal spread row  (flex-shrink-0, px-4 py-1 — only if mySpreadZone exists)
            │   └── SpreadZone (interactive, owned by local player)
            └── HandZone      (local player private hand, fixed ~100-128px height)
```

**State ownership:**
- PartyKit server: all game state (piles, hands, players, phase, undo stack, handRevealed)
- `BoardDragLayer`: `activeCard`, `pendingMove`, `selectedIds`, `selectionSource`, `shufflingPileIds` (ephemeral drag/select state)
- `HandZone`: `sortMode` (local display preference — never synced to server for 'original', syncs REORDER_HAND for byRank/bySuit)
- `GridZone`, `SpreadZone`, `OpponentHand`: no local state — purely driven by props

---

## Question 1: Docking Spread Zones to Their Hand Zones

### What "docking" means

Per LAYOUT-05: opponent spreads move out of the `bg-card` header into the board area (`bg-background`), positioned below each opponent's hand. Personal spread sits flush above HandZone with no visual separator between them. Vertical slack between piles/grid and the spread+hand unit grows in the middle band, not between spread and hand.

### Current opponent spread placement

Opponent spreads are already rendered inside the header `<div>` as a second sibling below each `OpponentHand`:

```tsx
// BoardView.tsx lines 47-65 (current)
<div key={id} className={`flex flex-col gap-1 ...`}>
  <OpponentHand ... />
  {opponentSpread && <SpreadZone ... interactive={false} />}
</div>
```

The problem is that this entire block lives inside the `bg-card` header strip. The fix is not a component restructure — it is a layout-band reassignment: the opponent column divs must move out of the header strip and into the middle band, sitting above the piles/grid row.

### Recommended approach: add an opponent band above the middle band

Replace the current two-section middle area with three sections:

```
┌─────────────────────────────────────────────────┐
│  Header: ControlsBar only             (bg-card) │  ← header becomes controls-only
├─────────────────────────────────────────────────┤
│  Opponent band: OpponentHand + spread            │  ← NEW band (bg-background)
│  (flex row, one column per opponent)             │
├─────────────────────────────────────────────────┤
│  Middle: PileZones + GridZone         (flex-1)  │  ← existing, unchanged
├─────────────────────────────────────────────────┤
│  Personal spread + HandZone                      │  ← spread above hand, no gap
└─────────────────────────────────────────────────┘
```

The opponent columns (currently inside the header) move to their own `<div>` with `flex flex-row gap-4 px-4 py-2`. This div sits between the header and the middle band. The header strip is simplified to only the `ControlsBar`.

### Personal spread docking

Personal spread currently sits in a `flex-shrink-0` row above HandZone, which is already structurally correct. The issue is visual: there is likely a gap or border between the spread row and the hand. To make them flush:

- Remove the `py-1` padding on the spread row (or reduce it to `pb-0`)
- Ensure HandZone has `pt-0` at top if it has a top margin/padding from its header row (`px-4 mb-1` on the label div)
- The spread and hand should share a single vertical visual unit — consider wrapping them both in a single outer `<div className="flex-shrink-0 flex flex-col">` so any gap between them is a controlled inner gap, not an outer layout seam

### Tradeoff: component restructure vs layout-only change

**Option A: Layout band reassignment (recommended)** — Move the opponent column divs out of the header strip and into a new sibling band in `BoardView.tsx`. No changes to `OpponentHand` or `SpreadZone`. The `flex flex-col gap-1` wrapper that currently pairs them is unchanged — it just moves to a different parent band.

- Tradeoff: `BoardView.tsx` gains a fourth major layout section, but each section is simple and readable.

**Option B: Render SpreadZone inside OpponentHand** — Pass spread data as a prop into `OpponentHand` and render it there.

- Avoids adding a layout band to `BoardView`.
- Creates a semantic coupling problem: `OpponentHand` renders its own droppable zone, its own header, and now also a full `SpreadZone` with its own droppable, dnd monitors, and SortableContext. This makes `OpponentHand` a compound component responsible for two dnd registration zones.
- Not recommended: the existing separation between `OpponentHand` (droppable for pass-card) and `SpreadZone` (droppable for pile actions) is intentional. `SpreadZone`'s `useDndMonitor` would nest inside `OpponentHand`, which adds cognitive load without benefit.

**Verdict: Option A.** The layout band reassignment is a pure `BoardView.tsx` change, touches zero component internals, and leaves all dnd registrations exactly as they are.

### Integration points

- **Modified:** `BoardView.tsx` — move opponent column divs from header strip to a new opponent band; simplify header to ControlsBar only; add explicit `flex-col` wrapper pairing personal spread + HandZone
- **No changes:** `OpponentHand.tsx`, `SpreadZone.tsx`, `HandZone.tsx`, `BoardDragLayer.tsx`, server

---

## Question 2: Empty Spread Zone Visual State

### What state is needed

Per LAYOUT-06: when a spread zone is empty, it should show a faint ¼-height dashed strip (not collapse to `h-px opacity-0` as it currently does for the interactive local zone). Controls (Eye, SelectAll) hide until cards are present.

The current code for interactive empty zones:

```tsx
// SpreadZone.tsx lines 169-178 (current)
isEmpty && interactive !== false
  ? isOver
    ? 'min-w-[56px] sm:min-w-[80px] h-[40px] ... border-dashed border-primary ...'
    : 'h-px opacity-0'   // ← collapses to invisible line
  : cn('min-w-[56px] h-[64px] ... border flex items-center ...')
```

The new requirement is a persistent visible strip even when not being hovered, for both interactive (personal) and non-interactive (opponent) zones.

### Where does "is dragging" state live?

The current empty interactive zone uses `isOver` from `useDroppable` to show the enhanced drop target. For the new faint strip, we need to know "is any drag in progress?" so the strip can optionally brighten or gain a primary-colored border on hover vs remain faint at rest.

Three options:

**Option A: `useDndContext` in SpreadZone (recommended)** — `SpreadZone` already imports from `@dnd-kit/core` (`useDroppable`, `useDndMonitor`). Adding `useDndContext` returns `active` — non-null when a drag is in progress. This is exactly the pattern `OpponentHand` and `HandZone` use today. No new props, no component boundary changes.

```tsx
const { active } = useDndContext();
const isDragging = active !== null;
// strip class: isDragging && !isOver → primary/30 border; isOver → primary border; rest → muted/30 border
```

**Option B: Pass `draggingCardId` prop** — `SpreadZone` already receives `draggingCardId`. A non-null value signals dragging is active. This works but requires checking for non-null, and `draggingCardId` is null between drag start and when `setActiveCard` runs (edge case during event processing). `useDndContext` is more authoritative.

**Option C: Component local state** — Not needed. The drag state is not local to the zone; it is a global DndContext value. Local state would be redundant and create a sync problem.

**Verdict: Option A (`useDndContext` inside `SpreadZone`).** Zero prop changes, idiomatic for this codebase, directly mirrors the `OpponentHand` pattern.

### Controls visibility

Current: `(!isEmpty || interactive === false)` gates the controls row. New rule: hide controls when `isEmpty`. The `interactive === false` branch (opponent zones) currently shows a face-toggle. Per CTRL-05, that face-toggle is removed from opponent zones. So the rule simplifies to: render controls only when `!isEmpty && interactive !== false`.

The controls `<div>` condition changes from `(!isEmpty || interactive === false)` to `(!isEmpty && interactive !== false)`.

No state beyond `pile.cards.length` is needed for this. `isEmpty` is a pure derivation from props.

### Integration point

- **Modified:** `SpreadZone.tsx` — add `useDndContext()` for the `isDragging` flag; update the empty-zone CSS class logic to render a ¼-height visible strip instead of `h-px opacity-0`; fix controls visibility gate from `||` to `&&`

---

## Question 3: Badge Visibility Logic (POLISH-05)

### Should it be CSS or conditional rendering?

**Option A: CSS (hide-when-zero)** — Always render the `<Badge>` but add `invisible` or `hidden` class when count is 0.

```tsx
<Badge className={pile.cards.length === 0 ? 'invisible' : ''}>
  {pile.cards.length}
</Badge>
```

This keeps the badge in the DOM, preserving its layout contribution (the `-bottom-2 -right-2` absolute position is irrelevant to layout since it is absolute). But if it is `invisible`, it is still accessible to screen readers as an element with empty text — minor accessibility concern.

**Option B: Conditional rendering (recommended)** — Only mount the `<Badge>` when count ≥ 1.

```tsx
{pile.cards.length > 0 && (
  <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
)}
```

- No layout side effects (badge is `absolute`).
- Screen readers see no badge element when empty — correct semantic.
- Matches the pattern used throughout the codebase for conditional zero-state UI (e.g., empty spread zone controls, opponent overflow count badge, selection count badge).

**Verdict: Conditional rendering.** The badge is positioned `absolute`, so its presence or absence does not affect pile zone layout. Conditional rendering is cleaner, removes the element entirely from the DOM, and is consistent with how every other conditional piece of UI is handled in this codebase.

### Integration point

- **Modified:** `PileZone.tsx` — wrap the `<Badge>` in `{pile.cards.length > 0 && (...)}`

---

## Question 4: Hand Sort "Original Order" Semantics (SORT-02)

### The problem

`HandZone` stores `sortMode` locally (`useState`). When `sortMode === 'original'`, cards display in server-authoritative order (`cards` prop from `gameState.myHand`). When `sortMode === 'bySuit'` or `'byRank'`, a `displayedCards` derivation sorts them visually without touching server state.

Cycling to `'original'` should restore the pre-sort arrangement. But what is "original"? Two interpretations:

**Interpretation A: "Original" = server order.** The server hand array reflects deal order, then any manual drag-reorders. When the user sorts by suit then cycles back to original, they get back to server order — which is whatever order was last persisted (deal order or last manual reorder). This is the current behavior.

**Interpretation B: "Original" = snapshot at the moment sort was first activated.** When the user clicks sort, capture a snapshot of the current card order. Cycling back to original restores that snapshot. This snapshot lives in client state, never on the server.

### Recommended approach: Interpretation A (server order = original)

The server order already correctly encodes the "last intentional arrangement" — either deal order, or the last manual drag-reorder the player performed. There is no semantic difference between "server order" and "original" from a player's perspective. The server order IS the original: it is what the player last explicitly placed cards in.

A client-side snapshot (Interpretation B) introduces drift: if any card enters or leaves the hand while a sort is active (opponent passes a card, player plays a card), the snapshot is stale and the restored "original" would contain wrong cards. Server order handles this automatically.

**Implementation consequence:** The current implementation (`sortMode === 'original'` shows `cards` prop directly) is already correct. SORT-02 requires documenting this semantics decision and verifying it behaves correctly — not a logic change.

One real gap exists: when the user sorts by suit, then drag-reorders within the sorted view, `handleDragEnd` in `HandZone` resets `sortMode` to `'original'` (line 218-220) and sends `REORDER_HAND`. This is correct — drag-reorder is an intentional arrangement, it clears the active sort mode so the new manual order becomes the server order, and cycling back to "original" will return to it. This is the right behavior.

**No new state needed.** No snapshot, no `originalCardIds` ref. Original = server order = `cards` prop.

### Integration point

- **Modified:** None (behavior is already correct). Phase task is documentation/validation only. If SORT-02 requires a visible label change (e.g., tooltip clarifying "Original order = last manual arrangement"), that is a string change in `SORT_TITLES` in `HandZone.tsx`.

---

## Question 5: Grid Face-Toggle Icon Repositioning (CTRL-07)

### Current state

`GridZone.tsx` renders the face-toggle button in a `<div className="flex gap-1">` that appears below the 7×2 grid, after the grid div. This is inside the card grid area visually.

### Recommended approach: pure CSS/layout change within GridZone

Move the button to the label row (the row that currently renders "Play Area"). Change:

```tsx
// Current:
<div className="flex items-center">
  <span className="text-xs text-muted-foreground">Play Area</span>
</div>
<div data-testid="grid-zone-play" className="grid grid-cols-7 ...">...</div>
{interactive !== false && (
  <div className="flex gap-1">
    <Button ... /> {/* face toggle — currently below grid */}
  </div>
)}
```

To:

```tsx
// Recommended:
<div className="flex items-center gap-1">
  <span className="text-xs text-muted-foreground">Play Area</span>
  {interactive !== false && (
    <Button ... /> {/* face toggle — now inline with label */}
  )}
</div>
<div data-testid="grid-zone-play" className="grid grid-cols-7 ...">...</div>
{/* no controls row below */}
```

This is a pure DOM restructure within `GridZone.tsx`. No props change, no new state, no changes to `BoardView`. The button's click handler, icon, and aria attributes are unchanged.

**Why no component restructure:** The label and the toggle are both rendered inside `GridZone`. Moving the toggle JSX from a bottom `<div>` into the label `<div>` is a cut-paste operation within one file. There is no reason to extract a new component or modify `BoardView`'s GridZone rendering.

### Integration point

- **Modified:** `GridZone.tsx` — move `<Button>` from standalone bottom div into the label div; remove the now-empty bottom controls `<div>`

---

## Component Change Summary

| Component | Change Type | What Changes |
|-----------|-------------|--------------|
| `BoardView.tsx` | Modified (layout restructure) | Header becomes ControlsBar-only; opponent columns move to a new opponent band; personal spread + HandZone paired in a single flex-col unit |
| `SpreadZone.tsx` | Modified (behavior + CSS) | Add `useDndContext` for isDragging; update empty-state CSS to ¼-height visible strip; fix controls visibility gate; remove face-toggle from `interactive=false` path |
| `PileZone.tsx` | Modified (conditional render) | Badge wrapped in `pile.cards.length > 0` guard |
| `GridZone.tsx` | Modified (DOM restructure) | Face-toggle button moves from bottom controls div into label div |
| `HandZone.tsx` | Not modified (behavior correct) | SORT-02 is a validation/doc task; existing original=server-order behavior is correct |
| `OpponentHand.tsx` | Potentially modified | Per CTRL-06: opponent hand drop-target outline must only show `isOver`, not on `dragIsActive`. Currently: `dragIsActive ? 'border-dashed border-primary/60' : 'border-transparent'`. Fix: remove the `dragIsActive` branch — border is transparent until `isOver` |
| `BoardDragLayer.tsx` | Not modified | No state changes needed for v1.5 items |
| `party/index.ts` | Not modified | No server changes for v1.5 items |
| `shared/types.ts` | Not modified | No type changes for v1.5 items |

---

## Data Flow

No data flow changes in v1.5. All changes are:

1. Layout band reorganization (DOM structure only, `BoardView.tsx`)
2. Visual state derivation from existing dnd-kit hooks (within `SpreadZone.tsx`, `OpponentHand.tsx`)
3. Conditional rendering from existing pile data (within `PileZone.tsx`)
4. DOM restructure within a single component (within `GridZone.tsx`)

The server-authoritative state model, `viewFor` masking, per-connection broadcast, and DndContext scope are all unchanged.

---

## Recommended Build Order

**Group 1: Zero-risk visual-only changes (any order within group)**

1. **POLISH-05** — `PileZone.tsx`: wrap Badge in `> 0` guard. One-line change, no logic, instantly verifiable.
2. **CTRL-07** — `GridZone.tsx`: cut-paste face-toggle button from bottom div to label div. One-component change, no behavior change.
3. **LAYOUT-07** — `SpreadZone.tsx`: remove the `<span>{pile.name}</span>` label. One-line deletion. No logic.
4. **CTRL-05** — `SpreadZone.tsx`: remove face-toggle from the `interactive === false` branch. One-line conditional change. Verify opponent zones lose the icon, local zone keeps it.

**Group 2: Empty state visual + drop-target outline (small behavior changes)**

5. **LAYOUT-06** — `SpreadZone.tsx`: add `useDndContext`, update empty-state class to visible ¼-height strip, fix controls gate. Interdependent with CTRL-05 (same file, same PR is fine).
6. **CTRL-06** — `OpponentHand.tsx`: remove `dragIsActive` border class. Tiny change; verify that the dashed outline no longer appears on drag start.
7. **POLISH-06** — `PileZone.tsx`: tighten gap between controls row and pile card. CSS only. Can land in same PR as POLISH-05.

**Group 3: Layout restructure (highest complexity, broadest DOM change)**

8. **LAYOUT-05** — `BoardView.tsx`: move opponent columns from header to new opponent band; dock personal spread above HandZone. This is the largest structural change. Land it last so e2e tests catch any dnd-kit collision regressions from the DOM move.

**Group 4: Bug fixes (independent, can land anytime after Group 1)**

9. **BUG-01** — Fix Select All button (requires investigation; likely a stale `onSelectAll` prop or guard condition in `SpreadZone.handleSelectAll` or `PileZone.handleSelectAll`)
10. **BUG-02** — Fix grid mobile columns (`grid-cols-7` missing responsive breakpoint; add `grid-cols-4 sm:grid-cols-7` in `GridZone.tsx`)

**Rationale for ordering:**

- Groups 1 and 2 have no dependencies on each other — they touch different files and different behavior paths.
- Group 3 (LAYOUT-05) is a pure DOM restructure with no logic changes, but it shifts multiple component trees in `BoardView`. Running it last ensures the e2e drag tests catch any regression from the DOM reorganization before merge.
- Bug fixes are independent and can be validated by existing e2e tests.

---

## Integration Points with Existing Architecture

| Concern | Detail |
|---------|--------|
| `DndContext` boundary | `BoardDragLayer` owns the single `DndContext`. Moving opponent columns from the header band to a new band in `BoardView` does not affect this — all zones remain children of `DndContext`. Collision detection is pointer-based, not DOM-position-based. |
| `customCollision` in `BoardDragLayer` | Identifies droppables by ID prefix (`hand`, `opponent-hand-`, `pile-`, `grid-cell-`). Moving opponent column divs in the DOM does not change droppable IDs. No change needed. |
| `SpreadZone` droppable IDs | The droppable ID is `pile-${pile.id}`. Moving the component to a new DOM band in `BoardView` does not change the droppable ID. All existing drag routing continues unchanged. |
| `useDndMonitor` in `SpreadZone` | Global to the `DndContext` scope. DOM position of the SpreadZone component is irrelevant to monitor registration. |
| Selection state (`selectedIds`, `selectionSource`) | Lives in `BoardDragLayer`. Not touched by any v1.5 change. |
| Undo stack | No v1.5 change modifies server actions. No undo stack impact. |

---

## Anti-Patterns to Avoid

### Moving OpponentHand's droppable into SpreadZone

**What it looks like:** Combining the opponent hand droppable and spread zone droppable into one component to simplify the layout band.
**Why it's wrong:** They have different droppable IDs, different collision handlers, and different semantic roles (pass-card vs pile operations). Merging them would require custom collision logic to disambiguate drops inside the combined component.
**Do this instead:** Keep them as separate components stacked in a single column div. The column div is the only new thing; both components are unchanged.

### Storing "original hand order" snapshot in a ref

**What it looks like:** `const originalOrderRef = useRef(cards.map(c => c.id))` captured on first render or on sort activation, used to restore when cycling back to 'original'.
**Why it's wrong:** If any card enters or leaves the hand while a sort is active (deal, pass, play), the snapshot is stale — restoring it references IDs that no longer exist or omits new cards. Server order handles this automatically.
**Do this instead:** Let `sortMode === 'original'` render `cards` prop directly. Server order IS original order.

### CSS `visibility: hidden` on zero-count badge

**What it looks like:** `<Badge className={count === 0 ? 'invisible' : ''}>` to hide the badge while preserving layout.
**Why it's wrong:** The badge is `absolute`-positioned so it does not contribute to layout; hiding it while keeping it in the DOM serves no purpose and leaves an accessible but semantically empty element.
**Do this instead:** Conditional rendering (`count > 0 && <Badge>`).

### Adding a second DndContext for the opponent band

**What it looks like:** Wrapping the new opponent band in its own `DndContext` for isolation.
**Why it's wrong:** dnd-kit does not support cross-context drags. Cards would not be draggable from the opponent band to the hand or piles.
**Do this instead:** Opponent columns remain children of the single DndContext in `BoardDragLayer`.

---

## Sources

- Direct codebase inspection: `src/components/BoardView.tsx`, `src/components/SpreadZone.tsx`, `src/components/HandZone.tsx`, `src/components/OpponentHand.tsx`, `src/components/PileZone.tsx`, `src/components/GridZone.tsx`, `src/components/BoardDragLayer.tsx`, `src/shared/types.ts`
- `.planning/PROJECT.md` — v1.5 requirements LAYOUT-05 through LAYOUT-07, POLISH-05/06, CTRL-05 through CTRL-07, SORT-02, BUG-01/02
- `.planning/research/ARCHITECTURE.md` (v1.3) — prior layout decisions, DndContext boundary decisions

---
*Architecture research for: v1.5 Board Polish II — Virtual Deck*
*Researched: 2026-05-19*
