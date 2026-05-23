---
phase: 30-layout-restructure-dock-spread-zones
verified: 2026-05-22T07:20:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "In a 2-player room, confirm opponent spread zone appears directly below the opponent hand column (not in the bg-card header band)"
    expected: "Opponent spread is visually docked below the opponent's name/hand in the board area; the bg-card header shows only the opponent hand and the ControlsBar"
    why_human: "The structural Y-coordinate assertion in the Playwright test covers this for the personal spread zone only. Visual confirmation is needed that the opponent spread column aligns with the opponent hand column width in a live browser."
  - test: "On a tall viewport (e.g. 1280x1024), confirm extra vertical space grows between the piles/grid row and the spread row, not between an opponent's hand and that opponent's spread"
    expected: "The opponent spread row is flex-shrink-0; the flex-1 piles/grid row absorbs the extra space"
    why_human: "This vertical-space distribution can only be confirmed visually in a real browser at a tall viewport; no automated assertion covers it."
---

# Phase 30: Layout Restructure — Dock Spread Zones Verification Report

**Phase Goal:** Spread zones are spatially anchored to their owner hands — opponent spreads appear directly below each opponent hand; the personal spread appears flush above the local player's hand
**Verified:** 2026-05-22T07:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each opponent's spread zone renders immediately below that opponent's hand in the board area, not in the header band | ✓ VERIFIED | `BoardView.tsx` lines 39-62: `bg-card` header maps `allOpponentIds` rendering only `OpponentHand`, no `SpreadZone`. Lines 65-84: new `flex items-start gap-4 px-4 flex-shrink-0` row is the first child of the board area, containing the same `allOpponentIds.map` with `SpreadZone interactive={false}` |
| 2 | The personal spread zone continues to render flush above the local player's hand | ✓ VERIFIED | `BoardView.tsx` lines 102-115: `mySpreadZone` renders in `flex-shrink-0 px-4 py-1` wrapper; HandZone immediately follows at lines 117-134; layout order unchanged from pre-phase |
| 3 | Extra vertical space grows in the piles/grid row, not between hands and spreads | ✓ VERIFIED (code) | Piles row at line 86: `flex-1 min-h-0 flex items-center px-4 gap-4` — `flex-1` absorbs extra height. Opponent spread row at line 65: `flex-shrink-0` — cannot grow. Personal spread wrapper at line 103: `flex-shrink-0` — cannot grow. Visual confirmation needed (human check) |
| 4 | Opponent spread row columns visually align with the opponent hand columns | ✓ VERIFIED | Header column class (line 46): `flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`. Spread row column class (line 70): identical token set. Spacer `w-7 self-start shrink-0 pointer-events-none` at line 83 aligns with ControlsBar width |
| 5 | DndContext uses MeasuringStrategy.Always | ✓ VERIFIED | `BoardDragLayer.tsx` line 3: `MeasuringStrategy` in named import from `@dnd-kit/core`. Line 373: `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` on `DndContext` element |
| 6 | Drag-and-drop to and from spread zones works correctly after the DOM restructure (e2e verified) | ✓ VERIFIED | `playwright/game.spec.ts` lines 277-331: test `'spread zone dock: drag from hand to docked spread lands and stays in board area'` — behavioral assertions (hand 5→4, spread gains ≥1 card), structural assertion (`spreadBox.y > headerBox.y + headerBox.height`), and console-warning scrub. User confirmed all 15 e2e tests pass |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/BoardDragLayer.tsx` | DndContext with MeasuringStrategy.Always | ✓ VERIFIED | `MeasuringStrategy` imported at line 3; `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` at line 373 |
| `src/components/BoardView.tsx` | Board layout with opponent spreads docked under opponent hands in board area | ✓ VERIFIED | Opponent spreads in new `flex-shrink-0` row at board area top (lines 65-84); header band (lines 39-62) contains hands only; `flex-shrink-0` present |
| `playwright/game.spec.ts` | e2e drag test against the post-restructure layout | ✓ VERIFIED | New test block at lines 277-331; contains required test name, structural assertion, and duplicate-id scrub |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BoardDragLayer.tsx` | `@dnd-kit/core` | named import `MeasuringStrategy` | ✓ WIRED | Line 3: single named import extended; `MeasuringStrategy.Always` used at line 373 |
| `BoardView.tsx` | `SpreadZone.tsx` | opponent spreads in board area row with `interactive={false}` | ✓ WIRED | Lines 72-78: SpreadZone rendered inside spread row map; `interactive={false}` confirmed; `rg -c "interactive=\{false\}"` returns 1 — no header occurrence remains |
| `playwright/game.spec.ts` | `SpreadZone.tsx` | `[data-testid^="spread-zone-spread-"]` selector | ✓ WIRED | Lines 292-299: `querySelectorAll('[data-testid^="spread-zone-spread-"]')` used to locate spread zones; max-y reduction picks personal spread |
| `playwright/game.spec.ts` | `BoardView.tsx` | `.bg-card` selector for structural assertion | ✓ WIRED | Line 321: `p1.locator('.bg-card').first().boundingBox()` used for header bounding box in structural assertion |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `BoardView.tsx` (spread row) | `opponentSpread` | `spreadPiles.find(p => p.id === \`spread-${id}\`)` | Yes — `spreadPiles` derived from `gameState.piles` (server-authoritative) | ✓ FLOWING |
| `BoardView.tsx` (personal spread) | `mySpreadZone` | `spreadPiles.find(p => p.id === gameState.myPlayZoneId)` | Yes — same `gameState.piles` source | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npm run typecheck` | exit 0, no errors | ✓ PASS |
| All 226 unit tests pass | `npm test -- --run` | 226 passed in 31 files | ✓ PASS |
| New e2e test exists with correct name | `rg -c "spread zone dock" playwright/game.spec.ts` | 1 | ✓ PASS |
| Structural Y-assertion present | `rg -n "headerBox.y" playwright/game.spec.ts` | line 324: `expect(spreadBox.y).toBeGreaterThan(headerBox.y + headerBox.height)` | ✓ PASS |
| Duplicate-id warning scrub appears 3 times | `rg -c "duplicate id" playwright/game.spec.ts` | 3 (lines 273, 328, 460) | ✓ PASS |
| interactive={false} appears exactly once in BoardView | `rg -c "interactive=\{false\}" src/components/BoardView.tsx` | 1 | ✓ PASS |
| allOpponentIds.map appears twice in BoardView | `rg -c "allOpponentIds.map" src/components/BoardView.tsx` | 2 | ✓ PASS |
| w-7 spacer with aria-hidden present | `rg -n "aria-hidden" src/components/BoardView.tsx` | line 83 | ✓ PASS |
| flex-shrink-0 spread row outer wrapper present | `rg -n "flex items-start gap-4 px-4" src/components/BoardView.tsx` | line 65: `flex items-start gap-4 px-4 flex-shrink-0` | ✓ PASS |
| Personal spread wrapper unchanged | `rg -n "flex-shrink-0 px-4 py-1" src/components/BoardView.tsx` | line 103 | ✓ PASS |
| 15 e2e tests pass | User confirmed all 15 pass with live dev servers | All pass | ✓ PASS |

### Probe Execution

Step 7c: No probe scripts found or declared for this phase. Behavioral spot-checks above cover the automated verification surface.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LAYOUT-05 | 30-01-PLAN.md, 30-02-PLAN.md | Opponent spreads below their hands in board area; personal spread flush above hand; full e2e drag coverage | ✓ SATISFIED | All 4 ROADMAP success criteria verified: opponent spreads in board area (SC1), personal spread above hand (SC2), flex-1 absorbs extra space (SC3), e2e drag test passing (SC4) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TBD, FIXME, XXX, or placeholder markers found in files modified by this phase. No stub implementations. No orphaned wiring.

### Human Verification Required

**Note:** All automated checks pass including the e2e drag test. The two items below require visual confirmation in a live browser.

#### 1. Opponent Spread Column Alignment

**Test:** Open a 2-player room in a local browser (`npm run dev` + `npm run dev:client`). Deal 3-5 cards to each player so both spread zones become visible. Compare the left edge and width of the opponent spread column against the opponent hand column above it in the header band.

**Expected:** The opponent spread column has the same horizontal extent as the opponent hand column directly above it. Both are `flex-1` children of matching flex containers; the `w-7` spacer in the spread row aligns the spread's flex-1 region with the header's flex-1 region (which sits next to the `w-7`-wide ControlsBar trigger).

**Why human:** CSS flex alignment is only observable in a rendered browser; grep cannot verify visual column alignment.

#### 2. Extra Vertical Space Distribution on Tall Viewport

**Test:** Resize the browser to approximately 1280x1024. Observe where the whitespace accumulates between the board zones.

**Expected:** The gap grows between the piles/grid row and the opponent spreads row (or between piles row and personal spread row) — not between an opponent's hand and that opponent's spread, and not between the personal spread and the HandZone. The opponent spread row and personal spread row stay visually anchored to their respective hands.

**Why human:** Flex growth distribution on a tall viewport requires a real browser; no automated test captures this layout behavior at unusual viewport heights.

### Gaps Summary

No automated gaps found. Phase goal is achieved in code:

- Opponent spreads are docked in a `flex-shrink-0` board area row (not in the `bg-card` header band)
- Personal spread position is unchanged (`flex-shrink-0 px-4 py-1` wrapper above HandZone)
- `MeasuringStrategy.Always` is wired on DndContext
- The new Playwright e2e test passes (user confirmed all 15 tests pass), including the structural Y-coordinate assertion that proves DOM topology, not just CSS

Two items require human visual confirmation before the phase can be marked definitively complete: column alignment and tall-viewport space distribution. These are visual quality checks; no code defect is suspected.

---

_Verified: 2026-05-22T07:20:00Z_
_Verifier: Claude (gsd-verifier)_
