# Phase 10: Shuffle Before Deal - Research

**Researched:** 2026-04-18
**Domain:** Server-side game state mutation + client-side CSS animation synchronized via WebSocket event
**Confidence:** HIGH

## Summary

Phase 10 has two distinct concerns: (1) a trivial server-side change — insert `shuffle(drawPile.cards)` before the card-pop loop in `DEAL_CARDS`, and (2) a more involved animation concern — broadcast a signal on every pile shuffle so all clients can play a card-fan animation before the shuffled state arrives.

The shuffle logic already exists (`shuffle<T>` in `party/index.ts`, Fisher-Yates + crypto.getRandomValues). The only server plumbing question is: how does the client learn a shuffle happened so it can animate? The cleanest approach is a new `PILE_SHUFFLED` server event type broadcast before the state update — clients animate on that event, then apply the subsequent `STATE_UPDATE` once the animation completes. For the deal path, the server uses `await new Promise(resolve => setTimeout(resolve, <duration>))` as a sequencing delay between the shuffle broadcast and the state broadcast (this pattern is safe in Cloudflare Workers / PartyKit edge runtime). Alternative: the client uses the `STATE_UPDATE` itself with a shuffle flag on the pile, animating before applying the state — but this adds a pile field and couples animation timing to state application, making it harder to reason about.

The animation itself is pure CSS: a `@keyframes` fan spread using `transform: translateX / rotate` on phantom card elements layered behind the visible pile face. `tw-animate-css` is already imported in the project stylesheet, so Tailwind `animate-*` utility classes work. The fan pattern requires a fixed number of "ghost" card divs rendered absolutely inside the pile container, each animated with a staggered delay — no additional libraries are needed.

**Primary recommendation:** Add `PILE_SHUFFLED` to the `ServerEvent` union; broadcast it from `SHUFFLE_PILE` and from `DEAL_CARDS` (before the deal loop); add a server-side delay (`setTimeout`) for the deal path so state arrives after the animation window; animate in `PileZone` on receipt of `PILE_SHUFFLED`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Any pile" means the existing draw-pile deal only — no per-pile deal buttons added
- **D-02:** `DEAL_CARDS` handler shuffles the draw pile before popping cards (server-side, within the same action handler)
- **D-03:** `takeSnapshot()` is called before the shuffle — undoing a deal restores both cards AND the original pre-shuffle pile order
- **D-04:** A card-fan (spread then collapse) animation plays on every pile shuffle — both manual `SHUFFLE_PILE` and deal-triggered shuffles
- **D-05:** The animation is visible to ALL players (server broadcasts a shuffle event; clients animate on receipt)
- **D-06:** For deal-triggered shuffles: animation plays first, then the dealt state arrives — sequential, not concurrent
- **D-07:** Animation scope is ALL pile shuffles — the existing Shuffle button gets the same treatment

### Claude's Discretion
- Animation duration and exact fan geometry (how far cards spread, easing curve) — keep it short and readable
- Whether the server broadcasts a new `PILE_SHUFFLED` event type or reuses an existing message shape to trigger client animation
- Timing mechanism for the animation-then-deal sequence (server delay vs. client-side sequencing on a flag in the state update)

### Deferred Ideas (OUT OF SCOPE)
- Per-pile deal buttons (deal from any arbitrary pile)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAME-01 | Dealing from a pile automatically shuffles that pile before distributing cards | Server: insert `shuffle(drawPile.cards)` before card-pop loop in DEAL_CARDS. Animation: broadcast PILE_SHUFFLED before STATE_UPDATE. Undo: takeSnapshot() before shuffle preserves original pile order. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shuffle before deal (state mutation) | API / Backend (PartyKit server) | — | Game state is server-authoritative; shuffle must happen on server to be fair |
| Animation trigger broadcast | API / Backend (PartyKit server) | — | Server must broadcast shuffle event to ALL players (D-05); cannot be client-only |
| Animation rendering | Browser / Client (PileZone.tsx) | — | Visual effect; no state implication; runs locally in each client |
| Animation sequencing (deal path) | API / Backend (PartyKit server) | — | D-06 requires state to arrive AFTER animation; server delay keeps clients in sync |
| Undo snapshot placement | API / Backend (PartyKit server) | — | takeSnapshot() must precede shuffle per D-03 |

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crypto.getRandomValues` | Web Crypto API (built-in) | Fisher-Yates shuffle randomness | Already used in `shuffle()` in party/index.ts [VERIFIED: codebase] |
| `tw-animate-css` | already in package.json | Tailwind animate utility classes | Already imported in src/index.css [VERIFIED: codebase] |
| Tailwind CSS v4 | ^4.2.2 | CSS utility classes for animation | Already in project [VERIFIED: package.json] |
| React | ^18.3.1 | Component state (`useState`, `useRef`) for animation state | Already in project [VERIFIED: package.json] |

### No new dependencies required

All capabilities needed for this phase are already in the project stack. Do not add animation libraries. `tw-animate-css` already provides `animate-*` utilities. Custom `@keyframes` blocks can be added to `src/index.css` if needed.

**Installation:** None required.

## Architecture Patterns

### System Architecture Diagram

```
Player A clicks "Deal" / "Shuffle"
        |
        v
