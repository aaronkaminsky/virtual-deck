# Phase 14: Gameplay Zone Infrastructure - Research

**Researched:** 2026-04-24
**Domain:** React/TypeScript component authoring, PartyKit server state extension, dnd-kit droppable zones
**Confidence:** HIGH — all findings are based on direct codebase inspection of the live source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Spread zones are `Pile` records with two new fields: `ownerId: string | null` and `region: "spread" | "pile"`. `ownerId = null` for the communal zone; `ownerId = playerToken` for personal zones.
- **D-02:** `ClientGameState` gains `myPlayZoneId: string` — the pile ID of the current player's personal spread zone.
- **D-03:** No parallel `zones[]` collection. `MOVE_CARD`, `viewFor`, `RESET_TABLE`, and `UNDO_MOVE` all continue working with piles unchanged (spread zones are just piles with a different `region`).
- **D-04:** Existing `Pile` records (`draw`, `discard`, `play`) implicitly have `region: "pile"` after migration (defaulted in `onStart`).
- **D-05:** Personal spread zone created in `onConnect` when a player joins for the first time. Zone ID format: `spread-{playerToken}`. Check is idempotent — if the zone already exists in `piles[]`, do not create a duplicate (satisfies SC-4).
- **D-06:** The communal spread zone (`id: "spread-communal"`, `ownerId: null`) is seeded in `defaultGameState()` alongside the existing Draw/Discard/Play piles (satisfies SC-2).
- **D-07:** Personal spread zones persist across disconnects (like all server state). `RESET_TABLE` clears cards from all piles including spread zones — zones themselves remain (no deletion).
- **D-08:** `onStart` migration: existing `Pile` records without `region` or `ownerId` fields get `region: "pile"` and `ownerId: null` defaults applied.
- **D-09:** BoardView restructures to 4 sections: (1) Header auto-height: opponent hands + their spread zones; (2) Middle flex-1: existing piles only; (3) Spread row new section auto-height: Communal + my personal zone; (4) Bottom: my HandZone unchanged.
- **D-10:** Opponent spread zones render inside the header section, each directly below its owner's `OpponentHand`. Layout: column (hand on top, spread zone below).
- **D-11:** The spread row (communal + my zone) lives between the middle piles and my hand. Rendered as a flex row with gap.
- **D-12:** Cards in a spread zone use an overlapping cascade layout — same visual style as HandZone. Any card is individually draggable (not just the top card).
- **D-13:** Empty spread zone shows a dashed-border placeholder with the zone label.
- **D-14:** New `SpreadZone` component (parallel to `PileZone`) handles the spread layout. Does not reuse `PileZone` internals.
- **D-15:** Face-up/face-down toggle button on each spread zone.
- **D-16:** Any player can drag cards to/from any spread zone and toggle face direction on any spread zone. No owner-restriction.

### Claude's Discretion

- Exact CSS for the spread card cascade (overlap amount, min zone width, max zone width)
- Whether the spread row section has a visible separator/border from the middle piles section
- Hover/drop highlight style for spread zones (reuse `isOver ? 'border-primary' : 'border-border'` from PileZone)
- Whether opponent spread zones show when empty or only render when non-empty (recommend: always visible as empty placeholder once player is connected)

### Deferred Ideas (OUT OF SCOPE)

- Multi-card drag from spread zones — dnd-kit multi-drag deferred to v1.3+
- Zone deletion when a player permanently leaves
- Scrollable spread zone for large card counts
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | Each connected player has a personal spread zone — all cards visible simultaneously (fanned/spread, not stacked), with a face-up/face-down toggle control like existing piles | SpreadZone component renders all ClientPile cards as DraggableCard, not just top; toggle via SET_PILE_FACE |
| PLAY-02 | A shared communal spread zone exists on the table — all cards visible simultaneously, with a face-up/face-down toggle; any player can place or move cards | Communal zone seeded in defaultGameState(); same SpreadZone component, no ownership restriction |
</phase_requirements>

---

## Summary

Phase 14 adds two types of spread zones — personal (one per connected player) and communal (one global) — built entirely on top of the existing `piles[]` infrastructure. The work touches four layers: (1) type definitions in `src/shared/types.ts`, (2) server logic in `party/index.ts`, (3) a new `SpreadZone` component, and (4) a BoardView restructure from 3 to 4 sections.

