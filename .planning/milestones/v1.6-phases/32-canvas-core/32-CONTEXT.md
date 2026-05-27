# Phase 32: Canvas Core - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Server x/y/z model for canvas cards, free drag-to-position on canvas, cancel-reverts, z-ordering on drop, and the no-card-loss guarantee. This is the foundational canvas data model and interaction layer — all other canvas phases (overlap, multi-select, mobile) depend on it being correct.

**Requirements:** CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, NOLOSS-01

</domain>

<decisions>
## Implementation Decisions

### Canvas Data Model

- **D-01:** Add `canvasCards: CanvasCard[]` as a new top-level field on `GameState` (not a Pile extension). Canvas cards are semantically distinct from piles — they have absolute position, not ordered index.
- **D-02:** `CanvasCard` shape: `{ card: Card; x: number; y: number; z: number }`. The card's existing `id` (`card.id`) is the key — no separate canvas slot id needed.
- **D-03:** Add a server-internal `findCard(state, cardId)` helper that searches `hands` + `piles` + `canvasCards` and returns a discriminated union `CardLocation`. Encapsulates cross-container lookup for handlers (flip, move, no-loss guard). This is a server-internal type, not on the wire.
- **D-04:** `ClientGameState` gets a corresponding `canvasCards: ClientCanvasCard[]` field. `viewFor()` must include canvas cards in the broadcast (canvas is always face-up/visible to all players — no masking needed).

### Action API

- **D-05:** Add a new `PLACE_ON_CANVAS` action to `ClientAction`: `{ type: 'PLACE_ON_CANVAS'; cardId: string; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; x: number; y: number }`. Handles both hand→canvas and canvas→canvas repositioning in one action type.
- **D-06:** `MOVE_CARD` is unchanged — it continues to handle all non-canvas moves. Canvas→pile drops (NOLOSS path to a valid zone) use a regular `MOVE_CARD` with the pile as destination, plus the insert-position dialog.
- **D-07:** Server handler for `PLACE_ON_CANVAS`: removes card from source (hand/pile/canvasCards), adds it to `canvasCards` at (x, y, z = max existing z + 1). Takes undo snapshot before mutation.

### Drop Collision Detection

- **D-08:** Register the canvas div as an explicit `useDroppable` with `id='canvas'`. Add canvas to `customCollision` as the last fallback after hand and pile checks — use `pointerWithin` against canvas containers. `event.over.id === 'canvas'` in `handleDragEnd` triggers `PLACE_ON_CANVAS`.
- **D-09:** `event.over === null` means truly missed drop (pointer outside canvas and all valid zones). For canvas cards, this means no action is sent — server state unchanged, card stays at its original canvas position. NOLOSS-01 is satisfied automatically by this no-op.
- **D-10:** For hand/pile cards dropped on `null`: existing behavior unchanged (no action sent, card stays in hand/pile).

### Canvas-to-Pile Drop

- **D-11:** When a canvas card is dragged onto draw or discard pile, show the same top/bottom/random insert dialog as hand→pile drops. Consistent UX, no special-casing. Uses `MOVE_CARD` with `fromZone: 'canvas'` (extending the union to include `'canvas'`) after dialog confirmation.

### Carry-Forward from Spikes

- **D-12:** Free drag uses `useDraggable` only — no `useDroppable` on canvas cards themselves, no collision detection on card-to-card. `event.delta` applied to stored (x, y) on `onDragEnd`.
- **D-13:** Source card `opacity: 0` while dragging. `DragOverlay` at `opacity: 0.5, scale(1.05)` with `dropAnimation={null}`.
- **D-14:** Cancel (`onDragCancel`) does nothing — state unchanged, transform resets to null. Card reverts to original position automatically.
- **D-15:** Drop position clamped to canvas bounds: `newX = clamp(x + delta.x, 0, canvasW - CARD_W)`, same for Y. Canvas dimensions from element ref.
- **D-16:** `PointerSensor` with `activationConstraint: { distance: 8 }` — prevents `isDragging` from firing on clicks.
- **D-17:** `MeasuringStrategy.Always` on `DndContext` — required per CLAUDE.md convention after DOM restructure.

### Out of Scope for Phase 32

