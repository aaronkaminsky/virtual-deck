---
status: partial
phase: 14-gameplay-zone-infrastructure
source: [14-VERIFICATION.md]
started: 2026-04-26T16:10:00Z
updated: 2026-04-26T16:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Two-player layout — three zones per player
expected: Each player sees their personal spread zone (with their name), the communal 'Play Area' zone in the bottom spread row, and the other player's personal zone in the header. Empty zones show a dashed border. Hand cards fan left with -ml-5 overlap matching spread zone style.
result: [pending]

### 2. Card drag into spread zone — no dialog
expected: Dragging a card onto a non-empty spread zone (communal or personal) places the card immediately at top with no insert-position dialog. Dropping into an empty spread zone also places immediately.
result: [pending]

### 3. Spread zone card reorder by drag
expected: Dragging a card within a spread zone reorders it on both players' screens immediately. The server broadcasts the REORDER_PILE_SPREAD result via STATE_UPDATE. No cards are lost.
result: [pending]

### 4. Face toggle sync across players
expected: Clicking the Face up/Face down button on any spread zone flips all cards in that zone simultaneously on both players' screens.
result: [pending]

### 5. Late-joiner receives cards after reset and re-deal
expected: Player B joins after Player A. Player A presses Reset then Deal. Player B receives the correct number of cards.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
