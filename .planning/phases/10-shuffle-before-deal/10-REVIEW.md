---
phase: 10-shuffle-before-deal
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - party/index.ts
  - src/App.tsx
  - src/components/BoardDragLayer.tsx
  - src/components/BoardView.tsx
  - src/components/PileZone.tsx
  - src/globals.css
  - src/hooks/usePartySocket.ts
  - src/shared/types.ts
  - tests/dealCards.test.ts
  - tests/shufflePile.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 10 adds a shuffle-before-deal animation: the server shuffles the draw pile before dealing, broadcasts a `PILE_SHUFFLED` event, waits 650ms, then deals. Clients render ghost card fan divs with a CSS animation on receiving the event. The approach is sound and the new code is clean. No security vulnerabilities or data loss risks were found.

Three warnings: the `getConnections()` iterator is consumed once in `broadcastShuffleEvent` and then immediately consumed again (exhausted) in `broadcastState`, dropping the state update for every connection. There is also a race condition in the client timer that can leave stale `shufflingPileIds` entries if `PILE_SHUFFLED` for the same pile fires twice in quick succession, and the 650ms server-side `setTimeout` holds the PartyKit `onMessage` handler open during hibernation, which can cause the delay to be skipped or inconsistent.

---

## Warnings

### WR-01: `getConnections()` iterator exhausted — `broadcastState` sends nothing after `broadcastShuffleEvent`

**File:** `party/index.ts:430-446`

In both the `DEAL_CARDS` and `SHUFFLE_PILE` code paths, `broadcastShuffleEvent` is called before the `onMessage` handler falls through to `broadcastState`. Both methods call `this.room.getConnections()`. In PartyKit, `getConnections()` returns a _one-shot iterator_, not a live iterable that re-queries on each call. After `broadcastShuffleEvent` exhausts the iterator, the `for...of` loop in `broadcastState` sees an already-exhausted iterator and sends nothing — every connected client receives the `PILE_SHUFFLED` event but no follow-up `STATE_UPDATE`.

Repro path:
1. `SHUFFLE_PILE` handler calls `broadcastShuffleEvent` — iterator exhausted.
2. `onMessage` falls through to `broadcastState` — iterator already at end, zero sends.
3. Clients never receive the new shuffled pile order.

**Fix:** Cache the connections into an array once per broadcast cycle, or drive both broadcasts from a single iteration:

```typescript
private broadcastAll(shufflePileId?: string) {
  for (const conn of this.room.getConnections()) {
    if (shufflePileId) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId: shufflePileId,
      } satisfies ServerEvent));
    }
    conn.send(JSON.stringify({
      type: "STATE_UPDATE",
      state: viewFor(this.gameState, getPlayerToken(conn)),
    } satisfies ServerEvent));
  }
}
```

Then replace the `broadcastShuffleEvent` + `broadcastState` pairs with a single `broadcastAll("draw")` / `broadcastAll(action.pileId)` call. For `DEAL_CARDS`, keep the 650ms `await` between the shuffle broadcast and the state update broadcast by splitting the loop, but iterate connections into an array first:

```typescript
const conns = [...this.room.getConnections()];
for (const conn of conns) {
  conn.send(JSON.stringify({ type: "PILE_SHUFFLED", pileId: "draw" } satisfies ServerEvent));
}
await new Promise(resolve => setTimeout(resolve, 650));
// ... deal loop ...
for (const conn of conns) {
  conn.send(JSON.stringify({ type: "STATE_UPDATE", state: viewFor(this.gameState, getPlayerToken(conn)) } satisfies ServerEvent));
}
```

> Note: Whether `getConnections()` returns a reusable iterable or a one-shot iterator depends on the PartyKit runtime version. Verify against the current PartyKit docs. If `getConnections()` is reusable, this warning does not apply — but the fix is safe either way and removes the dependency on that behavior.

---

### WR-02: `setTimeout` cleanup race — stale `isShuffling` if `PILE_SHUFFLED` fires twice for the same pile

**File:** `src/hooks/usePartySocket.ts:50-59`

