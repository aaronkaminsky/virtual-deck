# Design: Optional Jokers (Backlog 1039)

**Date:** 2026-08-17
**Backlog item:** 1039 — Add optional Jokers, toggleable from the config panel
**Status:** Approved, ready for implementation planning

## Goal

Let a table play with jokers. A single on/off toggle in the config panel adds two
jokers — one red, one black — to the deck, or removes them.

## Scope

Jokers only. Backlog 1033 (deck composition: double decks, strip decks, per-game
presets) stays in the backlog; this design introduces no generalized composition
config. Jokers get no wild-card semantics — this app enforces no rules, and a
joker is an ordinary card everywhere except its art and its sort position.

## Decisions

| Question | Decision |
|----------|----------|
| Scope relative to 1033 | Standalone jokers toggle; 1033 unaffected |
| Does toggling require a table reset? | Yes — the toggle performs the reset itself |
| How many jokers? | Exactly 2: one red, one black, visually distinct |
| Art source | Extract from the same CC0 jumbo-index set as the existing 52 |
| Sort position | Jokers last in both sort modes, red before black |

## 1. Data model (`src/shared/types.ts`)

Extend the existing unions:

```ts
export type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "joker-red" | "joker-black";
export type Rank = "A" | "2" | ... | "K" | "JOKER";
```

The two joker cards:

| id | suit | rank |
|----|------|------|
| `JOKER-r` | `joker-red` | `JOKER` |
| `JOKER-b` | `joker-black` | `JOKER` |

Add an `isJoker(card: Card): boolean` helper to `src/shared/types.ts` for the
display paths that branch on it.

**Why extend the unions** rather than making `suit` optional or adding a separate
`variant` field: `suit` stays non-optional, so no existing call site breaks, and
the three exhaustive maps — `RANK_MAP` and `SUIT_MAP` (`src/card-art.ts:10,17`)
and `SUIT_SYMBOL` (`src/components/CardFace.tsx:5`) — become compile errors that
force every display path to be handled deliberately.

**Card id.** `Card.id` is documented as `${rank}-${suit[0]}` (`types.ts:10`).
Both jokers would derive to the same id under that rule, so jokers use explicit
ids (`JOKER-r`, `JOKER-b`). Update the comment on that line to record the
exception.

**Known hazard.** `SUIT_ORDER` and `RANK_ORDER` in `HandZone.tsx:22,24` are
arrays, so `indexOf` returns `-1` for a joker — which would silently sort jokers
*first*. Handled explicitly in §5 and pinned by a test.

## 2. Server (`party/index.ts`)

### Deck construction

`buildDeck(includeJokers = false): Card[]` appends the two jokers when the flag
is set. Default stays 52 cards, so every existing caller is unaffected.

### State

`GameState.jokersEnabled: boolean`, default `false`, mirrored into
`ClientGameState` by `viewFor`. Add a migration line to the existing `onStart`
block (`party/index.ts:227-233`) in the same shape as the `tokensEnabled`
migration, so rooms hydrated from older state get `false`.

### `SET_JOKERS_MODE { enabled: boolean }`

New client action. Behavior:

1. Coerce with strict `action.enabled === true` (matches `SET_TOKENS_MODE`,
   `party/index.ts:1329`) — a non-boolean resolves to `false`.
2. **If the resolved value equals the current `jokersEnabled`, no-op.** A
   redundant toggle must not wipe the table.
3. Otherwise, set the flag and reset the table:
   - Extract the current `RESET_TABLE` body into a private `resetTable()`
     (gather all cards → `phase = "setup"` → `undoSnapshots = []` → all tokens to
     tray) and call it from both `RESET_TABLE` and this handler.
   - Then **replace the draw pile contents with `shuffle(buildDeck(enabled))`**
     rather than adding or removing individual joker cards. Rebuilding from
     scratch is immune to stray or duplicated card state and is trivially
     correct.
4. Chips, pot, `chipsInitialized`, and the player list are untouched — consistent
   with `RESET_TABLE`.
5. No `takeSnapshot()`. Mode toggles are not undoable, per the
   `SET_CHIPS_MODE` / `SET_TOKENS_MODE` precedent.

`jokersEnabled` survives `RESET_TABLE`. `RESET_TABLE` itself is otherwise
unchanged: `gatherAllCardsToDraw` already preserves whatever jokers are in play.

## 3. UI (`src/components/ControlsBar.tsx`)

A `Jokers on/off` button in the config popover, placed directly after the Tokens
button (`ControlsBar.tsx:166-175`), using the same `variant="outline"`
`size="sm"` `w-full` styling and `aria-pressed={gameState.jokersEnabled}`.

