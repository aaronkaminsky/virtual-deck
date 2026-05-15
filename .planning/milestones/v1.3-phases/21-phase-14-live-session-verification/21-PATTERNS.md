# Phase 21: Spread Zone Reorder Verification - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 7 (5 modified, 2 new)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/BoardDragLayer.tsx` | component (drag orchestrator) | event-driven | `src/components/BoardDragLayer.tsx` itself (surgical edit) | exact |
| `src/components/SpreadZone.tsx` | component (sortable zone) | event-driven | `src/components/HandZone.tsx` | exact |
| `src/components/HandZone.tsx` | component (sortable zone) | event-driven | `src/components/SpreadZone.tsx` | exact |
| `party/index.ts` | server (PartyKit room) | request-response | `party/index.ts` itself — MOVE_CARD/PASS_CARD cases with `takeSnapshot` | exact |
| `tests/reorderUndo.test.ts` | test (server unit) | CRUD | `tests/undoMove.test.ts` | exact |
| `tests/groupReorder.test.ts` | test (pure logic unit) | transform | `tests/undoMove.test.ts` + pure function pattern | role-match |
| `HUMAN-UAT.md` (new, phase 21) | doc (manual test script) | N/A | `.planning/phases/19-npm-audit/19-HUMAN-UAT.md` | exact |

---

## Pattern Assignments

### `src/components/BoardDragLayer.tsx` — `handleDragStart` (D-01 fix)

**Analog:** `src/components/BoardDragLayer.tsx` lines 126–142 (existing `handleDragStart`)

**Existing handleDragStart pattern** (lines 126–142):
```typescript
function handleDragStart(event: DragStartEvent) {
  if (snapBackTimerRef.current !== null) {
    clearTimeout(snapBackTimerRef.current);
    snapBackTimerRef.current = null;
  }
  const data = event.active.data.current as { card?: Card; fromZone?: string; fromId?: string } | undefined;
  if (!data?.card || !data.fromZone || !data.fromId) return;
  dragDataRef.current = data as { card: Card; fromZone: string; fromId: string };
  // D-04: dragging an unselected card while others are selected clears selection
  if (!selectedIds.has(String(event.active.id))) {
    setSelectedIds(new Set());
    setSelectionSource(null);
  }
  setActiveCard(data.card);
  setDragging(true);
}
```

**D-01 intra-zone guard to splice in** (before the D-04 block at line 136):
The `data` cast already has `fromId`; add `toId` to the cast type, then compute:
```typescript
const isIntraSpreadReorder = data?.fromZone === 'pile' && data?.fromId === (data as any).toId;
const isIntraHandReorder = data?.fromZone === 'hand';

if (!selectedIds.has(String(event.active.id)) && !isIntraSpreadReorder && !isIntraHandReorder) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```
`SortableSpreadCard` sets `toId: pileId` and `SortableHandCard` sets `toId: playerId` in their `useSortable` data — both confirmed in source.

---

### `src/components/BoardDragLayer.tsx` — `handleDragEnd` `isSuccess` block (D-02 fix)

**Analog:** `src/components/BoardDragLayer.tsx` lines 144–262 (existing `handleDragEnd`)

**Existing isSuccess block selection-clear** (lines 191–194):
```typescript
} else if (isSuccess) {
  setSelectedIds(new Set());      // <-- fires before isIntraSpreadReorder is computed (line 219)
  setSelectionSource(null);
  setActiveCard(null);
```

**Existing isIntraSpreadReorder computation** (lines 215–220, inside the isSuccess block):
```typescript
const isSpread = targetPile?.region === 'spread';
if (isSpread) {
  // GAP-06: intra-spread reorder guard
  const isIntraSpreadReorder = fromZone === 'pile' && fromId === toId;
  if (!isIntraSpreadReorder) {
    sendAction({ type: 'MOVE_CARD', ... });
  }
}
```

