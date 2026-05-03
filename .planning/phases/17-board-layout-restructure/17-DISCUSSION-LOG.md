# Phase 17: Board Layout Restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 17-board-layout-restructure
**Areas discussed:** Board section structure, Opponent spread placement, ID collision fix strategy

---

## Board Section Structure

### Question 1 — Top-to-bottom section order

| Option | Description | Selected |
|--------|-------------|----------|
| Opponents → Piles+Communal → Hand | Piles and communal zone share a flex-1 center row. Personal spreads move to player area. | ✓ |
| Opponents → Piles → Communal → Hand | Four distinct rows; communal zone gets its own full-width row directly above player. | |

**User's choice:** Opponents → Piles+Communal → Hand (three-band approach)

---

### Question 2 — Center row arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Communal zone centered, piles flanking | Draw pile(s) on left, communal zone in the middle taking most of the row width. | ✓ |
| Piles and communal side by side, communal grows | Flex row, communal gets flex-1 to fill remaining space. | |

**User's choice:** Communal centered, piles flanking

---

### Question 3 — Player bottom arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Spread zone above hand (stacked) | My spread sits in a compact row just above the hand zone. Two separate bands. | ✓ |
| Spread zone beside hand (same row) | My spread and hand zone share the bottom row side by side. | |

**User's choice:** Spread stacked above hand (two separate horizontal bands)

---

### Question 4 — Controls placement

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in top header bar | Controls and Copy Link stay in compact header. Phase 18 handles collapse. | ✓ |
| Move controls out of opponent area | Separate controls into a standalone header row. | |

**User's choice:** Keep controls in header — Phase 17 scope does not touch them.

---

## Opponent Spread Placement

### Question 1 — Where opponent spreads live

| Option | Description | Selected |
|--------|-------------|----------|
| Opponent spread below their hand, in top section | Each opponent is a column: hand label on top, spread below. | ✓ |
| Keep current — opponent spreads in header as-is | No structural change to opponent section. | |

**User's choice:** Opponents as vertical columns (hand above spread) in the top section.

---

### Question 2 — Interactivity

| Option | Description | Selected |
|--------|-------------|----------|
| Interactive — same as now | Any player can drag to/from opponent spread zones. | ✓ |
| Display-only for opponents | Opponent spreads visible but not draggable. | |

**User's choice:** Fully interactive — no behavior change.

---

## ID Collision Fix Strategy

### Question 1 — How to fix the SortableSpreadCard + DraggableCard dual-registration

| Option | Description | Selected |
|--------|-------------|----------|
| Inline card rendering — remove DraggableCard | SortableSpreadCard renders CardFace/CardBack directly. One registered ID per card. | ✓ |
| Prefix the sortable ID | `id='sortable-spread-{card.id}'` keeps DraggableCard intact but requires reorder logic update. | |

**User's choice:** Inline rendering, mirroring HandZone/SortableHandCard pattern.

---

### Question 2 — useSortable data sufficiency

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — useSortable data is sufficient | `{ card, fromZone: 'pile', fromId: pileId }` already routes all drop targets correctly. | ✓ |
| No — data needs updating for drag-out | Additional verification needed for non-spread drop targets. | |

**User's choice:** useSortable data is sufficient. (Researcher should verify against BoardDragLayer and PileZone drop handlers.)

---

## Claude's Discretion

None — user made explicit choices on all questions.

## Deferred Ideas

None — discussion stayed within phase scope.
