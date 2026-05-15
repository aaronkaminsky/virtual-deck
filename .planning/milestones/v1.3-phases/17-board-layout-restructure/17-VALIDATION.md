---
phase: 17
slug: board-layout-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | SPREAD-04 | — | N/A | unit + e2e | `npm test` (unit); `npm run test:e2e` (drag behavior) | ❌ Wave 0 (new e2e case) | ⬜ pending |
| 17-02-01 | 02 | 2 | LAYOUT-01 | — | N/A | visual/e2e | `npm run test:e2e` | ❌ Wave 0 (new e2e case) | ⬜ pending |
| 17-02-02 | 02 | 2 | LAYOUT-02 | — | N/A | manual | Manual: verify 1080p viewport, no scrollbar | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright/game.spec.ts` — add spread zone drag test covering SPREAD-04 (drag a card from spread zone to hand zone, verify no ghost events / misfires)
- [ ] `playwright/game.spec.ts` — add communal zone visibility test covering LAYOUT-01 (communal zone renders in center row, not bottom bar)

*Note: Existing file exists; new test cases needed within it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All zones visible without scrolling at 1080p | LAYOUT-02 | CSS layout height cannot be asserted via unit test; requires real viewport | Open app at 1080p, confirm no scrollbar; all 5 bands visible simultaneously |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
