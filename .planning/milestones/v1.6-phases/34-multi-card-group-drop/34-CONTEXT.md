# Phase 34: Multi-Card Group Drop - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can click-to-select multiple canvas cards (same ring/lift UX as hand and spread zones), drag any selected card to move the entire group, and drop the group onto the canvas preserving relative positions and z-order. Multi-card drops from hand or spread zone to canvas are also supported (single homogeneous source only — no mixing zones). If any card in the group would land outside canvas bounds, the entire drop is cancelled with silent snap-back.

**Requirements:** MULTI-01, MULTI-02, MULTI-03, MULTI-04

</domain>

<decisions>
## Implementation Decisions

### Canvas Selection State

- **D-01:** Canvas multi-select uses the existing `selectedIds`/`selectionSource` system in `BoardDragLayer`. `selectionSource` type is extended from `{ zone: 'hand' | 'pile'; zoneId: string }` to include `{ zone: 'canvas'; zoneId: 'canvas' }`. Zone-exclusive invariant is preserved — selecting a canvas card clears any hand/spread selection and vice versa.
- **D-02:** `selectionSource.zoneId` for canvas selection is the string literal `'canvas'`, matching the canvas droppable ID already registered in dnd-kit.
- **D-03:** When a canvas card drag starts (`onDragStart`) and `selectionSource` is currently a non-canvas zone, clear `selectedIds` and switch `selectionSource` to `{ zone: 'canvas', zoneId: 'canvas' }`. Drag start is the enforced cross-zone clearing point.

### Click Behavior

- **D-04:** Click behavior is toggle / add-to-group. Clicking an unselected canvas card adds it to the existing `selectedIds` set. Clicking a selected card removes it. Matches hand/spread zone behavior and Spike 004 implementation.
- **D-05:** Clicking empty canvas area (not on any card) deselects all — `selectedIds` is cleared, `selectionSource` returns to `null`. Implemented as `onClick` on the `CanvasZone` container div with a `stopPropagation` guard on individual card clicks.
- **D-06:** Selection clears on `onDragEnd` (after drop completes). Cards return to unselected state regardless of whether the drop succeeded or was cancelled.

### Server Action Design

- **D-07:** A new `GROUP_PLACE_ON_CANVAS` action is added to `ClientAction`. Single atomic message — not multiple `PLACE_ON_CANVAS` calls.
- **D-08:** Action shape: `{ type: 'GROUP_PLACE_ON_CANVAS'; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; cards: { cardId: string; x: number; y: number }[] }`. `fromId` is `'canvas'` for canvas-source drops, `playerId` for hand-source drops, `pileId` for spread-source drops.
- **D-09:** All three source paths ship in Phase 34: canvas→canvas group repositioning, hand→canvas multi-drop, spread→canvas multi-drop. Source must be homogeneous — no mixing zones in one group action.
- **D-10:** Server handler: takes one undo snapshot before processing. Removes all cards from the source zone atomically. Places them on `canvasCards` with z = maxZ+1..maxZ+N, assigning z values in ascending pre-drop z-order (lowest pre-drop z gets maxZ+1, preserving internal z-order within the group). Broadcasts single STATE_UPDATE.
- **D-11:** x/y per card for canvas→canvas drops: each moving card uses `card.x + delta.x, card.y + delta.y` (same delta applied to all, from dnd-kit `event.delta`). x/y per card for hand/spread→canvas drops: client computes DOM offsets at `onDragStart` by reading `getBoundingClientRect()` for each selected card and the drag handle card; stores `{cardId, offsetX, offsetY}` pairs in a ref; on `onDragEnd`, applies `{ x: dropHandleX + offsetX, y: dropHandleY + offsetY }` per card. Server receives only absolute (x, y) per card — no layout knowledge needed.
- **D-12:** Single undo step. `takeSnapshot` before `GROUP_PLACE_ON_CANVAS`. Pressing undo restores all N cards to their pre-drop positions in one operation.

### Bounds Validation (MULTI-04)

- **D-13:** Client-only pre-validation. `handleDragEnd` checks every card in the group against canvas bounds before dispatching. Bounds: `[0, canvasW - CARD_W] × [0, canvasH - CARD_H]` (same clamping dimensions as existing single-card PLACE_ON_CANVAS). If any card overflows, no action is dispatched. All cards snap back to pre-drag positions silently.
- **D-14:** All cards in the group are checked — including the drag handle card. No partial placement.
- **D-15:** Silent snap-back. No toast, no error highlight, no visual feedback on cancel. Consistent with existing `onDragCancel` behavior. The physics of the drop not landing communicates the outcome.

