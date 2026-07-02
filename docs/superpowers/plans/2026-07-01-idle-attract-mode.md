# Idle Attract Mode (1017) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After 3 idle minutes, a Lottie critter emerges from behind the draw pile on every player's screen and performs a synced antic (peek-a-boo, nap, or house of cards), scurrying away on real input.

**Architecture:** The PartyKit server detects room-wide idle with a Durable Object storage alarm (survives hibernation; every action/connect re-arms it) and broadcasts `EFFECT kind:"attract"` with a server-chosen antic. The client renders a nonce-keyed, pointer-events-none overlay anchored to the first pile's DOM rect; a lazily-loaded Lottie blob plays inside CSS-keyframe choreography with DOM props (mini cards, z's).

**Tech Stack:** PartyKit storage alarms, lottie-web (light build, lazy-loaded), CSS keyframes, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-01-idle-attract-mode-design.md`

## Global Constraints

- No game state (`Pile`/`Card`/hands) is ever read or mutated by this feature beyond broadcasting — cosmetic overlay only.
- The overlay is `pointer-events: none`, `aria-hidden="true"`, `z-index: 9000` (below the 9999 celebration overlays).
- `prefers-reduced-motion: reduce` suppresses the entire feature (visual + sound) via one check at effect receipt.
- Failure of any asset (Lottie JSON, mp3) must silently no-op — an easter egg never surfaces an error state.
- Timing constants (use these exact values): `ATTRACT_IDLE_MS = 180_000`, `ATTRACT_REPEAT_MS = 300_000`, `ATTRACT_MIN_OVERRIDE_MS = 5_000`, perform durations `peekaboo: 16000`, `nap: 20000`, `houseOfCards: 22000`, leave `600`ms.
- Only new dependency allowed: `lottie-web` (runtime lazy-loaded, never in the main board bundle).
- Working branch: `worktree-feat+idle-attract-mode` in this worktree. Commit after every task; pre-commit hook runs `npm test` + `npm run typecheck`.
- Antic id strings are exactly `"peekaboo" | "nap" | "houseOfCards"` everywhere (server, client, CSS class suffixes, `data-antic`).

---

### Task 1: Shared types + attract sound registration

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/lib/sound.ts`
- Test: `tests/sound.test.ts` (append a describe block)
- Create (best-effort asset): `public/sounds/attract.mp3`

**Interfaces:**
- Produces: `AttractAntic` type, `ATTRACT_ANTICS` const, `EffectKind` including `"attract"`, `EFFECT` event with optional `antic?: AttractAntic`, `SoundName` including `"attract"`. All later tasks import these.

- [ ] **Step 1: Write the failing test**

Append to `tests/sound.test.ts` (inside the file, as a new top-level describe; the existing `beforeEach` stubs `Audio` as `MockAudio`):

```ts
describe("attract sound", () => {
  it("plays attract.mp3 for the attract sound", () => {
    playSound("attract");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(/sounds\/attract\.mp3$/);
    expect(MockAudio.instances[0].play).toHaveBeenCalled();
  });

  it("does not preload attract.mp3 (it fires minutes into a session)", () => {
    preloadSounds();
    expect(MockAudio.instances.some(a => a.src.includes("attract"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sound.test.ts`
Expected: FAIL — TypeScript/type error or runtime failure because `"attract"` is not a `SoundName`.

- [ ] **Step 3: Implement types and sound registration**

In `src/shared/types.ts`, replace the `EffectKind` line and add the antic type next to it:

```ts
export type EffectKind = "deal" | "celebrate" | "chip-bet" | "chip-collect" | "rickroll" | "tableflip" | "jeer" | "konami" | "attract";

export type AttractAntic = "peekaboo" | "nap" | "houseOfCards";
export const ATTRACT_ANTICS: readonly AttractAntic[] = ["peekaboo", "nap", "houseOfCards"];
```

In the `ServerEvent` union, replace the `EFFECT` member:

```ts
  | { type: "EFFECT"; kind: EffectKind; antic?: AttractAntic }
```

In `src/lib/sound.ts`, extend `SoundName` and `VARIANT_COUNTS`:

```ts
export type SoundName = "shuffle" | "shuffle-flourish" | "deal" | "celebrate" | "chip-bet" | "chip-collect" | "jeer" | "attract";
```

```ts
const VARIANT_COUNTS: Record<SoundName, number> = {
  shuffle: 1,
  "shuffle-flourish": 1,
  deal: 1,
  celebrate: CELEBRATE_VARIANT_COUNT,
  "chip-bet": 1,
  "chip-collect": 1,
  jeer: 1,
  attract: 1,
};
```

Do NOT add `attract.mp3` to `preloadSounds()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/sound.test.ts` — Expected: PASS.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 5: Generate the sound asset (best-effort)**

A soft, quiet, rising "huh?"-style chirp, ~0.4s. If `which ffmpeg` finds ffmpeg, generate it:

```bash
ffmpeg -y -f lavfi -i "aevalsrc=0.10*sin(2*PI*t*(320+260*t)):d=0.40:s=44100" \
  -af "afade=t=in:d=0.06,afade=t=out:st=0.24:d=0.16" \
  -codec:a libmp3lame -q:a 6 public/sounds/attract.mp3
```

