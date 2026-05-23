---
spike: "003"
name: mobile-edge-pan
type: standard
validates: "Given overflow content on a touch device, when holding an edge arrow, then the viewport pans continuously without conflicting with one-finger card drag"
verdict: PENDING
related: ["001-free-drag-positioning"]
tags: [mobile, touch, scroll, pan]
---

# Spike 003: Mobile Edge Pan

## What This Validates

Edge arrow buttons appear on whichever edges have overflow content. Holding (pointerdown) triggers continuous panning via `setInterval`; releasing (pointerup/pointerleave) stops it. One-finger card drag must not conflict.

Key risk: dnd-kit uses `setPointerCapture` on drag start, which could steal pointer events away from the edge arrow's `pointerup` listener mid-pan. The arrows use `stopPropagation` on `pointerdown` so dnd-kit never sees that event.

## How to Run

```
npm run dev:client
```
Open: **http://localhost:5173/virtual-deck/spike-003.html**

Canvas is 1400×700px inside an 800×400px viewport — cards deliberately placed off all four edges.

## What to Expect

- Right and bottom arrows visible on load (overflow exists); left and top arrows appear after panning
- Hold right/down arrow → viewport pans smoothly and continuously
- Release → panning stops immediately
- Drag a card normally → no interference with edge arrows
- Scroll position shown below the canvas

## Investigation Trail

- Canvas panned via CSS `transform: translate(-scrollX, -scrollY)` rather than native scroll — avoids scroll container interfering with dnd-kit's pointer capture
- Edge arrows use `onPointerDown` + `onPointerUp/Leave` with `stopPropagation` to isolate from dnd-kit
- `setInterval` at 16ms (~60fps) with `PAN_STEP = 12px` per tick

## Results

VALIDATED. Hold-to-pan works without conflicting with card drag.

**Tuning notes:**
- `PAN_STEP = 8px` at 16ms interval feels right (12px was slightly too fast)
- Arrow glyph bug fixed: use `‹` as base for all four directions and rotate — mixing `‹`/`›` as base then rotating doubles the flip on right/down

**For the real build:**
- CSS `transform: translate()` panning works cleanly with dnd-kit (no scroll container conflict)
- `stopPropagation` on arrow `pointerdown` is essential — prevents dnd-kit from treating the arrow press as a drag start
- Arrow visibility driven by `scrollX > 0`, `scrollX < canvasW - viewportW`, etc. — simple and correct
