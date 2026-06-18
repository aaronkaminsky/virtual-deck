# 999.54 — Visual Polish (Modern, Clean, Professional)

**Status:** Design approved, pending spec review
**Date:** 2026-06-18
**Backlog item:** 999.54 — "Additional visual polish, investigate improvements to make the look more modern, clean, and professional. Perhaps a different highlighting treatment, or maybe the small buttons near each zone can instead be invisible and only appear on hover (or focus)."

## Goal

Elevate Virtual Deck from a functional card table to a polished, professional-looking
product, without changing any game behavior, layout structure, or networking. This is a
**presentation-layer pass**: design tokens, component styling, one new card-back asset, and
subtle motion. No server, state model, or game-logic changes.

## Design Direction

**Clean Emerald surface + neutral charcoal chrome + warm gold accent + gold-lattice card back.**

Mental model: **the felt is the table; the rail, top bar, and menus are a modern neutral "app
frame" around it.** Green lives only where cards live; all surrounding chrome is calm charcoal.
This separation is the core move that reads as "professional" rather than "themed casino app."

This direction was chosen interactively from mockups: a hybrid of a refined-felt direction
(kept its green color) and a modern-neutral SaaS direction (kept its clean, flat chrome and
crisp shadows).

## Decisions (locked during brainstorming)

| Decision | Choice |
|----------|--------|
| Overall aesthetic | Clean Emerald (vivid green play surface, neutral charcoal rail, flat/crisp) |
| Accent color | Warm gold `#e6b84e` (softer/less saturated than current orange-gold) |
| Per-zone controls | Hover/focus reveal, with tap-to-reveal touch fallback |
| Card back | Gold lattice (cross-hatch) on charcoal — edge-to-edge pattern, survives overlap |
| Selection highlight | Solid gold ring, persistent while selected |
| Last-move highlight | Transient **ice-blue** pulse, fades ~2s — deliberately NOT gold |

## Scope

### In scope
1. **Color system** — refined CSS custom properties in `src/globals.css`.
2. **Depth/elevation** — a consistent shadow scale applied across cards, piles, panels, popovers.
3. **Typography** — a small, consistent type system (labels, headings, tabular numerals).
4. **Per-zone controls** — hover/focus-reveal behavior for the small zone action buttons.
5. **Selection vs last-move highlight** — distinct treatments (gold ring vs ice-blue pulse).
6. **Drop-target affordance** — soft gold inner glow on the hovered zone (`isOver`).
7. **Motion/micro-interactions** — card hover lift, button states, smooth transitions, all
   gated by `prefers-reduced-motion`.
8. **Lobby & controls menu** — apply the same system to the join screen and menu.
9. **Card-back asset** — generate a new gold-lattice-on-charcoal `back.png` (+ @2x) to replace
   the red one.

### Out of scope (explicitly)
- **Card face art.** Faces are fixed PNGs from the `jumbo` deck (see `src/card-art.ts`). We
  polish only the card *container* (radius, shadow, hover, ring), never the printed pips. A
  separate card-art overhaul already shipped (`2026-05-29-card-art-visual-overhaul-design.md`).
- **Layout / structure changes.** No moving zones, no new panels, no responsive re-architecture.
- **Game logic, server (`server.ts`), state model, networking, undo.** Untouched.
- **New features** (themes menu, customization popup, etc. — those are separate backlog items
  999.47/999.48).

## Detailed Design

### Color tokens (`src/globals.css`)

Current `:root` / `.dark` blocks use a green-tinted palette for everything (background, card,
sidebar all in the `hsl(160 …)` family). The change introduces a **neutral charcoal chrome
family** distinct from the **emerald felt family**, plus a retuned gold.

- **Play surface (felt):** replace flat `hsl(160 38% 16%)` background with an emerald gradient
  (approx `#1f5d46 → #173f30`), plus a faint inner vignette for depth.
- **Chrome surfaces (new, neutral):**
  - Rail / sidebar: `#161b22`
  - Top bar: `#11151b`
  - Popover / menu: `#0f1318`
- **Accent (`--primary`):** retune from the current orange-ish gold (`hsl(38 92% 50%)`) to the
  softer brass `#e6b84e`. Update `--ring`, `--sidebar-primary`, etc. to match.
- **Borders/dividers:** hairline `rgba(255,255,255,.06–.10)` replacing solid green borders.
- **Ice-blue (new token):** for the last-move highlight, e.g. `#9ad0ec` / glow
  `rgba(154,208,236,.x)`. Distinct from both gold and the existing cyan.

Existing token *names* (`--background`, `--card`, `--sidebar`, `--primary`, `--ring`, …) are
preserved so consumers don't break; only their *values* change, plus a few additive tokens.

### Depth & elevation

