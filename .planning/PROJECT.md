# Virtual Deck

## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck.

## Core Value

Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## Current Milestone: v1.1 Social Identity + UX Polish

**Goal:** Add player identity and presence, improve dialog UX, and fill the shuffle-before-deal gap.

**Target features:**
- PRES-01: Players set a display name when joining a room
- PRES-02: All players see who is connected and disconnected
- 999.8: Shuffle deck before dealing
- 999.9: Skip position dialog when dropping onto an empty pile
- 999.11: Pile drop dialog — Escape cancels, Enter confirms Top

## Current State

**v1.0 shipped 2026-04-12.** Full card table deployed and playable.

- ~1,989 TypeScript LOC across `src/`, `party/`, `shared/`
- 89 tests passing (vitest)
- Stack: React 18 + Vite + shadcn v4 (dark felt theme) on GitHub Pages; PartyKit (Cloudflare edge) for server
- All 19 v1 requirements satisfied and verified

Known remaining items (deferred backlog):
- Copy-link affordance added to BoardView (v1.0 tech debt closed)
- 9 backlog phases queued (drag affordance polish, pile position dialog UX, play area grid, etc.)
- Phase 999.10 complete (2026-04-17): drag-origin placeholder — dashed outline at card origin slot during drag; custom collision detection (pointerWithin) for hand, opponent-hand, and pile drop zones so drops only register when pointer is physically inside the target rect
- Phase 999.11 complete (2026-04-17): pile drop dialog UX — Escape/click-outside cancels pending move, Top button auto-focuses on open so Enter confirms top placement, Top uses primary button style

## Requirements

### Validated (v1.0)

- ✓ Player can create a room and receive a shareable link/code — v1.0 (ROOM-01)
- ✓ Player can join a room by entering a room code or shared link — v1.0 (ROOM-02)
- ✓ Room supports 2–4 simultaneous players — v1.0 (ROOM-03)
- ✓ Player can rejoin after disconnect; private hand restored — v1.0 (ROOM-04)
- ✓ Room initializes with a standard 52-card deck — v1.0 (DECK-01)
- ✓ Deck shuffle uses Fisher-Yates + crypto.getRandomValues server-side — v1.0 (DECK-02)
- ✓ Card face and back art swappable via code change — v1.0 (DECK-03)
- ✓ Shared table with configurable pile/zone types — v1.0 (TABLE-01)
- ✓ Card count visible to all players per pile — v1.0 (TABLE-02)
- ✓ Opponent hand card counts visible (face values not) — v1.0 (TABLE-03)
- ✓ Drag-and-drop cards between hand, table zones, and piles — v1.0 (CARD-01)
- ✓ Draw a card from the top of any pile — v1.0 (CARD-02)
- ✓ Flip any card face-up or face-down — v1.0 (CARD-03)
- ✓ Pass a card directly to another player's private hand — v1.0 (CARD-04)
- ✓ Player's hand is private; server-side enforced — v1.0 (CARD-05)
- ✓ Deal N cards from a pile to each player's hand — v1.0 (CTRL-01)
- ✓ Shuffle any pile on the table — v1.0 (CTRL-02)
- ✓ Reset the table (all cards to draw pile, reshuffled) — v1.0 (CTRL-03)
- ✓ Undo last card move — v1.0 (CTRL-04)

### Active (v1.1)

- [ ] Players set a display name when joining a room (PRES-01)
- [ ] All players see who is connected and disconnected (PRES-02)
- [ ] Shuffle deck before dealing (GAME-01)
- [ ] Skip pile position dialog for empty piles (UX-01)
- [x] Pile drop dialog UX: Escape cancels, Enter confirms Top (UX-02) — Validated in Phase 999.11

### Out of Scope

- Rule enforcement — no game logic, turn enforcement, or win conditions
- Score tracking — honor system
- In-app chat — players use voice/video separately
- Accounts / auth — room link is the only access control
- Card art configurator UI — images swapped in code
- Mobile-first layout — drag-and-drop UX is significantly worse on touch

## Constraints

- **Hosting**: GitHub Pages (static frontend) + PartyKit Cloud — no traditional server or database
- **Cost**: Free tier only — no paid infrastructure
- **Scale**: 2–4 players per session; no need to optimize for large concurrent rooms
- **Card art**: Customization is a code change, not a runtime config — simplifies data model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PartyKit over Supabase | In-memory edge state = low-latency card drags; server can mask hand data per connection | ✓ Validated v1.0 |
| Server-authoritative hand masking | Prevents clients from reading other players' hand data via network inspection | ✓ Validated v1.0 |
| No rule enforcement | Preserves flexibility of in-person play; rules vary by game | — Pending |
| Card art via code change only | Rare operation; avoids UI complexity and asset upload infrastructure | ✓ Validated v1.0 |
| React + Vite + shadcn | Component model maps cleanly to Card/Hand/Pile; shadcn dark-felt theme | ✓ Validated v1.0 |
| Query-param room routing (`?room=`) | Avoids GitHub Pages 404 on path-based routes | ✓ Validated v1.0 |
| Per-connection broadcast (not room.broadcast) | Hand masking requires each client gets only its own cards via viewFor | ✓ Validated v1.0 |
| Stable player token in localStorage + ?player= URL param | Reconnect correctness — connection.id changes on reconnect | ✓ Validated v1.0 |
| isDraggingRef (useRef not useState) in usePartySocket | Preserves live value in WS closure; useState would capture stale value | ✓ Validated v1.0 |
| @base-ui/react/dialog for pile insert dialog | AlertDialog hardcodes disablePointerDismissal which breaks click-outside dismiss | ✓ Validated v1.0 |
| insertPosition optional on MOVE_CARD (defaults to top) | Backward compatible with all existing dispatches; pile insert dialog is additive | ✓ Validated v1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 — Phase 999.11 complete (pile drop dialog UX improvements)*
