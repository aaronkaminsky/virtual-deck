# Phase 21: Spread Zone Reorder Verification - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement and verify SPREAD-02 — drag-reorder within spread zones and player hand works correctly with multi-select state active, and undo reverses reorder operations. Two client-side selection-clearing bugs need fixing. Two server-side actions are missing `takeSnapshot`. Additionally, group reorder is added: when a selected card is dragged within the same zone, ALL selected cards move to the drop position as a block.

**Requirements in scope:** SPREAD-02
**Out of scope:** Spread zone face-toggle sync, personal zone ownership guard, touch drag, any new zone types

</domain>

<decisions>
## Implementation Decisions

### Selection Preservation (SPREAD-02 SC2)
- **D-01:** Intra-zone reorder exempts from D-04 (Phase 20) selection clearing. At drag start in `handleDragStart`, only clear `selectedIds` if the drag is NOT an intra-zone reorder. Detection: `data.fromZone === 'pile' && data.fromId === data.toId` for spread zones; `data.fromZone === 'hand' && data.fromId === playerId` for hand reorders. Both conditions use `data.current` from the drag event.
- **D-02:** At drag end in `handleDragEnd`, the `setSelectedIds(new Set())` call inside the `isSuccess` block must also be conditioned on NOT being an intra-zone reorder — currently it fires unconditionally before the `isIntraSpreadReorder` guard deeper in the branch. Move or guard the clearing so intra-zone reorders preserve selection.

### Group Reorder
- **D-03:** When dragging a selected card within the same zone (spread or hand), ALL selected cards move to the drop position as a block. This applies to both `SpreadZone.useDndMonitor` and `HandZone.useDndMonitor`.
- **D-04:** Selected cards land in preserved relative order — same order they had before the drag (not dragged-card-first).
- **D-05:** Group reorder logic lives in each zone's `useDndMonitor` (not `BoardDragLayer`). `selectedIds` must be passed as a prop into `HandZone` for group reorder computation (already passed to `SpreadZone`).
- **D-06:** Group reorder calculation: (1) filter selected cards out of the full array, (2) find the over-index in the remaining cards, (3) splice the selected cards (in their original relative order) at that position, (4) send the full `orderedCardIds` array. Server-side `REORDER_PILE_SPREAD` and `REORDER_HAND` handlers accept the full ordered array unchanged.

### Undo for Reorder (SPREAD-02 SC3)
- **D-07:** Add `takeSnapshot(this.gameState)` before `spreadPile.cards = ...` in the `REORDER_PILE_SPREAD` case in `party/index.ts`. This makes each spread zone reorder individually undoable.
- **D-08:** Add `takeSnapshot(this.gameState)` before `this.gameState.hands[senderToken] = ...` in the `REORDER_HAND` case in `party/index.ts`. Consistent with spread zone behavior — all reorders undoable.
- **D-09:** One snapshot per drag — no coalescing. Each reorder (single or group) = one undo step. Simple, predictable, consistent with all other action types.

### Verification Output
- **D-10:** Unit tests (Vitest) covering: group reorder calculation for spread zones, group reorder calculation for hand, selection preservation through intra-zone reorder drag-start, selection preservation through drag-end, and that `takeSnapshot` is called by server tests for both reorder actions.
- **D-11:** HUMAN-UAT.md with live session test script — step-by-step instructions to manually verify the interactions feel correct in a real game session (mirrors Phase 19 format).
- **D-12:** Update `REQUIREMENTS.md` traceability table to mark SPREAD-02 complete after verification passes.
- **D-13:** SC1 (single card reorder, order preserved for all players) is already wired — trust it. Focus implementation on SC2 (selection preservation + group reorder) and SC3 (undo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 21 — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — SPREAD-02 acceptance criteria and traceability table to update

### Patterns to Extend
- `src/components/SpreadZone.tsx` — the `useDndMonitor.onDragEnd` at line ~89 is the primary site for group reorder logic in spread zones; currently uses `arrayMove`, needs to branch on `selectedIds`
- `src/components/HandZone.tsx` — `useDndMonitor.onDragEnd` at line ~88 is the same site for hand reorder; `selectedIds` must be received as a prop
- `src/components/BoardDragLayer.tsx` — `handleDragStart` (line ~136): the D-04 clearing guard; `handleDragEnd` (line ~192): the `isSuccess` block selection clearing — both need intra-zone exemption

### Phase 20 Decisions That Apply
- `.planning/phases/20-spread-zone-multi-select/20-CONTEXT.md` — D-01 through D-09 are load-bearing. Specifically: D-04 (selection clearing behavior), D-01 (`selectionSource` state), D-03 ("N selected" badge scoping)
- `src/components/BoardDragLayer.tsx` — `GAP-06` comment at line ~218 explains the existing intra-spread reorder guard; Phase 21 extends this guard to also preserve selection

### Server Actions to Modify
- `party/index.ts` — `REORDER_PILE_SPREAD` case (~line 313): add `takeSnapshot` before mutation
- `party/index.ts` — `REORDER_HAND` case (~line 294): add `takeSnapshot` before mutation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `arrayMove` from `@dnd-kit/sortable` — already imported in both `SpreadZone.tsx` and `HandZone.tsx`; group reorder replaces `arrayMove` with a custom splice-at-position calculation
- `takeSnapshot` in `party/index.ts` — already defined and called for MOVE_CARD, PLAY_CARD_SET, etc.; just needs to be added to REORDER_* cases
- `selectedIds: Set<string>` already threaded through `BoardDragLayer` → `BoardView` → `SpreadZone`; same plumbing extends to `HandZone`

### Established Patterns
- `useDndMonitor.onDragEnd` in each zone handles intra-zone reorders independently — `BoardDragLayer.handleDragEnd` skips MOVE_CARD when `isIntraSpreadReorder` is true; Phase 21 extends this pattern to `HandZone`
- `data: { fromZone, fromId, toZone, toId }` on dnd-kit sortable items — at drag start, these values from `event.active.data.current` allow detecting intra-zone reorder before the drop completes
- D-04 (Phase 20): "dragging an unselected card while others are selected clears selection" — Phase 21 adds the intra-zone exemption to this rule

### Integration Points
- `BoardDragLayer.tsx` `handleDragStart`: needs to check `data.fromId === data.toId` (pile) or `data.fromZone === 'hand'` (hand) before calling `setSelectedIds(new Set())`
- `BoardDragLayer.tsx` `handleDragEnd` `isSuccess` branch: selection clearing at the top of the branch must be moved below the `isIntraSpreadReorder` / `isIntraHandReorder` computation
- `HandZone.tsx` props: add `selectedIds?: Set<string>` prop (already present in `SpreadZone`; `BoardDragLayer` passes it via `BoardView`)

</code_context>

<specifics>
## Specific Ideas

- Group reorder splice algorithm: remove selected cards from the array first (preserving their relative order with `filter`), then find the `overIdx` in the remaining array, then `splice(overIdx, 0, ...selectedCards)`. This ensures the drop position is stable regardless of where selected cards started.
- For the intra-zone detection at drag start: `data.toId` on `SortableSpreadCard` is already set to `pileId` (same as `fromId`) — this is the exact signal to detect intra-spread reorder at drag start without waiting for drag end.
- `handleDragEnd` fix: compute `isIntraSpreadReorder` and `isIntraHandReorder` BEFORE the `setSelectedIds(new Set())` call in the `isSuccess` branch, and skip clearing when either is true.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-phase-14-live-session-verification*
*Context gathered: 2026-05-11*
