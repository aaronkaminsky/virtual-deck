# Requirements: Virtual Deck

**Defined:** 2026-04-12
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1.1 Requirements

Requirements for the v1.1 milestone. Each maps to a roadmap phase.

### Player Identity & Presence

- [ ] **PRES-01**: Player can enter a display name when joining a room (non-empty, max 20 chars)
- [ ] **PRES-02**: Display name is visible to all players on the table
- [ ] **PRES-03**: Display name persists across reconnects
- [ ] **PRES-04**: All players see a real-time roster of connected and disconnected players

### Gameplay

- [ ] **GAME-01**: Dealing from a pile automatically shuffles that pile before distributing cards

### Dialog UX

- [ ] **UX-01**: Dropping a card onto an empty pile skips the position dialog (card always goes to top)
- [x] **UX-02**: Pile drop dialog — Escape key cancels and returns card to origin — ✓ Phase 999.11
- [x] **UX-03**: Pile drop dialog — Enter key confirms Top (the default option) — ✓ Phase 999.11

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Differentiation

- **DIFF-01**: Named pile labels configurable per session
- **DIFF-02**: Action log showing last N moves
- **DIFF-03**: Spectator mode — 5th+ person can observe without playing

### Advanced Interaction

- **ADV-01**: Drag entire piles — move all cards from one pile to another in a single gesture (e.g., sweep Play Area to Discard Pile)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rule enforcement / turn order | Preserves flexibility of in-person play; rules vary by game |
| Score tracking | Honor system; every game scores differently |
| In-app chat | Players use voice/video separately |
| Accounts / auth | Room link is the only access control |
| Card art configurator UI | Rare operation; avoids UI complexity and asset infrastructure |
| Mobile-first layout | Drag-and-drop UX is significantly worse on touch |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRES-01 | Phase 9 | Pending |
| PRES-02 | Phase 9 | Pending |
| PRES-03 | Phase 9 | Pending |
| PRES-04 | Phase 9 | Pending |
| GAME-01 | Phase 10 | Pending |
| UX-01 | Phase 11 | Pending |
| UX-02 | Phase 999.11 | Complete |
| UX-03 | Phase 999.11 | Complete |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-17 — traceability table populated after v1.1 roadmap creation*
