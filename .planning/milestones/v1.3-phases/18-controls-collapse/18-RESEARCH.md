# Phase 18: Controls Collapse - Research

**Researched:** 2026-05-03
**Domain:** React component refactor — shadcn Popover, inline state management, UI consolidation
**Confidence:** HIGH

## Summary

Phase 18 is a pure client-side UI rework. The entire implementation lives in two files: `ControlsBar.tsx` gets a full rewrite and `BoardView.tsx` gets a targeted excision of the Copy link button and `handleCopy` function. No server changes, no new dependencies, no new shadcn component installs.

Every component required (Popover, Button, Input, Separator) is already installed and confirmed present in `src/components/ui/`. The icon set (Menu, Copy, Check, Undo2, RotateCcw) is already available via `lucide-react`. The UI Spec has been approved. All decisions are locked in CONTEXT.md — no alternatives to research.

The primary risk is the Radix/Base UI Popover focus trap interacting with the inline two-step Reset confirmation state. CONTEXT.md D-07 explicitly resolves this by keeping Reset confirmation inline (no AlertDialog) with a local `confirmReset: boolean` state — no dialog portals competing for focus.

**Primary recommendation:** Rewrite `ControlsBar.tsx` as a single Popover wrapping all controls; cut Copy link and `handleCopy` from `BoardView.tsx`; wire `roomId` prop into `ControlsBarProps`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Controls Scope**
- D-01: Only `ControlsBar` controls (Deal, Undo, Reset) collapse into the panel. `PileZone` Shuffle and Flip buttons stay inline on the board.
- D-02: Trigger button always visible in header across all game phases — no layout shift.
- D-03: Icon-only trigger — hamburger/menu icon (`Menu` from lucide-react). Compact, out of the way.
- D-04: Panel auto-closes after any action completes (Deal, Undo, Reset, or Copy link). One action = one open/close cycle.

**Panel Structure**
- D-05: Panel is a shadcn `Popover` — floating dropdown anchored to trigger button, closes on outside-click.
- D-06: Panel always shows all controls. Controls are disabled when not applicable — no conditional rendering based on game phase. Undo uses `gameState.canUndo`. Deal/Reset use `gameState.phase`.
- D-07: Reset confirmation is inline within the Popover — no AlertDialog. Two-step state: "Reset table" → "Are you sure? [Keep playing] [Reset table]".
- D-08: Card count input lives inline in the panel body — no nested Popover for Deal.

**Copy Link**
- D-09: Copy link moves into the controls panel as the first item, above a separator. Header right section becomes only the hamburger trigger.
- D-10: After clicking Copy link, button shows "Copied!" for ~1.5s, then panel auto-closes.

**Panel Layout (top → bottom)**
```
[ Copy link ]
─────────────────────
  Cards per player
  [−][ 5 ][+]   [Deal]
─────────────────────
  [Undo]   [Reset table]
```

### Claude's Discretion

None specified in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- Reset availability based on actions taken (not just `playing` phase). Capture for future polish phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-03 | Player can access all game controls from a collapsible panel triggered by a single header button; controls are hidden by default | Fully supported: Popover component already installed; all controls accounted for in panel layout; trigger always rendered in header |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Collapsible controls panel | Browser/Client | — | Pure UI state; no server involvement |
| Trigger button (hamburger) | Browser/Client | — | Presentational; lives in React header |
| Copy link generation | Browser/Client | — | `window.location.origin` + `import.meta.env.BASE_URL` + `roomId` — client-only |
| Deal / Undo / Reset actions | Browser/Client → PartyKit server | — | Client fires `sendAction`; server owns game state |
| Enabled/disabled logic | Browser/Client | — | Derived from `gameState.phase` and `gameState.canUndo`; read-only on client |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` (via shadcn) | ^1.3.0 | Popover primitive underlying `popover.tsx` | [VERIFIED: package.json] — the installed Popover component wraps `@base-ui/react/popover`, not Radix |
| `lucide-react` | ^1.7.0 | Icon set — `Menu`, `Copy`, `Check`, `Undo2`, `RotateCcw` | [VERIFIED: package.json + ControlsBar.tsx imports] |
| `react` | ^18.3.1 | Component model, `useState` for local UI state | [VERIFIED: package.json] |

### Supporting (all already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/components/ui/popover.tsx` | local (shadcn) | Controls panel container | Use `Popover`, `PopoverTrigger`, `PopoverContent` with `side="bottom" align="end"` |
| `src/components/ui/button.tsx` | local (shadcn) | All interactive elements | `variant="outline" size="icon-sm"` for trigger; `variant="default" size="sm"` for Deal; `variant="outline" size="sm"` for Undo/Copy/Cancel; `variant="destructive" size="sm"` for Reset |
| `src/components/ui/input.tsx` | local (shadcn) | Card count number input | `type="number"` inline in panel |
| `src/components/ui/separator.tsx` | local (shadcn) | Section dividers in panel | `<Separator />` (horizontal, default) between Copy link / Deal / Undo+Reset sections |

