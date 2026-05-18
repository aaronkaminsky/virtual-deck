---
phase: 25-play-area-layout-center-canvas
plan: 01
subsystem: ui
tags: [react, dnd-kit, tailwind, spread-zone, card-table]

# Dependency graph
requires:
  - phase: 24
    provides: SpreadZone component with useDroppable and isOver logic
provides:
  - SpreadZone with silent empty zones (no body text), compact card zone height, and collapse/reveal on drag-over
affects: [SpreadZone consumers, drag-and-drop UX, table layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional Tailwind height classes via cn() with isEmpty && interactive guard for collapse/reveal"
    - "h-px opacity-0 pattern: keeps dnd-kit droppable node in DOM while visually invisible"

key-files:
  created: []
  modified:
    - src/components/SpreadZone.tsx

key-decisions:
  - "Used h-px opacity-0 (not display:none or unmount) so dnd-kit collision detection keeps working on empty zones"
  - "Controls suppressed entirely (not disabled) when isEmpty && interactive !== false — no phantom buttons when zone is collapsed"
  - "Opponent zones (interactive={false}) are never collapsed — they always render at full height"

patterns-established:
  - "Invisible droppable pattern: h-px opacity-0 keeps node in DOM; reveal on isOver via conditional class string"

requirements-completed: [POLISH-01, POLISH-04, ZONE-01]

# Metrics
duration: 8min
completed: 2026-05-17
---

# Phase 25 Plan 01: SpreadZone Polish Summary

**SpreadZone empty zones now collapse to an invisible 1px strip and reveal a slim dashed drop target on hover, with compact card heights (64px/88px) and no duplicate pile-name text inside the droppable.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-17T21:20:00Z
- **Completed:** 2026-05-17T21:28:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- POLISH-01: Removed redundant pile name text from inside the droppable area — label above already shows the name
- POLISH-04: Compacted droppable height from h-[79px]/sm:h-[112px] to h-[64px]/sm:h-[88px]
- ZONE-01: Empty personal spread zones collapse to h-px opacity-0 (invisible but mounted), reveal h-[40px] sm:h-[56px] border-dashed border-primary strip when a card is dragged over
- ZONE-01: Controls (Eye/SelectAll) suppressed when isEmpty && interactive !== false — no phantom buttons on collapsed zones

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: POLISH-01 + POLISH-04 + ZONE-01** - `a9c26d0` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified
- `src/components/SpreadZone.tsx` - Three polish changes: no body text in empty droppable, compact height, collapse/reveal logic with controls gate

## Decisions Made
- Used `h-px opacity-0` rather than conditional render or `display:none` so dnd-kit's droppable node stays in the DOM for collision detection at all times
- Opponent zones (`interactive={false}`) are explicitly excluded from the collapse behavior — they always show at full height since players need to see opponents' piles even when empty

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - no new network endpoints, auth paths, or trust boundary changes introduced.

## Next Phase Readiness
- SpreadZone polish complete; ready for Phase 25 plans 02 and 03 (GridZone and PileZone polish, center-canvas layout)
- No blockers

---
*Phase: 25-play-area-layout-center-canvas*
*Completed: 2026-05-17*
