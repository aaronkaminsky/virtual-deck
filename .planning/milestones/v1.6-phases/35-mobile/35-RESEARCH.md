# Phase 35: Mobile - Research

**Researched:** 2026-05-26
**Domain:** CSS layout, touch/pointer event handling, React state management for viewport panning
**Confidence:** HIGH

## Summary

Phase 35 adds mobile viewport panning support to the free canvas play area. The full technical approach is already validated via Spike003 — no speculative choices remain. The implementation is a code extraction and integration task: transplant the validated `EdgeArrow` component and `startPan`/`stopPan` logic from `src/spikes/Spike003EdgePan.tsx` into `CanvasZone`, restructure `CanvasZone` from a single div to an outer viewport div + inner canvas div, compute dynamic inner canvas bounds from `canvasCards` positions, and add a Tailwind height cap to `BoardView` at `< 640px` viewport.

The main integration complexity is that `canvasRef` and bounds-clamping math in `BoardDragLayer` must account for the panned scroll offset after the DOM refactor. Specifically, two drop paths in `handleDragEnd` compute card positions using `canvasBounds.left`/`.top` from `getBoundingClientRect()` — after the two-div refactor, this call must target the inner canvas div (not the outer viewport div), and scroll offset must be added when the source is `canvas→canvas`. The group drop path in `GROUP_PLACE_ON_CANVAS` also applies `cc.x + event.delta.x` directly — this formula remains correct because delta is measured in client coordinates independent of panning; no scroll offset adjustment is needed for `canvas→canvas` group drops.

The spike verdict is VALIDATED with tuning constants already confirmed. No new libraries are required. No new server actions are required. This is a pure client-side refactor.

**Primary recommendation:** Extract Spike003 directly into CanvasZone. The spike is production-ready code, not a prototype.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canvas Coordinate Model**
- D-01: No coordinate system change. Cards at (x, y) remain at those coordinates on any viewport — no reclamping on resize. Edge arrows reveal off-screen cards.
- D-02: Inner canvas size is dynamic: `max(card.x + cardW) + PADDING` across `canvasCards`. If `canvasCards` is empty, inner canvas = current viewport bounds (no overflow, no arrows). `PADDING` is implementation-tuning constant (e.g., 48px).
- D-03: Two-div model: outer viewport div (`overflow: hidden`, flex-1) + inner canvas div sized to dynamic bounds. Panning via CSS `transform: translate(-scrollX, -scrollY)` on inner div — same as Spike003. Avoids scroll-container conflicts with dnd-kit pointer capture.

**Mobile Canvas Height**
- D-04: Canvas outer viewport div gets `max-h-[Xpx]` at `< 640px` via Tailwind responsive breakpoint. Exact pixel value is implementation tuning — constraint is "spread zones + hand remain visible below without scrolling at 375px viewport height."
- D-05: Canvas content below height cap is accessible via down-arrow pan. All four pan directions (left/right/up/down) supported when overflow exists — same code, all four `EdgeArrow` components.

**Edge Arrow Behavior**
- D-06: Arrows appear whenever content overflows, on any viewport width (not mobile-only). Conditions: `scrollX > 0` (left), `scrollX < innerW - viewportW` (right), `scrollY > 0` (up), `scrollY < innerH - viewportH` (down).
- D-07: Spike003 values are production values: `PAN_STEP = 8px`, `PAN_INTERVAL = 16ms` (~60fps).
- D-08: Arrow interaction uses `onPointerDown` + `stopPropagation`. `onPointerUp` + `onPointerLeave` stop pan. `stopPropagation` prevents dnd-kit from seeing arrow press as drag start.
- D-09: Spike003 arrow styling is production-acceptable: `rgba(255,255,255,0.15)` background, `backdrop-filter: blur(4px)`, 32×80px (left/right) or 80×32px (top/bottom), rotated `‹` glyph.

### Claude's Discretion

