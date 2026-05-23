<!-- GSD:project-start source:PROJECT.md -->
## Project

**Virtual Deck**

A web-based multiplayer virtual card table for a standard 52-card deck. 2–4 players share a real-time board with private hands and free-form card manipulation — no rule enforcement, just a digital surface that works like sitting around a table with a physical deck.

**Core Value:** Players can see the shared table and their own private hand update in real time, with no one able to see each other's face-down cards.

### Constraints

- **Hosting**: GitHub Pages (static frontend) + PartyKit Cloud — no traditional server or database
- **Cost**: Free tier only — no paid infrastructure
- **Scale**: 2–4 players per session; no need to optimize for large concurrent rooms
- **Card art**: Customization is a code change, not a runtime config — simplifies data model
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x [UNVERIFIED] | Frontend UI, component tree, state | Project already leans toward React. Component model maps cleanly to Card, Hand, Pile, Board. Hooks make local drag state manageable. |
| TypeScript | 5.x [UNVERIFIED] | Type safety across frontend and PartyKit server | PartyKit server is TypeScript-native. Sharing types between client and server (GameState, Card, Player) eliminates a whole class of sync bugs. |
| Vite | 5.x [UNVERIFIED] | Dev server, build tooling | Fast HMR, zero-config GitHub Pages deploys via `vite build`. Lighter than webpack for a project this size. |
### Real-Time Engine
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PartyKit | latest (no semver — deploy via CLI) [UNVERIFIED] | WebSocket room server, authoritative game state, hand masking | Already decided. Edge-hosted, in-memory per room, server can filter state per connection ID — exactly what server-authoritative hand privacy requires. |
| partysocket | bundled with PartyKit SDK [UNVERIFIED] | Client-side WebSocket wrapper | Handles reconnection, message queuing, and typed message passing. Use instead of raw WebSocket. |
### Hosting / Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Pages | N/A | Static frontend hosting | Free, integrated with repo, trivially configured with Vite. No server needed. |
| PartyKit Cloud | N/A | Edge server hosting for room logic | Free hobby tier covers 2–4 player sessions at the expected usage volume. |
### Drag-and-Drop
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dnd-kit/core | 6.x | Card drag primitives | dnd-kit is pointer-events based (works on touch/mouse), does not rely on the HTML5 drag-and-drop API (which has poor mobile support and z-index quirks). Accessible by default. react-beautiful-dnd is archived/deprecated — do not use. |
| @dnd-kit/sortable | 10.x | Sortable list support for card ordering | Ships separately from core; major version diverged — check sortable docs for v10 API when adding sortable zones. |
### Randomization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `crypto.getRandomValues` | N/A (Web Crypto API, built-in) | Shuffle pile with cryptographically random order | No library needed. Available in all modern browsers and in Cloudflare Workers (where PartyKit runs). Fisher-Yates shuffle seeded from `crypto.getRandomValues` is the correct approach. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.x | Generate short room codes and player IDs | nanoid's default alphabet produces URL-safe IDs. Use for room code generation on the PartyKit server. v5 dropped CJS support and uses pure ESM; confirmed working in Cloudflare Workers. |
| zustand | 4.x [UNVERIFIED] | Local client-side UI state (drag preview, selected card, etc.) | Lightweight, no boilerplate. Use for ephemeral UI state that does not need to sync over the wire — not for game state (that lives on PartyKit). Do not put game state in zustand; it should flow from server messages. |
| immer | 10.x [UNVERIFIED] | Immutable state updates inside zustand and PartyKit | Prevents accidental mutation of shared game state objects. Makes hand-masking logic easier to reason about. |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

### dnd-kit

- **`MeasuringStrategy.Always`** on `DndContext` whenever the DOM is restructured while dnd-kit is mounted — prevents stale droppable rect drift. One-liner; always add it for any layout that changes dynamically.
- **`isOver` not `isDragging`** for per-zone drop-target styling. `isDragging` is global state; `isOver` from `useDroppable` is scoped to the specific droppable. Using the wrong one has burned two separate phases (17, 27).
- **`SortableSentinel`** appended to `SortableContext`: an invisible `flex: 1, minWidth: 56px, alignSelf: stretch` droppable at the end of each sortable list. Required for reliable drop-to-end with `closestCenter` — zero-size elements have ~0.5px target surface and are unreachable.
- **`pointerWithin` collision detection** on `DndContext` when drop zones should match their visible rect, not their DOM container.
- **`aria-pressed` after `{...attributes}` spread** in dnd-kit draggable components — dnd-kit's attributes include their own `aria-pressed`; explicit override must come last.
- **Group reorder direction via `event.delta.x`** — insert AFTER `over` when dragging right, BEFORE when dragging left; matches `horizontalListSortingStrategy` animation.
- **`mouse.move/down/move/up (steps:15)`** for dnd-kit Playwright drags. `dragAndDrop()` fires HTML5 drag events which dnd-kit ignores.

### State & WebSocket

