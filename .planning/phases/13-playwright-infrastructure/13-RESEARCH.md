# Phase 13: Playwright Infrastructure - Research

**Researched:** 2026-04-20
**Domain:** Playwright e2e testing, @playwright/mcp MCP server, 2-player browser fixture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `playwright.config.ts` uses a `webServer` array to auto-start both Vite (`npm run dev:client`, port 5173) and PartyKit (`npx partykit dev`, port 1999).
- **D-02:** Both webServer entries use `reuseExistingServer: !process.env.CI`.
- **D-03:** Each test gets a fresh unique room via a `twoPlayerRoom` Playwright fixture that generates a unique nanoid(8) room code, opens two browser contexts, navigates both, yields `{ p1, p2, roomCode }`, then cleans up.
- **D-04:** Fixture lives in `playwright/fixtures.ts`. Test files import extended `test` from there, not from `@playwright/test`.
- **D-05:** `npm test` stays as `vitest run`. Two new scripts added: `test:e2e` and `test:e2e:ui`.
- **D-06:** MCP package is `@playwright/mcp` only.
- **D-07:** Only Chromium browser. Do not add Firefox or WebKit.
- **D-08:** All assertions use retry-based matchers. No `waitForTimeout()`. No `.textContent()` in committed test files.
- **D-09:** Suite must cover all 5 scenarios: state sync, deal cards, pass card, reset table, hand privacy.

### Claude's Discretion

- File organization within `playwright/` (naming, one file vs multiple)
- playwright.config.ts reporter choice
- Specific selectors and data-testid attributes
- Whether `@playwright/test` goes in devDependencies (prefer yes)

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEV-01 | `.mcp.json` configured with `@playwright/mcp` as project-scoped MCP server | Package verified at npm (v0.0.70); correct `.mcp.json` schema documented below |
| DEV-02 | Committed e2e test suite covers 5 core 2-player scenarios with retry-based assertions | All 5 scenarios mapped to component behavior; selectors identified; lobby bypass pattern documented |
</phase_requirements>

---

## Summary

This phase installs Playwright, wires up `playwright.config.ts` with dual `webServer` entries (Vite + PartyKit), creates a `twoPlayerRoom` fixture, writes 5 e2e scenario tests, and adds `.mcp.json` for the `@playwright/mcp` MCP server.

The primary complication is lobby bypass: the `?name=` URL parameter is NOT read by `App.tsx` to auto-skip the lobby. The React app always renders `LobbyPanel` first, requiring a user to type a name and click "Join Game" before the board appears. The fixture must fill the name input and click the button for each player context. There is no existing URL shortcut to bypass this gate.

The second complication is that no `data-testid` attributes exist anywhere in the current component tree. Tests must use ARIA roles (buttons by accessible name, inputs by label/placeholder) or add `data-testid` attributes where ARIA is insufficient. The planner must include tasks to add `data-testid` on the hand zone, opponent hand area, and pile zones so e2e tests can target them reliably.

**Primary recommendation:** Add `data-testid` attributes to HandZone, OpponentHand, PileZone, and the deal/reset control triggers. Use ARIA roles for buttons. Use placeholder text for the name input. Fixture must interact with LobbyPanel (fill name, click Join) not just navigate.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| e2e test runner / process management | Dev tooling | — | Playwright starts Vite + PartyKit as subprocesses; not deployed |
| MCP server for AI-driven test authoring | Dev tooling | — | `@playwright/mcp` exposes browser automation to Claude via `.mcp.json` |
| Lobby gate (name entry) | Browser / Client | — | `App.tsx` + `LobbyPanel.tsx` — React state, no server involvement until Join clicked |
| Game board (post-join) | Browser / Client | Frontend interaction with PartyKit | `BoardDragLayer` / `BoardView` renders after `joinState` is set |
| Real-time state sync | API / Backend (PartyKit) | Browser / Client | PartyKit sends `STATE_UPDATE` messages; React applies them |
| Test fixture room isolation | Dev tooling | API / Backend | Unique room code per test ensures in-memory PartyKit state is clean |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.59.1 | Test runner, fixtures, assertions | [VERIFIED: npm registry] Playwright's own test harness; provides `expect(locator).toHaveText()` retry matchers, `BrowserContext`, `webServer` config |
| @playwright/mcp | 0.0.70 | MCP server for AI browser automation | [VERIFIED: npm registry] Named explicitly in SC #3; exposes Playwright browser control over MCP protocol |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.7 | Room code generation in fixture | Already in `dependencies`; use `nanoid(8)` for unique room codes |