**D-02 fix pattern — compute BEFORE isSuccess block:**
```typescript
// Compute from dragDataRef.current (set at drag start) and overData (available at drag end)
const fromZone = dragDataRef.current?.fromZone;
const fromId = dragDataRef.current?.fromId;
const isIntraSpreadReorder = fromZone === 'pile' && fromId === overData?.toId;
const isIntraHandReorder = fromZone === 'hand' && overData?.toZone === 'hand';

// Then inside isSuccess block, condition the clear:
if (!isIntraSpreadReorder && !isIntraHandReorder) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```
Note: `dragDataRef.current` is set at lines 134 and nulled at 261. It is reliably populated during `handleDragEnd`.

---

### `src/components/SpreadZone.tsx` — `useDndMonitor.onDragEnd` (D-03/D-06 group reorder)

**Analog:** `src/components/SpreadZone.tsx` lines 84–105 (existing `useDndMonitor`)

**Existing arrayMove pattern** (lines 96–103):
```typescript
if (fromThisPile && toThisPile && activeData) {
  const activeIdx = faceUpCards.findIndex(c => c.id === activeData.card.id);
  const overIdx = faceUpCards.findIndex(c => c.id === String(over.id));
  if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
    const reordered = arrayMove(faceUpCards, activeIdx, overIdx);
    sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
  }
}
```

**D-06 group reorder replacement pattern:**
```typescript
if (fromThisPile && toThisPile && activeData) {
  const draggedId = activeData.card.id;
  const isGroupReorder = selectedIds && selectedIds.size > 1 && selectedIds.has(draggedId);

  let reordered: Card[];
  if (isGroupReorder) {
    const selected = faceUpCards.filter(c => selectedIds!.has(c.id));
    const remainder = faceUpCards.filter(c => !selectedIds!.has(c.id));
    const overIdx = remainder.findIndex(c => c.id === String(over.id));
    const insertAt = overIdx === -1 ? remainder.length : overIdx;
    remainder.splice(insertAt, 0, ...selected);
    reordered = remainder;
  } else {
    const activeIdx = faceUpCards.findIndex(c => c.id === draggedId);
    const overIdx = faceUpCards.findIndex(c => c.id === String(over.id));
    if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
    reordered = arrayMove(faceUpCards, activeIdx, overIdx);
  }
  sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
}
```
`selectedIds` is already in scope as an optional prop of `SpreadZone` (line 70: `selectedIds?: Set<string>`).

---

### `src/components/HandZone.tsx` — `useDndMonitor.onDragEnd` (D-03/D-06 group reorder)

**Analog:** `src/components/HandZone.tsx` lines 87–108 (existing `useDndMonitor`) — mirror of SpreadZone pattern above

**Existing arrayMove pattern** (lines 99–105):
```typescript
if (fromHand && toSameHand && activeData) {
  const activeIdx = cards.findIndex(c => c.id === activeData.card.id);
  const overIdx = cards.findIndex(c => c.id === String(over.id));
  if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
    const reordered = arrayMove(cards, activeIdx, overIdx);
    sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
  }
}
```

**D-06 group reorder replacement pattern (hand variant):**
```typescript
if (fromHand && toSameHand && activeData) {
  const draggedId = activeData.card.id;
  const isGroupReorder = selectedIds.size > 1 && selectedIds.has(draggedId);

  let reordered: Card[];
  if (isGroupReorder) {
    const selected = cards.filter(c => selectedIds.has(c.id));
    const remainder = cards.filter(c => !selectedIds.has(c.id));
    const overIdx = remainder.findIndex(c => c.id === String(over.id));
    const insertAt = overIdx === -1 ? remainder.length : overIdx;
    remainder.splice(insertAt, 0, ...selected);
    reordered = remainder;
  } else {
    const activeIdx = cards.findIndex(c => c.id === draggedId);
    const overIdx = cards.findIndex(c => c.id === String(over.id));
    if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
    reordered = arrayMove(cards, activeIdx, overIdx);
  }
  sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
}
```
`selectedIds` is already a required prop (line 69: `selectedIds: Set<string>`). No prop change needed.

---

### `party/index.ts` — REORDER_HAND and REORDER_PILE_SPREAD cases (D-07/D-08 takeSnapshot)

