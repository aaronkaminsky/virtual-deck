# Phase 18: Controls Collapse - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 3 (2 modified, 1 new test)
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ControlsBar.tsx` | component (full rewrite) | request-response (sends ClientAction, reads gameState) | `src/components/ControlsBar.tsx` (current state) | self-analog — rewrite in place |
| `src/components/BoardView.tsx` | component (targeted excision) | request-response | `src/components/BoardView.tsx` (current state) | self-analog — remove Copy link block |
| `tests/controlsCollapse.test.ts` | test (new file) | — | `tests/boardDragLayerDialog.test.ts` | exact — same logic-extraction pattern |

---

## Pattern Assignments

### `src/components/ControlsBar.tsx` (component, full rewrite)

**Analog:** `src/components/ControlsBar.tsx` (current), supplemented by `src/components/BoardView.tsx` for Copy link logic

**Imports pattern** — current file (lines 1–21), to be replaced:

```tsx
// CURRENT (lines 1–21) — these imports are being replaced
import { useState } from 'react';
import { ChevronDown, Undo2, RotateCcw } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

// NEW — drop buttonVariants, AlertDialog*, ChevronDown; add Menu, Copy, Check, Separator
import { useState } from 'react';
import { Menu, Copy, Check, Undo2, RotateCcw } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
```

**Props interface** — current file (lines 23–27), add `roomId`:

```tsx
// CURRENT (lines 23–27)
interface ControlsBarProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
}

// NEW — add roomId: string
interface ControlsBarProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
  roomId: string;
}
```

**Controlled Popover pattern** — current file (lines 30, 45–64):

```tsx
// Source: src/components/ControlsBar.tsx lines 30, 45–64
// FOLLOW THIS EXACTLY — open/onOpenChange belong on <Popover> (Root), not Trigger or Content
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

For the rewrite, the trigger becomes a `<Button>` child of `<PopoverTrigger>`:

```tsx
// NEW trigger pattern — Button wraps Menu icon, not buttonVariants on PopoverTrigger
<Popover open={open} onOpenChange={(nextOpen) => {
  if (!nextOpen) setConfirmReset(false);
  setOpen(nextOpen);
}}>
  <PopoverTrigger render={
    <Button variant="outline" size="icon-sm" aria-label={open ? 'Close controls' : 'Open controls'}>
      <Menu className="size-4" />
    </Button>
  } />
  <PopoverContent side="bottom" align="end" className="w-56 p-4">
    ...
  </PopoverContent>
</Popover>
```

Note: `PopoverTrigger` (Base UI) accepts a `render` prop for custom element — same pattern as `AlertDialogTrigger` at line 81 of current ControlsBar.

**Inline Deal pattern** — current file (lines 50–63), already the right structure, just becomes part of the unified panel:

```tsx
// Source: src/components/ControlsBar.tsx lines 50–63
// Keep the label + Input + Button structure; remove the outer Popover wrapper
<div className="flex flex-col gap-2">
  <label className="text-sm font-semibold">Cards per player</label>
  <Input
    type="number"
    min={1}
    max={maxCards}
    value={dealCount}
    onChange={e => setDealCount(e.target.value)}
  />
  <Button variant="default" className="w-full mt-2" onClick={handleDeal}>
    Deal
  </Button>
</div>
```

**Undo button pattern** — current file (lines 72–78):

```tsx
// Source: src/components/ControlsBar.tsx lines 72–78
<Button
  variant="outline"
  size="sm"
  disabled={!gameState.canUndo}
  onClick={() => sendAction({ type: 'UNDO_MOVE' })}
>
  <Undo2 className="w-4 h-4 mr-1" /> Undo
</Button>
```

**Two-step inline Reset pattern** — replaces AlertDialog (lines 80–103):

```tsx
// Source: CONTEXT.md D-07 — no AlertDialog, local boolean state
// Pitfall: reset confirmReset in onOpenChange when panel closes (RESEARCH.md Pitfall 1)
const [confirmReset, setConfirmReset] = useState(false);

// Step 1 (default)
{!confirmReset && (
  <Button
    variant="destructive"
    size="sm"
    disabled={gameState.phase !== 'playing'}
    onClick={() => setConfirmReset(true)}
  >
    <RotateCcw /> Reset table
  </Button>
)}

// Step 2 (after click)
{confirmReset && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground flex-1">Are you sure?</span>
    <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
      Keep playing
    </Button>
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        sendAction({ type: 'RESET_TABLE' });
        setOpen(false);
        setConfirmReset(false);
      }}
    >
      Reset table
    </Button>
  </div>
)}
```

