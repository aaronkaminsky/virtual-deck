---
phase: 30
slug: layout-restructure-dock-spread-zones
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run test:e2e` |
| **Estimated runtime** | ~8s (unit) / ~60s (e2e, servers required) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds (unit only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | LAYOUT-05 | T-30-01 | MeasuringStrategy.Always re-measures droppable rects every drag — prevents stale-rect drops to wrong target | unit | `npm test -- --run` | ✅ | ✅ green |
| 30-01-02 | 01 | 1 | LAYOUT-05 | T-30-02, T-30-03 | Opponent spreads in flex-shrink-0 board-area row; interactive={false} blocks card flipping; header band exposes no SpreadZone | unit | `npm test -- --run` | ✅ | ✅ green |
| 30-02-01 | 02 | 2 | LAYOUT-05 | T-30-07, T-30-08, T-30-09 | Drag hand→spread lands correctly (hand 5→4, spread gains ≥1 card); spreadBox.y > headerBox.y+height proves DOM topology; zero duplicate-id console warnings guards useDndMonitor subscription loss | e2e | `npx playwright test --grep "spread zone dock: drag from hand to docked spread"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- vitest (226 tests, 31 files) and Playwright (15 e2e tests) were in place before phase execution
- No new test files or fixtures were needed for unit coverage
- One new test block appended to `playwright/game.spec.ts` (30-02-01) provides e2e coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Opponent spread column visually aligns with opponent hand column width in a live 2-player room | LAYOUT-05 | CSS flex alignment is only observable in a rendered browser; `rg` cannot verify visual column widths | Start `npm run dev` + `npm run dev:client`. Open a 2-player room. Deal 3-5 cards to each player. Confirm the opponent spread column has the same horizontal extent as the opponent hand column above it. Both are `flex-1` children of matching flex containers; the `w-7` spacer in the spread row aligns the spread region with the header's flex-1 region beside the ControlsBar trigger. |
| Extra vertical space grows between piles/grid row and spread row on tall viewports, not between hands and spreads | LAYOUT-05 | Flex growth distribution at unusual viewport heights requires a real browser | Resize browser to ~1280×1024. Confirm whitespace accumulates between the piles/grid row and the opponent spread row (not between an opponent hand and its spread, and not between the personal spread and HandZone). The `flex-shrink-0` spread rows stay anchored to their hands. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (unit suite runs in ~8s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only | 2 (visual layout checks) |

All requirement acceptance criteria for LAYOUT-05 verified green at audit time:
- `rg -c "MeasuringStrategy.Always" src/components/BoardDragLayer.tsx` → 1
- `rg -c "interactive={false}" src/components/BoardView.tsx` → 1
- `rg -c "allOpponentIds.map" src/components/BoardView.tsx` → 2
- `rg -c "spread zone dock:" playwright/game.spec.ts` → 1
- `rg -c "toBeGreaterThan(headerBox.y + headerBox.height)" playwright/game.spec.ts` → 1
- `rg -c "duplicate id|multiple elements with the same id" playwright/game.spec.ts` → 3
- `npm test -- --run` → 226 passed (31 files)
- `npm run typecheck` → exit 0
- User confirmed all 15 e2e tests pass (per VERIFICATION.md)
