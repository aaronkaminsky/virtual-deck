---
phase: 01-server-foundation
verified: 2026-04-05T16:23:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Connect 4 WebSocket clients simultaneously; attempt a 5th connection"
    expected: "First 4 connections succeed; 5th receives close code 4000 with reason 'Room is full — maximum 4 players'"
    why_human: "Player cap enforcement requires a live partykit dev session; slot-based cap (players.length >= 4) can be read in code but live rejection behavior needs a running server"
  - test: "Start partykit dev; connect two players; Player 1 draws a card; inspect Player 2's WebSocket STATE_UPDATE frame"
    expected: "Player 2's frame shows opponentHandCounts: {'player-1': 1} and an empty myHand — no card face data for Player 1. Draw pile cards appear as {faceUp:false} with no id/suit/rank."
    why_human: "End-to-end hand masking and pile masking confirmation requires live WebSocket traffic inspection in DevTools"
  - test: "Start partykit dev; allow room to go idle; reload; reconnect a client"
    expected: "State (players, hands, piles) is restored from storage — not reset to defaultGameState"
    why_human: "Hibernation storage restore requires live partykit dev with actual idle timeout"
---

# Phase 1: Server Foundation Verification Report

**Phase Goal:** The PartyKit room correctly owns all game state, masks hand data per player, and persists across hibernation
**Verified:** 2026-04-05T16:23:00Z
**Status:** passed (human_needed for live server tests)
**Re-verification:** Yes — regression check after phases 2–5 evolution

## Re-verification Summary

**Previous status:** passed (5/5, 2026-04-02)
**Current status:** passed (5/5)
**Regressions found:** None
**Notable evolution:** Codebase has grown from 24 tests to 92 tests across 13 test files. Phase 1 pure functions and lifecycle hooks remain intact. Several breaking-compatible type extensions were added in later phases (undoSnapshots, Pile.faceUp, myPlayerId, canUndo, "setup" phase variant) — none invalidate Phase 1 requirements. Player cap logic evolved from `[...getConnections()].length > 4` to slot-based `players.length >= 4` (Phase 5 reconnect work) — semantically equivalent for first-connect and more correct for reconnects.

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A room can be created and a 52-card deck is initialized on the server with correct card identities | VERIFIED | `buildDeck()` returns 52 cards via `SUITS.flatMap`; 7 deck tests pass (count, no duplicates, suit distribution, ID format `${rank}-${suit[0]}`, faceUp:false, play pile added, undoSnapshots init); `defaultGameState` places all 52 in draw pile |
| 2 | Shuffling uses `crypto.getRandomValues` server-side (Fisher-Yates) — no client-side randomness | VERIFIED | `party/index.ts:22`: `crypto.getRandomValues(buf)` in Fisher-Yates loop; `Math.random` absent (grep returns 0 matches); 5 shuffle tests pass including Math.random spy check |
| 3 | When a player joins, they receive a `ClientGameState` where `myHand` contains only their cards; no other player's hand cards in the frame | VERIFIED | `viewFor` hand masking: 7 original tests pass. Pile card masking: 3 tests pass (strips id/suit/rank from face-down pile cards, preserves face-up card data, preserves count). `viewFor` maps face-down pile cards to `{ faceUp: false }` with no identity fields. Live WebSocket inspection remains flagged for human. |
| 4 | Up to 4 players can connect; a 5th connection is rejected | VERIFIED (code) / HUMAN NEEDED (live) | `party/index.ts:108-110`: slot-based check `!isExistingPlayer && players.length >= 4` closes with code 4000, reason "Room is full — maximum 4 players". Semantics improved vs. prior verification: reconnecting players bypass the cap (correct for Phase 5 reconnect). Live test still requires human. |
| 5 | Server state survives room hibernation — reloading restores previous state | VERIFIED (code) / HUMAN NEEDED (live) | `onStart` restores from `room.storage.get<GameState>("gameState")` with migration guard for undoSnapshots; `persist()` called after every mutation; `static options = { hibernate: true }` at line 87. Live hibernation cycle requires human. |

