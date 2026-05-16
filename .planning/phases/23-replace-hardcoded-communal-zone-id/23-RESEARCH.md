# Phase 23: Hand Sort + Select All - Research

**Researched:** 2026-05-16
**Domain:** React component state management, card sort logic, selection extension
**Confidence:** HIGH

---

## Summary

Phase 23 adds two independent UI affordances to the existing board: a hand sort cycle button and a Select All button on pile/spread zones. Both are pure client-side UI features — no new server actions are needed beyond the already-existing `REORDER_HAND`.

The sort feature computes a sorted card ID array client-side and dispatches `REORDER_HAND`, which the server already handles and persists. Sort state (which mode is active) is local React state in `HandZone` — it does not need to be server-persisted because the rendered order is determined by the server-side hand array, which gets overwritten on each sort dispatch. The next time the player loads the room, their hand is already in the sorted order.

The Select All feature extends the existing `selectedIds`/`selectionSource`/`handleToggleSelect` machinery in `BoardDragLayer.tsx`. The existing `PLAY_CARD_SET` action already handles dragging a multi-card set from any zone to any valid drop target. Select All only needs to populate `selectedIds` and `selectionSource` correctly — no new drag or drop logic is required.

**Primary recommendation:** Add an `onSelectAll` callback in `BoardDragLayer` that sets `selectedIds` and `selectionSource` atomically, thread it into `BoardView` → `PileZone` and `SpreadZone`, and implement sort mode as local state in `HandZone` dispatching `REORDER_HAND`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Suit order for "By Suit": Spades, Clubs, Diamonds, Hearts
- **D-02:** Rank order for "By Rank": 2 3 4 5 6 7 8 9 10 J Q K A (Ace high)
- **D-03:** "By Suit" = suit primary + rank secondary (2→A within suit). "By Rank" = rank primary + suit secondary (D-01 order within rank). Two separate modes, no combined mode.
- **D-04:** Sort button: ghost icon button `h-7 w-7 p-0`, added to hand header row after Eye/EyeOff toggle. Clicks cycle Original → By Suit → By Rank → Original.
- **D-05:** Active (non-original) sort: icon rendered in primary color (amber). Original order: icon muted.
- **D-06:** Tooltip shows current mode name and hints next mode. "Sort: Original order" / "Sort: By suit" / "Sort: By rank".
- **D-07:** Select All replaces any existing selection (clears `selectedIds` and `selectionSource`). No cross-zone merging.
- **D-08:** Select All works on face-down piles — cards remain face-down during drag.
- **D-09:** PileZone: Select All is a ghost icon button added to the pile's existing controls row (the `flex gap-1 mt-1` div).
- **D-10:** SpreadZone: Select All is a ghost icon button added to the spread zone header row alongside the existing eye icon. Same `h-7 w-7 p-0` style.

### Claude's Discretion

- Exact icon choice for sort button (ArrowUpDown, ListOrdered, etc.) and select-all button (CheckSquare, SquareCheck, etc.) — use whatever lucide-react icon is most semantically clear.
- Hand header layout management at narrow widths — may hide text-only label or use `sm:` breakpoints, consistent with existing responsive patterns.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SORT-01 | Player can cycle through hand sort modes: original order, by suit, by rank; sort persisted server-side via REORDER_HAND (does not enter the undo stack) | Sort logic: pure JS array sort using SUITS/RANKS constant arrays already defined in `party/index.ts`. Dispatch via `REORDER_HAND`. Sort mode is local state in `HandZone`. |
| SELECT-01 | Player can click a "Select All" control on any pile to select all cards in it | PileZone needs `onSelectAll` prop. Only top card is exposed via `ClientPile.cards` in pile mode — but Select All on a pile selects only that top card (the only draggable card). See Pitfall 1. |
| SELECT-02 | Player can click a "Select All" control on any spread zone to select all cards in it | SpreadZone has full card access. `onSelectAll(faceUpCards.map(c=>c.id), 'pile', pile.id)` via the new callback. |
| SELECT-03 | A group selected via "Select All" can be dragged to any valid drop target using existing multi-card drag | No new drag logic needed — `PLAY_CARD_SET` handler in `BoardDragLayer.handleDragEnd` already fires for `selectedIds.size > 1`. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sort mode state (Original/By Suit/By Rank) | Browser / Client (React state in HandZone) | — | Sort mode is ephemeral UI preference; the server persists the resulting card order, not the mode label |
| Sort computation (card ordering algorithm) | Browser / Client | — | Pure JS sort of card IDs before dispatching to server |
| Sort persistence | API / Backend (PartyKit via REORDER_HAND) | — | REORDER_HAND rewrites `hands[playerToken]` in server storage; persists across reconnects |
| Select All state management | Browser / Client (BoardDragLayer) | — | `selectedIds` and `selectionSource` already live in BoardDragLayer; onSelectAll callback writes to them |
| Multi-card drag execution | Browser / Client (BoardDragLayer) | API / Backend | `PLAY_CARD_SET` fires on drop — already handles any pre-populated selectedIds |

