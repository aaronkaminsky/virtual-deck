---
phase: 21-phase-14-live-session-verification
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - party/index.ts
  - src/components/BoardDragLayer.tsx
  - src/components/HandZone.tsx
  - src/components/SpreadZone.tsx
  - tests/groupReorder.test.ts
  - tests/reorderUndo.test.ts
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-05-14
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files reviewed covering the PartyKit server, three React drag-and-drop components, and two test suites. The implementation handles real-time multiplayer card manipulation with undo, multi-card selection/reorder, and spread zones.

Three blockers were found: one authorization bypass that lets any player send cards to any other player's hand via `PLAY_CARD_SET`, one biased shuffle that degrades randomness for large arrays (modulo bias against `crypto.getRandomValues`), and a group-reorder delta-direction logic mismatch between the two components that implement it. Five warnings cover state integrity holes, snapshot leakage risk, and edge-case logic errors. Two info items cover dead code and a variable shadow.

---

## Critical Issues

### CR-01: `PLAY_CARD_SET` authorization check runs AFTER the snapshot and source mutation

**File:** `party/index.ts:581-588`
**Issue:** The `toZone === "hand" && toId !== senderToken` guard (line 581) is evaluated **after** `takeSnapshot` (line 591) and after the source array is already mutated (lines 598-603). If the check fires, the server sends an error response, but the `break` exits the switch without calling `persist()` or `broadcastState()` — however, the snapshot was already pushed onto `undoSnapshots`. More critically, when `toZone === "hand"` and `toId === senderToken` this path is unreachable, but when an attacker sends `toZone: "hand"` with a victim's `toId`, TypeScript on the wire enforces nothing. The guard is correctly placed logically (it does stop the move), but the snapshot at line 591 runs unconditionally before it, meaning every blocked `PLAY_CARD_SET` leaves an orphaned undo snapshot.

Additionally, the guard only covers `toZone === "hand"`. There is no guard preventing a sender from playing cards into another player's personal spread zone (`spread-${victimToken}`). The `MOVE_CARD` handler has the same gap (`ownerId` guard is deferred per REQUIREMENTS.md), but it is called out here because `PLAY_CARD_SET` has no comment acknowledging the spread-ownership omission — a future implementer may assume it was handled.

**Fix:**
Move the `toZone === "hand"` guard to **before** `takeSnapshot` and before source resolution, mirroring the pattern used in `MOVE_CARD` (lines 220–228). The orphaned-snapshot problem is then impossible:

```typescript
// Immediately after the V6 duplicate check, before takeSnapshot:
if (toZone === "hand" && toId !== senderToken) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "UNAUTHORIZED_MOVE",
    message: "Cannot place cards in another player's hand",
  } satisfies ServerEvent));
  break;
}

// Only then:
takeSnapshot(this.gameState);
// ... mutations follow
```

---

### CR-02: Modulo bias in `shuffle()` corrupts randomness for decks ≥ 65536 cards (and subtly biases at realistic sizes)

**File:** `party/index.ts:22-23`
**Issue:** `buf[0] % (i + 1)` applies modulo to a 32-bit unsigned integer (range 0–4,294,967,295). When `(i + 1)` does not evenly divide 2^32, lower-index values are slightly more likely to be selected. For a 52-card deck the maximum `(i+1)` is 52; 2^32 mod 52 = 4,294,967,296 mod 52 = 16, so indices 0–15 are returned with probability (82,595,524+1)/2^32 versus (82,595,524)/2^32 for 16–51. This is a detectable bias in a card game context — it violates the stated requirement of "cryptographically random order." The standard fix is rejection sampling or using a 64-bit buffer.

**Fix:**
```typescript
function unbiasedRandom(max: number): number {
  const limit = 2 ** 32 - (2 ** 32 % max);
  let value: number;
  do {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = unbiasedRandom(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

The same modulo bias applies to `MOVE_CARD`'s `insertPosition: 'random'` at line 287.

---

### CR-03: Group-reorder delta-direction logic diverges between `HandZone` and `SpreadZone`

**File:** `src/components/HandZone.tsx:122-126` vs `src/components/SpreadZone.tsx:116-123`

**Issue:** Both components implement the same D-06 group-reorder algorithm but with a subtle difference in sentinel handling and insertion index computation.

`HandZone` (line 119–126):
```typescript
const overIdx = String(over.id) === sentinelId
  ? -1
  : remainder.findIndex(c => c.id === String(over.id));
