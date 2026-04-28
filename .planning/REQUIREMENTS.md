# Requirements: Virtual Deck

**Defined:** 2026-04-20
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1.2 Requirements

Requirements for milestone v1.2: Dev Infrastructure & Game Depth.

### Dev Infrastructure

- [ ] **DEV-01**: Developer can use Playwright MCP in Claude Code sessions via a committed `.mcp.json` (project-scoped)
- [ ] **DEV-02**: Playwright e2e test suite covers 2-player sync, deal, pass card, and reset table scenarios
- [ ] **DEV-03**: README documents local setup, architecture overview, and deploy instructions (developer-facing)
- [ ] **DEV-04**: Unit test mock helpers correctly model local vs remote player; `viewFor` masking is tested for sender and recipients

### Gameplay Zones

- [ ] **PLAY-01**: Each connected player has a personal spread zone — all cards visible simultaneously (fanned/spread, not stacked), with a face-up/face-down toggle control like existing piles
- [ ] **PLAY-02**: A shared communal spread zone exists on the table — all cards visible simultaneously, with a face-up/face-down toggle; any player can place or move cards
- [x] **PLAY-03**: Player can select 1–5 cards from their hand and play them as a set into their personal zone or the communal zone in one action

## Future Requirements

Requirements acknowledged but deferred beyond v1.2.

### Gameplay Zones (deferred)

- **PLAY-04**: Drag-based multi-card selection (dnd-kit multi-drag overlay) — deferred; select-then-button is sufficient for v1.2
- **PLAY-05**: Visual set grouping / separator in spread zone — distinguishes one player's play from another's in the communal zone
- **PLAY-06**: Action log showing "Player X played N cards"

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rule enforcement (legal set validation) | No game logic — sandbox; rules vary by game |
| Drag-based multi-select | Complex dnd-kit customization; select-then-button is sufficient |
| Player-facing README / how-to-play | Developer-facing only for v1.2 |
| Mobile-first layout | Drag-and-drop UX significantly worse on touch |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEV-04 | Phase 12 | Pending |
| DEV-01 | Phase 13 | Pending |
| DEV-02 | Phase 13 | Pending |
| PLAY-01 | Phase 14 | Pending |
| PLAY-02 | Phase 14 | Pending |
| PLAY-03 | Phase 15 | Complete |
| DEV-03 | Phase 16 | Pending |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 — traceability filled after v1.2 roadmap creation*
