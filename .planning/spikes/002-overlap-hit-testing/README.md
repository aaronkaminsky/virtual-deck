---
spike: "002"
name: overlap-hit-testing
type: standard
validates: "Given overlapping cards at different z-indices, when clicking the visible portion of a lower card, then it is selected for drag; and at ~50% drag opacity the card below is visible enough to make drop decisions"
verdict: PENDING
related: ["001-free-drag-positioning"]
tags: [dnd-kit, overlap, ux, hit-testing]
---

# Spike 002: Overlap Hit Testing

## What This Validates

1. **Click-to-grab on buried cards** — clicking the exposed portion of a lower-z card should select it, not the card on top. Falls out of DOM z-index + pointer-events natively, but dnd-kit pointer capture could interfere.
2. **Drag opacity feel** — at 50% opacity, can you see the card beneath the one you're dragging well enough to make placement decisions?

Three deliberate scenarios: partial overlap (exposed edge), heavy overlap (~80% covered, sliver visible), and a 3-deep stack.

## Research

dnd-kit uses `pointer-events` and `setPointerCapture` internally, but only after drag start (pointer down + move threshold). A simple click on a visible card edge should be handled by normal DOM hit-testing before dnd-kit takes over. No special handling expected.

## How to Run

```
npm run dev:client
```
Open: **http://localhost:5173/virtual-deck/spike-002.html**

## What to Expect

- Three overlap scenarios in labeled columns
- Click the exposed edge of a buried card — log should show the buried card grabbed, not the top one
- Drag any card over a free card — shadow appears at >50% overlap
- Bottom row has free cards to use as drag-over targets for opacity testing

## Investigation Trail

Built on same foundation as spike 001. Same `coversMajority` threshold and shadow logic.

## Results

VALIDATED. Both behaviors confirmed:
- DOM z-index + pointer-events handles hit-testing correctly — clicking exposed portion of buried card selects it, not the top card. No dnd-kit interference.
- 50% DragOverlay opacity is comfortable for seeing cards beneath the dragged card.
