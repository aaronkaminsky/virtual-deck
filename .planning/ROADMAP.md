# Roadmap: Virtual Deck

## Overview

Build a multiplayer virtual card table from the server outward. The privacy correctness requirement — that no player can read another's hand even via DevTools — forces a server-first sequence. The PartyKit room is built and verified before any UI exists. The lobby and room-join flow come next to establish player identity. The interactive board (drag-and-drop, piles, opponent visibility) follows once identity is proven. Game controls complete the full feature set. Finally, resilience work (reconnect, error states) is validated against a complete game loop.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Server Foundation** - PartyKit room with deck state, hand masking, and stable player tokens (completed 2026-04-02)
- [x] **Phase 2: Lobby + Room Join** - Create/join room flow, player names, room code sharing, static deploy (completed 2026-04-03)
- [x] **Phase 3: Core Board** - Board UI, pile zones, private hand, opponent card backs, drag-and-drop, draw (completed 2026-04-04)
- [x] **Phase 4: Game Controls** - Flip, pass card, deal, shuffle pile, reset table, undo (completed 2026-04-05)
- [x] **Phase 5: Resilience + Polish** - Reconnect-to-hand, error states, connection status indicators (completed 2026-04-05)
- [x] **Phase 6: Functional Tech Debt** - Fix host fallback bug, add copy-link to BoardView, remove dead action handlers (completed 2026-04-10)
- [x] **Phase 7: Nyquist Validation** - Run validation for phases 1, 3, 4, 5 to achieve full Nyquist compliance (completed 2026-04-10)
- [x] **Phase 8: Documentation Housekeeping** - Fix ROADMAP progress table, SUMMARY frontmatter gaps (completed 2026-04-10)

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
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Project scaffolding, shared types, and failing test stubs (Wave 0)
- [x] 01-02-PLAN.md — Implement buildDeck, shuffle, defaultGameState, viewFor (Wave 1)
- [x] 01-03-PLAN.md — GameRoom lifecycle hooks, persistence, broadcast, and manual verification (Wave 2)

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
**Plans:** 2/3 plans executed
Plans:
- [x] 02-01-PLAN.md — Scaffold React + Vite + shadcn design system + card art config (Wave 1)
- [x] 02-02-PLAN.md — Lobby UI, PartySocket connection, player identity, deploy workflow (Wave 2)
- [ ] 02-03-PLAN.md — Human verification of lobby and room-join flow (Wave 3)

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
**Plans:** 2/3 plans executed
Plans:
- [x] 03-01-PLAN.md — MOVE_CARD server action, play pile, and unit tests (Wave 1)
- [x] 03-02-PLAN.md — Card components and board layout (Wave 1)
- [ ] 03-03-PLAN.md — Drag-and-drop wiring, socket buffer, App.tsx integration (Wave 2)

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
**Plans:** 1/3 plans executed
Plans:
- [x] 04-01-PLAN.md — Types, server handlers, and TDD tests for all 6 actions (Wave 1)
- [ ] 04-02-PLAN.md — Client UI: ControlsBar, component modifications for flip/pass/shuffle (Wave 2)
- [ ] 04-03-PLAN.md — Human verification of all game controls (Wave 3)

### Phase 5: Resilience + Polish
**Goal**: The game survives network interruptions and presents clear connection status to all players
**Depends on**: Phase 4
**Requirements**: ROOM-04
**Success Criteria** (what must be TRUE):
  1. A player who disconnects and reconnects using the same room link gets their previous hand restored exactly
  2. All players can see which players are currently connected vs. disconnected
  3. A player who closes and reopens the tab (same browser, same room link) resumes with their hand intact
**Plans:** 3/3 plans complete
Plans:
- [x] 05-01-PLAN.md — Fix server player identity and cap logic for reconnect (Wave 1)
- [x] 05-02-PLAN.md — Connection banner and player presence UI (Wave 2)
- [x] 05-03-PLAN.md — Human verification of reconnect and presence (Wave 3)

### Phase 6: Functional Tech Debt
**Goal**: Fix the two latent bugs and remove dead server code identified in the v1.0 audit
**Depends on**: Phase 5
**Requirements**: ROOM-01 (UX improvement — copy-link in BoardView)
**Gap Closure**: Closes tech debt items from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. `usePartySocket.ts` correctly falls back to the real production host when `VITE_PARTYKIT_HOST` is absent (DEV check, not env var truthiness)
  2. A copy-room-link affordance exists and is accessible while a game is in progress (BoardView, not LobbyPanel)
  3. Dead `DRAW_CARD` and `SHUFFLE_DECK` server handlers are removed; shared types updated to remove those action types
