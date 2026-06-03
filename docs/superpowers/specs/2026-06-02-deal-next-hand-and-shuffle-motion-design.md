# Design: Deal Next Hand & Shuffle Motion Polish (999.48 / 999.44)

**Date:** 2026-06-02
**Status:** Approved

## Goal

Two small "quick win" improvements bundled into one milestone:

- **999.48 — Deal next hand.** At the end of a hand, one click resets the table and deals the next hand, reusing the previous cards-per-player count. Unlike today's `RESET_TABLE` (a deliberate dead end), this combined action is **undoable** — one Undo restores the hand that was just cleared.
- **999.44 — Shuffle motion polish.** Replace the flat felt-green rectangles in the shuffle animation with the real **card-back art**, and change the motion to a **two-way cut** that reads as the deck being reordered rather than a fan that returns to the same order.

The two features are independent; they share this spec and ship together.

---

## Part A — 999.48: Deal next hand

### Current behavior

- `DEAL_CARDS { cardsPerPlayer }` (server) validates the count (1–13) and that the draw pile has enough cards, then **snapshots** (already undoable), shuffles the draw pile, broadcasts `PILE_SHUFFLED("draw")`, waits ~650 ms for the fan animation, deals N cards per connected player, and sets `phase = "playing"`.
- `RESET_TABLE` gathers every card (hands, non-draw piles, canvas) back into the draw pile, shuffles, sets `phase = "setup"`, **clears the undo stack** (intentionally non-undoable), and clears reveal states.
- In `ControlsBar`, the Deal control is **disabled** unless `phase` is `setup` or `lobby` (`dealDisabled = phase !== 'setup' && phase !== 'lobby'`), and `maxCards = floor(drawPileCount / connectedPlayers)`.

### New behavior

During play, the Deal control becomes a **"Deal next hand"** action: a single click that gathers the table, reshuffles, and deals the remembered count — as one **undoable** step.

**Server — new action `DEAL_NEXT_HAND { cardsPerPlayer }`:**
1. Validate `cardsPerPlayer` is an integer in `[1, 13]` and that the deal fits the deck. Validation runs *before* the gather, so compute the total against **all cards currently in the game** (sum across every hand, every pile including draw, and the canvas) — these are what will be in the draw pile after gathering — and require `cardsPerPlayer * connectedPlayers ≤ thatTotal`. On failure, send `ERROR` (reuse the `INVALID_CARDS_PER_PLAYER` / `INSUFFICIENT_CARDS` codes) and break — no mutation, no snapshot.
2. `takeSnapshot(this.gameState)` — **after validation, before any mutation** (per convention), so a single `UNDO_MOVE` restores the just-cleared hand/table.
3. Gather all cards back to the draw pile (hands, non-draw piles, canvas), set them face-down, clear reveal states, and shuffle the draw pile.
4. `broadcastShuffleEvent("draw")`, then `await setTimeout(~650ms)` (the existing animation window).
5. Deal `cardsPerPlayer` to each connected player (round-robin, face-up — mirrors `DEAL_CARDS`).
6. `phase = "playing"`; `broadcastEffect("deal")` (the deal sound, shipped in v1.10).

**Reuse / refactor:** the gather-and-shuffle logic in steps 3 is exactly `RESET_TABLE` lines 553–568 plus the reveal-clear (572–574). Extract it into a private helper (e.g. `gatherAllCardsToDraw()` that returns cards to draw, sets face-down, clears reveals, and shuffles). `RESET_TABLE` calls the helper then clears undo + sets `phase = "setup"`; `DEAL_NEXT_HAND` snapshots first, calls the helper, then broadcasts/deals. The deal loop itself is identical to `DEAL_CARDS` and may be factored similarly, but that is an implementation detail for the plan. `RESET_TABLE`'s observable behavior must not change.

**Why a new action rather than extending `DEAL_CARDS`:** the two differ in their pre-step (gather vs not) and in the max-count constraint; a distinct type keeps each handler's validation and intent clear, and the client already branches on phase.

**Client — `ControlsBar`:**
- **Remember the count.** The cards-per-player input value persists across phases (it is component state and is not reset by dealing). The "Deal next hand" click uses the current input value, which defaults to whatever was last dealt. The input stays editable during play so the count can be adjusted before dealing the next hand.
- **Enable during play.** Remove the blanket `dealDisabled` during `playing`. Instead:
  - `setup` / `lobby`: button label "Deal", dispatches `DEAL_CARDS` (unchanged).
  - `playing`: button label "Deal next hand", dispatches `DEAL_NEXT_HAND` with the same parsed count.
