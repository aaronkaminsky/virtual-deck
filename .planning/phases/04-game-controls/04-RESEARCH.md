# Phase 4: Game Controls - Research

**Researched:** 2026-04-04
**Domain:** PartyKit server actions, dnd-kit drop targets, React click-drag disambiguation, shadcn component installation, per-player undo state
**Confidence:** HIGH

## Summary

Phase 4 adds the full game control surface on top of the already-complete Phase 3 board. All architectural patterns are established — the PartyKit server handler, `broadcastState`/`viewFor` broadcast loop, and dnd-kit drag layer are all running in production. Phase 4 is an additive phase: no existing patterns need to change, only extended.

The six features decompose into two distinct tracks. **Server track**: five new `ClientAction` types (FLIP_CARD, PASS_CARD, DEAL_CARDS, RESET_TABLE, UNDO_MOVE) plus a `GameState` shape change (add `phase: "setup" | "playing"` field and `undoSnapshots: Record<string, GameState>` per-player snapshot map). **Client track**: one new component (ControlsBar), modifications to four existing components (BoardView, PileZone, DraggableCard, OpponentHand), and three new shadcn installs (alert-dialog, popover, input).

The largest design risk is the `GameState.phase` field name clash: the existing `GameState` already has `phase: "lobby" | "playing"`. Phase 4 replaces the lobby/playing distinction with setup/playing at the game-control level — this must be reconciled carefully so the lobby flow (Phase 2) does not break. The cleanest solution: rename the existing field to `sessionPhase: "lobby" | "playing"` and add `gamePhase: "setup" | "playing"`. However, the simpler option given CONTEXT.md D-10 is to keep `phase` and extend its values: `"lobby" | "setup" | "playing"`. This avoids renaming. The planner must choose and document.

**Primary recommendation:** Implement server actions first (they are pure TypeScript with no UI dependencies), then wire client UI top-down: types → server → ControlsBar → component modifications.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card Flip (CARD-03)**
- D-01: Trigger: clicking directly on a card flips it. Single click, no hover overlay or right-click menu.
- D-02: Scope: only cards in pile zones on the table. Hand cards are not flippable.
- D-03: The flip action toggles `card.faceUp` on the server, which broadcasts `STATE_UPDATE` to all players.

**Pass Card (CARD-04)**
- D-04: Mechanism: drag-and-drop. Drag a card from your own hand and drop it onto an opponent's hand zone. Opponent hand zones become droppable targets (extends existing `@dnd-kit/core` setup).
- D-05: Source constraint: cards can only be passed from your own private hand. Passing from a table pile is out of scope.
- D-06: Server action adds card to target player's `hands[targetPlayerId]` and removes from sender's hand.

**Deal N Cards (CTRL-01)**
- D-07: Trigger: "Deal" button in the controls bar opens a compact popover with a number input field and confirm button.
- D-08: Availability: Deal is only visible/active during the setup phase. Once deal fires, transitions to playing phase. Deal is replaced by Undo + Reset.
- D-09: Deal deals from the draw pile specifically (pile id `draw`). Server distributes N cards to each connected player's hand in round-robin order.

**Game State Phases**
- D-10: Two phases: `setup` (initial, deck shuffled, hands empty) and `playing` (cards have been dealt/moved).
- D-11: Controls bar behavior by phase: Setup: Deal visible; Playing: Undo + Reset visible. Both: Shuffle available per pile.
- D-12: Shuffle is a per-pile control. Each pile zone gets a "Shuffle" button alongside the existing face-toggle button. Available in both phases.

**Controls Bar Placement**
- D-13: Controls live in the existing top header strip alongside opponent hands. Controls on right, opponent hands on left.
- D-14: Mobile/responsive layout is deferred. Desktop-first only.

**Reset (CTRL-03)**
- D-15: Reset requires a confirmation dialog before firing.
- D-16: On confirm: all cards from all player hands and all piles collected into draw pile, reshuffled server-side, game phase reverts to setup.