Define a shadow scale (as tokens or utility classes) and apply consistently:
- Resting card on canvas: low, tight shadow.
- **Dragged card:** lifts higher — larger, softer shadow + slight scale — for a tactile pickup.
- Piles: subtle stacked-edge shadow implying thickness.
- Panels/popovers/menu: defined elevation shadow.
- Chrome surfaces: 1px top inner-highlight (`inset 0 1px 0 rgba(255,255,255,.04)`).

### Typography

- Zone labels ("Draw", "Discard", player name labels): uppercase, ~11px, letter-spacing `.05em`,
  muted foreground.
- Headings (lobby title, menu section titles): tighter tracking, weight 700.
- Counts/badges: `font-variant-numeric: tabular-nums`.
- Consolidate secondary text onto one muted-foreground value.

### Per-zone controls (hover/focus reveal)

The small action icons near each zone (hide/reveal, shuffle, select-all, sort) currently render
always-visible, creating clutter (see `CanvasControls.tsx`, `ControlsBar.tsx`, `PileZone.tsx`,
`HandZone.tsx`, `SpreadZone.tsx` — implementer to confirm exact owners).

- Icons remain **always in the DOM** (no layout shift, focus order and a11y preserved).
- Hidden at rest via `opacity: 0; pointer-events: none`.
- Revealed (`opacity: 1; pointer-events: auto`) on:
  - zone hover (`:hover` / `:focus-within` on the zone container), and
  - keyboard focus of any control within the zone.
- **Touch fallback:** on touch/coarse-pointer devices, tapping the zone reveals the controls
  (they should not be permanently unreachable). Implementer to choose the simplest reliable
  mechanism (e.g. `@media (hover: none)` → controls always visible, OR a tap-to-reveal toggle).
  Default acceptable behavior: on `hover: none`, show controls persistently.
- Transition: `opacity` ~150ms.

### Selection vs last-move highlight

- **Selection:** solid gold ring (`outline`/`box-shadow` in gold), persistent while the card is
  selected. Must respect the existing selection-ring clipping fix (999.52/999.53) — do not
  reintroduce clipping; keep ring rendering outside any `overflow:hidden` ancestor as currently
  handled.
- **Last move:** replace the current cyan pulse (`last-move-pulse` / `.last-move-highlight` in
  `globals.css`, currently `#38bdf8`, 8s) with an **ice-blue** transient pulse that fades over
  ~2s. Keep it a soft glow (not a crisp ring) so shape *and* hue differ from selection. Keep the
  `prefers-reduced-motion` fallback (static subtle ring, no animation).
- **Drop target (`isOver`):** soft gold inner glow on the specific hovered zone only — use
  `isOver` from `useDroppable`, never global `isDragging` (per project convention).

### Motion & micro-interactions

- Canvas card hover: ~2px lift + shadow grow, 150ms.
- Buttons/icons: hover background tint; slight scale-down on `:active`.
- Reveals, badges, drop-target glow: 150–200ms transitions.
- Everything gated behind `@media (prefers-reduced-motion: reduce)`.

### Lobby & controls menu

Apply the system: charcoal card on emerald background, refined gold primary buttons
("Join Game", "Deal", "Copy link"), tightened type/spacing, consistent borders. No structural
changes to `LobbyPanel.tsx` or the menu.

### Card-back asset

- Produce `back.png` (and `back@2x.png` if the deck uses retina variants) as a gold cross-hatch
  lattice on charcoal `#1a2027`, with a thin inset gold border. Edge-to-edge pattern (no
  center-dependent motif) so it reads when cards overlap/fan and at small sizes.
- Replace the existing red back referenced via `CARD_BACK_URL` in `src/card-art.ts`
  (`public/cards/jumbo/back.png` or equivalent path — implementer to confirm).
- This is the one task requiring image generation rather than CSS.

## Testing & Verification

- **Existing E2E suite must stay green.** Preserve all selectors used by Playwright
  (`data-card-id`, `aria-pressed`, zone roles/labels). The hover-reveal controls must remain in
  the DOM and keyboard-focusable so existing interaction tests still find them.
- `npm run typecheck` and `npm test` pass (pre-commit hooks enforce).
- Manual visual verification via the running stack at small/medium/large viewports: felt,
  rail, piles, selection ring, last-move pulse, hover-reveal on desktop, controls reachable on
  touch, card back at multiple sizes and fanned.
- Run the `code-review` skill after implementation (project convention).

## Risks / Notes

- **Hover-reveal on touch** is the trickiest interaction detail — verify controls are reachable
  on coarse-pointer devices before sign-off.
- **Selection-ring clipping** regression risk — the prior fix (999.52/999.53) must not be undone
  by new shadow/ring styling.
- **Asset path** for the card back must be confirmed against the actual `public/` layout.
- Keep changes concentrated in `globals.css` + component `className`s; avoid touching game/state
  files to keep risk low and review focused.
