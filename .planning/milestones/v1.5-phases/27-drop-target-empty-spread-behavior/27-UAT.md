---
status: complete
phase: 27-drop-target-empty-spread-behavior
source: [27-01-SUMMARY.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:01:00Z
---

## Current Test

[testing complete]

## Tests

### 1. SpreadZone empty resting strip visible
expected: An empty spread zone at rest shows a faint dashed strip (~16px tall, dashed border, muted gray at 30% opacity). No text inside. Previously it was invisible (0 height, 0 opacity).
result: pass

### 2. OpponentHand — no border at drag-start
expected: Pick up a card and drag it around the board WITHOUT hovering over an opponent's hand. The opponent hand zone should show NO border and NO size change — it should look exactly the same as when nothing is being dragged.
result: pass

### 3. OpponentHand — amber border on hover
expected: While dragging a card, move the cursor directly over an opponent's hand zone. An amber (golden) solid border should appear around the zone.
result: pass

### 4. OpponentHand — "Drop to pass" hint
expected: While dragging a card, hover over an opponent's hand zone that has zero cards. The text "Drop to pass" should appear inside the zone as a hint.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
