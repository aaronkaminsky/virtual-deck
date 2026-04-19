# Phase 9: Player Identity + Presence - Context

**Gathered:** 2026-04-18 (retroactive — phase already executed)
**Status:** Implementation complete — context captured for downstream phases

<domain>
## Phase Boundary

Players know who is at the table: display names are visible on the board to all connected players, persist across reconnects (stored in localStorage + restored from `?name=` param on reconnect), and a live presence indicator shows connected vs disconnected state per player.

No rule enforcement, no accounts, no in-app profiles — just display names for identification.

</domain>

<decisions>
## Implementation Decisions

### Name Entry + Lobby Gate
- **D-01:** WebSocket connection is deferred until the player presses "Join Game" — not on page load
- **D-02:** Join button disabled until name has at least one non-whitespace character
- **D-03:** Name is passed as `?name=` URL query param on the initial WebSocket connect
- **D-04:** No name entry modal — the existing LobbyPanel gained the name input field inline

### Name Persistence + Storage
- **D-05:** Name stored in localStorage (`displayName` key) — pre-fills on next visit
- **D-06:** Client truncates to 20 chars on save; server also slices to 20 and strips `<>"'&` characters
- **D-07:** On reconnect, server updates `player.displayName` from the `?name=` param — client owns the name

### Board Display
- **D-08:** Name + presence dot appears above each hand zone (own + opponents) — no separate roster panel
- **D-09:** No special "You" label for the current player — same name-label treatment as opponents
- **D-10:** Presence dot: green = connected, grey = disconnected — inline with name label
- **D-11:** Old PlayerPresence header dots removed from board header (replaced by per-zone dots)

### Server State
- **D-12:** `Player` type gains `displayName: string` (required, not optional)
- **D-13:** `onStart` migrates existing rooms: any `Player` missing `displayName` gets `''` assigned
- **D-14:** Name sanitization is server-side only (strips `<>"'&`, slices to 20) — client trusts its own input

### Claude's Discretion
- Fallback display when `displayName` is empty string: renders `'Player'` (HandZone and OpponentHand both use `displayName || 'Player'`)
- IIFE used in BoardView JSX to look up `myPlayer` without extracting to a variable above the return

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PRES-01, PRES-02, PRES-03, PRES-04 define the acceptance criteria for this phase

### Type Contracts
- `src/shared/types.ts` — `Player` interface (now includes `displayName: string`)

### Key Implementation Files
- `party/index.ts` — `onConnect` name param handling, `onStart` migration pattern
- `src/hooks/usePlayerId.ts` — `getDisplayName()` and `saveDisplayName()` localStorage helpers
- `src/hooks/usePartySocket.ts` — `displayName` query param wiring, `enabled` flag for deferred connect
- `src/App.tsx` — `joinState` gate, `handleJoin` callback
- `src/components/LobbyPanel.tsx` — name input field, Join Game button
- `src/components/HandZone.tsx` — own player name label + presence dot
- `src/components/OpponentHand.tsx` — opponent name label + presence dot

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getDisplayName()` / `saveDisplayName()` in `src/hooks/usePlayerId.ts` — reuse in any component that needs the stored name
- `?name=` param convention — future phases can rely on this being present on every WebSocket connection

### Established Patterns
- Deferred WebSocket connect via `enabled` flag in `usePartySocket` — pattern is in place if other gates are needed
- Per-player `connected` boolean flows from server through `viewFor` to all clients
- Name fallback: `displayName || 'Player'` — safe for empty-string edge case (new rooms, migration)

### Integration Points
- `Player.displayName` is now a required field on the shared type — any future server code that creates a `Player` object must include it
- `onStart` migration pattern established — future schema additions to `Player` or `GameState` can follow this approach

</code_context>

<specifics>
## Specific Ideas

- Name sanitization intentionally minimal (`<>"'&` only) — no profanity filter, no uniqueness enforcement
- Max 20 chars is a UX constraint (fits in the hand-zone label area), not a database or ID constraint

</specifics>

<deferred>
## Deferred Ideas

- Unique name enforcement — not implemented; two players can have the same display name
- Name editing after join — not supported; player would need to rejoin to change name
- In-app roster panel / sidebar — names are shown per hand zone, no separate roster component

</deferred>

---

*Phase: 09-player-identity-presence*
*Context gathered: 2026-04-18 (retroactive)*
