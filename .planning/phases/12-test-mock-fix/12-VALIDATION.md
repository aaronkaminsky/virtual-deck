---
phase: 12
slug: test-mock-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DEV-04 | — | N/A | unit | `npm test` | ❌ Wave 0 (tests/helpers.ts) | ⬜ pending |
| 12-01-02 | 01 | 1 | DEV-04 | — | N/A | unit | `npm test` | ❌ Wave 0 (tests/broadcastMasking.test.ts) | ⬜ pending |
| 12-01-03 | 01 | 1 | DEV-04 | — | N/A | unit | `npm test` | ✅ 112 existing tests | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers.ts` — shared `makeMockRoom`/`makeMockConnection`/`makeCard` helpers (covers DEV-04a: getConnections returns populated data)
- [ ] `tests/broadcastMasking.test.ts` — two new tests asserting per-connection masking (covers DEV-04b: remote masked, DEV-04c: local unmasked)

---

## Manual-Only Verifications

*If none: "All phase behaviors have automated verification."*

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
