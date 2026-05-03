# Requirements: Virtual Deck v1.3 Layout & UX Polish

## Milestone Goal

Redesign the board so it reads as a shared physical space — communal zone centered, controls out of the way, spread zones as interactive as the player hand, and the whole thing usable on a phone screen.

## v1.3 Requirements

### Layout

- [x] **LAYOUT-01**: Player can view the communal spread zone physically centered on the board, between opponent zones (top) and their own hand (bottom)
- [x] **LAYOUT-02**: Board vertical proportions give all zones usable space without scrolling on a standard 1080p desktop viewport
- [ ] **LAYOUT-03**: Player can access all game controls from a collapsible panel triggered by a single header button; controls are hidden by default
- [ ] **LAYOUT-04**: Board is usable at phone-width screens (≥375px) without horizontal scrolling; pointer/mouse interaction only (no touch drag)

### Spread Zones

- [ ] **SPREAD-01**: Player can click to select multiple cards in a spread zone, with the same visual selection treatment as player hand card selection
- [ ] **SPREAD-02**: Player can drag-reorder cards within a spread zone; reorder behaves correctly when multi-select state is active
- [ ] **SPREAD-03**: Player can drag a selected set of cards from a spread zone to another zone (pile, hand, or another spread zone)
- [x] **SPREAD-04**: Spread zone drag interactions are stable with no event misfires when selection state is active (dnd-kit ID collision between `SortableSpreadCard` and nested `DraggableCard` resolved)

## Future Requirements

Deferred to a later milestone:

- Touch drag-and-drop for mobile — dnd-kit pointer-event work required; deferred to dedicated milestone
- Spread zone face-toggle sync across players — Phase 14 deferred behavior
- Personal spread zone drag-out ownership guard — SPREAD-03 authorization edge case (personal zone cards should only be movable by the zone owner)

## Out of Scope (v1.3)

- Tech debt: hardcoded communal zone ID `"play"`, test helper consolidation, `PLAY_CARD_SET` region guard — backlog for v1.4
- Rule enforcement, score tracking, turn indicators, chat — project-level exclusions
- Full dnd-kit multi-drag (native extension) — using validated select-then-drag pattern instead

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| LAYOUT-01 | Phase 17 | Complete |
| LAYOUT-02 | Phase 17 | Complete |
| LAYOUT-03 | Phase 18 | Pending |
| LAYOUT-04 | Phase 19 | Pending |
| SPREAD-01 | Phase 20 | Pending |
| SPREAD-02 | Phase 21 | Pending |
| SPREAD-03 | Phase 20 | Pending |
| SPREAD-04 | Phase 17 | Complete |

---
*Created: 2026-05-01 — v1.3 milestone planning*
*Updated: 2026-05-01 — phase assignments added*
