---
phase: 32-canvas-core
plan: 02
subsystem: ui
tags: [canvas, react, dnd-kit, components, drag-and-drop]

# Dependency graph
requires:
  - phase: 32-canvas-core
    plan: 01
    provides: CanvasCard type, canvasCards on GameState/ClientGameState, PLACE_ON_CANVAS action contract, MOVE_CARD canvas source branch
affects:
  - 32-03 (human verify: drags canvas cards in browser, checks position clamping and cancel behavior)

provides:
  - CanvasDraggableCard: absolute-positioned draggable card; useDraggable only (D-12); opacity:0 while dragging (D-13)
  - CanvasZone: useDroppable id=canvas; dual-ref for bounds measurement; ring-1 ring-primary/30 on isOver; aria-label="Play area"
  - BoardView wired: canvas-shell placeholder replaced with CanvasZone; canvasRef threaded from BoardDragLayer
  - BoardDragLayer extended: canvas fallback in customCollision (D-08); canvas branch in handleDragEnd dispatching PLACE_ON_CANVAS with clamped position (D-15); PendingMove.fromZone widened to include canvas (D-11); canvas → opponent-hand no-op guard (T-32-11); DragOverlay 0.5 opacity + scale 1.05 (D-13)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-ref pattern for CanvasZone: setNodeRef (dnd-kit) + canvasRef (bounds) attached via ref callback"
    - "Canvas branch FIRST in handleDragEnd: event.over?.id === 'canvas' check placed before all other branches for unambiguous routing"
    - "RefObject<HTMLDivElement | null> for useRef<HTMLDivElement>(null) in React 18 — null must be in the type union"
    - "Canvas → opponent-hand no-op via early guard before isPassCard block (NOLOSS-01 / T-32-11)"

key-files:
  created:
    - src/components/CanvasDraggableCard.tsx
    - src/components/CanvasZone.tsx
  modified:
    - src/components/BoardView.tsx
    - src/components/BoardDragLayer.tsx

key-decisions:
  - "D-13 applied globally: DragOverlay 0.5 opacity + scale(1.05) wrapper applied to all drags (not just canvas) — matches UI-SPEC intent; if non-canvas drag visual regression discovered in Plan 03, gate on fromZone === 'canvas'"
  - "canvas → opponent-hand: explicit no-op guard added before isPassCard branch; customCollision returns opponent-hand zone before canvas but canvas card could still arrive there — guard covers both paths"
  - "RefObject<HTMLDivElement | null>: React 18 useRef<T>(null) returns RefObject<T | null>; prop types widened to match (not cast)"

patterns-established:
  - "Canvas drop position: fromZone=canvas uses stored x/y + delta; fromZone=hand/pile uses activatorEvent.clientX + delta - canvasBounds.left - CARD_W/2 (Pitfall 2 formula)"
  - "Dual-ref callback for shared droppable + imperative ref: setNodeRef(node); (ref as MutableRefObject<T | null>).current = node"

requirements-completed:
  - CANVAS-01
  - CANVAS-02
  - CANVAS-03
  - CANVAS-04
  - NOLOSS-01

# Metrics
duration: 23min
completed: 2026-05-25
---

# Phase 32 Plan 02: Canvas Core Client Wiring Summary

**CanvasDraggableCard + CanvasZone components wired into BoardView/BoardDragLayer; PLACE_ON_CANVAS dispatched on drop with position clamping (D-08 through D-17)**

## Performance

- **Duration:** 23 min
- **Started:** 2026-05-25T02:43:07Z
- **Completed:** 2026-05-25T03:06:09Z
- **Tasks:** 2 (Task 1 + Task 2 committed atomically — pre-commit hook requires full type correctness)
- **Files modified:** 4 (2 new, 2 modified)

## Accomplishments

