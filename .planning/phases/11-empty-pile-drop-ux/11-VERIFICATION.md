---
phase: 11-empty-pile-drop-ux
verified: 2026-04-18T18:26:00Z
status: human_needed
score: 2/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Drag a card onto an empty pile on the live board"
    expected: "Card moves to the pile immediately with no insert-position dialog"
    why_human: "End-to-end behavior of the empty-pile fast path requires a running browser and WebSocket connection; the isEmpty check bypasses the dialog in component logic but the full render path (no dialog opening, card appearing in pile) cannot be confirmed programmatically"
  - test: "Drag a card onto a non-empty pile on the live board"
    expected: "Insert-position dialog opens (Top / Bottom / Random), card does not move until selection is made"
    why_human: "Dialog render path requires a mounted DndContext + Dialog.Root with real pointer events; cannot be tested without a browser"
  - test: "Confirm state update is broadcast to all players after empty-pile drop"
    expected: "All players see the card appear on the previously empty pile without page refresh"
    why_human: "Requires two live browser sessions to confirm broadcastState delivers the updated pile to all connections"
---

# Phase 11: Empty Pile Drop UX Verification Report

**Phase Goal:** Dropping a card onto an empty pile is frictionless — no dialog appears because there is no position to choose
**Verified:** 2026-04-18T18:26:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Dropping a card onto an empty pile sends MOVE_CARD immediately with insertPosition 'top' — no dialog opens | VERIFIED | `const isEmpty = !targetPile \|\| targetPile.cards.length === 0` at line 116 of BoardDragLayer.tsx; isEmpty branch calls sendAction with insertPosition 'top' (line 126) bypassing setPendingMove; UX-01-A test asserts this contract explicitly |
| 2 | Dropping a card onto a non-empty pile still opens the position dialog | VERIFIED | else branch at line 130 of BoardDragLayer.tsx still calls setPendingMove; UX-01-B test asserts sendAction is NOT called and pendingMove is set |
| 3 | The pile lookup uses existence + length check so a missing pile is treated as empty (safe fallback) | VERIFIED | `!targetPile \|\| targetPile.cards.length === 0` — missing pile evaluates !targetPile as true; UX-01-C test asserts this with an empty piles array |

**Score:** 3/3 code-level truths verified

**Roadmap Success Criteria:**

| # | SC | Status | Evidence |
|---|---|--------|---------|
| SC-1 | Dragging onto empty pile places card on top immediately, no dialog | VERIFIED (code) | isEmpty branch; UX-01-A/C/D tests pass |
| SC-2 | Position dialog appears normally for non-empty pile drops | VERIFIED (code) | else branch calls setPendingMove; UX-01-B test |
| SC-3 | State updates broadcast to all players in both cases | VERIFIED (code) | party/index.ts line 417: broadcastState() called unconditionally after every action handler; MOVE_CARD falls through to this call regardless of insertPosition value |

All three SCs are supported by code evidence. SC-1 and SC-2 have additional human verification items because the visual/interaction contract (no dialog flash, card rendering in pile) cannot be confirmed without a browser.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|---------|--------|---------|
| `src/components/BoardDragLayer.tsx` | Empty-pile conditional branch inside handleDragEnd | VERIFIED | isEmpty guard at line 116; sendAction with insertPosition 'top' at line 119-127; else branch retains setPendingMove at line 130 |
| `tests/boardDragLayerDialog.test.ts` | UX-01 behavioral tests for the new branch | VERIFIED | describe block "UX-01: Empty pile drop bypasses dialog" at line 255; all four test cases (UX-01-A through UX-01-D) present and passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| handleDragEnd (toZone === 'pile' branch) | sendAction({ type: 'MOVE_CARD', insertPosition: 'top' }) | isEmpty check bypasses setPendingMove | WIRED | Line 114-131 of BoardDragLayer.tsx confirms the conditional; isEmpty true path calls sendAction directly at line 119; pattern `isEmpty` present at line 116, `sendAction` at line 119, both inside the toZone === 'pile' guard |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---------|-------------|--------|-------------------|--------|
| `BoardDragLayer.tsx` handleDragEnd | gameState.piles | gameState prop (ClientGameState) passed from parent; populated by server WebSocket messages | Yes — gameState flows from PartyKit server via onMessage, not hardcoded | FLOWING |

The isEmpty check reads `gameState.piles` which is server-authoritative state received over WebSocket. No hardcoded empty fallback is used for the piles array — the real pile state from the server determines the branch taken.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---------|--------|--------|--------|
| All 11 tests pass (UX-01, UX-02, UX-03 suites) | `npx vitest run tests/boardDragLayerDialog.test.ts` | 11 passed (1 file) in 134ms | PASS |
| TypeScript compiles clean (no new errors) | `npx tsc --noEmit` | 5 errors, all pre-existing (process.env at BoardDragLayer:64, vi.fn generic overload at test:43/226, sendAction type mismatch at test:55/234) | PASS (pre-existing debt, none introduced by this phase; SUMMARY.md explicitly acknowledges these) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| UX-01 | 11-01-PLAN.md | Dropping a card onto an empty pile skips the position dialog (card always goes to top) | SATISFIED | isEmpty guard in BoardDragLayer.tsx bypasses setPendingMove; 4 behavioral tests cover empty pile, non-empty pile, missing pile, pile-to-pile cases |

REQUIREMENTS.md traceability table maps UX-01 to Phase 11 with status "Pending". The implementation satisfies the requirement. The traceability table itself still shows "Pending" — that is a documentation update outside this phase's scope.

No orphaned requirements found: only UX-01 is mapped to Phase 11 in REQUIREMENTS.md.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no empty return statements, no hardcoded empty data arrays in the modified files.

### Human Verification Required

#### 1. Empty pile fast path — no dialog in browser

**Test:** Open the game in a browser. Drag a card from hand to a pile that has zero cards.
**Expected:** The card moves directly onto the pile with no insert-position dialog appearing.
**Why human:** The isEmpty branch is verified in code, but the browser render path (Dialog.Root remaining closed, card appearing in pile zone, DragOverlay snap behavior) requires pointer events and a mounted component tree.

#### 2. Non-empty pile dialog — unaffected behavior

**Test:** Open the game in a browser. Drag a card from hand to a pile that has at least one card.
**Expected:** The insert-position dialog opens (Top / Bottom / Random buttons). Card does not move until a selection is made or the dialog is dismissed.
**Why human:** setPendingMove path is verified in code but the dialog render, initial focus on Top button, and keyboard behavior (UX-02/UX-03) require a live browser.

#### 3. Broadcast to all players — empty pile case

**Test:** Open two browser windows in the same room. In window A, drag a card onto an empty pile.
**Expected:** Window B immediately shows the card on the pile without any interaction or page refresh.
**Why human:** Requires two connected WebSocket sessions; broadcastState call is confirmed in code but end-to-end delivery to all clients requires a live PartyKit room.

### Gaps Summary

No gaps found. All code-level truths are verified, all artifacts are substantive and wired, the key link is confirmed, data flows from server state, tests pass, and TypeScript introduces no new errors. Human verification items address interactive browser behavior that cannot be confirmed programmatically.

---

_Verified: 2026-04-18T18:26:00Z_
_Verifier: Claude (gsd-verifier)_