**Score:** 5/5 truths verified (live behavior for truths 4 and 5 requires human testing)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Project manifest with partykit, nanoid, vitest, typescript | VERIFIED | All four dependencies present |
| `tsconfig.json` | TypeScript configuration | VERIFIED | strict: true, moduleResolution: bundler, @shared path alias |
| `partykit.json` | PartyKit project config | VERIFIED | main: "party/index.ts" |
| `vitest.config.ts` | Vitest configuration | VERIFIED | include: ["tests/**/*.test.ts"] |
| `src/shared/types.ts` | Card, GameState, ClientGameState, MaskedCard, ClientPile, message types | VERIFIED | All required exports present; MaskedCard (line 23), ClientPile (line 25), ClientGameState.piles as ClientPile[] (line 48). Types evolved in later phases (undoSnapshots, myPlayerId, canUndo) without breaking Phase 1 contracts. |
| `party/index.ts` | Complete GameRoom with lifecycle hooks, pure functions, pile masking in viewFor | VERIFIED | All exports present (buildDeck, shuffle, defaultGameState, takeSnapshot, viewFor); all lifecycle hooks implemented; `viewFor` masks hands and face-down pile cards; no `this.room.broadcast`; `static options = { hibernate: true }` |
| `tests/deck.test.ts` | Tests for buildDeck and defaultGameState | VERIFIED | 12 tests (7 deck + original 5 defaultGameState; 3 extra for play pile and undoSnapshots added in later phases), all passing |
| `tests/shuffle.test.ts` | Tests for Fisher-Yates shuffle | VERIFIED | 5 tests, all passing |
| `tests/viewFor.test.ts` | Tests for hand masking and pile card masking | VERIFIED | 15 tests (7 original + 3 pile masking + 5 regression/canUndo tests added in later phases), all passing |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `party/index.ts` | `src/shared/types.ts` | import type | VERIFIED | Line 2: imports Card, ClientAction, ClientGameState, ClientPile, GameState, MaskedCard, ServerEvent, Suit, Rank |
| `tests/*.test.ts` | `src/shared/types.ts` | import type references | VERIFIED | All three Phase 1 test files import types from `../src/shared/types` |
| `vitest.config.ts` | `tests/` | include glob | VERIFIED | `"tests/**/*.test.ts"` discovers all 13 test files (32 Phase 1 tests, 92 total) |
| `party/index.ts onStart` | `this.room.storage.get` | await storage restore | VERIFIED | Line 96: `await this.room.storage.get<GameState>("gameState")` with undoSnapshots migration guard at lines 99-101 |
| `party/index.ts onConnect` | player cap check | `players.length >= 4` | VERIFIED | Lines 108-110: slot-based cap; new players blocked at 4; reconnecting players bypass (correct) |
| `party/index.ts broadcastState` | `viewFor` | per-connection masked send | VERIFIED | Line 440: `viewFor(this.gameState, getPlayerToken(conn))` called per connection — no `this.room.broadcast` used |
| `party/index.ts onMessage/onClose` | `this.room.storage.put` | persist after every mutation | VERIFIED | `await this.persist()` called at lines 419 (onMessage) and 428 (onClose) |
| `viewFor pile masking` | `MaskedCard` sentinel | `card.faceUp ? card : { faceUp: false as const }` | VERIFIED | Lines 69-72: conditional strips identity from face-down cards; `satisfies ClientPile[]` type check at line 74 |

---

### Data-Flow Trace (Level 4)

