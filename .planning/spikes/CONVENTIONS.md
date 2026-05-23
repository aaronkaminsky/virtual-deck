# Spike Conventions

Patterns established across the free canvas spike session. New spikes follow these unless the question requires otherwise.

## Stack

React 18 + TypeScript + Vite — same as the main app. Spikes live as separate HTML entry points (`spike-NNN.html`) served by the existing Vite dev server at `/virtual-deck/spike-NNN.html`.

## Structure

- `spike-NNN.html` — entry HTML at project root
- `src/spikes/spike-NNN-main.tsx` — React root mount
- `src/spikes/SpikeNNNDescriptiveName.tsx` — demo component
- `.planning/spikes/NNN-descriptive-name/README.md` — findings

## Patterns

**Card positioning:** Each canvas card stores `{ x, y, z }` — absolute pixel offset from canvas origin + monotonically increasing z-index. Drop sets `z = max(all z) + 1`.

**Free drag:** `useDraggable` only — no `useDroppable`, no collision detection, no sortable strategy. Apply `event.delta` to stored position on `onDragEnd`. Cancel does nothing (state unchanged, transform resets).

**Click + drag on same element:** Always use `PointerSensor` with `activationConstraint: { distance: 8 }`. Without this, `isDragging` fires on plain clicks and breaks click handlers. Use `onClick` (not `onPointerDown`) for click actions — `onClick` doesn't conflict with dnd-kit's `onPointerDown` in `{...listeners}`.

**Click-vs-drag guard:** Mirror `src/components/DraggableCard.tsx` pattern — `useEffect` watching `isDragging` sets `didDragRef.current = true`; `onClick` checks the ref and skips if true; 300ms timeout clears ref after drag ends.

**Drag visibility:** Source card `opacity: 0` while dragging. `DragOverlay` at `opacity: 0.5, scale(1.05)` with `dropAnimation={null}`. Multi-card: passenger cards rendered as `pointerEvents: none` absolute divs at `card.x + delta.x/y`; DragOverlay shows only the handle card.

**Stack shadow:** Single layer `box-shadow: 2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db` on the top card only when it covers >50% of a lower-z card's area (`coversMajority()`). Same shadow applied to DragOverlay via `onDragMove` delta tracking.

**Canvas panning (mobile):** CSS `transform: translate(-scrollX, -scrollY)` on a fixed-size canvas div inside a clipping viewport — avoids scroll container conflicts with dnd-kit pointer capture. Edge arrows use `onPointerDown` + `stopPropagation` + `setInterval` at 8px/16ms. Arrow glyph: use `‹` for all four directions and rotate (`0°` left, `180°` right, `90°` up, `270°` down).

**Performance note:** `dragDelta` in state causes re-renders on every `pointermove`. Fine for spikes; in production use a ref for delta and only setState for coarse booleans (e.g., `dragOverlapsAnother`).

## Tools & Libraries

- `@dnd-kit/core ^6.3.1` — `useDraggable`, `DragOverlay`, `PointerSensor`, `MeasuringStrategy.Always`
- `@dnd-kit/sortable` — not used in free canvas zone
- Tailwind 4 + existing `CardFace`/`CardBack` components — reused directly
