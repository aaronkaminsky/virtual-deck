# Requirements: Virtual Deck

**Defined:** 2026-05-23
**Milestone:** v1.6 Free Canvas Play Area
**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## v1.6 Requirements

### Canvas Core

- [ ] **CANVAS-01**: Player can drag a card to any position on the communal canvas; card anchors at the drop point
- [ ] **CANVAS-02**: Cancelling a drag returns the card to its pre-drag canvas position
- [ ] **CANVAS-03**: Each canvas card stores (x, y, z) in server state; z determines render order (higher z renders on top)
- [ ] **CANVAS-04**: Dropping a card onto the canvas makes it topmost (z = max + 1)

### No-Card-Loss

- [ ] **NOLOSS-01**: A card dropped outside the canvas and outside any valid drop zone (hand, pile, personal spread) returns to its canvas position automatically

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

- [ ] **MIGRATE-01**: Communal grid (region: "grid") is fully replaced by the free canvas; no dual-mode fallback
- [ ] **MIGRATE-02**: Draw and discard piles live in a fixed left sidebar, vertically stacked (draw pile above discard); the free canvas occupies the remaining horizontal space to the right
- [ ] **MIGRATE-03**: Reset table moves all canvas cards to the draw pile

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

Populated by roadmapper after roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANVAS-01 | — | Pending |
| CANVAS-02 | — | Pending |
| CANVAS-03 | — | Pending |
| CANVAS-04 | — | Pending |
| NOLOSS-01 | — | Pending |
| OVERLAP-01 | — | Pending |
| OVERLAP-02 | — | Pending |
| OVERLAP-03 | — | Pending |
| MULTI-01 | — | Pending |
| MULTI-02 | — | Pending |
| MULTI-03 | — | Pending |
| MULTI-04 | — | Pending |
| MOBILE-01 | — | Pending |
| MOBILE-02 | — | Pending |
| MOBILE-03 | — | Pending |
| MIGRATE-01 | — | Pending |
| MIGRATE-02 | — | Pending |
| MIGRATE-03 | — | Pending |

**Coverage:**
- v1.6 requirements: 18 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 18 ⚠

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 — initial definition for milestone v1.6*
