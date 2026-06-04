# Design: Highlight Last Move (999.38)

**Date:** 2026-06-04
**Status:** Approved, ready for implementation

## Goal

Show a subtle visual indicator on whichever card or zone was most recently touched. The highlight fades over ~8 seconds so players who glance away don't miss the action. Only one highlight is ever visible at a time — a new action replaces the previous one immediately.

## Decisions

| Question | Decision |
|---|---|
| Which actions trigger? | MOVE_CARD, PLAY_CARD_SET, FLIP_CARD, PLACE_ON_CANVAS, GROUP_PLACE_ON_CANVAS |
| Who sees it? | Everyone including the actor (also serves as move confirmation) |
| Duration | 8s timeout; clears immediately on the next qualifying action or on undo |
| What gets highlighted? | Specific card for spread/hand/canvas; zone container for stacked piles and opponent hands |
| Visual style | Blue-teal pulse glow (`#38bdf8`), fades over the full 8s |
| Multi-card moves | All moved card ids are included; each card gets its own highlight |
| Undo | Emits `CLEAR_LAST_MOVE` — highlight vanishes immediately rather than lingering on a stale target |

## Architecture

Server emits a side-channel event after each qualifying action, mirroring the existing `PILE_SHUFFLED` → `shufflingPileIds` pattern in `usePartySocket`.

## Shared Types (`src/shared/types.ts`)

Two new variants added to `ServerEvent`:

```ts
| { type: "LAST_MOVE"; toZoneType: "hand" | "pile" | "canvas"; toZoneId: string; cardIds: string[] }
| { type: "CLEAR_LAST_MOVE" }
```

`toZoneId` semantics:
- `toZoneType: "hand"` → player token
- `toZoneType: "pile"` → pile id (covers both stacked piles and spread zones; `region` field distinguishes them)
- `toZoneType: "canvas"` → literal `"canvas"`

## Server (`party/index.ts`)

New private method:

```ts
private broadcastLastMove(toZoneType: "hand" | "pile" | "canvas", toZoneId: string, cardIds: string[]) {
  for (const conn of [...this.room.getConnections()]) {
    conn.send(JSON.stringify({ type: "LAST_MOVE", toZoneType, toZoneId, cardIds } satisfies ServerEvent));
  }
}
```

Called after `broadcastState()` for each triggering action:

| Action | `toZoneType` | `toZoneId` | `cardIds` |
|---|---|---|---|
| MOVE_CARD | mirrors `toZone` | mirrors `toId` | `[cardId]` |
| PLAY_CARD_SET | mirrors `toZone` | mirrors `toId` | all `cardIds` from action |
| PASS_CARD | `"hand"` | `targetPlayerId` | `[cardId]` |
| FLIP_CARD | `"pile"` | `pileId` | `[cardId]` |
| PLACE_ON_CANVAS | `"canvas"` | `"canvas"` | `[cardId]` |
| GROUP_PLACE_ON_CANVAS | `"canvas"` | `"canvas"` | all card ids from `cards` array |

UNDO_MOVE broadcasts `{ type: "CLEAR_LAST_MOVE" }` after `broadcastState()`.

## Client Hook (`src/hooks/usePartySocket.ts`)

New state and timer ref:

```ts
const [highlightedMove, setHighlightedMove] = useState<{
  toZoneType: "hand" | "pile" | "canvas";
  toZoneId: string;
  cardIds: string[];
} | null>(null);
const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

New branches in the message handler (alongside `PILE_SHUFFLED`):

```ts
} else if (event.type === "LAST_MOVE") {
  if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  setHighlightedMove({ toZoneType: event.toZoneType, toZoneId: event.toZoneId, cardIds: event.cardIds });
  highlightTimerRef.current = setTimeout(() => setHighlightedMove(null), 8000);
} else if (event.type === "CLEAR_LAST_MOVE") {
  if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  setHighlightedMove(null);
}
```

`highlightTimerRef` is cleared in the `useEffect` cleanup alongside `shuffleTimersRef`.

`highlightedMove` is added to the hook's return value.

## Component Rendering

`highlightedMove` flows: `usePartySocket` → `App.tsx` → `BoardView` → zone components as a single prop.

Each component applies `last-move-highlight` CSS class based on its own check:

| Component | Condition for zone highlight | Condition for card highlight |
|---|---|---|
| `PileZone` | `toZoneType === "pile" && toZoneId === pile.id && pile.region !== "spread"` | — |
| `SpreadZone` | — | `toZoneType === "pile" && toZoneId === pile.id && cardIds.includes(card.id)` |
| `HandZone` | — | `toZoneType === "hand" && toZoneId === myPlayerId && cardIds.includes(card.id)` |
| `OpponentHand` | `toZoneType === "hand" && toZoneId === playerId` | — (always zone-level, even when `handRevealed: true`) |
| `CanvasDraggableCard` | — | `toZoneType === "canvas" && cardIds.includes(card.id)` |

The `last-move-highlight` class is present while `highlightedMove` is non-null and this element matches; absent otherwise. No `animation-fill-mode: forwards` — removing the class restores normal styles cleanly without freezing the final keyframe (which would wipe the card's elevation shadow).

## CSS (`src/globals.css`)

```css
@keyframes last-move-pulse {
  0%   { box-shadow: 0 0 0 2px #38bdf8, 0 0 16px 6px rgba(56,189,248,0.6); }
  15%  { box-shadow: 0 0 0 3px #38bdf8, 0 0 20px 8px rgba(56,189,248,0.5); }
  40%  { box-shadow: 0 0 0 2px #38bdf8, 0 0 14px 4px rgba(56,189,248,0.35); }
  100% { box-shadow: none; }
}

.last-move-highlight {
  animation: last-move-pulse 8s ease-out;
}
```

## Testing

**Unit tests (Vitest):** Add cases to `tests/moveCard.test.ts`, `tests/flipCard.test.ts`, `tests/playCardSet.test.ts`, and `tests/undoMove.test.ts` verifying that:
- Qualifying actions emit `LAST_MOVE` with the correct payload
- UNDO_MOVE emits `CLEAR_LAST_MOVE`
- Non-qualifying actions (SHUFFLE_PILE, DEAL_CARDS, RESET_TABLE) do not emit `LAST_MOVE`

**E2E (Playwright):** One multiplayer test: player A moves a card; verify player B's view shows the `last-move-highlight` class on the correct element. Verify the class is absent after undo.
