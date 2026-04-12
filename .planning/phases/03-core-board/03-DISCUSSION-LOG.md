# Phase 3: Core Board - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-02
**Phase:** 03 — Core Board
**Areas discussed:** Card rendering, Board layout, Drag UX, Pile zone setup, Animations

---

## Areas Selected

User selected all 4 presented areas plus added a note: "animations for card moving, flipping, and shuffling."
Scope note recorded: flip and shuffle animations are Phase 4 (those belong with flip/shuffle actions). Phase 3 covers card-move animations only.

---

## Card Rendering

**Q: How should cards be rendered visually?**
Selected: Hybrid: CSS now, images later
> CSS-rendered cards in Phase 3. card-art.ts URL hooks stay in place so a future commit can swap in images without changing components.

**Q: For CSS-rendered cards — what style?**
Selected: Classic playing card
> White/off-white card face, rank in top-left and bottom-right corners, large suit symbol in center. Red for hearts/diamonds.

**Q: Card back design?**
Selected: Pattern / crosshatch
> Classic card-back pattern (diamonds or hatching). More card-like but slightly more CSS to build.

---

## Board Layout

**Q: Where does the player's hand live on the board?**
Selected: Fixed bottom strip
> Player's hand always anchored at the bottom of the screen. Pile zones fill the upper area.

**Q: Where do opponent hands appear?**
Selected: Top strip, card backs only
> Each opponent gets a row of face-down card backs at the top. Count matches opponentHandCounts.

**Q: How are pile zones arranged on the table?**
Selected: Horizontal row, center screen
> Piles laid out left-to-right across the middle of the board.

---

## Drag UX

**Q: When a player drags a card from hand to pile — when does it visually leave the hand?**
Selected: Optimistic — immediately
> Card disappears from hand the moment the drag starts. Server confirms or snaps back.

**Q: If a server state update arrives while a card is mid-drag — what happens?**
Selected: Freeze incoming updates during drag
> Buffer the server state update while the drag is active. Apply it after drop completes.

**Q: What is a valid drop target?**
Selected: Only pile zones and own hand
> Dragging to an opponent hand or empty board space cancels and returns card.

---

## Pile Zone Setup

**Q: In Phase 3, are pile zones hardcoded or player-configurable?**
Selected: Hardcoded 3 piles
> Draw pile + Discard pile + Play area, always present. No setup step.

**Q: When does the game transition from lobby to board?**
Selected: Immediately when first player connects
> Board shows as soon as a player is in the room. No "start game" button needed for Phase 3.

---

## Animations

**Q: Card drag animation: what should the drag ghost/overlay look like while dragging?**
Selected: Full card clone, slightly scaled up
> Standard card game feel — card follows the cursor slightly enlarged to indicate "lifted."

**Q: After a card is dropped — should it animate into its destination?**
Selected: Yes, brief slide-in
> Short duration (100-150ms). Confirms the move visually without feeling laggy.

---

*Discussion log generated: 2026-04-02*
