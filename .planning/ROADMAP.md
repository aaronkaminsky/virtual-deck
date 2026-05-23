# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Layout & UX Polish** — Phases 16.1, 17–21 (shipped 2026-05-15) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Table Polish** — Phases 22–25 (shipped 2026-05-18) — [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Board Polish II** — Phases 26–30 (shipped 2026-05-23) — [archive](milestones/v1.5-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–8) — SHIPPED 2026-04-12</summary>

- [x] Phase 1: Server Foundation — PartyKit room, deck state, hand masking, player tokens (completed 2026-04-02)
- [x] Phase 2: Lobby + Room Join — Create/join room, room code sharing, GitHub Pages deploy (completed 2026-04-03)
- [x] Phase 3: Core Board — Board UI, pile zones, private hand, opponent card backs, drag-and-drop (completed 2026-04-04)
- [x] Phase 4: Game Controls — Flip, pass card, deal, shuffle pile, reset table, undo (completed 2026-04-05)
- [x] Phase 5: Resilience + Polish — Reconnect-to-hand, presence dots, connection banner (completed 2026-04-05)
- [x] Phase 6: Functional Tech Debt — Host fallback fix, copy-link in BoardView, remove dead handlers (completed 2026-04-10)
- [x] Phase 7: Nyquist Validation — Full VALIDATION.md compliance for phases 1, 3, 4, 5 (completed 2026-04-10)
- [x] Phase 8: Documentation Housekeeping — SUMMARY/VERIFICATION frontmatter gaps fixed (completed 2026-04-10)

**Bonus (backlog shipped with v1.0):**
- [x] Phase 999.1: Drag to opponent's hand — visual affordance, undo test, e2e verified (completed 2026-04-12)
- [x] Phase 999.2: Pile insert position — Top/Bottom/Random dialog, server insertion (completed 2026-04-12)

See full phase details in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.1 Social Identity + UX Polish (Phases 999.10, 999.11, 9–11) — SHIPPED 2026-04-19</summary>

- [x] Phase 999.10: Drag origin placeholder — dashed outline at card origin slot during drag; pointerWithin collision detection (completed 2026-04-17)
- [x] Phase 999.11: Pile drop dialog UX — Escape/click-outside cancels, Enter confirms Top, Top uses primary button style (completed 2026-04-17)
- [x] Phase 9: Player Identity + Presence — Display names, presence roster, reconnect persistence (completed 2026-04-19)
- [x] Phase 10: Shuffle Before Deal — Auto-shuffle pile before distributing cards; card-fan animation (completed 2026-04-18)
- [x] Phase 11: Empty Pile Drop UX — Skip position dialog when dropping onto an empty pile (completed 2026-04-18)

See full phase details in [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md).

</details>

<details>
<summary>✅ v1.2 Dev Infrastructure & Game Depth (Phases 12–16) — SHIPPED 2026-04-29</summary>

- [x] Phase 12: Test Mock Fix — shared test helpers, viewFor masking tests (completed 2026-04-20)
- [x] Phase 13: Playwright Infrastructure — e2e suite, 2-player fixture, .mcp.json (completed 2026-04-22)
- [x] Phase 14: Gameplay Zone Infrastructure — personal + communal spread zones (completed 2026-04-26)
- [x] Phase 15: Multi-Card Set Play — select 1–5 cards, play as set into zone (completed 2026-04-28)
- [x] Phase 16: Developer README — setup, architecture, tests, deploy docs (completed 2026-04-29)

See full phase details in [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).

</details>

<details>
<summary>✅ v1.3 Layout & UX Polish (Phases 16.1, 17–21) — SHIPPED 2026-05-15</summary>

