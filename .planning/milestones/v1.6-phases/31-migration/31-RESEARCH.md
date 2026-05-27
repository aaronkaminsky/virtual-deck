# Phase 31: Migration - Research

**Researched:** 2026-05-23
**Domain:** React layout restructure + server-side pile cleanup (no new dependencies)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sidebar width is natural PileZone width — no fixed pixel width. Sidebar wraps snugly around the two PileZone components.
- **D-02:** Sidebar is fixed/sticky — always visible regardless of canvas scroll. Draw and discard piles must always be reachable.
- **D-03:** At narrow viewports (375px), sidebar stays visible at its natural width; canvas gets remaining space. Piles are never hidden or collapsed.
- **D-04:** Sidebar has a subtle 1px `border-right` in a muted color (use existing Tailwind token — `border-border` or `border-muted`). No background color contrast.
- **D-05:** Empty canvas renders as plain felt (`bg-background`), no decoration, no placeholder text, no dashed border.
- **D-06:** Canvas uses `flex-1` to fill all available vertical space in middle band. No fixed height.
- **D-07:** Server-side `'play'` pile (`region: "spread"`) is removed from the initial piles array. Clean break.
- **D-08:** No migration guard for existing room state. Cards in 'play' pile at deploy are silently lost.
- **D-09:** `GridZone.tsx` component is deleted. All grid-specific imports, action handlers (`MOVE_GRID_CARD`), and region checks in `BoardView.tsx` and `party/index.ts` are removed.
- **D-10:** Only the middle band changes. The existing 5-band flex-column structure is preserved. Opponent hands, opponent spreads, personal spread zone, and HandZone are untouched.
- **D-11:** The middle band drops `items-center` and switches to `items-start`. Canvas fills height via `flex-1`; sidebar piles align to the top of the band.
- **D-12:** Middle band becomes a horizontal flex row: `[sidebar] [canvas]`. Sidebar is `flex-shrink-0`; canvas is `flex-1 min-w-0`.

### Claude's Discretion

- Exact muted border color for sidebar divider — use existing Tailwind border token from dark felt theme (e.g. `border-border` or `border-muted`).
- Whether `overflow-hidden` or `overflow-auto` on the canvas shell in Phase 31 — canvas has no content yet; pick whichever matches Phase 32 scroll model cleanly.

### Deferred Ideas (OUT OF SCOPE)

