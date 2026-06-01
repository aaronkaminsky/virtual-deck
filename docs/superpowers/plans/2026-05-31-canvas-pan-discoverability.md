# Canvas Pan Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dragging the empty canvas felt the primary way to pan the free-canvas play area, keep the edge arrows as a tappable "more content this way" cue, and only capture drags when there is off-screen content — so an empty canvas still scrolls the page natively.

**Architecture:** All work is client-side in `CanvasZone` plus pure helpers in `canvas-utils.ts`. Pan math (clamping, per-axis `touch-action`, nudge step) is extracted into pure functions for Vitest unit tests; DOM wiring (pointer handlers, edge-arrow tap-nudge, visual cue) is covered by Playwright. No server, protocol, or game-state changes.

**Tech Stack:** React 18 + TypeScript, dnd-kit (existing card drag), Vitest (node env, `tests/**/*.test.ts`), Playwright (chromium, `playwright/*.spec.ts`).

---

## Design reference

Spec: `docs/superpowers/specs/2026-05-31-canvas-pan-discoverability-design.md`

## Existing code facts (verified)

- `src/components/CanvasZone.tsx`:
  - Outer **viewport** div (`data-testid="canvas-zone"`, `overflow-hidden`) currently has `onClick={onDeselectAll}` and no `style`.
  - Inner **canvas** div (`data-testid="canvas-inner"`) is positioned via `transform: translate(-scroll.x, -scroll.y)`.
  - `scroll` state `{x,y}`; `viewportSize` `{w,h}`; derived `innerW/innerH`; `hasOverflow` object `{left,right,up,down}` (booleans).
  - `startPan`/`stopPan` drive a `setInterval` pan loop via `panIntervalRef`; `PAN_STEP = 8`, `PAN_INTERVAL = 16`.
  - `EdgeArrow` subcomponent: interactive div with `data-testid="edge-arrow-${dir}"`, `onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}`, `onPointerUp/Leave/Cancel={onPanEnd}`, styled as a faint pill.
- `src/components/CanvasDraggableCard.tsx`: card root has `data-card-id` and `touchAction:'none'`; `stopPropagation` is only on its `onClick` (pointerdown bubbles).
- `src/components/CanvasControls.tsx`: buttons inside the viewport; container `onClick` stops propagation (but pointerdown does not).
- `src/lib/canvas-utils.ts`: exports `CARD_W`, `CARD_H`, `STACK_SHADOW`, `getCardDimensions`, `coversMajority`.
- Vitest: `vitest.config.ts` includes `tests/**/*.test.ts`, `globals: true`, `@` → `src`.
- Playwright: `playwright.config.ts` `testDir: './playwright'`, chromium-only. Specs define local `joinRoom`/`dealCards` helpers (see `playwright/mobile.spec.ts`). dnd-kit drags use `mouse.move/down/move(steps:15)/up`. Transform read via `getComputedStyle(el).transform` on `[data-testid="canvas-inner"]`.

**Prerequisite for Playwright tasks:** both dev servers running — `npm run dev` (PartyKit, port 1999) and `npm run dev:client` (Vite, port 5173) in separate terminals. Then `npm run test:e2e`.

---

### Task 1: Pure pan-math helpers + unit tests

