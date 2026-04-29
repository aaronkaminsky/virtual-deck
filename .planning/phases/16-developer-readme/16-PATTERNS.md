# Phase 16: Developer README - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 1 (README.md — new)
**Analogs found:** 4 / 1 (multiple documentation analogs for the single new file)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `README.md` | documentation | N/A | `CLAUDE.md` (command table), `SECURITY.md` (structured prose + tables), `.planning/PROJECT.md` (project description + decisions) | role-match (multi-source) |

---

## Pattern Assignments

### `README.md` (documentation)

This is the only deliverable for Phase 16. It is a pure documentation file written from scratch. Patterns are extracted from four existing reference documents.

---

#### Analog 1: `CLAUDE.md` — Command table pattern

**Source:** `/Users/aaronkaminsky/code/virtual-deck/CLAUDE.md`

**Dev Commands table** (lines 118–126 of CLAUDE.md):

```markdown
## Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start PartyKit server (`partykit dev`) |
| `npm run dev:client` | Start Vite frontend (`vite`) |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
```

Copy this table verbatim into the Local Setup section of README.md. It is the canonical command reference. All commands are verified against `package.json`.

**Additional commands confirmed in `package.json`** (lines 6–16):

```json
"scripts": {
  "dev": "partykit dev",
  "dev:client": "vite",
  "build": "vite build",
  "deploy": "partykit deploy",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "typecheck": "tsc --noEmit"
}
```

`npm run test:e2e:ui` and `npm run test:watch` are in `package.json` but not in the CLAUDE.md table. README may include them as secondary commands.

---

#### Analog 2: `CLAUDE.md` — Section header + constraint table pattern

**Source:** `/Users/aaronkaminsky/code/virtual-deck/CLAUDE.md`

**Constraints table format** — use `## Section` headers, then `| Col | Col |` tables. CLAUDE.md uses H2 for all major sections. README.md should follow the same heading depth convention.

---

#### Analog 3: `.planning/PROJECT.md` — Project description prose pattern

**Source:** `/Users/aaronkaminsky/code/virtual-deck/.planning/PROJECT.md`

**"What This Is" section** (lines 3–9):

```markdown
## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a
real-time board with private hands and free-form card manipulation — no rule enforcement, just a
digital surface that works like sitting around a table with a physical deck. Players set a display
name when joining, see each other's names on the table, and have a live presence roster showing who
is connected or away.
```

This is the approved project description prose. README.md should open with a shortened version (D-04 calls for 1–2 sentences). Extract the first sentence and the core value from "Core Value" section (lines 11–13):

```markdown
## Core Value

Players can see the shared table and their own private hand update in real time, with no one able
to see each other's face-down cards.
```

**Key Decisions table format** (lines 104–127) — the README should link to this table rather than duplicate it, per D-02.

---

#### Analog 4: `.github/workflows/deploy.yml` — Deploy configuration facts

**Source:** `/Users/aaronkaminsky/code/virtual-deck/.github/workflows/deploy.yml`

**Trigger and secret** (lines 1–32 of deploy.yml):

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

# ...
- run: npm run build
  env:
    VITE_PARTYKIT_HOST: virtual-deck.aaronkaminsky.partykit.dev
