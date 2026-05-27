# Phase 35: Mobile - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 4 modified files
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/CanvasZone.tsx` | component | event-driven (pointer, ResizeObserver) | `src/spikes/Spike003EdgePan.tsx` | exact (validated spike = production source) |
| `src/components/BoardDragLayer.tsx` | controller | request-response (drag-drop) | `src/components/BoardDragLayer.tsx` (self — surgical edit) | self-edit |
| `src/components/BoardView.tsx` | component | request-response | `src/components/BoardView.tsx` (self — one CSS class) | self-edit |
| `playwright/mobile.spec.ts` | test | event-driven | `playwright/responsive.spec.ts` | exact (same viewport-override + pointer pattern) |

---

## Pattern Assignments

### `src/components/CanvasZone.tsx` (component, event-driven)

**Analog:** `src/spikes/Spike003EdgePan.tsx` (lines 1–327, read in full)

This is the primary change surface. The spike is production-ready; transplant directly. The refactor replaces the current single-div with an outer viewport div + inner canvas div, adds scroll state, `ResizeObserver`, dynamic `innerW/innerH`, and four `EdgeArrow` components.

---

**Imports pattern** — current file (`src/components/CanvasZone.tsx` lines 1–9); extend to add hooks:

```tsx
// Add to existing imports:
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
// (currently only `useMemo` is imported — add the rest)
import { getCardDimensions } from '@/lib/canvas-utils';
```

---

**PanDir type + EdgeArrow component** (`src/spikes/Spike003EdgePan.tsx` lines 81–136):

```tsx
type PanDir = 'left' | 'right' | 'up' | 'down';

interface EdgeArrowProps {
  dir: PanDir;
  visible: boolean;
  onPanStart: (dir: PanDir) => void;
  onPanEnd: () => void;
}

