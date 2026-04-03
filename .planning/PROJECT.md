# Virtual Deck

## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck.

## Core Value

Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## Requirements

### Validated

- [x] Join a game via shareable room link or code — Validated in Phase 02: lobby-room-join
- [x] Support 2–4 players per room — Validated in Phase 02: lobby-room-join
- [x] Card art (face and back) is swappable via code change — Validated in Phase 02: lobby-room-join (DECK-03)

### Active

- [ ] Shared table with multiple configurable piles/zones (e.g. draw pile, discard pile, play area)
- [ ] Private hands — each player sees only their own cards; others see card backs
- [ ] Drag-and-drop card movement between hand, table zones, and piles
- [ ] Draw from the top of any pile (shared or personal)
- [ ] Flip any card face-up or face-down
- [ ] Shuffle any pile with true randomization (cryptographically random or equivalent)
- [ ] Deal cards — distribute N cards from a pile to each player's hand
- [ ] Pass a card directly to another player's private hand
- [ ] Join a game via shareable room link or code
- [ ] Support 2–4 players per room
- [ ] Card art (face and back) is swappable via code change — not a UI feature

### Out of Scope

- Rule enforcement — no game logic, turn enforcement, or win conditions; players call their own game
- Score tracking — honor system; no scorekeeping UI
- In-app chat — players are expected to be on a voice/video call separately
- Accounts / auth — no login required; room link is the only access control
- Card art configurator UI — images are swapped in code, not by end users

## Context

- For playing with 1–3 friends online; small scale, hobby use
- Stack decided: React or Vanilla JS frontend on GitHub Pages (static); PartyKit (Cloudflare edge) for real-time WebSocket state sync
- Server acts as authority: masks hand data per connection so players can't see each other's cards
- Free tier on both GitHub Pages and PartyKit covers all expected usage
- User is in San Jose; PartyKit will route to a nearby Cloudflare edge node (~sub-20ms latency locally)

## Constraints

- **Hosting**: GitHub Pages (static frontend) + PartyKit Cloud — no traditional server or database
- **Cost**: Free tier only — no paid infrastructure
- **Scale**: 2–4 players per session; no need to optimize for large concurrent rooms
- **Card art**: Customization is a code change, not a runtime config — simplifies data model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PartyKit over Supabase | In-memory edge state = low-latency card drags; server can mask hand data per connection | Validated Phase 01 |
| Server-authoritative hand masking | Prevents clients from reading other players' hand data via network inspection | Validated Phase 01 |
| No rule enforcement | Preserves flexibility of in-person play; rules vary by game — don't force a model | — Pending |
| Card art via code change only | Rare operation; avoids UI complexity and asset upload infrastructure | Validated Phase 02 |
| React + Vite + shadcn | Component model maps cleanly to Card/Hand/Pile; shadcn dark-felt theme; Tailwind v4 | Validated Phase 02 |
| Query-param room routing (`?room=`) | Avoids GitHub Pages 404 on path-based routes; all traffic hits index.html | Validated Phase 02 |

## Current State

Phase 02 complete — players can create rooms, share links, join via second tab, and identity persists across reloads. Deployed to GitHub Pages. Next: Phase 03 core board (card table, drag-and-drop, hand display).

---
*Last updated: 2026-04-03 after Phase 02: lobby-room-join*
