# Phase 21: Spread Zone Reorder Verification - Research

**Researched:** 2026-05-11
**Domain:** dnd-kit intra-zone reorder, React selection state, PartyKit undo snapshots
**Confidence:** HIGH

## Summary

Phase 21 is a surgical fix-and-verify pass on three distinct problems, all fully traceable to existing code:

1. **Selection preservation bugs (SC2):** Two specific call sites in `BoardDragLayer.tsx` fire `setSelectedIds(new Set())` unconditionally during intra-zone reorder drags. Both bugs are visible in the current source and have precise line-level fixes.

2. **Group reorder (SC2 extension):** When a selected card is dragged within the same zone, all selected cards should move as a block. The calculation algorithm is straightforward: filter selected cards out of the array, find the drop position in the remainder, splice selected cards (in original order) back in. This replaces the existing `arrayMove` call in both `SpreadZone.onDragEnd` and `HandZone.onDragEnd`.

3. **Undo for reorder (SC3):** `REORDER_PILE_SPREAD` and `REORDER_HAND` in `party/index.ts` mutate state without calling `takeSnapshot` first. Every other mutating action (`MOVE_CARD`, `PLAY_CARD_SET`, `FLIP_CARD`, `SHUFFLE_PILE`, `PASS_CARD`, `DEAL_CARDS`) already calls `takeSnapshot` before mutation. The fix is adding one `takeSnapshot(this.gameState)` line before the mutation in each of these two cases.

SC1 (single card reorder preserved for all players) is already working. The `REORDER_PILE_SPREAD` and `REORDER_HAND` server handlers accept the full `orderedCardIds` array and broadcast to all clients. No SC1 implementation work is needed.

**Primary recommendation:** Implement the three changes in parallel (they touch disjoint code paths), add Vitest server-side unit tests for the undo cases, add logic tests for the group reorder algorithm, and write a HUMAN-UAT.md for SC2/SC3 live session verification.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Intra-zone reorder detection at drag start | Frontend (BoardDragLayer) | — | `event.active.data.current` carries `fromId`/`toId`; comparison is pure client logic |
| Selection clearing guard | Frontend (BoardDragLayer) | — | `selectedIds` lives entirely in client state |
| Group reorder calculation | Frontend (SpreadZone / HandZone useDndMonitor) | — | Array splice computation is client-only; result sent as `orderedCardIds` to server |
| Undo snapshot for reorder | Server (party/index.ts) | — | `takeSnapshot` must be called server-side before state mutation |
| Broadcast reordered state | Server (party/index.ts) | — | `broadcastState()` already fires after every `onMessage`; no extra wiring needed |
| Test coverage for server-side undo | Test (tests/undoMove.test.ts or new file) | — | Server logic tests live in `tests/` using Vitest, no DOM required |
| Manual UAT for selection UX | Human (HUMAN-UAT.md) | — | Selection preservation and group reorder feel require live interaction |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

**D-01:** Intra-zone reorder exempts from D-04 (Phase 20) selection clearing. At drag start in `handleDragStart`, only clear `selectedIds` if the drag is NOT an intra-zone reorder. Detection: `data.fromZone === 'pile' && data.fromId === data.toId` for spread zones; `data.fromZone === 'hand' && data.fromId === playerId` for hand reorders. Both conditions use `data.current` from the drag event.

**D-02:** At drag end in `handleDragEnd`, the `setSelectedIds(new Set())` call inside the `isSuccess` block must also be conditioned on NOT being an intra-zone reorder — currently it fires unconditionally before the `isIntraSpreadReorder` guard deeper in the branch. Move or guard the clearing so intra-zone reorders preserve selection.

**D-03:** When dragging a selected card within the same zone (spread or hand), ALL selected cards move to the drop position as a block. This applies to both `SpreadZone.useDndMonitor` and `HandZone.useDndMonitor`.

**D-04:** Selected cards land in preserved relative order — same order they had before the drag (not dragged-card-first).

**D-05:** Group reorder logic lives in each zone's `useDndMonitor` (not `BoardDragLayer`). `selectedIds` must be passed as a prop into `HandZone` for group reorder computation (already passed to `SpreadZone`).

