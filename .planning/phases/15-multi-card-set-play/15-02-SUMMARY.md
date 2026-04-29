---
plan: 15-02
phase: 15
status: complete
wave: 1
completed: 2026-04-27
---

## Summary

Client-side multi-card selection UX wired end-to-end: dual-sensor config in `BoardDragLayer`, `selectedIds` state lifted to `BoardDragLayer`, click-to-toggle with ring + 6px lift on `SortableHandCard`, "N selected" badge in `HandZone`, Escape + pointer-down-outside clearing, and the `PLAY_CARD_SET` dispatch branch in `handleDragEnd`.

## What Was Built

### Task 1 — BoardDragLayer: selectedIds state, dual sensors, Escape + click-outside, PLAY_CARD_SET dispatch
- **`src/components/BoardDragLayer.tsx` (lines ~3, 58–84, 115–148, 246–254)**
  - Added `useSensors, useSensor, PointerSensor, TouchSensor` to `@dnd-kit/core` import
  - Added `useEffect` to React import
  - Declared `selectedIds: Set<string>` state and `handleToggleSelect` toggle helper
  - Declared `sensors` via `useSensors(PointerSensor{distance:8}, TouchSensor{delay:250,tolerance:5})`
  - `useEffect` listener for `Escape` key → `setSelectedIds(new Set())`
  - `handleDragStart`: clears selection if dragging an unselected card (D-04)
  - `handleDragEnd`: added `isMultiCardSet` branch — when `selectedIds.size > 1`, dragging selected card to a pile dispatches `PLAY_CARD_SET` and returns early
  - JSX root: `<>` replaced with `<div className="contents" onPointerDown={() => setSelectedIds(new Set())}>` (D-11, layout-transparent via `contents`)
  - `<DndContext>` gains `sensors={sensors}` prop
  - `<BoardView>` gains `selectedIds={selectedIds}` and `onToggleSelect={handleToggleSelect}` props

### Task 2 — BoardView: prop threading
- **`src/components/BoardView.tsx`**
  - `BoardViewProps` gains `selectedIds: Set<string>` and `onToggleSelect: (id: string) => void`
  - Both destructured and forwarded to `<HandZone>`

### Task 3 — HandZone: ring + lift indicator, count badge, click handler
- **`src/components/HandZone.tsx` (full rewrite of SortableHandCard + HandZone interfaces)**
  - `SortableHandCardProps` gains `isSelected: boolean` and `onToggleSelect: (id: string) => void`
  - Three-way transform: `isSelected → 'translateY(-6px)'`, `isDragging → undefined`, else `CSS.Transform.toString(transform)` (Pitfall 1 fix)
  - Outer wrapper `<div>` gains `onClick={() => onToggleSelect(card.id)}` and `onPointerDown={(e) => e.stopPropagation()}`
  - Inner `<div>` gains conditional ring classes when `isSelected`, and `aria-pressed={isSelected}` (placed after `{...attributes}` spread to avoid duplicate)
  - `HandZoneProps` gains `selectedIds: Set<string>` and `onToggleSelect: (id: string) => void`
  - Count badge renders when `selectedIds.size >= 2` in the hand label row
  - `cards.map()` passes `isSelected={selectedIds.has(card.id)}` and `onToggleSelect={onToggleSelect}`
  - `useDndMonitor` REORDER_HAND logic is unchanged (Pitfall 2 respected)

## Key Files

```yaml
key-files:
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - src/components/HandZone.tsx
```

## Deviations

- **`aria-pressed` placement**: Placed after `{...attributes}` spread (not before) to avoid TS2783 duplicate property error — dnd-kit's `attributes` object includes its own `aria-pressed`, so explicit value must come last to override it.
- **JSX root wrapping div**: Used `className="contents"` on the pointer-down wrapper div to keep it layout-transparent, as noted in plan task guidance.
- **`useSortable` data shape preserved**: Kept `toZone: 'hand' as const, toId: playerId` in the `data` object alongside `fromZone` and `fromId` — the existing shape was retained to avoid breaking `handleDragEnd` data reads.

## Verification

- `npx tsc --noEmit`: 0 new errors (pre-existing `process.env` error in BoardDragLayer at line 88 is not from this plan)
- `npm test`: 130/135 tests pass — 130 in this worktree (5 PLAY_CARD_SET tests from 15-01 not yet merged)
- All acceptance criteria met per plan task greps

## Self-Check: PASSED
