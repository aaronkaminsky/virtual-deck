# Virtual Deck

## What This Is

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck. Players set a display name when joining, see each other's names on the table, and have a live presence roster showing who is connected or away.

## Core Value

Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

## Current State

**v1.6 shipped (2026-05-27).** All 82 requirements across v1.0–v1.6 satisfied and shipped.

- ~3,000+ TypeScript LOC across `src/`, `party/`, `shared/`
- Stack: React 18 + Vite + shadcn v4 (dark felt theme) on GitHub Pages; PartyKit (Cloudflare edge) for server
- Full Playwright e2e infrastructure (20+ tests, dual-server config, 2-BrowserContext fixture); Vitest unit suite (250+ tests)
- Layout: fixed left sidebar (draw + discard piles); free canvas play area to the right; opponent spreads docked below owner hands
- Canvas: cards positioned absolutely with (x, y, z); PLACE_ON_CANVAS action; z=max+1 on drop; NOLOSS cancel behavior; group selection with ring/lift UX; all-or-nothing bounds rule on group drops; edge-pan arrows for mobile
- Overlap hit-testing: topmost card receives pointer events; 50% drag opacity; box-shadow indicator on >50% coverage
- Zones: empty personal spread shows faint dashed strip (¼ height); no zone name labels; opponent spreads have no face-toggle control; hover-only drop-target outline on opponent hand
- Piles: count badge hidden at 0; controls row tight against pile card; Select All works correctly
- Hand sort: render-time-only visual overlay; original order = current server/manual order
- Board: min-w-[320px] prevents zone overlap at narrow viewports; canvas height distributes via flex-1
- CI: GitHub Actions deploys both Vite frontend (GitHub Pages) and PartyKit server atomically on push to main

**Next milestone:** TBD — pick a backlog item from `docs/superpowers/specs/BACKLOG.md` and run the `brainstorming` skill to plan it.

## Previous Milestone: v1.6 Free Canvas Play Area (SHIPPED 2026-05-27)

Replaced the fixed communal grid with a free-form canvas: absolute (x, y, z) positioning, no-card-loss invariant, topmost-card hit-testing, multi-card group drop, and mobile edge-pan. See `.planning/milestones/v1.6-ROADMAP.md` for full details.

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

### Validated (v1.5)

- ✓ Opponent spread zones appear directly below their owner hands in the board area (LAYOUT-05) — Phase 30
- ✓ Empty personal spread zone shows ¼-height faint dashed strip; controls hidden until cards present (LAYOUT-06) — Phase 27
- ✓ Spread zone name labels removed — identity conveyed by adjacent hand header (LAYOUT-07) — Phase 26
- ✓ Select all button works correctly on piles and spread zones — ring feedback on selected pile top card (BUG-01) — Phase 28
- ✓ Communal grid collapses to 4 columns at < 640px viewport (BUG-02) — Phase 28
- ✓ Pile count badge hidden when pile is empty; shown only when count ≥ 1 (POLISH-05) — Phase 26
- ✓ Pile controls row sits visually tight against the pile card below it (POLISH-06) — Phase 26
- ✓ Opponent spread zone has no face-toggle control (CTRL-05) — Phase 26
- ✓ Opponent hand drop-target outline appears on hover only, not on drag start (CTRL-06) — Phase 27
- ✓ Grid zone face-toggle icon positioned near the zone label, not inside the card grid (CTRL-07) — Phase 26
- ✓ Hand sort "original order" = current server/manual order; render-time-only; locked with non-mutation invariant test (SORT-02) — Phase 29

### Validated (v1.6, Phase 31)

- ✓ Communal grid zone fully removed; GRID-01 region code deleted (MIGRATE-01) — Phase 31
- ✓ Draw and discard piles in fixed left sidebar, vertically stacked, with free canvas area to the right (MIGRATE-02) — Phase 31
- ✓ Reset table moves all canvas cards to draw pile; canvas clears on reset (MIGRATE-03) — Phase 31

### Validated (v1.6, Phase 32)

- ✓ Player can drag any card (hand, pile, spread) onto the free canvas; card anchors at the drop point (CANVAS-01) — Phase 32
- ✓ Player can reposition a canvas card by dragging it to a new location; real-time sync to all players (CANVAS-02) — Phase 32
- ✓ Canvas cards render in z-order; newly placed/moved card always renders on top (CANVAS-03) — Phase 32
- ✓ Canvas card can be dragged to a pile or hand using existing dialogs/drop targets (CANVAS-04) — Phase 32
- ✓ No card loss on missed drop or Escape cancel — card returns to prior position (NOLOSS-01) — Phase 32

