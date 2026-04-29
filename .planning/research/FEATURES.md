# Feature Landscape — Virtual Deck v1.2

**Domain:** Real-time multiplayer card table — dev infrastructure + gameplay zone depth
**Researched:** 2026-04-19
**Context:** SUBSEQUENT MILESTONE. v1.0 and v1.1 shipped. This file covers v1.2 feature areas only.

---

## Feature Categories

v1.2 has two distinct categories that should be tracked separately:

| Category | Features | Nature |
|----------|----------|--------|
| Dev Infrastructure | Playwright MCP, e2e test suite, README, test model fix | Tooling — no user-visible change |
| Gameplay Zones | Personal play area, shared communal zone, multi-card play set | User-visible — new game surface |

---

## Category A: Dev Infrastructure

### A1 — Playwright MCP Server (DEV-01)

**What it is:** `@playwright/mcp` is Microsoft's official MCP server that gives Claude Code direct browser control through the accessibility tree. Claude can navigate to a running app, click, type, and observe state — no screenshot vision required.

**How it works:**
- Registered per-project via `claude mcp add playwright npx @playwright/mcp@latest --scope project`
- Persists as `.mcp.json` in the project root (designed to be committed to version control)
- Claude must be explicitly told "use Playwright MCP" in the first message of a session, or it defaults to running Playwright through bash commands
- MCP tools include: `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_wait_for_element`
- Operates on the accessibility tree, not screenshots — faster and more token-efficient

**Table stakes for this feature:**

| Behavior | Why Required | Notes |
|----------|--------------|-------|
| `.mcp.json` committed to repo | All developers and Claude sessions get identical tooling without manual setup | Scope = project, not user-global |
| Works with existing `npm run dev` | MCP session navigates `localhost:1999` (partykit dev port) | No special test server needed |
| Claude can open two tabs in same session | Needed for observing two-player state | Two pages in same browser context share nothing in PartyKit — each has distinct player token |

**Anti-features:**
- Do NOT configure Playwright MCP as a global user-level MCP (`claude mcp add ... --scope user`). It must be project-scoped so the config travels with the repo.
- Do NOT write MCP usage into committed tests. MCP is for Claude's exploratory dev use, not automated CI coverage.

**Complexity:** Low — pure config file, no code changes.

**Dependency:** Requires `npm run dev` to be running (partykit dev server).

---

### A2 — Committed Playwright e2e Test Suite (DEV-02)

**What it is:** Playwright tests checked into the repo that exercise real browser + real PartyKit server interactions. These are repeatable automated tests (distinct from MCP-driven exploration).

**Two-player test architecture (the correct pattern):**

The fundamental pattern for this codebase is: one `browser.newContext()` per player. Each context gets its own cookies/localStorage, simulating a distinct user.

```
context1 (Player 1 — "local") → page1 → connects to PartyKit room with ?player=token1
context2 (Player 2 — "remote") → page2 → connects to same PartyKit room with ?player=token2
```

Both pages connect to the same real PartyKit room via the dev server. Actions on page1 broadcast to page2 via PartyKit's broadcastState().

**What the test infrastructure needs:**

| Requirement | Why | Implementation |
|-------------|-----|----------------|
| `webServer` in `playwright.config.ts` | Starts `partykit dev` before tests run | `{ command: "npm run dev", url: "http://localhost:1999/", reuseExistingServer: true }` |
| Unique room code per test | Prevents test pollution across parallel runs | Generate with `nanoid()` in test setup |
| Wait for WebSocket state — no fixed `sleep()` | PartyKit broadcast is async; DOM must reflect server state before asserting | `page.waitForSelector`, `page.waitForFunction` with retry |
| Per-test `?player=` tokens | Each test creates fresh player identities | Generate unique tokens in `test.beforeEach` |

**Table stakes tests to cover:**

| Scenario | What it validates |
|----------|------------------|
| Player 1 drags card from hand to pile; Player 2 sees pile update | Core real-time sync |
| Player 1 deals cards; both players receive correct hand counts | Deal + hand masking |
| Player 1 passes card to Player 2; Player 2's hand count increases | PASS_CARD action |
| Reset table; all piles restored | RESET_TABLE action |
| Player 2 cannot see Player 1's card faces | Hand privacy (opponentHandCounts vs myHand) |

