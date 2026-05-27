# Phase 33: Overlap & Visibility - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

When cards overlap on the canvas, the visually topmost card receives all pointer events, the dragged card ghost renders at ~50% opacity so cards beneath it are visible, and a box-shadow indicator appears on the covering (top) card when it covers >50% of a card below.

OVERLAP-02 is already implemented from Phase 32 (DragOverlay at 0.5 opacity + scale 1.05, D-13). Phase 33 work is OVERLAP-01 and OVERLAP-03.

</domain>

<decisions>
## Implementation Decisions

### Hit-Testing (OVERLAP-01)
- **D-01:** Trust natural CSS z-index routing for pointer event delivery. Cards render at `zIndex: canvasCard.z`; the browser routes pointer events to the topmost element at any pointer position. No `pointer-events: none` manipulation needed. OVERLAP-01 is effectively free from the Phase 32 z-ordering — verify it works, then ship.

### Stack Shadow (OVERLAP-03)
- **D-02:** Shadow goes on the **covering (top) card** — the card whose position covers >50% of a lower card. Matches Spike002 implementation. Shadow CSS: `'2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db'`.
- **D-03:** Shadow threshold: covering card's overlap area with a lower card exceeds 50% of `CARD_W * CARD_H`. Formula: `overlapW * overlapH > CARD_W * CARD_H * 0.5`. Applies to each (covering, covered) pair independently.
- **D-04:** Static shadow (at-rest cards): computed via `useMemo` over `canvasCards` in `CanvasZone` or `BoardDragLayer`. Returns a `Set<string>` of card IDs that are covering another card. Passed as a prop to `CanvasDraggableCard`.
- **D-05:** Drag-time shadow: the DragOverlay ghost also shows the shadow when its current position would cover >50% of any canvas card. The covering check runs in the `onDragMove` handler in `BoardDragLayer` — the natural place for drag-position tracking.
- **D-06:** Drag-time shadow uses a ref to avoid per-pointermove re-renders. `dragDeltaRef = useRef({x: 0, y: 0})` tracks current delta; a single `coversSomeCard` boolean in state (or a minimal ref+boolean pair) triggers the re-render only when the shadow state changes (boolean flip), not on every move event. Pattern matches spike manifest: "track dragDelta in a ref; only setState for the boolean shadow trigger."
- **D-07:** `CanvasDraggableCard.isDraggingActive` prop (already reserved and wired in `CanvasZone`) is NOT used for the shadow in Phase 33. The shadow state flows from the static `coversIds` set computed in the parent — simpler prop-threading than tracking per-card active drag state.

### Drag Opacity (OVERLAP-02)
- **D-08:** Already complete from Phase 32 (D-13). `DragOverlay` in `BoardDragLayer` renders at `opacity: 0.5, transform: 'scale(1.05)'`. No changes needed for OVERLAP-02 in Phase 33.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike Reference Implementation
- `src/spikes/Spike002OverlapHitTesting.tsx` — validated overlap hit-testing implementation; contains `coversMajority()` function, shadow CSS constant, drag delta tracking pattern, DragOverlay shadow wiring. Extract directly into production code.
- `.planning/spikes/MANIFEST.md` — spike 002 verdict (VALIDATED), stack shadow spec: shadow on covering card; ref-based drag tracking; `>50%` threshold

### Requirements
- `.planning/REQUIREMENTS.md` — OVERLAP-01, OVERLAP-02, OVERLAP-03 definitions and acceptance criteria

### Production Canvas Code
- `src/components/CanvasDraggableCard.tsx` — source card component; `isDraggingActive` prop reserved; `opacity: isDragging ? 0 : 1` already set; shadow prop will be added here
- `src/components/CanvasZone.tsx` — renders all `CanvasDraggableCard`s; owns the `coversIds` useMemo computation
- `src/components/BoardDragLayer.tsx` — DragOverlay location (line ~418); `onDragMove` handler (currently a no-op for canvas); drag-time shadow boolean state lives here

### Prior Phase Decisions
- `src/components/BoardDragLayer.tsx` comment D-13 (line ~419) — DragOverlay already at 0.5 opacity; Phase 33 adds conditional `boxShadow` to the same div

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Spike002OverlapHitTesting.tsx:49–53` — `coversMajority(top, bottom)` function: ready to extract as a utility. Takes `{x, y}` for the top position and a `CanvasCard`-shaped object for the bottom; returns `overlapW * overlapH > CARD_W * CARD_H * 0.5`.
- `Spike002OverlapHitTesting.tsx:47` — `STACK_SHADOW` constant: `'2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db'`. Extract to shared constants or keep co-located.
- `Spike002OverlapHitTesting.tsx:90–98` — `coveringIds` useMemo pattern: iterate cards, find pairs where `z_top > z_bottom && coversMajority(top.pos, bottom)`, add top card ID to a Set. Directly transplantable.

### Established Patterns
- `CanvasDraggableCard.tsx:39–47` — card style object pattern: `position: absolute, left: x, top: y, zIndex: z`. Add `boxShadow: coversAnother ? STACK_SHADOW : undefined` here.
- `BoardDragLayer.tsx:84` — `activeCard` state exists; drag tracking pattern established. `onDragMove` is imported from dnd-kit but currently unused for canvas — that's the extension point.
- CLAUDE.md convention: `isDraggingRef = useRef(false)` pattern for live values in WS closure. Same pattern applies here for `dragDeltaRef`.

### Integration Points
- `CanvasZone.tsx` renders all `CanvasDraggableCard`s and owns `canvasCards` prop — correct place for the static `coversIds` useMemo.
- `BoardDragLayer.tsx` `onDragMove` handler — extend for drag-time shadow boolean. Passes `dragCoversSomeCard` boolean down to DragOverlay render block.
- `BoardDragLayer.tsx` DragOverlay block (~line 418) — add `boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined` to the existing `style={{ opacity: 0.5, transform: 'scale(1.05)' }}` div.

</code_context>

<specifics>
## Specific Ideas

- Shadow style is validated from the spike: `'2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db'` — white inner highlight + gray outer border creates a convincing "floating paper" effect against the dark felt.
- `borderRadius: 6` should accompany the shadow on the covering card (matches spike styling; prevents shadow from bleeding outside card corners).
- The drag-time shadow check should use the stored `canvasCard.x/y` for non-dragged cards and `(activeCard.x + delta.x, activeCard.y + delta.y)` for the dragged card position. The dragged card itself is excluded from the `coversAnother` check during drag (it's in the DragOverlay, not positioned absolutely).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 33-Overlap & Visibility*
*Context gathered: 2026-05-24*
