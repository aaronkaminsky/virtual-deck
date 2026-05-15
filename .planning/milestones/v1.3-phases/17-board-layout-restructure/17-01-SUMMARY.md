---
phase: 17
plan: "01"
subsystem: drag-and-drop
tags:
  - dnd-kit
  - sortable
  - id-collision
  - spread-zone
  - e2e
dependency_graph:
  requires: []
  provides:
    - SPREAD-04 regression e2e coverage
    - Single dnd-kit ID per card in spread zone
  affects:
    - src/components/SpreadZone.tsx
    - playwright/game.spec.ts
tech_stack:
  added: []
  patterns:
    - useSortable renders CardFace/CardBack directly (mirrors SortableHandCard)
key_files:
  modified:
    - path: src/components/SpreadZone.tsx
      change: Removed DraggableCard import and usage; added CardFace import; render card.faceUp conditionally
    - path: playwright/game.spec.ts
      change: Added 2 new e2e test cases for spread zone drag-out and intra-spread reorder
decisions:
  - "No didDragRef added in Phase 17 — has no consumer until Phase 20 click handler; adding unused ref violates project rule against unnecessary changes"
  - "Pre-existing BoardDragLayer.tsx typecheck error (process.env.NODE_ENV) deferred — plan explicitly prohibits modifying that file"
metrics:
  duration: "169 seconds"
  completed: "2026-05-02"
  tasks_completed: 2
  files_modified: 2
---

# Phase 17 Plan 01: Fix SortableSpreadCard dnd-kit ID Collision Summary

Removed the nested `DraggableCard` from `SortableSpreadCard` and rendered `CardFace`/`CardBack` directly — eliminating the duplicate dnd-kit ID that `useDraggable` (inside `DraggableCard`) registered on the same `card.id` as `useSortable`. Added two new e2e regression tests covering the spread-zone drag-out and intra-spread reorder flows.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1.1 | Add e2e regression tests (TDD RED) | d394bee | playwright/game.spec.ts |
| 1.2 | Remove DraggableCard; render CardFace/CardBack directly (TDD GREEN) | 0130f4b | src/components/SpreadZone.tsx |

## Exact Diff Applied to src/components/SpreadZone.tsx

Line 6 (import change):
```
- import { DraggableCard } from './DraggableCard';
+ import { CardFace } from './CardFace';
```

Line 38 (render change):
```
- <DraggableCard card={card} fromZone="pile" fromId={pileId} />
+ {card.faceUp ? <CardFace card={card} /> : <CardBack />}
```

Net: 0 lines added (line removed, line added = net 0). One import swapped; one render expression swapped.

## New e2e Tests Added to playwright/game.spec.ts

1. `spread zone drag: drag card from communal spread zone to hand` — Plays 2 cards into communal spread zone, drags first one back to hand zone, asserts P1 hand count increases and communal zone count decreases, P2 sees same broadcast state, no duplicate dnd-kit ID console warnings.

2. `spread zone reorder: drag-reorder within communal spread zone preserves useSortable data routing` — Plays 3 cards into communal spread zone, drags card at index 0 over card at index 2, asserts card count unchanged (3), P2 sees same count, no duplicate dnd-kit ID console warnings.

## Confirmation: DraggableCard Removal

`grep -c "DraggableCard" src/components/SpreadZone.tsx` returns 0 — confirmed removed from both import and JSX.

## Confirmation: useSortable Data Shape Preserved

`grep -c "fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId" src/components/SpreadZone.tsx` returns 1 — data shape consumed by `BoardDragLayer.tsx` line 111 and `SpreadZone.tsx` useDndMonitor line 65 is unchanged.

## Test Results

- **Unit tests (Vitest):** 17 files, 135 tests — all passed
- **TypeScript:** Pre-existing error in `BoardDragLayer.tsx` (process.env.NODE_ENV not in scope — pre-dates Phase 17); no new errors introduced by this plan
- **Playwright test list:** 3 spread zone tests listed (existing visibility + 2 new regression tests)

## Deviations from Plan

### Pre-existing Issue (Out of Scope per SCOPE BOUNDARY)

**Pre-existing TypeScript error in BoardDragLayer.tsx**
- **Found during:** Task 1.2 verification
- **Issue:** `src/components/BoardDragLayer.tsx(88,11): error TS2591: Cannot find name 'process'` — `process.env.NODE_ENV` usage without `@types/node`
- **Status:** Pre-existing before Phase 17 (verified by stashing task changes and running typecheck)
- **Action:** Not fixed — plan explicitly prohibits modifying `BoardDragLayer.tsx`
- **Logged to:** deferred-items (see below)

### Deferred Items

- `src/components/BoardDragLayer.tsx` line 88: `process.env.NODE_ENV` causes `TS2591`. Replace with `import.meta.env.DEV` (Vite-native) to fix. This is a cosmetic dev-only log guard and poses no runtime risk.

## Threat Surface Scan

No new threat surface introduced. The fix removes a component layer (DraggableCard) — reduces surface. `useSortable` data shape identical to pre-fix; server trust boundary unchanged. No new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- [x] `src/components/SpreadZone.tsx` exists and contains `CardFace` import, no `DraggableCard`
- [x] `playwright/game.spec.ts` contains both new test names
- [x] Commit `d394bee` exists (test(17-01) task 1.1)
- [x] Commit `0130f4b` exists (feat(17-01) task 1.2)
- [x] 135 unit tests pass
- [x] No new TypeScript errors introduced
