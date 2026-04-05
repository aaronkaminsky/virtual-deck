---
phase: 01-server-foundation
plan: "04"
subsystem: server
tags: [privacy, masking, types, tdd]
dependency_graph:
  requires: ["01-03"]
  provides: ["face-down pile card masking in viewFor"]
  affects: ["party/index.ts", "src/shared/types.ts"]
tech_stack:
  added: []
  patterns: ["MaskedCard union type for server-to-client pile card projection"]
key_files:
  created: []
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/viewFor.test.ts
decisions:
  - "MaskedCard = { faceUp: false } — identity-stripped projection, no id/suit/rank exposed"
  - "ClientPile uses Card | MaskedCard union so face-up cards remain fully typed"
  - "ClientGameState.piles changed from Pile[] to ClientPile[] to enforce type-level privacy"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-05"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 3
---

# Phase 01 Plan 04: Pile Card Masking Summary

**One-liner:** viewFor now strips id/suit/rank from face-down pile cards using MaskedCard union type, closing the draw pile order exposure gap.

## What Was Done

Closed the pile card masking gap identified in 01-VERIFICATION.md. The `viewFor` function previously sent full `Card` data (id, suit, rank) for face-down pile cards to all clients, exposing draw pile card order to anyone inspecting WebSocket traffic.

**Changes:**

- `src/shared/types.ts`: Added `MaskedCard = { faceUp: false }` type and `ClientPile` interface with `cards: (Card | MaskedCard)[]`. Updated `ClientGameState.piles` from `Pile[]` to `ClientPile[]`.
- `party/index.ts`: Fixed `viewFor` to map pile cards through a masking step — face-up cards pass through as-is, face-down cards become `{ faceUp: false }`. Imported `MaskedCard` and `ClientPile` from types.
- `tests/viewFor.test.ts`: Added 3 TDD tests: strips id/suit/rank from face-down cards, preserves full data for face-up cards, preserves pile card count after masking.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8785cfd | feat(01-04): mask face-down pile cards in viewFor |

## Test Results

- 31 tests pass (up from 28 — 3 new viewFor tests added)
- `npx tsc --noEmit` exits 0

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN cycle followed correctly: 1 test failed in RED phase (masking test), all 31 pass in GREEN phase.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `src/shared/types.ts` — file exists and contains `MaskedCard`, `ClientPile`
- [x] `party/index.ts` — contains `card.faceUp` conditional, no raw `piles: state.piles,`
- [x] `tests/viewFor.test.ts` — contains `face-down pile cards` test
- [x] Commit 8785cfd exists in git log
- [x] All 31 tests pass
- [x] TypeScript compiles clean
