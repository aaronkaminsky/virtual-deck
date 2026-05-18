---
phase: 24
fixed_at: 2026-05-17T00:00:00Z
review_path: .planning/phases/24-spread-pile-multi-select-and-sort/24-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-05-17
**Source review:** `.planning/phases/24-spread-pile-multi-select-and-sort/24-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, CR-02, WR-01, WR-02, WR-03)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `MOVE_CARD` and `PLAY_CARD_SET` write unbounded `toRow`/`toCol` to `gridPositions`

**Files modified:** `party/index.ts`
**Commit:** 32502a5
**Applied fix:** Added `MAX_ROWS = 2` / `MAX_COLS = 7` bounds guards in both the `MOVE_CARD` handler (after the `destPile?.id === 'play'` check, around line 328) and the `PLAY_CARD_SET` handler (before the `destPile.gridPositions` assignment, around line 736). On out-of-range values, sends an `ERROR` event with code `INVALID_POSITION` and breaks without writing to `gridPositions`. Logic mirrors the existing `MOVE_GRID_CARD` handler exactly.

Note: In `MOVE_CARD`, the validation fires after the card has already been pushed to the destination array. An out-of-range `toRow`/`toCol` results in the card landing in the play pile without a grid position (defaulting to cell 0,0 in the UI) rather than the card move being fully rejected. This matches the reviewer's stated intent (prevent unbounded values in `gridPositions`) and is the minimal safe fix given the current code structure.

### CR-02: Multi-select drag from within grid pile only moves the dragged card

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 888c01f
**Applied fix:** Added an `else if` branch inside the `if (isSpread)` block in `handleDragEnd`, after the existing `if (!isIntraSpreadReorder)` arm. When `isIntraSpreadReorder` is true AND `selectedIds.size > 1` AND `selectionSource?.zoneId === 'play'`, the branch dispatches individual `MOVE_GRID_CARD` actions for each selected card ID to the target cell (extracted from `event.over.data.current`), then clears selection state. This is correct because `isMultiCardSet` was already excluding `isIntraSpreadReorder === true` drops, so intra-grid multi-select drags fell through to the single-card `MOVE_CARD` path.

### WR-01: Dead `setRefs` function in `GridCell`

**Files modified:** `src/components/GridZone.tsx`
**Commit:** f355611
**Applied fix:** Deleted the `setRefs` function definition (4 lines). The component was already using the two-ref split correctly — `ref={setDropRef}` on the outer container and `ref={setDragRef}` on the inner drag handle div. The `setRefs` closure was never referenced in JSX.

### WR-02: Unreachable null-guard branches in `viewFor`

**Files modified:** `party/index.ts`
**Commit:** bb6a5e8
**Applied fix:** Changed the `viewFor` signature from `playerToken: string | null` to `playerToken: string`. Removed the `if (playerToken === null) throw` guard (now unnecessary — callers must pass a string). Replaced `myPlayerId: playerToken ?? ""` with `myPlayerId: playerToken`, `myHand: playerToken ? (state.hands[playerToken] ?? []) : []` with `myHand: state.hands[playerToken] ?? []`, and `myPlayZoneId: playerToken ? \`spread-${playerToken}\` : ""` with `myPlayZoneId: \`spread-${playerToken}\``. The sole call site (`broadcastState`) passes `getPlayerToken(conn)` which already returns `string` non-nullably, so no call-site changes were needed.

### WR-03: Mobile grid renders 14 cells in a 4-column CSS grid

**Files modified:** `src/components/GridZone.tsx`
**Commit:** f355611
**Applied fix:** Changed the CSS class from `grid grid-cols-4 sm:grid-cols-7` to `grid grid-cols-7` on the grid container (`data-testid="grid-zone-play"`). The 2×7 play area now renders 7 columns at all viewport widths, preventing the mobile 4-column reflow that broke the spatial mapping of card positions.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-05-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
