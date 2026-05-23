# Phase 26: Zero-Risk Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 26-zero-risk-visual-polish
**Areas discussed:** Pile controls gap, Grid face-toggle placement, SpreadZone header residue

---

## Pile controls gap (POLISH-06)

| Option | Description | Selected |
|--------|-------------|----------|
| gap-0 (flush) | Remove all vertical space — controls sit directly on top of card | |
| gap-0.5 (2px) | Reduce to 2px — slight separation, softer than flush | ✓ |
| You decide | Claude picks whatever looks tightest | |

**User's choice:** gap-0.5 (2px, barely visible)
**Notes:** Pile name label stays — only SpreadZone labels are removed (LAYOUT-07). Pile labels are out of scope for this change.

### Sub-question: pile name label retention

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | LAYOUT-07 only covers SpreadZone labels | ✓ |
| Remove it | Expands scope beyond LAYOUT-07 | |

---

## Grid face-toggle placement (CTRL-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Right-aligned in label row | flex justify-between: "Play Area" left, Eye button right | ✓ |
| Immediately after label text | Inline, no space between label and button | |
| You decide | Claude picks based on existing board patterns | |

**User's choice:** Right-aligned in label row
**Notes:** Matches the PileZone controls row pattern (justify-between).

---

## SpreadZone header residue (LAYOUT-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Conditionally render the whole div | Header div only appears when selection badge is showing | ✓ |
| Keep the empty div | Just remove the name span, leave wrapper | |
| You decide | Claude picks whatever minimizes dead space | |

**User's choice:** Conditionally render the whole div
**Notes:** The `ml-2` on the badge span may need adjustment since it was spacer from the now-removed name span.

---

## Claude's Discretion

None — all decisions were made explicitly by the user.

## Deferred Ideas

None — discussion stayed within phase scope.
