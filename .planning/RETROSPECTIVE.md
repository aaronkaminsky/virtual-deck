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

## Milestone: v1.2 — Dev Infrastructure & Game Depth

**Shipped:** 2026-04-29
**Phases:** 5 (12–16) | **Plans:** 14 | **Timeline:** 9 days (2026-04-20 → 2026-04-29)

### What Was Built

- Shared test helper module + broadcast masking tests — viewFor per-connection masking proven through the real broadcastState path
- Playwright e2e infrastructure: dual-server config, BrowserContext isolation fixture, 5-scenario test suite, `.mcp.json` for Claude Code dev sessions
- Spread zones: `Pile.region`/`Pile.ownerId` type fields, idempotent personal zone per player in `onConnect`, communal zone from the existing `play` pile
- SpreadZone component with cascade layout, intra-zone sort via `REORDER_PILE_SPREAD`, face toggle — 6 gaps found and closed during Phase 14 execution
- PLAY_CARD_SET: atomic multi-card hand → zone with auth gate, pre-validate-all, undo support, and selection UX
- Developer README covering local setup, architecture (PartyKit + viewFor + shared types), both test runners, and deploy

### What Worked

- **Reusing `Pile` records for spread zones** — adding `region`/`ownerId` fields to the existing type meant MOVE_CARD, UNDO_MOVE, RESET_TABLE, and viewFor all worked unchanged. No new collection type, no parallel dispatch path.
- **BrowserContext isolation for Playwright** — discovering early that `usePlayerId.ts` stores the token in localStorage meant the two-BrowserContext pattern was identified at design time, not debugged at test time. The Phase 13 SUMMARY captures this as a key decision.
- **PLAY_CARD_SET pre-validate-all pattern** — validating all cardIds before any mutation (not one-at-a-time) made atomicity trivial. The `takeSnapshot` after validation and before mutation means undo always has a valid state to revert to.
- **Audit before close caught nothing critical** — `gsd-audit-milestone` confirmed tech_debt status (process gaps, no product blockers). v1.2 audit was the cleanest so far.

### What Was Inefficient

- **Phase 14 grew to 6 plans** — 2 were planned, 4 were gap-closure. The original 2-plan scope missed: late-joiner hand init, spread drop dialog bypass, sortable spread cards, communal zone migration, HandZone cascade, and intra-spread reorder insert position. A more thorough up-front research / discussion phase would have caught at least the last 3.
- **Stale VALIDATION.md frontmatter** — phases 12, 13, 14 all shipped with `status: draft` / `nyquist_compliant: false` even though their validation work was complete. The frontmatter sign-off step is consistently skipped. Either automate it or add it as a hard gate in the plan transition step.
- **Missing VERIFICATION.md for phases 12, 13, 15** — gsd-verify-work wasn't run for these phases. Phase 12 and 13 were executed before the verifier agent was part of the standard workflow for infra/tooling phases; Phase 15 had a VALIDATION.md pass instead. The audit had to piece together evidence from UAT + SUMMARY + VALIDATION.
- **Phase 14 human-deferred behaviors** — 5 live-session behaviors (visual layout, drag-to-spread path, face toggle sync, spread reorder, late-joiner) were explicitly deferred. None of these have been confirmed since Phase 14 shipped. Adding a "human UAT" step to Phase 14-type phases before marking complete would close this gap.

### Patterns Established

- Spread zones as `Pile` records with `region: "spread"` — no new collection type; all existing handlers work via pile ID
- `isIntraSpreadReorder` guard in BoardDragLayer — prevents MOVE_CARD from firing for same-pile reorders; lets SpreadZone's `useDndMonitor` REORDER_PILE_SPREAD fire uncontested
- Two BrowserContexts per Playwright test — localStorage isolation; each context = independent player token
- `mouse.move/down/move/up (steps:15)` for dnd-kit e2e drag — Playwright's native `dragAndDrop()` fires HTML5 drag events which dnd-kit ignores
- `aria-pressed` placed after `{...attributes}` spread in dnd-kit draggable components — dnd-kit's attributes include their own `aria-pressed`; explicit override must come last to avoid TS2783
- Pre-validate-all before snapshot: validate every item in a batch before taking the undo snapshot or mutating anything

