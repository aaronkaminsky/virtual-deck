# Architecture Research

**Domain:** Layout/UX polish and spread zone interactivity — v1.3 milestone
**Researched:** 2026-05-01
**Confidence:** HIGH (based on direct codebase inspection)

---

## Current Architecture (as-built, v1.2 baseline)

```
App.tsx
└── RoomView
    ├── LobbyPanel           (pre-join screen)
    └── BoardDragLayer       (DndContext owner, all drag logic, pile-insert dialog)
        └── BoardView        (pure layout, flex-col with 4 sections)
            ├── ConnectionBanner
            ├── Header strip  (bg-card, flex row)
            │   ├── OpponentHand × N  (each with opponentSpread SpreadZone below it)
            │   ├── Copy-link button
            │   └── ControlsBar  (Deal popover | Undo + Reset alert-dialog)
            ├── Pile row      (flex-1, centered, PileZone × N)
            ├── Spread row    (bg-card, communalZone + mySpreadZone side by side)
            └── HandZone      (player's private hand, fixed 128px height)
```

**State ownership:**
- PartyKit server: all game state (piles, hands, players, phase, undo stack)
- BoardDragLayer: `activeCard`, `pendingMove`, `selectedIds` (ephemeral drag/select state)
- BoardView: `copied` (copy-link button flash) — trivial local state

---

## Question 1: Communal Zone to Physical Center

### Current layout structure

`BoardView` uses a flex-column with four top-to-bottom sections:

1. Header strip (`bg-card`) — opponents + controls
2. Pile row (`flex-1`) — draw/discard piles, centered
3. Spread row (`bg-card`) — communal zone (`pile.id === 'play'`) + player's personal zone, side by side
4. HandZone — player's private hand

The communal zone currently sits at the bottom of the board alongside the personal zone. "Physical center" means moving it to the vertical midpoint — between the pile row and the player area.

### Recommended approach: split the single spread row into two

Replace the single spread row with two separate rows:

```
┌─────────────────────────────────────────────────┐
│  Header: opponents + controls        (bg-card)  │
├─────────────────────────────────────────────────┤
│  Pile row: Draw + Discard            (flex-1)   │
├─────────────────────────────────────────────────┤
│  Communal spread zone                (bg-card)  │  ← NEW CENTER POSITION
├─────────────────────────────────────────────────┤
│  Player personal spread zone(s)      (bg-card)  │
├─────────────────────────────────────────────────┤
│  HandZone                                       │
└─────────────────────────────────────────────────┘
```

In `BoardView.tsx`, the single `<div className="flex items-start gap-4 px-4 py-2 bg-card">` that renders both `communalZone` and `mySpreadZone` becomes two separate `<div>` rows: one for `communalZone` only, one for `mySpreadZone`.

**CSS approach: flexbox, not grid.** The sections have heterogeneous heights. The pile row uses `flex-1` to fill remaining space; other rows have fixed-height card content. CSS Grid's implicit row sizing would require explicit `grid-rows` accounting for the fixed card heights and would need updating whenever card dimensions change. Staying with `flex flex-col` on the outer wrapper and `flex-1` on the pile row preserves the existing approach exactly.

**Variable player count (2–4) effect on communal zone position:** None. The communal zone's row is independent of how many players are present. Player count only affects the header strip (opponent hands and their spread zones) and the personal zone row (just `mySpreadZone` — the local player's personal zone is always one). The opponent spread zones remain in the header alongside `OpponentHand`, which is unchanged by this refactor.

**Communal zone width:** In its new full-row position, the communal zone should expand to fill available width. Add `w-full` to the `SpreadZone` container when rendered as the communal zone row, since `min-w-[80px]` was sized for a strip next to another element.

### Integration point

- **Modified:** `BoardView.tsx` — split one `<div>` into two `<div>` rows.
- No server changes. No changes to `BoardDragLayer`.

---

## Question 2: Collapsing Game Controls into a Menu Panel

### Current ControlsBar

