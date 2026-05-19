# Project Research Summary

**Project:** Virtual Deck v1.5 Board Polish II
**Domain:** Real-time multiplayer card table — UI layout polish + bug fixes
**Researched:** 2026-05-19
**Confidence:** HIGH

## Executive Summary

Virtual Deck v1.5 is a pure polish sprint on an already-functional multiplayer card table. The stack is locked and complete — React 18.3.1, Vite, TypeScript, shadcn/base-ui, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, PartyKit, Vitest, and Playwright. No new npm packages are required. Every change in this milestone is a refactor of existing components using APIs, patterns, and Tailwind utilities already present in the codebase.

The recommended approach is to execute changes in ascending risk order: trivial single-line conditionals first (badge, label removal, face-toggle suppression), then small behavior-logic changes (empty spread strip, opponent-hand outline fix), and finally the broadest structural change last (BoardView layout band restructure for spread zone docking). This sequencing ensures the e2e drag-interaction suite catches regressions from the DOM restructure before merge, and keeps early phases independently verifiable without needing the full board layout to be stable.

The primary risk is the BoardView layout restructure (LAYOUT-05). Moving opponent columns from the header band to a new opponent band shifts the DOM ancestry of multiple dnd-kit droppables. Stale bounding-rect measurements and broken `useDndMonitor` subscriptions are the two failure modes. Both have clear prevention strategies: stable `key` props, e2e drag coverage post-restructure, and `MeasuringStrategy.Always` as a fallback. A secondary risk is the "original sort order" semantic decision for SORT-02 — the implementation path differs significantly depending on whether "original" means deal order or sort-cycle reset, and this must be decided before code is written.

---

## Stack

No changes needed. All 11 v1.5 items are implemented using existing libraries. Critical version facts: Tailwind v4 uses CSS custom properties for breakpoints (`--breakpoint-sm: 40rem` = 640px); no `tailwind.config.js` — config lives in `@theme {}` inside `globals.css`. Dynamic class-name construction (`'grid-cols-' + n`) is purged in production; all responsive grid classes must be literal strings.

**No new npm packages required.**

---

## Features

### P1 Must-Haves (feel "broken" without them)

| Feature | Backlog ID | Anti-pattern to avoid |
|---------|-----------|----------------------|
| Spread zones docked to owner hands | LAYOUT-05 | Rendering SpreadZone inside OpponentHand (creates dual dnd registration zones) |
| Empty spread strip visible at rest | LAYOUT-06 | Full-height empty box (wastes vertical space); full collapse (breaks drop discoverability) |
| Zero count badge hidden | POLISH-05 | Showing "0" badge — visual noise with no information payload |
| Hover-only opponent hand outline | CTRL-06 | Highlighting all valid drop zones at drag start (hover-only is correct per NN-Group/Trello) |

### Lower-Risk Polish (correct, but game works without)

| Feature | Backlog ID |
|---------|-----------|
| Tighten pile controls | POLISH-06 |
| Remove opponent spread face-toggle | CTRL-05 |
| Move grid face-toggle icon to label | CTRL-07 |
| Remove spread zone name labels | LAYOUT-07 |
| Fix grid mobile columns | BUG-02 |
| Fix select all button | BUG-01 (requires investigation) |
| Hand sort original order semantics | SORT-02 (requires decision) |

---

## Architecture

All changes contained in 5 components. No server changes. No new components. No `shared/types.ts` changes.

| Component | Changes |
|-----------|---------|
| `BoardView.tsx` | New opponent band (header becomes ControlsBar-only; opponents move above piles/grid) |
| `SpreadZone.tsx` | `useDndContext` for `isDragging`, empty-state CSS, controls gate fix (`\|\|` → `&&`), face-toggle removal when `interactive=false` |
| `PileZone.tsx` | Conditional badge render (`pile.cards.length > 0 && <Badge>`) |
| `GridZone.tsx` | Face-toggle moved to label row; `grid-cols-4 sm:grid-cols-7` breakpoint |
| `OpponentHand.tsx` | `dragIsActive` removed from border class (keep for `min-h`/`min-w` hit-target) |

**Suggested build groups (ascending risk):**
1. Zero-risk visual changes (POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07)
2. Drop target behavior fixes (CTRL-06, LAYOUT-06)
3. Bug fixes (BUG-02 mechanical; BUG-01 investigate first)
4. Sort semantics decision + validation (SORT-02 — decision required before code)
5. Layout restructure (LAYOUT-05 — last; broadest DOM change; e2e required post-merge)

---

## Critical Pitfalls

1. **Stale droppable rects after DOM restructure** — dnd-kit uses `ResizeObserver` (size changes only, not position). First drag after restructure may use stale coordinates. Fix: run full Playwright suite post-restructure; add `MeasuringStrategy.Always` if needed.

2. **`useDndMonitor` subscription lost on SpreadZone remount** — changing `key` prop during layout restructure causes React unmount/remount and subscription loss mid-drag. Fix: keep `key` stable (keyed by `spread.id`, not position).

3. **`dragIsActive` vs `isOver` bootstrap deadlock in OpponentHand** — using `isOver` alone to expand hit-target is circular (target too small to hover until expanded). Fix: keep `dragIsActive` for `min-h`/`min-w`; use `isOver` only for border color.

4. **CSS stacking context from new layout wrappers** — `transform`, `will-change`, `opacity < 1`, or `filter` on any new wrapper scopes child z-indexes and clips sortable-transform animations. Fix: prefer `overflow-x: clip` over `overflow-x: hidden`; don't add animation utilities to spread zone container wrappers.

5. **"Original order" shipped without decision** — "deal order" vs "sort-cycle reset" have divergent implementations (the former requires a new server field). Fix: document decision in phase plan before writing code.

---

## Open Decisions Required Before Implementation

| Decision | Item | Stakes |
|----------|------|--------|
| BUG-01 root cause | Select all button | Unknown; requires investigation before fix can be scoped |
| SORT-02 semantics | "Original order" = deal order or sort-cycle reset? | Deal order = new server field + reconnect handling; sort-cycle reset = 5-line UI change |
| Mobile grid col ≥ 4 overflow | CSS-only fix causes card visual reflow on mobile | Accept tradeoff explicitly or add server-side coordinate remapping |

---

## Confidence

**Overall: HIGH**

| Area | Level | Notes |
|------|-------|-------|
| Stack | HIGH | All version claims verified against installed `node_modules` source |
| Features | HIGH | Codebase inspection + Material Design 3 / Ant Design / NN-Group |
| Architecture | HIGH | Direct inspection of all 7 affected components |
| Pitfalls | HIGH | dnd-kit mechanics from installed CJS source + GitHub issues; CSS rules from MDN |

---

*Research completed: 2026-05-19*
*Ready for requirements: yes*