The existing MOVE_CARD, UNDO_MOVE, and RESET_TABLE server handlers require **no logic changes** — they already iterate all piles by ID without caring about pile type. RESET_TABLE already loops `for (const pile of this.gameState.piles)` and clears non-draw piles; spread zones will be included automatically. The only server changes are: adding fields to the `Pile` type, seeding the communal zone in `defaultGameState()`, creating personal zones in `onConnect()`, adding the `onStart()` migration, and extending `viewFor()` to populate `myPlayZoneId`.

The key implementation challenge is the `SpreadZone` component, which must render all cards as individually draggable (not just the top card), use an overlapping cascade layout, and act as a droppable target. The visual model is `HandZone.tsx` for the card layout and `PileZone.tsx` for the droppable + toggle button patterns.

**Primary recommendation:** Build SpreadZone as a new component that combines `useDroppable` from dnd-kit with a flex row of `DraggableCard` items. The card size is 63×88px (same as all other zones). Use a negative left margin of `−20px` per card after the first to create the cascade overlap, matching HandZone's approach of `−ml-3` (−12px) but with more breathing room since spread zones are not hand-width constrained.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Spread zone state storage | API / Backend (PartyKit) | — | Zone cards live in `piles[]` on server; server is authoritative |
| Personal zone creation (idempotent) | API / Backend (PartyKit `onConnect`) | — | Must be server-side to prevent race conditions on reconnect |
| Communal zone seeding | API / Backend (PartyKit `defaultGameState`) | — | Seeded once at room creation; persisted server-side |
| myPlayZoneId computation | API / Backend (PartyKit `viewFor`) | — | Server knows which pile belongs to the requesting player |
| Spread zone rendering (fan layout) | Browser / Client (SpreadZone component) | — | Pure display; CSS cascade computed client-side |
| Drop target registration | Browser / Client (dnd-kit `useDroppable`) | — | dnd-kit collision detection is client-side only |
| Face toggle dispatch | Browser / Client → API | — | Client sends SET_PILE_FACE; server updates pile.faceUp |
| Board layout (4 sections) | Browser / Client (BoardView) | — | Layout restructure is purely client-side |
| MOVE_CARD routing to spread zones | API / Backend (unchanged) | — | Already finds pile by ID; no routing changes needed |

---

## Standard Stack

### Core (all verified in codebase)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @dnd-kit/core | installed (see package.json) | `useDroppable` for spread zone drop targets, `useDraggable` for individual card drag | [VERIFIED: src/components/PileZone.tsx, DraggableCard.tsx] |
| React + TypeScript | 18.x / 5.x | Component authoring, type-safe props | [VERIFIED: codebase throughout] |
| Tailwind CSS v4 | (via @tailwindcss/vite) | Cascade layout, flex layout for BoardView 4-section restructure | [VERIFIED: vite.config.ts] |

No new libraries are needed for this phase. All capabilities required (droppable zones, card drag, layout) are provided by the existing stack.

---

## Architecture Patterns

### System Architecture Diagram

```
onConnect(playerToken)
  │
  ├── Is spread-{token} already in piles[]?
  │     YES → skip (idempotent)
  │     NO  → push { id: "spread-{token}", ownerId: token, region: "spread", cards: [] }
  │
  └── persist() → broadcastState()
                        │
                        ▼
                  viewFor(state, token)
                        │
                        ├── piles: ALL piles (including spread) mapped to ClientPile
                        └── myPlayZoneId: "spread-{token}"
                                    │
                                    ▼
                          ClientGameState → WebSocket → Client
                                    │
                          BoardView (4 sections)
                          ┌─────────────────────────────┐
                          │ Header (auto-height)         │
                          │  OpponentHand + SpreadZone   │
                          │  (per opponent, column flex) │
                          ├─────────────────────────────┤
                          │ Middle (flex-1)              │
                          │  PileZone × 3 (unchanged)   │
                          ├─────────────────────────────┤
                          │ Spread Row (auto-height)     │
                          │  SpreadZone communal         │
                          │  SpreadZone my personal      │
                          ├─────────────────────────────┤
                          │ Bottom (auto-height)         │
                          │  HandZone (unchanged)        │
                          └─────────────────────────────┘
                                    │
                          MOVE_CARD action (drag drop)
                                    │
                          Server: find pile by toId → push card
                          (spread-communal and spread-{token}
                           both found via piles.find(p => p.id === toId))
```

### Component Responsibilities

