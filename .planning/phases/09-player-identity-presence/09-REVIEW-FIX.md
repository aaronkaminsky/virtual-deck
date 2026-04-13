---
phase: 09-player-identity-presence
fixed_at: 2026-04-13T04:30:00Z
review_path: .planning/phases/09-player-identity-presence/09-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-04-13T04:30:00Z
**Source review:** .planning/phases/09-player-identity-presence/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Unhandled clipboard rejection in LobbyPanel and BoardView

**Files modified:** `src/components/LobbyPanel.tsx`, `src/components/BoardView.tsx`
**Commit:** 853d8d4
**Applied fix:** Added `.catch(() => { ... })` handler to the `navigator.clipboard.writeText(url).then(...)` call in both components. Unhandled promise rejections on clipboard access denial (non-HTTPS, permission denied) are now silently caught rather than surfacing as uncaught exceptions.

### WR-01: Client-supplied player token accepted without format validation

**Files modified:** `party/index.ts`
**Commit:** 33b65a2
**Applied fix:** Extracted raw token to `rawToken`, then applied `.slice(0, 64)` before assigning to `playerToken`. Prevents arbitrarily long strings from being stored in game state and persisted to durable storage.

### WR-02: displayName XSS potential if rendered via innerHTML (defense-in-depth gap)

**Files modified:** `party/index.ts`
**Commit:** d46f0d9
**Applied fix:** Chained `.replace(/[<>"'&]/g, '')` onto the existing `.slice(0, 20)` in the `displayName` extraction. HTML metacharacters are now stripped server-side before the name is stored in `GameState` or broadcast to clients.

### WR-03: usePartySocket reconnects on displayName change, leaking stale state

**Files modified:** `src/hooks/usePartySocket.ts`
**Commit:** b06e6d7
**Applied fix:** Added `displayNameRef` (`useRef`) initialized to `displayName`, kept current on every render via `displayNameRef.current = displayName`. The `PartySocket` query now reads `displayNameRef.current` at connect time. Removed `displayName` from the `useEffect` dependency array — reconnects no longer trigger on name changes.

### WR-04: JSON.parse in onMessage throws on non-string message input

**Files modified:** `party/index.ts`
**Commit:** a100bcd
**Applied fix:** Added an explicit `typeof message !== 'string'` guard at the top of `onMessage`. If a binary frame arrives, the handler immediately responds with an `INVALID_MESSAGE` error and returns, rather than relying on coercion-and-catch behavior.

---

_Fixed: 2026-04-13T04:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