- [x] Phase 16.1: Fix PartyKit CI Deploy (INSERTED) — Add `partykit deploy` step to GitHub Actions; atomic server+client deploys on push to main (completed 2026-05-03)
- [x] Phase 17: Board Layout Restructure — Five-band vertical layout; communal zone at visual center; dnd-kit ID collision resolved (completed 2026-05-03)
- [x] Phase 18: Controls Collapse — All game controls in a Popover triggered by hamburger icon; board uncluttered by default (completed 2026-05-04)
- [x] Phase 19: Responsive Layout — Board usable at 375px phone-width with no horizontal scroll; 10-wave gap closure (completed 2026-05-09)
- [x] Phase 20: Spread Zone Multi-Select — Click-to-select with same ring/lift UX as hand; drag selected set to any zone (completed 2026-05-11)
- [x] Phase 21: Spread Zone Reorder Verification — Group reorder + selection preservation + SortableSentinel drop-to-end; undo verified (completed 2026-05-14)

See full phase details in [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md).

</details>

<details>
<summary>✅ v1.4 Table Polish (Phases 22–25) — SHIPPED 2026-05-18</summary>

- [x] Phase 22: Hand Reveal — Players can toggle their hand face-up/down in real time; server persists reveal state per player (completed 2026-05-16)
- [x] Phase 23: Hand Sort + Select All — Players can cycle sort modes on their hand; players can select all cards in any pile or spread zone and drag them as a group (completed 2026-05-17)
- [x] Phase 24: Play Area Grid — Communal spread zone displays as a 2-row fixed grid with column snapping and per-cell stacking (completed 2026-05-17)
- [x] Phase 25: Layout & Visual Polish — Empty zones are clean and compact; pile controls move to top; personal spread zones collapse when empty (completed 2026-05-18)

See full phase details in [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md).

</details>

<details>
<summary>✅ v1.5 Board Polish II (Phases 26–30) — SHIPPED 2026-05-23</summary>

- [x] Phase 26: Zero-Risk Visual Polish — Remove labels, suppress controls, fix badge and pile spacing (POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07) (completed 2026-05-20)
- [x] Phase 27: Drop Target + Empty Spread Behavior — Hover-only opponent hand outline; empty spread faint strip with deferred controls (CTRL-06, LAYOUT-06) (completed 2026-05-20)
- [x] Phase 28: Bug Fixes — Fix select all regression and grid mobile column count (BUG-01, BUG-02) (completed 2026-05-21)
- [x] Phase 29: Sort Verification — Define "original order" semantics; verify behavior after drag-reorder + sort cycle (SORT-02) (completed 2026-05-21)
- [x] Phase 30: Layout Restructure — Dock Spread Zones — Opponent spreads below their hands in board area; personal spread flush above hand; full e2e drag coverage (LAYOUT-05) (completed 2026-05-21)

See full phase details in [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md).

</details>

## Backlog

Promote items with `/gsd-review-backlog` when ready to plan.

| Phase | Goal | Plans |
|-------|------|-------|
| 999.14 | Custom card art — new artwork for card fronts and backs | TBD |
| 999.17 | Chips — poker/betting chip support | TBD |
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit onBeforeConnect rejects connections without the correct password (passed in URL query string) | TBD |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message | TBD |
| 999.23 | Sound effects — shuffle, deal, card drop/play sounds; icon toggle to mute; group near art/customization features (see 999.14) | TBD |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features | TBD |
| 999.36 | Editable zone names — players can rename spread zones and piles inline | TBD |
| 999.37 | Free canvas play area — communal spread zone supports arbitrary card positioning (x, y) with free overlap and drag-to-any-point; deferred from v1.4 GRID work | TBD |
| 999.38 | Highlight last move — subtle visual indicator on cards/zones that were just moved; fades after a few seconds so players who blink don't miss the action | TBD |
| 999.52 | Mobile play area not horizontally scrollable — at 375px the communal grid zone overflows the viewport without a scroll mechanism; board content is clipped | TBD |
| 999.53 | Mobile layout: play area overlaps spread zone vertically at narrow viewports; needs a layout strategy for small screens — options include capping the grid at 4×2 cells, shrinking card dimensions to fit, or collapsing zones into a stacked/tabbed layout | TBD |