Listen check is impossible headlessly — verify the file exists and is >1KB: `ls -la public/sounds/attract.mp3`. If ffmpeg is unavailable or fails, SKIP this step and note it in the task report: `playSound` fails silently on the missing file (jeer shipped the same way), and the user can drop in a CC0 asset later.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/lib/sound.ts tests/sound.test.ts public/sounds/attract.mp3
git commit -m "Add attract effect kind, antic type, and attract sound registration"
```

(Omit the mp3 from `git add` if Step 5 was skipped.)

---

### Task 2: Server idle alarm + attract broadcast

**Files:**
- Modify: `party/index.ts`
- Modify: `tests/helpers.ts` (add alarm mocks to `makeMockRoom`)
- Test: `tests/attractAlarm.test.ts` (create)

**Interfaces:**
- Consumes: `AttractAntic`, `ATTRACT_ANTICS`, `EffectKind` from Task 1.
- Produces: exported from `party/index.ts` — `pickAttractAntic(previous: AttractAntic | undefined, rand: number): AttractAntic`, `ATTRACT_IDLE_MS = 180_000`, `ATTRACT_REPEAT_MS = 300_000`, `ATTRACT_MIN_OVERRIDE_MS = 5_000`. Server behavior: `EFFECT { kind:"attract", antic }` broadcast on alarm; alarm re-armed on every `onMessage`/`onConnect`.

- [ ] **Step 1: Add alarm mocks to the shared test helper**

In `tests/helpers.ts`, replace the `storage` object inside `makeMockRoom`:

```ts
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    setAlarm: vi.fn().mockResolvedValue(undefined),
    getAlarm: vi.fn().mockResolvedValue(null),
    deleteAlarm: vi.fn().mockResolvedValue(undefined),
  };
```

- [ ] **Step 2: Write the failing tests**

Create `tests/attractAlarm.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoom, { pickAttractAntic, ATTRACT_IDLE_MS, ATTRACT_REPEAT_MS, ATTRACT_MIN_OVERRIDE_MS } from "../party/index";
import { ATTRACT_ANTICS } from "../src/shared/types";
import type { AttractAntic, ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection } from "./helpers";

const NOW = 1_000_000;

function attractEffectsOf(conn: ReturnType<typeof makeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is { type: "EFFECT"; kind: "attract"; antic: AttractAntic } => e.type === "EFFECT" && e.kind === "attract");
}

function addPlayer(gr: GameRoom, id: string) {
  gr.gameState.players.push({ id, connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
  gr.gameState.hands[id] = [];
}

beforeEach(() => { vi.useFakeTimers({ now: NOW }); });
afterEach(() => { vi.useRealTimers(); });

describe("pickAttractAntic", () => {
  it("picks across the full antic list when there is no previous antic", () => {
    expect(pickAttractAntic(undefined, 0)).toBe(ATTRACT_ANTICS[0]);
    expect(pickAttractAntic(undefined, 0.999)).toBe(ATTRACT_ANTICS[ATTRACT_ANTICS.length - 1]);
  });

  it("never returns the previous antic", () => {
    for (const prev of ATTRACT_ANTICS) {
      for (const r of [0, 0.5, 0.999]) {
        expect(pickAttractAntic(prev, r)).not.toBe(prev);
      }
    }
  });
});

describe("idle attract alarm", () => {
  it("re-arms the idle alarm on every message", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);
    addPlayer(gr, "p1");

    await gr.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_IDLE_MS);
  });

  it("arms the idle alarm on connect", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);

    await gr.onConnect(conn, { request: { url: "https://test.local/party/room?player=p1" } } as never);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_IDLE_MS);
  });

  it("honors and clamps the attractIdleMs connection override", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);

    await gr.onConnect(conn, { request: { url: "https://test.local/party/room?player=p1&attractIdleMs=1" } } as never);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_MIN_OVERRIDE_MS);
    expect(room.storage.put).toHaveBeenCalledWith("attractIdleMsOverride", ATTRACT_MIN_OVERRIDE_MS);
  });

  it("onAlarm broadcasts the same attract antic to every connection and re-arms with the repeat delay", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = makeMockRoom([conn1, conn2]);
    const gr = new GameRoom(room);

    await gr.onAlarm();

    const e1 = attractEffectsOf(conn1);
    const e2 = attractEffectsOf(conn2);
    expect(e1).toHaveLength(1);
    expect(e2).toHaveLength(1);
    expect(ATTRACT_ANTICS).toContain(e1[0].antic);
    expect(e1[0].antic).toBe(e2[0].antic);
    expect(room.storage.put).toHaveBeenCalledWith("lastAttractAntic", e1[0].antic);
    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_REPEAT_MS);
  });

  it("onAlarm in an empty room neither broadcasts nor re-arms", async () => {
    const room = makeMockRoom([]);
    const gr = new GameRoom(room);

    await gr.onAlarm();

    expect(room.storage.setAlarm).not.toHaveBeenCalled();
    expect(room.storage.put).not.toHaveBeenCalledWith("lastAttractAntic", expect.anything());
  });

  it("onAlarm never repeats the stored previous antic", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "lastAttractAntic" ? "nap" : undefined)
    );
    const gr = new GameRoom(room);

    for (let i = 0; i < 10; i++) {
      await gr.onAlarm();
    }

    for (const effect of attractEffectsOf(conn)) {
      expect(effect.antic).not.toBe("nap");
    }
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/attractAlarm.test.ts`
Expected: FAIL — `pickAttractAntic` is not exported / `onAlarm` does not exist.

- [ ] **Step 4: Implement the server changes**

In `party/index.ts`:

**(a)** Extend the shared-types import at the top of the file to also include `AttractAntic` and `ATTRACT_ANTICS` (it already imports `EffectKind` and others — add to that import statement, importing `ATTRACT_ANTICS` as a value).

**(b)** Add exported constants and the pure picker above the `GameRoom` class:

```ts
export const ATTRACT_IDLE_MS = 180_000;
export const ATTRACT_REPEAT_MS = 300_000;
export const ATTRACT_MIN_OVERRIDE_MS = 5_000;

