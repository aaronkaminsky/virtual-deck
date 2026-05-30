# Design: Card Art & Visual Overhaul (999.14)

**Date:** 2026-05-29
**Status:** Approved

## Goal

Replace the CSS fallback card rendering and neutral board with a complete visual theme: illustrated card faces (David Bellot's SVG deck), an ornate card back, green felt table surface, and a tonally consistent UI palette. The result should feel like a real card table — professional, atmospheric, and immediately readable as a card game.

## Non-Goals

- Theme switching UI (acknowledged as future work; architecture supports it without implementing it)
- Custom-illustrated or commissioned card art
- Changes to card sizes, layout, zones, drag behavior, game logic, server, or shared types

---

## Section 1: Card Faces

**Source:** David Bellot's SVG Playing Cards (LGPL license)
Repository: https://github.com/htdebeer/SVGCards (or the canonical upstream at https://totalnonsense.com/open-source-vector-playing-cards/)

**Assets:** 52 SVG files committed to `public/cards/bellot/`. Bellot's naming convention uses rank + suit initial (e.g., `1S.svg` = Ace of Spades, `KH.svg` = King of Hearts). The integration layer maps Virtual Deck's internal rank/suit values to these filenames.

**Integration:** `CARD_FACE_URL(card)` in `src/card-art.ts` returns `/cards/bellot/{rank}{suit}.svg`. The `CardFace` component already renders an `<img>` when a URL is returned — no component changes needed.

**Rank mapping** (internal → filename prefix):
- `A` → `1`
- `2`–`10` → `2`–`10`
- `J` → `J` (or `jack` — confirm against Bellot's actual filenames)
- `Q` → `Q`
- `K` → `K`

**Suit mapping** (internal → filename suffix):
- `spades` → `S`
- `hearts` → `H`
- `diamonds` → `D`
- `clubs` → `C`

Confirm exact filenames by inspecting the downloaded assets before writing the mapping.

---

## Section 2: Card Back

**Source:** A public-domain ornate Victorian card back SVG that matches the period feel of Bellot's illustrated courts. Candidate sources: Wikimedia Commons public domain card back illustrations, or a compatible open-source SVG back that ships alongside a Bellot-compatible deck.

**Asset:** A single file committed as `public/cards/bellot/back.svg`.

**Integration:** `CARD_BACK_URL` in `src/card-art.ts` is set to `/cards/bellot/back.svg`. `CardBack` already renders an `<img>` when a URL is set — no component changes needed.

**Selection criterion:** The back should feel visually cohesive with Bellot's court card style. Avoid backs that feel out of period (modern geometric, flat/minimal). If no suitable open-source back is found, a refined CSS pattern (the current approach, improved) is the fallback.

---

## Section 3: Table Surface

**Approach:** CSS only — no image asset needed.

**Felt color:** `#2d6a4f` (deep casino green). Applied as the board background.

**Texture:** A very subtle CSS noise overlay using a repeating SVG data URI or `backdrop-filter` to suggest fabric without a bitmap asset. If this adds complexity, a flat solid color is acceptable — the green alone reads clearly as felt.

**Zone outlines:** `#1b4332` (darker green border). Zones feel carved into the surface rather than floating on it.

**Drag/hover states:** Replace current blue highlight with a lighter green glow (`#52b788` at low opacity) so interactions stay within the palette.

---

## Section 4: UI Palette

All theme colors are defined as **CSS custom properties** on `:root`. Components reference variables, not hardcoded hex values. This is what makes future theme switching a single class swap rather than a component sweep.

```css
:root {
  --color-felt: #2d6a4f;
  --color-felt-dark: #1b4332;
  --color-felt-highlight: #52b788;
  --color-panel-bg: rgba(15, 30, 20, 0.92);
  --color-panel-border: rgba(82, 183, 136, 0.2);
  --color-text-primary: #f0ebe0;
  --color-text-secondary: #b7c4be;
  --color-accent: #40916c;
}
```

**Board background:** `var(--color-felt)`
**Control panels / overlays:** `var(--color-panel-bg)` — dark semi-transparent so the felt shows through subtly
**Text on dark surfaces:** `var(--color-text-primary)` — warm off-white, slightly warmer than pure white
**Primary buttons:** `var(--color-accent)` — muted warm green
**Lobby screen:** Same palette — dark green background, warm off-white type — so the app feels cohesive from entry to table

---

## Section 5: Asset Organization

```
public/
  cards/
    bellot/
      1S.svg   ← Ace of Spades
      2S.svg
      ...
      KH.svg   ← King of Hearts
      back.svg
```

The `bellot/` subdirectory anticipates future theme packs (`minimal/`, `dark/`, etc.) without creating any theme infrastructure now. Future `CARD_FACE_URL` implementations point at their own subdirectory.

---

## Section 6: Future-Proofing (No Scope Added Now)

When theme selection is added later:
- `card-art.ts` becomes theme-aware: returns URLs from the active theme's subdirectory
- CSS variables are overridden by a theme class on `<html>` or `<body>`
- No component changes required — `CardFace`, `CardBack`, and all board components are already abstracted

Nothing in this spec needs to change when that work happens.

---

## Files Changed

| File | Change |
|------|--------|
| `public/cards/bellot/*.svg` | 52 card face SVGs + `back.svg` (new assets) |
| `src/card-art.ts` | Implement `CARD_FACE_URL` and `CARD_BACK_URL` with `bellot/` paths |
| `src/globals.css` | Add CSS custom property definitions; apply felt background to board |
| `tailwind.config.js` | Extend theme with felt palette colors mapped to CSS variables (e.g., `felt: 'var(--color-felt)'`) so Tailwind utilities like `bg-felt` work |
| Board/layout component(s) | Apply `bg-felt` (or `var(--color-felt)`) class; update zone border colors |
| Lobby component(s) | Apply consistent dark-green palette |
| `.gitignore` | Verify `public/cards/` is not excluded |
