# Phase 14: Gameplay Zone Infrastructure - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 6 (4 modified, 1 new component, 1 new test file)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/types.ts` | model | — | `src/shared/types.ts` (self — extend existing interfaces) | exact |
| `party/index.ts` | service | request-response | `party/index.ts` (self — extend `defaultGameState`, `onConnect`, `onStart`, `viewFor`) | exact |
| `src/components/SpreadZone.tsx` | component | request-response | `src/components/PileZone.tsx` (droppable + toggle) + `src/components/HandZone.tsx` (cascade layout) | exact (composite) |
| `src/components/BoardView.tsx` | component | request-response | `src/components/BoardView.tsx` (self — extend 3-section to 4-section layout) | exact |
| `tests/spreadZoneCreation.test.ts` | test | — | `tests/viewFor.test.ts` (unit test structure) + `tests/moveCard.test.ts` (GameRoom mock setup) | exact |
| `tests/moveCard.test.ts` (extend) | test | — | `tests/moveCard.test.ts` (self — add spread zone cases) | exact |

---

## Pattern Assignments

### `src/shared/types.ts` (model — extend existing interfaces)

**Analog:** `src/shared/types.ts` lines 17–51 (current interface definitions)

**Current `Pile` interface** (lines 17–22):
```typescript
export interface Pile {
  id: string;        // "draw" | "discard" | custom
  name: string;
  cards: Card[];     // top of stack = last element
  faceUp?: boolean;  // whether the pile shows face-up by default
}
```

**Target — add two optional fields:**
```typescript
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
  region?: "pile" | "spread";   // undefined treated as "pile" everywhere
  ownerId?: string | null;      // undefined treated as null; null = communal
}
```

**Current `ClientPile` interface** (lines 26–31):
```typescript
export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
}
```

**Target — mirror the same two fields:**
```typescript
export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
  region?: "pile" | "spread";
  ownerId?: string | null;
}
```

**Current `ClientGameState` interface** (lines 42–51):
```typescript
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  opponentHandCounts: Record<string, number>;
  piles: ClientPile[];
  canUndo: boolean;
}
```

**Target — add `myPlayZoneId`:**
```typescript
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  opponentHandCounts: Record<string, number>;
  piles: ClientPile[];
  canUndo: boolean;
  myPlayZoneId: string;  // "spread-{playerToken}", empty string before first connect
}
```

---

### `party/index.ts` (service — four distinct change sites)

**Analog:** `party/index.ts` — the file itself; patterns are extracted from it and must be applied back to it.

#### Change site 1: `defaultGameState()` — seed communal zone (lines 29–42)

**Current pattern** (lines 35–39):
```typescript
piles: [
  { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false },
  { id: "discard", name: "Discard", cards: [], faceUp: true },
  { id: "play", name: "Play Area", cards: [], faceUp: true },
],
```

**Target — add `region`/`ownerId` to existing piles and seed communal zone:**
```typescript
piles: [
  { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false, region: "pile", ownerId: null },
  { id: "discard", name: "Discard", cards: [], faceUp: true, region: "pile", ownerId: null },
  { id: "play", name: "Play Area", cards: [], faceUp: true, region: "pile", ownerId: null },
  { id: "spread-communal", name: "Communal", cards: [], faceUp: true, region: "spread", ownerId: null },
],
```

#### Change site 2: `onStart()` — migration for existing persisted state (lines 93–107)

**Current migration pattern** (lines 97–106 — Phase 3 and Phase 9 migrations):
```typescript
// Migrate state: Phase 3 had no undoSnapshots; Phase 4-01 had a per-player Record
if (!this.gameState.undoSnapshots || !Array.isArray(this.gameState.undoSnapshots)) {
  this.gameState.undoSnapshots = [];
}
// Migrate state: Phase 9-01 adds displayName to Player
for (const player of this.gameState.players) {
  if (!('displayName' in player)) {
    (player as any).displayName = '';
  }
}
```

