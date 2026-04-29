# Phase 12: Test Mock Fix - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 2 (both new)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/helpers.ts` | utility | — | `tests/dealCards.test.ts` (inline helpers, lines 6–33) | exact — extracts the verbatim duplicated functions |
| `tests/broadcastMasking.test.ts` | test | event-driven | `tests/dealCards.test.ts` lines 146–171 + `tests/viewFor.test.ts` | exact — same broadcast + message inspection + masking assertion pattern |

---

## Pattern Assignments

### `tests/helpers.ts` (utility — shared test helper module)

**Analog:** `tests/dealCards.test.ts` (inline helpers block, lines 6–33) and identical copies in `tests/passCard.test.ts` lines 6–33, `tests/shufflePile.test.ts` lines 6–29.

**Imports pattern** (`tests/dealCards.test.ts` lines 1–4):
```typescript
import { vi } from "vitest";
import type * as Party from "partykit/server";
import type { Card } from "../src/shared/types";
```

**makeCard factory pattern** (`tests/dealCards.test.ts` lines 6–8 / `tests/passCard.test.ts` lines 6–8):
```typescript
function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
}
```
Note: `passCard.test.ts` already accepts a `faceUp` parameter; `dealCards.test.ts` does not. The shared helper should use the `passCard` variant (with `faceUp = false` default) as it is strictly more capable.

**makeMockRoom pattern** (`tests/dealCards.test.ts` lines 10–22):
```typescript
function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}
```
The shared version changes the first argument to `connections` (an explicit live array) so callers can populate it before `onMessage` is called. The `overrides` parameter remains as the second argument for backward compatibility. Existing test files that call `makeMockRoom()` or `makeMockRoom({...})` must NOT be touched in this phase.

New signature to use:
```typescript
export function makeMockRoom(
  connections: Array<Party.Connection & { send: ReturnType<typeof vi.fn> }> = [],
  overrides: Partial<Party.Room> = {}
): Party.Room
```

**makeMockConnection pattern** (`tests/dealCards.test.ts` lines 24–33):
```typescript
function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}
```
Copy verbatim; add `export`. The `state: { playerToken: id }` assignment is load-bearing — `getPlayerToken(conn)` reads `conn.state?.playerToken ?? conn.id`, so this ensures the connection's identity matches the `hands` key.

---

### `tests/broadcastMasking.test.ts` (test — event-driven, per-connection masking)

**Analog 1 (broadcast setup + message inspection):** `tests/dealCards.test.ts` lines 146–171
**Analog 2 (viewFor masking assertions):** `tests/viewFor.test.ts` lines 31–55

