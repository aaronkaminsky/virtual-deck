---
phase: 01-server-foundation
verified: 2026-04-02T01:45:00Z
status: passed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "viewFor now strips id, suit, rank from face-down pile cards — only { faceUp: false } sent to clients"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Connect 4 WebSocket clients simultaneously; attempt a 5th connection"
    expected: "First 4 connections succeed; 5th receives close code 4000 with reason 'Room is full — maximum 4 players'"
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
**Verified:** 2026-04-01T17:52:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure plan 01-04

## Re-verification Summary

**Previous status:** gaps_found (4/5)
**Current status:** human_needed (5/5 automated)
**Gap closed:** Pile card masking — `viewFor` now maps `state.piles` through a masking transform that reduces face-down cards to `{ faceUp: false }`, stripping `id`, `suit`, and `rank`. Three new tests added to `tests/viewFor.test.ts` covering face-down strip, face-up preservation, and count preservation. All 24 unit tests pass.

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A room can be created and a 52-card deck is initialized on the server with correct card identities | VERIFIED | `buildDeck()` returns 52 cards via SUITS.flatMap; 9 unit tests pass covering count, no duplicate IDs, suit distribution, ID format, faceUp:false; `defaultGameState` places all 52 in draw pile |
| 2 | Shuffling uses `crypto.getRandomValues` server-side (Fisher-Yates) — no client-side randomness | VERIFIED | `party/index.ts:21-24`: Fisher-Yates loop with `crypto.getRandomValues(new Uint32Array(1))`; `Math.random` absent (grep returns 0); 5 shuffle unit tests pass including Math.random spy check |
| 3 | When a player joins, they receive a `ClientGameState` where `myHand` contains only their cards; no other player's hand cards in the frame | VERIFIED | `viewFor` correctly masks hands (7 unit tests pass). Pile card masking now closed: `party/index.ts:53-61` maps face-down pile cards to `{ faceUp: false }` — id/suit/rank stripped. 3 new tests verify this. Live WebSocket inspection still flagged for human. |
| 4 | Up to 4 players can connect; a 5th connection is rejected | VERIFIED (code) / HUMAN NEEDED (live) | `party/index.ts:81-84`: `count > 4` check after spread of `getConnections()`; closes with code 4000 and reason "Room is full — maximum 4 players". Pattern is correct. Live verification flagged for human. |
| 5 | Server state survives room hibernation — reloading restores previous state | VERIFIED (code) / HUMAN NEEDED (live) | `onStart` at line 73-76 restores from `room.storage.get<GameState>("gameState")`; `persist()` called after every mutation; `static options = { hibernate: true }` at line 66. Pattern is correct. Live hibernation cycle flagged for human. |

**Score:** 5/5 truths verified (live behavior for truths 4 and 5 requires human testing)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Project manifest with partykit, nanoid, vitest, typescript | VERIFIED | Contains all four dependencies at specified versions; type: module; scripts: dev/deploy/test/typecheck |
| `tsconfig.json` | TypeScript configuration | VERIFIED | strict: true, moduleResolution: bundler, rootDir: ".", @shared path alias present |
| `partykit.json` | PartyKit project config | VERIFIED | main: "party/index.ts", compatibilityDate: 2023-10-01 |
| `vitest.config.ts` | Vitest configuration | VERIFIED | include: ["tests/**/*.test.ts"], @shared alias matches tsconfig |
| `src/shared/types.ts` | Card, GameState, ClientGameState, message types, MaskedCard, ClientPile | VERIFIED | 11 exports present: Suit, Rank, Card, Player, Pile, MaskedCard, ClientPile, GameState, ClientGameState, ClientAction, ServerEvent. `ClientGameState.piles` is now `ClientPile[]`. |
| `party/index.ts` | Complete GameRoom with all lifecycle hooks, pure functions, pile masking in viewFor | VERIFIED | All exports present; all lifecycle hooks implemented; `viewFor` masks both hands and face-down pile cards; `piles: state.piles` bare pass-through removed |
| `tests/deck.test.ts` | Tests for buildDeck and defaultGameState | VERIFIED | 9 tests, all passing |
| `tests/shuffle.test.ts` | Tests for Fisher-Yates shuffle | VERIFIED | 5 tests, all passing |
| `tests/viewFor.test.ts` | Tests for hand masking and pile card masking | VERIFIED | 10 tests total (7 original + 3 new), all passing — includes face-down strip, face-up preserve, count preserve |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `party/index.ts` | `src/shared/types.ts` | import MaskedCard, ClientPile | VERIFIED | Line 2: imports Card, ClientAction, ClientGameState, ClientPile, GameState, MaskedCard, ServerEvent, Suit, Rank |
| `tests/*.test.ts` | `src/shared/types.ts` | import type references | VERIFIED | All three test files import types from `../src/shared/types` |
| `vitest.config.ts` | `tests/` | include glob | VERIFIED | `"tests/**/*.test.ts"` — all 3 test files discovered and run |
| `party/index.ts onStart` | `this.room.storage.get` | await storage restore | VERIFIED | Line 75: `await this.room.storage.get<GameState>("gameState")` |
| `party/index.ts onConnect` | `this.room.getConnections` | player count check | VERIFIED | Line 80: `[...this.room.getConnections()].length` with `count > 4` check |
| `party/index.ts broadcastState` | `viewFor` | per-connection masked send | VERIFIED | Line 159: `viewFor(this.gameState, conn.id)` called per connection — no `this.room.broadcast` used |
| `party/index.ts onMessage` | `this.room.storage.put` | persist after mutation | VERIFIED | `await this.persist()` called after SHUFFLE_DECK and DRAW_CARD and onClose |
| `viewFor pile masking` | `MaskedCard` sentinel | `card.faceUp ? card : { faceUp: false as const }` | VERIFIED | Lines 56-59: conditional strips identity from face-down cards; face-up cards pass through unchanged |

