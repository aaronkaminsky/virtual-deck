# Poker Chips — Design (Phase 999.17)

**Status:** Approved (brainstorming)
**Date:** 2026-06-21
**Branch:** `feat/poker-chips`

## Problem

Players using Virtual Deck for poker-style games have no way to track bets or a
pot — chip totals are tracked off-app (mentally, or on paper) even though the
table is otherwise fully digital. The goal: optional chip support, default off,
that lets each player track an in-hand stack, a visible amount bet in front of
them, and a shared pot, with simple controls to move chips between them. No
poker rule enforcement (turn order, calling, side pots) — consistent with the
app's free-form, no-rule-enforcement philosophy.

## Core decision

**Three chip locations: hand, spread (front-of-player bet), and pot.** This
mirrors a physical table: chips sit in your stack, you push some forward when
you bet (visible to everyone, not yet "in" the pot), and a separate action
sweeps your bet into the shared pot. One generic `TRANSFER_CHIPS` action moves
chips between any two of the three locations, rather than a bespoke action per
direction.

Chips are a plain number per location — **not** tracked as real denominations.
A "stacked chip" visual uses cosmetic color/height tiers based on amount
thresholds; there is no `{5: 2, 25: 1}`-style denomination breakdown. This
keeps the data model trivial and avoids chip-math the app doesn't need.

## Data model

```ts
// src/shared/types.ts

interface Player {
  ...
  chipsInHand: number;     // 0 when chipsEnabled is false / before first enable
  chipsInSpread: number;   // chips bet, sitting in front of this player
}

interface GameState {
  ...
  chipsEnabled: boolean;   // default false; room-wide, no host gating
  startingChips: number;   // default 1000; configurable via menu
  pot: number;             // shared, default 0
}
```

No new `Pile`/region type. Per the existing "type extension over parallel
collections" convention, chips are scalar fields on `Player` and `GameState`.
`ClientGameState` exposes all of these unmasked — chip counts are public table
state, not secret like hand cards.

## Actions

One generic action, sent for every chip movement:

```ts
{
  type: 'TRANSFER_CHIPS';
  from: 'hand' | 'spread' | 'pot';
  to: 'hand' | 'spread' | 'pot';
  playerId: string;   // whose hand/spread is the non-pot endpoint
  amount: number;     // > 0
}
```

Server handler (`party/index.ts`, alongside the existing action switch):

1. Reject if `chipsEnabled` is false, `from === to`, or `amount <= 0`.
2. Authorization: if `from` or `to` is `'hand'` or `'spread'`, the sender's
   token must match `playerId` — a player can only move their own chips.
   `pot` has no owner; any player may act on it.
3. Validate the source location has `>= amount` available. If not, reject
   (no negative balances).
4. `takeSnapshot()` (no `skipSnapshot` — chip transfers are undoable, same as
   `MOVE_CARD`, interleaved chronologically with card moves in the shared undo
   stack).
5. Mutate the two locations, broadcast `STATE_UPDATE` as usual.

`SET_CHIPS_MODE` action: `{ enabled: boolean; startingChips: number }`.
Dispatched from the hamburger menu. On enabling chips mode for the first time
(`chipsEnabled` false → true with no prior chip state), every player's
`chipsInHand` is set to `startingChips`, `chipsInSpread` and `pot` to `0`.
Toggling off and back on **does not reset** — off is purely a display switch;
re-enabling resumes whatever amounts were already in play. A late-joining
player while `chipsEnabled` is true gets `startingChips` for their
`chipsInHand`, `0` for `chipsInSpread`.

## UI

- **Hamburger menu** (`ControlsBar.tsx`): "Poker Chips" toggle + a "Starting
  amount" number input (default 1000). Room-wide, any player can flip it —
  consistent with the absence of a host role elsewhere in the app.
- **Pot** (rail, `BoardView.tsx`, alongside the draw/discard piles): stacked
  chip graphic + numeric total. Primary quick action: **"Take all"** — moves
  the full pot to the clicking player's own `chipsInHand`. Secondary: a
  free-text amount input with explicit "to hand" / "to my bet" buttons for
  partial takes.
- **Per-player spread zone** (existing `region: 'spread'` zone): stacked chip
  graphic + `chipsInSpread` total. Primary quick action (owner only):
  **"Move to pot"** — transfers the full amount to the pot. Secondary: amount
  input with "to pot" / "to hand" buttons. Opponents see the display only, no
  controls — consistent with how opponent areas already work.
- **Hand area** (`HandZone.tsx` own hand, `OpponentHand.tsx` opponents):
  stacked chip graphic + `chipsInHand` total. Primary quick action (owner
  only): **"Bet {amount}"**, pre-filled with the last amount that player
  entered (client-side only, not synced — seeded to a default of 10 the first
  time) — transfers that amount from hand to spread. Secondary: amount input
  with "to bet" / "to pot" buttons. Opponents see the display only.
- All chip UI (menu controls aside) is hidden entirely when `chipsEnabled` is
  false.

### Stacked chip graphic

Built with CSS/SVG — no image assets. A small column of overlapping circular
"coin" shapes; color/height tier picked from the amount (e.g. a handful of
thresholds like under 100 / 100–499 / 500+, mapped to a couple of distinct
chip colors and a stack height that grows with magnitude, capped at a fixed
max visual height). Purely cosmetic — never read back into game logic.

## Out of scope (YAGNI)

- Real chip denominations / breaking a bet into specific chip counts.
- Turn order, call/raise/fold, or any actual poker rule enforcement.
- Side pots or multi-pot tracking — one shared `pot` per room.
- Host-only gating of the chips toggle (no host role exists in this app).
- Image-asset chip art.

## Testing

**Vitest (unit):**

- `TRANSFER_CHIPS` handler: valid hand→spread, spread→pot, pot→hand transfers
  mutate the right fields; insufficient-funds source is rejected; `from === to`
  rejected; non-owner attempting to move another player's hand/spread chips is
  rejected; pot has no ownership check.
- `SET_CHIPS_MODE`: first enable sets `startingChips` for all players and
  zeroes spread/pot; re-enabling after a prior disable does not reset existing
  amounts; late joiner while enabled gets `startingChips`.
- Undo: a `TRANSFER_CHIPS` snapshot reverses correctly and interleaves with a
  `MOVE_CARD` snapshot in the same stack.

**Playwright (e2e):**

- Enable chips mode from the menu, confirm each hand shows the starting
  amount and the pot reads 0.
- Bet quick action moves chips from hand to spread for the acting player only.
- "Move to pot" / "Take all" quick actions round-trip an amount through the
  pot and verify the other player's hand is unaffected.
- Two `BrowserContext`s: confirm a player cannot move another player's hand or
  spread chips (control isn't rendered / action is rejected if attempted via
  direct message).