This phase produces no UI components — all artifacts are pure server-side logic and configuration. Level 4 data-flow trace is not applicable; data correctness is covered entirely by unit tests.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 1 unit tests pass (32 tests) | `npx vitest run tests/deck.test.ts tests/shuffle.test.ts tests/viewFor.test.ts` | 3 files, 32 tests, 0 failures | PASS |
| Full suite passes (no regressions) | `npx vitest run` | 13 files, 92 tests, 0 failures | PASS |
| TypeScript compiles with no errors | `npx tsc --noEmit` | exit 0, no output | PASS |
| Math.random not used in shuffle | `grep "Math.random" party/index.ts` | 0 matches | PASS |
| crypto.getRandomValues present | `grep "crypto.getRandomValues" party/index.ts` | line 22: match | PASS |
| room.broadcast not used | `grep "this\.room\.broadcast" party/index.ts` | 0 matches | PASS |
| Hibernation opt-in present | `grep "static options" party/index.ts` | line 87: `static options = { hibernate: true }` | PASS |
| Pile masking transform present | `grep "card\.faceUp" party/index.ts` | lines 69-72: conditional masking | PASS |
| MaskedCard type exported | `grep "MaskedCard" src/shared/types.ts` | line 23: `export type MaskedCard = { faceUp: false }` | PASS |
| ClientPile type exported | `grep "ClientPile" src/shared/types.ts` | lines 25-30: interface present | PASS |
| ClientGameState.piles is ClientPile[] | `grep "piles: ClientPile" src/shared/types.ts` | line 48: match | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DECK-01 | 01-01, 01-02, 01-03 | Room initializes with a standard 52-card deck | SATISFIED | `buildDeck()` generates 52 unique cards; `defaultGameState` places all in draw pile; 12 deck tests pass; REQUIREMENTS.md marked complete |
| DECK-02 | 01-01, 01-02, 01-03 | Deck shuffle uses cryptographically random Fisher-Yates + crypto.getRandomValues, server-side | SATISFIED | `shuffle()` uses `crypto.getRandomValues(new Uint32Array(1))` per swap; Math.random absent; 5 shuffle tests pass including spy check; REQUIREMENTS.md marked complete |
| CARD-05 | 01-01, 01-02, 01-03, 01-04 | Player's hand is private — other players see only card backs, enforced server-side | SATISFIED | Hand masking: 7 tests pass. Pile card masking: 3 tests pass. `viewFor` strips id/suit/rank from all face-down pile cards. No raw card identity reachable for cards a client should not see. REQUIREMENTS.md marked complete |
| ROOM-03 | 01-03 | Room supports 2–4 simultaneous players | SATISFIED (code) | Slot-based cap in `onConnect`: new connections rejected when `players.length >= 4`; close code 4000 with "Room is full" reason. Semantically stronger than previous implementation (reconnects bypass cap correctly). REQUIREMENTS.md marked complete. Live test flagged for human. |

No orphaned requirements — REQUIREMENTS.md traceability maps all four IDs to Phase 1, all marked complete.

---

### Anti-Patterns Found

None. Specifically:
- No TODO/FIXME/PLACEHOLDER comments in Phase 1 source files
- No `Math.random` usage in `party/index.ts`
- No `this.room.broadcast` (per-connection broadcast preserves hand masking)
- No bare `piles: state.piles` pass-through in `viewFor`
- No stub implementations or empty return patterns in production code

---

### Human Verification Required

#### 1. 5th Connection Rejection (ROOM-03 live test)

**Test:** Start `npx partykit dev`. Open 5 WebSocket connections to the same room using browser DevTools. First 4 with unique player tokens, 5th as a genuinely new player.
**Expected:** 5th connection receives close code 4000 and reason "Room is full — maximum 4 players"
**Why human:** Slot-based cap requires actual WebSocket connections to validate; live partykit dev server required

#### 2. Hand and Pile Masking End-to-End (CARD-05 live test)

**Test:** Start `npx partykit dev`. Connect two players. Have Player 1 draw a card. Inspect Player 2's STATE_UPDATE WebSocket frame in DevTools Network tab.
**Expected:** Player 2's frame contains `opponentHandCounts: {"player-1": 1}`, `myHand: []` — no card face data for Player 1's card. Draw pile cards appear as `{"faceUp":false}` only.
**Why human:** End-to-end frame inspection requires live server and DevTools

#### 3. Hibernation State Restore

**Test:** Start `npx partykit dev`. Connect, draw some cards. Allow server to idle. Reconnect and observe the STATE_UPDATE.
**Expected:** Restored state matches pre-idle state — same hands, same pile contents — not fresh `defaultGameState`
**Why human:** Hibernation cycle duration depends on partykit internals; cannot be verified by static analysis

---

### Gaps Summary

No gaps. All 5 Phase 1 success criteria are satisfied. The previously closed gap (pile card masking) remains closed. The codebase has evolved across phases 2–5 without regressions to Phase 1 requirements. Three items remain for human verification — these require a running partykit dev server.

---

_Verified: 2026-04-05T16:23:00Z_
_Verifier: Claude (gsd-verifier)_
