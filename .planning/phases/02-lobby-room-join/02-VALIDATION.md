---
phase: 2
slug: lobby-room-join
status: draft
nyquist_compliant: true
wave_0_complete: true
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 2-01-01 | 01 | 1 | ROOM-01 | typecheck + build | `npm run typecheck && npx vite build --mode development` | ⬜ pending |
| 2-01-02 | 01 | 1 | DECK-03 | unit (TDD) | `npm test -- --run` | ⬜ pending |
| 2-02-01 | 02 | 2 | ROOM-02 | typecheck | `npm run typecheck` | ⬜ pending |
| 2-02-02 | 02 | 2 | ROOM-01, ROOM-02 | typecheck + build | `npm run typecheck && npm test` | ⬜ pending |
| 2-02-03 | 02 | 2 | ROOM-01, ROOM-02 | build | `npm run build` | ⬜ pending |
| 2-03-01 | 03 | 3 | ROOM-01, ROOM-02 | manual | human smoke test | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/card-art.test.ts` — stubs for DECK-03 (card art config single-file change) — created by Plan 02-01 Task 2 (TDD)

*ROOM-01 and ROOM-02 are frontend UI behaviors with no browser test infrastructure in scope. They are validated via human smoke tests in Plan 02-03. No Wave 0 stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Root URL redirects to `/?room={id}` | ROOM-01 | Requires browser redirect behavior | Visit root URL, verify redirect to `/?room={8-char-code}` |
| Copy link button writes URL to clipboard | ROOM-01 | Requires Clipboard API in real browser | Click "Copy link", paste, verify URL |
| `?room=` param connects to PartyKit room | ROOM-02 | Requires live PartyKit dev server | Open room URL, verify lobby panel appears |
| Player list updates when second player joins | ROOM-02 | Requires multi-tab WebSocket integration | Open same room URL in two tabs, verify both show 2 players |
| localStorage persists across page reload | ROOM-02 | Integration test requiring real browser | Open room, reload page, verify player identity is same |
| GitHub Pages 404 prevention (query-param routing) | ROOM-01 | Requires deployed GitHub Pages environment | Navigate directly to `https://{user}.github.io/virtual-deck/?room=ABC123`, verify page loads without 404 |
| PartyKit WebSocket connection in production | ROOM-02 | Requires live PartyKit Cloud deploy | Two browser tabs open same room URL, verify they see each other |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented in Manual-Only table
- [x] Sampling continuity: DECK-03 has TDD unit tests; ROOM-01/ROOM-02 are manual-only (documented above)
- [x] Wave 0 covers all MISSING references (only card-art.test.ts needed)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