Each `PILE_SHUFFLED` message registers an independent `setTimeout(..., 650)` that calls `next.delete(pileId)`. If two `PILE_SHUFFLED` events arrive for the same pile within 650ms (e.g., a user triggers shuffle, then DEAL_CARDS also shuffles "draw"), the second event adds the pile ID again and both timers independently try to delete it. The first timer fires and removes the pile ID correctly; the second timer fires 0–650ms later and also deletes it — which is harmless. However the inverse is the real problem: if the socket unmounts between the event and the timer callback, the `setTimeout` fires against a stale closure and calls `setShufflingPileIds` on an unmounted component, producing a React warning and potential no-op state corruption on remount.

**Fix:** Track the cleanup timer in a `useRef` so it can be cancelled on unmount and on duplicate events:

```typescript
const shuffleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

// Inside the message handler:
} else if (event.type === 'PILE_SHUFFLED') {
  const { pileId } = event;
  // Cancel any existing timer for this pile before starting a new one
  const existing = shuffleTimersRef.current.get(pileId);
  if (existing !== undefined) clearTimeout(existing);

  setShufflingPileIds(prev => new Set([...prev, pileId]));
  const timer = setTimeout(() => {
    setShufflingPileIds(prev => {
      const next = new Set(prev);
      next.delete(pileId);
      return next;
    });
    shuffleTimersRef.current.delete(pileId);
  }, 650);
  shuffleTimersRef.current.set(pileId, timer);
}

// In the useEffect cleanup:
return () => {
  ws.close();
  wsRef.current = null;
  for (const t of shuffleTimersRef.current.values()) clearTimeout(t);
  shuffleTimersRef.current.clear();
};
```

---

### WR-03: `await setTimeout` inside PartyKit hibernation handler may not behave as intended

**File:** `party/index.ts:349`

```typescript
await new Promise(resolve => setTimeout(resolve, 650)); // D-06: animation window (650ms)
```

PartyKit with `static options = { hibernate: true }` (line 86) can checkpoint or evict a Worker between the shuffle and the deal. When the Worker is evicted and revived mid-`await`, the `setTimeout` callback may never fire (the timer is held in the old isolate's heap), causing the deal to either hang indefinitely or the promise to be rejected depending on the runtime's behavior. The 650ms window was designed to let clients animate — but if the Worker hibernates, no animation occurs anyway because the `PILE_SHUFFLED` broadcast happened before the delay.

This is a behavioral risk rather than a guaranteed crash: Cloudflare Workers do not hibernate _during_ an active request/message, so in practice the `setTimeout` will likely resolve before eviction. But it is fragile: it relies on undocumented timing guarantees of the Workers runtime under load.

**Fix:** Accept the risk if the animation is considered best-effort. If reliability matters, move the 650ms gate to the client: the client already has the `shufflingPileIds` set and the 650ms timer; the server can send `STATE_UPDATE` immediately and let the client hold off on visually reflecting it. This would require a client-side "pending state" buffer keyed to `pileId`, which is a larger design change. At minimum, document the assumption with a comment so future maintainers understand the dependency.

---

## Info

### IN-01: Unused import `defaultGameState` in test files

**File:** `tests/dealCards.test.ts:2`, `tests/shufflePile.test.ts:2`

Both test files import `defaultGameState` from `party/index.ts` but never use it directly — they rely on `new GameRoom(mockRoom)` which calls `defaultGameState` internally. The import is dead code.

**Fix:** Remove `defaultGameState` from both import lines:
```typescript
import GameRoom from "../party/index";
```

---

### IN-02: CSS animation uses inline `animationName` string instead of Tailwind class

**File:** `src/components/PileZone.tsx:58-67`

The shuffle ghost cards apply animation properties via an inline `style` object with `animationName: 'pile-fan-spread'`. The keyframe is defined in `globals.css`. This works, but it bypasses the Tailwind layer and is inconsistent with how the rest of the component applies styles (via `cn()` / Tailwind classes). A future Tailwind config change (e.g., content purging, CSS layer reordering) could silently break the animation.

This is a minor consistency note, not a bug — the current implementation is functional.

**Fix (optional):** Register the animation in `tailwind.config.ts` under `theme.extend.animation` and `theme.extend.keyframes`, then apply it as a class: `className="animate-pile-fan-spread"`. This keeps all animation declarations in one place and makes the animation tree-shakeable.

---

_Reviewed: 2026-04-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
