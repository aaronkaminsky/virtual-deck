---
plan: 18-02
phase: 18-controls-collapse
status: complete
requirement_ids:
  - LAYOUT-03
key-files:
  created: []
  modified:
    - src/components/ControlsBar.tsx
    - src/components/BoardView.tsx
---

## Summary

Full rewrite of `ControlsBar.tsx` as a single controlled Base-UI Popover triggered by a hamburger icon in the header. All game controls (Copy link, Deal stepper, Undo, two-step inline Reset) moved inside the panel. Standalone Copy link button, `handleCopy`, `copied` state, and `Copy`/`Check` icon imports excised from `BoardView.tsx`; `roomId` prop wired through.

## What Was Built

**`src/components/ControlsBar.tsx` — full rewrite**
- Single `<Popover open={open} onOpenChange={handleOpenChange}>` with controlled state
- `variant="ghost"` trigger button (transparent bg matches `bg-card` header — fixed during smoke check)
- Panel layout: Copy link → Separator → Cards per player + Deal → Separator → Undo + Reset
- `handleOpenChange` clears `confirmReset` on every close (Pitfall 1)
- Copy link uses `setTimeout(..., 1500)` so panel closes inside the async callback (Pitfall 2)
- Two-step inline Reset: label row + two buttons row with `flex-1` each to prevent overflow (fixed during smoke check)
- Disabled derivation: Deal when `phase !== 'setup' && phase !== 'lobby'`; Undo when `!canUndo`; Reset when `phase !== 'playing'`

**`src/components/BoardView.tsx` — targeted excision**
- Removed: `copied` state, `handleCopy` function, Copy link `<Button>` block, `Copy`/`Check` lucide imports
- Updated: `<ControlsBar ... roomId={roomId} />` (roomId prop added)

## Deviations from PATTERNS.md / UI-SPEC

1. **Trigger variant changed ghost → outline → ghost:** PATTERNS.md specified `variant="outline"` for the hamburger. During smoke check, `bg-background` (from `outline`) clashed with the header's `bg-card`. Changed to `variant="ghost"` (transparent) to match surroundings.

2. **Reset confirmation row split into two rows:** PATTERNS.md showed label + two buttons in one flex row. At `w-56` panel width the row overflowed, clipping the "Reset table" button. Fixed by moving "Are you sure?" to its own row and giving each button `flex-1` on the row below.

## Manual Smoke Result

**Approved.** All 10 smoke-check items verified:
- Header shows only hamburger trigger in all phases
- Panel default-closed on load
- Copy link → "Copied!" → panel closes after 1500ms
- Deal/Undo close panel immediately
- Reset confirmation cycle: step 1 → step 2 → cancel → reopen shows step 1 (confirmReset cleared on close)
- Disabled states correct across setup/lobby/playing phases

## Test Results

- `npm test`: 150/150 passed (18 test files)
- `npm run typecheck`: exits 0
- `tests/controlsCollapse.test.ts`: 15/15 passed (contract from plan 01 satisfied)

## Self-Check: PASSED
