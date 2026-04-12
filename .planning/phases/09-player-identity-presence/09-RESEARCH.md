# Phase 9: Player Identity & Presence — Research

**Researched:** 2026-04-12
**Domain:** React UI, PartyKit server state, localStorage persistence, real-time presence display
**Confidence:** HIGH — all findings verified against live codebase; no significant unknowns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Name entered in lobby panel, before joining. "Your name" input above "Join Game" button.
- **D-02:** "Join Game" button disabled until input has at least one non-empty character. No inline error state.
- **D-03:** Max 20 chars, non-empty. Client-side validation only; server trusts client.
- **D-04:** Names near each player's hand zone on the board — not in the header. Name + presence dot (green/grey) per seat.
- **D-05:** Existing `PlayerPresence` header dots removed. Board-level name labels replace them.
- **D-06:** Current player's name shown above their own hand zone, same as opponents. No "You" label.
- **D-07:** Name stored in `localStorage` alongside player token. Pre-fills on return visit. Player can change before joining.
- **D-08:** Name passed as `?name=` URL param on every connect (including reconnects). Server reads it and updates `GameState`.
- **D-09:** `Player` type gains `displayName: string`. `viewFor` includes it in `ClientGameState`. All players receive all names.
- **D-10:** Fallback label is `"Player"` when `displayName` is empty/missing.

### Claude's Discretion

- Exact layout / positioning of name + presence dot relative to each hand zone
- Typography and sizing of name labels (lightweight, not competing with cards)
- How name + presence dot animates or updates when a player disconnects/reconnects mid-game

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRES-01 | Player can enter a display name when joining (non-empty, max 20 chars) | Lobby input gating pattern verified; shadcn `Input` component already in use |
| PRES-02 | Display name visible to all players on the table | `viewFor` broadcasts `players` array; adding `displayName` to `Player` propagates automatically |
| PRES-03 | Display name persists across reconnects | `usePlayerId.ts` localStorage + URL param pattern directly extensible to `displayName` |
| PRES-04 | Real-time roster of connected/disconnected players | `Player.connected` field already exists; `PlayerPresence.tsx` has the styling logic to reuse |
</phase_requirements>

---

## Summary

Phase 9 is a well-scoped data threading exercise. The project already has the exact infrastructure needed: a `?player=` URL param pattern, a `Player` type with `connected: boolean`, a `viewFor` broadcast mechanism, and a `PlayerPresence` component with connected/disconnected dot styling. The phase extends all three in a parallel fashion for `displayName`.

The only architectural decision with meaningful complexity is the LobbyPanel join-gate: today the lobby renders while the WebSocket is already connecting (connection starts in `usePartySocket` which is called unconditionally in `RoomView`). D-01 requires the "Join Game" button to gate entry — but the CONTEXT decision (D-08) passes the name as a URL param on connect, which means either (a) connection is deferred until button press, or (b) connection is established pre-name and the name is passed on the first message. The codebase review confirms that option (a) is the right read of D-08: the PartySocket connect must be deferred until the player has provided a name, so the `?name=` param can be included from the first connection request.

The board layout changes (removing `PlayerPresence` from the header, adding name labels to `HandZone` and `OpponentHand`) are straightforward React component edits with no new dependencies.

**Primary recommendation:** Thread `displayName` through the same channel as `playerToken` (localStorage → URL param → `onConnect` → `GameState.players` → `viewFor` → client). The join-gate in LobbyPanel is the highest-complexity piece; plan it first.

---

## Standard Stack

No new libraries are needed. All dependencies are already installed.

### Core (existing)
| Component | Location | Purpose in Phase 9 |
|-----------|----------|---------------------|
| `shadcn Input` | `src/components/ui/` | Name input field in LobbyPanel |
| `shadcn Button` | `src/components/ui/` | "Join Game" button (disabled state already supported) |
| `localStorage` | Browser API | Persist `displayName` alongside `playerId` |
| `PartySocket` `query` param | `usePartySocket.ts` | Pass `?name=` alongside `?player=` |
| `Player.connected` | `src/shared/types.ts` | Presence dot green/grey logic |
| `cn` (clsx/tailwind-merge) | `src/lib/utils.ts` | Conditional class logic for presence dots |

### No New Dependencies

