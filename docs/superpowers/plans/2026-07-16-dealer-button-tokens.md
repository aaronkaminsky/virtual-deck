# Dealer Button & Movable Tokens (1035) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four singleton draggable tokens (dealer puck + red/blue/green discs) that players place on the canvas from a tray and move like a physical dealer button, gated behind a `tokensEnabled` toggle (default off) independent of chips mode.

**Architecture:** Tokens are a new public collection in `GameState` (never masked by `viewFor`). Three new actions (`SET_TOKENS_MODE`, `MOVE_TOKEN`, `RETURN_TOKEN`) follow the existing server action patterns in `party/index.ts`. Client-side, a `TokenTray` in the pile column and absolutely-positioned `CanvasToken`s on the felt use dnd-kit drags routed through a new token branch in `BoardDragLayer`, modeled exactly on the existing whole-pile (`canvas-pile`) drag branch.

**Tech Stack:** TypeScript, PartyKit (`party/index.ts`), React + @dnd-kit/core, Vitest (`tests/`), Playwright (`playwright/`).

**Spec:** `docs/superpowers/specs/2026-07-16-dealer-button-tokens-design.md`

## Global Constraints

- Token moves take **no undo snapshot** — never call `takeSnapshot` in token handlers; `UNDO_MOVE` must carry live `tokens`/`tokensEnabled` across a restore.
- `tokensEnabled` defaults to **false**; `MOVE_TOKEN`/`RETURN_TOKEN` silently no-op while disabled (chips `TRANSFER_CHIPS` precedent).
- Toggle-off preserves token positions (pure display gate); `RESET_TABLE` sets every token's `pos` to `null`.
- Any player may move any token — no ownership checks.
- Tokens are never masked: `viewFor` passes `tokens`/`tokensEnabled` through unchanged.
- Token z shares the loose canvas z-space: every placement sets `z = maxCanvasZ + 1`, and `maxCanvasZ` must count token z.
- Tokens are not drop targets, have no selection state, and never dispatch card actions.
- TDD: each task writes its failing test first (`npm test -- <file>` to scope), then implements, then commits. Pre-commit hook runs `npm test` + `npm run typecheck`.
- Repo rule: work stays on this worktree branch (`worktree-feat+dealer-tokens-1035`); never commit to `main`.

---

### Task 1: Shared types + server state plumbing

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `party/index.ts` (imports, `defaultGameState`, new `defaultTokens`, `viewFor`, `onStart` migration)
- Modify: `tests/viewFor.test.ts` (`makeTestState` literal gains the new required fields)
- Modify: `tests/keyboardUtils.test.ts` (`makeState` literal gains the new required fields)
- Test: `tests/tokensState.test.ts`

**Interfaces:**
- Consumes: existing `PilePos`, `GameState`, `ClientGameState`, `ClientAction` in `src/shared/types.ts`; `defaultGameState`, `viewFor` exports in `party/index.ts`.
- Produces: `TokenId`, `TOKEN_IDS`, `Token` types; `GameState.tokens: Token[]`, `GameState.tokensEnabled: boolean` (mirrored on `ClientGameState`); `ClientAction` variants `SET_TOKENS_MODE`/`MOVE_TOKEN`/`RETURN_TOKEN`; exported `defaultTokens(): Token[]` from `party/index.ts`. All later tasks rely on these exact names.

- [ ] **Step 1: Write the failing test**

Create `tests/tokensState.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState, defaultTokens, viewFor } from "../party/index";
import { makeMockRoom } from "./helpers";
import type { GameState } from "../src/shared/types";

describe("token state plumbing", () => {
  it("defaultGameState starts with tokensEnabled false and all four tokens in the tray", () => {
    const state = defaultGameState("room-1");
    expect(state.tokensEnabled).toBe(false);
    expect(state.tokens).toEqual([
      { id: "dealer", pos: null },
      { id: "red", pos: null },
      { id: "blue", pos: null },
      { id: "green", pos: null },
    ]);
  });

  it("viewFor passes tokens and tokensEnabled through unmasked", () => {
    const state = defaultGameState("room-1");
    state.tokensEnabled = true;
    state.tokens[0].pos = { x: 10, y: 20, z: 3 };
    const view = viewFor(state, "player-1");
    expect(view.tokensEnabled).toBe(true);
    expect(view.tokens[0]).toEqual({ id: "dealer", pos: { x: 10, y: 20, z: 3 } });
  });

  it("onStart defaults tokens fields for pre-token persisted state", async () => {
    const legacy = defaultGameState("room-1") as Partial<GameState>;
    delete legacy.tokens;
    delete legacy.tokensEnabled;
    const room = makeMockRoom();
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "gameState" ? legacy : undefined)
    );
    const gameRoom = new GameRoom(room);
    await gameRoom.onStart();
    expect(gameRoom.gameState.tokens).toEqual(defaultTokens());
    expect(gameRoom.gameState.tokensEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokensState`
Expected: FAIL — `defaultTokens` is not exported / `tokens` undefined on state.

- [ ] **Step 3: Add the shared types**

In `src/shared/types.ts`, after the `PilePos` interface (line ~29), add:

```ts
export type TokenId = "dealer" | "red" | "blue" | "green";
export const TOKEN_IDS: readonly TokenId[] = ["dealer", "red", "blue", "green"];

export interface Token {
  id: TokenId;
  pos: PilePos | null;   // null = in tray; z shares the loose canvas z-space
}
```

In `interface GameState`, after `canvasCards: CanvasCard[];`, add:

```ts
  tokens: Token[];
  tokensEnabled: boolean;
```

In `interface ClientGameState`, after `canvasCards: ClientCanvasCard[];`, add:

```ts
  tokens: Token[];
  tokensEnabled: boolean;
```

In `ClientAction`, after the `MOVE_CANVAS_PILE` variant, add:

```ts
  | { type: "SET_TOKENS_MODE"; enabled: boolean }
  | { type: "MOVE_TOKEN"; tokenId: TokenId; x: number; y: number }
  | { type: "RETURN_TOKEN"; tokenId: TokenId };
```

