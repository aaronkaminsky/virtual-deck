# Pitfalls Research — Virtual Deck v1.3

**Domain:** Real-time multiplayer card table — adding layout/UX polish and spread zone interactivity to existing dnd-kit + shadcn + PartyKit app
**Researched:** 2026-05-01
**Confidence:** HIGH for dnd-kit mechanics (derived from codebase + official docs); HIGH for CSS pitfalls (standard behavior); MEDIUM for shadcn controls panel z-index (implementation-specific)

**Context:** SUBSEQUENT MILESTONE — pitfalls specific to v1.3 additions. Assumes v1.2 state: SpreadZone uses `useSortable` + `useDraggable` nested in the same card element; `BoardDragLayer` owns a single `DndContext` with custom `customCollision`; `BoardView` uses `h-screen flex-col overflow-hidden`.

---

## Critical Pitfalls

---

### Pitfall 1: `useSortable` + `useDraggable` on the Same Card Element Register Duplicate IDs

**What goes wrong:** `SortableSpreadCard` in `SpreadZone.tsx` wraps a `DraggableCard` child that calls `useDraggable(card.id)`. The outer `useSortable(card.id)` is also an abstraction over `useDraggable`. Both hooks register the same `card.id` into dnd-kit's internal draggable registry. This produces duplicate ID warnings in development and causes unpredictable drag behavior in production: pointer events may fire on the wrong registration, the DragOverlay may not pick up the correct source rect, and `onDragEnd` receives stale `active.data`.

This is the current state of the spread zone cards and it already works because the inner `DraggableCard` ref is subordinate — but it becomes a reliability problem the moment spread zone multi-select is added. When a selected card's drag triggers, dnd-kit resolves which registration "wins" and the answer is not guaranteed to be the outer sortable registration.

**Why it happens:** `useSortable` internally calls `useDraggable` with the same `id`. A nested `useDraggable` call for the same `id` in a child component creates a second entry in the context's draggable registry under an identical key.

**Prevention:**
- When adding spread zone multi-select, do NOT add another `useDraggable` call. The outer `useSortable` wrapper is the canonical drag source. Strip `DraggableCard` out of `SortableSpreadCard` entirely and render card content directly so there is exactly one draggable registration per card.
- The flip handler currently lives in `DraggableCard`. Move it to `SortableSpreadCard` before adding selection logic so the component refactor happens as a coherent unit.
- Verify with React DevTools that no two dnd-kit hooks share the same `id` string when a spread card renders.

**Warning signs:** Console warning `"Encountered two children with the same key"` or `"Encountered duplicate id"` in the dnd-kit context; drag overlay visually snapping to wrong position on drag start.

**Phase to address:** Layout restructure phase (before SPREAD-01/02 implementation). This is latent today but becomes a hard blocker when multi-select selection ring must interact with drag start.

---

### Pitfall 2: Collision Detection Breaks When Spread Zone Cards Are Both Sortable Targets and Droppable "Pile" Targets

**What goes wrong:** The existing `customCollision` function in `BoardDragLayer.tsx` partitions droppable containers into three buckets: zone IDs (`hand`, `opponent-hand-*`), pile IDs (`pile-*`), and card IDs (everything else). A spread card registered as a sortable item has a card ID. An external card dragged from hand toward the spread zone can collide with a spread card ID via `closestCenter` and produce a card-to-card `over` result — but `BoardDragLayer.handleDragEnd` treats that card ID as a hand sortable target, not a pile drop. The move never fires.

This is not hypothetical — the existing `isHandMissed` / `isHandReorder` guard in `handleDragEnd` was added specifically because hand cards and the hand zone droppable compete. The same competition exists between spread zone cards and the spread zone droppable (`pile-{id}`), and is currently handled by the `isIntraSpreadReorder` guard. Adding multi-select introduces new drag origins (selected cards from another zone) that don't have `fromZone === "pile"`, breaking the guard condition.

**Why it happens:** The collision algorithm does not know that a card currently rendering inside a spread zone is semantically a "pile drop" target, not a "hand reorder" target. The routing logic in `handleDragEnd` is fragile: it uses `fromZone` to distinguish reorders from zone moves, but multi-select drag origins can come from `hand` targeting a `pile`, and the `over` target may resolve to a card ID inside that pile.

