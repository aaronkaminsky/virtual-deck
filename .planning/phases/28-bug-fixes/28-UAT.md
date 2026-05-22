---
status: complete
phase: 28-bug-fixes
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:05:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Pile Select Ring
expected: Select all cards in a pile (use "Select All" or click-select a pile), then look at the top card of that pile. It should show a subtle ring highlight — the same ring feedback SpreadZone and HandZone cards show when selected. The ring should not appear on piles whose cards are NOT selected.
result: pass

### 2. Mobile Grid Collapse
expected: Open the app in a narrow viewport or use browser DevTools to set the viewport to 375px wide (iPhone-size). The communal grid zone should display 4 columns of cards, NOT 7. Cards should wrap naturally into more rows. At desktop widths (640px+) the grid should return to 7 columns.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
