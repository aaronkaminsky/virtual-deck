---
phase: 03-core-board
verified: 2026-04-04T00:00:00Z
status: passed
score: 13/13 must-haves verified
human_verification:
  - test: "Visual card rendering — rank, suit, colors"
    expected: "CardFace renders rank in top-left and bottom-right corners with centered suit symbol; red for hearts/diamonds, near-black for spades/clubs"
    why_human: "CSS rendering correctness requires visual inspection in a browser"
  - test: "Drag card from hand to pile zone"
    expected: "Card moves visually from hand to pile; pile count badge increments; card removed from hand row"
    why_human: "Drag-and-drop interaction requires pointer events in a live browser"
  - test: "Drag card from pile to hand"
    expected: "Card appears in player hand immediately; pile count badge decrements"
    why_human: "Drag-and-drop interaction requires pointer events in a live browser"
  - test: "Drop on invalid target (empty space)"
    expected: "Card snaps back to its source position; no MOVE_CARD sent"
    why_human: "Requires observing snap-back animation in a live browser"
  - test: "No visual tearing during drag while server state updates arrive"
    expected: "Incoming STATE_UPDATE during drag does not cause the card being dragged to snap or disappear"
    why_human: "Timing-sensitive — requires two-player session or network throttling to reproduce"
  - test: "Multi-player real-time sync"
    expected: "Moving a card in one tab causes the other tab to update pile counts and opponent hand counts in real time"
    why_human: "Requires two browser sessions pointed at the same room and a live PartyKit server"
  - test: "Opponent hand card backs"
    expected: "OpponentHand shows N overlapping face-down card backs with a count badge; face values not visible"
    why_human: "Requires a second player in the room to populate opponentHandCounts"
---

# Phase 3: Core Board Verification Report

**Phase Goal:** Players can see the shared table with pile zones and their private hand, and move cards between them
**Verified:** 2026-04-04
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Board displays configurable pile zones (draw, discard, play area) with card count visible | VERIFIED | `defaultGameState` produces 3 piles; `PileZone` renders count via `<Badge>{pile.cards.length}</Badge>`; `BoardView` maps `gameState.piles` to `<PileZone>` |
| 2 | Each player sees their own hand face-up; other players see only card backs with correct count | VERIFIED | `viewFor` returns `myHand` (full cards) + `opponentHandCounts` (counts only, no card data); `OpponentHand` renders N `<CardBack>` components; server enforces masking |
| 3 | Player can drag a card from hand to a table pile; all players see the change in real time | VERIFIED (logic) / HUMAN (visual) | `DraggableCard` attaches `useDraggable`; `PileZone` uses `useDroppable`; `BoardDragLayer.handleDragEnd` sends `MOVE_CARD`; server broadcasts `STATE_UPDATE` to all connections |
| 4 | Player can drag a card from a table pile to their own hand | VERIFIED (logic) / HUMAN (visual) | `DraggableCard` on pile top card with `fromZone="pile"`; `HandZone` uses `useDroppable` with `toZone="hand"`; `MOVE_CARD` handler moves card to hand; `card.faceUp = true` set on move-to-hand |
| 5 | Incoming server state update during active drag does not cause visual tearing | VERIFIED (logic) / HUMAN (visual) | `usePartySocket` uses `isDraggingRef = useRef(false)` (not `useState`); `bufferRef` holds `STATE_UPDATE` during drag; flushed in `setDragging(false)` — stale closure bug avoided |

