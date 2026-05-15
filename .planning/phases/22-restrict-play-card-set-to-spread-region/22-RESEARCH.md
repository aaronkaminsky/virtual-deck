# Phase 22: Hand Reveal - Research

**Researched:** 2026-05-15
**Domain:** PartyKit server-side state masking, React component prop threading, TypeScript type extension
**Confidence:** HIGH

## Summary

Phase 22 adds a Show/Hide Hand toggle. When a player reveals their hand, every other player immediately sees card faces instead of backs. The reveal state is persisted in PartyKit room storage so reconnecting players see the correct state. The revealing player's own view is unchanged.

All the building blocks are already in the codebase. The implementation is a clean extension of the existing `viewFor()` masking pattern — the single authoritative location where per-connection data is filtered. No new libraries, no new architectural patterns, no external APIs.

The data model change (`handRevealed` field on `Player` or `GameState`) cascades through four files: `src/shared/types.ts`, `party/index.ts`, `src/components/HandZone.tsx`, and `src/components/OpponentHand.tsx`. `BoardView.tsx` needs minor prop threading. Because `GameState` is persisted to PartyKit storage, a forward-compatible migration guard must be added in `onStart()` — matching the pattern already used for `displayName`, `region`, and `ownerId`.

**Primary recommendation:** Add `handRevealed: boolean` to the `Player` interface (not a separate `Record` at `GameState` level) — it co-locates with the player it describes, simplifies `RESET_TABLE`, and keeps `viewFor()` straightforward.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Toggle lives in the HandZone header row, inline with player name and connection dot.
- **D-02:** Icon-only button using lucide-react `Eye` / `EyeOff`. Matches PileZone 28×28px style.
- **D-03:** Revealed opponent: `OpponentHand` renders a scrollable row of `CardFace` components — same layout as current back row, no cap.
- **D-04:** No "showing" label or badge on opponent view — faces are self-explanatory.
- **D-05:** Local player's own HandZone shows two simultaneous signals when revealed: (1) icon reflects revealed state, (2) teal/blue glow or border using `ring-primary` palette.
- **D-06:** Revealed-state indicator exists only on the local player's HandZone.
- **D-07:** `RESET_TABLE` clears all `handRevealed` states for all players.

### Claude's Discretion
- Exact placement of `handRevealed` field: on `Player` type or as `Record<string, boolean>` at `GameState` level.
- Exact `ClientAction` type name for the toggle (e.g., `SET_HAND_REVEALED`).
- Exact glow/border CSS (`ring-1 ring-primary/50` or `border border-primary/40`).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAND-01 | Player can toggle their hand face-up to reveal all cards to other players | `SET_HAND_REVEALED` action → server sets `player.handRevealed = true` → `viewFor()` includes full card array for revealed players |
| HAND-02 | Player can toggle their hand face-down to re-hide their cards | Same action with `revealed: false` → `viewFor()` reverts to count-only for that player |
| HAND-03 | Hand revealed/hidden state is broadcast in real time to all connected players | Existing `broadcastState()` calls `viewFor()` per connection — no change needed; state update flows automatically |
| HAND-04 | Hand revealed state is persisted in server room state so reconnecting players see the correct current state | `handRevealed` lives on `Player` in `GameState`, which is already persisted via `this.room.storage.put("gameState", this.gameState)` in every `persist()` call |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Store and broadcast reveal state | API/Backend (PartyKit server) | — | Per-connection masking already done server-side in `viewFor()`; reveal state must live where masking lives |
| Toggle action dispatch | Browser/Client (`HandZone`) | — | User gesture → `sendAction()` → WebSocket message to server |
| Display revealed opponent cards | Browser/Client (`OpponentHand`) | — | Rendering decision based on data already in `ClientGameState` |
| Revealed-state UI indicator (glow/border) | Browser/Client (`HandZone`) | — | Local visual only; no server round-trip needed |
| Reset reveal state on table reset | API/Backend (PartyKit server) | — | Part of `RESET_TABLE` handler; must be co-located with the handler that owns reset |

## Standard Stack

### Core (no new packages needed)