`ControlsBar` renders inline in the header strip as a horizontal button group. In setup/lobby phase: a Deal `Popover`. In playing phase: Undo button + Reset `AlertDialog`.

### Recommended approach: wrap ControlsBar in a Popover trigger

The existing `Popover` component (`src/components/ui/popover.tsx`) wraps `@base-ui/react/popover`. This primitive handles portal rendering, positioning, keyboard dismiss (Escape), and focus management. No new dependencies.

**Trigger placement:** A single icon button (e.g., `SlidersHorizontal` from `lucide-react`, which is already a project dependency) lives in the header strip exactly where `ControlsBar` currently is. The Popover popup opens below it and renders the current controls as a vertical flex-col panel.

**Why not a floating button?** A floating button (bottom-right or similar) must be z-indexed above the dnd-kit `DragOverlay` portal. `DragOverlay` renders into `document.body` via `createPortal` in `BoardDragLayer`. Managing z-index stacking between a floating button and a dragging card overlay introduces fragility. Keeping the trigger in the header avoids this entirely.

**AlertDialog inside Popover:** `ControlsBar` uses `AlertDialog` from `@base-ui/react/alert-dialog` for the Reset confirmation. When Reset is triggered from inside a Popover, the `AlertDialog` opens in its own portal with its own backdrop. This composes correctly — the backdrop covers the Popover. The Popover stays mounted behind the backdrop, which is acceptable (dismissing the alert dialog returns focus to the Popover trigger, not an unrelated element). This behavior can be verified quickly with a manual test during LAYOUT-03.

**What does NOT change:** The copy-link button stays outside the Popover, as a standalone header button. It is a room-setup utility (sharing the URL before a game), not a game control. Burying it in the panel makes the most common pre-game action harder to reach.

**Restructuring ControlsBar layout:** The current component renders a `flex items-center gap-2 flex-shrink-0` wrapper with buttons side by side. For the Popover panel context, change the inner layout to `flex-col gap-2`. The component's `phase`-based conditional rendering is unchanged — only the wrapper layout CSS changes.

### Integration point

- **Modified:** `ControlsBar.tsx` — change wrapper layout from horizontal row to `flex-col`.
- **Modified:** `BoardView.tsx` — wrap the `<ControlsBar>` usage in a `<Popover>` with a `<PopoverTrigger>` icon button; move `<PopoverContent>` to contain `<ControlsBar>`.
- No new shadcn components needed. No server changes.

---

## Question 3: Responsive Layout Breakpoints

### Current state

`BoardView` uses `h-screen w-screen overflow-hidden flex flex-col`. Fixed heights: HandZone `h-[128px]`, SpreadZone `h-[112px]`. Cards are `w-[63px] h-[88px]` with `-ml-5` fan overlap. No existing responsive breakpoints.

### What breaks at phone width (~375px)

| Zone | Current behavior | Problem at 375px |
|------|-----------------|-----------------|
| Header strip | `overflow-x-auto` | Works, but tight when controls button + copy-link + 3 opponents are all present |
| Pile row | Two piles centered | Fine — 2 × ~70px + gap fits easily |
| Communal spread row | `min-w-[80px]`, `overflow-x-auto` | Row narrower than available width; zone appears undersized |
| Personal spread row | Same as communal | Same |
| HandZone | `overflow-x-auto`, `h-[128px]` | Fine — horizontal scroll handles full hand |

### Recommended breakpoint strategy: single `sm:` breakpoint (640px)

Below `sm` (phone):
- Header icon button labels hidden: the controls trigger shows icon only (no text label).
- Copy-link button: icon only. Already has `aria-label="Copy room link"`. Text content `Copied!` / `Copy link` becomes `sm:inline` with a `hidden` default.
- Communal and personal spread rows: `w-full` to fill the row.

Above `sm` (tablet/desktop): current layout is fully preserved.

**No grid-based layout reflow.** The board stays a vertical stack at all widths. The zone order (opponent row → pile row → communal zone → personal zone → hand) is the correct physical analogy at any screen width. There is no horizontal layout variant.

