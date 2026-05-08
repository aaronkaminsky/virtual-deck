---
status: partial
phase: 19-npm-audit
source: [19-VERIFICATION.md]
started: 2026-05-06T06:40:00Z
updated: 2026-05-08T13:20:00Z
---

## Current Test

Final visual confirmation required at 375px after gap-closure plans 04 and 05.

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

## Summary

total: 4
passed: 2
issues: 2
pending: 0
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
status: failed
detail: max-w-[160px] clips the OpponentHand at 375px. Five 42px cards with -ml-3 (12px) overlap need ~162px for the strip alone; the count badge adds another ~24px. Fix: widen the column cap to max-w-[200px] or reduce MAX_VISIBLE_OPPONENT_CARDS to 4 (which fits in ~136px + badge = ~160px).

### Gap 5: Hamburger menu not fixed at top — scrolls under opponent hand area
status: failed
detail: At 375px the hamburger (controls collapse) menu does not stay at the top of the viewport; it appears under or behind the opponent hand area. Fix: ensure the header/controls bar has a fixed or sticky position above the board scroll area.

### Gap 6: Opponent area too narrow when only one opponent — should fill available width
status: failed
detail: When there is only one opponent the column is pinned to max-w-[160px] even though the rest of the horizontal space is empty. Fix: let the opponent column grow to fill available space up to the edge of the hamburger menu (e.g. flex-1 or a wider max-w) when there is only one opponent.
