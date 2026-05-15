---
plan: 17-02
phase: 17
status: complete
checkpoint: approved
---

## Summary

Restructured `BoardView.tsx` into the five-band vertical layout and added an optional `className` prop to `SpreadZone` for width pass-through. Human visual verification at 1080p approved.

## What Was Built

### Task 2.1 — SpreadZone optional className prop (`a87d418`)
Extended `SpreadZoneProps` interface with `className?: string`. The prop is forwarded as the last argument to the inner spread container's `cn(...)` call so consumer-supplied utilities (e.g. `w-full`) win via tailwind-merge's last-wins resolution. All existing call sites pass no `className` → no behavioral change.

### Task 2.2 — BoardView five-band restructure + e2e tests (`04e167a`, `586ac47`)
**Before (Row 2 + Row 3):**
- Row 2: `flex-1 flex items-center justify-center gap-6 px-4` — piles only
- Row 3: `flex items-start gap-4 px-4 py-2 bg-card` — communal + personal spread zones side-by-side

**After (Band 2 + Band 3):**
- Band 2: `flex-1 flex items-center px-4 gap-4` — piles + communal zone in `flex-1 min-w-0` wrapper with `className="w-full"` passed to SpreadZone
- Band 3: `bg-card px-4 py-2` — player personal spread zone only

Two new e2e tests added to `playwright/game.spec.ts`:
- `communal zone position: rendered in center row band, not bottom bar` — bounding box assertions confirming communal above personal, communal above hand, communal width > 160px
- `no horizontal scrollbar on board at 1280×720` — scrollWidth ≤ clientWidth check

### Task 2.3 — Human visual verification ✓ approved
All seven LAYOUT-01/LAYOUT-02 items confirmed at 1080p. Spread zone intra-zone sorting not yet functional — confirmed as upcoming backlog item, not a Phase 17 requirement.

**User gap feedback (logged for future phases):**
- Controls (copy link, undo, deal, reset) should be top-right aligned, not vertically centered in header band
- Spread zones + draw/discard/play area should share the same lighter "table" background; player/opponent hands on the darker "off-table" color
- Empty spread zones should start smaller (1.5-2× card pile width) and expand when cards are added
- Spread zone labels should be removed (redundant with visual proximity to hands)
- Opponent spread zone should use smaller card size (matching opponent hand size)
- Users should not be able to remove or re-order cards in opponent spread areas — only append (PUT at end)
- Player and opponent spread zones should have no labels

## Files Modified
- `src/components/SpreadZone.tsx` — optional `className` prop on inner spread container
- `src/components/BoardView.tsx` — five-band layout restructure
- `playwright/game.spec.ts` — two new LAYOUT-01/LAYOUT-02 regression tests

## Files NOT Modified (as required)
- `src/components/HandZone.tsx` — zero changes
- `src/components/BoardDragLayer.tsx` — zero changes
- `src/components/PileZone.tsx` — zero changes

## Test Results
- Unit tests: 135/135 passed
- TypeScript: pre-existing error in `BoardDragLayer.tsx:88` (out of scope per plan)
- e2e: new layout tests require running local stack (two-terminal: `npm run dev` + `npm run dev:client`)

## Self-Check: PASSED
