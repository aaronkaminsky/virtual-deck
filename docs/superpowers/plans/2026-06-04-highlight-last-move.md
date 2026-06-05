# Highlight Last Move (999.38) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a fading blue-teal glow on the card or zone most recently touched, lasting 8 seconds, visible to all players, clearing immediately on undo or the next qualifying action.

**Architecture:** The server emits a `LAST_MOVE` side-channel event after each qualifying action and a `CLEAR_LAST_MOVE` on undo, mirroring the existing `PILE_SHUFFLED` pattern. `usePartySocket` tracks the highlighted move in state with an 8s timer. The `highlightedMove` value threads from `usePartySocket → App.tsx → BoardDragLayer → BoardView → zone components`. Each zone component applies the `last-move-highlight` CSS class when its element matches. The class drives a CSS animation that fades the glow; removing the class restores normal styles cleanly (no `animation-fill-mode: forwards`).

**Tech Stack:** TypeScript, React, PartyKit (Cloudflare Workers), Vitest (unit), Playwright (e2e), CSS keyframes.

---

## File Map

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `LastMoveHighlight` type; add `LAST_MOVE` and `CLEAR_LAST_MOVE` to `ServerEvent` |
| `party/index.ts` | Add `broadcastLastMove` + `broadcastClearLastMove` private methods; wire up 6 actions + UNDO_MOVE |
| `src/hooks/usePartySocket.ts` | Add `highlightedMove` state, `highlightTimerRef`, two new event handlers, expose in return value |
| `src/App.tsx` | Destructure `highlightedMove`; pass to `BoardDragLayer` |
| `src/components/BoardDragLayer.tsx` | Add `highlightedMove` to props interface; pass to `BoardView` |
| `src/components/BoardView.tsx` | Add `highlightedMove` to props interface; pass to 5 zone components |
| `src/components/PileZone.tsx` | Accept `highlightedMove`; apply class to droppable div |
| `src/components/SpreadZone.tsx` | Accept `highlightedMove`; compute per-card `isHighlighted`; pass boolean to `SortableSpreadCard` |
| `src/components/HandZone.tsx` | Accept `highlightedMove`; compute per-card `isHighlighted`; pass boolean to `SortableHandCard` |
| `src/components/OpponentHand.tsx` | Accept `highlightedMove`; apply class to zone container |
| `src/components/CanvasZone.tsx` | Accept `highlightedMove`; compute per-card `isHighlighted`; pass to `CanvasDraggableCard` |
| `src/components/CanvasDraggableCard.tsx` | Accept `isHighlighted`; apply class |
| `src/globals.css` | Add `@keyframes last-move-pulse` and `.last-move-highlight` |
| `tests/moveCard.test.ts` | Add LAST_MOVE cases for hand→pile and pile→hand moves |
| `tests/flipCard.test.ts` | Add LAST_MOVE case for FLIP_CARD |
| `tests/playCardSet.test.ts` | Add LAST_MOVE case for PLAY_CARD_SET |
| `tests/undoMove.test.ts` | Add CLEAR_LAST_MOVE case for UNDO_MOVE |
| `tests/passCard.test.ts` | Add LAST_MOVE case for PASS_CARD |
| `tests/canvasCards.test.ts` | Add LAST_MOVE cases for PLACE_ON_CANVAS and GROUP_PLACE_ON_CANVAS |
| `playwright/highlight.spec.ts` | Multiplayer e2e: P1 moves card → P2 sees highlight; undo clears it |

---

## Task 1: Shared Types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add `LastMoveHighlight` type and new `ServerEvent` variants**

  Open `src/shared/types.ts`. After the existing `SelectionSource` type (line 96), add:

  ```ts
  export type LastMoveHighlight = {
    toZoneType: "hand" | "pile" | "canvas";
    toZoneId: string;
    cardIds: string[];
  };
  ```

  Then extend `ServerEvent` (currently ends at line 102) to add two new variants:

  ```ts
  export type ServerEvent =
    | { type: "STATE_UPDATE"; state: ClientGameState }
    | { type: "ERROR"; code: string; message: string }
    | { type: "PILE_SHUFFLED"; pileId: string }
    | { type: "EFFECT"; kind: "deal" | "celebrate" }
    | { type: "LAST_MOVE"; toZoneType: "hand" | "pile" | "canvas"; toZoneId: string; cardIds: string[] }
    | { type: "CLEAR_LAST_MOVE" };
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/shared/types.ts
  git commit -m "feat: add LAST_MOVE / CLEAR_LAST_MOVE to ServerEvent and LastMoveHighlight type"
  ```

---

## Task 2: Server Unit Tests (RED)

**Files:**
- Modify: `tests/moveCard.test.ts`, `tests/flipCard.test.ts`, `tests/playCardSet.test.ts`, `tests/undoMove.test.ts`, `tests/passCard.test.ts`, `tests/canvasCards.test.ts`

Write all tests first, confirm they fail, then implement in Task 3.

The helper pattern used in these tests:

```ts
import { makeMockRoom, makeMockConnection } from "./helpers";

function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string))
    .filter((e: { type: string }) => e.type === "LAST_MOVE");
}

function clearLastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string))
    .filter((e: { type: string }) => e.type === "CLEAR_LAST_MOVE");
}
```

