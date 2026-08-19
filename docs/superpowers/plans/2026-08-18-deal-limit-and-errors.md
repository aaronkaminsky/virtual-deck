# Deal Limit, Visible Errors, and the Adaptive Fan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player be dealt as many cards as the deck holds, keep the hand readable at that size, and make the server's rejections visible instead of silent.

**Architecture:** The server's hardcoded 13-card cap is deleted; the availability check already sitting below it becomes the only limit, so the rule tracks deck size automatically. A pure `fanAdvance` helper computes card overlap from measured row width, letting hands tighten to fit instead of overflowing. `usePartySocket`'s `error` gains a nonce so repeats re-render, and a new `ErrorBanner` renders it at the top of the board.

**Tech Stack:** TypeScript, React 19, PartyKit (Cloudflare Workers), Vitest, Playwright, Tailwind.

**Spec:** [`docs/superpowers/specs/2026-08-18-deal-limit-and-errors-design.md`](../specs/2026-08-18-deal-limit-and-errors-design.md)

## Global Constraints

- **Branch:** work happens on `worktree-feat+deal-limit-and-errors`. Never commit to `main`; never `git merge` into local `main`.
- **Every commit must pass the pre-commit hook**, which runs `npm test` (Vitest) and `npm run typecheck` (`tsc --noEmit`). Never use `--no-verify`.
- **No new dependencies.** There is no React component test harness (Vitest runs node-only tests under `tests/**`); do not add jsdom or a rendering library. Component behavior is covered by pure-function unit tests plus Playwright.
- **Small hands must look exactly as they do today.** The comfortable advance values are derived from the current CSS (`-ml-3` / `-ml-5`); a 5-card hand must not shift by a pixel.
- **`minAdvance`:** 16px on desktop, 12px on mobile. `comfortableAdvance`: 40px desktop, 28px mobile.
- **Banner copy is the server's message, verbatim.** No per-error-code mapping.
- **Banner styling:** `w-full bg-red-900/80 text-red-200 text-center py-2 text-sm font-medium`, auto-dismiss after exactly 6000ms.
- Match existing code style; do not reformat adjacent code.

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `party/index.ts` | Modify | Remove the 13-card cap from `DEAL_CARDS` and `DEAL_NEXT_HAND`; update the error message |
| `src/lib/handFan.ts` | Create | Pure fanning math + responsive metric constants |
| `src/components/HandZone.tsx` | Modify | Measure the row, apply computed overlap to own-hand cards |
| `src/components/OpponentHand.tsx` | Modify | Same, for the revealed-cards branch only |
| `src/hooks/usePartySocket.ts` | Modify | `error` becomes `{ message, nonce }` |
| `src/components/ErrorBanner.tsx` | Create | Full-width dismissible error strip |
| `src/components/BoardView.tsx` | Modify | Render `ErrorBanner` beside `ConnectionBanner` |
| `src/components/BoardDragLayer.tsx` | Modify | Thread the `error` prop through |
| `src/App.tsx` | Modify | Pass `error` down; give `LobbyPanel` `error?.message` |
| `src/components/ControlsBar.tsx` | Modify | Stop silently swallowing over-max deal counts |
| `tests/dealCards.test.ts` | Modify | Cover the lifted cap in both directions |
| `tests/handFan.test.ts` | Create | `fanAdvance` edge cases |
| `playwright/dealLimit.spec.ts` | Create | Deal above the old cap, fan fits, banner shows |
| `docs/superpowers/specs/BACKLOG.md` | Modify | Remove 1041/1042; add the SpreadZone follow-up |
| `.planning/ROADMAP.md` | Modify | v1.32 milestone entry |

---

### Task 1: Lift the deal cap

**Files:**
- Modify: `party/index.ts` — the `DEAL_CARDS` case (~line 620) and the `DEAL_NEXT_HAND` case (~line 669)
- Test: `tests/dealCards.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `DEAL_CARDS` and `DEAL_NEXT_HAND` accept any integer `cardsPerPlayer >= 1`, bounded only by the existing availability checks. `INVALID_CARDS_PER_PLAYER` now means non-integer or `< 1`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/dealCards.test.ts`, inside the existing `describe("DEAL_CARDS handler", …)` block. The existing `beforeEach` creates two connected players (`player-1`, `player-2`) with empty hands and a full 52-card draw pile.

