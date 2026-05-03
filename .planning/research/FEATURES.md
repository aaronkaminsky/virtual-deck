# Feature Landscape — Virtual Deck v1.3

**Domain:** Real-time multiplayer card table — layout/UX polish and spread zone interactivity
**Researched:** 2026-05-01
**Context:** SUBSEQUENT MILESTONE. v1.2 shipped. This file covers v1.3 feature areas only.

---

## Overview

v1.3 has two distinct categories:

| Category | Features | Nature |
|----------|----------|--------|
| Layout & UX | Communal zone repositioned, board proportions, controls collapsed, responsive scaling | Visual / structural — affects every player on every session |
| Spread Zone Interactivity | Multi-card select in spread zones, drag reorder in spread zones | Interaction parity with HandZone — user-visible new capability |

---

## Category A: Board Layout

### A1 — Communal Zone to Physical Center (LAYOUT-01)

**What it is:** Move the communal spread zone out of the bottom bar and into the vertical center of the board, so it reads spatially as "the middle of the table" between opponents above and the player's hand below.

**How other card games handle it:**

Card game UIs universally follow a vertical axis: opponents at top, shared space at center, player's hand at bottom. This mirrors physical seating. Hearthstone, MTG Arena, and most tabletop simulators all use this axis even with different visual treatments. The center zone carries the most visual weight of any non-card element — it should have the largest allocated row height after the hands.

**Current state in this codebase:** The communal zone (`pile.id === 'play'`) renders in the bottom bar alongside the player's personal spread zone. Players have reported (implicitly, via PROJECT.md goals) that it does not read as the table center. The piles row (`flex-1`) occupies the center but only contains draw/discard stacks.

**Implementation pattern:** Replace the current two-section flex column (`flex-1` piles row + bottom bar) with a three-row layout:
- Row 1 (fixed height): Opponent hands + their spread zones
- Row 2 (`flex-1` or `2fr`): Communal spread zone + draw/discard piles, centered — this is the "table"
- Row 3 (fixed height): Player hand

The communal zone should receive meaningfully more vertical space than the bottom bar currently gives it. A `min-h-[160px]` or equivalent is appropriate — enough to display 2 rows of overlapping cards without scrolling.

**Visual cues that make it read as "center of table":**
1. Largest allocated row height in the layout
2. Different background color or border treatment than the header/hand bars
3. Label reads "Table" or "Center" (not "Play Area"), centered within the zone
4. Draw and discard piles remain in this same center row — they belong to the shared space

**Complexity:** MEDIUM. CSS layout restructure in `BoardView`. No data model changes. Must not break dnd-kit drop targets (droppable `id`s are positional-independent, so layout changes are safe).

**dnd-kit dependency:** Droppable regions use logical IDs (`pile-play`, `pile-draw`) — they are not affected by DOM position changes. Layout refactor is safe.

---

### A2 — Board Vertical Proportions (LAYOUT-02)

**What it is:** Adjust the relative sizes of the four visual rows so no single region dominates incorrectly and every row has adequate breathing room.

**Target proportions (based on card game conventions):**

| Row | Content | Suggested Sizing | Rationale |
|-----|---------|-----------------|-----------|
| Connection banner | Status only | Auto / 24–32px | Disappears when connected |
| Header bar | Opponent hands + controls | Auto / min content | Grows with number of opponents (up to 3) |
| Center row | Table piles + communal zone | `flex-1` (takes remaining space) | The main shared surface |
| Bottom row | Player spread zone + hand | Auto / ~140px hand + spread below | Fixed height preserves hand readability |

The critical behavior: center row must grow to fill the screen regardless of viewport height. Currently `flex-1` on the piles row does this for the draw/discard piles, but the communal zone is outside that row.

**What not to do:** Fixed pixel heights on the center row. On 1080p monitors it looks sparse; on phones it clips content. Use `flex-1` / `min-height` on the center row and let cards scroll horizontally within fixed-height spread containers.

**Complexity:** LOW (a consequence of A1 layout restructure, not a separate change).

---

### A3 — Game Controls Collapsed (LAYOUT-03)

**What it is:** Move game controls (Deal, Undo, Reset, and any future controls) out of the always-visible header bar and into a collapsed panel, freeing header real estate for opponent hands on small screens.

**Pattern comparison:**

