# Sound Effects & Celebration Easter Egg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared shuffle/deal sound effects with a persistent mute toggle, and a hidden `w-w` keyboard combo that fires a shared card-suit fireworks celebration with sound.

**Architecture:** A single ephemeral `EFFECT` server→client broadcast (`kind: "deal" | "celebrate"`) plus a `CELEBRATE` client action carry shared effects to every connected player. Shuffle reuses the existing `PILE_SHUFFLED` message. A small `sound.ts` module owns audio playback and a `localStorage`-backed mute flag. Pure, node-testable helpers (`sound.ts` mute policy, double-key detector, burst generator) are unit-tested; DOM/hook wiring is covered by Playwright, matching the repo's node-only Vitest convention.

**Tech Stack:** React 18 + TypeScript, PartyKit (Cloudflare Workers), Vitest (node, `globals: true`, tests in `tests/**/*.test.ts`), Playwright. Audio via `HTMLAudioElement` + bundled CC0 `.mp3` files in `public/sounds/`.

**Spec:** `docs/superpowers/specs/2026-06-01-sound-and-celebration-design.md`

---

## File Structure

**New files:**
- `src/lib/sound.ts` — audio playback + mute state (single source of truth).
- `src/lib/celebrationHotkey.ts` — pure double-key detector + editable-target guard.
- `src/lib/celebrationBursts.ts` — pure burst-geometry generator + celebration constants.
- `src/components/CelebrationOverlay.tsx` — full-screen fireworks overlay.
- `tests/effectBroadcast.test.ts` — server CELEBRATE + DEAL effect broadcasts.
- `tests/sound.test.ts` — mute policy + playback gating (stubbed globals).
- `tests/celebrationHotkey.test.ts` — detector + editable guard.
- `tests/celebrationBursts.test.ts` — burst generator ranges/count.
- `playwright/celebration.spec.ts` — shared celebration + mute persistence E2E.
- `public/sounds/shuffle.mp3`, `public/sounds/deal.mp3`, `public/sounds/celebrate.mp3` — CC0 audio (supplied separately).

**Modified files:**
- `src/shared/types.ts` — add `EFFECT` to `ServerEvent`, `CELEBRATE` to `ClientAction`.
- `party/index.ts` — `broadcastEffect`; `DEAL_CARDS` deal effect; `CELEBRATE` case.
- `src/hooks/usePartySocket.ts` — handle `EFFECT`; shuffle sound on `PILE_SHUFFLED`; expose `celebrationNonce`.
- `src/components/ControlsBar.tsx` — mute toggle row.
- `src/App.tsx` — `w-w` hotkey listener; render `CelebrationOverlay`.
- `src/globals.css` — celebration keyframes.

---

## Task 1: Shared types — `EFFECT` event and `CELEBRATE` action

**Files:**
- Modify: `src/shared/types.ts:73-89` (ClientAction), `src/shared/types.ts:96-99` (ServerEvent)

- [ ] **Step 1: Add `CELEBRATE` to `ClientAction`**

In `src/shared/types.ts`, add a new member to the `ClientAction` union (after the `PING` line, line 87):

```ts
  | { type: "PING" }
  | { type: "CELEBRATE" }
```

- [ ] **Step 2: Add `EFFECT` to `ServerEvent`**

Replace the `ServerEvent` union (lines 96-99) with:

```ts
export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string }
  | { type: "PILE_SHUFFLED"; pileId: string }
  | { type: "EFFECT"; kind: "deal" | "celebrate" };
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no errors — the new union members are not yet referenced).

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add EFFECT event and CELEBRATE action types (999.23/999.43)"
```

---

## Task 2: Server — `broadcastEffect`, `CELEBRATE` case, deal effect

