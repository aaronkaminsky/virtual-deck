---
phase: 14
slug: gameplay-zone-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (e2e) |
| **Config file** | `vite.config.ts` (Vitest embedded) + `playwright.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds (unit) + ~60 seconds (e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds (unit only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-xx-01 | TBD | 1 | PLAY-01, PLAY-02 | — | N/A | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ W0 | ⬜ pending |
| 14-xx-02 | TBD | 1 | PLAY-01 | — | N/A | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ W0 | ⬜ pending |
| 14-xx-03 | TBD | 1 | PLAY-01, PLAY-02 | — | N/A | unit | `npx vitest run tests/moveCard.test.ts` | ✅ extend | ⬜ pending |
| 14-xx-04 | TBD | 1 | PLAY-01, PLAY-02 | — | N/A | unit | `npx vitest run tests/resetTable.test.ts` | ✅ extend | ⬜ pending |
| 14-xx-05 | TBD | 2 | PLAY-01, PLAY-02 | — | N/A | e2e | `npx playwright test --grep "spread zone"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/spreadZoneCreation.test.ts` — stubs covering: personal spread zone created in piles[] on connect, idempotent creation (no duplicate on reconnect), viewFor includes myPlayZoneId, communal zone present in defaultGameState
- [ ] Extend `tests/moveCard.test.ts` — add test that moves a card to a spread zone ID (e.g., `spread-communal`)
- [ ] Extend `tests/resetTable.test.ts` — add spread zones to test piles[] setup, assert spread zone cards are cleared
- [ ] Add Playwright test in `playwright/game.spec.ts` — `test('spread zones visible for both players')` asserting `getByTestId('spread-zone-spread-communal')` and each player's personal zone are visible

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SpreadZone visual cascade layout | PLAY-01, PLAY-02 | CSS rendering cannot be asserted in unit tests | Open board with 3+ cards in a spread zone; verify all cards are simultaneously visible with overlapping fan layout |
| Opponent spread zone in header | PLAY-01 | Requires 2-browser visual check | Open two browser windows; player 1 plays a card to their spread zone; verify player 2 sees it in the header |
| Face-up/face-down toggle on spread zone | PLAY-01, PLAY-02 | Visual state change | Click toggle on spread zone; verify all cards flip face direction |

---

## Existing Tests That Must Continue Passing

Run `npx vitest run` after each change. Key tests that touch modified files:
- `tests/viewFor.test.ts` — must pass with new `myPlayZoneId` field added to ClientGameState
- `tests/resetTable.test.ts` — must collect spread zone cards (requires spread zones in piles[] test setup)
- `tests/moveCard.test.ts` — extend with spread zone target
- `tests/broadcastMasking.test.ts` — must pass; spread zone cards are fully public (no masking needed)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