- Created `CanvasDraggableCard`: mirrors DraggableCard pattern with `useDraggable` only, absolute position from `canvasCard.{x,y,z}`, opacity:0 while dragging, click-vs-drag guard (didDragRef), `aria-roledescription` + `aria-label` after `{...attributes}` spread per CLAUDE.md convention
- Created `CanvasZone`: `useDroppable({id:'canvas'})`, dual-ref callback attaching both dnd-kit and forwarded `canvasRef`, `ring-1 ring-primary/30` on `isOver`, `aria-label="Play area"`, `data-testid="canvas-zone"`
- Extended `BoardDragLayer.customCollision` with canvas fallback (D-08): filters for `id==='canvas'`, runs `pointerWithin`, returns canvas collisions as final fallback after zone and pile checks
- Replaced `data-testid="canvas-shell"` div in `BoardView` with `<CanvasZone>` threaded with `canvasCards`, `draggingCardId`, `canvasRef`
- Added canvas branch in `handleDragEnd` (D-15): computes clamped `(x, y)` via `Math.max(0, Math.min(...))` using live `canvasRef.getBoundingClientRect()`, dispatches `PLACE_ON_CANVAS`; canvas → canvas uses stored position + delta, hand/pile → canvas uses activator pointer position - canvasBounds.left - CARD_W/2
- All 234 tests pass; `npm run typecheck` clean

## Task Commits

Tasks 1 and 2 were committed atomically (plan specified this — pre-commit hook requires all four files to be type-correct together):

1. **Task 1+2: CanvasDraggableCard + CanvasZone + BoardView/BoardDragLayer wiring** - `d71cce9` (feat)

**Plan metadata:** _(see final metadata commit in this session)_

## Files Created/Modified

- `src/components/CanvasDraggableCard.tsx` (new) — Draggable absolute-positioned canvas card; `useDraggable` only (D-12); data `{card, fromZone:'canvas', fromId:card.id}`; opacity:0 while dragging; click-vs-drag guard for Phase 33+ flip
- `src/components/CanvasZone.tsx` (new) — Canvas droppable container; `useDroppable({id:'canvas'})`; dual-ref (dnd-kit + canvasRef); maps over canvasCards rendering CanvasDraggableCard; ring on isOver
- `src/components/BoardView.tsx` (modified) — Added `canvasRef` prop, `React` import, `CanvasZone` import; replaced canvas-shell div with `<CanvasZone>`
- `src/components/BoardDragLayer.tsx` (modified) — `canvasRef`, canvas collision fallback (D-08), canvas branch in `handleDragEnd` with PLACE_ON_CANVAS (D-15), PendingMove.fromZone widened (D-11), canvas → opponent-hand no-op guard (T-32-11), DragOverlay 0.5/scale(1.05) wrapper (D-13), all existing `fromZone` casts widened to `'hand' | 'pile' | 'canvas'`

## Decisions Made

- **D-13 applied globally:** The DragOverlay 0.5 opacity + scale(1.05) wrapper is applied to all drag overlays (not only canvas drags). The UI-SPEC and CONTEXT D-13 describe this behavior for canvas; applying it globally is consistent with the spec and avoids conditional branching in the JSX. If a visual regression is detected for non-canvas drags during Plan 03 review, the fix is to gate the wrapper on `dragDataRef.current?.fromZone === 'canvas'`.
- **RefObject type:** React 18 `useRef<HTMLDivElement>(null)` creates `RefObject<HTMLDivElement | null>`, not `RefObject<HTMLDivElement>`. Prop types in `BoardViewProps` and `CanvasZoneProps` were widened to `RefObject<HTMLDivElement | null>` rather than casting — correct and forward-compatible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RefObject<HTMLDivElement | null> type mismatch**
- **Found during:** Task 2 (typecheck run)
- **Issue:** `useRef<HTMLDivElement>(null)` in `BoardDragLayer` produces `React.RefObject<HTMLDivElement | null>` under React 18 strict types. The initial prop type `React.RefObject<HTMLDivElement>` caused TS2322 at the `canvasRef={canvasRef}` JSX pass-through.
- **Fix:** Widened `canvasRef` prop type in both `BoardViewProps` (BoardView.tsx) and `CanvasZoneProps` (CanvasZone.tsx) to `React.RefObject<HTMLDivElement | null>`
- **Files modified:** src/components/BoardView.tsx, src/components/CanvasZone.tsx
- **Verification:** `npm run typecheck` exits 0
- **Committed in:** d71cce9

