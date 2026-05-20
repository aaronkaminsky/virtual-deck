# Phase 27: Drop Target + Empty Spread Behavior - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 27-Drop-Target-Empty-Spread-Behavior
**Areas discussed:** CTRL-06: Drag-start suppression scope, LAYOUT-06: Faint strip appearance

---

## CTRL-06: Drag-start suppression scope

### Q1: What should the opponent hand zone do before hover?

| Option | Description | Selected |
|--------|-------------|----------|
| No change until hover | Remove both dashed border AND min-h/min-w expansion at drag-start | ✓ |
| Keep size expansion, remove border only | Zone still expands when any drag is active, but border is gone | |

**User's choice:** No change until hover — pure hover-only behavior.

---

### Q2: What happens when isOver = true?

| Option | Description | Selected |
|--------|-------------|----------|
| Solid primary border only | `border-2 border-primary` — same as existing isOver behavior | ✓ |
| Border + size expansion on hover | Zone grows AND shows primary border when hovered | |

**User's choice:** Solid primary border only (no size expansion even on hover).

---

### Q3: "Drop to pass" text hint on drag-start?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it — same hover-only logic | Show text only when isOver | |
| Keep it on drag-start | Text hint stays on drag-start; less intrusive than the visual outline | ✓ |

**User's choice:** Keep "Drop to pass" text on drag-start when zone is empty.

---

## LAYOUT-06: Faint strip appearance

### Q1: Empty spread zone at rest

| Option | Description | Selected |
|--------|-------------|----------|
| Thin dashed border strip, ~¼ height | ~h-4 (16px) with dashed border at muted/low-opacity color | ✓ |
| Slightly taller faint strip, ~½ height | ~h-8 (32px) strip, more visible but still smaller than full zone | |

**User's choice:** ¼-height thin strip.

---

### Q2: Border color/opacity at rest

| Option | Description | Selected |
|--------|-------------|----------|
| border-muted-foreground/30 | Low-opacity muted text color | ✓ |
| border-border | Standard Tailwind border token | |
| border-primary/20 | Very faint primary-tinted hint | |

**User's choice:** `border-muted-foreground/30`.

---

### Q3: isOver behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Expand to full drop-target | Strip grows to full h-[40px] sm:h-[56px] with border-primary | ✓ |
| Stay at ¼ height but highlight | Keep thin strip but switch to border-primary on hover | |

**User's choice:** Expand to full drop-target (same as current isOver behavior).

---

## Claude's Discretion

None — all areas had explicit user selections.

## Deferred Ideas

None.
