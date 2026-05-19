# Technology Stack

**Project:** Virtual Deck
**Researched:** 2026-05-19 (v1.5 additions only — existing stack not re-researched)
**Confidence note:** All findings verified against installed `node_modules` source and live component files. No [UNVERIFIED] tags.

---

## Existing Stack (validated, do not re-recommend)

React 18.3.1 + Vite + TypeScript + shadcn v4 (base-nova style, `@base-ui/react` primitives) + `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 + partysocket + PartyKit + Vitest + Playwright. All installed and working. See `package.json` for exact versions.

---

## v1.5 Scope: What's Actually New

No new npm packages are needed for v1.5. Every v1.5 fix is a refactor of existing components using patterns and APIs already present in the codebase.

| Requirement | Library decision |
|-------------|-----------------|
| Dock spread zones to hands (LAYOUT-05) | No new library — Tailwind flex layout change in `BoardView.tsx` |
| Empty spread strip (LAYOUT-06) | No new library — `cn()` conditional class change in `SpreadZone.tsx` |
| Remove spread zone labels (LAYOUT-07) | No new library — delete `<span>` element |
| Fix select all (BUG-01) | No new library — bug fix in `PileZone.tsx` / `SpreadZone.tsx` |
| Mobile grid collapse (BUG-02) | No new library — `sm:grid-cols-7` responsive prefix in `GridZone.tsx` |
| Hide 0-count badge (POLISH-05) | No new library — conditional render guard in `PileZone.tsx` |
| Tighten pile controls (POLISH-06) | No new library — Tailwind spacing change in `PileZone.tsx` |
| Remove opponent spread face-toggle (CTRL-05) | No new library — remove button from `SpreadZone` when `interactive === false` |
| Opponent hand outline on hover only (CTRL-06) | No new library — remove `dragIsActive` branch in `OpponentHand.tsx` |
| Grid face-toggle near zone label (CTRL-07) | No new library — move JSX in `GridZone.tsx` |
| Hand sort "original" semantics (SORT-02) | No new library — logic change in `HandZone.tsx` |

**Bottom line: v1.5 requires zero new npm installs.**

---

## Feature-by-Feature Technical Analysis

### 1. CSS Layout: Flex/Grid for Docking Spread Zones (LAYOUT-05)

**What's needed:** Dock opponent spreads directly below `OpponentHand`; dock personal spread flush above `HandZone`. Currently all zones float as independent siblings in `BoardView`.

**Current structure in `BoardView.tsx`:**
```
<div class="h-screen flex flex-col">
  <div class="flex items-start bg-card">          ← opponent row
    <div class="flex flex-col gap-1">             ← per-opponent column — spread already here
      <OpponentHand />
      <SpreadZone />
    </div>
  </div>
  <div class="flex-1 min-h-0 flex flex-col">      ← center area
    <PileZone /><GridZone />                       ← pile/grid row
    <SpreadZone (personal) />                      ← personal spread: floating in center area
    <HandZone />
  </div>
</div>
```

**Opponent spread is already co-located.** It renders inside the `flex flex-col gap-1` per-opponent wrapper. Visual docking is a matter of ensuring there is no excess `gap-` or `py-` between the hand and spread in that wrapper. No structural change needed for opponents.

**Personal spread needs to join the hand.** The fix is to wrap personal spread + hand into a single `flex-shrink-0 flex flex-col` container at the bottom of the center area. This prevents the spread from floating in the middle of the board when the center area has extra vertical space:

```tsx
// Replace the current separate mySpreadZone block + HandZone siblings:
<div className="flex-shrink-0 flex flex-col gap-0">
  {mySpreadZone && (
    <div className="px-4 pt-1">
      <SpreadZone ... />
    </div>
  )}
  <HandZone ... />
</div>
```

**Why not `sticky bottom-0`:** The board outer container uses `overflow-x-hidden overflow-y-auto` at mobile and `sm:overflow-hidden` at desktop. Sticky requires a scrollable ancestor. At desktop (`sm:`) the board is `h-screen` with `overflow-hidden` — there is no scroll container, so sticky has no effect. At mobile the scroll context is the center area div, not the outer screen. Using `flex-shrink-0` on the hand+spread unit (as the last child in a `flex-col`) is simpler, correct at all sizes, and consistent with the existing pattern.

**Relevant Tailwind utilities:**

| Utility | Effect | Use case |
|---------|--------|----------|
| `flex-shrink-0` | Prevents flex item from shrinking | Keeps hand+spread at full height |
| `flex flex-col` | Stacks children vertically | Wrapping spread above hand |
| `gap-0` | Removes gap between spread strip and hand | Flush dock |
| `flex-1 min-h-0` | Fills remaining space, allows shrink | Center (pile+grid) row |
| `self-end` | Aligns item to end of cross-axis | Alternative if hand is inside a `flex items-start` |

---

### 2. Empty Spread Zone Strip (LAYOUT-06)

**What's needed:** When the personal spread is empty, show a ¼-height dashed outline strip (always visible, not hidden) as a landing zone affordance. Controls hidden until cards arrive.

**Current empty behavior in `SpreadZone.tsx`:**
```tsx
isEmpty && interactive !== false
  ? isOver
    ? 'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg ...'
    : 'h-px opacity-0'    // ← completely hidden when empty and not hovered