**Plans:** 1/1 plans complete
Plans:
- [x] 06-01-PLAN.md — Fix host fallback, add copy-link to BoardView, remove dead handlers (Wave 1)

### Phase 7: Nyquist Validation
**Goal**: All phases achieve full Nyquist compliance with passing VALIDATION.md files
**Depends on**: Phase 6
**Requirements**: None (validation infrastructure only)
**Gap Closure**: Closes Nyquist gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Phase 1 VALIDATION.md exists with `nyquist_compliant=true` and `wave_0_complete=true`
  2. Phase 3 VALIDATION.md has `wave_0_complete=true` (currently false despite `nyquist_compliant=true`)
  3. Phase 4 VALIDATION.md exists with `nyquist_compliant=true` and `wave_0_complete=true`
  4. Phase 5 VALIDATION.md exists with `nyquist_compliant=true`
**Plans:** 1/1 plans complete
Plans:
- [x] 07-01-PLAN.md — Run and fix validation for phases 1, 3, 4, 5 (Wave 1)

### Phase 8: Documentation Housekeeping
**Goal**: Planning artifacts accurately reflect the completed milestone state
**Depends on**: Phase 7
**Requirements**: None (documentation only)
**Gap Closure**: Closes documentation gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. ROADMAP.md progress table shows phases 2, 3, 4, 5 as Complete with accurate completion dates
  2. DECK-02 appears in the 02-SUMMARY frontmatter `requirements-completed` list
  3. TABLE-03 Phase 3 VERIFICATION note is updated to reflect quick-task completion
  4. Phase 5 SUMMARY files 05-01 and 05-02 include ROOM-04 in `requirements-completed`
**Plans:** 1/1 plans complete
Plans:
- [x] 08-01-PLAN.md — Fix all SUMMARY and VERIFICATION frontmatter gaps (Wave 1)

## Backlog

### Phase 999.1: Drag card to opponent's hand (BACKLOG)
**Goal:** Add visual drag affordance to OpponentHand and verify the existing drag-to-opponent-hand pipe works end-to-end
**Depends on**: Phase 4 (PASS_CARD server action and BoardDragLayer isPassCard branch)
**Requirements:** DRAG-01 (visual affordance), DRAG-02 (undo test coverage), DRAG-03 (end-to-end drag-to-pass)
**Plans:** 1/1 plans complete
Plans:
- [x] 999.1-01-PLAN.md — OpponentHand visual affordance, undo test, and manual verification (Wave 1)

### Phase 999.2: Put card back on draw pile — top, bottom, or random (BACKLOG)
**Goal:** When moving a card to the draw pile, let the player choose insertion position
**Requirements:** TBD — simple server change; UX needs a modal/context menu post-drop
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.3: Play area card grid for poker-style games (BACKLOG)
**Goal:** Replace the play area pile with a 2D grid so cards can be positioned spatially (e.g. Texas Hold'em board)
**Requirements:** TBD — cards need 2D coordinates; server stores positions; collision detection changes
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.4: Personal player tableau visible to all (BACKLOG)
**Goal:** Each player has a personal play area in front of them where they can place cards face-up or face-down, visible to all players
**Requirements:** TBD — new per-player field zone on server; board renders each player's field
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.5: Shuffle visual indicator (BACKLOG)
**Goal:** Show a brief animation or green checkmark on the pile after a shuffle completes, so players get clear visual feedback that the shuffle happened
**Requirements:** TBD — client-side only; server could emit a SHUFFLED event or client detects order change
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.6: Investigate test setup treating both players as remote (BACKLOG)
**Goal:** Investigate observed behavior where the test suite appears to put both players in a "remote" state — may indicate player identity or viewFor masking is applied incorrectly in tests
**Requirements:** TBD — needs reproduction and root cause analysis before scoping
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.7: README and architecture documentation (BACKLOG)
**Goal:** Add a README with link to a DESIGN/ARCHITECTURE document; the architecture doc should cover file layout and include plantUML/mermaid diagrams
**Requirements:** TBD — documentation only, no code changes
**Plans:** 1 plan
Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Server Foundation | 3/3 | Complete | 2026-04-02 |
| 2. Lobby + Room Join | 3/3 | Complete | 2026-04-03 |
| 3. Core Board | 3/3 | Complete | 2026-04-04 |
| 4. Game Controls | 3/3 | Complete | 2026-04-05 |
| 5. Resilience + Polish | 3/3 | Complete | 2026-04-05 |
| 6. Functional Tech Debt | 1/1 | Complete   | 2026-04-10 |
| 7. Nyquist Validation | 1/1 | Complete   | 2026-04-10 |
| 8. Documentation Housekeeping | 1/1 | Complete   | 2026-04-10 |
