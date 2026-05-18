---
phase: 23-replace-hardcoded-communal-zone-id
plan: "02"
subsystem: ui
tags: [react, hand-sort, reorder-hand, dnd-kit, vitest, sortCards, buildSortDispatch]

# Dependency graph
requires:
  - phase: 23-replace-hardcoded-communal-zone-id
    plan: "01"
    provides: "REORDER_HAND with skipSnapshot?: boolean — server skips undo snapshot when flag is true"
provides:
  - "sortCards(cards, mode) pure named export from HandZone.tsx — sorts by suit (spades→clubs→diamonds→hearts, 2→A) or by rank (2→A, suit secondary)"
  - "buildSortDispatch(cards, nextMode) pure named export — returns REORDER_HAND with skipSnapshot:true or null for 'original'"
  - "Hand sort button (ArrowUpDown icon) in HandZone header — cycles Original→By Suit→By Rank→Original"
  - "Render-time visual sort: displayedCards applied in SortableContext and card map without re-dispatching on every cards change"
  - "3 real it() tests in tests/handSort.test.ts covering D-01/D-02/D-03 sort semantics and buildSortDispatch contract"
affects: [hand-sort, reorder-hand, HandZone, sort-undo]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-time visual sort: apply sortCards(cards, sortMode) in the render path instead of useEffect re-dispatch — avoids unnecessary server roundtrips and undo stack pollution"
    - "Drag clears sortMode to 'original': when drag-reorder fires while sortMode != 'original', setSortMode('original') before sendAction so manual drag order wins"
    - "skipSnapshot dispatch for client-only UX actions: sort-by dispatches REORDER_HAND with skipSnapshot:true so it never pollutes the undo stack"
    - "Pure exports from component file: sortCards and buildSortDispatch exported named from HandZone.tsx and tested directly via vitest"
    - "vitest '@' alias: added '@' → 'src' path alias to vitest.config.ts so tests can import component-module pure functions"

key-files:
  created: []
  modified:
    - src/components/HandZone.tsx
    - tests/handSort.test.ts
    - vitest.config.ts

key-decisions:
  - "Render-time visual sort chosen over useEffect re-dispatch: avoids server roundtrips on every card update while keeping the hand visually sorted across state changes"
  - "Drag-reorder while sortMode != 'original' clears sortMode to 'original': manual drag implies user wants manual order; prevents drag appearing to undo itself on next render"
  - "buildSortDispatch always derives orderedCardIds from canonical server hand (cards), not displayedCards: ensures server order matches the sort that was dispatched"
  - "Pure functions exported from HandZone.tsx (not a sibling module): keeps the sort logic co-located with the component that owns it; vitest '@' alias fix makes it testable"

patterns-established:
  - "Sort icon active state: text-primary (amber) when non-original mode active, text-muted-foreground otherwise — distinct from ring-primary/50 used for Hand Reveal"
  - "SortableContext uses displayedCards not cards: drag identities and visual positions are consistent"

requirements-completed:
  - SORT-01

# Metrics
duration: ~13min
completed: 2026-05-17
---

# Phase 23 Plan 02: Hand Sort Summary

**Hand sort button added to HandZone — cycles Original/By Suit/By Rank with render-time visual sort and skipSnapshot REORDER_HAND dispatch, backed by 3 passing unit tests for sortCards and buildSortDispatch**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-05-17T05:27:00Z
- **Completed:** 2026-05-17T05:40:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Exported `sortCards` and `buildSortDispatch` pure functions from `HandZone.tsx`, satisfying the D-01/D-02/D-03 sort semantics locked in CONTEXT.md
- Added ArrowUpDown sort button to hand header row after Eye/EyeOff; icon turns amber (text-primary) when non-original sort active; tooltip text follows D-06 copy
- Converted all 3 `it.todo` stubs in `tests/handSort.test.ts` to real passing assertions — test count went from 177 (3 todo) to 180 (0 todo)

## Task Commits

