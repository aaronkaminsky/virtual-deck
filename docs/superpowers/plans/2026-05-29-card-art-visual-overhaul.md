# Card Art & Visual Overhaul (999.14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CSS fallback card rendering and neutral board with illustrated Bellot card art, a green felt table surface, and a tonally consistent UI palette.

**Architecture:** Bellot SVG files live in `public/cards/bellot/` (no build step — Vite serves them directly). `src/card-art.ts` maps rank+suit to filenames. CSS custom properties in `globals.css` define the felt palette; Tailwind `@theme inline` exposes them as utilities. `BoardView` and `CanvasZone` switch from `bg-background` to `bg-felt`.

**Tech Stack:** Vite (static asset serving), Tailwind v4 (`@theme inline`), David Bellot SVG Playing Cards (LGPL via htdebeer/SVGCards), Vitest

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `public/cards/bellot/*.svg` | Create | 52 card face SVGs + `back.svg` |
| `src/card-art.ts` | Modify | Implement `CARD_FACE_URL` rank/suit mapping, set `CARD_BACK_URL` |
| `tests/card-art.test.ts` | Modify | Add specific path assertions and card mapping tests |
| `src/globals.css` | Modify | Add felt color vars to `@theme inline` and `:root` |
| `src/components/BoardView.tsx` | Modify | `bg-background` → `bg-felt` on main wrapper |
| `src/components/CanvasZone.tsx` | Modify | `bg-background` → `bg-felt` on canvas area |

---

## Task 1: Acquire Bellot SVG Card Faces and Back

**Files:**
- Create: `public/cards/bellot/` (directory + 53 SVG files)

The htdebeer/SVGCards repo is a cleaned-up version of David Bellot's original SVG deck (LGPL licensed). The SVGs render correctly in `<img>` tags — they use embedded paths and styles with no external resource references.

- [ ] **Step 1: Create asset directory and clone SVGCards repo**

```bash
mkdir -p public/cards/bellot
git clone --depth=1 https://github.com/htdebeer/SVGCards /tmp/svgcards
```

Expected: `/tmp/svgcards` directory exists with the repo contents.

- [ ] **Step 2: Inspect actual filenames to confirm naming convention**

```bash
ls /tmp/svgcards/svg/ | head -20
```

Expected output should show filenames like `1_of_clubs.svg`, `jack_of_spades.svg`, `red_back.svg`. Confirm the rank prefix for Ace (should be `1`), Jack (should be `jack`), and the back filename. **If the naming differs from this pattern, adjust Task 2's card-art.ts code to match before writing the mapping.**

- [ ] **Step 3: Copy card face SVGs**

```bash
cp /tmp/svgcards/svg/*.svg public/cards/bellot/
```

- [ ] **Step 4: Verify exactly 52 face cards and at least one back are present**

```bash
ls public/cards/bellot/ | wc -l
ls public/cards/bellot/ | grep back
```

Expected: at least 53 files total; `red_back.svg` (or similar) present.

- [ ] **Step 5: Set the back file to the canonical name the plan expects**

The plan uses `back.svg`. If the downloaded file is `red_back.svg` or `blue_back.svg`, copy it:

```bash
cp public/cards/bellot/red_back.svg public/cards/bellot/back.svg
```

- [ ] **Step 6: Clean up temp clone**

```bash
rm -rf /tmp/svgcards
```

- [ ] **Step 7: Commit assets**

```bash
git add public/cards/bellot/
git commit -m "feat: add Bellot SVG card faces and back (LGPL)"
```

---

## Task 2: Implement card-art.ts (TDD)

**Files:**
- Modify: `tests/card-art.test.ts`
- Modify: `src/card-art.ts`

**Background:** `src/card-art.ts` currently exports stubs (`CARD_BACK_URL = ''` and `CARD_FACE_URL` returning `''`). The existing test file at `tests/card-art.test.ts` has three passing tests that only check types. This task adds specific path assertions and implements the real mapping.

Internal `Rank` values: `"A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K"`
Internal `Suit` values: `"spades" | "hearts" | "diamonds" | "clubs"`

Bellot filename convention: `{rank}_of_{suit}.svg` where rank maps as: A→1, J→jack, Q→queen, K→king, 2–10→2–10; suit maps as-is (spades, hearts, diamonds, clubs).

- [ ] **Step 1: Add failing tests to `tests/card-art.test.ts`**

Replace the entire file content:

```typescript
import { describe, it, expect } from 'vitest';
import { CARD_BACK_URL, CARD_FACE_URL } from '../src/card-art';
import type { Card } from '../src/shared/types';

describe('card-art (DECK-03)', () => {
  it('exports CARD_BACK_URL as a string', () => {
    expect(typeof CARD_BACK_URL).toBe('string');
  });

  it('CARD_BACK_URL points to bellot back', () => {
    expect(CARD_BACK_URL).toBe('/cards/bellot/back.svg');
  });

  it('exports CARD_FACE_URL as a function', () => {
    expect(typeof CARD_FACE_URL).toBe('function');
  });

  it('maps Ace of Spades', () => {
    const card: Card = { id: 'A-s', suit: 'spades', rank: 'A', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/1_of_spades.svg');
  });

  it('maps 10 of Hearts', () => {
    const card: Card = { id: '10-h', suit: 'hearts', rank: '10', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/10_of_hearts.svg');
  });

  it('maps Jack of Diamonds', () => {
    const card: Card = { id: 'J-d', suit: 'diamonds', rank: 'J', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/jack_of_diamonds.svg');
  });

  it('maps Queen of Clubs', () => {
    const card: Card = { id: 'Q-c', suit: 'clubs', rank: 'Q', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/queen_of_clubs.svg');
  });

  it('maps King of Hearts', () => {
    const card: Card = { id: 'K-h', suit: 'hearts', rank: 'K', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/king_of_hearts.svg');
  });

  it('maps 2 of Spades', () => {
    const card: Card = { id: '2-s', suit: 'spades', rank: '2', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/bellot/2_of_spades.svg');
  });
});
```

- [ ] **Step 2: Run tests — confirm new ones fail**

```bash
npm test -- tests/card-art.test.ts
```

Expected: The 6 new mapping tests FAIL with values like `''` or `undefined`. The 2 pre-existing type tests still pass.

- [ ] **Step 3: Implement `src/card-art.ts`**

```typescript
import type { Card, Rank, Suit } from './shared/types';

export const CARD_BACK_URL: string = '/cards/bellot/back.svg';

const RANK_MAP: Record<Rank, string> = {
  A: '1',
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'jack', Q: 'queen', K: 'king',
};

const SUIT_MAP: Record<Suit, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
};

export function CARD_FACE_URL(card: Card): string {
  return `/cards/bellot/${RANK_MAP[card.rank]}_of_${SUIT_MAP[card.suit]}.svg`;
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npm test -- tests/card-art.test.ts
```

Expected: 9/9 tests pass.

- [ ] **Step 5: Run full test suite and typecheck**

```bash
npm test && npm run typecheck
```

Expected: all 254+ tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/card-art.ts tests/card-art.test.ts
git commit -m "feat: implement Bellot card art mapping in card-art.ts"
```

---

## Task 3: Add Felt CSS Custom Properties

**Files:**
- Modify: `src/globals.css`

**Background:** This project uses Tailwind v4 with an `@theme inline` block in `globals.css` — there is no `tailwind.config.js`. Adding color variables to `@theme inline` generates utility classes (`bg-felt`, `border-felt-dark`, etc.). The `--background` variable currently resolves to a very dark green; the felt color is a lighter, more saturated green that reads clearly as a card table surface.

- [ ] **Step 1: Add felt variables to the `@theme inline` block**

In `src/globals.css`, locate the `@theme inline {` block and add these lines at the end of the block (before the closing `}`):

```css
    --color-felt: #2d6a4f;
    --color-felt-dark: #1b4332;
    --color-felt-highlight: #52b788;
    --color-panel-bg: rgba(15, 30, 20, 0.92);
```

The result inside `@theme inline` should end with:

```css
    --radius-4xl: calc(var(--radius) * 2.6);
    --color-felt: #2d6a4f;
    --color-felt-dark: #1b4332;
    --color-felt-highlight: #52b788;
    --color-panel-bg: rgba(15, 30, 20, 0.92);
}
```

- [ ] **Step 2: Run typecheck to confirm no CSS syntax errors surface**

```bash
npm run typecheck
```

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/globals.css
git commit -m "feat: add felt palette CSS custom properties"
```

---

## Task 4: Apply Felt to the Board

**Files:**
- Modify: `src/components/BoardView.tsx`
- Modify: `src/components/CanvasZone.tsx`

**Background:** The main board wrapper and the canvas play area both use `bg-background` (very dark green). Changing these to `bg-felt` makes the play surface the lighter, recognizable felt green while preserving the dark `bg-card` top bar (opponent hands area) and the dark `bg-card` hand zone — creating a natural visual hierarchy: dark panels frame a bright felt center.

- [ ] **Step 1: Update `BoardView.tsx` main wrapper class**

In `src/components/BoardView.tsx`, line 43, change:

```tsx
    <div className="h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col bg-background">
```