(Move the `;` from the `MOVE_CANVAS_PILE` line onto the new last variant.)

- [ ] **Step 4: Plumb the server state**

In `party/index.ts`:

Add `Token` and `TOKEN_IDS` to the shared-types imports (line 2-3):

```ts
import type { AttractAntic, CanvasCard, Card, ClientAction, ClientGameState, ClientPile, EffectKind, GameState, MaskedCard, ServerEvent, Suit, Rank, Token, TokenId } from "../src/shared/types";
import { ATTRACT_ANTICS, TOKEN_IDS } from "../src/shared/types";
```

Above `defaultGameState` (line ~60), add:

```ts
export function defaultTokens(): Token[] {
  return TOKEN_IDS.map(id => ({ id, pos: null }));
}
```

In `defaultGameState`'s returned object, after `chipsInitialized: false,`, add:

```ts
    tokens: defaultTokens(),
    tokensEnabled: false,
```

In `viewFor`'s returned object, after `canvasCards: ...`, add:

```ts
    tokens: state.tokens,
    tokensEnabled: state.tokensEnabled,
```

In `onStart`, after the `chipsInitialized` migration guard (line ~217), add:

```ts
    // Migrate state: 1035 adds tokens and tokensEnabled to GameState
    if (!Array.isArray((this.gameState as unknown as GameState).tokens)) {
      (this.gameState as unknown as GameState).tokens = defaultTokens();
    }
    if (!('tokensEnabled' in this.gameState)) {
      (this.gameState as unknown as GameState).tokensEnabled = false;
    }
```

- [ ] **Step 5: Fix the two test files that build full state literals**

Adding required fields breaks typecheck for any full object literal typed as `GameState`/`ClientGameState`. Two exist:

In `tests/viewFor.test.ts`, in `makeTestState()`'s returned object (line ~10-33), after `chipsInitialized: false,` add:

```ts
    tokens: [
      { id: "dealer", pos: null },
      { id: "red", pos: null },
      { id: "blue", pos: null },
      { id: "green", pos: null },
    ],
    tokensEnabled: false,
```

In `tests/keyboardUtils.test.ts`, in `makeState()`'s returned object (line ~19-38), after `startingChips: 1000,` and before `...overrides,` add:

```ts
    tokens: [],
    tokensEnabled: false,
```

(`Token[]` may be empty here — keyboard logic never reads tokens; the literal only needs to satisfy the type.)

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test -- tokensState` → PASS (3 tests).
Run: `npm run typecheck` → clean. If it flags any OTHER file constructing a full `GameState`/`ClientGameState` literal, add the same two fields there (`tokens: [], tokensEnabled: false` is sufficient unless the test asserts on tokens).

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/tokensState.test.ts tests/viewFor.test.ts tests/keyboardUtils.test.ts
git commit -m "feat(1035): add Token types, defaults, viewFor passthrough, hydration guards"
```

---

### Task 2: SET_TOKENS_MODE handler

**Files:**
- Modify: `party/index.ts` (new `case` in the `onMessage` switch, next to `SET_CHIPS_MODE` at line ~1241)
- Test: `tests/tokensMode.test.ts`

**Interfaces:**
- Consumes: `GameState.tokensEnabled`, `GameState.tokens` (Task 1); action `{ type: "SET_TOKENS_MODE"; enabled: boolean }`.
- Produces: server behavior — `tokensEnabled` flips with strict boolean coercion, no snapshot, positions untouched. Tasks 3–4 assume this exists.

- [ ] **Step 1: Write the failing test**

Create `tests/tokensMode.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("SET_TOKENS_MODE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("enables and disables tokens", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.tokensEnabled).toBe(true);
    await send({ type: "SET_TOKENS_MODE", enabled: false });
    expect(room.gameState.tokensEnabled).toBe(false);
  });

  it("coerces non-boolean enabled to false", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: "true" });
    expect(room.gameState.tokensEnabled).toBe(false);
  });

  it("takes no undo snapshot", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("toggling off preserves token positions; re-enable restores them", async () => {
    room.gameState.tokensEnabled = true;
    room.gameState.tokens[0].pos = { x: 100, y: 50, z: 5 };
    await send({ type: "SET_TOKENS_MODE", enabled: false });
    expect(room.gameState.tokens[0].pos).toEqual({ x: 100, y: 50, z: 5 });
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.tokens[0].pos).toEqual({ x: 100, y: 50, z: 5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokensMode`
Expected: FAIL — `tokensEnabled` stays `false` after enable (no handler; unknown action types fall through the switch).

- [ ] **Step 3: Implement the handler**

In `party/index.ts`, directly after the `SET_CHIPS_MODE` case block (ends line ~1257), add:

```ts
      case "SET_TOKENS_MODE": {
        // V5 Input Validation: strict boolean equality (SET_CHIPS_MODE precedent)
        this.gameState.tokensEnabled = action.enabled === true;
        // Token positions are untouched — toggling off is a pure display gate (design 1035).
        // Intentionally no takeSnapshot() — mode toggle is not undoable (consistent with SET_CHIPS_MODE)
        break;
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tokensMode`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add party/index.ts tests/tokensMode.test.ts
git commit -m "feat(1035): SET_TOKENS_MODE toggle handler"
```

---

### Task 3: MOVE_TOKEN / RETURN_TOKEN handlers + maxCanvasZ extension

**Files:**
- Modify: `party/index.ts` (`maxCanvasZ` at line ~88; two new `case` blocks after `MOVE_CANVAS_PILE` at line ~1037)
- Test: `tests/moveToken.test.ts`

**Interfaces:**
- Consumes: `Token`, `GameState.tokens/tokensEnabled` (Task 1); `maxCanvasZ`, `ServerEvent` error shape.
- Produces: `MOVE_TOKEN` sets `pos = { x, y, z: maxCanvasZ + 1 }`; `RETURN_TOKEN` sets `pos = null`; error codes `TOKEN_NOT_FOUND`, `INVALID_COORDINATES`; `maxCanvasZ` counts token z. Task 7's client dispatch relies on these action semantics.

- [ ] **Step 1: Write the failing test**

Create `tests/moveToken.test.ts`:

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

describe("MOVE_TOKEN / RETURN_TOKEN", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("places a token above all canvas cards and piles, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 200, y: 150 });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.pos).toEqual({ x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("silently no-ops while tokens are disabled", async () => {
    room.gameState.tokensEnabled = false;
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 200, y: 150 });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.pos).toBeNull();
    expect(errorCodes(sender)).toEqual([]);
  });

  it("errors TOKEN_NOT_FOUND for an unknown tokenId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "purple", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["TOKEN_NOT_FOUND"]);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: Infinity, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("RETURN_TOKEN sends a placed token back to the tray, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "red", x: 50, y: 60 });
    await send({ type: "RETURN_TOKEN", tokenId: "red" });
    expect(room.gameState.tokens.find(t => t.id === "red")!.pos).toBeNull();
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("RETURN_TOKEN no-ops while tokens are disabled", async () => {
    room.gameState.tokens.find(t => t.id === "red")!.pos = { x: 1, y: 2, z: 3 };
    room.gameState.tokensEnabled = false;
    await send({ type: "RETURN_TOKEN", tokenId: "red" });
    expect(room.gameState.tokens.find(t => t.id === "red")!.pos).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("token z participates in the shared canvas z-space (PLACE_ON_CANVAS lands above a token)", async () => {
    room.gameState.tokens.find(t => t.id === "blue")!.pos = { x: 5, y: 5, z: 40 };
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- moveToken`
Expected: FAIL — token `pos` stays `null` (no handlers), z-space test gets `z: 10` not `41`.

- [ ] **Step 3: Extend maxCanvasZ**

In `party/index.ts`, replace the `maxCanvasZ` function (line ~88):

```ts
export function maxCanvasZ(state: GameState): number {
  const cardMax = state.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  const pileMax = state.piles.reduce((m, p) => Math.max(m, p.pos?.z ?? 0), cardMax);
  return state.tokens.reduce((m, t) => Math.max(m, t.pos?.z ?? 0), pileMax);
}
```

- [ ] **Step 4: Implement the handlers**

In `party/index.ts`, directly after the `MOVE_CANVAS_PILE` case block (ends line ~1038), add:

```ts
      case "MOVE_TOKEN": {
        // Chips precedent (TRANSFER_CHIPS): silent no-op while the feature is off
        if (!this.gameState.tokensEnabled) break;
        const moveTokenTarget = this.gameState.tokens.find(t => t.id === action.tokenId);
        if (!moveTokenTarget) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "TOKEN_NOT_FOUND",
            message: `No token found with id: ${action.tokenId}`,
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
        // Intentionally no takeSnapshot() — token moves are not undoable (design 1035)
        moveTokenTarget.pos = { x: action.x, y: action.y, z: maxCanvasZ(this.gameState) + 1 };
        break;
      }
      case "RETURN_TOKEN": {
        if (!this.gameState.tokensEnabled) break;
        const returnTokenTarget = this.gameState.tokens.find(t => t.id === action.tokenId);
        if (!returnTokenTarget) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "TOKEN_NOT_FOUND",
            message: `No token found with id: ${action.tokenId}`,
          } satisfies ServerEvent));
          break;
        }
        returnTokenTarget.pos = null;
        break;
      }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- moveToken`
Expected: PASS (7 tests). Also run `npm test -- moveCanvasPile` — the existing z-space tests must still pass with the extended `maxCanvasZ`.

- [ ] **Step 6: Commit**

```bash
git add party/index.ts tests/moveToken.test.ts
git commit -m "feat(1035): MOVE_TOKEN/RETURN_TOKEN handlers, tokens join canvas z-space"
```

---

### Task 4: RESET_TABLE returns tokens; UNDO_MOVE carries live token state

**Files:**
- Modify: `party/index.ts` (`RESET_TABLE` case at line ~710, `UNDO_MOVE` case at line ~1039)
- Test: `tests/tokensResetUndo.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 handlers and state.
- Produces: reset/undo invariants the spec requires; also migrates legacy undo snapshots that predate `tokens` (carry-forward doubles as migration).

- [ ] **Step 1: Write the failing test**

Create `tests/tokensResetUndo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { GameState } from "../src/shared/types";

