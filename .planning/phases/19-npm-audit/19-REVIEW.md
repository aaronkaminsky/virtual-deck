---
phase: 19-npm-audit
reviewed: 2026-05-08T00:00:00Z
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
  warning: 6
  info: 2
  total: 10
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Eight files reviewed covering the Phase 19 responsive layout/UX polish work: one Playwright test, two card-rendering components (CardFace, CardBack), and five zone/layout components (PileZone, SpreadZone, HandZone, OpponentHand, BoardView).

The layout structure is broadly correct — `overflow-x-hidden` on the root, `w-screen`, and responsive card sizing are in place. Two logic bugs can produce silent incorrect behavior in reorder operations and pile-face toggling. Several structural issues in the test and layout silently mask potential regressions. The new `OpponentHand` component introduces a type-contract coupling that is fragile under refactor.

---

## Critical Issues

### CR-01: Reorder logic silently no-ops when card is dropped on zone droppable rather than sibling card

**File:** `src/components/SpreadZone.tsx:73`
**File:** `src/components/HandZone.tsx:100`

**Issue:** Both `useDndMonitor.onDragEnd` handlers find the "over" index by matching `over.id` against card IDs:

```ts
// SpreadZone.tsx:73
const overIdx = faceUpCards.findIndex(c => c.id === String(over.id));

// HandZone.tsx:100
const overIdx = cards.findIndex(c => c.id === String(over.id));
```

When the user drops a card onto the zone's droppable area (not onto a sibling card), `over.id` is `"pile-<pileId>"` or `"hand"` — neither of which is a card ID. `findIndex` returns `-1`, the guard `overIdx !== -1` fires, and no reorder action is dispatched. The drag silently fails to reorder. This is the most common drop target when a pile has only one card or when the user drops near the edge of the zone. The `toThisPile` / `toSameHand` checks correctly identify this case as a valid drop but the reorder code cannot act on it.

**Fix:** When `overIdx === -1` and the drop is onto the zone itself (not a card), treat it as a drop to the end of the list:

```ts
// SpreadZone.tsx — inside the fromThisPile && toThisPile && activeData branch
const activeIdx = faceUpCards.findIndex(c => c.id === activeData.card.id);
const rawOverIdx = faceUpCards.findIndex(c => c.id === String(over.id));
const overIdx = rawOverIdx !== -1 ? rawOverIdx : faceUpCards.length - 1;
if (activeIdx !== -1 && activeIdx !== overIdx) {
  const reordered = arrayMove(faceUpCards, activeIdx, overIdx);
  sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
}
```

Apply the same fix to `HandZone.tsx:100-103`.

---

### CR-02: `!pile.faceUp` treats `undefined` as falsy — toggle sends wrong value when pile has no explicit default

**File:** `src/components/PileZone.tsx:29`
**File:** `src/components/SpreadZone.tsx:83`

**Issue:** `ClientPile.faceUp` is typed as `boolean | undefined`. Both toggle handlers send `faceUp: !pile.faceUp`. When `pile.faceUp` is `undefined`, `!undefined` is `true`, so clicking "toggle" on a pile without an explicit `faceUp` always sets it to `true` rather than toggling from the display-consistent baseline. The display label (PileZone line 81, SpreadZone line 132) correctly uses `faceUp !== false` to mean "treat undefined as face-up", but the toggle action uses the opposite convention — it treats `undefined` as falsy (i.e., face-down). This means the button label reads "Face up" but its first click sends `faceUp: true` (matching the label by accident). On the second click it would send `faceUp: false`. The behavior is accidentally correct for the first click but wrong in principle, and will break if the server initializes any pile with an explicit `faceUp: false`.

**Fix:**

```ts
// PileZone.tsx:28-30 and SpreadZone.tsx:82-84
function handleToggleFace() {
  const currentlyFaceUp = pile.faceUp !== false; // undefined → true (matches label convention)
  sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !currentlyFaceUp });
}
```

---

## Warnings

### WR-01: Responsive test asserts `clientWidth <= 375` but does not guard against layout collapse narrower than viewport

**File:** `playwright/responsive.spec.ts:21`

**Issue:** `expect(clientWidth).toBeLessThanOrEqual(375)` passes when `clientWidth` is e.g. 300 — meaning the layout collapsed narrower than the requested viewport, which is also a failure condition. A layout that clips itself to avoid overflow would pass this test while producing a visually broken UI. The correct assertion requires both an upper and lower bound:

**Fix:**

```ts
expect(clientWidth).toBeGreaterThanOrEqual(370); // allow for browser chrome rounding
expect(clientWidth).toBeLessThanOrEqual(375);
expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
```

---

### WR-02: Playwright test uses a live room code and may hang in CI with an unhelpful timeout error

**File:** `playwright/responsive.spec.ts:8-12`

**Issue:** The test generates a real room code via `nanoid`, navigates to `/?room=<code>`, fills a name, and clicks "Join Game". If the PartyKit dev server is unavailable, the test will hang or fail at the `getByTestId('hand-zone')` assertion with a timeout rather than a clear "server unavailable" error. More critically, `expect(page.getByTestId('hand-zone')).toBeVisible()` has no explicit timeout override — the default 5 s timeout may be insufficient in CI where PartyKit startup is slow.

