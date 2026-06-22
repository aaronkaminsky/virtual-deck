# Hand Reveal/Sort Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a player's hand is revealed to opponents, the server's stored card order must match what the owner sees locally (including any active sort mode), so opponents see the same order as the owner. While hidden, sort stays client-only (no behavior change).

**Architecture:** Add a pure helper `getHandOrderSyncAction(sortMode, cards)` that returns a `REORDER_HAND` action (or `null` if no sync is needed) and call it from the two places a visible hand's order can change: the reveal-toggle handler (`BoardView.tsx`) and the sort-mode setter (`BoardDragLayer.tsx`). No server changes — `REORDER_HAND` and `SET_HAND_REVEALED` already exist and are already tested (`tests/handReveal.test.ts`, `party/index.ts:409-429`, `party/index.ts:664-673`).

**Tech Stack:** React (TypeScript), Vitest for unit tests, Playwright for e2e (no React component-test harness exists in this repo — UI wiring is verified via extracted pure functions + e2e, per existing convention in `tests/boardDragLayerDialog.test.ts`).

## Global Constraints

- Render-time sort, no server dispatch for hidden hands — sorting while hidden must remain purely a local transform, unchanged from current behavior.
- `skipSnapshot: true` on this sync's `REORDER_HAND` dispatch — it's a display-preference sync, not a player-initiated move, and must not be undoable.
- No new server-side code or message types — reuse `REORDER_HAND` (`src/shared/types.ts:84`) exactly as it exists today.
- Follow existing repo conventions: pure helpers exported from the component file that owns the related logic (mirrors `sortCards` already exported from `HandZone.tsx`).

---

### Task 1: Pure helper `getHandOrderSyncAction`

**Files:**
- Modify: `src/components/HandZone.tsx` (add export near `sortCards`, after line 40)
- Test: `tests/handRevealSortSync.test.ts` (new file)

**Interfaces:**
- Produces: `getHandOrderSyncAction(sortMode: SortMode, cards: Card[]): ClientAction | null` — exported from `src/components/HandZone.tsx`. Returns `null` when `sortMode === 'original'` (display already matches server order). Otherwise returns `{ type: 'REORDER_HAND', orderedCardIds: string[], skipSnapshot: true }` with `orderedCardIds` from `sortCards(cards, sortMode).map(c => c.id)`.
- Consumes: existing `sortCards` (same file, `HandZone.tsx:27-40`) and `SortMode` type (`HandZone.tsx:17`).

- [ ] **Step 1: Write the failing tests**

Create `tests/handRevealSortSync.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Card, Suit, Rank } from "../src/shared/types";
import { getHandOrderSyncAction } from "../src/components/HandZone";

function mkCard(id: string, suit: Suit, rank: Rank): Card {
  return { id, suit, rank, faceUp: false };
}

describe("getHandOrderSyncAction", () => {
  it("returns null when sortMode is 'original' (display already matches server order)", () => {
    const cards: Card[] = [mkCard("A-h", "hearts", "A"), mkCard("2-s", "spades", "2")];
    expect(getHandOrderSyncAction("original", cards)).toBeNull();
  });

  it("returns a REORDER_HAND action with the bySuit order and skipSnapshot:true", () => {
    const cards: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
      mkCard("5-d", "diamonds", "5"),
    ];
    const action = getHandOrderSyncAction("bySuit", cards);
    expect(action).toEqual({
      type: "REORDER_HAND",
      orderedCardIds: ["2-s", "K-c", "5-d", "A-h"],
      skipSnapshot: true,
    });
  });

  it("returns a REORDER_HAND action with the byRank order and skipSnapshot:true", () => {
    const cards: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
      mkCard("5-d", "diamonds", "5"),
    ];
    const action = getHandOrderSyncAction("byRank", cards);
    expect(action).toEqual({
      type: "REORDER_HAND",
      orderedCardIds: ["2-s", "5-d", "K-c", "A-h"],
      skipSnapshot: true,
    });
  });

  it("does not mutate the input cards array", () => {
    const cards: Card[] = [mkCard("A-h", "hearts", "A"), mkCard("2-s", "spades", "2")];
    const originalIds = cards.map(c => c.id);
    getHandOrderSyncAction("bySuit", cards);
    expect(cards.map(c => c.id)).toEqual(originalIds);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/handRevealSortSync.test.ts`
Expected: FAIL — `getHandOrderSyncAction` is not exported from `src/components/HandZone.tsx` (module has no export of that name).

- [ ] **Step 3: Implement the helper**