**Append after the existing migrations — same `'field' in record` guard pattern:**
```typescript
// Migrate state: Phase 14 adds region and ownerId to Pile
for (const pile of this.gameState.piles) {
  if (!('region' in pile)) {
    (pile as any).region = "pile";
  }
  if (!('ownerId' in pile)) {
    (pile as any).ownerId = null;
  }
}
// Migrate state: Phase 14 adds communal spread zone
const hasCommunal = this.gameState.piles.some(p => p.id === "spread-communal");
if (!hasCommunal) {
  this.gameState.piles.push({
    id: "spread-communal",
    name: "Communal",
    cards: [],
    faceUp: true,
    region: "spread",
    ownerId: null,
  });
}
```

**Key ordering rule:** Field migration (`region`/`ownerId` defaults) MUST run before the communal zone existence check. The pushed communal zone already sets both fields explicitly.

#### Change site 3: `onConnect()` — idempotent personal zone creation (lines 109–136)

**Current idempotency pattern for player registration** (lines 115–116 and 123–132):
```typescript
const isExistingPlayer = this.gameState.players.some(p => p.id === playerToken);
if (!isExistingPlayer && this.gameState.players.length >= 4) { ... }

if (!this.gameState.players.find(p => p.id === playerToken)) {
  this.gameState.players.push({ id: playerToken, connected: true, displayName });
  this.gameState.hands[playerToken] = [];
} else { ... }
```

**Insert after the player registration block, before `await this.persist()` at line 134:**
```typescript
// Create personal spread zone idempotently (Phase 14)
const spreadZoneId = `spread-${playerToken}`;
if (!this.gameState.piles.some(p => p.id === spreadZoneId)) {
  const player = this.gameState.players.find(p => p.id === playerToken);
  this.gameState.piles.push({
    id: spreadZoneId,
    name: player?.displayName || playerToken.slice(0, 8),
    cards: [],
    faceUp: true,
    region: "spread",
    ownerId: playerToken,
  });
}
```

**Pattern note:** Use `pile.id === spreadZoneId` (not `pile.name`) as the idempotency key — display names are mutable, zone IDs are stable.

#### Change site 4: `viewFor()` — expose `region`/`ownerId` and add `myPlayZoneId` (lines 53–76)

**Current `piles` mapping** (lines 65–73):
```typescript
piles: state.piles.map(pile => ({
  id: pile.id,
  name: pile.name,
  faceUp: pile.faceUp,
  cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
    const isTop = i === arr.length - 1;
    return card.faceUp || isTop ? card : { faceUp: false as const };
  }),
})) satisfies ClientPile[],
canUndo: state.undoSnapshots.length > 0,
```

**Target — add `region`, `ownerId`, and `myPlayZoneId`:**
```typescript
piles: state.piles.map(pile => ({
  id: pile.id,
  name: pile.name,
  faceUp: pile.faceUp,
  region: pile.region,
  ownerId: pile.ownerId,
  cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
    const isTop = i === arr.length - 1;
    return card.faceUp || isTop ? card : { faceUp: false as const };
  }),
})) satisfies ClientPile[],
canUndo: state.undoSnapshots.length > 0,
myPlayZoneId: playerToken ? `spread-${playerToken}` : "",
```

---

### `src/components/SpreadZone.tsx` (component, request-response — NEW FILE)

**Composite analog:** `src/components/PileZone.tsx` (droppable, toggle, empty state, `isOver` highlight) + `src/components/HandZone.tsx` (cascade card row rendering)

**Imports pattern** — copy from `PileZone.tsx` lines 1–8, swap unused imports:
```typescript
import { useDroppable } from '@dnd-kit/core';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
```

**Props interface** — mirrors `PileZone` props (lines 10–15), drop `shufflingPileIds` (not needed for spread):
```typescript
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
}
```

**Droppable registration** — copy from `PileZone.tsx` lines 18–21 verbatim (id prefix `pile-` is required by `BoardDragLayer.tsx` `customCollision`):
```typescript
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,
  data: { toZone: 'pile' as const, toId: pile.id },
});
```

**Toggle face handler** — copy from `PileZone.tsx` lines 28–30 verbatim:
```typescript
function handleToggleFace() {
  sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
}
```

