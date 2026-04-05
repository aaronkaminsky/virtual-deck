---
phase: 05-resilience-polish
plan: "02"
subsystem: ui
tags: [react, typescript, websocket, connection-status, presence]

requires:
  - phase: 05-01
    provides: reconnect identity fix — stable player token survives reconnects, Player.connected field populated on server

provides:
  - ConnectionBanner component with 1s show delay and 10s escalation
  - PlayerPresence component with per-player status dots and hover tooltips
  - connected prop threaded from usePartySocket through App -> BoardDragLayer -> BoardView

affects: [05-03, any phase adding multiplayer UI]

tech-stack:
  added: []
  patterns:
    - "Connection state flows as a boolean prop from hook to leaf components — no separate state store"
    - "Escalating UX: brief disconnection suppressed (1s), sustained disconnection escalates message (10s)"

key-files:
  created:
    - src/components/ConnectionBanner.tsx
    - src/components/PlayerPresence.tsx
  modified:
    - src/App.tsx
    - src/components/BoardDragLayer.tsx
    - src/components/BoardView.tsx

key-decisions:
  - "1-second delay before showing banner avoids flicker on momentary drops"
  - "ConnectionBanner sits above board as first child of root flex column — does not displace card table"
  - "PlayerPresence placed inline next to ControlsBar in top-right area (per D-06)"

patterns-established:
  - "useEffect cleanup pattern for dual-timer escalation: show timer + escalate timer both cleared on connected=true or unmount"

requirements-completed:
  - ROOM-04

duration: 8min
completed: 2026-04-05
---

# Phase 05 Plan 02: Presence UI Summary

**ConnectionBanner with amber escalating message and PlayerPresence status dots wired through BoardDragLayer into BoardView**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-05T20:19:00Z
- **Completed:** 2026-04-05T20:27:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- ConnectionBanner shows "Connection lost. Reconnecting..." after 1s disconnection, escalates to "Connection lost — refresh to rejoin" after 10s, auto-dismisses on reconnect
- PlayerPresence renders one dot per player: green=connected, gray=disconnected; own dot is larger with ring; hover tooltips say "You (Connected)" etc.
- `connected` boolean prop now flows from `usePartySocket` all the way to `BoardView` — previously it was available in RoomView but not passed down

## Task Commits

1. **Task 1: Create ConnectionBanner and PlayerPresence components** - `a115e83` (feat)
2. **Task 2: Wire connected prop and presence components into board** - `930724e` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/components/ConnectionBanner.tsx` - Disconnection banner with 1s show delay and 10s message escalation
- `src/components/PlayerPresence.tsx` - Row of colored status dots, one per player, with hover tooltips
- `src/App.tsx` - Passes `connected` prop to BoardDragLayer
- `src/components/BoardDragLayer.tsx` - Accepts and threads `connected` to BoardView
- `src/components/BoardView.tsx` - Renders ConnectionBanner + PlayerPresence; connected in interface

## Decisions Made

- 1-second delay before showing banner avoids UX flicker on brief websocket blips
- ConnectionBanner sits as first child in the root flex column — it pushes content down slightly rather than overlapping, which is cleaner for a banner
- PlayerPresence placed next to ControlsBar in top-right flex container (per D-06 from CONTEXT.md)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROOM-04 (reconnect identity + presence UI) is now complete
- Phase 05-03 can proceed to any remaining resilience/polish items
- ConnectionBanner and PlayerPresence are ready for visual verification in browser

---
*Phase: 05-resilience-polish*
*Completed: 2026-04-05*