**No new installs required.** [VERIFIED: `ls src/components/ui/` confirms all four components present]

### Alternatives Considered

None — all decisions are locked. The AlertDialog that existed in ControlsBar for Reset is being removed; inline `confirmReset` state replaces it.

---

## Architecture Patterns

### System Architecture Diagram

```
BoardView (header right section)
  └── <ControlsBar> ← receives: gameState, playerId, sendAction, roomId (NEW)
        └── Popover (controlled: open / setOpen via useState)
              ├── PopoverTrigger
              │     └── Button variant="outline" size="icon-sm"
              │           └── <Menu /> icon
              └── PopoverContent side="bottom" align="end" w-56 p-4
                    ├── [Copy link Button]  → copies URL → shows "Copied!" 1.5s → setOpen(false)
                    ├── <Separator />
                    ├── "Cards per player" label
                    ├── stepper row ([−] input [+]) + Deal Button → sendAction(DEAL_CARDS) → setOpen(false)
                    ├── <Separator />
                    └── Undo Button + Reset row
                          ├── Step 1: Reset table Button (destructive) → setConfirmReset(true)
                          └── Step 2: "Are you sure?" + Keep playing + Reset table (destructive) → sendAction(RESET_TABLE) → setOpen(false)
```

BoardView header after change:
```
BoardView header right
  (was: [Copy link] [ControlsBar controls])
  (now: [ControlsBar hamburger trigger only])
```

### Recommended Project Structure

No structural changes. Both affected files are already in `src/components/`.

### Pattern 1: Controlled Popover with auto-close

**What:** `Popover` receives `open` and `onOpenChange` props; action handlers call `setOpen(false)` directly after firing.
**When to use:** Any action that should dismiss the panel immediately on completion.

```tsx
// Source: src/components/ui/popover.tsx — PopoverPrimitive.Root.Props accepts open/onOpenChange
const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger ...>
  <PopoverContent ...>
    <Button onClick={() => {
      sendAction({ type: 'DEAL_CARDS', cardsPerPlayer: parseInt(dealCount, 10) });
      setOpen(false);
    }}>
      Deal
    </Button>
  </PopoverContent>
</Popover>
```

[VERIFIED: existing ControlsBar.tsx uses this exact pattern for `popoverOpen` / `setPopoverOpen`]

### Pattern 2: Inline two-step confirmation (no AlertDialog)

**What:** Local `confirmReset` boolean state toggles between the normal Reset button and a confirmation row.
**When to use:** Destructive actions that need confirmation but cannot use an AlertDialog because they're already inside a focus-managed Popover.

```tsx
// Source: CONTEXT.md D-07 — avoids Radix Popover + AlertDialog focus conflict
const [confirmReset, setConfirmReset] = useState(false);

// Step 1 row
{!confirmReset && (
  <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>
    <RotateCcw /> Reset table
  </Button>
)}

// Step 2 row
{confirmReset && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground flex-1">Are you sure?</span>
    <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>Keep playing</Button>
    <Button variant="destructive" size="sm" onClick={() => {
      sendAction({ type: 'RESET_TABLE' });
      setOpen(false);
      setConfirmReset(false);
    }}>Reset table</Button>
  </div>
)}
```

[ASSUMED — pattern is standard React, not lifted from a library source]

