# Phase 19: Responsive Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 19-responsive-layout
**Areas discussed:** Opponent section at phone width, Card & zone sizing, Vertical height at phone, Center row — pile + communal

---

## Opponent Section at Phone Width

| Option | Description | Selected |
|--------|-------------|----------|
| Allow scroll in opponents strip | Keep overflow-x-auto as-is. Users can scroll within the opponents band. No structural change. | ✓ |
| Collapse opponent spreads at phone width | Hide opponent spread zones below sm: breakpoint so only hand counts show. | |
| You decide | Claude picks based on simplest approach satisfying success criteria. | |

**User's choice:** Allow scroll in opponents strip
**Notes:** The existing `overflow-x-auto` in the header already prevents page-level horizontal scroll (root is `overflow-hidden`). No code change needed for this area.

---

## Card & Zone Sizing

### Question 1: Scale or keep?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep cards at 63×88px | No sizing changes. HandZone already scrolls internally. Simplest. | |
| Scale cards down at phone width | Add Tailwind sm: responsive variants to shrink cards at <sm:. | ✓ |

### Question 2: Target size and breakpoint?

| Option | Description | Selected |
|--------|-------------|----------|
| 42×59px below sm: | Matches existing opponent card size in OpponentHand.tsx. Default Tailwind sm: at 640px. | ✓ |
| 50×70px below sm: | Middle ground between opponent and full-size cards. | |
| You decide | Claude picks target size. | |

### Question 3: Which zones?

| Option | Description | Selected |
|--------|-------------|----------|
| All cards everywhere | One change in CardFace + CardBack (and zone containers). Consistent sizing. | ✓ |
| Hand and spread only | Keep PileZone slot at 80×112px as visual anchor. More targeted. | |
| You decide | Claude picks for most consistent visual result. | |

**User's choice:** Scale down to 42×59px at phone width, all cards everywhere.
**Notes:** 42×59px reuses the existing opponent card pixel values — no new size constant needed.

---

## Vertical Height at Phone

| Option | Description | Selected |
|--------|-------------|----------|
| Allow vertical scroll at phone width | At <sm:, change overflow-hidden to overflow-x-hidden overflow-y-auto. | ✓ |
| Zones flex-shrink to fit 100vh | Keep overflow-hidden, compress zones to fit. Could get very cramped. | |
| You decide | Claude picks based on success criteria (all zones visible and operable). | |

**User's choice:** Allow vertical scroll at phone width
**Notes:** At sm: and above, preserve `overflow-hidden` (board locked to viewport). Only phone width gets vertical scroll as a safety valve.

---

## Center Row — Pile + Communal

| Option | Description | Selected |
|--------|-------------|----------|
| Keep side-by-side, let flex handle it | No structural change. Pile shrinks with card size. Communal gets remaining space. | ✓ |
| Stack pile above communal at phone width | Add flex-col at <sm:. Communal gets full width. | |

**User's choice:** Keep side-by-side
**Notes:** With pile card slot shrinking to proportionally smaller at phone width, there is sufficient space for the communal zone via flex. No column stacking needed.

---

## Claude's Discretion

None — all areas had clear user selections.

## Deferred Ideas

None — discussion stayed within phase scope.
