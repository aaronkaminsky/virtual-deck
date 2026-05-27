---
phase: 32
slug: canvas-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-24
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Wave 0 scaffold | 01 | 0 | CANVAS-01–04, NOLOSS-01 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| PLACE_ON_CANVAS from hand | — | 1 | CANVAS-01 | V4, V5 | cardId in declared fromZone; x/y finite | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| PLACE_ON_CANVAS from canvas | — | 1 | CANVAS-01 | V5 | x/y finite; fromZone='canvas' | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| viewFor includes canvasCards | — | 1 | CANVAS-03 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| z = max + 1 | — | 1 | CANVAS-04 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| First card z = 1 | — | 1 | CANVAS-04 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| NOLOSS invalid cardId | — | 1 | NOLOSS-01 | V5 | Invalid cardId returns error without mutation | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| MOVE_CARD from canvas | — | 1 | CANVAS-01 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| RESET_TABLE canvas sweep | — | 1 | CANVAS-01 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| onStart migration guard | — | 1 | CANVAS-01 | — | N/A | unit | `npm test -- canvasCards` | ❌ W0 | ⬜ pending |
| Drag cancel (no action) | — | 2 | CANVAS-02, NOLOSS-01 | — | N/A | manual-only | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/canvasCards.test.ts` — covers CANVAS-01 through CANVAS-04, NOLOSS-01 (server-side), MOVE_CARD from canvas, RESET_TABLE canvas sweep, onStart migration. Follow the existing `moveCard.test.ts` pattern: `makeMockRoom` + `makeMockConnection` + direct `room.gameState` manipulation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag cancel returns card to original position | CANVAS-02 | No DOM in unit tests; requires pointer interaction | Start drag, press Escape; card must remain at original canvas position |
| `event.over === null` dispatches no action | NOLOSS-01 | Requires full browser drag interaction | Drag canvas card off canvas bounds; card must stay at original position, no error in console |
| Insert dialog appears on canvas→pile drop | CANVAS-01 | Requires visual UI interaction | Drag canvas card onto draw pile; top/bottom/random dialog must appear |
| Other players see updated position in real time | CANVAS-03 | Requires two browser sessions | Move canvas card in one session; verify second session sees new position without reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
