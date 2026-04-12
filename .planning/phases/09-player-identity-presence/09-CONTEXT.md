# Phase 9: Player Identity & Presence - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Every seat at the table has a name. Players enter a display name before joining the game. All players see each other's names plus real-time presence status (connected / disconnected) throughout the session. Names persist across reconnects.

**In scope:**
- Name input field on the lobby panel, required before joining
- `displayName` field on the `Player` type, sent by client on every connect via URL param
- Name displayed near each player's hand zone on the board (all players, including self)
- Presence status (connected/disconnected) shown alongside names on the board
- Remove the existing header presence dots (PlayerPresence component replaced by board-level labels)
- `localStorage` persistence for display name (pre-fills on next visit)
- Fallback to "Player" when name is absent

**Out of scope:**
- Renaming mid-session (name is set once in lobby)
- Per-room vs global name settings (name is global via localStorage)
- Header roster panel or sidebar roster
- Lobby showing other players' names before joining (that data flows post-connect)

</domain>

<decisions>
## Implementation Decisions

### Name Prompt UX
- **D-01:** Name is entered in the lobby panel, before the player joins the game. The lobby shows a "Your name" text input above a "Join Game" button.
- **D-02:** "Join Game" button is disabled until the input contains at least one non-empty character. No inline error state needed — the button simply stays disabled.
- **D-03:** Name field accepts non-empty input up to 20 chars (per PRES-01). Validation is client-side only; the server trusts the client (same pattern as player token).

### Roster Display
- **D-04:** Names appear near each player's hand zone on the board — not in the header. Each hand zone shows the player's name + a presence dot (green = connected, grey = disconnected).
- **D-05:** The existing `PlayerPresence` header dots (green/grey circles in the header bar) are removed. Board-level name labels replace them as the presence indicator.
- **D-06:** The current player's name appears above their own hand zone, same treatment as opponents. No "You" label — just the name.

### Name Persistence
- **D-07:** Name is stored in `localStorage` (alongside the player token). When the player visits again, the name field is pre-filled. The player can change it before joining.
- **D-08:** On every connect (including reconnects), the client passes the name as a URL param (e.g., `?player=X&name=Aaron`). The server reads it and updates `GameState`. This handles room-restart scenarios the same way the player token already does.
- **D-09:** The `Player` type gains a `displayName: string` field. `viewFor` includes it in the broadcasted `ClientGameState`, so all players receive all names.

### Fallback Names
- **D-10:** If a player's `displayName` is empty or missing (edge case, e.g., race condition on join), render `"Player"` as the fallback label.

### Claude's Discretion
- Exact layout / positioning of name + presence dot relative to each hand zone
- Typography and sizing of name labels (should feel lightweight, not compete with cards)
- How the name + presence dot animates or updates when a player disconnects/reconnects mid-game

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing source files to read before touching
- `src/shared/types.ts` — `Player` interface (add `displayName`), `GameState`, `ClientGameState`; `ClientAction` union (new `SET_DISPLAY_NAME` action or name passed on connect)
- `party/index.ts` — `onConnect` handler (reads `?player=` param; extend to read `?name=` param); `viewFor` (must include `displayName` in broadcasted players)
- `src/hooks/usePlayerId.ts` — localStorage + URL param pattern for player token; extend to handle display name the same way
- `src/components/LobbyPanel.tsx` — add name input field + "Join Game" button; currently shows "You" / "Player" list without names
- `src/components/PlayerPresence.tsx` — currently renders header dots; will be removed or repurposed
- `src/components/HandZone.tsx` — player's own hand zone; name label goes here
- `src/components/OpponentHand.tsx` — opponent hand rendering; name label goes here

### Requirements traceability
- PRES-01 → name input in lobby, non-empty, max 20 chars
- PRES-02 → name visible on board near hand zones
- PRES-03 → localStorage persistence + re-sent on connect
- PRES-04 → presence dot (connected/disconnected) shown alongside each name

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePlayerId.ts`: localStorage + `?player=` URL param pattern — extend to also store/read `displayName` from localStorage and pass `?name=` on connect
- `PlayerPresence.tsx`: exists but will be removed; logic for connected/disconnected styling is reusable (green dot = connected, grey = disconnected)
- shadcn `Input` component: already used elsewhere (e.g., deal count in ControlsBar) — use for name field in lobby
- shadcn `Button` component: already used in LobbyPanel — extend for "Join Game" button

### Established Patterns
- Player token: stored in localStorage, passed as `?player=` URL param, read by server in `onConnect` — name follows identical pattern
- `viewFor()` broadcasts `players` array to all clients — adding `displayName` to `Player` makes it automatically available client-side
- All board layout is in BoardView/BoardDragLayer — name labels near hands slot into the existing component tree

### Integration Points
- `party/index.ts` `onConnect`: currently reads `?player=` and sets `playerToken`; extend to read `?name=` and set `player.displayName`
- `LobbyPanel`: currently connects immediately on render; with this phase, joining becomes gated behind a "Join Game" button press — this may require a small flow change in how/when `usePartySocket` connects
- `HandZone.tsx` and `OpponentHand.tsx`: name + presence dot rendered above/below each hand zone

</code_context>

<specifics>
## Specific Ideas

- Name field pre-fills from localStorage on lobby load — player sees their previous name immediately
- Name + presence dot layout near hand zones should feel like a seat label, not a banner
- The "Join Game" button in the lobby replaces whatever current mechanism triggers full board entry (if any)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-player-identity-presence*
*Context gathered: 2026-04-12*
