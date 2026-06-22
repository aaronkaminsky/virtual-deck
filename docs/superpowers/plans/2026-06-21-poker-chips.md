# Poker Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, room-wide poker chip support — a per-player in-hand stack, a per-player visible bet area (spread), and a shared pot — with a generic transfer action, a hamburger-menu toggle, themed visuals, and bet/collect sound effects.

**Architecture:** Chips are plain numbers on the existing server-authoritative `GameState`/`Player` types (`chipsInHand`, `chipsInSpread`, `pot`) — no new `Pile`/region type. A single generic `TRANSFER_CHIPS` action moves an amount between any two of `hand`/`spread`/`pot` for a given player; the server validates ownership and sufficient funds, takes an undo snapshot, mutates, and broadcasts. A `SET_CHIPS_MODE` action toggles the room-wide feature flag and configures/initializes starting stacks. Client UI adds two new presentational components (`ChipBadge`, `ChipStack`) reused across `HandZone`, `OpponentHand`, `SpreadZone`, and a new `PotZone` in the rail.

**Tech Stack:** TypeScript, React 18, PartyKit (Cloudflare Workers) server, Vitest (unit), Playwright (e2e), Tailwind v4 with the app's existing theme tokens.

## Global Constraints

- No real chip denominations — chips are plain numbers, never broken into `{5: 2, 25: 1}`-style counts.
- No turn order, call/raise/fold, or side pots — one shared `pot` per room, free-form transfers only.
- No host role exists in this app — the chips toggle is room-wide and any connected player may flip it.
- Chip visuals use only existing theme tokens (`--primary`, `--accent`, `--muted`, `--secondary`, `--border`, `--radius`) via already-used Tailwind utility classes (`bg-primary`, `bg-muted`, `bg-secondary`) — no new colors, gradients, or image assets.
- Chip sounds (`chip-bet.mp3`, `chip-collect.mp3`) are real mp3 files dropped in `public/sounds/`, matching `deal.mp3`/`shuffle.mp3` — **not** synthesized audio, and **not** created by this plan. They are a prerequisite the user supplies separately; `playSound()` already fails silently if a file is missing (`el.play().catch(() => {})`), so the app works correctly even before the files exist — sound is just silent until then.
- This codebase tests UI components with source-contract tests (`?raw` import + regex assertions on the source, e.g. `tests/pileZonePolish.test.ts`), not React Testing Library — there are zero RTL tests in `tests/`. Follow that convention for all UI-layer tasks below.
- `takeSnapshot()` before mutation gives undo for free via the existing `UNDO_MOVE` handler, which restores the entire previous `GameState` — chip transfers need no special-case undo logic.

---

### Task 1: Chip fields on the data model + server defaults/migration

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `party/index.ts` (`defaultGameState`, `onStart`)
- Test: `tests/chipsState.test.ts`