### Key Lessons

1. **Type extension > parallel collections.** When adding a new zone concept, adding fields to an existing type (`Pile.region`) preserved all existing message handling. Adding a new `Zone[]` collection would have required new handlers throughout.
2. **Playwright BrowserContext isolation is essential for multiplayer testing.** Two Pages in one context share localStorage and therefore share the player token — both pages join as the same player. Always use two BrowserContexts when testing multiple distinct player sessions.
3. **`gsd-validate-phase` sign-off is a trailing step that gets dropped.** Consider making it part of the transition commit checklist rather than a separate command.
4. **Gap-closure phases signal underspecified plans.** 4 unplanned plans in Phase 14 all came from behaviors that were implied but not explicitly stated in the success criteria. Success criteria should include edge cases (empty zone drops, intra-zone reorder, late-joiner re-deal) — not just the happy path.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~10 estimated
- Notable: Phase 14 was the most expensive phase in any milestone — 6 plans, 6 gaps closed; research + discussion up front would have reduced execution cost

---

## Milestone: v1.3 — Layout & UX Polish

**Shipped:** 2026-05-15
**Phases:** 6 (16.1, 17–21) | **Plans:** 24 | **Timeline:** 12 days (2026-05-03 → 2026-05-14)

### What Was Built

- CI atomic deploy — single GitHub Actions job deploys Vite frontend (GitHub Pages) + PartyKit server on every push to main; PARTYKIT_TOKEN secret gates server deploy
- Board layout redesign — five-band vertical layout (opponent zones top, communal zone center, personal spreads, player hand); all zones simultaneously visible at 1080p without scroll
- Collapsible controls panel — all 6 game controls (copy link, deal stepper, undo, inline two-step reset) moved into a Base-UI Popover triggered by a hamburger icon; board surface uncluttered by default
- Phone-responsive layout — board usable at ≥375px with no horizontal scroll; 10 gap-closure plans; PileZone controls as icon buttons, opponent hand capped at 5 cards, sticky header via flex layout
- Spread zone multi-select — click-to-select with same ring/lift UX as player hand; `selectionSource` zone-exclusive state; extended PLAY_CARD_SET server contract to handle pile and hand destinations
- Spread zone group reorder + undo — `takeSnapshot` added to REORDER_HAND/REORDER_PILE_SPREAD; selection preserved across intra-zone reorder; SortableSentinel (flex: 1) fixes drop-to-end; `delta.x` group-reorder direction aligns algorithm with animation

### What Worked

- **Code review before milestone close** — WR-series fixes in phases 20 and 21 caught a real off-by-one in `takeSnapshot` cap, modulo bias in shuffle, and missing authorization guards. Running `gsd-code-review` mid-milestone is worth the overhead.
- **HUMAN-UAT.md as a structured gate** — the 7-case UAT pass for Phase 21 found the drop-to-end bug before close. A written test matrix forces coverage of non-obvious edge cases (unselected-drag, group drag to last position) that automated tests miss.
- **Wave 0 RED scaffolds (Phase 21)** — writing failing Vitest tests before implementing reorder undo meant the implementation had a clear target and the verification was structural, not retrospective.
- **`selectionSource` zone-scoped state** — naming the selection context by zone ID (not just "is something selected") naturally prevented cross-zone selection leakage without extra guards.
- **SortableSentinel at flex: 1** — the zero-size sentinel approach had been tried before and failed (0.5px target). Giving it `flex: 1, minWidth: 56px, alignSelf: stretch` made it reliably droppable without visual footprint.

### What Was Inefficient

- **Phase 19 grew to 10 plans** — 4 were planned (responsive RED gate, card sizing, zone containers, icon buttons), 6 were gap-closure. The responsive layout problem space was systematically underestimated; a pre-phase audit of layout edge cases would have caught sticky header, opponent column width, and hamburger alignment.
- **Two code review cycles per phase (20, 21)** — running review after execution and then a fix cycle is correct process but adds overhead. Earlier review (during plan or after Wave 1) could catch structural issues before the full phase is built.
- **Phase 21-05 was a gap-closure plan for a UAT find** — the drop-to-end bug required an unplanned plan. UAT found it, which is correct, but a pre-UAT checklist of "obvious interaction edge cases for drag" (drag-to-end, drag-to-beginning, drag single card from group) would have surfaced this earlier.

