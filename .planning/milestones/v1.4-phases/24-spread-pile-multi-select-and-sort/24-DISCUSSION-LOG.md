# Phase 24: Play Area Grid - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 24-spread-pile-multi-select-and-sort
**Areas discussed:** Column count, Position model, External drop targeting, Stack look & interaction

---

## Column count

| Option | Description | Selected |
|--------|-------------|----------|
| 13 columns (one per rank) | A–K columns; rank-semantic meaning; needs horizontal scroll on small screens | |
| Fixed arbitrary count | No game-semantic meaning; simpler implementation | ✓ |
| Dynamic (fills width) | Columns resize to fill zone; harder to implement predictably | |

**User's choice:** Fixed arbitrary count — 7 on desktop, 4 on mobile

| Breakpoint question | Options | Selected |
|--------------------|---------|----------|
| Fixed 7 everywhere | Same column count on all screens | |
| Responsive | 4 on mobile (<640px), 7 on desktop (sm+) | ✓ |

**Notes:** User specified "as few as 4-5 on mobile, more on large." Settled on 4/7 two-tier (phone vs. everything else) for simplicity.

---

## Position model

| Option | Description | Selected |
|--------|-------------|----------|
| Position map on the Pile | `gridPositions: Record<string, {row, col}>` added to Pile; cards[] stays flat | ✓ |
| Flat array with encoding | Derive (row, col) from array index; fragile with stacks and gaps | |
| 2D cell structure | Replace `cards[]` with `cells[][]`; breaks existing flat-array conventions | |

**User's choice:** Position map on the Pile

**Key discussion — unified model vs separate actions:**
User proposed treating personal spreads as a 1-row grid (unified model), which would reduce action types and share code. After discussion of pros/cons:

- *Pro unified:* single action covers both reorder and grid moves; consistent position model; future-proof
- *Con unified:* sort pipeline (which produces ordered arrays) would need to work in coordinate space; undo logic more complex; dnd-kit drag strategies genuinely differ for 1D vs 2D; retrofitting working code for a payoff only needed in the grid case

**Decision:** Separate actions. `REORDER_PILE_SPREAD` stays for personal spreads; new `MOVE_GRID_CARD { cardId, pileId, toRow, toCol }` for communal grid. No structural barriers to future unification if desired.

---

## External drop targeting

| Option | Description | Selected |
|--------|-------------|----------|
| Cell-level hover targeting | Each cell is a separate drop target; highlighted on hover; card lands where released | ✓ |
| Next empty cell (auto-assign) | Card goes to first available empty cell; no cell targeting | |
| Drop-on-grid then pick-a-cell dialog | Modal step after drop — consistent with pile UX but jarring mid-drag | |

**Occupied cell behavior:**

| Option | Description | Selected |
|--------|-------------|----------|
| Stack on the cell | Card added to existing cell stack; no rejection | ✓ |
| Reject the drop | Occupied cells refuse incoming cards | |

**Dead zone handling:**
User clarified: cells should tile the entire grid surface. No gaps between drop zones — if the pointer is over the grid, exactly one cell is always active and highlighted.

---

## Stack look & interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Top card + count badge | Only top card visible; small badge (e.g. ×3) in corner | ✓ |
| Fanned/offset stack | Cards slightly offset to show depth; more space needed | |
| Top card only, no badge | No visual distinction for stacks — violates GRID-01 | |

**Which card on drag-out:**

| Option | Description | Selected |
|--------|-------------|----------|
| Top card only | Always picks up topmost card; consistent with pile draw | ✓ |
| Click to expand, then pick | Expand the cell to pick a specific card | |

**Multi-select within grid:**

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope for this phase | Single-card moves only in Phase 24 | ✓ |
| Reuse existing multi-select | Extend selectedIds to grid cells | |

---

## Claude's Discretion

- Exact badge styling (position, color, size) — consistent with existing count badges in PileZone
- How `gridPositions` is initialized when a card first enters the grid via `MOVE_CARD`
- Whether `MOVE_GRID_CARD` enters the undo stack (standard: yes)

## Deferred Ideas

- Multi-card selection and group-drag within the grid
- Expand-and-pick interaction for inspecting cards in a stacked cell
- Auto-arrange grid by rank/suit (would need a bulk `SET_GRID_POSITIONS` action)
