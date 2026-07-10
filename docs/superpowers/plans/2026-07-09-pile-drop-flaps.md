# Pile Drop Placement Flaps (1039) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal Top/Bottom/Random pile-drop dialog with instant drop-to-top plus drag-over Bottom/Random flap drop targets, for single cards and multi-card sets.

**Architecture:** The drop-position decision moves out of `BoardDragLayer`'s dialog into (a) pure functions in `src/lib/pileDrop.ts` (unit-testable, no jsdom needed) and (b) a new `PileDropFlaps` component rendering two dnd-kit droppables flush against each pile while an eligible drag hovers it. The server's `PLAY_CARD_SET` handler gains an optional `insertPosition` so multi-card sets can also land at bottom/random. Spec: `docs/superpowers/specs/2026-07-09-pile-drop-flaps-design.md`.

**Tech Stack:** React 18 + TypeScript, @dnd-kit/core `useDroppable`, PartyKit server (`party/index.ts`), Vitest (node environment — no component mounting), Playwright.

## Global Constraints

- Working directory is the worktree: `/Users/aaronkaminsky/code/virtual-deck/.claude/worktrees/pile-drop-flaps` (branch `worktree-pile-drop-flaps`). All paths below are relative to it.
- Pre-commit hook runs `npm test` + `npm run typecheck` automatically — a passing commit is the verification gate for each task.
- The card being dropped must never be momentarily revealed on top of a face-up pile — bottom/random inserts go directly to their position (no "drop to top then convert").
- Flap semantics for multi-card sets: **bottom** = insert the set at the bottom preserving `cardIds` order; **random** = each card independently spliced at an unbiased random index.
- Flaps never render for: empty piles, spread zones, whole-pile drags, masked-pile group drags (`MOVE_ALL_PILE_CARDS` path).
- Vitest runs in node (no jsdom): unit tests cover pure logic and the server; the flap UI is covered by Playwright.
- dnd-kit conventions (from CLAUDE.md): `MeasuringStrategy.Always` is already set on `DndContext` (required for flaps mounting mid-drag — do not remove); Playwright drags must use `mouse.move/down/move/up` with `steps: 15`, never `dragAndDrop()`.
- Playwright multiplayer tests need two `BrowserContext`s (a shared context shares the player token).

---

### Task 1: Server — `PLAY_CARD_SET.insertPosition`

**Files:**
- Modify: `src/shared/types.ts:105`
- Modify: `party/index.ts:1176` (the `dest.push(...cardsToPlay)` line in the `PLAY_CARD_SET` case)
- Test: `tests/playCardSet.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: existing `unbiasedRandom(max: number): number` (module-scope helper in `party/index.ts:38`).
- Produces: `PLAY_CARD_SET` action type with optional `insertPosition?: 'top' | 'bottom' | 'random'` — Task 3 sends this field from the client.

- [ ] **Step 1: Write the failing tests**

Append to `tests/playCardSet.test.ts` (it already imports `describe, it, expect, beforeEach`, `GameRoom`, `defaultGameState`, helpers, and defines `makeStateWithPileCards` at module scope):

```ts
describe("PLAY_CARD_SET insertPosition (1039)", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  // Hand holds the set; discard pile pre-seeded with existing cards.
  function setupHandAndDiscard(setIds: string[], existingIds: string[]): void {
    room.gameState = makeStateWithPileCards("player-1", "discard", existingIds.map(makeCard));
    room.gameState.hands["player-1"] = setIds.map(makeCard);
  }

  async function playSet(cardIds: string[], insertPosition?: "top" | "bottom" | "random") {
    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds,
      fromId: "player-1",
      toZone: "pile",
      toId: "discard",
      ...(insertPosition ? { insertPosition } : {}),
    }), sender);
  }

  it("bottom inserts the set at the bottom preserving cardIds order", async () => {
    setupHandAndDiscard(["A-s", "K-h"], ["2-c", "3-d"]);
    await playSet(["A-s", "K-h"], "bottom");
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["A-s", "K-h", "2-c", "3-d"]);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("random places every card and preserves relative order of pre-existing cards", async () => {
    setupHandAndDiscard(["A-s", "K-h", "Q-d"], ["2-c", "3-d", "4-h"]);
    await playSet(["A-s", "K-h", "Q-d"], "random");
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards).toHaveLength(6);
    expect(new Set(discard.cards.map(c => c.id))).toEqual(
      new Set(["A-s", "K-h", "Q-d", "2-c", "3-d", "4-h"])
    );
    // splice-insert never reorders what was already there
    const existingInOrder = discard.cards.map(c => c.id).filter(id => ["2-c", "3-d", "4-h"].includes(id));
    expect(existingInOrder).toEqual(["2-c", "3-d", "4-h"]);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("random onto an empty pile places all cards (no crash on length 0)", async () => {
    setupHandAndDiscard(["A-s", "K-h"], []);
    await playSet(["A-s", "K-h"], "random");
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(new Set(discard.cards.map(c => c.id))).toEqual(new Set(["A-s", "K-h"]));
  });

  it("omitted insertPosition appends to the top (existing behavior)", async () => {
    setupHandAndDiscard(["A-s"], ["2-c"]);
    await playSet(["A-s"]);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["2-c", "A-s"]);
  });

  it("insertPosition is ignored for hand destinations", async () => {
    setupHandAndDiscard([], ["2-c", "3-d"]);
    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["2-c"],
      fromZone: "pile",
      fromId: "discard",
      toZone: "hand",
      toId: "player-1",
      insertPosition: "bottom",
    }), sender);
    // Appended to the hand end, not unshifted
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["2-c"]);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["3-d"]);
  });
});
```

Note: the "ignored for hand destinations" test has a 1-card hand so unshift-vs-push is indistinguishable by order — its real assertion is that the action succeeds and the code path doesn't apply pile positioning to hands. Keep it anyway as a type-level regression guard; the meaningful order checks are the pile tests.

- [ ] **Step 2: Run tests to verify the new block fails**

Run: `npx vitest run tests/playCardSet.test.ts`
Expected: the 3 order-asserting new tests FAIL — TypeScript/runtime accepts the extra field (it's JSON), but `bottom` currently lands at the END (`push`), so `["2-c", "3-d", "A-s", "K-h"]` ≠ `["A-s", "K-h", "2-c", "3-d"]`. The `random` length test may pass by luck of `push` — its existing-order assertion still holds — the `bottom` test is the definitive RED. All pre-existing tests PASS.

- [ ] **Step 3: Add `insertPosition` to the action type**

In `src/shared/types.ts`, replace line 105:

```ts
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile" | "canvas"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