None specified in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBILE-01 | Hold-to-scroll edge arrows appear when canvas content overflows; holding an arrow pans the viewport continuously | Spike003 validates approach; `hasOverflow` computed from scroll vs. inner canvas bounds; `startPan` via `setInterval` at `PAN_INTERVAL = 16ms` |
| MOBILE-02 | Edge-pan does not conflict with one-finger card drag gestures | Spike003 validates: `stopPropagation` on arrow `onPointerDown` isolates pan from dnd-kit; CSS transform panning avoids scroll container conflict |
| MOBILE-03 | Canvas height is bounded at <640px viewport width so spread zones remain visible without vertical overlap | Tailwind `max-h-[Xpx]` on outer viewport div, `sm:max-h-none` above 640px; down-arrow pan reveals clipped content |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Edge arrow rendering | Browser / Client (CanvasZone) | — | Arrows are pure client UI — no server state involved |
| Panning scroll state | Browser / Client (CanvasZone) | — | Ephemeral client-only position; not synced to server |
| Inner canvas size computation | Browser / Client (CanvasZone) | — | Derived from `canvasCards` positions in game state; recalculated locally |
| Viewport size tracking (ResizeObserver) | Browser / Client (CanvasZone) | — | DOM measurement — client only |
| Canvas height cap | Browser / Client (BoardView CSS) | — | Tailwind responsive class on CanvasZone wrapper |
| Clamping math scroll adjustment | Browser / Client (BoardDragLayer) | — | Drop coordinate adjustment for panned viewport |

---

## Standard Stack

No new libraries are required for this phase. All dependencies are already installed.

### Core (existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` hooks for pan state, ResizeObserver, setInterval lifecycle | Already in project |
| @dnd-kit/core | 6.x | `MeasuringStrategy.Always` — required after DOM restructure; existing dnd-kit sensors unchanged | Already in project |
| Tailwind CSS | 3.x | Responsive `max-h` class for height cap; existing utility-first CSS | Already in project |

### No New Packages
The spike implementation uses only web platform APIs (ResizeObserver, setInterval, CSS transform, pointer events) and React hooks — zero additional npm packages needed.

### Package Legitimacy Audit

No packages to audit — this phase installs no new dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
canvasCards (from game state, via BoardDragLayer → BoardView → CanvasZone)
    │
    ▼
CanvasZone
├── [outer viewport div]  overflow:hidden, flex-1, ResizeObserver → viewportSize
│   ├── [inner canvas div]  width=innerW, height=innerH
│   │   ├── transform: translate(-scrollX, -scrollY)
│   │   ├── CanvasDraggableCard × N  (unchanged — still at absolute x/y on inner canvas)
│   │   └── passenger ghost divs (from Phase 34, unchanged)
│   │
│   └── EdgeArrow × 4  (left/right/up/down, each visible when hasOverflow[dir])
│           │
│           └── onPointerDown → startPan(dir)  [stopPropagation → dnd-kit never sees]
│               onPointerUp / onPointerLeave → stopPan()
│
▼
BoardDragLayer.handleDragEnd (canvas drop path)
    canvasRef → inner canvas div (after refactor)
    canvasBounds = canvasRef.current.getBoundingClientRect()
    [IMPORTANT: getBoundingClientRect() on inner div returns transform-offset position
     — for canvas→canvas: position formula uses cc.x + delta.x directly (delta is client-space, no scroll adjustment needed)
     — for hand/pile→canvas: pointer position relative to outer viewport origin,
       adjusted by scroll offset: rawX = pointerFinalX - viewportBounds.left + scrollX]
```

### Recommended Project Structure

No new directories. All changes are in existing files:
```
src/
├── components/
│   ├── CanvasZone.tsx      # primary change surface — two-div refactor + EdgeArrow + pan state
│   ├── BoardDragLayer.tsx  # scroll offset adjustment in handleDragEnd + canvasRef targets inner div
│   └── BoardView.tsx       # height cap class on CanvasZone wrapper
└── lib/
    └── canvas-utils.ts     # PADDING constant added (or defined in CanvasZone)
```

### Pattern 1: Two-Div Viewport Model (from Spike003)

**What:** Outer div is the visible window (`overflow: hidden`, fixed size). Inner div is the full canvas surface (dynamically sized). Panning translates the inner div via CSS transform.

**When to use:** Whenever a bounded-viewport scroll must coexist with dnd-kit pointer capture. Native `overflow: scroll` containers conflict with dnd-kit's `setPointerCapture` during drag; CSS transform avoids this entirely.

**Example (from Spike003):**
```tsx
// Source: src/spikes/Spike003EdgePan.tsx (VALIDATED)
// Outer viewport div
<div
  ref={viewportRef}
  style={{ position: 'relative', overflow: 'hidden', width: '100%', height: 400 }}
