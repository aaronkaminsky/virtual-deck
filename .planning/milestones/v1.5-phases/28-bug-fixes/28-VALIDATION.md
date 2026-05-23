---
phase: 28
slug: bug-fixes
status: complete
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-22
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~5s (unit) / ~30s (e2e with servers) |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck && npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds (unit); ~30 seconds (e2e)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | BUG-01 | T-28-01 | isSelected is local UI state only; not broadcast | unit / typecheck | `npm run typecheck && npm test` | ✅ | ✅ green |
| 28-01-02 | 01 | 1 | BUG-01 | T-28-01 | selectedIds Set contains no sensitive data | unit / typecheck | `npm run typecheck && npm test` | ✅ | ✅ green |
| 28-01-03 | 01 | 1 | BUG-01 | T-28-01 | prop chain does not expose hand contents | unit / typecheck | `npm run typecheck && npm test` | ✅ | ✅ green |
| 28-01-04 | 01 | 1 | BUG-01 | — | N/A | unit | `npm test -- --reporter=verbose 2>&1 \| grep pileSelectRing` | ✅ `tests/pileSelectRing.test.ts` | ✅ green |
| 28-02-01 | 02 | 1 | BUG-02 | T-28-03 | CSS-only; no data exposure | unit / typecheck | `npm run typecheck && npm test` | ✅ | ✅ green |
| 28-02-02 | 02 | 1 | BUG-02 | — | N/A | e2e | `npm run test:e2e` (requires servers) | ✅ `playwright/responsive.spec.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pile "Select All" shows ring on top card matching SpreadZone | BUG-01 | Visual ring rendering requires browser | Start game, add cards to a pile, click "Select All" — top card shows `ring-1 ring-primary/30` ring |
| Communal grid shows 4 columns at 375px, 7 columns at ≥640px | BUG-02 | CSS computed layout; Playwright test covers class assertion | Open in DevTools at 375px device — verify 4 columns; at full desktop width — verify 7 columns |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (unit suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All requirements (BUG-01, BUG-02) have automated test coverage. 226 unit tests pass. Playwright e2e test for BUG-02 is present in `responsive.spec.ts`. No gaps to fill.
