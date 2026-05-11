---
phase: 20-spread-zone-multi-select
fixed_at: 2026-05-11T00:00:00Z
review_path: .planning/phases/20-spread-zone-multi-select/20-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-05-11T00:00:00Z
**Source review:** .planning/phases/20-spread-zone-multi-select/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: PLAY_CARD_SET allows any player to move cards into any other player's hand

**Files modified:** `party/index.ts`
**Commit:** 924195e
**Applied fix:** Added `toZone === "hand" && toId !== senderToken` authorization guard after destination resolution and before `takeSnapshot`, returning an `UNAUTHORIZED_MOVE` error and breaking out of the handler — mirrors the identical guard already present in `MOVE_CARD`.

---

### CR-02: Stale closure sends wrong fromId in multi-select PLAY_CARD_SET when selection is from a pile

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 0060e8a
**Applied fix:** Removed the `dragFromId` variable (which read from `dragDataRef.current?.fromId`) and replaced it with direct use of `selectionSource.zoneId` as the canonical pile ID for the `fromId` field. Also removed the now-unused `dragFromId` local variable entirely.

---

### WR-01: viewFor applies "top card visible" masking to spread-zone piles, leaking card identity

**Files modified:** `party/index.ts`
**Commit:** bd7553c
**Applied fix:** Added an early-return guard `if (pile.region === 'spread') return card;` at the top of the `cards.map` callback in `viewFor`, before the `isTop` masking logic. Spread-zone cards are always returned as-is.

---

### WR-02: isMultiCardSet allows a multi-card drop onto opponent-hand but PLAY_CARD_SET is sent instead of PASS_CARD

**Files modified:** `src/components/BoardDragLayer.tsx`
**Commit:** 98c192f
**Applied fix:** Removed `overData?.toZone === 'opponent-hand'` from the `isMultiCardSet` condition, leaving only `'pile'` and `'hand'` as valid destinations for multi-card set drops.

---

### WR-03: PLAY_CARD_SET mutates card faceUp before removing from source, which corrupts the ordering

**Files modified:** `party/index.ts`
**Commit:** 8045b9d
**Applied fix:** Reordered the mutation sequence so cards are removed from source first (filter step), then `faceUp` is set on `cardsToPlay`, then cards are pushed to `dest`. Updated comments to reflect the new safe ordering.

---

### WR-04: HandZone selection badge shows when selectedIds contains hand cards belonging to another zone

**Files modified:** `src/components/HandZone.tsx`, `src/components/BoardView.tsx`
**Commit:** 6034774
**Applied fix:** Added `selectionSource` prop to `HandZoneProps` interface and destructuring in `HandZone`. Updated the badge render condition from `selectedIds.size >= 2` to `selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId`. Passed `selectionSource={selectionSource}` from `BoardView` to `HandZone`.

---

_Fixed: 2026-05-11T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
