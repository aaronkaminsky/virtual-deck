# Runtime Piles (1031) — Design

Stack loose canvas cards into a real pile — with face, shuffle, and insert semantics — and break a pile back into loose cards. Covers trick piles, split decks, and side stacks that today stay as loose-card clutter. From the physical deck gap review (999.27, gap A2).

## Decisions (from brainstorming)

- Runtime piles live **on the canvas** at an x/y position, draggable as a unit — matching the physical metaphor (trick pile in front of you, war deck on the table).
- Creation: explicit **Stack button** on a multi-card canvas selection; once a pile exists, dropping cards onto it adds to it via the existing pile-drop path. No drag-card-onto-card auto-stacking (accidental stacks would fight the free-overlap canvas).
- Dissolution: **Unstack button** fans the pile back into loose canvas cards near its position. A pile whose last card is removed is **auto-deleted** — a zero-card stack isn't a thing on a real table.
- Privacy: canvas piles get the **same server-side masking as column piles** — only the top card's identity is sent; buried face-down cards are masked for all players.
- Whole-pile drag: reposition on canvas **and** drop onto other zones (pile, spread, own hand) to move all its cards there.

## Architecture: extend `Pile`, no parallel collection

A runtime pile is a normal `Pile` in `state.piles` with `region: "canvas"` and a position. Every existing handler looks piles up by id in that array, so shuffle, face toggle, flip, insert top/bottom/random on drop, `MOVE_ALL_PILE_CARDS`, `viewFor` masking, and snapshot-based undo work **unchanged**. This follows the project convention (type extension > parallel collections), the same way spread zones were added.

Rejected alternatives:
- **Separate `canvasPiles` collection** — every card action gains a third dispatch path; masking, undo, reset, and deal-next-hand need parallel logic. This is the pattern the codebase explicitly rejected for spread zones.
- **Client-side visual grouping** — no shuffle, no insert-into-middle, and a face-down "stack" would leak its contents over the wire. Fails requirements.

## Data model (`src/shared/types.ts`)

- `Pile.region` gains `"canvas"` (now `"pile" | "spread" | "canvas"`).
- `Pile` and `ClientPile` gain `pos?: { x: number; y: number; z: number }` — present iff `region === "canvas"`. `z` shares the loose-card z-space so piles interleave naturally with loose cards.
- New pile defaults at creation: `id: "canvas-pile-<nanoid>"`, `name: "Stack"`, `faceUp` = the top card's face state, per-card `faceUp` preserved (stacking flips nothing).

## New actions

```ts
| { type: "CREATE_CANVAS_PILE"; cardIds: string[]; x: number; y: number }
| { type: "UNSTACK_CANVAS_PILE"; pileId: string }
| { type: "MOVE_CANVAS_PILE"; pileId: string; x: number; y: number }
```

- **CREATE_CANVAS_PILE** — requires ≥2 cardIds, all currently loose canvas cards. Removes them from `canvasCards`; creates the pile at (x, y) with `z = maxZ + 1`. Card order in the stack: ascending pre-stack z (visually buried stays buried; last element = top of stack, matching the existing convention).
- **UNSTACK_CANVAS_PILE** — `region === "canvas"` guard. Fans the pile's cards out as loose canvas cards starting at `pos` with a 24px x offset per card (bottom→top becomes left→right), assigns fresh ascending z above current maxZ, deletes the pile. Face states preserved — unstacking a face-down pile reveals buried cards to everyone. **Intended**: physically spreading a stack does exactly this; do not "fix" later.
- **MOVE_CANVAS_PILE** — `region === "canvas"` guard; finite-coordinate validation; updates `pos` and bumps `z` to `maxZ + 1` (same top-bump as card placement).

Validation order follows the house pattern: validate everything (cards exist, coordinates finite, pile exists, region guard) → `takeSnapshot` → mutate. Batch pre-validation makes CREATE atomic: if any selected card vanished mid-flight (another player moved it), the action errors with `CARD_NOT_IN_SOURCE` and nothing mutates.

## Changes to existing server code (`party/index.ts`)

- **Empty-pile pruning**: a shared `pruneEmptyCanvasPiles()` runs after every mutating action in `onMessage` — any `region: "canvas"` pile with zero cards is deleted. Covers MOVE_CARD, PLAY_CARD_SET, PASS_CARD, MOVE_ALL_PILE_CARDS, and anything added later. Undo restores pruned piles automatically (whole-state snapshots).
- **`MOVE_ALL_PILE_CARDS`** gains an optional hand destination: `{ toZone?: "pile" | "hand" }` (default `"pile"`, backward compatible). Hand target: standard auth guard (own hand only, mirroring MOVE_CARD), cards land `faceUp: true`.
- **`gatherAllCardsToDraw`** (RESET_TABLE / DEAL_NEXT_HAND): already sweeps all piles' cards into draw; additionally delete `region: "canvas"` piles afterward.
- **`viewFor`**: canvas piles take the existing stacked-pile masking branch (top card visible; buried face-down cards masked) — explicitly *not* the spread branch. `pos` passes through to `ClientPile`. Zero new masking logic.
- **Storage migration**: none — old states simply contain no canvas piles.