**Undo (CTRL-04)**
- D-17: Per-player undo. Each player can undo their own last card action only.
- D-18: Single-step: one undo per player. After undoing, undo button becomes disabled.
- D-19: Server stores one snapshot of `GameState` per player (their last move's before-state). On undo, server applies the before-state and broadcasts `STATE_UPDATE`.

### Claude's Discretion

- Exact styling of the controls bar (button layout, size, grouping within the header strip)
- Whether the flip click requires a small click guard to prevent accidental triggers during drag
- Number input constraints for deal (min 1, max cards_in_draw_pile / player_count)
- Whether the "Deal" popover is a shadcn Popover component or a simple inline form

### Deferred Ideas (OUT OF SCOPE)

- Mobile/responsive layout
- Global undo (anyone's last move) — DIFF-04, v2 only
- Player display names in controls bar — PRES-01, v2
- Flip/shuffle animations
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-03 | Player can flip any card face-up or face-down | FLIP_CARD server action; click handler on DraggableCard with isDragging guard; toggles card.faceUp, broadcasts STATE_UPDATE |
| CARD-04 | Player can pass a card directly to another player's private hand | PASS_CARD server action; OpponentHand becomes useDroppable target; server validates sender owns card; masks hand via existing viewFor |
| CTRL-01 | Player can deal N cards from a pile to each player's hand | DEAL_CARDS server action; round-robin distribution from draw pile; triggers setup→playing phase transition; Deal popover UI in ControlsBar |
| CTRL-02 | Player can shuffle any pile on the table | SHUFFLE_PILE server action per pile; Shuffle button added to PileZone; reuses existing shuffle() utility |
| CTRL-03 | Player can reset the table — all cards collected into draw pile and reshuffled | RESET_TABLE server action; AlertDialog confirmation; resets phase to setup; wipes all hands into draw pile |
| CTRL-04 | Player can undo their last card move (single-step) | UNDO_MOVE server action; per-player GameState snapshot stored before each mutating action; Undo button disabled after use or on no prior action |
</phase_requirements>

---

## Standard Stack

All stack choices are locked by CLAUDE.md. Phase 4 adds no new dependencies beyond three shadcn component installs.

### Core (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 18.3.1 | UI components | Installed |
| TypeScript | 6.0.2 | Type safety | Installed |
| @dnd-kit/core | 6.3.1 | Drag-and-drop (PASS_CARD drop targets) | Installed |
| @dnd-kit/sortable | 10.0.0 | Hand sorting | Installed |
| partykit | 0.0.115 | Server runtime | Installed |
| partysocket | 1.1.16 | Client WebSocket | Installed |
| lucide-react | 1.7.0 | Icons (Undo2, RotateCcw, ChevronDown, Shuffle) | Installed |
| shadcn | 4.1.2 | Component CLI | Installed |
| tailwindcss | 4.2.2 | Styling | Installed |

### New shadcn Components to Install

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| alert-dialog | `npx shadcn add alert-dialog` | Reset confirmation dialog (D-15) |
| popover | `npx shadcn add popover` | Deal N cards popover (D-07) |
| input | `npx shadcn add input` | Number input inside Deal popover |

**Version verification:** Confirmed via `npm view` — all installed packages are current as of research date. `lucide-react` is at 1.7.0; all icons referenced (Undo2, RotateCcw, ChevronDown, Shuffle) are available in lucide at this version.

**shadcn component install note:** The existing shadcn components (button, badge, separator) were installed via `npx shadcn add`. The same pattern applies for alert-dialog, popover, and input. These are Radix UI primitives wrapped by shadcn — they install as source files into `src/components/ui/`. No npm package additions required.

## Architecture Patterns

### Current GameState Shape (from types.ts)

```typescript
// Current — phase is "lobby" | "playing"
export interface GameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;
  piles: Pile[];
}
```

**Phase 4 extends this shape.** The `phase` field collision between the existing lobby/playing distinction and the new setup/playing distinction (D-10) must be resolved. Two options:

**Option A (recommended): Extend the existing `phase` union.** Add "setup" to the existing union: `"lobby" | "setup" | "playing"`. The lobby phase is the pre-join state, setup is post-join but pre-deal, playing is post-deal. This matches the natural game lifecycle and requires the fewest rename ripples across existing code.

**Option B:** Add a separate `gamePhase: "setup" | "playing"` field alongside the existing `phase`. Avoids touching existing phase logic but adds conceptual redundancy.

Option A is recommended — it unifies the state machine.

### Required Type Changes

```typescript
// src/shared/types.ts additions

// 1. Extend GameState.phase
export interface GameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";  // add "setup"
  players: Player[];
  hands: Record<string, Card[]>;
  piles: Pile[];
  undoSnapshots: Record<string, GameState | null>;  // per-player, null = no snapshot
}

// 2. New ClientAction types
export type ClientAction =
  | { type: "SHUFFLE_DECK" }                          // existing
  | { type: "DRAW_CARD"; pileId: string }             // existing
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string }  // existing
  | { type: "REORDER_HAND"; orderedCardIds: string[] } // existing
  | { type: "SET_PILE_FACE"; pileId: string; faceUp: boolean }  // existing
  | { type: "FLIP_CARD"; pileId: string; cardId: string }       // NEW
  | { type: "PASS_CARD"; cardId: string; targetPlayerId: string } // NEW
  | { type: "DEAL_CARDS"; cardsPerPlayer: number }              // NEW
  | { type: "SHUFFLE_PILE"; pileId: string }                    // NEW (replaces SHUFFLE_DECK scope)
  | { type: "RESET_TABLE" }                                     // NEW
  | { type: "UNDO_MOVE" }                                       // NEW
  | { type: "PING" };                                           // existing
```

**Note on SHUFFLE_DECK vs SHUFFLE_PILE:** The existing `SHUFFLE_DECK` action shuffles the draw pile specifically. Phase 4 adds `SHUFFLE_PILE` with a `pileId` parameter for per-pile shuffle (D-12). Both coexist — `SHUFFLE_DECK` need not be removed.

### Undo Snapshot Pattern

Per D-19, the server stores one `GameState` snapshot per player before each mutating action. Key implementation concerns:

1. **Circular reference:** `GameState.undoSnapshots` contains `GameState` values, which themselves contain `undoSnapshots`. The snapshot stored must NOT include the `undoSnapshots` field (or must set it to `{}`) to avoid infinite nesting and bloated storage.

2. **When to snapshot:** Snapshot before any action that mutates card positions: FLIP_CARD, PASS_CARD, DEAL_CARDS, RESET_TABLE, MOVE_CARD, DRAW_CARD, REORDER_HAND. NOT before UNDO_MOVE itself (undo of undo creates confusion per D-18).

3. **On undo:** Replace `this.gameState` with the snapshot, clear `undoSnapshots[sender.id]` to null, broadcast.

4. **Storage cost:** Each snapshot is a full `GameState` (~52 cards × fields). With 4 players, that's 4 snapshots in storage at once. At typical JSON sizes (~10KB per snapshot), well within PartyKit storage limits.

```typescript
// Snapshot pattern (party/index.ts)
function takeSnapshot(state: GameState, playerId: string): void {
  const snap = JSON.parse(JSON.stringify(state)) as GameState;
  snap.undoSnapshots = {};  // strip nested snapshots to prevent bloat
  state.undoSnapshots[playerId] = snap;
}
```

### Server Action Sequence: DEAL_CARDS

Round-robin distribution across connected players (D-09):

```typescript
case "DEAL_CARDS": {
  const drawPile = this.gameState.piles.find(p => p.id === "draw");
  const connectedPlayers = this.gameState.players.filter(p => p.connected);
  const n = action.cardsPerPlayer;
  const needed = n * connectedPlayers.length;
  if (!drawPile || drawPile.cards.length < needed) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INSUFFICIENT_CARDS", message: "..." }));
    break;
  }
  takeSnapshot(this.gameState, sender.id);
  for (let i = 0; i < n; i++) {
    for (const player of connectedPlayers) {
      const card = drawPile.cards.pop()!;
      card.faceUp = true;
      this.gameState.hands[player.id].push(card);
    }
  }
  this.gameState.phase = "playing";
  break;
}
```

### Server Action Sequence: RESET_TABLE

```typescript
case "RESET_TABLE": {
  // Collect all cards from all hands and piles into draw pile
  const drawPile = this.gameState.piles.find(p => p.id === "draw")!;
  for (const hand of Object.values(this.gameState.hands)) {
    drawPile.cards.push(...hand.splice(0));
  }
  for (const pile of this.gameState.piles) {
    if (pile.id !== "draw") {
      drawPile.cards.push(...pile.cards.splice(0));
    }
  }
  drawPile.faceUp = false;
  drawPile.cards.forEach(c => { c.faceUp = false; });
  drawPile.cards = shuffle(drawPile.cards);
  this.gameState.phase = "setup";
  this.gameState.undoSnapshots = {};  // clear all snapshots on reset
  break;
}
```

### Click-Drag Disambiguation (FLIP_CARD)

The `DraggableCard` component uses `useDraggable` which spreads `{...listeners}` onto the div, including `onPointerDown`. This means pointer events are captured by dnd-kit before they reach any `onClick` handler. The recommended pattern:

**Use a ref to track drag distance.** Set a ref to `false` on `onPointerDown`, set to `true` on dnd-kit's `onDragStart` event (via `useDndMonitor` or by checking `isDragging` changes), reset on `onDragEnd`. In the `onClick` handler, only fire FLIP_CARD if the drag ref is still `false`.

Alternative: Use `useDndMonitor` at the component level to track whether the current pointer sequence became a drag.

This is in Claude's Discretion per CONTEXT.md. The `isDragging` ref approach is simplest:

```typescript
// DraggableCard modification
const didDragRef = useRef(false);

// Pass onDragStart/onDragEnd to useDraggable via DndContext events
// or hook into the useDraggable active state
useEffect(() => {
  if (isDragging) didDragRef.current = true;
}, [isDragging]);

function handleClick() {
  if (didDragRef.current) {
    didDragRef.current = false;
    return;
  }
  if (fromZone === 'pile' && onFlip) {
    onFlip();
  }
}
```

**Important:** The `onClick` prop must be passed as a new prop to `DraggableCard`. The component needs to know its context (pile vs. hand) to suppress flipping for hand cards (D-02). The `fromZone` prop already exists and provides this context.

### OpponentHand as Drop Target (PASS_CARD)

```typescript
// OpponentHand modification
import { useDroppable } from '@dnd-kit/core';

export function OpponentHand({ playerId, cardCount, sendAction }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });
  // ...
}
```

The `onDragEnd` handler (in `HandZone` or a new `DragHandler` component) must check for `toZone === 'opponent-hand'` and dispatch `PASS_CARD`. The existing `HandZone` `useDndMonitor` handles reordering; it already has a guard (`fromHand && toSameHand`). Adding an `else if (fromHand && overData?.toZone === 'opponent-hand')` branch handles pass-card without restructuring.

**Drop data convention:** Use `toZone: 'opponent-hand'` as a distinct value (not `'hand'`) so the existing MOVE_CARD unauthorized-move guard on the server is not triggered — PASS_CARD is a separate action type.

### ControlsBar Component

New component at `src/components/ControlsBar.tsx`. Receives `gameState`, `playerId`, and `sendAction` as props. Conditionally renders Deal (setup phase) or Undo + Reset (playing phase).

The `disabled` state for Undo: `gameState.undoSnapshots?.[playerId] == null`. Since `ClientGameState` does not expose `undoSnapshots` (it's masked by `viewFor`), this field must be added to `ClientGameState` — specifically a per-player boolean `canUndo: boolean`. The server sets this in `viewFor`:

```typescript
export function viewFor(state: GameState, playerToken: string | null): ClientGameState {
  return {
    // ... existing fields ...
    canUndo: playerToken ? state.undoSnapshots[playerToken] != null : false,
  };
}
```

This avoids leaking the full snapshot to the client while providing exactly what the UI needs.

### Recommended Project Structure (Phase 4 additions)

```
src/
├── components/
│   ├── ControlsBar.tsx       # NEW — Deal/Undo/Reset controls
│   ├── BoardView.tsx         # MODIFY — add ControlsBar to top strip
│   ├── PileZone.tsx          # MODIFY — add Shuffle button, propagate onFlip
│   ├── DraggableCard.tsx     # MODIFY — add onClick with drag guard, onFlip prop
│   ├── OpponentHand.tsx      # MODIFY — add useDroppable for PASS_CARD
│   └── ui/
│       ├── alert-dialog.tsx  # INSTALL via shadcn
│       ├── popover.tsx       # INSTALL via shadcn
│       └── input.tsx         # INSTALL via shadcn
├── shared/
│   └── types.ts              # MODIFY — extend GameState, ClientGameState, ClientAction
party/
└── index.ts                  # MODIFY — add 5 new action handlers, snapshot logic
tests/
└── (new test files)          # CARD-03, CARD-04, CTRL-01..04 server logic
```

### Anti-Patterns to Avoid

- **Storing full nested snapshots:** `undoSnapshots[playerId]` must strip its own `undoSnapshots` field before storing to prevent infinite nesting in PartyKit's Durable Object storage.
- **Client-side game phase logic:** The `phase` field must be authoritative on the server. The client renders based on `gameState.phase`; it does not maintain its own phase state.
- **Sending MOVE_CARD for PASS_CARD:** PASS_CARD is a distinct action because the server needs to know it's a cross-player transfer (different validation, privacy semantics). Do not route it through MOVE_CARD — the existing MOVE_CARD handler rejects `toZone === 'hand'` when `toId !== sender.id`.
- **Flipping hand cards:** The `onFlip` callback must only be wired in `PileZone` context, not `HandZone`. `DraggableCard` already knows its `fromZone` — use this to gate the handler.
- **Clearing opponent undo snapshots on RESET_TABLE by player action:** Reset clears all undo state globally (`undoSnapshots = {}`), not per-player. This is intentional — reset is a global action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal with state management | shadcn AlertDialog | Handles focus trap, keyboard dismiss, aria-modal, backdrop click |
| Popover positioning | Absolute positioned div | shadcn Popover (Radix UI) | Handles viewport overflow, scroll, flip, collision detection automatically |
| Number input with stepper | Custom increment/decrement buttons | shadcn Input + native number | `type="number"` with min/max handles keyboard increment natively; shadcn Input provides consistent styling |
| Drag over highlighting | Direct DOM manipulation | dnd-kit `isOver` from `useDroppable` | Already used in PileZone for drop highlights — same pattern for OpponentHand |
| Deep clone for undo snapshot | Manual recursive copy | `JSON.parse(JSON.stringify(state))` | Fast enough for a ~52-card state; no circular refs after stripping undoSnapshots |

**Key insight:** All UI primitives needed (modal, popover, input) are available via shadcn installs. The server-side logic (shuffle, distribute, snapshot) uses primitives already in the codebase.

## Common Pitfalls

### Pitfall 1: GameState.phase Clash with Existing Lobby Logic

**What goes wrong:** The existing code sets `phase: "lobby"` on room creation and uses it in the lobby flow (Phase 2). Phase 4 adds `"setup"` and `"playing"` values. If the server sets `phase = "setup"` when a player joins (replacing "lobby"), the lobby UI in Phase 2 may break — it may be checking `phase === "lobby"` to show the room code screen.

**Why it happens:** Two different concerns (room lifecycle vs. game lifecycle) sharing one field.

**How to avoid:** Extend the union to `"lobby" | "setup" | "playing"`. Set `phase = "setup"` only after the room transitions out of lobby (e.g., when any player begins playing, not just when they connect). Review Phase 2 client code for `phase === "lobby"` guards before changing server behavior.

**Warning signs:** The lobby/room-join screen disappears prematurely, or the board renders before players have joined.

### Pitfall 2: Click vs. Drag Conflict on DraggableCard

**What goes wrong:** A user initiates a drag but releases after minimal movement — the browser fires both `pointerdown` + `pointerup` + `click`. The flip handler fires even though the user intended a drag.

**Why it happens:** dnd-kit activates drags based on movement distance threshold (default ~3px). Below that threshold, the event sequence completes as a click.

**How to avoid:** Track whether `isDragging` ever became `true` during the pointer sequence using a ref. Only fire FLIP_CARD if the drag never activated. Reset the ref on `pointerup` or after `onDragEnd` fires.

**Warning signs:** Cards flip unexpectedly after being dragged short distances.

### Pitfall 3: PASS_CARD Drop Target Conflicts with HandZone

**What goes wrong:** When dragging from own hand, the `HandZone` drop zone (`id: 'hand'`) and opponent hand zones (`id: 'opponent-hand-{playerId}'`) both register as droppable. The `useDndMonitor` in HandZone may incorrectly process a pass-card drag as a reorder attempt.

**Why it happens:** The `onDragEnd` handler in HandZone checks `fromHand && toSameHand`. If the check is not tight enough, `over.id === 'hand'` might match when dropping on an opponent zone if naming is ambiguous.

**How to avoid:** Use clearly distinct `id` and `toZone` values for opponent hand drop zones. The guard `over.id === 'hand'` is exact — it will not match `'opponent-hand-player1'`. Verify the `toSameHand` check includes only matching `toId === playerId` or `over.id === 'hand'` (exact), not a prefix match.

**Warning signs:** Attempting to pass a card to an opponent reorders own hand instead.

### Pitfall 4: Undo Snapshot Includes Nested Snapshots

**What goes wrong:** `undoSnapshots[playerId]` is a `GameState` which contains `undoSnapshots`. If saved as-is, each snapshot contains the previous snapshot, creating an ever-growing chain stored in PartyKit Durable Objects.

**Why it happens:** Deep clone of state includes all fields.

**How to avoid:** After cloning, explicitly set `snap.undoSnapshots = {}` before storing. The `takeSnapshot` helper function must enforce this.

**Warning signs:** PartyKit storage usage grows rapidly; JSON payload sizes increase with each action.

### Pitfall 5: canUndo Not in ClientGameState

**What goes wrong:** The Undo button's disabled state depends on whether a snapshot exists for the current player. If `ClientGameState` doesn't expose this, the client has no way to know — it cannot access `GameState.undoSnapshots` directly.

**Why it happens:** `viewFor` currently does not include any undo state in the client projection.

**How to avoid:** Add `canUndo: boolean` to `ClientGameState` interface and populate it in `viewFor`. This is a one-line addition to both the interface and the `viewFor` function.

**Warning signs:** Undo button is always enabled or always disabled regardless of game actions.

### Pitfall 6: Deal Round-Robin Order

**What goes wrong:** Round-robin deals to connected players in iteration order of `gameState.players`. If players join in different orders, deal order varies. This may feel unfair.

**Why it happens:** `players` array insertion order determines deal order.

**How to avoid:** This is acceptable per the project's no-rule-enforcement philosophy. Document the behavior: deal order = connection order. No fix needed, but the planner should note it so it's not reported as a bug.

## Code Examples

### FLIP_CARD Server Handler

```typescript
// party/index.ts — add to switch(action.type)
case "FLIP_CARD": {
  const pile = this.gameState.piles.find(p => p.id === action.pileId);
  if (!pile) {
    sender.send(JSON.stringify({ type: "ERROR", code: "PILE_NOT_FOUND", message: `No pile: ${action.pileId}` } satisfies ServerEvent));
    break;
  }
  const card = pile.cards.find(c => c.id === action.cardId);
  if (!card) {
    sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_FOUND", message: `No card: ${action.cardId}` } satisfies ServerEvent));
    break;
  }
  takeSnapshot(this.gameState, sender.id);
  card.faceUp = !card.faceUp;
  break;
}
```

### PASS_CARD Server Handler

```typescript
case "PASS_CARD": {
  const senderHand = this.gameState.hands[sender.id];
  if (!senderHand) break;
  const idx = senderHand.findIndex(c => c.id === action.cardId);
  if (idx === -1) {
    sender.send(JSON.stringify({ type: "ERROR", code: "CARD_NOT_IN_HAND", message: `Card ${action.cardId} not in sender's hand` } satisfies ServerEvent));
    break;
  }
  if (!this.gameState.hands[action.targetPlayerId]) {
    sender.send(JSON.stringify({ type: "ERROR", code: "PLAYER_NOT_FOUND", message: `No hand for player: ${action.targetPlayerId}` } satisfies ServerEvent));
    break;
  }
  takeSnapshot(this.gameState, sender.id);
  const [card] = senderHand.splice(idx, 1);
  card.faceUp = true;  // face up in recipient's hand
  this.gameState.hands[action.targetPlayerId].push(card);
  break;
}
```

### UNDO_MOVE Server Handler

```typescript
case "UNDO_MOVE": {
  const snap = this.gameState.undoSnapshots[sender.id];
  if (!snap) break;  // no snapshot — silently ignore
  this.gameState = snap;
  // Note: snap.undoSnapshots[sender.id] is null (set in takeSnapshot)
  // so after restore, undo is immediately disabled for this player
  break;
}
```

### DraggableCard Click Guard (client)

```typescript
// src/components/DraggableCard.tsx additions
interface DraggableCardProps {
  card: Card;
  fromZone: 'hand' | 'pile';
  fromId: string;
  onFlip?: () => void;  // only provided when fromZone === 'pile'
}

export function DraggableCard({ card, fromZone, fromId, onFlip }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ ... });
  const didDragRef = useRef(false);

  useEffect(() => {
    if (isDragging) didDragRef.current = true;
    else didDragRef.current = false;
  }, [isDragging]);

  function handleClick(e: React.MouseEvent) {
    if (didDragRef.current) return;
    onFlip?.();
  }
  // ...
}
```

### shadcn AlertDialog Usage (Reset)

```typescript
// Source: shadcn official component pattern
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">
      <RotateCcw className="w-4 h-4 mr-1" /> Reset
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Reset table?</AlertDialogTitle>
      <AlertDialogDescription className="text-muted-foreground">
        All cards return to the draw pile and will be reshuffled. This can't be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep playing</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={() => sendAction({ type: 'RESET_TABLE' })}
      >
        Reset table
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| SHUFFLE_DECK shuffles one hardcoded pile | SHUFFLE_PILE with pileId parameter | Phase 4 | Multiple piles can be independently shuffled |
| phase: "lobby" \| "playing" | phase: "lobby" \| "setup" \| "playing" | Phase 4 | Enables Deal-only-in-setup UX |
| No undo state | Per-player GameState snapshot | Phase 4 | Single-step undo for own last action |
| OpponentHand is display-only | OpponentHand is a droppable target | Phase 4 | Enables card passing via drag-and-drop |