| Component | File | Role |
|-----------|------|------|
| SpreadZone | `src/components/SpreadZone.tsx` (NEW) | Fan layout, droppable, toggle button, all cards as DraggableCard |
| BoardView | `src/components/BoardView.tsx` (MODIFIED) | 4-section layout; filter piles by region; pass spread zones to header/spread row |
| PileZone | `src/components/PileZone.tsx` (unchanged) | Remains for draw/discard/play piles only |
| HandZone | `src/components/HandZone.tsx` (unchanged) | Reference for cascade visual style |
| DraggableCard | `src/components/DraggableCard.tsx` (unchanged) | Used in SpreadZone for each card |

### Recommended Project Structure

```
src/
├── components/
│   ├── SpreadZone.tsx     # NEW — spread layout droppable
│   ├── BoardView.tsx      # MODIFIED — 4-section layout
│   └── ...                # all others unchanged
├── shared/
│   └── types.ts           # MODIFIED — Pile + ClientPile + ClientGameState
party/
└── index.ts               # MODIFIED — defaultGameState, onConnect, onStart, viewFor
```

---

## Exact Code Changes Required

### 1. `src/shared/types.ts` — Type Changes

**Current `Pile` interface:**
```typescript
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
}
```

**Add two optional fields** (optional preserves backwards compatibility with migration default):
```typescript
export interface Pile {
  id: string;
  name: string;
  cards: Card[];
  faceUp?: boolean;
  region?: "pile" | "spread";    // undefined treated as "pile" in client code
  ownerId?: string | null;       // undefined treated as null
}
```

**Current `ClientPile` interface:**
```typescript
export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
}
```

**Mirror the same fields on ClientPile:**
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

**Current `ClientGameState`:**
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

