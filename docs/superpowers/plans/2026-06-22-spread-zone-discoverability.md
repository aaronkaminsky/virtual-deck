# Spread Zone Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the player's own collapsed-empty spread zone more discoverable by adding a small "Tableau" text label, without changing opponents' spread zones or the existing drag-hover behavior.

**Architecture:** Single-file change to `src/components/SpreadZone.tsx`. The component already branches on `isReallyEmpty` (no cards, no chips) and `isOver` (drag-hover) to pick a CSS class for the collapsed bar. Add a third condition — `interactive !== false` (already used elsewhere in this file to mean "this is the player's own zone") — to decide whether to grow the bar and render the label.

**Tech Stack:** React, TypeScript, Tailwind CSS (`cn` helper from `@/lib/utils`), Vitest (source-regex unit tests matching this file's existing test convention), Playwright (e2e).

## Global Constraints

- Label text is exactly `Tableau` (Title Case), per the approved spec.
- No color tint, no icon — text only.
- Label appears only on the player's own spread zone (`interactive !== false`), never on opponents' spread zones.
- Label is hidden during drag-hover (`isOver`) — the existing `border-primary` hover treatment is unchanged.
- Collapsed bar height: `h-5` (20px) for the player's own empty zone (to fit the label); stays `h-4` (16px) for opponents' empty zones (unchanged).
- No new props on `SpreadZone`, no shared-type changes, no server changes.

---

### Task 1: Add the "Tableau" label to the player's own collapsed spread zone

**Files:**
- Modify: `src/components/SpreadZone.tsx:204-234`
- Test: `tests/spreadZoneTableauLabel.test.ts` (new)

**Interfaces:**
- Consumes: existing `SpreadZone` props `pile: ClientPile`, `interactive?: boolean` (already defined in this file's prop interface).
- Produces: nothing new is exported. This task only changes internal rendering logic in `SpreadZone.tsx`.

This codebase has no component-rendering test harness for `SpreadZone` (see `tests/chipsSpreadZone.test.ts` for the established pattern) — tests assert against the raw source text via Vitest's `?raw` import. Follow that same pattern here.

- [ ] **Step 1: Write the failing test**

Create `tests/spreadZoneTableauLabel.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone Tableau label", () => {
  it("defines showTableauLabel as isReallyEmpty gated on interactive !== false", () => {
    expect(SpreadZoneSrc).toMatch(/const showTableauLabel = isReallyEmpty && interactive !== false;/);
  });

  it("renders the Tableau label only when showTableauLabel is true and not hovering", () => {
    expect(SpreadZoneSrc).toMatch(/\{showTableauLabel && !isOver && \(/);
    expect(SpreadZoneSrc).toMatch(/>Tableau<\/span>/);
  });

  it("grows the collapsed bar to h-5 with centered text when the label shows, keeps h-4 otherwise", () => {
    expect(SpreadZoneSrc).toMatch(/showTableauLabel\s*\n?\s*\?\s*'h-5 border border-dashed border-muted-foreground\/30 rounded-md flex items-center justify-center'\s*\n?\s*:\s*'h-4 border border-dashed border-muted-foreground\/30 rounded-md'/);
  });

  it("does not change the drag-hover (isOver) collapsed styling", () => {
    expect(SpreadZoneSrc).toMatch(/'min-w-\[56px\] sm:min-w-\[80px\] h-\[40px\] sm:h-\[56px\] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- spreadZoneTableauLabel`
Expected: FAIL — `showTableauLabel` does not exist yet, and the `Tableau` text is not present in the source.

- [ ] **Step 3: Implement the label**

In `src/components/SpreadZone.tsx`, find this block (around line 204-206):

```typescript
  const isEmpty = pile.cards.length === 0;
  const hasBet = chipsEnabled && chipsInSpread > 0;
  const isReallyEmpty = isEmpty && !hasBet;
```

Add a new line directly after it:

```typescript
  const isEmpty = pile.cards.length === 0;
  const hasBet = chipsEnabled && chipsInSpread > 0;
  const isReallyEmpty = isEmpty && !hasBet;
  const showTableauLabel = isReallyEmpty && interactive !== false;
```

Then find the `className` block (around line 223-233):

```typescript
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
```

Replace it with:

```typescript
        className={cn(
          isReallyEmpty
            ? isOver
              ? 'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'
              : showTableauLabel
                ? 'h-5 border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center'
                : 'h-4 border border-dashed border-muted-foreground/30 rounded-md'
            : cn(
                'min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-3 overflow-x-auto [overflow-y:clip] [overflow-clip-margin:4px] bg-secondary',
                isOver ? 'border-primary' : 'border-border'
              ),
          className
        )}
```

Then find the start of the children block (around line 235):

```typescript
        {!isReallyEmpty && (
          <>
```

Add the label render directly before it:

```typescript
        {showTableauLabel && !isOver && (
          <span className="text-[10px] text-muted-foreground/90 tracking-wide">Tableau</span>
        )}
        {!isReallyEmpty && (
          <>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- spreadZoneTableauLabel`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full unit test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: All tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/SpreadZone.tsx tests/spreadZoneTableauLabel.test.ts
git commit -m "Add Tableau label to player's own collapsed spread zone (backlog #1011)"
```

---

### Task 2: E2E test — label shows once per player, only on their own spread

**Files:**
- Create: `playwright/spreadZoneTableauLabel.spec.ts`

**Interfaces:**
- Consumes: `playwright/fixtures.ts` exports `test` and `expect`, with a `twoPlayerRoom` fixture providing `{ p1, p2, roomCode }` — both players already joined and on the board with no cards dealt (see `playwright/handRevealSortSync.spec.ts` for usage).

- [ ] **Step 1: Write the e2e test**

Create `playwright/spreadZoneTableauLabel.spec.ts`:

```typescript
import { test, expect } from './fixtures';

test.describe('spread zone Tableau label', () => {
  test('each player sees exactly one "Tableau" label — their own empty spread, not their opponent\'s', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await expect(p1.getByText('Tableau', { exact: true })).toHaveCount(1);
    await expect(p2.getByText('Tableau', { exact: true })).toHaveCount(1);
  });
});
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Start the dev servers in two separate terminals (if not already running): `npm run dev` and `npm run dev:client`.

Run: `npx playwright test spreadZoneTableauLabel`
Expected: FAIL — no element with text "Tableau" exists yet (this is the pre-Task-1 state; if Task 1 is already merged when this runs, see Step 4 instead).

> Note: if Task 1 was already implemented before this task starts, this step will PASS immediately — in that case skip straight to Step 4 and confirm the pass, no implementation step is needed here.

- [ ] **Step 3: Implementation**

No implementation needed — Task 1 already added the label. This task only adds test coverage.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test spreadZoneTableauLabel`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add playwright/spreadZoneTableauLabel.spec.ts
git commit -m "Add e2e coverage for the Tableau label scoping (backlog #1011)"
```

---

## Self-Review Notes

- **Spec coverage:** Label text/casing (Task 1, Step 3), neutral styling/no color tint (Task 1, Step 3), height growth only on own zone (Task 1, Step 3 + test), hidden during drag-hover (Task 1, Step 3 + test), scoped to `interactive !== false` only (Task 1 + Task 2 e2e) — all covered. No first-time/onboarding logic was introduced, matching the spec's explicit exclusion.
- **Placeholder scan:** None found — every step has literal code/commands.
- **Type consistency:** `showTableauLabel` is a plain `boolean` local const, no new prop or exported type introduced, so no signature drift risk across tasks.
