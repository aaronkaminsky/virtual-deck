---
phase: quick
plan: 260405-lgq
type: execute
wave: 1
depends_on: []
files_modified:
  - src/hooks/usePlayerId.ts
  - src/App.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Player ID persists across private-window close/reopen when URL is copied"
    - "URL always contains ?player= after first load"
    - "?room= and ?player= coexist in URL without conflict"
    - "New player still gets a fresh nanoid on first visit"
  artifacts:
    - path: "src/hooks/usePlayerId.ts"
      provides: "getOrCreatePlayerId reads ?player= param first, writes to localStorage and URL"
    - path: "src/App.tsx"
      provides: "passes player ID URL embedding into URL after RoomView mounts"
  key_links:
    - from: "src/App.tsx"
      to: "src/hooks/usePlayerId.ts"
      via: "getOrCreatePlayerId() call in RoomView"
      pattern: "getOrCreatePlayerId"
---

<objective>
Fix player ID persistence so reconnects work in private/incognito windows.

Purpose: Currently getOrCreatePlayerId() only uses localStorage, which is cleared when a private window closes. Encoding the player ID in the URL via ?player= means the full URL carries the reconnect identity even after localStorage is wiped.
Output: Updated usePlayerId.ts with URL-first logic + URL embedding; App.tsx updated to call the embed step after roomId is confirmed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update getOrCreatePlayerId to read URL param first and embed in URL</name>
  <files>src/hooks/usePlayerId.ts</files>
  <action>
Rewrite getOrCreatePlayerId() with this priority order:

1. Read ?player= from window.location.search — if present and non-empty, use it (write to localStorage for consistency, then return it).
2. Else read localStorage — if present, return it (also embed in URL via replaceState, described below).
3. Else generate nanoid(), write to localStorage, return it.

After resolving the ID (from any source), embed it in the URL using history.replaceState so that ?player={id} is present without triggering a navigation. Preserve the existing ?room= param.

Implementation detail for URL embedding:
```typescript
const params = new URLSearchParams(window.location.search);
params.set('player', id);
history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
```

This must happen every call to getOrCreatePlayerId() (idempotent — replaceState with the same value is harmless). Do NOT use window.location.replace or assign — those trigger full navigation.

The STORAGE_KEY const and nanoid import stay. No other changes.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>getOrCreatePlayerId reads ?player= first, falls back to localStorage, falls back to generating fresh ID; always writes ?player= into URL via replaceState without clobbering ?room=</done>
</task>

<task type="auto">
  <name>Task 2: Verify App.tsx needs no changes and test the full URL shape</name>
  <files>src/App.tsx</files>
  <action>
App.tsx calls getOrCreatePlayerId() at the top of RoomView — this already happens after roomId is confirmed (RoomView is only rendered when roomId is non-null). No structural change needed.

However, verify that the URL-reading logic in App.tsx still correctly extracts roomId after the player ID is added. Current code: `params.get('room')`. Since replaceState is called inside getOrCreatePlayerId (which runs inside RoomView), the App-level params extraction runs first — order is fine.

If App.tsx is correct as-is, make no changes. If for any reason the ?room= extraction needs updating (e.g., URLSearchParams is constructed before replaceState runs), note it here but do not change App.tsx unless broken.

After confirming no App.tsx changes are needed, do a manual smoke-test check:
- Load dev server (`npm run dev`)
- Visit http://localhost:5173/?room=testroom
- URL should become http://localhost:5173/?room=testroom&player={id}
- Open DevTools, clear localStorage
- Reload with the full URL (room + player params)
- Same player ID should be used (read from ?player=)
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>TypeScript clean, App.tsx confirmed unchanged or correctly updated; URL contains both ?room= and ?player= after first load</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0
- No runtime errors on dev server load
- URL visually shows ?room=...&player=... after first load
- Simulated private-window test: copy full URL, clear localStorage, reload → same player ID in use
</verification>

<success_criteria>
?player= param appears in URL on every page load. Copying the full URL and opening in a fresh private window reconnects as the same player even after localStorage is cleared.
</success_criteria>

<output>
After completion, create `.planning/quick/260405-lgq-fix-player-id-persistence-read-player-fr/260405-lgq-SUMMARY.md`
</output>
