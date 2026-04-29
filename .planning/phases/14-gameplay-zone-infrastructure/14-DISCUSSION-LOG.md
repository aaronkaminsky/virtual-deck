# Phase 14: Gameplay Zone Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 14-gameplay-zone-infrastructure
**Areas discussed:** Board layout, Spread zone appearance, Zone interaction ownership

---

## Board layout

### Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Board layout | Where do zones appear in the 3-section board? | ✓ |
| Spread zone appearance | How are cards displayed inside a spread zone? | ✓ |
| Zone interaction ownership | Owner-only or anyone? | ✓ |

### Board layout — primary question

| Option | Description | Selected |
|--------|-------------|----------|
| 4-section board | Add a dedicated spread row between piles and hand; opponents' zones in header | ✓ |
| Merge into middle | All zones in the existing middle pile row | |
| Near each player's hand | My zone above my hand; opponents' zones beside their hands | |

**User's choice:** 4-section board

### Header expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Header grows to fit | Remove fixed height; auto-sizes to content | ✓ |
| Scrollable header | Fixed height with vertical scroll | |
| Separate row above middle | Opponent zones in their own row outside the header DOM | |

**User's choice:** Header grows to fit

---

## Spread zone appearance

### Card layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal row, full card width | Cards side-by-side at full 80px width with gaps | |
| Overlapping cascade (hand-style) | Cards overlap like HandZone — peek at rank/suit | ✓ |
| Wrapping grid | Cards wrap to new row when overflow | |

**User's choice:** Overlapping cascade (hand-style)

### Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Dashed placeholder with zone label | Dashed border + label text when empty | ✓ |
| Zone label only | Just the label, no placeholder outline | |

**User's choice:** Dashed placeholder with zone label

---

## Zone interaction ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Anyone can interact | Any player can drag/toggle any zone | ✓ |
| Owner controls their zone | Only owner can drag out/toggle; others can drag in | |

**User's choice:** Anyone can interact

---

## Claude's Discretion

- Exact CSS for cascade overlap amount and zone min/max width
- Visible separator between spread row and middle piles section
- Hover/drop highlight style for spread zones
- Whether opponent spread zones render when empty (recommend: always visible once player connected)

## Deferred Ideas

- Multi-card drag from spread zones (dnd-kit multi-drag — v1.3+)
- Zone deletion on permanent player leave
- Scrollable spread zone for large card counts
