---
spike: "004"
name: multi-card-group-drop
type: standard
validates: "Given multiple selected cards dragged as a group, when dropped, then they land maintaining relative positions with z-order preserved above all existing cards"
verdict: PENDING
related: ["001-free-drag-positioning", "002-overlap-hit-testing"]
tags: [dnd-kit, multi-select, group-drag]
---

# Spike 004: Multi-Card Group Drop

## What This Validates

Dragging a group of selected cards together, landing with:
- Relative (x, y) positions preserved
- Internal z-order preserved (bottom card of group stays bottom within group)
- Entire group lands above all non-selected cards (z = max + 1..N)

## How It Works

One card is the drag handle (the one the user clicks to start drag). Other selected cards are "passengers" — rendered as positioned ghosts at `(card.x + delta.x, card.y + delta.y)` while dragging. On `onDragEnd`, all cards in the group get `x += delta.x, y += delta.y` and a consecutive block of z-values above the current max, sorted by their pre-drag z to preserve internal order.

## How to Run

```
npm run dev:client
```
Open: **http://localhost:5173/virtual-deck/spike-004.html**

## What to Expect

- Click cards to toggle selection (blue ring)
- Drag any selected card — the whole group moves together
- Drop — group lands in new position, all above existing cards
- Log shows group size and confirms z-order preserved
- Unselected cards in bottom row to use as drop targets for depth testing

## Investigation Trail

- Passenger ghosts rendered as absolutely positioned divs with `pointerEvents: none` at `card.x + delta.x`
- DragOverlay shows only the handle card; passengers rendered separately to avoid needing a custom multi-card overlay
- Click-vs-drag disambiguation via `pointerdown`/`pointermove`/`pointerup` sequence on each card

## Results

VALIDATED. Group drag works correctly:
- Relative positions preserved on drop
- Internal z-order preserved within group (pre-drag z sort → consecutive z-block above max)
- Group lands above all non-selected cards

**Bug found and fixed:** My `onPointerDown` handler overwrote dnd-kit's from `{...listeners}`, breaking drag entirely. Fix: use `onClick` (not `onPointerDown`) for selection toggle — these don't conflict.

**Bug found and fixed:** Default `PointerSensor` activates on `pointerdown` with no movement, so even a plain click sets `isDragging = true` → `didDragRef = true` → selection never toggled. Fix: `activationConstraint: { distance: 8 }` — drag only activates after 8px movement, clicks never touch `isDragging`.

**For the real build:**
- Any canvas card needing both click and drag requires `PointerSensor` with `distance: 8` activation constraint
- Passenger ghosts (`pointerEvents: none`, absolutely positioned at `card.x + delta.x/y`) work cleanly alongside the DragOverlay handle ghost
- Selection should clear after drop (already implemented)