**Differentiating tests (nice-to-have):**

| Scenario | Value |
|----------|-------|
| Player disconnects and reconnects; hand preserved | Reconnect correctness |
| Undo after move; both players see pre-move state | Undo sync |
| 4-player room cap; 5th player rejected | Room full error |

**Anti-features:**
- Do NOT mock the WebSocket. The value of e2e tests for this codebase is testing real PartyKit message flow. Mocking WebSockets would reduce these to unit tests. Unit tests for server logic already exist in `tests/*.test.ts` (vitest).
- Do NOT use `page.routeWebSocket()` for intercepting production messages. Use it only for testing error paths (e.g., simulating a server that refuses connection).
- Do NOT write fragile `setTimeout`-based waits. Every state assertion must use Playwright's built-in retry-until-timeout locators.

**Complexity:** Medium. The multi-context setup and WebSocket timing are non-trivial. The `partykit dev` webServer integration may require a startup health-check URL (PartyKit dev server has `/~partykit/ping` or similar — needs verification).

**Dependency:** Requires Playwright installed (`npm install -D @playwright/test`), separate from MCP package. The existing `vitest` test suite (`tests/*.test.ts`) covers server logic unit tests and stays; Playwright is additive for browser e2e coverage.

---

### A3 — Developer README (DEV-03)

**What it is:** A committed `README.md` (or `docs/` directory) with enough content for a new developer to clone, run, and deploy the project without asking the original author.

**Table stakes content:**

| Section | Why Required |
|---------|--------------|
| Architecture overview | ~2,200 LOC across 3 directories — not obvious without a map |
| Local dev setup (`npm install`, `npm run dev`) | Without this, dev server start is trial-and-error |
| Running tests | `npm test` for vitest; `npx playwright test` for e2e — two different runners |
| Deploy instructions (GitHub Pages + PartyKit) | `npm run build` + `partykit deploy` — each has separate configuration |
| Environment variables / config | Any values needed in `.env` or `partykit.json` |
| Key decisions log pointer | Point to PROJECT.md Key Decisions table |

**Anti-features:**
- Do NOT write a changelog or feature list — PROJECT.md already has requirements and evolution history.
- Do NOT duplicate the Key Decisions content — reference PROJECT.md.

**Complexity:** Low. Pure documentation.

---

### A4 — Test Setup Fix: Local vs Remote Player Model (DEV-04)

**What it is:** The current unit tests in `tests/*.test.ts` instantiate a `GameRoom` directly and call `onMessage()` on a mock connection. The mock connection's `state` is set to `{ playerToken: id }` so `getPlayerToken()` works. However, the tests do not distinguish between a "local" player (the one sending the action) and a "remote" player (a connected spectator receiving broadcasts).

**The bug:** `makeMockRoom()` returns a `getConnections` that always yields an empty iterator (`[][Symbol.iterator]()`). This means `broadcastState()` sends nothing during tests. Tests currently assert only on `gameState` mutations, never on what each connection's `.send()` received. This is fine for server-logic unit tests but means the "what each player sees" layer is untested.

**The fix:** Tests that care about per-player view (hand masking, opponentHandCounts) need to:
1. Populate `mockRoom.getConnections()` to return the actual connection mocks
2. Assert on `conn.send.mock.calls` to verify each player received the correct `ClientGameState`

**What "local vs remote" means in this context:**
- Local player: The connection that sent the action (has `state.playerToken = senderToken`)
- Remote player: Other connections in the room (each has their own `state.playerToken`)
- `viewFor(state, playerToken)` produces a different `ClientGameState` for each — the sender sees their own hand in `myHand`; every other connection sees it masked in `opponentHandCounts`

**Table stakes for the fix:**

