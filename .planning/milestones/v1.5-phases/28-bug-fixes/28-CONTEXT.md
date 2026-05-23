# Phase 28: Bug Fixes - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two specific bugs in the existing board UI:
1. **BUG-01**: Select All button on pile zones has no visual effect — the top card is selected in state but shows no ring/lift feedback to the user.
2. **BUG-02**: Communal grid zone renders 7 columns at all viewport widths — it must collapse to 4 columns below 640px (iPhone SE and similar).

No new features, no layout restructuring.

</domain>

<decisions>
## Implementation Decisions

### BUG-01: Pile card selection ring

- **D-01:** Ring appears on the card face/back itself (not on the pile border) — same placement as SpreadZone and HandZone selected cards.
- **D-02:** Ring style matches SpreadZone exactly: `ring-1 ring-primary/30 ring-offset-1 ring-offset-background`. No deviation for pile context.
- **D-03:** Implementation path: add `isSelected?: boolean` prop to `DraggableCard`; apply the ring class when true. Pass `selectedIds` down from `BoardDragLayer` → `BoardView` → `PileZone` → `DraggableCard` (the same wiring path that already exists for SpreadZone).
- **D-04:** Vitest unit/component test: render `PileZone` with a `selectedIds` set containing the top card's id; assert the ring class is present on the rendered card element.

### BUG-02: Mobile grid columns

- **D-05:** CSS-only fix: change `grid-cols-7` to `grid-cols-4 sm:grid-cols-7` in `GridZone.tsx`.
- **D-06:** 14 cells (7×2 grid) will wrap to 4 rows on mobile — this is acceptable per the established Out of Scope decision ("Server-side grid position remapping on mobile — CSS-only column collapse accepted; card coordinates remain in 7-col space").
- **D-07:** No change to the outer `overflow-x-auto` wrapper — keep as-is.
- **D-08:** Playwright responsive test: load game at 375px viewport; assert the grid element has 4 columns computed style (or CSS class). Mirrors existing `responsive.spec.ts` pattern.

### Claude's Discretion

- Exact Vitest test setup (rendering approach, mock data structure) — follow existing test patterns in the repo.
- Whether to add `data-testid` to the grid or use CSS class assertions for the Playwright test.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### BUG-01 — Select All on pile

- `src/components/PileZone.tsx` — pile Select All button + `DraggableCard` rendering; needs `selectedIds` prop added
- `src/components/DraggableCard.tsx` — needs `isSelected?: boolean` prop + ring class applied
- `src/components/BoardView.tsx` — PileZone prop wiring; `onSelectAll` is passed but `selectedIds` is missing
- `src/components/BoardDragLayer.tsx` — `handleSelectAll` + `selectedIds` state; where `selectedIds` originates
- `src/components/SpreadZone.tsx` — reference implementation: how `SortableSpreadCard` applies `ring-1 ring-primary/30` when `isSelected` is true (lines 26, 52)

### BUG-02 — Grid mobile columns

- `src/components/GridZone.tsx` — the `grid-cols-7` class on the grid div (line 148) is the fix target; cell sizing already responsive
- `playwright/responsive.spec.ts` — reference pattern for viewport-scoped Playwright tests

### Requirements

- `.planning/REQUIREMENTS.md` §Bug Fixes — BUG-01 and BUG-02 acceptance criteria
- `.planning/REQUIREMENTS.md` §Out of Scope — "Server-side grid position remapping on mobile" out-of-scope decision

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `SortableSpreadCard` (in `SpreadZone.tsx`) — the exact `isSelected` + ring pattern to replicate in `DraggableCard`
- `responsive.spec.ts` — viewport-test scaffold to copy for BUG-02 e2e test

### Established Patterns

- Selected card ring: `ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm` — used in SpreadZone and HandZone; must match exactly
- Responsive Tailwind: `grid-cols-4 sm:grid-cols-7` follows existing breakpoint convention (`sm:` = 640px)
- `handleSelectAll` in `BoardDragLayer.tsx:118-122` already correctly sets `selectedIds` and `selectionSource`; the missing link is the prop not flowing back to `PileZone`

### Integration Points

- `BoardDragLayer` → `BoardView` → `PileZone` prop chain: `selectedIds` needs to be added alongside the existing `onSelectAll` prop at the `BoardView:76` call site
- `PileZone` → `DraggableCard`: currently `DraggableCard` renders without `isSelected`; the fix adds the prop

</code_context>

<specifics>
## Specific Ideas

- The BUG-01 fix is surgical: add one prop to `DraggableCard`, thread `selectedIds` through one prop boundary in `BoardView`. No refactor needed.
- The BUG-02 fix is a one-class change in `GridZone.tsx`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-bug-fixes*
*Context gathered: 2026-05-20*
