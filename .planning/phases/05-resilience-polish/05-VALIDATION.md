---
phase: 5
slug: resilience-polish
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (root — `tests/**/*.test.ts`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — sets playerToken from ?player= query param |
| 05-01-02 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — adds player to gameState with stable token |
| 05-01-03 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — reconnecting player gets connected:true restored |
| 05-01-04 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — reconnecting player's hand is preserved |
| 05-01-05 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — reconnecting player does not create duplicate entry |
| 05-01-06 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — rejects 5th unique player even with disconnected slots |
| 05-01-07 | 01 | 0 | ROOM-04 | unit | `npm test -- tests/reconnect.test.ts` | ✅ | ✅ green — reconnecting as existing player bypasses 4-player cap |
| 05-02-01 | 02 | 1 | PRESENCE | manual | Multi-tab visual | — | ⬜ pending — presence dots |
| 05-03-01 | 03 | 1 | DISCONNECT-UX | manual | Network disconnect simulation | — | ⬜ pending — disconnection banner |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/reconnect.test.ts` — covers ROOM-04 server reconnect logic (exists and passes)

*No new test files needed — reconnect coverage exists from Phase 5 execution. Presence and disconnection banner verifications are manual per D-07.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Presence dots reflect connected players | PRESENCE | Requires multiple live WebSocket connections | Open 2+ browser tabs in same room; verify presence dot appears next to each connected player in the opponent list; close one tab; verify that player's dot disappears within ~2 seconds |
| Disconnection banner appears on network loss | DISCONNECT-UX | Requires browser network simulation | Open room; in DevTools Network tab set Offline; verify banner appears indicating disconnected state; set back to Online; verify banner clears and state resyncs |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-09 (Phase 7 audit)
