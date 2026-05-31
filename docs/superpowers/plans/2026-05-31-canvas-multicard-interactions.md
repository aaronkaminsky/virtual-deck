# Canvas Multi-Card Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make multi-card hand→canvas drops fan out, let a canvas selection drop onto a pile as a group, and add Select-all / Discard-all canvas controls — all on top of one `PLAY_CARD_SET` server extension.

**Architecture:** Client drag logic lives in `BoardDragLayer`; the canvas play area and its overlays live in `CanvasZone`. The authoritative server is `party/index.ts` (PartyKit). One server change (canvas as a `PLAY_CARD_SET` source) powers both the canvas→pile group drag and Discard-all; the hand-fan fix is a single DOM-attribute addition that the existing group-drop path already consumes.

**Tech Stack:** React 18 + TypeScript, @dnd-kit, PartyKit (Cloudflare Workers), Vitest (unit), Playwright (e2e), lucide-react icons.

**Branch:** `feat/canvas-multicard-interactions` (already created; design spec already committed).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/HandZone.tsx` | Modify | Tag each hand card with `data-card-id` so the drag layer can capture its on-screen offset |
| `src/shared/types.ts` | Modify | Widen `PLAY_CARD_SET.fromZone` to include `"canvas"` |
| `party/index.ts` | Modify | `PLAY_CARD_SET` resolves + removes from `canvasCards` when `fromZone === "canvas"` |
| `src/components/BoardDragLayer.tsx` | Modify | Allow canvas source in the multi-card-set drop path; add `handleSelectAllCanvas` / `handleDiscardAllCanvas`; thread props |
| `src/components/BoardView.tsx` | Modify | Thread the two new canvas handlers to `CanvasZone` |
| `src/components/CanvasZone.tsx` | Modify | Render `CanvasControls` (top-left, only when non-empty); move selection badge clear of it |
| `src/components/CanvasControls.tsx` | Create | Select-all + Discard-all button panel |
| `tests/playCardSet.test.ts` | Modify | Canvas-source coverage for `PLAY_CARD_SET` |
| `playwright/canvasMulticard.spec.ts` | Create | e2e for 999.39 / 999.40 / 999.41 |
| `.planning/ROADMAP.md`, `docs/superpowers/specs/BACKLOG.md` | Modify | Bookkeeping |

**Shell tooling:** this environment uses `rg` (not grep), `fd` (not find), `sd` (not sed). Use the Read tool to view files.

---

## Task 1: Hand → Canvas multi-card fan (999.39)

**Files:**
- Modify: `src/components/HandZone.tsx:92`
- Create: `playwright/canvasMulticard.spec.ts`

**Background:** `BoardDragLayer.handleDragStart` captures each selected card's screen position via `document.querySelector('[data-card-id="<id>"]')` and stores offsets relative to the drag handle; `GROUP_PLACE_ON_CANVAS` applies them so cards fan out. `SpreadZone` renders `data-card-id` (so spread→canvas fans), but `HandZone` does not, so hand cards collapse onto one point. Adding the attribute to the hand card's inner draggable `<div>` (the element with `ref={setNodeRef}`, mirroring `SpreadZone.tsx:51`) fixes it with no other change.

- [ ] **Step 1: Write the failing e2e test**

Create `playwright/canvasMulticard.spec.ts`:

```typescript
import { test, expect, type Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinRoom(page: Page, roomCode: string, name = 'Tester') {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
}

// dnd-kit needs real pointer events; dragAndDrop() fires HTML5 events it ignores.
async function pointerDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

test.describe('canvas multi-card interactions', () => {
  test('999.39: multi-select from hand fans out on the canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);

    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    // Select two hand cards (click toggles selection; distance:8 sensor keeps a click from dragging)
    await handCards.nth(0).click();
    await handCards.nth(1).click();
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed="true"]')).toHaveCount(2);

    // Drag the first selected card into the middle of the canvas
    const src = await handCards.nth(0).boundingBox();
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!src || !canvas) throw new Error('missing bounding boxes');
    await pointerDrag(page,
      { x: src.x + src.width / 2, y: src.y + src.height / 2 },
      { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 },
    );

    // Both cards land on the canvas at DISTINCT x positions (fanned, not stacked)
    const canvasCards = page.locator('[data-testid="canvas-inner"] [data-card-id]');
    await expect(canvasCards).toHaveCount(2);
    const box0 = await canvasCards.nth(0).boundingBox();
    const box1 = await canvasCards.nth(1).boundingBox();
    if (!box0 || !box1) throw new Error('missing canvas card boxes');
    expect(Math.abs(box0.x - box1.x)).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts`
Expected: FAIL — the two cards land stacked, so the two `boundingBox().x` values are equal (assertion `> 5` fails).

- [ ] **Step 3: Add `data-card-id` to the hand card**

In `src/components/HandZone.tsx`, the inner draggable `<div>` (currently lines 92–101) reads:

```tsx
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
```

Add `data-card-id={card.id}` right after `style={style}` (matching `SpreadZone.tsx:51`):

```tsx
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts`
Expected: PASS — the cards now fan to distinct x positions.

- [ ] **Step 5: Commit**

```bash
git add src/components/HandZone.tsx playwright/canvasMulticard.spec.ts
git commit -m "fix: fan hand cards onto canvas via data-card-id (999.39)"
```

---

## Task 2: `PLAY_CARD_SET` canvas source — server (999.40 foundation)

**Files:**
- Modify: `src/shared/types.ts:82`
- Modify: `party/index.ts` (`PLAY_CARD_SET` handler — source resolution ~line 822, source removal ~line 886)
- Modify: `tests/playCardSet.test.ts`

**Background:** `PLAY_CARD_SET` moves a validated set of cards from hand/pile into a pile/hand with an undo snapshot. The handler branches hand-vs-pile in **two** places — source resolution and source removal — and both must gain a canvas branch (the removal branch uses `piles.find(fromId)!` and would crash on a canvas source). `MOVE_CARD` already has the canvas-lookup pattern to mirror. The canvas is shared, so the existing hand-ownership guard (which only runs for hand sources) correctly does not apply.

- [ ] **Step 1: Write the failing tests**

In `tests/playCardSet.test.ts`, add a helper and a new `describe` block at the end of the file (before the final closing brace of the outer `describe` if one wraps everything — these are top-level `describe`s here, so append after the last one):

```typescript
import type { CanvasCard } from "../src/shared/types";

function makeStateWithCanvasCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "", handRevealed: false });
  state.hands[playerId] = [];
  state.canvasCards = cards.map((card, i): CanvasCard => ({ card, x: 10 + i * 20, y: 10, z: i + 1 }));
  return state;
}

