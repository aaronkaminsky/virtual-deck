---
phase: 4
slug: game-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| CARD-03 flip toggle | TBD | 0 | CARD-03 | unit | `npm test -- tests/flipCard.test.ts` | ❌ W0 | ⬜ pending |
| CARD-03 broadcast | TBD | 0 | CARD-03 | unit | `npm test -- tests/flipCard.test.ts` | ❌ W0 | ⬜ pending |
| CARD-03 invalid pileId | TBD | 0 | CARD-03 | unit | `npm test -- tests/flipCard.test.ts` | ❌ W0 | ⬜ pending |
| CARD-04 pass moves card | TBD | 0 | CARD-04 | unit | `npm test -- tests/passCard.test.ts` | ❌ W0 | ⬜ pending |
| CARD-04 rejects non-sender card | TBD | 0 | CARD-04 | unit | `npm test -- tests/passCard.test.ts` | ❌ W0 | ⬜ pending |
| CARD-04 privacy | TBD | 0 | CARD-04 | unit | `npm test -- tests/passCard.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-01 deal round-robin | TBD | 0 | CTRL-01 | unit | `npm test -- tests/dealCards.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-01 phase transition | TBD | 0 | CTRL-01 | unit | `npm test -- tests/dealCards.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-01 insufficient cards | TBD | 0 | CTRL-01 | unit | `npm test -- tests/dealCards.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-02 shuffle randomizes | TBD | 0 | CTRL-02 | unit | `npm test -- tests/shufflePile.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-02 rejects invalid pileId | TBD | 0 | CTRL-02 | unit | `npm test -- tests/shufflePile.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-03 collect all cards | TBD | 0 | CTRL-03 | unit | `npm test -- tests/resetTable.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-03 reshuffle | TBD | 0 | CTRL-03 | unit | `npm test -- tests/resetTable.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-03 phase reset | TBD | 0 | CTRL-03 | unit | `npm test -- tests/resetTable.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-04 undo restore | TBD | 0 | CTRL-04 | unit | `npm test -- tests/undoMove.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-04 no-op no snapshot | TBD | 0 | CTRL-04 | unit | `npm test -- tests/undoMove.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-04 snapshot strips nesting | TBD | 0 | CTRL-04 | unit | `npm test -- tests/undoMove.test.ts` | ❌ W0 | ⬜ pending |
| CTRL-04 canUndo in ClientGameState | TBD | 0 | CTRL-04 | unit | `npm test -- tests/undoMove.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/flipCard.test.ts` — stubs for CARD-03
- [ ] `tests/passCard.test.ts` — stubs for CARD-04
- [ ] `tests/dealCards.test.ts` — stubs for CTRL-01
- [ ] `tests/shufflePile.test.ts` — stubs for CTRL-02
- [ ] `tests/resetTable.test.ts` — stubs for CTRL-03
- [ ] `tests/undoMove.test.ts` — stubs for CTRL-04 + takeSnapshot helper

**Existing tests to update (not new files):**
- `tests/viewFor.test.ts` — add test for `canUndo` field
- `tests/deck.test.ts` — update `defaultGameState` test if phase initial value changes

*Framework install: Not required — vitest already installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FLIP_CARD visible to all players | CARD-03 | Multi-client broadcast | Open 2 browser tabs in same room; flip a pile card in tab 1; verify tab 2 shows new orientation |
| PASS_CARD private to recipient | CARD-04 | Hand visibility per player | Open 3 browser tabs; pass card from player 1 to player 2; verify player 3 does not see card face |
| DEAL_CARDS UI (ControlsBar deal button) | CTRL-01 | UI interaction | In setup phase, enter deal count, click Deal; verify cards appear in all player hands |
| SHUFFLE_PILE randomization visible | CTRL-02 | Randomness requires observation | Shuffle a face-up pile; verify card order changes for all clients |
| RESET_TABLE confirmation dialog | CTRL-03 | UI flow | Click Reset; verify AlertDialog appears; cancel; verify no state change; confirm; verify all cards return to draw pile |
| UNDO_MOVE reverts for all clients | CTRL-04 | Multi-client state | Move a card; press Undo; verify all clients see previous state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