[VERIFIED: codebase grep] All required UI primitives, state management, and transport are already present. Do not add new packages.

---

## Architecture Patterns

### How the Existing Player Token Pattern Works (to mirror for displayName)

[VERIFIED: codebase read — `src/hooks/usePlayerId.ts`, `src/hooks/usePartySocket.ts`, `party/index.ts`]

```
localStorage['playerId']
    ↓
getOrCreatePlayerId()   ← reads/writes localStorage, sets ?player= in URL
    ↓
usePartySocket(roomId, playerId)   ← passes query: { player: playerId }
    ↓
PartySocket connects with ?player=<id> in URL
    ↓
party/index.ts onConnect() reads url.searchParams.get("player")
    ↓
GameState.players[n].id = playerToken
    ↓
viewFor() broadcasts players array to all clients
    ↓
ClientGameState.players includes all player IDs
```

`displayName` follows this exact path with `?name=` as the URL param and `Player.displayName` as the field.

### Recommended Project Structure Changes

```
src/hooks/
  usePlayerId.ts         # extend: also read/write displayName in localStorage
src/hooks/
  usePartySocket.ts      # extend: accept displayName param, add to query object
src/components/
  LobbyPanel.tsx         # add name input, join button, defer connection
  HandZone.tsx           # add name label + presence dot above hand
  OpponentHand.tsx       # replace playerLabel with name + presence dot
  PlayerPresence.tsx     # remove (or gut to a shared PresenceDot primitive)
  BoardView.tsx          # remove PlayerPresence from header
src/shared/
  types.ts               # Player: add displayName field; no ClientGameState change needed
party/
  index.ts               # onConnect: read ?name=, set player.displayName; migrate state
```

### Pattern 1: Deferred Connection (Join Gate)

**What:** LobbyPanel does not trigger WebSocket connection on render. Connection is initiated only when the player presses "Join Game" with a valid name.

**Why this is required:** `?name=` must be in the URL query when the socket first connects (D-08). If the socket connects before the name is known, the server receives an empty name on first connect and the reconnect-name-persistence guarantee breaks.

**Current state:** `RoomView` in `App.tsx` calls `getOrCreatePlayerId()` and `usePartySocket(roomId, playerId)` unconditionally. `gameState === null` shows `LobbyPanel`, which is a presentation layer — it does not control the socket lifecycle.

**Required change:** Move socket initialization out of `RoomView`'s unconditional render path. The simplest approach: `usePartySocket` accepts an optional `enabled: boolean` flag (defaults to `true`); `RoomView` passes `enabled={hasJoined}` where `hasJoined` is state set by the LobbyPanel callback. This avoids restructuring `App.tsx` deeply.

**Pattern (conceptual):**
```typescript
// App.tsx / RoomView
const [joinState, setJoinState] = useState<{ playerId: string; displayName: string } | null>(null);
const { gameState, connected, error, sendAction, setDragging } = usePartySocket(
  roomId, 
  joinState?.playerId ?? '', 
  joinState?.displayName ?? '',
  { enabled: joinState !== null }
);

// LobbyPanel receives onJoin callback
<LobbyPanel onJoin={(name) => setJoinState({ playerId: getOrCreatePlayerId(), displayName: name })} />
```

### Pattern 2: displayName Threading Through viewFor

**What:** `Player.displayName` is already in `GameState.players`, so `viewFor` returns it automatically since it passes `state.players` through unchanged.

[VERIFIED: party/index.ts line 54-76 — `viewFor` returns `players: state.players` directly. Adding `displayName` to the `Player` interface means zero changes to `viewFor`.]

```typescript
// src/shared/types.ts — only change needed
export interface Player {
  id: string;
  connected: boolean;
  displayName: string;   // ADD THIS
}
```

The `ClientGameState.players` field is `Player[]` — so `displayName` arrives on the client with no further changes to `viewFor`, `broadcastState`, or `ClientGameState`.

### Pattern 3: Name Labels Near Hand Zones

**What:** Each seat renders `<span>{player.displayName || 'Player'}</span>` + a green/grey dot.

