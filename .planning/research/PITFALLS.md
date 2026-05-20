# Pitfalls Research — Virtual Deck v1.5

**Domain:** Real-time multiplayer card table — layout restructuring and UX polish sprint on existing dnd-kit + shadcn + PartyKit app
**Researched:** 2026-05-19
**Confidence:** HIGH for dnd-kit mechanics (derived from live codebase inspection + official docs + GitHub issues); HIGH for CSS stacking context behavior (MDN authoritative); MEDIUM for multiplayer "original order" edge cases (PartyKit-specific reasoning from architecture, not direct dnd-kit docs)

**Context:** SUBSEQUENT MILESTONE — pitfalls specific to v1.5 changes. v1.4 state assumed:
- `BoardDragLayer` owns the single `DndContext` with `customCollision` (pointerWithin + closestCenter hybrid)
- `DragOverlay` renders via `createPortal` into `document.body` — so the overlay itself is NOT clipped by any container
- `OpponentHand` uses `useDndContext()` to read `active` and shows a dashed border during `dragIsActive`
- `HandZone` uses local `useState` for `sortMode`; sort does NOT enter the undo stack (`skipSnapshot: true`)
- `SpreadZone` is hidden when empty for the local player; revealed via `isOver || draggingCardId` at drag start
- `GridZone` renders a hardcoded `COLS=7` grid with `grid-cols-7`
- `PileZone` always renders a `<Badge>` with the raw count — including zero

---

## Critical Pitfalls

---

### Pitfall 1: DOM Restructure Breaks dnd-kit Droppable Rect Measurements

**What goes wrong:**
Moving `SpreadZone` from its current position (inside the `flex-1` scroll area below the grid) to dock it alongside `OpponentHand` (in the top header `flex` row) changes the DOM ancestry of every droppable node inside it. dnd-kit caches droppable bounding rects at drag-start via `ResizeObserver` and re-measures on changes. After a DOM parent restructure, stale measurements can persist for one or more frames — causing collision detection to register a hit against the old coordinates while the element is visually at new coordinates.

The risk is highest for the **personal spread zone** (`mySpreadZone`) because its position shifts from `bottom of board` to `above HandZone`, a large vertical offset. If collision detection fires against the old rect, a card dropped on the hand strip may appear to land in the spread zone.

**Why it happens:**
dnd-kit's `ResizeObserver` watches the droppable node itself for size changes, not position changes. Moving the node to a new parent changes its page position without triggering a ResizeObserver callback. The next measurement happens on the next drag-start, so the first drag after the DOM restructure uses a potentially stale rect.

**Prevention:**
- After restructuring the DOM, verify collision detection by running Playwright: drag from hand to pile, drag from pile to hand, drag across the spread zone. Test specifically that dropping on the hand strip does NOT trigger a spread zone drop.
- If stale rect problems appear, pass `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` to `DndContext`. This forces measurement before drag start at the cost of minor background perf. Given the small element count (2-4 players × a few zones), the cost is negligible.
- Keep `setNodeRef` on the same DOM element before and after restructure — do not temporarily remove and re-attach. React reconciliation is fine; unmounting the component entirely for one render cycle would force dnd-kit to deregister and re-register the droppable, which in practice works but causes a flash where the droppable is unknown.

**Warning signs:**
Cards visually land in the correct zone but the action dispatched points to a different `toId`. Log `event.over?.id` in `handleDragEnd` during development to catch this before it reaches users.

**Phase to address:** 999.46 (Dock spread zones to hands) — add explicit e2e coverage for cross-zone drops immediately after the layout restructure.

---

### Pitfall 2: New CSS `transform` or `overflow:hidden` on a Wrapper Creates a Stacking Context That Clips the Drag Overlay... Except It Doesn't — But It Will Clip Non-Overlay Cards

**What goes wrong:**
The `DragOverlay` renders via `createPortal` into `document.body` and is never clipped by application containers — that part is safe and is the correct existing pattern. The risk is the **source card placeholder** and **sortable transform animations** on cards that remain in the spread zone during a drag.

If the new "dock spread zones to hands" layout wraps opponent spread zones in a container with `overflow-x: hidden` or `overflow: hidden` (likely needed to prevent horizontal spillover at mobile widths), the sortable transform animation for intra-spread drags will be clipped at the container boundary. Cards being reordered animate via CSS `transform: translateX(...)`. If the containing element has `overflow: hidden`, a card animating past the container edge is clipped mid-animation.

