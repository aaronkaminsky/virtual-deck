# Domain Pitfalls — Virtual Deck v1.2

**Domain:** Real-time multiplayer card table — adding Playwright e2e testing + new gameplay zones to existing system
**Researched:** 2026-04-19
**Context:** SUBSEQUENT MILESTONE — pitfalls specific to v1.2 additions, not general app pitfalls (see v1.0 PITFALLS for those).

---

## Critical Pitfalls

---

### Pitfall 1: Playwright Assertions That Race WebSocket State

**What goes wrong:** A test action dispatches a card move (e.g., drag to pile), then immediately asserts the DOM shows the new state. The assertion fires before PartyKit's broadcast round-trip completes — the DOM still shows the pre-move state. Test fails intermittently ("flaky").

**Why it happens:** PartyKit message flow is async: client sends action → server processes → server broadcasts → React re-renders. This round-trip takes 10–200ms on localhost. Playwright's default assertion timeout is generous but `page.locator().textContent()` doesn't retry. `expect(locator).toHaveText()` does.

**Prevention:**
- Always use Playwright's built-in retry-until-timeout assertions: `expect(page.locator(...)).toHaveText(...)`, `expect(page.locator(...)).toBeVisible()`
- Never use `page.locator().textContent()` (returns immediately, no retry) for state that arrives via WebSocket
- Never use fixed `await page.waitForTimeout(500)` waits — they make tests slow and still fail on slow CI
- Use `page.waitForFunction()` as a last resort for complex DOM conditions

**Relevant phase:** DEV-02 (e2e test suite)

---

### Pitfall 2: PartyKit Dev Server Not Ready When Playwright Starts

**What goes wrong:** `playwright.config.ts` sets `webServer.command = "npm run dev"` but PartyKit dev server takes 3–8 seconds to start. Playwright's default `webServer.timeout` (60s) is enough, but the health check URL must be correct. If `webServer.url` points to a path that returns non-200 during startup, Playwright re-polls; if it points to a path that always returns 200 (e.g., the static Vite frontend), Playwright thinks the server is ready before PartyKit is actually listening.

**Prevention:**
- Set `webServer.url` to a PartyKit-specific endpoint, not the Vite frontend. PartyKit dev server exposes `/party/{roomId}` — but a simpler approach is `http://localhost:1999/~partykit/ping` or just wait for the Vite dev server on 5173 and accept that PartyKit may need a short retry in the first test.
- Set `reuseExistingServer: true` so manual `npm run dev` during development doesn't conflict with test runs
- Confirm the actual ready URL by running `npm run dev` and inspecting startup output before writing the config

**Relevant phase:** DEV-02

---

### Pitfall 3: Playwright Browser Contexts Not Truly Isolated for Player Tokens

**What goes wrong:** Two `browserContext` instances are created for two players, but both end up with the same `?player=` token because the token is read from `localStorage` before test setup overrides it, or because both contexts share the same storage state.

**Why it happens:** `browser.newContext()` creates isolated localStorage by default — this is correct. The pitfall is test setup that navigates both contexts to the same URL without injecting distinct `?player=` params. The app's `getOrCreatePlayerId()` reads from `localStorage` first; if neither context has a stored token, both generate new ones (correct). But if tests reuse contexts across test cases (via `test.use()` or fixture misuse), stale localStorage bleeds across tests.

**Prevention:**
- Generate distinct `playerToken` values in `test.beforeEach` and pass them as `?player=` URL params explicitly — don't rely on the app's auto-generation
- Never reuse browser contexts across test cases for multiplayer tests
- Use `context.clearCookies()` + `context.addInitScript()` to explicitly set localStorage if needed

**Relevant phase:** DEV-02, DEV-04

---

### Pitfall 4: Dynamic Pile Creation Race on Reconnect

**What goes wrong:** Personal play zones (PLAY-01) are created in `onConnect` for each joining player. If a player disconnects and reconnects while cards are already in their play zone, `onConnect` runs again and may overwrite the existing pile, losing the cards in it.

**Why it happens:** If `onConnect` calls something like `state.piles.push(createPlayZone(playerToken))` unconditionally, a reconnecting player gets a second pile created, or the existing pile with cards gets replaced with an empty one.

**Prevention:**
- In `onConnect`, check if the play zone pile already exists before creating it: `if (!state.piles.find(p => p.id === playZoneId)) { state.piles.push(...) }`
- This is the same pattern already used for player token registration (idempotent join)