| Test scenario | What to assert |
|---------------|---------------|
| After DEAL_CARDS, local player's ClientGameState has correct myHand | viewFor masking works for sender |
| After DEAL_CARDS, remote player's ClientGameState has opponentHandCounts (not myHand) | viewFor masking works for recipients |
| After PASS_CARD, recipient's ClientGameState shows card in myHand | Pass card shows up for recipient |

**Complexity:** Low-Medium. The mock helpers need extension, not architectural changes. About 10–20 tests need updated mock setup.

**Dependency:** No code changes to production code. Tests only.

---

## Category B: Gameplay Zones

### B1 — Personal Play Area Zone (PLAY-01)

**What it is:** Each player has a dedicated zone below their hand, visible face-up to all players. This is where a player places cards they have "played" in front of them — equivalent to the table area in front of a player's seat in a physical game.

**How similar products do it (Tabletop Simulator, playingcards.io):**
- Each player has a "play area" that spatially belongs to them — positioned near their hand zone
- Cards placed there are face-up and public by default
- Any player can technically pick up a card from another player's play area (no enforcement — this is a sandbox)
- The zone shows the player's name as a label

**Data model implications for this codebase:**

The existing `Pile` type already supports this use case. The cleanest approach is to create one pile per player with `id: "play-{playerToken}"`, `faceUp: true`, added when the player joins.

Current `GameState.piles` is a flat array. Personal play zones would add N piles dynamically (N = number of players). The existing `defaultGameState` creates 3 static piles. This must become dynamic.

Alternatives:
1. Add a `playZones: Record<string, Pile>` to GameState (keyed by player token) — cleaner semantically, requires BoardView changes
2. Reuse `piles[]` with naming convention `"play-{playerId}"` — minimal schema change, harder to query

Option 1 is cleaner long-term. Option 2 ships faster and lets existing `MOVE_CARD` action work unchanged (since it already handles any pile by ID).

**Table stakes behavior:**

| Behavior | Notes |
|----------|-------|
| Zone exists for each connected player | Created when player joins; persists for reconnect |
| Cards placed face-up by default | `pile.faceUp = true` |
| Zone labeled with player's display name | Needs display name at zone creation time |
| Drag from hand to own play zone works | Uses existing MOVE_CARD with toZone="pile", toId="play-{token}" |
| Any player can drag from any play zone to anywhere | No ownership enforcement — sandbox |
| Zone visible in all players' BoardView | Needs layout space in BoardView |

**Anti-features:**
- Do NOT enforce "can only play to your own zone" — breaks the sandbox promise.
- Do NOT create separate React component for personal play area if PileZone already works — reuse PileZone with a `isPersonalZone` prop for visual differentiation.

**Layout concern:** BoardView currently uses a single row of `PileZone` components for table piles, with `HandZone` at the bottom and `OpponentHand` at the top. Adding per-player play areas requires a layout redesign. Personal zones logically belong between the opponent hands area and the shared table piles.

**Complexity:** Medium. Data model change (dynamic pile creation) + BoardView layout redesign.

**Dependency:** Existing Pile infrastructure, MOVE_CARD handler (unchanged), PileZone component (reused).

---

### B2 — Shared Communal Zone (PLAY-02)

**What it is:** One shared zone on the table that any player can place cards into. Unlike the draw and discard piles (which are vertical stacks with position semantics), this is a flat face-up zone where cards are spread and visible — equivalent to "the center of the table."

**How similar products handle it:**

In Tabletop Simulator and playingcards.io, a "shared zone" is just another pile/zone — it has no special mechanics, just placement. It's visually distinguished from private piles but structurally identical in the data model.

**Data model:** A single static `Pile` with `id: "communal"`, `name: "Table"` (or similar), `faceUp: true`. This is nearly identical to the existing `"discard"` pile — the distinction is semantic and visual (layout position, appearance).

Actually, the existing `"play"` pile (id: `"play"`, name: `"Play Area"`) in `defaultGameState` already serves this purpose. The question is whether it should be renamed or if the personal zones (PLAY-01) co-opt the concept.

**Recommendation:** Rename the existing `"play"` pile to `"communal"` (or similar) to cleanly separate it from personal play areas. This is a one-line change to `defaultGameState`.

**Table stakes behavior:**

