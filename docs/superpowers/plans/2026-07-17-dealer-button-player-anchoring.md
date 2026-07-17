# Dealer Button Player-Anchoring Revision (1035) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace canvas-only token placement (`Token.pos: PilePos | null`) with a three-way placement union (`tray` / `canvas` / `player`) so a token can anchor next to a player's name — the only way to actually indicate "this player is the dealer" on a board where the canvas is shared but player screen positions are per-viewer.

**Architecture:** `Token.placement` becomes a discriminated union. The single `MOVE_TOKEN` action carries a `to` destination union and replaces both the old `MOVE_TOKEN`(bare x/y) and `RETURN_TOKEN` actions. Server validates and sets `placement` directly — no snapshot, same as before. Client-side, an anchored token renders as a small draggable disc in the player's existing name row (`HandZone`/`OpponentHand`), reusing the exact `useDraggable` id/data contract already used by tray and canvas tokens, so `BoardDragLayer`'s existing token-drag-start detection needs no changes — only its destination resolution grows a third branch (anchor).

**Tech Stack:** TypeScript, PartyKit (`party/index.ts`), React + @dnd-kit/core, Vitest (`tests/`), Playwright (`playwright/`).

**Spec:** `docs/superpowers/specs/2026-07-16-dealer-button-tokens-design.md` (see "Revision (2026-07-17)" section and the updated Decisions table)

