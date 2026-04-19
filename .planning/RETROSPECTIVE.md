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

## Milestone: v1.1 — Social Identity + UX Polish

**Shipped:** 2026-04-19
**Phases:** 5 (999.10, 999.11 pre-work + 9, 10, 11) | **Plans:** 11 | **Timeline:** 4 days (2026-04-16 → 2026-04-19)

### What Was Built

- Drag origin placeholder — dashed card-shaped outline holds origin slot during drag; `pointerWithin` custom collision detection scopes all drop zones to visual element boundaries
- Pile drop dialog keyboard UX — Escape/click-outside cancels and snaps card back to origin; Enter confirms Top via auto-focus; Top styled as primary button
- Player identity system — lobby name input gate, `displayName` on `Player` type, name labels + presence dots on all hand zones, localStorage persistence, reconnect preservation via stable token
- Shuffle before deal — `PILE_SHUFFLED` event; `DEAL_CARDS` auto-shuffles via Fisher-Yates before distributing; client card-fan animation synced to all players simultaneously
- Empty pile fast path — `isEmpty` guard in `handleDragEnd` bypasses position dialog; card dispatched directly to top

### What Worked

- **Pre-work phases (999.10/999.11)** — inserting UX polish phases before the named milestone phases meant Phase 9 had a clean, polished drag surface to build on. The order mattered.
- **Deferred WebSocket connect pattern** — gating the socket `enabled` flag on `joinState !== null` gave a single clean moment to assert `?name=` is present before connecting. No race conditions.
- **`@base-ui/react/dialog` initialFocus** — auto-focusing the Top button was a one-liner once we knew the API. The v1.0 decision to use `@base-ui` over `AlertDialog` paid off immediately when adding keyboard UX.
- **Server-side isEmpty check unnecessary** — the client-side isEmpty guard was sufficient because the pile state is authoritative from the server's last broadcast. No extra server round-trip needed.

### What Was Inefficient

- **Phase 999.10 UAT issue (drop zone size)** — the oversized drop zones were only discovered during human UAT, not automated testing. The issue required a follow-up plan (pointerWithin collision). A bounding-box test for drop zone dimensions at plan time would surface this earlier.
- **Audit false positives at close** — the `audit-open` tool flagged both passed UAT files as gaps. The `[awaiting human testing]` stale text in Phase 11's UAT file caused the false positive. Always clear that field when testing is done.
- **Card-fan animation prop drilling** — `shufflingPileIds` had to be drilled through `App → BoardDragLayer → BoardView → PileZone`. If the component tree grows, this will become noise. A context or zustand slice would be cleaner.

### Patterns Established

- `enabled` flag pattern for deferred WebSocket connect — `usePartySocket({ enabled: joinState !== null })` is the canonical way to gate connection on pre-join data
- `joinState` null-check as single render gate — `if (!joinState) return <LobbyView />` eliminates partial renders before connection state is resolved
- `pointerWithin` for visual-boundary drop zones — use `collisionDetection={pointerWithin}` on `DndContext` when drop zones should match their visible rect, not their DOM container
- `React.forwardRef` on Button for `initialFocus` — any dialog that needs keyboard auto-focus requires a ref-forwarding wrapper on the target button

### Key Lessons

1. **Name identity must be stable before connection.** Trying to update `?name=` after the WebSocket handshake would require a separate message round-trip. Deferred connect is cleaner and correct.
2. **Drop zone size is invisible to automated tests.** The oversized hand zone bug survived unit tests and integration tests — it only appears when a human tries to miss a drop. UAT scenarios should explicitly test "miss" cases for drag affordances.
3. **Pre-work phases are worth naming explicitly.** Phases 999.10/999.11 were labeled "pre-work" but were full phases with UAT. Treating them as first-class phases with their own plans and verification produced better artifacts than if they'd been folded into Phase 9.
4. **Animation state belongs in the hook, not the component.** Putting `shufflingPileIds` in `usePartySocket` kept `PileZone` purely declarative — it just reads a prop and renders. The animation timing logic stays co-located with the event that triggers it.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~4 estimated
- Notable: Milestone was tight (4 days, 11 plans) — pre-work phases added scope but were completed cleanly without extending timeline

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 (+2 bonus) | 21 | First milestone — baseline established |
| v1.1 | 5 (2 pre-work + 3) | 11 | Faster cadence; pre-work phase pattern introduced |

### Cumulative Quality

| Milestone | Tests | Key Patterns |
|-----------|-------|-------------|
| v1.0 | 89 passing | WebSocket buffer, server-first privacy, stable player identity |
| v1.1 | — | pointerWithin collision, deferred connect, joinState null-gate |

### Top Lessons (Verified Across Milestones)

1. Prove the core invariant first (hand masking in Phase 1)
2. Run `gsd-audit-milestone` before closing — always surfaces something
