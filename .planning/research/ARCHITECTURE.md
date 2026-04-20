# Architecture Patterns — v1.2 Integration

**Project:** Virtual Deck
**Researched:** 2026-04-19
**Scope:** v1.2 new feature integration into existing architecture
**Confidence:** HIGH for server-side patterns (code verified), MEDIUM for Playwright patterns (docs reviewed, not yet in-repo)

---

## Current Architecture (v1.1 Baseline)

```
GitHub Pages (Static)
┌──────────────────────────────────────────────────────────┐
│  React 18 + Vite                                         │
│                                                          │
│  App.tsx → RoomView → LobbyPanel | BoardDragLayer        │
│                                                          │
│  BoardDragLayer                                          │
│  └─ DndContext (dnd-kit, customCollision)                │
│     └─ BoardView                                         │
│        ├─ OpponentHand × N (card counts, pass target)   │
│        ├─ PileZone × N    (droppable, shows top card)   │
│        └─ HandZone        (sortable, local player only) │
│                                                          │
│  Hooks: usePartySocket (WS + drag buffer)               │
│         usePlayerId (localStorage stable token)          │
└──────────────────────┬───────────────────────────────────┘
                       │ WSS ?player=<token>&name=<name>
┌──────────────────────▼───────────────────────────────────┐
│  PartyKit Cloud (Cloudflare Edge)                        │
│                                                          │
│  party/index.ts — GameRoom class                         │
│  ├─ onStart()     — restore from Durable Objects storage │
│  ├─ onConnect()   — stable token, displayName, 4-cap     │
│  ├─ onMessage()   — validate + mutate GameState          │
│  ├─ onClose()     — mark disconnected                    │
│  ├─ viewFor()     — mask per-connection before send      │
│  └─ broadcastState() — per-connection send (not room.broadcast)
│                                                          │
│  In-memory GameState (persisted to Durable Objects)      │
│  { roomId, phase, players[], hands{}, piles[], undoSnapshots[] }
└──────────────────────────────────────────────────────────┘

Shared types: src/shared/types.ts (imported by both sides)
```

### Confirmed Constraints From Code Review

- `MOVE_CARD` handler looks up zones in `piles[]` only (no concept of "zone" beyond pile and hand)
- `fromZone` and `toZone` are typed `"hand" | "pile"` — zone type is a string enum, not a separate array
- `piles[]` in `GameState` is a flat array; zone routing is purely by `pile.id`
- `defaultGameState` initializes 3 piles: draw, discard, play (the "play" pile is generic, not per-player)
- `viewFor()` maps all piles identically — no per-player visibility filtering exists for piles
- `RESET_TABLE` gathers all non-draw piles back to draw, including any future play zones
- Existing unit tests treat both senders as remote (no "local player" mock concept)

---

## Integration Point 1: Personal Play Area Zones

### What's Needed

A dedicated zone per player where they can place cards face-up, visible to all. Cards in this zone are public (not masked). The owner can move cards in/out; any player can see them.

### GameState Change (Minimal-Diff Approach)

The cleanest fit for the existing architecture: personal play zones are just piles with a naming convention and an `ownerId` field. They live in `piles[]` like everything else.

**New field on `Pile` (server + shared types):**
```typescript
export interface Pile {
  id: string;       // e.g. "play-<playerId>" for personal zones
  name: string;
  cards: Card[];
  faceUp?: boolean;
  ownerId?: string; // NEW: undefined = shared/communal, playerId = personal zone
}
```

**New field on `ClientPile`:**
```typescript
export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
  ownerId?: string; // NEW: passed through from server, UI uses to render label
}
```

**defaultGameState change:** Do NOT add personal zones in `defaultGameState`. Personal play zones are created dynamically when a player connects (or on first join), so they scale to 2–4 players correctly.