**Where:**
- `HandZone.tsx` — self seat. Currently has no name display. Name label added above the hand zone strip.
- `OpponentHand.tsx` — already receives `playerLabel: string` prop (currently `"P1"`, `"P2"`, etc.). Replace with `displayName` from the players array.
- `BoardView.tsx` — already maps `opponentHandCounts` to render `OpponentHand`. The `players` array is on `gameState` — look up by player ID to get `displayName` and `connected` status.

**Presence dot reuse:** `PlayerPresence.tsx` has the exact green/grey dot styling (`bg-green-500` / `bg-gray-500`). Extract the single-dot rendering as a `PresenceDot` component, or inline it into each hand zone label. The existing PlayerPresence component renders a row of dots for all players — that pattern is being removed (D-05), but the CSS classes and logic are worth reusing.

### Anti-Patterns to Avoid

- **Connecting before name is known:** If `usePartySocket` connects before the join button is pressed, the server stores `""` as the displayName. On reconnect it would read `?name=&player=...` (empty string), overwrite the stored name. Always defer connection until name is confirmed.
- **Putting displayName in a separate message after connect:** Passing name as a URL param (D-08) is simpler and consistent with the player token pattern. Don't add a `SET_DISPLAY_NAME` ClientAction unless necessary — the URL param approach handles reconnects correctly without additional message sequencing.
- **Importing from PlayerPresence after removal:** Once `PlayerPresence.tsx` is removed from the header in `BoardView.tsx`, ensure no other file imports it. If the presence dot styling is extracted to a helper component, rename it clearly.
- **Mutating `ClientGameState` shape:** `displayName` belongs on `Player`, not as a separate `opponentNames` map or similar — the existing `players` array is already distributed to all clients via `viewFor`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Disabled button state | Custom disabled logic | `<Button disabled={!isValid}>` — shadcn Button supports native `disabled` |
| Max-length input enforcement | `onKeyDown` filter | `<Input maxLength={20}>` — native HTML attribute |
| Name pre-fill from storage | Custom hook | Extend `usePlayerId.ts` to also return/set `displayName` from localStorage |
| Presence dot styling | Re-implement green/grey logic | Copy CSS from `PlayerPresence.tsx` before removing it |

---

## Common Pitfalls

### Pitfall 1: State Migration — Existing Rooms Without displayName

**What goes wrong:** Rooms that were created before this phase have `Player` objects without `displayName`. When the server loads from Durable Objects storage, the field will be `undefined`. Accessing it anywhere (e.g., rendering `player.displayName.slice(0, 20)`) throws.

**Why it happens:** PartyKit persists `GameState` in Durable Objects storage. Old stored states don't have the new field.

**How to avoid:** In `onStart()` (the migration point already used in this codebase), add a migration step:
```typescript
for (const player of this.gameState.players) {
  if (player.displayName === undefined) {
    (player as any).displayName = '';
  }
}
```
Or use optional chaining and the fallback everywhere: `player.displayName || 'Player'`.

**Warning signs:** TypeScript will report the field as non-optional (`string`) after the type change — any code path that reads from storage without migrating will break at runtime in production, not locally.

### Pitfall 2: usePartySocket Dependency Array — displayName Not Triggering Reconnect

**What goes wrong:** If `displayName` is passed to `usePartySocket` but not included in the `useEffect` dependency array, changing the name before connecting won't update the `query` object passed to `PartySocket`.

**Why it happens:** `usePartySocket`'s `useEffect` currently depends on `[roomId, playerId]`. If `displayName` is added to the query but not the deps, the effect won't re-run if displayName changes (though in practice, the socket only connects once per join action).

**How to avoid:** Add `displayName` to the `useEffect` deps array when extending `usePartySocket`. Since the join gate ensures the socket only connects once with the final name, this is low risk — but correctness requires it in the deps.

### Pitfall 3: LobbyPanel Refactor Breaks the gameState Null Check

**What goes wrong:** `App.tsx` shows `LobbyPanel` when `gameState === null` and `BoardDragLayer` when `gameState` is non-null. Adding a join gate means there's a new state: "pre-join" (socket not yet connected, gameState is null). If the null check isn't updated, the lobby may flash briefly on reconnect.

**How to avoid:** The join gate state (`hasJoined`) is the primary gate for showing the lobby vs. board. `gameState !== null` can remain as a secondary guard. Ensure the `LobbyPanel` only renders when `!hasJoined`, not when `gameState === null && hasJoined` (which is the connecting state).

