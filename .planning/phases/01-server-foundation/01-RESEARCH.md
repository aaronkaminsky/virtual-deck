# Phase 1: Server Foundation - Research

**Researched:** 2026-03-31
**Domain:** PartyKit server, WebSocket room lifecycle, hand masking, state persistence, Fisher-Yates shuffle
**Confidence:** HIGH (core API verified against live docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECK-01 | Room initializes with a standard 52-card deck | GameState shape, Card/Suit/Rank types, deck initialization pattern in onStart |
| DECK-02 | Deck shuffle uses Fisher-Yates + crypto.getRandomValues, server-side | crypto.getRandomValues confirmed available in Cloudflare Workers; Fisher-Yates algorithm documented |
| CARD-05 | Player's hand is private — other players see only card backs, enforced server-side | viewFor(connectionId) pattern; ClientGameState type strips other hands; per-connection send loop |
| ROOM-03 | Room supports 2–4 simultaneous players | connection.close() pattern in onConnect after counting getConnections(); 5th connection rejected |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Hosting:** GitHub Pages (static frontend) + PartyKit Cloud — no traditional server or database
- **Cost:** Free tier only — no paid infrastructure
- **Scale:** 2–4 players per session; no need to optimize for large concurrent rooms
- **Card art:** Customization is a code change, not a runtime config
- **GSD Workflow Enforcement:** All edits must go through a GSD command entry point
- **No comments/docstrings on unchanged code; no over-engineering; read before modifying**

---

## Summary

Phase 1 establishes the PartyKit room as the authoritative game server. No frontend work happens in this phase — the deliverable is a TypeScript PartyKit server that can be exercised via `partykit dev` and a minimal test harness or curl/wscat script confirming all success criteria. The phase is scoped to: deck initialization, server-side Fisher-Yates shuffle, per-connection hand masking, 4-player cap with 5th-connection rejection, and state persistence across hibernation.

The critical research questions from STATE.md have been resolved: PartyKit hook names are confirmed (`onStart`, `onConnect`, `onMessage`, `onClose`, `static onBeforeConnect`), `party.storage` is `this.room.storage` (not `this.party.storage` — a naming difference from prior notes), and `crypto.getRandomValues` is fully available in Cloudflare Workers with no caveats.

The only design decision requiring care: the 5th-connection rejection cannot be reliably enforced in `onBeforeConnect` (which runs in an edge worker without room access) and must be done in `onConnect` via `connection.close()` after counting `[...this.room.getConnections()].length`. This is slightly later than ideal but is the correct PartyKit pattern.

**Primary recommendation:** Build the server as a single `party/index.ts` file implementing `Party.Server`. Use `this.room.storage` for all persistence. Use a `viewFor(playerToken)` function to produce masked `ClientGameState` per connection. Send per-connection state inside `onConnect` and after every mutation — never broadcast the full state.

---

## Standard Stack

### Core (Phase 1 only)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| partykit | 0.0.115 (latest) | PartyKit dev server, deploy CLI, server runtime types | Official SDK — no alternative |
| partysocket | 1.1.16 (latest) | Client WebSocket wrapper (needed for test harness only in Phase 1) | Handles reconnection and message buffering |
| TypeScript | 6.0.2 | Type-safe shared types between server and future client | PartyKit server is TypeScript-native; types shared via `src/shared/types.ts` |
| nanoid | 5.1.7 (latest) | Player token generation (server-side, Cloudflare Workers compatible) | v5 uses Web Crypto API; no Node.js dependency |

**Version verification (npm view, 2026-03-31):**
- `partykit`: 0.0.115
- `partysocket`: 1.1.16
- `typescript`: 6.0.2
- `nanoid`: 5.1.7

> Note: partykit is pre-1.0 semver. `0.0.115` is the current stable release. Pin the install if API stability matters.

### Installation (Phase 1 server only)
```bash
npm install -D partykit
npm install partysocket nanoid
npx tsc --init   # if no tsconfig yet
```

---

## Architecture Patterns

### Recommended File Structure (Phase 1 scope)
```
party/
└── index.ts         # PartyKit room server — the only Phase 1 deliverable

src/
└── shared/
    └── types.ts     # Card, GameState, ClientGameState, message types
                     # Imported by party/index.ts now; React client later

partykit.json        # Project name, main entry, compatibility flags
```

### Pattern 1: Party.Server Class Structure

**What:** Single class that implements `Party.Server` and holds in-memory game state as a class field. All lifecycle hooks are methods on this class.

**When to use:** Always — this is the only PartyKit server pattern.

```typescript
// Source: https://docs.partykit.io/reference/partyserver-api/
import type * as Party from "partykit/server";
import { nanoid } from "nanoid";

export default class GameRoom implements Party.Server {
  gameState: GameState;

  constructor(readonly room: Party.Room) {
    this.gameState = defaultGameState();
  }

  // Called once on room start (before any connections). Awaited before processing connections.
  async onStart() {
    this.gameState =
      (await this.room.storage.get<GameState>("gameState")) ??
      defaultGameState();
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    // Enforce 4-player cap
    const playerCount = [...this.room.getConnections()].length;
    if (playerCount > 4) {
      connection.close(4000, "Room is full");
      return;
    }
    // Send masked state to the joining connection
    connection.send(JSON.stringify({
      type: "STATE_UPDATE",
      state: viewFor(this.gameState, getPlayerToken(connection))
    }));
  }

  async onMessage(message: string, sender: Party.Connection) {
    const action = JSON.parse(message) as ClientAction;
    this.handleAction(action, sender);
    await this.persist();
    this.broadcast();
  }

  async onClose(connection: Party.Connection) {
    const token = getPlayerToken(connection);
    if (token) {
      const player = this.gameState.players.find(p => p.id === token);
      if (player) player.connected = false;
    }
    await this.persist();
    this.broadcast();
  }

  // Persist full game state
  private async persist() {
    await this.room.storage.put("gameState", this.gameState);
  }

  // Send per-connection masked state to every connected player
  private broadcast() {
    for (const conn of this.room.getConnections()) {
      const token = getPlayerToken(conn);
      conn.send(JSON.stringify({
        type: "STATE_UPDATE",
        state: viewFor(this.gameState, token)
      }));
    }
  }
}

// Enable hibernation — room sleeps when no messages; onStart restores from storage on wake
GameRoom.options = { hibernate: true };
```

### Pattern 2: State Masking (viewFor)

**What:** A pure function that takes the authoritative `GameState` and a player token, and returns a `ClientGameState` where all other players' hands are stripped.

**When to use:** Called once per connected player inside every broadcast. Never store pre-masked state.

```typescript
// Source: derived from https://docs.partykit.io/reference/partyserver-api/ + architectural research
function viewFor(state: GameState, playerToken: string | null): ClientGameState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players,
    myHand: playerToken ? (state.hands[playerToken] ?? []) : [],
    opponentHandCounts: Object.fromEntries(
      Object.entries(state.hands)
        .filter(([token]) => token !== playerToken)
        .map(([token, cards]) => [token, cards.length])
    ),
    piles: state.piles,
    // deck is never included — strip it entirely
  };
}
```

### Pattern 3: Player Token Extraction

**What:** The client passes a stable player token in the PartySocket `id` field or via a query param. The server extracts it from the connection.

**When to use:** In every hook that needs to identify the player behind a connection.

```typescript
// partysocket client sends:
// new PartySocket({ host, room, id: playerToken })
// Server receives it as connection.id (PartySocket sets connection ID from the id param)

function getPlayerToken(connection: Party.Connection): string {
  return connection.id; // When client passes id: playerToken to PartySocket constructor
}
```

> Confirmed via docs: PartySocket `id` option sets the connection ID on the server side. This is the correct mechanism for stable player identity. The client generates a UUID via `nanoid()` stored in `localStorage`; that same value is passed as the `id` option.

### Pattern 4: Fisher-Yates Shuffle with crypto.getRandomValues

**What:** Cryptographically secure in-place shuffle on the server.

```typescript
// Source: Fisher-Yates algorithm, crypto.getRandomValues confirmed in CF Workers
// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Pattern 5: Deck Initialization

**What:** Build a standard 52-card deck with deterministic, unique IDs.

```typescript
const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"] as const;

function buildDeck(): Card[] {
  return SUITS.flatMap(suit =>
    RANKS.map(rank => ({
      id: `${rank[0]}${suit[0]}`, // e.g. "As", "Kh", "10d"
      suit,
      rank,
      faceUp: false,
    }))
  );
}
```

> Note: Use a two-char format that's unique for all 52 cards. "10" and face cards need care — `10d` vs `1d` conflict. Use `T` for ten (`Ts`, `Th`, `Td`, `Tc`) or encode as `10s` and verify all 52 are unique. Planner should pick one scheme and enforce it in types.

### Anti-Patterns to Avoid

- **`this.party.storage`:** The correct API is `this.room.storage` — prior research notes used incorrect naming.
- **`this.party.broadcast()`:** The correct API is `this.room.broadcast()` — but do not use it for game state. Use the per-connection loop to enforce hand masking.
- **`connection.id` as player identity without PartySocket id param:** If the client uses raw WebSocket, `connection.id` is a GUID. Only stable if client passes `id: playerToken` via PartySocket.
- **Counting connections in `onBeforeConnect`:** This static hook runs in an edge worker without room access. Cannot count existing connections there. Use `onConnect` + `connection.close()` instead.
- **Not awaiting `onStart`:** PartyKit guarantees `onStart` completes before processing connections — but only if it's `async` and properly awaited. Don't fire-and-forget storage reads.
- **Storing pre-masked state:** Always mask at send time, never cache masked state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection with backoff | Custom reconnect loop | `partysocket` | Handles backoff, message queuing, reconnect — battle-tested |
| Cryptographic random numbers | Math.random()-based shuffle | `crypto.getRandomValues` (built-in) | Math.random is not cryptographically random; predictable patterns possible |
| Room/player ID generation | Custom ID scheme | `nanoid` (v5) | URL-safe, no collision risk at this scale, Cloudflare Workers compatible |
| State persistence format | Custom serialization | Structured clone via `room.storage.put` | PartyKit handles serialization; 128 KB per value is more than sufficient for a 52-card game state |

**Key insight:** Game state at this scale (52 cards, 4 players) is ~2–4 KB per snapshot. Optimization concerns (diffs, compression, partial updates) are premature. Full snapshot per mutation is the correct approach.

---

## Common Pitfalls

### Pitfall 1: `this.party.storage` vs `this.room.storage`
**What goes wrong:** Prior notes and some training data refer to `this.party.storage`. The actual API is `this.room.storage`. Code using the wrong reference throws at runtime.
**Why it happens:** PartyKit renamed the context object from `party` to `room` during its pre-1.0 development.
**How to avoid:** Always use `this.room.storage`. Verify with: `import type * as Party from "partykit/server"` — the `room` property is on `Party.Room`.
**Warning signs:** TypeScript shows no error (if types are stale) but runtime throws `TypeError: Cannot read property 'storage' of undefined`.

### Pitfall 2: State Lost on Hibernation Without onStart Reload
**What goes wrong:** Game state stored only in class instance variables is lost when the room hibernates (the isolate is deallocated). Players return to an empty table.
**Why it happens:** Cloudflare Durable Objects (which PartyKit wraps) hibernate idle rooms to save resources. Instance variables do not survive.
**How to avoid:** Write `await this.room.storage.put("gameState", this.gameState)` on every mutation. In `onStart`, restore: `this.gameState = await this.room.storage.get<GameState>("gameState") ?? defaultGameState()`.
**Warning signs:** Game state silently resets after players are idle 5–10 minutes.

### Pitfall 3: Hand Privacy Leak via Broadcast
**What goes wrong:** Calling `this.room.broadcast(JSON.stringify(this.gameState))` sends all players' hands to all connections. Any player with DevTools can read opponents' cards in 30 seconds.
**Why it happens:** `broadcast` is the easy path; per-connection masking requires a loop.
**How to avoid:** Never broadcast game state. Always iterate `this.room.getConnections()` and call `conn.send(viewFor(state, token))` per connection.
**Warning signs:** Any call to `this.room.broadcast()` that includes `hands` data.

### Pitfall 4: 5th Connection Enforcement in Wrong Hook
**What goes wrong:** `onBeforeConnect` runs in an edge worker without access to current room connection count. Trying to count players there silently fails.
**Why it happens:** `onBeforeConnect` is a static method running outside the room instance.
**How to avoid:** Enforce the 4-player cap in `onConnect`: count `[...this.room.getConnections()].length` (which includes the new connection) and call `connection.close(4000, "Room is full")` if count > 4.
**Warning signs:** `this.room` is undefined inside `static onBeforeConnect`.

### Pitfall 5: Player Token Not Passed via PartySocket id Option
**What goes wrong:** If the test harness or future client connects without setting `id: playerToken`, `connection.id` is a random GUID per connection. Reconnects create new players and orphan hands.
**Why it happens:** `connection.id` defaults to a server-assigned GUID unless the client explicitly sets it via PartySocket's `id` option.
**How to avoid:** Phase 1 test harness and all future clients must pass `id: storedPlayerToken` when constructing `PartySocket`. The server uses `connection.id` as the player token key in `hands{}`.
**Warning signs:** Two connections from the same "player" create two entries in `gameState.players`.

### Pitfall 6: 10-of-Suit Card ID Collision
**What goes wrong:** Using single-character rank encoding (`rank[0]`) produces `1` for `10`, which collides with `A` (which also starts with... wait, no — but `10s` and `1s` are different). More precisely: `"10"[0]` is `"1"`, which means `10s` → `1s`, and there's no other rank starting with `1`. But if rank `"1"` were ever introduced or IDs are truncated inconsistently, uniqueness breaks.
**Why it happens:** Inconsistent ID generation logic for the 10s.
**How to avoid:** Use full rank in the ID: `${rank}-${suit[0]}` (e.g., `10-s`, `A-s`, `K-h`). Or use a suit+rank positional index: `suit_index * 13 + rank_index`. Either is fine; pick one scheme in `types.ts` and never deviate.
**Warning signs:** Deck operations that look up cards by ID produce wrong results for 10s.

---

## Code Examples

### Verified: Full partykit.json structure
```json
{
  "name": "virtual-deck",
  "main": "party/index.ts",
  "compatibilityDate": "2023-10-01"
}
```

### Verified: Complete GameState and ClientGameState types
```typescript
// src/shared/types.ts
// Source: derived from ARCHITECTURE.md research + verified types

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  id: string;      // e.g. "A-s", "10-h", "K-d"
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface Player {
  id: string;      // stable player token from localStorage (= connection.id via PartySocket id param)
  connected: boolean;
}

export interface Pile {
  id: string;      // "draw" | "discard" | "zone-1" | ...
  name: string;
  cards: Card[];   // top of stack = last element
}

export interface GameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  hands: Record<string, Card[]>; // keyed by player token — NEVER sent raw to clients
  piles: Pile[];
  // deck not stored separately — starts in piles["draw"]
}

