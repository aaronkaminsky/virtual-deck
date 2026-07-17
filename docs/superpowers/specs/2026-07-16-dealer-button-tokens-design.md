# Dealer Button & Movable Tokens — Design (1035)

**Backlog:** 1035 — Dealer button & movable tokens (from gap review B2; also covers C4 dealer rotation)
**Date:** 2026-07-16

## Summary

Draggable markers on the canvas for dealer/turn/trump tracking. Players advance them themselves, like a physical dealer button. Four singleton tokens — one white "D" dealer puck and three generic colored discs (red, blue, green) — live in a tray next to the canvas. Dragging a token onto the felt places it; dragging it back to the tray puts it away. Tokens are public (never masked), carry no cards, and have no drop-target or selection semantics — they are purely positional.

The feature is toggle-able like poker chips, via its own independent toggle (`tokensEnabled`, default **off**): a game can have chips on or off and tokens on or off in any combination. When off, no token UI appears anywhere.

## Decisions

| Question | Decision |
|---|---|
| Token set | Dealer puck + 3 generic colored tokens (red, blue, green); meaning assigned verbally, like a real table |
| Feature toggle | `tokensEnabled` flag, default off; toggled via `SET_TOKENS_MODE` from the controls menu, independent of chips mode. Toggling off hides all token UI but preserves token positions (chips precedent: counts survive toggle-off); re-enabling restores them |
| Copies | Singletons — exactly one of each exists; its tray slot sits empty while on the felt |
| Placement | Token tray in the pile column (visible while tokens are enabled); drag out to place, drag back to put away |
| Undo | Token moves are **not** undoable and never take snapshots; card-move undo never reverts token positions |
| Reset | `RESET_TABLE` returns all tokens to the tray |
| Authorization | Any player may move any token (matches the physical ritual) |
| Data model | New `tokens` collection in `GameState` + dedicated `MOVE_TOKEN` / `RETURN_TOKEN` actions (approach A; cardless-`Pile` reuse rejected as semantically leaky, ephemeral non-authoritative layer rejected as violating server-authority architecture) |

## Data model & server

### Shared types (`src/shared/types.ts`)

```ts
export type TokenId = "dealer" | "red" | "blue" | "green";

export interface Token {
  id: TokenId;
  pos: PilePos | null;   // null = in tray; z shares the loose canvas z-space
}
```

- `GameState.tokens: Token[]` and `GameState.tokensEnabled: boolean`; both mirrored onto `ClientGameState`.
- New client actions:
  - `{ type: "SET_TOKENS_MODE"; enabled: boolean }` — toggles the feature (strict `=== true` boolean check, like `SET_CHIPS_MODE`). No snapshot (display preference, not a card move).
  - `{ type: "MOVE_TOKEN"; tokenId: TokenId; x: number; y: number }` — places from tray or moves on canvas (server just sets `pos`; no distinction needed).
  - `{ type: "RETURN_TOKEN"; tokenId: TokenId }` — back to tray (`pos = null`).

### Server (`party/index.ts`)

- **Init:** rooms start with `tokensEnabled: false` and all four tokens at `pos: null`. Rooms hydrated from Durable Object storage that predate this feature get defaults via `'tokens' in state` / `'tokensEnabled' in state` guards on load (same pattern as the existing `chipsEnabled` hydration guard).
- **`SET_TOKENS_MODE`:** sets `tokensEnabled = (action.enabled === true)`. Token positions are untouched — toggling off is a pure display gate; re-enabling shows tokens where they were. No snapshot.
- **`MOVE_TOKEN`:** no-op when `tokensEnabled` is false (chips precedent: `TRANSFER_CHIPS` no-ops when chips are off). Validate the token exists (`TOKEN_NOT_FOUND`) and coordinates are finite (`INVALID_COORDINATES`, same error shapes as `MOVE_CANVAS_PILE`); then `pos = { x, y, z: maxCanvasZ(state) + 1 }`. No snapshot. No ownership check.
- **`RETURN_TOKEN`:** no-op when `tokensEnabled` is false; validate token exists; `pos = null`. No snapshot.
- **`maxCanvasZ`:** extended to include token `z` so tokens layer correctly with loose cards and canvas piles.
- **`RESET_TABLE`:** sets every token's `pos` to `null`.
- **`UNDO_MOVE`:** after restoring a snapshot, overwrite the restored state's `tokens` and `tokensEnabled` with the current live values (same carry-forward pattern used for `undoSnapshots`). Undoing a card move must never teleport tokens or flip the toggle.
- **`viewFor`:** tokens pass through unchanged to every connection — no masking.