### Pitfall 4: OpponentHand playerLabel Prop Still Rendering P1/P2 Fallback

**What goes wrong:** `BoardView.tsx` currently derives `playerLabel` as `P${playerIndex + 1}`. If the lookup for `displayName` from the players array is incorrect (wrong key, missing player), it silently falls back to the old index label rather than `"Player"`.

**How to avoid:** Look up `player` by ID from `gameState.players` and derive both `displayName` and `connected` from the found player. Apply the `"Player"` fallback only when `displayName` is empty, not as a code-path fallback for missing player.

---

## Code Examples

### Extending usePlayerId.ts for displayName

```typescript
// [VERIFIED: pattern from src/hooks/usePlayerId.ts]
const NAME_STORAGE_KEY = 'displayName';

export function getDisplayName(): string {
  return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
}

export function saveDisplayName(name: string): void {
  localStorage.setItem(NAME_STORAGE_KEY, name.slice(0, 20));
}
```

### Extending onConnect in party/index.ts

```typescript
// [VERIFIED: pattern from party/index.ts onConnect]
async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
  const url = new URL(ctx.request.url);
  const playerToken = url.searchParams.get("player") ?? connection.id;
  const displayName = (url.searchParams.get("name") ?? '').slice(0, 20);

  // ... existing cap check ...

  connection.setState({ playerToken });

  if (!this.gameState.players.find(p => p.id === playerToken)) {
    this.gameState.players.push({ id: playerToken, connected: true, displayName });
    this.gameState.hands[playerToken] = [];
  } else {
    const player = this.gameState.players.find(p => p.id === playerToken);
    if (player) {
      player.connected = true;
      if (displayName) player.displayName = displayName;  // update on reconnect
    }
  }
  // ...
}
```

### Name Label + Presence Dot Pattern (for HandZone/OpponentHand)

```tsx
// Inline near hand zone — no new component required
<div className="flex items-center gap-1.5 px-1">
  <span
    className={cn(
      'rounded-full inline-block w-2 h-2',
      player.connected ? 'bg-green-500' : 'bg-gray-500'
    )}
  />
  <span className="text-xs text-muted-foreground">
    {player.displayName || 'Player'}
  </span>
</div>
```

### LobbyPanel Name Input (shadcn)

```tsx
// [VERIFIED: shadcn Input already used in ControlsBar]
import { Input } from '@/components/ui/input';

const [name, setName] = useState(() => getDisplayName()); // pre-fill from localStorage

<Input
  value={name}
  onChange={e => setName(e.target.value.slice(0, 20))}
  placeholder="Your name"
  maxLength={20}
/>
<Button
  disabled={name.trim().length === 0}
  onClick={() => {
    saveDisplayName(name.trim());
    onJoin(name.trim());
  }}
>
  Join Game
</Button>
```

---

## Runtime State Inventory

> Phase 9 renames/adds a field to `Player` — not a rename of an identifier, but a type extension. Storage migration is needed for existing rooms.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | PartyKit Durable Objects stores `GameState` per room. Existing rooms have `Player[]` without `displayName`. | Server-side migration in `onStart()` — set `displayName = ''` for players missing the field |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — TypeScript compile will catch type errors before deploy | None |

**Migration approach:** The existing `onStart()` migration pattern (already used for `undoSnapshots`) is the correct place:
```typescript
for (const player of this.gameState.players) {
  if (!('displayName' in player)) {
    (player as any).displayName = '';
  }
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | Name input validation — non-empty, max 20 chars enforced | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | No — Wave 0 |
| PRES-02 | `viewFor` includes `displayName` on all players | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | No — Wave 0 |
| PRES-03 | `onConnect` with `?name=` updates `player.displayName`; reconnect preserves name | unit | `npm test -- --reporter=verbose tests/displayName.test.ts` | No — Wave 0 |
| PRES-04 | `player.connected` toggle propagates through `viewFor` | unit (extends existing `viewFor.test.ts`) | `npm test` | Partially (connected field tested in reconnect.test.ts) |

**Note on PRES-04:** The `connected` field behavior is already tested in `reconnect.test.ts` and `viewFor.test.ts`. New tests for PRES-04 only need to verify that `displayName` appears alongside `connected` in the broadcasted `players` array — not re-test the connection toggle.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/displayName.test.ts` — covers PRES-01 (name validation logic in server), PRES-02 (viewFor includes displayName), PRES-03 (onConnect reads ?name=, reconnect updates name)

