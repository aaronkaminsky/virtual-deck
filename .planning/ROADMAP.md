# Roadmap: Virtual Deck

## Overview

Build a multiplayer virtual card table from the server outward. The privacy correctness requirement — that no player can read another's hand even via DevTools — forces a server-first sequence. The PartyKit room is built and verified before any UI exists. The lobby and room-join flow come next to establish player identity. The interactive board (drag-and-drop, piles, opponent visibility) follows once identity is proven. Game controls complete the full feature set. Finally, resilience work (reconnect, error states) is validated against a complete game loop.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Server Foundation** - PartyKit room with deck state, hand masking, and stable player tokens
- [ ] **Phase 2: Lobby + Room Join** - Create/join room flow, player names, room code sharing, static deploy
- [ ] **Phase 3: Core Board** - Board UI, pile zones, private hand, opponent card backs, drag-and-drop, draw
- [ ] **Phase 4: Game Controls** - Flip, pass card, deal, shuffle pile, reset table, undo
- [ ] **Phase 5: Resilience + Polish** - Reconnect-to-hand, error states, connection status indicators

## Phase Details

### Phase 1: Server Foundation
**Goal**: The PartyKit room correctly owns all game state, masks hand data per player, and persists across hibernation
**Depends on**: Nothing (first phase)
**Requirements**: DECK-01, DECK-02, CARD-05, ROOM-03
**Success Criteria** (what must be TRUE):
  1. A room can be created and a 52-card deck is initialized on the server with correct card identities
  2. Shuffling the deck uses `crypto.getRandomValues` server-side (Fisher-Yates) — no client-side randomness
  3. When a player joins, they receive a `ClientGameState` where `myHand` contains only their cards; DevTools inspection of the WebSocket frame shows no other player's hand cards
  4. Up to 4 players can connect to a single room simultaneously; a 5th connection is rejected
  5. Server state survives room hibernation — reloading the room after idle restores the previous game state
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffolding, shared types, and failing test stubs (Wave 0)
- [ ] 01-02-PLAN.md — Implement buildDeck, shuffle, defaultGameState, viewFor (Wave 1)
- [ ] 01-03-PLAN.md — GameRoom lifecycle hooks, persistence, broadcast, and manual verification (Wave 2)

### Phase 2: Lobby + Room Join
**Goal**: Players can create and join a room via link or code, and the deployed app navigates correctly
**Depends on**: Phase 1
**Requirements**: ROOM-01, ROOM-02, DECK-03
**Success Criteria** (what must be TRUE):
  1. Player can create a room and see a shareable link/code they can copy and send
  2. A second player can open the shared link (or enter the code) and land in the same room
  3. A stable player token is stored in `localStorage` so the player identity persists across page reloads
  4. Navigating directly to a room URL on the GitHub Pages deploy does not return a 404
  5. Card face and back art can be changed by editing one file in the codebase with no other modifications required
**Plans**: TBD
**UI hint**: yes

### Phase 3: Core Board
**Goal**: Players can see the shared table with pile zones and their private hand, and move cards between them
**Depends on**: Phase 2
**Requirements**: TABLE-01, TABLE-02, TABLE-03, CARD-01, CARD-02
**Success Criteria** (what must be TRUE):
  1. The board displays configurable pile zones (draw pile, discard pile, open play area) and the pile card count is visible to all players
  2. Each player sees their own hand with card faces; other players see only card backs for opponent hands, with the correct card count shown
  3. Player can drag a card from their hand to a table pile and all players see the change in real time
  4. Player can drag a card from a table pile to their own hand and the card appears in their hand immediately
  5. An incoming server state update during an active drag does not cause visual tearing or snap-back
**Plans**: TBD
**UI hint**: yes

### Phase 4: Game Controls
**Goal**: Players have the full set of card manipulation actions needed to play a game session
**Depends on**: Phase 3
**Requirements**: CARD-03, CARD-04, CTRL-01, CTRL-02, CTRL-03, CTRL-04
**Success Criteria** (what must be TRUE):
  1. Player can flip any card between face-up and face-down; all players see the new orientation
  2. Player can pass a card directly to another player's private hand; the recipient sees it in their hand and no other player sees its face
  3. Player can deal N cards from a pile to each player's hand in one action
  4. Player can shuffle any pile on the table; the pile order is randomized server-side
  5. Player can reset the table, collecting all cards into the draw pile and reshuffling, without a page reload
  6. Player can undo their last card move; the previous state is restored for all players
**Plans**: TBD
**UI hint**: yes

### Phase 5: Resilience + Polish
**Goal**: The game survives network interruptions and presents clear connection status to all players
**Depends on**: Phase 4
**Requirements**: ROOM-04
**Success Criteria** (what must be TRUE):
  1. A player who disconnects and reconnects using the same room link gets their previous hand restored exactly
  2. All players can see which players are currently connected vs. disconnected
  3. A player who closes and reopens the tab (same browser, same room link) resumes with their hand intact
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Server Foundation | 0/3 | Planning complete | - |
| 2. Lobby + Room Join | 0/? | Not started | - |
| 3. Core Board | 0/? | Not started | - |
| 4. Game Controls | 0/? | Not started | - |
| 5. Resilience + Polish | 0/? | Not started | - |
