---
phase: 20-spread-zone-multi-select
plan: "01"
subsystem: server/party
tags: [play-card-set, server-contract, partykit, tdd, fromZone, toZone-hand]
dependency_graph:
  requires: []
  provides: [PLAY_CARD_SET pile-source support, PLAY_CARD_SET toZone:hand support, PILE_NOT_FOUND error code]
  affects: [src/shared/types.ts, party/index.ts, tests/playCardSet.test.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, fromZone branching, MOVE_CARD faceUp precedent]
key_files:
  created: []
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/playCardSet.test.ts
decisions:
  - "fromZone is optional — existing hand-source callers (BoardDragLayer.tsx) need no changes; backward compat preserved by the 5 unchanged existing tests"
  - "Pile-source UNAUTHORIZED_MOVE guard skipped — fromId is a pile id, not a player token; deferred to TODO(SPREAD-03 ownership) per REQUIREMENTS.md"
  - "toZone:'hand' auto-creates hands[toId] as [] if missing (mirrors MOVE_CARD line 260)"
metrics:
  duration: "~120 seconds"
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 20 Plan 01: PLAY_CARD_SET Server Contract Extension Summary

Extended the `PLAY_CARD_SET` server action to accept pile-source moves (`fromZone:'pile'`) and hand-destination moves (`toZone:'hand'`), implementing the server-side foundation for SPREAD-03 multi-card drag from spread zones.

## What Was Built

### Task 1: Widened PLAY_CARD_SET Action Type (src/shared/types.ts)

Final shape of the PLAY_CARD_SET union member (replaces one-line edit at line 67):

```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile"; fromId: string; toZone: "pile" | "hand"; toId: string }
```

Key changes:
- `fromZone?: "hand" | "pile"` added before `fromId` (optional — backward compat)
- `toZone` widened from `"pile"` to `"pile" | "hand"`
- `fromZone` is optional — all existing callers typecheck without changes

### Task 2: New Vitest Tests — RED State (tests/playCardSet.test.ts)

Added `makeStateWithPileCards` helper (3-argument: playerId, pileId, cards) and 4 new `it()` cases:

1. **pile→pile move** — `fromZone:'pile'`, `fromId:'spread-player-1'`, `toZone:'pile'`, `toId:'play'` → cards removed from source pile, appended to dest pile
2. **pile→hand move** (D-06) — `toZone:'hand'`, `toId:'player-1'` → source pile emptied, hand receives cards
3. **PILE_NOT_FOUND rejection** — unknown `fromId` → ERROR emitted, no mutation
4. **faceUp=true on hand dest** — face-down cards in pile → moved to hand with `faceUp:true`

Test totals after Task 2: **9 tests** (5 existing passing, 4 new failing — expected RED state before Task 3).

### Task 3: Extended PLAY_CARD_SET Handler (party/index.ts) — GREEN

Handler branching structure:

```
// V4 Access Control — only for hand-source
if (!fromZone || fromZone === "hand") {
  if (fromId !== senderToken) → UNAUTHORIZED_MOVE
}
// TODO(SPREAD-03 ownership): pile-source ownership guard deferred per REQUIREMENTS.md.

// Source resolution
source = (!fromZone || fromZone === "hand")
  ? this.gameState.hands[fromId]          // existing hand path
  : this.gameState.piles.find(p => p.id === fromId)?.cards  // new pile path

// Not found → HAND_NOT_FOUND or PILE_NOT_FOUND respectively

// Dest resolution
if (toZone === "pile")  → piles.find(p => p.id === toId)?.cards → PILE_NOT_FOUND if absent
if (toZone === "hand")  → hands[toId] ?? (hands[toId] = [])  // auto-create

// faceUp assignment
if (toZone === "hand") → card.faceUp = true  (mirrors MOVE_CARD line 274–275)
if (toZone === "pile") → card.faceUp = destPile.faceUp  (existing behavior)

// Atomic mutation
hand-source: hands[fromId] = source.filter(not in cardIdSet)
pile-source: srcPile.cards = srcPile.cards.filter(not in cardIdSet)
dest.push(...cardsToPlay)
```

Error codes produced:
- `EMPTY_CARD_SET` — cardIds length 0
- `UNAUTHORIZED_MOVE` — hand-source fromId !== senderToken
- `HAND_NOT_FOUND` — hand-source hand missing
- `PILE_NOT_FOUND` — pile-source pile missing OR toZone:'pile' dest missing
- `CARD_NOT_IN_SOURCE` — cardIds not all present in source
- `DUPLICATE_CARD_IDS` — duplicate cardIds

### TODO Comment for Deferred Ownership Guard

```typescript
// TODO(SPREAD-03 ownership): pile-source ownership guard deferred per REQUIREMENTS.md.
```

Present in `party/index.ts` inside the PLAY_CARD_SET case block.

## Test Status

- `npm test -- --run tests/playCardSet.test.ts`: **9 passing, 0 failing** (GREEN after Task 3)
- `npm test` full suite: **154 tests, 0 failures** across all test files
- `npm run typecheck`: exits 0

## Deviations from Plan

None. All tasks executed as specified. The 3-argument `makeStateWithPileCards` helper used exactly as defined in the plan (not the 2-argument version from PATTERNS.md — plan was authoritative).

## Threat Flags

- T-20-01 (pile-source ownership): deferred per REQUIREMENTS.md; documented with `TODO(SPREAD-03 ownership)` comment. Hand-source authorization unchanged.
- T-20-02 (duplicate check): V6 duplicate check preserved verbatim.
- T-20-03 (PILE_NOT_FOUND): new error branch confirmed by passing tests.
- T-20-04 (faceUp assignment): `toZone:'hand'` faceUp=true confirmed by test 4.

## Self-Check

File exists: src/shared/types.ts — FOUND (modified)
File exists: party/index.ts — FOUND (modified)
File exists: tests/playCardSet.test.ts — FOUND (modified)
Task 1 commit 15fe479 — FOUND
Task 2 commit 38bf0ef — FOUND
Task 3 commit dc9ed32 — FOUND