export function pickAttractAntic(previous: AttractAntic | undefined, rand: number): AttractAntic {
  const candidates = ATTRACT_ANTICS.filter(a => a !== previous);
  return candidates[Math.min(candidates.length - 1, Math.floor(rand * candidates.length))];
}
```

**(c)** Add a field to `GameRoom` (next to `gameState`):

```ts
  attractIdleMsOverride: number | null = null;
```

**(d)** At the end of `onStart()`, load the persisted override:

```ts
    this.attractIdleMsOverride =
      (await this.room.storage.get<number>("attractIdleMsOverride")) ?? null;
```

**(e)** In `onConnect`, right before the `await this.persist();` line, parse the override and arm the alarm:

```ts
    const attractParam = url.searchParams.get("attractIdleMs");
    if (attractParam !== null) {
      const parsed = Number(attractParam);
      if (Number.isFinite(parsed)) {
        this.attractIdleMsOverride = Math.max(ATTRACT_MIN_OVERRIDE_MS, Math.floor(parsed));
        await this.room.storage.put("attractIdleMsOverride", this.attractIdleMsOverride);
      }
    }
    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_IDLE_MS);
```

**(f)** In `onMessage`, immediately before the trailing `await this.persist();`, add:

```ts
    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_IDLE_MS);
```

(Any parsed message — including CELEBRATE and PING — counts as activity; a storage write per action is fine at 2–4 players.)

**(g)** Add `onAlarm` and the arm helper as class methods (near `onClose`):

```ts
  // Room-wide idle: fires only when no message has re-armed the alarm for the
  // full idle window. Empty rooms stop the cycle; the next onConnect restarts it.
  async onAlarm() {
    const connections = [...this.room.getConnections()];
    if (connections.length === 0) return;
    const previous = await this.room.storage.get<AttractAntic>("lastAttractAntic");
    const antic = pickAttractAntic(previous, Math.random());
    await this.room.storage.put("lastAttractAntic", antic);
    this.broadcastEffect("attract", antic);
    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_REPEAT_MS);
  }

  private async armAttractAlarm(delayMs: number) {
    await this.room.storage.setAlarm(Date.now() + delayMs);
  }
```

**(h)** Extend `broadcastEffect` to carry the antic:

```ts
  private broadcastEffect(kind: EffectKind, antic?: AttractAntic) {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "EFFECT",
        kind,
        ...(antic !== undefined ? { antic } : {}),
      } satisfies ServerEvent));
    }
  }
```

- [ ] **Step 5: Run the new tests, then the full unit suite**

Run: `npx vitest run tests/attractAlarm.test.ts` — Expected: PASS.
Run: `npm test` — Expected: ALL PASS. If any pre-existing test fails with `storage.setAlarm is not a function`, that test builds its own mock room without `makeMockRoom`; add the same `setAlarm`/`getAlarm`/`deleteAlarm` stubs to that test's mock.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add party/index.ts tests/helpers.ts tests/attractAlarm.test.ts
git commit -m "Add server idle alarm that broadcasts a synced attract antic"
```

---

### Task 3: Client hook — attract state, dismissal, sound, query forward

**Files:**
- Modify: `src/hooks/usePartySocket.ts`
- Test: `tests/usePartySocketAttract.test.ts` (create)

**Interfaces:**
- Consumes: `AttractAntic` from Task 1; `EFFECT { kind:"attract", antic }` and `attractIdleMs` query support from Task 2.
- Produces: hook returns `attract: AttractState | null`, `dismissAttract(): void`, `clearAttract(): void`; exported type `AttractState = { antic: AttractAntic; nonce: number; leaving: boolean }`. Task 5's overlay consumes all three.

Client-hook unit tests in this repo are source-regex tests via `?raw` imports (see `tests/usePartySocketEffects.test.ts`) — follow that convention.

- [ ] **Step 1: Write the failing tests**

Create `tests/usePartySocketAttract.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import src from "../src/hooks/usePartySocket.ts?raw";

describe("usePartySocket attract handling", () => {
  it("exports the AttractState type", () => {
    expect(src).toMatch(/export type AttractState = \{ antic: AttractAntic; nonce: number; leaving: boolean \}/);
  });

  it("sets attract state and plays the sound on kind 'attract'", () => {
    expect(src).toMatch(/kind === 'attract'[\s\S]{0,400}playSound\('attract'\)/);
    expect(src).toMatch(/kind === 'attract'[\s\S]{0,400}setAttract/);
  });

  it("suppresses the whole effect under prefers-reduced-motion", () => {
    expect(src).toMatch(/prefers-reduced-motion/);
  });

  it("flips leaving on any STATE_UPDATE while attract is active", () => {
    expect(src).toMatch(/type === 'STATE_UPDATE'\)[\s\S]{0,300}leaving: true/);
  });

  it("exposes dismissAttract and clearAttract callbacks", () => {
    expect(src).toMatch(/const dismissAttract = useCallback/);
    expect(src).toMatch(/const clearAttract = useCallback/);
    expect(src).toMatch(/return\s*\{[\s\S]*attract[\s\S]*dismissAttract[\s\S]*clearAttract[\s\S]*\}/);
  });

  it("forwards the attractIdleMs URL param to the PartyKit connection query", () => {
    expect(src).toMatch(/attractIdleMs/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/usePartySocketAttract.test.ts`
