---
status: complete
phase: 18-controls-collapse
source: [18-01-SUMMARY.md, 18-02-SUMMARY.md]
started: 2026-05-04T00:00:00Z
updated: 2026-05-04T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Hamburger trigger only in header
expected: Open the app. The header right section shows only a hamburger icon button (Menu icon). There should be NO standalone "Copy link" button visible in the header — that button has moved inside the popover panel.
result: pass

### 2. Panel default-closed
expected: On page load, the controls panel is closed. Nothing expands below the hamburger button until you click it.
result: pass

### 3. Panel opens and closes
expected: Click the hamburger icon — the popover panel opens below it, right-aligned to the header edge. Click outside the panel (anywhere on the board) — the panel closes.
result: pass

### 4. Copy link inside panel with auto-close
expected: Open the panel. Click "Copy link". The button label changes to "Copied!" briefly, then the panel closes automatically after ~1.5 seconds. Check your clipboard — it should contain the room URL with ?room= in it.
result: pass

### 5. Deal closes panel immediately
expected: Open the panel while in setup or lobby phase (Deal should be enabled). Click Deal. The panel closes immediately after the action fires (not after a delay).
result: pass

### 6. Undo closes panel immediately
expected: Make a move so Undo is enabled, then open the panel and click Undo. The panel closes immediately after the action fires.
result: pass

### 7. Two-step Reset confirmation
expected: Open the panel in playing phase (Reset should be enabled). Click "Reset table" — the row morphs to show "Are you sure?" with "Keep playing" and "Reset table" buttons. Click "Keep playing" — returns to step 1 (single Reset table button). Now: open panel, click Reset to reach step 2, then close the panel (click outside). Reopen the panel — step 1 should be showing again (NOT "Are you sure?").
result: pass

### 8. Disabled states per phase
expected: In playing phase: Deal button is disabled (greyed out). In setup or lobby phase: Reset table button is disabled. Undo button is disabled whenever no moves have been made (canUndo = false). All buttons are still rendered — none disappear when disabled.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