**D-06:** Group reorder calculation: (1) filter selected cards out of the full array, (2) find the over-index in the remaining cards, (3) splice the selected cards (in their original relative order) at that position, (4) send the full `orderedCardIds` array. Server-side `REORDER_PILE_SPREAD` and `REORDER_HAND` handlers accept the full ordered array unchanged.

**D-07:** Add `takeSnapshot(this.gameState)` before `spreadPile.cards = ...` in the `REORDER_PILE_SPREAD` case in `party/index.ts`. This makes each spread zone reorder individually undoable.

**D-08:** Add `takeSnapshot(this.gameState)` before `this.gameState.hands[senderToken] = ...` in the `REORDER_HAND` case in `party/index.ts`. Consistent with spread zone behavior — all reorders undoable.

**D-09:** One snapshot per drag — no coalescing. Each reorder (single or group) = one undo step. Simple, predictable, consistent with all other action types.

**D-10:** Unit tests (Vitest) covering: group reorder calculation for spread zones, group reorder calculation for hand, selection preservation through intra-zone reorder drag-start, selection preservation through drag-end, and that `takeSnapshot` is called by server tests for both reorder actions.

**D-11:** HUMAN-UAT.md with live session test script — step-by-step instructions to manually verify the interactions feel correct in a real game session (mirrors Phase 19 format).

**D-12:** Update `REQUIREMENTS.md` traceability table to mark SPREAD-02 complete after verification passes.

**D-13:** SC1 (single card reorder, order preserved for all players) is already wired — trust it. Focus implementation on SC2 (selection preservation + group reorder) and SC3 (undo).

### Claude's Discretion

None — discussion stayed within phase scope. All decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPREAD-02 | Player can drag-reorder cards within a spread zone; reorder behaves correctly when multi-select state is active | SC1 already wired via `REORDER_PILE_SPREAD` (party/index.ts line 313). SC2 requires D-01/D-02 drag-start/drag-end guards in BoardDragLayer + D-03–D-06 group reorder in SpreadZone/HandZone. SC3 requires D-07/D-08 takeSnapshot insertions. All verified against source. |

</phase_requirements>

## Standard Stack

### Core (already installed — no new packages needed)
[VERIFIED: package.json]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/sortable | 10.0.0 | `arrayMove`, `useSortable`, `SortableContext` | Already in use; group reorder replaces `arrayMove` with custom splice but keeps `SortableContext` |
| @dnd-kit/core | 6.3.1 | `useDndMonitor`, `DragEndEvent` | Already wired; no new dnd-kit APIs needed |
| vitest | 4.1.2 | Unit tests for server logic and algorithm | Already configured at `vitest.config.ts`; test files in `tests/` |
| React | 18.3.1 | Component props, state | Already in use |
| TypeScript | 6.0.2 | Type safety | Already in use |

**No new packages required.** All implementation is a surgical edit to existing files.

### Key Existing Exports
[VERIFIED: reading source files]

| Export | File | Used By |
|--------|------|---------|
| `takeSnapshot` | `party/index.ts` | Already called in MOVE_CARD, PLAY_CARD_SET, FLIP_CARD, SHUFFLE_PILE, PASS_CARD, DEAL_CARDS — not yet called in REORDER_HAND or REORDER_PILE_SPREAD |
| `arrayMove` | `@dnd-kit/sortable` | Currently used in SpreadZone.tsx line 100 and HandZone.tsx line 103 — will be replaced by group reorder logic when `selectedIds.size > 1` |
| `selectedIds: Set<string>` | `BoardDragLayer` state | Already threaded to `SpreadZone` via props; also already passed to `HandZone` (line 69 of HandZone.tsx confirms it accepts `selectedIds: Set<string>` as a required prop) |

## Architecture Patterns

### System Architecture Diagram

