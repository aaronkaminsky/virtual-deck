# Backlog: Virtual Deck

Unplanned ideas for future work. When you pick one up, run the `brainstorming` skill to shape it into a dated design spec in this directory (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`), then `writing-plans` to produce an implementation plan. Once shipped, record the milestone in [`../../../.planning/ROADMAP.md`](../../../.planning/ROADMAP.md).

The `999.x` IDs are carried over from the previous planning system; they're just stable labels, not a priority order.

| ID | Goal |
|------|------|
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit `onBeforeConnect` rejects connections without the correct password (passed in URL query string) |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message |
| 999.36 | Editable zone names — players can rename spread zones and piles inline |
| 999.47 | Add multiple themes or art sets that can be chosen from the menu |
| 999.48 | Add more customizations in the popup (eg. last move highlighting) |
| 1000 | Consider possible changes to selection behavior. When I select multiple cards and drag them to the canvas, for example, I find my expectation is that those cards are still selected until I select something else or click away.  Instead what currently happens is the selection goes away as soon as the drop occurs.  That might be better, but this item is to consider if changing this would improve the UX. Post-1031 this got more useful: keeping the selection after a group drop would make the Stack button immediately usable — or a group drop could offer stacking directly. Also, we could maintain selection on "un-stack" as well, to support easy fan-out and re-stack of a stack on the canvas |
| 1007 | To plan games like "egyptian war" we should add a way to "slap" the deck, to reward quick reactions, it could have a fun hand animation |
| 1008 | For some games you need to make multiple sets in your hand, like 7-card stud, we could maybe add a spacer feature in the hand to separate multiple card sets while still in your hand |
| 1019 | Attract antic: card thief — critter tip-toes out, steals a mini card off the draw pile, and drags it behind the pile; if startled mid-theft it drops the card, which slides back. New antic on the shipped 1017 framework (choreography + guilty-look art variant) |
| 1020 | Attract antic: tic-tac-toe — critter chalk-draws a tiny grid on the felt, plays both sides against itself (gaze variant alternating), loses, and scribbles it out before leaving |
| 1021 | Attract antic: chip spinner (chips mode only) — anchored to the pot: critter sets a chip spinning like a coin, watches hypnotized; the chip wobble-clatters flat as the critter retreats. Reuses the pot's data-attract-anchor |
| 1022 | Attract antic: magic trick — tiny wand, a mini card levitates, flips, and vanishes in a puff; the critter bows. Startled mid-trick, the puff fires early and the critter flees through it |
| 1023 | Attract antic: a friend appears — a second, differently-colored critter rises from behind another anchored object; the two notice each other, wave, and duck in unison. Needs two synced clip windows + one recolored art file; the strongest shared "did you see that?!" moment |
| 1024 | Attract effect: tumbleweed — no critter: a tiny tumbleweed rolls slowly across the empty canvas and bounces once. The universal dead-room gag; makes the canvas the stage instead of the pile column |
| 1025 | Attract effect: "INSERT PLAYER 2" — arcade homage: after long idle a faint retro-styled blinking text appears in a corner for a few seconds. Nearly free (text-only) but tonally a UI joke rather than a creature bit — decide fit before building |
| 1026 | Attract effect: dozing deck — occasionally skip the critter: the draw pile itself "breathes" (subtle scale pulse) with tiny z's. The table fell asleep. Very subtle, very cheap |
| 1027 | Attract antic: card dominoes — a row of mini white cards sets itself up along the canvas edge and topples in a wave; the critter appears at the end just in time for the last card to fall on it |
| 1028 | Attract effect: lights out / curtain call — the critter tugs a pull-cord and the whole board dims to a soft dark (or a stage curtain lowers over the canvas), maybe with a faint spotlight following the critter as it tiptoes off. Must dim rather than black out, and any input snaps the lights back instantly so it never reads as the app breaking |
| 1029 | Attract antic: critter herding — two or three half-size critters scatter and wander the board; the main critter emerges, exasperated, and chases them back behind the pile one by one — the last little one peeks back out for a beat before getting yanked away. Builds on 1023's multi-clip-window tech |
| 1030 | Flip card in place on canvas — a face-down card on the table can be turned over where it lies (and back), without round-tripping through a pile or hand; canvas-scoped flip action + affordance on the card (from gap review A1) |
| 1032 | Browse pile contents — fan out any pile in an overlay to riffle through it and pull a card from the middle, without dumping it into a spread zone (from gap review A3) |
| 1033 | Deck composition config — host chooses deck setup at table level: two decks (canasta), strip decks (pinochle/euchre 24–48 cards), and jokers; supersedes 1018 (Joker rank + art) (from gap review A4) |
| 1034 | Score pad — shared scoreboard for cumulative points across hands (hearts, gin, rummy); editable by any player like a pad passed around the table (from gap review B1) |
| 1035 | Dealer button & movable tokens — draggable marker(s) on the canvas for dealer/turn/trump tracking; players advance it themselves like a physical button (from gap review B2) |
| 1036 | Mask LAST_MOVE card ids for hand destinations — the LAST_MOVE broadcast includes card ids for all players even when cards move into a private hand (pre-existing leak, noted in the 1031 final review); send cardIds only to the receiving player, empty array to everyone else |
| 1037 | Deterministic-wait sweep for Base UI dialog interactions in Playwright specs — Base UI's FloatingFocusManager attaches interaction wiring one frame after focus commits, silently swallowing early clicks; runtimePiles.spec.ts documents the race and the focus-wait + double-rAF fix; sweep other specs that click into dialogs/popups shortly after open |
| 1038 | Auto-convert a single-card canvas stack to a loose card — BLOCKED ON 1030: loose canvas cards are always face-up (server invariant), so converting would force-reveal a face-down card; revisit only after flip-in-place ships, and even then confirm it is an improvement (a 1-card pile keeps its spot semantics and masking) |
| 1039 | The face up/down control on the tableau should be visible even when no cards are present |
| 1040 | The rick roll should play for longer, so it gets to the lyrics at least |