**Prevention:**
- Add `toZone: 'pile'` and `toId: pileId` to the `data` object of each `useSortable` card in `SpreadZone.tsx`. This ensures `overData?.toZone` is always `'pile'` for spread card collisions, eliminating the ambiguity.
- Update `customCollision` to explicitly prefer `pile-*` droppables when the pointer is over a spread zone's bounding rect, regardless of which card is hit by `closestCenter`. This mirrors the existing preference for `hand` zone over hand card IDs.
- Write a unit test before implementing multi-select that asserts: dragging a hand card onto a spread zone card fires `MOVE_CARD` with `toZone: 'pile'`.

**Warning signs:** Cards dragged from hand to a non-empty spread zone do nothing (no server action sent). Intra-spread reorder stops working after multi-select is added.

**Phase to address:** Collision detection audit phase — must precede SPREAD-01 (multi-select) and SPREAD-02 (drag reorder) implementation.

---

### Pitfall 3: `useDndMonitor` in `SpreadZone` and `onDragEnd` in `BoardDragLayer` Both Handle the Same Drag Event — Race Condition on Reorder

**What goes wrong:** `SpreadZone.useDndMonitor.onDragEnd` fires for intra-spread reorders; `BoardDragLayer.handleDragEnd` fires for all drags. Both fire for the same `dragEnd` event. The current `isIntraSpreadReorder` guard in `BoardDragLayer` prevents `MOVE_CARD` from racing `REORDER_PILE_SPREAD` — but this guard checks `fromZone === 'pile' && fromId === toId`. When multi-select is added, a selected card from the spread zone may have `fromZone: 'pile'` but the drag is carrying a set (selected IDs include cards from `hand`), so the guard may misfire and send both `PLAY_CARD_SET` (or `MOVE_CARD`) AND `REORDER_PILE_SPREAD` for the same gesture.

**Why it happens:** `useDndMonitor` subscribers are called in registration order with no built-in mechanism to signal "I handled this event, stop propagating." Both handlers receive the same event object. Guard conditions must be mutually exclusive or one handler must check a shared ref.

**Prevention:**
- Before implementing SPREAD-01, audit every `useDndMonitor` and `onDragEnd` handler and document which drag origins and destinations each one owns. Draw an explicit decision table: `(fromZone, toZone, isMultiSelect, isIntraReorder) → handler`.
- For multi-select: set a `wasMultiSelectDragRef` in `handleDragStart` when `selectedIds.size > 1`. Both `BoardDragLayer.handleDragEnd` and `SpreadZone.useDndMonitor.onDragEnd` can check this ref and bail out of their respective code paths when appropriate.
- The existing `dropSuccessRef` pattern (a shared `useRef` visible to all closures in the same component) is the correct pattern — extend it rather than adding new parallel state.

**Warning signs:** A single drag from a spread zone fires two server actions. `REORDER_PILE_SPREAD` fires on a cross-zone drop. State appears to bounce or flash after a drop.

**Phase to address:** SPREAD-01 (multi-select on spread zones) — add the decision table as a spec artifact before writing any code.

---

### Pitfall 4: Selection State Conflict When Both Hand and Spread Zone Have Independent `selectedIds`

**What goes wrong:** The current `selectedIds: Set<string>` lives in `BoardDragLayer` and serves hand multi-select. If spread zone multi-select is added by giving each `SpreadZone` its own selection state (the obvious first approach), two independent selection sets exist simultaneously. A user selects 2 cards in hand, then clicks a spread zone card — the hand selection should clear but doesn't because the spread zone's local `useState` has no visibility into the hand's selection.

Worse: if both selections are active and the user drags, `handleDragStart` in `BoardDragLayer` checks `selectedIds.has(activeId)` to decide whether to clear selection. If `activeId` is from the spread zone but `selectedIds` only tracks hand cards, the check passes incorrectly and hand selection is preserved through a spread drag.

**Why it happens:** The natural refactor is to add selection state to `SpreadZone`. But selection is a cross-zone concern: only one zone should have active selection at any time.