**Files:**
- Modify: `src/lib/canvas-utils.ts`
- Test: `tests/canvasPan.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/canvasPan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  clampScroll,
  touchActionForOverflow,
  nudgeDelta,
  PAN_TAP_THRESHOLD_PX,
  NUDGE_FRACTION,
} from "@/lib/canvas-utils";

describe("clampScroll", () => {
  it("clamps to [0, inner - viewport] on both axes", () => {
    // inner 1000x800, viewport 400x300 → max scroll 600x500
    expect(clampScroll(700, 900, 1000, 800, 400, 300)).toEqual({ x: 600, y: 500 });
    expect(clampScroll(-50, -10, 1000, 800, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(clampScroll(123, 45, 1000, 800, 400, 300)).toEqual({ x: 123, y: 45 });
  });

  it("clamps to 0 when content is not larger than the viewport", () => {
    expect(clampScroll(50, 50, 300, 200, 400, 300)).toEqual({ x: 0, y: 0 });
  });
});

describe("touchActionForOverflow", () => {
  it("returns auto when nothing overflows", () => {
    expect(touchActionForOverflow({ left: false, right: false, up: false, down: false })).toBe("auto");
  });
  it("returns pan-y when only horizontal overflows (browser keeps vertical page scroll)", () => {
    expect(touchActionForOverflow({ left: false, right: true, up: false, down: false })).toBe("pan-y");
  });
  it("returns pan-x when only vertical overflows", () => {
    expect(touchActionForOverflow({ left: false, right: false, up: false, down: true })).toBe("pan-x");
  });
  it("returns none when both axes overflow", () => {
    expect(touchActionForOverflow({ left: true, right: false, up: false, down: true })).toBe("none");
  });
});

describe("nudgeDelta", () => {
  it("moves half a viewport in the arrow's direction", () => {
    expect(nudgeDelta("right", 400, 300)).toEqual({ dx: 200, dy: 0 });
    expect(nudgeDelta("left", 400, 300)).toEqual({ dx: -200, dy: 0 });
    expect(nudgeDelta("down", 400, 300)).toEqual({ dx: 0, dy: 150 });
    expect(nudgeDelta("up", 400, 300)).toEqual({ dx: 0, dy: -150 });
  });
});

describe("constants", () => {
  it("exposes a small tap threshold and a half-viewport nudge fraction", () => {
    expect(PAN_TAP_THRESHOLD_PX).toBe(6);
    expect(NUDGE_FRACTION).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/canvasPan.test.ts`
Expected: FAIL — `clampScroll`, `touchActionForOverflow`, `nudgeDelta`, `PAN_TAP_THRESHOLD_PX`, `NUDGE_FRACTION` are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/canvas-utils.ts`:

```ts
export const PAN_TAP_THRESHOLD_PX = 6;
export const NUDGE_FRACTION = 0.5; // a single arrow tap pans half a viewport

export type PanDir = "left" | "right" | "up" | "down";
export type Overflow = { left: boolean; right: boolean; up: boolean; down: boolean };

export function clampScroll(
  x: number,
  y: number,
  innerW: number,
  innerH: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(innerW - viewportW, x)),
    y: Math.max(0, Math.min(innerH - viewportH, y)),
  };
}

export function touchActionForOverflow(o: Overflow): "auto" | "pan-x" | "pan-y" | "none" {
  const horiz = o.left || o.right;
  const vert = o.up || o.down;
  if (horiz && vert) return "none";
  if (horiz) return "pan-y"; // browser scrolls the page vertically; we pan horizontally
  if (vert) return "pan-x";
  return "auto";
}

