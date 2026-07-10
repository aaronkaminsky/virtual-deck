# Pile Drop Placement Flaps (1039)

**Backlog item:** 1039 — Review usability of Top/Bottom/Random dialog when dropping on a pile. The most common case by far is Top; adding an extra click for it is annoying. Default should be an immediate drop on top, with Bottom/Random still optionally available.

**Decision:** Replace the modal Top/Bottom/Random dialog with drag-over placement flaps. A plain drop on a pile goes to the top instantly; Bottom and Random become drop targets that appear beside the pile only while a drag hovers over it.

## Interaction

- Dropping a card on a non-empty pile sends `MOVE_CARD` with `insertPosition: 'top'` immediately — no dialog, ever. The dialog is removed entirely.
- While a card drag (single card or multi-card set) hovers over a non-empty, non-spread pile, two labeled flaps slide out flush against the pile: **Bottom** and **Random**. Dropping on a flap places the card(s) at that position.
- Multi-card set semantics: **Bottom** inserts the set at the bottom preserving its order (mirror of top); **Random** inserts each card independently at a random position ("shuffle them in").
- Flaps render below the pile by default, flipped above when the pile is too close to its container's bottom edge for the flap row to fit.
- Flaps are touch-friendly: ≥40px tall, the row slightly wider than the pile, centered on it.
- Because the card drops directly to its position, it is never momentarily revealed on top of a face-up pile — the hidden-information semantics of the current dialog are preserved.

## Visibility mechanics

- The flap row only mounts while `armed`: the pile or one of its own flaps is `isOver` during an eligible drag (`pileIsOver || bottomIsOver || randomIsOver`). It is unmounted, not just hidden, the rest of the time.
- Each flap is its own `useDroppable`, and both are `disabled` unless `armed` — dnd-kit excludes disabled droppables from collision detection entirely, so a stale/phantom flap rect can never be `isOver` and swallow a drop. This is belt-and-braces on top of the re-measure below, not a replacement for it.
- Because the flap nodes only attach to the DOM after arming — mid-drag, after dnd-kit's registration/drag-start measurements have already run — `measureDroppableContainers` is called explicitly on every arm/disarm transition. Without it, a newly-armed flap's rect stays null (never `isOver`); on disarm, dnd-kit would otherwise keep the last-measured rect for the now-unmounted node, creating exactly the phantom-rect risk the `disabled` guard defends against redundantly.
- Flap rects deliberately overlap the pile edge by 2px (not merely flush) so the `isOver` handoff between pile and flap has no dead band — a flush layout left a 1px sub-pixel-rounding gap where both read `isOver: false` for a tick, disarming the flaps mid-crossing.
- Placement is clip-aware: `flapPlacement` tries 'below' the pile, then 'above', against the nearest clipping ancestor's bounds (e.g. `CanvasZone`'s `overflow-hidden` viewport) — not just `window.innerHeight`. `getBoundingClientRect()` ignores CSS clipping, so a viewport-only check could pick a fully-clipped (invisible) placement that remains an active drop target. If neither placement fits, the flaps do not arm at all — an invisible-but-active drop target is worse than no flaps. Horizontal clipping at the canvas left/right edges is accepted as-is; the visible remainder is a real affordance.
- `MeasuringStrategy.Always` is already set on the `DndContext`, so mid-drag show/hide is safe per the existing project convention.

## Wiring

- Flap droppable IDs: `pile-flap-{pileId}-bottom` and `pile-flap-{pileId}-random`, with data `{ toZone: 'pile', toId: pileId, insertPosition }`.
- The IDs start with `pile-`, so the existing `customCollision` pile tier in `BoardDragLayer.tsx` picks them up with no filter changes.
- In `handleDragEnd`, the non-empty-pile branch sends `MOVE_CARD` with `overData.insertPosition ?? 'top'` instead of setting `pendingMove`; the `isMultiCardSet` branch passes `overData.insertPosition` through on `PLAY_CARD_SET` the same way.
- Delete: `pendingMove` state, `PendingMove` type, `sendPendingMove`, `topButtonRef`, and the Base UI `Dialog.Root` block.
- The flap UI is a shared component rendered by both `PileZone` (pile column) and `CanvasPileZone` (canvas piles). `BoardDragLayer` passes down whether the active drag is flap-eligible (flaps are not shown for whole-pile drags or masked-pile group drags).
- Server: `MOVE_CARD.insertPosition` handling (including random insert) already exists. `PLAY_CARD_SET` gains an optional `insertPosition?: 'top' | 'bottom' | 'random'` field (default `'top'`), changing only the final insertion step: bottom = unshift the set in order; random = independent random index per card. Validation, snapshot/undo, and faceUp logic are position-agnostic and unchanged.

## Scope guards (unchanged behavior)

- **Empty piles:** instant top, no flaps (bottom/random are meaningless).
- **Spread zones:** always insert at top, no flaps (GAP-02 behavior preserved).
- **Masked-pile group drops:** dragging a fully-selected face-down pile (client lacks card IDs) still goes through `MOVE_ALL_PILE_CARDS` with no position choice; flaps stay hidden for this path.
- **Keyboard moves:** already send `MOVE_CARD` without `insertPosition` (server defaults to top); unchanged.
- **Intra-pile drops:** dropping a pile's own top card on its bottom/random flap sends a same-pile `MOVE_CARD`, which the server already handles (same as the dialog path today).

## Testing

- Rewrite `tests/boardDragLayerDialog.test.ts` as flap-behavior tests (Wave 0 RED scaffolds before implementation, per TDD convention): plain drop sends top immediately; flap drop sends bottom/random (single card and multi-card set); no dialog renders; flaps hidden for empty piles, spread zones, whole-pile drags, masked-pile group drags.
- Server tests for `PLAY_CARD_SET.insertPosition`: bottom preserves set order at the bottom; random places every card (deck size invariant) — extend `tests/playCardSet.test.ts`.
- Update the dialog-clicking portion of `playwright/runtimePiles.spec.ts`. (`tests/canvasCards.test.ts` needs no changes — its `insertPosition` tests exercise the server directly.)
- Add a Playwright case for drop-on-flap using the `mouse.move/down/move/up (steps:15)` convention.

## Alternatives considered

- **Modifier key / long-hover to open the dialog:** smallest diff, but undiscoverable and no good touch story.
- **Post-drop convert popover ("Sent to top — Bottom | Random"):** simple and discoverable, but briefly reveals the card on top of face-up piles (hidden-information leak) and adds UI noise after every pile drop.
