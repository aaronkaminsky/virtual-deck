---
phase: 15-multi-card-set-play
fixed_at: 2026-04-28T12:54:11Z
review_path: .planning/phases/15-multi-card-set-play/15-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-04-28T12:54:11Z
**Source review:** .planning/phases/15-multi-card-set-play/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: PLAY_CARD_SET — duplicate cardId in payload causes card duplication

**Files modified:** `party/index.ts`
**Commit:** 62a443b
**Applied fix:** Added a `Set` size check immediately after the `allPresent` validation. The `cardIdSet` constant was moved up to this position (replacing the identical `const cardIdSet` that previously appeared after the snapshot), so it is now built once and reused for both the duplicate check and the subsequent hand filter. A client sending duplicate IDs now receives an `ERROR` with code `DUPLICATE_CARD_IDS` and no mutation occurs.

---

### CR-02: Duplicate `PLAY_CARD_SET` variant in `ClientAction` union

**Files modified:** `src/shared/types.ts`
**Commit:** be7e3e4
**Applied fix:** Removed the second (redundant) `PLAY_CARD_SET` union member on line 70. The canonical definition on line 67 is retained. The union now has 11 members, each with a unique `type` discriminant.

---

### WR-01: Selection not cleared when a single selected card is dragged to a pile

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 6edcdb5
**Applied fix:** Added `setSelectedIds(new Set())` at the top of the `else if (isSuccess)` branch in `handleDragEnd`, before `setActiveCard(null)`. This ensures that after any successful single-card drag (to a pile, spread, or hand), the selection set is cleared and no stale card IDs remain.

---

### WR-02: Selection cleared on any pointer-down in BoardDragLayer wrapper, conflicting with click-to-select

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 0385573
**Applied fix:** Removed `onPointerDown={() => setSelectedIds(new Set())}` from the wrapper `<div>`. Selection is now cleared only via well-defined paths: Escape key (existing `keydown` handler), drag start of an unselected card (existing `handleDragStart` guard), successful set play (existing `isMultiCardSet` path), and successful single-card drag (WR-01 fix). This eliminates the race condition with dnd-kit's native pointer listener.

---

### WR-03: `PLAY_CARD_SET` does not validate that `cardIds` is non-empty

**Files modified:** `party/index.ts`
**Commit:** 34e96e7
**Applied fix:** Added an early-exit guard checking `cardIds.length === 0` immediately after destructuring the action, before all other validation. An empty payload now returns `ERROR` with code `EMPTY_CARD_SET` without calling `takeSnapshot` or touching game state.

---

### WR-04: `PLAY_CARD_SET` mutates card faceUp using `?? true` fallback, leaking cards on undefined-faceUp piles

**Files modified:** `party/index.ts`
**Commit:** 7fcfdc8
**Applied fix:** Changed `card.faceUp = destPile.faceUp ?? true` to `card.faceUp = destPile.faceUp === true`. Cards played to a pile with `faceUp: undefined` now land face-down (the safe default), preventing unintended card identity exposure via the `viewFor` masking logic.

---

_Fixed: 2026-04-28T12:54:11Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