All capabilities are satisfied by existing dependencies. [VERIFIED: package.json in codebase]

| Library | Purpose in this phase | Already installed |
|---------|----------------------|-------------------|
| lucide-react | `Eye` / `EyeOff` icons for toggle button | Yes — already imported in `PileZone.tsx` |
| `cn()` (clsx/tailwind-merge) | Conditional glow class on `HandZone` container | Yes — used throughout |
| React 18 / TypeScript 5 | Type-safe component props | Yes |
| PartyKit server types | `Party.Connection`, `Party.Room` | Yes |

**No new packages to install.** This phase is zero-dependency.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages.

## Architecture Patterns

### System Architecture Diagram

```
Player clicks toggle
        |
        v
HandZone dispatches SET_HAND_REVEALED { revealed: true/false }
        |
        v
PartyKit server: onMessage handler
  - updates player.handRevealed in GameState
  - calls persist() → storage.put("gameState", ...)
  - calls broadcastState()
        |
        v
broadcastState() iterates all connections
  → viewFor(state, connectionToken) per connection
        |
        ├── for the toggling player:
        │     myHand = full cards (unchanged)
        │     opponentHandCards for revealed opponents included
        │
        └── for each other player:
              opponentHandCards[toggledPlayerId] = full Card[]  (when revealed)
              opponentHandCounts[toggledPlayerId] = count only  (when hidden)
        |
        v
Client receives STATE_UPDATE
  - OpponentHand: if revealed → render CardFace row; else → render CardBack row (existing)
  - HandZone: if myHand is revealed → add ring-primary border + icon state
```

### Recommended Project Structure

No structural changes. Files modified in-place:

```
src/shared/types.ts          — add handRevealed field to Player; extend ClientGameState
party/index.ts               — viewFor(), RESET_TABLE handler, onStart() migration, new action case
src/components/HandZone.tsx  — toggle button in header; conditional glow on container
src/components/OpponentHand.tsx — revealed rendering path (CardFace row)
src/components/BoardView.tsx — thread handRevealed state to HandZone and OpponentHand
```

### Pattern 1: `viewFor()` Conditional Masking

The existing masking pattern already handles per-player data differently. This phase extends it.

**Current code (party/index.ts:74-78):** [VERIFIED: codebase]
```typescript
opponentHandCounts: Object.fromEntries(
  Object.entries(state.hands)
    .filter(([token]) => token !== playerToken)
    .map(([token, cards]) => [token, cards.length])
),
```

**Extended pattern for Phase 22:**
```typescript
// In ClientGameState, add:
opponentHandCounts: Record<string, number>;  // unchanged — still present for hidden players
opponentRevealedHands: Record<string, Card[]>;  // new — populated for revealed opponents

// In viewFor():
opponentHandCounts: Object.fromEntries(
  Object.entries(state.hands)
    .filter(([token]) => token !== playerToken)
    .filter(([token]) => !state.players.find(p => p.id === token)?.handRevealed)
    .map(([token, cards]) => [token, cards.length])
),
opponentRevealedHands: Object.fromEntries(
  Object.entries(state.hands)
    .filter(([token]) => token !== playerToken)
    .filter(([token]) => state.players.find(p => p.id === token)?.handRevealed)
    // Note: no masking needed — these cards are intentionally revealed
),
```

**Alternative approach:** Keep `opponentHandCounts` for all opponents (revealed players get their actual count), add a separate `opponentRevealedHands` field. This is cleaner than trying to overload a single field.

### Pattern 2: `onStart()` Migration Guard

Every `GameState` persisted before this phase has no `handRevealed` field on `Player`. The existing migration pattern in `onStart()` handles this: [VERIFIED: codebase — party/index.ts:116-158]

```typescript
// In onStart(), after existing migrations:
for (const player of this.gameState.players) {
  if (!('handRevealed' in player)) {
    (player as any).handRevealed = false;
  }
}
```

### Pattern 3: Icon-Only Button (matching PileZone style)

[VERIFIED: codebase — PileZone.tsx:77-95]

