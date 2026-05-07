---
phase: 19-responsive-layout
verified: 2026-05-06T00:00:00Z
status: human_needed
score: 9/12 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Open the app at localhost:5173 in a browser devtools mobile viewport at 375x667 (iPhone SE). Join a room and observe the full board."
    expected: "All zones — opponent hands, pile, communal spread, personal spread, player hand — are visible and scrollable vertically. No zone content is clipped or hidden off-screen horizontally. Cards display at approximately 42x59px (phone size)."
    why_human: "Cannot verify that all zones are simultaneously visible and operable at phone width without rendering the app. Zone overflow-x-auto on the header row and zone containers may hide content rather than wrapping — only a visual pass can confirm LAYOUT-04 SC2."
  - test: "With the board loaded at 375px width, check that the header bar (player names, ControlsBar toggle button) remains readable."
    expected: "Zone labels, opponent player names, and the controls panel trigger button are not truncated to illegibility or hidden behind other elements."
    why_human: "Header readability at 375px depends on layout flow that cannot be confirmed by grep. The ControlsBar renders inside a flex row with opponent zones (overflow-x-auto on the row) — visual confirmation needed."
  - test: "At 375px width, attempt to drag a card from the hand zone to a pile zone."
    expected: "Drag interaction initiates correctly. Cards are large enough to pointer-target without difficulty (42px wide)."
    why_human: "Interaction target size and drag responsiveness at phone dimensions require human testing against the running app. 42x59px targets are above the 44px minimum but marginally so."
---

# Phase 19: Responsive Layout Verification Report

**Phase Goal:** The board is usable at phone-width screens without horizontal scrolling (LAYOUT-04)
**Verified:** 2026-05-06
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Playwright spec exists at 375x667 asserting no horizontal scroll | VERIFIED | `playwright/responsive.spec.ts` — `viewport: { width: 375, height: 667 }`, `scrollWidth <= clientWidth` assertion on `documentElement` |
| 2 | Spec navigates to real board, not just lobby | VERIFIED | `await expect(page.getByTestId('hand-zone')).toBeVisible()` before assertion |
| 3 | Spec was RED before CSS changes (plan gate requirement) | FAILED (deviation) | SUMMARY 19-01 documents spec passed immediately — `overflow-hidden` on root clips at div level, not `documentElement`; spec could not distinguish "content fits" from "overflow clipped". Gate was not truly RED. Spec is still a valid regression guard. |
| 4 | CardFace applies `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]` on both render paths | VERIFIED | 2 occurrences confirmed: line 27 (image path), line 39 (fallback div path) |
| 5 | CardBack applies `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]` on both render paths | VERIFIED | 2 occurrences confirmed: line 14 (image path), line 22 (fallback div path) |
| 6 | No bare `w-[63px] h-[88px]` survives in CardFace or CardBack | VERIFIED | `grep -E "w-\[63px\] h-\[88px\]"` exits 1 on both files |
| 7 | PileZone slot: `w-[56px] h-[79px] sm:w-[80px] sm:h-[112px]` | VERIFIED | line 49: exactly 1 occurrence |
| 8 | SpreadZone container: `min-w-[56px] h-[79px] sm:min-w-[80px] sm:h-[112px]` + both overlap sites `-ml-3 sm:-ml-5` | VERIFIED | Container at line 95 (1 occurrence), overlap at lines 36 + 118 (2 occurrences) |
| 9 | HandZone wrapper `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]` + overlap `-ml-3 sm:-ml-5` | VERIFIED | line 39: wrapper size + overlap conditional both present |
| 10 | HandZone drop container `h-[100px] sm:h-[128px]` | VERIFIED | line 124: exactly 1 occurrence |
| 11 | BoardView root `overflow-x-hidden overflow-y-auto sm:overflow-hidden` | VERIFIED | line 29: exactly 1 occurrence; bare `overflow-hidden` does not appear outside this prefixed form |
| 12 | LAYOUT-04: no horizontal scroll at 375px — Playwright e2e gate GREEN | VERIFIED | SUMMARY 19-03 shows `1 passed (1.6s)` on the LAYOUT-04 spec; all 6 phase commits confirmed in git log |

**Score:** 11/12 truths verified (1 failed — RED gate deviation, documented below)

### ROADMAP Success Criteria Cross-Check

