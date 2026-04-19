---
status: complete
phase: 11-empty-pile-drop-ux
source: [11-01-SUMMARY.md]
started: 2026-04-19T07:41:00Z
updated: 2026-04-19T07:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Empty pile fast path
expected: Drag a card to an empty pile — no insert-position dialog opens, the card lands immediately at the top of the pile.
result: pass

### 2. Non-empty pile dialog unaffected
expected: Drag a card to a non-empty pile — the insert-position dialog still appears (Top / Bottom / Random). Non-empty pile behavior is unchanged.
result: pass

### 3. Broadcast to all players
expected: In a two-window (two-player) session, an empty-pile drop performed in one window is reflected in the other window without a page refresh.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

