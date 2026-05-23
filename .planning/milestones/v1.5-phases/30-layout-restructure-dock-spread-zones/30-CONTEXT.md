# Phase 30: Layout Restructure — Dock Spread Zones - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Move opponent spread zones out of the `bg-card` header band and into the top of the board area, while keeping them visually anchored directly below their respective opponent hands. Personal spread zone remains flush above the local player's hand. Add `MeasuringStrategy.Always` to DndContext and add a dedicated Playwright e2e test for `useDndMonitor` subscription integrity post-restructure.

**In scope:** LAYOUT-05 — opponent spreads docked to board area below their hands
**Out of scope:** Any change to spread zone content, card flip behavior, personal spread interactive controls, or any other v1.5 requirements not listed above

</domain>

<decisions>
## Implementation Decisions

### Spread alignment model

- **D-01:** Use the **same flex model + ControlsBar spacer** approach — not a CSS grid rewrite. The board area gets a new "opponent spreads row" div with the same `flex items-start gap-4 px-4` structure as the header's opponent columns. A width-matching invisible spacer replaces the ControlsBar in that row so the flex-1 opponent columns align with those in the header.
- **D-02:** **No gap between the header band and the spread row** — the spread row has `py-0` (or no vertical padding). Spreads dock flush to the bottom edge of the header so the visual "hand above spread" pairing is tight.
- **D-03:** **Always render each opponent's column** in the spread row, even when that opponent has no spread zone. An empty column (renders nothing) keeps flex-1 widths consistent and prevents layout shift when the first card is played to a spread.

### Personal spread spacing

- **D-04:** The existing `px-4 py-1` wrapper around `mySpreadZone` is **correct as-is** — do not touch it. The 4px gap is imperceptible on the felt and satisfies "flush above hand with no visible separator."

### Vertical space distribution

- **D-05:** On tall screens, extra vertical space grows in the **piles/grid row only**. The board area (`flex-1 flex-col`) contains:
  1. Opponent spreads row — `flex-shrink-0`
  2. Piles + grid row — `flex-1` (this is the only row that grows)
  3. Personal spread — `flex-shrink-0`
  4. HandZone — `flex-shrink-0`
- **D-06:** Opponent spread row and personal spread + hand are `flex-shrink-0`. Space never pushes spreads away from their hands.

### dnd-kit measurement strategy

- **D-07:** Add `MeasuringStrategy.Always` to the `DndContext` `measuring` config **preemptively** before testing. At 2–4 players with ~15 droppable zones, the overhead is < 1ms per frame — imperceptible. This eliminates stale droppable rect drift after the DOM restructure without waiting for e2e failures.
- **D-08:** Add a **dedicated Playwright e2e test** that drags a card via `useDndMonitor` in the post-restructure layout and verifies the action lands correctly. This explicitly guards against `useDndMonitor` subscription loss (the other identified failure mode from STATE.md).

### Claude's Discretion

