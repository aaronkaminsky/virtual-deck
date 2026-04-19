---
plan: "10-03"
phase: "10-shuffle-before-deal"
status: complete
completed: 2026-04-18
---

## Summary

Implemented client-side card-fan animation triggered by the `PILE_SHUFFLED` server event, visible simultaneously to all connected players.

## What Was Built

- `usePartySocket.ts`: Added `shufflingPileIds: Set<string>` state. `PILE_SHUFFLED` handler adds `pileId` to the set, then removes it after 650ms via `setTimeout`. Hook returns `shufflingPileIds`.
- `PileZone.tsx`: Accepts `shufflingPileIds?: Set<string>` prop (defaults to empty set). Derives `isShuffling = shufflingPileIds.has(pile.id)`. When `isShuffling` is true, renders 5 ghost card divs with staggered `pile-fan-spread` animation.
- `src/globals.css`: Added `@keyframes pile-fan-spread` — spread at 40% keyframe using CSS custom properties `--fan-x` and `--fan-r`, collapse back to center at 100% with `opacity: 0`.
- Prop-drilled `shufflingPileIds` through `App.tsx` → `BoardDragLayer` → `BoardView` → `PileZone`.

## Key Files

- `src/hooks/usePartySocket.ts` — `shufflingPileIds` state + `PILE_SHUFFLED` handler
- `src/components/PileZone.tsx` — ghost fan divs rendered when `isShuffling`
- `src/globals.css` — `@keyframes pile-fan-spread`
- `src/App.tsx`, `src/components/BoardDragLayer.tsx`, `src/components/BoardView.tsx` — prop threading

## Deviations

None. Animation visually verified by user in two-tab test (checkpoint approved).

## Self-Check: PASSED

- `usePartySocket` returns `shufflingPileIds` ✓
- `PileZone` renders ghost fan divs when `shufflingPileIds.has(pile.id)` ✓
- `@keyframes pile-fan-spread` present in `src/globals.css` ✓
- Animation verified in two-tab test by user ✓
- All 107 tests pass ✓
