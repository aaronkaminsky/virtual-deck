# Runtime Piles (1031) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stack loose canvas cards into a real pile (with face/shuffle/insert semantics) positioned on the canvas, and break a pile back into loose cards.

**Architecture:** A runtime pile is a normal `Pile` in `state.piles` with `region: "canvas"` and a `pos {x,y,z}`. All existing pile handlers (MOVE_CARD, SHUFFLE_PILE, SET_PILE_FACE, FLIP_CARD, insert dialog, undo, `viewFor` masking) work unchanged because they look piles up by id. New code: three server actions (create/unstack/move), empty-pile pruning, a `MOVE_ALL_PILE_CARDS` hand destination, a `CanvasPileZone` component, a Stack button, and whole-pile drag in `BoardDragLayer`.

**Tech Stack:** TypeScript, PartyKit (Cloudflare Workers), React 18, dnd-kit, Vitest, Playwright.

**Design spec:** `docs/superpowers/specs/2026-07-08-runtime-piles-design.md` — read it before starting any task.

## Global Constraints

- No new dependencies. `crypto.randomUUID()` is built in (Workers + Node).
- All work on branch `worktree-runtime-piles` in the worktree at `.claude/worktrees/runtime-piles`. Never commit to `main`.
- Pre-commit hook runs `npm test` + `npm run typecheck` — both must pass for every commit.
- Server is authoritative; validate everything BEFORE `takeSnapshot`, snapshot BEFORE any mutation.
- Loose canvas cards are always `faceUp: true` (existing invariant — preserve it).
- Client tests are logic-extraction style (no component mounting); UI behavior is covered by Playwright.
- Error responses use the exact `{ type: "ERROR", code, message } satisfies ServerEvent` pattern of neighboring handlers.
- Run unit tests with `npx vitest run tests/<file> --reporter=verbose` (or `npm test` for all).

---

### Task 1: Shared types + `viewFor` passthrough

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `party/index.ts` (viewFor only, ~line 108-119)
- Test: `tests/canvasPileView.test.ts` (create)

**Interfaces:**
- Consumes: existing `Pile`, `ClientPile`, `ClientAction` types.
- Produces: `PilePos` type; `Pile.pos?: PilePos`; `ClientPile.pos?: PilePos`; `region` union widened to `"pile" | "spread" | "canvas"`; four `ClientAction` changes: `CREATE_CANVAS_PILE`, `UNSTACK_CANVAS_PILE`, `MOVE_CANVAS_PILE`, and `MOVE_ALL_PILE_CARDS` gains `toZone?: "pile" | "hand"`. Later tasks depend on these exact names.

- [ ] **Step 1: Write the failing test**

Create `tests/canvasPileView.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { viewFor, defaultGameState } from "../party/index";
import { makeCard } from "./helpers";
import type { Pile } from "../src/shared/types";

function stateWithCanvasPile() {
  const state = defaultGameState("room-1");
  const pile: Pile = {
    id: "canvas-pile-abc",
    name: "Stack",
    cards: [makeCard("A-s", false), makeCard("2-s", false), makeCard("3-s", false)],
    faceUp: false,
    region: "canvas",
    ownerId: null,
    pos: { x: 100, y: 50, z: 7 },
  };
  state.piles.push(pile);
  return state;
}

describe("viewFor canvas piles", () => {
  it("passes pos through to ClientPile", () => {
    const view = viewFor(stateWithCanvasPile(), "player-1");
    const pile = view.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 100, y: 50, z: 7 });
    expect(pile.region).toBe("canvas");
  });

  it("masks buried face-down cards like a column pile (not like a spread)", () => {
    const view = viewFor(stateWithCanvasPile(), "player-1");
    const pile = view.piles.find(p => p.id === "canvas-pile-abc")!;
    // bottom two cards masked, top card sent in full
    expect("id" in pile.cards[0]).toBe(false);
    expect("id" in pile.cards[1]).toBe(false);
    expect("id" in pile.cards[2]).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/canvasPileView.test.ts --reporter=verbose`