**Prevention:**
- Lift all selection state into `BoardDragLayer` as a single `selectedIds: Set<string>` (already the correct location). Add a `selectionZone: 'hand' | 'pile' | null` field alongside it to track which zone owns the current selection.
- When a card in any zone is clicked for selection, `onToggleSelect` clears `selectionZone` and `selectedIds` for the previous zone before adding to the new one.
- Pass `selectedIds` and `onToggleSelect` down to `SpreadZone` with the same interface already used by `HandZone` — no structural change to `BoardDragLayer`, only prop drilling.
- `handleDragStart` already clears selection when an unselected card is dragged (`D-04` guard). Extend this guard to check `selectionZone` so a spread drag always clears hand selection and vice versa.

**Warning signs:** Keyboard `Escape` clears hand selection but spread selection persists. Selected count badge shows wrong number. Dragging a spread card while hand cards are selected causes both to animate.

**Phase to address:** SPREAD-01 — selection state architecture must be decided before any visual selection ring is added to SpreadZone.

---

### Pitfall 5: `REORDER_PILE_SPREAD` Is Not Covered by Undo — Server Snapshot Timing

**What goes wrong:** The existing undo system takes a `GameState` snapshot before each mutating action and pushes it onto `undoSnapshots`. `REORDER_PILE_SPREAD` is a mutation that changes pile card order but currently does not take a snapshot before mutating. A user reorders cards in a spread zone, then hits undo — the undo reverts the last card *move*, not the reorder, because the reorder never pushed a snapshot.

If spread zone multi-select is added and `PLAY_CARD_SET` + `REORDER_PILE_SPREAD` fire in sequence (e.g., play a set, then immediately reorder), undo pops to pre-PLAY_CARD_SET state, but the reorder that happened in between is silently lost.

**Why it happens:** `REORDER_PILE_SPREAD` was added as an order-maintenance operation rather than a meaningful game action, so it was not wired into the undo stack. As the spread zone becomes more interactive (multi-select, reorder-by-drag), the line between "order maintenance" and "meaningful action" blurs.

**Prevention:**
- Decide the undo contract for spread zone reorders before v1.3 ships: either (a) reorders are always undo-able (take snapshot before `REORDER_PILE_SPREAD`), or (b) reorders are explicitly excluded from undo (document this and ensure undo skips to the previous non-reorder snapshot).
- Option (a) is simpler. Option (b) requires the server to tag snapshots by action type.
- Whichever is chosen, add a unit test: reorder spread zone, undo, assert order reverts (or stays, if option b).

**Warning signs:** Undo after a spread reorder reverts a different action than the user expects. Multiple undos are required to reach pre-interaction state.

**Phase to address:** SPREAD-02 (drag reorder on spread zones) — before implementation, decide the undo contract and add the snapshot call if needed.

---

## Moderate Pitfalls

---

### Pitfall 6: `overflow-hidden` on Board Layout Regions Clips the Drag Overlay

**What goes wrong:** The current `BoardView` wraps the entire board in `h-screen overflow-hidden flex flex-col`. When a card is dragged, the `DragOverlay` is rendered into `document.body` via `createPortal` — this already escapes the `overflow-hidden` boundary. However, during layout restructuring, intermediate wrappers may be added with `overflow: hidden` or `overflow: clip` that create new stacking contexts. The DragOverlay is `position: fixed`, but `position: fixed` is relative to the nearest ancestor with a `transform`, `perspective`, `filter`, or `will-change` property — not necessarily `document.body`. A CSS `transform` on any ancestor (common in responsive animations) breaks the DragOverlay's viewport-relative positioning.

**Prevention:**
- Do not apply `transform`, `filter`, `perspective`, or `will-change` to any element that is an ancestor of both the `DndContext` and the `DragOverlay` portal target.
- The DragOverlay is already portaled to `document.body` (line 257 of `BoardDragLayer.tsx`). Ensure the portal target (`document.body`) has no `transform` applied by reset CSS or theme overrides.
- When adding the controls slide-out panel (LAYOUT-03), use `position: fixed` + `z-index` for the panel itself rather than CSS transitions on parent layout containers, to avoid creating stacking contexts that interfere.
- After each layout refactor step, manually verify drag works: drag a card from the bottom hand zone to the top opponent zone. If the overlay trails behind the pointer, a stacking context has broken the fixed positioning.