export function nudgeDelta(dir: PanDir, viewportW: number, viewportH: number): { dx: number; dy: number } {
  const stepX = viewportW * NUDGE_FRACTION;
  const stepY = viewportH * NUDGE_FRACTION;
  switch (dir) {
    case "left":  return { dx: -stepX, dy: 0 };
    case "right": return { dx: stepX, dy: 0 };
    case "up":    return { dx: 0, dy: -stepY };
    case "down":  return { dx: 0, dy: stepY };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/canvasPan.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/canvas-utils.ts tests/canvasPan.test.ts
git commit -m "feat(999.42): pure canvas pan-math helpers (clamp, touch-action, nudge)"
```

---

### Task 2: Drag empty felt to pan + tap-to-deselect + per-axis touch-action

**Files:**
- Modify: `src/components/CanvasZone.tsx`
- Test: `playwright/canvasPan.spec.ts` (create)

- [ ] **Step 1: Write the failing Playwright tests**

Create `playwright/canvasPan.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinRoom(page: Page, roomCode: string) {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill('PanTest');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
}

// Place a hand card near the right edge of the canvas so the canvas overflows right.
async function createRightOverflow(page: Page) {
  await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  const firstCard = page.getByTestId('hand-zone').locator('[role="button"]').first();
  const srcBox = await firstCard.boundingBox();
  if (!srcBox) throw new Error('no hand card');
  const canvasBox = await page.getByTestId('canvas-zone').boundingBox();
  if (!canvasBox) throw new Error('no canvas');
  await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
  await page.mouse.down();
  // drop near the right edge of the canvas viewport to force right overflow
  await page.mouse.move(canvasBox.x + canvasBox.width - 10, canvasBox.y + canvasBox.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();
}

function innerTransform(page: Page) {
  return page.locator('[data-testid="canvas-inner"]').evaluate((el) => getComputedStyle(el).transform);
}

test.describe('999.42 canvas drag-to-pan', () => {
  test('dragging empty felt pans the canvas', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await innerTransform(page);

    // Drag on an empty part of the felt (bottom-center, away from the right-edge card/arrow)
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const startX = canvas.x + canvas.width / 2;
    const startY = canvas.y + canvas.height - 40;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 150, startY, { steps: 15 }); // drag left → pan right
    await page.mouse.up();

    const after = await innerTransform(page);
    expect(after).not.toEqual(before);
    expect(after).toContain('matrix');
  });

  test('dragging a card does not pan (transform unchanged)', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await innerTransform(page);

    // Drag an on-canvas card a short distance — this moves the card, not the view.
    const card = page.locator('[data-card-id]').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('no canvas card');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 + 20, { steps: 15 });
    await page.mouse.up();

    const after = await innerTransform(page);
    expect(after).toEqual(before); // view did not pan
  });

  test('tapping empty felt deselects', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    // Select a canvas card (click toggles selection)
    const card = page.locator('[data-card-id]').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    // Tap (no movement) on empty felt → deselect. Use bottom-left: no overflow arrow there
    // (only the right edge overflows) and away from the right-edge card.
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas');
    await page.mouse.move(canvas.x + 40, canvas.y + canvas.height - 30);
    await page.mouse.down();
    await page.mouse.up();

    await expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  test('tapping a canvas control does not deselect', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    // Select the (single) canvas card.
    const card = page.locator('[data-card-id]').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    // Clicking the Select-all control must NOT trigger the viewport tap-deselect:
    // the card stays selected (the pointerdown guard skips the controls button).
    await page.getByTestId('canvas-select-all').click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('empty canvas keeps native scroll (touch-action auto)', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    // No cards dealt to canvas → no overflow
    const ta = await page.getByTestId('canvas-zone').evaluate((el) => getComputedStyle(el).touchAction);
    expect(ta).toBe('auto');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: FAIL — drag pans nothing yet (`before === after`), tap-deselect may pass coincidentally via existing `onClick`, `touch-action` is unset (computes to `auto` by default so that test may pass). The drag-to-pan and card-drag tests must fail.

- [ ] **Step 3: Add pointer-pan handlers and touch-action to `CanvasZone`**

In `src/components/CanvasZone.tsx`, update the import from canvas-utils (only what Task 2 uses — `nudgeDelta` is added in Task 3 to avoid an unused-import error):

```ts
import { coversMajority, getCardDimensions, clampScroll, touchActionForOverflow, PAN_TAP_THRESHOLD_PX, type PanDir } from '@/lib/canvas-utils';
```

Remove the local `type PanDir = 'left' | 'right' | 'up' | 'down';` declaration near the top of the file (now imported from canvas-utils).

Inside the `CanvasZone` component body, after the `scroll`/`viewportSize` state declarations, add a pan-gesture ref:

```ts
  // Drag-to-pan gesture state (refs, not state — live values inside pointer handlers, no re-render churn)
  const dragPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollX: number;
    startScrollY: number;
    moved: number;
  } | null>(null);
```

Add the three handlers (place them after `startPan`/`stopPan`, before the `return`):

```ts
  // Drag-to-pan: only when the press lands on empty felt (not a card or a control).
  // Edge arrows stopPropagation on pointerdown, so they never reach here.
  const onViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-card-id], button')) return;
    dragPanRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollX: scroll.x,
      startScrollY: scroll.y,
      moved: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = dragPanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    p.moved = Math.max(p.moved, Math.hypot(dx, dy));
    setScroll(clampScroll(p.startScrollX - dx, p.startScrollY - dy, innerW, innerH, viewportSize.w, viewportSize.h));
  };

  const onViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = dragPanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    dragPanRef.current = null;
    if (p.moved < PAN_TAP_THRESHOLD_PX) onDeselectAll(); // it was a tap, not a pan
  };

  const onViewportPointerCancel = () => {
    dragPanRef.current = null;
  };
```

Update the outer viewport div: remove `onClick={onDeselectAll}`, add the pointer handlers and the per-axis `touch-action` style. Replace:

```tsx
    <div
      ref={viewportRef}
      aria-label="Play area"
      data-testid="canvas-zone"
      onClick={onDeselectAll}
      className={cn(
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-felt',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
```

with:

```tsx
    <div
      ref={viewportRef}
      aria-label="Play area"
      data-testid="canvas-zone"
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerCancel}
      style={{ touchAction: touchActionForOverflow(hasOverflow) }}
      className={cn(
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-felt',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
```

- [ ] **Step 4: Run tests to verify they pass**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: PASS — drag pans, card-drag does not pan, tap deselects, control tap keeps selection, empty canvas `touch-action: auto`.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors (`PanDir` now imported; local declaration removed).

- [ ] **Step 6: Commit**

```bash
git add src/components/CanvasZone.tsx playwright/canvasPan.spec.ts
git commit -m "feat(999.42): drag empty canvas to pan; tap-to-deselect; per-axis touch-action"
```

---

### Task 3: Edge-arrow tap-to-nudge + hold-to-repeat

**Files:**
- Modify: `src/components/CanvasZone.tsx`
- Test: `playwright/canvasPan.spec.ts` (add tests)

- [ ] **Step 1: Add failing Playwright tests**

Append inside the `test.describe('999.42 canvas drag-to-pan', ...)` block in `playwright/canvasPan.spec.ts`:

```ts
  test('a quick tap on an edge arrow nudges the view', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await innerTransform(page);

    // Quick tap (down+up, no hold) on the right arrow → one half-viewport nudge
    const arrow = await page.locator('[data-testid="edge-arrow-right"]').boundingBox();
    if (!arrow) throw new Error('no arrow');
    await page.mouse.move(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    const after = await innerTransform(page);
    expect(after).not.toEqual(before); // a single tap moved the view
  });

  test('holding an edge arrow keeps panning past the first nudge', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const arrow = await page.locator('[data-testid="edge-arrow-right"]').boundingBox();
    if (!arrow) throw new Error('no arrow');

    await page.mouse.move(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    await page.mouse.down();
    const afterNudge = await innerTransform(page); // immediate nudge already applied
    await page.waitForTimeout(450); // past the 250ms repeat delay + a few ticks
    const afterHold = await innerTransform(page);
    await page.mouse.up();

    expect(afterHold).not.toEqual(afterNudge); // continuous pan advanced beyond the nudge
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: FAIL — current `startPan` begins a slow `PAN_STEP` interval immediately; a quick tap fires ~0 ticks (≤16ms) so `before === after`, and there is no distinct immediate nudge.

- [ ] **Step 3: Rewrite the pan loop to nudge-then-repeat**

In `src/components/CanvasZone.tsx`, add `nudgeDelta` to the canvas-utils import (it is now used by `nudge`):

```ts
import { coversMajority, getCardDimensions, clampScroll, touchActionForOverflow, nudgeDelta, PAN_TAP_THRESHOLD_PX, type PanDir } from '@/lib/canvas-utils';
```

Add a timeout ref alongside `panIntervalRef`:

```ts
  const panIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Replace the existing `stopPan` and `startPan` definitions with:

```ts
  // stopPan: clears both the repeat-delay timeout and the continuous interval.
  const stopPan = useCallback(() => {
    if (panTimeoutRef.current) {
      clearTimeout(panTimeoutRef.current);
      panTimeoutRef.current = null;
    }
    if (panIntervalRef.current) {
      clearInterval(panIntervalRef.current);
      panIntervalRef.current = null;
    }
  }, []);

  // nudge: a single half-viewport step toward the arrow's direction (clamped).
  const nudge = useCallback((dir: PanDir) => {
    const { dx, dy } = nudgeDelta(dir, viewportSize.w, viewportSize.h);
    setScroll(prev => clampScroll(prev.x + dx, prev.y + dy, innerW, innerH, viewportSize.w, viewportSize.h));
  }, [viewportSize, innerW, innerH]);

  // startPan: fire an immediate nudge (so a tap always moves), then — if still held
  // after a short delay — begin continuous PAN_STEP panning. Classic button-repeat.
  // CRITICAL: innerW/innerH are dynamic; they MUST stay in deps (Pitfall 4 from Spike003).
  const startPan = useCallback((dir: PanDir) => {
    stopPan();
    nudge(dir);
    panTimeoutRef.current = setTimeout(() => {
      panIntervalRef.current = setInterval(() => {
        setScroll(prev => clampScroll(
          prev.x + (dir === 'left' ? -PAN_STEP : dir === 'right' ? PAN_STEP : 0),
          prev.y + (dir === 'up' ? -PAN_STEP : dir === 'down' ? PAN_STEP : 0),
          innerW, innerH, viewportSize.w, viewportSize.h,
        ));
      }, PAN_INTERVAL);
    }, 250);
  }, [stopPan, nudge, viewportSize, innerW, innerH]);
```

(The existing `useEffect(() => () => stopPan(), [stopPan])` cleanup stays and now also clears the timeout.)

- [ ] **Step 4: Run tests to verify they pass**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: PASS — tap nudges; hold advances past the nudge. Existing `playwright/mobile.spec.ts` "holding the right arrow pans" test still passes (hold still pans).

- [ ] **Step 5: Run the existing mobile suite for regressions**

Run (servers up): `npm run test:e2e -- mobile`
Expected: PASS (edge-arrow hold-to-pan and "press arrow does not drag card" unaffected).

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck` (expected: no errors)

```bash
git add src/components/CanvasZone.tsx playwright/canvasPan.spec.ts
git commit -m "feat(999.42): edge-arrow tap nudges half a viewport, hold repeats"
```

---

### Task 4: Treatment-C visual cue (edge scrim + soft pulse)

**Files:**
- Modify: `src/components/CanvasZone.tsx` (the `EdgeArrow` subcomponent)
- Modify: `src/globals.css`
- Test: `playwright/canvasPan.spec.ts` (add a presence assertion)

- [ ] **Step 1: Add the pulse keyframe**

Append to `src/globals.css`:

```css
@keyframes canvas-edge-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
```

- [ ] **Step 2: Add a failing Playwright assertion**

Append inside the describe block in `playwright/canvasPan.spec.ts`:

```ts
  test('overflowing edge shows the scrim cue and the chevron stays tappable', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    // The new ambient scrim cue renders on the overflowing edge…
    await expect(page.locator('[data-testid="edge-scrim-right"]')).toBeVisible();
    // …and the existing chevron target is still present and usable.
    await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();
  });
```

- [ ] **Step 3: Run to verify it fails**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: FAIL — `[data-testid="edge-scrim-right"]` does not exist yet.

- [ ] **Step 4: Restyle `EdgeArrow` to treatment C**

In `src/components/CanvasZone.tsx`, replace the entire `EdgeArrow` function body's `return (...)` with a fragment that renders a non-interactive scrim plus the (restyled) interactive chevron. Replace:

```tsx
  return (
    <div
      data-testid={`edge-arrow-${dir}`}
      aria-label={
        dir === 'left'  ? 'Pan canvas left' :
        dir === 'right' ? 'Pan canvas right' :
        dir === 'up'    ? 'Pan canvas up' :
                          'Pan canvas down'
      }
      onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
      onPointerUp={onPanEnd}
      onPointerLeave={onPanEnd}
      onPointerCancel={onPanEnd}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'absolute',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dir === 'left' || dir === 'right' ? 32 : 80,
        height: dir === 'left' || dir === 'right' ? 80 : 32,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
        borderRadius: 6,
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        ...posStyle,
      }}
    >
      <span style={{
        color: 'white',
        fontSize: 20,
        lineHeight: 1,
        display: 'block',
        transform: `rotate(${rotate})`,
        opacity: 0.9,
      }}>
        {label}
      </span>
    </div>
  );
```

with:

```tsx
  const horizontal = dir === 'left' || dir === 'right';
  // CSS edge property for this direction ('up'/'down' are not CSS props → top/bottom).
  const edge: 'left' | 'right' | 'top' | 'bottom' =
    dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir;

  // Non-interactive gradient scrim along the overflowing edge ("more this way").
  const scrimStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 999,
    pointerEvents: 'none',
    background:
      dir === 'left'  ? 'linear-gradient(to left,  rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)' :
      dir === 'right' ? 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)' :
      dir === 'up'    ? 'linear-gradient(to top,   rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)' :
                        'linear-gradient(to bottom,rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)',
    ...(horizontal
      ? { top: 0, bottom: 0, width: 64, [edge]: 0 }
      : { left: 0, right: 0, height: 64, [edge]: 0 }),
  };

  return (
    <>
      <div data-testid={`edge-scrim-${dir}`} aria-hidden="true" style={scrimStyle} />
      <div
        data-testid={`edge-arrow-${dir}`}
        aria-label={
          dir === 'left'  ? 'Pan canvas left' :
          dir === 'right' ? 'Pan canvas right' :
          dir === 'up'    ? 'Pan canvas up' :
                            'Pan canvas down'
        }
        onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
        onPointerUp={onPanEnd}
        onPointerLeave={onPanEnd}
        onPointerCancel={onPanEnd}
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'absolute',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: horizontal ? 34 : 80,
          height: horizontal ? 80 : 34,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          ...posStyle,
        }}
      >
        <span style={{
          color: 'white',
          fontSize: 26,
          lineHeight: 1,
          display: 'block',
          transform: `rotate(${rotate})`,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          animation: 'canvas-edge-pulse 1.6s ease-in-out infinite',
        }}>
          {label}
        </span>
      </div>
    </>
  );
