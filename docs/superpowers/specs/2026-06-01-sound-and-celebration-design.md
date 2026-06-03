# Design: Sound Effects & Celebration Easter Egg (999.23 / 999.43)

**Date:** 2026-06-01
**Status:** Approved

## Goal

Give Virtual Deck more character with two small, complementary additions:

- **999.23 — Sound effects.** Audible feedback for shuffling and dealing, with a per-browser mute toggle.
- **999.43 — Celebration easter egg.** A hidden keyboard combo (`w` pressed twice) that sets off a card-suit fireworks display with a celebratory sound — manually fired by a player when someone wins. It is **not** an automatic, rule-detected win; the game enforces no rules, so the host/players trigger it on demand.

Both effects are **shared**: when one client triggers a shuffle, deal, or celebration, every connected player hears/sees it. This matches the feel of sitting around a real table.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Who experiences effects? | **Shared** — server broadcasts; all clients react. |
| Which events get sounds? | **Shuffle** and **deal** only (card-move sounds omitted — too noisy across 4 players). |
| Audio source | **Bundled** CC0 files in `public/sounds/`. |
| Mute toggle placement | Inside the existing **menu popover** (`ControlsBar`). |
| Mute persistence | `localStorage` flag, survives reloads and future visits on the same browser. |
| Win trigger | **Keyboard combo** — `w` pressed twice within a short window. |
| Celebration style | **Card-suit burst** (♠ ♥ ♦ ♣), multi-burst display across the screen. |
| Celebration intensity | ~12 bursts at random positions, **~5 seconds**, then fades. |
| Celebration sound | Cheer with firework pops underneath. |

## Architecture: one generic `EFFECT` broadcast

A single ephemeral server→client message carries any shared effect:

```ts
// src/shared/types.ts — ServerEvent union
| { type: "EFFECT"; kind: "deal" | "celebrate" }
```

```ts
// src/shared/types.ts — ClientAction union
| { type: "CELEBRATE" }
```

Rationale (chosen over discrete per-effect messages): one message type, one client handler, and adding future "character" effects is a new `kind` string rather than a new message + handler branch. Consistent with the project's **"type extension > parallel collections"** convention.

**Shuffle stays on the existing `PILE_SHUFFLED` message** — it carries `pileId` and drives the per-pile fan animation, which is distinct from a global effect. We only add a `playSound("shuffle")` call inside the existing client handler. No server change for shuffle.

`EFFECT` is fire-and-forget: it mutates no game state, is never persisted, and is not part of the undo stack.

## Component breakdown

### 1. Audio layer — `src/lib/sound.ts`

A small standalone module, the single source of truth for sound playback and mute state.

- Preloads one `HTMLAudioElement` per named sound: `shuffle`, `deal`, `celebrate`.
- Audio file URLs are built from Vite's base path, matching how `ControlsBar` builds the room link: `` `${import.meta.env.BASE_URL}sounds/${name}.mp3` `` (resolves to `/virtual-deck/sounds/…`).
- `playSound(name)`: if muted, no-op; otherwise reset `currentTime = 0` and `play()` (allows rapid replay / restart).
- Mute state: a module-level boolean initialized from `localStorage["vd-muted"]` (default **unmuted** / `false`).
- Exports: `playSound(name)`, `getMuted()`, `setMuted(boolean)` (writes through to `localStorage`).

**Autoplay policy:** browsers block audio before a user gesture. Every sound here fires as a consequence of a user action (deal click, shuffle click, the `w-w` keypress) that occurs after the player has already interacted with the page (joined the room), so playback is permitted. We still preload eagerly so the first real playback is instant.

### 2. Mute toggle UI — `ControlsBar.tsx`

A "Sound" row added inside the existing popover (alongside Copy link / Deal / Undo / Reset), with a `Volume2` / `VolumeX` (lucide) icon reflecting state. A local `useState` initialized from `getMuted()` mirrors the module truth; clicking calls `setMuted(next)`. Because the source of truth is `localStorage`, the choice persists across reloads and future visits on that browser.

### 3. Sound playback wiring — `usePartySocket.ts`

- **Shuffle:** add `playSound("shuffle")` in the existing `PILE_SHUFFLED` handler (already present, also fires on deal since dealing shuffles the draw pile first).
- **Deal:** handle the new `EFFECT` message; on `kind === "deal"`, call `playSound("deal")`.
- **Celebrate:** on `kind === "celebrate"`, call `playSound("celebrate")` **and** raise a celebration signal for the UI (see below).

The hook exposes a `celebrationNonce: number` that increments on each `celebrate` event (mirroring the existing `shufflingPileIds` pattern of surfacing ephemeral server signals to the view). `App` threads `celebrationNonce` down to the overlay.

### 4. Celebration overlay — `src/components/CelebrationOverlay.tsx`

- Props: `nonce: number`.
- On each `nonce` change (and only when `nonce > 0`), runs a ~5s animation, then unmounts its particles. Re-trigger while running **restarts** the 5s window (no rate limiting — friendly 2–4 player context).
- Renders a fixed, full-viewport, `pointer-events: none`, high-z-index layer over the table so it never blocks interaction.
- ~12 bursts at randomized positions; each burst is a ring of ♠ ♥ ♦ ♣ particles (red for ♥ ♦, white for ♠ ♣) that explode outward, spin, drift down slightly, and fade — CSS transform + keyframe animation (the proven approach from the brainstorming preview; no canvas needed at this scale).
- Respects `prefers-reduced-motion`: if set, show a brief static/low-motion acknowledgement instead of the full burst sequence.

