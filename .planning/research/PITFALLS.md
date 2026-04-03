# Domain Pitfalls

**Domain:** Real-time multiplayer sandbox card game (React + PartyKit + dnd-kit + GitHub Pages)
**Researched:** 2026-03-28

---

## Critical Pitfalls

Mistakes that cause rewrites, security holes, or broken game state.

---

### Pitfall 1: In-Memory State Lost on PartyKit Room Hibernation

**What goes wrong:** PartyKit rooms hibernate when no messages are being exchanged. When the room wakes up, all in-memory JavaScript object state is gone — including the deck, hands, and board layout. If you only store game state in class instance variables (e.g., `this.gameState = { ... }`), a room that sits idle for a few minutes will forget everything. Players who leave for a bathroom break return to an empty table.

**Why it happens:** PartyKit is built on Cloudflare Durable Objects. When a room hibernates, the isolate is deallocated. Instance variables do not survive across hibernate/wake cycles. This is not a bug — it is the intended behavior for resource efficiency.

**Consequences:** Game state silently wiped mid-session. Players reconnect to a default state with no cards dealt. No error is thrown — the room just looks "fresh."

**Prevention:** Persist game state explicitly via `this.party.storage` on every mutation. In `onStart`, reload from storage before accepting connections. Structure state as a single serializable object to simplify reads and writes.

```typescript
// On every state change:
await this.party.storage.put("gameState", this.gameState);

// On room start:
async onStart() {
  this.gameState = await this.party.storage.get("gameState") ?? defaultState();
}
```

**Warning signs:** Game state works fine during active play but "resets" after players go idle for 5–10 minutes.

