---
phase: 35-mobile
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - playwright/mobile.spec.ts
  - playwright/responsive.spec.ts
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/CanvasZone.tsx
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-05-26
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five source files were reviewed: the two new Playwright test files for mobile/responsive behavior, the `CanvasZone` component (which implements the edge-pan feature), `BoardDragLayer` (which computes drop coordinates), and `BoardView` (layout container).

The edge-pan mechanics in `CanvasZone` are structurally sound — the ResizeObserver + scroll-state + interval-pan pattern is correct in isolation. However, the coordinate math in `BoardDragLayer` contains a double-counted scroll offset that produces wrong drop positions for any hand-or-pile-to-canvas drag performed after the user has panned the canvas. The `EdgeArrow` component is also missing `onPointerCancel` handling, which on a real touch device will leave the pan interval running indefinitely if the OS cancels the pointer sequence (e.g., a home-gesture swipe). Neither of these failure modes is exercised by the new tests.

The test file contains three tests all carrying the `MOBILE-01` label, creating ambiguity in CI reporting. Two quality defects round out the findings.

---

## Critical Issues

### CR-01: Scroll offset double-counted in hand/pile-to-canvas drop coordinates

**File:** `src/components/BoardDragLayer.tsx:408-416` (and duplicated at lines 319-324)

**Issue:** `canvasRef` is attached to the **inner translated canvas div** (see `CanvasZone.tsx:98-101`). When the user has panned the canvas by `scroll.x` pixels, the inner div's `getBoundingClientRect().left` is already `viewport_left - scroll.x` — it reflects the visual translation. The code then adds `scrollOffsetRef.current.x` (which also equals `scroll.x`) as an explicit adjustment, double-counting the offset:

```
base_x = pointerFinalX - canvasBounds.left - CARD_W/2 + scrollX
       = pointerFinalX - (viewportLeft - scroll.x) - CARD_W/2 + scroll.x
       = pointerFinalX - viewportLeft + 2·scroll.x - CARD_W/2   // ← scroll.x counted twice
```

The correct result requires `scroll.x` once:

```
correct_x = pointerFinalX - viewportLeft + scroll.x - CARD_W/2
```

**Effect:** Any hand-or-pile card dropped onto a panned canvas lands `scroll.x` pixels to the right of, and `scroll.y` pixels below, the actual pointer position. At the default `PAN_STEP = 8 px` and up to hundreds of pixels of pan this produces substantially wrong placement. The error is proportional to how far the user has scrolled, so it is invisible in the test suite (all tests drop at `scroll = {0, 0}`).

The same formula is used in both the single-card path (lines 409-414) and the group-drag path (lines 319-324).

**Fix:** Either (a) switch the `getBoundingClientRect()` call to use `viewportRef` (the outer, un-translated div) instead of `canvasRef`, which is the outer div's reference already available in `CanvasZone` — or (b) remove the explicit `+scrollX / +scrollY` addend from the formula since `canvasBounds.left/.top` already incorporates the translation:

```typescript
// Option B — remove the explicit scroll compensation (canvasBounds already encodes it)
const baseX = pointerFinalX - (canvasBounds?.left ?? 0) - CARD_W / 2;
const baseY = pointerFinalY - (canvasBounds?.top ?? 0) - CARD_H / 2;
```

Apply the same removal at lines 319-324 (group path).

---

### CR-02: Missing `onPointerCancel` on `EdgeArrow` — pan interval runs indefinitely on touch interruption

**File:** `src/components/CanvasZone.tsx:44-46`

**Issue:** `EdgeArrow` stops the pan interval on `onPointerUp` and `onPointerLeave`, but not on `onPointerCancel`. On a mobile device the browser fires `pointercancel` (not `pointerup`) when it takes over a touch sequence — common triggers include home-gesture swipes, notification pull-downs, and multi-touch. When `pointercancel` fires, neither `onPointerUp` nor `onPointerLeave` fires, so `panIntervalRef.current` is never cleared. The `setInterval` at 16 ms continues running and calling `setScroll` until the component unmounts, causing continuous involuntary panning.

**Fix:** Add `onPointerCancel={onPanEnd}` to the `EdgeArrow` div alongside the existing pointer handlers:

```tsx
onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
onPointerUp={onPanEnd}
onPointerLeave={onPanEnd}
onPointerCancel={onPanEnd}   // ← add this
onContextMenu={e => e.preventDefault()}
```