### 5. Celebration trigger — `w-w` hotkey

A window `keydown` listener (an `useEffect` in `App`, or a small `useCelebrationHotkey(sendAction)` hook):

- Tracks the timestamp of the last `w`. Two `w` keypresses within ~500ms dispatch `sendAction({ type: "CELEBRATE" })`.
- **Suppressed when an input is focused** — if `document.activeElement` is an `<input>`, `<textarea>`, or `contenteditable`, ignore (so typing "ww" in the room-name or deal-count field never fires it).
- Keyboard-only by design (no touch trigger), per the brainstorming decision.

### 6. Server — `party/index.ts`

- Add `private broadcastEffect(kind: "deal" | "celebrate")`, structurally identical to the existing `broadcastShuffleEvent`, looping `this.room.getConnections()` and sending the `EFFECT` message.
- **`DEAL_CARDS`:** after the dealing loop completes (after line ~513, before the trailing `broadcastState`), call `this.broadcastEffect("deal")`. Sequence on a deal becomes: shuffle riffle (existing `PILE_SHUFFLED`) → ~650ms window → deal sound — coherent with the physical act of shuffling then dealing.
- **`CELEBRATE`:** new `case "CELEBRATE"` — any connected player may trigger; call `this.broadcastEffect("celebrate")` and `break`. It takes **no** `takeSnapshot` (no state change) and adds nothing to undo. The trailing `await this.persist(); this.broadcastState();` are harmless no-ops on unchanged state.

## Assets

Three CC0 audio files to be added under `public/sounds/` (mirrors how card art lives under `public/cards/`):

| File | Sound |
|------|-------|
| `public/sounds/shuffle.mp3` | A card riffle/shuffle. |
| `public/sounds/deal.mp3` | Cards being dealt out (short). |
| `public/sounds/celebrate1.mp3`, `celebrate2.mp3`, … | One or more short cheer + firework-pop clips (~5s each, to match the visual). `playSound('celebrate')` picks one at random per celebration. The number of variants is the `VARIANT_COUNTS.celebrate` constant in `src/lib/sound.ts` — set it to match the files added. |

**These files must be supplied at implementation time** — they cannot be generated/downloaded here. Candidate CC0 sources: [freesound.org](https://freesound.org) (filter to CC0) and [Pixabay](https://pixabay.com/sound-effects/). Implementation can scaffold the code with the filenames in place and a graceful fallback (a missing file simply fails to play; no crash) so the feature is testable before final audio is chosen. `.mp3` is used for broad browser support; a single format is sufficient for the target browsers.

## Non-Goals

- **Card move / flip / play sounds.** Explicitly out of scope (noise across 4 players).
- **Automatic win detection.** The celebration is manual only; no rule engine.
- **Per-player or per-sound volume controls.** A single on/off mute is the whole control surface.
- **Touch trigger for the celebration.** Keyboard combo only.
- **Server-side rate limiting of celebrations.** Re-trigger restarts; acceptable at 2–4 friendly players.
- **A configurable / multi-theme celebration.** One style (card-suit burst), fixed.
- **999.44 (shuffle-animation polish).** Related but separate backlog item; not addressed here.

## Testing

Following project conventions (Wave 0 RED scaffolds; two `BrowserContext`s for multiplayer Playwright tests; code review after the phase):

**Unit (Vitest):**
- `sound.ts`: `playSound` no-ops when muted; `setMuted` writes through to `localStorage`; mute state initializes from `localStorage`.
- Hotkey logic: two `w` within the window fires `CELEBRATE`; outside the window does not; suppressed when an input is focused.
- Server: `CELEBRATE` broadcasts `EFFECT kind:"celebrate"` to **all** connections and mutates no state / takes no snapshot; `DEAL_CARDS` broadcasts `EFFECT kind:"deal"`.

**E2E (Playwright):**
- Audio cannot be meaningfully asserted in Playwright; tests target observable DOM/state instead.
- Two independent `BrowserContext`s: when player A presses `w-w`, the `CelebrationOverlay` appears for **both** A and B (shared), and is removed after ~5s.
- Mute toggle in the menu persists: toggle off, reload, confirm it is still off (reads `localStorage`).

## Affected files

- `src/shared/types.ts` — add `EFFECT` to `ServerEvent`, `CELEBRATE` to `ClientAction`.
- `src/lib/sound.ts` — **new** audio + mute module.
- `src/hooks/usePartySocket.ts` — handle `EFFECT`; add shuffle sound to `PILE_SHUFFLED`; expose `celebrationNonce`.
- `src/components/ControlsBar.tsx` — mute toggle row.
- `src/components/CelebrationOverlay.tsx` — **new** overlay.
- `src/App.tsx` — `w-w` hotkey; render `CelebrationOverlay` with `celebrationNonce`.
- `party/index.ts` — `broadcastEffect`; `DEAL_CARDS` deal effect; `CELEBRATE` case.
- `public/sounds/` — **new** `shuffle.mp3`, `deal.mp3`, `celebrate1.mp3`..`celebrateN.mp3` (supplied separately).
- `src/globals.css` — celebration keyframes (or scoped to the overlay component).