---

## Standard Stack

No new packages are required for this phase. All capabilities are implemented with the project's existing stack.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Component state for sort mode | `useState<SortMode>` in HandZone |
| lucide-react | 1.7.0 | Sort and select-all icons | Already used for Eye/EyeOff/Shuffle in the same files |
| @dnd-kit/sortable | 10.0.0 | Existing multi-card drag | `PLAY_CARD_SET` path already works; Select All feeds it |
| tailwindcss | 4.2.2 | `text-primary` conditional class for active sort | `cn()` pattern already in use |

[VERIFIED: codebase package.json]

### No Installation Required

This phase installs zero new packages. The Package Legitimacy Audit section is omitted accordingly.

---

## Architecture Patterns

### System Architecture Diagram

```
Hand Sort flow:
  User clicks sort button
    → HandZone local state: SortMode cycles (Original → BySuit → ByRank → Original)
    → sortCards(cards, mode) computes sorted ID array
    → sendAction({ type: 'REORDER_HAND', orderedCardIds })
    → PartyKit server: validates IDs, mutates hands[token], persists
    → broadcastState() → all clients receive STATE_UPDATE
    → HandZone re-renders with server-persisted order

Select All flow:
  User clicks Select All on PileZone or SpreadZone
    → onSelectAll(cardIds, zone, zoneId) fires (BoardDragLayer)
    → setSelectedIds(new Set(cardIds))
    → setSelectionSource({ zone, zoneId })
    → Cards visually selected (ring + translateY via existing SortableHandCard/SortableSpreadCard)
    → User initiates drag on any selected card
    → BoardDragLayer.handleDragEnd: isMultiCardSet=true
    → sendAction({ type: 'PLAY_CARD_SET', cardIds: [...selectedIds], ... })
```

### Recommended Project Structure

No new files are needed. All changes are in-place edits to:

```
src/
├── components/
│   ├── HandZone.tsx        # Add sort button, SortMode state, sortCards(), onSelectAll prop
│   ├── SpreadZone.tsx      # Add Select All button, onSelectAll prop threading
│   ├── PileZone.tsx        # Add Select All button, onSelectAll prop
│   └── BoardView.tsx       # Thread onSelectAll from BoardDragLayer down to children
├── BoardDragLayer.tsx      # Add handleSelectAll callback, pass to BoardView
```

### Pattern 1: SortMode Local State in HandZone

**What:** A `useState<SortMode>` cycles through three modes. On each mode change, the sorted array is computed and dispatched immediately via `REORDER_HAND`.

**When to use:** Sort mode is ephemeral UI state that does NOT need to survive a reconnect. The server-side hand order is the authoritative post-sort representation.

```typescript
// Source: codebase pattern (HandZone.tsx existing structure)
type SortMode = 'original' | 'bySuit' | 'byRank';
const SORT_CYCLE: SortMode[] = ['original', 'bySuit', 'byRank'];

const [sortMode, setSortMode] = useState<SortMode>('original');

function handleSort() {
  const nextMode = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
  setSortMode(nextMode);
  if (nextMode === 'original') return; // original = already server order, no dispatch needed
  const sorted = sortCards(cards, nextMode);
  sendAction({ type: 'REORDER_HAND', orderedCardIds: sorted.map(c => c.id) });
}
```

**Note on "original" mode:** When cycling back to "original", no `REORDER_HAND` dispatch occurs — the hand is already in the server's order (the pre-first-sort order), which the server holds. If the user has drag-reordered cards after the last sort, "original" won't restore the pre-deal order — it will just stop emitting sort commands. This matches the spec's intent (cycle back to whatever the server has now, not the dealt order).

