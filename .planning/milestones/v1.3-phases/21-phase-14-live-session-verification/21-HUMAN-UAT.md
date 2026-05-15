---
status: complete
phase: 21-phase-14-live-session-verification
source: [21-CONTEXT.md, 21-RESEARCH.md, 21-VALIDATION.md]
started: 2026-05-14T05:39:05Z
updated: 2026-05-14T12:25:00Z
---

## Current Test

[not yet started]

## Setup

Two terminals required:
1. `npm run dev` — PartyKit local server (room state authority)
2. `npm run dev:client` — Vite dev server (open http://localhost:5173)

For Test 7 (multi-player sync): open the same room URL in two browser windows (e.g., Chrome + Chrome Incognito), join with two distinct player names.

## Tests

### 1. Selection preserved through intra-spread-zone drag-start (SPREAD-02 SC2, D-01)

expected: Select 2+ cards in a personal spread zone (e.g., the "play" pile after dealing some cards there). Begin dragging one of the selected cards within the same spread zone (do not drop yet). The "N selected" badge stays visible and the selected ring/lift treatment remains on all selected cards while the drag is in progress.
result: passed

### 2. Selection preserved through intra-spread-zone drag-end (SPREAD-02 SC2, D-02)

expected: Continuing from Test 1, complete the drop within the same spread zone (drag onto another card in the same zone). After the drop completes, the "N selected" badge is still visible and the selected cards are still highlighted. No selection clear after a successful intra-zone reorder.
result: passed

### 3. Group reorder — selected block moves together with original relative order preserved (SPREAD-02 SC2, D-03/D-04/D-06)

expected: With cards [A, B, C, D, E] in a spread zone, select B and D (two non-adjacent cards), then drag B onto E. After the drop, the spread zone order is [A, C, B, D, E] — selected cards B and D moved as a block to the position before E, and their original relative order (B before D) is preserved. Then with [A, B, C, D, E] select A, B, C and drag onto E — order becomes [D, A, B, C, E]. Test against both a personal spread zone and the communal "play" spread zone.
result: passed

### 4. Unselected drag does NOT trigger group reorder (SPREAD-02 SC2)

expected: With cards [A, B, C, D, E] in a spread zone, select B and D. Then drag UNSELECTED card C onto E. Only card C moves (single-card reorder via arrayMove). Cards B and D do NOT move and the selection is cleared (per Phase 20 D-04 invariant — dragging an unselected card while others are selected clears selection).
result: passed

### 5. Selection preserved through intra-hand drag (SPREAD-02 SC2, D-01/D-02 — hand variant)

expected: Select 2+ cards in your own hand. Drag one selected card within the hand to reorder. The "N selected" badge in the hand row stays visible during drag and after drop. Group reorder applies — all selected hand cards move as a block in their original relative order. Dragging an unselected hand card while others are selected clears selection (Phase 20 invariant).
result: passed

### 6. Undo restores prior order — spread zone reorder (SPREAD-02 SC3, D-07)

expected: Place at least 3 face-up cards in a spread zone (e.g., [A, B, C] in "play"). Reorder them to [C, A, B] via drag. Open the controls panel and click Undo (or press the undo button). The spread zone returns to [A, B, C]. Repeat with a group reorder: cards [A, B, C, D, E], select B+D, drag onto E → [A, C, B, D, E]. Click Undo → cards return to [A, B, C, D, E].
result: passed

### 7. Multi-player sync — reorder visible to other players in real time (SPREAD-02 SC1, D-13)

expected: Open two browser windows joined to the same room as two different players. With cards in the communal "play" spread zone, reorder them in Window 1. Window 2 reflects the new order within ~1 second (PartyKit broadcast latency). Then perform a group reorder in Window 1 with 2 selected cards — Window 2 sees both cards moved as a block. Trigger Undo in Window 1 — both windows see the prior order.
result: passed

## Summary

total: 7
passed: 7
issues: 0
pending: 0

## Gaps

NOW FIXED: Found while testing, if I have cards selected and then Reset the table, the selection is not completely cleared. The "X selected" badge does not disappear, and if any of the selected cards are delt back into the hand they show up as selected.

NOW FIXED (21-05): When reordering multiple cards you cannot move to the end, dropping on or after the last card puts the dropped set just before the last card.  If you drop passed the last card it should be a drop zone that puts the dragged cards at the end.

NOW FIXED: In tests #4 and #5 the unselected card was re-ordered successfully but it did not clear the prior selection.  Starting to drag an unselected card should clear the selection.