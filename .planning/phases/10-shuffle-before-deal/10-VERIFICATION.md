---
phase: 10-shuffle-before-deal
verified: 2026-04-18T17:09:30Z
status: human_needed
score: 7/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Two-tab animation test — manual shuffle"
    expected: "Clicking Shuffle on a pile in Tab 1 causes a card-fan ghost animation (5 ghost card outlines spread then collapse, ~550ms) to appear on that pile in BOTH browser tabs simultaneously. Pile badge count does not change."
    why_human: "CSS animation rendering and cross-tab simultaneous behavior cannot be verified programmatically without a running browser."
  - test: "Two-tab animation test — deal path"
    expected: "Clicking Deal in Tab 1 causes the card-fan animation to play on the Draw pile in BOTH tabs. After ~650ms, dealt cards appear in each player's hand. Animation completes visibly BEFORE hand state updates arrive."
    why_human: "Sequencing of animation vs. state update requires visual inspection in a running browser across two tabs."
  - test: "Multi-pile animation targeting"
    expected: "Clicking Shuffle on the Discard pile triggers the animation on the Discard pile, not the Draw pile."
    why_human: "Pile-ID targeting correctness requires visual verification across piles in a running browser."
  - test: "Undo after deal restores pre-shuffle pile order"
    expected: "After dealing, clicking Undo restores the draw pile to the card order it had before Deal was clicked (pre-shuffle order, not post-shuffle order)."
    why_human: "Snapshot restore correctness requires live gameplay inspection to confirm the pre-shuffle order is what visibly comes back."
---

# Phase 10: Shuffle Before Deal Verification Report

**Phase Goal:** Add shuffle-before-deal — the draw pile is shuffled before any cards are distributed; all clients receive a PILE_SHUFFLED broadcast and animate a card-fan effect; manual pile shuffles also broadcast the event.
**Verified:** 2026-04-18T17:09:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | DEAL_CARDS shuffles the draw pile before any card is popped | ✓ VERIFIED | `party/index.ts` line 347: `dealDrawPile.cards = shuffle(dealDrawPile.cards)` before deal loop; confirmed by passing test "shuffles draw pile before dealing cards" |
| 2  | Undo after deal restores pre-shuffle card order | ✓ VERIFIED | `takeSnapshot` at line 346 precedes shuffle at 347; snapshot contains pre-shuffle order; test "undo after DEAL_CARDS restores pre-shuffle pile order" passes |
| 3  | All connected clients receive PILE_SHUFFLED on DEAL_CARDS | ✓ VERIFIED | `broadcastShuffleEvent("draw")` called at line 348; test "broadcasts PILE_SHUFFLED event to all connections on DEAL_CARDS" passes |
| 4  | PILE_SHUFFLED event arrives before STATE_UPDATE on deal path | ✓ VERIFIED | `broadcastShuffleEvent` at line 348 → `await new Promise(resolve => setTimeout(resolve, 650))` at line 349 → deal loop → broadcastState; ordering enforced structurally |
| 5  | Manually shuffling a pile broadcasts PILE_SHUFFLED to all clients | ✓ VERIFIED | `party/index.ts` line 375: `this.broadcastShuffleEvent(action.pileId)` inside SHUFFLE_PILE case after shuffle mutation; test passes |
| 6  | SHUFFLE_PILE broadcasts immediately with no delay | ✓ VERIFIED | No `await` or `setTimeout` in SHUFFLE_PILE case; confirmed by code inspection |
| 7  | Receiving PILE_SHUFFLED sets pileId into shufflingPileIds for ~650ms | ✓ VERIFIED | `usePartySocket.ts` lines 50–59: PILE_SHUFFLED handler adds pileId to Set, setTimeout removes it after 650ms |
| 8  | PileZone renders ghost card fan divs when isShuffling=true | ✓ VERIFIED (code) / ? HUMAN NEEDED (visual) | `PileZone.tsx` lines 53–68: 5 ghost divs with `pile-fan-spread` animation rendered when `shufflingPileIds.has(pile.id)` is true; `@keyframes pile-fan-spread` confirmed in `src/globals.css` lines 118–122; visual appearance requires human testing |

