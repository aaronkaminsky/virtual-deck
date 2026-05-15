# Phase 18: Controls Collapse - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 18-controls-collapse
**Areas discussed:** Controls scope, Panel style, Copy link placement

---

## Controls Scope

**Q1: Which controls collapse into the panel?**

| Option | Description | Selected |
|--------|-------------|----------|
| ControlsBar only | Deal/Undo/Reset move into panel; Shuffle/Flip stay inline on PileZone | ✓ |
| Consolidate all controls | Deal/Undo/Reset/Shuffle/Flip all go into panel | |

**User's choice:** ControlsBar only
**Notes:** Shuffle and Flip are contextual to a specific pile — moving them into a global panel would lose that contextual relationship.

---

**Q2: When is the trigger button visible?**

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Trigger shows in header across all phases | ✓ |
| Only when controls exist | Trigger hides when there's nothing to show | |

**User's choice:** Always visible
**Notes:** Consistent anchor point; avoids layout shift.

---

**Q3: What does the trigger button look like?**

| Option | Description | Selected |
|--------|-------------|----------|
| Icon only (hamburger) | ☰ or ⋮ icon — compact | ✓ |
| Text label | "Controls" or "Menu" as visible text | |
| You decide | Claude picks to match existing header style | |

**User's choice:** Icon only (hamburger/menu)

---

**Q4: Panel close behavior after action?**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-close | Panel closes after action completes | ✓ |
| Stay open | Panel stays open until explicit close | |

**User's choice:** Auto-close

---

## Panel Style

**Q1: Panel mechanism?**

| Option | Description | Selected |
|--------|-------------|----------|
| Popover/dropdown | Floating panel drops from button, closes on outside-click | ✓ |
| Drawer/sheet | Slide-in from side, full height | |
| Inline toggle | Header expands to second row in place | |

**User's choice:** Popover/dropdown

---

**Q2: Reset confirmation inside the popover?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline confirm | Two-step state inside popover; no AlertDialog | ✓ |
| Keep AlertDialog | Researcher investigates Radix stacking | |

**User's choice:** Inline confirm
**Notes:** Avoids Radix Popover + AlertDialog focus/close conflict.

---

**Q3: Deal card count input?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in panel | Card count input in panel body; no nested Popover | ✓ |
| Keep nested flow | Deal button triggers separate element | |

**User's choice:** Inline in panel (selected preview showing direct input in panel body)

---

**Q4: Panel controls visibility by phase?**

| Option | Description | Selected |
|--------|-------------|----------|
| Always show all | All controls visible; disabled when not applicable | ✓ |
| Phase-aware | Panel content changes per game phase | |

**User's choice:** Always show all

---

## Copy Link Placement

**Q1: Where does Copy link live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inside controls panel | Copy link at top of panel; header has only hamburger | ✓ |
| Always visible in header | Stays in header; only game controls move behind hamburger | |

**User's choice:** Inside controls panel (selected panel layout preview)

---

**Q2: Copy link panel behavior?**

| Option | Description | Selected |
|--------|-------------|----------|
| Show "Copied!" then auto-close | ~1.5s confirmation, then panel closes | ✓ |
| Close immediately | No confirmation feedback | |
| Stay open | Panel stays open after copy | |

**User's choice:** Show "Copied!" then auto-close

---

## Claude's Discretion

None — all decisions made explicitly by user.

## Deferred Ideas

- **Reset availability based on actions** — `project-brainstorm.md` note: "reset button should be available if any action has been taken, not just deal." Currently Reset is gated on `phase === 'playing'`. Enhancement to gate on any-action-taken instead is out of scope for Phase 18.
