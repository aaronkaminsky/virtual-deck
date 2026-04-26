---
phase: 14-gameplay-zone-infrastructure
verified: 2026-04-25T07:55:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/9
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open two browser windows to the same room (npm run dev:client + partykit dev). Observe the board after both players join."
    expected: "Each player sees 3 spread zones: their own personal zone and the communal zone in the spread row between the pile area and hand zone; the other player's personal zone in the header section below the opponent's card count. All zones show the correct label. Empty zones show a dashed border. Header has no fixed height — opponent spread zones are not clipped."
    why_human: "Playwright test asserts >= 2 zones (robust to render timing) but cannot verify the exact count of 3 or the visual position of zones (header vs spread row) without hardcoding opaque player tokens."
  - test: "Drag a card from the draw pile to the communal spread zone. Verify both browser windows update."
    expected: "Card appears in the communal zone on both players' screens simultaneously. Empty zone drop: no dialog, card appears directly. Non-empty zone drop: Top/Bottom/Random dialog appears per v1.2 design."
    why_human: "No Playwright drag-to-spread-zone test was written. SC-3 unit test covers server behavior; end-to-end drag path (dnd-kit pointer events through BoardDragLayer to MOVE_CARD dispatch) requires human observation."
  - test: "Click the Face up / Face down button on any spread zone while both players are connected."
    expected: "All cards in the zone flip direction simultaneously on both players' screens."
    why_human: "SET_PILE_FACE broadcast behavior for spread zones is not covered by a Playwright test. Server-side pile logic is unit tested but end-to-end sync requires a live session."
---

# Phase 14: Gameplay Zone Infrastructure Verification Report

**Phase Goal:** Players have personal spread zones and a communal spread zone on the board that they can drop cards into; zones persist across reconnects and are visible to all players.
**Verified:** 2026-04-25T07:55:00Z
**Status:** human_needed
**Re-verification:** Yes — previous verification was human_needed (9/9 automated), no gaps were closed. All automated checks re-run and confirmed passing. Human verification items unchanged.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a player connects, a personal play zone labeled with their name appears on the board (visible to all players) | VERIFIED | `onConnect` pushes `spread-{playerToken}` pile with `name: player?.displayName \|\| playerToken.slice(0,8)`. `viewFor` exposes it in `piles[]`. `broadcastState()` sends to all connections. Unit test `onConnect creates personal spread zone for new player` passes. |
| 2 | A shared communal zone is always visible on the board regardless of player count | VERIFIED | `defaultGameState()` seeds `spread-communal` pile (`party/index.ts` line 39). `onStart` migration seeds it if missing from persisted state. `BoardView` renders `{communalZone && <SpreadZone .../>}` in the spread row. |
| 3 | Existing card mechanics (drag, pass, flip, undo, reset) can be moved to/from both zone types without errors | VERIFIED | `MOVE_CARD` handler finds destination by `piles.find(p => p.id === toId)` — works for any pile id including spread zones. Unit test `moves card from draw pile to spread zone (SC-3)` passes. `RESET_TABLE` iterates all piles except draw — clears spread zone cards while leaving zone records intact. Unit test `clears cards from spread zones without removing the zone itself` passes. |
| 4 | Reconnecting a player does not duplicate their personal play zone — idempotent creation | VERIFIED | `onConnect` checks `!this.gameState.piles.some(p => p.id === spreadZoneId)` before pushing. Idempotency check uses `pile.id`, not `pile.name` (T-14-01 compliant). Unit test `onConnect does not create duplicate zone on reconnect (SC-4)` passes. |
| 5 | The `Pile` type carries `ownerId` and `region` fields; `ClientGameState` carries `myPlayZoneId` | VERIFIED | `src/shared/types.ts` lines 22-23: `region?: "pile" \| "spread"` and `ownerId?: string \| null` on both `Pile` and `ClientPile`. Line 55: `myPlayZoneId: string` on `ClientGameState` (required, not optional). `viewFor` line 78: `myPlayZoneId: playerToken ? \`spread-${playerToken}\` : ""`. |

