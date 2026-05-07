---
status: diagnosed
phase: 19-npm-audit
source: [19-VERIFICATION.md]
started: 2026-05-06T06:40:00Z
updated: 2026-05-06T06:45:00Z
---

## Current Test

Human testing completed 2026-05-06.

## Tests

### 1. All zones visible and operable at 375px viewport
expected: HandZone, SpreadZone, PileZone, and BoardView are all visible and not cropped or hidden behind overflow-x-auto containers at 375px width
result: failed — play area zone is clipped on the right; PileZone controls ("Face down", "Shuffle", "Face up", "Shuffle") take too much horizontal space causing overflow; opponent hand spans full width; opponent spread zone can overflow viewport

### 2. Header and controls readable at phone width
expected: The flex header row is usable at 375px — controls are not clipped to the point of being unusable; overflow-x-auto scrolls gracefully if needed
result: passed

### 3. Pointer interactions (drag, click) work at 375px
expected: 42px cards (phone size) are large enough to drag and click reliably; no interaction regressions at phone viewport
result: passed

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

### Gap 1: PileZone controls overflow at 375px
status: failed
detail: Text labels "Face down", "Shuffle", "Face up", "Shuffle" under Draw/Discard/Play Area piles take too much horizontal space. Third zone (Play Area) is clipped off-screen. Fix: replace text labels with icon buttons.

### Gap 2: Opponent hand too wide at 375px
status: failed
detail: Opponent hand (OpponentHand component) renders all cards in a row, spanning full viewport width or wider. Fix: cap visible cards at a max (e.g. 5), show remaining count as a badge.

### Gap 3: Opponent spread zone overflows viewport
status: failed
detail: Opponent's SpreadZone can spread beyond the visible pane. Fix: constrain spread zone width to viewport, no overflow-x.
