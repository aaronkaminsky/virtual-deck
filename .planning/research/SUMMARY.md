# Project Research Summary

**Project:** Virtual Deck
**Domain:** Real-time multiplayer browser card game sandbox
**Researched:** 2026-03-28
**Confidence:** MEDIUM

## Executive Summary

Virtual Deck is a well-understood problem class: a real-time, server-authoritative shared surface with per-player private state. The stack pre-decided in PROJECT.md (PartyKit + React + GitHub Pages) is validated — it is the right choice for the constraints. PartyKit's edge-hosted, per-room, in-memory model is a precise fit for low-latency card moves and per-connection hand masking. No gap-filler infrastructure is needed; the three layers (GitHub Pages static frontend, Vite + React + dnd-kit client, PartyKit server) cover every requirement.

The recommended approach is to build server-first: establish the PartyKit room with state persistence, hand masking, and stable player token identity before writing any UI. The primary correctness requirement — that no player can read another's hand, even via DevTools — must be solved before any hand data flows over the wire. All card shuffles, deals, and moves must originate on the server; the client only sends intents and renders server snapshots. The drag-and-drop layer (dnd-kit) introduces a specific interaction hazard that requires a buffering pattern to prevent visual tearing during simultaneous moves.

Five table-stakes features are missing from PROJECT.md's requirements and must be added to the backlog before roadmap creation: player presence/display names, card count visibility, reconnect-to-hand, reset/new round, and single-step undo. These are not enhancements — they are necessary for the product to function across multiple rounds or survive a network blip. Absent them, the product supports exactly one round per page load and permanently loses a player's hand on any disconnect.

---

## Key Findings

### Recommended Stack

The decided stack (PartyKit + React + GitHub Pages) holds up. The only additions are tooling and library choices that fill the gaps: Vite as the build tool (CRA is deprecated), TypeScript for shared types between client and server, @dnd-kit/core for drag-and-drop (react-beautiful-dnd is archived), zustand for ephemeral UI state only, nanoid v4+ for room code generation, and immer for safe state mutation. All versions in STACK.md are marked [UNVERIFIED] against current releases — they must be confirmed before the first `npm install`.

**Core technologies:**
- React 18.x + TypeScript 5.x: Component model maps directly to Card, Hand, Pile, Board. Shared types file eliminates client/server contract bugs.
- Vite 5.x: Fast HMR, GitHub Pages deploy via `vite build` with `base` path config. CRA is deprecated — do not use.
- PartyKit (latest): Edge-hosted Durable Object room per session. Server masks hand state per `connection.id` before sending. Client is read-only.
- partysocket: Official PartyKit client wrapper. Handles reconnection and message queuing. Replaces raw WebSocket. [VERIFY package name before install — pre-1.0, may have changed.]
- @dnd-kit/core + @dnd-kit/sortable 6.x: Pointer-events based, no HTML5 drag API issues. `<DragOverlay>` required for correct z-index on dragged card ghost.
- zustand 4.x: Ephemeral UI state only (drag preview, selected card). Never game state.
- nanoid v4+: Room codes and player tokens on server. v3 incompatible with Cloudflare Workers.
- crypto.getRandomValues (built-in): Fisher-Yates shuffle on server. No library needed.

### Expected Features

Five features in PROJECT.md's requirements table are missing and must be added before the roadmap is finalized (see FEATURES.md for full rationale):

**Must add (table stakes — missing from PROJECT.md):**
- Player presence + display names — players cannot coordinate without knowing who is in the room or if someone disconnected
- Card count visibility — opponents' hand sizes and pile depths are always visible in physical card games; absence breaks core gameplay feedback
- Reconnect-to-hand — any disconnect permanently destroys the player's hand without this; correctness requirement
- Reset / new round — without this, each round requires a full page reload; product supports one round per session
- Single-step undo — misclicks on drag-and-drop are frequent; absent undo, every misclick requires verbal negotiation

**Already in PROJECT.md (confirmed table stakes):**
- Private hands with server masking
- Drag-and-drop between hand, piles, and zones
- Draw from pile, flip cards, shuffle (server-side), deal, pass to hand
- Room join via shareable link
- 2–4 players per room

**Should have (differentiators — defer until v1 is stable):**
- Action log / history (extends undo; useful for dispute resolution)
- Named pile labels ("Draw", "Discard") — low effort, large UX gain
- Spectator mode — reads full public state, no hand
- Zoom/inspect card — useful on smaller screens

**Defer to v2+:**
- Animated card movement, peek at face-down card, cut/split pile, draw from bottom

**Anti-features (confirmed out of scope):**
- Rule enforcement, score tracking, in-app chat, accounts/auth, card art UI, persistent rooms, mobile-first layout

### Architecture Approach

The architecture follows a strict server-authoritative model: the PartyKit room owns all game state; clients are read-only mirrors that send action intents. The critical pattern is state masking at broadcast time — after every mutation, the server iterates all connections and sends each a `ClientGameState` that includes only that player's hand cards (`myHand`) and card counts for opponents (`opponentHandCounts`). The full `hands{}` map and `deck[]` are never sent to any client. A shared `src/shared/types.ts` file is imported by both the React frontend and the PartyKit server to ensure type contract alignment.