```

**New pattern:**
```tsx
isEmpty && interactive !== false
  ? cn(
      'h-[22px] rounded border border-dashed border-border/40',
      isOver && 'border-primary/60'
    )
  : cn(
      'min-w-[56px] h-[64px] sm:min-w-[80px] sm:h-[88px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary',
      isEmpty ? 'border-dashed' : '',
      isOver ? 'border-primary' : 'border-border'
    )
```

`h-[22px]` is approximately ¼ of the `sm:h-[88px]` card height (88/4 = 22). `border-border/40` produces a faint dashed line using the existing border color token at 40% opacity.

Controls (`Eye`, `SquareCheck`) must be gated on `!isEmpty` — already handled by the existing `{(!isEmpty || interactive === false) && ...}` branch in `SpreadZone.tsx`. The `interactive === false` branch (opponent spreads) should not show the strip at all since opponents don't need an empty affordance.

---

### 3. Responsive Grid Columns (BUG-02)

**Requirement:** The communal `GridZone` uses `grid-cols-7` and overflows on iPhone SE (375px viewport width). Fix: use `grid-cols-4` at narrow widths, `grid-cols-7` at `sm:` and above.

**Current code in `GridZone.tsx`:**
```tsx
<div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden w-fit">
```

**Fix:**
```tsx
<div className="grid grid-cols-4 sm:grid-cols-7 gap-px bg-border rounded-md overflow-hidden w-fit">
```

**Why `sm:` is the right breakpoint:**
- Tailwind v4 default: `--breakpoint-sm: 40rem` = 640px (verified against `node_modules/tailwindcss/theme.css`)
- iPhone SE viewport: 375px — below `sm:`, so gets `grid-cols-4`
- Any desktop/tablet viewport ≥ 640px gets `grid-cols-7`

**Cell sizing math:**
- Mobile (`grid-cols-4`, `w-14` = 56px): 4 × 56 + 3px gaps ≈ 227px — fits within 375px with padding
- Desktop (`sm:grid-cols-7`, `sm:w-20` = 80px): 7 × 80 + 6px gaps ≈ 566px — fits within 640px+

The cell width classes (`w-14 h-[64px] sm:w-20 sm:h-[88px]`) in `GridCell` already have responsive sizing. No changes needed there — only the column count on the grid container changes.

**No custom breakpoints needed.** Do not add anything to `@theme {}` in `globals.css`.

---

### 4. dnd-kit: Opponent Hand Outline on Hover Only (CTRL-06)

**Requirement:** `OpponentHand` shows `border-dashed border-primary/60` whenever any drag is active (even when the pointer is far away). The requirement is to show a border only when the pointer is actually over the opponent hand drop target.

**Root cause in `OpponentHand.tsx`:**
```tsx
const { active } = useDndContext();
const dragIsActive = active !== null;   // true from the moment any drag starts

className={cn(
  isOver      ? 'border-2 border-primary'               // pointer over this target
  : dragIsActive ? 'border-2 border-dashed border-primary/60'  // any drag active — this is the bug
  : 'border-2 border-transparent'
)}
```

**API facts (verified against `@dnd-kit/core` v6.3.1 installed source, `core.cjs.development.js` lines 2517–2540):**

| Hook | Return shape | Relevant value |
|------|-------------|----------------|
| `useDroppable` | `{ setNodeRef, isOver }` | `isOver: boolean` — true only while pointer is inside this droppable's rect |
| `useDndContext` | `{ active, over, activatorEvent, ... }` | `active !== null` = any drag in progress globally |

`isOver` from `useDroppable` is `false` at drag start when the pointer is elsewhere. It becomes `true` only once the collision detection determines this droppable is the current drop target.

**Fix — remove the `dragIsActive` branch from the border logic:**
```tsx
// In OpponentHand.tsx:
// Remove: const { active } = useDndContext();
// Remove: const dragIsActive = active !== null;

