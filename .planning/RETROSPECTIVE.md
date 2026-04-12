# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-12
**Phases:** 8 (+ 2 bonus backlog) | **Plans:** 21 | **Timeline:** 15 days (2026-03-28 → 2026-04-12)

### What Was Built

- Server-authoritative PartyKit room with per-connection hand masking — no player can inspect another's cards via DevTools
- Full drag-and-drop card table: hand ↔ pile ↔ opponent hand, with WebSocket state buffered during active drags to prevent snap-back
- Six game controls: flip, pass, deal N cards, shuffle pile, reset table, undo
- Reconnect-to-hand: stable player token in localStorage + `?player=` URL param survives page reload and disconnect
- Post-drop pile insert position dialog (Top/Bottom/Random) using `@base-ui/react/dialog`
- OpponentHand drag affordance with visual drop target cue

### What Worked

- **Server-first sequence** — building and verifying the PartyKit server before any UI meant hand masking was proven correct before any client code shipped. No retrofitting privacy later.
- **GSD phase structure** — having Wave 0 (types/stubs), Wave 1 (implementation), Wave 2 (integration) forced clear interfaces between plans, reducing rework.
- **Quick tasks for scope creep** — small mid-phase additions (hand reordering, TABLE-03 opponent count) were captured as quick tasks rather than expanding phase scope, keeping plans clean.
- **Post-milestone audit** — running `gsd-audit-milestone` before closing the milestone surfaced the host fallback bug and LobbyPanel copy-link issue before shipping. Phases 6–8 closed all gaps cleanly.

### What Was Inefficient

- **ROADMAP.md progress table drift** — the progress table fell behind actual completion state (phases 2–4 showed "In Progress" after they were done). Required a dedicated Phase 8 to fix. Worth automating or updating in-place during execution.
- **Some SUMMARY frontmatter gaps** — DECK-02, TABLE-03, and ROOM-04 had documentation inconsistencies across SUMMARY and VERIFICATION files. A post-phase frontmatter check step would catch these before the audit.
- **Nyquist compliance left for cleanup** — phases 1, 3, 4 had incomplete VALIDATION.md files at audit time, requiring Phase 7 to close. Running `gsd-validate-phase` at phase completion would eliminate this.

### Patterns Established

- `isDraggingRef = useRef(false)` (not useState) in `usePartySocket` — preserves live value inside the WebSocket message closure
- WebSocket state buffer (`bufferRef`) during active dnd-kit drag — flushed on drag end to prevent snap-back from mid-drag server updates
- Inner component pattern (`RoomView`) — isolates hooks that require non-null props from App-level conditional rendering
- `@base-ui/react/dialog` over `AlertDialog` for dismissible dialogs — AlertDialog hardcodes `disablePointerDismissal:true`
- `insertPosition` optional on `MOVE_CARD` defaults to top server-side — additive API change; all existing dispatches unchanged

### Key Lessons

1. **Prove the hard invariant first.** Hand masking (the core value) was validated in Phase 1 via DevTools frame inspection before any UI existed. This gave confidence that everything built on top was correct.
2. **Audit before calling done.** The v1.0 audit found a latent production host fallback bug that deploy.yml masked. Running `gsd-audit-milestone` before completion is worth the time.
3. **Stable identity beats connection ID.** Using `?player=` URL param + localStorage token instead of `connection.id` for player identity is the only thing that makes reconnect-to-hand work. Lesson: any feature requiring state continuity across reconnects needs stable identity from day one.
4. **dnd-kit state buffering is non-negotiable.** Without the WebSocket buffer, any server state update during an active drag causes visual snap-back. The pattern (ref + flush on dragEnd) should be the default starting point for any drag feature.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~15 estimated
- Notable: GSD subagent pattern (gsd-executor, verification agents) kept main context lean; most heavy lifting happened in spawned agents

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 (+2 bonus) | 21 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Key Patterns |
|-----------|-------|-------------|
| v1.0 | 89 passing | WebSocket buffer, server-first privacy, stable player identity |

### Top Lessons (Verified Across Milestones)

1. Prove the core invariant first (hand masking in Phase 1)
2. Run `gsd-audit-milestone` before closing — always surfaces something
