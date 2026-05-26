---
phase: 34-multi-card-group-drop
plan: 02
subsystem: client-ui
tags: [react, typescript, dnd-kit, canvas, selection, multi-select]

# Dependency graph
requires:
  - phase: 34-multi-card-group-drop
    plan: 01
    provides: SelectionSource exported type in src/shared/types.ts
provides:
  - Canvas click-to-select with zone-exclusive invariant (handleToggleSelectCanvas)
  - Selection ring on canvas cards (boxShadow blue ring)
  - Selection count badge in canvas top-left at >=2 selected
  - Deselect-all on canvas background click (handleDeselectAll)
  - groupIds + activeCardId + dragDelta prop chain from BoardDragLayer to CanvasZone
  - data-card-id attribute on all three draggable card components
affects:
  - 34-03 (consumer of groupIds, activeCardId, dragDelta; reads data-card-id via getBoundingClientRect)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - handleToggleSelectCanvas separate from handleToggleSelect (3-arg) — avoids signature widening
    - Zone-exclusive canvas selection: if current zone !== canvas, clear and start fresh
    - groupIds useMemo = new Set([...selectedIds, activeCard.id]) — passenger set for Plan 03
    - dragDelta state (not ref) declared now; updated by Plan 03 in handleDragMove
    - data-card-id on root draggable div of all three card component types

key-files:
  created:
    - .planning/phases/34-multi-card-group-drop/34-02-SUMMARY.md
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - src/components/HandZone.tsx
    - src/components/SpreadZone.tsx
    - src/components/CanvasDraggableCard.tsx
    - src/components/CanvasZone.tsx
    - src/components/DraggableCard.tsx

key-decisions:
  - "handleToggleSelectCanvas(id: string) is a separate dedicated handler — keeps existing 3-arg handleToggleSelect signature untouched"
  - "hasMaskedCards access narrowed via zone discriminant guard (selectionSource.zone !== 'canvas') to satisfy TypeScript union exhaustiveness"
  - "dragDelta declared as useState now (not updated until Plan 03 wires handleDragMove); reset on all successful drop branches"
  - "Canvas selection zone clearing done via setSelectionSource(null) inside setSelectedIds functional updater when next.size === 0"
  - "dragDelta aliased as _dragDelta in CanvasZone destructure — prop accepted but not consumed until Plan 03"

# Metrics
duration: 8min
completed: 2026-05-26
---

# Phase 34 Plan 02: Canvas Selection State Summary

**Click-to-select on canvas cards with zone-exclusive ring, count badge, deselect-all, and data-card-id on all draggable card types**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-26T01:00:03Z
- **Completed:** 2026-05-26T01:08:00Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Extended `SelectionSource` consumers in BoardDragLayer, BoardView, HandZone, SpreadZone to import from `@/shared/types` (removing all inline type declarations)
- Added `handleToggleSelectCanvas`, `handleDeselectAll`, `groupIds` useMemo, and `dragDelta` state to BoardDragLayer; forwarded new props through BoardView to CanvasZone
- Wired `CanvasDraggableCard` with `isSelected`, `isPassenger`, `onToggleSelect` props, selection ring boxShadow, passenger opacity, `data-card-id`, and `aria-pressed` per CLAUDE.md convention
- Extended `CanvasZone` with all new props, `onClick={onDeselectAll}` on container, and selection count badge at >=2 selected cards
- Added `data-card-id` to root draggable div of `DraggableCard` (hand) and `SortableSpreadCard` (spread zone)

## Task Commits

1. **Task 1: Switch SelectionSource consumers to shared import; add canvas handlers** - `7f81b5b` (feat)
2. **Task 2: Wire CanvasDraggableCard click toggle, ring style, isPassenger, data-card-id** - `ecb7493` (feat)
3. **Task 3: Wire CanvasZone props, deselect-all, selection count badge** - `c5ae4cf` (feat)
4. **Task 4: Add data-card-id to hand DraggableCard and SpreadZone per-card element** - `d32f481` (feat)

## Files Created/Modified

- `src/components/BoardDragLayer.tsx` — removed local SelectionSource type; imported from shared; added handleToggleSelectCanvas, handleDeselectAll, groupIds useMemo, dragDelta state; canvas stale-selection useEffect branch; hasMaskedCards discriminant narrowing
- `src/components/BoardView.tsx` — imported SelectionSource from shared; added 5 new props; forwarded to CanvasZone
- `src/components/HandZone.tsx` — selectionSource prop type replaced with imported SelectionSource
- `src/components/SpreadZone.tsx` — selectionSource prop type replaced with imported SelectionSource; data-card-id on SortableSpreadCard
- `src/components/CanvasDraggableCard.tsx` — isSelected, isPassenger, onToggleSelect props; click handler with stopPropagation; selection ring; passenger opacity; data-card-id; aria-pressed
- `src/components/CanvasZone.tsx` — 6 new props; onClick={onDeselectAll}; selection badge; forwarded isSelected/isPassenger/onToggleSelect to CanvasDraggableCard
- `src/components/DraggableCard.tsx` — data-card-id on root draggable div