```

Facts for the Deploy section of README.md:
- Frontend deploys automatically on push to `main`, or manually via `workflow_dispatch` in GitHub Actions UI.
- The build requires a GitHub Actions secret named `VITE_PARTYKIT_HOST` with value `virtual-deck.aaronkaminsky.partykit.dev`.
- PartyKit server deploys via `npm run deploy` (maps to `partykit deploy`).
- PartyKit project name: `virtual-deck` (from `partykit.json` line 2).
- PartyKit host: `virtual-deck.aaronkaminsky.partykit.dev`.
- Vite `base` is `/virtual-deck/` (from `vite.config.ts` line 7) — required for GitHub Pages path routing.

---

#### Analog 5: `playwright.config.ts` — E2E test prereq facts

**Source:** `/Users/aaronkaminsky/code/virtual-deck/playwright.config.ts`

**webServer block** (lines 15–26):

```typescript
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
```

`reuseExistingServer: !process.env.CI` means:
- **Locally:** Playwright reuses already-running servers on ports 5173 and 1999 if present; otherwise starts them automatically.
- **In CI:** Playwright always starts fresh servers.

README.md test section should document: run `npm run test:e2e` directly — Playwright auto-starts both servers if they are not already running. No manual pre-start required for e2e tests locally (unless the developer wants to keep servers running for iteration speed).

---

## Architecture Section Content Facts

These facts are extracted from the codebase to support the architecture prose (D-01, Specifics section of CONTEXT.md):

| Fact | Source |
|------|--------|
| Client: React 18 + Vite + shadcn, hosted on GitHub Pages | `PROJECT.md` lines 28–29, `package.json` |
| Server: PartyKit (Cloudflare edge), `party/index.ts` as entrypoint | `partykit.json` line 3 |
| Hand masking: per-connection broadcast via `viewFor`, not `room.broadcast` | `PROJECT.md` Key Decisions row: "Per-connection broadcast (not room.broadcast)" |
| Shared types: `src/shared/types.ts`, imported by both client and `party/index.ts` | `src/shared/types.ts` — exports `Card`, `Player`, `Pile`, `GameState`, `ClientGameState`, `ClientAction` |
| Reconnect: stable player token in `localStorage` + `?player=` URL param | `PROJECT.md` Key Decisions row: "Stable player token in localStorage + ?player= URL param" |
| Room routing: `?room=` query param (not path-based, avoids GH Pages 404) | `PROJECT.md` Key Decisions row: "Query-param room routing" |

The accepted architecture prose from CONTEXT.md `<specifics>` (verbatim, to copy into README.md architecture section):

> Virtual Deck is split into two parts: a React/Vite frontend deployed on GitHub Pages, and a PartyKit server running on Cloudflare's edge. The PartyKit server owns all game state in memory per room. It filters outgoing messages per connection so each player only receives their own hand data (hand masking). The client drives actions (move card, deal, shuffle) via typed messages; the server applies them, then broadcasts the updated state to each connected player with masking applied. Shared TypeScript types live in `src/shared/` and are imported by both the client and the `party/index.ts` server.

---

## Shared Patterns

### Heading Depth Convention
**Source:** `CLAUDE.md`, `PROJECT.md`, `SECURITY.md`
**Apply to:** All sections of `README.md`

All existing project documents use `##` for top-level sections, `###` for subsections. README.md should follow the same hierarchy. The repo title (`# Virtual Deck`) is the only H1.

### Code Block for Commands
**Source:** `CLAUDE.md` Dev Commands table; `SECURITY.md` code blocks
**Apply to:** All commands in README.md

Single commands use inline backticks in prose; multi-step sequences use fenced code blocks (triple backtick). This is the convention established in both CLAUDE.md and SECURITY.md.

### Em-dash prose style
**Source:** `PROJECT.md` lines 5–6, `CLAUDE.md` project description
**Apply to:** README.md description and architecture prose

Project prose uses em-dash (`—`) not en-dash or hyphen for parenthetical clauses. Example: "no rule enforcement, just a digital surface that works like sitting around a table with a physical deck."

---

## No Analog Found

No files in this phase lack analogs — README.md is a documentation file and all content facts are drawn from existing codebase files documented above.

---

## Metadata

**Analog search scope:** repo root docs (`CLAUDE.md`, `SECURITY.md`, `project-brainstorm.md`), `.planning/` (`PROJECT.md`), `.github/workflows/`, `partykit.json`, `vite.config.ts`, `package.json`, `playwright.config.ts`, `src/shared/types.ts`
**Files scanned:** 10
**Pattern extraction date:** 2026-04-28
