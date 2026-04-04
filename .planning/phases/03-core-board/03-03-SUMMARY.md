---
phase: 03-core-board
plan: 03
subsystem: ui
tags: [react, typescript, dnd-kit, drag-and-drop, websocket, card-game]

requires:
  - phase: 03-core-board-01
    provides: MOVE_CARD action in ClientAction union, server handler
  - phase: 03-core-board-02
    provides: BoardView, PileZone, HandZone, CardFace, CardOverlay, CardBack, OpponentHand components

provides:
  - DraggableCard: card with useDraggable attached, opacity:0 while dragging
  - BoardDragLayer: DndContext wrapper with onDragStart/End/Cancel, DragOverlay portaled to body
  - usePartySocket (extended): sendAction + setDragging + isDraggingRef drag buffer
  - PileZone (updated): useDroppable wired internally, renders DraggableCard for top card
  - HandZone (updated): useDroppable wired internally with playerId, renders DraggableCard per card
  - BoardView (updated): typed ClientAction prop, passes playerId to HandZone
  - App.tsx (updated): RoomView conditionally renders BoardDragLayer when gameState non-null

affects: [human-verify-task-3]

tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/utilities@3.2.2"
  patterns:
    - "isDraggingRef = useRef(false) in usePartySocket — NOT useState, preserves live value in WS closure"
    - "bufferRef holds STATE_UPDATE messages during active drag, flushed on drag end"
    - "dragDataRef captures active.data.current in onDragStart before optimistic removal unmounts source"
    - "DragOverlay portaled to document.body via createPortal to avoid overflow clipping"
    - "BoardDragLayer wraps BoardView inside DndContext, passes sendAction down"

key-files:
  created:
    - src/components/DraggableCard.tsx
    - src/components/BoardDragLayer.tsx
  modified:
    - src/hooks/usePartySocket.ts
    - src/components/PileZone.tsx
    - src/components/HandZone.tsx
    - src/components/BoardView.tsx
    - src/App.tsx
    - package.json

key-decisions:
  - "usePartySocket extended (not wrapped) — hook already owns gameState setter and WS ref; extending is cleaner than splitting"
  - "dragDataRef captures drag data in onDragStart to guard against dnd-kit issue #794 (data.current empty on drop after optimistic unmount)"
  - "DragOverlay portaled to body — hand strip uses overflow-x:auto which creates clipping context"
  - "closestCenter collision detection — appropriate for free-form zone-to-zone drops (not sortable lists)"

requirements-completed: [CARD-01, CARD-02]

duration: 2min
completed: 2026-04-04
---

# Phase 3 Plan 03: Drag-and-Drop Integration Summary

**dnd-kit wired to board — DraggableCard with useDraggable, PileZone/HandZone with useDroppable, BoardDragLayer with DndContext + buffered WS state, App.tsx routing to board on gameState arrival.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-04T00:44:29Z
- **Completed:** 2026-04-04T00:46:37Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 8

## Accomplishments

- Installed @dnd-kit/core@6.3.1 and @dnd-kit/utilities@3.2.2
- Extended usePartySocket with drag buffer: isDraggingRef (useRef, not useState) prevents stale closure bug in WS handler; bufferRef holds incoming STATE_UPDATE during drag and flushes on drag end
- Added sendAction (wraps WS send) and setDragging callback to usePartySocket return value
- Created DraggableCard: useDraggable with CSS.Translate.toString transform, opacity:0 while dragging, touch-action:none
- Updated PileZone: useDroppable wired internally, top card rendered as DraggableCard
- Updated HandZone: useDroppable with playerId for drop routing, each card rendered as DraggableCard
- Created BoardDragLayer: DndContext with closestCenter, onDragStart captures dragDataRef before optimistic removal, onDragEnd sends MOVE_CARD action, DragOverlay portaled to document.body
- Updated BoardView: typed sendAction prop (ClientAction, not unknown), passes playerId to HandZone
- Updated App.tsx: RoomView conditionally renders BoardDragLayer when gameState non-null, LobbyPanel when null

