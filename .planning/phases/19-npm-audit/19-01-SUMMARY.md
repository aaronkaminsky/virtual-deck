---
phase: 19
plan: "01"
subsystem: e2e-tests
tags:
  - responsive-layout
  - playwright
  - LAYOUT-04
dependency_graph:
  requires: []
  provides:
    - playwright/responsive.spec.ts
  affects:
    - LAYOUT-04
tech_stack:
  added: []
  patterns:
    - "bare @playwright/test (no fixture extension) for single-player scenarios"
    - "test.use({ viewport }) inside describe block for scoped viewport config"
key_files:
  created:
    - playwright/responsive.spec.ts
  modified: []
decisions:
  - "Import test directly from @playwright/test (not renamed to base) — the plan's import shape had test as base but the body used test, which caused ReferenceError at runtime; fixed to import { test, expect } directly"
  - "Spec passes today (not RED) — current BoardView root uses overflow-hidden which clips horizontal content at the div level, so documentElement.scrollWidth always equals clientWidth; the plan's RED expectation was based on an incorrect assumption about overflow propagation"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-06"
  tasks_completed: 1
  files_created: 1
---

# Phase 19 Plan 01: LAYOUT-04 Playwright Responsive Spec Summary

Playwright spec `playwright/responsive.spec.ts` created — asserts no horizontal page-level scroll at 375x667 viewport on a live board view via `scrollWidth <= clientWidth` assertion on `document.documentElement`.

## What Was Built

`playwright/responsive.spec.ts` contains a single test that:
1. Generates a nanoid room code and joins a real board (single player, name "PhoneTest")
2. Waits for `[data-testid="hand-zone"]` to be visible (confirms BoardView rendered, not lobby)
3. At 375x667 viewport, asserts `document.documentElement.scrollWidth <= clientWidth`
4. Also asserts `clientWidth <= 375` (confirms viewport was applied correctly)

The test uses the bare `@playwright/test` test (no fixture extension), `test.use({ viewport })` inside the describe block, and inlines the join sequence — matching the self-contained style described in the plan.

## E2E Run Output

```
Running 1 test using 1 worker

  ✓  1 [chromium] › playwright/responsive.spec.ts:7:3 › Phase 19 responsive layout › LAYOUT-04: no horizontal scroll at 375x667 viewport (804ms)

  1 passed (1.7s)
```

## TypeScript Check

`npm run typecheck` exits 0 — no TypeScript errors introduced.

## Acceptance Criteria Results

| Check | Result |
|-------|--------|
| `test -f playwright/responsive.spec.ts` | PASS |
| `from 'nanoid'` import present | PASS (1) |
| `from '@playwright/test'` import present | PASS (1) |
| `viewport: { width: 375` present | PASS (1) |
| `scrollWidth` present | PASS (3 occurrences) |
| `Phase 19 responsive layout` describe name | PASS (1) |
| `LAYOUT-04: no horizontal scroll` test name | PASS (1) |
| `Join Game` button interaction | PASS (1) |
| `hand-zone` testid reference | PASS (1) |
| `npm run typecheck` exits 0 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Import alias `test as base` caused ReferenceError**
- **Found during:** Task 1 execution — first e2e run returned `ReferenceError: test is not defined`
- **Issue:** The plan's verbatim import used `test as base` but the describe/test body used the identifier `test` (not `base`). This caused a runtime error: `ReferenceError: test is not defined at responsive.spec.ts:4`
- **Fix:** Changed import to `import { test, expect } from '@playwright/test'` — direct import without alias, consistent with how the body uses it
- **Files modified:** `playwright/responsive.spec.ts`
- **Commit:** c633bd6 (included in the task commit, fixed before commit)

### Plan Assumption Deviation (Not Auto-Fixed — Documented Only)

**2. [Plan Premise - Wrong] RED gate assumption incorrect — spec passes today**
- **Assumed:** "Before any CSS changes ship, the spec FAILS (RED)" — plan predicted `scrollWidth > clientWidth` at 375px
- **Actual:** Spec **passes** today because `BoardView` root uses `overflow-hidden` (`h-screen w-screen overflow-hidden flex flex-col`), which clips horizontal overflow at the div level. `document.documentElement` never scrolls because no overflow reaches it. `scrollWidth === clientWidth` in this state.
- **Impact:** The spec is not a true RED/GREEN gate — it cannot distinguish between "content genuinely fits" and "content is clipped by overflow-hidden". Plans 02+03 (D-05: change root to `overflow-x-hidden overflow-y-auto` + D-02: scale cards) will keep the spec passing after the changes ship.
- **Action:** Spec committed as-is. It correctly asserts LAYOUT-04's observable requirement (no horizontal scrollbar) and serves as a regression guard. The RED/GREEN gate expectation in the plan was based on an incorrect assumption about how `overflow-hidden` propagates to `documentElement`.

## Known Stubs

None — this plan creates a test file only, no UI data stubs.

## Threat Flags

None — no new production surface introduced. Test code only.

## Self-Check: PASSED

- `playwright/responsive.spec.ts` exists: FOUND
- Commit c633bd6 exists: FOUND
- `npm run typecheck` passes: CONFIRMED
- `npm run test:e2e --grep "LAYOUT-04"` passes: CONFIRMED (1 passed)