[Client] sendAction({ type: "DEAL_CARDS" | "SHUFFLE_PILE", ... })
        |
        v
[PartyKit Server] DEAL_CARDS handler:
  1. takeSnapshot()          ← D-03: snapshot before shuffle for undo
  2. shuffle(drawPile.cards) ← D-02: shuffle before popping cards
  3. broadcastShuffleEvent("draw") ← D-05: all clients see it
  4. await delay(600ms)      ← D-06: animation window before state
  5. deal cards to hands
  6. broadcastState()        ← STATE_UPDATE arrives after animation
        |
        v (simultaneous to all connections)
[Client A, B, C...]
  receive PILE_SHUFFLED { pileId: "draw" }
  → PileZone sets animating=true
  → CSS fan animation plays (~600ms)
  → receive STATE_UPDATE (arrives after delay)
  → PileZone applies new state, sets animating=false
```

For SHUFFLE_PILE path: same broadcast, no delay needed (no subsequent state change to sequence).

### Recommended Project Structure

No new files strictly required. Changes are localized to:

```
party/
└── index.ts          # DEAL_CARDS: add shuffle + PILE_SHUFFLED broadcast + delay
                      # SHUFFLE_PILE: add PILE_SHUFFLED broadcast
src/shared/
└── types.ts          # Add PILE_SHUFFLED to ServerEvent union
src/hooks/
└── usePartySocket.ts # Handle PILE_SHUFFLED event, expose shuffling pile IDs to UI
src/components/
└── PileZone.tsx      # Animate when pile.id is in shuffling set
src/
└── index.css         # @keyframes pile-fan (if not expressible via tw-animate-css)
tests/
└── dealCards.test.ts    # New tests: shuffle-before-deal, undo restores pile order
└── shufflePile.test.ts  # New test: PILE_SHUFFLED event emitted (if testable)
```

### Pattern 1: New ServerEvent Type

**What:** Add `PILE_SHUFFLED` to the `ServerEvent` discriminated union.
**When to use:** Whenever server shuffles a pile — both `SHUFFLE_PILE` and `DEAL_CARDS` paths.

```typescript
// src/shared/types.ts — add to ServerEvent union
export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string }
  | { type: "PILE_SHUFFLED"; pileId: string };
  //                                              ^ new
```

[VERIFIED: existing type shape in codebase]

### Pattern 2: Server-Side Broadcast Helper

The existing `broadcastState()` sends `STATE_UPDATE` to all connections. A parallel helper broadcasts `PILE_SHUFFLED`:

```typescript
// party/index.ts — new private method
private broadcastShuffleEvent(pileId: string) {
  for (const conn of this.room.getConnections()) {
    conn.send(JSON.stringify({
      type: "PILE_SHUFFLED",
      pileId,
    } satisfies ServerEvent));
  }
}
```

[ASSUMED: pattern extrapolated from existing broadcastState(); structure matches ServerEvent pattern in codebase]

### Pattern 3: Server-Side Delay for Sequencing (Deal Path)

**What:** A `setTimeout`-wrapped Promise delays the state broadcast to give clients time to animate.
**When to use:** Only in `DEAL_CARDS` — `SHUFFLE_PILE` does not need this because the state update itself is harmless to receive mid-animation.

```typescript
// party/index.ts — inside DEAL_CARDS case, after broadcastShuffleEvent
case "DEAL_CARDS": {
  // ... validation ...
  takeSnapshot(this.gameState);
  this.gameState.piles.find(p => p.id === "draw")!.cards =
    shuffle(this.gameState.piles.find(p => p.id === "draw")!.cards);
  this.broadcastShuffleEvent("draw");
  await new Promise(resolve => setTimeout(resolve, 650)); // animation window
  // ... existing card-pop loop ...
  this.gameState.phase = "playing";
  break;
}
```

**Why setTimeout is safe in PartyKit/Cloudflare Workers:** [VERIFIED: Cloudflare Workers support `setTimeout` for async delays — it is part of the WinterCG standard environment. PartyKit's `onMessage` is already `async`.] The `persist()` + `broadcastState()` calls happen after the `await`, so storage write also happens after the delay.

**Duration guidance (Claude's discretion):** 600–700ms is the target window. The CSS animation should finish in ≤550ms so there is a small margin before the state arrives. Keep total under 1000ms to avoid feeling sluggish.

### Pattern 4: Client Animation State in usePartySocket

Expose a `shufflingPileIds` set from the hook so PileZone can read it without prop drilling through BoardView.

```typescript
// src/hooks/usePartySocket.ts — additions
const [shufflingPileIds, setShufflingPileIds] = useState<Set<string>>(new Set());