**Warning signs:** Drag overlay appears offset from the pointer. Overlay visually clips at a container boundary during drag. Overlay renders at a wrong `z-index` relative to a newly added panel.

**Phase to address:** LAYOUT-01/02 (board layout restructure) — verify drag overlay after each layout change, not just at the end.

---

### Pitfall 7: `100vh` / `h-screen` Cuts Off Content on Mobile Safari

**What goes wrong:** The board currently uses `h-screen` (which compiles to `height: 100vh`). On iOS Safari and Chrome for Android, `100vh` is calculated based on the maximum viewport height (browser chrome fully hidden). When the address bar is visible, `100vh` overflows the actual visible area — the bottom edge of the hand zone scrolls partially behind the browser's navigation bar. On smaller phones (375px wide), this is significant enough to make the hand inaccessible without scrolling.

**Why it happens:** Mobile browsers reserve space for navigation UI that is not reflected in `100vh`. The `dvh` (dynamic viewport height) unit was introduced to fix this, but support varies. Tailwind 3.x does not include `dvh` utility classes by default; Tailwind 4.x may.

**Prevention:**
- Replace `h-screen` on the root board container with `min-h-[100dvh]` or a CSS custom property fallback: `height: calc(var(--vh, 1vh) * 100)`. Set `--vh` via a one-time `window.innerHeight` measurement in a `useEffect` on mount.
- Test at 375px × 667px (iPhone SE viewport) with browser chrome visible, not just in Playwright's default headless viewport.
- The `overflow-hidden` on the root container must remain to prevent scroll — do not remove it as a "fix" for the clipping issue.
- Note: `dvh` causes a brief layout shift when the browser bar retracts. For a game board this is acceptable; for animations it is not. Use `svh` (small viewport height — always includes browser chrome) if layout stability is more important than exact fit.

**Warning signs:** Hand zone cards are partially obscured on a real phone. Board has extra dead space at the bottom in desktop browsers. Scrollbar appears on the body element.

**Phase to address:** LAYOUT-04 (responsive layout) — add a real-device test checkpoint, not just a Playwright screenshot at desktop viewport.

---

### Pitfall 8: Spread Zone `overflow-x: auto` Clips Selected Card Lift Animation

**What goes wrong:** The spread zone container has `overflow-x-auto` to handle many cards horizontally. When multi-select is added, selected cards lift vertically with `transform: translateY(-6px)` (mirroring hand selection behavior). The `overflow-x: auto` on the parent creates an overflow context for the x-axis. When the y-axis overflow is not explicitly set to `visible`, browsers implicitly compute it as `auto` — clipping the vertical lift animation at the container boundary.

**Why it happens:** CSS spec: if `overflow-x` is `auto|scroll|hidden`, `overflow-y` cannot remain `visible`; it is computed as `auto`. This means the `-6px` lift gets clipped at the container top edge.

**Prevention:**
- When adding the selection lift to SpreadZone, increase the spread zone container's top padding or height slightly to accommodate the lift range (e.g., `pt-2` to give 8px headroom above cards).
- Do not try to set `overflow-y: visible` alongside `overflow-x: auto` — browsers ignore `visible` in that combination.
- Alternatively, skip the translateY lift for spread zone selection and use a different visual (outline ring only, or bottom border highlight) to avoid the overflow conflict entirely.

**Warning signs:** Selected spread zone card appears partially cut off at the top. Card lifts on hover but snaps back when the mouse stops.

**Phase to address:** SPREAD-01 (spread zone multi-select) — establish the selection visual before wiring up selection state.

---

### Pitfall 9: Controls Panel (`shadcn/Sheet` or Custom Slide-Out) Creates a New Stacking Context That Competes With the DragOverlay

**What goes wrong:** The v1.3 controls panel (LAYOUT-03) collapses the ControlsBar into a slide-out drawer or sheet. shadcn's `Sheet` component renders via a Radix portal at `z-index: 50` with a backdrop at `z-index: 49`. dnd-kit's DragOverlay, portaled to `document.body`, has no explicit `z-index` — it renders at the browser's stacking order for position-fixed elements, which may be below `z-index: 50`. Result: a card being dragged across the screen while the controls panel is open (or animating open) can visually render behind the panel.

