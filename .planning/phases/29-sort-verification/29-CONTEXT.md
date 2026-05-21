# Phase 29: Sort Verification - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Define "original order" semantics for the hand sort feature; change sort from server-dispatching to render-time only; verify the behavior after drag-reorder + sort cycling with unit tests.

**In scope:** SORT-02 — original order semantics documented, implementation corrected to render-time sort, unit tests updated
**Out of scope:** Any layout changes, drag behavior changes beyond sort mode reset, sort persistence across sessions (accepted as non-requirement)

</domain>

<decisions>
## Implementation Decisions

### Sort persistence

- **D-01:** Sort is **render-time only** — no server dispatch on sort button clicks. `buildSortDispatch` is deleted. `handleSort` in `HandZone.tsx` only calls `setSortMode(nextMode)`; it never calls `sendAction`.
- **D-02:** `buildSortDispatch` is removed from `HandZone.tsx` entirely. The existing `handSort.test.ts` test covering `buildSortDispatch` is deleted.
- **D-03:** The `sortCards` pure function and its tests are kept unchanged.

### "Original order" semantics

- **D-04:** "Original order" = **current server/manual order** — the order the server currently holds for the player's hand. This is set by drag-reorder (REORDER_HAND without skipSnapshot) and never changed by sort button clicks.
- **D-05:** Sort mode is purely a client-side visual overlay. After reconnect, sort mode resets to 'original' (the server order). This is acceptable — sort is a session-local display preference, not a game state.

### Drag in sorted mode

- **D-06:** When a player drags a card in a non-original sort mode, the existing behavior is preserved: `setSortMode('original')` is called after the drag, and `REORDER_HAND` (without skipSnapshot) is dispatched with the drag-reordered `displayedCards` IDs. The drag order becomes the new server/original order.

### Test updates

- **D-07:** `tests/handSort.test.ts` is updated: the `buildSortDispatch` test block is removed. A new test is added verifying that `sortCards` does not mutate the input array (confirming the render-time invariant — the source `cards` array is preserved as the "original order").
- **D-08:** No new test files. All SORT-02 test coverage lives in `tests/handSort.test.ts`.
- **D-09:** The existing REORDER_HAND handler tests in `tests/reorderUndo.test.ts` already verify that drag-reorder updates server state. Those tests are not changed.

### Claude's Discretion

- Exact wording of the new test description in `handSort.test.ts`
- Whether to leave a comment in `handleSort` explaining why there's no `sendAction` call (sort is render-time only) — can add one if it aids future maintainability

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary implementation file
- `src/components/HandZone.tsx` — contains `buildSortDispatch` (to delete), `handleSort` (to update: remove sendAction call), `sortCards` (keep unchanged), `SORT_CYCLE` constants, and the `displayedCards` render-time sort logic (line 154)

### Test files
- `tests/handSort.test.ts` — update: remove buildSortDispatch test block, add sortCards non-mutation test
- `tests/reorderUndo.test.ts` — reference only; existing REORDER_HAND tests remain unchanged

### Requirements
- `.planning/REQUIREMENTS.md` §Sort — SORT-02 definition and acceptance criteria
- `.planning/ROADMAP.md` Phase 29 — success criteria for "original order" semantics, drag-reorder verification, and unit tests

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sortCards(cards, mode)` in `HandZone.tsx:24` — pure sort helper; keep unchanged; exported for tests
- `buildSortDispatch` in `HandZone.tsx:39` — DELETE this function entirely
- `handleSort` in `HandZone.tsx:156` — UPDATE: remove the `buildSortDispatch` call and `sendAction(dispatch)` call; keep `setSortMode(nextMode)` only

### Established Patterns
- `displayedCards = sortMode === 'original' ? cards : sortCards(cards, sortMode)` (line 154) — render-time visual sort; this line stays as-is; it correctly shows server state when sortMode = 'original'
- `setSortMode('original')` on drag-end (line 219) — resets sort mode after drag; keep unchanged
- `REORDER_HAND` with no `skipSnapshot` on drag-reorder (line 221) — drag dispatches to server, creating the new "original order"; keep unchanged
- `skipSnapshot: true` on REORDER_HAND for sort — this pattern is REMOVED (sort no longer dispatches)

### Integration Points
- `handleSort` currently calls `sendAction(dispatch)` only when `dispatch !== null`. After D-01, sort never dispatches. Remove the `sendAction` call and the `buildSortDispatch` call entirely.
- `HandZone` receives `sendAction` prop — prop stays (still used for drag-reorder REORDER_HAND dispatch via `useDndMonitor`)

</code_context>

<specifics>
## Specific Ideas

- The implementation change is minimal: delete `buildSortDispatch`, update `handleSort` to only call `setSortMode`. No other changes to `HandZone.tsx`.
- The test change is also minimal: one describe block removed (`buildSortDispatch` test), one test added (sortCards non-mutation).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-sort-verification*
*Context gathered: 2026-05-21*
