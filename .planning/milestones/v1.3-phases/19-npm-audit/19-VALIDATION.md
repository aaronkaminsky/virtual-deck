---
phase: 19
slug: npm-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vite.config.ts` (Vitest), `playwright.config.ts` |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 0 | LAYOUT-04 | — | N/A | e2e | `npm run test:e2e -- --grep "responsive"` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 19-01-03 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 19-01-04 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 19-01-05 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 19-01-06 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 19-01-07 | 01 | 1 | LAYOUT-04 | — | N/A | typecheck | `npm run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright/responsive.spec.ts` — Playwright test at 375px viewport asserting `document.documentElement.scrollWidth <= clientWidth`

*Wave 0 must exist before Wave 1 CSS changes land so the test can catch regressions immediately.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card drag works at 375px touch | LAYOUT-04 | dnd-kit touch events require real device or browser emulation | Open devtools → iPhone SE preset → drag a card between zones |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