```
Drag Start (intra-zone)
  └─ BoardDragLayer.handleDragStart
        ├─ [is dragged card selected?] no → clear selectedIds  [D-04 Phase 20]
        └─ [is intra-zone reorder?]   yes → PRESERVE selectedIds  [D-01 Phase 21]

Drag End (intra-zone reorder lands)
  └─ BoardDragLayer.handleDragEnd
        ├─ isSuccess block
        │     ├─ compute isIntraSpreadReorder / isIntraHandReorder  [BEFORE selection clear]
        │     └─ if NOT intra-zone → setSelectedIds(new Set())  [D-02 Phase 21]
        └─ SpreadZone OR HandZone useDndMonitor.onDragEnd fires
              ├─ [selectedIds.size > 1 AND dragged card in selected set?]
              │     → group reorder: filter-out selected, splice at overIdx  [D-03–D-06]
              └─ [single card drag or unselected drag]
                    → arrayMove as before  [existing behavior]

REORDER action reaches server
  └─ party/index.ts
        ├─ REORDER_PILE_SPREAD
        │     ├─ takeSnapshot(this.gameState)  [D-07 — ADD THIS]
        │     └─ spreadPile.cards = orderedCardIds.map(...)
        └─ REORDER_HAND
              ├─ takeSnapshot(this.gameState)  [D-08 — ADD THIS]
              └─ this.gameState.hands[senderToken] = orderedCardIds.map(...)
```

### Recommended File Changes (Exact Sites)
[VERIFIED: reading source files]

```
src/components/BoardDragLayer.tsx
  handleDragStart (~line 136)   ← add intra-zone guard before setSelectedIds(new Set())
  handleDragEnd (~line 191)     ← compute isIntraSpreadReorder + isIntraHandReorder
                                   BEFORE the setSelectedIds(new Set()) call in isSuccess block

src/components/SpreadZone.tsx
  useDndMonitor.onDragEnd (~line 96)  ← replace arrayMove with group reorder when applicable

src/components/HandZone.tsx
  useDndMonitor.onDragEnd (~line 99)  ← replace arrayMove with group reorder when applicable

party/index.ts
  REORDER_HAND case (~line 294)           ← add takeSnapshot before mutation
  REORDER_PILE_SPREAD case (~line 313)    ← add takeSnapshot before mutation

tests/                                   ← new test file: reorderUndo.test.ts
                                            (server-side undo for both reorder cases)
```

### Pattern 1: Intra-Zone Detection at Drag Start
[VERIFIED: reading BoardDragLayer.tsx]

The `data.current` on `SortableSpreadCard` already carries `{ fromZone: 'pile', fromId: pileId, toZone: 'pile', toId: pileId }` — `fromId === toId` is the exact intra-spread signal. `SortableHandCard` similarly carries `{ fromZone: 'hand', fromId: playerId, toZone: 'hand', toId: playerId }`.

```typescript
// In handleDragStart — insert before the existing D-04 clearing block
const data = event.active.data.current as { card?: Card; fromZone?: string; fromId?: string; toId?: string } | undefined;
const isIntraSpreadReorder = data?.fromZone === 'pile' && data?.fromId === data?.toId;
const isIntraHandReorder = data?.fromZone === 'hand';

// D-04 (Phase 20) + D-01 (Phase 21): only clear if NOT intra-zone reorder
if (!selectedIds.has(String(event.active.id)) && !isIntraSpreadReorder && !isIntraHandReorder) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```

### Pattern 2: Drag End — Guard Selection Clear Before isIntraSpreadReorder is Known
[VERIFIED: reading BoardDragLayer.tsx lines 144–260]

Currently, the `isSuccess` block calls `setSelectedIds(new Set())` at line 192 — before `isIntraSpreadReorder` is computed at line 219. The fix is to compute `isIntraSpreadReorder` and `isIntraHandReorder` from `dragDataRef.current` and `overData` **before** the `isSuccess` branch, then condition the clearing:

```typescript
// Compute these BEFORE the isSuccess branch (dragDataRef.current is set at drag start)
const fromZone = dragDataRef.current?.fromZone;
const fromId = dragDataRef.current?.fromId;
const isIntraSpreadReorder = fromZone === 'pile' && fromId === overData?.toId;
const isIntraHandReorder = fromZone === 'hand' && overData?.toZone === 'hand';

// In isSuccess block: only clear if NOT intra-zone
if (!isIntraSpreadReorder && !isIntraHandReorder) {
  setSelectedIds(new Set());
  setSelectionSource(null);
}
```

### Pattern 3: Group Reorder Calculation
[VERIFIED: reading SpreadZone.tsx lines 96–103, HandZone.tsx lines 99–104, D-06]

The algorithm replaces `arrayMove` when `selectedIds.size > 1` and the dragged card is in the selected set:

```typescript
// In SpreadZone useDndMonitor.onDragEnd (same pattern for HandZone)
const fromThisPile = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
const toThisPile = (overData?.fromZone === 'pile' && overData?.fromId === pile.id) ||
  String(over.id) === `pile-${pile.id}`;

if (fromThisPile && toThisPile && activeData) {
  const draggedId = activeData.card.id;
  const isGroupReorder = selectedIds && selectedIds.size > 1 && selectedIds.has(draggedId);

  let reordered: Card[];
  if (isGroupReorder) {
    // D-06: (1) filter selected cards out, (2) find overIdx in remainder,
    //        (3) splice selected cards (original relative order) at overIdx
    const selected = faceUpCards.filter(c => selectedIds.has(c.id));
    const remainder = faceUpCards.filter(c => !selectedIds.has(c.id));
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

### Pattern 4: takeSnapshot for Reorder Actions
[VERIFIED: reading party/index.ts — all other mutating cases already call takeSnapshot]

```typescript
// REORDER_PILE_SPREAD case (~line 313):
case "REORDER_PILE_SPREAD": {
  const spreadPile = this.gameState.piles.find(p => p.id === action.pileId && p.region === "spread");
  // ... validation ...
  takeSnapshot(this.gameState);   // ADD: one line before mutation [D-07]
  const spreadCardMap = new Map(spreadPile.cards.map(c => [c.id, c]));
  spreadPile.cards = action.orderedCardIds.map(id => spreadCardMap.get(id)!);
  break;
}