**Interfaces:**
- Produces: `Player.chipsInHand: number`, `Player.chipsInSpread: number`; `GameState.chipsEnabled: boolean`, `GameState.startingChips: number`, `GameState.pot: number`, `GameState.chipsInitialized: boolean` (server-internal, never exposed on `ClientGameState`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsState.test.ts
import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("chips data model defaults", () => {
  it("defaultGameState initializes chipsEnabled:false, startingChips:1000, pot:0, chipsInitialized:false", () => {
    const state = defaultGameState("room-1");
    expect(state.chipsEnabled).toBe(false);
    expect(state.startingChips).toBe(1000);
    expect(state.pot).toBe(0);
    expect(state.chipsInitialized).toBe(false);
  });

  it("onStart migrates persisted state from before chips existed", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    const legacyState = defaultGameState("room-1");
    legacyState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false } as any);
    delete (legacyState as any).chipsEnabled;
    delete (legacyState as any).startingChips;
    delete (legacyState as any).pot;
    delete (legacyState as any).chipsInitialized;
    delete (legacyState.players[0] as any).chipsInHand;
    delete (legacyState.players[0] as any).chipsInSpread;
    (room.room.storage.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(legacyState);

    await room.onStart();

    expect(room.gameState.chipsEnabled).toBe(false);
    expect(room.gameState.startingChips).toBe(1000);
    expect(room.gameState.pot).toBe(0);
    expect(room.gameState.chipsInitialized).toBe(false);
    expect(room.gameState.players[0].chipsInHand).toBe(0);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsState`
Expected: FAIL — `chipsEnabled`/`startingChips`/`pot`/`chipsInitialized` are `undefined`, so `toBe(false)`/`toBe(1000)`/`toBe(0)` assertions fail.

- [ ] **Step 3: Add the fields to `src/shared/types.ts`**

```ts
export interface Player {
  id: string;        // stable player token (= connection.id via PartySocket id param)
  connected: boolean;
  displayName: string;
  handRevealed: boolean;
  chipsInHand: number;
  chipsInSpread: number;
}
```

```ts
export interface GameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;  // keyed by player token
  piles: Pile[];
  undoSnapshots: GameState[];
  canvasCards: CanvasCard[];
  chipsEnabled: boolean;
  startingChips: number;
  pot: number;
  chipsInitialized: boolean;
}
```

- [ ] **Step 4: Update `defaultGameState` in `party/index.ts`**

```ts
export function defaultGameState(roomId: string): GameState {
  return {
    roomId,
    phase: "lobby",
    players: [],
    hands: {},
    piles: [
      { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false, region: "pile", ownerId: null },
      { id: "discard", name: "Discard", cards: [], faceUp: true, region: "pile", ownerId: null },
    ],
    undoSnapshots: [],
    canvasCards: [],
    chipsEnabled: false,
    startingChips: 1000,
    pot: 0,
    chipsInitialized: false,
  };
}
```

- [ ] **Step 5: Add migration in `onStart` (after the existing canvasCards migration block)**

```ts
    // Migrate state: Phase 999.17 adds chip fields to Player and GameState
    for (const player of this.gameState.players) {
      if (!('chipsInHand' in player)) {
        (player as any).chipsInHand = 0;
      }
      if (!('chipsInSpread' in player)) {
        (player as any).chipsInSpread = 0;
      }
    }
    if (!('chipsEnabled' in this.gameState)) {
      (this.gameState as unknown as GameState).chipsEnabled = false;
    }
    if (!('startingChips' in this.gameState)) {
      (this.gameState as unknown as GameState).startingChips = 1000;
    }
    if (!('pot' in this.gameState)) {
      (this.gameState as unknown as GameState).pot = 0;
    }
    if (!('chipsInitialized' in this.gameState)) {
      (this.gameState as unknown as GameState).chipsInitialized = false;
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- chipsState`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/chipsState.test.ts
git commit -m "feat(chips): add chip fields to Player/GameState with migration defaults"
```

---

### Task 2: Expose chips on `ClientGameState` + initialize new joiners

**Files:**
- Modify: `src/shared/types.ts` (`ClientGameState`)
- Modify: `party/index.ts` (`viewFor`, `onConnect`)
- Test: `tests/chipsJoin.test.ts`

**Interfaces:**
- Consumes: `GameState.chipsEnabled`, `GameState.startingChips`, `GameState.pot`, `Player.chipsInHand`/`chipsInSpread` (Task 1).
- Produces: `ClientGameState.pot: number`, `ClientGameState.chipsEnabled: boolean`, `ClientGameState.startingChips: number`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsJoin.test.ts
import { describe, it, expect } from "vitest";
import GameRoom, { viewFor } from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

function makeMockCtx(url: string) {
  return { request: { url } } as any;
}

describe("chips exposed via viewFor", () => {
  it("includes pot, chipsEnabled, startingChips in the client view", () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.pot = 250;
    room.gameState.chipsEnabled = true;
    room.gameState.startingChips = 1000;

    const view = viewFor(room.gameState, "p1");

    expect(view.pot).toBe(250);
    expect(view.chipsEnabled).toBe(true);
    expect(view.startingChips).toBe(1000);
  });
});

describe("onConnect chip initialization", () => {
  it("new player joining while chipsEnabled=true gets chipsInHand=startingChips", async () => {
    const conn = makeMockConnection("conn-1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.startingChips = 500;

    await room.onConnect(conn, makeMockCtx("http://localhost?player=p1&name=Aaron"));

    const player = room.gameState.players.find(p => p.id === "p1");
    expect(player?.chipsInHand).toBe(500);
    expect(player?.chipsInSpread).toBe(0);
  });

  it("new player joining while chipsEnabled=false gets chipsInHand=0", async () => {
    const conn = makeMockConnection("conn-1");
    const room = new GameRoom(makeMockRoom([conn]));

    await room.onConnect(conn, makeMockCtx("http://localhost?player=p1&name=Aaron"));

    const player = room.gameState.players.find(p => p.id === "p1");
    expect(player?.chipsInHand).toBe(0);
    expect(player?.chipsInSpread).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsJoin`
Expected: FAIL — `view.pot`/`view.chipsEnabled`/`view.startingChips` are `undefined`; `player?.chipsInHand` is `undefined` (the push call doesn't set it yet).

- [ ] **Step 3: Add fields to `ClientGameState` in `src/shared/types.ts`**

```ts
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  myHandRevealed: boolean;
  opponentRevealedHands: Record<string, Card[]>;
  opponentHandCounts: Record<string, number>;
  piles: ClientPile[];
  canUndo: boolean;
  myPlayZoneId: string;
  canvasCards: ClientCanvasCard[];
  pot: number;
  chipsEnabled: boolean;
  startingChips: number;
}
```

- [ ] **Step 4: Update `viewFor` in `party/index.ts`** — add to the returned object (after `canUndo`, before `canvasCards`):

```ts
    canUndo: state.undoSnapshots.length > 0,
    pot: state.pot,
    chipsEnabled: state.chipsEnabled,
    startingChips: state.startingChips,
    myPlayZoneId: `spread-${playerToken}`,
```

- [ ] **Step 5: Update the new-player push in `onConnect`**

```ts
    if (!this.gameState.players.find(p => p.id === playerToken)) {
      this.gameState.players.push({
        id: playerToken,
        connected: true,
        displayName,
        handRevealed: false,
        chipsInHand: this.gameState.chipsEnabled ? this.gameState.startingChips : 0,
        chipsInSpread: 0,
      });
      this.gameState.hands[playerToken] = [];
    } else {
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- chipsJoin`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/chipsJoin.test.ts
git commit -m "feat(chips): expose chips on ClientGameState and initialize new joiners"
```

---

### Task 3: `SET_CHIPS_MODE` action and handler

**Files:**
- Modify: `src/shared/types.ts` (`ClientAction`)
- Modify: `party/index.ts` (new switch case)
- Test: `tests/chipsMode.test.ts`

**Interfaces:**
- Produces: `ClientAction` variant `{ type: "SET_CHIPS_MODE"; enabled: boolean; startingChips: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsMode.test.ts
import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("SET_CHIPS_MODE handler", () => {
  it("first enable sets startingChips for all players and zeroes spread/pot", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 7 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.pot = 3;

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 750 }), conn1);

    expect(room.gameState.chipsEnabled).toBe(true);
    expect(room.gameState.startingChips).toBe(750);
    expect(room.gameState.chipsInitialized).toBe(true);
    expect(room.gameState.players[0].chipsInHand).toBe(750);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
    expect(room.gameState.players[1].chipsInHand).toBe(750);
    expect(room.gameState.pot).toBe(0);
  });

  it("re-enabling after a prior disable does NOT reset existing amounts", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    // First enable — initializes
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);
    // Simulate play: stack changes
    room.gameState.players[0].chipsInHand = 400;
    room.gameState.pot = 600;
    // Disable
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: false, startingChips: 1000 }), conn1);
    // Re-enable
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);

    expect(room.gameState.chipsEnabled).toBe(true);
    expect(room.gameState.players[0].chipsInHand).toBe(400);
    expect(room.gameState.pot).toBe(600);
  });

  it("updating startingChips while already initialized does not retroactively change existing players", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);
    room.gameState.players[0].chipsInHand = 250;

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 2000 }), conn1);

    expect(room.gameState.startingChips).toBe(2000);
    expect(room.gameState.players[0].chipsInHand).toBe(250);
  });

  it("SET_CHIPS_MODE takes no undo snapshot", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);

    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsMode`
Expected: FAIL — `SET_CHIPS_MODE` is not a recognized `ClientAction`/switch case, so `chipsEnabled` etc. never change (assertions against `true`/`750`/`400` etc. fail).

- [ ] **Step 3: Add the action to `ClientAction` in `src/shared/types.ts`**

```ts
  | { type: "SET_CHIPS_MODE"; enabled: boolean; startingChips: number }
```

(Add it to the `ClientAction` union, alongside `SET_HAND_REVEALED`.)

- [ ] **Step 4: Add the handler in `party/index.ts`** — insert as a new case, right before `case "PING":`

```ts
      case "SET_CHIPS_MODE": {
        const wasInitialized = this.gameState.chipsInitialized;
        this.gameState.chipsEnabled = action.enabled === true;
        if (Number.isFinite(action.startingChips) && action.startingChips >= 0) {
          this.gameState.startingChips = Math.floor(action.startingChips);
        }
        if (this.gameState.chipsEnabled && !wasInitialized) {
          for (const player of this.gameState.players) {
            player.chipsInHand = this.gameState.startingChips;
            player.chipsInSpread = 0;
          }
          this.gameState.pot = 0;
          this.gameState.chipsInitialized = true;
        }
        // Intentionally no takeSnapshot() — mode toggle is not undoable (consistent with RESET_TABLE/SET_HAND_REVEALED)
        break;
      }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- chipsMode`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/chipsMode.test.ts
git commit -m "feat(chips): add SET_CHIPS_MODE action and handler"
```

---

### Task 4: `TRANSFER_CHIPS` happy paths, undo, and sound dispatch

**Files:**
- Modify: `src/shared/types.ts` (`ClientAction`, `ServerEvent` EFFECT kind)
- Modify: `party/index.ts` (new switch case, `broadcastEffect` signature)
- Test: `tests/chipsTransfer.test.ts`

**Interfaces:**
- Produces: `ClientAction` variant `{ type: "TRANSFER_CHIPS"; from: "hand"|"spread"|"pot"; to: "hand"|"spread"|"pot"; playerId: string; amount: number }`; `ServerEvent` EFFECT `kind` extended to `"deal" | "celebrate" | "chip-bet" | "chip-collect"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsTransfer.test.ts
import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

function makeRoomWithPlayer(chipsInHand: number, chipsInSpread: number) {
  const conn = makeMockConnection("p1");
  const room = new GameRoom(makeMockRoom([conn]));
  room.gameState.chipsEnabled = true;
  room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand, chipsInSpread });
  return { conn, room };
}

describe("TRANSFER_CHIPS happy paths", () => {
  it("hand -> spread moves the amount and broadcasts EFFECT kind:chip-bet", async () => {
    const { conn, room } = makeRoomWithPlayer(1000, 0);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 200 }), conn);

    const player = room.gameState.players[0];
    expect(player.chipsInHand).toBe(800);
    expect(player.chipsInSpread).toBe(200);
    const effects = messagesOf(conn).filter((e): e is { type: "EFFECT"; kind: string } => e.type === "EFFECT");
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("chip-bet");
  });

  it("spread -> pot moves the amount and broadcasts EFFECT kind:chip-collect", async () => {
    const { conn, room } = makeRoomWithPlayer(800, 200);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "spread", to: "pot", playerId: "p1", amount: 200 }), conn);

    expect(room.gameState.players[0].chipsInSpread).toBe(0);
    expect(room.gameState.pot).toBe(200);
    const effects = messagesOf(conn).filter((e): e is { type: "EFFECT"; kind: string } => e.type === "EFFECT");
    expect(effects[0].kind).toBe("chip-collect");
  });

  it("pot -> hand moves the amount and broadcasts EFFECT kind:chip-collect", async () => {
    const { conn, room } = makeRoomWithPlayer(800, 0);
    room.gameState.pot = 200;

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "pot", to: "hand", playerId: "p1", amount: 200 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.pot).toBe(0);
    const effects = messagesOf(conn).filter((e): e is { type: "EFFECT"; kind: string } => e.type === "EFFECT");
    expect(effects[0].kind).toBe("chip-collect");
  });

  it("takes an undo snapshot before mutating, and UNDO_MOVE reverses the transfer", async () => {
    const { conn, room } = makeRoomWithPlayer(1000, 0);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 200 }), conn);
    expect(room.gameState.undoSnapshots).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsTransfer`
Expected: FAIL — `TRANSFER_CHIPS` is not a recognized action, so chip fields never change and no `EFFECT` message is sent.

- [ ] **Step 3: Add the action and EFFECT kind to `src/shared/types.ts`**

```ts
  | { type: "TRANSFER_CHIPS"; from: "hand" | "spread" | "pot"; to: "hand" | "spread" | "pot"; playerId: string; amount: number }
