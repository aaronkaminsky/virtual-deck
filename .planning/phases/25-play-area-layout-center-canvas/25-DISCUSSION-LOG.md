# Phase 25: Layout & Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 25-play-area-layout-center-canvas
**Areas discussed:** Pile controls placement, Personal spread positioning, Empty spread collapse + drop target, Compaction magnitude

---

## Pile Controls Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Header row: label left, controls right | One row above the pile card; pile name on the left, 3 icon buttons on the right | ✓ |
| Inline label+controls, then pile below | Same as above but explicitly named as one line | |
| Overlay on hover/drag | Controls only appear when hovering — saves vertical space but reduces discoverability | |

**User's choice:** Header row: label left, controls right

---

| Option | Description | Selected |
|--------|-------------|----------|
| Let the row be wider than the pile | Header row not constrained to pile width | |
| Truncate label, fit in pile width | Label clips to make room for 3 buttons within fixed width | |
| Remove label at narrow widths | If label + controls don't fit, hide the label and show only controls | ✓ |

**User's choice:** Free text — "If there is not enough room, remove the label entirely and just leave the controls"

---

## Personal Spread Positioning

| Option | Description | Selected |
|--------|-------------|----------|
| Same horizontal row as piles+grid | Personal spread joins the center flex row | |
| Separate band but immediately above the hand | Keep own band structure, reduce spacing between it and center area | ✓ |
| Below piles, above hand — full-width band | Own band, tight spacing, same position | |

**User's choice:** Separate band but immediately above the hand

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reduce padding around the spread band | Cut py-2, reduce gap | |
| Remove bg-card background from spread band | Blend into bg-background | |
| Both: reduce padding + remove bg-card | Combined change | ✓ |

**User's choice:** Both: reduce padding + remove bg-card

---

## Empty Spread Collapse + Drop Target

| Option | Description | Selected |
|--------|-------------|----------|
| Any card drag by the current player | Drop target reveals when local player starts dragging | |
| Any drag by any player | Any player's drag triggers the reveal | |
| Only drags originating from the hand | More restrictive — hand-only drags | |

**User's choice:** Free text — "Any card drag from any player, but only appears when the hover is over the area where it would appear, should not otherwise be visible even when dragging"
**Notes:** The drop target should only become visible when a dragged card is actually hovering over the zone (isOver = true), not simply because a drag is in progress. Zero height even during active drags unless hovered.

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — fully collapsed to zero height | Zone takes up no visible space when empty and not hovered | ✓ |
| Yes — a slim placeholder remains visible | Thin strip remains as a visual hint | |
| You decide | Claude picks | |

**User's choice:** No — fully collapsed to zero height

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashed border box, same height as normal spread | Full zone height appears on hover | |
| Slim highlight strip (half card height) | Shorter dashed strip — less visual jump | ✓ |
| You decide | Claude matches existing empty-zone hover style | |

**User's choice:** Slim highlight strip (half card height)

---

## Compaction Magnitude

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate: ~20–25% shorter card zones | h-[79px] → h-[60px] mobile, h-[112px] → h-[88px] desktop | |
| Light: reduce spacing only, keep card sizes | Cut padding/gaps but keep zone heights | |
| You decide | Claude applies visual judgment | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

- **POLISH-04 compaction:** Exact height targets and spacing reductions — apply moderate compaction (~20%) while maintaining card legibility
- Exact pixel value for the slim drop-target strip height
- Whether label hiding at narrow widths uses `hidden sm:inline` or a responsive breakpoint
- Label hiding breakpoint for pile controls (at what screen width the label disappears)

## Deferred Ideas

None — discussion stayed within phase scope.