```ts
  it("deals more than 13 cards per player when the draw pile allows it", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 20 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(20);
    expect(room.gameState.hands["player-2"]).toHaveLength(20);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(12);
  });

  it("deals the entire deck to a single player", async () => {
    room.gameState.players = room.gameState.players.filter(p => p.id === "player-1");

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 52 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(52);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(0);
  });

  it("still refuses more cards than the draw pile holds", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 27 }), sender);

    const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
    expect(sent.some(e => e.type === "ERROR" && e.code === "INSUFFICIENT_CARDS")).toBe(true);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("still refuses zero, negative, and non-integer counts", async () => {
    for (const bad of [0, -3, 2.5]) {
      sender.send.mockClear();
      await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: bad }), sender);
      const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
      expect(sent.some(e => e.type === "ERROR" && e.code === "INVALID_CARDS_PER_PLAYER")).toBe(true);
    }
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });
```

Then add a second `describe` block at the end of the same file for the other handler. `DEAL_NEXT_HAND` gathers every card back to the draw pile before dealing, and awaits a 650ms shuffle animation, so these tests need `vi.useFakeTimers()` — instead, keep it simple and let the real timer run; the suite tolerates it.

```ts
describe("DEAL_NEXT_HAND handler (1041)", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.phase = "playing";
  });

  it("deals more than 13 cards per player when the deck allows it", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 30 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(30);
  });

  it("still refuses more cards than exist in the game", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 53 }), sender);

    const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
    expect(sent.some(e => e.type === "ERROR" && e.code === "INSUFFICIENT_CARDS")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/dealCards.test.ts`
Expected: FAIL. The 20-, 52-, and 30-card cases each get `INVALID_CARDS_PER_PLAYER` instead of dealing, so hands stay empty.

- [ ] **Step 3: Remove the cap from `DEAL_CARDS`**

In `party/index.ts`, in the `DEAL_CARDS` case, replace the validation block:

```ts
      case "DEAL_CARDS": {
        if (
          !Number.isInteger(action.cardsPerPlayer) ||
          action.cardsPerPlayer < 1
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_CARDS_PER_PLAYER",
            message: "cardsPerPlayer must be a positive integer",
          } satisfies ServerEvent));
          break;
        }
```

Leave everything below it — the `dealDrawPile` lookup, the `needed` calculation, and the `INSUFFICIENT_CARDS` check — exactly as it is. That check is now the only limit, and it is the correct one.

- [ ] **Step 4: Remove the cap from `DEAL_NEXT_HAND`**

Same change in the `DEAL_NEXT_HAND` case:

```ts
      case "DEAL_NEXT_HAND": {
        if (
          !Number.isInteger(action.cardsPerPlayer) ||
          action.cardsPerPlayer < 1
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_CARDS_PER_PLAYER",
            message: "cardsPerPlayer must be a positive integer",
          } satisfies ServerEvent));
          break;
        }
```

Leave the `totalCards` calculation and its `INSUFFICIENT_CARDS` check untouched.

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS, typecheck clean. The pre-existing deal tests must stay green.

- [ ] **Step 6: Commit**

```bash
git add party/index.ts tests/dealCards.test.ts
git commit -m "fix: limit deals by cards available, not a hardcoded 13 (1041)"
```

---

### Task 2: The fanning helper

**Files:**
- Create: `src/lib/handFan.ts`
- Test: `tests/handFan.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface FanMetrics { cardWidth: number; comfortableAdvance: number; minAdvance: number }`
  - `getHandFanMetrics(): FanMetrics` — responsive, own hand
  - `OPPONENT_FAN_METRICS: FanMetrics`
  - `HAND_PADDING_X: number` (32) and `SENTINEL_RESERVE: number` (56)
  - `fanAdvance(opts: { containerWidth: number; cardWidth: number; count: number; comfortableAdvance: number; minAdvance: number }): number`
  - `fanMarginLeft(advance: number, cardWidth: number): number` — the negative margin to apply to every card after the first

