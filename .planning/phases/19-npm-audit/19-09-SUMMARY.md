---
phase: 19-npm-audit
plan: "09"
subsystem: ui
tags: [react, tailwind, opponent-hand, responsive-layout]

requires:
  - phase: 19-07
    provides: flex-based BoardView layout that sets per-opponent column widths

provides:
  - Opponent card count displayed inline in the name row, always visible at any column width

affects:
  - Phase 20 (spread zones UX)

tech-stack:
  added: []
  patterns:
    - "Inline badge in header row rather than overlay on content area to avoid overflow clipping"

key-files:
  created: []
  modified:
    - src/components/OpponentHand.tsx

key-decisions:
  - "Move card count Badge from card-back stack row to name/header row to eliminate clip risk at narrow column widths"
  - "Use Badge variant='secondary' to visually differentiate the count from the display name"

patterns-established:
  - "Count indicators that must always be visible belong in the header/name row, not overlaid on the content area"

requirements-completed:
  - LAYOUT-04

duration: 5min
completed: 2026-05-09
---

# Phase 19 Plan 09: Opponent Card Count Inline in Name Row Summary

**Opponent card count Badge moved from card-back stack row into the name header row — always visible at 375px and any narrow column width**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-09T07:18:00Z
- **Completed:** 2026-05-09T07:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed Badge from the card-back stack row where it was susceptible to overflow clipping at narrow column widths
- Added `<Badge variant="secondary" className="ml-1 text-xs">{cardCount}</Badge>` inline after the displayName span in the header row
- The name row always spans the full column width, so the count is always visible regardless of how narrow the card-back stack gets
- Preserved `MAX_VISIBLE_OPPONENT_CARDS` constant and the card-back render loop unchanged

## Task Commits

1. **Task 1: Move card count from absolute badge to inline name row in OpponentHand** - `9efda66` (feat)

## Files Created/Modified

- `src/components/OpponentHand.tsx` - Moved cardCount Badge from card stack row into name/header row

## Decisions Made

- Used `Badge variant="secondary"` (already imported) rather than a plain `<span>` — keeps visual consistency with the rest of the UI without adding new imports
- Count is conditionally rendered (`cardCount > 0`) matching the original behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 9 closed: opponent card count is always visible at 375px viewport width
- Ready for Plan 10 (the final gap in this phase)

---
*Phase: 19-npm-audit*
*Completed: 2026-05-09*
