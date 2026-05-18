# Phase 24: Play Area Grid - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the communal spread zone (`id='play'`) from a horizontal scrollable card row into a 2-row fixed grid where cards snap to column positions and cells can hold stacked cards. Personal spread zones are unchanged — this phase only affects the communal zone.

</domain>

<decisions>
## Implementation Decisions

### Grid Layout
- **D-01:** 4 columns on mobile (<640px / `sm` breakpoint), 7 columns on desktop (sm+). Simple two-tier responsive breakpoint — no three-tier.
- **D-02:** Columns have no game-semantic meaning (not rank-indexed). Free-form positional use by players.
- **D-03:** Cells tile the entire grid area — no dead zones. At any point, if the pointer is over the grid, exactly one cell drop target is active and visually highlighted.

### Server State & Actions
- **D-04:** Grid positions stored as a position map on the communal pile: `gridPositions: Record<string, { row: number; col: number }>`. Cards remain in the flat `Pile.cards[]` array (unchanged). The map is additive — existing pile structure is not replaced.
- **D-05:** New server action `MOVE_GRID_CARD { cardId, pileId, toRow, toCol }` handles intra-grid moves. `REORDER_PILE_SPREAD` stays unchanged for personal spread zones. These are intentionally separate — unifying them would require retrofitting the sort pipeline and undo logic to use coordinates, adding complexity that only the grid needs.
- **D-06:** When a card arrives in the grid from outside (hand or pile), the existing `MOVE_CARD` or `PLAY_CARD_SET` action fires; the server assigns the card a grid position (the targeted cell) using the new `gridPositions` map.

### Drop Behavior (External → Grid)
- **D-07:** Each grid cell is a separate `useDroppable` target. As the player drags over the grid, the hovered cell highlights. The card lands in the cell the player releases over.
- **D-08:** Dropping onto an occupied cell stacks the card — no rejection. Per GRID-01, cells support multiple cards.
- **D-09:** No "snap to nearest cell" fallback needed — cells are sized and tiled so the full grid surface is covered by drop targets. If the pointer is over the grid, it is always over a cell.

### Stack Visualization & Interaction
- **D-10:** A stacked cell shows only the top card with a count badge (e.g. ×3) on the corner. Consistent with how PileZone shows card counts.
- **D-11:** Dragging from a stacked cell always picks up the top card only. No expand-and-pick interaction in this phase.
- **D-12:** Multi-card selection across grid cells is out of scope for this phase. Single-card moves only within the grid.

### Claude's Discretion
- Exact badge styling (position, color, size) — consistent with existing count badges in PileZone.
- How `gridPositions` is initialized for a card newly dropped into the grid via `MOVE_CARD` — server assigns it the targeted cell's coordinates.
- Whether `MOVE_GRID_CARD` enters the undo stack — standard behavior (yes, like all card moves).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 24 — Goal, success criteria, and GRID-01 requirement details
- `.planning/REQUIREMENTS.md` §GRID-01 — Locked requirement: "2-row fixed grid; cards snap to column positions; multiple cards can stack per cell; player can drag cards between cells"

### Existing Code to Read Before Planning
- `src/components/SpreadZone.tsx` — Current communal and personal spread implementation; will be split or extended for grid mode
- `src/components/BoardView.tsx` — Where communal zone (`id='play'`) is rendered; integration point for the new grid component
- `src/shared/types.ts` — `Pile`, `ClientPile`, `ClientAction` types; `gridPositions` and `MOVE_GRID_CARD` will be added here
- `party/index.ts` — PartyKit server; where `MOVE_GRID_CARD` handler must be added and `gridPositions` tracked in `GameState`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SpreadZone.tsx` — `SortableSpreadCard` and `SortableSentinel` patterns can inform cell-level card rendering; the face toggle and select-all button can be reused or adapted
- `PileZone.tsx` — Count badge pattern to reference for the stack count badge (D-10)
- `CardFace` / `CardBack` — Unchanged; render inside each cell

### Established Patterns
- `useDroppable` from `@dnd-kit/core` — used per-zone currently; will be used per-cell in the grid (each of the 2×N cells gets its own `useDroppable`)
- `useDndMonitor` — current intra-spread reorder detection; grid will use a similar monitor to detect intra-grid drops and fire `MOVE_GRID_CARD`
- `horizontalListSortingStrategy` — NOT reused for the grid; the grid needs cell-level drop targets, not a sortable list strategy
- Server action pattern: action dispatched → server mutates `GameState` → `STATE_UPDATE` broadcast to all clients — `MOVE_GRID_CARD` follows this same pattern

### Integration Points
- `BoardView.tsx` line 78–91: communal zone render site — new `GridZone` component (or extended `SpreadZone`) replaces the current `<SpreadZone ... className="w-full" />` for the communal pile only
- `src/shared/types.ts`: `Pile` and `ClientPile` interfaces need `gridPositions?: Record<string, { row: number; col: number }>` added
- `ClientAction` union in `types.ts`: add `| { type: "MOVE_GRID_CARD"; cardId: string; pileId: string; toRow: number; toCol: number }`
- PartyKit server `party/index.ts`: add `MOVE_GRID_CARD` handler that updates `gridPositions` on the target pile and broadcasts `STATE_UPDATE`

</code_context>

<specifics>
## Specific Ideas

- The grid and personal spreads intentionally use different data models and action types. Do not unify them — the sort pipeline for personal spreads (produces ordered arrays) would become significantly more complex if forced to work in coordinate space.
- Cells must tile the full grid with no gaps between drop zones. CSS grid layout with fixed cell dimensions is the expected approach — cells cover the full zone area, not just the card within them.

</specifics>

<deferred>
## Deferred Ideas

- Multi-card selection and group-drag within the grid — could reuse existing `selectedIds` multi-select if added in a future phase
- Expanding a stacked cell to inspect/pick a specific card from the middle of the stack
- Sorting the grid auto-arrangement (e.g. by rank or suit) — would require a bulk `SET_GRID_POSITIONS` action

</deferred>

---

*Phase: 24-spread-pile-multi-select-and-sort*
*Context gathered: 2026-05-17*