**Installation:**
```bash
npm install --save-dev @playwright/test @playwright/mcp
npx playwright install chromium
```

**Version verification:** [VERIFIED: npm registry 2026-04-20]
- `@playwright/test`: 1.59.1 (latest stable)
- `@playwright/mcp`: 0.0.70 (latest)

---

## Architecture Patterns

### System Architecture Diagram

```
npx playwright test
        |
        v
playwright.config.ts (webServer array)
   |                        |
   v                        v
npm run dev:client    npx partykit dev
(Vite, port 5173)     (PartyKit, port 1999)
        |                        |
        v                        v
   React App                 GameRoom
   /?room=X                  (in-memory)
        |                        ^
        |   WebSocket (partysocket)
        +------------------------+
        |
        v
twoPlayerRoom fixture (playwright/fixtures.ts)
   - BrowserContext p1  -->  LobbyPanel --> fill name --> Join Game --> BoardView
   - BrowserContext p2  -->  LobbyPanel --> fill name --> Join Game --> BoardView
        |
        v
Test assertions (retry-based locators)
```

### Recommended Project Structure

```
playwright/
├── fixtures.ts       # twoPlayerRoom fixture; exports extended test + expect
└── game.spec.ts      # 5 scenario tests (or split: sync.spec.ts, deal.spec.ts, etc.)
playwright.config.ts  # at project root
.mcp.json             # at project root
```

### Pattern 1: webServer Array for Dual Dev Server

**What:** Playwright's `webServer` config accepts an array. Each entry specifies a command, port, and `reuseExistingServer` flag.

**When to use:** When the app requires two separate dev processes (frontend + backend).

```typescript
// playwright.config.ts
// Source: https://playwright.dev/docs/api/class-testconfig#test-config-web-server
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: [
    {
      command: 'npm run dev:client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx partykit dev',
      url: 'http://127.0.0.1:1999/parties/main/health-check',
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
  testDir: './playwright',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

**PartyKit health-check URL:** [ASSUMED] PartyKit dev server on port 1999 does not expose a documented `/health` endpoint. The `url` field in Playwright's webServer config is used to poll until the server is ready. Use `http://127.0.0.1:1999/parties/main/health-check` — PartyKit routes all party requests through `/parties/{partyName}/{roomId}`. Alternatively, use `port: 1999` (Playwright polls the port directly, no HTTP path needed) to avoid the health-check URL ambiguity. The `port` field is simpler and verified to work.

**Corrected PartyKit entry (preferred):**
```typescript
{
  command: 'npx partykit dev',
  port: 1999,
  reuseExistingServer: !process.env.CI,
},
```

### Pattern 2: twoPlayerRoom Fixture

**What:** Custom Playwright fixture that creates two isolated browser contexts for the same room, navigates each through the LobbyPanel, and yields both pages to the test.

**Critical finding:** The `?name=` URL param does NOT bypass the LobbyPanel. `App.tsx` reads only `?room=` from the URL. The fixture must interact with the UI to join.

