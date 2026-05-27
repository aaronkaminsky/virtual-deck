---
phase: 35
slug: mobile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:e2e` (requires both dev servers running) |
| **Estimated runtime** | ~10s unit · ~120s e2e |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 0 | MOBILE-01 | — | N/A | playwright | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 1 | MOBILE-01 | — | N/A | playwright | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 1 | MOBILE-02 | — | N/A | playwright | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 35-01-04 | 01 | 1 | MOBILE-03 | — | N/A | playwright | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 2 | MOBILE-01, MOBILE-02 | — | N/A | playwright | `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright/mobile.spec.ts` — covers MOBILE-01 (arrow visibility), MOBILE-01 (hold-to-pan), MOBILE-02 (card drag / pan non-conflict), MOBILE-03 (height cap at 375px)

*No new test infrastructure — Playwright config already supports viewport override via `test.use({ viewport })` (see `playwright/responsive.spec.ts`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exact `max-h` pixel value for canvas height cap | MOBILE-03 | Requires live browser measurement at 375px viewport height to tune; spread zone + hand heights vary by card count | Open DevTools → Set viewport to 375×667 → Verify spread zone and hand are both visible below canvas without scroll; adjust `max-h-[Xpx]` constant until satisfied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
