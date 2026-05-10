---
phase: 20
slug: spread-zone-multi-select
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 20-02-T1 | 02 | 1 | SPREAD-01 | — | N/A | manual | — | manual only | ⬜ pending |
| 20-02-T2 | 02 | 1 | SPREAD-01 | — | Escape clears selectedIds + selectionSource | manual-UAT | Plan 04 checkpoint (Test 3) | manual only — @testing-library/react not installed | ⬜ pending |
| 20-01-T2 | 01 | 1 | SPREAD-03 | T-20-01 | pile-source PLAY_CARD_SET moves cards to pile | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-01-T2 | 01 | 1 | SPREAD-03 | T-20-02 | pile-source PLAY_CARD_SET moves cards to hand (D-06) | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-01-T2 | 01 | 1 | SPREAD-03 | T-20-03 | pile-source rejected if pile not found | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |
| 20-01-T2 | 01 | 1 | SPREAD-03 | T-20-04 | toZone:'hand' sets card.faceUp=true | unit | `npm test -- --run tests/playCardSet.test.ts` | ✅ extend | ⬜ pending |

**Task ID format:** `{phase}-{plan}-T{task-number}` where plan matches the PLAN.md file number (01, 02, 03...) and task-number is the task position within that plan.

**Plan 01** (20-01-PLAN.md, Wave 1): server/types work — types.ts widen (T1), test RED state (T2), handler extend GREEN (T3). Server unit tests live here.

**Plan 02** (20-02-PLAN.md, Wave 1): SpreadZone UI work — SortableSpreadCard + interactive prop (T1), badge + zone prop threading (T2). Visual/manual checks live here.

**Plan 03** (20-03-PLAN.md, Wave 2): wiring — BoardDragLayer selectionSource + handleToggleSelect (T1), BoardView/HandZone prop threading (T2). Covers SPREAD-01 and SPREAD-03 integration; all typecheck + test-suite automated.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is complete. `@testing-library/react` is not installed in this project (`node_modules/@testing-library` does not exist). Component-level unit tests for the `selectionSource` state machine (toggle, zone-switch, escape) are therefore not feasible without adding a new dev dependency. These behaviors are covered by the Plan 04 manual UAT checkpoint (Tests 3 and 4), which provides equivalent signal at the cost of automation.

*Note: If `@testing-library/react` is added in a future phase, `tests/boardDragLayerSelection.test.ts` should be created at that time.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual selection ring + lift on spread card | SPREAD-01 | Pure CSS visual — no automated assertion | Click a spread zone card; verify ring-1 ring-primary/30 ring and translateY(-6px) lift appear |
| "N selected" badge appears in spread zone header | SPREAD-01 | DOM render of badge text — manual UI check | Select 2+ cards in a spread zone; verify badge reads "2 selected" (or appropriate count) |
| Opponent personal spread zone is drop-only | D-07 | Drag behavior — no automated check for drag start prevention | Attempt to drag from an opponent spread zone; no drag ghost should appear |
| selectionSource state machine (toggle, zone-switch, escape) | SPREAD-01 | @testing-library/react not installed — component tests not available | Plan 04 checkpoint Tests 3 and 4 cover zone-exclusive selection and Escape clearing |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or formally declared manual-UAT justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (20-02-T1 and 20-02-T2 are both manual; next task 20-01-T2 has automated)
- [x] Wave 0 complete — @testing-library/react absent; selectionSource tests declared manual-UAT with Plan 04 coverage
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
