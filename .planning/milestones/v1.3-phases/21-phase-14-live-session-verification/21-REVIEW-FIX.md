---
phase: 21-phase-14-live-session-verification
fixed_date: 2026-05-14T00:00:00Z
fix_scope: critical_warning
findings_in_scope: 8
fixed: 8
skipped: 0
iteration: 1
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed:** 2026-05-14
**Scope:** Critical + Warning (8 findings)
**Status:** all_fixed

## Summary

All 3 critical and all 5 warning findings from the phase 21 code review were resolved. Seven atomic fix commits were created; WR-05 was already addressed by a prior UAT fix commit (9d1e4e4) and required no new commit.

---

## Critical Fixes

### CR-01 — Fixed
**Commit:** a656a2f  
**Finding:** `PLAY_CARD_SET` authorization check ran after `takeSnapshot` and source mutation, leaving orphaned undo snapshots on blocked moves.  
**Fix applied:** Moved the `toZone === "hand" && toId !== senderToken` guard to before `takeSnapshot` and before source resolution in `party/index.ts`.

### CR-02 — Fixed
**Commit:** b1317c0  
**Finding:** Modulo bias in `shuffle()` using `buf[0] % (i + 1)` with a 32-bit unsigned integer. Also affected random insertion in `MOVE_CARD`.  
**Fix applied:** Replaced with rejection-sampling `unbiasedRandom()` helper in `party/index.ts`. Used in both `shuffle()` and the `insertPosition: 'random'` branch of `MOVE_CARD`.

### CR-03 — Fixed
**Commit:** f5e508c  
**Finding:** Group-reorder in `HandZone` and `SpreadZone` used fragile `event.delta.x` heuristic for insert direction, which could produce wrong results for net-negative drags.  
**Fix applied:** Replaced `delta.x` direction heuristic with stable original-index comparison (`draggedOriginalIdx < overIdx`) in both `HandZone.tsx` and `SpreadZone.tsx`.

---

## Warning Fixes

### WR-01 — Fixed
**Commit:** 9c18b8e  
**Finding:** Off-by-one in `takeSnapshot` undo cap — `> 20` allowed array to briefly reach 21 entries.  
**Fix applied:** Changed `state.undoSnapshots.length > 20` to `>= 20` in `party/index.ts`.

### WR-02 — Fixed
**Commit:** a9bd282  
**Finding:** `DEAL_CARDS` accepted negative, zero, or fractional `cardsPerPlayer` values.  
**Fix applied:** Added integer range validation (`1–13`) with `ERROR` response for out-of-range values in `party/index.ts`.

### WR-03 — Fixed
**Commit:** 1399787  
**Finding:** `RESET_TABLE` skips snapshot (intentional) and has no authorization check — no comment acknowledged this.  
**Fix applied:** Added explanatory comments in `party/index.ts` documenting the intentional no-snapshot and no-authz design for `RESET_TABLE`.

### WR-04 — Fixed
**Commit:** f6d601e  
**Finding:** `viewFor` accepted `null` playerToken as a valid dead-code path, creating a maintenance hazard.  
**Fix applied:** Added runtime assertion `if (playerToken === null) throw new Error("viewFor requires a non-null playerToken")` in `party/index.ts`.

### WR-05 — Already Fixed (no commit needed)
**Prior commit:** 9d1e4e4 (fix(21-uat): three BoardDragLayer regressions found in UAT pass)  
**Finding:** Multi-card drop path returned early without clearing `dragDataRef.current`, leaving stale drag data.  
**Status:** The fix (`dragDataRef.current = null` at line 201 of `BoardDragLayer.tsx`) was applied by the UAT fix commit before the code review was written. No new commit needed.

---

## Info (out of scope)

- **IN-01** (`party/index.ts:287` — variable shadow `idx`): Not fixed. Info-level; no behavioral impact.
- **IN-02** (`tests/groupReorder.test.ts:53` — test description contradicts assertion): Not fixed. Info-level; no behavioral impact.

---

_Fixed: 2026-05-14_
_Fixer: Claude (gsd-code-fixer)_
_Scope: critical_warning_
