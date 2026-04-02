---
phase: 01-server-foundation
plan: 03
subsystem: api
tags: [partykit, websocket, game-state, hand-masking, persistence, typescript]

# Dependency graph
requires:
  - phase: 01-server-foundation/01-02
    provides: Pure functions — buildDeck, shuffle, defaultGameState, viewFor — and all unit tests
provides:
  - Complete GameRoom class wiring pure functions into PartyKit lifecycle hooks
  - onStart with durable storage restore (hibernation survival)
  - onConnect with 4-player cap (close code 4000 on 5th connection)
  - onMessage handling SHUFFLE_DECK, DRAW_CARD, PING
  - onClose marking player disconnected while preserving hand
  - Per-connection broadcastState via viewFor (no room.broadcast — hand privacy enforced)
  - State persistence via room.storage after every mutation
  - Hibernation opt-in via GameRoom.options = { hibernate: true }
affects:
  - phase-02-lobby (client connects to this server; player token flow from here)
  - phase-03-core-board (drag actions send DRAW_CARD; hand masking pattern verified here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-connection broadcast: iterate room.getConnections(), send viewFor(state, conn.id) to each — never use room.broadcast for game state"
    - "Durable storage: await room.storage.get<GameState>('gameState') on restore; room.storage.put('gameState', state) after every mutation"
    - "Player cap: count=[...room.getConnections()].length; if count>4 close(4000)"
    - "Hibernation opt-in: GameRoom.options = { hibernate: true } set after class definition"

key-files:
  created: []
  modified:
    - party/index.ts

key-decisions:
  - "Per-connection broadcast pattern chosen over room.broadcast — hand masking requires each client gets only its own cards; this is enforced by looping connections and calling viewFor per conn.id"
  - "Player cap check uses count > 4 (after new connection is included) so the 5th incoming connection is rejected, not the 4th"
  - "Disconnecting players marked connected: false but hands preserved — reconnect flow (Phase 5) depends on hand data surviving disconnect"

patterns-established:
  - "Pattern 1 (hand privacy): Never use this.room.broadcast for game state. Always iterate getConnections() and send viewFor(state, conn.id) per connection."
  - "Pattern 2 (state persistence): Call await this.persist() after every mutation before broadcasting."
  - "Pattern 3 (player token): connection.id is the player token — passed through to viewFor for masking and stored in gameState.players[].id"

requirements-completed: [ROOM-03, DECK-01, CARD-05]

# Metrics
duration: ~30min
completed: 2026-04-01
---

# Phase 1 Plan 3: GameRoom Lifecycle Hooks, Persistence, and Broadcast Summary

**PartyKit GameRoom class wiring buildDeck/shuffle/viewFor into lifecycle hooks with per-connection hand masking, durable storage persistence, 4-player cap, and hibernation opt-in — Phase 1 server complete**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-01
- **Completed:** 2026-04-01
- **Tasks:** 2 (1 auto, 1 human-verify)
- **Files modified:** 1

## Accomplishments

- GameRoom class fully implements onStart, onConnect, onMessage, onClose, persist, and broadcastState
- Hand masking verified end-to-end: Player B's WebSocket frames contain no card faces from Player A's hand
- 5th connection rejected with close code 4000 and reason "Room is full — maximum 4 players"
- All 21 unit tests pass after lifecycle implementation (pure function exports untouched)
- SHUFFLE_DECK and DRAW_CARD message handlers implemented with storage persistence on every mutation
- Hibernation enabled via GameRoom.options = { hibernate: true }

## Task Commits

1. **Task 1: Implement GameRoom lifecycle hooks, persistence, and broadcast** - `7d19375` (feat)
2. **Task 2: Manual verification — player cap and hand masking** - approved by user (checkpoint)

## Files Created/Modified

- `party/index.ts` - GameRoom class with all lifecycle hooks; pure function exports (buildDeck, shuffle, defaultGameState, viewFor) preserved above class unchanged

## Decisions Made

- Per-connection broadcast pattern (iterate getConnections + viewFor per conn.id) over room.broadcast — this is the only correct approach for hand masking; documented as a project pattern for all future phases
- Player count check uses `count > 4` where count is AFTER the new connection is included in getConnections(), so the 5th connected client is rejected
- Disconnecting players marked connected: false but hand is preserved in gameState.hands — required for Phase 5 reconnect-to-hand

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs / Gaps

**Pile card masking not implemented:** `viewFor` sends full pile card data (id, suit, rank) to all clients regardless of pile face-down state. This exposes draw pile card order to any client inspecting WebSocket frames.

- **File:** `party/index.ts` — `viewFor` function, piles mapping
- **Impact:** Draw pile ordering is visible to all clients. Does not affect hand privacy (hands are fully masked). Low severity for current use since no client UI exists yet.
- **Planned fix:** Filter face-down pile cards in `viewFor` before sending — strip card identity from face-down pile entries, send only count. Tracked as Phase 1 gap closure item.

## Issues Encountered

None - implementation matched the plan spec. The PartyKit API hooks (onStart, onConnect, onMessage, onClose, room.storage, room.getConnections) were verified in Phase 1 research and matched the spec exactly.

## User Setup Required

None - no external service configuration required. `npx partykit dev` is all that's needed to run the server locally.

## Next Phase Readiness

Phase 1 is complete. The PartyKit server:
- Owns all game state authoritatively
- Masks hand data per player (verified manually and by unit tests)
- Persists state across hibernation via durable storage
- Enforces 4-player room cap

Ready for Phase 2: Lobby + Room Join. Key items for Phase 2:
- Confirm `partysocket` is still the correct client package name before `npm install`
- Stable player token design: localStorage UUID, NOT connection.id (per existing architectural decision)
- Phase 2 depends on this server being running — client connects via partysocket to the GameRoom

---
*Phase: 01-server-foundation*
*Completed: 2026-04-01*
