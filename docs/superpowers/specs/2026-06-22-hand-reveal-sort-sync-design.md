# Hand Reveal/Sort Sync (Backlog #1009)

## Problem

A player's hand sort order (`SortMode`: `'original' | 'bySuit' | 'byRank'`, in `BoardDragLayer.tsx`) is purely a render-time transform applied to the server's `cards` array — it is never dispatched back to the server. This is intentional for hidden hands (`docs` convention: "render-time sort, no server dispatch").

But when a hand is revealed (`SET_HAND_REVEALED`), opponents see the hand via `opponentRevealedHands` in `viewFor()`, which reflects the server's stored card order — not the owner's locally sorted order. Result: if the owner sorts their hand and then reveals it, opponents see the unsorted (original deal) order while the owner sees a sorted one.

## Rule

- **Hand visible:** sort order must be shared — the server's stored order should match what the owner sees.
- **Hand hidden:** sort order stays client-only, as today. No behavior change.

## Design

Add a `REORDER_HAND` dispatch (existing action, `src/shared/types.ts`, handled in `party/index.ts:409-429`) at the two points where the visible order can change, instead of a `useEffect` watching `cards`/`sortMode`/`handRevealed`. An effect-based approach risks the documented infinite-loop trap: dispatching reorder → server echoes new `cards` order → effect fires again.

Two call sites get an added side effect, both already present in the codebase:

1. **Reveal toggle** (`BoardView.tsx:168`, `onToggleReveal`): when toggling `handRevealed` `false → true`, if `sortMode !== 'original'`, compute `sortCards(myHand, sortMode)` and dispatch `REORDER_HAND` with `skipSnapshot: true` immediately after `SET_HAND_REVEALED`.
2. **Sort mode change** (wherever `setSortMode` is called in `BoardDragLayer.tsx`, e.g. a cycle-sort handler): if `gameState.myHandRevealed` is currently `true`, also dispatch `REORDER_HAND` with the newly computed order and `skipSnapshot: true`.

No dispatch occurs:
- On reveal `true → false` (hidden hands don't need their stored order touched).
- When `sortMode === 'original'` (display already matches server order; nothing to sync).
- On any change while the hand is hidden (current behavior, unchanged).

`skipSnapshot: true` matches the existing convention for sort/display-preference actions — these shouldn't be undoable moves.

## Edge Cases

- **Reveal → sort → hide → sort differently → reveal again:** each reveal-on transition re-syncs from current `sortMode`, so the second reveal also dispatches correctly. No stale state carried across hide/reveal cycles.
- **Reveal with `sortMode === 'original'` then change sort while revealed:** covered by call site 2 — dispatches on the sort change since hand is already visible.
- **Opponent's own view of their hand:** unaffected — `HandZone` always renders via `sortCards()` at render time regardless of server order, for the owner's own client.

## Testing

- Unit/integration: dispatch `SET_HAND_REVEALED(true)` with a non-`'original'` `sortMode` active, assert `REORDER_HAND` is sent with the sorted `orderedCardIds`.
- Unit/integration: with hand already revealed, change `sortMode`, assert `REORDER_HAND` is sent.
- Negative: toggling reveal off, or sorting while hidden, assert no `REORDER_HAND` dispatch.
- E2e (two-browser-context per Playwright convention): Player A sorts hand by rank, reveals it; Player B (opponent) sees the revealed cards in the same sorted order.