- [ ] **Step 1: Add LAST_MOVE tests to `tests/moveCard.test.ts`**

  At the bottom of the file, add a new describe block:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
  }

  describe("MOVE_CARD LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with toZoneType=pile and cardId after hand→pile move", async () => {
      const conn1 = makeMockConnection("player-1");
      const conn2 = makeMockConnection("player-2");
      const room = new GameRoom(makeMockRoom([conn1, conn2]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [makeCard("A-s")];

      await room.onMessage(JSON.stringify({
        type: "MOVE_CARD", cardId: "A-s",
        fromZone: "hand", fromId: "player-1",
        toZone: "pile", toId: "discard",
      }), conn1);

      for (const conn of [conn1, conn2]) {
        const msgs = lastMoveMessages(conn);
        expect(msgs).toHaveLength(1);
        expect(msgs[0].toZoneType).toBe("pile");
        expect(msgs[0].toZoneId).toBe("discard");
        expect(msgs[0].cardIds).toEqual(["A-s"]);
      }
    });

    it("emits LAST_MOVE with toZoneType=hand after pile→hand move", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [];
      room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("K-h"));

      await room.onMessage(JSON.stringify({
        type: "MOVE_CARD", cardId: "K-h",
        fromZone: "pile", fromId: "discard",
        toZone: "hand", toId: "player-1",
      }), conn1);

      const msgs = lastMoveMessages(conn1);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].toZoneType).toBe("hand");
      expect(msgs[0].toZoneId).toBe("player-1");
      expect(msgs[0].cardIds).toEqual(["K-h"]);
    });

    it("does not emit LAST_MOVE when MOVE_CARD fails (card not found)", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [];

      await room.onMessage(JSON.stringify({
        type: "MOVE_CARD", cardId: "A-s",
        fromZone: "hand", fromId: "player-1",
        toZone: "pile", toId: "discard",
      }), conn1);

      expect(lastMoveMessages(conn1)).toHaveLength(0);
    });
  });
  ```

  (The `makeCard` function is already defined locally in `tests/moveCard.test.ts`.)

- [ ] **Step 2: Add LAST_MOVE test to `tests/flipCard.test.ts`**

  At the bottom of the file, add:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
  }

  describe("FLIP_CARD LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with toZoneType=pile after flipping a card", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      const discardPile = room.gameState.piles.find(p => p.id === "discard")!;
      discardPile.faceUp = true;
      discardPile.cards.push({ id: "Q-d", suit: "diamonds", rank: "Q", faceUp: true });

      await room.onMessage(JSON.stringify({
        type: "FLIP_CARD", pileId: "discard", cardId: "Q-d",
      }), conn1);

      const msgs = lastMoveMessages(conn1);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].toZoneType).toBe("pile");
      expect(msgs[0].toZoneId).toBe("discard");
      expect(msgs[0].cardIds).toEqual(["Q-d"]);
    });
  });
  ```

- [ ] **Step 3: Add LAST_MOVE test to `tests/playCardSet.test.ts`**

  At the bottom of the file, add:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
  }

  describe("PLAY_CARD_SET LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with all cardIds after multi-card play", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [
        { id: "A-s", suit: "spades", rank: "A", faceUp: true },
        { id: "2-s", suit: "spades", rank: "2", faceUp: true },
      ];

      await room.onMessage(JSON.stringify({
        type: "PLAY_CARD_SET",
        cardIds: ["A-s", "2-s"],
        fromZone: "hand", fromId: "player-1",
        toZone: "pile", toId: "discard",
      }), conn1);

      const msgs = lastMoveMessages(conn1);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].toZoneType).toBe("pile");
      expect(msgs[0].toZoneId).toBe("discard");
      expect(msgs[0].cardIds).toEqual(["A-s", "2-s"]);
    });
  });
  ```

- [ ] **Step 4: Add CLEAR_LAST_MOVE test to `tests/undoMove.test.ts`**

  At the bottom of the file, add:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function clearMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "CLEAR_LAST_MOVE");
  }

  describe("UNDO_MOVE CLEAR_LAST_MOVE broadcast", () => {
    it("emits CLEAR_LAST_MOVE to all connections after undo", async () => {
      const conn1 = makeMockConnection("player-1");
      const conn2 = makeMockConnection("player-2");
      const room = new GameRoom(makeMockRoom([conn1, conn2]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [{ id: "A-s", suit: "spades", rank: "A", faceUp: true }];
      // Ensure there is a snapshot to undo
      takeSnapshot(room.gameState);

      await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), conn1);

      for (const conn of [conn1, conn2]) {
        const msgs = clearMessages(conn);
        expect(msgs).toHaveLength(1);
      }
    });

    it("does not emit CLEAR_LAST_MOVE when there is nothing to undo", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      // No snapshots

      await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), conn1);

      const msgs = clearMessages(conn1);
      expect(msgs).toHaveLength(0);
    });
  });
  ```

  Also add `takeSnapshot` to the imports at the top of the file (it is already imported in `undoMove.test.ts`; verify before adding).

