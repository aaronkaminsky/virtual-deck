# Roadmap: Virtual Deck

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 + 999.1, 999.2 (shipped 2026-04-12) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Social Identity + UX Polish** — Phases 999.10, 999.11, 9–11 (shipped 2026-04-19) — [archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Dev Infrastructure & Game Depth** — Phases 12–16 (in progress)

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

### 🚧 v1.2 Dev Infrastructure & Game Depth (In Progress)

**Milestone Goal:** Establish developer tooling and add play zones with multi-card set support for 13s-style games.

- [x] **Phase 12: Test Mock Fix** — Fix unit test helpers to correctly model local vs remote player behavior (completed 2026-04-20)
- [x] **Phase 13: Playwright Infrastructure** — Install Playwright, configure e2e suite with 2-player fixture, commit MCP config (completed 2026-04-22)
- [x] **Phase 14: Gameplay Zone Infrastructure** — Add spread zone type: personal play zone per player and shared communal zone (completed 2026-04-26)
- [x] **Phase 15: Multi-Card Set Play** — Player selects 1–5 cards from hand and plays them as a set into a zone (completed 2026-04-28)
- [ ] **Phase 16: Developer README** — Write README covering local setup, architecture, test runners, and deploy

## Phase Details

### Phase 12: Test Mock Fix
**Goal**: Unit test helpers correctly model local vs remote player; viewFor masking is verified to work
**Depends on**: Phase 11 (previous milestone complete)
**Requirements**: DEV-04
**Success Criteria** (what must be TRUE):
  1. Developer can run the unit test suite and the mock room's `getConnections()` returns populated connection data (not an empty iterator)
  2. A unit test asserts that `viewFor` returns masked card data for a remote player (opponent cannot see hand card values)
  3. A unit test asserts that `viewFor` returns full card data for the local player (sender sees their own hand)
  4. All existing tests continue to pass — the mock extension is additive only
**Plans**: 1 plan
Plans:
- [x] 12-01-PLAN.md — Create tests/helpers.ts (shared mock helpers) and tests/broadcastMasking.test.ts (viewFor broadcast masking tests)

### Phase 13: Playwright Infrastructure
**Goal**: Developer can run a committed Playwright e2e suite covering core 2-player scenarios, and Claude sessions have Playwright MCP available via .mcp.json
**Depends on**: Phase 12
**Requirements**: DEV-01, DEV-02
**Success Criteria** (what must be TRUE):
  1. Running `npx playwright test` executes a committed test suite without manual setup beyond `npm install` and `npx playwright install chromium`
  2. The e2e suite covers at minimum: 2-player state sync, deal cards, pass card between players, reset table, and hand privacy (opponent cannot see card values)
  3. `.mcp.json` exists in the repo root and registers `@playwright/mcp` as a project-scoped MCP server — Claude Code can start a Playwright-driven browser session from a dev session
  4. All Playwright assertions use retry-based matchers (no `waitForTimeout` or `.textContent()` in committed test files)
**Plans**: 3 plans
Plans:
- [ ] 13-01-PLAN.md — Install @playwright/test + @playwright/mcp, add npm scripts, add data-testid attrs to HandZone/OpponentHand/PileZone, create .mcp.json
- [ ] 13-02-PLAN.md — Create playwright.config.ts (dual webServer) and playwright/fixtures.ts (twoPlayerRoom fixture)
- [ ] 13-03-PLAN.md — Write playwright/game.spec.ts with all 5 scenario tests

### Phase 14: Gameplay Zone Infrastructure
**Goal**: A personal spread zone exists for each connected player and a shared communal spread zone exists on the table — all cards visible simultaneously, not stacked
**Depends on**: Phase 13
**Requirements**: PLAY-01, PLAY-02
**Success Criteria** (what must be TRUE):
  1. When a player connects, a personal play zone labeled with their name appears on the board (visible to all players)
  2. A shared communal zone is always visible on the board regardless of player count
  3. Existing cards (drag, pass, flip, undo, reset) can be moved to and from both zone types without errors
  4. Reconnecting a player does not duplicate their personal play zone — idempotent creation
  5. The `Pile` type carries `ownerId` and `region` fields; `ClientGameState` carries `myPlayZoneId`
**Plans**: 2 plans
**UI hint**: yes
Plans:
- [x] 14-01-PLAN.md — Extend types (Pile.region/ownerId, ClientGameState.myPlayZoneId), seed communal zone in defaultGameState, idempotent personal zone creation in onConnect, onStart migration, viewFor exposure, and unit tests
- [x] 14-02-PLAN.md — New SpreadZone component, BoardView 4-section restructure with region-filtered piles, opponent spread zones in header, Playwright e2e for cross-player zone visibility

### Phase 15: Multi-Card Set Play
**Goal**: Player can select 1–5 cards from hand and play them as a set into their personal zone or the communal zone in one atomic action
**Depends on**: Phase 14
**Requirements**: PLAY-03
**Success Criteria** (what must be TRUE):
  1. Player can click cards in their hand to toggle selection (1–5 cards); selected cards show a visible selection indicator (ring + 6px lift) per D-08
  2. Dragging a selected card dispatches `PLAY_CARD_SET` with all selected card IDs to the dropped zone (no button — zone is implicit in drop target per D-06)
  3. All selected cards move from hand to the chosen zone simultaneously — no partial moves if one card is invalid
  4. The played cards appear spread (simultaneously visible) in the target zone; all connected players see the update in real time
  5. Pressing Escape, clicking outside, or successful set play clears the selection state (no button to remove; selection-only)
**Plans**: 3 plans
**UI hint**: yes
Plans:
- [x] 15-01-PLAN.md — Add PLAY_CARD_SET to ClientAction union, server handler in party/index.ts, and Vitest unit tests (auth, atomic validation, faceUp, undo)
- [x] 15-02-PLAN.md — Client selection UI: dual sensors, selectedIds state in BoardDragLayer, ring+lift indicator, count badge, Escape/click-outside clearing, and PLAY_CARD_SET dispatch from handleDragEnd
- [x] 15-03-PLAN.md — Playwright e2e: fix stale spread-zone-spread-communal testid, add selection-toggle test, add multi-card set play 2-player sync test

### Phase 16: Developer README
**Goal**: A developer joining the repo for the first time can set up locally, understand the architecture, run all tests, and deploy — using only README.md
**Depends on**: Phase 15
**Requirements**: DEV-03
**Success Criteria** (what must be TRUE):
  1. README documents local setup steps (clone, install, start Vite dev server, start PartyKit dev server)
  2. README documents both test runners: `vitest` for unit tests, `npx playwright test` for e2e
  3. README includes an architecture overview covering the PartyKit server, hand masking, and the client/server message flow
  4. README documents the GitHub Pages + PartyKit Cloud deploy procedure
**Plans**: 1 plan
Plans:
- [ ] 16-01-PLAN.md — Write README.md (intro, Local Setup, Architecture, Tests, then Deploy)

## Backlog

Promote items with `/gsd-review-backlog` when ready to plan.

| Phase | Goal | Plans |
|-------|------|-------|
| 999.3 | Play area card grid for poker-style games | TBD |
| 999.4 | Personal player tableau visible to all | TBD |
| 999.5 | Shuffle visual indicator | TBD |
| 999.14 | Custom card art — new artwork for card fronts and backs | TBD |
| 999.15 | Sticky pile placement choice (remember top/bottom/random to reduce popup frequency) | TBD |
| 999.16 | Turn indicators — show whose turn it is | TBD |
| 999.17 | Chips — poker/betting chip support | TBD |
| 999.18 | Show hand — player can reveal their hand to all players | TBD |
| 999.19 | Drag entire piles — move all cards from one pile to another in a single gesture (e.g. sweep Play Area to Discard Pile) | TBD |
| 999.20 | Password protection for rooms — host sets a password at room creation; PartyKit onBeforeConnect rejects connections without the correct password (passed in URL query string) | TBD |
| 999.21 | Kick players — host can remove a player from the room; PartyKit server closes their connection on a kick message | TBD |
| 999.23 | Sound effects — card play, shuffle, deal sounds; group near art/customization features (see 999.14) | TBD |
| 999.24 | Hand sort shortcuts — cycle through sort modes (original order, by suit, by rank); restore original order until next hand action | TBD |
| 999.26 | Overlapping hand display — cards in hand overlap ~50% like a real held hand; better use of screen real estate | TBD |
| 999.27 | Physical deck gap review — structured analysis of what a real card table offers that Virtual Deck doesn't yet; produces a list of missing/improvable features | TBD |
| 999.28 | npm audit — investigate and resolve 4 vulnerabilities (3 moderate, 1 high) surfaced during Phase 13 UAT (`npm install` on 2026-04-22) | TBD |

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
| 16. Developer README | v1.2 | 0/1 | Not started | - |
