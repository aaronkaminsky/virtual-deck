# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (shipped 2026-04-29) — [archive](milestones/v1.2-ROADMAP.md)
- **v1.3** — Phases 17–25 (upcoming)

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

## Upcoming — v1.3

| Phase | Goal | Plans |
|-------|------|-------|
| 17 | Mobile responsive layout — phone-friendly design; options include responsive breakpoints, progressive display, or smaller cards | TBD |
| 18 | Sticky pile placement choice — remember top/bottom/random to reduce popup frequency | TBD |
| 19 | npm audit — investigate and resolve 4 vulnerabilities (3 moderate, 1 high) surfaced during Phase 13 UAT (`npm install` on 2026-04-22) | TBD |
| 20 | Test helper consolidation — migrate `tests/dealCards.test.ts` (and remaining 11 pre-Phase-12 test files) to import shared helpers from `tests/helpers.ts` instead of defining local copies | TBD |
| 21 | Phase 14 live session verification — confirm 5 human-deferred behaviors: two-player zone layout, drag-to-spread (no dialog), spread reorder by drag, face toggle sync, late-joiner re-deal after reset | TBD |
| 22 | Restrict PLAY_CARD_SET target to spread-region piles — server currently accepts any pile ID; add `region === "spread"` guard to match UI intent | TBD |
| 23 | Replace hardcoded communal zone ID "play" with ownerId-based lookup — `BoardView.communalZone` currently uses `p.id === "play"`; switch to `p.region === "spread" && p.ownerId === null` for resilience | TBD |
| 24 | Spread pile multi-select and sort — spread zones should support the same multi-card select and drag-to-reorder behavior as the player's hand | TBD |
| 25 | Play Area layout — move communal spread zone to center canvas area, to the right or below the discard pile | TBD |

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
| 14. Gameplay Zone Infrastructure | v1.2 | 6/6 | Complete   | 2026-04-26 |
| 15. Multi-Card Set Play | v1.2 | 3/3 | Complete    | 2026-04-28 |
| 16. Developer README | v1.2 | 1/1 | Complete    | 2026-04-29 |
| 17. Mobile Responsive Layout | v1.3 | 0/3 | Not started | — |
| 18. Sticky Pile Placement Choice | v1.3 | 0/3 | Not started | — |
| 19. npm Audit | v1.3 | 0/1 | Not started | — |
| 20. Test Helper Consolidation | v1.3 | 0/1 | Not started | — |
| 21. Phase 14 Live Session Verification | v1.3 | 0/1 | Not started | — |
| 22. Restrict PLAY_CARD_SET to Spread Region | v1.3 | 0/1 | Not started | — |
| 23. Replace Hardcoded Communal Zone ID | v1.3 | 0/1 | Not started | — |
| 24. Spread Pile Multi-Select and Sort | v1.3 | 0/3 | Not started | — |
| 25. Play Area Layout — Center Canvas | v1.3 | 0/3 | Not started | — |
