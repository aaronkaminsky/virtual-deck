# Requirements: Virtual Deck

**Defined:** 2026-05-15
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1.4 Requirements

Requirements for v1.4 Table Polish. Each maps to roadmap phases.

### Hand Management

- [ ] **HAND-01**: Player can toggle their hand face-up to reveal all cards to other players
- [ ] **HAND-02**: Player can toggle their hand face-down to re-hide their cards
- [ ] **HAND-03**: Hand revealed/hidden state is broadcast in real time to all connected players
- [ ] **HAND-04**: Hand revealed state is persisted in server room state so reconnecting players see the correct current state
- [x] **SORT-01**: Player can cycle through hand sort modes: original order, by suit, by rank; sort persisted server-side via REORDER_HAND (does not enter the undo stack)

### Select All

- [ ] **SELECT-01**: Player can click a "Select All" control on any pile to select all cards in it
- [ ] **SELECT-02**: Player can click a "Select All" control on any spread zone to select all cards in it
- [ ] **SELECT-03**: A group selected via "Select All" can be dragged to any valid drop target using existing multi-card drag

### Play Area Grid

- [ ] **GRID-01**: Communal spread zone displays as a 2-row fixed grid; cards snap to column positions; multiple cards can stack per cell; player can drag cards between cells

### Layout & Visual Polish

- [x] **POLISH-01**: Empty piles and spread zones display no body text — label above is sufficient
- [x] **POLISH-02**: Pile zone controls appear at the top of each pile, inline with the label
- [ ] **POLISH-03**: Personal spread zones are positioned closer to the communal/draw/discard area
- [x] **POLISH-04**: Zone heights and spacing are reduced for a more compact board
- [x] **ZONE-01**: Personal spread zones are hidden when empty; a drop target appears when the player begins dragging a card

## Future Requirements

Deferred to future milestones.

### Free Canvas

- **CANVAS-01**: Communal spread zone supports free-canvas mode — cards have arbitrary (x, y) positions within the zone, can overlap freely, and are dragged to any point

## Out of Scope

| Feature | Reason |
|---------|--------|
| Free canvas play area | Too complex for a polish milestone; tracked as CANVAS-01 for future |
| Chips / betting | Separate feature, own milestone |
| Password-protected rooms | Separate feature, own milestone |
| Kick players | Separate feature, own milestone |
| Sound effects | Separate feature, own milestone |
| Editable zone names | Separate feature, own milestone |
| Custom card art | Code-change only by design — no runtime configurator |
| Rule enforcement | Core design constraint — honor system only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HAND-01 | Phase 22 | Pending |
| HAND-02 | Phase 22 | Pending |
| HAND-03 | Phase 22 | Pending |
| HAND-04 | Phase 22 | Pending |
| SORT-01 | Phase 23 | Complete |
| SELECT-01 | Phase 23 | Pending |
| SELECT-02 | Phase 23 | Pending |
| SELECT-03 | Phase 23 | Pending |
| GRID-01 | Phase 24 | Pending |
| POLISH-01 | Phase 25 | Complete |
| POLISH-02 | Phase 25 | Complete |
| POLISH-03 | Phase 25 | Pending |
| POLISH-04 | Phase 25 | Complete |
| ZONE-01 | Phase 25 | Complete |

**Coverage:**
- v1.4 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-15 after v1.4 roadmap creation*
