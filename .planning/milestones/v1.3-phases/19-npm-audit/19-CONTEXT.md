# Phase 19: Responsive Layout - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply CSS/Tailwind responsive breakpoints to `BoardView.tsx` and card/zone components so the board is usable at 375px viewport width without horizontal scrolling. No new interactions, no new components — only layout and sizing adjustments via Tailwind's mobile-first breakpoint system.

**Requirements in scope:** LAYOUT-04
**Out of scope:** Touch drag support (pointer/mouse only), spread zone interactions (Phases 20–21), controls panel changes (Phase 18 done)

</domain>

<decisions>
## Implementation Decisions

### Opponent Section at Phone Width
- **D-01:** Keep the existing `overflow-x-auto` on the opponents strip in the header. At phone width, users can scroll within the opponents band — no page-level horizontal scroll occurs because the root is `overflow-hidden`. No structural change needed to the opponent area.

### Card & Zone Sizing
- **D-02:** Scale all cards to 42×59px at phone width (<sm:), 63×88px at sm: and above (640px+). Applies everywhere — CardFace, CardBack, PileZone card slot, SpreadZone slot, HandZone cards. All card instances scale together.
- **D-03:** 42×59px matches the existing opponent mini-card size already in `OpponentHand.tsx` — no new size constant, reusing an established value.
- **D-04:** Use Tailwind's mobile-first approach: default classes are the phone size, `sm:` prefix applies the desktop size. E.g., `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]` on `CardFace` and `CardBack`. Dependent zone containers (PileZone `w-[80px] h-[112px]`, SpreadZone `min-w-[80px] h-[112px]`, HandZone `h-[128px]`) scale proportionally.

### Vertical Overflow at Phone Width
- **D-05:** At phone width (<sm:), change the root div from `overflow-hidden` to `overflow-x-hidden overflow-y-auto`. The board can vertically scroll on phone — no content is silently clipped below the viewport.
- **D-06:** At sm: and above, preserve the current `overflow-hidden` behavior (board locked to viewport, no scroll).

### Center Row Layout
- **D-07:** Keep the center row side-by-side (pile + communal zone). The pile zone shrinks naturally as card sizes decrease. Flex layout handles the remaining space allocation — no structural change (no column stacking) needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 19 — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — LAYOUT-04 acceptance criteria

### Components to Change
- `src/components/CardFace.tsx` — primary card size source (w-[63px] h-[88px] in two places); add sm: responsive variants
- `src/components/CardBack.tsx` — same sizing pattern as CardFace; add sm: responsive variants
- `src/components/HandZone.tsx` — card wrapper `w-[63px] h-[88px]` and container `h-[128px]`; both need responsive variants. Negative margin `-ml-5` on stacked cards also needs proportional adjustment.
- `src/components/PileZone.tsx` — card slot `w-[80px] h-[112px]`; needs responsive variant
- `src/components/SpreadZone.tsx` — spread slot `min-w-[80px] h-[112px]`; needs responsive variant
- `src/components/BoardView.tsx` — root div `overflow-hidden`; needs conditional `overflow-x-hidden overflow-y-auto` at <sm:

### Components to Leave Unchanged
- `src/components/OpponentHand.tsx` — already uses `w-[42px] h-[59px]` (the phone target size); no change needed
- `src/components/ControlsBar.tsx` — hamburger icon trigger; compact by design, no responsive work needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `w-[42px] h-[59px]` in `OpponentHand.tsx` (line 47): The phone-size card is already live in the codebase. Use these exact pixel values — they are not arbitrary.
- Tailwind `sm:` prefix (640px default breakpoint): No custom breakpoint needed. sm: ≥640px covers all desktop use; default covers phones at ≤639px.
- `overflow-x-auto` in `HandZone.tsx` (line 124) and the opponents strip: These already handle horizontal card overflow correctly at any width — they are not the source of the problem.

### Established Patterns
- Mobile-first Tailwind: default class = phone size; sm: class = desktop size. Follow this for all responsive changes in this phase.
- Card size is defined in `CardFace.tsx` and `CardBack.tsx` — zone components reference fixed pixel sizes directly (not via a shared token). Each must be updated independently.
- `BoardView.tsx` root: `h-screen w-screen overflow-hidden flex flex-col bg-background` — the `overflow-hidden` must become `overflow-x-hidden overflow-y-auto` on phone while `h-screen` can stay.

### Integration Points
- No server changes — purely client-side CSS
- No new components — only class additions to existing files
- Tailwind `tailwind.config.ts` may need verification that `sm:` is 640px (default) and no conflicting `screens` config exists

</code_context>

<specifics>
## Specific Ideas

- The 42×59px phone card size is the existing opponent card size in `OpponentHand.tsx` — researcher should verify this is a good visual size for the player's own cards (they'll be the same size as opponents' mini-cards on phone).
- The HandZone negative margin `-ml-5` (20px overlap on 63px card = ~32% overlap) should scale proportionally to phone size: `-ml-3` (12px overlap on 42px card = ~29% overlap) is a reasonable approximation.
- Researcher should verify the total vertical height budget at phone: header + opponents + center row + player spread + hand must ideally fit in 667px (iPhone SE) without requiring scroll, or the vertical scroll from D-05 is the safety valve.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-responsive-layout*
*Context gathered: 2026-05-05*
