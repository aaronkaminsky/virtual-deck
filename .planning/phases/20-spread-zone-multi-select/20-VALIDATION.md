---
phase: 20
slug: spread-zone-multi-select
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | SPREAD-01 | — | N/A | manual | — | manual only | ⬜ pending |
| 20-01-02 | 01 | 1 | SPREAD-01 | — | Escape clears selectedIds + selectionSource | unit | `npm test -- --run tests/boardDragLayerSelection.test.ts` | ❌ Wave 0 | ⬜ pending |
| 20-02-01 | 02 | 2 | SPREAD-03 | T-20-01 | pile-source PLAY_CARD_SET moves cards to pile | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-02-02 | 02 | 2 | SPREAD-03 | T-20-02 | pile-source PLAY_CARD_SET moves cards to hand (D-06) | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-02-03 | 02 | 2 | SPREAD-03 | T-20-03 | pile-source rejected if pile not found | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-02-04 | 02 | 2 | SPREAD-03 | T-20-04 | toZone:'hand' sets card.faceUp=true | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/boardDragLayerSelection.test.ts` — unit tests for selectionSource state machine (toggle, zone-switch, escape) for SPREAD-01

*Note: If `@testing-library/react` is not installed (check `node_modules/@testing-library`), the selectionSource state tests must be manual-UAT only. The planner should verify this and adjust Wave 0 accordingly.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual selection ring + lift on spread card | SPREAD-01 | Pure CSS visual — no automated assertion | Click a spread zone card; verify ring-1 ring-primary/30 ring and translateY(-6px) lift appear |
| "N selected" badge appears in spread zone header | SPREAD-01 | DOM render of badge text — manual UI check | Select 2+ cards in a spread zone; verify badge reads "2 selected" (or appropriate count) |
| Opponent personal spread zone is drop-only | D-07 | Drag behavior — no automated check for drag start prevention | Attempt to drag from an opponent spread zone; no drag ghost should appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
