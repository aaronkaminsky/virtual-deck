---
phase: 04-game-controls
verified: 2026-04-04T08:15:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Flip card visible in all tabs simultaneously"
    expected: "Clicking a pile card toggles its orientation and all connected tabs see the change"
    why_human: "Multi-tab real-time broadcast cannot be verified programmatically"
  - test: "Drag guard prevents flip on drag-end"
    expected: "Dragging a pile card does not trigger a flip when the drag completes"
    why_human: "Drag interaction requires a browser with pointer events; confirmed in 04-03 UAT"
---

# Phase 4: Game Controls Verification Report

**Phase Goal:** Implement all game controls — flip card, pass card, deal, shuffle pile, reset table, and undo — so players have full interactive control of the virtual card table.
**Verified:** 2026-04-04T08:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Plans 01 + 02 must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FLIP_CARD toggles a pile card's faceUp and broadcasts to all | VERIFIED | `case "FLIP_CARD"` in party/index.ts:282; 5 tests in flipCard.test.ts all pass |
| 2 | PASS_CARD moves a card from sender's hand to target player's hand | VERIFIED | `case "PASS_CARD"` in party/index.ts:305; 5 tests in passCard.test.ts all pass |
| 3 | DEAL_CARDS distributes N cards round-robin from draw pile and sets phase to playing | VERIFIED | `case "DEAL_CARDS"` in party/index.ts:333; 6 tests in dealCards.test.ts all pass |
| 4 | SHUFFLE_PILE randomizes any pile's card order server-side | VERIFIED | `case "SHUFFLE_PILE"` in party/index.ts:359; 3 tests in shufflePile.test.ts all pass |
| 5 | RESET_TABLE collects all cards into draw pile, reshuffles, and reverts phase to setup | VERIFIED | `case "RESET_TABLE"` in party/index.ts:373; 6 tests in resetTable.test.ts all pass |
| 6 | UNDO_MOVE restores the shared undo stack and pops it | VERIFIED | `case "UNDO_MOVE"` in party/index.ts:393; 9 tests in undoMove.test.ts all pass (design redesigned from per-player to global shared stack during UAT) |
| 7 | canUndo boolean appears in ClientGameState via viewFor | VERIFIED | `canUndo: state.undoSnapshots.length > 0` in viewFor at party/index.ts:66; 3 canUndo tests in viewFor.test.ts pass |
| 8 | Clicking a pile card flips it face-up or face-down for all players | VERIFIED | DraggableCard.tsx has `onClick={handleClick}` and `onFlip` prop; PileZone.tsx passes `onFlip={handleFlipCard}` which dispatches FLIP_CARD |
| 9 | Dragging a hand card onto an opponent's hand zone passes it to that player | VERIFIED | BoardDragLayer.tsx dispatches PASS_CARD when `isPassCard` is true (line 36-43); OpponentHand.tsx has `useDroppable` with `opponent-hand-${playerId}` id |
| 10 | Deal button appears in lobby/setup phase; clicking it opens a popover to deal N cards | VERIFIED | ControlsBar.tsx renders Deal Popover when `phase === 'setup' \|\| phase === 'lobby'`; dispatches DEAL_CARDS on confirm |
| 11 | Each pile has a Shuffle button that shuffles its cards | VERIFIED | PileZone.tsx has Shuffle Button calling `sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id })` |
| 12 | Reset button appears in play phase with a confirmation dialog | VERIFIED | ControlsBar.tsx renders AlertDialog with "Reset table?" title and RESET_TABLE dispatch when `phase === 'playing'` |
| 13 | Undo button appears in play phase, disabled when no prior move exists | VERIFIED | ControlsBar.tsx renders Undo Button with `disabled={!gameState.canUndo}` dispatching UNDO_MOVE when `phase === 'playing'` |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | Extended GameState with undoSnapshots (GameState[]), phase union with setup, new ClientAction types, canUndo on ClientGameState | VERIFIED | Contains `undoSnapshots: GameState[]`, phase `"lobby" \| "setup" \| "playing"`, all 6 new ClientAction types, `canUndo: boolean` |
| `party/index.ts` | All 6 new action handlers plus takeSnapshot helper | VERIFIED | takeSnapshot exported at line 44; all 6 case handlers present; 435 lines, substantive |
| `tests/flipCard.test.ts` | FLIP_CARD unit tests | VERIFIED | 5 tests, all passing |
| `tests/passCard.test.ts` | PASS_CARD unit tests | VERIFIED | 5 tests, all passing |
| `tests/dealCards.test.ts` | DEAL_CARDS unit tests | VERIFIED | 6 tests (includes regression test), all passing |
| `tests/shufflePile.test.ts` | SHUFFLE_PILE unit tests | VERIFIED | 3 tests, all passing |
| `tests/resetTable.test.ts` | RESET_TABLE unit tests | VERIFIED | 6 tests, all passing |
| `tests/undoMove.test.ts` | UNDO_MOVE + takeSnapshot unit tests | VERIFIED | 9 tests (includes cross-player undo tests for redesigned global stack), all passing |
| `src/components/ControlsBar.tsx` | Phase-aware controls: Deal popover (setup/lobby) or Undo+Reset (playing) | VERIFIED | 109 lines, renders phase-conditionally, dispatches DEAL_CARDS/UNDO_MOVE/RESET_TABLE |
| `src/components/BoardView.tsx` | Top strip with opponent hands (left) and ControlsBar (right) | VERIFIED | Imports ControlsBar; renders `justify-between` layout with ControlsBar on right |
| `src/components/PileZone.tsx` | Shuffle button alongside existing face-toggle | VERIFIED | Shuffle Button dispatching SHUFFLE_PILE; onFlip passed to DraggableCard |
| `src/components/DraggableCard.tsx` | Click-to-flip with drag guard for pile cards | VERIFIED | `onFlip?: () => void` prop, `didDragRef` drag guard, `onClick={handleClick}` |
| `src/components/OpponentHand.tsx` | Droppable target for PASS_CARD | VERIFIED | `useDroppable` with `opponent-hand-${playerId}` id, `isOver` border highlight |
| `src/components/BoardDragLayer.tsx` | PASS_CARD dispatch on drag-end to opponent hand zone | VERIFIED | `isPassCard` check dispatches PASS_CARD before MOVE_CARD path |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `party/index.ts` | `src/shared/types.ts` | import types | WIRED | `import type { Card, ClientAction, ClientGameState, GameState, ServerEvent, Suit, Rank }` at line 2 |
| `party/index.ts takeSnapshot` | `GameState.undoSnapshots` | push to array (redesigned from Record) | WIRED | `state.undoSnapshots.push(snap)` at line 47; `snap.undoSnapshots = []` strips nested snapshots |
| `ControlsBar.tsx` | `sendAction` | DEAL_CARDS, RESET_TABLE, UNDO_MOVE dispatches | WIRED | Lines 39, 81, 98 dispatch all three action types |
| `DraggableCard.tsx onClick` | `sendAction` | FLIP_CARD dispatch via onFlip prop | WIRED | `onFlip?.()` in handleClick; PileZone passes `onFlip={handleFlipCard}` which calls sendAction FLIP_CARD |
| `OpponentHand.tsx useDroppable` | `BoardDragLayer.tsx handleDragEnd` | opponent-hand drop target data | WIRED | `id: \`opponent-hand-${playerId}\`` in OpponentHand; `overData?.toZone === 'opponent-hand'` check in BoardDragLayer |
| `PileZone.tsx` | `sendAction` | SHUFFLE_PILE dispatch | WIRED | `sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id })` in handleShuffle |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ControlsBar.tsx` | `gameState.canUndo` | viewFor in party/index.ts: `state.undoSnapshots.length > 0` | Yes — reads from live GameState array populated by takeSnapshot | FLOWING |
| `ControlsBar.tsx` | `gameState.phase` | viewFor returns `state.phase`; mutated by DEAL_CARDS/RESET_TABLE handlers | Yes — server state drives phase transitions | FLOWING |
| `OpponentHand.tsx` | `cardCount` | `gameState.opponentHandCounts` from viewFor; filters hands by playerToken | Yes — real hand lengths from server state | FLOWING |
| `PileZone.tsx` | `pile.cards` | `gameState.piles` from viewFor; direct pass-through of server pile state | Yes — server pile arrays | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All tests pass (covers all 6 handlers) | `npm test` | 82 tests passing, 12 test files | PASS |
| TypeScript compiles without errors | `npx tsc --noEmit` | No output (exit 0) | PASS |
| takeSnapshot caps stack at 20 entries | tested in undoMove.test.ts | VERIFIED by test | PASS |
| Multi-tab real-time broadcast | Requires browser + PartyKit | N/A — confirmed in 04-03 human UAT | SKIP (human confirmed) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CARD-03 | 04-01, 04-02 | Player can flip any card face-up or face-down | SATISFIED | FLIP_CARD handler in party/index.ts; DraggableCard click-to-flip + PileZone onFlip; 5 passing tests; human UAT confirmed |
| CARD-04 | 04-01, 04-02 | Player can pass a card directly to another player's private hand | SATISFIED | PASS_CARD handler in party/index.ts; OpponentHand droppable + BoardDragLayer dispatch; 5 passing tests; human UAT confirmed |
| CTRL-01 | 04-01, 04-02 | Player can deal N cards from a pile to each player's hand | SATISFIED | DEAL_CARDS handler in party/index.ts; ControlsBar Deal popover; 6 passing tests; human UAT confirmed |
| CTRL-02 | 04-01, 04-02 | Player can shuffle any pile on the table | SATISFIED | SHUFFLE_PILE handler in party/index.ts; PileZone Shuffle button; 3 passing tests; human UAT confirmed |
| CTRL-03 | 04-01, 04-02 | Player can reset the table | SATISFIED | RESET_TABLE handler in party/index.ts; ControlsBar Reset with AlertDialog confirmation; 6 passing tests; human UAT confirmed |
| CTRL-04 | 04-01, 04-02 | Player can undo their last card move (global stack, 20 moves) | SATISFIED | UNDO_MOVE handler with global shared stack; ControlsBar Undo button with canUndo disabled state; 9 passing tests; human UAT confirmed |

**No orphaned requirements.** All 6 requirements declared across plans 01 and 02 are covered by implementation. REQUIREMENTS.md traceability table shows all as Complete for Phase 4.

**Notable architectural deviation:** Plan 01 specified per-player `undoSnapshots: Record<string, GameState | null>`, but during UAT (Plan 03 bug #7) this was redesigned to a global shared stack `undoSnapshots: GameState[]` (20-entry cap, any player can undo). The types.ts and party/index.ts reflect the final design. All 9 undoMove tests cover the global stack behavior. This is an improvement on the original spec, not a regression.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/OpponentHand.tsx` | 13 | `sendAction: _sendAction` — prop accepted but not used in component body | INFO | No impact on functionality; PASS_CARD is dispatched from BoardDragLayer on drop, not from OpponentHand. The prop is required for the interface contract and BoardView passes it. Not a stub. |

