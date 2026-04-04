---
phase: 3
slug: core-board
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (exists — `tests/**/*.test.ts`, globals: true) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TABLE-01 | unit | `npm test && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | TABLE-02 | unit | `npm test && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | CARD-01 | unit | `npm test && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | CARD-02 | unit | `npm test && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | TABLE-01 | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | TABLE-02 | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | TABLE-03 | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 1 | TABLE-01 | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 1 | TABLE-03 | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 2 | CARD-01 | typecheck + unit | `npm ls @dnd-kit/core && npx tsc --noEmit && npm test` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 2 | CARD-02 | typecheck + unit | `npx tsc --noEmit && npm test` | ✅ | ⬜ pending |
| 03-03-02 | 03 | 2 | TABLE-01 | typecheck | `npx tsc --noEmit && npm test` | ✅ | ⬜ pending |
| 03-03-03 | 03 | 2 | CARD-01 | manual | Visual test via `npm run dev` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/moveCard.test.ts` — stubs for MOVE_CARD server behavior (TABLE-01, TABLE-02, CARD-01, CARD-02)
- [ ] Update `tests/deck.test.ts` — add assertion that `defaultGameState` produces 3 piles (draw, discard, play)

*No new test framework needed — Vitest is already configured. Frontend component testing is manual for Phase 3 (no jsdom environment configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop card from hand to pile | CARD-01 | Requires browser pointer events, no jsdom setup | Start `npm run dev` + `npx partykit dev`, drag card from hand to pile zone |
| Drag-and-drop card from pile to hand | CARD-02 | Requires browser pointer events | Drag top card from Draw pile to hand strip |
| DragOverlay ghost renders without clipping | CARD-01 | Visual rendering, overflow context | Drag card upward from hand, verify ghost not clipped |
| Board transitions from lobby when gameState arrives | TABLE-01 | Full WebSocket lifecycle | Open room URL, verify board appears after connection |
| Opponent hand count updates in real time | TABLE-03 | Multi-tab WebSocket sync | Open 2 tabs, move card in one, verify other updates |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