describe("PLAY_CARD_SET canvas source (999.40)", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("moves all named canvas cards to the discard pile and clears them from the canvas", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h", "Q-d"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["A-s", "K-h", "Q-d"]);
  });

  it("moves only the named subset, leaving other canvas cards in place", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "Q-d"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    expect(room.gameState.canvasCards.map(cc => cc.card.id)).toEqual(["K-h"]);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["A-s", "Q-d"]);
  });

  it("rejects atomically when a cardId is not on the canvas (no mutation)", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "NOT-ON-CANVAS"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    // Nothing moved
    expect(room.gameState.canvasCards).toHaveLength(2);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]))
      .filter((e: { type: string }) => e.type === "ERROR");
    expect(errors.some((e: { code: string }) => e.code === "CARD_NOT_IN_SOURCE")).toBe(true);
  });

  it("UNDO_MOVE restores the canvas and pile to the pre-move state", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);
    expect(room.gameState.canvasCards).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);
    expect(room.gameState.canvasCards.map(cc => cc.card.id)).toEqual(["A-s", "K-h"]);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- tests/playCardSet.test.ts`
Expected: FAIL — the canvas-source tests error or assert wrong values (the handler resolves `piles.find("canvas")` → `PILE_NOT_FOUND`, and the removal branch would throw on a canvas source).

- [ ] **Step 3: Widen the action type**

In `src/shared/types.ts`, line 82, change the `PLAY_CARD_SET` member from:

```ts
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

to:

```ts
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile" | "canvas"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

- [ ] **Step 4: Add the canvas branch to source resolution**

In `party/index.ts`, inside the `PLAY_CARD_SET` handler, the source is resolved (around line 822) as:

```ts
        // Resolve source array based on fromZone
        const source: Card[] | undefined =
          (!fromZone || fromZone === "hand")
            ? this.gameState.hands[fromId]
            : this.gameState.piles.find(p => p.id === fromId)?.cards;
```

Replace it with a version that handles canvas:

```ts
        // Resolve source array based on fromZone
        const source: Card[] | undefined =
          (!fromZone || fromZone === "hand")
            ? this.gameState.hands[fromId]
            : fromZone === "canvas"
              ? this.gameState.canvasCards.map(cc => cc.card)
              : this.gameState.piles.find(p => p.id === fromId)?.cards;
