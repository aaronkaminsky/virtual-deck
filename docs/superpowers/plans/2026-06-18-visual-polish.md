# Visual Polish (999.54) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Virtual Deck look modern, clean, and professional via a presentation-layer pass — refined color tokens, a charcoal "app frame" around an emerald felt, a consistent depth/type system, hover-reveal zone controls, distinct selection vs. last-move highlights, and a new gold-lattice card back — with zero game-logic, state, or networking changes.

**Architecture:** Almost all changes live in `src/globals.css` (design tokens + a few utility classes) plus targeted `className`/inline-style edits in presentation components. No server, shared types, hooks, or game actions are touched. Because the work is visual, verification leans on `npm run typecheck`, the existing Vitest suite, the existing Playwright e2e suite (must stay green — selectors preserved), and manual visual checks at small/medium/large viewports. New unit tests are added only where there is a real behavioral contract to pin (hover-reveal keeps controls in the DOM and focusable).

**Tech Stack:** React 18 + TypeScript, Tailwind CSS v4 (`@theme` tokens in `globals.css`), shadcn/base-ui components, lucide-react icons, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-18-visual-polish-design.md`

**Key existing facts (verified):**
- Felt is applied via `bg-felt` (→ `--color-felt: #2d6a4f`) in `BoardView.tsx:60` (whole board) and `CanvasZone.tsx:315` (play area).
- Chrome surfaces use `bg-card` (→ `--card: hsl(160 38% 10%)`, currently dark green): top bar `BoardView.tsx:62`, hand zone `HandZone.tsx:269`, canvas controls panel `CanvasControls.tsx:13`.
- The pile rail column is `BoardView.tsx:115` (`border-r border-border`, no background → shows felt today).
- Selection ring is hardcoded gold-orange `#f59e0b` / `rgba(245,158,11,0.3)` in `CanvasDraggableCard.tsx:64`, and `ring-primary` in `PileZone.tsx:113`.
- Last-move highlight = class `.last-move-highlight` + `@keyframes last-move-pulse` in `globals.css:201-217`, color `#38bdf8` (cyan), 8s.
- Per-zone control button groups: `PileZone.tsx:75-104`, `HandZone.tsx:245-263`, `CanvasControls.tsx:10-40`, `SpreadZone.tsx:244+`.
- Card back asset: `public/cards/jumbo/back.png`, referenced by `CARD_BACK_URL` in `src/card-art.ts`.
- Count badge: `<Badge>` default variant = `bg-primary text-primary-foreground` (`PileZone.tsx:138`).

**New token/color values (used throughout):**
- Gold accent: `#e6b84e` (replaces orange-ish `hsl(38 92% 50%)` and hardcoded `#f59e0b`).
- Gold accent ring rgba: `rgba(230,184,78,0.35)`.
- Ice-blue last-move: solid `#9ad0ec`, glow `rgba(154,208,236,0.55)`.
- Charcoal chrome: rail/card `#161b22`, top bar `#11151b`, popover `#0f1318`.
- Emerald felt gradient: `linear-gradient(180deg, #1f5d46 0%, #173f30 100%)`.

---

## Task 1: Color tokens, felt surface, charcoal chrome

**Files:**
- Modify: `src/globals.css` (`@theme inline` block ~7-47; `:root` ~49-77; `.dark` ~79-106)
- Modify: `src/components/BoardView.tsx:60`, `:62`, `:115`
- Modify: `src/components/CanvasZone.tsx:315`

- [ ] **Step 1: Retune accent + chrome tokens in `:root` and `.dark`**

In `src/globals.css`, in BOTH the `:root` block (lines ~49-77) and the `.dark` block (lines ~79-106), change these values (the two blocks currently hold identical values — keep them identical):