**Analog:** `party/index.ts` — `MOVE_CARD` case (line 256 `takeSnapshot` call) and `PASS_CARD` case (line 406)

**takeSnapshot function** (lines 44–51):
```typescript
export function takeSnapshot(state: GameState): void {
  const snap = JSON.parse(JSON.stringify(state)) as GameState;
  snap.undoSnapshots = [];
  state.undoSnapshots.push(snap);
  if (state.undoSnapshots.length > 20) {
    state.undoSnapshots.shift();
  }
}
```

**Existing REORDER_HAND case — missing takeSnapshot** (lines 294–311):
```typescript
case "REORDER_HAND": {
  const hand = this.gameState.hands[senderToken];
  if (!hand) break;
  const idSet = new Set(hand.map(c => c.id));
  if (
    action.orderedCardIds.length !== hand.length ||
    !action.orderedCardIds.every(id => idSet.has(id))
  ) {
    sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_REORDER", ... }));
    break;
  }
  const cardMap = new Map(hand.map(c => [c.id, c]));
  this.gameState.hands[senderToken] = action.orderedCardIds.map(id => cardMap.get(id)!);
  break;
}
```
**D-08 addition:** insert `takeSnapshot(this.gameState);` immediately before `const cardMap = new Map(...)`.

**Existing REORDER_PILE_SPREAD case — missing takeSnapshot** (lines 313–338):
```typescript
case "REORDER_PILE_SPREAD": {
  const spreadPile = this.gameState.piles.find(p => p.id === action.pileId && p.region === "spread");
  if (!spreadPile) { sender.send(...); break; }
  const spreadIdSet = new Set(spreadPile.cards.map(c => c.id));
  if (
    action.orderedCardIds.length !== spreadPile.cards.length ||
    !action.orderedCardIds.every(id => spreadIdSet.has(id))
  ) {
    sender.send(...); break;
  }
  const spreadCardMap = new Map(spreadPile.cards.map(c => [c.id, c]));
  spreadPile.cards = action.orderedCardIds.map(id => spreadCardMap.get(id)!);
  break;
}
```
**D-07 addition:** insert `takeSnapshot(this.gameState);` immediately before `const spreadCardMap = new Map(...)`.

---

### `tests/reorderUndo.test.ts` (new file)

**Analog:** `tests/undoMove.test.ts` — exact structural match

**Imports pattern** (lines 1–4 of undoMove.test.ts):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, takeSnapshot, viewFor } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";
```
Note: new test file imports from `./helpers` instead of defining helpers inline — helpers.ts was extracted from undoMove.test.ts and is the canonical source.

**Helper imports pattern** (tests/helpers.ts lines 1–36):
```typescript
import { vi } from "vitest";
import type * as Party from "partykit/server";
import type { Card } from "../src/shared/types";

export function makeMockRoom(connections: Party.Connection[] = [], overrides: Partial<Party.Room> = {}): Party.Room { ... }
export function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } { ... }
export function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
}
```

**beforeEach setup pattern** (lines 64–73 of undoMove.test.ts):
```typescript
beforeEach(() => {
  mockRoom = makeMockRoom();
  room = new GameRoom(mockRoom);
  sender = makeMockConnection("player-1");
  room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
  room.gameState.hands["player-1"] = [];
});
```

**Test structure for server undo assertion** (lines 75–87 of undoMove.test.ts):
```typescript
it("restores gameState from the top of the shared stack", async () => {
  const card = makeCard("A-s");
  room.gameState.hands["player-1"].push(card);
  takeSnapshot(room.gameState);

  room.gameState.hands["player-1"].pop();

  await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

  expect(room.gameState.hands["player-1"]).toHaveLength(1);
});
```
New tests follow same pattern: set up pile state, send REORDER action via `room.onMessage`, assert `undoSnapshots.length`, then send `UNDO_MOVE` and assert restored order.

**Test structure for `undoSnapshots` length assertion** (lines 202–210):
```typescript
expect(room.gameState.undoSnapshots).toHaveLength(2);
expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
```

---

### `tests/groupReorder.test.ts` (new file)

**Analog:** `tests/undoMove.test.ts` — role-match for Vitest structure; pure function tests require no room/connection setup

**Pure function test pattern** (no DOM, no room needed):
```typescript
import { describe, it, expect } from "vitest";

