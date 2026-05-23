---
status: complete
phase: 29-sort-verification
source: [29-01-SUMMARY.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sort Button Cycles Through Modes
expected: Click the sort button in your hand zone. It should cycle through three modes in order: Original order → By Suit → By Rank → back to Original. The tooltip should update with each click to show the current mode and what clicking again will do.
result: pass

### 2. By Suit Reorders Cards Visually
expected: With cards in your hand, click sort until "By Suit" is active. Cards should visually reorder grouped by suit in the order ♠ ♣ ♦ ♥, with cards within each suit sorted by rank (2→A). The reorder should be instant.
result: pass

### 3. By Rank Reorders Cards Visually
expected: With cards in your hand, click sort until "By Rank" is active. Cards should visually reorder by rank (2, 3, 4 ... J, Q, K, A), with ties broken by suit. The reorder should be instant.
result: pass

### 4. Drag-Reorder Resets Sort to Original
expected: Sort your hand to By Suit or By Rank, then drag one card to a new position within the hand. The sort should reset to "Original order" (the tooltip should read "Sort: Original order — click for By Suit"). Your manual drag position becomes the new order.
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
