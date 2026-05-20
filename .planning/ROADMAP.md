# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Layout & UX Polish** — Phases 16.1, 17–21 (shipped 2026-05-15) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Table Polish** — Phases 22–25 (shipped 2026-05-18) — [archive](milestones/v1.4-ROADMAP.md)
- **v1.5 Board Polish II** — Phases 26–30 (in progress)

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

### v1.5 Board Polish II (In Progress)

**Milestone Goal:** Eliminate remaining layout awkwardness and interaction bugs — tighter visual hierarchy, correct empty states, and cleaner controls throughout.

- [x] **Phase 26: Zero-Risk Visual Polish** — Remove labels, suppress controls, fix badge and pile spacing (POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07) (completed 2026-05-20)
- [ ] **Phase 27: Drop Target + Empty Spread Behavior** — Hover-only opponent hand outline; empty spread faint strip with deferred controls (CTRL-06, LAYOUT-06)
- [ ] **Phase 28: Bug Fixes** — Fix select all regression and grid mobile column count (BUG-01, BUG-02)
- [ ] **Phase 29: Sort Verification** — Define "original order" semantics; verify behavior after drag-reorder + sort cycle (SORT-02)
- [ ] **Phase 30: Layout Restructure — Dock Spread Zones** — Opponent spreads below their hands in board area; personal spread flush above hand; full e2e drag coverage (LAYOUT-05)

## Phase Details

### Phase 26: Zero-Risk Visual Polish
**Goal**: Visual noise is eliminated and controls are correctly scoped with no behavior changes
**Depends on**: Phase 25
**Requirements**: POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07
**Success Criteria** (what must be TRUE):
  1. Pile count badge does not appear when a pile is empty; badge is visible only when count is 1 or more
  2. The pile controls row sits visually flush against the pile card below it with no gap
  3. Opponent spread zones display no face-toggle button
  4. The communal grid zone's face-toggle button is positioned beside the zone label, not inside the card grid
  5. Spread zones display no name label — the adjacent hand header identifies the zone
**Plans**: 2 plans
**Plan list**:
- [x] 26-01-PLAN.md — PileZone badge + controls gap (POLISH-05, POLISH-06)
- [x] 26-02-PLAN.md — SpreadZone face-toggle guard, name label removal, GridZone face-toggle relocation (CTRL-05, CTRL-07, LAYOUT-07)
**UI hint**: yes

### Phase 27: Drop Target + Empty Spread Behavior
**Goal**: Drop target feedback is accurate (hover-only) and empty spread zones have a discoverable but unobtrusive visual presence
**Depends on**: Phase 26
**Requirements**: CTRL-06, LAYOUT-06
**Success Criteria** (what must be TRUE):
  1. Dragging a card does not highlight the opponent's hand zone; the outline appears only when the dragged card is physically hovered over that zone
  2. An empty personal spread zone shows a faint dashed strip approximately one quarter of normal height
  3. Face-toggle and select-all controls are not visible on an empty spread zone; they reappear once at least one card is present
**Plans**: 1 plan
**Plan list**:
- [ ] 27-01-PLAN.md — Hover-only OpponentHand drop-target outline (CTRL-06) and faint dashed strip for empty SpreadZone (LAYOUT-06)
**UI hint**: yes

### Phase 28: Bug Fixes
**Goal**: Select All works correctly and the communal grid collapses to 4 columns at mobile widths
**Depends on**: Phase 27
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. Clicking "Select All" on a pile selects the expected card(s); clicking it on a spread zone selects all cards in that zone
  2. The communal grid zone displays 4 columns at viewport widths below 640px (iPhone SE and similar)
  3. The communal grid zone displays 7 columns at desktop viewport widths
**Plans**: TBD
**UI hint**: yes

### Phase 29: Sort Verification
**Goal**: Hand sort "original order" has defined semantics and the behavior after drag-reorder followed by sort cycling is verified with tests
**Depends on**: Phase 28
**Requirements**: SORT-02
**Success Criteria** (what must be TRUE):
  1. "Original order" in the sort cycle is explicitly defined (documented decision: current server/manual order, not deal order)
  2. After a player drag-reorders their hand then cycles back to "original," the hand reflects the order it was in after the last manual reorder
  3. Unit tests cover the sort-cycle-to-original behavior after drag-reorder
**Plans**: TBD

### Phase 30: Layout Restructure — Dock Spread Zones
**Goal**: Spread zones are spatially anchored to their owner hands — opponent spreads appear directly below each opponent hand; the personal spread appears flush above the local player's hand
**Depends on**: Phase 29
**Requirements**: LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. Each opponent's spread zone renders immediately below that opponent's hand in the board area, not in the header band
  2. The personal spread zone renders flush above the local player's hand with no visible separator
  3. Extra vertical space on tall screens grows between the piles/grid area and the spread zones, not between spread zones and their hands
  4. Drag-and-drop to and from spread zones works correctly after the DOM restructure (e2e verified)
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 22. Hand Reveal | 2/2 | Complete | 2026-05-16 |
| 23. Hand Sort + Select All | 3/3 | Complete | 2026-05-17 |
| 24. Play Area Grid | 2/2 | Complete | 2026-05-17 |
| 25. Layout & Visual Polish | 3/3 | Complete | 2026-05-18 |
| 26. Zero-Risk Visual Polish | 2/2 | Complete   | 2026-05-20 |
| 27. Drop Target + Empty Spread Behavior | 0/TBD | Not started | - |
| 28. Bug Fixes | 0/TBD | Not started | - |
| 29. Sort Verification | 0/TBD | Not started | - |
| 30. Layout Restructure — Dock Spread Zones | 0/TBD | Not started | - |

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