describe("tokens vs RESET_TABLE and UNDO_MOVE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("RESET_TABLE returns all tokens to the tray", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 10, y: 20 });
    await send({ type: "MOVE_TOKEN", tokenId: "red", x: 30, y: 40 });
    await send({ type: "RESET_TABLE" });
    expect(room.gameState.tokens.every(t => t.pos === null)).toBe(true);
  });

  it("UNDO_MOVE restores cards but never teleports tokens or flips the toggle", async () => {
    // Seed an undoable card move (MOVE_CANVAS_PILE takes a snapshot)
    room.gameState.piles.push({
      id: "canvas-pile-abc", name: "Stack", cards: [makeCard("A-s", true)],
      faceUp: true, region: "canvas", ownerId: null, pos: { x: 10, y: 10, z: 2 },
    });
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: 200, y: 150 });
    // Token moves AFTER the snapshot
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 99, y: 88 });

    await send({ type: "UNDO_MOVE" });

    const pile = room.gameState.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 10, y: 10, z: 2 });          // card move undone
    const dealer = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(dealer.pos).toMatchObject({ x: 99, y: 88 });          // token untouched
    expect(room.gameState.tokensEnabled).toBe(true);             // toggle untouched
  });

  it("UNDO_MOVE migrates legacy snapshots that predate tokens", async () => {
    // Simulate a persisted pre-1035 snapshot: no tokens/tokensEnabled fields
    const legacySnap = JSON.parse(JSON.stringify(room.gameState)) as Partial<GameState>;
    delete legacySnap.tokens;
    delete legacySnap.tokensEnabled;
    legacySnap.undoSnapshots = [];
    room.gameState.undoSnapshots.push(legacySnap as GameState);

    await send({ type: "UNDO_MOVE" });

    expect(Array.isArray(room.gameState.tokens)).toBe(true);
    expect(room.gameState.tokens).toHaveLength(4);
    expect(room.gameState.tokensEnabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokensResetUndo`
Expected: FAIL — reset leaves tokens placed; undo restores `dealer.pos` to `null`; legacy test ends with `tokens` undefined.

- [ ] **Step 3: Implement**

In `party/index.ts`, in the `RESET_TABLE` case, after `this.gameState.undoSnapshots = [];` (line ~718), add:

```ts
        for (const token of this.gameState.tokens) token.pos = null;
```

In the `UNDO_MOVE` case, replace the body between `if (!snap) { break; }` and `this.gameState = snap;` so the case reads:

```ts
      case "UNDO_MOVE": {
        const remainingSnapshots = [...this.gameState.undoSnapshots];
        const snap = remainingSnapshots.pop();
        if (!snap) {
          break;
        }
        // 1035: tokens are not undoable — carry live token state across the restore
        // (same pattern as undoSnapshots). Also migrates legacy snapshots that predate tokens.
        snap.tokens = this.gameState.tokens;
        snap.tokensEnabled = this.gameState.tokensEnabled;
        this.gameState = snap;
        this.gameState.undoSnapshots = remainingSnapshots;
        clearLastMove = true;
        break;
      }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tokensResetUndo`
Expected: PASS (3 tests). Also run `npm test -- undoMove resetTable` — existing suites must stay green.

- [ ] **Step 5: Commit**

```bash
git add party/index.ts tests/tokensResetUndo.test.ts
git commit -m "feat(1035): RESET_TABLE trays tokens; UNDO_MOVE carries live token state"
```

---

### Task 5: TokenDisc + TokenTray components, ControlsBar toggle, BoardView wiring

**Files:**
- Create: `src/lib/tokenDrag.ts` (constants only in this task; drop resolution comes in Task 7)
- Create: `src/components/TokenDisc.tsx`
- Create: `src/components/TokenTray.tsx`
- Modify: `src/components/ControlsBar.tsx` (after the Poker Chips section, line ~161)
- Modify: `src/components/BoardView.tsx` (pile column, after the PotZone conditional at line ~139-141)
- Test: `tests/tokenTray.test.ts`

**Interfaces:**
- Consumes: `Token`, `TokenId` from `@/shared/types`; `SET_TOKENS_MODE` action (Task 2).
- Produces: `TOKEN_SIZE = 32` (exported from `src/lib/tokenDrag.ts`); `TokenDisc({ tokenId })` and `TOKEN_LABELS` (from `TokenDisc.tsx`); `TokenTray({ tokens })` with droppable id `'token-tray'`; tray tokens are draggables with id `` `token-${tokenId}` `` and `data: { type: 'token', tokenId }`. Tasks 6–7 rely on the draggable id/data shape, `'token-tray'` droppable id, and testids `tray-token-<id>` / `token-slot-<id>` / `token-tray`.

- [ ] **Step 1: Write the failing test**

UI components in this repo are tested with `?raw` source-regex assertions (see `tests/chipsPotZone.test.ts`). Create `tests/tokenTray.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import TokenDiscSrc from "../src/components/TokenDisc.tsx?raw";
import TokenTraySrc from "../src/components/TokenTray.tsx?raw";
import ControlsBarSrc from "../src/components/ControlsBar.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("TokenDisc", () => {
  it("renders a fixed-size disc per TokenId with a D on the dealer puck", () => {
    expect(TokenDiscSrc).toMatch(/TOKEN_SIZE/);
    expect(TokenDiscSrc).toMatch(/dealer/);
    expect(TokenDiscSrc).toMatch(/rounded-full/);
    expect(TokenDiscSrc).toMatch(/'D'/);
  });
});

describe("TokenTray", () => {
  it("is a droppable with id token-tray", () => {
    expect(TokenTraySrc).toMatch(/useDroppable\(\{\s*id:\s*'token-tray'\s*\}\)/);
  });

  it("tray tokens are draggables carrying type token data", () => {
    expect(TokenTraySrc).toMatch(/useDraggable/);
    expect(TokenTraySrc).toMatch(/type:\s*'token'/);
    expect(TokenTraySrc).toMatch(/`token-\$\{tokenId\}`/);
  });

  it("renders a draggable for tray tokens and an empty slot for placed ones", () => {
    expect(TokenTraySrc).toMatch(/tray-token-/);
    expect(TokenTraySrc).toMatch(/token-slot-/);
    expect(TokenTraySrc).toMatch(/pos === null/);
  });
});

describe("ControlsBar tokens toggle", () => {
  it("dispatches SET_TOKENS_MODE to flip tokensEnabled", () => {
    expect(ControlsBarSrc).toMatch(/type:\s*'SET_TOKENS_MODE'[\s\S]{0,80}enabled:\s*!gameState\.tokensEnabled/);
  });

  it("labels the toggle with enable/disable aria", () => {
    expect(ControlsBarSrc).toMatch(/Enable tokens/);
    expect(ControlsBarSrc).toMatch(/Disable tokens/);
  });
});

describe("BoardView renders TokenTray in the rail when tokens are enabled", () => {
  it("imports TokenTray", () => {
    expect(BoardViewSrc).toMatch(/import\s*\{\s*TokenTray\s*\}\s*from\s*'\.\/TokenTray'/);
  });

  it("guards TokenTray with gameState.tokensEnabled", () => {
    expect(BoardViewSrc).toMatch(/gameState\.tokensEnabled\s*&&[\s\S]{0,200}<TokenTray/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokenTray`
Expected: FAIL — cannot resolve `../src/components/TokenDisc.tsx?raw` (file does not exist).

- [ ] **Step 3: Create `src/lib/tokenDrag.ts` (constant only)**

```ts
// Token disc diameter in px — sized so two tokens fit per row in the 80px
// desktop rail (and one per row in the 56px mobile rail) with the tray's
// padding and gaps.
export const TOKEN_SIZE = 32;
```

- [ ] **Step 4: Create `src/components/TokenDisc.tsx`**

```tsx
import type { TokenId } from '@/shared/types';
import { TOKEN_SIZE } from '@/lib/tokenDrag';
import { cn } from '@/lib/utils';

const TOKEN_STYLES: Record<TokenId, string> = {
  dealer: 'bg-white text-neutral-900 border-neutral-400',
  red: 'bg-red-700 border-red-900',
  blue: 'bg-blue-700 border-blue-900',
  green: 'bg-green-700 border-green-900',
};

export const TOKEN_LABELS: Record<TokenId, string> = {
  dealer: 'Dealer button',
  red: 'Red token',
  blue: 'Blue token',
  green: 'Green token',
};

// Presentational disc shared by the tray, the canvas, and the drag ghost.
export function TokenDisc({ tokenId }: { tokenId: TokenId }) {
  return (
    <div
      className={cn(
        'rounded-full border-2 shadow-md flex items-center justify-center select-none font-bold text-sm',
        TOKEN_STYLES[tokenId]
      )}
      style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}
    >
      {tokenId === 'dealer' ? 'D' : ''}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/TokenTray.tsx`**

```tsx
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { Token, TokenId } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';
import { TOKEN_SIZE } from '@/lib/tokenDrag';
import { cn } from '@/lib/utils';

function TrayToken({ tokenId }: { tokenId: TokenId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `token-${tokenId}`,
    data: { type: 'token' as const, tokenId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-token=""
      data-testid={`tray-token-${tokenId}`}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[tokenId]}
      style={{ touchAction: 'none', opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
    >
      <TokenDisc tokenId={tokenId} />
    </div>
  );
}

export function TokenTray({ tokens }: { tokens: Token[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'token-tray' });
  return (
    <div className="flex flex-col gap-0.5 zone-hover" data-testid="token-tray">
      <span className="zone-label hidden sm:inline">Tokens</span>
      <div
        ref={setNodeRef}
        className={cn(
          'w-[56px] sm:w-[80px] rounded-lg border flex flex-wrap items-center justify-center gap-1 bg-secondary py-2 px-1',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
        {tokens.map(t =>
          t.pos === null ? (
            <TrayToken key={t.id} tokenId={t.id} />
          ) : (
            <div
              key={t.id}
              data-testid={`token-slot-${t.id}`}
              aria-hidden="true"
              className="rounded-full border-2 border-dashed border-muted-foreground/30"
              style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}
            />
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the ControlsBar toggle**

In `src/components/ControlsBar.tsx`, after the Poker Chips section's closing `</div>` (line ~161) and before the `<Separator />` that precedes the Deal section, add:

```tsx
          <Separator />

          {/* Tokens (1035): independent of chips mode */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => sendAction({ type: 'SET_TOKENS_MODE', enabled: !gameState.tokensEnabled })}
            aria-pressed={gameState.tokensEnabled}
            aria-label={gameState.tokensEnabled ? 'Disable tokens' : 'Enable tokens'}
          >
            Tokens {gameState.tokensEnabled ? 'on' : 'off'}
          </Button>
```

- [ ] **Step 7: Wire TokenTray into BoardView**

In `src/components/BoardView.tsx`, add the import:

```tsx
import { TokenTray } from './TokenTray';
```

In the pile column, after the `{gameState.chipsEnabled && (<PotZone ... />)}` block (line ~139-141), add:

```tsx
            {gameState.tokensEnabled && (
              <TokenTray tokens={gameState.tokens} />
            )}
```

- [ ] **Step 8: Run tests, typecheck**

Run: `npm test -- tokenTray` → PASS (8 tests).
Run: `npm run typecheck` → clean.

- [ ] **Step 9: Commit**

```bash
git add src/lib/tokenDrag.ts src/components/TokenDisc.tsx src/components/TokenTray.tsx src/components/ControlsBar.tsx src/components/BoardView.tsx tests/tokenTray.test.ts
git commit -m "feat(1035): TokenDisc/TokenTray components, ControlsBar toggle, BoardView rail slot"
```

---

### Task 6: CanvasToken + CanvasZone rendering, bounds, and pan exclusion

**Files:**
- Create: `src/components/CanvasToken.tsx`
- Modify: `src/components/CanvasZone.tsx` (props, bounds memo at line ~175-200, pan exclusion at line ~273, render list after `canvasPiles.map` at line ~399)
- Modify: `src/components/BoardView.tsx` (pass `canvasTokens` to `CanvasZone`)
- Test: `tests/canvasToken.test.ts`

**Interfaces:**
- Consumes: `Token` type; `TokenDisc`, `TOKEN_LABELS` (Task 5); `TOKEN_SIZE`; draggable id/data shape `` `token-${id}` `` / `{ type: 'token', tokenId }` (must match Task 5 exactly — a token renders in the tray OR on canvas, never both, so the shared id never collides).
- Produces: `CanvasToken({ token })` absolutely positioned at `token.pos`; `CanvasZone` prop `canvasTokens: Token[]` (pre-filtered: enabled + placed). Task 8's e2e relies on testid `canvas-token-<id>`.

- [ ] **Step 1: Write the failing test**

Create `tests/canvasToken.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import CanvasTokenSrc from "../src/components/CanvasToken.tsx?raw";
import CanvasZoneSrc from "../src/components/CanvasZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("CanvasToken", () => {
  it("is a draggable carrying type token data with the shared token id", () => {
    expect(CanvasTokenSrc).toMatch(/useDraggable/);
    expect(CanvasTokenSrc).toMatch(/type:\s*'token'/);
    expect(CanvasTokenSrc).toMatch(/`token-\$\{token\.id\}`/);
  });

  it("positions absolutely at pos and hides while dragging", () => {
    expect(CanvasTokenSrc).toMatch(/position:\s*'absolute'/);
    expect(CanvasTokenSrc).toMatch(/left:\s*token\.pos\.x/);
    expect(CanvasTokenSrc).toMatch(/zIndex:\s*token\.pos\.z/);
    expect(CanvasTokenSrc).toMatch(/isDragging\s*\?\s*0\s*:\s*1/);
  });

  it("carries data-token and a canvas-token testid", () => {
    expect(CanvasTokenSrc).toMatch(/data-token=""/);
    expect(CanvasTokenSrc).toMatch(/canvas-token-/);
  });
});

describe("CanvasZone token integration", () => {
  it("renders CanvasToken for each canvasTokens entry", () => {
    expect(CanvasZoneSrc).toMatch(/canvasTokens\.map/);
    expect(CanvasZoneSrc).toMatch(/<CanvasToken/);
  });

  it("includes token extents in the inner canvas bounds", () => {
    expect(CanvasZoneSrc).toMatch(/TOKEN_SIZE/);
  });

  it("excludes tokens from drag-to-pan", () => {
    expect(CanvasZoneSrc).toMatch(/\[data-token\]/);
  });
});

describe("BoardView passes canvasTokens", () => {
  it("filters to enabled + placed tokens", () => {
    expect(BoardViewSrc).toMatch(/tokensEnabled\s*\?\s*gameState\.tokens\.filter\(t => t\.pos !== null\)\s*:\s*\[\]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- canvasToken`
Expected: FAIL — cannot resolve `../src/components/CanvasToken.tsx?raw`.

- [ ] **Step 3: Create `src/components/CanvasToken.tsx`**

```tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Token } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';

// Absolutely-positioned token on the felt. Purely positional: no selection,
// no drop-target semantics, no click behavior (design 1035).
export function CanvasToken({ token }: { token: Token }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `token-${token.id}`,
    data: { type: 'token' as const, tokenId: token.id },
  });

  if (!token.pos) return null;

  return (
    <div
      ref={setNodeRef}
      data-token=""
      data-testid={`canvas-token-${token.id}`}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[token.id]}
      style={{
        position: 'absolute',
        left: token.pos.x,
        top: token.pos.y,
        zIndex: token.pos.z,
        opacity: isDragging ? 0 : 1,
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <TokenDisc tokenId={token.id} />
    </div>
  );
}
```

Note: `useDraggable` must be called before the `if (!token.pos) return null` guard (hooks cannot be conditional).

- [ ] **Step 4: Integrate into CanvasZone**

In `src/components/CanvasZone.tsx`:

Add imports:

```tsx
import type { Token } from '@/shared/types';   // extend the existing type-import line
import { CanvasToken } from './CanvasToken';
import { TOKEN_SIZE } from '@/lib/tokenDrag';
```

Add to `CanvasZoneProps` and the destructured parameters:

```tsx
  canvasTokens: Token[];
```

In the bounds `useMemo` (line ~175), add token extents to `xs`/`ys` and dependencies:

```tsx
    const xs = [
      ...canvasCards.map(c => c.x + cardW),
      ...canvasPiles.map(p => (p.pos?.x ?? 0) + PILE_FRAME_W),
      ...canvasTokens.map(t => (t.pos?.x ?? 0) + TOKEN_SIZE),
    ];
    const ys = [
      ...canvasCards.map(c => c.y + cardH),
      ...canvasPiles.map(p => (p.pos?.y ?? 0) + PILE_FRAME_H),
      ...canvasTokens.map(t => (t.pos?.y ?? 0) + TOKEN_SIZE),
    ];
```

and change the dependency array to `[canvasCards, canvasPiles, canvasTokens, viewportSize.w, viewportSize.h]`.

In `onViewportPointerDown` (line ~273), extend the exclusion selector:

```tsx
    if ((e.target as HTMLElement).closest('[data-card-id], [data-canvas-pile], [data-token], button')) return;
```

After the `{canvasPiles.map(...)}` block (line ~399), add:

```tsx
        {canvasTokens.map(t => (
          <CanvasToken key={t.id} token={t} />
        ))}
```

- [ ] **Step 5: Pass canvasTokens from BoardView**

In `src/components/BoardView.tsx`, next to the existing `canvasPiles` derivation (line ~56), add:

```tsx
  const canvasTokens = gameState.tokensEnabled ? gameState.tokens.filter(t => t.pos !== null) : [];
```

and add `canvasTokens={canvasTokens}` to the `<CanvasZone ... />` props.

- [ ] **Step 6: Run tests, typecheck**

Run: `npm test -- canvasToken` → PASS (7 tests).
Run: `npm run typecheck` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/CanvasToken.tsx src/components/CanvasZone.tsx src/components/BoardView.tsx tests/canvasToken.test.ts
git commit -m "feat(1035): CanvasToken rendering, canvas bounds and pan exclusion"
```

---

### Task 7: Token drop resolution + BoardDragLayer drag branch + overlay ghost

**Files:**
- Modify: `src/lib/tokenDrag.ts` (add `resolveTokenDrop`)
- Modify: `src/components/BoardDragLayer.tsx` (collision detection at line ~22, drag state, `handleDragStart` at line ~296, `handleDragEnd` at line ~374, `handleDragCancel` at line ~682, `DragOverlay` at line ~719)
- Test: `tests/tokenDrag.test.ts`

**Interfaces:**
- Consumes: `MOVE_TOKEN`/`RETURN_TOKEN` actions (Task 3 semantics); draggable data `{ type: 'token', tokenId }` (Tasks 5–6); `'token-tray'` droppable id (Task 5); `gameState.tokens`.
- Produces: `resolveTokenDrop(args): TokenDropResolution` in `src/lib/tokenDrag.ts` (exact signature below); token drags fully routed end-to-end.

- [ ] **Step 1: Write the failing test**

Create `tests/tokenDrag.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveTokenDrop, TOKEN_SIZE } from "../src/lib/tokenDrag";

const geometry = { canvasW: 800, canvasH: 600, tokenSize: TOKEN_SIZE };

describe("resolveTokenDrop", () => {
  it("returns none when dropped over nothing", () => {
    expect(resolveTokenDrop({ overId: null, fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("returns a placed token to the tray when dropped on it", () => {
    expect(resolveTokenDrop({ overId: "token-tray", fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "return" });
  });

  it("tray-to-tray drop is a no-op", () => {
    expect(resolveTokenDrop({ overId: "token-tray", fromTray: true, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("places on canvas with coordinates clamped to bounds", () => {
    expect(resolveTokenDrop({ overId: "canvas", fromTray: true, base: { x: -20, y: 9999 }, ...geometry }))
      .toEqual({ kind: "place", x: 0, y: 600 - TOKEN_SIZE });
    expect(resolveTokenDrop({ overId: "canvas", fromTray: false, base: { x: 100, y: 200 }, ...geometry }))
      .toEqual({ kind: "place", x: 100, y: 200 });
  });

  it("any other drop target snaps back", () => {
    expect(resolveTokenDrop({ overId: "pile-draw", fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokenDrag`
Expected: FAIL — `resolveTokenDrop` is not exported.

- [ ] **Step 3: Implement `resolveTokenDrop`**

Append to `src/lib/tokenDrag.ts`:

```ts
export type TokenDropResolution =
  | { kind: 'place'; x: number; y: number }
  | { kind: 'return' }
  | { kind: 'none' };

// Routes a token drop. Mirrors resolvePileDrop's clamp math (canvasPileDrag.ts).
// `base` is the unclamped candidate top-left in inner-canvas coordinates —
// the caller derives it from stored pos + delta (canvas source) or from the
// pointer position (tray source).
export function resolveTokenDrop(args: {
  overId: string | null;
  fromTray: boolean;
  base: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  tokenSize: number;
}): TokenDropResolution {
  const { overId, fromTray, base, canvasW, canvasH, tokenSize } = args;
  if (overId === null) return { kind: 'none' };
  if (overId === 'token-tray') return fromTray ? { kind: 'none' } : { kind: 'return' };
  if (overId === 'canvas') {
    return {
      kind: 'place',
      x: Math.max(0, Math.min(base.x, Math.max(0, canvasW - tokenSize))),
      y: Math.max(0, Math.min(base.y, Math.max(0, canvasH - tokenSize))),
    };
  }
  return { kind: 'none' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tokenDrag`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the token branch into BoardDragLayer**

In `src/components/BoardDragLayer.tsx`:

**Imports** — add:

```tsx
import type { Card, ClientAction, ClientGameState, LastMoveHighlight, SelectionSource, TokenId } from '@/shared/types';   // add TokenId
import { TokenDisc } from './TokenDisc';
import { resolveTokenDrop, TOKEN_SIZE } from '@/lib/tokenDrag';
```

**Collision detection** — at the top of `customCollision` (line ~22, before the zone-container filtering), add a token early-branch. Tokens may only land on the tray or the canvas — never in hands or piles:

```tsx
const customCollision: CollisionDetection = (args) => {
  const tokenData = args.active.data.current as { type?: string } | undefined;
  if (tokenData?.type === 'token') {
    const trayContainers = args.droppableContainers.filter(c => String(c.id) === 'token-tray');
    const trayCollisions = pointerWithin({ ...args, droppableContainers: trayContainers });
    if (trayCollisions.length > 0) return trayCollisions;
    const tokenCanvasContainers = args.droppableContainers.filter(c => String(c.id) === 'canvas');
    return pointerWithin({ ...args, droppableContainers: tokenCanvasContainers });
  }
  // ... existing zone/pile/canvas logic unchanged
```

**Drag state** — next to the `activePileId` state (line ~88-89), add:

```tsx
  const [activeTokenId, setActiveTokenId] = useState<TokenId | null>(null);
  const activeTokenIdRef = useRef<TokenId | null>(null);
```

**`handleDragStart`** — before the `canvas-pile` branch (line ~302), add:

```tsx
    const maybeToken = event.active.data.current as { type?: string; tokenId?: TokenId } | undefined;
    if (maybeToken?.type === 'token' && maybeToken.tokenId) {
      activeTokenIdRef.current = maybeToken.tokenId;
      setActiveTokenId(maybeToken.tokenId);
      setActiveCard(null);
      setDragging(true);
      return;
    }
```

**`handleDragEnd`** — at the top, right after `activeDragOriginRef.current = null;` (line ~376) and before the whole-pile branch, add:

```tsx
    // TOKEN DRAG BRANCH (1035): place on canvas, move on canvas, or return to tray.
    if (activeTokenIdRef.current !== null) {
      const tokenId = activeTokenIdRef.current;
      activeTokenIdRef.current = null;
      setActiveTokenId(null);
      setDragging(false);
      dropSuccessRef.current = true; // token ghost clears immediately; skip snap-back animation
      const token = gameState.tokens.find(t => t.id === tokenId);
      if (!token) return;
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      let base: { x: number; y: number };
      if (token.pos) {
        // canvas → canvas: stored position + delta (MOVE_CANVAS_PILE pattern)
        base = { x: token.pos.x + event.delta.x, y: token.pos.y + event.delta.y };
      } else {
        // tray → canvas: pointer position relative to the inner canvas (PLACE_ON_CANVAS pattern)
        const activator = event.activatorEvent as PointerEvent;
        base = {
          x: activator.clientX + event.delta.x - (canvasBounds?.left ?? 0) - TOKEN_SIZE / 2,
          y: activator.clientY + event.delta.y - (canvasBounds?.top ?? 0) - TOKEN_SIZE / 2,
        };
      }
      const resolution = resolveTokenDrop({
        overId: event.over ? String(event.over.id) : null,
        fromTray: token.pos === null,
        base,
        canvasW: canvasBounds?.width ?? 0,
        canvasH: canvasBounds?.height ?? 0,
        tokenSize: TOKEN_SIZE,
      });
      if (resolution.kind === 'place') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, x: resolution.x, y: resolution.y });
      } else if (resolution.kind === 'return') {
        sendAction({ type: 'RETURN_TOKEN', tokenId });
      }
      return;
    }
```

**`handleDragCancel`** — add alongside the pile resets (line ~683):

```tsx
    activeTokenIdRef.current = null;
    setActiveTokenId(null);
```

**`DragOverlay`** — extend the ternary (line ~722) so a dragged token shows a disc ghost:

```tsx
            {activeTokenId ? (
              <div style={{ opacity: 0.7 }}>
                <TokenDisc tokenId={activeTokenId} />
              </div>
            ) : activePile ? (
              <div style={{ opacity: 0.7 }}>
                <CanvasPileVisual pile={activePile} />
              </div>
            ) : activeCard ? (
              ...
```

- [ ] **Step 6: Run full unit suite and typecheck**

Run: `npm test` → all green (token suites + existing suites).
Run: `npm run typecheck` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tokenDrag.ts src/components/BoardDragLayer.tsx tests/tokenDrag.test.ts
git commit -m "feat(1035): token drag routing — collision branch, drop resolution, overlay ghost"
```

---

### Task 8: E2e coverage + ship prep (backlog/roadmap)

**Files:**
- Create: `playwright/tokens.spec.ts`
- Modify: `docs/superpowers/specs/BACKLOG.md` (remove row 1035)
- Modify: `.planning/ROADMAP.md` (add milestone entry)

**Interfaces:**
- Consumes: testids `token-tray`, `tray-token-dealer`, `canvas-token-dealer`, `token-slot-dealer` (Tasks 5–6); ControlsBar buttons `Open controls` / `Enable tokens`; `twoPlayerRoom` fixture (`playwright/fixtures.ts`).
- Produces: shipped-state docs; end-to-end proof of the tray → felt → tray loop across two clients.

- [ ] **Step 1: Write the e2e spec**

Create `playwright/tokens.spec.ts`. dnd-kit ignores `dragAndDrop()` (HTML5 events); use `mouse.move/down/move/up` with `steps: 15` per repo convention. The pointer sensor needs 8px of travel before activating, which the stepped move provides.

```ts
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function enableTokens(page: Page) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /enable tokens/i }).click();
  await page.keyboard.press('Escape');
}

async function dragByMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('dealer button & tokens (1035)', () => {
  test('tray toggles on for both players; dealer token round-trips tray → felt → tray', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Default off: no tray anywhere
    await expect(p1.getByTestId('token-tray')).toHaveCount(0);

    await enableTokens(p1);
    await expect(p1.getByTestId('token-tray')).toBeVisible();
    await expect(p2.getByTestId('token-tray')).toBeVisible();

    // tray → felt
    const trayBox = (await p1.getByTestId('tray-token-dealer').boundingBox())!;
    const canvasBox = (await p1.getByTestId('canvas-zone').boundingBox())!;
    await dragByMouse(p1, center(trayBox), center(canvasBox));

    await expect(p1.getByTestId('canvas-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('canvas-token-dealer')).toBeVisible();
    await expect(p1.getByTestId('token-slot-dealer')).toBeVisible();
    await expect(p1.getByTestId('tray-token-dealer')).toHaveCount(0);

    // felt → tray (drop on the empty slot inside the tray droppable)
    const tokenBox = (await p1.getByTestId('canvas-token-dealer').boundingBox())!;
    const slotBox = (await p1.getByTestId('token-slot-dealer').boundingBox())!;
    await dragByMouse(p1, center(tokenBox), center(slotBox));

    await expect(p1.getByTestId('canvas-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('tray-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('tray-token-dealer')).toBeVisible();
  });

  test('disabling tokens hides a placed token; re-enabling restores it in place', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableTokens(p1);
    const trayBox = (await p1.getByTestId('tray-token-red').boundingBox())!;
    const canvasBox = (await p1.getByTestId('canvas-zone').boundingBox())!;
    await dragByMouse(p1, center(trayBox), center(canvasBox));
    await expect(p2.getByTestId('canvas-token-red')).toBeVisible();

    // Toggle off (button now reads "Disable tokens")
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.getByRole('button', { name: /disable tokens/i }).click();
    await p1.keyboard.press('Escape');

    await expect(p1.getByTestId('canvas-token-red')).toHaveCount(0);
    await expect(p2.getByTestId('canvas-token-red')).toHaveCount(0);
    await expect(p1.getByTestId('token-tray')).toHaveCount(0);

    // Re-enable: token reappears where it was (display gate, not a reset)
    await enableTokens(p2);
    await expect(p1.getByTestId('canvas-token-red')).toBeVisible();
    await expect(p2.getByTestId('canvas-token-red')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the e2e spec**

The worktree needs the dev servers running from THIS worktree's code. If the root checkout's servers are up, kill them first (LISTEN-scoped only):

```bash
lsof -ti tcp:5173 -sTCP:LISTEN | xargs -r kill
lsof -ti tcp:1999 -sTCP:LISTEN | xargs -r kill
npx playwright test playwright/tokens.spec.ts
```

(Playwright's `webServer` config auto-starts both servers from the worktree cwd.)
Expected: 2 passed.

- [ ] **Step 3: Update BACKLOG.md**

In `docs/superpowers/specs/BACKLOG.md`, delete the row:

```
| 1035 | Dealer button & movable tokens — draggable marker(s) on the canvas for dealer/turn/trump tracking; players advance it themselves like a physical button (from gap review B2) |
```

- [ ] **Step 4: Update ROADMAP.md**

In `.planning/ROADMAP.md`, add a milestone entry following the existing `vX.Y` format (check the file's current tail for the next version number), e.g.:

```markdown
### vX.Y — Dealer button & movable tokens (1035)
Toggle-able token tray (dealer puck + red/blue/green discs) with drag-to-canvas placement, shared z-space, undo-immune positioning, and toggle-off display gating. Spec: docs/superpowers/specs/2026-07-16-dealer-button-tokens-design.md
```

- [ ] **Step 5: Full verification**

```bash
npm test
npm run typecheck
npx playwright test
```

Expected: all unit suites green, typecheck clean, full e2e suite green (existing specs unaffected — tokens are default-off, so no existing spec sees token UI).

- [ ] **Step 6: Commit**

```bash
git add playwright/tokens.spec.ts docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "feat(1035): e2e token round-trip + toggle gating; ship prep (backlog/roadmap)"
```

After this task: push the branch and open a PR per the repo's Git Workflow (`git push -u origin <branch>`, then `gh pr create`). The pre-push hook runs e2e when both dev servers are up.