```

(The existing `source === undefined` check, `allPresent` validation, and duplicate check below all operate on `source`, so they now cover the canvas case. For canvas, `source` is always a defined array — an empty/short canvas simply fails `allPresent` with `CARD_NOT_IN_SOURCE`.)

- [ ] **Step 5: Add the canvas branch to source removal**

Still in the `PLAY_CARD_SET` handler, the removal block (around line 886) reads:

```ts
        // Remove from source first (before mutating faceUp to keep source array clean)
        if (!fromZone || fromZone === "hand") {
          this.gameState.hands[fromId] = source.filter(c => !cardIdSet.has(c.id));
        } else {
          const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
          srcPile.cards = srcPile.cards.filter(c => !cardIdSet.has(c.id));
        }
```

Replace it with:

```ts
        // Remove from source first (before mutating faceUp to keep source array clean)
        if (!fromZone || fromZone === "hand") {
          this.gameState.hands[fromId] = source.filter(c => !cardIdSet.has(c.id));
        } else if (fromZone === "canvas") {
          this.gameState.canvasCards = this.gameState.canvasCards.filter(cc => !cardIdSet.has(cc.card.id));
        } else {
          const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
          srcPile.cards = srcPile.cards.filter(c => !cardIdSet.has(c.id));
        }
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npm test -- tests/playCardSet.test.ts`
Expected: PASS — all canvas-source tests green, existing tests still green.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/playCardSet.test.ts
git commit -m "feat: PLAY_CARD_SET accepts canvas source (999.40 server)"
```

---

## Task 3: Canvas selection → pile drag (999.40 client)

**Files:**
- Modify: `src/components/BoardDragLayer.tsx` (`isMultiCardSet` ~line 444; dispatch ~line 470)
- Modify: `playwright/canvasMulticard.spec.ts`

**Background:** The multi-card-set drop branch in `handleDragEnd` currently excludes canvas sources (`fromZoneAtEnd !== 'canvas'`), and its `PLAY_CARD_SET` dispatch hard-codes `fromZone` to `'hand'`/`'pile'` and `fromId` to `playerId`/pile id. Allowing canvas there — and sending `fromZone: 'canvas'`, `fromId: 'canvas'` — routes a 2+ canvas selection dropped on a pile through the Task 2 server path. A single canvas card still uses the existing `MOVE_CARD` dialog path (that branch only runs when fewer than 2 cards are selected).

- [ ] **Step 1: Write the failing e2e test**

Append this test inside the `describe('canvas multi-card interactions', ...)` block in `playwright/canvasMulticard.spec.ts` (reuse the `joinRoom` / `dealCards` / `pointerDrag` helpers already in the file):

```typescript
  test('999.40: multi-select from canvas drops onto a pile together', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);

    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas box');

    // Place two separate cards on the canvas (two single drags to different spots)
    for (let i = 0; i < 2; i++) {
      const src = await handCards.nth(0).boundingBox();
      if (!src) throw new Error('no hand card');
      await pointerDrag(page,
        { x: src.x + src.width / 2, y: src.y + src.height / 2 },
        { x: canvas.x + 200 + i * 120, y: canvas.y + 200 },
      );
    }
    const canvasCards = page.locator('[data-testid="canvas-inner"] [data-card-id]');
    await expect(canvasCards).toHaveCount(2);

    // Select both canvas cards, then drag them onto the Draw pile
    await canvasCards.nth(0).click();
    await canvasCards.nth(1).click();
    await expect(page.getByTestId('canvas-selection-count')).toBeVisible();

    const src = await canvasCards.nth(0).boundingBox();
    const drawPile = await page.getByTestId('pile-draw').boundingBox();
    if (!src || !drawPile) throw new Error('missing boxes');
    await pointerDrag(page,
      { x: src.x + src.width / 2, y: src.y + src.height / 2 },
      { x: drawPile.x + drawPile.width / 2, y: drawPile.y + drawPile.height / 2 },
    );

    // Canvas is now empty; the cards moved off the canvas
    await expect(page.locator('[data-testid="canvas-inner"] [data-card-id]')).toHaveCount(0);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts -g 999.40`
Expected: FAIL — only the dragged card leaves the canvas (one card remains), so `toHaveCount(0)` fails.

- [ ] **Step 3: Allow canvas in the multi-card-set condition**

