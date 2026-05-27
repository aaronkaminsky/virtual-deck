---
phase: 31
slug: migration
status: gap-closure
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-23
updated: 2026-05-23
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run typecheck` clean

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-W0-01 | W0 | 0 | MIGRATE-01 | — | N/A | unit | `npm test -- tests/gridRemoval.test.ts` | ✅ | ✅ green |
| 31-01 | server | 1 | MIGRATE-01 | — | N/A | unit | `npm test` | ✅ | ✅ green |
| 31-02 | types | 1 | MIGRATE-01 | — | N/A | typecheck | `npm run typecheck` | ✅ | ✅ green |
| 31-03 | client | 1 | MIGRATE-01 | — | N/A | typecheck | `npm run typecheck` | ✅ | ✅ green |
| 31-04 | layout | 2 | MIGRATE-02 | — | N/A | manual | Visual verification | — | ✅ green |
| 31-05 | tests | 2 | MIGRATE-01 | — | N/A | unit | `npm test` | ✅ | ✅ green |
| 31-06 | e2e | 2 | MIGRATE-02 | — | N/A | e2e | `npm run test:e2e` | ✅ | ✅ green |
| 31-07 | reset | 3 | MIGRATE-03 | — | N/A | unit | `npm test -- tests/resetTable.test.ts` | ✅ | ✅ green |
| 31-04-T1 | 04 (gap) | 4 | MIGRATE-02 | T-31-10 | N/A | unit+typecheck | `grep -c "self-stretch flex flex-col justify-center" src/components/BoardView.tsx && npm run typecheck && npm test` | ✅ | ⬜ pending |
| 31-04-T2 | 04 (gap) | 4 | MIGRATE-02 | T-31-11 | N/A | unit+typecheck | `grep -c "items-center px-2 py-2 overflow-x-auto bg-secondary" src/components/SpreadZone.tsx && npm run typecheck && npm test` | ✅ | ⬜ pending |
| 31-05-T1 | 05 (gap) | 4 | MIGRATE-02 | T-31-12 | N/A | unit+e2e | `grep -c "handCardIds" src/components/HandZone.tsx; npm run typecheck && npm test` | ✅ | ⬜ pending |
| 31-06-T1 | 06 (gap) | 5 | MIGRATE-02 | T-31-15 | N/A | manual | Human re-verification of GAP-01, GAP-02, GAP-03 | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gridRemoval.test.ts` — stubs verifying: (a) `defaultGameState` has no 'play' pile, (b) unknown action `MOVE_GRID_CARD` does not crash the server

*Note: `tests/gridMove.test.ts` and `tests/gridZoneFaceToggle.test.ts` are DELETED (they test behavior that no longer exists), not migrated.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Draw + discard piles render in fixed left sidebar, vertically stacked | MIGRATE-02 | Visual layout; no DOM assertion for visual position | Start dev server, join game, confirm sidebar has two stacked pile zones at left |
| Canvas shell renders to right of sidebar, fills remaining horizontal space | MIGRATE-02 | Visual layout | Confirm canvas area is empty felt, takes remaining width |
| Sidebar stays visible at 375px viewport | D-03 | Responsive layout | Resize browser to 375px, confirm both piles remain visible |
| **(GAP-01)** Hand drop zone does not activate before pointer enters visible strip | MIGRATE-02 | Collision detection timing; no automated assertion for "early" highlight | Drag from discard downward — hand zone must not highlight until pointer enters hand strip |
| **(GAP-02)** SpreadZone populated slot has symmetric vertical padding | MIGRATE-02 | Visual spacing; no DOM assertion for perceived balance | Inspect spread zone with cards — bg-secondary slot should have equal top/bottom breathing room |
| **(GAP-03)** Sidebar spans full middle-band height with piles vertically centered | MIGRATE-02 | Visual layout; centering is perceptual not numerically pinnable | Confirm sidebar fills full band height and piles appear centered, not top-pinned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
