# Easter Eggs (1012-1016) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five backlog easter eggs — rickroll (`rr`), shuffle flourish, Konami all-aces cheat, table-flip (`99`), and bad-game jeer (`bg`) — all extending the existing `gg` double-tap pattern.

**Architecture:** A new generic `createSequenceDetector` utility (alongside the untouched `createDoubleKeyDetector`) detects all four new key triggers. The existing `CELEBRATE` client action and `EFFECT` server broadcast both gain a `kind` discriminator so all five effects reuse the same one broadcast mechanism `gg` already uses — no new action/event types. Each effect gets its own small overlay component except shuffle flourish (which extends the existing per-pile shuffle animation) and Konami (which is a pure render-time override inside `HandZone`/`OpponentHand`, never touching real card data).

**Tech Stack:** React 18 + TypeScript, PartyKit (Cloudflare Workers) server, Vitest (source-regex pattern for component contracts, behavioral tests for pure functions), Playwright for e2e behavior.

## Global Constraints

- Standard 52-card deck, no Joker rank — Konami uses "all-aces," not "all-jokers" (per design spec). Adding a Joker rank is a separate future backlog item, out of scope here.
- Konami's all-aces effect is cosmetic/render-only — it must never mutate `Card` objects in `GameState`/`ClientGameState`, must never call `takeSnapshot`, and must self-revert via a client-local timer only.
- All five effects broadcast to every player in the room (same as `gg`) — no local-only or host-gated variants.
- No new sound assets exist yet for `jeer` or `tableflip`. Wire the `playSound` call sites in but do not block on missing files — `playSound` already no-ops safely if `el.play()` rejects (see `src/lib/sound.ts:68`), so no special-casing is needed in this plan.
- Follow existing conventions: `skipSnapshot`-style non-undoable actions stay non-undoable; type extension over parallel collections; `@/` path alias for `src/` imports.

---

## File Structure

- **Modify** `src/lib/celebrationHotkey.ts` — add `createSequenceDetector`.
- **Modify** `tests/celebrationHotkey.test.ts` — add tests for the new detector.
- **Modify** `src/shared/types.ts` — extend `CELEBRATE` action, `EFFECT` event, `PILE_SHUFFLED` event.
- **Modify** `party/index.ts` — `CELEBRATE` handler passes through `kind`; `SHUFFLE_PILE` handler rolls flourish probability; `broadcastEffect`/`broadcastShuffleEvent` signatures widen.
- **Modify** `tests/shufflePile.test.ts` — add flourish-probability tests.
- **Create** `tests/celebrateKind.test.ts` — server `CELEBRATE` kind-passthrough tests.
- **Modify** `src/hooks/usePartySocket.ts` — generalize celebration nonce handling into per-kind nonces plus `konamiActive`; widen `shufflingPileIds` from `Set<string>` to `Map<string, "normal" | "flourish">`.
- **Modify** `src/App.tsx` — wire `rr`/`99`/`bg`/Konami key listeners; mount new overlay components.
- **Create** `src/components/RickrollOverlay.tsx`.
- **Create** `src/components/TableFlipWrapper.tsx`.
- **Create** `src/components/JeerOverlay.tsx`.
- **Modify** `src/components/HandZone.tsx` — `konamiActive` prop, ace override in `SortableHandCard`.
- **Modify** `src/components/OpponentHand.tsx` — `konamiActive` prop, ace override on revealed cards.
- **Modify** `src/components/BoardView.tsx`, `src/components/BoardDragLayer.tsx` — thread `konamiActive` prop through.
- **Modify** `src/components/PileZone.tsx` — read `animationType` from `shufflingPileIds` map, pick flourish vs. normal keyframes.
- **Modify** `src/globals.css` — new keyframes: `flourish-cut-*` (5 stages), `table-flip`, `jeer-droop`.
- **Create** `playwright/easterEggs.spec.ts` — e2e coverage for all five triggers, mirroring `playwright/celebration.spec.ts`'s `gg` test.

---

### Task 1: `createSequenceDetector` utility

**Files:**
- Modify: `src/lib/celebrationHotkey.ts`
- Test: `tests/celebrationHotkey.test.ts`

**Interfaces:**
- Produces: `createSequenceDetector(sequence: string[], windowMs: number): (key: string, now: number) => boolean` — call once per keydown with the (already-normalized, e.g. lowercased if needed by the caller) key and `performance.now()`. Returns `true` only when the full `sequence` is typed in order, each step within `windowMs` of the previous accepted step. Resets to position 0 on any non-matching key (unless that key is itself a valid restart, i.e. matches `sequence[0]`) or on timeout.

- [ ] **Step 1: Write the failing tests**

Add to `tests/celebrationHotkey.test.ts` (after the existing `createDoubleKeyDetector` describe block, before the `isEditableTarget` describe block):

```ts
import { createSequenceDetector } from "../src/lib/celebrationHotkey";

describe("createSequenceDetector", () => {
  it("fires when the full sequence is typed in order within the window", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1300)).toBe(true);
  });

  it("does not fire if a step exceeds the window", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1600)).toBe(false); // 600ms gap — too slow
  });

  it("resets on a non-matching key", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("x", 1100)).toBe(false); // mismatch resets
    expect(detect("g", 1200)).toBe(false); // sequence restarted, "g" alone doesn't match "b"
  });

  it("treats a matching restart key as a fresh first step instead of losing it", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("b", 1100)).toBe(false); // second "b" restarts position 1, not a mismatch-to-zero
    expect(detect("g", 1200)).toBe(true);
  });

  it("supports longer sequences (Konami-style)", () => {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];
    const detect = createSequenceDetector(seq, 2000);
    expect(detect("ArrowUp", 0)).toBe(false);
    expect(detect("ArrowUp", 200)).toBe(false);
    expect(detect("ArrowDown", 400)).toBe(false);
    expect(detect("ArrowDown", 600)).toBe(true);
  });

  it("consumes the sequence so it can fire again on a fresh repeat", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1100)).toBe(true);
    expect(detect("b", 1200)).toBe(false);
    expect(detect("g", 1300)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/celebrationHotkey.test.ts`
Expected: FAIL — `createSequenceDetector is not exported` / not defined.

- [ ] **Step 3: Implement `createSequenceDetector`**

Add to `src/lib/celebrationHotkey.ts` (after `createDoubleKeyDetector`, before the `EditableLike` type):

```ts
/**
 * Returns a registrar that reports `true` when the full `sequence` is typed
 * in order, each step within `windowMs` of the previous accepted step.
 * Resets to position 0 on a non-matching key (unless that key restarts the
 * sequence, i.e. matches `sequence[0]`) or when a step arrives outside the
 * window. Consumes the match so the next detection needs a fresh sequence.
 */
export function createSequenceDetector(sequence: string[], windowMs: number) {
  let position = 0;
  let lastTime = 0;

  return function register(key: string, now: number): boolean {
    const expected = sequence[position];
    const withinWindow = position === 0 || now - lastTime <= windowMs;

    if (withinWindow && key === expected) {
      position += 1;
      lastTime = now;
      if (position === sequence.length) {
        position = 0;
        return true;
      }
      return false;
    }

    // Mismatch or timeout: a key matching the sequence's first step restarts
    // it from position 1 rather than being lost entirely.
    if (key === sequence[0]) {
      position = 1;
      lastTime = now;
      return false;
    }

    position = 0;
    return false;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/celebrationHotkey.test.ts`