In `src/components/BoardDragLayer.tsx`, the `isMultiCardSet` definition (around lines 444–451) ends with `fromZoneAtEnd !== 'canvas';`. Change the final clause from excluding canvas to allowing it. The block currently reads:

```tsx
    const isMultiCardSet =
      (selectedIds.size > 1 || hasMaskedCardsInSource) &&
      selectedIds.has(activeId) &&
      !!event.over &&
      (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
      !isIntraSpreadReorder &&
      !isIntraHandReorder &&
      fromZoneAtEnd !== 'canvas';
```

Replace the final line `fromZoneAtEnd !== 'canvas';` with `true;` and delete that clause — i.e. the block becomes:

```tsx
    const isMultiCardSet =
      (selectedIds.size > 1 || hasMaskedCardsInSource) &&
      selectedIds.has(activeId) &&
      !!event.over &&
      (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
      !isIntraSpreadReorder &&
      !isIntraHandReorder;
```

- [ ] **Step 4: Send canvas as the source in the dispatch**

Still in `handleDragEnd`, inside `if (isMultiCardSet) { ... }`, the non-masked dispatch (around lines 469–480) reads:

```tsx
      } else {
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: (selectionSource !== null && selectionSource.zone !== 'canvas' ? selectionSource.zone : 'hand') as 'hand' | 'pile',
          fromId: selectionSource !== null && selectionSource.zone === 'pile'
            ? selectionSource.zoneId   // use selectionSource as canonical pile ID
            : playerId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
        });
      }
```

Replace it with a version that handles a canvas source:

```tsx
      } else {
        const setFromZone: 'hand' | 'pile' | 'canvas' =
          selectionSource?.zone === 'canvas' ? 'canvas'
          : selectionSource?.zone === 'pile' ? 'pile'
          : 'hand';
        const setFromId =
          selectionSource?.zone === 'canvas' ? 'canvas'
          : selectionSource?.zone === 'pile' ? selectionSource.zoneId
          : playerId;
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: setFromZone,
          fromId: setFromId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
        });
      }
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts -g 999.40`
Expected: PASS — canvas empties after the group drop.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/BoardDragLayer.tsx playwright/canvasMulticard.spec.ts
git commit -m "feat: drop a canvas selection onto a pile as a group (999.40 client)"
```

---

## Task 4: Canvas controls — Select all + Discard all (999.41)

**Files:**
- Create: `src/components/CanvasControls.tsx`
- Modify: `src/components/BoardDragLayer.tsx` (add two handlers; pass to `BoardView`)
- Modify: `src/components/BoardView.tsx` (props + thread to `CanvasZone`)
- Modify: `src/components/CanvasZone.tsx` (props; render controls; move selection badge clear of them)
- Modify: `playwright/canvasMulticard.spec.ts`

**Background:** The canvas has no toolbar. We add a small fixed panel in the **top-left** of the play area (in `CanvasZone`'s outer viewport `<div>`, clear of the mid-edge pan arrows), shown only when the canvas has cards. The existing selection-count badge also sits top-left on the inner (panned) canvas div, so we move it down to clear the panel at rest. Selection and dispatch live in `BoardDragLayer` (which owns selection state); Discard-all reuses the Task 2 `PLAY_CARD_SET` canvas path targeting the `discard` pile.

- [ ] **Step 1: Write the failing e2e test**

Append this test inside the `describe('canvas multi-card interactions', ...)` block in `playwright/canvasMulticard.spec.ts`:

```typescript
  test('999.41: select-all selects every canvas card; discard-all clears the canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);

    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas box');

    // Place three cards on the canvas
    for (let i = 0; i < 3; i++) {
      const src = await handCards.nth(0).boundingBox();
      if (!src) throw new Error('no hand card');
      await pointerDrag(page,
        { x: src.x + src.width / 2, y: src.y + src.height / 2 },
        { x: canvas.x + 150 + i * 120, y: canvas.y + 200 },
      );
    }
    await expect(page.locator('[data-testid="canvas-inner"] [data-card-id]')).toHaveCount(3);

    // Panel is visible; Select all selects all three (badge shows count)
    await page.getByTestId('canvas-select-all').click();
    await expect(page.getByTestId('canvas-selection-count')).toHaveText(/3 selected/);

    // Discard all clears the canvas immediately
    await page.getByTestId('canvas-discard-all').click();
    await expect(page.locator('[data-testid="canvas-inner"] [data-card-id]')).toHaveCount(0);
    // Panel hides when the canvas is empty
    await expect(page.getByTestId('canvas-controls')).toHaveCount(0);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts -g 999.41`
Expected: FAIL — `canvas-select-all` does not exist.

- [ ] **Step 3: Create the `CanvasControls` component**

Create `src/components/CanvasControls.tsx`:

```tsx
import { SquareCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasControlsProps {
  onSelectAll: () => void;
  onDiscardAll: () => void;
}

export function CanvasControls({ onSelectAll, onDiscardAll }: CanvasControlsProps) {
  return (
    <div
      data-testid="canvas-controls"
      className="absolute top-2 left-2 z-20 flex gap-1 rounded-md bg-card/80 p-1 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={onSelectAll}
        title="Select all cards on the canvas"
        aria-label="Select all canvas cards"
        data-testid="canvas-select-all"
      >
        <SquareCheck className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={onDiscardAll}
        title="Discard all cards on the canvas"
        aria-label="Discard all canvas cards"
        data-testid="canvas-discard-all"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Add the two handlers in `BoardDragLayer`**

In `src/components/BoardDragLayer.tsx`, add these two handlers next to the other selection handlers (e.g. right after `handleDeselectAll`, around line 162):

```tsx
  const handleSelectAllCanvas = () => {
    if (selectionSource?.zone === 'canvas') {
      setSelectedIds(new Set());
      setSelectionSource(null);
      return;
    }
    const ids = gameState.canvasCards.map(cc => cc.card.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set(ids));
    setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
  };

  const handleDiscardAllCanvas = () => {
    const ids = gameState.canvasCards.map(cc => cc.card.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set());
    setSelectionSource(null);
    sendAction({
      type: 'PLAY_CARD_SET',
      cardIds: ids,
      fromZone: 'canvas',
      fromId: 'canvas',
      toZone: 'pile',
      toId: 'discard',
    });
  };
```

- [ ] **Step 5: Pass the handlers through `BoardView`**

In `src/components/BoardDragLayer.tsx`, the `<BoardView ... />` element (around line 619) is rendered with many props. Add the two new props to that element:

```tsx
        onSelectAllCanvas={handleSelectAllCanvas} onDiscardAllCanvas={handleDiscardAllCanvas}
```

(Place them alongside `onToggleSelectCanvas={handleToggleSelectCanvas}` in the same JSX tag.)

- [ ] **Step 6: Thread the props in `BoardView`**

In `src/components/BoardView.tsx`, add to `BoardViewProps` (the interface around lines 12–30):

```tsx
  onSelectAllCanvas: () => void;
  onDiscardAllCanvas: () => void;
```

Add them to the destructured parameter list (around line 32):

```tsx
  onSelectAllCanvas, onDiscardAllCanvas,
```

And pass them to the `<CanvasZone ... />` element (around line 99):

```tsx
              onSelectAllCanvas={onSelectAllCanvas} onDiscardAllCanvas={onDiscardAllCanvas}
```

- [ ] **Step 7: Render the panel in `CanvasZone` and move the badge**

In `src/components/CanvasZone.tsx`:

(a) Add to the imports at the top:

```tsx
import { CanvasControls } from './CanvasControls';
```

(b) Add to `CanvasZoneProps` (around lines 80–89):

```tsx
  onSelectAllCanvas: () => void;
  onDiscardAllCanvas: () => void;
```

(c) Add to the destructured params of `export function CanvasZone({ ... })` (around line 91):

```tsx
  onSelectAllCanvas, onDiscardAllCanvas,
```

(d) Move the selection-count badge down so it clears the panel. The badge (around lines 217–219) currently reads `className="absolute top-2 left-2 z-10 ..."`. Change `top-2` to `top-12`:

```tsx
            className="absolute top-12 left-2 z-10 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5"
```

(e) Render the panel inside the outer viewport `<div>` (the one with `data-testid="canvas-zone"`), as the last child before the `EdgeArrow`s (around line 251), gated on non-empty canvas:

```tsx
      {canvasCards.length > 0 && (
        <CanvasControls onSelectAll={onSelectAllCanvas} onDiscardAll={onDiscardAllCanvas} />
      )}
```

- [ ] **Step 8: Run the test to confirm it passes**

Run: `npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts -g 999.41`
Expected: PASS — select-all shows "3 selected", discard-all empties the canvas, panel disappears.

- [ ] **Step 9: Typecheck and full e2e for the spec file**

Run: `npm run typecheck && npm run test:e2e -- --project=chromium playwright/canvasMulticard.spec.ts`
Expected: no type errors; all three tests in the file pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/CanvasControls.tsx src/components/BoardDragLayer.tsx src/components/BoardView.tsx src/components/CanvasZone.tsx playwright/canvasMulticard.spec.ts
git commit -m "feat: canvas select-all + discard-all controls (999.41)"
```

---

## Task 5: Roadmap & backlog bookkeeping

**Files:**
- Modify: `.planning/ROADMAP.md`
- Modify: `docs/superpowers/specs/BACKLOG.md`

**Background:** Per project convention, shipped items are removed from the backlog and recorded as milestones in the roadmap. Card art (999.14) already merged; this canvas work ships with this PR.

- [ ] **Step 1: Add milestone entries to `.planning/ROADMAP.md`**

In the `## Milestones` list (after the `v1.6 Free Canvas Play Area` line), add:

```markdown
- ✅ **v1.7 Card Art & Visual Overhaul** — 999.14 (shipped 2026-05-30)
- ✅ **v1.8 Canvas Multi-Card Interactions** — 999.39, 999.40, 999.41 (shipped 2026-05-31)
```

- [ ] **Step 2: Remove shipped rows from `docs/superpowers/specs/BACKLOG.md`**

Delete these four table rows (the `999.14`, `999.39`, `999.40`, `999.41` lines). Leave the `999.23` sound-effects row (its `(see 999.14)` cross-reference stays — it points at the art/customization grouping, not the backlog row).

- [ ] **Step 3: Verify no stale references**

Run: `rg -n '999\.(14|39|40|41)' docs/superpowers/specs/BACKLOG.md`
Expected: only the `999.23` row's `(see 999.14)` cross-reference remains; the four standalone rows are gone.

- [ ] **Step 4: Commit**

```bash
git add .planning/ROADMAP.md docs/superpowers/specs/BACKLOG.md
git commit -m "docs: record v1.7/v1.8 milestones; clear shipped backlog items"
```

---

## Task 6: Full verification, push, and PR

- [ ] **Step 1: Full unit suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all unit tests pass; no type errors.

- [ ] **Step 2: Full e2e suite**

Run: `npm run test:e2e -- --project=chromium`
Expected: all e2e tests pass (existing + the new `canvasMulticard.spec.ts`).

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/canvas-multicard-interactions
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create \
  --title "feat: canvas multi-card interactions (999.39/40/41)" \
  --body "$(cat <<'EOF'
## Summary
- 999.39: multi-card hand→canvas drops now fan out (added `data-card-id` to hand cards so the existing group-drop path captures offsets)
- 999.40: a canvas selection can be dropped onto a pile as a group (`PLAY_CARD_SET` now accepts a `canvas` source)
- 999.41: new top-left canvas controls — Select all + immediate Discard all (Discard all reuses the canvas `PLAY_CARD_SET` path → discard pile)
- Bookkeeping: recorded v1.7 (card art) and v1.8 (this work) in ROADMAP; cleared shipped backlog rows

## Test plan
- [ ] Unit: `PLAY_CARD_SET` canvas source (move all/subset, atomic reject, undo)
- [ ] e2e: hand fan, canvas→pile group, select-all + discard-all
- [ ] `npm test`, `npm run typecheck`, `npm run test:e2e` all green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §1 999.39 hand fan → Task 1 ✅
- §2 999.40 canvas→pile (server type + resolution + removal) → Task 2 ✅; (client allow-canvas + dispatch) → Task 3 ✅
- §3 999.41 controls (component, handlers, threading, badge collision, immediate discard, visible-only-when-non-empty) → Task 4 ✅
- §4 testing (Vitest canvas source incl. atomic + undo; e2e for all three) → Tasks 2, 1, 3, 4 ✅
- §5 bookkeeping (ROADMAP v1.7/v1.8, BACKLOG removals) → Task 5 ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code.

**Type consistency:** `fromZone: "hand" | "pile" | "canvas"` defined in Task 2 (types + handler) and used in Tasks 3–4 dispatches with `fromId: 'canvas'`. Handlers `handleSelectAllCanvas` / `handleDiscardAllCanvas` defined in Task 4 Step 4 match the `onSelectAllCanvas` / `onDiscardAllCanvas` prop names threaded in Steps 5–7 and consumed by `CanvasControls` (`onSelectAll` / `onDiscardAll`). Test ids (`canvas-controls`, `canvas-select-all`, `canvas-discard-all`, `canvas-selection-count`, `canvas-inner`, `canvas-zone`, `pile-draw`) are consistent between component and e2e.