## Client UI

### `CanvasPileZone` (new component)

Rendered inside `CanvasZone`'s inner (panned) div, absolutely positioned at `pile.pos`, z-indexed by `pos.z`. Visuals: the pile's top card (or `CardBack`), the existing count badge, and a slim frame/header strip that doubles as the whole-pile drag grip. Controls reuse PileZone's icon set — face toggle, shuffle, select-all — plus **Unstack**; revealed compactly on hover/tap (existing `zone-controls` pattern). Shuffle animation and last-move highlight reuse the same building blocks as PileZone.

Card-level interactions reuse existing paths verbatim:
- Droppable with `data: { toZone: 'pile', toId }` — dropping a card/selection onto it fires the existing MOVE_CARD / PLAY_CARD_SET client logic, including insert top/bottom/random.
- Top card is a `DraggableCard` with `fromZone: "pile"` — identical to dragging off the discard pile.

**Card drag vs. pile drag — pointer-down target decides.** Both gestures are supported on the same pile:
- **On the top card's art**: a tap (no movement past the drag threshold) toggles selection of the top card, same as column piles today; a drag moves the top card off the pile. Never the whole pile.
- **Anywhere else on the pile** — the frame rim (rendered ~6–8px larger than the card on all sides so there is always a grabbable edge) or the header strip (name + count badge): a drag moves the whole pile. The header strip is the primary touch target (full pile width); the rim mainly serves mouse users. Control buttons are excluded — they stay buttons.
- Implementation: two nested dnd-kit draggables — the inner card `DraggableCard` and an outer frame draggable (`type: 'canvas-pile'`). The inner draggable's pointer-down stops propagation, so a card grab never also arms the pile drag. `cursor: grab` on the frame/header signals the pile-drag affordance.

### Stack button

`CanvasControls` gains a **Stack** button, visible when `selectionSource.zone === 'canvas'` and ≥2 cards are selected. Sends `CREATE_CANVAS_PILE` at the selection's top-left corner (min x, min y across the selected cards); selection clears on success (consistent with post-drop behavior).

### `BoardDragLayer`

- **Whole-pile drag**: a draggable on the pile frame with `data: { type: 'canvas-pile', pileId }`. On drop:
  - over empty canvas → `MOVE_CANVAS_PILE`, reusing the existing D-15 scroll-offset + bounds-clamping math from PLACE_ON_CANVAS;
  - over another pile or spread → `MOVE_ALL_PILE_CARDS` (pile→pile);
  - over own hand → `MOVE_ALL_PILE_CARDS` with `toZone: "hand"`.
- **Nested droppables** (new to this codebase): canvas piles sit *inside* the canvas droppable. Collision detection must rank the inner pile above the canvas when the pointer is within both — with `pointerWithin`, prefer the smallest/most-specific match. This is the main dnd-kit risk; it gets a dedicated e2e test.
- `MeasuringStrategy.Always` stays on (piles appear/disappear while DndContext is mounted).

### Keyboard layer

Canvas piles participate in the Alt zone-letter map like column piles (the map derives from `state.piles`; verify wiring at planning time).

## Edge cases

- **Undo/prune interplay**: pruning happens server-side after any mutation; snapshots are whole-state, so undo restores a pruned pile and no ghost piles can strand.
- **RESET_TABLE / DEAL_NEXT_HAND** delete canvas piles after sweeping their cards to draw.
- **Concurrent mutation during Stack**: pre-validation → error, no mutation (batch atomicity).
- **Unstack reveals buried cards** — intended, see above.
- **Z-space**: piles and loose cards share one z sequence; create/move bumps the pile to top.
- **Region guards**: UNSTACK/MOVE reject non-canvas piles, so draw/discard/spreads can't be unstacked or repositioned.

## Testing

- **Wave 0 RED Vitest scaffolds** (failing first, then implement to GREEN):
  - CREATE_CANVAS_PILE: happy path, <2 cards, missing card (atomicity), z/order semantics, faceUp inheritance.
  - UNSTACK_CANVAS_PILE: fan-out positions/order, region guard, pile deletion.
  - MOVE_CANVAS_PILE: pos update, z bump, coordinate validation, region guard.
  - Pruning: last card off a canvas pile deletes it; column piles never pruned; undo restores.
  - `viewFor`: face-down canvas pile masks buried cards, top card visible, `pos` passes through.
  - MOVE_ALL_PILE_CARDS hand target: own-hand auth guard, faceUp true, default toZone stays "pile".
  - gatherAllCardsToDraw removes canvas piles.
- **Playwright e2e** (two `BrowserContext`s; dnd-kit drags via `mouse.move/down/move/up (steps:15)`):
  - A stacks three cards → B sees a pile with count 3 and only the top card; B drags a card onto the pile (nested-droppable: lands in pile, not on felt); A unstacks → both see three loose cards.
  - Whole-pile drag: reposition on canvas; drop pile frame onto discard moves all cards.
  - Drag disambiguation: a drag starting on the top card's art moves only that card (pile count decrements, pile stays put); a drag starting on the frame/header moves the whole pile (count unchanged, position updates).