- Full board restructure (sidebar spans full board height, canvas as dominant surface)
- Migration guard for existing room state
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGRATE-01 | Communal grid (region: "grid") fully replaced by free canvas; no dual-mode fallback | D-07 + D-09: remove 'play' pile entry from `defaultGameState`, delete `GridZone.tsx`, remove `MOVE_GRID_CARD` handler |
| MIGRATE-02 | Draw and discard piles in a fixed left sidebar, vertically stacked; free canvas occupies remaining horizontal space | D-11 + D-12: restructure middle band in `BoardView.tsx` |
| MIGRATE-03 | Reset table moves all canvas cards to the draw pile | RESET_TABLE handler already sweeps `pile.id !== "draw"` — removing the 'play' pile means there is no canvas pile to sweep; MIGRATE-03 is satisfied vacuously at Phase 31 (canvas cards don't exist yet). Phase 32 adds canvas cards with the new x/y/z model. |
</phase_requirements>

---

## Summary

Phase 31 is a structural migration with zero new dependencies. All changes are deletions and layout rewiring. The communal 'play' pile (currently `region: "spread"`, used as a 2×7 grid by `GridZone.tsx`) is removed from both server initialization and client rendering. The middle band of `BoardView.tsx` is restructured from a horizontal flex row of piles to a sidebar+canvas split.

The server change is surgical: remove one pile entry from `defaultGameState`, remove the `MOVE_GRID_CARD` case from `onMessage`, and remove all grid-position logic from `MOVE_CARD` and `PLAY_CARD_SET` that references `pile.id === 'play'`. The client change is equally surgical: delete `GridZone.tsx`, remove its import and render from `BoardView.tsx`, and replace the middle band HTML with the sidebar+canvas structure.

The primary planning risk is test cleanup: `tests/gridMove.test.ts` (7 tests) and `tests/gridZoneFaceToggle.test.ts` (6 tests) test the deleted behavior and will fail after the changes. Both files should be deleted. The Playwright spec `playwright/game.spec.ts` contains grid-specific assertions (`data-testid="grid-zone-play"`) across multiple test cases; these need to be removed or updated to reference the canvas/sidebar instead.

**Primary recommendation:** Delete GridZone and server grid code cleanly (no dual-mode), restructure the middle band in one PR, and delete/update affected tests in the same commit.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Middle band layout (sidebar + canvas) | Frontend (React) | — | Pure presentational restructure in `BoardView.tsx` |
| Sidebar visibility (sticky/fixed) | Frontend (React) | — | CSS positioning; no server involvement |
| Remove 'play' pile from initial state | API/Backend (PartyKit server) | — | `defaultGameState` in `party/index.ts` |
| Remove MOVE_GRID_CARD handler | API/Backend (PartyKit server) | — | `onMessage` switch case in `party/index.ts` |
| Remove gridPositions from types | Shared types | Frontend + Backend | `src/shared/types.ts` — used by both tiers |
| RESET_TABLE canvas sweep (Phase 31) | N/A | — | No canvas cards exist at Phase 31; MIGRATE-03 is vacuously satisfied |

---

## Standard Stack

No new packages are installed in this phase. All changes use existing stack.

### Relevant Existing Libraries

| Library | Role in This Phase |
|---------|--------------------|
| React 18 + Tailwind CSS | Middle band layout restructure in `BoardView.tsx` |
| `@dnd-kit/core` | `BoardDragLayer.tsx` has grid-cell collision detection that must be cleaned up |
| TypeScript | `src/shared/types.ts` — `gridPositions` field cleanup if removing entirely |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Player Browser
  └─ BoardDragLayer (DndContext)
       └─ BoardView
            ├─ ConnectionBanner
            ├─ Opponent hands + ControlsBar
            ├─ Opponent SpreadZones
            ├─ MIDDLE BAND (flex row)          ← PRIMARY CHANGE TARGET
            │    ├─ Sidebar (flex-shrink-0, border-right)
            │    │    ├─ PileZone (draw)
            │    │    └─ PileZone (discard)
            │    └─ Canvas shell (flex-1 min-w-0, bg-background)
            │         └─ [empty at Phase 31]
            ├─ Personal SpreadZone
            └─ HandZone

PartyKit Server (party/index.ts)
  └─ defaultGameState()
       └─ piles: [draw, discard]   ← 'play' pile REMOVED
  └─ onMessage()
       └─ MOVE_GRID_CARD case REMOVED
       └─ MOVE_CARD: grid-position assignment logic REMOVED
       └─ PLAY_CARD_SET: grid-position assignment logic REMOVED
```

### Recommended Project Structure

No new files or directories are introduced. Changes are:

```
src/components/
  BoardView.tsx        ← MODIFIED: middle band restructured, GridZone removed
  GridZone.tsx         ← DELETED
party/
  index.ts             ← MODIFIED: 'play' pile removed, MOVE_GRID_CARD removed,
                          gridPosition logic in MOVE_CARD / PLAY_CARD_SET removed
src/shared/
  types.ts             ← CONSIDER: gridPositions field — see pitfall below
tests/
  gridMove.test.ts          ← DELETED (tests deleted behavior)
  gridZoneFaceToggle.test.ts ← DELETED (tests deleted component)
playwright/
  game.spec.ts         ← MODIFIED: remove grid-specific assertions
```

### Pattern 1: Sidebar + Canvas Middle Band Structure

**What:** Replace the existing middle band flex row (piles side-by-side) with an explicit sidebar+canvas split.

**Current middle band (BoardView.tsx lines 86–100):**
```tsx
<div className="flex-1 min-h-0 flex items-center px-4 gap-4">
  {pilePiles.map((pile) => (
    <PileZone key={pile.id} pile={pile} ... />
  ))}
  {communalZone && (
    <div className="shrink-0">
      <GridZone pile={communalZone} ... />
    </div>
  )}
</div>
```

**Replacement (per D-11, D-12):**
```tsx
<div className="flex-1 min-h-0 flex items-start">
  {/* Sidebar */}
  <div className="flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border">
    {pilePiles.map((pile) => (
      <PileZone key={pile.id} pile={pile} ... />
    ))}
  </div>
  {/* Canvas shell */}
  <div className="flex-1 min-w-0 flex-1 bg-background overflow-hidden" />
</div>
```

Notes:
- `border-border` is the Tailwind token in use for the felt theme dividers — satisfies D-04. `border-muted` is the alternative at Claude's discretion.
- `overflow-hidden` on the canvas shell is preferred at Phase 31 (empty shell, no content) — Phase 32 will decide whether to change this when absolute-positioned canvas cards are added.
- `py-2 px-2` provides breathing room for the stacked pile zones; exact values can be tuned.
- The `items-start` on the outer div (D-11) ensures sidebar piles align to the top, not the center.

### Pattern 2: Server-Side Grid Code Removal

Three areas in `party/index.ts` must be cleaned up (verified by reading the source):

**1. `defaultGameState` — remove 'play' pile entry (lines 46–52):**
```typescript
// BEFORE
piles: [
  { id: "draw", ... },
  { id: "discard", ... },
  { id: "play", name: "Play Area", cards: [], faceUp: true, region: "spread", ownerId: null },
],

// AFTER (D-07)
piles: [
  { id: "draw", ... },
  { id: "discard", ... },
],
```

**2. `onMessage` MOVE_GRID_CARD case (lines 400–426) — delete entire case block.**

**3. Grid-position assignment in MOVE_CARD (lines 327–342) — delete the `if (destPile?.id === 'play' && ...)` block and the `if (fromZone === 'pile') { delete srcPile.gridPositions[cardId] }` cleanup.**

**4. Grid-position assignment in PLAY_CARD_SET (lines 737–764) — delete the `if (toZone === 'pile' && toId === 'play' && ...)` block and the gridPositions cleanup on source pile.**

**5. `onStart` migration guards (lines 140–179) — the existing migration guards for the 'play' pile (`Phase 14-GAP04` and `Phase 24`) can be removed as part of this cleanup (D-08: no migration guard needed going forward). However, removing them is optional; leaving them is harmless dead code. Recommendation: remove to keep `onStart` clean.**

### Pattern 3: BoardDragLayer Grid Collision Cleanup

`BoardDragLayer.tsx` has grid-specific collision detection logic (verified by reading the source):

**Lines 18–23 and 41–43 in the `customCollision` function:**
```typescript
// BEFORE
const gridCellContainers = args.droppableContainers.filter(
  (c) => String(c.id).startsWith('grid-cell-')
);
const cardContainers = args.droppableContainers.filter(
  (c) => String(c.id) !== 'hand' && !String(c.id).startsWith('opponent-hand-') &&
         !String(c.id).startsWith('pile-') && !String(c.id).startsWith('grid-cell-')
);
// ...
const gridCollisions = pointerWithin({ ...args, droppableContainers: gridCellContainers });
if (gridCollisions.length > 0) return gridCollisions;
```

These must be removed. The `cardContainers` filter's `!String(c.id).startsWith('grid-cell-')` clause is also removed. `gridCellContainers` variable disappears entirely.

**Lines 311–320 in `handleDragEnd` — the intra-grid multi-select MOVE_GRID_CARD dispatch:**
```typescript
} else if (selectedIds.size > 1 && selectionSource?.zoneId === 'play') {
  // ... sends MOVE_GRID_CARD for each selected card
}
```
This branch is unreachable once the grid is gone, but should be explicitly deleted for clarity.

### Anti-Patterns to Avoid

- **Leaving `MOVE_GRID_CARD` in `ClientAction` union type**: The type union in `src/shared/types.ts` has `MOVE_GRID_CARD` as a member. Removing the handler but leaving the type creates a phantom action the client could still emit. Remove both together.
- **Leaving `gridPositions` on the `Pile` / `ClientPile` types**: If `gridPositions` is no longer set anywhere, leaving it in types creates confusion for Phase 32 implementers. Recommended: remove from `Pile`, `ClientPile`, and `ClientAction` (both `MOVE_CARD` and `PLAY_CARD_SET` have `toRow?/toCol?` fields used only for the grid). However, note that removing `toRow?/toCol?` from `MOVE_CARD` and `PLAY_CARD_SET` could break tests that assert on those fields — verify against `tests/gridMove.test.ts` before removing.
- **Leaving `communalZone` variable in BoardView**: After removing `GridZone`, the `communalZone` derivation (line 29: `spreadPiles.find(p => p.id === 'play')`) becomes dead code. Remove it.
- **Leaving `pilePiles` filter as the sidebar source**: `pilePiles` is derived as `piles.filter(p => (p.region ?? 'pile') === 'pile')` which correctly returns draw and discard. This filter is reused as-is in the sidebar — no change needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sticky sidebar without scrolling canvas | Custom JS scroll tracking | CSS `position: sticky` or `flex-shrink-0` on parent that doesn't scroll | Phase 31 canvas is empty; the outer scroll container already has `overflow-x-hidden overflow-y-auto sm:overflow-hidden` — sidebar stays in the flex row naturally |
| Border token selection | Hardcoded hex color | `border-border` or `border-muted` Tailwind tokens | Existing felt theme uses these tokens consistently |

---

## Runtime State Inventory

> This is a migration phase.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | PartyKit Durable Storage persists `gameState` per room. Existing rooms may have a `'play'` pile entry with cards in it. | Per D-08: no migration guard. Cards in 'play' pile at deploy time are silently lost. `onStart` will no longer seed/validate the play pile; the migration guards for `Phase 14-GAP04` and `Phase 24` become dead code. |
| Live service config | No external service config references the grid or 'play' pile name. | None |
| OS-registered state | None | None — verified: no scheduled tasks reference grid or play pile names |
| Secrets/env vars | None | None — no secrets reference grid features |
| Build artifacts | None | None — no compiled binaries referencing grid names |

**Key migration implication:** Any room that currently has cards in the `'play'` pile will silently lose those cards on the next RESET_TABLE (they are on the server but never shown to clients after the client-side GridZone is removed). The 'play' pile entry will remain in persisted room state for existing rooms until they are reset. The server should not crash on its presence — the MOVE_GRID_CARD handler is simply absent, and the pile exists but is not rendered. This is acceptable per D-08.

---

## Common Pitfalls

### Pitfall 1: `MOVE_GRID_CARD` Left in `ClientAction` Type Union

**What goes wrong:** TypeScript compiles fine (type just becomes unreachable), but the dead type makes Phase 32 canvas type additions confusing.
**Why it happens:** Server handler and client type are in different files; easy to miss one.
**How to avoid:** Remove `MOVE_GRID_CARD` from `ClientAction` union in `src/shared/types.ts` in the same task as removing the server handler.
**Warning signs:** `tsc --noEmit` will not catch this — it's a valid but orphaned type member.

### Pitfall 2: `gridPositions` Field Left in Types While Removed from Server Logic

**What goes wrong:** `Pile.gridPositions` and `ClientPile.gridPositions` remain in `src/shared/types.ts`. Phase 32 then introduces `x/y/z` fields and there are now two competing position models in the type — future implementers are confused.
**Why it happens:** Type cleanup is often deferred.
**How to avoid:** Remove `gridPositions` from both `Pile` and `ClientPile` types in Phase 31. Also remove `toRow?/toCol?` optional fields from `MOVE_CARD` and `PLAY_CARD_SET` in `ClientAction`.
**Warning signs:** After removal, run `npm run typecheck` — any remaining references will be caught.

### Pitfall 3: Failing Tests Not Cleaned Up Before Commit

**What goes wrong:** Pre-commit hook runs `npm test`; `tests/gridMove.test.ts` and `tests/gridZoneFaceToggle.test.ts` fail because the behavior they test is deleted.
**Why it happens:** Test deletion is an easy step to forget.
**How to avoid:** Delete both test files in the same task as deleting `GridZone.tsx`.
**Warning signs:** `npm test` output shows failures in `gridMove.test.ts` or `gridZoneFaceToggle.test.ts`.

### Pitfall 4: Playwright Grid Assertions Not Updated

**What goes wrong:** Pre-push hook runs `npm run test:e2e`; `playwright/game.spec.ts` has multiple assertions on `data-testid="grid-zone-play"` that will fail once GridZone is removed.
**Why it happens:** E2E tests reference the testid of a deleted component.
**How to avoid:** Identify and remove all grid-specific test blocks in `playwright/game.spec.ts`. Preserve the remaining test structure.
**Warning signs:** `npm run test:e2e` fails with `Locator.toBeVisible` timeout on `grid-zone-play`.

### Pitfall 5: `customCollision` in BoardDragLayer Still References `grid-cell-` IDs

**What goes wrong:** No runtime error (there are no grid-cell droppables to match), but the dead filter code is confusing and adds noise to collision detection logic.
**Why it happens:** `BoardDragLayer.tsx` has explicit `startsWith('grid-cell-')` filters in `customCollision`.
**How to avoid:** Remove the `gridCellContainers` variable and the `gridCollisions` check block. Also clean up the `cardContainers` filter's `!String(c.id).startsWith('grid-cell-')` clause.
**Warning signs:** Grep for `grid-cell` after the migration — any remaining hits in non-test source files indicate incomplete cleanup.

### Pitfall 6: `viewFor` Still Passes `gridPositions` in ClientPile

**What goes wrong:** After removing `gridPositions` from types, `viewFor` in `party/index.ts` line 90 still has an explicit comment `// Phase 24: Pitfall 4 — must be explicit` passing `gridPositions`. This will be a TypeScript error if the type is removed, or dead code if the type is kept.
**Why it happens:** `viewFor` has an explicit `gridPositions: pile.gridPositions` line that must be removed in sync with the type change.
**How to avoid:** Remove `gridPositions` from the `viewFor` pile mapping in `party/index.ts` at the same time as removing the type field.
**Warning signs:** TypeScript error `Property 'gridPositions' does not exist on type 'ClientPile'` after type removal.

