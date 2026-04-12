# Phase 4: Game Controls - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the full set of card manipulation controls needed to run a complete game session: individual card flip, pass card to another player's hand, deal N cards from a pile, shuffle any pile, reset the table, and undo the last card move.

**In scope (Phase 4):**
- Individual card flip (CARD-03) — click to flip pile cards face-up/face-down
- Pass card to another player's private hand (CARD-04) — drag from own hand to opponent hand zone
- Deal N cards from a pile to each player's hand (CTRL-01) — number input via popover
- Shuffle any pile on the table (CTRL-02) — already has server handler; needs per-pile button
- Reset table — collect all cards into draw pile and reshuffle (CTRL-03) — with confirmation dialog
- Undo last card move (CTRL-04) — per-player, your own last action only
- Game state: setup phase → play phase transition (Deal triggers the transition)
- Controls bar in the existing top header strip alongside opponent hands

**Out of scope (Phase 4):**
- Mobile/responsive layout — explicitly deferred (REQUIREMENTS.md: mobile-first out of scope)
- Global undo (anyone's last move) — per-player only in this phase
- Player display names in controls bar — PRES-01 deferred to v2
- Flip/shuffle animations — may be added if effort is low, but not required

</domain>

<decisions>
## Implementation Decisions

### Card Flip (CARD-03)
- **D-01:** Trigger: clicking directly on a card flips it. Single click, no hover overlay or right-click menu.
- **D-02:** Scope: only cards in pile zones on the table. Hand cards are not flippable — face direction of private hand cards doesn't matter since only you see them.
- **D-03:** The flip action toggles `card.faceUp` on the server, which broadcasts `STATE_UPDATE` to all players. All players see the new orientation.

### Pass Card (CARD-04)
- **D-04:** Mechanism: drag-and-drop. Drag a card from your own hand and drop it onto an opponent's hand zone in the top strip. Opponent hand zones become droppable targets (extends existing `@dnd-kit/core` setup).
- **D-05:** Source constraint: cards can only be passed from your own private hand. Passing from a table pile is out of scope for this phase — player drags pile card to their hand first, then passes.
- **D-06:** The server action adds the card to the target player's `hands[targetPlayerId]` and removes it from the sender's hand. The recipient receives it in their `myHand`; no other player sees its face.

### Deal N Cards (CTRL-01)
- **D-07:** Trigger: a "Deal" button in the controls bar (top strip). Clicking it opens a compact popover with a number input field (N cards per player) and a confirm button.
- **D-08:** Availability: Deal is only visible/active during the **setup phase** — when the draw pile has cards and no cards are in any player's hand. Once the deal fires, the game transitions to the **play phase** and Deal is replaced by Undo + Reset.
- **D-09:** Deal deals from the draw pile specifically (pile id `draw`). Server distributes N cards to each connected player's hand in round-robin order and broadcasts updated state.

### Game State Phases
- **D-10:** Two phases: `setup` (initial, deck shuffled, hands empty) and `playing` (cards have been dealt/moved). The Deal action triggers the transition from setup → playing.
- **D-11:** Controls bar behavior by phase:
  - **Setup:** Deal button visible. Undo + Reset not shown.
  - **Playing:** Undo + Reset buttons visible. Deal not shown.
  - **Both phases:** Shuffle is available per pile at all times (see D-12).
- **D-12:** Shuffle is a per-pile control. Each pile zone retains (or gains) a "Shuffle" button alongside the existing face-toggle button. Shuffle is available in both setup and playing phases.

### Controls Bar Placement
- **D-13:** Controls (Deal in setup; Undo + Reset in play) live in the existing top header strip, alongside opponent hands. Controls grouped on one side (e.g., right), opponent hands on the other.
- **D-14:** Mobile/responsive layout is deferred. Desktop-first layout is the target; no breakpoints needed for this phase.

### Reset (CTRL-03)
- **D-15:** Reset requires a confirmation dialog before firing: "Reset table? This can't be undone." Simple confirm/cancel. Prevents accidental resets.
- **D-16:** On confirm: all cards from all player hands and all piles are collected into the draw pile, the draw pile is reshuffled (server-side, `crypto.getRandomValues`), and game phase reverts to setup.

### Undo (CTRL-04)
- **D-17:** Per-player undo. Each player can undo their own last card action only. Does not affect other players' undo state.
- **D-18:** Single-step: one undo per player. After undoing, the undo button becomes disabled (no further undo available until next action).
- **D-19:** Server stores one snapshot of `GameState` per player (their last move's before-state). On undo, the server applies the before-state and broadcasts `STATE_UPDATE`.

### Claude's Discretion
- Exact styling of the controls bar (button layout, size, grouping within the header strip)
- Whether the flip click requires a small click guard to prevent accidental triggers during drag
- Number input constraints for deal (min 1, max cards_in_draw_pile / player_count)
- Whether the "Deal" popover is a shadcn Popover component or a simple inline form

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Types and State Shape
- `src/shared/types.ts` — `Card`, `Pile`, `GameState`, `ClientGameState`, `ClientAction` types. New actions (FLIP_CARD, PASS_CARD, DEAL_CARDS, RESET_TABLE, UNDO_MOVE) must be added here.

### Server
- `party/index.ts` — PartyKit room. Existing handlers: SHUFFLE_DECK, DRAW_CARD, MOVE_CARD, REORDER_HAND, SET_PILE_FACE. Phase 4 adds: FLIP_CARD, PASS_CARD, DEAL_CARDS, RESET_TABLE, UNDO_MOVE.

### Existing UI Components
- `src/components/BoardView.tsx` — Top strip holds opponent hands. Controls bar goes here.
- `src/components/PileZone.tsx` — Already has face-toggle button and SET_PILE_FACE handler. Shuffle button and card click-to-flip connect here.
- `src/components/HandZone.tsx` — Player's own hand. Cards dragged from here for PASS_CARD action.
- `src/components/OpponentHand.tsx` — Opponent hand zone in top strip. Must become a droppable target for PASS_CARD.
- `src/components/DraggableCard.tsx` — Individual draggable card. Click handler for FLIP_CARD attaches here (pile context only).

### Drag-and-Drop
- `@dnd-kit/core` — existing drag layer. PASS_CARD extends this: opponent hand zones become droppable targets.

### Project Decisions
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, requirements (CARD-03, CARD-04, CTRL-01, CTRL-02, CTRL-03, CTRL-04)
- `.planning/REQUIREMENTS.md` — Full requirement definitions; mobile-first explicitly out of scope
- `.planning/STATE.md` — Prior phase decisions
- `.planning/phases/03-core-board/03-CONTEXT.md` — Phase 3 decisions: card rendering, board layout, drag-and-drop patterns, dnd-kit usage

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PileZone.tsx`: already has a button UI pattern (face-toggle). Shuffle button follows the same pattern.
- `OpponentHand.tsx`: renders opponent card backs. Needs `useDroppable` hook from dnd-kit to accept card passes.
- `DraggableCard.tsx`: existing draggable card. Click handler for flip can be added with a guard to avoid triggering during drag.
- `usePartySocket.ts`: `sendAction` already wired. New actions plug in without changes to the socket layer.

### Established Patterns
- Per-connection broadcast via `viewFor` (masks hands per player) — all new server actions must use this pattern
- `crypto.getRandomValues` Fisher-Yates for any shuffle operation (established in Phase 1)
- shadcn components (Button, Badge, Dialog/AlertDialog for confirm) already installed
- Tailwind v4, dark felt theme (`bg-background`, `bg-card`) — controls bar inherits these

### Integration Points
- `BoardView.tsx` top strip: add controls bar alongside existing opponent hand rendering
- `PileZone.tsx`: add Shuffle button + click-to-flip handler propagation
- `OpponentHand.tsx`: add `useDroppable` for pass-card drop target
- `GameState` / `ClientGameState`: add `phase: "setup" | "playing"` field; add per-player `lastMove` snapshot for undo

</code_context>

<specifics>
## Specific Ideas

- "Deal is only meaningful at the start of a game" — Deal button appears only in setup phase; once any deal fires, it disappears and Undo + Reset take its place.
- Responsive/mobile is not a Phase 4 concern — explicitly deferred by user.
- Controls placement is same-strip as opponent hands (not a separate bar), keeping the board area maximally open.

</specifics>

<deferred>
## Deferred Ideas

- **Mobile/responsive layout** — User flagged interest; deferred as a future requirement. REQUIREMENTS.md already marks mobile-first out of scope. Candidate for v2.
- **Global undo** (v2 DIFF-04) — "Single-step undo for any player's last move (not just own moves)" — already in v2 requirements, not Phase 4.

</deferred>

---

*Phase: 04-game-controls*
*Context gathered: 2026-04-04*
