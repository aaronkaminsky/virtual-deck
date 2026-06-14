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
| 999.50 | Keyboard access to zone controls — when the keyboard cursor is on a zone, secondary keys should activate its buttons (e.g. F to flip top card already works; extend to shuffle pile, cycle sort order, toggle face-up/down on spread cards, select all in zone) without requiring the user to Tab into the DOM buttons |
| 999.51 | Remove the reset button from the controls menu — quick deal/re-deal makes it redundant; also add Cmd+D as a keyboard shortcut to trigger re-deal (deal next hand) without opening the controls panel |
| 999.52 | Bug: selection ring clips in hand and spread zones — the `ring` / `outline` on selected cards is cut off at the container boundary. Root cause: the zone's scroll/overflow container clips children. Fix: add `overflow: visible` (or adjust padding + clip) so the selection ring renders fully on all edges |
| 999.53 | Bug/UX: selection highlight and last-move highlight are too visually similar on the canvas — when a card is moved onto the canvas, both highlights appear simultaneously and look nearly identical, making it hard to read the board state. Fix: differentiate the two visuals (color, opacity, or style) so the current selection and the last-moved destination are clearly distinct |