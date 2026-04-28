---
phase: 15
plan: "03"
subsystem: e2e-tests
tags: [playwright, e2e, multi-card, regression-fix]
requires: [15-01, 15-02]
provides: [PLAY-03-e2e-coverage]
affects: [playwright/game.spec.ts]
tech_stack:
  added: []
  patterns: [playwright-aria-pressed, css-not-has-selector, dnd-kit-mouse-drag]
key_files:
  modified:
    - playwright/game.spec.ts
decisions:
  - "Use :not(:has([role=\"button\"])) to count leaf card elements in spread zone — each card renders two nested role=button divs (useSortable outer + useDraggable inner)"
  - "Selection toggle test uses firstCardWrapper.click() — Playwright plain click stays below dnd-kit PointerSensor 8px distance threshold"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_modified: 1
---

# Phase 15 Plan 03: E2E Tests (Stale Testid Fix + New Phase 15 Tests) Summary

**One-liner:** Fixed stale `spread-zone-spread-communal` testid and added two new Playwright tests covering selection toggle visual state and multi-card set play with 2-player real-time sync verification.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix stale spread-zone-spread-communal testid | 41af720 | playwright/game.spec.ts |
| 2 | Add selection toggle e2e test | 2465921 | playwright/game.spec.ts |
| 3 | Add multi-card set play e2e test | 3f12867 | playwright/game.spec.ts |

## What Was Built

### Task 1: Testid Fix

The Phase 14 `spread zone visibility` test used `spread-zone-spread-communal` which does not match any rendered element. The communal pile has `id: "play"` in `defaultGameState`, so `SpreadZone` renders `data-testid="spread-zone-play"`.

Lines changed (before → after):
- Line ~123: `getByTestId('spread-zone-spread-communal')` → `getByTestId('spread-zone-play')`
- Line ~124: same fix for p2
- Lines ~121-128: comments corrected to explain the testid scheme (play pile = spread-zone-play; personal piles = spread-zone-spread-{playerId})
- Line ~135: strict-presence comment updated to reference spread-zone-play

The `[data-testid^="spread-zone-spread-"]` prefix selector in the personal zone count assertions was intentionally preserved — it correctly matches only personal zones (which have pile IDs like `spread-{playerId}`).

### Task 2: Selection Toggle Test

Test name: `selection toggle: clicking hand card sets aria-pressed; clicking again clears it`
Grep filter: `npx playwright test --grep "selection toggle" --project=chromium`

The `aria-pressed` attribute is set on the inner dnd-kit wrapper `<div>` inside `SortableHandCard` (`aria-pressed={isSelected}`). All hand cards carry the attribute (false when unselected, true when selected). The test:
1. Deals 5 cards to P1
2. Asserts 0 `[aria-pressed="true"]` initially
3. Calls `firstCardWrapper.click()` — locator is `handZone.locator('[aria-pressed]').first()`
4. Asserts 1 `[aria-pressed="true"]`
5. Clicks same card again
6. Asserts 0 `[aria-pressed="true"]`

Runtime: 1.8s

### Task 3: Multi-Card Set Play Test

Test name: `multi-card set play: select 2 cards, drag to communal zone, both players see them`
Grep filter: `npx playwright test --grep "multi-card set play" --project=chromium`

Sequence:
1. Deal 5 cards to P1
2. Click card0 and card1 — assert 2 `[aria-pressed="true"]`
3. Drag card0 to `spread-zone-play` via `mouse.move/down/move(steps:15)/up`
4. Assert P1 hand has 3 cards (`[aria-pressed]` count = 3)
5. Assert P1's communal zone has 2 cards
6. Assert P2's communal zone has 2 cards (real-time PartyKit broadcast)
7. Assert P1 selection cleared (`[aria-pressed="true"]` count = 0)

Runtime: 2.3s

**Card locator in spread zone:** Each card in `SpreadZone` renders two nested `[role="button"]` elements — one from `useSortable` (the outer `SortableSpreadCard` div) and one from `useDraggable` (the inner `DraggableCard` div). Using plain `[role="button"]` returned 4 instead of 2. Fixed by using `[role="button"]:not(:has([role="button"]))` which selects only the innermost (leaf) role="button" per card.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spread zone card locator matched nested role=button elements**
- **Found during:** Task 3 test run
- **Issue:** Plan specified `communal.locator('[role="button"]')` for counting cards in spread zone. Each card renders two nested `[role="button"]` divs (useSortable outer + useDraggable inner), so 2 played cards produced count=4
- **Fix:** Changed to `[role="button"]:not(:has([role="button"]))` to select only the innermost role=button per card, giving correct count=2 for 2 cards
- **Files modified:** playwright/game.spec.ts (Tasks 3 locator, both p1Cards and p2Cards)
- **Commit:** 3f12867

## E2E Suite Results

```
8 tests passed (15.4s)
  ✓ state sync: P1 action visible to P2 in real time (2.2s)
  ✓ deal cards: cards distributed to both hands (1.8s)
  ✓ pass card: P1 hand to P2 hand (2.1s)
  ✓ reset table: all cards return to draw pile (2.0s)
  ✓ hand privacy: P2 sees count not card IDs (1.8s)
  ✓ spread zone visibility: both players see communal + personal zones (773ms)
  ✓ selection toggle: clicking hand card sets aria-pressed; clicking again clears it (1.8s)
  ✓ multi-card set play: select 2 cards, drag to communal zone, both players see them (2.3s)
```

New tests total runtime: 4.1s (well under the 60s target from VALIDATION.md).

Unit suite: 135 tests passed.

## Threat Flags

None. Test-only file changes; no new network endpoints or auth paths introduced.

## Self-Check: PASSED

- playwright/game.spec.ts exists and has 215 lines
- Commit 41af720 exists (Task 1 fix)
- Commit 2465921 exists (Task 2 selection toggle test)
- Commit 3f12867 exists (Task 3 multi-card set play test)
- `grep -c 'spread-zone-spread-communal' playwright/game.spec.ts` = 0
- `npx playwright test --project=chromium` = 8 passed
- `npm test` = 135 passed
- `grep -c 'waitForTimeout' playwright/game.spec.ts` = 0