// REORDER_HAND case (~line 294):
case "REORDER_HAND": {
  // ... validation ...
  takeSnapshot(this.gameState);   // ADD: one line before mutation [D-08]
  const cardMap = new Map(hand.map(c => [c.id, c]));
  this.gameState.hands[senderToken] = action.orderedCardIds.map(id => cardMap.get(id)!);
  break;
}
```

### Anti-Patterns to Avoid
[VERIFIED: reading existing code and Phase 20 context]

- **Computing isIntraSpreadReorder after the selection clear call:** The current `isSuccess` block clears selection on line 192, but computes `isIntraSpreadReorder` on line 219. Reversing this order is the core of the D-02 fix.
- **Calling arrayMove for group reorder:** `arrayMove` only moves one card. Using it for a group drag moves only the dragged card, scattering the group.
- **Sending REORDER with only selected cards (not full array):** The server validates `orderedCardIds.length === pile.cards.length`. Group reorder must always send the full array with all cards in new positions.
- **Adding `takeSnapshot` after mutation instead of before:** The undo stack snapshots state before the change so it can be restored. Adding it after defeats the purpose.
- **Passing `selectedIds` to `HandZone` as a new prop:** It is NOT a new prop — `HandZone` already accepts `selectedIds: Set<string>` as a required prop (line 69 of HandZone.tsx). The group reorder logic can read it directly inside `useDndMonitor.onDragEnd`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Intra-zone drag detection | Custom event system | Existing `data.current` on dnd-kit draggable items | `fromId === toId` is already set on `SortableSpreadCard` and `SortableHandCard` via the `data` prop in `useSortable` |
| Undo snapshot | Custom diff/patch | `takeSnapshot` (already defined in party/index.ts line 44) | Deep-clone + trim; already proven across 7 action types |
| Group move reordering | Complex relative-position math | Filter-splice algorithm (D-06) | Simple, correct, order-preserving — no library needed |

## Common Pitfalls

### Pitfall 1: Drag Start Bug — `data.toId` is `undefined` at drag start
[VERIFIED: reading SortableSpreadCard — toId is set in useSortable data]

**What goes wrong:** If `data.toId` is not set on the draggable item at drag start, `fromId === toId` will be `undefined === undefined` = `true`, causing ALL drags to be treated as intra-zone reorders and never clearing selection.
**Why it happens:** `useSortable` data is set at mount time. Checking `toId` at drag start only works if it was baked into the sortable's data prop.
**How to avoid:** Verify `data.toId` is explicitly set on `SortableSpreadCard` and `SortableHandCard` — confirmed present in both components' `useSortable` call.
**Warning signs:** Selection never clears on any drag — indicates the guard is too broad.

### Pitfall 2: Group Reorder When Dragged Card Is Not Selected
**What goes wrong:** If a player drags an unselected card while others are selected, the group reorder branch fires and moves unrelated cards.
**Why it happens:** Checking only `selectedIds.size > 1` without verifying `selectedIds.has(draggedId)`.
**How to avoid:** Gate group reorder on `selectedIds.size > 1 && selectedIds.has(activeData.card.id)` — both conditions required.
**Warning signs:** Dragging an unselected card teleports other cards unexpectedly.

### Pitfall 3: overIdx Calculation in Remainder Array
**What goes wrong:** After filtering selected cards out, `over.id` may be the ID of a card that was in the selected group (now removed from `remainder`). `findIndex` returns -1.
**Why it happens:** The drop target could be one of the cards being moved.
**How to avoid:** When `overIdx === -1`, treat it as "append to end" — insert at `remainder.length`. This matches the expected UX: dragging selected cards over themselves places them at the end.
**Warning signs:** Group reorder fails silently when dragging selected cards onto themselves.

### Pitfall 4: HandZone selectedIds Already Available — No Prop Change Needed
[VERIFIED: reading HandZone.tsx line 69]

**What goes wrong:** Planning treats `selectedIds` as a new prop to add to `HandZone`, creating unnecessary work.
**Why it happens:** CONTEXT.md D-05 says "selectedIds must be passed as a prop into HandZone" but it already is — `HandZone` has `selectedIds: Set<string>` as a required prop since Phase 20.
**How to avoid:** Read `HandZone.tsx` before planning — no prop signature change is needed; `selectedIds` just needs to be used in `onDragEnd`.

### Pitfall 5: isSuccess Block Structure in handleDragEnd
[VERIFIED: reading BoardDragLayer.tsx lines 144–261]

**What goes wrong:** `isIntraSpreadReorder` is currently computed inside the `isSpread` branch at line 219, inside the `if (isSuccess)` block — after the `setSelectedIds(new Set())` call at line 192.
**Why it happens:** The intra-reorder guard was added in Phase 20 only to prevent `MOVE_CARD` from racing `REORDER_PILE_SPREAD`, not to preserve selection.
**How to avoid:** Compute `isIntraSpreadReorder` and `isIntraHandReorder` before the `isSuccess` block using `dragDataRef.current` and `overData`, then condition the `setSelectedIds` clear on both being false.

## Code Examples

### Server-Side Undo Test Pattern (matches existing test structure)
[VERIFIED: reading tests/undoMove.test.ts and tests/helpers.ts]

```typescript
// Source: tests/undoMove.test.ts structure + tests/helpers.ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type * as Party from "partykit/server";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("REORDER_PILE_SPREAD undo", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof import("vitest").vi.fn> };

  beforeEach(() => {
    const mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [];
  });

  it("takeSnapshot is called — REORDER_PILE_SPREAD adds undo entry", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.cards.push(makeCard("A-s"), makeCard("K-h"), makeCard("Q-d"));

    await room.onMessage(
      JSON.stringify({ type: "REORDER_PILE_SPREAD", pileId: "play", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );

    expect(room.gameState.piles.find(p => p.id === "play")!.cards.map(c => c.id))
      .toEqual(["K-h", "A-s", "Q-d"]);
    expect(room.gameState.undoSnapshots).toHaveLength(1);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
  });

  it("UNDO_MOVE after REORDER_PILE_SPREAD restores previous card order", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.cards.push(makeCard("A-s"), makeCard("K-h"), makeCard("Q-d"));

    await room.onMessage(
      JSON.stringify({ type: "REORDER_PILE_SPREAD", pileId: "play", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.piles.find(p => p.id === "play")!.cards.map(c => c.id))
      .toEqual(["A-s", "K-h", "Q-d"]);
  });
});
```

### Group Reorder Algorithm (Pure Logic — Testable Without DOM)
[VERIFIED: D-06 from CONTEXT.md + reading SpreadZone.tsx]

```typescript
// Pure function — extractable for unit testing
function groupReorder(cards: Card[], selectedIds: Set<string>, overId: string): Card[] {
  const selected = cards.filter(c => selectedIds.has(c.id));
  const remainder = cards.filter(c => !selectedIds.has(c.id));
  const overIdx = remainder.findIndex(c => c.id === overId);
  const insertAt = overIdx === -1 ? remainder.length : overIdx;
  remainder.splice(insertAt, 0, ...selected);
  return remainder;
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPREAD-02 SC3 | REORDER_PILE_SPREAD calls takeSnapshot | unit (server) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC3 | UNDO_MOVE after REORDER_PILE_SPREAD restores order | unit (server) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC3 | REORDER_HAND calls takeSnapshot | unit (server) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC3 | UNDO_MOVE after REORDER_HAND restores order | unit (server) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC2 | Group reorder: selected cards move as block, original relative order preserved | unit (pure logic) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC2 | Group reorder: dragging unselected card does NOT trigger group move | unit (pure logic) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| SPREAD-02 SC2 | Selection preserved through intra-zone drag-start | manual (HUMAN-UAT.md) | — | manual only |
| SPREAD-02 SC2 | Selection preserved through intra-zone drag-end | manual (HUMAN-UAT.md) | — | manual only |
| SPREAD-02 SC1 | Order preserved for all players after reorder | manual (HUMAN-UAT.md) | — | manual only |

**Automated test scope note:** dnd-kit drag simulation requires a real DOM and pointer events — selection preservation through `handleDragStart`/`handleDragEnd` cannot be unit-tested with Vitest's node environment. These behaviors are verified via HUMAN-UAT.md (D-10/D-11).

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + HUMAN-UAT.md complete before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/reorderUndo.test.ts` — covers SPREAD-02 SC3 (server undo for REORDER_PILE_SPREAD and REORDER_HAND)
- [ ] `tests/groupReorder.test.ts` — covers SPREAD-02 SC2 group reorder algorithm (pure logic, no DOM)

## Runtime State Inventory

> Not applicable — this phase does not rename or migrate any stored state keys.

## Environment Availability

Step 2.6: SKIPPED — all implementation is code edits to existing TypeScript files. No external CLI tools, services, or databases are introduced.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | no — reorder is zone-local, no new authorization paths | — |
| V5 Input Validation | yes — server validates `orderedCardIds` length and membership | Existing validation in REORDER_PILE_SPREAD and REORDER_HAND handlers (already present) |

The server reorder handlers already validate that `orderedCardIds.length === pile.cards.length` and that every ID exists in the current pile. Phase 21 adds `takeSnapshot` calls only — no new input paths, no new authorization requirements.

## Assumptions Log

> This table is empty: all claims were verified against source files in this session.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims in this research were verified by reading source files directly.**

## Open Questions

None. The CONTEXT.md provides a complete, unambiguous implementation spec. All code sites were verified by reading source.

## Sources

### Primary (HIGH confidence)
- `src/components/BoardDragLayer.tsx` — read in full; `handleDragStart` (line 126), `handleDragEnd` (line 144), D-04 clearing guard (line 136), `isIntraSpreadReorder` (line 219)
- `src/components/SpreadZone.tsx` — read in full; `useDndMonitor.onDragEnd` (line 84), `arrayMove` call (line 100), `selectedIds` prop (line 70)
- `src/components/HandZone.tsx` — read in full; `useDndMonitor.onDragEnd` (line 87), `arrayMove` call (line 103), `selectedIds: Set<string>` required prop (line 69) — **confirmed selectedIds already present, no new prop needed**
- `party/index.ts` — read in full; `REORDER_HAND` (line 294), `REORDER_PILE_SPREAD` (line 313), `takeSnapshot` (line 44), all other mutating cases that do call `takeSnapshot`
- `tests/undoMove.test.ts` — read in full; test structure and helper usage
- `tests/helpers.ts` — read in full; `makeMockRoom`, `makeMockConnection`, `makeCard` exports
- `vitest.config.ts` — read; `tests/**/*.test.ts` glob, no DOM environment
- `.planning/phases/21-phase-14-live-session-verification/21-CONTEXT.md` — read in full; all decisions D-01 through D-13
- `.planning/phases/19-npm-audit/19-HUMAN-UAT.md` — read in full; UAT format reference for D-11

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and source files
- Architecture: HIGH — all implementation sites verified by reading source
- Pitfalls: HIGH — derived from actual source code analysis, not general knowledge
- Test patterns: HIGH — verified against existing test files and vitest.config.ts

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stable codebase — no fast-moving dependencies)