- [ ] **Step 1: Write the failing test**

Create `tests/handFan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fanAdvance, fanMarginLeft } from "../src/lib/handFan";

const DESKTOP = { cardWidth: 60, comfortableAdvance: 40, minAdvance: 16 };

describe("fanAdvance", () => {
  it("uses the comfortable advance for a single card", () => {
    expect(fanAdvance({ containerWidth: 1200, count: 1, ...DESKTOP })).toBe(40);
  });

  it("uses the comfortable advance when the hand fits easily", () => {
    // 5 cards need 60 + 4*40 = 220px; 1200px is plenty.
    expect(fanAdvance({ containerWidth: 1200, count: 5, ...DESKTOP })).toBe(40);
  });

  it("tightens the advance when the hand would overflow", () => {
    // 40 cards: ideal = (1200 - 60) / 39 = 29.23, between the floor and the comfortable value.
    const advance = fanAdvance({ containerWidth: 1200, count: 40, ...DESKTOP });
    expect(advance).toBeCloseTo(29.23, 1);
    // The fanned hand fits the container.
    expect(60 + 39 * advance).toBeLessThanOrEqual(1200);
  });

  it("never tightens past the minimum sliver", () => {
    // 200 cards would need a sub-pixel advance to fit; the floor wins and the row scrolls.
    expect(fanAdvance({ containerWidth: 1200, count: 200, ...DESKTOP })).toBe(16);
  });

  it("returns the floor for a container that has not been measured yet", () => {
    expect(fanAdvance({ containerWidth: 0, count: 30, ...DESKTOP })).toBe(16);
    expect(fanAdvance({ containerWidth: -50, count: 30, ...DESKTOP })).toBe(16);
  });

  it("honours mobile metrics", () => {
    const MOBILE = { cardWidth: 40, comfortableAdvance: 28, minAdvance: 12 };
    expect(fanAdvance({ containerWidth: 360, count: 3, ...MOBILE })).toBe(28);
    expect(fanAdvance({ containerWidth: 360, count: 54, ...MOBILE })).toBe(12);
  });
});

describe("fanMarginLeft", () => {
  it("is the negative of the hidden portion of the card", () => {
    expect(fanMarginLeft(40, 60)).toBe(-20);
    expect(fanMarginLeft(16, 60)).toBe(-44);
  });

  it("is zero when cards do not overlap at all", () => {
    expect(fanMarginLeft(60, 60)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/handFan.test.ts`
Expected: FAIL — cannot resolve `../src/lib/handFan`.

- [ ] **Step 3: Write the helper**

Create `src/lib/handFan.ts`:

```ts
// Fanning math for overlapping card rows. "Advance" is the distance between
// successive card left edges — the visible sliver of each covered card. Cards
// render at a fixed width and overlap via a negative margin, so the rendered
// value is the overlap (cardWidth - advance).

export interface FanMetrics {
  cardWidth: number;
  comfortableAdvance: number;
  minAdvance: number;
}

// Own-hand metrics. Mirrors getCardDimensions() in canvas-utils — same 640px
// breakpoint as Tailwind's `sm:`. The comfortable values reproduce the previous
// hardcoded overlaps exactly (-ml-5 desktop, -ml-3 mobile), so small hands do
// not move.
export function getHandFanMetrics(): FanMetrics {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return { cardWidth: 40, comfortableAdvance: 28, minAdvance: 12 };
  }
  return { cardWidth: 60, comfortableAdvance: 40, minAdvance: 16 };
}

// Opponent hands render at 40px with -ml-3 at every breakpoint.
export const OPPONENT_FAN_METRICS: FanMetrics = {
  cardWidth: 40,
  comfortableAdvance: 28,
  minAdvance: 12,
};

// The hand row's horizontal padding (px-4 on both sides).
export const HAND_PADDING_X = 32;

// Space kept clear for SortableSentinel, the invisible flex-1/minWidth-56
// droppable that makes drop-to-end reachable. Cards must not consume it.
export const SENTINEL_RESERVE = 56;

export function fanAdvance({
  containerWidth,
  cardWidth,
  count,
  comfortableAdvance,
  minAdvance,
}: {
  containerWidth: number;
  cardWidth: number;
  count: number;
  comfortableAdvance: number;
  minAdvance: number;
}): number {
  if (count <= 1) return comfortableAdvance;
  const ideal = (containerWidth - cardWidth) / (count - 1);
  if (!Number.isFinite(ideal)) return minAdvance;
  return Math.min(comfortableAdvance, Math.max(minAdvance, ideal));
}

export function fanMarginLeft(advance: number, cardWidth: number): number {
  return -(cardWidth - advance);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/handFan.test.ts && npm run typecheck`
