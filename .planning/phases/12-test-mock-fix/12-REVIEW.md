---
phase: 12-test-mock-fix
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - tests/helpers.ts
  - tests/broadcastMasking.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed two new files: the shared test helper module (`tests/helpers.ts`) and the new broadcast masking integration test (`tests/broadcastMasking.test.ts`). The overall approach is sound — the helpers correctly replicate the production connection state shape that `getPlayerToken` depends on, and the `broadcastState` → `viewFor` integration is tested at the right level (end-to-end through `onMessage`).

Two warnings were found: a weak assertion that does not fully verify the masking contract, and a type constraint on `makeMockRoom` that limits helper reusability. One info item covers a data inconsistency in the `makeCard` helper.

## Warnings

### WR-01: Weak `opponentHandCounts` assertion does not verify masking count

**File:** `tests/broadcastMasking.test.ts:60`
**Issue:** `expect(remoteUpdate!.state.opponentHandCounts["player-1"]).toBeDefined()` passes for any non-undefined value, including `0`. The purpose of this assertion is to verify that the remote player receives an opponent hand count (not the actual cards). A count of `0` would also satisfy `toBeDefined()`, so a regression where `opponentHandCounts` is populated with `0` for all players would go undetected. After the MOVE_CARD action, `player-1` retains 1 card (`"K-s"`), so the correct assertion is `toBe(1)`.
**Fix:**
```typescript
expect(remoteUpdate!.state.opponentHandCounts["player-1"]).toBe(1);
```

### WR-02: `makeMockRoom` parameter type excludes reuse with plain `Party.Connection[]`

**File:** `tests/helpers.ts:5-6`
**Issue:** The `connections` parameter is typed as `Array<Party.Connection & { send: ReturnType<typeof vi.fn> }>`. This is stricter than the `Party.Connection[]` that `getConnections` returns in production and that the other test files' local `makeMockRoom` copies accept. Any future caller that passes a `Party.Connection[]` (without the augmented `send` mock type) will get a TypeScript error, limiting the helper's reusability across the test suite.
**Fix:** Broaden the parameter type to `Party.Connection[]` — the `send` augmentation is only needed at the call site where callers want to inspect `send.mock.calls`, not in the helper itself:
```typescript
export function makeMockRoom(
  connections: Party.Connection[] = [],
  overrides: Partial<Party.Room> = {}
): Party.Room {
```

## Info

### IN-01: `makeCard` rank field does not match card ID convention

**File:** `tests/helpers.ts:34-36`
**Issue:** `makeCard` hardcodes `rank: "A"` for every card regardless of the `id` argument. A call like `makeCard("K-s")` produces `{ id: "K-s", suit: "spades", rank: "A", faceUp: false }` — the rank field says `"A"` but the id implies `"K"`. The current tests in `broadcastMasking.test.ts` do not inspect `rank` or `suit` fields, so this does not affect passing behavior. However, if any future test using this helper asserts on `rank` or `suit`, it will get unexpected results.
**Fix:** Either derive rank/suit from the id string (matching the convention `${rank}-${suit[0]}` documented in `types.ts`), or document that the helper produces placeholder rank/suit and only the id is meaningful:
```typescript
export function makeCard(id: string, faceUp = false): Card {
  // rank/suit are placeholder values; only id is meaningful for most tests
  return { id, suit: "spades", rank: "A", faceUp };
}
```
A comment clarifying this prevents future confusion without requiring a behavior change.

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