## Decisions Made

- Separate `handleToggleSelectCanvas(id)` instead of widening existing `handleToggleSelect(id, zone, zoneId)` — keeps hand/pile handler signature stable and avoids callers needing to detect which variant to call
- `hasMaskedCards` access guarded by `selectionSource.zone !== 'canvas'` discriminant — canvas variant never has masked cards; TypeScript union exhaustiveness required the guard
- `dragDelta` declared as `useState` now, reset on all successful drop branches — Plan 03 will add the `setDragDelta` call in `handleDragMove`
- BoardView temporarily omitted new props from CanvasZone call during Task 1 (to get typecheck passing before CanvasZone props were extended); fully wired in Task 3

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] hasMaskedCards access on union type**
- **Found during:** Task 1 typecheck
- **Issue:** `selectionSource?.hasMaskedCards` fails TypeScript because the canvas variant `{ zone: 'canvas'; zoneId: 'canvas' }` does not have `hasMaskedCards`. The existing code assumed SelectionSource was hand|pile only.
- **Fix:** Added `const hasMaskedCardsInSource = selectionSource !== null && selectionSource.zone !== 'canvas' && selectionSource.hasMaskedCards === true;` discriminant guard; replaced both access sites with this variable.
- **Files modified:** `src/components/BoardDragLayer.tsx`
- **Commit:** `7f81b5b`

**2. [Rule 2 - Missing critical functionality] Canvas stale-selection useEffect missing canvas branch**
- **Found during:** Task 1 implementation
- **Issue:** The `useEffect` that clears selection when selected cards are no longer in their source zone only handled `'hand'` and `'pile'` zones — falling through to a pile lookup for canvas (which would always return empty, incorrectly clearing canvas selections on any server update).
- **Fix:** Added `else if (selectionSource.zone === 'canvas')` branch that checks `gameState.canvasCards`; added `gameState.canvasCards` to the dependency array.
- **Files modified:** `src/components/BoardDragLayer.tsx`
- **Commit:** `7f81b5b`

**3. [Rule 3 - Blocking] TypeScript error on CanvasZone props in Task 1**
- **Found during:** Task 1 typecheck (BoardView forwarding new props before CanvasZone accepted them)
- **Issue:** Extending BoardView props and forwarding to CanvasZone in Task 1 caused TS2322 because CanvasZone didn't yet accept the props (Task 3 adds those).
- **Fix:** Temporarily omitted new props from the CanvasZone JSX call in BoardView during Task 1 commit; restored full forwarding in Task 3 after CanvasZone props were extended.
- **Commit impact:** Task 1 committed with CanvasZone props omitted; Task 3 commit fully wires the chain.

## Known Stubs

None — selection state is fully wired client-side. `dragDelta` is declared but not updated in handleDragMove until Plan 03 (intentional placeholder, not a functional stub — the state resets correctly).

## Threat Flags

None — all new surface is local UI state (T-34-05: stopPropagation guard implemented; T-34-06: data-card-id surfaces no new server information).

## Self-Check

- [x] `src/components/BoardDragLayer.tsx` imports SelectionSource from @/shared/types (not local)
- [x] `src/components/BoardView.tsx` imports SelectionSource from @/shared/types
- [x] `src/components/HandZone.tsx` imports SelectionSource from @/shared/types
- [x] `src/components/SpreadZone.tsx` imports SelectionSource from @/shared/types
- [x] `handleToggleSelectCanvas` declared in BoardDragLayer (line 133) and passed as prop (line 486)
- [x] `handleDeselectAll` declared in BoardDragLayer (line 158) and passed as prop (line 486)
- [x] `groupIds` useMemo declared in BoardDragLayer (line 163)
- [x] `data-card-id` present in CanvasDraggableCard, DraggableCard, SpreadZone (3 total)
- [x] `canvas-selection-count` badge in CanvasZone with `selectedIds.size >= 2` condition
- [x] `onClick={onDeselectAll}` on CanvasZone container div
- [x] Commits 7f81b5b, ecb7493, c5ae4cf, d32f481 exist on branch
- [x] 254/254 tests pass; typecheck clean

## Self-Check: PASSED

All files created, all commits verified, 254/254 tests green, typecheck clean.

## Next Phase Readiness

- Plan 03 can immediately consume `groupIds`, `activeCardId`, `dragDelta` from the established prop chain
- Plan 03 can `document.querySelector('[data-card-id="..."]')` for any card type (hand, spread, canvas)
- Canvas multi-select is visually functional: click ring, badge, deselect-all
- Zone-exclusive invariant preserved: clicking canvas while hand/spread selected clears that and starts canvas selection

---
*Phase: 34-multi-card-group-drop*
*Completed: 2026-05-26*