**Context:** This revises code already on this branch (PR #85, unmerged) from the original canvas-only token implementation. Every file this plan touches already exists; every test file this plan touches already exists and currently asserts the old `Token.pos` shape.

## Global Constraints

- A token is in exactly one place at a time: `{ kind: 'tray' }`, `{ kind: 'canvas'; x; y; z }`, or `{ kind: 'player'; playerId: string }`. No field lets two be true at once.
- `MOVE_TOKEN` is the only mutating token action; `RETURN_TOKEN` is removed (folded into `MOVE_TOKEN` with `to: { kind: 'tray' }`).
- No `takeSnapshot()` in any token handler — token moves/anchors are never undoable. `UNDO_MOVE`'s existing tokens/tokensEnabled carry-forward is untouched by this revision.
- Any player may move any token to/from any destination, including anchoring it to a different player — no ownership check, ever.
- `SET_TOKENS_MODE` no-op-while-disabled precedent applies to `MOVE_TOKEN` regardless of destination kind.
- An anchored token is itself a drag source with the same `id`/`data` contract as tray and canvas tokens (`` `token-${tokenId}` ``, `{ type: 'token', tokenId }`) — re-anchoring is one drag, not a forced trip through the tray.
- `z` only exists inside the `canvas` placement variant; `maxCanvasZ` only reads it there.
- Storage hydration must produce `{ kind: 'tray' }` for every token on any persisted state that predates the `placement` field — both states with no `tokens` array at all, and states whose tokens still have the old `pos` shape (since PR #85 never merged to `main`, a dev room could have loaded either shape).
- TDD: write the failing test first, then implement, then commit. Pre-commit hook runs `npm test` + `npm run typecheck`.
- Work stays on this worktree branch; do not commit to `main`.

---

### Task 1: Placement union types + `resolveTokenDrop` three-way resolution

**Files:**
- Modify: `src/shared/types.ts:31-37` (Token/TokenPlacement), `:131-133` (ClientAction token variants)
- Modify: `src/lib/tokenDrag.ts` (whole file — `resolveTokenDrop` grows an `anchor` destination)
- Test: `tests/tokenDrag.test.ts` (rewrite)

**Interfaces:**
- Consumes: nothing new — `TokenId`/`TOKEN_IDS` already exist in `src/shared/types.ts`.
- Produces: `TokenPlacement` union, `Token.placement`; `ClientAction`'s `MOVE_TOKEN` variant with `to: { kind: 'tray' } | { kind: 'canvas'; x: number; y: number } | { kind: 'player'; playerId: string }` (`RETURN_TOKEN` removed); `resolveTokenDrop(args): TokenDropResolution` where `TokenDropResolution` gains `{ kind: 'anchor'; playerId: string }`. Task 2 (server), Task 3 (tray/canvas components), Task 4 (anchored disc), and Task 5 (drag layer) all consume these exact names.

- [ ] **Step 1: Write the failing test**

Replace `tests/tokenDrag.test.ts` in full:

```ts
import { describe, it, expect } from "vitest";
import { resolveTokenDrop, TOKEN_SIZE } from "../src/lib/tokenDrag";

const geometry = { canvasW: 800, canvasH: 600, tokenSize: TOKEN_SIZE };

describe("resolveTokenDrop", () => {
  it("returns none when dropped over nothing", () => {
    expect(resolveTokenDrop({ overId: null, overToId: null, fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("returns a placed token to the tray when dropped on it", () => {
    expect(resolveTokenDrop({ overId: "token-tray", overToId: null, fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "return" });
  });

  it("tray-to-tray drop is a no-op", () => {
    expect(resolveTokenDrop({ overId: "token-tray", overToId: null, fromTray: true, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("places on canvas with coordinates clamped to bounds", () => {
    expect(resolveTokenDrop({ overId: "canvas", overToId: null, fromTray: true, base: { x: -20, y: 9999 }, ...geometry }))
      .toEqual({ kind: "place", x: 0, y: 600 - TOKEN_SIZE });
    expect(resolveTokenDrop({ overId: "canvas", overToId: null, fromTray: false, base: { x: 100, y: 200 }, ...geometry }))
      .toEqual({ kind: "place", x: 100, y: 200 });
  });

  it("anchors to a player when dropped on their own hand droppable", () => {
    expect(resolveTokenDrop({ overId: "hand", overToId: "player-1", fromTray: true, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "anchor", playerId: "player-1" });
  });

  it("anchors to a player when dropped on their opponent-hand droppable", () => {
    expect(resolveTokenDrop({ overId: "opponent-hand-player-2", overToId: "player-2", fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "anchor", playerId: "player-2" });
  });

  it("does not anchor if the hand droppable's toId is missing (defensive)", () => {
    expect(resolveTokenDrop({ overId: "hand", overToId: null, fromTray: true, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("any other drop target snaps back", () => {
    expect(resolveTokenDrop({ overId: "pile-draw", overToId: null, fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokenDrag`
Expected: FAIL — `resolveTokenDrop` doesn't accept `overToId` yet and never returns `{ kind: 'anchor' }`.

- [ ] **Step 3: Update the shared types**

In `src/shared/types.ts`, replace lines 31-37:

```ts
export type TokenId = "dealer" | "red" | "blue" | "green";
export const TOKEN_IDS: readonly TokenId[] = ["dealer", "red", "blue", "green"];

export type TokenPlacement =
  | { kind: "tray" }
  | { kind: "canvas"; x: number; y: number; z: number }
  | { kind: "player"; playerId: string };

export interface Token {
  id: TokenId;
  placement: TokenPlacement;
}
```

Replace the `SET_TOKENS_MODE`/`MOVE_TOKEN`/`RETURN_TOKEN` lines (currently lines 131-133) with:

```ts
  | { type: "SET_TOKENS_MODE"; enabled: boolean }
  | { type: "MOVE_TOKEN"; tokenId: TokenId; to: { kind: "tray" } | { kind: "canvas"; x: number; y: number } | { kind: "player"; playerId: string } };
```

- [ ] **Step 4: Update `resolveTokenDrop`**

Replace `src/lib/tokenDrag.ts` in full:

```ts
// Token disc diameter in px — sized so two tokens fit per row in the 80px
// desktop rail (and one per row in the 56px mobile rail) with the tray's
// padding and gaps.
export const TOKEN_SIZE = 32;

export type TokenDropResolution =
  | { kind: 'place'; x: number; y: number }
  | { kind: 'anchor'; playerId: string }
  | { kind: 'return' }
  | { kind: 'none' };

// Routes a token drop. Mirrors resolvePileDrop's clamp math (canvasPileDrag.ts).
// `base` is the unclamped candidate top-left in inner-canvas coordinates —
// the caller derives it from stored placement + delta (canvas source) or from
// the pointer position (tray/player source).
// `overToId` is the target droppable's `data.current.toId` (only meaningful
// for 'hand'/'opponent-hand-*' targets) — read from droppable data rather
// than parsed out of the id string, since player tokens (nanoid) can contain
// dashes and would make suffix-parsing unreliable.
export function resolveTokenDrop(args: {
  overId: string | null;
  overToId: string | null;
  fromTray: boolean;
  base: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  tokenSize: number;
}): TokenDropResolution {
  const { overId, overToId, fromTray, base, canvasW, canvasH, tokenSize } = args;
  if (overId === null) return { kind: 'none' };
  if (overId === 'token-tray') return fromTray ? { kind: 'none' } : { kind: 'return' };
  if (overId === 'hand' || overId.startsWith('opponent-hand-')) {
    return overToId ? { kind: 'anchor', playerId: overToId } : { kind: 'none' };
  }
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

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tokenDrag`
Expected: PASS (8 tests).
Run: `npm run typecheck` — expect FAILURES across `party/index.ts` and every component that still reads `token.pos` or dispatches the old action shapes. This is expected; Tasks 2-5 fix each in turn. Confirm the failures are all `token.pos`/`RETURN_TOKEN`/bare-`x`/`y`-on-`MOVE_TOKEN` related, not something unrelated.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/lib/tokenDrag.ts tests/tokenDrag.test.ts
git commit -m "feat(1035): Token.placement union + resolveTokenDrop anchor destination"
```

---

### Task 2: Server — unified `MOVE_TOKEN` handler, `maxCanvasZ`, `RESET_TABLE`, hydration migration

**Files:**
- Modify: `party/index.ts:60-62` (`defaultTokens`), `:94-98` (`maxCanvasZ`), `:227-233` (onStart migration), `:726-737` (`RESET_TABLE`), `:1056-1093` (`MOVE_TOKEN`/`RETURN_TOKEN` cases → single `MOVE_TOKEN` case)
- Modify: `tests/tokensState.test.ts` (2 assertions), `tests/tokensMode.test.ts` (1 test's fixture), `tests/moveToken.test.ts` (rewrite), `tests/tokensResetUndo.test.ts` (2 assertions)

**Interfaces:**
- Consumes: `TokenPlacement`/`Token` (Task 1).
- Produces: `defaultTokens(): Token[]` returning all-tray tokens; `maxCanvasZ(state): number` reading canvas-placement z; server behavior for `MOVE_TOKEN` with all three `to.kind` branches plus `TOKEN_NOT_FOUND`/`INVALID_COORDINATES`/`PLAYER_NOT_FOUND` error codes; `RESET_TABLE` trays every token; onStart migrates both missing-tokens and old-shape-tokens legacy state. Tasks 3-6 depend on this handler's exact dispatch contract.

- [ ] **Step 1: Write the failing tests**

In `tests/tokensState.test.ts`, replace the body of the first two `it` blocks:

```ts
  it("defaultGameState starts with tokensEnabled false and all four tokens in the tray", () => {
    const state = defaultGameState("room-1");
    expect(state.tokensEnabled).toBe(false);
    expect(state.tokens).toEqual([
      { id: "dealer", placement: { kind: "tray" } },
      { id: "red", placement: { kind: "tray" } },
      { id: "blue", placement: { kind: "tray" } },
      { id: "green", placement: { kind: "tray" } },
    ]);
  });

  it("viewFor passes tokens and tokensEnabled through unmasked", () => {
    const state = defaultGameState("room-1");
    state.tokensEnabled = true;
    state.tokens[0].placement = { kind: "canvas", x: 10, y: 20, z: 3 };
    const view = viewFor(state, "player-1");
    expect(view.tokensEnabled).toBe(true);
    expect(view.tokens[0]).toEqual({ id: "dealer", placement: { kind: "canvas", x: 10, y: 20, z: 3 } });
  });
```

Add a new test to the same `describe` block, after the existing "onStart defaults tokens fields for pre-token persisted state" test:

```ts
  it("onStart resets all tokens to tray when persisted tokens still use the old pos shape", async () => {
    const legacy = defaultGameState("room-1");
    // Simulate a dev room that persisted state under the pre-revision Token.pos shape.
    (legacy.tokens as unknown as { id: string; pos: null }[]) = [
      { id: "dealer", pos: null },
      { id: "red", pos: { x: 5, y: 5, z: 1 } },
      { id: "blue", pos: null },
      { id: "green", pos: null },
    ];
    const room = makeMockRoom();
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "gameState" ? legacy : undefined)
    );
    const gameRoom = new GameRoom(room);
    await gameRoom.onStart();
    expect(gameRoom.gameState.tokens).toEqual(defaultTokens());
  });