```css
    /* chrome → neutral charcoal (was green hsl(160 38% 10%)) */
    --card: hsl(218 18% 11%);            /* #161b22 rail/card surfaces */
    --card-foreground: hsl(220 13% 91%);
    --popover: hsl(216 22% 8%);          /* #0f1318 menus/popovers */
    --popover-foreground: hsl(220 13% 91%);

    /* accent → softer brass gold (was hsl(38 92% 50%)) */
    --primary: hsl(43 75% 60%);          /* #e6b84e */
    --primary-foreground: hsl(40 60% 8%);

    /* pile/secondary surfaces → neutral */
    --secondary: hsl(218 16% 18%);
    --muted: hsl(218 14% 20%);
    --muted-foreground: hsl(220 12% 70%);
    --border: hsl(0 0% 100% / 0.08);     /* hairline */
    --input: hsl(218 16% 18%);
    --ring: hsl(43 75% 60%);             /* gold focus ring */

    /* sidebar tokens follow chrome/gold */
    --sidebar: hsl(216 22% 8%);
    --sidebar-primary: hsl(43 75% 60%);
    --sidebar-primary-foreground: hsl(40 60% 8%);
    --sidebar-border: hsl(0 0% 100% / 0.08);
    --sidebar-ring: hsl(43 75% 60%);
```

Leave `--background`, `--foreground`, `--destructive`, `--radius`, and the `--sidebar-foreground`/`--sidebar-accent*` lines as they are unless listed above.

- [ ] **Step 2: Add felt + ice-blue tokens to the `@theme inline` block**

In `src/globals.css`, inside `@theme inline { … }`, replace the three `--color-felt*` lines (43-45) with:

```css
    --color-felt: #1f5d46;
    --color-felt-dark: #173f30;
    --color-felt-highlight: #2c7456;
    --color-ice: #9ad0ec;
```

- [ ] **Step 3: Add a `.felt-surface` utility (gradient + vignette) at the end of `globals.css`**

Append to `src/globals.css`:

```css
@layer components {
  .felt-surface {
    background-color: var(--color-felt);
    background-image:
      radial-gradient(120% 90% at 50% -10%, rgba(255,255,255,0.05), transparent 60%),
      linear-gradient(180deg, var(--color-felt) 0%, var(--color-felt-dark) 100%);
  }
}
```

- [ ] **Step 4: Apply felt + charcoal chrome in `BoardView.tsx`**

- Line 60: change `bg-felt` → `felt-surface`:
  ```tsx
  <div className="h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col felt-surface">
  ```
- Line 62: top bar — add a hairline bottom border (already `bg-card`, now charcoal):
  ```tsx
  <div className="flex items-start justify-between px-4 py-2 gap-4 bg-card border-b border-border">
  ```
- Line 115: pile rail — add charcoal background so the rail reads as chrome:
  ```tsx
  <div className="flex-shrink-0 self-stretch flex flex-col justify-center gap-2 py-2 px-2 bg-card border-r border-border">
  ```

- [ ] **Step 5: Apply felt gradient to the canvas play area**

In `src/components/CanvasZone.tsx:315`, change `bg-felt` → `felt-surface`:

```tsx
        'relative flex-1 min-w-0 self-stretch overflow-hidden felt-surface',
```

- [ ] **Step 6: Verify build + existing tests**

Run: `npm run typecheck`
Expected: PASS (no type errors).