## Open Questions

1. **GameState.phase extension vs. separate field**
   - What we know: existing code uses `"lobby" | "playing"`. Phase 4 needs `"setup"` distinct from lobby.
   - What's unclear: does Phase 2 client code guard on `phase === "lobby"` in ways that would break if "setup" is introduced?
   - Recommendation: Read Phase 2 client code (App.tsx / RoomView.tsx) for phase guards before finalizing. The planner should include this as a Wave 0 investigation task.

2. **Undo on REORDER_HAND**
   - What we know: D-17 says "last card action." Reorder is technically a card action but not a positional move.
   - What's unclear: should REORDER_HAND trigger a snapshot (making it undoable)?
   - Recommendation: Include it. The user moved cards. Consistency beats a special case.

3. **FLIP_CARD only shows top card**
   - What we know: `PileZone` renders only the top card (`pile.cards[length - 1]`). Only the top card can be clicked.
   - What's unclear: does the user expect to be able to flip cards mid-pile?
   - Recommendation: Top-card-only is the correct interpretation per the physical card table metaphor. No change needed.

## Environment Availability

Step 2.6: No new external tool dependencies introduced in Phase 4. All required tools are already installed and verified running.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | shadcn installs, build | Yes | (existing) | — |
| npx shadcn | Component installs | Yes | 4.1.2 | — |
| partykit CLI | Server dev/deploy | Yes | 0.0.115 | — |

