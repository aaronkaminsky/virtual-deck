---
phase: 26
slug: zero-risk-visual-polish
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | POLISH-05 | T-26-01 | Badge shows count only, not card identity | source-contract | `npm test -- --reporter=verbose` | ✅ `tests/pileZonePolish.test.ts` | ✅ green |
| 26-01-01 | 01 | 1 | POLISH-06 | — | N/A | source-contract | `npm test -- --reporter=verbose` | ✅ `tests/pileZonePolish.test.ts` | ✅ green |
| 26-02-01 | 02 | 1 | CTRL-05 | T-26-03 | Opponent cannot trigger face-toggle via UI — `interactive !== false` guard prevents render | predicate-unit | `npm test -- --reporter=verbose` | ✅ `tests/spreadZoneGuards.test.ts` | ✅ green |
| 26-02-01 | 02 | 1 | LAYOUT-07 | — | N/A | predicate-unit | `npm test -- --reporter=verbose` | ✅ `tests/spreadZoneGuards.test.ts` | ✅ green |
| 26-02-02 | 02 | 1 | CTRL-07 | — | N/A | predicate-unit | `npm test -- --reporter=verbose` | ✅ `tests/gridZoneFaceToggle.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

All test files were created during TDD RED/GREEN cycles as part of plan execution:
- `tests/pileZonePolish.test.ts` — source-contract tests for POLISH-05 and POLISH-06 (created in Plan 01)
- `tests/spreadZoneGuards.test.ts` — predicate-unit tests for CTRL-05 and LAYOUT-07 (created in Plan 02)
- `tests/gridZoneFaceToggle.test.ts` — predicate-unit tests for CTRL-07 (created in Plan 02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Empty pile shows no badge | POLISH-05 | Visual confirmation | Load a game, ensure a pile has 0 cards; verify no badge renders on the pile card |
| Pile with cards shows correct count badge | POLISH-05 | Visual confirmation | Load a game, move cards to a pile; verify badge shows the correct count |
| Controls row is visually 2px from pile card | POLISH-06 | Visual spacing | Load a game with a pile; verify the controls row (eye, shuffle, select-all) visually sits closer to the pile card |
| Opponent spread zone shows no face-toggle | CTRL-05 | Requires 2-player session | In a 2-player game, view an opponent's spread zone; verify no face-toggle button is visible |
| Own spread zone shows face-toggle | CTRL-05 | Requires 2-player session | In a 2-player game, view your own spread zone; verify face-toggle button is present and functional |
| GridZone face-toggle is inline-right of "Play Area" label | CTRL-07 | Visual layout | Load a game; verify the eye/eye-off icon is positioned at the right end of the "Play Area" label row |
| Spread zone has no name label | LAYOUT-07 | Visual confirmation | Load a game with a spread zone; verify no name text appears above/near the spread area |
| Selection badge appears only during active multi-selection | LAYOUT-07 | Interaction required | In a spread zone, select 2+ cards; verify selection count badge appears; deselect; verify badge disappears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 5 requirements (POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07) had pre-existing automated test coverage from TDD cycles run during plan execution. 226 tests pass.
