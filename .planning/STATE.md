---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 999.2-01-PLAN.md
last_updated: "2026-04-12T16:34:56.217Z"
last_activity: 2026-04-12
progress:
  total_phases: 18
  completed_phases: 10
  total_plans: 21
  completed_plans: 21
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.
**Current focus:** Phase 999.2 — put-card-back-on-draw-pile-top-bottom-or-random-position

## Current Position

Phase: 999.3
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-12

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-server-foundation P01 | 145 | 2 tasks | 10 files |
| Phase 01-server-foundation P02 | 30 | 2 tasks | 2 files |
| Phase 01-server-foundation P03 | 30 | 2 tasks | 1 files |
| Phase 02-lobby-room-join P01 | 4 | 2 tasks | 14 files |
| Phase 02-lobby-room-join P02 | 2 | 3 tasks | 7 files |
| Phase 03-core-board P01 | 2 | 1 tasks | 4 files |
| Phase 04-game-controls P02 | 10 | 2 tasks | 9 files |
| Phase 05-resilience-polish P01 | 2 | 2 tasks | 2 files |
| Phase 05-resilience-polish P02 | 8 | 2 tasks | 5 files |
| Phase 05-resilience-polish P03 | 10 | 1 tasks | 0 files |
| Phase 06-functional-tech-debt P01 | 5 | 3 tasks | 8 files |
| Phase 07-nyquist-validation P01 | 5 | 2 tasks | 4 files |
| Phase 08 P01 | 5 | 2 tasks | 2 files |
| Phase 999.1-drag-card-to-opponents-hand P01 | 60 | 2 tasks | 5 files |
| Phase 999.2 P01 | 15 | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Server-first sequence — Phase 1 must prove hand masking before any hand data flows to clients
- [Roadmap]: Stable player token stored in localStorage (UUID), NOT connection.id — reconnect correctness depends on this
- [Roadmap]: ROOM-04 (reconnect-to-hand) deferred to Phase 5 — requires complete game loop to test meaningfully
- [Phase 01-server-foundation]: Card ID format: rank-suit[0] (e.g. A-s, 10-h) — unambiguous for all 52 cards including 10s
- [Phase 01-server-foundation]: Party.Server skeleton with typed stubs in party/index.ts; red phase test stubs in tests/ directory
- [Phase 01-server-foundation]: viewFor masks hands record: returns ClientGameState with myHand + opponentHandCounts, never exposes the hands key
- [Phase 01-server-foundation]: Fisher-Yates shuffle uses crypto.getRandomValues per swap iteration, not Math.random
- [Phase 01-server-foundation]: Per-connection broadcast pattern over room.broadcast — hand masking requires each client gets only its own cards via viewFor(state, conn.id)
- [Phase 01-server-foundation]: Disconnecting players marked connected:false but hands preserved — reconnect flow (Phase 5) depends on hand data surviving disconnect
- [Phase 02-lobby-room-join]: shadcn v4 base-nova generates oklch colors; overrode :root with HSL channel values for dark green felt theme (160 38% 16% background)
- [Phase 02-lobby-room-join]: Added @/* path alias to both tsconfig.json and vite.config.ts so shadcn component imports resolve at compile and bundle time
- [Phase 02-lobby-room-join]: RoomView inner component pattern isolates usePartySocket hook from App redirect guard
- [Phase 02-lobby-room-join]: import.meta.env.BASE_URL used in copy handler for correct shareable URL across dev/prod
- [Phase 02-lobby-room-join]: VITE_PARTYKIT_HOST hardcoded in deploy.yml as virtual-deck.aaronkaminsky.partykit.dev
- [Phase 03-core-board]: MOVE_CARD supports hand->pile, pile->hand, pile->pile; both fromZone and toZone=hand require sender.id match for private hand enforcement
- [Phase 04-game-controls]: isPassCard checked before isSuccess in BoardDragLayer — prevents opponent-hand drops from also triggering MOVE_CARD
- [Phase 05-resilience-polish]: playerToken extracted from ?player= query param in onConnect; slot-based cap counts gameState.players.length not active connections
- [Phase 05-resilience-polish]: 1-second delay before showing ConnectionBanner avoids flicker on brief websocket blips
- [Phase 05-resilience-polish]: PlayerPresence placed next to ControlsBar in top-right flex area; connected prop threads App -> BoardDragLayer -> BoardView
- [Phase 05-resilience-polish]: Test 3 disconnection banner verified via hardcoded connected=false in localhost — DevTools offline throttling has limitations but behavior confirmed correct
- [Phase 05-resilience-polish]: Test 4 room cap with reconnect required quick task 260405-lgq (player ID URL persistence) before passing verification
- [Phase 06-functional-tech-debt]: MOVE_CARD pile->hand already takes snapshot and sets faceUp=true — semantically equivalent to old DRAW_CARD for undo tests
- [Phase 07-nyquist-validation]: Per-task verification maps updated to green for all tasks backed by passing tests; manual-only tasks remain pending
- [Phase 07-nyquist-validation]: Phase 5 VALIDATION.md maps 7 reconnect.test.ts it-cases to task rows 05-01-01 through 05-01-07 (ROOM-04); presence and disconnection banner remain manual-only
- [Phase 999.1-drag-card-to-opponents-hand]: useDndContext (not prop drilling) detects drag source type inside OpponentHand — reads active.data.current.fromZone
- [Phase 999.1-drag-card-to-opponents-hand]: dragIsFromHand triggers affordance for any active drag, not just fromZone=hand check — ensures zone is always visible when user is dragging
- [Phase 999.2]: Used @base-ui/react/dialog Dialog primitives for post-drop position dialog — AlertDialog hardcodes disablePointerDismissal:true which would break click-outside dismiss
- [Phase 999.2]: insertPosition optional on MOVE_CARD defaults to top server-side — backward compatible with all existing dispatches

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260401-pn2 | Fix DRAW_CARD silent failure: return ERROR when pileId missing or pile not found | 2026-04-02 | 454cf45 | [260401-pn2-fix-draw-card-silent-failure-return-erro](./quick/260401-pn2-fix-draw-card-silent-failure-return-erro/) |
| 260403-pya | Hand reordering (drag to rearrange own hand) and per-pile face-up/down toggle | 2026-04-04 | 5dbfe69 | [260403-pya-hand-reordering-and-per-pile-face-toggle](./quick/260403-pya-hand-reordering-and-per-pile-face-toggle/) |
| 260405-lgq | Fix player ID persistence: read ?player= URL param first, embed via replaceState | 2026-04-05 | 23c41b9 | [260405-lgq-fix-player-id-persistence-read-player-fr](./quick/260405-lgq-fix-player-id-persistence-read-player-fr/) |
| 260405-nl3 | Implement TABLE-03: opponent hand card counts visible to all players | 2026-04-05 | 5faea5e | [260405-nl3-implement-table-03-opponent-hand-card-co](./quick/260405-nl3-implement-table-03-opponent-hand-card-co/) |

### Blockers/Concerns

- [Phase 1]: PartyKit hook names (`onStart`, `onConnect`, `onMessage`, `onClose`) and `party.storage` API are MEDIUM confidence — verify at https://docs.partykit.io before writing server code (API is pre-1.0)
- [Phase 2]: Confirm `partysocket` is still the correct client package name before `npm install`
- [Phase 3]: Validate dnd-kit v6 `DragOverlay` / `useSortable` / `useDroppable` APIs before building drag layer

## Session Continuity

Last session: 2026-04-12T15:24:19.598Z
Stopped at: Completed 999.2-01-PLAN.md
Resume file: None
