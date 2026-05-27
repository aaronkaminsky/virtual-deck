---
phase: 31-migration
plan: "02"
subsystem: client-layout
tags:
  - migration
  - client
  - layout
  - sidebar
  - canvas
dependency_graph:
  requires:
    - "31-01: Server grid removal, GridZone stub, BoardDragLayer partial cleanup"
  provides:
    - "GridZone.tsx fully deleted from repository"
    - "BoardView.tsx sidebar+canvas middle band (MIGRATE-02)"
    - "BoardDragLayer.tsx confirmed zero grid references (MIGRATE-01 complete)"
    - "playwright/game.spec.ts aligned to sidebar+canvas DOM (no grid locators)"
  affects:
    - src/components/BoardView.tsx
    - src/components/BoardDragLayer.tsx
    - playwright/game.spec.ts
tech_stack:
  added: []
  patterns:
    - "Sidebar+canvas flex layout: flex-shrink-0 sidebar + flex-1 canvas per UI-SPEC D-01/D-06/D-12"
    - "Tailwind border token: border-r border-border (D-04)"
    - "Canvas felt token: bg-background self-stretch (D-05)"
    - "data-testid=canvas-shell as stable Playwright/Plan 03 hook"
key_files:
  created: []
  modified:
    - src/components/BoardView.tsx
    - playwright/game.spec.ts
  deleted:
    - src/components/GridZone.tsx
decisions:
  - "Tasks 1 and 2 committed in a single atomic commit — typecheck requires GridZone deletion and BoardView import removal to land together"
  - "Playwright test 'spread zone visibility' renamed to 'both players see personal spread zones'; grid-zone-play assertions removed; personal spread assertions preserved"
  - "Four grid-specific Playwright tests deleted entirely (communal drag, communal-to-hand, communal position, intra-grid move); replacement canvas tests arrive in Phase 32+"
  - "BoardDragLayer.tsx required no changes — Plan 01 left it completely clean"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-23T23:11:39Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 31 Plan 02: Client Grid Removal and Sidebar+Canvas Layout Summary

GridZone.tsx deleted, BoardView.tsx restructured to sidebar+canvas middle band, Playwright spec stripped of all grid locators — MIGRATE-01 and MIGRATE-02 complete.

## What Was Done

### Task 1: Delete GridZone, Confirm BoardDragLayer Clean

**Step A — GridZone.tsx deleted:**

`git rm src/components/GridZone.tsx` removed the null-returning stub left by Plan 01. The file is no longer in the repository.

**Step B — BoardDragLayer.tsx confirmed clean:**

Grep check for all six patterns returned zero matches:
- `grid-cell` — 0
- `MOVE_GRID_CARD` — 0
- `gridOverData` — 0
- `toRow|toCol` — 0
- `zoneId === 'play'` — 0
- `GridZone` — 0

Plan 01 had already cleaned all these. No changes were needed in BoardDragLayer.tsx.

### Task 2: Restructure BoardView Middle Band + Playwright Cleanup

**BoardView.tsx changes:**

1. Removed `import { GridZone } from './GridZone';` (line 6) — last reference to the deleted component.
2. Removed `const communalZone = undefined;` (line 29) — dead code from Plan 01's stub phase.
3. Replaced the middle band JSX from:

```tsx
<div className="flex-1 min-h-0 flex items-center px-4 gap-4">
  {pilePiles.map((pile) => (
    <PileZone ... />
  ))}
  {communalZone && (
    <div className="shrink-0">
      <GridZone ... />
    </div>
  )}
</div>
```

to the sidebar+canvas structure:

```tsx
<div className="flex-1 min-h-0 flex items-start">
  <div className="flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border">
    {pilePiles.map((pile) => (
      <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onSelectAll={onSelectAll} selectedIds={selectedIds} />
    ))}
  </div>
  <div className="flex-1 min-w-0 overflow-hidden bg-background self-stretch" data-testid="canvas-shell" />
</div>
```

**Exact className strings:**
- Sidebar div: `"flex-shrink-0 flex flex-col gap-2 py-2 px-2 border-r border-border"`
- Canvas div: `"flex-1 min-w-0 overflow-hidden bg-background self-stretch"`

**Playwright spec cleanup:**

| Test | Action |
|------|--------|
| `spread zone visibility: both players see communal + personal zones` | Trimmed — removed `grid-zone-play` assertions and comment block; renamed to `both players see personal spread zones`; personal spread assertions kept |
| `multi-card set play: select 2 cards, drag to communal zone, both players see them` | Deleted entirely |
| `spread zone drag: drag card from communal spread zone to hand` | Deleted entirely |
| `communal zone position: rendered in center row band, not bottom bar` | Deleted entirely — all assertions used `grid-zone-play` |
| `grid card move: drag card within communal grid zone to a new cell` | Deleted entirely |

Remaining tests: 9 tests (down from 13).

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 211/211 tests pass (30 test files)
- `npm run test:e2e`: dev servers unavailable from agent shell — deferred to Plan 03 human-verify step where operator runs both servers locally

## Deviations from Plan

**None — plan executed exactly as written.**

BoardDragLayer.tsx required no changes (Plan 01 left it completely clean). The plan correctly noted this would be verified-only, not an edit step.

## Result of E2E (npm run test:e2e)

Dev servers (ports 1999 + 5173) were not running in the agent's shell environment. E2E deferred to Plan 03's human-verify checkpoint, where the operator starts both servers and verifies the sidebar+canvas visual layout and runs the Playwright suite. The pre-push hook will enforce this before the branch is pushed.

## Known Stubs

None. All stubs from Plan 01 (`GridZone` null stub and `communalZone = undefined`) have been removed.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Canvas shell is an empty `<div>` with `data-testid` only — carries no PII or runtime data (T-31-07: accepted). Net attack surface continues to decrease from Plan 01's removal of MOVE_GRID_CARD.

T-31-05 mitigated: `grep -cE "grid-cell" src/components/BoardDragLayer.tsx` = 0.

## Self-Check: PASSED

- `src/components/GridZone.tsx` deleted (git ls-files returns empty, `D` in git status before commit): CONFIRMED
- `src/components/BoardView.tsx` contains `border-r border-border`: CONFIRMED (1 match)
- `src/components/BoardView.tsx` contains `data-testid="canvas-shell"`: CONFIRMED (1 match)
- `playwright/game.spec.ts` contains 0 `grid-zone-play` references: CONFIRMED
- Commit eb41bf8 exists in git log: CONFIRMED
- `npm test` 211/211: CONFIRMED
- `npm run typecheck` 0 errors: CONFIRMED
