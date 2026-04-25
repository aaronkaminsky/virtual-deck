---
phase: 14-gameplay-zone-infrastructure
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/shared/types.ts
  - party/index.ts
  - tests/spreadZoneCreation.test.ts
  - tests/moveCard.test.ts
  - tests/resetTable.test.ts
  - tests/deck.test.ts
  - src/components/SpreadZone.tsx
  - src/components/BoardView.tsx
  - playwright/game.spec.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase adds spread zone infrastructure: a communal zone and per-player personal zones backed by the existing `Pile` data model. The core logic is sound and the idempotent zone creation on connect is correctly implemented. However, two critical issues need attention: the `playerToken` used as a pile ID component is not validated for safe characters, enabling a player to inject an ID that collides with `spread-communal`; and the card masking in `viewFor` does not account for spread zones — all cards in any pile that have `faceUp: false` on the card object can be unmasked by the top-card-always-visible rule, which is an unintended privacy leak if spread zones ever hold face-down cards. Four warnings cover missing ownership authorization on `SET_PILE_FACE`/`FLIP_CARD`, a snapshot taken before `DEAL_CARDS` completion, a variable shadowing bug in `MOVE_CARD`, and a missing onStart migration gap for personal spread zones on server restart. Three info items cover dead prop, duplicate helper definitions, and weak E2E assertions.

---

## Critical Issues

### CR-01: Player token not validated for safe characters — ID collision possible

**File:** `party/index.ts:137`
**Issue:** `playerToken` is only length-capped at 64 characters. A client can connect with `?player=communal` and generate the pile ID `spread-communal`, which is the same ID as the hardcoded communal zone. The check on line 161 (`!this.gameState.piles.some(p => p.id === spreadZoneId)`) will find the communal pile and skip zone creation, but then `ownerId` on that pile remains `null` while `viewFor` returns `myPlayZoneId = "spread-communal"` for this player — the player's personal zone points to the shared communal zone. Any cards that player drags there become visible to all players, breaking the intended isolation. A client can also use the token `draw`, `discard`, or `play` to produce IDs that would collide with standard pile IDs if the `spread-` prefix is removed in a future refactor; the prefix prevents those collisions today but the lack of validation is a structural gap.

**Fix:**
```typescript
// party/index.ts, in onConnect after line 137
const playerToken = rawToken.slice(0, 64);
// Reject tokens that would produce a reserved spread zone ID
const spreadZoneId = `spread-${playerToken}`;
const RESERVED_IDS = new Set(["spread-communal"]);
if (RESERVED_IDS.has(spreadZoneId)) {
  connection.close(4001, "Reserved player ID — choose a different name");
  return;
}
```

Alternatively, validate that `playerToken` matches a safe character set (alphanumeric + `-_`) and reject anything else, which also prevents other injection paths:
```typescript
if (!/^[\w-]{1,64}$/.test(playerToken)) {
  connection.close(4001, "Invalid player token");
  return;
}
```

---

### CR-02: `viewFor` masking logic leaks top card of spread zones even when face-down

**File:** `party/index.ts:72-74`
**Issue:** The masking rule is: reveal a card if `card.faceUp === true` **or** the card is the last element of the pile (top of stack). This rule was designed for draw-pile stacks where the top card is always "peeked." For spread zones, every card is logically visible but the server still applies this pile-stack rule — meaning if someone moves a face-down card into a spread zone, the top card will be unmasked for all clients regardless of `faceUp`. More importantly, the masking rule is pile-wide (no per-player context) and does not account for `ownerId`. If spread zones are ever used for private fan-out (a potential future requirement), the top-card exposure would be a privacy violation. Even today, a player who intentionally places a face-down card into the communal zone will find it revealed to all players due to the top-card exception.

The issue is not purely hypothetical: `SET_PILE_FACE` can set a spread zone to `faceUp: false`, and any card subsequently dragged there lands face-down but is still unmasked for all viewers because it is the top (last) element.

