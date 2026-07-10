# Pile Drop Placement Flaps (1039)

**Backlog item:** 1039 — Review usability of Top/Bottom/Random dialog when dropping on a pile. The most common case by far is Top; adding an extra click for it is annoying. Default should be an immediate drop on top, with Bottom/Random still optionally available.

**Decision:** Replace the modal Top/Bottom/Random dialog with drag-over placement flaps. A plain drop on a pile goes to the top instantly; Bottom and Random become drop targets that appear beside the pile only while a drag hovers over it.

## Interaction

- Dropping a card on a non-empty pile sends `MOVE_CARD` with `insertPosition: 'top'` immediately — no dialog, ever. The dialog is removed entirely.
- While a single-card drag hovers over a non-empty, non-spread pile, two labeled flaps slide out flush against the pile: **Bottom** and **Random**. Dropping on a flap sends the move with that `insertPosition`.
- Flaps render below the pile by default, flipped above when the pile is too close to its container's bottom edge for the flap row to fit.
- Flaps are touch-friendly: ≥40px tall, the row slightly wider than the pile, centered on it.
- Because the card drops directly to its position, it is never momentarily revealed on top of a face-up pile — the hidden-information semantics of the current dialog are preserved.

## Visibility mechanics

- Flaps stay mounted during any eligible drag but are hidden and `disabled` (dnd-kit `useDroppable` option) unless the pointer is over the pile or over a flap.
- Each flap is its own `useDroppable`; visibility = `pileIsOver || bottomIsOver || randomIsOver`.
- Flaps sit flush against the pile frame so the pointer never crosses a dead gap moving from pile to flap (no hover hysteresis needed).
- `MeasuringStrategy.Always` is already set on the `DndContext`, so mid-drag show/hide is safe per the existing project convention.

## Wiring

- Flap droppable IDs: `pile-flap-{pileId}-bottom` and `pile-flap-{pileId}-random`, with data `{ toZone: 'pile', toId: pileId, insertPosition }`.
- The IDs start with `pile-`, so the existing `customCollision` pile tier in `BoardDragLayer.tsx` picks them up with no filter changes.
- In `handleDragEnd`, the non-empty-pile branch sends `MOVE_CARD` with `overData.insertPosition ?? 'top'` instead of setting `pendingMove`.
- Delete: `pendingMove` state, `PendingMove` type, `sendPendingMove`, `topButtonRef`, and the Base UI `Dialog.Root` block.
- The flap UI is a shared component rendered by both `PileZone` (pile column) and `CanvasPileZone` (canvas piles). `BoardDragLayer` passes down whether the active drag is a single-card drag (flaps are not shown for whole-pile drags or multi-select group drags).
- No server changes: `MOVE_CARD.insertPosition` handling (including Fisher-Yates random insert) already exists.

## Scope guards (unchanged behavior)

- **Empty piles:** instant top, no flaps (bottom/random are meaningless).
- **Spread zones:** always insert at top, no flaps (GAP-02 behavior preserved).
- **Multi-card group drops:** still `PLAY_CARD_SET` with no position choice — the dialog never applied to group drops either.
- **Keyboard moves:** already send `MOVE_CARD` without `insertPosition` (server defaults to top); unchanged.
- **Intra-pile drops:** dropping a pile's own top card on its bottom/random flap sends a same-pile `MOVE_CARD`, which the server already handles (same as the dialog path today).

## Testing

- Rewrite `tests/boardDragLayerDialog.test.ts` as flap-behavior tests (Wave 0 RED scaffolds before implementation, per TDD convention): plain drop sends top immediately; flap drop sends bottom/random; no dialog renders; flaps hidden for empty piles, spread zones, group drags, whole-pile drags.
- Update the dialog-clicking portions of `tests/canvasCards.test.ts` and `playwright/runtimePiles.spec.ts`.
- Add a Playwright case for drop-on-flap using the `mouse.move/down/move/up (steps:15)` convention.

## Alternatives considered

- **Modifier key / long-hover to open the dialog:** smallest diff, but undiscoverable and no good touch story.
- **Post-drop convert popover ("Sent to top — Bottom | Random"):** simple and discoverable, but briefly reveals the card on top of face-up piles (hidden-information leak) and adds UI noise after every pile drop.
