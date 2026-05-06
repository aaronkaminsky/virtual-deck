# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- **v1.3 Layout & UX Polish** — Phases 17–21 (in progress)

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

## Upcoming — v1.3 Layout & UX Polish

- [x] **Phase 16.1: Fix PartyKit CI Deploy** (INSERTED) — Add `partykit deploy` step to GitHub Actions workflow so server and client are always deployed together on push to main (completed 2026-05-03)
- [x] **Phase 17: Board Layout Restructure** — Reposition communal zone to physical center; fix vertical proportions; resolve dnd-kit ID collision as pre-work for multi-select (completed 2026-05-03)
- [x] **Phase 18: Controls Collapse** — Wrap all game controls in a collapsible panel triggered by a single header button (completed 2026-05-04)
- [ ] **Phase 19: Responsive Layout** — Scale board to phone-width (≥375px) without horizontal scrolling
- [ ] **Phase 20: Spread Zone Multi-Select** — Click-to-select multiple spread zone cards with the same UX as player hand; drag selected set to another zone
- [ ] **Phase 21: Spread Zone Reorder Verification** — Confirm drag-reorder coexists correctly with multi-select state and undo contract

## Phase Details

### Phase 16.1: Fix PartyKit CI Deploy (INSERTED)
**Goal**: Every push to main deploys both the Vite frontend (GitHub Pages) and the PartyKit server so the two never drift out of sync
**Depends on**: Phase 16
**Requirements**: (infrastructure — no milestone REQ-ID)
**Success Criteria** (what must be TRUE):
  1. Pushing to main triggers both a GitHub Pages deploy and a `partykit deploy`
  2. After a push, the live PartyKit server reflects the current `party/index.ts` on main
  3. A `PARTYKIT_TOKEN` secret is stored in the repo and used by the workflow
**Plans**: 1 plan
Plans:
- [x] 16.1-01-PLAN.md — Insert `npm run deploy` step into deploy.yml between build and Pages publish; document PARTYKIT_TOKEN repo-secret setup

### Phase 17: Board Layout Restructure
**Goal**: The board reads as a shared physical space with the communal zone at visual center, all zones get usable vertical space, and the dnd-kit ID collision that would break multi-select in Phase 20 is eliminated
**Depends on**: Phase 16
**Requirements**: LAYOUT-01, LAYOUT-02, SPREAD-04
**Success Criteria** (what must be TRUE):
  1. The communal spread zone is visually centered between opponent zones (top) and the player's own hand (bottom)
  2. All zones — opponent hands, communal zone, personal spread zones, player hand — are simultaneously visible on a 1080p desktop without scrolling
  3. Vertical proportions give each zone a usable card-height slot; no zone is squashed or hidden by default
  4. Drag interactions on spread zones produce no event misfires or ghost drags when cards are selected (dnd-kit ID collision between SortableSpreadCard and nested DraggableCard resolved)
**Plans**: TBD
**UI hint**: yes

### Phase 18: Controls Collapse
**Goal**: All game controls are hidden behind a single header button; the board surface is uncluttered by default
**Depends on**: Phase 17
**Requirements**: LAYOUT-03
**Success Criteria** (what must be TRUE):
  1. A single button in the header opens and closes the controls panel
  2. All existing game controls (deal, shuffle, reset, undo, flip, pass) are accessible from the collapsed panel
  3. The controls panel is closed by default when a player first loads the board
  4. Closing the panel returns focus to the board with no controls visible
**Plans**: 2 plans
Plans:
- [x] 18-01-PLAN.md — Wave 1: Write Vitest contract tests for ControlsBar collapse logic (auto-close, confirmReset reset, enabled/disabled derivation) before the rewrite
- [x] 18-02-PLAN.md — Wave 2: Rewrite ControlsBar as single Popover with Copy link + Deal stepper + Undo + inline two-step Reset; excise Copy link block from BoardView (paired edit) — manual smoke checkpoint
**UI hint**: yes

### Phase 19: Responsive Layout
**Goal**: The board is usable at phone-width screens without horizontal scrolling
**Depends on**: Phase 17
**Requirements**: LAYOUT-04
**Success Criteria** (what must be TRUE):
  1. At 375px viewport width, no horizontal scrollbar appears on any board view
  2. All zones remain visible and operable at 375px — cards are not clipped or hidden off-screen
  3. The header, zone labels, and controls button are readable at phone width
  4. Pointer/mouse interactions (drag, click) function correctly at 375px — no interaction targets become too small to hit
**Plans**: TBD
**UI hint**: yes

