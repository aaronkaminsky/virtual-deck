# Virtual Deck

## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck. Players set a display name when joining, see each other's names on the table, and have a live presence roster showing who is connected or away.

## Core Value

Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## Current Milestone: v1.4 Table Polish

**Goal:** Reduce minor annoyances in the play area through layout simplification, better pile/zone interaction, and hand management improvements.

**Target features:**
- Show Hand — toggle to flip hand face-up/down for all players
- Select All — "select all" button on piles and spreads; use existing multi-card drag
- Play Area Grid — grid layout option in communal spread zone
- Layout Simplifications — no body text on empty zones; pile controls to top; personal spreads closer to table; vertical space reduction
- Collapse Empty Spreads — hide personal zones when empty, reappear on first card drop
- Hand Sort — cycle sort modes: original, by suit, by rank

## Current State

**v1.4 shipped (2026-05-18).** All 53 requirements across v1.0–v1.4 satisfied and shipped.

- ~2,700+ TypeScript LOC across `src/`, `party/`, `shared/`
- Stack: React 18 + Vite + shadcn v4 (dark felt theme) on GitHub Pages; PartyKit (Cloudflare edge) for server
- Full Playwright e2e infrastructure (8 tests, dual-server config, 2-BrowserContext fixture); Vitest unit suite (165+ tests)
- Hand management: hand reveal toggle (Eye/EyeOff), sort by suit/rank, undo-exempt via `skipSnapshot`
- Play area: communal 2-row grid zone with per-cell stacking + intra-grid drag; personal spread zones with Select All + group drag
- Board: compact layout — empty zones label-only, pile controls in header row, personal spreads hidden when empty, reduced zone heights
- CI: GitHub Actions deploys both Vite frontend (GitHub Pages) and PartyKit server atomically on push to main

**Next milestone:** TBD — see Backlog in ROADMAP.md for candidates.

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

### Validated (v1.3)

- ✓ Communal zone repositioned to physical center of board (LAYOUT-01) — Phase 17
- ✓ Board layout reorganized with better vertical proportions (LAYOUT-02) — Phase 17
- ✓ Game controls collapsed into a collapsible panel triggered by a single header button (LAYOUT-03) — Phase 18
- ✓ Board usable at ≥375px phone-width without horizontal scroll (LAYOUT-04) — Phase 19
- ✓ Click-to-select multiple spread zone cards with same ring/lift UX as player hand (SPREAD-01) — Phase 20
- ✓ Drag-reorder within spread zone coexists with multi-select; undo reverses reorders (SPREAD-02) — Phase 21
- ✓ Drag selected set from spread zone to pile, hand, or another spread zone (SPREAD-03) — Phase 20
- ✓ Spread zone drag interactions stable; dnd-kit ID collision (SortableSpreadCard/DraggableCard) resolved (SPREAD-04) — Phase 17

### Validated (v1.4)

- ✓ Player can toggle their hand face-up to reveal all cards to other players (HAND-01) — Phase 22
- ✓ Player can toggle their hand face-down to re-hide their cards (HAND-02) — Phase 22
- ✓ Hand revealed/hidden state is broadcast in real time to all connected players (HAND-03) — Phase 22
- ✓ Hand revealed state is persisted in server room state so reconnecting players see the correct current state (HAND-04) — Phase 22
- ✓ Player can cycle through hand sort modes: original, by suit, by rank; sort does not enter undo stack (SORT-01) — Phase 23
- ✓ Player can click "Select All" on any pile to select all cards (SELECT-01) — Phase 23
- ✓ Player can click "Select All" on any spread zone to select all cards (SELECT-02) — Phase 23
- ✓ A "Select All" group can be dragged to any valid drop target using existing multi-card drag (SELECT-03) — Phase 23
- ✓ Communal spread zone displays as a 2-row fixed grid; cards snap to cell positions; stacking per cell supported; intra-grid drag works (GRID-01) — Phase 24
- ✓ Empty piles and spread zones display no body text — label above is sufficient (POLISH-01) — Phase 25
- ✓ Pile zone controls appear at the top of each pile, inline with the label (POLISH-02) — Phase 25
- ✓ Personal spread zones are positioned closer to the communal/draw/discard area (POLISH-03) — Phase 25
- ✓ Zone heights and spacing are reduced for a more compact board (POLISH-04) — Phase 25
- ✓ Personal spread zones are hidden when empty; a drop target appears when the player begins dragging a card (ZONE-01) — Phase 25

### Active (v1.5)

*(Next milestone not yet defined — run `/gsd:new-milestone` to start)*

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
| ControlsBar as Base-UI Popover triggered by hamburger icon | Single button clears board surface; Popover handles focus-trap, keyboard dismiss, and outside-click; no custom overlay needed | ✓ Validated Phase 18 |
| PileZone controls as 28×28px icon-only buttons (lucide-react) | Text labels (~110px) caused overflow at 375px; icon buttons fit three pile columns at phone-width | ✓ Validated Phase 19 |
| OpponentHand capped at 5 visible card backs + overflow count | Uncapped opponent hands push board off-screen at narrow widths; 5-card cap with badge preserves spatial honesty | ✓ Validated Phase 19 |
| `selectionSource` zone-exclusive state (not shared with hand selection) | Spread zone and hand have separate selection contexts; mixing them caused badge off-by-one and wrong-zone drag dispatch | ✓ Validated Phase 20 |
| `SortableSentinel` (flex: 1 droppable) appended to SpreadZone/HandZone | Zero-size sentinel had ~0.5px `closestCenter` target; flex: 1 sentinel makes drop-to-end reliably reachable | ✓ Validated Phase 21 |
| Group reorder insert direction via `event.delta.x` | `overIdx` as unconditional insert-before misaligned with visual feedback when dragging right; delta direction check matches animation | ✓ Validated Phase 21 |
| `takeSnapshot` added to REORDER_HAND and REORDER_PILE_SPREAD | Reorder operations were not undoable; snapshot before reorder enables undo to restore prior card order | ✓ Validated Phase 21 |
| `handRevealed` server-owned; viewFor masking via `opponentRevealedHands` | Prevents clients from forging revealed state; viewFor masking keeps the hand privacy invariant intact for revealed hands | ✓ Validated Phase 22 |
| `skipSnapshot?: boolean` on REORDER_HAND | Sort is a display preference, not a game move — excluding it from undo stack matches player expectations (SORT-01 requirement) | ✓ Validated Phase 23 |
| Select All on pile selects top card only | Interior cards are masked client-side (client has no card IDs for them); PLAY_CARD_SET would reject them | ✓ Validated Phase 23 |
| `MOVE_GRID_CARD` as separate action from REORDER_PILE_SPREAD | Keeps personal spread zones unaffected; grid and spread are semantically distinct | ✓ Validated Phase 24 |
| Grid cell IDs prefixed `grid-cell-`; `toId` is pile ID not cell ID | Allows pointerWithin collision to route intra-grid drags independently; ensures isIntraSpreadReorder suppresses MOVE_CARD for intra-grid drags | ✓ Validated Phase 24 |
| SpreadZone hidden when empty with drag-reveal via `isOver`/`isDragging` | Personal zones claiming vertical space when unused was the biggest waste of board area | ✓ Validated Phase 25 |

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
*Last updated: 2026-05-18 after v1.4 milestone — Table Polish*
