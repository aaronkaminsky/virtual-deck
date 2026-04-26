---
status: diagnosed
phase: 14-gameplay-zone-infrastructure
source: [14-VERIFICATION.md]
started: 2026-04-26T16:10:00Z
updated: 2026-04-26T16:15:00Z
---

## Current Test

Human testing completed 2026-04-26. 3 passed, 1 deferred to backlog, 1 bug identified.

## Tests

### 1. Two-player layout — three zones per player
expected: Each player sees their personal spread zone (with their name), the communal 'Play Area' zone in the bottom spread row, and the other player's personal zone in the header. Empty zones show a dashed border. Hand cards fan left with -ml-5 overlap matching spread zone style.
result: deferred — Play Area appears in front of the player rather than in the middle. Deferred to a layout improvements discussion (backlog) rather than treating as a single gap.

### 2. Card drag into spread zone — no dialog
expected: Dragging a card onto a non-empty spread zone (communal or personal) places the card immediately at top with no insert-position dialog.
result: pass

### 3. Spread zone card reorder by drag
expected: Dragging a card within a spread zone reorders it on both players' screens immediately. The server broadcasts the REORDER_PILE_SPREAD result via STATE_UPDATE.
result: fail — Can drag cards but they always land at the top/end of the zone rather than at the specific index over which the card was dropped. Intra-spread drop detection is not routing to REORDER_PILE_SPREAD; instead MOVE_CARD with insertPosition:top fires via BoardDragLayer.

### 4. Face toggle sync across players
expected: Clicking the Face up/Face down button on any spread zone flips all cards in that zone simultaneously on both players' screens.
result: pass

### 5. Late-joiner receives cards after reset and re-deal
expected: Player B joins after Player A. Player A presses Reset then Deal. Player B receives the correct number of cards.
result: pass

## Summary

total: 5
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0
deferred: 1

## Gaps

status: failed
id: GAP-06
description: Spread zone intra-zone drag reorder always inserts at top instead of at the dropped index. BoardDragLayer's isSpread bypass fires via MOVE_CARD insertPosition:top before SpreadZone's useDndMonitor REORDER_PILE_SPREAD can handle the intra-zone drop. Fix: detect intra-spread reorder in BoardDragLayer (fromZone===pile && fromId===toId && pile.region===spread) and skip MOVE_CARD dispatch so SpreadZone can handle it.
debug_session:
