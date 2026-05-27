# Phase 33: Overlap & Visibility - Research

**Researched:** 2026-05-24
**Domain:** dnd-kit drag events, CSS z-index pointer routing, React useMemo/useRef performance patterns
**Confidence:** HIGH

## Summary

Phase 33 is a pure client-side rendering phase with no server changes. All three requirements are addressed through changes to three existing components (`CanvasZone`, `CanvasDraggableCard`, `BoardDragLayer`) plus one new utility file (`src/lib/canvas-utils.ts`). A validated spike (`Spike002OverlapHitTesting.tsx`) already proves every pattern; this phase extracts and integrates that spike code into production.

OVERLAP-01 (hit-testing) is already working from Phase 32: cards render at `zIndex: canvasCard.z`, and the browser routes pointer events to the topmost element naturally. The only work is to verify the existing behavior and mark the requirement complete.

OVERLAP-02 (drag opacity) is also complete from Phase 32 — `DragOverlay` already renders at `opacity: 0.5, transform: 'scale(1.05)'`. No code changes required.

OVERLAP-03 (stack shadow indicator) is the primary implementation target. It involves two sub-cases: (a) a static `useMemo` in `CanvasZone` that computes which cards are currently covering another at rest, and (b) a ref-throttled drag-time check in `BoardDragLayer.onDragMove` that adds the same shadow to the `DragOverlay` ghost when it hovers over another card. The performance contract is strict: `dragDeltaRef = useRef({x:0, y:0})` absorbs every pointermove without triggering a re-render; only a boolean flip causes a `setState`.

**Primary recommendation:** Extract `coversMajority()` and `STACK_SHADOW` from Spike002 into `src/lib/canvas-utils.ts`, wire the static `coveringIds` useMemo into `CanvasZone`, and extend `BoardDragLayer` with a `dragDeltaRef` + `dragCoversSomeCard` boolean state for the drag-time shadow. Verify OVERLAP-01 has zero regressions. OVERLAP-02 requires no code.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Trust natural CSS z-index routing for pointer event delivery. No `pointer-events: none` manipulation needed. OVERLAP-01 is effectively free from Phase 32 — verify it works, then ship.
- **D-02:** Shadow goes on the **covering (top) card** — the card whose position covers >50% of a lower card. Shadow CSS: `'2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db'`.
- **D-03:** Shadow threshold: `overlapW * overlapH > CARD_W * CARD_H * 0.5`. Applies to each (covering, covered) pair independently.
- **D-04:** Static shadow computed via `useMemo` over `canvasCards` in `CanvasZone`. Returns a `Set<string>` of card IDs covering another card. Passed as prop to `CanvasDraggableCard`.
- **D-05:** Drag-time shadow: DragOverlay ghost also shows the shadow when its current position covers >50% of any canvas card. Covering check runs in `onDragMove` handler in `BoardDragLayer`.
- **D-06:** Drag-time shadow uses a ref to avoid per-pointermove re-renders. `dragDeltaRef = useRef({x: 0, y: 0})` tracks current delta; a `coversSomeCard` boolean in state triggers re-render only on boolean flip.
- **D-07:** `CanvasDraggableCard.isDraggingActive` prop is NOT used for the shadow in Phase 33. Shadow state flows from the static `coversIds` set computed in the parent.
- **D-08:** OVERLAP-02 already complete from Phase 32 (D-13). `DragOverlay` in `BoardDragLayer` renders at `opacity: 0.5, transform: 'scale(1.05)'`. No changes needed for OVERLAP-02.

### Claude's Discretion

None — all implementation decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OVERLAP-01 | Clicking or dragging targets the highest-z card at any (x, y) point; cards beneath are not interactive | Already implemented via `zIndex: canvasCard.z` in `CanvasDraggableCard.tsx`; browser pointer routing handles this for free. Verify existing behavior only. |
| OVERLAP-02 | Dragged card renders at ~50% opacity so cards beneath are visible | Already implemented — `DragOverlay` div has `opacity: 0.5, transform: 'scale(1.05)'` at `BoardDragLayer.tsx` line ~421. No code changes. |
| OVERLAP-03 | Box-shadow layering indicator appears when a card covers >50% of a card below; shadow tracking uses a ref (not state) to avoid per-pointermove re-renders | Spike002 provides the complete implementation pattern. Requires: utility extraction, `useMemo` in CanvasZone, ref+boolean in BoardDragLayer. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pointer event routing to topmost card | Browser / Client | — | Pure CSS z-index; no JS needed. Browser delivers events to the highest-z element at the pointer position. |
| Static overlap computation (at-rest cards) | Frontend Client | — | Pure client-side geometry — `canvasCards` array from server state; `useMemo` over that array in `CanvasZone`. No server involvement. |
| Drag-time overlap computation | Frontend Client | — | Client-only: uses live drag delta (never sent to server) + cached `canvasCards`. Runs in `onDragMove` which is a dnd-kit client callback. |
| Shadow CSS application | Browser / Client | — | `boxShadow` inline style on the card div. Pure render-time prop threading. |
| DragOverlay opacity | Browser / Client | — | Already owned by `BoardDragLayer` DragOverlay block. No change. |

---

## Standard Stack

This phase introduces no new dependencies. All required functionality comes from already-installed packages.

### Core (existing, confirmed installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 [VERIFIED: npm view] | `DragMoveEvent` type, `onDragMove` callback on `DndContext` | Already the project's drag library; `onDragMove` is the standard extension point for tracking drag position |
| React | 18.x | `useMemo`, `useRef`, `useState` | Core React hooks for overlap computation and ref-based performance pattern |

### No New Packages

This phase requires no `npm install` step. All implementation is React + existing dnd-kit.

---

## Package Legitimacy Audit

No new packages installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
canvasCards (from server via WebSocket)
        |
        v
  CanvasZone.useMemo
  [coversMajority loop]
        |
        v
  coveringIds: Set<string>
        |
        +--> CanvasDraggableCard (per card)
             style.boxShadow = coversAnother ? STACK_SHADOW : undefined
             style.borderRadius = coversAnother ? 6 : undefined

DndContext.onDragMove (per pointermove)
        |
        v
  dragDeltaRef.current = {x, y}   <-- no re-render
        |
        v
  coversMajority check (activeCard stored pos + delta vs all non-active canvasCards)
        |
        |-- boolean unchanged --> no setState (zero renders)
        |
        +-- boolean changed  --> setDragCoversSomeCard(newValue) --> 1 re-render
                                        |
                                        v
                               DragOverlay div
                               style.boxShadow = dragCoversSomeCard ? STACK_SHADOW : undefined
```

### Recommended Project Structure

```
src/
├── lib/
│   └── canvas-utils.ts     # NEW: coversMajority(), STACK_SHADOW, CARD_W, CARD_H
├── components/
│   ├── CanvasZone.tsx       # CHANGED: add coveringIds useMemo; pass coversAnother prop
│   ├── CanvasDraggableCard.tsx  # CHANGED: add coversAnother prop; apply boxShadow/borderRadius
│   └── BoardDragLayer.tsx   # CHANGED: add dragDeltaRef, dragCoversSomeCard state, onDragMove handler
```

### Pattern 1: Static Overlap Computation (useMemo in CanvasZone)

**What:** Compute which cards cover more than 50% of a lower card's area at rest.
**When to use:** Runs on every `canvasCards` state update from the server; stable between moves.

```typescript
// Source: src/spikes/Spike002OverlapHitTesting.tsx lines 90-98 (VALIDATED)
const coveringIds = useMemo(() => {
  const ids = new Set<string>();
  for (const card of canvasCards) {
    if (canvasCards.some(other => other.z < card.z && coversMajority(card, other))) {
      ids.add(card.card.id);
    }
  }
  return ids;
}, [canvasCards]);
```

### Pattern 2: Ref-Throttled Drag-Time Shadow

**What:** Track drag delta in a ref; compute overlap boolean; setState only on flip.
**When to use:** Any per-pointermove computation that shouldn't cause per-event re-renders.

```typescript
// Source: CONTEXT.md D-06; spike lines 100-104 and 120-122 adapted for ref pattern
const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
const [dragCoversSomeCard, setDragCoversSomeCard] = useState(false);

function handleDragMove(event: DragMoveEvent) {
  dragDeltaRef.current = { x: event.delta.x, y: event.delta.y };
  if (!activeCard) return;
  const draggedPos = {
    x: activeCard.x + event.delta.x,   // activeCard from state at dragStart
    y: activeCard.y + event.delta.y,
  };
  const nowCovers = gameState.canvasCards.some(
    other => other.card.id !== activeCard.card.id && coversMajority(draggedPos, other)
  );
  if (nowCovers !== dragCoversSomeCard) setDragCoversSomeCard(nowCovers);
}
```

**Key note:** `activeCard` in `BoardDragLayer` is typed as `Card | null` (it only stores the `Card` value, not the full `CanvasCard`). The drag-time shadow check requires the stored canvas position of the dragged card. Use `gameState.canvasCards.find(cc => cc.card.id === activeCard.id)` to recover `{x, y}` at `dragStart` time, or store the position separately on `dragStart`. See the Pitfall on activeCard type below.

### Pattern 3: coversMajority Utility

```typescript
// Source: src/spikes/Spike002OverlapHitTesting.tsx lines 49-53 (VALIDATED)
const CARD_W = 63;
const CARD_H = 88;
export const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

export function coversMajority(top: { x: number; y: number }, bottom: { x: number; y: number }): boolean {
  const overlapW = Math.max(0, Math.min(top.x + CARD_W, bottom.x + CARD_W) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + CARD_H, bottom.y + CARD_H) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > CARD_W * CARD_H * 0.5;
}
```

**Note:** `CARD_W`/`CARD_H` are already referenced inline in `BoardDragLayer` for bounds clamping (desktop 63×88, mobile 42×59). The spike and `canvas-utils.ts` should use the desktop constants for overlap calculation, since the z-ordering shadow is a desktop-first feature. If responsive CARD dimensions are needed, a `getCardDimensions()` helper reading `window.innerWidth` could be added — but CONTEXT.md specifies no such requirement; keep it simple.

### Anti-Patterns to Avoid

- **`setState` inside `onDragMove` unconditionally:** Every pointermove fires `setState` → 60 re-renders/second → jank. Always guard with `if (nowCovers !== prev)`.
- **Putting overlap check in `CanvasDraggableCard`:** Each card would compute the full cards array independently. Put it once in `CanvasZone` (static) and `BoardDragLayer` (drag-time), pass result as prop.
- **Using `isDraggingActive` prop for shadow:** D-07 explicitly defers this prop to Phase 33+ but confirms it is NOT used for the shadow. Shadow flows from `coversIds` set, not per-card active state.
- **Spreading `DragMoveEvent` type from wrong import:** `DragMoveEvent` is a type export from `@dnd-kit/core`; import as `import type { DragMoveEvent } from '@dnd-kit/core'`. The runtime `onDragMove` prop on `DndContext` accepts a callback directly — no special import needed for the handler itself.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AABB overlap detection | Custom geometry | `coversMajority()` from spike | Already validated; handles all edge cases (no overlap, partial, full) |
| CSS stacking indicator | Gradient/overlay component | Single `boxShadow` string | Spike validated this is visually sufficient; layered box-shadow is pure CSS, zero DOM overhead |
| Drag position tracking | Complex state machine | `dragDeltaRef` + `event.delta` from dnd-kit | `DragMoveEvent.delta` is always relative to `dragStart` position — no accumulation needed |

---

## Common Pitfalls

### Pitfall 1: `activeCard` in `BoardDragLayer` is `Card`, not `CanvasCard`

**What goes wrong:** The drag-time shadow check needs `{x, y}` of the dragged card's canvas position. `activeCard` state in `BoardDragLayer` is `Card | null` — it holds the card identity only, not position.

**Why it happens:** `handleDragStart` sets `setActiveCard(data.card)` from the drag event data, which only carries the `Card` object.

**How to avoid:** At `dragStart`, also capture the canvas position: `const existing = gameState.canvasCards.find(cc => cc.card.id === data.card.id); setActiveDragOrigin(existing ? {x: existing.x, y: existing.y} : null)`. Then in `onDragMove`: `draggedPos = {x: activeDragOrigin.x + delta.x, y: activeDragOrigin.y + delta.y}`. Add an `activeDragOrigin: {x: number; y: number} | null` state variable alongside the existing `activeCard` state.

**Warning signs:** Drag-time shadow never appears, or appears in wrong positions, when dragging canvas cards.

### Pitfall 2: Shadow must be reset to `false` on dragEnd and dragCancel

**What goes wrong:** `dragCoversSomeCard` stays `true` after a drop, causing the DragOverlay render to show a stale shadow on the next drag if the first `onDragMove` fires before the boolean resets.

**Why it happens:** `handleDragEnd` calls `setActiveCard(null)` but doesn't reset `dragCoversSomeCard`. The DragOverlay renders `null` when `activeCard` is null, so it doesn't show, but the boolean leaks to the next drag.

**How to avoid:** Add `setDragCoversSomeCard(false)` and clear `activeDragOrigin` to `null` in both `handleDragEnd` and `handleDragCancel`.

**Warning signs:** On second drag, shadow appears immediately at position (0,0) before any movement.

### Pitfall 3: Non-canvas drags triggering onDragMove

**What goes wrong:** `onDragMove` fires for ALL drags (hand cards, pile cards), not just canvas cards. The drag-time shadow check attempts to find canvas position for a hand card — `existing` will be `undefined` — and the check should short-circuit cleanly.

**Why it happens:** `DndContext.onDragMove` is global.

**How to avoid:** Guard the drag-time overlap check with a `fromZone === 'canvas'` check: `if (dragDataRef.current?.fromZone !== 'canvas') return;` at the top of `handleDragMove`.

**Warning signs:** Console errors from accessing undefined `.x` property; or shadow appears erroneously on hand drags.

### Pitfall 4: useMemo dependency on `canvasCards` identity

**What goes wrong:** If `canvasCards` is reconstructed on every render (new array reference even when content is the same), `coveringIds` recomputes unnecessarily.

**Why it happens:** `canvasCards` comes from `gameState.canvasCards` which flows from server state via `useState`. React state updates always produce new references, so identity-based memo won't help here.

**How to avoid:** This is acceptable — `useMemo` recomputes when `canvasCards` changes, which is correct behavior. The computation is O(n²) but n ≤ 52 cards; it's negligible. Don't add deep equality checks.

---

## Code Examples

### CanvasDraggableCard prop extension

```typescript
// Source: CanvasDraggableCard.tsx existing style object (lines 39-47) + spike line 75-77
interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  isDraggingActive?: boolean;
  coversAnother?: boolean;   // ADD: from parent coveringIds Set
}

const style: React.CSSProperties = {
  position: 'absolute',
  left: canvasCard.x,
  top: canvasCard.y,
  zIndex: canvasCard.z,
  opacity: isDragging ? 0 : 1,
  transform: isDragging ? undefined : CSS.Translate.toString(transform),
  touchAction: 'none',
  boxShadow: coversAnother ? STACK_SHADOW : undefined,   // ADD
  borderRadius: coversAnother ? 6 : undefined,            // ADD
};
```

### DragOverlay conditional shadow

```typescript
// Source: BoardDragLayer.tsx ~line 418-424 + spike lines 193-205
<DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
  {activeCard ? (
    <div style={{
      opacity: 0.5,
      transform: 'scale(1.05)',
      boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined,   // ADD
      borderRadius: dragCoversSomeCard ? 6 : undefined,            // ADD
    }}>
      <CardOverlay card={activeCard} />
    </div>
  ) : null}
</DragOverlay>
```

### DndContext onDragMove hookup

```typescript
// Source: BoardDragLayer.tsx ~line 408-415
<DndContext
  sensors={sensors}
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}    // ADD
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
>
```

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is not a rename/refactor/migration phase.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies beyond the existing dev stack. No new tools, services, or runtimes required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OVERLAP-01 | Clicking topmost card at overlap point targets that card (not lower card) | manual-only | N/A — requires real browser pointer event at CSS z-index boundary; not automatable via Vitest DOM | N/A |
| OVERLAP-02 | DragOverlay renders at 0.5 opacity | unit | Already covered by Phase 32 implementation; no test written (visual-only) | N/A |
| OVERLAP-03 | `coversMajority()` returns true when overlap > 50%, false otherwise | unit | `npm test -- --reporter=verbose tests/overlapUtils.test.ts` | ❌ Wave 0 |
| OVERLAP-03 | `coveringIds` useMemo correctly identifies covering card IDs for a given canvasCards array | unit | `npm test -- --reporter=verbose tests/overlapUtils.test.ts` | ❌ Wave 0 |
| OVERLAP-03 | Shadow CSS constant value matches spec | unit | same file | ❌ Wave 0 |

**Manual-only justification (OVERLAP-01):** CSS z-index pointer routing is a browser rendering behavior. Vitest runs in jsdom which does not implement CSS stacking context or pointer hit-testing. Playwright could test this, but the behavior is already verified in Spike002 and is a trivial outcome of the existing Phase 32 z-index implementation. A comment in the test file documenting this rationale is sufficient.

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/overlapUtils.test.ts` — unit tests for `coversMajority()` boundary cases (0% overlap, 50% exactly, 51%, 100%), `STACK_SHADOW` constant value, and `coveringIds` set membership for a 3-card scenario. Covers OVERLAP-03.

---

## Security Domain

`security_enforcement` not set to false — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Overlap computation is pure client-side geometry over trusted server state; no user-supplied strings parsed |
| V6 Cryptography | no | — |

**Assessment:** Phase 33 is pure client-side rendering. No user input is parsed, no data is sent to the server, no auth paths are touched. ASVS categories do not apply.

### Known Threat Patterns for client rendering

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| N/A — no server interaction | — | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Desktop card dimensions (63×88) are correct for overlap calculation; mobile dimensions (42×59) not needed for shadow feature | Architecture Patterns / Pattern 3 | If mobile shadow is required, `coversMajority` needs a viewport-aware `CARD_W`/`CARD_H` — add `getCardDimensions()` helper |
| A2 | `dragDataRef.current?.fromZone` reliably reflects `'canvas'` for canvas drags at `onDragMove` time | Common Pitfalls / Pitfall 3 | dragDataRef is set synchronously in `handleDragStart` before any `onDragMove` fires — this is safe by dnd-kit event ordering |

**Risk of A1:** LOW — the UI-SPEC does not mention mobile shadow, and OVERLAP-03 has no mobile dimension requirement. Desktop-only is correct for this phase.

**Risk of A2:** LOW — dnd-kit fires `onDragStart` before `onDragMove`; confirmed by spike implementation and dnd-kit event model.

---

## Open Questions

1. **`activeDragOrigin` state: store as `{x, y}` or as `CanvasCard`?**
   - What we know: `BoardDragLayer` already has `activeCard: Card | null`; only `{x, y}` is needed for the drag-time check.
   - What's unclear: Whether Phase 34 (multi-card group drop) will also need the full `CanvasCard` reference, which could inform whether to store `{x, y}` or the full object now.
   - Recommendation: Store only `{x: number; y: number} | null` as `activeDragOrigin` in Phase 33. Phase 34 can widen it if needed.

---

## Sources

### Primary (HIGH confidence)

- `src/spikes/Spike002OverlapHitTesting.tsx` — VALIDATED spike; exact implementation patterns extracted directly
- `.planning/spikes/MANIFEST.md` — spike 002 verdict and spec
- `src/components/CanvasDraggableCard.tsx` — production integration point for shadow prop
- `src/components/CanvasZone.tsx` — production integration point for coveringIds useMemo
- `src/components/BoardDragLayer.tsx` — production integration point for onDragMove + DragOverlay shadow
- `.planning/phases/33-overlap-visibility/33-CONTEXT.md` — locked implementation decisions (D-01 through D-08)
- `.planning/phases/33-overlap-visibility/33-UI-SPEC.md` — approved visual contract
- `@dnd-kit/core/dist/index.d.ts` — `DragMoveEvent` type confirmed exported [VERIFIED: direct file inspection]
- `node_modules/@dnd-kit/core` — version 6.3.1 confirmed [VERIFIED: npm view]

### Secondary (MEDIUM confidence)

None required — all critical claims sourced from codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing
- Architecture: HIGH — spike is validated proof-of-concept; production integration points inspected directly
- Pitfalls: HIGH — derived from reading actual production code and identifying the exact gaps (activeCard type mismatch, dragEnd reset, non-canvas drag guard)

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (stable domain — React/dnd-kit; no expiry risk)