>
  {/* Inner canvas div — translate to pan */}
  <div
    style={{
      position: 'absolute',
      width: innerW,
      height: innerH,
      transform: `translate(${-scroll.x}px, ${-scroll.y}px)`,
    }}
  >
    {/* cards */}
  </div>

  {/* EdgeArrows rendered inside viewport, outside canvas — at zIndex 1000 */}
  <EdgeArrow dir="left"  visible={hasOverflow.left}  onPanStart={startPan} onPanEnd={stopPan} />
  <EdgeArrow dir="right" visible={hasOverflow.right} onPanStart={startPan} onPanEnd={stopPan} />
  <EdgeArrow dir="up"    visible={hasOverflow.up}    onPanStart={startPan} onPanEnd={stopPan} />
  <EdgeArrow dir="down"  visible={hasOverflow.down}  onPanStart={startPan} onPanEnd={stopPan} />
</div>
```

### Pattern 2: Dynamic Inner Canvas Size

**What:** Inner canvas width/height derived from `canvasCards` positions; not fixed. When empty, equals viewport size (no overflow, no arrows).

**Example (from CONTEXT.md D-02 + Spike003 pattern):**
```tsx
// Source: 35-CONTEXT.md D-02 (VALIDATED design decision)
const { w: cardW, h: cardH } = getCardDimensions();
const PADDING = 48;

const { innerW, innerH } = useMemo(() => {
  if (canvasCards.length === 0) {
    return { innerW: viewportSize.w, innerH: viewportSize.h };
  }
  const maxX = Math.max(...canvasCards.map(c => c.x + cardW));
  const maxY = Math.max(...canvasCards.map(c => c.y + cardH));
  return {
    innerW: Math.max(viewportSize.w, maxX + PADDING),
    innerH: Math.max(viewportSize.h, maxY + PADDING),
  };
}, [canvasCards, viewportSize, cardW, cardH]);
```

### Pattern 3: Pan Loop with Clamp

**What:** `setInterval` at 16ms increments scroll by PAN_STEP, clamped to [0, max]. `useCallback` with `stopPan` dependency so stale closure doesn't read old `viewportSize`.

**Example (from Spike003):**
```tsx
// Source: src/spikes/Spike003EdgePan.tsx (VALIDATED)
const stopPan = useCallback(() => {
  if (panIntervalRef.current) {
    clearInterval(panIntervalRef.current);
    panIntervalRef.current = null;
  }
}, []);

