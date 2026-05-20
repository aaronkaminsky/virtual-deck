# Phase 27: Drop Target + Empty Spread Behavior - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Two independent visual feedback fixes — accurate drag-over signaling on opponent hands, and a persistent (but quiet) empty spread strip. No behavior changes beyond what the requirements specify.

**In scope:** CTRL-06 (opponent hand outline hover-only), LAYOUT-06 (empty spread faint strip with deferred controls)
**Out of scope:** Any other drag behavior changes, spread zone layout restructure (Phase 30), select-all bugs (Phase 28)

</domain>

<decisions>
## Implementation Decisions

### CTRL-06 — Opponent hand drop-target outline

- **D-01:** Remove the `dragIsActive` branch entirely from OpponentHand's border className. The ternary becomes `isOver ? 'border-2 border-primary' : 'border-2 border-transparent'` — no intermediate dashed state.
- **D-02:** Remove `dragIsActive && 'min-h-[44px] min-w-[80px]'` from OpponentHand. Zone does not expand at drag-start.
- **D-03:** Keep the "Drop to pass" text hint on drag-start (line 65: `dragIsActive && cardCount === 0 && ...`). Text is the only drag-start feedback, and it's low-impact. Only shows when zone is empty anyway.
- **D-04:** On `isOver = true`: solid `border-2 border-primary` only. No size expansion on hover either.
- Affected file: `src/components/OpponentHand.tsx` lines 31-38, 65

### LAYOUT-06 — Empty personal spread zone appearance

- **D-05:** Replace `'h-px opacity-0'` (the invisible resting state) with a visible faint strip: `h-4 border border-dashed border-muted-foreground/30 rounded-md`. Approximately ¼ of the non-empty zone height (which is h-[64px] sm:h-[88px]).
- **D-06:** `isOver` state stays the same as today: expand to full `min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2`. Clear drop affordance.
- **D-07:** Controls are already hidden when empty — the `{interactive !== false && !isEmpty && ...}` guard from Phase 26 covers this. No change needed.
- Affected file: `src/components/SpreadZone.tsx` lines 166-174

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.5 requirements section; CTRL-06 and LAYOUT-06 definitions

### Primary implementation files
- `src/components/OpponentHand.tsx` — CTRL-06 target: lines 19-38 (droppable + className logic), line 65 ("Drop to pass" hint)
- `src/components/SpreadZone.tsx` — LAYOUT-06 target: lines 153-174 (isEmpty + isOver logic), lines 214-236 (controls already gated by !isEmpty)

### Prior phase context
- `.planning/phases/26-zero-risk-visual-polish/26-CONTEXT.md` — Phase 26 established the `interactive !== false && !isEmpty` controls guard pattern in SpreadZone; don't re-introduce controls on empty zones

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDndContext().active` — already used in OpponentHand to detect drag-active state. After D-01/D-02, this import may no longer be needed if `dragIsActive` is removed entirely (the "Drop to pass" text still needs it).
- `isOver` from `useDroppable` — already the correct signal for both components; just needs to be the only trigger for visual changes.

### Established Patterns
- Border transparency fallback: `'border-2 border-transparent'` when inactive — existing pattern in OpponentHand; preserve it so layout doesn't shift.
- Empty zone height tokens: `h-[64px] sm:h-[88px]` for non-empty; `h-[40px] sm:h-[56px]` for isOver state. New resting faint strip: `h-4` (~16px).
- `interactive !== false` gate: the canonical way to distinguish personal vs. opponent zones in SpreadZone.

### Integration Points
- `OpponentHand` is rendered in `BoardView.tsx` (grep for `OpponentHand`). No prop changes needed — the fix is internal to OpponentHand.
- `SpreadZone` receives `interactive` prop from BoardView — personal zone passes `interactive={true}` (or omits it), opponent zone passes `interactive={false}`. The faint strip logic is only for `interactive !== false` (personal zones); opponent spread zones follow their own path.

</code_context>

<specifics>
## Specific Ideas

- Faint strip color: `border-muted-foreground/30` — low-opacity muted foreground, matches the dark felt theme's muted palette.
- Strip height: `h-4` (16px Tailwind). Full zone height is `h-[64px]` (desktop) so this is just under ¼.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-Drop-Target-Empty-Spread-Behavior*
*Context gathered: 2026-05-20*