**Files:**
- Modify: `party/index.ts` (DEAL_CARDS handler ~469-515; add CELEBRATE case near PING ~928; add `broadcastEffect` near `broadcastShuffleEvent` ~950)
- Test: `tests/effectBroadcast.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/effectBroadcast.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import type { ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection } from "./helpers";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

describe("EFFECT broadcasts", () => {
  it("CELEBRATE broadcasts EFFECT kind:celebrate to all connections", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn1);

    for (const conn of [conn1, conn2]) {
      const effects = messagesOf(conn).filter(
        (e): e is { type: "EFFECT"; kind: "deal" | "celebrate" } => e.type === "EFFECT",
      );
      expect(effects).toHaveLength(1);
      expect(effects[0].kind).toBe("celebrate");
    }
  });

  it("CELEBRATE takes no undo snapshot", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn1);

    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("DEAL_CARDS broadcasts EFFECT kind:deal to all connections", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];
    room.gameState.hands["p2"] = [];

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), conn1);

    for (const conn of [conn1, conn2]) {
      const dealEffects = messagesOf(conn).filter(
        (e): e is { type: "EFFECT"; kind: "deal" | "celebrate" } => e.type === "EFFECT" && e.kind === "deal",
      );
      expect(dealEffects).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/effectBroadcast.test.ts`
Expected: FAIL — no `EFFECT` messages are sent yet (CELEBRATE is an unhandled action; deal sends none).

- [ ] **Step 3: Add the `broadcastEffect` helper**

In `party/index.ts`, immediately after the `broadcastShuffleEvent` method (it ends ~line 957, just before `broadcastState`), add:

```ts
  private broadcastEffect(kind: "deal" | "celebrate") {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "EFFECT",
        kind,
      } satisfies ServerEvent));
    }
  }
```

- [ ] **Step 4: Emit the deal effect**

In the `DEAL_CARDS` case, after the dealing loop sets the phase (the line `this.gameState.phase = "playing";`, ~line 514), add the broadcast before the closing `break;`:

```ts
        this.gameState.phase = "playing";
        this.broadcastEffect("deal");
        break;
```

- [ ] **Step 5: Add the `CELEBRATE` case**

In the `onMessage` switch, add a case next to `PING` (~line 928). It mutates no state and takes no snapshot:

```ts
      case "CELEBRATE": {
        this.broadcastEffect("celebrate");
        break;
      }
      case "PING":
        break;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/effectBroadcast.test.ts`
Expected: PASS (all 3 tests). Note the deal test waits ~650ms for the real-timer deal animation window — that is expected.

- [ ] **Step 7: Commit**

```bash
git add party/index.ts tests/effectBroadcast.test.ts
git commit -m "feat: broadcast EFFECT for deal and celebrate (999.23/999.43)"
```

---

## Task 3: Audio module — `src/lib/sound.ts`

**Files:**
- Create: `src/lib/sound.ts`
- Test: `tests/sound.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/sound.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMuted, setMuted, playSound, __resetSoundForTests } from "../src/lib/sound";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  preload = "";
  currentTime = 0;
  play = vi.fn().mockResolvedValue(undefined);
  constructor(src: string) { this.src = src; MockAudio.instances.push(this); }
}

beforeEach(() => {
  __resetSoundForTests();
  MockAudio.instances = [];
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetSoundForTests();
});

describe("sound mute policy", () => {
  it("defaults to unmuted when nothing is stored", () => {
    expect(getMuted()).toBe(false);
  });

  it("setMuted persists to localStorage and is reflected by getMuted", () => {
    setMuted(true);
    expect(getMuted()).toBe(true);
    expect(localStorage.getItem("vd-muted")).toBe("1");
  });

  it("initializes muted from an existing localStorage value", () => {
    localStorage.setItem("vd-muted", "1");
    expect(getMuted()).toBe(true);
  });
});

describe("playSound gating", () => {
  it("plays when unmuted and resets currentTime", () => {
    setMuted(false);
    playSound("shuffle");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(MockAudio.instances[0].currentTime).toBe(0);
  });

  it("does not play when muted", () => {
    setMuted(true);
    playSound("shuffle");
    expect(MockAudio.instances).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sound.test.ts`
Expected: FAIL — cannot import from `../src/lib/sound` (module does not exist).

- [ ] **Step 3: Write the module**

Create `src/lib/sound.ts`:

```ts
const MUTE_KEY = "vd-muted";

export type SoundName = "shuffle" | "deal" | "celebrate";

let mutedCache: boolean | null = null;
const audioCache = new Map<SoundName, HTMLAudioElement>();

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getMuted(): boolean {
  if (mutedCache === null) mutedCache = loadMuted();
  return mutedCache;
}

export function setMuted(value: boolean): void {
  mutedCache = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* localStorage unavailable — keep in-memory only */
  }
}

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let el = audioCache.get(name);
  if (!el) {
    const base = import.meta.env.BASE_URL || "/";
    el = new Audio(`${base}sounds/${name}.mp3`);
    el.preload = "auto";
    audioCache.set(name, el);
  }
  return el;
}

export function playSound(name: SoundName): void {
  if (getMuted()) return;
  const el = getAudio(name);
  if (!el) return;
  el.currentTime = 0;
  void el.play().catch(() => {
    /* autoplay blocked or file missing — ignore */
  });
}

// Test-only: clear module-level caches between tests.
export function __resetSoundForTests(): void {
  mutedCache = null;
  audioCache.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sound.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sound.ts tests/sound.test.ts
git commit -m "feat: add sound playback + persistent mute module (999.23)"
```

---

## Task 4: Celebration hotkey helpers — `src/lib/celebrationHotkey.ts`

**Files:**
- Create: `src/lib/celebrationHotkey.ts`
- Test: `tests/celebrationHotkey.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/celebrationHotkey.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createDoubleKeyDetector, isEditableTarget } from "../src/lib/celebrationHotkey";

describe("createDoubleKeyDetector", () => {
  it("fires only on a second press within the window", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false); // first press
    expect(detect(1300)).toBe(true);  // 300ms later — double
  });

  it("does not fire when the second press is outside the window", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false);
    expect(detect(2000)).toBe(false); // 1000ms gap — too slow
    expect(detect(2200)).toBe(true);  // now within window of the 2000 press
  });

  it("consumes the pair so three quick presses fire once", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false);
    expect(detect(1100)).toBe(true);  // pair fires
    expect(detect(1200)).toBe(false); // third press is a fresh first press
  });
});

describe("isEditableTarget", () => {
  it("treats form fields and contenteditable as editable", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ isContentEditable: true })).toBe(true);
  });

  it("treats other elements and null as not editable", () => {
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/celebrationHotkey.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the module**

Create `src/lib/celebrationHotkey.ts`:

```ts
/**
 * Returns a registrar that reports `true` when called twice within `windowMs`.
 * Each successful double-press consumes the pair, so the next detection needs
 * two fresh presses.
 */
export function createDoubleKeyDetector(windowMs = 500) {
  let last = 0;
  return function register(now: number): boolean {
    if (last !== 0 && now - last <= windowMs) {
      last = 0;
      return true;
    }
    last = now;
    return false;
  };
}

type EditableLike = { tagName?: string; isContentEditable?: boolean } | null;