const startPan = useCallback((dir: PanDir) => {
  stopPan(); // clear any existing interval before starting
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

// Cleanup on unmount
useEffect(() => () => stopPan(), [stopPan]);
```

### Pattern 4: Scroll Offset Adjustment in Drop Coordinate Math

**What:** After the two-div refactor, `canvasRef` targets the inner canvas div. For `hand/pile → canvas` drops, the pointer position is measured relative to the outer viewport — but the inner canvas may be panned. The adjustment is: `rawX = pointerFinalX - viewportBounds.left + scrollX`.

**Critical distinction:** `getBoundingClientRect()` on the inner canvas div returns its visual (transformed) position. For `canvas → canvas` drops that use `cc.x + event.delta.x` directly, no scroll adjustment is needed — delta is in client pointer coordinates and the stored card position is already in canvas-space. The scroll offset does NOT need to be applied to `event.delta` for canvas-origin cards.

For `hand/pile → canvas` drops:
```tsx
// Source: 35-CONTEXT.md code_context "Scroll offset adjustment" (VALIDATED design)
// scrollOffset comes from CanvasZone via ref or prop
const canvasBounds = viewportRef.current?.getBoundingClientRect(); // outer viewport bounds
const activator = event.activatorEvent as PointerEvent;
const pointerFinalX = activator.clientX + event.delta.x;
const pointerFinalY = activator.clientY + event.delta.y;
const rawX = pointerFinalX - (canvasBounds?.left ?? 0) + scrollX;  // add scrollX
const rawY = pointerFinalY - (canvasBounds?.top  ?? 0) + scrollY;  // add scrollY
const newX = Math.max(0, Math.min(rawX - CARD_W / 2, innerW - CARD_W));
const newY = Math.max(0, Math.min(rawY - CARD_H / 2, innerH - CARD_H));
```

### Pattern 5: EdgeArrow Component

**What:** A single component handles all four directions via `dir` prop. Uses `‹` as base glyph for all directions and rotates — do NOT use `‹`/`›` as separate bases for left/right (doubling-flip bug documented in spike README).

**Rotation map (validated in spike):**
- `left: 0deg`, `right: 180deg`, `up: 90deg`, `down: 270deg`

**Example (from Spike003):**
```tsx
// Source: src/spikes/Spike003EdgePan.tsx (VALIDATED)
type PanDir = 'left' | 'right' | 'up' | 'down';

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
        width: dir === 'left' || dir === 'right' ? 32 : 80,
        height: dir === 'left' || dir === 'right' ? 80 : 32,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
        borderRadius: 6,
        touchAction: 'none',
        ...posStyle,
      }}
    >
      <span style={{ color: 'white', fontSize: 20, transform: `rotate(${rotate})` }}>
        {label}
      </span>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Using native `overflow: scroll` for canvas panning:** dnd-kit's `setPointerCapture` on drag start interacts badly with scroll containers. CSS `transform: translate()` is the validated alternative.
- **Using `›` as base glyph for right/down arrows:** Creates double-flip bug. Use `‹` only and rotate all four directions.
- **Attaching `canvasRef` to the outer viewport div:** After the two-div refactor, bounds clamping that uses `getBoundingClientRect()` via `canvasRef` needs to measure the inner canvas. If `canvasRef` is on the outer div, the bounds will be viewport-sized (smaller than inner canvas), causing incorrect clamps at large scroll offsets.
- **Calling `startPan` without `stopPan()` first:** If user holds one arrow then quickly holds another, two intervals run simultaneously, doubling pan speed. The spike calls `stopPan()` at the top of `startPan`.
- **Dispatching `PLACE_ON_CANVAS` or `GROUP_PLACE_ON_CANVAS` with viewport-relative rather than canvas-relative coordinates:** Cards will appear at wrong positions when canvas is panned. Always apply scroll offset for non-canvas source drops.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Continuous pan loop | Custom pointer velocity tracking | `setInterval` at 16ms (Spike003 validated) | Velocity tracking adds complexity; fixed step at 60fps is perceptually smooth and matches user expectation |
| Viewport size tracking | Polling `clientWidth` | `ResizeObserver` | ResizeObserver is the platform API for this; polling is wasteful and has latency |
| Arrow visibility | Scroll event listeners | Computed from `scroll` state vs. `innerW/innerH` | Arrow visibility is a pure derivation from scroll position — no events needed |
| Touch scroll conflict resolution | Custom gesture recognizer | `stopPropagation` on `onPointerDown` + `touchAction: 'none'` on cards (already set) | dnd-kit's pointer model handles this correctly with these two guards |

**Key insight:** This entire feature is ~80 lines extracted verbatim from the spike. The spike solved all hard problems. Do not redesign.

---

## Common Pitfalls

### Pitfall 1: Scroll Offset Not Propagated to BoardDragLayer

**What goes wrong:** `hand/pile → canvas` drops land at wrong positions when canvas is panned. Cards appear at `pointerX - viewportLeft` instead of `pointerX - viewportLeft + scrollX`.

**Why it happens:** `BoardDragLayer.handleDragEnd` computes drop coordinates using the outer viewport's `getBoundingClientRect()` and ignores the panned offset. State for `scrollX/scrollY` lives in `CanvasZone` — `BoardDragLayer` must receive it.

**How to avoid:** Pass scroll offset from `CanvasZone` up to `BoardDragLayer` via a `scrollOffsetRef` (ref avoids re-renders), similar to how `canvasRef` is forwarded. Or expose it via an imperative handle. In `handleDragEnd`, add `scrollX/scrollY` to the hand/pile→canvas coordinate computation.