**Major components:**

Server-side (`party/index.ts`):
1. Room class — owns authoritative `GameState`, processes all mutations, persists to `party.storage` on every change
2. `onStart` handler — reloads `GameState` from storage on wake; required to survive hibernation
3. `viewFor(connectionId)` — masks `GameState` into `ClientGameState` per connection; called before every send
4. `onConnect` handler — assigns player slot using stable player token (from localStorage, sent on join), sends masked state
5. `onMessage` handler — validates action, mutates state, broadcasts masked views to all connections

Client-side (`src/`):
1. `useGameSocket` hook — manages partysocket lifecycle, routes incoming `STATE_UPDATE` messages to zustand
2. `useGameStore` (zustand) — ephemeral UI state only: drag preview, selected card; wiped on each server snapshot
3. `<BoardView>` + `<HandView>` — dnd-kit DndContext roots; BoardView owns shared piles, HandView owns local hand
4. `<OpponentHand>` — renders card backs only; count sourced from `opponentHandCounts`
5. `<PlayerRoster>` — renders presence, connection status, card counts from `players[]`

### Critical Pitfalls

1. **In-memory state lost on room hibernation** — PartyKit rooms hibernate when idle; instance variables are wiped. Prevention: persist `this.gameState` to `this.party.storage` on every mutation; reload in `onStart`. Implement this from day one — retrofitting is painful.

2. **Broadcasting full state to all connections (hand privacy leak)** — `this.party.broadcast(fullState)` exposes all hands to anyone with DevTools open. Prevention: never use broadcast for state that contains hand data. Always iterate connections and call `conn.send(viewFor(this.gameState, conn.id))` individually.

3. **Client treats local React/zustand state as source of truth** — Two simultaneous client actions will desync silently. Prevention: client sends intents only; never mutates game state locally; zustand holds only the last server snapshot plus ephemeral UI state. If a state update arrives before an action is confirmed, the snapshot wins.

4. **dnd-kit state conflicts with real-time updates during drag** — An incoming WebSocket state update during an active drag causes cards to snap back or fire `onDragEnd` with stale IDs. Prevention: buffer incoming server state while `isDraggingRef.current === true`; apply buffered state on `onDragEnd`.

5. **GitHub Pages 404 on direct URL navigation** — React Router routes don't map to files on disk; GitHub Pages returns 404 on refresh or direct link. Prevention: copy `dist/index.html` to `dist/404.html` at build time, and set `base: '/virtual-deck/'` in `vite.config.ts`. Test on deployed URL before sharing room links.

---

## Implications for Roadmap

### Phase 1: Server Foundation
**Rationale:** The entire correctness story — hand privacy, state authority, reconnect — lives in the PartyKit room. Build and test this before any UI exists.
**Delivers:** Functional room server with deck initialization, state persistence to storage, stable player token identity, and hand masking. Room creates, players join, hands are dealt correctly, devtools inspection shows masked state.
**Addresses:** Private hands (table stakes), reconnect-to-hand (missing feature), player presence data model
**Avoids:** Pitfall 1 (hibernation), Pitfall 2 (privacy leak), Pitfall 9 (connection ID as player key)
**Research flag:** Verify PartyKit hook names (`onStart`, `onBeforeConnect`, `onConnect`, `onMessage`, `onClose`) against current docs before writing any server code. API is pre-1.0.

### Phase 2: Lobby + Room Join
**Rationale:** Player identity and room join must work before any game UI is useful. Establishes the player token flow, display names, and presence list.
**Delivers:** Create/join room flow, player name input, room code sharing, presence list showing who is connected.
**Addresses:** Player presence + display names (missing feature), room join via link (PROJECT.md requirement)
**Uses:** partysocket client, React Router (or hash routing) for room URL, nanoid v4 for room codes
**Avoids:** Pitfall 5 (GitHub Pages 404) — configure base path and 404.html in this phase before deploying

### Phase 3: Core Board — Drag and Deal
**Rationale:** Drag-and-drop is the highest-risk interaction surface. Validate the dnd-kit + real-time state update pattern before building on top of it.
**Delivers:** Board with pile zones, private hand view, opponent card backs, drag-and-drop card movement between hand and piles, deal and draw actions.
**Addresses:** Drag-and-drop (PROJECT.md), draw from pile (PROJECT.md), deal (PROJECT.md), card count visibility (missing feature)
**Uses:** @dnd-kit/core + sortable, DragOverlay, `<BoardView>`, `<HandView>`, `<OpponentHand>`
**Avoids:** Pitfall 3 (client state authority), Pitfall 4 (dnd-kit + real-time conflict — implement buffering pattern here), Pitfall 6 (useSortable + useDroppable on same element)
**Research flag:** Test drag buffering pattern in isolation before integrating with live server state.