**Empty/isOver styling** — copy from `PileZone.tsx` lines 48–53:
```typescript
className={cn(
  'rounded-lg border flex items-center px-2',
  isEmpty ? 'border-dashed' : '',
  isOver ? 'border-primary' : 'border-border',
  'bg-secondary'
)}
```

**Masked card check** — copy from `PileZone.tsx` line 73 pattern (`'id' in (topCard ?? {})`):
```typescript
// For each card in the spread zone:
'id' in card ? (
  <DraggableCard card={card as Card} fromZone="pile" fromId={pile.id} />
) : (
  <CardBack />
)
```

**Cascade card row layout** — adapt from `HandZone.tsx` lines 94–103 (negative margin overlap). SpreadZone uses `-ml-5` (−20px) instead of HandZone's `gap-2` since these are pile cards, not sortable hand cards:
```typescript
<div className="flex items-center overflow-x-auto">
  {pile.cards.map((card, i) => (
    <div key={'id' in card ? (card as Card).id : `masked-${i}`}
         className={cn('flex-shrink-0', i > 0 ? '-ml-5' : '')}>
      {'id' in card ? (
        <DraggableCard card={card as Card} fromZone="pile" fromId={pile.id} />
      ) : (
        <CardBack />
      )}
    </div>
  ))}
</div>
```

**Toggle button** — copy from `PileZone.tsx` lines 78–83 verbatim:
```typescript
<Button
  variant="ghost"
  className="h-7 px-2 text-xs"
  onClick={handleToggleFace}
  title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
>
  {pile.faceUp !== false ? 'Face up' : 'Face down'}
</Button>
```

**`data-testid` convention** — follows `PileZone.tsx` line 47 pattern (`pile-${pile.id}`), but uses `spread-zone-` prefix to distinguish spread zones in Playwright:
```typescript
data-testid={`spread-zone-${pile.id}`}
```

**Zone label** — copy from `PileZone.tsx` lines 43–44:
```typescript
<span className="text-xs text-muted-foreground">{pile.name}</span>
```

**Full component outer structure** — copy flex-col wrapper from `PileZone.tsx` line 43:
```typescript
export function SpreadZone({ pile, sendAction, draggingCardId }: SpreadZoneProps) {
  // ... hooks ...
  const isEmpty = pile.cards.length === 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{pile.name}</span>
      <div
        ref={setNodeRef}
        data-testid={`spread-zone-${pile.id}`}
        className={cn(
          'min-w-[80px] h-[112px] rounded-lg border flex items-center px-2 overflow-x-auto',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border',
          'bg-secondary'
        )}
      >
        {isEmpty ? (
          <span className="text-xs text-muted-foreground">{pile.name}</span>
        ) : (
          // cascade row
        )}
      </div>
      <Button ...toggle... />
    </div>
  );
}
```

**Height:** Use `h-[112px]` matching `PileZone.tsx` (`w-[80px] h-[112px]`). Use `min-w-[80px]` (not fixed width) so the zone expands as cards fan out. Add `overflow-x-auto` for large card counts.

---

### `src/components/BoardView.tsx` (component, request-response — MODIFY)

**Analog:** `src/components/BoardView.tsx` itself — extend the 3-section layout to 4 sections.

**Current imports** (lines 1–9) — add `SpreadZone`:
```typescript
import { SpreadZone } from './SpreadZone';
```

**Current header** (lines 38–75) — remove hard-coded `h-[104px]`, add opponent spread zone rendering:

Current header div (line 38):
```typescript
<div className="h-[104px] flex items-center justify-between px-4 gap-4 bg-card">
```

Target (drop `h-[104px]`, add `py-2`):
```typescript
<div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">
```

Current opponent mapping (lines 40–52) — each opponent is a standalone `<OpponentHand>`. Wrap in a column flex with their personal spread zone below:
```typescript
{Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
  const player = gameState.players.find(p => p.id === id);
  const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
  return (
    <div key={id} className="flex flex-col gap-1">
      <OpponentHand
        playerId={id}
        cardCount={count}
        displayName={player?.displayName ?? ''}
        connected={player?.connected ?? false}
        sendAction={sendAction}
      />
      {opponentSpread && (
        <SpreadZone pile={opponentSpread} sendAction={sendAction} draggingCardId={draggingCardId} />
      )}
    </div>
  );
})}
```

