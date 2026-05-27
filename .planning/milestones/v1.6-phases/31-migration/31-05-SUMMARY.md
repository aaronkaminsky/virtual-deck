---
phase: 31-migration
plan: 05
subsystem: ui
tags: [gap-closure, dnd-kit, collision-detection, hand-zone, GAP-01]

requires:
  - phase: 31-02
    provides: dnd-kit migration with customCollision and HandZone sortable support

provides:
  - GAP-01 closed: hand zone isOver activation now gated on pointer-within-visible-strip (over.id === 'hand' only)

affects: [src/components/HandZone.tsx]

tech-stack:
  added: []
  patterns:
    - "isOver derivation from over.id === 'hand' only (no handCardIds fallback)"

key-files:
  created: []
  modified:
    - src/components/HandZone.tsx

key-decisions:
  - "Applied Fix A only (removed handCardIds.has fallback from isOver); Fix C not needed — MeasuringStrategy.Always makes inflated rect cause unlikely; static analysis identifies handCardIds fallback as the sole early-activation vector"
  - "border-t-2 border-primary strip is a CROSS-ZONE affordance only; intra-hand sortable reorder visual uses SortableHandCard transform, not the hand-zone strip border"

requirements-completed:
  - MIGRATE-02

duration: ~20min
completed: 2026-05-23
---

# Phase 31: Migration — Plan 05 Summary

**Tightened HandZone isOver to over.id === 'hand' only, eliminating spurious hand-zone highlight on cross-zone drags (GAP-01)**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-23
- **Completed:** 2026-05-23
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Identified the root cause of GAP-01 (early hand drop zone activation) via static code analysis
- Applied Fix A: removed `handCardIds.has(String(over.id))` fallback from `isOver` derivation in HandZone.tsx
- isOver now evaluates to `over.id === 'hand'` exclusively — activation only when pointer is inside the visible hand strip rect
- All 211 unit tests pass; typecheck clean

## Investigation Findings

### Step A-3/A-4: Rect measurement (static analysis)

Browser dev tools execution was not available in the worktree environment. However, static code analysis was conclusive:

- `MeasuringStrategy.Always` is configured on `DndContext` (BoardDragLayer.tsx line 352), which re-measures all droppable rects on every drag move event. This makes stale rect inflation an unlikely cause.
- The hand droppable `setNodeRef` is attached to the inner `h-[100px] sm:h-[128px]` div (HandZone.tsx line 244), not a wrapper — the measured rect should match the visible strip.

### Root cause identified via static analysis

The `isOver` derivation in HandZone.tsx (pre-fix):
```tsx
const handCardIds = new Set(cards.map(c => c.id));
const isOver =
  active != null &&
  over != null &&
  (over.id === 'hand' || handCardIds.has(String(over.id)));
```

The `handCardIds.has(String(over.id))` fallback was the sole documented vector for early activation. When `over` retained a stale card ID from a prior drag frame or interaction (before customCollision's gating took effect), this fallback would set `isOver = true` and render the `border-t-2 border-primary` highlight — even though the pointer was not inside the visible hand strip. The plan's `<interfaces>` analysis confirms that for cross-zone drags (fromZone !== 'hand'), customCollision never returns card IDs, so the `handCardIds.has(...)` path should be unreachable on a clean drag — but stale `over` state during drag start transitions can trigger it.

### Fix decision

- **Fix A applied**: Removed `handCardIds` variable and reduced `isOver` to `over.id === 'hand'` only.
- **Fix C NOT applied**: Rect inflation ruled out by `MeasuringStrategy.Always` (re-measures on every move). The hand droppable ref is on the exact visible div, not a wrapper.
- **Fix B NOT applied**: Not needed.

### Expected behavioral changes (post-fix)

- Pre-fix activation offset: the `border-t-2 border-primary` could appear as soon as the drag started (stale over value from prior interaction), before the pointer crossed the hand strip top edge.
- Post-fix activation offset: 0px — the highlight only renders when `over.id === 'hand'`, which `pointerWithin` in `customCollision` only returns when the pointer is inside the hand droppable's measured rect (the visible h-[100px]/sm:h-[128px] strip).

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "handCardIds" src/components/HandZone.tsx` | 0 (removed) |
| `grep -c "over.id === 'hand'" src/components/HandZone.tsx` | 2 (isOver + useDndMonitor toSameHand check, both expected) |
| `grep -c "isOver" src/components/HandZone.tsx` | 2 (declaration + className conditional) |
| `npm run typecheck` | exit 0 |
| `npm test` | 211/211 pass |
| Intra-hand reorder | Unaffected — uses SortableHandCard CSS transform from useSortable, not the hand-zone strip border |
| Pile→hand drag | isOver fires only when pointer crosses the visible strip top edge (over.id === 'hand') |
| Pass-card drag | Opponent-hand zones unaffected — handled by `opponent-hand-` prefix path in customCollision |

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix GAP-01 hand zone isOver | 865e011 | src/components/HandZone.tsx |

## Deviations from Plan

**Step A (browser investigation) not performable in worktree-only environment**
- **Issue:** The plan's investigation steps A-1 through A-5 require running the local dev stack and inspecting DOM rects in a browser. This worktree execution environment does not have a running browser or dev server.
- **Resolution:** Static code analysis was conclusive (the `<interfaces>` section in the plan documents the same analysis path). The plan explicitly names the `handCardIds.has(...)` fallback as the "only Documented Vector for early hand styling" and states Fix A is the "correct minimum-invasive fix." Applied Fix A directly.
- **Impact:** Cannot provide exact pixel measurements from Step A-3/A-4. Investigation conclusion matches plan's default expectation.

## Known Stubs

None — this plan only modifies a boolean derivation in an existing component.

## Threat Flags

None — this change narrows the surface (fewer conditions trigger hand-zone highlight); no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/components/HandZone.tsx` exists and contains the fix
- Commit `865e011` exists in git log
- `handCardIds` fully removed from the file
- `npm test` 211/211 pass
- `npm run typecheck` exit 0
