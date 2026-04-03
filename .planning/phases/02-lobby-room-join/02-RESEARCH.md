# Phase 2: Lobby + Room Join - Research

**Researched:** 2026-04-02
**Domain:** React/Vite frontend scaffold, PartySocket client integration, GitHub Pages deploy, shadcn/ui with Tailwind v4
**Confidence:** HIGH (locked decisions well-defined; main unknowns are config details verified below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Room Entry Flow**
- Root URL (`/`) with no `?room` param → generate a new `nanoid` room ID and redirect to `/?room={id}`
- Any URL with `?room={id}` → join that room
- "Room not found" is not a UI state — PartyKit creates rooms on first connection, so any room ID works; stale/wrong codes just land in an empty room
- No landing screen, no explicit "Create Game" button

**URL / Routing Strategy**
- Room ID lives in a query param: `?room=ABC123`
- No client-side router needed — URL is parsed directly from `window.location.search`
- Works on GitHub Pages with zero configuration (no 404.html trick)
- Shareable URL format: `https://{user}.github.io/virtual-deck/?room=ABC123`

**Player Identity**
- Stable player token stored in `localStorage` under key `playerId`
- Token is a `nanoid`-generated UUID; generated once and persisted
- Passed to PartyKit as the PartySocket `id` param (already established in Phase 1 state)
- No player name — `Player` type stays as `{ id: string; connected: boolean }` — PRES-01 deferred to v2
- No name prompt in join flow

**Card Art (DECK-03)**
- Single file: `src/card-art.ts`
- Exports:
  - `CARD_BACK_URL: string` — path to back-of-card image
  - `CARD_FACE_URL(card: Card): string` — returns face image path for a given card
- Phase 2: placeholder values only (e.g., empty string or a colored-rectangle data URI)
- Phase 3 will replace placeholders with real image paths — no other files need changing
- This is the "one file to edit" for DECK-03

**Frontend Scaffold**
- React 18 + Vite 5 + TypeScript (per CLAUDE.md stack decision)
- `partysocket` already installed; connect using the player token as the PartySocket `id`
- GitHub Pages deploy: `vite build` + `base` config set to `/virtual-deck/` (repo name)
- No routing library — single-page app, query param only

### Claude's Discretion

None raised during discussion.

### Deferred Ideas (OUT OF SCOPE)

None raised during discussion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROOM-01 | Player can create a room and receive a shareable link/code | nanoid room ID generation at root URL; `window.location.replace` redirect pattern; clipboard API copy |
| ROOM-02 | Player can join a room by entering a room code or opening a shared link | Query param parsing via `window.location.search`; PartySocket connect with `room` param; lobby UI displays player list from `STATE_UPDATE` |
| DECK-03 | Card face and back art is swappable via code change — no UI required | `src/card-art.ts` module with `CARD_BACK_URL` and `CARD_FACE_URL(card)` exports; placeholder values in Phase 2 |
</phase_requirements>

---

## Summary

Phase 2 introduces the React/Vite frontend for the first time. The PartyKit server is complete from Phase 1; this phase is purely client-side scaffolding plus a thin lobby UI. The architecture is simpler than it sounds: no router, no server-side rendering, one query param decides room identity, and `localStorage` handles player persistence.

The main technical risk is the shadcn initialization. The shadcn CLI (v4 as of March 2026) now targets Tailwind CSS v4 with `@tailwindcss/vite` as a Vite plugin instead of PostCSS — this is a breaking change from the v3 approach. The CSS variable configuration in `globals.css` is also different (no `tailwind.config.js`). The planner must sequence the shadcn init step before any component work.

GitHub Pages deployment for a project repo requires `base: '/virtual-deck/'` in `vite.config.ts` and a GitHub Actions workflow using `actions/upload-pages-artifact` + `actions/deploy-pages`. The query-param URL scheme (no path routing) sidesteps the 404.html workaround entirely.

**Primary recommendation:** Scaffold React/Vite first, then `npx shadcn@latest init`, then build the lobby component — in that order, since shadcn init modifies `vite.config.ts`, `tsconfig.json`, and `index.css`.

---

## Standard Stack

### Core (verified against npm registry 2026-04-02)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UI component tree | Current stable; React 18 in CLAUDE.md is a floor, not a ceiling — 19 is the npm current |
| react-dom | 19.2.4 | DOM rendering | Paired with react |
| @vitejs/plugin-react | 6.0.1 | Vite plugin for JSX transform | Official plugin; required for React with Vite |
| vite | 8.0.3 | Build tool and dev server | Current stable; CLAUDE.md says 5.x minimum |
| typescript | 6.0.2 | Type safety | Already installed in project |
| partysocket | 1.1.16 | WebSocket client for PartyKit | Already installed; confirmed correct package name |
| nanoid | 5.1.7 | Room ID and player token generation | Already installed |

> **NOTE on React version:** CLAUDE.md specifies React 18. npm current is 19.2.4. React 19 has breaking changes in some concurrent APIs but is stable and widely used. The planner should decide: pin to 18.x to honor CLAUDE.md literally, or use 19.x. This research flags it as a decision point. For safety, pin to `^18` unless the user approves 19.

### shadcn / Design System (verified 2026-04-02)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn (CLI) | 4.1.2 | Component generator | Specified in UI-SPEC; generates Radix + Tailwind components |
| tailwindcss | 4.2.2 | Utility CSS | shadcn v4 targets Tailwind v4 |
| @tailwindcss/vite | 4.2.2 | Tailwind v4 Vite plugin | Replaces PostCSS config in Tailwind v4 |
| lucide-react | 1.7.0 | Icon library | Specified in UI-SPEC |
| radix-ui | (installed by shadcn) | Headless component primitives | shadcn v4 uses unified `radix-ui` package (not individual `@radix-ui/react-*`) |
| clsx | 2.1.1 | Class name utility | Installed by shadcn |
| tailwind-merge | 3.5.0 | Merge Tailwind classes | Installed by shadcn |
| @types/node | 25.5.0 | Node type defs for path alias | Required by shadcn vite config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.12 | Local UI state (copy button toggle, connection status) | Use for ephemeral UI state only — game state flows from server messages per CLAUDE.md |
| immer | 11.1.4 | Immutable updates inside zustand | Use with zustand for any multi-field state updates |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| query param routing | react-router or TanStack Router | Router adds complexity; query params work on GitHub Pages without hash routing or 404.html tricks — locked decision |
| shadcn | plain Tailwind | shadcn locked in UI-SPEC; skip this option |
| Tailwind v4 | Tailwind v3 | shadcn v4 CLI targets v4 — v3 config (tailwind.config.js, PostCSS) is deprecated approach and won't match CLI output |

### Installation

```bash
# React + Vite scaffold (run in project root)
npm install react@^18 react-dom@^18
npm install --save-dev @vitejs/plugin-react @types/react @types/react-dom

# Initialize shadcn (interactive — will ask style/color questions)
npx shadcn@latest init

# Add shadcn components required by UI-SPEC
npx shadcn@latest add button separator badge

# Local UI state
npm install zustand immer
```

> React version note: install `^18` to honor CLAUDE.md. If the user approves React 19, change to `react@^19 react-dom@^19`.

### Version verification (run before writing package installs in tasks)

```bash
npm view react version        # 19.2.4 (pin ^18 per CLAUDE.md)
npm view vite version         # 8.0.3
npm view shadcn version       # 4.1.2
npm view tailwindcss version  # 4.2.2
npm view lucide-react version # 1.7.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── shared/
│   └── types.ts          # existing — Card, GameState, etc.
├── card-art.ts            # DECK-03: CARD_BACK_URL + CARD_FACE_URL
├── hooks/
│   └── usePartySocket.ts  # thin wrapper: connect, onmessage, send
├── components/
│   └── LobbyPanel.tsx     # the only rendered screen in Phase 2
├── App.tsx                # query param routing logic + PartySocket state
├── main.tsx               # ReactDOM.createRoot entry point
└── globals.css            # shadcn CSS vars (modified by shadcn init)
index.html                 # Vite entry; add Inter font <link>
vite.config.ts             # base: '/virtual-deck/', Tailwind plugin, path alias
.github/
└── workflows/
    └── deploy.yml         # GitHub Actions Pages deploy
```

### Pattern 1: Query-Param Room Routing (no router library)

**What:** On mount, read `window.location.search`. If no `?room` param, generate a nanoid and call `window.location.replace`. If `?room` exists, render the lobby.

**When to use:** Single-screen SPA on GitHub Pages where path routing requires 404.html hacks.

```typescript
// src/App.tsx
import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import LobbyPanel from './components/LobbyPanel';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');

  useEffect(() => {
    if (!roomId) {
      const id = nanoid(8);
      window.location.replace(`/?room=${id}`);
    }
  }, [roomId]);

  if (!roomId) return null; // brief blank before redirect

  return <LobbyPanel roomId={roomId} />;
}
```

### Pattern 2: Stable Player Token via localStorage

**What:** Read or create a player token on first render. Never changes for the lifetime of the browser.

```typescript
// src/hooks/usePlayerId.ts
import { nanoid } from 'nanoid';

export function getOrCreatePlayerId(): string {
  const existing = localStorage.getItem('playerId');
  if (existing) return existing;
  const id = nanoid();
  localStorage.setItem('playerId', id);
  return id;
}
```

### Pattern 3: PartySocket Connection in React

**What:** Create the PartySocket in a `useEffect`, attach message handler, store latest `ClientGameState` in state.

**When to use:** Any React component that needs live server state.

```typescript
// Source: https://docs.partykit.io/reference/partysocket-api/
import PartySocket from 'partysocket';
import { useEffect, useState } from 'react';
import type { ClientGameState, ServerEvent } from '../shared/types';

const PARTYKIT_HOST = import.meta.env.DEV
  ? 'localhost:1999'
  : 'virtual-deck.{GITHUB_USERNAME}.partykit.dev';

export function usePartySocket(roomId: string, playerId: string) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      id: playerId,
    });

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const event: ServerEvent = JSON.parse(e.data);
      if (event.type === 'STATE_UPDATE') {
        setGameState(event.state);
      }
    };

    return () => ws.close();
  }, [roomId, playerId]);

  return { gameState, connected };
}
```

> **PARTYKIT_HOST:** The deployed host is `virtual-deck.{GITHUB_USERNAME}.partykit.dev`. The GitHub username must be substituted as a build-time constant. Use `import.meta.env.VITE_PARTYKIT_HOST` so the planner can add it to the deploy workflow and a `.env.local` for dev.

### Pattern 4: shadcn v4 + Tailwind v4 CSS Variables

**What:** shadcn v4 init configures Tailwind v4 CSS variables. No `tailwind.config.js`. The `globals.css` file uses `@import "tailwindcss"` plus `@layer base { :root { ... } }`.

**When to use:** All color and spacing tokens in Phase 2 UI come from these variables.

```css
/* src/globals.css — after npx shadcn@latest init, add these overrides */
@import "tailwindcss";

@layer base {
  :root {
    --background: 160 38% 16%;
    --card: 160 38% 10%;
    --foreground: 220 13% 91%;
    --muted-foreground: 220 9% 46%;
    --primary: 38 92% 50%;
    --primary-foreground: 0 0% 0%;
    --destructive: 0 84% 60%;
    --border: 160 20% 20%;
    --ring: 38 92% 50%;
  }
}
```

> Source: UI-SPEC `## Color` section; verified against shadcn v4 CSS variable convention.

### Pattern 5: GitHub Pages GitHub Actions Workflow

**What:** Vite outputs static files to `dist/`. GitHub Pages serves from a GitHub Actions artifact.

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_PARTYKIT_HOST: virtual-deck.${{ secrets.PARTYKIT_GITHUB_USERNAME }}.partykit.dev
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

```typescript
// vite.config.ts additions
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: '/virtual-deck/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
```

### Anti-Patterns to Avoid

- **Using `react-router-dom` or any router for a single-screen app:** Adds unnecessary complexity; query params on GitHub Pages work without any special config — locked decision.
- **Storing `gameState` in zustand:** Game state should flow directly from WebSocket `STATE_UPDATE` messages into React state (via `useState`). Zustand is only for ephemeral UI state (e.g., copy button toggled, connection status dot). Mixing them creates sync bugs.
- **Using `window.location.href = ...` for the redirect:** Use `window.location.replace(...)` — avoids polluting browser history with a blank `/` entry.
- **Initializing shadcn after writing components:** shadcn init modifies `vite.config.ts`, `tsconfig.json`, and creates `globals.css`. Do it first or you'll have merge conflicts.
- **Hardcoding the PartyKit host:** Must be configurable via env var so the deployed frontend hits `partykit.dev` and local dev hits `localhost:1999`.
- **React 19 import patterns without checking:** React 19 changed some APIs (e.g., `forwardRef` handling, `use()` hook). Since CLAUDE.md specifies React 18, pin to `^18` unless the user explicitly approves upgrading.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom execCommand or textarea trick | `navigator.clipboard.writeText()` | Web API, widely supported, async, no flash of invisible element |
| Random ID generation | `Math.random()` string | `nanoid` (already installed) | URL-safe, cryptographically seeded, correct alphabet |
| CSS component styling | Inline styles or raw CSS modules | shadcn + Tailwind CSS vars | Design token consistency, pre-built accessible components |
| WebSocket reconnection | Manual retry loop with setTimeout | `partysocket` (already installed) | Handles reconnection, message queueing, exponential backoff |
| Player list rendering | Roll-your-own slot logic | Derive directly from `gameState.players` | Array of `Player` with `connected: boolean` is exactly what's needed |

**Key insight:** The server already sends `ClientGameState` with `players: Player[]` on every change. The lobby UI is a thin render of that array — no local state management needed beyond connection status.

---

## Common Pitfalls

### Pitfall 1: shadcn init overwrites files

**What goes wrong:** Running `npx shadcn@latest init` after writing `vite.config.ts` or `globals.css` will overwrite those files with defaults, losing any custom additions.

**Why it happens:** The shadcn CLI creates/replaces `vite.config.ts`, `src/globals.css`, and updates `tsconfig.json` and `tsconfig.app.json`.

**How to avoid:** Run `npx shadcn@latest init` as the very first task after the Vite scaffold. All subsequent edits to `vite.config.ts` (e.g., adding `base: '/virtual-deck/'`, the `@shared` alias) happen after init.

**Warning signs:** Missing `@tailwindcss/vite` import in vite.config.ts after init, or `globals.css` lacking `@import "tailwindcss"`.

---

### Pitfall 2: PartyKit host not environment-gated

**What goes wrong:** Hardcoding `virtual-deck.username.partykit.dev` as the PartySocket host means local dev also hits production, or the host is wrong for different users.

**Why it happens:** Developers copy example code without parameterizing.

**How to avoid:** Always use `import.meta.env.DEV` or `import.meta.env.VITE_PARTYKIT_HOST`. Set `VITE_PARTYKIT_HOST` in a `.env.local` file (gitignored) for local dev and inject it via the GitHub Actions workflow env for production.

**Warning signs:** Connection attempts to `localhost:1999` from a deployed app, or `virtual-deck.username.partykit.dev` from local dev.

---

### Pitfall 3: `tsconfig.json` path alias not recognized by Vite

**What goes wrong:** TypeScript resolves `@shared/*` imports fine but Vite bundler throws "Cannot resolve module" at runtime.

**Why it happens:** `tsconfig.json` paths configure the TypeScript compiler only; Vite needs the alias separately in `vite.config.ts`.

**How to avoid:** Mirror every `paths` alias from `tsconfig.json` in `vite.config.ts` `resolve.alias`. The existing `tsconfig.json` already defines `@shared/*` — add the corresponding alias to Vite config.

**Warning signs:** TypeScript shows no errors but Vite dev server throws module resolution errors for `@shared/types`.

---

### Pitfall 4: `window.location.replace` in React causes double-render

**What goes wrong:** The redirect fires on every render if placed directly in component body or a `useEffect` with no deps array.

**Why it happens:** `useEffect(() => { ... })` with no dependency array runs after every render.

**How to avoid:** Check `!roomId` BEFORE rendering anything; if no `roomId`, call `window.location.replace` immediately and return `null`. The `useEffect` approach works but must use `[]` (empty deps) or wrap in a guard.

**Warning signs:** Redirect loop, flashing UI before redirect.

---

### Pitfall 5: shadcn v4 CSS variable HSL format

**What goes wrong:** shadcn v4 CSS variables use the HSL channel format (`160 38% 16%`) WITHOUT the `hsl()` wrapper. Using `hsl(160 38% 16%)` in the `:root` block causes Tailwind to fail to compose opacity utilities.

**Why it happens:** Tailwind CSS v4 reads variables as channel values and wraps them itself.

**How to avoid:** Use bare `160 38% 16%` format in CSS variables (as shown in the UI-SPEC and in Pattern 4 above). Do not add `hsl(...)` wrapper.

**Warning signs:** Background colors appear as transparent or wrong color; opacity utilities like `bg-background/50` don't work.

---

### Pitfall 6: GitHub Pages 404 on direct URL load — NOT applicable here

**What might go wrong:** SPAs with path-based routing (e.g., `/room/ABC`) need a `404.html` trick for GitHub Pages.

**Why it's not a problem here:** The locked decision to use query params (`/?room=ABC`) means all requests go to `index.html`. GitHub Pages serves `index.html` for `/` and the `?room=...` is transparent.

**No action needed** — documenting to prevent unnecessary 404.html work.

---

## Code Examples

### Entry point with redirect guard

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Clipboard copy with 2-second reset

```typescript
// Source: MDN Clipboard API
const [copied, setCopied] = useState(false);

function handleCopy() {
  const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}
```

### card-art.ts placeholder (DECK-03)

```typescript
// src/card-art.ts
import type { Card } from './shared/types';

// Phase 2: placeholders — replace with real paths in Phase 3
export const CARD_BACK_URL: string = '';

export function CARD_FACE_URL(_card: Card): string {
  return '';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + PostCSS | `@tailwindcss/vite` plugin, `@import "tailwindcss"` in CSS | Tailwind v4 (2025) | No postcss.config.js needed; CSS vars format changed |
| Individual `@radix-ui/react-*` packages | Unified `radix-ui` package | shadcn v4 (Feb 2026) | shadcn CLI handles; no manual install needed |
| `react-scripts` (CRA) | Vite | 2022–2023 | CRA is officially deprecated; do not use |
| `window.location.hash` for SPA routing on GH Pages | Query params (`?room=`) | — | No 404.html workaround needed |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived by Atlassian; do not use (CLAUDE.md confirmed)
- `Create React App`: Officially deprecated; use Vite (CLAUDE.md confirmed)
- Tailwind v3 PostCSS config: shadcn v4 does not produce this; would need manual downgrade

---

## Open Questions

1. **React version: 18 or 19?**
   - What we know: CLAUDE.md says React 18.x. npm current is 19.2.4.
   - What's unclear: Whether React 19 has any API used differently in this project. The codebase has no React code yet.
   - Recommendation: Planner should explicitly choose. Safest path: install `^18` and note it as intentional. If the user is fine with 19, it works fine for this phase's simple use case.

2. **PartyKit GitHub username for the production host**
   - What we know: Deployed host is `virtual-deck.{GITHUB_USERNAME}.partykit.dev`; GITHUB_USERNAME is `aaronkaminsky` based on git config.
   - What's unclear: Whether this is correct or if the partykit project name in `partykit.json` differs.
   - Recommendation: Plan should include a task to verify the deployed host and set `VITE_PARTYKIT_HOST` in GitHub Actions secrets.

3. **`tsconfig.app.json` vs `tsconfig.json`**
   - What we know: Current `tsconfig.json` has `@shared/*` alias. shadcn init for Vite often also creates `tsconfig.app.json` (Vite's default scaffold sometimes generates both).
   - What's unclear: Whether shadcn init will create a second tsconfig file or modify the existing one.
   - Recommendation: After shadcn init, verify path aliases are in whichever tsconfig file Vite actually uses and that vitest.config.ts alias still works.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| Node.js | npm install, Vite build | Yes | v24.13.1 | — |
| npm | package management | Yes | 11.8.0 | — |
| npx (shadcn init) | shadcn component scaffold | Yes | bundled with npm | — |
| Git / GitHub Actions | Pages deploy workflow | Yes (repo confirmed) | — | — |
| PartyKit Cloud (dev server) | Local WebSocket server | Yes (partykit in devDeps) | 0.0.115 | — |

**Missing dependencies:** None. All required tools are present.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `/Users/aaronkaminsky/code/virtual-deck/vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

> **Note:** Phase 2 is primarily frontend scaffolding and a redirect/routing pattern. The existing test suite covers server logic only (`tests/deck.test.ts`, `drawCard.test.ts`, `shuffle.test.ts`, `viewFor.test.ts`). Phase 2 does not introduce new server logic, so there are no server-side test gaps.

> Frontend tests (React components) are not currently in the test setup. Adding React Testing Library or Playwright is out of scope for Phase 2 per the locked decision to keep the UI minimal. The success criteria for Phase 2 are human-verifiable integration tests (visit the URL, verify redirect, verify room join, verify player persistence across refresh).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROOM-01 | Root URL redirects to `/?room={id}` | smoke (manual) | — | N/A — no browser test infra |
| ROOM-01 | Copy link button writes URL to clipboard | smoke (manual) | — | N/A |
| ROOM-02 | `?room=` param connects to the PartyKit room | smoke (manual) | — | N/A |
| ROOM-02 | Player list updates when second player joins | smoke (manual) | — | N/A |
| DECK-03 | `src/card-art.ts` exports `CARD_BACK_URL` and `CARD_FACE_URL` | unit | `npm test` (if test file added) | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npm test` (existing server tests — confirm no regressions)
- **Per wave merge:** `npm test` + `npm run typecheck`
- **Phase gate:** `npm test` green + `npm run typecheck` clean + human smoke test of lobby before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/card-art.test.ts` — covers DECK-03 export shape (trivial unit test: verify exports exist and are correct type)
- [ ] No React component tests needed for Phase 2 — lobby UI is human-verified per success criteria

---

## Sources

### Primary (HIGH confidence)

- npm registry (verified 2026-04-02) — all package versions in Standard Stack
- `src/shared/types.ts`, `party/index.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts` — project state confirmed directly
- `02-CONTEXT.md` — locked decisions, verbatim
- `02-UI-SPEC.md` — component inventory, color tokens, interaction contracts
- `https://docs.partykit.io/reference/partysocket-api/` — PartySocket constructor options, id param, host format
- `https://docs.partykit.io/reference/partyserver-api/` — hook names (onConnect, onMessage, onClose, onStart), storage API
- `https://docs.partykit.io/guides/deploying-your-partykit-server/` — deployed host format
- `https://vite.dev/guide/static-deploy.html` — GitHub Pages base config, Actions workflow
- `https://ui.shadcn.com/docs/installation/vite` — shadcn v4 Vite install, Tailwind v4, @tailwindcss/vite
- `https://ui.shadcn.com/docs/changelog` — shadcn v4 release, unified radix-ui package

### Secondary (MEDIUM confidence)

- shadcn v4 `@layer base { :root { ... } }` CSS variable HSL channel format — inferred from official docs + shadcn changelog; not a direct code sample from docs page

### Tertiary (LOW confidence)

- `tsconfig.app.json` creation behavior during `shadcn init` — not explicitly verified; based on typical Vite scaffold behavior. Flag: verify after running init.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry
- Architecture: HIGH — patterns derived from locked decisions in CONTEXT.md, verified PartyKit/Vite docs
- Pitfalls: HIGH for shadcn/Tailwind v4 and env var (verified), MEDIUM for tsconfig.app.json (behavioral inference)
- Validation: HIGH — test framework confirmed via vitest.config.ts

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable libraries; shadcn/PartyKit APIs move faster — re-verify if more than 2 weeks pass)
