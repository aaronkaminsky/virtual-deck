---
phase: 19-npm-audit
reviewed: 2026-05-08T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - playwright/responsive.spec.ts
  - src/components/BoardView.tsx
  - src/components/CardBack.tsx
  - src/components/CardFace.tsx
  - src/components/HandZone.tsx
  - src/components/OpponentHand.tsx
  - src/components/PileZone.tsx
  - src/components/SpreadZone.tsx
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-05-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Eight files reviewed covering the Phase 19 responsive layout/UX polish work: one Playwright end-to-end test and seven React components (CardBack, CardFace, BoardView, HandZone, OpponentHand, PileZone, SpreadZone).

The responsive layout approach is structurally sound — `overflow-x-hidden` on root, `w-screen`, and responsive card sizing via Tailwind are in place. Two logic bugs exist that silently corrupt state in reorder operations and pile-face toggling. The Playwright test has an assertion that allows layout-collapse failures to pass undetected. Three additional structural warnings cover fragile coupling, an unsafe `stopPropagation`, and a visual overflow risk at system font scale.

---

## Critical Issues

### CR-01: REORDER_PILE_SPREAD action is silently rejected when spread pile contains any face-down card

**File:** `src/components/SpreadZone.tsx:57,75-76`

**Issue:** `faceUpCards` filters pile cards to only those where `'id' in c` (i.e., not masked):

```ts
const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);
```

When the `REORDER_PILE_SPREAD` action is dispatched, it sends only the face-up card IDs. The server handler at `party/index.ts:324` validates:

```ts
action.orderedCardIds.length !== spreadPile.cards.length
```

A spread pile can contain face-down cards — `FLIP_CARD` works on any pile without a region check (`party/index.ts:353`), so individual cards in a spread pile can be flipped face-down. When that happens, the server state has N cards but the client sends fewer IDs. The server rejects the action with `INVALID_REORDER` and the reorder silently fails.

Additionally, the server's masking function (`party/index.ts:71-74`) masks non-top face-down cards in ALL piles including spread piles, so the client may never even receive the full card list needed to construct a valid reorder payload.

**Fix:** The `REORDER_PILE_SPREAD` action payload must include all card IDs in their new order, including face-down cards. Replace:

```ts
const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);
// ... send only faceUpCards IDs
```

With a strategy that collects IDs from all cards, using a stable placeholder for masked cards, and reorders only the face-up positions among them. Alternatively, gate the reorder action behind a check that no masked cards exist:

```ts
const hasMaskedCards = pile.cards.some(c => !('id' in c));
if (hasMaskedCards) return; // cannot safely reorder a pile with masked cards
```

---

### CR-02: `!pile.faceUp` toggle treats `undefined` as face-down, disagreeing with the display convention

**File:** `src/components/PileZone.tsx:29`
**File:** `src/components/SpreadZone.tsx:83`

**Issue:** Both toggle handlers send `faceUp: !pile.faceUp`. `ClientPile.faceUp` is typed `boolean | undefined`. When `pile.faceUp === undefined`, `!undefined` evaluates to `true`, so the first click sets `faceUp: true`. But the display label at PileZone line 81 and SpreadZone line 132 uses `pile.faceUp !== false` (treating `undefined` as face-up). The label reads "Face up" but the toggle action treats `undefined` as face-down — they are using opposite truth conventions for the same field. The behavior is accidentally correct on the first click (both result in `true`) but will diverge if the server returns `pile.faceUp = undefined` after the toggle, and is confusing to read and maintain.

**Fix:** Align the toggle with the display convention:

```ts
function handleToggleFace() {
  const currentlyFaceUp = pile.faceUp !== false; // undefined → face-up (matches label)
  sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !currentlyFaceUp });
}
```

Apply in both `PileZone.tsx:28-30` and `SpreadZone.tsx:82-84`.

---

## Warnings

### WR-01: Responsive test assertion allows layout-collapse narrower than viewport to pass

**File:** `playwright/responsive.spec.ts:21`

**Issue:** The test asserts `expect(clientWidth).toBeLessThanOrEqual(375)`. This passes if `clientWidth` is, e.g., 200 — meaning a layout that collapses narrower than the viewport (clipping content) would pass the test. The test was designed to catch horizontal overflow but does not catch the complementary failure: the layout compressing below the viewport width.

**Fix:** Add a lower-bound assertion:

```ts
expect(clientWidth).toBeGreaterThanOrEqual(370); // allow for browser rounding
expect(clientWidth).toBeLessThanOrEqual(375);
expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
```

---

### WR-02: `communalZone` is hardcoded to `'play'` while all other zone IDs are data-driven

**File:** `src/components/BoardView.tsx:26`

**Issue:**

```ts
const communalZone = spreadPiles.find(p => p.id === 'play');
```

