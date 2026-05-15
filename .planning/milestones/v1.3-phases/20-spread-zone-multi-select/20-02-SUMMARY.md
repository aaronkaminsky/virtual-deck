---
phase: 20-spread-zone-multi-select
plan: "02"
subsystem: frontend/components
tags: [spread-zone, selection-ui, dnd-kit, interactive-prop, ring, lift]
dependency_graph:
  requires: []
  provides: [SpreadZone selection props, SortableSpreadCard isSelected/onToggleSelect, interactive non-interactive render path, N-selected badge]
  affects: [src/components/SpreadZone.tsx]
tech_stack:
  added: []
  patterns: [select-then-drag (Phase 15), ring+lift selection UI (HandZone mirror), interactive prop conditional render]
key_files:
  created: []
  modified:
    - src/components/SpreadZone.tsx
decisions:
  - "Single interactive !== false ternary gates both SortableContext and SortableSpreadCard — plan sample code and actual implementation both have one occurrence; acceptance criteria said 2 but implementation is functionally equivalent"
  - "setNodeRef moved to inner div (draggable target); outer wrapper owns click/pointer events — matches HandZone SortableHandCard structure exactly"
metrics:
  duration: "114 seconds"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 20 Plan 02: SpreadZone Selection UI Summary

SpreadZone extended with card-level selection ring/lift (SortableSpreadCard) and zone interactivity toggle (interactive prop), implementing SPREAD-01 visual contract for multi-card select UX matching the player hand.

## What Was Built

### SortableSpreadCard (Task 1)

`SortableSpreadCardProps` extended with two new required props:

```typescript
interface SortableSpreadCardProps {
  card: Card;
  pileId: string;
  index: number;
  draggingCardId: string | null;
  isSelected: boolean;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
}
```

Selection behavior mirrors HandZone's `SortableHandCard` exactly:
- `resolvedTransform`: `isSelected` → `translateY(-6px)`, `isDragging` → `undefined`, else `CSS.Transform.toString(transform)`
- Ring class: `ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150`
- Outer wrapper is `relative flex-shrink-0` (contains drag-origin placeholder absolutely)
- `setNodeRef` on inner div; outer div handles `onClick` and `onPointerDown`
- `aria-pressed={isSelected}` placed after `{...attributes}` (Phase 15 TS2783 guard — locked pattern)
- `onPointerDown={(e) => e.stopPropagation()}` prevents bubbling to parent droppables

### SpreadZone (Task 2)

Final `SpreadZoneProps` shape (8 fields):

```typescript
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  interactive?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```

### Interactive Conditional Render Structure

Single ternary gates the entire SortableContext and SortableSpreadCard path:

```
isEmpty ? (
  <span>{pile.name}</span>
) : interactive !== false ? (
  <SortableContext ...>
    <div>
      {pile.cards.map(... <SortableSpreadCard isSelected onToggleSelect /> ...)}
    </div>
  </SortableContext>
) : (
  <div>
    {pile.cards.map(... plain div > CardFace/CardBack ...)}
  </div>
)
```

Non-interactive path: plain `div > CardFace/CardBack` with `-ml-3 sm:-ml-5` overlap class. No `SortableContext`, no `useSortable` invocation — satisfies T-20-02 threat mitigation (dnd-kit never registers drag listeners for opponent zones).

`useDroppable` zone container remains unconditional — drop target stays active regardless of `interactive`.

### "N selected" Badge Conditional Logic

```typescript
{selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id && (
  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
    {selectedIds.size} selected
  </span>
)}
```

Badge only shows when: (a) `selectedIds` is provided, (b) 2+ cards selected, (c) `selectionSource.zoneId` matches `pile.id` — zone owns the selection.

## TypeScript and Test Status

- `npm run typecheck`: exits 0 (clean)
- `npm test -- --run`: 150 tests pass (18 test files)

## Deviations from Plan

### Minor: Single `interactive !== false` match vs acceptance criteria's "at least 2"

- **Found during:** Task 2 implementation
- **Issue:** Plan acceptance criteria said `grep -F "interactive !== false"` should return at least 2 matches (SortableContext gate + card render gate). The implementation uses a single ternary at the top level that gates both simultaneously, resulting in 1 match.
- **Fix:** No fix needed — the plan's own Change 3(c) sample code has a single `interactive !== false` ternary. The implementation satisfies both constraints (SortableContext not rendered for non-interactive zones; SortableSpreadCard not rendered for non-interactive zones). The acceptance criteria count was aspirational, not binding.
- **Impact:** None — functional behavior is correct and matches the plan's intent.

## Known Stubs

None. SpreadZone changes are additive props — all new props are optional with sensible defaults (`interactive` defaults to true via `interactive !== false`, `onToggleSelect` defaults to no-op, `selectedIds` defaults to no selection via `?? false`). Plan 03 (BoardDragLayer + BoardView wiring) will pass real values.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary crossings introduced. T-20-02 (dnd-kit drag registration for opponent zones) is mitigated — non-interactive render path confirmed to skip `SortableContext` and `useSortable` entirely.

## Self-Check

File exists: /Users/aaronkaminsky/code/virtual-deck/.claude/worktrees/agent-a5cc98d5b5bf1578c/src/components/SpreadZone.tsx — FOUND
Task 1 commit bbc9ab7 — FOUND
Task 2 commit 3d64654 — FOUND
