# Phase 30: Layout Restructure — Dock Spread Zones - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 30-layout-restructure-dock-spread-zones
**Areas discussed:** Spread alignment model, Personal spread spacing, Vertical space distribution, dnd-kit stale rect strategy

---

## Spread alignment model

| Option | Description | Selected |
|--------|-------------|----------|
| Same flex model + ControlsBar spacer | Board area gets a spread-row div with same flex structure as header; spacer replaces ControlsBar; simpler than CSS grid | ✓ |
| CSS grid spanning header + board | Full CSS grid with defined columns shared between header and board; pixel-perfect alignment but larger refactor | |

**Follow-up: Spread row vertical gap:**

| Option | Description | Selected |
|--------|-------------|----------|
| No gap (py-0) — flush dock | Spreads dock flush to header bottom; strongest spatial pairing | ✓ |
| Small gap (py-1 or py-2) | Slight breathing room between header and spread zones | |

**Follow-up: Empty opponent columns:**

| Option | Description | Selected |
|--------|-------------|----------|
| Always render column, show nothing if no spread | Consistent column widths; no layout shift when first card played | ✓ |
| Only render if spread exists | Cleaner when no cards played; alignment shifts on first card | |

**Notes:** User requested visual mockups (previews) for the gap question before selecting. Flush dock selected for strongest visual hand-spread pairing.

---

## Personal spread spacing

| Option | Description | Selected |
|--------|-------------|----------|
| Already correct — py-1 is fine | 4px gap imperceptible on felt; no change | ✓ |
| Remove py-1 — truly flush, zero gap | Drop py-1 from wrapper | |
| Claude's discretion | Adjust to look right visually | |

**User's choice:** py-1 is fine as-is
**Notes:** No change needed. The current wrapper satisfies "flush above hand with no visible separator."

---

## Vertical space distribution

| Option | Description | Selected |
|--------|-------------|----------|
| Flex-grow on piles/grid row only | Piles/grid gets flex-1; opp spreads + personal spread + hand are flex-shrink-0; space grows in middle | ✓ |
| items-center on whole board area | Entire board area vertically centered; space splits above and below all zones | |

**User's choice:** Flex-grow on piles/grid row only
**Notes:** Directly satisfies LAYOUT-05 success criteria #3 ("extra vertical space grows between piles/grid area and spread zones, not between spread zones and their hands").

---

## dnd-kit stale rect strategy

| Option | Description | Selected |
|--------|-------------|----------|
| MeasuringStrategy.Always preemptively | Re-measure on every render; negligible cost at this scale | ✓ |
| Only add if e2e tests expose drift | Add after Playwright failures confirm the problem | |

**Follow-up: useDndMonitor subscription loss:**

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated e2e drag-via-monitor test | Explicit Playwright test for subscription integrity post-restructure | ✓ |
| Covered by general e2e drag coverage | Implicit coverage through general drag tests | |

**User's choice:** MeasuringStrategy.Always preemptively + dedicated e2e test
**Notes:** User asked for expected performance degradation before deciding. Clarified that overhead is < 1ms per frame at 2–4 players with ~15 drop zones — imperceptible. User accepted this and chose the preemptive approach. The dedicated useDndMonitor e2e test guards the second identified failure mode explicitly.

---

## Claude's Discretion

- Exact Tailwind class tokens for the spacer element (must visually match ControlsBar width)
- Whether to use `invisible` vs `aria-hidden + pointer-events-none` for the spacer
- Exact Playwright selector for the drag-via-monitor e2e test

## Deferred Ideas

None — discussion stayed within phase scope.
