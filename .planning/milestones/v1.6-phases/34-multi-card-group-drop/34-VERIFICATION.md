---
phase: 34-multi-card-group-drop
verified: 2026-05-25T19:30:00Z
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Canvas click-to-select visual: ring, count badge, deselect on background click, zone-exclusive switching"
    expected: "Blue ring (0 0 0 2px #60a5fa) on selected canvas cards; '2 selected' badge in top-left at >=2; clicking empty canvas deselects all; clicking a hand card while canvas selection active switches selection zone"
    why_human: "Visual ring color, badge rendering, and zone-exclusive UX interaction cannot be verified by grep or unit tests — requires a live browser session"
  - test: "Canvas→canvas group drop: passenger ghost tracks drag, source cards invisible, both land at preserved relative positions"
    expected: "Source cards at opacity:0 during drag; passenger ghost div at 50% opacity at (cc.x+delta.x, cc.y+delta.y); both cards land at new positions with internal z-order preserved and z above all pre-existing canvas cards"
    why_human: "Passenger ghost rendering during pointer drag, opacity during drag, and visual z-order are runtime behaviors not captured by unit tests"
  - test: "Hand→canvas group drop: 3 cards from hand placed on canvas with relative spacing matching pre-drag DOM layout"
    expected: "All 3 cards appear on canvas face-up; hand count drops by 3; relative spacing matches pre-drag hand row positions; Player 2 sees new positions within 1-2 seconds"
    why_human: "DOM offset capture via getBoundingClientRect at drag start requires a live browser; two-player sync requires two sessions"
  - test: "Spread→canvas group drop: 2 spread zone cards placed on canvas preserving relative offsets"
    expected: "Both cards removed from spread zone; both appear on canvas; relative offset matches spread zone DOM positions"
    why_human: "Same DOM offset capture requirement as hand→canvas; requires live browser"
  - test: "Bounds violation silent snap-back: group drag where any card would overflow canvas edge"
    expected: "Both cards return to pre-drag positions; no toast, no flash, no partial placement; no movement visible to Player 2"
    why_human: "Silent snap-back (no visual feedback) requires a live browser to confirm absence of any error indicator"
  - test: "Single-step undo of group drop restores all N cards"
    expected: "One undo press restores all moved cards to pre-drop source positions (hand or canvas); canvas reverts entirely"
    why_human: "Undo keyboard/button interaction and visual state restoration require a live browser; the server-side single-snapshot invariant is verified by unit test but the client-side undo flow needs manual confirmation"
  - test: "Two-player real-time sync of group drop"
    expected: "Player 2 sees group drop result appear within 1-2 seconds; Player 1's source zone updates match Player 2's view"
    why_human: "Requires two simultaneous browser sessions connected to the same PartyKit room"
---

# Phase 34: Multi-Card Group Drop Verification Report

**Phase Goal:** Players can select multiple canvas cards and drag them as a group to the canvas (or from hand/spread to canvas), with all cards landing atomically with correct relative positions, server-side auth and validation, and single-undo restoring the entire group.
**Verified:** 2026-05-25T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Player can click individual canvas cards to select them (ring/lift visual); clicking elsewhere deselects | ? UNCERTAIN | `handleToggleSelectCanvas` wired end-to-end; `isSelected` prop controls boxShadow ring; `onClick={onDeselectAll}` on canvas container. Visual behavior requires human verification |
| SC2 | Dragging any selected card moves all selected cards together; each lands at original offset relative to drag handle | ? UNCERTAIN | `GROUP_PLACE_ON_CANVAS` dispatch present; `passengerOffsetsRef` captures DOM offsets at drag start; GROUP path in `handleDragEnd` confirmed. Actual drag mechanics require human verification |
| SC3 | After group drop, all dropped cards have z-indices higher than any pre-existing canvas card; internal z-order preserved | ✓ VERIFIED | `party/index.ts` lines 698–763: `maxZGroup = max(canvasCards z values)` computed before splice; `resolvedGroupCards.sort(a.preDragZ - b.preDragZ)`; push at `maxZGroup + 1 + rank`. Z-ordering test passes (z-ordering describe block, test at line 515 asserts Q-d=8, A-s=9, K-h=10) |
| SC4 | If any card would land outside canvas bounds, entire drop cancelled and all snap back — no partial placement | ✓ VERIFIED (client gate) | `allInBounds = cards.every(({x,y}) => ...)` in `handleDragEnd`; silent snap-back path clears state without dispatching. Server-side coordinate validation (`INVALID_COORDINATES`) also present as defense in depth |

