# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- 📋 **v1.1 Social Identity + UX Polish** — Phases 9–10 (in progress)

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

### 📋 v1.1 (Planned)

- [ ] **Phase 9: Player Identity & Presence** — Display names on join, visible to all players, persisted across reconnects, real-time roster
- [ ] **Phase 10: Dialog UX + Deal Shuffle** — Empty-pile drop skips dialog, Escape/Enter keyboard handling in dialog, shuffle-before-deal

## Phase Details

### Phase 9: Player Identity & Presence
**Goal**: Every seat at the table has a name, and all players can see who is present
**Depends on**: Phase 5 (presence dots infrastructure already in place)
**Requirements**: PRES-01, PRES-02, PRES-03, PRES-04
**Success Criteria** (what must be TRUE):
  1. Player is prompted for a display name (non-empty, max 20 chars) before or during room join
  2. Each player's display name appears on the board next to their hand/seat, visible to all
  3. A player who disconnects and reconnects retains their previous display name
  4. All players see a live roster indicating which players are connected and which are disconnected
**Plans**: TBD
**UI hint**: yes

### Phase 10: Dialog UX + Deal Shuffle
**Goal**: Pile interactions feel instant and keyboard-native, and deals start from a shuffled pile
**Depends on**: Phase 9
**Requirements**: UX-01, UX-02, UX-03, GAME-01
**Success Criteria** (what must be TRUE):
  1. Dropping a card onto an empty pile places it on top immediately — no dialog appears
  2. Pressing Escape while the pile drop dialog is open closes the dialog and returns the card to where it was dragged from
  3. Pressing Enter while the pile drop dialog is open confirms the Top position (the pre-selected default)
  4. Dealing N cards from a pile distributes from a freshly shuffled order, not the current pile sequence
**Plans**: TBD

## Backlog

Promote items with `/gsd-review-backlog` when ready to plan.

### Future Backlog

| Phase | Goal | Plans |
|-------|------|-------|
| 999.3 | Play area card grid for poker-style games | TBD |
| 999.4 | Personal player tableau visible to all | TBD |
| 999.5 | Shuffle visual indicator | TBD |
| 999.6 | Investigate test setup treating both players as remote | TBD |
| 999.7 | README and architecture documentation | TBD |
| 999.10 | Drag origin placeholder | TBD |
| 999.12 | Mobile-responsive layout — make the game fully playable on a phone; current layout is not usable on small screens | TBD |
| 999.14 | Custom card art — new artwork for card fronts and backs | TBD |
| 999.15 | Drag entire piles — move all cards from one pile to another in a single gesture (e.g. sweep Play Area to Discard Pile) | TBD |

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
| 9. Player Identity & Presence | v1.1 | 0/? | Not started | - |
| 10. Dialog UX + Deal Shuffle | v1.1 | 0/? | Not started | - |
