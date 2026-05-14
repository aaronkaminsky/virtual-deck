# Virtual Deck

## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck. Players set a display name when joining, see each other's names on the table, and have a live presence roster showing who is connected or away.

## Core Value

Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## Current Milestone: v1.3 Layout & UX Polish

**Goal:** Redesign the board so it reads as a shared physical space — communal zone centered, controls out of the way, spread zones as interactive as the player hand, and the whole thing usable on a phone screen.

**Target features:**
- Communal zone repositioned to physical center of board
- Board layout reorganized with better vertical proportions
- Game controls collapsed into a dropdown/slide-out panel
- Responsive layout: scales to phone screen (mouse-only)
- Spread zone multi-card select (same UX as player hand)
- Spread zone card reorder by drag

## Current State

**v1.3 complete (2026-05-14).** All 8 requirements verified. **Phase 21 (live session verification) complete — SPREAD-02 verified across automated + manual gates.**

- ~2,700+ TypeScript LOC across `src/`, `party/`, `shared/`
- Stack: React 18 + Vite + shadcn v4 (dark felt theme) on GitHub Pages; PartyKit (Cloudflare edge) for server
- Full Playwright e2e infrastructure (8 tests, dual-server config, 2-BrowserContext fixture); Vitest unit suite (165 tests)
- Spread zones: personal zone per player + communal zone; multi-card set play (PLAY_CARD_SET)
- v1.3 additions: board layout redesign, collapsible controls panel, phone-responsive layout, spread zone multi-select, spread zone drag-reorder with group-reorder + undo + sentinel-based drop-to-end
- Developer README at repo root covering local setup, architecture, tests, deploy
- All 31 requirements across v1.0 + v1.1 + v1.2 satisfied and verified

**v1.1 delivered (2026-04-16 → 2026-04-19):**
- Drag origin placeholder — dashed outline holds origin slot during drag; pointerWithin collision detection scopes drops to visual boundaries
- Pile drop dialog keyboard UX — Escape cancels, Enter confirms Top, Top styled as primary
- Player identity + presence — lobby name gate, display names on all hand zones, presence dots, localStorage persistence
- Shuffle before deal — every deal auto-shuffles the pile first; card-fan animation synced to all players
- Empty pile fast path — no dialog when dropping onto an empty pile (card goes directly to top)

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

### Validated (v1.1)

- ✓ Players set a display name when joining a room (PRES-01) — Phase 9
- ✓ Display name visible to all players on table (PRES-02) — Phase 9
- ✓ Display name persists across reconnects (PRES-03) — Phase 9
- ✓ Real-time roster of connected/disconnected players (PRES-04) — Phase 9
- ✓ Shuffle deck before dealing (GAME-01) — Phase 10
- ✓ Skip pile position dialog for empty piles (UX-01) — Phase 11
- ✓ Pile drop dialog UX: Escape cancels, Enter confirms Top (UX-02/UX-03) — v1.1 pre-work (Phase 999.11)

### Validated (v1.2)

- ✓ Test mock helpers correctly model local vs remote player; viewFor masking tested (DEV-04) — Phase 12
- ✓ Playwright MCP server configured for Claude-driven browser testing (DEV-01) — Phase 13
- ✓ Playwright e2e test suite committed to repo (DEV-02) — Phase 13
- ✓ Personal play area zone per player — visible to all, face-up cards (PLAY-01) — Phase 14
- ✓ Shared communal zone on the table — any player can interact (PLAY-02) — Phase 14
- ✓ Player can play 1–5 cards from hand as a set into either zone (PLAY-03) — Phase 15
- ✓ Developer README with setup, architecture, and deploy instructions (DEV-03) — Phase 16

### Active (v1.3)

- ✓ Communal zone repositioned to physical center of board (LAYOUT-01) — Phase 17
- ✓ Board layout reorganized with better vertical proportions (LAYOUT-02) — Phase 17
- [ ] Game controls collapsed into a dropdown/slide-out panel (LAYOUT-03)
- [ ] Responsive layout: page scales to phone-sized screens (LAYOUT-04)
- [ ] Spread zone multi-card select matching player hand UX (SPREAD-01)
- [ ] Spread zone card reorder by drag (SPREAD-02)

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
| displayName required string (not optional) on Player | Consistent presence; empty string default avoids null checks everywhere | ✓ Validated Phase 9 |
| Deferred WebSocket connect via enabled flag | Name must be set before connecting so ?name= param is available on handshake | ✓ Validated Phase 9 |
| joinState null-check gates both socket and board render | Single source of truth for join progression; avoids partial render before connection | ✓ Validated Phase 9 |
| Two BrowserContexts per Playwright test (not two Pages) | usePlayerId.ts stores playerId in localStorage; same context = same token = both pages join as same player | ✓ Validated Phase 13 |
| mouse.move/down/move/up (steps:15) for dnd-kit e2e drag | Playwright dragAndDrop() uses HTML5 drag API; dnd-kit uses pointer events and ignores HTML5 events | ✓ Validated Phase 13 |
| Playwright MCP via .mcp.json only | Project-scoped dev tool; must never appear in package.json or CI scripts | ✓ Validated Phase 13 |
| Multi-card play via select-then-drag (not dnd-kit multi-drag) | dnd-kit multi-drag deferred; click-to-select + drag-selected-card-moves-all avoids dnd-kit multi-drag complexity | ✓ Validated Phase 15 |
| aria-pressed placed after `{...attributes}` spread in dnd-kit components | dnd-kit's `attributes` object contains its own `aria-pressed`; explicit override must come last to avoid TS2783 | ✓ Validated Phase 15 |
| `:not(:has([role="button"]))` to count leaf card elements in spread zone | Each card renders two nested `[role="button"]` divs (useSortable outer + useDraggable inner); leaf selector gives correct card count | ✓ Validated Phase 15 |
| `SpreadZone` optional `className` prop forwarded last to inner `cn(...)` | Caller-supplied utilities (e.g. `w-full`) win via tailwind-merge last-wins; all existing call sites unchanged | ✓ Validated Phase 17 |
| Remove `DraggableCard` nesting inside `SortableSpreadCard` | Nested `useDraggable` inside `useSortable` registered duplicate dnd-kit IDs; direct `CardFace`/`CardBack` render eliminates collision | ✓ Validated Phase 17 |
| `import.meta.env.DEV` over `process.env.NODE_ENV` in Vite projects | `process` not in scope in Vite's browser bundle; `import.meta.env.DEV` is the canonical Vite dev guard | ✓ Validated Phase 17 |

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
*Last updated: 2026-05-03 — Phase 16.1 complete; PartyKit now auto-deploys on push to main alongside GitHub Pages*