Additionally: any new parent element in the restructured layout that applies `transform`, `will-change: transform`, `filter`, or `opacity < 1` on the wrapper **creates a new stacking context**. Child z-index values are then scoped to that context and cannot escape it. This matters for `SortableSpreadCard` selection rings (`ring-1 ring-primary/30`) and card-stack depth ordering.

**Why it happens:**
CSS stacking contexts are created implicitly by `transform`, `opacity < 1`, `filter`, `will-change`, `isolation: isolate`, and `contain`. These are easy to introduce accidentally when adding Tailwind utilities for the new layout (e.g., `motion-safe:transition-transform` on a wrapper, or a shadow utility that uses CSS `filter`).

**Prevention:**
- Audit every new wrapper added during the layout restructure. If it uses `overflow-x: hidden`, ensure the spread zone cards do not animate horizontally past the container boundary during intra-spread reorder.
- Prefer `overflow-x: clip` over `overflow-x: hidden` when you need to prevent scrollbar appearance without clipping positioned/transformed descendants — `clip` does not create a stacking context.
- Do NOT add `transform`, `will-change: transform`, `filter`, or `opacity` to the new wrapper that contains `SpreadZone`. Use `isolate` explicitly (Tailwind: `isolate`) only if you need stacking control.
- Test drag animation inside opponent spread zones by dragging a card to nearly the edge of its container at 375px viewport.

**Warning signs:**
Card animation visually clips mid-slide at a container edge. Selection ring appears below the card rather than above it.

**Phase to address:** 999.46 (Dock spread zones) and 999.47 (Empty spread zone strip) — any layout wrapper added in these phases.

---

### Pitfall 3: `dragIsActive` Pattern in `OpponentHand` Shows Outline at Drag Start, Not on Hover — And the Fix Can Break Drop Registration

**What goes wrong:**
`OpponentHand` currently reads `const { active } = useDndContext()` and sets `dragIsActive = active !== null`. This causes the dashed border to appear on ALL opponent hands the moment ANY card is picked up — even when dragging within the player's own hand. Requirement 999.44 is to show the outline only on hover (pointer inside the droppable rect).

The naive fix is to check `isOver` from `useDroppable` instead of `dragIsActive`. This is correct for the visual, but there is a subtle trap: `isOver` only becomes true when the pointer actually enters the droppable rect. If you also make the droppable conditionally disabled (e.g., `disabled: !dragIsActive`) to skip collision detection when no drag is active, `isOver` will never become true when dragging from outside. More critically: **making the droppable `disabled` while a drag is in flight deregisters the droppable from collision detection** — a card dragged slowly into the opponent hand zone may register no drop target.

A second trap: if you replace the `dragIsActive && 'min-h-[44px] min-w-[80px]'` conditional (which expands the hit target during drag) with only `isOver`-driven expansion, the opponent hand may be too small a hit target to register `isOver` in the first place. This is a bootstrap problem: the target needs to be big enough to receive a hover, but it only expands when it's hovered.

**Prevention:**
- Keep `dragIsActive` (from `useDndContext`) for the **hit-target expansion** (`min-h` / `min-w` classes). This ensures the droppable rect is large enough to receive a collision.
- Use `isOver` from `useDroppable` only for the **visual styling** (border color/style). Do not use `isOver` to control whether the droppable is registered.
- The correct pattern is:
  ```tsx
  const { active } = useDndContext();
  const dragIsActive = active !== null;
  const { setNodeRef, isOver } = useDroppable({ id: `opponent-hand-${playerId}`, ... });
  // visual: isOver → solid border; no drag → transparent; drag but not over → no border
  className={cn(
    'border-2',
    isOver ? 'border-primary' : 'border-transparent',
    dragIsActive && 'min-h-[44px] min-w-[80px]'
  )}
  ```
  This eliminates the dashed border at drag-start while preserving hit target expansion and drop registration.
- Do not add `disabled` prop to `useDroppable` based on drag state — the droppable should always be registered during a drag.

**Warning signs:**
After the fix, attempt to pass a card to an opponent: if the card snaps back instead of landing in the opponent hand, the droppable was disabled or too small. Run the Playwright e2e suite — `opponent-hand` drop coverage exists in the test fixture.

**Phase to address:** 999.44 (Opponent hand outline on hover only).

---

### Pitfall 4: `grid-cols-7` Is Hardcoded and Will Not Collapse on Mobile Without a Breakpoint Override