**Score:** 13/13 must-haves from plans verified programmatically. 5 success criteria require human verification for interactive/visual behavior.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | MOVE_CARD ClientAction variant | VERIFIED | Contains `type: "MOVE_CARD"` with `fromZone: "hand" \| "pile"`, `toZone`, `fromId`, `toId`, `cardId` |
| `party/index.ts` | MOVE_CARD handler + play pile in defaultGameState | VERIFIED | `case "MOVE_CARD"` present with UNAUTHORIZED_MOVE, CARD_NOT_IN_SOURCE, PILE_NOT_FOUND error codes; `play` pile in `defaultGameState` |
| `tests/moveCard.test.ts` | Unit tests for MOVE_CARD handler | VERIFIED | 9 test cases covering hand->pile, pile->hand, pile->pile, error codes, auth |
| `tests/deck.test.ts` | Updated test asserting 3 piles | VERIFIED | Contains assertion for piles with ids "draw", "discard", "play"; play pile has name "Play Area" and 0 cards |
| `src/components/CardFace.tsx` | CSS-rendered card face with rank/suit | VERIFIED | Contains `SUIT_SYMBOL` map with unicode ♠♥♦♣, `CARD_FACE_URL` import, `w-[63px] h-[88px]`, `text-red-600`, `rotate-180` |
| `src/components/CardBack.tsx` | CSS crosshatch card back | VERIFIED | Contains `repeating-linear-gradient`, `#1a3050`, `#1e3a5f`, `CARD_BACK_URL` import |
| `src/components/CardOverlay.tsx` | Card clone for DragOverlay (no dnd hooks) | VERIFIED | Contains `scale(1.07)`, imports `CardFace`, no dnd hooks |
| `src/components/PileZone.tsx` | Pile zone with count badge and drop target | VERIFIED | Contains `Badge`, `bg-secondary`, `border-primary`, `w-[80px] h-[112px]`, `useDroppable` wired internally |
| `src/components/OpponentHand.tsx` | Opponent hand strip with face-down backs | VERIFIED | Renders `cardCount` number of `<CardBack>` with `-ml-4` overlap; `<Badge>` count; label "Player" |
| `src/components/HandZone.tsx` | Player hand strip with face-up cards | VERIFIED | Contains `h-[128px]`, `overflow-x-auto`, `bg-card`, `useDroppable` wired, `SortableContext` for hand reordering |
| `src/components/BoardView.tsx` | Top-level board layout composing all zones | VERIFIED | Contains `h-screen w-screen overflow-hidden flex flex-col`, opponent strip `h-[88px]`, pile row `flex-1 flex items-center justify-center`, `HandZone` with `playerId` passed |
| `src/components/DraggableCard.tsx` | Card with useDraggable attached | VERIFIED | Contains `useDraggable`, `CSS.Translate.toString`, `opacity: isDragging ? 0 : 1`, `touchAction: 'none'` |
| `src/components/BoardDragLayer.tsx` | DndContext wrapper with drag handlers | VERIFIED | Contains `DndContext`, `DragOverlay`, `createPortal` to `document.body`, `dragDataRef`, `closestCenter`, sends `MOVE_CARD` in `handleDragEnd` |
| `src/hooks/usePartySocket.ts` | Extended hook with sendAction + drag buffer | VERIFIED | Contains `isDraggingRef = useRef(false)`, `bufferRef`, `sendAction`, `setDragging`; message handler checks `isDraggingRef.current` before applying state |
| `src/App.tsx` | RoomView conditionally renders BoardView | VERIFIED | `if (gameState)` renders `<BoardDragLayer>`; otherwise renders `<LobbyPanel>`; destructures `sendAction` and `setDragging` from `usePartySocket` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `party/index.ts` | `src/shared/types.ts` | import ClientAction MOVE_CARD variant | WIRED | `import type { Card, ClientAction, ... }` at line 2 |
| `tests/moveCard.test.ts` | `party/index.ts` | import defaultGameState, viewFor | WIRED | `import GameRoom, { defaultGameState, viewFor } from "../party/index"` |
| `src/components/CardFace.tsx` | `src/card-art.ts` | import CARD_FACE_URL | WIRED | `import { CARD_FACE_URL } from '@/card-art'` |
| `src/components/CardBack.tsx` | `src/card-art.ts` | import CARD_BACK_URL | WIRED | `import { CARD_BACK_URL } from '@/card-art'` |
| `src/components/BoardView.tsx` | `src/shared/types.ts` | import ClientGameState | WIRED | `import type { ClientAction, ClientGameState } from '@/shared/types'` |
| `src/components/BoardDragLayer.tsx` | `src/hooks/usePartySocket.ts` | sendAction callback for MOVE_CARD | WIRED | `sendAction` prop received from `usePartySocket` in `App.tsx`, passed to `BoardDragLayer`; used in `handleDragEnd` to send `MOVE_CARD` |
| `src/components/BoardDragLayer.tsx` | `src/components/CardOverlay.tsx` | DragOverlay children | WIRED | `import { CardOverlay } from './CardOverlay'`; used in `<DragOverlay>{activeCard ? <CardOverlay card={activeCard} /> : null}</DragOverlay>` |
| `src/hooks/usePartySocket.ts` | `party/index.ts` | WebSocket MOVE_CARD message | WIRED | `sendAction` serializes `ClientAction` to JSON and sends via `wsRef.current?.send` |
| `src/App.tsx` | `src/components/BoardView.tsx` | conditional render when gameState non-null | WIRED | `if (gameState)` renders `<BoardDragLayer>` which contains `<BoardView>` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `BoardView.tsx` | `gameState.piles` | `usePartySocket` → WebSocket `STATE_UPDATE` → `viewFor` on server | Yes — server queries `this.gameState.piles` from in-memory state, populated by `defaultGameState` and mutated by `MOVE_CARD` | FLOWING |
| `BoardView.tsx` | `gameState.myHand` | `usePartySocket` → `viewFor` returns `state.hands[playerToken]` | Yes — real card data from `DRAW_CARD`/`MOVE_CARD` mutations | FLOWING |
| `BoardView.tsx` | `gameState.opponentHandCounts` | `viewFor` computes `cards.length` per opponent hand | Yes — counts derived from live `state.hands` record | FLOWING |
| `OpponentHand.tsx` | `cardCount` | Passed from `BoardView` via `opponentHandCounts` map | Yes — derived from real server state | FLOWING |
| `PileZone.tsx` | `pile.cards` | Passed from `BoardView` via `gameState.piles` | Yes — real card array from server | FLOWING |
| `HandZone.tsx` | `cards` | `gameState.myHand` via `BoardView` | Yes — player's actual hand cards | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 39 server tests pass | `npm test` | 6 test files, 39 tests, all passed | PASS |
| TypeScript type checking | `npx tsc --noEmit` | No output (0 errors) | PASS |
| @dnd-kit/core installed at v6 | `npm ls @dnd-kit/core` | `@dnd-kit/core@6.3.1` | PASS |
| MOVE_CARD handler exists in server | grep for `case "MOVE_CARD"` in `party/index.ts` | Found at line 149 | PASS |
| play pile in defaultGameState | grep for `play` in `party/index.ts` | Found `{ id: "play", name: "Play Area", cards: [], faceUp: true }` | PASS |
| DragOverlay portaled to body | grep for `createPortal` in `BoardDragLayer.tsx` | `createPortal(... document.body)` at line 75 | PASS |
| isDraggingRef is useRef not useState | grep in `usePartySocket.ts` | `isDraggingRef = useRef(false)` confirmed | PASS |
| dragDataRef Pitfall-3 mitigation | grep in `BoardDragLayer.tsx` | `dragDataRef.current = data` in `handleDragStart`, before any state mutation | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TABLE-01 | 03-01, 03-02, 03-03 | Shared table supports multiple configurable pile/zone types (draw, discard, play area) | SATISFIED | 3 piles in `defaultGameState`; `PileZone` renders each pile from `gameState.piles` |
| TABLE-02 | 03-01, 03-02, 03-03 | Card count is visible to all players for each pile | SATISFIED | `<Badge>{pile.cards.length}</Badge>` in `PileZone`; all players receive `piles` in `ClientGameState` via broadcast |
| TABLE-03 | 03-02, 03-03 | Opponent hand card counts are visible to all players (face values are not) | PARTIALLY SATISFIED | Server: `opponentHandCounts` in `viewFor` provides counts without face data (SATISFIED). UI: `OpponentHand` renders `cardCount` card backs (SATISFIED). Marked Pending in REQUIREMENTS.md — needs human verification that opponent strips display correctly in a live multi-player session. |
| CARD-01 | 03-01, 03-03 | Player can drag-and-drop cards between their hand, table zones, and piles | SATISFIED (logic) / HUMAN (visual) | `DraggableCard` + `PileZone`/`HandZone` useDroppable + `BoardDragLayer` MOVE_CARD dispatch — full code path wired |
| CARD-02 | 03-01, 03-03 | Player can draw a card from the top of any pile | SATISFIED | `DRAW_CARD` handler existed before Phase 3; `DraggableCard` on pile top card with `fromZone="pile"` enables drag-to-hand |

