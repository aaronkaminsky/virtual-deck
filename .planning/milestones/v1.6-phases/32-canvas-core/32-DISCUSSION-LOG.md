# Phase 32: Canvas Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 32-Canvas Core
**Areas discussed:** Canvas data model, Action API, Drop collision strategy, Canvas-to-pile insert dialog

---

## Canvas Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| New `canvasCards` field | `canvasCards: CanvasCard[]` on GameState — clean semantics, doesn't pollute Pile | ✓ |
| Extend Pile with `region: "canvas"` | Reuses pile handlers but cards in piles don't have per-card positions — loose fit | |
| You decide | Let the planner figure it out | |

**User's choice:** New `canvasCards` field

**Notes:** User asked about a base `CardPosition`/`CardPlacement` type that both pile and canvas would extend from, motivated by wanting to simplify actions that affect cards (flip, hover, select, drag) regardless of where the card is. After discussion, concluded: hover/select/drag are client-only UI state and don't benefit from a shared placement type; a server-internal `findCard()` discriminated union handles the cross-container lookup without putting the type on the wire. Face-flip for canvas cards is out of scope for phase 32. `CardPlacement` on the wire deferred.

---

## Action API

| Option | Description | Selected |
|--------|-------------|----------|
| New `PLACE_ON_CANVAS` action | Separate action type for canvas moves; MOVE_CARD unchanged | ✓ |
| Extend MOVE_CARD with canvas zone | Add `'canvas'` to fromZone/toZone union + optional x/y — more complex handler | |

**User's choice:** New `PLACE_ON_CANVAS` action

**Notes:** Single action handles both hand→canvas and canvas→canvas repositioning. Canvas→pile drops continue to use MOVE_CARD (with `fromZone: 'canvas'` added to its union) after the insert dialog.

---

## Drop Collision Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas as explicit `useDroppable` | Register canvas div; `event.over.id === 'canvas'` triggers PLACE_ON_CANVAS; `null` = true miss | ✓ |
| Catch-all: check canvas bounds manually | `event.over === null` → query element rect — fragile, bypasses dnd-kit pointer capture | |

**User's choice:** Canvas as explicit `useDroppable`

**Notes:** NOLOSS-01 falls out naturally — true miss (`event.over === null`) means no action is sent, server state unchanged, canvas card stays at original position.

---

## Canvas-to-Pile Insert Dialog

| Option | Description | Selected |
|--------|-------------|----------|
| Same dialog as hand→pile | Top/bottom/random dialog — consistent UX, no special-casing | ✓ |
| Default to top, no dialog | Simpler but inconsistent with hand→pile behavior | |

**User's choice:** Same dialog as hand→pile

**Notes:** Consistent with existing pile drop behavior. No implementation changes needed to the dialog itself — just a new source zone.

---

## Claude's Discretion

- `CanvasCard` shape details (`{ card: Card; x: number; y: number; z: number }`) — user approved proposed shape
- `CardLocation` discriminated union structure for `findCard()` server helper
- Position clamping formula and canvas bounds approach

## Deferred Ideas

- **Stack shadow** (OVERLAP-03): spike validated the `coversMajority()` approach; port to Phase 33
- **`CardPlacement` on the wire**: considered for unified cross-zone actions; deferred pending whether flip/pass to canvas cards requires it in a later phase