export function isEditableTarget(target: EditableLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/celebrationHotkey.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/celebrationHotkey.ts tests/celebrationHotkey.test.ts
git commit -m "feat: add double-key detector + editable guard for celebration combo (999.43)"
```

---

## Task 5: Burst generator + overlay component + CSS

**Files:**
- Create: `src/lib/celebrationBursts.ts`, `src/components/CelebrationOverlay.tsx`
- Modify: `src/globals.css`
- Test: `tests/celebrationBursts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/celebrationBursts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from "../src/lib/celebrationBursts";

describe("generateBursts", () => {
  it("returns the requested number of bursts", () => {
    expect(generateBursts(CELEBRATION_BURST_COUNT)).toHaveLength(CELEBRATION_BURST_COUNT);
  });

  it("produces minimum values when rand returns 0", () => {
    const [b] = generateBursts(1, () => 0);
    expect(b.xPct).toBe(12);
    expect(b.yPct).toBe(12);
    expect(b.delayMs).toBe(0);
    expect(b.particles).toBe(8);
    expect(b.radius).toBe(55);
  });

  it("keeps every burst within documented ranges", () => {
    const bursts = generateBursts(50, Math.random);
    for (const b of bursts) {
      expect(b.xPct).toBeGreaterThanOrEqual(12);
      expect(b.xPct).toBeLessThanOrEqual(88);
      expect(b.yPct).toBeGreaterThanOrEqual(12);
      expect(b.yPct).toBeLessThanOrEqual(62);
      expect(b.particles).toBeGreaterThanOrEqual(8);
      expect(b.particles).toBeLessThanOrEqual(11);
      expect(b.delayMs).toBeGreaterThanOrEqual(0);
      expect(b.delayMs).toBeLessThanOrEqual(CELEBRATION_DURATION_MS - 1700);
      expect(b.radius).toBeGreaterThanOrEqual(55);
      expect(b.radius).toBeLessThanOrEqual(95);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/celebrationBursts.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the generator**

Create `src/lib/celebrationBursts.ts`:

```ts
export const CELEBRATION_DURATION_MS = 5000;
export const CELEBRATION_BURST_COUNT = 12; // ~20% denser than the 10-burst preview

export interface Burst {
  xPct: number;   // horizontal position, 12–88
  yPct: number;   // vertical position, 12–62
  delayMs: number; // 0 .. (DURATION - 1700) so the last burst finishes by ~5s
  particles: number; // 8–11 suits per burst
  radius: number;  // 55–95 px explosion radius
}

export function generateBursts(count: number, rand: () => number = Math.random): Burst[] {
  const bursts: Burst[] = [];
  for (let i = 0; i < count; i++) {
    bursts.push({
      xPct: 12 + rand() * 76,
      yPct: 12 + rand() * 50,
      delayMs: Math.floor(rand() * (CELEBRATION_DURATION_MS - 1700)),
      particles: 8 + Math.floor(rand() * 4),
      radius: 55 + rand() * 40,
    });
  }
  return bursts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/celebrationBursts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add celebration keyframes to `src/globals.css`**

Append to `src/globals.css`:

```css
@keyframes celebration-pop {
  0%   { transform: translate(0, 0) scale(0.3); opacity: 0; }
  8%   { opacity: 1; }
  100% { transform: translate(var(--cx), calc(var(--cy) + 28px)) scale(1.25) rotate(var(--cr)); opacity: 0; }
}

@keyframes celebration-fade {
  0%   { opacity: 0; }
  30%  { opacity: 1; }
  100% { opacity: 0; }
}

.celebration-suit {
  position: absolute;
  font-size: 24px;
  font-weight: 700;
  opacity: 0;
  animation: celebration-pop 1.7s ease-out forwards;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .celebration-suit {
    animation-name: celebration-fade;
  }
}
```

- [ ] **Step 6: Write the overlay component**

Create `src/components/CelebrationOverlay.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from '@/lib/celebrationBursts';

const SUITS = ['♠', '♥', '♦', '♣'] as const;
const RED = new Set(['♥', '♦']);

export function CelebrationOverlay({ nonce }: { nonce: number }) {
  // `run` is the active instance key (0 = idle). Bumping it restarts the animation.
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce); // restart on each trigger
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), CELEBRATION_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  if (run === 0) return null;

  const bursts = generateBursts(CELEBRATION_BURST_COUNT);

  return (
    <div
      key={run}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}
      data-testid="celebration-overlay"
    >
      {bursts.map((b, bi) => (
        <div key={bi} style={{ position: 'absolute', left: `${b.xPct}%`, top: `${b.yPct}%`, width: 0, height: 0 }}>
          {Array.from({ length: b.particles }).map((_, pi) => {
            const sym = SUITS[pi % 4];
            const angle = (pi / b.particles) * Math.PI * 2;
            const cx = Math.cos(angle) * b.radius;
            const cy = Math.sin(angle) * b.radius;
            const rot = `${((bi * 53 + pi * 97) % 720) - 360}deg`;
            return (
              <span
                key={pi}
                className="celebration-suit"
                style={{
                  color: RED.has(sym) ? '#ff5b5b' : '#ffffff',
                  ['--cx' as string]: `${cx}px`,
                  ['--cy' as string]: `${cy}px`,
                  ['--cr' as string]: rot,
                  animationDelay: `${b.delayMs}ms`,
                }}
              >
                {sym}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/celebrationBursts.ts src/components/CelebrationOverlay.tsx src/globals.css tests/celebrationBursts.test.ts
git commit -m "feat: card-suit celebration overlay + burst generator (999.43)"
```

---

## Task 6: Client wiring — sounds, celebration nonce, hotkey, overlay

**Files:**
- Modify: `src/hooks/usePartySocket.ts:12` (state), `:51-65` (PILE_SHUFFLED handler), add EFFECT branch, `:88` (return)
- Modify: `src/App.tsx:1-6` (imports), `:11` (destructure), `RoomView` body (hotkey + overlay)

No new unit test (hooks/components are not unit-tested in this repo per convention); covered by Task 8 E2E + typecheck. Each step shows exact code.

- [ ] **Step 1: Import `playSound` in the socket hook**

In `src/hooks/usePartySocket.ts`, add to the top imports (after line 3):

```ts
import { playSound } from '../lib/sound';
```

- [ ] **Step 2: Add `celebrationNonce` state**

After line 12 (`const [shufflingPileIds, setShufflingPileIds] = ...`) add:

```ts
  const [celebrationNonce, setCelebrationNonce] = useState(0);
```

- [ ] **Step 3: Play the shuffle sound on `PILE_SHUFFLED` and handle `EFFECT`**

In the message handler, locate the `else if (event.type === 'PILE_SHUFFLED') {` branch (line 51). Add `playSound('shuffle');` as its first statement:

```ts
      } else if (event.type === 'PILE_SHUFFLED') {
        playSound('shuffle');
        const { pileId } = event;
```

Then, after that branch's closing `}` (after line 65, before the handler's final `}`), add an `EFFECT` branch:

```ts
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        }
      }
```

- [ ] **Step 4: Expose `celebrationNonce` from the hook**

Update the return statement (line 88):

```ts
  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce };
```

- [ ] **Step 5: Wire imports and hotkey in `App.tsx`**

In `src/App.tsx`, update imports (lines 1-6) to add the overlay, hotkey helpers, and `useCallback` is not needed — only add:

```ts
import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { getOrCreatePlayerId, saveDisplayName } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';
import { BoardDragLayer } from './components/BoardDragLayer';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { createDoubleKeyDetector, isEditableTarget } from './lib/celebrationHotkey';
```

- [ ] **Step 6: Destructure `celebrationNonce` and add the hotkey effect**

In `RoomView`, update the `usePartySocket` destructure (line 11) to include `celebrationNonce`:

```ts
  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce } = usePartySocket(
    roomId,
    joinState?.playerId ?? '',
    joinState?.displayName ?? '',
    { enabled: joinState !== null }
  );
```

Then, directly below the `handleJoin` function (after line 21), add the hotkey listener:

```ts
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'w' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);
```

- [ ] **Step 7: Render the overlay alongside the board**

Replace the `if (joinState && gameState) { return ( ... ); }` block (lines 23-35) so the board and overlay render together:

```tsx
  if (joinState && gameState) {
    return (
      <>
        <BoardDragLayer
          gameState={gameState}
          playerId={joinState.playerId}
          roomId={roomId}
          connected={connected}
          sendAction={sendAction}
          setDragging={setDragging}
          shufflingPileIds={shufflingPileIds}
        />
        <CelebrationOverlay nonce={celebrationNonce} />
      </>
    );
  }
```

- [ ] **Step 8: Verify typecheck and unit tests pass**

Run: `npm run typecheck && npx vitest run`
Expected: PASS (typecheck clean; all existing + new unit tests green).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/usePartySocket.ts src/App.tsx
git commit -m "feat: wire shuffle/deal sounds + w-w celebration trigger (999.23/999.43)"
```

---

## Task 7: Mute toggle UI in the menu popover

**Files:**
- Modify: `src/components/ControlsBar.tsx:1-7` (imports), `:16-20` (state), popover body (~line 83, after Copy link)

- [ ] **Step 1: Add icon imports and sound module import**

In `src/components/ControlsBar.tsx`, update the lucide import (line 2) and add the sound import (after line 7):

```ts
import { Menu, Copy, Check, Undo2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
```

After line 7 (`import { Separator } ...`):

```ts
import { getMuted, setMuted } from '@/lib/sound';
```

- [ ] **Step 2: Add muted state**

In the component body, after the `copied` state (line 20), add:

```ts
  const [muted, setMutedState] = useState(getMuted());

  function handleToggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }
```

- [ ] **Step 3: Add the mute row to the popover**

Inside the popover content, immediately after the Copy-link `<Button>` block and its following `<Separator />` (after line 85), insert:

```tsx
          {/* Sound toggle */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? (
              <><VolumeX className="mr-2 size-4" /> Sound off</>
            ) : (
              <><Volume2 className="mr-2 size-4" /> Sound on</>
            )}
          </Button>

          <Separator />
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ControlsBar.tsx
git commit -m "feat: add sound mute toggle to menu popover (999.23)"
```

---

## Task 8: Audio assets

**Files:**
- Create: `public/sounds/shuffle.mp3`, `public/sounds/deal.mp3`, `public/sounds/celebrate.mp3`

The code already references these via `${BASE_URL}sounds/<name>.mp3` and fails gracefully if a file is missing (`play().catch(...)`), so the app runs without them — but the feature is incomplete until real audio is present.

- [ ] **Step 1: Source three CC0 audio files**

Obtain CC0 / public-domain clips (e.g. from [freesound.org](https://freesound.org) filtered to CC0, or [Pixabay](https://pixabay.com/sound-effects/)):
- `shuffle.mp3` — a card riffle/shuffle (~0.5–1s).
- `deal.mp3` — cards being dealt (~0.5s).
- `celebrate.mp3` — a short cheer with firework pops underneath (~5s, to match the visual).

Place them in `public/sounds/` (create the directory). Keep each file small (target < ~50KB) for the free hosting tier.

- [ ] **Step 2: Verify they load in the dev app**

Start the stack (`npm run dev` + `npm run dev:client`), open the room, deal cards and press `w` twice. Confirm shuffle/deal/celebrate sounds play and that toggling Sound off in the menu silences them.

- [ ] **Step 3: Commit**

```bash
git add public/sounds/shuffle.mp3 public/sounds/deal.mp3 public/sounds/celebrate.mp3
git commit -m "feat: add CC0 shuffle/deal/celebrate audio assets (999.23/999.43)"
```

---

## Task 9: E2E — shared celebration + mute persistence

**Files:**
- Create: `playwright/celebration.spec.ts`

Follow the repo convention: **two `BrowserContext`s** for independent players (two pages in one context share `localStorage` and the player token). Reuse the existing `playwright/fixtures.ts` helpers where applicable.

- [ ] **Step 1: Inspect existing fixtures**

Read `playwright/fixtures.ts` and `playwright/game.spec.ts` to reuse the room-join / two-context setup (URL shape `?room=<id>&player=<token>`, join flow, `data-` selectors). Mirror that exact setup in the new spec.

- [ ] **Step 2: Write the E2E test**

Create `playwright/celebration.spec.ts`. Using the project's established two-context join helpers, implement:

```ts
import { test, expect } from '@playwright/test';
// Reuse the room/join helpers exactly as game.spec.ts does (import from fixtures or replicate its setup).

test('w-w celebration shows on both players screens and clears after ~5s', async ({ browser }) => {
  // 1. Create two independent BrowserContexts (player A and player B) joined to the same room.
  //    (Follow game.spec.ts: same room id, two contexts, complete the join/name flow for each.)
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  // ... join both pages to the same room (replicate game.spec.ts join steps) ...

  // 2. Player A presses 'w' twice quickly.
  await pageA.locator('body').click(); // ensure window focus, not an input
  await pageA.keyboard.press('w');
  await pageA.keyboard.press('w');

  // 3. The overlay appears for BOTH players (shared broadcast).
  await expect(pageA.getByTestId('celebration-overlay')).toBeVisible();
  await expect(pageB.getByTestId('celebration-overlay')).toBeVisible();

  // 4. It clears after the ~5s duration.
  await expect(pageB.getByTestId('celebration-overlay')).toHaveCount(0, { timeout: 7000 });

  await ctxA.close();
  await ctxB.close();
});

test('mute toggle persists across reload', async ({ page }) => {
  // Join a room (single page is fine here).
  // ... join via the game.spec.ts flow ...

  // Open the menu popover, click the Sound toggle to mute.
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /mute sounds/i }).click();

  // Reload, reopen the menu, and confirm it still reads "Sound off".
  await page.reload();
  // ... rejoin if the flow requires it ...
  await page.getByRole('button', { name: /open controls/i }).click();
  await expect(page.getByRole('button', { name: /unmute sounds/i })).toBeVisible();
});
```

> Note: fill in the join steps by copying `playwright/game.spec.ts` exactly — do not invent a new join flow. The assertions above (`data-testid="celebration-overlay"`, the `aria-label` toggling between "Mute sounds" / "Unmute sounds") match Tasks 5 and 7.

- [ ] **Step 3: Run the E2E suite**

Ensure both dev servers are running (`npm run dev` on :1999 and `npm run dev:client` on :5173), then:

Run: `npm run test:e2e -- celebration`
Expected: PASS (both tests). If the celebration test flakes under accumulated room load, apply the repo's known guards (scope selectors, wait for join completion) per the E2E flakiness memory.

- [ ] **Step 4: Commit**

```bash
git add playwright/celebration.spec.ts
git commit -m "test: e2e for shared celebration and mute persistence (999.23/999.43)"
```

---

## Task 10: Code review, validation, roadmap

**Files:**
- Modify: `.planning/ROADMAP.md`; `docs/superpowers/specs/2026-06-01-sound-and-celebration-design.md` (status)

- [ ] **Step 1: Run the full verification suite**

Run: `npm run typecheck && npx vitest run`
Then with both dev servers up: `npm run test:e2e`
Expected: all green.

- [ ] **Step 2: Code review**

Invoke the `requesting-code-review` (or `code-review`) skill on the branch diff, per the project convention ("Run a code review after every execution phase"). Address findings.

- [ ] **Step 3: Update the roadmap**

Record the shipped milestone for 999.23 and 999.43 in `.planning/ROADMAP.md` following the existing format, and mark the spec `Status: Shipped`.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin feat/sound-and-celebration
gh pr create --title "feat: sound effects & celebration easter egg (999.23/999.43)" --body "Implements shared shuffle/deal sounds with a persistent mute toggle, and a hidden w-w card-suit fireworks celebration. Spec: docs/superpowers/specs/2026-06-01-sound-and-celebration-design.md"
```

---

## Self-Review

**Spec coverage:**
- Shared `EFFECT` broadcast + `CELEBRATE` action → Tasks 1, 2. ✓
- Shuffle/deal sounds → Tasks 2 (deal effect), 6 (shuffle on PILE_SHUFFLED, deal on EFFECT). ✓
- Bundled CC0 audio in `public/sounds/` + graceful fallback → Tasks 3 (fallback), 8 (assets). ✓
- Mute in menu popover, localStorage persistence → Tasks 3 (storage), 7 (UI), 9 (persistence E2E). ✓
- `w-w` hotkey, input-suppressed, keyboard-only → Tasks 4, 6. ✓
- Card-suit multi-burst, ~12 bursts, ~5s, restart-on-retrigger → Task 5. ✓
- `prefers-reduced-motion` → Task 5 (CSS). ✓
- Celebrate sound → Tasks 6, 8. ✓
- No snapshot for CELEBRATE → Task 2 (test + impl). ✓
- Testing (node units + Playwright two-context) → Tasks 2,3,4,5,9. ✓

**Placeholder scan:** No "TBD/handle edge cases" placeholders. Task 8 (assets) and Task 9 (E2E join steps) reference external/existing material by necessity, with explicit pointers (CC0 sources; copy `game.spec.ts` join flow) — these are concrete instructions, not deferred work.

**Type consistency:** `SoundName` ("shuffle"|"deal"|"celebrate") used consistently across `sound.ts`, `usePartySocket`, `ControlsBar`. `EFFECT.kind` ("deal"|"celebrate") matches between types, server `broadcastEffect`, and the client handler. `celebrationNonce` named identically in the hook return and `App` destructure. `generateBursts`, `CELEBRATION_BURST_COUNT`, `CELEBRATION_DURATION_MS` consistent between `celebrationBursts.ts`, its test, and the overlay. `createDoubleKeyDetector`/`isEditableTarget` consistent between helper, test, and `App`.