### Must-Haves: Plan 01 (server + types)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Client can send GROUP_PLACE_ON_CANVAS with {fromZone, fromId, cards[{cardId,x,y}]} and server processes atomically | ✓ VERIFIED | `src/shared/types.ts` line 89: union member present. `party/index.ts` line 648: `case "GROUP_PLACE_ON_CANVAS"` implemented. 11 passing tests |
| 2 | All cards in group land on canvasCards with z above any existing card; internal z ascending | ✓ VERIFIED | Lines 760–763: sort by preDragZ ascending, push at maxZGroup+1+rank. Test at line 515 confirms exact z values |
| 3 | Hand source: server rejects when fromId !== senderToken (UNAUTHORIZED_MOVE) | ✓ VERIFIED | Lines 687–693: `if (fromZone === "hand" && fromId !== senderToken)` → UNAUTHORIZED_MOVE. Test passes (line 550) |
| 4 | Empty/duplicate/NaN/missing cardId validation — no mutation on any error | ✓ VERIFIED | Lines 651–736: all five error codes implemented in validation order. Tests at lines 601, 622, 576, 646 all pass; 254/254 suite green |
| 5 | Single UNDO_MOVE after GROUP_PLACE_ON_CANVAS restores all N cards | ✓ VERIFIED | `takeSnapshot(this.gameState)` called once at line 739. Test at line 694 confirms all cards restored with one undo press |

### Must-Haves: Plan 02 (canvas selection state)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Clicking canvas card adds to selectedIds; selectionSource becomes {zone:'canvas',zoneId:'canvas'} | ✓ VERIFIED | `handleToggleSelectCanvas` at `BoardDragLayer.tsx` line 134; wired through BoardView → CanvasZone → CanvasDraggableCard `onToggleSelect` prop |
| 7 | Zone-exclusive: clicking canvas while hand/pile selection active clears and switches | ✓ VERIFIED | `handleToggleSelectCanvas` lines 137–153: `if (selectionSource !== null && selectionSource.zone !== 'canvas')` → clears and resets |
| 8 | Clicking empty canvas area deselects all | ✓ VERIFIED | `CanvasZone.tsx` line 55: `onClick={onDeselectAll}`. `handleDeselectAll` at BoardDragLayer line 159 clears both state values. `stopPropagation()` on card click prevents bubble |
| 9 | Selected canvas cards render selection ring | ? UNCERTAIN | `CanvasDraggableCard.tsx` line 57–58: `isSelected ? '0 0 0 2px #60a5fa, 0 0 0 4px rgba(96,165,250,0.3)'`. Code is correct; visual rendering requires human check |
| 10 | Selection count badge visible in canvas top-left at >=2 selected | ✓ VERIFIED | `CanvasZone.tsx` line 61: `{selectedIds.size >= 2 && <span data-testid="canvas-selection-count"...>`. Code is wired; visual appearance is human check |
| 11 | Every draggable card carries `data-card-id` attribute equal to card.id | ✓ VERIFIED | `CanvasDraggableCard.tsx` line 68; `DraggableCard.tsx` line 48; `SpreadZone.tsx` line 51 — all three confirmed |

