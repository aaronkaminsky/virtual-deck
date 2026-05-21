# Phase 30: Layout Restructure — Dock Spread Zones - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 3 (modified) + 1 (new)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/BoardView.tsx` | component (layout) | request-response | `src/components/BoardView.tsx` (self — restructure) | exact (self-modification) |
| `src/components/BoardDragLayer.tsx` | component (DndContext host) | event-driven | `src/components/BoardDragLayer.tsx` (self — config add) | exact (self-modification) |
| `playwright/game.spec.ts` | e2e test | event-driven (drag) | `playwright/game.spec.ts` + `playwright/fixtures.ts` | exact |

---

## Pattern Assignments

### `src/components/BoardView.tsx` (layout restructure)

**What changes:** Opponent spreads move out of the `bg-card` header band into a new `flex-shrink-0` row at the top of the board area. The header retains only `OpponentHand` per opponent column. A width-matching invisible spacer is added to align the spread row with the header.

**Current imports** (lines 1–9) — unchanged:
```tsx
import type { ClientAction, ClientGameState } from '@/shared/types';

import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { SpreadZone } from './SpreadZone';
import { GridZone } from './GridZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';
```

**Current header band pattern** (lines 39–71) — the source to modify. After restructure, the opponent column map inside the header renders `OpponentHand` only (no `SpreadZone`). The `gap-1` between OpponentHand and SpreadZone in the column div is removed:
```tsx
// BEFORE (lines 47, 56–63): column div with gap-1 and conditional SpreadZone
<div key={id} className={`flex flex-col gap-1 ${...}`}>
  <OpponentHand ... />
  {opponentSpread && (
    <SpreadZone pile={opponentSpread} sendAction={sendAction} draggingCardId={draggingCardId} interactive={false} />
  )}
</div>

// AFTER: header column renders hand only
<div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}>
  <OpponentHand ... />
</div>
```

**New opponent spreads row** — insert as the first child of the board area div (line 73), before the piles+grid row. Must mirror the header's flex structure exactly so `flex-1` columns align:
```tsx
// NEW: opponent spreads row (insert at start of board area, before piles row)
<div className="flex items-start gap-4 px-4 flex-shrink-0">
  <div className="flex items-start gap-4 flex-1 overflow-hidden">
    {allOpponentIds.map((id) => {
      const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
      return (
        <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}>
          {opponentSpread && (
            <SpreadZone
              pile={opponentSpread}
              sendAction={sendAction}
              draggingCardId={draggingCardId}
              interactive={false}
            />
          )}
        </div>
      );
    })}
  </div>
  {/* Spacer: matches ControlsBar's rendered footprint so flex-1 columns align with header */}
  <div className="flex items-center gap-3 self-start invisible pointer-events-none" aria-hidden="true">
    <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} roomId={roomId} />
  </div>
</div>
```

Note: `invisible` hides visually but preserves layout dimensions. `pointer-events-none` prevents accidental interaction. `aria-hidden="true"` removes it from the accessibility tree. This is the correct pattern for a layout-only spacer.

**Board area div** (line 73) — add `flex flex-col` explicitly to complement `flex-1 min-h-0`:
```tsx
// BEFORE (line 73):
<div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col">

// AFTER (unchanged — already has flex flex-col):
<div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col">
```

**Piles + grid row** (line 74) — D-05: this row gets `flex-1 min-h-0` so it absorbs all extra vertical space:
```tsx
// BEFORE (line 74):
<div className="flex-1 min-h-0 flex items-center px-4 gap-4">

// AFTER: same — already flex-1 min-h-0. Confirm it remains flex-1 after inserting spreads row above.
<div className="flex-1 min-h-0 flex items-center px-4 gap-4">
```

**Personal spread + HandZone** (lines 90–122) — D-04/D-06: unchanged. Both are `flex-shrink-0` via existing `flex-shrink-0 px-4 py-1` wrapper and HandZone's own layout. Do not touch.

**Analog column class pattern** — exact token set from current header map (line 47) to reuse in spread row:
```tsx
className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}
```

**`opponentSpread` lookup** — already computed in the header map; same expression works in spread row:
```tsx
const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
```

