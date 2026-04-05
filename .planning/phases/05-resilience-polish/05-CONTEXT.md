# Phase 5: Resilience + Polish — Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers connection resilience and player presence visibility:
1. **ROOM-04** — Reconnect-to-hand: a player who closes and reopens the tab (same room link) resumes with their previous hand intact
2. **Player presence** — All players can see who is currently connected vs. disconnected
3. **Disconnection UX** — The current player sees clear feedback when their connection drops
4. **TABLE-03 closeout** — Opponent hand counts are already implemented (opponentHandCounts in ClientGameState, rendered in BoardView.tsx); mark requirement complete, no code work needed

This phase does NOT add new game actions or modify game rules.
</domain>

<decisions>
## Implementation Decisions

### Bug Fix: Player Identity (ROOM-04)

- **D-01:** The server currently uses `connection.id` as the player token. This must be changed to use the `?player=` query parameter (sent by `usePartySocket` via `PartySocket({ query: { player: playerId } })`). Extract from `ctx.request.url` in `onConnect` using `new URL(ctx.request.url).searchParams.get("player")`.
- **D-02:** The corrected token must be set on `connection.setState({ playerToken })` using the stable player ID, not `connection.id`.
- **D-03:** `getPlayerToken()` can remain as-is — it already reads from `connection.state?.playerToken`, which will now be the stable ID.

### Room Cap Semantics

- **D-04:** The 4-player cap counts total player slots (length of `gameState.players[]`), not active connections. A disconnected player holds their slot. Consequence: if 4 players have joined (even if some are disconnected), no new player may connect.
- **D-05:** Reconnecting as an existing player (same `?player=` token) is not blocked by the cap — the player already occupies a slot.

### Player Presence Display

- **D-06:** Show presence as a row of colored status dots in the top-right corner of the board. One dot per player in `gameState.players[]`.
- **D-07:** Each dot has a tooltip on hover: "Connected" or "Disconnected". No labels by default — dots only.
- **D-08:** Your own dot is visually distinguished (e.g., slightly larger or labeled "You").

### Disconnection UX (Current Player)

- **D-09:** When the current player's WebSocket drops, show a thin banner: "Connection lost. Reconnecting…"
- **D-10:** After 10 seconds of sustained disconnection, the banner message changes to: "Connection lost — refresh to rejoin". PartySocket continues auto-retrying underneath.
- **D-11:** The banner dismisses automatically when connection is restored.
- **D-12:** Banner placement: top of the board view, full width. Does not block the card table.

### Claude's Discretion

- Banner visual style (color, icon) — match the existing shadcn/dark felt theme; use muted warning tone (amber/yellow)
- Dot sizing and spacing
- How quickly the banner appears after disconnect (suggest immediate or 1s delay to avoid flicker on brief drops)

### Deferred Ideas

- "Remove player" button — available before the hand is dealt or after reset. Noted for backlog (Phase 999.x).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ROOM-04 (reconnect), TABLE-03 (opponent hand counts, already done)

### Server
- `party/index.ts` — Full server implementation. Key areas: `onConnect` (identity bug — uses `connection.id` instead of `?player=` param), `onClose` (sets `connected: false`), `viewFor` (hand masking, `opponentHandCounts`), room cap check (line ~96)

### Client
- `src/hooks/usePartySocket.ts` — WebSocket hook. Already tracks `connected: boolean` and exposes it. PartySocket auto-reconnect is built in.
- `src/shared/types.ts` — `Player { id, connected }`, `ClientGameState { players[], opponentHandCounts }` — presence data already flows through the type system
- `src/App.tsx` — `connected` from `usePartySocket` is passed to `LobbyPanel` but not to `BoardDragLayer` / the playing UI
- `src/components/BoardDragLayer.tsx` — Entry point for the playing UI; needs to receive `connected` and player presence
- `src/components/OpponentHand.tsx` — Currently shows card backs and count; no presence indicator yet

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePartySocket` already returns `connected: boolean` — wire it through to BoardDragLayer/BoardView for disconnection banner
- `ClientGameState.players[]` with `connected: boolean` is already in every state update — no server changes needed for presence data beyond the identity fix
- shadcn `Badge` component used in OpponentHand — same pattern usable for status dots
- Existing `error` state in `usePartySocket` for displaying error messages

### Established Patterns
- State flows from PartyKit server → `usePartySocket` → `App` → components via props
- Server sends full state on every action and on connect/disconnect; no partial patches
- `broadcastState()` is called in `onConnect` and `onClose` — all players immediately see presence changes

### Integration Points
- `App.tsx` RoomView must pass `connected` down to `BoardDragLayer` (currently only passes `gameState`, `playerId`, `sendAction`, `setDragging`)
- `BoardDragLayer` must surface the reconnection banner and pass player presence to `BoardView`
- `BoardView` (in `src/components/`) renders opponent hands and piles — the status dot row goes here
- Server `onConnect` identity fix affects: `playerToken` assignment, cap check logic (count `gameState.players.length` instead of active connections)

</code_context>

<specifics>
## Specific Ideas

- Status dots in top-right with hover tooltip: exactly "Connected" / "Disconnected"
- Banner exact copy: "Connection lost. Reconnecting…" → (after 10s) "Connection lost — refresh to rejoin"
- Cap logic: `if (gameState.players.length >= 4 && !gameState.players.find(p => p.id === playerToken))` → reject new connection

</specifics>

<deferred>
## Deferred Ideas

- **Remove player button** — Available before hand is dealt or after reset. Lets host remove a ghost player to free up a slot. Belongs in a future backlog phase (999.x).

</deferred>

---

*Phase: 05-resilience-polish*
*Context gathered: 2026-04-05*