No blockers or warnings found. The `_sendAction` alias is intentional — the component is a drop target that communicates drop zones via dnd-kit data; the actual dispatch happens upstream in BoardDragLayer.

### Human Verification Required

Both items below were confirmed PASSING in the Plan 03 UAT session (2026-04-04):

### 1. Flip card broadcasts to all tabs

**Test:** Open 2+ tabs in the same room. Click a pile card in one tab.
**Expected:** All tabs show the card's orientation toggle simultaneously.
**Why human:** Real-time WebSocket broadcast requires a live browser environment.
**UAT result:** CONFIRMED (CARD-03 marked in 04-03-SUMMARY.md)

### 2. Pass card to opponent with correct hand privacy

**Test:** In one tab, drag a hand card onto an opponent's hand zone. Check the recipient's tab and a third-player tab.
**Expected:** Recipient sees the card in their hand; third player sees only the opponent hand count change (no card faces visible).
**Why human:** Hand masking privacy requires visual inspection across browser tabs.
**UAT result:** CONFIRMED (CARD-04 marked in 04-03-SUMMARY.md)

### Gaps Summary

No gaps. All 13 observable truths verified, all 6 requirements satisfied, all 14 required artifacts present and substantive, all key links wired, test suite fully green (82/82), TypeScript clean. Human UAT confirmed all 6 success criteria across multiple browser tabs with real-time broadcast.

The one significant deviation from the original plan (per-player undo → global shared stack) was a correct design decision made during UAT and is fully implemented, tested, and human-verified.

---

_Verified: 2026-04-04T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
