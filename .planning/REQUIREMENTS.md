# Requirements: Virtual Deck

**Defined:** 2026-03-28
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1 Requirements

### Room

- [ ] **ROOM-01**: Player can create a room and receive a shareable link/code to send to friends
- [ ] **ROOM-02**: Player can join a room by entering a room code or opening a shared link
- [ ] **ROOM-03**: Room supports 2–4 simultaneous players
- [ ] **ROOM-04**: Player can rejoin a room after disconnect and their private hand is restored

### Deck

- [ ] **DECK-01**: Room initializes with a standard 52-card deck
- [ ] **DECK-02**: Deck shuffle uses cryptographically random randomization (Fisher-Yates + crypto.getRandomValues, server-side)
- [ ] **DECK-03**: Card face and back art is swappable via code change — no UI required

### Table

- [ ] **TABLE-01**: Shared table supports multiple configurable pile/zone types (draw pile, discard pile, open play area)
- [ ] **TABLE-02**: Card count is visible to all players for each pile on the table
- [ ] **TABLE-03**: Opponent hand card counts are visible to all players (face values are not)

### Cards

- [ ] **CARD-01**: Player can drag-and-drop cards between their hand, table zones, and piles
- [ ] **CARD-02**: Player can draw a card from the top of any pile (shared table pile or their own hand pile)
- [ ] **CARD-03**: Player can flip any card face-up or face-down
- [ ] **CARD-04**: Player can pass a card directly to another player's private hand
- [ ] **CARD-05**: Player's hand is private — other players see only card backs, enforced server-side

### Game Controls

- [ ] **CTRL-01**: Player can deal N cards from a pile to each player's hand
- [ ] **CTRL-02**: Player can shuffle any pile on the table
- [ ] **CTRL-03**: Player can reset the table — all cards collected into the draw pile and reshuffled (starts a new round without page reload)
- [ ] **CTRL-04**: Player can undo their last card move (single-step)

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
| ROOM-01 | — | Pending |
| ROOM-02 | — | Pending |
| ROOM-03 | — | Pending |
| ROOM-04 | — | Pending |
| DECK-01 | — | Pending |
| DECK-02 | — | Pending |
| DECK-03 | — | Pending |
| TABLE-01 | — | Pending |
| TABLE-02 | — | Pending |
| TABLE-03 | — | Pending |
| CARD-01 | — | Pending |
| CARD-02 | — | Pending |
| CARD-03 | — | Pending |
| CARD-04 | — | Pending |
| CARD-05 | — | Pending |
| CTRL-01 | — | Pending |
| CTRL-02 | — | Pending |
| CTRL-03 | — | Pending |
| CTRL-04 | — | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
