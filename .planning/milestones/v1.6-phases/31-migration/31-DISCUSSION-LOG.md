# Phase 31: Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 31-Migration
**Areas discussed:** Sidebar sizing & style, Canvas shell appearance, Communal 'play' pile fate, Board layout restructure scope

---

## Sidebar Sizing & Style

| Option | Description | Selected |
|--------|-------------|----------|
| Natural PileZone width | No fixed width — sidebar wraps snugly around PileZone components | ✓ |
| Fixed pixel width | Set a specific width (e.g. 120–160px) regardless of PileZone size | |
| You decide | Claude picks whatever fits best | |

**User's choice:** Natural PileZone width

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed/sticky | Always visible regardless of canvas scroll | ✓ |
| Scrolls with canvas | Sidebar moves with the page | |

**User's choice:** Fixed/sticky

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stay visible, shrink canvas | Sidebar takes its natural width; canvas gets remaining space | ✓ |
| Collapse to icons only | Sidebar shrinks to icon-only mode at narrow widths | |
| You decide | Claude picks whatever is simplest | |

**User's choice:** Stay visible, shrink canvas

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle divider/border | 1px border-right in muted color | ✓ |
| No separator | Separation implied by layout alone | |
| Background contrast | Sidebar gets a slightly different background color | |

**User's choice:** Subtle divider/border

---

## Canvas Shell Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Plain felt background, no decoration | Dark felt bg-background. No empty-state hint needed in a transitional phase | ✓ |
| Faint dashed border + hint text | Like the empty personal spread strip — communicates zone purpose | |
| You decide | Claude picks whatever looks right | |

**User's choice:** Plain felt background, no decoration

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flex-1, fills available vertical space | Canvas grows to fill remaining height in the middle band | ✓ |
| Fixed height (e.g. 300–400px) | Explicit canvas height for predictable Phase 32 sizing | |
| You decide | Claude determines height based on layout constraints | |

**User's choice:** Flex-1, fills available vertical space

---

## Communal 'Play' Pile Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it from server state | Delete 'play' pile from initial piles array. Clean break | ✓ |
| Keep it, just stop rendering it | Leave in server state but don't render GridZone for it | |
| Repurpose it as the canvas container | Keep the pile with a new region type (e.g. region: 'canvas') | |

**User's choice:** Remove from server state

---

| Option | Description | Selected |
|--------|-------------|----------|
| Migration guard: flush to draw pile | In server startup, if 'play' pile exists in persisted state, move cards to draw pile | |
| Just remove the pile, cards silently lost | No migration guard. Rooms typically reset before play | ✓ |
| You decide | Claude handles the migration edge case | |

**User's choice:** No migration guard — cards silently lost

---

## Board Layout Restructure Scope

**User asked for clarification before answering:** Wanted to understand what a full board restructure would gain before deciding.

**Claude's explanation of full restructure benefits:**
1. Sidebar could span full board height (floor-to-ceiling permanent column)
2. Canvas gets more vertical room
3. Simpler scrolling model for Phase 35 mobile work

**Claude's explanation of costs:** Much more scope in a migration phase, higher regression risk across components tuned across Phases 17/19/25–27/30, none of the three MIGRATE requirements call for it.

| Option | Description | Selected |
|--------|-------------|----------|
| Replace the middle band only | Current flex column structure stays. Middle band becomes sidebar | canvas | ✓ |
| Full board restructure | Sidebar runs full board height. Canvas becomes dominant surface | |

**User's choice:** Replace the middle band only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, drop items-center — align top | Canvas fills full height; centering no longer makes sense | ✓ |
| Keep items-center | Sidebar piles stay vertically centered | |
| You decide | Claude picks whatever aligns best | |

**User's choice:** Drop items-center, align top

---

## Claude's Discretion

- Exact muted border color for sidebar divider — use an existing Tailwind border token from the dark felt theme
- Whether `overflow-hidden` or `overflow-auto` on the canvas shell in Phase 31

## Deferred Ideas

- **Full board restructure** — discussed and declined for Phase 31. Could benefit Phase 35 mobile scroll model. User comfortable revisiting if Phase 35 reveals a structural need.
- **Migration guard for existing room state** — declined; rooms reset before play makes it a non-issue.
