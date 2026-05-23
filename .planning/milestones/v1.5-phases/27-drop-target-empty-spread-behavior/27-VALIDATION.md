---
phase: 27
slug: drop-target-empty-spread-behavior
status: complete
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-22
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- tests/opponentHandDropTarget.test.ts tests/spreadZoneEmptyStrip.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/opponentHandDropTarget.test.ts tests/spreadZoneEmptyStrip.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | CTRL-06 | T-27-02 | Drop-target border is hover-only; no dashed outline or size-expand at drag-start | source-contract | `npm test -- tests/opponentHandDropTarget.test.ts` | ✅ | ✅ green |
| 27-01-02 | 01 | 1 | LAYOUT-06 | — | Empty personal spread zone shows faint dashed strip at rest; not invisible | source-contract | `npm test -- tests/spreadZoneEmptyStrip.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag card over opponent hand zone — solid amber border appears only on hovered zone | CTRL-06 | Requires live dnd-kit pointer event; not simulatable in source-contract tests | Start `npm run dev` + `npm run dev:client`. Drag a card from own hand toward an opponent hand zone. Confirm: no zones highlight at drag-start; only the zone physically under the cursor shows a solid amber border |
| "Drop to pass" text hint visible on empty opponent hand during drag | CTRL-06 (D-03) | Requires live render with empty cardCount | During drag, hover over an opponent hand zone that has 0 cards. Confirm "Drop to pass" text appears |
| Empty spread zone faint strip visible at rest | LAYOUT-06 | Requires visual inspection in browser | Open a session with an empty personal spread zone. Confirm a faint ¼-height dashed strip is visible (not invisible) |
| Drag over empty spread zone — strip expands to full drop-target | LAYOUT-06 | Requires live isOver signal from dnd-kit | Drag a card over own empty personal spread zone. Confirm it expands to full affordance with amber dashed border |

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

Both requirements (CTRL-06, LAYOUT-06) had test files already committed from phase execution. 12 source-contract assertions across 2 test files, all green. Full suite: 226 tests, 31 files, all pass.
