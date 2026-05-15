---
phase: 17-board-layout-restructure
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - playwright/game.spec.ts
  - src/components/BoardView.tsx
  - src/components/SpreadZone.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

The three files implement a board layout restructure that introduces communal and personal spread zones alongside an in-place reorder gesture. The structure in `BoardView.tsx` is straightforward and the layout changes are coherent. `SpreadZone.tsx` contains the most defects: two of them are blockers because they produce silent data corruption during reorder. The e2e tests cover the new zones adequately at the happy-path level but contain two reliability gaps that can cause non-deterministic failures in CI.

---

## Critical Issues

### CR-01: `useDndMonitor` fires for every mounted `SpreadZone`; reorder fires on the wrong pile

**File:** `src/components/SpreadZone.tsx:59-79`

**Issue:** `useDndMonitor` registers a global listener inside the `DndContext`. When multiple `SpreadZone` instances are mounted (communal zone + each player's personal zone + each opponent zone in the header), every one of them executes its `onDragEnd` handler for every drag event. The handler guards against firing on the wrong pile via `fromThisPile && toThisPile`, but the guard for "toThisPile" on line 68-69 has a logic flaw:

```ts
const toThisPile =
  (overData?.fromZone === 'pile' && overData?.fromId === pile.id) ||  // BUG: checks fromZone/fromId, not toZone/toId
  String(over.id) === `pile-${pile.id}`;
```

`overData` is the sortable card's data (set on `useSortable`), which carries `fromZone` and `fromId` — not `toZone`/`toId`. When dragging card C from spread zone A into spread zone B, `overData.fromId` on the card in zone B will be zone B's id. This means `toThisPile` evaluates to `true` in both the source zone and the destination zone. The handler then fires `REORDER_PILE_SPREAD` in both zones: the source zone sees `overIdx === -1` for the dropped card (not in its list) and bails out, so the source zone is safe. However if two spread zones share a card ID — impossible with a standard 52-card deck but trivially triggered by a server bug or duplicate-pile configuration — both zones fire. More immediately: when a drag targets the droppable container (`pile-${pile.id}`) rather than a sortable card, `overIdx` resolves to `-1` via `faceUpCards.findIndex(c => c.id === String(over.id))` on line 73 because `over.id` is `"pile-play"`, not a card ID. This causes the guard `overIdx !== -1` to suppress the reorder even for legitimate intra-spread reorders when the pointer lands on the zone border rather than a card, silently dropping the user's intent.

**Fix:**

Replace the `toThisPile` derivation and look at `over.id` first, falling back to `overData`:

```ts
// over.id is the sortable card id; check if it belongs to this pile
const overIsPileDroppable = String(over.id) === `pile-${pile.id}`;
const overCardInThisPile = !overIsPileDroppable && faceUpCards.some(c => c.id === String(over.id));
const toThisPile = overIsPileDroppable || overCardInThisPile;
```

And only emit `REORDER_PILE_SPREAD` when `overCardInThisPile` is true (i.e., the target is actually a sibling card, not the zone border):

```ts
if (fromThisPile && overCardInThisPile && activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
  // ...send REORDER_PILE_SPREAD
}
```

---

### CR-02: `SortableSpreadCard` uses a static `toId: pileId` in `data` — intra-spread reorder in `SpreadZone.onDragEnd` resolves `overIdx` against `over.id` not `over.data`

**File:** `src/components/SpreadZone.tsx:20, 73`

**Issue:** The `useSortable` data on each spread card sets `toId: pileId` (line 20). The `onDragEnd` handler in `SpreadZone` tries to find the over-card's index via:

```ts
const overIdx = faceUpCards.findIndex(c => c.id === String(over.id));
```

This works when `over.id` is the card's dnd-kit sortable ID (which equals `card.id`). But when the drag lands on the zone's droppable (`pile-${pile.id}`) instead of a specific card, `over.id` is `"pile-play"` (or similar), and `overIdx` becomes `-1`. The guard on line 74 suppresses the reorder silently. The result is: dragging a card to the right edge of the spread zone where the pointer escapes all card rects but is still inside the zone produces a silent no-op instead of appending to the end. The test at line 349-413 doesn't cover this edge case because it moves `steps: 15` toward the center of the target card, not the zone boundary.

**Fix:** When `overIdx === -1` and `over.id` matches the zone droppable ID, treat it as "move to end" (append):

```ts
const resolvedOverIdx = overIdx !== -1 ? overIdx : faceUpCards.length - 1;
if (activeIdx !== -1 && resolvedOverIdx !== -1 && activeIdx !== resolvedOverIdx) {
  const reordered = arrayMove(faceUpCards, activeIdx, resolvedOverIdx);
  sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
}
```

---

## Warnings

### WR-01: `BoardView` silently renders nothing when `myPlayZoneId` does not match any `spread` pile

**File:** `src/components/BoardView.tsx:29, 106-114`

**Issue:** `mySpreadZone` is computed as `spreadPiles.find(p => p.id === gameState.myPlayZoneId)`. If `myPlayZoneId` contains a value (it is typed `string`, never `string | null | undefined`) but no pile with that id exists in `spreadPiles`, the find returns `undefined`. The render on line 106 uses `{mySpreadZone && ...}`, which silently omits the personal spread zone. There is no error log, no fallback UI, and no indication to the player that their personal spread zone is missing. This can happen during a race between the server assigning `myPlayZoneId` and the pile creation event arriving, or if pile initialization order changes.

**Fix:** Add a development-mode warning and a visible fallback:

```tsx
if (process.env.NODE_ENV === 'development' && !mySpreadZone) {
  console.warn(`[BoardView] No spread pile found for myPlayZoneId="${gameState.myPlayZoneId}"`);
}
```

---

### WR-02: `pass card` e2e test asserts the wrong thing — it never verifies the card transfer

**File:** `playwright/game.spec.ts:44-75`

**Issue:** The "pass card: P1 hand to P2 hand" test at line 44 performs a drag from P1's hand card to P1's `opponent-hand` element. After the drag, the assertion on line 74 is:

```ts
await expect(p1.getByTestId('opponent-hand')).toBeVisible();
```

This asserts that the opponent-hand zone is still visible — which it will be regardless of whether the card was successfully passed. It does not verify that P2's hand gained a card, nor that P1's hand lost one. The test would pass even if the drag silently failed. This is a reliability gap: a broken `PASS_CARD` implementation would not be caught.

**Fix:**

```ts
// P1's hand should have 4 cards (started with 5, passed 1)
await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(4);

// P2's hand should have 1 card
await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(1);
```

---

### WR-03: `spread zone drag` test installs `console` listener after the first drag completes — misses any warnings from the play-to-zone drag

**File:** `playwright/game.spec.ts:249-251`

**Issue:** In the "spread zone drag: drag card from communal spread zone to hand" test, the console listener is registered on line 249-251, after the first drag (card0 and card1 played to communal zone) has already completed. Any duplicate-ID warnings produced during that first drag are not captured. The test comment on line 275 says "No console warnings about duplicate dnd-kit IDs" but it can only catch warnings from the second drag (spread → hand), not from the first (hand → spread).

**Fix:** Install the console listener before any drag operations, at the top of the test body:

```ts
const consoleMessages: string[] = [];
p1.on('console', msg => { consoleMessages.push(msg.text()); });

// ... all drag operations ...

const duplicateIdWarnings = consoleMessages.filter(...);
expect(duplicateIdWarnings).toHaveLength(0);
```

The same pattern appears identically in the reorder test at line 383-384 for the same reason.

---

### WR-04: Empty `SortableContext` items array when all spread cards are masked — sorting broken

**File:** `src/components/SpreadZone.tsx:57, 104`

**Issue:** `faceUpCards` is built by filtering for cards that have an `'id'` property:

```ts
const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);
```

`SortableContext` on line 104 receives `items={faceUpCards.map(c => c.id)}`. If all cards in the spread pile are masked (face-down, `MaskedCard`), `faceUpCards` is empty but `pile.cards.length > 0`, so the non-empty branch executes. `SortableContext` gets an empty items array, but the rendered cards are wrapped in a `<div>` key'd to `masked-${i}` — none of which are registered as sortable items. The masked cards render as static `CardBack` components, which is visually correct. However the `useDndMonitor` handler then operates on an empty `faceUpCards` array, meaning any drag within a fully-masked spread zone silently emits nothing. This is acceptable behavior but undocumented. If face-down spreads are ever intended to support reordering, this is a bug.

**Fix (defensive — document the invariant):** If intentional, add a comment asserting that masked spread cards are not sortable. If unintentional, the filter must be removed and sorting logic must handle `MaskedCard`.

---

## Info

### IN-01: `handleToggleFace` in `SpreadZone` reads `pile.faceUp` without a default but the toggle button label uses `pile.faceUp !== false`

**File:** `src/components/SpreadZone.tsx:82-84, 132`

**Issue:** `handleToggleFace` sends `!pile.faceUp` — if `pile.faceUp` is `undefined`, this sends `true`. The button label on line 132 uses `pile.faceUp !== false` as the truthy check, which treats `undefined` as face-up. These two conventions are consistent with each other but neither is explicit. A reader has to reason through falsy/truthy coercions to confirm they agree. The `ClientPile` type marks `faceUp` as optional (`faceUp?: boolean`), so `undefined` is a real input.

**Fix:** Normalise to an explicit boolean at the top of the function:

```ts
const isFaceUp = pile.faceUp !== false; // undefined → true (face-up is the default)
```

Then use `isFaceUp` in both `handleToggleFace` and the button label.

---

### IN-02: The `communal zone position` test uses `page.evaluate` with `getBoundingClientRect` but does not account for scrolled container offsets

**File:** `playwright/game.spec.ts:293-299`

**Issue:** The `evaluate` call returns `rect.y` from `getBoundingClientRect()`, which is viewport-relative. This is correct and consistent with the Playwright `boundingBox()` calls. However the header row (`bg-card`) on line 47 of `BoardView.tsx` uses `overflow-x-auto`, so if the header is scrolled horizontally (e.g., many opponents), the y-coordinates of zones within it remain correct but x-coordinates do not. The test only checks y-coordinates, so it is safe today, but this is a latent fragility if x-coordinate assertions are added later.

**Fix:** No immediate action required. Add a comment in the test noting that x-coords from the scrollable header may be unreliable.

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