---

### Data-Flow Trace (Level 4)

This phase produces no UI components — all artifacts are pure server-side logic and configuration. Level 4 data-flow trace is not applicable; data correctness is covered by unit tests.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 24 unit tests pass | `npx vitest run --reporter=verbose` | 3 files, 24 tests, 0 failures | PASS |
| TypeScript compiles with no errors | `npx tsc --noEmit` | exit 0, no output | PASS |
| Math.random not used in shuffle | `grep "Math.random" party/index.ts` | no matches | PASS |
| crypto.getRandomValues present | `grep "crypto.getRandomValues" party/index.ts` | line 22: match | PASS |
| room.broadcast not used (would break hand masking) | `grep "room.broadcast" party/index.ts` | no matches | PASS |
| Hibernation opt-in present | `grep "static options" party/index.ts` | line 66: `static options = { hibernate: true }` | PASS |
| piles: state.piles bare pass-through gone | `grep "piles: state.piles,$" party/index.ts` | no matches | PASS |
| pile masking transform present | `grep "card.faceUp" party/index.ts` | line 57: match | PASS |
| MaskedCard type exported | `grep "MaskedCard" src/shared/types.ts` | line 22: `export type MaskedCard = { faceUp: false }` | PASS |
| ClientPile type exported | `grep "ClientPile" src/shared/types.ts` | lines 24-28: interface present | PASS |
| ClientGameState.piles is ClientPile[] | `grep "piles: ClientPile" src/shared/types.ts` | line 44: match | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DECK-01 | 01-01, 01-02, 01-03 | Room initializes with a standard 52-card deck | SATISFIED | `buildDeck()` generates 52 unique cards; `defaultGameState` places all in draw pile; 9 tests verify this; REQUIREMENTS.md marked complete |
| DECK-02 | 01-01, 01-02, 01-03 | Deck shuffle uses cryptographically random Fisher-Yates + crypto.getRandomValues, server-side | SATISFIED | `shuffle()` uses `crypto.getRandomValues(new Uint32Array(1))` per swap iteration; Math.random absent; 5 tests verify including spy check; REQUIREMENTS.md marked complete |
| CARD-05 | 01-01, 01-02, 01-03, 01-04 | Player's hand is private — other players see only card backs, enforced server-side | SATISFIED | Hand masking correct (7 tests). Pile card masking now correct (3 new tests). `viewFor` strips id/suit/rank from all face-down pile cards. No raw card identity reachable by any client for cards they should not see. REQUIREMENTS.md marked complete |
| ROOM-03 | 01-03 | Room supports 2–4 simultaneous players | SATISFIED (code) | `count > 4` check in `onConnect` closes 5th connection with code 4000; implementation correct; live test flagged for human; REQUIREMENTS.md marked complete |

No orphaned requirements — REQUIREMENTS.md traceability table maps all four IDs to Phase 1 and marks each complete. All four IDs appear across the plans' `requirements` fields.

---

### Anti-Patterns Found

No anti-patterns found. Specifically:
- No TODO/FIXME/PLACEHOLDER comments in source files
- No `Math.random` usage
- No `this.room.broadcast` (correct — per-connection broadcast preserves hand masking)
- No bare `piles: state.piles` pass-through (the previous blocker — now fixed)
- No stub implementations or empty return patterns in production code

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

#### 2. Hand and Pile Masking End-to-End (CARD-05 live test)

**Test:** Start `npx partykit dev`. Connect two players. Have Player 1 draw a card via `DRAW_CARD`. Inspect Player 2's STATE_UPDATE WebSocket frame in DevTools Network tab.
**Expected:** Player 2's frame contains `opponentHandCounts: {"player-1": 1}`, `myHand: []` — no card face data (no suit/rank/id) for Player 1's card. Additionally, draw pile cards in the frame should appear as `{"faceUp":false}` with no id/suit/rank fields.
**Why human:** End-to-end frame inspection requires live server and DevTools

#### 3. Hibernation State Restore

**Test:** Start `npx partykit dev`. Connect, draw some cards to create non-default state. Allow server to idle. Reconnect and observe the STATE_UPDATE.
**Expected:** Restored state matches pre-idle state (same hands, same pile contents) rather than fresh defaultGameState
**Why human:** Actual hibernation cycle duration depends on partykit internals; cannot be verified by grep

---

### Gaps Summary

No gaps remain. The one previously identified gap (pile card masking) is closed:

Plan 01-04 added `MaskedCard = { faceUp: false }` type and `ClientPile` interface to `src/shared/types.ts`, updated `ClientGameState.piles` to `ClientPile[]`, and replaced the bare `piles: state.piles` pass-through in `viewFor` with a masking transform. Three new tests in `tests/viewFor.test.ts` prove face-down cards arrive stripped of identity, face-up cards retain full data, and card count is preserved. All 24 unit tests pass and TypeScript compiles clean.

Three items remain for human verification (5th connection rejection, live WebSocket frame inspection, hibernation restore) — these require a running partykit dev server and cannot be verified by static analysis.

---

_Verified: 2026-04-01T17:52:00Z_
_Verifier: Claude (gsd-verifier)_