className={cn(
  'flex flex-col rounded-lg p-1 border-2',
  isOver ? 'border-primary' : 'border-transparent',
)}
```

**What to keep:** The `dragIsActive` import is also used for the `min-h-[44px] min-w-[80px]` size constraint and the "Drop to pass" text hint:
```tsx
{dragIsActive && cardCount === 0 && ...<span>Drop to pass</span>}
```
If the text hint is kept, retain `const { active } = useDndContext()` and `const dragIsActive = active !== null` — only remove the `dragIsActive` term from the border `cn()` call.

If the hit-area size constraint (`dragIsActive && 'min-h-[44px] min-w-[80px]'`) should also be kept for discoverability, that is a separate product decision from CTRL-06. The requirement only specifies the outline border.

**Why `useDndMonitor` is not the right tool here:** `useDndMonitor.onDragOver` fires on every pointer movement over a droppable and requires managing a state variable (`useState`). `isOver` from `useDroppable` is already reactive and automatically synchronized. No extra event listener needed.

---

### 5. Badge/Count Display (POLISH-05)

**Requirement:** Hide the count badge on `PileZone` when `pile.cards.length === 0`.

**Current code in `PileZone.tsx`:**
```tsx
<Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
```

**Fix:**
```tsx
{pile.cards.length > 0 && (
  <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
)}
```

This is the idiomatic React pattern. `GridZone.tsx` already uses the same pattern correctly for stacked-card count (`cellCards.length > 1 && <Badge>`).

**Why conditional render over CSS visibility:** Hiding via `opacity-0` or `visibility: hidden` keeps the element in the DOM and accessible to screen readers, which would announce "0" as a count. Conditional render removes it from the tree entirely.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `sticky bottom-0` on `HandZone` | Board uses `overflow-hidden` at `sm:` — sticky has no scroll container parent | `flex-shrink-0` + flex ordering |
| New drag affordance library | `isOver` from existing `useDroppable` covers all needed hover detection | `isOver` from `@dnd-kit/core` `useDroppable` |
| `useDndMonitor` for hover state | Requires `useState` + `onDragOver` — more complex than `isOver` for same result | `isOver` from `useDroppable` |
| Custom breakpoints in `@theme {}` | `sm:` (640px) is exactly the iPhone SE vs desktop threshold | Default `sm:` breakpoint |
| `zustand` for badge state | Badge count is derived directly from `pile.cards.length` | Inline conditional render |
| Any new npm package | All v1.5 changes are refactors inside existing components | Existing stack |

---

## Version Compatibility

| Package | Installed Version | Notes |
|---------|------------------|-------|
| `@dnd-kit/core` | 6.3.1 | `useDndContext` returns `{ active, over, ... }`. `useDroppable` returns `{ setNodeRef, isOver }`. Verified against installed CJS source. |
| `@dnd-kit/sortable` | 10.0.0 | Major version diverges from core intentionally. No API changes needed for v1.5. |
| `tailwindcss` | 4.2.2 | v4 breakpoints defined as CSS custom properties. `--breakpoint-sm: 40rem` (640px). `sm:grid-cols-N` syntax is identical to v3 from an authoring perspective. No `tailwind.config.js` — config lives in `@theme {}` inside `globals.css`. |
| `@tailwindcss/vite` | 4.2.2 | Vite plugin; responsive utilities compile correctly at build time. |
| `react` | 18.3.1 | Conditional render via `count > 0 && <Badge>` is stable. |
| `@base-ui/react` | ^1.3.0 | No changes to primitives in v1.5. |

---

## Sources

- `node_modules/@dnd-kit/core/dist/core.cjs.development.js` lines 2517–2540 — `defaultPublicContext` shape confirmed (`active: null`, `over: null`). HIGH confidence.
- `node_modules/tailwindcss/theme.css` — `--breakpoint-sm: 40rem` confirmed. HIGH confidence.
- `src/components/OpponentHand.tsx`, `GridZone.tsx`, `PileZone.tsx`, `SpreadZone.tsx`, `BoardView.tsx`, `HandZone.tsx`, `BoardDragLayer.tsx` — current implementation patterns. HIGH confidence.
- `tailwindcss.com/docs/grid-template-columns` and `tailwindcss.com/docs/responsive-design` — `sm:grid-cols-N` syntax verified. HIGH confidence.
- Context7 `/clauderic/dnd-kit` — `useDragOperation` docs (new `@dnd-kit/react` package API, not the v6 API in use). Used for cross-reference only; v6 source confirmed separately. MEDIUM confidence for new API.
- Context7 `/websites/dndkit` — `useDroppable` return shape confirmed. MEDIUM confidence (v6 source confirmed independently).