| Pattern | Pros | Cons | Verdict for this app |
|---------|------|------|---------------------|
| Popover (current partial) | Already implemented via shadcn Popover for Deal | Anchored to trigger; only one action at a time | Keep for single-action flows (Deal); not for the full controls panel |
| Sheet (side drawer) | Standard mobile/tablet pattern; hides gracefully; shadcn Sheet is available | Side slide-in doesn't feel game-native; steals screen edge | Avoid for in-game controls |
| Dropdown menu | Compact, dismisses easily, stays near trigger, works in header | Limited vertical space for forms (deal count input) | Best for action list + modal sub-forms |
| FAB (floating action button) | Unobtrusive, always accessible, works on mobile | Covers board content; not a web card game convention | Anti-feature (see below) |

**Recommendation:** Dropdown menu anchored to a "Controls" button in the header. The existing `ControlsBar` already returns different JSX for `setup` and `playing` phases — this pattern stays, but the entire set of controls collapses behind one trigger. The Deal form (input + button) appears as a popover inside the dropdown or as a separate popover triggered from within the dropdown.

**shadcn components to use:** shadcn `DropdownMenu` (already available as a shadcn primitive) for the collapsible list; existing `Popover` for the Deal sub-form. Do not introduce `Sheet` — it is not currently installed and adds unnecessary complexity.

**Behavior contract:**
- Controls button always visible in header (does not hide on small screens)
- Dropdown closes when an action is dispatched (except Deal, which waits for user confirmation)
- Keyboard accessible: Escape closes; Tab navigates items
- Phase-aware rendering stays: setup phase shows Deal; playing phase shows Undo + Reset

**Complexity:** LOW-MEDIUM. `ControlsBar` already exists with the phase-conditional logic. The change is wrapping the existing button groups in a `DropdownMenu`. The Deal popover sub-form needs to compose inside a `DropdownMenuContent`.

**Anti-features:**
- Do NOT use a FAB. It floats over the card table and obscures cards during play.
- Do NOT use a Sheet/Drawer. The side-slide animation is unexpected for in-game controls and uses significant screen real estate.
- Do NOT require two clicks to reach Undo (a frequent action during play). Either keep Undo directly visible or in a one-click dropdown.

---

### A4 — Responsive Layout for Phone Screens (LAYOUT-04)

**What it is:** The board must be usable on phone-sized screens (320–430px wide). Mobile-first means no horizontal overflow, no clipped controls, and all interactive elements remain reachable. **Touch drag is explicitly out of scope per PROJECT.md** — this is mouse-only responsive design.

**How web card games handle small screens:**

Card game UIs fall into three camps:
1. **Scale-down / viewport zoom**: Set a fixed game canvas size and scale with CSS `transform: scale()` or `zoom`. Works for pixel-perfect games. Poor fit here because HTML drag-and-drop does not interact correctly with CSS transforms.
2. **Reflowing layout**: Use CSS Flexbox/Grid with media queries to reflow — e.g., opponent hands stack vertically instead of horizontally, controls collapse. Best fit for this app.
3. **Scroll-to-pan**: Accept that the board is wider than the phone and allow horizontal scroll within zones. Acceptable fallback for the spread zones, but the core board chrome (header, hand, controls) must not scroll off screen.

**Recommended approach for this codebase:** Reflowing layout with `overflow-x: auto` within individual zones (spread zones, opponent hands row) and `overflow: hidden` on the board shell. The board shell stays `h-screen w-screen` and never scrolls. Individual zones scroll internally when their content overflows.

**Specific responsive behaviors:**

| Element | Desktop | Phone |
|---------|---------|-------|
| Opponent hands row | Horizontal flex, multiple opponents side by side | Horizontal `overflow-x: auto` scroll — same flex, just scrollable |
| Header bar | Controls + room link + opponent presence in one row | Controls button + room link only; presence may need to compress |
| Center table row | Piles + communal zone side by side | Stack vertically (piles above, communal zone below) OR communal zone takes full width |
| Spread zones | Fixed-height with horizontal scroll | Same — `overflow-x: auto` already applied |
| Hand zone | Fixed-height horizontal scroll | Same — unchanged |

**dvh vs vh:** Use `100dvh` instead of `100vh` on the board shell. On mobile Chrome and Safari, `100vh` includes the address bar; `dvh` adjusts dynamically as the browser chrome shows/hides. This prevents the board from being taller than the visible area.

**Tailwind breakpoints:** The board does not need elaborate breakpoints. One breakpoint (`sm:`) to adjust the center row stacking direction (`flex-col` on mobile, `flex-row` on desktop) is sufficient.