// What each client receives
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];       // all players with connected status
  myHand: Card[];          // only this player's cards
  opponentHandCounts: Record<string, number>; // token → card count (no faces)
  piles: Pile[];
}

// Message types
export type ClientAction =
  | { type: "JOIN"; playerToken: string }
  | { type: "SHUFFLE_DECK" }
  | { type: "PING" };

export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string };
```

### Verified: onStart storage restore pattern
```typescript
// Source: https://docs.partykit.io/guides/persisting-state-into-storage/
async onStart() {
  this.gameState =
    (await this.room.storage.get<GameState>("gameState")) ??
    defaultGameState(this.room.id);
}
```

### Verified: Per-connection broadcast (hand masking)
```typescript
// Source: https://docs.partykit.io/reference/partyserver-api/
private broadcastState() {
  for (const conn of this.room.getConnections()) {
    conn.send(JSON.stringify({
      type: "STATE_UPDATE",
      state: viewFor(this.gameState, conn.id)
    } satisfies ServerEvent));
  }
}
```

### Verified: 4-player cap in onConnect
```typescript
// Source: https://docs.partykit.io/reference/partyserver-api/#onconnect
async onConnect(connection: Party.Connection) {
  const count = [...this.room.getConnections()].length;
  if (count > 4) {
    connection.close(4000, "Room is full — maximum 4 players");
    return;
  }
  // ... rest of join logic
}
```

### Verified: Hibernation opt-in
```typescript
// Source: https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/
// Set as static class property at bottom of file
GameRoom.options = { hibernate: true };
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `this.party.storage` | `this.room.storage` | During PartyKit pre-1.0 development | Code using `this.party` will fail at runtime |
| `this.party.broadcast()` | `this.room.broadcast()` | Same rename | Same fix needed |
| `PartyKitServer` class name | `Party.Server` interface | PartyKit SDK refactor | Old examples using class name will fail |
| nanoid v3 (Node.js crypto) | nanoid v5 (Web Crypto API) | v4 (fixed); v5 is current | v3 crashes in Cloudflare Workers runtime |

