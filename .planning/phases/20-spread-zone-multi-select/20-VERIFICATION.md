---
phase: 20-spread-zone-multi-select
verified: 2026-05-10T08:32:00Z
status: human_needed
score: 4/4 automated truths verified
overrides_applied: 0
human_verification:
  - test: "Start two browser windows at http://localhost:5173, both in the same room. In window 1, click spread zone cards and verify ring + lift animation appears on selected cards."
    expected: "Each clicked card shows amber ring (ring-1 ring-primary/30) and lifts translateY(-6px). Clicking same card again deselects it."
    why_human: "Visual animation and CSS ring rendering cannot be asserted by unit tests."
  - test: "Select 3 cards in your personal spread zone."
    expected: "All 3 show ring + lift. Zone header shows '3 selected' badge. Click one — badge shows '2 selected'."
    why_human: "Badge visibility and multi-select accumulation require live DOM observation."
  - test: "Select 2+ spread cards, then press Escape."
    expected: "All rings and lifts disappear; badge disappears."
    why_human: "Keyboard event handler behavior requires browser environment."
  - test: "Select 2 cards in personal spread zone, then click a card in a different zone (communal zone or hand)."
    expected: "Personal spread zone selection clears; new card in the other zone becomes selected."
    why_human: "Zone-exclusive selection clearing is client state behavior requiring visual verification."
  - test: "Select 2+ cards in a spread zone. Drag one of the selected cards onto a pile zone."
    expected: "All selected cards move to the pile; selection clears."
    why_human: "Drag-and-drop group move behavior requires live interaction."
  - test: "Select 2+ cards in the communal spread zone. Drag one onto your hand zone."
    expected: "All selected cards appear in your hand; selection clears."
    why_human: "toZone:'hand' dispatch + visual hand update requires live browser session."
  - test: "In window 2 (player 2): deal cards. In window 1 (player 1): attempt to drag from player 2's personal spread zone."
    expected: "No drag ghost appears; cards in player 2's zone are not draggable."
    why_human: "interactive={false} rendering effect (no useSortable registration) requires browser DnD observation."
  - test: "Select 3 cards in personal spread zone. Verify only personal spread zone header shows '3 selected'. Communal zone header shows no badge."
    expected: "Badge only appears in the zone matching selectionSource.zoneId."
    why_human: "Badge zone ownership (selectionSource?.zoneId === pile.id condition) requires live state observation."
---

# Phase 20: Spread Zone Multi-Select Verification Report

**Phase Goal:** Players can select multiple cards in a spread zone and drag the selected set to another zone, matching the selection UX of the player hand
**Verified:** 2026-05-10T08:32:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking a card in a spread zone toggles its selection state with the same visual ring/lift treatment as hand card selection | ? HUMAN NEEDED | Code: `SortableSpreadCard` has `isSelected`, `resolvedTransform = isSelected ? 'translateY(-6px)' : ...`, ring class `ring-1 ring-primary/30 ring-offset-1 ...`, `aria-pressed={isSelected}`, `onClick={() => onToggleSelect(card.id, 'pile', pileId)}` — all wired. Visual confirmation required. |
| 2 | Multiple cards in a spread zone can be selected in a single session without deselecting previous picks | ? HUMAN NEEDED | Code: `handleToggleSelect` in `BoardDragLayer.tsx` toggles `selectedIds` Set — adds new IDs without clearing existing ones when in same zone. Zone-exclusive logic only clears when `isDifferentZone`. Logic correct; interactive verification required. |
| 3 | Pressing Escape clears the spread zone selection | ? HUMAN NEEDED | Code: Escape handler calls `setSelectedIds(new Set())` AND `setSelectionSource(null)` — both cleared. Logic correct; keyboard behavior requires browser verification. |
| 4 | Dragging a selected card from a spread zone moves the entire selected set as a group to the target zone | ? HUMAN NEEDED | Code: `isMultiCardSet` gates PLAY_CARD_SET dispatch when `selectedIds.size > 1 && selectedIds.has(activeId)`. Dispatch includes `fromZone: selectionSource?.zone`, `fromId: dragFromId`, `toZone`. Server handler in `party/index.ts` branches on `fromZone` for source resolution. All 9 `playCardSet` tests pass. Interactive drag verification required. |

