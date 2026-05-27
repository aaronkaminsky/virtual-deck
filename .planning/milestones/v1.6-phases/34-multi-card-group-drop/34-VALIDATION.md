---
phase: 34
slug: multi-card-group-drop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm test -- --run tests/canvasCards.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/canvasCards.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | MULTI-01,02,03,04 | T-34-01 | GROUP_PLACE_ON_CANVAS rejects unauthorized hand moves | unit | `npm test -- --run tests/canvasCards.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 1 | MULTI-03 | T-34-02 | z-ordering: all dropped cards above maxZ, internal order preserved | unit | `npm test -- --run tests/canvasCards.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-03 | 01 | 1 | MULTI-04 | T-34-03 | Undo restores all N cards atomically | unit | `npm test -- --run tests/canvasCards.test.ts` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 2 | MULTI-01 | — | N/A | manual (visual) | — | N/A | ⬜ pending |
| 34-02-02 | 02 | 2 | MULTI-02 | — | passenger positions match pre-drag offsets | manual + e2e | `npm run test:e2e` | ❌ existing | ⬜ pending |
| 34-02-03 | 02 | 2 | MULTI-04 | — | bounds violation cancels entire drop, no partial placement | manual + e2e | `npm run test:e2e` | ❌ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/canvasCards.test.ts` — add `GROUP_PLACE_ON_CANVAS` describe block with RED stubs covering:
  - Happy path: canvas→canvas group drop, hand→canvas group drop, spread→canvas group drop
  - Z-ordering: all dropped z > maxZ, internal z-order by pre-drag z preserved
  - Undo: `UNDO_MOVE` restores all N cards to source position
  - Auth guard: `fromZone === 'hand' && fromId !== senderToken` → `UNAUTHORIZED_MOVE`
  - Invalid coordinates: `NaN` or `Infinity` for any card `x` or `y` → error
  - Missing cardIds: any cardId not in source → entire group rejected
  - Duplicate cardIds: `Set(cardIds).size !== cardIds.length` → rejected
  - Empty cards array: `cards.length === 0` → rejected

*No new test file required — all gaps are new `describe` blocks inside the existing `tests/canvasCards.test.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Selection ring boxShadow visual (ring + lift) | MULTI-01 | CSS visual; no DOM assertion covers exact shadow values | Click a canvas card; confirm ring matches `0 0 0 2px #60a5fa, 0 4px 8px rgba(0,0,0,0.3)` from UI-SPEC |
| Passenger ghost opacity (0.5) during drag | MULTI-02 | Visual during active drag; not assertable post-drop | Start drag on selected group; confirm non-handle cards show at 50% opacity |
| Source card opacity 0 during drag | MULTI-02 | Visual during active drag | Start drag; confirm original card positions show empty (opacity: 0) |
| Selection badge `N selected` appears ≥ 2 cards | MULTI-01 | Visual overlay | Select 2+ cards; confirm badge visible in canvas top-left |
| Selection clears after drop | MULTI-01 | Post-drop UI state | Drop group; confirm no cards have selection ring |
| Click empty canvas deselects all | MULTI-01 | Interaction pattern | Select 2 cards; click empty canvas area; confirm deselect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
