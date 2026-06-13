# Design: Keyboard Commands (999.46)

**Date:** 2026-06-11
**Status:** Approved, ready for implementation

## Goal

Add keyboard navigation and shortcuts so players can control Virtual Deck without touching the mouse. Focus on three capabilities: (1) undo via Cmd/Ctrl+Z, (2) arrow/space navigation and card selection, and (3) Alt+letter shortcuts to move selected cards to a named zone.

## Decisions

| Question | Decision |
|---|---|
| Undo shortcut | Cmd+Z (Mac) / Ctrl+Z (Windows/Linux); dispatches `UNDO_MOVE` when `canUndo` is true |
| Navigation model | Cursor (`CursorPos`) tracks a focused card; Tab/Shift+Tab cycle zones, Arrow keys move within zone |
| Selection | Space toggles selection on cursor card; Cmd/Ctrl+A selects all in zone; Escape clears |
| Send shortcut | Hold Alt to reveal zone letter badges; Alt+letter dispatches `PLAY_CARD_SET` |
| Canvas as send target | Excluded — `PLAY_CARD_SET` does not support canvas destination; canvas is navigable via cursor but not a send-target |
| Card flip | F key flips cursor card in pile/spread zones |
| Cheat sheet | ? key toggles a `ShortcutsOverlay` |

## Tab Stop Order

1. My hand (if non-empty)
2. My spread zone (if present and non-empty)
3. Non-spread pile zones in `gameState.piles` order (non-empty only)
4. Canvas (if non-empty, navigated by z-index ascending)
5. Menu (always last; Tab reaches it but arrow keys skip it)

## Zone Letter Assignment

Letters are assigned greedily: first unique letter from the zone's display name, in order of appearance. Assignment order:

| Zone | Example letter | Notes |
|------|---------------|-------|
| hand | `h` | always first |
| non-spread piles | `d` for draw, `i` for discard | in `gameState.piles` order |
| my spread | `s` | name + " spread" used as source |
| opponent spreads | first available from opponent name | |
| opponent hands | first available from opponent display name | |
| canvas | — | excluded — `PLAY_CARD_SET` does not support canvas destination; canvas is navigable via cursor but not a send-target |

## Menu Button Behavior

- Tab from the last card zone lands on `menu` stop (`zoneId: "menu"`, `index: 0`).
- Space on menu stop: cursor is cleared, `focusMenuTrigger()` is called (hands DOM focus to the ControlsBar popover trigger).
- On popover close (Escape or item activated): cursor stays null; the user re-enters the cycle via Tab.

## Key Binding Summary

| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Next / previous zone |
| ArrowLeft / ArrowRight | Previous / next card within zone |
| Space | Toggle selection on cursor card; open menu when on menu stop |
| Escape | Close overlay → clear cursor + selection |
| Cmd/Ctrl+Z | Undo last move |
| Cmd/Ctrl+A | Select all in cursor zone |
| F | Flip cursor card (pile/spread only) |
| Alt+(held) | Reveal zone letter badges |
| Alt+letter | Move selected cards to the named zone |
| ? | Toggle shortcuts cheat sheet overlay |

## Architecture

### New Files

- `src/lib/keyboardUtils.ts` — pure functions: `computeTabStops`, `computeZoneLetterMap`, `buildLetterToZoneMap`, `moveCursor`, `computeCursorCardId`, `buildAltShortcutAction`, `buildKeyDownHandler`, `buildKeyUpHandler`
- `src/hooks/useKeyboardShortcuts.ts` — React hook that wires the key handlers to `window`, maintains `cursorPos`, `altHeld`, `showShortcuts`
- `src/components/ShortcutsOverlay.tsx` — modal/drawer listing all shortcuts
- `tests/keyboardUtils.test.ts` — unit tests for all pure functions

### State

All keyboard state lives in the `useKeyboardShortcuts` hook (not in zustand, not in game state):
- `cursorPos: CursorPos | null`
- `altHeld: boolean`
- `showShortcuts: boolean`

### Types

```ts
export type CursorPos = {
  zoneId: string; // 'hand' | 'pile-{id}' | 'canvas' | 'menu'
  index: number;  // card index within zone; 0 for menu
};

export type TabStop = {
  zoneId: string;
  cardIds: string[]; // empty for 'menu'
};
```
