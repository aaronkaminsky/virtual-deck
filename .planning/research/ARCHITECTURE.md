# Architecture Research — Virtual Deck (Multiplayer Card Game)

**Researched:** 2026-03-28
**Confidence:** MEDIUM — patterns derived from PartyKit docs (training data, Aug 2025 cutoff). Core architectural decisions are HIGH confidence (pre-decided by project owner). PartyKit API surface is MEDIUM confidence — verify hook names before implementation.

---

## Recommended Architecture

```
┌──────────────────────────────────────────────────────┐
│                  GitHub Pages (Static)               │
│                                                      │
│  React App (Vite)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  BoardView   │  │  HandView    │  │  Lobby UI  │ │
│  │  (shared)    │  │  (private)   │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         └─────────────────┴────────────────┘        │
│                        │                             │
│              useGameSocket (hook)                    │
│              partysocket client                      │
│                        │ WSS                         │
└────────────────────────┼─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│              PartyKit Cloud (Edge / CF Workers)       │
│                                                      │
│  Room Server (party/index.ts)                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  onBeforeConnect → validate room / password      │ │
│  │  onConnect       → assign player slot, send state│ │
│  │  onMessage       → validate action, mutate state │ │
│  │  onClose         → handle player disconnect      │ │
│  │                                                  │ │
│  │  In-memory GameState (per room instance)         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │ │
│  │  │  deck[]  │  │ piles{}  │  │  players{}    │  │ │
│  │  │ (hidden) │  │ (public) │  │  hands{}      │  │ │
│  │  └──────────┘  └──────────┘  │  (private)    │  │ │
│  │                              └───────────────┘  │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Server-side (party/index.ts)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Room class | Owns authoritative GameState, processes all mutations | All connected clients via broadcast/send |
| `onBeforeConnect` hook | Validates room exists, checks password if set | Client during handshake |
| `onConnect` handler | Assigns playerId, sends full masked state to new connection | New client only |
| `onMessage` handler | Validates and applies client actions, broadcasts updated state | All or targeted clients |
| `onClose` handler | Marks player disconnected, optionally pauses game | All clients |
| State masker | Filters GameState per connection ID before sending | Called inside onConnect and after every mutation |

### Client-side (src/)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useGameSocket` hook | Manages partysocket lifecycle, dispatches incoming messages to local state | PartyKit server, zustand store |
| `useGameStore` (zustand) | Holds ephemeral UI state: drag preview, selected card, optimistic updates | React component tree |
| `<App>` | Route between Lobby and Game views | React Router or conditional render |
| `<Lobby>` | Room code entry, player name, create/join room | `useGameSocket` to emit join action |
| `<BoardView>` | Renders shared piles and discard zones, handles drag-and-drop between zones | dnd-kit DndContext, `useGameSocket` |
| `<HandView>` | Renders local player's private hand, card selection, drag-out to board | dnd-kit, `useGameSocket` |
| `<OpponentHand>` | Renders card backs only (count visible, faces hidden) | Game state (masked by server) |
| `<Card>` | Renders a single card face or back. Accepts draggable wrapper. | dnd-kit useDraggable |
| `<Pile>` | Renders a stack of cards (draw pile, discard, zone). Droppable target. | dnd-kit useDroppable |
| `<PlayerBadge>` | Shows player name, connection status, card count | Game state |

---

## Data Flow

### Inbound (server → client)

```
PartyKit Room broadcasts masked GameState snapshot
  → partysocket receives message
  → useGameSocket parses JSON
  → dispatches to useGameStore
  → React re-renders affected components
```

The server always sends a **full state snapshot** after every mutation, not diffs. At 52 cards and 4 players, snapshot payloads are ~2–4 KB. Diffs add complexity with no meaningful bandwidth benefit at this scale.

### Outbound (client → server)

```
User interaction (drag, shuffle, deal button)
  → React event handler
  → useGameSocket.send(action)
  → partysocket transmits over WSS
  → PartyKit Room onMessage handler
  → validate action
  → mutate in-memory GameState
  → mask state per connection
  → broadcast to all connected clients
```

**Optimistic updates:** For drag-and-drop, apply the move locally in zustand immediately (no latency), then send the action. If the server rejects (rare: race condition), the incoming snapshot overwrites the optimistic state.

---

## GameState Shape (Server)

```typescript
// Shared types file: src/shared/types.ts
// Imported by both React frontend and PartyKit server

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  id: string;        // e.g. "Ah", "Kd" — unique within a deck
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface Player {
  id: string;        // stable token stored in localStorage (not connection.id)
  name: string;
  connected: boolean;
  cardCount: number; // Always public (opponents see count)
}

export interface Pile {
  id: string;        // e.g. "draw", "discard", "zone-1"
  name: string;
  cards: Card[];     // Top of stack = last element
  faceDown: boolean; // If true, all cards sent as face-down to everyone
}

export interface GameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  hands: Record<string, Card[]>; // keyed by player token — PRIVATE, masked per connection
  piles: Pile[];                 // Public board zones
  deck: Card[];                  // Server-only, never sent to clients
}

// What each client receives — deck stripped, other hands masked
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  myHand: Card[];
  opponentHandCounts: Record<string, number>;
  piles: Pile[];
}
```

