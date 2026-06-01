# Design: Discoverable Canvas Panning (999.42)

**Date:** 2026-05-31
**Status:** Approved

## Goal

Make panning the free-canvas play area intuitive and discoverable. Today the only way to move the canvas is to **press and hold** a faint edge-arrow chevron; the arrows appear only when content overflows an edge, and a *tap* on one does nothing. A player (on iPad Safari, but the issue is not platform-specific) reported this as broken — they tapped the arrows repeatedly, saw no response, and concluded scrolling was unavailable. The mechanism worked as designed; the design was undiscoverable.

This change makes **dragging the empty felt** the primary pan gesture (the universal canvas/map instinct), keeps the edge arrows as a secondary path and an ambient "more content this way" cue, and makes an arrow *tap* produce visible movement.

This is a UX/discoverability change, not a bug fix. All work is contained to the client; there are no server, protocol, or game-state changes.

## Background: why arrows exist today

Spike003 deliberately chose hold-to-pan edge arrows over drag-to-pan because drag-to-pan would collide with drag-to-move-a-card on the same surface. That collision only exists when the drag **starts on a card** — cards are dnd-kit draggables that own their pointer interaction; the empty felt is not. So "drag a card → move it, drag empty felt → pan" separates cleanly by where the pointer lands, which is the same split Figma/Miro use. This design exploits that separation rather than reopening the Spike003 decision.

Relevant existing facts (verified in code):

- `CanvasZone` renders an **outer viewport div** (`overflow-hidden`, ResizeObserver target) and an **inner canvas div** positioned via `transform: translate(-scroll.x, -scroll.y)`. Pan = mutating the `scroll` state; clamp math against `innerW/innerH` and `viewportSize` already exists (`startPan`).
- The DndContext (`BoardDragLayer`) sensors: `PointerSensor` (`activationConstraint: { distance: 8 }`) and `TouchSensor` (`activationConstraint: { delay: 250, tolerance: 5 }`). On touch, grabbing a card requires a ~250ms hold, so a quick finger-swipe will not accidentally pick up a card.
- `CanvasDraggableCard` stops propagation only on its **click** handler, not pointerdown, and tags its root with `data-card-id`. A viewport pan handler can therefore distinguish "pointerdown landed on a card" (ignore) from "landed on empty felt" (pan) via `e.target.closest('[data-card-id]')`.
- `EdgeArrow` already calls `e.stopPropagation()` on pointerdown, so arrow presses will not reach a viewport pan handler — no extra guard needed for arrows.
- The outer viewport currently uses `onClick={onDeselectAll}`.

## Non-Goals

- **Momentum / inertia.** Pan is strict 1:1 and stops on release. Flick-to-glide is deferred to the backlog.
- **First-run tutorial / hint overlay.** The gesture plus the treatment-C cue should carry discoverability. Revisit only if it still confuses users.
- **Switching to native scroll / scrollbars.** Keep the existing transform-based pan model.
- **Server, protocol, or game-state changes.** None.
- **Arrow re-architecture.** Arrows keep hold-to-pan; we only add tap-to-nudge and a new visual treatment.

## Interaction model

1. **Drag empty felt to pan** (mouse + touch): press on empty canvas and move; the view follows the pointer 1:1; release stops. No momentum.
2. **Tap empty felt** (press + release without crossing a small movement threshold, ~6px): deselect all — today's behavior, preserved. A drag past the threshold suppresses the deselect.
3. **Drag starting on a card**: moves the card. Unchanged (touch still requires the 250ms hold).
4. **Edge arrows** (rendered only for edges that overflow):
   - **Tap → nudge** ~half a viewport in that direction.
   - **Press-and-hold → continuous pan** (unchanged behavior).
   - On press, fire one immediate nudge, then begin hold-repeat (the classic scrollbar-button-repeat pattern). This guarantees a tap always produces visible movement, directly resolving the "tapped, nothing happened" complaint.
5. **Pan engages only when there is somewhere to pan.** If an axis has no overflow, drags on that axis are not captured and fall through to native page scroll (see below).

## Overflow-conditional capture (per-axis)

Drag-to-pan must not swallow gestures when the canvas already fits the viewport. On phones (`<640px`) the board container is natively scrollable (`overflow-y-auto`); capturing a drag with nowhere to pan would block page scrolling. So capture is conditioned on actual overflow, expressed per-axis via `touch-action` on the viewport background:

| Overflow state | `touch-action` | Result |
|----------------|----------------|--------|
| Neither axis overflows | `auto` | Pan handler does not engage; native page scroll, exactly as today. |
| Only horizontal overflows | `pan-y` | Browser scrolls the page vertically; we pan the canvas horizontally. |
| Only vertical overflows | `pan-x` | We pan vertically; browser scrolls page horizontally. |
| Both axes overflow | `none` | We handle both. |

The pan handler clamps per-axis against existing bounds, so a diagonal drag only moves the axis that has off-screen content. Because the treatment-C cue is also rendered per-overflowing-edge, the visible affordance and the captured gesture are always in sync.

On iPad (`≥640px`) the board is `sm:overflow-hidden`, so there is no page scroll to fall through to; the per-axis rule still applies and simply means "no pan when nothing overflows."

## Visual cue (treatment C)

Replace the faint pill chevron with an ambient "more this way" cue on each overflowing edge:

- A faint gradient **scrim** along the edge (transparent → ~28% black) suggesting content continues past it.
- A gently **pulsing chevron** pointing toward the off-screen content.
- Rendered only for edges with overflow (same visibility condition as today).

The chevron remains the tap/hold target. The half-hidden card that naturally peeks past an overflowing edge reinforces the signal once drag-to-pan exists.

## Implementation outline

All changes are within `src/components/CanvasZone.tsx` (plus its `EdgeArrow` subcomponent). No new files or types.

1. **Viewport pan handlers.** Add `onPointerDown` / `onPointerMove` / `onPointerUp` (+ `onPointerCancel`) to the outer viewport div:
   - `onPointerDown`: ignore if the pointer landed on a card or an interactive control — i.e. `e.target.closest('[data-card-id], button')` is non-null (let dnd-kit handle card drags; let `CanvasControls` buttons handle their own taps). Edge arrows already `stopPropagation`, so they never reach this handler. Otherwise record the pointer origin and current `scroll`, set a "panning" flag, and `setPointerCapture` so drags continue outside the viewport.
   - `onPointerMove`: while panning, set `scroll` to origin-scroll minus pointer delta, clamped per-axis to `[0, innerW - viewportW]` / `[0, innerH - viewportH]`. Track total movement.
   - `onPointerUp` / `onPointerCancel`: clear the panning flag; if total movement `< ~6px`, treat as a tap and call `onDeselectAll`.
   - Replace the existing `onClick={onDeselectAll}` with this tap detection (avoids double-firing and respects the drag-suppression).
2. **Per-axis `touch-action`.** Compute the viewport background's `touch-action` from the existing `hasOverflow` object per the table above.
3. **Arrow tap-to-nudge.** In `EdgeArrow` / its pan callbacks: on press, perform one immediate nudge of ~half the viewport extent along that axis (clamped), then start the existing hold-repeat interval. Keep the existing pointerup/leave/cancel cleanup.
4. **Treatment-C styling.** Swap the pill for the scrim + pulsing-chevron treatment, keyed to the same per-edge overflow visibility.

### Boundaries between units

- The pan/tap logic is local viewport state (`scroll`, a panning flag, a movement accumulator) — no shared or server state. It consumes only existing `innerW/innerH/viewportSize` and calls the existing `onDeselectAll`.
- Arrow nudge reuses the existing clamp/scroll-step logic; its only new responsibility is the immediate-nudge-then-repeat timing.
- The visual cue is presentational, driven entirely by the existing `hasOverflow` flags.

## Testing

- **Vitest:** tap-vs-drag threshold (movement `< 6px` deselects, `≥ 6px` pans and suppresses deselect); per-axis clamp bounds; `touch-action` derivation from overflow state; nudge step size and clamping.
- **Playwright (chromium):** dragging empty canvas pans toward off-screen cards; dragging a card still moves the card; tapping an arrow nudges; tapping empty felt deselects; tapping a `CanvasControls` button does **not** deselect or pan; a canvas with no overflow does not capture drags.
- **Caveat:** Playwright runs chromium-only, so true iOS Safari behavior remains **manually verified** — this was the original blind spot. Adding a WebKit Playwright project is noted as an optional follow-up, not part of this change.

## Backlog follow-ups (out of scope here)

- Momentum / inertial panning.
- Optional WebKit Playwright project for Safari-engine coverage.