**Sources (MEDIUM confidence):** [PartyKit persisting state guide](https://docs.partykit.io/guides/persisting-state-into-storage/), [Scaling with Hibernation](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/)

---

### Pitfall 2: Broadcasting Full State to All Connections — Hand Privacy Leak

**What goes wrong:** The simplest broadcast pattern is `this.party.broadcast(JSON.stringify(state))`. If the full state — including all players' hands — is broadcast to every connection, any player can open DevTools → Network → WebSocket frames and read opponents' cards.

**Why it happens:** Developers conflate "real-time sync" with "same message to everyone." The shared board is public but hands are private. These require different message shapes per connection.

**Consequences:** Any player with DevTools can see all opponents' hands. The entire strategic value of the game is eliminated. This is not a theoretical attack — it takes 30 seconds to discover.

**Prevention:** Never broadcast a full game state object. Build a `viewFor(connectionId)` function that returns a state slice where other players' hands have cards replaced with a masked representation (e.g., `{ face: "back", id }` instead of `{ face: "A♠", id }`). Send the connection-specific view to each connection individually inside `onConnect` and after any state change.

```typescript
for (const conn of this.party.getConnections()) {
  conn.send(JSON.stringify(viewFor(this.gameState, conn.id)));
}
```

**Warning signs:** You are calling `this.party.broadcast(...)` and passing any object that contains hand data.

---

### Pitfall 3: Client Owns Game State (Zustand / React State Treated as Source of Truth)

**What goes wrong:** Developers mirror game state into React state (via `useState`, `useReducer`, or zustand) and treat that local copy as authoritative. When two players act simultaneously, their local states diverge and the server has no way to reconcile. The game silently desynchronizes.

**Why it happens:** React developers are used to owning state client-side. The mental model of "fetch once, manage locally" does not apply when state is shared across multiple clients.

**Consequences:** Players see different board states. Cards appear to "split" — one player sees a card on the table, another sees it still in a hand. No crash, no error, just inconsistency that is very hard to debug.

**Prevention:** The server (PartyKit) is the single source of truth. The client holds a read-only mirror. The client sends intents (actions), not state. The server processes the intent, updates authoritative state, and broadcasts back. React state only holds the last message received from the server plus ephemeral UI state (drag preview, hover effects).

**Warning signs:** You are calling `setGameState(updater)` in response to a user action before sending a WebSocket message to the server.

---

### Pitfall 4: dnd-kit and Real-Time State Updates Conflict During Drag

**What goes wrong:** dnd-kit manages its own internal drag state. If a WebSocket message updates React state while a drag is in progress, the component re-renders with the new data, which can reset the dragged item's position or confuse dnd-kit's internal tracking.

**Why it happens:** dnd-kit is not aware of external state changes. It expects to own the positional state of items during a drag. React re-rendering the card list mid-drag with new server data tears that expectation.

**Consequences:** Cards visually snap back during drag. Drag operations appear to cancel. In rare cases, `onDragEnd` fires with stale IDs, causing the wrong card to move.

**Prevention:** During an active drag (tracked via `onDragStart`/`onDragEnd`), buffer incoming server state updates rather than applying them immediately. Apply the buffered update on `onDragEnd`. This requires a small local flag:

```typescript
const isDraggingRef = useRef(false);
const pendingServerState = useRef(null);

// In onDragStart: isDraggingRef.current = true
// In onDragEnd: isDraggingRef.current = false; apply pendingServerState.current if set
// In WebSocket message handler: if dragging, store in pendingServerState; else apply directly
```

**Warning signs:** Cards visually jump or reset during drags when other players take simultaneous actions.

---

### Pitfall 5: GitHub Pages 404 on Direct Navigation / Refresh

**What goes wrong:** If the app uses client-side routing (e.g., `/room/abc123` as a route), refreshing the page or sharing a direct URL returns a GitHub Pages 404 because GitHub Pages only serves files that exist on disk — it does not know to serve `index.html` for all routes.

**Why it happens:** GitHub Pages is a static file host. It has no server-side routing fallback. React Router's routes are client-only and do not map to files.

**Consequences:** Sharing a room link causes a 404 for anyone clicking it. The app appears broken on first load or after refresh.

**Prevention:** Either (a) copy `dist/index.html` to `dist/404.html` at build time — GitHub Pages serves `404.html` for unknown paths, which boots the SPA and lets the router take over — or (b) use hash-based routing (`/#/room/abc123`) which never requires a server-side lookup.

```bash
# In package.json build script:
"build": "tsc && vite build && cp dist/index.html dist/404.html"
```

Also set `base` in `vite.config.ts` to match your GitHub Pages subdirectory (e.g., `base: '/virtual-deck/'`).

**Warning signs:** The app works on `localhost` but shows a 404 when deployed, or only when navigating directly to a non-root URL.

---

## Moderate Pitfalls

Mistakes that cause bugs, poor UX, or wasted development effort.

---

### Pitfall 6: useSortable and useDroppable on the Same Element

**What goes wrong:** dnd-kit's `useSortable` and `useDroppable` conflict when applied to the same DOM element. Sortable contexts interpret all drags as sort operations; simultaneously treating an element as a drop target causes event conflicts.

**Prevention:** Separate card slots (drop zones) from the sortable list container. Use `useDroppable` only on container-level zones (the pile, the board area), and `useSortable` only on individual cards within those zones. Never combine both hooks on the same element.

**Warning signs:** Drop events fire inconsistently; sortable items refuse to drop into zones.

---

### Pitfall 7: PartyKit Redeployment Wipes Room State

**What goes wrong:** Running `npx partykit deploy` resets all running rooms on the PartyKit server. Any in-progress game is lost.

**Why it happens:** Deployment restarts the Durable Object isolates. Even with storage persistence, the timing of `onStart` and the reconnection window can cause a transient blank state to be served.

**Prevention:** Persist state to `party.storage` continuously (see Pitfall 1). Always test that your `onStart` correctly reloads from storage by intentionally calling `partykit dev` restart during a local test session. Communicate to players before redeploying during active sessions.

**Warning signs:** All rooms are empty immediately after a deploy, even with active players.

---

### Pitfall 8: Shuffle Runs Client-Side and Is Predictable / Cheatable

**What goes wrong:** If the shuffle is computed in the browser and the result is sent to the server, any player who modifies the JavaScript before dealing can predict or control the shuffle outcome.

**Why it happens:** It is easier to write shuffle logic in the React component than in the PartyKit server.

**Consequences:** Technically cheatable game. Not a practical concern for friends playing together, but still architecturally wrong — any client-influenced randomness undermines server authority.

**Prevention:** The shuffle must run on the PartyKit server using `crypto.getRandomValues` (available in the Cloudflare Workers runtime). The client sends a "deal" or "shuffle" intent; the server computes and stores the new order.

**Warning signs:** Shuffle logic lives in a React component or a client-side utility file.

---

### Pitfall 9: Connection IDs Are Not Stable Player Identifiers

**What goes wrong:** PartyKit assigns a new `connection.id` each time a player reconnects. If you use `connection.id` as the key in your player-to-hand map, reconnecting after a network blip creates a new player entry and orphans the old hand.

**Why it happens:** Connection ID is a transport-level concept, not an application-level concept. They are not the same thing.

**Prevention:** On connect, require the client to send a player token (generated client-side with `nanoid`, stored in `localStorage`). The server maps player tokens to hands. A reconnecting player with the same token reclaims their hand. `connection.id` is used only for per-connection state filtering (Pitfall 2), never as a player identity key.

**Warning signs:** A player's hand disappears after they refresh or lose network briefly.

---

### Pitfall 10: Large Card Images / Assets Bloat Initial Load

**What goes wrong:** Including full-resolution card images as static assets results in a large initial download that blocks the game from starting, especially on mobile or slower connections.

**Prevention:** Use a CSS/SVG card rendering approach or a single sprite sheet rather than 52 individual image files. Lazy-load card backs and face textures only when needed. Keep total initial asset payload under 200KB compressed.

**Warning signs:** First meaningful paint takes more than 3 seconds on a typical home connection.

---

### Pitfall 11: No Optimistic UI for Card Moves — Game Feels Laggy

**What goes wrong:** If the client waits for a server round-trip before moving a card visually, card drags feel unresponsive. Even at 20ms local latency, a wait-for-server-then-render cycle creates perceptible lag.

**Why it happens:** Naive implementation: send message → wait → update state on receipt.

**Prevention:** Apply the move locally on `onDragEnd` (optimistic update), then send the intent to the server. If the server rejects or corrects the move (edge case for a sandbox game), revert. For a rules-light sandbox this rejection case is rare enough to ignore in early phases — optimistic apply is sufficient.

**Warning signs:** Card drops have a noticeable delay between releasing the mouse and the card appearing in its new position.

---

### Pitfall 12: No Room Expiry — Abandoned Rooms Accumulate

**What goes wrong:** Rooms are created on demand and never cleaned up. Over time, the PartyKit storage fills with state from abandoned games. On the hobby tier this is unlikely to be a billing issue, but it creates operational messiness.

**Prevention:** Write a room creation timestamp to storage. Use PartyKit Alarms (if available) or simply check on `onStart`: if the last activity timestamp is older than 24–48 hours and no players are connected, clear the stored state.

**Warning signs:** Storage keys accumulate indefinitely; every test session creates a permanent room entry.

---

## Minor Pitfalls

Small issues that cause confusion or wasted time.

---

### Pitfall 13: `base` Path Missing in Vite Config for GitHub Pages

**What goes wrong:** If your repo is deployed to `https://user.github.io/virtual-deck/`, all asset paths must be relative to `/virtual-deck/`. Without setting `base: '/virtual-deck/'` in `vite.config.ts`, all JS and CSS imports 404.

**Prevention:** Set `base` in `vite.config.ts` before the first deploy. Use an environment variable to avoid hardcoding for local dev:

```typescript
base: process.env.NODE_ENV === 'production' ? '/virtual-deck/' : '/'
```

**Warning signs:** App loads a blank page on GitHub Pages with `404` errors for bundle files in DevTools Network tab.

---

### Pitfall 14: partysocket Package Name / Import May Have Changed

**What goes wrong:** The `partysocket` npm package was the correct client-side WebSocket wrapper as of training data cutoff. PartyKit was pre-1.0 and has a history of API and package changes. If the package has been renamed or merged into a unified SDK, the install command and import paths in documentation and tutorials may be wrong.

**Prevention:** Before installation, check https://docs.partykit.io for the current recommended client package. Verify `partysocket` still exists on npm and is not deprecated.

**Warning signs:** `npm install partysocket` resolves but the import path or API differs from the docs.

---

### Pitfall 15: nanoid v3 vs v4 in Cloudflare Workers

**What goes wrong:** nanoid v3 depends on Node.js `crypto` module, which is not available in the Cloudflare Workers runtime. Using nanoid v3 on the PartyKit server for room code generation causes a runtime error.

**Prevention:** Use nanoid v4+, which uses the Web Crypto API (`crypto.getRandomValues`) and is compatible with Cloudflare Workers. Confirm the installed version: `npm ls nanoid`. Alternatively, use `crypto.randomUUID()` directly (available in Cloudflare Workers) and truncate or encode as needed.

**Warning signs:** `ReferenceError: crypto is not defined` or `Cannot find module 'crypto'` in PartyKit server logs.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Initial PartyKit server setup | Pitfall 1 (no state persistence) | Implement `onStart` storage reload from day one |
| First broadcast implementation | Pitfall 2 (hand privacy leak) | Write `viewFor(connectionId)` before any hand data goes to server |
| Player identity / reconnect | Pitfall 9 (connection ID used as player key) | Design player token flow in Phase 1, not as an afterthought |
| Drag-and-drop implementation | Pitfall 4 (real-time update conflicts) | Build drag buffering hook before connecting to live server state |
| dnd-kit zone architecture | Pitfall 6 (sortable + droppable conflict) | Use separate drop zones for piles vs. sortable hand |
| Shuffle / deal logic | Pitfall 8 (client-side randomness) | Shuffle on server from first implementation |
| GitHub Pages deployment | Pitfall 5 (SPA 404), Pitfall 13 (base path) | Configure both before first deploy; test refresh on deployed URL |
| Package installation | Pitfall 14 (partysocket), Pitfall 15 (nanoid) | Verify both against current docs before any code is written |

---

## Sources

- [PartyKit Persisting State Guide](https://docs.partykit.io/guides/persisting-state-into-storage/) — HIGH confidence (official docs)
- [PartyKit Hibernation Guide](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/) — HIGH confidence (official docs)
- [PartyKit Server API](https://docs.partykit.io/reference/partyserver-api/) — HIGH confidence (official docs)
- [dnd-kit GitHub Issues: useSortable + useDroppable conflict](https://github.com/clauderic/dnd-kit/issues/1633) — MEDIUM confidence (community report, unverified fix status)
- [dnd-kit Quickstart](https://dndkit.com/react/quickstart) — HIGH confidence (official docs)
- [GitHub Pages SPA 404 workaround](https://github.com/orgs/community/discussions/64096) — HIGH confidence (GitHub official community forum)
- [Cloudflare Durable Objects Limits](https://developers.cloudflare.com/durable-objects/platform/limits/) — HIGH confidence (official Cloudflare docs)
- [WebSocket Reconnection State Sync](https://websocket.org/guides/reconnection/) — MEDIUM confidence (WebSocket.org guide)
- Pitfall 2 (hand privacy), Pitfall 3 (client state anti-pattern), Pitfall 8 (server-side shuffle), Pitfall 11 (optimistic UI) — HIGH confidence, derived from architectural first principles corroborated by multiple sources
