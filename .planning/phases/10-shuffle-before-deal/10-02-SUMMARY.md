---
plan: "10-02"
phase: "10-shuffle-before-deal"
status: complete
completed: 2026-04-18
---

## Summary

Wired `SHUFFLE_PILE` handler to broadcast `PILE_SHUFFLED` to all clients, extending animation coverage to manual shuffles (D-05, D-07).

## What Was Built

- Added `this.broadcastShuffleEvent(action.pileId)` to the `SHUFFLE_PILE` case in `party/index.ts`, immediately after the shuffle mutation and with no delay (manual shuffle has no follow-on state change requiring sequencing).
- Added test to `tests/shufflePile.test.ts` verifying that all connections receive exactly one `PILE_SHUFFLED` event with the correct `pileId`.

## Key Files

- `party/index.ts` — SHUFFLE_PILE case now calls `broadcastShuffleEvent`
- `tests/shufflePile.test.ts` — 4 tests pass (3 existing + 1 new broadcast test)

## Deviations

None.

## Self-Check: PASSED

- SHUFFLE_PILE calls `broadcastShuffleEvent(action.pileId)` after shuffle, no delay ✓
- All 4 tests in `tests/shufflePile.test.ts` pass ✓
- TypeScript compiles clean ✓