// inside ws.addEventListener('message', ...):
} else if (event.type === 'PILE_SHUFFLED') {
  const { pileId } = event;
  setShufflingPileIds(prev => new Set([...prev, pileId]));
  setTimeout(() => {
    setShufflingPileIds(prev => {
      const next = new Set(prev);
      next.delete(pileId);
      return next;
    });
  }, 650); // matches server delay
}

// return value:
return { gameState, connected, error, sendAction, setDragging, shufflingPileIds };
```

[ASSUMED: pattern; consistent with existing hook structure but not yet in codebase]

### Pattern 5: CSS Card-Fan Animation in PileZone

The fan effect: 3–5 absolutely-positioned ghost card divs behind the pile top, each spreading out via `translateX` + `rotate` on the "spread" keyframe, then collapsing back. Uses `animation-delay` for staggering.

```css
/* src/index.css — add after existing rules */
@keyframes pile-fan-spread {
  0%   { transform: translateX(0) rotate(0deg);   opacity: 0.7; }
  40%  { transform: translateX(var(--fan-x)) rotate(var(--fan-r)); opacity: 0.9; }
  100% { transform: translateX(0) rotate(0deg);   opacity: 0; }
}
```

In PileZone, render ghost divs only when `isShuffling` is true:

```tsx
// PileZone.tsx — inside the drop zone div, before the real card
{isShuffling && [0, 1, 2, 3, 4].map(i => (
  <div
    key={i}
    className="absolute inset-0 rounded-lg bg-secondary border border-border"
    style={{
      '--fan-x': `${(i - 2) * 12}px`,
      '--fan-r': `${(i - 2) * 6}deg`,
      animationName: 'pile-fan-spread',
      animationDuration: '550ms',
      animationDelay: `${i * 30}ms`,
      animationFillMode: 'forwards',
      animationTimingFunction: 'ease-out',
      zIndex: 10 - i,
    } as React.CSSProperties}
  />
))}
```

[ASSUMED: specific pixel/degree values are discretionary; pattern is standard CSS animation stagger]

### Anti-Patterns to Avoid

- **Don't put animation state in GameState / ClientGameState:** Animation is purely visual, transient, and per-client. Adding an `isShuffling` field to the server state would mean it persists across reconnects and complicates undo logic.
- **Don't use `setTimeout` in the client to sequence animation before state:** The server controls timing (D-06). Relying on client-side delay creates race conditions when network latency varies between players.
- **Don't add `framer-motion` or other animation libraries:** The fan effect is achievable with CSS `@keyframes` + existing Tailwind. Adding a library for one animation is over-engineering.
- **Don't skip the snapshot before shuffle in DEAL_CARDS:** D-03 is explicit — snapshot must be taken before the shuffle so that undo restores the pre-shuffle pile order. Current `takeSnapshot()` placement in `DEAL_CARDS` is at line 346 (before the card-pop loop) — move it to before the shuffle insertion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographic shuffle | Custom PRNG or Math.random | Existing `shuffle()` in party/index.ts | Already implemented with Fisher-Yates + `crypto.getRandomValues` [VERIFIED: codebase] |
| CSS animation sequencing | React state machine with multiple timers | CSS `animation-delay` stagger + single `setTimeout` for cleanup | Single timer is sufficient; animation-delay handles stagger declaratively |
| Event type safety | Runtime string checks | TypeScript discriminated union in `ServerEvent` | Existing pattern — all message types are already discriminated [VERIFIED: types.ts] |

## Common Pitfalls

### Pitfall 1: snapshot Position in DEAL_CARDS

**What goes wrong:** If `takeSnapshot()` is called after `shuffle()`, undoing a deal restores cards but not the original order — the pile comes back shuffled.
**Why it happens:** D-03 is easy to overlook when inserting the shuffle call into the existing handler.
**How to avoid:** Insertion order in `DEAL_CARDS` must be: (1) `takeSnapshot()`, (2) `shuffle(drawPile.cards)`, (3) broadcast event, (4) delay, (5) deal cards.
**Warning signs:** Test "undo restores pre-shuffle pile order" would catch this.

### Pitfall 2: Delay in SHUFFLE_PILE vs DEAL_CARDS

**What goes wrong:** Adding a delay to `SHUFFLE_PILE` (the manual button path) blocks state updates unnecessarily — the manual shuffle has no follow-on state change to sequence.
**Why it happens:** Trying to unify both paths with the same delay logic.
**How to avoid:** Only `DEAL_CARDS` needs the `await new Promise(resolve => setTimeout(...))` delay. `SHUFFLE_PILE` broadcasts `PILE_SHUFFLED` and immediately calls `broadcastState()`.

### Pitfall 3: Animation Cleanup

**What goes wrong:** Ghost card divs remain visible after the animation completes if cleanup is not triggered — they stack on reconnect or when the pile receives new cards.
**Why it happens:** `animationFillMode: 'forwards'` keeps the final keyframe state. If the `shufflingPileIds` cleanup timer never fires (component unmounts), ghost divs persist.
**How to avoid:** The `setTimeout` cleanup in `usePartySocket` runs at the same duration as the animation. Also use `animationFillMode: 'forwards'` with final opacity 0 so ghosts are invisible even if the timer is slightly off.

### Pitfall 4: isDragging Buffer Interaction

**What goes wrong:** `usePartySocket` buffers `STATE_UPDATE` while `isDragging` is true. If a deal happens while a drag is in progress, the post-shuffle state sits in `bufferRef` and only applies when the drag ends — but `PILE_SHUFFLED` is NOT buffered (it's not a state update), so the animation plays but the state lands late.
**Why it happens:** Existing drag-buffer logic only intercepts `STATE_UPDATE`.
**How to avoid:** `PILE_SHUFFLED` handling does not need buffering — it's fire-and-forget. The delayed `STATE_UPDATE` from the deal will be buffered normally and applied when drag ends. This is acceptable behavior. Do not buffer `PILE_SHUFFLED`.

### Pitfall 5: CSS Custom Properties on React Elements

**What goes wrong:** TypeScript rejects `style={{ '--fan-x': '12px' }}` as unknown CSS property.
**Why it happens:** React's `CSSProperties` type does not include custom properties by default.
**How to avoid:** Cast the style object: `style={{ ... } as React.CSSProperties}`. This is the established project pattern (no special setup needed).
[ASSUMED: based on standard React/TypeScript behavior]

## Code Examples

### Existing shuffle() — reuse as-is

```typescript
// Source: party/index.ts line 18
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Existing DEAL_CARDS handler structure (surgery target)