```typescript
// playwright/fixtures.ts
// Source: https://playwright.dev/docs/test-fixtures
import { test as base, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinGame(page: Page, roomCode: string, playerName: string) {
  await page.goto(`/?room=${roomCode}`);
  // LobbyPanel renders; fill the name input (placeholder="Your name") and click Join
  await page.getByPlaceholder('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join Game' }).click();
  // Wait until the board is visible (HandZone is rendered)
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

type TwoPlayerFixture = { p1: Page; p2: Page; roomCode: string };

export const test = base.extend<{ twoPlayerRoom: TwoPlayerFixture }>({
  twoPlayerRoom: async ({ browser }, use) => {
    const roomCode = nanoid(8);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');

    await use({ p1, p2, roomCode });

    await ctx1.close();
    await ctx2.close();
  },
});

export { expect };
```

### Pattern 3: .mcp.json for @playwright/mcp

**What:** Project-scoped MCP server configuration. `.mcp.json` at project root is read by Claude Code.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@0.0.70"],
      "type": "stdio"
    }
  }
}
```

**Field notes:**
- `command`: `"npx"` — runs the package without a global install [VERIFIED: @playwright/mcp bin field is `playwright-mcp`]
- `args`: `["@playwright/mcp@0.0.70"]` — pin to verified version to avoid drift
- `type`: `"stdio"` — MCP transport; `@playwright/mcp` uses stdio by default [ASSUMED based on standard MCP server conventions; verify with `npx @playwright/mcp --help` if needed]

### Pattern 4: Retry-Based Assertions (D-08)

**What:** All assertions must use Playwright's built-in retry matchers — no `waitForTimeout`, no `.textContent()`.

```typescript
// Correct — retry-based
await expect(page.getByTestId('hand-zone')).toBeVisible();
await expect(page.getByTestId('draw-pile')).toContainText('52');
await expect(page.getByTestId('opponent-hand')).toBeVisible();