- **`isDraggingRef = useRef(false)`** (not `useState`) in `usePartySocket` — preserves live value inside the WebSocket message closure.
- **WebSocket state buffer (`bufferRef`)** during active drag — buffer incoming server updates, flush on `dragEnd`. Without this, any server update during a drag causes visual snap-back.
- **`enabled` flag for deferred WebSocket connect** — `usePartySocket({ enabled: joinState !== null })` gates connection on pre-join data. No race conditions on name/identity.
- **`joinState` null-check as single render gate** — `if (!joinState) return <LobbyView />` eliminates partial renders before connection state is resolved.
- **`selectionSource: { type, zoneId } | null`** for zone-exclusive selection state — prevents cross-zone selection leakage; clearing on zone change is a natural result, not a special case.

### Game Actions & Server

- **`skipSnapshot: true`** on any sort, filter, or display-preference action that round-trips through the game action system. The undo stack should only capture moves a player would want to reverse.
- **`takeSnapshot` placement**: after all validation, before any mutation — ensures undo always has a valid pre-state.
- **Pre-validate-all for batch actions**: validate every item before taking the undo snapshot or mutating anything. Atomicity is trivial when no mutation has occurred yet.
- **Type extension > parallel collections**: add fields to existing types (e.g. `Pile.region`) rather than introducing new collection types. All existing handlers, viewFor masking, and undo logic work unchanged.
- **Render-time sort, no server dispatch**: apply `sortCards()` at render time; never dispatch a reorder on sort-mode change. Avoids the infinite re-render trap of a `useEffect` watching `cards` and re-dispatching.
- **`isIntraSpreadReorder` guard in `BoardDragLayer`**: prevents `MOVE_CARD` from firing for same-pile reorders; lets `SpreadZone`'s `useDndMonitor` handle `REORDER_PILE_SPREAD` uncontested.

### Testing

- **Two `BrowserContext`s per Playwright test** for multiplayer scenarios — two Pages in one context share localStorage and therefore share the player token (both join as the same player). Always use two `BrowserContext`s for independent player sessions.
- **Wave 0 RED scaffolds before implementation** — write failing Vitest tests pinning the contract, then implement to flip GREEN.

### Process

- **Track requirements at execution time** via `gsd-transition`, not at milestone close. Stale "Pending" entries have required retroactive correction in v1.3, v1.4, and v1.5.
- **Run `gsd-code-review` after every execution phase** — WR-series fixes in multiple phases caught real correctness bugs (off-by-one, modulo bias, missing auth guard) that planning and tests missed.
- **VALIDATION.md sign-off is consistently skipped** — complete it before phase transition, not as a separate cleanup pass.
- **Responsive layout is an iceberg** — budget 3–5× planned scope when making an existing desktop-first UI responsive.
<!-- GSD:conventions-end -->

## Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start PartyKit server (`partykit dev`) |
| `npm run dev:client` | Start Vite frontend (`vite`) |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

To run the full local stack: `npm run dev` in one terminal, `npm run dev:client` in another.

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

**Server:** `server.ts` runs on PartyKit (Cloudflare Workers). One room instance per URL slug; state is in-memory per room. All game mutations arrive as typed action messages and the server is authoritative. `viewFor(connectionId)` masks card face values before each broadcast — players receive only their own hand cards; opponents see only counts (or full cards if revealed).

**Client:** Vite + React SPA. `usePartySocket` is the single bridge between server and UI; all game state flows from server broadcasts into React state. No game state in zustand or local component state — zustand is for ephemeral UI only (drag preview, selection). Player identity is a stable token in localStorage + `?player=` URL param, preserved across reconnects and page reloads.

**Zones:** All card containers are typed as `Pile`. Spread zones add `region: "spread"` and `ownerId` fields; grid zones add `region: "grid"` with row/col metadata. This keeps all existing handlers (MOVE_CARD, UNDO_MOVE, RESET_TABLE, viewFor) working without parallel dispatch paths.

**Shared types:** `src/shared/` contains types imported by both client and server, eliminating client/server sync bugs.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

## Git Workflow

**Golden rule: main is never modified locally. All changes go through feature branches and PRs.**

### Branch usage
- All work happens on a feature branch (e.g. `gsd/phase-n-slug` or `fix/description`)
- Never commit directly to `main` — hooks will block this
- Never `git merge` into local `main` — hooks will block this

### Shipping changes
1. Commit work on the feature branch
2. `git push -u origin <branch>` — push the feature branch to remote
3. `gh pr create` — open a PR; GitHub merges into `main`

### Before committing
Both enforced by `.git/hooks/pre-commit`:
- `npm test` — unit tests (Vitest)
- `npm run typecheck` — TypeScript check

### Before opening a PR
`.git/hooks/pre-push` handles this automatically:
- **If both dev servers are running** (ports 1999 + 5173): runs `npm run test:e2e` and blocks on failure
- **If servers are down**: prints a reminder with the exact commands to run before creating the PR

To run manually: start `npm run dev` and `npm run dev:client` in separate terminals, then `npm run test:e2e`



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