| Behavior | Notes |
|----------|-------|
| Visible to all players face-up | `faceUp: true` |
| Any player can drag cards to/from it | No ownership — existing MOVE_CARD already handles any pile |
| Visually distinct from draw/discard | Different color, label, or position in layout |
| Undo works | Already handled by UNDO_MOVE |

**Anti-features:**
- Do NOT add any "only the person who played it can move it" rule.
- Do NOT create a new data type for this — reuse `Pile`.

**Complexity:** Low. Mostly a renaming + layout positioning decision. No new server logic.

**Dependency:** PLAY-01 personal zones must be decided first (they share the concept of "play area").

---

### B3 — Played Card Sets: Multi-Card Selection and Play (PLAY-03)

**What it is:** A player selects 1–5 cards from their hand and plays them as a group into either their personal play area (PLAY-01) or the communal zone (PLAY-02). In 13s-style games, a "play" is a set of 1–5 cards committed simultaneously (single, pair, triple, four-of-a-kind, or a 5-card combination like a straight or full house).

**Why this isn't just dragging one card at a time:**
- A set must land as a group — spatial grouping signals "these cards go together"
- In the card game context, playing a set is an atomic action: either all cards move or none do
- Players need to be able to say "I played these 5 cards together" — visual grouping conveys that to opponents

**UI mechanics (what users expect):**

| Interaction | Expected behavior |
|-------------|-------------------|
| Click/tap a card in hand | Toggles selected state (highlighted border) |
| Click another card | Adds to selection (multi-select, not replace) |
| Click selected card again | Deselects it |
| Click Play (or drag selected cards) | All selected cards move to target zone as a set |
| Escape or click empty area | Clears selection |
| Max 5 cards can be selected | Error or visual stop at 6th card |

**dnd-kit multi-drag pattern:**

