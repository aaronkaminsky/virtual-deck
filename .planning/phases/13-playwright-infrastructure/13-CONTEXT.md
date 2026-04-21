# Phase 13: Playwright Infrastructure - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Playwright, configure `.mcp.json` with `@playwright/mcp` as a project-scoped MCP server, write a committed e2e test suite covering 5 core 2-player scenarios, and add npm scripts for running e2e tests.

New capabilities (gameplay zones, UI changes) are out of scope — this phase is dev tooling only.

</domain>

<decisions>
## Implementation Decisions

### Dev Server Management

- **D-01:** `playwright.config.ts` uses a `webServer` array to auto-start both Vite (`npm run dev:client`, port 5173) and PartyKit (`npx partykit dev`, port 1999) when `npx playwright test` runs. This is the only approach that satisfies SC #1 ("no manual setup beyond npm install").
- **D-02:** Both webServer entries use `reuseExistingServer: !process.env.CI`. Locally, if Vite or PartyKit are already running on their ports, Playwright skips startup — no port conflicts. In CI (`CI=true`), always starts fresh.

### 2-Player Fixture

- **D-03:** Each test gets a fresh unique room via a `twoPlayerRoom` Playwright fixture. The fixture generates a unique room code with `nanoid(8)`, opens two separate browser contexts (one per player), navigates both to `/?room={roomCode}&name=PlayerN`, yields `{ p1, p2, roomCode }` to the test, then closes both contexts on teardown. No shared state between tests.
- **D-04:** Fixture lives in `playwright/fixtures.ts`. Test files import the extended `test` from this fixture file, not from `@playwright/test` directly.

### npm Script Integration

- **D-05:** `npm test` stays as `vitest run` — unit tests only, fast, unchanged. Two new scripts are added:
  - `"test:e2e": "playwright test"` — run the e2e suite
  - `"test:e2e:ui": "playwright test --ui"` — interactive Playwright UI mode for debugging

### Locked Constraints (from ROADMAP success criteria)

- **D-06:** MCP package is `@playwright/mcp` — named explicitly in SC #3. No other package.
- **D-07:** Only Chromium browser — SC #1 specifies `npx playwright install chromium`. Do not add Firefox or WebKit.
- **D-08:** All assertions use retry-based matchers (e.g., `expect(locator).toHaveText()`, `expect(locator).toBeVisible()`). No `waitForTimeout()` and no `.textContent()` in committed test files — SC #4.

### Test Scenarios

- **D-09:** The e2e suite must cover all 5 scenarios from SC #2:
  1. 2-player state sync (action by P1 visible to P2 in real time)
  2. Deal cards (cards distributed from pile to both hands)
  3. Pass card between players (P1 hand → P2 hand via pass action)
  4. Reset table (all cards back to draw pile for both players)
  5. Hand privacy (P2 cannot see P1's hand card values — `opponentHandCounts` not card IDs)

### Claude's Discretion

- File organization within `playwright/` (e.g., test file naming, whether to split into one file or multiple)
- playwright.config.ts reporter choice (list, dot, etc.)
- Specific assertion selectors and UI interaction patterns (use ARIA roles and data-testid where needed)
- Whether to add `@playwright/test` to devDependencies or rely on `npx playwright test` (prefer devDependencies for consistent versioning)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §"Phase 13: Playwright Infrastructure" — Goal, success criteria SC #1–4, full scenario list
- `.planning/REQUIREMENTS.md` §DEV-01, §DEV-02 — Acceptance criteria for MCP config and e2e suite

### Existing Test Patterns
- `tests/helpers.ts` — Shared mock helpers for unit tests (vitest); e2e fixture in `playwright/fixtures.ts` follows a parallel pattern but for real browser contexts
- `tests/broadcastMasking.test.ts` — Reference for what the hand-privacy scenario verifies at the unit level (use as behavioral spec for the e2e hand privacy test)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nanoid` — already in `dependencies`; use for generating unique room codes in the fixture
- `npm run dev:client` — existing Vite dev server script (port 5173); reference this in webServer config
- `partykit dev` — PartyKit dev server (port 1999); reference via `npx partykit dev` in webServer config

### Established Patterns
- URL-based room routing: `?room={code}` query param is how rooms are joined (see PROJECT.md Key Decisions)
- Player name via URL: `?name={displayName}` is passed on connection (Phase 9 pattern — Lobby sets this before WebSocket connect)
- Unit tests in `tests/` use vitest; e2e tests go in a new `playwright/` directory at project root

### Integration Points
- The lobby flow requires a name before joining — the fixture must include `&name=PlayerN` in the navigation URL to bypass the name gate and land directly on the game board
- PartyKit room state is in-memory per room code — unique room code per test guarantees clean state

</code_context>

<specifics>
## Specific Ideas

- The `twoPlayerRoom` fixture shape: `{ p1: Page, p2: Page, roomCode: string }` — both pages already past the lobby on fixture yield
- playwright.config.ts should live at project root (same level as `vite.config.ts`)
- Test files live in `playwright/` subdirectory at project root

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-playwright-infrastructure*
*Context gathered: 2026-04-20*