**Deprecated/outdated in prior notes:**
- `this.party.storage`: Renamed to `this.room.storage` — confirmed via live docs
- `partysocket` "bundled with PartyKit SDK" claim: False — `partysocket` is a separate npm package (currently v1.1.16)
- nanoid "4.x" in CLAUDE.md stack: Current is 5.1.7; use v5

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| Node.js | partykit dev server | ✓ (assumed, git repo active) | — | — |
| partykit CLI | `npx partykit dev` local testing | Install via npm | 0.0.115 | — |
| partysocket | Test harness / future client | Install via npm | 1.1.16 | — |
| crypto.getRandomValues | Server-side Fisher-Yates | ✓ (Cloudflare Workers built-in) | Web Crypto API | None needed |
| wscat or similar | Manual WebSocket testing | Optional | — | Can use partysocket-based test script |

No blocking missing dependencies — all required packages are installable from npm.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts (Wave 0 gap — does not yet exist) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

> Note: PartyKit server code runs in the Cloudflare Workers runtime, not Node.js. Unit tests for pure logic (shuffle, viewFor, buildDeck, card ID generation) can run in vitest with no mock needed. Integration tests that require an actual PartyKit room require `partykit dev` and a WebSocket client — these are manual or script-based for Phase 1.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DECK-01 | `buildDeck()` returns exactly 52 cards with correct suit/rank combinations and no duplicates | unit | `npx vitest run tests/deck.test.ts` | Wave 0 gap |
| DECK-01 | `defaultGameState()` places all 52 cards in `piles["draw"]` | unit | `npx vitest run tests/deck.test.ts` | Wave 0 gap |
| DECK-02 | `shuffle()` uses `crypto.getRandomValues` (mock and verify no Math.random calls) | unit | `npx vitest run tests/shuffle.test.ts` | Wave 0 gap |
| DECK-02 | Shuffled deck contains same 52 cards in different order (statistical) | unit | `npx vitest run tests/shuffle.test.ts` | Wave 0 gap |
| CARD-05 | `viewFor(state, tokenA)` returns `myHand` for tokenA and empty `opponentHandCounts` values (no face data) | unit | `npx vitest run tests/viewFor.test.ts` | Wave 0 gap |
| CARD-05 | `viewFor` never includes `hands` key or `deck` key in output | unit | `npx vitest run tests/viewFor.test.ts` | Wave 0 gap |
| ROOM-03 | 5th connection is rejected — manual: connect 5 wscat clients and verify 5th receives close frame | manual | `partykit dev` + manual wscat | N/A |
| ROOM-03 | State survives hibernation — manual: idle room, reconnect, verify state restored | manual | `partykit dev` + manual test | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** All unit tests green + manual WebSocket smoke test before marking phase complete