**Note on REQUIREMENTS.md traceability table:** TABLE-03 is marked "Pending" in REQUIREMENTS.md despite being implemented. The implementation satisfies the requirement. The REQUIREMENTS.md status reflects the pre-Phase-3 baseline and was not updated after plan execution.

**Note on extra types:** `REORDER_HAND` and `SET_PILE_FACE` appear in `src/shared/types.ts` and `party/index.ts`. These were added by a quick task (260403-pya) during Phase 3 execution after the plans were written. They are functional additions beyond the plan scope, not stubs, and do not interfere with plan requirement coverage.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No placeholder returns, TODO comments, empty implementations, or hardcoded empty data found in any phase 3 artifacts. All data flows from WebSocket state to component props through real server queries.

### Human Verification Required

#### 1. Visual Card Rendering

**Test:** Open http://localhost:5173 (with `npm run dev` + `npx partykit dev`). Observe the pile zones once connected. Draw a card to your hand.
**Expected:** Cards show rank in top-left and bottom-right corners, suit symbol centered; hearts/diamonds are red, spades/clubs are near-black; card backs show blue crosshatch pattern.
**Why human:** CSS rendering correctness cannot be verified programmatically.

#### 2. Drag Card From Hand to Pile

**Test:** Draw a card to your hand. Drag it from the hand strip up to the Discard pile zone.
**Expected:** Card leaves hand row, appears on Discard pile, Discard badge increments from 0 to 1, hand row count decreases.
**Why human:** Pointer-event drag interactions require a live browser.