**Fix:**

```ts
await expect(page.getByTestId('hand-zone')).toBeVisible({ timeout: 15_000 });
```

---

### WR-03: `onPointerDown stopPropagation` on outer wrapper in `SortableHandCard` is fragile and may silently break drag initiation

**File:** `src/components/HandZone.tsx:41`

**Issue:** The outer wrapper of `SortableHandCard` calls `e.stopPropagation()` on every `pointerdown`. The `useSortable` listeners are bound to the inner ref div (line 47), not the outer wrapper. Stopping propagation on the outer div before the event reaches dnd-kit's sensor may prevent drag activation if sensor configuration changes (particularly `PointerSensor` with `activationConstraint`). The intent appears to be preventing the board from receiving selection clicks as drag events, but this broad stop applies to every pointer event regardless of intent. If `DndContext` moves its event listener attachment point, this will silently break dragging with no error.

**Fix:** Remove the `onPointerDown` stopper from the outer wrapper, or limit it to `onClick` with `stopPropagation` to only intercept click-based events:

```tsx
<div
  className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', ...)}
  onClick={(e) => { e.stopPropagation(); onToggleSelect(card.id); }}
>
```

---

### WR-04: `communalZone` hardcodes id `'play'` while all other zone IDs are data-driven

**File:** `src/components/BoardView.tsx:26`

**Issue:**

```ts
const communalZone = spreadPiles.find(p => p.id === 'play');
```

`myPlayZoneId` and opponent spread IDs (`spread-${id}`) are data-driven from the server. The communal zone ID is hardcoded. The server already migrated this pile once (from `spread-communal` to `play` — see `party/index.ts:119-127`). If it changes again, the communal zone silently disappears from the UI with no error.

**Fix:** Add `communalPlayZoneId` to `ClientGameState`, or document the contract with a named constant:

```ts
const COMMUNAL_ZONE_ID = 'play' as const; // must match party/index.ts pile initialization
const communalZone = spreadPiles.find(p => p.id === COMMUNAL_ZONE_ID);
```

---

### WR-05: `OpponentHand` registers `toZone: 'opponent-hand'` which is outside the `ClientAction` type union — silent coupling to `BoardDragLayer`

**File:** `src/components/OpponentHand.tsx:20`

**Issue:** The droppable data sets `toZone: 'opponent-hand' as const`. The `MOVE_CARD` action in `ClientAction` only accepts `toZone: "hand" | "pile"`. This works at runtime because `BoardDragLayer.tsx:149` intercepts it and dispatches `PASS_CARD` instead. However, this is a string-match coupling with no type contract: if `BoardDragLayer` is refactored, the silent interception breaks and no TypeScript error is raised because `'opponent-hand'` is simply an untyped string in the dnd-kit data bag.

**Fix:** Either add `'opponent-hand'` to a shared zone type and make `BoardDragLayer`'s handling exhaustive, or at minimum add a comment making the coupling explicit:

```ts
// 'opponent-hand' is intentionally not a ClientAction zone; BoardDragLayer.tsx:149
// intercepts drops on this zone and dispatches PASS_CARD instead of MOVE_CARD.
data: { toZone: 'opponent-hand' as const, toId: playerId },
```

---

### WR-06: `CardFace` fallback renders `text-2xl` suit symbol with no overflow constraint — can exceed fixed card bounds at high font scale

**File:** `src/components/CardFace.tsx:46`

**Issue:** The center suit symbol uses `text-2xl` (24px base). The card is fixed at `w-[42px] h-[59px]` (mobile). At system font scale > 1.5× (common on accessibility-configured devices), the symbol can render wider than the card bounds. There is no `overflow-hidden` on the card div and no max-size on the symbol span, so the symbol overflows and breaks adjacent card layouts.

**Fix:** Add `overflow-hidden` to the card wrapper div:

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

### IN-01: `CardBack` and `CardFace` use truthy check on empty string — type should communicate the sentinel

**File:** `src/components/CardBack.tsx:9`
**File:** `src/components/CardFace.tsx:22`

**Issue:** `CARD_BACK_URL` is typed as `string` and exported as `''`. The check `if (CARD_BACK_URL)` works (empty string is falsy), but the type does not communicate that empty string means "no image." A future contributor who changes the type to `string | null` and sets `CARD_BACK_URL = null` would get correct runtime behavior (null is also falsy) but the intent remains implicit.

**Fix:** Type the export as `string | null` and use `!== null` as the sentinel, making the design intent explicit.

---

### IN-02: `aria-pressed` is on the inner drag-listener div, not the outer click-target div

**File:** `src/components/HandZone.tsx:54`

**Issue:** `aria-pressed={isSelected}` is on the inner div that holds `{...listeners}` and `{...attributes}` from `useSortable`. The `onClick` handler that toggles selection is on the outer wrapper div (line 40), which has no `role` or ARIA attributes. Screen readers will see a pressable element (the inner div) but the click target is the outer div — they are not the same element.

**Fix:** Move `aria-pressed` and a `role="button"` to the outer wrapper that handles the click:

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

_Reviewed: 2026-05-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
