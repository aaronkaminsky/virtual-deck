# Phase 19: Responsive Layout - Research

**Researched:** 2026-05-05
**Domain:** CSS responsive layout — Tailwind v4 mobile-first breakpoints, overflow, card sizing
**Confidence:** HIGH

## Summary

This phase is a pure CSS/Tailwind class-addition exercise on six known files. No new components, no logic changes, no new dependencies. The decisions are locked in CONTEXT.md with exact pixel values and exact Tailwind class strings already determined. Research confirms all locked decisions are technically correct against the installed stack (Tailwind v4.2.2, React 18.3.1).

The primary technical risk is the Tailwind v4 `@import "tailwindcss"` syntax (instead of v3's `@tailwind` directives), which is already in production in `globals.css` — meaning the project has already crossed the v3/v4 boundary and responsive utilities work identically to what CONTEXT.md specifies. No breakpoint config overrides exist; `sm:` is the default 640px threshold.

**Primary recommendation:** Execute the six targeted class changes per CONTEXT.md D-01 through D-07. No research-driven deviations are warranted.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep existing `overflow-x-auto` on opponents strip in header. At phone width users can scroll within that band. No structural change to opponent area.
- **D-02:** Scale all cards to 42×59px at phone width (default classes), 63×88px at sm: and above. Applies to CardFace (both render paths), CardBack (both render paths), PileZone card slot, SpreadZone slot, HandZone cards.
- **D-03:** 42×59px matches the existing opponent mini-card size in OpponentHand.tsx — no new size constant. OpponentHand.tsx requires no changes.
- **D-04:** Use Tailwind mobile-first: default classes = phone size; `sm:` prefix = desktop size. E.g., `w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]` on CardFace and CardBack.
- **D-05:** At phone width (<sm:), change BoardView root div from `overflow-hidden` to `overflow-x-hidden overflow-y-auto`.
- **D-06:** At sm: and above, preserve current `overflow-hidden` behavior.
- **D-07:** Keep center row side-by-side. Flex layout handles space allocation — no column stacking.

### Claude's Discretion

None noted — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-04 | Board is usable at phone-width screens (≥375px) without horizontal scrolling; pointer/mouse interaction only (no touch drag) | Tailwind `sm:` breakpoint at 640px covers all phone-width scenarios. Mobile-first class strategy (default = phone) satisfies no-horizontal-scroll requirement. Overflow change on BoardView root (D-05) eliminates page-level scroll. Card sizing at 42×59px (D-02) keeps all zones within 375px viewport. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Responsive card sizing | Browser / Client | — | Pure CSS class changes on rendered components; no server involvement |
| Overflow/scroll behavior | Browser / Client | — | CSS `overflow-*` utilities on DOM elements |
| Breakpoint logic | Browser / Client | — | Tailwind media queries evaluated by browser; no SSR or server component work |
| Interaction targets at phone width | Browser / Client | — | Pointer events on existing dnd-kit bindings; no change needed |

## Standard Stack

All libraries are already installed. No new dependencies for this phase.

### Core (already installed)

| Library | Verified Version | Purpose | Source |
|---------|-----------------|---------|--------|
| tailwindcss | 4.2.2 | Responsive utility classes | [VERIFIED: package.json] |
| react | 18.3.1 | Component rendering | [VERIFIED: package.json] |
| @dnd-kit/core | 6.3.1 | Drag interactions (unchanged) | [VERIFIED: package.json] |

### No New Dependencies

This phase adds zero packages. All responsive work is achieved with existing Tailwind utility classes.

## Architecture Patterns

### System Architecture Diagram

```
Browser @ 375px viewport
       |
       v
  BoardView.tsx (root div)
  overflow-x-hidden overflow-y-auto   <-- D-05 change
       |
       +-- Header row (overflow-x-auto, unchanged D-01)
       |       |
       |       +-- OpponentHand (42×59px, already correct, D-03)
       |       +-- SpreadZone (per opponent, responsive sizing D-02)
       |       +-- ControlsBar (unchanged)
       |
       +-- Center row (flex, side-by-side D-07)
       |       |
       |       +-- PileZone (56×79px phone, D-02)
       |       +-- SpreadZone communal (responsive sizing D-02)
       |
       +-- Personal SpreadZone row (responsive sizing D-02)
       |
       +-- HandZone (h-[100px] phone, D-02)
               |
               +-- SortableHandCard (42×59px phone, -ml-3 overlap D-04)
```

Data flow: game state from PartyKit unchanged. Only CSS rendering layer changes.

### Recommended File Change Sequence

```
src/components/
├── CardFace.tsx       -- 2 w/h class edits (img path + fallback div)
├── CardBack.tsx       -- 2 w/h class edits (img path + fallback div)
├── HandZone.tsx       -- 3 edits: card wrapper w/h, overlap margin, container h
├── PileZone.tsx       -- 1 edit: card slot w/h
├── SpreadZone.tsx     -- 2 edits: container min-w/h, card overlap margin
└── BoardView.tsx      -- 1 edit: root div overflow classes
```

### Pattern 1: Mobile-First Tailwind Responsive Classes

**What:** Default (unprefixed) class applies to all viewports including phone. `sm:` prefix overrides at 640px and above.

**When to use:** All sizing and overflow changes in this phase.

**Example:**
```tsx
// Source: https://tailwindcss.com/docs/responsive-design [VERIFIED]
// CardFace — before
className="w-[63px] h-[88px] rounded-md select-none object-cover"

// CardFace — after
className="w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover"
```

**Example — BoardView overflow:**
```tsx
// Source: CONTEXT.md D-05 / D-06 [VERIFIED against Tailwind docs]
// before
className="h-screen w-screen overflow-hidden flex flex-col bg-background"

// after
className="h-screen w-screen overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col bg-background"
```

### Pattern 2: Proportional Zone Container Sizing

**What:** Zone containers (PileZone, SpreadZone, HandZone) are fixed-pixel boxes. They must scale proportionally to the 42/63 ≈ 0.667 card scaling ratio.

**Verified dimensions (from UI-SPEC.md):** [VERIFIED: cross-referenced against existing code]

| Zone | Phone default | Desktop sm: |
|------|--------------|-------------|
| PileZone slot | `w-[56px] h-[79px]` | `sm:w-[80px] sm:h-[112px]` |
| SpreadZone slot | `min-w-[56px] h-[79px]` | `sm:min-w-[80px] sm:h-[112px]` |
| HandZone wrapper | `w-[42px] h-[59px]` | `sm:w-[63px] sm:h-[88px]` |
| HandZone container | `h-[100px]` | `sm:h-[128px]` |

**Ratio verification:** 42/63 = 0.667. 80×0.667 = 53.3 → 56px (rounded to 4px grid). 112×0.667 = 74.7 → 79px (rounded). [VERIFIED: arithmetic against CONTEXT.md D-02]

### Pattern 3: Proportional Negative Margin (Card Overlap)

**What:** The `-ml-5` (20px) overlap on 63px cards = 31.7% overlap. At 42px, proportional overlap is 42×0.317 ≈ 13.3px → `-ml-3` (12px) is the nearest 4px-grid value.

**Applies to:** `SortableHandCard` in HandZone.tsx and card overlap in SpreadZone.tsx.

```tsx
// HandZone SortableHandCard — before
className={cn('relative w-[63px] h-[88px] flex-shrink-0', index > 0 ? '-ml-5' : '')}

// after
className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
```

```tsx
// SpreadZone SortableSpreadCard — before
className={cn('flex-shrink-0', index > 0 ? '-ml-5' : '')}

// after
className={cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}

// SpreadZone masked CardBack wrapper — before
<div className={cn('flex-shrink-0', i > 0 ? '-ml-5' : '')}>

// after
<div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
```

### Anti-Patterns to Avoid

- **Custom breakpoint definition:** Do not add a custom `screens` entry in globals.css. The default `sm:` at 640px (40rem) is exactly what this phase requires. [VERIFIED: no existing overrides in codebase]
- **JavaScript/media query detection:** Do not use `window.matchMedia` or resize handlers. Pure CSS Tailwind breakpoints handle all responsive behavior.
- **Structural column stacking:** CONTEXT.md D-07 locks center row as side-by-side. Do not switch to flex-col at phone width.
- **Separate mobile components:** No conditional rendering based on viewport. Single component with responsive classes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive sizing | JS resize observer + state | Tailwind `sm:` prefix | Browser-native CSS media queries; no React re-render on resize |
| Viewport width detection | `useWindowWidth` hook | Tailwind breakpoint classes | Zero runtime overhead; server-renderable |
| Card size token system | Shared constant / CSS variable | Direct Tailwind arbitrary values | Phase scope is 6 file edits; abstraction adds complexity for no gain |

**Key insight:** This phase's entire implementation is CSS class string edits. Any JavaScript solution is categorically over-engineered.

## Common Pitfalls

### Pitfall 1: Forgetting the Second Render Path in CardFace/CardBack

**What goes wrong:** CardFace has two render paths (image URL path and fallback `<div>`). CardBack has two render paths (image URL and fallback `<div>`). Updating only one path leaves the other at the old 63×88px size.

**Why it happens:** The image URL path is the production path; the fallback is easy to overlook.

**How to avoid:** Both `className` strings in each file must be updated. Four total edit sites across two files.

**Warning signs:** Cards appear correct with card art but revert to desktop size on placeholder art.

### Pitfall 2: SpreadZone Has Two Card Overlap Locations

**What goes wrong:** SpreadZone renders both `SortableSpreadCard` (for known cards) and a plain `<div>` with `CardBack` (for masked/unknown cards). Both have `-ml-5` overlap. Updating only one breaks visual consistency when a mix of known and unknown cards appears in a spread.

**Why it happens:** The two code paths serve different card visibility states (face-up vs. masked).

**How to avoid:** Update both overlap classes in SpreadZone.tsx — line inside `SortableSpreadCard` and line inside the fallback wrapper div.

### Pitfall 3: `sm:overflow-hidden` Does Not Fully Override Axis-Specific Classes

**What goes wrong:** If the class list were `overflow-x-hidden overflow-y-auto sm:overflow-hidden`, the `sm:overflow-hidden` shorthand correctly sets both axes at 640px+ because Tailwind's `overflow-hidden` generates `overflow: hidden` which takes precedence over the axis-specific declarations in the same media query scope.

**Why it happens:** CSS specificity concern that turns out not to be a problem — shorthand `overflow: hidden` overrides axis-specific `overflow-x` / `overflow-y` at the same specificity level when later in the cascade (which `sm:` classes are, by Tailwind's media-query layering).

**How to avoid:** The CONTEXT.md approach is correct. Verify visually at 640px boundary that overflow switches.

**Warning signs:** Desktop viewport (≥640px) shows unexpected scroll bars.

### Pitfall 4: HandZone Container Height Must Accommodate Phone Card + Padding

**What goes wrong:** The existing `h-[128px]` HandZone container is 128 = 88px card + 40px for padding, drop highlight border, and selected-card `translateY(-6px)` offset. At phone size (59px card), the proportional height is not simply `59/88 × 128 = 85.8px`.

**Why it happens:** The 40px non-card overhead doesn't scale proportionally.

**How to avoid:** UI-SPEC.md specifies `h-[100px]` at phone — this is 59px card + ~41px overhead (same absolute overhead as desktop, shrunk slightly). Use `h-[100px] sm:h-[128px]`. Do not re-derive mathematically; use the spec value.

**Warning signs:** Cards visually clipped at the bottom of HandZone on phone viewport.

## Code Examples

### CardFace — complete responsive patch

```tsx
// Source: src/components/CardFace.tsx — current state verified in codebase [VERIFIED]
// Image path
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover', className)}

// Fallback div (two occurrences: the outer div + inner span widths unchanged)
className={cn(
  'w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] relative bg-white rounded-md border border-gray-300 select-none',
  className
)}
```

### CardBack — complete responsive patch

```tsx
// Source: src/components/CardBack.tsx — current state verified in codebase [VERIFIED]
// Image path
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover', className)}

// Fallback div
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md border border-gray-600 select-none', className)}
```

### BoardView — overflow patch

```tsx
// Source: src/components/BoardView.tsx line 29 [VERIFIED: file read in session]
// before: "h-screen w-screen overflow-hidden flex flex-col bg-background"
// after:
"h-screen w-screen overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col bg-background"
```

### PileZone — container patch

```tsx
// Source: src/components/PileZone.tsx line 49 [VERIFIED: file read in session]
// before: 'w-[80px] h-[112px] rounded-lg border ...'
// after:
'w-[56px] h-[79px] sm:w-[80px] sm:h-[112px] rounded-lg border ...'
```

### SpreadZone — container and overlap patches

```tsx
// Source: src/components/SpreadZone.tsx line 95 [VERIFIED: file read in session]
// container before: 'min-w-[80px] h-[112px] rounded-lg border ...'
// container after:
'min-w-[56px] h-[79px] sm:min-w-[80px] sm:h-[112px] rounded-lg border ...'

// SortableSpreadCard overlap (line 36) before: cn('flex-shrink-0', index > 0 ? '-ml-5' : '')
// after:
cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')

// Masked card wrapper (line 118) before: cn('flex-shrink-0', i > 0 ? '-ml-5' : '')
// after:
cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')
```

### HandZone — card wrapper, overlap, and container patches

```tsx
// Source: src/components/HandZone.tsx [VERIFIED: file read in session]
// SortableHandCard wrapper (line 39) before:
cn('relative w-[63px] h-[88px] flex-shrink-0', index > 0 ? '-ml-5' : '')
// after:
cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')

// HandZone drop container (line 123-126) before: 'h-[128px] flex items-center px-4 overflow-x-auto bg-card'
// after:
'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `@tailwind base/components/utilities` | Tailwind v4 `@import "tailwindcss"` | v4.0.0 (2024) | Already migrated in this project. Breakpoints identical; syntax in globals.css differs but utility classes are the same. [VERIFIED: globals.css line 1] |

**No deprecated patterns in scope:** This phase uses only standard Tailwind responsive utilities that are stable across v3 and v4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `h-[100px]` is correct HandZone container height for phone (from UI-SPEC.md) | Code Examples | Visual clipping if wrong; easy to adjust during implementation |
| A2 | `w-[56px] h-[79px]` is correct PileZone/SpreadZone phone container (80×0.667, rounded) | Code Examples | Minor visual misalignment; easy to adjust |

Note: A1 and A2 are from the pre-approved UI-SPEC.md which was generated and signed off as part of phase setup. They are low-risk.

## Open Questions

None. All decisions are locked via CONTEXT.md and confirmed by UI-SPEC.md. The implementation is fully specified.

## Environment Availability

Step 2.6: SKIPPED — this phase makes no external tool calls, installs no packages, and requires no services beyond the existing Vite + Tailwind build pipeline already confirmed operational.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (unit) + Playwright 1.59.1 (e2e) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (e2e) |
| Quick run command | `npm test` |
| Full suite command | `npm test && npm run typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-04 | No horizontal scrollbar at 375px | visual/manual | Playwright viewport test | ❌ Wave 0 |
| LAYOUT-04 | All zones visible at 375px | visual/manual | Playwright viewport test | ❌ Wave 0 |
| LAYOUT-04 | Pointer interactions work at 375px | manual | Manual browser test at 375px | N/A |

**Note on test strategy:** LAYOUT-04 is a pure visual/layout requirement. No existing Vitest unit test covers DOM rendering or CSS at a specific viewport width. The appropriate validation is a Playwright test that sets viewport to 375px and asserts no horizontal overflow. However, given that CONTEXT.md D-05 explicitly makes the page vertically scrollable (not a fixed viewport), and the existing Playwright tests do not cover responsive layout, the simplest Wave 0 path is: add a single Playwright test that opens the app at 375px viewport width and asserts `document.body.scrollWidth <= 375`. TypeScript type-check (`npm run typecheck`) confirms no regressions in the class-string edits.

### Sampling Rate

- **Per task commit:** `npm run typecheck`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** Full suite green + manual 375px browser check before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `playwright/responsive.spec.ts` — covers LAYOUT-04 (375px no-horizontal-scroll assertion)

## Security Domain

Not applicable. This phase makes no authentication, authorization, data validation, cryptographic, or input-handling changes. All changes are CSS class strings in client-side render functions.

## Sources

### Primary (HIGH confidence)

- Source code read in session: `CardFace.tsx`, `CardBack.tsx`, `HandZone.tsx`, `PileZone.tsx`, `SpreadZone.tsx`, `BoardView.tsx`, `OpponentHand.tsx`, `globals.css`, `vitest.config.ts`, `playwright.config.ts` — exact class strings verified [VERIFIED: codebase]
- `package.json` — confirmed tailwindcss@4.2.2, react@18.3.1, vitest@4.1.2, playwright@1.59.1 [VERIFIED: codebase]
- CONTEXT.md — locked decisions D-01 through D-07 [VERIFIED: codebase]
- UI-SPEC.md — exact pixel dimensions table [VERIFIED: codebase]
- https://tailwindcss.com/docs/responsive-design — `sm:` = 640px, mobile-first confirmed for v4 [CITED: tailwindcss.com/docs/responsive-design]
- https://tailwindcss.com/docs/overflow — responsive overflow utilities confirmed for v4 [CITED: tailwindcss.com/docs/overflow]

### Secondary (MEDIUM confidence)

None needed — all claims verified from primary sources.

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed versions read directly from package.json
- Architecture: HIGH — all components read from source; change sites are exact
- Pitfalls: HIGH — derived from direct code inspection of the two-path render patterns
- Tailwind breakpoints: HIGH — verified against official docs

**Research date:** 2026-05-05
**Valid until:** 2026-07-05 (Tailwind v4 stable, breakpoint config won't change within this window)