```

(Add alongside `SET_CHIPS_MODE` in the `ClientAction` union.)

```ts
  | { type: "EFFECT"; kind: "deal" | "celebrate" | "chip-bet" | "chip-collect" }
```

(Replace the existing `EFFECT` line in the `ServerEvent` union.)

- [ ] **Step 4: Update `broadcastEffect`'s signature in `party/index.ts`**

```ts
  private broadcastEffect(kind: "deal" | "celebrate" | "chip-bet" | "chip-collect") {
```

- [ ] **Step 5: Add the handler in `party/index.ts`** — insert right after the `SET_CHIPS_MODE` case (before `PING`)

```ts
      case "TRANSFER_CHIPS": {
        const { from, to, playerId, amount } = action;
        if (!this.gameState.chipsEnabled || from === to || !Number.isInteger(amount) || amount <= 0) {
          break;
        }
        if ((from !== "pot" || to !== "pot") && playerId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_CHIP_TRANSFER",
            message: "Cannot move another player's chips",
          } satisfies ServerEvent));
          break;
        }
        const chipPlayer = this.gameState.players.find(p => p.id === playerId);
        if (!chipPlayer) break;
        const sourceAmount = from === "hand" ? chipPlayer.chipsInHand : from === "spread" ? chipPlayer.chipsInSpread : this.gameState.pot;
        if (sourceAmount < amount) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INSUFFICIENT_CHIPS",
            message: "Not enough chips at the source",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        if (from === "hand") chipPlayer.chipsInHand -= amount;
        else if (from === "spread") chipPlayer.chipsInSpread -= amount;
        else this.gameState.pot -= amount;
        if (to === "hand") chipPlayer.chipsInHand += amount;
        else if (to === "spread") chipPlayer.chipsInSpread += amount;
        else this.gameState.pot += amount;
        if (from === "hand" && to === "spread") {
          this.broadcastEffect("chip-bet");
        } else if (to === "pot" || from === "pot") {
          this.broadcastEffect("chip-collect");
        }
        break;
      }