Expected: FAIL — `pos` type error at compile or `pile.pos` is `undefined` (viewFor doesn't map it). The masking test may already pass (canvas region falls into the default masking branch) — that's fine; it's a pin.

- [ ] **Step 3: Implement types and viewFor**

In `src/shared/types.ts`, add after the `Player` interface:

```ts
export interface PilePos {
  x: number;
  y: number;
  z: number;   // shares the loose canvas-card z-space
}
```

Change `Pile` and `ClientPile`:

```ts
export interface Pile {
  id: string;        // "draw" | "discard" | custom
  name: string;
  cards: Card[];     // top of stack = last element
  faceUp?: boolean;  // whether the pile shows face-up by default
  region?: "pile" | "spread" | "canvas";
  ownerId?: string | null;
  pos?: PilePos;     // present iff region === "canvas"
}
```

```ts
export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
  region?: "pile" | "spread" | "canvas";
  ownerId?: string | null;
  pos?: PilePos;
}
```

In the `ClientAction` union, change the `MOVE_ALL_PILE_CARDS` line and add three new actions at the end (before the closing `;`):

```ts
  | { type: "MOVE_ALL_PILE_CARDS"; fromId: string; toId: string; toZone?: "pile" | "hand" }
```

```ts
  | { type: "CREATE_CANVAS_PILE"; cardIds: string[]; x: number; y: number }
  | { type: "UNSTACK_CANVAS_PILE"; pileId: string }
  | { type: "MOVE_CANVAS_PILE"; pileId: string; x: number; y: number };
```

In `party/index.ts` `viewFor`, add `pos` to the pile mapping (after `ownerId: pile.ownerId,`):

```ts
      pos: pile.pos,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/canvasPileView.test.ts --reporter=verbose`
Expected: PASS (both tests)

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`
Expected: all green (type widening is backward compatible).

```bash
git add src/shared/types.ts party/index.ts tests/canvasPileView.test.ts
git commit -m "feat: canvas-pile types, viewFor pos passthrough + masking pin (1031)"
```

---

### Task 2: Server `CREATE_CANVAS_PILE` + `maxCanvasZ` helper

**Files:**
- Modify: `party/index.ts`
- Test: `tests/createCanvasPile.test.ts` (create)

**Interfaces:**
- Consumes: types from Task 1; existing `takeSnapshot`, `unbiasedRandom` patterns.
- Produces: exported `maxCanvasZ(state: GameState): number`; `CREATE_CANVAS_PILE` handler. Error codes: `INVALID_CARD_SET`, `INVALID_COORDINATES`, `DUPLICATE_CARD_IDS`, `CARD_NOT_IN_SOURCE`.

- [ ] **Step 1: Write the failing test**

Create `tests/createCanvasPile.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { maxCanvasZ, defaultGameState } from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("maxCanvasZ", () => {
  it("computes the max over loose cards and canvas pile positions", () => {
    const state = defaultGameState("r");
    state.canvasCards.push({ card: makeCard("A-s", true), x: 0, y: 0, z: 3 });
    state.piles.push({ id: "canvas-pile-x", name: "Stack", cards: [makeCard("2-s", true)], region: "canvas", ownerId: null, pos: { x: 0, y: 0, z: 9 } });
    expect(maxCanvasZ(state)).toBe(9);
  });

  it("returns 0 for an empty canvas", () => {
    expect(maxCanvasZ(defaultGameState("r"))).toBe(0);
  });
});

describe("CREATE_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [
      { card: makeCard("A-s", true), x: 10, y: 10, z: 1 },
      { card: makeCard("2-s", false), x: 40, y: 10, z: 3 },
      { card: makeCard("3-s", true), x: 70, y: 10, z: 2 },
    ];
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("stacks selected loose cards into a new canvas pile at (x, y) above current z", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 25, y: 30 });
    const pile = room.gameState.piles.find(p => p.region === "canvas");
    expect(pile).toBeDefined();
    expect(pile!.id).toMatch(/^canvas-pile-/);
    expect(pile!.name).toBe("Stack");
    expect(pile!.pos).toEqual({ x: 25, y: 30, z: 4 });
    expect(room.gameState.canvasCards).toHaveLength(0);
  });

  it("orders stacked cards by ascending pre-stack z (last element = top)", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    const pile = room.gameState.piles.find(p => p.region === "canvas")!;
    expect(pile.cards.map(c => c.id)).toEqual(["A-s", "3-s", "2-s"]);
  });

  it("inherits pile.faceUp from the top card and preserves per-card faces", async () => {
    // top card by z is "2-s" (z:3) which is faceUp:false
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    const pile = room.gameState.piles.find(p => p.region === "canvas")!;
    expect(pile.faceUp).toBe(false);
    expect(pile.cards.map(c => c.faceUp)).toEqual([true, true, false]);
  });

  it("rejects fewer than 2 cards with INVALID_CARD_SET and mutates nothing", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_CARD_SET"]);
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("rejects duplicate card ids with DUPLICATE_CARD_IDS", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "A-s"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["DUPLICATE_CARD_IDS"]);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s"], x: NaN, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("errors CARD_NOT_IN_SOURCE atomically if any card is not loose on the canvas", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "9-h"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["CARD_NOT_IN_SOURCE"]);
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.piles.some(p => p.region === "canvas")).toBe(false);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("takes one undo snapshot; UNDO_MOVE restores the loose cards", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    expect(room.gameState.undoSnapshots).toHaveLength(1);
    await send({ type: "UNDO_MOVE" });
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.piles.some(p => p.region === "canvas")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/createCanvasPile.test.ts --reporter=verbose`
Expected: FAIL — `maxCanvasZ` not exported; CREATE_CANVAS_PILE unhandled (state unchanged assertions fail on the happy-path tests).

- [ ] **Step 3: Implement**

In `party/index.ts`, add after `takeSnapshot` (module level, exported):

```ts
export function maxCanvasZ(state: GameState): number {
  const cardMax = state.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  return state.piles.reduce((m, p) => Math.max(m, p.pos?.z ?? 0), cardMax);
}
```

Add a new case in the `onMessage` switch (place it after `GROUP_PLACE_ON_CANVAS`):

```ts
      case "CREATE_CANVAS_PILE": {
        const { cardIds, x, y } = action;
        if (!Array.isArray(cardIds) || cardIds.length < 2) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_CARD_SET",
            message: "Stacking requires at least 2 cards",
          } satisfies ServerEvent));
          break;
        }
        const stackIdSet = new Set(cardIds);
        if (stackIdSet.size !== cardIds.length) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "DUPLICATE_CARD_IDS",
            message: "cardIds must be unique",
          } satisfies ServerEvent));
          break;
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_COORDINATES",
            message: "x and y must be finite numbers",
          } satisfies ServerEvent));
          break;
        }
        // Pre-validate all cards are loose on the canvas (before takeSnapshot)
        const entries: CanvasCard[] = [];
        let missingStackCardId: string | null = null;
        for (const id of cardIds) {
          const found = this.gameState.canvasCards.find(cc => cc.card.id === id);
          if (!found) { missingStackCardId = id; break; }
          entries.push(found);
        }
        if (missingStackCardId !== null) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_IN_SOURCE",
            message: `Card ${missingStackCardId} not found on canvas`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        const newPileZ = maxCanvasZ(this.gameState) + 1;
        // Ascending pre-stack z: what looked buried stays buried; last element = top of stack
        const stacked = [...entries].sort((a, b) => a.z - b.z);
        this.gameState.canvasCards = this.gameState.canvasCards.filter(cc => !stackIdSet.has(cc.card.id));
        const newPileId = `canvas-pile-${crypto.randomUUID().slice(0, 8)}`;
        this.gameState.piles.push({
          id: newPileId,
          name: "Stack",
          cards: stacked.map(e => e.card),
          faceUp: stacked[stacked.length - 1].card.faceUp,
          region: "canvas",
          ownerId: null,
          pos: { x, y, z: newPileZ },
        });
        lastMoveArgs = { toZoneType: "pile", toZoneId: newPileId, cardIds: [...cardIds] };
        break;
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/createCanvasPile.test.ts --reporter=verbose`
Expected: PASS (10 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`

```bash
git add party/index.ts tests/createCanvasPile.test.ts
git commit -m "feat: CREATE_CANVAS_PILE server action + maxCanvasZ helper (1031)"
```

---

### Task 3: Server `UNSTACK_CANVAS_PILE`

**Files:**
- Modify: `party/index.ts`
- Test: `tests/unstackCanvasPile.test.ts` (create)

**Interfaces:**
- Consumes: `maxCanvasZ` from Task 2; types from Task 1.
- Produces: `UNSTACK_CANVAS_PILE` handler. Error codes: `PILE_NOT_FOUND`, `INVALID_PILE_REGION`. Fan layout: card i at `(pos.x + i * 24, pos.y)`, z ascending above `maxCanvasZ`, all cards `faceUp: true`.

- [ ] **Step 1: Write the failing test**

Create `tests/unstackCanvasPile.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("UNSTACK_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 5 }];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", false), makeCard("2-s", false), makeCard("3-s", true)],
      faceUp: false,
      region: "canvas",
      ownerId: null,
      pos: { x: 100, y: 60, z: 2 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("fans cards out at 24px x-offsets from pos, bottom-to-top = left-to-right", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.map(cc => ({ id: cc.card.id, x: cc.x, y: cc.y }))).toEqual([
      { id: "A-s", x: 100, y: 60 },
      { id: "2-s", x: 124, y: 60 },
      { id: "3-s", x: 148, y: 60 },
    ]);
  });

  it("assigns fresh ascending z above the current canvas max", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.map(cc => cc.z)).toEqual([6, 7, 8]); // maxCanvasZ was 5 (K-h)
  });

  it("forces all fanned cards faceUp (loose canvas cards are always face-up)", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.every(cc => cc.card.faceUp)).toBe(true);
  });

  it("deletes the pile and takes one undo snapshot", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("rejects non-canvas piles with INVALID_PILE_REGION (draw pile stays intact)", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "draw" });
    expect(errorCodes(sender)).toEqual(["INVALID_PILE_REGION"]);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(52);
  });

  it("errors PILE_NOT_FOUND for unknown pileId", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "nope" });
    expect(errorCodes(sender)).toEqual(["PILE_NOT_FOUND"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unstackCanvasPile.test.ts --reporter=verbose`
Expected: FAIL — action unhandled, pile still present.

- [ ] **Step 3: Implement**

Add a case after `CREATE_CANVAS_PILE` in `party/index.ts`:

```ts
      case "UNSTACK_CANVAS_PILE": {
        const unstackIdx = this.gameState.piles.findIndex(p => p.id === action.pileId);
        if (unstackIdx === -1) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        const unstackPile = this.gameState.piles[unstackIdx];
        if (unstackPile.region !== "canvas" || !unstackPile.pos) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_PILE_REGION",
            message: "Only canvas piles can be unstacked",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        const fanBaseZ = maxCanvasZ(this.gameState);
        const { x: fanX, y: fanY } = unstackPile.pos;
        const fannedIds = unstackPile.cards.map(c => c.id);
        unstackPile.cards.forEach((card, i) => {
          card.faceUp = true;
          this.gameState.canvasCards.push({ card, x: fanX + i * 24, y: fanY, z: fanBaseZ + 1 + i });
        });
        this.gameState.piles.splice(unstackIdx, 1);
        lastMoveArgs = { toZoneType: "canvas", toZoneId: "canvas", cardIds: fannedIds };
        break;
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unstackCanvasPile.test.ts --reporter=verbose`
Expected: PASS (6 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`

```bash
git add party/index.ts tests/unstackCanvasPile.test.ts
git commit -m "feat: UNSTACK_CANVAS_PILE server action (1031)"
```

---

### Task 4: Server `MOVE_CANVAS_PILE` + shared z-space in existing placements

**Files:**
- Modify: `party/index.ts`
- Test: `tests/moveCanvasPile.test.ts` (create)

**Interfaces:**
- Consumes: `maxCanvasZ` from Task 2.
- Produces: `MOVE_CANVAS_PILE` handler (updates `pos`, bumps z above cards AND piles). Side change: `PLACE_ON_CANVAS` and `GROUP_PLACE_ON_CANVAS` now compute their base z via `maxCanvasZ` so a newly placed card always lands above canvas piles.

- [ ] **Step 1: Write the failing test**

Create `tests/moveCanvasPile.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("MOVE_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 2 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("updates pos and bumps z above all loose cards and piles", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: 200, y: 150 });
    const pile = room.gameState.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: Infinity, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("rejects non-canvas piles with INVALID_PILE_REGION", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "draw", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_PILE_REGION"]);
  });

  it("errors PILE_NOT_FOUND for unknown pileId", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "nope", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["PILE_NOT_FOUND"]);
  });
});

describe("shared z-space with existing placements", () => {
  it("PLACE_ON_CANVAS lands above a canvas pile's z", async () => {
    const room = new GameRoom(makeMockRoom());
    const sender = makeMockConnection("player-1");
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 40 },
    });
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await room.onMessage(JSON.stringify({
      type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5,
    }), sender);
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/moveCanvasPile.test.ts --reporter=verbose`
Expected: FAIL — MOVE_CANVAS_PILE unhandled; PLACE_ON_CANVAS z test gets `1` (pile z ignored).

- [ ] **Step 3: Implement**

Add a case after `UNSTACK_CANVAS_PILE`:

```ts
      case "MOVE_CANVAS_PILE": {
        const movePile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!movePile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        if (movePile.region !== "canvas" || !movePile.pos) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_PILE_REGION",
            message: "Only canvas piles can be repositioned",
          } satisfies ServerEvent));
          break;
        }
        if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_COORDINATES",
            message: "x and y must be finite numbers",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        movePile.pos = { x: action.x, y: action.y, z: maxCanvasZ(this.gameState) + 1 };
        break;
      }
```

In `PLACE_ON_CANVAS`, replace:

```ts
        const maxZBeforeSplice = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
```

with:

```ts
        const maxZBeforeSplice = maxCanvasZ(this.gameState);
```

In `GROUP_PLACE_ON_CANVAS`, replace:

```ts
        const maxZGroup = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
```

with:

```ts
        const maxZGroup = maxCanvasZ(this.gameState);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/moveCanvasPile.test.ts --reporter=verbose`
Expected: PASS (5 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`
Expected: all green — `tests/canvasCards.test.ts` must still pass (the maxZ substitution is behavior-identical when no canvas piles exist).

```bash
git add party/index.ts tests/moveCanvasPile.test.ts
git commit -m "feat: MOVE_CANVAS_PILE + shared canvas z-space (1031)"
```

---

### Task 5: Empty canvas-pile pruning