### Patterns Established

- `SortableSentinel` (flex: 1, invisible droppable) appended to SortableContext — makes drop-to-end reliably reachable for `closestCenter`; no visual footprint
- `selectionSource: { type, zoneId } | null` zone-exclusive state — prevents cross-zone selection; clears on Escape and on drag dispatch
- Wave 0 RED scaffolds before implementation — write failing Vitest tests pinning the contract, then implement to flip GREEN
- `takeSnapshot` placement: after all validation, before any mutation — ensures undo always has a valid pre-state
- Group reorder insert direction via `event.delta.x` — insert AFTER `over` when dragging right, BEFORE when dragging left; matches `horizontalListSortingStrategy` animation in all cases

### Key Lessons

1. **Responsive layout is an iceberg.** The "make it not scroll at 375px" goal produced 10 plans. The first 3 plans (RED gate, card sizing, zone containers) got most of the way there; the next 7 closed layout edge cases. Budget 3–5× the planned scope for responsive work on an existing desktop-first UI.
2. **The SortableSentinel zero-size failure is a known dnd-kit footgun.** Any droppable that needs to be reachable by `closestCenter` must have real dimensions. Add this to the dnd-kit checklist for any new droppable zone.
3. **Code review after execution catches real bugs.** WR-01 through WR-04 in phases 20 and 21 were real correctness issues (off-by-one, modulo bias, missing auth guard). Code review is not overhead — it's a structural correctness gate.
4. **UAT finds bugs that automated tests cannot.** Drop-to-end, unselected-drag clearing selection, and reset-selection persistence were all found in the HUMAN-UAT pass. These interactions require a real drag UI — no test can fully simulate the cursor physics. Keep the UAT matrix growing.
5. **`selectionSource` state design decision had second-order benefits.** Scoping selection to a zone ID meant clearing selection on zone change was a natural result, not a special case. Good state shape eliminates whole categories of edge cases.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~12 estimated
- Notable: Phase 19 (10 plans) and Phase 21 (5 plans + code review fix cycle) were the most expensive; both benefited from structured gap-closure plans rather than open-ended debugging

---

## Milestone: v1.4 — Table Polish

**Shipped:** 2026-05-18
**Phases:** 4 (22–25) | **Plans:** 10 | **Timeline:** 3 days (2026-05-15 → 2026-05-18)

### What Was Built

- Hand Reveal: Eye/EyeOff toggle in HandZone header; `SET_HAND_REVEALED` server action; `opponentRevealedHands` in `viewFor()`; `onStart()` migration guard for reconnects (HAND-01–04)
- Hand Sort: `SortMode` cycle button dispatching `REORDER_HAND` with `skipSnapshot: true`; pure `sortCards()` and `buildSortDispatch()` exports; render-time visual sort (SORT-01)
- Select All: `handleSelectAll()` in BoardDragLayer; Select All buttons on PileZone (top card) and SpreadZone (all face-up cards); existing multi-card drag dispatches the group (SELECT-01–03)
- Play Area Grid: `GridZone` 2-row CSS grid with per-cell `useDroppable`; `MOVE_GRID_CARD` server action; intra-grid `useDndMonitor` dispatch; stack badge; face toggle; optional `toRow`/`toCol` on external drops (GRID-01)
- Layout Polish: empty zones label-only; PileZone header row above card; personal spreads hidden when empty with drag-reveal; compact heights 64px/88px; personal spread band padding reduced (POLISH-01–04, ZONE-01)

### What Worked