*(Existing `reconnect.test.ts` and `viewFor.test.ts` cover the connection/presence mechanics for PRES-04 — no new file needed for that requirement.)*

---

## Environment Availability

Step 2.6: SKIPPED — phase is code/config changes only. No new external tools, services, or CLIs. PartyKit dev server (`npm run dev`) already verified working in the project.

---

## Open Questions

1. **Should `displayName` be optional (`string | undefined`) or required (`string`) on the `Player` type?**
   - What we know: Making it `string` is cleaner but requires a migration. Making it optional (`string | undefined`) avoids migration but spreads optional chaining everywhere.
   - What's unclear: User preference for type strictness vs. migration complexity.
   - Recommendation: Use `string` (non-optional) and add the one-line migration in `onStart()`. The fallback `|| 'Player'` in rendering handles the empty-string case. This keeps TypeScript consumers clean.

2. **Does the join gate need to handle the "already in room, refreshed page" flow?**
   - What we know: Currently `getOrCreatePlayerId()` reads localStorage and the player reconnects automatically on page load. With the join gate, a returning player would need to press "Join Game" again to reconnect.
   - What's unclear: Is auto-reconnect on refresh desirable? The CONTEXT doesn't address this.
   - Recommendation: Pre-fill the name from localStorage and keep the join gate — the player sees their previous name and presses Join. This is one intentional step vs. fully auto-reconnect. Consistent with D-07 which says the player "can change it before joining."

---

## Project Constraints (from CLAUDE.md)

- GitHub Pages + PartyKit Cloud only (no traditional server, no database) — `displayName` flows through PartyKit in-memory state + Durable Objects, consistent with this constraint.
- Free tier only — no new paid services introduced.
- No rule enforcement — name is metadata only, not used for game logic.
- `@dnd-kit/core` for drag-and-drop — unchanged by this phase.
- No `react-beautiful-dnd` (archived) — not relevant to this phase.
- Vite for build — unchanged.
- GSD workflow enforcement — all changes go through planned tasks.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase read] `src/shared/types.ts` — `Player`, `GameState`, `ClientGameState` interfaces
- [VERIFIED: codebase read] `party/index.ts` — `onConnect`, `viewFor`, `onStart` migration pattern
- [VERIFIED: codebase read] `src/hooks/usePlayerId.ts` — localStorage + URL param pattern
- [VERIFIED: codebase read] `src/hooks/usePartySocket.ts` — socket lifecycle, query params, deps array
- [VERIFIED: codebase read] `src/components/LobbyPanel.tsx` — current join flow (no gate)
- [VERIFIED: codebase read] `src/components/BoardView.tsx` — PlayerPresence location, OpponentHand usage
- [VERIFIED: codebase read] `src/components/PlayerPresence.tsx` — connected/disconnected dot styling
- [VERIFIED: codebase read] `src/components/HandZone.tsx` — current hand zone (no name label)
- [VERIFIED: codebase read] `src/components/OpponentHand.tsx` — playerLabel prop pattern
- [VERIFIED: codebase read] `src/App.tsx` — RoomView, join flow, gameState null check
- [VERIFIED: codebase read] `tests/reconnect.test.ts`, `tests/viewFor.test.ts` — test patterns to follow
- [VERIFIED: codebase read] `vitest.config.ts` — test framework configuration

### Secondary (MEDIUM confidence)
- [ASSUMED] shadcn `Input` `maxLength` prop is a standard HTML passthrough attribute — consistent with shadcn's pattern of forwarding native HTML attributes.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | shadcn `Input` forwards native `maxLength` attribute to the underlying `<input>` element | Standard Stack | Low — can be verified by inspecting `src/components/ui/input.tsx` before implementing; fallback is `onChange` trimming |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing, read directly from codebase
- Architecture: HIGH — patterns traced through live source files
- Pitfalls: HIGH — derived from actual code paths and existing migration pattern in `onStart()`

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain — PartyKit API, shadcn, React patterns)
