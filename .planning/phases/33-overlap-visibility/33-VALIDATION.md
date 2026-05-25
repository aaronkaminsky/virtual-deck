---
phase: 33
slug: overlap-visibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-24
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | OVERLAP-01 | — | N/A — pure rendering | manual | N/A (jsdom cannot test CSS z-index hit-testing) | N/A | ⬜ pending |
| 33-01-02 | 01 | 1 | OVERLAP-02 | — | N/A — visual only | manual | N/A (opacity is a visual-only check) | N/A | ⬜ pending |
| 33-02-01 | 02 | 1 | OVERLAP-03 | — | N/A | unit | `npm test -- --reporter=verbose tests/overlapUtils.test.ts` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 1 | OVERLAP-03 | — | N/A | unit | `npm test -- --reporter=verbose tests/overlapUtils.test.ts` | ❌ W0 | ⬜ pending |
| 33-02-03 | 02 | 2 | OVERLAP-03 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/overlapUtils.test.ts` — unit tests for `coversMajority()` boundary cases (0% overlap, 50% exactly, 51%, 100%), `STACK_SHADOW` constant value, and `coveringIds` set membership for a 3-card scenario. Covers OVERLAP-03.

*Existing infrastructure covers OVERLAP-01 and OVERLAP-02 (manual/visual-only behaviors).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clicking at overlap point targets topmost card (higher z-index) | OVERLAP-01 | jsdom does not implement CSS stacking context or pointer hit-testing; behavior is a browser rendering guarantee from Phase 32 z-index implementation | In dev env: overlap two cards, click the top one, verify it activates; click the bottom card's exposed edge, verify it activates |
| Dragging card renders at ~50% opacity | OVERLAP-02 | Visual-only; jsdom cannot verify CSS opacity on a React portal (DragOverlay) | In dev env: drag any card on canvas, verify it appears semi-transparent |
| Shadow indicator appears/disappears at 50% coverage threshold | OVERLAP-03 | Visual integration check; unit tests cover the computation, not the rendered output | In dev env: place one card over another, slide it to cross the 50% threshold, verify shadow appears/disappears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
