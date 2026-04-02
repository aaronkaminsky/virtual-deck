---
phase: 2
slug: lobby-room-join
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | ROOM-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | ROOM-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | ROOM-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | ROOM-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | DECK-03 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/lobby.test.tsx` — stubs for ROOM-01 (room creation, shareable link/code)
- [ ] `src/__tests__/room-join.test.tsx` — stubs for ROOM-02 (joining via link/code, localStorage player token)
- [ ] `src/__tests__/card-art.test.ts` — stubs for DECK-03 (card art config single-file change)

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub Pages 404 prevention (SPA routing) | ROOM-02 | Requires deployed GitHub Pages environment | Deploy to GH Pages, navigate directly to room URL (e.g. `/virtual-deck/room/ABCDE`), verify page loads |
| PartyKit WebSocket connection in production | ROOM-02 | Requires live PartyKit Cloud deploy | Two browser tabs open same room URL, verify they see each other |
| localStorage persists across page reload | ROOM-02 | Integration test requiring real browser | Open room, reload page, verify player identity is same |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
