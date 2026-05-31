# Design: Canvas Multi-Card Interactions (999.39 / 999.40 / 999.41)

**Date:** 2026-05-30
**Status:** Approved

## Goal

Three related fixes to multi-card interactions involving the free-canvas play area, all converging on the existing drag layer (`BoardDragLayer`) and a single server-action extension. No new collections or parallel dispatch paths.

1. **999.39** — Dragging a multi-card selection from the player's **hand** to the canvas should land the cards as a fan (matching the existing spread→canvas behavior), not collapsed onto one point.
2. **999.40** — Dragging a multi-card selection **from the canvas onto a pile** should move the whole selection at once, not just the dragged card.
3. **999.41** — Add **Select all** and **Discard all** controls for the canvas via a small floating panel.

## Non-Goals

- Changes to single-card drag behavior, spread→canvas (already correct), or hand/pile→pile set play (already correct).
- Reworking selection state, pan/scroll, or collision detection.
- Four-color decks, theming, or any card-art work (separate, shipped).

---

## Section 1 — 999.39: Hand → Canvas Multi-Card Fan

**Root cause:** When a multi-card selection is dragged onto the canvas, `BoardDragLayer.handleDragStart` captures each selected card's on-screen position by querying `document.querySelector('[data-card-id="<id>"]')` and storing offsets relative to the drag handle (`passengerOffsetsRef`). `GROUP_PLACE_ON_CANVAS` then applies those offsets so the cards land in the same arrangement they had on screen. `SpreadZone` renders `data-card-id={card.id}` on each card, so spread→canvas fans correctly. `HandZone` does **not** render `data-card-id`, so the queries return nothing, every offset defaults to `{0,0}`, and all hand passengers collapse onto the handle's drop point.