---

**Total deviations:** 1 auto-fixed (1 type conformance)
**Impact on plan:** Necessary for type correctness. No scope creep.

## Issues Encountered

None beyond the deviation documented above.

## Decisions Implemented (D-08 through D-17)

All plan decisions verified:
- **D-08:** `customCollision` canvas fallback: `canvasContainers` filter → `pointerWithin` → returned as final fallback after zone + pile checks → confirmed
- **D-09:** `event.over === null` for canvas card → canvas branch fires only on `event.over?.id === 'canvas'`; null over falls through to existing snap-back path → no PLACE_ON_CANVAS dispatched → confirmed (NOLOSS-01)
- **D-10:** Hand/pile null drops unchanged — existing failed-drop fallback path preserved → confirmed
- **D-11:** Canvas → pile dialog: `PendingMove.fromZone` widened to `'hand' | 'pile' | 'canvas'`; `sendPendingMove` passes `pendingMove.fromZone` through unchanged to MOVE_CARD → confirmed
- **D-12:** `useDraggable` only on `CanvasDraggableCard`, no `useDroppable` on the card → confirmed
- **D-13:** Source card `opacity: 0` while `isDragging` (CanvasDraggableCard); DragOverlay child wrapped in `{opacity: 0.5, transform: 'scale(1.05)'}` → confirmed
- **D-14:** `handleDragCancel` dispatches no `PLACE_ON_CANVAS`; existing handler clears active state → card reverts automatically → confirmed
- **D-15:** Clamp: `Math.max(0, Math.min(base, Math.max(0, canvasW - CARD_W)))` → confirmed
- **D-16:** `PointerSensor activationConstraint: { distance: 8 }` preserved → confirmed
- **D-17:** `MeasuringStrategy.Always` preserved → confirmed

## Pitfalls Avoided

- **Pitfall 1 (stale rect):** `canvasRef.getBoundingClientRect()` called live in `handleDragEnd`, not cached; `MeasuringStrategy.Always` preserved
- **Pitfall 2 (cross-zone formula):** `activator.clientX + delta.x - canvasBounds.left - CARD_W/2` for hand/pile → canvas drops
- **Pitfall 3 (collision order):** Canvas fallback inserted AFTER zone and pile checks — not before
- **Pitfall 6 (PendingMove union):** `PendingMove.fromZone` explicitly widened to `'hand' | 'pile' | 'canvas'`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Client canvas drag implementation complete. Plan 03 (human verify) can exercise behavior in browser:
  - Hand/pile → canvas drag should dispatch `PLACE_ON_CANVAS`; card appears at drop position
  - Canvas → canvas drag should reposition card; z increments
  - Cancel (Escape) should revert card to stored position with no action dispatched
  - Drop outside canvas (over === null) should return card to canvas position with no action
  - Canvas → non-empty pile should show insert-position dialog
- DragOverlay 0.5 opacity change is visible on all drags — confirm this is acceptable in Plan 03 verify; if regression, gate on `fromZone === 'canvas'`

## Known Stubs

None. All canvas client behaviors are fully wired against the Plan 01 server contract.

## Threat Flags

No new threat surface beyond the plan's threat model. Threat entries T-32-07 through T-32-11 verified:
- T-32-09 (stale canvasRef): `getBoundingClientRect()` called live; `MeasuringStrategy.Always` preserved — mitigated
- T-32-11 (canvas → opponent-hand no-op): explicit early-return guard added before `isPassCard` block — mitigated

## Self-Check: PASSED

- src/components/CanvasDraggableCard.tsx: FOUND
- src/components/CanvasZone.tsx: FOUND
- .planning/phases/32-canvas-core/32-02-SUMMARY.md: FOUND
- Commit d71cce9: FOUND

---
*Phase: 32-canvas-core*
*Completed: 2026-05-25*