- **Max count.** Compute `maxCards` against the full deck during play (all cards gather to the draw pile first), not the live draw-pile count: in `playing`, `maxCards = floor(totalCardsInGame / connectedPlayers)` where `totalCardsInGame` is the sum of all card counts visible to the client (my hand + opponent hand counts + every pile's cards + canvas cards). In `setup`/`lobby`, keep the current `floor(drawPileCount / connectedPlayers)`.
- **Undo unaffected.** Because `DEAL_NEXT_HAND` snapshots, the existing Undo button (gated on `canUndo`) reverses it like any other move — no special handling.

### Edge cases

- **Misclick safety.** The action clears the current table, but because it is undoable, a single Undo restores the prior hand — this is the explicit reason it snapshots (today's `RESET_TABLE` does not). No confirm dialog (the user chose frictionless).
- **Not enough cards for the count.** Validation in step 1 rejects counts that exceed `floor(deck / players)`; the client's `maxCards` cap on the input prevents this in normal use.
- **Solo / single connected player.** Works: gathers and deals to the one player.

---

## Part B — 999.44: Shuffle motion polish

### Current behavior

When `isShuffling`, `PileZone` renders five absolutely-positioned `bg-secondary` (felt-green) `div`s filling the pile slot, each animating via a single shared `pile-fan-spread` keyframe (550 ms, 30 ms stagger, `--fan-x`/`--fan-r`). The client holds `isShuffling` for ~650 ms (`usePartySocket`).

### New behavior

**Card-back art.** Replace the five green `div`s with the real card-back visual — the same one `CardBack` renders (`CARD_BACK_URL` image, with the existing patterned-gradient fallback when no art is set). So the shuffle shows actual card backs fanning, not green blanks.

**Two-way cut motion (approved via visual prototype).** Five card-back elements, each with its own keyframe, played **once** (`animation-fill-mode: forwards`) within the existing ~650 ms window:

- Cards **1 and 2** lift and arc **right-and-back** (≈ +60 px x, −18 px lift, +14° rotation), then drop their z-index and tuck behind the pile.
- Cards **4 and 5** follow **right behind them** (tight stagger), arcing **left-and-back** (mirror: −60 px, +14° → −14°), rising to front during travel then tucking behind.
- Card **3** settles with a small dip in the middle.
- The stagger is **baked into the keyframe percentages** (peaks ~5% apart), not `animation-delay` — `animation-delay` only offsets the first iteration, and although this animation runs once, baking it in keeps the timing duration-independent and unambiguous.
- Tuck offsets keep cards 4 and 5 from dropping below the pile (they end near the stack, not low).

Reference keyframe timing (from the approved prototype, expressed as % of the animation duration; the one-shot animation ends in the tucked position rather than returning home). The plan will port these into `globals.css` and tune the absolute duration to sit within the ~650 ms window:

```text
card 1 (right): home → peak(+60,−18,+14°) → z-back → tuck(+6,+18)         [earliest]
card 2 (right): home → peak(+60,−18,+14°) → z-back → tuck(+2,+18)         [+ a beat]
card 4 (left):  home → (z-front) → peak(−60,−18,−14°) → z-back → tuck(−4,+8)
card 5 (left):  home → (z-front) → peak(−60,−18,−14°) → z-back → tuck(0,+4)  [latest]
card 3 (mid):   small dip and settle
```

**Scope guard:** this is a visual replacement of the existing shuffle fan only. The shuffle action, the `PILE_SHUFFLED` broadcast, the ~650 ms client window, and the server `DEAL_CARDS` timing are unchanged. Keep the animation within the existing window so no server/client timing changes are needed. Honor `prefers-reduced-motion` (reduce or drop the motion, consistent with the celebration overlay).

---

## Non-Goals

- No confirm dialog for "Deal next hand" (undo is the safety net).
- No change to `RESET_TABLE`'s observable behavior (still non-undoable; the Reset button stays).
- No change to shuffle/deal **timing windows** or the `PILE_SHUFFLED`/`EFFECT` protocol.
- No riffle that literally renders distinct card faces — the backs are identical; the motion implies reordering.
- No new sounds (shuffle/deal sounds already fire on these events).

## Testing

Following project conventions (node-only Vitest; Playwright two-context for multiplayer; review after the phase):

**Unit (Vitest):**
- `DEAL_NEXT_HAND`: gathers all cards to the draw pile, deals N to each connected player, sets `phase = "playing"`, takes exactly one snapshot (so it is undoable), broadcasts `PILE_SHUFFLED("draw")` and `EFFECT("deal")`; rejects out-of-range counts with `ERROR` and no mutation/snapshot.
- The extracted gather helper leaves `RESET_TABLE` behavior unchanged (existing `resetTable` tests stay green; add one asserting the helper returns every card to draw face-down).
- Undo after `DEAL_NEXT_HAND` restores the pre-action hand/table.

**E2E (Playwright):**
- During play, the Deal control is enabled and labeled "Deal next hand"; clicking it clears the table and deals a fresh hand to both players; Undo restores the previous hand.
- Shuffle animation: triggering a shuffle renders card-back elements (assert the card-back `img`/element appears in the pile during `isShuffling`) — animation feel is verified manually.

## Affected files

- `src/shared/types.ts` — add `DEAL_NEXT_HAND { cardsPerPlayer: number }` to `ClientAction`.
- `party/index.ts` — `gatherAllCardsToDraw()` helper; `DEAL_NEXT_HAND` case; `RESET_TABLE` refactored to use the helper (behavior unchanged).
- `src/components/ControlsBar.tsx` — phase-aware Deal button (label + action), enabled during play, full-deck `maxCards` during play.
- `src/components/PileZone.tsx` — render card-back elements (not green divs) during `isShuffling`; assign the per-card two-way-cut animations.
- `src/globals.css` — replace `pile-fan-spread` with the two-way-cut keyframes (`prefers-reduced-motion` aware).
- Tests: `tests/dealNextHand.test.ts` (new); extend `tests/resetTable.test.ts`; `playwright/*` for the deal-next-hand flow.

## Backlog housekeeping

On ship, remove 999.48 and 999.44 from `BACKLOG.md`, record the milestone in `.planning/ROADMAP.md`, and also drop the already-resolved **999.45** (source-map warnings, fixed in #48).