- [ ] **Step 5: Add LAST_MOVE test to `tests/passCard.test.ts`**

  At the bottom of the file, add:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
  }

  describe("PASS_CARD LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with toZoneType=hand and targetPlayerId after pass", async () => {
      const conn1 = makeMockConnection("player-1");
      const conn2 = makeMockConnection("player-2");
      const room = new GameRoom(makeMockRoom([conn1, conn2]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [{ id: "J-c", suit: "clubs", rank: "J", faceUp: true }];
      room.gameState.hands["player-2"] = [];

      await room.onMessage(JSON.stringify({
        type: "PASS_CARD", cardId: "J-c", targetPlayerId: "player-2",
      }), conn1);

      for (const conn of [conn1, conn2]) {
        const msgs = lastMoveMessages(conn);
        expect(msgs).toHaveLength(1);
        expect(msgs[0].toZoneType).toBe("hand");
        expect(msgs[0].toZoneId).toBe("player-2");
        expect(msgs[0].cardIds).toEqual(["J-c"]);
      }
    });
  });
  ```

- [ ] **Step 6: Add LAST_MOVE tests to `tests/canvasCards.test.ts`**

  At the bottom of the file, add:

  ```ts
  import { makeMockRoom, makeMockConnection } from "./helpers";

  function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
    return conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
  }

  describe("PLACE_ON_CANVAS LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with toZoneType=canvas after placing a card on canvas", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [{ id: "5-h", suit: "hearts", rank: "5", faceUp: true }];

      await room.onMessage(JSON.stringify({
        type: "PLACE_ON_CANVAS", cardId: "5-h",
        fromZone: "hand", fromId: "player-1",
        x: 100, y: 200,
      }), conn1);

      const msgs = lastMoveMessages(conn1);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].toZoneType).toBe("canvas");
      expect(msgs[0].toZoneId).toBe("canvas");
      expect(msgs[0].cardIds).toEqual(["5-h"]);
    });
  });

  describe("GROUP_PLACE_ON_CANVAS LAST_MOVE broadcast", () => {
    it("emits LAST_MOVE with all cardIds after group place", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [
        { id: "5-h", suit: "hearts", rank: "5", faceUp: true },
        { id: "6-h", suit: "hearts", rank: "6", faceUp: true },
      ];

      await room.onMessage(JSON.stringify({
        type: "GROUP_PLACE_ON_CANVAS",
        fromZone: "hand", fromId: "player-1",
        cards: [{ cardId: "5-h", x: 100, y: 200 }, { cardId: "6-h", x: 150, y: 200 }],
      }), conn1);

      const msgs = lastMoveMessages(conn1);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].toZoneType).toBe("canvas");
      expect(msgs[0].toZoneId).toBe("canvas");
      expect(msgs[0].cardIds).toEqual(expect.arrayContaining(["5-h", "6-h"]));
      expect(msgs[0].cardIds).toHaveLength(2);
    });
  });
  ```

- [ ] **Step 7: Non-qualifying actions must NOT emit LAST_MOVE**

  Add to any convenient test file (e.g., `tests/moveCard.test.ts`):

  ```ts
  describe("Non-qualifying actions do not emit LAST_MOVE", () => {
    it("SHUFFLE_PILE does not emit LAST_MOVE", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });

      await room.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), conn1);

      expect(lastMoveMessages(conn1)).toHaveLength(0);
    });

    it("DEAL_CARDS does not emit LAST_MOVE", async () => {
      vi.useFakeTimers();
      try {
        const conn1 = makeMockConnection("player-1");
        const room = new GameRoom(makeMockRoom([conn1]));
        room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
        room.gameState.hands["player-1"] = [];

        const pending = room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), conn1);
        await vi.runAllTimersAsync();
        await pending;

        expect(lastMoveMessages(conn1)).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it("RESET_TABLE does not emit LAST_MOVE", async () => {
      const conn1 = makeMockConnection("player-1");
      const room = new GameRoom(makeMockRoom([conn1]));
      room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
      room.gameState.hands["player-1"] = [];
      room.gameState.phase = "playing";

      await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), conn1);

      expect(lastMoveMessages(conn1)).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 8: Run tests and confirm they all fail**

  Run: `npm test`
  Expected: New test cases FAIL with "Expected length: 1, Received length: 0" (LAST_MOVE not yet emitted). All existing tests still PASS.

---

## Task 3: Server Implementation

**Files:**
- Modify: `party/index.ts`

- [ ] **Step 1: Add `broadcastLastMove` and `broadcastClearLastMove` private methods**

  Add these two private methods to the `GameRoom` class (after `broadcastState`, before the closing brace of the class):

  ```ts
  private broadcastLastMove(toZoneType: "hand" | "pile" | "canvas", toZoneId: string, cardIds: string[]) {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({ type: "LAST_MOVE", toZoneType, toZoneId, cardIds } satisfies ServerEvent));
    }
  }

  private broadcastClearLastMove() {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({ type: "CLEAR_LAST_MOVE" } satisfies ServerEvent));
    }
  }
  ```

- [ ] **Step 2: Wire MOVE_CARD (canvas→dest path)**

  In the `MOVE_CARD` case, in the `fromZone === "canvas"` branch, find the block that ends (just before `break`):
  ```ts
          } else {
            dest.push(canvasCard);
          }
          break;
  ```
  Change it to:
  ```ts
          } else {
            dest.push(canvasCard);
          }
          this.broadcastLastMove(toZone, toId, [cardId]);
          break;
  ```

- [ ] **Step 3: Wire MOVE_CARD (non-canvas→dest path)**

  In the `MOVE_CARD` case, in the non-canvas branch, find the block (just before `break`):
  ```ts
        const pos = action.insertPosition ?? 'top';
        if (pos === 'bottom') {
          dest.unshift(card);
        } else if (pos === 'random') {
          const idx = dest.length === 0 ? 0 : unbiasedRandom(dest.length + 1);
          dest.splice(idx, 0, card);
        } else {
          dest.push(card);
        }
        break;
  ```
  Change it to:
  ```ts
        const pos = action.insertPosition ?? 'top';
        if (pos === 'bottom') {
          dest.unshift(card);
        } else if (pos === 'random') {
          const idx = dest.length === 0 ? 0 : unbiasedRandom(dest.length + 1);
          dest.splice(idx, 0, card);
        } else {
          dest.push(card);
        }
        this.broadcastLastMove(toZone, toId, [cardId]);
        break;
  ```

- [ ] **Step 4: Wire FLIP_CARD**

  In the `FLIP_CARD` case, after `flipCard.faceUp = !flipCard.faceUp;` and before `break`:
  ```ts
        takeSnapshot(this.gameState);
        flipCard.faceUp = !flipCard.faceUp;
        this.broadcastLastMove("pile", action.pileId, [action.cardId]);
        break;
  ```

- [ ] **Step 5: Wire PASS_CARD**

  In the `PASS_CARD` case, after the `passedCard` is pushed to the target hand, just before `break`:
  ```ts
        const [passedCard] = sourceArr.splice(passCardIdx, 1);
        passedCard.faceUp = true;
        this.gameState.hands[action.targetPlayerId].push(passedCard);
        this.broadcastLastMove("hand", action.targetPlayerId, [action.cardId]);
        break;
  ```

- [ ] **Step 6: Wire PLAY_CARD_SET**

  In the `PLAY_CARD_SET` case, after `dest.push(...cardsToPlay)` and before `break`:
  ```ts
        dest.push(...cardsToPlay);
        this.broadcastLastMove(toZone, toId, cardIds);
        break;
  ```

- [ ] **Step 7: Wire PLACE_ON_CANVAS**

  In the `PLACE_ON_CANVAS` case, after `this.gameState.canvasCards.push(...)` and before `break`:
  ```ts
        this.gameState.canvasCards.push({ card: canvasCard!, x, y, z: maxZ + 1 });
        this.broadcastLastMove("canvas", "canvas", [cardId]);
        break;
  ```

- [ ] **Step 8: Wire GROUP_PLACE_ON_CANVAS**

  In the `GROUP_PLACE_ON_CANVAS` case, after the `resolvedGroupCards.forEach(...)` block and before `break`:
  ```ts
        resolvedGroupCards.forEach((r, rank) => {
          r.card.faceUp = true;
          this.gameState.canvasCards.push({ card: r.card, x: r.x, y: r.y, z: maxZGroup + 1 + rank });
        });
        this.broadcastLastMove("canvas", "canvas", resolvedGroupCards.map(r => r.card.id));
        break;
  ```

- [ ] **Step 9: Wire UNDO_MOVE**

  In the `UNDO_MOVE` case, after the state is restored and before `break`:
  ```ts
        this.gameState = snap;
        this.gameState.undoSnapshots = remainingSnapshots;
        this.broadcastClearLastMove();
        break;
  ```

- [ ] **Step 10: Run tests — confirm all pass**

  Run: `npm test`
  Expected: All tests PASS including the new LAST_MOVE / CLEAR_LAST_MOVE cases.

- [ ] **Step 11: Typecheck**

  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 12: Commit**

  ```bash
  git add party/index.ts tests/moveCard.test.ts tests/flipCard.test.ts tests/playCardSet.test.ts tests/undoMove.test.ts tests/passCard.test.ts tests/canvasCards.test.ts
  git commit -m "feat: server emits LAST_MOVE / CLEAR_LAST_MOVE side-channel events"
  ```

---

## Task 4: Client Hook — `highlightedMove` State

**Files:**
- Modify: `src/hooks/usePartySocket.ts`

- [ ] **Step 1: Add imports and state**

  At the top of `usePartySocket.ts`, add `LastMoveHighlight` to the import from `../shared/types`:
  ```ts
  import type { ClientAction, ClientGameState, LastMoveHighlight, ServerEvent } from '../shared/types';
  ```

  Inside the `usePartySocket` function body, after the existing `shuffleTimersRef` declaration, add:
  ```ts
  const [highlightedMove, setHighlightedMove] = useState<LastMoveHighlight | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  ```

- [ ] **Step 2: Add message handlers for LAST_MOVE and CLEAR_LAST_MOVE**

  In the `ws.addEventListener('message', ...)` handler, after the existing `} else if (event.type === 'EFFECT') {` block (and its closing `}`), add:

  ```ts
      } else if (event.type === 'LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove({ toZoneType: event.toZoneType, toZoneId: event.toZoneId, cardIds: event.cardIds });
        highlightTimerRef.current = setTimeout(() => setHighlightedMove(null), 8000);
      } else if (event.type === 'CLEAR_LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove(null);
      }
  ```

- [ ] **Step 3: Add timer cleanup to useEffect cleanup**

  In the `return () => { ... }` cleanup inside the `useEffect`, after `shuffleTimersRef.current.clear();`, add:
  ```ts
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  ```

- [ ] **Step 4: Expose `highlightedMove` in return value**

  Change the return statement from:
  ```ts
  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce };
  ```
  To:
  ```ts
  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove };
  ```

- [ ] **Step 5: Typecheck**

  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/hooks/usePartySocket.ts
  git commit -m "feat: track highlightedMove state in usePartySocket with 8s auto-clear"
  ```

---

## Task 5: Thread `highlightedMove` Through App → BoardDragLayer → BoardView

**Files:**
- Modify: `src/App.tsx`, `src/components/BoardDragLayer.tsx`, `src/components/BoardView.tsx`

- [ ] **Step 1: Update `App.tsx`**

  In `RoomView`, destructure `highlightedMove` from the `usePartySocket` call:
  ```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove } = usePartySocket(...)
  ```

  Then pass it to `BoardDragLayer`:
  ```ts
  <BoardDragLayer
    gameState={gameState}
    playerId={joinState.playerId}
    roomId={roomId}
    connected={connected}
    sendAction={sendAction}
    setDragging={setDragging}
    shufflingPileIds={shufflingPileIds}
    highlightedMove={highlightedMove}
  />
  ```

- [ ] **Step 2: Update `BoardDragLayer.tsx`**

  Add `LastMoveHighlight` to the import from `@/shared/types`:
  ```ts
  import type { Card, ClientAction, ClientGameState, LastMoveHighlight, SelectionSource } from '@/shared/types';
  ```

  Add to `BoardDragLayerProps` interface:
  ```ts
  interface BoardDragLayerProps {
    // ... existing props ...
    highlightedMove: LastMoveHighlight | null;
  }
  ```

  Destructure it in the function signature:
  ```ts
  export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging, shufflingPileIds, highlightedMove }: BoardDragLayerProps) {
  ```

  Pass it to `BoardView` in the JSX:
  ```ts
  <BoardView
    gameState={gameState}
    playerId={playerId}
    roomId={roomId}
    connected={connected}
    sendAction={sendAction}
    draggingCardId={activeCard?.id ?? null}
    shufflingPileIds={shufflingPileIds}
    selectedIds={selectedIds}
    onToggleSelect={handleToggleSelect}
    onSelectAll={handleSelectAll}
    selectionSource={selectionSource}
    canvasRef={canvasRef}
    onToggleSelectCanvas={handleToggleSelectCanvas}
    onSelectAllCanvas={handleSelectAllCanvas}
    onDiscardAllCanvas={handleDiscardAllCanvas}
    onDeselectAll={handleDeselectAll}
    groupIds={groupIds}
    activeCardId={activeCard?.id ?? null}
    dragDelta={dragDelta}
    highlightedMove={highlightedMove}
  />
  ```

- [ ] **Step 3: Update `BoardView.tsx`**

  Add `LastMoveHighlight` to the import from `@/shared/types`:
  ```ts
  import type { ClientAction, ClientGameState, LastMoveHighlight, SelectionSource } from '@/shared/types';
  ```

  Add to `BoardViewProps` interface:
  ```ts
  interface BoardViewProps {
    // ... existing props ...
    highlightedMove: LastMoveHighlight | null;
  }
  ```

  Destructure it in the function signature:
  ```ts
  export function BoardView({ ..., highlightedMove }: BoardViewProps) {
  ```

  Pass `highlightedMove` to all zone components (OpponentHand, PileZone, SpreadZone, HandZone, CanvasZone) — the prop acceptance in those components will be added in Tasks 6–9. For now, add the prop to each call site:

  `OpponentHand` call sites: `highlightedMove={highlightedMove}`
  `PileZone` call sites: `highlightedMove={highlightedMove}`
  `SpreadZone` call sites (all three): `highlightedMove={highlightedMove}`
  `HandZone` call site: `highlightedMove={highlightedMove}`
  `CanvasZone` call site: `highlightedMove={highlightedMove}`

- [ ] **Step 4: Typecheck**

  Run: `npm run typecheck`
  Expected: Errors about `highlightedMove` not being in zone component prop types — that is expected; Tasks 6–9 fix those.

- [ ] **Step 5: Commit (after Tasks 6–9 complete)**

  Wait to commit until zone components accept the prop (typecheck must pass).

---

## Task 6: `PileZone` and `OpponentHand` — Zone-Level Highlight

**Files:**
- Modify: `src/components/PileZone.tsx`, `src/components/OpponentHand.tsx`

- [ ] **Step 1: Update `PileZone.tsx`**

  Add `LastMoveHighlight` to the import:
  ```ts
  import type { Card, ClientPile, ClientAction, LastMoveHighlight } from '@/shared/types';
  ```

  Add to `PileZoneProps`:
  ```ts
  interface PileZoneProps {
    pile: ClientPile;
    sendAction: (action: ClientAction) => void;
    draggingCardId: string | null;
    shufflingPileIds?: Set<string>;
    onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
    selectedIds?: Set<string>;
    highlightedMove?: LastMoveHighlight | null;
  }
  ```

  Destructure it in the function signature:
  ```ts
  export function PileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Set(), onSelectAll, selectedIds, highlightedMove }: PileZoneProps) {
  ```

  Compute the highlight condition and add the class to the droppable `<div ref={setNodeRef}>`. Currently:
  ```ts
      <div
        ref={setNodeRef}
        data-testid={`pile-${pile.id}`}
        className={cn(
          'w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
  ```
  Change to:
  ```ts
      const isPileHighlighted =
        highlightedMove?.toZoneType === "pile" &&
        highlightedMove.toZoneId === pile.id &&
        pile.region !== "spread";

      // ...
      <div
        ref={setNodeRef}
        data-testid={`pile-${pile.id}`}
        className={cn(
          'w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border',
          isPileHighlighted && 'last-move-highlight'
        )}
      >
  ```

  (Declare `isPileHighlighted` before the return statement, alongside the other const declarations.)

- [ ] **Step 2: Update `OpponentHand.tsx`**

  Add `LastMoveHighlight` to the import:
  ```ts
  import type { Card, ClientAction, LastMoveHighlight } from '@/shared/types';
  ```

  Add to `OpponentHandProps`:
  ```ts
  interface OpponentHandProps {
    playerId: string;
    cardCount: number;
    displayName: string;
    connected: boolean;
    sendAction: (action: ClientAction) => void;
    revealedCards?: Card[];
    highlightedMove?: LastMoveHighlight | null;
  }
  ```

  Destructure it:
  ```ts
  export function OpponentHand({ playerId, cardCount, displayName, connected, sendAction: _sendAction, revealedCards, highlightedMove }: OpponentHandProps) {
  ```

  Add the class to the zone container `<div ref={setNodeRef}>`:
  ```ts
  const isZoneHighlighted =
    highlightedMove?.toZoneType === "hand" && highlightedMove.toZoneId === playerId;

  // in JSX:
  <div
    ref={setNodeRef}
    data-testid="opponent-hand"
    className={cn(
      'flex flex-col rounded-lg p-1',
      isOver ? 'border-2 border-primary' : 'border-2 border-transparent',
      isZoneHighlighted && 'last-move-highlight'
    )}
  >
  ```

---

## Task 7: `SpreadZone` — Card-Level Highlight

**Files:**
- Modify: `src/components/SpreadZone.tsx`

- [ ] **Step 1: Add `isHighlighted` prop to `SortableSpreadCard`**

  `SortableSpreadCard` is a private sub-component in the file. Add `isHighlighted` to its props interface:
  ```ts
  interface SortableSpreadCardProps {
    card: Card;
    pileId: string;
    index: number;
    draggingCardId: string | null;
    isSelected: boolean;
    onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
    isHighlighted: boolean;
  }
  ```

  Destructure it in the function:
  ```ts
  function SortableSpreadCard({ card, pileId, index, draggingCardId, isSelected, onToggleSelect, isHighlighted }: SortableSpreadCardProps) {
  ```

  Apply the class to the inner `<div ref={setNodeRef}>`. Currently:
  ```ts
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
  Change to:
  ```ts
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150',
          isHighlighted && 'last-move-highlight'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
  ```

- [ ] **Step 2: Add `highlightedMove` to `SpreadZoneProps` and thread to sub-component**

  Add `LastMoveHighlight` to the import:
  ```ts
  import type { Card, ClientPile, ClientAction, LastMoveHighlight, SelectionSource } from '@/shared/types';
  ```

  Add to `SpreadZoneProps`:
  ```ts
  interface SpreadZoneProps {
    pile: ClientPile;
    sendAction: (action: ClientAction) => void;
    draggingCardId: string | null;
    className?: string;
    interactive?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
    onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;
    selectionSource?: SelectionSource;
    highlightedMove?: LastMoveHighlight | null;
  }
  ```

  Destructure it:
  ```ts
  export function SpreadZone({ pile, sendAction, draggingCardId, className, interactive, selectedIds, onToggleSelect, onSelectAll, selectionSource, highlightedMove }: SpreadZoneProps) {
  ```

  When rendering each `SortableSpreadCard`, compute and pass `isHighlighted`:
  ```ts
  faceUpCards.map((card, i) => (
    <SortableSpreadCard
      key={card.id}
      card={card}
      pileId={pile.id}
      index={i}
      draggingCardId={draggingCardId}
      isSelected={selectedIds?.has(card.id) ?? false}
      onToggleSelect={onToggleSelect ?? (() => {})}
      isHighlighted={
        highlightedMove?.toZoneType === "pile" &&
        highlightedMove.toZoneId === pile.id &&
        highlightedMove.cardIds.includes(card.id)
      }
    />
  ))
  ```

---

## Task 8: `HandZone` — Card-Level Highlight

**Files:**
- Modify: `src/components/HandZone.tsx`

- [ ] **Step 1: Add `isHighlighted` prop to `SortableHandCard`**

  Add to `SortableHandCardProps`:
  ```ts
  interface SortableHandCardProps {
    card: Card;
    playerId: string;
    isDraggingThis: boolean;
    index: number;
    isSelected: boolean;
    onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
    isHighlighted: boolean;
  }
  ```

  Destructure it:
  ```ts
  function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect, isHighlighted }: SortableHandCardProps) {
  ```

  Apply the class to the inner `<div ref={setNodeRef}>`. Find:
  ```ts
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
        )}
        {...listeners}
  ```
  Change to:
  ```ts
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150',
          isHighlighted && 'last-move-highlight'
        )}
        {...listeners}
  ```

- [ ] **Step 2: Add `highlightedMove` to `HandZone` props and thread to sub-component**

  `HandZone` uses a separate exported interface. Find and add `LastMoveHighlight` to the import:
  ```ts
  import type { Card, ClientAction, LastMoveHighlight, Suit, Rank, SelectionSource } from '@/shared/types';
  ```

  Find the `HandZone` props interface (look for `interface HandZoneProps` or inline props) and add:
  ```ts
  highlightedMove?: LastMoveHighlight | null;
  ```

  Destructure it in the `HandZone` function signature.

  When rendering each `SortableHandCard`, pass `isHighlighted`:
  ```ts
  isHighlighted={
    highlightedMove?.toZoneType === "hand" &&
    highlightedMove.toZoneId === playerId &&
    highlightedMove.cardIds.includes(card.id)
  }
  ```

  (The `playerId` is already a prop of `HandZone`.)

---

## Task 9: `CanvasZone` and `CanvasDraggableCard` — Canvas Card Highlight

**Files:**
- Modify: `src/components/CanvasZone.tsx`, `src/components/CanvasDraggableCard.tsx`

- [ ] **Step 1: Add `isHighlighted` prop to `CanvasDraggableCard`**

  In `CanvasDraggableCard.tsx`, add `LastMoveHighlight` to the import (or just add the `isHighlighted` boolean — no need to import the full type):
  ```ts
  interface CanvasDraggableCardProps {
    canvasCard: ClientCanvasCard;
    coversAnother?: boolean;
    isSelected?: boolean;
    isPassenger?: boolean;
    onToggleSelect?: (id: string) => void;
    isHighlighted?: boolean;
  }
  ```

  Destructure it:
  ```ts
  export function CanvasDraggableCard({ canvasCard, coversAnother, isSelected = false, isPassenger = false, onToggleSelect, isHighlighted = false }: CanvasDraggableCardProps) {
  ```

  Apply the class to the root `<div ref={setNodeRef}>`. Currently:
  ```ts
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        data-card-id={canvasCard.card.id}
        {...listeners}
        {...attributes}
        aria-roledescription="Draggable card"
        aria-label={`${canvasCard.card.rank} of ${canvasCard.card.suit}`}
        aria-pressed={isSelected}
      >
  ```
  Change to:
  ```ts
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        data-card-id={canvasCard.card.id}
        className={cn(isHighlighted && 'last-move-highlight')}
        {...listeners}
        {...attributes}
        aria-roledescription="Draggable card"
        aria-label={`${canvasCard.card.rank} of ${canvasCard.card.suit}`}
        aria-pressed={isSelected}
      >
  ```

  Also add the `cn` import if it is not already present:
  ```ts
  import { cn } from '@/lib/utils';
  ```

- [ ] **Step 2: Add `highlightedMove` to `CanvasZone` and pass per-card `isHighlighted`**

  In `CanvasZone.tsx`, add `LastMoveHighlight` to the import:
  ```ts
  import type { ClientCanvasCard, LastMoveHighlight } from '@/shared/types';
  ```

  Add to `CanvasZoneProps`:
  ```ts
  interface CanvasZoneProps {
    canvasCards: ClientCanvasCard[];
    canvasRef: React.RefObject<HTMLDivElement | null>;
    selectedIds: Set<string>;
    groupIds: Set<string>;
    activeCardId: string | null;
    dragDelta: { x: number; y: number } | null;
    onToggleSelectCanvas: (id: string) => void;
    onSelectAllCanvas: () => void;
    onDiscardAllCanvas: () => void;
    onDeselectAll: () => void;
    highlightedMove?: LastMoveHighlight | null;
  }
  ```

  Destructure it:
  ```ts
  export function CanvasZone({ canvasCards, canvasRef, selectedIds, groupIds, activeCardId, dragDelta, onToggleSelectCanvas, onSelectAllCanvas, onDiscardAllCanvas, onDeselectAll, highlightedMove }: CanvasZoneProps) {
  ```

  In the `canvasCards.map(...)` render, pass `isHighlighted`:
  ```ts
  {canvasCards.map((cc) => (
    <CanvasDraggableCard
      key={cc.card.id}
      canvasCard={cc}
      coversAnother={coveringIds.has(cc.card.id)}
      isSelected={selectedIds.has(cc.card.id)}
      isPassenger={groupIds.has(cc.card.id) && cc.card.id !== activeCardId}
      onToggleSelect={onToggleSelectCanvas}
      isHighlighted={
        highlightedMove?.toZoneType === "canvas" &&
        highlightedMove.cardIds.includes(cc.card.id)
      }
    />
  ))}
  ```

- [ ] **Step 3: Typecheck**

  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 4: Run all tests**

  Run: `npm test`
  Expected: All tests PASS.

- [ ] **Step 5: Commit (Tasks 5–9 together)**

  ```bash
  git add src/App.tsx src/components/BoardDragLayer.tsx src/components/BoardView.tsx src/components/PileZone.tsx src/components/OpponentHand.tsx src/components/SpreadZone.tsx src/components/HandZone.tsx src/components/CanvasZone.tsx src/components/CanvasDraggableCard.tsx
  git commit -m "feat: thread highlightedMove prop and apply last-move-highlight class to zone components"
  ```

---

## Task 10: CSS Animation

**Files:**
- Modify: `src/globals.css`

- [ ] **Step 1: Add keyframes and class**

  At the end of `src/globals.css`, append:

  ```css
  @keyframes last-move-pulse {
    0%   { box-shadow: 0 0 0 2px #38bdf8, 0 0 16px 6px rgba(56,189,248,0.6); }
    15%  { box-shadow: 0 0 0 3px #38bdf8, 0 0 20px 8px rgba(56,189,248,0.5); }
    40%  { box-shadow: 0 0 0 2px #38bdf8, 0 0 14px 4px rgba(56,189,248,0.35); }
    100% { box-shadow: none; }
  }

  .last-move-highlight {
    animation: last-move-pulse 8s ease-out;
  }
  ```

- [ ] **Step 2: Typecheck and test**

  Run: `npm run typecheck && npm test`
  Expected: All pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/globals.css
  git commit -m "feat: add last-move-pulse CSS animation for highlight-last-move"
  ```

---

## Task 11: E2E Test

**Files:**
- Create: `playwright/highlight.spec.ts`

- [ ] **Step 1: Write the multiplayer highlight test**

  Create `playwright/highlight.spec.ts`:

  ```ts
  import { test, expect } from './fixtures';

  test.describe('highlight last move', () => {
    test('P1 moves a card — P2 sees last-move-highlight on the pile', async ({ twoPlayerRoom }) => {
      const { p1, p2 } = twoPlayerRoom;

      // Verify both players are on the board
      await expect(p1.getByTestId('pile-discard')).toBeVisible();
      await expect(p2.getByTestId('pile-discard')).toBeVisible();

      // P1 drags the top card of the draw pile to discard
      const drawPile = p1.getByTestId('pile-draw');
      const discardPile = p1.getByTestId('pile-discard');

      const src = await drawPile.boundingBox();
      const tgt = await discardPile.boundingBox();
      if (!src || !tgt) throw new Error('Could not get bounding boxes');

      await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
      await p1.mouse.down();
      await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
      await p1.mouse.up();

      // P1 selects "Top" in the insert dialog
      await p1.getByRole('button', { name: 'Top' }).click();

      // P2 should see the last-move-highlight class on the discard pile
      await expect(p2.getByTestId('pile-discard')).toHaveClass(/last-move-highlight/, { timeout: 3000 });

      // P1 undoes the move
      // (Find the undo button — it's in the ControlsBar)
      await p1.getByRole('button', { name: /open controls/i }).click();
      await p1.getByRole('button', { name: /undo/i }).click();

      // P2's highlight should now be absent
      await expect(p2.getByTestId('pile-discard')).not.toHaveClass(/last-move-highlight/, { timeout: 3000 });
    });
  });
  ```

- [ ] **Step 2: Run e2e tests (requires both dev servers)**

  Ensure `npm run dev` (port 1999) and `npm run dev:client` (port 5173) are running.

  Run: `npm run test:e2e -- --project=chromium playwright/highlight.spec.ts`
  Expected: PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add playwright/highlight.spec.ts
  git commit -m "test(e2e): multiplayer highlight-last-move — P1 move visible to P2, clears on undo"
  ```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `LAST_MOVE` and `CLEAR_LAST_MOVE` ServerEvent variants | Task 1 |
| `broadcastLastMove` private method | Task 3, Step 1 |
| MOVE_CARD triggers LAST_MOVE | Task 3, Steps 2–3 |
| PLAY_CARD_SET triggers LAST_MOVE | Task 3, Step 6 |
| PASS_CARD triggers LAST_MOVE | Task 3, Step 5 |
| FLIP_CARD triggers LAST_MOVE | Task 3, Step 4 |
| PLACE_ON_CANVAS triggers LAST_MOVE | Task 3, Step 7 |
| GROUP_PLACE_ON_CANVAS triggers LAST_MOVE | Task 3, Step 8 |
| UNDO_MOVE emits CLEAR_LAST_MOVE | Task 3, Step 9 |
| `highlightedMove` state + timer in `usePartySocket` | Task 4 |
| 8s fade-out timer | Task 4, Step 2 |
| Timer reset on new LAST_MOVE | Task 4, Step 2 (clearTimeout before setting new timer) |
| Timer clear in useEffect cleanup | Task 4, Step 3 |
| Prop threading to all zone components | Tasks 5–9 |
| `PileZone` zone-level highlight | Task 6 |
| `SpreadZone` card-level highlight | Task 7 |
| `HandZone` card-level highlight | Task 8 |
| `OpponentHand` zone-level highlight (even when `handRevealed: true`) | Task 6 — zone-level always applied based on `toZoneId === playerId` |
| `CanvasDraggableCard` card-level highlight | Task 9 |
| No `animation-fill-mode: forwards` | Task 10 — CSS only has `animation` shorthand, no fill-mode |
| Unit tests: qualifying actions emit LAST_MOVE | Task 2 |
| Unit tests: non-qualifying actions do not emit | Task 2, Step 7 |
| Unit tests: UNDO_MOVE emits CLEAR_LAST_MOVE | Task 2, Step 4 |
| E2E: P1 move → P2 sees highlight | Task 11 |
| E2E: undo clears highlight | Task 11 |

All spec requirements covered. No placeholders.

### Type Consistency Check

- `LastMoveHighlight` defined in `types.ts`; used in `usePartySocket.ts`, `BoardDragLayer.tsx`, `BoardView.tsx`, `PileZone.tsx`, `SpreadZone.tsx`, `HandZone.tsx`, `OpponentHand.tsx`, `CanvasZone.tsx` — consistent.
- `SortableSpreadCard.isHighlighted: boolean` — passed as computed boolean in `SpreadZone`. Consistent.
- `SortableHandCard.isHighlighted: boolean` — passed as computed boolean in `HandZone`. Consistent.
- `CanvasDraggableCard.isHighlighted: boolean` — passed from `CanvasZone`. Consistent.
- `broadcastLastMove(toZoneType, toZoneId, cardIds)` — called with correct types at each action site. Consistent.