Expected: PASS (8 tests), typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/handFan.ts tests/handFan.test.ts
git commit -m "feat: add adaptive card-fan math helper"
```

---

### Task 3: Fan the player's own hand

**Files:**
- Modify: `src/components/HandZone.tsx` — `SortableHandCard` (the wrapper div at ~line 118), the hand row (~line 341), and the `HandZone` component body

**Interfaces:**
- Consumes: `fanAdvance`, `fanMarginLeft`, `getHandFanMetrics`, `HAND_PADDING_X`, `SENTINEL_RESERVE` from Task 2.
- Produces: `SortableHandCard` gains a required `overlapPx: number` prop (a negative number, or 0).

- [ ] **Step 1: Add the imports**

In `src/components/HandZone.tsx`, add alongside the other `@/lib` imports:

```tsx
import { fanAdvance, fanMarginLeft, getHandFanMetrics, HAND_PADDING_X, SENTINEL_RESERVE } from '@/lib/handFan';
```

- [ ] **Step 2: Measure the row**

Inside the `HandZone` component body, next to its other hooks, add:

```tsx
  const rowRef = useRef<HTMLDivElement | null>(null);
  // null until measured — until then, render at the comfortable advance so the
  // hand does not flash tightly-packed on first paint.
  const [rowWidth, setRowWidth] = useState<number | null>(null);

  // ResizeObserver: track the row's width so the fan re-tightens on resize.
  // Mirrors the pattern in CanvasZone.tsx.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setRowWidth(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
```

`useRef` and `useEffect` need adding to the existing `import { useState } from 'react';` line, which becomes:

```tsx
import { useEffect, useRef, useState } from 'react';
```

- [ ] **Step 3: Compute the overlap**

Below `displayedCards` (~line 193, `const displayedCards = sortMode === 'original' ? cards : sortCards(cards, sortMode);`), add:

```tsx
  const fanMetrics = getHandFanMetrics();
  const cardAdvance = rowWidth === null
    ? fanMetrics.comfortableAdvance
    : fanAdvance({
        containerWidth: rowWidth - HAND_PADDING_X - SENTINEL_RESERVE,
        cardWidth: fanMetrics.cardWidth,
        count: displayedCards.length,
        comfortableAdvance: fanMetrics.comfortableAdvance,
        minAdvance: fanMetrics.minAdvance,
      });
  const cardOverlapPx = fanMarginLeft(cardAdvance, fanMetrics.cardWidth);
```

- [ ] **Step 4: Attach the ref and pass the overlap**

On the hand row div (the one with `data-testid="hand-zone"`), add the ref. Its existing `ref={setNodeRef}` belongs to dnd-kit's droppable, so the two must be combined rather than replaced:

```tsx
      <div
        ref={(node) => { setNodeRef(node); rowRef.current = node; }}
        data-testid="hand-zone"
```

Then pass the overlap to each card in the `displayedCards.map(...)`:

```tsx
              overlapPx={cardOverlapPx}
