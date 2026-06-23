# Backlog: Virtual Deck

Unplanned ideas for future work. When you pick one up, run the `brainstorming` skill to shape it into a dated design spec in this directory (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`), then `writing-plans` to produce an implementation plan. Once shipped, record the milestone in [`../../../.planning/ROADMAP.md`](../../../.planning/ROADMAP.md).

The `999.x` IDs are carried over from the previous planning system; they're just stable labels, not a priority order.

| ID | Goal |
|------|------|
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit `onBeforeConnect` rejects connections without the correct password (passed in URL query string) |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features |
| 999.36 | Editable zone names — players can rename spread zones and piles inline |
| 999.47 | Add multiple themes or art sets that can be chosen from the menu |
| 999.48 | Add more customizations in the popup (eg. last move highlighting) |
| 999.49 | On chrome on PC click to drag canvas seems not to be working |
| 1000 | Consider possible changes to selection behavior. When I select multiple cards and drag them to the canvas, for example, I find my expectation is that those cards are still selected until I select something else or click away.  Instead what currently happens is the selection goes away as soon as the drop occurs.  That might be better, but this item is to consider if changing this would improve the UX |
| 1002 | Lobby redesign for the join-by-URL focus — table creators now skip the lobby, so it is only seen by people arriving via a shared `?room=` URL. De-emphasize the table name/code and the copy-link button; prioritize the "Your name" field and the Join control. |
| 1005 | Small inconsistency in the canvas overflow behavior, sometimes when a card is only 'near' the bottom or right side it will trigger the overflow arrow and gradient. |
| 1006 | On an ipad (ipad air) the table on load requires vertical scrolling, even though the canvas has room to be shorter and fill the screen without scrolling. It looks like this happens in safari when the browser tabs appear at the top, when the tabs are not visible the screen height is correct |
| 1007 | To plan games like "egyptian war" we should add a way to "slap" the deck, to reward quick reactions, it could have a fun hand animation |
| 1008 | For some games you need to make multiple sets in your hand, like 7-card stud, we could maybe add a spacer feature in the hand to separate multiple card sets while still in your hand |
| 1012 | Easter egg: `rr` double-tap (same trigger pattern as `gg`) shows a brief floating Rickroll YouTube embed that auto-dismisses after ~10s or on click |
| 1013 | Easter egg: on an explicit shuffle action, occasionally (~1-in-10) play an exaggerated riffle/cut flourish animation instead of the plain shuffle |
| 1014 | Easter egg: Konami code (↑↑↓↓←→←→) deals every player all-jokers or all-aces with a brief "CHEATER DETECTED" banner, then self-reverts |
| 1015 | Easter egg: `99` double-tap triggers a table-flip animation (180° rotate and back) — a visual nod to `gg` upside down |
| 1016 | Easter egg: `bg` double-tap ("bad game") triggers a "poor sport" jeer — cards droop/fall with a boo/hiss sound, the inverse of the `gg` celebration (could reuse `CelebrationOverlay`'s burst mechanics inverted) |
| 1017 | Easter egg: idle "attract mode" — after N minutes of no actions from anyone in the room, a small generic critter sprite emerges from behind a pile and performs one randomly-picked antic (e.g. peek-a-boo, house of cards, parkour run, nap time, juggling, tightrope walk, card surfing, hide and seek, fishing, confused wandering) as a cosmetic overlay only (no real Pile/card state touched), dismissed on any input. Flagged as bigger scope than the other easter eggs — likely needs its own design pass for idle-timer infra and sprite animation. |
