# Spike Manifest

## Idea

Replace the current fixed play-area grid with a free-form canvas where each card has an absolute (x, y, z) position and can be placed anywhere, overlapping freely. The canvas is bounded but scrollable when cards overflow. This is intended to be more flexible across game types and simpler than the fixed-grid approach.

## Requirements

- Cards, not piles, are the unit of positioning
- Stack shadow: single `box-shadow` layer (`2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db`) on the covering card only when >50% of the bottom card's area is covered; same shadow on DragOverlay during drag via `onDragMove` delta tracking
- In production, track `dragDelta` in a ref (not state) to avoid per-pointermove re-renders; only setState for the boolean shadow trigger
- Grid is fully replaced (no dual-mode fallback)
- Each card stores (x, y, z): absolute pixel offset from canvas origin + z-index
- Dropping a card makes it topmost (z = max + 1)
- Cancelling a drag returns card to pre-drag position
- Multi-card group drop: cards land maintaining relative positions, z-order preserved
- Dragged card renders at ~50% opacity so card below is visible
- Desktop: native scrollbars when canvas overflows viewport
- Mobile: edge arrow buttons (hold-to-scroll) replace scrollbar panning
- Draw/discard piles remain as fixed Pile objects anchored left of the canvas

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | free-drag-positioning | standard | Given cards with absolute (x,y,z) on a bounded div, when dragged with dnd-kit `useDraggable`, then they reposition freely on drop and revert on cancel | VALIDATED ✓ | dnd-kit, canvas, positioning |
| 002 | overlap-hit-testing | standard | Given overlapping cards at different z-indices, when clicking the visible portion of a lower card, then it is selected for drag; and at ~50% drag opacity the card below is visible enough to make drop decisions | VALIDATED ✓ | dnd-kit, overlap, ux |
| 003 | mobile-edge-pan | standard | Given overflow content on a touch device, when holding an edge arrow, then the viewport pans continuously without conflicting with one-finger card drag | VALIDATED ✓ | mobile, touch, scroll |
| 004 | multi-card-group-drop | standard | Given multiple selected cards dragged as a group, when dropped, then they land maintaining relative positions with z-order preserved above all existing cards | VALIDATED ✓ | dnd-kit, multi-select |
