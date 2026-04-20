# Phase 12: Test Mock Fix - Research

**Researched:** 2026-04-20
**Domain:** Vitest unit testing, PartyKit Room mock, viewFor masking assertion
**Confidence:** HIGH

## Summary

The existing test suite (112 tests, all passing) has a structural gap: every test file defines `makeMockRoom` with a local `connections: Party.Connection[] = []` that is never populated, so `getConnections()` always returns an empty iterator. `broadcastState()` and `broadcastShuffleEvent()` iterate over `getConnections()` at call time — when the array is empty, no `send()` calls happen to non-sender connections. Tests that need to verify broadcast behavior (PILE_SHUFFLED, STATE_UPDATE per-connection masking) work around this by passing a one-off override to `makeMockRoom`. But no test exists that asserts the `viewFor` masking contract through the broadcast path.

Phase 12 has two tasks: (1) extract the duplicated `makeMockRoom`/`makeMockConnection` helpers into a shared file so tests can register connections before calling `onMessage`, and (2) add two new `viewFor`-through-broadcast tests — one asserting the local player receives full hand data, one asserting the remote player receives masked hand data.

**Primary recommendation:** Create `tests/helpers.ts` with a `makeMockRoom(connections: Party.Connection[])` signature that closes over the caller-owned array. Add two new tests in a new `tests/broadcastMasking.test.ts` file that populate the array before calling `onMessage` and inspect what each connection's `send` received.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEV-04 | Unit test mock helpers correctly model local vs remote player; `viewFor` masking is tested for sender and recipients | Shared helper extracts the mock pattern; two new broadcast masking tests verify the viewFor contract through the real broadcastState path |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| viewFor masking logic | API / Backend (PartyKit server) | — | Lives in `party/index.ts`; pure function, no I/O |
| broadcastState delivery | API / Backend (PartyKit server) | — | Called by `onMessage`, iterates `room.getConnections()` |
| Test mock | Test infrastructure | — | Vitest helpers stub Party.Room; not shipped to production |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.2 [VERIFIED: package.json] | Test runner, assertions, mocking | Already in use; all 112 existing tests run with it |
| partykit/server (types only) | 0.0.115 [VERIFIED: package.json] | `Party.Room`, `Party.Connection` type shapes | Tests import `type * as Party from "partykit/server"` to type the mocks |

### No New Libraries Required

This phase requires no new npm packages. The fix is entirely structural — extracting duplicated inline helpers into a shared module and adding two new test assertions.

## Architecture Patterns

### How getConnections() Is Used in the Server

```
party/index.ts

broadcastState() {
  for (const conn of [...this.room.getConnections()]) {  // iterates ALL connections
    conn.send(JSON.stringify({
      type: "STATE_UPDATE",
      state: viewFor(this.gameState, getPlayerToken(conn)), // per-connection masking
    }));
  }
}

broadcastShuffleEvent(pileId) {
  for (const conn of [...this.room.getConnections()]) {
    conn.send(JSON.stringify({ type: "PILE_SHUFFLED", pileId }));
  }
}
```

`getPlayerToken(conn)` reads `conn.state?.playerToken ?? conn.id`. The mock connection in every existing test sets `state: { playerToken: id }`, so this already works correctly — the only missing piece is that connections are never in the array when `broadcastState` runs.

### Current Mock Pattern (Duplicated in 11 of 14 Test Files)

```typescript
// Repeated verbatim in: passCard, dealCards, resetTable, shufflePile, moveCard,
// undoMove, flipCard, reconnect, shuffle, displayName, viewFor test files

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];   // <-- always empty, never populated
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}

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

### Working Pattern Already in Two Tests

`dealCards.test.ts` line 146–171 and `shufflePile.test.ts` line 72–95 already demonstrate how to make connections visible to `broadcastState` — they pass a pre-populated array via the `overrides` escape hatch:

```typescript
const conn1 = makeMockConnection("conn-1");
const conn2 = makeMockConnection("conn-2");
const connections = [conn1, conn2];
const roomWithConns = makeMockRoom({
  getConnections: (() => connections[Symbol.iterator]()) as unknown as Party.Room["getConnections"],
});
```

This works but is verbose and duplicated. The shared helper can make this the default API.

### Recommended Shared Helper Design

```typescript
// tests/helpers.ts  (new file)

