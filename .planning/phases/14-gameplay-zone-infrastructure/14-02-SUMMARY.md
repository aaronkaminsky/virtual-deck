---
phase: 14-gameplay-zone-infrastructure
plan: 02
status: complete
completed: "2026-04-25"
tasks_completed: 3
tasks_total: 3
---

# Plan 14-02: Client UI — SpreadZone Component + BoardView 4-Section Layout

## What Was Built

### Task 1: SpreadZone component (`src/components/SpreadZone.tsx`)
New component rendering spread zones as a cascading row of draggable cards. Key implementation details:
- Registers `useDroppable` with id `` `pile-${pile.id}` `` — required prefix for `BoardDragLayer.customCollision` to route drops correctly
- Masked card guard: `'id' in card` before accessing `.id`/`.suit`/`.rank` — renders `<CardBack />` for masked non-top cards
- Empty state: dashed border + label when `pile.cards.length === 0`
- Card cascade: `flex items-center` row with `-ml-5` negative margin overlap on cards after index 0
- Face toggle: `SET_PILE_FACE` dispatch button below the drop container (same as PileZone)
- `data-testid={`spread-zone-${pile.id}`}` for Playwright assertions
- `draggingCardId` prop accepted but unused (prefixed `_draggingCardId`) for API parity with PileZone

### Task 2: BoardView restructure (`src/components/BoardView.tsx`)
4-section layout replacing the original 3-section layout:

```
[Header: opponents with their spread zones stacked below each opponent hand]
[Middle: pilePiles (region === 'pile' only, NOT spread zones)]
[Spread row: communalZone + mySpreadZone]
[Hand: player's own hand]
```

**Derived variables computed before JSX:**
- `pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile')` — `??` fallback handles pre-migration payloads
- `spreadPiles = gameState.piles.filter(p => p.region === 'spread')`
- `mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId)` — undefined-guarded with `&&`
- `communalZone = spreadPiles.find(p => p.id === 'spread-communal')` — undefined-guarded with `&&`

**Header change:** Removed `h-[104px]` fixed height (Pitfall 1 from research — overflow was clipping opponent spread zones). Added `py-2` for natural height. Opponent wrapper changed to `items-start gap-4 flex-1 overflow-x-auto` with each opponent in a `flex flex-col gap-1` containing `OpponentHand` + optional `SpreadZone`.

**Middle change:** `gameState.piles.map` replaced with `pilePiles.map` — prevents spread zones from appearing as PileZone instances in the middle section (Pitfall 4).

### Task 3: Playwright e2e (`playwright/game.spec.ts`)
New test `'spread zone visibility: both players see communal + personal zones'` added to the existing `test.describe` block:
- Asserts `spread-zone-spread-communal` visible on both p1 and p2 pages
- Asserts `[data-testid^="spread-zone-spread-"]` count `>= 2` on both pages (3 in stable 2-player room: communal + own spread in spread-row + other player's spread in header)
- Uses retry-based matchers only (`toBeVisible`, `toBeGreaterThanOrEqual`) — no `waitForTimeout`
- Token-agnostic: uses prefix matching, never hardcoded player tokens

## Component Tree (Final BoardView Layout)

```
BoardView
├── ConnectionBanner
├── Header (flex, py-2, no fixed height)
│   ├── Opponents wrapper (flex-1, items-start, gap-4, overflow-x-auto)
│   │   └── [per opponent] flex flex-col gap-1
│   │       ├── OpponentHand
│   │       └── SpreadZone (pile=spread-{opponentId}) [if present]
│   └── Right controls (Copy link + ControlsBar)
├── Middle (flex-1, pilePiles only)
│   └── PileZone × N (draw, discard, play — region === 'pile')
├── Spread row (flex, items-start, gap-4, py-2, bg-card)
│   ├── SpreadZone (pile=spread-communal) [if present]
│   └── SpreadZone (pile=mySpreadZone) [if present]
└── HandZone (player's own hand)
```

## Spread Zone Count Per Player (2-Player Room)

Each player sees **3 spread zones** in a stable 2-player room:
- `spread-zone-spread-communal` (spread row)
- `spread-zone-spread-{myToken}` (spread row — my personal zone)
- `spread-zone-spread-{otherToken}` (header under opponent's hand)

Playwright asserts `>= 2` (not exactly 3) to stay robust against render-timing edge cases where the opponent header zone may appear slightly after initial render.

## CSS Overlap Note

The `-ml-5` cascade (20px negative margin) was used as specified in UI-SPEC without adjustment. Cards are `63×88px` (standard DraggableCard size from HandZone analog). The overlap is visually functional for card identification — the plan spec value was correct.

## Insert-Position Dialog for Spread Zone Drops

The dialog was NOT bypassed in v1.2 per UI-SPEC "Note on insert position dialog": dropping a card onto a non-empty spread zone triggers the Top/Bottom/Random dialog (same as PileZone). Drops onto empty spread zones skip the dialog (use `insertPosition: 'top'` directly). This is intentional behavior for v1.2; a future phase may add a "no dialog" UX for spread zones.

## key-files

### created
- `src/components/SpreadZone.tsx` — 67 lines
- `.planning/phases/14-gameplay-zone-infrastructure/14-02-SUMMARY.md`

### modified
- `src/components/BoardView.tsx` — 4-section layout, SpreadZone import, region filtering
- `playwright/game.spec.ts` — spread zone visibility e2e test added

## Self-Check

- [x] `src/components/SpreadZone.tsx` exists, exports `SpreadZone`, uses `pile-` droppable-id prefix, handles masked cards, has face-toggle
- [x] `BoardView` imports `SpreadZone`, filters to `pilePiles` in middle, renders spread row between middle and hand, opponent spread under opponent hand
- [x] `gameState.piles.map` replaced with `pilePiles.map` (Pitfall 4 avoided)
- [x] `h-[104px]` removed from header (Pitfall 1 avoided)
- [x] Playwright test asserts communal zone visible + >= 2 zones per player, no waitForTimeout
- [x] `npx vitest run` — 124/124 passing (no regression)
- [x] `npx tsc --noEmit` — 1 pre-existing error in BoardDragLayer.tsx (process.env, predates Phase 14); no new errors introduced
- [x] All must_have truths satisfied

## Self-Check: PASSED