Expected: FAIL on every assertion.

- [ ] **Step 3: Implement the hook changes**

In `src/hooks/usePartySocket.ts`:

**(a)** Add `AttractAntic` to the shared-types type import, and export the state type below the imports:

```ts
export type AttractState = { antic: AttractAntic; nonce: number; leaving: boolean };
```

**(b)** Add state + refs next to the other effect nonces:

```ts
  const [attract, setAttract] = useState<AttractState | null>(null);
  const attractNonceRef = useRef(0);
```

**(c)** In the `STATE_UPDATE` branch, before the drag-buffer logic, add:

```ts
        // Any state change means someone acted — the critter flees on every screen.
        setAttract(prev => (prev && !prev.leaving ? { ...prev, leaving: true } : prev));
```

**(d)** In the `EFFECT` handler, add a branch after `konami`:

```ts
        } else if (event.kind === 'attract') {
          const reducedMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (event.antic && !reducedMotion) {
            playSound('attract');
            setAttract({ antic: event.antic, nonce: ++attractNonceRef.current, leaving: false });
          }
        }
```

**(e)** Forward the e2e/test idle override to the server. In the connection `useEffect`, before `new PartySocket(...)`:

```ts
    const attractIdleMs = new URLSearchParams(window.location.search).get('attractIdleMs');
```

and extend the query object:

```ts
      query: { player: playerId, name: displayNameRef.current, ...(attractIdleMs ? { attractIdleMs } : {}) },
```

**(f)** Add the callbacks next to `setDragging` and extend the return object:

```ts
  const dismissAttract = useCallback(() => {
    setAttract(prev => (prev && !prev.leaving ? { ...prev, leaving: true } : prev));
  }, []);

  const clearAttract = useCallback(() => setAttract(null), []);
```

Return: add `attract, dismissAttract, clearAttract` to the returned object.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/usePartySocketAttract.test.ts tests/usePartySocketEffects.test.ts` — Expected: PASS (both — the regexes in the older file must not have broken).
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePartySocket.ts tests/usePartySocketAttract.test.ts
git commit -m "Track attract effect state with local and shared dismissal in usePartySocket"
```

---

### Task 4: Lottie runtime + critter asset + loader

**Files:**
- Modify: `package.json` (add `lottie-web`)
- Create: `src/types/lottie-light.d.ts`
- Create: `src/assets/critter.json`
- Create: `src/lib/critterLottie.ts`
- Test: `tests/critterLottie.test.ts` (create)

**Interfaces:**
- Produces: `loadCritter(container: HTMLElement, speed: number): Promise<AnimationItem | null>` from `src/lib/critterLottie.ts`. Task 5's overlay consumes it.

The critter art is a hand-authored bodymovin JSON (license-free, fully code-owned): a round purple blob that bobs gently and blinks. **Deliberate deviation from the spec's "stock LottieFiles asset":** sourcing a license-verified stock file cannot be done deterministically in this pipeline; the JSON below is a drop-in-replaceable placeholder with the exact same integration API, flagged for the user at review.

- [ ] **Step 1: Install the dependency**

Run: `npm install lottie-web`
Expected: `lottie-web` appears in `package.json` dependencies (~5.x).

- [ ] **Step 2: Write the failing test**

Create `tests/critterLottie.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import src from "../src/lib/critterLottie.ts?raw";

describe("critterLottie loader", () => {
  it("lazy-loads the light lottie build and the critter art via dynamic import", () => {
    expect(src).toMatch(/import\('lottie-web\/build\/player\/lottie_light'\)/);
    expect(src).toMatch(/import\('\.\.\/assets\/critter\.json'\)/);
  });

  it("returns null on any failure instead of throwing", () => {
    expect(src).toMatch(/catch[\s\S]{0,60}return null/);
  });

  it("applies the requested playback speed", () => {
    expect(src).toMatch(/setSpeed\(speed\)/);
  });
});

describe("critter art asset", () => {
  it("is valid bodymovin JSON with layers", async () => {
    const art = (await import("../src/assets/critter.json")).default as { v: string; layers: unknown[]; op: number };
    expect(art.v).toBeTruthy();
    expect(Array.isArray(art.layers)).toBe(true);
    expect(art.layers.length).toBeGreaterThanOrEqual(3);
    expect(art.op).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/critterLottie.test.ts`
Expected: FAIL — files do not exist.

- [ ] **Step 4: Create the module declaration**

Create `src/types/lottie-light.d.ts`:

```ts
declare module 'lottie-web/build/player/lottie_light' {
  import lottie from 'lottie-web';
  export default lottie;
}
```

- [ ] **Step 5: Create the critter art**

Create `src/assets/critter.json` — a 120×120, 60fps, 150-frame (2.5s) loop: purple blob body bobbing ±4px, two dark eyes (parented to the body) that blink once per loop around frames 96–108:

```json
{
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 150,
  "w": 120,
  "h": 120,
  "nm": "critter",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "eye-left",
      "parent": 3,
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [-16, -10, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 0, "s": [100, 100, 100] },
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 96, "s": [100, 100, 100] },
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 102, "s": [100, 8, 100] },
            { "t": 108, "s": [100, 100, 100] }
          ]
        }
      },
      "shapes": [
        {
          "ty": "gr",
          "it": [
            { "ty": "el", "p": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [10, 16] } },
            { "ty": "fl", "c": { "a": 0, "k": [0.13, 0.12, 0.2, 1] }, "o": { "a": 0, "k": 100 } },
            { "ty": "tr", "p": { "a": 0, "k": [0, 0] }, "a": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [100, 100] }, "r": { "a": 0, "k": 0 }, "o": { "a": 0, "k": 100 } }
          ]
        }
      ],
      "ip": 0,
      "op": 150,
      "st": 0
    },
    {
      "ddd": 0,
      "ind": 2,
      "ty": 4,
      "nm": "eye-right",
      "parent": 3,
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [16, -10, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 0, "s": [100, 100, 100] },
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 96, "s": [100, 100, 100] },
            { "i": { "x": [0.6, 0.6, 0.6], "y": [1, 1, 1] }, "o": { "x": [0.4, 0.4, 0.4], "y": [0, 0, 0] }, "t": 102, "s": [100, 8, 100] },
            { "t": 108, "s": [100, 100, 100] }
          ]
        }
      },
      "shapes": [
        {
          "ty": "gr",
          "it": [
            { "ty": "el", "p": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [10, 16] } },
            { "ty": "fl", "c": { "a": 0, "k": [0.13, 0.12, 0.2, 1] }, "o": { "a": 0, "k": 100 } },
            { "ty": "tr", "p": { "a": 0, "k": [0, 0] }, "a": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [100, 100] }, "r": { "a": 0, "k": 0 }, "o": { "a": 0, "k": 100 } }
          ]
        }
      ],
      "ip": 0,
      "op": 150,
      "st": 0
    },
    {
      "ddd": 0,
      "ind": 3,
      "ty": 4,
      "nm": "body",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 0, "k": 0 },
        "p": {
          "a": 1,
          "k": [
            { "i": { "x": 0.5, "y": 0.5 }, "o": { "x": 0.5, "y": 0.5 }, "t": 0, "s": [60, 74, 0], "to": [0, -1.33, 0], "ti": [0, 0, 0] },
            { "i": { "x": 0.5, "y": 0.5 }, "o": { "x": 0.5, "y": 0.5 }, "t": 75, "s": [60, 66, 0], "to": [0, 0, 0], "ti": [0, -1.33, 0] },
            { "t": 150, "s": [60, 74, 0] }
          ]
        },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": { "a": 0, "k": [100, 100, 100] }
      },
      "shapes": [
        {
          "ty": "gr",
          "it": [
            { "ty": "el", "p": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [88, 76] } },
            { "ty": "fl", "c": { "a": 0, "k": [0.545, 0.361, 0.965, 1] }, "o": { "a": 0, "k": 100 } },
            { "ty": "tr", "p": { "a": 0, "k": [0, 0] }, "a": { "a": 0, "k": [0, 0] }, "s": { "a": 0, "k": [100, 100] }, "r": { "a": 0, "k": 0 }, "o": { "a": 0, "k": 100 } }
          ]
        }
      ],
      "ip": 0,
      "op": 150,
      "st": 0
    }
  ]
}
```

- [ ] **Step 6: Create the loader**

Create `src/lib/critterLottie.ts`:

```ts
import type { AnimationItem } from 'lottie-web';

// Lazy-loads the Lottie runtime + critter art only when an attract fires,
// keeping both out of the main board bundle. Returns null on any failure —
// the attract easter egg must never surface an error state.
export async function loadCritter(container: HTMLElement, speed: number): Promise<AnimationItem | null> {
  try {
    const [{ default: lottie }, { default: animationData }] = await Promise.all([
      import('lottie-web/build/player/lottie_light'),
      import('../assets/critter.json'),
    ]);
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    anim.setSpeed(speed);
    return anim;
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/critterLottie.test.ts` — Expected: PASS.
Run: `npm run typecheck` — Expected: clean (the `.d.ts` covers the light-build import).
Run: `npm run build` — Expected: succeeds, and the output shows `lottie` in a separate lazy chunk, not in the main `index-*.js`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/types/lottie-light.d.ts src/assets/critter.json src/lib/critterLottie.ts tests/critterLottie.test.ts
git commit -m "Add lazy-loaded Lottie critter asset and loader"
```

---

### Task 5: AttractOverlay component, choreography CSS, anchor, App wiring

**Files:**
- Create: `src/components/AttractOverlay.tsx`
- Modify: `src/globals.css` (append keyframes)
- Modify: `src/components/PileZone.tsx` (anchor attribute)
- Modify: `src/App.tsx` (destructure + mount)
- Test: `tests/attractOverlay.test.ts` (create)

**Interfaces:**
- Consumes: `AttractState` from Task 3, `loadCritter` from Task 4, `AttractAntic` from Task 1.
- Produces: `<AttractOverlay attract={AttractState | null} onLocalDismiss={() => void} onExited={() => void} />`; DOM contract for e2e: `data-testid="attract-overlay"`, `data-antic="<antic>"`.

- [ ] **Step 1: Write the failing tests**

Create `tests/attractOverlay.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import overlaySrc from "../src/components/AttractOverlay.tsx?raw";
import pileZoneSrc from "../src/components/PileZone.tsx?raw";
import appSrc from "../src/App.tsx?raw";