```

(Note: the `(from !== "pot" || to !== "pot")` guard means the ownership check fires unless this is a pure pot↔pot transfer, which can't happen anyway since `from === to` was already rejected above — every real transfer has at least one `hand`/`spread` endpoint, so this is equivalent to "if either endpoint is hand/spread, require ownership," matching the design doc.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- chipsTransfer`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/chipsTransfer.test.ts
git commit -m "feat(chips): add TRANSFER_CHIPS handler with undo and bet/collect sound effects"
```

---

### Task 5: `TRANSFER_CHIPS` validation and authorization

**Files:**
- Test: `tests/chipsTransferValidation.test.ts`
- (No source changes — Task 4's handler already implements all the guarded paths; this task proves them.)

**Interfaces:**
- Consumes: the `TRANSFER_CHIPS` handler from Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsTransferValidation.test.ts
import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

describe("TRANSFER_CHIPS validation", () => {
  it("rejects when chipsEnabled is false (no mutation, no error sent)", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });

  it("rejects from === to", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "hand", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
  });

  it("rejects non-integer and non-positive amounts", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 0 }), conn);
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: -50 }), conn);
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 12.5 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });

  it("rejects insufficient funds at the source with an INSUFFICIENT_CHIPS error", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 50, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(50);
    const errors = messagesOf(conn).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { code: string }).code).toBe("INSUFFICIENT_CHIPS");
  });

  it("rejects a player moving another player's hand/spread chips with UNAUTHORIZED_CHIP_TRANSFER", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    // p2 tries to move p1's hand chips
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn2);

    const p1 = room.gameState.players.find(p => p.id === "p1")!;
    expect(p1.chipsInHand).toBe(1000);
    const errors = messagesOf(conn2).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { code: string }).code).toBe("UNAUTHORIZED_CHIP_TRANSFER");
  });

  it("allows any player to move chips into or out of the ownerless pot for themselves", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.pot = 500;

    // p2 (sender) takes chips into THEIR OWN hand from the shared pot — allowed.
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "pot", to: "hand", playerId: "p2", amount: 200 }), conn2);

    expect(room.gameState.pot).toBe(300);
    expect(room.gameState.players.find(p => p.id === "p2")!.chipsInHand).toBe(1200);
  });
});
```

- [ ] **Step 2: Run test to verify it passes against Task 4's implementation**

Run: `npm test -- chipsTransferValidation`
Expected: PASS (6 tests). Task 4's single `TRANSFER_CHIPS` case already implements every guard exercised here (`chipsEnabled` check, `from === to`, integer/positive `amount`, sufficient funds, ownership). This task has no implementation step of its own — it exists to lock that contract down in its own reviewable test file, separate from the happy-path tests in Task 4, so a future change to the guard logic fails a clearly-named test. If any assertion fails, that's a real bug in Task 4's implementation: fix the guard in `party/index.ts`'s `TRANSFER_CHIPS` case to match, then re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/chipsTransferValidation.test.ts
git commit -m "test(chips): cover TRANSFER_CHIPS validation and authorization guards"
```

---

### Task 6: Chip sounds in `sound.ts` and `usePartySocket.ts`

**Files:**
- Modify: `src/lib/sound.ts`
- Modify: `src/hooks/usePartySocket.ts`
- Test: `tests/sound.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `ServerEvent` EFFECT kind `"chip-bet" | "chip-collect"` (Task 4).
- Produces: `SoundName` extended to include `"chip-bet" | "chip-collect"`.

- [ ] **Step 1: Write the failing test** — append to `tests/sound.test.ts` (it already imports `playSound`, `__resetSoundForTests`, the `MockAudio` class, and stubs `localStorage`/`Audio` in `beforeEach`/`afterEach`; just add a new `describe` block at the end of the file)

```ts
describe("chip sounds", () => {
  it("playSound('chip-bet') resolves to chip-bet.mp3", () => {
    setMuted(false);
    playSound("chip-bet");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(/sounds\/chip-bet\.mp3$/);
  });

  it("playSound('chip-collect') resolves to chip-collect.mp3", () => {
    setMuted(false);
    playSound("chip-collect");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(/sounds\/chip-collect\.mp3$/);
  });

  it("preloadSounds loads chip-bet.mp3 and chip-collect.mp3", () => {
    preloadSounds();
    const srcs = MockAudio.instances.map(a => a.src);
    expect(srcs.some(s => s.endsWith("chip-bet.mp3"))).toBe(true);
    expect(srcs.some(s => s.endsWith("chip-collect.mp3"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sound`
Expected: FAIL — TypeScript/runtime error, `"chip-bet"` is not assignable to `SoundName`, and `resolveFile` has no entry for it so the resolved filename is wrong (or the call throws).

- [ ] **Step 3: Update `src/lib/sound.ts`**

```ts
export type SoundName = "shuffle" | "deal" | "celebrate" | "chip-bet" | "chip-collect";
```

```ts
const VARIANT_COUNTS: Record<SoundName, number> = {
  shuffle: 1,
  deal: 1,
  celebrate: CELEBRATE_VARIANT_COUNT,
  "chip-bet": 1,
  "chip-collect": 1,
};
```

```ts
export function preloadSounds(): void {
  if (typeof Audio === "undefined") return;
  const files = ["shuffle.mp3", "deal.mp3", "chip-bet.mp3", "chip-collect.mp3"];
  for (let i = 1; i <= CELEBRATE_VARIANT_COUNT; i++) files.push(`celebrate${i}.mp3`);
  for (const file of files) {
    getAudio(file)?.load();
  }
}
```

- [ ] **Step 4: Update the EFFECT handler in `src/hooks/usePartySocket.ts`**

```ts
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        } else if (event.kind === 'chip-bet') {
          playSound('chip-bet');
        } else if (event.kind === 'chip-collect') {
          playSound('chip-collect');
        }
      } else if (event.type === 'LAST_MOVE') {
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- sound`
Expected: PASS