**Score:** 4/4 truths have complete code implementation — all require human verification for visual/interactive confirmation.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | PLAY_CARD_SET widened with `fromZone?` and `toZone:'pile'\|'hand'` | VERIFIED | Line 67: `fromZone?: "hand" \| "pile"` and `toZone: "pile" \| "hand"` present |
| `party/index.ts` | Extended PLAY_CARD_SET handler branching on fromZone | VERIFIED | 16 `fromZone` references; `fromZone === "pile"` branch for source resolution; `toZone === "hand"` branch for dest + faceUp; `TODO(SPREAD-03 ownership)` comment at line 519 |
| `tests/playCardSet.test.ts` | 9 test cases (5 existing + 4 new pile-source) | VERIFIED | 9 tests, all 9 pass (confirmed by `npm test -- --run tests/playCardSet.test.ts`) |
| `src/components/SpreadZone.tsx` | SortableSpreadCard with isSelected/onToggleSelect; SpreadZone with interactive/selectedIds/onToggleSelect/selectionSource props | VERIFIED | All 8 props present; ring class, lift transform, aria-pressed, onPointerDown.stopPropagation, drag-origin placeholder all confirmed |
| `src/components/BoardDragLayer.tsx` | selectionSource state, zone-exclusive handleToggleSelect, extended isMultiCardSet, extended PLAY_CARD_SET dispatch | VERIFIED | `SelectionSource` type, `selectionSource` state, `isDifferentZone` logic, `dragFromId` capture, 4 `setSelectionSource(null)` clear paths, `opponent-hand` normalization fix from Plan 04 |
| `src/components/BoardView.tsx` | selectionSource prop threading; interactive={false} for opponent zones; interactive={true} for communal + personal spread | VERIFIED | `interactive={false}` on opponent zone (line 52); `interactive={true}` on communal (line 76) and personal spread (line 91); `selectionSource={selectionSource}` on both interactive zones |
| `src/components/HandZone.tsx` | Updated onToggleSelect to 3-arg signature; onClick passes zone context | VERIFIED | `onToggleSelect: (id: string, zone: 'hand' \| 'pile', zoneId: string) => void` in both interfaces; `onClick={() => onToggleSelect(card.id, 'hand', playerId)}` confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SortableSpreadCard` | `onToggleSelect(card.id, 'pile', pileId)` | onClick handler | WIRED | Line 42 of SpreadZone.tsx |
| `SpreadZone` header | `selectedIds.size >= 2` badge | `selectionSource?.zoneId === pile.id` guard | WIRED | Line 117 of SpreadZone.tsx |
| `BoardDragLayer handleToggleSelect` | `selectionSource` state update | `isDifferentZone` check clears selectedIds and restarts | WIRED | Lines 68–83 of BoardDragLayer.tsx |
| `BoardDragLayer handleDragEnd isMultiCardSet` | `sendAction PLAY_CARD_SET` with `fromZone/fromId` from selectionSource | `selectionSource?.zone === 'pile'` branch | WIRED | Lines 147–175 of BoardDragLayer.tsx |
| `BoardView` opponent SpreadZone | `interactive={false}` | opponentSpread render path | WIRED | Line 52 of BoardView.tsx |
| `party/index.ts PLAY_CARD_SET case` | `piles.find(p => p.id === fromId)?.cards` | `fromZone === 'pile'` branch | WIRED | Lines 521–525 of party/index.ts |
| `party/index.ts PLAY_CARD_SET case` | `hands[toId]` auto-create | `toZone === 'hand'` branch | WIRED | Lines 559–571 of party/index.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `SpreadZone.tsx` | `selectedIds`, `selectionSource` | Props from BoardDragLayer via BoardView | Yes — flows from real useState in BoardDragLayer, updated by actual card click events | FLOWING |
| `party/index.ts PLAY_CARD_SET handler` | `source` (cards array) | `this.gameState.piles.find(p => p.id === fromId)?.cards` for pile-source | Yes — reads from authoritative gameState piles; mutations confirmed by 9 passing tests | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 9 playCardSet tests pass | `npm test -- --run tests/playCardSet.test.ts` | 9 passed, 0 failed | PASS |
| TypeScript compiles clean | `npm run typecheck` | exits 0 | PASS |
| Full test suite | `npx vitest run` | 154 passed, 0 failed | PASS |
| `fromZone` in party/index.ts handler | `grep -c fromZone party/index.ts` | 16 matches | PASS |
| `setSelectionSource(null)` in 4 clear paths | `grep -c setSelectionSource.null. BoardDragLayer.tsx` | 4 matches | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SPREAD-01 | 20-02, 20-03 | Player can click to select multiple cards in a spread zone, with the same visual selection treatment as player hand | NEEDS HUMAN | Code complete: ring, lift, toggle, zone-exclusive clearing, badge all implemented and wired. Visual behavior requires browser session. |
| SPREAD-03 | 20-01, 20-03 | Player can drag a selected set of cards from a spread zone to another zone | NEEDS HUMAN | Code complete: server contract extended (9 passing tests), client dispatch wired with fromZone/fromId routing, intra-spread guard. Drag behavior requires browser session. |
| SPREAD-02 | (not Phase 20) | Player can drag-reorder cards within a spread zone | NOT CLAIMED | REQUIREMENTS.md traceability maps SPREAD-02 to Phase 21 — correctly deferred. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `party/index.ts` | 519 | `TODO(SPREAD-03 ownership): pile-source ownership guard deferred` | Info | Intentional deferred guard per REQUIREMENTS.md "Future Requirements" — no blocker; documented in plan threat model |

No stubs, no empty implementations, no placeholder returns found in any modified file.

### Human Verification Required

**All four ROADMAP success criteria require human browser verification.** The code implementation is complete and wired end-to-end, but the phase goal includes visual and interactive behaviors (ring animations, drag group movement, opponent zone drag restriction) that cannot be confirmed by automated checks.

#### 1. Single card selection ring and lift

**Test:** Click any card in your personal spread zone
**Expected:** Card lifts with amber ring; click same card again to deselect
**Why human:** CSS animation and visual ring rendering cannot be asserted by Vitest

#### 2. Multi-card selection accumulation and badge

**Test:** Click 3 different spread zone cards; then click one to deselect
**Expected:** All 3 show ring + lift; header shows "3 selected" badge; after deselect shows "2 selected"
**Why human:** Badge conditional (`selectedIds.size >= 2 && selectionSource?.zoneId === pile.id`) and multi-select accumulation require live DOM

#### 3. Escape clears selection

**Test:** Select 2+ cards; press Escape
**Expected:** All rings/lifts and badge disappear
**Why human:** Keyboard event handler behavior requires browser environment

#### 4. Zone-exclusive selection clearing

**Test:** Select 2 cards in personal spread zone; click a card in communal zone or hand
**Expected:** Personal spread clears; new card selected
**Why human:** `isDifferentZone` client state branching requires live interaction to observe

#### 5. Multi-card drag to pile zone

**Test:** Select 2+ spread cards; drag one onto a pile zone
**Expected:** All selected cards move to pile; selection clears
**Why human:** dnd-kit drag behavior and PLAY_CARD_SET group dispatch require live session

#### 6. Multi-card drag to hand zone

**Test:** Select 2+ communal spread cards; drag one to your hand strip
**Expected:** All selected cards appear in hand; selection clears
**Why human:** toZone:'hand' dispatch + hand rendering requires live browser session

#### 7. Opponent zone is drop-only (not draggable)

**Test:** In window 2 deal cards; in window 1 attempt to drag from player 2's personal spread zone
**Expected:** No drag ghost appears
**Why human:** `interactive={false}` effect (useSortable not called) requires browser DnD observation

#### 8. Badge only shows for owning zone

**Test:** Select 3 cards in personal spread zone; verify communal zone shows no badge
**Expected:** Only personal spread zone header shows badge
**Why human:** `selectionSource?.zoneId === pile.id` guard in SpreadZone requires live state observation

### Gaps Summary

No automated gaps. All must-have artifacts exist, are substantive, and are wired. The 9-case test suite passes. TypeScript is clean. The phase status is `human_needed` because SPREAD-01 and SPREAD-03 include visual interaction behaviors that can only be confirmed in a browser session with two players.

Plan 04 (the human smoke test plan) documents 9 manual test cases already run by the developer and marked PASS, including a bug fix for opponent-hand multi-select normalization. The VERIFICATION.md human_verification section above maps to those same 9 test cases for independent confirmation before final sign-off.

---

_Verified: 2026-05-10T08:32:00Z_
_Verifier: Claude (gsd-verifier)_
