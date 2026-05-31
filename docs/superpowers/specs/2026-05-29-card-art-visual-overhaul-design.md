# Design: Card Art & Visual Overhaul (999.14)

**Date:** 2026-05-29
**Status:** Implemented (PR #50)

## Goal

Replace the CSS fallback card rendering and neutral board with a complete visual theme: illustrated card faces, a tonally consistent card back, a green felt table surface, and readable UI text. The result should feel like a real card table — professional, atmospheric, and immediately readable as a card game, including at small/mobile sizes.

## Non-Goals

- Theme switching UI (acknowledged as future work; architecture supports it without implementing it)
- Custom-illustrated or commissioned card art
- Changes to layout, zones, drag behavior, game logic, server, or shared types

---

## Section 1: Card Faces

**Source:** Jumbo Index Playing Cards by Saul Spatz — **CC0 / public domain**.
- Listing: https://opengameart.org/content/jumbo-index-playing-cards
- Repo: https://github.com/saulspatz/SVGCards

The `Vertical2` variant is used: **two-color** suits (traditional black/red) with a **traditional index** (rank stacked above the suit pip). The jumbo (oversized) corner index is the key property — it stays readable when cards are fanned and overlapped in a hand, including at mobile card sizes. Court cards (J/Q/K) are illustrated figures (Byron Knoll public-domain set).

**Why jumbo index (deviation from the original Bellot plan):** The first implementation used David Bellot's standard-index SVG deck. Its corner indices were too small to read in a fanned hand at mobile sizes, so the deck was swapped for this jumbo-index deck with readability as the deciding requirement.

**Format:** PNG, rasterized from the deck's authoritative sprite sheet. The deck's individual per-card SVGs ship mis-positioned (content lands outside the viewBox and renders blank), and the illustrated court SVGs are very heavy (~1 MB each, ~8 MB total). Rasterizing each card cell from the sprite to a uniform **210×315 PNG** (the deck's native 2:3 cell size) solves both: correct rendering for every card, ~1.2 MB for the whole deck, and instant paint at the 40–60 px display size.

**Assets:** 52 card PNGs + `back.png` committed to `public/cards/jumbo/`. Naming: `{suit}{rank}.png` (e.g. `spadeAce.png`, `heart10.png`, `clubKing.png`).

**Integration:** `CARD_FACE_URL(card)` in `src/card-art.ts` maps internal rank/suit to the filename and returns `${BASE_URL}cards/jumbo/{suit}{rank}.png`. `BASE_URL` (`/virtual-deck/` in production, `/` in tests) is prefixed so assets resolve under GitHub Pages' subpath. `CardFace` already renders an `<img>` when a URL is returned — no component change needed.

**Rank mapping** (internal → filename): `A`→`Ace`, `2`–`10`→`2`–`10`, `J`→`Jack`, `Q`→`Queen`, `K`→`King`.
**Suit mapping** (internal → filename, singular): `spades`→`spade`, `hearts`→`heart`, `diamonds`→`diamond`, `clubs`→`club`.

---

## Section 2: Card Back

**Source:** The same deck's back design — a grayscale floral pattern over a single solid background field.

**Recolor:** The deck's stock back fields are vibrant (`#0000df` blue / `#ff0000` red), which clashed with the muted felt/UI tone. The blue field was recolored to a **muted navy `#1e3a5f`** during rasterization (a one-line color substitution before capturing the back cell from the sprite), keeping the grayscale floral pattern intact. Navy stays distinct from the green felt while fitting the overall tone.

**Asset:** `public/cards/jumbo/back.png` (210×315).

**Integration:** `CARD_BACK_URL` = `${BASE_URL}cards/jumbo/back.png`. `CardBack` already renders an `<img>` when a URL is set.

---

## Section 3: Table Surface

**Approach:** CSS only — no image asset.

**Felt color:** `#2d6a4f` (deep casino green), applied as `bg-felt` on the main board wrapper (`BoardView`) and the canvas play area (`CanvasZone`). The dark top bar (opponent area) and hand zone keep `bg-card`, framing the bright felt center.

**Not pursued from the original plan:** felt-textured noise overlay, recoloring zone borders to a darker green, and swapping the amber drag/hover highlight to green. The flat felt reads clearly as a card table on its own, and the existing amber highlight is legible against it.

---

## Section 4: UI Palette & Text Contrast

**Felt theme tokens** are defined as CSS custom properties in the Tailwind v4 `@theme inline` block in `src/globals.css` (there is no `tailwind.config.js`):

```css
--color-felt: #2d6a4f;        /* applied via bg-felt */
--color-felt-dark: #1b4332;   /* reserved for future theming */
--color-felt-highlight: #52b788; /* reserved for future theming */
--color-panel-bg: rgba(15, 30, 20, 0.92); /* reserved for future theming */
```

Only `--color-felt` is currently applied; the others are reserved tokens that establish the palette for future theme work without committing UI changes now.

**Text contrast fix:** Player names, pile labels, and ghost-button icons use `--muted-foreground`, which at `hsl(220 9% 46%)` was hard to read on the felt. Raised to `hsl(220 14% 72%)`. Disabled button opacity raised `50%`→`60%` so disabled controls stay legible. The existing cool-gray foreground palette and the lobby's `bg-card` treatment were kept (the original "warm off-white" palette and lobby recolor were not pursued).

---

## Section 5: Card Sizing

The deck art is 2:3 (`210×315`, ratio ≈ 0.667). Card slots are sized to match exactly so `object-contain` shows the full card with no crop and no background slivers:

- Mobile (`<640px`): `40×60`
- Desktop (`sm:`): `60×90`

These are applied in `CardFace`, `CardBack`, `HandZone`, and `OpponentHand`, and mirrored in the canvas geometry constants (`CARD_W`/`CARD_H` and `getCardDimensions` in `src/lib/canvas-utils.ts`) that drive drag/collision math. Images use `object-contain` (no `rounded-md` on the `<img>` — the art carries its own corners).

---

## Section 6: Asset Organization

```
public/
  cards/
    jumbo/
      spadeAce.png
      heart10.png
      ...
      clubKing.png
      back.png
```

The `jumbo/` subdirectory anticipates future theme packs (`minimal/`, `dark/`, etc.) without building any theme infrastructure now. A future `CARD_FACE_URL` points at the active theme's subdirectory.

---

## Section 7: Future-Proofing (No Scope Added Now)

When theme selection is added later:
- `card-art.ts` becomes theme-aware: the `DECK` constant (and the felt CSS tokens) drive the active theme.
- Reserved felt tokens (`--color-felt-dark`, `--color-felt-highlight`, `--color-panel-bg`) and a theme class on `<html>`/`<body>` can override the palette.
- No component changes required — `CardFace`, `CardBack`, and all board components are already abstracted behind `card-art.ts` and the `bg-felt` token.

---

## Files Changed

| File | Change |
|------|--------|
| `public/cards/jumbo/*.png` | 52 card face PNGs + navy `back.png` (rasterized from the jumbo-index sprite) |
| `src/card-art.ts` | `CARD_FACE_URL`/`CARD_BACK_URL` map to `jumbo/` PNG paths, `BASE_URL`-prefixed |
| `src/globals.css` | Felt theme tokens in `@theme inline`; raised `--muted-foreground` contrast |
| `src/components/BoardView.tsx`, `CanvasZone.tsx` | `bg-background` → `bg-felt` on the play surface |
| `src/components/CardFace.tsx`, `CardBack.tsx`, `HandZone.tsx`, `OpponentHand.tsx` | Card slot sizing `40×60` / `60×90`; `object-contain` |
| `src/components/ui/button.tsx` | Disabled opacity `50%` → `60%` |
| `src/lib/canvas-utils.ts` | `CARD_W=60`, `CARD_H=90`, mobile `40×60` |
| `tests/card-art.test.ts`, `tests/overlapUtils.test.ts` | Updated for jumbo paths and new card dimensions |
| `playwright/game.spec.ts`, `mobile.spec.ts` | Hand-zone assertions use `[aria-pressed]` count (img cards have no text) |