## Task Commits

1. **Task 1: Install dnd-kit, wire drag-and-drop, extend usePartySocket** - `d8769f4` (feat)
2. **Task 2: Wire BoardDragLayer into App.tsx** - `0509d12` (feat)

## Files Created/Modified

- `src/components/DraggableCard.tsx` - Card with useDraggable, CSS.Translate.toString, opacity control
- `src/components/BoardDragLayer.tsx` - DndContext wrapper with drag handlers, DragOverlay portal, dragDataRef
- `src/hooks/usePartySocket.ts` - Extended with isDraggingRef, bufferRef, sendAction, setDragging
- `src/components/PileZone.tsx` - useDroppable wired internally, DraggableCard for top card
- `src/components/HandZone.tsx` - useDroppable with playerId, DraggableCard per card
- `src/components/BoardView.tsx` - Typed ClientAction prop, playerId passed to HandZone
- `src/App.tsx` - Conditional BoardDragLayer / LobbyPanel render based on gameState
- `package.json` / `package-lock.json` - @dnd-kit/core and @dnd-kit/utilities added

## Decisions Made

- Extended `usePartySocket` rather than wrapping it — hook already owns the gameState setter and wsRef; a wrapper would duplicate the connection logic
- `isDraggingRef` is a `useRef` not `useState` — the WebSocket message handler closure captures the initial state value at mount; only a ref guarantees the live value is read
- `dragDataRef` captures `active.data.current` in `onDragStart` before any optimistic state mutation, guarding against dnd-kit issue #794 where data.current becomes `{}` when the source component unmounts
- `DragOverlay` portaled to `document.body` — hand strip `overflow-x:auto` creates a stacking context that clips absolute children without the portal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BoardView sendAction type incompatibility**
- **Found during:** Task 1 TypeScript check
- **Issue:** BoardView typed `sendAction` as `(action: unknown) => void` (Plan 02 scaffolding); BoardDragLayer passes `(action: ClientAction) => void`. TypeScript rejected the assignment.
- **Fix:** Updated BoardView.tsx to import `ClientAction` from types and type sendAction properly. Combined with Task 2's BoardView update (same file).
- **Files modified:** src/components/BoardView.tsx
- **Commit:** d8769f4

**2. [Rule 3 - Blocking] Plan 02 component files missing from worktree**
- **Found during:** Task 1 read phase
- **Issue:** BoardView, PileZone, HandZone, CardFace, CardOverlay from Plan 02 not present in worktree (parallel agent committed to different branch).
- **Fix:** Merged `worktree-agent-a0d8b6ce` branch (Plan 02 commits) into this worktree; cherry-picked Plan 01 MOVE_CARD commit from `gsd/v1.0-milestone`.
- **Files modified:** (git operations, no code change)
- **Commit:** merge commit

## Known Stubs

None — all data flows from server state through usePartySocket to components.

## Issues Encountered

- Parallel execution: Plan 02 components were committed to a separate worktree branch. Resolved by merging the other agent's branch before proceeding.

## User Setup Required

Task 3 (human-verify checkpoint) requires:
1. `npm run dev` (Vite dev server)
2. `npx partykit dev` (PartyKit dev server)
3. Open http://localhost:5173 and verify board layout, card rendering, drag-and-drop, multi-player sync

## Next Phase Readiness

- All drag infrastructure is wired and TypeScript-clean
- 39 server tests pass
- Awaiting human verification of visual/interactive behavior (Task 3)

## Self-Check: PASSED

- FOUND: src/components/DraggableCard.tsx
- FOUND: src/components/BoardDragLayer.tsx
- FOUND: .planning/phases/03-core-board/03-03-SUMMARY.md
- FOUND: commit d8769f4
- FOUND: commit 0509d12

---
*Phase: 03-core-board*
*Completed: 2026-04-04*