```tsx
// PileZone reference — 28×28px ghost button with lucide icon
<Button
  variant="ghost"
  className="h-7 w-7 p0"
  onClick={handleToggleFace}
  title="..."
  aria-label="..."
>
  {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</Button>
```

Apply same structure in `HandZone` header row for the reveal toggle.

### Pattern 4: Conditional `ring-primary` Glow

[VERIFIED: codebase — `SortableHandCard` in HandZone.tsx uses `ring-1 ring-primary/30`]

For the HandZone container when revealed:
```tsx
<div
  className={cn(
    'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card',
    isOver ? 'border-t-2 border-primary' : '',
    isRevealed ? 'ring-1 ring-primary/50 ring-inset' : ''
  )}
>
```

### Pattern 5: Revealed Opponent Card Row

[VERIFIED: codebase — current `OpponentHand` renders backs in a flex row]

The revealed path mirrors the existing back row:
```tsx
// Current: backs
{Array.from({ length: Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS) }).map((_, i) => (
  <CardBack key={i} className={cn('w-[42px] h-[59px]', i > 0 ? '-ml-3' : undefined)} />
))}

// New: faces (when revealed) — no cap, scrollable
{revealedCards.map((card, i) => (
  <CardFace key={card.id} card={card} className={cn('w-[42px] h-[59px]', i > 0 ? '-ml-3' : undefined)} />
))}
```

The `MAX_VISIBLE_OPPONENT_CARDS` cap (currently 5) does NOT apply to revealed hands — the CONTEXT.md explicitly says "no card count cap" (D-03). The container is already `overflow-x-auto`-capable.

### Pattern 6: `RESET_TABLE` Extension

[VERIFIED: codebase — party/index.ts:489-511]

The `RESET_TABLE` handler iterates `this.gameState.players` for other operations. Adding the `handRevealed` reset is one line per player:
```typescript
case "RESET_TABLE": {
  // ... existing logic ...
  for (const player of this.gameState.players) {
    player.handRevealed = false;  // D-07: clear all reveal states on reset
  }
  // ...
}
```

### Anti-Patterns to Avoid

- **Do not use `room.broadcast()` for reveal state.** The project uses per-connection `viewFor()` — each client receives a different view. Broadcasting a single message would break masking. [VERIFIED: codebase — `broadcastState()` in party/index.ts:679-685]
- **Do not put `handRevealed` in `ClientGameState.players`.** The `players` array flows through to clients; adding reveal state there would mean every client can read every player's reveal state from the `players` array directly rather than through `viewFor()`. Keep `handRevealed` in server-only `GameState.Player`, and expose it to non-viewers only via `opponentRevealedHands`.
- **Do not skip the `onStart()` migration guard.** Old persisted state has no `handRevealed` field. Without the guard, reading `player.handRevealed` on old state returns `undefined`, which is falsy but not typed as `boolean` — TypeScript will complain.
- **Do not put `handRevealed` in `undoSnapshots`.** The reveal state is not a game move — it does not belong in the undo history. Do not call `takeSnapshot()` before handling `SET_HAND_REVEALED`. This is consistent with how other non-undoable actions (like `RESET_TABLE`) work.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Conditional CSS classes | Manual string concatenation | `cn()` already in codebase |
| Real-time broadcast | Custom WebSocket loop | `broadcastState()` already calls `viewFor()` per connection |
| Persistent state | Custom serialization | `this.room.storage.put("gameState", ...)` already in `persist()` |
| Icon toggle | SVG from scratch | lucide-react `Eye`/`EyeOff` — already imported in `PileZone.tsx` |

**Key insight:** The entire real-time pipeline (action → persist → broadcast → mask per client) already exists. This phase only adds a new action type and a new field to the masking logic.

## Common Pitfalls

### Pitfall 1: Forgetting `opponentRevealedHands` needs to carry full `Card[]` not `MaskedCard[]`

**What goes wrong:** The `MaskedCard` type (`{ faceUp: false }`) is used throughout the codebase for hidden cards. If `opponentRevealedHands` is typed as `(Card | MaskedCard)[]`, the rendering side loses type safety on fields like `rank` and `suit`.

**Why it happens:** Copy-paste from `ClientPile.cards` which uses `(Card | MaskedCard)[]`.

