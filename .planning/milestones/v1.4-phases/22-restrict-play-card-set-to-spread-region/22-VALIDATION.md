---
phase: 22
slug: restrict-play-card-set-to-spread-region
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-15
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | HAND-01 | — | N/A | unit | `npm test` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | HAND-02 | — | N/A | unit | `npm test` | ✅ | ⬜ pending |
| 22-01-03 | 01 | 1 | HAND-03 | — | N/A | unit | `npm test` | ✅ | ⬜ pending |
| 22-01-04 | 01 | 1 | HAND-04 | — | N/A | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `party/resetTable.test.ts` — add assertion that `handRevealed` is cleared on `RESET_TABLE`
- [ ] `party/viewFor.test.ts` (or equivalent) — stubs for `opponentRevealedHands` field behavior

*If existing test infrastructure covers all phase requirements, skip Wave 0 installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All other players see opponent's card faces when hand is revealed | HAND-01 | Requires 2+ live browser sessions | Open two tabs, player A reveals hand, verify player B sees card faces |
| Reveal state persists for reconnecting players | HAND-03 | Requires disconnect/reconnect simulation | Player A reveals hand, player B disconnects and reconnects, verify they see revealed state |
| Revealing player's own view unchanged | HAND-04 | Visual inspection | Reveal hand; verify your own hand view shows same cards as before |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