The click opens an `AlertDialog` confirm before dispatching — *"This returns
every card to the draw pile and clears undo history."* — whenever the reset would
destroy something visible. On a table with nothing to lose it applies straight
through.

"Something to lose" is `tableHasContent(gameState)`, exported from
`ControlsBar.tsx` and unit-tested in `tests/tableHasContent.test.ts`: any card
outside the draw pile (in a hand, on the canvas, in another pile), or any token
placed out of the tray while tokens are shown.

**Revised after use (2026-08-18).** The original design confirmed only when
`gameState.phase === 'playing'`, on the reasoning that `setup` had nothing to
lose. That was wrong twice over. `phase` only becomes `playing` after a *deal*,
so a table where players had dragged cards onto the canvas or into spread zones
was still `setup` — and the toggle wiped that arrangement with no warning. The
first fix confirmed unconditionally, which then nagged on genuinely fresh tables.
Gating on actual table content is what the phase check was standing in for all
along, and it measures the thing directly.

The confirm also removes the need for the muted helper text under the button
(*"Changing this reshuffles and returns all cards."*), which cost real vertical
space in the popover for a warning the dialog now delivers at the moment it
matters.

Note: `src/components/ui/alert-dialog.tsx` exists but is currently unused in app
code, and `RESET_TABLE` has no client UI at all today. This is therefore the
first `AlertDialog` in the app. Backlog 1037 documents a Base UI
`FloatingFocusManager` race where clicks land one frame before interaction wiring
attaches; the e2e test for this dialog must use the focus-wait + double-rAF
pattern from `playwright/jokers.spec.ts`.

## 4. Art

Extract the two jokers from the Saul Spatz jumbo-index **Vertical2** deck — the
same CC0 source the existing 52 PNGs came from — and rasterize them at the same
dimensions to:

- `public/cards/jumbo/redJoker.png`
- `public/cards/jumbo/blackJoker.png`

The archive ships those two as already-distinct red and black faces, so no
recolor is needed. Its PNGs are only 75×113, but its SVGs carry a `viewBox` of
exactly 210×315 — the committed art's dimensions — so the SVGs are the source to
rasterize.

Rather than a special case in `CARD_FACE_URL` (`src/card-art.ts:24`), the joker
file names fall out of the existing `${SUIT_MAP[suit]}${RANK_MAP[rank]}` template
by mapping the joker suits to `redJoker` / `blackJoker` and `RANK_MAP.JOKER` to
the empty string.

## 5. Display touchpoints

- **Sort** (`sortCards`, `src/components/HandZone.tsx:28`): jokers sort **last in
  both modes**, red before black. Implement as an explicit joker check ahead of
  the `SUIT_ORDER` / `RANK_ORDER` `indexOf` comparisons — never let a joker reach
  `indexOf` and return `-1`.
- **`CardFace` fallback path** (`CardFace.tsx:36-58`): `SUIT_SYMBOL` gains `★`
  for both joker suits; `isRed` returns true for `joker-red`.
- **Alt text** (`CardFace.tsx:26`): "Red joker" / "Black joker" instead of
  "JOKER of joker-red".

Unchanged and requiring no work: `viewFor` masking (jokers mask like any other
card), the deal maximum (`maxCards` is derived from actual card counts,
`ControlsBar.tsx:58`), undo, canvas placement, pile moves, and passing.

## 6. Testing

Unit (Vitest):

- `tests/deck.test.ts` — `buildDeck()` returns 52; `buildDeck(true)` returns 54
  with unique ids and the expected joker suits and ranks.
- `tests/jokersMode.test.ts` (new) —
  - enabling: draw pile holds 54, hands and `canvasCards` empty, non-draw piles
    empty, `phase === "setup"`, `undoSnapshots` cleared;
  - disabling: draw pile holds 52 and no joker id appears anywhere in state;
  - toggling to the value already set is a no-op (table untouched);
  - a non-boolean `enabled` resolves to `false`;
  - chips, pot, and players are untouched across a toggle.
- `tests/handSort.test.ts` — jokers sort last in both `bySuit` and `byRank`, red
  before black.
- `tests/card-art.test.ts` — joker face URLs resolve to the two new files.

E2E (Playwright): toggle jokers on from the config panel, confirm the dialog,
deal, and verify the resulting draw-pile count — using the 1037 focus-wait +
double-rAF pattern for the dialog interaction.

## Out of scope

- Multi-deck play, strip decks, and deck presets (backlog 1033).
- Configurable joker count.
- Any wild-card or rule semantics for jokers.
- A general Reset Table button in the UI (still absent; unchanged by this work).