---

## Code Examples

### Middle Band HTML Skeleton

```tsx
// Source: BoardView.tsx — middle band replacement (per D-11, D-12)
<div className="flex-1 min-h-0 flex items-start">
  {/* Fixed sidebar */}
  <div className="flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border">
    {pilePiles.map((pile) => (
      <PileZone
        key={pile.id}
        pile={pile}
        sendAction={sendAction}
        draggingCardId={draggingCardId}
        shufflingPileIds={shufflingPileIds}
        onSelectAll={onSelectAll}
        selectedIds={selectedIds}
      />
    ))}
  </div>
  {/* Canvas shell (empty at Phase 31) */}
  <div className="flex-1 min-w-0 overflow-hidden bg-background" />
</div>
```

### defaultGameState After Cleanup

```typescript
// Source: party/index.ts — defaultGameState (after 'play' pile removal per D-07)
export function defaultGameState(roomId: string): GameState {
  return {
    roomId,
    phase: "lobby",
    players: [],
    hands: {},
    piles: [
      { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false, region: "pile", ownerId: null },
      { id: "discard", name: "Discard", cards: [], faceUp: true, region: "pile", ownerId: null },
    ],
    undoSnapshots: [],
  };
}
```

### ClientAction Union After Cleanup

```typescript
// Source: src/shared/types.ts — MOVE_GRID_CARD removed from union
export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  // toRow/toCol fields also removed from MOVE_CARD and PLAY_CARD_SET
  | { type: "REORDER_HAND"; orderedCardIds: string[]; skipSnapshot?: boolean }
  | { type: "REORDER_PILE_SPREAD"; pileId: string; orderedCardIds: string[] }
  // ... (rest unchanged)
  // MOVE_GRID_CARD line deleted entirely
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Communal 2×7 fixed grid | Fixed left sidebar + free canvas area | Phase 31 | Removes region: "spread" / gridPositions model; Phase 32 adds x/y/z canvas model |
| `region: "spread"` on 'play' pile | No communal pile at all | Phase 31 | Canvas cards will use a new data model (Phase 32) |

**Deprecated/outdated after Phase 31:**
- `GridZone.tsx`: Deleted entirely
- `MOVE_GRID_CARD` action: Removed from server and type system
- `gridPositions` on `Pile`/`ClientPile`: Removed from types
- `grid-cell-` collision detection in `BoardDragLayer.tsx`: Removed
- `onStart` migration guards for 'play' pile (Phase 14-GAP04 + Phase 24): Become dead code (remove)

---

## Open Questions

1. **`toRow?/toCol?` on `MOVE_CARD` and `PLAY_CARD_SET` in `ClientAction`**
   - What we know: These optional fields were added in Phase 24 exclusively for the grid. They are checked in server code that is being deleted.
   - What's unclear: Are any tests asserting these fields exist on the type (not just testing the behavior)? Quick scan of gridMove.test.ts shows behavioral tests, not type-level assertions — likely safe to remove.
   - Recommendation: Remove `toRow?/toCol?` from both action types. Run `npm run typecheck` to confirm zero errors.

2. **`onStart` migration guards for 'play' pile — delete or leave?**
   - What we know: The guards at lines 140–179 handle very old room states from phases 14 and 24. After Phase 31 deploy, rooms that load from persisted storage may still have a 'play' pile; the migration guard would normalize it but the result is never displayed. Removing the guard means those rooms silently keep the orphaned pile in storage.
   - Recommendation: Remove the guards as part of D-09 cleanup for a clean `onStart`. The worst case is orphaned entries in Durable Storage that are never rendered. Since D-08 accepts silent loss, this is acceptable.

3. **Canvas shell `overflow-hidden` vs `overflow-auto`**
   - What we know: At Phase 31, the canvas is empty; neither setting causes visible behavior. Phase 32 will add absolutely positioned cards.
   - Recommendation: Use `overflow-hidden` at Phase 31. Phase 32 will need `overflow: visible` or a specific scroll container approach — making that decision at Phase 32 with full context is cleaner than committing to `overflow-auto` now.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies identified. This phase is code/config changes only.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (config: `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGRATE-01 | `defaultGameState` has no 'play' pile | unit | `npm test -- tests/resetTable.test.ts` | ✅ (resetTable.test.ts can be extended) |
