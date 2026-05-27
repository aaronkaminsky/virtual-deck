# Phase 35: Mobile - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add mobile support to the free canvas: edge-pan arrows that appear whenever canvas content overflows the viewport (in any direction), hold-to-scroll continuous panning that coexists with one-finger card drag without conflict, and a fixed CSS height cap at < 640px viewport so spread zones and the player hand remain visible without scrolling.

**Requirements:** MOBILE-01, MOBILE-02, MOBILE-03

</domain>

<decisions>
## Implementation Decisions

### Canvas Coordinate Model

- **D-01:** No coordinate system change. Cards placed at (x, y) on any viewport stay at those coordinates — no reclamping on viewport resize. A card placed on desktop at x=500 remains at x=500 on a 320px-wide mobile viewport; edge arrows reveal it.
- **D-02:** Inner canvas size is dynamic: computed from `max(card.x + CARD_W) + PADDING` and `max(card.y + CARD_H) + PADDING` across all `canvasCards`. If `canvasCards` is empty, inner canvas = current viewport bounds (no overflow, no arrows). `PADDING` is an implementation-tuning constant (e.g., 48px).
- **D-03:** The architecture uses a two-div model: outer viewport div (`overflow: hidden`, flex-1) + inner canvas div sized to the dynamic bounds above. Panning via CSS `transform: translate(-scrollX, -scrollY)` on the inner div — same approach as Spike003. This avoids scroll-container conflicts with dnd-kit pointer capture.

### Mobile Canvas Height

- **D-04:** Canvas outer viewport div gets a `max-h-[Xpx]` at < 640px via Tailwind responsive breakpoint (no `sm:` prefix = mobile; add `sm:max-h-none` to remove cap above 640px). Exact pixel value is implementation tuning — the constraint is "spread zones + hand remain visible below without scrolling at 375px viewport height."
- **D-05:** Canvas content below the height cap is accessible via down-arrow pan. All four pan directions (left/right/up/down) are supported when overflow exists in that direction — same code, all four `EdgeArrow` components.

### Edge Arrow Behavior

- **D-06:** Arrows appear whenever content overflows, on any viewport width (not mobile-only). Overflow condition: `scrollX > 0` (left), `scrollX < innerW - viewportW` (right), `scrollY > 0` (up), `scrollY < innerH - viewportH` (down). If all cards fit in the viewport, no arrows appear anywhere.
- **D-07:** Spike003 values are the production values: `PAN_STEP = 8px`, `PAN_INTERVAL = 16ms` (~60fps). These were tuned in the spike and confirmed to feel right.
- **D-08:** Arrow interaction uses `onPointerDown` + `stopPropagation` on each arrow div. `onPointerUp` + `onPointerLeave` stop the pan. `stopPropagation` is essential to prevent dnd-kit from seeing the arrow press as a drag start. Spike003 confirms this works.
- **D-09:** Spike003 arrow styling is acceptable for production: `rgba(255,255,255,0.15)` background, `backdrop-filter: blur(4px)`, 32×80px (left/right) or 80×32px (top/bottom), rotated `‹` glyph. No need to match shadcn tokens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike Reference Implementation
- `src/spikes/Spike003EdgePan.tsx` — VALIDATED production-ready implementation of edge-pan. Extract `EdgeArrow` component, `startPan`/`stopPan` callbacks, `hasOverflow` computation, `ResizeObserver` for viewport size tracking, and the `setInterval`-based pan loop directly into `CanvasZone`. The spike's inner canvas panning model (outer viewport div + inner canvas div + CSS transform) is the target architecture.
- `.planning/spikes/003-mobile-edge-pan/README.md` — spike verdict (VALIDATED), tuning notes (PAN_STEP=8px, glyph rotation bug fix), confirmed key findings: CSS transform avoids scroll-container dnd-kit conflict; stopPropagation on arrow pointerdown is essential; arrow visibility driven by simple scroll offset comparisons.

### Requirements
- `.planning/REQUIREMENTS.md` — MOBILE-01, MOBILE-02, MOBILE-03 definitions and acceptance criteria
- `.planning/ROADMAP.md` — Phase 35 success criteria (3 criteria)

### Production Canvas Code
- `src/components/CanvasZone.tsx` — current canvas component; D-03 requires wrapping the current single-div structure into outer viewport div + inner canvas div
- `src/components/BoardDragLayer.tsx` — owns `canvasRef` (used for bounds clamping in D-15 of Phase 32); panning scroll offset must be factored into the clamping math so dropped-card positions are relative to inner canvas, not the viewport
- `src/components/BoardView.tsx` — contains the `CanvasZone` usage; outer layout flex-row with sidebar; canvas height cap (D-04) goes on the CanvasZone/outer viewport div
- `src/lib/canvas-utils.ts` — `CARD_W`, `CARD_H`, `getCardDimensions()` — use `getCardDimensions()` for inner canvas size computation (D-02) to account for smaller cards at mobile

