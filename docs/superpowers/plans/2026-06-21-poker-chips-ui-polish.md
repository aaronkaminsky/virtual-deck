# Poker Chips UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat chip-dot/disc visuals with a sharper gold-coin look, move chip displays into the lines/boxes they visually belong with (Hand's name row, a `PileZone`-style box for Pot, a leading slot inside the Spread card box), and hide every chip control behind the app's existing hover/focus-reveal convention (`zone-hover`/`zone-controls`), with secondary actions tucked behind a kebab `Popover`.

**Architecture:** Purely presentational — no `ClientAction`, server, or data-model changes. Two small leaf components (`ChipBadge`, `ChipStack`) get a shared coin visual; three consumer components (`HandZone`, `SpreadZone`, `PotZone`) get restructured layouts that reuse the existing `zone-hover`/`zone-controls`/`Popover`/`Badge` patterns already established elsewhere in the codebase (`PileZone`, `ControlsBar`).

**Tech Stack:** TypeScript, React 18, Tailwind v4 (existing theme tokens only, plus one deliberate literal-gradient exception on the coin face), lucide-react icons, the existing `@base-ui/react`-backed `Popover`/`Badge` UI primitives, Vitest source-contract tests, Playwright e2e.

## Global Constraints

- No new theme color tokens — the coin's gradient stops (`#f5d77a`, the existing `--primary` via Tailwind's `via-primary`, `#9a7416`) are a literal, single-use exception scoped to the coin face only, not a new named token.
- No `ClientAction`/server changes — every `TRANSFER_CHIPS` dispatch shape already implemented stays the same; only which UI control triggers it changes.
- Touch devices keep all controls visible at all times via the existing `@media (hover: hover)` rule in `src/globals.css` — do not add any new CSS for this, the existing `zone-hover`/`zone-controls` classes already handle it.
- `ChipStack` always renders exactly 3 coins regardless of `amount` — purely cosmetic, never read back into logic.
- This codebase tests UI components with source-contract tests (`?raw` import + regex assertions on the source text, e.g. `tests/pileZonePolish.test.ts`) — there are zero React Testing Library tests in `tests/`. Follow that convention for every test step below.
- Existing chip source-contract tests in `tests/chipVisuals.test.ts`, `tests/chipsHandZone.test.ts`, `tests/chipsSpreadZone.test.ts`, `tests/chipsPotZone.test.ts` assert string patterns from the *old* markup (e.g. a literal `<ChipBadge` inside `SpreadZone.tsx`, or `{amount}` inline inside `ChipStack.tsx`). These are **expected, planned-for rewrites** per task below, not regressions to avoid.

---

### Task 1: `ChipBadge` — gold-coin dot instead of a flat dot

**Files:**
- Modify: `src/components/ChipBadge.tsx`
- Test: `tests/chipVisuals.test.ts` (the `ChipBadge` `describe` block only)

**Interfaces:**
- Produces: `ChipBadge({ amount, className? })` — unchanged signature; only the dot's visual treatment changes.

- [ ] **Step 1: Write the failing test** — replace the existing `ChipBadge` `describe` block in `tests/chipVisuals.test.ts` with:

```ts
describe("ChipBadge", () => {
  it("renders the amount inside a Badge with a gradient gold-coin dot", () => {
    expect(ChipBadgeSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(ChipBadgeSrc).toMatch(/bg-gradient-to-br/);
    expect(ChipBadgeSrc).toMatch(/from-\[#f5d77a\]/);
    expect(ChipBadgeSrc).toMatch(/via-primary/);
    expect(ChipBadgeSrc).toMatch(/to-\[#9a7416\]/);
    expect(ChipBadgeSrc).toMatch(/\{amount\}/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipVisuals`
Expected: FAIL — the current `ChipBadge.tsx` has a flat `bg-primary` dot, no gradient classes exist yet.

