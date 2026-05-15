# Phase 18: Controls Collapse - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Wrap the existing `ControlsBar` content (Deal / Undo / Reset) and the Copy link button into a collapsible Popover triggered by a hamburger icon in the header. The board surface shows only the icon button by default — uncluttered, clean. No changes to PileZone controls, no new game actions introduced.

**Requirements in scope:** LAYOUT-03
**Out of scope:** Shuffle/Flip inline PileZone controls (stay as-is), responsive layout (Phase 19), spread zone interactions (Phases 20–21)

</domain>

<decisions>
## Implementation Decisions

### Controls Scope
- **D-01:** Only `ControlsBar` controls (Deal, Undo, Reset) collapse into the panel. `PileZone` Shuffle and Flip buttons stay inline on the board — they are contextual to a specific pile and work well there. The ROADMAP success criteria listing "shuffle, flip, pass" is aspirational; the actual scope is the global ControlsBar only.
- **D-02:** Trigger button always visible in header across all game phases — no layout shift as phases progress.
- **D-03:** Icon-only trigger — hamburger/menu icon (`Menu` from lucide-react). Compact, out of the way.
- **D-04:** Panel auto-closes after any action completes (Deal, Undo, Reset, or Copy link). One action = one open/close cycle.

### Panel Structure
- **D-05:** Panel is a shadcn `Popover` — floating dropdown anchored to the trigger button, closes on outside-click. The existing Popover component (already used in ControlsBar for card count) is the right pattern.
- **D-06:** Panel always shows all controls (Copy link + Deal with card count input + Undo + Reset). Controls are **disabled when not applicable** — no conditional rendering based on game phase. Undo uses the existing `gameState.canUndo` flag. Deal and Reset are disabled when `gameState.phase !== 'playing'` (except Deal which is enabled in setup/lobby).
- **D-07:** Reset confirmation is **inline within the Popover** — no AlertDialog. Add a two-step state: initial "Reset table" button → confirmation row showing "Are you sure? [Cancel] [Reset table]". Avoids Radix Popover + AlertDialog focus conflict entirely.
- **D-08:** Card count input lives inline in the panel body — **no nested Popover for Deal**. The current Deal Popover in `ControlsBar.tsx` is replaced. Input + Deal button are siblings in the panel layout.

### Copy Link
- **D-09:** Copy link moves into the controls panel as the **first item at the top**, above a divider from the game controls. Header right section becomes only the hamburger trigger — maximally uncluttered.
- **D-10:** After clicking Copy link, button shows "Copied!" feedback for ~1.5s (same as current behavior), then panel auto-closes.

### Panel Layout (top → bottom)
```
[ Copy link ]
─────────────────────
  Cards per player
  [−][ 5 ][+]   [Deal]
─────────────────────
  [Undo]   [Reset table]
```

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 18 — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — LAYOUT-03 acceptance criteria

### Components to Change
- `src/components/ControlsBar.tsx` — current ControlsBar implementation; **this component is being rewritten**. Source of the Deal Popover, Undo button, Reset AlertDialog.
- `src/components/BoardView.tsx` — header section (lines 46–88); Copy link button moves out of here into the panel; only the hamburger trigger button remains on the right.

### UI Components Available
- `src/components/ui/popover.tsx` — shadcn Popover (already in use in ControlsBar for Deal card count); use `Popover`, `PopoverTrigger`, `PopoverContent`
- `src/components/ui/button.tsx` — `Button` component with `variant` and `size` props

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Popover` / `PopoverTrigger` / `PopoverContent` (shadcn): Already imported in `ControlsBar.tsx`. The controls panel IS a Popover — extend this component, don't add a new one.
- `lucide-react`: Already installed. Use the `Menu` icon for the hamburger trigger. `Copy`, `Check`, `Undo2`, `RotateCcw` icons already in use — keep them.
- `Button` with `variant="outline" size="sm"`: Existing header button style. Use for the hamburger trigger to match `Copy link`'s style.
- `gameState.canUndo`: Existing flag — direct wire to Undo disabled state.
- `gameState.phase`: Distinguishes `'setup'` / `'lobby'` / `'playing'` — use for Deal/Reset enabled logic.

### Established Patterns
- ControlsBar currently renders `null` for unrecognized phases — replace with always-render approach (disabled controls).
- Inline state management (`useState`) already used in ControlsBar for `popoverOpen` and `dealCount` — extend this pattern for the confirm-reset state.
- The `setCopied` + `setTimeout` pattern from `BoardView.tsx` (for "Copied!" feedback) should be replicated inside `ControlsBar.tsx` now that Copy link lives there.

### Integration Points
- `ControlsBar.tsx` is the only file that needs a full rewrite.
- `BoardView.tsx` header section: remove the `<Button ... onClick={handleCopy}>` block (lines 68–86) and the `handleCopy` function — Copy link logic moves into `ControlsBar.tsx`. The `roomId` prop will need to be added to `ControlsBarProps`.
- No server changes — this is a pure client-side UI rework.

</code_context>

<specifics>
## Specific Ideas

- User confirmed the panel layout via preview: Copy link at top → separator → inline Deal (card count input + Deal button) → separator → Undo + Reset side by side.
- The hamburger icon sits in the same position the current controls cluster occupies (header right, after Copy link).
- The `PopoverContent` should have `side="bottom" align="end"` to anchor to the top-right, consistent with the current Deal card-count popover.

</specifics>

<deferred>
## Deferred Ideas

- **Reset availability based on actions taken** — `project-brainstorm.md` notes: "reset button should be available if any action has been taken, not just deal." Currently Reset is enabled only in `playing` phase. The full request is for Reset to be enabled based on whether any action has occurred, not just whether Deal has been called. This is a behavioral enhancement beyond Phase 18's scope. Capture for a future polish phase.

</deferred>

---

*Phase: 18-controls-collapse*
*Context gathered: 2026-05-03*
