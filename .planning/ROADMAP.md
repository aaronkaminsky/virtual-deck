# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Layout & UX Polish** — Phases 16.1, 17–21 (shipped 2026-05-15) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Table Polish** — Phases 22–25 (shipped 2026-05-18) — [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Board Polish II** — Phases 26–30 (shipped 2026-05-23) — [archive](milestones/v1.5-ROADMAP.md)
- 🔲 **v1.6 Free Canvas Play Area** — Phases 31–35 (in progress)

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

### v1.6 Free Canvas Play Area

- [x] **Phase 31: Migration** — Remove communal grid; establish fixed left sidebar with draw/discard piles and free canvas play area shell (completed 2026-05-24)
- [ ] **Phase 32: Canvas Core** — Server x/y/z model, drag-to-position on canvas, cancel-reverts, z-ordering on drop, no-card-loss guarantee
- [ ] **Phase 33: Overlap & Visibility** — Topmost-card pointer events, drag opacity, stack shadow indicator
- [ ] **Phase 34: Multi-Card Group Drop** — Canvas click-to-select, group drop with relative offsets, z-order above existing, all-or-nothing bounds rule
- [ ] **Phase 35: Mobile** — Edge-pan hold-to-scroll arrows, drag non-conflict, bounded canvas height at narrow viewports

## Phase Details

### Phase 31: Migration
**Goal**: The communal grid is gone and the new sidebar+canvas shell is in place; players see draw/discard piles in a fixed left sidebar and an open canvas area where communal cards will live
**Depends on**: Phase 30
**Requirements**: MIGRATE-01, MIGRATE-02, MIGRATE-03
**Success Criteria** (what must be TRUE):
  1. No grid zone appears anywhere on the board; GRID-01 region code is deleted or unreachable
  2. Draw pile and discard pile appear in a fixed left sidebar, vertically stacked (draw above discard), always visible regardless of canvas scroll
  3. The remaining horizontal space to the right of the sidebar is the free canvas area (may be empty shell at this phase)
  4. Reset table moves all canvas cards to the draw pile (canvas clears on reset)
**Plans**: 3 plans
- [x] 31-01-PLAN.md — Server + types + test-suite atomic migration (delete grid surface from party/index.ts, src/shared/types.ts; realign existing tests; add tests/gridRemoval.test.ts regression guard)
- [x] 31-02-PLAN.md — Delete GridZone.tsx; finalize BoardDragLayer.tsx cleanup; restructure BoardView.tsx middle band into sidebar+canvas; update Playwright spec
- [x] 31-03-PLAN.md — Human visual verification of sidebar+canvas layout at 1280x720 and 375x667 + reset-table behavior
**UI hint**: yes

### Phase 32: Canvas Core
**Goal**: Players can drag cards freely to any position on the canvas, cards anchor at the drop point with x/y/z stored on the server, cancelling a drag reverts to the pre-drag position, and no card is ever lost to an invalid drop
**Depends on**: Phase 31
**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, NOLOSS-01
**Success Criteria** (what must be TRUE):
  1. Player can drag a card from hand or pile to the canvas and it anchors at the exact screen position where the pointer was released
  2. Player can drag a canvas card to a new canvas position and it moves there; other players see the updated position in real time
  3. Cancelling a drag (Escape or drop outside canvas and outside any valid zone) returns the card to its original canvas position — no card disappears
  4. A card dropped from the canvas into a hand, pile, or personal spread zone moves there correctly (card-loss guard does not block valid drops)
  5. The server stores (x, y, z) per canvas card; a card dropped onto the canvas receives z = max existing z + 1 (topmost)
**Plans**: 3 plans
- [x] 32-01-PLAN.md — Server + types + tests: CanvasCard model, PLACE_ON_CANVAS handler, MOVE_CARD canvas source, RESET_TABLE canvas sweep, viewFor broadcast, onStart migration, tests/canvasCards.test.ts
- [ ] 32-02-PLAN.md — Client: CanvasZone + CanvasDraggableCard components; BoardView wiring; BoardDragLayer customCollision canvas fallback, handleDragEnd canvas branch, PendingMove canvas extension, DragOverlay opacity/scale
- [ ] 32-03-PLAN.md — Human visual verification (16-item checklist, desktop + mobile, two-player real-time sync)
**UI hint**: yes

### Phase 33: Overlap & Visibility
**Goal**: When cards overlap on the canvas, the visually topmost card receives all pointer events, dragging a card reveals the card beneath it, and a shadow indicator shows when cards are substantially stacked
**Depends on**: Phase 32
**Requirements**: OVERLAP-01, OVERLAP-02, OVERLAP-03
**Success Criteria** (what must be TRUE):
  1. Clicking or starting a drag at a point where two cards overlap targets only the card with the higher z-index; the card beneath is not accidentally selected or dragged
  2. A card being dragged renders at approximately 50% opacity so the player can see the card underneath it while deciding where to drop
  3. When a card covers more than 50% of the area of a lower card, a box-shadow layering indicator appears on the lower card; the indicator disappears when the overlap drops below the threshold
**Plans**: TBD
**UI hint**: yes

### Phase 34: Multi-Card Group Drop
**Goal**: Players can select multiple canvas cards and drop them as a group, preserving relative positions and z-order, with an all-or-nothing rule if any card would leave the canvas
**Depends on**: Phase 33
**Requirements**: MULTI-01, MULTI-02, MULTI-03, MULTI-04
**Success Criteria** (what must be TRUE):
  1. Player can click individual canvas cards to select them (same ring/lift visual as hand and spread zone selection); clicking elsewhere deselects
  2. Dragging any selected card moves all selected cards together; each card lands at its original offset relative to the drag handle card
  3. After a group drop, all dropped cards have z-indices higher than any pre-existing canvas card; their internal z-order relative to each other is preserved
  4. If any card in a selected group would land outside canvas bounds, the entire drop is cancelled and all cards snap back to their pre-drag positions — no partial placement
**Plans**: TBD
**UI hint**: yes

### Phase 35: Mobile
**Goal**: The canvas is usable on narrow viewports without one-finger drags conflicting with panning; edge-pan arrows provide a hold-to-scroll mechanism and the canvas height does not push spread zones off screen
**Depends on**: Phase 34
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. At narrow viewports where canvas content overflows, hold-to-scroll arrow buttons appear at the canvas edges; holding an arrow pans the canvas continuously without the player lifting their finger
  2. A one-finger drag on a canvas card moves that card (not the canvas viewport); edge-pan and card drag never activate simultaneously for the same touch gesture
  3. At viewport widths below 640px, the canvas height is capped so personal spread zones remain visible below the canvas without vertical overlap or scroll required to reach them
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 31. Migration | 8/8 | Complete    | 2026-05-24 |
| 32. Canvas Core | 1/3 | In Progress|  |
| 33. Overlap & Visibility | 0/? | Not started | - |
| 34. Multi-Card Group Drop | 0/? | Not started | - |
| 35. Mobile | 0/? | Not started | - |

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
| 999.38 | Highlight last move — subtle visual indicator on cards/zones that were just moved; fades after a few seconds so players who blink don't miss the action | TBD |
