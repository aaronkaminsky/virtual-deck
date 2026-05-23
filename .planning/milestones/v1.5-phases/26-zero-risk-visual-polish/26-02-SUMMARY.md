---
phase: 26-zero-risk-visual-polish
plan: "02"
subsystem: frontend-components
tags: [ui, visual-polish, access-control, layout]
dependency_graph:
  requires: []
  provides: [CTRL-05, CTRL-07, LAYOUT-07]
  affects: [SpreadZone, GridZone]
tech_stack:
  added: []
  patterns: [interactive-guard, conditional-render]
key_files:
  created:
    - tests/spreadZoneGuards.test.ts
    - tests/gridZoneFaceToggle.test.ts
  modified:
    - src/components/SpreadZone.tsx
    - src/components/GridZone.tsx
decisions:
  - "CTRL-05 guard uses `interactive !== false` (not `interactive === true`) to match existing select-all guard pattern"
  - "LAYOUT-07 header div eliminated entirely; selection badge rendered as bare span, not wrapped in always-on div"
  - "CTRL-07 label row gets `justify-between` unconditionally (button is guarded inside, row layout doesn't need conditional class)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-19"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 26 Plan 02: SpreadZone/GridZone control guards and label cleanup Summary

Guarded SpreadZone face-toggle for opponent zones (CTRL-05), removed the spread zone name label and made the selection badge render only on active multi-selection (LAYOUT-07), and moved the GridZone face-toggle button inline-right of the "Play Area" label (CTRL-07).

## What Was Built

### Task 1: Guard SpreadZone face-toggle and remove name label (CTRL-05, LAYOUT-07)

Three changes to `src/components/SpreadZone.tsx`:

1. **CTRL-05 guard**: Wrapped the face-toggle Button with `{interactive !== false && (...)}`, mirroring the existing select-all guard pattern. Opponent zones (where `interactive === false`) no longer render the face-toggle button.

2. **LAYOUT-07 name label removal**: Removed `<span className="text-xs text-muted-foreground">{pile.name}</span>` entirely.

3. **LAYOUT-07 conditional header**: Replaced the always-rendered `<div className="flex items-center">` containing the name span and conditional badge with a bare conditional badge span. The div only existed to house the name and badge together — with the name gone, the div is unnecessary. The badge now renders directly as a `<span>` only when `selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id`. The `ml-2` class was removed from the badge (no preceding element to space from).

### Task 2: Move GridZone face-toggle into label row (CTRL-07)

Two changes to `src/components/GridZone.tsx`:

1. **Label row upgrade**: Changed `<div className="flex items-center">` to `<div className="flex items-center justify-between">` and placed the Eye/EyeOff Button (guarded by `interactive !== false`) inside the row after the "Play Area" span.

2. **Standalone block removal**: Removed the `{interactive !== false && <div className="flex gap-1">...</div>}` block that previously appeared below the card grid. The button now lives in the label row only.

## Commits

| Hash | Description |
|------|-------------|
| aa4a26a | test(26-02): add failing tests for SpreadZone CTRL-05 and LAYOUT-07 guards |
| fde3417 | feat(26-02): guard SpreadZone face-toggle for opponents, remove name label |
| (RED test) | test(26-02): add failing tests for GridZone CTRL-07 face-toggle relocation |
| 02e9200 | feat(26-02): move GridZone face-toggle into label row (CTRL-07) |

## Deviations from Plan

None — plan executed exactly as written. Both TDD cycles (RED tests then GREEN implementation) followed the project's pure-logic test pattern.

## TDD Gate Compliance

Both tasks followed the RED/GREEN cycle:
- RED commits: `test(26-02):` prefix test files with pure boolean predicate tests
- GREEN commits: `feat(26-02):` prefix implementation in component files

No REFACTOR step needed — changes were surgical and already clean.

## Known Stubs

None. All changes are guard additions and structural cleanup with no data or rendering stubs.

## Threat Flags

No new security surface introduced. The `interactive` prop is server-derived (set by BoardView from player identity) and not forgeable by clients. CTRL-05 mitigation (T-26-03) is confirmed implemented.

## Self-Check: PASSED

All files present and all commits found.
