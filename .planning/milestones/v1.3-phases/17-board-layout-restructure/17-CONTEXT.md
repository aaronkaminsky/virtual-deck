# Phase 17: Board Layout Restructure - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the BoardView layout so the communal zone reads as the visual center of a shared physical space. New section order locked in discussion. Vertical proportions must fit 1080p without scrolling. Resolve dnd-kit ID collision in SpreadZone as prerequisite for Phase 20 multi-select. No new interactions introduced — drag behavior preserved exactly.

**Requirements in scope:** LAYOUT-01, LAYOUT-02, SPREAD-04
**Out of scope:** Controls collapse (Phase 18), responsive/phone layout (Phase 19), spread zone multi-select (Phase 20), spread zone reorder verification (Phase 21)

</domain>

<decisions>
## Implementation Decisions

### Board Section Structure
- **D-01:** New vertical order (top → bottom): `[header: copy link + controls]` → `[opponents row: hands + spreads]` → `[center row: piles flanking communal zone]` → `[player spread zone]` → `[player hand zone]`. Five distinct horizontal bands.
- **D-02:** Center row arrangement: draw pile(s) on the left, communal zone centered in the middle taking the majority of the row's width. Communal zone is visually dominant — it is the centerpiece.
- **D-03:** Player bottom: personal spread zone is a separate horizontal band stacked directly above the hand zone. Two distinct rows, not side by side.
- **D-04:** Controls (ControlsBar + Copy Link button) stay in the existing header bar — Phase 17 does not move them. Phase 18 handles controls collapse.

### Opponent Spread Placement
- **D-05:** Each opponent is rendered as a vertical column in the opponents row: hand count/label on top, their personal spread zone below. Mirrors the player's own layout (spread above hand) at the top of the board.
- **D-06:** Opponent spread zones remain fully interactive — any player can drag cards to/from them. No behavior change from current.

### ID Collision Fix (SPREAD-04)
- **D-07:** Remove `DraggableCard` from inside `SortableSpreadCard`. Render `CardFace`/`CardBack` directly in `SortableSpreadCard`, mirroring the `HandZone`/`SortableHandCard` pattern exactly. One dnd-kit ID per card.
- **D-08:** The existing `useSortable` data — `{ card, fromZone: 'pile', fromId: pileId, toZone: 'pile', toId: pileId }` — is sufficient to route all drag events (sort within zone, drag out to hand/pile/other zone). No additional data wiring needed.
- **D-09:** `DraggableCard` had no `onFlip` prop wired in spread zones, so inline rendering loses nothing. The flip toggle is at the pile level (`handleToggleFace` in SpreadZone), not per-card.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 17 — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — LAYOUT-01, LAYOUT-02, SPREAD-04 acceptance criteria

### Current Layout to Restructure
- `src/components/BoardView.tsx` — current 5-section layout; all changes are here
- `src/components/HandZone.tsx` — the `SortableHandCard` inline pattern (no nested draggable); **use this as the exact model for the fixed `SortableSpreadCard`**
- `src/components/SpreadZone.tsx` — `SortableSpreadCard` + `DraggableCard` nesting to untangle
- `src/components/DraggableCard.tsx` — being removed from spread zone context (keep for `HandZone` usage from other callers)

### Drop Routing (verify useSortable data is sufficient)
- `src/components/BoardDragLayer.tsx` — reads `active.data.current` to route drops; confirm `fromZone: 'pile'` from useSortable data is handled
- `src/components/PileZone.tsx` — drop target; confirm it reads `fromZone` from sortable data correctly

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HandZone.tsx / SortableHandCard`: Exact pattern to follow for fixed `SortableSpreadCard` — useSortable + direct CardFace/CardBack render, click handler with `didDragRef` pattern for drag-vs-click disambiguation
- `SpreadZone.tsx / SpreadZone component`: Keep structure; only change is removing `DraggableCard` from `SortableSpreadCard` internals
- `BoardView.tsx`: All layout restructure happens in this single file — no new components needed for the layout change itself

### Established Patterns
- `SortableHandCard` does not nest a useDraggable — useSortable alone is sufficient for both sort and drag-out. Apply this to spread cards.
- Each opponent is rendered via `Object.entries(gameState.opponentHandCounts)` in BoardView — the opponent column structure (hand + spread) extends this map
- `mySpreadZone` and `communalZone` are already isolated by filter in BoardView (`p.id === 'play'` for communal; `p.id === gameState.myPlayZoneId` for personal)

### Integration Points
- `BoardView.tsx` is the only file that needs structural changes for LAYOUT-01 and LAYOUT-02
- `SpreadZone.tsx` needs the `SortableSpreadCard` internal change for SPREAD-04
- No PartyKit server changes — layout is client-only

</code_context>

<specifics>
## Specific Ideas

- The communal zone should be the visually dominant element in the center row — larger than the pile zones flanking it. Researcher should look at how to give it `flex-1` or a meaningful `min-width` so it reads as the "table center."
- Researcher should verify that `BoardDragLayer.tsx` and `PileZone.tsx` read `fromZone` from `active.data.current` in a way that already handles sortable data — this is the key assumption behind D-08.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-board-layout-restructure*
*Context gathered: 2026-05-01*