```typescript
// Source: party/index.ts lines 334-358
case "DEAL_CARDS": {
  const dealDrawPile = this.gameState.piles.find(p => p.id === "draw");
  // ... validation ...
  takeSnapshot(this.gameState);  // ← D-03: snapshot stays here (before shuffle insertion)
  // INSERT: dealDrawPile.cards = shuffle(dealDrawPile.cards);
  // INSERT: this.broadcastShuffleEvent("draw");
  // INSERT: await new Promise(resolve => setTimeout(resolve, 650));
  for (let i = 0; i < action.cardsPerPlayer; i++) {
    for (const player of connectedPlayers) {
      const dealt = dealDrawPile.cards.pop()!;
      // ...
    }
  }
  this.gameState.phase = "playing";
  break;
}
```

### Existing SHUFFLE_PILE handler structure (surgery target)

```typescript
// Source: party/index.ts lines 360-372
case "SHUFFLE_PILE": {
  // ... validation ...
  takeSnapshot(this.gameState);
  shufflePile.cards = shuffle(shufflePile.cards);
  // INSERT: this.broadcastShuffleEvent(action.pileId);
  break;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DEAL_CARDS does not shuffle | DEAL_CARDS shuffles first | This phase | Cards are now random regardless of visible pile order |
| SHUFFLE_PILE only mutates state | SHUFFLE_PILE also broadcasts animation event | This phase | All players see a visual cue when shuffle happens |
| No PILE_SHUFFLED event type | PILE_SHUFFLED added to ServerEvent | This phase | Client can distinguish shuffle signals from state updates |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setTimeout` in an `async onMessage` handler works correctly in PartyKit/Cloudflare Workers runtime without special configuration | Pattern 3 | If Cloudflare Workers impose a wall-clock CPU limit that kills the delay, sequencing breaks. Mitigation: test in dev via `partykit dev` before deploy. |
| A2 | broadcastShuffleEvent helper pattern (separate loop over getConnections) works the same as broadcastState | Pattern 2 | If PartyKit changes connection iteration behavior, both would break equally — low risk |
| A3 | CSS custom properties (`--fan-x`, `--fan-r`) in inline React styles require casting to `React.CSSProperties` | Pitfall 5 / Pattern 5 | If React's type definitions have changed, the cast might not be needed; harmless either way |
| A4 | Animation duration of 550ms + 100ms margin = 650ms server delay is short enough to not feel sluggish and long enough to complete | Claude's Discretion | If the network RTT is very high, state might arrive before animation on some clients even with the delay. Adjust duration empirically during testing. |