with:

```ts
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile" | "canvas"; fromId: string; toZone: "pile" | "hand"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
```

- [ ] **Step 4: Implement position-aware insertion in the handler**

In `party/index.ts`, the `PLAY_CARD_SET` case currently ends (line 1176):

```ts
        dest.push(...cardsToPlay);
```

Replace with:

```ts
        // 1039: flap drops choose bottom/random; plain drops and hand destinations append (top).
        const setPos = (toZone === "pile" ? action.insertPosition : undefined) ?? "top";
        if (setPos === "bottom") {
          dest.unshift(...cardsToPlay);
        } else if (setPos === "random") {
          for (const card of cardsToPlay) {
            const idx = dest.length === 0 ? 0 : unbiasedRandom(dest.length + 1);
            dest.splice(idx, 0, card);
          }
        } else {
          dest.push(...cardsToPlay);
        }
```

(The `dest.length === 0 ? 0 :` guard mirrors the existing `MOVE_CARD` random insert at `party/index.ts:434`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/playCardSet.test.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/playCardSet.test.ts
git commit -m "feat: PLAY_CARD_SET supports insertPosition (bottom/random) (1039)"
```

---

### Task 2: Pure client drop logic — `src/lib/pileDrop.ts`

**Files:**
- Create: `src/lib/pileDrop.ts`
- Test: `tests/pileDrop.test.ts` (new file)

**Interfaces:**
- Consumes: `ClientAction`, `ClientPile`, `SelectionSource` from `src/shared/types.ts`.
- Produces (used by Tasks 3–4):
  - `type InsertPosition = 'top' | 'bottom' | 'random'`
  - `const FLAP_ROW_HEIGHT = 40` (px)
  - `resolvePileDropAction(args: { cardId: string; fromZone: 'hand' | 'pile' | 'canvas'; fromId: string; toId: string; targetPile: Pick<ClientPile, 'region' | 'cards'> | undefined; insertPosition: InsertPosition | undefined; isIntraSpreadReorder: boolean }): ClientAction | null`
  - `isFlapEligibleDrag(args: { activeCardId: string | null; activePileId: string | null; selectedIds: Set<string>; selectionSource: SelectionSource }): boolean`
  - `flapPlacement(pileBottom: number, viewportHeight: number): 'below' | 'above'`

- [ ] **Step 1: Write the failing tests**

Create `tests/pileDrop.test.ts`:

```ts
/**
 * Unit tests for the pile-drop decision logic (1039).
 *
 * Replaces tests/boardDragLayerDialog.test.ts: the dialog is gone — a plain drop
 * on a non-empty pile inserts at top immediately, and drag-over flaps supply
 * insertPosition 'bottom' / 'random'. Unlike the old file (which tested copied
 * logic), these import the real functions used by BoardDragLayer.
 */
import { describe, it, expect } from "vitest";
import type { Card } from "@shared/types";
import {
  resolvePileDropAction,
  isFlapEligibleDrag,
  flapPlacement,
  FLAP_ROW_HEIGHT,
} from "@/lib/pileDrop";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

const baseArgs = {
  cardId: "A-s",
  fromZone: "hand" as const,
  fromId: "hand",
  toId: "draw",
  insertPosition: undefined,
  isIntraSpreadReorder: false,
};

describe("resolvePileDropAction", () => {
  it("empty pile: sends MOVE_CARD at top (flaps never render on empty piles)", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: { cards: [] } });
    expect(action).toEqual({
      type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "hand",
      toZone: "pile", toId: "draw", insertPosition: "top",
    });
  });

  it("missing pile (undefined): treated as empty, top", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: undefined });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top", toId: "draw" }));
  });

  it("non-empty pile, plain drop (no insertPosition): sends MOVE_CARD at top immediately — no dialog", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: { cards: [makeCard("2-c")] } });
    expect(action).toEqual(expect.objectContaining({ type: "MOVE_CARD", insertPosition: "top" }));
  });

  it("non-empty pile, bottom flap: passes insertPosition through", () => {
    const action = resolvePileDropAction({
      ...baseArgs, targetPile: { cards: [makeCard("2-c")] }, insertPosition: "bottom",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "bottom" }));
  });

  it("non-empty pile, random flap: passes insertPosition through", () => {
    const action = resolvePileDropAction({
      ...baseArgs, targetPile: { cards: [makeCard("2-c")] }, insertPosition: "random",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "random" }));
  });

  it("spread zone: always top even if a flap position sneaks in (GAP-02)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, toId: "spread-p1",
      targetPile: { region: "spread", cards: [makeCard("2-c")] }, insertPosition: "bottom",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top", toId: "spread-p1" }));
  });

  it("intra-spread reorder: returns null — SpreadZone's REORDER_PILE_SPREAD handles it (GAP-06)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, fromZone: "pile", fromId: "spread-p1", toId: "spread-p1",
      targetPile: { region: "spread", cards: [makeCard("2-c")] }, isIntraSpreadReorder: true,
    });
    expect(action).toBeNull();
  });

  it("intra-spread onto EMPTY spread takes the isEmpty path and still sends (GAP-06-D)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, fromZone: "pile", fromId: "spread-p1", toId: "spread-p1",
      targetPile: { region: "spread", cards: [] }, isIntraSpreadReorder: true,
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top" }));
  });
});