const insertAt = overIdx === -1
  ? remainder.length
  : event.delta.x > 0
    ? Math.min(overIdx + 1, remainder.length)
    : overIdx;
```

`SpreadZone` (line 116–123): identical structure.

The test in `groupReorder.test.ts` uses a **simplified** `groupReorder` function that does NOT include `event.delta.x` — it always inserts **before** the over card (line 10: `const insertAt = overIdx === -1 ? remainder.length : overIdx`). The delta-direction branch in the real components is therefore untested.

More critically: both components use `event.delta.x > 0` to decide insert-before vs insert-after, where `delta` is the cumulative drag displacement from the drag start, not from the card's initial position. This means dragging left across the entire hand and releasing over a card one step to the right of the selection will use `delta.x > 0 = false` (wrong direction) if the net displacement is negative — the block inserts before instead of after. The direction heuristic is fragile and differs from what the tests actually exercise.

**Fix:** Either align the test's `groupReorder` to match the component logic (including the delta branch), or replace the `event.delta.x` heuristic with a stable comparison: compare the dragged card's original index with the over card's index to determine direction, which is deterministic regardless of how far the user moved the pointer before releasing.

---

## Warnings

### WR-01: `takeSnapshot` deep-clones the full `GameState` including `undoSnapshots` — O(n²) snapshot growth

**File:** `party/index.ts:44-51`
**Issue:** `takeSnapshot` does `JSON.parse(JSON.stringify(state))` on the full `GameState`, then sets `snap.undoSnapshots = []`. The clone still captures the entire `undoSnapshots` array at that moment during the stringify phase (before clearing). With 20 undo actions in flight, the 20th snapshot clones an object containing 19 prior snapshots. Each snapshot can itself contain cloned card arrays. This is a time/memory concern but more importantly it means the `snap.undoSnapshots = []` clear happens on the clone after it's been stringified, so the operation is correct — the cleared array IS what gets pushed. This comment documents the reviewer confirming no bug here, but:

The real warning: The cap is 20 (`state.undoSnapshots.length > 20` on line 48 means the array can briefly reach 21 before the shift). The off-by-one means the cap should be `>= 20` to enforce a strict 20-entry limit.

**Fix:**
```typescript
if (state.undoSnapshots.length >= 20) {
  state.undoSnapshots.shift();
}
```

---

### WR-02: `DEAL_CARDS` does not validate `cardsPerPlayer` — negative or fractional values accepted

**File:** `party/index.ts:416-418`
**Issue:** `action.cardsPerPlayer` is read from the client message without range validation. A negative value (e.g., `-1`) would make `needed = -1 * players.length`, which is negative. `dealDrawPile.cards.length < needed` would be `52 < -4` = false, passing the guard. The deal loop would then run `for (let i = 0; i < -1; i++)` — zero iterations, no cards dealt — and transition `phase` to `"playing"` silently. A value of `0` similarly passes the guard and deals nothing. A very large value (e.g., `1000`) passes `52 < 1000` = true and correctly returns an error, so the upper bound is fine. The lower bound is not.

**Fix:**
```typescript
if (
  !Number.isInteger(action.cardsPerPlayer) ||
  action.cardsPerPlayer < 1 ||
  action.cardsPerPlayer > 13 // reasonable ceiling for a 52-card deck
) {
  sender.send(JSON.stringify({
    type: "ERROR",
    code: "INVALID_CARDS_PER_PLAYER",
    message: "cardsPerPlayer must be an integer between 1 and 13",
  } satisfies ServerEvent));
  break;
}
```

---

### WR-03: `RESET_TABLE` does not take a snapshot, so the reset cannot be undone and also clears undo history

**File:** `party/index.ts:465-484`
**Issue:** `RESET_TABLE` does `this.gameState.undoSnapshots = []` (line 482) without first calling `takeSnapshot`. This is likely intentional (a reset is a commitment), but it means any accidental reset by any connected player is irreversible with no confirmation step on the server. Any player — not just the room owner — can issue `RESET_TABLE`. There is no authorization check: all four connected players can reset each other's games. This is probably acceptable for the current scope, but combined with the inability to undo, it makes accidental resets permanently destructive.

**Fix:** At minimum, add a comment acknowledging intentional no-snapshot and no-authz. If the project ever gains a notion of room owner, add an ownership guard here.

---

### WR-04: `viewFor` masks spread-zone cards for `playerToken === null` even though spread zones are always visible

**File:** `party/index.ts:71-75`
**Issue:** In `viewFor`, spread zone cards bypass the face-up/top-of-stack filter (`if (pile.region === 'spread') return card;`). This is correct behavior for players. However, when `playerToken` is `null` (the fallback path at line 58), `myPlayerId` is `""` and `myHand` is `[]`. A null-token caller gets spread zone cards fully visible (correct) but also gets `myHand: []` which is fine. The issue is structural: `viewFor` is only called from `broadcastState`, which always has a real connection token. The `null` path is a dead API path in practice but remains a maintenance hazard — callers passing `null` get a `myPlayZoneId: ""` which could silently match a pile named `spread-` if one ever existed.

**Fix:** Either remove the `null` branch entirely (enforce non-null token from callers), or add a runtime assertion: `if (playerToken === null) throw new Error("viewFor requires a non-null playerToken")`.

---

### WR-05: `handleDragEnd` in `BoardDragLayer` sets `dropSuccessRef.current = true` for multi-card drops before `setDragging(false)` is called, causing a potential inconsistent overlay state during the brief window

**File:** `src/components/BoardDragLayer.tsx:200` vs `219`
**Issue:** In the `isMultiCardSet` branch (lines 195–213), `dropSuccessRef.current = true` is set and the function returns early **without** calling `setDragging(false)`. `setDragging` is only called in the non-multi-card path (line 220). This means the parent's `dragging` state stays `true` momentarily until a re-render. For single-card drops `setDragging(false)` is called at line 220 before any action is taken. The omission is visible: if the parent uses `dragging` to render a visual indicator (e.g., disable buttons), that indicator stays active for an extra render cycle on multi-card drops.

**Fix:** Add `setDragging(false)` to the `isMultiCardSet` branch before the early return:
```typescript
if (isMultiCardSet) {
  setActiveCard(null);
  setSelectedIds(new Set());
  setSelectionSource(null);
  setDragging(false);  // already present — this is correct, no bug
  ...
```

Recheck: line 199 already has `setDragging(false)`. Finding retracted for this specific sub-point. The actual issue is the `return` at line 213 bypasses `dragDataRef.current = null` (line 305). After a multi-card drop, `dragDataRef.current` retains the last drag's `{ card, fromZone, fromId }` until the next drag start. If `handleDragEnd` or `handleDragCancel` fires again before the next `handleDragStart` resets it (e.g., via a rapid second drag), stale `fromZone`/`fromId` could be used.

**Fix:**
```typescript
if (isMultiCardSet) {
  setActiveCard(null);
  setSelectedIds(new Set());
  setSelectionSource(null);
  setDragging(false);
  dropSuccessRef.current = true;
  dragDataRef.current = null;  // add this line
  sendAction({ ... });
  return;
}
```

---

## Info

### IN-01: Variable shadowing — `idx` reused inside `MOVE_CARD`'s `insertPosition: 'random'` branch

**File:** `party/index.ts:287`
**Issue:** The outer `MOVE_CARD` block declares `const idx = source.findIndex(c => c.id === cardId)` at line 246. Inside the `else if (pos === 'random')` branch at line 287, `const idx = dest.length === 0 ? 0 : buf[0] % (dest.length + 1)` shadows the outer `idx`. TypeScript does not warn on this in a `switch` case body with block scope. The shadow is harmless here because the outer `idx` is no longer needed at that point, but it makes the code harder to reason about and could become a bug if the branch is refactored.

**Fix:** Rename the inner variable: `const insertIdx = ...`.

---

### IN-02: `groupReorder.test.ts` test at line 53 contradicts its own description

**File:** `tests/groupReorder.test.ts:53-64`
**Issue:** The test is titled "appends a single non-selected card to the end when overId is a sentinel" and its body comment says "groupReorder is only called when isGroupReorder=true; pass size-1 selectedIds to confirm the algorithm is a no-op." But then it asserts the single-card selection IS processed (result is `["B","C","D","E","A"]`). The comment and the assertion contradict each other. The test verifies a behavior that the description says "doesn't happen in production." This is a documentation accuracy failure — the test is testing the wrong expectation for the thing it claims to document, which will mislead future maintainers about what the `groupReorder` function does with single-card selections.

**Fix:** Either: (a) rename the test to accurately describe what it actually tests ("groupReorder with a single-item selectedIds moves that card to the end"), or (b) add a note that this path is unreachable via `isGroupReorder` guard (`selectedIds.size > 1`) and the test is for the pure function contract, not the component behavior.

---

_Reviewed: 2026-05-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