**Score:** 7/8 truths fully verified (1 requires human visual confirmation)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | PILE_SHUFFLED discriminated union member in ServerEvent | ✓ VERIFIED | Line 68: `\| { type: "PILE_SHUFFLED"; pileId: string };` present |
| `party/index.ts` | broadcastShuffleEvent method + updated DEAL_CARDS and SHUFFLE_PILE handlers | ✓ VERIFIED | Method at line 430; DEAL_CARDS updated lines 334–362; SHUFFLE_PILE updated lines 363–377 |
| `tests/dealCards.test.ts` | 9 tests covering shuffle-before-deal, undo restore, PILE_SHUFFLED broadcast | ✓ VERIFIED | 9 tests passing (vitest run confirms) |
| `tests/shufflePile.test.ts` | 4 tests including PILE_SHUFFLED broadcast on manual shuffle | ✓ VERIFIED | 4 tests passing |
| `src/hooks/usePartySocket.ts` | shufflingPileIds state + PILE_SHUFFLED handler + 650ms cleanup timer | ✓ VERIFIED | Lines 12, 50–59, 81 all present and substantive |
| `src/components/PileZone.tsx` | Ghost card fan divs rendered when isShuffling=true | ✓ VERIFIED | Lines 26, 53–68 present; `pile-fan-spread` animationName applied |
| `src/globals.css` | @keyframes pile-fan-spread CSS rule | ✓ VERIFIED | Lines 118–122: three keyframe stops with --fan-x, --fan-r custom props and opacity 0 at 100% |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DEAL_CARDS case | broadcastShuffleEvent("draw") | method call after shuffle, before await delay | ✓ WIRED | Lines 347→348→349 confirmed in sequence |
| DEAL_CARDS case | await new Promise (650ms delay) | setTimeout sequencing animation window | ✓ WIRED | Line 349 present after broadcast |
| SHUFFLE_PILE case | broadcastShuffleEvent(action.pileId) | after shuffle(), before implicit broadcastState | ✓ WIRED | Line 375, no delay added |
| usePartySocket PILE_SHUFFLED handler | shufflingPileIds state | setShufflingPileIds adds on event, setTimeout removes after 650ms | ✓ WIRED | Lines 50–59 |
| PileZone | shufflingPileIds prop | isShuffling = shufflingPileIds.has(pile.id) | ✓ WIRED | Prop-drilled: App.tsx → BoardDragLayer → BoardView → PileZone; all 4 files confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| PileZone.tsx ghost divs | shufflingPileIds Set | PILE_SHUFFLED server event → usePartySocket handler | Yes — populated from server broadcast, cleared by timer | ✓ FLOWING |
| party/index.ts DEAL_CARDS | dealDrawPile.cards | crypto.getRandomValues Fisher-Yates shuffle on actual game state pile | Yes — in-memory shuffle of live game state | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 9 dealCards tests pass | `npx vitest run tests/dealCards.test.ts` | 9 passed | ✓ PASS |
| All 4 shufflePile tests pass | `npx vitest run tests/shufflePile.test.ts` | 4 passed | ✓ PASS |
| Full test suite passes | `npm test` | 107 passed (14 test files) | ✓ PASS |
| No TypeScript errors in phase-10 files | `npx tsc --noEmit` (filtered to phase files) | 0 errors | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GAME-01 | Plans 01, 02, 03 | Dealing from a pile automatically shuffles that pile before distributing cards | ✓ SATISFIED | Server shuffles before deal, broadcasts PILE_SHUFFLED, client animates; all wired end-to-end |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, FIXME, placeholder comments, empty return stubs, or hardcoded empty data values found in phase-10 modified files.

### Human Verification Required

#### 1. Two-Tab Animation Test — Manual Shuffle

**Test:** Open two browser tabs at the same room URL. In Tab 1, click the Shuffle button on the Draw pile.
**Expected:** A card-fan effect plays on the Draw pile in BOTH tabs simultaneously — 5 ghost card outlines spread out from the pile center and collapse back, taking approximately 550ms. The pile badge count does not change.
**Why human:** CSS animation rendering and cross-tab simultaneous appearance requires a running browser. Cannot verify programmatically.

#### 2. Two-Tab Animation Test — Deal Path

**Test:** In two tabs in the same room, enter "2" in the deal count field in Tab 1 and click Deal.
**Expected:** The card-fan animation plays on the Draw pile in BOTH tabs before dealt cards appear in hands. After approximately 650ms, cards appear in each player's hand. Animation visually completes before hand state updates arrive.
**Why human:** Sequencing of animation before state update requires visual inspection across two tabs in a running browser.

#### 3. Multi-Pile Animation Targeting

**Test:** Click Shuffle on the Discard pile (or any non-Draw pile).
**Expected:** The animation plays on the Discard pile only. The Draw pile does not animate.
**Why human:** Pile-ID targeting correctness requires visual inspection across piles in a live session.

#### 4. Undo After Deal Restores Pre-Shuffle Pile Order

**Test:** Note the order of cards in the draw pile (or a small test pile). Click Deal. Click Undo.
**Expected:** The draw pile is restored to the exact card order it had before Deal was clicked — specifically the pre-shuffle order, not the post-shuffle order.
**Why human:** Snapshot restore correctness — verifying that the correct snapshot (pre-shuffle, not post-shuffle) is restored — requires live gameplay observation.

### Gaps Summary

No implementation gaps found. All server-side logic, tests, and client-side wiring are fully present and substantive. The 107-test suite passes clean. Human verification is required only for visual animation quality and the cross-tab simultaneous behavior that is the core UX promise of this phase.

---

_Verified: 2026-04-18T17:09:30Z_
_Verifier: Claude (gsd-verifier)_
