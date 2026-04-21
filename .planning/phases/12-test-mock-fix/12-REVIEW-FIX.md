---
phase: 12-test-mock-fix
fixed_at: 2026-04-20T00:00:00Z
fix_scope: critical_warning
findings_in_scope: 2
fixed: 2
skipped: 0
iteration: 1
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed:** 2026-04-20
**Scope:** Critical + Warning
**Findings in scope:** 2
**Fixed:** 2
**Skipped:** 0
**Status:** all_fixed

## Fixes Applied

### WR-01: Strengthen `opponentHandCounts` assertion

**File:** `tests/broadcastMasking.test.ts:60`
**Commit:** c2d7a42
**Change:** Replaced `toBeDefined()` with `toBe(1)` so a regression where `opponentHandCounts` is populated with `0` would be caught.

### WR-02: Broaden `makeMockRoom` connections parameter type

**File:** `tests/helpers.ts:5-6`
**Commit:** 77fb5b7
**Change:** Changed `connections` parameter type from `Array<Party.Connection & { send: ReturnType<typeof vi.fn> }>` to `Party.Connection[]`, enabling any caller to pass a standard connection array without TypeScript errors.

## Skipped Findings

None — all in-scope findings were fixed.

## Info Findings (out of scope)

- **IN-01:** `makeCard` rank field inconsistency — not fixed (info only, no --all flag passed). Tests do not currently inspect rank/suit, so no behavioral impact.

---

_Fixed: 2026-04-20_
_Fixer: Claude (gsd-code-fixer)_
_Scope: critical_warning_
