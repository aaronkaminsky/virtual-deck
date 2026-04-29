---
phase: 15
plan: "01"
subsystem: server
tags: [partykit, server-action, multi-card, atomic-mutation, types]
dependency_graph:
  requires: []
  provides: [PLAY_CARD_SET-server-handler, PLAY_CARD_SET-type]
  affects: [src/shared/types.ts, party/index.ts]
tech_stack:
  added: []
  patterns: [auth-gate-before-mutation, pre-validate-all-before-snapshot, atomic-filter-push]
key_files:
  created:
    - tests/playCardSet.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
decisions:
  - "Reused existing error codes (UNAUTHORIZED_MOVE, HAND_NOT_FOUND, CARD_NOT_IN_SOURCE, PILE_NOT_FOUND) — no new codes needed"
  - "takeSnapshot called after all validation, before any mutation — ensures UNDO_MOVE always sees valid state to revert"
  - "cardIds order preserved via Map lookup (handById) so cards are appended to dest pile in player-chosen order"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_modified: 3
  lines_added: 208
---

# Phase 15 Plan 01: PLAY_CARD_SET Server Action Summary

PLAY_CARD_SET server action: type union extension, atomic handler with auth/validation gates, and 5 Vitest unit tests covering happy path, both security gates, faceUp inheritance, and undo round-trip.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add PLAY_CARD_SET to ClientAction union | ffdb179 | src/shared/types.ts |
| 2 | Implement PLAY_CARD_SET server handler | c330934 | party/index.ts |
| 3 | Write Vitest unit tests | efadceb | tests/playCardSet.test.ts |

## What Was Built

### ClientAction union extension (src/shared/types.ts, line 69)

Added `PLAY_CARD_SET` as a new union member before `PING`, per D-07:
```typescript
| { type: "PLAY_CARD_SET"; cardIds: string[]; fromId: string; toZone: "pile"; toId: string }
```

### Server handler (party/index.ts, lines 492–556)

`case "PLAY_CARD_SET"` inserted after `UNDO_MOVE`, before `PING`, in the `onMessage` switch. Handler sequence:

1. **Authorization gate** (`fromId !== senderToken`) — `UNAUTHORIZED_MOVE` if mismatch; no mutation
2. **Hand existence** (`hands[fromId] === undefined`) — `HAND_NOT_FOUND` if absent
3. **Pre-validation** (`cardIds.every(id => handIdSet.has(id))`) — `CARD_NOT_IN_SOURCE` if any missing; no partial mutation
4. **Pile existence** (`piles.find(p => p.id === toId)`) — `PILE_NOT_FOUND` if absent
5. **Snapshot** (`takeSnapshot(this.gameState)`) — called after all validation, before mutation
6. **Atomic mutation** — `hand.filter(c => !cardIdSet.has(c.id))` removes all played cards; `destPile.cards.push(...cardsToPlay)` appends in cardIds order
7. **faceUp assignment** — each played card gets `card.faceUp = destPile.faceUp ?? true` before push

### Test file (tests/playCardSet.test.ts)

Five Vitest tests covering:
1. `"plays a set of cards from hand to a pile atomically"` — happy path, order preserved
2. `"sends UNAUTHORIZED_MOVE when fromId !== senderToken"` — auth gate, no mutation
3. `"sends CARD_NOT_IN_SOURCE and does not mutate when any cardId is missing from hand"` — no-partial-move guarantee
4. `"sets card faceUp to match destination pile"` — faceUp inheritance from destPile
5. `"takes snapshot before mutation so UNDO_MOVE reverts the set play"` — undo round-trip

## Verification Results

- `grep -c 'PLAY_CARD_SET' src/shared/types.ts` → `1`
- `grep -c 'case "PLAY_CARD_SET":' party/index.ts` → `1`
- `npm test` → 135/135 tests pass (17 test files)
- `npm test -- tests/playCardSet.test.ts` → 5/5 pass
- `npm test -- tests/moveCard.test.ts` → 12/12 pass (no regression)
- `npx tsc --noEmit` → pre-existing `BoardDragLayer.tsx` process error only (unrelated to this plan)

## Deviations from Plan

None — plan executed exactly as written.

The awk acceptance check `awk '/case "PLAY_CARD_SET":/,/break;/ | grep -c 'cardIds.every'` from the plan's criteria evaluates to 0 because awk stops at the first `break;` (inside the auth gate), but `cardIds.every` is present further down in the case. The code is correct; the awk pattern in the acceptance criteria is a false negative due to multi-break structure. Verified by direct grep.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond what the plan's threat model covers. The handler reuses the existing error code surface and follows the established MOVE_CARD pattern.

## Self-Check: PASSED

- `tests/playCardSet.test.ts` exists: FOUND
- `src/shared/types.ts` contains PLAY_CARD_SET: FOUND (line 69)
- `party/index.ts` contains `case "PLAY_CARD_SET":`: FOUND (line 492)
- Commits ffdb179, c330934, efadceb: all present in git log