function EdgeArrow({ dir, visible, onPanStart, onPanEnd }: EdgeArrowProps) {
  if (!visible) return null;

  const label = '‹';
  const rotate = { left: '0deg', right: '180deg', up: '90deg', down: '270deg' }[dir];

  const posStyle: React.CSSProperties =
    dir === 'left'  ? { left: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'right' ? { right: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'up'    ? { top: 0, left: '50%', transform: 'translateX(-50%)' } :
                      { bottom: 0, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
      onPointerUp={onPanEnd}
      onPointerLeave={onPanEnd}
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
}
```

CRITICAL: Use `‹` as the only base glyph for all four directions; rotate to achieve right/up/down. Do NOT use `›` for right — this creates a double-flip bug (documented in spike README).

---

**Pan state + viewport size state** (`src/spikes/Spike003EdgePan.tsx` lines 144–158):

```tsx
// Inside CanvasZone function body — new state/refs:
const viewportRef = useRef<HTMLDivElement>(null);
const panIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const [scroll, setScroll] = useState({ x: 0, y: 0 });
const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

// ResizeObserver for viewport size tracking
useEffect(() => {
  const el = viewportRef.current;
  if (!el) return;
  const obs = new ResizeObserver(() => {
    setViewportSize({ w: el.clientWidth, h: el.clientHeight });
  });
  obs.observe(el);
  return () => obs.disconnect();
}, []);
```

---

**Dynamic inner canvas size** (35-RESEARCH.md Pattern 2 / 35-CONTEXT.md D-02):

```tsx
const CANVAS_PADDING = 48;

const { innerW, innerH } = useMemo(() => {
  const { w: cardW, h: cardH } = getCardDimensions();
  if (canvasCards.length === 0) {
    return { innerW: viewportSize.w, innerH: viewportSize.h };
  }
  const maxX = Math.max(...canvasCards.map(c => c.x + cardW));
  const maxY = Math.max(...canvasCards.map(c => c.y + cardH));
  return {
    innerW: Math.max(viewportSize.w, maxX + CANVAS_PADDING),
    innerH: Math.max(viewportSize.h, maxY + CANVAS_PADDING),
  };
}, [canvasCards, viewportSize.w, viewportSize.h]);
```

Note: `getCardDimensions()` is called inside `useMemo` so it re-evaluates on `viewportSize` changes (window resize can cross the 640px breakpoint).

---

**Overflow detection** (`src/spikes/Spike003EdgePan.tsx` lines 160–165):

```tsx
const hasOverflow = {
  left:  scroll.x > 0,
  right: scroll.x < innerW - viewportSize.w,
  up:    scroll.y > 0,
  down:  scroll.y < innerH - viewportSize.h,
};
```

---

**stopPan + startPan callbacks** (`src/spikes/Spike003EdgePan.tsx` lines 167–189):

```tsx
const stopPan = useCallback(() => {
  if (panIntervalRef.current) {
    clearInterval(panIntervalRef.current);
    panIntervalRef.current = null;
  }
}, []);

const startPan = useCallback((dir: PanDir) => {
  stopPan(); // clear any existing interval before starting new one
  panIntervalRef.current = setInterval(() => {
    setScroll(prev => {
      const dx = dir === 'left' ? -PAN_STEP : dir === 'right' ? PAN_STEP : 0;
      const dy = dir === 'up'   ? -PAN_STEP : dir === 'down'  ? PAN_STEP : 0;
      return {
        x: Math.max(0, Math.min(innerW - viewportSize.w, prev.x + dx)),
        y: Math.max(0, Math.min(innerH - viewportSize.h, prev.y + dy)),
      };
    });
  }, PAN_INTERVAL);
}, [stopPan, viewportSize, innerW, innerH]);
// ^^^^ innerW and innerH MUST be in deps — dynamic canvas is different from spike's constants

// Cleanup on unmount
useEffect(() => () => stopPan(), [stopPan]);
```

Constants (define at file top or module level):
```tsx
const PAN_STEP = 8;     // px per interval tick — spike-tuned value
const PAN_INTERVAL = 16; // ms (~60fps) — spike-tuned value
```

---

**Scroll offset exposure to BoardDragLayer** (35-RESEARCH.md Open Question 2, ref-based pattern):

```tsx
// In CanvasZoneProps — add:
scrollOffsetRef: React.MutableRefObject<{ x: number; y: number }>;

// Inside CanvasZone, keep scrollOffsetRef in sync after each scroll state update:
useEffect(() => {
  scrollOffsetRef.current = scroll;
}, [scroll, scrollOffsetRef]);
```

This is consistent with `isDraggingRef` and `dragDeltaRef` patterns already in `BoardDragLayer` (lines 86–92) — ref-based, zero re-render overhead on pan.

---

**Two-div structure with dual-ref on inner div** (`src/spikes/Spike003EdgePan.tsx` lines 253–309; current `setRefs` pattern from `CanvasZone.tsx` lines 26–29):

```tsx
// setRefs moves from the outer div to the INNER canvas div:
const setRefs = (node: HTMLDivElement | null) => {
  setNodeRef(node);  // dnd-kit droppable measures inner canvas bounds
  (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
};

return (
  // Outer viewport div — overflow:hidden, ResizeObserver target
  <div
    ref={viewportRef}
    aria-label="Play area"
    data-testid="canvas-zone"
    onClick={onDeselectAll}
    className={cn(
      'relative flex-1 min-w-0 self-stretch overflow-hidden bg-background',
      isOver && 'ring-1 ring-primary/30'
    )}
  >
    {/* Inner canvas div — dnd-kit droppable + canvasRef target */}
    <div
      ref={setRefs}
      style={{
        position: 'absolute',
        width: innerW,
        height: innerH,
        transform: `translate(${-scroll.x}px, ${-scroll.y}px)`,
      }}
    >
      {/* selection count badge, CanvasDraggableCard × N, passengerGhosts — unchanged */}
    </div>

    {/* EdgeArrows — inside outer viewport, outside inner canvas */}
    <EdgeArrow dir="left"  visible={hasOverflow.left}  onPanStart={startPan} onPanEnd={stopPan} />
    <EdgeArrow dir="right" visible={hasOverflow.right} onPanStart={startPan} onPanEnd={stopPan} />
    <EdgeArrow dir="up"    visible={hasOverflow.up}    onPanStart={startPan} onPanEnd={stopPan} />
    <EdgeArrow dir="down"  visible={hasOverflow.down}  onPanStart={startPan} onPanEnd={stopPan} />
  </div>
);
```

CRITICAL: `setRefs` (dnd-kit's `setNodeRef` + `canvasRef`) attaches to the INNER div. The outer div gets only `viewportRef`. If `setRefs` is on the outer div, `getBoundingClientRect()` returns viewport-sized bounds and clamping breaks at far canvas edges.

---

### `src/components/BoardDragLayer.tsx` (controller, request-response — surgical edit)

**Analog:** Self — two targeted surgical edits to `handleDragEnd` (lines 295–432). No structural change.

**New prop addition** — `scrollOffsetRef` passed down from `BoardDragLayer` to `CanvasZone`:

```tsx
// BoardDragLayer.tsx — add near other refs (around line 96):
const scrollOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

// Pass to BoardView → CanvasZone (add to the long prop list on line 617):
scrollOffsetRef={scrollOffsetRef}
```

---

**Scroll offset adjustment — hand/pile → canvas single-card drop** (existing pattern at lines 405–412; add scroll offset):

```tsx
// BEFORE (existing lines 405–412):
const activator = event.activatorEvent as PointerEvent;
const pointerFinalX = activator.clientX + event.delta.x;
const pointerFinalY = activator.clientY + event.delta.y;
const baseX = pointerFinalX - (canvasBounds?.left ?? 0) - CARD_W / 2;
const baseY = pointerFinalY - (canvasBounds?.top  ?? 0) - CARD_H / 2;

// AFTER — add scrollOffset to hand/pile→canvas coordinate conversion:
const activator = event.activatorEvent as PointerEvent;
const pointerFinalX = activator.clientX + event.delta.x;
const pointerFinalY = activator.clientY + event.delta.y;
const { x: scrollX, y: scrollY } = scrollOffsetRef.current;
const baseX = pointerFinalX - (canvasBounds?.left ?? 0) - CARD_W / 2 + scrollX;
const baseY = pointerFinalY - (canvasBounds?.top  ?? 0) - CARD_H / 2 + scrollY;
```

---

**Scroll offset adjustment — hand/pile → canvas GROUP drop** (existing pattern at lines 318–323; only the non-canvas-source path gets scroll offset):

```tsx
// BEFORE (existing lines 318–323, inside `if (fromZone !== 'canvas')` block):
const activator = event.activatorEvent as PointerEvent;
const pointerFinalX = activator.clientX + event.delta.x;
const pointerFinalY = activator.clientY + event.delta.y;
handleDropX = pointerFinalX - canvasBounds.left - CARD_W / 2;
handleDropY = pointerFinalY - canvasBounds.top - CARD_H / 2;

// AFTER:
const activator = event.activatorEvent as PointerEvent;
const pointerFinalX = activator.clientX + event.delta.x;
const pointerFinalY = activator.clientY + event.delta.y;
const { x: scrollX, y: scrollY } = scrollOffsetRef.current;
handleDropX = pointerFinalX - canvasBounds.left - CARD_W / 2 + scrollX;
handleDropY = pointerFinalY - canvasBounds.top - CARD_H / 2 + scrollY;
```

CRITICAL: Do NOT add `scrollX/scrollY` to the `canvas → canvas` path (`cc.x + event.delta.x` at lines 330–332 and 399–403). Those coordinates are already in canvas-space; adding scroll offset would double-count the pan. Apply scroll offset ONLY to the `hand/pile → canvas` branches (where pointer client coordinates are converted to canvas coordinates).

---

**canvasBounds source after refactor** — `canvasRef` now targets the inner canvas div. `canvasBounds = canvasRef.current?.getBoundingClientRect()` remains valid because `getBoundingClientRect()` on a transformed element returns its visual (post-transform) position. `canvasW = canvasBounds?.width` returns the inner canvas width (larger than viewport), which is correct for the bounds clamp.

---

### `src/components/BoardView.tsx` (component, request-response — one line edit)

**Analog:** Self — one Tailwind class addition to the `CanvasZone` wrapper.

**Height cap pattern** (35-CONTEXT.md D-04; `responsive.spec.ts` line 5 for breakpoint reference):

```tsx
// Current line 98 in BoardView.tsx:
<CanvasZone canvasCards={gameState.canvasCards} canvasRef={canvasRef} ... />

// After — add scrollOffsetRef prop + height cap wrapper or className:
// Option A: if CanvasZone's outer viewport div already has the Tailwind class (preferred):
// Just pass scrollOffsetRef={scrollOffsetRef} and let CanvasZone apply max-h internally.

// Option B: if the cap is applied at BoardView level (as a wrapper div):
<div className="max-h-[240px] sm:max-h-none flex-1 min-h-0 self-stretch">
  <CanvasZone ... scrollOffsetRef={scrollOffsetRef} />
</div>
```

The `max-h` value (~240px) is a starting tuning point — measure in Chrome DevTools at 375×667 and adjust so spread zone + hand zone are visible below without scrolling. `sm:max-h-none` removes the cap at ≥640px (Tailwind's `sm:` breakpoint = 640px, matching the `getCardDimensions()` breakpoint in `canvas-utils.ts` line 7).

**Existing breakpoint pattern from `canvas-utils.ts` line 7:**
```ts
if (typeof window !== 'undefined' && window.innerWidth < 640) {
  return { w: 42, h: 59 };
}
```
Use same 640px threshold for the Tailwind cap (`sm:max-h-none`).

---

### `playwright/mobile.spec.ts` (test, event-driven — new file)

**Analog:** `playwright/responsive.spec.ts` (lines 1–37, read in full)

**Full structural pattern** (`playwright/responsive.spec.ts` lines 1–23):

```ts
import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Phase 35 mobile edge pan', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  // Each test: goto + join game as one player
  test('MOBILE-01: edge arrows appear when canvas has overflow content', async ({ page }) => {
    const roomCode = nanoid(8);
    await page.goto(`/?room=${roomCode}`);
    await page.getByPlaceholder('Your name').fill('MobileTest');
    await page.getByRole('button', { name: 'Join Game' }).click();
    await expect(page.getByTestId('canvas-zone')).toBeVisible();
    // ... deal/place cards to create overflow, then check arrow visibility
  });
});
```

**Pointer hold simulation** — from CLAUDE.md dnd-kit convention (use `mouse.move/down/move/up steps:15`, NOT `dragAndDrop()`):

```ts
// Hold arrow to trigger pan:
const arrowEl = page.locator('[data-testid="edge-arrow-right"]');
const arrowBox = await arrowEl.boundingBox();
await page.mouse.move(arrowBox!.x + arrowBox!.width / 2, arrowBox!.y + arrowBox!.height / 2);
await page.mouse.down();
// Wait for pan to accumulate (2–3 intervals at 16ms each = ~100ms):
await page.waitForTimeout(100);
// Assert canvas has translated (check transform or card position)
await page.mouse.up();
```

**Viewport scroll width check pattern** (`playwright/responsive.spec.ts` lines 17–21) — reuse for MOBILE-03:

```ts
const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
```

---

## Shared Patterns

### Ref-Based Cross-Component State (zero re-render)

**Source:** `src/components/BoardDragLayer.tsx` lines 86–96
**Apply to:** `scrollOffsetRef` passed from `BoardDragLayer` → `BoardView` → `CanvasZone`

```tsx
// Pattern: create ref in the owner (BoardDragLayer), pass down, update in child (CanvasZone)
const scrollOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
// CanvasZone writes: scrollOffsetRef.current = scroll (in useEffect after scroll state update)
// BoardDragLayer reads: scrollOffsetRef.current in handleDragEnd (already in closure, no re-render)
```

Consistent with `isDraggingRef` (line 86), `dragDeltaRef` (line 89), `passengerOffsetsRef` (line 92).

---

### MeasuringStrategy.Always (DOM restructure guard)

**Source:** `src/components/BoardDragLayer.tsx` line 615; CLAUDE.md convention
**Apply to:** Verify this remains unchanged after CanvasZone DOM refactor

```tsx
measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
```

The two-div refactor restructures CanvasZone's DOM. `MeasuringStrategy.Always` forces dnd-kit to re-measure droppable rects on every drag start, preventing stale rect drift. Already set — just confirm it's not accidentally removed.

---

### useCallback Dependency Array for Closures Capturing Dynamic Values

**Source:** `src/spikes/Spike003EdgePan.tsx` lines 174–186
**Apply to:** `startPan` in CanvasZone

```tsx
const startPan = useCallback((dir: PanDir) => {
  // ...
}, [stopPan, viewportSize, innerW, innerH]);
//              ^^^^^^^^^^^  ^^^^^^  ^^^^^^
// In spike: viewportSize only (CANVAS_W/H are constants)
// In production: MUST include innerW and innerH — they are dynamic (derived from canvasCards)
// Omitting them causes stale closure pan boundary = pan stops at wrong position
```

---

### Tailwind Responsive Breakpoint Convention

**Source:** `src/lib/canvas-utils.ts` line 7; `BoardView.tsx` line 52 (`sm:max-w-none`)
**Apply to:** Height cap on CanvasZone outer div (D-04)

```tsx
// No prefix = < 640px (mobile); sm: = >= 640px (matches canvas-utils.ts breakpoint)
className="max-h-[240px] sm:max-h-none"
```

---

## No Analog Found

All files have close analogs in the codebase. No entries in this section.

---

## Metadata

**Analog search scope:** `src/components/`, `src/spikes/`, `src/lib/`, `playwright/`
**Files scanned:** 7 (Spike003EdgePan.tsx, CanvasZone.tsx, BoardDragLayer.tsx, BoardView.tsx, canvas-utils.ts, responsive.spec.ts, spike README)
**Pattern extraction date:** 2026-05-26