In `src/components/HandZone.tsx`, immediately after the existing `sortCards` function (ends at line 40, before the `// --- Tooltip copy per D-06 ---` comment at line 42), add:

```ts
// Returns the REORDER_HAND action needed to make the server's stored hand order
// match the locally sorted display order, or null if no sync is needed (original
// order already matches server order). skipSnapshot:true — this is a display-
// preference sync, not a player-initiated move.
export function getHandOrderSyncAction(sortMode: SortMode, cards: Card[]): ClientAction | null {
  if (sortMode === 'original') return null;
  return {
    type: 'REORDER_HAND',
    orderedCardIds: sortCards(cards, sortMode).map(c => c.id),
    skipSnapshot: true,
  };
}
```

`Card`, `ClientAction`, and `SortMode` are already imported/defined in this file (`HandZone.tsx:6, :17`) — no new imports needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/handRevealSortSync.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/HandZone.tsx tests/handRevealSortSync.test.ts
git commit -m "Add getHandOrderSyncAction helper for hand reveal/sort sync"
```

---

### Task 2: Sync on reveal toggle

**Files:**
- Modify: `src/components/BoardView.tsx`

**Interfaces:**
- Consumes: `getHandOrderSyncAction(sortMode: SortMode, cards: Card[]): ClientAction | null` from Task 1 (`src/components/HandZone.tsx`).
- Consumes existing props already present on `BoardViewProps`: `gameState.myHandRevealed: boolean`, `gameState.myHand: Card[]`, `sortMode: SortMode`, `sendAction: (action: ClientAction) => void`.

- [ ] **Step 1: Update the import**

In `src/components/BoardView.tsx:8`, change:

```ts
import { HandZone, type SortMode } from './HandZone';
```

to:

```ts
import { HandZone, getHandOrderSyncAction, type SortMode } from './HandZone';
```

- [ ] **Step 2: Replace the inline reveal-toggle handler**

In `src/components/BoardView.tsx`, the `BoardView` function currently builds `onToggleReveal` inline at line 168:

```tsx
onToggleReveal={() => sendAction({ type: 'SET_HAND_REVEALED', revealed: !gameState.myHandRevealed })}
```

Replace it by first adding a named handler inside the `BoardView` function body, directly above the `return (` statement (i.e. right after the `opponentCount` computation around line 59):

```ts
  function handleToggleReveal() {
    const next = !gameState.myHandRevealed;
    sendAction({ type: 'SET_HAND_REVEALED', revealed: next });
    if (next) {
      const syncAction = getHandOrderSyncAction(sortMode, gameState.myHand);
      if (syncAction) sendAction(syncAction);
    }
  }
```

Then change the `HandZone` JSX prop (still at what was line 168) to:

```tsx
onToggleReveal={handleToggleReveal}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Run the full unit test suite**

Run: `npx vitest run`
Expected: all existing tests still PASS (no server or type changes, so `tests/handReveal.test.ts` and `tests/handSort.test.ts` are unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardView.tsx
git commit -m "Sync hand order to server when revealing a sorted hand"
```

---

### Task 3: Sync on sort-mode change while revealed

**Files:**
- Modify: `src/components/BoardDragLayer.tsx`

**Interfaces:**
- Consumes: `getHandOrderSyncAction` from Task 1 (`src/components/HandZone.tsx`).
- Produces: `handleSetSortMode: (mode: SortMode) => void`, passed down as the `setSortMode` prop to `BoardView` (replacing the raw `setSortMode` setter). This is consumed internally by `HandZone`'s own sort button (`HandZone.tsx:178-182`, `handleSort` calls whatever `setSortMode` prop it's given) and externally has no other callers.

- [ ] **Step 1: Update the import**

In `src/components/BoardDragLayer.tsx:19`, change:

```ts
import { type SortMode, SORT_CYCLE } from './HandZone';
```

to:

```ts
import { type SortMode, SORT_CYCLE, getHandOrderSyncAction } from './HandZone';
```

- [ ] **Step 2: Add `handleSetSortMode` and rewrite `cycleSortMode`**

In `src/components/BoardDragLayer.tsx`, replace the existing `cycleSortMode` (lines 230-232):

```ts
  const cycleSortMode = useCallback(() => {
    setSortMode(prev => SORT_CYCLE[(SORT_CYCLE.indexOf(prev) + 1) % SORT_CYCLE.length]);
  }, []);
```

with:

```ts
  const handleSetSortMode = useCallback((mode: SortMode) => {
    setSortMode(mode);
    if (gameState.myHandRevealed) {
      const syncAction = getHandOrderSyncAction(mode, gameState.myHand);
      if (syncAction) sendAction(syncAction);
    }
  }, [gameState.myHandRevealed, gameState.myHand, sendAction]);

  const cycleSortMode = useCallback(() => {
    const next = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
    handleSetSortMode(next);
  }, [sortMode, handleSetSortMode]);
```

- [ ] **Step 3: Pass `handleSetSortMode` to `BoardView` instead of the raw setter**

In `src/components/BoardDragLayer.tsx`, the `<BoardView ... />` JSX (currently one long line, line 687) passes `setSortMode={setSortMode}`. Change that prop to:

```tsx
setSortMode={handleSetSortMode}
```

(Leave `sortMode={sortMode}` unchanged — `BoardView` still reads the raw state value.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (`HandZone`'s internal call `setSortMode('original')` at `HandZone.tsx:237` during drag-reorder now routes through `handleSetSortMode('original')`, which is a no-op dispatch since `getHandOrderSyncAction('original', …)` returns `null` — no behavior change there.)

- [ ] **Step 5: Run the existing keyboard-shortcut tests**

Run: `npx vitest run tests/keyboardUtils.test.ts`
Expected: PASS — these tests mock `cycleSortMode` itself (`tests/keyboardUtils.test.ts:765-798`) and don't exercise its internals, so they're unaffected by this change.

- [ ] **Step 6: Run the full unit test suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/BoardDragLayer.tsx
git commit -m "Sync hand order to server on sort-mode change while hand is revealed"
```

---

### Task 4: E2E coverage — opponent sees the owner's sort order once revealed

**Files:**
- Create: `playwright/handRevealSortSync.spec.ts`

**Interfaces:**
- Consumes: `twoPlayerRoom` fixture from `playwright/fixtures.ts` (provides `{ p1, p2, roomCode }`, two independent `BrowserContext`s already joined to the same room — required per project convention for multiplayer e2e).
- Consumes existing UI: `getByRole('button', { name: /open controls/i })` + deal-count input + `getByRole('button', { name: 'Deal' })` to deal cards (pattern from `playwright/game.spec.ts:4-8`); `getByTestId('hand-zone')`; the sort button has `aria-label` from `SORT_ARIA_LABELS` (`HandZone.tsx:50-54`, e.g. `'Sort hand — current: Original order'`); the reveal button has `aria-label` `'Show hand'` / `'Hide hand'` (`HandZone.tsx:295`); opponent's revealed cards render as `<img alt="{rank} of {suit}">` inside `getByTestId('opponent-hand')` (`OpponentHand.tsx:37,62-66`, `CardFace.tsx:26`).

- [ ] **Step 1: Write the test**

Create `playwright/handRevealSortSync.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('hand reveal/sort sync', () => {
  test('opponent sees the sorted order once the hand is revealed', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal so P1 has cards to sort
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // P1 sorts by suit (one click on the sort button cycles original -> bySuit)
    await p1.getByLabel('Sort hand — current: Original order').click();

    // P1 reveals the hand
    await p1.getByLabel('Show hand').click();

    // P2 (opponent) should see P1's revealed cards
    const opponentHand = p2.getByTestId('opponent-hand');
    const revealedImgs = opponentHand.locator('img');
    await expect(revealedImgs).not.toHaveCount(0);

    // Read P1's own displayed order (same sort applied locally) and P2's observed order — must match
    const p1Order = await p1.getByTestId('hand-zone').locator('img').evaluateAll(
      els => els.map(el => (el as HTMLImageElement).alt)
    );
    const p2Order = await revealedImgs.evaluateAll(
      els => els.map(el => (el as HTMLImageElement).alt)
    );
    expect(p2Order).toEqual(p1Order);
  });
});
```

- [ ] **Step 2: Run the test**

Start both dev servers first (`npm run dev` in one terminal, `npm run dev:client` in another), then:

Run: `npx playwright test playwright/handRevealSortSync.spec.ts`
Expected: PASS. (If `getByLabel('Sort hand — current: Original order')` doesn't match due to a timing race on initial sort-mode label, retry with a more specific locator scoped to `p1.getByTestId('hand-zone')` to disambiguate from any other "Sort hand" controls — there should not be any, but scope defensively if the test is flaky.)

- [ ] **Step 3: Commit**

```bash
git add playwright/handRevealSortSync.spec.ts
git commit -m "Add e2e test: hand reveal syncs sort order to opponents"
```
