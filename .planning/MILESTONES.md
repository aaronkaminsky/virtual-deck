# Milestones

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
