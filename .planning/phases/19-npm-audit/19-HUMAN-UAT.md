---
status: partial
phase: 19-npm-audit
source: [19-VERIFICATION.md]
started: 2026-05-06T06:40:00Z
updated: 2026-05-08T14:55:00Z
---

## Current Test

Final visual confirmation required at 375px after gap-closure plan 06 (sticky header, adaptive opponent column, max-w-[200px] fix).

## Tests

### 1. All zones visible and operable at 375px viewport (initial pass — gaps found)
expected: HandZone, SpreadZone, PileZone, and BoardView are all visible and not cropped or hidden behind overflow-x-auto containers at 375px width
result: failed — play area zone is clipped on the right; PileZone controls took too much horizontal space; opponent hand spanned full width; opponent spread zone overflowed viewport

### 2. Header and controls readable at phone width
expected: The flex header row is usable at 375px — controls are not clipped to the point of being unusable; overflow-x-auto scrolls gracefully if needed
result: passed

### 3. Pointer interactions (drag, click) work at 375px
expected: 42px cards (phone size) are large enough to drag and click reliably; no interaction regressions at phone viewport
result: passed

### 4. All zones visible at 375px — final confirmation after gap closure
expected: All three pile columns (Draw, Discard, Play Area) visible without horizontal clipping. Opponent hand shows at most 5 cards. Opponent column stays within viewport. All zones accessible by vertical scroll. No zone cropped off-screen horizontally.
result: failed — opponent hand is slightly clipped; last card back and count badge are not visible at 375px. Root cause: max-w-[160px] on the per-opponent column wrapper is too narrow to fully show 5 overlapping 42px cards plus the badge.

### 5. All zones visible at 375px — Plan 06 final pass (sticky header + adaptive opponent column)
expected: All three pile columns visible. Opponent hand strip (5 cards + Badge) fully unclipped at max-w-[200px]. Sticky header (opponent strip + hamburger) stays pinned to top of viewport when board is scrolled vertically (z-20). With exactly 1 opponent the column fills available row width (flex-1 max-w-none). With 2+ opponents each column bounded to max-w-[200px]. No horizontal clipping on any zone. Desktop (sm:) behavior unchanged.
result: [pending]

## Summary

total: 5
passed: 2
issues: 2
pending: 1
skipped: 0
blocked: 0
open_gaps: 3

## Gaps

### Gap 1: PileZone controls overflow at 375px
status: resolved
detail: Text labels replaced with Eye/EyeOff/Shuffle icon-only buttons (28x28px square). Fixed in Plan 04, commit 41abde2.

### Gap 2: Opponent hand too wide at 375px
status: resolved
detail: OpponentHand caps visible card-back strip at MAX_VISIBLE_OPPONENT_CARDS=5. Fixed in Plan 05, commit 2f14471.

### Gap 3: Opponent spread zone overflows viewport
status: resolved
detail: Per-opponent column wrapper in BoardView bounded at max-w-[160px] sm:max-w-none overflow-x-hidden. Fixed in Plan 05, commit 315e36d.

### Gap 4: Opponent column too narrow — last card and badge clipped
status: pending-verification
detail: max-w-[160px] clips the OpponentHand at 375px. Fixed in Plan 06 (commit 602e4c3): per-opponent column widened to max-w-[200px] when 2+ opponents. Awaiting final visual confirmation.

### Gap 5: Hamburger menu not fixed at top — scrolls under opponent hand area
status: pending-verification
detail: At 375px the hamburger (controls collapse) menu does not stay at the top of the viewport. Fixed in Plan 06 (commit 602e4c3): header bar given sticky top-0 z-20. Awaiting final visual confirmation.

### Gap 6: Opponent area too narrow when only one opponent — should fill available width
status: pending-verification
detail: When there is only one opponent the column is pinned to a fixed cap leaving empty space. Fixed in Plan 06 (commit 602e4c3): per-opponent column uses flex-1 max-w-none when opponentCount === 1. Awaiting final visual confirmation.