// Forbidden (D-08)
await page.waitForTimeout(2000);
const text = await page.locator('.count').textContent(); // no
```

### Anti-Patterns to Avoid

- **Using `?name=` URL to bypass lobby:** The `name` param is forwarded to PartyKit via WebSocket query but does NOT skip the `LobbyPanel` React component. The fixture must fill the name input and click Join.
- **Sharing browser contexts between tests:** Each test gets fresh contexts via `twoPlayerRoom`. Sharing state causes flaky tests when PartyKit in-memory state leaks.
- **Asserting exact card IDs from P2's view:** The hand privacy test must assert `opponentHandCounts` is a number, not inspect card identities. P2's `ClientGameState` never contains P1's card IDs.
- **Hardcoding `localhost` without `baseURL`:** Use `page.goto('/')` + `baseURL: 'http://localhost:5173'` in config, not full URLs in test files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for server ready | Custom retry loop | `port:` or `url:` in webServer config | Playwright handles polling internally |
| Test isolation between parallel tests | Manual room state cleanup | Unique `nanoid(8)` room code per test | PartyKit in-memory state is per room; new code = clean state |
| Browser launch/teardown | Manual `chromium.launch()` | `browser` fixture from `@playwright/test` | Built-in, handles cleanup, supports `--headed`/`--ui` flags |
| Retry logic for flaky selectors | `waitForTimeout` sleeps | `expect(locator).toBeVisible()` / `toHaveText()` | Playwright auto-retries until timeout |

---

## UI Selector Inventory

**Critical finding:** No `data-testid` attributes exist anywhere in the current codebase. [VERIFIED: grep returned no matches]

The planner MUST include a Wave 0 task to add `data-testid` attributes to the following elements:

| Component | Element | Suggested data-testid | Current selector hook |
|-----------|---------|----------------------|----------------------|
| `HandZone` | Hand container `div` (the droppable) | `hand-zone` | None — add to the `<div ref={setNodeRef}>` |
| `OpponentHand` | Outer container `div` | `opponent-hand` | None — add to outermost `<div ref={setNodeRef}>` |
| `PileZone` (draw pile) | Pile container | `pile-draw` | None — add `data-testid={`pile-${pile.id}`}` |
| `ControlsBar` | Deal popover trigger | `deal-trigger` | Currently `PopoverTrigger` with text "Deal" — also accessible via `getByRole('button', { name: 'Deal' })` |
| `ControlsBar` | Reset button trigger | `reset-trigger` | Currently `Button` with text "Reset" — accessible via `getByRole('button', { name: /reset/i })` |
| `ControlsBar` | Confirm reset button | `reset-confirm` | `AlertDialogAction` with text "Reset table" — accessible via `getByRole('button', { name: 'Reset table' })` |
| `LobbyPanel` | Name input | (use placeholder) | `placeholder="Your name"` — use `getByPlaceholder('Your name')` |
| `LobbyPanel` | Join button | (use ARIA) | Text "Join Game" — use `getByRole('button', { name: 'Join Game' })` |

ARIA-accessible selectors (no `data-testid` needed):
- Deal button: `getByRole('button', { name: /deal/i })` (text "Deal" in trigger)
- Reset button: `getByRole('button', { name: /reset/i })` (text "Reset" in playing phase)
- Reset confirm: `getByRole('button', { name: 'Reset table' })`
- Join Game button: `getByRole('button', { name: 'Join Game' })`
- Name input: `getByPlaceholder('Your name')`

For hand and opponent areas, ARIA alone is insufficient (no `role`, no accessible name on the droppable divs). `data-testid` is required on `HandZone` and `OpponentHand`.

---

## Server Message Types (from `party/index.ts`)

**ClientAction types** (what tests send via `sendAction` to trigger server behavior):

| Action | Payload | Effect |
|--------|---------|--------|
| `DEAL_CARDS` | `{ cardsPerPlayer: number }` | Distributes cards from draw pile to all connected players; sets phase to `"playing"` |
| `PASS_CARD` | `{ cardId, targetPlayerId, fromZone?, fromId? }` | Moves card from sender hand to target player's hand |
| `RESET_TABLE` | `{}` | Returns all cards to draw pile; shuffles; sets phase to `"setup"` |
| `MOVE_CARD` | `{ cardId, fromZone, fromId, toZone, toId, insertPosition? }` | Moves card between hand/pile |

Tests interact via browser UI actions (clicking Deal, Reset, etc.) — not by calling `sendAction` directly. The actions above are what the ControlsBar/BoardDragLayer dispatch internally.

**ServerEvent types** (what the PartyKit server sends to clients):

| Event | When | What it carries |
|-------|------|-----------------|
| `STATE_UPDATE` | After every action and on connect | Full `ClientGameState` (hand masked per connection) |
| `PILE_SHUFFLED` | On deal and shuffle actions | `pileId` string |
| `ERROR` | On invalid actions | `code` + `message` |

The `ClientGameState.opponentHandCounts` field is a `Record<string, number>` — card counts only, no card identities. This is the privacy boundary tested in Scenario 5.

---

## Lobby Bypass — CRITICAL FINDING

The CONTEXT.md states: "the fixture must include `&name=PlayerN` in the navigation URL to bypass the name gate and land directly on the game board."

**This is incorrect.** Reading `App.tsx` and `usePlayerId.ts` confirms:

- `App.tsx` reads only `?room=` from `window.location.search`. No auto-join from URL.
- `usePlayerId.ts` reads `?player=` for stable player token. No name auto-join.
- `LobbyPanel` renders unconditionally when `joinState` is `null` (the initial state).
- `joinState` is only set when `handleJoin(name)` is called from `LobbyPanel`'s button click.

**There is no existing URL bypass.** The fixture must:
1. Navigate to `/?room={code}`
2. Fill `getByPlaceholder('Your name')` with the player name
3. Click `getByRole('button', { name: 'Join Game' })`
4. Wait for the board to be visible (`await expect(page.getByTestId('hand-zone')).toBeVisible()`)

The planner must either (a) add a URL-based bypass to `App.tsx` (e.g., read `?name=` to auto-join), or (b) implement the fixture with LobbyPanel interaction as described above. Option (b) requires no production code change and tests the real user flow. Option (a) is cleaner for fixture setup but changes production code. Both are valid — this is Claude's discretion.

---

## Game Phase State Machine

Understanding phases is required for correct scenario test sequencing:

| Phase | Triggers | ControlsBar shows |
|-------|----------|------------------|
| `"lobby"` | Default on first connect | Deal button (popover) |
| `"setup"` | After RESET_TABLE | Deal button (popover) |
| `"playing"` | After DEAL_CARDS | Undo + Reset buttons |

**Deal scenario sequence:** Both players join (lobby phase) → P1 clicks Deal → sets count → clicks Deal button in popover → phase becomes `"playing"` → both players' hands receive cards.

**Reset scenario sequence:** Must be in `"playing"` phase (deal first) → P1 clicks Reset → confirmation dialog appears → clicks "Reset table" → phase returns to `"setup"`.

**Pass card scenario sequence:** Deal first → P1's hand has cards → P1 drags a card to P2's OpponentHand area → card appears in P2's hand. Note: the drag mechanic is complex for Playwright to automate (uses dnd-kit pointer events). An alternative is to trigger `PASS_CARD` via `page.evaluate()` to call `sendAction` directly — but D-08 only restricts `waitForTimeout`, not `evaluate`. However, testing the actual drag is more representative of real usage.

---

## Common Pitfalls

### Pitfall 1: Lobby Not Bypassed
**What goes wrong:** Test navigates to `/?room=X&name=Player1` and immediately tries to interact with the board. The board never renders because `joinState` is null.
**Why it happens:** The CONTEXT.md code_context section implies `?name=` bypasses the lobby, but this is wrong — the param goes to the PartyKit WebSocket query, not to React state.
**How to avoid:** Fixture must always interact with LobbyPanel (fill name, click Join, wait for board).
**Warning signs:** Tests timeout waiting for `data-testid="hand-zone"` immediately after navigation.

### Pitfall 2: PartyKit webServer `url` vs `port`
**What goes wrong:** Using `url: 'http://localhost:1999/health'` in the PartyKit webServer entry. PartyKit has no `/health` route; Playwright polls forever.
**Why it happens:** The `url` field in `webServer` config polls that URL until it returns 200.
**How to avoid:** Use `port: 1999` instead. Playwright will wait until the port accepts connections, which is simpler and doesn't require a specific HTTP path.
**Warning signs:** `playwright test` hangs at "Waiting for localhost:1999 to be available" indefinitely.

### Pitfall 3: `npm run dev` vs `npm run dev:client`
**What goes wrong:** Using `npm run dev` in the Vite webServer entry. `npm run dev` runs `partykit dev` (the full server), not Vite.
**Why it happens:** `package.json` `"dev"` script is `partykit dev`, not `vite`. `"dev:client"` is `vite`.
**How to avoid:** Use `npm run dev:client` for the Vite entry and `npx partykit dev` for PartyKit. Both are separate entries in the `webServer` array.
**Warning signs:** Port 5173 never opens; Playwright can't load the app.

### Pitfall 4: Deal animation delay in tests
**What goes wrong:** After clicking Deal, the test immediately asserts card counts in hands. But `DEAL_CARDS` in `party/index.ts` has a `setTimeout(resolve, 650)` delay before cards are distributed (animation window from Phase 12). If Playwright checks hand counts before 650ms, the assertion fails.
**Why it happens:** The server-side deal intentionally delays broadcast by 650ms.
**How to avoid:** Use retry-based assertions (`expect(locator).not.toBeEmpty()`) which wait up to the configured timeout (default 5s). D-08 already requires retry-based matchers — this is why they matter here.
**Warning signs:** Hand zone shows 0 cards immediately after deal click despite server eventually distributing them.

### Pitfall 5: Context vs Page isolation
**What goes wrong:** Two players share the same `BrowserContext`. The `partysocket` client reads `playerId` from `localStorage`, so both pages in the same context get the same player token and join as the same player.
**Why it happens:** `usePlayerId.ts` reads from `localStorage` which is shared within a context.
**How to avoid:** Each player must use a separate `BrowserContext` (not just a separate `Page`). D-03 already specifies this correctly.
**Warning signs:** Only one player appears in `gameState.players`; `opponentHandCounts` is empty.

---

## Code Examples

### playwright.config.ts (complete)
```typescript
// Source: https://playwright.dev/docs/api/class-testconfig
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx partykit dev',
      port: 1999,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### Hand privacy assertion (Scenario 5)