**Imports pattern** (`tests/dealCards.test.ts` lines 1–4):
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import type { ClientGameState, ServerEvent } from "../src/shared/types";
```
In `broadcastMasking.test.ts` replace the inline helpers import with the shared module:
```typescript
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
```
No `vi` import needed — `vi.fn()` is only called inside helpers.

**Core broadcast setup pattern** (`tests/dealCards.test.ts` lines 147–159):
```typescript
const conn1 = makeMockConnection("conn-1");
const conn2 = makeMockConnection("conn-2");
const connections = [conn1, conn2];
const roomWithConns = makeMockRoom({
  getConnections: (() => connections[Symbol.iterator]()) as unknown as Party.Room["getConnections"],
});
const roomWithConnections = new GameRoom(roomWithConns);
roomWithConnections.gameState.players.push({ id: "conn-1", connected: true, displayName: "" });
roomWithConnections.gameState.players.push({ id: "conn-2", connected: true, displayName: "" });
roomWithConnections.gameState.hands["conn-1"] = [];
roomWithConnections.gameState.hands["conn-2"] = [];
```
In `broadcastMasking.test.ts` use the new `makeMockRoom(connections)` signature instead of the override escape hatch:
```typescript
const localConn = makeMockConnection("player-1");
const remoteConn = makeMockConnection("player-2");
const connections = [localConn, remoteConn];
const mockRoom = makeMockRoom(connections);
const room = new GameRoom(mockRoom);
```

**Message inspection pattern** (`tests/dealCards.test.ts` lines 161–165):
```typescript
const conn1Messages = conn1.send.mock.calls.map(
  (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
);
const shuffleEvents1 = conn1Messages.filter(e => e.type === "PILE_SHUFFLED");
expect(shuffleEvents1).toHaveLength(1);
```
Adapt for STATE_UPDATE:
```typescript
const localMessages = localConn.send.mock.calls.map(
  (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
);
const localUpdate = localMessages.find(e => e.type === "STATE_UPDATE") as
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | undefined;
expect(localUpdate).toBeDefined();
```

**viewFor masking assertion pattern** (`tests/viewFor.test.ts` lines 32–44):
```typescript
// Local player sees their own cards
const view = viewFor(state, "player-1");
expect(view.myHand).toHaveLength(2);
expect(view.myHand.map(c => c.id)).toEqual(["A-s", "K-s"]);

// Remote player gets counts, not cards
expect(view.opponentHandCounts["player-2"]).toBe(3);
expect("hands" in view).toBe(false);
```
Adapt to assert through the broadcast path rather than calling `viewFor` directly:
```typescript
// local player's view includes myPlayerId = their own token
expect(localUpdate!.state.myPlayerId).toBe("player-1");

// remote player's view has their own empty hand and sees opponent counts
expect(remoteUpdate!.state.myPlayerId).toBe("player-2");
expect(remoteUpdate!.state.myHand).toHaveLength(0);
expect(remoteUpdate!.state.opponentHandCounts["player-1"]).toBeDefined();
```

**Trigger action to reach broadcastState:** Use `MOVE_CARD` from a pile-to-pile move (not from player-1's hand), so player-1's hand stays populated when player-2's masked view is inspected. See RESEARCH.md Open Question 2. Alternatively, move a card from player-1's hand to discard — the post-move state is still valid for asserting `myPlayerId` and `opponentHandCounts`.

---

## Shared Patterns

### Mock Room Construction
**Source:** `tests/dealCards.test.ts` lines 10–22 (and 11 identical copies across test files)
**Apply to:** `tests/helpers.ts` (extraction target)
```typescript
const storage = {
  get: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
};
return {
  id: "test-room",
  storage,
  getConnections: () => connections[Symbol.iterator](),
  ...overrides,
} as unknown as Party.Room;
```
Critical: `getConnections` MUST be a thunk (`() => connections[Symbol.iterator]()`) not a stored iterator. A stored iterator is exhausted after the first spread — the thunk produces a fresh iterator from the live array on each call.

### Connection Identity
**Source:** All test files, e.g. `tests/dealCards.test.ts` lines 24–33
**Apply to:** `tests/helpers.ts`, `tests/broadcastMasking.test.ts`
```typescript
state: { playerToken: id },
```
`getPlayerToken(conn)` in `party/index.ts` reads `conn.state?.playerToken ?? conn.id`. Setting `state: { playerToken: id }` ensures the connection's identity matches the `hands` dictionary key. If this is omitted, `getPlayerToken` falls back to `conn.id` — which also works — but explicit `state.playerToken` matches production behavior exactly.

### Message Parsing
**Source:** `tests/dealCards.test.ts` lines 161–162, `tests/shufflePile.test.ts` lines 85–86
**Apply to:** `tests/broadcastMasking.test.ts`
```typescript
conn.send.mock.calls.map(
  (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
)
```
Always cast `c` as `unknown[]` then `c[0] as string` — this is the established pattern across the test suite.

### beforeEach State Setup
**Source:** `tests/dealCards.test.ts` lines 40–48
**Apply to:** `tests/broadcastMasking.test.ts`
```typescript
beforeEach(() => {
  mockRoom = makeMockRoom();
  room = new GameRoom(mockRoom);
  sender = makeMockConnection("player-1");
  room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
  room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
  room.gameState.hands["player-1"] = [];
  room.gameState.hands["player-2"] = [];
});
```
The broadcast masking tests may opt for inline setup (no `beforeEach`) since each test needs a different connection array — this is acceptable per the pattern in the RESEARCH.md sketch.

---

## No Analog Found

None. Both new files have direct analogs in the existing test suite.

---

## Metadata

**Analog search scope:** `tests/` directory (14 files total)
**Files scanned:** 4 (dealCards.test.ts, shufflePile.test.ts, viewFor.test.ts, passCard.test.ts)
**Key insight:** The working broadcast pattern already exists in `dealCards.test.ts` lines 146–171 and `shufflePile.test.ts` lines 72–95. `helpers.ts` is a straight extraction; `broadcastMasking.test.ts` composes those two proven patterns (broadcast setup + viewFor assertion) for the first time through the real `broadcastState` path.
**Pattern extraction date:** 2026-04-20
