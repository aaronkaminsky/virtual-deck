---
phase: 21
slug: phase-14-live-session-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + HUMAN-UAT.md complete
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 0 | SPREAD-02 SC3 | — | N/A | unit (server) | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 0 | SPREAD-02 SC2 | — | N/A | unit (pure logic) | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 1 | SPREAD-02 SC2 | — | N/A | manual | HUMAN-UAT.md | manual only | ⬜ pending |
| 21-02-02 | 02 | 1 | SPREAD-02 SC3 | — | N/A | unit (server) | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 1 | SPREAD-02 SC2 | — | N/A | manual | HUMAN-UAT.md | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/reorderUndo.test.ts` — stubs for SPREAD-02 SC3 (server undo for REORDER_PILE_SPREAD and REORDER_HAND)
- [ ] `tests/groupReorder.test.ts` — stubs for SPREAD-02 SC2 (pure logic group reorder algorithm)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Selection preserved through intra-zone drag-start | SPREAD-02 SC2 | dnd-kit drag simulation requires real DOM + pointer events — no Vitest node env support | See HUMAN-UAT.md step: select 2+ cards, drag one within the same spread zone, verify selection badge stays |
| Selection preserved through intra-zone drag-end | SPREAD-02 SC2 | Same as above | See HUMAN-UAT.md step: verify selection count unchanged after completing the drag |
| Group reorder feel — cards land in expected position | SPREAD-02 SC2 | Visual/positional correctness requires live interaction | See HUMAN-UAT.md step: drag selected block, verify relative order preserved and all selected cards moved |
| SC1 — reorder order visible to all players | SPREAD-02 SC1 | Requires multi-player live session | See HUMAN-UAT.md step: open two browser tabs, reorder spread zone in one, verify order in other |
| Undo feel — reorder reversal feels natural | SPREAD-02 SC3 | UX quality judgment requires live interaction | See HUMAN-UAT.md step: reorder then press Undo, verify cards return to previous positions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