**How to avoid:** Type `opponentRevealedHands` as `Record<string, Card[]>` — these cards are deliberately revealed, not masked.

### Pitfall 2: Revealed player appears in both `opponentHandCounts` AND `opponentRevealedHands`

**What goes wrong:** If the filter in `viewFor()` doesn't exclude revealed players from `opponentHandCounts`, a revealed player shows up in both fields. The client then has to decide which one to use, and the count badge might appear alongside the face row.

**Why it happens:** Forgetting to add `.filter(([token]) => !state.players.find(p => p.id === token)?.handRevealed)` to the `opponentHandCounts` mapping.

**How to avoid:** In `viewFor()`, make the two mappings mutually exclusive: hidden players go in `opponentHandCounts`, revealed players go in `opponentRevealedHands`.

### Pitfall 3: Stale `ClientGameState` type — `opponentRevealedHands` not threaded through

**What goes wrong:** The new field is added to the type but not populated in `viewFor()`, or populated in `viewFor()` but not used in `BoardView.tsx` → `OpponentHand.tsx`.

**Why it happens:** TypeScript allows optional fields to be undefined at runtime if `viewFor()` was not updated. The component silently falls back to the hidden rendering.

**How to avoid:** Make `opponentRevealedHands` a required (non-optional) field on `ClientGameState` so TypeScript enforces it everywhere. Non-revealed players simply have an empty array or are absent from the record.

### Pitfall 4: `handRevealed` indicator shown to other players (D-06 violation)

**What goes wrong:** The glow/ring applied to `HandZone` is rendered for all views, including when `HandZone` is theoretically used to display an opponent's hand.

**Why it happens:** The `HandZone` component is only used for the local player's hand (`BoardView.tsx:102-114`). `OpponentHand` is a separate component. So this is not actually a risk in the current architecture — but worth being aware of.

**How to avoid:** No action needed — `HandZone` is exclusively for the local player. The `isRevealed` prop in `HandZone` should map to `gameState.myHandRevealed` (a new field in `ClientGameState`), not derived from opponent data.

### Pitfall 5: `RESET_TABLE` tests break because `handRevealed` not reset

**What goes wrong:** Existing `resetTable.test.ts` may not test `handRevealed` clearing. If `handRevealed` is not cleared on reset, players who revealed before a reset remain revealed afterward.

**Why it happens:** Forgetting D-07. The `RESET_TABLE` handler is a targeted implementation — it only resets what it explicitly handles.

**How to avoid:** Add a test case to `resetTable.test.ts` asserting `handRevealed` is `false` for all players after reset.

## Code Examples

### `ClientGameState` type extension

```typescript
// Source: codebase analysis of src/shared/types.ts
export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  myHandRevealed: boolean;                      // NEW: is the local player's hand currently revealed?
  opponentHandCounts: Record<string, number>;   // unchanged — hidden opponents only
  opponentRevealedHands: Record<string, Card[]>; // NEW — revealed opponents only
  piles: ClientPile[];
  canUndo: boolean;
  myPlayZoneId: string;
}
```

### New `ClientAction` variant

```typescript
// Source: codebase analysis of src/shared/types.ts
| { type: "SET_HAND_REVEALED"; revealed: boolean }
```

### `HandZone` props extension

```typescript
// Source: codebase analysis — HandZoneProps currently at HandZone.tsx:67-77
interface HandZoneProps {
  // ... existing props ...
  isRevealed: boolean;                         // NEW
  onToggleReveal: () => void;                  // NEW
}
```

### `OpponentHand` props extension

```typescript
// Source: codebase analysis — OpponentHandProps at OpponentHand.tsx:8-13
interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  revealedCards?: Card[];                      // NEW — undefined or empty = hidden
}
```

## State of the Art

No external library changes. The patterns used are current for the codebase.

| Old Approach | Current Approach | Notes |
|---|---|---|
| `opponentHandCounts` only | `opponentHandCounts` (hidden) + `opponentRevealedHands` (revealed) | Extension, not replacement |

## Assumptions Log

All critical claims were verified directly from the codebase. No assumed claims.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