**Relevant phase:** PLAY-01

---

### Pitfall 5: PLAY_CARD_SET Partial Move on Validation Failure

**What goes wrong:** Server handler for `PLAY_CARD_SET` moves cards one by one from hand to target zone. If validation fails mid-loop (e.g., one card ID doesn't exist in the sender's hand), some cards have already moved. The state is now inconsistent — partially played set.

**Why it happens:** Sequential mutation without upfront validation.

**Prevention:**
- Validate all card IDs against sender's hand before moving any cards
- Move all cards in a single atomic block after validation passes
- Pattern: `validate → compute new state → apply new state` (never mutate during validation)

**Relevant phase:** PLAY-03

---

### Pitfall 6: Trying to Implement dnd-kit Multi-Drag

**What goes wrong:** Developer attempts to implement drag-based multi-card selection using dnd-kit. Spends multiple hours on custom `DragOverlay`, fighting `useDraggable` + `useDroppable` to make multiple "active" draggables work simultaneously. The result is brittle, hard to maintain, and conflicts with the existing single-card drag flow.

**Why it happens:** dnd-kit does not natively support multi-drag. Community workarounds exist but are ~200 LOC of fragile overrides.

**Prevention:**
- v1.2 implements multi-card play via select-then-button UI only. No drag multi-select.
- The "Play" button appears when 1+ cards are selected in hand; clicking it dispatches `PLAY_CARD_SET`
- Single-card drag to zones continues working via existing `MOVE_CARD` — unmodified
- Drag-based multi-select is explicitly deferred to v1.3+ if ever needed

**Relevant phase:** PLAY-03

---

### Pitfall 7: Conflating Playwright MCP with the e2e Test Suite

**What goes wrong:** Developer writes Playwright MCP usage steps into committed test files (`playwright.spec.ts`) expecting them to run in CI. MCP tools (`browser_navigate`, `browser_click`) are Claude's interactive tools — they don't exist in the Playwright test runner.

**Why it happens:** Both use "Playwright" in their names and both involve a browser. They are architecturally separate.

**Prevention:**
- MCP (`@playwright/mcp`): registered in `.mcp.json`, used by Claude Code interactively during development. Not in `package.json`. Not in CI.
- e2e suite (`@playwright/test`): installed as `devDependency`, committed test files, run via `npx playwright test`. In CI.
- Keep these completely separate. MCP config lives in `.mcp.json`. Test suite lives in `e2e/` or `tests/e2e/`.

**Relevant phase:** DEV-01, DEV-02

---

### Pitfall 8: Over-Scoping the Test Model Fix

**What goes wrong:** The test setup fix (DEV-04) starts as "fix the local/remote distinction" and expands into a full unit test rewrite — new mock helpers, restructured test files, updated assertions for every existing test. The scope doubles.

**Why it happens:** Once inside the test files, the temptation to clean everything up is high. But the production code is unchanged and the existing tests are passing — they just don't test the "what each player sees" layer.

**Prevention:**
- DEV-04 scope is precisely: extend `makeMockRoom()` to return populated `getConnections()` + add targeted tests for `viewFor` masking (DEAL, PASS_CARD scenarios)
- Do not restructure existing passing tests unless they fail
- Timebox to < 1 day. If it takes longer, the scope has drifted.

**Relevant phase:** DEV-04

---

## Summary Table

| # | Pitfall | Phase | Severity | Prevention |
|---|---------|-------|----------|-----------|
| 1 | Playwright assertions race WebSocket | DEV-02 | High | Use retry-until-timeout assertions only |
| 2 | PartyKit not ready at test start | DEV-02 | Medium | Correct `webServer.url`; `reuseExistingServer: true` |
| 3 | Browser contexts share player tokens | DEV-02, DEV-04 | Medium | Explicit `?player=` params in `beforeEach` |
| 4 | Dynamic pile creation on reconnect | PLAY-01 | High | Idempotent pile creation check in `onConnect` |
| 5 | PLAY_CARD_SET partial move | PLAY-03 | High | Validate all cards before moving any |
| 6 | dnd-kit multi-drag attempt | PLAY-03 | Medium | Use select-then-button; no drag multi-select in v1.2 |
| 7 | MCP tools in committed test files | DEV-01/02 | Low | Keep MCP and test suite strictly separate |
| 8 | Test model fix scope creep | DEV-04 | Low | Timebox; extend mocks only, don't rewrite |
