# Technology Stack

**Project:** Virtual Deck
**Researched:** 2026-04-19 (v1.2 additions only — existing stack not re-researched)
**Confidence note:** New package versions verified against npm registry search results (April 2026). Versions without [UNVERIFIED] are confirmed current.

---

## Existing Stack (validated, do not re-recommend)

React 18 + Vite + TypeScript + shadcn v4 + dnd-kit + zustand + partysocket + PartyKit + vitest.
All installed and working. See CLAUDE.md for full version list from package.json.

---

## New Additions for v1.2

### E2E Testing

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@playwright/test` | 1.51.x (latest as of April 2026) | E2E test runner + assertions | Industry-standard for browser automation. Built-in support for multiple browser contexts in a single test — the correct primitive for simulating two players in the same room. Playwright is the dominant choice over Cypress in 2026 for speed and multi-context support. |
| `@playwright/test` (browser binaries) | installed via `npx playwright install chromium` | Chromium browser for test execution | Only Chromium needed for this project — no cross-browser matrix required for a dev infrastructure milestone. Chromium is the smallest download and fastest CI runner. |

**Installation:**
```bash
npm install -D @playwright/test
npx playwright install chromium
```

**playwright.config.ts key settings:**
```ts
webServer: [
  {
    command: "npm run dev:client",   // vite on localhost:5173
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
  {
    command: "npx partykit dev",     // partykit on localhost:1999
    url: "http://localhost:1999",
    reuseExistingServer: !process.env.CI,
  },
],
use: {
  baseURL: "http://localhost:5173",
},
testDir: "./e2e",
```

Rationale for two `webServer` entries: the Vite frontend and PartyKit server are independent processes. Both must be up before any test navigates to the UI. Playwright supports an array of `webServer` configs for exactly this pattern.

**Vitest coexistence:** Keep vitest for the existing unit/server-logic tests in `tests/`. Add `e2e/` as a separate directory for Playwright tests. Do not merge them — vitest runs pure TypeScript logic (no browser), Playwright runs full browser scenarios. No config changes to `vitest.config.ts` required.

### Playwright MCP Server (Claude Code Integration)

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@playwright/mcp` | 0.0.70 (latest as of April 2026) | MCP server giving Claude Code browser control | Allows Claude Code to drive a real Chromium browser during dev sessions — navigate, click, inspect DOM, take screenshots. Used interactively for exploratory testing and test authoring, not in the committed test suite itself. |

**This is NOT a project dependency.** Do not add to `package.json`. Register as a project-scoped MCP server via `.mcp.json` in the repo root so all team members get it automatically via Claude Code.

**`.mcp.json` (project-scoped, commit to repo):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Alternatively, register per-developer via:
```bash
claude mcp add playwright npx @playwright/mcp@latest --scope project
```
This writes the same `.mcp.json` entry.

**Usage during dev:** Say "Use Playwright MCP to open the app at localhost:5173 and verify the play zone renders" — Claude Code controls a visible Chromium window and reports what it sees.

### UI Additions for Play Zones

No new UI library packages needed. The existing stack is sufficient:

- **Personal play area zone** and **shared communal zone** are layout/structural additions — styled `div` containers with Tailwind classes and the dark felt theme already in place via shadcn v4.
- **Card set selection** (1–5 cards) uses existing dnd-kit drag state and can be layered on top of the existing `Card` component with a selection indicator (border highlight via Tailwind).
- `@base-ui/react` (already installed as `^1.3.0`) covers any dialog or popover needed for play set confirmation — consistent with the existing pile insert dialog pattern.

The only UI consideration is zone layout: two new named regions on the board. This is a CSS/component composition problem, not a library gap.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| E2E runner | `@playwright/test` | Cypress | Playwright supports multiple browser contexts per test natively — needed for two-player simulation. Cypress requires separate processes per "user" and has worse WS support. |
| E2E runner | `@playwright/test` | Vitest browser mode | Vitest browser mode is for component tests, not full stack e2e with a running WebSocket server. Wrong layer. |
| MCP package | `@playwright/mcp` (Microsoft) | `@executeautomation/playwright-mcp-server` | Use the official Microsoft package. The executeautomation one is a community fork; the Microsoft version is what Claude Code documentation recommends. |
| MCP scope | Project (`.mcp.json`) | User-global | Project scope commits the config to the repo so any contributor who opens the project in Claude Code gets Playwright MCP automatically. User-global is appropriate for personal tools, not team tooling. |
| Play zone UI | Tailwind + existing components | New UI library (e.g. react-grid-layout) | No dynamic resizable grid needed — zones are fixed regions. Adding a grid library for two static zones is over-engineering. |

---

## Two-Remote-Players Test Issue

The existing vitest tests in `tests/` mock the PartyKit room and connections at the TypeScript level — no real WebSocket or browser involved. The "two remote players" issue is a test setup problem, not a missing package.

The fix path: use Playwright's `browser.newContext()` twice in a single test to create two isolated browser sessions, each connecting to the real running PartyKit dev server. This is how real multi-player behavior is tested end-to-end without mocking. No new packages required beyond `@playwright/test`.

---

## Installation Summary (v1.2 additions only)

```bash
# E2E test runner (dev dependency)
npm install -D @playwright/test

# Browser binaries (one-time, not in package.json)
npx playwright install chromium

# Playwright MCP — do NOT npm install; register via Claude Code
claude mcp add playwright npx @playwright/mcp@latest --scope project
# or: create .mcp.json manually (see above)
```

---

## Sources

- npm search results (April 2026): `@playwright/test` 1.51.x, `@playwright/mcp` 0.0.70 — MEDIUM confidence (search snippets, not direct npm page read)
- Playwright official docs: https://playwright.dev/docs/test-webserver (webServer config), https://playwright.dev/docs/browser-contexts (multi-context testing)
- Microsoft playwright-mcp GitHub: https://github.com/microsoft/playwright-mcp
- Simon Willison's TIL on Playwright MCP + Claude Code: https://til.simonwillison.net/claude-code/playwright-mcp-claude-code
- Builder.io guide (Claude Code + Playwright MCP): https://www.builder.io/blog/playwright-mcp-server-claude-code
- package.json in this repo (confirmed existing deps, no Playwright present)
- vitest.config.ts in this repo (confirmed test structure — `tests/` dir for unit tests)