---

## Message Types

```typescript
type ClientAction =
  | { type: "JOIN"; name: string; playerToken: string }
  | { type: "MOVE_CARD"; cardId: string; from: CardLocation; to: CardLocation }
  | { type: "FLIP_CARD"; cardId: string; location: CardLocation }
  | { type: "SHUFFLE_PILE"; pileId: string }
  | { type: "DEAL"; count: number; toPlayerId: string; fromPileId: string }
  | { type: "DRAW"; count: number; fromPileId: string }
  | { type: "RETURN_TO_PILE"; cardId: string; pileId: string }
  | { type: "NEW_DECK" }
  | { type: "PING" };

export type CardLocation =
  | { zone: "hand"; playerId: string }
  | { zone: "pile"; pileId: string }
  | { zone: "board" };

type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "PLAYER_LEFT"; playerId: string }
  | { type: "ERROR"; code: string; message: string };
```

---

## React Component Tree

```
<App>
  ├── <Lobby>                        // phase === "lobby"
  │    ├── <RoomCodeInput>
  │    ├── <PlayerNameInput>
  │    └── <CreateJoinButton>
  │
  └── <Game>                         // phase === "playing"
       ├── <DndContext>              // dnd-kit root, owns drag state
       │    ├── <BoardView>
       │    │    ├── <Pile id="draw" />
       │    │    ├── <Pile id="discard" />
       │    │    └── <Pile id="zone-*" />
       │    │
       │    ├── <HandView>           // local player's private hand
       │    │    └── <Card /> × N   // draggable
       │    │
       │    └── <OpponentHand>       // one per opponent
       │         └── <CardBack /> × N
       │
       ├── <PlayerRoster>
       │    └── <PlayerBadge /> × N
       │
       └── <GameControls>           // Deal, Shuffle, New Deck, etc.
```

---

## Patterns to Follow

**1. Server-authoritative state, optimistic UI only for drags** — Client never mutates game state; sends action and waits for `STATE_UPDATE`. Only exception: drag preview follows cursor before server confirms.

**2. Shared types file** — Single `src/shared/types.ts` imported by both frontend and PartyKit server. TypeScript catches contract mismatches at compile time.

**3. State masking at broadcast time** — Server computes masked `ClientGameState` per connection immediately before sending. Never store pre-masked state.

**4. Stable player tokens** — Store a UUID in `localStorage` as player identity. Use this (not `connection.id`) as the key in `hands{}`. Reconnect restores the hand.

**5. dnd-kit DragOverlay** — Use `<DragOverlay>` for the dragged card ghost. Default browser drag preview has z-index issues and can't be styled.

---

## Anti-Patterns to Avoid

**1. zustand as game state store** — Game state lives on the server. Only use zustand for ephemeral UI state (drag preview, selected card). Server snapshot overwrites on every update.

**2. Sending diffs** — Full state snapshot (~2–4 KB) is correct at this scale. Diffs add reconciliation bugs with no bandwidth benefit.

**3. Trusting client card data** — Accept only card IDs from client actions. Server looks up card by ID in its own authoritative state.

**4. Mixing piles and hands** — `hands` (always masked), `piles` (always public). Never accidentally move hand cards into piles without going through server masking logic.

**5. react-beautiful-dnd** — Archived by Atlassian, no longer maintained. Use @dnd-kit/core.

---

## Build Order

```
Phase 1: Shared types + PartyKit room skeleton
Phase 2: Deck initialization + server-side shuffle (crypto.getRandomValues)
Phase 3: Lobby + room join flow (player tokens, presence)
Phase 4: Deal + hand distribution + state masking
Phase 5: Board view + pile rendering (static)
Phase 6: Drag-and-drop hand ↔ pile (MOVE_CARD)
Phase 7: Draw from pile (DRAW action, card enters hand)
Phase 8: Flip, shuffle, game controls
Phase 9: Opponent hand display + connection status
Phase 10: Polish — reconnect, error states, undo, reset
```

---

## Sources

- project-brainstorm.md — HIGH confidence (pre-decided by project owner)
- PartyKit documentation (training data, Aug 2025) — MEDIUM confidence — verify hook names at https://docs.partykit.io
- dnd-kit documentation (training data) — MEDIUM confidence — verify at https://docs.dndkit.com
- Cloudflare Workers Web Crypto API — HIGH confidence (WinterCG standard)