**Add `myPlayZoneId`:**
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
  myPlayZoneId: string;   // "spread-{playerToken}", empty string before first onConnect
}
```

[VERIFIED: src/shared/types.ts — current interface shapes confirmed by direct inspection]

---

### 2. `party/index.ts` — Server Changes

#### 2a. `defaultGameState()` — Seed communal zone

**Current:**
```typescript
piles: [
  { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false },
  { id: "discard", name: "Discard", cards: [], faceUp: true },
  { id: "play", name: "Play Area", cards: [], faceUp: true },
],
```

**Change to:**
```typescript
piles: [
  { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false, region: "pile", ownerId: null },
  { id: "discard", name: "Discard", cards: [], faceUp: true, region: "pile", ownerId: null },
  { id: "play", name: "Play Area", cards: [], faceUp: true, region: "pile", ownerId: null },
  { id: "spread-communal", name: "Communal", cards: [], faceUp: true, region: "spread", ownerId: null },
],
```

#### 2b. `onStart()` — Migration for existing state

After the existing `displayName` migration block:
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
// Migrate state: Phase 14 adds communal spread zone to defaultGameState
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

#### 2c. `onConnect()` — Idempotent personal zone creation

After the existing player registration block (after `this.gameState.players.push(...)` / reconnect block), before `await this.persist()`:
```typescript
// Create personal spread zone idempotently (Phase 14)
const spreadZoneId = `spread-${playerToken}`;
const hasSpreadZone = this.gameState.piles.some(p => p.id === spreadZoneId);
if (!hasSpreadZone) {
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

**Important:** The spread zone `name` uses `displayName` for the label visible in the UI. However, `displayName` may be updated on reconnect (the existing `if (displayName) player.displayName = displayName` block). The spread zone name will show the name from first connect — this is acceptable for v1.2 (renaming zones on reconnect is out of scope).

#### 2d. `viewFor()` — Add `myPlayZoneId` and pass region/ownerId to ClientPile

**Current piles mapping:**
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
```

**Change to expose region/ownerId and add myPlayZoneId:**
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
myPlayZoneId: playerToken ? `spread-${playerToken}` : "",
```

**Note on masking:** Spread zones are fully public — cards in spread zones are face-up or face-down based on `pile.faceUp`, and any card can be revealed. The existing masking logic (only top card reveals rank/suit when face-down) will apply to spread zones too. Since spread zones default to `faceUp: true` and are intended to show all cards, this is correct behavior — all cards in a faceUp spread zone will pass the `card.faceUp || isTop` check.

[VERIFIED: party/index.ts — current defaultGameState, onConnect, onStart, viewFor confirmed by direct inspection]

---

### 3. `SpreadZone` Component — New File

**File:** `src/components/SpreadZone.tsx`

**Key design decisions (Claude's discretion):**

**Card cascade CSS:** Use a flex row with negative left margin. Each card after the first gets `-ml-5` (−20px), giving a tighter overlap than HandZone's `-ml-3` (−12px), but enough to see rank/suit on all cards. Cards are `63px` wide with `88px` height (same as everywhere in the codebase). The zone container should have a minimum width to be meaningful as a drop target when empty.

**Drop target:** Use `useDroppable` with `id: \`pile-${pile.id}\`` to match the existing droppable ID convention used by PileZone. The `data` payload is `{ toZone: 'pile' as const, toId: pile.id }` — this is what the `BoardDragLayer` `handleDragEnd` reads. The existing `customCollision` in `BoardDragLayer.tsx` filters droppables starting with `pile-` for pile drop detection.

**CollisionDetection note:** `BoardDragLayer.tsx` uses `customCollision` which routes to `pointerWithin` for pile containers (those with IDs starting `pile-`). SpreadZone droppable IDs following `pile-${pile.id}` convention will be treated as piles — pointer must be inside the zone rect to register. This is the correct behavior.

**Insert position dialog:** When a card is dropped on a spread zone with existing cards, `BoardDragLayer.handleDragEnd` will show the Top/Bottom/Random dialog (because `toZone === 'pile'` and `isEmpty === false`). This is acceptable for v1.2; the dialog prevents accidental overwrites.

**Approximate component structure:**
```typescript
// Source: codebase inspection of PileZone.tsx + HandZone.tsx patterns
import { useDroppable } from '@dnd-kit/core';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { DraggableCard } from './DraggableCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
}

export function SpreadZone({ pile, sendAction, draggingCardId }: SpreadZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

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
          <div className="flex items-center">
            {pile.cards.map((card, i) => (
              'id' in card ? (
                <div key={card.id} className={cn('flex-shrink-0', i > 0 ? '-ml-5' : '')}>
                  <DraggableCard
                    card={card as Card}
                    fromZone="pile"
                    fromId={pile.id}
                  />
                </div>
              ) : null  // masked cards (face-down in face-down pile): show CardBack
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={handleToggleFace}
        title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
      >
        {pile.faceUp !== false ? 'Face up' : 'Face down'}
      </Button>
    </div>
  );
}
```

**Masked card handling:** When `pile.faceUp` is false, cards that are not the top card arrive as `{ faceUp: false }` (a `MaskedCard`). The spread zone should render these as `CardBack`. The example above shows the `'id' in card` check — use this pattern. Full implementation should handle both branches.

[VERIFIED: PileZone.tsx uses `'id' in (topCard ?? {})` for same masking check — confirmed by direct inspection]

---

### 4. `BoardView.tsx` — 4-Section Layout

**Current layout (3 sections):**
```
h-screen flex flex-col
  └── Header: h-[104px] flex items-center
  └── Middle: flex-1 flex items-center justify-center   ← piles[]
  └── HandZone (fixed height ~128px)
```

**New layout (4 sections):**
```
h-screen flex flex-col
  └── Header: flex items-center (auto-height, NOT fixed 104px)
       ├── flex items-center gap-2 flex-1 overflow-x-auto  ← opponents (column flex each)
       │    OpponentHand + SpreadZone (their personal zone)
       └── Copy link + Controls
  └── Middle: flex-1 flex items-center justify-center   ← pile-region piles only
  └── Spread Row: flex items-center gap-4 px-4 py-2     ← communal + my personal
  └── HandZone (unchanged)
```

**Key implementation details for BoardView:**

1. **Filtering piles by region:** The client now receives all piles including spread zones. BoardView must filter them:
   ```typescript
   const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
   const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
   const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
   const communalZone = spreadPiles.find(p => p.id === 'spread-communal');
   const opponentSpreadZones = spreadPiles.filter(
     p => p.ownerId !== null && p.ownerId !== gameState.myPlayerId
   );
   ```

2. **Opponent header layout:** Each opponent needs a `flex flex-col` wrapper containing their `OpponentHand` and their personal `SpreadZone`. The opponent's spread zone ID is `spread-{opponentId}`.
   ```typescript
   {Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
     const player = gameState.players.find(p => p.id === id);
     const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
     return (
       <div key={id} className="flex flex-col gap-1">
         <OpponentHand ... />
         {opponentSpread && <SpreadZone pile={opponentSpread} ... />}
       </div>
     );
   })}
   ```

3. **Header height:** The header currently has a hard-coded `h-[104px]`. This must be removed — replaced with padding/auto-height. With opponent cards (59px CardBack height) plus their spread zone (112px) plus labels, the header in a 2-player game will be roughly 190px. On a 1080px screen this leaves approximately 890px for middle+spread+hand, which is workable.

4. **Spread row:** The spread row sits between middle piles and HandZone:
   ```typescript
   <div className="flex items-start gap-4 px-4 py-2">
     {communalZone && <SpreadZone pile={communalZone} ... />}
     {mySpreadZone && <SpreadZone pile={mySpreadZone} ... />}
   </div>
   ```

5. **Height budget check:** Fixed heights in the layout:
   - HandZone: `h-[128px]` (fixed, unchanged)
   - Cards are `88px` tall
   - SpreadZone container: `h-[112px]` (matches PileZone height)
   - Spread row: 112px + ~16px padding = ~128px
   - Header (auto-height, 2-player): ~190px
   - Middle (flex-1): takes all remaining space
   
   On a 900px viewport height: 128px (hand) + 128px (spread row) + 190px (header) = 446px consumed by fixed sections. Middle gets 454px — plenty for the 112px PileZone cards. On 768px viewport (laptop): 768 - 446 = 322px for middle — still fine for the 112px PileZone with `items-center` centering.

[VERIFIED: BoardView.tsx current layout confirmed by direct inspection. HandZone `h-[128px]` confirmed from HandZone.tsx]

---

### 5. MOVE_CARD / UNDO_MOVE / RESET_TABLE — Action Handler Analysis

**MOVE_CARD** (party/index.ts lines 157–240):
- Finds source by `fromId` using `this.gameState.piles.find(p => p.id === fromId)?.cards`
- Finds dest by `toId` using `this.gameState.piles.find(p => p.id === toId)?.cards`
- Both work with any pile ID. `spread-communal` and `spread-{token}` are valid pile IDs.
- **No changes needed.** [VERIFIED: party/index.ts lines 178–240]

**UNDO_MOVE** (party/index.ts lines 402–411):
- Restores a full `GameState` snapshot. Spread zones are part of `piles[]` and will be included in the snapshot automatically.
- **No changes needed.** [VERIFIED: party/index.ts lines 402–411]

**RESET_TABLE** (party/index.ts lines 382–401):
- Iterates: `for (const pile of this.gameState.piles) { if (pile.id !== "draw") { resetDrawPile.cards.push(...pile.cards.splice(0)); } }`
- This will naturally include spread zones because they are piles. Cards from spread zones will be moved to draw pile on reset.
- **No changes needed.** [VERIFIED: party/index.ts lines 382–401]

**Conclusion:** The locked decision D-03 is confirmed — no action handler changes are required. The spread zone design reusing `piles[]` pays off here.

---

### 6. dnd-kit Collision Detection — Impact on Spread Zones

**Current `customCollision` in `BoardDragLayer.tsx`:**
```typescript
const pileContainers = args.droppableContainers.filter(
  (c) => String(c.id).startsWith('pile-')
);
```

SpreadZone registers droppables with `id: \`pile-${pile.id}\`` (e.g., `pile-spread-communal`, `pile-spread-player123`). These are included in `pileContainers` automatically. The `pointerWithin` collision for pile containers means the pointer must be inside the spread zone's DOM rect to register a drop.

**No changes needed to `BoardDragLayer.tsx`'s collision detection.** [VERIFIED: BoardDragLayer.tsx lines 14–19]

---

### 7. data-testid Attributes for Playwright Coverage

**Existing testids (confirmed from source):**
- `hand-zone` — HandZone.tsx
- `opponent-hand` — OpponentHand.tsx
- `pile-draw` — PileZone.tsx (format: `pile-${pile.id}`)
- `pile-discard` — follows same pattern
- `pile-play` — follows same pattern

**New testids needed for Phase 14:**
- `spread-zone-spread-communal` — SpreadZone for communal zone
- `spread-zone-spread-{playerToken}` — SpreadZone for personal zones

**Recommended Playwright assertions for SC-1 through SC-5:**

| SC | What to Assert | testid/locator |
|----|----------------|----------------|
| SC-1: Personal zone appears on connect | `getByTestId('spread-zone-spread-{token}')` is visible | `data-testid={spread-zone-${pile.id}}` |
| SC-2: Communal zone always visible | `getByTestId('spread-zone-spread-communal')` is visible | same |
| SC-3: Cards can move to/from zones | After drag, zone contains card; source is empty | `spread-zone-{id}` locator |
| SC-4: No duplicate zone on reconnect | Count of spread zones for player = 1 | `getByTestId(/^spread-zone-spread-/).count()` |
| SC-5: Type fields exist | Unit test on server viewFor output | vitest |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spread card layout | Custom CSS grid/absolute positioning | Flex row with negative margins | HandZone already proves this pattern works; matches existing card sizing |
| Drop target | Custom pointer event handlers | `useDroppable` from @dnd-kit/core | Already used in PileZone; handles dnd-kit state machine correctly |
| Drag setup for each card | Custom useDraggable wrapper | `DraggableCard` component | Already handles click-vs-drag disambiguation (didDragRef pattern) |
| Zone creation atomicity | Locking/mutex | None needed | PartyKit server is single-threaded per room; no race conditions in onConnect |

---

## Common Pitfalls

### Pitfall 1: Hard-coded `h-[104px]` header causes viewport overflow

**What goes wrong:** The new header has opponent hands AND their spread zones in a column layout. At `h-[104px]` the spread zone is clipped.
**Why it happens:** The header was sized for hand-only. With a spread zone (112px height) stacked below the hand (59px cards) plus labels, the content exceeds 104px.
**How to avoid:** Remove the fixed `h-[104px]` from the header div. Use auto-height with padding (`py-2`) and trust flexbox.
**Warning signs:** SpreadZone appears clipped in the header during development.

### Pitfall 2: `viewFor` masking applies to spread zones unexpectedly

**What goes wrong:** If spread zone `faceUp` is false, non-top cards in the zone are masked (sent as `{ faceUp: false }` without id/suit/rank). The SpreadZone component renders them without an ID, making them undraggable.
**Why it happens:** `viewFor` masking logic: `card.faceUp || isTop ? card : { faceUp: false }`. In a face-down spread zone, all cards except the top card lose their identity.
**How to avoid:** Spread zones default to `faceUp: true`. When the user toggles face-down, this is intentional — only the top card will be draggable. Document this as expected behavior. SpreadZone should render `CardBack` for masked cards (no `'id' in card`).
**Warning signs:** Cards appear as card backs in the spread zone and can't be dragged after toggling face-down.

### Pitfall 3: Duplicate spread zones on reconnect if idempotency check uses wrong field

**What goes wrong:** If the `onConnect` idempotency check looks for `pile.name === playerToken` instead of `pile.id === spreadZoneId`, reconnecting with a different display name creates a duplicate.
**Why it happens:** Display names are not stable (can change on reconnect). Zone IDs are stable.
**How to avoid:** Always check `this.gameState.piles.some(p => p.id === spreadZoneId)` where `spreadZoneId = \`spread-${playerToken}\``.

### Pitfall 4: BoardView renders spread zones in the middle piles section

**What goes wrong:** If `gameState.piles` is rendered unfiltered in the middle section, spread zones appear alongside Draw/Discard/Play piles as `PileZone` components.
**Why it happens:** Current BoardView maps `gameState.piles` directly to `PileZone` without filtering.
**How to avoid:** Filter piles by `region` before passing to each section. Use `(p.region ?? 'pile') === 'pile'` for the middle section.

### Pitfall 5: `myPlayZoneId` not yet populated on first render

**What goes wrong:** Client tries to `spreadPiles.find(p => p.id === gameState.myPlayZoneId)` but `myPlayZoneId` is empty string until the server creates the zone in `onConnect`.
**Why it happens:** There is a short window between the WebSocket connecting and the first `STATE_UPDATE` arriving with `myPlayZoneId` set.
**How to avoid:** Guard with `mySpreadZone && <SpreadZone ... />` — the component simply won't render until the zone exists. This is the same pattern used for opponent hands.

### Pitfall 6: onStart migration runs before communal zone check needs to be last

**What goes wrong:** If the communal zone seed in `onStart` runs before the field migration, the pushed communal zone pile itself may lack region/ownerId if the migration code path is hit again somehow.
**Why it happens:** Order of migration blocks matters.
**How to avoid:** Run the field migration (`region`/`ownerId` defaults) BEFORE the communal zone existence check. The pushed communal zone explicitly sets both fields.

### Pitfall 7: SpreadZone with many cards overflows horizontally

**What goes wrong:** With 13+ cards in a spread zone using negative margins, the zone container overflows and either clips or expands.
**Why it happens:** Fixed `h-[112px]` height on the zone does not accommodate horizontal overflow.
**How to avoid:** Add `overflow-x-auto` to the spread zone cards container (same approach as HandZone's `overflow-x-auto` on its hand strip). The zone itself has a fixed height matching PileZone.

---

## Code Examples

### viewFor() extension (verified pattern)

```typescript
// Source: direct inspection of party/index.ts — viewFor function
// Add region, ownerId, and myPlayZoneId
return {
  // ... existing fields ...
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
  myPlayZoneId: playerToken ? `spread-${playerToken}` : "",
};
```

### Idempotent zone creation in onConnect (verified pattern)

```typescript
// Source: direct inspection of party/index.ts onConnect — mirrors isExistingPlayer pattern
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

### BoardView pile filtering (new pattern)

```typescript
// Source: direct inspection of BoardView.tsx — extends current gameState.piles.map() pattern
const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
const communalZone = spreadPiles.find(p => p.id === 'spread-communal');
```

### SpreadZone droppable registration (verified pattern)

```typescript
// Source: PileZone.tsx useDroppable pattern — uses same id prefix convention
const { setNodeRef, isOver } = useDroppable({
  id: `pile-${pile.id}`,           // must start with 'pile-' for customCollision
  data: { toZone: 'pile' as const, toId: pile.id },
});
```

---

## Runtime State Inventory

> This phase adds new fields to existing Pile records in persisted storage.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | PartyKit Durable Object storage: `gameState` key contains `piles[]` with existing records lacking `region`/`ownerId` fields | `onStart` migration: add defaults to existing piles. Communal zone injected in `onStart` if absent. |
| Live service config | PartyKit Cloud (partykit.dev) — deployed via `partykit deploy`. Existing live rooms have persisted state in Durable Objects. | Migration runs on `onStart` for each room when first woken. No manual migration needed. |
| OS-registered state | None | — |
| Secrets/env vars | None — no new secrets added | — |
| Build artifacts | None — no package renames | — |

**Key point:** PartyKit rooms are Durable Objects. When a room wakes (first connection after deploy), `onStart()` reads persisted state and runs migration. Rooms that have never been created get `defaultGameState()` which already has the new fields. This is the same migration pattern used in Phases 3, 4, and 9.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) |
| Config file | `vite.config.ts` (Vitest embedded) + `playwright.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | Personal spread zone created in piles[] on connect | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ Wave 0 |
| PLAY-01 | Spread zone creation is idempotent (no duplicate on reconnect) | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ Wave 0 |
| PLAY-01 | viewFor includes myPlayZoneId and spread zone in piles | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ Wave 0 |
| PLAY-02 | Communal zone present in defaultGameState piles | unit | `npx vitest run tests/spreadZoneCreation.test.ts` | ❌ Wave 0 |
| PLAY-01/02 | MOVE_CARD accepts spread zone as toId | unit | extend `tests/moveCard.test.ts` | ✅ (extend) |
| PLAY-01/02 | RESET_TABLE clears cards from spread zones | unit | extend `tests/resetTable.test.ts` | ✅ (extend) |
| PLAY-01/02 | Spread zones visible to both players in e2e | e2e | `npx playwright test --grep "spread zone"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/spreadZoneCreation.test.ts` — covers PLAY-01 (idempotent creation, viewFor fields), PLAY-02 (communal zone in defaultGameState)
- [ ] Playwright test in `playwright/game.spec.ts` — add `test('spread zones visible for both players')` that connects two players and asserts `getByTestId('spread-zone-spread-communal')` and each player's personal zone are visible

### Existing Tests That Must Continue Passing

Run `npx vitest run` after each change. Key tests that touch modified files:
- `tests/viewFor.test.ts` — must still pass with new `myPlayZoneId` field (currently asserts specific keys are absent: check that `"hands" in view` is false — `myPlayZoneId` addition won't break this)
- `tests/resetTable.test.ts` — must still collect spread zone cards. Test setup will need spread zones added to `piles[]` to verify.
- `tests/moveCard.test.ts` — extend with a test that moves a card to a spread zone ID.

---

## Environment Availability

> Step 2.6: All tools needed for this phase are already confirmed present from Phase 13.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | (confirmed Phase 13) | — |
| npx vitest | Unit tests | ✓ | (confirmed Phase 12) | — |
| npx playwright | e2e tests | ✓ | (confirmed Phase 13) | — |
| PartyKit dev server | e2e tests | ✓ | (confirmed Phase 13, port 1999) | — |
| Vite dev server | e2e tests | ✓ | (confirmed Phase 13, port 5173) | — |

---

## Open Questions (RESOLVED)

1. **Spread zone name on reconnect with different displayName**
   - What we know: `displayName` can be updated on reconnect; spread zone name is set once at creation.
   - What's unclear: Should the spread zone name be kept in sync with the player's current displayName?
   - Recommendation: Out of scope for v1.2. The zone name is a human-readable label, not critical path. Could be addressed as a backlog item.

2. **Insert position dialog on spread zone drops**
   - What we know: Current `BoardDragLayer.handleDragEnd` shows Top/Bottom/Random dialog for non-empty pile drops.
   - What's unclear: Is the dialog desirable for spread zones? For "playing" cards into a spread, "top" is always correct (append to fan).
   - Recommendation: Claude's discretion — treat spread zones as empty-pile behavior (bypass dialog, always use `'top'`) by checking `toId.startsWith('spread-')` in `handleDragEnd`. This is a small UX improvement but requires one change to `BoardDragLayer.tsx`. If not addressed in this phase, the dialog appears for spread zones with cards, which is functional but awkward.

3. **Header height on small viewports with 3-4 opponents**
   - What we know: With 3 opponents each having a hand column + spread zone in the header, the header could reach 200px+ with auto-height.
   - What's unclear: Exact behavior on 768px height screens.
   - Recommendation: Accept for v1.2. Maximum 4 players; header overflow-x-auto handles wide layouts. Vertical scroll for header is explicitly out of scope.

---

## Security Domain

> `security_enforcement` is not set to false in .planning/config.json, so this section is required.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — no auth in this phase |
| V3 Session Management | No | Player tokens already established |
| V4 Access Control | Partial | D-16 explicitly allows any player to interact with any zone — no access control on spread zones by design |
| V5 Input Validation | Yes | Player token truncated to 64 chars in `onConnect`. Spread zone ID is server-computed (`spread-${playerToken}`), never user-supplied. |
| V6 Cryptography | No | No new crypto operations |

**Known Threat Patterns:**

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Player supplies malicious `toId` pointing to another player's spread zone | Tampering | Acceptable by design (D-16) — no rule enforcement. Server validates pile exists before accepting. |
| Player sends extremely long playerToken to inflate spread zone ID | Tampering | `playerToken = rawToken.slice(0, 64)` already in onConnect — spread zone IDs are bounded. [VERIFIED: party/index.ts line 112] |
| Reconnect spam creating many spread zones | DoS | Idempotency check prevents duplicate zones; 4-player cap limits room occupancy. |

---

## Sources

### Primary (HIGH confidence)

All findings are based on direct inspection of the live codebase. No external documentation was consulted because the implementation details are fully determined by the existing code patterns.

- `src/shared/types.ts` — Pile, ClientPile, GameState, ClientGameState interfaces
- `party/index.ts` — defaultGameState, onConnect, onStart, viewFor, all action handlers
- `src/components/BoardView.tsx` — 3-section layout, current header structure
- `src/components/PileZone.tsx` — useDroppable pattern, data-testid convention
- `src/components/HandZone.tsx` — cascade card layout with negative margins
- `src/components/DraggableCard.tsx` — useDraggable, click-vs-drag disambiguation
- `src/components/BoardDragLayer.tsx` — customCollision, handleDragEnd, pendingMove dialog
- `playwright/game.spec.ts` — existing e2e test patterns and testid usage
- `tests/helpers.ts` + `tests/viewFor.test.ts` — unit test patterns

### Secondary (MEDIUM confidence)

None — all claims are verifiable from the codebase directly.

### Tertiary (LOW confidence)

None.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims in this research were verified by direct codebase inspection. No assumed claims.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and imports
- Architecture patterns: HIGH — verified from live source files
- Server changes: HIGH — verified by reading all touched functions
- Component design: HIGH (structure) / MEDIUM (exact CSS overlap amount) — structure verified from HandZone/PileZone patterns; overlap pixels are Claude's discretion
- Action handler analysis: HIGH — verified by reading each handler
- Pitfalls: HIGH — derived from reading the actual code, not speculation

**Research date:** 2026-04-24
**Valid until:** 2026-06-01 (codebase is stable; only invalidated by changes to party/index.ts or dnd-kit upgrade)