describe("AttractOverlay", () => {
  it("exposes testid and antic attributes for e2e", () => {
    expect(overlaySrc).toMatch(/data-testid="attract-overlay"/);
    expect(overlaySrc).toMatch(/data-antic=\{antic\}/);
  });

  it("anchors to the pile via the data-attract-anchor hook and skips the fire when absent", () => {
    expect(overlaySrc).toMatch(/querySelector\('\[data-attract-anchor\]'\)/);
    expect(overlaySrc).toMatch(/if \(!el\) \{ onExited\(\); return; \}/);
  });

  it("dismisses on real input only — pointerdown, keydown, wheel, never mousemove", () => {
    for (const evt of ["pointerdown", "keydown", "wheel"]) {
      expect(overlaySrc).toMatch(new RegExp(`addEventListener\\('${evt}'`));
    }
    expect(overlaySrc).not.toMatch(/mousemove/);
  });

  it("is a non-interactive cosmetic overlay below the celebration layers", () => {
    expect(overlaySrc).toMatch(/pointerEvents: 'none'/);
    expect(overlaySrc).toMatch(/zIndex: 9000/);
    expect(overlaySrc).toMatch(/aria-hidden="true"/);
  });

  it("defines per-antic performance durations and a scurry exit", () => {
    expect(overlaySrc).toMatch(/peekaboo: 16000/);
    expect(overlaySrc).toMatch(/nap: 20000/);
    expect(overlaySrc).toMatch(/houseOfCards: 22000/);
    expect(overlaySrc).toMatch(/ATTRACT_LEAVE_MS = 600/);
  });

  it("slows the lottie loop for the nap antic", () => {
    expect(overlaySrc).toMatch(/antic === 'nap' \? 0\.4 : 1/);
  });
});

