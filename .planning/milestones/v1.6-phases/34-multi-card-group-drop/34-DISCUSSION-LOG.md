# Phase 34: Multi-Card Group Drop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 34-Multi-Card Group Drop
**Areas discussed:** Canvas selection state, Click behavior, Server action design, Bounds cancel UX

---

## Canvas Selection State

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing system | Add 'canvas' to selectionSource zone type. Zone-exclusive, consistent with hand/spread pattern. | ✓ |
| Separate canvasSelectedIds state | Parallel Set<string> alongside existing selectedIds. No risk of touching existing selection code. | |
| You decide | Claude picks the cleanest approach. | |

**User's choice:** Extend existing system

Follow-up: `selectionSource.zoneId` for canvas = `'canvas'` literal (matches registered droppable ID).
Follow-up: Drag start clears cross-zone selection — confirmed yes, consistent with zone-exclusive convention.

**Notes:** User confirmed the zone-exclusive invariant should extend to canvas. No separate state path.

---

## Click Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle / add to group | Click adds card to existing selected set. Matches hand/spread and Spike 004. | ✓ |
| Replace selection | Click starts fresh selection with just the clicked card. | |
| You decide | Claude picks based on hand/spread precedent. | |

**User's choice:** Toggle / add to group

Follow-up deselect-all: Click canvas background clears all — confirmed.
Follow-up after drop: Selection clears on dragEnd — confirmed.

**Notes:** All three click behavior questions matched the recommended options.

---

## Server Action Design

| Option | Description | Selected |
|--------|-------------|----------|
| New GROUP_PLACE_ON_CANVAS action | Single atomic message with cards array. One undo snapshot. | ✓ |
| Multiple PLACE_ON_CANVAS calls | N messages. Non-atomic. N undo snapshots. | |

**User's choice:** New GROUP_PLACE_ON_CANVAS action

Follow-up undo: Single undo step — confirmed.

**User clarification on source zones:** User noted that multi-card select should support hand→canvas and spread→canvas drops (not just canvas→canvas). Source must be homogeneous (all from same zone). This expanded the scope beyond canvas-only to all three source paths shipping in Phase 34.

**Key discussion — x/y coordinates for hand/spread sources:**
User raised: when dragging from hand or spread, cards have no canvas coordinates — where do (x, y) come from?

| Option | Description | Selected |
|--------|-------------|----------|
| DOM offset at drag start | Read getBoundingClientRect() at onDragStart; store pixel offsets relative to handle in ref; apply to drop point. | ✓ |
| Fixed fan / horizontal row | Cards land in a row: x = dropX + i*(CARD_W+8), y = dropY. | |
| All stacked at drop point | All cards land at same (x, y). | |

**User's choice:** DOM offset at drag start — preserves visual relative positions across all source types.

---

## Bounds Cancel UX

| Option | Description | Selected |
|--------|-------------|----------|
| Client-only pre-validation | handleDragEnd checks before dispatch. No action sent on overflow. Silent snap-back. | ✓ |
| Server validates and rejects | Server checks, returns error, client reverts on STATE_UPDATE. | |
| Both | Client pre-validates + server re-validates as safety net. | |

**User's choice:** Client-only pre-validation

Follow-up visual: Silent snap-back, no feedback — confirmed.
Follow-up scope: All cards including drag handle must be in bounds — confirmed.

**Notes:** Consistent with how NOLOSS-01 works for single-card drops (no dispatch = snap-back).

---

## Claude's Discretion

None — all four gray areas had clear user input on every question.

## Deferred Ideas

None — discussion stayed within phase scope.