Run: `npm test`
Expected: PASS (token-only changes don't alter logic).

- [ ] **Step 7: Commit**

```bash
git add src/globals.css src/components/BoardView.tsx src/components/CanvasZone.tsx
git commit -m "feat(999.54): retune palette — emerald felt + charcoal chrome + brass gold"
```

---

## Task 2: Unify selection ring to gold + resting/elevation shadows

**Files:**
- Modify: `src/components/CanvasDraggableCard.tsx:63-68`
- Modify: `src/lib/canvas-utils.ts:3`
- Modify: `src/globals.css` (append elevation utilities)

- [ ] **Step 1: Recolor the canvas selection ring to brass gold**

In `src/components/CanvasDraggableCard.tsx`, replace the `boxShadow` ternary (lines 63-65):

```tsx
    boxShadow: isSelected
      ? '0 0 0 2px #e6b84e, 0 0 0 4px rgba(230,184,78,0.35)' + (coversAnother ? `, ${STACK_SHADOW}` : '')
      : coversAnother ? STACK_SHADOW : '0 4px 10px rgba(0,0,0,0.35)',
```

(The `else` branch now gives every resting canvas card a soft drop shadow instead of `undefined`.)

- [ ] **Step 2: Soften the stack-cover shadow to match the new depth language**

In `src/lib/canvas-utils.ts:3`, replace:

```ts
export const STACK_SHADOW = '0 6px 16px rgba(0,0,0,0.45)';
```

(Replaces the hard white offset `2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db`. A covering card now lifts via a soft shadow rather than a hard sticker edge.)

- [ ] **Step 3: Add elevation + hover-lift utilities to `globals.css`**

Append inside the existing `@layer components { … }` you created in Task 1 (or a new one):

```css
@layer components {
  .elev-2 { box-shadow: 0 10px 26px rgba(0,0,0,0.45); }
}

@media (hover: hover) {
  [data-card-id] { transition: transform 150ms ease, box-shadow 150ms ease; }
  [data-card-id]:hover { transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  [data-card-id] { transition: none; }
  [data-card-id]:hover { transform: none; }
}
```

(`[data-card-id]` is present on every draggable card — `CanvasDraggableCard.tsx:76`, and hand/spread cards via `DraggableCard`. The hover-lift is suppressed during drag because dnd-kit sets `transform` inline, which wins over the CSS hover transform, and dragged cards have `opacity:0` on the source node.)

- [ ] **Step 4: Apply `elev-2` to the controls menu + popovers**

In `src/components/CanvasControls.tsx:13`, append `elev-2` to the panel className:

```tsx
      className="absolute top-2 left-2 z-20 flex gap-1 rounded-md bg-card/80 p-1 backdrop-blur-sm elev-2"
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CanvasDraggableCard.tsx src/lib/canvas-utils.ts src/globals.css src/components/CanvasControls.tsx
git commit -m "feat(999.54): gold selection ring + soft elevation/hover-lift shadow system"
```

---

## Task 3: Last-move highlight → ice-blue transient pulse

**Files:**
- Modify: `src/globals.css:201-217` (`@keyframes last-move-pulse`, `.last-move-highlight`, reduced-motion block)

- [ ] **Step 1: Replace the cyan 8s pulse with an ice-blue ~2s pulse**

In `src/globals.css`, replace the block at lines 201-217 (from `@keyframes last-move-pulse` through the `prefers-reduced-motion` rule for `.last-move-highlight`) with:

```css
@keyframes last-move-pulse {
  0%   { box-shadow: 0 0 0 2px #9ad0ec, 0 0 18px 6px rgba(154,208,236,0.6); }
  20%  { box-shadow: 0 0 0 3px #9ad0ec, 0 0 22px 8px rgba(154,208,236,0.5); }
  100% { box-shadow: 0 0 0 2px rgba(154,208,236,0); opacity: 0; }
}

.last-move-highlight {
  animation: last-move-pulse 2s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .last-move-highlight {
    animation: none;
    box-shadow: 0 0 0 2px #9ad0ec;
  }
}
```

Rationale: ice-blue (`#9ad0ec`) is hue-distinct from the gold selection ring, the glow shape differs from the crisp selection ring, and the `forwards` fade to transparent over 2s makes "what just moved" transient — never confusable with a persistent selection.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/globals.css
git commit -m "feat(999.54): ice-blue transient last-move highlight (distinct from gold selection)"
```

---

## Task 4: Hover/focus-reveal zone controls

**Files:**
- Modify: `src/globals.css` (append reveal utilities)
- Modify: `src/components/PileZone.tsx:64`, `:75`
- Modify: `src/components/HandZone.tsx:230`, `:245`
- Modify: `src/components/SpreadZone.tsx:244` (+ its zone container)
- Modify: `src/components/CanvasControls.tsx:13`

**Testing note:** This project's Vitest setup is pure-logic only (`vitest.config.ts` → `include: ["tests/**/*.test.ts"]`, no jsdom, no Testing Library). Hover-reveal is pure CSS with no extractable logic, so there is no unit test to add. The behavioral contract — *controls stay in the DOM and remain focusable/clickable* — is guarded by the existing Playwright e2e suite (which finds and clicks these buttons by aria-label/role) and the manual pass in Task 8. We deliberately keep the buttons mounted (no `display:none`, no `pointer-events:none`) precisely so those guards hold.

- [ ] **Step 1: Add reveal utilities to `globals.css`**

Append to `src/globals.css`:

```css
/* Hover/focus-reveal for per-zone action controls.
   On pointer devices, controls are hidden until the zone is hovered or
   anything inside it is focused. On touch (no hover), they stay visible
   (tap-to-use), so they're never unreachable. Always in the DOM either way. */
@media (hover: hover) {
  .zone-controls {
    opacity: 0;
    transition: opacity 150ms ease;
  }
  .zone-hover:hover .zone-controls,
  .zone-hover:focus-within .zone-controls {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .zone-controls { transition: none; }
}
```

Note: we intentionally do NOT set `pointer-events: none` or `display: none`, so the buttons remain hit-testable for tests and reachable via keyboard focus (which triggers `:focus-within` → reveal).

- [ ] **Step 2: Apply reveal classes in `PileZone.tsx`**

- Line 64: add `zone-hover group` scope to the pile column wrapper:
  ```tsx
    <div className="flex flex-col gap-0.5 zone-hover">
  ```
- Line 75: add `zone-controls` to the button group:
  ```tsx
        <div className="flex gap-1 zone-controls">
  ```

- [ ] **Step 3: Apply reveal classes in `HandZone.tsx`**

The hand's controls live in the header row (line 230) and the zone is the outer `<div>` returned at line 229. Mark the outer wrapper as the hover scope and wrap the two control Buttons.

- Line 229: change `<div>` → `<div className="zone-hover">`.
- Wrap the reveal/sort Buttons (lines 245-263) in a `zone-controls` span. Replace the two `<Button>…</Button>` blocks with:
  ```tsx
        <span className="flex gap-1 zone-controls">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onToggleReveal}
            title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
            aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
            aria-pressed={isRevealed}
          >
            {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSort}
            title={SORT_TITLES[sortMode]}
            aria-label={SORT_ARIA_LABELS[sortMode]}
          >
            <ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
          </Button>
        </span>
  ```

- [ ] **Step 4: Apply reveal classes in `SpreadZone.tsx`**

- The outer container at `SpreadZone.tsx:172` (`<div className="flex flex-col gap-1">`): add `zone-hover`:
  ```tsx
    <div className="flex flex-col gap-1 zone-hover">
  ```
- The control button group at line 244 (`<div className="flex gap-1">`): add `zone-controls`:
  ```tsx
          <div className="flex gap-1 zone-controls">
  ```

- [ ] **Step 5: Apply reveal to the canvas controls panel**

The canvas controls float over the play area; the hover scope is the canvas itself. In `CanvasControls.tsx:13`, add `zone-controls` to the panel, and mark the canvas container as `zone-hover`.

- `CanvasControls.tsx:13`:
  ```tsx
      className="absolute top-2 left-2 z-20 flex gap-1 rounded-md bg-card/80 p-1 backdrop-blur-sm elev-2 zone-controls"
  ```
- In `CanvasZone.tsx:315`, add `zone-hover` to the play-area className string (alongside `felt-surface` from Task 1):
  ```tsx
        'relative flex-1 min-w-0 self-stretch overflow-hidden felt-surface zone-hover',
  ```

- [ ] **Step 6: Verify types + full suite**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS (existing tests find buttons by aria-label/role — still in DOM).

- [ ] **Step 7: Commit**

```bash
git add src/globals.css src/components/PileZone.tsx src/components/HandZone.tsx src/components/SpreadZone.tsx src/components/CanvasControls.tsx src/components/CanvasZone.tsx
git commit -m "feat(999.54): hover/focus-reveal per-zone controls (touch keeps them visible)"
```

---

## Task 5: Typography polish — labels + tabular numerals

**Files:**
- Modify: `src/globals.css` (append label utility)
- Modify: `src/components/PileZone.tsx:67`, `:138`
- Modify: `src/components/HandZone.tsx:232`

- [ ] **Step 1: Add a zone-label utility + tabular-nums to badges in `globals.css`**

Append to `src/globals.css`:

```css
@layer components {
  .zone-label {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.6875rem; /* 11px */
    color: var(--muted-foreground);
  }
}
/* counts/badges should not jitter as numbers change width */
[data-slot="badge"] { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 2: Apply `zone-label` to the pile name**

In `src/components/PileZone.tsx:67`, replace the `<span>` class:

```tsx
        <span className="zone-label hidden sm:inline">
```

(Keep the inner `{pile.name}` and the `<kbd>` shortcut markup unchanged.)

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/globals.css src/components/PileZone.tsx
git commit -m "feat(999.54): zone-label type style + tabular-nums counts"
```

---

## Task 6: New gold-lattice card back (SVG)

**Files:**
- Create: `public/cards/jumbo/back.svg`
- Modify: `tests/card-art.test.ts` (the existing test pins `back.png` — must become `back.svg`)
- Modify: `src/card-art.ts` (back URL)
- Delete: `public/cards/jumbo/back.png` (after wiring SVG)

Rationale: a vector back is crisp at every render size (40px → fanned → large), tiny in bytes, needs no @2x, and exactly matches the locked "gold cross-hatch lattice on charcoal" design. Faces stay PNG; only the back becomes SVG.

- [ ] **Step 1: Update the failing card-art test to expect the SVG (TDD red)**

`tests/card-art.test.ts` currently asserts the back URL is the PNG. Change that assertion:

```ts
  it('CARD_BACK_URL points to the jumbo back', () => {
    expect(CARD_BACK_URL).toBe('/cards/jumbo/back.svg');
  });
```

Run: `npm test -- card-art`
Expected: FAIL — `CARD_BACK_URL` is still `/cards/jumbo/back.png`.

- [ ] **Step 2: Create the SVG card back**

Create `public/cards/jumbo/back.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168" width="120" height="168">
  <defs>
    <pattern id="lattice" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#1a2027"/>
      <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(230,184,78,0.22)" stroke-width="2"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="120" height="168" rx="10" fill="#1a2027"/>
  <rect x="0" y="0" width="120" height="168" rx="10" fill="url(#lattice)"/>
  <rect x="6.5" y="6.5" width="107" height="155" rx="7" fill="none"
        stroke="rgba(230,184,78,0.55)" stroke-width="1.5"/>
</svg>
```

(viewBox 120×168 = standard 2.5:3.5 card ratio. Edge-to-edge lattice survives overlap; thin inset gold frame reads at all sizes.)

- [ ] **Step 3: Point `CARD_BACK_URL` at the SVG (TDD green)**

In `src/card-art.ts`, change the `CARD_BACK_URL` line (currently `…/${DECK}/back.png`) to:

```ts
export const CARD_BACK_URL: string = `${import.meta.env.BASE_URL}cards/${DECK}/back.svg`;
```

Run: `npm test -- card-art`
Expected: PASS (the assertion updated in Step 1 now matches).

- [ ] **Step 4: Verify it renders in the running app**

Start the stack if not running (`npm run dev` + `npm run dev:client`), join a room, and confirm the draw pile shows the new gold-lattice back at the rail size and that a dealt face-down card on the canvas shows it too. (Visual check — no unit test for image rendering.)

- [ ] **Step 5: Remove the obsolete PNG**

```bash
git rm public/cards/jumbo/back.png
```

- [ ] **Step 6: Verify build + full suite**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/cards/jumbo/back.svg src/card-art.ts tests/card-art.test.ts
git commit -m "feat(999.54): replace red card back with gold-lattice SVG back"
```

---

## Task 7: Lobby & controls-menu polish

**Files:**
- Modify: `src/components/LobbyPanel.tsx:40`, `:41`
- Modify: `src/components/ControlsBar.tsx:93`

These inherit most of the new look automatically (gold `--primary`, charcoal `--card`/`--popover`). This task is a light alignment pass — felt gradient behind the lobby, defined elevation on the lobby card and menu popover. No structure, copy, or behavior changes.

- [ ] **Step 1: Add felt gradient behind the lobby**

In `src/components/LobbyPanel.tsx:40`, add `felt-surface` to the full-screen wrapper (currently has no background, so it falls through to `--background`):

```tsx
    <div className="min-h-screen flex items-center justify-center p-4 felt-surface">
```

- [ ] **Step 2: Elevate the lobby card**

In `src/components/LobbyPanel.tsx:41`, append `elev-2` to the centered card (already `bg-card`, now charcoal):

```tsx
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border elev-2">
```

- [ ] **Step 3: Elevate the controls menu popover**

In `src/components/ControlsBar.tsx:93`, append `elev-2` to the `PopoverContent` (background comes from `--popover`, now charcoal):

```tsx
      <PopoverContent side="bottom" align="end" className="w-56 p-4 elev-2">
```

- [ ] **Step 4: Verify (build, tests, visual)**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Visual: load the lobby (`/?room=polishcheck`) — charcoal card on emerald gradient, gold "Join Game"; open the in-room menu — charcoal popover with gold "Deal".

- [ ] **Step 5: Commit**

```bash
git add src/components/LobbyPanel.tsx src/components/ControlsBar.tsx
git commit -m "feat(999.54): align lobby + controls menu to new felt/charcoal/gold system"
```

---

## Task 8: Full verification + e2e regression + code review

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + unit tests**

Run: `npm run typecheck && npm test`
Expected: both PASS.

- [ ] **Step 2: Run the e2e suite (must stay green)**

Ensure both dev servers are running (`npm run dev` on 1999, `npm run dev:client` on 5173), then:

Run: `npm run test:e2e`
Expected: PASS. If any spec fails, it is almost certainly a selector/visibility regression from Task 4 (hover-reveal) — fix by confirming controls remain in the DOM and focusable, not by loosening the test. Re-run until green.

- [ ] **Step 3: Manual visual pass at three viewports**

In the running app, verify at ~375px (mobile), ~820px (tablet), and ~1280px (desktop):
- Emerald felt gradient on board + canvas; charcoal top bar, rail, hand zone.
- Brass-gold Deal button, count badge (tabular), selection ring; ice-blue last-move pulse fades ~2s and is clearly distinct from selection.
- Zone controls hidden at rest on desktop, fade in on hover/focus; visible and usable on a touch/coarse-pointer emulation.
- Gold-lattice card back at rail size, on a face-down canvas card, and fanned/overlapped (pattern still reads).
- No selection-ring clipping (regression guard for 999.52/999.53).

- [ ] **Step 4: Code review**

Invoke the `code-review` skill (project convention) on the branch diff. Address any correctness findings. Pay attention to: unused old tokens, any `bg-felt`/`#f59e0b`/`#38bdf8` references left behind.

Run (to find leftovers):
`rg -n "bg-felt|#f59e0b|245,158,11|#38bdf8|back\.png" src` → Expected: no matches.

- [ ] **Step 5: Final commit (if review produced fixes)**

```bash
git add -A
git commit -m "chore(999.54): address code review for visual polish"
```

---

## Notes / Risks

- **Touch reveal:** the chosen behavior is "controls always visible on `hover: none` devices." If a stakeholder wants explicit tap-to-toggle instead, that's a follow-up — current approach guarantees controls are never unreachable.
- **Selection-ring clipping (999.52/999.53):** Tasks 2 only changes ring *color*, not the rendering structure that fixed clipping — do not move the ring inside an `overflow:hidden` ancestor.
- **Hover-lift vs drag:** dnd-kit's inline `transform` during drag overrides the CSS `:hover` transform, so the lift won't fight dragging; verify in Step 3 of Task 8.
- **`--card` is chrome, not card faces:** card faces are `<img>` PNGs, unaffected by the `--card` token change.
- **Drop-target affordance (spec §6):** the existing `isOver ? 'border-primary'` styling in `PileZone.tsx:112` and `HandZone.tsx:270` automatically recolors the hovered drop target to brass gold once `--primary` changes in Task 1 — no extra task needed. Per project convention this already uses `isOver` (scoped) not `isDragging` (global); keep it that way. A softer gold *glow* (vs. border) is an optional future enhancement, intentionally not in this plan.
- **Scope discipline:** if a change tempts you toward layout/structure edits, stop — that's out of scope per the spec.
```