Expected: PASS (all tests in the file, including the pre-existing `createDoubleKeyDetector` and `isEditableTarget` ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/celebrationHotkey.ts tests/celebrationHotkey.test.ts
git commit -m "Add createSequenceDetector for multi-key easter egg triggers"
```

---

### Task 2: Shared types + server `CELEBRATE` kind passthrough + shuffle flourish roll

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `party/index.ts`
- Create: `tests/celebrateKind.test.ts`
- Modify: `tests/shufflePile.test.ts`

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `ClientAction`'s `CELEBRATE` variant now `{ type: "CELEBRATE"; kind?: EffectKind }`. `ServerEvent`'s `EFFECT` variant now `{ type: "EFFECT"; kind: EffectKind }` where `EffectKind = "deal" | "celebrate" | "chip-bet" | "chip-collect" | "rickroll" | "tableflip" | "jeer" | "konami"`. `ServerEvent`'s `PILE_SHUFFLED` variant now `{ type: "PILE_SHUFFLED"; pileId: string; animationType: "normal" | "flourish" }`. These are the types every later task's client code reads.

- [ ] **Step 1: Write the failing server tests**

Create `tests/celebrateKind.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import GameRoom from "../party/index";
import type { ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeMockRoom(): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  return {
    id: "test-room",
    storage,
    getConnections: () => [][Symbol.iterator](),
  } as unknown as Party.Room;
}

function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

describe("CELEBRATE handler kind passthrough", () => {
  it("defaults to kind 'celebrate' when no kind is given", async () => {
    const room = new GameRoom(makeMockRoom());
    const sender = makeMockConnection("player-1");

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), sender);

    const effects = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter((e): e is ServerEvent & { type: "EFFECT" } => e.type === "EFFECT");
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("celebrate");
  });

  it("passes through a given kind (e.g. 'konami')", async () => {
    const room = new GameRoom(makeMockRoom());
    const sender = makeMockConnection("player-1");

    await room.onMessage(JSON.stringify({ type: "CELEBRATE", kind: "konami" }), sender);

    const effects = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter((e): e is ServerEvent & { type: "EFFECT" } => e.type === "EFFECT");
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("konami");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/celebrateKind.test.ts`
Expected: FAIL — TypeScript error or runtime mismatch, since `CELEBRATE` doesn't accept `kind` yet and the server always broadcasts `"celebrate"`.

- [ ] **Step 3: Extend shared types**

In `src/shared/types.ts`, replace line 100:

```ts
  | { type: "CELEBRATE" }
```

with:

```ts
  | { type: "CELEBRATE"; kind?: EffectKind }
```

Add this new type near the top of the file, after the `Rank` type (line 2):

```ts
export type EffectKind = "deal" | "celebrate" | "chip-bet" | "chip-collect" | "rickroll" | "tableflip" | "jeer" | "konami";
```

Replace line 119-120:

```ts
  | { type: "PILE_SHUFFLED"; pileId: string }
  | { type: "EFFECT"; kind: "deal" | "celebrate" | "chip-bet" | "chip-collect" }
```

with:

```ts
  | { type: "PILE_SHUFFLED"; pileId: string; animationType: "normal" | "flourish" }
  | { type: "EFFECT"; kind: EffectKind }
```

- [ ] **Step 4: Update server's `CELEBRATE` handler and broadcast helpers**

In `party/index.ts`, replace the `CELEBRATE` case (around line 1042):

```ts
      case "CELEBRATE": {
        this.broadcastEffect("celebrate");
        break;
      }
```

with:

```ts
      case "CELEBRATE": {
        this.broadcastEffect(action.kind ?? "celebrate");
        break;
      }
```

Replace `broadcastEffect`'s signature (around line 1161):

```ts
  private broadcastEffect(kind: "deal" | "celebrate" | "chip-bet" | "chip-collect") {
```

with:

```ts
  private broadcastEffect(kind: EffectKind) {
```

Add `EffectKind` to the existing `import type { ... } from "../src/shared/types"` (or equivalent relative path already used in `party/index.ts` — check the existing import line at the top of the file and add `EffectKind` to that same named-import list).

- [ ] **Step 5: Add the shuffle flourish probability roll**

Replace `broadcastShuffleEvent`'s signature and body (around line 1152):

```ts
  private broadcastShuffleEvent(pileId: string) {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId,
      } satisfies ServerEvent));
    }
  }
```

with:

```ts
  private broadcastShuffleEvent(pileId: string, animationType: "normal" | "flourish" = "normal") {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId,
        animationType,
      } satisfies ServerEvent));
    }
  }
```

In the `SHUFFLE_PILE` case (around line 649-663), replace:

```ts
      case "SHUFFLE_PILE": {
        const shufflePile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!shufflePile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        shufflePile.cards = shuffle(shufflePile.cards);
        this.broadcastShuffleEvent(action.pileId);   // D-05, D-07: broadcast to all clients
        break;
      }
```

with:

```ts
      case "SHUFFLE_PILE": {
        const shufflePile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!shufflePile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        shufflePile.cards = shuffle(shufflePile.cards);
        // 1013: occasionally (~1-in-10) flourish instead of the plain cut.
        const animationType = Math.random() < 0.1 ? "flourish" : "normal";
        this.broadcastShuffleEvent(action.pileId, animationType);   // D-05, D-07: broadcast to all clients
        break;
      }
