# Physical Deck Gap Review (999.27)

## Method

This review asks: what does a real card table offer that Virtual Deck doesn't yet? Scope covers three areas — **card manipulation** (physical deck actions), **table accessories** (non-card equipment), and **game-flow conveniences** (things a table makes easy or software could improve on). Social/tactile presence (gestures, gaze, showing a card to one player) was deliberately excluded from scope.

Approach: first-principles enumeration of physical-table affordances per area, mapped against the current codebase, then validated by walking through five games chosen to stress different mechanics — Texas hold'em (betting flow), gin rummy (draw/discard discipline), hearts (trick-taking and passing), war (speed and face-down battles), and blackjack (dealer role). Every gap gets a verdict: **build** (becomes a backlog row), **maybe-later** (recorded here, not queued), or **skip** (with reasoning). Gaps already covered by existing backlog items are marked **already captured**.

## Current capability inventory

Grounded in `src/shared/types.ts`, `party/index.ts`, and the shipped roadmap (v1.0–v1.25):

- **Cards & deck**: exactly one standard 52-card deck (`Rank` has no Joker; no deck-count config). Card art is a code-level asset set.
- **Zones**: fixed piles (draw, discard), per-player spread zones (tableau), per-player private hands, and a free canvas with x/y/z placement. Piles cannot be created or removed at runtime. Canvas cards are loose (z-ordered) — they overlap visually but never form a pile object.
- **Card actions**: move card (with top/bottom/random pile insert), play multi-card set, move all pile cards, reorder hand/spread, flip card *in a pile*, set pile/spread face-up/down, pass card directly to a player, place/group-place on canvas.
- **Pile access**: only the top card of a stacked pile is visible/draggable; spread zones expose all their cards.
- **Deck operations**: crypto-random shuffle (with animation), deal N cards per player to all hands, deal-next-hand (collect and redeal).
- **Privacy**: server-side `viewFor` masking — opponents see hand counts (or full cards when a hand is revealed). Flipping a card reveals it to everyone; there is no private peek. Canvas cards are unmasked.
- **Chips**: optional chips mode — per-player hand/spread counts, shared pot, transfers. Chips are a single undifferentiated count (no denominations).
- **Meta**: undo stack, reset table, hand reveal toggle, hand sort, last-move highlight, keyboard command layer, sound effects, celebrations/easter eggs, idle attract mode.
- **Persistence & capacity**: room state persists in Durable Object storage across hibernation; players rejoin via URL + localStorage token. Hard cap of 4 players per room; no spectator role.

## Gap taxonomy

### A. Card manipulation

