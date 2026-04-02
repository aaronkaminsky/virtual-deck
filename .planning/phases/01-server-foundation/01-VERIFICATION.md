---
phase: 01-server-foundation
verified: 2026-04-01T17:24:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "viewFor sends masked state to each player — no one sees face-down pile card identities"
    status: failed
    reason: "viewFor passes state.piles directly without stripping identity fields (id, suit, rank) from face-down pile cards. Any client can inspect WebSocket frames and see the full draw pile order and card identities."
    artifacts:
      - path: "party/index.ts"
        issue: "Line 53: `piles: state.piles` — raw pile data including card id/suit/rank sent to all connections regardless of faceUp value"
    missing:
      - "In viewFor, map over state.piles and for each pile card where faceUp === false, strip id/suit/rank before sending — return only { faceUp: false } or a sentinel object so clients know a card is present but cannot identify it"
human_verification:
  - test: "Connect 4 WebSocket clients simultaneously; attempt a 5th connection"
    expected: "First 4 connections succeed; 5th receives close code 4000 with reason 'Room is full'"
    why_human: "Player cap enforcement requires a live partykit dev session; count > 4 check can be read in code but live rejection behavior needs a running server"
  - test: "Start partykit dev; connect two players; Player 1 draws a card; inspect Player 2's WebSocket STATE_UPDATE frame"
    expected: "Player 2's frame shows opponentHandCounts: {'player-1': 1} and an empty myHand — no card face data for Player 1"
    why_human: "End-to-end hand masking confirmation requires live WebSocket traffic inspection in DevTools"
  - test: "Start partykit dev; allow room to go idle; reload; reconnect a client"
    expected: "State (players, hands, piles) is restored from storage — not reset to defaultGameState"
    why_human: "Hibernation storage restore requires live partykit dev with actual idle timeout"
---

# Phase 1: Server Foundation Verification Report

**Phase Goal:** Prove that the PartyKit server can manage authoritative game state, enforce hand privacy, and cap players at 4 — before any client code is written.
**Verified:** 2026-04-01T17:24:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A room can be created and a 52-card deck is initialized on the server with correct card identities | VERIFIED | `buildDeck()` returns 52 cards via SUITS.flatMap; 9 unit tests pass covering count, no duplicate IDs, suit distribution, ID format, faceUp:false; `defaultGameState` places all 52 in draw pile |
| 2 | Shuffling uses `crypto.getRandomValues` server-side (Fisher-Yates) — no client-side randomness | VERIFIED | `party/index.ts:21-24`: Fisher-Yates loop with `crypto.getRandomValues(new Uint32Array(1))`; `Math.random` absent (grep returns 0); 5 shuffle unit tests pass including Math.random spy check |
| 3 | When a player joins, they receive a `ClientGameState` where `myHand` contains only their cards; no other player's hand cards in the frame | PARTIAL | `viewFor` correctly masks hands (7 unit tests pass including `"hands" in view` check). Gap: pile cards are NOT masked — face-down pile card identities (id, suit, rank) are sent in full to all clients, exposing draw pile order. Hand masking itself is correct; pile masking is absent. |
| 4 | Up to 4 players can connect; a 5th connection is rejected | VERIFIED (code) / HUMAN NEEDED (live) | `party/index.ts:72-76`: `count > 4` check after spread of `getConnections()`; closes with code 4000 and reason "Room is full — maximum 4 players". Pattern is correct. Live verification flagged for human. |
| 5 | Server state survives room hibernation — reloading restores previous state | VERIFIED (code) / HUMAN NEEDED (live) | `onStart` at line 65-69 restores from `room.storage.get<GameState>("gameState")`; `persist()` called after every mutation; `static options = { hibernate: true }` at line 58. Pattern is correct. Live hibernation cycle flagged for human. |