### Phase 4: Game Controls + Table Stakes Gaps
**Rationale:** Complete the required feature set from PROJECT.md plus the five missing table-stakes features. This phase makes the product functional for an actual game session.
**Delivers:** Flip card, shuffle pile (server-side), pass card to hand, reset/new round, single-step undo, visual zone ownership labels.
**Addresses:** Flip (PROJECT.md), shuffle (PROJECT.md), pass to hand (PROJECT.md), reset/new round (missing), undo (missing)
**Avoids:** Pitfall 8 (client-side shuffle — shuffle must be `crypto.getRandomValues` on server only)

### Phase 5: Resilience + Polish
**Rationale:** Correctness edge cases (reconnect, error states) and UX polish. Can't be tested until the full game loop exists.
**Delivers:** Reconnect-to-hand (player token restores hand after network drop), error state handling, connection status indicators, room expiry cleanup.
**Addresses:** Reconnect-to-hand (missing feature), connection status in presence list
**Avoids:** Pitfall 7 (redeployment wipes room state — test `onStart` storage reload explicitly)
**Research flag:** Standard patterns. No additional research needed.

### Phase Ordering Rationale

- Server-first ordering (Phase 1 before any UI) is required by the privacy correctness requirement: hand masking must be proven correct before hand data flows anywhere.
- Player tokens (Phase 1 data model) must be designed before lobby UI (Phase 2) because the token flow determines how reconnect works.
- Drag-and-drop (Phase 3) before game controls (Phase 4) because the dnd-kit real-time buffer pattern is a dependency of all card-movement features.
- Table-stakes gaps (Phase 4) are consolidated to avoid spreading low-complexity features across phases.
- Resilience (Phase 5) is last because it requires a complete game loop to test meaningfully.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** Verify PartyKit server API (hook names, `party.storage` API, hibernation behavior) against https://docs.partykit.io before writing any server code. Pre-1.0 API has changed historically.
- **Phase 2:** Verify `partysocket` is still the correct client package name (may have been renamed). Confirm nanoid v4 works in Cloudflare Workers runtime.
- **Phase 3:** Validate dnd-kit v6 API for `DragOverlay` and `useSortable` / `useDroppable` separation pattern.

Phases with standard patterns (skip research-phase):
- **Phase 4:** All game control actions (flip, shuffle, deal, reset, undo) follow the established `onMessage` → mutate → broadcast pattern from Phase 1. No novel patterns.
- **Phase 5:** Reconnect via stable player token is fully specified in ARCHITECTURE.md. Room expiry via storage timestamp is a standard pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Pre-decided stack is sound. Library versions are from training data (cutoff Aug 2025) and all marked [UNVERIFIED]. Verify before `npm install`. |
| Features | HIGH | Table-stakes analysis based on physical card game conventions — highly stable domain knowledge. Missing features are independently obvious. |
| Architecture | MEDIUM | Core patterns (server authority, hand masking, stable tokens) are high-confidence first principles. PartyKit-specific hook names and `party.storage` API are MEDIUM — pre-1.0 product. |
| Pitfalls | HIGH | Top 4 pitfalls (hibernation, privacy leak, client state, dnd-kit conflict) are architectural first principles and official docs. GitHub Pages 404 fix is documented by GitHub. |

**Overall confidence:** MEDIUM — the approach is correct; specific API surface details need verification at implementation time.

### Gaps to Address

- **PartyKit API surface:** Hook names, `party.storage` API shape, and hibernation behavior must be verified at https://docs.partykit.io before Phase 1 begins. Training data cutoff is Aug 2025; PartyKit was pre-1.0.
- **partysocket package name:** May have been renamed or folded into a unified PartyKit SDK. Confirm at https://docs.partykit.io before Phase 2.
- **React version:** React 18 vs 19 — if React 19 is stable by the time this ships, concurrent features and hooks behavior should be reviewed. Low risk for this use case.
- **dnd-kit v6 API:** Confirm `DragOverlay`, `useSortable`, and `useDroppable` APIs against https://docs.dndkit.com before Phase 3.
- **Undo implementation detail:** Single-step undo requires the server to store "previous state" or a reverse-action log. The exact storage strategy (snapshot vs. action log) should be decided during Phase 4 planning.

---

## Sources

### Primary (HIGH confidence)
- `PROJECT.md` (this repo) — stack decisions, constraints, out-of-scope items
- [PartyKit Persisting State Guide](https://docs.partykit.io/guides/persisting-state-into-storage/) — hibernation and storage patterns
- [PartyKit Hibernation Guide](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/) — room lifecycle
- [GitHub Pages SPA 404 workaround](https://github.com/orgs/community/discussions/64096) — 404.html pattern

### Secondary (MEDIUM confidence)
- PartyKit documentation (training data, Aug 2025) — server API hooks, `partysocket` client
- dnd-kit documentation (training data) — `DragOverlay`, `useSortable`, `useDroppable` APIs
- Cloudflare Durable Objects docs — storage limits, hibernation behavior

### Tertiary (LOW confidence)
- Library versions (React, Vite, @dnd-kit, zustand, nanoid, immer) — all from training data, all [UNVERIFIED]
- dnd-kit GitHub issue on `useSortable` + `useDroppable` conflict — community report, fix status unverified

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