`myPlayZoneId` and opponent spread IDs (`spread-${id}`) arrive from the server. The communal zone ID is hardcoded. The server already migrated this pile once (from `spread-communal` to `play` — `party/index.ts:119-127`). If the ID changes again, the communal zone silently disappears from the UI with no warning, type error, or log.

**Fix:** Extract the constant to a shared location or add it to `ClientGameState`. At minimum, define a named constant co-located with the server initialization:

```ts
// Must match party/index.ts pile id "play"
const COMMUNAL_ZONE_ID = 'play' as const;
const communalZone = spreadPiles.find(p => p.id === COMMUNAL_ZONE_ID);
```

---

### WR-03: `onPointerDown stopPropagation` on outer wrapper may silently break drag initiation

**File:** `src/components/HandZone.tsx:41`

**Issue:** The outer wrapper of `SortableHandCard` calls `e.stopPropagation()` on every `pointerdown` event. The `useSortable` listeners are bound to the inner ref div (line 47). Stopping propagation on the outer wrapper before the event reaches dnd-kit's sensor can prevent drag activation — particularly if `PointerSensor` uses event delegation or if an `activationConstraint` depends on the event sequence. This produces no error; dragging simply stops working.

**Fix:** Move the `stopPropagation` to the click handler only, since the apparent intent is to prevent selection-click from bubbling to the board:

```tsx
<div
  className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', ...)}
  onClick={(e) => { e.stopPropagation(); onToggleSelect(card.id); }}
>
```

---

### WR-04: `OpponentHand` droppable data uses `toZone: 'opponent-hand'` with no type contract

**File:** `src/components/OpponentHand.tsx:20`

**Issue:** `data: { toZone: 'opponent-hand' as const, toId: playerId }` sets a zone string that is outside the `ClientAction` type union (`MOVE_CARD` accepts only `"hand" | "pile"`). This works at runtime because `BoardDragLayer.tsx:149` string-matches `'opponent-hand'` and routes to `PASS_CARD`. But there is no shared type enforcing this contract. If `BoardDragLayer` is refactored and the string match is missed, drops on opponent hands will silently misfire with no TypeScript error.

**Fix:** Add a comment making the coupling explicit, or define a shared `DropZoneType` union that `BoardDragLayer` handles exhaustively:

```ts
// NOTE: 'opponent-hand' is NOT a ClientAction toZone. BoardDragLayer.tsx intercepts
// this value and dispatches PASS_CARD. If you rename this string, update BoardDragLayer.
data: { toZone: 'opponent-hand' as const, toId: playerId },
```

---

### WR-05: `CardFace` fallback suit symbol has no overflow containment — overflows fixed card bounds at large font scale

**File:** `src/components/CardFace.tsx:38-58`

**Issue:** The card wrapper div has a fixed size (`w-[42px] h-[59px]`) but no `overflow-hidden`. The center suit symbol uses `text-2xl` (24px). At system font-size scale > 1.5× (a common accessibility setting), the symbol renders larger than the card bounds and overflows into adjacent cards in the hand or spread zone. The rank labels (`text-xs`) at top-left and bottom-right have the same issue.

**Fix:** Add `overflow-hidden` to the card wrapper:

```tsx
<div
  className={cn(
    'w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] relative bg-white rounded-md border border-gray-300 select-none overflow-hidden',
    className
  )}
>
```

---

## Info

### IN-01: `CardBack` and `CardFace` check empty string as sentinel — type does not communicate the contract

**File:** `src/components/CardBack.tsx:9`
**File:** `src/components/CardFace.tsx:22`

**Issue:** `CARD_BACK_URL` is typed as `string` and initialized to `''`. The check `if (CARD_BACK_URL)` works because empty string is falsy, but the type does not communicate that `''` means "no image configured." A contributor changing the initialization to `null` or `undefined` would get correct runtime behavior but find the type misleading.

**Fix:** Type the export as `string | null` and set the no-image sentinel to `null`:

```ts
export const CARD_BACK_URL: string | null = null;
```

Then use an explicit null check: `if (CARD_BACK_URL !== null)`.

---

### IN-02: `aria-pressed` is on the inner drag-listener div, not the outer click-target

**File:** `src/components/HandZone.tsx:54`

**Issue:** `aria-pressed={isSelected}` is applied to the inner div that holds `{...listeners}` and `{...attributes}` from `useSortable`. The `onClick` that toggles selection is on the outer wrapper (line 40). A screen reader encounters a pressable element (inner div) that does not handle click, while the actual click target (outer div) has no ARIA role or pressed state.

**Fix:** Move `aria-pressed` and a `role="button"` to the outer wrapper:

```tsx
<div
  className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', ...)}
  role="button"
  aria-pressed={isSelected}
  onClick={() => onToggleSelect(card.id)}
  onPointerDown={(e) => e.stopPropagation()}
>
```

---

_Reviewed: 2026-05-08T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