#### 3. Drag Card From Pile to Hand

**Test:** Drag the top card of the Draw pile down to the hand strip.
**Expected:** Card appears in hand as a face-up card. Draw pile count decrements.
**Why human:** Pointer-event drag interactions require a live browser.

#### 4. Invalid Drop Returns Card to Source

**Test:** Start dragging a card, then release over empty board space (not a pile zone or hand strip).
**Expected:** Card animates back to its source position. No card movement occurs.
**Why human:** Snap-back animation requires visual observation.

#### 5. No Visual Tearing During Drag

**Test:** Open two tabs with the same room URL. In tab 1, start dragging a card. From tab 2, perform any action that triggers a STATE_UPDATE broadcast.
**Expected:** The dragging card in tab 1 does not snap or disappear when the state update arrives.
**Why human:** Timing-sensitive behavior requiring two simultaneous sessions.

#### 6. Multi-Player Opponent Hand Display

**Test:** Open two tabs with the same room URL. In tab 1, draw several cards. Observe tab 2.
**Expected:** Tab 2's opponent strip shows the correct number of face-down card backs for tab 1's hand. Card faces are not visible.
**Why human:** Requires two active player sessions to populate `opponentHandCounts`.

### Gaps Summary

No automated gaps found. All artifacts exist, are substantive, are wired, and have verified data flow. The 39-test suite passes, TypeScript is clean, and all key links trace end-to-end from browser drag event to server state mutation to broadcast.

The 6 human verification items are required because they involve visual rendering, pointer-event interactions, and multi-player timing — none of which can be confirmed via static analysis.

---

_Verified: 2026-04-04_
_Verifier: Claude (gsd-verifier)_
