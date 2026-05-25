---
phase: 33-overlap-visibility
plan: 01
subsystem: ui
tags: [canvas, overlap, shadow, react, vitest, useMemo, dnd-kit]

# Dependency graph
requires:
  - phase: 32-canvas-core
    provides: CanvasDraggableCard, CanvasZone, ClientCanvasCard type, canvas drag infrastructure

provides:
  - coversMajority(top, bottom) — AABB overlap function returning true when overlap area > 50% of CARD_W*CARD_H
  - STACK_SHADOW constant — '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db'
  - CARD_W = 63, CARD_H = 88 exports in src/lib/canvas-utils.ts
  - CanvasDraggableCard.coversAnother prop — when true, applies boxShadow=STACK_SHADOW + borderRadius=6
  - CanvasZone.coveringIds useMemo — Set<string> of card IDs covering >50% of a lower-z canvas card at rest

affects:
  - 33-02 (imports coversMajority and STACK_SHADOW from canvas-utils for drag-time shadow)
  - 33-03 (human verify of at-rest shadow visual behavior)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "coversMajority() utility typed structurally ({x,y} not CanvasCard) so it works for both stored positions and drag-time positions"
    - "coveringIds useMemo in CanvasZone — O(n²) over canvasCards (n≤52), acceptable; no deep-equality optimization needed"
    - "coversAnother prop threading: parent computes Set, children receive boolean — single computation location"

key-files:
  created:
    - src/lib/canvas-utils.ts
    - tests/overlapUtils.test.ts
  modified:
    - src/components/CanvasDraggableCard.tsx
    - src/components/CanvasZone.tsx

key-decisions:
  - "coversMajority bottom param typed as {x:number;y:number} not CanvasCard — utility is import-free and reusable for drag positions"
  - "Shadow on covering (top) card only, not the covered card — per D-02 from CONTEXT.md"
  - "Strict > threshold (not >=) for 50% overlap per D-03 — exact-50% returns false"
  - "useMemo dependency only on canvasCards reference — recomputes on any server state update; no deep equality needed per Pitfall 4 guidance"

patterns-established:
  - "canvas-utils.ts: zero-import utility module in src/lib/ for canvas geometry helpers"
  - "TDD RED commit (test file only) then GREEN commit (implementation) for new utility modules"

requirements-completed: [OVERLAP-03]

# Metrics
duration: 12min
completed: 2026-05-25
---

# Phase 33 Plan 01: Canvas Overlap Utility and Static Stack Shadow Summary

**AABB overlap utility extracted from Spike002 into production; static stack shadow wired via coveringIds useMemo in CanvasZone and coversAnother prop in CanvasDraggableCard**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-25T07:03:00Z
- **Completed:** 2026-05-25T07:07:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `src/lib/canvas-utils.ts` — dependency-free utility with `coversMajority()`, `STACK_SHADOW`, `CARD_W`, `CARD_H` extracted verbatim from Spike002
- Created `tests/overlapUtils.test.ts` — 9 unit tests covering no-overlap, exact-50% boundary, >50%, full overlap, negative offset, constant values, and 3-card coveringIds scenario
- Wired static stack shadow: CanvasZone computes `coveringIds` Set via useMemo; CanvasDraggableCard applies `boxShadow` + `borderRadius` when `coversAnother` is true
- Full test suite (243 tests) and TypeScript both remain green

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing tests for coversMajority utility** - `9574106` (test)
2. **Task 1 GREEN: Implement canvas-utils utility** - `3191e1b` (feat)
3. **Task 2: Wire static stack shadow into CanvasDraggableCard and CanvasZone** - `228f332` (feat)

## Files Created/Modified

- `src/lib/canvas-utils.ts` — exports coversMajority(), STACK_SHADOW, CARD_W, CARD_H; no imports
- `tests/overlapUtils.test.ts` — 9 unit tests for the utility and coveringIds set logic
- `src/components/CanvasDraggableCard.tsx` — added coversAnother prop + conditional boxShadow/borderRadius
- `src/components/CanvasZone.tsx` — added coveringIds useMemo + coversAnother prop threading

## Decisions Made

- `coversMajority` bottom param typed structurally as `{x:number;y:number}` (not `CanvasCard`) so the utility is import-free and works for both stored canvas positions and drag-time computed positions
- No deep-equality memoization on `coveringIds` useMemo — O(n²) with n≤52 is negligible per RESEARCH.md Pitfall 4

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Worktree was created from main branch base (a658e44) rather than the feature branch `gsd/v1.6-free-canvas-play-area` (f8cd072). The orchestrator's `<worktree_branch_check>` included a `git reset --hard f8cd072...` step intended to set the worktree to the feature branch HEAD, but the merge-base condition wasn't satisfied. Reset was applied manually before execution began to ensure the Phase 32 canvas files (CanvasDraggableCard.tsx, CanvasZone.tsx) were available.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/canvas-utils.ts` is ready for Plan 02 import (drag-time shadow needs `coversMajority` + `STACK_SHADOW`)
- Static stack shadow renders for at-rest overlapping canvas cards
- Plan 03 (human verify) can validate the visual behavior in the dev environment

---
*Phase: 33-overlap-visibility*
*Completed: 2026-05-25*