to:

```tsx
    <div className="h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col bg-felt">
```

- [ ] **Step 2: Update `CanvasZone.tsx` background class**

In `src/components/CanvasZone.tsx`, find the className string that includes `bg-background` and change it to `bg-felt`. The line will look like:

```tsx
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-background',
```

Change to:

```tsx
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-felt',
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass (these are visual changes; no unit tests cover class names here).

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardView.tsx src/components/CanvasZone.tsx
git commit -m "feat: apply felt green to board and canvas zone"
```

---

## Task 5: Smoke Test — Verify Cards Render in Browser

**Background:** Bellot SVGs use embedded path data. They should render cleanly in `<img>` tags without external resource issues. This task confirms that before closing the feature.

- [ ] **Step 1: Start both dev servers (two terminals)**

Terminal 1:
```bash
npm run dev
```
Expected: PartyKit server starts on port 1999.

Terminal 2:
```bash
npm run dev:client
```
Expected: Vite server starts, URL shown (typically `http://localhost:5173`).

- [ ] **Step 2: Open the app and create/join a room**

Navigate to the Vite URL. Create a room. In a second browser window/tab (or incognito), join the same room with the room code.

- [ ] **Step 3: Deal cards to yourself and verify**

Use the controls menu to deal cards to your hand. Verify:
- [ ] Card faces show illustrated art (not text fallback)
- [ ] Card backs show the ornate back image (not the CSS crosshatch)
- [ ] Cards are the correct size and render crisply (no blurry edges, no broken image icons)
- [ ] Red suits (hearts, diamonds) show red; black suits (spades, clubs) show black
- [ ] Court cards (J, Q, K) show illustrated figures

- [ ] **Step 4: Verify the board surface**

- [ ] Main play area is felt green (`#2d6a4f`)
- [ ] Top bar (opponent area) remains dark (unchanged — `bg-card`)
- [ ] Hand zone at the bottom remains dark (unchanged — `bg-card`)
- [ ] Zone borders are visible against the felt
- [ ] Drag-to-pile shows amber `border-primary` highlight on hover (unchanged, looks good on green)

- [ ] **Step 5: Check for console errors**

Open browser DevTools console. Verify:
- No 404 errors for card SVG files
- No SVG rendering warnings

If any SVGs 404: check the filename mapping in `card-art.ts` against the actual files in `public/cards/bellot/`. A single `ls public/cards/bellot/ | grep jack` will show whether the jack files use `jack_of_` or another prefix.

---

## Task 6: Push and Open PR

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin docs/999.14-card-art-design
```

The pre-push hook runs e2e tests if both dev servers are running. If servers are down, it prints a reminder. Either run the servers and retry, or note that e2e should be run manually before merging.

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --title "feat: card art & visual overhaul (999.14)" \
  --body "$(cat <<'EOF'
## Summary
- Adds David Bellot SVG Playing Cards (LGPL) as illustrated card faces and ornate back
- Applies green felt (#2d6a4f) to board and canvas zone via CSS custom properties
- Introduces felt palette variables (--color-felt, --color-felt-dark, --color-felt-highlight) in @theme inline for future theme switching

## Test plan
- [ ] Deal cards in a two-player session: verify illustrated art renders, no 404s in console
- [ ] Card backs show ornate back image (not CSS crosshatch)
- [ ] Board surface is felt green; top bar and hand zone remain dark
- [ ] Drag-to-pile hover highlight still visible (amber on green)
- [ ] All Vitest unit tests pass
- [ ] TypeScript check passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 (Card Faces): Task 1 acquires assets, Task 2 implements mapping
- ✅ Section 2 (Card Back): Task 1 acquires `back.svg`, Task 2 sets `CARD_BACK_URL`
- ✅ Section 3 (Table Surface): Task 3 adds CSS vars, Task 4 applies `bg-felt`
- ✅ Section 4 (UI Palette): Task 3 defines all spec'd variables; lobby uses `bg-card` which is already dark green (no change needed — the existing theme already matches)
- ✅ Section 5 (Asset Organization): `public/cards/bellot/` structure established in Task 1
- ✅ Section 6 (Future-Proofing): CSS vars and `bellot/` subdirectory are the only two changes needed; no further action required

**Lobby note:** `LobbyPanel` uses `bg-card` (dark green, `hsl(160 38% 10%)`) and `--primary` (amber/gold) — already consistent with the felt palette. No changes needed.

**Placeholder scan:** None found.

**Type consistency:** `Rank` and `Suit` types from `src/shared/types.ts` used correctly in `RANK_MAP` and `SUIT_MAP` in Task 2.
