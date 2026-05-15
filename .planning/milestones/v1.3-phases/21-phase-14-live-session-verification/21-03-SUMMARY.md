---
phase: 21
plan: "03"
subsystem: "spread-zone-group-reorder"
tags: [dnd-kit, selection, group-reorder, react, bug-fix]
dependency_graph:
  requires: ["21-01"]
  provides: ["21-04"]
  affects: ["BoardDragLayer", "SpreadZone", "HandZone"]
tech_stack:
  added: []
  patterns:
    - "D-06 filter-splice group reorder: filter selected out of source array, find insertAt in remainder, splice back"
    - "Intra-zone reorder detection in dnd-kit drag handlers via fromZone/fromId/toId data props"
key_files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/SpreadZone.tsx
    - src/components/HandZone.tsx
    - tests/groupReorder.test.ts
decisions:
  - "isIntraSpreadReorder/isIntraHandReorder computed once at top of handleDragEnd and reused in both the selection-clear guard and the GAP-06 MOVE_CARD skip — avoids duplication and guarantees consistency"
  - "Group reorder branches on isGroupReorder (size > 1 && has draggedId) — single-card reorder path falls through to unchanged arrayMove behavior"
  - "SpreadZone selectedIds checked with !! guard (optional prop) vs HandZone (required prop, no guard needed) — symmetric code, different null-safety requirements"
metrics:
  duration: "~2 minutes"
  completed: "2026-05-14"
  tasks_completed: 2
  files_changed: 4
---

# Phase 21 Plan 03: Selection Preservation and Group Reorder Summary

**One-liner:** Selection preserved across intra-zone reorder; D-06 filter-splice block move implemented in SpreadZone and HandZone; groupReorder tests 5/5 GREEN.

## What Was Built

### Task 1 — Selection preservation in BoardDragLayer (D-01, D-02)
**Commit:** 4f0c846

Fixed two bugs where selection was unconditionally cleared during intra-zone drag:

- **D-01 (drag-start):** Widened `handleDragStart` data type to include `toId?: string`. Computed `isIntraSpreadReorderStart` (fromZone === 'pile' && fromId === toId) and `isIntraHandReorderStart` (fromZone === 'hand') before the D-04 selection-clear guard. Both flags added to the clear condition — selection is now preserved when dragging within a spread or hand zone.

- **D-02 (drag-end):** Moved `isIntraSpreadReorder` and `isIntraHandReorder` computation to the top of `handleDragEnd` (before any branch). The `isSuccess` branch's `setSelectedIds(new Set())` / `setSelectionSource(null)` calls are now wrapped in `if (!isIntraSpreadReorder && !isIntraHandReorder)`. Removed the duplicate `const isIntraSpreadReorder = ...` local variable from inside the isSpread sub-branch — the outer variable is reused there. `isMultiCardSet` refactored to reference the outer `isIntraSpreadReorder` instead of the inline comparison.

- GAP-06 guard (BoardDragLayer skips MOVE_CARD for intra-spread reorder, so SpreadZone's REORDER handler fires without a race) fully preserved.

### Task 2 — Group reorder branch in SpreadZone and HandZone (D-03–D-06)
**Commit:** 23e6378

Implemented the D-06 filter-splice algorithm in both zone components and replaced the RED stub in the test:

- **SpreadZone.tsx:** `onDragEnd` branches on `isGroupReorder = !!selectedIds && selectedIds.size > 1 && selectedIds.has(draggedId)`. When true: filter selected out of `faceUpCards`, splice back at `overIdx` in remainder (`remainder.length` when over-card is in selected). When false: original `arrayMove` path unchanged.

- **HandZone.tsx:** Symmetric implementation on `cards` array. `selectedIds` is required (no `!!` guard needed). Same algorithm, same comments.

- **tests/groupReorder.test.ts:** Stub replaced with the actual D-06 algorithm function. 5/5 tests now GREEN.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npm test -- groupReorder --run` | 5/5 PASS |
| `npm test -- reorderUndo --run` | 4/4 PASS (no regression from Plan 02) |
| `npm test -- --run` (full suite) | 163/163 PASS |
| `npm run typecheck` | Exit 0 |

## Known Stubs

None. Both zone components wire the algorithm directly to the server action (`REORDER_PILE_SPREAD` / `REORDER_HAND`).

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes. The group reorder branch produces the same `REORDER_PILE_SPREAD` / `REORDER_HAND` action as single-card reorder — server-side validation (length + membership check from Plan 02) covers it. Matches threat model T-21-07 disposition.

## Self-Check: PASSED

Files exist:
- src/components/BoardDragLayer.tsx: modified (not new — exists)
- src/components/SpreadZone.tsx: modified
- src/components/HandZone.tsx: modified
- tests/groupReorder.test.ts: modified

Commits exist:
- 4f0c846: fix(21-03): preserve selection across intra-zone reorder (D-01, D-02)
- 23e6378: feat(21-03): group reorder for spread + hand (D-03–D-06)
