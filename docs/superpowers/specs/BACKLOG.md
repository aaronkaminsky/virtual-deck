# Backlog: Virtual Deck

Unplanned ideas for future work. When you pick one up, run the `brainstorming` skill to shape it into a dated design spec in this directory (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`), then `writing-plans` to produce an implementation plan. Once shipped, record the milestone in [`../../../.planning/ROADMAP.md`](../../../.planning/ROADMAP.md).

The `999.x` IDs are carried over from the previous planning system; they're just stable labels, not a priority order.

| ID | Goal |
|------|------|
| 999.14 | Custom card art — new artwork for card fronts and backs |
| 999.17 | Chips — poker/betting chip support |
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit `onBeforeConnect` rejects connections without the correct password (passed in URL query string) |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message |
| 999.23 | Sound effects — shuffle, deal, card drop/play sounds; icon toggle to mute; group near art/customization features (see 999.14) |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features |
| 999.36 | Editable zone names — players can rename spread zones and piles inline |
| 999.38 | Highlight last move — subtle visual indicator on cards/zones that were just moved; fades after a few seconds so players who blink don't miss the action |
| 999.39 | When dragging a set from a spread pile to the canvas, the drop should maintain the spread |
| 999.40 | Multiple selection from canvas should drop on the pile all at once |
| 999.41 | Need to add button to select all canvas, or to discard all from canvas |
| 999.42 | Possible bug, iPad with Safari the screen is too tall, requires scrolling |
| 999.43 | Add some kind of firework animation or sound (win button) |
| 999.44 | The shuffle animation could be a bit better, maybe use the background picture instead of the green? |
| 999.45 | 
    Source map error: No sources are declared in this source map.
    Resource URL: http://localhost:5173/virtual-deck/%3Canonymous%20code%3E
    Source Map URL: installHook.js.map
    Source map error: No sources are declared in this source map.
    Resource URL: http://localhost:5173/virtual-deck/%3Canonymous%20code%3E
    Source Map URL: react_devtools_backend_compact.js.map |
