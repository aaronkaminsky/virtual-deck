# Virtual Deck

Virtual Deck is a web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck.

For project rationale and architectural decisions, see [.planning/PROJECT.md](.planning/PROJECT.md) (Key Decisions table).

## Local Setup

### Prerequisites

- Node.js (LTS — the deploy workflow uses `lts/*`)
- npm (bundled with Node)
- A modern browser (Chrome, Firefox, or Safari)

### Clone and Install

```bash
git clone https://github.com/<your-fork>/virtual-deck.git
cd virtual-deck
npm install
```

### Start the Dev Stack

The local stack has two processes that must run simultaneously: the PartyKit server and the Vite frontend. Open two terminals.

```bash
# Terminal 1 — PartyKit server (port 1999)
npm run dev

# Terminal 2 — Vite frontend (port 5173)
npm run dev:client
```

Then visit `http://localhost:5173/virtual-deck/` — note the `/virtual-deck/` path, which is required because `vite.config.ts` sets `base: '/virtual-deck/'` for GitHub Pages routing.

### Command Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start PartyKit server (`partykit dev`) on port 1999 |
| `npm run dev:client` | Start Vite frontend (`vite`) on port 5173 |
| `npm test` | Run Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run test:e2e:ui` | Run Playwright with the interactive UI runner |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run build` | Production build (Vite) — output to `dist/` |
| `npm run deploy` | Deploy PartyKit server (`partykit deploy`) |

## Architecture

Virtual Deck is split into two parts: a React/Vite frontend deployed on GitHub Pages, and a PartyKit server running on Cloudflare's edge. The PartyKit server owns all game state in memory per room. It filters outgoing messages per connection so each player only receives their own hand data (hand masking). The client drives actions (move card, deal, shuffle) via typed messages; the server applies them, then broadcasts the updated state to each connected player with masking applied. Shared TypeScript types live in `src/shared/` and are imported by both the client and the `party/index.ts` server.

The PartyKit server entrypoint is `party/index.ts` (declared in `partykit.json`). Hand masking is implemented via a per-connection `viewFor` function — the server never calls `room.broadcast` directly, so each player's hand is filtered before it leaves the server. For the reasoning behind these decisions, see [.planning/PROJECT.md](.planning/PROJECT.md).

## Tests

### Unit Tests (Vitest)

```bash
npm test           # run once
npm run test:watch # watch mode
```

### End-to-End Tests (Playwright)

First-run setup — install Playwright browsers once:

```bash
npx playwright install chromium
```

Then run tests:

```bash
npm run test:e2e      # headless run
npm run test:e2e:ui   # interactive UI runner
```

Playwright's `reuseExistingServer: !process.env.CI` means locally, if `npm run dev` and `npm run dev:client` are already running on ports 1999 and 5173, Playwright reuses them. Otherwise Playwright starts both servers automatically before the test run. No manual pre-start required for local e2e runs — just run `npm run test:e2e` directly.

In CI, Playwright always starts fresh servers regardless of what is running.

### Playwright MCP (Claude Code dev sessions)

`.mcp.json` registers `@playwright/mcp` as a project-scoped MCP server. Claude Code sessions in this repo can drive a Playwright browser directly — useful for visual inspection and interactive test development. The MCP config is dev-only and is never added to `package.json` runtime dependencies or CI scripts.
