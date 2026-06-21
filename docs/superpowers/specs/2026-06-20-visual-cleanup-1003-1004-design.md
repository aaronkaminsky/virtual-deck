# Visual Cleanup (Phases 1003 + 1004) — Design

**Date:** 2026-06-20
**Status:** Approved
**Scope:** Two layout-only fixes in the board UI. No state, server, message, or behavior changes.

## Background

Two pending backlog items describe visual inconsistencies in the board layout:

- **1003 — Opponent spread zone width:** the top (opponent) spread zone stops short of the viewport's right edge, while the bottom (player) spread zone correctly reaches it. Make the opponent spread zone span the full width to match the player zone.
- **1004 — Canvas left-edge spacing & rail divider:** the green canvas area is inset asymmetrically (smaller gap on the left, against the rail, than on the right), and the canvas's rounded top-left corner sitting so close to the rail's vertical divider creates a small triangle artifact. Even out the left gap to match the right, and drop the vertical rail divider line.

## Root Cause

All three symptoms live in `src/components/BoardView.tsx`:

- **1003:** The opponent-spread row (`BoardView.tsx:90-112`) ends with a 28px right-edge spacer:
  `<div className="w-7 self-start shrink-0 pointer-events-none" aria-hidden="true" />` (`:111`).
  The bottom player-spread row (`:125-142`) has no such spacer — just `px-4`. The spacer is what
  makes the opponent zone stop ~28px short of where the bottom zone ends.

- **1004:** The main content row (`:114`) is `flex items-start mt-1 pr-2` — 8px right padding.
  Inside it, the left rail (`:115`) carries `bg-card border-r border-border` (the vertical divider
  line), and the canvas wrapper (`:120`) sits flush against the rail with no left gap. The
  `CanvasZone` outer element is `rounded-2xl`; its rounded top-left corner against the rail's
  straight `border-r` line is what produces the triangle artifact. Net: left gap = 0, right gap = 8px.

## Design

### 1003 — Opponent spread spans full width
Remove the `w-7` right-edge spacer at `BoardView.tsx:111`. The opponent-spread row then ends at its
`px-4` padding, matching the bottom player-spread row's right edge.

### 1004 — Even canvas gap + drop rail divider
1. Remove `border-r border-border` from the left rail (`BoardView.tsx:115`), eliminating the vertical
   divider line and therefore the triangle artifact against the canvas's rounded corner.
2. Add an 8px left gap on the canvas equal to the existing 8px right gap. Apply `gap-2` to the main
   content row (`:114`) so the gap between the rail and the canvas matches `pr-2`. Net: left gap = right
   gap = 8px.

## Risks

- The `w-7` spacer or the rail's `border-r` could be referenced by an e2e selector or relied on for a
  drop-target bounding rect. **Mitigation:** grep the test suite and component tree for `w-7` and
  `border-r` usage before removing; confirm no test asserts on the divider or the spacer.

## Verification

- `npm run typecheck` — clean.
- `npm test` — existing 405 unit tests stay green (layout-only change; no logic tests affected).
- `npm run test:e2e` — existing e2e suite stays green (drag/drop targets unchanged).
- Visual confirmation in-browser: opponent spread reaches the right edge symmetric with the bottom
  spread; canvas has equal left/right inset; no divider line; no triangle artifact.

## Out of Scope

Explicitly **not** included (kept separate per scope decision):
- `999.49` — Chrome-on-PC click-to-drag canvas bug (behavioral bug, separate debugging workflow).
- `1002` — Lobby redesign (larger redesign).
- `1000` — Selection-persistence rethink (behavior decision).
