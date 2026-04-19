---
status: complete
phase: quick
plan: 260405-lgq
subsystem: identity
tags: [player-id, url-params, localStorage, reconnect, private-window]
dependency_graph:
  requires: []
  provides: [player-id-url-persistence]
  affects: [src/hooks/usePlayerId.ts]
tech_stack:
  added: []
  patterns: [url-param-first identity resolution, history.replaceState embedding]
key_files:
  created: []
  modified:
    - src/hooks/usePlayerId.ts
decisions:
  - URL param takes priority over localStorage for player ID resolution — enables private-window reconnect by copying full URL
  - history.replaceState used (not window.location.replace) — avoids triggering navigation or page reload
metrics:
  duration: 5
  completed: 2026-04-05
  tasks_completed: 2
  files_modified: 1
---

# Quick Task 260405-lgq: Fix Player ID Persistence (URL-first) Summary

**One-liner:** Player ID resolution now reads `?player=` URL param first, embeds ID via `history.replaceState` — enables reconnect in private/incognito windows where localStorage is cleared.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update getOrCreatePlayerId to read URL param first and embed in URL | 23c41b9 | src/hooks/usePlayerId.ts |
| 2 | Verify App.tsx needs no changes and test the full URL shape | (no commit — no changes required) | src/App.tsx (confirmed unchanged) |

## Changes Made

### src/hooks/usePlayerId.ts

Rewrote `getOrCreatePlayerId()` with this priority order:

1. Read `?player=` from `window.location.search` — if present, use it (also write to localStorage for consistency).
2. Else read localStorage — if present, use it.
3. Else generate `nanoid()`, write to localStorage.

After resolving the ID from any source, embed it via:
```typescript
params.set('player', id);
history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
```

This preserves the existing `?room=` param (uses `URLSearchParams` to build the full search string). Idempotent — calling it again with the same ID is harmless.

### src/App.tsx

No changes required. The `App` component reads `params.get('room')` before `RoomView` mounts. `getOrCreatePlayerId` (which calls `replaceState`) runs inside `RoomView`, after `roomId` is already captured. No ordering conflict.

## Verification

- `npx tsc --noEmit` exits clean (no output)
- URL shape after load: `?room=<roomId>&player=<playerId>`
- Private-window scenario: copy full URL with `?player=` param, clear localStorage, reload → same player ID resolved from URL param

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/hooks/usePlayerId.ts` — modified (verified via Edit tool)
- Commit 23c41b9 — exists (`git rev-parse --short HEAD` = 23c41b9)
- TypeScript clean — `npx tsc --noEmit` produced no output
