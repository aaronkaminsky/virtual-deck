# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- 📋 **v1.1 Social Identity + UX Polish** — Phases 9–11 (planned)

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
<summary>✅ v1.1 pre-work (Phases 999.10–999.11) — SHIPPED 2026-04-17</summary>

- [x] Phase 999.10: Drag origin placeholder — dashed outline at card origin slot during drag; custom collision detection (pointerWithin) (completed 2026-04-17)
- [x] Phase 999.11: Pile drop dialog UX — Escape/click-outside cancels, Enter confirms Top, Top uses primary button style (completed 2026-04-17)

</details>

### 📋 v1.1 Social Identity + UX Polish (Phases 9–11)

- [ ] **Phase 9: Player Identity + Presence** — Display names, presence roster, reconnect persistence
- [ ] **Phase 10: Shuffle Before Deal** — Auto-shuffle pile before distributing cards
- [ ] **Phase 11: Empty Pile Drop UX** — Skip position dialog when dropping onto an empty pile

## Phase Details

### Phase 9: Player Identity + Presence
**Goal**: Players know who is at the table — names are visible on the board, persist across reconnects, and a live roster shows who is connected or away
**Depends on**: Phases 1–8 (v1.0 complete)
**Requirements**: PRES-01, PRES-02, PRES-03, PRES-04
**Success Criteria** (what must be TRUE):
  1. A player joining a room is prompted for a display name (non-empty, max 20 chars) before reaching the board
  2. Every player's display name is visible on the shared table to all connected players
  3. After a player disconnects and reconnects, their display name is the same as before (not reset)
  4. All players can see a roster listing every player in the room, with a visual indicator distinguishing connected from disconnected players
  5. When a new player joins mid-session, their name appears in all other players' rosters without a page refresh
**Plans**: TBD
**UI hint**: yes

### Phase 10: Shuffle Before Deal
**Goal**: The deal action is always fair — dealing from any pile automatically shuffles it first so players cannot predict card order
**Depends on**: Phase 9
**Requirements**: GAME-01
**Success Criteria** (what must be TRUE):
  1. Clicking "Deal" from any pile triggers a shuffle of that pile before any cards are distributed
  2. The shuffled order is reflected in the pile state visible to all players immediately after dealing
  3. Cards dealt to each player arrive in the new random order, not the order they were in before the deal action
**Plans**: TBD

### Phase 11: Empty Pile Drop UX
**Goal**: Dropping a card onto an empty pile is frictionless — no dialog appears because there is no position to choose
**Depends on**: Phase 10
**Requirements**: UX-01
**Success Criteria** (what must be TRUE):
  1. Dragging and dropping a card onto an empty pile places the card on top immediately, without opening the position dialog
  2. The position dialog continues to appear normally when dropping onto a non-empty pile
  3. The card moves to the correct pile and state updates are broadcast to all players in both the empty and non-empty pile cases
**Plans**: TBD
**UI hint**: yes

## Backlog

Promote items with `/gsd-review-backlog` when ready to plan.

| Phase | Goal | Plans |
|-------|------|-------|
| 999.3 | Play area card grid for poker-style games | TBD |
| 999.4 | Personal player tableau visible to all | TBD |
| 999.5 | Shuffle visual indicator | TBD |
| 999.6 | Investigate test setup treating both players as remote | TBD |
| 999.7 | README and architecture documentation | TBD |
| 999.14 | Custom card art — new artwork for card fronts and backs | TBD |
| 999.15 | Sticky pile placement choice (remember top/bottom/random to reduce popup frequency) | TBD |
| 999.16 | Turn indicators — show whose turn it is | TBD |
| 999.17 | Chips — poker/betting chip support | TBD |
| 999.18 | Show hand — player can reveal their hand to all players | TBD |
| 999.19 | Drag entire piles — move all cards from one pile to another in a single gesture (e.g. sweep Play Area to Discard Pile) | TBD |

### Phase 999.11: Pile Drop Dialog UX Improvements

**Goal:** Keyboard UX improvements to the existing pile insert-position dialog — Escape/click-outside cancels (card stays at origin), Enter confirms Top via auto-focus, Top button gets primary visual style.

**Plans:** 1/1 plans complete

Plans:
- [x] 999.11-01-PLAN.md — Rewrite pile dialog dismiss logic, auto-focus Top, primary button style

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
| 999.10 Drag origin placeholder | v1.1 pre | 1/1 | Complete | 2026-04-17 |
| 999.11 Pile drop dialog UX | v1.1 pre | 1/1 | Complete | 2026-04-17 |
| 9. Player Identity + Presence | v1.1 | 0/TBD | Not started | - |
| 10. Shuffle Before Deal | v1.1 | 0/TBD | Not started | - |
| 11. Empty Pile Drop UX | v1.1 | 0/TBD | Not started | - |
