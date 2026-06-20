# Backlog: Virtual Deck

Unplanned ideas for future work. When you pick one up, run the `brainstorming` skill to shape it into a dated design spec in this directory (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`), then `writing-plans` to produce an implementation plan. Once shipped, record the milestone in [`../../../.planning/ROADMAP.md`](../../../.planning/ROADMAP.md).

The `999.x` IDs are carried over from the previous planning system; they're just stable labels, not a priority order.

| ID | Goal |
|------|------|
| 999.17 | Chips — poker/betting chip support |
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit `onBeforeConnect` rejects connections without the correct password (passed in URL query string) |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features |
| 999.36 | Editable zone names — players can rename spread zones and piles inline |
| 999.47 | Add multiple themes or art sets that can be chosen from the menu |
| 999.48 | Add more customizations in the popup (eg. last move highlighting) |
| 999.49 | On chrome on PC click to drag canvas seems not to be working |
| 1000 | Consider possible changes to selection behavior. When I select multiple cards and drag them to the canvas, for example, I find my expectation is that those cards are still selected until I select something else or click away.  Instead what currently happens is the selection goes away as soon as the drop occurs.  That might be better, but this item is to consider if changing this would improve the UX |
| 1002 | Lobby redesign for the join-by-URL focus — table creators now skip the lobby, so it is only seen by people arriving via a shared `?room=` URL. De-emphasize the table name/code and the copy-link button; prioritize the "Your name" field and the Join control. |
