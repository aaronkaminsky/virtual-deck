---
phase: 30-layout-restructure-dock-spread-zones
plan: 01
subsystem: ui
tags: [react, dnd-kit, layout, tailwind]

requires:
  - phase: 27-drop-target-empty-spread-behavior
    provides: "interactive={false} gate for opponent SpreadZone; isOver-only border signaling"
  - phase: 25-visual-polish
    provides: "flex-1 min-h-0 board area flex column structure; personal spread flex-shrink-0 wrapper"
provides:
  - "Opponent spread zones docked in flex-shrink-0 row at top of board area, below header"
  - "MeasuringStrategy.Always on DndContext to prevent stale droppable rect drift"
  - "w-7 spacer aligning spread columns with header hand columns"
affects: [30-02-plan, e2e-drag-tests, layout-05]

tech-stack:
  added: []
  patterns:
    - "flex-shrink-0 row for opponent spreads ensures spreads stay anchored to hands on short viewports"
    - "w-7 aria-hidden spacer matches ControlsBar size-7 trigger width for column alignment"
    - "MeasuringStrategy.Always on DndContext: preemptive re-measurement every drag for DOM-restructured layouts"

key-files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx

key-decisions:
  - "MeasuringStrategy.Always added preemptively (D-07): ~15 droppables at <1ms/frame overhead, eliminates stale-rect drift post-restructure"
  - "Opponent spread row uses same flex-1 column widths as header band columns for visual alignment (D-01)"
  - "flex-shrink-0 on spread row prevents spreads detaching from hands on short viewports (D-06)"
  - "aria-hidden + pointer-events-none spacer preferred over invisible (D-Claude): semantically correct for layout-only spacer"

patterns-established:
  - "flex-shrink-0 spread row + matching spacer: pattern for aligning board area rows with header columns"

requirements-completed:
  - LAYOUT-05

duration: 5min
completed: 2026-05-21
---

# Phase 30 Plan 01: Layout Restructure Dock Spread Zones Summary

**Opponent spreads moved from bg-card header band into a flex-shrink-0 board area row with column alignment via w-7 spacer, plus MeasuringStrategy.Always on DndContext**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-21T14:22:00Z
- **Completed:** 2026-05-21T14:26:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `MeasuringStrategy.Always` to `DndContext` in BoardDragLayer.tsx — eliminates stale droppable rect drift after the DOM restructure
- Removed opponent `SpreadZone` from the `bg-card` header band (header now renders hands only)
- Added new `flex items-start gap-4 px-4 flex-shrink-0` spread row as first child of board area with one column per opponent
- Added `w-7 self-start shrink-0 pointer-events-none` spacer so flex-1 spread columns align with flex-1 header hand columns

## Task Commits

1. **Task 1: Add MeasuringStrategy.Always to DndContext in BoardDragLayer** - `db4b375` (feat)
2. **Task 2: Restructure BoardView — move opponent spreads into a board-area row** - `e04116e` (feat)

## Files Created/Modified
- `src/components/BoardDragLayer.tsx` - Added `MeasuringStrategy` to `@dnd-kit/core` named import; added `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` prop on `DndContext`
- `src/components/BoardView.tsx` - Removed SpreadZone + gap-1 from header opponent columns; added flex-shrink-0 spread row with opponent map + w-7 spacer as first board-area child

## Decisions Made
- Used `aria-hidden="true"` + `pointer-events-none` on the spacer (not `invisible`) per UI-SPEC D-Claude: semantically correct for a pure layout spacer, no accidental focusable region for screen readers
- Opponent column class in spread row matches header column exactly (`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`) — no gap-1 (single child, no gap needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Typecheck and 226 unit tests pass on both tasks.

## Known Stubs

None.

## Threat Flags

No new security-relevant surface introduced. The DOM restructure moves an existing opponent SpreadZone node (already `interactive={false}`, no flip control, server-side hand masking unchanged). T-30-01 mitigated by Task 1 (MeasuringStrategy.Always). T-30-02 and T-30-03 accepted/mitigated as documented in threat model.

## Next Phase Readiness
- Plan 30-02 (Playwright e2e drag-via-monitor test) can now run against this layout without layout-driven rewrites
- `npm run typecheck` and `npm test -- --run` both exit 0
- Visual verification (dev server) needed to confirm opponent spread columns align with hand columns in 2-player room

## Self-Check: PASSED
- `src/components/BoardDragLayer.tsx` exists: FOUND
- `src/components/BoardView.tsx` exists: FOUND
- Task 1 commit `db4b375` exists: FOUND
- Task 2 commit `e04116e` exists: FOUND

---
*Phase: 30-layout-restructure-dock-spread-zones*
*Completed: 2026-05-21*
