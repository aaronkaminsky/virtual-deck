# Phase 4: Game Controls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-game-controls
**Areas discussed:** Card flip trigger, Pass card UX, Deal N cards, Undo + reset behavior

---

## Card Flip Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Click the card directly | Single click flips any card. Simple, works with existing card components. | ✓ |
| Hover button overlay | Flip icon appears on hover. More deliberate, harder to flip accidentally. | |
| Right-click context menu | Context menu with flip action. Not touch-friendly. | |

**User's choice:** Click the card directly

| Option | Description | Selected |
|--------|-------------|----------|
| Pile cards only | Flip cards in pile zones only. Hand card face direction doesn't matter. | ✓ |
| Any card anywhere | Pile cards AND hand cards can be flipped. | |

**User's choice:** Pile cards only (hand cards are not flippable)

---

## Pass Card UX

| Option | Description | Selected |
|--------|-------------|----------|
| Drag to opponent hand zone | Opponent hand zones become droppable targets. Extends dnd-kit naturally. | ✓ |
| Click card → pick player from popover | Popover shows player list after clicking a hand card. | |

**User's choice:** Drag to opponent hand zone

| Option | Description | Selected |
|--------|-------------|----------|
| Your hand only | Pass from private hand only. Pile cards go to hand first, then pass. | ✓ |
| Hand or any pile | Drag from anywhere directly to opponent hand. | |

**User's choice:** Your hand only

---

## Deal N Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Click deal → enter N in a small popover | Number field + confirm. Handles any card count. | ✓ |
| Preset buttons: 1, 3, 5, all | Quick fixed amounts. Less flexible. | |
| Always deal 1 card per player | Simplest. No input needed. | |

**User's choice:** Click deal → enter N in a small popover

| Option | Description | Selected |
|--------|-------------|----------|
| On each pile zone | Per-pile deal button. | |
| Global toolbar / header | Single control panel in header. | ✓ |

**User's choice:** Single toolbar/control panel in header
**Notes:** User clarified that Deal is only meaningful at the start when there's a shuffled deck. Once play has started, deal doesn't make sense. Undo + Reset should appear once the first action is taken. Shuffle should be available per pile at all times.

| Option | Description | Selected |
|--------|-------------|----------|
| Deal triggers setup→play transition | Deal fires → game moves to playing phase. | ✓ |
| Explicit 'Start Game' button | Separate transition step. | |
| First card move triggers it | Automatic, no explicit button. | |

**User's choice:** Deal button triggers the transition

| Option | Description | Selected |
|--------|-------------|----------|
| Controls in same top strip as opponents | Game controls alongside opponent hands. Compact. | ✓ |
| Separate controls bar below opponent strip | Second thin bar. Clearer separation, more vertical space. | |

**User's choice:** Controls in the same top strip as opponent hands
**Notes:** User also expressed interest in responsive design for different screen sizes including phone. Deferred — mobile-first is already out of scope per REQUIREMENTS.md.

---

## Undo + Reset Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Your own last move only | Per-player independent undo. Server stores last move per player. | ✓ |
| Anyone's last move (global undo) | Shared undo. Could disrupt other players. | |

**User's choice:** Your own last move only

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — confirm dialog | "Reset table? This can't be undone." Prevents accidents. | ✓ |
| No — reset fires immediately | Fast but catastrophic if misclicked. | |

**User's choice:** Yes — confirmation dialog before reset

---

## Claude's Discretion

- Exact styling of controls bar within the header strip
- Click guard on flip to prevent accidental trigger during drag
- Number input constraints for deal (min/max validation)
- Whether deal popover uses shadcn Popover or inline form

## Deferred Ideas

- Mobile/responsive layout — user interested, deferred as future requirement (mobile-first out of scope per REQUIREMENTS.md)
- Global undo (v2 DIFF-04) — not Phase 4