### Pattern 3: Copied! feedback with auto-close

**What:** Replicate the `copied` / `setCopied` / `setTimeout` pattern from `BoardView.tsx`, now inside `ControlsBar.tsx`.
**When to use:** Clipboard copy with visual feedback before panel close.

```tsx
// Source: BoardView.tsx lines 33–41 (existing pattern to replicate)
const [copied, setCopied] = useState(false);

function handleCopy() {
  const base = import.meta.env.BASE_URL || '/virtual-deck/';
  const url = `${window.location.origin}${base}?room=${roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);  // panel closes after feedback completes
    }, 1500);
  }).catch(() => {});
}
```

[VERIFIED: source code read from BoardView.tsx]

### Pattern 4: PopoverContent positioning

The installed `PopoverContent` accepts `side` and `align` as props (forwarded to `PopoverPrimitive.Positioner`):

```tsx
// Source: src/components/ui/popover.tsx lines 21-22
<PopoverContent side="bottom" align="end" className="w-56 p-4">
```

Default width from component is `w-72`; override to `w-56` for this panel per UI Spec. [VERIFIED: popover.tsx line 38]

### Pattern 5: Button size="icon-sm"

The hamburger trigger must be `size="icon-sm"` which produces a 28×28px (7 Tailwind units) square button.

```tsx
// Source: src/components/ui/button.tsx line 33 — "icon-sm" size defined
<Button variant="outline" size="icon-sm" aria-label="Open controls">
  <Menu className="size-4" />
</Button>
```

[VERIFIED: button.tsx confirms `"icon-sm": "size-7 rounded-[min(var(--radius-md),12px)]..."`]

### Anti-Patterns to Avoid

- **Nested Popover for Deal card count:** The current ControlsBar uses a Popover just for the card count input. This is being removed; the input lives inline. D-08.
- **AlertDialog for Reset confirmation:** The current ControlsBar uses an AlertDialog inside the playing-phase branch. This is being removed; inline `confirmReset` state replaces it. D-07.
- **Conditional rendering by phase:** Current ControlsBar returns `null` for unrecognized phases and renders different elements per phase. New pattern: always render, use `disabled` prop.
- **Leaving Copy link in BoardView:** After this phase, `handleCopy` and the Copy link `<Button>` must be removed from `BoardView.tsx`. Leaving both in place would duplicate the button.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap when panel is open | Custom focus management | Base UI Popover (already installed) | `@base-ui/react/popover` handles focus trap, outside-click, keyboard dismiss automatically |
| Outside-click to close | `useEffect` + document click listener | Popover `onOpenChange` | Radix/Base UI provides this for free via controlled `open` prop |
| Panel positioning / overflow | Custom positioning logic | `PopoverContent side="bottom" align="end"` | Positioner handles viewport overflow automatically |
| Clipboard API error handling | try/catch or custom wrapper | `.catch(() => {})` (existing pattern) | Silent failure is the correct behavior; no user-visible error state needed |

---

## Common Pitfalls

### Pitfall 1: confirmReset not reset when panel closes

**What goes wrong:** User clicks Reset → sees confirmation row → clicks outside to dismiss the panel. Next time panel opens, `confirmReset` is still `true` — the confirmation row shows immediately without the user having clicked Reset.

**Why it happens:** `confirmReset` is local state initialized to `false` but never cleared on panel close.

**How to avoid:** In `onOpenChange` handler (or equivalent), reset `confirmReset` to `false` whenever `open` goes to `false`:
```tsx
onOpenChange={(nextOpen) => {
  if (!nextOpen) setConfirmReset(false);
  setOpen(nextOpen);
}}
```

**Warning signs:** If testing by opening → clicking Reset → clicking outside → reopening, confirmation row visible on reopen.

### Pitfall 2: Copy link panel close races with "Copied!" state

**What goes wrong:** `setOpen(false)` fires before the "Copied!" feedback is visible if both happen synchronously.

**Why it happens:** Calling `setOpen(false)` immediately after `setCopied(true)` without a delay.

**How to avoid:** Only call `setOpen(false)` inside the `setTimeout` callback, not immediately after the clipboard write. The 1.5s timeout is the guard.

**Warning signs:** Panel closes before "Copied!" text is ever rendered.

### Pitfall 3: `roomId` prop missing from ControlsBarProps

**What goes wrong:** TypeScript error when trying to access `roomId` inside the rewritten `ControlsBar`; or Copy link generates a broken URL.

**Why it happens:** `ControlsBarProps` currently has `gameState`, `playerId`, `sendAction` — no `roomId`. [VERIFIED: ControlsBar.tsx lines 23–27]

**How to avoid:** Add `roomId: string` to `ControlsBarProps` AND add `roomId={roomId}` to the `<ControlsBar>` call in `BoardView.tsx`. These are a matched pair — both must change.

**Warning signs:** TypeScript error `Property 'roomId' does not exist on type 'ControlsBarProps'`.

### Pitfall 4: Dead code left in BoardView.tsx

**What goes wrong:** Copy link button and `handleCopy` remain in `BoardView.tsx` after the rewrite, causing duplicate Copy link buttons.

**Why it happens:** Forgetting to remove the `<Button ... onClick={handleCopy}>` block (lines 68–86) and the `handleCopy` function (lines 32–41) and the `copied` state (line 25) after moving the logic to `ControlsBar`.

**How to avoid:** Treat the BoardView edit as paired with the ControlsBar rewrite — they must both complete in the same task or the same wave.

**Warning signs:** Two Copy link buttons visible in header during intermediate state.

### Pitfall 5: Base UI Popover prop API differences from Radix

**What goes wrong:** Using Radix UI prop names (e.g., `open={open}` on `PopoverTrigger`, or `onOpenChange` on `PopoverContent`) that don't apply to the Base UI wrapper.

**Why it happens:** The project's `popover.tsx` wraps `@base-ui/react/popover`, NOT Radix UI — the prop surface is slightly different. [VERIFIED: popover.tsx line 2]

**How to avoid:** `open` and `onOpenChange` belong on `<Popover>` (the Root), not on Trigger or Content. The existing usage in `ControlsBar.tsx` (lines 45–64) shows the correct pattern — follow it exactly.

**Warning signs:** TypeScript errors about unknown props; panel not responding to programmatic `setOpen(false)`.

---

## Code Examples

Verified patterns from source code:

### Existing Popover controlled usage (correct pattern to follow)
```tsx
// Source: src/components/ControlsBar.tsx lines 45–64
const [popoverOpen, setPopoverOpen] = useState(false);