### Pattern 2: sortCards() Implementation

**What:** Pure sort function using constant rank/suit ordering arrays.

```typescript
// Source: codebase analysis — SUITS and RANKS defined in party/index.ts
// Decision D-01: suits order: spades, clubs, diamonds, hearts
// Decision D-02: ranks order: 2,3,4,5,6,7,8,9,10,J,Q,K,A (Ace high)
const SUIT_ORDER: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
const RANK_ORDER: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function sortCards(cards: Card[], mode: 'bySuit' | 'byRank'): Card[] {
  return [...cards].sort((a, b) => {
    if (mode === 'bySuit') {
      const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    } else {
      // byRank
      const rankDiff = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      if (rankDiff !== 0) return rankDiff;
      return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    }
  });
}
```

[VERIFIED: codebase — Card type has `suit: Suit` and `rank: Rank` fields; SUITS/RANKS constants available in party/index.ts]

### Pattern 3: onSelectAll Callback Threading

**What:** New callback added in `BoardDragLayer`, passed through `BoardView` → `PileZone` / `SpreadZone`.

```typescript
// Source: codebase pattern — mirrors handleToggleSelect threading
// In BoardDragLayer:
const handleSelectAll = (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => {
  setSelectedIds(new Set(cardIds));
  setSelectionSource({ zone, zoneId });
};
```

Prop threading:
- `BoardDragLayer` → `BoardView` as `onSelectAll`
- `BoardView` → `PileZone` (for piles) and `SpreadZone` (for spread zones)
- `HandZone` does NOT need `onSelectAll` — sort covers hand ordering; there is no requirement to select all hand cards

### Pattern 4: Select All on PileZone — Top Card Only

**What:** `PileZone` renders only the top card as a `DraggableCard`. The `ClientPile.cards` array in pile mode has masking applied — only the top card is always a `Card`, interior cards may be `MaskedCard`. A pile's "Select All" therefore selects only the top card (the only visible, draggable card).

**When to use:** This is the correct behavior per D-08 — selected cards remain face-down during drag. The top card in a face-down pile is draggable and can be selected.

```typescript
// In PileZone, Select All button handler:
function handleSelectAll() {
  if (!topCard || !('id' in topCard)) return; // guard for empty pile or masked top card
  onSelectAll([(topCard as Card).id], 'pile', pile.id);
}
```

**Important:** Check whether SELECT-01's intent is "all visible/draggable cards in a pile" (= top card only) vs. "all cards including interior ones." Per SORT-01/SELECT-01/SELECT-03, the resulting selection must be draggable to a drop target using `PLAY_CARD_SET`. `PLAY_CARD_SET` only moves cards that exist in the source (`allPresent` validation). Interior masked cards cannot be included — their IDs are hidden. Therefore: pile Select All = top card only.

**Open question:** If SELECT-01 was intended to mean "select all cards in a face-up pile where all cards are visible," this is an ambiguity to surface to the planner for clarification. The spec says SELECT-03 requires the group to be draggable, which constrains this to the top card for standard piles.

### Anti-Patterns to Avoid

- **Storing sortMode on the server:** Don't add a `sortMode` field to `Player` or `GameState`. The server only needs to know the card order, not why it was chosen. Keeping mode in local state avoids a new action type and server migration.
- **Dispatching REORDER_HAND when cycling back to "original":** The sort button cycling back to "original" should NOT fire `REORDER_HAND` — the server order is already the correct "original" order. Firing an unnecessary reorder would snapshot the undo stack needlessly.
- **Using takeSnapshot inside REORDER_HAND for sort:** The server already calls `takeSnapshot` inside `REORDER_HAND` (line 334 of `party/index.ts`). The CONTEXT.md says sort does NOT enter the undo stack. This is a conflict: `REORDER_HAND` currently snapshots. Resolution: either accept that sort enters the undo stack (same as drag-reorder today), or add a `skipSnapshot` flag to the action. The CONTEXT.md and REQUIREMENTS.md both say "does not enter the undo stack" — this needs a server-side change to the `REORDER_HAND` handler or a new action type. **See Open Questions.**
- **Mixing sort icon active state with the hand reveal ring:** D-05 uses primary-colored icon (not `ring-primary/50`). Phase 22 used the ring. Keep these visually distinct.
- **Threading onSelectAll to opponent SpreadZones:** Opponent spread zones use `interactive={false}` in `BoardView` — they should not receive `onSelectAll`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-card drag after Select All | New drag infrastructure | Existing `PLAY_CARD_SET` + `selectedIds` path | Already handles `selectedIds.size > 1` in `handleDragEnd` |
| Card rank/suit comparison | Custom comparator objects | Simple `Array.indexOf` with constant arrays | RANK_ORDER/SUIT_ORDER as constant arrays is idiomatic and readable; no library needed |
| Selection state management | Custom selection reducer | Existing `setSelectedIds`/`setSelectionSource` | `handleSelectAll` is a 2-line callback using the existing state setters |
| Stale selection invalidation | Custom cleanup logic | Existing `useEffect` in `BoardDragLayer` (lines 129–144) | Already clears selectedIds when cards leave their source zone after any server action |