**Complexity:** MEDIUM. Requires touching `BoardView` layout and potentially `ControlsBar`. Using `dvh` requires a Tailwind config update (`h-screen` uses `100vh` — needs a custom class or inline style). Main risk is ensuring existing dnd-kit drag interactions remain functional after layout changes (pointer event coordinates are viewport-relative and should be unaffected by Flexbox reflows).

**Anti-features:**
- Do NOT try to optimize for touch drag. The project explicitly defers touch drag support.
- Do NOT add `meta viewport user-scalable=no` — this blocks accessibility zoom.
- Do NOT use CSS `transform: scale()` on the board — it breaks pointer event coordinates for dnd-kit.

---

## Category B: Spread Zone Interactivity

### B1 — Spread Zone Multi-Card Select (SPREAD-01)

**What it is:** Players can select multiple cards within a spread zone (personal or communal) by clicking them — same click-to-toggle UX already implemented in `HandZone`. Selected cards are then dragged or otherwise acted upon as a group.

**Current state:** `SpreadZone` has no selection state. `HandZone` implements `selectedIds: Set<string>` via `onToggleSelect` prop, with visual feedback (`translateY(-6px)` lift, ring styling) on selected cards. Multi-card play dispatches `PLAY_CARD_SET`.

**Why this is a table stake (not a differentiator):** v1.2 shipped multi-select for `HandZone`. Users will immediately try to do the same in spread zones — the inconsistency will feel broken. Parity with HandZone is the expectation.

**Implementation pattern:**

The `HandZone` approach (props-drilled `selectedIds` + `onToggleSelect` from `BoardDragLayer`) can be replicated for spread zones. The key question is where selection state lives:

Option 1: Selection state per-zone in `BoardDragLayer` — one `selectedIds: Set<string>` and `onToggleSelect` per spread zone. This is the same pattern as HandZone today. Drawback: many props, and multi-zone selection (selecting across zones) becomes impossible.

Option 2: Single unified selection state in `BoardDragLayer` with the zone source tracked — `selectedIds: Map<cardId, zoneId>` or `selectedIds: Set<string>` with a separate `selectionZone: string | null`. The second form is simpler: when a selection is active, all selected cards must be in the same zone (cross-zone selection is not a goal).

**Recommendation:** Option 2 — single `selectedIds: Set<string>` + `selectionSourceZone: string | null` in `BoardDragLayer`. When `onToggleSelect(cardId, zoneId)` is called: if `selectionSourceZone !== zoneId`, clear the selection first (prevents cross-zone selection confusion), then select the new card. This is the expected behavior in physical card games — you can only "pick up" cards from one zone at a time.

**Visual states to implement (matching HandZone):**
- Selected: `translateY(-6px)` lift + ring highlight
- Multiple selected: badge showing count (already shown in HandZone when `selectedIds.size >= 2`)
- Unselected while others selected in same zone: subtle dim or opacity

**What triggers a multi-card move from spread zone:**
- Drag any selected card — move all selected cards in that zone (same as HandZone)
- This uses the existing drag-moves-all pattern via `PLAY_CARD_SET` or a new action `MOVE_CARD_SET` if destination is another pile (not a play zone)

**Undo implication:** If all selected cards in a spread zone are moved atomically via a single action, one `UNDO_MOVE` should restore all of them. This requires the server's undo snapshot to capture the entire batch move, which is already how `PLAY_CARD_SET` works.

**Edge case — cross-zone drag:** If a player selects 3 cards in their personal spread zone and drags one to the communal zone, the expected behavior is all 3 move to the communal zone. The `onDragEnd` handler in `BoardDragLayer` must check if the active card is selected and, if so, dispatch all selected cards. This is the same logic already in HandZone.

**Complexity:** MEDIUM. Requires lifting selection state from HandZone to BoardDragLayer (it is currently prop-drilled per-zone), extending the selection state shape to include zone source, and updating SpreadZone to accept and render selection props. No server changes beyond possibly a new `MOVE_CARD_SET` action if moves between spread zones need to be atomic.

---

### B2 — Spread Zone Drag Reorder (SPREAD-02)

**What it is:** Players can drag cards within a spread zone to reorder them, using the same `useSortable` + `SortableContext` + `REORDER_PILE_SPREAD` pattern already implemented in `SpreadZone`.

**Current state:** Reordering is already implemented in `SpreadZone` via the `useDndMonitor` / `REORDER_PILE_SPREAD` pattern. What is likely missing is that this only works for single-card reorder. With multi-select (B1) added, the reorder behavior must be clarified when multiple cards are selected.