| MIGRATE-01 | `MOVE_GRID_CARD` is rejected or absent | unit | new test in `tests/gridRemoval.test.ts` | ❌ Wave 0 |
| MIGRATE-01 | No `GridZone` import in `BoardView.tsx` | static/typecheck | `npm run typecheck` | ✅ |
| MIGRATE-02 | Draw + discard piles render in sidebar | manual/visual | Visual verification | — |
| MIGRATE-02 | Canvas shell renders to the right of sidebar | manual/visual | Visual verification | — |
| MIGRATE-03 | RESET_TABLE sweeps all non-draw piles (draw+discard only) | unit | `npm test -- tests/resetTable.test.ts` | ✅ (existing test already passes; no 'play' pile means nothing new to sweep) |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + `npm run typecheck` clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/gridRemoval.test.ts` — verifies MIGRATE-01: `defaultGameState` has no 'play' pile, and unknown action type `MOVE_GRID_CARD` does not crash the server (graceful unknown-action handling; the switch statement has no `default` case but also no crash on unknown type — confirm behavior).

*(Existing `tests/gridMove.test.ts` and `tests/gridZoneFaceToggle.test.ts` are DELETED, not updated — they test behavior that no longer exists.)*

---

## Security Domain

ASVS: No new input validation surface. The only change to server action handling is deletion of `MOVE_GRID_CARD`. No authentication or authorization surface changes. Existing V4 access control (senderToken guards) and V5 input validation on MOVE_CARD/PLAY_CARD_SET are unchanged.

---

## Sources

### Primary (HIGH confidence)

- `src/components/BoardView.tsx` — read directly; current middle band structure at lines 86–100
- `src/components/GridZone.tsx` — read directly; 166-line component to be deleted; all imports identified
- `party/index.ts` — read directly; all grid-specific code locations identified and documented
- `src/shared/types.ts` — read directly; `gridPositions`, `MOVE_GRID_CARD`, `toRow/toCol` fields identified
- `src/components/BoardDragLayer.tsx` — read directly; `grid-cell-` collision detection at lines 18–23, 41–43, 311–320
- `tests/gridMove.test.ts` — read directly; 7 tests covering deleted behavior
- `tests/gridZoneFaceToggle.test.ts` — read directly; 6 tests covering deleted component
- `tests/resetTable.test.ts` — read directly; existing RESET_TABLE tests remain valid after migration
- `.planning/phases/31-migration/31-CONTEXT.md` — decisions D-01 through D-12

### Secondary (MEDIUM confidence)

- `playwright/game.spec.ts` — grep for `grid-zone-play` confirms ~8 test locations that require cleanup

---

## Metadata

**Confidence breakdown:**
- Change scope: HIGH — full source code read; every affected file identified and documented
- Layout pattern: HIGH — derived from existing code patterns in same codebase
- Pitfalls: HIGH — all identified by direct inspection of source, not inference
- Test impact: HIGH — all affected test files identified and read

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (stable codebase)