**Fix:** The masking condition should respect the pile's `region`. For spread zones, every card should be visible to all (since spread zones are always face-up by design), making the top-card exception unnecessary and the masking rule should short-circuit. If future private spread zones are planned, the condition should additionally check `ownerId`:

```typescript
cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
  if (pile.region === "spread") {
    // Spread zones are always fully visible — no masking
    return card;
  }
  const isTop = i === arr.length - 1;
  return card.faceUp || isTop ? card : { faceUp: false as const };
}),
```

This also makes the intent explicit and removes the implicit dependency on `card.faceUp` state for spread zone cards.

---

## Warnings

### WR-01: `SET_PILE_FACE` and `FLIP_CARD` have no ownership authorization

**File:** `party/index.ts:300-312, 314-335`
**Issue:** Any player can send `SET_PILE_FACE` or `FLIP_CARD` targeting any pile ID, including another player's personal spread zone (`spread-<otherId>`). There is no check that the sender owns the pile (`pile.ownerId === senderToken`). This allows one player to flip or face-toggle another player's private spread zone contents.

**Fix:** Add an ownership check before mutating:
```typescript
case "SET_PILE_FACE": {
  const pile = this.gameState.piles.find(p => p.id === action.pileId);
  // ... existing pile-not-found check ...
  if (pile.ownerId !== null && pile.ownerId !== senderToken) {
    sender.send(JSON.stringify({
      type: "ERROR",
      code: "UNAUTHORIZED",
      message: "Cannot modify another player's spread zone",
    } satisfies ServerEvent));
    break;
  }
  // ... rest of handler
```

Apply the same pattern to `FLIP_CARD`. The communal zone (`ownerId: null`) stays open to all players by this rule.

---

### WR-02: Variable shadowing — inner `idx` shadows outer `idx` in `MOVE_CARD`

**File:** `party/index.ts:274`
**Issue:** The `MOVE_CARD` handler declares `const idx = source.findIndex(...)` at line 233. Inside the `pos === 'random'` branch (line 272), a new `const idx = ...` is declared, shadowing the outer variable. TypeScript does not error on this because `const` in a block scope is permitted. At runtime it works correctly because the inner `idx` is only used within its block, but it is a maintenance hazard: any future code added between those lines that intends to reference the splice index (outer `idx`) could silently read the wrong value.

**Fix:** Rename the inner variable:
```typescript
const insertIdx = dest.length === 0 ? 0 : buf[0] % (dest.length + 1);
dest.splice(insertIdx, 0, card);
```

---

### WR-03: `onStart` migration does not restore personal spread zones after server restart

**File:** `party/index.ts:97-132`
**Issue:** When a room hibernates and restores persisted state (`onStart`), the migration block seeds `spread-communal` if missing, but does not recreate personal spread zones for players who were already in the room. After a cold restart, a returning player's `spread-<token>` pile will exist in the persisted state (good), but a player who had connected before the last persist and whose zone was added will be fine — however, any player whose personal zone was somehow absent from persisted state (e.g., state was persisted before Phase 14 and that player's zone was never seeded by `onConnect`) will have no personal zone until they reconnect. The larger problem is structural: the migration only seeds the communal zone; it does not scan existing players and seed their zones if absent, unlike what `onConnect` does. After a server upgrade deployment, old persisted states with `players` records but no `spread-<token>` piles will remain incomplete until each player individually reconnects.

**Fix:** Add a player-zone migration loop alongside the communal zone migration:
```typescript
// After seeding spread-communal:
for (const player of this.gameState.players) {
  const zoneId = `spread-${player.id}`;
  if (!this.gameState.piles.some(p => p.id === zoneId)) {
    this.gameState.piles.push({
      id: zoneId,
      name: player.displayName || player.id.slice(0, 8),
      cards: [],
      faceUp: true,
      region: "spread",
      ownerId: player.id,
    });
  }
}
```

---

### WR-04: `takeSnapshot` is called before `DEAL_CARDS` completes — snapshot captures pre-deal state correctly, but the 650ms `await` leaves `gameState` mutated midway if the worker is evicted