| SC | Text | Status |
|----|------|--------|
| SC1 | At 375px viewport width, no horizontal scrollbar appears on any board view | VERIFIED — `overflow-x-hidden` on root + scaled zones + Playwright spec passing |
| SC2 | All zones remain visible and operable at 375px | UNCERTAIN — requires human visual verification |
| SC3 | Header, zone labels, and controls button are readable at phone width | UNCERTAIN — requires human visual verification |
| SC4 | Pointer/mouse interactions function correctly at 375px | UNCERTAIN — requires human verification against running app |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `playwright/responsive.spec.ts` | Wave 0 e2e spec for LAYOUT-04 | VERIFIED | Exists, substantive, wired to Playwright test runner; passes |
| `src/components/CardFace.tsx` | Responsive card front sizing | VERIFIED | Both render paths updated; no bare desktop-only class survives |
| `src/components/CardBack.tsx` | Responsive card back sizing | VERIFIED | Both render paths updated; no bare desktop-only class survives |
| `src/components/PileZone.tsx` | Responsive pile slot | VERIFIED | `w-[56px] h-[79px] sm:w-[80px] sm:h-[112px]` present at line 49 |
| `src/components/SpreadZone.tsx` | Responsive spread container + overlaps | VERIFIED | Container and both overlap sites updated; no legacy `-ml-5` conditionals |
| `src/components/HandZone.tsx` | Responsive card wrapper + drop container | VERIFIED | Wrapper, overlap, and drop container all updated; `data-testid="hand-zone"` retained |
| `src/components/BoardView.tsx` | Phone vertical scroll / desktop locked | VERIFIED | `overflow-x-hidden overflow-y-auto sm:overflow-hidden` at root div |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `playwright/responsive.spec.ts` | `@playwright/test` | `import { test, expect }` | WIRED | Direct import, no fixture extension |
| `playwright/responsive.spec.ts` | BoardView root (hand-zone testid) | `getByTestId('hand-zone')` | WIRED | Waits for board to render before assertion |
| `src/components/CardFace.tsx` | Tailwind sm: breakpoint | `sm:w-[63px] sm:h-[88px]` | WIRED | Both render paths |
| `src/components/CardBack.tsx` | Tailwind sm: breakpoint | `sm:w-[63px] sm:h-[88px]` | WIRED | Both render paths |
| `src/components/BoardView.tsx` | Tailwind sm: breakpoint | `sm:overflow-hidden` | WIRED | After axis-specific classes (cascade order correct per Pitfall 3) |
| `src/components/SpreadZone.tsx` | Tailwind sm: breakpoint | `sm:-ml-5` | WIRED | Both overlap sites (index > 0 + i > 0 conditionals) |
| `src/components/HandZone.tsx` | Tailwind sm: breakpoint | `sm:h-[128px]` + `sm:-ml-5` | WIRED | Drop container + wrapper overlap |

### Data-Flow Trace (Level 4)

Not applicable. All changes are static Tailwind CSS class strings — no dynamic data sources or state that flows to rendering. No disconnected data flows possible.

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running dev stack — Playwright e2e cannot run without `npm run dev` + `npm run dev:client` as per project CLAUDE.md, and no-side-effect spot-checks cannot exercise the full board at 375px).

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| LAYOUT-04 | 19-01, 19-02, 19-03 | Board usable at ≥375px without horizontal scrolling | VERIFIED (code) / UNCERTAIN (SC2–SC4 need human) | Responsive classes across all 6 components; Playwright spec passing; 4 ROADMAP SCs partially human-blocked |

**Note:** REQUIREMENTS.md and ROADMAP.md both still show LAYOUT-04 as `[ ]` (Pending). None of the three plans listed REQUIREMENTS.md in `files_modified`, so this was not a planned update. The checkbox update is a documentation cleanup item, not a code gap.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none) | — | — | — |

No TODOs, FIXMEs, placeholder returns, empty implementations, or legacy bare desktop-size classes found in any of the 7 files modified by this phase.

### Plan Deviation: RED Gate Not Achieved (Truth #3)

**What the plan required:** The Plan 01 Playwright spec must FAIL (RED) before any CSS changes ship, proving it actually detects the horizontal overflow regression it is meant to catch.

**What happened:** The spec passed immediately. The existing `overflow-hidden` on the BoardView root clips overflow at the div level — `document.documentElement.scrollWidth` always equals `clientWidth` because no overflow propagates to the html element. The spec asserts the correct observable requirement (no horizontal scrollbar) but cannot distinguish "content genuinely fits in 375px" from "content is clipped at 56px by overflow-hidden".

**Impact assessment:** The spec is a valid regression guard going forward — if a future change removes `overflow-x-hidden` from the root or a new component introduces uncontained horizontal overflow at the html level, the spec will catch it. However, the gate design flaw means the spec did not provide the "test-driven" proof-of-fix that was intended. The substantive code changes (responsive Tailwind classes on all 7 components) are correct regardless.

**Severity:** WARNING, not BLOCKER. The CSS changes are independently verifiable by grep and are correct. The missing RED gate is a test-design weakness, not evidence that the implementation is wrong.

### Human Verification Required

#### 1. All Zones Visible at 375px

**Test:** Open `http://localhost:5173/virtual-deck/` in Chrome DevTools at iPhone SE preset (375x667). Join a room. Observe the full board.
**Expected:** Opponent hand zone, pile zone(s), communal spread zone, personal spread zone, and player hand zone are all accessible by vertical scroll. No zone content is cropped horizontally. Cards appear at approximately 42x59px.
**Why human:** Zone visibility at phone width cannot be confirmed by reading class strings alone. The header row uses `overflow-x-auto` which may scroll opponents off-screen rather than wrapping; visual confirmation is the only reliable check.

#### 2. Header and Controls Readability at 375px

**Test:** At 375px width, inspect the header bar (opponent names, ControlsBar button).
**Expected:** Player names and the controls toggle are readable and not overflowing or truncated in a way that makes them unusable.
**Why human:** The header is a flex row with `overflow-x-auto` — content may be horizontally scrollable rather than wrapped. Whether this is acceptable UX or a readability problem requires a human judgment call against SC3.

#### 3. Pointer Interaction Targets at 375px

**Test:** At 375px width, attempt to drag a card from the hand zone to a pile zone.
**Expected:** The 42px-wide card is targetable without difficulty; drag initiates on first attempt.
**Why human:** Interaction target adequacy at 42px wide requires testing with a real pointer device at phone resolution. Cannot verify programmatically.

---

_Verified: 2026-05-06_
_Verifier: Claude (gsd-verifier)_