```

In `tests/tokensMode.test.ts`, replace the last test's body:

```ts
  it("toggling off preserves token positions; re-enable restores them", async () => {
    room.gameState.tokensEnabled = true;
    room.gameState.tokens[0].placement = { kind: "canvas", x: 100, y: 50, z: 5 };
    await send({ type: "SET_TOKENS_MODE", enabled: false });
    expect(room.gameState.tokens[0].placement).toEqual({ kind: "canvas", x: 100, y: 50, z: 5 });
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.tokens[0].placement).toEqual({ kind: "canvas", x: 100, y: 50, z: 5 });
  });
```

Replace `tests/moveToken.test.ts` in full:

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

describe("MOVE_TOKEN", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
    room.gameState.players.push(
      { id: "player-1", connected: true, displayName: "P1", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 },
      { id: "player-2", connected: true, displayName: "P2", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 },
    );
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("places a token on canvas above all canvas cards and piles, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 200, y: 150 } });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.placement).toEqual({ kind: "canvas", x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("anchors a token to a player, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-2" } });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.placement).toEqual({ kind: "player", playerId: "player-2" });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("any player may anchor a token to a different player (no ownership check)", async () => {
    // sender is player-1, anchoring the token to player-2 — must succeed.
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "player", playerId: "player-2" } });
    expect(errorCodes(sender)).toEqual([]);
    expect(room.gameState.tokens.find(t => t.id === "red")!.placement).toEqual({ kind: "player", playerId: "player-2" });
  });

  it("returns a token to the tray, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "canvas", x: 50, y: 60 } });
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "tray" } });
    expect(room.gameState.tokens.find(t => t.id === "red")!.placement).toEqual({ kind: "tray" });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("re-anchors a token directly from one player to another", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-1" } });
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-2" } });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.placement).toEqual({ kind: "player", playerId: "player-2" });
  });

  it("silently no-ops while tokens are disabled", async () => {
    room.gameState.tokensEnabled = false;
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 200, y: 150 } });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.placement).toEqual({ kind: "tray" });
    expect(errorCodes(sender)).toEqual([]);
  });

  it("errors TOKEN_NOT_FOUND for an unknown tokenId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "purple", to: { kind: "tray" } });
    expect(errorCodes(sender)).toEqual(["TOKEN_NOT_FOUND"]);
  });

  it("rejects non-finite canvas coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: Infinity, y: 0 } });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("errors PLAYER_NOT_FOUND for an unknown playerId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "nope" } });
    expect(errorCodes(sender)).toEqual(["PLAYER_NOT_FOUND"]);
  });

  it("token z participates in the shared canvas z-space (PLACE_ON_CANVAS lands above a token)", async () => {
    room.gameState.tokens.find(t => t.id === "blue")!.placement = { kind: "canvas", x: 5, y: 5, z: 40 };
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });

  it("a player-anchored token does not contribute to the canvas z-space", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "green", to: { kind: "player", playerId: "player-1" } });
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    // z=9 came from the seeded canvas card in beforeEach; the anchored token must not raise it further.
    expect(placed.z).toBe(10);
  });
});
```

In `tests/tokensResetUndo.test.ts`, replace lines 20-25 and 39-44:

```ts
  it("RESET_TABLE returns all tokens to the tray", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 10, y: 20 } });
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "player", playerId: "player-1" } });
    await send({ type: "RESET_TABLE" });
    expect(room.gameState.tokens.every(t => t.placement.kind === "tray")).toBe(true);
  });

  it("UNDO_MOVE restores cards but never teleports tokens or flips the toggle", async () => {
    // Seed an undoable card move (MOVE_CANVAS_PILE takes a snapshot)
    room.gameState.piles.push({
      id: "canvas-pile-abc", name: "Stack", cards: [makeCard("A-s", true)],
      faceUp: true, region: "canvas", ownerId: null, pos: { x: 10, y: 10, z: 2 },
    });
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: 200, y: 150 });
    // Token moves AFTER the snapshot
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 99, y: 88 } });

    await send({ type: "UNDO_MOVE" });

    const pile = room.gameState.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 10, y: 10, z: 2 });          // card move undone
    const dealer = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(dealer.placement).toMatchObject({ x: 99, y: 88 });   // token untouched
    expect(room.gameState.tokensEnabled).toBe(true);             // toggle untouched
  });
```