None. All decisions are locked in CONTEXT.md and the codebase provides all needed patterns.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — code/config changes only, no new tools required).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (same — no separate slow suite) |
| Typecheck command | `npm run typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAND-01 | `SET_HAND_REVEALED { revealed: true }` toggles `player.handRevealed` to `true` in GameState | unit | `npm test -- --reporter=verbose tests/handReveal.test.ts` | ❌ Wave 0 |
| HAND-02 | `SET_HAND_REVEALED { revealed: false }` toggles back; `opponentHandCounts` restored, `opponentRevealedHands` cleared | unit | `npm test -- --reporter=verbose tests/handReveal.test.ts` | ❌ Wave 0 |
| HAND-03 | After `SET_HAND_REVEALED`, remote connection receives `STATE_UPDATE` with full cards in `opponentRevealedHands`, not in `opponentHandCounts` | unit | `npm test -- --reporter=verbose tests/handReveal.test.ts` | ❌ Wave 0 |
| HAND-04 | `handRevealed: true` on `Player` persists to storage and is reflected in `viewFor()` after reconnect | unit | `npm test -- --reporter=verbose tests/handReveal.test.ts` | ❌ Wave 0 |
| HAND-04 (reset) | `RESET_TABLE` sets `handRevealed: false` for all players | unit | extend `tests/resetTable.test.ts` | ✅ (needs new case) |
| — | Existing `viewFor.test.ts` and `broadcastMasking.test.ts` continue to pass | regression | `npm test` | ✅ |

### Sampling Rate

- **Per task commit:** `npm test && npm run typecheck`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/handReveal.test.ts` — covers HAND-01, HAND-02, HAND-03, HAND-04
  - Uses `makeMockRoom`, `makeMockConnection`, `makeCard` from `tests/helpers.ts` (already exists)
  - Follows pattern of `tests/broadcastMasking.test.ts` for multi-connection tests
- [ ] New `resetTable.test.ts` case: "clears handRevealed for all players on RESET_TABLE"

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Server enforces: only the sender can reveal their own hand |
| V5 Input Validation | yes | `revealed` field must be boolean; reject unknown fields |
| V6 Cryptography | no | — |

### Access Control Requirement (V4)

The `SET_HAND_REVEALED` handler must verify that `senderToken === playerToken` before mutating state. Any player sending `{ type: "SET_HAND_REVEALED", revealed: true }` should only affect their own `handRevealed` flag — the server uses `senderToken` (from `getPlayerToken(sender)`) to find the correct player. This is the same pattern as `REORDER_HAND`.

No input allows a player to reveal another player's hand.

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Player B sends `SET_HAND_REVEALED` on behalf of Player A | Tampering | Server uses `senderToken` from connection state, not from message body |
| Client sends non-boolean `revealed` value | Tampering | TypeScript type check at parse time; treat falsy as `false` |

## Sources

### Primary (HIGH confidence)

- Codebase: `party/index.ts` — `viewFor()`, `onStart()` migration pattern, `RESET_TABLE` handler, `broadcastState()` loop
- Codebase: `src/shared/types.ts` — `Player`, `GameState`, `ClientGameState`, `ClientAction` current shapes
- Codebase: `src/components/PileZone.tsx` — icon-only button style (28×28px, `h-7 w-7 p-0`, ghost variant)
- Codebase: `src/components/HandZone.tsx` — header row layout, `cn()` usage, `ring-primary/30` selection pattern
- Codebase: `src/components/OpponentHand.tsx` — current card-back row rendering
- Codebase: `src/components/SpreadZone.tsx` — `CardFace` rendering pattern
- Codebase: `tests/helpers.ts`, `tests/broadcastMasking.test.ts` — test infrastructure pattern

### Secondary (MEDIUM confidence)

None needed — all findings verified directly from codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing packages verified in package.json
- Architecture: HIGH — data flow verified directly from party/index.ts; all integration points read
- Pitfalls: HIGH — derived from actual type shapes and existing code patterns, not training assumptions

**Research date:** 2026-05-15
**Valid until:** Until any of the five listed files are modified by another phase