### Validated (v1.6, Phases 33–35)

- ✓ Topmost canvas card receives all pointer events; cards beneath are non-interactive (OVERLAP-01) — Phase 33
- ✓ Dragged canvas card renders at ~50% opacity so cards beneath are visible (OVERLAP-02) — Phase 33
- ✓ Box-shadow layering indicator when card covers >50% of a lower card; ref-not-state tracking (OVERLAP-03) — Phase 33
- ✓ Player can click-to-select multiple canvas cards with ring/lift UX (MULTI-01) — Phase 34
- ✓ Group drop preserves pre-drag relative offsets between selected cards (MULTI-02) — Phase 34
- ✓ All group-dropped cards receive z-indices above existing canvas cards (MULTI-03) — Phase 34
- ✓ Group drop cancelled entirely if any card would overflow canvas bounds (MULTI-04) — Phase 34
- ✓ Hold-to-scroll edge arrows pan canvas continuously without lifting finger (MOBILE-01) — Phase 35
- ✓ Edge-pan does not conflict with one-finger card drag gestures (MOBILE-02) — Phase 35
- ✓ Canvas height distributes via flex-1 so spread zones remain visible at narrow viewports (MOBILE-03) — Phase 35

### Active

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
| SORT-02 "original order" = server/manual order (not deal order); implemented as render-time visual overlay; `buildSortDispatch` and `sendAction` removed from sort path | Sort is display-only — mutating server state for a visual preference would pollute undo stack and cause sync issues | ✓ Validated Phase 29 |
| `MeasuringStrategy.Always` on DndContext after DOM restructure | After moving opponent spreads out of header band, dnd-kit cached stale droppable rects; Always re-measures every frame | ✓ Validated Phase 30 |
| Opponent spreads in a `flex-shrink-0` board area row with `w-7` spacer for column alignment | Docking spreads below their hands required matching the hand column width; spacer equals the controls-bar width so spreads align under hand cards | ✓ Validated Phase 30 |
| Hover-only OpponentHand drop-target via `isOver` (not `isDragging`) | Outline was firing at drag start because `isDragging` is true globally; `isOver` scopes the highlight to the specific droppable being hovered | ✓ Validated Phase 27 |
| `CanvasCard` as standalone type (`{card, x, y, z}`) rather than extending `Pile` | Type extension kept existing MOVE_CARD/UNDO/viewFor handlers untouched; separate `canvasCards[]` field is cleaner than adding optional canvas fields to every Pile | ✓ Validated Phase 32 |
| `CanvasDraggableCard` uses `useDraggable` only (no `useDroppable` per card) | Canvas zone is the single droppable; individual cards being droppable would create z-order collision detection complexity — handled in Phase 33 overlap hit-testing | ✓ Validated Phase 32 |
| `PLACE_ON_CANVAS` handles both initial placement and canvas→canvas repositioning | Unified single action with `z=max+1` keeps undo symmetric; server computes z to prevent client race conditions | ✓ Validated Phase 32 |
| `viewFor()` broadcasts `canvasCards` without masking | Canvas cards are placed face-up by design (D-04); no privacy concern since placement is a deliberate public act | ✓ Validated Phase 32 |
| `GROUP_PLACE_ON_CANVAS` as atomic server action; server computes all z-indices in one pass | Prevents client race condition where two simultaneous group drops corrupt z-order; atomicity also simplifies undo (single snapshot) | ✓ Validated Phase 34 |
| All-or-nothing bounds rule for group drops (not anchor-and-clamp) | Partial placement creates confusing UI state where some cards move and others don't; all-or-nothing matches physical card intuition | ✓ Validated Phase 34 |
| `scrollOffsetRef` shared via prop chain (CanvasZone → BoardView → BoardDragLayer), not state | Drop math needs live scroll value at pointer-up moment; state would capture stale value causing off-position drops after panning | ✓ Validated Phase 35 |
| Canvas height via `flex-1` row (no hard `max-h` cap) | `max-h-[240px]` caused pile sidebar / canvas height mismatch; flex-1 correctly distributes available height based on surrounding zone sizes | ✓ Validated Phase 35 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase / unit of work ships:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with a reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-27 after v1.6 milestone (Free Canvas Play Area)*
