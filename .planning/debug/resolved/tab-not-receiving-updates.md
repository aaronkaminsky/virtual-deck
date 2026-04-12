---
status: resolved
trigger: "One browser tab connected to a PartyKit room is not receiving real-time state updates. The other tab receives and displays state changes correctly."
created: 2026-04-04T00:00:00.000Z
updated: 2026-04-04T02:00:00.000Z
---

## Current Focus

hypothesis: CONFIRMED (Bug 3) — After deal, hand drag fails because client uses localStorage playerId as fromId/toId in drag data, but server uses connection.id as playerToken. Server's MOVE_CARD handler rejects moves where fromId !== senderToken (connection.id). The two IDs never match so all hand moves are blocked with UNAUTHORIZED_MOVE.
test: Add myPlayerId field to ClientGameState populated by viewFor(playerToken). Client uses gameState.myPlayerId instead of localStorage playerId for all drag identity checks and MOVE_CARD fromId/toId values.
expecting: Hand drag sends MOVE_CARD with correct server-side token; server accepts the move.
next_action: Implement fix: (1) add myPlayerId to ClientGameState type, (2) populate in viewFor, (3) thread through BoardDragLayer/BoardView/HandZone replacing localStorage playerId usage in drag data.

## Symptoms

expected: All connected browser tabs receive the same broadcasted game state updates in real-time via WebSocket (PartyKit).
actual: After dealing 13 cards, one tab correctly shows the updated state (13 cards moved to player hand, draw pile reduced), but the FIRST tab remains stuck showing the original 52-card draw pile and does not update when the other tab takes actions.
errors: None reported — stuck tab shows no error messages, simply does not update.
reproduction: Open http://localhost:5173?room=test1 in 2 browser tabs. In Tab 2, click "Deal" and deal 13 cards. Tab 2 shows the result correctly. Tab 1 does not update.
started: Discovered during Phase 4 UAT. New feature — not known if it ever worked.

## Eliminated

- hypothesis: broadcastState() excludes the sender connection
  evidence: broadcastState() at party/index.ts:411 iterates all connections with no exclusion filter — it sends to every connection unconditionally.
  timestamp: 2026-04-04T00:00:00.000Z

- hypothesis: Client filters incoming messages by player ID
  evidence: usePartySocket.ts message handler applies state for every STATE_UPDATE unconditionally (no player ID check). The drag buffer is the only condition that defers update, and that restores when drag ends.
  timestamp: 2026-04-04T00:00:00.000Z

- hypothesis: viewFor returns empty/unchanged view for one player
  evidence: viewFor correctly uses conn.id at broadcast time. The real issue is upstream — conn.id is the same for both tabs so only one connection exists.
  timestamp: 2026-04-04T00:00:00.000Z

- hypothesis: DEAL_CARDS handler only deals to the sending player
  evidence: Handler iterates gameState.players.filter(p => p.connected) — covers all players. Bug was that both tabs shared the same player entry (same playerToken from localStorage), not that the loop was wrong.
  timestamp: 2026-04-04T01:00:00.000Z

- hypothesis: Popover controlled open state not updating on first click
  evidence: Base UI controlled mode syncs correctly. The real issue was nesting render={<Button>} (which wraps @base-ui/react/button) inside PopoverTrigger (also a Base UI primitive) — the inner ButtonPrimitive intercepted the first click.
  timestamp: 2026-04-04T01:00:00.000Z

## Evidence

- timestamp: 2026-04-04T00:00:00.000Z
  checked: src/hooks/usePlayerId.ts
  found: getOrCreatePlayerId() reads from localStorage key 'playerId'. If not present, creates one with nanoid() and stores it. Returns same value every time within the same browser.
  implication: Both tabs in the same browser share localStorage, so both tabs get the exact same playerId string.

- timestamp: 2026-04-04T00:00:00.000Z
  checked: src/App.tsx
  found: RoomView calls getOrCreatePlayerId() and passes the result as both the display playerId AND to usePartySocket(roomId, playerId).
  implication: Both tabs pass the same player ID string to usePartySocket.