- [ ] **Step 3: Update `src/components/ChipBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipBadgeProps {
  amount: number;
  className?: string;
}

export function ChipBadge({ amount, className }: ChipBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 font-mono', className)} data-testid="chip-badge">
      <span
        className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
        aria-hidden
      />
      {amount}
    </Badge>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipVisuals`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ChipBadge.tsx tests/chipVisuals.test.ts
git commit -m "feat(chips): give ChipBadge's dot a gold-coin gradient treatment"
```

---

### Task 2: `ChipStack` — three evenly-spaced coins, no inline number

**Files:**
- Modify: `src/components/ChipStack.tsx`
- Test: `tests/chipVisuals.test.ts` (the `ChipStack` `describe` block only)

**Interfaces:**
- Produces: `ChipStack({ amount, className? })` — same signature, but `amount` is now used only for the `aria-label` (e.g. `"240 chips"`), not rendered as visible text. The 3 coins are absolutely positioned with a fixed 5px gap, replacing the old negative-margin `flex-col-reverse` approach. Consumers (Task 3, 4) are responsible for displaying the number themselves, as an overlaid `Badge`.

- [ ] **Step 1: Write the failing test** — replace the existing `ChipStack` `describe` block in `tests/chipVisuals.test.ts` with:

```ts
describe("ChipStack", () => {
  it("renders exactly 3 absolutely-positioned coins with a fixed 5px gap, no inline amount text", () => {
    const coinMatches = [...ChipStackSrc.matchAll(/rounded-full/g)];
    expect(coinMatches.length).toBe(3);
    expect(ChipStackSrc).toMatch(/position:\s*['"]absolute['"]|className=.*absolute/);
    expect(ChipStackSrc).toMatch(/top:\s*10/);
    expect(ChipStackSrc).toMatch(/top:\s*5/);
    expect(ChipStackSrc).toMatch(/top:\s*0/);
    expect(ChipStackSrc).not.toMatch(/amount\s*>\s*\d+.*rounded-full/); // height must not scale with amount
    expect(ChipStackSrc).not.toMatch(/>\{amount\}</); // no inline visible number — consumers render it themselves
    expect(ChipStackSrc).toMatch(/aria-label=\{`\$\{amount\}/);
    expect(ChipStackSrc).toMatch(/bg-gradient-to-br/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipVisuals`
Expected: FAIL — current `ChipStack.tsx` uses negative-margin flex discs and renders `{amount}` as inline text.

- [ ] **Step 3: Rewrite `src/components/ChipStack.tsx`**

```tsx
import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  className?: string;
}

const COIN_OFFSETS = [10, 5, 0];

export function ChipStack({ amount, className }: ChipStackProps) {
  return (
    <div
      className={cn('relative w-[18px] h-[28px]', className)}
      data-testid="chip-stack"
      aria-label={`${amount} chips`}
    >
      {COIN_OFFSETS.map((top, i) => (
        <div
          key={i}
          className="absolute left-0 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ top, zIndex: i }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipVisuals`
Expected: PASS

- [ ] **Step 5: Run the full unit suite to confirm nothing else broke yet**

Run: `npm test`
Expected: Failures in `tests/chipsPotZone.test.ts` and `tests/chipsSpreadZone.test.ts` are EXPECTED at this point (they still reference the old `ChipStack`/`ChipBadge` markup in `PotZone.tsx`/`SpreadZone.tsx`, which haven't been updated yet — Tasks 4 and 5 fix this). Confirm no *other* test files regressed.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChipStack.tsx tests/chipVisuals.test.ts
git commit -m "feat(chips): rebuild ChipStack as 3 evenly-spaced absolute-positioned coins"
```

---

### Task 3: `HandZone` — chip badge joins the name row; controls hide until hover

**Files:**
- Modify: `src/components/HandZone.tsx`
- Test: `tests/chipsHandZone.test.ts`

**Interfaces:**
- Consumes: `ChipBadge` (Task 1).
- Produces: `HandZoneProps` unchanged (`chipsEnabled: boolean`, `chipsInHand: number` already exist). No prop signature changes — purely internal JSX restructuring.

- [ ] **Step 1: Write the failing test** — replace `tests/chipsHandZone.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";

describe("HandZone chip support", () => {
  it("imports ChipBadge, MoreVertical, and Popover", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
    expect(HandZoneSrc).toMatch(/MoreVertical/);
    expect(HandZoneSrc).toMatch(/Popover/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(HandZoneSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge in the name row (same block as the connected-dot span), not a separate row", () => {
    const nameRowMatch = HandZoneSrc.match(/<div className="flex items-center gap-2 px-4 mb-1">[\s\S]*?<\/div>\s*<div\s/);
    expect(nameRowMatch).not.toBeNull();
    expect(nameRowMatch![0]).toMatch(/<ChipBadge/);
  });

  it("wraps the bet input, Bet button, and kebab together in zone-controls", () => {
    expect(HandZoneSrc).toMatch(/zone-controls[\s\S]{0,80}>[\s\S]{0,600}type="number"[\s\S]{0,500}Bet \{betAmount\}[\s\S]{0,500}MoreVertical/);
  });

  it("dispatches TRANSFER_CHIPS from hand to spread on the Bet action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("dispatches TRANSFER_CHIPS from hand to pot on the popover's To pot action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("no standalone always-visible chip row remains outside zone-controls", () => {
    // The old shipped version had a second top-level "flex items-center gap-2 px-4 mb-1" row
    // dedicated to chips. After this change there must be exactly one such row (the name row).
    const matches = [...HandZoneSrc.matchAll(/<div className="flex items-center gap-2 px-4 mb-1">/g)];
    expect(matches.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsHandZone`
Expected: FAIL — `MoreVertical`/`Popover` aren't imported yet, `ChipBadge` is in its own row, two `"flex items-center gap-2 px-4 mb-1"` rows exist.

- [ ] **Step 3: Update imports in `src/components/HandZone.tsx`**

Replace the top of the file's import block:

```ts
import { useState } from 'react';
import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, ArrowUpDown, MoreVertical } from 'lucide-react';
import type { Card, ClientAction, Suit, Rank, SelectionSource, LastMoveHighlight } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { ChipBadge } from './ChipBadge';
import { cn } from '@/lib/utils';
```

(Only the `Eye, EyeOff, ArrowUpDown` import line gains `MoreVertical`, and a new `Popover, PopoverContent, PopoverTrigger` import line is added. Everything else is unchanged.)

- [ ] **Step 4: Add a popover-open handler next to the existing `betAmount` state** (replace the existing `const [betAmount, setBetAmount] = useState(10);` block with):

```ts
  const [betAmount, setBetAmount] = useState(10);
  const [chipPopoverOpen, setChipPopoverOpen] = useState(false);

  function handleBet() {
    if (betAmount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'hand', to: 'spread', playerId, amount: betAmount });
  }

  function handleHandToPot() {
    if (betAmount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'hand', to: 'pot', playerId, amount: betAmount });
    setChipPopoverOpen(false);
  }
```

(This replaces the existing `handleBet`/`handleHandToPot` pair — `handleHandToPot`'s body is unchanged except it now also closes the popover it will live in.)

- [ ] **Step 5: Replace the return JSX's name row and remove the old standalone chip row**

Replace this entire block (the name row through the end of the old standalone chip row):

```tsx
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        {selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId && (
          <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
            {selectedIds.size} selected
          </span>
        )}
        <span className="flex gap-1 zone-controls">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onToggleReveal}
            title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
            aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
            aria-pressed={isRevealed}
          >
            {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSort}
            title={SORT_TITLES[sortMode]}
            aria-label={SORT_ARIA_LABELS[sortMode]}
          >
            <ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
          </Button>
        </span>
      </div>
      {chipsEnabled && (
        <div className="flex items-center gap-2 px-4 mb-1">
          <ChipBadge amount={chipsInHand} />
          <Input
            type="number"
            min={1}
            value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20 h-7"
          />
          <Button variant="outline" size="sm" onClick={handleBet}>Bet {betAmount}</Button>
          <Button variant="ghost" size="sm" onClick={handleHandToPot}>To pot</Button>
        </div>
      )}
```

with:

```tsx
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        {selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId && (
          <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
            {selectedIds.size} selected
          </span>
        )}
        {chipsEnabled && <ChipBadge amount={chipsInHand} className="ml-auto" />}
        <span className="flex items-center gap-1 zone-controls">
          {chipsEnabled && (
            <>
              <Input
                type="number"
                min={1}
                value={betAmount}
                onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 h-7"
              />
              <Button variant="outline" size="sm" onClick={handleBet}>Bet {betAmount}</Button>
              <Popover open={chipPopoverOpen} onOpenChange={setChipPopoverOpen}>
                <PopoverTrigger render={
                  <Button variant="ghost" className="h-7 w-7 p-0" aria-label="More chip actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                } />
                <PopoverContent side="bottom" align="end" className="w-48 p-2.5">
                  <Button variant="outline" size="sm" className="w-full" onClick={handleHandToPot}>To pot</Button>
                </PopoverContent>
              </Popover>
            </>
          )}
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onToggleReveal}
            title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
            aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
            aria-pressed={isRevealed}
          >
            {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSort}
            title={SORT_TITLES[sortMode]}
            aria-label={SORT_ARIA_LABELS[sortMode]}
          >
            <ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
          </Button>
        </span>
      </div>
```

Note `Input` is still imported and used (the bet-amount input), so its import line is unchanged.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- chipsHandZone`
Expected: PASS

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/HandZone.tsx tests/chipsHandZone.test.ts
git commit -m "feat(chips): move HandZone's chip badge into the name row, hide controls until hover"
```

---

### Task 4: `PotZone` — adopt the `PileZone` label+box pattern

**Files:**
- Modify: `src/components/PotZone.tsx`
- Test: `tests/chipsPotZone.test.ts`

**Interfaces:**
- Consumes: `ChipStack` (Task 2), `Badge` (`@/components/ui/badge`, already used by `PileZone`).
- Produces: `PotZoneProps` unchanged (`pot: number`, `myPlayerId: string`, `sendAction`).

- [ ] **Step 1: Write the failing test** — replace `tests/chipsPotZone.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import PotZoneSrc from "../src/components/PotZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("PotZone", () => {
  it("imports ChipStack, Badge, MoreVertical, and Popover", () => {
    expect(PotZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
    expect(PotZoneSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(PotZoneSrc).toMatch(/MoreVertical/);
    expect(PotZoneSrc).toMatch(/Popover/);
  });

  it("wraps the zone in zone-hover and has a label+kebab row matching the PileZone pattern", () => {
    expect(PotZoneSrc).toMatch(/zone-hover/);
    expect(PotZoneSrc).toMatch(/zone-label/);
    expect(PotZoneSrc).toMatch(/flex justify-between items-center/);
  });

  it("renders the coin stack inside a bg-secondary box with the pot amount as an overlaid Badge", () => {
    expect(PotZoneSrc).toMatch(/bg-secondary/);
    expect(PotZoneSrc).toMatch(/<ChipStack/);
    expect(PotZoneSrc).toMatch(/<Badge className="absolute -bottom-2 -right-2">\{pot\}<\/Badge>/);
  });

  it("hides Take all behind zone-controls", () => {
    expect(PotZoneSrc).toMatch(/zone-controls[\s\S]{0,300}Take all/);
  });

  it("dispatches TRANSFER_CHIPS from pot to hand on the Take all action", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("offers a secondary control to move pot chips to the player's own spread", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("the popover amount input defaults to the current pot value when opened", () => {
    expect(PotZoneSrc).toMatch(/setAmount\(pot\)/);
  });
});

describe("BoardView renders PotZone in the rail when chips are enabled", () => {
  it("imports PotZone", () => {
    expect(BoardViewSrc).toMatch(/import\s*\{\s*PotZone\s*\}\s*from\s*['"]\.\/PotZone['"]/);
  });

  it("guards PotZone with gameState.chipsEnabled", () => {
    expect(BoardViewSrc).toMatch(/gameState\.chipsEnabled\s*&&[\s\S]{0,300}<PotZone/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsPotZone`
Expected: FAIL — current `PotZone.tsx` has no `zone-hover`, no `Badge` import, no `MoreVertical`/`Popover`, and renders the amount as plain text inside `ChipStack`, not an overlaid `Badge`.

- [ ] **Step 3: Rewrite `src/components/PotZone.tsx`**

```tsx
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { ClientAction } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChipStack } from './ChipStack';

interface PotZoneProps {
  pot: number;
  myPlayerId: string;
  sendAction: (action: ClientAction) => void;
}

export function PotZone({ pot, myPlayerId, sendAction }: PotZoneProps) {
  const [amount, setAmount] = useState(pot);
  const [popoverOpen, setPopoverOpen] = useState(false);

  function handlePopoverOpenChange(open: boolean) {
    setPopoverOpen(open);
    if (open) setAmount(pot);
  }

  function handleTakeAll() {
    if (pot > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount: pot });
  }

  function handleToHand() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount });
    setPopoverOpen(false);
  }

  function handleToSpread() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'spread', playerId: myPlayerId, amount });
    setPopoverOpen(false);
  }

  return (
    <div className="flex flex-col gap-0.5 zone-hover" data-testid="pot-zone">
      <div className="flex justify-between items-center">
        <span className="zone-label hidden sm:inline">Pot</span>
        <div className="flex gap-1 zone-controls">
          <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger render={
              <Button variant="ghost" className="h-7 w-7 p-0" aria-label="More chip actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            } />
            <PopoverContent side="bottom" align="end" className="w-48 p-2.5">
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={e => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleToHand}>Hand</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleToSpread}>Bet</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border border-border flex items-center justify-center relative bg-secondary py-2">
        <ChipStack amount={pot} />
        <Badge className="absolute -bottom-2 -right-2">{pot}</Badge>
      </div>
      <div className="zone-controls">
        <Button variant="outline" size="sm" className="w-full" onClick={handleTakeAll} disabled={pot === 0}>Take all</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chipsPotZone`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/PotZone.tsx tests/chipsPotZone.test.ts
git commit -m "feat(chips): restructure PotZone to match the PileZone label+box pattern"
```

---

### Task 5: `SpreadZone` — chip slot moves inside the card box; controls reorder

**Files:**
- Modify: `src/components/SpreadZone.tsx`
- Test: `tests/chipsSpreadZone.test.ts`

**Interfaces:**
- Consumes: `ChipStack` (Task 2), `Badge`.
- Produces: `SpreadZoneProps` unchanged (`chipsEnabled?: boolean`, `chipsInSpread?: number` already exist).

- [ ] **Step 1: Write the failing test** — replace `tests/chipsSpreadZone.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone chip support", () => {
  it("imports ChipStack, Badge, MoreVertical, Popover, and ArrowRight", () => {
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(SpreadZoneSrc).toMatch(/MoreVertical/);
    expect(SpreadZoneSrc).toMatch(/Popover/);
    expect(SpreadZoneSrc).toMatch(/ArrowRight/);
  });

  it("accepts chipsEnabled and chipsInSpread props", () => {
    expect(SpreadZoneSrc).toMatch(/chipsEnabled\?:\s*boolean/);
    expect(SpreadZoneSrc).toMatch(/chipsInSpread\?:\s*number/);
  });

  it("does not collapse to the thin empty strip when there is a bet but no cards", () => {
    expect(SpreadZoneSrc).toMatch(/const hasBet = chipsEnabled && chipsInSpread > 0;/);
    expect(SpreadZoneSrc).toMatch(/const isReallyEmpty = isEmpty && !hasBet;/);
  });

  it("renders the chip slot with an overlaid Badge for both owner and opponent views (no interactive gate on display)", () => {
    expect(SpreadZoneSrc).toMatch(/\{hasBet[\s\S]{0,400}<ChipStack/);
    expect(SpreadZoneSrc).toMatch(/<Badge className="absolute -bottom-2 -right-2">\{chipsInSpread\}<\/Badge>/);
  });

  it("gates the chip transfer CONTROLS (not the display) on interactive !== false", () => {
    expect(SpreadZoneSrc).toMatch(/interactive !== false[\s\S]{0,800}ArrowRight/);
  });

  it("orders chip controls before the eye/select-all controls with a divider between", () => {
    const controlsRowMatch = SpreadZoneSrc.match(/<div className="flex gap-1 zone-controls">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\);/);
    expect(controlsRowMatch).not.toBeNull();
    const row = controlsRowMatch![0];
    const arrowIdx = row.indexOf('ArrowRight');
    const eyeIdx = row.indexOf('handleToggleFace');
    expect(arrowIdx).toBeGreaterThan(-1);
    expect(eyeIdx).toBeGreaterThan(-1);
    expect(arrowIdx).toBeLessThan(eyeIdx);
  });

  it("dispatches TRANSFER_CHIPS from spread to pot on the always-visible action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("dispatches TRANSFER_CHIPS from spread to hand from the popover", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("the popover amount defaults to the current chipsInSpread value when opened", () => {
    expect(SpreadZoneSrc).toMatch(/setChipMoveAmount\(chipsInSpread\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chipsSpreadZone`
Expected: FAIL — none of the new patterns exist yet; current file imports `ChipBadge`, not `ChipStack`/`Badge`/`MoreVertical`/`Popover`/`ArrowRight`.

- [ ] **Step 3: Update imports in `src/components/SpreadZone.tsx`**

Replace:

```ts
import { useState } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientPile, ClientAction, SelectionSource, LastMoveHighlight } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, SquareCheck } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { ChipBadge } from './ChipBadge';
import { cn } from '@/lib/utils';
```

with:

```ts
import { useState } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientPile, ClientAction, SelectionSource, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Eye, EyeOff, SquareCheck, MoreVertical, ArrowRight } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { ChipStack } from './ChipStack';
import { cn } from '@/lib/utils';
```

- [ ] **Step 4: Replace the chip-handler block** (everything between `const sentinelId = ...` and the `useDndMonitor({` call) — replace:

```ts
  const [toHandAmount, setToHandAmount] = useState(10);

  function handleMoveToPot() {
    if (chipsInSpread > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipsInSpread });
    }
  }

  function handleToHand() {
    if (toHandAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'hand', playerId: pile.ownerId, amount: toHandAmount });
    }
  }
```

with:

```ts
  const [chipMoveAmount, setChipMoveAmount] = useState(chipsInSpread);
  const [chipPopoverOpen, setChipPopoverOpen] = useState(false);

  function handleChipPopoverOpenChange(open: boolean) {
    setChipPopoverOpen(open);
    if (open) setChipMoveAmount(chipsInSpread);
  }

  function handleMoveToPot() {
    if (chipsInSpread > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipsInSpread });
    }
  }

  function handlePopoverToPot() {
    if (chipMoveAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipMoveAmount });
    }
    setChipPopoverOpen(false);
  }

  function handlePopoverToHand() {
    if (chipMoveAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'hand', playerId: pile.ownerId, amount: chipMoveAmount });
    }
    setChipPopoverOpen(false);
  }
```

- [ ] **Step 5: Add `hasBet`/`isReallyEmpty` next to the existing `isEmpty` declaration**

Replace:

```ts
  const isEmpty = pile.cards.length === 0;
```

with:

```ts
  const isEmpty = pile.cards.length === 0;
  const hasBet = chipsEnabled && chipsInSpread > 0;
  const isReallyEmpty = isEmpty && !hasBet;
```

- [ ] **Step 6: Replace the return JSX**

Replace the entire `return (...)` block with:

```tsx
  return (
    <div className="flex flex-col gap-1 zone-hover">
      {selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id && (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
          {selectedIds.size} selected
        </span>
      )}
      {shortcutKey && (
        <kbd className="text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight self-start">
          {shortcutKey}
        </kbd>
      )}
      <div
        ref={setNodeRef}
        data-testid={`spread-zone-${pile.id}`}
        className={cn(
          isReallyEmpty
            ? isOver
              ? 'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'
              : 'h-4 border border-dashed border-muted-foreground/30 rounded-md'
            : cn(
                'min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-3 overflow-x-auto [overflow-y:clip] [overflow-clip-margin:4px] bg-secondary',
                isOver ? 'border-primary' : 'border-border'
              ),
          className
        )}
      >
        {!isReallyEmpty && (
          <>
            {hasBet && (
              <>
                <div className="relative flex-shrink-0 w-[40px] sm:w-[56px] h-[60px] sm:h-[90px] flex items-center justify-center mr-2">
                  <ChipStack amount={chipsInSpread} />
                  <Badge className="absolute -bottom-2 -right-2">{chipsInSpread}</Badge>
                </div>
                <div className="w-px self-stretch bg-border mr-2" />
              </>
            )}
            {!isEmpty && interactive !== false ? (
              <SortableContext items={[...faceUpCards.map(c => c.id), sentinelId]} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center">
                  {pile.cards.map((card, i) => (
                    <div key={'id' in card ? (card as Card).id : `masked-${i}`}>
                      {'id' in card ? (
                        <SortableSpreadCard
                          card={card as Card}
                          pileId={pile.id}
                          index={i}
                          draggingCardId={draggingCardId}
                          isSelected={selectedIds?.has((card as Card).id) ?? false}
                          onToggleSelect={onToggleSelect ?? (() => {})}
                          onCursorChange={onCursorChange ? () => { const idx = faceUpCards.findIndex(c => c.id === (card as Card).id); if (idx !== -1) onCursorChange(idx); } : undefined}
                          isHighlighted={
                            highlightedMove?.toZoneType === "pile" &&
                            highlightedMove.toZoneId === pile.id &&
                            highlightedMove.cardIds.includes((card as Card).id)
                          }
                          highlightNonce={highlightedMove?.nonce}
                          hasCursor={cursorCardId === (card as Card).id}
                        />
                      ) : (
                        <div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
                          <CardBack />
                        </div>
                      )}
                    </div>
                  ))}
                  <SortableSentinel id={sentinelId} />
                </div>
              </SortableContext>
            ) : (
              <div className="flex items-center">
                {pile.cards.map((card, i) => (
                  <div key={'id' in card ? (card as Card).id : `masked-${i}`} className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
                    {'id' in card
                      ? ((card as Card).faceUp ? <CardFace card={card as Card} /> : <CardBack />)
                      : <CardBack />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {interactive !== false && !isReallyEmpty && (
        <div className="flex gap-1 zone-controls">
          {chipsEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMoveToPot}
                disabled={chipsInSpread === 0}
                className="gap-1"
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416]" aria-hidden />
                <ArrowRight className="w-3 h-3" />
                Pot
              </Button>
              <Popover open={chipPopoverOpen} onOpenChange={handleChipPopoverOpenChange}>
                <PopoverTrigger render={
                  <Button variant="ghost" className="h-7 w-7 p-0" aria-label="More chip actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                } />
                <PopoverContent side="bottom" align="start" className="w-48 p-2.5">
                  <div className="flex flex-col gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={chipMoveAmount}
                      onChange={e => setChipMoveAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={handlePopoverToPot}>To pot</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={handlePopoverToHand}>To hand</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-1 self-center" />
            </>
          )}
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleToggleFace}
            title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
            aria-label={pile.faceUp !== false ? 'Cards land face-up' : 'Cards land face-down'}
          >
            {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSelectAll}
            title="Select all cards in zone"
            aria-label="Select all"
            disabled={faceUpCards.length === 0}
          >
            <SquareCheck className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- chipsSpreadZone`
Expected: PASS

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/SpreadZone.tsx tests/chipsSpreadZone.test.ts
git commit -m "feat(chips): move SpreadZone's chip stack into the card box, reorder controls"
```

---

### Task 6: Update e2e coverage for the hover-reveal layout

**Files:**
- Modify: `playwright/chips.spec.ts`

**Interfaces:**
- Consumes: the `twoPlayerRoom` fixture (unchanged), the restructured `HandZone`/`SpreadZone`/`PotZone` markup from Tasks 3-5.

- [ ] **Step 1: Read the current `playwright/chips.spec.ts`** to see the exact existing selectors (they were already adjusted once in the original feature's Task 13 to match real rendered markup — this task adjusts them again for the new hover-reveal layout). Identify every place a button/input is clicked or filled that is now hidden inside `zone-controls` until hover, and every place that needs a kebab `Popover` opened first.

- [ ] **Step 2: For each such interaction, add a `.hover()` on the zone before the click/fill, and add a kebab-open step before any popover-only action.** Concretely:
  - Before clicking "Bet" in `HandZone`: `await p1.getByTestId('hand-zone').hover();` (or hover a stable ancestor — confirm by inspecting the real DOM with `page.locator(...).first()` during the run, since `data-testid="hand-zone"` is on the card-row element, not the outer `zone-hover` wrapper; if hovering that element doesn't reveal the controls, hover the chip badge's container instead, e.g. `p1.getByTestId('chip-badge').hover()`, which sits inside the same `zone-hover` ancestor).
  - Before clicking the spread's "Pot" button: hover the chip stack or the spread zone testid (`spread-zone-<id>`) first.
  - Before clicking "Take all" in `PotZone`: hover `p1.getByTestId('pot-zone')` first.
  - For any assertion that previously checked a button has `toHaveCount(0)` for a non-owner (e.g. the "cannot move another player's chips" test), this should still hold without modification — a hidden-until-hover button that *also* never renders for a non-owner is absent regardless of hover state, so no test logic changes there, only the now-hover-gated owner-side interactions need the new `.hover()` calls.
  - Any interaction with a secondary action (e.g. moving a partial amount, or pot→spread) must open the kebab popover first: `await p1.getByLabel('More chip actions').click();` then fill the input and click the popover's button. (If a test doesn't currently exercise a secondary/popover-only action, no new test is required — Task-13's original 4 tests covered: enabling chips, the primary Bet action, the primary Move-to-pot/Take-all round trip, and the authorization check, none of which were popover-only flows.)

- [ ] **Step 3: Run the chip e2e spec**

Run: `npx playwright test playwright/chips.spec.ts`
Expected: All 4 tests PASS. If a selector still doesn't match the real rendered output (e.g. hovering the testid element doesn't trigger CSS `:hover` because the `zone-hover` class is on a *different* ancestor element than the one being hovered), inspect the actual DOM nesting in `HandZone.tsx`/`SpreadZone.tsx`/`PotZone.tsx` from Tasks 3-5 and hover the correct ancestor — do not change production markup to fit a guessed selector; find the real `zone-hover` ancestor and hover that.

- [ ] **Step 4: Run the full verification gate**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: All unit tests pass, typecheck clean, all e2e tests (including the other 40+ pre-existing specs) pass.

- [ ] **Step 5: Commit**

```bash
git add playwright/chips.spec.ts
git commit -m "test(chips): update e2e selectors for the hover-reveal chip controls layout"
```