**Copy link pattern** — moved from `BoardView.tsx` (lines 32–41), adapted:

```tsx
// Source: src/components/BoardView.tsx lines 25, 32–41
// Add roomId prop to ControlsBarProps; replicate this pattern inside ControlsBar
// Change: setTimeout duration 1500ms (not 2000ms), add setOpen(false) inside timeout
const [copied, setCopied] = useState(false);

function handleCopy() {
  const base = import.meta.env.BASE_URL || '/virtual-deck/';
  const url = `${window.location.origin}${base}?room=${roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);  // panel closes AFTER feedback, not before
    }, 1500);
  }).catch(() => {});
}

// Button JSX — source: BoardView.tsx lines 68–85
<Button variant="outline" size="sm" onClick={handleCopy}>
  {copied ? (
    <><Check className="mr-2 size-4" />Copied!</>
  ) : (
    <><Copy className="mr-2 size-4" />Copy link</>
  )}
</Button>
```

**Enabled/disabled logic** — derived from `gameState` (RESEARCH.md Code Examples):

```tsx
// Source: src/shared/types.ts — ClientGameState.phase and ClientGameState.canUndo
// Deal enabled in setup or lobby:
disabled={gameState.phase !== 'setup' && gameState.phase !== 'lobby'}
// Undo enabled when flag set:
disabled={!gameState.canUndo}
// Reset enabled only when playing:
disabled={gameState.phase !== 'playing'}
// Copy link: no disabled prop
```

**Separator component usage** — from `src/components/ui/separator.tsx`:

```tsx
import { Separator } from '@/components/ui/separator';
<Separator />  // horizontal, full width — used between Copy link / Deal section / Undo+Reset section
```

**Complete local state** — all `useState` calls for the new component:

```tsx
const [open, setOpen] = useState(false);
const [dealCount, setDealCount] = useState('1');
const [confirmReset, setConfirmReset] = useState(false);
const [copied, setCopied] = useState(false);
```

**Derived values** — keep from current ControlsBar (lines 34–36):

```tsx
// Source: src/components/ControlsBar.tsx lines 34–36
const drawPileCount = gameState.piles.find(p => p.id === 'draw')?.cards.length ?? 0;
const connectedPlayerCount = gameState.players.filter(p => p.connected).length || 1;
const maxCards = Math.floor(drawPileCount / connectedPlayerCount);
```

---

### `src/components/BoardView.tsx` (component, targeted excision)

**Analog:** `src/components/BoardView.tsx` (current state)

This is a removal-only edit. No new patterns introduced.

**State to remove** (line 25):

```tsx
// REMOVE: const [copied, setCopied] = useState(false);
```

**Function to remove** (lines 32–41):

```tsx
// REMOVE entire handleCopy function:
const handleCopy = () => {
  const base = import.meta.env.BASE_URL || '/virtual-deck/';
  const url = `${window.location.origin}${base}?room=${roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
};
```

**Copy link Button to remove** (lines 68–85):

```tsx
// REMOVE this entire Button block from the header right section:
<Button
  variant="outline"
  size="sm"
  onClick={handleCopy}
  aria-label="Copy room link"
>
  {copied ? (
    <><Check className="mr-2 size-4" />Copied!</>
  ) : (
    <><Copy className="mr-2 size-4" />Copy link</>
  )}
</Button>
```

**ControlsBar call to update** (line 86) — add `roomId` prop:

```tsx
// CURRENT (line 86):
<ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} />

// NEW — roomId is already available in BoardView scope (line 16 of BoardViewProps):
<ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} roomId={roomId} />
```

**Imports to clean up** — `Copy` and `Check` icons (line 2) are no longer used in BoardView after the excision:

```tsx
// CURRENT (line 2):
import { Copy, Check } from 'lucide-react';

// REMOVE entirely — both icons move to ControlsBar
```

---

### `tests/controlsCollapse.test.ts` (test, new file)

**Analog:** `tests/boardDragLayerDialog.test.ts` — exact structural match

**Test file pattern** — logic-extraction approach (no jsdom, no React Testing Library, no component mounting):

```ts
// Source: tests/boardDragLayerDialog.test.ts lines 1–13
// Pattern: extract behavioral logic into plain functions, verify contracts directly
// File header comment documents which requirements are covered and WHY logic was extracted

/**
 * Unit tests for ControlsBar collapse logic (phase 18)
 *
 * LAYOUT-03: Panel closed by default; all controls present; auto-close after action;
 *            Undo disabled when canUndo=false; confirmReset resets on panel close.
 *
 * Tests extract behavioral logic into plain functions — no component mounting,
 * no jsdom, no React Testing Library (same pattern as boardDragLayerDialog.test.ts).
 */
```

**Vitest import pattern** (line 14):

```ts
// Source: tests/boardDragLayerDialog.test.ts line 14
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClientGameState, ClientAction } from "@shared/types";
```

**Logic factory pattern** (lines 41–79) — create a self-contained instance of extracted logic:

```ts
// Source: tests/boardDragLayerDialog.test.ts lines 41–79
// Pattern: factory function returns state + setters + handlers; uses plain variables, not React state
function makeControlsLogic(initialPhase: ClientGameState['phase'] = 'setup', canUndo = false) {
  let open = false;
  let confirmReset = false;
  const sendAction = vi.fn<(action: ClientAction) => void>();

  function setOpen(nextOpen: boolean) {
    if (!nextOpen) confirmReset = false;  // mirrors onOpenChange handler
    open = nextOpen;
  }

  function handleAction(type: ClientAction['type'], extra?: Record<string, unknown>) {
    sendAction({ type, ...extra } as ClientAction);
    setOpen(false);
  }

  return {
    get open() { return open; },
    get confirmReset() { return confirmReset; },
    setOpen,
    handleAction,
    sendAction,
    setConfirmReset: (v: boolean) => { confirmReset = v; },
  };
}
```

**describe/it structure** (lines 85–148):

```ts
// Source: tests/boardDragLayerDialog.test.ts lines 85–148
// Pattern: one describe block per requirement ID / behavior cluster
describe("LAYOUT-03: panel closed by default", () => {
  it("open initializes to false", () => { ... });
});

describe("LAYOUT-03: panel auto-closes after action", () => {
  it("handleAction sets open=false", () => { ... });
});

describe("LAYOUT-03: confirmReset resets on panel close", () => {
  it("setOpen(false) clears confirmReset", () => { ... });
});

describe("LAYOUT-03: enabled/disabled derivation", () => {
  it("Undo disabled when canUndo=false", () => { ... });
  it("Deal disabled when phase=playing", () => { ... });
  it("Reset disabled when phase=setup", () => { ... });
});
```

**Mock pattern** (line 43):

```ts
// Source: tests/boardDragLayerDialog.test.ts line 43
const sendAction = vi.fn<(action: ClientAction) => void>();
```

---

## Shared Patterns

### Controlled Popover (Base UI)
**Source:** `src/components/ControlsBar.tsx` lines 45–64 + `src/components/ui/popover.tsx` lines 6–7
**Apply to:** ControlsBar.tsx rewrite

`open` and `onOpenChange` belong on `<Popover>` (the Root), not on Trigger or Content. This is the Base UI API — distinct from Radix UI. The existing ControlsBar usage is the canonical reference.

```tsx
// Correct Base UI pattern:
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger ...>  {/* no open prop here */}
  <PopoverContent ...>  {/* no onOpenChange here */}
```

### Button variants and sizes
**Source:** `src/components/ui/button.tsx` lines 7–42
**Apply to:** All buttons in ControlsBar rewrite

Key sizes in use this phase:
- `size="icon-sm"` → 28×28px (hamburger trigger)
- `size="sm"` → h-7, text-[0.8rem] (all panel buttons)

Key variants:
- `variant="default"` → amber/gold (Deal only)
- `variant="outline"` → border, bg-background (Copy link, Undo, Cancel)
- `variant="destructive"` → red tint (Reset confirmation button only)

### Clipboard copy with feedback
**Source:** `src/components/BoardView.tsx` lines 32–41
**Apply to:** ControlsBar.tsx (Copy link handler)

The only change from the BoardView source: `setTimeout` duration is 1500ms (not 2000ms), and `setOpen(false)` is called inside the timeout callback, not outside it.

### Logic-extraction test pattern
**Source:** `tests/boardDragLayerDialog.test.ts` lines 1–79
**Apply to:** `tests/controlsCollapse.test.ts`

Plain factory functions simulate React state. No component mounting. `vi.fn()` for sendAction. One `describe` block per behavior cluster, labeled with requirement ID.

---

## No Analog Found

All files have direct analogs. No new component types or data flow patterns are introduced.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/ui/`, `tests/`
**Files read:** ControlsBar.tsx, BoardView.tsx, popover.tsx, button.tsx, boardDragLayerDialog.test.ts
**Pattern extraction date:** 2026-05-03
