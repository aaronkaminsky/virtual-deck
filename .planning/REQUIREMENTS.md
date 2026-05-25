# Requirements: Virtual Deck

**Defined:** 2026-05-23
**Milestone:** v1.6 Free Canvas Play Area
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1.6 Requirements

### Canvas Core

- [x] **CANVAS-01**: Player can drag a card to any position on the communal canvas; card anchors at the drop point
- [x] **CANVAS-02**: Cancelling a drag returns the card to its pre-drag canvas position
- [x] **CANVAS-03**: Each canvas card stores (x, y, z) in server state; z determines render order (higher z renders on top)
- [x] **CANVAS-04**: Dropping a card onto the canvas makes it topmost (z = max + 1)

### No-Card-Loss

- [x] **NOLOSS-01**: A card dropped outside the canvas and outside any valid drop zone (hand, pile, personal spread) returns to its canvas position automatically

### Overlap & Visibility

- [ ] **OVERLAP-01**: Clicking or dragging targets the highest-z card at any (x, y) point on the canvas; cards beneath are not interactive
- [ ] **OVERLAP-02**: Dragged card renders at ~50% opacity so cards beneath are visible for drop decisions
- [ ] **OVERLAP-03**: Box-shadow layering indicator appears when a card covers >50% of a card below; shadow tracking uses a ref (not state) to avoid per-pointermove re-renders

### Multi-Card Group Drop

- [ ] **MULTI-01**: Player can select multiple canvas cards using click-to-select (same ring/lift UX as hand and spread zones)
- [ ] **MULTI-02**: On group drop, each card lands maintaining its pre-drag offset relative to the drag handle card
- [ ] **MULTI-03**: On group drop, all dropped cards receive z-indices above existing canvas cards; internal z-order is preserved
- [ ] **MULTI-04**: A multi-card group drop is only valid if all cards in the group land within canvas bounds; if any card would overflow, the entire drop is cancelled and all cards return to pre-drag positions

### Mobile

- [ ] **MOBILE-01**: Hold-to-scroll edge arrows appear when canvas content overflows; holding an arrow pans the viewport continuously
- [ ] **MOBILE-02**: Edge-pan does not conflict with one-finger card drag gestures
- [ ] **MOBILE-03**: Canvas height is bounded at <640px viewport width so spread zones remain visible without vertical overlap

### Migration

- [x] **MIGRATE-01**: Communal grid (region: "grid") is fully replaced by the free canvas; no dual-mode fallback
- [x] **MIGRATE-02**: Draw and discard piles live in a fixed left sidebar, vertically stacked (draw pile above discard); the free canvas occupies the remaining horizontal space to the right
- [x] **MIGRATE-03**: Reset table moves all canvas cards to the draw pile

## Future Requirements

Items acknowledged but deferred beyond v1.6.

### Canvas Enhancements

- **CANVAS-F01**: Canvas is scrollable/pannable beyond the initial viewport (infinite or very large bounded canvas)
- **CANVAS-F02**: Card positions persist across room reconnects if all players disconnect simultaneously

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dual-mode grid + canvas | Complexity of maintaining two play area modes; grid fully replaced |
| Anchor-and-clamp for out-of-bounds group drops | All-or-nothing rule chosen for simplicity; no partial placement |
| Floating piles on canvas | Piles anchored in sidebar for spatial stability |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANVAS-01 | Phase 32 | Complete |
| CANVAS-02 | Phase 32 | Complete |
| CANVAS-03 | Phase 32 | Complete |
| CANVAS-04 | Phase 32 | Complete |
| NOLOSS-01 | Phase 32 | Complete |
| OVERLAP-01 | Phase 33 | Pending |
| OVERLAP-02 | Phase 33 | Pending |
| OVERLAP-03 | Phase 33 | Pending |
| MULTI-01 | Phase 34 | Pending |
| MULTI-02 | Phase 34 | Pending |
| MULTI-03 | Phase 34 | Pending |
| MULTI-04 | Phase 34 | Pending |
| MOBILE-01 | Phase 35 | Pending |
| MOBILE-02 | Phase 35 | Pending |
| MOBILE-03 | Phase 35 | Pending |
| MIGRATE-01 | Phase 31 | Complete |
| MIGRATE-02 | Phase 31 | Complete |
| MIGRATE-03 | Phase 31 | Complete |

**Coverage:**
- v1.6 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 — traceability populated after roadmap creation*