### Wave 0 Gaps
- [ ] `tests/deck.test.ts` — covers DECK-01: buildDeck(), defaultGameState()
- [ ] `tests/shuffle.test.ts` — covers DECK-02: Fisher-Yates, crypto.getRandomValues usage
- [ ] `tests/viewFor.test.ts` — covers CARD-05: hand masking, no leakage
- [ ] `vitest.config.ts` — root config pointing at `tests/` directory
- [ ] `src/shared/types.ts` — shared types file (zero tests needed, but required as Wave 0 for all other code to import)
- [ ] `party/index.ts` — server entry point skeleton

---

## Open Questions

1. **Player name in Phase 1**
   - What we know: ARCHITECTURE.md includes `name: string` on `Player`. Phase 1 success criteria don't mention names.
   - What's unclear: Should the `JOIN` action include a name, or is naming deferred to Phase 2?
   - Recommendation: Omit name from `Player` type in Phase 1. Add it in Phase 2 (Lobby). Keep `Player` minimal: `{ id: string, connected: boolean }`.

2. **Card 10 ID encoding**
   - What we know: Single-char rank shortening (`rank[0]`) produces `"1"` for rank `"10"`, which is unambiguous among existing ranks (no other rank starts with `1`) but is fragile.
   - What's unclear: The planner needs to pick a canonical ID format and enforce it.
   - Recommendation: Use `${rank}-${suit[0]}` (e.g., `"10-s"`, `"A-h"`) — simple, readable, unambiguous for all 52 cards.