- **3-day completion for a 4-feature milestone** — well-defined requirements and clear wave structure kept all phases focused. No scope creep, no gap-closure plans.
- **Render-time sort (no re-dispatch on mount)** — the decision to apply `sortCards()` at render time with dispatch only on click avoided a subtle infinite-loop trap (useEffect re-dispatch after server response). Resolved in planning before a line was written.
- **Separate `MOVE_GRID_CARD` action** — keeping the grid action separate from `REORDER_PILE_SPREAD` meant personal spread zones were untouched and the grid could validate `toRow`/`toCol` bounds independently.
- **Wave-0 RED scaffolds for sort and selectAll** — writing failing tests first (23-01) before the UI implementation (23-02) confirmed the API contract before it was built. Both test suites flipped GREEN with zero regressions.

### What Was Inefficient

- **REQUIREMENTS.md tracking was never updated during execution** — 9 of 14 requirements showed "Pending" at milestone close despite all phases being complete. The traceability table is supposed to update per-plan via `gsd-transition`. This was either skipped or the tool wasn't called. Corrected at archive time.
- **No milestone audit performed** — previous milestones (v1.0, v1.2, v1.3) had formal audits. v1.4 skipped it. The work is clearly complete but the process gap means no formal integration or E2E coverage check was run.
- **Phase 24 required two code review fix cycles** — grid MOVE_GRID_CARD had bounds validation gaps and a badge clipping issue caught in the code review pass. These were fixable but would have been cleaner if caught during planning (success criteria were specific but didn't enumerate the bounds edge case).

### Patterns Established

- `skipSnapshot?: boolean` on REORDER_HAND — sort is a display preference, not a game action; undo-excluding sort is the correct default for any ephemeral reorder operation
- `opponentRevealedHands: Record<string, Card[]>` as a parallel collection to `opponentHandCounts` in `viewFor()` — mutually exclusive: a player is in exactly one
- `handleSelectAll(cardIds, zone, zoneId)` atomically replaces selection state — the `atomically replaces` pattern prevents stale partial selections from mixing zones
- Empty personal spread zones with `isOver || isDragging` drag-reveal — hides vertical whitespace by default while preserving drop affordance during drag

### Key Lessons

1. **Track requirements during execution, not at close.** Correcting 9 stale "Pending" entries at archive time added unnecessary work. `gsd-transition` should mark requirements Complete as each plan lands — defer-to-close produces stale docs that need reconciliation.
2. **skipSnapshot is a pattern, not a one-off.** Any sort, filter, or display preference that dispatches through the game action system should default to `skipSnapshot: true`. The undo stack should only capture moves that a player would want to reverse.
3. **Render-time sort > re-dispatch on mount.** When sort order is a client preference that round-trips through the server, applying it at render time avoids the subtle infinite re-render trap of a useEffect watching `cards` and re-dispatching. Decide in planning, not after the UI is built.
4. **Grid zones need bounds validation as part of plan scope.** `toRow`/`toCol` bounds guards were caught in code review, not planned. Any action that takes row/col coordinates should include input validation in the plan's task list.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~5 estimated
- Notable: Fastest milestone to date at 3 days; clean wave structure with no unplanned gap-closure plans

---

## Milestone: v1.5 — Board Polish II

**Shipped:** 2026-05-23
**Phases:** 5 (26–30) | **Plans:** 8 | **Timeline:** 4 days (2026-05-18 → 2026-05-22)

### What Was Built

- Zero-risk visual polish — pile count badge hidden at 0; controls row gap tightened; opponent spread face-toggle removed; zone name labels stripped; grid face-toggle moved beside label (Phase 26)
- Hover-only drop-target on opponent hand — `isOver` guard scopes the outline to actual hover, not drag-start; empty personal spread shows ¼-height faint dashed strip with deferred controls (Phase 27)
- Bug fixes — `selectedIds` threaded through BoardView → PileZone → DraggableCard for ring feedback on pile top-card selection; communal grid uses `sm:grid-cols-7 grid-cols-4` Tailwind breakpoint (Phase 28)
- Sort semantics defined — "original order" = current server/manual order (not deal order); `buildSortDispatch` and `sendAction` deleted from sort path; render-time-only overlay; non-mutation invariant test locks D-04 contract (Phase 29)
- Spread zones docked to hands — opponent spreads moved from `bg-card` header band into a `flex-shrink-0` board area row; `w-7` spacer aligns spread columns under hand cards; `MeasuringStrategy.Always` on `DndContext` eliminates stale droppable rect drift (Phase 30)

### What Worked

- **Smallest milestone to date** — 4 days, 8 plans, 0 gap-closure plans, 0 code review fix cycles. Clear success criteria and well-scoped phases kept everything on track.
- **MeasuringStrategy.Always pre-identified** — the risk of stale droppable rects after a DOM restructure was identified in Phase 30 planning (CONTEXT.md) before implementation. Having the mitigation ready meant zero drag regression during Phase 30 execution.
- **Secure phase for Phase 30** — running `gsd-secure-phase` after the layout restructure confirmed that no new attack surface was introduced (0 open threats). The security review is fast for UI-only phases and provides a clean audit trail.
- **Verification files for phases 27 and 29** — the `gsd-secure-phase` workflow produced SECURITY.md; pairing it with VERIFICATION.md gave each phase a clear "done" artifact even for non-feature phases.
- **Hover vs isDragging distinction** — `isOver` (not `isDragging`) for the opponent hand drop-target was identified in the plan, not discovered during debugging. The subtle global vs scoped distinction was written into the task description.

### What Was Inefficient

- **REQUIREMENTS.md tracking again not updated during execution** — 8 of 11 v1.5 requirements showed "Pending" at milestone close despite all phases being complete. Same pattern as v1.4. The traceability table is not getting updated during execution. Corrected at archive time.
- **v1.5-MILESTONE-AUDIT.md corrupted** — a 15GB audit file was created by a runaway process, requiring manual deletion before milestone close. Root cause unknown; safe to proceed since audit-open covered the same checks.
- **LAYOUT-06 partial delivery** — the requirement specified personal spread zones only; opponent spread zone empty state (999.54) was deferred to backlog. The requirement was technically satisfied as written but the user expectation included both. This distinction should be captured more precisely in requirement wording.

### Patterns Established

- `MeasuringStrategy.Always` on `DndContext` after any significant DOM restructure — required any time spread or droppable zone geometry changes
- `w-{N}` spacer for column-alignment docking — matching the controls-bar width with a spacer div aligns a docked zone's content under a sibling column without CSS grid
- `isOver` (not `isDragging`) for per-zone drop-target styling — `isDragging` is global state; `isOver` from `useDroppable` is scoped to the specific droppable element
- Render-time-only sort with no server dispatch — `sortCards()` applied at render, no REORDER_HAND dispatch on sort-mode change; D-04 non-mutation invariant test prevents regression

### Key Lessons

1. **Small, focused milestones have zero gap-closure cost.** v1.5 was 8 plans with 0 extras — the requirements were concrete, the phases were well-scoped, and implementation matched the plan. Compare to v1.3 (18 planned → 24 after gap closure). Specificity in success criteria is the difference.
2. **MeasuringStrategy.Always should be the default for projects with dynamic layout.** Any feature that restructures the DOM while dnd-kit is mounted will cause stale rect issues. The fix is a one-liner — just add it to the project template.
3. **Track requirements at execution time, not archive time.** This is the third milestone in a row where the traceability table needed retroactive correction. The pattern is consistent enough to be a system problem: `gsd-transition` or the executor needs to mark requirements complete when each plan lands.
4. **The `isOver` vs `isDragging` distinction is a recurring dnd-kit gotcha.** Two phases (17, 27) both had cases where the wrong state variable was used for drop-target styling. Add it to the dnd-kit checklist.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~6 estimated
- Notable: Fastest plan-per-day rate across all milestones; tight scope with no scope creep is the primary driver

---

## Milestone: v1.6 — Free Canvas Play Area

**Shipped:** 2026-05-27
**Phases:** 5 (31–35) | **Plans:** 20 | **Timeline:** 5 days (2026-05-22 → 2026-05-27)

### What Was Built

- Phase 31 (Migration) — Communal grid fully removed; draw/discard piles docked in fixed left sidebar; free canvas shell established; reset table sweeps canvas to draw pile
- Phase 32 (Canvas Core) — `CanvasCard` type with (x, y, z); `PLACE_ON_CANVAS` server action; real-time sync to all players; NOLOSS cancel (Escape or missed drop returns card to canvas position); `viewFor()` broadcasts canvas cards unmasked
- Phase 33 (Overlap & Visibility) — Topmost-card pointer-events via z-index CSS; ~50% DragOverlay opacity; box-shadow layering indicator on >50% area coverage; `dragDelta` ref (not state) prevents per-pointermove re-renders
- Phase 34 (Multi-Card Group Drop) — Canvas click-to-select with ring/lift/badge UX; `GROUP_PLACE_ON_CANVAS` atomic server action; DOM offset capture for passenger ghosts; all-or-nothing bounds check — silent snap-back if any card would overflow
- Phase 35 (Mobile) — Two-div viewport+canvas model; `EdgeArrow` components with hold-to-scroll at 8px/16ms; dnd-kit `TouchSensor` isolation prevents edge-arrow taps from activating card drag; `scrollOffsetRef` shared via prop chain for accurate drop math after panning

### What Worked

- **Spike 999.37 pre-validated the architecture** — the free canvas spike proved `useDraggable` (not `useSortable`), absolute positioning, `dragDelta` ref, and mobile edge-pan before Phase 31 started. Phase 32 had zero architecture unknowns.
- **Type extension pattern held** — `CanvasCard` as a standalone top-level `GameState` field (not a `Pile` extension) kept all existing MOVE_CARD/UNDO/viewFor handlers unchanged. Zero handler rework.
- **Wave-0 RED scaffolds** — Phase 34 and 35 both started with failing Vitest/Playwright tests pinning the contract. Green-flip cadence was clean and fast.
- **`PLACE_ON_CANVAS` unified initial + reposition** — making one action handle both initial placement and canvas→canvas moves simplified undo symmetry and prevented a server z-race condition.
- **Two-div viewport+canvas model** — `overflow:hidden` outer + CSS `translate` inner gave smooth edge-pan without `scrollLeft` mutations, and `scrollOffsetRef` could be read synchronously at pointer-up without state lag.

### What Was Inefficient

- **REQUIREMENTS.md traceability stale again at close** — MULTI-* and MOBILE-* requirements still showed "Pending" despite both phases being complete. Fourth consecutive milestone with this issue. The traceability update needs to happen during execution (in `gsd-transition` or the executor), not at archive time.
- **No formal milestone audit** — skipped `gsd-audit-milestone` before close; decided to proceed manually since all verification was human-witnessed. The audit step would have caught the stale traceability earlier.
- **`max-h-[240px]` removed in 35-02 post-verification** — the mobile height cap was planned as a fixed value but flex-1 turned out to distribute height correctly without any cap. The discovery happened during live verification, adding an extra iteration to Phase 35.

### Patterns Established

- `scrollOffsetRef` shared via prop chain (CanvasZone → BoardView → BoardDragLayer) — synchronous live value for drop math after edge-pan; state would capture stale scroll causing off-position drops
- All-or-nothing group bounds rule — any card in a selected group overflowing cancels the entire drop; matches physical card intuition; no partial placement state to manage
- `GROUP_PLACE_ON_CANVAS` atomic server action — server computes all z-indices in one pass; prevents two simultaneous group drops from corrupting z-order; single undo snapshot
- `pointerdown` deselect on canvas background — clicking empty canvas area clears selection; `data-canvas-background` attribute gates the handler so card clicks don't bubble to deselect

### Key Lessons

1. **Spike before architectural bets.** The 999.37 free canvas spike de-risked the entire v1.6 plan before a single Phase 31 commit. The spike proved three non-obvious decisions (useDraggable-not-useSortable, dragDelta ref, two-div model) that would each have caused multi-plan rework if discovered mid-execution.
2. **Unify placement and repositioning into one action.** Separate `PLACE_ON_CANVAS` and `REPOSITION_CANVAS_CARD` actions would have duplicated undo logic, z-assignment, and bounds checking. One action = one snapshot = symmetric undo.
3. **The traceability update pattern is broken at the system level.** This is the fourth consecutive milestone where requirements showed "Pending" at archive time despite being fully complete. The executor or `gsd-transition` must mark requirements complete at plan completion — not at milestone close.
4. **Hard caps are risky in flex layouts.** A `max-h-[240px]` looks correct in isolation but breaks when sibling zones are empty and the flex container has more space to give. Always verify height constraints with real content in multiple zone-population states.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~8 estimated
- Notable: 5-day clock for 5 phases (1 phase/day); spike pre-work was the reason — zero architectural unknowns at execution time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 (+2 bonus) | 21 | First milestone — baseline established |
| v1.1 | 5 (2 pre-work + 3) | 11 | Faster cadence; pre-work phase pattern introduced |
| v1.2 | 5 | 14 (2 planned → 6 for Phase 14) | e2e infrastructure + game depth; gap-closure plans normalized |
| v1.3 | 6 | 24 (18 planned → 24 with gap closure) | Layout redesign + responsive; code review cycles added; HUMAN-UAT as structured gate |
| v1.4 | 4 | 10 (10 planned, 0 gap-closure) | Table polish + features; fastest milestone; Wave-0 RED scaffolds paid off |
| v1.5 | 5 | 8 (8 planned, 0 gap-closure) | Board Polish II; tightest scope; DOM restructure + MeasuringStrategy.Always |
| v1.6 | 5 | 20 (planned; 0 gap-closure) | Free canvas play area; spike pre-validated architecture; all-or-nothing group drops; mobile edge-pan |

### Cumulative Quality

| Milestone | Tests | Key Patterns |
|-----------|-------|-------------|
| v1.0 | 89 passing | WebSocket buffer, server-first privacy, stable player identity |
| v1.1 | ~114 passing | pointerWithin collision, deferred connect, joinState null-gate |
| v1.2 | 130+ unit + 8 e2e | Playwright BrowserContext isolation, spread zones as Pile records, pre-validate-all batch pattern |
| v1.3 | 165 unit + 8 e2e | SortableSentinel drop-to-end, selectionSource zone-scoped state, Wave 0 RED scaffolds, delta.x group-reorder direction |
| v1.4 | 165+ unit + 8 e2e | skipSnapshot for display-pref actions, render-time sort, atomic handleSelectAll, grid-cell droppable routing |
| v1.5 | 170+ unit + 15 e2e | MeasuringStrategy.Always for DOM restructure, w-7 spacer docking, isOver vs isDragging drop-target scoping, render-time-only sort no-mutation invariant |
| v1.6 | 250+ unit + 20 e2e | CanvasCard standalone type, PLACE_ON_CANVAS unified action, scrollOffsetRef prop chain, all-or-nothing group bounds, two-div viewport+canvas model |

### Top Lessons (Verified Across Milestones)

1. Prove the core invariant first (hand masking in Phase 1)
2. Run `gsd-audit-milestone` before closing — always surfaces something
3. Type extension > parallel collections — reuse existing types with new fields when adding concepts
4. VALIDATION.md sign-off is consistently skipped — needs to be a hard gate, not an optional step
5. Success criteria should include edge cases, not just the happy path — Phase 14's 4 gap-closure plans and Phase 21's drop-to-end all came from implied-but-unstated behavior
6. Responsive layout is an iceberg — budget 3–5× planned scope when making an existing desktop-first UI responsive
7. Code review catches structural correctness bugs that planning and testing miss — run it after every execution phase
8. Any dnd-kit droppable detected by `closestCenter` must have real layout dimensions — zero-size sentinels have ~0.5px target surface
9. Track requirements during execution, not at close — stale "Pending" entries at archive time are wasted reconciliation work; `gsd-transition` should mark requirements Complete as each plan lands
10. `skipSnapshot: true` is the correct default for any sort/filter/display-preference action that round-trips through the game action system
11. `MeasuringStrategy.Always` should be the default on `DndContext` in any project with dynamic layout — one-line fix, eliminates an entire class of stale-rect drag bugs
12. Track requirements at execution time — correcting stale "Pending" entries at archive time is wasted work and has occurred in v1.3, v1.4, v1.5, and v1.6; this is a system-level gap, not a human error
13. Spike before architectural bets — v1.6 999.37 spike proved useDraggable-not-useSortable, dragDelta ref, and two-div canvas model before Phase 31 started; zero architecture unknowns at execution