### Must-Haves: Plan 03 (drag mechanics)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | GROUP_PLACE_ON_CANVAS dispatched from handleDragEnd with all-or-nothing bounds check | ✓ VERIFIED | `BoardDragLayer.tsx` lines 307–371: GROUP path triggered on `canvasBounds && selectedIds.size >= 2 && selectedIds.has(activeId)`; `allInBounds` check; dispatch at line 371 |

**Score:** 11/12 must-haves VERIFIED (1 UNCERTAIN — SC1/SC2/SC9 are the same human-visible truth set, consolidated above)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | GROUP_PLACE_ON_CANVAS union member + SelectionSource export | ✓ VERIFIED | Line 89: union member with correct shape. Lines 91–94: SelectionSource three-variant type exported |
| `party/index.ts` | GROUP_PLACE_ON_CANVAS case handler | ✓ VERIFIED | Line 648: case present, lines 648–767: full implementation with all validation + atomic z-assignment |
| `tests/canvasCards.test.ts` | describe('GROUP_PLACE_ON_CANVAS handler') block, 10+ tests | ✓ VERIFIED | Line 412: describe block exists. 11 tests covering all 10 behavior bullets. 33 total tests in file pass |
| `src/components/BoardDragLayer.tsx` | handleToggleSelectCanvas, handleDeselectAll, groupIds useMemo, dragDelta state, GROUP_PLACE_ON_CANVAS dispatch | ✓ VERIFIED | All confirmed via grep: line 134, 159, 164, 90, 371 |
| `src/components/CanvasZone.tsx` | passengerGhosts useMemo, ghost div rendering, onDeselectAll onClick, count badge | ✓ VERIFIED | Lines 45–48, 55, 61–67, 79–94 all substantive |
| `src/components/CanvasDraggableCard.tsx` | isSelected/isPassenger/onToggleSelect props, ring style, data-card-id, aria-pressed | ✓ VERIFIED | Lines 12–14, 39, 44, 54, 57–60, 68, 73 all confirmed |
| `src/components/DraggableCard.tsx` | data-card-id on root draggable div | ✓ VERIFIED | Line 48: `data-card-id={card.id}` |
| `src/components/SpreadZone.tsx` | data-card-id on per-card sortable element | ✓ VERIFIED | Line 51: `data-card-id={card.id}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/canvasCards.test.ts` GROUP tests | `party/index.ts case "GROUP_PLACE_ON_CANVAS"` | `room.onMessage(JSON.stringify({type:'GROUP_PLACE_ON_CANVAS',...}))` | ✓ WIRED | 11 tests send GROUP_PLACE_ON_CANVAS messages; all 33 canvasCards tests pass |
| `src/shared/types.ts ClientAction union` | `party/index.ts switch statement` | `case "GROUP_PLACE_ON_CANVAS"` | ✓ WIRED | Type union line 89; case line 648; TypeScript compiles clean |
| `CanvasDraggableCard.tsx onClick` | `BoardDragLayer.tsx handleToggleSelectCanvas` | `onToggleSelect` prop chain via CanvasZone → BoardView → BoardDragLayer | ✓ WIRED | BoardDragLayer line 602 passes prop; CanvasZone line 17/76 forwards; CanvasDraggableCard line 44 calls |
| `CanvasZone.tsx container div onClick` | `BoardDragLayer.tsx handleDeselectAll` | `onDeselectAll` prop | ✓ WIRED | BoardDragLayer line 602; CanvasZone line 18/55: `onClick={onDeselectAll}` |
| `BoardDragLayer.tsx selectionSource state` | `src/shared/types.ts SelectionSource` | `import type { SelectionSource } from '@/shared/types'` | ✓ WIRED | BoardDragLayer line 6: import confirmed; line 89: `useState<SelectionSource>(null)` |
| `BoardDragLayer.tsx handleDragEnd canvas branch` | `party/index.ts GROUP_PLACE_ON_CANVAS case` | `sendAction({ type: 'GROUP_PLACE_ON_CANVAS', fromZone, fromId, cards })` | ✓ WIRED | Lines 362–376: dispatch present in GROUP path |
| `CanvasZone.tsx passenger ghost JSX` | `dragDelta state in BoardDragLayer` | `dragDelta` prop threaded via BoardView | ✓ WIRED | BoardDragLayer line 90 (state); line 602 (prop pass); CanvasZone line 16, 85–86 (rendered) |
| `BoardDragLayer.tsx handleDragStart offset capture` | `data-card-id attributes in Plan 02` | `document.querySelector('[data-card-id=...]').getBoundingClientRect()` | ✓ WIRED | Lines 256–266: querySelector with data-card-id pattern confirmed |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `party/index.ts GROUP_PLACE_ON_CANVAS` | `resolvedGroupCards` | Hand/pile/canvas state arrays (lines 706–727) | Yes — reads from live game state arrays | ✓ FLOWING |
| `CanvasZone.tsx passengerGhosts` | `canvasCards` (filtered by groupIds) | `canvasCards` prop from server-broadcast ClientGameState | Yes — sourced from server state, not hardcoded | ✓ FLOWING |
| `CanvasZone.tsx` count badge | `selectedIds.size` | `selectedIds` Set state in BoardDragLayer, updated by `handleToggleSelectCanvas` | Yes — driven by user click events updating real state | ✓ FLOWING |