**Touch note:** PROJECT.md marks "Mobile-first layout" as Out of Scope and notes drag-and-drop UX is worse on touch. LAYOUT-04 requirement ("scales to phone-sized screens") is about visual fit, not touch interaction. No changes to the `PointerSensor` / `TouchSensor` configuration in `BoardDragLayer` are needed for this milestone.

### Integration point

- **Modified:** `BoardView.tsx` — add `sm:` variants for text visibility in header.
- **Modified:** `SpreadZone.tsx` — add `w-full` to outer container (or pass a `fullWidth` prop); this is a one-class change.
- No server changes.

---

## Question 4: Spread Zone Multi-Select and Undo Interaction

### SPREAD-01: Multi-select matching player hand UX

`HandZone` already implements the full multi-select pattern:
- `selectedIds: Set<string>` held in `BoardDragLayer`
- `onToggleSelect` propagated to each `SortableHandCard`
- Click to select, drag selected card moves the whole set (`PLAY_CARD_SET`)
- Escape key clears selection
- `aria-pressed` on each card
- Visual ring (`ring-1 ring-primary/30`) + translateY lift on selected cards

`SpreadZone` has none of this. Adding it requires:
1. `selectedIds: Set<string>` and `onToggleSelect` props on `SpreadZoneProps`
2. Click handler on each `SortableSpreadCard` (same pattern as `SortableHandCard`)
3. Visual ring on selected cards
4. "N selected" badge in the zone label (already present in HandZone label area)

**Required server change (one field):** `PLAY_CARD_SET` in `party/index.ts` currently hardcodes that cards come from `hands[senderToken]` (line 515: `const hand = this.gameState.hands[fromId]`). The authorization check on line 506 also blocks any `fromId` that doesn't match `senderToken`. To support playing a set from the communal spread zone or the player's personal zone:

- Add `fromZone?: 'hand' | 'pile'` to the `PLAY_CARD_SET` action type in `shared/types.ts`
- In the server handler: if `fromZone === 'pile'`, source cards from `piles.find(p => p.id === fromId)?.cards` instead of `hands[fromId]`
- Update the authorization check: for pile sources, allow any player to play from the communal zone (`pile.ownerId === null`) and restrict personal zone plays to the zone owner (`pile.ownerId === senderToken`)

This is a backward-compatible addition — `fromZone` defaults to `'hand'` so all existing `PLAY_CARD_SET` dispatches (from `HandZone`) continue to work without changes.

**`selectedIds` scoping:** `BoardDragLayer` holds one `selectedIds: Set<string>` for the hand. Spread zone selection must be a separate set — selecting a card in the communal zone and a card in the hand simultaneously makes no sense for a single play action.

Recommended: add `spreadSelectedIds: Set<string>` as a second state in `BoardDragLayer`. Use the zone identity (hand vs spread) to determine which set is active during drag. Clear the opposite set whenever a drag starts from either zone (existing logic on line 115 already clears `selectedIds` when dragging an unselected card — extend this to also clear `spreadSelectedIds`).

### SPREAD-02: Spread zone card reorder by drag

This already works. `SpreadZone` uses `SortableContext` + `useSortable` per card + `useDndMonitor` to detect intra-pile reorder and dispatches `REORDER_PILE_SPREAD`. The server handles `REORDER_PILE_SPREAD` on lines 312–336 of `party/index.ts`. The communal zone (`pile.id === 'play'`) and personal zones all go through the same code path.

After LAYOUT-01 moves the communal zone to its own center row, reorder continues to work without code changes. The `DndContext` in `BoardDragLayer` is global — sortable card IDs are registered regardless of DOM position. Collision detection is pointer-based, not DOM-order-based.

SPREAD-02 is a verification task, not a development task.

### Undo interaction with reorder

`REORDER_PILE_SPREAD` does not call `takeSnapshot` (confirmed: no call in that switch branch in `party/index.ts`). `REORDER_HAND` also has no snapshot. Reorders are intentionally non-undoable — they are aesthetic/organizational changes, not game moves. This remains correct for v1.3. Undo applies only to card moves (`MOVE_CARD`, `PLAY_CARD_SET`, `FLIP_CARD`, `PASS_CARD`, `DEAL_CARDS`, `SHUFFLE_PILE`).

