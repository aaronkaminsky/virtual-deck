# Phase 26: Zero-Risk Visual Polish - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate visual noise and scope controls correctly — five targeted display changes, no behavior changes. The badge, a label, two control placements, and a gap are the only things that change.

**In scope:** POLISH-05 (badge at zero), POLISH-06 (pile controls gap), CTRL-05 (opponent face-toggle removal), CTRL-07 (grid face-toggle near label), LAYOUT-07 (spread zone name label removal)
**Out of scope:** Any behavior changes, opponent hand changes, drop target behavior (Phase 27), bug fixes (Phase 28)

</domain>

<decisions>
## Implementation Decisions

### POLISH-05 — Pile count badge
- **D-01:** Conditionally render the `<Badge>` only when `pile.cards.length > 0`. When the pile is empty, no badge renders at all.
- Affected file: `src/components/PileZone.tsx` line 112

### POLISH-06 — Pile controls gap
- **D-02:** Change `gap-1` to `gap-0.5` on the outer `<div className="flex flex-col gap-1">` wrapper in PileZone (line 49). This reduces the gap between the controls row and the pile card from 4px to 2px.
- **D-03:** The pile name label (`hidden sm:inline`) stays — pile labels are not part of LAYOUT-07. Only SpreadZone labels are removed.
- Affected file: `src/components/PileZone.tsx` line 49

### CTRL-05 — Opponent spread zone face-toggle
- **D-04:** Do not render the face-toggle button when `interactive === false` (opponent spread zones). Currently the controls section renders for `(!isEmpty || interactive === false)`, which shows the face-toggle for all opponent zones. Fix: guard the face-toggle button itself with `interactive !== false`, or restructure the condition so no controls render for opponents.
- The select-all button is already guarded by `{interactive !== false && ...}` (line 228). The face-toggle needs the same guard.
- Affected file: `src/components/SpreadZone.tsx` lines 218-227

### CTRL-07 — Grid zone face-toggle placement
- **D-05:** Move the face-toggle button from its own row below the grid into the "Play Area" label row. The label row becomes `flex items-center justify-between` with "Play Area" text on the left and the Eye/EyeOff button on the right.
- Remove the `{interactive !== false && <div className="flex gap-1">...</div>}` block at the bottom.
- Affected file: `src/components/GridZone.tsx` lines 133-136 and 153-165

### LAYOUT-07 — Spread zone name label
- **D-06:** Remove the `<span className="text-xs text-muted-foreground">{pile.name}</span>` from SpreadZone (line 158).
- **D-07:** After removal, the header `<div className="flex items-center">` is conditionally rendered — only shown when the selection badge is visible (i.e., `selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id`). When no cards are selected, no header div renders, eliminating the empty strip.
- Note: the `ml-2` on the badge span may need adjustment since it was spacer from the now-removed name span.
- Affected file: `src/components/SpreadZone.tsx` lines 155-163

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.5 requirements section; POLISH-05, POLISH-06, CTRL-05, CTRL-07, LAYOUT-07 definitions

### Primary implementation files
- `src/components/PileZone.tsx` — POLISH-05, POLISH-06 changes (badge + gap)
- `src/components/SpreadZone.tsx` — CTRL-05, LAYOUT-07 changes (face-toggle, name label, header div)
- `src/components/GridZone.tsx` — CTRL-07 change (move face-toggle into label row)
- `src/components/BoardView.tsx` — shows how `interactive` prop is passed: opponent zones use `interactive={false}` (line 61), local player zone uses `interactive={true}` (lines 84, 96)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `interactive` prop on `SpreadZone`: already the gate for opponent vs. local zones. `interactive === false` at BoardView:61 is the opponent spread zone. Use this same prop to guard the face-toggle.
- `pile.cards.length` is already computed as `isEmpty` on line 24 of PileZone — reuse this for the badge condition.

### Established Patterns
- Controls guard pattern: `{interactive !== false && <Button>...</Button>}` already wraps the select-all button in SpreadZone:228. Apply the same pattern to the face-toggle.
- Label row with right-aligned button: PileZone already uses `flex justify-between items-center` for its controls row (line 50). Mirror this pattern in GridZone's label row for the face-toggle.
- Conditional selection badge: already conditionally rendered with `selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id`.

### Integration Points
- SpreadZone controls section (lines 217-240): the condition `(!isEmpty || interactive === false)` currently shows controls for both non-empty zones AND all opponent zones. After CTRL-05 fix, opponents should see no face-toggle regardless of isEmpty state.
- GridZone label row (lines 133-136): adding the button here is the only structural change needed in GridZone; the existing `handleToggleFace` function and `interactive !== false` guard carry over.

</code_context>

<specifics>
## Specific Ideas

No specific visual references provided — implementation follows the existing shadcn dark-felt theme and existing component patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-Zero-Risk-Visual-Polish*
*Context gathered: 2026-05-19*