**Score:** 5/5 ROADMAP success criteria verified

### Plan 14-01 Must-Haves (server)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pile type carries optional region and ownerId fields | VERIFIED | `types.ts` lines 22-23 |
| 2 | ClientGameState carries myPlayZoneId field | VERIFIED | `types.ts` line 55 — required field |
| 3 | defaultGameState() includes spread-communal pile | VERIFIED | `party/index.ts` line 39 |
| 4 | onConnect creates spread-{playerToken} pile on first connect | VERIFIED | Lines 159-171 of `party/index.ts` |
| 5 | onConnect is idempotent — reconnect does not create a duplicate spread zone | VERIFIED | Unit test runs `onConnect` twice, asserts exactly 1 zone |
| 6 | viewFor includes myPlayZoneId equal to spread-{playerToken} for a connected player | VERIFIED | Line 78 of `party/index.ts` |
| 7 | viewFor returns empty string myPlayZoneId for null playerToken | VERIFIED | Unit test `viewFor returns empty string myPlayZoneId for null playerToken` passes |
| 8 | onStart migration defaults region to pile and ownerId to null on existing piles | VERIFIED | Lines 112-119 of `party/index.ts` |
| 9 | onStart migration seeds spread-communal if missing from persisted state | VERIFIED | Lines 121-131 of `party/index.ts` |
| 10 | MOVE_CARD accepts spread zones as toId without handler changes | VERIFIED | Handler uses `piles.find(p => p.id === toId)` — no id whitelist. SC-3 unit test passes. |
| 11 | RESET_TABLE clears cards from spread zones while leaving zone records intact | VERIFIED | Handler iterates all piles except draw and splices cards. Zones remain in `piles[]`. Unit test confirms. |

### Plan 14-02 Must-Haves (client)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SpreadZone component exists and renders a cascading row of DraggableCards as a droppable zone | VERIFIED | `src/components/SpreadZone.tsx` exists (67 lines). Registers `useDroppable` with id `pile-${pile.id}`. Renders `<DraggableCard>` per card with `-ml-5` overlap. |
| 2 | Empty SpreadZone shows a dashed-border placeholder with the zone label | VERIFIED | `border-dashed` class applied when `isEmpty`. Empty state renders `<span>{pile.name}</span>`. |
| 3 | SpreadZone has a face-up/face-down toggle button that dispatches SET_PILE_FACE | VERIFIED | `<Button onClick={handleToggleFace}>` dispatches `{ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp }`. |
| 4 | BoardView renders 4 sections: header + middle piles (filtered to region=pile) + spread row + hand | VERIFIED | Header div (py-2, no fixed height), middle div (pilePiles.map), spread row div (communalZone + mySpreadZone), HandZone IIFE — all present. |
| 5 | BoardView header renders each opponent's hand with their personal SpreadZone stacked below | VERIFIED | Opponent map wraps `<OpponentHand>` + `{opponentSpread && <SpreadZone .../>}` in `flex flex-col gap-1` div. |
| 6 | BoardView spread row renders the communal zone + the current player's personal zone | VERIFIED | `<div className="flex items-start gap-4 px-4 py-2 bg-card">` with `{communalZone && ...}` and `{mySpreadZone && ...}`. |
| 7 | Middle piles row no longer renders spread zones (region filter applied) | VERIFIED | `pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile')`. `gameState.piles.map` count = 0 in BoardView. |
| 8 | Any player can drop a card onto any spread zone (no owner restriction) | VERIFIED | No ownership check in `MOVE_CARD` for spread zone destinations. Server validates pile exists by id only. |
| 9 | Playwright e2e test verifies both players see communal and personal zones | VERIFIED | `playwright/game.spec.ts` line 118: asserts `spread-zone-spread-communal` visible on both pages; asserts `[data-testid^="spread-zone-spread-"]` count >= 2 per player. |