```typescript
// P2 sees opponent (P1) hand count but NOT card IDs
// Source: ClientGameState.opponentHandCounts is Record<string, number>
// After P1 has cards dealt, P2's view has count > 0 but myHand is empty
await expect(p2.getByTestId('opponent-hand')).toBeVisible();
// The badge inside OpponentHand shows card count
await expect(p2.getByTestId('opponent-hand').getByRole('status')).toHaveText(/\d+/);
// P2's own hand is empty (only P1 dealt to, or P2's myHand is separate)
```

### .mcp.json
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@0.0.70"],
      "type": "stdio"
    }
  }
}
```

---

## Runtime State Inventory

> Omitted — this is a greenfield tooling phase (new files only, no rename/refactor).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Playwright, Vite, PartyKit | Yes | v24.13.1 | — |
| npx | @playwright/mcp, partykit dev | Yes | bundled with Node | — |
| PartyKit CLI | webServer: partykit dev | Yes | 0.0.115 | — |
| Chromium (system) | Playwright browser | Not yet installed | — | `npx playwright install chromium` |
| @playwright/test | Test runner | Not yet installed | — | `npm install --save-dev @playwright/test` |
| @playwright/mcp | MCP server | Not yet installed | — | `npm install --save-dev @playwright/mcp` |

**Missing dependencies with no fallback:** Chromium must be installed via `npx playwright install chromium`. This is a required Wave 0 step.

**Missing dependencies with fallback:** None — all missing items have clear install paths.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | @playwright/test 1.59.1 |
| Config file | `playwright.config.ts` (project root — Wave 0 creates it) |
| Quick run command | `npx playwright test --grep "state sync"` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEV-01 | `.mcp.json` present with correct `@playwright/mcp` entry | manual verification | `cat .mcp.json` | Wave 0 |
| DEV-02 SC1 | 2-player state sync: P1 action visible to P2 in real time | e2e | `npx playwright test --grep "state sync"` | Wave 0 |
| DEV-02 SC2 | Deal cards: cards distributed to both hands | e2e | `npx playwright test --grep "deal"` | Wave 0 |
| DEV-02 SC3 | Pass card: P1 hand -> P2 hand | e2e | `npx playwright test --grep "pass"` | Wave 0 |
| DEV-02 SC4 | Reset table: all cards return to draw pile | e2e | `npx playwright test --grep "reset"` | Wave 0 |
| DEV-02 SC5 | Hand privacy: P2 sees count not card IDs | e2e | `npx playwright test --grep "privacy"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx playwright test --grep` matching the scenario under development
- **Per wave merge:** `npm run test:e2e` (full e2e suite)
- **Phase gate:** Full e2e suite green + `npm test` (vitest) green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `playwright.config.ts` — project root, dual webServer config
- [ ] `playwright/fixtures.ts` — `twoPlayerRoom` fixture with LobbyPanel interaction
- [ ] `playwright/game.spec.ts` (or split files) — 5 scenario tests
- [ ] `.mcp.json` — `@playwright/mcp` MCP server entry
- [ ] `data-testid="hand-zone"` on `HandZone` droppable container
- [ ] `data-testid="opponent-hand"` on `OpponentHand` outer container
- [ ] `data-testid={`pile-${pile.id}`}` on `PileZone` containers
- [ ] Framework install: `npm install --save-dev @playwright/test @playwright/mcp && npx playwright install chromium`
- [ ] `package.json` scripts: `"test:e2e"` and `"test:e2e:ui"`

---

## Security Domain

This phase adds dev tooling only. No production authentication, session management, or data access is modified. ASVS categories do not apply.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PartyKit port 1999 responds to TCP connection checks (no specific HTTP health route needed) — use `port: 1999` in webServer config | Standard Stack / Code Examples | If Playwright's port check requires HTTP 200, use a known route like `http://127.0.0.1:1999/party/test-health` and verify manually |
| A2 | `@playwright/mcp` uses `"type": "stdio"` transport (standard for CLI-spawned MCP servers) | Code Examples (.mcp.json) | If wrong, `type` field may need to be omitted or set to `"sse"` — verify with `npx @playwright/mcp --help` |
| A3 | `OpponentHand` badge component (`<Badge>{cardCount}</Badge>`) is accessible as `getByRole('status')` or similar | UI Selector Inventory | Badge from shadcn may not have an implicit ARIA role; use `data-testid="opponent-count"` as fallback |

