---
phase: 35-mobile
plan: "01"
subsystem: canvas
tags:
  - mobile
  - canvas
  - edge-pan
  - dnd-kit
  - responsive

dependency_graph:
  requires:
    - 32-canvas-core (CanvasZone.tsx, BoardDragLayer.tsx, BoardView.tsx)
    - 34-multi-card-group-drop (GROUP_PLACE_ON_CANVAS, passengerGhosts)
  provides:
    - edge-pan arrows with hold-to-scroll (MOBILE-01)
    - one-finger drag / pan non-conflict via stopPropagation (MOBILE-02)
    - canvas height cap at <640px viewport (MOBILE-03)
    - scrollOffsetRef shared between CanvasZone and BoardDragLayer for drop accuracy
  affects:
    - playwright/mobile.spec.ts (new test file)
    - src/components/CanvasZone.tsx (refactored to two-div + EdgeArrow + pan state)
    - src/components/BoardDragLayer.tsx (added scrollOffsetRef + scroll-adjusted drop math)
    - src/components/BoardView.tsx (added scrollOffsetRef prop + height cap wrapper)

tech_stack:
  added: []
  patterns:
    - two-div viewport+canvas model (outer overflow:hidden, inner CSS translate) from Spike003
    - EdgeArrow component inside CanvasZone.tsx (module scope, not separate file)
    - scrollOffsetRef ref-based cross-component state (zero re-render on pan)
    - ResizeObserver on outer viewport div for dynamic overflow detection
    - setInterval pan loop with stopPan/startPan useCallback (PAN_STEP=8, PAN_INTERVAL=16)

key_files:
  created:
    - playwright/mobile.spec.ts
  modified:
    - src/components/CanvasZone.tsx
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx

decisions:
  - "EdgeArrow defined at module scope inside CanvasZone.tsx — no separate file (per UI-SPEC)"
  - "Tasks 2+3 committed together — TypeScript typecheck blocked Task 2 alone (scrollOffsetRef required by CanvasZone but not yet passed by BoardView)"
  - "aria-label uses ternary expression inside EdgeArrow component (4 literal strings in file)"
  - "scrollOffsetRef written via useEffect in CanvasZone, read in handleDragEnd in BoardDragLayer — zero re-render overhead"
  - "canvas→canvas drop paths unchanged — scroll offset only applied to hand/pile→canvas paths (T-35-02 non-mitigation)"

metrics:
  duration: "14m"
  completed: "2026-05-26"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
---

# Phase 35 Plan 01: Mobile Edge Pan - Summary

Mobile edge-pan for the free canvas: transplanted Spike003EdgePan architecture into CanvasZone, wired scrollOffsetRef through BoardDragLayer→BoardView→CanvasZone, and applied max-h-[240px] height cap at <640px viewport.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Wave-0 RED Playwright tests for MOBILE-01/02/03 | 4ac9417 | playwright/mobile.spec.ts |
| 2+3 | CanvasZone two-div refactor + scrollOffsetRef plumbing + height cap | 8f7866b | CanvasZone.tsx, BoardDragLayer.tsx, BoardView.tsx |

## Implementation Details

**CanvasZone.tsx** — refactored from single-div to:
- Outer viewport div (`ref={viewportRef}`, `overflow-hidden`, `data-testid="canvas-zone"`, ResizeObserver target)
- Inner canvas div (`ref={setRefs}`, `data-testid="canvas-inner"`, CSS `transform: translate(-scrollX, -scrollY)`)
- `EdgeArrow` component (module-level, `data-testid="edge-arrow-{dir}"`, aria-label per direction, `stopPropagation` on pointerDown)
- `PAN_STEP=8`, `PAN_INTERVAL=16` from Spike003; `CANVAS_PADDING=48`
- Dynamic `innerW/innerH` from `canvasCards` + `getCardDimensions()` + padding
- `scrollOffsetRef` prop synced via `useEffect` after each scroll state update
- `startPan` deps include `innerW` and `innerH` (stale closure prevention, Pitfall 4)

**BoardDragLayer.tsx** — surgical additions:
- `scrollOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })` after `canvasRef`
- GROUP path `else` (hand/pile→canvas): `const { x: scrollX, y: scrollY } = scrollOffsetRef.current` then `handleDropX/handleDropY += scrollX/scrollY`
- SINGLE-CARD path `else` (hand/pile→canvas): same scroll offset applied to `baseX/baseY`
- canvas→canvas branches (`existing.x + event.delta.x`) unchanged — T-35-02 correctness
- `scrollOffsetRef={scrollOffsetRef}` passed to `BoardView`

**BoardView.tsx** — two additions:
- `scrollOffsetRef: React.MutableRefObject<{ x: number; y: number }>` in `BoardViewProps` interface
- Wrapper div with `className="max-h-[240px] sm:max-h-none flex-1 min-w-0 self-stretch flex"` around `CanvasZone`
- `scrollOffsetRef={scrollOffsetRef}` forwarded to `CanvasZone`

## Verification

- `npx playwright test playwright/mobile.spec.ts` — **5/5 GREEN** after Tasks 2+3
- `npm run typecheck` — **clean** (0 errors)
- `npm test` — **254/254 unit tests pass** (no regression)
- RED state confirmed: 3 tests failed after Task 1 (edge-arrow-* and canvas-inner locators not yet in production)

## Deviations from Plan

**1. [Rule 3 - Blocking] Tasks 2 and 3 committed together**
- **Found during:** Task 2 pre-commit hook
- **Issue:** TypeScript typecheck failed because `BoardView.tsx` didn't yet pass `scrollOffsetRef` to `CanvasZone`, which now requires it as a prop. The pre-commit hook runs `npm run typecheck` and blocked the Task 2 commit.
- **Fix:** Completed Task 3 edits before committing, then committed all 3 source files together in a single commit (8f7866b).
- **Files modified:** CanvasZone.tsx, BoardDragLayer.tsx, BoardView.tsx
- **Commit:** 8f7866b

**2. [Minor] Worktree missing Phase 31-34 canvas code**
- **Found during:** Execution start (worktree at commit a658e44, pre-canvas)
- **Fix:** `git merge gsd/v1.6-free-canvas-play-area --no-edit` fast-forward to HEAD. Worktree now has all canvas code from Phases 31-34.
- **Impact:** None — fast-forward merge, no conflicts.

## Known Stubs

None — all EdgeArrow, pan state, and scroll offset plumbing are fully wired. No placeholder data or TODO markers in the modified files.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This phase is a purely client-side rendering/UX refactor. All threat mitigations from the plan's `<threat_model>` were applied:

- T-35-01: scrollX/Y added to both single-card and group hand/pile→canvas paths ✓
- T-35-02: canvas→canvas paths unchanged (no double-counting) ✓
- T-35-03: `useEffect(() => () => stopPan(), [stopPan])` cleanup on unmount ✓
- T-35-05: `e.stopPropagation()` on EdgeArrow `onPointerDown` ✓
- T-35-06: `innerW` and `innerH` in `startPan` dep array ✓
- T-35-07: `obs.disconnect()` in ResizeObserver effect cleanup ✓

## Self-Check: PASSED

Files exist:
- playwright/mobile.spec.ts: FOUND
- src/components/CanvasZone.tsx: FOUND
- src/components/BoardDragLayer.tsx: FOUND
- src/components/BoardView.tsx: FOUND
- .planning/phases/35-mobile/35-01-SUMMARY.md: FOUND (this file)

Commits exist:
- 4ac9417 (Task 1 RED tests): FOUND
- 8f7866b (Tasks 2+3 implementation): FOUND