(The third test in that file, `UNDO_MOVE migrates legacy snapshots that predate tokens`, needs no change — it only checks `Array.isArray`/`toHaveLength`/`tokensEnabled`, none of which reference `.pos`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tokensState tokensMode moveToken tokensResetUndo`
Expected: FAIL — `defaultTokens()` still returns `pos: null` shape; `MOVE_TOKEN`/`RETURN_TOKEN` handlers still use the old two-action bare-x/y contract; no `PLAYER_NOT_FOUND` code exists yet; `maxCanvasZ` still reads `.pos`.

- [ ] **Step 3: Update `defaultTokens`**

In `party/index.ts`, replace lines 60-62:

```ts
export function defaultTokens(): Token[] {
  return TOKEN_IDS.map(id => ({ id, placement: { kind: "tray" as const } }));
}
```

- [ ] **Step 4: Update `maxCanvasZ`**

Replace lines 94-98:

```ts
export function maxCanvasZ(state: GameState): number {
  const cardMax = state.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
  const pileMax = state.piles.reduce((m, p) => Math.max(m, p.pos?.z ?? 0), cardMax);
  return state.tokens.reduce((m, t) => Math.max(m, t.placement.kind === "canvas" ? t.placement.z : 0), pileMax);
}
```

- [ ] **Step 5: Extend the onStart migration**

In `party/index.ts`, after the existing tokens/tokensEnabled hydration guard (currently lines 227-233), add:

```ts
    // Migrate state: 1035 revision replaces Token.pos with Token.placement — reset to
    // tray if any persisted token still has the old shape (covers the dev-only window
    // where PR #85 shipped the pos-shaped version before this revision landed).
    if (this.gameState.tokens.some(t => !("placement" in t))) {
      this.gameState.tokens = defaultTokens();
    }
```

- [ ] **Step 6: Update `RESET_TABLE`**

In `party/index.ts`, replace line 735 (`for (const token of this.gameState.tokens) token.pos = null;`):

```ts
        for (const token of this.gameState.tokens) token.placement = { kind: "tray" };
```

- [ ] **Step 7: Replace the `MOVE_TOKEN`/`RETURN_TOKEN` cases with a single `MOVE_TOKEN` case**

In `party/index.ts`, replace the entire block from the `case "MOVE_TOKEN":` line through the closing `}` of `case "RETURN_TOKEN":` (currently lines 1056-1093):

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
        const to = action.to;
        // Intentionally no takeSnapshot() in any branch — token moves are not undoable (design 1035)
        if (to.kind === "tray") {
          moveTokenTarget.placement = { kind: "tray" };
        } else if (to.kind === "canvas") {
          if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "INVALID_COORDINATES",
              message: "x and y must be finite numbers",
            } satisfies ServerEvent));
            break;
          }
          moveTokenTarget.placement = { kind: "canvas", x: to.x, y: to.y, z: maxCanvasZ(this.gameState) + 1 };
        } else {
          // to.kind === "player" — any player may anchor a token to any other player (design 1035);
          // deliberately no check that senderToken === to.playerId.
          const targetPlayer = this.gameState.players.find(p => p.id === to.playerId);
          if (!targetPlayer) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "PLAYER_NOT_FOUND",
              message: `No player found with id: ${to.playerId}`,
            } satisfies ServerEvent));
            break;
          }
          moveTokenTarget.placement = { kind: "player", playerId: to.playerId };
        }
        break;
      }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- tokensState tokensMode moveToken tokensResetUndo`
Expected: PASS (3 + 4 + 11 + 3 tests). Also run `npm test -- moveCanvasPile` — the existing z-space tests must still pass with the updated `maxCanvasZ`.
Run: `npm run typecheck` — server-side errors should now be gone; remaining failures should all be in client component files (fixed in Tasks 3-5).

- [ ] **Step 9: Commit**

```bash
git add party/index.ts tests/tokensState.test.ts tests/tokensMode.test.ts tests/moveToken.test.ts tests/tokensResetUndo.test.ts
git commit -m "feat(1035): unify MOVE_TOKEN into a 3-way destination, migrate legacy token shape"
```

---

### Task 3: `TokenDisc` size prop, `TokenTray`/`CanvasToken` placement-shape adaptation

**Files:**
- Modify: `src/components/TokenDisc.tsx` (add `size` prop)
- Modify: `src/components/TokenTray.tsx:41` (`t.pos === null` → placement check)
- Modify: `src/components/CanvasToken.tsx:14,27-29` (placement-kind guard + field reads)
- Modify: `src/components/CanvasZone.tsx:187,192` (bounds math)
- Modify: `src/components/BoardView.tsx:58` (`canvasTokens` filter)
- Modify: `tests/tokenTray.test.ts` (1 assertion), `tests/canvasToken.test.ts` (3 assertions)

**Interfaces:**
- Consumes: `Token`/`TokenPlacement` (Task 1).
- Produces: `TokenDisc({ tokenId, size? })` where `size: 'sm' | 'md'` (default `'md'`) — Task 4's `AnchoredTokenDisc` consumes this. `TokenTray`/`CanvasToken`/`CanvasZone`/`BoardView` all read `placement.kind` instead of `pos`.

- [ ] **Step 1: Write the failing tests**

In `tests/tokenTray.test.ts`, replace line 30:

```ts
    expect(TokenTraySrc).toMatch(/placement\.kind === 'tray'/);
```

In `tests/canvasToken.test.ts`, replace lines 13-18 and 42-44:

```ts
  it("positions absolutely at the canvas placement and hides while dragging", () => {
    expect(CanvasTokenSrc).toMatch(/position:\s*'absolute'/);
    expect(CanvasTokenSrc).toMatch(/left:\s*token\.placement\.x/);
    expect(CanvasTokenSrc).toMatch(/zIndex:\s*token\.placement\.z/);
    expect(CanvasTokenSrc).toMatch(/isDragging\s*\?\s*0\s*:\s*1/);
  });
```

```ts
describe("BoardView passes canvasTokens", () => {
  it("filters to canvas-placement tokens only", () => {
    expect(BoardViewSrc).toMatch(/tokensEnabled\s*\?\s*gameState\.tokens\.filter\(t => t\.placement\.kind === 'canvas'\)\s*:\s*\[\]/);
  });
});
```

Add a new test to `tests/canvasToken.test.ts`'s `CanvasToken` describe block:

```ts
  it("renders nothing for a non-canvas placement", () => {
    expect(CanvasTokenSrc).toMatch(/placement\.kind !== 'canvas'/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tokenTray canvasToken`
Expected: FAIL — components still read `token.pos`/`t.pos`.

- [ ] **Step 3: Add the `size` prop to `TokenDisc`**

Replace `src/components/TokenDisc.tsx` in full:

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

// Anchored-in-a-name-row size (18px) fits the existing compact strip
// (presence dot + name + chip badge); tray/canvas/drag-overlay use TOKEN_SIZE (32px).
const SIZE_PX: Record<'sm' | 'md', number> = { sm: 18, md: TOKEN_SIZE };