describe("isFlapEligibleDrag", () => {
  it("no active card drag: not eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: null, activePileId: null, selectedIds: new Set(), selectionSource: null,
    })).toBe(false);
  });

  it("whole-pile drag: not eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: null, activePileId: "pile-1", selectedIds: new Set(), selectionSource: null,
    })).toBe(false);
  });

  it("plain single-card drag: eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null, selectedIds: new Set(), selectionSource: null,
    })).toBe(true);
  });

  it("multi-card set drag (unmasked): eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null,
      selectedIds: new Set(["A-s", "K-h"]),
      selectionSource: { zone: "hand", zoneId: "hand" },
    })).toBe(true);
  });

  it("masked-pile group drag: NOT eligible (resolves to MOVE_ALL_PILE_CARDS)", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null,
      selectedIds: new Set(["A-s"]),
      selectionSource: { zone: "pile", zoneId: "pile-1", hasMaskedCards: true },
    })).toBe(false);
  });

  it("masked selection but dragging a card OUTSIDE it: eligible (selection will be cleared on dragStart)", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "Q-d", activePileId: null,
      selectedIds: new Set(["A-s"]),
      selectionSource: { zone: "pile", zoneId: "pile-1", hasMaskedCards: true },
    })).toBe(true);
  });
});

describe("flapPlacement", () => {
  it("renders below when the row fits above the viewport bottom", () => {
    expect(flapPlacement(600, 720)).toBe("below");
  });

  it("flips above when the row would overflow the viewport bottom", () => {
    expect(flapPlacement(720 - FLAP_ROW_HEIGHT, 720)).toBe("above");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/pileDrop.test.ts`
Expected: FAIL — `Cannot find module '@/lib/pileDrop'` (or equivalent resolve error).

- [ ] **Step 3: Implement `src/lib/pileDrop.ts`**

```ts
import type { ClientAction, ClientPile, SelectionSource } from '@/shared/types';

export type InsertPosition = 'top' | 'bottom' | 'random';

// Height of the flap row in px — shared by PileDropFlaps (render) and flapPlacement (flip check).
export const FLAP_ROW_HEIGHT = 40;

// Decides the MOVE_CARD to dispatch for a single-card drop resolving to a pile (1039).
// Returns null when nothing should be dispatched (intra-spread reorder — SpreadZone's
// useDndMonitor sends REORDER_PILE_SPREAD instead, GAP-06).
export function resolvePileDropAction(args: {
  cardId: string;
  fromZone: 'hand' | 'pile' | 'canvas';
  fromId: string;
  toId: string;
  targetPile: Pick<ClientPile, 'region' | 'cards'> | undefined;
  insertPosition: InsertPosition | undefined;
  isIntraSpreadReorder: boolean;
}): ClientAction | null {
  const { cardId, fromZone, fromId, toId, targetPile, insertPosition, isIntraSpreadReorder } = args;
  const base = { type: 'MOVE_CARD' as const, cardId, fromZone, fromId, toZone: 'pile' as const, toId };
  const isEmpty = !targetPile || targetPile.cards.length === 0;
  // Empty pile: position is meaningless — always top (D-02, D-03).
  if (isEmpty) return { ...base, insertPosition: 'top' };
  // Spread zones always insert at top (GAP-02).
  if (targetPile.region === 'spread') {
    if (isIntraSpreadReorder) return null;
    return { ...base, insertPosition: 'top' };
  }
  // Non-empty regular pile: flap position if the drop hit one; plain drop = top.
  return { ...base, insertPosition: insertPosition ?? 'top' };
}

// True while the active drag could end in a positioned pile drop — gates flap rendering.
// Whole-pile drags reposition/merge (no position choice) and masked-pile group drags
// resolve to MOVE_ALL_PILE_CARDS (server moves the whole pile), so both are excluded.
export function isFlapEligibleDrag(args: {
  activeCardId: string | null;
  activePileId: string | null;
  selectedIds: Set<string>;
  selectionSource: SelectionSource;
}): boolean {
  const { activeCardId, activePileId, selectedIds, selectionSource } = args;
  if (activeCardId === null) return false;
  if (activePileId !== null) return false;
  const hasMaskedCardsInSource =
    selectionSource !== null &&
    selectionSource.zone !== 'canvas' &&
    selectionSource.hasMaskedCards === true;
  if (hasMaskedCardsInSource && selectedIds.has(activeCardId)) return false;
  return true;
}

// Flap row sits below the pile unless it would overflow the viewport bottom.
export function flapPlacement(pileBottom: number, viewportHeight: number): 'below' | 'above' {
  return pileBottom + FLAP_ROW_HEIGHT > viewportHeight ? 'above' : 'below';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/pileDrop.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pileDrop.ts tests/pileDrop.test.ts
git commit -m "feat: pure pile-drop decision logic for placement flaps (1039)"
```

---

### Task 3: BoardDragLayer — remove the dialog, send positions directly

**Files:**
- Modify: `src/components/BoardDragLayer.tsx`
- Delete: `tests/boardDragLayerDialog.test.ts` (contract replaced by `tests/pileDrop.test.ts`)

**Interfaces:**
- Consumes: `resolvePileDropAction`, `InsertPosition` from `src/lib/pileDrop.ts` (Task 2).
- Produces: pile drops dispatch immediately with `insertPosition` from drop-target data; `overData` on droppables may now carry `insertPosition` (Task 4's flaps set it).

- [ ] **Step 1: Delete the obsolete dialog test file**

```bash
git rm tests/boardDragLayerDialog.test.ts
```

(Do not run the suite yet — it still passes either way since those tests exercised copied logic; the deletion is committed together with the dialog removal below.)

- [ ] **Step 2: Remove dialog imports and add the lib import**

In `src/components/BoardDragLayer.tsx`:

Remove these two imports (lines 5 and 7 — `Dialog` and `Button` are used only by the dialog JSX):

```ts
import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@/components/ui/button';
```

Add after the `canvasPileDrag` import (line 12):

```ts
import { resolvePileDropAction, type InsertPosition } from '@/lib/pileDrop';
```

- [ ] **Step 3: Remove pending-move state and the dialog machinery**

Delete the `PendingMove` type (lines 87–93):

```ts
type PendingMove = {
  card: Card;
  fromZone: 'hand' | 'pile' | 'canvas'; // D-11: widened to support canvas → pile dialog path
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};
```

Delete the state/ref declarations (lines 102 and 113):

```ts
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
```

```ts
  const topButtonRef = useRef<HTMLButtonElement>(null);
```

Delete the whole `sendPendingMove` function (lines 307–324):

```ts
  function sendPendingMove(insertPosition: 'top' | 'bottom' | 'random') {
    ...
  }
```

- [ ] **Step 4: Widen the overData cast and dispatch pile drops immediately**

Replace line 578:

```ts
    const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
```

with:

```ts
    const overData = event.over?.data.current as { toZone: string; toId: string; insertPosition?: InsertPosition } | undefined;
```

In the `isMultiCardSet` branch, replace the `PLAY_CARD_SET` dispatch (lines 619–626):

```ts
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: setFromZone,
          fromId: setFromId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
        });
```

with:

```ts
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: setFromZone,
          fromId: setFromId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
          // 1039: flap drops carry bottom/random; undefined (plain drop / hand dest) = top
          insertPosition: overData!.insertPosition,
        });
```

Replace the entire `toZone === 'pile'` branch of the single-card success path (lines 663–699):

```ts
      if (toZone === 'pile') {
        const targetPile = gameState.piles.find(p => p.id === toId);
        const isEmpty = !targetPile || targetPile.cards.length === 0;
        if (isEmpty) {
          // Empty zone: bypass dialog, place at top immediately (D-02, D-03)
          sendAction({
            type: 'MOVE_CARD',
            cardId: card.id,
            fromZone: fromZone as 'hand' | 'pile' | 'canvas',
            fromId,
            toZone,
            toId,
            insertPosition: 'top',
          });
        } else {
          // Check if destination is a spread zone — spread zones always insert at top, no dialog (GAP-02)
          const isSpread = targetPile?.region === 'spread';
          if (isSpread) {
            // GAP-06: intra-spread reorder — skip MOVE_CARD so SpreadZone's useDndMonitor
            // REORDER_PILE_SPREAD handler can fire without BoardDragLayer racing it.
            // Reuse outer isIntraSpreadReorder (computed at top of handleDragEnd, D-02 Phase 21).
            if (!isIntraSpreadReorder) {
              sendAction({
                type: 'MOVE_CARD',
                cardId: card.id,
                fromZone: fromZone as 'hand' | 'pile' | 'canvas',
                fromId,
                toZone,
                toId,
                insertPosition: 'top',
              });
            }
          } else {
            // Non-empty pile (non-spread): intercept and show position dialog (D-01, D-11)
            setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile' | 'canvas', fromId, toZone, toId });
          }
        }
      } else {
```

with:

```ts
      if (toZone === 'pile') {
        // 1039: plain drop = top immediately; drag-over flaps supply bottom/random via overData.
        const action = resolvePileDropAction({
          cardId: card.id,
          fromZone: fromZone as 'hand' | 'pile' | 'canvas',
          fromId,
          toId,
          targetPile: gameState.piles.find(p => p.id === toId),
          insertPosition: overData!.insertPosition,
          isIntraSpreadReorder,
        });
        if (action) sendAction(action);
      } else {
```

- [ ] **Step 5: Remove the dialog JSX and its wrapper**

Replace the component's return statement (lines 750–825). Currently:

```tsx
  return (
    <div className="contents">
      <DndContext
        ...
      </DndContext>

      {/* Insert-position dialog — appears after non-empty pile drop (D-01) */}
      <Dialog.Root ...>
        ...
      </Dialog.Root>
    </div>
  );
```

The `<div className="contents">` wrapper existed only to host the dialog sibling. Return the `DndContext` directly — delete the wrapper `<div className="contents">` / closing `</div>`, and delete everything from `{/* Insert-position dialog — appears after non-empty pile drop (D-01) */}` through `</Dialog.Root>` inclusive. The `DndContext ... /DndContext` block itself is unchanged.

- [ ] **Step 6: Typecheck and run the unit suite**

Run: `npm run typecheck && npx vitest run`
Expected: PASS (no unused-import or missing-symbol errors; all suites green).

- [ ] **Step 7: Commit**

```bash
git add src/components/BoardDragLayer.tsx tests/boardDragLayerDialog.test.ts
git commit -m "feat: pile drops insert at top immediately, no dialog (1039)"
```

---

### Task 4: `PileDropFlaps` component + wiring into piles

**Files:**
- Create: `src/components/PileDropFlaps.tsx`
- Modify: `src/components/BoardDragLayer.tsx` (compute + pass `flapDragActive`)
- Modify: `src/components/BoardView.tsx` (thread prop to `PileZone` and `CanvasZone`)
- Modify: `src/components/CanvasZone.tsx` (thread prop to `CanvasPileZone`)
- Modify: `src/components/PileZone.tsx` (render flaps)
- Modify: `src/components/CanvasPileZone.tsx` (render flaps)

**Interfaces:**
- Consumes: `isFlapEligibleDrag`, `flapPlacement`, `FLAP_ROW_HEIGHT` from `src/lib/pileDrop.ts` (Task 2); flap droppable data shape `{ toZone: 'pile', toId, insertPosition }` consumed by Task 3's `handleDragEnd`.
- Produces: `PileDropFlaps({ pileId: string; pileIsOver: boolean; dragEligible: boolean })` component; `flapDragActive: boolean` prop on `BoardView`, `PileZone`, `CanvasZone`, `CanvasPileZone`. Flap droppable IDs `pile-flap-{pileId}-bottom` / `pile-flap-{pileId}-random` (the `pile-` prefix routes them through `customCollision`'s existing pile tier untouched); test IDs match the droppable IDs.

- [ ] **Step 1: Create `src/components/PileDropFlaps.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FLAP_ROW_HEIGHT, flapPlacement } from '@/lib/pileDrop';

interface PileDropFlapsProps {
  pileId: string;
  pileIsOver: boolean; // isOver of the pile's own droppable, from the parent zone
  dragEligible: boolean; // a flap-eligible card drag is in progress (isFlapEligibleDrag)
}

function Flap({
  setNodeRef,
  isOver,
  testId,
  label,
}: {
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
  testId: string;
  label: string;
}) {
  return (
    <div
      ref={setNodeRef}
      data-testid={testId}
      className={cn(
        'flex-1 flex items-center justify-center rounded text-xs font-medium border border-dashed',
        isOver
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-muted-foreground/50 bg-card/90 text-muted-foreground'
      )}
    >
      {label}
    </div>
  );
}

// Drag-over placement flaps (1039): while an eligible card drag hovers the pile,
// Bottom/Random drop targets slide out flush against it; a plain drop on the pile
// itself inserts at top. `armed` keeps the flaps mounted while the pointer crosses
// from the pile onto a flap (the row is flush, so there is no dead gap) and disarms
// when the pointer leaves both. The refs only attach while armed, so an unarmed
// flap has no rect and can never swallow a drop the player didn't aim at.
export function PileDropFlaps({ pileId, pileIsOver, dragEligible }: PileDropFlapsProps) {
  const [armed, setArmed] = useState(false);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const bottomFlap = useDroppable({
    id: `pile-flap-${pileId}-bottom`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'bottom' as const },
  });
  const randomFlap = useDroppable({
    id: `pile-flap-${pileId}-random`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'random' as const },
  });
  const flapIsOver = bottomFlap.isOver || randomFlap.isOver;

  useEffect(() => {
    if (!dragEligible) {
      setArmed(false);
    } else if (pileIsOver) {
      const anchor = wrapperRef.current?.parentElement;
      if (anchor) {
        setPlacement(flapPlacement(anchor.getBoundingClientRect().bottom, window.innerHeight));
      }
      setArmed(true);
    } else if (!flapIsOver) {
      setArmed(false);
    }
  }, [dragEligible, pileIsOver, flapIsOver]);

  if (!dragEligible) return null;

  return (
    // pointer-events-none: dnd-kit collision is rect-based, and the flaps must never
    // intercept clicks or arm the parent pile's own drag listeners.
    <div
      ref={wrapperRef}
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none',
        placement === 'below' ? 'top-full' : 'bottom-full'
      )}
    >
      {armed && (
        <div className="flex w-28 gap-0.5 p-0.5 rounded-md bg-popover/90 backdrop-blur-sm shadow-md" style={{ height: FLAP_ROW_HEIGHT }}>
          <Flap setNodeRef={bottomFlap.setNodeRef} isOver={bottomFlap.isOver} testId={`pile-flap-${pileId}-bottom`} label="Bottom" />
          <Flap setNodeRef={randomFlap.setNodeRef} isOver={randomFlap.isOver} testId={`pile-flap-${pileId}-random`} label="Random" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compute and pass `flapDragActive` in `BoardDragLayer.tsx`**

Add to the imports from `@/lib/pileDrop` (extending Task 3's import line):

```ts
import { resolvePileDropAction, isFlapEligibleDrag, type InsertPosition } from '@/lib/pileDrop';
```

After the `activePile` lookup (`const activePile = activePileId ? ... : null;`, line ~748), add:

```ts
  const flapDragActive = isFlapEligibleDrag({
    activeCardId: activeCard?.id ?? null,
    activePileId,
    selectedIds,
    selectionSource,
  });
```

In the `<BoardView ... />` element, add the prop `flapDragActive={flapDragActive}` alongside the existing props.

- [ ] **Step 3: Thread the prop through `BoardView.tsx`**

Add to `BoardViewProps` (after `konamiActive: boolean;`):

```ts
  flapDragActive: boolean;
```

Add `flapDragActive` to the destructured parameter list of `BoardView`, then:

- In the `pilePiles.map` render of `<PileZone ... />` (line 136), add prop: `flapDragActive={flapDragActive}`
- In the `<CanvasZone ... />` element (line 143), add prop: `flapDragActive={flapDragActive}`

- [ ] **Step 4: Thread the prop through `CanvasZone.tsx`**

Add to `CanvasZoneProps`:

```ts
  flapDragActive: boolean;
```

Add `flapDragActive` to `CanvasZone`'s destructured parameters, and in the `canvasPiles.map` render of `<CanvasPileZone ... />` (line 386), add prop: `flapDragActive={flapDragActive}`.

- [ ] **Step 5: Render flaps in `PileZone.tsx`**

Add to imports:

```ts
import { PileDropFlaps } from './PileDropFlaps';
```

Add to `PileZoneProps`:

```ts
  flapDragActive?: boolean;
```

Add `flapDragActive = false` to the destructured parameters. In the pile drop `div` (the one with `ref={setNodeRef}` and `data-testid={`pile-${pile.id}`}`, which already has `relative` in its className), add as the last child, after the count `Badge`:

```tsx
        {!isEmpty && <PileDropFlaps pileId={pile.id} pileIsOver={isOver} dragEligible={flapDragActive} />}
```

- [ ] **Step 6: Render flaps in `CanvasPileZone.tsx`**

Add to imports:

```ts
import { PileDropFlaps } from './PileDropFlaps';
```

Add to `CanvasPileZoneProps`:

```ts
  flapDragActive?: boolean;
```

Add `flapDragActive = false` to the destructured parameters. In the outer frame `div` (the one with `ref={setRefs}` and `data-canvas-pile=""` — it is `position: absolute`, so absolute children anchor to it), add as the last child, after the floating-controls `div`:

```tsx
      <PileDropFlaps pileId={pile.id} pileIsOver={isOver} dragEligible={flapDragActive} />
```

(No `isEmpty` guard needed — `CanvasPileZone` early-returns `null` when the pile is empty.)

- [ ] **Step 7: Typecheck and run the unit suite**

Run: `npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/PileDropFlaps.tsx src/components/BoardDragLayer.tsx src/components/BoardView.tsx src/components/CanvasZone.tsx src/components/PileZone.tsx src/components/CanvasPileZone.tsx
git commit -m "feat: drag-over Bottom/Random placement flaps on piles (1039)"
```

---

### Task 5: Playwright — update dialog spec, add flap coverage

**Files:**
- Modify: `playwright/runtimePiles.spec.ts:87-103` (dialog interaction is gone)
- Create: `playwright/pileDropFlaps.spec.ts`

**Interfaces:**
- Consumes: flap test IDs `pile-flap-{pileId}-bottom` / `-random` (Task 4); pile count badge inside `[data-testid="pile-draw"]`; helper patterns (`joinRoom`, `dealCards`, `pointerDrag`) copied per repo convention of self-contained spec files.

- [ ] **Step 1: Update `runtimePiles.spec.ts`**

Replace lines 87–103 (from the `// Non-empty pile drop → insert-position dialog` comment through the two count assertions):

```ts
    // Non-empty pile drop → insert-position dialog
    await expect(pageB.getByText('Insert card where?')).toBeVisible();
    // Dialog.Popup's initialFocus targets the Top button; focus landing there is deterministic
    // proof the popup mounted. But Base UI's FloatingFocusManager commits focus in a layout
    // effect while its own interaction wiring (outside-press/click handling) attaches in a
    // passive effect that runs a frame later — clicking in that gap gets silently swallowed
    // (verified via WS frame capture: no MOVE_CARD is ever sent when the click misses).
    // Waiting two animation frames after focus lands, instead of a raw sleep, ties the wait to
    // that passive-effect flush rather than an arbitrary duration.
    const topButton = pageB.getByRole('button', { name: 'Top' });
    await expect(topButton).toBeFocused();
    await pageB.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await topButton.click();
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
```

with:

```ts
    // 1039: plain drop on a non-empty pile inserts at top immediately — no dialog
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
```

- [ ] **Step 2: Create `playwright/pileDropFlaps.spec.ts`**

```ts
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
  await page.locator('input[type="number"][max]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
}

async function center(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`no bounding box for ${testId}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function handCardCenter(page: Page, nth = 0): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('hand-zone').locator('[aria-pressed]').nth(nth).boundingBox();
  if (!box) throw new Error('no hand card box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('pile drop placement flaps (1039)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('plain drop on the draw pile inserts immediately with no dialog', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4); // draw pile: 52 - 4 = 48
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('49');
    await expect(page.getByText('Insert card where?')).toHaveCount(0);
  });

  test('flaps appear on drag-over and dropping on Bottom inserts the card', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    const bottomFlap = page.getByTestId('pile-flap-draw-bottom');
    await expect(bottomFlap).toHaveCount(0); // hidden before any drag

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });

    // Flaps slide out while hovering the pile mid-drag
    await expect(bottomFlap).toBeVisible();
    await expect(page.getByTestId('pile-flap-draw-random')).toBeVisible();

    const flapBox = await bottomFlap.boundingBox();
    if (!flapBox) throw new Error('no flap box');
    await page.mouse.move(flapBox.x + flapBox.width / 2, flapBox.y + flapBox.height / 2, { steps: 15 });
    await expect(bottomFlap).toBeVisible(); // stays armed while pointer is on the flap
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('49');
  });

  test('flaps retract when the drag moves away without dropping', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    const canvasBox = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvasBox) throw new Error('no canvas box');

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    await expect(page.getByTestId('pile-flap-draw-bottom')).toBeVisible();

    // Drag away from pile and flaps (to mid-canvas): flaps disarm
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + 100, { steps: 15 });
    await expect(page.getByTestId('pile-flap-draw-bottom')).toHaveCount(0);
    await page.mouse.up(); // ends as a canvas drop; irrelevant to the assertion
  });

  test('multi-card set dropped on the Random flap moves the whole set into the pile', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    // Select two hand cards (click toggles selection)
    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    await handCards.nth(0).click();
    await handCards.nth(1).click();
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed="true"]')).toHaveCount(2);

    // Drag one selected card over the pile, drop on the Random flap
    const from = await handCardCenter(page, 0);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    const randomFlap = page.getByTestId('pile-flap-draw-random');
    await expect(randomFlap).toBeVisible();
    const flapBox = await randomFlap.boundingBox();
    if (!flapBox) throw new Error('no flap box');
    await page.mouse.move(flapBox.x + flapBox.width / 2, flapBox.y + flapBox.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('50');
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(2);
  });
});
```

- [ ] **Step 3: Run the affected e2e specs**

The worktree runs its own servers — kill any listeners the root checkout holds first (LISTEN-scoped only, never bare `-ti :PORT`):

```bash
lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill 2>/dev/null; lsof -ti tcp:1999 -sTCP:LISTEN | xargs kill 2>/dev/null
npm run test:e2e -- pileDropFlaps.spec.ts runtimePiles.spec.ts
```

Expected: all tests in both specs PASS. (Playwright auto-starts both dev servers from the worktree cwd. If a hand-card click races hydration, wait on `aria-pressed` per the E2E flakiness notes — the selectors above already use `[aria-pressed]`.)

- [ ] **Step 4: Commit**

```bash
git add playwright/runtimePiles.spec.ts playwright/pileDropFlaps.spec.ts
git commit -m "test: e2e coverage for pile drop flaps; drop dialog interaction (1039)"
```

---

### Task 6: Backlog/roadmap bookkeeping + full verification

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md` (remove the 1039 row)
- Modify: `.planning/ROADMAP.md` (add v1.28 milestone line)