- [ ] **Step 6: Run the full unit suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: All PASS — this is a natural checkpoint since Tasks 1–6 complete the entire server + sound layer.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sound.ts src/hooks/usePartySocket.ts tests/sound.test.ts
git commit -m "feat(chips): add chip-bet/chip-collect sounds and wire EFFECT dispatch"
```

---

### Task 7: `ChipBadge` and `ChipStack` presentational components

**Files:**
- Create: `src/components/ChipBadge.tsx`
- Create: `src/components/ChipStack.tsx`
- Test: `tests/chipVisuals.test.ts`

**Interfaces:**
- Produces: `ChipBadge({ amount, className? })` — small dot + number badge, for hand/spread. `ChipStack({ amount, className? })` — capped 3-disc stack + number, for the pot.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipVisuals.test.ts
import { describe, it, expect } from "vitest";
import ChipBadgeSrc from "../src/components/ChipBadge.tsx?raw";
import ChipStackSrc from "../src/components/ChipStack.tsx?raw";

describe("ChipBadge", () => {
  it("renders the amount inside a Badge with a primary-colored dot", () => {
    expect(ChipBadgeSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(ChipBadgeSrc).toMatch(/bg-primary/);
    expect(ChipBadgeSrc).toMatch(/\{amount\}/);
  });
});

describe("ChipStack", () => {
  it("renders exactly 3 discs regardless of amount, using only existing theme utility classes", () => {
    const discMatches = [...ChipStackSrc.matchAll(/rounded-full/g)];
    expect(discMatches.length).toBe(3);
    expect(ChipStackSrc).toMatch(/bg-primary/);
    expect(ChipStackSrc).toMatch(/bg-muted/);
    expect(ChipStackSrc).toMatch(/bg-secondary/);
    expect(ChipStackSrc).not.toMatch(/amount\s*>\s*\d+.*rounded-full/); // height must not scale with amount
    expect(ChipStackSrc).toMatch(/\{amount\}/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipVisuals`
