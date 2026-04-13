---
phase: 09-player-identity-presence
reviewed: 2026-04-13T04:11:02Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - tests/displayName.test.ts
  - src/shared/types.ts
  - party/index.ts
  - tests/dealCards.test.ts
  - tests/moveCard.test.ts
  - tests/passCard.test.ts
  - tests/reconnect.test.ts
  - tests/resetTable.test.ts
  - tests/shufflePile.test.ts
  - tests/undoMove.test.ts
  - tests/viewFor.test.ts
  - src/hooks/usePlayerId.ts
  - src/hooks/usePartySocket.ts
  - src/App.tsx
  - src/components/LobbyPanel.tsx
  - src/components/BoardView.tsx
  - src/components/HandZone.tsx
  - src/components/OpponentHand.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-13T04:11:02Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds player identity (stable player tokens via `?player=` query param) and display names (`?name=` param, 20-char cap, localStorage-backed). The server-side logic in `party/index.ts` is clean and well-tested. The shared types, hooks, and UI components are consistent with the approach.

One critical issue was found: a missing `await` on the `navigator.clipboard.writeText` promise rejection path in two components means clipboard errors are silently swallowed. Four warnings cover security/correctness concerns: a client-controlled player ID that the server accepts without validation, a DOM-based URL construction that could expose `?room=` to an invalid room value, a state-leak window in `usePartySocket` during reconnect, and an unguarded `JSON.parse` in the message handler that throws on non-string input. Three info items cover minor code quality issues.

## Critical Issues

### CR-01: Unhandled clipboard rejection in LobbyPanel and BoardView

**File:** `src/components/LobbyPanel.tsx:23` and `src/components/BoardView.tsx:24`
**Issue:** `navigator.clipboard.writeText(url).then(...)` with no `.catch()` or rejection handler. In browsers where clipboard access is denied (e.g., non-HTTPS, permission denied), the rejected promise is unhandled — this produces an unhandled promise rejection error in the console and, in some environments, causes an uncaught exception. Neither component shows the user any feedback on failure.
**Fix:**
```typescript
navigator.clipboard.writeText(url).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}).catch(() => {
  // Clipboard write failed (e.g., permission denied)
  // Optionally show a fallback or error toast
});
```

## Warnings

### WR-01: Client-supplied player token accepted without format validation

**File:** `party/index.ts:111`
**Issue:** `url.searchParams.get("player") ?? connection.id` accepts any arbitrary string as the player token — including extremely long strings, strings with special characters, or strings that collide with internal identifiers. There is no length cap or character validation. A malicious client can supply a 10MB string as the player token, which then gets stored in `gameState.players` and persisted to durable storage on every action.
**Fix:** Cap and sanitize the player token server-side before trusting it:
```typescript
const rawToken = url.searchParams.get("player") ?? connection.id;
const playerToken = rawToken.slice(0, 64); // nanoid default is 21 chars; 64 is a generous cap
```

### WR-02: displayName XSS potential if rendered via innerHTML (defense-in-depth gap)

**File:** `party/index.ts:112`
**Issue:** The server slices `displayName` to 20 characters but performs no other sanitization. The current UI renders it via React (safe), but `displayName` is stored in `GameState`, persisted to durable storage, and broadcast to all clients. If any future code path renders it via `innerHTML` or inserts it into a DOM attribute without escaping, stored XSS is possible. The 20-char truncation does not strip HTML/script characters (`<`, `>`, `"`, `'`, `&`).
**Fix:** Strip or encode HTML metacharacters server-side before storing:
```typescript
const displayName = (url.searchParams.get("name") ?? '')
  .slice(0, 20)
  .replace(/[<>"'&]/g, '');
```
This is defense-in-depth — the React rendering is currently safe, but the data store should not contain raw HTML.

### WR-03: usePartySocket reconnects on displayName change, leaking stale state

