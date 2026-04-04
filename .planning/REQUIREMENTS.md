# Requirements: Virtual Deck

**Defined:** 2026-03-28
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1 Requirements

### Room

- [x] **ROOM-01**: Player can create a room and receive a shareable link/code to send to friends
- [x] **ROOM-02**: Player can join a room by entering a room code or opening a shared link
- [x] **ROOM-03**: Room supports 2–4 simultaneous players
- [ ] **ROOM-04**: Player can rejoin a room after disconnect and their private hand is restored

### Deck

- [x] **DECK-01**: Room initializes with a standard 52-card deck
- [x] **DECK-02**: Deck shuffle uses cryptographically random randomization (Fisher-Yates + crypto.getRandomValues, server-side)
- [x] **DECK-03**: Card face and back art is swappable via code change — no UI required

### Table

- [x] **TABLE-01**: Shared table supports multiple configurable pile/zone types (draw pile, discard pile, open play area)
- [x] **TABLE-02**: Card count is visible to all players for each pile on the table
- [ ] **TABLE-03**: Opponent hand card counts are visible to all players (face values are not)

### Cards

- [x] **CARD-01**: Player can drag-and-drop cards between their hand, table zones, and piles
- [x] **CARD-02**: Player can draw a card from the top of any pile (shared table pile or their own hand pile)
- [x] **CARD-03**: Player can flip any card face-up or face-down
- [x] **CARD-04**: Player can pass a card directly to another player's private hand
- [x] **CARD-05**: Player's hand is private — other players see only card backs, enforced server-side

### Game Controls

- [x] **CTRL-01**: Player can deal N cards from a pile to each player's hand
- [x] **CTRL-02**: Player can shuffle any pile on the table
- [x] **CTRL-03**: Player can reset the table — all cards collected into the draw pile and reshuffled (starts a new round without page reload)
- [x] **CTRL-04**: Player can undo their last card move (single-step)

## v2 Requirements

### Presence

- **PRES-01**: Players set a display name when joining a room
- **PRES-02**: All players can see who is currently connected and disconnected

### Differentiators

- **DIFF-01**: Named pile labels (e.g. "Draw", "Discard") configurable per session
- **DIFF-02**: Action log showing the last N moves visible to all players
- **DIFF-03**: Spectator mode — 5th+ person can observe without playing
- **DIFF-04**: Single-step undo for any player's last move (not just own moves)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rule enforcement / turn order | Constrains which games work; kills "any card game" promise |
| Score tracking | Every game scores differently; honor system |
| In-app chat | Players use voice/video call; chat is clutter |
| Accounts / authentication | Room link is the only access control needed |
| Card art upload UI | Rare operation; swap via code change only |
| Mobile-first layout | Drag-and-drop UX is significantly worse on touch; target desktop |
| Persistent rooms / save state | Rooms expire when all players leave; saved state introduces stale-data bugs |
| AI / bot players | Out of scope for social play use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROOM-01 | Phase 2 | Complete |
| ROOM-02 | Phase 2 | Complete |
| ROOM-03 | Phase 1 | Complete |
| ROOM-04 | Phase 5 | Pending |
| DECK-01 | Phase 1 | Complete |
| DECK-02 | Phase 1 | Complete |
| DECK-03 | Phase 2 | Complete |
| TABLE-01 | Phase 3 | Complete |
| TABLE-02 | Phase 3 | Complete |
| TABLE-03 | Phase 3 | Pending |
| CARD-01 | Phase 3 | Complete |
| CARD-02 | Phase 3 | Complete |
| CARD-03 | Phase 4 | Complete |
| CARD-04 | Phase 4 | Complete |
| CARD-05 | Phase 1 | Complete |
| CTRL-01 | Phase 4 | Complete |
| CTRL-02 | Phase 4 | Complete |
| CTRL-03 | Phase 4 | Complete |
| CTRL-04 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-31 — traceability filled after roadmap creation*
