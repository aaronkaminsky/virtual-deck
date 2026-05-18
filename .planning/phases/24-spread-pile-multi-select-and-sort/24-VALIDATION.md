---
phase: 24
slug: play-area-grid
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run typecheck`
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | GRID-01 | T-24-01 | `MOVE_GRID_CARD` validates cardId exists in pile before mutating | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | GRID-01 | T-24-02 | `toRow`/`toCol` validated in range [0,1] / [0,6] before writing | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | GRID-01 | — | `MOVE_CARD` to 'play' assigns `gridPositions` when toRow/toCol present | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 1 | GRID-01 | — | `MOVE_CARD` out of 'play' deletes `gridPositions[cardId]` | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-05 | 01 | 1 | GRID-01 | — | `RESET_TABLE` clears `gridPositions` on play pile | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-06 | 01 | 1 | GRID-01 | — | `viewFor` includes `gridPositions` in `ClientPile` output | unit | `npm test -- --reporter=verbose tests/gridMove.test.ts` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 2 | GRID-01 | — | Cell drag highlight + intra-grid drop visual | manual smoke | `npm run test:e2e` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gridMove.test.ts` — stubs for all 6 GRID-01 server behavior test cases

*Existing infrastructure covers all tooling needs — `makeMockRoom`, `makeMockConnection`, and `makeCard` helpers are available from existing test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cell drag-hover highlight (border-primary) | GRID-01 | No JSDOM/RTL setup for React components | Drag a card over the grid; verify hovered cell border turns amber/primary |
| Intra-grid card drag (cell to cell) | GRID-01 | Requires live PartyKit + Vite servers | Drag top card from one cell to another; verify card moves to new cell |
| External card drop into grid | GRID-01 | Requires live servers | Drag card from hand to grid cell; verify card appears in that cell |
| Stacked cell count badge | GRID-01 | React component — no unit test setup | Drop 2 cards in same cell; verify ×2 badge appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