**Server: add zone on player join (in `onConnect`):**
```typescript
// After adding player to gameState.players:
if (!this.gameState.piles.find(p => p.id === `play-${playerToken}`)) {
  this.gameState.piles.push({
    id: `play-${playerToken}`,
    name: `${displayName}'s play area`,
    cards: [],
    faceUp: true,
    ownerId: playerToken,
  });
}
```

**No changes needed to:**
- `MOVE_CARD` handler — it already accepts any valid pile id as `toId`
- `viewFor()` — personal zone piles are fully public (faceUp: true cards are never masked)
- `RESET_TABLE` — already gathers all non-draw piles; will sweep personal zones too (correct behavior)

**New `ClientGameState` field for convenience:**
```typescript
export interface ClientGameState {
  // ... existing fields
  myPlayZoneId: string; // NEW: "play-<myPlayerId>" — lets client locate own zone without string-building
}
```

### Authorization Concern

Currently `MOVE_CARD` allows any player to move cards from any pile to any pile. Personal zones should probably allow anyone to rearrange face-up cards (consistent with "no rule enforcement" principle). No authorization change needed unless the product requirement is to restrict who can move cards out of a personal zone — which it isn't.

---

## Integration Point 2: Shared Communal Zone

### What's Needed

A single zone on the table any player can place and interact with cards. This is simpler than personal zones.

### GameState Change

Add a single pile with `id: "communal"` to `defaultGameState`:

```typescript
{ id: "communal", name: "Communal", cards: [], faceUp: true }
```

No `ownerId` needed (undefined = communal). No schema changes beyond the `ownerId` field described above. No server logic changes.

### Board Layout

`BoardView` currently renders `gameState.piles.map(pile => <PileZone />)` in a flat row. With personal zones added dynamically, this needs layout logic:

- Communal zone: center of table row
- Draw pile + discard: left side (existing)
- Personal play areas: below each opponent's hand display, or in a separate row

**Approach:** Pass a `zoneLayout` classification to `BoardView` and split the pile array into regions. Or add a `region` field to `Pile` (simpler than layout logic in React).

**Recommended: layout-by-region approach** — add `region?: "table" | "player"` to `Pile`. Server sets it. `BoardView` splits `piles` into table piles and player piles and renders them in separate DOM regions.

---

## Integration Point 3: Played Card Sets (Multi-Card Move)

### What's Needed

Player selects 1–5 cards from hand and plays them as a set into a zone in a single atomic server action. The server receives the whole set and moves all cards at once.

### New ClientAction

```typescript
| {
    type: "PLAY_CARD_SET";
    cardIds: string[];       // 1–5 card IDs from sender's hand
    toZone: "pile";
    toId: string;            // target pile id (personal zone or communal)
  }
```

**Server handler:**
- Validate: all `cardIds` present in `hands[senderToken]`
- Validate: `cardIds.length` between 1 and 5
- Validate: `toId` is a valid pile
- `takeSnapshot` once before the whole set move (not per card)
- Splice all cards from hand, push all to destination pile
- `broadcastState()` once after all cards moved

This is atomic: either all cards move or none do. The single snapshot enables undo of the entire play.

### dnd-kit Multi-Card Selection Integration

dnd-kit has no native multi-select drag. The confirmed approach used in the community (MEDIUM confidence):

**Selection state lives in zustand (client UI state):**
```typescript
// In zustand UI store (not game state):
selectedCardIds: Set<string>
toggleCardSelection: (cardId: string) => void
clearSelection: () => void
```

**Interaction model (no dnd-kit drag for multi-card):**
Multi-card play via drag is complex with dnd-kit and unnecessary for this use case. The cleaner approach:

1. Click to select cards (toggle selection state in zustand)
2. "Play selected" button appears when 1+ cards selected and player is viewing their hand
3. Button click sends `PLAY_CARD_SET` action with `selectedCardIds` array
4. On server response, `clearSelection()`

**Single-card drag to play zone still works via existing `MOVE_CARD` drag flow.** The multi-card path is a separate selection+button UI, not a drag UI.

**Why not drag multi-select?**
- dnd-kit issues/120 and discussions/1313 confirm there's no first-class multi-drag API
- The workaround (track selected, move all on dragEnd) requires significant collision detection changes
- "Play a set" is semantically a deliberate action, not a fluid drag — button is the right affordance
- Existing drag UX for single cards is unchanged

**SortableHandCard changes:** Add click handler for selection toggle. Add visual indicator (ring/border) when `selectedCardIds.has(card.id)`. Selection clears on drag start to avoid ambiguity.

### PLAY_CARD_SET Authorization

Same check as MOVE_CARD: sender's token must match `fromId` (all cards must be in sender's own hand). Server already validates card ownership by comparing senderToken to hands key.

---

## Integration Point 4: Playwright E2E Test Suite

### Two-Player Test Pattern

Playwright supports multiple browser contexts in a single test. Each context is isolated (separate localStorage, separate WebSocket connection). This maps directly to two players in the same PartyKit room.

**Correct pattern:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: [
    {
      command: 'npm run dev',   // starts partykit dev (port 1999) + vite (port 5173)
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
});
```

**Note:** `npm run dev` runs `partykit dev` which serves both the PartyKit server (port 1999) and the Vite frontend (port 5173) in one process. Both must be running for e2e tests. The `webServer` config handles this.