```

Note: `DEAL_NEXT_HAND`'s call to `this.broadcastShuffleEvent("draw")` (line 630) needs no change — it keeps the default `"normal"` parameter, since the flourish is explicitly scoped to "an explicit shuffle action" per the backlog item, not deal-shuffles.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/celebrateKind.test.ts tests/shufflePile.test.ts`
Expected: PASS (existing `shufflePile.test.ts` tests still pass unchanged since they don't assert on `animationType`).

- [ ] **Step 7: Add flourish-probability tests**

Add to `tests/shufflePile.test.ts` (inside the existing `describe("SHUFFLE_PILE handler", ...)` block, after the last `it(...)`):

```ts
  it("includes animationType 'normal' on the broadcast when the flourish roll misses", async () => {
    const conn1 = makeMockConnection("conn-1");
    const roomWithConns = makeMockRoom({
      getConnections: (() => [conn1][Symbol.iterator]()) as unknown as Party.Room["getConnections"],
    });
    const connectedRoom = new GameRoom(roomWithConns);
    connectedRoom.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    connectedRoom.gameState.hands["player-1"] = [];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99); // misses the 1-in-10 roll
    await connectedRoom.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), conn1);
    randomSpy.mockRestore();

    const messages = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const shuffleEvent = messages.find(e => e.type === "PILE_SHUFFLED") as { type: "PILE_SHUFFLED"; animationType: string };
    expect(shuffleEvent.animationType).toBe("normal");
  });

  it("includes animationType 'flourish' on the broadcast when the flourish roll hits", async () => {
    const conn1 = makeMockConnection("conn-1");
    const roomWithConns = makeMockRoom({
      getConnections: (() => [conn1][Symbol.iterator]()) as unknown as Party.Room["getConnections"],
    });
    const connectedRoom = new GameRoom(roomWithConns);
    connectedRoom.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    connectedRoom.gameState.hands["player-1"] = [];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01); // hits the 1-in-10 roll
    await connectedRoom.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), conn1);
    randomSpy.mockRestore();

    const messages = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const shuffleEvent = messages.find(e => e.type === "PILE_SHUFFLED") as { type: "PILE_SHUFFLED"; animationType: string };
    expect(shuffleEvent.animationType).toBe("flourish");
  });
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/celebrateKind.test.ts tests/shufflePile.test.ts`
Expected: PASS (all tests, including the two new ones).

- [ ] **Step 9: Type-check and run full unit suite**

Run: `npm run typecheck && npm test`
Expected: both succeed — this confirms no other file referencing the old `EFFECT`/`PILE_SHUFFLED`/`broadcastEffect` signatures broke. If `npm run typecheck` reports an error in `src/hooks/usePartySocket.ts` (it destructures `event.kind` and `event.pileId` from `PILE_SHUFFLED`/`EFFECT` without yet reading `animationType` or handling new kinds), that's expected and resolved in Task 3 — confirm the error is *only* in that one file before proceeding.

- [ ] **Step 10: Commit**

```bash
git add src/shared/types.ts party/index.ts tests/celebrateKind.test.ts tests/shufflePile.test.ts
git commit -m "Add EffectKind, kind passthrough on CELEBRATE, and shuffle flourish roll"
```

---

### Task 3: Client receipt — per-kind nonces, `konamiActive`, and `shufflingPileIds` as a Map

**Files:**
- Modify: `src/hooks/usePartySocket.ts`
- Modify: `src/components/BoardDragLayer.tsx` (prop type only)
- Modify: `src/components/BoardView.tsx` (prop type + `isShuffling` derivation site — no, that's PileZone; BoardView just threads the prop type through)
- Modify: `src/components/PileZone.tsx`
- Test: `tests/usePartySocketEffects.test.ts` (new)

**Interfaces:**
- Consumes: `EffectKind`, `ServerEvent` from Task 2.
- Produces: `usePartySocket(...)` now returns, in addition to its existing fields: `rickrollNonce: number`, `tableFlipNonce: number`, `jeerNonce: number`, `konamiActive: boolean`. It no longer returns `celebrationNonce` renamed — `celebrationNonce` itself is unchanged (still bumps only on `kind: "celebrate"`). `shufflingPileIds` changes type from `Set<string>` to `Map<string, "normal" | "flourish">`.

This task only changes data plumbing; no UI changes yet (the new overlay components don't exist until Tasks 5-7, so the new return values are unused by `App.tsx` until those tasks wire them in — that's fine, TypeScript won't complain about unused hook return values).

- [ ] **Step 1: Write the failing test**

Since `usePartySocket` is a hook with a real WebSocket dependency and there's no existing hook-render-test harness in this codebase (confirmed: no React Testing Library), test the event-handling logic the same way the codebase already tests other source files it can't easily render — by asserting on the source text contract. Create `tests/usePartySocketEffects.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import usePartySocketSrc from "../src/hooks/usePartySocket.ts?raw";

describe("usePartySocket effect kind handling", () => {
  it("tracks separate nonces for rickroll, tableflip, and jeer", () => {
    expect(usePartySocketSrc).toMatch(/rickrollNonce/);
    expect(usePartySocketSrc).toMatch(/tableFlipNonce/);
    expect(usePartySocketSrc).toMatch(/jeerNonce/);
  });

  it("bumps rickrollNonce only on kind 'rickroll'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'rickroll'[\s\S]{0,80}setRickrollNonce/);
  });

  it("bumps tableFlipNonce only on kind 'tableflip'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'tableflip'[\s\S]{0,80}setTableFlipNonce/);
  });

  it("bumps jeerNonce only on kind 'jeer'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'jeer'[\s\S]{0,80}setJeerNonce/);
  });

  it("sets konamiActive true on kind 'konami' and clears it via a timer", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'konami'[\s\S]{0,200}setKonamiActive\(true\)/);
    expect(usePartySocketSrc).toMatch(/setTimeout\(\(\) => setKonamiActive\(false\)/);
  });

  it("returns the new fields from the hook", () => {
    expect(usePartySocketSrc).toMatch(/return\s*\{[\s\S]*rickrollNonce[\s\S]*tableFlipNonce[\s\S]*jeerNonce[\s\S]*konamiActive[\s\S]*\}/);
  });

  it("uses a Map for shufflingPileIds keyed by animationType", () => {
    expect(usePartySocketSrc).toMatch(/shufflingPileIds.*Map<string,\s*["']normal["']\s*\|\s*["']flourish["']>/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/usePartySocketEffects.test.ts`
Expected: FAIL — none of these patterns exist in the current `usePartySocket.ts`.

- [ ] **Step 3: Implement the changes**

In `src/hooks/usePartySocket.ts`:

Replace line 11:

```ts
  const [shufflingPileIds, setShufflingPileIds] = useState<Set<string>>(new Set());
```

with:

```ts
  const [shufflingPileIds, setShufflingPileIds] = useState<Map<string, "normal" | "flourish">>(new Map());
```

Replace line 12:

```ts
  const [celebrationNonce, setCelebrationNonce] = useState(0);
```

with:

```ts
  const [celebrationNonce, setCelebrationNonce] = useState(0);
  const [rickrollNonce, setRickrollNonce] = useState(0);
  const [tableFlipNonce, setTableFlipNonce] = useState(0);
  const [jeerNonce, setJeerNonce] = useState(0);
  const [konamiActive, setKonamiActive] = useState(false);
  const konamiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Replace the `PILE_SHUFFLED` branch (around line 65-80):

```ts
      } else if (event.type === 'PILE_SHUFFLED') {
        // Fires for both explicit shuffles and deal-shuffles; deal sound follows via EFFECT.
        playSound('shuffle');
        const { pileId } = event;
        const existing = shuffleTimersRef.current.get(pileId);
        if (existing !== undefined) clearTimeout(existing);
        setShufflingPileIds(prev => new Set([...prev, pileId]));
        const timer = setTimeout(() => {
          setShufflingPileIds(prev => {
            const next = new Set(prev);
            next.delete(pileId);
            return next;
          });
          shuffleTimersRef.current.delete(pileId);
        }, 650);
        shuffleTimersRef.current.set(pileId, timer);
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        } else if (event.kind === 'chip-bet') {
          playSound('chip-bet');
        } else if (event.kind === 'chip-collect') {
          playSound('chip-collect');
        }
      } else if (event.type === 'LAST_MOVE') {
```

with:

```ts
      } else if (event.type === 'PILE_SHUFFLED') {
        // Fires for both explicit shuffles and deal-shuffles; deal sound follows via EFFECT.
        playSound('shuffle');
        const { pileId, animationType } = event;
        const existing = shuffleTimersRef.current.get(pileId);
        if (existing !== undefined) clearTimeout(existing);
        setShufflingPileIds(prev => new Map(prev).set(pileId, animationType));
        const timer = setTimeout(() => {
          setShufflingPileIds(prev => {
            const next = new Map(prev);
            next.delete(pileId);
            return next;
          });
          shuffleTimersRef.current.delete(pileId);
        }, 650);
        shuffleTimersRef.current.set(pileId, timer);
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        } else if (event.kind === 'chip-bet') {
          playSound('chip-bet');
        } else if (event.kind === 'chip-collect') {
          playSound('chip-collect');
        } else if (event.kind === 'rickroll') {
          setRickrollNonce((n) => n + 1);
        } else if (event.kind === 'tableflip') {
          setTableFlipNonce((n) => n + 1);
        } else if (event.kind === 'jeer') {
          playSound('jeer');
          setJeerNonce((n) => n + 1);
        } else if (event.kind === 'konami') {
          if (konamiTimerRef.current) clearTimeout(konamiTimerRef.current);
          setKonamiActive(true);
          konamiTimerRef.current = setTimeout(() => setKonamiActive(false), 3000);
        }
      } else if (event.type === 'LAST_MOVE') {
```

In the cleanup function (the `return () => { ... }` inside the `useEffect`, around line 102-109), add `konamiTimerRef` cleanup alongside the existing `highlightTimerRef` cleanup:

```ts
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
```

becomes:

```ts
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (konamiTimerRef.current) clearTimeout(konamiTimerRef.current);
```

Replace the final return statement (line 124):

```ts
  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove };
```

with:

```ts
  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, konamiActive, highlightedMove };
```

- [ ] **Step 4: Update `playSound`'s `SoundName` type to accept `jeer`**

In `src/lib/sound.ts`, replace line 3:

```ts
export type SoundName = "shuffle" | "deal" | "celebrate" | "chip-bet" | "chip-collect";
```

with:

```ts
export type SoundName = "shuffle" | "deal" | "celebrate" | "chip-bet" | "chip-collect" | "jeer";
```

Add `jeer: 1` to the `VARIANT_COUNTS` object (line 14-20):

```ts
const VARIANT_COUNTS: Record<SoundName, number> = {
  shuffle: 1,
  deal: 1,
  celebrate: CELEBRATE_VARIANT_COUNT,
  "chip-bet": 1,
  "chip-collect": 1,
  jeer: 1,
};
```

Do not add `"jeer.mp3"` to the `preloadSounds` files array — no asset exists yet (per the Global Constraints, this is a deliberate, documented gap, not an oversight). `playSound('jeer')` will safely no-op via the existing `.catch()` in `playSound` (src/lib/sound.ts:68) until a real file is added.

- [ ] **Step 5: Update `shufflingPileIds` prop type in consuming components**

In `src/components/BoardDragLayer.tsx`, replace line 80:

```ts
  shufflingPileIds: Set<string>;
```

with:

```ts
  shufflingPileIds: Map<string, "normal" | "flourish">;
```

In `src/components/BoardView.tsx`, find the `shufflingPileIds: Set<string>;` line in `BoardViewProps` and replace it the same way:

```ts
  shufflingPileIds: Map<string, "normal" | "flourish">;
```

In `src/components/PileZone.tsx`, replace line 14:

```ts
  shufflingPileIds?: Set<string>;
```

with:

```ts
  shufflingPileIds?: Map<string, "normal" | "flourish">;