**Why it happens:** No coordinated `z-index` budget between shadcn's overlay components and dnd-kit's DragOverlay.

**Prevention:**
- Add `style={{ zIndex: 100 }}` to the `DragOverlay` component in `BoardDragLayer.tsx`. This guarantees the drag overlay always appears above shadcn modals and sheets.
- Define a `z-index` budget in `globals.css` using CSS custom properties: `--z-overlay: 50` for sheets/dialogs, `--z-drag: 100` for the drag overlay.
- If using shadcn `Sheet`, ensure the sheet is not open during an active drag (disable the trigger button while `activeCard !== null`).
- Test by: opening the controls panel, starting a drag, and verifying the drag overlay renders above the panel.

**Warning signs:** Dragged card disappears behind a panel that opens during drag. Panel animation briefly shows over the dragged card.

**Phase to address:** LAYOUT-03 (controls panel) — establish `z-index` budget at the start of this phase.

---

### Pitfall 10: Adding `selectedIds` to `SpreadZone` Breaks Existing Playwright e2e Tests That Simulate Clicks on Spread Zone Cards

**What goes wrong:** The Playwright `mouse.move/down/move/up (steps:15)` pattern is used to simulate drags in e2e tests. Spread zone cards are also clickable (for flip). When selection is added, a single click on a spread zone card selects it instead of flipping it. Existing e2e tests that click a spread zone card to flip it will now select it instead — breaking those tests without changing any production logic.

**Why it happens:** The flip-click vs. select-click behavior on spread zone cards needs to be explicitly disambiguated. Hand cards currently use a `onPointerDown stopPropagation` + `onClick` combination where click = select and a separate flip mechanism exists. Spread zone cards currently use `DraggableCard`'s `onFlip` which fires on click after `didDragRef.current` check.

**Prevention:**
- Before implementing SPREAD-01, define the interaction model: is a single click on a spread zone card a flip, a selection, or does it depend on whether a modifier key is held?
- The consistent model is: single click = select (matching hand), context-menu or button = flip. This is a UX change from v1.2 where single click = flip.
- Update existing e2e tests for spread zone flip before writing new selection tests. This makes the regression explicit.
- Add a `data-testid` to the flip button if flip moves to a button affordance, so tests can target it unambiguously.

**Warning signs:** e2e test clicking spread zone card to flip produces a selected (not flipped) card. Test starts passing for the wrong reason.

