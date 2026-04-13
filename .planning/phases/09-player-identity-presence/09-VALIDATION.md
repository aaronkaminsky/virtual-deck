---
phase: 9
slug: player-identity-presence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 9 — Validation Strategy

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
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | PRES-01 | — | N/A | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | PRES-02 | — | N/A | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | PRES-03 | — | N/A | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 2 | PRES-04 | — | N/A | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/displayName.test.ts` — stubs for PRES-01 (name validation), PRES-02 (viewFor includes displayName), PRES-03 (onConnect reads ?name=, reconnect preserves name)

*Existing `reconnect.test.ts` and `viewFor.test.ts` cover PRES-04 connection toggle mechanics — no new file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Join gate UI displays on fresh page load | PRES-01 | Browser UI flow | Open app, verify name input appears before board, enter name and join |
| Display name appears next to hand/seat | PRES-02 | Visual layout | Join with 2+ players, verify each seat shows correct name |
| Live roster shows connected/disconnected state | PRES-04 | Real-time behavior | Have one player disconnect and verify others see state change |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
