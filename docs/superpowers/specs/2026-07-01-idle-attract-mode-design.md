# Design: Idle Attract Mode (backlog 1017)

## Goal

After 3 minutes with no game actions from anyone in the room, a small critter emerges from behind the top pile and performs one of three antics — peek-a-boo, nap time, or house of cards. Everyone in the room sees the same performance at the same time. Any real input startles it into a quick scurry back behind the pile. Purely cosmetic: no `Pile`/card state is ever touched. Subtle, surprising, and polished — better three flawless antics than ten rough ones.

## Decisions made during brainstorming

- **Shared & synced**: server detects room-wide idle and broadcasts; all clients see the same antic simultaneously. Client-local timers were rejected (can't know "no actions from anyone"; no shared moment).
- **Hybrid Lottie + coded props**: a stock character Lottie animation plays the critter body; all choreography (movement paths, pile clipping, miniature cards, "z z z") is CSS/DOM layered around it. Pure-Lottie was rejected (stock files can't cover card-specific antics); SVG puppet was rejected in favor of professionally smooth character motion.
- **Antics v1**: peek-a-boo, nap time, house of cards.
- **Idle threshold**: 3 minutes to first fire; 5 minutes between repeat fires while the room stays idle; any activity resets the cadence to 3.
- **Dismissal**: real input only — local `pointerdown`/`keydown`/`wheel`, plus any game action by anyone (arrives as a state update) dismisses for everyone. Mouse movement alone does NOT scare it off, so a returning player can watch. Exit is a ~600ms startled scurry, never a blink-out.
- **Trigger sound**: a soft, quiet "huh?"-style sound on critter appearance, wired through the existing `playSound` system (jeer precedent: hook-up ships even if the asset lands later).

## Server (`party/index.ts`)

### Idle-alarm infrastructure (the new part)

The server runs with `static options = { hibernate: true }`, so a long-lived `setTimeout` dies when the room hibernates between messages. Use the Durable Object alarm API instead — `this.room.storage.setAlarm(ts)` + `onAlarm()` — which survives hibernation. `onStart()` already rehydrates `gameState` from storage before any handler (including `onAlarm`) runs.

- Constants: `ATTRACT_IDLE_MS = 180_000` (first fire), `ATTRACT_REPEAT_MS = 300_000` (subsequent fires). The re-arm site determines which applies — no stored flag needed.
- **Re-arm to `now + ATTRACT_IDLE_MS`** on: every game-mutating action in `onMessage`, and every `onConnect`.
- **`onAlarm`**: if at least one player connection is open, pick an antic and broadcast `{ type: "EFFECT", kind: "attract", antic }` via the existing `broadcastEffect` path, then re-arm to `now + ATTRACT_REPEAT_MS`. If the room is empty: no broadcast, no re-arm (the next `onConnect` re-arms).
- **Antic selection**: uniform random over `["peekaboo", "nap", "houseOfCards"]`, excluding the previous antic (stored in room storage under `lastAttractAntic` so anti-repeat survives hibernation).

### Test override

The server honors an optional `attractIdleMs` connection query param (from the last connection that supplied one), clamped to a minimum of 5000ms, overriding `ATTRACT_IDLE_MS` and `ATTRACT_REPEAT_MS` for the room. This works in production too — accepted as a harmless hidden knob for a cosmetic effect (a player could only speed up the critter in a room whose link they already have). Exists so Playwright doesn't wait 3 real minutes.

### Type changes (`src/shared/types.ts`)

- `EffectKind` gains `"attract"`.
- `AttractAntic = "peekaboo" | "nap" | "houseOfCards"` (exported; used by server and client).
- The `EFFECT` server event gains an optional `antic?: AttractAntic` field. No new message types; no game-state shape changes; `viewFor` untouched.

## Client

### `usePartySocket`

- New state `attract: { antic: AttractAntic, nonce: number } | null`, following the existing nonce pattern (`nonce` increments per fire so back-to-back same-antic fires still restart the overlay).
- On `EFFECT` with `kind === "attract"`: if `prefers-reduced-motion` is set, ignore the event entirely (no state, no sound); if a performance is already running (attract state non-null and not leaving), ignore the re-fire — interrupting a 16–25s antic mid-flight restarts the critter from its hidden position and looks broken (visible under short `attractIdleMs` overrides where the repeat cadence is shorter than a performance). Otherwise set the state and play the sound per the arming rule below.
- **Sound arming**: the attract sound plays only on the first fire after an action. An armed-flag ref starts true, is re-armed by any `STATE_UPDATE` (someone acted), and disarms after one play — so a room left idle hears the sound once, then repeat fires are animation-only.
- On any `STATE_UPDATE` while attract is non-null: clear it (someone acted → critter flees on all screens). Clearing sets a transient `dismissed` flag rather than instantly nulling, so the overlay can play its scurry exit (see below); the hook exposes `dismissAttract()` for the overlay's local-input path too.

Implementation shape: `attract` state carries `{ antic, nonce, leaving: boolean }`; "clear" flips `leaving: true`; the overlay nulls the state via callback when its exit animation completes (with a safety timeout).

### `AttractOverlay` component (new)

Follows the `CelebrationOverlay` pattern: `position: fixed`, `inset: 0`, `pointer-events: none`, `aria-hidden`, keyed on nonce. Z-index below the celebration/rickroll overlays (it's ambient, not an announcement).

- **Anchoring**: measures the first `PileZone`'s bounding rect (queried via a `data-attract-anchor` attribute rendered by `PileZone`) and positions the critter at its edge so it genuinely emerges from behind the deck. If no pile exists on screen, the overlay no-ops for that fire.
- **Local dismissal**: window listeners for `pointerdown`, `keydown`, `wheel` (not `mousemove`) while active → startled scurry exit (~600ms) → unmount. Server-driven clear (`leaving: true`) takes the same exit path.
- **Critter rendering**: lazy-load `lottie-web/build/player/lottie_light` and the character JSON on first attract fire (dynamic `import()`), so the board bundle doesn't grow for a feature most sessions never trigger. Asset: one stock character from LottieFiles' free library, license verified (CC0 or Lottie Simple License), JSON file(s) committed to the repo — art remains a code change. Selection criteria: reads clearly at ~64–96px, has (or fakes well) idle/walk/sleep loops, works against the table background.
- **Reduced motion**: never reached — the hook drops the effect at receipt (see above), so the overlay never mounts.
- **Failure handling**: if the Lottie module or JSON fails to load, silently no-op. An easter egg must never surface an error state.

### The three antics

Each antic is a choreographed sequence (~15–25s total) sharing one framework: emerge (~1s) → perform → retreat (~1s). CSS keyframes drive the critter container's position/clip; the Lottie instance switches loop segments per phase.

1. **Peek-a-boo** (`peekaboo`): peeks out from behind the pile, looks around, ducks back, re-peeks from the other side of the pile. The simplest — and the shared emerge/retreat choreography every antic needs.
2. **Nap time** (`nap`): settles beside/atop the pile, sleep loop, drifting "z z z" (CSS-animated DOM elements). Mostly still — cheap to make flawless.
3. **House of cards** (`houseOfCards`): stacks a tiny card pyramid next to the pile (miniature card-back sprites reusing `back.svg`), admires it, retreats. If startled mid-build, the pyramid tumbles (CSS fall/fade) as the critter flees.

### Sound (`src/lib/sound.ts`)

- `SoundName` gains `"attract"`; `VARIANT_COUNTS` entry `attract: 1`; file `public/sounds/attract.mp3`.
- Asset: a soft, quiet "huh?"-style curiosity sound (CC0). Deliberately low volume — a nudge to look up, not an alert. `playSound` already respects mute and fails silently on a missing file, so the wiring ships even if the asset lands in a follow-up.
- Not added to `preloadSounds()` — it fires minutes into a session at the earliest; first-play fetch latency is irrelevant.

## Out of scope

- The other seven backlog antics (parkour, juggling, tightrope, card surfing, hide and seek, fishing, confused wandering) — the antic framework makes these cheap follow-ups.
- Any per-antic sound beyond the single trigger sound.
- Mobile-specific choreography tuning beyond the overlay staying inside the viewport.
- Any user-facing setting to disable the critter (the global mute covers sound; the visual is dismissible and rare).

## Testing

### Vitest

- Server: alarm re-armed on mutating actions and on connect; `onAlarm` broadcasts `attract` with an antic when a connection exists; no broadcast and no re-arm when the room is empty; repeat fire uses `ATTRACT_REPEAT_MS`; anti-repeat never picks the previous antic; `attractIdleMs` query override clamps to ≥5000.
- Client: `usePartySocket` sets attract state on the EFFECT, flips `leaving` on `STATE_UPDATE`, exposes `dismissAttract`; overlay unmounts after exit completes; reduced-motion suppresses mount.

### Playwright

Two `BrowserContext`s (per project convention), room joined with `attractIdleMs=5000`:

1. Both players stop acting → both see the critter overlay appear (same antic asserted via a `data-antic` attribute).
2. Player A presses a key → A's critter scurries away; B's remains (local dismissal is local).
3. Re-trigger; player A moves a card (game action) → both critters dismiss (shared dismissal).