// Presentational disc shared by the tray, the canvas, name-row anchors, and the drag ghost.
export function TokenDisc({ tokenId, size = 'md' }: { tokenId: TokenId; size?: 'sm' | 'md' }) {
  const px = SIZE_PX[size];
  return (
    <div
      className={cn(
        'rounded-full border-2 shadow-md flex items-center justify-center select-none font-bold',
        size === 'sm' ? 'text-[9px]' : 'text-sm',
        TOKEN_STYLES[tokenId]
      )}
      style={{ width: px, height: px }}
    >
      {tokenId === 'dealer' ? 'D' : ''}
    </div>
  );
}
```

- [ ] **Step 4: Update `TokenTray`**

In `src/components/TokenTray.tsx`, replace line 41:

```tsx
          t.placement.kind === 'tray' ? (
```

- [ ] **Step 5: Update `CanvasToken`**

Replace `src/components/CanvasToken.tsx` in full:

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

  if (token.placement.kind !== 'canvas') return null;

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
        left: token.placement.x,
        top: token.placement.y,
        zIndex: token.placement.z,
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

Note: `useDraggable` is called unconditionally before the `placement.kind !== 'canvas'` guard (hooks cannot be conditional) — same pattern as the original implementation. TS narrows `token.placement` to the `canvas` variant for every read after the guard, so `token.placement.x`/`.y`/`.z` are all valid without further destructuring.

- [ ] **Step 6: Update `CanvasZone`'s bounds math**

In `src/components/CanvasZone.tsx`, replace lines 187 and 192:

```tsx
      ...canvasTokens.map(t => (t.placement.kind === 'canvas' ? t.placement.x : 0) + TOKEN_SIZE),
```

```tsx
      ...canvasTokens.map(t => (t.placement.kind === 'canvas' ? t.placement.y : 0) + TOKEN_SIZE),
```

- [ ] **Step 7: Update `BoardView`'s `canvasTokens` filter**

In `src/components/BoardView.tsx`, replace line 58:

```tsx
  const canvasTokens = gameState.tokensEnabled ? gameState.tokens.filter(t => t.placement.kind === 'canvas') : [];
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- tokenTray canvasToken`
Expected: PASS (9 + 8 tests).
Run: `npm run typecheck` — remaining failures should now be limited to `BoardDragLayer.tsx` (Task 5) and the not-yet-created anchored-disc integration (Task 4).

- [ ] **Step 9: Commit**

```bash
git add src/components/TokenDisc.tsx src/components/TokenTray.tsx src/components/CanvasToken.tsx src/components/CanvasZone.tsx src/components/BoardView.tsx tests/tokenTray.test.ts tests/canvasToken.test.ts
git commit -m "feat(1035): TokenDisc size prop; tray/canvas components read placement.kind"
```

---

### Task 4: `AnchoredTokenDisc` + `HandZone`/`OpponentHand` name-row rendering

**Files:**
- Create: `src/components/AnchoredTokenDisc.tsx`
- Modify: `src/components/HandZone.tsx:6` (type import), `:140-163` (props), `:263-272` (name row render)
- Modify: `src/components/OpponentHand.tsx:6` (type import), `:10-24` (props), `:47-57` (name row render)
- Modify: `src/components/BoardView.tsx` (`anchoredTokenIds` helper + prop threading)
- Test: `tests/anchoredToken.test.ts`

**Interfaces:**
- Consumes: `TokenDisc`/`TOKEN_LABELS` (Task 3); `TokenId` (Task 1).
- Produces: `AnchoredTokenDisc({ tokenId })` — draggable, `id`/`data` matching tray/canvas tokens exactly; `HandZoneProps.anchoredTokenIds: TokenId[]` and `OpponentHandProps.anchoredTokenIds: TokenId[]`; `BoardView`'s `anchoredTokenIds(playerId): TokenId[]` helper. Task 6 (e2e) relies on the `anchored-token-<id>` testid this produces.

- [ ] **Step 1: Write the failing test**

Create `tests/anchoredToken.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import AnchoredTokenDiscSrc from "../src/components/AnchoredTokenDisc.tsx?raw";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("AnchoredTokenDisc", () => {
  it("is a draggable carrying the same id/data contract as tray and canvas tokens", () => {
    expect(AnchoredTokenDiscSrc).toMatch(/useDraggable/);
    expect(AnchoredTokenDiscSrc).toMatch(/type:\s*'token'/);
    expect(AnchoredTokenDiscSrc).toMatch(/`token-\$\{tokenId\}`/);
  });

  it("renders a small TokenDisc with an anchored-token testid", () => {
    expect(AnchoredTokenDiscSrc).toMatch(/<TokenDisc tokenId=\{tokenId\} size="sm"\s*\/>/);
    expect(AnchoredTokenDiscSrc).toMatch(/`anchored-token-\$\{tokenId\}`/);
  });
});

describe("HandZone anchored token rendering", () => {
  it("imports AnchoredTokenDisc and accepts anchoredTokenIds", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*AnchoredTokenDisc\s*\}\s*from\s*'\.\/AnchoredTokenDisc'/);
    expect(HandZoneSrc).toMatch(/anchoredTokenIds:\s*TokenId\[\]/);
  });

  it("renders one AnchoredTokenDisc per anchored id inside the name row", () => {
    const nameRowMatch = HandZoneSrc.match(/<div className="flex items-center gap-2 px-4 mb-1">[\s\S]*?<\/div>\s*<div\s/);
    expect(nameRowMatch).not.toBeNull();
    expect(nameRowMatch![0]).toMatch(/anchoredTokenIds\.map/);
    expect(nameRowMatch![0]).toMatch(/<AnchoredTokenDisc/);
  });
});

describe("OpponentHand anchored token rendering", () => {
  it("imports AnchoredTokenDisc and accepts anchoredTokenIds", () => {
    expect(OpponentHandSrc).toMatch(/import\s*\{\s*AnchoredTokenDisc\s*\}\s*from\s*'\.\/AnchoredTokenDisc'/);
    expect(OpponentHandSrc).toMatch(/anchoredTokenIds:\s*TokenId\[\]/);
  });

  it("renders one AnchoredTokenDisc per anchored id", () => {
    expect(OpponentHandSrc).toMatch(/anchoredTokenIds\.map/);
    expect(OpponentHandSrc).toMatch(/<AnchoredTokenDisc/);
  });
});

