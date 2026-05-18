# Phase 25: Layout & Visual Polish - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Five targeted polish changes to the existing board — no new game actions, no server changes, no new zone types. Purely visual/layout work:

1. **POLISH-01** — Remove body text from empty spread zones (SpreadZone already renders the pile name inside the zone when empty; remove it)
2. **POLISH-02** — Move pile controls from below the pile card to a header row above it (label left, controls right)
3. **POLISH-03** — Reposition the personal spread band: less padding, no bg-card background so it blends into the board surface
4. **POLISH-04** — Compact zone heights and spacing across the board
5. **ZONE-01** — Collapse empty personal spread zones to zero height; reveal a slim drop-target strip only when a drag hovers over the zone area

All changes are in React components (`PileZone.tsx`, `SpreadZone.tsx`, `BoardView.tsx`). No PartyKit server changes.

</domain>

<decisions>
## Implementation Decisions

### Pile Controls Placement (POLISH-02)
- **D-01:** Controls move to a header row above the pile card: pile name on the left, Eye/Shuffle/SelectAll buttons on the right — all on one row. Currently the controls are a separate `<div className="flex gap-1 mt-1">` below the pile card (PileZone.tsx lines 82–111); restructure to a `flex justify-between` row wrapping label and buttons above the card.
- **D-02:** At narrow widths where the label + 3 buttons don't fit within the pile's column, hide the label (`hidden sm:block` or similar) and show only the 3 icon buttons. Cards are identifiable by face content; label is optional at small sizes.

### Personal Spread Positioning (POLISH-03)
- **D-03:** Keep the personal spread as a separate band above the hand (do not merge into the center flex row alongside piles). The structural change is inside the existing band only.
- **D-04:** Both changes apply: (a) reduce or remove `py-2` padding on the spread band and (b) remove `bg-card` background so the band blends into `bg-background` (the board surface). The spread zone feels part of the table rather than a footer.

### Empty Spread Collapse (ZONE-01)
- **D-05:** When the personal spread zone is empty, it collapses to zero visible height. It is NOT visible as a drop target simply because a drag is in progress.
- **D-06:** The drop target (a slim strip at approximately half card height) only becomes visible when a dragged card is hovering over the zone's area — revealed by dnd-kit's `isOver` state on the spread's `useDroppable`. Zero height at all other times, including during a drag.
- **D-07:** The revealed strip is a slim dashed-border highlight (approximately half card height, e.g. ~40px mobile / ~56px desktop), consistent with the border-primary dashed style used elsewhere when dragging over empty zones.

### Removing Empty Zone Body Text (POLISH-01)
- **D-08:** SpreadZone.tsx line 176 renders `<span className="text-xs text-muted-foreground">{pile.name}</span>` inside the zone when `isEmpty`. Remove this span entirely. The label above the zone (`<span>` at the top of the component) is sufficient.

### Claude's Discretion
- **Compaction (POLISH-04):** Apply a moderate reduction — target approximately 20% shorter card zones while maintaining card legibility. Starting point: `h-[79px] → h-[64px]` (mobile), `h-[112px] → h-[90px]` (desktop). Adjust spacing (py, gap) proportionally. Fine-tune based on visual result.
- Exact pixel values for the slim drop-target strip height.
- Whether label hiding at narrow widths uses `hidden sm:inline` on the label span or a responsive breakpoint — pick whatever matches the existing pattern in PileZone.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 25 — Goal and success criteria
- `.planning/REQUIREMENTS.md` §"Layout & Visual Polish" (POLISH-01 through POLISH-04, ZONE-01) — locked requirements

### Source Files (must read before planning)
- `src/components/PileZone.tsx` — Pile label and controls structure; lines 48–113 define the current layout to restructure for POLISH-02
- `src/components/SpreadZone.tsx` — Empty-zone body text at line 176 (POLISH-01); `useDroppable` and `isOver` at lines 82–85 for ZONE-01 collapse/reveal
- `src/components/BoardView.tsx` — Personal spread band at lines 90–103 (POLISH-03); overall board flex layout for POLISH-04
- `src/components/GridZone.tsx` — May need height updates to stay proportional with POLISH-04 zone compaction

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` (`variant="ghost"`, `className="h-7 w-7 p-0"`) — established icon button pattern; pile controls stay the same style after being moved
- `cn` utility — conditional class application for collapse/reveal logic
- dnd-kit `useDroppable` + `isOver` — already in SpreadZone.tsx; ZONE-01 uses the same `isOver` boolean to toggle visibility of the slim drop strip

### Established Patterns
- **Empty pile dashed border:** PileZone applies `border-dashed` when empty and `border-primary` when `isOver` — ZONE-01 reuses the same visual language
- **Responsive sizing:** existing `sm:` breakpoints handle mobile vs desktop card sizes; POLISH-04 extends this pattern
- **`bg-card` vs `bg-background`:** The header band (opponents, controls) uses `bg-card`; the board body uses `bg-background`. POLISH-03 removes `bg-card` from the personal spread band to align it visually with the board surface

### Integration Points
- `BoardView.tsx` line 90–103: personal spread band — target for POLISH-03 (remove bg-card, reduce py) and ZONE-01 conditional render
- `PileZone.tsx` lines 48–113: outer wrapper and controls — restructure to header-row layout for POLISH-02
- `SpreadZone.tsx` line 176: remove the empty-state `<span>` for POLISH-01; add collapse/reveal logic to line 165 wrapper for ZONE-01

</code_context>

<specifics>
## Specific Ideas

- For ZONE-01: the droppable must remain registered in the DOM even when visually collapsed (dnd-kit needs the node for collision detection). The zero-height approach requires the drop zone to use `overflow: hidden` with `height: 0` normally and expand to the slim strip height only when `isOver` is true. The planner should verify dnd-kit detects proximity to zero-height nodes and propose an alternative (e.g., 1px transparent area) if collision detection fails.
- Pile header row for POLISH-02: use `flex items-center justify-between` wrapping `<span>` (label) and `<div className="flex gap-1">` (buttons). The outer `PileZone` `flex flex-col items-center` should not constrain this row to the pile card width.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-play-area-layout-center-canvas*
*Context gathered: 2026-05-17*