---

## Open Questions

1. **Pass card via drag vs evaluate**
   - What we know: dnd-kit uses pointer events; Playwright has `dragTo()` and pointer event APIs
   - What's unclear: Whether `page.dragAndDrop()` works correctly with dnd-kit's pointer-event model in Chromium
   - Recommendation: Implement drag with `page.dragAndDrop(sourceSelector, targetSelector)`. If it fails in practice, fall back to `page.evaluate(() => window.__sendAction({ type: 'PASS_CARD', ... }))` — but this requires exposing `sendAction` on `window`, which is a production code change. Planner should include a note on this.

2. **Lobby bypass via URL param**
   - What we know: `?name=` does not bypass lobby in current code
   - What's unclear: Whether the planner should add a `?autoJoin=1&name=X` shortcut to `App.tsx` or keep fixture interaction with LobbyPanel
   - Recommendation: Keep LobbyPanel interaction — it tests the real join flow and requires no production code change beyond the `data-testid` additions already needed.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry 2026-04-20] `@playwright/test@1.59.1` — latest stable
- [VERIFIED: npm registry 2026-04-20] `@playwright/mcp@0.0.70` — latest; bin field `playwright-mcp`
- [VERIFIED: codebase grep 2026-04-20] No `data-testid` attributes in `src/` — all selectors must be added
- [VERIFIED: codebase read 2026-04-20] `App.tsx` — lobby bypass via URL confirmed NOT to exist
- [VERIFIED: codebase read 2026-04-20] `party/index.ts` — all ClientAction types, 650ms deal delay
- [VERIFIED: codebase read 2026-04-20] `package.json` — `"dev"` is `partykit dev`, `"dev:client"` is `vite`
- [VERIFIED: Bash 2026-04-20] `partykit@0.0.115` installed; `node v24.13.1`

### Secondary (MEDIUM confidence)
- [CITED: https://playwright.dev/docs/api/class-testconfig#test-config-web-server] webServer array config, `port` vs `url` behavior

### Tertiary (LOW confidence)
- [ASSUMED] PartyKit port 1999 responds to TCP probe without a specific HTTP route
- [ASSUMED] `@playwright/mcp` uses stdio transport (standard MCP convention)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified
- Architecture: HIGH — codebase read
- Pitfalls: HIGH — derived from reading actual source files
- Lobby bypass finding: HIGH — App.tsx + usePlayerId.ts read directly
- PartyKit webServer URL: MEDIUM — port check is safer than URL check; URL unknown

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (Playwright releases frequently; recheck if >30 days)
