---
status: complete
phase: 19-npm-audit
source: [19-VERIFICATION.md]
started: 2026-05-06T06:40:00Z
updated: 2026-05-11T00:00:00Z
---

## Current Test

[testing complete]

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

### 6. Plan 07 UAT — header anchoring + desktop no-scroll (Gap 5 + Gap 7)
expected: Header stays pinned at top on phone scroll (Gap 5). Desktop shows all 4 content regions without vertical scrollbar (Gap 7). No regressions to Gaps 1–4, 6.
result: partial — Gap 7 resolved (desktop shows all content without vertical scroll, confirmed). Gap 5 structurally resolved (header is flex-layout anchored above scroll container, not position:sticky). Three new gaps found: Gap 8 (hamburger not top-aligned in tall header), Gap 9 (card count badge clipped on mobile), Gap 10 (opponent column pushed off-screen when play area expands). Approved for Task 1; gaps 8–10 require gap plans.

### 7. Final visual pass — Plans 07-10 all in place (pending)
expected: All three pile columns visible. Badge inline in name row (not on card stack). With 2 opponents each column gets ~50% of header row. Hamburger pinned to top-right of header. Header anchored to top. No horizontal clipping anywhere.
result: passed — user confirmed: badge "(N)" inline next to name, hamburger top-right, spread zone Eye icon visible. Approved 2026-05-09.

### 8. Final visual pass — all 10 plans in place at 375x667
expected: Hamburger pinned to top-right. Opponent count inline in name row. Opponent columns ~50% each with 2 opponents. All pile columns visible. No horizontal clipping.
result: passed — user confirmed 2026-05-11.

## Summary

total: 8
passed: 5
issues: 3
pending: 0
skipped: 0
blocked: 0
open_gaps: 0

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
status: resolved
detail: Plan 07 (commit 789522d) removed sticky positioning and restructured BoardView so the header is a flex-shrink-0 sibling above a flex-1 min-h-0 inner scroll container. Header is now structurally anchored by flex layout — does not scroll with content. CSS spec §9.4.3 issue (sticky disabled by overflow-x-hidden ancestor) no longer applies because sticky is not used.

### Gap 6: Opponent area too narrow when only one opponent — should fill available width
status: resolved
detail: Fixed in Plan 06 (commit 602e4c3): per-opponent column uses flex-1 max-w-none when opponentCount === 1. Approved by user 2026-05-08.

### Gap 7: Desktop layout requires vertical scrolling — all zones should fit viewport without scroll
status: resolved
detail: Plan 07 (commit 789522d) introduced a flex-1 min-h-0 inner scroll container with sm:overflow-hidden. On desktop, center row uses flex-1 min-h-0 (proportional shrink) and mySpreadZone uses flex-shrink-0. All 4 content regions fit viewport with no vertical scrollbar. Confirmed by user UAT 2026-05-09.

### Gap 8: Hamburger button not top-aligned in tall header
status: resolved
detail: Plan 19-08 (commit 5902e86) added self-start to the ControlsBar wrapper div. Hamburger is now pinned to top-right of the header regardless of how tall the opponent strips grow. Code-verified 2026-05-09.

### Gap 9: Opponent card count badge clipped on mobile
status: resolved
detail: Plan 19-09 (commit 9efda66) moved card count from absolute-positioned overlay on the card stack to an inline Badge in the player name row. Count is always visible at any column width since the name row spans the full column. Code-verified 2026-05-09.

### Gap 10: Opponent column pushed off-screen when play area has many cards
status: resolved
detail: Plan 19-10 (commit 25646bf) changed opponents row from overflow-x-auto to overflow-hidden (no more involuntary scroll) and changed multi-opponent columns from max-w-[200px] to flex-1 min-w-0 (equal ~50% split for 2 opponents). Code-verified 2026-05-09. Note: code review flagged that at 3+ opponents each column may compress below card stack width — visual confirmation recommended.