### Prior Phase Context
- `.planning/phases/32-canvas-core/32-CONTEXT.md` — D-15 (clamping formula), D-16 (PointerSensor distance:8), D-17 (MeasuringStrategy.Always)
- `.planning/phases/34-multi-card-group-drop/34-CONTEXT.md` — D-11 (canvas→canvas group delta, hand/spread→canvas offset capture) — panning scroll offset must be added to group placement math as well

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/spikes/Spike003EdgePan.tsx: EdgeArrow` component (~40 lines) — ready to extract; handles all four directions via `dir` prop, `posStyle` computed inline, `onPointerDown`/`onPointerUp`/`onPointerLeave` wired. Transplant directly.
- `src/spikes/Spike003EdgePan.tsx: startPan / stopPan` logic — `setInterval` with scroll clamping; `useCallback`-wrapped; `useEffect` cleanup on unmount. Transplant directly.
- `src/spikes/Spike003EdgePan.tsx: ResizeObserver` for viewport size — watches `viewportRef` (the outer overflow:hidden div); use in `CanvasZone` to know when `viewportSize` changes and recompute overflow.
- `src/lib/canvas-utils.ts: getCardDimensions()` — returns 42×59 at < 640px, 63×88 otherwise; use for inner canvas size computation
- `src/lib/canvas-utils.ts: CARD_W, CARD_H` — desktop fallback constants; import where needed

### Established Patterns
- `canvasRef` dual-ref pattern in `CanvasZone.tsx` — currently attaches dnd-kit's `setNodeRef` and the forwarded `canvasRef` to the same div. After D-03 refactor, `canvasRef` should attach to the INNER canvas div (so bounds clamping measures the inner canvas, not the outer viewport).
- `MeasuringStrategy.Always` on `DndContext` (Phase 30 / CLAUDE.md) — already applied; still required after DOM restructure.
- `bufferRef` pattern in `usePartySocket` — buffer incoming server updates during active drag. No change needed for panning (panning is client-only state, does not affect server sync).
- `touchAction: 'none'` on draggable cards — already set in `CanvasDraggableCard`; prevents browser's native scroll from capturing card drag touches.

### Integration Points
- `CanvasZone.tsx` — main change surface: wrap existing single div into outer viewport + inner canvas; add `EdgeArrow` components; add `ResizeObserver`; add scroll state; expose scroll offset via ref or prop for `BoardDragLayer` clamping adjustment
- `BoardDragLayer.tsx` — clamping math (`handleDragEnd`) must add scroll offset: `clampedX = clamp(rawX + scrollX, 0, innerCanvasW - CARD_W)` — so a card dropped while the canvas is panned 200px right is stored at the correct absolute canvas coordinate, not the visual drop point
- `BoardView.tsx` — add height cap class to CanvasZone wrapper (D-04)

</code_context>

<specifics>
## Specific Ideas

- **Inner canvas size computation**: `innerW = Math.max(viewportW, Math.max(...canvasCards.map(c => c.x + cardW)) + PADDING)`, same for height. Recalculate as a `useMemo` on `canvasCards`. When `canvasCards` is empty, `innerW = viewportW` (no overflow).
- **Scroll offset adjustment in `BoardDragLayer`**: The drop pointer position is relative to the outer viewport div, but card coordinates are relative to the inner canvas. The fix: `rawX = pointerX - canvasBounds.left + scrollX`, `rawY = pointerY - canvasBounds.top + scrollY`. `canvasRef` (on inner canvas) `getBoundingClientRect()` already accounts for the transform translate, so using that ref returns the correct transformed position. Alternatively, pass `scrollOffset: { x: scrollX, y: scrollY }` from CanvasZone up to BoardDragLayer.
- **Spike glyph rotation**: Use `‹` as the base glyph for all four arrows, then rotate. The spike's README documents the correct rotation map: `left: 0deg, right: 180deg, up: 90deg, down: 270deg`. Do NOT use `‹`/`›` as separate bases — doubling the flip on right/down is a known bug (fixed in spike).
- **PAN_STEP and PAN_INTERVAL**: Use spike values verbatim: `PAN_STEP = 8` (px per tick), `PAN_INTERVAL = 16` (ms). These are tuned; 12px/tick was too fast.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 35-Mobile*
*Context gathered: 2026-05-26*