1. **Task 1: Convert handSort stubs to real tests (RED)** — `6cfa4f3` (test)
2. **Task 2: Implement sort button + render-time sort (GREEN)** — `3a3bd49` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/components/HandZone.tsx` — Added SortMode type, SORT_CYCLE/SUIT_ORDER/RANK_ORDER constants, sortCards export, buildSortDispatch export, useState<SortMode>('original'), displayedCards computed var, handleSort(), sort Button JSX, updated SortableContext + card map to use displayedCards, updated drag-reorder to operate on displayedCards and clear sortMode on drag
- `tests/handSort.test.ts` — Converted 3 it.todo stubs to real it() tests with mkCard factory, bySuit/byRank assertions, and buildSortDispatch dispatch + null checks
- `vitest.config.ts` — Added `'@': resolve(__dirname, 'src')` alias so vitest can resolve HandZone's `@/` imports when the pure functions are imported in tests

## Decisions Made

1. **Render-time visual sort over useEffect re-dispatch:** When sortMode is active, `displayedCards = sortCards(cards, sortMode)` is computed every render. The server hand is only updated on the click itself (skipSnapshot dispatch). This avoids unnecessary server roundtrips when the server pushes updates (deal, pass, opponent action) and avoids the ambiguity of whether auto-resorts should also skip snapshot.

2. **Drag clears sortMode to 'original':** When drag-reorder fires while `sortMode !== 'original'`, `setSortMode('original')` is called before `sendAction`. Rationale: a manual drag expresses explicit intent about card order; leaving sortMode active would re-apply the sort on the next render, making the drag appear to silently undo itself.

3. **buildSortDispatch uses `cards` (canonical server hand), not `displayedCards`:** Ensures the `orderedCardIds` sent to the server always reflect the sorted canonical hand, not a double-transformed array.

4. **Pure functions stay in HandZone.tsx:** Co-located with the component that owns the sort logic. The vitest `@` alias fix (1-line change to vitest.config.ts) makes them testable without extracting to a sibling module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `@` path alias to vitest.config.ts**
- **Found during:** Task 2 (GREEN phase — running tests after implementing HandZone)
- **Issue:** vitest.config.ts only had `@shared` alias, not `@`. HandZone.tsx uses `@/components/ui/button`, `@/shared/types`, etc. When tests import from `../src/components/HandZone`, vitest couldn't resolve these internal imports and threw `Cannot find package '@/components/ui/button'`.
- **Fix:** Added `"@": resolve(__dirname, "src")` to the `resolve.alias` object in vitest.config.ts. The tsconfig already had this alias for TypeScript compilation; vitest needed it for module resolution at test runtime.
- **Files modified:** vitest.config.ts
- **Verification:** `npm test -- tests/handSort.test.ts` exits 0 with 3 passing tests; full suite (`npm test`) exits 0 with 180 passing tests.
- **Committed in:** `3a3bd49` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking config missing)
**Impact on plan:** Necessary for testability of HandZone pure exports. No scope creep — aligns vitest config with the existing tsconfig `paths` setting.

## Issues Encountered

None beyond the vitest config fix documented above.

## Known Stubs

None — all sort functionality is fully wired. The sort button dispatches real REORDER_HAND actions with skipSnapshot:true. The displayedCards array drives both the SortableContext and the card map.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. Sort is client-side UX using the existing REORDER_HAND action (threat T-23-04 accepted in plan threat model).

## Self-Check

- [x] `src/components/HandZone.tsx` exists and contains `export function sortCards` and `export function buildSortDispatch`
- [x] `tests/handSort.test.ts` exists with 3 `it(` calls and 0 `it.todo`
- [x] `vitest.config.ts` contains `"@": resolve(__dirname, "src")`
- [x] `npm test` exits 0 — 180 passing, 0 todo
- [x] `npm run typecheck` exits 0
- [x] Commits `6cfa4f3` (test) and `3a3bd49` (feat) exist in git log

## Self-Check: PASSED

## Next Phase Readiness

- SORT-01 fully delivered. Hand sort button ships with correct cycle, tooltip copy, icon active state, skipSnapshot dispatch, and render-time visual sort.
- Phase 23 Plan 03 (Select All) was already completed in a prior wave. Phase 23 is complete.

---
*Phase: 23-replace-hardcoded-communal-zone-id*
*Completed: 2026-05-17*
