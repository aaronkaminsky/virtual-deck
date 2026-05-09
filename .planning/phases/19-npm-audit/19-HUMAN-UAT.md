---
status: diagnosed
phase: 19-npm-audit
source: [19-VERIFICATION.md]
started: 2026-05-06T06:40:00Z
updated: 2026-05-08T15:00:00Z
---

## Current Test

Gap closure wave 7 required: sticky header still broken (CSS issue), plus new desktop vertical scroll gap.

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
expected: All three pile columns visible. Opponent hand strip (5 cards + Badge) fully unclipped at max-w-[200px]. Sticky header (opponent strip + hamburger) stays pinned to top of viewport when board is scrolled vertically. With exactly 1 opponent the column fills available row width. With 2+ opponents each column bounded to max-w-[200px]. No horizontal clipping on any zone.
result: partial — Gaps 4 (max-w-[200px]) and 6 (flex-1 single opponent) approved by user. Gap 5 still failed: hamburger scrolls with content — sticky top-0 z-20 does not stick inside flex-col overflow-y-auto root (known CSS quirk; requires layout restructure).

## Summary

total: 5
passed: 2
issues: 3
pending: 0
skipped: 0
blocked: 0
open_gaps: 2

## Gaps

### Gap 1: PileZone controls overflow at 375px
status: resolved
detail: Text labels replaced with Eye/EyeOff/Shuffle icon-only buttons (28x28px square). Fixed in Plan 04, commit 41abde2.

### Gap 2: Opponent hand too wide at 375px
status: resolved
detail: OpponentHand caps visible card-back strip at MAX_VISIBLE_OPPONENT_CARDS=5. Fixed in Plan 05, commit 2f14471.

### Gap 3: Opponent spread zone overflows viewport
status: resolved
detail: Per-opponent column wrapper in BoardView bounded at max-w-[200px] sm:max-w-none overflow-x-hidden. Fixed in Plans 05-06.

### Gap 4: Opponent column too narrow — last card and badge clipped
status: resolved
detail: Fixed in Plan 06 (commit 602e4c3): per-opponent column widened to max-w-[200px] when 2+ opponents. Approved by user 2026-05-08.

### Gap 5: Hamburger menu not fixed at top — scrolls with content
status: failed
detail: sticky top-0 z-20 on the header div inside a flex-col overflow-y-auto root does not stick on all browsers. Root cause: position:sticky fails when any ancestor has overflow other than visible; the root div has overflow-x-hidden which breaks sticky. Fix: restructure layout so the header is a flex-shrink-0 item above a flex-1 min-h-0 overflow-y-auto scrollable content area — no sticky needed.

### Gap 6: Opponent area too narrow when only one opponent — should fill available width
status: resolved
detail: Fixed in Plan 06 (commit 602e4c3): per-opponent column uses flex-1 max-w-none when opponentCount === 1. Approved by user 2026-05-08.

### Gap 7: Desktop layout requires vertical scrolling — all zones should fit viewport without scroll
status: failed
detail: At desktop widths (sm: and up), the board content (opponent spread zone + pile zone + my spread zone + hand zone) overflows the viewport height, requiring the user to scroll to see their hand. Fix: restructure the scrollable content area so spread zones share proportional space (flex-1 min-h-0) and the hand stays anchored at the bottom — no vertical scroll needed on desktop.
