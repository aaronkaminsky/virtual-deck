---
phase: 30
slug: layout-restructure-dock-spread-zones
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 30 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client UI → DndContext | Drag gestures cross from DOM events into dnd-kit; stale droppable rects could mis-route drops | Pointer coordinates, droppable IDs |
| client UI → PartyKit server | sendAction payloads (MOVE_CARD, REORDER_PILE_SPREAD) cross WebSocket; mis-routed drop = wrong server mutation | Card IDs, pile IDs, player IDs |
| Playwright pointer events → dnd-kit DndContext | Real browser drag pipeline; only test layer that exercises pointer sensors, droppable measurement, and useDndMonitor subscriptions | DOM events, console messages |
| Playwright client → PartyKit dev server | Drag triggers sendAction(MOVE_CARD) over WebSocket | Card and hand counts |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-01 | Tampering | DndContext droppable rects | mitigate | `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` added to DndContext in BoardDragLayer.tsx (commit db4b375); re-measures droppable bounds on every drag, eliminating stale-rect drift from DOM restructure | closed |
| T-30-02 | Information Disclosure | Opponent SpreadZone in board area | accept | DOM node moved, `interactive={false}` unchanged, server-side hand masking contract unchanged; no new information surface | closed |
| T-30-03 | Denial of Service | flex-shrink behavior on short viewports | mitigate | Opponent spread row uses `flex-shrink-0` (D-06); spread columns cannot be squeezed off-screen; verified by Task 2 AC (commit e04116e) | closed |
| T-30-04 | Repudiation | Wrong drop target after DOM restructure | mitigate | Playwright e2e test (Plan 30-02, commit be76011) drags card from hand to personal spread and asserts correct landing; behavioral assertion `handZone count 5→4` catches MOVE_CARD routing failures | closed |
| T-30-05 | Spoofing | n/a | accept | Phase makes no identity-related changes | closed |
| T-30-06 | Elevation of Privilege | n/a | accept | Phase makes no permission-related changes; SpreadZone interactivity unchanged | closed |
| T-30-07 | Tampering | DOM duplicate IDs (useDndMonitor subscription loss) | mitigate | Console-warning scrub in new e2e test filters `/duplicate id\|multiple elements with the same id/i` and asserts length 0; guards D-08 failure mode | closed |
| T-30-08 | Repudiation | Drag does not produce server MOVE_CARD (stale rect or re-mounted key) | mitigate | Behavioral assertion `handZone count after drag == 4` in e2e test catches failures; combined with MeasuringStrategy.Always (T-30-01) and stable `key={id}` props in spread row | closed |
| T-30-09 | Tampering | Structural regression — spread moved back to header via CSS-only fix | mitigate | Structural assertion `spreadBox.y > headerBox.y + headerBox.height` in e2e test enforces actual DOM topology required by LAYOUT-05 | closed |
| T-30-10 | Denial of Service | Test flakiness from dev-server not running blocks PR pre-push | accept | Pre-push hook already handles "servers down" with a reminder rather than a hard failure; documented in CLAUDE.md | closed |
| T-30-11 | Information Disclosure | n/a | accept | Test reads only DOM data already visible on P1's page; no cross-player data inspection | closed |
| T-30-12 | Elevation of Privilege | n/a | accept | Test exercises existing user-facing drag; no privilege changes | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-30-01 | T-30-02 | DOM node moved, `interactive={false}` and server-side hand masking contract unchanged; no new information surface | gsd-secure-phase | 2026-05-22 |
| AR-30-02 | T-30-05 | Phase makes no identity-related changes | gsd-secure-phase | 2026-05-22 |
| AR-30-03 | T-30-06 | Phase makes no permission-related changes; SpreadZone interactivity unchanged | gsd-secure-phase | 2026-05-22 |
| AR-30-04 | T-30-10 | Pre-push hook handles "servers down" with reminder; test flakiness risk is low and operationally managed | gsd-secure-phase | 2026-05-22 |
| AR-30-05 | T-30-11 | Test reads only DOM data already visible on P1's page; no cross-player data inspection | gsd-secure-phase | 2026-05-22 |
| AR-30-06 | T-30-12 | Test exercises existing user-facing drag; no privilege changes | gsd-secure-phase | 2026-05-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 12 | 12 | 0 | gsd-secure-phase (short-circuit: register_authored_at_plan_time=true, threats_open=0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