## Validation Architecture

Nyquist validation is enabled (`nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Test include glob | `tests/**/*.test.ts` |

All 39 existing tests pass. Tests are pure TypeScript (no DOM, no browser) — they test server-side logic by importing from `party/index.ts` directly.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-03 | FLIP_CARD toggles card.faceUp in pile | unit | `npm test -- tests/flipCard.test.ts` | No — Wave 0 |
| CARD-03 | FLIP_CARD broadcasts to all connections | unit | `npm test -- tests/flipCard.test.ts` | No — Wave 0 |
| CARD-03 | FLIP_CARD rejects invalid pileId | unit | `npm test -- tests/flipCard.test.ts` | No — Wave 0 |
| CARD-04 | PASS_CARD moves card from sender hand to target hand | unit | `npm test -- tests/passCard.test.ts` | No — Wave 0 |
| CARD-04 | PASS_CARD rejects card not in sender hand | unit | `npm test -- tests/passCard.test.ts` | No — Wave 0 |
| CARD-04 | PASS_CARD recipient sees card; others see count | unit | `npm test -- tests/passCard.test.ts` | No — Wave 0 |
| CTRL-01 | DEAL_CARDS distributes N cards round-robin from draw pile | unit | `npm test -- tests/dealCards.test.ts` | No — Wave 0 |
| CTRL-01 | DEAL_CARDS transitions phase to "playing" | unit | `npm test -- tests/dealCards.test.ts` | No — Wave 0 |
| CTRL-01 | DEAL_CARDS returns ERROR when draw pile has insufficient cards | unit | `npm test -- tests/dealCards.test.ts` | No — Wave 0 |
| CTRL-02 | SHUFFLE_PILE randomizes the target pile's card order | unit | `npm test -- tests/shufflePile.test.ts` | No — Wave 0 |
| CTRL-02 | SHUFFLE_PILE rejects invalid pileId | unit | `npm test -- tests/shufflePile.test.ts` | No — Wave 0 |
| CTRL-03 | RESET_TABLE collects all cards into draw pile | unit | `npm test -- tests/resetTable.test.ts` | No — Wave 0 |
| CTRL-03 | RESET_TABLE reshuffles draw pile | unit | `npm test -- tests/resetTable.test.ts` | No — Wave 0 |
| CTRL-03 | RESET_TABLE resets phase to "setup" | unit | `npm test -- tests/resetTable.test.ts` | No — Wave 0 |
| CTRL-04 | UNDO_MOVE restores state from per-player snapshot | unit | `npm test -- tests/undoMove.test.ts` | No — Wave 0 |
| CTRL-04 | UNDO_MOVE with no snapshot is a no-op | unit | `npm test -- tests/undoMove.test.ts` | No — Wave 0 |
| CTRL-04 | takeSnapshot strips nested undoSnapshots | unit | `npm test -- tests/undoMove.test.ts` | No — Wave 0 |
| CTRL-04 | canUndo appears in ClientGameState via viewFor | unit | `npm test -- tests/undoMove.test.ts` | No — Wave 0 |

**Existing tests to update (not new files):**
- `tests/viewFor.test.ts` — add test for `canUndo` field
- `tests/deck.test.ts` — update `defaultGameState` test if phase initial value changes

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/flipCard.test.ts` — covers CARD-03 server logic
- [ ] `tests/passCard.test.ts` — covers CARD-04 server logic
- [ ] `tests/dealCards.test.ts` — covers CTRL-01 server logic
- [ ] `tests/shufflePile.test.ts` — covers CTRL-02 server logic
- [ ] `tests/resetTable.test.ts` — covers CTRL-03 server logic
- [ ] `tests/undoMove.test.ts` — covers CTRL-04 server logic + takeSnapshot helper

**Framework install:** Not required — vitest already installed and configured.

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|-------------------|
| GitHub Pages + PartyKit Cloud only | No new infrastructure; Phase 4 is pure feature additions to existing deployment |
| Free tier only | No paid PartyKit features; storage usage from undo snapshots is well within free limits |
| crypto.getRandomValues for shuffle | SHUFFLE_PILE reuses existing `shuffle()` function — already correct |
| react-beautiful-dnd: do not use | Not used; @dnd-kit/core used throughout |
| zustand for local UI state only, not game state | ControlsBar reads phase from `gameState` (server state), not from local zustand store |
| No rule enforcement | Undo is per-player only (no enforcing whose turn it is to undo) |
| Card art swappable via code change only | No change — Phase 4 doesn't touch card art |

## Sources

### Primary (HIGH confidence)

- Codebase: `src/shared/types.ts` — exact current GameState and ClientAction shapes
- Codebase: `party/index.ts` — exact current server handler patterns
- Codebase: `src/components/*.tsx` — exact current component signatures and dnd-kit usage
- Codebase: `tests/*.test.ts` — exact test patterns and vitest configuration
- Codebase: `package.json` — exact installed versions
- CONTEXT.md — locked decisions D-01 through D-19

### Secondary (MEDIUM confidence)

- shadcn component install patterns — based on Phase 2/3 established pattern of `npx shadcn add <component>`; confirmed consistent with shadcn v4 CLI behavior

### Tertiary (LOW confidence)

- None — all critical claims verified against actual codebase files

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — read directly from package.json
- Architecture: HIGH — read directly from existing source files; all patterns established in prior phases
- Pitfalls: HIGH — derived from direct code reading, not inference
- Test patterns: HIGH — vitest config and existing test structure confirmed by running `npm test`

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack — no fast-moving dependencies)
