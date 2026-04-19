---
phase: 10
slug: shuffle-before-deal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | vitest.config.ts (project root) |
| **Quick run command** | `npx vitest run tests/dealCards.test.ts tests/shufflePile.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dealCards.test.ts tests/shufflePile.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | GAME-01 | — | N/A | unit | `npx vitest run tests/dealCards.test.ts` | ✅ existing | ⬜ pending |
| 10-01-02 | 01 | 1 | GAME-01 | — | N/A | unit | `npx vitest run tests/dealCards.test.ts` | ✅ existing | ⬜ pending |
| 10-01-03 | 01 | 1 | GAME-01 | — | N/A | unit | `npx vitest run tests/dealCards.test.ts` | ✅ existing | ⬜ pending |
| 10-02-01 | 02 | 1 | GAME-01 | — | N/A | unit | `npx vitest run tests/shufflePile.test.ts` | ✅ existing | ⬜ pending |
| 10-03-01 | 03 | 2 | GAME-01 | — | N/A | manual smoke | n/a — requires live WebSocket | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files or framework setup required. New test cases extend `tests/dealCards.test.ts` and `tests/shufflePile.test.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| State arrives after PILE_SHUFFLED for deal path (animation plays before state update) | GAME-01 / D-06 | Requires live WebSocket with real timing; server delay cannot be tested in unit tests | 1. Start `partykit dev` + `npm run dev`. 2. Open two browser tabs, join same room. 3. Deal cards. 4. Observe: card-fan animation plays on both tabs before hand cards appear. 5. Confirm animation completes before state update lands. |
| Card-fan animation visible on all connected clients for both Deal and Shuffle | D-04, D-05, D-07 | Visual verification; requires multi-tab observation | 1. Open 2+ browser tabs in same room. 2. Click Shuffle on any pile. 3. Confirm fan animation plays on all tabs simultaneously. 4. Click Deal. 5. Confirm same animation plays before cards move to hands. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
