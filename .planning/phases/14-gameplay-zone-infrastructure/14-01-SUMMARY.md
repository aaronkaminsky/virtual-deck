---
phase: 14-gameplay-zone-infrastructure
plan: "01"
subsystem: server
tags:
  - partykit
  - server
  - types
  - migration
dependency_graph:
  requires: []
  provides:
    - Pile.region and Pile.ownerId type fields
    - ClientPile.region and ClientPile.ownerId type fields
    - ClientGameState.myPlayZoneId field
    - defaultGameState seeds spread-communal pile
    - onConnect creates personal spread-{playerToken} zone idempotently
    - onStart migrates persisted state to add region/ownerId defaults
    - viewFor exposes region, ownerId, myPlayZoneId to client
  affects:
    - party/index.ts
    - src/shared/types.ts
    - tests/spreadZoneCreation.test.ts (new)
    - tests/moveCard.test.ts (extended)
    - tests/resetTable.test.ts (extended)
    - tests/deck.test.ts (updated assertion)
tech_stack:
  added: []
  patterns:
    - onStart migration guard pattern (if !('field' in record))
    - Idempotent zone creation by pile.id check in onConnect
    - viewFor passthrough of new Pile fields to ClientPile
key_files:
  created:
    - tests/spreadZoneCreation.test.ts
  modified:
    - src/shared/types.ts
    - party/index.ts
    - tests/moveCard.test.ts
    - tests/resetTable.test.ts
    - tests/deck.test.ts
decisions:
  - Spread zones reuse piles[] collection — region/ownerId fields distinguish them
  - myPlayZoneId is required (not optional) on ClientGameState — viewFor always populates it
  - Idempotency check uses pile.id === spreadZoneId, never pile.name (T-14-01)
  - onStart migration: field defaults run before communal-zone existence check (T-14-05)
metrics:
  duration_seconds: 294
  completed_date: "2026-04-25"
  tasks_completed: 3
  files_changed: 5
requirements:
  - PLAY-01
  - PLAY-02
---

# Phase 14 Plan 01: Spread Zone Server Foundation Summary

Server-side foundation for spread zones: type extensions, PartyKit server seeding/migration/idempotent creation, viewFor exposure, and unit test coverage for SC-1 through SC-5.

## What Was Built

Spread zones are implemented as `Pile` records with two new discriminating fields (`region`, `ownerId`). No new collection type was introduced. Existing `MOVE_CARD`, `UNDO_MOVE`, and `RESET_TABLE` handlers work with spread zone IDs unchanged.

## Change Site Reference (for Plan 14-02 debugging)

| Site | File | Lines (post-commit) | Description |
|------|------|---------------------|-------------|
| 1 | `party/index.ts` | ~35-40 | `defaultGameState()` piles literal — 4 piles with explicit region/ownerId |
| 2 | `party/index.ts` | ~111-131 | `onStart()` migration — field defaults then communal zone seed |
| 3 | `party/index.ts` | ~159-171 | `onConnect()` idempotent personal zone creation after player registration |
| 4 | `party/index.ts` | ~65-79 | `viewFor()` piles map extended with region/ownerId + myPlayZoneId added |

## myPlayZoneId Computation Rule

```typescript
myPlayZoneId: playerToken ? `spread-${playerToken}` : ""
```

- Returns `"spread-{playerToken}"` for any authenticated connection
- Returns `""` for null playerToken (server observer / unauthenticated)
- Client uses this to identify which pile in `piles[]` is the player's personal spread zone
- Valid immediately after first `onConnect` — personal zone is created in that same call

## Decisions Made

- `myPlayZoneId: string` is **required** (not optional) on `ClientGameState`. `viewFor` always populates it. Client code can read it without null checks.
- Idempotency in `onConnect` checks `pile.id === spreadZoneId` (stable), never `pile.name` (mutable) — satisfies T-14-01.
- Migration order in `onStart`: field defaults MUST run before the `hasCommunal` existence check. The pushed communal zone sets both fields explicitly. This satisfies T-14-05.
- Personal zone `name` is set once at creation time using the player's `displayName` at first connect. Display name changes on reconnect do NOT rename the zone (out of scope for v1.2).

## Migration Corner Cases