---

### Behavioral Spot-Checks (Step 7b)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| canvasCards test suite (11 GROUP tests + 22 pre-existing) | `npm test -- --run tests/canvasCards.test.ts` | 33 passed, exit 0 | ✓ PASS |
| Full Vitest suite | `npm test` | 254 passed across 32 test files, exit 0 | ✓ PASS |
| TypeScript compilation | `npm run typecheck` | exit 0, no errors | ✓ PASS |
| GROUP_PLACE_ON_CANVAS case in server | `grep -n 'case "GROUP_PLACE_ON_CANVAS"' party/index.ts` | 1 match at line 648 | ✓ PASS |
| SelectionSource exported | `grep -n 'export type SelectionSource' src/shared/types.ts` | 1 match at line 91 | ✓ PASS |
| data-card-id on all 3 card components | `grep -c 'data-card-id' src/components/{CanvasDraggableCard,DraggableCard,SpreadZone}.tsx` | 3 total (1 each) | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| MULTI-01 | 34-02 | Player can select multiple canvas cards (ring/lift UX); clicking elsewhere deselects | ? UNCERTAIN | Code fully wired; visual UX requires human verification |
| MULTI-02 | 34-01, 34-03 | On group drop, each card lands at pre-drag offset relative to drag handle | ? UNCERTAIN | `passengerOffsetsRef` DOM capture wired; actual offset correctness requires human check |
| MULTI-03 | 34-01 | All dropped cards receive z-indices above existing canvas cards; internal z-order preserved | ✓ VERIFIED | Server handler sorts by preDragZ ascending, assigns maxZ+1+rank. 3-card z-ordering test passes with exact z values |
| MULTI-04 | 34-01, 34-03 | Group drop valid only if all cards land in bounds; otherwise all snap back | ✓ VERIFIED (client + server) | Client `allInBounds` check gates dispatch; server validates INVALID_COORDINATES. Tests confirm no-mutation on validation failure |

Note: REQUIREMENTS.md shows MULTI-01 through MULTI-04 all marked `[ ]` (Pending) — the tracking file was not updated post-phase. This is a documentation gap, not a code gap.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `party/index.ts` | 805 | `// TODO(SPREAD-03 ownership)` | INFO | Pre-existing from Phase 32 commit (e68620c). Not introduced by Phase 34. References a named deferred item (SPREAD-03). No impact on GROUP_PLACE_ON_CANVAS behavior |