describe("BoardView threads anchoredTokenIds", () => {
  it("derives anchoredTokenIds filtered to player-placement tokens", () => {
    expect(BoardViewSrc).toMatch(/placement\.kind === 'player' && t\.placement\.playerId === /);
  });

  it("passes anchoredTokenIds to OpponentHand and HandZone, immediately after chipsInHand", () => {
    // Anchored on the immediately-preceding prop rather than the opening tag — both
    // components have long prop lists that exceed a short fixed-size window from <Component.
    // Note: `??` is nullish coalescing in the source but two regex metacharacters here —
    // both `?` must be escaped (`\?\?`), not left bare, or they parse as lazy quantifiers.
    expect(BoardViewSrc).toMatch(/chipsInHand=\{player\?\.chipsInHand \?\? 0\}[\s\S]{0,40}anchoredTokenIds=\{anchoredTokenIds\(id\)\}/);
    expect(BoardViewSrc).toMatch(/chipsInHand=\{myPlayer\?\.chipsInHand \?\? 0\}[\s\S]{0,40}anchoredTokenIds=\{anchoredTokenIds\(gameState\.myPlayerId\)\}/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- anchoredToken`
Expected: FAIL — `src/components/AnchoredTokenDisc.tsx` doesn't exist yet.

- [ ] **Step 3: Create `AnchoredTokenDisc`**

Create `src/components/AnchoredTokenDisc.tsx`:

```tsx
import { useDraggable } from '@dnd-kit/core';
import type { TokenId } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';

// Draggable token anchored to a player's name row — same id/data contract as
// tray and canvas tokens (BoardDragLayer's token-drag-start detection is
// contract-based, not source-based), so it can be re-anchored directly in
// one drag without a forced stop in the tray (design 1035 revision).
export function AnchoredTokenDisc({ tokenId }: { tokenId: TokenId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `token-${tokenId}`,
    data: { type: 'token' as const, tokenId },
  });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-token=""
      data-testid={`anchored-token-${tokenId}`}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[tokenId]}
      style={{ touchAction: 'none', opacity: isDragging ? 0.3 : 1, cursor: 'grab', display: 'inline-flex' }}
    >
      <TokenDisc tokenId={tokenId} size="sm" />
    </span>
  );
}
```

- [ ] **Step 4: Wire into `HandZone`**

In `src/components/HandZone.tsx`, update the type import (line 6):

```tsx
import type { Card, ClientAction, Suit, Rank, SelectionSource, LastMoveHighlight, TokenId } from '@/shared/types';
```

Add the component import after line 12 (`import { ChipBadge } from './ChipBadge';`):

```tsx
import { AnchoredTokenDisc } from './AnchoredTokenDisc';
```

Add `anchoredTokenIds: TokenId[];` to `HandZoneProps` (after `chipsInHand: number;`, before `konamiActive: boolean;`) and to the destructured function parameters (after `chipsInHand`):

```tsx
  chipsInHand: number;
  anchoredTokenIds: TokenId[];
  konamiActive: boolean;
```

In the name row (lines 263-272), insert the render right after the closing `</span>` of the name/shortcut-key span and before the "selected" count span:

```tsx
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        {anchoredTokenIds.map(id => <AnchoredTokenDisc key={id} tokenId={id} />)}
        {selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId && (
```

- [ ] **Step 5: Wire into `OpponentHand`**

In `src/components/OpponentHand.tsx`, update the type import (line 6):

```tsx
import type { Card, ClientAction, LastMoveHighlight, TokenId } from '@/shared/types';
```

Add the component import after line 4 (`import { ChipBadge } from './ChipBadge';`):

```tsx
import { AnchoredTokenDisc } from './AnchoredTokenDisc';
```

Add `anchoredTokenIds: TokenId[];` to `OpponentHandProps` (after `chipsInHand: number;`, before `konamiActive: boolean;`) and to the destructured function parameters (after `chipsInHand`):

```tsx
  chipsInHand: number;
  anchoredTokenIds: TokenId[];
  konamiActive: boolean;
```

In the name row (lines 47-58), insert the render right after the closing `</span>` and before the chip badge:

```tsx
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}{cardCount > 0 ? ` (${cardCount})` : ''}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        {anchoredTokenIds.map(id => <AnchoredTokenDisc key={id} tokenId={id} />)}
        {chipsEnabled && <ChipBadge amount={chipsInHand} />}
      </div>
```

- [ ] **Step 6: Wire `BoardView`**

In `src/components/BoardView.tsx`, add `TokenId` to the type import (line 2):

```tsx
import type { ClientAction, ClientGameState, LastMoveHighlight, SelectionSource, TokenId } from '@/shared/types';
```

After the `canvasTokens` derivation (the line updated in Task 3, currently line 58), add:

```tsx
  const anchoredTokenIds = (playerId: string): TokenId[] =>
    gameState.tokensEnabled
      ? gameState.tokens.filter(t => t.placement.kind === 'player' && t.placement.playerId === playerId).map(t => t.id)
      : [];
```

In the `OpponentHand` JSX (inside the `allOpponentIds.map` block, currently around line 87-98), add the prop after `chipsInHand`:

```tsx
                <OpponentHand
                  playerId={id}
                  cardCount={cardCount}
                  displayName={player?.displayName ?? ''}
                  connected={player?.connected ?? false}
                  sendAction={sendAction}
                  revealedCards={revealedCards}
                  highlightedMove={highlightedMove}
                  shortcutKey={altHeld ? zoneLetterMap.get(`opponent-hand-${id}`) : undefined}
                  chipsEnabled={gameState.chipsEnabled}
                  chipsInHand={player?.chipsInHand ?? 0}
                  anchoredTokenIds={anchoredTokenIds(id)}
                  konamiActive={konamiActive}
                />
```

In the `HandZone` JSX (currently around line 176-197), add the prop after `chipsInHand`:

```tsx
              chipsEnabled={gameState.chipsEnabled}
              chipsInHand={myPlayer?.chipsInHand ?? 0}
              anchoredTokenIds={anchoredTokenIds(gameState.myPlayerId)}
              konamiActive={konamiActive}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- anchoredToken`
Expected: PASS (8 tests).
Run: `npm test -- chipsHandZone chipsOpponentHand` — must still pass unchanged (the name row still has exactly one `flex items-center gap-2 px-4 mb-1` div; `ChipBadge` still renders in it).
Run: `npm run typecheck` — remaining failures should now be limited to `BoardDragLayer.tsx` (Task 5).

- [ ] **Step 8: Commit**

```bash
git add src/components/AnchoredTokenDisc.tsx src/components/HandZone.tsx src/components/OpponentHand.tsx src/components/BoardView.tsx tests/anchoredToken.test.ts
git commit -m "feat(1035): render anchored tokens as draggable discs in player name rows"
```

---

### Task 5: `BoardDragLayer` — hand/opponent-hand as token drop targets, 3-way destination dispatch

**Files:**
- Modify: `src/components/BoardDragLayer.tsx:24-32` (collision detection), `:394-434` (handleDragEnd token branch)
- Test: `tests/tokenDragLayer.test.ts`

**Interfaces:**
- Consumes: `resolveTokenDrop` (Task 1), `MOVE_TOKEN` action shape (Task 1/2). Token drag-START detection (lines 314-321) is unchanged — it matches on `data.current.type === 'token'` regardless of DOM origin, so `AnchoredTokenDisc` (Task 4) is already a valid drag source with no changes here.
- Produces: token drops resolve to tray, canvas, or a player's hand/opponent-hand — this is the last piece; after this task the feature is end-to-end functional.

- [ ] **Step 1: Write the failing test**

Create `tests/tokenDragLayer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import BoardDragLayerSrc from "../src/components/BoardDragLayer.tsx?raw";

describe("BoardDragLayer token collision detection", () => {
  it("checks the tray first, then hand/opponent-hand targets, then canvas", () => {
    const tokenBranch = BoardDragLayerSrc.match(/if \(tokenData\?\.type === 'token'\) \{[\s\S]*?\n  \}/);
    expect(tokenBranch).not.toBeNull();
    const body = tokenBranch![0];
    const trayIdx = body.indexOf("'token-tray'");
    const handIdx = body.search(/'hand'|opponent-hand-/);
    const canvasIdx = body.lastIndexOf("'canvas'");
    expect(trayIdx).toBeGreaterThan(-1);
    expect(handIdx).toBeGreaterThan(trayIdx);
    expect(canvasIdx).toBeGreaterThan(handIdx);
  });

  it("matches both the player's own hand and opponent-hand droppables", () => {
    expect(BoardDragLayerSrc).toMatch(/String\(c\.id\) === 'hand' \|\| String\(c\.id\)\.startsWith\('opponent-hand-'\)/);
  });
});

describe("BoardDragLayer token drag-end dispatch", () => {
  it("computes base position from placement.kind (canvas vs. tray/player source)", () => {
    expect(BoardDragLayerSrc).toMatch(/token\.placement\.kind === 'canvas'/);
  });

  it("passes overToId (droppable toId) into resolveTokenDrop", () => {
    expect(BoardDragLayerSrc).toMatch(/overToId:/);
  });

  it("dispatches MOVE_TOKEN with a canvas destination on place", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'canvas',\s*x:\s*resolution\.x,\s*y:\s*resolution\.y\s*\}/);
  });

  it("dispatches MOVE_TOKEN with a player destination on anchor", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'player',\s*playerId:\s*resolution\.playerId\s*\}/);
  });

  it("dispatches MOVE_TOKEN with a tray destination on return", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'tray'\s*\}/);
  });

  it("no longer dispatches a separate RETURN_TOKEN action", () => {
    expect(BoardDragLayerSrc).not.toMatch(/RETURN_TOKEN/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tokenDragLayer`
Expected: FAIL — collision detection only checks tray/canvas; drag-end still reads `token.pos` and dispatches the old two-action shape.

- [ ] **Step 3: Extend collision detection**

In `src/components/BoardDragLayer.tsx`, replace lines 24-32:

```tsx
const customCollision: CollisionDetection = (args) => {
  const tokenData = args.active.data.current as { type?: string } | undefined;
  if (tokenData?.type === 'token') {
    const trayContainers = args.droppableContainers.filter(c => String(c.id) === 'token-tray');
    const trayCollisions = pointerWithin({ ...args, droppableContainers: trayContainers });
    if (trayCollisions.length > 0) return trayCollisions;
    const handContainers = args.droppableContainers.filter(
      c => String(c.id) === 'hand' || String(c.id).startsWith('opponent-hand-')
    );
    const handCollisions = pointerWithin({ ...args, droppableContainers: handContainers });
    if (handCollisions.length > 0) return handCollisions;
    const tokenCanvasContainers = args.droppableContainers.filter(c => String(c.id) === 'canvas');
    return pointerWithin({ ...args, droppableContainers: tokenCanvasContainers });
  }
```

- [ ] **Step 4: Rewrite the token branch of `handleDragEnd`**

In `src/components/BoardDragLayer.tsx`, replace lines 394-434 (the full "TOKEN DRAG BRANCH" block, from `if (activeTokenIdRef.current !== null) {` through its closing `}`):

```tsx
    // TOKEN DRAG BRANCH (1035): place on canvas, anchor to a player, or return to tray.
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
      if (token.placement.kind === 'canvas') {
        // canvas → canvas: stored position + delta (MOVE_CANVAS_PILE pattern)
        base = { x: token.placement.x + event.delta.x, y: token.placement.y + event.delta.y };
      } else {
        // tray or player source: only used if the drop resolves to canvas;
        // computed from pointer position relative to the inner canvas (PLACE_ON_CANVAS pattern).
        const activator = event.activatorEvent as PointerEvent;
        base = {
          x: activator.clientX + event.delta.x - (canvasBounds?.left ?? 0) - TOKEN_SIZE / 2,
          y: activator.clientY + event.delta.y - (canvasBounds?.top ?? 0) - TOKEN_SIZE / 2,
        };
      }
      const overData = event.over?.data.current as { toId?: string } | undefined;
      const resolution = resolveTokenDrop({
        overId: event.over ? String(event.over.id) : null,
        overToId: overData?.toId ?? null,
        fromTray: token.placement.kind === 'tray',
        base,
        canvasW: canvasBounds?.width ?? 0,
        canvasH: canvasBounds?.height ?? 0,
        tokenSize: TOKEN_SIZE,
      });
      if (resolution.kind === 'place') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'canvas', x: resolution.x, y: resolution.y } });
      } else if (resolution.kind === 'anchor') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'player', playerId: resolution.playerId } });
      } else if (resolution.kind === 'return') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'tray' } });
      }
      return;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tokenDragLayer`
Expected: PASS (8 tests).
Run: `npm test` (full suite) — expect all green.
Run: `npm run typecheck` — expect clean (this was the last file with outstanding token-shape errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/BoardDragLayer.tsx tests/tokenDragLayer.test.ts
git commit -m "feat(1035): route token drops to tray, canvas, or a player's hand"
```