- timestamp: 2026-04-04T00:00:00.000Z
  checked: src/hooks/usePartySocket.ts line 17-21
  found: new PartySocket({ host, room: roomId, id: playerId }) — the `id` option is set to playerId. This id becomes the connection.id on the PartyKit server.
  implication: Both tabs create PartySocket connections with the same `id`. PartyKit treats this as the same connection identity.

- timestamp: 2026-04-04T00:00:00.000Z
  checked: party/index.ts onConnect (line 91)
  found: const playerToken = connection.id — the server identifies each player by their connection.id. The server's getConnections() iterates live connections by their id.
  implication: When Tab 2 connects with the same id as Tab 1, PartyKit replaces or supersedes the first connection under that id. The server's room.getConnections() only sees one connection for that id, which belongs to Tab 2. Tab 1's socket is disconnected or orphaned server-side. Broadcasts only reach Tab 2.

- timestamp: 2026-04-04T00:00:00.000Z
  checked: PartyKit partysocket behavior with duplicate IDs
  found: PartyKit uses the `id` field as a unique connection identifier. When two connections use the same id, only one is tracked in room.getConnections(). The first is displaced.
  implication: Root cause confirmed — Tab 1 is disconnected from broadcast because Tab 2 took over its connection ID.

- timestamp: 2026-04-04T01:00:00.000Z
  checked: party/index.ts onConnect after previous fix
  found: playerToken was set from searchParams.get("player") — same localStorage playerId for both tabs. gameState.players had one entry shared by both tabs.
  implication: DEAL_CARDS dealt to one player (the shared entry) even though both tabs were connected.

- timestamp: 2026-04-04T01:00:00.000Z
  checked: src/components/ControlsBar.tsx PopoverTrigger render prop
  found: render={<Button variant="default" size="sm" />} nests @base-ui/react/button inside @base-ui/react/popover trigger. First click consumed by inner ButtonPrimitive.
  implication: Popover required 2 clicks — first to satisfy inner button interaction, second to actually trigger Popover open.

- timestamp: 2026-04-04T02:00:00.000Z
  checked: src/components/HandZone.tsx SortableHandCard + useDroppable, party/index.ts MOVE_CARD handler
  found: SortableHandCard sets fromId: playerId (localStorage UUID). useDroppable sets toId: playerId. Server MOVE_CARD checks fromId !== senderToken (connection.id) and toId !== senderToken — both checks use connection.id. localStorage UUID never equals connection.id.
  implication: Every drag involving the hand zone sends UNAUTHORIZED_MOVE error. The drag silently fails — no client error display, card snaps back. Fix: add myPlayerId to ClientGameState (populated by viewFor with playerToken), use gameState.myPlayerId in HandZone instead of the prop that carried localStorage UUID.

## Resolution

root_cause: Four separate bugs. (1) Original: Both tabs shared localStorage playerId → same PartySocket connection ID → PartyKit displaced Tab 1. (2) Post-fix regression: server used player query param as playerToken, but both tabs still send same localStorage playerId as query → same player entry → deal went to one player. (3) PopoverTrigger used render={<Button>} nesting two Base UI interactive primitives → first click consumed without opening Popover. (4) After switching server to connection.id as playerToken, client still used localStorage playerId as fromId/toId in drag data — MOVE_CARD server handler checks fromId/toId against connection.id (senderToken) → UNAUTHORIZED_MOVE error → all hand drags silently rejected.

fix: (1+2) Server onConnect uses connection.id as playerToken. PartySocket has no id: param. (3) PopoverTrigger uses className={buttonVariants()} without nested Button primitive. (4) Added myPlayerId field to ClientGameState, populated by viewFor with the playerToken. BoardView passes gameState.myPlayerId (not localStorage playerId) to HandZone so drag data fromId/toId uses the correct server-assigned token.

files_changed: [party/index.ts, src/shared/types.ts, src/components/ControlsBar.tsx, src/components/BoardView.tsx, tests/dealCards.test.ts, tests/viewFor.test.ts, tests/moveCard.test.ts]
verification: TypeScript compiles cleanly (npx tsc --noEmit). All 77 tests pass (npx vitest run) including regression tests for deal-to-all, viewFor myPlayerId, and hand move auth.
