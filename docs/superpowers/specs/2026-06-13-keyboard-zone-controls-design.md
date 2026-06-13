# Design: Keyboard Zone Controls + Remove Reset Button (999.50 / 999.51)

**Date:** 2026-06-13

---

## Scope

Two backlog items shipped together because they share the keyboard handler and shortcuts overlay:

- **999.50** — Keyboard access to zone controls (shuffle, sort, face toggle) without requiring Tab into DOM buttons
- **999.51** — Remove the Reset button from the controls menu; add Cmd+D as a keyboard deal shortcut

---

## 999.50 — Zone Control Keyboard Shortcuts

### New key bindings

| Key | Cursor zone | Action dispatched |
|-----|-------------|-------------------|
| `S` | `pile-*` (non-spread region only) | `SHUFFLE_PILE` for that pile |
| `S` | `hand` | Cycle hand sort mode: original → bySuit → byRank → original |
| `V` | `pile-*` (pile **or** spread) | `SET_PILE_FACE` toggling current `faceUp` value |

Existing shortcuts are untouched: `F` (flip top card), `Cmd+A` (select all), `Space` (toggle select).

### Why S / V

- `S` = Shuffle (pile) and Sort (hand) — same letter, context-specific meaning, already mnemonic
- `V` = Visibility toggle — distinguishes from `F` (flip a single card) which is already taken
- No conflicts with existing bindings

### State lift: sortMode

`HandZone` currently owns `sortMode` as local state. The keyboard handler (`buildKeyDownHandler` in `keyboardUtils.ts`) cannot reach local component state. Solution: lift `sortMode` to `BoardDragLayer`, pass it down to `HandZone` as props.

- `BoardDragLayer` gains: `const [sortMode, setSortMode] = useState<SortMode>('original')`
- `HandZone` props change: `sortMode: SortMode` and `setSortMode: (m: SortMode) => void` replace internal state
- `BoardDragLayer` derives `cycleSortMode` callback from `setSortMode` and passes it to `useKeyboardShortcuts`

### KeyDownParams additions

```ts
cycleSortMode?: () => void;  // cycles hand sort; only called when cursor on 'hand'
```

### Handler logic (keyboardUtils.ts)

```
if key === 'S' and cursorPos on pile-{id} (non-spread pile):
  sendAction({ type: 'SHUFFLE_PILE', pileId })

if key === 'S' and cursorPos on 'hand':
  cycleSortMode?.()

if key === 'V' and cursorPos on pile-{id} (any pile or spread):
  pile = gameState.piles.find(p => p.id === pileId)
  if pile exists: sendAction({ type: 'SET_PILE_FACE', pileId, faceUp: !pile.faceUp })
```

For `S` on a spread zone: no-op (spreads have no shuffle button).

### ShortcutsOverlay additions

Three new rows:
- `S` — Shuffle pile / cycle sort order (context-dependent on cursor zone)
- `V` — Toggle face-up / face-down
- `⌘D / Ctrl+D` — Deal (or re-deal) cards

---

## 999.51 — Remove Reset Button + Cmd+D Deal Shortcut

### Remove Reset from ControlsBar

Delete from `ControlsBar.tsx`:
- `confirmReset` state and `setConfirmReset`
- `resetDisabled` variable
- `handleResetConfirm` function
- Reset button JSX (both the initial button and the confirm/cancel pair)
- `RotateCcw` import from lucide-react

The Undo button stays. Reset is considered redundant given Deal Next Hand can collect all cards and re-deal.

### Lift dealCount to BoardDragLayer

`dealCount` state (`"1"` default, string for the input) moves from `ControlsBar` to `BoardDragLayer` as `lastDealCount`.

- `ControlsBar` receives `dealCount: string` and `onDealCountChange: (v: string) => void` as props, replacing its internal state
- `BoardDragLayer` passes `lastDealCount` to `useKeyboardShortcuts` → `buildKeyDownHandler`

### Cmd+D shortcut

```
if key === 'D' and (metaKey or ctrlKey) and not repeat:
  preventDefault()
  parsed = parseInt(lastDealCount, 10)
  cardsPerPlayer = isNaN(parsed) || parsed < 1 ? 1 : parsed
  if gameState.phase === 'playing':
    sendAction({ type: 'DEAL_NEXT_HAND', cardsPerPlayer })
  else:
    sendAction({ type: 'DEAL_CARDS', cardsPerPlayer })
```

Uses `lastDealCount` (whatever was last typed in the menu input). Defaults to 1 if unparseable or never set.

### KeyDownParams additions

```ts
lastDealCount: string;  // reflects last ControlsBar input value; default "1"
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/keyboardUtils.ts` | Add S, V, Cmd+D handlers; extend `KeyDownParams` |
| `src/hooks/useKeyboardShortcuts.ts` | Pass `cycleSortMode`, `lastDealCount` through to handler |
| `src/components/BoardDragLayer.tsx` | Lift `sortMode`, `lastDealCount`; wire `cycleSortMode` callback |
| `src/components/HandZone.tsx` | Accept `sortMode`/`setSortMode` as props, remove internal state |
| `src/components/ControlsBar.tsx` | Remove reset; accept `dealCount`/`onDealCountChange` props |
| `src/components/ShortcutsOverlay.tsx` | Add S, V, Cmd+D rows to SHORTCUTS table |

---

## Testing

### Unit tests (keyboardUtils)

- `S` on pile-zone cursor → `SHUFFLE_PILE` dispatched with correct pile ID
- `S` on spread-zone cursor → no-op (no action dispatched, `cycleSortMode` not called)
- `S` on hand cursor → `cycleSortMode` called; no action dispatched
- `V` on pile cursor → `SET_PILE_FACE` dispatched with toggled value
- `V` on hand cursor → no-op
- `Cmd+D` → `DEAL_NEXT_HAND` when phase is playing, `DEAL_CARDS` otherwise
- `Cmd+D` with unparseable `lastDealCount` → defaults to 1

### E2E (playwright/keyboard.spec.ts)

- Cmd+D fires deal action (check via state sync, not menu)
- Reset button absent from controls menu