---

### Task 6: E2e — player anchoring, direct re-anchor drag, ship prep

**Files:**
- Modify: `playwright/tokens.spec.ts` (append 2 new tests — the 2 existing tests are black-box and need no changes, since they only exercise tray↔canvas)
- Modify: `docs/superpowers/specs/BACKLOG.md` (only if 1035 is still listed — verify first; it was already removed when PR #85 was opened)
- Modify: `.planning/ROADMAP.md` (only if the v1.30 entry needs amending to mention the anchoring revision — verify current content first)

**Interfaces:**
- Consumes: `token-tray`, `tray-token-<id>`, `canvas-token-<id>`, `token-slot-<id>` (existing, Task 3); `anchored-token-<id>` (Task 4); ControlsBar buttons (existing); `twoPlayerRoom` fixture.
- Produces: end-to-end proof of the tray→player→player→tray loop across two clients, plus the direct re-anchor drag (no tray stop).

- [ ] **Step 1: Check whether BACKLOG.md/ROADMAP.md need updates**

```bash
grep -n "1035" docs/superpowers/specs/BACKLOG.md
grep -n "1035\|dealer" .planning/ROADMAP.md
```

If 1035 is already absent from `BACKLOG.md` and the v1.30 `ROADMAP.md` entry's wording still accurately describes the shipped feature (a token tray with drag placement — it doesn't need to enumerate every placement kind), leave both files alone; this is a same-PR revision, not a new shippable unit. If either file needs a wording tweak to stay accurate, make the smallest edit that fixes it.

