# Phase 33: Overlap & Visibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 33-Overlap & Visibility
**Areas discussed:** Shadow placement, Shadow during drag, Hit-testing confidence

---

## Shadow Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top (covering) card | Shadow on the card sitting on top; looks like the card is lifting off. Matches spike implementation. | ✓ |
| Bottom (covered) card | Shadow on the card being buried; matches requirement wording literally. | |
| Both cards | Top card gets lift shadow, bottom card gets press shadow. More expressive, more CSS complexity. | |

**User's choice:** Top (covering) card
**Notes:** Matches Spike002 validated implementation.

---

## Shadow During Drag — DragOverlay

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — DragOverlay gets shadow when hovering over a card | DragOverlay ghost shows shadow when covering >50% of a canvas card. Communicates "you are about to stack this." | ✓ |
| Static overlap only | Shadow only at rest; no real-time drag feedback. | |

**User's choice:** Yes — DragOverlay gets shadow when hovering over a card

---

## Shadow During Drag — Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| DragOverlay covers >50% of any canvas card | Same threshold as static: >50% area coverage. Consistent with static rule. | ✓ |
| DragOverlay overlaps any canvas card at all | Any overlap triggers shadow. Lower threshold, more visible feedback. | |

**User's choice:** Same 50% threshold as static overlap

---

## Shadow During Drag — Computation Location

| Option | Description | Selected |
|--------|-------------|----------|
| onDragMove handler in BoardDragLayer | Centralizes drag tracking; matches spike pattern; dragDelta ref lives there. | ✓ |
| Inside CanvasDraggableCard via isDraggingActive | Per-card subscription to active state; more prop threading. | |

**User's choice:** onDragMove handler in BoardDragLayer

---

## Hit-Testing Confidence

| Option | Description | Selected |
|--------|-------------|----------|
| Trust CSS z-index routing | Natural browser behavior delivers pointer events to highest z-index element. Spike validates this. OVERLAP-01 is effectively free. | ✓ |
| Add pointer-events: none on covered cards | Defensive explicit routing; adds per-render covered-card computation. | |

**User's choice:** Trust CSS z-index routing

---

## Claude's Discretion

None — all areas had clear user selections.

## Deferred Ideas

None — discussion stayed within phase scope.
