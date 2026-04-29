---
phase: 15
slug: multi-card-set-play
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-27
audited: 2026-04-28
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 (unit) + Playwright 1.59.1 (e2e) |
| **Config file** | none standalone — runs via `vitest` which auto-detects |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npx playwright test` |
| **Estimated runtime** | ~30s (unit) + ~60s (e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | PLAY-03 | T-15-01 | fromId validates sender token | unit | `npm test -- tests/playCardSet.test.ts` | ✅ tests/playCardSet.test.ts:45 | ✅ green |
| 15-01-02 | 01 | 1 | PLAY-03 | T-15-01 | All cardIds exist in hand before any mutation | unit | `npm test -- tests/playCardSet.test.ts` | ✅ tests/playCardSet.test.ts:69 | ✅ green |
| 15-02-01 | 02 | 1 | PLAY-03 | — | Selection ring + lift visible on selected cards | e2e | `npx playwright test --grep "selection toggle"` | ✅ playwright/game.spec.ts:142 | ✅ green |
| 15-03-01 | 03 | 2 | PLAY-03 | — | Multi-card drag moves all selected to target zone | e2e | `npx playwright test --grep "multi-card set play"` | ✅ playwright/game.spec.ts:166 | ✅ green |
| 15-03-02 | 03 | 2 | PLAY-03 | — | Both players see moved cards in real time | e2e | `npx playwright test --grep "multi-card set play"` | ✅ playwright/game.spec.ts:166 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/playCardSet.test.ts` — 5 unit tests covering auth gate, CARD_NOT_IN_SOURCE, faceUp inheritance, happy path, undo round-trip
- [x] `playwright/game.spec.ts` — stale `spread-zone-spread-communal` removed; `selection toggle` and `multi-card set play` e2e tests added and green

*Existing infrastructure (vitest + playwright) covers phase requirements — no new framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag preview ghost (stacked vs single-card fallback) | PLAY-03 | Visual rendering requires human judgment | Drag 3 selected cards; verify ghost shows stacked card visual or single-card fallback |
| Selection badge count renders correctly | PLAY-03 | Visual UI element | Select 2 cards; verify "2 selected" badge appears near hand label |
| Escape key clears selection | PLAY-03 | Keyboard interaction | Select cards, press Escape; verify all deselected |
| Click-outside clears selection | PLAY-03 | Pointer interaction outside component | Select cards, click board area; verify all deselected |

---

## Validation Audit 2026-04-28

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 5 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-28