- Stack shadow (OVERLAP-03) — Phase 33
- Overlap hit-testing / topmost card pointer events (OVERLAP-01, 02) — Phase 33
- Multi-card group drop (MULTI-01–04) — Phase 34
- Mobile edge-pan (MOBILE-01–03) — Phase 35
- Face-flip for canvas cards — not in requirements; defer if needed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.6 requirements; CANVAS-01–04 and NOLOSS-01 are the scope for this phase
- `.planning/ROADMAP.md` — Phase 32 success criteria (5 criteria); Phase 33–35 for phase boundary awareness

### Spike Findings
- `.planning/spikes/001-free-drag-positioning/README.md` — validated approach: `useDraggable` + `event.delta`, cancel behavior, z-ordering, drag opacity, position clamping
- `.planning/spikes/CONVENTIONS.md` — established patterns: card positioning, free drag, click-vs-drag guard, drag visibility, stack shadow (phase 33), canvas panning (phase 35)

### Existing Code
- `src/shared/types.ts` — current `GameState`, `ClientGameState`, `Card`, `Pile`, `ClientAction` — this phase adds `canvasCards` field and `PLACE_ON_CANVAS` action
- `src/components/BoardDragLayer.tsx` — `customCollision` function where canvas droppable check is added; `handleDragEnd` where `PLACE_ON_CANVAS` dispatch goes
- `src/components/BoardView.tsx` — `data-testid="canvas-shell"` div (line 90) is the canvas element; `CanvasZone` component will replace or wrap this div
- `party/index.ts` — server handlers; `viewFor()` function where `canvasCards` broadcast is added; `takeSnapshot()` for undo

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/DraggableCard.tsx` — existing draggable card component; may need a `CanvasDraggableCard` variant that uses `useDraggable` (not `useSortable`) and carries `fromZone: 'canvas'` in drag data
- `src/components/CardFace.tsx` / `CardBack.tsx` — render-only card face components; reuse directly inside canvas card component
- `src/components/CardOverlay.tsx` — used in `DragOverlay`; reuse for canvas drag overlay at 50% opacity
- `party/index.ts` `takeSnapshot()`, `viewFor()`, `shuffle()` — reuse as-is; only additive changes needed

### Established Patterns
- `data.current = { card, fromZone, fromId }` on draggable elements — BoardDragLayer reads this in `handleDragStart`; canvas cards must follow the same pattern with `fromZone: 'canvas'`
- `bufferRef` / `isDraggingRef` pattern in `usePartySocket` — buffer incoming server updates during drag, flush on dragEnd; canvas position updates from server during drag should be buffered the same way
- `fromZone: 'hand' | 'pile'` on `MOVE_CARD` — needs `'canvas'` added to the union for canvas→pile drops
- `pointerWithin` for zone droppables (hand, pile) in `customCollision` — same approach for canvas droppable

### Integration Points
- `customCollision` in `BoardDragLayer.tsx` — add canvas droppable check as final fallback (after hand and pile checks return empty)
- `handleDragEnd` in `BoardDragLayer.tsx` — add `event.over?.id === 'canvas'` branch to dispatch `PLACE_ON_CANVAS`
- `BoardView.tsx` canvas-shell div — needs `useDroppable({ id: 'canvas' })` wired in (or extracted to a `CanvasZone` component)
- `party/index.ts` `onMessage` handler — add `PLACE_ON_CANVAS` case; extend `MOVE_CARD` to handle `fromZone: 'canvas'`
- `viewFor()` in `party/index.ts` — add `canvasCards` to the returned `ClientGameState`

</code_context>

<specifics>
## Specific Ideas

- `CardLocation` discriminated union (server-internal, not on wire): `{ type: 'hand'; playerId: string } | { type: 'pile'; pileId: string; index: number } | { type: 'canvas'; index: number }` — used by `findCard()` helper
- The user explored whether a base `CardPlacement` type could unify actions (flip, hover, select, drag) across zones. Conclusion: hover/select/drag are client-only UI state and don't need a shared type. Flip on canvas is out of scope for phase 32. `findCard()` handles the server-side lookup without needing the placement type on the wire.

</specifics>

<deferred>
## Deferred Ideas

- **Stack shadow** (OVERLAP-03): validated in spike 001 (`coversMajority()` + `coveringIds` set + `onDragMove` delta tracking); port to Phase 33, not here
- **`CardPlacement` on the wire**: considered as a way to unify cross-zone actions; deferred — not needed for phase 32 scope, revisit when flip/pass actions need to reach canvas cards

</deferred>

---

*Phase: 32-Canvas Core*
*Context gathered: 2026-05-24*