**Current middle section** (lines 77–81) — filter to pile-region piles only:

Current (line 78–80):
```typescript
{gameState.piles.map((pile) => (
  <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} />
))}
```

Target — use `pilePiles` derived variable:
```typescript
const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
const communalZone = spreadPiles.find(p => p.id === 'spread-communal');

// In JSX middle section:
{pilePiles.map((pile) => (
  <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} />
))}
```

**New spread row section** — insert between middle div and HandZone:
```typescript
<div className="flex items-start gap-4 px-4 py-2 bg-card">
  {communalZone && (
    <SpreadZone pile={communalZone} sendAction={sendAction} draggingCardId={draggingCardId} />
  )}
  {mySpreadZone && (
    <SpreadZone pile={mySpreadZone} sendAction={sendAction} draggingCardId={draggingCardId} />
  )}
</div>
```

**Guard pattern for mySpreadZone** — use `mySpreadZone && <SpreadZone .../>` (not non-null assertion). This matches the `player?.displayName ?? ''` guarding pattern throughout `BoardView.tsx`. Zone is absent for a short window between WebSocket connect and first `STATE_UPDATE`.

---

### `tests/spreadZoneCreation.test.ts` (test — NEW FILE)

**Analog:** `tests/viewFor.test.ts` (unit test structure, `makeTestState` factory pattern, `describe`/`it`/`expect` usage) + `tests/moveCard.test.ts` (GameRoom mock setup for `onConnect` testing)