Expected: FAIL — `Failed to resolve import "../src/components/ChipBadge.tsx?raw"` (files don't exist yet).

- [ ] **Step 3: Create `src/components/ChipBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipBadgeProps {
  amount: number;
  className?: string;
}

export function ChipBadge({ amount, className }: ChipBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 font-mono', className)} data-testid="chip-badge">
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary border border-primary-foreground/40" aria-hidden />
      {amount}
    </Badge>
  );
}
```

- [ ] **Step 4: Create `src/components/ChipStack.tsx`**

```tsx
import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  className?: string;
}

const DISC_COLOR_CLASSES = ['bg-secondary', 'bg-primary', 'bg-muted'];

export function ChipStack({ amount, className }: ChipStackProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)} data-testid="chip-stack">
      <div className="flex flex-col-reverse items-center">
        {DISC_COLOR_CLASSES.map((colorClass, i) => (
          <div
            key={i}
            className={cn('w-[22px] h-[22px] rounded-full border-2 border-card', colorClass, i > 0 && '-mt-[13px]')}
          />
        ))}
      </div>
      <span className="text-xs font-semibold font-mono">{amount}</span>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- chipVisuals`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ChipBadge.tsx src/components/ChipStack.tsx tests/chipVisuals.test.ts
git commit -m "feat(chips): add ChipBadge and ChipStack presentational components"
```

---

### Task 8: Chip badge + Bet quick action in `HandZone`

**Files:**
- Modify: `src/components/HandZone.tsx`
- Modify: `src/components/BoardView.tsx` (pass new props)
- Test: `tests/chipsHandZone.test.ts`

**Interfaces:**
- Consumes: `ChipBadge` (Task 7), `ClientAction` `TRANSFER_CHIPS` (Task 4).
- Produces: `HandZoneProps` gains `chipsEnabled: boolean`, `chipsInHand: number`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsHandZone.test.ts
import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";

describe("HandZone chip support", () => {
  it("imports ChipBadge", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(HandZoneSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge only when chipsEnabled is true", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled\s*&&[\s\S]{0,400}<ChipBadge/);
  });

  it("dispatches TRANSFER_CHIPS from hand to spread on the Bet action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("dispatches TRANSFER_CHIPS from hand to pot on the To pot action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsHandZone`
Expected: FAIL — none of these patterns exist in `HandZone.tsx` yet.

- [ ] **Step 3: Modify `src/components/HandZone.tsx`**

Add the import:

```ts
import { ChipBadge } from './ChipBadge';
```

Extend `HandZoneProps` and the destructured props in the function signature:

```ts
interface HandZoneProps {
  cards: Card[];
  playerId: string;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource: SelectionSource;
  isRevealed: boolean;
  onToggleReveal: () => void;
  highlightedMove?: LastMoveHighlight | null;
  cursorCardId?: string;
  shortcutKey?: string;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  onCursorChange?: (index: number) => void;
  chipsEnabled: boolean;
  chipsInHand: number;
}
```

```ts
export function HandZone({ cards, playerId, displayName, connected, sendAction, draggingCardId, selectedIds, onToggleSelect, selectionSource, isRevealed, onToggleReveal, highlightedMove, cursorCardId, shortcutKey, sortMode, setSortMode, onCursorChange, chipsEnabled, chipsInHand }: HandZoneProps) {
```

Add local bet-amount state near the top of the function body (after the existing `sentinelId`/`setNodeRef` block):

```ts
  const [betAmount, setBetAmount] = useState(10);

  function handleBet() {
    if (betAmount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'hand', to: 'spread', playerId, amount: betAmount });
  }

  function handleHandToPot() {
    if (betAmount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'hand', to: 'pot', playerId, amount: betAmount });
  }
```

Add the `useState` import at the top of the file:

```ts
import { useState } from 'react';
```

Render the chip row right after the existing name/controls header `<div>` (the one ending `</div>` after the sort button `<span className="flex gap-1 zone-controls">...</span>`), before the card-rendering `<div ref={setNodeRef} ...>`:

```tsx
      {chipsEnabled && (
        <div className="flex items-center gap-2 px-4 mb-1">
          <ChipBadge amount={chipsInHand} />
          <Input
            type="number"
            min={1}
            value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20 h-7"
          />
          <Button variant="outline" size="sm" onClick={handleBet}>Bet {betAmount}</Button>
          <Button variant="ghost" size="sm" onClick={handleHandToPot}>To pot</Button>
        </div>
      )}
```

Add the `Input` import:

```ts
import { Input } from '@/components/ui/input';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipsHandZone`
Expected: PASS

- [ ] **Step 5: Wire the new props through `src/components/BoardView.tsx`**

In `BoardView`, add (after the existing `mySpreadZone`/`allOpponentIds` declarations near the top of the function body):

```ts
  const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
```

Update the `HandZone` JSX (inside the existing trailing IIFE block) to use `myPlayer` instead of the locally-declared one, and pass the two new props:

```tsx
        {(() => {
          return (
            <HandZone
              cards={gameState.myHand}
              playerId={gameState.myPlayerId}
              displayName={myPlayer?.displayName ?? ''}
              connected={myPlayer?.connected ?? true}
              sendAction={sendAction}
              draggingCardId={draggingCardId}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              selectionSource={selectionSource}
              isRevealed={gameState.myHandRevealed}
              onToggleReveal={() => sendAction({ type: 'SET_HAND_REVEALED', revealed: !gameState.myHandRevealed })}
              highlightedMove={highlightedMove}
              cursorCardId={cursorCardId ?? undefined}
              shortcutKey={altHeld ? zoneLetterMap.get('hand') : undefined}
              sortMode={sortMode}
              setSortMode={setSortMode}
              onCursorChange={(index) => setCursorPos({ zoneId: 'hand', index })}
              chipsEnabled={gameState.chipsEnabled}
              chipsInHand={myPlayer?.chipsInHand ?? 0}
            />
          );
        })()}
```

Remove the now-redundant `const myPlayer = gameState.players.find(...)` line that was previously declared *inside* that IIFE (it's now declared once, higher up, and reused by Task 9/10/11 below).

- [ ] **Step 6: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS (BoardView's other usages of `gameState.players.find` for opponents are untouched; only the inner IIFE's local `myPlayer` declaration was hoisted).

- [ ] **Step 7: Commit**

```bash
git add src/components/HandZone.tsx src/components/BoardView.tsx tests/chipsHandZone.test.ts
git commit -m "feat(chips): add chip badge and Bet quick action to HandZone"
```

---

### Task 9: Read-only chip badge in `OpponentHand`

**Files:**
- Modify: `src/components/OpponentHand.tsx`
- Modify: `src/components/BoardView.tsx`
- Test: `tests/chipsOpponentHand.test.ts`

**Interfaces:**
- Consumes: `ChipBadge` (Task 7).
- Produces: `OpponentHandProps` gains `chipsEnabled: boolean`, `chipsInHand: number`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsOpponentHand.test.ts
import { describe, it, expect } from "vitest";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";

describe("OpponentHand chip support", () => {
  it("imports ChipBadge", () => {
    expect(OpponentHandSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(OpponentHandSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(OpponentHandSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge only when chipsEnabled is true, with no chip-transfer controls", () => {
    expect(OpponentHandSrc).toMatch(/chipsEnabled\s*&&[\s\S]{0,200}<ChipBadge/);
    expect(OpponentHandSrc).not.toMatch(/TRANSFER_CHIPS/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsOpponentHand`
Expected: FAIL

- [ ] **Step 3: Modify `src/components/OpponentHand.tsx`**

Add the import:

```ts
import { ChipBadge } from './ChipBadge';
```

Extend props:

```ts
interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  revealedCards?: Card[];
  highlightedMove?: LastMoveHighlight | null;
  shortcutKey?: string;
  chipsEnabled: boolean;
  chipsInHand: number;
}
```

```ts
export function OpponentHand({ playerId, cardCount, displayName, connected, sendAction: _sendAction, revealedCards, highlightedMove, shortcutKey, chipsEnabled, chipsInHand }: OpponentHandProps) {
```

Render the badge in the name row, right after the existing `<span className="text-sm text-muted-foreground">...</span>` block, still inside the `<div className="flex items-center gap-2 px-1 mb-1">`:

```tsx
        {chipsEnabled && <ChipBadge amount={chipsInHand} />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipsOpponentHand`
Expected: PASS

- [ ] **Step 5: Wire props through `BoardView.tsx`** — in the `allOpponentIds.map` block that renders `<OpponentHand .../>`, look up the player and pass the new props:

```tsx
          {allOpponentIds.map((id) => {
            const player = gameState.players.find(p => p.id === id);
            const revealedCards = gameState.opponentRevealedHands[id];
            const cardCount = gameState.opponentHandCounts[id] ?? (revealedCards?.length ?? 0);
            return (
              <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none`}>
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
                />
              </div>
            );
          })}
```

- [ ] **Step 6: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/OpponentHand.tsx src/components/BoardView.tsx tests/chipsOpponentHand.test.ts
git commit -m "feat(chips): show read-only chip badge in OpponentHand"
```

---

### Task 10: Chip badge + Move-to-pot quick action in `SpreadZone`

**Files:**
- Modify: `src/components/SpreadZone.tsx`
- Modify: `src/components/BoardView.tsx`
- Test: `tests/chipsSpreadZone.test.ts`

**Interfaces:**
- Consumes: `ChipBadge` (Task 7).
- Produces: `SpreadZoneProps` gains `chipsEnabled?: boolean`, `chipsInSpread?: number`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsSpreadZone.test.ts
import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone chip support", () => {
  it("imports ChipBadge", () => {
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInSpread props", () => {
    expect(SpreadZoneSrc).toMatch(/chipsEnabled\?:\s*boolean/);
    expect(SpreadZoneSrc).toMatch(/chipsInSpread\?:\s*number/);
  });

  it("renders chip controls only when interactive (owner only)", () => {
    expect(SpreadZoneSrc).toMatch(/interactive\s*(!==\s*false|===\s*true)[\s\S]{0,400}<ChipBadge/);
  });

  it("dispatches TRANSFER_CHIPS from spread to pot on the Move to pot action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("dispatches TRANSFER_CHIPS from spread to hand on the To hand action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsSpreadZone`
Expected: FAIL

- [ ] **Step 3: Modify `src/components/SpreadZone.tsx`**

Add the import:

```ts
import { useState } from 'react';
import { ChipBadge } from './ChipBadge';
import { Input } from '@/components/ui/input';
```

Extend `SpreadZoneProps`:

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
  cursorCardId?: string;
  shortcutKey?: string;
  onCursorChange?: (index: number) => void;
  chipsEnabled?: boolean;
  chipsInSpread?: number;
}
```

```ts
export function SpreadZone({ pile, sendAction, draggingCardId, className, interactive, selectedIds, onToggleSelect, onSelectAll, selectionSource, highlightedMove, cursorCardId, shortcutKey, onCursorChange, chipsEnabled, chipsInSpread = 0 }: SpreadZoneProps) {
```

Add local state and handlers (near the top of the function body, after the existing `faceUpCards`/`sentinelId` declarations):

```ts
  const [toHandAmount, setToHandAmount] = useState(10);

  function handleMoveToPot() {
    if (chipsInSpread > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipsInSpread });
    }
  }

  function handleToHand() {
    if (toHandAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'hand', playerId: pile.ownerId, amount: toHandAmount });
    }
  }
```

Render the chip row at the top of the outer `<div className="flex flex-col gap-1 zone-hover">`, before the existing `{selectedIds !== undefined && ...}` block:

```tsx
      {chipsEnabled && interactive !== false && (
        <div className="flex items-center gap-2">
          <ChipBadge amount={chipsInSpread} />
          <Button variant="outline" size="sm" onClick={handleMoveToPot} disabled={chipsInSpread === 0}>Move to pot</Button>
          <Input
            type="number"
            min={1}
            value={toHandAmount}
            onChange={e => setToHandAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20 h-7"
          />
          <Button variant="ghost" size="sm" onClick={handleToHand}>To hand</Button>
        </div>
      )}
      {chipsEnabled && interactive === false && (
        <ChipBadge amount={chipsInSpread} />
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipsSpreadZone`
Expected: PASS

- [ ] **Step 5: Wire props through `BoardView.tsx`**

For the opponent spread loop:

```tsx
            {allOpponentIds.map((id) => {
              const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
              const opponentPlayer = gameState.players.find(p => p.id === id);
              return (
                <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}>
                  {opponentSpread && (
                    <SpreadZone
                      pile={opponentSpread}
                      sendAction={sendAction}
                      draggingCardId={draggingCardId}
                      interactive={false}
                      highlightedMove={highlightedMove}
                      cursorCardId={cursorCardId ?? undefined}
                      shortcutKey={altHeld ? zoneLetterMap.get(`pile-${opponentSpread.id}`) : undefined}
                      chipsEnabled={gameState.chipsEnabled}
                      chipsInSpread={opponentPlayer?.chipsInSpread ?? 0}
                    />
                  )}
                </div>
              );
            })}
```

For the own spread zone:

```tsx
        {mySpreadZone && (
          <div className="flex-shrink-0 px-4 py-1">
            <SpreadZone
              pile={mySpreadZone}
              sendAction={sendAction}
              draggingCardId={draggingCardId}
              interactive={true}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              selectionSource={selectionSource}
              highlightedMove={highlightedMove}
              cursorCardId={cursorCardId ?? undefined}
              shortcutKey={altHeld ? zoneLetterMap.get(`pile-${mySpreadZone.id}`) : undefined}
              onCursorChange={(index) => setCursorPos({ zoneId: `pile-${mySpreadZone.id}`, index })}
              chipsEnabled={gameState.chipsEnabled}
              chipsInSpread={myPlayer?.chipsInSpread ?? 0}
            />
          </div>
        )}
```

(`myPlayer` is the hoisted declaration from Task 8, Step 5.)

- [ ] **Step 6: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/SpreadZone.tsx src/components/BoardView.tsx tests/chipsSpreadZone.test.ts
git commit -m "feat(chips): add chip badge and Move-to-pot quick action to SpreadZone"
```

---

### Task 11: `PotZone` in the rail

**Files:**
- Create: `src/components/PotZone.tsx`
- Modify: `src/components/BoardView.tsx`
- Test: `tests/chipsPotZone.test.ts`

**Interfaces:**
- Consumes: `ChipStack` (Task 7).
- Produces: `PotZone({ pot, myPlayerId, sendAction })`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsPotZone.test.ts
import { describe, it, expect } from "vitest";
import PotZoneSrc from "../src/components/PotZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("PotZone", () => {
  it("imports ChipStack", () => {
    expect(PotZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
  });

  it("dispatches TRANSFER_CHIPS from pot to hand on the Take all action", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("offers a secondary control to move pot chips to the player's own spread", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });
});

describe("BoardView renders PotZone in the rail when chips are enabled", () => {
  it("imports PotZone", () => {
    expect(BoardViewSrc).toMatch(/import\s*\{\s*PotZone\s*\}\s*from\s*['"]\.\/PotZone['"]/);
  });

  it("guards PotZone with gameState.chipsEnabled", () => {
    expect(BoardViewSrc).toMatch(/gameState\.chipsEnabled\s*&&[\s\S]{0,300}<PotZone/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsPotZone`
Expected: FAIL — `PotZone.tsx` doesn't exist; `BoardView.tsx` doesn't import or render it.

- [ ] **Step 3: Create `src/components/PotZone.tsx`**

```tsx
import { useState } from 'react';
import type { ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChipStack } from './ChipStack';

interface PotZoneProps {
  pot: number;
  myPlayerId: string;
  sendAction: (action: ClientAction) => void;
}

export function PotZone({ pot, myPlayerId, sendAction }: PotZoneProps) {
  const [amount, setAmount] = useState(10);

  function handleTakeAll() {
    if (pot > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount: pot });
  }

  function handleToHand() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount });
  }

  function handleToSpread() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'spread', playerId: myPlayerId, amount });
  }

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-2" data-testid="pot-zone">
      <span className="zone-label hidden sm:inline">Pot</span>
      <ChipStack amount={pot} />
      <Button variant="outline" size="sm" onClick={handleTakeAll} disabled={pot === 0}>Take all</Button>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={e => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-16 h-7"
        />
        <Button variant="ghost" size="sm" onClick={handleToHand}>Hand</Button>
        <Button variant="ghost" size="sm" onClick={handleToSpread}>Bet</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render it in `src/components/BoardView.tsx`**

Add the import:

```ts
import { PotZone } from './PotZone';
```

In the rail `<div>` (the one with `bg-card` housing `pilePiles.map(...)`), render `PotZone` after the pile loop:

```tsx
          <div className="flex-shrink-0 self-stretch flex flex-col justify-center gap-2 py-2 px-2 bg-card">
            {pilePiles.map((pile) => (
              <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onSelectAll={onSelectAll} onToggleSelect={onToggleSelect} selectedIds={selectedIds} highlightedMove={highlightedMove} cursorCardId={cursorCardId ?? undefined} shortcutKey={altHeld ? zoneLetterMap.get(`pile-${pile.id}`) : undefined} onCursorChange={() => setCursorPos({ zoneId: `pile-${pile.id}`, index: 0 })} />
            ))}
            {gameState.chipsEnabled && (
              <PotZone pot={gameState.pot} myPlayerId={gameState.myPlayerId} sendAction={sendAction} />
            )}
          </div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- chipsPotZone`
Expected: PASS

- [ ] **Step 6: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/PotZone.tsx src/components/BoardView.tsx tests/chipsPotZone.test.ts
git commit -m "feat(chips): add PotZone to the rail with Take-all and manual transfer controls"
```

---

### Task 12: Hamburger menu toggle for chips mode

**Files:**
- Modify: `src/components/ControlsBar.tsx`
- Test: `tests/chipsControlsBar.test.ts`

**Interfaces:**
- Consumes: `ClientAction` `SET_CHIPS_MODE` (Task 3); `ClientGameState.chipsEnabled`/`startingChips` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
// tests/chipsControlsBar.test.ts
import { describe, it, expect } from "vitest";
import ControlsBarSrc from "../src/components/ControlsBar.tsx?raw";

describe("ControlsBar chips toggle", () => {
  it("dispatches SET_CHIPS_MODE to flip chipsEnabled", () => {
    expect(ControlsBarSrc).toMatch(/type:\s*['"]SET_CHIPS_MODE['"][\s\S]{0,200}enabled:/);
  });

  it("includes a starting-amount number input bound to local state", () => {
    expect(ControlsBarSrc).toMatch(/startingChipsInput/);
    expect(ControlsBarSrc).toMatch(/type="number"[\s\S]{0,200}startingChipsInput/);
  });

  it("labels the toggle Poker Chips", () => {
    expect(ControlsBarSrc).toMatch(/Poker Chips/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsControlsBar`
Expected: FAIL

- [ ] **Step 3: Modify `src/components/ControlsBar.tsx`**

Add local state near the other `useState` calls at the top of the component body:

```ts
  const [startingChipsInput, setStartingChipsInput] = useState(String(gameState.startingChips));
```

Add handlers (near `handleToggleMute`):

```ts
  function handleToggleChips() {
    const parsed = parseInt(startingChipsInput, 10);
    const startingChips = Number.isFinite(parsed) && parsed >= 0 ? parsed : gameState.startingChips;
    sendAction({ type: 'SET_CHIPS_MODE', enabled: !gameState.chipsEnabled, startingChips });
  }

  function handleStartingChipsBlur() {
    const parsed = parseInt(startingChipsInput, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      sendAction({ type: 'SET_CHIPS_MODE', enabled: gameState.chipsEnabled, startingChips: parsed });
    }
  }
```

Render the section after the Sound toggle's `<Separator />` and before the Deal section's `<Separator />` — i.e. insert a new block:

```tsx
          <Separator />

          {/* Poker chips */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleToggleChips}
              aria-pressed={gameState.chipsEnabled}
              aria-label={gameState.chipsEnabled ? 'Disable poker chips' : 'Enable poker chips'}
            >
              Poker Chips {gameState.chipsEnabled ? 'on' : 'off'}
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground flex-1">Starting amount</label>
              <Input
                type="number"
                min={0}
                value={startingChipsInput}
                onChange={e => setStartingChipsInput(e.target.value)}
                onBlur={handleStartingChipsBlur}
                className="w-24"
              />
            </div>
          </div>
```

(This goes between the existing "Sound toggle" block's closing `</Button>` + the `<Separator />` that follows it, and the "Deal section" block — i.e. it becomes the second `<Separator />`-delimited section.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipsControlsBar`
Expected: PASS

- [ ] **Step 5: Run typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS — this completes all unit-tested layers of the feature.

- [ ] **Step 6: Commit**

```bash
git add src/components/ControlsBar.tsx tests/chipsControlsBar.test.ts
git commit -m "feat(chips): add Poker Chips toggle and starting-amount control to the menu"
```

---

### Task 13: End-to-end coverage

**Files:**
- Create: `playwright/chips.spec.ts`

**Interfaces:**
- Consumes: the `twoPlayerRoom` fixture from `playwright/fixtures.ts` (same pattern as `playwright/game.spec.ts`).

- [ ] **Step 1: Write the e2e test**

```ts
// playwright/chips.spec.ts
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function enableChips(page: Page, startingAmount = 1000) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /enable poker chips/i }).click();
  await page.keyboard.press('Escape');
  return startingAmount;
}

test.describe('poker chips', () => {
  test('enabling chips from the menu shows the starting amount on both hands and a zero pot', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    await expect(p1.getByTestId('chip-badge').first()).toContainText('1000');
    await expect(p2.getByTestId('chip-badge').first()).toContainText('1000');
    await expect(p1.getByTestId('pot-zone')).toContainText('0');
  });

  test('bet quick action moves chips from hand to the betting player\'s own spread only', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    await p1.getByRole('button', { name: /^bet/i }).click();

    // P1's own spread chip badge increases; P2's hand/spread totals are unaffected.
    const p1Badges = p1.getByTestId('chip-badge');
    await expect(p1Badges.nth(1)).toContainText('10'); // spread badge reflects the default bet amount
    await expect(p2.getByTestId('chip-badge').first()).toContainText('1000'); // P2's hand untouched
  });

  test('move-to-pot and take-all round-trip chips through the shared pot', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);
    await p1.getByRole('button', { name: /^bet/i }).click();
    await p1.getByRole('button', { name: /move to pot/i }).click();

    await expect(p1.getByTestId('pot-zone')).toContainText('10');

    await p1.getByRole('button', { name: /take all/i }).click();

    await expect(p1.getByTestId('pot-zone')).toContainText('0');
    // P2 sees the same pot state in real time
    await expect(p2.getByTestId('pot-zone')).toContainText('0');
  });

  test('a player cannot move another player\'s hand or spread chips', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    // P2 has no chip-transfer controls rendered for P1's hand/spread — only a read-only badge.
    const p2ViewOfOpponent = p2.getByTestId('opponent-hand');
    await expect(p2ViewOfOpponent.getByRole('button', { name: /^bet/i })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run dev` (terminal 1), `npm run dev:client` (terminal 2), then `npm run test:e2e -- chips` (terminal 3)
Expected: All 4 tests PASS. If a selector doesn't match (e.g. button accessible names differ slightly from what was assumed), adjust the selector in the spec to match the actual rendered text/aria-label from Tasks 8–12 — do not change production code to fit the test unless the test reveals a genuine UX problem.

- [ ] **Step 3: Run the full test suite one final time**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: All PASS — this is the final verification gate before considering the feature complete.

- [ ] **Step 4: Commit**

```bash
git add playwright/chips.spec.ts
git commit -m "test(chips): add e2e coverage for enabling chips, betting, and pot transfers"
```

---

## Post-plan note

The chip sound files (`public/sounds/chip-bet.mp3`, `public/sounds/chip-collect.mp3`) are not part of this plan — they're a prerequisite the user supplies (see Global Constraints). Without them, the feature works fully; `playSound()` just fails silently on the missing file. Drop the two files in once sourced and sound works with no further code changes.