---

### `src/components/BoardDragLayer.tsx` (DndContext measuring config)

**What changes:** Add `measuring` prop to `DndContext` at line 369. One-line config addition; no behavioral change.

**Current DndContext usage** (lines 367–374):
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
>
```

**Target DndContext usage** — add import + measuring prop:
```tsx
// Import addition (line 2 — add MeasuringStrategy to existing @dnd-kit/core import):
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision,
  defaultDropAnimation, useSensors, useSensor, PointerSensor, TouchSensor,
  MeasuringStrategy } from '@dnd-kit/core';

// DndContext with measuring prop:
<DndContext
  sensors={sensors}
  collisionDetection={customCollision}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
>
```

**`MeasuringStrategy` source:** `@dnd-kit/core` — same package already imported at line 2. Add to the existing named import list; no new import statement.

---

### `playwright/game.spec.ts` (new test for useDndMonitor + post-restructure spread drag)

**What changes:** A new `test(...)` block appended to the existing `test.describe('virtual-deck e2e', ...)` scope verifying that dragging a card to the personal spread zone (which now lives in the board area, not the header) lands correctly via `useDndMonitor`.

**File location:** `playwright/game.spec.ts` — append to existing describe block.

**Existing drag test pattern** (lines 212–275, `spread zone drag` test) — copy this structure verbatim:
```ts
// Setup pattern: dealCards helper + boundingBox-based mouse drag
await dealCards(p1, 5);
const handZone = p1.getByTestId('hand-zone');
await expect(handZone.locator('[aria-pressed]')).toHaveCount(5);

const src = await card.boundingBox();
const tgt = await targetZone.boundingBox();
if (!src || !tgt) throw new Error('bounding boxes unavailable');

await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await p1.mouse.down();
await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
await p1.mouse.up();
```

**Spread zone selector pattern** (lines 129–136, 291–299) — use `data-testid` prefix selector:
```ts
// Personal spread zone for P1 (spread-{playerId})
const personalSpreadZone = p1.locator('[data-testid^="spread-zone-spread-"]').first();

