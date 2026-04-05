---
phase: 05-resilience-polish
plan: 01
subsystem: api
tags: [partykit, websocket, reconnect, identity, player-cap]

requires:
  - phase: 02-lobby-room-join
    provides: stable player token in localStorage + ?player= query param sent by usePartySocket

provides:
  - Fixed onConnect identity — playerToken extracted from ?player= query param, not connection.id
  - Slot-based 4-player cap — counts gameState.players[] length, not active connections
  - Reconnecting player bypasses cap check and restores connected:true status
  - Reconnect identity test suite (7 tests)

affects:
  - 05-02 (presence UI — relies on correct player identity flowing through)
  - 05-03 (disconnection UX — relies on onClose correctly tracking the stable token)

tech-stack:
  added: []
  patterns:
    - "Identity from query param: onConnect extracts stable playerToken via new URL(ctx.request.url).searchParams.get('player')"
    - "Slot-based cap: reject new player if gameState.players.length >= 4 AND player not in existing slots"

key-files:
  created:
    - tests/reconnect.test.ts
  modified:
    - party/index.ts

key-decisions:
  - "playerToken = url.searchParams.get('player') ?? connection.id — fallback to connection.id preserves backward compat if query param missing"
  - "Cap check placed after token extraction so isExistingPlayer check uses correct stable ID"

patterns-established:
  - "TDD RED/GREEN: test file committed with failing tests before implementation fix"

requirements-completed:
  - ROOM-04

duration: 2min
completed: 2026-04-05
---

# Phase 5 Plan 01: Reconnect Identity Fix Summary

**Fixed server player identity to use the stable ?player= query param instead of connection.id, enabling reconnect-to-hand (ROOM-04) and correct slot-based 4-player cap**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-05T20:23:00Z
- **Completed:** 2026-04-05T20:24:40Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Exported `extractPlayerToken`-equivalent logic inline in onConnect via `new URL(ctx.request.url).searchParams.get("player")`
- Replaced connection-count cap (`[...room.getConnections()].length > 4`) with slot-based cap (`gameState.players.length >= 4 && !isExistingPlayer`)
- Added 7 reconnect tests covering: identity extraction, reconnect restore, hand preservation, no duplicate slot, 5th-player rejection, reconnect bypass

## Task Commits

1. **Task 1: TDD reconnect identity and cap logic tests** - `318d80d` (test)
2. **Task 2: Fix onConnect identity and cap logic** - `10b490d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `tests/reconnect.test.ts` — 7 tests covering reconnect identity, hand preservation, slot-based cap, reconnect cap bypass
- `party/index.ts` — Fixed onConnect: 5 lines changed in the method (token extraction + cap logic)

## Decisions Made

- `searchParams.get("player") ?? connection.id` fallback ensures backward compatibility if client sends no `?player=` param
- Cap check placed after token extraction (not before) so the `isExistingPlayer` lookup uses the correct stable ID, not the random connection.id

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Identity fix is complete; ROOM-04 reconnect-to-hand is now correctly gated on the stable token
- Phase 05-02 (presence UI) can rely on correct `connected: boolean` in `gameState.players[]` since onClose already uses `getPlayerToken(connection)` which reads from `connection.state.playerToken`
- Phase 05-03 (disconnection UX) is unblocked

---
*Phase: 05-resilience-polish*
*Completed: 2026-04-05*

## Self-Check: PASSED

- FOUND: tests/reconnect.test.ts
- FOUND: party/index.ts
- FOUND: commit 318d80d (test RED phase)
- FOUND: commit 10b490d (feat GREEN phase)
