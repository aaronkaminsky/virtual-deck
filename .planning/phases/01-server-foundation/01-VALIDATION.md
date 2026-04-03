---
phase: 1
slug: server-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (Wave 0 gap — does not yet exist) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

> Note: PartyKit server code runs in the Cloudflare Workers runtime, not Node.js. Unit tests for pure logic (shuffle, viewFor, buildDeck, card ID generation) can run in vitest with no mock needed. Integration tests requiring an actual PartyKit room require `partykit dev` and a WebSocket client — these are manual for Phase 1.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green + manual WebSocket smoke test

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DECK-01 | unit | `npx vitest run tests/deck.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | DECK-02 | unit | `npx vitest run tests/shuffle.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | CARD-05 | unit | `npx vitest run tests/viewFor.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DECK-01 | unit | `npx vitest run tests/deck.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | DECK-02 | unit | `npx vitest run tests/shuffle.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | CARD-05 | unit | `npx vitest run tests/viewFor.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | ROOM-03 | manual | `partykit dev` + wscat | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/deck.test.ts` — stubs for DECK-01: buildDeck(), defaultGameState()
- [ ] `tests/shuffle.test.ts` — stubs for DECK-02: Fisher-Yates, crypto.getRandomValues usage
- [ ] `tests/viewFor.test.ts` — stubs for CARD-05: hand masking, no leakage
- [ ] `vitest.config.ts` — root config pointing at `tests/` directory
- [ ] `src/shared/types.ts` — shared types (required as Wave 0 for all other code to import)
- [ ] `party/index.ts` — server entry point skeleton

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 5th connection rejected | ROOM-03 | Requires live WebSocket connections | `partykit dev`, open 5 wscat clients, verify 5th gets close frame 4000 |
| State survives hibernation | ROOM-03 | Local `partykit dev` may not hibernate; requires deployed env | Deploy to PartyKit Cloud, let room idle 10 min, reconnect, verify state restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
