---
phase: 03-core-board
plan: 02
subsystem: ui
tags: [react, typescript, tailwind, shadcn, dnd-kit, card-game]

requires:
  - phase: 03-core-board-01
    provides: shared types (Card, Pile, ClientGameState) in src/shared/types.ts
  - phase: 02-lobby-room-join
    provides: shadcn installed, globals.css dark-felt theme, @/* path alias

provides:
  - CardFace: CSS-rendered card face with rank/suit in correct colors
  - CardBack: CSS crosshatch card back with no image dependency
  - CardOverlay: drag clone at scale(1.07) for DragOverlay
  - PileZone: fixed 80x112px drop slot with count badge and empty/over states
  - OpponentHand: overlapping face-down card backs with count badge
  - HandZone: scrollable face-up hand row with amber isOver highlight
  - BoardView: full-viewport flex column composing all zones from ClientGameState

affects: [03-core-board-03]

tech-stack:
  added: []
  patterns:
    - "Optional dnd props (setNodeRef, isOver) on PileZone/HandZone — Plan 03 wires useDroppable internally"
    - "card-art.ts integration: CARD_FACE_URL/CARD_BACK_URL checked at render time; non-empty URL renders img, empty renders CSS"
    - "SUIT_SYMBOL map with unicode characters for CSS card face rendering"

key-files:
  created:
    - src/components/CardFace.tsx
    - src/components/CardBack.tsx
    - src/components/CardOverlay.tsx
    - src/components/PileZone.tsx
    - src/components/OpponentHand.tsx
    - src/components/HandZone.tsx
    - src/components/BoardView.tsx
  modified: []

key-decisions:
  - "PileZone accepts optional setNodeRef/isOver props as scaffolding — Plan 03 will replace with internal useDroppable"
  - "HandZone accepts optional setNodeRef/isOver props as scaffolding — Plan 03 will replace with internal useDroppable"
  - "BoardView threads sendAction prop for Plan 03 use but does not invoke it yet — no DndContext added"

patterns-established:
  - "CardFace: SUIT_SYMBOL unicode map, isRed() helper for color branching, absolute-positioned rank in corners"
  - "card-art.ts integration pattern: check URL at render time, img if truthy, CSS fallback otherwise"

requirements-completed: [TABLE-01, TABLE-02, TABLE-03]

duration: 1min
completed: 2026-04-04
---

# Phase 3 Plan 02: Presentational Card Components and Board Layout Summary

**Seven CSS-only React components — CardFace, CardBack, CardOverlay, PileZone, OpponentHand, HandZone, BoardView — building the full visual layer for the card table, ready for drag-and-drop wiring in Plan 03.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-04T00:38:07Z
- **Completed:** 2026-04-04T00:39:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- CardFace renders rank in top-left/bottom-right corners with centered suit symbol; red for hearts/diamonds, near-black for spades/clubs; integrates CARD_FACE_URL hook from card-art.ts
- CardBack renders CSS crosshatch pattern (#1a3050 base, #1e3a5f lines) with no image files; integrates CARD_BACK_URL hook from card-art.ts
- BoardView composes opponent strip (88px), pile row (flex-1 centered), and hand strip (128px) in a full-viewport flex column from ClientGameState

## Task Commits

1. **Task 1: Card presentational components (CardFace, CardBack, CardOverlay)** - `bd39b16` (feat)
2. **Task 2: Board layout components (PileZone, OpponentHand, HandZone, BoardView)** - `5a8cf96` (feat)

## Files Created/Modified

- `src/components/CardFace.tsx` - CSS card face with rank/suit rendering and CARD_FACE_URL hook
- `src/components/CardBack.tsx` - CSS crosshatch card back and CARD_BACK_URL hook
- `src/components/CardOverlay.tsx` - Drag ghost wrapper at scale(1.07)
- `src/components/PileZone.tsx` - Fixed 80x112px pile slot, count badge, dashed/amber border states
- `src/components/OpponentHand.tsx` - Overlapping face-down card backs per opponent
- `src/components/HandZone.tsx` - Scrollable face-up hand row with amber isOver highlight
- `src/components/BoardView.tsx` - Top-level board layout composing all zones

## Decisions Made

- PileZone and HandZone accept optional `setNodeRef` / `isOver` props as scaffolding so they render usefully today; Plan 03 will wire `useDroppable` internally and pass these from dnd-kit hooks
- BoardView threads `sendAction` prop for Plan 03 use but does not invoke it — no DndContext added here, Plan 03 wraps with BoardDragLayer
- `sendAction` typed as `(action: unknown) => void` to avoid importing ClientAction in this presentational layer — Plan 03 will narrow the type when it actually calls it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 presentational components ready for Plan 03 drag-and-drop wiring
- BoardView accepts ClientGameState and composes all zones correctly
- Optional dnd props (setNodeRef, isOver) are in place so Plan 03 can add useDroppable/useDraggable without touching component signatures

---
*Phase: 03-core-board*
*Completed: 2026-04-04*