**File:** `party/index.ts:385-402`
**Issue:** `takeSnapshot` is called at line 385, then the draw pile is shuffled, then the code `await`s a 650ms timer before actually distributing cards. The existing comment acknowledges the eviction risk. The concrete correctness problem: if the Cloudflare Worker is evicted after the shuffle but before the deal loop completes, `persist()` will not be called (it's at line 455, after the switch), the in-memory state will be lost, and on reconnect `onStart` will restore the pre-deal snapshot from storage. The shuffle event will have been broadcast but cards will not have been dealt — clients will see a "shuffle happened" event but the state they receive on reconnect will show undealt cards. The snapshot taken at line 385 captures the correct pre-deal state, which is good for undo, but the window between shuffle broadcast and persist creates an observable inconsistency.

This is a pre-existing structural issue with the hibernation model, but the 650ms deliberate delay significantly widens the eviction window compared to synchronous handlers.

**Fix (mitigation):** Move `persist()` to immediately after the deal loop, before `broadcastState()`, to minimize the window. Also consider removing or reducing the 650ms delay — if the animation window is purely cosmetic on the client side, it can be handled client-side without blocking the server:
```typescript
// Persist immediately after state mutation, before the switch block's
// common persist() call — or restructure so the await happens before
// state mutation, not during it.
```

---

## Info

### IN-01: `draggingCardId` prop is received but immediately discarded in `SpreadZone`

**File:** `src/components/SpreadZone.tsx:14`
**Issue:** The prop is destructured as `draggingCardId: _draggingCardId`, indicating it was intentionally suppressed. All three call sites in `BoardView.tsx` pass `draggingCardId` through. If the prop is genuinely not needed in `SpreadZone` (e.g., the highlighting logic was moved to the droppable overlay), the prop should be removed from the interface and the call sites updated to avoid dead surface area.

**Fix:** Remove `draggingCardId` from `SpreadZoneProps` and from all three `SpreadZone` invocations in `BoardView.tsx` if it is confirmed unused. If it will be used in a follow-up (card highlight on hover), add a TODO comment to make the intent explicit.

---

### IN-02: `makeMockRoom` and `makeMockConnection` defined in both `tests/helpers.ts` and inline in `tests/moveCard.test.ts` / `tests/resetTable.test.ts`

**File:** `tests/moveCard.test.ts:10-32`, `tests/resetTable.test.ts:10-32`
**Issue:** `tests/helpers.ts` exports canonical `makeMockRoom` and `makeMockConnection` implementations. Both `moveCard.test.ts` and `resetTable.test.ts` define their own local copies that are functionally identical. The `spreadZoneCreation.test.ts` correctly imports from `helpers.ts`. The local copies will drift from the shared helper over time (they already differ slightly: the local versions do not include `setState` in `makeMockConnection`).

**Fix:** Replace the local definitions in `moveCard.test.ts` and `resetTable.test.ts` with imports from `./helpers`:
```typescript
import { makeMockRoom, makeMockConnection } from "./helpers";
```

---

### IN-03: E2E spread zone test asserts `>= 2` zones but does not verify the personal zone is the player's own

**File:** `playwright/game.spec.ts:137-140`
**Issue:** The spread zone visibility test counts `[data-testid^="spread-zone-spread-"]` elements and asserts `>= 2`. This would pass even if both zones shown were the communal zone rendered twice (which cannot happen with current code but makes the assertion weaker than it appears). The test does not assert that the player's own zone ID (`spread-zone-spread-<playerId>`) is present, because the player token is opaque in the test. This is a reasonable trade-off, but it means a regression where `mySpreadZone` is undefined and the personal zone silently disappears would not be caught by count alone.

**Fix:** Consider adding an assertion that the page's spread row contains at least one zone that is not the communal zone, e.g. by asserting that the locator matching `spread-zone-spread-` with an ID that is not `spread-zone-spread-communal` has count >= 1:
```typescript
await expect(
  p1.locator('[data-testid^="spread-zone-spread-"]:not([data-testid="spread-zone-spread-communal"])')
).not.toHaveCount(0);
```

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