// Extract and test the D-06 algorithm as a pure function
function groupReorder(cards: Card[], selectedIds: Set<string>, overId: string): Card[] {
  const selected = cards.filter(c => selectedIds.has(c.id));
  const remainder = cards.filter(c => !selectedIds.has(c.id));
  const overIdx = remainder.findIndex(c => c.id === overId);
  const insertAt = overIdx === -1 ? remainder.length : overIdx;
  remainder.splice(insertAt, 0, ...selected);
  return remainder;
}

describe("groupReorder", () => {
  it("moves selected block to drop position, preserving relative order", () => { ... });
  it("appends to end when overIdx is -1 (dragging onto selected card)", () => { ... });
  it("does NOT trigger group reorder when dragged card is not in selectedIds", () => { ... });
});
```
Type import: `import type { Card } from "../src/shared/types";`

---

### `HUMAN-UAT.md` (new file, phase 21)

**Analog:** `.planning/phases/19-npm-audit/19-HUMAN-UAT.md`

**Format pattern** (lines 1–56 of 19-HUMAN-UAT.md):
```markdown
---
status: pending
phase: 21-phase-14-live-session-verification
source: [21-CONTEXT.md, 21-RESEARCH.md]
started: ~
updated: ~
---

## Current Test

[description of test in progress]

## Tests

### 1. [Test name]
expected: [single sentence describing expected behavior]
result: [passed | failed | pending]

## Summary

total: N
passed: N
issues: N
pending: N
```
UAT tests for Phase 21 cover: SC2 selection preserved through intra-zone drag-start, SC2 selection preserved through drag-end, SC2 group reorder moves all selected cards as block, SC2 unselected drag does not trigger group move, SC3 undo after spread reorder restores order, SC3 undo after hand reorder restores order, SC1 spread zone order matches for all players after reorder.

---

## Shared Patterns

### takeSnapshot Before Mutation
**Source:** `party/index.ts` lines 44–51 (`takeSnapshot` definition) and line 256 (MOVE_CARD usage)
**Apply to:** REORDER_HAND (line 309), REORDER_PILE_SPREAD (line 335) — both need one line added before their `Map` construction
```typescript
takeSnapshot(this.gameState);   // snapshot BEFORE mutation so UNDO_MOVE can revert
```

### dnd-kit useDndMonitor.onDragEnd Zone Guard Pattern
**Source:** `src/components/SpreadZone.tsx` lines 84–105 and `src/components/HandZone.tsx` lines 87–108
**Apply to:** Both zone components' `useDndMonitor` — the `fromThisPile`/`fromHand` + `toThisPile`/`toSameHand` guard gates all reorder logic and must remain intact when adding group reorder branch.

### D-04 Selection Clear Guard Structure
**Source:** `src/components/BoardDragLayer.tsx` lines 135–139
**Apply to:** D-01 fix at same site — new intra-zone checks wrap the existing `!selectedIds.has(id)` check, they don't replace it.
```typescript
if (!selectedIds.has(String(event.active.id))) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```
Extended form adds `&& !isIntraSpreadReorder && !isIntraHandReorder` to the condition.

### dragDataRef Pattern (carry drag data across start → end)
**Source:** `src/components/BoardDragLayer.tsx` lines 62, 134, 144–145, 261
**Apply to:** D-02 fix — `dragDataRef.current` is the source of `fromZone`/`fromId` at drag end; `overData` from `event.over?.data.current` provides `toZone`/`toId`.
```typescript
const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
// Set at drag start (line 134): dragDataRef.current = data as { card: Card; fromZone: string; fromId: string };
// Nulled at drag end (line 261): dragDataRef.current = null;
```

---

## No Analog Found

All 7 files have strong analogs. No entries.

---

## Metadata

**Analog search scope:** `src/components/`, `party/`, `tests/`, `.planning/phases/19-npm-audit/`
**Files scanned:** 7 source files read directly
**Pattern extraction date:** 2026-05-11