---

## Component Summary: New vs Modified

| Component | Status | Change |
|-----------|--------|--------|
| `BoardView.tsx` | Modified | Split single spread row into two rows; wrap controls in Popover; add `sm:` responsive variants |
| `ControlsBar.tsx` | Modified | Change layout from horizontal row to `flex-col` for Popover panel rendering |
| `SpreadZone.tsx` | Modified | Add `selectedIds` + `onToggleSelect` props; add selection visuals to `SortableSpreadCard`; add `w-full` responsive behavior |
| `BoardDragLayer.tsx` | Modified | Add `spreadSelectedIds` state; thread selection props to SpreadZone instances; update multi-card drag dispatch to pass `fromZone: 'pile'` when source is spread |
| `party/index.ts` | Modified | Update `PLAY_CARD_SET` handler to support `fromZone: 'pile'`; update authorization for pile-sourced set plays |
| `shared/types.ts` | Modified | Add `fromZone?: 'hand' \| 'pile'` to `PLAY_CARD_SET` action type |

No new components. No new npm packages. No new shadcn components.

---

## Data Flow Changes

### Multi-select from spread zone (new path)

```
User clicks card in SpreadZone
    → onToggleSelect(cardId) → BoardDragLayer.spreadSelectedIds updated
    → SpreadZone re-renders with selection highlight

User drags selected card out of SpreadZone toward a pile drop target
    → BoardDragLayer.handleDragStart: if dragging unselected card, clear spreadSelectedIds
    → BoardDragLayer.handleDragEnd: isMultiCardSet checks spreadSelectedIds
    → sendAction({
        type: 'PLAY_CARD_SET',
        cardIds: [...spreadSelectedIds],
        fromZone: 'pile',
        fromId: pile.id,
        toZone: 'pile',
        toId: targetPileId
      })
    → Server: validates source pile, removes cards, appends to dest, takeSnapshot
    → broadcastState() → all clients update
```

### Communal zone repositioning (no data flow change)

The communal zone (`pile.id === 'play'`, `region: 'spread'`) already exists in `gameState.piles`. Moving its DOM position in `BoardView` does not change pile identity, drop routing, or reorder behavior. The `customCollision` function in `BoardDragLayer` identifies droppables by ID prefix (`pile-play`), not by DOM position.

---

## Recommended Build Order

1. **LAYOUT-01 + LAYOUT-02** — split the spread row in `BoardView.tsx`. Pure structural CSS. No logic changes. Validates visual concept before adding interaction. Verify existing e2e tests still pass.

2. **LAYOUT-03** — wrap `ControlsBar` in Popover. Isolated to `BoardView.tsx` header markup and `ControlsBar.tsx` layout. Manually verify that the `AlertDialog` (Reset) composes correctly inside the Popover popup.

3. **LAYOUT-04** — add `sm:` responsive variants. Low-risk CSS additions on top of the restructured layout. No logic.

4. **shared/types.ts + party/index.ts for SPREAD-01** — add `fromZone` to `PLAY_CARD_SET` in types and update the server handler. This is the only change that crosses the wire. Add/update unit tests before the UI lands. The change is backward-compatible — no existing dispatch breaks.

5. **SPREAD-01 UI** — add `spreadSelectedIds` to `BoardDragLayer`, thread `selectedIds` + `onToggleSelect` to `SpreadZone`, add selection visuals to `SortableSpreadCard`.

6. **SPREAD-02 verification** — confirm intra-zone drag reorder works for the communal zone in its new center-row position. No code changes expected.

**Rationale:** Layout changes are visually reviewable in isolation and carry no server risk. The server change for `PLAY_CARD_SET` is the only cross-layer dependency and should be tested server-side before the UI builds on it.

---

## Integration Points with Existing Architecture

