---
status: resolved
phase: 18-controls-collapse
source: [18-VERIFICATION.md]
started: 2026-05-04T06:10:00Z
updated: 2026-05-04T06:12:00Z
---

## Current Test

Approved by developer during manual smoke check.

## Tests

### 1. Hamburger trigger visual — ghost variant matches header background
expected: Button background blends with bg-card header (no visible lighter rectangle)
result: approved — fixed from outline to ghost variant during smoke, confirmed visually

### 2. Copy link clipboard + 1500ms auto-close
expected: Click Copy link → "Copied!" appears → panel closes after ~1.5s → URL with ?room= in clipboard
result: approved — confirmed during smoke step 5

### 3. confirmReset cleared on Escape / outside-click
expected: Open panel, trigger Reset confirmation row, close panel (outside-click or Escape), reopen — step 1 shows (not "Are you sure?")
result: approved — confirmed during smoke step 8

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