No new TBD/FIXME/XXX markers introduced by Phase 34. No stub implementations found. No hardcoded empty returns in Group handler path.

---

### Human Verification Required

Phase 34 Plan 04 (`autonomous: false`, `gate: blocking`) is a human verification checkpoint. The 34-04-SUMMARY.md documents all MULTI requirements as PASS and was committed under the developer's git identity (Aaron Kaminsky). However, automated verification cannot confirm that the interactive checklist items were executed in a live browser.

The following items from Plan 04's checklist require human confirmation:

#### 1. Canvas click-to-select visual ring and count badge

**Test:** Click individual canvas cards; confirm ring appears, badge shows count, deselect on background click works
**Expected:** Blue ring (`0 0 0 2px #60a5fa`) on selected card; `{N} selected` badge in canvas top-left at >=2; clicking empty canvas removes all rings
**Why human:** Visual ring color (`#60a5fa`) and badge rendering are CSS/DOM behaviors grep cannot verify

#### 2. Zone-exclusive selection switching

**Test:** Select 2 canvas cards → click a hand card → confirm canvas deselects and hand selection appears
**Expected:** Canvas rings disappear; badge gone; hand card shows its own selection state
**Why human:** Cross-zone UI state transitions require interactive testing

#### 3. Canvas→canvas group drop passenger ghost and z-order

**Test:** Select 2 canvas cards ~80px apart → drag → release on canvas
**Expected:** Passenger ghost at 50% opacity tracks drag; source cards at 0 opacity; both land at new positions with preserved offset; both z above pre-existing cards
**Why human:** Drag ghost animation, opacity during drag, and z-order visual stacking require a live browser

#### 4. Hand→canvas group drop with DOM-offset-captured positions

**Test:** Select 3 hand cards → drag to canvas → release
**Expected:** All 3 cards placed on canvas with relative spacing matching pre-drag hand row; all face-up; Player 2 sees update
**Why human:** Relative spacing correctness from DOM offset capture requires visual inspection; two-player sync requires two sessions

#### 5. Spread→canvas group drop

**Test:** Select 2 spread zone cards → drag to canvas → release
**Expected:** Both removed from spread; both placed on canvas; relative spacing preserved
**Why human:** Same DOM offset verification requirement as hand→canvas

#### 6. Bounds violation silent snap-back (no visual feedback)

**Test:** Select 2 canvas cards near right edge → drag rightward so a card overflows
**Expected:** Both snap back silently; no toast; no flash; no error; Player 2 sees no movement
**Why human:** Confirming absence of visual feedback requires a live browser; toast/flash absence cannot be grep-verified

#### 7. Single-step undo of group drop

**Test:** Perform 2-card group drop → press undo once → confirm all cards restored
**Expected:** One undo press restores both cards; canvas reverts to pre-drop state
**Why human:** Undo button interaction and visual state restoration require a live browser; server-side snapshot invariant is verified by unit test

#### 8. Two-player real-time sync

**Test:** Perform group drop in Player 1 session → observe in Player 2 session
**Expected:** Player 2 sees card positions update within 1-2 seconds
**Why human:** Requires two concurrent browser sessions connected to same PartyKit room

---

### Gaps Summary

No automated gaps found. All code artifacts exist, are substantive, and are wired. The 254/254 test suite is clean. TypeScript is clean.

The phase cannot be marked `passed` because Plan 04 is a `checkpoint:human-verify gate: blocking` plan covering interactive UX behaviors (ring animation, passenger ghosts, zone-exclusive switching, two-player sync, silent snap-back, undo UI flow) that cannot be verified by automated means. These items are routed to human UAT.

The ROADMAP shows `34-04-PLAN.md` as `[ ]` (unchecked) in the plan list, consistent with needing formal sign-off. The 34-04-SUMMARY.md was committed with PASS results — if the developer ran the interactive checklist and is satisfied with those results, this phase can be marked complete.

---

_Verified: 2026-05-25T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
