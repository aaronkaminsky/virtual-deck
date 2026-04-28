# Phase 16: Developer README - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Write README.md (repo root) that enables a developer to set up locally, understand the architecture, run all tests, and deploy — using only that document. No README.md currently exists.

</domain>

<decisions>
## Implementation Decisions

### Architecture Overview
- **D-01:** Use prose paragraphs (not a source map or diagram). Two to three paragraphs covering the client/server split, PartyKit server role, hand masking via `viewFor`, and the typed message flow.
- **D-02:** Structure only — no rationale or "why this stack" in the README. Include a link/reference pointing to `.planning/PROJECT.md` (Key Decisions table) for decision context.

### Audience
- **D-03:** Written for both future self and an external curious developer — lean toward future self. Assumes familiarity with the stack names, but provides enough orientation that someone unfamiliar could follow without googling.
- **D-04:** Include a brief project description at the top (1–2 sentences on what Virtual Deck is) before diving into setup. This is the first thing someone landing on the repo cold will read.

### Deploy Section
- **D-05:** Full pre-flight coverage — include GitHub Pages activation in repo Settings, `partykit login`, creating the partykit project, setting up the `VITE_PARTYKIT_HOST` GitHub Actions secret, plus the actual deploy commands.
- **D-06:** Deploy section uses separate subsections for Frontend (GitHub Pages via push to main / `workflow_dispatch`) and Server (PartyKit Cloud via `npm run deploy`). The two targets are distinct infrastructure and should be documented independently.

### Claude's Discretion
- Section ordering within Local Setup (prerequisites, clone/install, start commands) follows conventional README structure.
- Whether to use code blocks for commands vs. inline code is left to standard README conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Key Decisions table (architecture rationale, stack choices); referenced in README as the decision log
- `.planning/REQUIREMENTS.md` — DEV-03 requirement and success criteria

### Deploy Configuration
- `.github/workflows/deploy.yml` — GitHub Pages deploy workflow; documents the `VITE_PARTYKIT_HOST` env var as a secret; `vite build` + Pages artifact upload
- `partykit.json` — PartyKit project config (`name: virtual-deck`, `main: party/index.ts`); the host URL is `virtual-deck.aaronkaminsky.partykit.dev`
- `vite.config.ts` — `base: '/virtual-deck/'` (required for GitHub Pages path routing)

### Dev Commands
- `package.json` — Canonical source for all npm scripts: `npm run dev` (partykit), `npm run dev:client` (vite), `npm test` (vitest), `npm run test:e2e` (playwright), `npm run build`, `npm run deploy`

### Test Infrastructure
- `playwright.config.ts` — Playwright config (dual webServer setup); relevant for documenting test prerequisites
- `README` for e2e prereqs: `npm run dev` + `npm run dev:client` must be running for e2e tests (or dual webServer handles it per playwright config)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No code to reuse — this phase writes documentation only.

### Established Patterns
- No README.md exists yet — writing from scratch.
- `.planning/PROJECT.md` has a well-structured "What This Is" section that can inform the intro paragraph.
- CLAUDE.md Dev Commands table is the authoritative command reference.

### Integration Points
- README.md will live at the repo root (where GitHub renders it by default).
- The README references `.planning/PROJECT.md` for key decisions — that file must exist (it does).

</code_context>

<specifics>
## Specific Ideas

- Architecture overview should explicitly cover three things: PartyKit server, hand masking (per-connection `viewFor`), and the client/server message flow.
- Deploy section should be a full pre-flight walkthrough — not just commands. This is the level of detail the user explicitly chose.
- The preview prose the user accepted during discussion is a good baseline for the architecture section:
  > "Virtual Deck is split into two parts: a React/Vite frontend deployed on GitHub Pages, and a PartyKit server running on Cloudflare's edge. The PartyKit server owns all game state in memory per room. It filters outgoing messages per connection so each player only receives their own hand data (hand masking). The client drives actions (move card, deal, shuffle) via typed messages; the server applies them, then broadcasts the updated state to each connected player with masking applied. Shared TypeScript types live in `src/shared/` and are imported by both the client and the `party/index.ts` server."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-developer-readme*
*Context gathered: 2026-04-28*