**If this table is empty:** It is not — four assumptions are documented above.

## Open Questions

1. **Should SHUFFLE_PILE delay the state update too?**
   - What we know: D-06 only specifies the deal path needs sequencing. SHUFFLE_PILE just mutates state.
   - What's unclear: Should the Shuffle button feel like it "waits" for the animation, or should the shuffle state (badge count, top card) update immediately?
   - Recommendation: No delay for SHUFFLE_PILE. The state update is benign mid-animation (pile count doesn't change; cards are masked anyway). Keeping it simple avoids an unnecessary blocking delay on a user-initiated action.

2. **Animation visibility during drag**
   - What we know: Pitfall 4 documents the isDragging buffer interaction.
   - What's unclear: Should PILE_SHUFFLED be suppressed while dragging?
   - Recommendation: Do not suppress. The animation plays on the pile container, not on the dragged card. It won't visually conflict.

## Environment Availability

Step 2.6: SKIPPED — phase is code/config changes only. No new external dependencies. All tools (Vite, vitest, partykit) already verified present in package.json.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dealCards.test.ts tests/shufflePile.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAME-01 | DEAL_CARDS shuffles draw pile before popping cards | unit | `npx vitest run tests/dealCards.test.ts` | Yes (needs new test cases) |
| GAME-01 | Undo after deal restores pre-shuffle pile order | unit | `npx vitest run tests/dealCards.test.ts` | Yes (needs new test case) |
| GAME-01 | PILE_SHUFFLED event is broadcast on DEAL_CARDS | unit | `npx vitest run tests/dealCards.test.ts` | Yes (needs new test case) |
| GAME-01 | PILE_SHUFFLED event is broadcast on SHUFFLE_PILE | unit | `npx vitest run tests/shufflePile.test.ts` | Yes (needs new test case) |
| D-06 | State arrives after PILE_SHUFFLED for deal path | manual smoke | n/a — requires live WebSocket | — |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dealCards.test.ts tests/shufflePile.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

None — test infrastructure exists. New test cases extend `tests/dealCards.test.ts` and `tests/shufflePile.test.ts`. No new test files or framework setup required.

## Security Domain

No ASVS categories applicable to this phase. The phase is:
- Server-side state mutation (shuffle) — no new user input surface; `cardsPerPlayer` input validation already exists
- CSS animation — purely client-side visual
- A new `PILE_SHUFFLED` event carries only `pileId` (no user-controlled data beyond what's already in the action handler's scope)

No new threat patterns introduced.

## Sources

### Primary (HIGH confidence)
- Codebase: `party/index.ts` — shuffle(), DEAL_CARDS handler, SHUFFLE_PILE handler, takeSnapshot() [VERIFIED]
- Codebase: `src/shared/types.ts` — ServerEvent union, ClientAction union [VERIFIED]
- Codebase: `src/hooks/usePartySocket.ts` — message handler pattern, drag buffer pattern [VERIFIED]
- Codebase: `src/components/PileZone.tsx` — pile visual component structure [VERIFIED]
- Codebase: `package.json` — tw-animate-css, Tailwind v4, React 18 versions [VERIFIED]
- Codebase: `src/index.css` — tw-animate-css already imported [VERIFIED]

### Secondary (MEDIUM confidence)
- Cloudflare Workers runtime APIs: `setTimeout` is supported in Workers (WinterCG standard). [ASSUMED via training; low risk to verify]

### Tertiary (LOW confidence)
- CSS fan animation geometry values (pixel offsets, rotation degrees) — empirical; adjust during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from package.json and codebase
- Architecture: HIGH — all integration points verified in codebase; event pattern matches existing shape
- Pitfalls: HIGH — derived directly from reading existing code patterns
- Animation specifics (geometry): LOW — values are discretionary and require visual tuning

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable stack, no fast-moving dependencies involved)