describe("attract wiring", () => {
  it("PileZone renders the anchor attribute", () => {
    expect(pileZoneSrc).toMatch(/data-attract-anchor/);
  });

  it("App mounts the overlay with hook callbacks", () => {
    expect(appSrc).toMatch(/<AttractOverlay attract=\{attract\} onLocalDismiss=\{dismissAttract\} onExited=\{clearAttract\} \/>/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/attractOverlay.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

Create `src/components/AttractOverlay.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { AttractAntic } from '@/shared/types';
import type { AttractState } from '@/hooks/usePartySocket';
import { loadCritter } from '@/lib/critterLottie';

export const ATTRACT_PERFORM_MS: Record<AttractAntic, number> = {
  peekaboo: 16000,
  nap: 20000,
  houseOfCards: 22000,
};
export const ATTRACT_LEAVE_MS = 600;

const CRITTER_SIZE = 72;

// Two-story card house built beside the pile; delays land one card at a time.
const HOUSE_CARDS: { left: number; bottom: number; rot: number; delayMs: number }[] = [
  { left: 0, bottom: 0, rot: -14, delayMs: 3000 },
  { left: 20, bottom: 0, rot: 14, delayMs: 4400 },
  { left: 40, bottom: 0, rot: -14, delayMs: 5800 },
  { left: 60, bottom: 0, rot: 14, delayMs: 7200 },
  { left: 8, bottom: 30, rot: 90, delayMs: 8800 },
  { left: 48, bottom: 30, rot: 90, delayMs: 10200 },
  { left: 20, bottom: 34, rot: -14, delayMs: 11800 },
  { left: 40, bottom: 34, rot: 14, delayMs: 13200 },
  { left: 30, bottom: 64, rot: 90, delayMs: 15000 },
];

interface AttractOverlayProps {
  attract: AttractState | null;
  onLocalDismiss: () => void;
  onExited: () => void;
}

export function AttractOverlay({ attract, onLocalDismiss, onExited }: AttractOverlayProps) {
  const critterRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const active = attract !== null;
  const nonce = attract?.nonce ?? 0;
  const antic = attract?.antic ?? null;
  const leaving = attract?.leaving ?? false;

  // Measure the pile anchor once per performance; skip the fire if no pile is on screen.
  useEffect(() => {
    if (!active) { setAnchor(null); return; }
    const el = document.querySelector('[data-attract-anchor]');
    if (!el) { onExited(); return; }
    setAnchor(el.getBoundingClientRect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nonce]);

  // Startle on real input only. Mouse movement never scares it off, so a
  // returning player can watch the performance.
  useEffect(() => {
    if (!active || leaving) return;
    const startle = () => onLocalDismiss();
    window.addEventListener('pointerdown', startle);
    window.addEventListener('keydown', startle);
    window.addEventListener('wheel', startle);
    return () => {
      window.removeEventListener('pointerdown', startle);
      window.removeEventListener('keydown', startle);
      window.removeEventListener('wheel', startle);
    };
  }, [active, leaving, onLocalDismiss]);

  // Natural end of the performance (the retreat is baked into each antic's keyframes).
  useEffect(() => {
    if (!active || !antic || leaving) return;
    const t = setTimeout(onExited, ATTRACT_PERFORM_MS[antic]);
    return () => clearTimeout(t);
  }, [active, antic, nonce, leaving, onExited]);

  // Startled: play the scurry exit, then unmount.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onExited, ATTRACT_LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving, onExited]);

  // Lazy-load the Lottie critter; loadCritter resolves null on failure (silent no-op).
  useEffect(() => {
    if (!anchor || !antic || !critterRef.current) return;
    let cancelled = false;
    void loadCritter(critterRef.current, antic === 'nap' ? 0.4 : 1).then((anim) => {
      if (cancelled) { anim?.destroy(); return; }
      animRef.current = anim;
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, antic, nonce]);

  if (!active || !antic || !anchor) return null;

  const base = import.meta.env.BASE_URL || '/';
  const clipTop = Math.max(0, anchor.top - CRITTER_SIZE);

  return (
    <div
      aria-hidden="true"
      data-testid="attract-overlay"
      data-antic={antic}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000, overflow: 'hidden' }}
    >
      {/* Clip window above the pile: the critter translates up into it, appearing from behind the pile. */}
      <div style={{ position: 'absolute', left: anchor.left, top: clipTop, width: anchor.width, height: CRITTER_SIZE, overflow: 'hidden' }}>
        <div
          ref={critterRef}
          className={`attract-critter attract-${antic}${leaving ? ' attract-scurry' : ''}`}
          style={{ position: 'absolute', bottom: 0, left: '10%', width: CRITTER_SIZE, height: CRITTER_SIZE }}
        />
      </div>
      {antic === 'nap' && !leaving && (
        <div style={{ position: 'absolute', left: anchor.left + anchor.width * 0.55, top: clipTop, width: 40, height: CRITTER_SIZE }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="attract-zzz" style={{ animationDelay: `${i * 0.9}s` }}>z</span>
          ))}
        </div>
      )}
      {antic === 'houseOfCards' && (
        <div
          className={leaving ? 'attract-leaving' : undefined}
          style={{ position: 'absolute', left: anchor.right + 10, top: anchor.bottom - 100, width: 100, height: 100 }}
        >
          {HOUSE_CARDS.map((c, i) => (
            <img
              key={i}
              src={`${base}cards/jumbo/back.svg`}
              alt=""
              className="attract-house-card"
              style={{ left: c.left, bottom: c.bottom, ['--card-rot' as string]: `${c.rot}deg`, animationDelay: `${c.delayMs}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Append the choreography CSS**

Append to `src/globals.css`:

```css
/* Idle attract mode (1017) — critter choreography */
.attract-critter {
  will-change: transform;
  transform: translateY(105%);
}
.attract-peekaboo {
  animation: attract-peekaboo 16s ease-in-out forwards;
}
@keyframes attract-peekaboo {
  0%   { transform: translateX(0) translateY(105%); }
  5%   { transform: translateX(0) translateY(26%); }
  8%   { transform: translateX(0) translateY(32%); }
  30%  { transform: translateX(0) translateY(28%); }
  35%  { transform: translateX(0) translateY(105%); }
  47%  { transform: translateX(0) translateY(105%); }
  48%  { transform: translateX(70%) translateY(105%); }
  54%  { transform: translateX(70%) translateY(22%); }
  57%  { transform: translateX(70%) translateY(30%); }
  88%  { transform: translateX(70%) translateY(26%); }
  95%  { transform: translateX(70%) translateY(105%); }
  100% { transform: translateX(70%) translateY(105%); }
}
.attract-nap {
  animation: attract-nap 20s ease-in-out forwards;
}
@keyframes attract-nap {
  0%   { transform: translateY(105%); }
  6%   { transform: translateY(30%); }
  10%  { transform: translateY(42%); }
  92%  { transform: translateY(42%); }
  100% { transform: translateY(105%); }
}
.attract-houseOfCards {
  animation: attract-house 22s ease-in-out forwards;
}
@keyframes attract-house {
  0%   { transform: translateY(105%); }
  5%   { transform: translateY(26%); }
  93%  { transform: translateY(26%); }
  100% { transform: translateY(105%); }
}
.attract-scurry {
  animation: attract-scurry 0.6s ease-in forwards !important;
}
@keyframes attract-scurry {
  0%   { transform: translateY(26%); }
  25%  { transform: translateY(18%) rotate(-6deg); }
  100% { transform: translateY(110%); }
}
.attract-zzz {
  position: absolute;
  bottom: 10px;
  left: 0;
  font-size: 14px;
  font-weight: 700;
  color: rgba(148, 163, 184, 0.9);
  opacity: 0;
  animation: attract-zzz 2.7s ease-out infinite;
}
@keyframes attract-zzz {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.7); }
  25%  { opacity: 0.9; }
  100% { opacity: 0; transform: translate(12px, -26px) scale(1.2); }
}
.attract-house-card {
  position: absolute;
  width: 22px;
  height: 31px;
  opacity: 0;
  animation: attract-card-pop 0.5s ease-out both;
}
@keyframes attract-card-pop {
  from { opacity: 0; transform: translateY(10px) scale(0.6) rotate(var(--card-rot)); }
  to   { opacity: 1; transform: translateY(0) scale(1) rotate(var(--card-rot)); }
}
.attract-leaving .attract-house-card {
  animation: attract-card-tumble 0.6s ease-in both;
}
@keyframes attract-card-tumble {
  from { opacity: 1; transform: translateY(0) rotate(var(--card-rot)); }
  to   { opacity: 0; transform: translateY(30px) rotate(calc(var(--card-rot) + 70deg)); }
}
```

(Known accepted quirk: on a startle mid-build, not-yet-placed house cards briefly flash before tumbling — it reads as the whole stack scattering. The scurry animation also restarts from its own first keyframe, causing a small position snap; both are acceptable v1 polish trade-offs, noted for a follow-up.)

- [ ] **Step 5: Add the anchor to PileZone**

In `src/components/PileZone.tsx`, add `data-attract-anchor=""` to the root `<div>` of the component (the one receiving `ref={setNodeRef}`). Every pile carries it; the overlay's `querySelector` picks the first in DOM order (the top pile in the left column).

- [ ] **Step 6: Wire into App**

In `src/App.tsx`:

- Add to imports: `import { AttractOverlay } from './components/AttractOverlay';`
- Extend the `usePartySocket` destructuring with `attract, dismissAttract, clearAttract`.
- In the connected render block, after `<KonamiBanner active={konamiActive} />`, add:

```tsx
        <AttractOverlay attract={attract} onLocalDismiss={dismissAttract} onExited={clearAttract} />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/attractOverlay.test.ts` — Expected: PASS.
Run: `npm test` — Expected: ALL PASS (PileZone regex tests in `pileZonePolish.test.ts` must not have broken).
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/AttractOverlay.tsx src/globals.css src/components/PileZone.tsx src/App.tsx tests/attractOverlay.test.ts
git commit -m "Render the attract critter overlay with three antic choreographies"
```

---

### Task 6: Playwright e2e

**Files:**
- Test: `playwright/attractMode.spec.ts` (create)

**Interfaces:**
- Consumes: `attractIdleMs` query override (Tasks 2+3), `data-testid="attract-overlay"` / `data-antic` (Task 5), `aria-label="Shuffle pile"` button in `PileZone`.

Note: other spec files' rooms are unaffected by attract fires — active tests re-arm constantly, and an empty room's alarm no-ops without re-arming.

- [ ] **Step 1: Write the e2e spec**

Create `playwright/attractMode.spec.ts` (this spec needs its own join helper because the room URL must carry `attractIdleMs`; the shared fixture in `playwright/fixtures.ts` does not):

```ts
import { test as base, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

const ATTRACT_TEST_IDLE_MS = 8000;
const ANTICS = ['peekaboo', 'nap', 'houseOfCards'];

async function joinGame(page: Page, roomCode: string, playerName: string) {
  await page.goto(`/?room=${roomCode}&attractIdleMs=${ATTRACT_TEST_IDLE_MS}`);
  await page.getByPlaceholder('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

const test = base.extend<{ attractRoom: { p1: Page; p2: Page } }>({
  attractRoom: async ({ browser }, use) => {
    const roomCode = nanoid(8);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');
    await use({ p1, p2 });
    await ctx1.close();
    await ctx2.close();
  },
});

test.describe('idle attract mode (1017)', () => {
  test('critter appears for both players with the same antic after the room idles', async ({ attractRoom }) => {
    const { p1, p2 } = attractRoom;
    const o1 = p1.getByTestId('attract-overlay');
    const o2 = p2.getByTestId('attract-overlay');

    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });

    const [a1, a2] = await Promise.all([o1.getAttribute('data-antic'), o2.getAttribute('data-antic')]);
    expect(a1).toBe(a2);
    expect(ANTICS).toContain(a1);
  });

  test('local input dismisses locally; a game action dismisses everyone', async ({ attractRoom }) => {
    const { p1, p2 } = attractRoom;
    const o1 = p1.getByTestId('attract-overlay');
    const o2 = p2.getByTestId('attract-overlay');

    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });

    // Local: a click in a neutral corner startles only p1's critter.
    await p1.mouse.click(2, 2);
    await expect(o1).toBeHidden({ timeout: 3_000 });
    await expect(o2).toBeVisible();

    // Shared: wait for the next fire, then a real game action clears both.
    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });
    await p1.getByRole('button', { name: 'Shuffle pile' }).first().click();
    await expect(o1).toBeHidden({ timeout: 3_000 });
    await expect(o2).toBeHidden({ timeout: 3_000 });
  });
});
```

- [ ] **Step 2: Run the e2e suite for this spec**

Both dev servers must be running (Playwright's `webServer` config auto-starts them from this worktree if ports 5173/1999 are free; per project memory, kill any root-checkout servers first: `lsof -ti tcp:5173 -sTCP:LISTEN | xargs kill -9 2>/dev/null; lsof -ti tcp:1999 -sTCP:LISTEN | xargs kill -9 2>/dev/null`).

Run: `npx playwright test playwright/attractMode.spec.ts`
Expected: 2 passed. (These tests inherently take ~1–2 minutes — the idle windows are real 8s waits.)

- [ ] **Step 3: Commit**

```bash
git add playwright/attractMode.spec.ts
git commit -m "Add e2e coverage for idle attract mode"
```

---

### Task 7: Backlog/roadmap bookkeeping

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md` (remove row 1017)
- Modify: `.planning/ROADMAP.md` (append the next vX.Y milestone entry)

- [ ] **Step 1: Remove item 1017 from the backlog table**

Delete the `| 1017 | Easter egg: idle "attract mode" ... |` row from `docs/superpowers/specs/BACKLOG.md`.

- [ ] **Step 2: Add the roadmap milestone**

Read the tail of `.planning/ROADMAP.md`, find the latest `vX.Y` number, and append a matching entry (same format as the existing ones) titled "Idle Attract Mode" covering: server idle alarm, synced critter broadcast, three antics, sound, e2e.

- [ ] **Step 3: Run the full gate and commit**

Run: `npm test && npm run typecheck` — Expected: ALL PASS.

```bash
git add docs/superpowers/specs/BACKLOG.md .planning/ROADMAP.md
git commit -m "Move backlog 1017 to roadmap as shipped (idle attract mode)"
```

---

## Final verification (before PR)

1. `npm test` — all unit tests green.
2. `npm run typecheck` — clean.
3. `npm run test:e2e` — full suite green (kill root-checkout servers on 5173/1999 first so Playwright starts servers from this worktree).
4. Manual smoke (recommended): start both dev servers, open `http://localhost:5173/?room=critter-test&attractIdleMs=5000`, join, wait ~5s — the critter should rise from behind the draw pile; press a key — it scurries away. Repeat to see a different antic.
5. Push and open a PR per the project Git workflow (feature branch → `gh pr create`); do not merge locally.
