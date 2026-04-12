---
phase: 06-functional-tech-debt
plan: 01
subsystem: core
tags: [tech-debt, host-config, ux, cleanup, types]
dependency_graph:
  requires: []
  provides: [copy-link-in-game, correct-prod-host-fallback, dead-code-removed]
  affects: [src/hooks/usePartySocket.ts, src/components/BoardView.tsx, src/components/BoardDragLayer.tsx, src/App.tsx, src/shared/types.ts, party/index.ts]
tech_stack:
  added: []
  patterns: [roomId prop threading, clipboard writeText, import.meta.env.DEV guard]
key_files:
  created: []
  modified:
    - src/hooks/usePartySocket.ts
    - src/components/BoardView.tsx
    - src/components/BoardDragLayer.tsx
    - src/App.tsx
    - src/shared/types.ts
    - party/index.ts
    - tests/undoMove.test.ts
  deleted:
    - tests/drawCard.test.ts
decisions:
  - "MOVE_CARD pile→hand already calls takeSnapshot and sets card.faceUp=true — semantically equivalent to old DRAW_CARD for undo tests; no test restructuring needed"
  - "Targeted edits used for BoardView instead of full-file replacement — existing structure matched plan reference exactly"
metrics:
  duration: ~5 minutes
  completed_date: "2026-04-10T01:04:53Z"
  tasks_completed: 3
  files_changed: 8
---

# Phase 06 Plan 01: Functional Tech Debt Summary

**One-liner:** Fixed production host fallback bug in usePartySocket, added in-game Copy link button via roomId threading, and purged dead DRAW_CARD/SHUFFLE_DECK types from the entire codebase.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix host fallback in usePartySocket | 6b14882 | src/hooks/usePartySocket.ts |
| 2 | Add copy-link button to BoardView | 1dfa19c | src/components/BoardView.tsx, BoardDragLayer.tsx, App.tsx |
| 3 | Delete DRAW_CARD and SHUFFLE_DECK | 98b042d | src/shared/types.ts, party/index.ts, tests/undoMove.test.ts, tests/drawCard.test.ts (deleted) |

## What Was Built

### Task 1 — Host Fallback Fix
The `PARTYKIT_HOST` constant in `usePartySocket.ts` had a duplicated `'localhost:1999'` in both branches of the ternary, meaning prod builds would attempt to connect to localhost instead of the PartyKit cloud host. Fixed to use `'virtual-deck.aaronkaminsky.partykit.dev'` in the production branch.

### Task 2 — In-Game Copy Link Button
`roomId` is now threaded: `App.tsx (RoomView)` → `BoardDragLayer` → `BoardView`. BoardView renders a Copy link button in the top-right control cluster next to PlayerPresence. Clicking it writes `${origin}${BASE_URL}?room=${roomId}` to the clipboard and shows a "Copied!" confirmation for 2 seconds. Uses `outline` + `sm` Button variant with lucide-react Copy/Check icons.

### Task 3 — Dead Code Removal
- `SHUFFLE_DECK` and `DRAW_CARD` removed from `ClientAction` union in `src/shared/types.ts`
- Both `case "SHUFFLE_DECK"` and `case "DRAW_CARD"` blocks deleted from `party/index.ts` switch
- `tests/drawCard.test.ts` deleted entirely
- `tests/undoMove.test.ts` rewritten: all 7 DRAW_CARD sends replaced with equivalent MOVE_CARD pile→hand messages with explicit cardIds based on pile state at each point

**Test count:** 88 tests passing (was 92 with drawCard.test.ts; 4 deleted tests were for the removed handler).

## Decisions Made

- **MOVE_CARD pile→hand takes snapshot and sets faceUp=true:** The server's MOVE_CARD handler already calls `takeSnapshot` (line 190) and sets `card.faceUp = true` when `toZone === "hand"` (line 210). This is semantically equivalent to the old DRAW_CARD behavior, so no test assertions needed adjustment beyond the action type substitution.
- **Targeted edits for BoardView:** Current BoardView structure matched the plan's reference exactly. Used targeted edits rather than full-file replacement to reduce risk of dropping context.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All changes are functional with real data.

## Self-Check: PASSED

- src/hooks/usePartySocket.ts: FOUND (contains virtual-deck.aaronkaminsky.partykit.dev)
- src/components/BoardView.tsx: FOUND (contains navigator.clipboard.writeText, roomId, Copy link)
- src/components/BoardDragLayer.tsx: FOUND (roomId threaded)
- src/App.tsx: FOUND (roomId={roomId} passed)
- src/shared/types.ts: FOUND (no DRAW_CARD/SHUFFLE_DECK)
- party/index.ts: FOUND (no case DRAW_CARD/SHUFFLE_DECK)
- tests/drawCard.test.ts: CONFIRMED DELETED
- Commits 6b14882, 1dfa19c, 98b042d: all present in git log
- npm test: 88 tests passed
- npx tsc --noEmit: exit 0
- npm run build: exit 0