```

- [ ] **Step 5: Apply the overlap in `SortableHandCard`**

Add `overlapPx: number;` to `SortableHandCardProps`, add `overlapPx` to the destructured parameters, and replace the wrapper div's className/style. The old line is:

```tsx
      className={cn('relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
```

It becomes:

```tsx
      className={cn('relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px] flex-shrink-0')}
      style={index > 0 ? { marginLeft: overlapPx } : undefined}
```

The `-ml-3 sm:-ml-5` classes are now computed by `getHandFanMetrics`, so removing them is the point — do not leave them alongside the inline style, or the two will fight.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npx vitest run && npx vite build`
Expected: typecheck clean, unit suite green, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/HandZone.tsx
git commit -m "feat: fan the player's hand to fit the available width"
```

---

### Task 4: Fan revealed opponent hands

**Files:**
- Modify: `src/components/OpponentHand.tsx` — the card row (~line 63) and the revealed-cards branch (~line 65-71)

**Interfaces:**
- Consumes: `fanAdvance`, `fanMarginLeft`, `OPPONENT_FAN_METRICS` from Task 2.
- Produces: nothing consumed by later tasks.

Only the **revealed** branch needs fanning. The face-down branch is already bounded — it renders `Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS)` backs, and `MAX_VISIBLE_OPPONENT_CARDS` is 5 — so it can never overflow. Leave it exactly as it is, `-ml-3` class and all.

- [ ] **Step 1: Add the imports**

`OpponentHand.tsx` currently imports nothing from `react` — its first import is
`@dnd-kit/core`. Add both lines at the top of the import block:

```tsx
import { useEffect, useRef, useState } from 'react';
import { fanAdvance, fanMarginLeft, OPPONENT_FAN_METRICS } from '@/lib/handFan';
```

- [ ] **Step 2: Measure the row and compute the overlap**

In the component body:

```tsx
  const revealedRowRef = useRef<HTMLDivElement | null>(null);
  const [revealedRowWidth, setRevealedRowWidth] = useState<number | null>(null);

  // ResizeObserver: mirrors HandZone and CanvasZone.
  useEffect(() => {
    const el = revealedRowRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setRevealedRowWidth(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const revealedCount = revealedCards?.length ?? 0;
  const revealedAdvance = revealedRowWidth === null
    ? OPPONENT_FAN_METRICS.comfortableAdvance
    : fanAdvance({
        containerWidth: revealedRowWidth,
        cardWidth: OPPONENT_FAN_METRICS.cardWidth,
        count: revealedCount,
        comfortableAdvance: OPPONENT_FAN_METRICS.comfortableAdvance,
        minAdvance: OPPONENT_FAN_METRICS.minAdvance,
      });
  const revealedOverlapPx = fanMarginLeft(revealedAdvance, OPPONENT_FAN_METRICS.cardWidth);
```

There is no padding or sentinel to subtract here — the row is a bare `flex items-center overflow-x-auto` with neither.

- [ ] **Step 3: Attach the ref and apply the overlap**

Add the ref to the card row div:

```tsx
        <div ref={revealedRowRef} className="flex items-center overflow-x-auto">
```

And in the revealed branch, replace the `-ml-3` class with the computed margin:

```tsx
            ? revealedCards.map((card, i) => (
                <CardFace
                  key={card.id}
                  card={konamiActive ? { ...card, rank: 'A' } : card}
                  className="w-[40px] h-[60px]"
                  style={i > 0 ? { marginLeft: revealedOverlapPx } : undefined}
                />
              ))
```

`CardFace` does not currently accept a `style` prop — add it:

```tsx
interface CardFaceProps {
  card: Card;
  className?: string;
  style?: React.CSSProperties;
}
```

and spread it onto both the `<img>` and the fallback `<div>` (`style={style}`), so the two render paths stay interchangeable.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run && npx vite build`
Expected: typecheck clean, unit suite green, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/OpponentHand.tsx src/components/CardFace.tsx
git commit -m "feat: fan revealed opponent hands to fit"
```

---

### Task 5: Make server errors visible

**Files:**
- Modify: `src/hooks/usePartySocket.ts` — error state (~line 12) and its three setters (~lines 53, 64, 84)
- Create: `src/components/ErrorBanner.tsx`
- Modify: `src/components/BoardView.tsx` — props interface, destructuring, and the `ConnectionBanner` site (~line 82)
- Modify: `src/components/BoardDragLayer.tsx` — props interface (~line 93), destructuring (~line 275), `BoardView` call (~line 787)
- Modify: `src/App.tsx` — `LobbyPanel` call (~line 157) and `BoardDragLayer` call (~line 131)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `usePartySocket` returns `error: SocketError | null` where `export type SocketError = { message: string; nonce: number }`. `ErrorBanner` takes `{ error: SocketError | null }`.

- [ ] **Step 1: Change the error shape in the hook**

In `src/hooks/usePartySocket.ts`, export the type and change the state:

```ts
export type SocketError = { message: string; nonce: number };
```

```ts
  const [error, setError] = useState<SocketError | null>(null);
  const errorNonceRef = useRef(0);
```

Add a helper next to the other refs, so every raise site increments the nonce. A repeat of the same message must still re-render — that is the whole reason for the nonce:

```ts
  const raiseError = useCallback((message: string) => {
    errorNonceRef.current += 1;
    setError({ message, nonce: errorNonceRef.current });
  }, []);
```

Update the three existing sites:

- ~line 53, the connect-timeout branch:

```ts
        raiseError(
          import.meta.env.DEV
            ? "Can't reach the game server — restart `npm run dev`"
            : "Can't reach the game server — try refreshing the page"
        );
```

- ~line 64, on `open`: `setError(null);` stays as-is.
- ~line 84, the `ERROR` event branch: `raiseError(event.message);`

`raiseError` must be declared before the `useEffect` that uses it, and listed in that effect's dependency array if the effect has one.

- [ ] **Step 2: Create the banner**

Create `src/components/ErrorBanner.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { SocketError } from '@/hooks/usePartySocket';

const DISMISS_MS = 6000;

interface ErrorBannerProps {
  error: SocketError | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  // Keyed on the nonce, not the message — the same error twice in a row must
  // re-show rather than stay dismissed.
  const [dismissedNonce, setDismissedNonce] = useState(0);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setDismissedNonce(error.nonce), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error]);

  if (!error || error.nonce === dismissedNonce) return null;

  return (
    <div
      role="alert"
      data-testid="error-banner"
      onClick={() => setDismissedNonce(error.nonce)}
      className="w-full bg-red-900/80 text-red-200 text-center py-2 text-sm font-medium cursor-pointer"
    >
      &#9888; {error.message}
    </div>
  );
}
```

- [ ] **Step 3: Render it on the board**

In `src/components/BoardView.tsx`, add the import:

```tsx
import { ErrorBanner } from './ErrorBanner';
import type { SocketError } from '@/hooks/usePartySocket';
```

Add to `BoardViewProps`, next to `connected: boolean;`:

```tsx
  error: SocketError | null;
```

Add `error` to the destructured parameter list, then render it directly after the existing `<ConnectionBanner connected={connected} />` (~line 82):

```tsx
      <ErrorBanner error={error} />
```

- [ ] **Step 4: Thread the prop through `BoardDragLayer`**

`BoardView` is rendered by `BoardDragLayer`, not by `App`, so `error` follows the exact path `connected` already takes. In `src/components/BoardDragLayer.tsx`:

- add `error: SocketError | null;` to `BoardDragLayerProps` next to `connected: boolean;`, plus the import `import type { SocketError } from '@/hooks/usePartySocket';`
- add `error,` to the destructured parameters next to `connected,`
- add `error={error}` to the `<BoardView … />` call next to `connected={connected}`

- [ ] **Step 5: Wire up `App.tsx`**

`LobbyPanel` still takes a `string | null`, so give it the message only (~line 157):

```tsx
      error={error?.message ?? null}
```

And pass the object to the board (~line 135, next to `connected={connected}`):

```tsx
            error={error}
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npx vitest run && npx vite build`
Expected: typecheck clean, unit suite green, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePartySocket.ts src/components/ErrorBanner.tsx src/components/BoardView.tsx src/components/BoardDragLayer.tsx src/App.tsx
git commit -m "feat: surface server errors on the board (1042)"
```

---

### Task 6: Stop swallowing over-max deal counts

**Files:**
- Modify: `src/components/ControlsBar.tsx` — `handleDeal` (~line 127)

**Interfaces:**
- Consumes: the `ErrorBanner` from Task 5 (this task is what makes it reachable).
- Produces: nothing consumed later.

- [ ] **Step 1: Drop the silent clamp**

`handleDeal` currently reads:

```tsx
  function handleDeal() {
    const parsed = parseInt(dealCount, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > maxCards) return;
```

Remove only the `parsed > maxCards` clause:

```tsx
  function handleDeal() {
    const parsed = parseInt(dealCount, 10);
    // Malformed input is still dropped here, but a count the table cannot
    // satisfy now goes to the server so it can answer with a visible error
    // rather than the click doing nothing (1041/1042).
    if (Number.isNaN(parsed) || parsed < 1) return;
```

Leave `max={maxCards}` on the input — it still communicates the limit and drives the spinner.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean, unit suite green.

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlsBar.tsx
git commit -m "fix: send over-max deal requests so the server can explain (1041)"
```

---

### Task 7: End-to-end coverage

**Files:**
- Create: `playwright/dealLimit.spec.ts`

**Interfaces:**
- Consumes: the lifted cap (Task 1), the fan (Task 3), the banner (Task 5), the unclamped deal (Task 6).

- [ ] **Step 1: Write the spec**

Create `playwright/dealLimit.spec.ts`. Note the third test builds its own single-page room, because the shared `twoPlayerRoom` fixture cannot produce a hand large enough to force the fan to tighten.

```ts
import { type Page, type Browser } from '@playwright/test';
import { nanoid } from 'nanoid';
import { test, expect } from './fixtures';

async function dealCards(page: Page, count: number) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"][max]').fill(String(count));
  await page.getByRole('button', { name: /^Deal/ }).click();
}

async function joinSolo(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/?room=${nanoid(8)}`);
  await page.getByPlaceholder('Your name').fill('Solo');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
  return page;
}

test.describe('deal limit and errors (1041, 1042)', () => {
  test('deals more than the old 13-card cap', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 20);

    // 2 players x 20 = 40 of 52 dealt, 12 left.
    await expect(p1.getByTestId('pile-draw')).toContainText('12');
    await expect(p1.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(20);
    await expect(p2.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(20);
  });

  test('a hand too large for the comfortable spacing fans instead of overflowing', async ({ browser }) => {
    const page = await joinSolo(browser);

    await dealCards(page, 34);
    await expect(page.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(34);

    // Two independent assertions, because each catches a different failure.
    //
    // 34 cards at the comfortable 40px advance need 60 + 33*40 = 1380px, past
    // the 1280px viewport, so the fan MUST have tightened. Asserting the margin
    // directly does not depend on how wide the hand row happens to be in the
    // surrounding layout.
    const margin = await page
      .getByTestId('hand-zone')
      .locator('[data-card-id]')
      .nth(1)
      .evaluate((el) => parseFloat(getComputedStyle(el.parentElement!).marginLeft));
    expect(margin).toBeLessThan(-20);

    // And the result actually fits, rather than merely being tighter.
    const fits = await page.getByTestId('hand-zone').evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1
    );
    expect(fits).toBe(true);

    await page.context().close();
  });

  test('a deal the table cannot satisfy shows the server error instead of doing nothing', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // 2 players x 27 = 54 needed, 52 available.
    await dealCards(p1, 27);

    await expect(p1.getByTestId('error-banner')).toBeVisible();
    await expect(p1.getByTestId('error-banner')).toContainText('Not enough cards');
    // The table is untouched.
    await expect(p1.getByTestId('pile-draw')).toContainText('52');
  });
});
```

- [ ] **Step 2: Clear any servers from the root checkout**

Playwright starts dev servers from the current working directory and reuses whatever is already listening, so a server from the main checkout would test the wrong code. Scope the kill to listeners — a bare `lsof -ti :5173` also matches connected browser tabs:

```bash
lsof -ti tcp:5173 -sTCP:LISTEN | xargs -r kill
lsof -ti tcp:1999 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 3: Run the new spec**

Run: `npx playwright test playwright/dealLimit.spec.ts`
Expected: 3 passed.

If the fan assertion fails, read the actual `scrollWidth`/`clientWidth` before changing anything — a real overflow means the `SENTINEL_RESERVE` subtraction in Task 3 is wrong, not that the assertion is too strict.

- [ ] **Step 4: Run the full e2e suite**

Run: `npx playwright test`
Expected: all pass. `canvasMulticard.spec.ts` has a known pre-existing timing flake; if it fails, re-run it alone to confirm that is what you are seeing, and say so in your report.

- [ ] **Step 5: Commit**

```bash
git add playwright/dealLimit.spec.ts
git commit -m "test: e2e for large deals, hand fanning, and error banner"
```

---

### Task 8: Ship the docs

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md`
- Modify: `.planning/ROADMAP.md`

- [ ] **Step 1: Bring in the merged backlog rows**

Rows 1041 and 1042 were added on a separate branch. Merge the latest `main` so this branch has them to remove:

```bash
git fetch origin
git merge origin/main --no-edit
```

If `main` does not yet contain rows 1041 and 1042, stop and report — the backlog PR has not merged, and Step 2 has nothing to remove.

- [ ] **Step 2: Remove the shipped rows and add the follow-up**

In `docs/superpowers/specs/BACKLOG.md`, delete the `| 1041 | …` and `| 1042 | …` rows entirely, and append:

```
| 1044 | Adaptive fan for spread zones — SpreadZone still uses the hardcoded `-ml-3 sm:-ml-5` overlap and overflows once a tableau grows, while hands now fan to fit (`src/lib/handFan.ts`). Deferred from 1041 because SpreadZone is a drop target in a resizable region and this project has a history of stale droppable-rect drift when such layouts change; reuse `fanAdvance` and re-verify drop targets after |
```

- [ ] **Step 3: Add the milestone**

In `.planning/ROADMAP.md`, add to the end of the `## Milestones` list, after the v1.31 line:

```
- ✅ **v1.32 Deal Limit & Visible Errors** — Deals are bounded by the cards actually available instead of a hardcoded 13; hands fan adaptively so a full-deck hand stays readable; server errors surface in a board banner instead of vanishing. Design: docs/superpowers/specs/2026-08-18-deal-limit-and-errors-design.md — 1041, 1042 (shipped 2026-08-18)
```

- [ ] **Step 4: Full verification**

Run: `npm test && npm run typecheck && npx playwright test`
Expected: unit suite green, typecheck clean, e2e green.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "docs: ship deal limit and visible errors (1041, 1042)"
```

- [ ] **Step 6: Stop**

Do not push and do not open a pull request. Report completion and let the repository owner decide.

---

## Self-Review Notes

Spec coverage:

| Spec section | Task |
|--------------|------|
| §1 Lift the cap, both handlers | Task 1 |
| §1 `handleDeal` stops clamping | Task 6 |
| §2 `fanAdvance` helper and constants | Task 2 |
| §2 Measuring, padding and sentinel reserve | Task 3 |
| §2 Fan scope: own hand | Task 3 |
| §2 Fan scope: opponent hands | Task 4 |
| §3 Error nonce | Task 5 |
| §3 `ErrorBanner` and threading | Task 5 |
| §4 Unit tests | Tasks 1, 2 |
| §4 E2E | Task 7 |
| Out of scope: SpreadZone | Task 8 (backlog row 1044) |

Two things worth flagging to whoever executes this:

1. **Task 4 widens `CardFace`'s props** with an optional `style`. That is a shared component; the change is additive and both render paths must apply it, or the fallback path will silently ignore fanning when art fails to load.
2. **Task 8 depends on an external event** — the backlog PR merging. It is deliberately last, and its first step fails loudly rather than silently skipping the removal.