- [ ] **Step 2: Add the player-anchoring e2e spec**

In `playwright/tokens.spec.ts`, add a helper after `center()` (line 19) and a new `test()` inside the existing `test.describe` block, after the second test (line 79, before the closing `});` of the describe block):

```ts
async function dragElementToElement(page: Page, fromTestId: string, toTestId: string) {
  const fromBox = (await page.getByTestId(fromTestId).boundingBox())!;
  const toBox = (await page.getByTestId(toTestId).boundingBox())!;
  await dragByMouse(page, center(fromBox), center(toBox));
}
```

```ts
  test('dealer token anchors to a player and renders in their name row on both clients; re-anchors in one drag; returns to tray', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableTokens(p1);

    // tray → P2 (dragged from P1's tray onto P1's view of P2, i.e. p1's opponent-hand)
    await dragElementToElement(p1, 'tray-token-dealer', 'opponent-hand');

    // P1 sees the anchor in their opponent-hand row; P2 sees it in their own hand-zone row.
    await expect(p1.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('anchored-token-dealer')).toBeVisible();
    // Tray slot empties for both.
    await expect(p1.getByTestId('token-slot-dealer')).toBeVisible();
    await expect(p1.getByTestId('tray-token-dealer')).toHaveCount(0);

    // Re-anchor directly from P2's row to P1's own row — one drag, no tray stop.
    // From P1's page: source is their opponent-hand's anchored disc; target is P1's own hand-zone.
    await dragElementToElement(p1, 'anchored-token-dealer', 'hand-zone');

    // Now anchored to P1: P1 sees it in their own hand row; P2 sees it in their opponent-hand row.
    await expect(p1.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('anchored-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toBeVisible();

    // Drag back to the tray from the name row.
    await dragElementToElement(p1, 'anchored-token-dealer', 'token-slot-dealer');

    await expect(p1.getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p2.getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('tray-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('tray-token-dealer')).toBeVisible();
  });
```

Note: `p1.getByTestId('anchored-token-dealer')` (unscoped) is unambiguous throughout — a token has exactly one placement at a time, so at most one `anchored-token-dealer` element exists on any given client's page. The `.getByTestId('opponent-hand').getByTestId(...)` scoping in the assertions above is used only to additionally confirm *which* row it's in, not to disambiguate multiple matches.

- [ ] **Step 3: Run the new e2e spec**

The worktree needs the dev servers running from THIS worktree's code. If servers from a different checkout are already up, kill them first (LISTEN-scoped only):

```bash
lsof -ti tcp:5173 -sTCP:LISTEN | xargs -r kill
lsof -ti tcp:1999 -sTCP:LISTEN | xargs -r kill
npx playwright test playwright/tokens.spec.ts
```

Expected: 3 passed (the 2 pre-existing tests plus the new one). If the new test flakes on the popover-reopen step it doesn't use, that's unrelated — but if the drag-to-drag sequence itself flakes, apply the same class of fix already used elsewhere in this file (a short `waitForTimeout` before the next drag starts, letting dnd-kit's pointer state settle) rather than weakening an assertion.

- [ ] **Step 4: Full verification**

```bash
npm test
npm run typecheck
npx playwright test
```

Expected: all unit suites green, typecheck clean, full e2e suite green.

- [ ] **Step 5: Commit**

```bash
git add playwright/tokens.spec.ts
git commit -m "feat(1035): e2e coverage for player-anchored tokens and direct re-anchor drag"
```

(Only `git add` `docs/superpowers/specs/BACKLOG.md` / `.planning/ROADMAP.md` too if Step 1 found edits were needed.)

After this task: push the branch (it already has a remote tracking branch from PR #85 — `git push`) so the open PR picks up the revision. No new PR is needed.