**Expected behavior for multi-select + reorder:**
- If only one card is selected (or nothing is selected), drag = single-card reorder. This already works.
- If multiple cards are selected and the drag starts on one of them, there are two possible interpretations:
  1. Move all selected cards to the new position as a group (preserving their relative order within the selection)
  2. Reorder only the dragged card, ignoring selection

Interpretation 1 is more consistent with HandZone multi-drag behavior. Interpretation 2 is much simpler to implement. The right answer depends on how often players actually multi-select within a spread zone to reorganize.

**Recommendation:** For v1.3, implement interpretation 2 (single-card reorder only, ignoring multi-select during intra-zone reorder). Multi-card reorder within a zone is a rare operation and adds significant complexity to the `arrayMove` logic. Document this as a known limitation.

**dnd-kit reorder edge cases (confirmed from codebase inspection):**

The current implementation in `SpreadZone` has a subtle issue: `useDndMonitor` fires for every zone on the board, not just the one rendering it. The `fromThisPile && toThisPile` guard prevents cross-zone interference, but if both conditions are simultaneously true for two zones (impossible with unique pile IDs but worth noting), both handlers would fire. With multi-select added, the order of operations in `onDragEnd` becomes important: multi-card move handlers in `BoardDragLayer` must fire before (or instead of) the single-card reorder in `SpreadZone`.

**Recommended approach:** Keep `REORDER_PILE_SPREAD` for intra-zone single-card reorder. For multi-card moves out of a zone, use the `BoardDragLayer`-level handler (same as HandZone). Ensure `BoardDragLayer` checks `selectedIds.size > 1` before dispatching `MOVE_CARD_SET`; if size is 1 or 0, fall through to normal single-card move/reorder logic in `SpreadZone`.

**Undo implication:** `REORDER_PILE_SPREAD` takes a full `orderedCardIds` array, which is already undo-snapshottable server-side. No undo changes needed for reorder.

**Complexity:** LOW (single-card reorder is already implemented). The work is ensuring it coexists correctly with multi-select without handler conflicts.

---

## Feature Dependencies (v1.3)

```
LAYOUT-01 (communal zone repositioned)
    └──layout restructure──> LAYOUT-02 (proportions) [same change]
    
LAYOUT-03 (controls collapsed)
    └──standalone (wraps existing ControlsBar)

LAYOUT-04 (responsive scaling)
    └──depends on──> LAYOUT-01 (must know final layout structure before adding breakpoints)
    └──touches──> LAYOUT-03 (header must fit in smaller width after controls collapse)

SPREAD-01 (spread multi-select)
    └──requires lift of──> selectedIds state from HandZone to BoardDragLayer
    └──is prerequisite for──> SPREAD-02 edge case handling

SPREAD-02 (spread drag reorder)
    └──already partially implemented (single-card reorder exists)
    └──must not conflict with──> SPREAD-01 drag handlers
```

**Dependency notes:**

- LAYOUT-01 and LAYOUT-02 are the same code change. Treat as one phase.
- LAYOUT-04 should come after LAYOUT-01 so the breakpoint targets are the final layout structure, not the old one.
- SPREAD-01 requires modifying `BoardDragLayer` to hold unified selection state — do this before writing SpreadZone selection rendering, or the state will need to move again.
- SPREAD-02 single-card reorder already works; it only needs to survive SPREAD-01's state changes without regression.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| LAYOUT-01: Communal zone center | HIGH — removes spatial confusion about table structure | MEDIUM — CSS restructure only | P1 |
| LAYOUT-02: Vertical proportions | MEDIUM — polish, not blocking | LOW — same change as LAYOUT-01 | P1 (bundled) |
| LAYOUT-03: Controls collapsed | HIGH on phones, MEDIUM on desktop — frees space for opponents | LOW-MEDIUM — wrap existing ControlsBar | P1 |
| LAYOUT-04: Responsive scaling | HIGH if any player is on phone | MEDIUM — needs dvh, one media query, test on small viewport | P2 |
| SPREAD-01: Spread multi-select | HIGH — parity with hand; users expect it after v1.2 | MEDIUM — state lift + SpreadZone rendering | P1 |
| SPREAD-02: Spread drag reorder | MEDIUM — reorder is already partially there | LOW — coexistence check with SPREAD-01 | P2 |

---

## Anti-Features

