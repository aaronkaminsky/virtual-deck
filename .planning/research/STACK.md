# Technology Stack

**Project:** Virtual Deck
**Researched:** 2026-05-01 (v1.3 additions only — existing stack and v1.2 additions not re-researched)
**Confidence note:** All findings verified against official docs, npm registry, and base-ui release notes. No [UNVERIFIED] tags — every claim below has a source.

---

## Existing Stack (validated, do not re-recommend)

React 18 + Vite + TypeScript + shadcn v4 (base-nova style, `@base-ui/react` primitives) + dnd-kit/core 6.x + dnd-kit/sortable 10.x + partysocket + PartyKit + Vitest + Playwright. All installed and working. See package.json for exact versions.

---

## v1.3 Scope: What's Actually New

The four v1.3 features map to library decisions as follows:

| Feature | Library decision |
|---------|-----------------|
| Responsive layout (phone screens) | No new library — Tailwind v4 breakpoints + `h-dvh` |
| Collapsible dropdown/slide-out panel | No new library — `@base-ui/react/drawer` (already installed at ^1.3.0, stable since v1.3.0) |
| Drag-to-reorder cards in spread zones | No new library — `@dnd-kit/sortable` already in use in SpreadZone.tsx; extend existing pattern |
| Multi-card select in spread zones | No new library — replicate existing HandZone select pattern into SpreadZone |

**Bottom line: v1.3 requires zero new npm installs.** All needed primitives are already present in `node_modules`. The milestone is entirely a refactor/extension of existing code.

---

## Feature-by-Feature Technical Analysis

### 1. Responsive Layout (LAYOUT-04)

**What's needed:** `h-screen` → `h-dvh` swap, Tailwind responsive prefixes (`sm:`, `md:`), and layout rework in `BoardView.tsx`.

**Why `h-dvh` not `h-screen`:** `h-screen` maps to `100vh`. On mobile browsers, `100vh` includes the address bar height even when the bar is visible, which causes the board to overflow below the fold. `h-dvh` (`100dvh`) is the dynamic viewport height unit — it reflects the actual visible area and updates as the browser UI shows/hides. Tailwind v4 includes `h-dvh` as a first-class utility (added in Tailwind 3.4, carried forward). No config change needed.

**Breakpoints:** Tailwind v4 uses CSS-first config. Default breakpoints (`sm: 640px`, `md: 768px`) are available without any `@theme` additions. The existing `globals.css` does not override them, so they are already available in the project. Phone-screen targeting means writing base (unprefixed) styles for small and using `sm:` or `md:` to unlock wider layouts.

**No new packages.** Pure Tailwind class changes in `BoardView.tsx` and possibly `HandZone.tsx`.

---

### 2. Collapsible Panel for Game Controls (LAYOUT-03)

**What's needed:** A panel that can open/close, triggered by a button, showing the game controls (Deal, Undo, Reset).

**Use `@base-ui/react/drawer` — already installed.**

The project is on `@base-ui/react ^1.3.0`. In v1.3.0 (released March 2026), the `Drawer` component graduated from preview to stable. Import: `import { Drawer } from '@base-ui/react/drawer'`. It wraps `Dialog` and adds slide-in positioning plus optional swipe gesture support. For a game controls panel that slides down from the top or in from the side, this is the correct primitive. If gesture support is not needed, `Dialog` from `@base-ui/react/dialog` also works as a positioned panel (Base UI docs: "a panel that slides in from the edge of the screen and doesn't need gesture support is a positioned Dialog").

**Why not shadcn `Sheet` or `Drawer`:** The shadcn CLI's `sheet` and `drawer` components are designed for Radix UI-based projects (style: `default`). This project uses `style: "base-nova"` — shadcn generates `@base-ui/react` wrappers. The `shadcn add sheet` command may generate a Radix-based sheet incompatible with the project's base-ui pattern. Even if shadcn generates a base-ui sheet, the project already has `@base-ui/react/drawer` which is the exact same primitive. Use it directly, as `ControlsBar.tsx` already does for its popover (see: `@base-ui/react/popover` in `popover.tsx`). Keep the pattern consistent.

**Why not a Popover:** The existing `Popover` in `ControlsBar.tsx` works for the deal count input but is anchored to its trigger button. A game controls panel with multiple buttons (Deal, Undo, Reset) is better served by a modal-style panel that overlays the board rather than a tooltip-style float. Use `Drawer` for clear affordance.

**Implementation pattern:**
```tsx
import { Drawer } from '@base-ui/react/drawer';

// Drawer.Root wraps the trigger and content
// Drawer.Trigger renders the "Controls" button
// Drawer.Portal + Drawer.Backdrop + Drawer.Popup render the panel
// Drawer.Close inside the panel
```

Style the Popup with `fixed bottom-0 inset-x-0` (or `top-0`) and CSS `data-open:animate-in data-closed:animate-out` slide transitions — same animation pattern as the existing `PopoverContent` in `popover.tsx`.

---

### 3. Drag-to-Reorder Cards in Spread Zones (SPREAD-02)

**What's needed:** Already implemented in `SpreadZone.tsx`. Review the code before touching it.

