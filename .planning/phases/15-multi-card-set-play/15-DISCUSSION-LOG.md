# Phase 15: Multi-Card Set Play - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 15-multi-card-set-play
**Areas discussed:** Click vs drag conflict, Zone targeting UX, Selection indicator, Cancel / deselect

---

## Click vs drag conflict

| Option | Description | Selected |
|--------|-------------|----------|
| Always-on toggle | Click any hand card at any time to toggle selection. Drag still works via dnd-kit distance constraint. No mode switch button. | ✓ |
| Explicit select mode | A "Select" toggle button activates selection mode; in that mode, clicks select and drag is disabled. | |

**User's choice:** Always-on toggle

**Notes:** User then clarified they want drag-to-play (not select-then-button). The model evolved: click = select, drag a selected card = moves the whole selection to the drop target. Zone targeting is implicit in the drop destination — no "Play N cards" button needed. This supersedes the STATE.md "select-then-button" decision.

Follow-up on disambiguation: user asked whether distance-only threshold works on mobile touchscreens. After noting mobile is out of scope per REQUIREMENTS.md, user chose to implement dual-sensor anyway (distance for mouse, delay for touch) as a forward-looking choice.

---

## Zone targeting UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two inline buttons | "Play N to My Zone" and "Play N to Communal" appear in HandZone when cards are selected. One-click play. | |
| One button + dialog | "Play N cards" button → dialog to choose zone. Consistent with pile insert-position UX. | |
| Default to My Zone only | Always plays to personal zone; drag individually for communal. | |
| Drag-based (emerged in discussion) | Drop destination determines target zone. No button. Implicit from drag gesture. | ✓ |

**User's choice:** Drag-based — user proposed this during the click/drag discussion before this area was formally presented.

**Notes:** User suggested drag should work for both single and multi-card play. Dragging a selected card drags all selected cards to the drop target. Dragging an unselected card clears selection and moves just that card.

---

## Selection indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Ring + upward lift | ring-2 ring-primary border + -translate-y-1.5 (≈6px). Clear at a glance. | ✓ |
| Ring only | Colored border ring, no movement. Subtler. | |
| Checkmark overlay | Small checkmark badge in top-right corner. Good for overlapping cards. | |

**User's choice:** Ring + upward lift

---

## Cancel / deselect

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle click + Escape key | Click selected card deselects it; Escape clears all. | base ✓ |
| Toggle click + Escape + click-outside | Same as above plus clicking anywhere outside hand cards clears all. | ✓ |
| Toggle click + Escape + Cancel button | Explicit Cancel button in HandZone. | |
| Toggle click only | No keyboard shortcut. | |

**User's choice:** Toggle click + Escape + click-outside (user added click-outside to the first recommended option)

---

## Claude's Discretion

- Exact upward lift pixel value (≈6px, adjust to taste)
- Whether a count badge ("2 selected") appears near the hand label
- Visual drag preview for multi-card set (single ghost vs. stacked ghost)
- Whether `ring-offset-background` is needed for contrast against card art

## Deferred Ideas

- dnd-kit native multi-drag overlay (PLAY-04) — remains deferred to v1.3+
- "Play N cards" button UI — removed; drag-based is preferred
- Visual set grouping in spread zone (PLAY-05) — future phase
- Action log (PLAY-06) — future phase
