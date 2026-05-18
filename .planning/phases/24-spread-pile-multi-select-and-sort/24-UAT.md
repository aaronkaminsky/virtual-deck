---
status: complete
phase: 24-spread-pile-multi-select-and-sort
source: [24-01-SUMMARY.md, 24-02-SUMMARY.md]
started: 2026-05-17T00:00:00Z
updated: 2026-05-17T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running PartyKit or Vite server. Start fresh with `npm run dev` (PartyKit) and `npm run dev:client` (Vite) in separate terminals. Both boot without errors. Open http://localhost:5173 — the board loads with no console errors.
result: pass

### 2. Play Area renders as a 2-row grid
expected: The communal "Play Area" zone no longer shows a horizontal spread/fan of cards — it renders as a 2×7 grid of rectangular cells (desktop) or 2×7 with smaller cells (mobile). Empty cells appear as dashed-border placeholders on a dark background.
result: issue
reported: "It does, but I want to change the layout details. There is too much space between each column, and the count badge at the moment is clipped by the row below it."
severity: minor

### 3. Drop a card from hand to a grid cell
expected: Drag a card from your hand and hover over the grid. The target cell's border turns gold/accent while hovering. On drop, the card appears inside that specific cell (not at the start of a list).
result: pass

### 4. Move a card between grid cells
expected: Drag the top card of a grid cell to another grid cell. The source cell shows a dashed placeholder while dragging. The hovered target cell highlights with an accent border. On drop, the card appears in the new cell; the source cell becomes empty.
result: pass

### 5. Drag a card from the grid back to hand
expected: Drag a card from a grid cell and drop it onto your hand. The card leaves the grid and appears in your hand. The grid cell it left becomes empty (no placeholder remains).
result: pass

### 6. Stack badge on multi-card cell
expected: Drop two or more cards onto the same grid cell (one at a time). The cell shows the top card plus a ×N badge (e.g. ×2) in the bottom-right corner of the card. The badge disappears when the stack returns to a single card.
result: pass

### 7. Multi-card drop to grid
expected: Select multiple cards in your hand (shift-click or existing multi-select gesture), then drag the selection to a grid cell. All selected cards land on that cell; the stack badge reflects the count.
result: pass

### 8. Face toggle flips all grid cards
expected: Click the Eye/EyeOff ghost button below the grid. All cards currently in the grid flip from face-down to face-up (or vice versa). Cards subsequently dealt to the grid respect the new orientation.
result: pass

### 9. RESET_TABLE clears the grid
expected: With one or more cards positioned in grid cells, trigger a table reset (e.g. via the Reset button or existing mechanism). All cards return to the draw pile; all grid cells become empty dashed placeholders.
result: pass

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Grid has fixed width based on card dimensions — does not stretch to fill horizontal space"
  status: failed
  reason: "User reported: layout stretches with the window; distance should be set instead of stretching to fill horizontal shape"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Grid scrolls horizontally on narrow viewports rather than overlapping or clipping"
  status: failed
  reason: "User reported: when window is too narrow, grid overlaps instead of scrolling"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Cards are centered within each grid cell"
  status: failed
  reason: "User reported: card is top-left instead of centered within each cell"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Stack count badge shows just a number (e.g. '2'), matching pile badge style — no '×' prefix"
  status: failed
  reason: "User reported: badge should just be the number, no 'x' in front — same style as pile badge, only for count > 1"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