dnd-kit does not have built-in multi-drag. The established pattern (MEDIUM confidence, from dnd-kit GitHub issues #120 and discussion #1313):
1. Maintain `selectedCardIds: Set<string>` in local UI state (zustand is appropriate here)
2. Only one card is the "active" draggable (`useDraggable` per card)
3. On `onDragEnd`, if the active card is in the selection set, dispatch a new action `PLAY_CARD_SET` with all selected card IDs, not just the one dragged
4. Render a custom `DragOverlay` that shows all selected cards stacked/fanned during drag

Alternatively, for the simpler "select then click Play button" flow (no drag), no dnd-kit changes are needed — just a Play button that dispatches `PLAY_CARD_SET`.

**Recommended approach for v1.2:** Start with select-then-button (no drag multi-select). Drag-based multi-select is a differentiator, not table stakes. The select-then-button approach avoids dnd-kit complexity and is how many digital card games implement plays (e.g., click cards to stage them, hit "Play").

**New server action needed:**

```typescript
{ type: "PLAY_CARD_SET"; cardIds: string[]; toZoneId: string }
```

Server logic: validate all cards are in sender's hand, atomically move all to target pile. Atomicity is important — partial moves leave state inconsistent.

**Table stakes behavior:**

| Behavior | Notes |
|----------|-------|
| Select 1–5 cards in hand | Toggle selection on click |
| Visual selection state (highlight) | Distinct color/border on selected cards |
| "Play" action button enabled when 1+ cards selected | Target zone must be specified (or default to communal) |
| All selected cards move atomically | Server: remove all from hand, add all to pile in one state update |
| Selection cleared after play | Reset `selectedCardIds` to empty |
| Undo works for a played set | One UNDO_MOVE snapshot rolls back all cards |
| Other players see the cards appear together | Normal broadcastState — ordering within pile handles grouping |

**Differentiating behavior (nice-to-have, not v1.2):**

| Feature | Notes |
|---------|-------|
| Drag multi-selected cards as a fan | Complex dnd-kit customization |
| Visual grouping / set separator in play zone | Distinguishes one player's play from another's in the communal zone |
| Set history / log | Shows "Player 1 played 3 cards" in action log |

**Anti-features:**
- Do NOT validate that the card set is a legal combination (pair, straight, etc.) — no rule enforcement.
- Do NOT implement drag-based multi-select as part of initial implementation — too complex for the gain, and the project explicitly avoids rule enforcement anyway.
- Do NOT conflate this with the existing `REORDER_HAND` action — that's a different concept.

**Complexity:** Medium. New `PLAY_CARD_SET` server action + selection UI state in client + integration with PLAY-01/PLAY-02 zones. The selection state is client-only until Play is triggered, which keeps it clean.

**Dependencies:**
- Requires PLAY-01 or PLAY-02 to exist as target zones
- Server action is new but follows existing MOVE_CARD pattern
- Client selection state fits naturally in zustand (already a dependency)

---

## Feature Dependencies (v1.2)

```
DEV-01 (Playwright MCP) → standalone (config only)
DEV-02 (e2e test suite) → DEV-01 for exploratory use; DEV-04 fix should precede to avoid writing tests with the wrong model
DEV-03 (README) → standalone
DEV-04 (test model fix) → standalone, but pairs with DEV-02
PLAY-01 (personal play area) → requires dynamic pile creation (data model change)
PLAY-02 (communal zone) → depends on PLAY-01 decision (naming conflict with existing "play" pile)
PLAY-03 (multi-card play) → requires PLAY-01 and/or PLAY-02 as target zones
```

Recommended sequencing:
1. DEV-04 → DEV-02 → DEV-01 → DEV-03 (fix tests before writing more; MCP and README are parallel)
2. PLAY-02 → PLAY-01 → PLAY-03 (rename communal zone first; add personal zones; then multi-select play last)

---

## MVP Recommendation (v1.2)

**Must have (all 7 are already committed in PROJECT.md):**
1. DEV-01: Playwright MCP `.mcp.json` committed
2. DEV-02: Playwright e2e suite covering 2-player sync, deal, pass, reset
3. DEV-03: README with setup, architecture, deploy
4. DEV-04: Test model fix for local/remote distinction
5. PLAY-01: Personal play area per player
6. PLAY-02: Shared communal zone (may be trivial rename of existing pile)
7. PLAY-03: Multi-card selection and play (select-then-button, not drag multi-select)

**Defer to v1.3+:**
- Drag-based multi-select (dnd-kit custom overlay)
- Visual set grouping in play zone (card set separator rendering)
- Action log showing "Player X played N cards"

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Playwright MCP setup/config | HIGH | Official `@playwright/mcp` package, well-documented, `.mcp.json` format confirmed |
| e2e two-context pattern | HIGH | Standard Playwright pattern, documented in official docs |
| WebSocket test strategy (no mocking) | MEDIUM | Best-practice recommendation; actual PartyKit dev server startup behavior in webServer config needs testing |
| Test model fix scope | HIGH | Root cause is clear from code inspection |
| Personal play zone data model | MEDIUM | Recommending Option 2 (piles with naming convention) for speed; Option 1 (separate map) is cleaner but requires more refactoring |
| Communal zone | HIGH | Trivially mapped to existing pile infrastructure |
| Multi-card play (select-then-button) | HIGH | Standard card game UX pattern; server-side atomicity via new action type |
| dnd-kit multi-drag | LOW | Confirmed as not natively supported; community patterns exist but are custom implementations |

---

## Sources

- [Using Playwright MCP with Claude Code — Simon Willison](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
- [Playwright MCP official docs](https://playwright.dev/docs/getting-started-mcp)
- [microsoft/playwright-mcp GitHub](https://github.com/microsoft/playwright-mcp)
- [dnd-kit multi-select discussion #1313](https://github.com/clauderic/dnd-kit/discussions/1313)
- [dnd-kit multi-select issue #120](https://github.com/clauderic/dnd-kit/issues/120)
- [Playwright WebSocket testing — dzone](https://dzone.com/articles/playwright-for-real-time-applications-testing-webs)
- [Playwright browser contexts isolation](https://playwright.dev/docs/browser-contexts)
- [Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp)
- Existing codebase: `party/index.ts`, `src/shared/types.ts`, `tests/*.test.ts` (direct inspection)