- Exact class names and Tailwind tokens for the spacer element (must match ControlsBar's rendered width — `self-start` and intrinsic width)
- Whether to use `invisible` vs `aria-hidden` + `pointer-events-none` for the spacer
- Exact Playwright selector for the drag-via-monitor e2e test

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary implementation file
- `src/components/BoardView.tsx` — the only file that assembles the board layout; opponent hand + spread structure lives here (lines 36–126); this is the main restructure target

### Component files (read for prop signatures and behavior)
- `src/components/SpreadZone.tsx` — `interactive` prop distinguishes personal (true) vs opponent (false) zones; lines 153–174 contain isEmpty + isOver logic; lines 214–236 contain controls guard
- `src/components/OpponentHand.tsx` — rendered per opponent in the header; no changes expected
- `src/components/HandZone.tsx` — local player hand at the bottom; no changes expected

### dnd-kit configuration
- Find current `DndContext` setup in `src/` (likely `App.tsx` or `GameRoom.tsx`) — add `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` here

### Requirements and planning
- `.planning/REQUIREMENTS.md` §Layout — LAYOUT-05 definition and acceptance criteria
- `.planning/ROADMAP.md` Phase 30 — success criteria (4 items) and note "full e2e drag coverage"
- `.planning/STATE.md` — v1.5 planning note: "LAYOUT-05 is highest-risk change — land last with e2e coverage; stale droppable rects and useDndMonitor subscription loss are the two failure modes"

### Prior phase context
- `.planning/phases/27-drop-target-empty-spread-behavior/27-CONTEXT.md` — established `interactive !== false` gate for personal vs opponent SpreadZone; `isOver`-only drop signaling on opponent spread
- `.planning/phases/26-zero-risk-visual-polish/26-CONTEXT.md` — established `interactive !== false && !isEmpty` controls guard in SpreadZone

### e2e test reference
- `tests/e2e/` — existing Playwright e2e tests; new drag-via-monitor test goes here

</canonical_refs>

<code_context>
## Existing Code Insights

### Current layout structure (BoardView.tsx lines 36–126)
```
<div h-screen flex-col>                          // outer shell
  <ConnectionBanner />
  <div flex px-4 py-2 bg-card>                   // HEADER BAND
    <div flex items-start gap-4 flex-1>
      {opponents.map(id => (
        <div key={id} flex flex-col gap-1 flex-1>
          <OpponentHand />
          {opponentSpread && <SpreadZone interactive={false} />}  // ← MOVES OUT
        </div>
      ))}
    </div>
    <ControlsBar />
  </div>
  <div flex-1 flex-col>                          // BOARD AREA
    <div flex-1 flex items-center px-4 gap-4>    // piles + grid row
      <PileZone /> ...
      <GridZone />
    </div>
    {mySpreadZone && <div px-4 py-1><SpreadZone interactive={true} /></div>}
    <HandZone />
  </div>
</div>
```

### Target structure after restructure
```
<div h-screen flex-col>
  <ConnectionBanner />
  <div flex px-4 py-2 bg-card>                   // HEADER BAND (unchanged)
    <div flex items-start gap-4 flex-1>
      {opponents.map(id => (
        <div key={id} flex flex-col flex-1>
          <OpponentHand />                        // header: hands only
        </div>
      ))}
    </div>
    <ControlsBar />
  </div>
  <div flex-1 min-h-0 flex-col>                  // BOARD AREA
    <div flex items-start gap-4 px-4 flex-shrink-0>  // ← NEW: opp spreads row
      <div flex items-start gap-4 flex-1>
        {opponents.map(id => (
          <div key={id} flex flex-col flex-1>    // always rendered, even if no spread
            {opponentSpread && <SpreadZone interactive={false} />}
          </div>
        ))}
      </div>
      <div [spacer matching ControlsBar width] />  // ← NEW: alignment spacer
    </div>
    <div flex-1 min-h-0 ...>                     // piles + grid (grows)
      <PileZone /> ...
      <GridZone />
    </div>
    {mySpreadZone && <div px-4 py-1><SpreadZone interactive={true} /></div>}
    <HandZone />
  </div>
</div>
```

### Reusable Assets
- `spreadPiles.find(p => p.id === \`spread-${id}\`)` — already computed in BoardView for each opponent; just needs to move from inside the header map to the spread row map
- `allOpponentIds` — already derived; reuse for both header map and spread row map
- `MeasuringStrategy` — import from `@dnd-kit/core`; add to existing `DndContext` measuring config

### Established Patterns
- `interactive={false}` prop on opponent SpreadZone — controls guard pattern from Phase 26; unchanged
- `flex-1` + `min-w-0` opponent column sizing — reuse exact class tokens from header in spread row columns
- `isOver`-only border signaling on opponent SpreadZone — Phase 27; unchanged

### Integration Points
- `DndContext` (App.tsx or GameRoom.tsx) — add `measuring` prop; no behavioral change elsewhere
- Playwright e2e test for `useDndMonitor` — new test file or appended to existing drag test file in `tests/e2e/`

</code_context>

<specifics>
## Specific Ideas

- The spacer element in the spread row must visually match the ControlsBar's horizontal footprint so that `flex-1` opponent columns in the spread row align with those in the header. An `invisible` div with `self-start` and the ControlsBar's natural width is sufficient — or Claude can use `aria-hidden="true" pointer-events-none` if that fits better.
- The `flex-shrink-0` on the opponent spreads row is critical — if it's allowed to shrink, spreads will visually detach from their hands on short screens.
- `MeasuringStrategy.Always` import: `import { MeasuringStrategy } from '@dnd-kit/core'`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-layout-restructure-dock-spread-zones*
*Context gathered: 2026-05-21*