### Passenger Ghost Rendering (from Spike 004)

- **D-16:** DragOverlay renders only the drag handle card (at `opacity: 0.5, scale(1.05)` matching existing single-card DragOverlay). Passenger cards (other selected cards) are rendered as absolutely-positioned ghost divs with `pointerEvents: none` at `(card.x + delta.x, card.y + delta.y)` (or `offsetX/Y` positions for hand/spread sources). Passengers render at `opacity: 0.5` to match the handle ghost.
- **D-17:** Passenger ghosts are rendered inside `CanvasZone` (or as siblings) with `zIndex: 998` during drag. Source cards set `opacity: 0` while their ID is in the active drag group (same pattern as existing `isDragging ? 0 : 1` on `CanvasDraggableCard`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike Reference Implementation
- `src/spikes/Spike004MultiCardDrop.tsx` — validated multi-card group drop implementation: toggle selection via onClick, passenger ghost rendering, DragOverlay for handle only, group z-ordering (`maxZ + rank` pattern), selection clear on dragEnd, `PointerSensor` with `distance: 8` activation constraint. Extract patterns directly into production code.
- `.planning/spikes/004-multi-card-group-drop/README.md` — spike verdict (VALIDATED), key bugs found and fixed: `onClick` not `onPointerDown` for selection toggle (dnd-kit listener conflict); `distance: 8` constraint required (without it, plain clicks set isDragging)

### Requirements
- `.planning/REQUIREMENTS.md` — MULTI-01, MULTI-02, MULTI-03, MULTI-04 definitions and acceptance criteria
- `.planning/ROADMAP.md` — Phase 34 success criteria (4 criteria); Phase 35 for phase boundary awareness

### Production Canvas Code
- `src/components/CanvasZone.tsx` — renders all `CanvasDraggableCard`s; owns `coveringIds` useMemo; needs canvas background `onClick` for deselect-all (D-05); needs passenger ghost rendering during drag (D-16)
- `src/components/CanvasDraggableCard.tsx` — source card component; `handleClick` currently a no-op (Phase 32); needs selection toggle wiring (D-04); needs `isSelected` prop for ring/lift styling; needs `opacity: 0` when card is a passenger in active drag
- `src/components/BoardDragLayer.tsx` — owns `selectedIds`, `selectionSource`, `handleToggleSelect`; needs `selectionSource` type extended to include `'canvas'`; `handleDragEnd` needs GROUP_PLACE_ON_CANVAS dispatch path; `handleDragStart` needs cross-zone clear logic (D-03); needs DOM offset capture at drag start for hand/spread sources (D-11); needs bounds check before dispatch (D-13)

### Prior Phase Decisions
- `.planning/phases/32-canvas-core/32-CONTEXT.md` — D-12 (useDraggable only per card), D-13 (DragOverlay opacity/scale), D-15 (clamping formula), D-16 (PointerSensor distance:8), D-17 (MeasuringStrategy.Always)
- `.planning/phases/33-overlap-visibility/33-CONTEXT.md` — D-06 (drag-time shadow via ref, not state), D-07 (isDraggingActive prop not used for shadow)

### Shared Types
- `src/shared/types.ts` — `ClientAction` union needs `GROUP_PLACE_ON_CANVAS` added; `SelectionSource` type (if extracted) needs `'canvas'` zone
- `party/index.ts` — server handler for `GROUP_PLACE_ON_CANVAS` to be added; existing `PLACE_ON_CANVAS` handler for reference on atomicity pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/spikes/Spike004MultiCardDrop.tsx:57–75` — `DraggableCard` component: `didDragRef` + `onClick` pattern for click-vs-drag disambiguation; extract and apply to `CanvasDraggableCard`
- `src/spikes/Spike004MultiCardDrop.tsx:97–112` — `groupIds` useMemo, `coveringIds` useMemo, `dragOverlapsAnother` useMemo — all transplantable to `CanvasZone`/`BoardDragLayer`
- `src/spikes/Spike004MultiCardDrop.tsx:118–148` — `handleDragStart`, `handleDragMove`, `handleDragEnd` — group drag logic; `handleDragEnd` z-ordering pattern (`sort by pre-drag z → maxZ + rank`)
- `src/spikes/Spike004MultiCardDrop.tsx:163–180` — passenger ghost rendering: `passengerGhosts` useMemo + absolutely-positioned `pointerEvents: none` divs
- `src/components/BoardDragLayer.tsx` — `selectedIds`, `selectionSource`, `handleToggleSelect`, `handleSelectAll`; `handleDragEnd` branching on `event.over?.id`; `bufferRef`/`isDraggingRef` pattern
- `src/lib/canvas-utils.ts` — `coversMajority()`, `STACK_SHADOW`, `CARD_W`, `CARD_H` constants — reuse for bounds check (`CARD_W`, `CARD_H`) and shadow on selected cards

### Established Patterns
- `selectionSource` zone-exclusive convention (CLAUDE.md): selecting in one zone clears selection in others. Canvas selection extends this, not bypasses it.
- `isDraggingRef = useRef(false)` (not useState) for live value in WS closure — apply to any new drag tracking refs.
- `onClick` after `{...listeners}` spread in dnd-kit components — selection toggle must use `onClick`, not `onPointerDown` (Spike 004 confirmed this; same pattern as `aria-pressed` after attributes spread in CLAUDE.md).
- `PointerSensor` with `activationConstraint: { distance: 8 }` — already on DndContext; required for click-vs-drag disambiguation on canvas cards (confirmed by Spike 004).
- `bufferRef` pattern in `usePartySocket` — buffer incoming server updates during active drag, flush on dragEnd; applies to GROUP_PLACE_ON_CANVAS drag too.

### Integration Points
- `BoardDragLayer.tsx` `handleDragEnd` — add `GROUP_PLACE_ON_CANVAS` dispatch branch (when `selectionSource.zone === 'canvas'` OR hand/spread source with multiple selected cards targeting canvas); add bounds check pre-dispatch (D-13)
- `BoardDragLayer.tsx` `handleDragStart` — add DOM offset capture for hand/spread sources; store in ref for use in `handleDragEnd`
- `BoardDragLayer.tsx` `selectionSource` type — extend from `'hand' | 'pile'` to `'hand' | 'pile' | 'canvas'`
- `CanvasZone.tsx` — add canvas background `onClick` for deselect-all; add passenger ghost rendering block
- `CanvasDraggableCard.tsx` — add `isSelected` prop, ring/lift style (same as `DraggableCard.tsx`); wire `onToggleSelect` callback
- `party/index.ts` — add `GROUP_PLACE_ON_CANVAS` case in `onMessage`; atomic: remove from source, place all on canvasCards, single takeSnapshot, single broadcast
- `src/shared/types.ts` — add `GROUP_PLACE_ON_CANVAS` to `ClientAction` union

</code_context>

<specifics>
## Specific Ideas

- For the group z-assignment: sort moving cards by their pre-drag `z` ascending; assign `z = maxZ + 1 + rank` (where `rank` is position in sorted array). Preserves internal z-order within group, all above existing cards. Spike 004 `handleDragEnd` implements this exactly.
- Passenger ghost opacity should match the DragOverlay handle opacity (`0.5`) so the entire group appears at consistent translucency during drag.
- The `isSelected` ring style on canvas cards: `boxShadow: '0 0 0 2px #60a5fa, 0 0 0 4px rgba(96,165,250,0.3)'` combined with the existing `coversAnother ? STACK_SHADOW` (concatenated with comma, matching Spike 004 line ~83).
- For hand/spread→canvas DOM offset capture: `getBoundingClientRect()` on each selected card element at `onDragStart`. The drag handle rect center is the reference point; passenger offsets are `(passengerRect.left - handleRect.left, passengerRect.top - handleRect.top)`. On drop, `handleDropX = handleCanvasX + delta.x`, `passengerX = handleDropX + offsetX`. This mirrors what dnd-kit would naturally do for the handle card itself.
- `stopPropagation` on `CanvasDraggableCard` click is required so canvas background `onClick` doesn't fire when clicking a card (deselect-all must not trigger on card clicks).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 34-Multi-Card Group Drop*
*Context gathered: 2026-05-25*
