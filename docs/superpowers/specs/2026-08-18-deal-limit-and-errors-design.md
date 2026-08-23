# Design: Deal Limit, Visible Errors, and the Adaptive Fan

**Date:** 2026-08-18
**Backlog items:** 1041 (deal silently capped at 13), 1042 (server errors invisible on the board)
**Status:** Approved, ready for implementation planning

## Goal

Let a player be dealt as many cards as the deck actually holds, make the hand
readable when it is that large, and stop the server's rejections from vanishing
silently.

## Origin

Dealing 20 cards from a 54-card joker deck appeared to do nothing; 13 worked.
Three layers had to line up for that to be silent:

1. The server rejects `cardsPerPlayer > 13` — an arbitrary cap that assumes a
   52-card deck split four ways.
2. The client's `maxCards` derives from draw-pile size ÷ connected players, so
   the input accepted 20 and dispatched it.
3. The resulting `ERROR` event rendered nowhere, because `App.tsx` passes `error`
   only to `LobbyPanel`, the pre-join screen.

Fixing (1) and (3) is this design. (2) needs no change — the client was right.

## Decisions

| Question | Decision |
|----------|----------|
| What limits a deal? | Cards actually available, already enforced below the cap |
| Large-hand layout | Adaptive fan: overlap tightens to fit, floor at a legible sliver |
| Fan scope | Own hand and opponent hands; `SpreadZone` deferred |
| Error surface | Full-width banner at the top of `BoardView`, like `ConnectionBanner` |

## 1. Lift the deal cap (`party/index.ts`)

Delete the `action.cardsPerPlayer > 13` clause from both `DEAL_CARDS` (~line 624)
and `DEAL_NEXT_HAND` (~line 673). Keep `Number.isInteger` and `>= 1`, and keep
the `INVALID_CARDS_PER_PLAYER` error for those cases — with its message updated,
since it currently says "between 1 and 13".

Nothing replaces the cap. The correct limit is already enforced immediately
below it:

- `DEAL_CARDS` rejects with `INSUFFICIENT_CARDS` when
  `cardsPerPlayer * connectedPlayers > drawPile.cards.length`.
- `DEAL_NEXT_HAND` does the same against the total cards in play (hands + piles +
  canvas), which it gathers before dealing.

That is "the number of cards in the deck" expressed as a live quantity, so it
stays correct when jokers change the deck size — which a hardcoded number never
would.

**`maxCards` is already correct.** `ControlsBar.tsx` computes
`floor(drawPileCount / connectedPlayerCount)` in setup and
`floor(totalCardsInGame / connectedPlayerCount)` in play. Once the server cap is
gone, client and server agree on the limit.

**But `handleDeal` must stop swallowing over-max counts.** It currently returns
early on `parsed > maxCards`, doing nothing and saying nothing — the same silent
failure this work exists to remove, just moved one layer out. Drop that clause
and let the request go to the server, which answers with `INSUFFICIENT_CARDS`
and now renders it (§3). The local guards on `NaN` and `< 1` stay, since those
are malformed input rather than a refused request, and `max={maxCards}` stays on
the input as a hint.

This also makes the banner reachable from the UI at all: with the clamp in
place, every server deal error is unreachable by construction and therefore
untestable end-to-end.

## 2. The adaptive fan

### The helper

One pure function, exported and unit-tested:

```ts
fanAdvance(opts: {
  containerWidth: number;
  cardWidth: number;
  count: number;
  comfortableAdvance: number;
  minAdvance: number;
}): number
```

*Advance* is the distance between successive card left edges — the visible
sliver of each covered card. The rendered value is the overlap,
`cardWidth - advance`, applied as an inline `marginLeft` on every card after the
first, replacing today's `-ml-3 sm:-ml-5` classes.

Rule:

- `count <= 1` → `comfortableAdvance` (nothing to overlap).
- otherwise → `clamp((containerWidth - cardWidth) / (count - 1), minAdvance, comfortableAdvance)`.

Small hands therefore keep exactly today's spacing; the fan only tightens once a
hand would otherwise overflow, and never past the floor.

### Constants

Chosen to preserve current appearance at small counts:

| Context | `cardWidth` | `comfortableAdvance` | `minAdvance` |
|---------|-------------|----------------------|--------------|
| Own hand, desktop (`sm`+) | 60 | 40 (= 60 − `ml-5`) | 16 |
| Own hand, mobile | 40 | 28 (= 40 − `ml-3`) | 12 |
| Opponent hand (all sizes) | 40 | 28 (= 40 − `ml-3`) | 12 |

At a 1280px viewport a 54-card hand lands at roughly 21px advance — above the
floor, so the whole hand is visible without scrolling. On a 390px phone it clamps
at 12px and the row scrolls, which is the existing behavior and is accepted
rather than solved.

`minAdvance` of 16px is a judgment call about what stays legible with this deck's
corner index. It is a single constant; if 54 cards read badly, change it.

### Measuring

Width comes from a `ResizeObserver` on the row, following the existing pattern at
`CanvasZone.tsx:165-175`.

Available width is the row's `clientWidth` minus two things:

- its horizontal padding (`px-4`, so 32px total), and
- **56px reserved for `SortableSentinel`** — the invisible `flex: 1`,
  `minWidth: 56px` droppable at the end of the list. It is what makes drop-to-end
  reachable (a project convention, listed in CLAUDE.md). Letting cards consume its
  space would silently break dropping at the end of a full hand.

Card count does not change during a drag, so the computed advance is stable while
dragging — this introduces no dnd-kit rect churn.

## 3. Surface server errors (`1042`)

### The repeat problem

`usePartySocket` does `setError(event.message)`. Sending the same message twice
in a row does not change state, so nothing re-renders and the second error is
invisible. `error` therefore becomes `{ message: string; nonce: number } | null`,
with the nonce incrementing on every `ERROR` event.

### The banner

A new `ErrorBanner` component mirrors `ConnectionBanner`: a full-width strip at
the top of `BoardView`, rendered next to it, auto-dismissing after exactly
6000ms and dismissible by click. It is keyed on the nonce so a repeated message
re-shows.

Styling parallels `ConnectionBanner`'s amber with red:
`w-full bg-red-900/80 text-red-200 text-center py-2 text-sm font-medium`.

`App.tsx` passes `error?.message ?? null` to `LobbyPanel` (behavior unchanged
there) and the whole object to `BoardView`.

The banner shows the server's message verbatim. There is no per-code copy
mapping — the server already writes human-readable messages, and a mapping would
be a second place to keep them correct.

## 4. Testing

Unit (Vitest):

- `fanAdvance` — a single card; a count small enough to keep the comfortable
  advance; a count that needs tightening; a count that hits the floor; and
  degenerate inputs (zero and negative container widths) returning the floor
  rather than a negative or `NaN` advance.
- `tests/dealCards.test.ts` — currently has no coverage of the cap in either
  direction. Add: 20 per player succeeds when the draw pile allows it; 54 to a
  single player succeeds from a joker deck; over-availability still fails with
  `INSUFFICIENT_CARDS`; and 0, negative, and non-integer counts still fail with
  `INVALID_CARDS_PER_PLAYER`. Mirror the availability cases for `DEAL_NEXT_HAND`.

E2E (Playwright):

- Deal 20 per player in a two-player room — above the old cap of 13, so this
  test fails against today's server.
- In a solo room, deal 40 and assert the hand row's `scrollWidth` fits its
  `clientWidth`. 40 cards cannot fit at the comfortable advance, so this passes
  only if the fan actually tightened rather than scrolled.
- In a two-player room, deal 27 (over the 52-card supply) and assert the banner
  appears carrying the server's `INSUFFICIENT_CARDS` message.

Note that the second and third cases need a solo room and an over-supply
request; both are unreachable through the UI until `handleDeal` stops clamping
(§1).

## Out of scope

- `SpreadZone` fanning. It shares the same hardcoded overlap, but it is a drop
  target inside a resizable region, and this project has a documented history of
  stale droppable-rect drift when such layouts change. It gets its own backlog
  item.
- Toast stacking, error queueing, and per-error-code copy.
- Mobile fitting a 54-card hand without scrolling.
