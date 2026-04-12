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
