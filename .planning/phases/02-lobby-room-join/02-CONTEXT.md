# Phase 2: Lobby + Room Join - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the first deployed frontend: players can create or join a room via a shareable URL, with stable anonymous identity persisted in localStorage. No board UI. No player names. Card art infrastructure in place (placeholders only).

**In scope (Phase 2):**
- React + Vite frontend scaffold
- Room create/join flow
- Shareable URL via query param
- Stable player token in localStorage
- GitHub Pages deploy config
- `src/card-art.ts` constants file (DECK-03)

**Out of scope (Phase 2):**
- Player display names (PRES-01 — v2)
- Board UI, card rendering (Phase 3)
- Real card art images (Phase 3)
- Reconnect-to-hand (ROOM-04 — Phase 5)
</domain>

<decisions>
## Decisions

### Room Entry Flow
- Root URL (`/`) with no `?room` param → generate a new `nanoid` room ID and redirect to `/?room={id}`
- Any URL with `?room={id}` → join that room
- "Room not found" is not a UI state — PartyKit creates rooms on first connection, so any room ID works; stale/wrong codes just land in an empty room
- No landing screen, no explicit "Create Game" button

### URL / Routing Strategy
- Room ID lives in a query param: `?room=ABC123`
- No client-side router needed — URL is parsed directly from `window.location.search`
- Works on GitHub Pages with zero configuration (no 404.html trick)
- Shareable URL format: `https://{user}.github.io/virtual-deck/?room=ABC123`

### Player Identity
- Stable player token stored in `localStorage` under key `playerId`
- Token is a `nanoid`-generated UUID; generated once and persisted
- Passed to PartyKit as the PartySocket `id` param (already established in Phase 1 state)
- No player name — `Player` type stays as `{ id: string; connected: boolean }` — PRES-01 deferred to v2
- No name prompt in join flow

### Card Art (DECK-03)
- Single file: `src/card-art.ts`
- Exports:
  - `CARD_BACK_URL: string` — path to back-of-card image
  - `CARD_FACE_URL(card: Card): string` — returns face image path for a given card
- Phase 2: placeholder values only (e.g., empty string or a colored-rectangle data URI)
- Phase 3 will replace placeholders with real image paths — no other files need changing
- This is the "one file to edit" for DECK-03

### Frontend Scaffold
- React 18 + Vite 5 + TypeScript (per CLAUDE.md stack decision)
- `partysocket` already installed; connect using the player token as the PartySocket `id`
- GitHub Pages deploy: `vite build` + `base` config set to `/virtual-deck/` (repo name)
- No routing library — single-page app, query param only
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, requirements (ROOM-01, ROOM-02, DECK-03)
- `.planning/REQUIREMENTS.md` — Full requirement definitions
- `.planning/STATE.md` — Prior phase decisions (player token approach, PartyKit patterns)
- `src/shared/types.ts` — `Player`, `GameState`, `ClientGameState`, `ClientAction` types
- `party/index.ts` — PartyKit server (room lifecycle, message handling)
- `package.json` — Existing deps: `nanoid`, `partysocket` installed; React/Vite not yet
- `CLAUDE.md` — Stack decisions: React 18, Vite 5, TypeScript, no routing lib
</canonical_refs>

<deferred>
## Deferred Ideas

None raised during discussion.
</deferred>