| Anti-Feature | Why Avoid | Better Approach |
|-------------|-----------|-----------------|
| FAB for game controls | Floats over cards during play; web card games don't use this pattern | Dropdown menu anchored to header button |
| Sheet/drawer for controls | Side-slide animation unexpected in-game; large screen footprint | Dropdown menu |
| Cross-zone multi-select (selecting cards from HandZone + SpreadZone simultaneously) | Physical card games don't work this way; adds complex state; unclear UX | Clear selection when user clicks a card in a different zone |
| CSS `transform: scale()` for phone scaling | Breaks dnd-kit pointer event coordinates | CSS Flexbox reflow + dvh |
| Multi-card intra-zone reorder (move a selection within one spread zone) | High implementation cost, low real-world frequency | Single-card reorder (already works); defer multi-card reorder |
| `100vh` on board shell | Clips content on mobile Safari/Chrome due to browser chrome | `100dvh` |
| Touch drag support in v1.3 | Explicitly deferred in PROJECT.md | Out of scope; mouse-only |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Board layout pattern (vertical axis, communal center) | HIGH | Universal in digital card game genre; consistent across Hearthstone, MTG Arena, tabletop simulators |
| Controls: dropdown over FAB/sheet | HIGH | FAB covers content (confirmed anti-pattern for card games); Sheet is web convention not game convention; Dropdown is what ControlsBar already starts to do with Popover |
| dvh for mobile viewport | HIGH | CSS specification; browser support universal as of 2023; dnd-kit coordinate safety confirmed by pointer-event architecture |
| Responsive reflow approach (not CSS scale) | HIGH | dnd-kit uses pointer events (viewport-relative), incompatible with CSS transform scale |
| SpreadZone multi-select state lift | MEDIUM | HandZone pattern is proven in codebase; adapting to multi-zone selection adds complexity; recommendation is opinionated but unverified against existing component tree |
| REORDER_PILE_SPREAD + multi-select coexistence | MEDIUM | onDragEnd handler interaction is subtle; needs testing; race condition possible between BoardDragLayer handler and SpreadZone useDndMonitor handler |
| shadcn DropdownMenu availability | MEDIUM — LOW | shadcn Popover and AlertDialog are installed; DropdownMenu may need to be added via `npx shadcn add dropdown-menu`. Needs verification against local installation |

---

## Open Questions for Implementation

1. Is `shadcn DropdownMenu` already installed in this project? If not, `npx shadcn add dropdown-menu` before LAYOUT-03.
2. Does `MOVE_CARD_SET` need to be a new server action for multi-card moves between spread zones, or can multiple `MOVE_CARD` actions be batched? (Atomicity matters for undo correctness — a single server action for multi-card moves is the correct approach.)
3. Should personal spread zones also support multi-select? (Yes — same code path as communal zone once state is lifted to `BoardDragLayer`.)
4. What happens to selection state when the player drops a multi-card move and the server broadcasts new state? Selection should clear on confirmed move, which requires the state reset to happen in the WS message handler, not just on `onDragEnd`. Needs verification against `usePartySocket` flow.

---

## Sources

- Existing codebase: `src/components/BoardView.tsx`, `SpreadZone.tsx`, `HandZone.tsx`, `ControlsBar.tsx`, `App.tsx` (direct inspection)
- [dnd-kit multi-select issue #120](https://github.com/clauderic/dnd-kit/issues/843) — multi-select drag pattern discussions
- [dnd-kit sortable state management](https://dndkit.com/react/guides/sortable-state-management/) — snapshot/restore pattern for undo
- [shadcn Sheet vs Drawer discussion](https://github.com/shadcn-ui/ui/discussions/3043) — component pattern differences
- [shadcn Popover docs](https://www.shadcn.io/ui/popover)
- [shadcn Sheet docs](https://www.shadcn.io/ui/sheet)
- [CSS dvh units for mobile layouts](https://dev.to/web_dev-usman/the-new-css-viewport-units-that-finally-fix-mobile-layouts-2cjd)
- [Card game UI design principles — GDKeys](https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/)
- [TCG board layout design](https://medium.com/@Heathrileyo/designing-a-tcg-game-board-layout-frontline-vs-backline-and-strategic-choice-8eb3effff7d1)
- [CSS Grid gameboard approach](https://medium.com/@gwhi94/creating-a-gameboard-with-css-grid-47da8ac25078)
- PROJECT.md v1.3 requirements and Key Decisions (this repo)

---
*Feature research for: Virtual Deck v1.3 Layout & UX Polish*
*Researched: 2026-05-01*