### Phase 20: Spread Zone Multi-Select
**Goal**: Players can select multiple cards in a spread zone and drag the selected set to another zone, matching the selection UX of the player hand
**Depends on**: Phase 17
**Requirements**: SPREAD-01, SPREAD-03
**Success Criteria** (what must be TRUE):
  1. Clicking a card in a spread zone toggles its selection state with the same visual ring/lift treatment as hand card selection
  2. Multiple cards in a spread zone can be selected in a single session without deselecting previous picks
  3. Pressing Escape clears the spread zone selection
  4. Dragging a selected card from a spread zone moves the entire selected set as a group to the target zone (pile, hand, or another spread zone)
**Plans**: TBD
**UI hint**: yes

### Phase 21: Spread Zone Reorder Verification
**Goal**: Drag-reorder within a spread zone coexists correctly with multi-select state, and undo correctly reverses a reorder
**Depends on**: Phase 20
**Requirements**: SPREAD-02
**Success Criteria** (what must be TRUE):
  1. A player can drag a card within a spread zone to a new position and the order is preserved for all players
  2. Drag-reorder works correctly when one or more cards are in a selected state — reordering a non-selected card does not clear selection unexpectedly
  3. Undo reverses the last reorder operation and restores the previous card order
**Plans**: TBD

## Backlog

Promote items with `/gsd-review-backlog` when ready to plan.

| Phase | Goal | Plans |
|-------|------|-------|
| 999.3 | Play area card grid for poker-style games | TBD |
| 999.14 | Custom card art — new artwork for card fronts and backs | TBD |
| 999.16 | Turn indicators — show whose turn it is | TBD |
| 999.17 | Chips — poker/betting chip support | TBD |
| 999.18 | Show hand — player can reveal their hand to all players | TBD |
| 999.19 | Drag entire piles — move all cards from one pile to another in a single gesture (e.g. sweep Play Area to Discard Pile) | TBD |
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit onBeforeConnect rejects connections without the correct password (passed in URL query string) | TBD |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message | TBD |
| 999.23 | Sound effects — shuffle, deal, card drop/play sounds; icon toggle to mute; group near art/customization features (see 999.14) | TBD |
| 999.24 | Hand sort shortcuts — cycle through sort modes (original order, by suit, by rank); restore original order until next hand action | TBD |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features | TBD |
| 999.35 | Continuous multi-card drag-to-sort — when multiple adjacent cards are selected, dragging one moves all as a group to the new position; needs play-testing to validate the interaction model | TBD |
| 999.36 | Editable zone names — players can rename spread zones and piles inline | TBD |

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Server Foundation | v1.0 | 3/3 | Complete | 2026-04-02 |
| 2. Lobby + Room Join | v1.0 | 3/3 | Complete | 2026-04-03 |
| 3. Core Board | v1.0 | 3/3 | Complete | 2026-04-04 |
| 4. Game Controls | v1.0 | 3/3 | Complete | 2026-04-05 |
| 5. Resilience + Polish | v1.0 | 3/3 | Complete | 2026-04-05 |
| 6. Functional Tech Debt | v1.0 | 1/1 | Complete | 2026-04-10 |
| 7. Nyquist Validation | v1.0 | 1/1 | Complete | 2026-04-10 |
| 8. Documentation Housekeeping | v1.0 | 1/1 | Complete | 2026-04-10 |
| 999.1 Drag to opponent's hand | v1.0 | 1/1 | Complete | 2026-04-12 |
| 999.2 Pile insert position | v1.0 | 1/1 | Complete | 2026-04-12 |
| 999.10 Drag origin placeholder | v1.1 | 3/3 | Complete | 2026-04-17 |
| 999.11 Pile drop dialog UX | v1.1 | 1/1 | Complete | 2026-04-17 |
| 9. Player Identity + Presence | v1.1 | 3/3 | Complete | 2026-04-19 |
| 10. Shuffle Before Deal | v1.1 | 3/3 | Complete | 2026-04-18 |
| 11. Empty Pile Drop UX | v1.1 | 1/1 | Complete | 2026-04-18 |
| 12. Test Mock Fix | v1.2 | 1/1 | Complete | 2026-04-20 |
| 13. Playwright Infrastructure | v1.2 | 3/3 | Complete | 2026-04-22 |
| 14. Gameplay Zone Infrastructure | v1.2 | 6/6 | Complete | 2026-04-26 |
| 15. Multi-Card Set Play | v1.2 | 3/3 | Complete | 2026-04-28 |
| 16. Developer README | v1.2 | 1/1 | Complete | 2026-04-29 |
| 16.1 Fix PartyKit CI Deploy (INSERTED) | v1.3 | 1/1 | Complete    | 2026-05-03 |
| 17. Board Layout Restructure | v1.3 | 2/2 | Complete    | 2026-05-03 |
| 18. Controls Collapse | v1.3 | 2/2 | Complete    | 2026-05-04 |
| 19. Responsive Layout | v1.3 | 2/3 | In Progress|  |
| 20. Spread Zone Multi-Select | v1.3 | 0/TBD | Not started | — |
| 21. Spread Zone Reorder Verification | v1.3 | 0/TBD | Not started | — |