**Phase to address:** SPREAD-01 — write the updated e2e test expectation in the phase plan's success criteria before implementation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `DraggableCard` nested inside `SortableSpreadCard` | No refactor needed now | Duplicate useDraggable ID registration; breaks when multi-select is added | Never in v1.3 — must fix before SPREAD-01 |
| Add `selectedIds` state locally to `SpreadZone` | Simple, co-located | Cross-zone selection conflict; hand selection doesn't clear when spread is clicked | Never — lift to `BoardDragLayer` |
| Skip undo support for `REORDER_PILE_SPREAD` | No server change needed | User confusion: undo after reorder reverts wrong action | Acceptable only if explicitly documented in LAYOUT/SPREAD phase notes |
| Use `100vh` / `h-screen` for responsive layout | No change from v1.2 | Bottom content clipped on iOS Safari; hand inaccessible | Never for LAYOUT-04 |
| Use fixed `z-index` numbers in component style props | Quick fix | Fragile; z-index values diverge across components | Acceptable temporarily if documented in the z-index budget comment |
| Hardcoded `pile.id === 'play'` to find communal zone | Works today | Breaks if pile ID changes; noted as fragile in v1.2 milestones | Acceptable for v1.3; fix when pile IDs become configurable |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| dnd-kit `useSortable` + `useDraggable` | Nest `useDraggable` child inside `useSortable` wrapper with same `id` | Render card content directly inside `useSortable`; no nested `useDraggable` call |
| dnd-kit `useDndMonitor` + `DndContext.onDragEnd` | Assume only one handler fires per event | Both fire; use shared refs (`dropSuccessRef`, `dragDataRef`) to coordinate; document ownership in a decision table |
| dnd-kit `DragOverlay` + shadcn `Sheet`/`Dialog` | Leave `DragOverlay` at default z-index | Add explicit `zIndex: 100` to `DragOverlay`; establish budget in globals.css |
| CSS `overflow-x: auto` + vertical selection lift | Use `translateY` on selected cards in an `overflow-x: auto` container | Add top padding to the container to accommodate the lift height |
| `REORDER_PILE_SPREAD` + undo stack | Skip snapshot for "cosmetic" reorder | Decide undo contract explicitly; add snapshot if reorders are user-visible actions |
| PartyKit broadcast + client-optimistic reorder | Client reorders `faceUpCards` array locally, then server broadcast arrives with different order | Do not apply client-side optimistic reorder; trust server broadcast; add `bufferRef` during drag (already in place via `isDraggingRef`) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering all `SpreadZone` instances on every selection state change | Selection click causes 100ms+ freeze with 4 players each with full spread zones | Memoize `SpreadZone` with `React.memo`; pass only the relevant `selectedIds` subset per zone | With 4 players × 13 cards per spread zone |
| `arrayMove` called in `useDndMonitor.onDragEnd` on every render | Stale closure captures old `faceUpCards` value; reorder sends wrong order | Ensure `faceUpCards` is derived from `pile.cards` inside the monitor callback, not captured at render time | Every drag end where card order matters |
| `customCollision` partitioning all droppable containers on every pointer move | Lag during drag with many spread zone cards | The custom collision is O(n) over droppable containers; n = cards in spread zones + pile zones. With 52 cards in spread zones this is ~60 containers — acceptable. Only becomes a problem if spread zones can hold the full deck. | Not a current concern at 2–4 players with typical hand sizes |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Selection ring visible during drag (selected cards lift and show ring while being dragged) | Visual noise; feels like bug | Hide selection ring (`opacity: 0` or `ring-0`) while `draggingCardId` matches a selected card |
| Two spread zones adjacent — user selects card in one zone, tries to select card in other zone | Selection clears unexpectedly because zones are different piles | Make the clear-on-zone-change behavior explicit via a visible UI transition (briefly flash the cleared selection) |
| Controls panel opens on the same tap/click that triggers a card action | Mobile: user taps card, panel opens | Ensure controls panel trigger is spatially separated from card interaction areas; `pointer-events: none` during active drag |
| Card reorder drag in spread zone looks identical to drag-out to another zone | Users don't know if they're reordering or moving | Use a visual cue during drag: when pointer is within spread zone bounds, show a reorder cursor or drop indicator between cards |
| Responsive layout collapses spread zones to a very narrow strip on 375px | Spread zone cards overlap so much they're unreadable | Set a minimum card visibility width; allow horizontal scroll within spread zone rather than compressing card widths |

---

## "Looks Done But Isn't" Checklist