**Warning signs:** Drop coordinates are wrong only when the canvas is panned from its initial position; drops work correctly when scroll is at `(0, 0)`.

### Pitfall 2: canvasRef Targets Wrong Div After Refactor

**What goes wrong:** `canvasRef.current.getBoundingClientRect()` returns viewport-sized bounds rather than full inner canvas bounds, breaking bounds clamping at the far edges of the canvas.

**Why it happens:** `CanvasZone` currently has a single div that serves as both the droppable surface and the `canvasRef` target. After the two-div refactor, the outer div is the viewport and the inner div is the canvas. `canvasRef` must be moved to attach to the inner canvas div.

**How to avoid:** In `CanvasZone`, move the `setRefs` dual-ref function to attach to the inner div. The outer div gets only `viewportRef`. Verify that `useDroppable`'s `setNodeRef` is also on the inner div (dnd-kit measures droppable bounds from this ref).

**Warning signs:** Single-card drops clamp to viewport width/height instead of inner canvas width/height when canvas has overflow content.

### Pitfall 3: DndContext Placed Inside Viewport Div

**What goes wrong:** dnd-kit's `DragOverlay` is portaled to `document.body` and works correctly, but `DndContext` itself should not be inside the panning div. In Spike003, `DndContext` wraps the viewport div, not the inner canvas.

**Why it happens:** Misreading the spike structure — the `DndContext` wrapper is outside the scroll viewport, containing both the viewport and all overlay elements.

**How to avoid:** In the production code, `DndContext` lives in `BoardDragLayer` (parent of `BoardView` and `CanvasZone`). This is already correct — no change needed to `DndContext` placement. Only the internal div structure of `CanvasZone` changes.

### Pitfall 4: `startPan` Closure Captures Stale `innerW`/`innerH`

**What goes wrong:** Pan stops at the wrong boundary because `innerW`/`innerH` captured in `startPan`'s closure are stale from a previous render (e.g., before new cards were added to the canvas).

**Why it happens:** `startPan` is a `useCallback` with dependencies `[stopPan, viewportSize, innerW, innerH]`. If `innerW`/`innerH` are not in the dependency array, the closure uses stale values.

**How to avoid:** Include `innerW` and `innerH` in `startPan`'s `useCallback` dependency array. In the spike, `CANVAS_W`/`CANVAS_H` are constants (not deps), but in production the inner canvas is dynamic.

### Pitfall 5: Canvas Group Drop Scroll Offset Applied Incorrectly

**What goes wrong:** `canvas → canvas` group drop applies `cc.x + event.delta.x + scrollX` per card, placing cards at wrong positions when canvas is panned.

**Why it happens:** Over-applying the scroll offset fix. For `canvas → canvas` drops, coordinates are already in canvas space. `event.delta` is pointer-space delta (not viewport-relative). No scroll adjustment is needed.

**How to avoid:** Apply scroll offset ONLY to `hand/pile → canvas` drops (the pointer-to-canvas coordinate conversion path). Do not apply it to the `cc.x + delta.x` path.

### Pitfall 6: MeasuringStrategy.Always Not Preserved

**What goes wrong:** After the two-div DOM restructure, dnd-kit's droppable rect measurements go stale and drops register on the wrong zone.

**Why it happens:** DOM restructure invalidates dnd-kit's cached droppable measurements. `MeasuringStrategy.Always` forces re-measurement on every drag start.

**How to avoid:** `MeasuringStrategy.Always` is already set on `DndContext` in `BoardDragLayer` (per CLAUDE.md convention). Verify it remains after any refactor.

---

## Code Examples

### Inner canvas bounds computation with empty-canvas guard
```tsx
// Source: 35-CONTEXT.md D-02 specifics section (VALIDATED design)
const PADDING = 48;
const { w: cardW, h: cardH } = getCardDimensions();

const { innerW, innerH } = useMemo(() => {
  if (canvasCards.length === 0) {
    return { innerW: viewportSize.w, innerH: viewportSize.h };
  }
  const maxX = Math.max(...canvasCards.map(c => c.x + cardW));
  const maxY = Math.max(...canvasCards.map(c => c.y + cardH));
  return {
    innerW: Math.max(viewportSize.w, maxX + PADDING),
    innerH: Math.max(viewportSize.h, maxY + PADDING),
  };
}, [canvasCards, viewportSize.w, viewportSize.h, cardW, cardH]);
```