**Two-player fixture:**
```typescript
// tests/e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

type TwoPlayerFixture = {
  player1: { context: BrowserContext; page: Page };
  player2: { context: BrowserContext; page: Page };
  roomId: string;
};

export const test = base.extend<TwoPlayerFixture>({
  player1: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use({ context, page });
    await context.close();
  },
  player2: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use({ context, page });
    await context.close();
  },
  roomId: async ({}, use) => {
    await use(`test-room-${Date.now()}`);
  },
});

export { expect };
```

**Example test:**
```typescript
test('both players see deal result', async ({ player1, player2, roomId }) => {
  const url = `http://localhost:5173/?room=${roomId}`;
  await player1.page.goto(url);
  await player2.page.goto(url);
  // ... fill name input, join, deal, assert
});
```

Each context has its own localStorage, so `getOrCreatePlayerId()` generates a different stable token per context — correctly modeling two distinct players.

### Test Setup Fix: "Local Player" Concept

**The bug:** Current unit tests in `tests/*.test.ts` create mock connections where `connection.state = { playerToken: id }` directly. This skips the `onConnect` flow entirely. Both players are treated as if they connected with their `connection.id` as token, with no `?player=` URL param processing.

**Root cause (from code review):** `makeMockConnection` in test helpers sets `state: { playerToken: id }`, bypassing the real `onConnect` which reads `?player=` from the URL and calls `connection.setState({ playerToken })`. Tests that need `senderToken` matching work accidentally because they set token = connection.id and also set `fromId` = same value.

**Fix for unit tests:** The fix is cosmetic/clarifying rather than behavioral — existing logic in tests is correct. The missing concept is: unit tests should always go through `onConnect` for at least one player (the "local" player whose actions are being tested). Tests that call `onMessage` directly should set up state via `onConnect` first, not by manually patching `gameState`.

**For Playwright e2e:** No "local player" concept is needed in the browser — each `BrowserContext` IS the local player from that context's perspective. The existing `usePlayerId` hook (localStorage) generates the stable token, and `LobbyPanel` gates connection until a name is entered. Both are correct behaviors to test through.

### Playwright MCP Server

The official Microsoft `@playwright/mcp` package (not `mcp-playwright` by executeautomation — that's a third party) provides Claude Code with browser automation tools.

**Integration:** Add to `.claude/mcp.json` or the project's `claude.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

The MCP server runs locally (stdio transport). It connects to whatever URL you navigate to. For dev sessions, point it at `http://localhost:5173/?room=<test-room-id>` after `npm run dev` is running. The MCP server opens a browser, so the dev server must be running independently.

**Note:** `@playwright/mcp` uses the accessibility tree, not screenshots. This works correctly with React + shadcn components that use proper ARIA roles. The pile zone droppables and card draggables use dnd-kit which does set ARIA attributes — these will be navigable. Confirm specific role names during implementation.

---

## Component Changes Summary

### New / Modified Components

| Component | Status | Change |
|-----------|--------|--------|
| `src/shared/types.ts` | Modified | Add `ownerId?: string` and `region?: string` to `Pile`/`ClientPile`; add `myPlayZoneId` to `ClientGameState`; add `PLAY_CARD_SET` to `ClientAction` |
| `party/index.ts` | Modified | `onConnect`: create personal play zone; add `PLAY_CARD_SET` handler; update `viewFor` to include `myPlayZoneId`; update `RESET_TABLE` migration guard |
| `party/index.ts` | Modified | `defaultGameState`: add communal zone pile |
| `src/components/BoardView.tsx` | Modified | Split piles into table region + player region; render personal zones near opponent hands |
| `src/components/HandZone.tsx` | Modified | Add card selection on click; show selection visual; show "Play selected" button when selection non-empty |
| `src/components/BoardDragLayer.tsx` | Modified | Register new droppable zone IDs (personal zones, communal) in collision detection; these are just piles so minimal change |
| `src/components/PlayZone.tsx` | New | Renders a personal play area zone — shows face-up cards in a spread layout, player name label, droppable |
| `src/hooks/useSelection.ts` | New | Zustand slice or simple React state for card selection; `selectedCardIds: Set<string>`, `toggleCard`, `clearAll` |
| `tests/e2e/` | New directory | Playwright e2e tests |
| `tests/e2e/fixtures.ts` | New | Two-player browser context fixture |
| `playwright.config.ts` | New | Playwright config with webServer for partykit dev + vite |

### Unchanged Components

- `src/components/PileZone.tsx` — personal zones and communal use the same `PileZone` or a thin variant; no logic changes to the pile drop/flip/shuffle mechanics
- `src/components/DraggableCard.tsx` — single-card drag mechanics unchanged
- `src/hooks/usePartySocket.ts` — no changes; `sendAction` is already generic
- `src/hooks/usePlayerId.ts` — unchanged

---

## Data Flow Changes

### New: PLAY_CARD_SET Flow

```
User: selects cards in HandZone (click to toggle)
  → useSelection.toggleCard(cardId)
  → HandZone shows "Play N cards" button

User: clicks "Play N cards" button, selects target zone
  → sendAction({ type: 'PLAY_CARD_SET', cardIds: [...], toId: 'play-<playerId>' })
  → PartyKit onMessage: PLAY_CARD_SET handler
      → validate all cardIds in hands[senderToken]
      → takeSnapshot() once
      → splice all cards from hand into target pile
      → persist + broadcastState()
  → STATE_UPDATE received
  → useSelection.clearAll()
  → React re-renders HandZone (cards gone) + PlayZone (cards appeared)
```

### Modified: Personal Zone Creation Flow

```
Player connects (onConnect):
  → server creates play-<playerToken> pile if not exists
  → persist + broadcastState()
  → all clients receive updated piles[] including new zone
  → BoardView splits piles by ownerId, renders personal zones in player section
```

---

## Build Order Recommendation

The GameState shape change is the single critical dependency. Everything else fans out from it.

```
Step 1: types.ts — add ownerId, region, myPlayZoneId, PLAY_CARD_SET (no behavior)
Step 2: party/index.ts — personal zone on connect, communal in defaultGameState, PLAY_CARD_SET handler
        (unit tests should still pass; add new unit tests for PLAY_CARD_SET)
Step 3: BoardView layout — split piles by region/ownerId, render personal + communal zones
        (new PlayZone component)
Step 4: HandZone selection + "Play" button → PLAY_CARD_SET dispatch
Step 5: Playwright config + fixture + first e2e test (join flow, two players)
Step 6: Additional e2e tests (deal, play set, zone visibility)
Step 7: Playwright MCP server config (dev tooling, not a code deliverable)
```

Steps 1–2 must complete before Steps 3–4. Step 5 can start after Step 2 (server must exist for real WebSocket tests). Steps 6–7 are independent of each other.

---

## Anti-Patterns to Avoid

### Separate "zones" array in GameState

Adding `zones: Zone[]` alongside `piles: Pile[]` would require duplicating all the MOVE_CARD routing, viewFor masking, and RESET_TABLE logic. Personal zones ARE piles with an `ownerId`. Reuse the pile infrastructure.

### dnd-kit multi-drag for PLAY_CARD_SET

dnd-kit has no first-class multi-drag. Community workarounds require overriding collision detection and tracking selection during drag, adding ~200 LOC of brittle DragOverlay composition. The button-based approach (select → play) is cleaner and more discoverable.

### Personal zone created client-side

The zone must be server-created (in onConnect) so all connected players receive it via broadcastState. A client creating a zone locally breaks state consistency and would be overwritten on next STATE_UPDATE.

### Playwright webServer pointing at Vite only

`partykit dev` starts both the PartyKit server (ws://localhost:1999) and the Vite frontend (http://localhost:5173) in one process. The webServer config's `command` must be `npm run dev` (not `npm run dev:client`). Tests that navigate to the frontend but have no PartyKit server will fail on WebSocket connect.

### Zone name embedded in ID

`play-<playerToken>` makes the zone discoverable from a player token. This is intentional. The alternative (opaque IDs) requires a separate lookup mechanism. Use the convention consistently.

---

## Scalability Note

At 2–4 players, personal zones add at most 4 piles to `piles[]`. The full state snapshot stays under 10 KB. No pagination or lazy loading concerns.

---

## Sources

- `/Users/aaronkaminsky/code/virtual-deck/src/shared/types.ts` — HIGH confidence (code)
- `/Users/aaronkaminsky/code/virtual-deck/party/index.ts` — HIGH confidence (code)
- `/Users/aaronkaminsky/code/virtual-deck/src/components/BoardDragLayer.tsx` — HIGH confidence (code)
- `/Users/aaronkaminsky/code/virtual-deck/src/components/HandZone.tsx` — HIGH confidence (code)
- `/Users/aaronkaminsky/code/virtual-deck/tests/*.test.ts` — HIGH confidence (code)
- Playwright browser-contexts docs (WebSearch verified) — MEDIUM confidence
- Playwright webServer config (WebSearch verified) — MEDIUM confidence
- dnd-kit multi-select issues #120 and discussion #1313 (WebSearch verified) — MEDIUM confidence
- `@playwright/mcp` Microsoft official package (WebSearch verified) — MEDIUM confidence