**What goes wrong:**
`GridZone` uses `grid grid-cols-7` with no responsive modifier. On iPhone SE (375px), each cell is `w-14` (56px), making the grid 7 × 56px = 392px + gap, which overflows the 375px viewport. Requirement 999.39 is to collapse to 4 columns on mobile.

The naive fix of `grid-cols-4 sm:grid-cols-7` works visually, but introduces a secondary pitfall: cards already placed at columns 5, 6, or 7 will render outside the 4-column grid on mobile. Their `gridPositions` still reference `col: 4`, `col: 5`, `col: 6`. Tailwind's CSS grid auto-placement will wrap them into new rows, but the `buildCellMap` function uses `gridPositions` keyed by `row,col` — so cards at `col > 3` will appear in the wrong row visually, even though their server position is correct.

**Why it happens:**
Tailwind responsive utilities are purely CSS (no JS). `grid-cols-4 sm:grid-cols-7` changes the rendered column count, but the game state still encodes positions using the 7-column coordinate system. There is no client-side mapping from 7-col to 4-col positions.

**Prevention:**
- The `COLS` constant in `GridZone.tsx` controls both grid rendering and cell position logic. A mobile-responsive grid needs either:
  1. **CSS-only visual collapse** — accept that cards at col ≥ 4 reflow onto row 2 on mobile, which is visually tolerable for a 2-row grid since they stay on the board.
  2. **JS-driven column count** — derive `COLS` from `window.innerWidth` via a hook. This is more correct but adds complexity.
- For v1.5, the CSS-only approach is sufficient: use `grid-cols-4 sm:grid-cols-7` and verify that the 2-row grid at 4 columns (8 cells) still shows all 14 cells worth of content acceptably. The existing `overflow-x-auto` on the grid container provides a fallback.
- Do NOT dynamically construct the class string as `grid-cols-${cols}` — Tailwind's build scanner requires complete class names in source. `grid-cols-4` and `grid-cols-7` must appear as literal strings.

**Warning signs:**
Cards disappear on mobile (purged class), or `grid-cols-${someVar}` produces no CSS in the production build. Check the built CSS for `.grid-cols-4` and `.grid-cols-7`.

**Phase to address:** 999.39 (Fix grid mobile columns).

---

### Pitfall 5: Badge Conditional `{pile.cards.length}` — Off-By-One When Length Transitions Through Zero

**What goes wrong:**
`PileZone` currently always renders `<Badge>{pile.cards.length}</Badge>`. Requirement 999.49 is to hide the badge when the pile is empty. The fix appears trivial: `{pile.cards.length > 0 && <Badge>{pile.cards.length}</Badge>}`.

The risk is during rapid state transitions: when a card is drawn (length goes from 1 to 0), the server broadcasts a state update. The React render with the new `gameState` removes the badge. During the 50–150ms round-trip before the new state arrives, the client still shows the old state (length = 1). This is correct. The problem is the reverse: when a card is added to an empty pile (length goes from 0 to 1), the badge re-appears. If the badge appearance is animated (e.g., `animate-in fade-in`), a flickering 0-badge can appear for one render frame if the `gameState` briefly delivers `cards.length === 0` after a reset followed by immediate server-push.

In multiplayer, the server sends `STATE_UPDATE` after every action. If two actions fire in rapid succession (e.g., deal cards + immediate server-side state reconciliation), a client may receive an intermediate state where `cards.length === 0` between two valid states. A zero-badge flash is possible.

**Prevention:**
- The conditional `pile.cards.length > 0 && <Badge>...</Badge>` is correct and sufficient. Do not add animation to the badge's appear/disappear — it amplifies the flash window.
- Keep `Badge` purely count-driven. Do not derive visibility from animation state or local component state.
- Do NOT cache `pile.cards.length` in local `useState` — stale state on rapid updates is worse than a momentary visual flash.
- The stale-state risk for this specific change is LOW — the badge render depends only on `pile.cards.length` which comes directly from `gameState.piles`, the single authoritative source. There are no local state copies to go stale.

**Warning signs:**
Orange badge visible at count zero during Playwright e2e tests that reset the table.

**Phase to address:** 999.49 (Hide zero-count badge on empty piles).

---

### Pitfall 6: "Original Order" Is Undefined in a Multiplayer Context — Each Player Gets a Different Original

**What goes wrong:**
`HandZone` stores `sortMode` in local `useState`. When `sortMode === 'original'`, the display order is the raw `cards` array from `gameState.myHand`. "Original" is therefore implicitly the server's current hand order, which is the order cards were dealt or most recently manually reordered by REORDER_HAND dispatch.