**Key insight:** Both features in this phase are surface-level additions. The multi-card drag machinery, selection state, server persistence, and card masking are all already complete.

---

## Common Pitfalls

### Pitfall 1: REORDER_HAND Takes a Snapshot (Undo Conflict)
**What goes wrong:** The CONTEXT.md says sort "does not enter the undo stack." But `REORDER_HAND` in `party/index.ts` unconditionally calls `takeSnapshot` (line 334). Dispatching `REORDER_HAND` for sort will push to the undo stack.
**Why it happens:** `REORDER_HAND` was designed for drag-reorder (which does undo). Sort was added later with a different undo intent.
**How to avoid:** Add an optional `skipSnapshot?: boolean` field to the `REORDER_HAND` action type and branch in the server handler. Or accept that sort is undoable (same as drag reorder). The planner needs to make this call — surfaced in Open Questions.
**Warning signs:** After implementing sort, users can "undo" a sort cycle with Ctrl+Z. This may or may not be acceptable depending on the decision above.

### Pitfall 2: SortMode Reset on Hand Update
**What goes wrong:** When the server broadcasts a new hand state (e.g., after a deal or an opponent passes a card), `HandZone` receives `cards` that are in server order — but `sortMode` is still `'bySuit'`. The UI shows the unsorted order from the server without re-sorting.
**Why it happens:** Local sort mode state and server state are desynchronized.
**How to avoid:** Add a `useEffect` in `HandZone` that re-dispatches `REORDER_HAND` whenever `cards` changes and `sortMode !== 'original'`. Or alternatively, apply the sort in the render path (sort `cards` before mapping to `SortableHandCard`) without dispatching — accepting that the sort is visual-only until the user interacts again. The second approach avoids undo stack pollution.
**Warning signs:** After a deal, the sort button shows amber (active) but cards appear in deal order.

### Pitfall 3: Select All on Empty Zone
**What goes wrong:** Clicking Select All on an empty pile or spread zone calls `onSelectAll([], 'pile', id)`, setting `selectedIds` to an empty set. The stale `selectionSource` pointing to that zone may cause unexpected behavior.
**Why it happens:** No guard on empty card arrays.
**How to avoid:** Guard in the Select All handler: `if (cardIds.length === 0) return;`. The button should also be visually disabled (`disabled` attribute) when the zone is empty.

### Pitfall 4: Interior Masked Cards in Pile Select All
**What goes wrong:** If Select All on a pile includes interior masked cards (type `MaskedCard`, no `id` field), `PLAY_CARD_SET` will fail with `CARD_NOT_IN_SOURCE` because masked card IDs are not available to the client.
**Why it happens:** `ClientPile.cards` for non-spread piles uses `MaskedCard` for non-top cards.
**How to avoid:** In `PileZone`, only include the top card: `if (!topCard || !('id' in topCard)) return; onSelectAll([(topCard as Card).id], 'pile', pile.id)`. See Pattern 4.

