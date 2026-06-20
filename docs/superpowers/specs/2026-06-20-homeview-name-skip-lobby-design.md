# Name on HomeView, Skip Lobby for Creators — Design

**Status:** Approved (brainstorming)
**Date:** 2026-06-20
**Branch:** `feat/custom-table-names` (extends PR #67)
**Builds on:** [2026-06-20-custom-table-names-design.md](2026-06-20-custom-table-names-design.md)

## Problem

The custom-table-names feature added a HomeView landing screen, but creating a
table still routes you through the lobby (`?room=<slug>` → LobbyPanel → enter
name → Join). For the person *starting* a table that's a redundant second step:
they already decided to play. The lobby's real job is for someone arriving via a
shared URL.

## Goal

When you create (or quick-start) a table from HomeView, go **straight to the
board**. Keep the lobby only for people who arrive by a sent `?room=` URL.

## Decisions locked during brainstorming

1. **"Your name" is required on HomeView.** Create is enabled only with both a
   table name and a player name; Quick is enabled with a player name. The field
   is prefilled from the last-used name (`getDisplayName()`).
2. **Refresh / direct URL visit shows the lobby** (name prefilled). Skip-the-lobby
   applies only to the create/quick action itself, so the auto-join intent is
   one-shot.
3. **Ships in PR #67** on the same `feat/custom-table-names` branch.

## Mechanism: one-shot auto-join intent

A `sessionStorage` flag, key `vd:autojoin`, value `"1"`:

- **Set** by HomeView immediately before navigating to `?room=<slug>`.
- **Consumed once** by `RoomView` on mount (read, then remove).

Why `sessionStorage` + consume-once:

- **Tab-scoped** — a friend opening the shared link in a new tab, window, or
  device has no flag, so they get the lobby. This is the create-vs-join
  distinction with no URL pollution (the copy-link stays `?room=<slug>`).
- **Consumed once** — a refresh or a direct re-visit of the `?room=` URL has no
  flag, so it falls through to the lobby (with the name prefilled from
  localStorage — one click to rejoin). Matches decision 2.

The player name continues to persist via the existing `saveDisplayName`
(localStorage `displayName`); the player token is unchanged.

## Components

### `src/components/HomeView.tsx`

- Add `playerName` state, initialized from `getDisplayName()`.
- Add a "Your name" `Input` with `data-testid="player-name-input"`, 20-char cap
  (matching the lobby's existing cap), placed above the table-name field (you
  name yourself, then the table).
- Gating:
  - `canCreate = slug.length > 0 && playerName.trim().length > 0 && !probing`
  - `canQuick = playerName.trim().length > 0`
  - The Quick button becomes `disabled={!canQuick}`.
- A single helper `enterRoom(slug)` runs before every navigation
  (`handleCreate` free branch, `handleQuick`, and the occupied-warning "Join
  them" button): `saveDisplayName(playerName.trim())` →
  `sessionStorage.setItem('vd:autojoin', '1')` → `navigateToRoom(slug)`.

### `src/App.tsx` — `RoomView`

- On mount (effect with empty deps, runs once), read `sessionStorage`:
  - If `vd:autojoin` is set: remove it, and if `getDisplayName()` is non-empty,
    auto-join by calling the existing join path
    (`saveDisplayName` is a no-op repeat; set `joinState` via the same logic as
    `handleJoin`, which also calls `preloadSounds()`).
  - If the flag is absent, or no saved name exists, render the lobby as today.
- The existing `if (joinState && gameState) return <Board/>` gate is unchanged;
  auto-join simply sets `joinState` programmatically.

### `src/components/LobbyPanel.tsx`

Unchanged. It is now purely the URL-arrival path.

## Edge cases

- **No saved name but flag set** (shouldn't happen, since HomeView requires and
  saves a name): guard by only auto-joining when `getDisplayName()` is non-empty;
  otherwise fall through to the lobby. Defensive, costs one `if`.
- **Sound preload without a gesture:** auto-join occurs on a fresh page load with
  no user gesture, so the browser may defer the in-gesture audio warm that
  `preloadSounds()` performs. This is harmless — sounds still initialize on the
  first real interaction (a gesture). Noted, not mitigated.
- **Occupied → "Join them":** treated like any other HomeView entry — sets the
  flag and joins straight onto the board of the existing table.

## Out of scope (YAGNI)

- Redesigning the lobby layout. Captured as a backlog item instead (see below).
- Carrying the name in the URL (rejected: pollutes the shareable link and
  browser history).
- Persisting auto-join across refreshes (explicitly decided against).

## Backlog item to add

Append to `docs/superpowers/specs/BACKLOG.md`:

> Lobby redesign for the join-by-URL focus — now that table creators skip the
> lobby, the lobby is only seen by people arriving via a shared `?room=` URL.
> De-emphasize the table name/code and the copy-link button; prioritize the
> "Your name" field and the Join control.

## Testing

**Vitest:** unchanged. No pure logic changes (the flow lives in components/effects,
which this project does not unit-test — no jsdom).

**Playwright — update `playwright/tableNames.spec.ts`:**

- **Create named table:** from `/`, fill `player-name-input` and
  `table-name-input`, click `create-table` → URL `?room=friday-poker-night` and
  the **board** (`hand-zone`) is visible (no lobby step).
- **Quick table:** from `/`, fill `player-name-input`, click `quick-table` →
  random `?room=` and the **board** is visible.
- **Occupied warning:** Context A arrives via URL and joins through the lobby
  (existing path, unchanged). Context B from `/` fills its name + the same room
  name, clicks `create-table`, sees `occupied-warning`, clicks `join-occupied`
  → lands on the **board** of that room (proving B joined the occupied table).
  Two independent `BrowserContext`s per project convention; per-run-unique room
  name to stay idempotent.

`playwright/fixtures.ts` (the URL-arrival `joinGame` helper) is unchanged.
