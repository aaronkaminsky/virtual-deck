---
phase: 20-spread-zone-multi-select
plan: "03"
subsystem: frontend/components
tags: [selection-state-machine, selectionSource, zone-exclusive-selection, BoardDragLayer, BoardView, HandZone, interactive-prop]
dependency_graph:
  requires: [20-01, 20-02]
  provides: [selectionSource state, zone-exclusive handleToggleSelect, extended PLAY_CARD_SET dispatch, interactive prop threading, HandZone 3-arg signature]
  affects:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - src/components/HandZone.tsx
tech_stack:
  added: []
  patterns: [SelectionSource discriminator type, isDifferentZone zone-clear pattern, dragFromId capture before ref-null]
key_files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx
    - src/components/HandZone.tsx
decisions:
  - "Captured dragDataRef.current.fromId into dragFromId local variable before setting dragDataRef.current = null in isMultiCardSet block to avoid reading null ref in sendAction"
  - "selectionSource intentionally stays set when selectedIds becomes empty via deselection (not cleared until Escape or zone-switch) — no visible stale badge since badge requires size >= 2"
metrics:
  duration: "~4 minutes"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 20 Plan 03: Selection State Machine and Multi-Card Drag Dispatch Summary

Wired the full client-side selection state machine: `selectionSource` state added to `BoardDragLayer`, zone-exclusive `handleToggleSelect` replaces the old 1-arg version, extended `isMultiCardSet` and `PLAY_CARD_SET` dispatch handle pile-source moves and `toZone:'hand'` destinations, and `BoardView` threads `selectionSource` + `interactive` props to all `SpreadZone` instances.

## What Was Built

### Task 1: BoardDragLayer.tsx — selectionSource State Machine

**SelectionSource type alias** (added above `BoardDragLayerProps`):
```typescript
type SelectionSource = { zone: 'hand' | 'pile'; zoneId: string } | null;
```

**selectionSource state** (alongside `selectedIds`):
```typescript
const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
```

**handleToggleSelect — zone-exclusive logic (isDifferentZone branch)**:
```typescript
const handleToggleSelect = (id: string, zone: 'hand' | 'pile', zoneId: string) => {
  const isDifferentZone = selectionSource !== null &&
    (selectionSource.zone !== zone || selectionSource.zoneId !== zoneId);

  if (isDifferentZone) {
    setSelectionSource({ zone, zoneId });
    setSelectedIds(new Set([id]));
    return;
  }

  setSelectedIds(prev => { ... toggle id ... });
  if (selectionSource === null) setSelectionSource({ zone, zoneId });
};
```
When clicking in a different zone/zoneId from the current `selectionSource`: clear selection, start fresh with the new card as the only selected item.

**isMultiCardSet — extended check (toZone:'hand' + intra-spread guard)**:
```typescript
const isMultiCardSet =
  selectedIds.size > 1 &&
  selectedIds.has(activeId) &&
  !!event.over &&
  (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
  !(dragDataRef.current?.fromZone === 'pile' && dragDataRef.current?.fromId === overData?.toId);
```
The intra-spread guard (`!(fromZone === 'pile' && fromId === toId)`) prevents PLAY_CARD_SET from firing when dragging within the same pile (handled by `REORDER_PILE_SPREAD`).

**PLAY_CARD_SET dispatch routing (fromZone/fromId selection)**:
```typescript
const dragFromId = dragDataRef.current?.fromId ?? playerId;
// ... (clear state, null dragDataRef) ...
sendAction({
  type: 'PLAY_CARD_SET',
  cardIds: [...selectedIds],
  fromZone: (selectionSource?.zone ?? 'hand') as 'hand' | 'pile',
  fromId: selectionSource?.zone === 'pile' ? dragFromId : playerId,
  toZone: overData!.toZone as 'pile' | 'hand',
  toId: overData!.toId,
});
```
`dragFromId` is captured before `dragDataRef.current` is nulled — avoids reading null ref in the `sendAction` call.

**setSelectionSource(null) clear paths (4 locations)**:
1. Escape key handler
2. `handleDragStart` — dragging an unselected card
3. `isMultiCardSet` post-dispatch block
4. `isSuccess` block (single-card drag success)

### Task 2: BoardView.tsx — Prop Threading

**BoardViewProps** gains two new fields:
```typescript
onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null;
```

**Spread zone prop threading summary:**

| Zone | interactive | selectedIds | onToggleSelect | selectionSource |
|------|-------------|-------------|----------------|-----------------|
| Opponent personal | `{false}` | — | — | — |
| Communal (play) | `{true}` | yes | yes | yes |
| My personal spread | `{true}` | yes | yes | yes |

Opponent personal zones receive `interactive={false}` — no drag listeners registered for opponent cards (dnd-kit does not register them in the non-interactive render path from Plan 02).

### Task 2: HandZone.tsx — Signature Update

**SortableHandCardProps.onToggleSelect** and **HandZoneProps.onToggleSelect** widened from `(id: string)` to `(id: string, zone: 'hand' | 'pile', zoneId: string)`.

**SortableHandCard onClick** updated:
```typescript
onClick={() => onToggleSelect(card.id, 'hand', playerId)}
```

## Test Status

- `npm run typecheck`: exits 0 (clean)
- `npm test -- --run`: 18 test files, 154 tests, 0 failures

## Deviations from Plan

### Rule 1 — Bug Fix: dragDataRef.current capture before null assignment

**Found during:** Task 1 implementation review
**Issue:** The plan's `Change 7` called `dragDataRef.current!.fromId` in the `sendAction` body, but `Change 8` set `dragDataRef.current = null` immediately before `sendAction`. Reading a null ref would throw at runtime.
**Fix:** Added `const dragFromId = dragDataRef.current?.fromId ?? playerId;` before the clear block, then referenced `dragFromId` in `sendAction` instead of `dragDataRef.current!.fromId`.
**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 4c0a98a

## Known Stubs

None. All selection props are wired end-to-end from BoardDragLayer → BoardView → SpreadZone (Plan 02). The `selectionSource.zoneId === pile.id` badge condition in SpreadZone will display correctly with the real `selectionSource` values now flowing from BoardDragLayer.

## Threat Flags

None. No new network endpoints or trust boundaries. T-20-01/T-20-02/T-20-03 mitigations from the plan's threat register are implemented as specified.

## Self-Check

Files exist and were modified:
- src/components/BoardDragLayer.tsx — FOUND
- src/components/BoardView.tsx — FOUND
- src/components/HandZone.tsx — FOUND

Commits:
- Task 1 commit 4c0a98a — present in git log
- Task 2 commit b511e18 — present in git log
