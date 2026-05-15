---
phase: 19-npm-audit
plan: 04
subsystem: ui
tags: [react, lucide-react, icons, accessibility, responsive-layout]

# Dependency graph
requires:
  - phase: 19-01
    provides: Responsive pile zone container sizing (w-[56px] at mobile)
  - phase: 19-02
    provides: Responsive card sizing that enabled pile zone fit
  - phase: 19-03
    provides: OpponentHand column-count capping and overflow clamping

provides:
  - Icon-only PileZone control buttons (Eye/EyeOff for face state, Shuffle for shuffle)
  - 28x28px square buttons replacing ~110px oblong text buttons per pile
  - Three pile columns fitting horizontally at 375px viewport
  - LAYOUT-04 requirement marked complete in REQUIREMENTS.md

affects: [19-05, any future work touching PileZone.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Icon-only button pattern: h-7 w-7 p-0 with both aria-label and title for accessibility"
    - "Eye/EyeOff from lucide-react as semantic face-up/face-down visual indicator"

key-files:
  created: []
  modified:
    - src/components/PileZone.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Use h-7 w-7 p-0 (square, 28x28px) button shape instead of h-7 px-2 text-xs to eliminate horizontal text overflow at 375px"
  - "Add both aria-label and title attributes when removing visible text — title covers hover tooltip, aria-label covers screen readers"
  - "Eye/EyeOff lucide icons (w-4 h-4) chosen over smaller w-3 h-3 because the icon is now the sole visual affordance of the button"

patterns-established:
  - "Icon-only buttons in compact layout contexts: square shape (w-N h-N p-0), both aria-label and title required"

requirements-completed:
  - LAYOUT-04

# Metrics
duration: 2min
completed: 2026-05-08
---

# Phase 19 Plan 04: PileZone Icon Controls Summary

**PileZone face-toggle and shuffle buttons converted from text-label (~110px wide) to 28x28px icon-only squares using Eye/EyeOff/Shuffle from lucide-react, closing Gap 1 from human UAT and fitting all three pile columns at 375px**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T13:03:07Z
- **Completed:** 2026-05-08T13:04:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced `h-7 px-2 text-xs` oblong text buttons with `h-7 w-7 p-0` square icon-only buttons in PileZone.tsx
- Added `Eye`/`EyeOff` icons (w-4 h-4) for face-up/face-down toggle; `Shuffle` icon (w-4 h-4) for shuffle — all with `aria-label` and `title` attributes preserving prior semantic text
- Marked LAYOUT-04 complete in both the Layout section checkbox and the traceability table in REQUIREMENTS.md

## Task Commits

1. **Task 1: Replace PileZone text labels with lucide icons** - `41abde2` (feat)
2. **Task 2: Flip LAYOUT-04 checkbox to complete** - `4f71274` (docs)

## Files Created/Modified

- `src/components/PileZone.tsx` - Import line updated (Eye, EyeOff added), two control buttons changed from text to icon-only square shape
- `.planning/REQUIREMENTS.md` - LAYOUT-04 checkbox flipped `[ ]` -> `[x]`; traceability row updated `Pending` -> `Complete`

## Decisions Made

- `h-7 w-7 p-0` (28x28px square) chosen for both buttons to match icon affordance and eliminate the horizontal space consumed by text padding (`px-2`) and the literal text characters
- `aria-label` added alongside the existing `title` attribute: `title` serves sighted users on hover; `aria-label` is required for screen readers once visible text is removed
- Icon size bumped from the legacy `w-3 h-3` (icon-beside-text) to `w-4 h-4` (icon-as-sole-content) for better touch affordance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 1 from human UAT (19-HUMAN-UAT.md) is closed: three pile columns fit at 375px
- LAYOUT-04 is marked complete in REQUIREMENTS.md
- Plan 19-05 (OpponentHand column cap / column overflow clamp) is ready to execute

---
*Phase: 19-npm-audit*
*Completed: 2026-05-08*