The problem: `sortMode` is purely local client state. When Player A sorts by suit, sorts by rank, then clicks "original", they expect to see the order they had before sorting. But the server state already has the by-rank order because sorting dispatches `REORDER_HAND` (with `skipSnapshot: true`). When "original" is clicked, `buildSortDispatch` returns `null`, meaning no action is dispatched — the display just shows `cards` (the server's current order), which IS the by-rank order the player just applied. "Original" therefore means "current server order", not "deal order".

In multiplayer, if Player A deals 5 cards and gets [A♠, 3♥, 7♦, K♣, 2♠], sorts by rank to [2♠, 3♥, 7♦, A♠, K♣], then clicks "original" — they see [2♠, 3♥, 7♦, A♠, K♣] because the server was updated. The deal order is irretrievably lost.

Requirement 999.42 asks to define and implement what "original" means. There are two valid interpretations:

1. **"Original" = deal order** — requires storing a snapshot of the hand at deal time (not currently tracked anywhere)
2. **"Original" = sort-cycle reset** — the sort button becomes a three-state toggle that simply clears `bySuit`/`byRank` and reverts to current server order. "Original" is a UI label for "unsorted" not "deal order".

**Prevention:**
- Choose interpretation 2 (sort-cycle reset) unless the feature requirement explicitly says deal order. Interpretation 1 requires a new `originalHandOrder` field on `ClientGameState` (or local storage snapshot), a server change to capture it at deal time, and reconnection handling.
- If implementing interpretation 1: store `originalOrder` in a `useRef` (not `useState`) that is set once when the hand is first received and never updated on REORDER_HAND. This avoids the stale closure problem and doesn't trigger re-renders. The `useRef` must be reset if the hand is fully replaced (e.g., after RESET_TABLE).
- Do NOT store original order in a `useState` that participates in effects — a RESET_TABLE followed by a new deal will cause a state update that re-initializes the ref before the UI settles.
- CRITICAL multiplayer edge case: Player B passing cards to Player A changes `myHand` mid-session. If `originalOrder` is stored as the deal-time snapshot, passed cards are not in the original order at all. The safest behavior is to append passed cards to the end of the original-order display list.

**Warning signs:**
After RESET_TABLE + redeal, the "original" sort shows the pre-reset hand order (stale ref). After a card is passed in, the sort crashes or shows undefined card IDs.

**Phase to address:** 999.42 (Hand sort original order). Requires an explicit decision before implementation begins — the semantics must be decided, not just coded.

---

### Pitfall 7: `useDndMonitor` in `SpreadZone` Still Fires After DOM Relocation

**What goes wrong:**
`SpreadZone` uses `useDndMonitor({ onDragEnd })` to intercept intra-spread reorders. This hook subscribes to the nearest `DndContext` ancestor. After docking spread zones to hands (phase 999.46), the `SpreadZone` for opponents will move from the lower board area into the top header section of `BoardView`. The `DndContext` is on `BoardDragLayer`, which is the common ancestor of both old and new positions — so `useDndMonitor` will continue to fire correctly.

The risk is when the `SpreadZone` is temporarily unmounted and remounted during the DOM restructure. If the component remounts, `useDndMonitor` re-subscribes, but any drag that was already in flight at the moment of remount may not deliver its `onDragEnd` to the new subscription. Cards being dragged during a hot-reload or during a React StrictMode double-render that unmounts/remounts components can silently swallow the reorder.

**Why it happens:**
`useDndMonitor` calls `useEffect` under the hood to subscribe/unsubscribe. If the component unmounts and remounts mid-drag, the old subscription is torn down and the new subscription is not yet established when `onDragEnd` fires.

**Prevention:**
- During the DOM restructure, ensure the `key` prop on `SpreadZone` instances in `BoardView` does not change when the layout changes. React uses `key` to decide whether to unmount + remount vs. reconcile in place. If the `key` stays stable, the component is not remounted — it simply moves in the DOM, which is fine.
- Specifically: the opponent spread zones are keyed by `opponentSpread.id` (inferred from `id` in `BoardView.tsx`). Keep that key stable.
- Do NOT add a new `key` that includes position information (e.g., `key={`spread-${id}-top`}`) — this forces unmount/remount on position change.

**Warning signs:**
After restructuring the DOM, a drag-to-reorder within an opponent's spread zone completes visually but does not dispatch `REORDER_PILE_SPREAD`. Check server logs or add a `console.log` in `onDragEnd` during development.

**Phase to address:** 999.46 (Dock spread zones to hands).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded `COLS=7` in GridZone | No dynamic column logic needed | Cannot adapt grid size without code change; mobile fix requires breakpoint workaround | Acceptable for v1.5; if grid becomes configurable per-room, this needs to be data-driven |
| `sortMode` in local `useState` (not server state) | Zero round-trip; no server changes | "Original" is not the deal order; different devices for same player would show different sort | Acceptable — sort mode is a display preference, per the v1.4 decision to use `skipSnapshot` |
| `dragIsActive` derived from `useDndContext().active` on every droppable | Simple boolean, no extra context | Causes all droppable-containing components to re-render on every drag-start | Acceptable for 2–4 player board; problematic if number of droppables grows into dozens |
| Empty spread zone visibility driven by `isDragging` (server-propagated via `draggingCardId`) | Single source of truth for drag state | One render lag between drag start and zone reveal; `draggingCardId` is `activeCard?.id` in `BoardDragLayer` | Acceptable; no user-visible lag at 60fps |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| dnd-kit `useDroppable` + conditional rendering | Conditionally rendering the droppable container unmounts/remounts the hook, causing a flash where the zone is unregistered | Always keep the droppable rendered; control visibility with CSS (`opacity-0`, `h-0`) not conditional render |
| dnd-kit `customCollision` + new droppable ID prefixes | Adding a new zone type without adding its prefix filter to `customCollision` causes it to fall into the wrong priority bucket | When adding a new droppable ID scheme, update all five filter predicates in `BoardDragLayer.customCollision` |
| Tailwind + dynamic class strings | Building class names at runtime with string concatenation (`'grid-cols-' + n`) causes Tailwind to purge the class | Write complete literal class names; use a lookup object or ternary |
| PartyKit + `skipSnapshot: true` | Sending `REORDER_HAND` with `skipSnapshot` means undo cannot recover a sort — but it also means a sort cannot accidentally consume the single available undo step | Correct and intentional; never remove `skipSnapshot` from sort dispatches |
| React `useRef` for original hand order | Reading `ref.current` in render (not in a callback) causes stale values in StrictMode's double-render | Use `useRef` only for values read in event handlers and effects, not in render JSX |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `useDndContext()` in every droppable component | All components re-render on drag start and drag end; noticeable lag on older hardware | Minimize components that call `useDndContext`; for the opponent hand border fix, keep the call in `OpponentHand` only | Observable at ~20+ droppable components; current board has ~8–12, safely under threshold |
| `MeasuringStrategy.Always` on `DndContext` | Measures all droppable rects on every frame; unnecessary for a small board | Use default strategy; only upgrade to `Always` if stale rect bugs are confirmed | Fine for any size board with <50 droppables |
| Tailwind JIT content scan misses dynamic classes | Missing styles in production build | All class names must be literal strings in TSX/TS files | Happens on first production deployment; caught by visual regression |

---

## "Looks Done But Isn't" Checklist

- [ ] **Opponent hand outline (999.44):** Verify the dashed border does NOT appear when dragging within your own hand (i.e., `dragIsActive` from `useDndContext` is removed from the border styling and replaced with `isOver` only)
- [ ] **Spread zone dock (999.46):** After restructuring the DOM, verify all existing Playwright drag e2e tests still pass — specifically cross-zone drags that land in zones whose position changed
- [ ] **Empty spread zone strip (999.47):** Verify the strip is not a drop target for the wrong zone — the `useDroppable` ID must still be `pile-${pile.id}`, not a new ID
- [ ] **Grid mobile columns (999.39):** Verify `grid-cols-4` AND `grid-cols-7` appear as literal strings in the built CSS — check `dist/assets/*.css` after `npm run build`
- [ ] **Badge at zero (999.49):** Verify RESET_TABLE followed by immediate redeal does not show a zero-count badge flash — test in both single-browser and Playwright two-context fixture
- [ ] **Hand sort "original" (999.42):** Confirm decision is documented in the phase plan before any code is written. The implementation strategy differs significantly between "deal order" and "sort-cycle reset" interpretations.
- [ ] **Spread zone name labels removed (999.48):** Removing the `<span>` that shows `pile.name` also removes the space that previously held the "N selected" badge in `SpreadZone.tsx` line 159. Verify the selected-count badge has a new rendering location or is re-parented to the controls row.
- [ ] **Remove opponent spread face-toggle (999.43):** The `handleToggleFace` Button in `SpreadZone` is guarded by `(!isEmpty || interactive === false)` — the condition currently renders the toggle even for `interactive === false`. The toggle itself is outside the `interactive !== false &&` guard in the existing code. Verify the face-toggle is correctly suppressed when `interactive === false`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale droppable rect after DOM restructure | LOW | Add `measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}` to `DndContext` in `BoardDragLayer`; re-run e2e suite to confirm |
| Overflow-hidden clips sortable animation | MEDIUM | Replace `overflow-x: hidden` with `overflow-x: clip` on the wrapper; if `clip` not supported (it is in all evergreen browsers), set `overflow: hidden` on a non-ancestor wrapper by restructuring the layout |
| `useDndMonitor` subscription lost on remount | LOW | Fix the `key` prop on the affected `SpreadZone` to not change on layout restructure; confirm with a `console.log` in `onDragEnd` |
| Dynamic Tailwind class purged in production | LOW | Add the class to `safelist` in `tailwind.config` or rewrite as a literal ternary |
| "Original order" semantics shipped without decision | HIGH | Requires a server-side field (`originalHandOrder` on `ClientGameState`) or a breaking change to the undo/sort architecture; this is a rewrite if discovered post-ship |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale droppable rects after DOM restructure | 999.46 (Dock spread zones) | Run full Playwright e2e suite; manually drag from every zone to every other zone |
| CSS stacking context / overflow-hidden clips cards | 999.46, 999.47 | Visual inspection at 375px; drag card to near edge of spread zone container |
| `dragIsActive` vs `isOver` in OpponentHand | 999.44 (Opponent hand outline) | Playwright: drag within own hand, verify NO opponent hand border appears |
| `grid-cols-7` hardcoded, no mobile collapse | 999.39 (Fix grid mobile columns) | Check built CSS for `grid-cols-4`; Playwright viewport resize test |
| Badge renders at zero | 999.49 (Hide zero-count badge) | Playwright RESET_TABLE test; verify no badge visible after reset |
| "Original order" semantics undefined | 999.42 (Hand sort original order) | Decision must precede PR; verify in phase plan before implementation |
| `useDndMonitor` subscription lost on remount | 999.46 (Dock spread zones) | Drag intra-spread reorder after layout restructure; check server receives `REORDER_PILE_SPREAD` |
| Dynamic Tailwind class purged | 999.39 | `npm run build` → inspect `dist/assets/*.css` for `grid-cols-4` |
| Opponent spread face-toggle still visible | 999.43 (Remove face-toggle) | Render opponent spread zone with `interactive=false`; assert no Eye/EyeOff button in DOM |
| Spread name label removal breaks selected-count badge position | 999.48 (Remove spread zone labels) | Select 3+ cards in spread zone; assert badge renders and is legible |

---

## Sources

- dnd-kit official docs: https://docs.dndkit.com/api-documentation/context-provider — `MeasuringStrategy`, `useDndContext`
- dnd-kit GitHub issue #389: Unnecessary re-renders on drag — https://github.com/clauderic/dnd-kit/issues/389
- dnd-kit GitHub issue #1071: Re-rendering all draggable items on drag start — https://github.com/clauderic/dnd-kit/issues/1071
- dnd-kit GitHub issue #859: `useDraggable` with `overflow-y: auto` — https://github.com/clauderic/dnd-kit/issues/859
- dnd-kit GitHub issue #1098: Can't drag outside container — https://github.com/clauderic/dnd-kit/issues/1098
- dnd-kit GitHub PR #379: `MeasuringConfiguration` refactor — https://github.com/clauderic/dnd-kit/pull/379
- MDN: Stacking context — https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context
- MDN: `overflow-x: clip` — creates no stacking context; https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-x
- Tailwind dynamic classes: https://tailkits.com/blog/tailwind-dynamic-classes/
- React docs: Updating arrays in state — https://react.dev/learn/updating-arrays-in-state
- Live codebase inspection: `src/components/OpponentHand.tsx`, `HandZone.tsx`, `SpreadZone.tsx`, `GridZone.tsx`, `PileZone.tsx`, `BoardDragLayer.tsx`, `BoardView.tsx` (all read directly for this research)

---
*Pitfalls research for: Virtual Deck v1.5 — layout/UX polish sprint*
*Researched: 2026-05-19*