`SpreadZone.tsx` already uses `SortableContext` with `horizontalListSortingStrategy`, `useSortable` on each card, and `useDndMonitor` to detect intra-pile reorders and dispatch `REORDER_PILE_SPREAD`. The drag-to-reorder infrastructure is complete.

The v1.3 work here is validation and ensuring the UX is wire-compatible with what `HandZone.tsx` does — both already use the same `arrayMove` + server action pattern. No new dnd-kit features or packages needed.

**Potential integration point for multi-select (SPREAD-01):** The `SortableSpreadCard` does not yet receive `isSelected` or `onToggleSelect` props. When multi-select is added, it must mirror the `SortableHandCard` pattern exactly: `isSelected` drives a visual indicator, `onToggleSelect` is called on click, and the drag action moves all selected cards (same "select-then-drag" pattern validated in Phase 15, see Key Decision in PROJECT.md).

---

### 4. Multi-Card Select in Spread Zones (SPREAD-01)

**What's needed:** Replicate the `HandZone` selection UX into `SpreadZone`.

`HandZone.tsx` uses:
- `selectedIds: Set<string>` and `onToggleSelect: (id: string) => void` as props
- `isSelected` drives `translateY(-6px)` transform and a `ring-1` highlight on the card div
- `onClick` on the outer wrapper calls `onToggleSelect`
- `onPointerDown` stops propagation to prevent dnd-kit from stealing the click
- An `aria-pressed` override after the `{...attributes}` spread (Project Key Decision: must come last to override dnd-kit's own `aria-pressed`)

The same props and the same DOM structure need to be added to `SortableSpreadCard` and `SpreadZoneProps`. The selection state for spread zones likely needs to live in the same parent as hand selection state (currently managed in `App.tsx` or `BoardView.tsx`), or in a dedicated per-zone `useState`.

**Why not dnd-kit multi-drag plugin:** dnd-kit's multi-drag is unfinished and not officially shipped (GitHub issue #120, open since 2021). The project already uses the select-then-drag pattern as a validated Key Decision. Do not change the approach.

**No new packages.** This is a prop threading and component extension exercise.

---

## What NOT to Add

| Do not add | Why |
|-----------|-----|
| `vaul` | shadcn's Drawer uses it, but this project's base-nova style uses `@base-ui/react/drawer` instead. Adding vaul creates a second primitive library for the same use case. |
| `@radix-ui/react-dialog` or any `@radix-ui/*` | The project explicitly chose `@base-ui/react`. Key Decision: `@base-ui/react/dialog` for pile insert dialog because Radix AlertDialog had a `disablePointerDismissal` bug. Do not introduce Radix primitives. |
| `framer-motion` / `motion` | tw-animate-css already handles the CSS-driven `data-open/data-closed` animations consistent with shadcn base-nova. No JS animation library needed for panel slide. |
| `react-spring`, `@use-gesture/react` | No new gesture/animation infrastructure needed. |
| Any grid layout library (`react-grid-layout`, etc.) | Board layout is a fixed structure, not a resizable dashboard. Tailwind flex/grid is sufficient. |
| `@dnd-kit/modifiers` (if not already present) | Modifiers are only needed for constrained drag (e.g., axis-lock). The spread zone reorder is unconstrained horizontal. Do not add unless a specific drag constraint is needed. |

---

## Version Compatibility Notes

| Package | Current version | Notes |
|---------|----------------|-------|
| `@base-ui/react` | `^1.3.0` (installed) | Drawer stable since 1.3.0. Import from `@base-ui/react/drawer`. |
| `@dnd-kit/core` | `^6.3.1` (installed) | No changes needed. |
| `@dnd-kit/sortable` | `^10.0.0` (installed) | Already used in both HandZone and SpreadZone. No upgrade. |
| `tailwindcss` | `^4.2.2` (installed) | `h-dvh` available. Default breakpoints (`sm`, `md`) available without config changes. |

---

## Sources

- `package.json` in this repo — exact installed versions (HIGH confidence)
- `src/components/SpreadZone.tsx`, `HandZone.tsx`, `ControlsBar.tsx` — existing implementation patterns (HIGH confidence)
- `components.json` — confirmed `style: "base-nova"`, `@base-ui/react` is the primitive library (HIGH confidence)
- Base UI v1.3.0 release notes: https://base-ui.com/react/overview/releases/v1-3-0 — Drawer stable (HIGH confidence)
- Base UI Drawer docs: https://base-ui.com/react/components/drawer — Drawer vs positioned Dialog guidance (HIGH confidence)
- Tailwind CSS height docs: https://tailwindcss.com/docs/height — `h-dvh` availability (HIGH confidence)
- Tailwind CSS responsive design: https://tailwindcss.com/docs/responsive-design — breakpoint defaults (HIGH confidence)
- shadcn/ui changelog: https://ui.shadcn.com/docs/changelog — base-nova style context (MEDIUM confidence)
- dnd-kit GitHub issue #120 (multi-drag): https://github.com/clauderic/dnd-kit/issues/120 — confirmed unshipped (HIGH confidence)