**Score:** 4/5 truths verified (Truth 3 partially fails due to pile masking gap)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Project manifest with partykit, nanoid, vitest, typescript | VERIFIED | Contains all four dependencies at specified versions; type: module; scripts: dev/deploy/test/typecheck |
| `tsconfig.json` | TypeScript configuration | VERIFIED | strict: true, moduleResolution: bundler, rootDir: ".", @shared path alias present |
| `partykit.json` | PartyKit project config | VERIFIED | main: "party/index.ts", compatibilityDate: 2023-10-01 |
| `vitest.config.ts` | Vitest configuration | VERIFIED | include: ["tests/**/*.test.ts"], @shared alias matches tsconfig |
| `src/shared/types.ts` | Card, GameState, ClientGameState, message types | VERIFIED | All 9 exports present: Suit, Rank, Card, Player, Pile, GameState, ClientGameState, ClientAction, ServerEvent |
| `party/index.ts` | Complete GameRoom with all lifecycle hooks and pure functions | VERIFIED (with gap) | All exports present; all lifecycle hooks implemented; pile masking absent in viewFor |
| `tests/deck.test.ts` | Tests for buildDeck and defaultGameState | VERIFIED | 9 tests, all passing |
| `tests/shuffle.test.ts` | Tests for Fisher-Yates shuffle | VERIFIED | 5 tests, all passing |
| `tests/viewFor.test.ts` | Tests for hand masking | VERIFIED | 7 tests, all passing — but no test covers face-down pile card masking (the gap is untested) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/*.test.ts` | `src/shared/types.ts` | import type references | VERIFIED | All three test files import types from `../src/shared/types` |
| `vitest.config.ts` | `tests/` | include glob | VERIFIED | `"tests/**/*.test.ts"` — all 3 test files discovered and run |
| `party/index.ts` | `src/shared/types.ts` | import type | VERIFIED | Line 2: imports Card, ClientAction, ClientGameState, GameState, ServerEvent, Suit, Rank |
| `party/index.ts onStart` | `this.room.storage.get` | await storage restore | VERIFIED | Line 67: `await this.room.storage.get<GameState>("gameState")` |
| `party/index.ts onConnect` | `this.room.getConnections` | player count check | VERIFIED | Line 72: `[...this.room.getConnections()].length` with `count > 4` check |
| `party/index.ts broadcastState` | `viewFor` | per-connection masked send | VERIFIED | Line 151: `viewFor(this.gameState, conn.id)` called per connection — no `this.room.broadcast` used |
| `party/index.ts onMessage` | `this.room.storage.put` | persist after mutation | VERIFIED | Line 129: `await this.persist()` called after SHUFFLE_DECK and DRAW_CARD |

---

### Data-Flow Trace (Level 4)

This phase produces no UI components — all artifacts are pure server-side logic and configuration. Level 4 data-flow trace is not applicable; data correctness is covered by unit tests.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 21 unit tests pass | `npx vitest run --reporter=verbose` | 3 files, 21 tests, 0 failures | PASS |
| TypeScript compiles with no errors | `npx tsc --noEmit` | exit 0, no output | PASS |
| Math.random not used in shuffle | `grep "Math.random" party/index.ts` | no matches | PASS |
| crypto.getRandomValues present | `grep "crypto.getRandomValues" party/index.ts` | line 22: match | PASS |
| room.broadcast not used (would break hand masking) | `grep "room.broadcast" party/index.ts` | no matches | PASS |
| Hibernation opt-in present | `grep "static options" party/index.ts` | line 58: `static options = { hibernate: true }` | PASS |
| piles sent unmasked in viewFor | `grep "piles: state.piles" party/index.ts` | line 53: match | FAIL — pile masking absent |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DECK-01 | 01-01, 01-02, 01-03 | Room initializes with a standard 52-card deck | SATISFIED | `buildDeck()` generates 52 unique cards; `defaultGameState` places all in draw pile; 9 tests verify this |
| DECK-02 | 01-01, 01-02, 01-03 | Deck shuffle uses cryptographically random Fisher-Yates + crypto.getRandomValues, server-side | SATISFIED | `shuffle()` uses `crypto.getRandomValues(new Uint32Array(1))` per swap iteration; Math.random absent; 5 tests verify including spy check |
| CARD-05 | 01-01, 01-02, 01-03 | Player's hand is private — other players see only card backs, enforced server-side | PARTIALLY SATISFIED | Hand masking is correct and unit-tested. Pile card masking is absent — face-down pile card identities visible to all clients. The core value statement ("no one able to see each other's face-down cards") is violated for shared piles. |
| ROOM-03 | 01-03 | Room supports 2–4 simultaneous players | SATISFIED (code) | `count > 4` check in `onConnect` closes 5th connection with code 4000; implementation is correct per plan spec; live test flagged for human |