```

Replace line 24's default value:

```ts
export function PileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Set(), onSelectAll, onToggleSelect, onCursorChange, selectedIds, highlightedMove, cursorCardId, shortcutKey }: PileZoneProps) {
```

with:

```ts
export function PileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Map(), onSelectAll, onToggleSelect, onCursorChange, selectedIds, highlightedMove, cursorCardId, shortcutKey }: PileZoneProps) {
```

Replace line 35:

```ts
  const isShuffling = shufflingPileIds.has(pile.id);
```

with:

```ts
  const shuffleAnimationType = shufflingPileIds.get(pile.id);
  const isShuffling = shuffleAnimationType !== undefined;
```

Replace the shuffle-animation render block (around line 120-133):

```ts
        {isShuffling && (['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const).map((animName, i) => (
          <div
            key={i}
            className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
            style={{
              animationName: animName,
              animationDuration: '600ms',
              animationFillMode: 'forwards',
              animationTimingFunction: 'ease-in-out',
            } as React.CSSProperties}
          >
            <CardBack />
          </div>
        ))}
```

with:

```ts
        {isShuffling && (shuffleAnimationType === 'flourish'
          ? ['flourish-cut-right-1', 'flourish-cut-right-2', 'flourish-cut-mid', 'flourish-cut-left-4', 'flourish-cut-left-5'] as const
          : ['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const
        ).map((animName, i) => (
          <div
            key={i}
            className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
            style={{
              animationName: animName,
              animationDuration: shuffleAnimationType === 'flourish' ? '900ms' : '600ms',
              animationFillMode: 'forwards',
              animationTimingFunction: 'ease-in-out',
            } as React.CSSProperties}
          >
            <CardBack />
          </div>
        ))}
```

- [ ] **Step 6: Add the flourish CSS keyframes**

In `src/globals.css`, after the existing `shuffle-cut-left-5` keyframes block (after line 157, before the `@media (prefers-reduced-motion: reduce)` block that targets `.shuffle-card-*`), add:

```css
@keyframes flourish-cut-right-1 {
  0%   { transform: translateX(0)     translateY(0)     rotate(0deg);    z-index: 10; }
  20%  { transform: translateX(110px) translateY(-36px) rotate(28deg);   z-index: 15; }
  55%  { transform: translateX(10px)  translateY(24px)  rotate(4deg);    z-index: 1; }
  100% { transform: translateX(10px)  translateY(24px)  rotate(4deg);    z-index: 1; }
}

@keyframes flourish-cut-right-2 {
  0%   { transform: translateX(0)     translateY(0)     rotate(0deg);    z-index: 9; }
  25%  { transform: translateX(110px) translateY(-36px) rotate(28deg);   z-index: 14; }
  60%  { transform: translateX(4px)   translateY(24px)  rotate(2deg);    z-index: 1; }
  100% { transform: translateX(4px)   translateY(24px)  rotate(2deg);    z-index: 1; }
}

@keyframes flourish-cut-mid {
  0%   { transform: translateX(0) translateY(0)    rotate(0deg);  z-index: 8; }
  40%  { transform: translateX(0) translateY(12px) rotate(0deg);  z-index: 8; }
  100% { transform: translateX(0) translateY(4px)  rotate(0deg);  z-index: 8; }
}

@keyframes flourish-cut-left-4 {
  0%   { transform: translateX(0)      translateY(0)     rotate(0deg);    z-index: 7; }
  10%  { transform: translateX(-18px)  translateY(-10px) rotate(-8deg);   z-index: 13; }
  45%  { transform: translateX(-110px) translateY(-36px) rotate(-28deg);  z-index: 13; }
  75%  { transform: translateX(-8px)   translateY(16px)  rotate(-4deg);   z-index: 2; }
  100% { transform: translateX(-8px)   translateY(16px)  rotate(-4deg);   z-index: 2; }
}

@keyframes flourish-cut-left-5 {
  0%   { transform: translateX(0)      translateY(0)     rotate(0deg);    z-index: 6; }
  15%  { transform: translateX(-18px)  translateY(-10px) rotate(-8deg);   z-index: 12; }
  50%  { transform: translateX(-110px) translateY(-36px) rotate(-28deg);  z-index: 12; }
  85%  { transform: translateX(0px)    translateY(8px)   rotate(0deg);    z-index: 2; }
  100% { transform: translateX(0px)    translateY(8px)   rotate(0deg);    z-index: 2; }
}
```

Extend the existing reduced-motion block (around line 159-167) to also cover flourish — it already targets `.shuffle-card-1` through `.shuffle-card-5`, which are the same classes used for flourish (only the `animationName` differs inline), so no change is needed there.

- [ ] **Step 7: Run all tests to verify they pass**

Run: `npm run typecheck && npx vitest run tests/usePartySocketEffects.test.ts && npm test`
Expected: PASS. `npm test` confirms `PileZone`/`BoardDragLayer`/`BoardView` type changes didn't break any existing test.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/usePartySocket.ts src/lib/sound.ts src/components/BoardDragLayer.tsx src/components/BoardView.tsx src/components/PileZone.tsx src/globals.css tests/usePartySocketEffects.test.ts
git commit -m "Generalize effect nonces, add konamiActive, flourish shuffle animation"
```

---

### Task 4: Wire `rr`, `99`, `bg`, and Konami key triggers in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `createSequenceDetector` (Task 1), `createDoubleKeyDetector`/`isEditableTarget` (existing), `sendAction` (existing).
- Produces: nothing new consumed by later tasks — this only sends actions. The receiving overlays (Tasks 5-8) read state already wired in Task 3.

- [ ] **Step 1: Implement the new listeners**

In `src/App.tsx`, replace the import on line 8:

```ts
import { createDoubleKeyDetector, isEditableTarget } from './lib/celebrationHotkey';
```

with:

```ts
import { createDoubleKeyDetector, createSequenceDetector, isEditableTarget } from './lib/celebrationHotkey';
```

Replace the existing `gg` `useEffect` block (lines 39-52) with the original `gg` listener plus four new ones, each in its own `useEffect` (kept separate so each detector instance and its cleanup are independently scoped, matching the existing one-effect-per-listener style already used elsewhere in this file):

```ts
  // Re-running on reconnect intentionally resets the double-press detector.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'g' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1012: rr double-tap triggers a rickroll.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'r' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'rickroll' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1015: 99 double-tap triggers a table-flip.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '9' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'tableflip' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1016: bg triggers the bad-game jeer.
  useEffect(() => {
    if (!connected) return;
    const detect = createSequenceDetector(['b', 'g'], 500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      const key = e.key.toLowerCase();
      if (key !== 'b' && key !== 'g') return;
      if (detect(key, performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'jeer' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1014: Konami code (up up down down left right left right) triggers the all-aces cheat.
  useEffect(() => {
    if (!connected) return;
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    const detect = createSequenceDetector(sequence, 2000);
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (!sequence.includes(e.key)) return;
      if (detect(e.key, performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'konami' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);
```

Note: the `if (!sequence.includes(e.key)) return;` early-return in the Konami listener means non-arrow keys never call `detect(...)` at all — this is intentionally different from the `bg` listener (which calls `detect` only for `'b'`/`'g'` keys) and is necessary because `createSequenceDetector` would otherwise reset progress on every single keystroke typed anywhere on the page (e.g. while filling in a display name, before the `isEditableTarget` guard would apply to a non-editable click elsewhere) — restricting calls to only the sequence's own alphabet keeps the detector's internal position from being disturbed by unrelated typing.

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS — confirms `CELEBRATE` action's new optional `kind` field is accepted everywhere it's sent.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "Wire rr, 99, bg, and Konami code key triggers"
```

---

### Task 5: Rickroll overlay (1012)

**Files:**
- Create: `src/components/RickrollOverlay.tsx`
- Modify: `src/App.tsx`
- Test: `tests/rickrollOverlay.test.ts` (new, source-regex style matching `tests/chipsOpponentHand.test.ts`)
- Create: `playwright/easterEggs.spec.ts` (this task adds the first test in the file; later tasks append to it)

**Interfaces:**
- Consumes: `rickrollNonce: number` (from Task 3's `usePartySocket` return value).
- Produces: `RickrollOverlay({ nonce }: { nonce: number })` — a React component with no further exports consumed elsewhere.

- [ ] **Step 1: Write the failing unit test**

Create `tests/rickrollOverlay.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import RickrollOverlaySrc from "../src/components/RickrollOverlay.tsx?raw";

describe("RickrollOverlay", () => {
  it("accepts a nonce prop", () => {
    expect(RickrollOverlaySrc).toMatch(/nonce:\s*number/);
  });

  it("renders an iframe embed", () => {
    expect(RickrollOverlaySrc).toMatch(/<iframe/);
  });

  it("auto-dismisses after 10 seconds", () => {
    expect(RickrollOverlaySrc).toMatch(/setTimeout\(\(\) => setRun\(0\),\s*10_?000\)/);
  });

  it("dismisses on click", () => {
    expect(RickrollOverlaySrc).toMatch(/onClick=\{?\(\) => setRun\(0\)/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(RickrollOverlaySrc).toMatch(/data-testid="rickroll-overlay"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rickrollOverlay.test.ts`
Expected: FAIL — `src/components/RickrollOverlay.tsx` does not exist.

- [ ] **Step 3: Implement `RickrollOverlay`**

Create `src/components/RickrollOverlay.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';

const RICKROLL_DURATION_MS = 10_000;

export function RickrollOverlay({ nonce }: { nonce: number }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), RICKROLL_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  if (run === 0) return null;

  return (
    <div
      key={run}
      data-testid="rickroll-overlay"
      onClick={() => setRun(0)}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 320,
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        cursor: 'pointer',
      }}
    >
      <iframe
        width="320"
        height="200"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
        title="Rickroll"
        frameBorder="0"
        allow="autoplay"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rickrollOverlay.test.ts`
Expected: PASS.

- [ ] **Step 5: Mount in App.tsx**

In `src/App.tsx`, add the import alongside the existing `CelebrationOverlay` import:

```ts
import { CelebrationOverlay } from './components/CelebrationOverlay';
```

becomes:

```ts
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { RickrollOverlay } from './components/RickrollOverlay';
```

Update the hook destructure (line 15) to include `rickrollNonce`:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove } = usePartySocket(
```

becomes:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, highlightedMove } = usePartySocket(
```

Update the rendered JSX (around line 54-70):

```tsx
        <CelebrationOverlay nonce={celebrationNonce} />
```

becomes:

```tsx
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
```

- [ ] **Step 6: Write the e2e test**

Create `playwright/easterEggs.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('easter eggs', () => {
  test('rr double-tap shows a rickroll overlay on both players, dismissable by click', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('r');
    await p1.keyboard.press('r');

    await expect(p1.getByTestId('rickroll-overlay')).toBeVisible();
    await expect(p2.getByTestId('rickroll-overlay')).toBeVisible();

    await p1.getByTestId('rickroll-overlay').click();
    await expect(p1.getByTestId('rickroll-overlay')).toHaveCount(0);
  });
});
```

- [ ] **Step 7: Run the e2e test**

Run: `npx playwright test easterEggs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/RickrollOverlay.tsx src/App.tsx tests/rickrollOverlay.test.ts playwright/easterEggs.spec.ts
git commit -m "Add rickroll overlay easter egg (rr double-tap)"
```

---

### Task 6: Table-flip wrapper (1015)

**Files:**
- Create: `src/components/TableFlipWrapper.tsx`
- Modify: `src/App.tsx`
- Modify: `src/globals.css`
- Test: `tests/tableFlipWrapper.test.ts` (new)
- Modify: `playwright/easterEggs.spec.ts`

**Interfaces:**
- Consumes: `tableFlipNonce: number` (from Task 3).
- Produces: `TableFlipWrapper({ nonce, children }: { nonce: number; children: React.ReactNode })`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/tableFlipWrapper.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import TableFlipWrapperSrc from "../src/components/TableFlipWrapper.tsx?raw";

describe("TableFlipWrapper", () => {
  it("accepts a nonce prop and children", () => {
    expect(TableFlipWrapperSrc).toMatch(/nonce:\s*number/);
    expect(TableFlipWrapperSrc).toMatch(/children:\s*React\.ReactNode/);
  });

  it("applies the table-flip class only while active", () => {
    expect(TableFlipWrapperSrc).toMatch(/'table-flip'/);
  });

  it("clears the flip after 1200ms", () => {
    expect(TableFlipWrapperSrc).toMatch(/setTimeout\(\(\) => setRun\(0\),\s*1200\)/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(TableFlipWrapperSrc).toMatch(/data-testid="table-flip-wrapper"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tableFlipWrapper.test.ts`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `TableFlipWrapper`**

Create `src/components/TableFlipWrapper.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const TABLE_FLIP_DURATION_MS = 1200;

export function TableFlipWrapper({ nonce, children }: { nonce: number; children: ReactNode }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), TABLE_FLIP_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  return (
    <div key={run} data-testid="table-flip-wrapper" className={run !== 0 ? 'table-flip' : undefined}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tableFlipWrapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `table-flip` CSS keyframe**

In `src/globals.css`, after the `flourish-cut-left-5` block added in Task 3 (and before the `@keyframes canvas-edge-pulse` block), add:

```css
@keyframes table-flip {
  0%   { transform: rotate(0deg); }
  50%  { transform: rotate(180deg); }
  100% { transform: rotate(0deg); }
}

.table-flip {
  animation: table-flip 1.2s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .table-flip {
    animation: none;
  }
}
```

- [ ] **Step 6: Mount in App.tsx, wrapping `BoardDragLayer`**

In `src/App.tsx`, add the import:

```ts
import { RickrollOverlay } from './components/RickrollOverlay';
```

becomes:

```ts
import { RickrollOverlay } from './components/RickrollOverlay';
import { TableFlipWrapper } from './components/TableFlipWrapper';
```

Update the hook destructure to add `tableFlipNonce`:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, highlightedMove } = usePartySocket(
```

becomes:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, highlightedMove } = usePartySocket(
```

Wrap the `<BoardDragLayer ... />` element (around lines 56-66) in `TableFlipWrapper`:

```tsx
      <>
        <BoardDragLayer
          gameState={gameState}
          playerId={joinState.playerId}
          roomId={roomId}
          connected={connected}
          sendAction={sendAction}
          setDragging={setDragging}
          shufflingPileIds={shufflingPileIds}
          highlightedMove={highlightedMove}
        />
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
      </>
```

becomes:

```tsx
      <>
        <TableFlipWrapper nonce={tableFlipNonce}>
          <BoardDragLayer
            gameState={gameState}
            playerId={joinState.playerId}
            roomId={roomId}
            connected={connected}
            sendAction={sendAction}
            setDragging={setDragging}
            shufflingPileIds={shufflingPileIds}
            highlightedMove={highlightedMove}
          />
        </TableFlipWrapper>
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
      </>
```

- [ ] **Step 7: Add the e2e test**

Append to `playwright/easterEggs.spec.ts` (inside the existing `test.describe('easter eggs', ...)` block):

```ts
  test('99 double-tap flips the table on both players and reverts', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('9');
    await p1.keyboard.press('9');

    await expect(p1.getByTestId('table-flip-wrapper')).toHaveClass(/table-flip/);
    await expect(p2.getByTestId('table-flip-wrapper')).toHaveClass(/table-flip/);

    await expect(p1.getByTestId('table-flip-wrapper')).not.toHaveClass(/table-flip/, { timeout: 2000 });
  });
```

- [ ] **Step 8: Run the e2e test**

Run: `npx playwright test easterEggs`
Expected: PASS (both tests in the file).

- [ ] **Step 9: Commit**

```bash
git add src/components/TableFlipWrapper.tsx src/App.tsx src/globals.css tests/tableFlipWrapper.test.ts playwright/easterEggs.spec.ts
git commit -m "Add table-flip easter egg (99 double-tap)"
```

---

### Task 7: Bad-game jeer overlay (1016)

**Files:**
- Create: `src/components/JeerOverlay.tsx`
- Modify: `src/App.tsx`
- Modify: `src/globals.css`
- Test: `tests/jeerOverlay.test.ts` (new)
- Modify: `playwright/easterEggs.spec.ts`

**Interfaces:**
- Consumes: `jeerNonce: number` (from Task 3), `generateBursts`, `CELEBRATION_BURST_COUNT`, `CELEBRATION_DURATION_MS` (existing, from `src/lib/celebrationBursts.ts` — reused as-is, no changes to that file).
- Produces: `JeerOverlay({ nonce }: { nonce: number })`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/jeerOverlay.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import JeerOverlaySrc from "../src/components/JeerOverlay.tsx?raw";

describe("JeerOverlay", () => {
  it("accepts a nonce prop", () => {
    expect(JeerOverlaySrc).toMatch(/nonce:\s*number/);
  });

  it("reuses the existing burst generator", () => {
    expect(JeerOverlaySrc).toMatch(/import\s*\{[\s\S]*generateBursts[\s\S]*\}\s*from\s*['"]@\/lib\/celebrationBursts['"]/);
  });

  it("renders CardBack glyphs drooping downward", () => {
    expect(JeerOverlaySrc).toMatch(/<CardBack/);
    expect(JeerOverlaySrc).toMatch(/jeer-droop/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(JeerOverlaySrc).toMatch(/data-testid="jeer-overlay"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/jeerOverlay.test.ts`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `JeerOverlay`**

Create `src/components/JeerOverlay.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from '@/lib/celebrationBursts';
import { CardBack } from './CardBack';

export function JeerOverlay({ nonce }: { nonce: number }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), CELEBRATION_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  // Reuse the existing burst position/timing generator — one droop per burst slot.
  const bursts = useMemo(() => generateBursts(CELEBRATION_BURST_COUNT), [run]);

  if (run === 0) return null;

  return (
    <div
      key={run}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}
      data-testid="jeer-overlay"
    >
      {bursts.map((b, bi) => (
        <div
          key={bi}
          className="jeer-droop"
          style={{
            position: 'absolute',
            left: `${b.xPct}%`,
            top: `${b.yPct}%`,
            animationDelay: `${b.delayMs}ms`,
            ['--jy' as string]: `${b.radius}px`,
            ['--jr' as string]: `${((bi * 37) % 40) - 20}deg`,
          }}
        >
          <CardBack className="w-[24px] h-[36px] opacity-70" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/jeerOverlay.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `jeer-droop` CSS keyframe**

In `src/globals.css`, after the `.table-flip` reduced-motion block added in Task 6, add:

```css
@keyframes jeer-droop {
  0%   { transform: translateY(0) rotate(0deg);              opacity: 1; }
  100% { transform: translateY(var(--jy)) rotate(var(--jr));  opacity: 0; }
}

.jeer-droop {
  animation: jeer-droop 1.7s ease-in forwards;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .jeer-droop {
    animation: none;
    opacity: 0;
  }
}
```

- [ ] **Step 6: Mount in App.tsx**

In `src/App.tsx`, add the import:

```ts
import { TableFlipWrapper } from './components/TableFlipWrapper';
```

becomes:

```ts
import { TableFlipWrapper } from './components/TableFlipWrapper';
import { JeerOverlay } from './components/JeerOverlay';
```

Update the hook destructure to add `jeerNonce`:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, highlightedMove } = usePartySocket(
```

becomes:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, highlightedMove } = usePartySocket(
```

Add `<JeerOverlay nonce={jeerNonce} />` alongside the other overlays:

```tsx
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
      </>
```

becomes:

```tsx
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
        <JeerOverlay nonce={jeerNonce} />
      </>
```

- [ ] **Step 7: Add the e2e test**

Append to `playwright/easterEggs.spec.ts`:

```ts
  test('bg triggers the bad-game jeer overlay on both players and it clears', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('b');
    await p1.keyboard.press('g');

    await expect(p1.getByTestId('jeer-overlay')).toBeVisible();
    await expect(p2.getByTestId('jeer-overlay')).toBeVisible();

    await expect(p2.getByTestId('jeer-overlay')).toHaveCount(0, { timeout: 8000 });
  });
```

- [ ] **Step 8: Run the e2e test**

Run: `npx playwright test easterEggs`
Expected: PASS (all three tests in the file).

- [ ] **Step 9: Commit**

```bash
git add src/components/JeerOverlay.tsx src/App.tsx src/globals.css tests/jeerOverlay.test.ts playwright/easterEggs.spec.ts
git commit -m "Add bad-game jeer overlay easter egg (bg)"
```

---

### Task 8: Konami all-aces cheat (1014)

**Files:**
- Create: `src/components/KonamiBanner.tsx`
- Modify: `src/components/HandZone.tsx`
- Modify: `src/components/OpponentHand.tsx`
- Modify: `src/components/BoardView.tsx`
- Modify: `src/components/BoardDragLayer.tsx`
- Modify: `src/App.tsx`
- Test: `tests/konamiBanner.test.ts` (new), `tests/konamiAceOverride.test.ts` (new)
- Modify: `playwright/easterEggs.spec.ts`

**Interfaces:**
- Consumes: `konamiActive: boolean` (from Task 3).
- Produces: `KonamiBanner({ active }: { active: boolean })`. `HandZone` and `OpponentHand` both gain a `konamiActive: boolean` prop (required, no default — every call site is updated in this task).

- [ ] **Step 1: Write the failing unit tests**

Create `tests/konamiBanner.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import KonamiBannerSrc from "../src/components/KonamiBanner.tsx?raw";

describe("KonamiBanner", () => {
  it("accepts an active prop", () => {
    expect(KonamiBannerSrc).toMatch(/active:\s*boolean/);
  });

  it("renders nothing when not active", () => {
    expect(KonamiBannerSrc).toMatch(/if\s*\(!active\)\s*return null/);
  });

  it("shows the CHEATER DETECTED text", () => {
    expect(KonamiBannerSrc).toMatch(/CHEATER DETECTED/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(KonamiBannerSrc).toMatch(/data-testid="konami-banner"/);
  });
});
```

Create `tests/konamiAceOverride.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";

describe("Konami all-aces cosmetic override", () => {
  it("HandZone accepts a konamiActive prop", () => {
    expect(HandZoneSrc).toMatch(/konamiActive:\s*boolean/);
  });

  it("HandZone overrides rank to 'A' on CardFace when konamiActive, without mutating the real card", () => {
    expect(HandZoneSrc).toMatch(/konamiActive\s*\?\s*\{\s*\.\.\.card,\s*rank:\s*['"]A['"]\s*\}\s*:\s*card/);
  });

  it("OpponentHand accepts a konamiActive prop", () => {
    expect(OpponentHandSrc).toMatch(/konamiActive:\s*boolean/);
  });

  it("OpponentHand overrides rank to 'A' on revealed CardFace when konamiActive, without mutating the real card", () => {
    expect(OpponentHandSrc).toMatch(/konamiActive\s*\?\s*\{\s*\.\.\.card,\s*rank:\s*['"]A['"]\s*\}\s*:\s*card/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/konamiBanner.test.ts tests/konamiAceOverride.test.ts`
Expected: FAIL — `KonamiBanner.tsx` doesn't exist; `HandZone`/`OpponentHand` don't have `konamiActive` yet.

- [ ] **Step 3: Implement `KonamiBanner`**

Create `src/components/KonamiBanner.tsx`:

```tsx
export function KonamiBanner({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      data-testid="konami-banner"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(120, 0, 0, 0.9)',
        color: '#fff',
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '8px 20px',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    >
      CHEATER DETECTED
    </div>
  );
}
```

- [ ] **Step 4: Thread `konamiActive` into `HandZone`'s `SortableHandCard`**

In `src/components/HandZone.tsx`, the `SortableHandCardProps` interface (just above the `SortableHandCard` function, around line 70-83) needs a new field. Find the interface and add:

```ts
  konamiActive: boolean;
```

Update the `SortableHandCard` function signature (line 84):

```ts
function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect, onCursorChange, isHighlighted, highlightNonce, hasCursor }: SortableHandCardProps) {
```

becomes:

```ts
function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect, onCursorChange, isHighlighted, highlightNonce, hasCursor, konamiActive }: SortableHandCardProps) {
```

Replace line 128:

```tsx
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
```

with:

```tsx
        {card.faceUp ? <CardFace card={konamiActive ? { ...card, rank: 'A' } : card} /> : <CardBack />}
```

Add `konamiActive: boolean;` to `HandZoneProps` (the interface around line 139-159), and add `konamiActive` to the `HandZone` function's destructured parameters (line 161). Find where `displayedCards.map(...)` renders each `SortableHandCard` (search for `<SortableHandCard` in the file) and add `konamiActive={konamiActive}` to its props.

- [ ] **Step 5: Thread `konamiActive` into `OpponentHand`**

In `src/components/OpponentHand.tsx`, add `konamiActive: boolean;` to `OpponentHandProps` (the interface around lines 10-21), and add `konamiActive` to the function's destructured parameters (line 23). Replace the revealed-cards render block (lines 60-67):

```tsx
          {revealedCards && revealedCards.length > 0
            ? revealedCards.map((card, i) => (
                <CardFace
                  key={card.id}
                  card={card}
                  className={cn('w-[40px] h-[60px]', i > 0 ? '-ml-3' : undefined)}
                />
              ))
```

with:

```tsx
          {revealedCards && revealedCards.length > 0
            ? revealedCards.map((card, i) => (
                <CardFace
                  key={card.id}
                  card={konamiActive ? { ...card, rank: 'A' } : card}
                  className={cn('w-[40px] h-[60px]', i > 0 ? '-ml-3' : undefined)}
                />
              ))
```

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `npx vitest run tests/konamiBanner.test.ts tests/konamiAceOverride.test.ts`
Expected: PASS.

- [ ] **Step 7: Thread `konamiActive` from `App.tsx` down through `BoardDragLayer` and `BoardView`**

In `src/components/BoardDragLayer.tsx`, add `konamiActive: boolean;` to `BoardDragLayerProps` (around line 75-82), add `konamiActive` to the function's destructured parameters (line 92), and add `konamiActive={konamiActive}` to the `<BoardView ... />` call (the long prop list found earlier — append it alongside the other passthrough props).

In `src/components/BoardView.tsx`, add `konamiActive: boolean;` to `BoardViewProps`, add `konamiActive` to the function's destructured parameters, and:
- Add `konamiActive={konamiActive}` to the `<HandZone ... />` call.
- Add `konamiActive={konamiActive}` to the `<OpponentHand ... />` call (inside the `allOpponentIds.map(...)` block in the header).

In `src/App.tsx`, update the hook destructure to add `konamiActive`:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, highlightedMove } = usePartySocket(
```

becomes:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, konamiActive, highlightedMove } = usePartySocket(
```

Add the import:

```ts
import { JeerOverlay } from './components/JeerOverlay';
```

becomes:

```ts
import { JeerOverlay } from './components/JeerOverlay';
import { KonamiBanner } from './components/KonamiBanner';
```

Pass `konamiActive` to `BoardDragLayer` and mount `KonamiBanner`:

```tsx
        <TableFlipWrapper nonce={tableFlipNonce}>
          <BoardDragLayer
            gameState={gameState}
            playerId={joinState.playerId}
            roomId={roomId}
            connected={connected}
            sendAction={sendAction}
            setDragging={setDragging}
            shufflingPileIds={shufflingPileIds}
            highlightedMove={highlightedMove}
          />
        </TableFlipWrapper>
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
        <JeerOverlay nonce={jeerNonce} />
      </>
```

becomes:

```tsx
        <TableFlipWrapper nonce={tableFlipNonce}>
          <BoardDragLayer
            gameState={gameState}
            playerId={joinState.playerId}
            roomId={roomId}
            connected={connected}
            sendAction={sendAction}
            setDragging={setDragging}
            shufflingPileIds={shufflingPileIds}
            highlightedMove={highlightedMove}
            konamiActive={konamiActive}
          />
        </TableFlipWrapper>
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
        <JeerOverlay nonce={jeerNonce} />
        <KonamiBanner active={konamiActive} />
      </>
```

- [ ] **Step 8: Run full typecheck and unit suite**

Run: `npm run typecheck && npm test`
Expected: PASS — confirms every `HandZone`/`OpponentHand` call site (including any in tests that construct props inline) now satisfies the new required `konamiActive` prop. If `npm test` fails on an existing test asserting an exact prop list for `HandZone` or `OpponentHand` (e.g. a test that counts JSX attributes), update that test's expectation to include `konamiActive` — do not make the prop optional to avoid touching such a test, since an optional prop would mask a forgotten call site elsewhere.

- [ ] **Step 9: Add the e2e test**

Append to `playwright/easterEggs.spec.ts`:

```ts
  test('Konami code shows CHEATER DETECTED and renders all hand cards as aces, then reverts', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await p1.keyboard.press('Escape');
    await p1.waitForTimeout(300);

    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    for (const key of sequence) {
      await p1.keyboard.press(key);
    }

    await expect(p1.getByTestId('konami-banner')).toBeVisible();
    await expect(p2.getByTestId('konami-banner')).toBeVisible();

    const handCardImages = p1.getByTestId('hand-zone').locator('img[alt^="A of"]');
    await expect(handCardImages.first()).toBeVisible();

    await expect(p1.getByTestId('konami-banner')).toHaveCount(0, { timeout: 4000 });
  });
```

Note: this test asserts on `img[alt^="A of"]`, which matches `CardFace`'s `alt={`${card.rank} of ${card.suit}`}` (src/components/CardFace.tsx:26) — this only renders when `CARD_FACE_URL(card)` resolves to an image. If the project's card art is the text-glyph fallback (no `CARD_FACE_URL` configured) in the test environment, this assertion will need to instead check the glyph-rendering branch's rank `<span>` text equals `'A'` — verify which branch is active by checking `src/card-art.ts`'s `CARD_FACE_URL` before relying on this exact locator, and adjust the assertion to match whichever branch is actually rendered.

- [ ] **Step 10: Run the e2e test**

Run: `npx playwright test easterEggs`
Expected: PASS (all four tests in the file).

- [ ] **Step 11: Commit**

```bash
git add src/components/KonamiBanner.tsx src/components/HandZone.tsx src/components/OpponentHand.tsx src/components/BoardView.tsx src/components/BoardDragLayer.tsx src/App.tsx tests/konamiBanner.test.ts tests/konamiAceOverride.test.ts playwright/easterEggs.spec.ts
git commit -m "Add Konami code all-aces cheat (cosmetic-only, self-reverting)"
```

---

### Task 9: Shuffle flourish e2e coverage (1013)

Tasks 2 and 3 already implemented and unit-tested the server-side probability roll and the client-side flourish keyframe selection. This task adds the end-to-end behavioral test confirming a forced flourish actually renders the alternate animation in the browser.

**Files:**
- Modify: `playwright/easterEggs.spec.ts`

**Interfaces:**
- Consumes: nothing new — exercises the existing `SHUFFLE_PILE` action and `PILE_SHUFFLED` broadcast end-to-end.

- [ ] **Step 1: Write the e2e test, forcing the flourish roll deterministically**

Since `Math.random()` inside the PartyKit server process can't be mocked from a Playwright test (it runs in a separate process), this test instead verifies the *mechanism* deterministically by running enough shuffles that a ~1-in-10 flourish is overwhelmingly likely to occur at least once, and asserting the flourish CSS class appears when it does. Append to `playwright/easterEggs.spec.ts`:

```ts
  test('an explicit shuffle occasionally plays the exaggerated flourish animation', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await p1.locator('body').click();
    let sawFlourish = false;

    for (let i = 0; i < 40 && !sawFlourish; i++) {
      await p1.getByTestId('pile-draw').getByRole('button', { name: /shuffle/i }).click();
      const flourishCard = p1.locator('.shuffle-card-1[style*="flourish-cut-right-1"]');
      sawFlourish = await flourishCard.isVisible().catch(() => false);
      if (!sawFlourish) await p1.waitForTimeout(700); // let the 650ms shuffle animation clear before the next click
    }

    expect(sawFlourish).toBe(true);
  });
```

- [ ] **Step 2: Run the e2e test**

Run: `npx playwright test easterEggs -g "flourish"`
Expected: PASS. With a true 10% per-trial probability, the chance of zero flourishes in 40 independent trials is `0.9^40 ≈ 1.5%` — acceptable flake rate for this kind of probabilistic e2e check; if this proves flaky in CI, raise the trial count rather than asserting on a single shuffle.

- [ ] **Step 3: Run the full e2e suite to confirm no regressions**

Run: `npx playwright test`
Expected: PASS (all tests, including the pre-existing `playwright/celebration.spec.ts` `gg` test and the new `playwright/easterEggs.spec.ts` tests from Tasks 5-9).

- [ ] **Step 4: Run the full unit suite and typecheck one final time**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add playwright/easterEggs.spec.ts
git commit -m "Add e2e coverage for shuffle flourish animation"
```

---

## Self-Review Notes

- **Spec coverage:** 1012 (Task 5), 1013 (Tasks 2, 3, 9), 1014 (Task 8), 1015 (Task 6), 1016 (Task 7) — all five backlog items have a task. Shared infra (Tasks 1, 3, 4) matches the design spec's "shared infrastructure changes" section exactly (detector reuse, `kind` discriminator, per-kind nonces, cosmetic-only Konami).
- **Placeholder scan:** no TBD/TODO; every step shows real, complete code with exact file paths and line anchors taken from the current source.
- **Type consistency:** `EffectKind` is defined once (Task 2) and reused verbatim in every later task; `konamiActive`, `rickrollNonce`, `tableFlipNonce`, `jeerNonce` names are consistent from their introduction in Task 3 through every consuming task.
