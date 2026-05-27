# Phase 35: Mobile - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 35-mobile
**Areas discussed:** Canvas coordinate model, Mobile canvas height, Arrow feel / trigger

---

## Canvas coordinate model

### Question 1: Fixed logical canvas size vs. viewport-sized?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed logical size (Spike003 model) | Canvas is always e.g. 1400×700px. Viewport pans via CSS transform. | |
| Viewport-sized, overflow on resize | Canvas stays flex-1 (= current viewport). Cards placed at larger coordinates cause overflow. No coordinate system change. | ✓ |

**User's choice:** Viewport-sized, overflow on resize
**Notes:** No coordinate system change — existing clamping logic stays as-is. Cards placed at desktop coordinates remain at those coordinates when viewed on mobile.

### Question 2: What defines inner canvas dimensions?

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic: max card position + padding | Inner canvas = bounding box of all placed cards + CARD_W + padding. No arrows when no cards are placed. | ✓ |
| Fixed constant (like Spike003: 1400×700) | Inner canvas always 1400px wide. Arrows always visible at mobile even if no cards. | |

**User's choice:** Dynamic: max card position + padding
**Notes:** More correct — never pans to empty space. Arrows only appear when cards actually overflow.

---

## Mobile canvas height

### Question 1: How should canvas height be capped at < 640px?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed CSS cap via breakpoint | `max-h-[Xpx]` at < 640px. Simple, predictable, no JS. | ✓ |
| Proportional: percentage of viewport height | `max-h-[45vh]` or similar. Adapts to different phone heights. | |

**User's choice:** Fixed CSS cap via breakpoint
**Notes:** Exact value is implementation tuning — constraint is "spread zones + hand visible below on 375px viewport without scrolling."

### Question 2: Content below height cap — accessible or cut off?

| Option | Description | Selected |
|--------|-------------|----------|
| Reachable via down-arrow pan | Down-arrow pan scrolls inner canvas vertically. Consistent with horizontal model. | ✓ |
| Just cut off (simpler) | Cards below cap not accessible on mobile. Horizontal-only pan. | |

**User's choice:** Reachable via down-arrow pan
**Notes:** All four pan directions supported. Same code, same EdgeArrow component for all directions.

---

## Arrow feel / trigger

### Question 1: Arrows on desktop too, or mobile only?

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile only (< 640px) | Arrows hidden on desktop. Simple, matches mobile-phase framing. | |
| Whenever content overflows (any viewport) | Arrows appear whenever a card is outside the visible area, any device. | ✓ |

**User's choice:** Whenever content overflows (any viewport)
**Notes:** Consistent model — same behavior regardless of device. No extra work since overflow detection is the same code.

### Question 2: Arrow styling — spike style or shadcn tokens?

| Option | Description | Selected |
|--------|-------------|----------|
| Spike style is fine | rgba(255,255,255,0.15), backdrop-blur(4px), rotated ‹ glyph. Works on dark felt. | ✓ |
| Match existing UI (shadcn tokens) | bg-card/60 or bg-muted/40 with border tokens. More polished. | |

**User's choice:** Spike style is fine
**Notes:** No need to match shadcn tokens. Spike visuals are acceptable for production.

### Question 3: Additional pan/drag conflict concerns?

| Option | Description | Selected |
|--------|-------------|----------|
| Spike approach is sufficient | stopPropagation + pointerDown isolation validated. No additional guards needed. | ✓ |
| Need to discuss edge cases | Touch starts on card near arrow, simultaneous touch scenarios. | |

**User's choice:** Spike approach is sufficient

---

## Claude's Discretion

- Exact `max-h-[Xpx]` value for mobile canvas height cap — tuning to fit at 375px viewport while keeping spread + hand visible
- `PADDING` constant for inner canvas size computation (spike used implicit margin; 48px is the suggested starting point)
- Whether to expose scroll offset via ref or prop from CanvasZone up to BoardDragLayer (implementation choice for clamping math)

## Deferred Ideas

None — discussion stayed within phase scope.
