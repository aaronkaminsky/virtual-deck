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
