# Dealer Button & Movable Tokens — Design (1035)

**Backlog:** 1035 — Dealer button & movable tokens (from gap review B2; also covers C4 dealer rotation)
**Date:** 2026-07-16 (revised 2026-07-17 — see Revision below)

## Revision (2026-07-17)

The shipped-to-PR version (#85) placed tokens only on the shared canvas at absolute `x/y`. That fails the feature's main use case: **indicating which player is the dealer.** The canvas is one shared coordinate space, but each client renders players in different screen positions (your own hand is always at the bottom; opponents rotate around the top depending on who you are). A token pinned to canvas coordinates cannot point at "the player currently on my left" — it just sits at a fixed spot that means something different, or nothing, depending who's looking.

This revision adds **player anchoring**: a token can be dropped onto a player (their hand or opponent-hand zone) instead of the canvas, and every client renders it next to that player's name — which is already correctly positioned per-viewer, because name rows aren't canvas coordinates. This is now the primary way tokens get used (dealer button, blinds); free canvas placement remains for table-scoped markers that aren't about a player (e.g. marking a trump suit indicator near the discard pile).

## Summary

Draggable markers for dealer/turn/blind tracking and free-floating table markers. Players advance them themselves, like a physical dealer button. Four singleton tokens — one white "D" dealer puck and three generic colored discs (red, blue, green) — live in a tray next to the canvas. A token can be in exactly one of three places:

- **tray** — put away, not in play
- **anchored to a player** — rendered beside that player's name on every client (own hand at bottom, opponents wherever their zone renders); this is how you mark "this player is the dealer"
- **on the canvas** — free-floating at shared `x/y`, for table-scoped markers not tied to a player

Dragging a token onto a player's hand/opponent-hand zone anchors it there; dragging onto the felt places it freely; dragging back to the tray puts it away. Unlike cards, **any player may move any token to or from any player** — token custody follows the physical dealer-button ritual (whoever is closest reaches over and moves it for the table), not per-player ownership. Tokens carry no cards and have no selection semantics.

The feature is toggle-able like poker chips, via its own independent toggle (`tokensEnabled`, default **off**): a game can have chips on or off and tokens on or off in any combination. When off, no token UI appears anywhere.

## Decisions

| Question | Decision |
|---|---|
| Token set | Dealer puck + 3 generic colored tokens (red, blue, green); meaning assigned verbally, like a real table |
| Feature toggle | `tokensEnabled` flag, default off; toggled via `SET_TOKENS_MODE` from the controls menu, independent of chips mode. Toggling off hides all token UI but preserves token placement (chips precedent: counts survive toggle-off); re-enabling restores it |
| Copies | Singletons — exactly one of each exists; its tray slot sits empty while placed anywhere else |
| Placement | Token tray in the pile column (visible while tokens are enabled); drag onto a player's hand to anchor, onto the felt to place freely, back to the tray to put away |
| Anchoring scope | All four tokens can anchor to a player, not just the dealer puck — covers dealer + small/big blind + any turn marker in one mechanism |
| Anchor authorization | Any player may anchor/move/unanchor any token to/from any player — matches the physical dealer-button ritual, deliberately different from card-move authorization (a player can only move cards in their own hand) |
| Anchor render spot | Next to the player's name, in the existing name row (`HandZone`/`OpponentHand`) — that row is already correctly positioned per-viewer, so no canvas math is needed |
| Anchor disc size | `TokenDisc` gains a `size: 'sm' \| 'md'` prop; name rows use `sm` (18px) to fit the existing compact strip (presence dot + name + chip badge); tray/canvas/drag-overlay keep the current 32px (`md`, default) |
| Undo | Token moves/anchors are **not** undoable and never take snapshots; card-move undo never reverts token placement |
| Reset | `RESET_TABLE` returns all tokens to the tray |
| Data model | `Token.placement` discriminated union (`{ kind: 'tray' }` / `{ kind: 'canvas'; x; y; z }` / `{ kind: 'player'; playerId }`) replacing the old nullable-`pos` shape, plus a single `MOVE_TOKEN` action carrying a destination union (approach B — chosen over patching a fourth `anchoredTo` field onto the shipped shape because "where is this token" is inherently one-of-three, and a union makes the impossible states — anchored AND on canvas — unrepresentable rather than requiring server-side exclusivity checks) |

## Data model & server

### Shared types (`src/shared/types.ts`)

```ts
export type TokenId = "dealer" | "red" | "blue" | "green";

export type TokenPlacement =
  | { kind: "tray" }
  | { kind: "canvas"; x: number; y: number; z: number }
  | { kind: "player"; playerId: string };

export interface Token {
  id: TokenId;
  placement: TokenPlacement;
}
```

This replaces the `pos: PilePos | null` shape from the original design. `z` only exists inside the `canvas` variant now (a player-anchored token isn't part of the canvas z-stack at all).

- `GameState.tokens: Token[]` and `GameState.tokensEnabled: boolean`; both mirrored onto `ClientGameState`.
- Client actions (replacing the original `MOVE_TOKEN`/`RETURN_TOKEN` pair with one destination-carrying action, since "move to tray" and "move to canvas" are no longer structurally different operations):
  - `{ type: "SET_TOKENS_MODE"; enabled: boolean }` — unchanged from the original design.
  - `{ type: "MOVE_TOKEN"; tokenId: TokenId; to: { kind: "tray" } | { kind: "canvas"; x: number; y: number } | { kind: "player"; playerId: string } }` — sets `placement` to the resolved destination. `z` for a canvas destination is server-computed (`maxCanvasZ + 1`), never client-supplied.

### Server (`party/index.ts`)

- **Init:** rooms start with `tokensEnabled: false` and all four tokens at `placement: { kind: "tray" }`. Rooms hydrated from Durable Object storage that predate this feature (including rooms that only saw the original `pos`-shaped tokens, since PR #85 never merged to `main`) get defaults via the existing `tokens`/`tokensEnabled` hydration guards, now producing the tray-placement shape.
- **`SET_TOKENS_MODE`:** unchanged — sets `tokensEnabled`, no snapshot, placement untouched.
- **`MOVE_TOKEN`:** no-op when `tokensEnabled` is false. Validate the token exists (`TOKEN_NOT_FOUND`). Branch on `action.to.kind`:
  - `"tray"` → `placement = { kind: "tray" }`.
  - `"canvas"` → validate `x`/`y` finite (`INVALID_COORDINATES`); `placement = { kind: "canvas", x, y, z: maxCanvasZ(state) + 1 }`.
  - `"player"` → validate `playerId` refers to a real player in `state.players` (`PLAYER_NOT_FOUND`); `placement = { kind: "player", playerId }`. No check that the mover *is* that player — any player may anchor a token to any other player, by design.
  - No snapshot in any branch.
- **`maxCanvasZ`:** reads `token.placement.kind === 'canvas' ? token.placement.z : 0` instead of the old `token.pos?.z ?? 0` — same shared z-space behavior, updated for the union shape.
- **`RESET_TABLE`:** sets every token's `placement` to `{ kind: "tray" }`.
- **`UNDO_MOVE`:** unchanged mechanism — after popping a snapshot, overwrite the restored state's `tokens`/`tokensEnabled` with current live values before restoring, so undoing a card move never reverts a token's placement (tray, canvas, or player) and migrates any snapshot that predates the field.
- **`viewFor`:** tokens pass through unchanged to every connection — no masking. A player-anchored token is visible to everyone, same as a canvas one.

## Client UI & drag

- **Controls menu toggle:** unchanged — a "Tokens on/off" button in `ControlsBar`, next to Poker Chips.
- **`TokenTray`:** unchanged structurally — four fixed slots in the pile column, `useDroppable`. A slot is empty (shows the outline) whenever `placement.kind !== 'tray'`, regardless of whether the token is anchored or on canvas.
- **Token visuals:** `TokenDisc` gains a `size?: 'sm' | 'md'` prop (default `'md'`). Tray, canvas, and drag overlay keep the shipped 32px (`md`). Name-row anchors use `sm` (18px) to fit the existing compact strip.
- **`CanvasToken`:** unchanged for the canvas case — renders only when `placement.kind === 'canvas'`, positioned at `placement.x/y/z`.
- **New: anchored token rendering in `HandZone` and `OpponentHand`.** Both components already render a name row (`flex items-center gap-2 px-{1,4} mb-1` containing the presence dot, name, and `chipsEnabled && <ChipBadge>`). A token whose `placement.kind === 'player'` and `placement.playerId` matches that zone's `playerId` renders as a small `TokenDisc` in that same row, positioned right after the name (before the chip badge) — e.g. `tokensEnabled && anchoredTokens.map(t => <TokenDisc key={t.id} tokenId={t.id} size="sm" />)`. `BoardView` derives `anchoredTokens(playerId)` once and passes the filtered list down, so each hand component stays agnostic of the full token list.
- **`BoardDragLayer`:** the token branch now resolves to one of three destinations instead of two:
  - drop over the tray droppable → `MOVE_TOKEN` with `{ kind: "tray" }` (unchanged).
  - drop over a player's hand/opponent-hand droppable (`toZone === 'hand' | 'opponent-hand'`) → `MOVE_TOKEN` with `{ kind: "player", playerId }`. This reuses the *existing* hand droppables — no new droppable is introduced; the token collision-detection branch is extended to also match `'hand'`/`opponent-hand-*'` ids (previously it only matched `'token-tray'` and `'canvas'`).
  - drop over the canvas → `MOVE_TOKEN` with `{ kind: "canvas", x, y }` (bounds-clamped, same math as before).
  - any other drop target, or drag starting from a `player` placement dropped nowhere valid → no-op snap-back.
  - `resolveTokenDrop`'s signature grows a third resolvable target; its return type becomes `{ kind: 'place' | 'anchor' | 'return' | 'none' }`.
  - Overlay ghost unchanged (`TokenDisc` at 0.7 opacity while dragging).
- **Canvas sizing/panning:** only `canvas`-placement tokens contribute to the `innerW`/`innerH` bounds math — player-anchored tokens aren't part of canvas geometry at all, so they're filtered out before that computation (same filter shape as the `tokensEnabled` gate already does).
- **Non-goals (unchanged):** tokens are not drop targets themselves, have no selection state, and clicking one does nothing. Keyboard/zone-shortcut support stays out of scope for v1.

## Edge cases

- **A player leaves while a token is anchored to them:** the token stays anchored to their (now-stale) `playerId`. Since disconnected players remain in `state.players` with `connected: false` (existing reconnect model — tokens don't need new handling here), the anchored token simply renders next to their now-greyed-out name row until someone moves it. No special-case cleanup needed.
- **Concurrency:** two players dragging the same token = last write wins, same as before; the WebSocket drag-buffer already covers this regardless of destination kind.
- **Pre-token / pre-revision rooms:** storage hydration produces `{ kind: "tray" }` for every token on any state that predates the `placement` field (covers both genuinely pre-1035 rooms and any room that happened to load the old `pos`-shaped version during PR #85's open window, since it never merged to `main`).
- **Z-order:** unchanged for canvas placement — every canvas `MOVE_TOKEN` raises to `maxCanvasZ + 1`. Player-anchored tokens have no z — they render inline in a name row, not layered on the canvas.

## Testing

- **Unit (Vitest, TDD Wave 0 RED scaffolds first):**
  - `SET_TOKENS_MODE`: unchanged coverage (default off, strict boolean coercion, toggle preserves placement, `MOVE_TOKEN` no-ops while disabled).
  - `MOVE_TOKEN` to `"tray"`, `"canvas"`, and `"player"`: each destination sets the correct `placement` shape; unknown `tokenId` → `TOKEN_NOT_FOUND`; unknown `playerId` on a `"player"` destination → `PLAYER_NOT_FOUND`; non-finite `x`/`y` on a `"canvas"` destination → `INVALID_COORDINATES`.
  - Canvas placement still participates in `maxCanvasZ`; a player-anchored token does not (moving a second token to canvas after one is anchored doesn't skip z-levels).
  - `RESET_TABLE` returns all tokens to `{ kind: "tray" }` regardless of prior placement kind.
  - `UNDO_MOVE` carries live token placement forward across all three kinds.
  - `viewFor` includes tokens unmasked, `player`-placement included, for every connection.
  - Storage hydration produces `{ kind: "tray" }` for legacy state (both no-`tokens`-field and old-`pos`-shaped-tokens cases).
  - Client: `resolveTokenDrop` covers all three destination kinds plus the no-op cases (tray→tray, foreign target).
  - Client: `HandZone`/`OpponentHand` render an anchored token's `TokenDisc` in the name row when `placement.kind === 'player'` matches that zone's `playerId`, and render nothing when it doesn't.
- **E2e (Playwright, two `BrowserContext`s):**
  - Enable tokens → tray appears for both players.
  - Drag the dealer token onto Player 2's opponent-hand zone (from Player 1's view) → both clients show the dealer disc next to Player 2's name; tray slot empties for both.
  - Drag the same token from Player 2's name row to Player 1's own hand row → anchor moves; both clients update.
  - Drag a token to the felt → free canvas placement still works (regression coverage for the original mechanism).
  - Drag an anchored token back to the tray → both clients see the tray slot restored and the name-row disc gone.