### ResizeObserver for viewport size
```tsx
// Source: src/spikes/Spike003EdgePan.tsx (VALIDATED)
const viewportRef = useRef<HTMLDivElement>(null);
const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

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

### Overflow detection (hasOverflow map)
```tsx
// Source: src/spikes/Spike003EdgePan.tsx (VALIDATED)
const hasOverflow = {
  left:  scroll.x > 0,
  right: scroll.x < innerW - viewportSize.w,
  up:    scroll.y > 0,
  down:  scroll.y < innerH - viewportSize.h,
};
```

### Tailwind height cap pattern (D-04)
```tsx
// Source: 35-CONTEXT.md D-04 (VALIDATED design decision)
// In BoardView.tsx — on the CanvasZone wrapper or the CanvasZone outer viewport div:
// No prefix = mobile (< 640px); sm: = >= 640px
className="max-h-[Xpx] sm:max-h-none"
// X = tuning constant; start at 300px and adjust so spread + hand are visible at 375px height
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native scroll container panning | CSS transform panning | Spike003 (2026-05) | Eliminates dnd-kit pointer capture conflict on touch |
| Fixed canvas size (CANVAS_W/H constants) | Dynamic inner canvas size from card positions | Phase 35 D-02 | No wasted canvas space; no overflow on empty board |

**Deprecated/outdated:**
- Fixed `CANVAS_W = 1400, CANVAS_H = 700` from spike: spike used constants for simplicity. Production replaces these with dynamic computation from `canvasCards`.

---

## Integration Map: Files Touched

| File | Change | Complexity |
|------|--------|------------|
| `src/components/CanvasZone.tsx` | Two-div refactor; add pan state (`scroll`, `viewportSize`); add `ResizeObserver`; add `innerW/innerH` computation; add `EdgeArrow`×4; move `setRefs` to inner div; expose `scrollOffset` for `BoardDragLayer` | HIGH — main change surface |
| `src/components/BoardDragLayer.tsx` | Receive `scrollOffset` from CanvasZone (via ref); adjust `hand/pile → canvas` coordinate math to add scroll offset; ensure `canvasRef` targets inner div | MEDIUM — surgical edits to drop paths |
| `src/components/BoardView.tsx` | Add `max-h-[Xpx] sm:max-h-none` class to CanvasZone wrapper div | LOW — one CSS class |
| `src/lib/canvas-utils.ts` | Optionally add `CANVAS_PADDING = 48` constant if not defined inline | LOW — optional, one constant |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) |
| Config file | `vitest.config.ts` / `playwright.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm run test:e2e` (requires both dev servers running) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBILE-01 | Edge arrows appear when canvas content overflows | Playwright (visual/interaction) | `npm run test:e2e` | ❌ Wave 0 — `playwright/mobile.spec.ts` |
| MOBILE-01 | Holding arrow pans canvas continuously | Playwright (pointer events) | `npm run test:e2e` | ❌ Wave 0 |
| MOBILE-02 | Card drag does not trigger pan; pan does not trigger card drag | Playwright (pointer conflict) | `npm run test:e2e` | ❌ Wave 0 |
| MOBILE-03 | Canvas height capped at < 640px viewport; spread zone visible below without scrolling | Playwright (viewport: 375px) | `npm run test:e2e` | ❌ Wave 0 |

**Unit test coverage:** Unit tests (Vitest, in `tests/`) cover server-side logic only (game actions, server state). The mobile feature is entirely client-side (no new server actions) — unit tests add no value here. All meaningful coverage comes from Playwright.

### Wave 0 Gaps
- [ ] `playwright/mobile.spec.ts` — covers MOBILE-01, MOBILE-02, MOBILE-03 (new file, 3 tests)
- No new test infrastructure needed — Playwright config already supports viewport override via `test.use({ viewport })`, demonstrated in `playwright/responsive.spec.ts`

