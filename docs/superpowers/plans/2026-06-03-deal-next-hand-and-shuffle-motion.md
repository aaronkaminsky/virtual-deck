# Deal Next Hand & Shuffle Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Deal next hand" action that gathers, reshuffles, and re-deals in one undoable step, and replace the shuffle animation with a two-way-cut using real card-back art.

**Architecture:** Part A (999.48) adds a `DEAL_NEXT_HAND` server action that extracts shared gather-and-shuffle logic from `RESET_TABLE` into a private helper. The client's `ControlsBar` becomes phase-aware: it dispatches `DEAL_CARDS` in setup/lobby and `DEAL_NEXT_HAND` in playing. Part B (999.44) replaces the five felt-green shuffle divs in `PileZone` with `<CardBack>` wrappers driven by five dedicated CSS keyframes that cut right-then-left instead of fanning and returning.

**Tech Stack:** TypeScript, React, PartyKit (Cloudflare Workers), Vitest (unit tests), Playwright (E2E). All changes are local to the files listed below.

> **Note:** Parts A and B are independent — server/client logic for deal-next-hand and the CSS shuffle visual do not touch the same code. They can be executed in any order or in parallel.

---

## File Map

| File | What changes |
|------|-------------|
| `src/shared/types.ts` | Add `DEAL_NEXT_HAND` variant to `ClientAction` union |
| `party/index.ts` | New private `gatherAllCardsToDraw()` helper; refactor `RESET_TABLE` to use it; new `DEAL_NEXT_HAND` case |
| `src/components/ControlsBar.tsx` | Phase-aware label ("Deal" vs "Deal next hand"), action dispatch, `maxCards` logic |
| `src/components/PileZone.tsx` | Replace five green divs with `<CardBack>` wrappers; swap animation names |
| `src/globals.css` | Replace `pile-fan-spread` keyframe with five two-way-cut keyframes + reduced-motion rule |
| `tests/dealNextHand.test.ts` | New unit test file for `DEAL_NEXT_HAND` |
| `tests/resetTable.test.ts` | Add one canvas-card gather test (regression guard for refactor) |
| `playwright/game.spec.ts` | New E2E test for deal-next-hand flow |
| `docs/superpowers/specs/BACKLOG.md` | Remove entries 999.48, 999.44, 999.45 |
| `.planning/ROADMAP.md` | Record milestone |

---

## Task 1: Add DEAL_NEXT_HAND to shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add the new action variant**

In `src/shared/types.ts`, add to the `ClientAction` union (after the `DEAL_CARDS` line):

```typescript
  | { type: "DEAL_NEXT_HAND"; cardsPerPlayer: number }
```

The full updated union around that section:
```typescript
  | { type: "DEAL_CARDS"; cardsPerPlayer: number }
  | { type: "DEAL_NEXT_HAND"; cardsPerPlayer: number }
  | { type: "SHUFFLE_PILE"; pileId: string }
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add DEAL_NEXT_HAND to ClientAction type"
```

---

## Task 2: Write DEAL_NEXT_HAND unit tests (RED)

**Files:**
- Create: `tests/dealNextHand.test.ts`

- [ ] **Step 1: Create the test file**

