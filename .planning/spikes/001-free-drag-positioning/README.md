---
spike: "001"
name: free-drag-positioning
type: standard
validates: "Given cards with absolute (x,y,z) on a bounded div, when dragged with dnd-kit useDraggable, then they reposition freely on drop and revert on cancel"
verdict: PENDING
related: ["002-overlap-hit-testing", "004-multi-card-group-drop"]
tags: [dnd-kit, canvas, positioning]
---

# Spike 001: Free Drag Positioning

## What This Validates

Given cards with absolute (x, y, z) positions on a bounded canvas div, when dragged using dnd-kit `useDraggable` (no sortable, no collision detection, no droppable zones), then:
- Cards reposition freely to wherever they're dropped (`position += event.delta`)
- Cancelled drags (Escape) return the card to its origin (state unchanged)
- Dropped card becomes topmost (`z = max(all z) + 1`)
- The dragged card renders at 50% opacity via DragOverlay so you can see the card below

## Research

dnd-kit free positioning uses only `useDraggable` — no `useDroppable`, no collision detection, no sortable strategy. The `event.delta` from `onDragEnd` gives viewport-space displacement from drag start. Since the canvas has no CSS transform and no scroll (in this spike), viewport delta == canvas delta.

Key gotcha from the existing codebase: `MeasuringStrategy.Always` is required on `DndContext` per CLAUDE.md conventions.

| Approach | Notes |
|----------|-------|
| `useDraggable` + `event.delta` | Clean. No droppable needed. Source hidden via opacity:0, DragOverlay renders the ghost. |
| Raw pointer events | More control, loses dnd-kit's accessible keyboard drag, touch normalization. Not worth it. |

Chosen: `useDraggable` + `event.delta`.

## How to Run

Start the Vite dev server if not already running:
```
npm run dev:client
```
Open: **http://localhost:5173/spike-001.html**

## What to Expect

- Green felt canvas with 10 playing cards scattered at initial positions
- Drag any card freely — it follows the cursor
- Drop it — it snaps to the new position and appears on top of all other cards
- Press Escape mid-drag — card returns to where it was
- Event log below the canvas shows grab/drop/cancel with coordinates
- Reset button restores initial layout

## Investigation Trail

- Built with `useDraggable`, DragOverlay at 50% opacity, `event.delta` applied to stored (x,y)
- Cancel handled by doing nothing in `onDragCancel` — state unchanged, transform resets to null
- DragOverlay uses `dropAnimation={null}` to avoid an animated snap-back on drop
- Added `box-shadow` stack indicator: single-layer `2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db` to signal buried cards
- Shadow is conditional: only appears on a card covering a lower-z card, only when overlap area > 50% of bottom card area
- Same shadow applied live to DragOverlay via `onDragMove` + delta tracking — appears/disappears as dragged card crosses the 50% threshold over any stationary card
- Majority-coverage threshold (50%) is the right sensitivity — any-overlap was too eager on corner grazes

## Results

VALIDATED. All core behaviors confirmed:
- Free drag repositions cards correctly via `event.delta`
- Escape cancels, card snaps back to origin
- Drop makes card topmost (z = max + 1)
- 50% opacity DragOverlay lets you see the card below
- Stack shadow (single layer, majority-coverage threshold) correctly signals buried cards both at rest and during drag

**For the real build:**
- Clamp drop position to canvas bounds: `newX = clamp(x + delta.x, 0, canvasW - CARD_W)`
- Stack shadow logic is ready to port: `coversMajority()` + `coveringIds` set + `onDragMove` delta tracking
- `dragDelta` state causes re-renders on every pointermove — use a ref in production and only setState for the shadow boolean (coarse update)
