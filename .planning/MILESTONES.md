# Milestones

## v1.5 Board Polish II (Shipped: 2026-05-23)

**Phases completed:** 5 phases, 8 plans, 14 tasks

**Key accomplishments:**

- PileZone badge conditionally rendered on `!isEmpty` eliminating the "0" badge, and outer wrapper gap tightened from gap-1 (4px) to gap-0.5 (2px)
- CTRL-06 — OpponentHand hover-only drop-target (Task 1)
- Thread selectedIds through BoardView into PileZone and DraggableCard, adding ring-1 ring-primary/30 ring feedback to selected pile top cards (BUG-01 fix)
- Communal grid zone collapses from 7 to 4 columns at mobile viewports using Tailwind's sm: breakpoint, with a Playwright regression test at 375px
- Hand sort converted to render-time-only visual overlay by deleting buildSortDispatch and stripping sendAction from handleSort, with non-mutation invariant test added to lock the D-04 original-order contract
- Opponent spreads moved from bg-card header band into a flex-shrink-0 board area row with column alignment via w-7 spacer, plus MeasuringStrategy.Always on DndContext
- Playwright e2e test for hand-to-personal-spread drag in post-restructure layout, with structural DOM assertion and useDndMonitor subscription-loss regression guard

---

## v1.4 Table Polish (Shipped: 2026-05-18)

**Phases completed:** 4 phases (22–25) · 10 plans
**Timeline:** 2026-05-15 → 2026-05-18 (3 days)
**LOC:** ~2,700+ TypeScript (stable; polish milestone added features without significant net growth)
**Files changed:** 84 files, +10,571 / -231 lines

**Key accomplishments:**

1. Hand Reveal — Eye/EyeOff toggle in HandZone header; `SET_HAND_REVEALED` server action with `viewFor()` masking via `opponentRevealedHands`; real-time broadcast to all players; reconnect sees correct state via `onStart()` migration guard (HAND-01–04)
2. Hand Sort — `SortMode` cycle button (original → by suit → by rank) dispatches `REORDER_HAND` with `skipSnapshot: true` so sort never enters undo stack; render-time visual sort via pure `sortCards()` and `buildSortDispatch()` exports (SORT-01)
3. Select All — "Select All" button on PileZone (top card) and SpreadZone (all face-up cards); `handleSelectAll` atomically replaces selection state; existing multi-card drag dispatches the group (SELECT-01–03)
4. Play Area Grid — 2-row communal `GridZone` with per-cell `useDroppable`, `MOVE_GRID_CARD` server action, intra-grid `useDndMonitor` dispatch, stack badge for multi-card cells, and face toggle; external→grid drops via optional `toRow`/`toCol` on `MOVE_CARD`/`PLAY_CARD_SET` (GRID-01)
5. Layout & Visual Polish — empty zones show label only; PileZone restructured to header row above card; personal spread zones hidden when empty with drag-reveal; compact zone heights 64px/88px across SpreadZone, PileZone, GridCell; personal spread band padding reduced (POLISH-01–04, ZONE-01)

**Known gaps at close:**

- 999.39: Grid mobile column count — desktop 7-column layout renders at all widths; `grid-cols-4` breakpoint not triggering on iPhone SE

**Archive:** `.planning/milestones/v1.4-ROADMAP.md` · `.planning/milestones/v1.4-REQUIREMENTS.md`

---

## v1.3 Layout & UX Polish (Shipped: 2026-05-15)

**Phases completed:** 8 phases, 24 plans, 27 tasks

**Key accomplishments:**

- Single `npm run deploy` step inserted into `build-and-deploy` job after Vite build, binding PARTYKIT_TOKEN at step scope only for atomic server+client CI deploys on push to main
- Pre-existing TypeScript error in BoardDragLayer.tsx
- Before (Row 2 + Row 3):
- 15-test logic-extraction suite locking the LAYOUT-03 Popover collapse contract (auto-close, confirmReset stale-state guard, enabled/disabled derivation) before the ControlsBar rewrite lands in plan 02
- `src/components/ControlsBar.tsx` — full rewrite
- 1. [Rule 1 - Bug] Import alias `test as base` caused ReferenceError
- Edit A — `src/components/PileZone.tsx` line 49:
- PileZone face-toggle and shuffle buttons converted from text-label (~110px wide) to 28x28px icon-only squares using Eye/EyeOff/Shuffle from lucide-react, closing Gap 1 from human UAT and fitting all three pile columns at 375px
- One-liner:
- Added `self-start` to ControlsBar wrapper div, pinning the hamburger button to the top-right of the header regardless of how tall the opponents strip grows
- Opponent card count Badge moved from card-back stack row into the name header row — always visible at 375px and any narrow column width
- Replaced overflow-x-auto with overflow-hidden and max-w-[200px] with flex-1 min-w-0 so the opponents row never scrolls horizontally and two opponents each get 50% of available width at mobile
- SelectionSource type alias
- Multi-card drag to opponent's hand moved only one card (badge off by one)
- Failing Vitest scaffolds (RED gate) pinning undo behavior for REORDER_PILE_SPREAD and REORDER_HAND, plus D-06 splice algorithm contract for group reorder
- takeSnapshot added to REORDER_HAND and REORDER_PILE_SPREAD in party/index.ts, flipping all 4 reorderUndo tests from RED to GREEN with zero regressions
- One-liner:

---

## v1.0 MVP (Shipped: 2026-04-12)

**Phases completed:** 8 phases (+ 2 bonus backlog) · 21 plans · 89 tests passing
**Timeline:** 2026-03-28 → 2026-04-12 (15 days)
**LOC:** ~1,989 TypeScript

**Key accomplishments:**

1. PartyKit server with per-connection hand masking, durable state persistence, 4-player cap, and hibernation — all game state server-authoritative from day one
2. React + Vite + shadcn frontend on GitHub Pages with dark green felt theme, card art swappable via code change (DECK-03)
3. Full drag-and-drop board (dnd-kit) — cards move between hand, piles, and opponent hand in real time with WebSocket state buffer during active drags
4. Six game controls: flip, pass card, deal N cards, shuffle pile, reset table, undo — all with server-side crypto randomization
5. Reconnect-to-hand with stable player tokens — disconnecting and rejoining restores private hand exactly (ROOM-04)
6. Post-drop pile position dialog (Top/Bottom/Random) with `@base-ui/react/dialog` for correct dismiss behavior

**Archive:** `.planning/milestones/v1.0-ROADMAP.md` · `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 Social Identity + UX Polish (Shipped: 2026-04-19)

**Phases completed:** 5 phases (999.10, 999.11 pre-work + 9, 10, 11) · 11 plans
**Timeline:** 2026-04-16 → 2026-04-19 (4 days)
**LOC:** ~2,202 TypeScript (+213 vs v1.0)
**Files changed:** 14 files, +362 / -143 lines

**Key accomplishments:**

1. Drag origin placeholder (Phase 999.10) — dashed card-shaped outline holds the origin slot during drag; custom `pointerWithin` collision detection scopes all drop zones to visual element boundaries
2. Pile drop dialog keyboard UX (Phase 999.11) — Escape/click-outside cancels and snaps card back, Enter confirms Top via auto-focus, Top styled as primary button
3. Player identity system (Phase 9) — lobby name input gate, `displayName` on Player type, name labels + presence dots on all hand zones, localStorage persistence, reconnect preservation
4. Shuffle before deal (Phase 10) — `PILE_SHUFFLED` event, auto-shuffle in `DEAL_CARDS` handler, client card-fan animation in PileZone synced to all players
5. Empty pile fast path (Phase 11) — `isEmpty` guard bypasses position dialog for empty piles; card goes directly to top (UX-01)

Known deferred items at close: 2 (see STATE.md Deferred Items — both are audit false positives, UAT status passed)

**Archive:** `.planning/milestones/v1.1-ROADMAP.md` · `.planning/milestones/v1.1-REQUIREMENTS.md`

---

## v1.2 Dev Infrastructure & Game Depth (Shipped: 2026-04-29)

**Phases completed:** 5 phases (12–16) · 14 plans
**Timeline:** 2026-04-20 → 2026-04-29 (9 days)
**LOC:** ~2,646 TypeScript (+444 vs v1.1)
**Files changed:** 110 files, +17,684 / -775 lines

**Key accomplishments:**

1. Shared test helper module (`tests/helpers.ts`) + broadcast masking tests — proves `viewFor` per-connection masking through the real `broadcastState` path; 114 → 130+ tests (Phase 12, DEV-04)
2. Playwright e2e infrastructure — dual-server config, two-BrowserContext isolation fixture, 5-scenario test suite covering state sync, deal, pass card, reset table, and hand privacy; `.mcp.json` for Claude Code dev sessions (Phase 13, DEV-01, DEV-02)
3. Spread zone type system — `Pile.region`/`Pile.ownerId` fields, idempotent personal zone creation in `onConnect`, `play` pile converted to communal spread zone, `viewFor` exposes `myPlayZoneId` (Phase 14, PLAY-01, PLAY-02)
4. SpreadZone component with cascade layout, intra-zone sort, face toggle, and BoardView 4-section restructure — personal zones per player + shared communal zone; 6 gaps found and closed during execution (Phase 14)
5. PLAY_CARD_SET — atomic multi-card hand → spread zone: auth gate, pre-validate-all, undo support, selection UX (ring+lift+badge+Escape), real-time 2-player sync (Phase 15, PLAY-03)
6. Developer README — local setup (two-terminal stack), architecture prose (PartyKit + viewFor + shared types), Vitest + Playwright test runners, GitHub Pages + PartyKit Cloud deploy procedure (Phase 16, DEV-03)

**Tech debt noted:**

- Missing VERIFICATION.md for phases 12, 13, 15 (process debt — work confirmed through UAT/SUMMARY/VALIDATION)
- Stale VALIDATION.md draft frontmatter for phases 12, 13, 14
- `tests/dealCards.test.ts` defines local helpers instead of importing from `tests/helpers.ts`
- Phase 14: 5 behaviors deferred to live human session (visual layout, drag-to-spread, face toggle sync, reorder, late-joiner re-deal)
- `communalZone` found by hardcoded pile ID `"play"` (fragile if ID changes)

**Archive:** `.planning/milestones/v1.2-ROADMAP.md` · `.planning/milestones/v1.2-REQUIREMENTS.md`

---