No orphaned requirements found — REQUIREMENTS.md traceability table maps all four IDs to Phase 1, and all four appear in the plans' `requirements` fields.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `party/index.ts` | 53 | `piles: state.piles` — raw pile data passed through viewFor with no masking | BLOCKER | Violates core value: "no one able to see each other's face-down cards". Any client can read draw pile card order from WebSocket frames. Does not affect hand privacy but does expose pile composition. |

No TODO/FIXME/PLACEHOLDER comments found in source files. No `Math.random` usage. No `this.room.broadcast` (correct — per-connection broadcast used instead). No other stub patterns found.

---

### Human Verification Required

#### 1. 5th Connection Rejection (ROOM-03 live test)

**Test:** Start `npx partykit dev`. Open 5 WebSocket connections to the same room using browser DevTools:
```
const ws5 = new WebSocket("ws://127.0.0.1:1999/party/test-room?_pk=player-5");
ws5.onclose = (e) => console.log("WS5 closed:", e.code, e.reason);
```
**Expected:** ws5 receives close code 4000, reason "Room is full — maximum 4 players"
**Why human:** Requires live partykit dev server; player count depends on actual WebSocket connection state

#### 2. Hand Masking End-to-End (CARD-05 live test)

**Test:** Start `npx partykit dev`. Connect two players. Have Player 1 draw a card via `DRAW_CARD`. Inspect Player 2's STATE_UPDATE WebSocket frame in DevTools Network tab.
**Expected:** Player 2's frame contains `opponentHandCounts: {"player-1": 1}`, `myHand: []` — no card face data (no suit/rank/id) for Player 1's card
**Why human:** End-to-end frame inspection requires live server and DevTools

#### 3. Hibernation State Restore

**Test:** Start `npx partykit dev`. Connect, draw some cards to create non-default state. Allow server to idle. Reconnect and observe the STATE_UPDATE.
**Expected:** Restored state matches pre-idle state (same hands, same pile contents) rather than fresh defaultGameState
**Why human:** Actual hibernation cycle duration depends on partykit internals; cannot be verified by grep

---

### Gaps Summary

One gap blocks full goal achievement:

**Pile card masking absent in `viewFor`.** The `viewFor` function at `party/index.ts:53` passes `piles: state.piles` to the client without filtering face-down card identities. A client connected to any room can inspect the draw pile card order in their WebSocket frames. This directly violates the project's core value: "no one able to see each other's face-down cards."

The fix is well-scoped: in `viewFor`, map over `state.piles` and for each pile, replace face-down cards with a stripped object (e.g., `{ faceUp: false }`) that preserves count without revealing identity. A corresponding test should be added to `tests/viewFor.test.ts` verifying that face-down pile cards arrive without `id`, `suit`, or `rank`.

This gap was identified during manual testing and is acknowledged in `01-03-SUMMARY.md` under "Known Stubs / Gaps". It was not implemented in Phase 1 and must be addressed before Phase 3 (Core Board) ships, as the board will render pile cards and expose the masking gap visually.

The four other Phase 1 success criteria are met: deck initialization is correct, shuffle uses crypto.getRandomValues, hand masking works correctly, and the 4-player cap is implemented with the correct close code.

---

_Verified: 2026-04-01T17:24:00Z_
_Verifier: Claude (gsd-verifier)_