## Client UI & drag

- **Controls menu toggle:** a "Tokens on/off" button in the `ControlsBar` menu, directly alongside the Poker Chips section, dispatching `SET_TOKENS_MODE` (same button pattern/aria as the chips toggle; no extra config input needed).
- **`TokenTray`** (new component): rendered in the left pile column in `BoardView`, below the pot-zone slot, only when `tokensEnabled` (like `PotZone` gating on `chipsEnabled`). Four fixed slots. A slot whose token is on the felt renders a faint empty outline. It is a `useDroppable` target so tokens can be dragged back in.
- **Token visuals:** dealer = white puck with a "D"; others = flat felt-friendly discs in red, blue, green. ~36 px diameter, one size on all viewports. Shared presentational component (`TokenDisc`) used by tray, canvas, and drag overlay.
- **`CanvasToken`** (new component): absolutely positioned inside `canvas-inner` at `pos.x/y/z`, modeled on `CanvasDraggableCard` minus selection/highlight logic. `useDraggable` with `data: { type: "token", tokenId }`. Carries a `data-token` attribute, added to `CanvasZone`'s drag-to-pan `closest()` exclusion list so pressing a token never pans the felt.
- **`BoardDragLayer`:** a token branch modeled on the existing whole-pile (`canvas-pile`) branch:
  - drop over the tray droppable → `RETURN_TOKEN`;
  - drop over the canvas → `MOVE_TOKEN` with bounds-clamped coordinates. Tray→canvas drops compute position from the pointer + canvas rect (same as hand→canvas card drops); canvas→canvas moves use stored `pos` + `event.delta` (same as pile repositioning);
  - any other drop target → no-op snap-back.
  - A token ghost renders in the `DragOverlay` while dragging.
- **Canvas sizing/panning:** token positions join `canvasCards`/`canvasPiles` in the `innerW`/`innerH` bounds computation so the canvas can pan to a token parked far out.
- **Canvas tokens gating:** `CanvasZone` renders `CanvasToken`s (and includes token positions in its bounds math) only when `tokensEnabled`.
- **Non-goals:** tokens are not drop targets, have no selection state, and clicking one does nothing. Keyboard/zone-shortcut support is out of scope for v1 (possible follow-up).

## Edge cases

- **Concurrency:** two players dragging the same token = last write wins; the existing drag-time WebSocket buffer (`bufferRef`) already prevents mid-drag snap-back.
- **Pre-token rooms:** storage-hydration default covers rooms created before this feature.
- **Z-order:** every `MOVE_TOKEN` raises the token to `maxCanvasZ + 1`, matching card/pile behavior — last-touched object sits on top.

## Testing

- **Unit (Vitest, TDD Wave 0 RED scaffolds first):**
  - `SET_TOKENS_MODE`: default off; strict boolean coercion; toggling off then on preserves token positions; `MOVE_TOKEN`/`RETURN_TOKEN` no-op while disabled.
  - `MOVE_TOKEN` validation: unknown tokenId, non-finite coordinates.
  - Move sets `pos` with `z = maxCanvasZ + 1`; token z participates in subsequent `maxCanvasZ` results.
  - `RETURN_TOKEN` sets `pos: null`.
  - `RESET_TABLE` returns all tokens to tray.
  - `UNDO_MOVE` carries live token state forward (move card → move token → undo → token stays put).
  - `viewFor` includes tokens unmasked for every player.
  - Storage hydration defaults `tokens` and `tokensEnabled` for pre-token saved state.
- **E2e (Playwright, two `BrowserContext`s):** player A enables tokens from the menu → tray appears for both players; A drags the dealer token from tray to felt → both players see it on the canvas and the tray slot empties; drag back to tray → tray restored for both.