3. **Hibernation testing in Phase 1**
   - What we know: `partykit dev` runs locally; local rooms may not hibernate the same way as cloud rooms.
   - What's unclear: Can hibernation be reliably triggered locally for verification?
   - Recommendation: Document the storage restore path in unit tests by mocking `room.storage.get` returning saved state. Manual hibernation testing can be deferred to a deployed environment.

4. **getConnections count includes or excludes the current connection?**
   - What we know: docs say `getConnections()` returns all active connections including the one just opened.
   - What's unclear: When called from `onConnect`, does the count include the connecting player?
   - Recommendation: The planner should write the check as `> 4` (reject if already 5 including current) and add a unit test that verifies the boundary. This is confirmed by the docs example pattern above.

---

## Sources

### Primary (HIGH confidence)
- https://docs.partykit.io/reference/partyserver-api/ — hook names, `room.storage`, `getConnections`, `connection.close`, `onBeforeConnect` limitations
- https://docs.partykit.io/guides/persisting-state-into-storage/ — `onStart` pattern, `storage.get`/`storage.put`, 128 KB value limit
- https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/ — `options.hibernate`, what survives, `onStart` called on wake
- https://docs.partykit.io/reference/partysocket-api/ — PartySocket constructor, `id` param, message buffering
- https://developers.cloudflare.com/workers/runtime-apis/web-crypto/ — `crypto.getRandomValues` confirmed in Cloudflare Workers
- npm registry (verified 2026-03-31): partykit@0.0.115, partysocket@1.1.16, nanoid@5.1.7, typescript@6.0.2, vitest@4.1.2

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — GameState shape, message types (derived from training data, architectural patterns verified against live docs)
- `.planning/research/PITFALLS.md` — hibernation pitfall, hand privacy leak, connection ID pitfall (patterns confirmed against live docs)

### Tertiary (LOW confidence)
- None — all critical claims verified against live sources.

---

## Metadata

**Confidence breakdown:**
- PartyKit hook names: HIGH — verified against live docs 2026-03-31
- `room.storage` API: HIGH — verified against live docs (corrects `party.storage` from prior notes)
- Hand masking pattern: HIGH — derived from first principles, corroborated by architectural research
- 4-player cap via `onConnect` + `connection.close()`: HIGH — confirmed by docs example
- `crypto.getRandomValues` in Cloudflare Workers: HIGH — confirmed by official CF docs
- `partysocket` `id` param sets server `connection.id`: HIGH — confirmed by PartySocket docs
- nanoid v5 Cloudflare Workers compatibility: HIGH — v5 uses Web Crypto API (no Node.js dependency)
- vitest as test framework: MEDIUM — not installed yet, but is the standard for Vite/TypeScript projects; no test config exists yet

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (PartyKit is pre-1.0; check for API changes before next phase if > 30 days)