```

- [ ] **Step 5: Run to verify it passes**

Run (servers up): `npm run test:e2e -- canvasPan`
Expected: PASS — scrim present, chevron present.

- [ ] **Step 6: Manual visual check**

With dev servers running, open the app, deal cards, drag one near an edge to overflow. Confirm: a soft dark gradient hugs the overflowing edge with a gently pulsing chevron; tapping it nudges; holding pans; dragging empty felt pans.

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck` (expected: no errors)

```bash
git add src/components/CanvasZone.tsx src/globals.css playwright/canvasPan.spec.ts
git commit -m "feat(999.42): treatment-C edge cue — gradient scrim + pulsing chevron"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: PASS, including `tests/canvasPan.test.ts`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Full e2e (servers up)**

Run: `npm run test:e2e`
Expected: PASS — `canvasPan`, `mobile`, `canvasMulticard`, `responsive`, `game` all green.

- [ ] **Step 4: Manual cross-check against the spec interaction model**

Confirm each, in the running app:
- Drag empty felt → view follows finger 1:1, stops on release.
- Tap empty felt → deselects.
- Drag a card → moves the card, view does not pan.
- Tap an edge arrow → visible half-viewport nudge.
- Hold an edge arrow → continuous pan.
- Empty/non-overflowing canvas → page scroll still works on a narrow (<640px) viewport; arrows/scrim absent.

- [ ] **Step 5: Update the roadmap**

Add a milestone entry to `.planning/ROADMAP.md` under Milestones (follow the existing format), e.g.:
`- ✅ **v1.9 Canvas Pan Discoverability** — 999.42 (shipped <date>)`

```bash
git add .planning/ROADMAP.md
git commit -m "docs(999.42): record canvas pan discoverability milestone"
```

- [ ] **Step 6: Open the PR**

```bash
git push -u origin docs/canvas-pan-discoverability
gh pr create --fill
```

(The branch already carries the design-spec commit; the PR bundles spec + implementation.)

---

## Self-review notes

- **Spec coverage:** drag-to-pan (Task 2), tap-deselect + tap-vs-drag threshold (Task 2), drag-card-still-moves (Task 2), per-axis overflow-conditional `touch-action` (Tasks 1+2), control-tap guard (Task 2), arrow tap-nudge + hold-repeat (Task 3), treatment-C cue (Task 4), no-momentum/no-tutorial honored (nothing adds them), chromium-only caveat acknowledged (manual checks in Tasks 4–5). WebKit Playwright project intentionally left as a backlog follow-up, not implemented here.
- **Naming consistency:** `clampScroll`, `touchActionForOverflow`, `nudgeDelta`, `PanDir`, `Overflow`, `PAN_TAP_THRESHOLD_PX`, `NUDGE_FRACTION` used identically across canvas-utils, CanvasZone, and tests. `data-testid="edge-scrim-${dir}"` and `edge-arrow-${dir}` consistent between component and tests.
- **No placeholders:** every code step shows full code; every run step shows command + expected result.