Create `tests/dealNextHand.test.ts` with this full content:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("DEAL_NEXT_HAND handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    // Start in playing phase with cards dealt to hands
    room.gameState.phase = "playing";
    room.gameState.hands["player-1"] = [makeCard("A-s", true), makeCard("K-h", true)];
    room.gameState.hands["player-2"] = [makeCard("Q-d", true)];
    // Trim draw pile to a known small set to control total card count
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("2-c"), makeCard("3-c"), makeCard("4-c"), makeCard("5-c"), makeCard("6-c")];
    // Total cards = 2 + 1 + 5 = 8
  });

  it("gathers all cards to draw pile before dealing", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    // After deal, 4 cards dealt (2 × 2 players), remainder stays in draw
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    // 8 total - 4 dealt = 4 remaining in draw
    expect(drawPile.cards).toHaveLength(4);
  });

  it("all cards from all sources end up accounted for", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const totalAfter =
      drawPile.cards.length +
      room.gameState.hands["player-1"].length +
      room.gameState.hands["player-2"].length;
    expect(totalAfter).toBe(8); // Same total as before
  });

  it("dealt cards are face-up", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    for (const card of room.gameState.hands["player-1"]) {
      expect(card.faceUp).toBe(true);
    }
    for (const card of room.gameState.hands["player-2"]) {
      expect(card.faceUp).toBe(true);
    }
  });

  it("remaining draw pile cards are face-down", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    for (const card of drawPile.cards) {
      expect(card.faceUp).toBe(false);
    }
  });

  it("sets phase to playing", async () => {
    room.gameState.phase = "playing";
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.phase).toBe("playing");
  });

  it("takes exactly one snapshot (making it undoable)", async () => {
    room.gameState.undoSnapshots = [];
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("undo after DEAL_NEXT_HAND restores pre-action hand and table", async () => {
    const originalP1Hand = room.gameState.hands["player-1"].map(c => c.id);
    const originalP2Hand = room.gameState.hands["player-2"].map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(originalP1Hand);
    expect(room.gameState.hands["player-2"].map(c => c.id)).toEqual(originalP2Hand);
  });

  it("broadcasts PILE_SHUFFLED for draw pile", async () => {
    const conn1 = makeMockConnection("player-1");
    const conn2 = makeMockConnection("player-2");
    const connections = [conn1, conn2];
    const roomWithConns = makeMockRoom(connections);
    const r = new GameRoom(roomWithConns);
    r.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    r.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    r.gameState.hands["player-1"] = [makeCard("A-s", true)];
    r.gameState.hands["player-2"] = [];
    r.gameState.phase = "playing";
    const drawPile = r.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("2-c"), makeCard("3-c"), makeCard("4-c")];

    await r.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), conn1);

    const msgs = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const shuffleEvents = msgs.filter(e => e.type === "PILE_SHUFFLED");
    expect(shuffleEvents).toHaveLength(1);
    expect((shuffleEvents[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
  });

  it("clears handRevealed for all players", async () => {
    room.gameState.players.find(p => p.id === "player-1")!.handRevealed = true;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.players.find(p => p.id === "player-1")?.handRevealed).toBe(false);
  });

  it("gathers canvas cards before dealing", async () => {
    room.gameState.canvasCards = [{ card: makeCard("7-d", true), x: 100, y: 100, z: 1 }];
    // Total is now 9 (8 + 1 canvas)

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const totalAfter =
      drawPile.cards.length +
      room.gameState.hands["player-1"].length +
      room.gameState.hands["player-2"].length;
    expect(totalAfter).toBe(9);
  });

  it("rejects cardsPerPlayer < 1 with INVALID_CARDS_PER_PLAYER error, no mutation", async () => {
    const snapsBefore = room.gameState.undoSnapshots.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 0 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INVALID_CARDS_PER_PLAYER");
    expect(room.gameState.undoSnapshots).toHaveLength(snapsBefore); // no snapshot taken
    expect(room.gameState.hands["player-1"]).toHaveLength(2); // unchanged
  });

  it("rejects cardsPerPlayer > 13 with INVALID_CARDS_PER_PLAYER error", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 14 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INVALID_CARDS_PER_PLAYER");
  });

  it("rejects when total cards across game < cardsPerPlayer * players, with INSUFFICIENT_CARDS error", async () => {
    // Total = 8 cards, 2 players — max is 4. Request 5.
    const snapsBefore = room.gameState.undoSnapshots.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 5 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INSUFFICIENT_CARDS");
    expect(room.gameState.undoSnapshots).toHaveLength(snapsBefore); // no snapshot taken
  });

  it("skips disconnected players when dealing", async () => {
    room.gameState.players.push({ id: "player-3", connected: false, displayName: "", handRevealed: false });
    room.gameState.hands["player-3"] = [];

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-3"]).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail (RED)**

```bash
npm test -- tests/dealNextHand.test.ts
```

Expected: all tests fail with errors like `unknown action type` or `TypeError` — the handler doesn't exist yet.

---

## Task 3: Extract gatherAllCardsToDraw helper and refactor RESET_TABLE

**Files:**
- Modify: `party/index.ts`

- [ ] **Step 1: Add canvas-card gather test to resetTable.test.ts**

In `tests/resetTable.test.ts`, add this test inside the `describe("RESET_TABLE handler")` block, after the existing tests:

```typescript
  it("gathers canvas cards to draw pile and clears canvasCards", async () => {
    room.gameState.canvasCards = [
      { card: makeCard("7-d", true), x: 100, y: 100, z: 1 },
    ];
    const totalBefore = 2 + 1 + 3 + 1 + 1; // hands + draw + discard + canvas

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(drawPile.cards).toHaveLength(totalBefore);
    expect(room.gameState.canvasCards).toHaveLength(0);
  });
```

Note: the `resetTable.test.ts` imports `makeCard` from `"../src/shared/types"` inline; check the top of the file — if it defines its own `makeCard` function, add the test at the bottom without importing from helpers. Use the local `makeCard` the file already defines.

- [ ] **Step 2: Run existing resetTable tests to confirm they pass before the refactor**

```bash
npm test -- tests/resetTable.test.ts
```

Expected: all existing tests pass, new canvas test passes (canvas gathering is already implemented in RESET_TABLE).

- [ ] **Step 3: Add gatherAllCardsToDraw private method to GameRoom**

In `party/index.ts`, add this private method to the `GameRoom` class, just before the `broadcastShuffleEvent` method (around line 955):

```typescript
  private gatherAllCardsToDraw(): void {
    const drawPile = this.gameState.piles.find(p => p.id === "draw");
    if (!drawPile) return;
    for (const hand of Object.values(this.gameState.hands)) {
      drawPile.cards.push(...hand.splice(0));
    }
    for (const pile of this.gameState.piles) {
      if (pile.id !== "draw") {
        drawPile.cards.push(...pile.cards.splice(0));
      }
    }
    for (const canvasCard of this.gameState.canvasCards) {
      canvasCard.card.faceUp = false;
      drawPile.cards.push(canvasCard.card);
    }
    this.gameState.canvasCards = [];
    drawPile.faceUp = false;
    drawPile.cards.forEach(c => { c.faceUp = false; });
    drawPile.cards = shuffle(drawPile.cards);
    for (const player of this.gameState.players) {
      player.handRevealed = false;
    }
  }
```

- [ ] **Step 4: Refactor the RESET_TABLE case to use the helper**

Replace the `RESET_TABLE` case body in the `switch(action.type)` block (currently lines ~544–576) with:

```typescript
      case "RESET_TABLE": {
        // INTENTIONAL: No takeSnapshot before reset — a reset is a commitment and cannot be undone.
        // Undo history is cleared so no pre-reset state can be restored.
        // INTENTIONAL: No authorization check — any connected player can reset the table.
        const resetDrawPile = this.gameState.piles.find(p => p.id === "draw");
        if (!resetDrawPile) break;
        this.gatherAllCardsToDraw();
        this.gameState.phase = "setup";
        this.gameState.undoSnapshots = [];
        break;
      }
```

- [ ] **Step 5: Run resetTable tests to confirm behavior is unchanged**

```bash
npm test -- tests/resetTable.test.ts
```

Expected: all tests (including the new canvas test) pass. If any fail, the helper extracted incorrectly — compare the helper body against the original lines 553–574 and fix.

- [ ] **Step 6: Commit**

```bash
git add party/index.ts tests/resetTable.test.ts
git commit -m "refactor: extract gatherAllCardsToDraw helper from RESET_TABLE"
```

---

## Task 4: Implement DEAL_NEXT_HAND server handler

**Files:**
- Modify: `party/index.ts`

- [ ] **Step 1: Add the DEAL_NEXT_HAND case to the switch**

In `party/index.ts`, add the `DEAL_NEXT_HAND` case inside the `switch(action.type)` block. Place it after the `DEAL_CARDS` case (after the closing `break;` of that case, around line 517):

```typescript
      case "DEAL_NEXT_HAND": {
        if (
          !Number.isInteger(action.cardsPerPlayer) ||
          action.cardsPerPlayer < 1 ||
          action.cardsPerPlayer > 13
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_CARDS_PER_PLAYER",
            message: "cardsPerPlayer must be an integer between 1 and 13",
          } satisfies ServerEvent));
          break;
        }
        const nextHandPlayers = this.gameState.players.filter(p => p.connected);
        const nextHandNeeded = action.cardsPerPlayer * nextHandPlayers.length;
        const totalCards =
          Object.values(this.gameState.hands).reduce((sum, hand) => sum + hand.length, 0) +
          this.gameState.piles.reduce((sum, pile) => sum + pile.cards.length, 0) +
          this.gameState.canvasCards.length;
        if (totalCards < nextHandNeeded) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INSUFFICIENT_CARDS",
            message: "Not enough cards to deal",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        this.gatherAllCardsToDraw();
        this.broadcastShuffleEvent("draw");
        await new Promise(resolve => setTimeout(resolve, 650));
        const nextHandDrawPile = this.gameState.piles.find(p => p.id === "draw")!;
        for (const player of nextHandPlayers) {
          if (!this.gameState.hands[player.id]) {
            this.gameState.hands[player.id] = [];
          }
        }
        for (let i = 0; i < action.cardsPerPlayer; i++) {
          for (const player of nextHandPlayers) {
            const dealt = nextHandDrawPile.cards.pop()!;
            dealt.faceUp = true;
            this.gameState.hands[player.id].push(dealt);
          }
        }
        this.gameState.phase = "playing";
        this.broadcastEffect("deal");
        break;
      }
```

- [ ] **Step 2: Run DEAL_NEXT_HAND tests to confirm they all pass (GREEN)**

```bash
npm test -- tests/dealNextHand.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run full unit suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add party/index.ts tests/dealNextHand.test.ts
git commit -m "feat: add DEAL_NEXT_HAND server action (999.48)"
```

---

## Task 5: Phase-aware Deal button in ControlsBar

**Files:**
- Modify: `src/components/ControlsBar.tsx`

- [ ] **Step 1: Update maxCards and remove dealDisabled**

Replace the three lines starting with `const drawPileCount` through `const dealDisabled = ...` in `ControlsBar.tsx` with:

```typescript
  const drawPileCount = gameState.piles.find(p => p.id === 'draw')?.cards.length ?? 0;
  const connectedPlayerCount = gameState.players.filter(p => p.connected).length || 1;

  const totalCardsInGame =
    gameState.myHand.length +
    Object.values(gameState.opponentHandCounts).reduce((a, b) => a + b, 0) +
    Object.values(gameState.opponentRevealedHands).reduce((acc, cards) => acc + cards.length, 0) +
    gameState.piles.reduce((acc, p) => acc + p.cards.length, 0) +
    gameState.canvasCards.length;

  const maxCards = gameState.phase === 'playing'
    ? Math.floor(totalCardsInGame / connectedPlayerCount)
    : Math.floor(drawPileCount / connectedPlayerCount);
```

Note: `dealDisabled` is removed — the Deal button is now always enabled (deal is valid in lobby, setup, and playing).

- [ ] **Step 2: Update handleDeal to dispatch the correct action by phase**

Replace the existing `handleDeal` function:

```typescript
  function handleDeal() {
    const parsed = parseInt(dealCount, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > maxCards) return;
    if (gameState.phase === 'playing') {
      sendAction({ type: 'DEAL_NEXT_HAND', cardsPerPlayer: parsed });
    } else {
      sendAction({ type: 'DEAL_CARDS', cardsPerPlayer: parsed });
    }
    handleOpenChange(false);
  }
```

- [ ] **Step 3: Update the Deal section JSX**

In the JSX, find the Deal section. Replace the Input and Button in that section:

Before (the `<div className="flex items-center gap-2">` containing Input and Button):
```tsx
              <Input
                type="number"
                min={1}
                max={maxCards}
                value={dealCount}
                onChange={e => setDealCount(e.target.value)}
                className="flex-1"
                disabled={dealDisabled}
              />
              <Button
                variant="default"
                size="sm"
                disabled={dealDisabled}
                onClick={handleDeal}
              >
                Deal
              </Button>
```

After:
```tsx
              <Input
                type="number"
                min={1}
                max={maxCards}
                value={dealCount}
                onChange={e => setDealCount(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleDeal}
              >
                {gameState.phase === 'playing' ? 'Deal next hand' : 'Deal'}
              </Button>
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `dealDisabled` is referenced anywhere else in the file, remove those usages too.

- [ ] **Step 5: Run unit tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ControlsBar.tsx
git commit -m "feat: phase-aware Deal button — 'Deal next hand' in playing phase (999.48)"
```

---

## Task 6: Replace shuffle animation elements in PileZone

**Files:**
- Modify: `src/components/PileZone.tsx`

- [ ] **Step 1: Replace the five green divs with CardBack wrappers**

In `PileZone.tsx`, find the `isShuffling` block:

```tsx
        {isShuffling && [0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="absolute inset-0 rounded-lg bg-secondary border border-border pointer-events-none"
            style={{
              '--fan-x': `${(i - 2) * 12}px`,
              '--fan-r': `${(i - 2) * 6}deg`,
              animationName: 'pile-fan-spread',
              animationDuration: '550ms',
              animationDelay: `${i * 30}ms`,
              animationFillMode: 'forwards',
              animationTimingFunction: 'ease-out',
              zIndex: 10 - i,
            } as React.CSSProperties}
          />
        ))}
```

Replace it with:

```tsx
        {isShuffling && (['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const).map((animName, i) => (
          <div
            key={i}
            className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
            style={{
              animationName: animName,
              animationDuration: '600ms',
              animationFillMode: 'forwards',
              animationTimingFunction: 'ease-in-out',
            } as React.CSSProperties}
          >
            <CardBack />
          </div>
        ))}
```

`CardBack` is already imported at the top of `PileZone.tsx` — no import changes needed.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PileZone.tsx
git commit -m "feat: use card-back art in shuffle animation (999.44)"
```

---

## Task 7: Replace pile-fan-spread with two-way-cut keyframes in globals.css

**Files:**
- Modify: `src/globals.css`

- [ ] **Step 1: Replace the keyframe block**

In `src/globals.css`, find and replace the `@keyframes pile-fan-spread` block (lines ~122–126):

```css
@keyframes pile-fan-spread {
  0%   { transform: translateX(0) rotate(0deg);                       opacity: 0.7; }
  40%  { transform: translateX(var(--fan-x)) rotate(var(--fan-r));    opacity: 0.9; }
  100% { transform: translateX(0) rotate(0deg);                       opacity: 0; }
}
```

Replace with these five keyframes:

```css
@keyframes shuffle-cut-right-1 {
  0%   { transform: translateX(0)    translateY(0)     rotate(0deg);   z-index: 10; }
  25%  { transform: translateX(60px) translateY(-18px) rotate(14deg);  z-index: 15; }
  55%  { transform: translateX(6px)  translateY(18px)  rotate(2deg);   z-index: 1; }
  100% { transform: translateX(6px)  translateY(18px)  rotate(2deg);   z-index: 1; }
}

@keyframes shuffle-cut-right-2 {
  0%   { transform: translateX(0)    translateY(0)     rotate(0deg);   z-index: 9; }
  30%  { transform: translateX(60px) translateY(-18px) rotate(14deg);  z-index: 14; }
  60%  { transform: translateX(2px)  translateY(18px)  rotate(1deg);   z-index: 1; }
  100% { transform: translateX(2px)  translateY(18px)  rotate(1deg);   z-index: 1; }
}

@keyframes shuffle-cut-mid {
  0%   { transform: translateX(0) translateY(0)   rotate(0deg); z-index: 8; }
  40%  { transform: translateX(0) translateY(6px) rotate(0deg); z-index: 8; }
  100% { transform: translateX(0) translateY(2px) rotate(0deg); z-index: 8; }
}

@keyframes shuffle-cut-left-4 {
  0%   { transform: translateX(0)     translateY(0)     rotate(0deg);    z-index: 7; }
  10%  { transform: translateX(-10px) translateY(-5px)  rotate(-4deg);   z-index: 13; }
  45%  { transform: translateX(-60px) translateY(-18px) rotate(-14deg);  z-index: 13; }
  70%  { transform: translateX(-4px)  translateY(8px)   rotate(-2deg);   z-index: 2; }
  100% { transform: translateX(-4px)  translateY(8px)   rotate(-2deg);   z-index: 2; }
}

@keyframes shuffle-cut-left-5 {
  0%   { transform: translateX(0)     translateY(0)     rotate(0deg);    z-index: 6; }
  15%  { transform: translateX(-10px) translateY(-5px)  rotate(-4deg);   z-index: 12; }
  50%  { transform: translateX(-60px) translateY(-18px) rotate(-14deg);  z-index: 12; }
  80%  { transform: translateX(0px)   translateY(4px)   rotate(0deg);    z-index: 2; }
  100% { transform: translateX(0px)   translateY(4px)   rotate(0deg);    z-index: 2; }
}
```

- [ ] **Step 2: Add prefers-reduced-motion rule**

After the five keyframes (and before `@keyframes canvas-edge-pulse`), add:

```css
@media (prefers-reduced-motion: reduce) {
  .shuffle-card-1,
  .shuffle-card-2,
  .shuffle-card-3,
  .shuffle-card-4,
  .shuffle-card-5 {
    animation: none;
  }
}
```

- [ ] **Step 3: Run typecheck and unit tests**

```bash
npm run typecheck && npm test
```

Expected: all pass. The CSS change has no TypeScript impact.

- [ ] **Step 4: Verify animation visually**

Start the dev servers:
```bash
# Terminal 1:
npm run dev
# Terminal 2:
npm run dev:client
```

Navigate to `http://localhost:5173`, join a room, and deal cards. Observe the shuffle animation: you should see card-back art arcing right and left, not green rectangles. The animation should complete within ~650ms and the dealt hand should appear immediately after.

- [ ] **Step 5: Commit**

```bash
git add src/globals.css
git commit -m "feat: two-way-cut shuffle animation with card-back art (999.44)"
```

---

## Task 8: E2E test for deal-next-hand flow

**Files:**
- Modify: `playwright/game.spec.ts`

- [ ] **Step 1: Add the deal-next-hand E2E test**

In `playwright/game.spec.ts`, add this test inside the `test.describe('virtual-deck e2e')` block (after the existing `reset table` test):

```typescript
  test('deal next hand: Deal button available in playing phase, deals fresh hand, undo restores previous', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal initial hand — enters playing phase
    await dealCards(p1, 3);
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Open controls in playing phase — button should say "Deal next hand"
    await p1.getByRole('button', { name: /open controls/i }).click();
    await expect(p1.getByRole('button', { name: 'Deal next hand' })).toBeVisible();

    // Click "Deal next hand" — clears table and deals fresh cards
    await p1.getByRole('button', { name: 'Deal next hand' }).click();

    // Both players should have cards in their hands after the deal
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Still in playing phase — controls should still show "Deal next hand"
    await p1.getByRole('button', { name: /open controls/i }).click();
    await expect(p1.getByRole('button', { name: 'Deal next hand' })).toBeVisible();
    await p1.getByRole('button', { name: /open controls/i }).click(); // close

    // Undo — should restore the prior hand (canUndo becomes true after DEAL_NEXT_HAND)
    await p1.getByRole('button', { name: /open controls/i }).click();
    const undoButton = p1.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
    await undoButton.click();

    // After undo, P1 should still have cards (restored from snapshot)
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  });
```

Note: the `dealCards` helper at the top of `game.spec.ts` clicks "Deal" — after this change, that button says "Deal" in setup/lobby phase, which is correct for the initial deal.

- [ ] **Step 2: Run E2E tests**

Ensure both dev servers are running (`npm run dev` and `npm run dev:client` in separate terminals), then:

```bash
npm run test:e2e
```

Expected: all tests pass including the new one. The new test takes ~5–7s due to the 650ms server delay × 2 deals.

- [ ] **Step 3: Commit**

```bash
git add playwright/game.spec.ts
git commit -m "test: e2e coverage for deal-next-hand flow"
```

---

## Task 9: Backlog housekeeping

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md`
- Modify: `.planning/ROADMAP.md`

- [ ] **Step 1: Remove 999.48, 999.44, and 999.45 from BACKLOG.md**

In `docs/superpowers/specs/BACKLOG.md`, remove the rows for entries `999.44`, `999.45`, and `999.48`. These are the lines matching those IDs.

- [ ] **Step 2: Record the milestone in ROADMAP.md**

In `.planning/ROADMAP.md`, add an entry in the shipped milestones section:

```markdown
| 999.48 / 999.44 | Deal next hand & shuffle motion polish | 2026-06-03 | `feat/deal-next-hand-and-shuffle-motion` |
```

Follow the existing row format in that file.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "chore: mark 999.48, 999.44, 999.45 shipped in roadmap"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task covering it |
|---|---|
| `DEAL_NEXT_HAND { cardsPerPlayer }` server action | Tasks 1, 4 |
| Validate before gather (no mutation on error) | Task 4 (handler validation block) |
| `takeSnapshot` before mutation | Task 4 (handler, verified by unit test) |
| Gather all cards, face-down, clear reveals, shuffle | Task 3 (helper) |
| `broadcastShuffleEvent("draw")` + 650ms wait | Task 4 |
| Deal round-robin, face-up, `phase = "playing"` | Task 4 |
| `broadcastEffect("deal")` | Task 4 |
| `RESET_TABLE` behavior unchanged | Task 3 (existing tests stay green) |
| Client: "Deal next hand" label in playing phase | Task 5 |
| Client: dispatches `DEAL_NEXT_HAND` in playing phase | Task 5 |
| Client: `maxCards` uses full deck during play | Task 5 |
| Client: input editable during play | Task 5 (no `disabled` on input) |
| Undo restores prior hand | Tasks 4 unit test + Task 8 E2E |
| Card-back art in shuffle animation | Task 6 |
| Two-way-cut keyframes (5 distinct, peaks ~5% apart) | Task 7 |
| `animation-fill-mode: forwards` (stays tucked) | Task 7 keyframes end at tuck position |
| `prefers-reduced-motion` respected | Task 7 media query |
| Timing within ~650ms window | Task 7 (`animationDuration: '600ms'`) |
| Backlog cleanup (999.48, 999.44, 999.45) | Task 9 |

**No placeholders:** all steps contain complete code.

**Type consistency:** `DEAL_NEXT_HAND` defined in Task 1 (`src/shared/types.ts`) is referenced in Task 4 (`party/index.ts`) and Task 5 (`ControlsBar.tsx`) using the exact same name and shape. The helper `gatherAllCardsToDraw()` defined in Task 3 is called in Task 4 using the same name. The animation names defined in Task 7 (`shuffle-cut-right-1` etc.) are referenced by exact string in Task 6. The class names (`shuffle-card-1` etc.) in Task 7 match the template literal in Task 6.