**Fix:** Add `data-card-id={card.id}` to the per-card wrapper in `HandZone` (the positioned `<div>` that holds each `SortableHandCard`, i.e. the element whose `getBoundingClientRect()` represents the card's on-screen box). The existing `handleDragStart` offset capture and `GROUP_PLACE_ON_CANVAS` path then fan the hand cards exactly as they do for spread.

**Scope:** Client-only. No server change, no new action. The existing all-in-bounds snap-back (a fan that would overflow the canvas is rejected silently) is unchanged and acceptable.

---

## Section 2 — 999.40: Canvas Selection → Pile

**Approach:** Extend the existing `PLAY_CARD_SET` action to accept a canvas source (chosen over a new dedicated action — type extension over parallel collections; reuses validation, undo snapshot, and atomicity, and powers Discard All in Section 3).

### Type change (`src/shared/types.ts`)

`PLAY_CARD_SET`'s `fromZone` widens to include `"canvas"`:

```ts
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile" | "canvas"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

### Server (`party/index.ts`, `PLAY_CARD_SET` handler)

The handler currently branches hand-vs-pile in **two** places — source resolution and source removal — and both must gain a canvas branch (the existing removal code uses `piles.find(fromId)!` and would crash on a canvas source):
- **Source resolution:** when `fromZone === "canvas"`, resolve the source as the `card` objects in `this.gameState.canvasCards` (mirroring the canvas branch already in `MOVE_CARD`), instead of `piles.find(fromId)?.cards`.
- **Pre-validate before any mutation:** every `cardId` must be present on the canvas; otherwise send `CARD_NOT_IN_SOURCE` and break (no snapshot, no mutation). The existing `allPresent` / duplicate checks already run against the resolved source, so they cover canvas once resolution is added.
- **Access control:** canvas is a shared/public surface — the hand-ownership guard is already skipped for non-hand `fromZone`, so no change needed; the existing destination guard (sender cannot place into another player's hand) still applies.
- **Source removal:** when `fromZone === "canvas"`, remove the played cards from `canvasCards` (`canvasCards = canvasCards.filter(cc => !cardIdSet.has(cc.card.id))`) instead of the pile-filter branch.
- Destination insertion is unchanged: `takeSnapshot` is already taken before mutation, and `dest.push(...cardsToPlay)` appends to the pile top — matching the "drop on top, no dialog" decision (`PLAY_CARD_SET` has no insert-position concept).

`fromId` is unused for canvas resolution; the client sends `'canvas'` as a stable placeholder.

### Client (`src/components/BoardDragLayer.tsx`, `handleDragEnd`)

The multi-card-set branch (`isMultiCardSet`) currently excludes canvas via `fromZoneAtEnd !== 'canvas'`. Remove that exclusion so a canvas selection dropped on a pile (where `event.over` is the pile droppable, not `'canvas'`) takes the set path. In the dispatch:
- `fromZone: 'canvas'`, `fromId: 'canvas'` when `selectionSource.zone === 'canvas'`.
- `cardIds: [...selectedIds]` (cards land in selection order).
- No insert-position dialog (the `PendingMove`/dialog path is not reached for sets).

The single-card canvas→pile path (`MOVE_CARD`, which *does* show the Top/Bottom/Random dialog) is unchanged — it only runs when fewer than 2 cards are selected.

---

## Section 3 — 999.41: Canvas Controls

**New component:** `src/components/CanvasControls.tsx` — a small panel absolutely positioned in the **top-right** corner of the canvas play area (inside the outer viewport `<div>` in `CanvasZone`, clear of the edge-pan arrows which sit mid-edge). Rendered only when `canvasCards.length > 0`.

**Buttons:**
- **Select all** — calls `onSelectAllCanvas()`. Toggles like the existing pile/hand select-all (`handleSelectAll`): if `selectionSource.zone` is already `'canvas'`, it clears the selection; otherwise it selects every canvas card and sets `selectionSource` to canvas. The user can then drag the whole selection (Section 2), and the existing canvas selection-count badge shows the count.
- **Discard all** — calls `onDiscardAllCanvas()` **immediately** (single click, no confirmation). Undoable via the existing Undo control.

**State & wiring (`BoardDragLayer`):**
- `handleSelectAllCanvas()` — if `selectionSource?.zone === 'canvas'`, clears the selection; otherwise sets `selectedIds` to all `gameState.canvasCards` ids and `selectionSource = { zone: 'canvas', zoneId: 'canvas' }` (mirrors `handleSelectAll`'s zone-match toggle).
- `handleDiscardAllCanvas()` — dispatches `PLAY_CARD_SET({ cardIds: allCanvasIds, fromZone: 'canvas', fromId: 'canvas', toZone: 'pile', toId: 'discard' })` (reuses Section 2) and clears selection. No-op when the canvas is empty.
- Both handlers are threaded `BoardDragLayer → BoardView → CanvasZone → CanvasControls` as `onSelectAllCanvas` / `onDiscardAllCanvas` props. `CanvasZone` already receives `canvasCards`, so it can gate visibility.

---

## Section 4 — Testing

**Vitest (server, `party/index.ts` via existing test harness):**
- `PLAY_CARD_SET` with `fromZone: 'canvas'` moves all named cards from `canvasCards` to the target pile (cards removed from canvas, appended to pile).
- Atomic pre-validation: a `cardIds` list containing an id not on the canvas returns `CARD_NOT_IN_SOURCE` and mutates nothing (canvas and pile unchanged, no snapshot).
- An undo snapshot is taken before the mutation (UNDO restores the pre-move canvas + pile state).

**Playwright (e2e):**
- **999.39:** deal a hand, select 2+ hand cards, drag to canvas → assert 2+ canvas cards exist at **distinct** positions (fanned, not stacked at one point).
- **999.40:** place 2+ cards on the canvas, select them, drag onto a pile → assert the pile gains the cards and the canvas empties of them.
- **999.41:** with cards on the canvas, the floating panel is visible; **Select all** marks all canvas cards selected (selection-count badge shows the full count); **Discard all** empties the canvas and the discard pile gains the cards. Panel is absent when the canvas is empty.

---

## Section 5 — Roadmap & Backlog Bookkeeping (folded into this branch)

`.planning/ROADMAP.md` — add two milestone entries:
- **v1.7 Card Art & Visual Overhaul (999.14)** — shipped 2026-05-30 (already merged via PR #50).
- **v1.8 Canvas Multi-Card Interactions (999.39, 999.40, 999.41)** — shipped on this PR's merge (date filled in the bookkeeping commit).

`docs/superpowers/specs/BACKLOG.md` — remove the now-resolved rows: 999.14, 999.39, 999.40, 999.41. Leave the `(see 999.14)` cross-reference on the 999.23 sound-effects row intact (it still points at the art/customization grouping).

---

## Files Changed

| File | Change |
|------|--------|
| `src/shared/types.ts` | `PLAY_CARD_SET.fromZone` adds `"canvas"` |
| `party/index.ts` | `PLAY_CARD_SET` handles `fromZone: "canvas"` (resolve from `canvasCards`, pre-validate, snapshot, splice→pile) |
| `src/components/HandZone.tsx` | Add `data-card-id={card.id}` to the per-card wrapper |
| `src/components/BoardDragLayer.tsx` | Allow canvas source in the multi-card-set path; add `handleSelectAllCanvas` / `handleDiscardAllCanvas`; thread props |
| `src/components/BoardView.tsx` | Thread `onSelectAllCanvas` / `onDiscardAllCanvas` to `CanvasZone` |
| `src/components/CanvasZone.tsx` | Render `CanvasControls` (top-right, only when canvas non-empty) |
| `src/components/CanvasControls.tsx` | **New** — Select all + Discard all panel |
| `tests/*` (Vitest) | `PLAY_CARD_SET` canvas-source coverage |
| `playwright/*` (e2e) | 999.39 / 999.40 / 999.41 scenarios |
| `.planning/ROADMAP.md`, `docs/superpowers/specs/BACKLOG.md` | Bookkeeping (Section 5) |
