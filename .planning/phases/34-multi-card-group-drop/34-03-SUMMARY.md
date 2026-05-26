---
phase: 34-multi-card-group-drop
plan: 03
subsystem: client-ui
tags: [react, typescript, dnd-kit, canvas, multi-card, drag, group-drop]

# Dependency graph
requires:
  - phase: 34-multi-card-group-drop
    plan: 02
    provides: groupIds, activeCardId, dragDelta prop chain; data-card-id on all draggable cards; selectedIds/selectionSource state
  - phase: 34-multi-card-group-drop
    plan: 01
    provides: GROUP_PLACE_ON_CANVAS server handler + ClientAction type
provides:
  - DOM offset capture for hand/spread passenger cards at drag start (passengerOffsetsRef)
  - dragDelta state updated every pointermove (dual ref+state pattern)
  - Passenger ghost div rendering in CanvasZone for canvas-to-canvas group drag
  - GROUP_PLACE_ON_CANVAS dispatch with all-or-nothing bounds check in handleDragEnd
  - Silent snap-back when any card in group would land out of bounds
  - Selection and passenger offsets cleared on every drag end path
affects:
  - 34-04 (human-verify checkpoint: verifies multi-card group drop end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual ref+state for dragDelta (dragDeltaRef for sync reads in canvas shadow logic; setDragDelta for React re-renders)
    - passengerOffsetsRef captures getBoundingClientRect deltas relative to handle at drag start (hand/spread source)
    - GROUP path before single-card path in handleDragEnd canvas branch — early return prevents fall-through
    - All-or-nothing bounds check via cards.every() before dispatch
    - passengerGhosts useMemo returns [] when dragDelta===null, groupIds empty, or activeCardId null
    - Ghost divs at (cc.x + dragDelta.x, cc.y + dragDelta.y) with opacity:0.5, zIndex:998, pointerEvents:none

key-files:
  created:
    - .planning/phases/34-multi-card-group-drop/34-03-SUMMARY.md
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/CanvasZone.tsx

key-decisions:
  - "GROUP path triggers on selectedIds.size>=2 AND active card in selection — preserves single-card drag for unselected card drags"
  - "canvasBounds null-check gates the GROUP path (not just the bounds arithmetic) — if canvasRef is unmounted, falls through to single-card path"
  - "Hand/pile passengers use passengerOffsetsRef (DOM-captured at drag start); handle card uses offsetX:0, offsetY:0 (it is the anchor)"
  - "setDragDelta updated unconditionally in handleDragMove (not guarded by fromZone=canvas) — cross-zone group drags also need delta"
  - "Failed snap-back path now clears selectedIds/selectionSource/dragDelta immediately (D-06 — selection clears on every dragEnd)"

# Metrics
duration: 10min
completed: 2026-05-26
---

# Phase 34 Plan 03: Group Drag Mechanics Summary

**DOM offset capture + dragDelta state + GROUP_PLACE_ON_CANVAS dispatch with all-or-nothing bounds check; passenger ghost rendering in CanvasZone**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-26T01:16:19Z
- **Completed:** 2026-05-26T01:26:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `passengerOffsetsRef` to `BoardDragLayer` to capture per-card DOM `getBoundingClientRect` offsets relative to the drag handle at drag start for hand/spread group sources
- Extended `handleDragStart` to query `[data-card-id="..."]` elements and record `{offsetX, offsetY}` for each selected passenger; initializes `setDragDelta({x:0,y:0})` so ghosts appear immediately
- Updated `handleDragMove` to call `setDragDelta` unconditionally (in addition to existing `dragDeltaRef` update) — dual ref+state pattern preserves both sync canvas-shadow logic and React re-render for passenger ghosts
- Added `passengerOffsetsRef.current = {}` clear to every drag end path (canvas, multiCardSet, passCard, success, failed, cancel)
- Added `setDragDelta(null)` and selection clear to the failed-drop snap-back branch (previously missing per D-06)
- Inserted GROUP path in `handleDragEnd` canvas branch: computes per-card `{x,y}` using delta (canvas source) or `handleDropX + offsetX` (hand/pile source); runs all-or-nothing bounds check; dispatches `GROUP_PLACE_ON_CANVAS` or silent snap-back
- Extended `CanvasZone` with `CardFace`/`CardBack` imports and `passengerGhosts` useMemo; renders ghost `<div>`s at `(cc.x + dragDelta.x, cc.y + dragDelta.y)` with `opacity:0.5`, `zIndex:998`, `pointerEvents:none`, `data-testid="canvas-ghost-{id}"`

## Task Commits

1. **Task 1: handleDragStart DOM offset capture, dragDelta state, passenger ghost rendering** - `114fb47` (feat)
2. **Task 2: GROUP_PLACE_ON_CANVAS dispatch with all-or-nothing bounds check** - `c711f13` (feat)

## Files Created/Modified

- `src/components/BoardDragLayer.tsx` — passengerOffsetsRef declaration; handleDragStart offset capture block + setDragDelta init; handleDragMove setDragDelta call; GROUP path in handleDragEnd; passengerOffsetsRef clears on all paths; failed-drop branch now clears selection/delta
- `src/components/CanvasZone.tsx` — CardFace/CardBack imports; dragDelta prop unaliased (was `_dragDelta`); passengerGhosts useMemo; ghost div JSX block

## Decisions Made

- GROUP path triggers on `canvasBounds && selectedIds.size >= 2 && selectedIds.has(activeId)` — the `canvasBounds` guard ensures we don't enter GROUP path if the ref is unmounted, safely falling through to single-card
- `setDragDelta` is called unconditionally in `handleDragMove` (guard `fromZone !== 'canvas'` removed for delta update specifically, while canvas shadow logic still has its own guard) — ensures cross-zone group drags get delta state for future use
- Handle card gets `offsetX:0, offsetY:0` in hand/pile group path — it IS the anchor point; `handleDropX/handleDropY` is already the handle's canvas-relative position
- Silent snap-back (D-15) clears all state and returns without dispatching — no toast, no error, cards remain at server origin
- Passenger ghosts only render for canvas-to-canvas group drag (canvas cards have known `x/y`); hand/spread passengers do not get ghost rendering because their canvas `x/y` is unknown client-side — the DragOverlay handle card provides sufficient visual feedback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Failed snap-back branch did not clear selection**
- **Found during:** Task 1 implementation review
- **Issue:** The existing failed-drop snap-back `else` branch (lines 483-491 in original) had no `setSelectedIds`, `setSelectionSource`, or `setDragDelta` calls. Per D-06, selection must clear on every `onDragEnd` regardless of outcome. Without this, dropping a group outside all targets would leave the selection badge and ring active.
- **Fix:** Added `setSelectedIds(new Set())`, `setSelectionSource(null)`, `setDragDelta(null)`, and `passengerOffsetsRef.current = {}` to the snap-back else branch.
- **Files modified:** `src/components/BoardDragLayer.tsx`
- **Commit:** `114fb47`

**2. [Rule 2 - Missing critical functionality] handleDragMove setDragDelta guard was too narrow**
- **Found during:** Task 1 implementation
- **Issue:** The existing `handleDragMove` guard `if (dragDataRef.current?.fromZone !== 'canvas') return;` would prevent `setDragDelta` from firing for hand/spread source group drags. Hand/spread→canvas group drag needs `dragDelta` to update for a future-proof path (and the state is initialized at drag start anyway).
- **Fix:** Moved `setDragDelta(...)` call BEFORE the canvas-guard so it fires unconditionally; canvas-specific shadow logic (dragDeltaRef update, coversMajority check) remains guarded.
- **Files modified:** `src/components/BoardDragLayer.tsx`
- **Commit:** `114fb47`

## Known Stubs

None — all mechanics are fully wired. Manual verification (end-to-end group drop, bounds rejection, two-player sync) is deferred to Plan 04 checkpoint.

## Threat Flags

None — no new server endpoints or network surface introduced. Client-side bounds check (T-34-07) implemented as planned; server re-validates coordinates independently (T-34-02, Plan 01).

## Self-Check

- [x] `src/components/BoardDragLayer.tsx` exists
- [x] `src/components/CanvasZone.tsx` exists
- [x] `grep -n "passengerOffsetsRef" src/components/BoardDragLayer.tsx` — 10 matches (decl, capture, clears)
- [x] `grep -n "setDragDelta(" src/components/BoardDragLayer.tsx` — 8 matches (init, move, all clear paths)
- [x] `grep -n "getBoundingClientRect" src/components/BoardDragLayer.tsx` — 3 matches (handle query, passenger query, canvas bounds)
- [x] `grep -n "data-card-id" src/components/BoardDragLayer.tsx` — 2 matches (querySelector calls)
- [x] `grep -n "passengerGhosts" src/components/CanvasZone.tsx` — 2 matches (useMemo, JSX)
- [x] `grep -n "ghost-" src/components/CanvasZone.tsx` — 2 matches (key prefix, data-testid)
- [x] `grep -n "GROUP_PLACE_ON_CANVAS" src/components/BoardDragLayer.tsx` — 2 matches (comment + dispatch)
- [x] `grep -n "allInBounds" src/components/BoardDragLayer.tsx` — 2 matches (declaration + guard)
- [x] `grep -n "selectedIds.size >= 2" src/components/BoardDragLayer.tsx` — 1 match (GROUP trigger)
- [x] Commits 114fb47 and c711f13 exist on branch
- [x] 254/254 tests pass; typecheck clean

## Self-Check: PASSED

All acceptance criteria verified. Both commits exist. 254/254 tests green. Typecheck clean.

---
*Phase: 34-multi-card-group-drop*
*Completed: 2026-05-26*