- [ ] **Spread zone multi-select:** Often missing — verify that selecting a card in spread zone clears any active hand selection (and vice versa).
- [ ] **Drag overlay z-index:** Often missing — verify drag overlay renders above a newly added controls panel/sheet. Test with the panel open during a drag.
- [ ] **Mobile layout:** Often missing — verify at 375px width with browser chrome visible (not headless). Bottom hand zone must be fully accessible.
- [ ] **Undo after spread reorder:** Often missing — verify that undo behavior after a spread reorder is predictable and documented. Either always reverts the reorder, or always skips it.
- [ ] **Spread zone `overflow-x: auto` with selection lift:** Often missing — verify that the vertical translateY lift is not clipped by the horizontal scroll container.
- [ ] **`DraggableCard` removed from `SortableSpreadCard`:** Often missing — verify there is no `useDraggable` call for a spread card ID that is also registered via `useSortable`.
- [ ] **e2e tests updated for spread zone click interaction change:** Often missing — if single-click behavior on spread zone cards changes from flip to select, the existing e2e test for flip must be updated before new selection tests are added.
- [ ] **Selection state clears on drag start from spread zone:** Often missing — verify dragging an unselected spread zone card clears hand selection (existing `D-04` guard in `handleDragStart`).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate useDraggable ID collision | MEDIUM | Remove nested `DraggableCard` from `SortableSpreadCard`, move flip handler up, retest all spread zone interactions |
| Collision detection routes spread card drag to wrong handler | MEDIUM | Add `toZone/toId` to useSortable card data; update `handleDragEnd` guard conditions; add unit test for the broken case |
| Selection state conflict across zones | LOW | Move `selectedIds` and `selectionZone` to `BoardDragLayer`; thread props down to `SpreadZone` — matches existing `HandZone` prop interface |
| DragOverlay z-index under controls panel | LOW | Add `style={{ zIndex: 100 }}` to `DragOverlay` |
| Mobile viewport height cuts off hand zone | LOW | Replace `h-screen` with `dvh` fallback; add `--vh` JS measurement |
| Undo stack inconsistency after reorder | HIGH | Requires server-side change (snapshot before `REORDER_PILE_SPREAD`); add unit test; flush live game rooms |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate useDraggable ID (Pitfall 1) | Layout restructure phase (before SPREAD-01) | No dnd-kit duplicate ID warnings in console; single drag registration per card |
| Collision detection routing breaks (Pitfall 2) | Collision audit before SPREAD-01 | Unit test: hand card dragged onto non-empty spread zone fires MOVE_CARD with toZone:pile |
| useDndMonitor + handleDragEnd race (Pitfall 3) | SPREAD-01 design — decision table | No double-dispatch in Playwright e2e; verify with server action log |
| Cross-zone selection conflict (Pitfall 4) | SPREAD-01 — lift selection state before selection ring | Playwright: select hand card, click spread zone card, verify hand selection clears |
| REORDER_PILE_SPREAD undo gap (Pitfall 5) | SPREAD-02 — decide undo contract first | Unit test: reorder spread, undo, assert order |
| DragOverlay clipped by overflow/stacking context (Pitfall 6) | LAYOUT-01/02 — verify drag after each layout change | Manual drag from hand to opponent zone after each layout phase |
| 100vh cuts off mobile content (Pitfall 7) | LAYOUT-04 — first task | Manual test at 375px with browser chrome visible |
| Spread zone overflow clips selection lift (Pitfall 8) | SPREAD-01 — selection visual before state wiring | Visual check: select card in a spread zone with 10+ cards; lift is not clipped |
| Controls panel z-index beats DragOverlay (Pitfall 9) | LAYOUT-03 — z-index budget as first task | Open controls panel, drag a card, overlay must appear above panel |
| Existing e2e tests break on click behavior change (Pitfall 10) | SPREAD-01 — update e2e spec before new tests | `npm run test:e2e` passes with zero new failures before SPREAD-01 feature lands |

---

## Sources

- Codebase: `src/components/SpreadZone.tsx`, `src/components/BoardDragLayer.tsx`, `src/components/HandZone.tsx`, `src/components/DraggableCard.tsx`, `src/components/BoardView.tsx` (v1.2 state, read 2026-05-01)
- `.planning/RETROSPECTIVE.md` — v1.2 retrospective; Phase 14 gap-closure pattern; 6 unplanned plans from implied-but-unstated behaviors
- `.planning/PROJECT.md` — v1.3 requirements and key decisions log
- dnd-kit docs (via WebSearch): duplicate ID collision for `useSortable`+`useDraggable` is official documented behavior; `useSortable` is an abstraction over `useDraggable` and `useDroppable`
- dnd-kit collision detection docs: custom collision composition pattern; `pointerWithin` for visual-boundary drops
- CSS spec behavior: `overflow-x: auto` + `overflow-y: visible` computed as `overflow-y: auto` (clips vertical children)
- CSS stacking context: `position: fixed` is relative to nearest ancestor with `transform`/`filter`/`will-change` — breaks `DragOverlay` if transforms are on layout ancestors
- Mobile viewport units: `100vh` overflows visible area on iOS Safari; `dvh` is the correct replacement with browser support caveats

---
*Pitfalls research for: Virtual Deck v1.3 — Layout/UX Polish and Spread Zone Interactivity*
*Researched: 2026-05-01*
