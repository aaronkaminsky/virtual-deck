---
quick_id: 260514-r8m
status: complete
commit: 989bafb
date: 2026-05-14
---

# Quick Task 260514-r8m: Fix 5 Failing Tests

## What Changed

**tests/viewFor.test.ts** (3 tests): Updated null playerToken tests to expect `throw("viewFor requires a non-null playerToken")` instead of a return value. WR-04 added this assertion intentionally.

**tests/spreadZoneCreation.test.ts** (1 test): Same fix — `viewFor(state, null)` now expects throw.

**party/index.ts** (1 line): Reverted WR-01 undo cap change from `>= 20` back to `> 20`. The `>= 20` condition trimmed the array when it reached 20, leaving only 19 entries — not the intended 20-entry cap.

## Result

165/165 tests passing.