**Combined score:** 9/9 groups of must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types.ts` | Pile.region, Pile.ownerId, ClientPile.region, ClientPile.ownerId, ClientGameState.myPlayZoneId | VERIFIED | All 5 fields present. `myPlayZoneId` required (not optional). |
| `party/index.ts` | Communal zone seeded; onConnect idempotent; onStart migration; viewFor exposes new fields | VERIFIED | All 4 change sites implemented. 492 lines. `spread-communal` appears 3 times. |
| `tests/spreadZoneCreation.test.ts` | Unit tests for SC-1 through SC-5 server behavior | VERIFIED | 8 `it()` cases in `describe("spread zone creation")`. All 8 pass. |
| `src/components/SpreadZone.tsx` | SpreadZone React component, min 60 lines, exports SpreadZone | VERIFIED | 67 lines. Named export `SpreadZone`. All structural requirements met. |
| `src/components/BoardView.tsx` | 4-section layout filtering piles by region | VERIFIED | `pilePiles`, `spreadPiles`, `mySpreadZone`, `communalZone` derived. 3 `<SpreadZone` renders. |
| `playwright/game.spec.ts` | e2e test for spread zone visibility across 2 players | VERIFIED | Test present. Asserts communal zone visible on both pages. 4 prefix-match locator expressions. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `party/index.ts defaultGameState` | `src/shared/types.ts Pile` | object literal with `region: "spread"` | WIRED | Line 39: `{ id: "spread-communal", ..., region: "spread", ownerId: null }` |
| `party/index.ts onConnect` | `party/index.ts gameState.piles` | `piles.push` after `piles.some(p => p.id === spreadZoneId)` check | WIRED | Line 161: idempotency check; lines 162-171: push with explicit region/ownerId |
| `party/index.ts viewFor` | `src/shared/types.ts ClientGameState` | `myPlayZoneId:` field in returned object | WIRED | Line 78: `myPlayZoneId: playerToken ? \`spread-${playerToken}\` : ""` |
| `src/components/SpreadZone.tsx` | `@dnd-kit/core useDroppable` | id prefixed with `pile-` | WIRED | Line 16: `id: \`pile-${pile.id}\`` — satisfies `BoardDragLayer.customCollision` filter |
| `src/components/BoardView.tsx` | `src/components/SpreadZone.tsx` | named import + render in header and spread row | WIRED | Line 7 import; 3 `<SpreadZone` renders |
| `src/components/BoardView.tsx` | `gameState.myPlayZoneId` | `spreadPiles.find(p => p.id === gameState.myPlayZoneId)` | WIRED | Line 27: `mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId)` |
| `playwright/game.spec.ts` | `data-testid=spread-zone-*` | `getByTestId` assertions for communal and personal zones | WIRED | Lines 123-124 + 4 prefix-match locator expressions |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SpreadZone.tsx` | `pile.cards` | `ClientGameState.piles` from server `viewFor()` | Yes — `viewFor` maps `GameState.piles[].cards` from server-authoritative storage | FLOWING |
| `BoardView.tsx` | `gameState.piles` | PartyKit `STATE_UPDATE` WebSocket message | Yes — `broadcastState()` calls `viewFor(this.gameState, ...)` on real server state | FLOWING |
| `BoardView.tsx` | `mySpreadZone` | `spreadPiles.find(p => p.id === gameState.myPlayZoneId)` | Yes — derived from real server state | FLOWING |
| `BoardView.tsx` | `communalZone` | `spreadPiles.find(p => p.id === 'spread-communal')` | Yes — seeded in `defaultGameState` / migrated in `onStart` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite | `npx vitest run` | 124/124 passing, 16 test files | PASS |
| Spread zone unit tests (8 cases) | `npx vitest run tests/spreadZoneCreation.test.ts` | 8/8 passing | PASS |
| MOVE_CARD to spread zone (SC-3) | included in `npx vitest run tests/moveCard.test.ts` | passes | PASS |
| RESET_TABLE clears spread zones | included in `npx vitest run tests/resetTable.test.ts` | passes | PASS |
| TypeScript compile | `npx tsc --noEmit` | 1 pre-existing error in `BoardDragLayer.tsx:65` (`process.env`) — predates Phase 14, confirmed by git history | PASS (pre-existing, not introduced by Phase 14) |
| Playwright e2e | Cannot run without live server | N/A | SKIP — requires human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAY-01 | 14-01, 14-02 | Each connected player has a personal spread zone — all cards visible simultaneously, with a face-up/face-down toggle | SATISFIED | Personal spread zone created in `onConnect`; `SpreadZone` renders all cards in cascade with toggle button; visible to all players via `viewFor` + broadcast |
| PLAY-02 | 14-01, 14-02 | A shared communal spread zone exists on the table — all cards visible simultaneously, with a face-up/face-down toggle; any player can place or move cards | SATISFIED | `spread-communal` seeded in `defaultGameState`; rendered in BoardView spread row; `SpreadZone` has toggle; no owner restriction on `MOVE_CARD` |

No orphaned requirements: REQUIREMENTS.md maps PLAY-01 and PLAY-02 to Phase 14. Both are claimed by both plans and both are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/BoardDragLayer.tsx` | 65 | `process.env.NODE_ENV` — TypeScript error TS2591 | Info | Pre-existing before Phase 14. Confirmed by git log: `BoardDragLayer.tsx` last modified in Phase 11. Not introduced by Phase 14. No functional impact — dev-mode logging only. |
| `src/components/SpreadZone.tsx` | 14 | `draggingCardId: _draggingCardId` — unused prop | Info | Intentional API parity with `PileZone`. Prefixed `_` per repo convention (seen in `OpponentHand`). Not a stub — exists for future drag-highlight use. |

