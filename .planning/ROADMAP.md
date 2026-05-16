# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Layout & UX Polish** — Phases 16.1, 17–21 (shipped 2026-05-15) — [archive](milestones/v1.3-ROADMAP.md)
- 🔲 **v1.4 Table Polish** — Phases 22–25 (active)

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

### v1.4 Table Polish (Phases 22–25)

- [x] **Phase 22: Hand Reveal** — Players can toggle their hand face-up/down in real time; server persists reveal state per player (completed 2026-05-16)
- [ ] **Phase 23: Hand Sort + Select All** — Players can cycle sort modes on their hand; players can select all cards in any pile or spread zone and drag them as a group
- [ ] **Phase 24: Play Area Grid** — Communal spread zone displays as a 2-row fixed grid with column snapping and per-cell stacking
- [ ] **Phase 25: Layout & Visual Polish** — Empty zones are clean and compact; pile controls move to top; personal spread zones collapse when empty

## Phase Details

### Phase 22: Hand Reveal
**Goal**: Players can show their hand to the table and hide it again, with the state visible to all players in real time
**Depends on**: Phase 21 (prior state of the project)
**Requirements**: HAND-01, HAND-02, HAND-03, HAND-04
**Success Criteria** (what must be TRUE):
  1. A player can click a "Show Hand" toggle and all other players immediately see their cards face-up
  2. The same player can click the toggle again and their cards return to hidden (backs only) for other players
  3. A player who joins or reconnects mid-session sees the correct revealed/hidden state for every already-connected player
  4. The revealing player's own view is unchanged — they always see their own card faces
**Plans**: 2 plans in 2 waves

**Wave 1**
- [x] 22-01-PLAN.md — Types, server logic, and test suite (SET_HAND_REVEALED handler, viewFor masking, migration, RESET_TABLE extension)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 22-02-PLAN.md — UI components (HandZone toggle button and ring, OpponentHand revealed path, BoardView prop threading)

**Cross-cutting constraints:**
- `handRevealed` state is owned by the server only — clients read it through `viewFor()`, never write it directly
- `opponentHandCounts` and `opponentRevealedHands` are mutually exclusive in `viewFor()` — a player appears in exactly one
**UI hint**: yes

### Phase 23: Hand Sort + Select All
**Goal**: Players have affordances to sort their hand and bulk-select cards from any pile or spread zone for group moves
**Depends on**: Phase 22
**Requirements**: SORT-01, SELECT-01, SELECT-02, SELECT-03
**Success Criteria** (what must be TRUE):
  1. A player can click a sort control on their hand to cycle through original order, by suit, and by rank — the hand visually reorders each time
  2. The sort order persists if the player navigates away and returns; other players see the reordered hand
  3. A "Select All" button on a pile selects all cards in it, ready for a drag
  4. A "Select All" button on a spread zone selects all cards in it, ready for a drag
  5. After "Select All", the player can drag the selection to any valid drop target (pile, hand, or spread zone) and all cards move
**Plans**: 3 plans in 2 waves

**Wave 1** *(parallel — no file overlap)*
- [ ] 23-01-PLAN.md — Server-side: add `skipSnapshot?: boolean` to `REORDER_HAND` (so sort does not enter undo stack), extend reorderUndo tests, create Wave-0 scaffolds for `tests/handSort.test.ts` and `tests/selectAll.test.ts`
- [ ] 23-03-PLAN.md — Select All UI: `handleSelectAll` in BoardDragLayer, prop threading through BoardView, Select All buttons in PileZone (top-card-only) and interactive SpreadZone (all face-up cards), passing PLAY_CARD_SET coverage in `tests/selectAll.test.ts`

**Wave 2** *(blocked on Wave 1 — Plan 02 imports the extended REORDER_HAND type from Plan 01)*
- [ ] 23-02-PLAN.md — Hand sort UI: `SortMode` cycle button in HandZone, exported `sortCards`/`buildSortDispatch`, render-time visual sort, dispatch via REORDER_HAND with `skipSnapshot: true`, passing assertions in `tests/handSort.test.ts`

**Cross-cutting decisions** (resolved by planner):
- RESEARCH.md OQ1 → `skipSnapshot?: boolean` added to `REORDER_HAND` so SORT-01 does not pollute the undo stack (REQUIREMENTS.md requirement)
- RESEARCH.md OQ2 → render-time visual sort (no auto-redispatch useEffect); dispatch fires on click only; reconnect sees last sorted order from server
- RESEARCH.md OQ3 → Select All on a pile selects the top card only (Pitfall 4: interior masked cards have no client-visible id; `PLAY_CARD_SET` would reject)
- Drag-reorder while sortMode !== 'original' clears sortMode back to 'original' (drag is undoable + implies manual order intent)

**UI hint**: yes

### Phase 24: Play Area Grid
**Goal**: The communal spread zone organizes cards into a structured grid so players can manage a shared play area with positional meaning
**Depends on**: Phase 23
**Requirements**: GRID-01
**Success Criteria** (what must be TRUE):
  1. The communal spread zone displays cards in a 2-row grid with visible column boundaries; cards snap to column positions when dropped
  2. Multiple cards can occupy the same cell (stacked); the stack is visually distinguishable from a single card
  3. A player can drag a card from one cell to another cell within the grid
  4. A player can drag a card from the grid to a pile or hand, and vice versa, using existing drag targets
**Plans**: TBD
**UI hint**: yes

### Phase 25: Layout & Visual Polish
**Goal**: The board is visually clean and compact — empty zones are quiet, controls are in the right place, and vertical space is used efficiently
**Depends on**: Phase 24
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, ZONE-01
**Success Criteria** (what must be TRUE):
  1. Empty piles and spread zones show only their label — no body text or placeholder copy inside the zone
  2. Pile controls (shuffle, deal, etc.) appear at the top of each pile column, inline with the pile label, not below the cards
  3. Personal spread zones sit visually closer to the communal/draw/discard area; the gap between them is noticeably reduced
  4. A player's personal spread zone is invisible when they have no cards in it; when they begin dragging a card, a drop target for that zone appears
  5. The overall board is more compact — zone heights and inter-zone spacing are reduced so more of the play area is visible without scrolling
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 22. Hand Reveal | 2/2 | Complete   | 2026-05-16 |
| 23. Hand Sort + Select All | 0/3 | Planned | - |
| 24. Play Area Grid | 0/? | Not started | - |
| 25. Layout & Visual Polish | 0/? | Not started | - |

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