<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
  <PopoverTrigger className={buttonVariants({ variant: 'default', size: 'sm' })}>
    Deal <ChevronDown className="w-4 h-4 ml-1" />
  </PopoverTrigger>
  <PopoverContent side="bottom" align="end" className="w-[200px] p-4">
    ...
  </PopoverContent>
</Popover>
```

### Separator component usage
```tsx
// Source: src/components/ui/separator.tsx
import { Separator } from '@/components/ui/separator';
<Separator />  // horizontal by default, full width
```

### Existing Copy link pattern to replicate
```tsx
// Source: src/components/BoardView.tsx lines 32–41
const handleCopy = () => {
  const base = import.meta.env.BASE_URL || '/virtual-deck/';
  const url = `${window.location.origin}${base}?room=${roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
};
```
Note: UI Spec specifies 1.5s (not 2s); use 1500ms and add `setOpen(false)` inside the timeout.

### Enabled/disabled logic from gameState
```tsx
// Source: src/shared/types.ts — ClientGameState shape (verified)
// Deal enabled when:
disabled={gameState.phase !== 'setup' && gameState.phase !== 'lobby'}
// Undo enabled when:
disabled={!gameState.canUndo}
// Reset enabled when:
disabled={gameState.phase !== 'playing'}
// Copy link: always enabled (no disabled prop needed)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Conditional rendering by phase (returns null, different JSX per phase) | Always render, disabled props per condition | Phase 18 | Simpler component, no layout shift |
| AlertDialog for Reset confirmation | Inline confirmReset boolean state | Phase 18 | Eliminates Popover + AlertDialog focus conflict |
| Separate Deal Popover nested in ControlsBar | Inline card count input in main panel | Phase 18 | No nested popovers |
| Copy link in BoardView header | Copy link first item in controls panel | Phase 18 | Header has only hamburger trigger |

**Deprecated after this phase:**
- AlertDialog import in ControlsBar (full AlertDialog block replaced by inline state)
- ChevronDown icon in ControlsBar (Deal no longer has its own trigger)
- `buttonVariants` import in ControlsBar (PopoverTrigger wraps a Button directly now)
- `copied` state and `handleCopy` in BoardView

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two-step inline Reset confirmation using `confirmReset: boolean` state is standard React pattern | Architecture Patterns (Pattern 2) | Low — pattern is straightforward; risk is styling, not logic |
| A2 | `setConfirmReset(false)` should be called in `onOpenChange` when panel closes, to reset stale confirmation state | Common Pitfalls (Pitfall 1) | Medium — if wrong, confirmation row stays visible on reopen; easy to fix in code review |

---

## Open Questions

None. All decisions are locked in CONTEXT.md and the UI Spec is approved.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 18 is a pure client-side code/component refactor with no external dependencies beyond what is already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vite.config.ts (no separate vitest.config.ts) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-03 | Panel is closed by default on load | unit (logic extraction) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| LAYOUT-03 | All controls present in panel (Deal, Undo, Reset, Copy link) | manual smoke / e2e | `npm run test:e2e` | ❌ Wave 0 optional |
| LAYOUT-03 | Panel auto-closes after action fires | unit (logic extraction) | `npm test` | ❌ Wave 0 |
| LAYOUT-03 | Undo disabled when `canUndo=false` | unit (logic extraction) | `npm test` | ❌ Wave 0 |
| LAYOUT-03 | Reset confirmation step 2 resets on panel close | unit (logic extraction) | `npm test` | ❌ Wave 0 |

**Note on test approach:** The project's test pattern (confirmed by `boardDragLayerDialog.test.ts`) is pure logic extraction — no component mounting, no jsdom, no React Testing Library. Tests extract behavioral logic into plain functions and verify contracts. This same pattern applies here: extract the auto-close logic, enabled/disabled derivation, and confirmReset state machine into a test helper and verify them directly.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + manual smoke of the panel in `npm run dev:client` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/controlsCollapse.test.ts` — covers panel auto-close logic, confirmReset state machine, enabled/disabled derivation for LAYOUT-03

*(No framework install needed — Vitest already configured.)*

---

## Security Domain

This phase introduces no authentication, session management, access control, cryptography, or user input that reaches the server beyond what already exists (`DEAL_CARDS.cardsPerPlayer` was already validated server-side). No new ASVS categories apply.

V5 Input Validation: `dealCount` is parsed with `parseInt(dealCount, 10)` before being sent as `cardsPerPlayer`. The existing server-side validation of `DEAL_CARDS` covers the trust boundary. No change needed.

---

## Sources

### Primary (HIGH confidence)
- `src/components/ControlsBar.tsx` — full source read, current state verified
- `src/components/BoardView.tsx` — full source read, current state verified
- `src/components/ui/popover.tsx` — Base UI wrapper API verified
- `src/components/ui/button.tsx` — size/variant table verified; `icon-sm` confirmed
- `src/components/ui/separator.tsx` — component signature verified
- `src/shared/types.ts` — `ClientGameState` shape and `ClientAction` union verified
- `package.json` — all dependency versions and scripts verified
- `.planning/phases/18-controls-collapse/18-CONTEXT.md` — all locked decisions
- `.planning/phases/18-controls-collapse/18-UI-SPEC.md` — approved design contract
- `tests/boardDragLayerDialog.test.ts` — test pattern (logic extraction) verified

### Secondary (MEDIUM confidence)
- None required — all findings from direct codebase reads

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified present in codebase
- Architecture: HIGH — decisions locked, component APIs read from source
- Pitfalls: HIGH (Pitfall 1, 3, 4, 5) / MEDIUM (Pitfall 2) — derived from source code inspection and locked decision rationale

**Research date:** 2026-05-03
**Valid until:** Stable — no external dependencies; valid until codebase changes