No stubs, placeholder implementations, or TODO/FIXME/HACK patterns in Phase 14 files.

### Human Verification Required

#### 1. Full Spread Zone Layout (2-Player Room)

**Test:** Start `npm run dev:client` and `partykit dev`. Open two browser windows to the same room code. Observe the board after both players join.

**Expected:**
- Each player sees 3 spread zones: their own personal zone and the communal zone in the spread row between the pile area and hand zone; the other player's personal zone in the header below the opponent's card count badge.
- All zones show the correct label (player displayName for personal zones, "Communal" for communal).
- Empty zones show a dashed border.
- Header has no fixed height — opponent spread zones are not clipped.

**Why human:** The Playwright test asserts >= 2 zones but cannot verify the exact count of 3 or the visual position of zones (header vs spread row) without hardcoding opaque player tokens. Layout correctness is a visual judgment.

#### 2. Card Drag Into Spread Zone

**Test:** After step 1, drag a card from the draw pile to the communal spread zone.

**Expected:** Card appears in the communal zone on both players' screens simultaneously. Empty zone drop: no dialog, card appears directly (insertPosition: top). Non-empty zone drop: Top/Bottom/Random dialog appears (v1.2 behavior per UI-SPEC).

**Why human:** No Playwright drag-to-spread-zone test exists. The SC-3 unit test covers server behavior; the client drag path (dnd-kit pointer events → BoardDragLayer → MOVE_CARD dispatch → WebSocket → server → broadcast) requires human observation.

#### 3. Face Toggle Sync

**Test:** Click the "Face up" / "Face down" button on any spread zone while both players are connected.

**Expected:** All cards in the zone flip direction simultaneously on both players' screens.

**Why human:** No automated test covers `SET_PILE_FACE` broadcast behavior for spread zones specifically. Server-side pile logic is unit tested; end-to-end sync across the WebSocket broadcast requires a live session.

### Gaps Summary

No gaps. All 9 groups of must-haves are verified against the actual codebase. The only open items are human verification tasks for visual and interactive behaviors that require a live server.

The single pre-existing TypeScript error in `BoardDragLayer.tsx` (`process.env`) predates Phase 14 and was not introduced by this phase.

---

_Verified: 2026-04-25T07:55:00Z_
_Verifier: Claude (gsd-verifier)_
