---
phase: 23
slug: replace-hardcoded-communal-zone-id
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-??-01 | TBD | 0 | SORT-01 | — | N/A | unit | `npm test -- --reporter=verbose tests/handSort.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-??-02 | TBD | 0 | SELECT-01, SELECT-02, SELECT-03 | — | N/A | unit | `npm test -- --reporter=verbose tests/selectAll.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-??-03 | TBD | 1 | SORT-01 | — | N/A | unit | `npm test -- --reporter=verbose tests/handSort.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/handSort.test.ts` — stubs for SORT-01 (pure `sortCards()` function tests: By Suit mode per D-01/D-03, By Rank mode per D-02/D-03, REORDER_HAND dispatch on cycle)
- [ ] `tests/selectAll.test.ts` — stubs for SELECT-01/02/03 (Select All on pile selects top card; Select All on spread zone selects all faceUp card IDs; PLAY_CARD_SET fires correctly after Select All)

*Note: SORT-01 persistence via REORDER_HAND handler is already covered in `tests/reorderUndo.test.ts` (existing file).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sort button icon turns amber when non-original mode active (D-05) | SORT-01 | CSS visual state — no automated visual regression | Click sort button; verify icon color changes to amber; click again to Original; verify icon returns to muted |
| Sort tooltip shows current mode + next mode hint (D-06) | SORT-01 | Tooltip text — requires browser interaction | Hover over sort button in each mode; verify tooltip text matches "Sort: Original order", "Sort: By suit", "Sort: By rank" |
| Select All selects correct cards visually (ring + card lift) | SELECT-01, SELECT-02 | CSS visual selection state | Click Select All on pile/spread; verify selected cards show visual ring; drag selection to drop target |
| Sort persists after page reload / reconnect | SORT-01 | Requires live PartyKit server + browser | Sort hand; reload tab; verify hand remains in sorted order |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