// After restructure: P1's own spread is in the board area (below the header).
// Verify it's visible and below the header band:
const spreadBox = await personalSpreadZone.boundingBox();
const headerBand = await p1.locator('.bg-card').first().boundingBox();
if (!spreadBox || !headerBand) throw new Error('bounding boxes unavailable');
expect(spreadBox.y).toBeGreaterThan(headerBand.y + headerBand.height);
```

**Console warning check pattern** (lines 246–248, 272–274) — always check for duplicate ID warnings after drag:
```ts
const consoleMessages: string[] = [];
p1.on('console', msg => { consoleMessages.push(msg.text()); });
// ... drag ...
const duplicateIdWarnings = consoleMessages.filter(msg => /duplicate id|multiple elements with the same id/i.test(msg));
expect(duplicateIdWarnings).toHaveLength(0);
```

**Fixture import** (line 2) — already present, no change needed:
```ts
import { test, expect } from './fixtures';
```

**New test scaffold** — append inside `test.describe('virtual-deck e2e', ...)`:
```ts
test('spread zone dock: opponent spread renders in board area below header after restructure', async ({ twoPlayerRoom }) => {
  const { p1 } = twoPlayerRoom;

  // Deal so P1 has cards; play one card to P1's personal spread
  await dealCards(p1, 5);
  const handZone = p1.getByTestId('hand-zone');
  await expect(handZone.locator('[aria-pressed]')).toHaveCount(5);

  // Collect console messages to check for duplicate-ID dnd-kit warnings
  const consoleMessages: string[] = [];
  p1.on('console', msg => { consoleMessages.push(msg.text()); });

  // Locate P1's personal spread zone (spread-{playerId})
  // After restructure: rendered in board area, not in the header band
  const personalSpreadZones = p1.locator('[data-testid^="spread-zone-spread-"]');
  // In a 2-player room, P1's page shows P1's own personal spread + P2's opponent spread in header (pre-restructure)
  // After restructure: P2's opponent spread is also in the board area
  await expect(personalSpreadZones).not.toHaveCount(0);

  // Drag card0 from hand to P1's personal spread zone
  const firstCard = handZone.locator('[aria-pressed]').nth(0);
  await expect(firstCard).toBeVisible();

  // Identify which spread zone belongs to P1 (highest y = lowest on screen = board area)
  const ownSpreadBoxes = await p1.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-testid^="spread-zone-spread-"]'));
    return els.map(el => {
      const rect = el.getBoundingClientRect();
      return { testId: el.getAttribute('data-testid'), y: rect.y, height: rect.height };
    });
  });
  const ownSpread = ownSpreadBoxes.reduce((max, b) => b.y > max.y ? b : max, ownSpreadBoxes[0]);
  const ownSpreadEl = p1.getByTestId(ownSpread.testId!);

  const src = await firstCard.boundingBox();
  const tgt = await ownSpreadEl.boundingBox();
  if (!src || !tgt) throw new Error('bounding boxes unavailable for spread drag');

  await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await p1.mouse.down();
  await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
  await p1.mouse.up();

  // Card lands in spread zone — hand loses one card (useDndMonitor fires correctly)
  await expect(handZone.locator('[aria-pressed]')).toHaveCount(4);
  await expect(ownSpreadEl.locator('[role="button"]')).toHaveCount(1);

  // No duplicate dnd-kit ID warnings (regression guard for useDndMonitor subscription loss)
  const duplicateIdWarnings = consoleMessages.filter(msg =>
    /duplicate id|multiple elements with the same id/i.test(msg)
  );
  expect(duplicateIdWarnings).toHaveLength(0);

  // Structural assertion: own spread zone is below the header band
  const headerBand = p1.locator('.bg-card').first();
  const headerBox = await headerBand.boundingBox();
  const spreadBox = await ownSpreadEl.boundingBox();
  if (!headerBox || !spreadBox) throw new Error('bounding boxes unavailable for position check');
  expect(spreadBox.y).toBeGreaterThan(headerBox.y + headerBox.height);
});
```

---

## Shared Patterns

### SpreadZone prop signature (read-only reference)
**Source:** `src/components/SpreadZone.tsx` lines 69–79
**Apply to:** Both the header-band map (hands-only, SpreadZone removed) and the new spread row (SpreadZone with `interactive={false}`)

```tsx
interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  interactive?: boolean;          // false = opponent zone; controls guard from Phase 26
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}
```

Opponent spreads in the new spread row use only: `pile`, `sendAction`, `draggingCardId`, `interactive={false}`. The `selectedIds`/`onToggleSelect`/`onSelectAll`/`selectionSource` props are omitted (as in the current header usage, lines 57–63).

### Flex column class tokens for opponent columns
**Source:** `src/components/BoardView.tsx` line 47
**Apply to:** Both the (modified) header column and the new spread row column — must be identical so widths align
```tsx
className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}
```

### `flex-shrink-0` discipline
**Source:** `src/components/BoardView.tsx` line 91 (personal spread wrapper)
**Apply to:** The new opponent spreads row outer div — D-06 requires it cannot shrink on short screens
```tsx
// Personal spread: existing pattern
<div className="flex-shrink-0 px-4 py-1">

// Opponent spreads row: same discipline
<div className="flex items-start gap-4 px-4 flex-shrink-0">
```

### Playwright drag pattern (dnd-kit pointer sensor)
**Source:** `playwright/game.spec.ts` lines 60–68, 184–192, 234–238, 257–260
**Apply to:** New spread-dock e2e test
```ts
// 8px threshold → use steps:15 for smooth pointer movement
await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await p1.mouse.down();
await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
await p1.mouse.up();
```

---

## No Analog Found

None — all files have direct analogs.

---

## Metadata

**Analog search scope:** `src/components/`, `playwright/`
**Files scanned:** `BoardView.tsx`, `SpreadZone.tsx`, `BoardDragLayer.tsx`, `ControlsBar.tsx`, `OpponentHand.tsx`, `HandZone.tsx`, `App.tsx`, `playwright/game.spec.ts`, `playwright/fixtures.ts`, `playwright/responsive.spec.ts`
**Pattern extraction date:** 2026-05-21
