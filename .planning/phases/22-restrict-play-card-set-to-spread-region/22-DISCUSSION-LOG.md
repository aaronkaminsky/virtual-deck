# Phase 22: Hand Reveal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 22-restrict-play-card-set-to-spread-region
**Areas discussed:** Toggle placement, Revealed opponent display, Indicator on your own hand, Reset interaction

---

## Toggle Placement

| Option | Description | Selected |
|--------|-------------|----------|
| HandZone header | Inline with player name + connection dot; closest to the hand | ✓ |
| ControlsBar | Alongside Reset, Deal, Shuffle in the controls popover | |

**User's choice:** HandZone header

---

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only button | Eye/EyeOff lucide-react icons; matches PileZone controls pattern | ✓ |
| Text button | "Show Hand" / "Hide Hand" label; more discoverable, more space | |

**User's choice:** Icon-only button

---

## Revealed Opponent Display

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable row of card faces | Same layout as current backs, CardFace instead, no cap | ✓ |
| Keep 5-card cap, show faces | Still max 5 visible, overflow count badge | |
| Mini spread zone | Compact SpreadZone reuse | |

**User's choice:** Scrollable row of card faces (no cap)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No label | Cards speak for themselves | ✓ |
| Small "showing" badge | Explicit revealed-state label near player name | |

**User's choice:** No label

---

## Indicator on Your Own Hand

| Option | Description | Selected |
|--------|-------------|----------|
| Eye icon stays active/highlighted | Toggle button itself as indicator | |
| Subtle border or glow on HandZone | Colored ring while revealed | |
| No indicator | Player tracks state themselves | |

**User's choice (freeform):** "The icon is sufficient, but for this case it should be a bit more prominent while the hand is revealed, a subtle glow or border or something like that"

**Notes:** User wants BOTH: icon state change + subtle visual on the HandZone itself. Not just the icon alone.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Primary color (teal/blue) | Matches selection rings; on-theme | ✓ |
| Amber/yellow | Caution signal; breaks color palette | |
| You decide | Claude picks best fit | |

**User's choice:** Primary color (teal/blue)

---

## Reset Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Clear all reveal states on reset | Consistent with full reset semantics | ✓ |
| Preserve reveal states through reset | Persistent "showing hand" across rounds | |

**User's choice:** Clear all reveal states on RESET_TABLE

---

## Claude's Discretion

- Exact data model placement for `handRevealed` (on `Player` type vs. separate map)
- Exact `ClientAction` type name for the toggle
- Exact glow/border CSS class values

## Deferred Ideas

None — discussion stayed within phase scope.