| Concern | Detail |
|---------|--------|
| `DndContext` boundary | `BoardDragLayer` owns the single `DndContext`. All zones — including the communal zone in its new row position — are children of this context. No new context needed. |
| `customCollision` function | Filters droppables by ID prefix: `hand`, `opponent-hand-`, `pile-`. The communal zone droppable is `pile-play`. Moving it in the DOM has no effect on collision detection. |
| shadcn/ui primitives in use | `Popover` (`@base-ui/react/popover`) is already in the project. The controls collapse uses the existing component. No new shadcn components needed. |
| `REORDER_PILE_SPREAD` action | Already complete in server and client. Works for all spread piles. No change. |
| Undo stack | `PLAY_CARD_SET` calls `takeSnapshot`. Multi-card plays from spread zones will be undoable. Reorders remain non-undoable (consistent with `REORDER_HAND`). |
| `viewFor` masking | Communal zone cards are already visible to all players (`region: 'spread'`, `faceUp: true` by default). No masking changes. |
| Per-connection broadcast | `broadcastState` uses `viewFor` per connection. No change needed. |

---

## Anti-Patterns to Avoid

### Separate DndContext for communal zone

**What it looks like:** Creating a second `DndContext` scoped to the communal spread row.
**Why it's wrong:** dnd-kit does not support dragging between separate `DndContext` instances. Cards would not be draggable between the communal zone and the hand or piles.
**Do this instead:** All zones remain children of the single `DndContext` in `BoardDragLayer`.

### Storing selection state in server GameState

**What it looks like:** Adding `selectedCardIds` to `GameState` to broadcast selection to other players.
**Why it's wrong:** Selection is ephemeral pointer state, not a game event. Broadcasting it causes unnecessary undo snapshots, server round-trips for every click, and race conditions between fast clicks.
**Do this instead:** Keep all selection state in `BoardDragLayer` React state, local to each client.

### CSS Grid for board layout

**What it looks like:** Converting `BoardView`'s outer container to `display: grid` for zone proportions.
**Why it's wrong:** The pile row needs `flex-1` to fill remaining viewport height. Other rows have fixed card-height constraints. CSS Grid's implicit row track sizing fights with `flex-1` semantics and requires explicit `grid-rows` values that encode card dimensions.
**Do this instead:** Stay with `flex flex-col` on the outer container with `flex-1` on the pile row.

### Moving copy-link into the controls panel

**What it looks like:** Placing the "Copy link" button inside the Popover panel alongside Deal/Undo/Reset.
**Why it's wrong:** Copy link is used before the game starts to share the URL with other players. It belongs at top-level header accessibility, not inside a menu that requires two clicks to reach.
**Do this instead:** Keep the copy-link button as a standalone icon button in the header, outside the Popover.

### Single `selectedIds` set covering both hand and spread zones

**What it looks like:** Reusing `BoardDragLayer.selectedIds` for spread zone card selection.
**Why it's wrong:** A user could have cards selected in their hand and cards selected in the spread zone simultaneously with no clear semantics for what dragging one of them should do.
**Do this instead:** Separate `selectedIds` (hand) and `spreadSelectedIds` (spread zone) state in `BoardDragLayer`. Clear the opposite set when a drag starts from either zone.

---

## Sources

- Direct codebase inspection: `src/components/BoardView.tsx`, `src/components/SpreadZone.tsx`, `src/components/HandZone.tsx`, `src/components/BoardDragLayer.tsx`, `src/components/ControlsBar.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/alert-dialog.tsx`, `party/index.ts`, `src/shared/types.ts`, `src/globals.css`
- `package.json` — confirmed `@base-ui/react ^1.3.0`, `@dnd-kit/core ^6.3.1`, `@dnd-kit/sortable ^10.0.0`, `lucide-react ^1.7.0`, Tailwind 4.x
- `.planning/PROJECT.md` — v1.3 requirements LAYOUT-01 through LAYOUT-04, SPREAD-01, SPREAD-02; Key Decisions log

---
*Architecture research for: v1.3 Layout & UX Polish — Virtual Deck*
*Researched: 2026-05-01*
