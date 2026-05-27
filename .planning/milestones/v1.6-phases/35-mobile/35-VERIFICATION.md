---
phase: 35-mobile
verified: 2026-05-26T21:20:00Z
status: human_needed
score: 7/8 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
human_verification:
  - test: "Confirm hand/pile-to-canvas drop coordinates are correct while canvas is panned (scroll offset correctness)"
    expected: "A card dragged from hand and dropped onto a panned canvas lands at the visual drop point. After panning back to scroll.x=0, the card remains at the visual drop point (no jump). This is MOBILE-01 truth 7."
    why_human: "The implementation uses getBoundingClientRect() on the translated inner div rather than explicit scrollOffsetRef addends. These are mathematically equivalent only if the inner div's CSS transform updates synchronously before the drop handler reads the rect. Playwright test 12 in Plan 02's checklist covers this but was run by the operator, not an automated assertion. The automated Playwright spec (mobile.spec.ts) has no test for drop-under-pan accuracy — the tests only cover arrow visibility, transform change, and no-drag-conflict. A human must confirm the drop lands correctly at a visibly non-zero scroll position."
  - test: "Confirm canvas height cap behavior at 375x667 with the height cap removed (final_max_h: removed)"
    expected: "At 375x667 viewport with flex-1 layout (no explicit max-h), the canvas band does not push spread zone or hand zone off-screen. MOBILE-03 requires spread zone AND hand zone visible without vertical page scroll."
    why_human: "The Plan 01 must_have specifies max-h-[240px] sm:max-h-none on the canvas wrapper. Plan 02 operator removed the height cap entirely (final_max_h: removed). The current BoardView.tsx has no max-h constraint at all — the canvas wrapper is a plain flex-1 div. Whether flex-1 alone correctly bounds the canvas at 375x667 depends on the actual rendered heights of opponent zone, spread zone, and hand zone. The automated MOBILE-03 Playwright test only checks scrollHeight <= clientHeight after dealing 5 cards with no opponent (single-player room). A human must confirm the layout holds with opponents present."
---

# Phase 35: Mobile Edge Pan Verification Report

**Phase Goal:** Make the free canvas play area usable on narrow viewports (375px and up) — mobile edge-pan arrows, hold-to-pan, dnd-kit drag/pan non-conflict, and canvas height cap.
**Verified:** 2026-05-26T21:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | An edge arrow appears in a direction when canvas content overflows in that direction | VERIFIED | `hasOverflow` computed from `scroll.x < innerW - viewportSize.w` etc.; EdgeArrow returns null when `!visible`; Playwright test 2 covers this |
| 2 | No edge arrow appears when canvas content does not overflow in that direction | VERIFIED | Same `visible` prop mechanism; Playwright test 1 (empty canvas) asserts all four arrows have count 0 |
| 3 | Holding an edge arrow continuously pans the canvas (PAN_STEP=8, PAN_INTERVAL=16) | VERIFIED | `startPan` uses `setInterval(..., 16)` with `PAN_STEP=8` at lines 164-176 of CanvasZone.tsx; Playwright test 3 confirms transform changes after 120ms hold |
| 4 | Releasing the edge arrow (pointerup or pointerleave) stops panning immediately | VERIFIED | `onPointerUp={onPanEnd}`, `onPointerLeave={onPanEnd}`, `onPointerCancel={onPanEnd}` on EdgeArrow div (lines 45-47 of CanvasZone.tsx) |
| 5 | Pressing an edge arrow does not register as a dnd-kit drag start | VERIFIED | `e.stopPropagation()` on `onPointerDown` (line 44 of CanvasZone.tsx); Playwright test 4 confirms canvas-selection-count stays 0 |
| 6 | At viewport width <640px, canvas height is capped so spread zone and hand zone remain visible without page scroll at 375x667 | UNCERTAIN | Plan 01 implemented max-h-[240px]; Plan 02 operator REMOVED the height cap (final_max_h: removed). Current BoardView.tsx line 99 has no max-h on canvas wrapper — uses flex-1 only. Automated MOBILE-03 test passes in single-player but human confirmation needed with opponents present (see Human Verification) |
| 7 | Cards dropped from hand/pile onto a panned canvas land at the correct canvas-space coordinates (scroll offset applied) | UNCERTAIN | Implementation uses getBoundingClientRect() on translated inner div rather than explicit scrollOffsetRef addends (see analysis below); mathematically correct IF transform updates synchronously; Plan 02 operator confirmed in checklist item 12 but no automated assertion covers this path |
| 8 | Cards dropped from canvas to canvas while panned land at correct positions without double-counting scroll offset | VERIFIED | canvas→canvas path uses `existing.x + event.delta.x` (lines 400-404 of BoardDragLayer.tsx); no scroll offset applied; inner div BoundingClientRect not used in this path |