### Pitfall 5: SpreadZone Eye Button Layout Crowding
**What goes wrong:** Adding a Select All button next to the eye button in SpreadZone header may cause layout overflow at narrow widths, especially if the pile name is long.
**Why it happens:** The current SpreadZone header is `flex items-center` with just the name and badge — adding another button without layout consideration can break the row.
**How to avoid:** The existing SpreadZone header (lines 151–157) is a `<div className="flex items-center">`. The eye button is positioned BELOW the zone body (lines 207–215), not in the header. Re-read: the eye button is in a `<Button>` after the zone body, not in the header. Select All goes alongside it in the same slot. Use `flex gap-1` for the button row (matches PileZone's button row pattern at lines 76–95).

---

## Code Examples

Verified patterns from official sources:

### Existing REORDER_HAND Dispatch (HandZone.tsx)
```typescript
// Source: src/components/HandZone.tsx line 145
sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
```

### Existing Icon Button Pattern (HandZone.tsx)
```typescript
// Source: src/components/HandZone.tsx lines 160-169
<Button
  variant="ghost"
  className="h-7 w-7 p-0"
  onClick={onToggleReveal}
  title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
  aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
  aria-pressed={isRevealed}
>
  {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</Button>
```

### Existing handleToggleSelect (BoardDragLayer.tsx)
```typescript
// Source: src/components/BoardDragLayer.tsx lines 87-109
const handleToggleSelect = (id: string, zone: 'hand' | 'pile', zoneId: string) => {
  const isDifferentZone = selectionSource !== null &&
    (selectionSource.zone !== zone || selectionSource.zoneId !== zoneId);
  if (isDifferentZone) {
    setSelectionSource({ zone, zoneId });
    setSelectedIds(new Set([id]));
    return;
  }
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  if (selectionSource === null) setSelectionSource({ zone, zoneId });
};
```

### Existing PileZone Controls Row (PileZone.tsx)
```typescript
// Source: src/components/PileZone.tsx lines 76-95
<div className="flex gap-1 mt-1">
  <Button variant="ghost" className="h-7 w-7 p-0" onClick={handleToggleFace} ...>
    {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
  </Button>
  <Button variant="ghost" className="h-7 w-7 p-0" onClick={handleShuffle} ...>
    <Shuffle className="w-4 h-4" />
  </Button>
</div>
```

### Conditional Primary Color via cn() (Phase 22 precedent)
```typescript
// Source: src/components/HandZone.tsx lines 173-179 — cn() conditional class pattern
className={cn(
  'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card',
  isOver ? 'border-t-2 border-primary' : '',
  isRevealed ? 'ring-1 ring-primary/50 ring-inset' : ''
)}
// For sort icon: <ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Custom drag | @dnd-kit multi-card via PLAY_CARD_SET | Select All feeds directly into existing PLAY_CARD_SET; no new drag infra |
| Sort as visual-only | Sort via REORDER_HAND (server-persistent) | Reconnecting players see sorted order |

---

## Open Questions (RESOLVED)

1. **Does REORDER_HAND need a `skipSnapshot` field to exclude sort from undo stack?**
   - What we know: CONTEXT.md says sort "does not enter the undo stack." REORDER_HAND currently calls `takeSnapshot` unconditionally (line 334, `party/index.ts`).
   - What's unclear: Is this an intentional design that needs a server change, or is the CONTEXT.md statement aspirational and undo-on-sort is acceptable?
   - Recommendation: Planner should add a `skipSnapshot?: boolean` field to `REORDER_HAND` in `types.ts` and branch in the server handler. If the team decides sort-undo is acceptable, skip the server change and document the deviation from CONTEXT.md.

2. **Does sort mode reset when new cards are added to the hand mid-game?**
   - What we know: Local `sortMode` state persists across server updates. When the server sends a new card array (deal, pass), `cards` prop changes but `sortMode` is still active.
   - What's unclear: Should the sort automatically re-apply on each card update, or should adding a card "break" the sort (showing deal order for the new card)?
   - Recommendation: Re-dispatch `REORDER_HAND` in a `useEffect([cards])` when `sortMode !== 'original'`. This keeps the hand consistently sorted. Planner should decide whether this re-dispatch should also skip snapshot.

3. **What does "Select All" mean on a face-down pile with interior masked cards?**
   - What we know: Only the top card is draggable from a pile. Interior cards have masked IDs unavailable to the client.
   - What's unclear: Was SELECT-01 intended only for spread zones and face-up piles, or is it meant to work on all piles including face-down stacks?
   - Recommendation: Implement Select All on piles as "select the top card only." The button can be disabled on an empty pile. This is consistent with the existing single-card drag from piles. If the intent was different, the planner should re-scope SELECT-01 to spread zones only.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "original" sort mode should NOT dispatch REORDER_HAND (relies on server order being unchanged) | Patterns | If server order is different from when sort was applied, cycling back to "original" will not restore pre-sort order — it will just stop re-sorting |
| A2 | Select All on a pile selects only the top card (not interior masked cards) | Pitfalls / Pattern 4 | If intent is to move all pile cards at once, PLAY_CARD_SET source validation will reject masked card IDs — implementation would need rethinking |

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config-only changes with no new external dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SORT-01 | `sortCards()` produces correct order for By Suit mode (D-01, D-03) | unit | `npm test -- --reporter=verbose tests/handSort.test.ts` | ❌ Wave 0 |
| SORT-01 | `sortCards()` produces correct order for By Rank mode (D-02, D-03) | unit | `npm test -- --reporter=verbose tests/handSort.test.ts` | ❌ Wave 0 |
| SORT-01 | `REORDER_HAND` dispatched with correct sorted IDs when sort button clicked (cycle from original → bySuit) | unit | `npm test -- --reporter=verbose tests/handSort.test.ts` | ❌ Wave 0 |
| SORT-01 | Sort persists via server (REORDER_HAND handler already tested in `reorderUndo.test.ts`) | unit (existing) | `npm test -- --reporter=verbose tests/reorderUndo.test.ts` | ✅ |
| SELECT-01 | Select All on a pile with a top card populates selectedIds with that card's ID | unit | `npm test -- --reporter=verbose tests/selectAll.test.ts` | ❌ Wave 0 |
| SELECT-02 | Select All on a spread zone populates selectedIds with all faceUp card IDs | unit | `npm test -- --reporter=verbose tests/selectAll.test.ts` | ❌ Wave 0 |
| SELECT-03 | After Select All, PLAY_CARD_SET fires with the correct card IDs on drag | integration (server) | `npm test -- --reporter=verbose tests/selectAll.test.ts` | ❌ Wave 0 |

**Note:** SORT-01 and SELECT-01/02/03 tests are client-side UI logic tests. The existing Vitest suite tests server logic only (no React component test renderer). New tests for the sort algorithm (`sortCards`) are pure function tests and fit naturally in the existing pattern. The Select All propagation and UI interaction are best validated via Playwright e2e, but the sort algorithm and server-side persistence can be unit tested.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** `npm test && npm run typecheck` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/handSort.test.ts` — covers SORT-01: pure `sortCards()` function tests for By Suit and By Rank modes
- [ ] `tests/selectAll.test.ts` — covers SELECT-01/02/03: server-side PLAY_CARD_SET with pre-populated multi-card selection

---

## Security Domain

This phase adds no authentication, session, cryptography, or input handling concerns beyond what already exists. The `REORDER_HAND` action already validates that `orderedCardIds` contains exactly the player's current hand (server-side, line 323–332 of `party/index.ts`). No new server actions are introduced.

Security posture: unchanged from Phase 22.

---

## Sources

### Primary (HIGH confidence)
- `src/components/HandZone.tsx` — existing sort dispatch pattern, header layout, Eye/EyeOff button placement [VERIFIED: codebase]
- `src/components/SpreadZone.tsx` — eye button placement (below zone body, not header), selection wiring [VERIFIED: codebase]
- `src/components/PileZone.tsx` — controls row layout, existing button pattern [VERIFIED: codebase]
- `src/components/BoardDragLayer.tsx` — selection state location, handleToggleSelect, PLAY_CARD_SET dispatch on multi-card drag [VERIFIED: codebase]
- `party/index.ts` — REORDER_HAND handler (line 319–338), takeSnapshot behavior [VERIFIED: codebase]
- `src/shared/types.ts` — Card type, ClientAction union, REORDER_HAND shape [VERIFIED: codebase]
- `.planning/phases/23-replace-hardcoded-communal-zone-id/23-CONTEXT.md` — all decisions D-01 through D-10 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- `package.json` — lucide-react 1.7.0 confirmed installed; available icons inferred from existing usage (Eye, EyeOff, Shuffle) [VERIFIED: codebase]

### Tertiary (LOW confidence — none)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs
- Architecture: HIGH — read all four canonical source files; data flow fully traced
- Pitfalls: HIGH — discovered from direct code reading (REORDER_HAND snapshot behavior, masked card structure, SpreadZone button placement)
- Sort algorithm: HIGH — Card type fields and constant arrays directly verified in types.ts and party/index.ts

**Research date:** 2026-05-16
**Valid until:** Stable — no external dependencies; valid until codebase changes