| # | Physical affordance | Virtual Deck today |
|---|--------------------|--------------------|
| A1 | Turn a card over in place on the table | `FLIP_CARD` is pile-scoped; a card on the canvas cannot be flipped where it lies — it must round-trip through a pile or hand |
| A2 | Make a neat stack anywhere (trick piles, side stacks, split decks) | Piles are fixed at creation; canvas cards overlap but stay loose — no shuffle/face/insert semantics, and picking up "the stack" means multi-selecting loose cards |
| A3 | Pick up a pile and fan through it; take a card from the middle | Only the top card of a pile is reachable; workaround is dumping the whole pile into a spread zone and back |
| A4 | Play with two decks, a strip deck, or jokers (canasta, pinochle, euchre) | Exactly one 52-card deck, hardcoded |
| A5 | Privately peek at a face-down card (dealer's hole card, stud down-cards on the table) | Flipping reveals to everyone; no private peek |
| A6 | Deal in patterns: face-up up-cards, a flop to the table, to a subset of players | Deal is all-players, equal count, into hands only; everything else is manual drags |
| A7 | Rotate/orient a card (mark trump, point at the trick winner) | Canvas cards are always upright; no rotation state |
| A8 | Cut the deck before dealing | No cut action; shuffle is crypto-random so the anti-cheat purpose is moot |
| A9 | Simultaneous reveal — "1-2-3 flip!" (war battles, showdowns) | Players flip individually whenever they like |
| A10 | Slap the pile (Egyptian war, snap) | No slap — **already captured** as backlog 1007 |
| A11 | Separate melds/sets inside a held hand | No spacers — **already captured** as backlog 1008 |
| A12 | Take the whole discard pile (canasta, rummy variants) | Covered: `MOVE_ALL_PILE_CARDS` and select-all + drag |

### B. Table accessories

| # | Physical affordance | Virtual Deck today |
|---|--------------------|--------------------|
| B1 | Pen and paper for cumulative scores across hands | Nothing; chips are a poor proxy (they conflate money with points and require chips mode) |
| B2 | Dealer button / markers / tokens you can slide around | Nothing; players track dealer and turn order in their heads |
| B3 | Dice alongside cards | None |
| B4 | Egg timer / turn clock for speed games | None |
| B5 | Chip denominations (colors/values) | Chips are one undifferentiated count |
| B6 | Card racks / holders | Purpose (organizing a hand) already served by hand sort + planned spacers (1008) |
| B7 | Cut card | No digital purpose (see A8) |

### C. Game-flow conveniences

| # | Physical affordance | Virtual Deck today |
|---|--------------------|--------------------|
| C1 | The table stays as you left it; resume tomorrow | Covered: room state persists in storage; players rejoin via URL + token |
| C2 | Anyone can stand behind the table and watch | Hard cap of 4 players; a would-be spectator is rejected |
| C3 | Misdeal recovery — collect and redeal | Covered: undo, deal-next-hand, reset table |
| C4 | Rotating dealer each hand | Nothing tracks it; falls out of B2 (a dealer button players move themselves, like a real table) |
| C5 | Agreeing on house rules at the table | Happens out of band (voice/chat); a shared note field would duplicate that channel |

## Game walkthroughs

**Texas hold'em.** Chips mode, pot, and hand privacy carry the core loop well. Friction: no dealer button, so blinds and deal order live in players' heads (B2); dealing the flop is four manual drags — burn face-down to discard, three cards one at a time to the canvas (A6). Burn cards themselves work fine via drag-to-discard with insert position. Showdown via hand-reveal toggle works. Chip denominations (B5) never actually hurt — a single count is enough to bet with.

**Gin rummy.** The draw/discard loop is smooth, and "only the top discard is visible" happens to match the rules. Melding within the hand wants spacers (A11, already captured as 1008). Knocking has no gesture, but announcing it out loud (voice channel) is how real tables do it anyway. The real gap is scoring: gin is a race to 100 across many hands, and there is nowhere to write scores down (B1).

**Hearts.** Passing three cards works (multi-select set → opponent hand). Playing to the trick works (four cards to canvas center). Collecting a won trick exposes A2: at a real table you sweep the trick into a face-down pile in front of you; here the winner multi-selects four loose canvas cards and drops them in a corner, where they stay loose and eventually clutter — there is no way to consolidate them into a stack. Cumulative scoring across hands again wants B1.

**War.** Splitting the deck into two 26-card stacks exposes A2 again — hands work as a substitute, but a real war deck sits face-down on the table in front of you. The simultaneous "1-2-3 flip" (A9) can't be enforced, though in practice players just flip in rhythm. Slap for the speed variant is already captured (1007, A10).

**Blackjack.** The most deal-heavy friction of the five: every round the dealer deals two cards to each player with specific face-up/face-down patterns, all as manual drags (A6). The dealer's hole-card peek for blackjack is impossible without revealing to the table (A5). Splits and doubling work fine as manual card moves plus chip transfers.

## Verdict table

| Gap | Verdict | Reasoning |
|-----|---------|-----------|
| A1 flip in place on canvas | **build** | Basic physical affordance; every walkthrough that used the canvas wanted it; cheap (canvas-scoped flip action + UI affordance) |
| A2 runtime piles / stack canvas cards | **build** | Surfaced in three of five walkthroughs (hearts tricks, war decks, side stacks); highest-leverage manipulation gap |
| A3 browse pile contents | **build** | "Riffle through the pile" is a core physical affordance; workaround is destructive and clumsy |
| A4 deck composition (multiple/strip decks) | **build** | Whole game families (canasta, pinochle, euchre) are unplayable today; natural umbrella for 1018 (jokers) |
| A5 private peek | maybe-later | Real but narrow (blackjack dealer, stud); revisit if dealer-style games become a focus |
| A6 deal patterns (face-up, to table, subset) | maybe-later | Pure convenience — manual drags always work; revisit after A2 since "deal to a pile" wants runtime piles |
| A7 rotate cards | maybe-later | Rarely matters for 52-card games; mostly a TCG affordance |
| A8 cut the deck | skip | Crypto shuffle removes the trust problem; pure ritual with no gameplay effect |
| A9 simultaneous reveal | skip | Social coordination ("1-2-3") solves it at zero cost; enforcement adds UI for marginal value |
| A10 slap | already captured | Backlog 1007 |
| A11 hand spacers | already captured | Backlog 1008 |
| A12 take whole discard | covered | `MOVE_ALL_PILE_CARDS` + select-all |
| B1 score pad | **build** | The single most common accessory; needed by three of five walkthrough games; chips are the wrong tool for points |
| B2 dealer button / movable tokens | **build** | Cheap (a draggable token on the canvas), solves C4 the same way a real table does, helps every rotating-deal game |
| B3 dice | maybe-later | Off the core 52-card path; cheap to add later if a game demands it |
| B4 timer | maybe-later | Niche (speed games); no walkthrough needed it |
| B5 chip denominations | skip | A single count already supports betting; denominations add exchange friction that physical tables tolerate, not enjoy |
| B6 card racks | skip | Digital purpose already served by sort + 1008 |
| B7 cut card | skip | See A8 |
| C1 persistence | covered | Durable Object storage + rejoin token |
| C2 spectators | maybe-later | Real gap vs. a physical table, but off the 2–4 player core; interacts with hand privacy and the player cap |
| C3 misdeal recovery | covered | Undo / deal-next-hand / reset |
| C4 dealer rotation | covered by B2 | A movable button players advance themselves matches the physical ritual |
| C5 house rules note | skip | Out-of-band voice/chat is the real channel, same as a physical table |

## Recommended backlog additions

Six build-verdict gaps, as ready-to-paste `BACKLOG.md` rows (IDs continue from 1029):

| ID | Goal |
|------|------|
| 1030 | Flip card in place on canvas — a face-down card on the table can be turned over where it lies (and back), without round-tripping through a pile or hand; canvas-scoped flip action + affordance on the card |
| 1031 | Runtime piles — stack loose canvas cards into a real pile (with face/shuffle/insert semantics) and break a pile back into loose cards; covers trick piles, split decks, and side stacks that today stay as clutter |
| 1032 | Browse pile contents — fan out any pile in an overlay to riffle through it and pull a card from the middle, without dumping it into a spread zone |
| 1033 | Deck composition config — host chooses deck setup at table level: two decks (canasta), strip decks (pinochle/euchre 24–48 cards), and jokers; umbrella for/supersedes 1018 (Joker rank + art) |
| 1034 | Score pad — shared scoreboard for cumulative points across hands (hearts, gin, rummy); editable by any player like a pad passed around the table |
| 1035 | Dealer button & movable tokens — draggable marker(s) on the canvas for dealer/turn/trump tracking; players advance it themselves like a physical button |
