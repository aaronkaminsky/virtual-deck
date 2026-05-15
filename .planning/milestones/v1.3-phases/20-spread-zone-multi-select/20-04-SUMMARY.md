---
phase: 20-spread-zone-multi-select
plan: "04"
subsystem: manual-test
tags: [smoke-test, human-verify, bug-fix, opponent-hand-multi-select]
dependency_graph:
  requires: [20-01, 20-02, 20-03]
  provides: [human-verified multi-select, bug fix for opponent-hand multi-card drag]
  affects: [src/components/BoardDragLayer.tsx]
key_files:
  created: []
  modified:
    - src/components/BoardDragLayer.tsx
metrics:
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 20 Plan 04: Human Smoke Test Summary

## Manual Test Results

| # | Test | Result |
|---|------|--------|
| 1 | Single card click — ring + lift appears | PASS |
| 2 | Click same card again — deselects | PASS |
| 3 | Click 3 different spread cards — all ring; badge shows "3 selected" | PASS |
| 4 | Click selected card — deselects; badge shows "2 selected" | PASS |
| 5 | Escape clears selection | PASS |
| 6 | Click card in another zone — previous selection clears | PASS |
| 7 | Multi-card drag to pile zone | PASS |
| 8 | Multi-card drag to own hand | PASS |
| 9 | Opponent zone cards not draggable | PASS |

## Bug Found and Fixed

**Multi-card drag to opponent's hand moved only one card (badge off by one)**

- `isMultiCardSet` only checked `toZone === 'pile' || toZone === 'hand'`. `OpponentHand` registers `toZone: 'opponent-hand'` — neither matched.
- Code fell through to single-card `PASS_CARD`, leaving other selected cards stranded with a stale badge.

**Fix (2 lines, `src/components/BoardDragLayer.tsx`):**
1. Added `|| overData?.toZone === 'opponent-hand'` to `isMultiCardSet` condition
2. Normalized `'opponent-hand'` → `'hand'` in the `PLAY_CARD_SET` `toZone` field before dispatch

The server's Plan 01 extension already accepts `toZone: 'hand'` for any `toId` — no server changes required.

Commit: `fix(20): include opponent-hand in isMultiCardSet check and normalize toZone in PLAY_CARD_SET dispatch`

## Status

Phase approved. All 9 tests passed after bug fix. Ready for `/gsd-verify-work`.
