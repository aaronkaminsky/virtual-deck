# Design: Easter Eggs (backlog 1012–1016)

## Goal

Ship five small, playful easter eggs from the backlog: rickroll (1012), shuffle flourish (1013), Konami cheat (1014), table-flip (1015), and bad-game jeer (1016). Item 1017 (idle attract mode) is explicitly out of scope — it's flagged in the backlog as bigger scope (idle-timer infra, sprite animation) and gets its own future design pass.

## Precedent: how `gg` works today

- `src/App.tsx` attaches a `keydown` listener that filters on `e.key === 'g'`, calls a `createDoubleKeyDetector(500)` registrar (`src/lib/celebrationHotkey.ts`), and on a true result sends `{ type: 'CELEBRATE' }`.
- The server re-broadcasts an `EFFECT` event (`kind: "celebrate"`) to every connection in the room.
- Each client's `usePartySocket` increments a `celebrationNonce` on receipt; `CelebrationOverlay` keys its CSS-keyframe burst animation off that nonce, runs for 5s, and unmounts.
- Sounds play via `playSound(name: SoundName)` (`src/lib/sound.ts`), which picks a random variant from preloaded `/public/sounds/*.mp3` assets.

All five new eggs extend this exact pattern rather than introducing parallel mechanisms.

## Shared infrastructure changes

1. **`src/lib/celebrationHotkey.ts`**: keep `createDoubleKeyDetector` untouched (`gg` keeps working with zero risk). Add:
   ```ts
   export function createSequenceDetector(sequence: string[], windowMs: number)
   ```
   Tracks progress through an ordered list of expected `e.key` values. Resets to position 0 on any non-matching key or if the time since the last accepted key exceeds `windowMs`. Returns `true` only when the full sequence completes in order.

2. **Trigger wiring** (`src/App.tsx`, alongside the existing `gg` listener):
   - `rr`: new `createDoubleKeyDetector(500)` instance, filtered on `e.key.toLowerCase() === 'r'`. Sends `{ type: 'CELEBRATE', kind: 'rickroll' }`.
   - `99`: new `createDoubleKeyDetector(500)` instance, filtered on `e.key === '9'`. Sends `{ type: 'CELEBRATE', kind: 'tableflip' }`.
   - `bg`: `createSequenceDetector(['b', 'g'], 500)`. Sends `{ type: 'CELEBRATE', kind: 'jeer' }`.
   - Konami: `createSequenceDetector(['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight'], 2000)`. Sends `{ type: 'CELEBRATE', kind: 'konami' }`.
   - All listeners reuse the existing `isEditableTarget` guard and `connected` gate already used by `gg`.

3. **Shared types** (`src/shared/types.ts`):
   - `CELEBRATE` action gains an optional `kind?: EffectKind` field (default/absent = `"celebrate"`, preserving current behavior exactly).
   - New type: `type EffectKind = "celebrate" | "rickroll" | "tableflip" | "jeer" | "konami"`.
   - The server's `EFFECT` broadcast event carries the same `kind` through unchanged — no game-state mutation, pure pass-through broadcast for all five.

4. **Client receipt** (`src/hooks/usePartySocket.ts`): generalize the existing single `celebrationNonce` into `{ kind: EffectKind, nonce: number }`, incrementing nonce on every `EFFECT` regardless of kind. `BoardView` mounts the matching overlay component based on the latest `kind`.

## Per-egg design

### 1012 — Rickroll (`rr`)

New `RickrollOverlay` component, mounted when `kind === 'rickroll'`:
- Floating panel (similar visual treatment to existing popovers), centered or corner-anchored, containing a `<iframe>` embed of the well-known Rick Astley video, muted by default (browser autoplay policy blocks audio on unmuted embeds anyway — this is a real constraint, not a choice).
- Dismiss button (X) and click-anywhere-on-panel dismiss.
- Auto-dismiss via `setTimeout(10_000)` keyed to the nonce, cleared on unmount/new nonce.

### 1013 — Shuffle flourish

Fully server-decided, no client randomness (so all viewers of a shuffle see the same animation):
- In the `SHUFFLE_PILE` handler (`party/index.ts`), roll `Math.random() < 0.1` and include `animationType: "normal" | "flourish"` on the existing `PILE_SHUFFLED` broadcast (type extension on the existing event, not a new event type).
- `PileZone.tsx`: when `isShuffling` is true, read `animationType` from the shuffle state and select between the existing 5-stage `shuffle-cut-*` keyframes (`normal`) and new, more exaggerated riffle/cut keyframes (`flourish`) added to `globals.css`.
- Sound: reuses existing `shuffle.mp3` (no new asset needed).

### 1014 — Konami cheat (all-aces, cosmetic only)

No server-side card mutation — this only changes how cards render, never what they are:
- On `kind === 'konami'` receipt, client starts a local timer (mirrors the existing highlight-timer pattern in `usePartySocket`) setting `konamiActiveUntil`. For ~3s while active:
  - A "CHEATER DETECTED" banner overlay renders (text banner, similar styling to `ConnectionBanner`).
  - Every hand on the board — own hand and all opponents, regardless of reveal state — renders every card slot as an Ace face-up. This is a render-time override only: `CardFace`/`CardBack` receive an `overrideRank?: 'A'` style prop (or the rendering component checks the active flag and substitutes Ace art), the underlying `Card` objects in state are never touched.
  - Reverts automatically when the local timer expires; no server round-trip needed to undo anything, since nothing was changed server-side.

Note: per discussion, "jokers" are not representable in the current deck model (`src/shared/types.ts`'s `Rank` has no Joker value) — this implements the backlog's stated alternative, "all-aces." Adding Joker support is being filed as a new, separate backlog item for a future round.

### 1015 — Table-flip (`99`)

- New CSS keyframe in `globals.css` (`table-flip`: `rotate(0deg)` → `rotate(180deg)` → `rotate(0deg)`, ~1.2s), applied via a class toggle (keyed to the `tableflip` nonce) on a wrapper div around the board root.
- Visual only — no sound asset exists for this; not blocking, can be added later.

### 1016 — Bad-game jeer (`bg`)

- New overlay component reusing the burst-position math in `celebrationBursts.ts` but with inverted trajectory (cards droop downward and fade rather than bursting outward/up) — same nonce-driven lifecycle as `CelebrationOverlay`.
- `playSound('jeer')` call is wired into the component but the `jeer` sound asset does not exist yet; `sound.ts`'s `playSound` must no-op gracefully on a missing/unmapped asset rather than throwing (verify/adjust this in implementation) so the visual ships independently of audio.

## Out of scope

- 1017 (idle attract mode) — separate future design pass.
- Adding a Joker `Rank` value to the deck model — filed as a new backlog item.
- Sourcing the `jeer` boo/hiss audio asset and any table-flip sound — follow-up once real mp3 files are supplied; the hook-up points are designed in but inert until then.

## Testing approach

- **Vitest**: `createSequenceDetector` timing/reset/mismatch edge cases; the server's shuffle flourish probability branch (mock `Math.random`); the Konami cosmetic-override render logic (cards show as Ace while active, revert after timer).
- **Playwright** (using the existing `twoPlayerRoom` fixture): for each of the five triggers — keypress sequence → overlay becomes visible → auto-dismisses — and confirm the *second* player's browser also sees the broadcast effect (proving it's table-wide, not local-only), matching the existing `gg` test pattern if one exists.
