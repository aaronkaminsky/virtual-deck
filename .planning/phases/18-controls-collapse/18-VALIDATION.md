---
phase: 18
slug: controls-collapse
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
audited: 2026-05-04
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | LAYOUT-03 | — | N/A | unit | `npm test -- tests/controlsCollapse.test.ts` | ✅ | ✅ green |
| 18-02-01 | 02 | 2 | LAYOUT-03 | T-18-01, T-18-02, T-18-03 | confirmReset cleared on close; parseInt guard; stale-confirm guard | unit + typecheck | `npm test && npm run typecheck` | ✅ | ✅ green |
| 18-02-02 | 02 | 2 | LAYOUT-03 | — | N/A | manual | *(checkpoint:human-verify — see Manual-Only)* | N/A | ✅ approved |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Controls panel closed by default on load | LAYOUT-03 | Visual browser check | Load board, confirm no controls panel visible; click header button, confirm panel opens; click again, confirm panel closes |
| All controls accessible from collapsed panel | LAYOUT-03 | Visual browser check | Open panel, verify deal/shuffle/reset/undo/flip/pass controls present and functional |
| Panel variant matches header bg (ghost, not outline) | LAYOUT-03 | Visual browser check | Confirm hamburger button has no visible border/bg clash with `bg-card` header |
| Reset confirmation clears on outside-click (Pitfall 1) | LAYOUT-03 | Visual browser check | Open panel → click Reset → close via outside-click → reopen → confirm step-1 (not "Are you sure?") |

**Manual smoke approved 2026-05-04** — all 10 items in 18-02 Task 2 verified.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-05-04

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tasks audited | 3 |
| Tests passing | 150 / 150 (full suite), 15 / 15 (controlsCollapse.test.ts) |
