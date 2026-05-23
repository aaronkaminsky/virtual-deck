# 999.37 — Free Canvas Play Area: Design Decisions

Captured from design discussion 2026-05-22. Ready to spike.

## Decision: Replace the grid

The current 2-row fixed grid (Phase 24) is replaced entirely. No dual-mode or fallback grid option. The communal spread zone becomes a free canvas.

## Decision: Cards as the unit of positioning

Each card stores its own `(x, y, z)` coordinates on the canvas. Piles are not the positioning unit. The pile abstraction is not used in the canvas zone — cards exist as individual entities.

- **x, y**: absolute pixel offset from canvas origin
- **z**: monotonically incrementing integer (draw pile on top = highest z on drop)

## Decision: Canvas layout

The play area occupies the full rectangle between the opponent zone and the player zone. The draw pile and discard pile are fixed on the **left side of the canvas**, vertically aligned. The free canvas area is the remaining space to their right.

## Decision: Drop behavior

- Dropping a card assigns it `z = max(all z) + 1` — it becomes topmost.
- Dropping a multi-card selection: cards land maintaining their relative `(x, y)` positions; z-order within the group is preserved; the whole group lands above all existing cards.
- Cancelling a drag returns the card(s) to their pre-drag position.

## Decision: Drag visibility

While dragging, the card being moved renders semi-transparent (target: ~50% opacity, tune in spike) so the card immediately below it is visible. This helps players decide where to drop.

## Decision: Click-to-grab on overlapping cards

Clicking the visible (unobscured) portion of a card selects it for dragging. This falls out of standard DOM z-index + pointer-events — no special hit-testing logic needed.

## Decision: Overflow and viewport navigation

When card positions exceed the visible canvas area:

**Desktop**: native scrollbars appear on the scroll container. Mouse wheel and scrollbar drag work as expected.

**Mobile**: edge arrow buttons (`>`, `<`, `v`, `^`) appear on whichever edges have overflow. Behavior:
- Arrows are only shown when that edge has overflow content
- Touch/hold triggers continuous scroll (setInterval on pointerdown, clearInterval on pointerup)
- One-finger drag remains for moving cards — no conflict with panning

## Decision: Compact button

A button (location TBD — probably top-right of canvas) that repositions all cards into the visible area:
- Preserves z-order (depth)
- Targets minimal collisions (v1: simple grid-pack; can be improved later)
- Useful after resize or when cards are scattered off-screen

## Open questions (for spike to answer)

1. **Exact drag opacity** — 40–60% range; tune visually in prototype
2. **Compact algorithm** — grid-pack v1 is likely fine; confirm it looks reasonable
3. **Auto-pan during drag** — when dragging near an edge, should the viewport pan automatically? Flagged as nice-to-have; out of scope for spike but architecture should not preclude it

## Spike goals

A local-state-only prototype (no server persistence) that validates:
1. Free-drag card to arbitrary (x, y); drop makes it topmost; cancel reverts
2. Overlap feel — semi-transparent drag, click visible portion of lower card
3. Multi-card group drop maintaining relative positions and z-order
4. Mobile edge arrows with hold-to-scroll
5. Desktop scrollbars on overflow canvas