**Interfaces:**
- Consumes: nothing from other tasks (docs only).
- Produces: shipped-work record required by the repo's Git Workflow before opening the PR.

- [ ] **Step 1: Remove item 1039 from the backlog**

In `docs/superpowers/specs/BACKLOG.md`, delete the table row starting with `| 1039 |` (the last row of the table).

- [ ] **Step 2: Add the milestone entry**

In `.planning/ROADMAP.md`, after the `v1.27 Runtime Piles` line (line 32), add:

```markdown
- ✅ **v1.28 Pile Drop Placement Flaps** — Removed the Top/Bottom/Random pile-drop dialog: plain drops insert at top instantly; drag-over Bottom/Random flaps beside the pile place cards directly (single cards and multi-card sets via `PLAY_CARD_SET.insertPosition`), never revealing the card on top. Design: docs/superpowers/specs/2026-07-09-pile-drop-flaps-design.md — 1039 (shipped 2026-07-09)
```

- [ ] **Step 3: Full verification**

```bash
npm run typecheck && npx vitest run
npm run test:e2e
```

Expected: everything PASSES (full e2e suite, not just the two touched specs — flap droppables changed collision-adjacent behavior, so the whole drag surface needs a green run).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "docs: record v1.28 pile drop flaps milestone; remove 1039 from backlog (1039)"
```

---

## After the Plan

Run a code review (`requesting-code-review` / `code-review` skill) per project convention, then use `superpowers:finishing-a-development-branch` to push and open the PR (the pre-push hook runs e2e when both dev servers are up).