**Imports pattern** — copy from `tests/moveCard.test.ts` lines 1–5:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { Card, GameState } from "../src/shared/types";
import type * as Party from "partykit/server";
```

**Mock helpers** — copy `makeMockRoom` and `makeMockConnection` from `tests/helpers.ts` lines 5–32, or import from helpers:
```typescript
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
```

**`makeTestState` factory pattern** — copy from `tests/viewFor.test.ts` lines 9–29:
```typescript
function makeTestState(): GameState {
  return {
    roomId: "test-room",
    phase: "playing",
    players: [{ id: "player-1", connected: true, displayName: "Alice" }],
    hands: { "player-1": [] },
    piles: [
      { id: "draw", name: "Draw", cards: [], faceUp: false, region: "pile", ownerId: null },
      { id: "spread-communal", name: "Communal", cards: [], faceUp: true, region: "spread", ownerId: null },
    ],
    undoSnapshots: [],
  };
}
```

**`describe`/`it` structure** — follow `tests/viewFor.test.ts` pattern (one `describe` block, plain `it` cases, `expect` matchers):
```typescript
describe("spread zone creation", () => {
  it("defaultGameState includes spread-communal in piles", () => { ... });
  it("viewFor includes myPlayZoneId for a connected player", () => { ... });
  it("viewFor returns empty string myPlayZoneId for null playerToken", () => { ... });
  it("onConnect creates personal spread zone for new player", async () => { ... });
  it("onConnect does not create duplicate zone on reconnect", async () => { ... });
  it("spread zones included in piles array returned by viewFor", () => { ... });
});
```

**`onConnect` mock URL pattern** — copy from `tests/moveCard.test.ts` lines 47–50 (`beforeEach` room setup), and for `onConnect` call use:
```typescript
const mockCtx = {
  request: { url: "http://localhost?player=player-1&name=Alice" },
} as unknown as Party.ConnectionContext;
await room.onConnect(mockConn, mockCtx);
```

---

### `tests/moveCard.test.ts` + `tests/resetTable.test.ts` (extend existing tests)

**Analog:** Each file is extended by appending new `it()` cases to the existing `describe` block — same pattern, no structural changes.

**Pattern for extending moveCard test** — copy the `it("moves card from player hand to named pile")` test (lines 53–80) and adapt `toId` to a spread zone:
```typescript
it("moves card from pile to spread zone", async () => {
  room.gameState.piles.push({
    id: "spread-communal", name: "Communal", cards: [],
    faceUp: true, region: "spread", ownerId: null,
  });
  const card = makeCard("A-s");
  room.gameState.piles.find(p => p.id === "draw")!.cards.push(card);

  await room.onMessage(JSON.stringify({
    type: "MOVE_CARD",
    cardId: "A-s",
    fromZone: "pile",
    fromId: "draw",
    toZone: "pile",
    toId: "spread-communal",
    insertPosition: "top",
  }), sender);

  const spreadPile = room.gameState.piles.find(p => p.id === "spread-communal")!;
  expect(spreadPile.cards).toHaveLength(1);
  expect(spreadPile.cards[0].id).toBe("A-s");
});
```

**Pattern for extending resetTable test** — add spread zone cards to the setup fixture and assert they are cleared:
```typescript
it("RESET_TABLE clears cards from spread zones", async () => {
  room.gameState.piles.push({
    id: "spread-communal", name: "Communal", cards: [makeCard("7-h", true)],
    faceUp: true, region: "spread", ownerId: null,
  });

  await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

  const spreadPile = room.gameState.piles.find(p => p.id === "spread-communal")!;
  expect(spreadPile.cards).toHaveLength(0);
});
```

---

## Shared Patterns

### Droppable zone registration
**Source:** `src/components/PileZone.tsx` lines 18–21
**Apply to:** `SpreadZone.tsx`
```typescript
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,
  data: { toZone: 'pile' as const, toId: pile.id },
});
```
**Critical:** The `pile-` prefix is required. `BoardDragLayer.tsx` filters droppable containers by `String(c.id).startsWith('pile-')` in `customCollision`. Omitting it silently breaks drag-to-spread.

### Isover highlight + empty dashed border
**Source:** `src/components/PileZone.tsx` lines 48–53
**Apply to:** `SpreadZone.tsx` container div
```typescript
cn(
  'rounded-lg border',
  isEmpty ? 'border-dashed' : '',
  isOver ? 'border-primary' : 'border-border',
  'bg-secondary'
)
```

### `SET_PILE_FACE` toggle dispatch
**Source:** `src/components/PileZone.tsx` lines 28–30
**Apply to:** `SpreadZone.tsx`
```typescript
function handleToggleFace() {
  sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
}
```

### Masked card check
**Source:** `src/components/PileZone.tsx` line 73
**Apply to:** `SpreadZone.tsx` per-card rendering
```typescript
'id' in (topCard ?? {})   // true = Card with rank/suit; false = MaskedCard
```
SpreadZone iterates all cards (not just top), so: `'id' in card ? <DraggableCard .../> : <CardBack />`

### `onStart` migration guard
**Source:** `party/index.ts` lines 98–106 (existing Phase 3 and Phase 9 migrations)
**Apply to:** Phase 14 migration block in `onStart()`
```typescript
if (!('fieldName' in record)) {
  (record as any).fieldName = defaultValue;
}
```

### Idempotent existence check
**Source:** `party/index.ts` line 115 (`isExistingPlayer`)
**Apply to:** Phase 14 spread zone creation in `onConnect()`
```typescript
this.gameState.piles.some(p => p.id === spreadZoneId)
```
Check by stable ID field, not mutable name field.

### Unit test `makeTestState` factory
**Source:** `tests/viewFor.test.ts` lines 9–29
**Apply to:** `tests/spreadZoneCreation.test.ts`
Build a minimal `GameState` with only the players and piles relevant to the assertions. Do not use `defaultGameState()` directly in unit tests — it includes a full 52-card deck which adds noise.

### Unit test mock helpers
**Source:** `tests/helpers.ts` lines 5–36
**Apply to:** `tests/spreadZoneCreation.test.ts`
Import `makeMockRoom`, `makeMockConnection`, `makeCard` from `./helpers` rather than redefining them in each test file.

---

## No Analog Found

All files in this phase have close analogs. No files require falling back to RESEARCH.md patterns.

---

## Metadata

**Analog search scope:** `src/components/`, `party/`, `tests/`, `src/shared/`
**Files scanned:** 9 source files read directly
**Pattern extraction date:** 2026-04-24