### Playwright test patterns for this phase
```ts
// Source: playwright/responsive.spec.ts (existing pattern — VERIFIED in codebase)

// Pattern: viewport override per describe block
test.describe('Phase 35 mobile edge pan', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  // ...
});

// Pattern: pointer hold simulation (from CLAUDE.md dnd-kit convention)
// Use mouse.move/down/move/up steps:15 — NOT dragAndDrop()
await page.mouse.move(arrowX, arrowY);
await page.mouse.down();
// assert canvas translated
await page.mouse.up();
```

---

## Environment Availability

Step 2.6: No new external tools required. Node 24.x confirmed. All deps already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server, Playwright | ✓ | v24.13.1 | — |
| Playwright (chromium) | e2e tests | ✓ (configured) | see playwright.config.ts | — |
| ResizeObserver (browser API) | Viewport size tracking | ✓ | Web platform standard, all modern browsers | — |
| CSS `backdrop-filter` | Arrow blur styling | ✓ | Supported in all target browsers (Chrome/Safari/Firefox modern) [ASSUMED] | Fallback: remove backdrop-filter, use opaque background |

---

## Open Questions

1. **Exact `max-h` pixel value for D-04**
   - What we know: Constraint is "spread zones + hand remain visible below without scrolling at 375px viewport height." Must be tuned to actual rendered heights of opponent hand, spread zone, hand zone.
   - What's unclear: The rendered heights of spread zone and hand zone vary by card count. The exact cap value needs to be measured in a live browser at 375px.
   - Recommendation: Use ~220–260px as a starting point. Measure with Chrome DevTools at 375×667. Adjust until spread zone top is visible at the viewport bottom edge at 375px height.

2. **How to expose `scrollOffset` from CanvasZone to BoardDragLayer**
   - What we know: `BoardDragLayer` owns `handleDragEnd` and needs `scrollX/scrollY`. `CanvasZone` owns the scroll state. `BoardView` sits between them.
   - Options: (a) `scrollOffsetRef = useRef({x:0, y:0})` created in `BoardDragLayer`, passed down to `CanvasZone`, which keeps it updated — no prop drilling of state; (b) lift scroll state to `BoardDragLayer` and pass `setScroll` down to `CanvasZone` — more React-idiomatic but adds re-render overhead to `BoardDragLayer` on every pan tick.
   - Recommendation: Option (a) — ref-based. Consistent with the project's existing `isDraggingRef` and `dragDeltaRef` patterns (per CLAUDE.md). Zero re-render overhead for `BoardDragLayer`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CSS `backdrop-filter` is supported in all target browsers without a fallback being required | Environment Availability | Arrow blur styling would not render — functional impact is cosmetic only; arrows still work |
| A2 | `max-h` value of ~220–260px will result in visible spread + hand at 375px viewport height | Code Examples, Open Questions | The cap would need adjustment before the feature is usable on mobile |

---

## Sources

### Primary (HIGH confidence)
- `src/spikes/Spike003EdgePan.tsx` — Validated production-ready implementation; all code examples taken from here
- `.planning/spikes/003-mobile-edge-pan/README.md` — Spike verdict VALIDATED; tuning notes (PAN_STEP=8px, glyph rotation bug)
- `35-CONTEXT.md` — All locked design decisions (D-01 through D-09); authoritative for this phase

### Secondary (MEDIUM confidence)
- `src/components/CanvasZone.tsx` — Current single-div structure; the starting point for the two-div refactor
- `src/components/BoardDragLayer.tsx` — Drop coordinate math; identified two paths that need scroll offset adjustment
- `src/lib/canvas-utils.ts` — `getCardDimensions()`, `CARD_W`, `CARD_H`; used in inner canvas size computation
- `playwright/responsive.spec.ts` — Existing Playwright mobile viewport pattern; confirmed Wave 0 gap is just the new test file

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing; spike validated
- Architecture: HIGH — locked decisions in CONTEXT.md, validated spike implementation
- Pitfalls: HIGH — all identified from direct code reading of the integration points
- Test approach: HIGH — existing Playwright infrastructure directly supports this

**Research date:** 2026-05-26
**Valid until:** 2026-07-01 (stable — no fast-moving dependencies)