**Score:** 6/8 truths fully verified; 2 UNCERTAIN (flagged for human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `playwright/mobile.spec.ts` | Wave-0 RED tests for MOBILE-01, MOBILE-02, MOBILE-03 | VERIFIED | File exists; 5 tests under `Phase 35 mobile edge pan` describe block; viewport 375x667; all testids present |
| `src/components/CanvasZone.tsx` | Two-div viewport+canvas, EdgeArrow x4, pan state, ResizeObserver, scrollOffsetRef write | VERIFIED | All elements present and wired (see Key Links) |
| `src/components/BoardDragLayer.tsx` | scrollOffsetRef declared and passed down | VERIFIED | `scrollOffsetRef = useRef<{x,y}>({x:0,y:0})` at line 97; passed to BoardView at line 620 |
| `src/components/BoardView.tsx` | scrollOffsetRef prop forwarded; height cap wrapper | PARTIAL | scrollOffsetRef prop and forwarding verified (lines 25, 33, 100); height cap wrapper (max-h-[240px]) was present in Plan 01 but removed in Plan 02 operator adjustment — no max-h on canvas wrapper in current code |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CanvasZone.tsx | BoardDragLayer.tsx scrollOffsetRef | `scrollOffsetRef.current = scroll` in useEffect | WIRED | Line 127: `scrollOffsetRef.current = scroll;` inside useEffect with `[scroll, scrollOffsetRef]` deps |
| CanvasZone.tsx | dnd-kit useDroppable | `setRefs` on inner canvas div only | WIRED | `setRefs` at line 99 combines setNodeRef + canvasRef; attached to inner div at line 214 (`ref={setRefs}`, `data-testid="canvas-inner"`); outer div uses only `ref={viewportRef}` |
| BoardView.tsx | CanvasZone.tsx | scrollOffsetRef prop pass-through | WIRED | Line 100 of BoardView.tsx: `scrollOffsetRef={scrollOffsetRef}` in CanvasZone props |

### Drop Coordinate Analysis (Key Deviation from PLAN)

The PLAN required explicit `+ scrollX` / `+ scrollY` addends in `handleDragEnd` for hand/pile→canvas paths. The implementation does NOT add these explicitly. Instead:

- `canvasRef` is attached to the **inner (translated) canvas div** via `setRefs`
- `canvasBounds = canvasRef.current?.getBoundingClientRect()` returns the viewport-space rect of the **translated inner div**
- When scroll is `{x: 50, y: 0}`, the inner div is translated by `translate(-50px, 0)`, so `canvasBounds.left` is 50px smaller than the outer viewport div's left edge
- `baseX = pointerFinalX - canvasBounds.left - CARD_W/2` therefore implicitly includes the scroll offset

The comment at lines 406-408 of BoardDragLayer.tsx documents this reasoning: "getBoundingClientRect() on the translated inner div already encodes scroll offset, so no explicit scroll addend is needed (adding it would double-count)."

This approach is geometrically equivalent **if** the CSS transform has been committed to the DOM before `getBoundingClientRect()` is called. Since `setScroll` triggers a React re-render that applies the CSS transform, and `handleDragEnd` runs on pointer up (after render), this should hold in practice. The Plan 02 operator confirmed correct drop behavior in checklist item 12, but no automated test asserts it.

The `scrollOffsetRef` is therefore written but never read in `handleDragEnd` — it is a dead write in the current implementation. This is not a bug (the alternative mechanism works), but it means the PLAN's acceptance criteria greps (`grep -c "+ scrollX"` ≥ 2) would fail against the actual code.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| CanvasZone.tsx EdgeArrow | `hasOverflow.{dir}` | `scroll` state + `innerW/innerH` from canvasCards useMemo | Yes — derived from real card positions | FLOWING |
| CanvasZone.tsx inner div | `scroll.x`, `scroll.y` | setInterval in startPan | Yes — live interval updates | FLOWING |
| scrollOffsetRef | `scroll` | useEffect sync after setScroll | Written (flowing) but never read in drop handler | FLOWING (dead read) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript clean | `npm run typecheck` | exit 0 | PASS |
| Unit tests pass | `npm test` | 254/254 pass | PASS |
| PAN_STEP=8 in CanvasZone | `rg "PAN_STEP = 8" src/components/CanvasZone.tsx` | line 10 | PASS |
| PAN_INTERVAL=16 in CanvasZone | `rg "PAN_INTERVAL = 16" src/components/CanvasZone.tsx` | line 11 | PASS |
| EdgeArrow testids present | `rg 'edge-arrow-' src/components/CanvasZone.tsx` | lines 37, 260-263 | PASS |
| canvas-inner testid present | `rg 'canvas-inner' src/components/CanvasZone.tsx` | line 215 | PASS |
| stopPropagation on arrow pointerdown | `rg 'stopPropagation' src/components/CanvasZone.tsx` | line 44 | PASS |
| setRefs on inner div only | outer div has `ref={viewportRef}` (line 203), inner has `ref={setRefs}` (line 214) | confirmed | PASS |
| No max-h-[240px] in BoardView | `rg "max-h-\[" src/components/BoardView.tsx` | no output | NOTED — cap removed |
| scrollOffsetRef in BoardDragLayer | `rg "scrollOffsetRef" src/components/BoardDragLayer.tsx` | lines 97, 620 | PASS (declared + passed) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| MOBILE-01 | Hold-to-scroll edge arrows appear when canvas content overflows; holding pans continuously | SATISFIED | EdgeArrow components render on overflow; setInterval pan loop at PAN_STEP=8/PAN_INTERVAL=16; 3 Playwright tests cover visibility + pan + speed |
| MOBILE-02 | Edge-pan does not conflict with one-finger card drag gestures | SATISFIED | `stopPropagation()` on EdgeArrow `onPointerDown` prevents dnd-kit receiving the event; Playwright test 4 confirms no selection triggered |
| MOBILE-03 | Canvas height bounded at <640px viewport so spread zones remain visible | UNCERTAIN | max-h-[240px] cap removed in Plan 02; current impl relies on flex-1 layout; automated MOBILE-03 test passes single-player; multi-player layout not automatically verified |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/BoardDragLayer.tsx | 97 | `scrollOffsetRef` declared and passed but never read in handleDragEnd | Info | Dead write — not a bug (alternative BoundingClientRect mechanism used), but creates misleading PLAN acceptance criteria mismatch |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or placeholder markers found in the modified files.

### Human Verification Required

#### 1. Drop Accuracy Under Pan

**Test:** Start the dev stack (`npm run dev` + `npm run dev:client`). Open Chrome at `http://localhost:5173` at 375x667 device viewport. Join a room and deal 5 cards. Drag a hand card to the canvas near the right edge to create right overflow. Pan the canvas right ~80px by holding the right arrow. Then drag a second hand card and drop it at any visible canvas point. Note the visual drop point. Pan back to scroll.x=0 by holding the left arrow until it disappears. Confirm the card remains at the visual drop point — it must not jump.

**Expected:** Card stays at the visual position it was dropped at, regardless of subsequent pan state changes.

**Why human:** The implementation uses getBoundingClientRect() on the translated inner div instead of explicit scrollOffsetRef addends. The Plan 02 operator confirmed this worked (checklist item 12) but no automated Playwright test asserts drop accuracy under pan. The mechanism is sound in theory but needs confirmation with the current code (after the onContextMenu fix was applied).

#### 2. MOBILE-03 Layout With Opponents Present

**Test:** Open two browser windows (separate profiles to prevent token sharing) at 375x667. Join the same room as two players. Deal cards. Confirm: (a) spread zone is fully visible, (b) hand zone bottom edge is at or above y=667, (c) no vertical page scroll is required to reach the hand, (d) `document.documentElement.scrollHeight <= document.documentElement.clientHeight`.

**Expected:** All bands (opponent area, canvas, spread, hand) fit within 667px without page scroll, with no explicit height cap on the canvas — flex distribution must handle it naturally.

**Why human:** The max-h-[240px] cap was removed. The MOBILE-03 Playwright test only runs single-player (no opponent zone rendered). The opponent zone adds height. Whether flex-1 distribution naturally constrains the canvas correctly in a 2-player layout at 375x667 cannot be verified without rendering both zones.

### Gaps Summary

No BLOCKER gaps. Two UNCERTAIN truths require human confirmation before the phase can be marked complete:

1. **Drop accuracy under pan** (truth 7) — implementation mechanism differs from PLAN spec but may be correct; operator confirmed manually but no automated coverage.

2. **MOBILE-03 with opponents** (truth 6) — height cap was removed in Plan 02; single-player automated test passes but multi-player layout at 375x667 not verified.

Both items are routed to human verification above.

---

_Verified: 2026-05-26T21:20:00Z_
_Verifier: Claude (gsd-verifier)_