- Rooms created before Phase 14 deploy: `onStart` runs `if (!('region' in pile))` guard — applies `region = "pile"` to draw/discard/play piles, `ownerId = null` to all existing piles. Then seeds `spread-communal` if absent. Personal zones for reconnecting players are re-created idempotently in `onConnect`.
- Rooms that were never woken since deploy: receive `defaultGameState()` which already has all fields set correctly.
- Edge case: if a room had been woken but the worker was evicted before `onStart` finished, `onStart` runs again on the next wake — the migration is idempotent (guards prevent double-application).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed outdated pile count assertion in tests/deck.test.ts**
- **Found during:** Task 3 full suite run
- **Issue:** `tests/deck.test.ts` asserted `defaultGameState` returns exactly 3 piles. After adding `spread-communal`, defaultGameState returns 4. The test title and assertion were both wrong.
- **Fix:** Updated test name from "has 3 piles with ids draw, discard, play" to "has 4 piles with ids draw, discard, play, and spread-communal". Updated `toHaveLength(3)` to `toHaveLength(4)`. Added `expect(ids).toContain("spread-communal")`.
- **Files modified:** `tests/deck.test.ts`
- **Commit:** be07c94

**2. [Rule 3 - Blocking Issue] makeMockConnection in helpers.ts lacks setState**
- **Found during:** Task 3 — onConnect test cases
- **Issue:** `makeMockConnection` from `./helpers` doesn't implement `connection.setState()`. `onConnect` calls it unconditionally (line 146). Tests using this helper to call `onConnect` threw `TypeError: connection.setState is not a function`.
- **Fix:** Created local `makeConnectableConnection()` in `tests/spreadZoneCreation.test.ts` that includes `setState: vi.fn()`. Did NOT modify the shared `helpers.ts` to avoid breaking other test files that don't need it.
- **Files modified:** `tests/spreadZoneCreation.test.ts`
- **Commit:** be07c94

**3. [Rule 1 - Bug] moveCard SC-3 test conflicted with 52-card deck**
- **Found during:** Task 3 — moveCard SC-3 test
- **Issue:** `makeStateWithPlayerAndCards` calls `defaultGameState` which builds a full 52-card deck including "A-s". The test pushed a second "A-s" and moved it, but one "A-s" remained in draw — assertion `draw.cards.some(c => c.id === "A-s")` was true when expecting false.
- **Fix:** Clear the draw pile explicitly before the test (`drawPile.cards = [makeCard("A-s")]`), then assert `draw.cards.toHaveLength(0)` instead of checking by ID presence.
- **Files modified:** `tests/moveCard.test.ts`
- **Commit:** be07c94

## Out-of-Scope Pre-existing Issue (Deferred)

- `src/components/BoardDragLayer.tsx:65` — TypeScript error `TS2591: Cannot find name 'process'`. Pre-existing before this plan (confirmed by git stash verification). Unrelated to spread zone infrastructure. Logged for future cleanup.

## Threat Mitigations Verified

| Threat | Test | Status |
|--------|------|--------|
| T-14-01: Zone ID injection via name fuzzing | `onConnect does not create duplicate zone on reconnect` — checks by pile.id only | Covered |
| T-14-03: Reconnect spam creating duplicate zones | Same test — two calls produce exactly 1 zone | Covered |
| T-14-05: Stale persisted state missing region/ownerId | `onStart migration adds region and ownerId defaults` | Covered |
| T-14-05: Stale persisted state missing communal zone | `onStart migration seeds spread-communal if missing` | Covered |

## Known Stubs

None. All server-side functionality is fully implemented and tested. Client-side (Plan 14-02) will consume `myPlayZoneId` and `region`/`ownerId` from the viewFor output.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundaries introduced beyond what the plan's threat model already covers.

## Self-Check: PASSED

Files created/exist:
- `tests/spreadZoneCreation.test.ts` ✓
- `src/shared/types.ts` ✓ (modified)
- `party/index.ts` ✓ (modified)
- `tests/moveCard.test.ts` ✓ (modified)
- `tests/resetTable.test.ts` ✓ (modified)
- `tests/deck.test.ts` ✓ (modified)

Commits exist:
- e83f5b1 feat(14-01): extend Pile, ClientPile, ClientGameState types for spread zones ✓
- 646fb31 feat(14-01): extend PartyKit server with spread zone infrastructure ✓
- be07c94 test(14-01): add spread zone unit tests covering SC-1 through SC-5 ✓