**File:** `src/hooks/usePartySocket.ts:54`
**Issue:** `displayName` is included in the `useEffect` dependency array. If the parent ever re-renders with a different `displayName` value (e.g., state update race), the WebSocket tears down and reconnects. During the teardown-to-reconnect gap, `connected` becomes `false` and `gameState` remains stale (the old value). More concretely: `RoomView` passes `joinState.displayName` which is set once at join time, so this is currently benign — but the effect dependency is fragile and will silently cause reconnects if the display name ever comes from a non-stable source (e.g., a prop that re-derives on every render).
**Fix:** Separate the display name from the connection identity. The `name` param only needs to be sent at connect time; use a `ref` for it to avoid triggering reconnect on name changes:
```typescript
const displayNameRef = useRef(displayName);
displayNameRef.current = displayName;

// In the effect, use displayNameRef.current in the query — do NOT include displayName in deps
const ws = new PartySocket({
  host: PARTYKIT_HOST,
  room: roomId,
  query: { player: playerId, name: displayNameRef.current },
});
// deps: [roomId, playerId, enabled]
```

### WR-04: JSON.parse in onMessage throws on non-string message input

**File:** `party/index.ts:141`
**Issue:** `JSON.parse(message)` is wrapped in a try/catch, which correctly handles malformed JSON. However, if `message` is not a string (e.g., a `Buffer` or `ArrayBuffer` from a binary WebSocket frame), `JSON.parse` will coerce it to `"[object ArrayBuffer]"` and throw `SyntaxError`, which is caught correctly — but the type signature `message: string` is not enforced at runtime by PartyKit. This is low-risk in practice, but worth noting that the catch block handles this silently with an `INVALID_MESSAGE` error response, which is the correct behavior. No code change needed for correctness, but the handler could be made explicit:
```typescript
if (typeof message !== 'string') {
  sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_MESSAGE", message: "Binary messages not supported" } satisfies ServerEvent));
  return;
}
```
This is advisory — the existing catch covers it, but the explicit check improves clarity and avoids relying on coercion behavior.

## Info

### IN-01: `getOrCreatePlayerId` reads `window.location` directly — not testable in isolation

**File:** `src/hooks/usePlayerId.ts:15`
**Issue:** `getOrCreatePlayerId` directly reads `window.location.search` and calls `history.replaceState`. This makes it impossible to unit test without a DOM environment and makes the function impure (it mutates browser history as a side effect). The function is called inside a click handler in `App.tsx`, so this is currently low-risk, but the coupling to global browser APIs makes future testing or SSR harder.
**Fix:** Accept an optional `location` parameter or extract the URL manipulation into a separate function that can be stubbed in tests.

### IN-02: `handleCopy` is duplicated verbatim across LobbyPanel and BoardView

**File:** `src/components/LobbyPanel.tsx:20-27` and `src/components/BoardView.tsx:22-29`
**Issue:** Identical clipboard copy logic including the `BASE_URL` construction and 2-second timeout appears in both components. If the URL construction logic changes, both must be updated.
**Fix:** Extract to a shared `useCopyRoomLink(roomId)` hook or utility function.

### IN-03: Magic number `2000` (copied feedback timeout) and `4000` (WebSocket close code)

**File:** `src/components/LobbyPanel.tsx:25`, `src/components/BoardView.tsx:27`, `party/index.ts:116`
**Issue:** The 2-second feedback timeout (`2000` ms) appears in two files with no named constant. The WebSocket close code `4000` is an application-defined code used in `onConnect` — its meaning ("Room is full") is only communicated in the adjacent string, not as a named constant. Both are low-risk but would benefit from named constants for clarity.
**Fix:**
```typescript
// In a shared constants file or at the top of each module:
const COPY_FEEDBACK_DURATION_MS = 2000;
const WS_CLOSE_ROOM_FULL = 4000;
```

---

_Reviewed: 2026-04-13T04:11:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
