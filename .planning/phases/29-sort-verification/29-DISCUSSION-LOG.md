# Phase 29: Sort Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 29-sort-verification
**Areas discussed:** Sort persistence, Test scenarios

---

## Sort persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Render-time only | Sort is a visual overlay — no server dispatch. 'Original' always = last drag-reorder order. Sort resets on reconnect. | ✓ |
| Current: dispatch to server | Sort persists to server. Sort survives reconnect. 'original' after sort cycle = last-sorted order, not pre-sort drag order. | |

**User's choice:** Render-time only

**Notes:** The current implementation dispatches REORDER_HAND (skipSnapshot: true) on bySuit/byRank sort clicks. This means "original" after a full sort cycle shows the last sort order, not the drag-reordered order. User confirmed: sort should be purely a visual client-side overlay. `buildSortDispatch` should be deleted entirely. `handleSort` only calls `setSortMode`.

---

| Question | Options | Selected |
|----------|---------|----------|
| Drag in sorted mode: what happens to sort mode? | Reset to 'original' / Keep current sort mode | Reset to 'original' (keep current) |
| `buildSortDispatch` API: keep or delete? | Keep (update to always return null) / Delete (remove sendAction call) | Delete |

---

## Test scenarios

| Option | Description | Selected |
|--------|-------------|----------|
| Pure logic only | Keep sortCards tests. Add REORDER_HAND server test for drag-reorder semantics. | ✓ |
| Party server + sort helper tests | Test full chain: REORDER_HAND + sortCards. | |
| Skip new tests | sortCards tests already sufficient; invariant is structural. | |

**User's choice:** Pure logic only (update handSort.test.ts)

| Question | Options | Selected |
|----------|---------|----------|
| Specific test case? | REORDER_HAND handler test / sortCards idempotency test | REORDER_HAND handler test |
| Test location? | handSort.test.ts (update) / New sortSemantics.test.ts | handSort.test.ts (update) |

**Notes:** Remove the `buildSortDispatch` describe block. Add a test verifying `sortCards` does not mutate the input array (documenting the render-time invariant). REORDER_HAND handler behavior (drag-reorder = new server order) is already covered in `reorderUndo.test.ts` — no changes there.

---

## Claude's Discretion

- Exact wording of the new sortCards non-mutation test description
- Whether to add an inline comment in `handleSort` explaining render-time-only design

## Deferred Ideas

None — discussion stayed within phase scope.