**Files:**
- Modify: `party/index.ts`
- Test: `tests/pruneCanvasPiles.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: private `pruneEmptyCanvasPiles()` on `GameRoom`, called once in `onMessage` after the action switch (before `armAttractAlarm`). Guarantees: no broadcast ever contains an empty `region: "canvas"` pile; column piles and spreads are never pruned.

- [ ] **Step 1: Write the failing test**

Create `tests/pruneCanvasPiles.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("empty canvas-pile pruning", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 1 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("removes a canvas pile when its last card is moved off", async () => {
    await send({
      type: "MOVE_CARD", cardId: "A-s",
      fromZone: "pile", fromId: "canvas-pile-abc",
      toZone: "pile", toId: "discard",
    });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards.map(c => c.id)).toContain("A-s");
  });

  it("never prunes empty column piles or spreads", async () => {
    room.gameState.piles.push({ id: "spread-player-1", name: "p1", cards: [], faceUp: true, region: "spread", ownerId: "player-1" });
    // discard starts empty; send any action to trigger the post-switch prune
    await send({ type: "PING" });
    expect(room.gameState.piles.some(p => p.id === "discard")).toBe(true);
    expect(room.gameState.piles.some(p => p.id === "spread-player-1")).toBe(true);
  });

  it("undo restores a pruned pile", async () => {
    await send({
      type: "MOVE_CARD", cardId: "A-s",
      fromZone: "pile", fromId: "canvas-pile-abc",
      toZone: "pile", toId: "discard",
    });
    await send({ type: "UNDO_MOVE" });
    const restored = room.gameState.piles.find(p => p.id === "canvas-pile-abc");
    expect(restored).toBeDefined();
    expect(restored!.cards.map(c => c.id)).toEqual(["A-s"]);
  });

  it("RESET_TABLE sweeps canvas-pile cards to draw and removes the pile", async () => {
    await send({ type: "RESET_TABLE" });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(53);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pruneCanvasPiles.test.ts --reporter=verbose`
Expected: FAIL — emptied canvas pile still present after MOVE_CARD and RESET_TABLE.

- [ ] **Step 3: Implement**

In `party/index.ts`, add a private method next to `gatherAllCardsToDraw`:

```ts
  private pruneEmptyCanvasPiles(): void {
    this.gameState.piles = this.gameState.piles.filter(
      p => p.region !== "canvas" || p.cards.length > 0
    );
  }
```

In `onMessage`, immediately after the closing brace of the `switch` statement (before `await this.armAttractAlarm(...)`), add:

```ts
    this.pruneEmptyCanvasPiles();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pruneCanvasPiles.test.ts --reporter=verbose`
Expected: PASS (4 tests). Note: UNDO restore works because snapshots are whole-state and are taken before mutation — a snapshot never contains an empty canvas pile.

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`

```bash
git add party/index.ts tests/pruneCanvasPiles.test.ts
git commit -m "feat: prune emptied canvas piles after every action (1031)"
```

---

### Task 6: `MOVE_ALL_PILE_CARDS` hand destination

**Files:**
- Modify: `party/index.ts` (`MOVE_ALL_PILE_CARDS` case)
- Test: `tests/moveAllPileCardsToHand.test.ts` (create)

**Interfaces:**
- Consumes: `toZone?: "pile" | "hand"` field from Task 1.
- Produces: hand-destination branch — own hand only (`UNAUTHORIZED_MOVE` otherwise), cards land `faceUp: true`, emits `LAST_MOVE` with `toZoneType: "hand"`. Default (`toZone` absent) behaves exactly as before.

- [ ] **Step 1: Write the failing test**

Create `tests/moveAllPileCardsToHand.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("MOVE_ALL_PILE_CARDS with toZone: hand", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom([]));
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", false), makeCard("2-s", false)],
      faceUp: false,
      region: "canvas",
      ownerId: null,
      pos: { x: 0, y: 0, z: 1 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("moves all pile cards to the sender's hand, face-up, and prunes the pile", async () => {
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-1", toZone: "hand" });
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "2-s"]);
    expect(room.gameState.hands["player-1"].every(c => c.faceUp)).toBe(true);
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
  });

  it("rejects moving into another player's hand with UNAUTHORIZED_MOVE", async () => {
    room.gameState.hands["player-2"] = [];
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-2", toZone: "hand" });
    expect(errorCodes(sender)).toEqual(["UNAUTHORIZED_MOVE"]);
    expect(room.gameState.hands["player-2"]).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "canvas-pile-abc")!.cards).toHaveLength(2);
  });

  it("emits LAST_MOVE with toZoneType hand", async () => {
    const conn = makeMockConnection("player-1");
    const roomWithConn = new GameRoom(makeMockRoom([conn]));
    roomWithConn.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    roomWithConn.gameState.hands["player-1"] = [];
    roomWithConn.gameState.piles.push({
      id: "canvas-pile-abc", name: "Stack", cards: [makeCard("A-s", false)],
      faceUp: false, region: "canvas", ownerId: null, pos: { x: 0, y: 0, z: 1 },
    });
    await roomWithConn.onMessage(JSON.stringify({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-1", toZone: "hand" }), conn);
    const lastMoves = conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
    expect(lastMoves).toHaveLength(1);
    expect(lastMoves[0].toZoneType).toBe("hand");
    expect(lastMoves[0].toZoneId).toBe("player-1");
  });

  it("default (no toZone) still moves pile to pile", async () => {
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "discard" });
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/moveAllPileCardsToHand.test.ts --reporter=verbose`
Expected: FAIL — hand tests fail with `PILE_NOT_FOUND` error (toId isn't a pile).

- [ ] **Step 3: Implement**

Replace the `MOVE_ALL_PILE_CARDS` case body in `party/index.ts` with:

```ts
      case "MOVE_ALL_PILE_CARDS": {
        const { fromId, toId } = action;
        const moveAllToZone = action.toZone ?? "pile";
        const srcPile = this.gameState.piles.find(p => p.id === fromId);
        if (!srcPile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `Pile not found: ${fromId}`,
          } satisfies ServerEvent));
          break;
        }
        if (moveAllToZone === "hand") {
          // V4 Access Control: sender may only fill their own hand (mirrors MOVE_CARD)
          if (toId !== senderToken) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "UNAUTHORIZED_MOVE",
              message: "Cannot place cards in another player's hand",
            } satisfies ServerEvent));
            break;
          }
          if (srcPile.cards.length === 0) break;
          takeSnapshot(this.gameState);
          const movingToHand = srcPile.cards.splice(0);
          movingToHand.forEach(card => { card.faceUp = true; });
          (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = [])).push(...movingToHand);
          lastMoveArgs = { toZoneType: "hand", toZoneId: toId, cardIds: movingToHand.map(c => c.id) };
          break;
        }
        const destPile = this.gameState.piles.find(p => p.id === toId);
        if (!destPile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `Pile not found: ${toId}`,
          } satisfies ServerEvent));
          break;
        }
        if (srcPile.cards.length === 0) break; // nothing to move
        takeSnapshot(this.gameState);
        const moving = srcPile.cards.splice(0); // remove all cards
        moving.forEach(card => { card.faceUp = destPile.faceUp === true; });
        destPile.cards.push(...moving);
        break;
      }
```

(The pile→pile path is byte-identical in behavior to the old code; only the not-found error split into two checks so the hand branch can run without a dest pile.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/moveAllPileCardsToHand.test.ts --reporter=verbose`
Expected: PASS (4 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm test && npm run typecheck`
Expected: all green — existing `MOVE_ALL_PILE_CARDS` tests unchanged.

```bash
git add party/index.ts tests/moveAllPileCardsToHand.test.ts
git commit -m "feat: MOVE_ALL_PILE_CARDS optional hand destination (1031)"
```

---

### Task 7: Client drag-logic helpers (`canvasPileDrag`)

**Files:**
- Create: `src/lib/canvasPileDrag.ts`
- Test: `tests/canvasPileDrag.test.ts` (create)

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces:
  - `computeStackOrigin(entries: { x: number; y: number }[]): { x: number; y: number }` — min x / min y of the selection.
  - `type PileDropResolution = { kind: 'reposition'; x: number; y: number } | { kind: 'mergeIntoPile'; toId: string } | { kind: 'moveToHand' } | { kind: 'none' }`
  - `resolvePileDrop(args): PileDropResolution` — exact signature in the code below. Task 9 and 10 call these.

- [ ] **Step 1: Write the failing test**

Create `tests/canvasPileDrag.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeStackOrigin, resolvePileDrop } from "@/lib/canvasPileDrag";

describe("computeStackOrigin", () => {
  it("returns the top-left corner (min x, min y) of the selection", () => {
    expect(computeStackOrigin([
      { x: 40, y: 80 },
      { x: 10, y: 120 },
      { x: 70, y: 60 },
    ])).toEqual({ x: 10, y: 60 });
  });
});

const base = {
  pileId: "canvas-pile-abc",
  pos: { x: 100, y: 50 },
  delta: { x: 30, y: -20 },
  canvasW: 800,
  canvasH: 600,
  cardW: 80,
  cardH: 112,
};

describe("resolvePileDrop", () => {
  it("repositions (clamped) when dropped on the canvas", () => {
    expect(resolvePileDrop({ ...base, overId: "canvas", overData: undefined }))
      .toEqual({ kind: "reposition", x: 130, y: 30 });
  });

  it("repositions when dropped on its own droppable (tiny drag)", () => {
    expect(resolvePileDrop({ ...base, overId: "pile-canvas-pile-abc", overData: { toZone: "pile", toId: "canvas-pile-abc" } }))
      .toEqual({ kind: "reposition", x: 130, y: 30 });
  });

  it("clamps reposition within canvas bounds", () => {
    expect(resolvePileDrop({ ...base, delta: { x: 9999, y: -9999 }, overId: "canvas", overData: undefined }))
      .toEqual({ kind: "reposition", x: 720, y: 0 }); // 800-80, clamped to 0
  });

  it("merges into another pile", () => {
    expect(resolvePileDrop({ ...base, overId: "pile-discard", overData: { toZone: "pile", toId: "discard" } }))
      .toEqual({ kind: "mergeIntoPile", toId: "discard" });
  });

  it("moves to hand when dropped on the hand zone", () => {
    expect(resolvePileDrop({ ...base, overId: "hand", overData: { toZone: "hand", toId: "player-1" } }))
      .toEqual({ kind: "moveToHand" });
  });

  it("returns none for opponent hands and missed drops", () => {
    expect(resolvePileDrop({ ...base, overId: "opponent-hand-p2", overData: { toZone: "opponent-hand", toId: "p2" } }))
      .toEqual({ kind: "none" });
    expect(resolvePileDrop({ ...base, overId: null, overData: undefined }))
      .toEqual({ kind: "none" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/canvasPileDrag.test.ts --reporter=verbose`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/canvasPileDrag.ts`:

```ts
export function computeStackOrigin(entries: { x: number; y: number }[]): { x: number; y: number } {
  return {
    x: Math.min(...entries.map(e => e.x)),
    y: Math.min(...entries.map(e => e.y)),
  };
}

export type PileDropResolution =
  | { kind: 'reposition'; x: number; y: number }
  | { kind: 'mergeIntoPile'; toId: string }
  | { kind: 'moveToHand' }
  | { kind: 'none' };

// Routes a whole-pile drag drop. Self-drop (pointer still over the dragged pile's own
// droppable) counts as a reposition — a short drag shouldn't merge a pile into itself.
export function resolvePileDrop(args: {
  pileId: string;
  pos: { x: number; y: number };
  delta: { x: number; y: number };
  overId: string | null;
  overData: { toZone?: string; toId?: string } | undefined;
  canvasW: number;
  canvasH: number;
  cardW: number;
  cardH: number;
}): PileDropResolution {
  const { pileId, pos, delta, overId, overData, canvasW, canvasH, cardW, cardH } = args;
  if (overId === null) return { kind: 'none' };
  if (overId === 'canvas' || overId === `pile-${pileId}`) {
    return {
      kind: 'reposition',
      x: Math.max(0, Math.min(pos.x + delta.x, Math.max(0, canvasW - cardW))),
      y: Math.max(0, Math.min(pos.y + delta.y, Math.max(0, canvasH - cardH))),
    };
  }
  if (overData?.toZone === 'pile' && overData.toId) {
    return { kind: 'mergeIntoPile', toId: overData.toId };
  }
  if (overData?.toZone === 'hand') {
    return { kind: 'moveToHand' };
  }
  return { kind: 'none' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/canvasPileDrag.test.ts --reporter=verbose`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/canvasPileDrag.ts tests/canvasPileDrag.test.ts
git commit -m "feat: canvas pile drag helpers (1031)"
```

---

### Task 8: `CanvasPileZone` component + rendering wiring

**Files:**
- Create: `src/components/PileShuffleAnimation.tsx` (extracted from PileZone)
- Create: `src/components/CanvasPileZone.tsx`
- Modify: `src/components/PileZone.tsx` (use the extracted animation)
- Modify: `src/components/CanvasZone.tsx` (render canvas piles; include them in overflow math)
- Modify: `src/components/BoardView.tsx` (pass new props)

**Interfaces:**
- Consumes: `ClientPile.pos` (Task 1), existing `DraggableCard`, `Badge`, `Button`, `cn`, `getCardDimensions`.
- Produces: `<CanvasPileZone pile sendAction draggingCardId shufflingPileIds onSelectAll onToggleSelect selectedIds highlightedMove />`; `CanvasZone` props gain `canvasPiles: ClientPile[]`, `sendAction`, `draggingCardId`, `shufflingPileIds`, `onToggleSelect`, `onSelectAll`. DOM contract for e2e (Task 11): `data-canvas-pile`, `data-testid="canvas-pile-<id>"`, `data-testid="canvas-pile-handle-<id>"`, `data-testid="canvas-pile-count-<id>"`, aria-labels `"Unstack pile"`, `"Shuffle pile"`, `"Face up"/"Face down"`, `"Select all"`. Whole-pile draggable id: `canvas-pile-drag-<id>` with `data: { type: 'canvas-pile', pileId }` (consumed by Task 10).

No unit test — this repo does not mount components in Vitest; behavior is verified by Task 11 e2e. Verification for this task is typecheck + existing suite + a manual smoke check.

- [ ] **Step 1: Extract `PileShuffleAnimation`**

Create `src/components/PileShuffleAnimation.tsx` by moving the shuffle-animation JSX out of `PileZone.tsx` (the `isShuffling && (...)` block) verbatim:

```tsx
import { CardBack } from './CardBack';

export function PileShuffleAnimation({ animationType }: { animationType: 'normal' | 'flourish' }) {
  return (
    <>
      {(animationType === 'flourish'
        ? ['flourish-cut-right-1', 'flourish-cut-right-2', 'flourish-cut-mid', 'flourish-cut-left-4', 'flourish-cut-left-5'] as const
        : ['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const
      ).map((animName, i) => (
        <div
          key={i}
          className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
          style={{
            animationName: animName,
            animationDuration: animationType === 'flourish' ? '2200ms' : '600ms',
            animationDelay: animationType === 'flourish' ? `${i * 40}ms` : '0ms',
            animationFillMode: 'forwards',
            animationTimingFunction: animationType === 'flourish' ? 'linear' : 'ease-in-out',
          } as React.CSSProperties}
        >
          <div className="relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px]">
            <CardBack />
            {animationType === 'flourish' && (
              <div
                className="absolute inset-0 rounded-md flourish-gleam-overlay"
                style={{
                  animationName: 'flourish-gleam',
                  animationDuration: '2200ms',
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: 'forwards',
                  animationTimingFunction: 'linear',
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.85) 48%, transparent 66%)',
                  backgroundSize: '300% 300%',
                  mixBlendMode: 'screen',
                } as React.CSSProperties}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}
```

In `PileZone.tsx`, replace the whole `{isShuffling && (shuffleAnimationType === 'flourish' ? [...] : [...]).map(...)}` block with:

```tsx
        {isShuffling && <PileShuffleAnimation animationType={shuffleAnimationType!} />}
```

and add the import `import { PileShuffleAnimation } from './PileShuffleAnimation';` (remove now-unused pieces if any — `CardBack` is still used by the empty-pile render, keep it).

- [ ] **Step 2: Create `CanvasPileZone`**

Create `src/components/CanvasPileZone.tsx`:

```tsx
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Eye, EyeOff, Shuffle, SquareCheck, Ungroup } from 'lucide-react';
import type { Card, ClientPile, ClientAction, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { PileShuffleAnimation } from './PileShuffleAnimation';
import { cn } from '@/lib/utils';

interface CanvasPileZoneProps {
  pile: ClientPile; // region === 'canvas'; pos is always defined for canvas piles
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds?: Map<string, 'normal' | 'flourish'>;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectedIds?: Set<string>;
  highlightedMove?: LastMoveHighlight | null;
}

export function CanvasPileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Map(), onSelectAll, onToggleSelect, selectedIds, highlightedMove }: CanvasPileZoneProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `canvas-pile-drag-${pile.id}`,
    data: { type: 'canvas-pile' as const, pileId: pile.id },
  });
  const setRefs = (node: HTMLDivElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  // Server prunes empty canvas piles; guard against transient renders anyway.
  if (pile.cards.length === 0 || !pile.pos) return null;

  const topCard = pile.cards[pile.cards.length - 1];
  const topCardId = 'id' in topCard ? (topCard as Card).id : null;
  const isTopCardSelected = topCardId !== null && (selectedIds?.has(topCardId) ?? false);
  const isDraggingTopCard = !!draggingCardId && topCardId !== null && draggingCardId === topCardId;
  const shuffleAnimationType = shufflingPileIds.get(pile.id);
  const isPileHighlighted =
    highlightedMove?.toZoneType === 'pile' && highlightedMove.toZoneId === pile.id;

  function handleTopCardClick() {
    if (topCardId !== null) onToggleSelect?.(topCardId, 'pile', pile.id);
  }

  function handleSelectAll() {
    if (!onSelectAll) return;
    const allIds = pile.cards.filter(c => 'id' in c).map(c => (c as Card).id);
    if (allIds.length === 0) return;
    const hasMaskedCards = pile.cards.some(c => !('id' in c));
    onSelectAll(allIds, 'pile', pile.id, hasMaskedCards);
  }

  return (
    <div
      ref={setRefs}
      data-canvas-pile=""
      data-testid={`canvas-pile-${pile.id}`}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: pile.pos.x,
        top: pile.pos.y,
        zIndex: pile.pos.z,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        cursor: 'grab',
      }}
      className={cn(
        'rounded-lg border bg-secondary/90 p-1 zone-hover',
        isOver ? 'border-primary' : 'border-border',
        isTopCardSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Header strip: primary whole-pile drag target (full width) + controls */}
      <div data-testid={`canvas-pile-handle-${pile.id}`} className="flex items-center justify-between gap-1 px-0.5">
        <span className="zone-label">{pile.name}</span>
        <div
          className="flex gap-0.5 zone-controls"
          // Buttons must not arm the whole-pile drag or bubble clicks to the canvas.
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp })}
            title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
            aria-label={pile.faceUp !== false ? 'Face up' : 'Face down'}
          >
            {pile.faceUp !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id })}
            title="Shuffle pile"
            aria-label="Shuffle pile"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleSelectAll}
            title="Select all cards in pile"
            aria-label="Select all"
          >
            <SquareCheck className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'UNSTACK_CANVAS_PILE', pileId: pile.id })}
            title="Unstack pile onto the canvas"
            aria-label="Unstack pile"
          >
            <Ungroup className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {/* Card area: pointer events stop here so grabbing the top card never drags the pile */}
      <div
        className="w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-md flex flex-col items-center justify-center relative py-1"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); handleTopCardClick(); }}
      >
        {isPileHighlighted && (
          <div key={highlightedMove!.nonce} className="last-move-highlight absolute inset-0 rounded-md pointer-events-none" />
        )}
        {shuffleAnimationType !== undefined && <PileShuffleAnimation animationType={shuffleAnimationType} />}
        {isDraggingTopCard && (
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
        )}
        {'id' in topCard
          ? <DraggableCard card={topCard as Card} fromZone="pile" fromId={pile.id} isSelected={isTopCardSelected} />
          : <CardBack />}
        <Badge data-testid={`canvas-pile-count-${pile.id}`} className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render canvas piles in `CanvasZone`**

In `src/components/CanvasZone.tsx`:

1. Add imports:

```tsx
import type { ClientCanvasCard, ClientPile, ClientAction, LastMoveHighlight, SelectionSource } from '@/shared/types';
import { CanvasPileZone } from './CanvasPileZone';
```

2. Extend `CanvasZoneProps`:

```tsx
  canvasPiles: ClientPile[];
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds: Map<string, 'normal' | 'flourish'>;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onSelectAll: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
```

and destructure them in the function signature.

3. Update the inner-size memo so piles count toward overflow (replace the existing `useMemo` body):

```tsx
  const { innerW, innerH, contentMaxX, contentMaxY } = useMemo(() => {
    const { w: cardW, h: cardH } = getCardDimensions();
    // Pile frames render slightly larger than a card: padding + header strip.
    const PILE_FRAME_W = cardW + 16;
    const PILE_FRAME_H = cardH + 40;
    const xs = [
      ...canvasCards.map(c => c.x + cardW),
      ...canvasPiles.map(p => (p.pos?.x ?? 0) + PILE_FRAME_W),
    ];
    const ys = [
      ...canvasCards.map(c => c.y + cardH),
      ...canvasPiles.map(p => (p.pos?.y ?? 0) + PILE_FRAME_H),
    ];
    if (xs.length === 0) {
      return { innerW: viewportSize.w, innerH: viewportSize.h, contentMaxX: 0, contentMaxY: 0 };
    }
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      innerW: Math.max(viewportSize.w, maxX + CANVAS_PADDING),
      innerH: Math.max(viewportSize.h, maxY + CANVAS_PADDING),
      contentMaxX: maxX,
      contentMaxY: maxY,
    };
  }, [canvasCards, canvasPiles, viewportSize.w, viewportSize.h]);
```

4. Render piles inside the inner canvas div, after the `canvasCards.map(...)` block:

```tsx
        {canvasPiles.map(pile => (
          <CanvasPileZone
            key={pile.id}
            pile={pile}
            sendAction={sendAction}
            draggingCardId={draggingCardId}
            shufflingPileIds={shufflingPileIds}
            onSelectAll={onSelectAll}
            onToggleSelect={onToggleSelect}
            selectedIds={selectedIds}
            highlightedMove={highlightedMove}
          />
        ))}
```

5. Show controls when piles exist even with no loose cards — change the `CanvasControls` gate to:

```tsx
      {(canvasCards.length > 0 || canvasPiles.length > 0) && (
```

6. The drag-to-pan guard in `onViewportPointerDown` already ignores presses on `[data-card-id], button`; extend it to piles:

```tsx
    if ((e.target as HTMLElement).closest('[data-card-id], [data-canvas-pile], button')) return;
```

- [ ] **Step 4: Wire props through `BoardView`**

In `src/components/BoardView.tsx`, add below the existing `spreadPiles` line:

```tsx
  const canvasPiles = gameState.piles.filter(p => p.region === 'canvas');
```

and extend the `<CanvasZone ... />` call with:

```tsx
canvasPiles={canvasPiles} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onToggleSelect={onToggleSelect} onSelectAll={onSelectAll}
```

Also exclude canvas piles from the left column — the existing filter `(p.region ?? 'pile') === 'pile'` already excludes them; verify no other `gameState.piles` consumer accidentally renders canvas piles (check `SpreadZone` usage: it filters `region === 'spread'` — fine).

- [ ] **Step 5: Verify**

Run: `npm test && npm run typecheck`
Expected: all green (no behavior change for existing states — canvas piles simply don't exist yet in any test fixture).

Optional smoke: `npm run dev` + `npm run dev:client`, join a room, verify board renders unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/PileShuffleAnimation.tsx src/components/CanvasPileZone.tsx src/components/PileZone.tsx src/components/CanvasZone.tsx src/components/BoardView.tsx
git commit -m "feat: CanvasPileZone rendering on the canvas (1031)"
```

---

### Task 9: Stack button

**Files:**
- Modify: `src/components/CanvasControls.tsx`
- Modify: `src/components/CanvasZone.tsx`
- Modify: `src/components/BoardView.tsx`
- Modify: `src/components/BoardDragLayer.tsx`

**Interfaces:**
- Consumes: `computeStackOrigin` (Task 7), `CREATE_CANVAS_PILE` action (Task 1/2).
- Produces: `CanvasControls` props gain `onStack: () => void; showStack: boolean`; `CanvasZone` prop `onStackSelected: () => void`; `BoardView` prop `onStackSelected`; `handleStackSelected` in `BoardDragLayer`. DOM contract: `data-testid="canvas-stack"`, aria-label `"Stack selected cards"`.

- [ ] **Step 1: Add the button to `CanvasControls`**

```tsx
import { Layers, SquareCheck, Trash2 } from 'lucide-react';
```

Extend props:

```tsx
interface CanvasControlsProps {
  onSelectAll: () => void;
  onDiscardAll: () => void;
  onStack: () => void;
  showStack: boolean;
}
```

Add as the FIRST button inside the container (before Select all):

```tsx
      {showStack && (
        <Button
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onStack}
          title="Stack selected cards into a pile"
          aria-label="Stack selected cards"
          data-testid="canvas-stack"
        >
          <Layers className="w-4 h-4" />
        </Button>
      )}
```

- [ ] **Step 2: Thread through `CanvasZone`**

Add to `CanvasZoneProps`: `onStackSelected: () => void;` and destructure it. Change the controls render:

```tsx
      {(canvasCards.length > 0 || canvasPiles.length > 0) && (
        <CanvasControls
          onSelectAll={onSelectAllCanvas}
          onDiscardAll={onDiscardAllCanvas}
          onStack={onStackSelected}
          showStack={selectionSource?.zone === 'canvas' && selectedIds.size >= 2}
        />
      )}
```

- [ ] **Step 3: Implement `handleStackSelected` in `BoardDragLayer`**

Add import: `import { computeStackOrigin, resolvePileDrop } from '@/lib/canvasPileDrag';` (resolvePileDrop is used in Task 10 — importing both now is fine only if Task 10 lands in the same PR; otherwise import `computeStackOrigin` alone to keep typecheck clean, and add `resolvePileDrop` in Task 10).

Add next to `handleDiscardAllCanvas`:

```tsx
  const handleStackSelected = () => {
    if (selectionSource?.zone !== 'canvas' || selectedIds.size < 2) return;
    const entries = gameState.canvasCards.filter(cc => selectedIds.has(cc.card.id));
    if (entries.length < 2) return; // stale selection — cards left the canvas
    const { x, y } = computeStackOrigin(entries);
    setSelectedIds(new Set());
    setSelectionSource(null);
    sendAction({
      type: 'CREATE_CANVAS_PILE',
      cardIds: entries.map(cc => cc.card.id),
      x,
      y,
    });
  };
```

Pass `onStackSelected={handleStackSelected}` into `<BoardView ... />`, add the prop to `BoardViewProps`, and forward it to `<CanvasZone onStackSelected={onStackSelected} ... />`.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run typecheck`

```bash
git add src/components/CanvasControls.tsx src/components/CanvasZone.tsx src/components/BoardView.tsx src/components/BoardDragLayer.tsx
git commit -m "feat: Stack button creates a canvas pile from selection (1031)"
```

---

### Task 10: Whole-pile drag in `BoardDragLayer`

**Files:**
- Modify: `src/components/BoardDragLayer.tsx`

**Interfaces:**
- Consumes: `resolvePileDrop` (Task 7); draggable data `{ type: 'canvas-pile', pileId }` (Task 8); `MOVE_CANVAS_PILE`, `MOVE_ALL_PILE_CARDS { toZone: 'hand' }` (Tasks 4, 6).
- Produces: pile drags route to reposition / merge / to-hand; DragOverlay shows a card-back ghost with count while a pile is dragged.

**Collision-detection note (why no `customCollision` change is needed):** canvas-pile droppables use the `pile-` id prefix, and `customCollision` checks pile containers BEFORE the canvas fallback — so a pointer inside a pile-on-canvas already resolves to the pile, not the felt. Self-drop resolves to the dragged pile's own droppable and `resolvePileDrop` treats that as a reposition.

- [ ] **Step 1: Add pile-drag state and start/cancel handling**

In `BoardDragLayer.tsx`, add imports:

```tsx
import { Badge } from '@/components/ui/badge';
import { CardBack } from './CardBack';
```

(and `resolvePileDrop` if not imported in Task 9).

Add state/ref next to `activeCard`:

```tsx
  const [activePileId, setActivePileId] = useState<string | null>(null);
  const activePileIdRef = useRef<string | null>(null);
```

At the TOP of `handleDragStart` (before the `data?.card` guard), add:

```tsx
    const maybePile = event.active.data.current as { type?: string; pileId?: string } | undefined;
    if (maybePile?.type === 'canvas-pile' && maybePile.pileId) {
      activePileIdRef.current = maybePile.pileId;
      setActivePileId(maybePile.pileId);
      setDragging(true);
      return;
    }
```

In `handleDragCancel`, add at the top:

```tsx
    activePileIdRef.current = null;
    setActivePileId(null);
```

- [ ] **Step 2: Route pile drops in `handleDragEnd`**

At the TOP of `handleDragEnd` (before the canvas branch), add:

```tsx
    // WHOLE-PILE DRAG BRANCH: reposition on canvas, merge into a pile/spread, or empty into own hand.
    if (activePileIdRef.current !== null) {
      const pileId = activePileIdRef.current;
      activePileIdRef.current = null;
      setActivePileId(null);
      setDragging(false);
      dropSuccessRef.current = true; // pile ghost clears immediately; skip snap-back animation
      const pile = gameState.piles.find(p => p.id === pileId);
      if (!pile?.pos) return;
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const { w: CARD_W, h: CARD_H } = getCardDimensions();
      const resolution = resolvePileDrop({
        pileId,
        pos: { x: pile.pos.x, y: pile.pos.y },
        delta: { x: event.delta.x, y: event.delta.y },
        overId: event.over ? String(event.over.id) : null,
        overData: event.over?.data.current as { toZone?: string; toId?: string } | undefined,
        canvasW: canvasBounds?.width ?? 0,
        canvasH: canvasBounds?.height ?? 0,
        cardW: CARD_W,
        cardH: CARD_H,
      });
      if (resolution.kind === 'reposition') {
        sendAction({ type: 'MOVE_CANVAS_PILE', pileId, x: resolution.x, y: resolution.y });
      } else if (resolution.kind === 'mergeIntoPile') {
        sendAction({ type: 'MOVE_ALL_PILE_CARDS', fromId: pileId, toId: resolution.toId });
      } else if (resolution.kind === 'moveToHand') {
        sendAction({ type: 'MOVE_ALL_PILE_CARDS', fromId: pileId, toId: playerId, toZone: 'hand' });
      }
      return;
    }
```

- [ ] **Step 3: Pile ghost in the DragOverlay**

Locate the pile being dragged for the overlay (before the `return`):

```tsx
  const activePile = activePileId ? gameState.piles.find(p => p.id === activePileId) ?? null : null;
```

Change the `DragOverlay` contents to render the pile ghost when a pile drag is active:

```tsx
            {activePile ? (
              <div className="relative" style={{ opacity: 0.7 }}>
                <CardBack />
                <Badge className="absolute -bottom-2 -right-2">{activePile.cards.length}</Badge>
              </div>
            ) : activeCard ? (
              <div style={{ boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined, borderRadius: dragCoversSomeCard ? 6 : undefined }}>
                <div style={{ opacity: 0.5, transform: 'scale(1.05)' }}>
                  <CardOverlay card={activeCard} />
                </div>
              </div>
            ) : null}
```

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run typecheck`
Expected: green. Manual smoke (recommended): run both dev servers, place 2+ cards on the canvas, Stack them, drag the pile header around, drop it on discard.

```bash
git add src/components/BoardDragLayer.tsx
git commit -m "feat: whole-pile drag — reposition, merge, empty into hand (1031)"
```

---

### Task 11: Playwright e2e

**Files:**
- Create: `playwright/runtimePiles.spec.ts`

**Interfaces:**
- Consumes: DOM contract from Tasks 8–9 (`data-canvas-pile`, `canvas-pile-handle-*`, `canvas-pile-count-*`, `canvas-stack`, `Unstack pile`); the insert-position dialog ("Insert card where?" with a Top button) for card-onto-pile drops.

**Prereqs:** both dev servers must be up. Per project memory: kill anything LISTENing on 5173/1999 first (`lsof -ti tcp:5173 -sTCP:LISTEN`, same for 1999), then run `npm run test:e2e` from the worktree — Playwright auto-starts servers from cwd.

- [ ] **Step 1: Write the spec**

Create `playwright/runtimePiles.spec.ts`:

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

// dnd-kit needs real pointer events; dragAndDrop() fires HTML5 events it ignores.
async function pointerDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

// Drag n hand cards onto the canvas at spread-out spots, then multi-select them all.
async function placeAndSelectOnCanvas(page: Page, n: number) {
  const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
  const canvas = await page.getByTestId('canvas-zone').boundingBox();
  if (!canvas) throw new Error('no canvas box');
  const startCount = await handCards.count();
  for (let i = 0; i < n; i++) {
    await expect(handCards).toHaveCount(startCount - i);
    await page.waitForTimeout(300); // let the hand re-fan settle
    const src = await handCards.nth(0).boundingBox();
    if (!src) throw new Error('no source card box');
    await pointerDrag(page,
      { x: src.x + src.width / 2, y: src.y + src.height / 2 },
      { x: canvas.x + 150 + i * 120, y: canvas.y + 200 },
    );
  }
  const canvasCards = page.locator('[data-testid="canvas-inner"] > [data-card-id]');
  await expect(canvasCards).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    await canvasCards.nth(i).click();
  }
  await expect(page.locator('[data-testid="canvas-inner"] [aria-pressed="true"]')).toHaveCount(n);
}

test.describe('runtime piles (1031)', () => {
  test('stack, opponent view, drop-onto-pile, unstack', async ({ browser }) => {
    const roomCode = nanoid(8);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await pageA.setViewportSize({ width: 1280, height: 720 });
    await pageB.setViewportSize({ width: 1280, height: 720 });

    await joinRoom(pageA, roomCode, 'Alice');
    await joinRoom(pageB, roomCode, 'Bob');
    await dealCards(pageA, 4); // deals to both players

    // Alice stacks three loose canvas cards
    await placeAndSelectOnCanvas(pageA, 3);
    await pageA.getByTestId('canvas-stack').click();
    const pileA = pageA.locator('[data-canvas-pile]');
    await expect(pileA).toHaveCount(1);
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('3');
    await expect(pageA.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(0);

    // Bob sees the pile with count 3
    const pileB = pageB.locator('[data-canvas-pile]');
    await expect(pileB).toHaveCount(1);
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('3');

    // Bob drops one of his hand cards onto the pile (nested droppable: pile beats felt)
    const bobCard = await pageB.getByTestId('hand-zone').locator('[aria-pressed]').nth(0).boundingBox();
    const pileBox = await pileB.boundingBox();
    if (!bobCard || !pileBox) throw new Error('missing boxes');
    await pointerDrag(pageB,
      { x: bobCard.x + bobCard.width / 2, y: bobCard.y + bobCard.height / 2 },
      { x: pileBox.x + pileBox.width / 2, y: pileBox.y + pileBox.height / 2 },
    );
    // Non-empty pile drop → insert-position dialog
    await pageB.getByRole('button', { name: 'Top' }).click();
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');

    // Alice unstacks: pile gone, 4 loose cards, on both boards
    await pileA.hover();
    await pageA.getByRole('button', { name: 'Unstack pile' }).click();
    await expect(pageA.locator('[data-canvas-pile]')).toHaveCount(0);
    await expect(pageA.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(4);
    await expect(pageB.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(4);

    await ctxA.close();
    await ctxB.close();
  });

  test('drag disambiguation: top card vs frame handle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await placeAndSelectOnCanvas(page, 2);
    await page.getByTestId('canvas-stack').click();
    const pile = page.locator('[data-canvas-pile]');
    await expect(pile).toHaveCount(1);

    // Frame-handle drag repositions the pile (count unchanged).
    // The handle is targeted by coordinates: the header row's label area (left side),
    // clear of the control buttons on the right.
    const before = await pile.boundingBox();
    if (!before) throw new Error('no pile box');
    // Grab the handle's label area (left side), clear of the control buttons
    await pointerDrag(page,
      { x: before.x + 12, y: before.y + 10 },
      { x: before.x + 200, y: before.y + 120 },
    );
    await expect(async () => {
      const after = await pile.boundingBox();
      if (!after) throw new Error('pile vanished');
      expect(Math.abs(after.x - before.x)).toBeGreaterThan(100);
    }).toPass();
    await expect(pile.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('2');

    // Top-card drag moves ONE card off; pile stays with count 1
    const pileBox2 = await pile.boundingBox();
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!pileBox2 || !canvas) throw new Error('missing boxes');
    // Card area sits below the header strip; aim at the frame's center-bottom half
    await pointerDrag(page,
      { x: pileBox2.x + pileBox2.width / 2, y: pileBox2.y + pileBox2.height * 0.65 },
      { x: canvas.x + canvas.width / 2, y: canvas.y + 100 },
    );
    await expect(pile.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('1');
    await expect(page.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(1);
  });

  test('pile frame dropped on discard moves all cards there', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await placeAndSelectOnCanvas(page, 2);
    await page.getByTestId('canvas-stack').click();
    const pile = page.locator('[data-canvas-pile]');
    await expect(pile).toHaveCount(1);

    const pileBox = await pile.boundingBox();
    const discard = await page.getByTestId('pile-discard').boundingBox();
    if (!pileBox || !discard) throw new Error('missing boxes');
    await pointerDrag(page,
      { x: pileBox.x + 12, y: pileBox.y + 10 },
      { x: discard.x + discard.width / 2, y: discard.y + discard.height / 2 },
    );
    await expect(page.locator('[data-canvas-pile]')).toHaveCount(0);
    // Count badge renders inside the pile-discard div (see PileZone)
    await expect(page.getByTestId('pile-discard').getByText('2', { exact: true })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the e2e suite**

First free the ports (LISTEN-scoped only):

```bash
lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill 2>/dev/null; lsof -ti tcp:1999 -sTCP:LISTEN | xargs kill 2>/dev/null
```

Run: `npm run test:e2e -- runtimePiles.spec.ts`
Expected: 3 tests PASS. If a drag flakes, check the known culprits first (memory: card.click racing hydration → wait on `aria-pressed`; scope card locators to `canvas-inner`).

- [ ] **Step 3: Run the FULL e2e suite**

Run: `npm run test:e2e`
Expected: all specs pass (regressions in canvas drops would show in `canvasMulticard.spec.ts` / `game.spec.ts`).

- [ ] **Step 4: Commit**

```bash
git add playwright/runtimePiles.spec.ts
git commit -m "test: e2e coverage for runtime piles (1031)"
```

---

### Task 12: Docs + final verification

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md` (remove row 1031)
- Modify: `.planning/ROADMAP.md` (add milestone entry)

- [ ] **Step 1: Update BACKLOG.md**

Delete the `| 1031 | Runtime piles — ... |` row.

- [ ] **Step 2: Update ROADMAP.md**

Add a milestone entry above the "Active & Future Work" section, following the existing `<details><summary>` format. Use the next unclaimed version number (v1.26 as of planning — check the file's latest entry first and bump past it if other work shipped meanwhile):

```markdown
<details>
<summary>✅ v1.26 Runtime Piles (1031) — SHIPPED 2026-07-XX</summary>

- [x] Runtime piles: stack loose canvas cards into a real pile (`region: "canvas"` + pos) with full shuffle/face/insert/masking semantics; Stack button on canvas selection; unstack fans back to loose cards; whole-pile drag repositions on canvas or empties into pile/spread/own hand; emptied canvas piles auto-prune. Design: docs/superpowers/specs/2026-07-08-runtime-piles-design.md

</details>
```

(Replace `XX` with the actual ship date.)

- [ ] **Step 3: Full verification**

```bash
npm test && npm run typecheck && npm run test:e2e
```

Expected: everything green.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "docs: ship runtime piles (1031) — backlog + roadmap"
```

After this task: push the branch and open a PR per the repo's Git workflow (`git push -u origin worktree-runtime-piles`, then `gh pr create`). Run a code review (`requesting-code-review` / `code-review` skill) before merging — house rule after every execution phase.