import { vi } from "vitest";
import type * as Party from "partykit/server";
import type { Card } from "../src/shared/types";

/** Create a mock Room. Pass connections[] to make getConnections() return them. */
export function makeMockRoom(
  connections: Array<Party.Connection & { send: ReturnType<typeof vi.fn> }> = [],
  overrides: Partial<Party.Room> = {}
): Party.Room {
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
}

/** Create a mock Connection with a send spy. state.playerToken = id. */
export function makeMockConnection(
  id: string
): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

/** Convenience card factory. */
export function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
}
```

Key design choices:
- `connections` is the first argument (not buried in overrides) so callers build the array before constructing the room and mutations to the array are visible to `getConnections()` at call time.
- Signature is additive; existing tests that call `makeMockRoom({...overrides})` can be migrated incrementally — Phase 12 does NOT need to migrate existing tests, only add the shared file and the two new assertion tests.

### New Test File: broadcastMasking.test.ts

```typescript
// tests/broadcastMasking.test.ts  (new file)

import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ClientGameState, ServerEvent } from "../src/shared/types";

describe("broadcastState masking via viewFor", () => {
  it("local player connection receives full hand card data after MOVE_CARD", async () => {
    const localConn = makeMockConnection("player-1");
    const remoteConn = makeMockConnection("player-2");
    const connections = [localConn, remoteConn];
    const mockRoom = makeMockRoom(connections);
    const room = new GameRoom(mockRoom);

    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [makeCard("A-s")];
    room.gameState.hands["player-2"] = [];

    // Trigger broadcastState by sending any valid action
    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      localConn
    );

    // Find STATE_UPDATE sent to localConn
    const localMessages = localConn.send.mock.calls.map(
      (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
    );
    const localUpdate = localMessages.find(e => e.type === "STATE_UPDATE") as { type: "STATE_UPDATE"; state: ClientGameState } | undefined;
    expect(localUpdate).toBeDefined();
    // local player's myHand contains the card with full data
    // (card moved to discard, so hand is now empty — but myPlayerId is correct)
    expect(localUpdate!.state.myPlayerId).toBe("player-1");
  });

  it("remote player connection receives masked hand data (no id/suit/rank for opponent hand)", async () => {
    const localConn = makeMockConnection("player-1");
    const remoteConn = makeMockConnection("player-2");
    const connections = [localConn, remoteConn];
    const mockRoom = makeMockRoom(connections);
    const room = new GameRoom(mockRoom);

    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-s")];
    room.gameState.hands["player-2"] = [];

    // Trigger broadcastState without moving player-1's cards (use PING or any no-op)
    // Use MOVE_CARD from pile so player-1's hand stays intact for the masking check
    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      localConn
    );

    const remoteMessages = remoteConn.send.mock.calls.map(
      (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
    );
    const remoteUpdate = remoteMessages.find(e => e.type === "STATE_UPDATE") as { type: "STATE_UPDATE"; state: ClientGameState } | undefined;
    expect(remoteUpdate).toBeDefined();
    // remote player sees player-1's hand count, not the cards
    expect(remoteUpdate!.state.myHand).toHaveLength(0); // player-2's own empty hand
    expect(remoteUpdate!.state.opponentHandCounts["player-1"]).toBeDefined();
    // remote player's myPlayerId is their own token
    expect(remoteUpdate!.state.myPlayerId).toBe("player-2");
  });
});
```

Note: The above is a sketch for the planner. The exact trigger action and assertion details should match what the tests actually check after the helper is in place. The key is that both `localConn.send` and `remoteConn.send` are called, and the STATE_UPDATE payloads differ — local gets `myHand` with cards, remote gets `opponentHandCounts` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mock WebSocket connection | Custom WebSocket class | `vi.fn()` on `send`/`close` with a plain object cast | PartyKit Connection is a structural type; duck-typing with `as unknown as Party.Connection` is the established pattern in this codebase |
| Per-connection state inspection | Log interception / proxy | `conn.send.mock.calls` | Vitest mock already records all calls; parse JSON from the call args |

## Common Pitfalls

### Pitfall 1: getConnections Returns an Iterator, Not an Array

**What goes wrong:** `getConnections()` returns an `IterableIterator<Party.Connection>`. `broadcastState` spreads it: `[...this.room.getConnections()]`. If the iterator is already exhausted (because it was spread once already in the same call), a second spread returns nothing.

**Why it happens:** An array's `[Symbol.iterator]()` is fresh each call. But if someone passes a one-shot generator, it exhausts after first spread. The safe pattern is `() => connections[Symbol.iterator]()` — a function that creates a fresh iterator from a live array each time.

**How to avoid:** The helper must be a function (`getConnections: () => connections[Symbol.iterator]()`), not a stored iterator. This is already the pattern in the codebase — confirm the shared helper follows it.

**Warning signs:** `conn.send` mock shows zero calls for the second broadcast in a test that calls `onMessage` twice.

### Pitfall 2: getConnections Override Is a One-Shot Iterator

**What goes wrong:** The `dealCards.test.ts` override passes `(() => connections[Symbol.iterator]())` — this is a thunk that re-evaluates each call, correct. But if someone wrote `connections[Symbol.iterator]()` (evaluated once at construction time), `getConnections()` would always return the same exhausted iterator.

**How to avoid:** The shared helper uses the thunk form. Document this in the helper file comment.

### Pitfall 3: Existing Tests Broken by Helper Signature Change

**What goes wrong:** Existing tests call `makeMockRoom()` with zero arguments or with `{...overrides}`. If the shared helper changes the argument order or removes the overrides escape hatch, existing tests break.

**How to avoid:** The helper must keep `connections` optional (default `[]`) and keep the `overrides` parameter. Phase 12 does NOT migrate existing tests — it only adds the shared file and two new tests. Existing files continue to define their own local `makeMockRoom`/`makeMockConnection` or can be migrated in a later cleanup phase.

**Warning signs:** TypeScript errors in existing test files after adding the helper.

### Pitfall 4: Connection State Shape Mismatch

**What goes wrong:** `getPlayerToken()` reads `connection.state as ConnectionState | null | undefined` where `ConnectionState = { playerToken: string }`. If a test connection has `state: null` or `state: undefined`, `getPlayerToken` falls back to `connection.id`. This is fine for most tests, but for the masking test the playerToken must match the hands key.

**How to avoid:** `makeMockConnection(id)` sets `state: { playerToken: id }` — this already matches. No change needed.

## Code Examples

### Pattern 1: How broadcastState sends to connections
[VERIFIED: party/index.ts lines 443-450]
```typescript
private broadcastState() {
  for (const conn of [...this.room.getConnections()]) {
    conn.send(JSON.stringify({
      type: "STATE_UPDATE",
      state: viewFor(this.gameState, getPlayerToken(conn)),
    } satisfies ServerEvent));
  }
}
```

### Pattern 2: Working broadcast test (existing, in dealCards.test.ts)
[VERIFIED: tests/dealCards.test.ts lines 146-171]
```typescript
const conn1 = makeMockConnection("conn-1");
const conn2 = makeMockConnection("conn-2");
const connections = [conn1, conn2];
const roomWithConns = makeMockRoom({
  getConnections: (() => connections[Symbol.iterator]()) as unknown as Party.Room["getConnections"],
});
```

### Pattern 3: Inspecting what a connection received
[VERIFIED: tests/dealCards.test.ts lines 160-170]
```typescript
const conn1Messages = conn1.send.mock.calls.map(
  (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
);
const shuffleEvents1 = conn1Messages.filter(e => e.type === "PILE_SHUFFLED");
expect(shuffleEvents1).toHaveLength(1);
```

### Pattern 4: viewFor masking contract (existing, in viewFor.test.ts)
[VERIFIED: tests/viewFor.test.ts lines 31-50]
```typescript
// Local player sees their cards
const view = viewFor(state, "player-1");
expect(view.myHand).toHaveLength(2);  // full card objects

// Remote players are counts only, not cards
expect(view.opponentHandCounts["player-2"]).toBe(3);
expect("hands" in view).toBe(false);  // hands never in ClientGameState
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEV-04a | `getConnections()` returns populated connection data in mock | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 (new file: tests/broadcastMasking.test.ts) |
| DEV-04b | `viewFor` returns masked data for remote player via broadcastState | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DEV-04c | `viewFor` returns full data for local player via broadcastState | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DEV-04d | All existing tests continue to pass | unit | `npm test` | ✅ 112 passing |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/helpers.ts` — shared `makeMockRoom`/`makeMockConnection`/`makeCard` helpers (covers DEV-04a)
- [ ] `tests/broadcastMasking.test.ts` — two new tests asserting per-connection masking (covers DEV-04b, DEV-04c)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `makeMockRoom` per test file | Shared `tests/helpers.ts` | Phase 12 | Eliminates 11 copies of the same function |
| `getConnections` returns empty iterator | `getConnections` returns live array iterator | Phase 12 | broadcastState tests can assert send calls |

## Open Questions

1. **Should existing test files be migrated to import from helpers.ts?**
   - What we know: 11 of 14 files have identical `makeMockRoom`/`makeMockConnection` implementations; the success criteria says "additive only"
   - What's unclear: Whether the planner should include migration tasks for DRY cleanup
   - Recommendation: Do NOT migrate in Phase 12. Phase 12 success criteria is explicitly "additive only." Add helpers.ts and broadcastMasking.test.ts only. Migration is a candidate for a future cleanup phase.

2. **Which action to trigger broadcastState in the masking test?**
   - What we know: Any `onMessage` action that succeeds calls `persist()` then `broadcastState()`. The simplest is a no-op that still reaches `broadcastState` — PING doesn't call broadcastState (it hits the `case "PING": break`). MOVE_CARD always calls broadcastState even if the move is valid.
   - Recommendation: Use MOVE_CARD from pile-to-pile (e.g., move a card from draw pile to discard pile, where sender is player-1) so player-1's hand remains populated for the masking assertion on player-2's view.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase modifies only TypeScript test files; vitest is already installed and working).

## Security Domain

Step skipped — this phase makes no changes to authentication, authorization, data handling, or network endpoints. It only adds test helpers and unit tests for existing server logic.

## Sources

### Primary (HIGH confidence)
- `tests/passCard.test.ts`, `tests/dealCards.test.ts`, `tests/shufflePile.test.ts`, `tests/viewFor.test.ts`, `tests/reconnect.test.ts`, `tests/resetTable.test.ts` — [VERIFIED: read directly] — all mock patterns examined
- `party/index.ts` — [VERIFIED: read directly] — `broadcastState`, `getPlayerToken`, `viewFor` implementation
- `src/shared/types.ts` — [VERIFIED: read directly] — `GameState`, `ClientGameState`, `Party.Connection` usage
- `vitest.config.ts` — [VERIFIED: read directly] — test include glob: `tests/**/*.test.ts`
- `npm test` output — [VERIFIED: executed] — 112 tests pass, 0 failures

### Secondary (MEDIUM confidence)
- PartyKit `Party.Room.getConnections()` return type: `IterableIterator<Party.Connection>` — [ASSUMED from type annotation in codebase; consistent with how the server spreads it]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getConnections()` returns `IterableIterator<Party.Connection>` (not `Connection[]`) — spreading it once exhausts it | Pitfall 1 | Low: the thunk pattern `() => arr[Symbol.iterator]()` is safe regardless of iterator type |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json and test execution
- Architecture: HIGH — server code and all test files read directly
- Pitfalls: HIGH — derived from direct code inspection, not assumptions
- Mock fix approach: HIGH — working example already exists in dealCards.test.ts and shufflePile.test.ts

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable codebase; no dependency churn expected)
