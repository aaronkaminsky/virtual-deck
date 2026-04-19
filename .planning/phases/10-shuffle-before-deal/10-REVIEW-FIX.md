---
phase: 10-shuffle-before-deal
fixed_at: 2026-04-18T00:00:00Z
review_path: .planning/phases/10-shuffle-before-deal/10-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-04-18T00:00:00Z
**Source review:** .planning/phases/10-shuffle-before-deal/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `getConnections()` iterator exhausted — `broadcastState` sends nothing after `broadcastShuffleEvent`

**Files modified:** `party/index.ts`
**Commit:** 835538f
**Applied fix:** Spread `this.room.getConnections()` into an array with `[...this.room.getConnections()]` in both `broadcastShuffleEvent` and `broadcastState`. Each method now snapshots the connection list independently, so neither call can exhaust an iterator shared with the other.

---

### WR-02: `setTimeout` cleanup race — stale `isShuffling` if `PILE_SHUFFLED` fires twice for the same pile

**Files modified:** `src/hooks/usePartySocket.ts`
**Commit:** 0f6e7e8
**Applied fix:** Added `shuffleTimersRef` (`useRef<Map<string, ReturnType<typeof setTimeout>>>`). The `PILE_SHUFFLED` handler now cancels any existing timer for the pile before registering a new one, and stores the new timer in the ref. The `useEffect` cleanup function clears all pending timers before closing the socket, preventing `setShufflingPileIds` calls on unmounted components.

---

### WR-03: `await setTimeout` inside PartyKit hibernation handler may not behave as intended

**Files modified:** `party/index.ts`
**Commit:** 0c22ba1
**Applied fix:** Added a multi-line comment at the `await new Promise(resolve => setTimeout(resolve, 650))` call documenting that the delay relies on Cloudflare Workers not hibernating during an active `onMessage` handler, and that the animation window is best-effort under hibernation mode. No behavioral change — risk accepted as documented.

---

_Fixed: 2026-04-18T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