---

## Warnings

### WR-01: Three tests share the identifier `MOBILE-01` — CI reporting is ambiguous

**File:** `playwright/mobile.spec.ts:21, 33, 63`

**Issue:** All three tests in the `MOBILE-01` coverage area are given the same test title string `'MOBILE-01: ...'`. Playwright does not error on duplicate titles within a `describe` block, but test reports (HTML, JUnit XML, CI dashboards) will surface three entries with identical IDs. A failure in any one of them may be misattributed to a different `MOBILE-01` case, and `--grep MOBILE-01` runs all three simultaneously rather than isolating one.

**Fix:** Use unique identifiers — `MOBILE-01a`, `MOBILE-01b`, `MOBILE-01c` — or rename them to reflect their distinct contracts:

```typescript
test('MOBILE-01: edge arrows hidden when canvas is empty', ...)
test('MOBILE-01b: edge arrows appear when canvas content overflows', ...)
test('MOBILE-01c: holding right arrow changes canvas transform', ...)
```

---

### WR-02: `EdgeArrow` div has no `role="button"` or `tabIndex` — keyboard and assistive-technology inaccessible

**File:** `src/components/CanvasZone.tsx:36-76`

**Issue:** `EdgeArrow` renders a `<div>` with `aria-label` and pointer handlers but no `role="button"` and no `tabIndex`. Screen readers cannot discover or activate the arrows. Keyboard users cannot tab to them and trigger panning. The `aria-label` is present but meaningless without a role that announces the element as interactive.

**Fix:**

```tsx
<div
  role="button"
  tabIndex={0}
  data-testid={`edge-arrow-${dir}`}
  aria-label={...}
  onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
  onPointerUp={onPanEnd}
  onPointerLeave={onPanEnd}
  onPointerCancel={onPanEnd}
  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPanStart(dir); } }}
  onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') onPanEnd(); }}
  ...
>
```

---

### WR-03: `viewportSize` initializes to `{w:0, h:0}` — spurious edge arrows flash on mount when canvas is non-empty

**File:** `src/components/CanvasZone.tsx:110, 145-149`

**Issue:** `viewportSize` starts at `{w: 0, h: 0}`. The `ResizeObserver` fires asynchronously after the first browser paint. During the render before the observer fires, `innerW` is computed as `max(0, maxX + cardW + CANVAS_PADDING)` for non-empty canvas cards, and `hasOverflow.right` evaluates to `true` because `0 < innerW - 0`. This causes a visible flash of the right (and down) edge arrows for one render frame on page load when canvas cards are present.

**Fix:** Seed `viewportSize` with the element's current dimensions synchronously on mount, before the `ResizeObserver` callback fires. A `useLayoutEffect` reading `el.clientWidth/clientHeight` immediately after the ref is attached eliminates the flicker:

```typescript
const viewportRef = useRef<HTMLDivElement>(null);

useLayoutEffect(() => {
  const el = viewportRef.current;
  if (el) setViewportSize({ w: el.clientWidth, h: el.clientHeight });
}, []); // fires synchronously after DOM paint, before browser paint
```

The `ResizeObserver` already handles subsequent resizes; this only fills the initial gap.

---

## Info

### IN-01: Pan-transform test uses `waitForTimeout(120ms)` — potential flakiness on slow CI

**File:** `playwright/mobile.spec.ts:96`

**Issue:** The test waits 120 ms expecting at least one `setInterval` tick (at 16 ms) to fire and mutate the CSS transform. In a CPU-saturated CI environment, `setInterval` callbacks can be significantly delayed by the JavaScript task queue. While 120 ms provides ~7.5× headroom over a single interval, it is still a wall-clock assertion. If the Playwright page is backgrounded or the host is loaded, the test may pass vacuously (transform changed for an unrelated reason) or fail spuriously.

**Fix:** Instead of relying on elapsed time, poll for the transform to change from its initial value, which is deterministic:

```typescript
const before = await page.locator('[data-testid="canvas-inner"]').evaluate(
  el => getComputedStyle(el).transform
);
// hold the arrow button
await page.mouse.down();
// poll until transform changes rather than waiting a fixed interval
await expect(page.locator('[data-testid="canvas-inner"]')).not.toHaveCSS('transform', before);
await page.mouse.up();
```

`expect(...).not.toHaveCSS(...)` uses Playwright's built-in retry/timeout and eliminates the hard-coded sleep.

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
